<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require dirname(__DIR__,2).'/config/config.php';
$options=getopt('',['expected-database:','expected-environment:']);
try{
    $checks=['database_matches'=>(($options['expected-database']??'')===DB_NAME),
        'environment_matches'=>(($options['expected-environment']??'')===app_setting('APP_ENV'))];
    $pdo=db();$pdo->exec('SET SESSION TRANSACTION READ ONLY');$pdo->beginTransaction();
    $identity=$pdo->query('SELECT CURRENT_USER()')->fetchColumn();
    $checks['runtime_not_root']=strtolower(explode('@',$identity)[0])!=='root';
    $grantRows=$pdo->query('SHOW GRANTS FOR CURRENT_USER')->fetchAll(PDO::FETCH_COLUMN);$grants=implode(' ',$grantRows);
    $checks['runtime_no_ddl_or_admin_grants']=!preg_match('/\b(CREATE|ALTER|DROP|TRIGGER|EVENT|ALL PRIVILEGES|GRANT OPTION|SUPER|FILE|PROCESS|PROXY)\b/i',$grants);
    [$user,$host]=explode('@',$identity,2);$grantee="'".$user."'@'".$host."'";
    $checks['no_unreviewed_role_grants']=true;foreach($grantRows as $grant)if(!preg_match('/^GRANT .+ ON /i',$grant))$checks['no_unreviewed_role_grants']=false;
    $q=$pdo->prepare("SELECT COUNT(*) FROM information_schema.USER_PRIVILEGES WHERE GRANTEE=? AND PRIVILEGE_TYPE<>'USAGE'");$q->execute([$grantee]);$checks['no_global_privileges']=(int)$q->fetchColumn()===0;
    $q=$pdo->prepare('SELECT COUNT(*) FROM information_schema.SCHEMA_PRIVILEGES WHERE GRANTEE=? AND TABLE_SCHEMA<>DATABASE()');$q->execute([$grantee]);$checks['no_other_database_privileges']=(int)$q->fetchColumn()===0;
    $q=$pdo->prepare('SELECT COUNT(*) FROM information_schema.TABLE_PRIVILEGES WHERE GRANTEE=? AND TABLE_SCHEMA<>DATABASE()');$q->execute([$grantee]);$checks['no_other_database_privileges']=$checks['no_other_database_privileges'] && (int)$q->fetchColumn()===0;
    $q=$pdo->prepare("SELECT PRIVILEGE_TYPE FROM information_schema.TABLE_PRIVILEGES WHERE GRANTEE=? AND TABLE_SCHEMA=DATABASE() AND TABLE_NAME='audit_aktivitas' UNION SELECT PRIVILEGE_TYPE FROM information_schema.SCHEMA_PRIVILEGES WHERE GRANTEE=? AND TABLE_SCHEMA=DATABASE() UNION SELECT PRIVILEGE_TYPE FROM information_schema.COLUMN_PRIVILEGES WHERE GRANTEE=? AND TABLE_SCHEMA=DATABASE() AND TABLE_NAME='audit_aktivitas'");
    $q->execute([$grantee,$grantee,$grantee]);$audit=$q->fetchAll(PDO::FETCH_COLUMN);
    $checks['audit_insert_only_writes']=in_array('INSERT',$audit,true) && !array_intersect($audit,['UPDATE','DELETE']);
    $q=$pdo->prepare("SELECT COUNT(*) FROM information_schema.TABLE_PRIVILEGES WHERE GRANTEE=? AND TABLE_SCHEMA=DATABASE() AND TABLE_NAME<>'catatan_evaluasi' AND PRIVILEGE_TYPE='DELETE'");$q->execute([$grantee]);
    $checks['no_academic_delete_privilege']=(int)$q->fetchColumn()===0;
    $q=$pdo->prepare("SELECT COUNT(*) FROM information_schema.SCHEMA_PRIVILEGES WHERE GRANTEE=? AND TABLE_SCHEMA=DATABASE() AND PRIVILEGE_TYPE='DELETE'");$q->execute([$grantee]);$checks['no_academic_delete_privilege']=$checks['no_academic_delete_privilege'] && (int)$q->fetchColumn()===0;
    $required=['jurusan'=>['status'],'kelas'=>['status'],'guru'=>['status'],'siswa'=>['status'],'mata_pelajaran'=>['status'],'jadwal'=>['status','id_tahun_ajaran'],'ekstrakurikuler'=>['status','id_guru_pembina'],'tahun_ajaran'=>['dikunci','rapor_diterbitkan'],'audit_aktivitas'=>['actor_id','before_json','after_json']];
    $q=$pdo->query('SELECT TABLE_NAME,COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()');$columns=[];foreach($q as $row)$columns[$row['TABLE_NAME']][]=$row['COLUMN_NAME'];
    $checks['required_schema_present']=true;foreach($required as $table=>$fields)if(array_diff($fields,$columns[$table]??[]))$checks['required_schema_present']=false;
    $constraints=$pdo->query("SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_TYPE='FOREIGN KEY'")->fetchAll(PDO::FETCH_COLUMN);
    $checks['required_foreign_keys_present']=!array_diff(['fk_r1_jadwal_tahun','fk_r1_ekskul_pembina','fk_r1_audit_actor'],$constraints);
    $pdo->rollBack();
    foreach(['SESSION_PATH','SECURITY_STATE_PATH'] as $key){$path=app_setting($key);$checks[strtolower($key).'_private_writable']=$path!=='' && is_dir($path) && (fileperms($path)&0077)===0 && is_writable($path);}
    $checks['runtime_migration_disabled']=app_setting('ALLOW_SCHEMA_CHANGES','0')!=='1' && app_setting('R1_APPROVED_RELEASE')==='';
    $ok=!in_array(false,$checks,true);echo json_encode(['status'=>$ok?'PASS':'FAIL','checks'=>$checks],JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR).PHP_EOL;exit($ok?0:1);
}catch(Throwable $error){fwrite(STDERR,"R1 runtime preflight failed; private details redacted.\n");exit(1);}
