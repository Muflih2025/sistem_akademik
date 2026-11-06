<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(2);
require dirname(__DIR__,2).'/config/config.php';
if(app_setting('APP_ENV')!=='testing'||DB_NAME!=='sia_academic_dev_20261031'||DB_SOCKET===''||app_setting('ALLOW_FIXTURE')!=='1')exit(2);
try {
    $pdo=db();if((int)$pdo->query('SELECT @@skip_networking')->fetchColumn()!==1)exit(2);
    $credentials=json_decode(file_get_contents($argv[1]??''),true,512,JSON_THROW_ON_ERROR);
    $pdo->beginTransaction();
    $q=$pdo->prepare('SELECT id_user,id_referensi,role FROM users WHERE username=?');$q->execute(['uji_wali']);$user=$q->fetch();
    if(!$user){
        $pdo->exec("INSERT INTO guru(nip,nama_guru) VALUES('UJI-WALI-01','Wali Kelas Uji')");$guru=(int)$pdo->lastInsertId();
        $pdo->prepare("INSERT INTO users(username,password,role,id_referensi) VALUES(?,?,'guru',?)")->execute(['uji_wali',password_hash($credentials['password'],PASSWORD_BCRYPT),(string)$guru]);
    }else{if($user['role']!=='guru')throw new RuntimeException();$guru=(int)$user['id_referensi'];}
    $q=$pdo->prepare('SELECT id FROM ak_wali_kelas WHERE id_guru=? AND id_kelas=1 AND id_tahun_ajaran=1');$q->execute([$guru]);
    if(!$q->fetchColumn())$pdo->prepare("INSERT INTO ak_wali_kelas(id_guru,id_kelas,id_tahun_ajaran,mulai,selesai,catatan,created_by) VALUES(?,1,1,'2026-07-01','2026-12-31','DATA SINTETIS: tugas wali fixture, bukan penugasan legacy',1)")->execute([$guru]);
    $pdo->commit();echo "PASS fixture wali appended; existing accounts/passwords/reports unchanged.\n";
}catch(Throwable $e){if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack();fwrite(STDERR,"Fixture completion refused; private detail omitted.\n");exit(1);}
