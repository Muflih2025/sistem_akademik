<?php
require_once '../config/crud_service.php';require_login();$error='';
if($_SERVER['REQUEST_METHOD']==='POST'){
 verify_csrf();try{
  $old=$_POST['old_password']??null;$new=$_POST['new_password']??null;$confirm=$_POST['confirm_password']??null;
  if(!is_string($old)||!is_string($new)||!is_string($confirm))throw new InputError('Data password tidak valid.');valid_new_password($new);if($new!==$confirm)throw new InputError('Konfirmasi password tidak sama.');
  db_transaction(function(PDO $pdo)use($old,$new):void{$id=current_user()['id_user'];$row=locked_row('users','id_user',$id);if(!password_verify($old,$row['password']))throw new InputError('Password lama tidak sesuai.');$pdo->prepare('UPDATE users SET password=? WHERE id_user=?')->execute([password_hash($new,PASSWORD_BCRYPT),$id]);audit_change('users',(string)$id,'password_change',null,null);});
  clear_authentication();redirect('login.php');
 }catch(Throwable $e){$error=operation_error($e);}
}
$page_title='Ganti Password'; require '../includes/header.php'; require '../includes/sidebar.php'; require '../includes/flash.php'; ?><div class="card p-4 col-md-7"><h4>Ganti Password</h4><?php if($error): ?><div class="alert alert-danger"><?= e($error) ?></div><?php endif; ?><form method="post"><?= csrf_field() ?><div class="mb-3"><label>Password lama</label><input type="password" name="old_password" class="form-control" required></div><div class="mb-3"><label>Password baru</label><input type="password" name="new_password" class="form-control" minlength="10" maxlength="72" required></div><div class="mb-3"><label>Konfirmasi password</label><input type="password" name="confirm_password" class="form-control" required></div><button class="btn btn-primary">Simpan</button></form></div><?php require '../includes/footer.php';
