<?php
declare(strict_types=1);
require_once __DIR__.'/auth.php';
function master_definitions():array {
    return [
        'jurusan'=>['label'=>'Jurusan','pk'=>'id_jurusan','fields'=>['kode_jurusan','nama_jurusan']],
        'kelas'=>['label'=>'Kelas','pk'=>'id_kelas','fields'=>['nama_kelas','tingkat','id_jurusan']],
        'siswa'=>['label'=>'Siswa','pk'=>'nis','fields'=>['nama_siswa','jenis_kelamin','tanggal_lahir','alamat','id_kelas']],
        'guru'=>['label'=>'Guru','pk'=>'id_guru','fields'=>['nip','nama_guru','email','no_hp']],
        'mata_pelajaran'=>['label'=>'Mata Pelajaran','pk'=>'id_mapel','fields'=>['kode_mapel','nama_mapel','kelompok','kkm']],
        'ak_ruang'=>['label'=>'Ruang & Laboratorium','pk'=>'id_ruang','fields'=>['kode_ruang','nama_ruang','jenis']],
    ];
}
function locked_row(string $table,string $pk,string|int $id):array {
    $q=db()->prepare("SELECT * FROM `$table` WHERE `$pk`=? FOR UPDATE");$q->execute([$id]);$row=$q->fetch();if(!$row)not_found();return $row;
}
function active_reference(string $table,string $pk,string|int $id):array {
    $q=db()->prepare("SELECT * FROM `$table` WHERE `$pk`=? AND status='aktif' FOR UPDATE");$q->execute([$id]);$row=$q->fetch();if(!$row)throw new InputError('Referensi '.str_replace('_',' ',$table).' tidak valid atau nonaktif.');return $row;
}
function unique_value(string $table,string $field,string $value,string $pk,string|int|null $except):void {
    $q=db()->prepare("SELECT `$pk` FROM `$table` WHERE `$field`=?".($except!==null?" AND `$pk`<>?":'').' LIMIT 1 FOR UPDATE');$q->execute($except!==null?[$value,$except]:[$value]);
    if($q->fetch())throw new InputError('Data '.str_replace('_',' ',$field).' sudah digunakan.');
}
function save_master(string $table,array $input):string {
    permission('master.manage');$defs=master_definitions();if(!isset($defs[$table]))not_found();$def=$defs[$table];$pk=$def['pk'];
    return db_transaction(function(PDO $pdo)use($table,$input,$def,$pk):string{
        $action=input_choice($input,'action',['create','update','delete','deactivate','activate']);
        $id=$action==='create'?null:input_text($input,'original_id',20);$before=$id!==null?locked_row($table,$pk,$id):null;
        if(in_array($action,['delete','deactivate','activate'],true)){
            $status=$action==='activate'?'aktif':'nonaktif';
            $pdo->prepare("UPDATE `$table` SET status=? WHERE `$pk`=?")->execute([$status,$id]);
            if($status==='nonaktif' && in_array($table,['siswa','guru'],true)){
                $q=$pdo->prepare('SELECT id_user FROM users WHERE role=? AND id_referensi=? FOR UPDATE');$q->execute([$table,(string)$id]);
                foreach($q->fetchAll() as $u){$old=locked_row('users','id_user',$u['id_user']);$pdo->prepare("UPDATE users SET status='nonaktif' WHERE id_user=?")->execute([$u['id_user']]);audit_change('users',(string)$u['id_user'],'deactivate',$old,['status'=>'nonaktif']);}
            }
            audit_change($table,(string)$id,$status==='aktif'?'activate':'deactivate',$before,['status'=>$status]);return (string)$id;
        }
        $data=[];
        foreach($def['fields'] as $field)$data[$field]=input_text($input,$field,$field==='alamat'?2000:($field==='nama_siswa'||$field==='nama_guru'||$field==='nama_mapel'||$field==='nama_jurusan'?100:255),!in_array($field,['alamat','email','no_hp'],true));
        if($table==='siswa'){
            $nis=input_text($input,'nis',15);if(!preg_match('/^[0-9]{1,15}$/D',$nis))throw new InputError('NIS harus 1–15 digit; nol di depan dipertahankan.');
            if($before && $nis!==(string)$id)throw new InputError('NIS tidak dapat diganti karena menjadi identitas arsip.');
            if(!$before){unique_value($table,'nis',$nis,$pk,null);$data=['nis'=>$nis]+$data;}
            $data['jenis_kelamin']=input_choice($input,'jenis_kelamin',['L','P']);$data['tanggal_lahir']=input_date($input,'tanggal_lahir');
            if($data['tanggal_lahir']>=date('Y-m-d') || $data['tanggal_lahir']<'1900-01-01')throw new InputError('Tanggal lahir tidak masuk rentang yang valid.');
            $data['id_kelas']=input_id($input,'id_kelas');active_reference('kelas','id_kelas',$data['id_kelas']);
            if($before && (int)$before['id_kelas']!==$data['id_kelas']){
                if(app_setting('ACADEMIC_WORKFLOWS')==='1'){
                    $membership=$pdo->prepare('SELECT 1 FROM ak_anggota_kelas WHERE nis=? LIMIT 1');$membership->execute([$id]);
                    if($membership->fetch())throw new InputError('Gunakan keanggotaan kelas bertanggal untuk perpindahan siswa. Konteks master lama dipertahankan.');
                }
                $q=$pdo->prepare('SELECT (SELECT COUNT(*) FROM nilai WHERE nis=?)+(SELECT COUNT(*) FROM absensi WHERE nis=?)+(SELECT COUNT(*) FROM nilai_ekskul WHERE nis=?)');$q->execute([$id,$id,$id]);
                if((int)$q->fetchColumn()>0)throw new InputError('Siswa memiliki arsip. Perpindahan kelas memerlukan proses khusus yang menjaga riwayat keanggotaan.');
            }
        }elseif($table==='guru'){
            $data['nip']=input_text($input,'nip',20);if(!preg_match('/^[A-Za-z0-9.\/-]{3,20}$/D',$data['nip']))throw new InputError('NIP tidak valid.');
            unique_value($table,'nip',$data['nip'],$pk,$id);
            $data['email']=input_text($input,'email',100,false);if($data['email']!=='' && !filter_var($data['email'],FILTER_VALIDATE_EMAIL))throw new InputError('Email tidak valid.');
            $data['no_hp']=input_text($input,'no_hp',20,false);if($data['no_hp']!=='' && !preg_match('/^[+0-9() -]{5,20}$/D',$data['no_hp']))throw new InputError('Nomor telepon tidak valid.');
        }elseif($table==='kelas'){
            $data['nama_kelas']=input_text($input,'nama_kelas',20);unique_value($table,'nama_kelas',$data['nama_kelas'],$pk,$id);
            $data['tingkat']=input_choice($input,'tingkat',['X','XI','XII']);$data['id_jurusan']=input_id($input,'id_jurusan');active_reference('jurusan','id_jurusan',$data['id_jurusan']);
            if($before && app_setting('ACADEMIC_WORKFLOWS')==='1' && ($data['tingkat']!==$before['tingkat'] || $data['id_jurusan']!==(int)$before['id_jurusan'])){
                $q=$pdo->prepare('SELECT id FROM ak_anggota_kelas WHERE id_kelas=? LIMIT 1');$q->execute([$id]);
                if($q->fetch())throw new InputError('Tingkat dan jurusan kelas beranggota historis tidak dapat diganti. Buat kelas baru; nama tetap dapat diperbaiki.');
            }
        }elseif($table==='ak_ruang'){
            $data['kode_ruang']=input_text($input,'kode_ruang',20);$data['nama_ruang']=input_text($input,'nama_ruang',20);$data['jenis']=input_choice($input,'jenis',['Kelas','Laboratorium']);
            foreach(['kode_ruang','nama_ruang']as $field)unique_value($table,$field,$data[$field],$pk,$id);
            if($before&&$before['nama_ruang']!==$data['nama_ruang']){$q=$pdo->prepare('SELECT id_jadwal FROM jadwal WHERE ruang=? LIMIT 1');$q->execute([$before['nama_ruang']]);if($q->fetch())throw new InputError('Nama ruang telah dipakai jadwal. Nonaktifkan dan buat ruang baru agar histori tetap.');}
            $data['updated_by']=(int)current_user()['id_user'];if(!$before)$data['created_by']=(int)current_user()['id_user'];
        }elseif($table==='mata_pelajaran'){
            $data['kode_mapel']=input_text($input,'kode_mapel',10);unique_value($table,'kode_mapel',$data['kode_mapel'],$pk,$id);
            $data['kelompok']=input_choice($input,'kelompok',['Muatan Nasional','Muatan Kewilayahan','Produktif']);$data['kkm']=input_number($input,'kkm',1,100);
        }else{$data['kode_jurusan']=input_text($input,'kode_jurusan',10);unique_value($table,'kode_jurusan',$data['kode_jurusan'],$pk,$id);}
        foreach(['alamat','email','no_hp'] as $field)if(array_key_exists($field,$data) && $data[$field]==='')$data[$field]=null;
        if($before){$set=implode(',',array_map(fn($k)=>"`$k`=?",array_keys($data)));$pdo->prepare("UPDATE `$table` SET $set WHERE `$pk`=?")->execute([...array_values($data),$id]);}
        else{$fields=implode('`,`',array_keys($data));$marks=implode(',',array_fill(0,count($data),'?'));$pdo->prepare("INSERT INTO `$table` (`$fields`) VALUES($marks)")->execute(array_values($data));$id=$table==='siswa'?$data['nis']:$pdo->lastInsertId();}
        audit_change($table,(string)$id,$action,$before,$data);return (string)$id;
    });
}
function save_user(array $input):int {
    permission('users.manage');
    return db_transaction(function(PDO $pdo)use($input):int{
        $action=input_choice($input,'action',['create','update','deactivate','activate','reset','delete']);$id=$action==='create'?null:input_id($input,'id_user');$before=$id!==null?locked_row('users','id_user',$id):null;
        // Lock the complete administrator set so parallel changes cannot remove the last admin.
        $admins=$pdo->query("SELECT id_user FROM users WHERE role='admin' AND status='aktif' ORDER BY id_user FOR UPDATE")->fetchAll(PDO::FETCH_COLUMN);
        if(in_array($action,['deactivate','activate','delete'],true)){$data=['status'=>$action==='activate'?'aktif':'nonaktif'];}
        elseif($action==='reset'){$password=$input['password']??null;if(!is_string($password))throw new InputError('Password tidak valid.');valid_new_password($password);$data=['password'=>password_hash($password,PASSWORD_BCRYPT)];}
        else{
            $username=input_text($input,'username',50);if(!preg_match('/^[A-Za-z0-9_.@-]{3,50}$/D',$username))throw new InputError('Username tidak valid.');unique_value('users','username',$username,'id_user',$id);
            $role=input_choice($input,'role',['admin','guru','kepala_sekolah','siswa']);$status=input_choice($input,'status',['aktif','nonaktif']);$ref=input_text($input,'id_referensi',20,false);
            if(in_array($role,['guru','siswa'],true)){
                if($ref==='' || !valid_reference_shape($role,$ref))throw new InputError('Referensi guru/siswa tidak valid.');$table=$role;$pk=$role==='guru'?'id_guru':'nis';active_reference($table,$pk,$ref);
                $q=$pdo->prepare('SELECT id_user FROM users WHERE role=? AND id_referensi=?'.($id!==null?' AND id_user<>?':'').' LIMIT 1 FOR UPDATE');$q->execute($id!==null?[$role,$ref,$id]:[$role,$ref]);if($q->fetch())throw new InputError('Identitas tersebut sudah mempunyai akun pada role yang sama.');
            }elseif($ref!=='')throw new InputError('Role ini tidak menggunakan ID referensi.');
            $data=['username'=>$username,'role'=>$role,'id_referensi'=>$ref===''?null:$ref,'status'=>$status];
            $password=$input['password']??'';if(!is_string($password))throw new InputError('Password tidak valid.');
            if(!$before || $password!==''){valid_new_password($password);$data['password']=password_hash($password,PASSWORD_BCRYPT);}
        }
        if($before && ($data['status']??$before['status'])==='aktif' && !isset($data['role']) && in_array($before['role'],['guru','siswa'],true)){
            if(!valid_reference_shape($before['role'],$before['id_referensi']))throw new InputError('Referensi akun tidak valid.');
            active_reference($before['role'],$before['role']==='guru'?'id_guru':'nis',$before['id_referensi']);
        }
        if($before && $before['role']==='admin' && $before['status']==='aktif' && count($admins)===1 && (($data['role']??'admin')!=='admin' || ($data['status']??'aktif')!=='aktif'))throw new InputError('Administrator aktif terakhir tidak dapat dinonaktifkan atau diganti role.');
        if($before){$set=implode(',',array_map(fn($key)=>"`$key`=?",array_keys($data)));$pdo->prepare('UPDATE users SET '.$set.' WHERE id_user=?')->execute([...array_values($data),$id]);}
        else{$keys=implode(',',array_keys($data));$pdo->prepare('INSERT INTO users('.$keys.') VALUES('.implode(',',array_fill(0,count($data),'?')).')')->execute(array_values($data));$id=(int)$pdo->lastInsertId();}
        audit_change('users',(string)$id,$action,$before,$data);return $id;
    });
}
function save_schedule(array $input):int {
    permission('master.manage');
    return db_transaction(function(PDO $pdo)use($input):int{
        $action=input_choice($input,'action',['create','update','delete','deactivate','activate']);$id=$action==='create'?null:input_id($input,'id_jadwal');$before=$id!==null?locked_row('jadwal','id_jadwal',$id):null;
        if(in_array($action,['delete','deactivate'],true)){$pdo->prepare("UPDATE jadwal SET status='nonaktif' WHERE id_jadwal=?")->execute([$id]);audit_change('jadwal',(string)$id,'deactivate',$before,['status'=>'nonaktif']);return $id;}
        if($action==='activate')$input=$before+['action'=>'update'];
        if($before && app_setting('ACADEMIC_WORKFLOWS')==='1'){
            $history=$pdo->prepare('SELECT 1 FROM ak_penugasan WHERE id_jadwal=? LIMIT 1');$history->execute([$id]);
            if($history->fetch() && $action!=='activate'){
                foreach(['id_guru','id_mapel','id_kelas','id_tahun_ajaran','hari','jam_mulai','jam_selesai','ruang'] as $field){
                    $value=$input[$field]??'';if(in_array($field,['jam_mulai','jam_selesai'],true) && is_string($value) && strlen($value)===5)$value.=':00';
                    if(!is_scalar($value) || (string)$value!==(string)($before[$field]??''))throw new InputError('Penugasan telah diverifikasi. Nonaktifkan dan buat jadwal baru agar konteks historis tetap.');
                }
            }
        }
        $data=[];foreach(['id_guru','id_mapel','id_kelas','id_tahun_ajaran'] as $key)$data[$key]=input_id($input,$key);
        active_reference('guru','id_guru',$data['id_guru']);active_reference('mata_pelajaran','id_mapel',$data['id_mapel']);active_reference('kelas','id_kelas',$data['id_kelas']);
        $period=locked_row('tahun_ajaran','id_tahun_ajaran',$data['id_tahun_ajaran']);if($period['status']!=='Aktif' || (int)$period['dikunci'])throw new InputError('Penugasan baru/perubahan harus berada pada periode aktif yang tidak terkunci.');
        $data['hari']=input_choice($input,'hari',['Senin','Selasa','Rabu','Kamis','Jumat']);
        foreach(['jam_mulai','jam_selesai'] as $key){$time=input_text($input,$key,8);if(!preg_match('/^(?:[01][0-9]|2[0-3]):[0-5][0-9](?::[0-5][0-9])?$/D',$time))throw new InputError('Jam tidak valid.');$data[$key]=strlen($time)===5?$time.':00':$time;}
        if($data['jam_mulai']>=$data['jam_selesai'])throw new InputError('Jam selesai harus sesudah jam mulai.');$data['ruang']=input_text($input,'ruang',20,false)?:null;
        if(app_setting('ROOM_CATALOG_ENFORCED')==='1'&&$data['ruang']!==null&&(!$before||$data['ruang']!==$before['ruang'])){
            $q=$pdo->prepare("SELECT id_ruang FROM ak_ruang WHERE nama_ruang=? AND status='aktif' FOR UPDATE");$q->execute([$data['ruang']]);if(!$q->fetch())throw new InputError('Pilih ruang aktif dari master ruang/laboratorium.');
        }
        if($before){$q=$pdo->prepare('SELECT (SELECT COUNT(*) FROM absensi WHERE id_jadwal=?)+(SELECT COUNT(*) FROM jurnal_kelas WHERE id_jadwal=?)');$q->execute([$id,$id]);$used=(int)$q->fetchColumn();$gradeCheck=$pdo->prepare('SELECT COUNT(*) FROM nilai n JOIN siswa s ON s.nis=n.nis WHERE n.id_guru=? AND n.id_mapel=? AND s.id_kelas=? AND (? IS NULL OR n.id_tahun_ajaran=?)');$gradeCheck->execute([$before['id_guru'],$before['id_mapel'],$before['id_kelas'],$before['id_tahun_ajaran'],$before['id_tahun_ajaran']]);$used+=(int)$gradeCheck->fetchColumn();if($used>0)foreach($data as $key=>$value)if((string)$value!==(string)$before[$key])throw new InputError('Penugasan sudah memiliki arsip. Nonaktifkan dan buat penugasan baru untuk perubahan konteks.');}
        $q=$pdo->prepare("SELECT id_jadwal FROM jadwal WHERE status='aktif' AND hari=? AND (id_tahun_ajaran=? OR id_tahun_ajaran IS NULL) AND jam_mulai<? AND jam_selesai>? AND (id_guru=? OR id_kelas=? OR (? IS NOT NULL AND ruang=?)) AND id_jadwal<>? LIMIT 1 FOR UPDATE");
        $q->execute([$data['hari'],$data['id_tahun_ajaran'],$data['jam_selesai'],$data['jam_mulai'],$data['id_guru'],$data['id_kelas'],$data['ruang'],$data['ruang'],$id??0]);if($q->fetch())throw new InputError('Bentrok jadwal guru, kelas, atau ruang.');
        $data['status']='aktif';
        if($before){$set=implode(',',array_map(fn($k)=>"`$k`=?",array_keys($data)));$pdo->prepare('UPDATE jadwal SET '.$set.' WHERE id_jadwal=?')->execute([...array_values($data),$id]);}
        else{$pdo->prepare('INSERT INTO jadwal('.implode(',',array_keys($data)).') VALUES('.implode(',',array_fill(0,count($data),'?')).')')->execute(array_values($data));$id=(int)$pdo->lastInsertId();}
        audit_change('jadwal',(string)$id,$action,$before,$data);return $id;
    });
}
function save_period(array $input):int {
    permission('period.manage');
    return db_transaction(function(PDO $pdo)use($input):int{
        $pdo->query('SELECT id_tahun_ajaran FROM tahun_ajaran ORDER BY id_tahun_ajaran FOR UPDATE')->fetchAll();
        $action=input_choice($input,'action',['create','update','activate']);$id=$action==='create'?null:input_id($input,'id_tahun_ajaran');$before=$id!==null?locked_row('tahun_ajaran','id_tahun_ajaran',$id):null;
        if($action==='activate'){$data=['status'=>'Aktif'];}
        else{
            $year=input_text($input,'tahun_ajaran',10);if(!preg_match('/^([0-9]{4})\/([0-9]{4})$/D',$year,$m) || (int)$m[2]!==((int)$m[1]+1))throw new InputError('Format tahun ajaran harus dua tahun berurutan.');
            $data=['tahun_ajaran'=>$year,'semester'=>input_choice($input,'semester',['Ganjil','Genap']),'status'=>input_choice($input,'status',['Aktif','Tidak Aktif']),'dikunci'=>input_choice($input,'dikunci',['0','1']),'rapor_diterbitkan'=>input_choice($input,'rapor_diterbitkan',['0','1'])];
            if($before && ($before['tahun_ajaran']!==$year || $before['semester']!==$data['semester'])){
                $periodTables=['nilai','nilai_ekskul','jadwal','catatan_evaluasi'];if(app_setting('ACADEMIC_WORKFLOWS')==='1')$periodTables=[...$periodTables,'ak_periode','ak_anggota_kelas','ak_tugas_piket','ak_kalender'];
                foreach($periodTables as $table){$q=$pdo->prepare("SELECT 1 FROM `$table` WHERE id_tahun_ajaran=? LIMIT 1");$q->execute([$id]);if($q->fetch())throw new InputError('Identitas periode yang mempunyai arsip tidak dapat diganti.');}
            }
            if($before && $before['status']==='Aktif' && $data['status']!=='Aktif')throw new InputError('Aktifkan periode pengganti agar sistem tidak kehilangan periode aktif.');
        }
        if($data['status']==='Aktif'){
            $old=$pdo->query("SELECT * FROM tahun_ajaran WHERE status='Aktif'")->fetchAll();
            foreach($old as $row)if((int)$row['id_tahun_ajaran']!==$id){$pdo->prepare("UPDATE tahun_ajaran SET status='Tidak Aktif' WHERE id_tahun_ajaran=?")->execute([$row['id_tahun_ajaran']]);audit_change('tahun_ajaran',(string)$row['id_tahun_ajaran'],'deactivate',$row,['status'=>'Tidak Aktif']);}
        }
        if($before){$set=implode(',',array_map(fn($k)=>"`$k`=?",array_keys($data)));$pdo->prepare('UPDATE tahun_ajaran SET '.$set.' WHERE id_tahun_ajaran=?')->execute([...array_values($data),$id]);}
        else{$pdo->prepare('INSERT INTO tahun_ajaran('.implode(',',array_keys($data)).') VALUES('.implode(',',array_fill(0,count($data),'?')).')')->execute(array_values($data));$id=(int)$pdo->lastInsertId();}
        audit_change('tahun_ajaran',(string)$id,$action,$before,$data);return $id;
    });
}
