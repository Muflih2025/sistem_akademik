<?php
declare(strict_types=1);

final class InputError extends RuntimeException {}
function input_text(array $input, string $key, int $max = 255, bool $required = true): string {
    $value = $input[$key] ?? '';
    if (!is_string($value) || mb_strlen($value) > $max) throw new InputError('Format '.str_replace('_',' ',$key).' tidak valid.');
    $value = trim($value);
    if ($required && $value === '') throw new InputError('Lengkapi '.str_replace('_',' ',$key).'.');
    return $value;
}
function input_id(array $input, string $key): int {
    $value = $input[$key] ?? null;
    if ((!is_string($value) && !is_int($value)) || !preg_match('/^[1-9][0-9]{0,9}$/D', (string)$value)) throw new InputError('ID '.str_replace('_',' ',$key).' tidak valid.');
    return (int)$value;
}
function input_choice(array $input, string $key, array $values): string {
    $value = input_text($input,$key,100);
    if (!in_array($value,$values,true)) throw new InputError('Pilihan '.str_replace('_',' ',$key).' tidak valid.');
    return $value;
}
function input_number(array $input, string $key, float $min = 0, float $max = 100): float {
    $value = $input[$key] ?? null;
    if ((!is_string($value) && !is_int($value) && !is_float($value)) || !is_numeric($value) || !is_finite((float)$value) || (float)$value<$min || (float)$value>$max) throw new InputError('Nilai '.str_replace('_',' ',$key).' harus '.$min.' sampai '.$max.'.');
    return round((float)$value,2);
}
function input_date(array $input, string $key): string {
    $value = input_text($input,$key,10);
    $date = DateTimeImmutable::createFromFormat('!Y-m-d',$value);
    if (!$date || $date->format('Y-m-d') !== $value) throw new InputError('Tanggal tidak valid.');
    return $value;
}
function allows_test_password(): bool {return app_setting('APP_ENV')==='testing'&&defined('DB_NAME')&&DB_NAME==='sia_academic_dev_20261031'&&DB_SOCKET!==''&&app_setting('ALLOW_TEST_PASSWORD')==='1';}
function valid_new_password(string $value): void {
    if($value==='password'&&allows_test_password())return;
    if (strlen($value)<10 || strlen($value)>72 || in_array(strtolower($value),['password123','1234567890','qwerty12345'],true)) throw new InputError('Password baru harus 10–72 byte dan tidak memakai password umum.');
}
function db_transaction(callable $callback): mixed {
    $pdo=db();
    if ($pdo->inTransaction()) return $callback($pdo);
    $pdo->beginTransaction();
    try { if(function_exists('lock_authenticated_actor'))lock_authenticated_actor($pdo);$result=$callback($pdo); $pdo->commit(); return $result; }
    catch (Throwable $error) { if($pdo->inTransaction()) $pdo->rollBack(); throw $error; }
}
function security_log(string $event, array $context=[]): void {
    // Caller supplies identifiers only, never input payloads, secrets or driver errors.
    $path=app_setting('SECURITY_LOG');
    if ($path==='') return;
    $allowed=array_intersect_key($context,array_flip(['actor','entity','record','error_type']));
    error_log(json_encode(['time'=>date(DATE_ATOM),'event'=>$event]+$allowed,JSON_UNESCAPED_UNICODE).PHP_EOL,3,$path);
}
function operation_error(Throwable $error): string {
    if($error instanceof InputError) { http_response_code(422); return $error->getMessage(); }
    security_log('operation_failed',['error_type'=>get_class($error)]);
    if($error instanceof PDOException && $error->getCode()==='23000') {http_response_code(409);return 'Identitas duplikat atau relasi data tidak valid.';}
    http_response_code(500); return 'Operasi gagal. Hubungi administrator; data tidak disimpan.';
}
function csv_safe(mixed $value): string {
    $value=(string)$value;
    return preg_match('/^(?:[=+\-@\t\r\n]|[\s\x00-\x1F]+[=+\-@])/u',$value) ? "'".$value : $value;
}
