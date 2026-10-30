# Operasi R1 — development/staging

R1 mempertahankan PHP native modular, PDO dan database existing. R0 `531d2f8` menjadi baseline. Pengerjaan berada di `/home/muflih/sia-r1-worktree`, branch `r1/security-crud-20261030`. Layanan 8085 tetap memakai release R0. Dokumen ini tidak memberi izin deployment atau perubahan grant produksi.

## Lingkungan yang sudah disiapkan

- HTTP fixture: `http://127.0.0.1:18091`, proses non-root, dispatcher `public/index.php`, document root `public/`, empat PHP worker.
- Database sintetis: `r1_testing_20261030`, pada instance MariaDB staging terpisah dengan Unix socket dan `skip-networking`. Bukan database aktif pada TCP.
- State privat: `/home/muflih/.local/state/sia-r1/20261030-r1`, mode 0700. Konfigurasi, password fixture acak, sesi, log, screenshot dan hasil tes berada di sini, di luar Git/document root.
- Akun owner hanya untuk migrasi staging. Akun runtime staging tidak mempunyai DDL, DELETE untuk tabel akademik, maupun UPDATE/DELETE audit. Runtime membutuhkan INSERT audit di dalam transaksi bisnis agar operasi tidak sukses tanpa audit.
- Nama dan lokasi session berbeda dari R0. Cookie tidak dibedakan berdasarkan nomor port.

Ekstensi yang dipakai: PDO MySQL, mbstring, fileinfo, SimpleXML dan ZipArchive untuk XLSX. Verifikasi menggunakan PHP 8.4.22 dan MariaDB lokal; skrip DDL memakai sintaks MariaDB `ADD COLUMN IF NOT EXISTS`.

## Menjalankan ulang server fixture

Jalankan dari worktree R1 sebagai pengguna biasa, **hanya jika port 18091 belum digunakan server fixture**. Jangan menghentikan proses berdasarkan pencocokan nama PHP secara global.

```bash
cd /home/muflih/sia-r1-worktree
umask 077
SIA_CONFIG_FILE=/home/muflih/.local/state/sia-r1/20261030-r1/private/runtime.json \
PHP_CLI_SERVER_WORKERS=4 php -d display_errors=0 -d log_errors=1 \
  -d error_log=/home/muflih/.local/state/sia-r1/20261030-r1/logs/php-errors.log \
  -S 127.0.0.1:18091 -t public public/index.php
```

Konfigurasi runtime harus mempunyai `APP_ENV=testing`, DB/socket fixture, `SESSION_NAME`, `SESSION_PATH`, `SECURITY_STATE_PATH` privat 0700, dan `SECURITY_LOG` di luar web root. Buat direktori sebelum menjalankan server; jangan mengabaikan error konfigurasi. Set `COOKIE_SECURE=0` hanya untuk HTTP localhost; gunakan `1` pada HTTPS. HTTPS yang diteruskan proxy harus dikonfigurasi pada server tepercaya; aplikasi tidak mempercayai sembarang header forwarded dari klien.

Login memakai verifikasi hash, batas idle 1800 detik, umur sesi maksimum 28800 detik, serta pembacaan ulang akun/master setiap request. Perubahan password, username, status, role atau referensi membatalkan sesi lama. Batas login lima percobaan per identitas/IP dalam 15 menit dan 200 request login per IP dalam 15 menit, dengan reservasi atomik melalui file lock. Sesuaikan kebijakan IP ketika memakai NAT sekolah; jangan mematikan batas tanpa peninjauan. State keamanan harus dipertahankan saat restart.

## Pengujian ulang

Jalankan suite **berurutan** karena HTTP suite sengaja mengubah konfigurasi timeout/cookie fixture untuk menguji kebijakan. Jangan menjalankan dua suite HTTP serentak. HTTP dan browser menggunakan akun sintetis, bukan akun sekolah. Jangan mengarahkan URL atau konfigurasi tulis ke 8085.

```bash
python3 tests/r1_http.py --state /home/muflih/.local/state/sia-r1/20261030-r1
LD_LIBRARY_PATH=/home/muflih/.local/state/sia-r1/20261030-r1/browser-libs/usr/lib64 \
PLAYWRIGHT_BROWSERS_PATH=/home/muflih/.local/state/sia-r1/20261030-r1/browsers \
node tests/r1_browser.cjs /home/muflih/.local/state/sia-r1/20261030-r1
python3 tests/r1_database.py --state /home/muflih/.local/state/sia-r1/20261030-r1
python3 tests/r1_integrity.py --state /home/muflih/.local/state/sia-r1/20261030-r1
```

Suite integrity memakai snapshot independen dalam transaksi READ ONLY pada database aktif. Pemeriksaan 8085 hanya HEAD, tanpa login atau operasi tulis. Hasil JSON ada di `reports/` pada state privat. Tes HTTP membuat identitas unik setiap run dan mempertahankan fixture arsip; tidak me-reset database. Akibatnya jumlah fixture bertambah saat tes diulang. Tes rollback jurnal memakai trigger khusus fixture yang dibersihkan kembali; tidak menyentuh trigger aktif.

