<?php
declare(strict_types=1);
require_once __DIR__.'/foundation.php';

function ak_bells(): array {
    return ak_rows("SELECT b.* FROM ak_jam_belajar b JOIN (SELECT nama,MAX(versi) versi FROM ak_jam_belajar GROUP BY nama) v ON v.nama=b.nama AND v.versi=b.versi ORDER BY CASE b.nama WHEN 'Senin' THEN 1 WHEN 'Selasa–Kamis' THEN 2 WHEN 'Jumat' THEN 3 ELSE 4 END,b.nama");
}
function ak_bell_profile_for_day(string $day): ?array {
    $name=in_array($day,['Selasa','Rabu','Kamis'],true)?'Selasa–Kamis':$day;
    foreach(ak_bells() as $row)if($row['nama']===$name)return $row;
    return null;
}
function ak_schedule_periods(array $schedule,?array $profile): ?array {
    if(!$profile)return null;
    $from=substr($schedule['jam_mulai'],0,5);$until=substr($schedule['jam_selesai'],0,5);$slots=[];
    foreach(json_decode($profile['payload_json'],true,512,JSON_THROW_ON_ERROR)['slots']as $slot)
        if($slot[0]!==null && $slot[1]>=$from && $slot[2]<=$until)$slots[]=$slot;
    if(!$slots || $slots[0][1]!==$from || $slots[count($slots)-1][2]!==$until)return null;
    return ['first'=>$slots[0][0],'last'=>$slots[count($slots)-1][0],'version'=>$profile['versi']];
}
function ak_save_bell(array $input): int {
    require_role('admin');permission('master.manage');
    return db_transaction(function()use($input): int {
        $id=input_id($input,'id');$old=ak_one('SELECT * FROM ak_jam_belajar WHERE id=?',[$id]);if(!$old)deny_access();
        // All editors of the same profile lock its original immutable row.
        ak_one('SELECT id FROM ak_jam_belajar WHERE nama=? AND versi=1 FOR UPDATE',[$old['nama']]);
        $latest=ak_one('SELECT * FROM ak_jam_belajar WHERE nama=? ORDER BY versi DESC LIMIT 1 FOR UPDATE',[$old['nama']]);
        if((int)$latest['id']!==$id || ak_revision($input)!==(int)$latest['versi'])throw new InputError('Jam telah diubah admin lain. Muat ulang versi terbaru.');
        $status=input_choice($input,'status',['referensi','perlu_konfirmasi']);
        if($status==='referensi' && ($input['terverifikasi']??'')!=='1')throw new InputError('Konfirmasikan pemeriksaan jam sebelum menyimpan sebagai referensi.');
        $reason=input_text($input,'alasan',500);$note=input_text($input,'catatan',1000);
        $entries=$input['slots']??null;
        if(!is_array($entries)||!array_is_list($entries)||count($entries)<1||count($entries)>40)throw new InputError('Isi 1–40 baris jam yang berurutan.');
        $slots=[];$previous='00:00';$number=1;
        foreach($entries as $entry){
            if(!is_array($entry))throw new InputError('Baris jam tidak valid.');
            $from=input_text($entry,'mulai',5);$until=input_text($entry,'selesai',5);$label=input_text($entry,'keterangan',80);$n=input_text($entry,'nomor',2,false);
            foreach([$from,$until]as $time)if(!preg_match('/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/D',$time))throw new InputError('Waktu harus menggunakan format HH:MM.');
            if($from>=$until || $from<$previous)throw new InputError('Jam selesai harus setelah mulai; baris tidak boleh tumpang tindih atau terbalik.');
            if($n!=='' && (!ctype_digit($n)||(string)(int)$n!==$n||(int)$n!==$number))throw new InputError('Nomor jam pelajaran harus berurutan 1, 2, 3 tanpa duplikasi.');
            if($n!=='')$number++;
            $slots[]=[$n===''?null:(int)$n,$from,$until,$label];$previous=$until;
        }
        if($number===1)throw new InputError('Minimal satu jam pelajaran harus bernomor.');
        $profile=json_decode($old['payload_json'],true,512,JSON_THROW_ON_ERROR);
        $profile=array_replace($profile,['versi'=>(int)$old['versi']+1,'status'=>$status,'catatan'=>$note,'slots'=>$slots]);
        $json=json_encode($profile,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
        ak_query('INSERT INTO ak_jam_belajar(nama,versi,status,payload_json,sumber_sha256,catatan,created_by) VALUES(?,?,?,?,?,?,?)',[$old['nama'],$profile['versi'],$status,$json,hash('sha256',$json),$note,ak_actor()]);
        $new=(int)db()->lastInsertId();ak_audit('jam_belajar',$new,'versi_baru',$old,ak_one('SELECT * FROM ak_jam_belajar WHERE id=?',[$new]),$reason);return $new;
    });
}
