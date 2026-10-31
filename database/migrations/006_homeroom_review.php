<?php
declare(strict_types=1);
return static function(PDO $pdo): void {
    $pdo->exec("CREATE TABLE IF NOT EXISTS ak_wali_kelas (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,id_guru INT NOT NULL,id_kelas INT NOT NULL,
        id_tahun_ajaran INT NOT NULL,mulai DATE NOT NULL,selesai DATE NOT NULL,
        aktif TINYINT NOT NULL DEFAULT 1,catatan VARCHAR(500) NOT NULL,created_by INT NOT NULL,
        FOREIGN KEY(id_guru) REFERENCES guru(id_guru) ON DELETE RESTRICT,
        FOREIGN KEY(id_kelas) REFERENCES kelas(id_kelas) ON DELETE RESTRICT,
        FOREIGN KEY(id_tahun_ajaran) REFERENCES tahun_ajaran(id_tahun_ajaran) ON DELETE RESTRICT,
        FOREIGN KEY(created_by) REFERENCES users(id_user) ON DELETE RESTRICT,
        CHECK(mulai<=selesai),KEY idx_wali_scope(id_kelas,id_tahun_ajaran,mulai,selesai)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $pdo->exec("CREATE TABLE IF NOT EXISTS ak_review_rapor (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,id_snapshot BIGINT NOT NULL,id_penugasan_wali BIGINT NOT NULL,
        actor_id INT NOT NULL,keputusan ENUM('disetujui','perlu_perbaikan') NOT NULL,
        catatan VARCHAR(1000) NOT NULL,payload_hash CHAR(64) NOT NULL,source_hash CHAR(64) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(id_snapshot) REFERENCES ak_rapor_snapshot(id) ON DELETE RESTRICT,
        FOREIGN KEY(id_penugasan_wali) REFERENCES ak_wali_kelas(id) ON DELETE RESTRICT,
        FOREIGN KEY(actor_id) REFERENCES users(id_user) ON DELETE RESTRICT,
        KEY idx_review_snapshot(id_snapshot,id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
};
