# LAPORAN R1 RELEASE READINESS

Tanggal hasil akhir: **31 Oktober 2026**. Review dimulai 30 Oktober dan dilanjutkan 31 Oktober. Dokumen ini memperbarui penilaian kandidat `87ee472` / laporan `1afb7bc`.

## 1. Keputusan final: BLOCKED

**Aktivasi ke 8085 belum boleh dilakukan.** Kandidat kode telah diperbaiki dan seluruh pengujian akhir lulus, tetapi gate infrastruktur aktif belum terpenuhi:

1. Runtime database aktif masih **root dengan ALL PRIVILEGES/DDL**. Dua akun pengganti beserta grant minimal sudah disiapkan dan modelnya lulus di staging, tetapi akun produksi belum dibuat. Penerapan grant baru memerlukan persetujuan terpisah. Tidak mencabut atau mengubah grant lama.
2. Worker existing memakai UID `muflih`, yang juga memiliki berkas privat lama. Mengganti DB_USER saja belum cukup jika worker tetap dapat membaca credential root lama. Rencana menempatkan kode/config/data pada jalur terpisah dan menutup akses home/owner secret melalui namespace systemd. Permission/install serta uji runtime namespace memerlukan tindakan operator; baru sintaks unit yang diuji.
3. Dampak penahanan **18 penugasan tanpa periode terverifikasi** dan default rapor belum terbit harus ditinjau admin. Data lama tidak dipetakan otomatis untuk meloloskan aktivasi.

Ini **BLOCKED untuk aktivasi saat ini**, bukan kegagalan suite aplikasi. Tidak ada perubahan service 8085, DDL/grant/data aktif, atau implementasi R2/R6 yang dilakukan. Persetujuan review tidak diperlakukan sebagai persetujuan deployment.

## 2. Kandidat final dan baseline

| Item | Bukti/status |
|---|---|
| Branch/worktree | `r1/security-crud-20261030` — `/home/muflih/sia-r1-worktree` |
| Kandidat kode final | `042ea9c197dde03e48031108657ecbb7aedd869c` |
| Release R0 aktif | `531d2f8` adalah ancestor kandidat; **61/61 file release aktif cocok byte/hash dengan Git R0** |
| Kandidat yang diterima sebelumnya | `87ee472` / `1afb7bc`, tetap dalam history, tidak di-reset |
| Arsitektur | PHP native modular, PDO, MariaDB; tidak memigrasikan framework |
| Migration | Hanya migration aditif `002_r1_security` yang sudah direview; tidak menambah model R2/R6 |
| Working tree pengguna | 58 file dan status Git existing identik dengan baseline |
| Laravel sumber | 1.940 file identik; tidak dimodifikasi |
| Database aktif | 23 tabel, 1 view, 203 baris; seluruh hash struktur/data/view/trigger/routine identik sebelum/sesudah |
| Service aktif | Konfigurasi/override dan release R0 identik; tetap user non-root, loopback 8085; tidak ada perintah deploy/restart/daemon-reload dalam review |

Manifest kanonik database aktif sebelum/sesudah mempunyai SHA-256 `716d5f00f69f9cda6ecf24d522ac99b398462dc63f2b0ca658ec24743e164e41`. Backup/snapshot dilakukan dengan koneksi baca saja atau dump single-transaction tanpa lock; skema aktif tidak dimigrasikan.

Catatan proses: PID yang terlihat pada observasi awal dan setelah lingkungan dilanjutkan berbeda (34207 dan 372). Review tidak menjalankan restart; kontinuitas uptime tidak diklaim. Konfigurasi, release dan database tetap identik, dan health check akhir lulus. Operator perlu membaca status/jurnal terbaru lagi sebelum aktivasi.

## 3. Masalah yang ditemukan dan diperbaiki

