<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(2);
require dirname(__DIR__).'/config/config.php';
try {
    if(posix_geteuid()===0 || app_setting('APP_ENV')!=='testing' || DB_NAME!=='sia_academic_dev_20261031' || DB_USER!=='ak_dev_runtime_1031')throw new RuntimeException();
    foreach(['sessions','security','logs','uploads','cache'] as $name){$path='/var/lib/sia-academic-dev-20261031/'.$name;if(!is_dir($path)&&!mkdir($path,0700,true))throw new RuntimeException();}
    $directory=app_setting('SECURITY_STATE_PATH');if(!is_dir($directory)&&!mkdir($directory,0700,true))throw new RuntimeException();
    foreach(['/home/muflih/.local/state/sia-r0/activation-20261030/private/active-config.json','/home/muflih/.local/state/sia-academic-dev/20261031/private/owner.json','/etc/sia-academic-dev/20261031/runtime.json'] as $secret)if(is_readable($secret))throw new RuntimeException();
    if(is_writable(dirname(__DIR__).'/config/config.php') || is_writable(dirname(__DIR__).'/public'))throw new RuntimeException();
    if((int)db()->query('SELECT @@skip_networking')->fetchColumn()!==1)throw new RuntimeException();
    $probe=['nonroot'=>true,'home_secrets_hidden'=>true,'owner_config_hidden'=>true,'host_runtime_config_hidden'=>true,'code_read_only'=>true,'socket_only_staging'=>true];
    file_put_contents('/var/lib/sia-academic-dev-20261031/startup-probe.json',json_encode($probe,JSON_THROW_ON_ERROR));
    echo "PASS local development runtime isolation.\n";
} catch(Throwable $error){fwrite(STDERR,"Development isolation/DB check failed; no fallback to production.\n");exit(1);}
