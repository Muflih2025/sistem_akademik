# LAPORAN R1.5 — REMEDIASI RELEASE BLOCKERS

Tanggal: **31 Oktober 2026**. Keputusan: **CONDITIONALLY READY**.

Remediasi teknis telah **dipasang dan diuji pada service staging nyata**, termasuk principal database minimum, DynamicUser/LoadCredential, restart, rotasi, rollback dan pemulihan fixture. Ini belum merupakan persetujuan atau deployment ke 8085. Persetujuan admin/operator dan pemasangan production masih pending. Tidak ada alasan untuk menganggap 18 penugasan sudah terverifikasi.

## 1. Baseline dan release

- Baseline kode R1 `042ea9c`, laporan `09a6541`; keduanya tetap dalam history.
- Branch: `r1_5/release-blockers-20261031`.
- Worktree: `/home/muflih/sia-r1-5-worktree`.
- Commit kode yang dipaketkan/dipasang/diuji: `fed5d611fda8c07cae08e44e3ede09a5dc83225d`.
- Commit laporan/evidence ditambahkan terpisah sesudah pengujian; tidak mengubah kode candidate.
- Framework tetap PHP native modular/PDO/MariaDB. Tidak mengubah Laravel, tidak menambah migration akademik atau memulai R2.

## 2. Status setiap blocker

| Blocker | Yang benar-benar diterapkan/diuji | Status staging | Status 8085 |
|---|---|---|---|
| Runtime database root | Principal baru non-root dengan grant per tabel; root ditolak oleh core aplikasi sebelum koneksi | **RESOLVED, diuji** | R0 masih memakai konfigurasi lama; perubahan account/grant **belum diizinkan/dijalankan** |
| Owner bercampur runtime | Owner migration non-root terpisah, file root-only tidak di-load ke worker; runtime menolak jalur migration | **RESOLVED, diuji** | Provisioning terpisah menunggu operator |
| Akses secret lama/owner | DynamicUser berbeda dari operator; LoadCredential; ProtectHome/ProtectSystem/ProtectProc/NNP; canary dan identitas lain diuji | **RESOLVED, diuji di namespace nyata** | Baru rencana file/unit; belum dipasang |
| Credential hilang saat restart/rotasi | Restart sah, A→B, rollback A, B kembali; credential salah/hilang menghentikan startup; recovery sukses | **RESOLVED, diuji** | Tidak melakukan restart/rotasi aktif |
| 18 penugasan tanpa periode | Matriks, template dan validator/plan-only; seluruhnya deny-by-default untuk akses bergantung periode | **MITIGATED; PENDING ADMIN REVIEW** | Tidak ada update/mapping periode |
| Release/rollback/recovery belum terbukti | Archive deterministik identik dua build, deployment staging, rollback R0/forward, restore ke DB baru exact | **RESOLVED, diuji** | Aktivasi/cutover menunggu persetujuan |

**Tidak menyebut pemasangan production selesai hanya karena staging lulus.** READY FOR ACTIVATION belum diberikan karena persetujuan/pemasangan production dan keputusan akademik belum tersedia. Tidak ada risiko teknis yang masih dibiarkan terbuka pada skenario staging yang diuji; pembatasan legacy tetap aman dan dampaknya harus diterima admin sebelum rollout.

## 3. Lingkungan staging yang dipasang