| Temuan review | Perbaikan | Bukti |
|---|---|---|
| Penugasan NULL menjadi fallback baca nilai tahun lain | Hapus wildcard NULL pada otorisasi dan query nilai/rapor; binding periode harus eksplisit | GET/POST/ekspor lintas periode ditolak |
| Jadwal lama dapat membuka roster kelas saat ini | Selector roster/pertemuan hanya penugasan berperiode aktif; NULL ditolak di backend, termasuk request ID langsung | Fixture negatif serta guru fixture pada salinan nyata dengan 18 jadwal legacy ditolak |
| Rapor/CSV dapat membaca nilai guru lain pada kelas/mapel yang sama | Scope nilai memeriksa pemilik record sekaligus penugasan/mapel/periode aktif | Tes pemilik berbeda pada mapel yang sama lulus |
| Rekap rapor menggabungkan kehadiran semua tahun/guru | Filter periode; rekap guru hanya jadwal miliknya; siswa hanya periode terbit, NULL tidak diasumsikan masuk periode manapun | Canary absensi guru lain, periode lama dan NULL tidak bocor |
| URL periode draft siswa diabaikan, halaman masih mencampur periode terbit | Pilih satu periode terbit yang terverifikasi; URL draft/tidak dikenal dan NIS asing ditolak; tanpa kolom/status publikasi tidak menampilkan rapor | GET/POST manipulasi serta gate draft lulus |
| Parameter identitas/kelas rapor supervisi tidak konsisten | Validasi bertipe dan pemeriksaan pasangan NIS/kelas; endpoint tetap baca saja | Head POST dan pasangan kelas/NIS palsu ditolak |
| Mekanisme deployment production belum konkret | Guard CLI memerlukan expected database, commit, manifest seluruh file serta approval owner privat; runtime menolak DDL/approval | Missing approval, salah database/release, tamper migration ditolak pada clone |
| Rahasia runtime dan owner berpotensi terbaca UID yang sama | Rencana akun terpisah, kode root-owned, config/data di luar home, ProtectHome/ProtectSystem; patch dan rollback disiapkan | DB least-privilege lulus; namespace produksi masih gate operator |

Seluruh perlindungan R0 dipertahankan: `public/` sebagai document root, dispatcher allowlist tanpa fallback static sembarang, blok SQL/Git/env/log/config/Adminer, login tanpa DDL/seed, konfigurasi eksternal, non-root dan pembatasan jaringan. Tidak ada fitur akademik baru di luar perbaikan R1/persiapan aktivasi.

## 4. Penugasan legacy: hasil yang dapat ditinjau admin

Database aktif belum mempunyai kolom periode pada jadwal. Ada **18 jadwal milik 6 guru pada 6 kelas** yang periodenya belum dapat diverifikasi. Setelah migration pada clone, seluruh binding tersebut tetap NULL.

Pada 15 jadwal terdapat observasi nilai dengan pasangan guru/mapel/kelas yang sesuai; pada 3 tidak ada observasi itu. Walaupun observasi yang tersedia tidak menunjukkan beberapa periode berbeda, hal tersebut **bukan bukti periode berlaku jadwal**: nilai tidak mengikat langsung ke id_jadwal, tanggal berlaku tidak tersedia, dan keanggotaan kelas historis belum dimodelkan.

Daftar privat lengkap dengan ID/nama guru/kelas/mapel, hari/jam, jumlah absensi/jurnal, periode nilai yang teramati, dan kolom keputusan admin:

[REVIEW_PENUGASAN_ADMIN.md](/home/muflih/.local/state/sia-r1/20261030-final-review/reports/REVIEW_PENUGASAN_ADMIN.md)

Mitigasi R1:

- Tidak menghapus jadwal, mengisi tahun sekarang, atau mengaitkan semua arsip ke periode aktif.
- Tidak memperluas akses guru untuk mengatasi data ambigu. Metadata jadwal miliknya tetap tersedia; roster/pertemuan/rapor/ekspor yang memerlukan periode ditahan jika binding NULL atau konteks periode tidak aktif.
- Daftar nilai tersimpan tetap dibatasi pemilik record dan penugasan/periode eksplisit; tidak memakai fallback NULL atau memuat roster baru dari jadwal lama.
- Admin/supervisi dapat meninjau arsip sesuai role. Koreksi pemetaan historis dan riwayat keanggotaan menjadi dependensi R2. Admin perlu SK/jadwal resmi untuk menentukan penugasan baru berperiode; status arsip yang telah dipakai tidak ditimpa.
- Empat role existing dipertahankan; pemeriksaan referensi akun aktif menunjukkan tidak ada referensi guru/siswa invalid pada dataset yang diperiksa. Akun/password existing tidak di-reset.

