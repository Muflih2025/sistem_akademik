<?php
declare(strict_types=1);
return static function(PDO $pdo): void {
    $pdo->exec("CREATE TABLE IF NOT EXISTS ak_kenaikan_batch (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,periode_asal INT NOT NULL,periode_tujuan INT NOT NULL,
        tanggal_berlaku DATE NOT NULL,alasan VARCHAR(500) NOT NULL,source_hash CHAR(64) NOT NULL,
        jumlah INT NOT NULL,created_by INT NOT NULL,created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(periode_asal) REFERENCES tahun_ajaran(id_tahun_ajaran) ON DELETE RESTRICT,
        FOREIGN KEY(periode_tujuan) REFERENCES tahun_ajaran(id_tahun_ajaran) ON DELETE RESTRICT,
        FOREIGN KEY(created_by) REFERENCES users(id_user) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $pdo->exec("CREATE TABLE IF NOT EXISTS ak_kenaikan_detail (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,id_batch BIGINT NOT NULL,nis VARCHAR(15) NOT NULL,
        periode_asal INT NOT NULL,id_anggota_asal BIGINT NOT NULL,id_anggota_tujuan BIGINT NULL,
        hasil ENUM('naik','alumni') NOT NULL,tanggal_berlaku DATE NOT NULL,
        UNIQUE KEY uq_kenaikan_siswa_periode(nis,periode_asal),
        KEY idx_kenaikan_alumni(hasil,tanggal_berlaku,nis),
        FOREIGN KEY(id_batch) REFERENCES ak_kenaikan_batch(id) ON DELETE RESTRICT,
        FOREIGN KEY(nis) REFERENCES siswa(nis) ON DELETE RESTRICT,
        FOREIGN KEY(periode_asal) REFERENCES tahun_ajaran(id_tahun_ajaran) ON DELETE RESTRICT,
        FOREIGN KEY(id_anggota_asal) REFERENCES ak_anggota_kelas(id) ON DELETE RESTRICT,
        FOREIGN KEY(id_anggota_tujuan) REFERENCES ak_anggota_kelas(id) ON DELETE RESTRICT,
        CHECK((hasil='alumni' AND id_anggota_tujuan IS NULL) OR (hasil='naik' AND id_anggota_tujuan IS NOT NULL))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
};
