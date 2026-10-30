<?php
require_once __DIR__.'/../config/auth.php'; require_role('kepala_sekolah');
$pdo = db();

$kelas_list = $pdo->query('SELECT k.*, jr.nama_jurusan FROM kelas k LEFT JOIN jurusan jr ON jr.id_jurusan=k.id_jurusan ORDER BY k.nama_kelas')->fetchAll();
$tahun_list = $pdo->query('SELECT * FROM tahun_ajaran ORDER BY status DESC, tahun_ajaran DESC')->fetchAll();

$sel_kelas = (int)($_GET['id_kelas'] ?? 0);
$sel_ta = (int)($_GET['id_tahun_ajaran'] ?? 0);
if (!$sel_ta) { foreach ($tahun_list as $t) { if ($t['status']==='Aktif') { $sel_ta=(int)$t['id_tahun_ajaran']; break; } } }

$recap = [];
if ($sel_kelas && $sel_ta) {
    $q = $pdo->prepare('SELECT s.nis, s.nama_siswa, 
        ROUND(AVG(n.nilai_akhir),2) as rata2,
        COUNT(n.id_nilai) as jumlah_mapel,
        SUM(CASE WHEN n.nilai_akhir >= mp.kkm THEN 1 ELSE 0 END) as tuntas,
        SUM(CASE WHEN n.nilai_akhir < mp.kkm THEN 1 ELSE 0 END) as belum_tuntas
        FROM siswa s 
        LEFT JOIN nilai n ON n.nis=s.nis AND n.id_tahun_ajaran=?
        LEFT JOIN mata_pelajaran mp ON mp.id_mapel=n.id_mapel
        WHERE s.id_kelas=? 
        GROUP BY s.nis, s.nama_siswa 
        ORDER BY rata2 DESC');
    $q->execute([$sel_ta, $sel_kelas]); $recap = $q->fetchAll();
}

// Overall stats per kelas
$overall = [];
if ($sel_ta) {
    $q = $pdo->prepare('SELECT k.nama_kelas, k.id_kelas,
        COUNT(DISTINCT s.nis) as jumlah_siswa,
        ROUND(AVG(n.nilai_akhir),2) as rata2_kelas
        FROM kelas k 
        JOIN siswa s ON s.id_kelas=k.id_kelas
        LEFT JOIN nilai n ON n.nis=s.nis AND n.id_tahun_ajaran=?
        GROUP BY k.id_kelas, k.nama_kelas
        ORDER BY rata2_kelas DESC');
    $q->execute([$sel_ta]); $overall = $q->fetchAll();
}

$page_title = 'Rekap Akademik';
require __DIR__.'/../includes/header.php'; require __DIR__.'/../includes/sidebar.php'; require __DIR__.'/../includes/flash.php';
?>
<h2>Rekap Akademik</h2>

<div class="card p-3 mb-4">
    <form method="get" class="row g-2 align-items-end">
        <div class="col-md-4">
            <label class="form-label">Kelas</label>
            <select class="form-select" name="id_kelas">
                <option value="">-- Semua Kelas (Ringkasan) --</option>
                <?php foreach ($kelas_list as $k): ?>
                <option value="<?= $k['id_kelas'] ?>" <?= $sel_kelas==$k['id_kelas']?'selected':'' ?>><?= e($k['nama_kelas']) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="col-md-4">
            <label class="form-label">Tahun Ajaran</label>
            <select class="form-select" name="id_tahun_ajaran">
                <?php foreach ($tahun_list as $t): ?>
                <option value="<?= $t['id_tahun_ajaran'] ?>" <?= $sel_ta==$t['id_tahun_ajaran']?'selected':'' ?>><?= e($t['tahun_ajaran'].' - '.$t['semester']) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="col-md-2"><button class="btn btn-primary w-100">Tampilkan</button></div>
    </form>
</div>

<?php if (!$sel_kelas && $overall): ?>
<div class="card p-3 mb-4">
    <h5>Rata-rata Nilai per Kelas</h5>
    <div class="table-responsive">
        <table class="table table-hover mb-0">
            <thead><tr><th>Peringkat</th><th>Kelas</th><th>Jumlah Siswa</th><th>Rata-rata Nilai</th><th>Aksi</th></tr></thead>
            <tbody>
            <?php $rk=1; foreach ($overall as $o): ?>
            <tr>
                <td><?= $rk++ ?></td>
                <td class="fw-semibold"><?= e($o['nama_kelas']) ?></td>
                <td><?= $o['jumlah_siswa'] ?></td>
                <td><?= $o['rata2_kelas'] ?? '-' ?></td>
                <td><a href="?id_kelas=<?= $o['id_kelas'] ?>&id_tahun_ajaran=<?= $sel_ta ?>" class="btn btn-sm btn-outline-primary">Detail</a></td>
            </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>
<?php endif; ?>

<?php if ($sel_kelas && $recap): ?>
<div class="card p-3">
    <h5>Detail Nilai Siswa</h5>
    <div class="table-responsive">
        <table class="table table-hover mb-0">
            <thead><tr><th>Peringkat</th><th>NIS</th><th>Nama</th><th>Mapel Dinilai</th><th>Tuntas</th><th>Belum Tuntas</th><th>Rata-rata</th></tr></thead>
            <tbody>
            <?php $rk=1; foreach ($recap as $r): ?>
            <tr>
                <td><?= $rk++ ?></td>
                <td><?= e($r['nis']) ?></td>
                <td class="fw-semibold"><?= e($r['nama_siswa']) ?></td>
                <td><?= (int)$r['jumlah_mapel'] ?></td>
                <td class="text-success"><?= (int)$r['tuntas'] ?></td>
                <td class="text-danger"><?= (int)$r['belum_tuntas'] ?></td>
                <td class="fw-bold"><?= $r['rata2'] ?? '-' ?></td>
            </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>
<?php elseif ($sel_kelas): ?>
<div class="alert alert-info">Tidak ada data nilai untuk kelas ini.</div>
<?php endif; ?>

<?php require __DIR__.'/../includes/footer.php'; ?>