Playwright/Chromium dan pustaka browser berada privat di state, tidak menjadi dependency produksi. RPM browser hanya diunduh dan diekstrak privat; paket sistem tidak dipasang/diubah. Variabel `LD_LIBRARY_PATH` hanya untuk proses browser. Mesin baru perlu menyiapkan tooling browser development sendiri.

`tests/r1_environment.py` adalah bootstrap **sekali pada instance staging baru**; sengaja menolak database/akun fixture yang sudah ada. Prasyarat: server socket-only R0 staging dengan `sia_r0_testing` dan konfigurasi admin privat. Parameter: `--state`, `--stage-admin-config`, dan `--objects` (JSON CREATE view/trigger/routine dari backup R0). State harus privat dengan subdirektori `private`, `reports`, `sessions`, `logs`, `security`, `uploads`, `backups` sudah tersedia. Jangan menjalankan ulang bootstrap pada instance ini atau menghapus database agar bootstrap lolos. Tes normal tidak membutuhkan bootstrap ulang.

## Migrasi terkontrol

`database/migrations/002_r1_security.php` menambahkan status master, kunci/publikasi periode, referensi periode jadwal, guru pembina ekskul, FK RESTRICT dan tabel audit. Kolom baru tidak menebak kepemilikan atau periode historis. Tahun existing memperoleh publikasi rapor default 0; jadwal existing tetap NULL untuk periode. Tidak ada provisioning akun atau reset password.

Runner berikut **hanya menerima staging/testing** dengan owner yang diizinkan. Jangan menunjuk file runtime ke akun owner.

```bash
SIA_CONFIG_FILE=/home/muflih/.local/state/sia-r1/20261030-r1/private/owner-config.json \
php ops/migrate_r1.php --apply --expected-database=r1_testing_20261030
```

DDL MariaDB melakukan implicit commit. Tidak ada rollback DDL otomatis. Runner memakai ledger dan operasi aditif yang dapat dijalankan ulang. Jika gagal, hentikan aktivasi, tinjau snapshot privat dan penyebabnya. Tidak ada perintah down/destruktif.

Penugasan lama tanpa periode dapat dibaca sesuai scope guru tetapi ditolak untuk pencatatan baru. Penugasan yang sudah mempunyai jurnal/absensi/nilai tidak boleh diubah konteksnya. Admin perlu menonaktifkan penugasan lama dan membuat penugasan berperiode untuk transaksi baru, setelah meninjau konflik; arsip lama tetap ada. Jangan menebak backfill massal.

## Rencana deployment setelah persetujuan terpisah

1. Tinjau commit R1 dan diff dari `531d2f8`; lakukan UAT empat role pada salinan terbaru yang terisolasi. Tentukan penugasan berperiode, kebijakan publikasi rapor, dan penanganan akun/referensi lama yang tidak valid. Perpindahan kelas siswa berarsip menunggu model riwayat keanggotaan.
2. Ambil backup privat terbaru kode/konfigurasi/database aktif, verifikasi hash dan restore ke instance baru, lalu bandingkan semua data, FK, view, trigger dan routine. Simpan release/config R0 untuk rollback. Hentikan bila ada drift yang belum dijelaskan.
3. Tinjau DDL MariaDB serta waktu maintenance/locking. Runner saat ini menolak environment production. Mekanisme migrasi produksi harus ditinjau dan diotorisasi secara eksplisit sebelum eksekusi; jangan mengganti label menjadi testing untuk melewati guard.
4. Tinjau izin runtime terpisah dari owner, termasuk audit INSERT-only, lokasi sesi/log/upload/export dan permission. **Tidak ada grant aktif yang diubah dalam R1.** Perubahan grant produksi memerlukan persetujuan terpisah.
5. Baru setelah otorisasi aktivasi, siapkan release terpisah, document root `public/`, router allowlist dan proses non-root. Pertahankan pembatasan jaringan R0. Jangan menjalankan PHP dari root repository atau mengandalkan `.htaccess`.
6. Uji login/logout empat role, IDOR, CRUD dengan akun fixture di lingkungan yang sesuai, penugasan/periode, CSV dan blok file internal. Bandingkan database aktif dengan rencana perubahan yang diotorisasi. Hindari tes tulis menggunakan akun/data nyata.
7. Bila verifikasi gagal, rollback kode/config ke R0 dan hentikan perubahan. Pertahankan kolom aditif, audit dan transaksi sah yang sudah masuk; jangan melakukan DROP/TRUNCATE atau restore backup menimpa transaksi baru. Pemulihan database memerlukan rencana dan persetujuan tersendiri.

Tidak ada deployment, restart 8085, perubahan grant aktif atau implementasi R2 yang dilakukan oleh prosedur pengujian di atas.
