<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/crud_service.php';

const AK_STATUSES = ['H'=>'Hadir','S'=>'Sakit','I'=>'Izin','A'=>'Alpa','B'=>'Belum Dikonfirmasi'];

function ak_query(string $sql, array $args = []): PDOStatement {
    $q = db()->prepare($sql); $q->execute($args); return $q;
}
function ak_rows(string $sql, array $args = []): array { return ak_query($sql,$args)->fetchAll(); }
function ak_one(string $sql, array $args = []): ?array { return ak_query($sql,$args)->fetch() ?: null; }
function ak_actor(): int { return (int)current_user()['id_user']; }
function ak_revision(array $input): int {
    $value = $input['revision'] ?? null;
    if ((!is_string($value) && !is_int($value)) || !preg_match('/^(0|[1-9][0-9]{0,8})$/D',(string)$value)) throw new InputError('Versi formulir tidak valid. Muat ulang halaman.');
    return (int)$value;
}
function ak_check_revision(array $input, ?array $before): void {
    if (ak_revision($input) !== (int)($before['revision'] ?? 0)) throw new InputError('Data telah berubah. Muat ulang dan periksa sebelum menyimpan kembali.');
}
function ak_audit(string $entity, string|int $id, string $action, ?array $before, ?array $after, string $reason): void {
    ak_query('INSERT INTO ak_riwayat(actor_id,entity,record_id,action,sebelum,sesudah,alasan) VALUES(?,?,?,?,?,?,?)', [
        ak_actor(),$entity,(string)$id,$action,$before===null?null:json_encode($before,JSON_THROW_ON_ERROR),
        $after===null?null:json_encode($after,JSON_THROW_ON_ERROR),$reason,
    ]);
}
function ak_period(int $id, bool $write = false, ?string $date = null): array {
    $period = ak_one('SELECT t.*,p.mulai,p.selesai,p.hari_efektif,p.terverifikasi FROM tahun_ajaran t JOIN ak_periode p USING(id_tahun_ajaran) WHERE t.id_tahun_ajaran=?'.($write?' FOR UPDATE':''),[$id]);
    if (!$period || !(int)$period['terverifikasi']) throw new InputError('Batas tanggal dan hari efektif periode belum diverifikasi admin.');
    if ($write && ($period['status'] !== 'Aktif' || (int)$period['dikunci'])) deny_access();
    if ($date !== null && ($date < $period['mulai'] || $date > $period['selesai'])) throw new InputError('Tanggal di luar periode terverifikasi.');
    return $period;
}
function ak_school_day(array $period, string $date): bool {
    $events = ak_rows("SELECT jenis FROM ak_kalender WHERE id_tahun_ajaran=? AND mulai<=? AND selesai>=? AND status='disahkan'",[$period['id_tahun_ajaran'],$date,$date]);
    if (in_array('Libur',array_column($events,'jenis'),true)) return false;
    if (in_array('Hari Efektif',array_column($events,'jenis'),true)) return true;
    return in_array((new DateTimeImmutable($date))->format('N'),explode(',',$period['hari_efektif']),true);
}
function ak_write_day(array $period, string $date): void {
    if ($date > date('Y-m-d')) throw new InputError('Absensi tidak dapat diisi untuk tanggal mendatang.');
    if (!ak_school_day($period,$date)) throw new InputError('Tanggal bukan hari efektif pada kalender yang disahkan.');
}
function ak_roster(int $class, int $period, string $date, bool $lock = false): array {
    return ak_rows('SELECT a.*,s.nama_siswa,s.status AS status_siswa FROM ak_anggota_kelas a JOIN siswa s ON s.nis=a.nis WHERE a.id_kelas=? AND a.id_tahun_ajaran=? AND a.mulai<=? AND a.selesai>=? ORDER BY a.nomor_absen,a.nis'.($lock?' FOR UPDATE':''),[$class,$period,$date,$date]);
}
function ak_period_settings(array $input): void {
    permission('period.manage');
    db_transaction(function() use ($input): void {
        $id = input_id($input,'id_tahun_ajaran'); $year = locked_row('tahun_ajaran','id_tahun_ajaran',$id);
        if ((int)$year['dikunci']) deny_access();
        $from = input_date($input,'mulai'); $until = input_date($input,'selesai');
        if ($from > $until || (new DateTimeImmutable($from))->diff(new DateTimeImmutable($until))->days > 370) throw new InputError('Rentang periode harus urut dan maksimal 370 hari.');
        $days = input_text($input,'hari_efektif',20);
        if (!preg_match('/^[1-7](,[1-7])*$/D',$days) || count(array_unique(explode(',',$days)))!==count(explode(',',$days))) throw new InputError('Hari efektif berupa angka unik 1–7, dipisah koma.');
        $verified = input_choice($input,'terverifikasi',['0','1']); $note = input_text($input,'catatan',500);
        $before = ak_one('SELECT * FROM ak_periode WHERE id_tahun_ajaran=?',[$id]);
        if ($before) {
            $used = (int)ak_query('SELECT COUNT(*) FROM ak_pertemuan WHERE id_tahun_ajaran=?',[$id])->fetchColumn();
            if ($used && ($from!==$before['mulai'] || $until!==$before['selesai'] || $days!==$before['hari_efektif'] || $verified!==(string)$before['terverifikasi'])) throw new InputError('Aturan periode telah digunakan pertemuan. Perubahan membutuhkan peninjauan historis terpisah.');
            if (ak_one('SELECT id FROM ak_anggota_kelas WHERE id_tahun_ajaran=? AND (mulai<? OR selesai>?) LIMIT 1',[$id,$from,$until])) throw new InputError('Tanggal baru akan mengeluarkan keanggotaan existing dari periode.');
            if (ak_one('SELECT id FROM ak_kalender WHERE id_tahun_ajaran=? AND (mulai<? OR selesai>?) LIMIT 1',[$id,$from,$until])) throw new InputError('Tanggal baru tidak mencakup kegiatan kalender existing.');
        }
        $data=[$from,$until,$days,$verified,$note,ak_actor()];
        if ($before) ak_query('UPDATE ak_periode SET mulai=?,selesai=?,hari_efektif=?,terverifikasi=?,catatan=?,updated_by=? WHERE id_tahun_ajaran=?',[...$data,$id]);
        else ak_query('INSERT INTO ak_periode(mulai,selesai,hari_efektif,terverifikasi,catatan,updated_by,id_tahun_ajaran) VALUES(?,?,?,?,?,?,?)',[...$data,$id]);
        ak_audit('periode',$id,'atur',$before,ak_one('SELECT * FROM ak_periode WHERE id_tahun_ajaran=?',[$id]),$note);
    });
}
function ak_save_member(array $input): int {
    permission('master.manage');
    return db_transaction(function() use ($input): int {
        $period = ak_period(input_id($input,'id_tahun_ajaran'),true);
        $class = input_id($input,'id_kelas'); active_reference('kelas','id_kelas',$class);
        $nis = input_text($input,'nis',15); active_reference('siswa','nis',$nis);
        $number = input_id($input,'nomor_absen'); if ($number>1000) throw new InputError('Nomor absen maksimal 1000.');
        $from = input_date($input,'mulai'); $until = input_date($input,'selesai');
        if ($from>$until || $from<$period['mulai'] || $until>$period['selesai']) throw new InputError('Tanggal keanggotaan harus di dalam periode dan berurutan.');
        $id = ($input['id']??'')!==''?input_id($input,'id'):0;
        $before = $id?ak_one('SELECT * FROM ak_anggota_kelas WHERE id=? FOR UPDATE',[$id]):null;
        if ($id && (!$before || (int)$before['id_tahun_ajaran']!==(int)$period['id_tahun_ajaran'])) deny_access();
        if ($before) {
            if ($nis!==$before['nis'] || $class!==(int)$before['id_kelas'] || $from!==$before['mulai']) throw new InputError('Identitas keanggotaan tetap. Tutup rentang lama lalu buat rentang baru.');
            $last = ak_query('SELECT MAX(p.tanggal) FROM ak_absensi_sesi a JOIN ak_pertemuan p ON p.id=a.id_pertemuan WHERE a.id_anggota=?',[$id])->fetchColumn();
            $daily = ak_query('SELECT MAX(tanggal) FROM ak_absensi_harian WHERE id_anggota=?',[$id])->fetchColumn();
            if (($last && $until<$last) || ($daily && $until<$daily) || (($last || $daily) && $number!==(int)$before['nomor_absen'])) throw new InputError('Keanggotaan yang sudah dipakai absensi harus mempertahankan nomor dan tanggal historis.');
            if($until>$before['selesai'] && ak_one('SELECT id FROM ak_pertemuan WHERE id_kelas=? AND id_tahun_ajaran=? AND tanggal>? AND tanggal<=? LIMIT 1',[$class,$period['id_tahun_ajaran'],$before['selesai'],$until])) throw new InputError('Perpanjangan akan menambah anggota secara retroaktif pada pertemuan tersimpan.');
        }
        if (ak_one('SELECT id FROM ak_anggota_kelas WHERE id_tahun_ajaran=? AND mulai<=? AND selesai>=? AND id<>? AND (nis=? OR (id_kelas=? AND nomor_absen=?)) LIMIT 1 FOR UPDATE',[$period['id_tahun_ajaran'],$until,$from,$id,$nis,$class,$number])) throw new InputError('Rentang keanggotaan atau nomor absen bertumpang tindih.');
        // A roster must not acquire new/missing students retroactively after a meeting was saved.
        if (!$before && ak_one('SELECT id FROM ak_pertemuan WHERE id_kelas=? AND id_tahun_ajaran=? AND tanggal BETWEEN ? AND ? LIMIT 1',[$class,$period['id_tahun_ajaran'],$from,$until])) throw new InputError('Rentang memuat pertemuan tersimpan. Gunakan tanggal berlaku setelah riwayat tersebut.');
        if ($before) ak_query('UPDATE ak_anggota_kelas SET nomor_absen=?,selesai=? WHERE id=?',[$number,$until,$id]);
        else {
            ak_query('INSERT INTO ak_anggota_kelas(nis,id_kelas,id_tahun_ajaran,nomor_absen,mulai,selesai,created_by) VALUES(?,?,?,?,?,?,?)',[$nis,$class,$period['id_tahun_ajaran'],$number,$from,$until,ak_actor()]); $id=(int)db()->lastInsertId();
        }
        ak_audit('anggota',$id,$before?'ubah':'buat',$before,ak_one('SELECT * FROM ak_anggota_kelas WHERE id=?',[$id]),input_text($input,'alasan',500));
        return $id;
    });
}
function ak_save_duty(array $input): int {
    permission('users.manage');
    return db_transaction(function() use ($input): int {
        $period = ak_period(input_id($input,'id_tahun_ajaran'),true);
        $id=($input['id']??'')!==''?input_id($input,'id'):0;
        $before=$id?ak_one('SELECT * FROM ak_tugas_piket WHERE id=? FOR UPDATE',[$id]):null;
        if ($id && (!$before || (int)$before['id_tahun_ajaran']!==(int)$period['id_tahun_ajaran'])) deny_access();
        if ($before && ($input['operation']??'')==='cabut') {
            ak_query('UPDATE ak_tugas_piket SET aktif=0 WHERE id=?',[$id]);
            ak_audit('piket',$id,'cabut',$before,['aktif'=>0],input_text($input,'catatan',500)); return $id;
        }
        $guru=input_id($input,'id_guru'); active_reference('guru','id_guru',$guru);
        if (!ak_one("SELECT id_user FROM users WHERE role='guru' AND id_referensi=? AND status='aktif'",[(string)$guru])) throw new InputError('Guru harus mempunyai akun guru aktif.');
        $class=($input['id_kelas']??'')!==''?input_id($input,'id_kelas'):null;
        if ($class!==null) active_reference('kelas','id_kelas',$class);
        $from=input_date($input,'mulai'); $until=input_date($input,'selesai');
        if ($from>$until || $from<$period['mulai'] || $until>$period['selesai']) throw new InputError('Tanggal tugas di luar periode.');
        $correction=input_choice($input,'boleh_koreksi',['0','1']); $note=input_text($input,'catatan',500);
        $values=[$guru,$period['id_tahun_ajaran'],$class,$from,$until,$correction,$note];
        if ($before) ak_query('UPDATE ak_tugas_piket SET id_guru=?,id_tahun_ajaran=?,id_kelas=?,mulai=?,selesai=?,boleh_koreksi=?,catatan=?,aktif=1 WHERE id=?',[...$values,$id]);
        else {
            ak_query('INSERT INTO ak_tugas_piket(id_guru,id_tahun_ajaran,id_kelas,mulai,selesai,boleh_koreksi,catatan,created_by) VALUES(?,?,?,?,?,?,?,?)',[...$values,ak_actor()]); $id=(int)db()->lastInsertId();
        }
        ak_audit('piket',$id,$before?'ubah':'buat',$before,ak_one('SELECT * FROM ak_tugas_piket WHERE id=?',[$id]),$note); return $id;
    });
}
function ak_save_assignment_window(array $input): void {
    permission('master.manage');
    db_transaction(function() use ($input): void {
        $schedule=locked_row('jadwal','id_jadwal',input_id($input,'id_jadwal'));
        if ($schedule['id_tahun_ajaran']===null) throw new InputError('Penugasan legacy tanpa periode memerlukan keputusan admin terpisah; tidak dapat ditebak di sini.');
        $period=ak_period((int)$schedule['id_tahun_ajaran'],true);
        $from=input_date($input,'mulai'); $until=input_date($input,'selesai');
        if ($from>$until || $from<$period['mulai'] || $until>$period['selesai']) throw new InputError('Rentang penugasan harus berada dalam periode.');
        $verified=input_choice($input,'terverifikasi',['0','1']); $note=input_text($input,'catatan',500);
        $before=ak_one('SELECT * FROM ak_penugasan WHERE id_jadwal=?',[$schedule['id_jadwal']]);
        if ($before && ak_one('SELECT id FROM ak_pertemuan WHERE id_jadwal=? LIMIT 1',[$schedule['id_jadwal']])
            && ($from!==$before['mulai'] || $until!==$before['selesai'] || $verified!==(string)$before['terverifikasi'])) throw new InputError('Rentang penugasan memiliki pertemuan historis. Nonaktifkan jadwal dan buat konteks baru tanpa mengubah riwayat.');
        $values=[$from,$until,$verified,$note,ak_actor(),$schedule['id_jadwal']];
        if ($before) ak_query('UPDATE ak_penugasan SET mulai=?,selesai=?,terverifikasi=?,catatan=?,updated_by=? WHERE id_jadwal=?',$values);
        else ak_query('INSERT INTO ak_penugasan(mulai,selesai,terverifikasi,catatan,updated_by,id_jadwal) VALUES(?,?,?,?,?,?)',$values);
        ak_audit('penugasan',$schedule['id_jadwal'],'atur',$before,ak_one('SELECT * FROM ak_penugasan WHERE id_jadwal=?',[$schedule['id_jadwal']]),$note);
    });
}
function ak_duty_allowed(int $class, int $period, string $date, bool $correction=false): bool {
    $role=current_user()['role'];
    if ($role==='admin' || ($role==='kepala_sekolah' && !$correction)) return true;
    if ($role!=='guru') return false;
    return (bool)ak_one('SELECT id FROM ak_tugas_piket WHERE id_guru=? AND id_tahun_ajaran=? AND aktif=1 AND mulai<=? AND selesai>=? AND (id_kelas IS NULL OR id_kelas=?)'.($correction?' AND boleh_koreksi=1':'').(db()->inTransaction()?' FOR UPDATE':''),[user_reference(),$period,$date,$date,$class]);
}
function ak_require_duty(int $class, int $period, string $date, bool $correction=false, bool $write=false): void {
    if (!ak_duty_allowed($class,$period,$date,$correction) || ($write && current_user()['role']==='kepala_sekolah')) deny_access();
}
