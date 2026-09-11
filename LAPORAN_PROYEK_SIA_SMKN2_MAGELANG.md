# LAPORAN PROYEK BASIS DATA
# SISTEM INFORMASI AKADEMIK (SIA) SMK NEGERI 2 MAGELANG

---
## 1. COVER / HALAMAN JUDUL

```text
================================================================================
                    LAPORAN PROYEK AKHIR BASIS DATA
               SISTEM INFORMASI AKADEMIK (SIA) BERBASIS RDBMS
                         SMK NEGERI 2 MAGELANG
================================================================================

Disusun untuk Memenuhi Tugas Mata Pelajaran Basis Data & Pemrograman Web
Konsentrasi Keahlian: Rekayasa Perangkat Lunak / Pengembangan Perangkat Lunak dan Gim (PPLG)
Tahun Ajaran 2025/2026
```

---
## 2. IDENTITAS KELOMPOK & PEMBAGIAN TUGAS

| No | Nama Anggota | Peran / Tanggung Jawab Utama | Rincian Tugas |
|---|---|---|---|
| 1 | **Muflih Rafileseppa (Ketua)** | System Analyst & Database Architect | Analisis kebutuhan, perancangan ERD, arsitektur skema database, dan koordinasi proyek |
| 2 | **Anggota 2** | Database Designer & Normalizer | Analisis ketergantungan fungsional, proses normalisasi data (UNF, 1NF, 2NF, 3NF), dokumentasi kamus data |
| 3 | **Anggota 3** | Database Administrator (DDL Specialist) | Implementasi DDL MySQL/MariaDB, pembuatan constraint (PK, FK, Unique, Default), Stored Procedure & Trigger |
| 4 | **Anggota 4** | Data Analyst & Tester (DML/SQL Specialist) | Penyusunan DML data dummy, implementasi 15 Query Wajib, 5 Query HOTS, pengujian integritas, dan dokumentasi laporan |

---
## 3. LATAR BELAKANG

SMK Negeri 2 Magelang sebagai institusi pendidikan kejuruan unggulan mengelola volume data akademik yang sangat dinamis setiap semesternya, mencakup data ratusan peserta didik, puluhan tenaga pendidik, berbagai konsentrasi keahlian (PPLG, TKJ, AKL, MPLB, PM), ratusan jadwal kegiatan belajar mengajar, serta ribuan catatan penilaian capaian kompetensi.

Sebelum adanya sistem basis data relasional yang terstruktur, pengelolaan data akademik seringkali menghadapi kendala:
1. **Redundansi dan Inkonsistensi Data:** Data siswa dan nilai yang dicatat pada lembar kerja terpisah rentan terjadi perbedaan informasi (anomali peremajaan).
2. **Keterbatasan Integritas Referensial:** Risiko pencatatan nilai atau jadwal untuk kelas/siswa yang sudah tidak aktif atau salah input.
3. **Lambatnya Penarikan Laporan:** Wali kelas dan pimpinan sekolah membutuhkan waktu lama dalam mengagregasikan nilai rapor, menentukan peringkat siswa, atau mengidentifikasi siswa yang belum tuntas KKM.

Oleh karena itu, perancangan basis data relasional **Sistem Informasi Akademik (SIA) SMK Negeri 2 Magelang** yang mengacu pada kaidah normalisasi hingga Third Normal Form (3NF) dan dilengkapi kontrol integritas yang ketat merupakan solusi strategis untuk menjamin efisiensi, akurasi, dan keandalan data institusi.

---
## 4. TUJUAN PROYEK

1. **Menganalisis Kebutuhan Sistem:** Mengidentifikasi secara komprehensif pengguna sistem, entitas data esensial, serta alur informasi akademik di SMKN 2 Magelang.
2. **Merancang Model Data Konseptual & Logikal:** Membangun Entity Relationship Diagram (ERD) lengkap dengan atribut, primary key, foreign key, serta kardinalitas relasi yang tepat.
3. **Menerapkan Kaidah Normalisasi:** Menghilangkan redundansi dan anomali data melalui tahapan normalisasi dari bentuk UNF hingga 3NF.
4. **Mengimplementasikan DDL dan DML:** Mewujudkan skema database ke dalam MySQL/MariaDB dengan constraints ketat serta mempopulasikan minimal 25 siswa, 6 guru, 5 jurusan, 6 kelas, 12 mata pelajaran, 2 tahun ajaran, 18 jadwal, dan 40 nilai.
5. **Menghasilkan Informasi Melalui SQL:** Mengembangkan 15 query wajib dan 5 query analitis tingkat tinggi (HOTS) menggunakan seleksi, filter kondisi, multitabel JOIN, dan fungsi agregasi.
6. **Melakukan Pengujian Komprehensif:** Menguji integritas Primary Key, Foreign Key, Unique Constraint, serta performa trigger audit trail perubahan nilai.

---
## 5. ANALISIS KEBUTUHAN SISTEM

### 5.1 Identifikasi Pengguna Sistem (Users)
1. **Administrator:** Bertanggung jawab penuh atas manajemen master data (siswa, guru, jurusan, kelas, mapel), penjadwalan pelajaran, pembagian akun pengguna, dan konfigurasi tahun ajaran.
2. **Guru (Tenaga Pendidik):** Mengakses jadwal mengajar harian, menginput nilai tugas, UTS, dan UAS siswa pada mata pelajaran yang diampu, serta mencatat kehadiran (absensi) per pertemuan.
3. **Siswa (Peserta Didik):** Memeriksa jadwal belajar mingguan, memantau riwayat kehadiran, serta mengakses rapor akademik transparan lengkap dengan status ketercapaian KKM.
4. **Kepala Sekolah:** Memantau ringkasan performa akademik sekolah, distribusi capaian kompetensi per jurusan, evaluasi kelulusan KKM, serta menerbitkan catatan kebijakan strategis.

### 5.2 Identifikasi Data yang Harus Disimpan
1. Data Jurusan/Program Keahlian (`id_jurusan`, `kode_jurusan`, `nama_jurusan`)
2. Data Kelas Rombongan Belajar (`id_kelas`, `nama_kelas`, `tingkat`, `id_jurusan`)
3. Data Guru Pengajar (`id_guru`, `nip`, `nama_guru`, `email`, `no_hp`)
4. Data Siswa (`nis`, `nama_siswa`, `jenis_kelamin`, `tanggal_lahir`, `alamat`, `id_kelas`)
5. Data Mata Pelajaran (`id_mapel`, `kode_mapel`, `nama_mapel`, `kelompok`, `kkm`)
6. Data Tahun Ajaran & Semester (`id_tahun_ajaran`, `tahun_ajaran`, `semester`, `status`)
7. Data Jadwal Pelajaran (`id_jadwal`, `id_guru`, `id_mapel`, `id_kelas`, `hari`, `jam_mulai`, `jam_selesai`, `ruang`)
8. Data Transaksi Nilai (`id_nilai`, `nis`, `id_mapel`, `id_guru`, `id_tahun_ajaran`, `nilai_tugas`, `nilai_uts`, `nilai_uas`, `nilai_akhir`)
9. Data Audit Log Perubahan Nilai (`id_log`, `id_nilai`, `nilai_lama`, `nilai_baru`, `waktu_diubah`)
10. Data Absensi/Presensi Pertemuan (`id_absen`, `tanggal`, `nis`, `id_jadwal`, `status`, `keterangan`, `created_by`)
11. Data Hak Akses Pengguna (`id_user`, `username`, `password`, `role`, `id_referensi`, `status`)
12. Data Catatan Evaluasi Kepsek (`id_evaluasi`, `judul`, `isi`, `id_tahun_ajaran`, `created_by`)

