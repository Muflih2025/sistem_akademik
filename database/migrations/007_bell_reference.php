<?php
declare(strict_types=1);
return static function(PDO $pdo): void {
    $pdo->exec("CREATE TABLE IF NOT EXISTS ak_jam_belajar (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,nama VARCHAR(60) NOT NULL,versi INT NOT NULL,
        status ENUM('referensi','perlu_konfirmasi') NOT NULL,payload_json LONGTEXT NOT NULL,
        sumber_sha256 CHAR(64) NOT NULL,catatan VARCHAR(1000) NOT NULL,created_by INT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_jam_reference(nama,versi),
        FOREIGN KEY(created_by) REFERENCES users(id_user) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
};
