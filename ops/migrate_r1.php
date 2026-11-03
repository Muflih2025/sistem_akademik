<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require dirname(__DIR__).'/config/config.php';
$options=getopt('',['apply','check','expected-database:','production-release:']);
$environment=app_setting('APP_ENV');
$productionApproved=false;
if($environment==='production'){
    // Prepared for a separately approved activation. This flag is not consent:
    // an operator must create the private approval setting after user approval.
    $releasePath=dirname(__DIR__).'/RELEASE.json';
    $release=is_file($releasePath)?json_decode(file_get_contents($releasePath),true):null;
    $expected=$options['production-release']??'';
    $productionApproved=is_array($release) && is_string($expected) && preg_match('/^[a-f0-9]{40}$/D',$expected)
        && ($release['commit']??'')===$expected && app_setting('R1_APPROVED_RELEASE')===$expected;
    if($productionApproved){
        $files=is_array($release['files']??null)?$release['files']:[];
        foreach(['ops/migrate_r1.php','database/migrations/002_r1_security.php','config/config.php'] as $required)
            if(!isset($files[$required]))$productionApproved=false;
        foreach($files as $path=>$hash){
            if(!is_string($path) || str_starts_with($path,'/') || in_array('..',explode('/',$path),true)){$productionApproved=false;break;}
            $file=dirname(__DIR__).'/'.$path;
            if(!is_file($file) || !is_string($hash) || !hash_equals($hash,hash_file('sha256',$file))){$productionApproved=false;break;}
        }
    }
}
if((!isset($options['apply']) && !isset($options['check'])) || (isset($options['apply']) && isset($options['check']))
    || (!in_array($environment,['testing','staging'],true) && !$productionApproved)
    || (isset($options['apply']) && app_setting('ALLOW_SCHEMA_CHANGES')!=='1')
    || ($options['expected-database']??'')!==DB_NAME){fwrite(STDERR,"R1: perlu mode CLI eksplisit, database cocok dan otorisasi deployment yang valid.\n");exit(2);}
try{
    $pdo=db();
    if(isset($options['check'])){
        $q=$pdo->query("SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='schema_migrations'");
        $applied=false;
        if($q->fetchColumn()){$q=$pdo->prepare('SELECT 1 FROM schema_migrations WHERE version=?');$q->execute(['002_r1_security']);$applied=(bool)$q->fetchColumn();}
        echo json_encode(['mode'=>'read-only-check','migration'=>'002_r1_security','applied'=>$applied,'production_approved'=>$productionApproved],JSON_THROW_ON_ERROR).PHP_EOL;exit;
    }
    $pdo->exec('CREATE TABLE IF NOT EXISTS schema_migrations(version VARCHAR(100) PRIMARY KEY,applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB');
    $q=$pdo->prepare('SELECT 1 FROM schema_migrations WHERE version=?');$q->execute(['002_r1_security']);
    if(!$q->fetchColumn()){
        (require dirname(__DIR__).'/database/migrations/002_r1_security.php')($pdo);
        $pdo->prepare('INSERT INTO schema_migrations(version) VALUES(?)')->execute(['002_r1_security']);
    }
    echo "R1 migration selesai, tanpa provisioning akun atau backfill historis.\n";
}catch(Throwable $error){fwrite(STDERR,"Migration gagal; tidak ada rollback DDL otomatis. Tinjau snapshot privat.\n");exit(1);}