- Unit: `sia-r15-stage-20261031.service`, **127.0.0.1:18115**.
- Identitas OS: DynamicUser `sia-r15-stage`, UID aktual pada pengujian **65262**, berbeda dari root dan operator UID 1000; tidak membuat akun Linux permanen.
- Kode root-owned/read-only: `/opt/sia-r15-staging/20261031/releases/fed5d611`, document root `public/`, dispatcher allowlist R0.
- Secret source `/etc/sia-r15-staging/20261031/`, direktori 0700, file root:root 0600. Worker hanya menerima `app-config` melalui LoadCredential, read-only pada direktori credential milik unit.
- Owner migration root-only pada direktori tersebut, tidak diberikan kepada service. Credential disimpan di luar repository dan web root; nilai password tidak ditaruh di environment/argv.
- StateDirectory privat untuk session, session rollback, security counters, log, upload; data sah bertahan ketika UID dinamis/service direstart.
- ProtectHome, ProtectSystem=strict, ProtectProc=invisible, PrivateTmp, NoNewPrivileges, capability kosong, RestrictSUIDSGID, UMask 0077, KillMode control-group aktif.
- Fixture `r1_testing_20261030` pada instance MariaDB **terpisah, Unix socket, skip-networking=1**. Hanya socket di-bind read-only ke runtime directory service. Tidak membuka listener database baru atau akses jaringan luar.
- Tooling terverifikasi: PHP 8.4.22, MariaDB 11.8.8, systemd 259.7; Playwright/Chromium development dari cache privat, tidak ditambahkan sebagai dependency production.

Ini implementasi service baru staging. Unit/config/file/grant production tidak diubah. `daemon-reload` dipakai untuk mengenalkan/update unit staging; **MainPID 372, user, argv, serta waktu mulai 8085 tetap sama**. Metadata invocation sementara pada properti D-Bus ExecStart berubah setelah reload; penilaian memakai properti stabil dan hash file, bukan menyimpulkan restart dari metadata sementara tersebut.

## 4. Privilege runtime dan owner

Audit query aplikasi menunjukkan akses pada 16 tabel bisnis: jurusan, kelas, guru, siswa, mata_pelajaran, jadwal, users, tahun_ajaran, nilai, absensi, jurnal_kelas, bobot_penilaian, ekstrakurikuler, nilai_ekskul, kalender_akademik dan catatan_evaluasi.

Profil operasional final yang diuji:

| Area | Runtime final | Owner migration |
|---|---|---|
| Tabel bisnis | SELECT/INSERT/UPDATE per tabel | SELECT/INSERT pada database untuk deployment |
| Penghapusan | Hanya DELETE catatan evaluasi sesuai fitur existing; tidak pada arsip akademik | Tidak diberi DROP/DELETE sebagai kebutuhan migration R1 |
| Audit | **INSERT only; tidak SELECT/UPDATE/DELETE** | Diperiksa operator sesuai jalur deployment |
| Ledger, tabel normalisasi internal | Tidak SELECT; tidak memanggil routine langsung | SELECT dan DDL yang diperlukan pada satu database |
| DDL/account/global | Tidak CREATE/ALTER/DROP/CREATE USER/GRANT, FILE, SUPER, privilege global atau DB lain | CREATE/ALTER/INDEX/REFERENCES pada database aplikasi; tidak CREATE USER/GRANT/global |

Trigger existing tetap menjalankan normalisasi sesuai definer existing pada transaksi nilai; runtime tidak diberi akses langsung ke tabel internal tersebut. Profil awal staging yang meniru SELECT schema-wide R1 diganti melalui **principal staging baru**, bukan mencabut/mengganti grant akun existing. Principal final terpisah untuk slot A/B dan migration. Administrator staging lama hanya dipakai untuk provisioning/inspeksi/backup pada server socket-only; bukan runtime atau akun migration aplikasi.

Uji nyata di dalam namespace worker menolak DROP TABLE/ALTER canary kosong dengan kode privilege 1142, CREATE USER 1227, GRANT 1044, UPDATE audit, DELETE nilai serta SELECT audit/ledger/normalisasi. Canary tetap ada; tidak menghapus tabel/data sejarah. Inspeksi grant dilakukan sebelum probe administratif; bila ditemukan hak berlebih service ditolak sebelum mencoba statement tersebut.

Perubahan `db()` menolak username root/credential kosong sebelum mencoba transport. Tes memakai socket yang tidak ada untuk membedakan penolakan konfigurasi dari kegagalan driver: tidak ada fallback ke root/default. Koneksi operator baca-saja untuk audit/backup memakai helper PDO independen, tidak menjadi fallback aplikasi.

## 5. Isolasi secret, restart dan rotasi

