<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/config/academic/routes.php';

// Navigation is presentation only; every destination keeps its server-side guard.
function sia_navigation(?string $view=null): array {
    $role=current_user()['role'];
    $academic=static fn(string $key,string $label):array=>['label'=>$label,'url'=>ak_route_url($key),'view'=>$key];
    $page=static fn(string $url,string $label):array=>['label'=>$label,'url'=>$url];
    $modules=['beranda'=>['label'=>'Beranda','items'=>[$academic('beranda','Dashboard')]]];
    if($role==='admin'){
        $master=[];
        foreach(['siswa'=>'Data Siswa','guru'=>'Data Guru','kelas'=>'Data Kelas','jurusan'=>'Data Jurusan','mata_pelajaran'=>'Mata Pelajaran','ak_ruang'=>'Ruang & Laboratorium'] as $table=>$label)$master[]=$page('/admin/master.php?table='.$table,$label);
        $master[]=$page('/admin/bulk_upload.php','Bulk Upload Excel');
        $modules+=[
            'master'=>['label'=>'Master Data','items'=>$master],
            'akademik'=>['label'=>'Akademik','items'=>[
                $academic('fondasi','Periode & Penugasan'),$page('/admin/jadwal.php','Kelola Jadwal'),
                $page('/admin/penugasan.php','Penugasan Guru'),$page('/admin/tahun_ajaran.php','Tahun Ajaran'),
                $academic('jadwal','Lihat Jadwal'),$academic('jam','Jam Belajar'),$academic('kalender','Kalender Akademik'),
                $academic('kenaikan','Naik Kelas'),$academic('alumni','Alumni'),$page('/admin/ekskul.php','Ekstrakurikuler'),
            ]],
            'kehadiran'=>['label'=>'Absensi & Jurnal','items'=>[$academic('piket','Absensi Harian & Piket'),$academic('jurnal','Jurnal Kelas & Agenda Guru')]],
            'penilaian'=>['label'=>'Nilai & Rapor','items'=>[$academic('nilai','Rekap Nilai'),$academic('rapor','Rapor Semester')]],
            'monitoring'=>['label'=>'Monitoring','items'=>[$academic('pemantauan','Guru Mengajar')]],
            'pengaturan'=>['label'=>'Pengaturan','items'=>[$page('/admin/users.php','Manajemen Akun')]],
        ];
    }elseif($role==='guru'){
        $grades=[$academic('nilai','Input & Rekap Nilai'),$page('/guru/ekskul.php','Nilai Ekstrakurikuler')];
        if(app_setting('HOMEROOM_MODE')!=='informational')$grades[]=$academic('rapor','Rapor Kelas');
        $modules+=[
            'mengajar'=>['label'=>'Mengajar','items'=>[
                $academic('pertemuan','Absensi & Isi Jurnal'),$academic('jurnal','Riwayat & Cetak'),
                $academic('jadwal','Jadwal Mengajar'),$academic('kalender','Kalender Akademik'),$academic('jam','Jam Belajar'),
            ]],
            'penilaian'=>['label'=>'Penilaian','items'=>$grades],
        ];
        $q=db()->prepare('SELECT 1 FROM ak_tugas_piket WHERE id_guru=? AND aktif=1 LIMIT 1');$q->execute([user_reference()]);
        if($q->fetchColumn())$modules['piket']=['label'=>'Guru Piket','items'=>[$academic('piket','Pantau & Rekap Absensi')]];
    }elseif($role==='kepala_sekolah'){
        $modules+=[
            'monitoring'=>['label'=>'Monitoring','items'=>[$academic('pemantauan','Guru Mengajar'),$academic('jurnal','Jurnal Kelas & Agenda Guru'),$academic('piket','Absensi Harian')]],
            'akademik'=>['label'=>'Akademik','items'=>[$academic('jadwal','Jadwal Pelajaran'),$academic('kalender','Kalender Akademik'),$academic('jam','Jam Belajar'),$page('/kepsek/tahun_ajaran.php','Tahun Ajaran')]],
            'penilaian'=>['label'=>'Nilai & Rapor','items'=>[$academic('nilai','Rekap Nilai'),$academic('rapor','Rapor Siswa'),$page('/kepsek/evaluasi.php','Catatan Evaluasi')]],
        ];
    }else{
        $modules+=[
            'akademik'=>['label'=>'Akademik','items'=>[$academic('jadwal','Jadwal Kelas'),$academic('kalender','Kalender Akademik'),$academic('jam','Jam Belajar')]],
            'hasil'=>['label'=>'Hasil Belajar','items'=>[$academic('kehadiran','Kehadiran Saya'),$academic('rapor','Rapor Saya')]],
        ];
    }
    $active='beranda';$activeUrl=null;
    foreach($modules as $key=>$module)foreach($module['items'] as $item){
        $match=false;
        if(isset($item['view']))$match=$view!==null&&$view===$item['view'];
        else{
            $parts=parse_url($item['url']);$query=[];parse_str($parts['query']??'',$query);
            $match=($_SERVER['SCRIPT_NAME']??'')===($parts['path']??'');
            foreach($query as $name=>$value)if(($_GET[$name]??null)!==$value)$match=false;
        }
        if($match){$active=$key;$activeUrl=$item['url'];}
    }
    return ['modules'=>$modules,'active'=>$active,'active_url'=>$activeUrl];
}

