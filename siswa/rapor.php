<?php
require_once __DIR__.'/../config/auth.php'; 
require_role('siswa');
$pdo = db(); 
$nis = user_reference();

// Student info
$q = $pdo->prepare('SELECT s.*, k.nama_kelas, jr.nama_jurusan FROM siswa s JOIN kelas k ON k.id_kelas=s.id_kelas LEFT JOIN jurusan jr ON jr.id_jurusan=k.id_jurusan WHERE s.nis=?');
$q->execute([$nis]); 
$siswa = $q->fetch();

// Grades
$q = $pdo->prepare('SELECT n.*, mp.nama_mapel, mp.kkm, ta.tahun_ajaran, ta.semester, ta.id_tahun_ajaran 
                    FROM nilai n 
                    JOIN mata_pelajaran mp ON mp.id_mapel=n.id_mapel 
                    JOIN tahun_ajaran ta ON ta.id_tahun_ajaran=n.id_tahun_ajaran 
                    WHERE n.nis=? 
                    ORDER BY ta.tahun_ajaran DESC, ta.semester DESC, mp.nama_mapel');
$q->execute([$nis]); 
$grades = $q->fetchAll();

// Ekskul
$q = $pdo->prepare('SELECT ne.*, ek.nama_ekskul, ta.tahun_ajaran, ta.semester 
                    FROM nilai_ekskul ne 
                    JOIN ekstrakurikuler ek ON ek.id_ekskul=ne.id_ekskul 
                    JOIN tahun_ajaran ta ON ta.id_tahun_ajaran=ne.id_tahun_ajaran 
                    WHERE ne.nis=? 
                    ORDER BY ta.tahun_ajaran DESC');
$q->execute([$nis]); 
$ekskul = $q->fetchAll();

// Attendance
$q = $pdo->prepare('SELECT status, COUNT(*) as total FROM absensi WHERE nis=? GROUP BY status');
$q->execute([$nis]); 
$abs_raw = $q->fetchAll();
$att = ['Hadir'=>0, 'Sakit'=>0, 'Izin'=>0, 'Alpa'=>0];
foreach ($abs_raw as $a) {
    $att[$a['status']] = (int)$a['total'];
}

$page_title = 'Rapor Saya - SMKN 2 Magelang';
require __DIR__.'/../includes/header.php'; 
require __DIR__.'/../includes/sidebar.php'; 
require __DIR__.'/../includes/flash.php';
?>

<div class="d-flex justify-content-between align-items-center no-print mb-3">
    <div>
        <h2 class="mb-0">Rapor Capaian Belajar Siswa</h2>
        <small class="text-muted">SMK Negeri 2 Magelang</small>
    </div>
    <button onclick="window.print()" class="btn btn-outline-primary btn-sm">
        <i class="bi bi-printer"></i> Cetak Rapor
    </button>
</div>

<?php if ($siswa): ?>
<div class="card p-3 mb-4 shadow-sm">
    <table style="width:100%" class="align-middle">
        <tr>
            <td width="130" class="text-muted">Nama Peserta Didik</td>
            <td width="10">:</td>
            <td class="fw-bold fs-5"><?= e($siswa['nama_siswa']) ?></td>
            <td width="130" class="text-muted">Kelas</td>
            <td width="10">:</td>
            <td class="fw-bold"><?= e($siswa['nama_kelas']) ?></td>
        </tr>
        <tr>
            <td class="text-muted">NIS</td>
            <td>:</td>
            <td><?= e($siswa['nis']) ?></td>
            <td class="text-muted">Program Keahlian</td>
            <td>:</td>
            <td><?= e($siswa['nama_jurusan'] ?? '-') ?></td>
        </tr>
    </table>
</div>
<?php endif; ?>

<div class="card p-3 mb-4 shadow-sm">
    <div class="d-flex justify-content-between align-items-center mb-2">
        <h5 class="mb-0">A. Nilai Capaian Akademik</h5>
        <small class="text-muted">Predikat dihitung otomatis berbasis KKM</small>
    </div>
    <div class="table-responsive">
        <table class="table table-hover table-bordered align-middle mb-0">
            <thead class="table-dark text-center">
                <tr>
                    <th>Tahun / Semester</th>
                    <th class="text-start">Mata Pelajaran</th>
                    <th>KKM</th>
                    <th>Tugas</th>
                    <th>UTS</th>
                    <th>UAS</th>
                    <th>Praktik</th>
                    <th>Nilai Akhir</th>
                    <th>Predikat</th>
                    <th>Keterangan</th>
                </tr>
            </thead>
            <tbody>
            <?php if ($grades): foreach ($grades as $r): 
                $na = (float)$r['nilai_akhir']; 
                $kkm = (float)($r['kkm'] ?? DEFAULT_KKM);
                $pred = hitung_predikat_kkm($na, $kkm);
            ?>
            <tr>
                <td class="text-center"><span class="badge bg-secondary"><?= e($r['tahun_ajaran'].' · '.$r['semester']) ?></span></td>
                <td><strong><?= e($r['nama_mapel']) ?></strong></td>
                <td class="text-center"><?= e($r['kkm'] ?? DEFAULT_KKM) ?></td>
                <td class="text-center"><?= e($r['nilai_tugas']) ?></td>
                <td class="text-center"><?= e($r['nilai_uts']) ?></td>
                <td class="text-center"><?= e($r['nilai_uas']) ?></td>
                <td class="text-center"><?= e($r['nilai_praktik'] ?? '0.00') ?></td>
                <td class="text-center fw-bold fs-6"><?= e($r['nilai_akhir']) ?></td>
                <td class="text-center"><span class="badge bg-<?= $pred['badge'] ?> fs-6"><?= $pred['predikat'] ?></span></td>
                <td class="text-center"><span class="badge bg-<?= $pred['badge'] ?>"><?= $pred['status'] ?></span></td>
            </tr>
            <?php endforeach; else: ?>
            <tr><td colspan="10" class="text-center text-muted py-4">Belum ada catatan nilai pada periode ini.</td></tr>
            <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<div class="row g-3 mb-4">
    <div class="col-md-7">
        <div class="card p-3 shadow-sm h-100">
            <h5>B. Kegiatan Ekstrakurikuler</h5>
            <?php if ($ekskul): ?>
            <div class="table-responsive">
                <table class="table table-hover table-bordered mb-0 align-middle">
                    <thead class="table-light">
                        <tr>
                            <th>Kegiatan Ekskul</th>
                            <th class="text-center">Predikat</th>
                            <th>Keterangan</th>
                            <th>Periode</th>
                        </tr>
                    </thead>
                    <tbody>
                    <?php foreach ($ekskul as $ek): ?>
                    <tr>
                        <td><strong><?= e($ek['nama_ekskul']) ?></strong></td>
                        <td class="text-center"><span class="badge bg-success"><?= e($ek['predikat']) ?></span></td>
                        <td><?= e($ek['keterangan'] ?? '-') ?></td>
                        <td><?= e($ek['tahun_ajaran'].' · '.$ek['semester']) ?></td>
                    </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
            <?php else: ?>
            <p class="text-muted mb-0">Belum ada keikutsertaan ekstrakurikuler tercatat.</p>
            <?php endif; ?>
        </div>
    </div>
    <div class="col-md-5">
        <div class="card p-3 shadow-sm h-100">
            <h5>C. Rekapitulasi Kehadiran</h5>
            <table class="table table-bordered mb-0">
                <tr>
                    <td>Hadir</td>
                    <td class="fw-bold text-success text-center"><?= $att['Hadir'] ?> Pertemuan</td>
                </tr>
                <tr>
                    <td>Sakit (S)</td>
                    <td class="text-center text-warning fw-bold"><?= $att['Sakit'] ?> Hari</td>
                </tr>
                <tr>
                    <td>Izin (I)</td>
                    <td class="text-center text-info fw-bold"><?= $att['Izin'] ?> Hari</td>
                </tr>
                <tr>
                    <td>Alpa / Tanpa Keterangan (A)</td>
                    <td class="fw-bold text-danger text-center"><?= $att['Alpa'] ?> Hari</td>
                </tr>
            </table>
        </div>
    </div>
</div>

<?php require __DIR__.'/../includes/footer.php'; ?>
