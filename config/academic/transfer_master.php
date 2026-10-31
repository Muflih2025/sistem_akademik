<?php
declare(strict_types=1);
require_once __DIR__.'/foundation.php';

const AK_MASTER_IMPORT_KEYS=['siswa'=>'nis','guru'=>'nip','kelas'=>'nama_kelas','jurusan'=>'kode_jurusan','mata_pelajaran'=>'kode_mapel','ak_ruang'=>'kode_ruang'];
function ak_validate_master_import(string $module,array $row): void {
    permission('master.manage');
    if($module==='kelas'){
        input_text($row,'nama_kelas',20);input_choice($row,'tingkat',['X','XI','XII']);$major=input_id($row,'id_jurusan');
        if(!ak_one("SELECT id_jurusan FROM jurusan WHERE id_jurusan=? AND status='aktif'",[$major]))throw new InputError('ID jurusan tidak dikenal atau nonaktif.');
    }elseif($module==='ak_ruang'){
        input_text($row,'kode_ruang',20);$name=input_text($row,'nama_ruang',20);input_choice($row,'jenis',['Kelas','Laboratorium']);
        if(ak_one('SELECT id_ruang FROM ak_ruang WHERE nama_ruang=?',[$name]))throw new InputError('Nama ruang sudah ada.');
    }elseif($module==='jurusan'){
        input_text($row,'kode_jurusan',10);input_text($row,'nama_jurusan',100);
    }elseif($module==='mata_pelajaran'){
        input_text($row,'kode_mapel',10);input_text($row,'nama_mapel',100);
        input_choice($row,'kelompok',['Muatan Nasional','Muatan Kewilayahan','Produktif']);input_number($row,'kkm',1,100);
    }else throw new InputError('Jenis master belum didukung.');
    $key=AK_MASTER_IMPORT_KEYS[$module];
    if(ak_one('SELECT 1 FROM `'.$module.'` WHERE `'.$key.'`=? LIMIT 1',[$row[$key]]))throw new InputError('Identitas sudah ada. Bulk upload hanya menambah data; gunakan Edit untuk koreksi existing.');
}
