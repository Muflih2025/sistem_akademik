<?php
require_once __DIR__.'/../config/auth.php'; require_role('guru');
$pdo = db(); $gid = (int)user_reference();

$days_map = [1=>'Senin',2=>'Selasa',3=>'Rabu',4=>'Kamis',5=>'Jumat'];
$today_name = $days_map[(int)date('N')] ?? null;

$q = $pdo->prepare('SELECT j.*, k.nama_kelas, mp.nama_mapel
    FROM jadwal j
    JOIN kelas k ON k.id_kelas=j.id_kelas
    JOIN mata_pelajaran mp ON mp.id_mapel=j.id_mapel
    WHERE j.id_guru=? AND j.status="aktif" AND k.status="aktif" AND mp.status="aktif"
    ORDER BY FIELD(j.hari,"Senin","Selasa","Rabu","Kamis","Jumat"), j.jam_mulai');
$q->execute([$gid]); $rows = $q->fetchAll();

// Group by day
$by_day = [];
foreach ($rows as $r) { $by_day[$r['hari']][] = $r; }

$page_title = 'Jadwal Mengajar';
require __DIR__.'/../includes/header.php'; require __DIR__.'/../includes/sidebar.php'; require __DIR__.'/../includes/flash.php';
?>
<h2>Jadwal Mengajar</h2>

<?php if (empty($rows)): ?>
<div class="alert alert-info">Belum ada jadwal mengajar.</div>
<?php else: ?>
<?php foreach (['Senin','Selasa','Rabu','Kamis','Jumat'] as $day): ?>
<?php if (!isset($by_day[$day])) continue; ?>
<div class="card p-3 mb-3 <?= $day === $today_name ? 'border-primary' : '' ?>">
    <h5><?= e($day) ?> <?= $day === $today_name ? '<span class="badge bg-primary">Hari Ini</span>' : '' ?></h5>
    <div class="table-responsive">
        <table class="table table-hover mb-0">
            <thead><tr><th>Jam</th><th>Mata Pelajaran</th><th>Kelas</th><th>Ruang</th></tr></thead>
            <tbody>
            <?php foreach ($by_day[$day] as $r): ?>
            <tr>
                <td><?= e(substr($r['jam_mulai'],0,5).' - '.substr($r['jam_selesai'],0,5)) ?></td>
                <td class="fw-semibold"><?= e($r['nama_mapel']) ?></td>
                <td><?= e($r['nama_kelas']) ?></td>
                <td><?= e($r['ruang'] ?? '-') ?></td>
            </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>
<?php endforeach; ?>
<?php endif; ?>

<?php require __DIR__.'/../includes/footer.php'; ?>
