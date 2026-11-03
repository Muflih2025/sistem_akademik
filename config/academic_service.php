<?php
declare(strict_types=1);
require_once __DIR__.'/crud_service.php';
function save_attendance(array $input):void {
    permission('teach');
    if(($input['action']??'save')==='delete')deny_access();input_choice($input+['action'=>'save'],'action',['save']); // Correction is audited; no destructive attendance deletion in R1.
    $id=input_id($input,'id_jadwal');$date=input_date($input,'tanggal');$nis=input_text($input,'nis',15);$status=input_choice($input,'status',['Hadir','Sakit','Izin','Alpa']);$note=input_text($input,'keterangan',255,false);
    db_transaction(function(PDO $pdo)use($id,$date,$nis,$status,$note,$input):void{
        $schedule=own_schedule($id,true,$date);locked_row('tahun_ajaran','id_tahun_ajaran',$schedule['id_tahun_ajaran']);active_period((int)$schedule['id_tahun_ajaran'],true);student_in_class($nis,(int)$schedule['id_kelas']);
        $q=$pdo->prepare('SELECT * FROM absensi WHERE tanggal=? AND nis=? AND id_jadwal=? FOR UPDATE');$q->execute([$date,$nis,$id]);$before=$q->fetch()?:null;
        if(isset($input['id_absen']) && ($before===null || input_id($input,'id_absen')!==(int)$before['id_absen']))deny_access();
        $pdo->prepare('INSERT INTO absensi(tanggal,nis,id_jadwal,status,keterangan,created_by) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status),keterangan=VALUES(keterangan),created_by=VALUES(created_by)')->execute([$date,$nis,$id,$status,$note?:null,current_user()['id_user']]);
        $q=$pdo->prepare('SELECT * FROM absensi WHERE tanggal=? AND nis=? AND id_jadwal=?');$q->execute([$date,$nis,$id]);$after=$q->fetch();audit_change('absensi',(string)$after['id_absen'],$before?'update':'create',$before,$after);
    });
}
function save_journal(array $input):void {
    permission('teach');$id=input_id($input,'id_jadwal');$date=input_date($input,'tanggal');$meeting=input_id($input,'pertemuan_ke');
    $material=input_text($input,'materi',10000);$reflection=input_text($input,'refleksi',10000,false);$activity=input_text($input,'kegiatan',10000,false);$note=input_text($input,'catatan',10000,false);$hours=input_text($input,'jam_ke',30,false);$replacement=input_text($input,'guru_pengganti',100,false);
    if($replacement!=='')throw new InputError('Delegasi guru pengganti belum tersedia; gunakan penugasan resmi, bukan nama pengganti bebas.');
    db_transaction(function(PDO $pdo)use($input,$id,$date,$meeting,$material,$reflection,$activity,$note,$hours):void{
        $schedule=own_schedule($id,true,$date);locked_row('tahun_ajaran','id_tahun_ajaran',$schedule['id_tahun_ajaran']);active_period((int)$schedule['id_tahun_ajaran'],true);
        $q=$pdo->prepare("SELECT nis FROM siswa WHERE id_kelas=? AND status='aktif' ORDER BY nis FOR UPDATE");$q->execute([$schedule['id_kelas']]);$roster=$q->fetchAll(PDO::FETCH_COLUMN);
        $statuses=$input['status_custom']??null;$notes=$input['ket_custom']??[];
        if(!is_array($statuses) || !is_array($notes))throw new InputError('Daftar absensi tidak lengkap.');
        $keys=array_map('strval',array_keys($statuses));sort($keys,SORT_STRING);$expected=array_map('strval',$roster);sort($expected,SORT_STRING);
        if($keys!==$expected || !$expected)throw new InputError('Daftar siswa harus tepat sesuai seluruh siswa aktif pada kelas.');
        foreach($roster as $nis){input_choice(['status'=>$statuses[$nis]],'status',['Hadir','Sakit','Izin','Alpa']);input_text(['keterangan'=>$notes[$nis]??''],'keterangan',255,false);}
        $q=$pdo->prepare('SELECT * FROM jurnal_kelas WHERE id_jadwal=? AND tanggal=? FOR UPDATE');$q->execute([$id,$date]);$before=$q->fetch()?:null;
        if($before && (int)$before['id_guru']!==(int)user_reference())deny_access();
        $pdo->prepare('INSERT INTO jurnal_kelas(id_jadwal,id_guru,id_kelas,id_mapel,tanggal,pertemuan_ke,jam_ke,materi,kegiatan,refleksi,catatan) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE pertemuan_ke=VALUES(pertemuan_ke),jam_ke=VALUES(jam_ke),materi=VALUES(materi),kegiatan=VALUES(kegiatan),refleksi=VALUES(refleksi),catatan=VALUES(catatan)')->execute([$id,user_reference(),$schedule['id_kelas'],$schedule['id_mapel'],$date,$meeting,$hours?:null,$material,$activity?:null,$reflection?:null,$note?:null]);
        foreach($roster as $nis)save_attendance(['id_jadwal'=>(string)$id,'tanggal'=>$date,'nis'=>(string)$nis,'status'=>$statuses[$nis],'keterangan'=>$notes[$nis]??'']);
        $q->execute([$id,$date]);$after=$q->fetch();audit_change('jurnal_kelas',(string)$after['id_jurnal'],$before?'update':'create',$before,$after);
    });
}
function save_teacher_grade(array $input):void {
    permission('teach');$class=input_id($input,'id_kelas');$subject=input_id($input,'id_mapel');$nis=input_text($input,'nis',15);
    db_transaction(function(PDO $pdo)use($input,$class,$subject,$nis):void{
        $period=active_period(null,true);if(isset($input['id_tahun_ajaran']) && input_id($input,'id_tahun_ajaran')!==(int)$period['id_tahun_ajaran'])deny_access();if(isset($input['id_guru']) && input_id($input,'id_guru')!==(int)user_reference())deny_access();locked_row('tahun_ajaran','id_tahun_ajaran',$period['id_tahun_ajaran']);active_period((int)$period['id_tahun_ajaran'],true);
        teacher_assignment($class,$subject,(int)$period['id_tahun_ajaran'],true);student_in_class($nis,$class);
        $values=[];foreach(['nilai_tugas','nilai_uts','nilai_uas','nilai_praktik','nilai_ekstra'] as $key)$values[$key]=input_number($input+['nilai_praktik'=>'0','nilai_ekstra'=>'0'],$key);
        $q=$pdo->prepare('SELECT * FROM nilai WHERE nis=? AND id_mapel=? AND id_tahun_ajaran=? FOR UPDATE');$q->execute([$nis,$subject,$period['id_tahun_ajaran']]);$before=$q->fetch()?:null;
        if($before && (int)$before['id_guru']!==(int)user_reference())deny_access();
        if(isset($input['id_nilai']) && (!$before || input_id($input,'id_nilai')!==(int)$before['id_nilai']))deny_access();
        $weight=get_bobot_penilaian((int)user_reference(),$subject,$class);$final=hitung_nilai_akhir_berbobot(...[...array_values($values),$weight]);
        $pdo->prepare('INSERT INTO nilai(nis,id_mapel,id_guru,id_tahun_ajaran,nilai_tugas,nilai_uts,nilai_uas,nilai_praktik,nilai_ekstra,nilai_akhir) VALUES(?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE nilai_tugas=VALUES(nilai_tugas),nilai_uts=VALUES(nilai_uts),nilai_uas=VALUES(nilai_uas),nilai_praktik=VALUES(nilai_praktik),nilai_ekstra=VALUES(nilai_ekstra),nilai_akhir=VALUES(nilai_akhir)')->execute([$nis,$subject,user_reference(),$period['id_tahun_ajaran'],...array_values($values),$final]);
        $q->execute([$nis,$subject,$period['id_tahun_ajaran']]);$after=$q->fetch();audit_change('nilai',(string)$after['id_nilai'],$before?'update':'create',$before,$after);
    });
}
function save_admin_grade(array $input):void {
    permission('grades.admin');$id=input_id($input,'id_nilai');
    db_transaction(function(PDO $pdo)use($id,$input):void{
        $before=locked_row('nilai','id_nilai',$id);locked_row('tahun_ajaran','id_tahun_ajaran',$before['id_tahun_ajaran']);active_period((int)$before['id_tahun_ajaran'],true);
        $q=$pdo->prepare('SELECT id_kelas FROM siswa WHERE nis=?');$q->execute([$before['nis']]);$class=(int)$q->fetchColumn();
        $values=[];foreach(['nilai_tugas','nilai_uts','nilai_uas','nilai_praktik','nilai_ekstra'] as $key)$values[$key]=input_number($input+[$key=>(string)$before[$key]],$key);
        $weight=get_bobot_penilaian((int)$before['id_guru'],(int)$before['id_mapel'],$class);$final=hitung_nilai_akhir_berbobot(...[...array_values($values),$weight]);
        $pdo->prepare('UPDATE nilai SET nilai_tugas=?,nilai_uts=?,nilai_uas=?,nilai_praktik=?,nilai_ekstra=?,nilai_akhir=? WHERE id_nilai=?')->execute([...array_values($values),$final,$id]);
        audit_change('nilai',(string)$id,'admin_update',$before,$values+['nilai_akhir'=>$final]);
    });
}
function save_weights(array $input,bool $admin=false):void {
    $admin?permission('grades.admin'):permission('teach');$period=active_period(null,true);
    $subject=($input['id_mapel']??'')!=='' && ($input['id_mapel']??'')!=='0'?input_id($input,'id_mapel'):null;
    $class=(!$admin && ($input['id_kelas']??'')!=='' && ($input['id_kelas']??'')!=='0')?input_id($input,'id_kelas'):null;
    if(!$admin && $subject===null)deny_access();
    if(!$admin){
        if($class===null){$q=db()->prepare("SELECT id_kelas FROM jadwal WHERE id_guru=? AND id_mapel=? AND id_tahun_ajaran=? AND status='aktif' LIMIT 1");$q->execute([user_reference(),$subject,$period['id_tahun_ajaran']]);$match=$q->fetchColumn();if(!$match)deny_access();teacher_assignment((int)$match,$subject,(int)$period['id_tahun_ajaran'],true);}
        else teacher_assignment($class,$subject,(int)$period['id_tahun_ajaran'],true);
    }
    $data=[];foreach(['bobot_tugas','bobot_uts','bobot_uas','bobot_praktik','bobot_ekstra'] as $key)$data[$key]=input_number($input+['bobot_ekstra'=>'0'],$key);
    if(abs(array_sum($data)-100)>0.001)throw new InputError('Total bobot harus tepat 100%.');$name=input_text($input,'nama_ekstra',50,false);
    db_transaction(function(PDO $pdo)use($admin,$subject,$class,$period,$data,$name):void{
        locked_row('tahun_ajaran','id_tahun_ajaran',$period['id_tahun_ajaran']);active_period((int)$period['id_tahun_ajaran'],true);if($subject!==null)active_reference('mata_pelajaran','id_mapel',$subject);
        if(!$admin){if($class!==null)teacher_assignment($class,$subject,(int)$period['id_tahun_ajaran'],true);else{$check=$pdo->prepare("SELECT id_kelas FROM jadwal WHERE id_guru=? AND id_mapel=? AND id_tahun_ajaran=? AND status='aktif' LIMIT 1");$check->execute([user_reference(),$subject,$period['id_tahun_ajaran']]);$current=$check->fetchColumn();if(!$current)deny_access();teacher_assignment((int)$current,$subject,(int)$period['id_tahun_ajaran'],true);}}
        $teacher=$admin?null:(int)user_reference();$q=$pdo->prepare('SELECT * FROM bobot_penilaian WHERE id_guru<=>? AND id_mapel<=>? AND id_kelas<=>? FOR UPDATE');$q->execute([$teacher,$subject,$class]);$rows=$q->fetchAll();if(count($rows)>1)throw new InputError('Default bobot duplikat memerlukan peninjauan; tidak diubah otomatis.');$old=$rows[0]??null;
        if($old){$pdo->prepare('UPDATE bobot_penilaian SET bobot_tugas=?,bobot_uts=?,bobot_uas=?,bobot_praktik=?,bobot_ekstra=?,nama_ekstra=? WHERE id_bobot=?')->execute([...array_values($data),$name?:null,$old['id_bobot']]);$id=$old['id_bobot'];}
        else{$pdo->prepare('INSERT INTO bobot_penilaian(id_guru,id_mapel,id_kelas,bobot_tugas,bobot_uts,bobot_uas,bobot_praktik,bobot_ekstra,nama_ekstra) VALUES(?,?,?,?,?,?,?,?,?)')->execute([$teacher,$subject,$class,...array_values($data),$name?:null]);$id=$pdo->lastInsertId();}
        audit_change('bobot_penilaian',(string)$id,$old?'update':'create',$old,$data);
    });
}
function save_extracurricular(array $input):void {
    permission('teach');$class=input_id($input,'id_kelas');$activity=input_id($input,'id_ekskul');$year=input_id($input,'id_tahun_ajaran');
    teacher_assignment($class,null,$year,true);$q=db()->prepare("SELECT 1 FROM ekstrakurikuler WHERE id_ekskul=? AND id_guru_pembina=? AND status='aktif'");$q->execute([$activity,user_reference()]);if(!$q->fetch())deny_access();
    $students=$input['nis']??null;$predicates=$input['predikat']??null;$notes=$input['keterangan']??[];
    if(!is_array($students) || !is_array($predicates) || !is_array($notes))throw new InputError('Daftar nilai ekskul tidak valid.');
    foreach($students as $nis)input_text(['nis'=>$nis],'nis',15);
    if(count($students)!==count(array_unique($students,SORT_STRING)))throw new InputError('Daftar nilai ekskul tidak valid.');
    db_transaction(function(PDO $pdo)use($students,$predicates,$notes,$class,$activity,$year):void{
        locked_row('tahun_ajaran','id_tahun_ajaran',$year);active_period($year,true);teacher_assignment($class,null,$year,true);$owned=$pdo->prepare("SELECT 1 FROM ekstrakurikuler WHERE id_ekskul=? AND id_guru_pembina=? AND status='aktif' FOR UPDATE");$owned->execute([$activity,user_reference()]);if(!$owned->fetch())deny_access();
        foreach($students as $i=>$nis){$nis=input_text(['nis'=>$nis],'nis',15);student_in_class($nis,$class);$pred=input_choice(['predikat'=>$predicates[$i]??''],'predikat',['Sangat Baik','Baik','Cukup','Kurang']);$note=input_text(['keterangan'=>$notes[$i]??''],'keterangan',255,false);
            $q=$pdo->prepare('SELECT * FROM nilai_ekskul WHERE nis=? AND id_ekskul=? AND id_tahun_ajaran=? FOR UPDATE');$q->execute([$nis,$activity,$year]);$old=$q->fetch()?:null;
            $pdo->prepare('INSERT INTO nilai_ekskul(nis,id_ekskul,id_tahun_ajaran,predikat,keterangan) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE predikat=VALUES(predikat),keterangan=VALUES(keterangan)')->execute([$nis,$activity,$year,$pred,$note?:null]);$q->execute([$nis,$activity,$year]);$after=$q->fetch();audit_change('nilai_ekskul',(string)$after['id_nilai_ekskul'],$old?'update':'create',$old,$after);
        }
    });
}
