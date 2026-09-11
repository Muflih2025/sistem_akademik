<?php
require_once '../config/auth.php'; require_role('admin');
$pdo=db();
$definitions=[
 'jurusan'=>['label'=>'Jurusan','pk'=>'id_jurusan','fields'=>['kode_jurusan','nama_jurusan']],
 'kelas'=>['label'=>'Kelas','pk'=>'id_kelas','fields'=>['nama_kelas','tingkat','id_jurusan']],
 'siswa'=>['label'=>'Siswa','pk'=>'nis','fields'=>['nama_siswa','jenis_kelamin','tanggal_lahir','alamat','id_kelas']],
 'guru'=>['label'=>'Guru','pk'=>'id_guru','fields'=>['nip','nama_guru','email','no_hp']],
 'mata_pelajaran'=>['label'=>'Mata Pelajaran','pk'=>'id_mapel','fields'=>['kode_mapel','nama_mapel','kelompok','kkm']]
];
$table=$_GET['table']??'siswa'; if(!isset($definitions[$table])) redirect('index.php');
$def=$definitions[$table]; $pk=$def['pk']; $error=''; $edit=null;
$options=[
 'id_jurusan'=>$pdo->query('SELECT id_jurusan,nama_jurusan FROM jurusan ORDER BY nama_jurusan')->fetchAll(),
 'id_kelas'=>$pdo->query('SELECT id_kelas,nama_kelas FROM kelas ORDER BY nama_kelas')->fetchAll()
];
if($_SERVER['REQUEST_METHOD']==='POST'){
 verify_csrf(); $action=$_POST['action']??'save';
 try {
  if($action==='delete'){
   $q=$pdo->prepare("DELETE FROM `$table` WHERE `$pk`=?"); $q->execute([$_POST['id']]);
   flash('success','Data berhasil dihapus.'); redirect('master.php?table='.$table);
  }
  $values=[];
  foreach($def['fields'] as $field){$value=trim((string)($_POST[$field]??''));$values[$field]=$value===''?null:$value;}
  foreach(['nama_siswa','nama_guru','nama_mapel','nama_jurusan','kode_jurusan','kode_mapel','nip'] as $required){
   if(in_array($required,$def['fields'],true) && trim((string)($values[$required]??''))==='') throw new InvalidArgumentException('Lengkapi semua field wajib.');
  }
  if(isset($values['kkm']) && ($values['kkm']===null || !is_numeric($values['kkm']) || $values['kkm']<0 || $values['kkm']>100)) throw new InvalidArgumentException('KKM harus berupa angka 0 sampai 100.');
  $id=trim((string)($_POST[$pk]??''));
  if($id!==''){$set=implode(',',array_map(fn($f)=>"`$f`=?",array_keys($values)));$q=$pdo->prepare("UPDATE `$table` SET $set WHERE `$pk`=?");$q->execute([...array_values($values),$id]);}
  else{$fields=implode(',',array_keys($values));$marks=implode(',',array_fill(0,count($values),'?'));$q=$pdo->prepare("INSERT INTO `$table` ($fields) VALUES ($marks)");$q->execute(array_values($values));}
  flash('success','Data berhasil disimpan.'); redirect('master.php?table='.$table);
 } catch(InvalidArgumentException $e){$error=$e->getMessage();} catch(Throwable $e){$error='Data gagal disimpan. Pastikan kode/ID tidak duplikat dan relasi valid.';}
}
if(isset($_GET['edit'])){$q=$pdo->prepare("SELECT * FROM `$table` WHERE `$pk`=?");$q->execute([$_GET['edit']]);$edit=$q->fetch();}
$rows=$pdo->query("SELECT * FROM `$table` ORDER BY `$pk` DESC")->fetchAll();
$page_title='Data '.$def['label']; require '../includes/header.php'; require '../includes/sidebar.php'; require '../includes/flash.php';
?>
<div class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3"><h2 class="mb-0"><?=e($page_title)?></h2><a class="btn btn-outline-primary" href="master.php?table=<?=e($table)?>">Form baru</a></div>
<?php if($error):?><div class="alert alert-danger"><?=e($error)?></div><?php endif;?>
<div class="card p-3 mb-4"><form method="post" class="row g-3"><?=csrf_field()?><input type="hidden" name="action" value="save"><div class="col-md-3"><label class="form-label"><?=e(strtoupper($pk))?> <small class="text-muted">(kosong = otomatis)</small></label><input class="form-control" name="<?=e($pk)?>" value="<?=e($edit[$pk]??'')?>" <?=is_numeric($edit[$pk]??null)?'':'required'?>><?php if($pk==='nis'):?><small class="text-muted">NIS siswa wajib unik</small><?php endif;?></div>
<?php foreach($def['fields'] as $field):?><div class="col-md-3"><label class="form-label"><?=e(ucwords(str_replace('_',' ',$field)))?></label><?php if($field==='id_jurusan'||$field==='id_kelas'):?><select class="form-select" name="<?=e($field)?>" required><option value="">Pilih...</option><?php foreach($options[$field] as $opt):?><option value="<?=e($opt[$field])?>" <?=((string)($edit[$field]??'')===(string)$opt[$field])?'selected':''?>><?=e($opt[array_key_last($opt)])?></option><?php endforeach;?></select><?php elseif($field==='jenis_kelamin'):?><select class="form-select" name="jenis_kelamin" required><option value="L" <?=($edit['jenis_kelamin']??'')==='L'?'selected':''?>>Laki-laki</option><option value="P" <?=($edit['jenis_kelamin']??'')==='P'?'selected':''?>>Perempuan</option></select><?php elseif($field==='tingkat'):?><select class="form-select" name="tingkat" required><?php foreach(['X','XI','XII'] as $v):?><option <?=($edit['tingkat']??'')===$v?'selected':''?>><?=$v?></option><?php endforeach;?></select><?php elseif($field==='kelompok'):?><select class="form-select" name="kelompok"><option>Umum</option><option <?=($edit['kelompok']??'')==='Kejuruan'?'selected':''?>>Kejuruan</option></select><?php else:?><input class="form-control" name="<?=e($field)?>" value="<?=e($edit[$field]??'')?>" <?=str_contains($field,'tanggal')?'type="date"':''?> <?=in_array($field,['kkm'],true)?'type="number" min="0" max="100" step="0.01"':''?>><?php endif;?></div><?php endforeach;?><div class="col-12"><button class="btn btn-primary">Simpan data</button></div></form></div>
<div class="card p-3"><div class="table-responsive"><table class="table table-hover"><thead><tr><?php foreach([$pk,...$def['fields']] as $field):?><th><?=e(strtoupper(str_replace('_',' ',$field)))?></th><?php endforeach;?><th>Aksi</th></tr></thead><tbody><?php foreach($rows as $row):?><tr><?php foreach([$pk,...$def['fields']] as $field):?><td><?=e($row[$field]??'')?></td><?php endforeach;?><td class="text-nowrap"><a class="btn btn-sm btn-outline-primary" href="?table=<?=e($table)?>&edit=<?=e($row[$pk])?>">Edit</a><form method="post" class="d-inline" onsubmit="return confirm('Hapus data ini?')"><?=csrf_field()?><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?=e($row[$pk])?>"><button class="btn btn-sm btn-outline-danger">Hapus</button></form></td></tr><?php endforeach;?></tbody></table></div></div>
<?php if($pk!=='nis'): ?><script>document.querySelector('input[name="<?=e($pk)?>"]').removeAttribute('required');</script><?php endif; ?><?php require '../includes/footer.php';