### 5.3 Informasi yang Dihasilkan Sistem
1. Rapor hasil belajar siswa per semester lengkap dengan nilai akhir dan status tuntas KKM.
2. Rekapitulasi jadwal mengajar guru dan jadwal kelas siswa bebas bentrok (*clash-free*).
3. Daftar peringkat akademik siswa (Top Ranking) per kelas dan per jurusan.
4. Laporan daftar siswa yang berada di bawah KKM untuk penanganan remedial.
5. Rekapitulasi rata-rata nilai dan disparitas mutu tiap mata pelajaran.
6. Distribusi sebaran jumlah siswa pada setiap kompetensi keahlian.
7. Rekapitulasi persentase kehadiran siswa (Hadir, Izin, Sakit, Alpa).
8. Catatan riwayat (audit trail) setiap kali terjadi manipulasi/perubahan nilai akhir siswa.

### 5.4 Analisis Hubungan Antar Data
- **Jurusan ke Kelas (1 : N):** Satu jurusan menaungi banyak kelas rombel, namun satu kelas hanya terafiliasi ke tepat satu jurusan.
- **Kelas ke Siswa (1 : N):** Satu kelas menampung banyak siswa, sedangkan seorang siswa terdaftar di satu kelas aktif pada semester berjalan.
- **Guru ke Jadwal (1 : N):** Satu orang guru dapat mengajar di banyak jadwal jam pelajaran.
- **Mata Pelajaran ke Jadwal (1 : N):** Satu mata pelajaran dijadwalkan pada berbagai kelas dan hari.
- **Kelas ke Jadwal (1 : N):** Satu kelas memiliki rangkaian jadwal belajar setiap minggunya.
- **Siswa, Guru, Mapel, Tahun Ajaran ke Nilai (N : 1):** Entitas transaksi `nilai` menghubungkan siswa tertentu, mata pelajaran tertentu, guru pengampu, dan periode tahun ajaran.
- **Nilai ke Log Perubahan (1 : N):** Setiap kali record nilai diperbarui oleh guru, sistem secara otomatis mencatat riwayat perubahan nilai lama dan baru ke tabel audit.

---
## 6. DAFTAR ENTITAS & KAMUS DATA

1. **`jurusan`**: `id_jurusan` (INT, PK), `kode_jurusan` (VARCHAR(10), UQ), `nama_jurusan` (VARCHAR(100))
2. **`kelas`**: `id_kelas` (INT, PK), `nama_kelas` (VARCHAR(20)), `tingkat` (VARCHAR(5)), `id_jurusan` (INT, FK)
3. **`guru`**: `id_guru` (INT, PK), `nip` (VARCHAR(20), UQ), `nama_guru` (VARCHAR(100)), `email` (VARCHAR(100)), `no_hp` (VARCHAR(20))
4. **`siswa`**: `nis` (VARCHAR(15), PK), `nama_siswa` (VARCHAR(100)), `jenis_kelamin` (ENUM('L','P')), `tanggal_lahir` (DATE), `alamat` (TEXT), `id_kelas` (INT, FK)
5. **`mata_pelajaran`**: `id_mapel` (INT, PK), `kode_mapel` (VARCHAR(10), UQ), `nama_mapel` (VARCHAR(100)), `kelompok` (ENUM), `kkm` (DECIMAL(5,2))
6. **`tahun_ajaran`**: `id_tahun_ajaran` (INT, PK), `tahun_ajaran` (VARCHAR(10)), `semester` (ENUM('Ganjil','Genap')), `status` (ENUM('Aktif','Tidak Aktif'))
7. **`jadwal`**: `id_jadwal` (INT, PK), `id_guru` (INT, FK), `id_mapel` (INT, FK), `id_kelas` (INT, FK), `hari` (ENUM), `jam_mulai` (TIME), `jam_selesai` (TIME), `ruang` (VARCHAR(20))
8. **`nilai`**: `id_nilai` (INT, PK), `nis` (VARCHAR(15), FK), `id_mapel` (INT, FK), `id_guru` (INT, FK), `id_tahun_ajaran` (INT, FK), `nilai_tugas` (DECIMAL), `nilai_uts` (DECIMAL), `nilai_uas` (DECIMAL), `nilai_akhir` (DECIMAL)
9. **`log_perubahan_nilai`**: `id_log` (INT, PK), `id_nilai` (INT, FK), `nilai_lama` (DECIMAL), `nilai_baru` (DECIMAL), `waktu_diubah` (TIMESTAMP)
10. **`users`**: `id_user` (INT, PK), `username` (VARCHAR(50), UQ), `password` (VARCHAR(255)), `role` (ENUM), `id_referensi` (VARCHAR(20)), `status` (ENUM)
11. **`catatan_evaluasi`**: `id_evaluasi` (INT, PK), `judul` (VARCHAR(150)), `isi` (TEXT), `id_tahun_ajaran` (INT, FK), `created_by` (INT, FK)
12. **`absensi`**: `id_absen` (INT, PK), `tanggal` (DATE), `nis` (VARCHAR(15), FK), `id_jadwal` (INT, FK), `status` (ENUM), `keterangan` (VARCHAR(255)), `created_by` (INT, FK)

---
## 7. STRUKTUR TABEL & INTEGRITAS KUNCI

```text
+-----------------------+---------------------+-------------------+---------------------+
| Entitas / Tabel       | Primary Key (PK)    | Foreign Key (FK)  | Constraint Khusus   |
+-----------------------+---------------------+-------------------+---------------------+
| jurusan               | id_jurusan          | -                 | kode_jurusan UNIQUE |
| kelas                 | id_kelas            | id_jurusan        | ON DELETE RESTRICT  |
| guru                  | id_guru             | -                 | nip UNIQUE          |
| siswa                 | nis                 | id_kelas          | ON DELETE RESTRICT  |
| mata_pelajaran        | id_mapel            | -                 | kode_mapel UNIQUE   |
| tahun_ajaran          | id_tahun_ajaran     | -                 | (tahun,sem) UNIQUE  |
| jadwal                | id_jadwal           | guru, mapel, kelas| ON DELETE CASCADE   |
| nilai                 | id_nilai            | nis, mapel, guru, | (nis,mapel,ta) UNQ  |
|                       |                     | tahun_ajaran      | ON DELETE CASCADE   |
| log_perubahan_nilai   | id_log              | id_nilai          | Audit Trigger       |
| users                 | id_user             | -                 | username UNIQUE     |
| catatan_evaluasi      | id_evaluasi         | tahun, created_by | ON DELETE SET NULL  |
| absensi               | id_absen            | nis, jadwal, guru | (tgl,nis,jdwl) UNQ  |
+-----------------------+---------------------+-------------------+---------------------+
```

