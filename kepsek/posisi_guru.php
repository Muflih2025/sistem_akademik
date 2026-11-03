<?php
require_once '../config/auth.php';
require_role('kepala_sekolah');
$role=current_user()['role'];

$pdo = db();

$hari_ini_indonesia = [
    'Sunday' => 'Minggu',
    'Monday' => 'Senin',
    'Tuesday' => 'Selasa',
    'Wednesday' => 'Rabu',
    'Thursday' => 'Kamis',
    'Friday' => 'Jumat',
    'Saturday' => 'Sabtu'
][date('l')];

$tanggal_hari_ini = date('Y-m-d');
$jam_sekarang = date('H:i:s');

// 1. Ambil data semua guru dan status live posisi mereka
$sql = "SELECT g.id_guru, g.nip, g.nama_guru, g.no_hp,
               -- Cek jadwal saat ini (jam_mulai <= NOW <= jam_selesai)
               (SELECT j.id_jadwal FROM jadwal j
                WHERE j.id_guru = g.id_guru AND j.hari = ?
                  AND ? BETWEEN j.jam_mulai AND j.jam_selesai LIMIT 1) as live_jadwal_id,
               -- Cek jadwal hari ini (jadwal terdekat / aktif hari ini)
               (SELECT CONCAT(k.nama_kelas, ' · ', mp.nama_mapel, ' (', SUBSTRING(j.jam_mulai,1,5), '-', SUBSTRING(j.jam_selesai,1,5), ')')
                FROM jadwal j
                JOIN kelas k ON k.id_kelas = j.id_kelas
                JOIN mata_pelajaran mp ON mp.id_mapel = j.id_mapel
                WHERE j.id_guru = g.id_guru AND j.hari = ?
                  AND ? BETWEEN j.jam_mulai AND j.jam_selesai LIMIT 1) as jadwal_saat_ini,
               -- Cek jurnal terakhir yang diupload guru hari ini
               (SELECT CONCAT('Kelas: ', k.nama_kelas, ' | Materi: ', SUBSTRING(jk.materi, 1, 40), ' | Jam: ', SUBSTRING(jk.created_at, 12, 5))
                FROM jurnal_kelas jk
                JOIN kelas k ON k.id_kelas = jk.id_kelas
                WHERE jk.id_guru = g.id_guru AND jk.tanggal = ?
                ORDER BY jk.id_jurnal DESC LIMIT 1) as jurnal_hari_ini,
               -- Cek kelas dari jurnal terakhir hari ini
               (SELECT k.nama_kelas
                FROM jurnal_kelas jk
                JOIN kelas k ON k.id_kelas = jk.id_kelas
                WHERE jk.id_guru = g.id_guru AND jk.tanggal = ?
                ORDER BY jk.id_jurnal DESC LIMIT 1) as kelas_jurnal_terakhir
        FROM guru g
        ORDER BY g.nama_guru ASC";

$stmt = $pdo->prepare($sql);
$stmt->execute([$hari_ini_indonesia, $jam_sekarang, $hari_ini_indonesia, $jam_sekarang, $tanggal_hari_ini, $tanggal_hari_ini]);
$posisi_guru = $stmt->fetchAll();

