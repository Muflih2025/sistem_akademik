<?php
require_once '../config/crud_service.php';require_role('admin');require_once '../includes/crud.php';
$definitions=master_definitions();$table=input_text($_GET+['table'=>'siswa'],'table',30);if(!isset($definitions[$table]))not_found();$def=$definitions[$table];$pk=$def['pk'];$error='';$edit=null;
if($_SERVER['REQUEST_METHOD']==='POST'){
 verify_csrf();try{save_master($table,$_POST);flash('success',in_array($_POST['action']??'',['delete','deactivate'],true)?'Data dinonaktifkan; arsip tetap dipertahankan.':'Data berhasil disimpan.');redirect('master.php?table='.$table);}catch(Throwable $e){$error=operation_error($e);$edit=$_POST;}
}elseif(isset($_GET['edit'])){$q=db()->prepare("SELECT * FROM `$table` WHERE `$pk`=?");$q->execute([input_text($_GET,'edit',20)]);$edit=$q->fetch();if(!$edit)not_found();}
$search=input_text($_GET,'q',100,false);$status=input_text($_GET,'status',10,false);if(!in_array($status,['','aktif','nonaktif'],true))throw new InputError('Status tidak valid.');
$where=[];$args=[];$projection='t.*';$alias='t';$from="`$table` t";
if($search!==''){$fields=[$pk,...array_filter($def['fields'],fn($f)=>!str_starts_with($f,'id_'))];$where[]='('.implode(' OR ',array_map(fn($f)=>"t.`$f` LIKE ?",$fields)).')';foreach($fields as $f)$args[]='%'.$search.'%';}
if($status!==''){$where[]='t.status=?';$args[]=$status;}
if($table==='siswa'){
 $classExpression='t.id_kelas';
 if(app_setting('ACADEMIC_WORKFLOWS')==='1'){
  $today=date('Y-m-d');$classExpression="COALESCE((SELECT a.id_kelas FROM ak_anggota_kelas a WHERE a.nis=t.nis AND a.mulai<='$today' AND a.selesai>='$today' ORDER BY a.mulai DESC,a.id DESC LIMIT 1),t.id_kelas)";
  $projection.=',k.id_kelas AS kelas_berlaku,(SELECT MIN(d.tanggal_berlaku) FROM ak_kenaikan_detail d WHERE d.nis=t.nis AND d.hasil=\'alumni\') AS tanggal_alumni';
 }
 $from.=' JOIN kelas k ON k.id_kelas='.$classExpression;
 if(($_GET['id_kelas']??'')!==''){$where[]='k.id_kelas=?';$args[]=input_id($_GET,'id_kelas');}
 if(($_GET['id_jurusan']??'')!==''){$where[]='k.id_jurusan=?';$args[]=input_id($_GET,'id_jurusan');}
}
if($table==='kelas'){
 if(($_GET['tingkat']??'')!==''){$where[]='t.tingkat=?';$args[]=input_choice($_GET,'tingkat',['X','XI','XII']);}
 if(($_GET['id_jurusan']??'')!==''){$where[]='t.id_jurusan=?';$args[]=input_id($_GET,'id_jurusan');}
}
$sqlWhere=$where?' WHERE '.implode(' AND ',$where):'';$q=db()->prepare('SELECT COUNT(*) FROM '.$from.$sqlWhere);$q->execute($args);$total=(int)$q->fetchColumn();[$page,$pages,$offset]=crud_page_bounds($total);
$q=db()->prepare('SELECT '.$projection.' FROM '.$from.$sqlWhere." ORDER BY t.`$pk` LIMIT 20 OFFSET $offset");$q->execute($args);$rows=$q->fetchAll();
$classLabels=crud_options('kelas','id_kelas','nama_kelas',false);$majorLabels=crud_options('jurusan','id_jurusan','nama_jurusan',false);
$page_title='Data '.$def['label'];$crud_ui=true;require '../includes/header.php';require '../includes/sidebar.php';require '../includes/flash.php';
?>
<div class="crud-toolbar"><h2><?=e($page_title)?></h2><a class="btn btn-outline-dark" href="?table=<?=e($table)?>">Form baru</a></div>
<p class="crud-note">Nonaktifkan data untuk menjaga nilai, absensi dan arsip. Identitas siswa tidak diganti; daftar menampilkan kelas yang berlaku pada tanggal hari ini dari keanggotaan, sedangkan referensi kelas master lama dipertahankan. Gunakan Naik Kelas untuk perpindahan tahunan.</p>
<?php if($error):?><div role="alert" class="alert alert-danger"><?=e($error)?></div><?php endif;?>
<div class="card p-3 mb-4"><h3 class="h5"><?= $edit?'Edit':'Tambah'?> <?=e($def['label'])?></h3><form method="post" class="crud-grid"><?=csrf_field()?>
<input type="hidden" name="action" value="<?=$edit?'update':'create'?>"><input type="hidden" name="original_id" value="<?=e($edit['original_id']??$edit[$pk]??'')?>">
<?php
if($pk==='nis')crud_field('nis','NIS',$edit['nis']??'',null,'text',true,(bool)$edit);
foreach($def['fields'] as $field){
 $options=match($field){'id_jurusan'=>crud_options('jurusan','id_jurusan','nama_jurusan'),'id_kelas'=>crud_options('kelas','id_kelas','nama_kelas'),'jenis_kelamin'=>['L'=>'Laki-laki','P'=>'Perempuan'],'tingkat'=>array_combine(['X','XI','XII'],['X','XI','XII']),'kelompok'=>array_combine(['Muatan Nasional','Muatan Kewilayahan','Produktif'],['Muatan Nasional','Muatan Kewilayahan','Produktif']),default=>null};
 crud_field($field,ucwords(str_replace('_',' ',preg_replace('/^id_/','',$field))),$edit[$field]??($field==='kkm'?'75':''),$options,$field==='tanggal_lahir'?'date':($field==='email'?'email':'text'),!in_array($field,['alamat','email','no_hp'],true));
}?>
<div class="crud-actions"><button class="btn btn-dark" type="submit">Simpan <?=e($def['label'])?></button></div></form></div>
<form method="get" class="card p-3 mb-4 crud-grid"><input type="hidden" name="table" value="<?=e($table)?>"><?php crud_field('q','Cari nama / identitas',$search,null,'search',false);crud_field('status','Status',$status,['aktif'=>'Aktif','nonaktif'=>'Nonaktif'], 'text',false);if($table==='siswa'){crud_field('id_kelas','Kelas',$_GET['id_kelas']??'',crud_options('kelas','id_kelas','nama_kelas',false),'text',false);crud_field('id_jurusan','Jurusan',$_GET['id_jurusan']??'',crud_options('jurusan','id_jurusan','nama_jurusan',false),'text',false);}if($table==='kelas'){crud_field('tingkat','Tingkat',$_GET['tingkat']??'',array_combine(['X','XI','XII'],['X','XI','XII']),'text',false);crud_field('id_jurusan','Jurusan',$_GET['id_jurusan']??'',crud_options('jurusan','id_jurusan','nama_jurusan',false),'text',false);}?><button class="btn btn-dark">Terapkan filter</button></form>
<div class="card p-3"><div class="table-responsive"><table class="table"><thead><tr><?php foreach([$pk,...$def['fields'],'status'] as $field):?><th><?=e(ucwords(str_replace('_',' ',preg_replace('/^id_/','',$field))))?></th><?php endforeach;?><th>Aksi</th></tr></thead><tbody><?php foreach($rows as $row):?><tr><?php foreach([$pk,...$def['fields'],'status'] as $field):?><td><?=e($field==='id_kelas'?($classLabels[$row['kelas_berlaku']??$row[$field]]??$row[$field]):($field==='id_jurusan'?($majorLabels[$row[$field]]??$row[$field]):($field==='status'&&isset($row['tanggal_alumni'])?$row[$field].' · '.($row['tanggal_alumni']<=date('Y-m-d')?'Alumni':'Calon alumni'):($row[$field]??''))))?></td><?php endforeach;?><td><div class="crud-actions"><a class="btn btn-outline-dark" href="?<?=e(http_build_query(['table'=>$table,'edit'=>$row[$pk]]))?>">Edit</a><?php crud_status_actions('original_id',$row[$pk],$row['status']);?></div></td></tr><?php endforeach;if(!$rows):?><tr><td colspan="10">Data tidak ditemukan.</td></tr><?php endif;?></tbody></table></div><?php crud_pager($page,$pages,$total);?></div>
<?php require '../includes/footer.php';
