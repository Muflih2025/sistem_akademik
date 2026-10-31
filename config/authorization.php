<?php
declare(strict_types=1);
function deny_access(): never { http_response_code(403); exit('Akses ditolak.'); }
function not_found(): never { http_response_code(404); exit('Data tidak ditemukan.'); }
function permission(string $name): void {
    require_login();
    $roles=match($name) {
        'master.manage','users.manage','period.manage','grades.admin','rapor.publish' => ['admin'],
        'supervise','evaluation.manage' => ['kepala_sekolah'],
        'calendar.manage' => ['admin','kepala_sekolah'],
        'teach' => ['guru'],
        default => [],
    };
    if(!in_array(current_user()['role'],$roles,true)) deny_access();
}
function active_period(?int $id=null, bool $write=false): array {
    $q=db()->prepare($id ? 'SELECT * FROM tahun_ajaran WHERE id_tahun_ajaran=?' : "SELECT * FROM tahun_ajaran WHERE status='Aktif'");
    $q->execute($id ? [$id] : []); $rows=$q->fetchAll();
    if(count($rows)!==1) throw new InputError('Pilih periode akademik yang valid; tepat satu periode harus aktif.');
    $row=$rows[0];
    if($write && ($row['status']!=='Aktif' || (int)$row['dikunci']===1)) deny_access();
    return $row;
}
function teacher_assignment(int $kelas, ?int $mapel=null, ?int $period=null, bool $write=false): void {
    permission('teach');
    $sql="SELECT j.* FROM jadwal j JOIN guru g ON g.id_guru=j.id_guru JOIN kelas k ON k.id_kelas=j.id_kelas JOIN mata_pelajaran m ON m.id_mapel=j.id_mapel WHERE j.id_guru=? AND j.id_kelas=? AND j.status='aktif' AND g.status='aktif' AND k.status='aktif' AND m.status='aktif'";
    $args=[user_reference(),$kelas];
    if($mapel!==null){$sql.=' AND j.id_mapel=?';$args[]=$mapel;}
    if($period!==null){$sql.=' AND j.id_tahun_ajaran=?';$args[]=$period;}
    $q=db()->prepare($sql.' LIMIT 1'.($write?' FOR UPDATE':''));$q->execute($args);if(!$q->fetch())deny_access();
    if($write) active_period($period,true);
}
function own_schedule(int $id, bool $write=false, ?string $date=null): array {
    permission('teach');
    $q=db()->prepare('SELECT * FROM jadwal WHERE id_jadwal=? AND id_guru=?'.($write?' FOR UPDATE':''));$q->execute([$id,user_reference()]);$row=$q->fetch();
    if(!$row || $row['status']!=='aktif')deny_access();
    $period=$row['id_tahun_ajaran']===null ? null : (int)$row['id_tahun_ajaran'];
    if($write && $period===null)throw new InputError('Penugasan lama belum mempunyai periode. Nonaktifkan penugasan lama dan buat penugasan berperiode melalui administrator; arsip lama tetap dipertahankan.');
    teacher_assignment((int)$row['id_kelas'],(int)$row['id_mapel'],$period,$write);
    if($write && $date!==null){
        $days=[1=>'Senin',2=>'Selasa',3=>'Rabu',4=>'Kamis',5=>'Jumat'];
        if(($days[(int)(new DateTimeImmutable($date))->format('N')]??'')!==$row['hari'])throw new InputError('Tanggal tidak sesuai hari penugasan. Jadwal susulan memerlukan penugasan yang valid.');
    }
    return $row;
}
function student_in_class(string $nis, int $kelas, bool $active=true): array {
    $q=db()->prepare('SELECT * FROM siswa WHERE nis=? AND id_kelas=?'.($active?" AND status='aktif'":'').(db()->inTransaction()?' FOR UPDATE':''));$q->execute([$nis,$kelas]);$row=$q->fetch();if(!$row)deny_access();return $row;
}
function teacher_student(string $nis, ?int $kelas=null, ?int $period=null): array {
    $q=db()->prepare('SELECT * FROM siswa WHERE nis=?');$q->execute([$nis]);$s=$q->fetch();if(!$s)not_found();
    if($kelas!==null && (int)$s['id_kelas']!==$kelas)deny_access();
    teacher_assignment((int)$s['id_kelas'],null,$period);return $s;
}
function audit_change(string $entity, string $record, string $action, ?array $before, ?array $after): void {
    foreach(['password','password_hash','csrf_token','auth_fingerprint'] as $key){if($before!==null)unset($before[$key]);if($after!==null)unset($after[$key]);}
    $q=db()->prepare('INSERT INTO audit_aktivitas(actor_id,entity,record_id,action,before_json,after_json) VALUES(?,?,?,?,?,?)');
    $q->execute([current_user()['id_user'],$entity,$record,$action,$before===null?null:json_encode($before,JSON_THROW_ON_ERROR),$after===null?null:json_encode($after,JSON_THROW_ON_ERROR)]);
}
