<?php
declare(strict_types=1);
return static function(PDO $pdo): void {
    $definitions=[
        "ak_aturan_nilai (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,id_tahun_ajaran INT NOT NULL,id_kelas INT NOT NULL,
            id_mapel INT NOT NULL,id_guru INT NOT NULL,versi INT NOT NULL,bobot_json LONGTEXT NOT NULL,
            kkm DECIMAL(5,2) NOT NULL,formula VARCHAR(30) NOT NULL,catatan VARCHAR(500) NOT NULL,
            created_by INT NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_ak_rule(id_tahun_ajaran,id_kelas,id_mapel,id_guru,versi),
            FOREIGN KEY(id_tahun_ajaran) REFERENCES tahun_ajaran(id_tahun_ajaran) ON DELETE RESTRICT,
            FOREIGN KEY(id_kelas) REFERENCES kelas(id_kelas) ON DELETE RESTRICT,
            FOREIGN KEY(id_mapel) REFERENCES mata_pelajaran(id_mapel) ON DELETE RESTRICT,
            FOREIGN KEY(id_guru) REFERENCES guru(id_guru) ON DELETE RESTRICT,
            FOREIGN KEY(created_by) REFERENCES users(id_user) ON DELETE RESTRICT
        )",
        "ak_nilai (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,nis VARCHAR(15) NOT NULL,id_anggota BIGINT NOT NULL,
            id_tahun_ajaran INT NOT NULL,id_kelas INT NOT NULL,id_mapel INT NOT NULL,id_guru INT NOT NULL,
            id_aturan BIGINT NOT NULL,komponen_json LONGTEXT NOT NULL,nilai_akhir DECIMAL(5,2) NOT NULL,
            predikat ENUM('A','B','C','D') NOT NULL,deskripsi VARCHAR(1000) NOT NULL,
            revision INT NOT NULL DEFAULT 1,created_by INT NOT NULL,updated_by INT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_ak_grade(nis,id_tahun_ajaran,id_mapel),
            FOREIGN KEY(nis) REFERENCES siswa(nis) ON DELETE RESTRICT,
            FOREIGN KEY(id_anggota) REFERENCES ak_anggota_kelas(id) ON DELETE RESTRICT,
            FOREIGN KEY(id_tahun_ajaran) REFERENCES tahun_ajaran(id_tahun_ajaran) ON DELETE RESTRICT,
            FOREIGN KEY(id_kelas) REFERENCES kelas(id_kelas) ON DELETE RESTRICT,
            FOREIGN KEY(id_mapel) REFERENCES mata_pelajaran(id_mapel) ON DELETE RESTRICT,
            FOREIGN KEY(id_guru) REFERENCES guru(id_guru) ON DELETE RESTRICT,
            FOREIGN KEY(id_aturan) REFERENCES ak_aturan_nilai(id) ON DELETE RESTRICT,
            FOREIGN KEY(created_by) REFERENCES users(id_user) ON DELETE RESTRICT,
            FOREIGN KEY(updated_by) REFERENCES users(id_user) ON DELETE RESTRICT
        )",
        "ak_rapor_snapshot (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,nis VARCHAR(15) NOT NULL,id_tahun_ajaran INT NOT NULL,
            id_kelas INT NOT NULL,versi INT NOT NULL,payload_json LONGTEXT NOT NULL,payload_hash CHAR(64) NOT NULL,
            created_by INT NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_ak_report(nis,id_tahun_ajaran,versi),
            FOREIGN KEY(nis) REFERENCES siswa(nis) ON DELETE RESTRICT,
            FOREIGN KEY(id_tahun_ajaran) REFERENCES tahun_ajaran(id_tahun_ajaran) ON DELETE RESTRICT,
            FOREIGN KEY(id_kelas) REFERENCES kelas(id_kelas) ON DELETE RESTRICT,
            FOREIGN KEY(created_by) REFERENCES users(id_user) ON DELETE RESTRICT
        )",
        "ak_rapor_status (
            id_snapshot BIGINT PRIMARY KEY,status ENUM('draft','terverifikasi','diterbitkan','ditarik') NOT NULL DEFAULT 'draft',
            revision INT NOT NULL DEFAULT 1,verified_by INT NULL,published_by INT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY(id_snapshot) REFERENCES ak_rapor_snapshot(id) ON DELETE RESTRICT,
            FOREIGN KEY(verified_by) REFERENCES users(id_user) ON DELETE RESTRICT,
            FOREIGN KEY(published_by) REFERENCES users(id_user) ON DELETE RESTRICT
        )",
    ];
    foreach($definitions as $definition)$pdo->exec('CREATE TABLE IF NOT EXISTS '.$definition.' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
};
