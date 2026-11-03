<?php
declare(strict_types=1);
// Fixed aliases only: the router never turns a URL segment into a file path.
const AK_VIEW_ROUTES = [
    'beranda'=>'/beranda', 'fondasi'=>'/akademik', 'pertemuan'=>'/absensi',
    'jurnal'=>'/jurnal', 'piket'=>'/piket', 'kalender'=>'/kalender',
    'nilai'=>'/nilai', 'rapor'=>'/rapor', 'kehadiran'=>'/kehadiran',
    'jadwal'=>'/jadwal', 'jam'=>'/jam-belajar', 'kenaikan'=>'/kenaikan',
    'alumni'=>'/alumni', 'pemantauan'=>'/guru-mengajar',
];
function ak_route_url(string $view,array $params=[]): string {
    unset($params['view']);
    if(app_setting('FRIENDLY_ROUTES')==='1' && isset(AK_VIEW_ROUTES[$view])){
        $query=http_build_query($params);
        return AK_VIEW_ROUTES[$view].($query!==''?'?'.$query:'');
    }
    return '/academic/index.php?'.http_build_query(['view'=>$view]+$params);
}
