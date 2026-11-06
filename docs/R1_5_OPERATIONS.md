# R1.5 — operasi staging dan persiapan aktivasi

Baseline kode R1 `042ea9c`, laporan `09a6541`. Branch R1.5: `r1_5/release-blockers-20261031`, worktree `/home/muflih/sia-r1-5-worktree`. Semua tindakan tulis database dan service dalam fase ini hanya pada lingkungan staging. Layanan `sistem-akademik.service` port 8085 tidak diubah/restart.

## Lingkungan yang benar-benar dipasang

- Service **`sia-r15-stage-20261031.service`**, HTTP **127.0.0.1:18115**, tidak di-enable sebagai layanan publik.
- `DynamicUser=yes`, identitas `sia-r15-stage`, UID berbeda dari root dan operator. Tidak menambah akun Linux permanen.
- Kode root-owned/read-only di `/opt/sia-r15-staging/20261031/releases/`; document root `public/`, dispatcher allowlist R0.
- Sumber credential `/etc/sia-r15-staging/20261031/runtime.json`, root:root 0600, direktori 0700. **LoadCredential** memberikan salinan read-only ke identitas service di `%d/app-config`; secret tidak disimpan dalam environment value atau source code.
- Owner migration terpisah di direktori root yang sama, tidak di-load ke service. Worker ditolak membaca owner, sumber secret, secret produksi lama dan jalur escape `/proc/1/root`.
- `ProtectHome`, `ProtectSystem=strict`, `ProtectProc=invisible`, PrivateTmp, NoNewPrivileges, capability kosong, RestrictSUIDSGID dan UMask 0077 aktif. Canary sintetis world-readable di home/world-writable di opt membuktikan namespace, bukan hanya pengujian mode file.
- StateDirectory privat menyimpan session/security/log/upload dan session rollback. DynamicUser/idmapped ownership memungkinkan data sah bertahan setelah restart tanpa membuatnya terbaca identitas lain.
- Database **sintetis** `r1_testing_20261030` di instance MariaDB terpisah `skip-networking=1`. Socket privat di-bind ke `/run/sia-r15-stage-20261031/mysql.sock`; tidak membuka jaringan database. Tidak menggunakan database/tabel produksi.

State operator: `/home/muflih/.local/state/sia-r15/20261031`, mode 0700, berisi fixture, baseline, laporan, backup dan artefak. Tidak dipublikasikan atau masuk Git.

## Privilege yang diperlukan

Runtime final memiliki SELECT/INSERT/UPDATE **per tabel** pada 16 tabel bisnis, INSERT pada audit, DELETE hanya catatan evaluasi. Tidak ada SELECT schema-wide, baca audit/ledger/normalisasi, DDL, CREATE USER, GRANT, EXECUTE routine, privilege global atau database lain. Trigger existing tetap menjalankan normalisasi sesuai definer existing sebagai bagian transaksi nilai; runtime tidak mendapat akses langsung ke tabel internal tersebut.

Owner migration mempunyai SELECT/INSERT/CREATE/ALTER/INDEX/REFERENCES pada satu database, bukan root. Administrator staging yang sudah ada hanya dipakai untuk provisioning, inspeksi serta backup/restore pada server socket-only. Runtime tidak memperoleh credential administrator.

Prototype pertama memakai model SELECT schema-wide dari R1. Pemeriksaan kebutuhan query menghasilkan model final yang lebih ketat. Principal final baru dibuat dan konfigurasi staging dialihkan; grant principal existing tidak dicabut/diubah. SQL provisioning production disiapkan dengan model final yang sama dan **belum diterapkan**.

`db()` pada aplikasi menolak username root dan konfigurasi kosong sebelum mencoba koneksi. Tool inspeksi/backup independen tetap dapat memakai koneksi operator baca saja; ini bukan runtime aplikasi.

## Ulangi tes pada instalasi yang sudah ada

Jalankan berurutan: suite sengaja merestart **unit staging saja** untuk cookie/timeout, rotasi dan rollback. Tidak menjalankan dua suite yang mengubah konfigurasi secara serentak.

```bash
cd /home/muflih/sia-r1-5-worktree
python3 tests/r1_http.py --state /home/muflih/.local/state/sia-r15/20261031 --port 18115
LD_LIBRARY_PATH=/home/muflih/.local/state/sia-r1/20261030-r1/browser-libs/usr/lib64 \
PLAYWRIGHT_BROWSERS_PATH=/home/muflih/.local/state/sia-r1/20261030-r1/browsers \
node tests/r1_browser.cjs /home/muflih/.local/state/sia-r15/20261031
python3 tests/r15_security.py /home/muflih/.local/state/sia-r15/20261031
python3 tests/r1_database.py --state /home/muflih/.local/state/sia-r15/20261031
python3 tests/r15_assignment_review.py /home/muflih/.local/state/sia-r15/20261031
python3 tests/r15_rollback.py /home/muflih/.local/state/sia-r15/20261031
python3 tests/r1_integrity.py --state /home/muflih/.local/state/sia-r15/20261031
```

Controller memakai sudo operator, memvalidasi unit tetap, target 18115, DB fixture/socket dan direktori staging. Menolak target production/root profile. Service sendiri tidak dapat menggunakan sudo karena NoNewPrivileges dan identitas berbeda. Kontrol restart menunggu health HTTP, tidak hanya ActiveState. Batas start khusus staging 50/10 detik diperlukan untuk stress restart test; tidak melonggarkan service 8085.

