<?php
// Explicit public surface; SQL, config, includes, shared, tools, logs and Git are never routed.
require_once __DIR__.'/academic/routes.php';
$routes = [
    '/index.php' => ['type' => 'page'],
    '/auth/login.php' => ['type' => 'page'],
    '/auth/logout.php' => ['type' => 'page'],
    '/auth/change_password.php' => ['type' => 'page', 'role' => null],
    '/errors/403.php' => ['type' => 'page'],
    '/errors/404.php' => ['type' => 'page'],
    '/academic/index.php' => ['type' => 'page'],
    '/academic/export.php' => ['type' => 'page'],
    '/assets/css/pagination.css' => ['type'=>'asset','mime'=>'text/css; charset=utf-8'],
    '/assets/css/academic.css' => ['type'=>'asset','mime'=>'text/css; charset=utf-8'],
    '/assets/js/academic.js' => ['type'=>'asset','mime'=>'application/javascript; charset=utf-8'],
    '/assets/css/neutral.css' => ['type'=>'asset','mime'=>'text/css; charset=utf-8'],
    '/assets/css/login.css' => ['type'=>'asset','mime'=>'text/css; charset=utf-8'],
    '/assets/vendor/bootstrap.min.css'=>['type'=>'asset','mime'=>'text/css; charset=utf-8'],
    '/assets/vendor/bootstrap.bundle.min.js'=>['type'=>'asset','mime'=>'application/javascript; charset=utf-8'],
    '/assets/vendor/bootstrap-icons.min.css'=>['type'=>'asset','mime'=>'text/css; charset=utf-8'],
    '/assets/vendor/fonts/bootstrap-icons.woff2'=>['type'=>'asset','mime'=>'font/woff2'],
    '/assets/vendor/fonts/bootstrap-icons.woff'=>['type'=>'asset','mime'=>'font/woff'],
    '/assets/css/crud.css' => ['type' => 'asset', 'mime' => 'text/css; charset=utf-8'],
    '/assets/css/app.css' => ['type' => 'asset', 'mime' => 'text/css; charset=utf-8'],
];
$pages = [
    'admin' => ['bulk_upload','index', 'master', 'penugasan', 'users', 'jadwal', 'tahun_ajaran', 'nilai', 'ekskul', 'kalender', 'export_import', 'export_nilai', 'posisi_guru'],
    'guru' => ['index', 'jadwal', 'absen', 'jurnal', 'rekap_absen', 'nilai', 'rapor', 'ekskul', 'kalender', 'export_nilai'],
    'kepsek' => ['index', 'akademik', 'evaluasi', 'tahun_ajaran', 'rapor', 'posisi_guru', 'kalender'],
    'siswa' => ['index', 'jadwal', 'absen', 'rapor', 'kalender'],
];
foreach ($pages as $directory => $names) {
    foreach ($names as $name) {
        $routes['/'.$directory.'/'.$name.'.php'] = [
            'type' => 'page', 'role' => $directory === 'kepsek' ? 'kepala_sekolah' : $directory,
        ];
    }
}
foreach(AK_VIEW_ROUTES as $view=>$alias)$routes[$alias]=['type'=>'page','target'=>'/academic/index.php','view'=>$view];
return $routes;
