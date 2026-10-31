<?php
declare(strict_types=1);
require_once __DIR__.'/attendance.php';

const AK_COMPONENTS=['tugas'=>'Tugas','uts'=>'UTS / Tengah Semester','uas'=>'UAS / Akhir Semester','praktik'=>'Praktik','proyek'=>'Proyek'];

function ak_save_rule(array $input): int {
    permission('teach');
    return db_transaction(function() use ($input): int {
        $schedule=ak_schedule(input_id($input,'id_jadwal'),true,input_date($input,'tanggal'));
        $weights=[];foreach(AK_COMPONENTS as $key=>$label)$weights[$key]=input_number($input,'bobot_'.$key);
        if(abs(array_sum($weights)-100)>0.00001)throw new InputError('Jumlah seluruh bobot harus tepat 100.');
        $scope=[$schedule['id_tahun_ajaran'],$schedule['id_kelas'],$schedule['id_mapel'],$schedule['id_guru']];
        $version=1+(int)ak_query('SELECT COALESCE(MAX(versi),0) FROM ak_aturan_nilai WHERE id_tahun_ajaran=? AND id_kelas=? AND id_mapel=? AND id_guru=?',$scope)->fetchColumn();
        $subject=active_reference('mata_pelajaran','id_mapel',$schedule['id_mapel']);
        ak_query("INSERT INTO ak_aturan_nilai(id_tahun_ajaran,id_kelas,id_mapel,id_guru,versi,bobot_json,kkm,formula,catatan,created_by) VALUES(?,?,?,?,?,?,?,'weighted_kkm_v1',?,?)",[...$scope,$version,json_encode($weights,JSON_THROW_ON_ERROR),$subject['kkm'],input_text($input,'catatan',500),ak_actor()]);
        $id=(int)db()->lastInsertId();ak_audit('aturan_nilai',$id,'versi_baru',null,ak_one('SELECT * FROM ak_aturan_nilai WHERE id=?',[$id]),'Versi baru; nilai existing tidak dihitung ulang.');return $id;
    });
}
function ak_calculate(array $scores,array $rule): array {
    if($rule['formula']!=='weighted_kkm_v1')throw new InputError('Versi formula tidak didukung.');
    $weights=json_decode($rule['bobot_json'],true,512,JSON_THROW_ON_ERROR);$total='0';
    foreach(AK_COMPONENTS as $key=>$label)$total=bcadd($total,bcmul((string)$scores[$key],(string)$weights[$key],6),6);
    $final=round((float)bcdiv($total,'100',6),2);
    return ['nilai_akhir'=>$final,'predikat'=>hitung_predikat_kkm($final,(float)$rule['kkm'])['predikat']];
}
function ak_save_grades(array $input): int {
    permission('teach');
    return db_transaction(function() use ($input): int {
        $date=input_date($input,'tanggal');$schedule=ak_schedule(input_id($input,'id_jadwal'),true,$date);
        $rule=ak_one('SELECT * FROM ak_aturan_nilai WHERE id=?',[input_id($input,'id_aturan')]);
        foreach(['id_guru','id_mapel','id_kelas','id_tahun_ajaran'] as $key)if(!$rule || (int)$rule[$key]!==(int)$schedule[$key])deny_access();
        $entries=$input['nilai']??null;
        if(!is_array($entries)||count($entries)<1||count($entries)>1000)throw new InputError('Isi satu atau lebih nilai siswa.');
        $roster=[];foreach(ak_roster((int)$schedule['id_kelas'],(int)$schedule['id_tahun_ajaran'],$date,true) as $row)$roster[$row['nis']]=$row;
        $reason=input_text($input,'alasan',500);$count=0;
        foreach($entries as $nis=>$entry) {
            if(!is_array($entry)||!isset($roster[$nis]))deny_access();$student=$roster[$nis];
            $before=ak_one('SELECT * FROM ak_nilai WHERE nis=? AND id_tahun_ajaran=? AND id_mapel=? FOR UPDATE',[$nis,$schedule['id_tahun_ajaran'],$schedule['id_mapel']]);
            if($before && ((int)$before['id_guru']!==(int)$schedule['id_guru'] || (int)$before['id_kelas']!==(int)$schedule['id_kelas'] || (int)$before['id_anggota']!==(int)$student['id']))deny_access();
            ak_check_revision($entry,$before);
            $scores=[];foreach(AK_COMPONENTS as $key=>$label)$scores[$key]=input_number($entry,$key);
            $result=ak_calculate($scores,$rule);$description=input_text($entry,'deskripsi',1000);
            $values=[$rule['id'],json_encode($scores,JSON_THROW_ON_ERROR),$result['nilai_akhir'],$result['predikat'],$description,ak_actor()];
            if($before){$id=(int)$before['id'];ak_query('UPDATE ak_nilai SET id_aturan=?,komponen_json=?,nilai_akhir=?,predikat=?,deskripsi=?,updated_by=?,revision=revision+1 WHERE id=?',[...$values,$id]);}
            else{ak_query('INSERT INTO ak_nilai(id_aturan,komponen_json,nilai_akhir,predikat,deskripsi,updated_by,nis,id_anggota,id_tahun_ajaran,id_kelas,id_mapel,id_guru,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',[...$values,$nis,$student['id'],$schedule['id_tahun_ajaran'],$schedule['id_kelas'],$schedule['id_mapel'],$schedule['id_guru'],ak_actor()]);$id=(int)db()->lastInsertId();}
            ak_audit('nilai',$id,$before?'ubah':'buat',$before,ak_one('SELECT * FROM ak_nilai WHERE id=?',[$id]),$reason);$count++;
        }
        return $count;
    });
}
function ak_grade_rows(int $scheduleId): array {
    $schedule=ak_schedule($scheduleId);
    return ak_rows('SELECT n.*,s.nama_siswa,r.versi AS versi_aturan,r.kkm,r.bobot_json FROM ak_nilai n JOIN siswa s ON s.nis=n.nis JOIN ak_aturan_nilai r ON r.id=n.id_aturan WHERE n.id_guru=? AND n.id_kelas=? AND n.id_mapel=? AND n.id_tahun_ajaran=? ORDER BY n.nis',[$schedule['id_guru'],$schedule['id_kelas'],$schedule['id_mapel'],$schedule['id_tahun_ajaran']]);
}
function ak_report_sources_hash(string $nis,int $period,int $class,string $date): string {
    $sources=[
        'nilai'=>ak_rows('SELECT id,revision FROM ak_nilai WHERE nis=? AND id_tahun_ajaran=? AND id_kelas=? ORDER BY id',[$nis,$period,$class]),
        'harian'=>ak_rows('SELECT id,revision FROM ak_absensi_harian WHERE nis=? AND id_tahun_ajaran=? AND id_kelas=? AND tanggal<=? ORDER BY id',[$nis,$period,$class,$date]),
        'anggota'=>ak_rows('SELECT * FROM ak_anggota_kelas WHERE nis=? AND id_tahun_ajaran=? AND id_kelas=? ORDER BY id',[$nis,$period,$class]),
        'periode'=>ak_one('SELECT * FROM ak_periode WHERE id_tahun_ajaran=?',[$period]),
        'kalender'=>ak_rows("SELECT id,revision FROM ak_kalender WHERE id_tahun_ajaran=? AND mulai<=? AND status='disahkan' ORDER BY id",[$period,$date]),
        'penugasan'=>ak_rows('SELECT j.id_jadwal,j.id_guru,j.id_mapel,p.mulai,p.selesai,p.terverifikasi FROM jadwal j JOIN ak_penugasan p ON p.id_jadwal=j.id_jadwal WHERE j.id_tahun_ajaran=? AND j.id_kelas=? AND p.terverifikasi=1 ORDER BY j.id_jadwal',[$period,$class]),
    ];
    return hash('sha256',json_encode($sources,JSON_THROW_ON_ERROR));
}
function ak_build_report(array $input): int {
    permission('rapor.publish');
    return db_transaction(function() use ($input): int {
        $periodId=input_id($input,'id_tahun_ajaran');$date=input_date($input,'tanggal');$period=ak_period($periodId,true,$date);
        if($date>date('Y-m-d'))throw new InputError('Batas rekap tidak boleh di masa mendatang.');
        $nis=input_text($input,'nis',15);
        $student=ak_one('SELECT a.*,s.nama_siswa,k.nama_kelas,j.nama_jurusan FROM ak_anggota_kelas a JOIN siswa s ON s.nis=a.nis JOIN kelas k ON k.id_kelas=a.id_kelas JOIN jurusan j ON j.id_jurusan=k.id_jurusan WHERE a.nis=? AND a.id_tahun_ajaran=? AND a.mulai<=? AND a.selesai>=? FOR UPDATE',[$nis,$periodId,$date,$date]);
        if(!$student)throw new InputError('Keanggotaan siswa pada batas tanggal rekap tidak ditemukan.');
        $subjects=ak_rows('SELECT DISTINCT j.id_mapel FROM jadwal j JOIN ak_penugasan p ON p.id_jadwal=j.id_jadwal WHERE j.id_tahun_ajaran=? AND j.id_kelas=? AND p.terverifikasi=1',[$periodId,$student['id_kelas']]);
        if(!$subjects)throw new InputError('Mata pelajaran terverifikasi belum ditetapkan.');
        $grades=ak_rows('SELECT n.*,m.nama_mapel,r.versi AS versi_aturan,r.kkm,r.formula FROM ak_nilai n JOIN mata_pelajaran m ON m.id_mapel=n.id_mapel JOIN ak_aturan_nilai r ON r.id=n.id_aturan WHERE n.nis=? AND n.id_tahun_ajaran=? AND n.id_kelas=? ORDER BY n.id_mapel',[$nis,$periodId,$student['id_kelas']]);
        $expected=array_map('intval',array_column($subjects,'id_mapel'));$actual=array_map('intval',array_column($grades,'id_mapel'));sort($expected);sort($actual);
        if($expected!==$actual)throw new InputError('Nilai seluruh mapel penugasan terverifikasi belum lengkap. Snapshot belum dibuat.');
        $counts=array_fill_keys(array_keys(AK_STATUSES),0);
        $daily=[];foreach(ak_rows('SELECT tanggal,status FROM ak_absensi_harian WHERE nis=? AND id_tahun_ajaran=? AND id_kelas=? AND tanggal<=?',[$nis,$periodId,$student['id_kelas'],$date]) as $row)$daily[$row['tanggal']]=$row['status'];
        for($d=new DateTimeImmutable(max($period['mulai'],$student['mulai']));$d->format('Y-m-d')<=min($date,$student['selesai']);$d=$d->modify('+1 day'))if(ak_school_day($period,$d->format('Y-m-d')))$counts[$daily[$d->format('Y-m-d')]??'B']++;
        $payload=['siswa'=>['nis'=>$nis,'nama'=>$student['nama_siswa'],'kelas'=>$student['nama_kelas'],'jurusan'=>$student['nama_jurusan'],'nomor_absen'=>$student['nomor_absen']],
            'periode'=>['tahun_ajaran'=>$period['tahun_ajaran'],'semester'=>$period['semester'],'mulai'=>$period['mulai'],'selesai'=>$period['selesai'],'batas_rekap'=>$date],
            'nilai'=>$grades,'kehadiran_harian'=>$counts,'formula_predikat'=>'weighted_kkm_v1','dibuat_pada'=>date(DATE_ATOM),
            'source_hash'=>ak_report_sources_hash($nis,$periodId,(int)$student['id_kelas'],$date)];
        $json=json_encode($payload,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);$hash=hash('sha256',$json);
        $version=1+(int)ak_query('SELECT COALESCE(MAX(versi),0) FROM ak_rapor_snapshot WHERE nis=? AND id_tahun_ajaran=?',[$nis,$periodId])->fetchColumn();
        ak_query('INSERT INTO ak_rapor_snapshot(nis,id_tahun_ajaran,id_kelas,versi,payload_json,payload_hash,created_by) VALUES(?,?,?,?,?,?,?)',[$nis,$periodId,$student['id_kelas'],$version,$json,$hash,ak_actor()]);$id=(int)db()->lastInsertId();
        ak_query("INSERT INTO ak_rapor_status(id_snapshot,status) VALUES(?,'draft')",[$id]);
        ak_audit('rapor',$id,'snapshot',null,['hash'=>$hash,'versi'=>$version],input_text($input,'alasan',500));return $id;
    });
}
function ak_report(int $id): array {
    require_role('admin','kepala_sekolah','siswa');
    $row=ak_one('SELECT r.*,s.status,s.revision,s.verified_by,s.published_by FROM ak_rapor_snapshot r JOIN ak_rapor_status s ON s.id_snapshot=r.id WHERE r.id=?',[$id]);
    if(!$row || (current_user()['role']==='siswa' && ((string)$row['nis']!==(string)user_reference() || $row['status']!=='diterbitkan')))deny_access();
    if(!hash_equals($row['payload_hash'],hash('sha256',$row['payload_json'])))throw new InputError('Integritas snapshot gagal. Rapor tidak dapat ditampilkan.');
    $row['payload']=json_decode($row['payload_json'],true,512,JSON_THROW_ON_ERROR);return $row;
}
function ak_transition_report(array $input): void {
    permission('rapor.publish');
    db_transaction(function() use ($input): void {
        $id=input_id($input,'id');$snapshot=ak_report($id);ak_period((int)$snapshot['id_tahun_ajaran'],true);
        $before=ak_one('SELECT * FROM ak_rapor_status WHERE id_snapshot=? FOR UPDATE',[$id]);ak_check_revision($input,$before);
        $next=input_choice($input,'status',['terverifikasi','diterbitkan','ditarik']);$reason=input_text($input,'alasan',500);
        if($next!=='ditarik' && !hash_equals($snapshot['payload']['source_hash']??'',ak_report_sources_hash($snapshot['nis'],(int)$snapshot['id_tahun_ajaran'],(int)$snapshot['id_kelas'],$snapshot['payload']['periode']['batas_rekap'])))throw new InputError('Sumber nilai, kehadiran, atau konteks akademik telah berubah. Buat dan verifikasi snapshot baru sebelum penerbitan.');
        $allowed=['draft'=>['terverifikasi'],'terverifikasi'=>['diterbitkan','ditarik'],'diterbitkan'=>['ditarik'],'ditarik'=>[]];
        if(!in_array($next,$allowed[$before['status']],true))throw new InputError('Transisi rapor tidak diizinkan. Buat snapshot baru untuk revisi.');
        $verified=$next==='terverifikasi'?ak_actor():$before['verified_by'];$published=$next==='diterbitkan'?ak_actor():$before['published_by'];
        ak_query('UPDATE ak_rapor_status SET status=?,revision=revision+1,verified_by=?,published_by=? WHERE id_snapshot=?',[$next,$verified,$published,$id]);
        ak_audit('rapor',$id,$next,$before,['status'=>$next,'verified_by'=>$verified,'published_by'=>$published],$reason);
    });
}
