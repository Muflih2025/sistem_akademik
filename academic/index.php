<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/config/academic/attendance.php';
require_once dirname(__DIR__).'/config/academic/calendar.php';
require_once dirname(__DIR__).'/config/academic/grades.php';
require_once dirname(__DIR__).'/config/academic/transfer.php';
require_once __DIR__.'/layout.php';
require_once dirname(__DIR__).'/includes/crud.php';
require_login();
if (app_setting('ACADEMIC_WORKFLOWS')!=='1') not_found();
$view=input_choice(['view'=>$_GET['view']??'beranda'],'view',['beranda','fondasi','pertemuan','jurnal','piket','kalender','nilai','rapor','impor','kehadiran']);
if($view==='kehadiran')require_role('siswa');
if($view==='fondasi')require_role('admin');
if(in_array($view,['pertemuan','jurnal','piket','nilai','impor'],true))require_role(...($view==='pertemuan'?['guru']:['admin','guru','kepala_sekolah']));
$error='';
$didPreview=false;
if ($_SERVER['REQUEST_METHOD']==='POST') {
    verify_csrf();
    try {
        $action=input_text($_POST,'action',40);
        switch ($action) {
            case 'periode': ak_period_settings($_POST); break;
            case 'anggota': ak_save_member($_POST); break;
            case 'penugasan': ak_save_assignment_window($_POST); break;
            case 'piket': ak_save_duty($_POST); break;
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
        if(!$didPreview)flash('success','Data berhasil disimpan dan riwayat perubahan dicatat.');
        $params=['view'=>$view];
        foreach(['id_jadwal','id_tahun_ajaran','id_kelas','tanggal','bulan'] as $key) if(isset($_GET[$key]) && is_string($_GET[$key])) $params[$key]=$_GET[$key];
        if(!$didPreview)redirect('/academic/index.php?'.http_build_query($params));
    } catch (Throwable $caught) { $error=operation_error($caught); }
}
ob_start();
$titles=['beranda'=>'Ruang Akademik','fondasi'=>'Fondasi Akademik','pertemuan'=>'Absensi & Pertemuan','jurnal'=>'E-Jurnal Kelas & Agenda Guru','piket'=>'Monitoring Guru Piket','kalender'=>'Kalender Akademik','nilai'=>'Penilaian','rapor'=>'Rapor Semester','impor'=>'Impor & Ekspor','kehadiran'=>'Kehadiran Saya'];
// View files are an explicit allowlist, never a user-supplied path.
$views=['beranda'=>'home','fondasi'=>'foundation','pertemuan'=>'meeting','jurnal'=>'journal','piket'=>'duty','kalender'=>'calendar','nilai'=>'grades','rapor'=>'reports','impor'=>'transfer','kehadiran'=>'student_attendance'];
ak_begin($titles[$view],$view);
if ($error!=='') echo '<div class="notice error" role="alert">'.e($error).'</div>';
$path=__DIR__.'/views/'.$views[$view].'.php';
if (is_file($path)) { try { require $path; } catch (InputError $caught) { http_response_code(422); echo '<div class="notice error" role="alert">'.e($caught->getMessage()).'</div>'; } }
else echo '<div class="panel"><p>Modul ini belum diselesaikan pada checkpoint pengembangan ini. Gunakan modul existing melalui <a href="/'.e(dashboard_path(current_user()['role'])).'">dashboard</a>.</p></div>';
ak_end();
ob_end_flush();
