<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/config/academic/attendance.php';
require_once dirname(__DIR__).'/config/academic/calendar.php';
require_once dirname(__DIR__).'/config/academic/grades.php';
require_once dirname(__DIR__).'/config/academic/transfer.php';
require_once dirname(__DIR__).'/config/academic/bells.php';
require_once dirname(__DIR__).'/config/academic/progression.php';
require_once __DIR__.'/layout.php';
require_once dirname(__DIR__).'/includes/crud.php';
require_login();
if (app_setting('ACADEMIC_WORKFLOWS')!=='1') not_found();
$view=input_choice(['view'=>$_GET['view']??'beranda'],'view',['beranda','fondasi','pertemuan','jurnal','piket','kalender','nilai','rapor','impor','kehadiran','jadwal','jam','kenaikan','alumni','pemantauan']);
if($view==='kehadiran')require_role('siswa');
if(in_array($view,['fondasi','kenaikan','alumni'],true))require_role('admin');
if(in_array($view,['pertemuan','jurnal','piket','nilai','impor'],true))require_role(...($view==='pertemuan'?['guru']:['admin','guru','kepala_sekolah']));
if($view==='impor' && app_setting('ADMIN_BULK_ONLY')==='1' && $_SERVER['REQUEST_METHOD']!=='POST'){require_role('admin');$m=$_GET['module']??'siswa';if(!is_string($m)||!isset(AK_MASTER_IMPORT_KEYS[$m]))$m='siswa';redirect('/admin/bulk_upload.php?'.http_build_query(['module'=>$m]));}
if($view==='pemantauan')require_role('admin','kepala_sekolah');
$embeddedImportModules=[];
if(isset($_GET['upload'])){
    input_choice($_GET,'upload',['1']);
    $embeddedImportModules=match($view){
        'pertemuan'=>['absensi'], 'nilai'=>['nilai'], 'kalender'=>['kalender'], 'fondasi'=>['anggota','penugasan'], default=>[]
    };
    if(!$embeddedImportModules)not_found();
    require_role(...match($view){'pertemuan','nilai'=>['guru'],'kalender'=>['admin','kepala_sekolah'],default=>['admin']});
    input_choice(['module'=>$_GET['module']??$embeddedImportModules[0]],'module',$embeddedImportModules);
}
$error='';
$didPreview=false;
if ($_SERVER['REQUEST_METHOD']==='POST') {
    verify_csrf();
    try {
        $action=input_text($_POST,'action',40);
        if($embeddedImportModules){
            if(!in_array($action,['impor_preview','impor_commit'],true))deny_access();
            $importModule=$action==='impor_preview'?($_POST['module']??''):($_SESSION['ak_import']['module']??'');
            if(!in_array($importModule,$embeddedImportModules,true))deny_access();
        }
        switch ($action) {
            case 'jam_belajar': ak_save_bell($_POST); break;
            case 'kenaikan_preview': ak_progress_preview($_POST); break;
            case 'kenaikan_commit': $batch=ak_progress_commit($_POST); flash('success','Kenaikan kelas selesai. Batch #'.$batch.'; riwayat asal dipertahankan.'); break;
            case 'periode': ak_period_settings($_POST); break;
            case 'anggota': ak_save_member($_POST); break;
            case 'penugasan': ak_save_assignment_window($_POST); break;
            case 'piket': ak_save_duty($_POST); break;
            case 'wali': ak_save_wali($_POST); break;
            case 'rapor_review': ak_review_report($_POST); break;
            case 'pertemuan': ak_save_meeting($_POST); break;
            case 'rekonsiliasi': ak_reconcile($_POST); break;
            case 'koreksi_harian': ak_correct_daily($_POST); break;
            case 'kalender': ak_save_event($_POST); break;
            case 'aturan_nilai': ak_save_rule($_POST); break;
            case 'nilai': ak_save_grades($_POST); break;
            case 'rapor_buat': ak_build_report($_POST); break;
            case 'rapor_status': ak_transition_report($_POST); break;
            case 'impor_preview': ak_preview_import($_POST,$_FILES['berkas']??[]); $didPreview=true; break;
            case 'impor_commit': $imported=ak_commit_import($_POST); flash('success','Impor berhasil: '.$imported.' baris disimpan.'); break;
            default: throw new InputError('Operasi belum tersedia.');
        }
        if(!$didPreview)flash('success',$action==='kenaikan_preview'?'Pratinjau siap diperiksa. Belum ada perubahan siswa yang disimpan.':'Data berhasil disimpan dan riwayat perubahan dicatat.');
        $params=['view'=>$view];
        if(($action??'')==='kenaikan_commit')$params['batch']=$batch;
        foreach(['id_jadwal','id_tahun_ajaran','id_kelas','tanggal','bulan','id','module','nis','periode_asal','upload'] as $key) if(isset($_GET[$key]) && is_string($_GET[$key])) $params[$key]=$_GET[$key];
        if(!$didPreview)redirect('/academic/index.php?'.http_build_query($params));
    } catch (Throwable $caught) { $error=operation_error($caught); }
}
ob_start();
$titles=['beranda'=>'Ruang Akademik','fondasi'=>'Fondasi Akademik','pertemuan'=>'Absensi & Pertemuan','jurnal'=>'E-Jurnal Kelas & Agenda Guru','piket'=>'Monitoring Guru Piket','kalender'=>'Kalender Akademik','nilai'=>'Penilaian','rapor'=>'Rapor Semester','impor'=>'Impor & Ekspor','kehadiran'=>'Kehadiran Saya','jadwal'=>'Jadwal Pelajaran','jam'=>'Jam Belajar','kenaikan'=>'Naik Kelas','alumni'=>'Alumni','pemantauan'=>'Pemantauan Guru Mapel'];
// View files are an explicit allowlist, never a user-supplied path.
$views=['beranda'=>'home','fondasi'=>'foundation','pertemuan'=>'meeting','jurnal'=>'journal','piket'=>'duty','kalender'=>'calendar','nilai'=>'grades','rapor'=>'reports','impor'=>'transfer','kehadiran'=>'student_attendance','jadwal'=>'schedules','jam'=>'bell_reference','kenaikan'=>'progression','alumni'=>'alumni','pemantauan'=>'teaching_monitor'];
ak_begin($titles[$view],$view);
if ($error!=='') echo '<div class="notice error" role="alert">'.e($error).'</div>';
$path=__DIR__.'/views/'.($embeddedImportModules?'transfer':$views[$view]).'.php';
if (is_file($path)) { try { require $path; } catch (InputError $caught) { http_response_code(422); echo '<div class="notice error" role="alert">'.e($caught->getMessage()).'</div>'; } }
else echo '<div class="panel"><p>Modul ini belum diselesaikan pada checkpoint pengembangan ini. Gunakan modul existing melalui <a href="/'.e(dashboard_path(current_user()['role'])).'">dashboard</a>.</p></div>';
ak_end();
ob_end_flush();
