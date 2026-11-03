<?php
function crud_field(string $name,string $label,mixed $value='',?array $options=null,string $type='text',bool $required=true,bool $readonly=false):void {
    $value=is_scalar($value)?$value:'';
    echo '<label class="crud-field"><span>'.e($label).'</span>';
    if($options!==null){echo '<select class="form-select" name="'.e($name).'" '.($required?'required':'').'><option value="">Pilih…</option>';foreach($options as $id=>$text)echo '<option value="'.e($id).'" '.((string)$value===(string)$id?'selected':'').'>'.e($text).'</option>';echo '</select>';}
    else echo '<input class="form-control" type="'.e($type).'" name="'.e($name).'" value="'.($type==='password'?'':e($value)).'" '.($required?'required ':'').($readonly?'readonly ':'').($type==='password'?'autocomplete="new-password" minlength="'.(allows_test_password()?8:10).'" maxlength="72"':'').'>';
    echo '</label>';
}
function crud_options(string $table,string $pk,string $label,bool $active=true):array {
    $rows=db()->query("SELECT `$pk`,`$label` FROM `$table`".($active?" WHERE status='aktif'":'')." ORDER BY `$label`")->fetchAll();$out=[];foreach($rows as $row)$out[$row[$pk]]=$row[$label];return $out;
}
function crud_page_bounds(int $total,int $size=20,string $parameter='page'):array {
    $selectable=$size!==6;$key=$parameter==='page'?'per_page':$parameter.'_size';
    if($selectable&&isset($_GET[$key])){$size=input_id($_GET,$key);if(!in_array($size,[10,20,25,50,100],true))throw new InputError('Jumlah baris harus 10, 20, 25, 50 atau 100.');}
    $size=max(1,min(100,$size));$page=($_GET[$parameter]??'')!==''?input_id($_GET,$parameter):1;$pages=max(1,(int)ceil($total/$size));$page=min($page,$pages);
    $GLOBALS['crud_pagination'][$parameter]=['size'=>$size,'selectable'=>$selectable,'control'=>false];return [$page,$pages,($page-1)*$size];
}
function crud_page_limit(string $parameter='page'):int {return $GLOBALS['crud_pagination'][$parameter]['size']??20;}
function crud_page_size_control(string $parameter='page'):void {
    $state=$GLOBALS['crud_pagination'][$parameter]??null;if(!$state||!$state['selectable'])return;
    $GLOBALS['crud_pagination'][$parameter]['control']=true;$key=$parameter==='page'?'per_page':$parameter.'_size';
    echo '<form method="get" class="page-size-control">';
    foreach($_GET as $name=>$value)if(is_string($value)&&!in_array($name,[$parameter,$key,'edit',...(defined('AK_VIEW_ROUTES')&&app_setting('FRIENDLY_ROUTES')==='1'&&in_array(parse_url($_SERVER['REQUEST_URI']??'',PHP_URL_PATH),AK_VIEW_ROUTES,true)?['view']:[])],true))echo '<input type="hidden" name="'.e($name).'" value="'.e($value).'">';
    echo '<label><span>Baris per halaman</span><select name="'.e($key).'" aria-label="Baris per halaman" onchange="this.form.submit()">';
    foreach([10,20,25,50,100]as $n)echo '<option value="'.$n.'"'.($n===$state['size']?' selected':'').'>'.$n.'</option>';
    echo '</select></label><noscript><button type="submit">Terapkan</button></noscript></form>';
}
function crud_pager(int $page,int $pages,int $total,string $label='data',string $parameter='page'):void {
    $size=crud_page_limit($parameter);$from=$total?($page-1)*$size+1:0;$until=min($total,$page*$size);
    echo '<div class="crud-pagination">';if(empty($GLOBALS['crud_pagination'][$parameter]['control']))crud_page_size_control($parameter);
    echo '<nav class="crud-pager" aria-label="Halaman data"><span class="page-range">Menampilkan '.e($from).'–'.e($until).' dari '.e($total).' '.e($label).'</span><div class="page-buttons">';
    $link=static function(int $target,string $text,string $title,bool $disabled=false)use($parameter,$page):void{
        if($disabled){echo '<span class="page-link disabled" aria-disabled="true" aria-label="'.e($title).'">'.e($text).'</span>';return;}
        if($title==='Halaman '.$page){echo '<span class="page-link current" aria-current="page">'.e($text).'</span>';return;}
        $query=$_GET;unset($query['edit']);if(defined('AK_VIEW_ROUTES')&&app_setting('FRIENDLY_ROUTES')==='1'&&in_array(parse_url($_SERVER['REQUEST_URI']??'',PHP_URL_PATH),AK_VIEW_ROUTES,true))unset($query['view']);$query[$parameter]=$target;
        echo '<a class="page-link" aria-label="'.e($title).'" href="?'.e(http_build_query($query)).'">'.e($text).'</a>';
    };
    $link(1,'«','Halaman pertama',$page===1);$link($page-1,'‹','Sebelumnya',$page===1);
    $numbers=[1,$pages];for($n=max(1,$page-2);$n<=min($pages,$page+2);$n++)$numbers[]=$n;$numbers=array_unique($numbers);sort($numbers);$previous=0;
    foreach($numbers as $n){if($n-$previous>1)echo '<span class="page-ellipsis" aria-hidden="true">…</span>';$link($n,(string)$n,'Halaman '.$n);$previous=$n;}
    $link($page+1,'›','Berikutnya',$page===$pages);$link($pages,'»','Halaman terakhir',$page===$pages);echo '</div></nav></div>';
}
function crud_status_actions(string $idName,mixed $id,string $status):void {
    echo '<form method="post" class="d-inline">'.csrf_field().'<input type="hidden" name="'.e($idName).'" value="'.e($id).'"><button class="btn btn-outline-dark" name="action" value="'.($status==='aktif'?'deactivate':'activate').'">'.($status==='aktif'?'Nonaktifkan':'Aktifkan').'</button></form>';
}
function crud_navigation():void {
 echo '<nav aria-label="Modul data" class="crud-menu">';
 foreach(['Jurusan'=>'master.php?table=jurusan','Siswa'=>'master.php?table=siswa','Guru'=>'master.php?table=guru','Kelas'=>'master.php?table=kelas','Ruang / Lab'=>'master.php?table=ak_ruang','Mapel'=>'master.php?table=mata_pelajaran','Penugasan'=>'penugasan.php','Akun'=>'users.php','Periode'=>'tahun_ajaran.php'] as $label=>$path)echo '<a class="btn btn-outline-dark" href="'.e($path).'">'.e($label).'</a>';
 if(app_setting('ACADEMIC_WORKFLOWS')==='1')foreach(['Jam Belajar'=>'jam','Naik Kelas'=>'kenaikan','Alumni'=>'alumni']as $label=>$view)echo '<a class="btn btn-outline-dark" href="/academic/index.php?view='.e($view).'">'.e($label).'</a>';
 echo '</nav>';
}
