<?php
require_once __DIR__.'/../config/auth.php'; require_role('guru');
$pdo = db(); $gid = (int)user_reference();

// Classes this guru teaches
$q = $pdo->prepare('SELECT DISTINCT j.id_kelas, k.nama_kelas, k.tingkat, jr.nama_jurusan
    FROM jadwal j
    JOIN kelas k ON k.id_kelas=j.id_kelas
    LEFT JOIN jurusan jr ON jr.id_jurusan=k.id_jurusan
    WHERE j.id_guru=? AND j.status="aktif" AND k.status="aktif" ORDER BY k.nama_kelas');
$q->execute([$gid]); $kelas_list = $q->fetchAll();

$tahun_list = $pdo->query('SELECT * FROM tahun_ajaran ORDER BY status DESC, tahun_ajaran DESC')->fetchAll();

$sel_kelas = ($_GET['id_kelas']??'')!==''?input_id($_GET,'id_kelas'):0;
$sel_ta = ($_GET['id_tahun_ajaran']??'')!==''?input_id($_GET,'id_tahun_ajaran'):0;
$sel_nis = input_text($_GET,'nis',15,false);

// Auto-select active tahun ajaran
if (!$sel_ta) {
    foreach ($tahun_list as $t) { if ($t['status'] === 'Aktif') { $sel_ta = (int)$t['id_tahun_ajaran']; break; } }
}

$students = []; $rapor_data = null; $kelas_info = null;
if($sel_kelas)teacher_assignment($sel_kelas,null,$sel_ta?:null);
if($sel_nis)teacher_student($sel_nis,$sel_kelas?:null,$sel_ta?:null);

if ($sel_kelas) {
    $q = $pdo->prepare('SELECT s.*, k.nama_kelas, jr.nama_jurusan FROM siswa s JOIN kelas k ON k.id_kelas=s.id_kelas LEFT JOIN jurusan jr ON jr.id_jurusan=k.id_jurusan WHERE s.id_kelas=? ORDER BY s.nama_siswa');
    $q->execute([$sel_kelas]); $students = $q->fetchAll();
    if ($students) $kelas_info = ['nama_kelas'=>$students[0]['nama_kelas'], 'nama_jurusan'=>$students[0]['nama_jurusan']??''];
}

// If a specific student is selected, build rapor
if ($sel_nis && $sel_ta) {
    // Student info
    $q = $pdo->prepare('SELECT s.*, k.nama_kelas, jr.nama_jurusan FROM siswa s JOIN kelas k ON k.id_kelas=s.id_kelas LEFT JOIN jurusan jr ON jr.id_jurusan=k.id_jurusan WHERE s.nis=?');
    $q->execute([$sel_nis]); $siswa = $q->fetch();

    // Tahun ajaran info
    $q = $pdo->prepare('SELECT * FROM tahun_ajaran WHERE id_tahun_ajaran=?');
    $q->execute([$sel_ta]); $ta_info = $q->fetch();

    // Academic grades
    $q = $pdo->prepare('SELECT n.*, mp.nama_mapel, mp.kelompok, mp.kkm FROM nilai n JOIN mata_pelajaran mp ON mp.id_mapel=n.id_mapel WHERE n.nis=? AND n.id_tahun_ajaran=? AND n.id_guru=? AND mp.status="aktif" AND EXISTS(SELECT 1 FROM jadwal j WHERE j.id_guru=? AND j.id_kelas=? AND j.id_mapel=n.id_mapel AND j.status="aktif" AND j.id_tahun_ajaran=n.id_tahun_ajaran) ORDER BY mp.kelompok, mp.nama_mapel');
    $q->execute([$sel_nis,$sel_ta,$gid,$gid,$siswa['id_kelas']]); $grades = $q->fetchAll();

    // Ekskul
    $q = $pdo->prepare('SELECT ne.*, ek.nama_ekskul FROM nilai_ekskul ne JOIN ekstrakurikuler ek ON ek.id_ekskul=ne.id_ekskul WHERE ne.nis=? AND ne.id_tahun_ajaran=? AND ek.id_guru_pembina=?');
    $q->execute([$sel_nis, $sel_ta, $gid]); $ekskul = $q->fetchAll();

    // Attendance
    $q = $pdo->prepare('SELECT a.status,COUNT(*) AS total FROM absensi a JOIN jadwal j ON j.id_jadwal=a.id_jadwal WHERE a.nis=? AND j.id_guru=? AND j.id_tahun_ajaran=? GROUP BY a.status');
    $q->execute([$sel_nis,$gid,$sel_ta]); $abs_raw = $q->fetchAll();
    $attendance = ['Hadir'=>0,'Sakit'=>0,'Izin'=>0,'Alpa'=>0];
    foreach ($abs_raw as $a) { $attendance[$a['status']] = (int)$a['total']; }

    // Ranking
    $q = $pdo->prepare('SELECT n2.nis, AVG(n2.nilai_akhir) as rata2 FROM nilai n2 JOIN siswa s2 ON s2.nis=n2.nis WHERE s2.id_kelas=? AND n2.id_tahun_ajaran=? AND n2.id_guru=? AND EXISTS(SELECT 1 FROM jadwal j JOIN mata_pelajaran permitted ON permitted.id_mapel=j.id_mapel AND permitted.status="aktif" WHERE j.id_guru=? AND j.id_kelas=s2.id_kelas AND j.id_mapel=n2.id_mapel AND j.status="aktif" AND j.id_tahun_ajaran=n2.id_tahun_ajaran) GROUP BY n2.nis ORDER BY rata2 DESC');
    $q->execute([$sel_kelas ?: ($siswa['id_kelas']??0),$sel_ta,$gid,$gid]); $rankings = $q->fetchAll();
    $rank = 0; $total_ranked = count($rankings);
    foreach ($rankings as $i => $rk) { if ($rk['nis'] === $sel_nis) { $rank = $i + 1; break; } }

    $rapor_data = compact('siswa', 'ta_info', 'grades', 'ekskul', 'attendance', 'rank', 'total_ranked');
}

function predikat(float $n): string { return $n >= 90 ? 'A' : ($n >= 80 ? 'B' : ($n >= 70 ? 'C' : 'D')); }

$page_title = 'Rapor Kelas';
require __DIR__.'/../includes/header.php'; require __DIR__.'/../includes/sidebar.php'; require __DIR__.'/../includes/flash.php';
?>

<div class="no-print">
<h2>Rapor Kelas</h2><p>Rekap terbatas sesuai penugasan dan kepemilikan nilai Anda. Penerbitan rapor resmi dilakukan melalui proses sekolah.</p>

<div class="card p-3 mb-4">
    <form method="get" class="row g-2 align-items-end">
        <div class="col-md-4">
            <label class="form-label">Kelas</label>
            <select class="form-select" name="id_kelas" onchange="this.form.submit()">
                <option value="">Pilih Kelas</option>
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

<?php if ($sel_kelas && $students): ?>
<div class="card p-3 mb-4">
    <h5>Daftar Siswa <?= e($kelas_info['nama_kelas']??'') ?></h5>
    <div class="table-responsive">
        <table class="table table-hover mb-0">
            <thead><tr><th>No</th><th>NIS</th><th>Nama Siswa</th><th>Aksi</th></tr></thead>
            <tbody>
            <?php $no=1; foreach ($students as $s): ?>
            <tr class="<?= $sel_nis===$s['nis']?'table-primary':'' ?>">
                <td><?= $no++ ?></td>
                <td><?= e($s['nis']) ?></td>
                <td><?= e($s['nama_siswa']) ?></td>
                <td><a href="?id_kelas=<?= $sel_kelas ?>&id_tahun_ajaran=<?= $sel_ta ?>&nis=<?= e($s['nis']) ?>" class="btn btn-sm btn-outline-primary">Lihat Rapor</a></td>
            </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>
<?php endif; ?>
</div>

<?php if ($rapor_data): extract($rapor_data); ?>
<div id="rapor-print">
    <div class="card p-4 mb-4">
        <div class="d-flex justify-content-between align-items-start no-print mb-3">
            <h5>Rapor <?= e($siswa['nama_siswa']) ?></h5>
            <button onclick="window.print()" class="btn btn-outline-primary btn-sm">Cetak Rapor</button>
        </div>

        <div class="text-center mb-4" style="border-bottom: 3px double #000; padding-bottom: 1rem;">
            <h4 class="mb-0">LAPORAN HASIL BELAJAR SISWA</h4>
            <h5>SMK NEGERI 2 MAGELANG</h5>
        </div>

        <table class="mb-4" style="width:100%">
            <tr><td width="150">Nama Siswa</td><td width="10">:</td><td class="fw-bold"><?= e($siswa['nama_siswa']) ?></td>
                <td width="150">Kelas</td><td width="10">:</td><td><?= e($siswa['nama_kelas']) ?></td></tr>
            <tr><td>NIS</td><td>:</td><td><?= e($siswa['nis']) ?></td>
                <td>Jurusan</td><td>:</td><td><?= e($siswa['nama_jurusan']??'-') ?></td></tr>
            <tr><td>Tahun Ajaran</td><td>:</td><td><?= e($ta_info['tahun_ajaran']??'') ?></td>
                <td>Semester</td><td>:</td><td><?= e($ta_info['semester']??'') ?></td></tr>
        </table>

        <h6>A. Nilai Akademik</h6>
        <table class="table table-bordered mb-4">
            <thead><tr><th>No</th><th>Mata Pelajaran</th><th>KKM</th><th>Nilai</th><th>Predikat</th><th>Keterangan</th></tr></thead>
            <tbody>
            <?php $no=1; $sum=0; foreach ($grades as $g):
                $na=(float)$g['nilai_akhir'];
                $kkm=(float)($g['kkm'] ?? DEFAULT_KKM);
                $sum+=$na;
                $pred = hitung_predikat_kkm($na, $kkm);
            ?>
            <tr>
                <td><?= $no++ ?></td>
                <td><?= e($g['nama_mapel']) ?></td>
                <td class="text-center"><?= e($g['kkm'] ?? DEFAULT_KKM) ?></td>
                <td class="text-center fw-bold"><?= e($g['nilai_akhir']) ?></td>
                <td class="text-center"><span class="badge bg-<?= $pred['badge'] ?>"><?= $pred['predikat'] ?></span></td>
                <td><span class="badge bg-<?= $pred['badge'] ?>"><?= $pred['status'] ?></span></td>
            </tr>
            <?php endforeach; ?>
            <?php if ($grades): ?>
            <tr class="fw-bold"><td colspan="3" class="text-end">Rata-rata</td><td class="text-center"><?= round($sum/count($grades),2) ?></td><td colspan="2">Peringkat: <?= $rank ?> dari <?= $total_ranked ?></td></tr>
            <?php endif; ?>
            <?php if (!$grades): ?><tr><td colspan="6" class="text-center text-muted">Belum ada nilai.</td></tr><?php endif; ?>
            </tbody>
        </table>

        <h6>B. Ekstrakurikuler</h6>
        <table class="table table-bordered mb-4">
            <thead><tr><th>No</th><th>Kegiatan</th><th>Predikat</th><th>Keterangan</th></tr></thead>
            <tbody>
            <?php if ($ekskul): $no=1; foreach ($ekskul as $ek): ?>
            <tr><td><?= $no++ ?></td><td><?= e($ek['nama_ekskul']) ?></td><td><?= e($ek['predikat']) ?></td><td><?= e($ek['keterangan']??'-') ?></td></tr>
            <?php endforeach; else: ?>
            <tr><td colspan="4" class="text-center text-muted">Belum ada data ekskul.</td></tr>
            <?php endif; ?>
            </tbody>
        </table>

        <h6>C. Kehadiran</h6>
        <table class="table table-bordered mb-4" style="width:auto">
            <tr><td>Hadir</td><td class="fw-bold"><?= $attendance['Hadir'] ?> hari</td></tr>
            <tr><td>Sakit</td><td><?= $attendance['Sakit'] ?> hari</td></tr>
            <tr><td>Izin</td><td><?= $attendance['Izin'] ?> hari</td></tr>
            <tr><td>Alpa</td><td class="text-danger fw-bold"><?= $attendance['Alpa'] ?> hari</td></tr>
        </table>

        <div class="row mt-5" style="page-break-inside:avoid">
            <div class="col-6 text-center">
                <p>Wali Kelas</p><br><br><br>
                <p>_________________________</p>
                <p>NIP. ___________________</p>
            </div>
            <div class="col-6 text-center">
                <p>Kepala Sekolah</p><br><br><br>
                <p>_________________________</p>
                <p>NIP. ___________________</p>
            </div>
        </div>
    </div>
</div>
<?php endif; ?>

<?php require __DIR__.'/../includes/footer.php'; ?>
