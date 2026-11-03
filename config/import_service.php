<?php
require_once __DIR__.'/crud_service.php';
function import_xml(string $xml):SimpleXMLElement {
    if(stripos($xml,'<!DOCTYPE')!==false)throw new InputError('DOCTYPE tidak diizinkan pada berkas impor.');
    $previous=libxml_use_internal_errors(true);
    try{$parsed=simplexml_load_string($xml,SimpleXMLElement::class,LIBXML_NONET);if($parsed===false)throw new InputError('Struktur XML Excel tidak valid.');return $parsed;}
    finally{libxml_clear_errors();libxml_use_internal_errors($previous);}
}
function import_excel_date_styles(ZipArchive $zip): array {
    $styles=$zip->getFromName('xl/styles.xml');if($styles===false)return [];
    $xml=import_xml($styles)->children('http://schemas.openxmlformats.org/spreadsheetml/2006/main');$formats=[];$dates=[];
    foreach($xml->numFmts->numFmt??[]as $format)$formats[(int)$format->attributes()['numFmtId']]=(string)$format->attributes()['formatCode'];
    $index=0;foreach($xml->cellXfs->xf??[]as $style){
        $id=(int)$style->attributes()['numFmtId'];$format=preg_replace('/"[^"]*"|\[[^\]]*\]|\\\\./u','',$formats[$id]??'');
        if(in_array($id,[14,15,16,17,22,27,28,29,30,31,32,33,34,35,36,50,51,52,53,54,55,56,57,58],true)||(preg_match('/[ymd]/i',$format)&&preg_match('/(?:y.*[md]|[md].*y|d.*m|m.*d)/i',$format)))$dates[$index]=true;
        $index++;
    }return $dates;
}
function import_excel_date(string $value,bool $date1904): string {
    if(!preg_match('/^[0-9]+(?:\.0+)?$/D',$value)||(float)$value>($date1904?2957003:2958465))throw new InputError('Sel tanggal Excel tidak valid. Gunakan tanggal tanpa jam.');
    $days=(int)$value;if(!$date1904&&$days===60)throw new InputError('Tanggal Excel 29 Februari 1900 tidak valid.');
    $base=$date1904?'1904-01-01':($days<60?'1899-12-31':'1899-12-30');
    return (new DateTimeImmutable($base,new DateTimeZone('UTC')))->modify('+'.$days.' days')->format('Y-m-d');
}
function import_rows(string $path,string $extension):array {
    if(filesize($path)>5*1024*1024)throw new InputError('Ukuran impor maksimal 5 MB.');
    $rows=[];
    if($extension==='csv'){
        $file=fopen($path,'r');if(!$file)throw new InputError('Berkas tidak dapat dibaca.');
        try{while(($row=fgetcsv($file,0,',','"',''))!==false){if(count(array_filter($row,fn($value)=>$value!==null&&trim($value)!==''))){if(count($rows)>=2001)throw new InputError('Maksimal 2000 baris per impor.');$rows[]=$row;}}}finally{fclose($file);}
    }elseif($extension==='xlsx'){
        $zip=new ZipArchive();if($zip->open($path)!==true)throw new InputError('Berkas XLSX tidak valid.');
        try{
            if($zip->numFiles>500)throw new InputError('Struktur arsip terlalu besar.');$size=0;for($i=0;$i<$zip->numFiles;$i++)$size+=(int)$zip->statIndex($i)['size'];if($size>8*1024*1024)throw new InputError('Ukuran dekompresi Excel terlalu besar.');
            $shared=[];$data=$zip->getFromName('xl/sharedStrings.xml');
            if($data!==false){foreach(import_xml($data)->children('http://schemas.openxmlformats.org/spreadsheetml/2006/main')->si as $item){$text=(string)$item->t;if(isset($item->r)){foreach($item->r as $r)$text.=(string)$r->t;}$shared[]=$text;}}
            $workbookData=$zip->getFromName('xl/workbook.xml');$relations=$zip->getFromName('xl/_rels/workbook.xml.rels');
            if($workbookData===false||$relations===false)throw new InputError('Struktur workbook Excel tidak lengkap.');
            $workbook=import_xml($workbookData)->children('http://schemas.openxmlformats.org/spreadsheetml/2006/main');$first=$workbook->sheets->sheet[0]??null;if($first===null)throw new InputError('Sheet pertama tidak ditemukan.');
            $rid=(string)$first->attributes('http://schemas.openxmlformats.org/officeDocument/2006/relationships')['id'];$sheetPath=null;
            foreach(import_xml($relations)->children('http://schemas.openxmlformats.org/package/2006/relationships')->Relationship as $relation)if((string)$relation->attributes()['Id']===$rid){
                $target=ltrim((string)$relation->attributes()['Target'],'/');if(!str_starts_with($target,'xl/'))$target='xl/'.$target;
                if((string)$relation->attributes()['TargetMode']==='External'||!str_ends_with((string)$relation->attributes()['Type'],'/worksheet')||!preg_match('~^xl/worksheets/[A-Za-z0-9_.-]+\.xml$~D',$target))throw new InputError('Relasi sheet pertama tidak valid.');
                $sheetPath=$target;break;
            }
            $data=$sheetPath!==null?$zip->getFromName($sheetPath):false;if($data===false)throw new InputError('Sheet data pertama tidak ditemukan.');
            $dateStyles=import_excel_date_styles($zip);$date1904=in_array(strtolower((string)($workbook->workbookPr->attributes()['date1904']??'')),['1','true'],true);
            foreach(import_xml($data)->children('http://schemas.openxmlformats.org/spreadsheetml/2006/main')->sheetData->row as $row){
                $values=[];
                foreach($row->c as $cell){$ref=(string)$cell->attributes()['r'];if(!preg_match('/^([A-Z]+)[0-9]+$/D',$ref,$match))throw new InputError('Referensi sel tidak valid.');$index=0;foreach(str_split($match[1]) as $letter)$index=$index*26+ord($letter)-64;$index--;if($index>50)throw new InputError('Kolom Excel terlalu banyak.');
                    $type=(string)$cell->attributes()['t'];$value=(string)$cell->v;
                    if($type==='e'||isset($cell->f))throw new InputError('Gunakan nilai literal, bukan error/formula Excel.');
                    if($type==='s')$value=$shared[(int)$value]??'';
                    elseif($type==='inlineStr'){$value=(string)$cell->is->t;if(isset($cell->is->r))foreach($cell->is->r as $part)$value.=(string)$part->t;}
                    elseif($type==='d'){if(!preg_match('/^[0-9]{4}-[0-9]{2}-[0-9]{2}(?:T00:00:00(?:\.0+)?)?$/D',$value))throw new InputError('Gunakan tanggal Excel tanpa jam.');$value=substr($value,0,10);}
                    elseif($value!==''&&($type===''||$type==='n')&&isset($dateStyles[(int)$cell->attributes()['s']]))$value=import_excel_date($value,$date1904);
                    if(array_key_exists($index,$values))throw new InputError('Referensi sel Excel berulang.');
                    $values[$index]=trim($value);
                }
                if($values){$complete=array_fill(0,max(array_keys($values))+1,'');foreach($values as $index=>$value)$complete[$index]=$value;if(array_filter($complete,fn($v)=>$v!=='')){if(count($rows)>=2001)throw new InputError('Maksimal 2000 baris per impor.');$rows[]=$complete;}}
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
