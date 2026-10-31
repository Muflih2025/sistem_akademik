<?php
declare(strict_types=1);
require_once __DIR__.'/attendance.php';
require_once __DIR__.'/grades.php';
require_once __DIR__.'/transfer.php';

function ak_report_range(array $input,int $periodId): array {
    $from=input_date($input,'mulai'); $until=input_date($input,'selesai');
    ak_period($periodId,false,$from); ak_period($periodId,false,$until);
    if ($from>$until || (new DateTimeImmutable($from))->diff(new DateTimeImmutable($until))->days>189) throw new InputError('Rentang laporan maksimal 190 hari dan harus berurutan.');
    $dates=[]; for($d=new DateTimeImmutable($from);$d->format('Y-m-d')<=$until;$d=$d->modify('+1 day'))$dates[]=$d->format('Y-m-d');
    return $dates;
}
function ak_export_data(string $kind,array $input): array {
    $role=current_user()['role'];
    if($kind==='template')return ak_import_template(input_choice($input,'module',array_keys(AK_IMPORT_HEADERS)),$input);
    if($kind==='nilai') {
        require_role('guru');$rows=ak_grade_rows(input_id($input,'id_jadwal'));
        return ['title'=>'Rekap nilai mapel berversi','headers'=>['NIS','Nama','Nilai akhir','Predikat','Deskripsi','Versi aturan','KKM'],
            'rows'=>array_map(fn($r)=>[$r['nis'],$r['nama_siswa'],(float)$r['nilai_akhir'],$r['predikat'],$r['deskripsi'],(int)$r['versi_aturan'],(float)$r['kkm']],$rows)];
    }
    if($kind==='rapor') {
        $report=ak_report(input_id($input,'id'));$p=$report['payload'];
        $rows=[['Siswa',$p['siswa']['nis'].' · '.$p['siswa']['nama'],'','',''],['Kelas',$p['siswa']['kelas'],'','',''],['Periode',$p['periode']['tahun_ajaran'].' '.$p['periode']['semester'],'','',''],['Status',$report['status'].' · snapshot v'.$report['versi'],'','',''],['Batas rekap',$p['periode']['batas_rekap'],'','','']];
        foreach($p['nilai'] as $g)$rows[]=[$g['nama_mapel'],(float)$g['nilai_akhir'],$g['predikat'],'Aturan v'.$g['versi_aturan'],$g['deskripsi']];
        foreach(AK_STATUSES as $code=>$label)$rows[]=['Kehadiran '.$label,(int)$p['kehadiran_harian'][$code],'','',''];
        $rows[]=['Hash snapshot',$report['payload_hash'],'','',''];
        return ['title'=>'Rapor semester — '.$p['siswa']['nama'],'headers'=>['Mapel / isian','Nilai / data','Predikat','Versi','Deskripsi'],'rows'=>$rows];
    }
    if ($kind==='jurnal') {
        require_role('guru','admin','kepala_sekolah');
        $meeting=ak_one('SELECT p.*,k.nama_kelas,m.nama_mapel,g.nama_guru,x.nama_guru AS pengganti FROM ak_pertemuan p JOIN kelas k ON k.id_kelas=p.id_kelas JOIN mata_pelajaran m ON m.id_mapel=p.id_mapel JOIN guru g ON g.id_guru=p.id_guru LEFT JOIN guru x ON x.id_guru=p.id_guru_pengganti WHERE p.id=?',[input_id($input,'id')]);
        if (!$meeting || ($role==='guru' && (int)$meeting['id_guru']!==(int)user_reference())) deny_access();
        $rows=[];
        foreach(['id'=>'ID pertemuan','tanggal'=>'Tanggal','nama_kelas'=>'Kelas','nama_guru'=>'Guru','nama_mapel'=>'Mapel','jam_ke'=>'Jam ke','pertemuan_ke'=>'Pertemuan ke','tp_atp'=>'TP / ATP','materi'=>'Materi','kegiatan'=>'Kegiatan','pengganti'=>'Guru pengganti','refleksi'=>'Refleksi','catatan'=>'Catatan','tindak_lanjut'=>'Tindak lanjut'] as $key=>$label)$rows[]=[$label,(string)($meeting[$key]??'')];
        $rows[]=['DAFTAR HADIR','Nomor · NIS · Nama · Status · Keterangan'];
        foreach(ak_meeting_rows((int)$meeting['id']) as $row)$rows[]=[(string)$row['nomor_absen'].' · '.$row['nis'],$row['nama_snapshot'].' · '.$row['status'].' · '.$row['keterangan']];
        return ['title'=>'Jurnal KBM & Agenda Guru — '.$meeting['nama_kelas'].' — '.$meeting['tanggal'],'headers'=>['Isian','Data'],'rows'=>$rows];
    }
    if ($kind==='agenda') {
        require_role('guru','admin','kepala_sekolah');$period=input_id($input,'id_tahun_ajaran');ak_period($period);
        $scope=$role==='guru'?' AND p.id_guru=?':'';$args=$role==='guru'?[$period,user_reference()]:[$period];
        if(($input['id_kelas']??'')!==''){$scope.=' AND p.id_kelas=?';$args[]=input_id($input,'id_kelas');}
        if(($input['mulai']??'')!=='' && ($input['selesai']??'')!==''){$dates=ak_report_range($input,$period);$scope.=' AND p.tanggal BETWEEN ? AND ?';$args[]=$dates[0];$args[]=end($dates);}
        $rows=ak_rows('SELECT p.id,p.tanggal,k.nama_kelas,g.nama_guru,m.nama_mapel,p.jam_ke,p.pertemuan_ke,p.tp_atp,p.materi,p.kegiatan,p.refleksi,p.catatan,p.tindak_lanjut FROM ak_pertemuan p JOIN kelas k ON k.id_kelas=p.id_kelas JOIN guru g ON g.id_guru=p.id_guru JOIN mata_pelajaran m ON m.id_mapel=p.id_mapel WHERE p.id_tahun_ajaran=?'.$scope.' ORDER BY p.tanggal,p.id LIMIT 5001',$args);
        if(count($rows)>5000)throw new InputError('Lebih dari 5000 pertemuan. Persempit kelas atau tanggal laporan.');
        return ['title'=>'Agenda harian guru','headers'=>['ID','Tanggal','Kelas','Guru','Mapel','Jam ke','Pertemuan','TP/ATP','Materi','Kegiatan','Refleksi','Catatan','Tindak lanjut'],'rows'=>array_map('array_values',$rows)];
    }
    if ($kind==='kalender') {
        $period=input_id($input,'id_tahun_ajaran');ak_period($period);
        $manage=in_array($role,['admin','kepala_sekolah'],true);
        $rows=ak_rows('SELECT mulai,selesai,judul,jenis,status,catatan FROM ak_kalender WHERE id_tahun_ajaran=?'.($manage?'':" AND status='disahkan'").' ORDER BY mulai,id',[$period]);
        return ['title'=>'Kalender akademik','headers'=>['mulai','selesai','judul','jenis','status','catatan'],'rows'=>array_map('array_values',$rows)];
    }
    if (in_array($kind,['harian','sesi'],true)) {
        require_role('admin','guru','kepala_sekolah');
        $period=input_id($input,'id_tahun_ajaran'); $policy=ak_period($period); $dates=ak_report_range($input,$period);
        $schedule=null;
        if ($kind==='sesi') {
            $schedule=ak_schedule(input_id($input,'id_jadwal'));
            if ((int)$schedule['id_tahun_ajaran']!==$period) deny_access();
            if($dates[0]<$schedule['berlaku_mulai'] || end($dates)>$schedule['berlaku_selesai'])deny_access();
            $class=(int)$schedule['id_kelas'];
        } else {
            $class=input_id($input,'id_kelas'); foreach($dates as $date)ak_require_duty($class,$period,$date);
        }
        $classRow=ak_one('SELECT nama_kelas FROM kelas WHERE id_kelas=?',[$class]);if(!$classRow)not_found();
        $members=ak_rows('SELECT a.*,s.nama_siswa FROM ak_anggota_kelas a JOIN siswa s ON s.nis=a.nis WHERE a.id_kelas=? AND a.id_tahun_ajaran=? AND a.mulai<=? AND a.selesai>=? ORDER BY a.nomor_absen,a.nis',[$class,$period,end($dates),$dates[0]]);
        $daily=[];
        if ($kind==='harian') $records=ak_rows('SELECT nis,tanggal,status FROM ak_absensi_harian WHERE id_kelas=? AND id_tahun_ajaran=? AND tanggal BETWEEN ? AND ?',[$class,$period,$dates[0],end($dates)]);
        else $records=ak_rows('SELECT a.nis,p.tanggal,a.status FROM ak_absensi_sesi a JOIN ak_pertemuan p ON p.id=a.id_pertemuan WHERE p.id_jadwal=? AND p.tanggal BETWEEN ? AND ?',[$schedule['id_jadwal'],$dates[0],end($dates)]);
        foreach($records as $row)$daily[$row['nis']][$row['tanggal']]=$row['status'];
        $rows=[];$weekdays=[1=>'Senin',2=>'Selasa',3=>'Rabu',4=>'Kamis',5=>'Jumat'];
        foreach($members as $student) {
            $values=[(string)$student['nomor_absen'],(string)$student['nis'],$student['nama_siswa']];$counts=array_fill_keys(array_keys(AK_STATUSES),0);
            foreach($dates as $date) {
                $eligible=$student['mulai']<=$date && $student['selesai']>=$date && ak_school_day($policy,$date);
                if($schedule)$eligible=$eligible && ($weekdays[(int)(new DateTimeImmutable($date))->format('N')]??'')===$schedule['hari'];
                $status=$eligible?($daily[$student['nis']][$date]??'B'):'—';$values[]=$status;if(isset($counts[$status]))$counts[$status]++;
            }
            $rows[]=[...$values,...array_values($counts)];
        }
        return ['title'=>'Matriks absensi '.($kind==='harian'?'harian sekolah':'sesi pembelajaran').' — '.$classRow['nama_kelas'],'headers'=>['No.','NIS','Nama siswa',...$dates,'H','S','I','A','Belum Dikonfirmasi'],'rows'=>$rows,'matrix'=>true];
    }
    throw new InputError('Jenis ekspor tidak tersedia.');
}
function ak_export_html(array $data): string {
    $headers=$data['headers'];$groups=[array_keys($headers)];
    if (($data['matrix']??false) && count($headers)>20) {
        $groups=[];$dateColumns=range(3,count($headers)-6);
        foreach(array_chunk($dateColumns,12) as $chunk)$groups[]=[0,1,2,...$chunk,...range(count($headers)-5,count($headers)-1)];
    }
    $html='<!doctype html><html lang="id"><meta charset="utf-8"><title>'.e($data['title']).'</title><style>body{font:11px Arial,sans-serif;color:#111}h1{font-size:18px}table{width:100%;border-collapse:collapse;table-layout:auto}th,td{border:1px solid #ccc;padding:5px;white-space:pre-wrap;overflow-wrap:anywhere}th{background:#f3f4f6}thead{display:table-header-group}tr{break-inside:avoid}section{break-after:page}section:last-of-type{break-after:auto}@page{size:A4 landscape;margin:12mm}@media print{button{display:none}}</style><body><button onclick="window.print()">Cetak / Simpan PDF</button>';
    foreach($groups as $number=>$indices) {
        $html.='<section><h1>'.e($data['title']).'</h1><p>SMK Negeri 2 Magelang · Data pengujian development · Dicetak '.e(date('Y-m-d H:i')).' · Bagian '.($number+1).'</p><table><thead><tr>';
        foreach($indices as $i)$html.='<th>'.e($headers[$i]).'</th>';
        $html.='</tr></thead><tbody>';
        foreach($data['rows'] as $row){$html.='<tr>';foreach($indices as $i)$html.='<td>'.e($row[$i]??'').'</td>';$html.='</tr>';}
        $html.='</tbody></table><p>H = Hadir · S = Sakit · I = Izin · A = Alpa · B = Belum Dikonfirmasi · — = tidak termasuk hari/keanggotaan yang direkap.</p></section>';
    }
    return $html.'</body></html>';
}
function ak_xlsx(array $data): string {
    $xml=static fn(string $value): string=>htmlspecialchars($value,ENT_XML1|ENT_QUOTES|ENT_SUBSTITUTE|ENT_DISALLOWED,'UTF-8');
    $sheet='<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>';
    foreach([$data['headers'],...$data['rows']] as $r=>$row) {
        $sheet.='<row r="'.($r+1).'">';
        foreach($row as $c=>$value){$n=$c+1;$column='';while($n>0){$n--;$column=chr(65+$n%26).$column;$n=intdiv($n,26);}
            if(is_int($value)||is_float($value))$sheet.='<c r="'.$column.($r+1).'" t="n"><v>'.$xml((string)$value).'</v></c>';
            else $sheet.='<c r="'.$column.($r+1).'" t="inlineStr"><is><t xml:space="preserve">'.$xml((string)($value??'')).'</t></is></c>';}
        $sheet.='</row>';
    }
    $sheet.='</sheetData></worksheet>';
    $file=tempnam(app_setting('SESSION_PATH'),'export-'); if($file===false)throw new RuntimeException();
    try {
        $zip=new ZipArchive();if($zip->open($file,ZipArchive::OVERWRITE)!==true)throw new RuntimeException();
        $zip->addFromString('[Content_Types].xml','<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
        $zip->addFromString('_rels/.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
        $zip->addFromString('xl/workbook.xml','<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Laporan" sheetId="1" r:id="rId1"/></sheets></workbook>');
        $zip->addFromString('xl/_rels/workbook.xml.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
        $zip->addFromString('xl/worksheets/sheet1.xml',$sheet);$zip->close();return file_get_contents($file);
    } finally {if(is_file($file))unlink($file);}
}
function ak_pdf(array $data): string {
    $worker=dirname(__DIR__,2).'/ops/academic_pdf.cjs';
    $spec=[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']];
    $env=['PATH'=>getenv('PATH')?:'/usr/bin','HOME'=>getenv('HOME')?:'/tmp','AK_PDF_PLAYWRIGHT'=>app_setting('PDF_PLAYWRIGHT_PATH'),'PLAYWRIGHT_BROWSERS_PATH'=>app_setting('PDF_BROWSERS_PATH'),'LD_LIBRARY_PATH'=>app_setting('PDF_LIBRARY_PATH')];
    $process=proc_open([app_setting('PDF_NODE_BINARY','node'),$worker],$spec,$pipes,null,$env);if(!is_resource($process))throw new RuntimeException();
    fwrite($pipes[0],ak_export_html($data));fclose($pipes[0]);
    $pdf=stream_get_contents($pipes[1],20*1024*1024);fclose($pipes[1]);stream_get_contents($pipes[2]);fclose($pipes[2]);$code=proc_close($process);
    if($code!==0 || !str_starts_with($pdf,'%PDF-'))throw new InputError('Layanan PDF lokal belum tersedia. Gunakan Cetak atau periksa konfigurasi worker privat.');
    return $pdf;
}
