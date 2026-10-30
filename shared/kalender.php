<?php
require_once __DIR__ . '/../config/auth.php';
require_login();if(realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__)deny_access();

$pdo = db();
$role = current_user()['role'];

// Filter bulan dan tahun
$month = isset($_GET['m']) ? (int)$_GET['m'] : (int)date('n');
$year = isset($_GET['y']) ? (int)$_GET['y'] : (int)date('Y');
if ($month < 1) { $month = 12; $year--; }
if ($month > 12) { $month = 1; $year++; }

$first_day_timestamp = mktime(0, 0, 0, $month, 1, $year);
$days_in_month = (int)date('t', $first_day_timestamp);
$month_name_id = [
    1 => 'JANUARI', 2 => 'FEBRUARI', 3 => 'MARET', 4 => 'APRIL',
    5 => 'MEI', 6 => 'JUNI', 7 => 'JULI', 8 => 'AGUSTUS',
    9 => 'SEPTEMBER', 10 => 'OKTOBER', 11 => 'NOVEMBER', 12 => 'DESEMBER'
][$month];

// Ambil event kalender untuk bulan ini
$start_month_date = sprintf('%04d-%02d-01', $year, $month);
$end_month_date = sprintf('%04d-%02d-%02d', $year, $month, $days_in_month);