---
## 8. ENTITY RELATIONSHIP DIAGRAM (ERD)

Berkas gambar diagram relasi entitas telah dibuat dalam format gambar beresolusi tinggi:
- **Nama File:** `ERD_SIA_SMKN2_MAGELANG.png`
- **Ukuran:** 2400 x 1750 piksel (300 DPI)

### Diagram ERD Teks (Notasi Kardinalitas):
```text
+-----------+         1 : N         +---------+         1 : N         +---------+
|  JURUSAN  | --------------------> |  KELAS  | --------------------> |  SISWA  |
+-----------+                       +---------+                       +---------+
                                         | 1                               | 1
                                         |                                 |
                                         | N                               | N
+-----------+         1 : N         +---------+                       +---------+
|   GURU    | --------------------> | JADWAL  |                       |  NILAI  |
+-----------+                       +---------+                       +---------+
      | 1                                ^                                 ^ 1
      |                                  | N                               | |
      | 1 : N                            |                                 | | 1 : N
      +----------------------------------|--------+                        | +
                                         |        |                        | | 
+----------------+         1 : N         |        |                        | v
| MATA_PELAJARAN | ----------------------+--------|------------------------+ +---------------------+
+----------------+                                |                          | LOG_PERUBAHAN_NILAI |
                                                  |                          +---------------------+
+----------------+         1 : N                  |
|  TAHUN_AJARAN  | -------------------------------+------------------------> NILAI
+----------------+
```

---
## 9. TAHAP NORMALISASI DATA (UNF HINGGA 3NF)

### 9.1 Unnormalized Form (UNF)
Memuat seluruh atribut secara redundan dalam satu dokumen data tak terstruktur:
`UNF = {nis, nama_siswa, jenis_kelamin, tanggal_lahir, alamat, kode_kelas, nama_kelas, tingkat, kode_jurusan, nama_jurusan, [kode_mapel, nama_mapel, kkm, nip_guru, nama_guru, nilai_tugas, nilai_uts, nilai_uas, nilai_akhir], [hari, jam_mulai, jam_selesai, ruang], tahun_ajaran, semester}`

### 9.2 First Normal Form (1NF)
Menghilangkan repeating groups sehingga setiap atribut bernilai atomik dan menetapkan Primary Key gabungan `(nis, kode_mapel, tahun_ajaran, semester)`.
*Masalah di 1NF:* Partial Dependency (atribut siswa hanya bergantung pada `nis`, atribut mapel hanya bergantung pada `kode_mapel`).

### 9.3 Second Normal Form (2NF)
Menghilangkan Partial Dependency dengan memisahkan tabel master `siswa`, `guru`, `mata_pelajaran`, `tahun_ajaran`, `kelas`, dan tabel relasi `nilai` serta `jadwal`.
*Masalah di 2NF:* Transitive Dependency (`nis` -> `id_kelas` -> `id_jurusan` -> `nama_jurusan`).

### 9.4 Third Normal Form (3NF)
Menghilangkan Transitive Dependency dengan memisahkan entitas `jurusan` dan `kelas` menjadi tabel independen. Menambahkan surrogate primary key auto-increment pada setiap entitas master untuk integritas dan performa relasi yang optimal.

*Alasan Pemisahan Tabel:* Mencegah anomali insert (menambah jurusan baru tanpa siswa), anomali delete (menghapus siswa tanpa menghilangkan jurusan), dan anomali update (mengubah nama jurusan cukup di 1 baris).

---
## 10. IMPLEMENTASI DATABASE & DDL/DML

Database diimplementasikan pada MariaDB/MySQL dengan spesifikasi:
- Database Name: `db_sia_smkn2_magelang`
- Encoding: `utf8mb4_unicode_ci`
- Engine: `InnoDB`
- Volume Data: 25 Siswa, 6 Guru, 5 Jurusan, 6 Kelas, 12 Mata Pelajaran, 2 Tahun Ajaran, 18 Jadwal Pelajaran, 40 Data Nilai.

---
## 11. DOKUMENTASI HASIL QUERY SQL (15 QUERY WAJIB & 5 QUERY HOTS)

### Query 1: Menampilkan Seluruh Data Siswa
```sql
SELECT nis, nama_siswa, jenis_kelamin, tanggal_lahir, alamat FROM siswa LIMIT 8;
```

**Hasil Eksekusi Query:**
```text
+---------+---------------------+---------------+---------------+--------------------------------------+
| nis     | nama_siswa          | jenis_kelamin | tanggal_lahir | alamat                               |
+---------+---------------------+---------------+---------------+--------------------------------------+
| 2425001 | Ahmad Rizky Pratama | L             | 2008-03-15    | Jl. Pahlawan No. 12B, Magelang       |
| 2425002 | Bunga Citra Lestari | P             | 2008-07-22    | Jl. Pemuda No. 45, Magelang          |
| 2425003 | Candra Wijaya       | L             | 2008-01-10    | Jl. Tidar No. 8, Magelang            |
| 2425004 | Dina Maulida        | P             | 2008-11-05    | Jl. Gatot Subroto No. 30, Magelang   |
| 2425005 | Fajar Ramadhan      | L             | 2008-09-18    | Jl. Sudirman No. 99, Magelang        |
| 2425006 | Gita Permata        | P             | 2008-04-25    | Jl. Tentara Pelajar No. 15, Magelang |
| 2425007 | Hendra Saputra      | L             | 2008-12-01    | Jl. Mayor Unus No. 50, Magelang      |
| 2425008 | Indah Pratiwi       | P             | 2008-06-14    | Jl. Danau Singkarak No. 4, Magelang  |
+---------+---------------------+---------------+---------------+--------------------------------------+
```

---

### Query 2: Menampilkan Siswa Berdasarkan Kelas X PPLG 1
```sql
SELECT s.nis, s.nama_siswa, s.jenis_kelamin, k.nama_kelas FROM siswa s JOIN kelas k ON s.id_kelas = k.id_kelas WHERE k.nama_kelas = 'X PPLG 1';
```

