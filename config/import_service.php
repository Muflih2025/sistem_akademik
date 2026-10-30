<?php
require_once __DIR__.'/crud_service.php';
function import_xml(string $xml):SimpleXMLElement {
    if(stripos($xml,'<!DOCTYPE')!==false)throw new InputError('DOCTYPE tidak diizinkan pada berkas impor.');
    $previous=libxml_use_internal_errors(true);
    try{$parsed=simplexml_load_string($xml,SimpleXMLElement::class,LIBXML_NONET);if(!$parsed)throw new InputError('Struktur XML Excel tidak valid.');return $parsed;}
    finally{libxml_clear_errors();libxml_use_internal_errors($previous);}
}
function import_rows(string $path,string $extension):array {
    if(filesize($path)>5*1024*1024)throw new InputError('Ukuran impor maksimal 5 MB.');
    $rows=[];
    if($extension==='csv'){
        $file=fopen($path,'r');if(!$file)throw new InputError('Berkas tidak dapat dibaca.');
        try{while(($row=fgetcsv($file,0,',','"',''))!==false){if(count($rows)>=2001)throw new InputError('Maksimal 2000 baris per impor.');if(count(array_filter($row,fn($value)=>$value!==null&&$value!=='')))$rows[]=$row;}}finally{fclose($file);}
    }elseif($extension==='xlsx'){
        $zip=new ZipArchive();if($zip->open($path)!==true)throw new InputError('Berkas XLSX tidak valid.');
        try{
            if($zip->numFiles>500)throw new InputError('Struktur arsip terlalu besar.');$size=0;for($i=0;$i<$zip->numFiles;$i++)$size+=(int)$zip->statIndex($i)['size'];if($size>8*1024*1024)throw new InputError('Ukuran dekompresi Excel terlalu besar.');
            $shared=[];$data=$zip->getFromName('xl/sharedStrings.xml');
            if($data!==false){foreach(import_xml($data)->si as $item){$text=(string)$item->t;if(isset($item->r)){foreach($item->r as $r)$text.=(string)$r->t;}$shared[]=$text;}}
            $data=$zip->getFromName('xl/worksheets/sheet1.xml');if($data===false)throw new InputError('Sheet pertama tidak ditemukan.');
            foreach(import_xml($data)->sheetData->row as $row){
                if(count($rows)>=2001)throw new InputError('Maksimal 2000 baris per impor.');$values=[];
                foreach($row->c as $cell){$ref=(string)$cell['r'];if(!preg_match('/^([A-Z]+)[0-9]+$/D',$ref,$match))throw new InputError('Referensi sel tidak valid.');$index=0;foreach(str_split($match[1]) as $letter)$index=$index*26+ord($letter)-64;$index--;if($index>50)throw new InputError('Kolom Excel terlalu banyak.');
                    $type=(string)$cell['t'];$value=(string)$cell->v;
                    if($type==='s')$value=$shared[(int)$value]??'';
                    elseif($type==='inlineStr'){$value=(string)$cell->is->t;if(isset($cell->is->r))foreach($cell->is->r as $part)$value.=(string)$part->t;}
                    elseif($type==='e' || isset($cell->f))throw new InputError('Gunakan nilai literal, bukan error/formula Excel.');
                    $values[$index]=trim($value);
                }
                if($values){$complete=array_fill(0,max(array_keys($values))+1,'');foreach($values as $index=>$value)$complete[$index]=$value;$rows[]=$complete;}
            }
        }finally{$zip->close();}
    }else throw new InputError('Gunakan CSV atau XLSX.');
    if(count($rows)<2)throw new InputError('Impor memerlukan header dan paling sedikit satu baris data.');return $rows;
}
function import_master_rows(string $type,array $rows):int {
    permission('master.manage');if(!in_array($type,['siswa','guru'],true))throw new InputError('Jenis impor tidak valid.');
    $aliases=['nis'=>'nis','nama_siswa'=>'nama_siswa','jenis_kelamin'=>'jenis_kelamin','kelas'=>'kelas','id_kelas'=>'id_kelas','tanggal_lahir'=>'tanggal_lahir','alamat'=>'alamat','nip'=>'nip','nama_guru'=>'nama_guru','email'=>'email','no_hp'=>'no_hp'];
    $headers=[];foreach(array_shift($rows) as $index=>$value){$key=strtolower(trim(preg_replace('/\s+/u','_',ltrim((string)$value,"\xEF\xBB\xBF"))));if(isset($aliases[$key]))$headers[$index]=$aliases[$key];}
    $required=$type==='siswa'?['nis','nama_siswa','jenis_kelamin','tanggal_lahir']:['nip','nama_guru'];
    foreach($required as $key)if(!in_array($key,$headers,true))throw new InputError('Header '.$key.' wajib tersedia.');
    if($type==='siswa'&&!in_array('kelas',$headers,true)&&!in_array('id_kelas',$headers,true))throw new InputError('Header kelas atau id_kelas wajib tersedia.');
    return db_transaction(function(PDO $pdo)use($type,$rows,$headers):int{
        $seen=[];$count=0;
        foreach($rows as $index=>$row){$data=[];foreach($headers as $column=>$key)$data[$key]=(string)($row[$column]??'');$unique=$type==='siswa'?'nis':'nip';$identifier=trim($data[$unique]??'');if(isset($seen[$identifier]))throw new InputError('Identitas berulang pada berkas impor.');$seen[$identifier]=true;
            if($type==='siswa'&&!isset($data['id_kelas'])){$q=$pdo->prepare("SELECT id_kelas FROM kelas WHERE nama_kelas=? AND status='aktif'");$q->execute([trim($data['kelas']??'')]);$classes=$q->fetchAll(PDO::FETCH_COLUMN);if(count($classes)!==1)throw new InputError('Nama kelas tidak dikenal atau ambigu pada baris '.($index+2).'.');$data['id_kelas']=(string)$classes[0];}
            $pk=$type==='siswa'?'nis':'id_guru';$q=$pdo->prepare("SELECT `$pk` FROM `$type` WHERE `$unique`=?");$q->execute([$identifier]);$id=$q->fetchColumn();$data['action']=$id===false?'create':'update';if($id!==false)$data['original_id']=(string)$id;
            try{save_master($type,$data);}catch(InputError $error){throw new InputError('Baris '.($index+2).': '.$error->getMessage());}$count++;
        }
        return $count;
    });
}
