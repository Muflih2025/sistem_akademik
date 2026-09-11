# Sistem Informasi Akademik (SIA) SMKN 2 Magelang

Sistem Informasi Akademik berbasis web yang dibangun menggunakan **PHP Native**, **MySQL/MariaDB (PDO)**, dan antarmuka responsif **Bootstrap 5**. Sistem ini menerapkan kontrol akses berbasis peran (**Role-Based Access Control / RBAC**) dengan 4 tingkatan hak akses: **Admin**, **Guru**, **Kepala Sekolah**, dan **Siswa**.

---

## 📑 Berkas & Dokumentasi Proyek Lengkap

Proyek ini telah dilengkapi dengan dokumen dan artefak pendukung akademik lengkap:
1. 🗄️ **Skrip Database SQL:** [`database/db_sia_smkn2_magelang.sql`](database/db_sia_smkn2_magelang.sql) (DDL, DML, Stored Procedure, Trigger, View, dan 20 Query SQL).
2. 🐘 **Skrip SQL PostgreSQL / pgAdmin:** [`database/db_sia_smkn2_magelang_postgres.sql`](database/db_sia_smkn2_magelang_postgres.sql).
3. 🖼️ **Diagram ERD Resmi:** [`ERD_SIA_SMKN2_MAGELANG.png`](ERD_SIA_SMKN2_MAGELANG.png) (Resolusi tinggi 2400x1750 px 300 DPI).
4. 📄 **Laporan Proyek Lengkap (15 Bab):** [`LAPORAN_PROYEK_SIA_SMKN2_MAGELANG.md`](LAPORAN_PROYEK_SIA_SMKN2_MAGELANG.md).
5. 📊 **Panduan Slide Presentasi:** [`SLIDE_PRESENTASI.md`](SLIDE_PRESENTASI.md).

---

## 🔍 PANDUAN LENGKAP: CARA CEK & MELIHAT ISI DATABASE

Database akademik **`db_sia_smkn2_magelang`** berjalan aktif pada **MariaDB Port 3307**. Anda dapat memeriksa isi seluruh tabel, melihat data siswa, nilai, jadwal, dan view rapor menggunakan beberapa cara berikut:

### Opsi 1: Menggunakan HeidiSQL (Sangat Direkomendasikan & Sudah Ada di Komputer)
1. Buka aplikasi **HeidiSQL** melalui Windows Start Menu (`heidisql.exe`).
2. Di panel **Session Manager**, klik tombol **New** (Koneksi Baru):
   - **Network type:** `MariaDB or MySQL (TCP/IP)`
   - **Hostname / IP:** `127.0.0.1`
   - **Port:** `3307`
   - **User:** `root`
   - **Password:** *(kosongkan / tanpa password)*
3. Klik tombol **Open**.
4. Di panel kiri, klik database **`db_sia_smkn2_magelang`**.
5. Klik tab **Data** pada tabel yang ingin Anda cek:
   - Klik tabel **`siswa`** untuk melihat 25 data peserta didik.
   - Klik tabel **`nilai`** untuk melihat 40 catatan nilai tugas, UTS, UAS, dan nilai akhir.
   - Klik view **`view_rapor_siswa`** untuk melihat rekapitulasi rapor lengkap dengan status ketuntasan KKM (*Tuntas/Belum Tuntas*).

---

### Opsi 2: Menggunakan DBeaver (Sudah Terpasang di Komputer)
1. Buka aplikasi **DBeaver** (`C:\Users\User\dbeaver.exe`).
2. Klik menu **Database** -> **New Database Connection**.
3. Pilih driver **MariaDB** atau **MySQL** -> klik **Next**.
4. Masukkan parameter koneksi:
   - **Host:** `127.0.0.1`
   - **Port:** `3307`
   - **Database:** `db_sia_smkn2_magelang`
   - **Username:** `root`
   - **Password:** *(kosongkan)*
5. Klik **Test Connection** (harus bertuliskan *Connected*), lalu klik **Finish**.
6. Dobel klik tabel mana saja untuk melihat data dan struktur tabel secara interaktif.

---

### Opsi 3: Menggunakan Command Line (Terminal CLI Cepat)
Anda dapat langsung mengecek isi tabel dari PowerShell atau terminal WSL dengan perintah berikut:

```bash
# 1. Cek daftar seluruh tabel
mysql -h 127.0.0.1 -P 3307 -u root -D db_sia_smkn2_magelang -e "SHOW TABLES;"

# 2. Cek isi data siswa
mysql -h 127.0.0.1 -P 3307 -u root -D db_sia_smkn2_magelang -e "SELECT nis, nama_siswa, jenis_kelamin FROM siswa LIMIT 10;"

# 3. Cek rapor siswa dan status KKM
mysql -h 127.0.0.1 -P 3307 -u root -D db_sia_smkn2_magelang -e "SELECT nama_siswa, nama_mapel, kkm, nilai_akhir, status_ketuntasan FROM view_rapor_siswa LIMIT 10;"

# 4. Cek riwayat perubahan nilai (Audit Trail Trigger)
mysql -h 127.0.0.1 -P 3307 -u root -D db_sia_smkn2_magelang -e "SELECT * FROM log_perubahan_nilai;"
```

---

### Opsi 4: Menggunakan pgAdmin 4 (PostgreSQL)
Jika Anda ingin memeriksa tabel melalui **pgAdmin 4**:
1. Buka **pgAdmin 4**.
2. Buat database baru bernama `db_sia_smkn2_magelang`.
3. Buka **Query Tool** pada database tersebut.
4. Buka file skema PostgreSQL yang sudah disediakan di folder proyek:
   `database/db_sia_smkn2_magelang_postgres.sql`
5. Tekan tombol **Execute / Run (F5)**.
6. Seluruh skema tabel PostgreSQL akan terbuat dan siap dilihat pada skema `public` -> `Tables`.

---

## 📊 Ringkasan Volume Data Tersimpan

Database telah terisi data dummy riil yang melampaui batas minimal penugasan:

| No | Entitas / Tabel | Jumlah Baris Data | Deskripsi Isi Data |
|---|---|---|---|
| 1 | **`jurusan`** | **5 data** | PPLG, TKJ, AKL, MPLB, PM |
| 2 | **`kelas`** | **6 data** | X PPLG 1 & 2, XI PPLG 1, XII PPLG 1, X TKJ 1, XI TKJ 1 |
| 3 | **`guru`** | **6 data** | Guru produktif dan umum lengkap dengan NIP |
| 4 | **`siswa`** | **25 data** | Siswa aktif dari berbagai tingkat kelas dan jurusan |
| 5 | **`mata_pelajaran`** | **12 data** | Mapel Produktif & Umum lengkap dengan KKM (75 s.d 80) |
| 6 | **`tahun_ajaran`** | **2 data** | 2025/2026 Ganjil (Aktif) dan Genap |
| 7 | **`jadwal`** | **18 data** | Sesi KBM hari Senin - Jumat di ruang Lab & Teori |
| 8 | **`nilai`** | **40 data** | Nilai tugas, UTS, UAS, dan nilai akhir |
| 9 | **`log_perubahan_nilai`** | **Dinamis** | Riwayat modifikasi nilai yang tercatat via Trigger |
| 10 | **`users`** | **12 data** | Akun login untuk Admin, Guru, Siswa, dan Kepala Sekolah |
| 11 | **`absensi`** | **4 data** | Catatan presensi kehadiran pertemuan kelas |

---

## 🚀 Fitur Utama & Hak Akses (RBAC)

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

## 🔒 Fitur Keamanan Sistem

- **PDO Prepared Statements:** Parameter binding di seluruh query untuk memproteksi dari serangan SQL Injection.
- **Bcrypt Password Hashing:** Pengamanan kata sandi menggunakan fungsi hash bawaan PHP `password_hash()` dan `password_verify()`.
- **Proteksi CSRF:** Validasi token CSRF (`csrf_token()`) pada form pengiriman data POST.
- **Session Guard & RBAC:** Pengecekan sesi dan otorisasi role di setiap modul controller/halaman.
- **Output Escaping:** Menggunakan sanitasi `htmlspecialchars` untuk mencegah serangan Cross-Site Scripting (XSS).
- **Custom Error Handling:** Halaman penanganan error 403 (Forbidden) dan 404 (Not Found).

---

## 🖥️ Cara Menjalankan Aplikasi di Lokal

Aplikasi sudah disiapkan untuk berjalan langsung pada web port bawaan:

1. **Akses Langsung via Browser:**
   - Halaman Utama: **`http://localhost`** atau **`http://127.0.0.1`**
   - Halaman Login: **`http://localhost/auth/login.php`**

2. **Menjalankan Manual via CLI (Jika Diperlukan):**
   ```bash
   cd sistem_akademik
   php -S 0.0.0.0:80
   ```

---

## 🔑 Akun Demo Pengujian

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

## 📄 Lisensi & Hak Cipta

Proyek ini dikembangkan untuk kebutuhan akademik SMK Negeri 2 Magelang.
Dikelola oleh [@Muflih2025](https://github.com/Muflih2025).