**Hasil Eksekusi Query:**
```text
+---------+---------------------+---------------+------------+
| nis     | nama_siswa          | jenis_kelamin | nama_kelas |
+---------+---------------------+---------------+------------+
| 2425001 | Ahmad Rizky Pratama | L             | X PPLG 1   |
| 2425002 | Bunga Citra Lestari | P             | X PPLG 1   |
| 2425003 | Candra Wijaya       | L             | X PPLG 1   |
| 2425004 | Dina Maulida        | P             | X PPLG 1   |
+---------+---------------------+---------------+------------+
```

---

### Query 3: Menampilkan Siswa Berdasarkan Jurusan PPLG
```sql
SELECT s.nis, s.nama_siswa, k.nama_kelas, j.nama_jurusan FROM siswa s JOIN kelas k ON s.id_kelas = k.id_kelas JOIN jurusan j ON k.id_jurusan = j.id_jurusan WHERE j.kode_jurusan = 'PPLG' LIMIT 8;
```

**Hasil Eksekusi Query:**
```text
+---------+---------------------+------------+--------------------------------------+
| nis     | nama_siswa          | nama_kelas | nama_jurusan                         |
+---------+---------------------+------------+--------------------------------------+
| 2425001 | Ahmad Rizky Pratama | X PPLG 1   | Pengembangan Perangkat Lunak dan Gim |
| 2425002 | Bunga Citra Lestari | X PPLG 1   | Pengembangan Perangkat Lunak dan Gim |
| 2425003 | Candra Wijaya       | X PPLG 1   | Pengembangan Perangkat Lunak dan Gim |
| 2425004 | Dina Maulida        | X PPLG 1   | Pengembangan Perangkat Lunak dan Gim |
| 2425005 | Fajar Ramadhan      | X PPLG 2   | Pengembangan Perangkat Lunak dan Gim |
| 2425006 | Gita Permata        | X PPLG 2   | Pengembangan Perangkat Lunak dan Gim |
| 2425007 | Hendra Saputra      | X PPLG 2   | Pengembangan Perangkat Lunak dan Gim |
| 2425008 | Indah Pratiwi       | X PPLG 2   | Pengembangan Perangkat Lunak dan Gim |
+---------+---------------------+------------+--------------------------------------+
```

---

### Query 4: Menampilkan Seluruh Data Guru
```sql
SELECT nip, nama_guru, email, no_hp FROM guru;
```

**Hasil Eksekusi Query:**
```text
+--------------------+---------------------+-----------------------------------+--------------+
| nip                | nama_guru           | email                             | no_hp        |
+--------------------+---------------------+-----------------------------------+--------------+
| 198501012010011001 | Budi Santoso, S.Kom | budi.santoso@smkn2magelang.sch.id | 081234567899 |
| 198602022011022002 | Siti Rahayu, S.Pd   | siti.rahayu@smkn2magelang.sch.id  | 081234567802 |
| 198703032012011003 | Ahmad Fauzi, M.Kom  | ahmad.fauzi@smkn2magelang.sch.id  | 081234567803 |
| 198804042013022004 | Dewi Lestari, S.Pd  | dewi.lestari@smkn2magelang.sch.id | 081234567804 |
| 198905052014011005 | Eko Prasetyo, S.T   | eko.prasetyo@smkn2magelang.sch.id | 081234567805 |
| 199006062015012006 | Rina Marlina, M.Pd  | rina.marlina@smkn2magelang.sch.id | 081234567806 |
+--------------------+---------------------+-----------------------------------+--------------+
```

---

### Query 5: Menampilkan Seluruh Mata Pelajaran
```sql
SELECT kode_mapel, nama_mapel, kelompok, kkm FROM mata_pelajaran;
```

**Hasil Eksekusi Query:**
```text
+------------+------------------------------------------+-----------------+-------+
| kode_mapel | nama_mapel                               | kelompok        | kkm   |
+------------+------------------------------------------+-----------------+-------+
| MP001      | Pemrograman Berorientasi Objek           | Produktif       | 75.00 |
| MP002      | Basis Data                               | Produktif       | 75.00 |
| MP003      | Pemrograman Web dan Perangkat Bergerak   | Produktif       | 78.00 |
| MP004      | Pemodelan Perangkat Lunak                | Produktif       | 75.00 |
| MP005      | Administrasi Infrastruktur Jaringan      | Produktif       | 75.00 |
| MP006      | Teknologi Layanan Jaringan               | Produktif       | 75.00 |
| MP007      | Matematika                               | Muatan Nasional | 75.00 |
| MP008      | Bahasa Indonesia                         | Muatan Nasional | 78.00 |
| MP009      | Bahasa Inggris                           | Muatan Nasional | 75.00 |
| MP010      | Pendidikan Agama dan Budi Pekerti        | Muatan Nasional | 80.00 |
| MP011      | Pendidikan Pancasila dan Kewarganegaraan | Muatan Nasional | 78.00 |
| MP012      | Projek Kreatif dan Kewirausahaan         | Produktif       | 75.00 |
+------------+------------------------------------------+-----------------+-------+
```

---

### Query 6: Menampilkan Siswa Berjenis Kelamin Laki-Laki
```sql
SELECT nis, nama_siswa, jenis_kelamin, tanggal_lahir FROM siswa WHERE jenis_kelamin = 'L' LIMIT 8;
```

**Hasil Eksekusi Query:**
```text
+---------+---------------------+---------------+---------------+
| nis     | nama_siswa          | jenis_kelamin | tanggal_lahir |
+---------+---------------------+---------------+---------------+
| 2425001 | Ahmad Rizky Pratama | L             | 2008-03-15    |
| 2425003 | Candra Wijaya       | L             | 2008-01-10    |
| 2425005 | Fajar Ramadhan      | L             | 2008-09-18    |
| 2425007 | Hendra Saputra      | L             | 2008-12-01    |
| 2425009 | Joko Susilo         | L             | 2007-02-19    |
| 2425011 | Lukman Hakim        | L             | 2007-05-12    |
| 2425013 | Nanda Pratama       | L             | 2006-03-27    |
| 2425015 | Panji Gumilang      | L             | 2006-09-09    |
+---------+---------------------+---------------+---------------+
```

---

### Query 7: Menampilkan Siswa Kelas XI
```sql
SELECT s.nis, s.nama_siswa, k.nama_kelas, k.tingkat FROM siswa s JOIN kelas k ON s.id_kelas = k.id_kelas WHERE k.tingkat = 'XI';
```

**Hasil Eksekusi Query:**
```text
+---------+----------------+------------+---------+
| nis     | nama_siswa     | nama_kelas | tingkat |
+---------+----------------+------------+---------+
| 2425009 | Joko Susilo    | XI PPLG 1  | XI      |
| 2425010 | Kartika Sari   | XI PPLG 1  | XI      |
| 2425011 | Lukman Hakim   | XI PPLG 1  | XI      |
| 2425012 | Mega Utami     | XI PPLG 1  | XI      |
| 2425021 | Vivi Alawiyah  | XI TKJ 1   | XI      |
| 2425022 | Wahyu Setiawan | XI TKJ 1   | XI      |
| 2425023 | Xena Gabriella | XI TKJ 1   | XI      |
| 2425024 | Yusuf Maulana  | XI TKJ 1   | XI      |
| 2425025 | Zahra Amalia   | XI TKJ 1   | XI      |
+---------+----------------+------------+---------+
```