Bukti aktual meliputi:

- Loaded credential dapat dibaca worker yang sah; sumber credential dan owner file tidak dapat dibaca worker.
- Secret produksi lama dan jalur escape `/proc/1/root/...` tidak dapat dibaca.
- Canary home sintetis world-readable dapat dibaca identitas nobody pada host, tetapi tidak di namespace worker. Canary opt world-writable tidak dapat ditulis worker karena filesystem readonly. Kode sendiri tidak writable.
- Root operator dapat menemukan credential pada namespace, sedangkan identitas nobody dalam namespace yang sama ditolak. File source root-only juga ditolak untuk nobody.
- Restart tetap sehat dan session sah bertahan. Slot A→B benar-benar memakai identitas baru; rollback konfigurasi ke A dan kembali B berhasil.
- Profile root ditolak sebelum instalasi. Password DB salah menolak startup tanpa listener; file credential hilang menolak service. Memulihkan credential sah mengembalikan health dan tidak memakai konfigurasi root/secret lama secara otomatis.
- Journal/HTTP/log dipindai terhadap password A/B/owner, password fixture, cookie dan token CSRF yang benar-benar dipakai; tidak ditemukan nilainya pada log. Tidak ada fatal pada alur akhir.
- Jalur secret, SQL, Git, log, konfigurasi dan tool CLI tetap 404 GET/HEAD. Canary internal yang fisik ada di document root juga ditolak.

Staging source/config dan rotated profile benar-benar dipasang; rencana production belum dipasang. Rotasi production memerlukan akun/secret baru, pemasangan root-only atomik, restart terkontrol dan smoke; pencabutan account lama menjadi keputusan terpisah setelah rollback window, bukan otomatis.

## 6. Status 18 penugasan legacy

Matriks private telah membaca/menggunakan laporan admin R1 dan metadata existing, tanpa mengulang audit penuh atau mengarang periode.

- **0** dengan bukti periode resmi yang terverifikasi.
- **18 AMBIGU — PENDING ADMIN REVIEW**: 6 guru, 6 kelas.
- **0 konflik terkonfirmasi** dari bukti yang tersedia; tidak menutup kemungkinan konflik yang harus diinvestigasi setelah dokumen tersedia.
- Pada 15 ada observasi periode nilai, pada 3 tidak ada; observasi itu bukan bukti masa berlaku id_jadwal. Tahun/semester penugasan existing tetap ditulis tidak tersedia.

Matriks menyediakan ID penugasan, guru, mapel, kelas, tahun/semester existing, bukti, alasan ambigu, rekomendasi dan status admin. CSV menyediakan kolom periode disetujui, jenis/referensi/file/hash bukti, reviewer dan tanggal. Nilai yang dapat dianggap formula spreadsheet di-escape pada ekspor template.

[Matrix admin](/home/muflih/.local/state/sia-r15/20261031/reports/MATRIKS_REVIEW_PENUGASAN.md) · [Template CSV](/home/muflih/.local/state/sia-r15/20261031/reports/TEMPLATE_REVIEW_PENUGASAN.csv)

`ops/r15_assignment_review.py` memvalidasi snapshot/konteks, duplicate ID, kelengkapan review, periode terdaftar, jenis dokumen resmi, reviewer/tanggal dan hash file privat; menolak CURRENT_DATE sebagai bukti dan konflik antar usulan. **Hash membuktikan integritas file, bukan otoritas/isi dokumen.** Output hanya rencana, tidak menulis database. Simulasi approval di unit test diberi label SYNTHETIC dan tidak merupakan persetujuan sekolah.

Koreksi yang nantinya disetujui: snapshot baru + verifikasi dokumen/konflik oleh admin, simulasi staging melalui layanan CRUD R1, pertahankan original dan tinjau penonaktifan/successor berperiode; jangan mengubah konteks arsip bersejarah. Periode lampau/riwayat keanggotaan ditahan untuk R2. Penerapan produksi memerlukan persetujuan terpisah.