// 2. Ambil seluruh catatan jurnal hari ini
$qJurnal = $pdo->prepare("SELECT jk.*, g.nama_guru, k.nama_kelas, mp.nama_mapel
                          FROM jurnal_kelas jk
                          JOIN guru g ON g.id_guru = jk.id_guru
                          JOIN kelas k ON k.id_kelas = jk.id_kelas
                          JOIN jadwal j ON j.id_jadwal = jk.id_jadwal
                          JOIN mata_pelajaran mp ON mp.id_mapel = j.id_mapel
                          WHERE jk.tanggal = ?
                          ORDER BY jk.created_at DESC");
$qJurnal->execute([$tanggal_hari_ini]);
$jurnals_today = $qJurnal->fetchAll();

$page_title = 'Monitoring Posisi & Jurnal Guru';
require '../includes/header.php';
require '../includes/sidebar.php';
require '../includes/flash.php';
?>

<div class="d-flex justify-content-between align-items-center mb-3">
    <div>
        <h2>Monitoring Posisi Guru & Jurnal Mengajar</h2>
        <span class="text-muted">Hari: <strong><?= $hari_ini_indonesia ?>, <?= date('d M Y') ?></strong> · Waktu Server: <strong><?= date('H:i') ?> WIB</strong></span>
    </div>
    <div>
        <button onclick="location.reload()" class="btn btn-outline-primary">🔄 Segarkan Status</button>
    </div>
</div>

<div class="row g-3 mb-4">
    <div class="col-md-4">
        <div class="card p-3 bg-light shadow-sm">
            <small class="text-muted">Total Guru</small>
            <h3 class="mb-0 text-primary"><?= count($posisi_guru) ?></h3>
        </div>
    </div>
    <div class="col-md-4">
        <div class="card p-3 bg-light shadow-sm">
            <small class="text-muted">Jurnal Masuk Hari Ini</small>
            <h3 class="mb-0 text-success"><?= count($jurnals_today) ?> Upload</h3>
        </div>
    </div>
    <div class="col-md-4">
        <div class="card p-3 bg-light shadow-sm">
            <small class="text-muted">Status Live</small>
            <h3 class="mb-0 text-info">Otomatis Terdeteksi</h3>
        </div>
    </div>
</div>

<!-- Tabel Posisi Seluruh Guru -->
<div class="card p-3 shadow-sm mb-4">
    <div class="card-header bg-white d-flex justify-content-between align-items-center border-0 px-0">
        <h5 class="mb-0">🔍 Status Keberadaan Guru ("Guru Ada di Mana?")</h5>
    </div>
    <div class="table-responsive">
        <table class="table table-hover align-middle">
            <thead class="table-dark">
                <tr>
                    <th>No</th>
                    <th>Nama Guru</th>
                    <th>Jadwal Saat Ini (Live)</th>
                    <th>Posisi Berdasarkan Jurnal Upload</th>
                    <th>Status Keberadaan</th>
                    <th>Kontak</th>
                </tr>
            </thead>
            <tbody>
                <?php $no = 1; foreach ($posisi_guru as $g):
                    $is_scheduled_now = !empty($g['jadwal_saat_ini']);
                    $has_journal_today = !empty($g['jurnal_hari_ini']);
                ?>
                <tr>
                    <td><?= $no++ ?></td>
                    <td>
                        <strong><?= e($g['nama_guru']) ?></strong><br>
                        <small class="text-muted">NIP: <?= e($g['nip'] ?: '-') ?></small>
                    </td>
                    <td>
                        <?php if ($is_scheduled_now): ?>
                            <span class="badge bg-warning text-dark fs-6"><?= e($g['jadwal_saat_ini']) ?></span>
                        <?php else: ?>
                            <span class="text-muted small">Tidak ada jadwal jam ini</span>
                        <?php endif; ?>
                    </td>
                    <td>
                        <?php if ($has_journal_today): ?>
                            <div class="alert alert-success py-1 px-2 mb-0 small">
                                <strong>Di <?= e($g['kelas_jurnal_terakhir']) ?></strong><br>
                                <?= e($g['jurnal_hari_ini']) ?>
                            </div>
                        <?php else: ?>
                            <span class="badge bg-secondary">Belum ada jurnal hari ini</span>
                        <?php endif; ?>
                    </td>
                    <td>
                        <?php if ($has_journal_today): ?>
                            <span class="badge bg-success p-2">Berada di Kelas <?= e($g['kelas_jurnal_terakhir']) ?></span>
                        <?php elseif ($is_scheduled_now): ?>
                            <span class="badge bg-info text-dark p-2">⏳ Terjadwal Mengajar (Belum isi jurnal)</span>
                        <?php else: ?>
                            <span class="badge bg-light text-secondary border p-2">☕ Di Ruang Guru / Standby</span>
                        <?php endif; ?>
                    </td>
                    <td>
                        <?php if ($g['no_hp']): ?>
                            <a href="https://wa.me/<?= preg_replace('/^0/', '62', preg_replace('/[^0-9]/', '', $g['no_hp'])) ?>" target="_blank" class="btn btn-sm btn-outline-success">
                                💬 WA (<?= e($g['no_hp']) ?>)
                            </a>
                        <?php else: ?>
                            -
                        <?php endif; ?>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- Feed Jurnal Terunggah Hari Ini -->
<div class="card p-3 shadow-sm">
    <h5 class="mb-3">📖 Log Jurnal Pembelajaran Terunggah Hari Ini</h5>
    <div class="table-responsive">
        <table class="table table-striped table-bordered align-middle">
            <thead class="table-light">
                <tr>
                    <th>Waktu Upload</th>
                    <th>Guru Pengajar</th>
                    <th>Kelas</th>
                    <th>Mata Pelajaran</th>
                    <th>Jam Ke</th>
                    <th>Materi yang Disampaikan</th>
                    <th>Catatan</th>
                </tr>
            </thead>
            <tbody>
                <?php if (empty($jurnals_today)): ?>
                    <tr><td colspan="7" class="text-center text-muted">Belum ada jurnal yang diunggah untuk hari ini.</td></tr>
                <?php else: ?>
                    <?php foreach ($jurnals_today as $jt): ?>
                    <tr>
                        <td><strong><?= date('H:i', strtotime($jt['created_at'])) ?> WIB</strong></td>
                        <td><strong><?= e($jt['nama_guru']) ?></strong></td>
                        <td><span class="badge bg-primary"><?= e($jt['nama_kelas']) ?></span></td>
                        <td><?= e($jt['nama_mapel']) ?></td>
                        <td><?= e($jt['jam_ke'] ?: '-') ?></td>
                        <td><?= nl2br(e($jt['materi'])) ?></td>
                        <td><?= e($jt['catatan'] ?: '-') ?></td>
                    </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<?php require '../includes/footer.php'; ?>
