<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__).'/config/config.php';
try {
    if (app_setting('APP_ENV') !== 'testing' || DB_NAME !== 'sia_r0_testing' || DB_SOCKET === '') exit(2);
    $pdo = db();
    $grants = implode(' ', $pdo->query('SHOW GRANTS FOR CURRENT_USER')->fetchAll(PDO::FETCH_COLUMN));
    $denied = false;
    try { $pdo->query('SELECT COUNT(*) FROM db_sia_smkn2_magelang.users'); }
    catch (PDOException $e) { $denied = in_array($e->errorInfo[1] ?? 0, [1044,1142], true); }
    $out = [
        'connected_to_fixture_database' => $pdo->query('SELECT DATABASE()')->fetchColumn() === 'sia_r0_testing',
        'separate_runtime_identity' => str_starts_with($pdo->query('SELECT CURRENT_USER()')->fetchColumn(), 'sia_r0_app@'),
        'networking_disabled' => (int)$pdo->query('SELECT @@skip_networking')->fetchColumn() === 1,
        'no_ddl_grants' => !preg_match('/\b(CREATE|ALTER|DROP|TRIGGER|EVENT|ALL PRIVILEGES)\b/i', $grants),
        'restored_real_database_denied' => $denied,
        'no_default_accounts' => (int)$pdo->query("SELECT COUNT(*) FROM users WHERE username NOT IN ('r0_test_admin','r0_test_disabled')")->fetchColumn() === 0,
    ];
    echo json_encode($out, JSON_THROW_ON_ERROR).PHP_EOL;
} catch (Throwable $e) {
    fwrite(STDERR, "Pemeriksaan runtime gagal; detail koneksi tidak ditampilkan.\n"); exit(1);
}