**Tidak ada satu pun dari 18 record diperbarui atau di-approve pada fase ini.** Guru dari penugasan tidak lengkap tidak memperoleh akses roster/pertemuan/nilai/rapor/ekspor berbasis periode; metadata jadwal miliknya tetap tersedia. Dampak pada operasional guru wajib ditinjau admin. Jangan melonggarkan otorisasi hanya agar fitur terlihat bekerja.

## 7. Hasil pengujian terakhir

| Suite pada candidate/service staging final | PASS | FAIL | SKIP |
|---|---:|---:|---:|
| HTTP, empat role, auth/CSRF/IDOR, CRUD, nilai, absensi, transaksi, impor/ekspor | 187 | 0 | 1 |
| Browser responsive dan submit backend nyata | 59 | 0 | 0 |
| Namespace/secret/privilege/root refusal/restart/rotation | 59 | 0 | 0 |
| Migration terkontrol dan 26 FK | 29 | 0 | 0 |
| Rollback aplikasi/config R0 lalu forward | 10 | 0 | 0 |
| Review/validator penugasan | 10 | 0 | 0 |
| Integritas aktif/target/sumber/R0 | 12 | 0 | 0 |
| **Total akhir** | **366** | **0** | **1** |

SKIP: NISN tidak digunakan skema existing. Tambahan: **65 file PHP lint PASS**, kompilasi Python, `node --check`, `git diff --check`, manifest/package/restore/preservation dan sintaks rencana service PASS. Bukti tambahan tidak dihitung ganda sebagai kasus suite.

Browser menguji 320, 375, 430, 768, 1024, 1440px, form tanpa horizontal scroll, kontrol sentuh dan tampilan putih/hitam. Termasuk membuat siswa serta menyimpan/membaca koreksi absensi melalui browser. Nama siswa tetap dari database. Absensi mencatat actor users.id_user berbeda dari id_guru dan UID OS; unique/upsert serta audit tetap benar.

Riwayat iterasi disimpan: batas restart awal staging menyebabkan connection failure; readiness HTTP dan batas khusus stress unit uji diperbaiki. Kegagalan callback sempat meninggalkan timeout uji 1 detik karena setup berada di luar try/finally; harness diperbaiki agar selalu memulihkan konfigurasi, baseline fixture dinormalisasi dan suite penuh diulang. Tidak ada reset DB atau penghapusan log untuk meloloskan tes. Hasil di tabel hanya run akhir; kegagalan startup/browser perantara tidak dinyatakan PASS. Batas service 8085 tidak dilonggarkan.

[Bukti semua kasus/status](/home/muflih/sia-r1-5-worktree/docs/evidence/R1_5_TEST_RESULTS.json). Raw log, probe, baseline, snapshot dan screenshot berada pada state privat `/home/muflih/.local/state/sia-r15/20261031/reports/`; nilai secret tidak dicetak pada laporan/evidence Git.

## 8. Integritas dan pemulihan data

- Database aktif: **23 tabel + 1 view, 203 baris**, seluruh hash struktur/data/view/trigger/routine identik dengan baseline fase R1.5.
- Target utama 58 file dan status Git dirty existing identik; Laravel sumber 1.940 file identik; release R0 aktif 61 file identik; worktree R1 juga identik.
- File main/override service 8085, MainPID, argv/user dan waktu mulai tidak berubah. Tetap berjalan di 127.0.0.1:8085. Hanya health HEAD/read-only dilakukan pada aktif.
- Backup baru aktif: dump baca-saja single-transaction tanpa lock, 8.956 byte gzip, SHA `76f93e060e29ed78eb43d67a3a508c2802604f0ca8963bf4b90e989eed558234`. Tidak dieksekusi pada database aktif.
- Backup/restore fixture **benar-benar dijalankan** ke DB baru `r15_restore_final_20261031`: **26 tabel, 1 view, 1 trigger, 1 routine, 1.693 baris fixture**, proyeksi seluruh kolom/data cocok, 26 FK valid dan sumber fixture tidak berubah selama restore.
- Restore hanya pada server staging socket-only, destination baru; menolak reuse/overwrite. Tidak DROP TABLE/TRUNCATE atau reset data existing. Normalisasi nama DB/definer hanya untuk objek salinan.
- Snapshot membuktikan tes restart/rotasi/rollback tidak mengubah data akademik. Tes CRUD memang menambah/mengubah fixture yang diizinkan; empat record legacy fixture yang dilindungi tetap utuh. Tidak memakai akun asli untuk tes tulis.

