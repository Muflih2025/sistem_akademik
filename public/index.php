<?php
declare(strict_types=1);

// Only this directory is a document root. Never return false to PHP's static server.
header('X-Content-Type-Options: nosniff');
$root = dirname(__DIR__);
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$path = is_string($path) ? rawurldecode($path) : '';
$routes = require $root.'/config/web_routes.php';
if ($path === '/') $path = '/index.php';
if (!isset($routes[$path])) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    if ($_SERVER['REQUEST_METHOD'] !== 'HEAD') echo 'Halaman tidak ditemukan.';
    exit;
}
if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'HEAD', 'POST'], true)) {
    http_response_code(405); header('Allow: GET, HEAD, POST'); exit;
}
$entry = $routes[$path];
if ($entry['type'] === 'asset') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') { http_response_code(405); exit; }
    header('Content-Type: '.$entry['mime']);
    if ($_SERVER['REQUEST_METHOD'] !== 'HEAD') readfile($root.$path);
    exit;
}
$_SERVER['SCRIPT_NAME'] = $path;
$_SERVER['PHP_SELF'] = $path;
if (isset($entry['role'])) {
    require_once $root.'/config/auth.php';
    require_role($entry['role']);
}
$postRoutes=['/auth/login.php','/auth/logout.php','/auth/change_password.php','/admin/master.php','/admin/bulk_upload.php','/admin/users.php','/admin/jadwal.php','/admin/penugasan.php','/admin/tahun_ajaran.php','/admin/nilai.php','/admin/ekskul.php','/admin/export_import.php','/admin/kalender.php','/guru/absen.php','/guru/jurnal.php','/guru/nilai.php','/guru/ekskul.php','/kepsek/evaluasi.php','/kepsek/kalender.php'];
if($_SERVER['REQUEST_METHOD']==='POST' && !in_array($path,[...$postRoutes,'/academic/index.php'],true)){http_response_code(405);header('Allow: GET, HEAD');exit;}
// Opt-in development workflows: old entrypoints must not create a second live
// attendance/calendar/report source. R1.5 deployments without this flag retain
// their audited behavior. Their historical records are not copied or changed.
if(isset($entry['role']) && function_exists('app_setting') && app_setting('ACADEMIC_WORKFLOWS')==='1'){
    $academicRoutes=[
        '/guru/absen.php'=>'pertemuan','/guru/jurnal.php'=>'pertemuan',
        '/guru/rekap_absen.php'=>'jurnal','/guru/nilai.php'=>'nilai',
        '/guru/rapor.php'=>'rapor','/siswa/rapor.php'=>'rapor','/kepsek/rapor.php'=>'rapor',
        '/admin/kalender.php'=>'kalender','/guru/kalender.php'=>'kalender',
        '/kepsek/kalender.php'=>'kalender','/siswa/kalender.php'=>'kalender',
        '/siswa/absen.php'=>'kehadiran',
        '/guru/jadwal.php'=>'jadwal','/siswa/jadwal.php'=>'jadwal',
        '/admin/nilai.php'=>'nilai','/kepsek/akademik.php'=>'nilai',
        '/guru/export_nilai.php'=>'nilai','/admin/export_nilai.php'=>'rapor',
        '/admin/index.php'=>'beranda','/guru/index.php'=>'beranda','/siswa/index.php'=>'beranda','/kepsek/index.php'=>'beranda',
    ];
    if($path==='/admin/export_import.php'&&$_SERVER['REQUEST_METHOD']!=='POST')redirect('/admin/bulk_upload.php');
    if(isset($academicRoutes[$path])){
        if($_SERVER['REQUEST_METHOD']==='POST'){verify_csrf();http_response_code(409);exit('Gunakan formulir Ruang Akademik terbaru; tidak ada data yang disimpan.');}
        $params=['view'=>$academicRoutes[$path]];
        foreach(['id_jadwal','tanggal','id_tahun_ajaran'] as $key)if(isset($_GET[$key])&&is_string($_GET[$key]))$params[$key]=$_GET[$key];
        header('Location: /academic/index.php?'.http_build_query($params));exit;
    }
}
chdir(dirname($root.$path));
require $root.$path;