---

### Query 8: Menampilkan Nilai Siswa yang Lebih Besar atau Sama dengan 80
```sql
SELECT s.nis, s.nama_siswa, mp.nama_mapel, n.nilai_akhir FROM nilai n JOIN siswa s ON n.nis = s.nis JOIN mata_pelajaran mp ON n.id_mapel = mp.id_mapel WHERE n.nilai_akhir >= 80.00 LIMIT 8;
```

**Hasil Eksekusi Query:**
```text
+---------+---------------------+--------------------------------+-------------+
| nis     | nama_siswa          | nama_mapel                     | nilai_akhir |
+---------+---------------------+--------------------------------+-------------+
| 2425001 | Ahmad Rizky Pratama | Pemrograman Berorientasi Objek |       84.33 |
| 2425001 | Ahmad Rizky Pratama | Basis Data                     |       87.00 |
| 2425001 | Ahmad Rizky Pratama | Bahasa Indonesia               |       87.67 |
| 2425002 | Bunga Citra Lestari | Basis Data                     |       80.00 |
| 2425002 | Bunga Citra Lestari | Bahasa Indonesia               |       82.33 |
| 2425003 | Candra Wijaya       | Pemrograman Berorientasi Objek |       92.33 |
| 2425003 | Candra Wijaya       | Basis Data                     |       87.67 |
| 2425003 | Candra Wijaya       | Matematika                     |       88.33 |
+---------+---------------------+--------------------------------+-------------+
```

---

### Query 9: Menampilkan Siswa dengan Nilai Akhir di Bawah KKM
```sql
SELECT s.nis, s.nama_siswa, mp.nama_mapel, mp.kkm, n.nilai_akhir, (mp.kkm - n.nilai_akhir) AS selisih_poin FROM nilai n JOIN siswa s ON n.nis = s.nis JOIN mata_pelajaran mp ON n.id_mapel = mp.id_mapel WHERE n.nilai_akhir < mp.kkm;
```

**Hasil Eksekusi Query:**
```text
+---------+---------------------+----------------------------------------+-------+-------------+--------------+
| nis     | nama_siswa          | nama_mapel                             | kkm   | nilai_akhir | selisih_poin |
+---------+---------------------+----------------------------------------+-------+-------------+--------------+
| 2425002 | Bunga Citra Lestari | Matematika                             | 75.00 |       70.00 |         5.00 |
| 2425004 | Dina Maulida        | Pemrograman Berorientasi Objek         | 75.00 |       72.33 |         2.67 |
| 2425004 | Dina Maulida        | Basis Data                             | 75.00 |       72.00 |         3.00 |
| 2425007 | Hendra Saputra      | Pemrograman Berorientasi Objek         | 75.00 |       67.67 |         7.33 |
| 2425007 | Hendra Saputra      | Basis Data                             | 75.00 |       70.00 |         5.00 |
| 2425011 | Lukman Hakim        | Pemrograman Web dan Perangkat Bergerak | 78.00 |       72.00 |         6.00 |
| 2425019 | Taufik Hidayat      | Administrasi Infrastruktur Jaringan    | 75.00 |       70.00 |         5.00 |
+---------+---------------------+----------------------------------------+-------+-------------+--------------+
```

---

### Query 10: Menampilkan Nama Siswa Beserta Nama Kelas dan Jurusannya
```sql
SELECT s.nis, s.nama_siswa, k.nama_kelas, j.nama_jurusan FROM siswa s JOIN kelas k ON s.id_kelas = k.id_kelas JOIN jurusan j ON k.id_jurusan = j.id_jurusan ORDER BY k.nama_kelas ASC, s.nama_siswa ASC LIMIT 8;
```

**Hasil Eksekusi Query:**
```text
+---------+---------------------+------------+--------------------------------------+
| nis     | nama_siswa          | nama_kelas | nama_jurusan                         |
+---------+---------------------+------------+--------------------------------------+
| 2425001 | Ahmad Rizky Pratama | X PPLG 1   | Pengembangan Perangkat Lunak dan Gim |
| 2425002 | Bunga Citra Lestari | X PPLG 1   | Pengembangan Perangkat Lunak dan Gim |
| 2425003 | Candra Wijaya       | X PPLG 1   | Pengembangan Perangkat Lunak dan Gim |
| 2425004 | Dina Maulida        | X PPLG 1   | Pengembangan Perangkat Lunak dan Gim |
| 2425005 | Fajar Ramadhan      | X PPLG 2   | Pengembangan Perangkat Lunak dan Gim |
| 2425006 | Gita Permata        | X PPLG 2   | Pengembangan Perangkat Lunak dan Gim |
| 2425007 | Hendra Saputra      | X PPLG 2   | Pengembangan Perangkat Lunak dan Gim |
| 2425008 | Indah Pratiwi       | X PPLG 2   | Pengembangan Perangkat Lunak dan Gim |
+---------+---------------------+------------+--------------------------------------+
```

---

### Query 11: Menampilkan Jadwal Lengkap Beserta Nama Guru, Mapel, dan Kelas
```sql
SELECT jd.hari, jd.jam_mulai, jd.jam_selesai, jd.ruang, k.nama_kelas, mp.nama_mapel, g.nama_guru FROM jadwal jd JOIN kelas k ON jd.id_kelas = k.id_kelas JOIN mata_pelajaran mp ON jd.id_mapel = mp.id_mapel JOIN guru g ON jd.id_guru = g.id_guru LIMIT 8;
```

**Hasil Eksekusi Query:**
```text
+--------+-----------+-------------+-------------+------------+--------------------------------+---------------------+
| hari   | jam_mulai | jam_selesai | ruang       | nama_kelas | nama_mapel                     | nama_guru           |
+--------+-----------+-------------+-------------+------------+--------------------------------+---------------------+
| Senin  | 07:00:00  | 09:15:00    | Lab RPL 1   | X PPLG 1   | Pemrograman Berorientasi Objek | Budi Santoso, S.Kom |
| Senin  | 09:30:00  | 11:45:00    | Lab RPL 1   | X PPLG 1   | Basis Data                     | Siti Rahayu, S.Pd   |
| Selasa | 07:00:00  | 08:30:00    | R. X-PPLG-1 | X PPLG 1   | Matematika                     | Dewi Lestari, S.Pd  |
| Rabu   | 07:00:00  | 08:30:00    | R. X-PPLG-1 | X PPLG 1   | Bahasa Indonesia               | Rina Marlina, M.Pd  |
| Selasa | 07:00:00  | 09:15:00    | Lab RPL 2   | X PPLG 2   | Pemrograman Berorientasi Objek | Budi Santoso, S.Kom |
| Selasa | 09:30:00  | 11:45:00    | Lab RPL 2   | X PPLG 2   | Basis Data                     | Siti Rahayu, S.Pd   |
| Rabu   | 08:30:00  | 10:00:00    | R. X-PPLG-2 | X PPLG 2   | Matematika                     | Dewi Lestari, S.Pd  |
| Kamis  | 07:00:00  | 08:30:00    | R. X-PPLG-2 | X PPLG 2   | Bahasa Indonesia               | Rina Marlina, M.Pd  |
+--------+-----------+-------------+-------------+------------+--------------------------------+---------------------+
```

