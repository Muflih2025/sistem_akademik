<?php
require_once __DIR__.'/../config/auth.php'; require_role('guru');
$pdo = db(); $gid = (int)user_reference();

// Guru's classes
$q = $pdo->prepare('SELECT DISTINCT j.id_kelas, k.nama_kelas FROM jadwal j JOIN kelas k ON k.id_kelas=j.id_kelas WHERE j.id_guru=? ORDER BY k.nama_kelas');
$q->execute([$gid]); $kelas_list = $q->fetchAll();

$tahun_list = $pdo->query('SELECT * FROM tahun_ajaran ORDER BY status DESC, tahun_ajaran DESC')->fetchAll();
$ekskul_list = $pdo->query('SELECT * FROM ekstrakurikuler ORDER BY nama_ekskul')->fetchAll();

$sel_kelas = (int)($_POST['id_kelas'] ?? $_GET['id_kelas'] ?? 0);
$sel_ta = (int)($_POST['id_tahun_ajaran'] ?? $_GET['id_tahun_ajaran'] ?? 0);
$sel_ekskul = (int)($_POST['id_ekskul'] ?? $_GET['id_ekskul'] ?? 0);

if (!$sel_ta) { foreach ($tahun_list as $t) { if ($t['status']==='Aktif') { $sel_ta=(int)$t['id_tahun_ajaran']; break; } } }

$students = [];
if ($sel_kelas && $sel_ekskul && $sel_ta) {
    $q = $pdo->prepare('SELECT s.nis, s.nama_siswa, ne.predikat, ne.keterangan 
        FROM siswa s 
        LEFT JOIN nilai_ekskul ne ON ne.nis=s.nis AND ne.id_ekskul=? AND ne.id_tahun_ajaran=? 
        WHERE s.id_kelas=? ORDER BY s.nama_siswa');
    $q->execute([$sel_ekskul, $sel_ta, $sel_kelas]); $students = $q->fetchAll();
}

// Handle POST save
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action']??'') === 'save') {
    verify_csrf();
    $nis_list = $_POST['nis'] ?? [];
    $pred_list = $_POST['predikat'] ?? [];
    $ket_list = $_POST['keterangan'] ?? [];
    $q = $pdo->prepare('INSERT INTO nilai_ekskul (nis, id_ekskul, id_tahun_ajaran, predikat, keterangan) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE predikat=VALUES(predikat), keterangan=VALUES(keterangan)');
    $count = 0;
    foreach ($nis_list as $i => $nis) {
        $pred = $pred_list[$i] ?? 'Baik';
        $ket = trim($ket_list[$i] ?? '') ?: null;
        if (in_array($pred, ['Sangat Baik','Baik','Cukup','Kurang'])) {
            $q->execute([$nis, $sel_ekskul, $sel_ta, $pred, $ket]);
            $count++;
        }
    }
    flash('success', "Nilai ekskul berhasil disimpan untuk $count siswa.");
    redirect("ekskul.php?id_kelas=$sel_kelas&id_tahun_ajaran=$sel_ta&id_ekskul=$sel_ekskul");
}

$page_title = 'Input Nilai Ekstrakurikuler';
require __DIR__.'/../includes/header.php'; require __DIR__.'/../includes/sidebar.php'; require __DIR__.'/../includes/flash.php';
?>
<h2>Input Nilai Ekstrakurikuler</h2>

<div class="card p-3 mb-4">
    <form method="get" class="row g-2 align-items-end">
        <div class="col-md-3">
            <label class="form-label">Kelas</label>
            <select class="form-select" name="id_kelas" required>
                <option value="">Pilih Kelas</option>
                <?php foreach ($kelas_list as $k): ?>
                <option value="<?= $k['id_kelas'] ?>" <?= $sel_kelas==$k['id_kelas']?'selected':'' ?>><?= e($k['nama_kelas']) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="col-md-3">
            <label class="form-label">Tahun Ajaran</label>
            <select class="form-select" name="id_tahun_ajaran">
                <?php foreach ($tahun_list as $t): ?>
                <option value="<?= $t['id_tahun_ajaran'] ?>" <?= $sel_ta==$t['id_tahun_ajaran']?'selected':'' ?>><?= e($t['tahun_ajaran'].' - '.$t['semester']) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="col-md-3">
            <label class="form-label">Ekstrakurikuler</label>
            <select class="form-select" name="id_ekskul" required>
                <option value="">Pilih Ekskul</option>
                <?php foreach ($ekskul_list as $ek): ?>
                <option value="<?= $ek['id_ekskul'] ?>" <?= $sel_ekskul==$ek['id_ekskul']?'selected':'' ?>><?= e($ek['nama_ekskul']) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="col-md-2"><button class="btn btn-primary w-100">Tampilkan</button></div>
    </form>
</div>

<?php if ($sel_kelas && $sel_ekskul && $students): ?>
<div class="card p-3">
    <form method="post">
        <?= csrf_field() ?>
        <input type="hidden" name="action" value="save">
        <input type="hidden" name="id_kelas" value="<?= $sel_kelas ?>">
        <input type="hidden" name="id_tahun_ajaran" value="<?= $sel_ta ?>">
        <input type="hidden" name="id_ekskul" value="<?= $sel_ekskul ?>">
        <div class="table-responsive">
            <table class="table table-hover">
                <thead><tr><th>No</th><th>NIS</th><th>Nama Siswa</th><th>Predikat</th><th>Keterangan</th></tr></thead>
                <tbody>
                <?php $no=1; foreach ($students as $s): ?>
                <tr>
                    <td><?= $no++ ?></td>
                    <td><?= e($s['nis']) ?></td>
                    <td><?= e($s['nama_siswa']) ?></td>
                    <td>
                        <input type="hidden" name="nis[]" value="<?= e($s['nis']) ?>">
                        <select class="form-select form-select-sm" name="predikat[]">
                            <?php foreach (['Sangat Baik','Baik','Cukup','Kurang'] as $p): ?>
                            <option <?= ($s['predikat']??'Baik')===$p?'selected':'' ?>><?= $p ?></option>
                            <?php endforeach; ?>
                        </select>
                    </td>
                    <td><input type="text" class="form-control form-control-sm" name="keterangan[]" value="<?= e($s['keterangan']??'') ?>" placeholder="Opsional"></td>
                </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        <button type="submit" class="btn btn-primary">Simpan Semua Nilai Ekskul</button>
    </form>
</div>
<?php elseif ($sel_kelas && $sel_ekskul): ?>
<div class="alert alert-info">Tidak ada siswa di kelas ini.</div>
<?php endif; ?>

<?php require __DIR__.'/../includes/footer.php'; ?>
