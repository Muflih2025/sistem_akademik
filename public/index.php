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
chdir(dirname($root.$path));
require $root.$path;
