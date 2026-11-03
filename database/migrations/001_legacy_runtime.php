<?php
// Explicit deployment DDL only. No account seeds or password resets.
return [
    <<<'SQL'
CREATE TABLE IF NOT EXISTS users (
        id_user INT NOT NULL AUTO_INCREMENT,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin','guru','kepala_sekolah','siswa') NOT NULL,
        id_referensi VARCHAR(20) DEFAULT NULL,
        status ENUM('aktif','nonaktif') NOT NULL DEFAULT 'aktif',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id_user), KEY idx_users_ref (role,id_referensi)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
    <<<'SQL'
ALTER TABLE mata_pelajaran ADD COLUMN IF NOT EXISTS kkm DECIMAL(5,2) NOT NULL DEFAULT 75.00
SQL,
    <<<'SQL'
CREATE TABLE IF NOT EXISTS absensi (
        id_absen INT NOT NULL AUTO_INCREMENT,
        tanggal DATE NOT NULL,
        nis VARCHAR(15) NOT NULL,
        id_jadwal INT NOT NULL,
        status ENUM('Hadir','Izin','Sakit','Alpa') NOT NULL DEFAULT 'Hadir',
        keterangan VARCHAR(255) DEFAULT NULL,
        created_by INT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id_absen), UNIQUE KEY uq_absensi (tanggal,nis,id_jadwal),
        KEY idx_absensi_siswa (nis,tanggal), KEY idx_absensi_guru (created_by,tanggal)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
    <<<'SQL'
CREATE TABLE IF NOT EXISTS `jurnal_kelas` (
        `id_jurnal` INT NOT NULL AUTO_INCREMENT,
        `id_jadwal` INT NOT NULL,
        `id_guru` INT NOT NULL,
        `id_kelas` INT NOT NULL,
        `id_mapel` INT NOT NULL,
        `tanggal` DATE NOT NULL,
        `pertemuan_ke` INT NOT NULL DEFAULT 1,
        `jam_ke` VARCHAR(30) DEFAULT NULL,
        `guru_pengganti` VARCHAR(100) DEFAULT NULL,
        `materi` TEXT NOT NULL,
        `kegiatan` TEXT DEFAULT NULL,
        `catatan` TEXT DEFAULT NULL,
        `refleksi` TEXT DEFAULT NULL,
        `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id_jurnal`),
        UNIQUE KEY `uq_jurnal_jadwal_tgl` (`id_jadwal`, `tanggal`),
        KEY `idx_jurnal_tanggal` (`tanggal`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
    <<<'SQL'
ALTER TABLE jurnal_kelas ADD COLUMN IF NOT EXISTS pertemuan_ke INT NOT NULL DEFAULT 1
SQL,
    <<<'SQL'
ALTER TABLE jurnal_kelas ADD COLUMN IF NOT EXISTS guru_pengganti VARCHAR(100) DEFAULT NULL
SQL,
    <<<'SQL'
ALTER TABLE jurnal_kelas ADD COLUMN IF NOT EXISTS refleksi TEXT DEFAULT NULL
SQL,
    <<<'SQL'
CREATE TABLE IF NOT EXISTS `bobot_penilaian` (
        `id_bobot` INT NOT NULL AUTO_INCREMENT,
        `id_guru` INT DEFAULT NULL,
        `id_mapel` INT DEFAULT NULL,
        `id_kelas` INT DEFAULT NULL,
        `bobot_tugas` DECIMAL(5,2) NOT NULL DEFAULT 30.00,
        `bobot_uts` DECIMAL(5,2) NOT NULL DEFAULT 30.00,
        `bobot_uas` DECIMAL(5,2) NOT NULL DEFAULT 40.00,
        `bobot_praktik` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        `nama_ekstra` VARCHAR(50) DEFAULT NULL,
        `bobot_ekstra` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id_bobot`),
        UNIQUE KEY `uq_bobot_guru_mapel_kelas` (`id_guru`, `id_mapel`, `id_kelas`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
    <<<'SQL'
ALTER TABLE nilai ADD COLUMN IF NOT EXISTS nilai_praktik DECIMAL(5,2) NOT NULL DEFAULT 0.00
SQL,
    <<<'SQL'
ALTER TABLE nilai ADD COLUMN IF NOT EXISTS nilai_ekstra DECIMAL(5,2) NOT NULL DEFAULT 0.00
SQL,
    <<<'SQL'
CREATE TABLE IF NOT EXISTS `ekstrakurikuler` (
        `id_ekskul` INT NOT NULL AUTO_INCREMENT,
        `nama_ekskul` VARCHAR(100) NOT NULL,
        `pembina` VARCHAR(100) DEFAULT NULL,
        `id_guru_pembina` INT DEFAULT NULL,
        `deskripsi` TEXT DEFAULT NULL,
        PRIMARY KEY (`id_ekskul`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
    <<<'SQL'
CREATE TABLE IF NOT EXISTS `nilai_ekskul` (
        `id_nilai_ekskul` INT NOT NULL AUTO_INCREMENT,
        `nis` VARCHAR(15) NOT NULL,
        `id_ekskul` INT NOT NULL,
        `id_tahun_ajaran` INT NOT NULL,
        `predikat` ENUM('Sangat Baik','Baik','Cukup','Kurang') NOT NULL DEFAULT 'Baik',
        `keterangan` VARCHAR(255) DEFAULT NULL,
        PRIMARY KEY (`id_nilai_ekskul`),
        UNIQUE KEY `uq_ekskul_siswa_tahun` (`nis`, `id_ekskul`, `id_tahun_ajaran`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
];
