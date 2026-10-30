<?php
require_once __DIR__.'/../config/auth.php'; require_role('kepala_sekolah');
$pdo = db();

// Stats
$total_guru = (int)$pdo->query('SELECT COUNT(*) FROM guru')->fetchColumn();
$total_siswa = (int)$pdo->query('SELECT COUNT(*) FROM siswa')->fetchColumn();
$total_kelas = (int)$pdo->query('SELECT COUNT(*) FROM kelas')->fetchColumn();
$total_mapel = (int)$pdo->query('SELECT COUNT(*) FROM mata_pelajaran')->fetchColumn();

// Today's teaching activity
$days_map = [1=>'Senin',2=>'Selasa',3=>'Rabu',4=>'Kamis',5=>'Jumat'];
$today = $days_map[(int)date('N')] ?? null;
$today_activity = [];
if ($today) {
    $q = $pdo->prepare('SELECT j.*, g.nama_guru, k.nama_kelas, mp.nama_mapel FROM jadwal j JOIN guru g ON g.id_guru=j.id_guru JOIN kelas k ON k.id_kelas=j.id_kelas JOIN mata_pelajaran mp ON mp.id_mapel=j.id_mapel WHERE j.hari=? ORDER BY j.jam_mulai');
    $q->execute([$today]); $today_activity = $q->fetchAll();
}

// Recent jurnal
$recent_jurnal = $pdo->query('SELECT jk.*, g.nama_guru, k.nama_kelas, mp.nama_mapel FROM jurnal_kelas jk JOIN guru g ON g.id_guru=jk.id_guru JOIN kelas k ON k.id_kelas=jk.id_kelas JOIN mata_pelajaran mp ON mp.id_mapel=jk.id_mapel ORDER BY jk.created_at DESC LIMIT 10')->fetchAll();

$page_title = 'Dashboard Kepala Sekolah';
require __DIR__.'/../includes/header.php'; require __DIR__.'/../includes/sidebar.php'; require __DIR__.'/../includes/flash.php';
?>
<h2>Dashboard Kepala Sekolah</h2>

<div class="row g-3 mb-4">
    <div class="col-md-3"><div class="card stat p-3"><small>Total Guru</small><h2><?= $total_guru ?></h2></div></div>
    <div class="col-md-3"><div class="card stat p-3"><small>Total Siswa</small><h2><?= $total_siswa ?></h2></div></div>
    <div class="col-md-3"><div class="card stat p-3"><small>Total Kelas</small><h2><?= $total_kelas ?></h2></div></div>
    <div class="col-md-3"><div class="card stat p-3"><small>Total Mapel</small><h2><?= $total_mapel ?></h2></div></div>
</div>

<?php if ($today && $today_activity): ?>
<div class="card p-3 mb-4">
    <h5>Kegiatan Mengajar Hari Ini (<?= e($today) ?>)</h5>
    <div class="table-responsive">
        <table class="table table-hover mb-0">
            <thead><tr><th>Jam</th><th>Guru</th><th>Mata Pelajaran</th><th>Kelas</th><th>Ruang</th></tr></thead>
            <tbody>
            <?php foreach ($today_activity as $a): ?>
            <tr>
                <td><?= e(substr($a['jam_mulai'],0,5).' - '.substr($a['jam_selesai'],0,5)) ?></td>
                <td class="fw-semibold"><?= e($a['nama_guru']) ?></td>
                <td><?= e($a['nama_mapel']) ?></td>
                <td><?= e($a['nama_kelas']) ?></td>
                <td><?= e($a['ruang'] ?? '-') ?></td>
            </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>
<?php endif; ?>

<div class="card p-3">
    <h5>Jurnal Mengajar Terbaru</h5>
    <?php if ($recent_jurnal): ?>
    <div class="table-responsive">
        <table class="table table-hover mb-0">
            <thead><tr><th>Tanggal</th><th>Guru</th><th>Kelas</th><th>Mapel</th><th>Materi</th></tr></thead>
            <tbody>
            <?php foreach ($recent_jurnal as $j): ?>
            <tr>
                <td><?= e($j['tanggal']) ?></td>
                <td><?= e($j['nama_guru']) ?></td>
                <td><?= e($j['nama_kelas']) ?></td>
                <td><?= e($j['nama_mapel']) ?></td>
                <td><?= e(mb_substr($j['materi'],0,60)) ?><?= mb_strlen($j['materi'])>60?'...':'' ?></td>
            </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php else: ?>
    <p class="text-muted">Belum ada jurnal mengajar.</p>
    <?php endif; ?>
</div>

<?php require __DIR__.'/../includes/footer.php'; ?>