function sia_navigation_header(array $nav): void {
    ?><a class="sia-skip" href="#sia-main">Langsung ke konten</a>
    <header class="sia-header"><a class="sia-brand" href="<?=e(ak_route_url('beranda'))?>">SIA <span>SMK Negeri 2 Magelang</span></a>
    <div class="identity sia-identity"><span><?=e(current_user()['username'])?> · <?=e(role_label(current_user()['role']))?></span><form method="post" action="/auth/logout.php"><?=csrf_field()?><button class="sia-logout" type="submit">Keluar</button></form></div></header>
    <nav class="sia-modules" aria-label="Modul utama"><?php foreach($nav['modules'] as $key=>$module):?><a href="<?=e($module['items'][0]['url'])?>" data-module="<?=e($key)?>" <?=$key===$nav['active']?'aria-current="true"':''?>><?=e($module['label'])?></a><?php endforeach;?></nav><?php
}

function sia_navigation_sidebar(array $nav): void {
    $module=$nav['modules'][$nav['active']];
    ?><details class="sia-sidebar" id="sia-feature-menu" open><summary>Menu fitur <span><?=e($module['label'])?></span></summary><div class="sia-sidebar-inner"><p class="sia-module-title"><?=e($module['label'])?></p><p class="sia-sidebar-hint">Pilih fitur</p><nav aria-label="Fitur <?=e($module['label'])?>"><?php foreach($module['items'] as $item):?><a href="<?=e($item['url'])?>" <?=$item['url']===$nav['active_url']?'aria-current="page"':''?>><span><?=e($item['label'])?></span><span aria-hidden="true">›</span></a><?php endforeach;?></nav></div></details><?php
}

function sia_navigation_bottom(): void {
    $role=current_user()['role'];
    $items=[['beranda','Beranda']];
    if($role==='guru'){
        $items[]=['pertemuan','Absensi'];$items[]=['nilai','Nilai'];
        $q=db()->prepare('SELECT 1 FROM ak_tugas_piket WHERE id_guru=? AND aktif=1 LIMIT 1');$q->execute([user_reference()]);
        if($q->fetchColumn())$items[]=['piket','Piket'];
    }elseif($role==='admin')$items=[['beranda','Beranda'],['fondasi','Akademik'],['piket','Absensi'],['rapor','Rapor']];
    elseif($role==='kepala_sekolah')$items=[['beranda','Beranda'],['pemantauan','Guru'],['piket','Absensi'],['rapor','Rapor']];
    else $items=[['beranda','Beranda'],['jadwal','Jadwal'],['kehadiran','Kehadiran'],['rapor','Rapor']];
    ?><nav class="bottom-nav sia-bottom" aria-label="Akses cepat"><?php foreach($items as [$key,$label]):?><a href="<?=e(ak_route_url($key))?>"><?=e($label)?></a><?php endforeach;?></nav><?php
}
