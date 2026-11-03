# Sistem Informasi Akademik SMK Negeri 2 Magelang

Aplikasi web PHP native dan MariaDB dengan peran admin, guru, kepala sekolah, dan siswa. Arsitektur native serta database existing dipertahankan sesuai hasil audit.

## Jalankan lokal dengan pnpm

Prasyarat: Node.js 18+, pnpm 9+, PHP 8.1+ dengan `pdo_mysql`, `mbstring`, `dom`, `zip`, dan database MariaDB development yang telah disiapkan.

```bash
pnpm install
pnpm dev:setup
```

Isi koneksi database pada file privat yang ditunjukkan perintah setup (default `~/.config/sia-akademik/local.json`), kemudian:

```bash
pnpm dev:check
pnpm dev
```

Buka **http://127.0.0.1:18125/auth/login.php**. Hentikan dengan **Ctrl+C**. Jika port sedang dipakai, gunakan `pnpm dev --port 18126`.

`pnpm dev` menjalankan **server PHP**, tanpa Python, sudo, systemd, Docker atau build frontend. Konfigurasi/database tidak ikut Git; setup hanya membuat template privat, tidak membuat akun atau mereset/mengimpor database. Petunjuk komputer lain dan troubleshooting: **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)**. Panduan uji fitur: **[docs/SIMULASI_5_HARI.md](docs/SIMULASI_5_HARI.md)**.

Laporan fase di bawah adalah catatan historis deployment R0/R1. Merge kode ke Git tidak mengaktifkan release pada layanan 8085.

## Keadaan R0 dan R1

R0 `531d2f8` sudah aktif pada port 8085 dengan document root terbatas, konfigurasi eksternal dan login tanpa perubahan skema. R1 dikembangkan terpisah pada branch `r1/security-crud-20261030` untuk autentikasi, RBAC, CRUD inti, identitas pencatat absensi dan UI CRUD responsif. R1 belum diaktifkan pada layanan 8085.

Panduan lengkap tersedia di [docs/R0_OPERATIONS.md](docs/R0_OPERATIONS.md). Hasil audit sebelumnya berada di `/home/muflih/audit_sia_2026-10-30/LAPORAN_AUDIT.md`.

Panduan fixture, pengujian, konsekuensi migrasi aditif dan deployment R1 tersedia di [docs/R1_OPERATIONS.md](docs/R1_OPERATIONS.md). Pengujian R1 menggunakan port 18091 dan database sintetis terisolasi; jangan menjalankan tes tulis pada layanan aktif.

## Menjalankan development/staging

Gunakan konfigurasi privat di luar direktori proyek; contoh key tersedia pada `ops/config.example.json`. Jangan memasukkan kredensial nyata atau data siswa ke repository.

```bash
SIA_CONFIG_FILE=/private/path/app-config.json php -d display_errors=0 \
  -S 127.0.0.1:18085 -t public public/index.php
```

`public/` wajib menjadi document root dan dispatcher wajib digunakan. Jangan menjalankan static/PHP server dari root repository. Rute aplikasi lama tetap ditangani dispatcher; SQL, Git, konfigurasi, log dan alat database tidak disajikan.

Backup, inisialisasi instance staging baru, restore dan tes dapat dijalankan menggunakan `ops/r0_environment.py` dan `tests/r0_http.py` sesuai panduan operasi. Tidak ada akun atau password default yang dibuat saat login.

## Batasan

Jangan mengimpor skrip SQL reset lama ke database aktif. Perubahan skema dilakukan melalui deployment terkontrol dan diuji pada staging. Temuan domain akademik dan desain UI dari audit belum dikerjakan pada R0. Aktivasi layanan aktif dan perubahan izin database aktif memerlukan persetujuan operator.
