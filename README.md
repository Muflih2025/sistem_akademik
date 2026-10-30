# Sistem Informasi Akademik SMK Negeri 2 Magelang

Aplikasi web PHP native dan MariaDB dengan peran admin, guru, kepala sekolah, dan siswa. Arsitektur native serta database existing dipertahankan sesuai hasil audit.

## Keadaan R0

R0 menyiapkan baseline privat, backup/restore terisolasi, document root terbatas, konfigurasi eksternal, login tanpa perubahan skema, dan pengujian dengan fixture sintetis. Perubahan berada pada branch/worktree terpisah; layanan aktif belum diganti.

Panduan lengkap tersedia di [docs/R0_OPERATIONS.md](docs/R0_OPERATIONS.md). Hasil audit sebelumnya berada di `/home/muflih/audit_sia_2026-10-30/LAPORAN_AUDIT.md`.

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
