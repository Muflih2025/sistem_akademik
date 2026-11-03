<?php
declare(strict_types=1);
// Operator-only, explicit fixture cleanup. Never loaded by a web route.
if(PHP_SAPI!=='cli')exit(2);
$state='/home/muflih/.local/state/sia-academic-dev/20261031';
umask(0077);
try{
    $mode=$argv[1]??'';if(!in_array($mode,['--plan','--apply-approved-fixtures-only'],true))throw new RuntimeException();
    $cfg=json_decode(file_get_contents($state.'/private/inspector.json'),true,512,JSON_THROW_ON_ERROR);
    $runtime=json_decode(file_get_contents($state.'/private/runtime.json'),true,512,JSON_THROW_ON_ERROR);
    if(($runtime['APP_ENV']??'')!=='testing'||($cfg['DB_NAME']??'')!=='sia_academic_dev_20261031'||isset($cfg['DB_HOST'])||($cfg['DB_SOCKET']??'')!=='/home/muflih/.local/state/sia-r0/20261030-r0/private/mariadb.sock')throw new RuntimeException();
    $pdo=new PDO('mysql:unix_socket='.$cfg['DB_SOCKET'].';dbname='.$cfg['DB_NAME'].';charset=utf8mb4',$cfg['DB_USER'],$cfg['DB_PASS'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]);
    if((int)$pdo->query('SELECT @@skip_networking')->fetchColumn()!==1||(int)$pdo->query('SELECT @@foreign_key_checks')->fetchColumn()!==1)throw new RuntimeException();
    $proof=json_decode(file_get_contents($state.'/reports/cleanup-backup-restore.json'),true,512,JSON_THROW_ON_ERROR);
    if(($proof['status']??'')!=='PASS'||empty($proof['exact_snapshot_match'])||empty($proof['checkpoint_provenance_match'])||!hash_equals($proof['backup_sha256'],hash_file('sha256',$proof['backup'])))throw new RuntimeException();
    $quote=static fn(string $v):string=>'`'.str_replace('`','``',$v).'`';
    $tables=$pdo->query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME")->fetchAll(PDO::FETCH_COLUMN);
    $keys=[];foreach($pdo->query("SELECT TABLE_NAME,COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_NAME='PRIMARY' ORDER BY TABLE_NAME,ORDINAL_POSITION")as $r)$keys[$r['TABLE_NAME']][]=$r['COLUMN_NAME'];
    $load=static function(bool $lock=false)use($pdo,$tables,$keys,$quote):array{
        $out=[];foreach($tables as $t)$out[$t]=$pdo->query('SELECT * FROM '.$quote($t).(isset($keys[$t])?' ORDER BY '.implode(',',array_map($quote,$keys[$t])):'').($lock?' FOR UPDATE':''))->fetchAll();return $out;
    };
    $hash=static fn(array $v):string=>hash('sha256',json_encode($v,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR));
    $pk=static function(string $t,array $row)use($keys):array{$out=[];foreach($keys[$t]??[]as $k)$out[$k]=$row[$k];if(!$out)throw new RuntimeException();return $out;};
    $planPath=$state.'/private/cleanup-5days-plan.json';
    if($mode==='--plan'){
        if(file_exists($planPath))throw new RuntimeException();
        $all=$load();$keep=[];$counts=[];
        // Bind provenance to the restored backup, not just to an earlier flag.
        // A manual write between backup and planning must refuse cleanup.
        $restoredName=$proof['restore_database']??'';
        if(!preg_match('/^sia_academic_test_restore_[a-f0-9]{8}$/D',$restoredName))throw new RuntimeException();
        $archive=new PDO('mysql:unix_socket='.$cfg['DB_SOCKET'].';dbname='.$restoredName.';charset=utf8mb4',$cfg['DB_USER'],$cfg['DB_PASS'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]);
        $archive->exec('SET TRANSACTION READ ONLY');$archive->beginTransaction();
        foreach($tables as $t){
            $backupRows=$archive->query('SELECT * FROM '.$quote($t).(isset($keys[$t])?' ORDER BY '.implode(',',array_map($quote,$keys[$t])):''))->fetchAll();
            if(!hash_equals($hash($backupRows),$hash($all[$t])))throw new RuntimeException('New data after backup; cleanup refused');
        }
        $archive->rollBack();
        $names=['uji_admin','uji_guru','uji_guru_lain','uji_piket','uji_siswa','uji_kepsek','uji_wali','uji_siswa_lain'];$coreUsers=[];$coreTeachers=[];
        foreach($all['users']as $r)if(in_array($r['username'],$names,true)){$coreUsers[]=$r['id_user'];if($r['role']==='guru')$coreTeachers[]=$r['id_referensi'];}
        if(count($coreUsers)!==8||count($coreTeachers)!==4)throw new RuntimeException();
        $mapping=json_decode(file_get_contents($state.'/private/kelas10-0edb2f32099e.json'),true,512,JSON_THROW_ON_ERROR)['mapping'];
        $excel=array_column($mapping,'nis');if(count($excel)!==389||count(array_unique($excel))!==389)throw new RuntimeException();
        $students=[...$excel,...array_map(static fn(int $n):string=>str_pad((string)$n,7,'0',STR_PAD_LEFT),range(1,22))];
        $classIds=[];$majorIds=[];$schoolNames=[];foreach(['X','XI','XII']as $level)foreach(['PPLG','PM','AKL','MPLB']as $major)foreach([1,2,3]as $n)$schoolNames[]="$level $major $n";
        foreach($all['kelas']as $r)if(in_array($r['nama_kelas'],$schoolNames,true)){$classIds[]=$r['id_kelas'];$majorIds[]=$r['id_jurusan'];}
        if(count($classIds)!==36||count(array_unique($majorIds))!==4)throw new RuntimeException();
        $roomNames=json_decode(file_get_contents($state.'/reports/room-catalog.json'),true,512,JSON_THROW_ON_ERROR)['names'];
        foreach($all as $t=>$rows){
            foreach($rows as $r){
                $retain=match($t){
                    'users','audit_aktivitas','ak_riwayat','ak_jam_belajar','schema_migrations'=>true,
                    'siswa'=>in_array($r['nis'],$students,true),
                    'kelas'=>in_array($r['id_kelas'],$classIds,true),
                    'jurusan'=>in_array($r['id_jurusan'],$majorIds,true),
                    'guru'=>in_array((string)$r['id_guru'],array_map('strval',$coreTeachers),true),
                    'mata_pelajaran'=>in_array($r['id_mapel'],[1,2],true),
                    'tahun_ajaran'=>in_array($r['id_tahun_ajaran'],[1,2],true),
                    'ak_periode'=>$r['id_tahun_ajaran']===1,
                    'jadwal'=>in_array($r['id_jadwal'],[1,2,3,4,5],true),
                    'ak_ruang'=>in_array($r['nama_ruang'],$roomNames,true),
                    'ak_tugas_piket'=>$r['id']===1,
                    'ak_anggota_kelas'=>in_array($r['nis'],$students,true)&&$r['id_tahun_ajaran']===1&&$r['mulai']==='2026-07-01'&&$r['selesai']==='2026-12-31',
                    default=>false,
                };
                if(!$retain){if(isset($r['nis'])&&in_array($r['nis'],$excel,true))throw new RuntimeException('Protected Excel history encountered');$keep[$t]['delete'][]=$pk($t,$r);}
                else $keep[$t]['protected'][]=$pk($t,$r);
            }
            $keep[$t]['before_hash']=$hash($rows);$counts[$t]=['before'=>count($rows),'delete'=>count($keep[$t]['delete']??[])];
        }
        if(count($keep['siswa']['protected']??[])!==411||count($keep['ak_anggota_kelas']['protected']??[])!==411||count($keep['ak_ruang']['protected']??[])!==29)throw new RuntimeException();
        $archive=[];foreach($all['users']as $r)if(!in_array($r['id_user'],$coreUsers,true)&&$r['status']!=='nonaktif')$archive[]=$r['id_user'];
        $plan=['database'=>$cfg['DB_NAME'],'approval'=>'User: only automated fixtures, after backup; keep Excel/classes/rooms/bells/active legacy','backup_sha256'=>$proof['backup_sha256'],'tables'=>$keep,'counts'=>$counts,'archive_users'=>$archive,'core_users'=>$coreUsers];
        file_put_contents($planPath,json_encode($plan,JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR).PHP_EOL);chmod($planPath,0600);
        echo json_encode(['status'=>'PLAN ONLY','counts'=>$counts,'archive_users'=>count($archive),'protected_students'=>411,'protected_classes'=>36,'protected_rooms'=>29]).PHP_EOL;exit;
    }
    $plan=json_decode(file_get_contents($planPath),true,512,JSON_THROW_ON_ERROR);
    if($plan['database']!==$cfg['DB_NAME']||!hash_equals($proof['backup_sha256'],$plan['backup_sha256'])||file_exists($state.'/reports/cleanup-applied.json'))throw new RuntimeException();
    $pdo->beginTransaction();$all=$load(true);
    foreach($all as $t=>$rows)if(!hash_equals($plan['tables'][$t]['before_hash'],$hash($rows)))throw new RuntimeException('Data changed after plan; refused');
    $children=[];foreach($pdo->query('SELECT TABLE_NAME,REFERENCED_TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE CONSTRAINT_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL')as $r)$children[$r['REFERENCED_TABLE_NAME']][]=$r['TABLE_NAME'];
    $done=[];$visiting=[];$deleted=[];
    $remove=function(string $t)use(&$remove,&$done,&$visiting,&$deleted,$children,$plan,$pdo,$quote):void{
        if(isset($done[$t]))return;if(isset($visiting[$t]))throw new RuntimeException();$visiting[$t]=true;
        foreach(array_unique($children[$t]??[])as $child)$remove($child);
        foreach($plan['tables'][$t]['delete']??[]as $identity){$where=implode(' AND ',array_map(static fn(string $c):string=>$quote($c).'=?',array_keys($identity)));$q=$pdo->prepare('DELETE FROM '.$quote($t).' WHERE '.$where);$q->execute(array_values($identity));if($q->rowCount()!==1)throw new RuntimeException();$deleted[$t]=1+($deleted[$t]??0);}
        unset($visiting[$t]);$done[$t]=true;
    };
    foreach($tables as $t)$remove($t);
    foreach($plan['archive_users']as $id){$q=$pdo->prepare("UPDATE users SET status='nonaktif' WHERE id_user=?");$q->execute([$id]);}
    // Check retained records before commit as well: FK cascades or unexpected
    // side effects must roll back the entire operation, not lose protected data.
    $remaining=$load();
    foreach($all as $t=>$rows){
        if(count($remaining[$t])!==count($rows)-count($plan['tables'][$t]['delete']??[]))throw new RuntimeException('Unexpected row removal');
        $index=[];foreach($remaining[$t]as $row)$index[json_encode($pk($t,$row))]=$row;
        $protectedIds=array_fill_keys(array_map(static fn(array $id):string=>json_encode($id),$plan['tables'][$t]['protected']??[]),true);
        foreach($rows as $row){
            $identity=json_encode($pk($t,$row));if(!isset($protectedIds[$identity]))continue;
            $actual=$index[$identity]??null;if(!$actual)throw new RuntimeException('Protected record missing');
            if($t==='users'&&in_array($row['id_user'],$plan['archive_users'],true)){$row['status']='nonaktif';if(array_key_exists('updated_at',$row))$row['updated_at']=$actual['updated_at'];}
            if($row!==$actual)throw new RuntimeException('Protected record changed');
        }
    }
    $q=$pdo->prepare('INSERT INTO ak_riwayat(entity,record_id,action,sebelum,sesudah,actor_id,alasan) VALUES(?,?,?,?,?,1,?)');
    $q->execute(['development_cleanup',date('YmdHis'),'hapus_fixture_terkontrol',json_encode($plan['counts']),json_encode(['deleted'=>$deleted,'archived_accounts'=>count($plan['archive_users']),'backup_sha256'=>$proof['backup_sha256']]),'Persetujuan pengguna: hapus hanya fixture otomatis setelah backup; audit, roster Excel dan referensi sekolah dipertahankan.']);
    $pdo->commit();
    $report=['status'=>'PASS','deleted'=>$deleted,'total_deleted'=>array_sum($deleted),'archived_users'=>count($plan['archive_users']),'audit_rows_deleted'=>0,'backup_sha256'=>$proof['backup_sha256'],'foreign_key_checks_disabled'=>false];
    file_put_contents($state.'/reports/cleanup-applied.json',json_encode($report,JSON_PRETTY_PRINT).PHP_EOL);echo json_encode($report).PHP_EOL;
}catch(Throwable $e){if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack();fwrite(STDERR,'Fixture cleanup refused; transaction rolled back; private details omitted.'.PHP_EOL);exit(1);}
