-- =============================================================================
-- SISTEM INFORMASI AKADEMIK (SIA) SMK NEGERI 2 MAGELANG
-- Database Engine : MariaDB / MySQL
-- Collation       : utf8mb4_unicode_ci
-- Dibuat untuk    : Tugas Proyek Basis Data & Web SIA SMKN 2 Magelang
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `db_sia_smkn2_magelang` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `db_sia_smkn2_magelang`;

-- -----------------------------------------------------------------------------
-- BAGIAN G: IMPLEMENTASI DDL (Data Definition Language)
-- Menggunakan DROP TABLE, CREATE TABLE, ALTER TABLE, serta constraint lengkap:
-- PRIMARY KEY, FOREIGN KEY, NOT NULL, UNIQUE, DEFAULT, AUTO_INCREMENT
-- -----------------------------------------------------------------------------

-- 1. Tabel Jurusan
DROP TABLE IF EXISTS `absensi`;
DROP TABLE IF EXISTS `catatan_evaluasi`;
DROP TABLE IF EXISTS `log_perubahan_nilai`;
DROP TABLE IF EXISTS `nilai`;
DROP TABLE IF EXISTS `jadwal`;
DROP TABLE IF EXISTS `siswa`;
DROP TABLE IF EXISTS `mata_pelajaran`;
DROP TABLE IF EXISTS `kelas`;
DROP TABLE IF EXISTS `jurusan`;
DROP TABLE IF EXISTS `guru`;
DROP TABLE IF EXISTS `tahun_ajaran`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `jurusan` (
  `id_jurusan` INT NOT NULL AUTO_INCREMENT,
  `kode_jurusan` VARCHAR(10) NOT NULL,
  `nama_jurusan` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id_jurusan`),
  UNIQUE KEY `uq_kode_jurusan` (`kode_jurusan`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabel Kelas
CREATE TABLE `kelas` (
  `id_kelas` INT NOT NULL AUTO_INCREMENT,
  `nama_kelas` VARCHAR(20) NOT NULL,
  `tingkat` VARCHAR(5) NOT NULL,
  `id_jurusan` INT NOT NULL,
  PRIMARY KEY (`id_kelas`),
  KEY `fk_kelas_jurusan` (`id_jurusan`),
  CONSTRAINT `fk_kelas_jurusan` FOREIGN KEY (`id_jurusan`) REFERENCES `jurusan` (`id_jurusan`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabel Guru
CREATE TABLE `guru` (
  `id_guru` INT NOT NULL AUTO_INCREMENT,
  `nip` VARCHAR(20) NOT NULL,
  `nama_guru` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `no_hp` VARCHAR(20) DEFAULT NULL,
  PRIMARY KEY (`id_guru`),
  UNIQUE KEY `uq_guru_nip` (`nip`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabel Siswa
CREATE TABLE `siswa` (
  `nis` VARCHAR(15) NOT NULL,
  `nama_siswa` VARCHAR(100) NOT NULL,
  `jenis_kelamin` ENUM('L','P') NOT NULL,
  `tanggal_lahir` DATE NOT NULL,
  `alamat` TEXT DEFAULT NULL,
  `id_kelas` INT NOT NULL,
  PRIMARY KEY (`nis`),
  KEY `fk_siswa_kelas` (`id_kelas`),
  CONSTRAINT `fk_siswa_kelas` FOREIGN KEY (`id_kelas`) REFERENCES `kelas` (`id_kelas`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabel Mata Pelajaran
CREATE TABLE `mata_pelajaran` (
  `id_mapel` INT NOT NULL AUTO_INCREMENT,
  `kode_mapel` VARCHAR(10) NOT NULL,
  `nama_mapel` VARCHAR(100) NOT NULL,
  `kelompok` ENUM('Muatan Nasional','Muatan Kewilayahan','Produktif') NOT NULL DEFAULT 'Produktif',
  `kkm` DECIMAL(5,2) NOT NULL DEFAULT 75.00,
  PRIMARY KEY (`id_mapel`),
  UNIQUE KEY `uq_kode_mapel` (`kode_mapel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabel Tahun Ajaran
CREATE TABLE `tahun_ajaran` (
  `id_tahun_ajaran` INT NOT NULL AUTO_INCREMENT,
  `tahun_ajaran` VARCHAR(10) NOT NULL,
  `semester` ENUM('Ganjil','Genap') NOT NULL,
  `status` ENUM('Aktif','Tidak Aktif') NOT NULL DEFAULT 'Tidak Aktif',
  PRIMARY KEY (`id_tahun_ajaran`),
  UNIQUE KEY `uq_tahun_semester` (`tahun_ajaran`, `semester`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Tabel Jadwal Pelajaran
CREATE TABLE `jadwal` (
  `id_jadwal` INT NOT NULL AUTO_INCREMENT,
  `id_guru` INT NOT NULL,
  `id_mapel` INT NOT NULL,
  `id_kelas` INT NOT NULL,
  `hari` ENUM('Senin','Selasa','Rabu','Kamis','Jumat') NOT NULL,
  `jam_mulai` TIME NOT NULL,
  `jam_selesai` TIME NOT NULL,
  `ruang` VARCHAR(20) DEFAULT NULL,
  PRIMARY KEY (`id_jadwal`),
  KEY `fk_jadwal_guru` (`id_guru`),
  KEY `fk_jadwal_mapel` (`id_mapel`),
  KEY `fk_jadwal_kelas` (`id_kelas`),
  CONSTRAINT `fk_jadwal_guru` FOREIGN KEY (`id_guru`) REFERENCES `guru` (`id_guru`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_jadwal_mapel` FOREIGN KEY (`id_mapel`) REFERENCES `mata_pelajaran` (`id_mapel`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_jadwal_kelas` FOREIGN KEY (`id_kelas`) REFERENCES `kelas` (`id_kelas`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Tabel Nilai
CREATE TABLE `nilai` (
  `id_nilai` INT NOT NULL AUTO_INCREMENT,
  `nis` VARCHAR(15) NOT NULL,
  `id_mapel` INT NOT NULL,
  `id_guru` INT NOT NULL,
  `id_tahun_ajaran` INT NOT NULL,
  `nilai_tugas` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `nilai_uts` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `nilai_uas` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `nilai_akhir` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id_nilai`),
  UNIQUE KEY `uq_nilai_siswa_mapel_tahun` (`nis`, `id_mapel`, `id_tahun_ajaran`),
  KEY `fk_nilai_siswa` (`nis`),
  KEY `fk_nilai_mapel` (`id_mapel`),
  KEY `fk_nilai_guru` (`id_guru`),
  KEY `fk_nilai_tahun` (`id_tahun_ajaran`),
  CONSTRAINT `fk_nilai_siswa` FOREIGN KEY (`nis`) REFERENCES `siswa` (`nis`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_nilai_mapel` FOREIGN KEY (`id_mapel`) REFERENCES `mata_pelajaran` (`id_mapel`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_nilai_guru` FOREIGN KEY (`id_guru`) REFERENCES `guru` (`id_guru`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_nilai_tahun` FOREIGN KEY (`id_tahun_ajaran`) REFERENCES `tahun_ajaran` (`id_tahun_ajaran`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Tabel Log Perubahan Nilai (Fitur Audit Trail / Trigger)
CREATE TABLE `log_perubahan_nilai` (
  `id_log` INT NOT NULL AUTO_INCREMENT,
  `id_nilai` INT NOT NULL,
  `nilai_lama` DECIMAL(5,2) DEFAULT NULL,
  `nilai_baru` DECIMAL(5,2) DEFAULT NULL,
  `waktu_diubah` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_log`),
  KEY `fk_log_nilai` (`id_nilai`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Tabel Users (RBAC)
CREATE TABLE `users` (
  `id_user` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin','guru','kepala_sekolah','siswa') NOT NULL,
  `id_referensi` VARCHAR(20) DEFAULT NULL,
  `status` ENUM('aktif','nonaktif') NOT NULL DEFAULT 'aktif',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_user`),
  UNIQUE KEY `uq_username` (`username`),
  KEY `idx_users_role_ref` (`role`, `id_referensi`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Tabel Catatan Evaluasi Kepsek
CREATE TABLE `catatan_evaluasi` (
  `id_evaluasi` INT NOT NULL AUTO_INCREMENT,
  `judul` VARCHAR(150) NOT NULL,
  `isi` TEXT NOT NULL,
  `id_tahun_ajaran` INT DEFAULT NULL,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_evaluasi`),
  KEY `fk_evaluasi_tahun` (`id_tahun_ajaran`),
  KEY `fk_evaluasi_user` (`created_by`),
  CONSTRAINT `fk_evaluasi_tahun` FOREIGN KEY (`id_tahun_ajaran`) REFERENCES `tahun_ajaran` (`id_tahun_ajaran`) ON DELETE SET NULL,
  CONSTRAINT `fk_evaluasi_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id_user`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Tabel Absensi Siswa
CREATE TABLE `absensi` (
  `id_absen` INT NOT NULL AUTO_INCREMENT,
  `tanggal` DATE NOT NULL,
  `nis` VARCHAR(15) NOT NULL,
  `id_jadwal` INT NOT NULL,
  `status` ENUM('Hadir','Izin','Sakit','Alpa') NOT NULL DEFAULT 'Hadir',
  `keterangan` VARCHAR(255) DEFAULT NULL,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_absen`),
  UNIQUE KEY `uq_absensi_tgl_nis_jadwal` (`tanggal`, `nis`, `id_jadwal`),
  KEY `fk_absensi_siswa` (`nis`),
  KEY `fk_absensi_jadwal` (`id_jadwal`),
  KEY `fk_absensi_guru` (`created_by`),
  CONSTRAINT `fk_absensi_siswa` FOREIGN KEY (`nis`) REFERENCES `siswa` (`nis`) ON DELETE CASCADE,
  CONSTRAINT `fk_absensi_jadwal` FOREIGN KEY (`id_jadwal`) REFERENCES `jadwal` (`id_jadwal`) ON DELETE CASCADE,
  CONSTRAINT `fk_absensi_guru` FOREIGN KEY (`created_by`) REFERENCES `users` (`id_user`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Demonstrasi ALTER TABLE (Sesuai Syarat Tahap G)
ALTER TABLE `mata_pelajaran` ADD COLUMN `deskripsi` VARCHAR(255) NULL AFTER `nama_mapel`;
ALTER TABLE `mata_pelajaran` DROP COLUMN `deskripsi`;

-- Trigger: Audit Perubahan Nilai
DELIMITER $$
DROP TRIGGER IF EXISTS `trg_log_nilai`$$
CREATE TRIGGER `trg_log_nilai` AFTER UPDATE ON `nilai`
FOR EACH ROW
BEGIN
    IF OLD.nilai_akhir <> NEW.nilai_akhir THEN
        INSERT INTO log_perubahan_nilai (id_nilai, nilai_lama, nilai_baru, waktu_diubah)
        VALUES (NEW.id_nilai, OLD.nilai_akhir, NEW.nilai_akhir, NOW());
    END IF;
END$$

-- Stored Procedure: Perhitungan Nilai Akhir
DROP PROCEDURE IF EXISTS `sp_hitung_nilai_akhir`$$
CREATE PROCEDURE `sp_hitung_nilai_akhir` (
    IN `p_nis` VARCHAR(15),
    IN `p_id_mapel` INT,
    IN `p_id_tahun_ajaran` INT
)
BEGIN
    UPDATE nilai
    SET nilai_akhir = ROUND((nilai_tugas + nilai_uts + nilai_uas) / 3, 2)
    WHERE nis = p_nis
      AND id_mapel = p_id_mapel
      AND id_tahun_ajaran = p_id_tahun_ajaran;
END$$
DELIMITER ;

-- View: Rapor Siswa Lengkap dengan Ketuntasan KKM
DROP VIEW IF EXISTS `view_rapor_siswa`;
CREATE VIEW `view_rapor_siswa` AS
SELECT 
    n.id_nilai,
    s.nis,
    s.nama_siswa,
    k.nama_kelas,
    j.nama_jurusan,
    mp.nama_mapel,
    mp.kelompok,
    mp.kkm,
    g.nama_guru,
    ta.tahun_ajaran,
    ta.semester,
    n.nilai_tugas,
    n.nilai_uts,
    n.nilai_uas,
    n.nilai_akhir,
    CASE 
        WHEN n.nilai_akhir >= mp.kkm THEN 'Tuntas'
        ELSE 'Belum Tuntas'
    END AS status_ketuntasan
FROM nilai n
JOIN siswa s ON n.nis = s.nis
JOIN kelas k ON s.id_kelas = k.id_kelas
JOIN jurusan j ON k.id_jurusan = j.id_jurusan
JOIN mata_pelajaran mp ON n.id_mapel = mp.id_mapel
JOIN guru g ON n.id_guru = g.id_guru
JOIN tahun_ajaran ta ON n.id_tahun_ajaran = ta.id_tahun_ajaran;

-- -----------------------------------------------------------------------------
-- BAGIAN H: IMPLEMENTASI DML (Data Manipulation Language)
-- Memasukkan data awal yang memenuhi batas minimal:
-- 5 Jurusan, 6 Kelas, 6 Guru, 25 Siswa, 12 Mata Pelajaran, 2 Tahun Ajaran,
-- 18 Jadwal Pelajaran, 40 Data Nilai
-- -----------------------------------------------------------------------------

-- 1. Data Jurusan (5 Data)
INSERT INTO `jurusan` (`id_jurusan`, `kode_jurusan`, `nama_jurusan`) VALUES
(1, 'PPLG', 'Pengembangan Perangkat Lunak dan Gim'),
(2, 'TKJ', 'Teknik Komputer dan Jaringan'),
(3, 'AKL', 'Akuntansi dan Keuangan Lembaga'),
(4, 'MPLB', 'Manajemen Perkantoran dan Layanan Bisnis'),
(5, 'PM', 'Pemasaran');

-- 2. Data Kelas (6 Data)
INSERT INTO `kelas` (`id_kelas`, `nama_kelas`, `tingkat`, `id_jurusan`) VALUES
(1, 'X PPLG 1', 'X', 1),
(2, 'X PPLG 2', 'X', 1),
(3, 'XI PPLG 1', 'XI', 1),
(4, 'XII PPLG 1', 'XII', 1),
(5, 'X TKJ 1', 'X', 2),
(6, 'XI TKJ 1', 'XI', 2);

-- 3. Data Guru (6 Data)
INSERT INTO `guru` (`id_guru`, `nip`, `nama_guru`, `email`, `no_hp`) VALUES
(1, '198501012010011001', 'Budi Santoso, S.Kom', 'budi.santoso@smkn2magelang.sch.id', '081234567801'),
(2, '198602022011022002', 'Siti Rahayu, S.Pd', 'siti.rahayu@smkn2magelang.sch.id', '081234567802'),
(3, '198703032012011003', 'Ahmad Fauzi, M.Kom', 'ahmad.fauzi@smkn2magelang.sch.id', '081234567803'),
(4, '198804042013022004', 'Dewi Lestari, S.Pd', 'dewi.lestari@smkn2magelang.sch.id', '081234567804'),
(5, '198905052014011005', 'Eko Prasetyo, S.T', 'eko.prasetyo@smkn2magelang.sch.id', '081234567805'),
(6, '199006062015012006', 'Rina Marlina, M.Pd', 'rina.marlina@smkn2magelang.sch.id', '081234567806');

-- 4. Data Siswa (25 Data Lengkap)
INSERT INTO `siswa` (`nis`, `nama_siswa`, `jenis_kelamin`, `tanggal_lahir`, `alamat`, `id_kelas`) VALUES
('2425001', 'Ahmad Rizky Pratama', 'L', '2008-03-15', 'Jl. Pahlawan No. 12, Magelang', 1),
('2425002', 'Bunga Citra Lestari', 'P', '2008-07-22', 'Jl. Pemuda No. 45, Magelang', 1),
('2425003', 'Candra Wijaya', 'L', '2008-01-10', 'Jl. Tidar No. 8, Magelang', 1),
('2425004', 'Dina Maulida', 'P', '2008-11-05', 'Jl. Gatot Subroto No. 30, Magelang', 1),
('2425005', 'Fajar Ramadhan', 'L', '2008-09-18', 'Jl. Sudirman No. 99, Magelang', 2),
('2425006', 'Gita Permata', 'P', '2008-04-25', 'Jl. Tentara Pelajar No. 15, Magelang', 2),
('2425007', 'Hendra Saputra', 'L', '2008-12-01', 'Jl. Mayor Unus No. 50, Magelang', 2),
('2425008', 'Indah Pratiwi', 'P', '2008-06-14', 'Jl. Danau Singkarak No. 4, Magelang', 2),
('2425009', 'Joko Susilo', 'L', '2007-02-19', 'Jl. Menoreh Raya No. 22, Magelang', 3),
('2425010', 'Kartika Sari', 'P', '2007-08-30', 'Jl. Beringin I No. 11, Magelang', 3),
('2425011', 'Lukman Hakim', 'L', '2007-05-12', 'Jl. Cempaka No. 60, Magelang', 3),
('2425012', 'Mega Utami', 'P', '2007-10-03', 'Jl. Mawar No. 7, Magelang', 3),
('2425013', 'Nanda Pratama', 'L', '2006-03-27', 'Jl. Kenanga No. 18, Magelang', 4),
('2425014', 'Olivia Zahrani', 'P', '2006-07-16', 'Jl. Dahlia No. 29, Magelang', 4),
('2425015', 'Panji Gumilang', 'L', '2006-09-09', 'Jl. Melati No. 81, Magelang', 4),
('2425016', 'Qori Anggraini', 'P', '2006-12-21', 'Jl. Anggrek No. 3, Magelang', 4),
('2425017', 'Rizky Kurniawan', 'L', '2008-01-28', 'Jl. Diponegoro No. 70, Magelang', 5),
('2425018', 'Salma Aurelia', 'P', '2008-05-17', 'Jl. Veteran No. 14, Magelang', 5),
('2425019', 'Taufik Hidayat', 'L', '2008-10-11', 'Jl. Senopati No. 40, Magelang', 5),
('2425020', 'Umar Al-Faruq', 'L', '2008-08-02', 'Jl. Kyai Mojo No. 88, Magelang', 5),
('2425021', 'Vivi Alawiyah', 'P', '2007-04-09', 'Jl. Sunan Kalijaga No. 19, Magelang', 6),
('2425022', 'Wahyu Setiawan', 'L', '2007-11-23', 'Jl. Sunan Muria No. 55, Magelang', 6),
('2425023', 'Xena Gabriella', 'P', '2007-06-07', 'Jl. Borobudur Km. 3, Magelang', 6),
('2425024', 'Yusuf Maulana', 'L', '2007-09-14', 'Jl. Magelang-Yogya Km. 5, Magelang', 6),
('2425025', 'Zahra Amalia', 'P', '2007-02-05', 'Jl. Kaliurang No. 10, Magelang', 6);

-- 5. Data Mata Pelajaran (12 Data)
INSERT INTO `mata_pelajaran` (`id_mapel`, `kode_mapel`, `nama_mapel`, `kelompok`, `kkm`) VALUES
(1, 'MP001', 'Pemrograman Berorientasi Objek', 'Produktif', 75.00),
(2, 'MP002', 'Basis Data', 'Produktif', 75.00),
(3, 'MP003', 'Pemrograman Web dan Perangkat Bergerak', 'Produktif', 78.00),
(4, 'MP004', 'Pemodelan Perangkat Lunak', 'Produktif', 75.00),
(5, 'MP005', 'Administrasi Infrastruktur Jaringan', 'Produktif', 75.00),
(6, 'MP006', 'Teknologi Layanan Jaringan', 'Produktif', 75.00),
(7, 'MP007', 'Matematika', 'Muatan Nasional', 75.00),
(8, 'MP008', 'Bahasa Indonesia', 'Muatan Nasional', 78.00),
(9, 'MP009', 'Bahasa Inggris', 'Muatan Nasional', 75.00),
(10, 'MP010', 'Pendidikan Agama dan Budi Pekerti', 'Muatan Nasional', 80.00),
(11, 'MP011', 'Pendidikan Pancasila dan Kewarganegaraan', 'Muatan Nasional', 78.00),
(12, 'MP012', 'Projek Kreatif dan Kewirausahaan', 'Produktif', 75.00);

-- 6. Data Tahun Ajaran (2 Data)
INSERT INTO `tahun_ajaran` (`id_tahun_ajaran`, `tahun_ajaran`, `semester`, `status`) VALUES
(1, '2025/2026', 'Ganjil', 'Aktif'),
(2, '2025/2026', 'Genap', 'Tidak Aktif');

-- 7. Data Jadwal Pelajaran (18 Data)
INSERT INTO `jadwal` (`id_jadwal`, `id_guru`, `id_mapel`, `id_kelas`, `hari`, `jam_mulai`, `jam_selesai`, `ruang`) VALUES
(1, 1, 1, 1, 'Senin', '07:00:00', '09:15:00', 'Lab RPL 1'),
(2, 2, 2, 1, 'Senin', '09:30:00', '11:45:00', 'Lab RPL 1'),
(3, 4, 7, 1, 'Selasa', '07:00:00', '08:30:00', 'R. X-PPLG-1'),
(4, 6, 8, 1, 'Rabu', '07:00:00', '08:30:00', 'R. X-PPLG-1'),
(5, 1, 1, 2, 'Selasa', '07:00:00', '09:15:00', 'Lab RPL 2'),
(6, 2, 2, 2, 'Selasa', '09:30:00', '11:45:00', 'Lab RPL 2'),
(7, 4, 7, 2, 'Rabu', '08:30:00', '10:00:00', 'R. X-PPLG-2'),
(8, 6, 8, 2, 'Kamis', '07:00:00', '08:30:00', 'R. X-PPLG-2'),
(9, 3, 3, 3, 'Senin', '07:00:00', '10:00:00', 'Lab RPL 3'),
(10, 2, 2, 3, 'Rabu', '07:00:00', '09:15:00', 'Lab RPL 3'),
(11, 4, 7, 3, 'Kamis', '09:30:00', '11:45:00', 'R. XI-PPLG-1'),
(12, 1, 4, 4, 'Senin', '10:00:00', '12:15:00', 'Lab RPL 2'),
(13, 3, 12, 4, 'Jumat', '07:00:00', '10:30:00', 'Lab RPL 1'),
(14, 5, 5, 5, 'Senin', '07:00:00', '09:15:00', 'Lab TKJ 1'),
(15, 5, 6, 5, 'Rabu', '09:30:00', '11:45:00', 'Lab TKJ 1'),
(16, 4, 7, 5, 'Kamis', '07:00:00', '08:30:00', 'R. X-TKJ-1'),
(17, 5, 5, 6, 'Selasa', '07:00:00', '09:15:00', 'Lab TKJ 2'),
(18, 5, 6, 6, 'Kamis', '09:30:00', '11:45:00', 'Lab TKJ 2');

-- 8. Data Nilai Siswa (40 Data Lengkap)
INSERT INTO `nilai` (`id_nilai`, `nis`, `id_mapel`, `id_guru`, `id_tahun_ajaran`, `nilai_tugas`, `nilai_uts`, `nilai_uas`, `nilai_akhir`) VALUES
(1, '2425001', 1, 1, 1, 85.00, 80.00, 88.00, 84.33),
(2, '2425001', 2, 2, 1, 90.00, 85.00, 86.00, 87.00),
(3, '2425001', 7, 4, 1, 78.00, 75.00, 80.00, 77.67),
(4, '2425001', 8, 6, 1, 88.00, 85.00, 90.00, 87.67),
(5, '2425002', 1, 1, 1, 78.00, 72.00, 75.00, 75.00),
(6, '2425002', 2, 2, 1, 80.00, 78.00, 82.00, 80.00),
(7, '2425002', 7, 4, 1, 70.00, 68.00, 72.00, 70.00), -- Di bawah KKM 75
(8, '2425002', 8, 6, 1, 82.00, 80.00, 85.00, 82.33),
(9, '2425003', 1, 1, 1, 92.00, 90.00, 95.00, 92.33),
(10, '2425003', 2, 2, 1, 88.00, 85.00, 90.00, 87.67),
(11, '2425003', 7, 4, 1, 85.00, 88.00, 92.00, 88.33),
(12, '2425004', 1, 1, 1, 75.00, 70.00, 72.00, 72.33), -- Di bawah KKM 75
(13, '2425004', 2, 2, 1, 74.00, 72.00, 70.00, 72.00), -- Di bawah KKM 75 (HOTS kasus 5)
(14, '2425005', 1, 1, 1, 80.00, 82.00, 85.00, 82.33),
(15, '2425005', 2, 2, 1, 85.00, 80.00, 86.00, 83.67),
(16, '2425006', 1, 1, 1, 88.00, 85.00, 90.00, 87.67),
(17, '2425006', 7, 4, 1, 90.00, 92.00, 94.00, 92.00),
(18, '2425007', 1, 1, 1, 70.00, 65.00, 68.00, 67.67), -- Di bawah KKM 75
(19, '2425007', 2, 2, 1, 72.00, 68.00, 70.00, 70.00), -- Di bawah KKM 75 (HOTS kasus 5)
(20, '2425008', 1, 1, 1, 95.00, 94.00, 96.00, 95.00),
(21, '2425008', 2, 2, 1, 92.00, 90.00, 93.00, 91.67),
(22, '2425009', 3, 3, 1, 86.00, 85.00, 89.00, 86.67),
(23, '2425009', 2, 2, 1, 88.00, 84.00, 90.00, 87.33),
(24, '2425009', 7, 4, 1, 82.00, 80.00, 85.00, 82.33),
(25, '2425010', 3, 3, 1, 90.00, 92.00, 95.00, 92.33),
(26, '2425010', 2, 2, 1, 85.00, 88.00, 90.00, 87.67),
(27, '2425011', 3, 3, 1, 74.00, 70.00, 72.00, 72.00), -- Di bawah KKM 78
(28, '2425012', 3, 3, 1, 92.00, 94.00, 96.00, 94.00),
(29, '2425013', 4, 1, 1, 85.00, 88.00, 90.00, 87.67),
(30, '2425013', 12, 3, 1, 90.00, 92.00, 94.00, 92.00),
(31, '2425014', 4, 1, 1, 80.00, 82.00, 85.00, 82.33),
(32, '2425015', 4, 1, 1, 78.00, 75.00, 80.00, 77.67),
(33, '2425016', 12, 3, 1, 88.00, 90.00, 92.00, 90.00),
(34, '2425017', 5, 5, 1, 84.00, 82.00, 86.00, 84.00),
(35, '2425017', 6, 5, 1, 82.00, 80.00, 85.00, 82.33),
(36, '2425018', 5, 5, 1, 79.00, 75.00, 80.00, 78.00),
(37, '2425019', 5, 5, 1, 72.00, 68.00, 70.00, 70.00), -- Di bawah KKM 75
(38, '2425020', 6, 5, 1, 88.00, 85.00, 90.00, 87.67),
(39, '2425021', 5, 5, 1, 85.00, 88.00, 90.00, 87.67),
(40, '2425022', 5, 5, 1, 76.00, 74.00, 78.00, 76.00);

-- 9. Data Akun Pengguna / Users (Password seluruh user: 'password')
INSERT INTO `users` (`username`, `password`, `role`, `id_referensi`, `status`) VALUES
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', NULL, 'aktif'),
('budi', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'guru', '1', 'aktif'),
('siti', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'guru', '2', 'aktif'),
('ahmad', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'guru', '3', 'aktif'),
('dewi', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'guru', '4', 'aktif'),
('eko', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'guru', '5', 'aktif'),
('kepsek', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'kepala_sekolah', NULL, 'aktif'),
('2425001', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'siswa', '2425001', 'aktif'),
('2425002', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'siswa', '2425002', 'aktif'),
('2425003', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'siswa', '2425003', 'aktif'),
('2425004', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'siswa', '2425004', 'aktif'),
('2425005', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'siswa', '2425005', 'aktif');

-- 10. Data Presensi / Absensi (Contoh DML)
INSERT INTO `absensi` (`tanggal`, `nis`, `id_jadwal`, `status`, `keterangan`, `created_by`) VALUES
('2026-09-08', '2425001', 1, 'Hadir', 'Tepat waktu', 2),
('2026-09-08', '2425002', 1, 'Hadir', 'Tepat waktu', 2),
('2026-09-08', '2425003', 1, 'Sakit', 'Surat dokter terlampir', 2),
('2026-09-08', '2425004', 1, 'Izin', 'Kepentingan keluarga', 2);

-- 11. Demonstrasi UPDATE dan DELETE (Sesuai Syarat Tahap H)
UPDATE `siswa` SET `alamat` = 'Jl. Pahlawan No. 12B, Magelang' WHERE `nis` = '2425001';
UPDATE `guru` SET `no_hp` = '081234567899' WHERE `id_guru` = 1;

-- Demonstrasi INSERT sementara lalu DELETE untuk bukti operasional DML
INSERT INTO `jurusan` (`id_jurusan`, `kode_jurusan`, `nama_jurusan`) VALUES (99, 'TEST', 'Jurusan Pengujian Sementara');
DELETE FROM `jurusan` WHERE `id_jurusan` = 99;

-- =============================================================================
-- BAGIAN I: QUERY SQL WAJIB (15 QUERY)
-- =============================================================================

-- 1. Menampilkan seluruh data siswa
-- SELECT * FROM siswa ORDER BY nis ASC;

-- 2. Menampilkan siswa berdasarkan kelas tertentu (misal: kelas id 1 / 'X PPLG 1')
-- SELECT s.nis, s.nama_siswa, s.jenis_kelamin, k.nama_kelas 
-- FROM siswa s 
-- JOIN kelas k ON s.id_kelas = k.id_kelas 
-- WHERE k.nama_kelas = 'X PPLG 1';

-- 3. Menampilkan siswa berdasarkan jurusan tertentu (misal: 'PPLG')
-- SELECT s.nis, s.nama_siswa, k.nama_kelas, j.nama_jurusan 
-- FROM siswa s 
-- JOIN kelas k ON s.id_kelas = k.id_kelas 
-- JOIN jurusan j ON k.id_jurusan = j.id_jurusan 
-- WHERE j.kode_jurusan = 'PPLG';

-- 4. Menampilkan seluruh data guru
-- SELECT * FROM guru ORDER BY id_guru ASC;

-- 5. Menampilkan seluruh mata pelajaran
-- SELECT * FROM mata_pelajaran ORDER BY id_mapel ASC;

-- 6. Menampilkan siswa berjenis kelamin laki-laki
-- SELECT nis, nama_siswa, jenis_kelamin, tanggal_lahir 
-- FROM siswa 
-- WHERE jenis_kelamin = 'L';

-- 7. Menampilkan siswa kelas XI
-- SELECT s.nis, s.nama_siswa, k.nama_kelas, k.tingkat 
-- FROM siswa s 
-- JOIN kelas k ON s.id_kelas = k.id_kelas 
-- WHERE k.tingkat = 'XI';

-- 8. Menampilkan nilai siswa yang lebih besar atau sama dengan 80
-- SELECT s.nis, s.nama_siswa, mp.nama_mapel, n.nilai_akhir 
-- FROM nilai n 
-- JOIN siswa s ON n.nis = s.nis 
-- JOIN mata_pelajaran mp ON n.id_mapel = mp.id_mapel 
-- WHERE n.nilai_akhir >= 80.00;

-- 9. Menampilkan siswa dengan nilai akhir di bawah KKM
-- SELECT s.nis, s.nama_siswa, mp.nama_mapel, mp.kkm, n.nilai_akhir, (mp.kkm - n.nilai_akhir) AS selisih_poin 
-- FROM nilai n 
-- JOIN siswa s ON n.nis = s.nis 
-- JOIN mata_pelajaran mp ON n.id_mapel = mp.id_mapel 
-- WHERE n.nilai_akhir < mp.kkm;

-- 10. Menampilkan nama siswa beserta nama kelas dan jurusannya
-- SELECT s.nis, s.nama_siswa, k.nama_kelas, j.nama_jurusan 
-- FROM siswa s 
-- JOIN kelas k ON s.id_kelas = k.id_kelas 
-- JOIN jurusan j ON k.id_jurusan = j.id_jurusan 
-- ORDER BY k.nama_kelas ASC, s.nama_siswa ASC;

-- 11. Menampilkan jadwal lengkap beserta nama guru, mata pelajaran, dan kelas
-- SELECT jd.hari, jd.jam_mulai, jd.jam_selesai, jd.ruang, k.nama_kelas, mp.nama_mapel, g.nama_guru 
-- FROM jadwal jd 
-- JOIN kelas k ON jd.id_kelas = k.id_kelas 
-- JOIN mata_pelajaran mp ON jd.id_mapel = mp.id_mapel 
-- JOIN guru g ON jd.id_guru = g.id_guru 
-- ORDER BY FIELD(jd.hari, 'Senin','Selasa','Rabu','Kamis','Jumat'), jd.jam_mulai ASC;

-- 12. Menampilkan nilai siswa beserta nama mata pelajaran
-- SELECT s.nis, s.nama_siswa, mp.nama_mapel, n.nilai_tugas, n.nilai_uts, n.nilai_uas, n.nilai_akhir 
-- FROM nilai n 
-- JOIN siswa s ON n.nis = s.nis 
-- JOIN mata_pelajaran mp ON n.id_mapel = mp.id_mapel 
-- ORDER BY s.nis ASC;

-- 13. Menampilkan daftar guru beserta mata pelajaran yang diampu
-- SELECT DISTINCT g.nip, g.nama_guru, mp.kode_mapel, mp.nama_mapel 
-- FROM jadwal jd 
-- JOIN guru g ON jd.id_guru = g.id_guru 
-- JOIN mata_pelajaran mp ON jd.id_mapel = mp.id_mapel 
-- ORDER BY g.nama_guru ASC;

-- 14. Menghitung rata-rata nilai setiap mata pelajaran
-- SELECT mp.kode_mapel, mp.nama_mapel, mp.kkm, COUNT(n.id_nilai) AS jumlah_siswa_dinilai, ROUND(AVG(n.nilai_akhir), 2) AS rata_rata_nilai 
-- FROM mata_pelajaran mp 
-- LEFT JOIN nilai n ON mp.id_mapel = n.id_mapel 
-- GROUP BY mp.id_mapel, mp.kode_mapel, mp.nama_mapel, mp.kkm 
-- ORDER BY rata_rata_nilai DESC;

-- 15. Menampilkan siswa dengan nilai rata-rata tertinggi
-- SELECT s.nis, s.nama_siswa, k.nama_kelas, ROUND(AVG(n.nilai_akhir), 2) AS rata_rata_nilai 
-- FROM nilai n 
-- JOIN siswa s ON n.nis = s.nis 
-- JOIN kelas k ON s.id_kelas = k.id_kelas 
-- GROUP BY s.nis, s.nama_siswa, k.nama_kelas 
-- ORDER BY rata_rata_nilai DESC 
-- LIMIT 1;

-- =============================================================================
-- BAGIAN J: PENGEMBANGAN QUERY HOTS (5 KASUS)
-- =============================================================================

-- Kasus 1: Menampilkan 5 siswa dengan nilai rata-rata tertinggi (Top 5 Ranking)
-- SELECT s.nis, s.nama_siswa, k.nama_kelas, j.nama_jurusan, COUNT(n.id_mapel) AS total_mapel, ROUND(AVG(n.nilai_akhir), 2) AS rerata_akhir 
-- FROM nilai n 
-- JOIN siswa s ON n.nis = s.nis 
-- JOIN kelas k ON s.id_kelas = k.id_kelas 
-- JOIN jurusan j ON k.id_jurusan = j.id_jurusan 
-- GROUP BY s.nis, s.nama_siswa, k.nama_kelas, j.nama_jurusan 
-- ORDER BY rerata_akhir DESC 
-- LIMIT 5;

-- Kasus 2: Menampilkan mata pelajaran dengan rata-rata nilai terendah
-- SELECT mp.id_mapel, mp.kode_mapel, mp.nama_mapel, mp.kkm, ROUND(AVG(n.nilai_akhir), 2) AS rerata_terendah 
-- FROM mata_pelajaran mp 
-- JOIN nilai n ON mp.id_mapel = n.id_mapel 
-- GROUP BY mp.id_mapel, mp.kode_mapel, mp.nama_mapel, mp.kkm 
-- ORDER BY rerata_terendah ASC 
-- LIMIT 1;

-- Kasus 3: Menampilkan jumlah siswa pada setiap jurusan
-- SELECT j.kode_jurusan, j.nama_jurusan, COUNT(DISTINCT k.id_kelas) AS jumlah_kelas, COUNT(s.nis) AS total_siswa 
-- FROM jurusan j 
-- LEFT JOIN kelas k ON j.id_jurusan = k.id_jurusan 
-- LEFT JOIN siswa s ON k.id_kelas = s.id_kelas 
-- GROUP BY j.id_jurusan, j.kode_jurusan, j.nama_jurusan 
-- ORDER BY total_siswa DESC;

-- Kasus 4: Menampilkan guru yang mengajar lebih dari satu kelas
-- SELECT g.id_guru, g.nip, g.nama_guru, COUNT(DISTINCT jd.id_kelas) AS jumlah_kelas_diajar, GROUP_CONCAT(DISTINCT k.nama_kelas ORDER BY k.nama_kelas SEPARATOR ', ') AS daftar_kelas 
-- FROM guru g 
-- JOIN jadwal jd ON g.id_guru = jd.id_guru 
-- JOIN kelas k ON jd.id_kelas = k.id_kelas 
-- GROUP BY g.id_guru, g.nip, g.nama_guru 
-- HAVING jumlah_kelas_diajar > 1 
-- ORDER BY jumlah_kelas_diajar DESC;

-- Kasus 5: Menampilkan siswa yang memperoleh nilai di bawah KKM pada lebih dari satu mata pelajaran (Perlu Tindakan Remedial Khusus)
-- SELECT s.nis, s.nama_siswa, k.nama_kelas, COUNT(n.id_nilai) AS total_mapel_di_bawah_kkm, GROUP_CONCAT(CONCAT(mp.nama_mapel, ' (Nilai: ', n.nilai_akhir, ', KKM: ', mp.kkm, ')') SEPARATOR '; ') AS rincian_mapel_remedial 
-- FROM nilai n 
-- JOIN siswa s ON n.nis = s.nis 
-- JOIN kelas k ON s.id_kelas = k.id_kelas 
-- JOIN mata_pelajaran mp ON n.id_mapel = mp.id_mapel 
-- WHERE n.nilai_akhir < mp.kkm 
-- GROUP BY s.nis, s.nama_siswa, k.nama_kelas 
-- HAVING total_mapel_di_bawah_kkm > 1 
-- ORDER BY total_mapel_di_bawah_kkm DESC;
