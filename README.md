# Sistem Informasi Akademik (SIA) SMKN 2 Magelang

Sistem Informasi Akademik berbasis web yang dibangun menggunakan **PHP Native**, **MySQL/MariaDB (PDO)**, dan antarmuka responsif **Bootstrap 5**. Sistem ini menerapkan kontrol akses berbasis peran (**Role-Based Access Control / RBAC**) dengan 4 tingkatan hak akses: **Admin**, **Guru**, **Kepala Sekolah**, dan **Siswa**.

---

## Fitur Utama & Hak Akses (RBAC)

### 1. Administrator
- **Dashboard Ringkasan:** Statistik guru, siswa, kelas, mata pelajaran, dan jadwal aktif.
- **Data Master:** CRUD data siswa, guru, kelas, mata pelajaran, serta pengaturan KKM.
- **Jadwal Pelajaran:** Pengaturan jadwal mata pelajaran berdasarkan hari, jam, guru pengampu, dan kelas.
- **Manajemen Nilai:** Rekapitulasi nilai akhir dan pengawasan nilai siswa.
- **Tahun Ajaran:** Pengelolaan tahun akademik aktif / non-aktif.
- **Manajemen User:** Pengelolaan akun pengguna, reset password, dan status akun (aktif/nonaktif).

### 2. Guru
- **Dashboard Jadwal Mengajar:** Melihat jadwal mata pelajaran dan kelas yang diampu.
- **Input & Kelola Nilai:** Input dan perbarui nilai tugas, UTS, dan UAS.
- **Absensi Siswa:** Pencatatan kehadiran siswa (Hadir, Sakit, Izin, Alpa) per pertemuan.

### 3. Siswa
- **Profil Siswa:** Informasi identitas dan kelas siswa.
- **Jadwal Belajar:** Jadwal pelajaran per hari sesuai kelas masing-masing.
- **Rapor Akademik:** Melihat rincian nilai tugas, UTS, UAS, nilai akhir, serta status ketuntasan berdasarkan KKM.
- **Riwayat Absensi:** Rekapitulasi kehadiran siswa.

### 4. Kepala Sekolah (Kepsek)
- **Monitoring Akademik:** Rekapitulasi nilai dan capaian pembelajaran secara keseluruhan.
- **Monitoring Tahun Ajaran:** Pemantauan status tahun ajaran aktif.
- **Catatan Evaluasi:** Pembuatan catatan evaluasi dan arahan strategis akademik.

---

## Fitur Keamanan

- **PDO Prepared Statements:** Seluruh interaksi database menggunakan parameter binding untuk mencegah serangan SQL Injection.
- **Bcrypt Password Hashing:** Pengamanan kata sandi menggunakan fungsi hash bawaan PHP `password_hash()` dan `password_verify()`.
- **Proteksi CSRF:** Validasi token CSRF (`csrf_token()`) pada form pengiriman data POST.
- **Session Guard & RBAC:** Pengecekan sesi dan otorisasi role di setiap modul controller/halaman.
- **Output Escaping:** Menggunakan sanitasi `htmlspecialchars` untuk mencegah serangan Cross-Site Scripting (XSS).
- **Custom Error Handling:** Halaman penanganan error 403 (Forbidden) dan 404 (Not Found).

---

## Struktur Direktori

