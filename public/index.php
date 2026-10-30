<?php
declare(strict_types=1);

// Only this directory is a document root. Never return false to PHP's static server.
header('X-Content-Type-Options: nosniff');
$root = dirname(__DIR__);
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$path = is_string($path) ? rawurldecode($path) : '';
$routes = require $root.'/config/web_routes.php';
if ($path === '/') $path = '/index.php';
if (!isset($routes[$path])) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    if ($_SERVER['REQUEST_METHOD'] !== 'HEAD') echo 'Halaman tidak ditemukan.';
    exit;
}
if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'HEAD', 'POST'], true)) {
    http_response_code(405); header('Allow: GET, HEAD, POST'); exit;
}
$entry = $routes[$path];
if ($entry['type'] === 'asset') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') { http_response_code(405); exit; }
    header('Content-Type: '.$entry['mime']);
    if ($_SERVER['REQUEST_METHOD'] !== 'HEAD') readfile($root.$path);
    exit;
}
$_SERVER['SCRIPT_NAME'] = $path;
$_SERVER['PHP_SELF'] = $path;
if (isset($entry['role'])) {
    require_once $root.'/config/auth.php';
    require_role($entry['role']);
}
$postRoutes=['/auth/login.php','/auth/logout.php','/auth/change_password.php','/admin/master.php','/admin/users.php','/admin/jadwal.php','/admin/penugasan.php','/admin/tahun_ajaran.php','/admin/nilai.php','/admin/ekskul.php','/admin/export_import.php','/admin/kalender.php','/guru/absen.php','/guru/jurnal.php','/guru/nilai.php','/guru/ekskul.php','/kepsek/evaluasi.php','/kepsek/kalender.php'];
if($_SERVER['REQUEST_METHOD']==='POST' && !in_array($path,$postRoutes,true)){http_response_code(405);header('Allow: GET, HEAD');exit;}
chdir(dirname($root.$path));
require $root.$path;
