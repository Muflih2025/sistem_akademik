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
?><!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Login · <?= APP_NAME ?></title><link href="/assets/css/login.css" rel="stylesheet"></head>
<body class="login-page"><main class="login-shell"><section class="login-card" aria-labelledby="login-title">
<div class="login-mark" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1z M12 5v15"/></svg></div>
<p class="login-school">SISTEM INFORMASI AKADEMIK<br>SMK Negeri 2 Magelang</p>
<h1 id="login-title">Masuk ke akun Anda</h1><p class="login-intro">Kelola kegiatan akademik dengan mudah.</p>
<?php if($error): ?><div class="login-error" role="alert"><?= e($error) ?></div><?php endif; ?>
<form method="post"><?= csrf_field() ?><label class="login-field"><span>Username / NIS</span><input type="text" name="username" autocomplete="username" maxlength="50" required autofocus></label><label class="login-field"><span>Password</span><input type="password" name="password" autocomplete="current-password" required></label><button type="submit">Masuk</button></form>
</section><p class="login-footnote">Gunakan akun yang diberikan oleh sekolah.</p></main></body></html>