`ops/release/r15_stage_setup.py` adalah bootstrap **sekali** pada instalasi baru; menolak akun/direktori/unit/canary yang sudah ada. Jangan menghapus database atau mengulang provisioning untuk meloloskan guard. `ops/release/r15_minimum_runtime.py` mencatat transisi satu kali prototype ke principal minimum tanpa mencabut grant lama. Instalasi baru memakai model minimum langsung dari setup.

## Secret, restart dan rotasi

Skenario yang diuji: A→B, rollback konfigurasi ke A, B kembali, session sah bertahan, credential salah menolak startup, file credential hilang menolak startup, pemulihan credential yang sah mengembalikan health. Tidak ada fallback ke root, nilai lama, environment atau akun default. Startup probe dan preflight memakai identitas serta namespace yang sama dengan PHP server. Log/HTTP dipindai terhadap password, cookie dan CSRF yang benar-benar digunakan, tanpa menuliskan nilainya ke laporan.

Rotasi production nanti harus membuat principal/password baru dengan privilege minimum, memasang secret root-only secara atomik, restart terkontrol, menguji health/identitas, dan menyimpan rollback terproteksi selama jendela yang disetujui. Pencabutan principal lama memerlukan keputusan operator terpisah; tidak otomatis dilakukan. Jangan memberikan password pada argv, SQL console output, repository atau environment value. Approval deployment/migration tetap hanya di konfigurasi owner, bukan runtime.

## Matriks admin dan koreksi

`reports/TEMPLATE_REVIEW_PENUGASAN.csv` dan matriks Markdown privat memuat 18 identitas serta seluruh field review. Semua tetap **PENDING ADMIN REVIEW**. Tahun/semester penugasan existing tidak tersedia; observasi periode nilai disajikan terpisah dan tidak menjadi bukti periode jadwal.

`ops/release/r15_assignment_review.py export/plan` memvalidasi snapshot, ID konteks, periode yang terdaftar, jenis bukti resmi, reviewer/tanggal, file bukti privat dan hash, serta konflik antar usulan. Hasilnya **plan-only**, tidak mengeksekusi SQL. Hash hanya membuktikan integritas file, bukan otoritas dokumen. Admin sekolah tetap memverifikasi dokumen/masa berlaku.

Setelah persetujuan nyata, operator mengambil snapshot baru, meninjau plan dan konflik dengan jadwal lain, lalu mensimulasikan arsip original + successor berperiode melalui layanan CRUD R1 pada fixture/staging. Jangan menulis ulang periode/identitas arsip yang sudah dipakai. Rencana periode lampau ditahan untuk model riwayat R2; jangan mengaktifkan tahun lama untuk melewati pembatasan. Penerapan produksi memerlukan persetujuan terpisah. Tidak ada approval asli dibuat dan tidak ada satu pun dari 18 record diterapkan pada fase ini.

## Paket, deployment staging dan rollback

`ops/release/r15_package.py --commit COMMIT --output FILE_BARU` membangun archive hanya dari Git commit, dengan urutan tar, mode/owner, timestamp commit, manifest dan gzip mtime yang deterministik. Jalankan dua kali ke nama berbeda; SHA-256 harus identik. Tidak memasukkan secret, SQL dump, Git history, session, log atau browser tooling.

`sudo ops/release/r15_stage_install_release.py --archive FILE --sha256 SHA` (jalankan melalui `sudo python3`) memasang hanya pada prefix opt/unit staging yang di-whitelist, memverifikasi pin/hash semua file, menyimpan R0 yang hash-nya sesuai Git, lalu restart staging. Tidak mempunyai jalur deployment 8085.

Tes rollback mengganti kode/config staging ke R0, memakai runtime non-root minimum yang sama, session name/path berbeda, secret namespace yang sama, dan database setelah migrasi. Login/read admin dan proteksi tetap diuji, kemudian forward ke candidate dengan session baru. Tidak melakukan down migration atau memulihkan database menimpa transaksi. R0 hanya untuk maintenance/smoke operator; jangan membuka write/ingress umum karena perbaikan authorization R1 tidak ada di R0.

## Backup/pemulihan database

Backup produksi dalam fase ini hanya dump baca-saja baru, tanpa perubahan database. `ops/release/r15_fixture_restore.py` benar-benar menguji backup/restore **fixture sintetis** ke database baru dengan nama prefix `r15_restore_`, tidak menimpa sumber. Tabel, view, trigger, routine, proyeksi semua kolom/data dan FK dibandingkan. Existing data/schema/grant aktif tetap utuh. Pada pengulangan gunakan destination **baru**, bukan reset yang lama.

Pemulihan production kelak: maintenance dan backup terbaru; restore ke instance/database baru terisolasi; verifikasi data/FK/objek; rekonsiliasi transaksi setelah backup; provision runtime baru dengan privilege minimum; verifikasi config/health sebelum cutover yang disetujui. Tidak DROP/TRUNCATE, restore in-place atau menghapus transaksi sah. Cutover database memerlukan persetujuan baru.

## Aktivasi 8085 masih berupa rencana

`ops/release/r15_prepare_activation.py` menghasilkan grant/config dan patch DynamicUser/LoadCredential untuk production tanpa menginstal/mengeksekusinya. Owner/runtime dipisahkan dan approval kosong. Runbook R1 tetap berlaku dengan model isolasi R1.5 ini.

Persetujuan tersisa: admin menerima hasil review/penahanan 18 penugasan dan kebijakan draft; operator menyetujui akun/grant baru, pemasangan root-owned/LoadCredential/StateDirectory, migration dan backup maintenance; pengguna menyetujui perubahan unit/restart/cutover 8085. Baru setelah itu verifikasi koneksi akun baru pada database aktif, fingerprint sebelum/sesudah perubahan terencana, empat role fixture yang diotorisasi, internal files, restart serta rollback. R2 tidak dimulai otomatis.
