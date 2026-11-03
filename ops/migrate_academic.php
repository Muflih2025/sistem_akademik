<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__).'/config/config.php';
$options = getopt('', ['apply', 'check', 'expected-database:']);
// This development runner deliberately has no production bypass.
if (!in_array(app_setting('APP_ENV'), ['testing','staging'], true)
    || !preg_match('/^sia_academic_(dev|test)_[a-z0-9_]+$/D', DB_NAME)
    || DB_SOCKET === '' || ($options['expected-database'] ?? '') !== DB_NAME
    || (isset($options['apply']) === isset($options['check']))
    || (isset($options['apply']) && app_setting('ALLOW_SCHEMA_CHANGES') !== '1')) {
    fwrite(STDERR, "Hanya database development akademik terisolasi yang diizinkan.\n"); exit(2);
}
try {
    $pdo = db();
    if ((int)$pdo->query('SELECT @@skip_networking')->fetchColumn() !== 1) throw new RuntimeException();
    $files = glob(dirname(__DIR__).'/database/migrations/00[3-9]_*.php'); sort($files);
    $result = [];
    foreach ($files as $file) {
        $version = basename($file, '.php');
        $q = $pdo->prepare('SELECT 1 FROM schema_migrations WHERE version=?'); $q->execute([$version]);
        $applied = (bool)$q->fetchColumn();
        if (!$applied && isset($options['apply'])) {
            (require $file)($pdo);
            $pdo->prepare('INSERT INTO schema_migrations(version) VALUES(?)')->execute([$version]);
            $applied = true;
        }
        $result[$version] = $applied;
    }
    echo json_encode($result, JSON_THROW_ON_ERROR).PHP_EOL;
} catch (Throwable $error) {
    fwrite(STDERR, "Migration development gagal; tinjau konfigurasi privat dan snapshot. DDL tidak di-rollback otomatis.\n"); exit(1);
}
