<?php
declare(strict_types=1);
require_once __DIR__.'/foundation.php';

function ak_progress_period(int $id,bool $lock=false): array {
    $period=ak_one('SELECT t.*,p.mulai,p.selesai,p.terverifikasi FROM tahun_ajaran t JOIN ak_periode p USING(id_tahun_ajaran) WHERE t.id_tahun_ajaran=?'.($lock?' FOR UPDATE':''),[$id]);
    if(!$period || !(int)$period['terverifikasi'] || (int)$period['dikunci'])throw new InputError('Periode harus terverifikasi dan tidak dikunci.');
    return $period;
}
function ak_progress_plan(array $input,bool $lock=false): array {
    require_role('admin');permission('master.manage');
    $fromId=input_id($input,'periode_asal');$toId=input_id($input,'periode_tujuan');
    // Stable period lock ordering for concurrent batches.
    if($lock)foreach(array_unique([min($fromId,$toId),max($fromId,$toId)])as $id)ak_progress_period($id,true);
    $from=ak_progress_period($fromId);$to=ak_progress_period($toId);
    if($from['semester']!=='Genap'||$to['semester']!=='Ganjil'||!preg_match('/^(\d{4})\/(\d{4})$/D',$from['tahun_ajaran'],$a)||!preg_match('/^(\d{4})\/(\d{4})$/D',$to['tahun_ajaran'],$b)||(int)$a[2]!==((int)$a[1]+1)||(int)$b[1]!==((int)$a[1]+1)||(int)$b[2]!==((int)$b[1]+1)||$from['selesai']>=$to['mulai'])throw new InputError('Kenaikan tahunan harus dari Genap ke Ganjil tahun berikutnya, dengan tanggal periode tidak bertumpang tindih.');
    $reason=input_text($input,'alasan',500);$mapping=$input['tujuan']??[];
    if(!is_array($mapping))throw new InputError('Pemetaan kelas tidak valid.');
    $rows=ak_rows('SELECT a.*,s.nama_siswa,s.status,k.nama_kelas,k.tingkat,k.id_jurusan,k.status status_kelas FROM ak_anggota_kelas a JOIN siswa s ON s.nis=a.nis JOIN kelas k ON k.id_kelas=a.id_kelas WHERE a.id_tahun_ajaran=? AND a.mulai<=? AND a.selesai>=? ORDER BY a.id_kelas,a.nomor_absen,a.nis'.($lock?' FOR UPDATE':''),[$fromId,$from['selesai'],$from['selesai']]);
    if(!$rows||count($rows)>5000)throw new InputError('Periode asal harus mempunyai 1–5000 anggota pada akhir semester.');
    $seen=[];$classes=[];$destinations=[];$rolls=[];
    foreach($rows as $row){
        if(isset($seen[$row['nis']])||$row['status']!=='aktif'||$row['status_kelas']!=='aktif'||!in_array($row['tingkat'],['X','XI','XII'],true))throw new InputError('Ada siswa ganda, nonaktif atau kelas yang perlu ditinjau sebelum kenaikan.');
        $seen[$row['nis']]=true;$cid=(int)$row['id_kelas'];
        if(isset($rolls[$cid][$row['nomor_absen']]))throw new InputError('Ada nomor absen ganda pada kelas asal. Tinjau sebelum kenaikan.');
        $rolls[$cid][$row['nomor_absen']]=true;
        if(!isset($classes[$cid])){
            active_reference('jurusan','id_jurusan',(int)$row['id_jurusan']);
            $destination=$mapping[$cid]??null;
            if($row['tingkat']==='XII'){
                if($destination!=='alumni')throw new InputError('Kelas XII harus dipetakan ke Alumni.');
                $classes[$cid]=['asal'=>$row['nama_kelas'],'tujuan'=>'Alumni','id_tujuan'=>null,'jumlah'=>0];
            }else{
                $targetId=input_id(['id'=>$destination],'id');$target=active_reference('kelas','id_kelas',$targetId);
                if($target['tingkat']!==($row['tingkat']==='X'?'XI':'XII')||(int)$target['id_jurusan']!==(int)$row['id_jurusan'])throw new InputError('Kelas tujuan harus satu tingkat di atas dan pada jurusan yang sama.');
                if(isset($destinations[$targetId]))throw new InputError('Dua kelas asal tidak boleh digabung otomatis ke satu kelas tujuan.');
                $destinations[$targetId]=true;
                if(ak_one('SELECT id FROM ak_anggota_kelas WHERE id_tahun_ajaran=? AND id_kelas=? LIMIT 1'.($lock?' FOR UPDATE':''),[$toId,$targetId]))throw new InputError('Kelas tujuan sudah berisi anggota. Tinjau data tersebut; tidak ada yang ditimpa.');
                if(ak_one('SELECT id FROM ak_pertemuan WHERE id_kelas=? AND tanggal BETWEEN ? AND ? LIMIT 1',[$targetId,$to['mulai'],$to['selesai']])||ak_one('SELECT id FROM ak_absensi_harian WHERE id_kelas=? AND tanggal BETWEEN ? AND ? LIMIT 1',[$targetId,$to['mulai'],$to['selesai']]))throw new InputError('Kelas tujuan mempunyai histori pada rentang tujuan. Tidak boleh menambah roster secara retroaktif.');
                $classes[$cid]=['asal'=>$row['nama_kelas'],'tujuan'=>$target['nama_kelas'],'id_tujuan'=>$targetId,'jumlah'=>0];
            }
        }
        $classes[$cid]['jumlah']++;
    }
    if(count($mapping)!==count($classes))throw new InputError('Pemetaan harus tepat mencakup seluruh kelas asal.');
    $nis=array_keys($seen);$marks=implode(',',array_fill(0,count($nis),'?'));
    if(ak_one('SELECT id FROM ak_kenaikan_detail WHERE nis IN('.$marks.') AND (periode_asal=? OR (hasil=\'alumni\' AND tanggal_berlaku<=?)) LIMIT 1'.($lock?' FOR UPDATE':''),[...$nis,$fromId,$to['selesai']]))throw new InputError('Ada siswa yang sudah diproses atau sudah berstatus alumni. Jangan mengulangi batch.');
    if(ak_one('SELECT id FROM ak_anggota_kelas WHERE nis IN('.$marks.') AND mulai<=? AND selesai>=? LIMIT 1'.($lock?' FOR UPDATE':''),[...$nis,$to['selesai'],$to['mulai']]))throw new InputError('Ada keanggotaan siswa yang bertumpang tindih dengan periode tujuan.');
    $hash=hash('sha256',json_encode([$from,$to,$rows,$classes],JSON_THROW_ON_ERROR));
    return ['from'=>$from,'to'=>$to,'rows'=>$rows,'classes'=>$classes,'hash'=>$hash,'alasan'=>$reason,'mapping'=>$mapping];
}
function ak_progress_preview(array $input): void {
    unset($_SESSION['ak_kenaikan']);
    $plan=db_transaction(fn()=>ak_progress_plan($input));
    $_SESSION['ak_kenaikan']=['actor'=>ak_actor(),'token'=>bin2hex(random_bytes(24)),'expires'=>time()+900,'periode_asal'=>$plan['from']['id_tahun_ajaran'],'periode_tujuan'=>$plan['to']['id_tahun_ajaran'],'tujuan'=>$plan['mapping'],'alasan'=>$plan['alasan'],'hash'=>$plan['hash'],'jumlah'=>count($plan['rows']),'classes'=>$plan['classes']];
}
function ak_progress_commit(array $input): int {
    require_role('admin');permission('master.manage');
    $preview=$_SESSION['ak_kenaikan']??null;$token=input_text($input,'preview_token',48);
    if(!$preview || $preview['actor']!==ak_actor() || $preview['expires']<time() || !hash_equals($preview['token'],$token)||($input['konfirmasi']??'')!=='1')throw new InputError('Pratinjau kedaluwarsa atau belum dikonfirmasi. Buat pratinjau baru.');
    $id=db_transaction(function()use($preview): int {
        $plan=ak_progress_plan($preview,true);
        if(!hash_equals($preview['hash'],$plan['hash']))throw new InputError('Data berubah setelah pratinjau. Tidak ada siswa diproses; buat pratinjau baru.');
        ak_query('INSERT INTO ak_kenaikan_batch(periode_asal,periode_tujuan,tanggal_berlaku,alasan,source_hash,jumlah,created_by) VALUES(?,?,?,?,?,?,?)',[$plan['from']['id_tahun_ajaran'],$plan['to']['id_tahun_ajaran'],$plan['to']['mulai'],$plan['alasan'],$plan['hash'],count($plan['rows']),ak_actor()]);$batch=(int)db()->lastInsertId();
        foreach($plan['rows']as $row){
            $class=$plan['classes'][$row['id_kelas']];$target=null;$outcome=$class['id_tujuan']===null?'alumni':'naik';
            if($outcome==='naik'){
                ak_query('INSERT INTO ak_anggota_kelas(nis,id_kelas,id_tahun_ajaran,nomor_absen,mulai,selesai,created_by) VALUES(?,?,?,?,?,?,?)',[$row['nis'],$class['id_tujuan'],$plan['to']['id_tahun_ajaran'],$row['nomor_absen'],$plan['to']['mulai'],$plan['to']['selesai'],ak_actor()]);$target=(int)db()->lastInsertId();
                ak_audit('anggota',$target,'kenaikan',null,ak_one('SELECT * FROM ak_anggota_kelas WHERE id=?',[$target]),$plan['alasan']);
            }
            ak_query('INSERT INTO ak_kenaikan_detail(id_batch,nis,periode_asal,id_anggota_asal,id_anggota_tujuan,hasil,tanggal_berlaku) VALUES(?,?,?,?,?,?,?)',[$batch,$row['nis'],$plan['from']['id_tahun_ajaran'],$row['id'],$target,$outcome,$plan['to']['mulai']]);
        }
        ak_audit('kenaikan',$batch,'terapkan',null,['jumlah'=>count($plan['rows']),'kelas'=>$plan['classes'],'source_hash'=>$plan['hash']],$plan['alasan']);return $batch;
    });
    unset($_SESSION['ak_kenaikan']);return $id;
}