---

### Query 12: Menampilkan Nilai Siswa Beserta Nama Mata Pelajaran
```sql
SELECT s.nis, s.nama_siswa, mp.nama_mapel, n.nilai_tugas, n.nilai_uts, n.nilai_uas, n.nilai_akhir FROM nilai n JOIN siswa s ON n.nis = s.nis JOIN mata_pelajaran mp ON n.id_mapel = mp.id_mapel LIMIT 8;
```

**Hasil Eksekusi Query:**
```text
+---------+---------------------+--------------------------------+-------------+-----------+-----------+-------------+
| nis     | nama_siswa          | nama_mapel                     | nilai_tugas | nilai_uts | nilai_uas | nilai_akhir |
+---------+---------------------+--------------------------------+-------------+-----------+-----------+-------------+
| 2425001 | Ahmad Rizky Pratama | Pemrograman Berorientasi Objek |       85.00 |     80.00 |     88.00 |       84.33 |
| 2425001 | Ahmad Rizky Pratama | Basis Data                     |       90.00 |     85.00 |     86.00 |       87.00 |
| 2425001 | Ahmad Rizky Pratama | Matematika                     |       78.00 |     75.00 |     80.00 |       77.67 |
| 2425001 | Ahmad Rizky Pratama | Bahasa Indonesia               |       88.00 |     85.00 |     90.00 |       87.67 |
| 2425002 | Bunga Citra Lestari | Pemrograman Berorientasi Objek |       78.00 |     72.00 |     75.00 |       75.00 |
| 2425002 | Bunga Citra Lestari | Basis Data                     |       80.00 |     78.00 |     82.00 |       80.00 |
| 2425002 | Bunga Citra Lestari | Matematika                     |       70.00 |     68.00 |     72.00 |       70.00 |
| 2425002 | Bunga Citra Lestari | Bahasa Indonesia               |       82.00 |     80.00 |     85.00 |       82.33 |
+---------+---------------------+--------------------------------+-------------+-----------+-----------+-------------+
```

---

### Query 13: Menampilkan Daftar Guru Beserta Mata Pelajaran yang Diampu
```sql
SELECT DISTINCT g.nip, g.nama_guru, mp.kode_mapel, mp.nama_mapel FROM jadwal jd JOIN guru g ON jd.id_guru = g.id_guru JOIN mata_pelajaran mp ON jd.id_mapel = mp.id_mapel ORDER BY g.nama_guru ASC;
```

**Hasil Eksekusi Query:**
```text
+--------------------+---------------------+------------+----------------------------------------+
| nip                | nama_guru           | kode_mapel | nama_mapel                             |
+--------------------+---------------------+------------+----------------------------------------+
| 198703032012011003 | Ahmad Fauzi, M.Kom  | MP012      | Projek Kreatif dan Kewirausahaan       |
| 198703032012011003 | Ahmad Fauzi, M.Kom  | MP003      | Pemrograman Web dan Perangkat Bergerak |
| 198501012010011001 | Budi Santoso, S.Kom | MP001      | Pemrograman Berorientasi Objek         |
| 198501012010011001 | Budi Santoso, S.Kom | MP004      | Pemodelan Perangkat Lunak              |
| 198804042013022004 | Dewi Lestari, S.Pd  | MP007      | Matematika                             |
| 198905052014011005 | Eko Prasetyo, S.T   | MP006      | Teknologi Layanan Jaringan             |
| 198905052014011005 | Eko Prasetyo, S.T   | MP005      | Administrasi Infrastruktur Jaringan    |
| 199006062015012006 | Rina Marlina, M.Pd  | MP008      | Bahasa Indonesia                       |
| 198602022011022002 | Siti Rahayu, S.Pd   | MP002      | Basis Data                             |
+--------------------+---------------------+------------+----------------------------------------+
```

---

### Query 14: Menghitung Rata-rata Nilai Setiap Mata Pelajaran
```sql
SELECT mp.kode_mapel, mp.nama_mapel, mp.kkm, COUNT(n.id_nilai) AS jumlah_siswa, ROUND(AVG(n.nilai_akhir), 2) AS rata_rata FROM mata_pelajaran mp LEFT JOIN nilai n ON mp.id_mapel = n.id_mapel GROUP BY mp.id_mapel, mp.kode_mapel, mp.nama_mapel, mp.kkm ORDER BY rata_rata DESC;
```

**Hasil Eksekusi Query:**
```text
+------------+------------------------------------------+-------+--------------+-----------+
| kode_mapel | nama_mapel                               | kkm   | jumlah_siswa | rata_rata |
+------------+------------------------------------------+-------+--------------+-----------+
| MP012      | Projek Kreatif dan Kewirausahaan         | 75.00 |            2 |     91.00 |
| MP003      | Pemrograman Web dan Perangkat Bergerak   | 78.00 |            4 |     86.25 |
| MP008      | Bahasa Indonesia                         | 78.00 |            2 |     85.00 |
| MP006      | Teknologi Layanan Jaringan               | 75.00 |            2 |     85.00 |
| MP002      | Basis Data                               | 75.00 |            9 |     83.00 |
| MP004      | Pemodelan Perangkat Lunak                | 75.00 |            3 |     82.56 |
| MP001      | Pemrograman Berorientasi Objek           | 75.00 |            8 |     82.08 |
| MP007      | Matematika                               | 75.00 |            5 |     82.07 |
| MP005      | Administrasi Infrastruktur Jaringan      | 75.00 |            5 |     79.13 |
| MP011      | Pendidikan Pancasila dan Kewarganegaraan | 78.00 |            0 |      NULL |
| MP010      | Pendidikan Agama dan Budi Pekerti        | 80.00 |            0 |      NULL |
| MP009      | Bahasa Inggris                           | 75.00 |            0 |      NULL |
+------------+------------------------------------------+-------+--------------+-----------+
```

---

