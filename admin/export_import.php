<?php
require_once '../config/import_service.php';require_role('admin');require_once '../includes/crud.php';$error='';
if(isset($_GET['export'])){
 $type=input_choice($_GET,'export',['siswa','guru']);header('Content-Type: text/csv; charset=utf-8');header('Content-Disposition: attachment; filename="data_'.$type.'.csv"');$out=fopen('php://output','w');
 if($type==='siswa'){$header=['NIS','Nama Siswa','Jenis Kelamin','Kelas','Tanggal Lahir','Alamat'];$query='SELECT s.nis,s.nama_siswa,s.jenis_kelamin,k.nama_kelas,s.tanggal_lahir,s.alamat FROM siswa s JOIN kelas k ON k.id_kelas=s.id_kelas ORDER BY s.nis';}
 else{$header=['NIP','Nama Guru','Email','No HP'];$query='SELECT nip,nama_guru,email,no_hp FROM guru ORDER BY id_guru';}
 fputcsv($out,$header,',','"','');foreach(db()->query($query) as $row)fputcsv($out,array_map('csv_safe',array_values($row)),',','"','');fclose($out);exit;
}
if($_SERVER['REQUEST_METHOD']==='POST'){
 verify_csrf();try{
  $type=input_choice($_POST,'target_import',['siswa','guru']);$file=$_FILES['file_data']??null;
  if(!is_array($file)||($file['error']??1)!==UPLOAD_ERR_OK||!is_string($file['tmp_name']??null)||!is_uploaded_file($file['tmp_name']))throw new InputError('Pilih berkas unggahan yang valid.');
  $extension=strtolower(pathinfo((string)$file['name'],PATHINFO_EXTENSION));$mime=(new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
  $allowed=$extension==='xlsx'?['application/zip','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']:['text/plain','text/csv','application/csv','application/vnd.ms-excel'];if(!in_array($mime,$allowed,true))throw new InputError('Tipe berkas tidak cocok.');
  $count=import_master_rows($type,import_rows($file['tmp_name'],$extension));flash('success',"Impor $count baris berhasil dalam satu transaksi. Tidak ada akun default dibuat.");redirect('export_import.php');
 }catch(Throwable $e){$error=operation_error($e);}
}
$page_title='Impor dan Ekspor Master';$crud_ui=true;require '../includes/header.php';require '../includes/sidebar.php';require '../includes/flash.php';
?><h2><?=e($page_title)?></h2><?php if($error):?><div class="alert alert-danger" role="alert"><?=e($error)?></div><?php endif;?>
<div class="card p-3 mb-4"><p>Gunakan header hasil ekspor. Tanggal lahir wajib berformat YYYY-MM-DD, NIS/NIP diperlakukan sebagai teks. Nama kelas harus dikenal dan tidak ambigu. File duplikat/invalid dibatalkan seluruhnya; tidak ada fallback kelas dan tidak ada pembuatan akun otomatis.</p><div class="crud-actions"><a class="btn btn-outline-dark" href="?export=siswa">Ekspor Siswa CSV</a><a class="btn btn-outline-dark" href="?export=guru">Ekspor Guru CSV</a></div></div>
<form method="post" enctype="multipart/form-data" class="card p-3 crud-grid"><?=csrf_field()?><?php crud_field('target_import','Data tujuan','',['siswa'=>'Siswa','guru'=>'Guru']);?><label class="crud-field"><span>Berkas CSV/XLSX, maksimal 5 MB / 2000 baris</span><input class="form-control" type="file" name="file_data" accept=".csv,.xlsx" required></label><button class="btn btn-dark">Validasi dan Impor</button></form><?php require '../includes/footer.php';
