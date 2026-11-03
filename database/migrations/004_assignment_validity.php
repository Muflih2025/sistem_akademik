<?php
declare(strict_types=1);
return static function(PDO $pdo): void {
    $pdo->exec("CREATE TABLE IF NOT EXISTS ak_penugasan (
        id_jadwal INT PRIMARY KEY, mulai DATE NOT NULL, selesai DATE NOT NULL,
        terverifikasi TINYINT NOT NULL DEFAULT 0, catatan VARCHAR(500) NOT NULL,
        updated_by INT NOT NULL,
        FOREIGN KEY(id_jadwal) REFERENCES jadwal(id_jadwal) ON DELETE RESTRICT,
        FOREIGN KEY(updated_by) REFERENCES users(id_user) ON DELETE RESTRICT,
        CHECK(mulai<=selesai)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
};
