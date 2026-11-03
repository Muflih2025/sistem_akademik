<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/config/academic/routes.php';
require_once dirname(__DIR__).'/includes/app_navigation.php';
function ak_link(string $view,array $params=[]): string { return ak_route_url($view,$params); }
function ak_hidden(string $key,mixed $value): void {
    if($key==='view' && app_setting('FRIENDLY_ROUTES')==='1' && in_array(parse_url($_SERVER['REQUEST_URI']??'',PHP_URL_PATH),AK_VIEW_ROUTES,true))return;
    echo '<input type="hidden" name="'.e($key).'" value="'.e($value).'">';
}
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
    $nav=sia_navigation($view);
    ?><!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title><?=e($title)?> · SIA SMKN 2 Magelang</title><link rel="stylesheet" href="/assets/css/academic.css"><link rel="stylesheet" href="/assets/css/pagination.css"><link rel="stylesheet" href="/assets/css/navigation.css"><script src="/assets/js/navigation.js" defer></script><script src="/assets/js/academic.js" defer></script></head><body class="sia-app">
    <?php sia_navigation_header($nav);?><div class="sia-shell"><?php sia_navigation_sidebar($nav);?>
    <main class="sia-content" id="sia-main"><div class="page-heading"><p class="eyebrow">SISTEM INFORMASI AKADEMIK</p><h1><?=e($title)?></h1><p class="muted">Lingkungan pengembangan · data pengujian sintetis</p></div>
    <?php foreach(flashes() as $flash):?><div class="notice" role="status"><?=e($flash['message'])?></div><?php endforeach;
}
function ak_end(): void {
    echo '</main></div>';
    sia_navigation_bottom();
    echo '</body></html>';
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