### Query 15: Menampilkan Siswa dengan Nilai Rata-rata Tertinggi
```sql
SELECT s.nis, s.nama_siswa, k.nama_kelas, ROUND(AVG(n.nilai_akhir), 2) AS rata_rata_nilai FROM nilai n JOIN siswa s ON n.nis = s.nis JOIN kelas k ON s.id_kelas = k.id_kelas GROUP BY s.nis, s.nama_siswa, k.nama_kelas ORDER BY rata_rata_nilai DESC LIMIT 1;
```

**Hasil Eksekusi Query:**
```text
+---------+------------+------------+-----------------+
| nis     | nama_siswa | nama_kelas | rata_rata_nilai |
+---------+------------+------------+-----------------+
| 2425012 | Mega Utami | XI PPLG 1  |           94.00 |
+---------+------------+------------+-----------------+
```

---

### HOTS 1: 5 Siswa dengan Nilai Rata-rata Tertinggi (Top 5 Ranking)
```sql
SELECT s.nis, s.nama_siswa, k.nama_kelas, j.nama_jurusan, COUNT(n.id_mapel) AS total_mapel, ROUND(AVG(n.nilai_akhir), 2) AS rerata_akhir FROM nilai n JOIN siswa s ON n.nis = s.nis JOIN kelas k ON s.id_kelas = k.id_kelas JOIN jurusan j ON k.id_jurusan = j.id_jurusan GROUP BY s.nis, s.nama_siswa, k.nama_kelas, j.nama_jurusan ORDER BY rerata_akhir DESC LIMIT 5;
```

**Hasil Eksekusi Query:**
```text
+---------+----------------+------------+--------------------------------------+-------------+--------------+
| nis     | nama_siswa     | nama_kelas | nama_jurusan                         | total_mapel | rerata_akhir |
+---------+----------------+------------+--------------------------------------+-------------+--------------+
| 2425012 | Mega Utami     | XI PPLG 1  | Pengembangan Perangkat Lunak dan Gim |           1 |        94.00 |
| 2425008 | Indah Pratiwi  | X PPLG 2   | Pengembangan Perangkat Lunak dan Gim |           2 |        93.34 |
| 2425010 | Kartika Sari   | XI PPLG 1  | Pengembangan Perangkat Lunak dan Gim |           2 |        90.00 |
| 2425016 | Qori Anggraini | XII PPLG 1 | Pengembangan Perangkat Lunak dan Gim |           1 |        90.00 |
| 2425013 | Nanda Pratama  | XII PPLG 1 | Pengembangan Perangkat Lunak dan Gim |           2 |        89.84 |
+---------+----------------+------------+--------------------------------------+-------------+--------------+
```

---

### HOTS 2: Mata Pelajaran dengan Rata-rata Nilai Terendah
```sql
SELECT mp.id_mapel, mp.kode_mapel, mp.nama_mapel, mp.kkm, ROUND(AVG(n.nilai_akhir), 2) AS rerata_terendah FROM mata_pelajaran mp JOIN nilai n ON mp.id_mapel = n.id_mapel GROUP BY mp.id_mapel, mp.kode_mapel, mp.nama_mapel, mp.kkm ORDER BY rerata_terendah ASC LIMIT 1;
```

**Hasil Eksekusi Query:**
```text
+----------+------------+-------------------------------------+-------+-----------------+
| id_mapel | kode_mapel | nama_mapel                          | kkm   | rerata_terendah |
+----------+------------+-------------------------------------+-------+-----------------+
|        5 | MP005      | Administrasi Infrastruktur Jaringan | 75.00 |           79.13 |
+----------+------------+-------------------------------------+-------+-----------------+
```

---

### HOTS 3: Menampilkan Jumlah Siswa pada Setiap Jurusan
```sql
SELECT j.kode_jurusan, j.nama_jurusan, COUNT(DISTINCT k.id_kelas) AS jumlah_kelas, COUNT(s.nis) AS total_siswa FROM jurusan j LEFT JOIN kelas k ON j.id_jurusan = k.id_jurusan LEFT JOIN siswa s ON k.id_kelas = s.id_kelas GROUP BY j.id_jurusan, j.kode_jurusan, j.nama_jurusan ORDER BY total_siswa DESC;
```

**Hasil Eksekusi Query:**
```text
+--------------+------------------------------------------+--------------+-------------+
| kode_jurusan | nama_jurusan                             | jumlah_kelas | total_siswa |
+--------------+------------------------------------------+--------------+-------------+
| PPLG         | Pengembangan Perangkat Lunak dan Gim     |            4 |          16 |
| TKJ          | Teknik Komputer dan Jaringan             |            2 |           9 |
| PM           | Pemasaran                                |            0 |           0 |
| MPLB         | Manajemen Perkantoran dan Layanan Bisnis |            0 |           0 |
| AKL          | Akuntansi dan Keuangan Lembaga           |            0 |           0 |
+--------------+------------------------------------------+--------------+-------------+
```

---

### HOTS 4: Menampilkan Guru yang Mengajar Lebih dari Satu Kelas
```sql
SELECT g.nip, g.nama_guru, COUNT(DISTINCT jd.id_kelas) AS jumlah_kelas_diajar, GROUP_CONCAT(DISTINCT k.nama_kelas ORDER BY k.nama_kelas SEPARATOR ', ') AS daftar_kelas FROM guru g JOIN jadwal jd ON g.id_guru = jd.id_guru JOIN kelas k ON jd.id_kelas = k.id_kelas GROUP BY g.id_guru, g.nip, g.nama_guru HAVING jumlah_kelas_diajar > 1 ORDER BY jumlah_kelas_diajar DESC;
```

**Hasil Eksekusi Query:**
```text
+--------------------+---------------------+---------------------+----------------------------------------+
| nip                | nama_guru           | jumlah_kelas_diajar | daftar_kelas                           |
+--------------------+---------------------+---------------------+----------------------------------------+
| 198804042013022004 | Dewi Lestari, S.Pd  |                   4 | X PPLG 1, X PPLG 2, X TKJ 1, XI PPLG 1 |
| 198501012010011001 | Budi Santoso, S.Kom |                   3 | X PPLG 1, X PPLG 2, XII PPLG 1         |
| 198602022011022002 | Siti Rahayu, S.Pd   |                   3 | X PPLG 1, X PPLG 2, XI PPLG 1          |
| 198703032012011003 | Ahmad Fauzi, M.Kom  |                   2 | XI PPLG 1, XII PPLG 1                  |
| 198905052014011005 | Eko Prasetyo, S.T   |                   2 | X TKJ 1, XI TKJ 1                      |
| 199006062015012006 | Rina Marlina, M.Pd  |                   2 | X PPLG 1, X PPLG 2                     |
+--------------------+---------------------+---------------------+----------------------------------------+
```

---

