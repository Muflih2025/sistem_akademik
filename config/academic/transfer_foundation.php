<?php
declare(strict_types=1);
require_once __DIR__.'/foundation.php';

function ak_preview_foundation_import(string $module,array $input,array $rows): array {
    permission('master.manage');$period=ak_period(input_id($input,'id_tahun_ajaran'));
    if($period['status']!=='Aktif'||(int)$period['dikunci'])deny_access();
    $prior=[];
    foreach($rows as $row){
        $class=input_id($row,'id_kelas');
        if(!ak_one("SELECT id_kelas FROM kelas WHERE id_kelas=? AND status='aktif'",[$class]))throw new InputError('Kelas tidak aktif atau tidak ditemukan.');
        $from=input_date($row,'mulai');$until=input_date($row,'selesai');
        if($from>$until||$from<$period['mulai']||$until>$period['selesai'])throw new InputError('Rentang tanggal di luar periode terverifikasi.');
        if($module==='anggota'){
            $nis=input_text($row,'nis',15);$number=input_id($row,'nomor_absen');if($number>1000)throw new InputError('Nomor absen maksimal 1000.');
            if(!ak_one("SELECT nis FROM siswa WHERE nis=? AND status='aktif'",[$nis]))throw new InputError('Siswa tidak aktif atau tidak dikenal.');
            if(ak_one('SELECT id FROM ak_anggota_kelas WHERE id_tahun_ajaran=? AND mulai<=? AND selesai>=? AND (nis=? OR (id_kelas=? AND nomor_absen=?)) LIMIT 1',[$period['id_tahun_ajaran'],$until,$from,$nis,$class,$number]))throw new InputError('Keanggotaan/nomor absen bertumpang tindih dengan database.');
            if(ak_one('SELECT id FROM ak_pertemuan WHERE id_kelas=? AND id_tahun_ajaran=? AND tanggal BETWEEN ? AND ? LIMIT 1',[$class,$period['id_tahun_ajaran'],$from,$until]))throw new InputError('Impor tidak dapat menambah anggota retroaktif pada pertemuan tersimpan.');
            foreach($prior as $old)if($old['id_kelas']===$row['id_kelas']&&$old['nomor_absen']===$row['nomor_absen']&&$old['mulai']<=$until&&$old['selesai']>=$from)throw new InputError('Nomor absen ganda di dalam batch.');
        }else{
            $guru=input_id($row,'id_guru');$mapel=input_id($row,'id_mapel');
            if(!ak_one("SELECT id_guru FROM guru WHERE id_guru=? AND status='aktif'",[$guru])||!ak_one("SELECT id_mapel FROM mata_pelajaran WHERE id_mapel=? AND status='aktif'",[$mapel]))throw new InputError('Guru atau mapel tidak aktif/tidak dikenal.');
            $day=input_choice($row,'hari',['Senin','Selasa','Rabu','Kamis','Jumat']);
            $start=input_text($row,'jam_mulai',8);$end=input_text($row,'jam_selesai',8);
            foreach([$start,$end] as $time)if(!preg_match('/^(?:[01][0-9]|2[0-3]):[0-5][0-9](?::[0-5][0-9])?$/D',$time))throw new InputError('Format jam tidak valid.');
            $start=str_pad($start,8,':00');$end=str_pad($end,8,':00');if($start>=$end)throw new InputError('Jam selesai harus sesudah jam mulai.');
            $room=input_text($row,'ruang',20,false);input_text($row,'catatan',500);
            if(app_setting('ROOM_CATALOG_ENFORCED')==='1'&&$room!==''&&!ak_one("SELECT id_ruang FROM ak_ruang WHERE nama_ruang=? AND status='aktif'",[$room]))throw new InputError('Ruang belum terdaftar atau nonaktif.');
            if(ak_one("SELECT id_jadwal FROM jadwal WHERE status='aktif' AND (id_tahun_ajaran=? OR id_tahun_ajaran IS NULL) AND hari=? AND jam_mulai<? AND jam_selesai>? AND (id_guru=? OR id_kelas=? OR (?<>'' AND ruang=?)) LIMIT 1",[$period['id_tahun_ajaran'],$day,$end,$start,$guru,$class,$room,$room]))throw new InputError('Jadwal bentrok dengan database.');
            foreach($prior as $old)if($old['hari']===$day&&$old['jam_mulai']<$end&&$old['jam_selesai']>$start&&($old['id_guru']===$row['id_guru']||$old['id_kelas']===$row['id_kelas']||($room!==''&&$old['ruang']===$room)))throw new InputError('Jadwal bentrok di dalam batch.');
            $row['jam_mulai']=$start;$row['jam_selesai']=$end;
        }
        $prior[]=$row;
    }
    return ['id_tahun_ajaran'=>(int)$period['id_tahun_ajaran']];
}
function ak_commit_foundation_import(array $preview,array $input): int {
    permission('master.manage');$context=$preview['context'];
    if($preview['module']==='penugasan'&&($input['terverifikasi']??'')!=='1')throw new InputError('Konfirmasikan verifikasi administratif penugasan sebelum menerapkan impor.');
    foreach($preview['rows'] as $row){
        if($preview['module']==='anggota')ak_save_member($row+['id_tahun_ajaran'=>$context['id_tahun_ajaran'],'alasan'=>$context['alasan']]);
        else{
            $id=save_schedule($row+['action'=>'create','id_tahun_ajaran'=>$context['id_tahun_ajaran']]);
            ak_save_assignment_window(['id_jadwal'=>$id,'mulai'=>$row['mulai'],'selesai'=>$row['selesai'],'terverifikasi'=>'1','catatan'=>$row['catatan']]);
        }
    }
    return count($preview['rows']);
}