## 5. Publikasi rapor dan dependensi R6

Status publikasi adalah **eksplisit**, tidak disimpulkan dari adanya nilai. Migration menambah `rapor_diterbitkan` default 0. Pada clone, periode lama tetap belum terbit; tidak ada publikasi massal.

Siswa hanya melihat rapor miliknya untuk satu periode yang benar-benar terbit. GET periode draft, NIS asing, POST manipulasi, atau status publikasi yang tidak tersedia tidak membuka nilai. Rekap kehadiran rapor mengikuti periode yang terbit; kehadiran NULL tidak ditebak periodenya. Halaman absensi pribadi tetap berada dalam scope NIS sendiri dan tidak menjadi penerbitan rapor.

Guru hanya mempunyai rekap sesuai kepemilikan nilai/penugasan. Kepala sekolah dapat melihat draft untuk supervisi menurut permission baca existing, tanpa hak mengubah nilai/absensi atau menerbitkan melalui POST rapor. Penerbitan admin yang tersedia adalah gate sementara, bukan workflow R6 lengkap.

**Ditunda ke R6:** pemeriksaan kelengkapan, approval berjenjang, snapshot/version rapor, penandatanganan dan penerbitan resmi. **Ditunda ke R2:** riwayat keanggotaan dan pemetaan periode legacy yang dapat dibuktikan. Keduanya tidak dimulai dalam review ini.

## 6. Privilege database

| Identitas | Kondisi |
|---|---|
| Runtime aktif R0 | Root, ALL PRIVILEGES/DDL: **BLOCKED untuk dipakai R1**. Tidak diubah |
| Runtime staging/clone | Non-root; SELECT database aplikasi; INSERT/UPDATE pada 16 tabel bisnis; INSERT-only audit; DELETE hanya catatan evaluasi |
| Owner migration staging/clone | Akun terpisah: SELECT, INSERT, CREATE, ALTER, INDEX, REFERENCES pada satu database; bukan runtime |
| Rencana production | Dua akun baru dengan scope yang sama, credential acak privat, tanpa REVOKE/ALTER/reset akun existing; **belum dieksekusi** |

Tes nyata menolak CREATE TABLE, UPDATE audit, DELETE nilai dan SELECT database lain pada runtime clone. Preflight 14 kondisi lulus, termasuk tidak ada privilege global/DDL/admin, role tak ditinjau, akses database lain, penghapusan akademik atau approval migrasi pada runtime. Akun owner ditolak ketika dipakai sebagai konfigurasi aplikasi.

Rencana privat final: `/home/muflih/.local/state/sia-r1/20261030-final-review/activation-plan-042ea9c1/`. File SQL dan client/config berisi rahasia dan berada di luar Git/web, mode privat. Generator tidak terhubung ke database. Pemeriksaan READ ONLY mengonfirmasi akun production rencana tersebut belum ada. Approval production owner tetap kosong. Approval yang diisi untuk tes guard hanya berada pada konfigurasi **clone socket-only**, bukan production.

Tidak ada credential, cookie, session token atau hash password yang dicetak pada laporan/evidence repository.

## 7. Migration dan simulasi data

Kebutuhan dibanding skema aktif:

- Status aktif/nonaktif pada 7 master/entitas existing.
- `dikunci` dan `rapor_diterbitkan` pada periode.
- `jadwal.id_tahun_ajaran` nullable + FK RESTRICT.
- `ekstrakurikuler.id_guru_pembina` nullable + FK RESTRICT.
- Tabel audit ber-FK actor users serta ledger migration.

Tidak ada perubahan tipe kolom existing, DELETE data historis, DROP TABLE, TRUNCATE, seed akun atau perbaikan identitas berdasarkan tebakan. Byte migration pada kandidat final sama dengan migration yang sudah diuji sejak kandidat awal.

