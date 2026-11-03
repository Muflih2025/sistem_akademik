<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(2);
require dirname(__DIR__).'/config/config.php';
if(app_setting('APP_ENV')!=='testing'||DB_NAME!=='sia_academic_dev_20261031'||DB_SOCKET===''||app_setting('ALLOW_FIXTURE')!=='1')exit(2);
try {
    $pdo=db();if((int)$pdo->query('SELECT @@skip_networking')->fetchColumn()!==1)exit(2);
    $path=dirname(__DIR__).'/database/fixtures/jam_belajar_referensi.json';$source=json_decode(file_get_contents($path),true,512,JSON_THROW_ON_ERROR);$hash=hash_file('sha256',$path);
    $pdo->beginTransaction();
    foreach($source['profiles'] as $profile){
        $hash=hash('sha256',json_encode($profile,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR));
        $previous='00:00';$numbers=[];
        foreach($profile['slots'] as [$number,$from,$until,$label]){
            foreach([$from,$until]as $time)if(!preg_match('/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/D',$time))throw new RuntimeException();
            if($from>=$until||$from<$previous)throw new RuntimeException();$previous=$until;
            if($number!==null){if(!is_int($number)||isset($numbers[$number]))throw new RuntimeException();$numbers[$number]=true;}
        }
        $q=$pdo->prepare('SELECT sumber_sha256 FROM ak_jam_belajar WHERE nama=? AND versi=?');$q->execute([$profile['nama'],$profile['versi']]);$old=$q->fetchColumn();
        if($old!==false){if(!hash_equals($old,$hash))throw new RuntimeException('Buat versi baru, jangan menimpa referensi.');continue;}
        $pdo->prepare('INSERT INTO ak_jam_belajar(nama,versi,status,payload_json,sumber_sha256,catatan,created_by) VALUES(?,?,?,?,?,?,1)')->execute([$profile['nama'],$profile['versi'],$profile['status'],json_encode($profile,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),$hash,$profile['catatan']]);
    }
    $pdo->commit();echo "PASS three versioned bell references; existing schedules/meetings unchanged.\n";
}catch(Throwable $e){if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack();fwrite(STDERR,"Bell fixture refused; source/version/connection detail omitted.\n");exit(1);}
