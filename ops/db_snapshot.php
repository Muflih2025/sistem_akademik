<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
// Independent from application bootstrap: never starts sessions or migrations.
try {
    $settings = json_decode(file_get_contents($argv[1] ?? ''), true, 512, JSON_THROW_ON_ERROR);
    $transport = !empty($settings['DB_SOCKET']) ? 'unix_socket='.$settings['DB_SOCKET'] : 'host='.$settings['DB_HOST'].';port='.$settings['DB_PORT'];
    $pdo = new PDO('mysql:'.$transport.';dbname='.$settings['DB_NAME'].';charset=utf8mb4', $settings['DB_USER'], $settings['DB_PASS'], [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
    $pdo->exec('SET SESSION TRANSACTION READ ONLY');
    $pdo->beginTransaction();
    $out = ['tables'=>[], 'objects'=>[]];
    foreach ($pdo->query('SHOW FULL TABLES')->fetchAll(PDO::FETCH_NUM) as [$name, $kind]) {
        $identifier = '`'.str_replace('`','``',$name).'`';
        $create = $pdo->query('SHOW CREATE TABLE '.$identifier)->fetch(PDO::FETCH_NUM)[1];
        $entry = ['type'=>$kind, 'schema_sha256'=>hash('sha256',$create)];
        if ($kind === 'BASE TABLE') {
            $hashes = [];
            $rows = $pdo->query('SELECT * FROM '.$identifier);
            while ($row = $rows->fetch()) $hashes[] = hash('sha256',json_encode($row,JSON_THROW_ON_ERROR));
            sort($hashes, SORT_STRING);
            $entry['rows'] = count($hashes);
            $entry['data_sha256'] = hash('sha256',implode('', $hashes));
        }
        $out['tables'][$name] = $entry;
    }
    foreach ([
        'triggers'=>'SELECT TRIGGER_NAME,EVENT_MANIPULATION,EVENT_OBJECT_TABLE,ACTION_TIMING,ACTION_STATEMENT FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() ORDER BY TRIGGER_NAME',
        'routines'=>'SELECT ROUTINE_NAME,ROUTINE_TYPE,ROUTINE_DEFINITION FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA=DATABASE() ORDER BY ROUTINE_NAME',
    ] as $key=>$query) $out['objects'][$key] = hash('sha256',json_encode($pdo->query($query)->fetchAll(),JSON_THROW_ON_ERROR));
    $pdo->rollBack();
    echo json_encode($out, JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR).PHP_EOL;
} catch (Throwable $e) {
    // Never print connection strings, credentials, row contents, or driver exceptions.
    fwrite(STDERR, "Snapshot baca-saja gagal; periksa koneksi dan izin secara privat.\n");
    exit(1);
}
