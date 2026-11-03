<?php
declare(strict_types=1);
// ExecStartPre runs with the SAME DynamicUser, mount namespace and credentials as PHP.
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require dirname(__DIR__).'/config/config.php';
$checks=[];$errors=[];
function denied_open(string $path):bool {$f=@fopen($path,'rb');if($f!==false){fclose($f);return false;}return true;}
try{
    $checks['process_nonroot']=posix_geteuid()!==0;
    $checks['isolated_identity']=posix_geteuid()!==1000;
    $status=file_get_contents('/proc/self/status');$checks['no_new_privileges']=(bool)preg_match('/^NoNewPrivs:\s+1$/m',$status);
    $credentials=getenv('CREDENTIALS_DIRECTORY')?:'';$path=getenv('SIA_CONFIG_FILE')?:'';
    $checks['loaded_credential_readable']=$credentials!=='' && str_starts_with($path,$credentials.'/') && is_readable($path);
    $checks['credential_outside_repository']=!str_starts_with(realpath($path)?:'',dirname(__DIR__).'/');
    $checks['root_secret_source_denied']=denied_open('/etc/sia-r15-staging/20261031/runtime.json');
    $checks['migration_owner_secret_denied']=denied_open('/etc/sia-r15-staging/20261031/migration-owner.json');
    $checks['old_production_secret_denied']=denied_open('/home/muflih/.local/state/sia-r0/activation-20261030/private/active-config.json');
    $checks['proc_root_secret_escape_denied']=denied_open('/proc/1/root/home/muflih/.local/state/sia-r0/activation-20261030/private/active-config.json');
    $checks['home_namespace_canary_denied']=denied_open('/home/.sia-r15-namespace-canary-20261031');
    $checks['code_not_writable']=!is_writable(dirname(__DIR__).'/config/config.php');
    $canary='/opt/sia-r15-staging/20261031/writable-canary/probe';
    $checks['protect_system_blocks_world_writable_path']=@file_put_contents($canary,'SYNTHETIC')===false;
    $checks['runtime_profile']=app_setting('APP_ENV')==='testing' && DB_NAME==='r1_testing_20261030' && (bool)preg_match('/^r15_app_[a-z0-9_]+$/D',DB_USER) && app_setting('ALLOW_SCHEMA_CHANGES')!=='1' && app_setting('R1_APPROVED_RELEASE')==='';
    if(!$checks['runtime_profile'])throw new RuntimeException('Invalid runtime profile');
    foreach(['sessions','sessions-rollback','security','logs','uploads'] as $directory){$p='/var/lib/sia-r15-stage-20261031/'.$directory;if(!is_dir($p))mkdir($p,0700,true);}
    $pdo=db();$checks['socket_only_staging']=(int)$pdo->query('SELECT @@skip_networking')->fetchColumn()===1;
    $identity=$pdo->query('SELECT CURRENT_USER()')->fetchColumn();$checks['db_identity_matches_config']=explode('@',$identity)[0]===DB_USER;
    $checks['db_not_root']=strtolower(explode('@',$identity)[0])!=='root';
    $grants=implode(' ',$pdo->query('SHOW GRANTS FOR CURRENT_USER')->fetchAll(PDO::FETCH_COLUMN));
    $checks['no_admin_or_ddl_grants']=!preg_match('/\b(CREATE|ALTER|DROP|TRIGGER|EVENT|ALL PRIVILEGES|GRANT OPTION|SUPER|FILE|PROCESS|PROXY)\b/i',$grants);
    // Never attempt an administrative statement if privilege inspection fails.
    if(!$checks['no_admin_or_ddl_grants'])throw new RuntimeException('Excess runtime grant');
    $user=str_replace("'","''",explode('@',$identity)[0]);
    $probes=['drop_table'=>'DROP TABLE r15_privilege_canary','alter_table'=>'ALTER TABLE r15_privilege_canary ADD COLUMN forbidden INT',
        'create_user'=>"CREATE USER 'r15_forbidden_probe'@'localhost'",
        'grant'=>"GRANT SELECT ON `r1_testing_20261030`.* TO '$user'@'localhost'",
        'audit_update'=>'UPDATE audit_aktivitas SET action=action WHERE 1=0',
        'historical_delete'=>'DELETE FROM nilai WHERE 1=0',
        'audit_read'=>'SELECT * FROM audit_aktivitas LIMIT 0',
        'deployment_ledger_read'=>'SELECT * FROM schema_migrations LIMIT 0',
        'unused_normalization_read'=>'SELECT * FROM normalisasi_2nf_nilai LIMIT 0'];
    foreach($probes as $name=>$sql){$denied=false;try{$pdo->exec($sql);}catch(PDOException $error){$code=(int)($error->errorInfo[1]??0);$denied=in_array($code,[1044,1142,1227],true);$errors[$name]=$code;}$checks[$name.'_denied']=$denied;}
}catch(Throwable $error){$checks['startup_prerequisites']=false;}
$ok=!in_array(false,$checks,true);$report=['status'=>$ok?'PASS':'FAIL','uid'=>posix_geteuid(),'runtime_slot_b'=>str_ends_with(DB_USER,'_b'),'checks'=>$checks,'denial_codes'=>$errors];
// No paths, SQL driver messages, credential values, cookies or tokens are logged.
echo json_encode(['event'=>'r15_startup_probe']+$report,JSON_THROW_ON_ERROR).PHP_EOL;
$out='/var/lib/sia-r15-stage-20261031/startup-probe.json';if(is_dir(dirname($out)))file_put_contents($out,json_encode($report,JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR));
exit($ok?0:1);