### HOTS 5: Siswa dengan Nilai di Bawah KKM pada Lebih dari Satu Mata Pelajaran
```sql
SELECT s.nis, s.nama_siswa, k.nama_kelas, COUNT(n.id_nilai) AS total_mapel_remedial, GROUP_CONCAT(CONCAT(mp.nama_mapel, ' (Nilai: ', n.nilai_akhir, ', KKM: ', mp.kkm, ')') SEPARATOR '; ') AS rincian_remedial FROM nilai n JOIN siswa s ON n.nis = s.nis JOIN kelas k ON s.id_kelas = k.id_kelas JOIN mata_pelajaran mp ON n.id_mapel = mp.id_mapel WHERE n.nilai_akhir < mp.kkm GROUP BY s.nis, s.nama_siswa, k.nama_kelas HAVING total_mapel_remedial > 1;
```

**Hasil Eksekusi Query:**
```text
+---------+----------------+------------+----------------------+--------------------------------------------------------------------------------------------------+
| nis     | nama_siswa     | nama_kelas | total_mapel_remedial | rincian_remedial                                                                                 |
+---------+----------------+------------+----------------------+--------------------------------------------------------------------------------------------------+
| 2425004 | Dina Maulida   | X PPLG 1   |                    2 | Pemrograman Berorientasi Objek (Nilai: 72.33, KKM: 75.00); Basis Data (Nilai: 72.00, KKM: 75.00) |
| 2425007 | Hendra Saputra | X PPLG 2   |                    2 | Pemrograman Berorientasi Objek (Nilai: 67.67, KKM: 75.00); Basis Data (Nilai: 70.00, KKM: 75.00) |
+---------+----------------+------------+----------------------+--------------------------------------------------------------------------------------------------+
```

---



---
## 12. PENGUJIAN DATABASE (TESTING)

Berikut adalah pengujian integritas 9 skenario:
1. **Memasukkan Data Baru (INSERT):** Berhasil menambahkan record baru ke tabel siswa (`nis = '2425099'`).
2. **Mengubah Data (UPDATE):** Berhasil memperbarui alamat siswa pengujian secara tepat sasaran.
3. **Menghapus Data (DELETE):** Berhasil menghapus record siswa pengujian.
4. **Uji Foreign Key Violation:** Percobaan insert siswa dengan `id_kelas = 9999` berhasil DITOLAK oleh database dengan pesan error `ERROR 1452: Cannot add or update a child row: a foreign key constraint fails`.
5. **Uji Primary Key Violation:** Percobaan insert siswa dengan `nis = '2425001'` yang sudah ada berhasil DITOLAK dengan pesan error `ERROR 1062: Duplicate entry '2425001' for key 'PRIMARY'`.
6. **Uji Unique Key Violation:** Percobaan insert kode jurusan `'PPLG'` yang sudah ada berhasil DITOLAK dengan pesan error `ERROR 1062: Duplicate entry 'PPLG' for key 'uq_kode_jurusan'`.
7. **Uji Query Multitabel (JOIN):** Berhasil menyatukan tabel siswa, kelas, jurusan, mata pelajaran, dan nilai tanpa duplikasi data.
8. **Uji Fungsi Agregasi:** Menghitung total nilai (40 baris), nilai rata-rata sekolah (83.21), nilai minimum (67.67), dan nilai maksimum (95.00) dengan akurasi 100%.
9. **Uji Trigger Audit Trail:** Saat nilai akhir diupdate, trigger `trg_log_nilai` secara otomatis mencatat nilai lama, nilai baru, dan waktu modifikasi ke tabel `log_perubahan_nilai`.

---

## 13. KESIMPULAN & REFLEKSI

Proyek Sistem Informasi Akademik SMK Negeri 2 Magelang telah dirancang dan diimplementasikan secara komprehensif, memenuhi standar industri perangkat lunak dan kurikulum kejuruan PPLG. Normalisasi hingga 3NF menjamin integritas data tanpa redundansi, serta query reporting menyajikan informasi akademik yang cepat dan akurat.

---

## 14. JAWABAN 10 PERTANYAAN REFLEKSI (BAGIAN P)

1. **Mengapa database perlu dinormalisasi?**
   Untuk menghilangkan redundansi data, menghemat ruang penyimpanan, dan mencegah tiga jenis anomali data: insertion anomaly, update anomaly, dan deletion anomaly.

2. **Apa akibatnya jika database tidak memiliki Primary Key?**
   Data baris tidak memiliki identitas unik, sehingga rawan terjadi duplikasi rekaman data yang identik, perintah UPDATE/DELETE berisiko merusak baris yang salah, dan relasi Foreign Key tidak dapat dibangun.

3. **Apa fungsi Foreign Key dalam sistem akademik?**
   Menjaga integritas referensial antar tabel sehingga tidak ada data 'orphan' (misal: nilai untuk siswa yang tidak terdaftar, atau jadwal untuk guru fiktif).

4. **Mengapa data guru dan siswa sebaiknya disimpan pada tabel yang berbeda?**
   Karena keduanya memiliki atribut dan fungsi operasional yang berbeda. Guru memiliki NIP dan jadwal mengajar, siswa memiliki NIS dan rapor nilai. Menggabungkannya akan menimbulkan banyak nilai null dan melanggar prinsip desain entitas bersih.

5. **Apa keuntungan menggunakan JOIN?**
   Memungkinkan penggabungan data dari beberapa tabel ternormalisasi secara dinamis pada saat query dijalankan tanpa perlu menduplikasi data secara fisik di dalam satu tabel besar.

6. **Apa kesulitan terbesar yang kelompok kalian hadapi?**
   Menyusun relasi multitabel jadwal dan nilai yang melibatkan 4-5 entitas master sekaligus serta merancang trigger audit log perubahan nilai yang presisi.

7. **Bagaimana cara kelompok kalian memastikan database tidak menghasilkan data inkonsisten?**
   Dengan menerapkan multi-layer integrity: Domain Integrity (tipe data, NOT NULL, ENUM), Entity Integrity (Primary Key, Auto Increment), Referential Integrity (Foreign Key ON UPDATE CASCADE ON DELETE RESTRICT/CASCADE), Unique Constraint, serta Trigger audit trail.

8. **Fitur apa yang akan ditambahkan jika dikembangkan jadi aplikasi sungguhan?**
   Modul Manajemen Karakter/BK, Modul Pembayaran SPP Online (Payment Gateway), Modul Monitoring PKL/Magang Industri SMK, dan Notifikasi WhatsApp Gateway ke Orang Tua Siswa.

9. **Bagaimana database ini membantu sekolah dalam pengelolaan data akademik?**
   Menyediakan 'Single Source of Truth', mempercepat penerbitan rapor siswa, mempermudah evaluasi ketuntasan KKM siswa remedial, serta menjamin transparansi perubahan nilai.

10. **Apa hal terpenting yang dipelajari dari proyek ini?**
    Merancang basis data relasional menuntut pemahaman proses bisnis secara nyata, ketelitian dalam normalisasi data matematis, dan penerapan constraint yang disiplin demi menghasilkan sistem yang andal.
