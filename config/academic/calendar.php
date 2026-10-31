<?php
declare(strict_types=1);
require_once __DIR__.'/foundation.php';

function ak_save_event(array $input): int {
    permission('calendar.manage');
    return db_transaction(function() use ($input): int {
        $period=ak_period(input_id($input,'id_tahun_ajaran'),true);
        $id=($input['id']??'')!==''?input_id($input,'id'):0;
        $before=$id?ak_one('SELECT * FROM ak_kalender WHERE id=? FOR UPDATE',[$id]):null;
        if ($id && (!$before || (int)$before['id_tahun_ajaran']!==(int)$period['id_tahun_ajaran'])) deny_access();
        ak_check_revision($input,$before);
        $from=input_date($input,'mulai'); $until=input_date($input,'selesai');
        if ($from>$until || $from<$period['mulai'] || $until>$period['selesai']) throw new InputError('Kegiatan harus berada dalam batas tanggal periode.');
        $title=input_text($input,'judul',150); $type=input_choice($input,'jenis',['Libur','Ujian','Hari Efektif','Agenda']);
        $status=input_choice($input,'status',['draft','disahkan','nonaktif']); $note=input_text($input,'catatan',1000);
        if ($type==='Libur' && $status==='disahkan' && ak_one('SELECT id FROM ak_pertemuan WHERE id_tahun_ajaran=? AND tanggal BETWEEN ? AND ? LIMIT 1',[$period['id_tahun_ajaran'],$from,$until])) throw new InputError('Tidak dapat menetapkan libur yang membatalkan pertemuan tersimpan. Tinjau data terlebih dahulu.');
        if ($before && $before['status']==='disahkan' && in_array($before['jenis'],['Libur','Hari Efektif'],true)
            && ak_one('SELECT id FROM ak_pertemuan WHERE id_tahun_ajaran=? AND tanggal BETWEEN ? AND ? LIMIT 1',[$period['id_tahun_ajaran'],$before['mulai'],$before['selesai']])
            && ($from!==$before['mulai'] || $until!==$before['selesai'] || $type!==$before['jenis'] || $status!=='disahkan')) throw new InputError('Aturan hari efektif telah digunakan pertemuan dan tidak dapat dibatalkan langsung.');
        if (ak_one("SELECT id FROM ak_kalender WHERE id_tahun_ajaran=? AND mulai=? AND selesai=? AND judul=? AND status<>'nonaktif' AND id<>? LIMIT 1",[$period['id_tahun_ajaran'],$from,$until,$title,$id])) throw new InputError('Kegiatan identik sudah tercatat.');
        $values=[$from,$until,$title,$type,$status,$note,ak_actor()];
        if ($before) ak_query('UPDATE ak_kalender SET mulai=?,selesai=?,judul=?,jenis=?,status=?,catatan=?,updated_by=?,revision=revision+1 WHERE id=?',[...$values,$id]);
        else {
            ak_query('INSERT INTO ak_kalender(mulai,selesai,judul,jenis,status,catatan,updated_by,id_tahun_ajaran) VALUES(?,?,?,?,?,?,?,?)',[...$values,$period['id_tahun_ajaran']]); $id=(int)db()->lastInsertId();
        }
        ak_audit('kalender',$id,$before?'ubah':'buat',$before,ak_one('SELECT * FROM ak_kalender WHERE id=?',[$id]),mb_substr($note,0,500)); return $id;
    });
}
