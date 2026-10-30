<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require dirname(__DIR__).'/config/config.php';
$options=getopt('',['apply','expected-database:']);
if(!isset($options['apply']) || !in_array(app_setting('APP_ENV'),['testing','staging'],true) || app_setting('ALLOW_SCHEMA_CHANGES')!=='1' || ($options['expected-database']??'')!==DB_NAME){fwrite(STDERR,"R1: hanya deployment CLI eksplisit pada staging/testing dan database yang cocok.\n");exit(2);}
try{
    $pdo=db();$pdo->exec('CREATE TABLE IF NOT EXISTS schema_migrations(version VARCHAR(100) PRIMARY KEY,applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB');
    $q=$pdo->prepare('SELECT 1 FROM schema_migrations WHERE version=?');$q->execute(['002_r1_security']);
    if(!$q->fetchColumn()){
        (require dirname(__DIR__).'/database/migrations/002_r1_security.php')($pdo);
        $pdo->prepare('INSERT INTO schema_migrations(version) VALUES(?)')->execute(['002_r1_security']);
    }
    echo "R1 staging migration selesai, tanpa provisioning akun atau backfill historis.\n";
}catch(Throwable $error){fwrite(STDERR,"Migration gagal; tidak ada rollback DDL otomatis. Tinjau snapshot privat.\n");exit(1);}
