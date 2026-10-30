<?php
require_once __DIR__.'/config.php';
require_once __DIR__.'/validation.php';
require_once __DIR__.'/authorization.php';
function valid_reference_shape(string $role,mixed $reference):bool {if(!is_string($reference)&&!is_int($reference))return false;return (bool)preg_match($role==='guru'?'/^[1-9][0-9]{0,9}$/D':'/^[0-9]{1,15}$/D',(string)$reference);}
function auth_fingerprint(array $u):string { return hash('sha256',implode('|',[$u['id_user'],$u['username'],$u['password'],$u['role'],$u['id_referensi']??'',$u['status']])); }
function clear_authentication():void {
    $_SESSION=[];unset($GLOBALS['r1_auth_user']);
    if(session_status()===PHP_SESSION_ACTIVE)session_regenerate_id(true);
}
function authenticated_user():?array {
    if(array_key_exists('r1_auth_user',$GLOBALS))return $GLOBALS['r1_auth_user'];
    $GLOBALS['r1_auth_user']=null;
    $stored=$_SESSION['user']??null;
    if(!is_array($stored) || !isset($stored['id_user']))return null;
    $now=time();
    if(($now-(int)($_SESSION['auth_issued_at']??0))>(int)app_setting('SESSION_MAX_AGE','28800') || ($now-(int)($_SESSION['auth_seen_at']??0))>(int)app_setting('SESSION_IDLE_TIMEOUT','1800')){clear_authentication();return null;}
    try{
        $q=db()->prepare('SELECT * FROM users WHERE id_user=?');$q->execute([$stored['id_user']]);$u=$q->fetch();
        $tag=$_SESSION['auth_fingerprint']??'';
        if(!$u || $u['status']!=='aktif' || !is_string($tag) || $tag==='' || !hash_equals(auth_fingerprint($u),$tag)){clear_authentication();return null;}
        if(in_array($u['role'],['guru','siswa'],true)){
            if(!valid_reference_shape($u['role'],$u['id_referensi'])){clear_authentication();return null;}
            $table=$u['role']==='guru'?'guru':'siswa';$pk=$table==='guru'?'id_guru':'nis';
            $q=db()->prepare("SELECT 1 FROM `$table` WHERE `$pk`=? AND status='aktif'");$q->execute([$u['id_referensi']]);
            if(!$q->fetchColumn()){clear_authentication();return null;}
        }
        unset($u['password']);$_SESSION['user']=$u;$_SESSION['auth_seen_at']=$now;
        return $GLOBALS['r1_auth_user']=$u;
    }catch(Throwable $error){security_log('auth_unavailable',['error_type'=>get_class($error)]);http_response_code(503);exit('Autentikasi sementara tidak tersedia.');}
}
function require_login():void {if(!current_user())redirect('../auth/login.php');}
function require_role(string ...$roles):void { require_login();if(!in_array(current_user()['role'],$roles,true))deny_access(); }
function user_reference():string|int|null {return current_user()['id_referensi']??null;}
function login_counter(string $key, string $operation):bool {
    $directory=app_setting('SECURITY_STATE_PATH');
    if($directory==='' || !is_dir($directory) || !is_writable($directory))throw new RuntimeException('Security state unavailable');
    $file=fopen($directory.'/'.hash('sha256',$key).'.json','c+');
    if(!$file || !flock($file,LOCK_EX))throw new RuntimeException('Security state unavailable');
    try{
        $data=json_decode(stream_get_contents($file),true)?:['start'=>time(),'count'=>0];
        if(time()-(int)$data['start']>=900)$data=['start'=>time(),'count'=>0];
        $limit=str_starts_with($key,'ip:')?max(1,(int)app_setting('LOGIN_IP_LIMIT','200')):5;
        $allowed=(int)$data['count']<$limit;
        if($operation==='reserve' && $allowed)$data['count']++;
        if($operation==='success' && !str_starts_with($key,'ip:'))$data=['start'=>time(),'count'=>0];
        rewind($file);ftruncate($file,0);fwrite($file,json_encode($data));fflush($file);return $allowed;
    }finally{flock($file,LOCK_UN);fclose($file);}
}

if(PHP_SAPI!=='cli')set_exception_handler(static function(Throwable $error):void{echo e(operation_error($error));});

function auth_dummy_hash():string {
    $directory=app_setting('SECURITY_STATE_PATH');
    if(!is_dir($directory) || (fileperms($directory)&0077)!==0)throw new RuntimeException('Private authentication state required');
    $file=fopen($directory.'/dummy-hash','c+');if(!$file || !flock($file,LOCK_EX))throw new RuntimeException('Private authentication state unavailable');
    try{$hash=trim(stream_get_contents($file));if(password_get_info($hash)['algo']===null){$hash=password_hash(bin2hex(random_bytes(32)),PASSWORD_BCRYPT);rewind($file);ftruncate($file,0);fwrite($file,$hash);fflush($file);}return $hash;}
    finally{flock($file,LOCK_UN);fclose($file);}
}
function lock_authenticated_actor(PDO $pdo):void {
    $actor=current_user();if(!$actor)deny_access();
    $q=$pdo->prepare('SELECT * FROM users WHERE id_user=? FOR UPDATE');$q->execute([$actor['id_user']]);$row=$q->fetch();
    if(!$row || $row['status']!=='aktif' || !hash_equals(auth_fingerprint($row),$_SESSION['auth_fingerprint']??''))deny_access();
}
