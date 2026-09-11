# PANDUAN & MATERI SLIDE PRESENTASI (10 - 15 MENIT)
# SISTEM INFORMASI AKADEMIK (SIA) SMK NEGERI 2 MAGELANG

---

## SLIDE 1: JUDUL & IDENTITAS KELOMPOK (Alokasi: 1 Menit)
- **Judul Proyek:** Perancangan & Implementasi Basis Data Relasional Sistem Informasi Akademik (SIA) SMKN 2 Magelang
- **Mata Pelajaran:** Basis Data & Web Development
- **Konsentrasi Keahlian:** Pengembangan Perangkat Lunak dan Gim (PPLG)
- **Anggota Kelompok:**
  1. Muflih Rafileseppa (Ketua / System Analyst & DB Architect)
  2. Anggota 2 (Database Designer & Normalisasi)
  3. Anggota 3 (Implementasi DDL & Constraint)
  4. Anggota 4 (Implementasi DML, Query SQL & Testing)

---

## SLIDE 2: PERMASALAHAN & LATAR BELAKANG (Alokasi: 1.5 Menit)
- **Konteks:** Volume data akademik SMKN 2 Magelang sangat dinamis (siswa, guru, jurusan, jadwal, nilai rapor).
- **Masalah Utama:**
  - Redundansi data pada pencatatan manual/spreadsheet.
  - Inkonsistensi data ketika terjadi perubahan nilai atau jadwal.
  - Lambatnya penerbitan rekapitulasi rapor dan identifikasi siswa remedial (di bawah KKM).
- **Solusi:** Membangun database relasional terintegrasi dengan standar Third Normal Form (3NF), integritas referensial ketat, dan view otomatis.

---

## SLIDE 3: ANALISIS KEBUTUHAN SISTEM (Alokasi: 1.5 Menit)
- **4 Pengguna Sistem (RBAC):**
  1. *Admin:* Mengelola master data, akun, jadwal KBM, dan tahun ajaran.
  2. *Guru:* Melihat jadwal mengajar, menginput nilai (Tugas, UTS, UAS), dan mencatat absensi.
  3. *Siswa:* Melihat profil, jadwal belajar per kelas, dan mengecek rapor nilai pribadi (status KKM).
  4. *Kepala Sekolah:* Monitoring grafik capaian akademik, kelulusan KKM, dan menerbitkan evaluasi.
- **Informasi yang Dihasilkan:** Rapor semesteran, peringkat Top 5 siswa, distribusi siswa per jurusan, rekapitulasi nilai per mapel, dan audit log perubahan nilai.

---

## SLIDE 4: ENTITY RELATIONSHIP DIAGRAM / ERD (Alokasi: 2 Menit)
- **Total Entitas:** 12 Entitas (Jurusan, Kelas, Guru, Siswa, Mata Pelajaran, Tahun Ajaran, Jadwal, Nilai, Log Perubahan Nilai, Users, Catatan Evaluasi, Absensi).
- **Kardinalitas Relasi Kunci:**
  - `JURUSAN` (1 : N) `KELAS` (1 : N) `SISWA`
  - `GURU` (1 : N) `JADWAL`
  - `KELAS` (1 : N) `JADWAL`
  - `MATA_PELAJARAN` (1 : N) `JADWAL`
  - `SISWA` (1 : N) `NILAI`
  - `NILAI` (1 : N) `LOG_PERUBAHAN_NILAI`

---

## SLIDE 5: NORMALISASI DATA HINGGA 3NF (Alokasi: 2 Menit)
- **Bentuk UNF:** Seluruh atribut dicatat dalam 1 tabel tak beraturan dengan repeating group nilai.
- **Transformasi ke 1NF:** Menghilangkan repeating group, nilai atribut atomik, kunci komposit `(nis, kode_mapel, tahun, semester)`.
- **Transformasi ke 2NF:** Menghilangkan Partial Dependency (memisahkan tabel master Siswa, Guru, Mapel).
- **Transformasi ke 3NF:** Menghilangkan Transitive Dependency (`nis` -> `kelas` -> `jurusan`), memisahkan tabel Jurusan dari Kelas.
- **Keuntungan 3NF:** Bebas dari anomali insert, update, dan delete.

