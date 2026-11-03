<?php
require_once '../config/auth.php';
require_role('guru');
$pdo = db();
$gid = (int)user_reference();
$error = '';
$success = '';

// Ambil jadwal mengajar guru
$q = $pdo->prepare('SELECT j.id_jadwal, j.id_kelas, k.nama_kelas, mp.id_mapel, mp.nama_mapel, j.hari, j.jam_mulai, j.jam_selesai, j.ruang, jr.nama_jurusan 
                    FROM jadwal j 
                    JOIN kelas k ON k.id_kelas = j.id_kelas 
                    LEFT JOIN jurusan jr ON jr.id_jurusan = k.id_jurusan 
                    JOIN mata_pelajaran mp ON mp.id_mapel = j.id_mapel 
                    WHERE j.id_guru = ? 
                    ORDER BY FIELD(j.hari, "Senin", "Selasa", "Rabu", "Kamis", "Jumat"), j.jam_mulai');
$q->execute([$gid]);
$schedules = $q->fetchAll();

$selected = (int)($_POST['id_jadwal'] ?? $_GET['id_jadwal'] ?? ($schedules[0]['id_jadwal'] ?? 0));
$date = $_POST['tanggal'] ?? $_GET['tanggal'] ?? date('Y-m-d');

// Hitung nomor pertemuan otomatis
$pertemuan_ke = 1;
if ($selected) {
    $q = $pdo->prepare('SELECT COUNT(*) FROM jurnal_kelas WHERE id_jadwal = ?');
    $q->execute([$selected]);
    $existing_count = (int)$q->fetchColumn();
    $pertemuan_ke = $existing_count + 1;
}

// Simpan Agenda Harian Guru & Presensi Siswa
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'save_jurnal') {
    verify_csrf();
    try {
        $id_jadwal = (int)$_POST['id_jadwal'];
        $tanggal = $_POST['tanggal'] ?? date('Y-m-d');
        $pertemuan_inp = (int)($_POST['pertemuan_ke'] ?? 1);
        $jam_ke = trim($_POST['jam_ke'] ?? '');
        $guru_pengganti = trim($_POST['guru_pengganti'] ?? '') ?: null;
        $materi = trim($_POST['materi'] ?? '');
        $refleksi = trim($_POST['refleksi'] ?? '');
        $catatan = trim($_POST['catatan'] ?? '');

        if (!$id_jadwal || empty($materi)) {
            throw new RuntimeException('Jadwal dan Uraian Materi Pembelajaran (TP/ATP) wajib diisi.');
        }

        // Verifikasi jadwal milik guru
        $q = $pdo->prepare('SELECT j.id_kelas, j.id_mapel, k.nama_kelas, mp.nama_mapel FROM jadwal j JOIN kelas k ON k.id_kelas=j.id_kelas JOIN mata_pelajaran mp ON mp.id_mapel=j.id_mapel WHERE j.id_jadwal = ? AND j.id_guru = ?');
        $q->execute([$id_jadwal, $gid]);
        $jinfo = $q->fetch();
        if (!$jinfo) {
            throw new RuntimeException('Jadwal tidak valid atau bukan penugasan mengajar Anda.');
        }
        $id_kelas = (int)$jinfo['id_kelas'];
        $id_mapel = (int)$jinfo['id_mapel'];

        $pdo->beginTransaction();

        // 1. Simpan ke jurnal_kelas
        $q = $pdo->prepare('INSERT INTO jurnal_kelas (id_jadwal, id_guru, id_kelas, id_mapel, tanggal, pertemuan_ke, jam_ke, guru_pengganti, materi, kegiatan, refleksi, catatan)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ON DUPLICATE KEY UPDATE 
                            pertemuan_ke = VALUES(pertemuan_ke),
                            jam_ke = VALUES(jam_ke),
                            guru_pengganti = VALUES(guru_pengganti),
                            materi = VALUES(materi),
                            kegiatan = VALUES(kegiatan),
                            refleksi = VALUES(refleksi),
                            catatan = VALUES(catatan)');
        $q->execute([$id_jadwal, $gid, $id_kelas, $id_mapel, $tanggal, $pertemuan_inp, $jam_ke, $guru_pengganti, $materi, $refleksi, $refleksi, $catatan]);

        // 2. Simpan Presensi Siswa
        $q = $pdo->prepare('SELECT nis FROM siswa WHERE id_kelas = ? ORDER BY nama_siswa');
        $q->execute([$id_kelas]);
        $all_students = $q->fetchAll(PDO::FETCH_COLUMN);

        $status_custom = $_POST['status_custom'] ?? [];
        $ket_custom = $_POST['ket_custom'] ?? [];

        $stmtAbsen = $pdo->prepare('INSERT INTO absensi (tanggal, nis, id_jadwal, status, keterangan, created_by)
                                    VALUES (?, ?, ?, ?, ?, ?)
                                    ON DUPLICATE KEY UPDATE status = VALUES(status), keterangan = VALUES(keterangan), created_by = VALUES(created_by)');

        foreach ($all_students as $nis) {
            $status = 'Hadir';
            $keterangan = null;
            if (isset($status_custom[$nis]) && in_array($status_custom[$nis], ['Sakit', 'Izin', 'Alpa'])) {
                $status = $status_custom[$nis];
                $keterangan = trim($ket_custom[$nis] ?? '') ?: null;
            }
            $stmtAbsen->execute([$tanggal, $nis, $id_jadwal, $status, $keterangan, $gid]);
        }

        $pdo->commit();
        flash('success', "Agenda Harian Pertemuan Ke-{$pertemuan_inp} dan Presensi Siswa berhasil disimpan.");
        redirect('jurnal.php?id_jadwal=' . $id_jadwal . '&tanggal=' . $tanggal);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        $error = $e->getMessage();
    }
}

// Ambil data siswa & status absen tanggal terpilih
$students = [];
$today_jurnal = null;
$selected_info = null;

if ($selected) {
    foreach ($schedules as $sc) {
        if ((int)$sc['id_jadwal'] === $selected) {
            $selected_info = $sc;
            break;
        }
    }

    $q = $pdo->prepare('SELECT s.nis, s.nama_siswa, s.jenis_kelamin, a.status, a.keterangan 
                        FROM jadwal j 
                        JOIN siswa s ON s.id_kelas = j.id_kelas 
                        LEFT JOIN absensi a ON a.nis = s.nis AND a.id_jadwal = j.id_jadwal AND a.tanggal = ? 
                        WHERE j.id_jadwal = ? AND j.id_guru = ? 
                        ORDER BY s.nama_siswa');
    $q->execute([$date, $selected, $gid]);
    $students = $q->fetchAll();

    // Cek record jurnal tanggal ini jika sudah ada
    $q = $pdo->prepare('SELECT * FROM jurnal_kelas WHERE id_jadwal = ? AND tanggal = ? ORDER BY id_jurnal DESC LIMIT 1');
    $q->execute([$selected, $date]);
    $today_jurnal = $q->fetch();
    if ($today_jurnal && !empty($today_jurnal['pertemuan_ke'])) {
        $pertemuan_ke = (int)$today_jurnal['pertemuan_ke'];
    }
}

// Riwayat Agenda Harian Guru
$q = $pdo->prepare('SELECT jk.*, k.nama_kelas, mp.nama_mapel 
                    FROM jurnal_kelas jk 
                    JOIN jadwal j ON j.id_jadwal = jk.id_jadwal 
                    JOIN kelas k ON k.id_kelas = jk.id_kelas 
                    JOIN mata_pelajaran mp ON mp.id_mapel = j.id_mapel 
                    WHERE jk.id_guru = ? 
                    ORDER BY jk.tanggal DESC, jk.pertemuan_ke DESC LIMIT 20');
$q->execute([$gid]);
$recent_journals = $q->fetchAll();

$page_title = 'Buku Agenda Harian Guru & Jurnal KBM';
require '../includes/header.php';
require '../includes/sidebar.php';
require '../includes/flash.php';
?>

<div class="d-flex justify-content-between align-items-center mb-3">
    <div>
        <h2 class="mb-0">Buku Agenda Harian Guru & Jurnal KBM</h2>
        <small class="text-muted">Format Resmi SMKN 2 Magelang (No. Dokumen: FM-03/03-04/WKST)</small>
    </div>
    <a href="rekap_absen.php?id_jadwal=<?= $selected ?>" class="btn btn-outline-info">
        <i class="bi bi-card-checklist"></i> Buka Daftar Hadir Siswa (FM-03/03-02/WKST)
    </a>
</div>

<?php if ($error): ?>
    <div class="alert alert-danger"><?= e($error) ?></div>
<?php endif; ?>

<!-- Filter & Pemilihan Jadwal KBM -->
<div class="card p-3 mb-4 shadow-sm">
    <form method="get" class="row g-2 align-items-end">
        <div class="col-md-5">
            <label class="form-label fw-bold">Jadwal Mata Pelajaran & Kelas</label>
            <select class="form-select" name="id_jadwal" required onchange="this.form.submit()">
                <option value="">-- Pilih Jadwal KBM --</option>
                <?php foreach ($schedules as $s): ?>
                    <option value="<?= $s['id_jadwal'] ?>" <?= ($selected === (int)$s['id_jadwal']) ? 'selected' : '' ?>>
                        <?= e($s['hari'] . ' (' . substr($s['jam_mulai'], 0, 5) . '-' . substr($s['jam_selesai'], 0, 5) . ') · ' . $s['nama_kelas'] . ' · ' . $s['nama_mapel']) ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="col-md-3">
            <label class="form-label fw-bold">Tanggal Pertemuan (Default: Hari-H)</label>
            <input class="form-control" type="date" name="tanggal" value="<?= e($date) ?>" required onchange="this.form.submit()">
        </div>
        <div class="col-md-2">
            <button class="btn btn-primary w-100"><i class="bi bi-arrow-clockwise"></i> Muat Data</button>
        </div>
        <div class="col-md-2">
            <a href="jurnal.php?id_jadwal=<?= $selected ?>&tanggal=<?= date('Y-m-d') ?>" class="btn btn-outline-secondary w-100">Set Hari Ini</a>
        </div>
    </form>
</div>

<?php if ($selected && $students): ?>
<form method="post" action="jurnal.php">
    <?= csrf_field() ?>
    <input type="hidden" name="action" value="save_jurnal">
    <input type="hidden" name="id_jadwal" value="<?= $selected ?>">
    <input type="hidden" name="tanggal" value="<?= e($date) ?>">

    <div class="row g-4 mb-4">
        <!-- Kolom Kiri: Form Agenda Harian Guru -->
        <div class="col-lg-5">
            <div class="card p-3 h-100 shadow-sm border-primary">
                <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center mb-3">
                    <h5 class="mb-0"><i class="bi bi-journal-bookmark"></i> Agenda Harian Guru</h5>
                    <span class="badge bg-light text-primary">Pertemuan Ke-<?= $pertemuan_ke ?></span>
                </div>

                <div class="row g-2 mb-3">
                    <div class="col-6">
                        <label class="form-label fw-bold">Pertemuan Ke-</label>
                        <input type="number" class="form-control" name="pertemuan_ke" value="<?= $pertemuan_ke ?>" min="1" max="36" required>
                    </div>
                    <div class="col-6">
                        <label class="form-label fw-bold">Jam Ke- / Sesi</label>
                        <input type="text" class="form-control" name="jam_ke" placeholder="Contoh: Jam 1 - 3" value="<?= e($today_jurnal['jam_ke'] ?? '') ?>">
                    </div>
                </div>

                <div class="mb-3">
                    <label class="form-label fw-bold">Guru Pengganti (Opsional)</label>
                    <input type="text" class="form-control" name="guru_pengganti" placeholder="Isi nama jika guru piket / pengganti" value="<?= e($today_jurnal['guru_pengganti'] ?? '') ?>">
                </div>

                <div class="mb-3">
                    <label class="form-label fw-bold">TP / ATP / Uraian Materi <span class="text-danger">*</span></label>
                    <textarea class="form-control" name="materi" rows="3" required placeholder="Contoh: Berpikir Komputasional, Dekomposisi Masalah, Tipe Data..."><?= e($today_jurnal['materi'] ?? '') ?></textarea>
                </div>

                <div class="mb-3">
                    <label class="form-label fw-bold">Refleksi KBM / Catatan Pembelajaran</label>
                    <textarea class="form-control" name="refleksi" rows="2" placeholder="Contoh: Tugas membuat poster, Diskusi kelompok, Praktik coding lab..."><?= e($today_jurnal['refleksi'] ?? $today_jurnal['kegiatan'] ?? '') ?></textarea>
                </div>

                <div class="mb-2">
                    <label class="form-label fw-bold">Catatan Tambahan Kelas</label>
                    <textarea class="form-control" name="catatan" rows="1" placeholder="Catatan opsional..."><?= e($today_jurnal['catatan'] ?? '') ?></textarea>
                </div>
            </div>
        </div>

        <!-- Kolom Kanan: Presensi Siswa Terpadu -->
        <div class="col-lg-7">
            <div class="card p-3 h-100 shadow-sm">
                <div class="card-header bg-light mb-3 d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">👥 Presensi Siswa: <?= e($selected_info['nama_kelas'] ?? '') ?></h5>
                    <span class="badge bg-success">Default: Otomatis Hadir</span>
                </div>
                <p class="text-muted small">
                    💡 <em>Siswa yang tidak Anda ubah statusnya akan <strong>otomatis tercatat HADIR</strong>. Cukup pilih <strong>Sakit (S) / Izin (I) / Alpa (A)</strong> untuk siswa yang berhalangan hadir.</em>
                </p>

                <div class="table-responsive" style="max-height: 420px; overflow-y: auto;">
                    <table class="table table-sm table-hover align-middle">
                        <thead class="table-light sticky-top">
                            <tr>
                                <th style="width: 35px;">No</th>
                                <th>NIS & Nama Siswa</th>
                                <th style="width: 45px;" class="text-center">L/P</th>
                                <th style="width: 140px;">Status Kehadiran</th>
                                <th>Keterangan</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php $no = 1; foreach ($students as $s): 
                                $cur_status = $s['status'] ?? 'Hadir';
                            ?>
                            <tr class="<?= in_array($cur_status, ['Sakit', 'Izin', 'Alpa']) ? 'table-warning' : '' ?>" id="row-<?= e($s['nis']) ?>">
                                <td><?= $no++ ?></td>
                                <td>
                                    <strong><?= e($s['nama_siswa']) ?></strong><br>
                                    <small class="text-muted"><?= e($s['nis']) ?></small>
                                </td>
                                <td class="text-center fw-bold"><?= e($s['jenis_kelamin'] ?? '-') ?></td>
                                <td>
                                    <select class="form-select form-select-sm status-select" name="status_custom[<?= e($s['nis']) ?>]" onchange="checkRow(this, 'row-<?= e($s['nis']) ?>')">
                                        <option value="Hadir" <?= $cur_status === 'Hadir' ? 'selected' : '' ?>>Hadir (.)</option>
                                        <option value="Sakit" <?= $cur_status === 'Sakit' ? 'selected' : '' ?>>Sakit (S)</option>
                                        <option value="Izin" <?= $cur_status === 'Izin' ? 'selected' : '' ?>>Izin (I)</option>
                                        <option value="Alpa" <?= $cur_status === 'Alpa' ? 'selected' : '' ?>>Alpa (A)</option>
                                    </select>
                                </td>
                                <td>
                                    <input type="text" class="form-control form-control-sm" name="ket_custom[<?= e($s['nis']) ?>]" value="<?= e($s['keterangan'] ?? '') ?>" placeholder="Keterangan alasan...">
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>

                <div class="mt-3">
                    <button type="submit" class="btn btn-success btn-lg w-100 fw-bold">
                        💾 Simpan Agenda Harian & Presensi Kelas
                    </button>
                </div>
            </div>
        </div>
    </div>
</form>

<script>
function checkRow(sel, rowId) {
    const row = document.getElementById(rowId);
    if (sel.value !== 'Hadir') {
        row.classList.add('table-warning');
    } else {
        row.classList.remove('table-warning');
    }
}
</script>
<?php endif; ?>

<!-- Tabel Riwayat Agenda Harian Guru Sesuai Format Resmi -->
<div class="card p-3 shadow-sm mt-4">
    <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0">📖 Riwayat Buku Agenda Harian Guru (FM-03/03-04/WKST)</h5>
        <button onclick="window.print()" class="btn btn-sm btn-outline-secondary">🖨️ Cetak Buku Agenda</button>
    </div>
    <div class="table-responsive">
        <table class="table table-bordered table-striped align-middle">
            <thead class="table-dark">
                <tr>
                    <th style="width: 40px;" class="text-center">No</th>
                    <th style="width: 130px;">Hari / Tanggal</th>
                    <th style="width: 80px;" class="text-center">Pertemuan Ke</th>
                    <th>TP / ATP / Uraian Materi</th>
                    <th>Absensi Siswa (S / I / A)</th>
                    <th>Refleksi KBM / Catatan</th>
                </tr>
            </thead>
            <tbody>
                <?php if (empty($recent_journals)): ?>
                    <tr><td colspan="6" class="text-center text-muted py-4">Belum ada agenda harian yang diisi.</td></tr>
                <?php else: ?>
                    <?php $no = 1; foreach ($recent_journals as $rj): 
                        // Ambil rekap absen pertemuan ini
                        $q = $pdo->prepare("SELECT s.nama_siswa, a.status, a.keterangan FROM absensi a JOIN siswa s ON s.nis=a.nis WHERE a.id_jadwal=? AND a.tanggal=? AND a.status IN ('Sakit','Izin','Alpa')");
                        $q->execute([$rj['id_jadwal'], $rj['tanggal']]);
                        $abs_unhadir = $q->fetchAll();
                    ?>
                    <tr>
                        <td class="text-center"><?= $no++ ?></td>
                        <td>
                            <strong><?= e(date('d/m/Y', strtotime($rj['tanggal']))) ?></strong><br>
                            <span class="badge bg-secondary"><?= e($rj['nama_kelas']) ?></span><br>
                            <small class="text-muted"><?= e($rj['nama_mapel']) ?></small>
                        </td>
                        <td class="text-center fs-5 fw-bold"><?= e($rj['pertemuan_ke'] ?: '-') ?></td>
                        <td>
                            <strong><?= nl2br(e($rj['materi'])) ?></strong>
                            <?php if ($rj['jam_ke']): ?>
                                <br><small class="text-primary"><i class="bi bi-clock"></i> <?= e($rj['jam_ke']) ?></small>
                            <?php endif; ?>
                            <?php if ($rj['guru_pengganti']): ?>
                                <br><small class="text-info"><i class="bi bi-person"></i> Pengganti: <?= e($rj['guru_pengganti']) ?></small>
                            <?php endif; ?>
                        </td>
                        <td>
                            <?php if (empty($abs_unhadir)): ?>
                                <span class="badge bg-success">Hadir Semua (Nihil)</span>
                            <?php else: ?>
                                <ul class="mb-0 ps-3 small">
                                    <?php foreach ($abs_unhadir as $au): 
                                        $cls = ['Sakit'=>'warning','Izin'=>'info','Alpa'=>'danger'][$au['status']] ?? 'secondary';
                                    ?>
                                        <li>
                                            <?= e($au['nama_siswa']) ?> - <span class="badge bg-<?= $cls ?>"><?= $au['status'] ?></span>
                                            <?= $au['keterangan'] ? '('.e($au['keterangan']).')' : '' ?>
                                        </li>
                                    <?php endforeach; ?>
                                </ul>
                            <?php endif; ?>
                        </td>
                        <td>
                            <?= nl2br(e($rj['refleksi'] ?: $rj['kegiatan'] ?: $rj['catatan'] ?: '-')) ?>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<?php require '../includes/footer.php'; ?>
