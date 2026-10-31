<?php
declare(strict_types=1);
require_once __DIR__.'/foundation.php';

function ak_wali_assignment(int $class,int $period,string $date,bool $lock=false): ?array {
    if(current_user()['role']!=='guru')return null;
    return ak_one('SELECT * FROM ak_wali_kelas WHERE id_guru=? AND id_kelas=? AND id_tahun_ajaran=? AND aktif=1 AND mulai<=? AND selesai>=? ORDER BY id DESC LIMIT 1'.($lock?' FOR UPDATE':''),[user_reference(),$class,$period,$date,$date]);
}
function ak_save_wali(array $input): int {
    permission('users.manage');
    return db_transaction(function()use($input): int {
        $period=ak_period(input_id($input,'id_tahun_ajaran'),true);
        $id=($input['id']??'')!==''?input_id($input,'id'):0;
        $before=$id?ak_one('SELECT * FROM ak_wali_kelas WHERE id=? FOR UPDATE',[$id]):null;
        if($id && (!$before || (int)$before['id_tahun_ajaran']!==(int)$period['id_tahun_ajaran']))deny_access();
        $note=input_text($input,'catatan',500);
        if(($input['operation']??'')==='cabut') {
            if(!$before)throw new InputError('Pilih tugas wali yang sudah ada.');
            ak_query('UPDATE ak_wali_kelas SET aktif=0 WHERE id=?',[$id]);ak_audit('wali',$id,'cabut',$before,['aktif'=>0],$note);return $id;
        }
        $guru=input_id($input,'id_guru');$class=input_id($input,'id_kelas');
        active_reference('guru','id_guru',$guru);active_reference('kelas','id_kelas',$class);
        if(!ak_one("SELECT id_user FROM users WHERE role='guru' AND id_referensi=? AND status='aktif'",[(string)$guru]))throw new InputError('Wali harus mempunyai akun guru aktif.');
        $from=input_date($input,'mulai');$until=input_date($input,'selesai');
        if($from>$until || $from<$period['mulai'] || $until>$period['selesai'])throw new InputError('Rentang tugas wali harus berada dalam periode.');
        if(ak_one('SELECT id FROM ak_wali_kelas WHERE id_kelas=? AND id_tahun_ajaran=? AND aktif=1 AND mulai<=? AND selesai>=? AND id<>? LIMIT 1 FOR UPDATE',[$class,$period['id_tahun_ajaran'],$until,$from,$id]))throw new InputError('Sudah ada wali kelas pada rentang tanggal tersebut.');
        if($before && ak_one('SELECT id FROM ak_review_rapor WHERE id_penugasan_wali=? LIMIT 1',[$id]))throw new InputError('Tugas sudah dipakai memeriksa rapor. Cabut lalu buat tugas baru; riwayat pemeriksaan tetap.');
        $values=[$guru,$class,$period['id_tahun_ajaran'],$from,$until,$note];
        if($before)ak_query('UPDATE ak_wali_kelas SET id_guru=?,id_kelas=?,id_tahun_ajaran=?,mulai=?,selesai=?,catatan=?,aktif=1 WHERE id=?',[...$values,$id]);
        else{ak_query('INSERT INTO ak_wali_kelas(id_guru,id_kelas,id_tahun_ajaran,mulai,selesai,catatan,created_by) VALUES(?,?,?,?,?,?,?)',[...$values,ak_actor()]);$id=(int)db()->lastInsertId();}
        ak_audit('wali',$id,$before?'ubah':'buat',$before,ak_one('SELECT * FROM ak_wali_kelas WHERE id=?',[$id]),$note);return $id;
    });
}
function ak_review_report(array $input): void {
    if(app_setting('HOMEROOM_MODE')==='informational')deny_access();
    permission('teach');
    db_transaction(function()use($input):void {
        $report=ak_report(input_id($input,'id'));
        ak_period((int)$report['id_tahun_ajaran'],true);
        $wali=ak_wali_assignment((int)$report['id_kelas'],(int)$report['id_tahun_ajaran'],$report['payload']['periode']['batas_rekap'],true);
        if(!$wali)deny_access();
        $state=ak_one('SELECT * FROM ak_rapor_status WHERE id_snapshot=? FOR UPDATE',[$report['id']]);
        ak_check_revision($input,$state);
        if($state['status']!=='draft')throw new InputError('Hanya draft yang dapat diperiksa wali kelas.');
        $source=ak_report_sources_hash($report['nis'],(int)$report['id_tahun_ajaran'],(int)$report['id_kelas'],$report['payload']['periode']['batas_rekap']);
        if(!hash_equals($report['payload']['source_hash']??'',$source))throw new InputError('Sumber berubah setelah snapshot dibuat. Minta admin membuat snapshot baru.');
        $decision=input_choice($input,'keputusan',['disetujui','perlu_perbaikan']);$note=input_text($input,'catatan',1000);
        ak_query('INSERT INTO ak_review_rapor(id_snapshot,id_penugasan_wali,actor_id,keputusan,catatan,payload_hash,source_hash) VALUES(?,?,?,?,?,?,?)',[$report['id'],$wali['id'],ak_actor(),$decision,$note,$report['payload_hash'],$source]);
        $id=(int)db()->lastInsertId();
        ak_query('UPDATE ak_rapor_status SET revision=revision+1 WHERE id_snapshot=?',[$report['id']]);
        ak_audit('review_rapor',$id,$decision,null,['id_snapshot'=>$report['id'],'wali_id'=>$wali['id'],'payload_hash'=>$report['payload_hash']],mb_substr($note,0,500));
    });
}
function ak_approved_wali_review(array $report): bool {
    // Revalidate the reviewer account and assignment at publication, including revocation.
    $review=ak_one('SELECT r.*,w.id_guru,w.id_kelas,w.id_tahun_ajaran,w.mulai,w.selesai,w.aktif,u.role,u.id_referensi,u.status AS status_user,g.status AS status_guru FROM ak_review_rapor r JOIN ak_wali_kelas w ON w.id=r.id_penugasan_wali JOIN users u ON u.id_user=r.actor_id JOIN guru g ON g.id_guru=w.id_guru WHERE r.id_snapshot=? ORDER BY r.id DESC LIMIT 1',[$report['id']]);
    $date=$report['payload']['periode']['batas_rekap'];
    return $review && $review['keputusan']==='disetujui' && (int)$review['aktif']===1 && $review['status_user']==='aktif' && $review['status_guru']==='aktif'
        && $review['role']==='guru' && (string)$review['id_referensi']===(string)$review['id_guru']
        && (int)$review['id_kelas']===(int)$report['id_kelas'] && (int)$review['id_tahun_ajaran']===(int)$report['id_tahun_ajaran']
        && $review['mulai']<=$date && $review['selesai']>=$date && hash_equals($report['payload_hash'],$review['payload_hash'])
        && hash_equals($report['payload']['source_hash']??'',$review['source_hash']);
}
