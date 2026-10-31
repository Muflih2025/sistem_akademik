<?php $role = current_user()['role']; $cf = basename($_SERVER['SCRIPT_NAME']); ?>
<aside class="col-lg-2 sidebar">
    <div class="list-group list-group-flush">

        <?php if($role === 'admin'): ?>
            <div class="nav-section">Master Data</div>
            <a class="list-group-item <?=$cf==='master.php'&&($_GET['table']??'')==='siswa'?'active':''?>" href="../admin/master.php?table=siswa"><i class="bi bi-people si"></i> Data Siswa</a>
            <a class="list-group-item <?=$cf==='master.php'&&($_GET['table']??'')==='guru'?'active':''?>" href="../admin/master.php?table=guru"><i class="bi bi-person-badge si"></i> Data Guru</a>
            <a class="list-group-item <?=$cf==='master.php'&&($_GET['table']??'')==='kelas'?'active':''?>" href="../admin/master.php?table=kelas"><i class="bi bi-building si"></i> Data Kelas</a>
            <a class="list-group-item <?=$cf==='master.php'&&($_GET['table']??'')==='jurusan'?'active':''?>" href="../admin/master.php?table=jurusan"><i class="bi bi-diagram-3 si"></i> Data Jurusan</a>
            <a class="list-group-item <?=$cf==='master.php'&&($_GET['table']??'')==='mata_pelajaran'?'active':''?>" href="../admin/master.php?table=mata_pelajaran"><i class="bi bi-book si"></i> Mata Pelajaran</a>
            <div class="nav-section">Akademik</div>
            <a class="list-group-item <?=$cf==='tahun_ajaran.php'?'active':''?>" href="../admin/tahun_ajaran.php"><i class="bi bi-calendar3 si"></i> Tahun Ajaran</a>
            <a class="list-group-item <?=$cf==='jadwal.php'?'active':''?>" href="../admin/jadwal.php"><i class="bi bi-calendar-week si"></i> Jadwal Pelajaran</a>
            <a class="list-group-item <?=$cf==='ekskul.php'?'active':''?>" href="../admin/ekskul.php"><i class="bi bi-trophy si"></i> Ekstrakurikuler</a>
            <div class="nav-section">Laporan</div>
            <a class="list-group-item <?=$cf==='posisi_guru.php'?'active':''?>" href="../admin/posisi_guru.php"><i class="bi bi-geo-alt si"></i> Posisi Guru</a>
            <a class="list-group-item <?=$cf==='bulk_upload.php'?'active':''?>" href="../admin/bulk_upload.php"><i class="bi bi-box-arrow-in-down si"></i> Bulk Upload Excel</a>
            <div class="nav-section">Pengaturan</div>
            <a class="list-group-item <?=$cf==='users.php'?'active':''?>" href="../admin/users.php"><i class="bi bi-shield-lock si"></i> Manajemen Akun</a>

        <?php elseif($role === 'guru'): ?>
            <div class="nav-section">Mengajar</div>
            <a class="list-group-item <?=$cf==='jurnal.php'?'active':''?>" href="../guru/jurnal.php"><i class="bi bi-journal-text si"></i> Jurnal & Presensi</a>
            <a class="list-group-item <?=$cf==='jadwal.php'?'active':''?>" href="../guru/jadwal.php"><i class="bi bi-calendar-week si"></i> Jadwal Mengajar</a>
            <a class="list-group-item <?=$cf==='absen.php'?'active':''?>" href="../guru/absen.php"><i class="bi bi-clipboard-check si"></i> Absensi Manual</a>
            <a class="list-group-item <?=$cf==='rekap_absen.php'?'active':''?>" href="../guru/rekap_absen.php"><i class="bi bi-bar-chart si"></i> Rekap Presensi</a>
            <div class="nav-section">Penilaian</div>
            <a class="list-group-item <?=$cf==='nilai.php'?'active':''?>" href="../guru/nilai.php"><i class="bi bi-pencil-square si"></i> Input Nilai</a>
            <?php if(app_setting('HOMEROOM_MODE')!=='informational'):?><a class="list-group-item <?=$cf==='rapor.php'?'active':''?>" href="../guru/rapor.php"><i class="bi bi-file-earmark-medical si"></i> Rapor Kelas</a><?php endif;?>
            <a class="list-group-item <?=$cf==='ekskul.php'?'active':''?>" href="../guru/ekskul.php"><i class="bi bi-trophy si"></i> Nilai Ekskul</a>

        <?php elseif($role === 'kepala_sekolah'): ?>
            <div class="nav-section">Monitoring</div>
            <a class="list-group-item <?=$cf==='posisi_guru.php'?'active':''?>" href="../kepsek/posisi_guru.php"><i class="bi bi-geo-alt si"></i> Posisi Guru</a>
            <a class="list-group-item <?=$cf==='akademik.php'?'active':''?>" href="../kepsek/akademik.php"><i class="bi bi-graph-up si"></i> Rekap Akademik</a>
            <a class="list-group-item <?=$cf==='rapor.php'?'active':''?>" href="../kepsek/rapor.php"><i class="bi bi-file-earmark-medical si"></i> Rapor Siswa</a>
            <div class="nav-section">Manajemen</div>
            <a class="list-group-item <?=$cf==='tahun_ajaran.php'?'active':''?>" href="../kepsek/tahun_ajaran.php"><i class="bi bi-calendar3 si"></i> Tahun Ajaran</a>
            <a class="list-group-item <?=$cf==='evaluasi.php'?'active':''?>" href="../kepsek/evaluasi.php"><i class="bi bi-card-checklist si"></i> Catatan Evaluasi</a>

        <?php else: ?>
            <div class="nav-section">Menu Siswa</div>
            <a class="list-group-item <?=$cf==='jadwal.php'?'active':''?>" href="../siswa/jadwal.php"><i class="bi bi-calendar-week si"></i> Jadwal Kelas</a>
            <a class="list-group-item <?=$cf==='rapor.php'?'active':''?>" href="../siswa/rapor.php"><i class="bi bi-file-earmark-medical si"></i> Rapor Saya</a>
            <a class="list-group-item <?=$cf==='absen.php'?'active':''?>" href="../siswa/absen.php"><i class="bi bi-clipboard-check si"></i> Riwayat Absensi</a>
        <?php endif; ?>

    </div>
</aside>
<main class="col-lg-10 py-4">
<div class="container-fluid">

<?php if(!empty($crud_ui) && function_exists('crud_navigation'))crud_navigation(); ?>
