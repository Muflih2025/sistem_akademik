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
function crud_page_bounds(int $total):array {$page=($_GET['page']??'')!==''?input_id($_GET,'page'):1;$pages=max(1,(int)ceil($total/20));$page=min($page,$pages);return [$page,$pages,($page-1)*20];}
function crud_pager(int $page,int $pages,int $total):void {
    echo '<nav class="crud-pager" aria-label="Halaman data"><span>'.e($total).' data · halaman '.e($page).' dari '.e($pages).'</span>';
    foreach(['Sebelumnya'=>$page-1,'Berikutnya'=>$page+1] as $label=>$target)if($target>=1 && $target<=$pages){$query=$_GET;unset($query['edit']);$query['page']=$target;echo '<a class="btn btn-outline-dark" href="?'.e(http_build_query($query)).'">'.e($label).'</a>';}
    echo '</nav>';
}
function crud_status_actions(string $idName,mixed $id,string $status):void {
    echo '<form method="post" class="d-inline">'.csrf_field().'<input type="hidden" name="'.e($idName).'" value="'.e($id).'"><button class="btn btn-outline-dark" name="action" value="'.($status==='aktif'?'deactivate':'activate').'">'.($status==='aktif'?'Nonaktifkan':'Aktifkan').'</button></form>';
}
function crud_navigation():void {
 echo '<nav aria-label="Modul data" class="crud-menu">';
 foreach(['Siswa'=>'master.php?table=siswa','Guru'=>'master.php?table=guru','Kelas'=>'master.php?table=kelas','Mapel'=>'master.php?table=mata_pelajaran','Penugasan'=>'penugasan.php','Akun'=>'users.php','Periode'=>'tahun_ajaran.php'] as $label=>$path)echo '<a class="btn btn-outline-dark" href="'.e($path).'">'.e($label).'</a>';
 echo '</nav>';
}
