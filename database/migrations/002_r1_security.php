<?php
// Additive only. No legacy identity/period guesses, no deletes, no account seeds.
return static function(PDO $pdo):void {
    foreach(['jurusan','kelas','guru','siswa','mata_pelajaran','jadwal','ekstrakurikuler'] as $table)
        $pdo->exec("ALTER TABLE `$table` ADD COLUMN IF NOT EXISTS status ENUM('aktif','nonaktif') NOT NULL DEFAULT 'aktif'");
    $pdo->exec('ALTER TABLE tahun_ajaran ADD COLUMN IF NOT EXISTS dikunci TINYINT(1) NOT NULL DEFAULT 0');
    $pdo->exec('ALTER TABLE tahun_ajaran ADD COLUMN IF NOT EXISTS rapor_diterbitkan TINYINT(1) NOT NULL DEFAULT 0');
    $pdo->exec('ALTER TABLE jadwal ADD COLUMN IF NOT EXISTS id_tahun_ajaran INT NULL');
    $pdo->exec('ALTER TABLE ekstrakurikuler ADD COLUMN IF NOT EXISTS id_guru_pembina INT NULL');
    foreach([['jadwal','fk_r1_jadwal_tahun','id_tahun_ajaran','tahun_ajaran','id_tahun_ajaran'],['ekstrakurikuler','fk_r1_ekskul_pembina','id_guru_pembina','guru','id_guru']] as [$table,$key,$column,$parent,$pk]){
        $q=$pdo->prepare('SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME=? AND CONSTRAINT_NAME=?');$q->execute([$table,$key]);
        if(!$q->fetchColumn())$pdo->exec("ALTER TABLE `$table` ADD CONSTRAINT `$key` FOREIGN KEY (`$column`) REFERENCES `$parent` (`$pk`) ON DELETE RESTRICT");
    }
    $pdo->exec("CREATE TABLE IF NOT EXISTS audit_aktivitas(id_audit BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,actor_id INT NOT NULL,entity VARCHAR(50) NOT NULL,record_id VARCHAR(50) NOT NULL,action VARCHAR(30) NOT NULL,before_json LONGTEXT NULL,after_json LONGTEXT NULL,created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,KEY idx_audit_record(entity,record_id),CONSTRAINT fk_r1_audit_actor FOREIGN KEY(actor_id) REFERENCES users(id_user) ON DELETE RESTRICT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
};
