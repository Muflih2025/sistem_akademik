<?php
require_once __DIR__.'/../config/config.php';
try { ensure_auth_tables(); } catch (Throwable $e) { http_response_code(500); exit('Database belum siap. Pastikan database db_sia_smkn2_magelang sudah dibuat dan user MySQL memiliki hak CREATE TABLE.'); }
if (current_user()) redirect('../'.dashboard_path(current_user()['role']));
$error='';
if ($_SERVER['REQUEST_METHOD']==='POST') {
    verify_csrf();
    $q=db()->prepare('SELECT * FROM users WHERE username=? AND status="aktif" LIMIT 1');
    $q->execute([trim($_POST['username']??'')]);
    $u=$q->fetch();
    if ($u && password_verify($_POST['password']??'', $u['password'])) {
        session_regenerate_id(true); unset($u['password']); $_SESSION['user']=$u;
        redirect('../'.dashboard_path($u['role']));
    }
    $error='Username atau password salah/nonaktif.';
}
?><!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Login · <?= APP_NAME ?></title><link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet"><link href="../assets/css/app.css" rel="stylesheet"></head><body class="bg-navy"><div class="container"><div class="row justify-content-center align-items-center min-vh-100"><div class="col-md-5"><div class="card p-4"><h3 class="text-center">SIA SMKN 2 Magelang</h3><p class="text-center text-muted">Silakan masuk ke akun Anda</p><?php if($error): ?><div class="alert alert-danger"><?= e($error) ?></div><?php endif; ?><form method="post"><?= csrf_field() ?><div class="mb-3"><label class="form-label">Username / NIS</label><input class="form-control" name="username" required autofocus></div><div class="mb-3"><label class="form-label">Password</label><input class="form-control" type="password" name="password" required></div><button class="btn btn-primary w-100">Masuk</button></form></div></div></div></div></body></html>
