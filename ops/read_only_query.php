<?php
declare(strict_types=1);
// Review tooling only: no application bootstrap, sessions, DDL or writes.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
try {
    $path=realpath($argv[1]??'');
    if(!$path || str_starts_with($path,dirname(__DIR__).DIRECTORY_SEPARATOR) || (fileperms($path)&0077)!==0)exit(2);
    $config=json_decode(file_get_contents($path),true,512,JSON_THROW_ON_ERROR);
    $input=json_decode(stream_get_contents(STDIN),true,512,JSON_THROW_ON_ERROR);
    if(!preg_match('/^\s*(SELECT|SHOW)\b/i',$input['sql']??''))exit(2);
    if(preg_match('/\b(INTO|OUTFILE|DUMPFILE|LOAD_FILE|GET_LOCK|RELEASE_LOCK|SLEEP|BENCHMARK)\b|FOR\s+UPDATE|LOCK\s+IN\s+SHARE\s+MODE/i',$input['sql']))exit(2);
    $transport=!empty($config['DB_SOCKET'])?'unix_socket='.$config['DB_SOCKET']:'host='.$config['DB_HOST'].';port='.$config['DB_PORT'];
    $pdo=new PDO('mysql:'.$transport.';dbname='.$config['DB_NAME'].';charset=utf8mb4',$config['DB_USER'],$config['DB_PASS'],[
        PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES=>false,PDO::MYSQL_ATTR_MULTI_STATEMENTS=>false,
    ]);
    $pdo->exec('SET SESSION TRANSACTION READ ONLY');$pdo->beginTransaction();
    $query=$pdo->prepare($input['sql']);$query->execute($input['args']??[]);
    echo json_encode($query->fetchAll(),JSON_THROW_ON_ERROR);$pdo->rollBack();
} catch(Throwable $error) { fwrite(STDERR,"Read-only review failed; private details redacted.\n");exit(1); }
