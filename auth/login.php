<?php
require_once __DIR__.'/../config/auth.php';
if(current_user())redirect('../'.dashboard_path(current_user()['role']));
$error='';
if($_SERVER['REQUEST_METHOD']==='POST'){
    verify_csrf();
    try{
        $username=input_text($_POST,'username',50);$password=$_POST['password']??null;if(!is_string($password) || strlen($password)>1024)throw new InputError('Credential tidak valid.');
        $ip='ip:'.($_SERVER['REMOTE_ADDR']??'local');$principal='principal:'.strtolower($username).'|'.$ip;
        if(!login_counter($ip,'reserve') || !login_counter($principal,'reserve')){http_response_code(429);header('Retry-After: 900');$error='Percobaan login dibatasi. Silakan coba lagi nanti.';}
        else{
            $q=db()->prepare('SELECT * FROM users WHERE username=? LIMIT 1');$q->execute([$username]);$u=$q->fetch();
            $dummy=auth_dummy_hash();$hash=$u['password']??$dummy;
            $verified=password_verify($password,$hash);
            $valid=$u && $verified && $u['status']==='aktif';if($valid && in_array($u['role'],['guru','siswa'],true) && !valid_reference_shape($u['role'],$u['id_referensi']))$valid=false;
            if($valid && in_array($u['role'],['guru','siswa'],true)){
                $table=$u['role']==='guru'?'guru':'siswa';$pk=$table==='guru'?'id_guru':'nis';
                $q=db()->prepare("SELECT 1 FROM `$table` WHERE `$pk`=? AND status='aktif'");$q->execute([$u['id_referensi']]);$valid=(bool)$q->fetchColumn();
            }
            if($valid){
                session_regenerate_id(true);$_SESSION=[];$_SESSION['auth_fingerprint']=auth_fingerprint($u);$_SESSION['auth_issued_at']=$_SESSION['auth_seen_at']=time();
                unset($u['password']);$_SESSION['user']=$u;login_counter($principal,'success');security_log('login_success',['actor'=>$u['id_user']]);
                redirect('../'.dashboard_path($u['role']));
            }
            security_log('login_failed');$error='Username atau password salah/nonaktif.';
        }
    }catch(InputError $errorInput){http_response_code(422);$error='Data autentikasi tidak valid.';}
    catch(Throwable $errorDb){security_log('login_unavailable',['error_type'=>get_class($errorDb)]);http_response_code(503);$error='Layanan login sementara tidak tersedia.';}
}
?><!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Login · <?= APP_NAME ?></title><link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet"><link href="../assets/css/app.css" rel="stylesheet"></head><body class="bg-navy"><div class="container"><div class="row justify-content-center align-items-center min-vh-100"><div class="col-md-5"><div class="card p-4"><h3 class="text-center">SIA SMKN 2 Magelang</h3><p class="text-center text-muted">Silakan masuk ke akun Anda</p><?php if($error): ?><div class="alert alert-danger"><?= e($error) ?></div><?php endif; ?><form method="post"><?= csrf_field() ?><div class="mb-3"><label class="form-label">Username / NIS</label><input class="form-control" name="username" required autofocus></div><div class="mb-3"><label class="form-label">Password</label><input class="form-control" type="password" name="password" required></div><button class="btn btn-primary w-100">Masuk</button></form></div></div></div></div></body></html>