Pemulihan production kelak memerlukan maintenance, backup segar, restore ke instance baru, verifikasi/rekonsiliasi transaksi, account minimum baru dan persetujuan cutover; tidak restore in-place menimpa transaksi setelah backup. Backup lokal ini belum menggantikan retensi/enkripsi/off-host yang disepakati sekolah.

## 9. Paket release yang dapat direproduksi

- Commit: `fed5d611fda8c07cae08e44e3ede09a5dc83225d`.
- Dua archive Git commit yang sama menghasilkan **SHA-256 byte-identik**: `1fdc6592bd195041c3288e41c69849bcbd3d247f5525f4cec216c3c84b7e9648`.
- Archive utama: `/home/muflih/.local/state/sia-r15/20261031/release/r15-fed5d61-a.tar.gz`.
- 102 file tracked + RELEASE.json; urutan tar, owner/mode, timestamp commit dan gzip mtime deterministik.
- Tidak memuat Git history, SQL dump, private config/credential, session/log, CSV data sekolah atau tooling browser.
- Package diekstrak root-owned/read-only, semua hash diverifikasi, lalu benar-benar dipasang pada unit staging dan diuji. Snapshot Git/hash tidak diklaim sebagai kernel immutable/chattr.
- `ops/r15_package.py` dapat direproduksi dengan output baru; `ops/r15_stage_install_release.py` hanya mengizinkan prefix/unit/port staging, bukan 8085. Installer/provisioning menolak reset/reuse yang tidak aman.
- Daftar perubahan sejak R0: `git diff --name-status 531d2f8 fed5d611fda8c07cae08e44e3ede09a5dc83225d`. Sejak kandidat R1 tercantum pada bagian akhir.

## 10. Aktivasi/rollback 8085: disiapkan, belum diterapkan

Rencana privat: `/home/muflih/.local/state/sia-r15/20261031/activation-plan-fed5d611/`:

- runtime.json dan rollback-runtime.json: non-root, privilege minimum, nama/lokasi session berbeda;
- deployment-owner.json dan client files: owner terpisah, approval masih kosong;
- grants.sql: dua account baru, tidak REVOKE/ALTER akun lama, password acak hanya pada file privat;
- activation/rollback-service-override.conf: DynamicUser, LoadCredential, namespace/permission, loopback public/router dan preflight;
- ringkasan model/commit. Sintaks kedua rencana unit valid; **belum dipasang** dan account production rencana tersebut belum dibuat.

Urutan sesudah persetujuan: review pin/legacy/draft → maintenance & backup/restore segar → provision akun baru yang diotorisasi → uji koneksi minimum di server aktif → pasang kode root-owned dan source credential root-only → owner migration dengan expected database/release/approval → bandingkan kolom/data asli dan schema delta → runtime preflight → pasang patch/restart/cutover 8085 yang disetujui → smoke empat role khusus/internal files/export/integritas → baru buka traffic sesuai keputusan sekolah.

Rollback staging terbukti mengganti kode/config ke R0 dengan DB non-root yang sama, namespace aman, session berbeda, lalu forward ke candidate tanpa perubahan DB. Production rollback hanya pada maintenance/ingress terbatas; R0 belum memiliki seluruh perbaikan authorization R1. Jangan otomatis membuka write atau memakai kembali credential root lama. Pertahankan kolom aditif/audit/transaksi sah; tidak down migration/reset. Rollback data membutuhkan pemulihan/rekonsiliasi terpisah.

