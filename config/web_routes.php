<?php
// Explicit public surface; SQL, config, includes, shared, tools, logs and Git are never routed.
$routes = [
    '/index.php' => ['type' => 'page'],
    '/auth/login.php' => ['type' => 'page'],
    '/auth/logout.php' => ['type' => 'page'],
    '/auth/change_password.php' => ['type' => 'page', 'role' => null],
    '/errors/403.php' => ['type' => 'page'],
    '/errors/404.php' => ['type' => 'page'],
    '/assets/css/crud.css' => ['type' => 'asset', 'mime' => 'text/css; charset=utf-8'],
    '/assets/css/app.css' => ['type' => 'asset', 'mime' => 'text/css; charset=utf-8'],
];
$pages = [
    'admin' => ['index', 'master', 'penugasan', 'users', 'jadwal', 'tahun_ajaran', 'nilai', 'ekskul', 'kalender', 'export_import', 'export_nilai', 'posisi_guru'],
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
return $routes;
