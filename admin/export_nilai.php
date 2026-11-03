<?php
require_once '../config/auth.php';
$role = current_user()['role'];
if (!in_array($role, ['guru', 'admin', 'kepala_sekolah'])) {
    deny_access();
}

$pdo = db();
$gid = ($role === 'guru') ? (int)user_reference() : 0;

// Ambil daftar kelas dan mapel
if ($role === 'guru') {
    $q = $pdo->prepare('SELECT DISTINCT k.id_kelas, k.nama_kelas, mp.id_mapel, mp.nama_mapel 
                        FROM jadwal j 
                        JOIN kelas k ON k.id_kelas = j.id_kelas 
                        JOIN mata_pelajaran mp ON mp.id_mapel = j.id_mapel 
                        WHERE j.id_guru = ? 
                        ORDER BY k.nama_kelas, mp.nama_mapel');
    $q->execute([$gid]);
    $pairs = $q->fetchAll();
} else {
    $pairs = $pdo->query('SELECT DISTINCT k.id_kelas, k.nama_kelas, mp.id_mapel, mp.nama_mapel 
                          FROM jadwal j 
                          JOIN kelas k ON k.id_kelas = j.id_kelas 
                          JOIN mata_pelajaran mp ON mp.id_mapel = j.id_mapel 
                          ORDER BY k.nama_kelas, mp.nama_mapel')->fetchAll();
}

$selected_kelas = (int)($_GET['id_kelas'] ?? ($pairs[0]['id_kelas'] ?? 0));
$selected_mapel = (int)($_GET['id_mapel'] ?? ($pairs[0]['id_mapel'] ?? 0));

$target_kelas_nama = '';
$target_mapel_nama = '';
foreach ($pairs as $p) {
    if ($p['id_kelas'] == $selected_kelas && $p['id_mapel'] == $selected_mapel) {
        $target_kelas_nama = $p['nama_kelas'];
        $target_mapel_nama = $p['nama_mapel'];
        break;
    }
}

// Ambil tahun ajaran aktif
$ta = $pdo->query("SELECT id_tahun_ajaran, tahun_ajaran, semester FROM tahun_ajaran WHERE status='Aktif' LIMIT 1")->fetch();

// Ambil data nilai siswa
$scores = [];
if ($selected_kelas && $selected_mapel) {
    $sql = 'SELECT s.nis, s.nama_siswa, s.jenis_kelamin,
                   n.nilai_tugas, n.nilai_uts, n.nilai_uas, n.nilai_akhir
            FROM siswa s 
            LEFT JOIN nilai n ON n.nis = s.nis AND n.id_mapel = ? 
            WHERE s.id_kelas = ? 
            ORDER BY s.nama_siswa';
    $q = $pdo->prepare($sql);
    $q->execute([$selected_mapel, $selected_kelas]);
    $scores = $q->fetchAll();
}

// Export CSV jika diminta
if (isset($_GET['format']) && $_GET['format'] === 'csv') {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="Nilai_' . preg_replace('/[^a-zA-Z0-9]/', '_', $target_kelas_nama) . '_' . preg_replace('/[^a-zA-Z0-9]/', '_', $target_mapel_nama) . '.csv"');
    $out = fopen('php://output', 'w');
    fputcsv($out, ['DAFTAR NILAI SISWA']);
    fputcsv($out, ['Kelas', $target_kelas_nama]);
    fputcsv($out, ['Mata Pelajaran', $target_mapel_nama]);
    fputcsv($out, ['Tahun Ajaran', ($ta['tahun_ajaran'] ?? '-') . ' / ' . ($ta['semester'] ?? '-')]);
    fputcsv($out, []);
    fputcsv($out, ['No', 'NIS', 'Nama Siswa', 'L/P', 'Nilai Tugas', 'Nilai UTS', 'Nilai UAS', 'Nilai Akhir', 'Status']);

    $no = 1;
    foreach ($scores as $r) {
        $na = $r['nilai_akhir'] ?? 0;
        $status = ($na >= DEFAULT_KKM) ? 'Tuntas' : 'Belum Tuntas';
        fputcsv($out, [
            $no++,
            $r['nis'],
            $r['nama_siswa'],
            $r['jenis_kelamin'],
            $r['nilai_tugas'] ?? 0,
            $r['nilai_uts'] ?? 0,
            $r['nilai_uas'] ?? 0,
            $na,
            $status
        ]);
    }
    fclose($out);
    exit;
}

$page_title = 'Export & Cetak Nilai';
require '../includes/header.php';
require '../includes/sidebar.php';
require '../includes/flash.php';
?>

<div class="d-flex justify-content-between align-items-center mb-3">
    <h2>Export & Cetak Nilai Siswa</h2>
    <?php if (!empty($scores)): ?>
    <div>
        <a href="?id_kelas=<?= $selected_kelas ?>&id_mapel=<?= $selected_mapel ?>&format=csv" class="btn btn-success">
            📥 Download Excel (CSV)
        </a>
        <button onclick="window.print()" class="btn btn-secondary">
            🖨️ Cetak / Simpan PDF
        </button>
    </div>
    <?php endif; ?>
</div>

<div class="card p-3 mb-4 shadow-sm d-print-none">
    <form method="get" class="row g-2 align-items-end">
        <div class="col-md-8">
            <label class="form-label fw-bold">Pilih Kelas dan Mata Pelajaran</label>
            <select class="form-select" onchange="const p=this.value.split('|'); location.href='?id_kelas='+p[0]+'&id_mapel='+p[1];">
                <?php foreach ($pairs as $p): 
                    $val = $p['id_kelas'].'|'.$p['id_mapel'];
                    $is_sel = ($p['id_kelas'] == $selected_kelas && $p['id_mapel'] == $selected_mapel);
                ?>
                    <option value="<?= $val ?>" <?= $is_sel ? 'selected' : '' ?>>
                        <?= e($p['nama_kelas'] . ' · ' . $p['nama_mapel']) ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </div>
    </form>
</div>

<?php if ($selected_kelas && !empty($scores)): ?>
<div class="card p-4 shadow-sm print-area">
    <div class="text-center mb-4">
        <h4 class="mb-1 text-uppercase fw-bold">SMK NEGERI 2 MAGELANG</h4>
        <h5 class="mb-2">DAFTAR NILAI CAPAIAN HASIL BELAJAR SISWA</h5>
        <div class="d-flex justify-content-center gap-4 text-muted small">
            <span>Kelas: <strong><?= e($target_kelas_nama) ?></strong></span>
            <span>Mata Pelajaran: <strong><?= e($target_mapel_nama) ?></strong></span>
            <span>Tahun Ajaran: <strong><?= e($ta['tahun_ajaran'] ?? '-') ?> (<?= e($ta['semester'] ?? '-') ?>)</strong></span>
            <span>Standar KKM: <strong><?= DEFAULT_KKM ?></strong></span>
        </div>
    </div>

    <div class="table-responsive">
        <table class="table table-bordered table-striped align-middle">
            <thead class="table-dark">
                <tr class="text-center">
                    <th style="width: 40px;">No</th>
                    <th>NIS</th>
                    <th>Nama Siswa</th>
                    <th style="width: 50px;">L/P</th>
                    <th>Tugas (30%)</th>
                    <th>UTS (30%)</th>
                    <th>UAS (40%)</th>
                    <th>Nilai Akhir</th>
                    <th>Keterangan</th>
                </tr>
            </thead>
            <tbody>
                <?php 
                $no = 1;
                $total_na = 0;
                $tuntas = 0;
                foreach ($scores as $s): 
                    $na = (float)($s['nilai_akhir'] ?? 0);
                    $total_na += $na;
                    $is_pass = ($na >= DEFAULT_KKM);
                    if ($is_pass) $tuntas++;
                ?>
                <tr>
                    <td class="text-center"><?= $no++ ?></td>
                    <td><?= e($s['nis']) ?></td>
                    <td><strong><?= e($s['nama_siswa']) ?></strong></td>
                    <td class="text-center"><?= e($s['jenis_kelamin'] ?: '-') ?></td>
                    <td class="text-center"><?= $s['nilai_tugas'] !== null ? number_format($s['nilai_tugas'], 1) : '-' ?></td>
                    <td class="text-center"><?= $s['nilai_uts'] !== null ? number_format($s['nilai_uts'], 1) : '-' ?></td>
                    <td class="text-center"><?= $s['nilai_uas'] !== null ? number_format($s['nilai_uas'], 1) : '-' ?></td>
                    <td class="text-center fw-bold <?= $is_pass ? 'text-success' : 'text-danger' ?>">
                        <?= $s['nilai_akhir'] !== null ? number_format($s['nilai_akhir'], 2) : '-' ?>
                    </td>
                    <td class="text-center">
                        <?php if ($s['nilai_akhir'] !== null): ?>
                            <span class="badge bg-<?= $is_pass ? 'success' : 'danger' ?>">
                                <?= $is_pass ? 'Tuntas' : 'Remidial' ?>
                            </span>
                        <?php else: ?>
                            <span class="text-muted small">Belum Dinilai</span>
                        <?php endif; ?>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
            <tfoot>
                <tr class="fw-bold bg-light">
                    <td colspan="7" class="text-end">Rata-rata Kelas:</td>
                    <td class="text-center"><?= count($scores) ? number_format($total_na / count($scores), 2) : '0' ?></td>
                    <td class="text-center"><?= $tuntas ?> / <?= count($scores) ?> Tuntas</td>
                </tr>
            </tfoot>
        </table>
    </div>

    <div class="row mt-5 pt-3 d-none d-print-flex">
        <div class="col-6 text-center">
            <p>Mengetahui,<br>Kepala Sekolah</p>
            <br><br><br>
            <p class="fw-bold mb-0"><u>Drs. Suprayitno, M.Pd</u><br><small>NIP. 196805121994031004</small></p>
        </div>
        <div class="col-6 text-center">
            <p>Magelang, <?= date('d F Y') ?><br>Guru Pengampu</p>
            <br><br><br>
            <p class="fw-bold mb-0"><u><?= e(current_user()['username']) ?></u></p>
        </div>
    </div>
</div>
<?php else: ?>
<div class="alert alert-info">Pilih kelas dan mata pelajaran untuk menampilkan dan mengunduh nilai.</div>
<?php endif; ?>

<?php require '../includes/footer.php'; ?>