Panduan langkah/command/reproduksi: [docs/R1_5_OPERATIONS.md](docs/R1_5_OPERATIONS.md). Runbook [R1_ACTIVATION.md](docs/R1_ACTIVATION.md) tetap menjadi dasar urutan dengan model secret DynamicUser/LoadCredential R1.5 sebagai pembaruan.

## 11. Persetujuan dan risiko residual

1. **PENDING ADMIN REVIEW:** bukti/periode untuk 18 penugasan atau penerimaan pembatasan fungsi guru. Tidak memberi guru akses tambahan. Jangan menganggap fondasi riwayat akademik sudah selesai.
2. **PENDING OPERATOR/USER:** account/grant baru pada database aktif, credential root-only, migration R1, pemasangan root-owned/StateDirectory/LoadCredential, restart/deployment 8085 dan rollback window. Tidak ada persetujuan ini diasumsikan dari izin staging.
3. **R6:** rapor existing default belum terbit; admin harus menyetujui kebijakan gate draft. Workflow persetujuan/snapshot/penandatanganan resmi belum dibangun.
4. **R2:** riwayat keanggotaan/penugasan historis dan pemetaan berbukti. Tidak dimulai otomatis.
5. **Residual operasional:** koneksi principal baru pada host DB production perlu diverifikasi setelah grant disetujui, sebelum cutover. Staging memakai socket-only, production memakai transport aktifnya. Load/perangkat fisik/TLS end-to-end/multi-server belum disertifikasi; rate-limit file membutuhkan persistensi dan penyesuaian NAT. CDN/browser tooling tetap dependency pengujian/tampilan yang relevan.
6. **Rollback R0:** hanya bukti alur baca/auth/proteksi yang diuji, bukan seluruh operasi tulis lama; tetap maintenance sampai ditinjau.

Karena teknis staging sudah terbukti dan data ambigu ditahan aman, keputusan **CONDITIONALLY READY** sesuai definisi pengguna. **Bukan READY FOR ACTIVATION tanpa syarat.** Tidak mengubah database/grant/service aktif, tidak deploy R1, tidak mengubah Laravel dan tidak memulai R2.

## 12. Penegasan absensi digital yang masuk saat R1.5

Arahan terbaru disimpan pada [ABSENSI_DIGITAL_REQUIREMENTS.md](docs/ABSENSI_DIGITAL_REQUIREMENTS.md): website Chrome responsif putih/hitam; guru dan permission Guru Piket terpisah; H/S/I/A serta Belum Dikonfirmasi; harian sekolah versus sesi; satu sumber rekap harian terverifikasi; rekonsiliasi/audit/unique constraint; kalender, matriks jurnal dan ekspor nyata.

**Belum diimplementasikan pada R1.5.** Enum/status dan permission baru, model harian/sesi, kalender serta fitur Guru Piket menunggu fondasi penugasan/periode/riwayat dan fase yang diotorisasi. Tidak mengklaim dukungan Belum Dikonfirmasi sudah ada pada release ini, dan tidak menghitung data yang belum diverifikasi sebagai status baru secara simulasi frontend.

## 13. Berkas implementasi R1.5

- `config/config.php`
- `docs/R1_5_OPERATIONS.md`
- `ops/r15_assignment_review.py`
- `ops/r15_fixture_restore.py`
- `ops/r15_minimum_runtime.py`
- `ops/r15_package.py`
- `ops/r15_prepare_activation.py`
- `ops/r15_service_control.py`
- `ops/r15_service_probe.php`
- `ops/r15_stage_install_release.py`
- `ops/r15_stage_setup.py`
- `ops/r1_prepare_grants.py`
- `tests/r15_assignment_review.py`
- `tests/r15_rollback.py`
- `tests/r15_security.py`
- `tests/r1_browser.cjs`
- `tests/r1_database.py`
- `tests/r1_http.py`

Laporan ini, evidence hasil akhir dan spesifikasi absensi tambahan berada pada commit dokumentasi berikutnya. Kode candidate yang dipasang tetap commit yang dipatok di atas.