Rehearsal dilakukan pada `r1_review_20261030`, server staging Unix socket dengan networking nonaktif. Struktur **dan salinan data existing** dipulihkan secara privat, termasuk 1 view, 1 trigger, 1 routine. Hanya nama database/definer pada objek clone yang dinormalisasi untuk isolasi. Proyeksi seluruh kolom asli, 203 baris tabel dan hasil view cocok sebelum dan setelah migration. Semua 26 FK valid, tanpa orphan. Migration diulang dan idempotent.

Akun admin dan guru sintetis sementara pada clone dipakai untuk smoke; bukan akun sekolah. Keduanya dibersihkan kembali setelah pengujian, kemudian seluruh proyeksi kolom/data asli diverifikasi identik. Tidak menjalankan tes tulis terhadap akun/data sekolah pada database aktif.

Backup baru tersedia: `backups/database.sql.gz` pada state review, gzip/SHA diverifikasi dan pemulihan exact data dibuktikan pada clone. SHA-256 backup: `75cd0cc1cae5fcab3ca518e923ddf792f2a9cb1aedd9c6fde1162b06722bb7c5` (8.956 byte terkompresi). Backup aktivasi harus diambil lagi sesudah maintenance dimulai; backup lokal belum menggantikan kebijakan retensi/off-host.

DDL MariaDB implicit commit dan dapat mengunci tabel. Tidak ada down migration atau klaim rollback DDL otomatis. Tool fingerprint membandingkan kolom/data lama; full schema hash setelah penambahan kolom memang berubah secara terencana. Pengujian memakai PHP 8.4.22 dan MariaDB 11.8.8; ekstensi PDO MySQL, mbstring, fileinfo, SimpleXML dan ZipArchive diperlukan.

## 8. Hasil pengujian terbaru

| Suite akhir | PASS | FAIL | SKIP |
|---|---:|---:|---:|
| HTTP/auth/RBAC/CRUD/absensi/import/export/regresi | 187 | 0 | 1 |
| Browser Chromium | 59 | 0 | 0 |
| Database fixture dan 26 FK | 29 | 0 | 0 |
| Integritas aktif/sumber/target/R0 | 12 | 0 | 0 |
| Frozen candidate, clone dan rollback aplikasi | 35 | 0 | 0 |
| **Total akhir** | **322** | **0** | **1** |

SKIP tunggal: NISN tidak digunakan skema existing. Lint **64 file PHP**, kompilasi runner Python, `node --check`, dan `git diff --check` lulus. Rehearsal/privilege/manifest/service syntax adalah bukti tambahan, tidak dijumlahkan ulang sebagai kasus suite.

Cakupan penting: login/logout empat role pada fixture; session rotation/revocation/timeout; CSRF; IDOR GET/POST; CRUD guru/siswa/kelas/mapel/jadwal; created_by akun yang berbeda dari id_guru; rollback transaksi jurnal; rapor draft; owner nilai lain; ekspor CSV aman; impor CSV/XLSX atomik; internal file yang fisik ada di public tetap diblokir; halaman admin/guru; dan roster legacy pada salinan data nyata.

Browser memeriksa sembilan halaman CRUD pada **320, 375, 430, 768, 1024 dan 1440px**, kontrol sentuh, tanpa scroll horizontal pada form, serta submit siswa dan koreksi absensi yang tersimpan backend. Bukan sertifikasi seluruh perangkat/TLS atau uji beban produksi.

Riwayat kegagalan tetap disimpan: smoke awal mengasumsikan status 403 langsung dari R0, padahal R0 mengalihkan ke halaman 403; assertion diperbaiki dengan memverifikasi redirect dan halaman akhir. Saat pengetatan roster, satu iterasi staging menemukan kesalahan quoting pada dua selector dan menghasilkan 17 kegagalan; perbaikannya dilint dan suite penuh diulang sampai hasil akhir di atas. Log tidak dihapus. Pemeriksaan fatal PHP sekarang membatasi pembacaan ke offset awal run agar menilai run terkini tanpa menutupi log lama. Tidak ada fatal pada alur akhir yang diuji.