$stmt = $pdo->prepare("SELECT * FROM kalender_akademik
                      WHERE (tanggal_mulai <= ? AND (tanggal_selesai IS NULL OR tanggal_selesai >= ?))
                      ORDER BY tanggal_mulai ASC");
$stmt->execute([$end_month_date, $start_month_date]);
$events = $stmt->fetchAll();

// Mapping events per date
$events_by_date = [];
foreach ($events as $ev) {
    $cur = strtotime(max($ev['tanggal_mulai'], $start_month_date));
    $last = strtotime(min($ev['tanggal_selesai'] ?: $ev['tanggal_mulai'], $end_month_date));
    while ($cur <= $last) {
        $d_str = date('Y-m-d', $cur);
        $events_by_date[$d_str][] = $ev;
        $cur = strtotime('+1 day', $cur);
    }
}

// Tambah event kalender jika admin / kepsek
if ($_SERVER['REQUEST_METHOD'] === 'POST' && in_array($role, ['admin', 'kepala_sekolah'])) {
    verify_csrf();
    $action = $_POST['action'] ?? '';
    if ($action === 'add_event') {
        $judul = trim($_POST['judul'] ?? '');
        $tgl_mulai = $_POST['tanggal_mulai'] ?? '';
        $tgl_selesai = !empty($_POST['tanggal_selesai']) ? $_POST['tanggal_selesai'] : null;
        $kat = $_POST['kategori'] ?? 'agenda_sekolah';
        $desk = trim($_POST['deskripsi'] ?? '');

        if ($judul && $tgl_mulai) {
            $ins = $pdo->prepare("INSERT INTO kalender_akademik (judul, deskripsi, tanggal_mulai, tanggal_selesai, kategori) VALUES (?, ?, ?, ?, ?)");
            $ins->execute([$judul, $desk, $tgl_mulai, $tgl_selesai, $kat]);
            flash('success', 'Agenda berhasil ditambahkan ke Kalender Akademik.');
            redirect('kalender.php?m=' . $month . '&y=' . $year);
        }
    }
}

$page_title = 'Kalender Akademik SMK Negeri 2 Magelang';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/sidebar.php';
require_once __DIR__ . '/../includes/flash.php';
?>

<div class="calendar-wrapper-dark p-3 rounded" style="background:#09121d; color:#e2e8f0; min-height: 80vh;">
    <div class="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <div>
            <span class="text-secondary small">Dashboard &gt; Kalender Akademik</span>
            <h3 class="fw-bold text-white mb-0 mt-1">KALENDER AKADEMIK SMK NEGERI 2 MAGELANG</h3>
            <p class="text-secondary small mb-0">Jadwal asesmen, workshop industri, rapat pleno dinas, dan hari libur resmi sesuai periode akademik.</p>
        </div>
        <div class="mt-2 mt-md-0">
            <span class="badge border border-warning text-warning px-3 py-2 me-2">KALENDER PENDIDIKAN</span>
            <?php if (in_array($role, ['admin', 'kepala_sekolah'])): ?>
                <button class="btn btn-sm btn-primary" data-bs-toggle="modal" data-bs-target="#modalTambahAgenda">+ Tambah Agenda</button>
            <?php endif; ?>
        </div>
    </div>

    <!-- Calendar Controls -->
    <div class="card bg-dark border-secondary p-3 mb-3" style="background:#0e1a2b !important;">
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div class="d-flex align-items-center gap-2">
                <a href="?m=<?= $month - 1 ?>&y=<?= $year ?>" class="btn btn-sm btn-outline-secondary text-white">&lt;</a>
                <a href="?m=<?= $month + 1 ?>&y=<?= $year ?>" class="btn btn-sm btn-outline-secondary text-white">&gt;</a>
                <h4 class="mb-0 fw-bold text-white ms-2"><?= $month_name_id ?> <?= $year ?> <span class="badge bg-secondary ms-1 fs-6"><?= $year ?></span></h4>
            </div>

            <div class="d-flex align-items-center gap-2 flex-wrap">
                <span class="text-warning small fw-bold">INDIKATOR:</span>
                <span class="small text-white"><span class="badge bg-warning rounded-circle me-1" style="width:10px;height:10px;display:inline-block;"></span> Hari Ini</span>
                <span class="small text-white"><span class="badge bg-primary rounded-circle me-1" style="width:10px;height:10px;display:inline-block;"></span> Agenda Sekolah</span>
                <span class="small text-white"><span class="badge bg-success rounded-circle me-1" style="width:10px;height:10px;display:inline-block;"></span> Jadwal KBM</span>
                <span class="small text-white"><span class="badge bg-danger rounded-circle me-1" style="width:10px;height:10px;display:inline-block;"></span> Libur / Akhir Pekan</span>
                <a href="?m=<?= date('n') ?>&y=<?= date('Y') ?>" class="btn btn-sm btn-warning text-dark fw-bold ms-2">HARI INI</a>
            </div>
        </div>
    </div>

    <!-- Calendar Grid -->
    <div class="calendar-grid">
        <div class="row g-2 text-center text-secondary fw-bold small mb-2">
            <div class="col" style="flex:0 0 14.285%; max-width:14.285%;">SEN</div>
            <div class="col" style="flex:0 0 14.285%; max-width:14.285%;">SEL</div>
            <div class="col" style="flex:0 0 14.285%; max-width:14.285%;">RAB</div>
            <div class="col" style="flex:0 0 14.285%; max-width:14.285%;">KAM</div>
            <div class="col" style="flex:0 0 14.285%; max-width:14.285%;">JUM</div>
            <div class="col text-danger" style="flex:0 0 14.285%; max-width:14.285%;">SAB</div>
            <div class="col text-danger" style="flex:0 0 14.285%; max-width:14.285%;">MIN</div>
        </div>

        <div class="row g-2">
            <?php
            // Start offset (Monday = 1, Sunday = 7)
            $first_day_of_week = (int)date('N', $first_day_timestamp);
            $empty_cells_before = $first_day_of_week - 1;

            for ($i = 0; $i < $empty_cells_before; $i++):
            ?>
                <div class="col" style="flex:0 0 14.285%; max-width:14.285%;">
                    <div class="p-2 rounded border border-dark" style="min-height:90px; background:#070d14; opacity:0.3;"></div>
                </div>
            <?php endfor; ?>

            <?php
            $today_str = date('Y-m-d');
            for ($day = 1; $day <= $days_in_month; $day++):
                $current_date_str = sprintf('%04d-%02d-%02d', $year, $month, $day);
                $day_of_week = (int)date('N', strtotime($current_date_str));
                $is_weekend = ($day_of_week === 6 || $day_of_week === 7);
                $is_today = ($current_date_str === $today_str);
                $day_events = $events_by_date[$current_date_str] ?? [];

                $card_bg = $is_weekend ? '#1b1216' : '#0e1a2b';
                $card_border = $is_today ? 'border: 2px solid #f59e0b !important;' : ($is_weekend ? 'border: 1px solid #381b22;' : 'border: 1px solid #162a45;');
            ?>
                <div class="col" style="flex:0 0 14.285%; max-width:14.285%;">
                    <div class="p-2 rounded position-relative" style="min-height:95px; background:<?= $card_bg ?>; <?= $card_border ?>">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <span class="fw-bold <?= $is_weekend ? 'text-danger' : 'text-white' ?>"><?= $day ?></span>
                            <?php if ($is_today): ?>
                                <span class="badge bg-warning text-dark" style="font-size:0.65rem;">HARI INI</span>
                            <?php elseif ($is_weekend): ?>
                                <span class="badge bg-danger" style="font-size:0.6rem; opacity:0.75;">LIBUR</span>
                            <?php endif; ?>
                        </div>

                        <!-- Events for this day -->
                        <div class="events-list d-flex flex-column gap-1">
                            <?php if (!$is_weekend): ?>
                                <span class="badge bg-success bg-opacity-25 text-success border border-success border-opacity-25 text-start text-truncate" style="font-size:0.68rem;">
                                    2 pelajaran
                                </span>
                            <?php endif; ?>

                            <?php foreach ($day_events as $ev):
                                $badge_class = match($ev['kategori']) {
                                    'agenda_sekolah' => 'bg-primary text-white',
                                    'jadwal_kbm' => 'bg-success text-white',
                                    'libur' => 'bg-danger text-white',
                                    'ujian' => 'bg-warning text-dark fw-bold',
                                    default => 'bg-info text-dark'
                                };
                            ?>
                                <span class="badge <?= $badge_class ?> text-start text-truncate" title="<?= e($ev['judul'] . ' - ' . ($ev['deskripsi'] ?? '')) ?>" style="font-size:0.68rem;">
                                    <?= e($ev['judul']) ?>
                                </span>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </div>
            <?php endfor; ?>
        </div>
    </div>
</div>

<!-- Modal Tambah Agenda -->
<?php if (in_array($role, ['admin', 'kepala_sekolah'])): ?>
<div class="modal fade" id="modalTambahAgenda" tabindex="-1">
    <div class="modal-dialog">
        <form method="post" class="modal-content bg-dark text-white border-secondary">
            <?= csrf_field() ?>
            <input type="hidden" name="action" value="add_event">
            <div class="modal-header border-secondary">
                <h5 class="modal-title">Tambah Agenda Kalender Akademik</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div class="mb-3">
                    <label class="form-label">Nama Agenda / Kegiatan</label>
                    <input type="text" name="judul" class="form-control bg-secondary text-white border-dark" placeholder="Contoh: Tes Kemampuan Akademik (TKA)" required>
                </div>
                <div class="row g-2 mb-3">
                    <div class="col-6">
                        <label class="form-label">Tanggal Mulai</label>
                        <input type="date" name="tanggal_mulai" class="form-control bg-secondary text-white border-dark" required value="<?= date('Y-m-d') ?>">
                    </div>
                    <div class="col-6">
                        <label class="form-label">Tanggal Selesai (Opsional)</label>
                        <input type="date" name="tanggal_selesai" class="form-control bg-secondary text-white border-dark">
                    </div>
                </div>
                <div class="mb-3">
                    <label class="form-label">Kategori</label>
                    <select name="kategori" class="form-select bg-secondary text-white border-dark">
                        <option value="agenda_sekolah">Agenda Sekolah</option>
                        <option value="ujian">Ujian / Asesmen / TKA</option>
                        <option value="jadwal_kbm">Jadwal KBM / Workshop</option>
                        <option value="libur">Libur Resmi</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label class="form-label">Deskripsi / Ruangan / Keterangan</label>
                    <textarea name="deskripsi" class="form-control bg-secondary text-white border-dark" rows="3" placeholder="Contoh: Pelaksanaan di Lab RPL 1 dan Ruang Teori"></textarea>
                </div>
            </div>
            <div class="modal-footer border-secondary">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                <button type="submit" class="btn btn-primary">Simpan Agenda</button>
            </div>
        </form>
    </div>
</div>
<?php endif; ?>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
