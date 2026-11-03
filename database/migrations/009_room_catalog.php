<?php
declare(strict_types=1);
return static function(PDO $pdo): void {
    $pdo->exec("CREATE TABLE IF NOT EXISTS ak_ruang (
        id_ruang INT AUTO_INCREMENT PRIMARY KEY,kode_ruang VARCHAR(20) NOT NULL UNIQUE,
        nama_ruang VARCHAR(20) NOT NULL UNIQUE,jenis ENUM('Kelas','Laboratorium') NOT NULL,
        status ENUM('aktif','nonaktif') NOT NULL DEFAULT 'aktif',created_by INT NOT NULL,updated_by INT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(created_by) REFERENCES users(id_user) ON DELETE RESTRICT,
        FOREIGN KEY(updated_by) REFERENCES users(id_user) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
};