Bukti terperinci tanpa credential: [R1_RELEASE_READINESS_TEST_RESULTS.json](docs/evidence/R1_RELEASE_READINESS_TEST_RESULTS.json). Seluruh artefak privat di `/home/muflih/.local/state/sia-r1/20261030-final-review/reports/`. Tes pada 8085 hanya health HEAD/read-only, tanpa login asli atau tes tulis.

## 9. Candidate snapshot yang immutable untuk review

- Commit: `042ea9c197dde03e48031108657ecbb7aedd869c`.
- Direktori read-only: `/home/muflih/.local/state/sia-r1/20261030-final-review/release/r1-042ea9c1`.
- Archive: `/home/muflih/.local/state/sia-r1/20261030-final-review/backups/r1-candidate-042ea9c1.tar.gz`.
- SHA-256 archive: `bc19b1c42ca9a38861d9426e72fd67dea31b0f75f01af1f0dbb1d83264a98492`.
- SHA-256 manifest: `ee6d1b2ce6fdb810606a2d35d94d496159ec8221bc7136eff7cd7a1299e1211a`.
- 87 berkas tracked + `RELEASE.json`, tanpa `.git`, dump, konfigurasi privat, session, log, fixture credential atau tooling browser.

Snapshot dan archive dibekukan read-only serta dipatok hash. Ini tidak mengklaim kernel immutable/chattr atau signature eksternal; saat deployment operator harus memasang salinan root-owned yang tidak writable oleh worker. Report/evidence akhir ditambahkan dalam commit dokumentasi terpisah; kandidat kode yang diuji tetap commit di atas. Kandidat sementara sebelumnya ditandai superseded, tidak dipakai untuk aktivasi.

## 10. Service, health check, dan risiko operasional

Patch R1 dan rollback ada di state sebagai `proposed-service-override.conf` dan `proposed-rollback-override.conf`. Keduanya lolos `systemd-analyze verify`; **tidak dipasang**, dan namespace runtime belum diuji pada layanan production.

Rencana jalur:

| Artefak privat yang disiapkan | Jalur tujuan setelah otorisasi operator |
|---|---|
| Candidate snapshot | `/opt/sia/releases/r1-042ea9c1` |
| Salinan R0 yang hash-nya diverifikasi | `/opt/sia/releases/r0-531d2f8` |
| `runtime.json` | `/etc/sia-r1/runtime-042ea9c1.json` |
| `rollback-runtime.json` | `/etc/sia-r1/runtime-rollback-042ea9c1.json` |
| `deployment-owner.json` | Direktori operator/root 0700, config 0600 |
| `grants.sql` | Direktori operator/root 0700, file 0600; tidak boleh dibaca worker |
| Session/security/log/upload | `/var/lib/sia-r1/042ea9c1/`, subdirektori 0700 termasuk session rollback terpisah |

Service tetap user/group non-root, loopback 8085, docroot public/router, UMask 0077, KillMode control-group dan NoNewPrivileges. Tambahan ProtectHome/ProtectSystem/PrivateTmp menutup akses rahasia lama; hanya data runtime yang writable. Reset environment lama mencegah override credential/approval dari konfigurasi sebelumnya.

Risiko yang harus diuji operator: akses namespace dan permission aktual, koneksi akun baru melalui host DB aktif, direktori upload/session/log, rotasi cookie, space backup/data, DDL lock dan maintenance, serta health sesudah restart. CSV dialirkan langsung ke response; tidak membuat lokasi export publik. Tidak membuka ingress/URL publik dalam R1.

## 11. Urutan aktivasi dan rollback

Runbook lengkap: [docs/R1_ACTIVATION.md](docs/R1_ACTIVATION.md). Urutan yang disiapkan:

