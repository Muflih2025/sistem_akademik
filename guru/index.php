<?php
require_once __DIR__.'/../config/auth.php'; require_role('guru');
$pdo = db(); $gid = (int)user_reference();

// Guru info
$q = $pdo->prepare('SELECT * FROM guru WHERE id_guru = ?'); $q->execute([$gid]); $guru = $q->fetch();

// Today's schedule
$days_map = [1=>'Senin',2=>'Selasa',3=>'Rabu',4=>'Kamis',5=>'Jumat'];
$today = $days_map[(int)date('N')] ?? null;
$today_classes = [];
if ($today) {
    $q = $pdo->prepare('SELECT j.*, k.nama_kelas, mp.nama_mapel FROM jadwal j JOIN kelas k ON k.id_kelas=j.id_kelas JOIN mata_pelajaran mp ON mp.id_mapel=j.id_mapel WHERE j.id_guru=? AND j.status="aktif" AND k.status="aktif" AND mp.status="aktif" AND j.hari=? ORDER BY j.jam_mulai');
    $q->execute([$gid, $today]); $today_classes = $q->fetchAll();
}

// Stats
$q = $pdo->prepare('SELECT COUNT(*) FROM jurnal_kelas WHERE id_guru=? AND YEARWEEK(tanggal,1)=YEARWEEK(CURDATE(),1)');
$q->execute([$gid]); $jurnal_week = (int)$q->fetchColumn();
$q = $pdo->prepare('SELECT COUNT(DISTINCT id_kelas) FROM jadwal WHERE id_guru=?');
$q->execute([$gid]); $total_kelas = (int)$q->fetchColumn();
$q = $pdo->prepare('SELECT COUNT(DISTINCT id_mapel) FROM jadwal WHERE id_guru=?');
$q->execute([$gid]); $total_mapel = (int)$q->fetchColumn();

$page_title = 'Dashboard Guru';
require __DIR__.'/../includes/header.php'; require __DIR__.'/../includes/sidebar.php'; require __DIR__.'/../includes/flash.php';
?>
<h2>Selamat Datang, <?= e($guru['nama_guru'] ?? 'Guru') ?></h2>
<?php if ($guru): ?>
<p class="text-muted mb-4">NIP: <?= e($guru['nip']) ?> &middot; <?= e($guru['email'] ?? '') ?></p>
<?php endif; ?>

<div class="row g-3 mb-4">
    <div class="col-md-3"><div class="card stat p-3"><small>Jadwal Hari Ini</small><h2><?= count($today_classes) ?></h2></div></div>
    <div class="col-md-3"><div class="card stat p-3"><small>Jurnal Minggu Ini</small><h2><?= $jurnal_week ?></h2></div></div>
    <div class="col-md-3"><div class="card stat p-3"><small>Total Kelas</small><h2><?= $total_kelas ?></h2></div></div>
    <div class="col-md-3"><div class="card stat p-3"><small>Total Mapel</small><h2><?= $total_mapel ?></h2></div></div>
</div>

<?php if ($today && $today_classes): ?>
<div class="card p-3 mb-4">
    <h5>Jadwal Hari Ini (<?= e($today) ?>, <?= date('d M Y') ?>)</h5>
    <div class="table-responsive">
        <table class="table table-hover mb-0">
            <thead><tr><th>Jam</th><th>Mata Pelajaran</th><th>Kelas</th><th>Ruang</th></tr></thead>
            <tbody>
            <?php foreach ($today_classes as $c): ?>
            <tr>
                <td><?= e(substr($c['jam_mulai'],0,5).' - '.substr($c['jam_selesai'],0,5)) ?></td>
                <td class="fw-semibold"><?= e($c['nama_mapel']) ?></td>
                <td><?= e($c['nama_kelas']) ?></td>
                <td><?= e($c['ruang'] ?? '-') ?></td>
            </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>
<?php elseif (!$today): ?>
<div class="alert alert-info">Hari ini bukan hari kerja.</div>
<?php else: ?>
<div class="alert alert-info">Tidak ada jadwal mengajar hari ini.</div>
<?php endif; ?>

<div class="row g-3">
    <div class="col-md-4"><a href="jurnal.php" class="card p-3 text-decoration-none"><h6><i class="bi bi-journal-text"></i> Jurnal & Presensi</h6><small class="text-muted">Input jurnal mengajar dan presensi cepat</small></a></div>
    <div class="col-md-4"><a href="nilai.php" class="card p-3 text-decoration-none"><h6><i class="bi bi-pencil-square"></i> Input Nilai</h6><small class="text-muted">Input nilai tugas, UTS, dan UAS</small></a></div>
    <div class="col-md-4"><a href="rapor.php" class="card p-3 text-decoration-none"><h6><i class="bi bi-file-earmark-medical"></i> Rapor Kelas</h6><small class="text-muted">Lihat dan cetak rapor siswa</small></a></div>
</div>

<?php require __DIR__.'/../includes/footer.php'; ?>
