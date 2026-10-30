<?php
require_once __DIR__.'/../config/auth.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ?><!doctype html><html lang="id"><meta charset="utf-8"><title>Keluar</title>
    <body><h1>Keluar dari sistem</h1><form method="post"><?= csrf_field() ?><button>Keluar</button></form></body></html><?php
    exit;
}
verify_csrf();
security_log('logout',['actor'=>current_user()['id_user']??null]);
$_SESSION = []; unset($GLOBALS['r1_auth_user']);
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires' => time() - 3600, 'path' => $params['path'],
        'domain' => $params['domain'], 'secure' => $params['secure'],
        'httponly' => true, 'samesite' => 'Lax',
    ]);
}
session_destroy();
redirect('login.php');
