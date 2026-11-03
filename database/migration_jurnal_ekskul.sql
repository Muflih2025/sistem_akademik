-- Migration: Jurnal Kelas & Ekstrakurikuler
USE db_sia_smkn2_magelang;

-- Tabel Jurnal Kelas (teaching journal)
CREATE TABLE IF NOT EXISTS `jurnal_kelas` (
  `id_jurnal` INT NOT NULL AUTO_INCREMENT,
  `id_jadwal` INT NOT NULL,
  `id_guru` INT NOT NULL,
  `id_kelas` INT NOT NULL,
  `id_mapel` INT NOT NULL,
  `tanggal` DATE NOT NULL,
  `jam_ke` VARCHAR(30) DEFAULT NULL,
  `materi` TEXT NOT NULL,
  `kegiatan` TEXT DEFAULT NULL,
  `catatan` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_jurnal`),
  UNIQUE KEY `uq_jurnal_jadwal_tgl` (`id_jadwal`, `tanggal`),
  KEY `fk_jurnal_guru` (`id_guru`),
  KEY `fk_jurnal_kelas` (`id_kelas`),
  KEY `idx_jurnal_tanggal` (`tanggal`),
  CONSTRAINT `fk_jurnal_jadwal` FOREIGN KEY (`id_jadwal`) REFERENCES `jadwal` (`id_jadwal`) ON DELETE CASCADE,
  CONSTRAINT `fk_jurnal_guru` FOREIGN KEY (`id_guru`) REFERENCES `guru` (`id_guru`) ON DELETE CASCADE,
  CONSTRAINT `fk_jurnal_kelas` FOREIGN KEY (`id_kelas`) REFERENCES `kelas` (`id_kelas`) ON DELETE CASCADE,
  CONSTRAINT `fk_jurnal_mapel` FOREIGN KEY (`id_mapel`) REFERENCES `mata_pelajaran` (`id_mapel`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabel Ekstrakurikuler
CREATE TABLE IF NOT EXISTS `ekstrakurikuler` (
  `id_ekskul` INT NOT NULL AUTO_INCREMENT,
  `nama_ekskul` VARCHAR(100) NOT NULL,
  `pembina` VARCHAR(100) DEFAULT NULL,
  `deskripsi` TEXT DEFAULT NULL,
  PRIMARY KEY (`id_ekskul`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabel Nilai Ekstrakurikuler per siswa per tahun ajaran
CREATE TABLE IF NOT EXISTS `nilai_ekskul` (
  `id_nilai_ekskul` INT NOT NULL AUTO_INCREMENT,
  `nis` VARCHAR(15) NOT NULL,
  `id_ekskul` INT NOT NULL,
  `id_tahun_ajaran` INT NOT NULL,
  `predikat` ENUM('Sangat Baik','Baik','Cukup','Kurang') NOT NULL DEFAULT 'Baik',
  `keterangan` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id_nilai_ekskul`),
  UNIQUE KEY `uq_ekskul_siswa_tahun` (`nis`, `id_ekskul`, `id_tahun_ajaran`),
  CONSTRAINT `fk_nekskul_siswa` FOREIGN KEY (`nis`) REFERENCES `siswa` (`nis`) ON DELETE CASCADE,
  CONSTRAINT `fk_nekskul_ekskul` FOREIGN KEY (`id_ekskul`) REFERENCES `ekstrakurikuler` (`id_ekskul`) ON DELETE CASCADE,
  CONSTRAINT `fk_nekskul_tahun` FOREIGN KEY (`id_tahun_ajaran`) REFERENCES `tahun_ajaran` (`id_tahun_ajaran`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample data
INSERT IGNORE INTO `ekstrakurikuler` (`nama_ekskul`, `pembina`) VALUES
('Pramuka', 'Pembina Pramuka'),
('PMR', 'Pembina PMR'),
('Futsal', 'Pelatih Futsal'),
('Basket', 'Pelatih Basket'),
('English Club', 'Pembina English Club'),
('Robotika', 'Pembina Robotika'),
('Paduan Suara', 'Pembina Paduan Suara');
