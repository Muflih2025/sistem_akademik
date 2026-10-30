<?php
require_once '../config/auth.php';
require_role('guru');
$pdo = db();
$gid = (int)user_reference();

// Ambil jadwal guru
$q = $pdo->prepare('SELECT j.id_jadwal, j.id_kelas, k.nama_kelas, k.tingkat, jr.nama_jurusan, mp.nama_mapel
                    FROM jadwal j
                    JOIN kelas k ON k.id_kelas = j.id_kelas
                    LEFT JOIN jurusan jr ON jr.id_jurusan = k.id_jurusan
                    JOIN mata_pelajaran mp ON mp.id_mapel = j.id_mapel
                    WHERE j.id_guru = ? AND j.status="aktif" AND k.status="aktif" AND mp.status="aktif"
                    ORDER BY k.nama_kelas');
$q->execute([$gid]);
$schedules = $q->fetchAll();

$selected_jadwal=($_GET['id_jadwal']??'')!==''?input_id($_GET,'id_jadwal'):(int)($schedules[0]['id_jadwal']??0);if($selected_jadwal)own_schedule($selected_jadwal);
$start_date=input_date($_GET+['start_date'=>date('Y-m-d',strtotime('-60 days'))],'start_date');
$end_date=input_date($_GET+['end_date'=>date('Y-m-d')],'end_date');if($start_date>$end_date)throw new InputError('Rentang tanggal tidak valid.');

// Ambil tahun ajaran aktif
$ta_aktif = $pdo->query("SELECT * FROM tahun_ajaran WHERE status='Aktif' LIMIT 1")->fetch() ?: ['tahun_ajaran'=>'2025/2026', 'semester'=>'Ganjil'];

$jadwal_info = null;
$students = [];
$attendance_summary = [];
$absent_leaderboard = [];
$dates = [];
$grid = [];
$stats = [];

if ($selected_jadwal) {
    $q = $pdo->prepare('SELECT j.*, k.nama_kelas, k.tingkat, jr.nama_jurusan, mp.nama_mapel
                        FROM jadwal j
                        JOIN kelas k ON k.id_kelas = j.id_kelas
                        LEFT JOIN jurusan jr ON jr.id_jurusan = k.id_jurusan
                        JOIN mata_pelajaran mp ON mp.id_mapel = j.id_mapel
                        WHERE j.id_jadwal = ? AND j.id_guru = ?');
    $q->execute([$selected_jadwal, $gid]);
    $jadwal_info = $q->fetch();

    if ($jadwal_info) {
        // Ambil daftar siswa kelas
        $q = $pdo->prepare('SELECT nis, nama_siswa, jenis_kelamin FROM siswa WHERE id_kelas = ? ORDER BY nama_siswa');
        $q->execute([$jadwal_info['id_kelas']]);
        $students = $q->fetchAll();

        // Ambil riwayat absen pada rentang tanggal
        $q = $pdo->prepare('SELECT a.tanggal, a.nis, a.status, a.keterangan
                            FROM absensi a
                            WHERE a.id_jadwal = ? AND a.tanggal BETWEEN ? AND ?
                            ORDER BY a.tanggal ASC');
        $q->execute([$selected_jadwal, $start_date, $end_date]);
        $raw_absen = $q->fetchAll();

        foreach ($students as $st) {
            $stats[$st['nis']] = ['Hadir' => 0, 'Sakit' => 0, 'Izin' => 0, 'Alpa' => 0, 'Total_Tidak_Masuk' => 0];
        }

        foreach ($raw_absen as $ra) {
            if (!in_array($ra['tanggal'], $dates)) {
                $dates[] = $ra['tanggal'];
            }
            $grid[$ra['nis']][$ra['tanggal']] = $ra['status'];
            if (isset($stats[$ra['nis']])) {
                $status = $ra['status'];
                if (isset($stats[$ra['nis']][$status])) {
                    $stats[$ra['nis']][$status]++;
                }
                if (in_array($status, ['Sakit', 'Izin', 'Alpa'])) {
                    $stats[$ra['nis']]['Total_Tidak_Masuk']++;
                }
            }
        }

        // Leaderboard siswa yang memiliki catatan tidak masuk
        foreach ($students as $st) {
            $nis = $st['nis'];
            if (($stats[$nis]['Total_Tidak_Masuk'] ?? 0) > 0) {
                $absent_leaderboard[] = [
                    'nis' => $nis,
                    'nama_siswa' => $st['nama_siswa'],
                    'jenis_kelamin' => $st['jenis_kelamin'] ?? '-',
                    'sakit' => $stats[$nis]['Sakit'],
                    'izin' => $stats[$nis]['Izin'],
                    'alpa' => $stats[$nis]['Alpa'],
                    'total_tidak_masuk' => $stats[$nis]['Total_Tidak_Masuk'],
                    'hadir' => $stats[$nis]['Hadir']
                ];
            }
        }

        usort($absent_leaderboard, function($a, $b) {
            return $b['total_tidak_masuk'] <=> $a['total_tidak_masuk'];
        });
    }
}

// Export CSV jika diminta
if (isset($_GET['export']) && $_GET['export'] === 'csv' && $jadwal_info) {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="Daftar_Hadir_' . preg_replace('/[^a-zA-Z0-9]/', '_', $jadwal_info['nama_kelas']) . '_' . $start_date . '.csv"');
    $output = fopen('php://output', 'w');
    // Tambahkan UTF-8 BOM agar Excel di Windows membuka kolom dan karakter secara rapi
    fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
    fputcsv($output, ['DAFTAR HADIR SISWA - SMKN 2 MAGELANG']);
    fputcsv($output, ['No Dokumen: FM-03/03-02/WKST']);
    fputcsv($output, ['Kelas', $jadwal_info['nama_kelas'], 'Program Keahlian', $jadwal_info['nama_jurusan']]);
    fputcsv($output, ['Mata Pelajaran', $jadwal_info['nama_mapel'], 'Tahun Ajaran', $ta_aktif['tahun_ajaran'] . ' (' . $ta_aktif['semester'] . ')']);
    fputcsv($output, []);

    $header = ['No', 'NIS', 'Nama Siswa', 'L/P'];
    foreach ($dates as $idx => $d) {
        $header[] = 'P' . ($idx + 1) . ' (' . date('d/m', strtotime($d)) . ')';
    }
    $header = array_merge($header, ['S', 'I', 'A', '% Kehadiran']);
    fputcsv($output, $header);

    $no = 1;
    $total_pertemuan = count($dates) ?: 1;
    foreach ($students as $st) {
        $s = $stats[$st['nis']];
        $pct = round(($s['Hadir'] / $total_pertemuan) * 100);
        $row = [$no++, $st['nis'], $st['nama_siswa'], $st['jenis_kelamin'] ?? '-'];
        foreach ($dates as $d) {
            $row[] = $grid[$st['nis']][$d] ?? '-';
        }
        $row[] = $s['Sakit'];
        $row[] = $s['Izin'];
        $row[] = $s['Alpa'];
        $row[] = $pct . '%';
        fputcsv($output, $row);
    }
    fclose($output);
    exit;
}

$page_title = 'Daftar Hadir Siswa (FM-03/03-02/WKST)';
require '../includes/header.php';
require '../includes/sidebar.php';
require '../includes/flash.php';
?>

<div class="d-flex justify-content-between align-items-center mb-3">
    <div>
        <h2 class="mb-0">Daftar Hadir Siswa</h2>
        <small class="text-muted">Format Resmi SMKN 2 Magelang (No. Dokumen: FM-03/03-02/WKST)</small>
    </div>
    <div>
        <a href="jurnal.php?id_jadwal=<?= $selected_jadwal ?>" class="btn btn-outline-primary">
            <i class="bi bi-journal-bookmark"></i> Buka Agenda Harian Guru
        </a>
        <?php if ($selected_jadwal): ?>
            <a href="?id_jadwal=<?= $selected_jadwal ?>&start_date=<?= e($start_date) ?>&end_date=<?= e($end_date) ?>&export=csv" class="btn btn-success">
                📥 Export CSV
            </a>
            <button onclick="window.print()" class="btn btn-secondary">
                🖨️ Cetak Dokumen
            </button>
        <?php endif; ?>
    </div>
</div>

<div class="card p-3 mb-4 shadow-sm no-print">
    <form method="get" class="row g-2 align-items-end">
        <div class="col-md-5">
            <label class="form-label fw-bold">Pilih Kelas & Mata Pelajaran</label>
            <select class="form-select" name="id_jadwal" required onchange="this.form.submit()">
                <option value="">-- Pilih Jadwal --</option>
                <?php foreach ($schedules as $s): ?>
                    <option value="<?= $s['id_jadwal'] ?>" <?= ($selected_jadwal === (int)$s['id_jadwal']) ? 'selected' : '' ?>>
                        <?= e($s['nama_kelas'] . ' · ' . $s['nama_mapel']) ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="col-md-3">
            <label class="form-label fw-bold">Rentang Dari Tanggal</label>
            <input class="form-control" type="date" name="start_date" value="<?= e($start_date) ?>" required>
        </div>
        <div class="col-md-3">
            <label class="form-label fw-bold">Sampai Tanggal</label>
            <input class="form-control" type="date" name="end_date" value="<?= e($end_date) ?>" required>
        </div>
        <div class="col-md-1">
            <button class="btn btn-primary w-100">Filter</button>
        </div>
    </form>
</div>

<?php if ($jadwal_info): ?>
<div class="card p-4 shadow-sm mb-4">
    <!-- Header Dokumen Resmi FM-03/03-02/WKST -->
    <div class="border-bottom pb-3 mb-3">
        <div class="d-flex justify-content-between align-items-start">
            <div>
                <h4 class="fw-bold mb-1">DAFTAR HADIR SISWA</h4>
                <p class="mb-0 text-muted">SMK NEGERI 2 MAGELANG</p>
            </div>
            <div class="text-end border p-2 rounded bg-light" style="font-size: 0.8rem;">
                <div><strong>No. Dokumen :</strong> FM-03/03-02/WKST</div>
                <div><strong>Tgl. Berlaku :</strong> 25 Februari 2021</div>
                <div><strong>Halaman :</strong> 1 dari 1</div>
            </div>
        </div>
        <div class="row mt-3 text-secondary" style="font-size: 0.95rem;">
            <div class="col-md-6">
                <div><strong>Kelas :</strong> <?= e($jadwal_info['nama_kelas']) ?></div>
                <div><strong>Program Keahlian :</strong> <?= e($jadwal_info['nama_jurusan'] ?: '-') ?></div>
            </div>
            <div class="col-md-6 text-md-end">
                <div><strong>Mata Pelajaran :</strong> <?= e($jadwal_info['nama_mapel']) ?></div>
                <div><strong>Tahun Ajaran :</strong> <?= e($ta_aktif['tahun_ajaran']) ?> (Semester: <?= e($ta_aktif['semester']) ?>)</div>
            </div>
        </div>
    </div>

    <!-- Tabel Matriks Pertemuan Format FM-03/03-02/WKST -->
    <div class="table-responsive">
        <table class="table table-bordered table-sm table-hover align-middle text-nowrap">
            <thead class="table-dark text-center">
                <tr>
                    <th rowspan="2" style="width: 35px;" class="align-middle">No</th>
                    <th rowspan="2" style="width: 90px;" class="align-middle">NIS</th>
                    <th rowspan="2" class="align-middle text-start" style="min-width: 180px;">Nama Siswa</th>
                    <th rowspan="2" style="width: 40px;" class="align-middle">L/P</th>
                    <?php if (!empty($dates)): ?>
                        <th colspan="<?= count($dates) ?>" class="align-middle">Hari / Tgl / Pertemuan</th>
                    <?php else: ?>
                        <th class="align-middle">Pertemuan</th>
                    <?php endif; ?>
                    <th colspan="3" class="align-middle bg-secondary">Jumlah</th>
                    <th rowspan="2" style="width: 65px;" class="align-middle bg-primary">%</th>
                </tr>
                <tr>
                    <?php if (!empty($dates)): ?>
                        <?php foreach ($dates as $idx => $d): ?>
                            <th class="small fw-normal" style="min-width: 35px;" title="<?= e($d) ?>">
                                <strong><?= $idx + 1 ?></strong><br>
                                <span style="font-size: 0.7rem;"><?= date('d/m', strtotime($d)) ?></span>
                            </th>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <th class="small text-muted">-</th>
                    <?php endif; ?>
                    <th style="width: 35px;" class="bg-warning text-dark small fw-bold">S</th>
                    <th style="width: 35px;" class="bg-info text-white small fw-bold">I</th>
                    <th style="width: 35px;" class="bg-danger text-white small fw-bold">A</th>
                </tr>
            </thead>
            <tbody>
                <?php $no = 1; $total_pertemuan = count($dates) ?: 1; foreach ($students as $st):
                    $s = $stats[$st['nis']];
                    $pct = round(($s['Hadir'] / $total_pertemuan) * 100);
                ?>
                <tr>
                    <td class="text-center"><?= $no++ ?></td>
                    <td class="text-center"><?= e($st['nis']) ?></td>
                    <td><strong><?= e($st['nama_siswa']) ?></strong></td>
                    <td class="text-center"><?= e($st['jenis_kelamin'] ?? '-') ?></td>
                    <?php if (!empty($dates)): ?>
                        <?php foreach ($dates as $d):
                            $status = $grid[$st['nis']][$d] ?? '-';
                            $symbol = '•'; $class = 'text-success fw-bold';
                            if ($status === 'Sakit') { $symbol = 'S'; $class = 'badge bg-warning text-dark'; }
                            elseif ($status === 'Izin') { $symbol = 'I'; $class = 'badge bg-info text-white'; }
                            elseif ($status === 'Alpa') { $symbol = 'A'; $class = 'badge bg-danger text-white'; }
                            elseif ($status === '-') { $symbol = '-'; $class = 'text-muted'; }
                        ?>
                            <td class="text-center">
                                <span class="<?= $class ?>"><?= $symbol ?></span>
                            </td>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <td class="text-center text-muted">-</td>
                    <?php endif; ?>
                    <td class="text-center fw-bold text-warning"><?= $s['Sakit'] ?: '-' ?></td>
                    <td class="text-center fw-bold text-info"><?= $s['Izin'] ?: '-' ?></td>
                    <td class="text-center fw-bold text-danger"><?= $s['Alpa'] ?: '-' ?></td>
                    <td class="text-center fw-bold <?= $pct < 75 ? 'text-danger' : 'text-success' ?>"><?= $pct ?>%</td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>

    <!-- Tanda Tangan Format Dokumen -->
    <div class="row mt-4 pt-4 border-top" style="page-break-inside:avoid">
        <div class="col-6 text-center">
            <small class="text-muted">Mengetahui,</small>
            <p class="fw-bold">Kepala Sekolah</p><br><br><br>
            <p class="mb-0">_________________________</p>
            <small>NIP. ....................................</small>
        </div>
        <div class="col-6 text-center">
            <small class="text-muted">Magelang, <?= date('d F Y') ?></small>
            <p class="fw-bold">Guru Mata Pelajaran</p><br><br><br>
            <p class="mb-0">_________________________</p>
            <small>NIP. ....................................</small>
        </div>
    </div>
</div>
<?php endif; ?>

<?php require '../includes/footer.php'; ?>
