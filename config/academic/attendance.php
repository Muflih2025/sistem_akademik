<?php
declare(strict_types=1);
require_once __DIR__.'/foundation.php';

function ak_schedule(int $id, bool $write=false, ?string $date=null): array {
    require_role('guru');
    $row=ak_one('SELECT j.*,k.nama_kelas,m.nama_mapel,g.nama_guru FROM jadwal j JOIN kelas k ON k.id_kelas=j.id_kelas JOIN mata_pelajaran m ON m.id_mapel=j.id_mapel JOIN guru g ON g.id_guru=j.id_guru WHERE j.id_jadwal=? AND j.id_guru=?',[$id,user_reference()]);
    if (!$row || $row['id_tahun_ajaran']===null) deny_access();
    $window=ak_one('SELECT * FROM ak_penugasan WHERE id_jadwal=?',[$id]);
    if (!$window || !(int)$window['terverifikasi'] || ($date!==null && ($date<$window['mulai'] || $date>$window['selesai']))) deny_access();
    $period=ak_period((int)$row['id_tahun_ajaran'],$write,$date);
    if ($write) {
        own_schedule($id,true,$date);
        if ($date!==null) ak_write_day($period,$date);
    }
    $row['berlaku_mulai']=$window['mulai'];$row['berlaku_selesai']=$window['selesai'];
    return $row;
}
function ak_teacher_schedules(): array {
    require_role('guru');
    return ak_rows("SELECT j.*,k.nama_kelas,m.nama_mapel,w.mulai,w.selesai FROM jadwal j JOIN kelas k ON k.id_kelas=j.id_kelas JOIN mata_pelajaran m ON m.id_mapel=j.id_mapel JOIN tahun_ajaran t ON t.id_tahun_ajaran=j.id_tahun_ajaran JOIN ak_periode p ON p.id_tahun_ajaran=t.id_tahun_ajaran JOIN ak_penugasan w ON w.id_jadwal=j.id_jadwal WHERE j.id_guru=? AND j.status='aktif' AND k.status='aktif' AND m.status='aktif' AND p.terverifikasi=1 AND w.terverifikasi=1 ORDER BY k.nama_kelas,FIELD(j.hari,'Senin','Selasa','Rabu','Kamis','Jumat'),j.jam_mulai",[user_reference()]);
}
// Pick a readable date from the assignment, never extend its authorization window.
function ak_default_schedule_date(array $schedule, array $period, ?string $today=null): ?string {
    $days=['Senin'=>1,'Selasa'=>2,'Rabu'=>3,'Kamis'=>4,'Jumat'=>5];
    if (!isset($days[$schedule['hari']])) throw new InputError('Hari jadwal tidak valid.');
    $today=$today??date('Y-m-d');
    $start=max($schedule['berlaku_mulai'],$period['mulai']);
    $end=min($today,$schedule['berlaku_selesai'],$period['selesai']);
    if ($start>$end) return null;
    $date=new DateTimeImmutable($end);
    $offset=((int)$date->format('N')-$days[$schedule['hari']]+7)%7;
    if ($offset) $date=$date->modify('-'.$offset.' days');
    $result=$date->format('Y-m-d');
    return $result>=$start?$result:null;
}
function ak_meeting_rows(int $meeting): array {
    return ak_rows('SELECT * FROM ak_absensi_sesi WHERE id_pertemuan=? ORDER BY nomor_absen,nis',[$meeting]);
}
function ak_save_meeting(array $input): int {
    permission('teach');
    return db_transaction(function() use ($input): int {
        $schedule=ak_schedule(input_id($input,'id_jadwal'),true,input_date($input,'tanggal'));
        $date=input_date($input,'tanggal');
        $before=ak_one('SELECT * FROM ak_pertemuan WHERE id_jadwal=? AND tanggal=? FOR UPDATE',[$schedule['id_jadwal'],$date]);
        ak_check_revision($input,$before);
        $reason=input_text($input,'alasan',500,$before!==null);
        if ($reason==='') $reason='Pengisian pertama terverifikasi';
        $roster=ak_roster((int)$schedule['id_kelas'],(int)$schedule['id_tahun_ajaran'],$date,true);
        if (!$roster) throw new InputError('Anggota kelas pada tanggal ini belum ditetapkan admin.');
        $statuses=$input['status']??null; $notes=$input['keterangan']??[];
        if (!is_array($statuses) || !is_array($notes) || count($statuses)!==count($roster)) throw new InputError('Isi status seluruh anggota kelas, tanpa tambahan atau pengurangan siswa.');
        $prepared=[]; $hasVerified=false;
        foreach ($roster as $student) {
            $nis=(string)$student['nis'];
            if (!array_key_exists($nis,$statuses) || !is_string($statuses[$nis]) || !array_key_exists($statuses[$nis],AK_STATUSES)) throw new InputError('Status siswa tidak valid atau belum diisi.');
            $status=$statuses[$nis];
            if ($status!=='B') $hasVerified=true;
            $note=input_text(['note'=>$notes[$nis]??''],'note',500,false);
            $prepared[$nis]=['member'=>$student,'status'=>$status,'keterangan'=>$note];
        }
        if ($hasVerified && ($input['terverifikasi']??'')!=='1') throw new InputError('Konfirmasikan bahwa kehadiran telah diperiksa. Status belum diverifikasi tetap B.');
        $number=input_id($input,'pertemuan_ke'); if ($number>1000) throw new InputError('Nomor pertemuan maksimal 1000.');
        $replacement=($input['id_guru_pengganti']??'')!==''?input_id($input,'id_guru_pengganti'):null;
        if ($replacement!==null) active_reference('guru','id_guru',$replacement);
        $data=['pertemuan_ke'=>$number,'jam_ke'=>input_text($input,'jam_ke',30),
            'tp_atp'=>input_text($input,'tp_atp',5000,false),'materi'=>input_text($input,'materi',5000),
            'kegiatan'=>input_text($input,'kegiatan',5000),'id_guru_pengganti'=>$replacement,
            'refleksi'=>input_text($input,'refleksi',5000,false),'catatan'=>input_text($input,'catatan',5000,false),
            'tindak_lanjut'=>input_text($input,'tindak_lanjut',5000,false)];
        $actor=ak_actor();
        if ($before) {
            // Schedule identity cannot be rebound after history exists.
            foreach (['id_guru','id_kelas','id_mapel','id_tahun_ajaran'] as $field) if ((int)$before[$field] !== (int)$schedule[$field]) deny_access();
            $id=(int)$before['id'];
            $set=implode(',',array_map(fn($key)=>$key.'=?',array_keys($data)));
            ak_query('UPDATE ak_pertemuan SET '.$set.',revision=revision+1,updated_by=? WHERE id=?',[...array_values($data),$actor,$id]);
        } else {
            $identity=['id_jadwal'=>$schedule['id_jadwal'],'id_tahun_ajaran'=>$schedule['id_tahun_ajaran'],'id_kelas'=>$schedule['id_kelas'],'id_guru'=>$schedule['id_guru'],'id_mapel'=>$schedule['id_mapel'],'tanggal'=>$date];
            $values=$identity+$data+['created_by'=>$actor,'updated_by'=>$actor];
            ak_query('INSERT INTO ak_pertemuan('.implode(',',array_keys($values)).') VALUES('.implode(',',array_fill(0,count($values),'?')).')',array_values($values));
            $id=(int)db()->lastInsertId();
        }
        $oldRows=[];
        foreach (ak_meeting_rows($id) as $row) $oldRows[$row['nis']]=$row;
        if ($before && count($oldRows)!==count($prepared)) throw new InputError('Roster historis berbeda; diperlukan pemeriksaan admin. Tidak ada perubahan disimpan.');
        foreach ($prepared as $nis=>$item) {
            $student=$item['member']; $old=$oldRows[$nis]??null;
            if ($before && (!$old || (int)$old['id_anggota']!==(int)$student['id'])) throw new InputError('Identitas anggota historis berubah; diperlukan pemeriksaan admin.');
            $status=$item['status']; $note=$item['keterangan'];
            if ($old) ak_query('UPDATE ak_absensi_sesi SET status=?,keterangan=?,updated_by=? WHERE id_pertemuan=? AND nis=?',[$status,$note,$actor,$id,$nis]);
            else ak_query('INSERT INTO ak_absensi_sesi(id_pertemuan,nis,id_anggota,nomor_absen,nama_snapshot,status,keterangan,created_by,updated_by) VALUES(?,?,?,?,?,?,?,?,?)',[$id,$nis,$student['id'],$student['nomor_absen'],$student['nama_siswa'],$status,$note,$actor,$actor]);
            if (!$old || $old['status']!==$status || $old['keterangan']!==$note) ak_audit('sesi',$id.':'.$nis,$old?'koreksi':'isi',$old,['status'=>$status,'keterangan'=>$note,'created_by'=>$old['created_by']??$actor,'updated_by'=>$actor],$reason);
        }
        ak_audit('pertemuan',$id,$before?'ubah':'buat',$before,ak_one('SELECT * FROM ak_pertemuan WHERE id=?',[$id]),$reason);
        return $id;
    });
}
function ak_summary(array $rows): array {
    $out=array_fill_keys(array_keys(AK_STATUSES),0);
    foreach ($rows as $row) { $status=$row['status']??'B'; if (array_key_exists($status,$out)) $out[$status]++; }
    return $out;
}
function ak_day_schedules(int $class,int $period,string $date): array {
    $days=[1=>'Senin',2=>'Selasa',3=>'Rabu',4=>'Kamis',5=>'Jumat'];
    $day=$days[(int)(new DateTimeImmutable($date))->format('N')]??'';
    // Dated verified assignment is the expectation, independent of later soft-deactivation.
    return ak_rows("SELECT j.id_jadwal,p.id AS id_pertemuan,p.revision FROM jadwal j JOIN ak_penugasan w ON w.id_jadwal=j.id_jadwal LEFT JOIN ak_pertemuan p ON p.id_jadwal=j.id_jadwal AND p.tanggal=? WHERE j.id_kelas=? AND j.id_tahun_ajaran=? AND j.hari=? AND w.terverifikasi=1 AND w.mulai<=? AND w.selesai>=? ORDER BY j.id_jadwal",[$date,$class,$period,$day,$date,$date]);
}
function ak_reconciliation_preview(int $class,int $period,string $date): array {
    ak_require_duty($class,$period,$date); ak_period($period,false,$date);
    $roster=ak_roster($class,$period,$date);
    $schedules=ak_day_schedules($class,$period,$date);
    $sessionRows=ak_rows('SELECT a.nis,a.status,a.keterangan,a.id_pertemuan,p.id_jadwal,p.revision FROM ak_absensi_sesi a JOIN ak_pertemuan p ON p.id=a.id_pertemuan WHERE p.id_kelas=? AND p.id_tahun_ajaran=? AND p.tanggal=? ORDER BY p.id_jadwal,a.nis',[$class,$period,$date]);
    $byStudent=[]; foreach ($sessionRows as $row) $byStudent[$row['nis']][]=$row;
    $out=[];
    foreach ($roster as $student) {
        $evidence=['jadwal'=>$schedules,'sesi'=>$byStudent[$student['nis']]??[]];
        $statuses=array_column($evidence['sesi'],'status'); $unique=array_unique($statuses);
        $complete=count($schedules)>0 && count($statuses)===count($schedules) && !in_array(null,array_column($schedules,'id_pertemuan'),true);
        $status=$complete && count($unique)===1 && $unique[0]!=='B'?$unique[0]:'B';
        $notes=array_values(array_unique(array_filter(array_column($evidence['sesi'],'keterangan'),fn($note)=>trim($note)!=='')));
        $description=$status==='B'?'Bukti sesi belum lengkap, belum dikonfirmasi, atau saling berbeda.':'Konsensus semua sesi terjadwal.';
        if($notes)$description.=' '.implode(' · ',$notes);
        $out[]=$student+['status'=>$status,'bukti'=>$evidence,'evidence_hash'=>hash('sha256',json_encode($evidence,JSON_THROW_ON_ERROR)),'keterangan'=>mb_substr($description,0,500)];
    }
    return $out;
}
function ak_reconcile(array $input): int {
    return db_transaction(function() use ($input): int {
        $class=input_id($input,'id_kelas'); $periodId=input_id($input,'id_tahun_ajaran'); $date=input_date($input,'tanggal');
        $period=ak_period($periodId,true,$date); ak_write_day($period,$date);
        ak_require_duty($class,$periodId,$date,false,true);
        $reason=input_text($input,'alasan',500); $count=0;
        $preview=ak_reconciliation_preview($class,$periodId,$date);
        if (!$preview) throw new InputError('Tidak ada anggota kelas terverifikasi pada tanggal ini.');
        foreach ($preview as $row) {
            $before=ak_one('SELECT * FROM ak_absensi_harian WHERE tanggal=? AND nis=? FOR UPDATE',[$date,$row['nis']]);
            if ($before && ((int)$before['id_kelas']!==$class || (int)$before['id_tahun_ajaran']!==$periodId)) throw new InputError('Sudah ada data harian pada konteks kelas/periode lain. Periksa keanggotaan.');
            if ($before && $before['evidence_hash']===$row['evidence_hash']) continue;
            if ($before && ($before['status']!=='B' || $before['metode']==='manual')) ak_require_duty($class,$periodId,$date,true,true);
            $values=[$row['status'],$row['keterangan'],json_encode($row['bukti'],JSON_THROW_ON_ERROR),$row['evidence_hash'],ak_actor()];
            if ($before) {
                $id=(int)$before['id'];
                ak_query("UPDATE ak_absensi_harian SET status=?,keterangan=?,bukti_json=?,evidence_hash=?,updated_by=?,metode='konsensus',revision=revision+1 WHERE id=?",[...$values,$id]);
            } else {
                ak_query("INSERT INTO ak_absensi_harian(status,keterangan,bukti_json,evidence_hash,updated_by,metode,tanggal,nis,id_tahun_ajaran,id_kelas,id_anggota,created_by) VALUES(?,?,?,?,?,'konsensus',?,?,?,?,?,?)",[...$values,$date,$row['nis'],$periodId,$class,$row['id'],ak_actor()]);
                $id=(int)db()->lastInsertId();
            }
            ak_audit('harian',$id,$before?'rekonsiliasi_ulang':'rekonsiliasi',$before,ak_one('SELECT * FROM ak_absensi_harian WHERE id=?',[$id]),$reason); $count++;
        }
        return $count;
    });
}
function ak_correct_daily(array $input): void {
    db_transaction(function() use ($input): void {
        $class=input_id($input,'id_kelas'); $periodId=input_id($input,'id_tahun_ajaran'); $date=input_date($input,'tanggal');
        $period=ak_period($periodId,true,$date); ak_write_day($period,$date);ak_require_duty($class,$periodId,$date,true,true);
        $id=input_id($input,'id'); $before=ak_one('SELECT * FROM ak_absensi_harian WHERE id=? FOR UPDATE',[$id]);
        if (!$before || (int)$before['id_kelas']!==$class || (int)$before['id_tahun_ajaran']!==$periodId || $before['tanggal']!==$date) deny_access();
        ak_check_revision($input,$before);
        $status=input_choice($input,'status',array_keys(AK_STATUSES)); $note=input_text($input,'keterangan',500);
        $reason=input_text($input,'alasan',500);
        ak_query("UPDATE ak_absensi_harian SET status=?,keterangan=?,metode='manual',revision=revision+1,updated_by=? WHERE id=?",[$status,$note,ak_actor(),$id]);
        ak_audit('harian',$id,'koreksi_manual',$before,ak_one('SELECT * FROM ak_absensi_harian WHERE id=?',[$id]),$reason);
    });
}
function ak_daily_roster(int $class,int $period,string $date): array {
    ak_require_duty($class,$period,$date); ak_period($period,false,$date);
    return ak_rows("SELECT a.*,s.nama_siswa,COALESCE(h.status,'B') AS status,h.id AS id_harian,h.revision,h.keterangan,h.evidence_hash,h.metode FROM ak_anggota_kelas a JOIN siswa s ON s.nis=a.nis LEFT JOIN ak_absensi_harian h ON h.id_anggota=a.id AND h.tanggal=? WHERE a.id_kelas=? AND a.id_tahun_ajaran=? AND a.mulai<=? AND a.selesai>=? ORDER BY a.nomor_absen,a.nis",[$date,$class,$period,$date,$date]);
}
