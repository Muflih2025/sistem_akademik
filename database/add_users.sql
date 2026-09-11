USE `db_sia_smkn2_magelang`;

CREATE TABLE IF NOT EXISTS `users` (
  `id_user` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin','guru','kepala_sekolah','siswa') NOT NULL,
  `id_referensi` VARCHAR(20) DEFAULT NULL,
  `status` ENUM('aktif','nonaktif') NOT NULL DEFAULT 'aktif',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_user`), UNIQUE KEY `uq_users_username` (`username`), KEY `idx_users_ref` (`role`,`id_referensi`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `catatan_evaluasi` (
  `id_evaluasi` INT NOT NULL AUTO_INCREMENT, `judul` VARCHAR(150) NOT NULL, `isi` TEXT NOT NULL,
  `id_tahun_ajaran` INT DEFAULT NULL, `created_by` INT NOT NULL, `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_evaluasi`), KEY (`id_tahun_ajaran`), KEY (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `absensi` (
  `id_absen` INT NOT NULL AUTO_INCREMENT,
  `tanggal` DATE NOT NULL,
  `nis` VARCHAR(15) NOT NULL,
  `id_jadwal` INT NOT NULL,
  `status` ENUM('Hadir','Izin','Sakit','Alpa') NOT NULL DEFAULT 'Hadir',
  `keterangan` VARCHAR(255) DEFAULT NULL,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_absen`), UNIQUE KEY `uq_absensi` (`tanggal`,`nis`,`id_jadwal`),
  KEY `idx_absensi_siswa` (`nis`,`tanggal`), KEY `idx_absensi_guru` (`created_by`,`tanggal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `mata_pelajaran` ADD COLUMN IF NOT EXISTS `kkm` DECIMAL(5,2) NOT NULL DEFAULT 75.00;

-- Password demo seluruh akun: password
INSERT INTO `users` (`username`,`password`,`role`,`id_referensi`) VALUES
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', NULL),
('budi', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'guru', '1'),
('siti', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'guru', '2'),
('kepsek', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'kepala_sekolah', NULL),
('2425001', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'siswa', '2425001'),
('2425002', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'siswa', '2425002')
ON DUPLICATE KEY UPDATE username=VALUES(username);