```text
sistem_akademik/
|-- admin/                  # Modul & controller untuk Administrator
|-- assets/                 # Asset statis (CSS, JS)
|-- auth/                   # Modul autentikasi (login, logout, ganti password)
|-- config/                 # Konfigurasi aplikasi & database
|   |-- auth.php
|   `-- config.php
|-- database/               # File SQL skema dan data awal
|   |-- add_users.sql
|   `-- db_sia_smkn2_magelang.sql
|-- errors/                 # Template halaman error (403, 404)
|-- guru/                   # Modul untuk Guru
|-- includes/               # Komponen antarmuka (header, footer, sidebar, flash)
|-- kepsek/                 # Modul untuk Kepala Sekolah
|-- siswa/                  # Modul untuk Siswa
|-- index.php               # Halaman utama & redirect router
|-- README.md               # Dokumentasi proyek
`-- db_sia_smkn2_magelang.sql
```

---

## Persyaratan Sistem

- **PHP:** Versi 8.1 atau lebih baru (ekstensi `pdo_mysql`, `mbstring`, `session` aktif)
- **Database:** MariaDB 10.4+ / MySQL 8.0+
- **Web Server:** Apache / Nginx / PHP Built-in Server

---

## Panduan Database

Aplikasi ini menggunakan database **MySQL/MariaDB** dengan nama:
`db_sia_smkn2_magelang`

### Langkah Impor Database:

1. **Menggunakan phpMyAdmin / HeidiSQL / DBeaver:**
   - Buat database baru bernama `db_sia_smkn2_magelang` dengan collation `utf8mb4_unicode_ci`.
   - Impor file `database/db_sia_smkn2_magelang.sql`.
   - Impor file `database/add_users.sql` untuk tabel user dan catatan evaluasi.

2. **Menggunakan Command Line (MySQL / MariaDB CLI):**
   ```bash
   mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS db_sia_smkn2_magelang CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   mysql -u root -p db_sia_smkn2_magelang < database/db_sia_smkn2_magelang.sql
   mysql -u root -p db_sia_smkn2_magelang < database/add_users.sql
   ```

File konfigurasi database berada di `config/config.php`. Sesuaikan konstanta `DB_HOST`, `DB_NAME`, `DB_USER`, dan `DB_PASS` jika menggunakan konfigurasi yang berbeda.

Aplikasi juga dilengkapi fungsi otomatis `ensure_auth_tables()` yang akan memeriksa dan melengkapi tabel otentikasi serta data awal saat sistem pertama kali dijalankan.

---

## Cara Menjalankan Aplikasi di Lokal

### Opsi 1: Menggunakan PHP Built-in Server (Cepat & Praktis)

1. Buka terminal pada folder proyek:
   ```bash
   cd sistem_akademik
   ```
2. Jalankan server PHP bawaan:
   ```bash
   php -S 127.0.0.1:80
   ```
3. Buka browser dan akses:
   `http://localhost`

### Opsi 2: Menggunakan Laragon / XAMPP

1. Pindahkan atau salin folder `sistem_akademik` ke:
   - **Laragon:** `C:\laragon\www\sistem_akademik`
   - **XAMPP:** `C:\xampp\htdocs\sistem_akademik`
2. Pastikan layanan Apache dan MySQL sudah dijalankan.
3. Buka browser dan akses:
   `http://localhost/sistem_akademik/`

---

## Akun Demo Pengujian

Semua akun default memiliki kata sandi: **`password`**

| Peran (Role) | Username | ID Referensi | Hak Akses |
|---|---|---|---|
| **Admin** | `admin` | - | Kelola seluruh master data, pengguna, dan jadwal |
| **Guru 1** | `budi` | 1 (Pak Budi) | Kelola nilai dan absensi jadwal mengajar |
| **Guru 2** | `siti` | 2 (Bu Siti) | Kelola nilai dan absensi jadwal mengajar |
| **Kepala Sekolah** | `kepsek` | - | Monitoring laporan, tahun ajaran, dan evaluasi |
| **Siswa 1** | `2425001` | 2425001 (Ahmad) | Akses rapor nilai, jadwal, dan presensi pribadi |
| **Siswa 2** | `2425002` | 2425002 (Bunga) | Akses rapor nilai, jadwal, dan presensi pribadi |

---

## Lisensi

Proyek ini dikembangkan untuk kebutuhan internal akademik dan pembelajaran.
Dikelola oleh [@Muflih2025](https://github.com/Muflih2025).
