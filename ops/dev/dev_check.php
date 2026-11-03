<?php
declare(strict_types=1);
// Read-only startup check. Deliberately never prints driver errors or credentials.
if(PHP_SAPI!=='cli')exit(2);
function dev_check_fail(string $reason): never {echo json_encode(['status'=>'FAIL','reason'=>$reason]).PHP_EOL;exit(1);}
if(PHP_VERSION_ID<80100)dev_check_fail('php_version');
foreach(['pdo_mysql','mbstring','dom','zip'] as $extension)if(!extension_loaded($extension))dev_check_fail('php_extension');
try{
    require dirname(__DIR__,2).'/config/config.php';
    if(!in_array(app_setting('APP_ENV'),['development','testing','staging'],true)||app_setting('ALLOW_SCHEMA_CHANGES')!=='0'||strtolower(DB_USER)==='root')dev_check_fail('runtime_config');
    $pdo=db();$pdo->exec('SET SESSION TRANSACTION READ ONLY');$pdo->beginTransaction();
    $required=['users','guru','siswa','jadwal','ak_periode','ak_tugas_piket','ak_anggota_kelas','ak_pertemuan','ak_absensi_sesi','ak_absensi_harian','ak_nilai','ak_rapor_snapshot'];
    $q=$pdo->prepare('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()');$q->execute();$tables=$q->fetchAll(PDO::FETCH_COLUMN);
    $pdo->rollBack();
    if(array_diff($required,$tables))dev_check_fail('schema_not_ready');
    echo json_encode(['status'=>'PASS','read_only'=>true]).PHP_EOL;
}catch(Throwable $error){dev_check_fail('database_or_config');}
