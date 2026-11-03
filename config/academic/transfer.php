<?php
declare(strict_types=1);
require_once __DIR__.'/calendar.php';
require_once __DIR__.'/grades.php';
require_once dirname(__DIR__).'/import_service.php';
require_once __DIR__.'/transfer_foundation.php';
require_once __DIR__.'/transfer_master.php';

const AK_IMPORT_HEADERS=[
    'absensi'=>['nis','status','keterangan'],
    'nilai'=>['nis','tugas','uts','uas','praktik','proyek','deskripsi'],
    'kalender'=>['mulai','selesai','judul','jenis','status','catatan'],
    'siswa'=>['nis','nama_siswa','jenis_kelamin','tanggal_lahir','id_kelas','alamat'],
    'guru'=>['nip','nama_guru','email','no_hp'],
    'jurusan'=>['kode_jurusan','nama_jurusan'],
    'ak_ruang'=>['kode_ruang','nama_ruang','jenis'],
    'kelas'=>['nama_kelas','tingkat','id_jurusan'],
    'mata_pelajaran'=>['kode_mapel','nama_mapel','kelompok','kkm'],
    'anggota'=>['nis','id_kelas','nomor_absen','mulai','selesai'],
    'penugasan'=>['id_guru','id_mapel','id_kelas','hari','jam_mulai','jam_selesai','ruang','mulai','selesai','catatan'],
];
function ak_import_template(string $module,array $input): array {
    $rows=[];
    if(in_array($module,['absensi','nilai'],true)) {
        $schedule=ak_schedule(input_id($input,'id_jadwal'),false,input_date($input,'tanggal'));
        foreach(ak_roster((int)$schedule['id_kelas'],(int)$schedule['id_tahun_ajaran'],input_date($input,'tanggal')) as $row)$rows[]=$module==='absensi'?[$row['nis'],'B','']:[$row['nis'],'','','','','',''];
    } elseif($module==='kalender') {permission('calendar.manage');ak_period(input_id($input,'id_tahun_ajaran'));}
    else permission('master.manage');
    return ['title'=>'Template impor '.$module,'headers'=>AK_IMPORT_HEADERS[$module],'rows'=>$rows];
}
function ak_preview_import(array $input,array $file): array {
    // A new upload attempt invalidates the old preview, including validation failures.
    unset($_SESSION['ak_import']);
    $module=input_choice($input,'module',array_keys(AK_IMPORT_HEADERS));
    if(isset(AK_MASTER_IMPORT_KEYS[$module])||in_array($module,['anggota','penugasan'],true))permission('master.manage');
    elseif($module==='kalender')permission('calendar.manage');
    else require_role('guru');
    if(($file['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK || !is_string($file['tmp_name']??null) || !is_uploaded_file($file['tmp_name']))throw new InputError('Unggah berkas CSV / XLSX yang valid.');
    $extension=strtolower(pathinfo(is_string($file['name']??null)?$file['name']:'',PATHINFO_EXTENSION));
    if(!in_array($extension,['csv','xlsx'],true))throw new InputError('Hanya CSV dan XLSX.');
    $rows=import_rows($file['tmp_name'],$extension);
    $headers=array_map(fn($v)=>trim(ltrim((string)$v,"\xEF\xBB\xBF")),array_shift($rows));
    if($headers!==AK_IMPORT_HEADERS[$module])throw new InputError('Header harus tepat sesuai template, termasuk urutan kolom.');
    $seen=[];$normalized=[];$roomNames=[];
    foreach($rows as $i=>$row) {
        if(count($row)>count($headers))throw new InputError('Jumlah kolom tidak cocok pada baris '.($i+2).'.');
        $row=array_pad($row,count($headers),'');
        $entry=array_combine($headers,array_map(static fn($v)=>trim((string)$v),$row));
        if($module==='ak_ruang'){$name=mb_strtolower($entry['nama_ruang'],'UTF-8');if(isset($roomNames[$name]))throw new InputError('Nama ruang ganda pada baris '.($i+2).'.');$roomNames[$name]=true;}
        $key=$module==='kalender'?implode('|',[$entry['mulai'],$entry['selesai'],$entry['judul']]):($module==='penugasan'?implode('|',$entry):$entry[AK_MASTER_IMPORT_KEYS[$module]??'nis']);
        $key=mb_strtolower($key,'UTF-8');
        if(isset($seen[$key]))throw new InputError('Data duplikat pada baris '.($i+2).' (juga baris '.$seen[$key].').');$seen[$key]=$i+2;$normalized[]=$entry;
    }
    $context=['module'=>$module,'alasan'=>input_text($input,'alasan',500)];
    if(in_array($module,['anggota','penugasan'],true)) {
        $context+=ak_preview_foundation_import($module,$input,$normalized);
    }elseif(in_array($module,['kelas','jurusan','mata_pelajaran','ak_ruang'],true)) {
        foreach($normalized as $i=>$row){try{ak_validate_master_import($module,$row);}catch(InputError $error){throw new InputError('Baris '.($i+2).': '.$error->getMessage());}}
    }elseif(in_array($module,['siswa','guru'],true)) {
        permission('master.manage');
        foreach($normalized as $row) {
            if($module==='siswa') {
                $nis=input_text($row,'nis',15);if(!preg_match('/^[0-9]{1,15}$/D',$nis))throw new InputError('NIS harus 1–15 digit teks.');
                input_text($row,'nama_siswa',100);input_text($row,'alamat',2000,false);input_choice($row,'jenis_kelamin',['L','P']);
                $born=input_date($row,'tanggal_lahir');if($born<'1900-01-01'||$born>=date('Y-m-d'))throw new InputError('Tanggal lahir tidak valid.');
                $class=input_id($row,'id_kelas');if(!ak_one("SELECT id_kelas FROM kelas WHERE id_kelas=? AND status='aktif'",[$class]))throw new InputError('Kelas tidak dikenal atau nonaktif.');
                $existing=ak_one('SELECT nis FROM siswa WHERE nis=?',[$nis]);
            } else {
                $nip=input_text($row,'nip',20);if(!preg_match('/^[A-Za-z0-9.\/-]{3,20}$/D',$nip))throw new InputError('NIP tidak valid.');
                input_text($row,'nama_guru',100);$mail=input_text($row,'email',100,false);if($mail!==''&&!filter_var($mail,FILTER_VALIDATE_EMAIL))throw new InputError('Email tidak valid.');
                $phone=input_text($row,'no_hp',20,false);if($phone!==''&&!preg_match('/^[+0-9() -]{5,20}$/D',$phone))throw new InputError('Nomor telepon tidak valid.');
                $existing=ak_one('SELECT id_guru FROM guru WHERE nip=?',[$nip]);
            }
            if($existing)throw new InputError('Identitas sudah ada. Impor master hanya menambah; gunakan CRUD untuk koreksi existing.');
        }
    } elseif($module==='kalender') {
        permission('calendar.manage');$period=ak_period(input_id($input,'id_tahun_ajaran'));
        if($period['status']!=='Aktif' || (int)$period['dikunci'])deny_access();$context['id_tahun_ajaran']=(int)$period['id_tahun_ajaran'];
        foreach($normalized as $row) {
            $from=input_date($row,'mulai');$until=input_date($row,'selesai');
            if($from>$until || $from<$period['mulai'] || $until>$period['selesai'])throw new InputError('Tanggal kegiatan di luar periode atau tidak urut.');
            input_text($row,'judul',150);input_text($row,'catatan',1000);input_choice($row,'jenis',['Libur','Ujian','Hari Efektif','Agenda']);
            if($row['status']!=='draft')throw new InputError('Impor kalender hanya menerima draft. Pengesahan dilakukan setelah pemeriksaan admin.');
            if(ak_one("SELECT id FROM ak_kalender WHERE id_tahun_ajaran=? AND mulai=? AND selesai=? AND judul=? AND status<>'nonaktif'",[$period['id_tahun_ajaran'],$from,$until,$row['judul']]))throw new InputError('Kegiatan sudah ada di database.');
        }
    } else {
        $date=input_date($input,'tanggal');$schedule=ak_schedule(input_id($input,'id_jadwal'),true,$date);
        $context+=['id_jadwal'=>(int)$schedule['id_jadwal'],'tanggal'=>$date];
        $roster=[];foreach(ak_roster((int)$schedule['id_kelas'],(int)$schedule['id_tahun_ajaran'],$date) as $student)$roster[$student['nis']]=$student;
        if(!$roster)throw new InputError('Roster kosong.');
        foreach($normalized as $row)if(!isset($roster[$row['nis']]))throw new InputError('NIS bukan anggota kelas pada tanggal dipilih.');
        if($module==='absensi') {
            if(count($normalized)!==count($roster))throw new InputError('Impor absensi harus mencakup seluruh roster tepat satu kali.');
            foreach($normalized as $row){input_choice($row,'status',array_keys(AK_STATUSES));input_text($row,'keterangan',500,false);}
            $meeting=ak_one('SELECT * FROM ak_pertemuan WHERE id_jadwal=? AND tanggal=?',[$schedule['id_jadwal'],$date]);
            $context['revision']=(int)($meeting['revision']??0);
            foreach(['pertemuan_ke','jam_ke','tp_atp','materi','kegiatan','id_guru_pengganti','refleksi','catatan','tindak_lanjut'] as $key)$context[$key]=$meeting[$key]??($input[$key]??'');
            // New meeting journal fields are required in the preview, not invented from attendance.
            input_id($context,'pertemuan_ke');input_text($context,'jam_ke',30);input_text($context,'materi',5000);input_text($context,'kegiatan',5000);
        } else {
            $rule=ak_one('SELECT * FROM ak_aturan_nilai WHERE id=?',[input_id($input,'id_aturan')]);
            foreach(['id_guru','id_kelas','id_mapel','id_tahun_ajaran'] as $key)if(!$rule || (int)$rule[$key]!==(int)$schedule[$key])deny_access();
            $context['id_aturan']=(int)$rule['id'];
            foreach($normalized as &$row) {
                foreach(AK_COMPONENTS as $key=>$label)input_number($row,$key);input_text($row,'deskripsi',1000);
                $grade=ak_one('SELECT revision,id_guru,id_kelas FROM ak_nilai WHERE nis=? AND id_mapel=? AND id_tahun_ajaran=?',[$row['nis'],$schedule['id_mapel'],$schedule['id_tahun_ajaran']]);
                if($grade && ((int)$grade['id_guru']!==(int)$schedule['id_guru'] || (int)$grade['id_kelas']!==(int)$schedule['id_kelas']))deny_access();
                $row['revision']=(int)($grade['revision']??0);
            } unset($row);
        }
    }
    $preview=['module'=>$module,'rows'=>$normalized,'context'=>$context,'created'=>time(),'actor'=>ak_actor(),'token'=>bin2hex(random_bytes(24))];
    $_SESSION['ak_import']=$preview;return $preview;
}
function ak_commit_import(array $input): int {
    $preview=$_SESSION['ak_import']??null;$token=input_text($input,'preview_token',48);
    if(!is_array($preview)||$preview['actor']!==ak_actor()||time()-$preview['created']>900||!hash_equals($preview['token'],$token))throw new InputError('Preview tidak tersedia, kedaluwarsa, atau sudah digunakan. Unggah ulang.');
    if(($input['konfirmasi']??'')!=='1')throw new InputError('Konfirmasikan pemeriksaan preview sebelum menerapkan impor.');
    $context=$preview['context'];
    $count=db_transaction(function()use($preview,$context,$input):int {
        if(in_array($preview['module'],['anggota','penugasan'],true))return ak_commit_foundation_import($preview,$input);
        if(isset(AK_MASTER_IMPORT_KEYS[$preview['module']])) {
            foreach($preview['rows'] as $i=>$row){try{save_master($preview['module'],$row+['action'=>'create']);}catch(InputError $error){throw new InputError('Baris '.($i+2).': '.$error->getMessage());}}
            ak_audit('impor_master',bin2hex(random_bytes(8)),'tambah_batch',null,['modul'=>$preview['module'],'jumlah'=>count($preview['rows'])],$context['alasan']);
            return count($preview['rows']);
        }
        if($preview['module']==='kalender') {
            foreach($preview['rows'] as $row)ak_save_event($row+['id_tahun_ajaran'=>$context['id_tahun_ajaran'],'revision'=>0]);
            return count($preview['rows']);
        }
        if($preview['module']==='absensi') {
            $statuses=[];$notes=[];foreach($preview['rows'] as $row){$statuses[$row['nis']]=$row['status'];$notes[$row['nis']]=$row['keterangan'];}
            ak_save_meeting($context+['status'=>$statuses,'keterangan'=>$notes,'terverifikasi'=>($input['terverifikasi']??'')]);
            return count($statuses);
        }
        $entries=[];foreach($preview['rows'] as $row){$nis=$row['nis'];unset($row['nis']);$entries[$nis]=$row;}
        return ak_save_grades($context+['nilai'=>$entries]);
    });
    unset($_SESSION['ak_import']);return $count;
}
