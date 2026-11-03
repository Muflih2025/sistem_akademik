<?php
declare(strict_types=1);

// Additive structures only. No inference/backfill from legacy schedules or attendance.
return static function (PDO $pdo): void {
    $tables = [
        "ak_periode (
            id_tahun_ajaran INT PRIMARY KEY, mulai DATE NOT NULL, selesai DATE NOT NULL,
            hari_efektif VARCHAR(20) NOT NULL, terverifikasi TINYINT NOT NULL DEFAULT 0,
            catatan VARCHAR(500) NOT NULL, updated_by INT NOT NULL,
            FOREIGN KEY(id_tahun_ajaran) REFERENCES tahun_ajaran(id_tahun_ajaran) ON DELETE RESTRICT,
            FOREIGN KEY(updated_by) REFERENCES users(id_user) ON DELETE RESTRICT,
            CHECK(mulai <= selesai)
        )",
        "ak_anggota_kelas (
            id BIGINT AUTO_INCREMENT PRIMARY KEY, nis VARCHAR(15) NOT NULL,
            id_kelas INT NOT NULL, id_tahun_ajaran INT NOT NULL, nomor_absen INT NOT NULL,
            mulai DATE NOT NULL, selesai DATE NOT NULL, created_by INT NOT NULL,
            UNIQUE KEY uq_ak_member(nis,id_tahun_ajaran,mulai),
            KEY idx_ak_roster(id_kelas,id_tahun_ajaran,mulai,selesai),
            FOREIGN KEY(nis) REFERENCES siswa(nis) ON DELETE RESTRICT,
            FOREIGN KEY(id_kelas) REFERENCES kelas(id_kelas) ON DELETE RESTRICT,
            FOREIGN KEY(id_tahun_ajaran) REFERENCES tahun_ajaran(id_tahun_ajaran) ON DELETE RESTRICT,
            FOREIGN KEY(created_by) REFERENCES users(id_user) ON DELETE RESTRICT,
            CHECK(mulai <= selesai), CHECK(nomor_absen BETWEEN 1 AND 1000)
        )",
        "ak_tugas_piket (
            id BIGINT AUTO_INCREMENT PRIMARY KEY, id_guru INT NOT NULL,
            id_tahun_ajaran INT NOT NULL, id_kelas INT NULL, mulai DATE NOT NULL, selesai DATE NOT NULL,
            boleh_koreksi TINYINT NOT NULL DEFAULT 0, aktif TINYINT NOT NULL DEFAULT 1,
            catatan VARCHAR(500) NOT NULL, created_by INT NOT NULL,
            FOREIGN KEY(id_guru) REFERENCES guru(id_guru) ON DELETE RESTRICT,
            FOREIGN KEY(id_tahun_ajaran) REFERENCES tahun_ajaran(id_tahun_ajaran) ON DELETE RESTRICT,
            FOREIGN KEY(id_kelas) REFERENCES kelas(id_kelas) ON DELETE RESTRICT,
            FOREIGN KEY(created_by) REFERENCES users(id_user) ON DELETE RESTRICT,
            CHECK(mulai <= selesai)
        )",
        "ak_kalender (
            id BIGINT AUTO_INCREMENT PRIMARY KEY, id_tahun_ajaran INT NOT NULL,
            mulai DATE NOT NULL, selesai DATE NOT NULL, judul VARCHAR(150) NOT NULL,
            jenis ENUM('Libur','Ujian','Hari Efektif','Agenda') NOT NULL,
            status ENUM('draft','disahkan','nonaktif') NOT NULL DEFAULT 'draft',
            catatan VARCHAR(1000) NOT NULL, revision INT NOT NULL DEFAULT 1, updated_by INT NOT NULL,
            FOREIGN KEY(id_tahun_ajaran) REFERENCES tahun_ajaran(id_tahun_ajaran) ON DELETE RESTRICT,
            FOREIGN KEY(updated_by) REFERENCES users(id_user) ON DELETE RESTRICT,
            KEY idx_ak_calendar(id_tahun_ajaran,mulai,selesai), CHECK(mulai <= selesai)
        )",
        "ak_pertemuan (
            id BIGINT AUTO_INCREMENT PRIMARY KEY, id_jadwal INT NOT NULL,
            id_tahun_ajaran INT NOT NULL, id_kelas INT NOT NULL, id_guru INT NOT NULL, id_mapel INT NOT NULL,
            tanggal DATE NOT NULL, pertemuan_ke INT NOT NULL, jam_ke VARCHAR(30) NOT NULL,
            tp_atp TEXT NOT NULL, materi TEXT NOT NULL, kegiatan TEXT NOT NULL,
            id_guru_pengganti INT NULL, refleksi TEXT NOT NULL, catatan TEXT NOT NULL, tindak_lanjut TEXT NOT NULL,
            revision INT NOT NULL DEFAULT 1, created_by INT NOT NULL, updated_by INT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_ak_meeting(id_jadwal,tanggal),
            FOREIGN KEY(id_jadwal) REFERENCES jadwal(id_jadwal) ON DELETE RESTRICT,
            FOREIGN KEY(id_tahun_ajaran) REFERENCES tahun_ajaran(id_tahun_ajaran) ON DELETE RESTRICT,
            FOREIGN KEY(id_kelas) REFERENCES kelas(id_kelas) ON DELETE RESTRICT,
            FOREIGN KEY(id_guru) REFERENCES guru(id_guru) ON DELETE RESTRICT,
            FOREIGN KEY(id_mapel) REFERENCES mata_pelajaran(id_mapel) ON DELETE RESTRICT,
            FOREIGN KEY(id_guru_pengganti) REFERENCES guru(id_guru) ON DELETE RESTRICT,
            FOREIGN KEY(created_by) REFERENCES users(id_user) ON DELETE RESTRICT,
            FOREIGN KEY(updated_by) REFERENCES users(id_user) ON DELETE RESTRICT
        )",
        "ak_absensi_sesi (
            id_pertemuan BIGINT NOT NULL, nis VARCHAR(15) NOT NULL, id_anggota BIGINT NOT NULL,
            nomor_absen INT NOT NULL, nama_snapshot VARCHAR(100) NOT NULL,
            status ENUM('H','S','I','A','B') NOT NULL DEFAULT 'B', keterangan VARCHAR(500) NOT NULL,
            created_by INT NOT NULL, updated_by INT NOT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY(id_pertemuan,nis),
            FOREIGN KEY(id_pertemuan) REFERENCES ak_pertemuan(id) ON DELETE RESTRICT,
            FOREIGN KEY(nis) REFERENCES siswa(nis) ON DELETE RESTRICT,
            FOREIGN KEY(id_anggota) REFERENCES ak_anggota_kelas(id) ON DELETE RESTRICT,
            FOREIGN KEY(created_by) REFERENCES users(id_user) ON DELETE RESTRICT,
            FOREIGN KEY(updated_by) REFERENCES users(id_user) ON DELETE RESTRICT
        )",
        "ak_absensi_harian (
            id BIGINT AUTO_INCREMENT PRIMARY KEY, tanggal DATE NOT NULL, nis VARCHAR(15) NOT NULL,
            id_tahun_ajaran INT NOT NULL, id_kelas INT NOT NULL, id_anggota BIGINT NOT NULL,
            status ENUM('H','S','I','A','B') NOT NULL DEFAULT 'B', keterangan VARCHAR(500) NOT NULL,
            metode ENUM('konsensus','manual') NOT NULL, bukti_json LONGTEXT NOT NULL,
            evidence_hash CHAR(64) NOT NULL, revision INT NOT NULL DEFAULT 1,
            created_by INT NOT NULL, updated_by INT NOT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_ak_daily(tanggal,nis),
            FOREIGN KEY(nis) REFERENCES siswa(nis) ON DELETE RESTRICT,
            FOREIGN KEY(id_tahun_ajaran) REFERENCES tahun_ajaran(id_tahun_ajaran) ON DELETE RESTRICT,
            FOREIGN KEY(id_kelas) REFERENCES kelas(id_kelas) ON DELETE RESTRICT,
            FOREIGN KEY(id_anggota) REFERENCES ak_anggota_kelas(id) ON DELETE RESTRICT,
            FOREIGN KEY(created_by) REFERENCES users(id_user) ON DELETE RESTRICT,
            FOREIGN KEY(updated_by) REFERENCES users(id_user) ON DELETE RESTRICT
        )",
        "ak_riwayat (
            id BIGINT AUTO_INCREMENT PRIMARY KEY, actor_id INT NOT NULL,
            entity VARCHAR(30) NOT NULL, record_id VARCHAR(50) NOT NULL, action VARCHAR(30) NOT NULL,
            sebelum LONGTEXT NULL, sesudah LONGTEXT NULL, alasan VARCHAR(500) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_ak_history(entity,record_id,id),
            FOREIGN KEY(actor_id) REFERENCES users(id_user) ON DELETE RESTRICT
        )",
    ];
    foreach ($tables as $table) {
        $pdo->exec('CREATE TABLE IF NOT EXISTS '.$table.' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
    }
};