1. Review pin artefak, daftar legacy dan kebijakan draft. Dapatkan persetujuan grant serta perubahan service/migration secara terpisah; semua masih pending.
2. Maintenance dan backup terbaru, restore terisolasi, baseline proyeksi data/skema serta rollback config/kode. Jangan menyentuh working tree pengguna.
3. Operator menerapkan **hanya akun/grant baru** dari rencana privat setelah memastikan nama belum ada. Uji koneksi; akun lama tidak dicabut.
4. Pasang kode/config/runtime dirs dengan owner/permission yang disetujui dan uji perlindungan akses rahasia. Runtime tidak root/DDL; owner migration terpisah.
5. Sesudah otorisasi, isi approval owner dengan commit lengkap; jalankan CLI `--check` lalu `--apply`, dengan expected database dan production-release yang cocok. Jangan mengganti label menjadi staging untuk melewati guard.
6. Verifikasi proyeksi seluruh kolom/data asli, FK/objek dan perubahan skema yang memang direncanakan; jalankan runtime preflight. Berhenti pada drift yang belum direkonsiliasi.
7. Baru setelah seluruh gate PASS dan izin aktivasi, pasang patch service lalu restart layanan yang disetujui. Smoke health/auth empat role dengan akun khusus yang diotorisasi, role guard, draft, export dan blok file internal. Ulangi integritas sebelum membuka penulisan.
8. Bila verifikasi gagal, tahan write dan rollback **kode** ke R0 di jalur yang disiapkan, tetap memakai runtime DB terbatas dan namespace yang aman. Ganti nama/lokasi session lewat config rollback. Jangan otomatis memakai kembali credential root lama.

Rollback aplikasi pada clone sudah lulus untuk login/logout, CSRF, role guard, admin/master dan blok file setelah skema aditif. Itu bukan bukti semua aksi tulis R0 aman; write tetap ditahan sampai ditinjau. Tabel/kolom aditif, audit dan transaksi sah dipertahankan. Pemulihan data dilakukan ke instance baru lalu direkonsiliasi; tidak restore in-place menimpa transaksi baru, tidak DROP/TRUNCATE.

## 12. Dependensi, residual risk dan status berikutnya

- **BLOCKED:** izin grant produksi terpisah serta instalasi/validasi filesystem isolation dan service belum tersedia/dikerjakan.
- **Ditahan aman, R2:** 18 jadwal belum terverifikasi dan riwayat keanggotaan kelas. Admin harus menerima dampak penahanan roster/periode. Tidak ada tebakan backfill.
- **Ditahan aman, R6:** rapor default draft, workflow penerbitan resmi belum dibangun. Tidak menerbitkan karena nilai ada.
- **Residual:** rate limiting berbasis file memerlukan state persisten dan penyesuaian NAT sekolah; multi-server belum dikerjakan. CDN styling, perangkat fisik, TLS end-to-end, beban production dan seluruh pencetakan belum disertifikasi.
- **Backup:** lokal privat telah diverifikasi, tetapi perlu backup segar saat aktivasi dan kebijakan retensi/off-host.
- **Perbaikan lama:** archive/master mempertahankan sejarah, NIS immutable dan perpindahan kelas berarsip ditolak. Tidak mengubah nilai, absensi, jurnal atau rapor historis aktif.

Review dan persiapan yang aman sudah diselesaikan. **Tidak ada permintaan persetujuan yang diasumsikan sebagai jawaban diam-diam; tidak ada deployment.** Keputusan aktivasi tetap BLOCKED sampai operator/pengguna menyetujui dan memverifikasi gate di atas. R2 tidak dimulai otomatis.

## 13. Berkas berubah pada final review

Diff terhadap laporan kandidat yang diterima (`1afb7bc`) mencakup berkas di bawah. Daftar lengkap R1 terhadap R0 tetap dapat diperiksa dengan `git diff --stat 531d2f8 042ea9c197dde03e48031108657ecbb7aedd869c`.

- `config/authorization.php`
- `docs/R1_ACTIVATION.md`
- `docs/R1_OPERATIONS.md`
- `guru/absen.php`
- `guru/ekskul.php`
- `guru/export_nilai.php`
- `guru/jurnal.php`
- `guru/nilai.php`
- `guru/rapor.php`
- `guru/rekap_absen.php`
- `kepsek/rapor.php`
- `ops/check_r1_runtime.php`
- `ops/migrate_r1.php`
- `ops/r1_data_fingerprint.py`
- `ops/r1_prepare_grants.py`
- `ops/r1_rehearsal.py`
- `ops/read_only_query.php`
- `siswa/rapor.php`
- `tests/r1_browser.cjs`
- `tests/r1_http.py`
- `tests/r1_release_smoke.py`
