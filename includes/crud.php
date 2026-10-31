<?php
function crud_field(string $name,string $label,mixed $value='',?array $options=null,string $type='text',bool $required=true,bool $readonly=false):void {
    $value=is_scalar($value)?$value:'';
    echo '<label class="crud-field"><span>'.e($label).'</span>';
    if($options!==null){echo '<select class="form-select" name="'.e($name).'" '.($required?'required':'').'><option value="">Pilih…</option>';foreach($options as $id=>$text)echo '<option value="'.e($id).'" '.((string)$value===(string)$id?'selected':'').'>'.e($text).'</option>';echo '</select>';}
    else echo '<input class="form-control" type="'.e($type).'" name="'.e($name).'" value="'.($type==='password'?'':e($value)).'" '.($required?'required ':'').($readonly?'readonly ':'').($type==='password'?'autocomplete="new-password" minlength="10" maxlength="72"':'').'>';
    echo '</label>';
}
function crud_options(string $table,string $pk,string $label,bool $active=true):array {
    $rows=db()->query("SELECT `$pk`,`$label` FROM `$table`".($active?" WHERE status='aktif'":'')." ORDER BY `$label`")->fetchAll();$out=[];foreach($rows as $row)$out[$row[$pk]]=$row[$label];return $out;
}
function crud_page_bounds(int $total,int $size=20):array {$size=max(1,min(100,$size));$page=($_GET['page']??'')!==''?input_id($_GET,'page'):1;$pages=max(1,(int)ceil($total/$size));$page=min($page,$pages);return [$page,$pages,($page-1)*$size];}
function crud_pager(int $page,int $pages,int $total,string $label='data'):void {
    echo '<nav class="crud-pager" aria-label="Halaman data"><span>'.e($total).' '.e($label).' · halaman '.e($page).' dari '.e($pages).'</span>';
    foreach(['Sebelumnya'=>$page-1,'Berikutnya'=>$page+1] as $label=>$target)if($target>=1 && $target<=$pages){$query=$_GET;unset($query['edit']);$query['page']=$target;echo '<a class="btn btn-outline-dark" href="?'.e(http_build_query($query)).'">'.e($label).'</a>';}
    echo '</nav>';
}
function crud_status_actions(string $idName,mixed $id,string $status):void {
    echo '<form method="post" class="d-inline">'.csrf_field().'<input type="hidden" name="'.e($idName).'" value="'.e($id).'"><button class="btn btn-outline-dark" name="action" value="'.($status==='aktif'?'deactivate':'activate').'">'.($status==='aktif'?'Nonaktifkan':'Aktifkan').'</button></form>';
}
function crud_navigation():void {
 echo '<nav aria-label="Modul data" class="crud-menu">';
 foreach(['Jurusan'=>'master.php?table=jurusan','Siswa'=>'master.php?table=siswa','Guru'=>'master.php?table=guru','Kelas'=>'master.php?table=kelas','Mapel'=>'master.php?table=mata_pelajaran','Penugasan'=>'penugasan.php','Akun'=>'users.php','Periode'=>'tahun_ajaran.php'] as $label=>$path)echo '<a class="btn btn-outline-dark" href="'.e($path).'">'.e($label).'</a>';
 if(app_setting('ACADEMIC_WORKFLOWS')==='1')foreach(['Jam Belajar'=>'jam','Naik Kelas'=>'kenaikan','Alumni'=>'alumni']as $label=>$view)echo '<a class="btn btn-outline-dark" href="/academic/index.php?view='.e($view).'">'.e($label).'</a>';
 echo '</nav>';
}
