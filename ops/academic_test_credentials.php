<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(2);
require dirname(__DIR__).'/config/config.php';
if(app_setting('APP_ENV')!=='testing'||DB_NAME!=='sia_academic_dev_20261031'||DB_SOCKET===''||app_setting('ALLOW_FIXTURE')!=='1')exit(2);
try{
    $pdo=db();if((int)$pdo->query('SELECT @@skip_networking')->fetchColumn()!==1)exit(2);
    $path=$argv[1]??'';$data=json_decode(file_get_contents($path),true,512,JSON_THROW_ON_ERROR);
    $roles=['admin'=>'admin','teacher'=>'guru','other_teacher'=>'guru','duty'=>'guru','student'=>'siswa','head'=>'kepala_sekolah','wali'=>'guru'];
    $pdo->beginTransaction();foreach($roles as $key=>$role){
        $name=$data[$key]??'';if(!is_string($name)||!str_starts_with($name,'uji_'))throw new RuntimeException();
        $q=$pdo->prepare('SELECT * FROM users WHERE username=? FOR UPDATE');$q->execute([$name]);$row=$q->fetch();if(!$row||$row['role']!==$role)throw new RuntimeException();
        $pdo->prepare('UPDATE users SET password=? WHERE id_user=?')->execute([password_hash('password',PASSWORD_BCRYPT),$row['id_user']]);
    }
    $q=$pdo->prepare("SELECT id_user,role,id_referensi FROM users WHERE username='uji_siswa_lain' FOR UPDATE");$q->execute();$comparison=$q->fetch();
    if($comparison){if($comparison['role']!=='siswa'||$comparison['id_referensi']!=='0000021')throw new RuntimeException();$pdo->prepare('UPDATE users SET password=? WHERE id_user=?')->execute([password_hash('password',PASSWORD_BCRYPT),$comparison['id_user']]);}
    $pdo->commit();$data['password']='password';file_put_contents($path,json_encode($data,JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR).PHP_EOL);chmod($path,0600);
    echo "PASS named development fixtures updated; active/school accounts untouched.\n";
}catch(Throwable $e){if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack();fwrite(STDERR,"Fixture credentials refused; private details omitted.\n");exit(1);}
