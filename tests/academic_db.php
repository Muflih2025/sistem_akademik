<?php
// CLI fixture inspector. No TCP and no existing school/staging databases accepted.
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(2);
try {
    $config=json_decode(file_get_contents($argv[1]??''),true,512,JSON_THROW_ON_ERROR);
    if(($config['DB_NAME']??'')!=='sia_academic_dev_20261031'||empty($config['DB_SOCKET'])||isset($config['DB_HOST']))exit(2);
    $pdo=new PDO('mysql:unix_socket='.$config['DB_SOCKET'].';dbname='.$config['DB_NAME'].';charset=utf8mb4',$config['DB_USER'],$config['DB_PASS'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]);
    if((int)$pdo->query('SELECT @@skip_networking')->fetchColumn()!==1)exit(2);
    $input=json_decode(stream_get_contents(STDIN),true,512,JSON_THROW_ON_ERROR);
    if(preg_match('/\b(DROP|TRUNCATE|GRANT|REVOKE|OUTFILE|DUMPFILE|LOAD_FILE)\b/i',$input['sql']))exit(2);
    $q=$pdo->prepare($input['sql']);$q->execute($input['args']??[]);
    echo json_encode($q->columnCount()?$q->fetchAll():['affected'=>$q->rowCount(),'id'=>$pdo->lastInsertId()],JSON_THROW_ON_ERROR);
} catch(Throwable $error) {fwrite(STDERR,"Synthetic fixture operation failed (private context omitted).\n");exit(1);}
