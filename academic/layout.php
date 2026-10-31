<?php
declare(strict_types=1);
function ak_link(string $view,array $params=[]): string { return '/academic/index.php?'.http_build_query(['view'=>$view]+$params); }
function ak_hidden(string $key,mixed $value): void { echo '<input type="hidden" name="'.e($key).'" value="'.e($value).'">'; }
function ak_field(string $key,string $label,mixed $value='',string $type='text',bool $required=true): void {
    echo '<label class="field"><span>'.e($label).'</span><input name="'.e($key).'" type="'.e($type).'" value="'.e($value).'"'.($required?' required':'').($type==='number'?' step="any"':'').'></label>';
}
function ak_select(string $key,string $label,array $options,mixed $value='',bool $required=true): void {
    echo '<label class="field"><span>'.e($label).'</span><select name="'.e($key).'"'.($required?' required':'').'>';
    if (!$required) echo '<option value="">Semua / tidak dipilih</option>';
    foreach ($options as $id=>$text) echo '<option value="'.e($id).'"'.((string)$id===(string)$value?' selected':'').'>'.e($text).'</option>';
    echo '</select></label>';
}
function ak_textarea(string $key,string $label,string $value='',bool $required=false): void {
    echo '<label class="field"><span>'.e($label).'</span><textarea name="'.e($key).'" rows="3" maxlength="5000"'.($required?' required':'').'>'.e($value).'</textarea></label>';
}
function ak_begin(string $title,string $view): void {
    $role=current_user()['role'];
    $links=['beranda'=>'Beranda'];
    if ($role==='admin') $links+=['fondasi'=>'Akademik','piket'=>'Guru Piket'];
    if ($role==='guru') $links+=['pertemuan'=>'Absensi','jurnal'=>'Jurnal & Agenda','piket'=>'Guru Piket'];
    if (in_array($role,['admin','kepala_sekolah'],true)) $links+=['jurnal'=>'Jurnal','piket'=>'Absensi Harian'];
    $links+=['kalender'=>'Kalender'];
    $links+=['jadwal'=>'Jadwal'];
    if ($role!=='siswa') $links+=['nilai'=>'Nilai'];
    $links+=['rapor'=>'Rapor'];
    if($role==='siswa')$links+=['kehadiran'=>'Kehadiran Saya'];
    if ($role!=='siswa') $links+=['impor'=>'Impor / Ekspor'];
    ?><!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title><?=e($title)?> · SIA SMKN 2 Magelang</title><link rel="stylesheet" href="/assets/css/academic.css"><script src="/assets/js/academic.js" defer></script></head><body>
    <header class="top"><a class="brand" href="<?=e(ak_link('beranda'))?>">SIA <span>SMKN 2 Magelang</span></a><div class="identity"><span><?=e(current_user()['username'])?> · <?=e(role_label($role))?></span><form method="post" action="/auth/logout.php"><?=csrf_field()?><button class="secondary">Keluar</button></form></div></header>
    <nav class="desktop-nav" aria-label="Modul akademik"><?php foreach($links as $key=>$label):?><a href="<?=e(ak_link($key))?>" <?= $view===$key?'aria-current="page"':'' ?>><?=e($label)?></a><?php endforeach;?></nav>
    <main><div class="page-heading"><p class="eyebrow">SISTEM INFORMASI AKADEMIK</p><h1><?=e($title)?></h1><p class="muted">Lingkungan pengembangan · data pengujian sintetis</p></div>
    <?php foreach(flashes() as $flash):?><div class="notice" role="status"><?=e($flash['message'])?></div><?php endforeach;
}
function ak_end(): void {
    $role=current_user()['role'];
    $nav=['beranda'=>['M3 10l9-7 9 7v10H3z M9 20v-7h6v7','Beranda'],($role==='guru'?'pertemuan':'kalender')=>['M4 5h16v16H4z M4 10h16 M8 3v4 M16 3v4',$role==='guru'?'Absensi':'Kalender'],'rapor'=>['M5 3h14v18H5z M8 8h8 M8 12h8 M8 16h5','Rapor']];
    if ($role!=='siswa') $nav['piket']=['M12 8v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0','Piket'];
    echo '</main><nav class="bottom-nav" aria-label="Navigasi utama">';
    foreach($nav as $view=>[$symbol,$label]) echo '<a href="'.e(ak_link($view)).'"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="'.e($symbol).'"/></svg>'.e($label).'</a>';
    echo '</nav></body></html>';
}
function ak_summary_cards(array $counts): void {
    echo '<div class="summary" aria-live="polite">';
    foreach (AK_STATUSES as $code=>$label) echo '<div><strong data-count="'.e($code).'">'.e($counts[$code]??0).'</strong><span>'.e($label).'</span></div>';
    echo '</div>';
}
function ak_exports(string $kind,array $params): void {
    echo '<div class="actions exports">';
    foreach (['csv'=>'CSV','xlsx'=>'Excel','pdf'=>'PDF','print'=>'Cetak'] as $format=>$label) echo '<a class="button secondary" href="/academic/export.php?'.e(http_build_query(['kind'=>$kind,'format'=>$format]+$params)).'">'.e($label).'</a>';
    echo '</div>';
}