---

## SLIDE 6: IMPLEMENTASI DDL & CONSTRAINTS (Alokasi: 1.5 Menit)
- **Engine Database:** MySQL / MariaDB (InnoDB).
- **Penerapan Aturan Integritas:**
  - `PRIMARY KEY` & `AUTO_INCREMENT` pada seluruh entitas master.
  - `FOREIGN KEY` dengan aksi `ON UPDATE CASCADE` dan `ON DELETE RESTRICT/CASCADE`.
  - `UNIQUE KEY` pada NIP Guru, NIS Siswa, Kode Jurusan, dan Kode Mapel.
  - Demonstrasi `ALTER TABLE` dan `DROP TABLE`.

---

## SLIDE 7: IMPLEMENTASI DML & VOLUME DATA (Alokasi: 1 Menit)
- Seluruh data dummy riil melampaui batas minimal persyaratan:
  - 25 Data Siswa (min. 20)
  - 6 Data Guru (min. 5)
  - 5 Data Jurusan (min. 5)
  - 6 Data Kelas (min. 6)
  - 12 Data Mata Pelajaran (min. 10)
  - 2 Data Tahun Ajaran (min. 2)
  - 18 Data Jadwal Pelajaran (min. 15)
  - 40 Data Nilai (min. 30)

---

## SLIDE 8: DEMO QUERY SQL WAJIB & RELASI (Alokasi: 2 Menit)
- **Query Relasi 4 Tabel:** Menampilkan nama siswa, kelas, jurusan, mata pelajaran, dan nilai akhir.
- **Query Kondisi KKM:** Memfilter siswa yang nilai akhirnya di bawah KKM untuk penanganan remedial.
- **Query Agregasi:** Menghitung rata-rata nilai per mata pelajaran dan siswa peraih nilai tertinggi.

---

## SLIDE 9: DEMO QUERY HOTS (HIGH ORDER THINKING SKILLS) (Alokasi: 2 Menit)
- **Kasus 1:** Menampilkan 5 Siswa dengan nilai rata-rata tertinggi (Top 5 Ranking Sekolah).
- **Kasus 2:** Mendeteksi mata pelajaran dengan rata-rata nilai terendah untuk evaluasi kurikulum guru.
- **Kasus 3:** Rekapitulasi distribusi jumlah rombel dan total siswa per konsentrasi keahlian.
- **Kasus 4:** Mendeteksi beban kerja guru yang mengajar di lebih dari satu rombel kelas (`HAVING COUNT > 1`).
- **Kasus 5:** Mendeteksi siswa yang tidak tuntas KKM pada lebih dari satu mata pelajaran untuk pembinaan intensif BK/Wali Kelas.

---

## SLIDE 10: HASIL PENGUJIAN & FITUR ADVANCED (Alokasi: 1.5 Menit)
- **Pengujian Constraints:** Berhasil membuktikan penolakan otomatis database saat terjadi pelanggaran Foreign Key (Error 1452) dan Primary Key duplikat (Error 1062).
- **Fitur Lanjutan:**
  - Stored Procedure: `sp_hitung_nilai_akhir` otomatis.
  - Trigger: `trg_log_nilai` yang mencatat riwayat perubahan nilai ke tabel audit secara instan.
  - View: `view_rapor_siswa` memformat rapor belajar siswa secara real-time.

---

## SLIDE 11: KESIMPULAN & SESI TANYA JAWAB (Alokasi: 1 Menit)
- **Kesimpulan:** Database SIA SMKN 2 Magelang siap digunakan, terstruktur rapi, aman, dan menyajikan informasi akademik akurat.
- **Penutup:** "Terima kasih atas perhatian Bapak/Ibu Guru Penguji dan rekan-rekan sekalian. Kami membuka sesi tanya jawab."
