<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__,2).'/config/config.php';
$options = getopt('', ['apply', 'expected-database:']);
if (!isset($options['apply']) || !in_array(app_setting('APP_ENV'), ['staging','testing'], true)
    || ($options['expected-database'] ?? '') !== DB_NAME || app_setting('ALLOW_SCHEMA_CHANGES') !== '1') {
    fwrite(STDERR, "Tidak dijalankan. R0 hanya mengizinkan deployment CLI eksplisit pada staging/testing dengan konfigurasi owner dan nama database yang cocok.\n");
    exit(2);
}
try {
    $pdo = db();
    $pdo->exec('CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(100) PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB');
    $version = '001_legacy_runtime';
    $check = $pdo->prepare('SELECT 1 FROM schema_migrations WHERE version=?'); $check->execute([$version]);
    if (!$check->fetchColumn()) {
        // MariaDB DDL can implicitly commit. Take/verify backup before invoking this tool.
        foreach (require dirname(__DIR__,2).'/database/migrations/'.$version.'.php' as $statement) $pdo->exec($statement);
        $pdo->prepare('INSERT INTO schema_migrations(version) VALUES(?)')->execute([$version]);
    }
    echo "Deployment skema staging/testing selesai; tidak ada provisioning akun.\n";
} catch (Throwable $e) {
    fwrite(STDERR, "Deployment gagal; tidak ada rollback DDL otomatis. Tinjau log dan snapshot privat sebelum retry.\n");
    exit(1);
}
