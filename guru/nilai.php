<?php
require_once '../config/academic_service.php';
require_role('guru');
$pdo = db();
$gid = (int)user_reference();
$error = '';
$success = '';

// Ambil penugasan mengajar guru
$q = $pdo->prepare('SELECT DISTINCT j.id_kelas, k.nama_kelas, j.id_mapel, mp.nama_mapel, mp.kkm
                    FROM jadwal j
                    JOIN kelas k ON k.id_kelas=j.id_kelas
                    JOIN mata_pelajaran mp ON mp.id_mapel=j.id_mapel
                    WHERE j.id_guru=? AND j.status="aktif" AND k.status="aktif" AND mp.status="aktif"
                    ORDER BY k.nama_kelas, mp.nama_mapel');
$q->execute([$gid]);
$assignments = $q->fetchAll();

if($_SERVER['REQUEST_METHOD']==='POST'){
    verify_csrf();try{
        $action=input_choice($_POST,'action',['save_bobot','save_nilai']);
        if($action==='save_bobot')save_weights($_POST);else save_teacher_grade($_POST);
        flash('success','Data penilaian berhasil disimpan.');redirect('nilai.php');
    }catch(Throwable $errorInput){$error=operation_error($errorInput);}
}

// Data siswa per kelas penugasan
$students = [];
$bobot_map = [];
foreach ($assignments as $a) {
    $q = $pdo->prepare('SELECT nis, nama_siswa FROM siswa WHERE id_kelas=? AND status="aktif" ORDER BY nama_siswa');
    $q->execute([$a['id_kelas']]);
    $students[$a['id_kelas']] = $q->fetchAll();

    $bobot_map[$a['id_mapel'].'_'.$a['id_kelas']] = get_bobot_penilaian($gid, (int)$a['id_mapel'], (int)$a['id_kelas']);
}

// Ambil daftar nilai yang pernah diinput oleh guru ini
$q = $pdo->prepare('SELECT n.*, s.nama_siswa, k.nama_kelas, mp.nama_mapel, mp.kkm, ta.tahun_ajaran, ta.semester
                    FROM nilai n
                    JOIN siswa s ON s.nis=n.nis
                    JOIN kelas k ON k.id_kelas=s.id_kelas
                    JOIN mata_pelajaran mp ON mp.id_mapel=n.id_mapel
                    JOIN tahun_ajaran ta ON ta.id_tahun_ajaran=n.id_tahun_ajaran
                    WHERE n.id_guru=? AND k.status="aktif" AND mp.status="aktif" AND EXISTS(SELECT 1 FROM jadwal scope WHERE scope.id_guru=n.id_guru AND scope.id_kelas=s.id_kelas AND scope.id_mapel=n.id_mapel AND scope.status="aktif" AND scope.id_tahun_ajaran=n.id_tahun_ajaran)
                    ORDER BY ta.status DESC, k.nama_kelas, s.nama_siswa');
$q->execute([$gid]);
$existing_grades = $q->fetchAll();

$page_title = 'Input & Kelola Nilai';
require '../includes/header.php';
require '../includes/sidebar.php';
require '../includes/flash.php';
?>

<div class="d-flex justify-content-between align-items-center mb-3">
    <h2>Input & Kelola Nilai Siswa</h2>
    <button class="btn btn-outline-primary" data-bs-toggle="modal" data-bs-target="#modalBobot">
        <i class="bi bi-sliders"></i> Atur Bobot Persentase Penilaian
    </button>
</div>

<?php if ($error): ?>
    <div class="alert alert-danger"><?= e($error) ?></div>
<?php endif; ?>

<!-- Nav Tabs -->
<ul class="nav nav-tabs mb-4" id="nilaiTab" role="tablist">
    <li class="nav-item">
        <button class="nav-link active" id="input-tab" data-bs-toggle="tab" data-bs-target="#input-pane" type="button">
            <i class="bi bi-pencil-square"></i> Form Input / Edit Nilai
        </button>
    </li>
    <li class="nav-item">
        <button class="nav-link" id="list-tab" data-bs-toggle="tab" data-bs-target="#list-pane" type="button">
            <i class="bi bi-table"></i> Daftar Nilai Tersimpan (<?= count($existing_grades) ?> Siswa)
        </button>
    </li>
</ul>

<div class="tab-content" id="nilaiTabContent">
    <!-- TAB 1: FORM INPUT NILAI -->
    <div class="tab-pane fade show active" id="input-pane" role="tabpanel">
        <div class="row">
            <div class="col-lg-8">
                <div class="card p-4 shadow-sm mb-4">
                    <h5 class="card-title mb-3">Formulir Penilaian Siswa</h5>
                    <form method="post" id="formNilai" class="row g-3">
                        <?= csrf_field() ?>
                        <input type="hidden" name="action" value="save_nilai">

                        <div class="col-md-6">
                            <label class="form-label fw-bold">Kelas & Mata Pelajaran</label>
                            <select class="form-select" id="assignment" required>
                                <option value="">-- Pilih Penugasan --</option>
                                <?php foreach ($assignments as $a): ?>
                                    <option value="<?= e($a['id_kelas'].'|'.$a['id_mapel'].'|'.$a['kkm']) ?>">
                                        <?= e($a['nama_kelas'].' · '.$a['nama_mapel'].' (KKM: '.$a['kkm'].')') ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                            <input type="hidden" name="id_kelas" id="id_kelas">
                            <input type="hidden" name="id_mapel" id="id_mapel">
                        </div>

                        <div class="col-md-6">
                            <label class="form-label fw-bold">Pilih Siswa</label>
                            <select class="form-select" name="nis" id="student" required disabled>
                                <option>Pilih penugasan kelas terlebih dahulu</option>
                            </select>
                        </div>

                        <!-- Info Bobot Aktif -->
                        <div class="col-12" id="bobotInfoBox" style="display:none;">
                            <div class="alert alert-info py-2 mb-0 small d-flex justify-content-between align-items-center">
                                <div>
                                    <strong>Formula Bobot Aktif:</strong>
                                    Tugas <span id="b_tugas_badge" class="badge bg-primary">30%</span> +
                                    UTS <span id="b_uts_badge" class="badge bg-primary">30%</span> +
                                    UAS <span id="b_uas_badge" class="badge bg-primary">40%</span>
                                    <span id="extra_badge_wrapper" style="display:none;"> + <span id="b_extra_name">Praktik</span> <span id="b_extra_badge" class="badge bg-secondary">0%</span></span>
                                </div>
                                <span class="badge bg-success">Total 100%</span>
                            </div>
                        </div>

                        <!-- Input Nilai Komponen -->
                        <div class="col-md-4">
                            <label class="form-label">Nilai Tugas (0-100)</label>
                            <input class="form-control calc-trigger" type="number" id="inp_tugas" name="nilai_tugas" min="0" max="100" step="0.01" value="80" required>
                        </div>

                        <div class="col-md-4">
                            <label class="form-label">Nilai UTS (0-100)</label>
                            <input class="form-control calc-trigger" type="number" id="inp_uts" name="nilai_uts" min="0" max="100" step="0.01" value="80" required>
                        </div>

                        <div class="col-md-4">
                            <label class="form-label">Nilai UAS (0-100)</label>
                            <input class="form-control calc-trigger" type="number" id="inp_uas" name="nilai_uas" min="0" max="100" step="0.01" value="80" required>
                        </div>

                        <div class="col-md-6" id="wrapper_praktik">
                            <label class="form-label" id="lbl_praktik">Nilai Praktik / Proyek (Opsional)</label>
                            <input class="form-control calc-trigger" type="number" id="inp_praktik" name="nilai_praktik" min="0" max="100" step="0.01" value="0">
                        </div>

                        <div class="col-md-6" id="wrapper_ekstra">
                            <label class="form-label" id="lbl_ekstra">Nilai Komponen Tambahan (Opsional)</label>
                            <input class="form-control calc-trigger" type="number" id="inp_ekstra" name="nilai_ekstra" min="0" max="100" step="0.01" value="0">
                        </div>

                        <div class="col-12 mt-4">
                            <button type="submit" class="btn btn-primary btn-lg w-100 fw-bold">
                                💾 Simpan Nilai Siswa
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Preview Live Kalkulasi -->
            <div class="col-lg-4">
                <div class="card p-4 shadow-sm bg-light border-primary mb-4">
                    <h5 class="card-title text-primary"><i class="bi bi-calculator"></i> Live Preview Hasil</h5>
                    <hr>
                    <div class="mb-3">
                        <small class="text-muted d-block">Estimasi Nilai Akhir:</small>
                        <h2 class="display-5 fw-bold text-dark mb-0" id="previewNilaiAkhir">80.00</h2>
                    </div>
                    <div class="mb-3">
                        <small class="text-muted d-block">Predikat Rapor & KKM:</small>
                        <h4 id="previewPredikat" class="mb-1"><span class="badge bg-primary fs-5">B</span></h4>
                        <small id="previewKet" class="text-muted">Baik (Tuntas KKM)</small>
                    </div>
                    <div class="alert alert-warning small mb-0">
                        <strong>Catatan:</strong> Predikat dihitung secara dinamis berbasis KKM mata pelajaran (Rentang Interval = (100 - KKM) / 3).
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- TAB 2: DAFTAR NILAI TERSIMPAN -->
    <div class="tab-pane fade" id="list-pane" role="tabpanel">
        <div class="card p-3 shadow-sm">
            <h5 class="card-title mb-3">Rekap Nilai Siswa Binaan Anda</h5>
            <div class="table-responsive">
                <table class="table table-hover table-bordered align-middle">
                    <thead class="table-dark">
                        <tr>
                            <th>No</th>
                            <th>Siswa</th>
                            <th>Kelas</th>
                            <th>Mata Pelajaran</th>
                            <th>Tugas</th>
                            <th>UTS</th>
                            <th>UAS</th>
                            <th>Praktik</th>
                            <th>Nilai Akhir</th>
                            <th>KKM</th>
                            <th>Predikat</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($existing_grades)): ?>
                            <tr><td colspan="12" class="text-center text-muted py-4">Belum ada nilai yang diinput.</td></tr>
                        <?php else: ?>
                            <?php $no = 1; foreach ($existing_grades as $eg):
                                $pred = hitung_predikat_kkm((float)$eg['nilai_akhir'], (float)$eg['kkm']);
                            ?>
                            <tr>
                                <td><?= $no++ ?></td>
                                <td>
                                    <strong><?= e($eg['nama_siswa']) ?></strong><br>
                                    <small class="text-muted"><?= e($eg['nis']) ?></small>
                                </td>
                                <td><span class="badge bg-secondary"><?= e($eg['nama_kelas']) ?></span></td>
                                <td><?= e($eg['nama_mapel']) ?></td>
                                <td class="text-center"><?= e($eg['nilai_tugas']) ?></td>
                                <td class="text-center"><?= e($eg['nilai_uts']) ?></td>
                                <td class="text-center"><?= e($eg['nilai_uas']) ?></td>
                                <td class="text-center"><?= e($eg['nilai_praktik'] ?? '0.00') ?></td>
                                <td class="text-center fw-bold fs-6"><?= e($eg['nilai_akhir']) ?></td>
                                <td class="text-center"><?= e($eg['kkm']) ?></td>
                                <td class="text-center"><span class="badge bg-<?= $pred['badge'] ?>"><?= $pred['predikat'] ?></span></td>
                                <td><span class="badge bg-<?= $pred['badge'] ?>"><?= $pred['status'] ?></span></td>
                            </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<!-- MODAL ATUR BOBOT PENILAIAN -->
<div class="modal fade" id="modalBobot" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <form method="post" action="nilai.php">
                <?= csrf_field() ?>
                <input type="hidden" name="action" value="save_bobot">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title"><i class="bi bi-sliders"></i> Atur Bobot Persentase Penilaian</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p class="text-muted small">
                        Tentukan persentase bobot tiap komponen nilai untuk mata pelajaran yang Anda ampu.
                        <strong>Total bobot harus tepat 100%</strong>.
                    </p>

                    <div class="mb-3">
                        <label class="form-label fw-bold">Mata Pelajaran</label>
                        <select class="form-select" name="id_mapel" id="modal_id_mapel" required>
                            <option value="">-- Pilih Mata Pelajaran --</option>
                            <?php
                            $seen_mapel = [];
                            foreach ($assignments as $a):
                                if (in_array($a['id_mapel'], $seen_mapel)) continue;
                                $seen_mapel[] = $a['id_mapel'];
                            ?>
                                <option value="<?= $a['id_mapel'] ?>"><?= e($a['nama_mapel']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>

                    <div class="row g-3 mb-3">
                        <div class="col-md-4">
                            <label class="form-label">Bobot Tugas (%)</label>
                            <input class="form-control bobot-calc" type="number" id="m_bobot_tugas" name="bobot_tugas" min="0" max="100" step="1" value="30" required>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Bobot UTS (%)</label>
                            <input class="form-control bobot-calc" type="number" id="m_bobot_uts" name="bobot_uts" min="0" max="100" step="1" value="30" required>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Bobot UAS (%)</label>
                            <input class="form-control bobot-calc" type="number" id="m_bobot_uas" name="bobot_uas" min="0" max="100" step="1" value="40" required>
                        </div>
                    </div>

                    <div class="row g-3 mb-3">
                        <div class="col-md-6">
                            <label class="form-label">Bobot Praktik / Proyek (%)</label>
                            <input class="form-control bobot-calc" type="number" id="m_bobot_praktik" name="bobot_praktik" min="0" max="100" step="1" value="0">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Nama Komponen Tambahan (Opsional)</label>
                            <input class="form-control" type="text" name="nama_ekstra" value="Praktik/Proyek" placeholder="Contoh: Kuis / Portofolio">
                        </div>
                    </div>

                    <div class="alert alert-secondary d-flex justify-content-between align-items-center mb-0">
                        <span>Total Persentase:</span>
                        <h4 class="mb-0 fw-bold" id="totalBobotText">100%</h4>
                    </div>
                    <div id="bobotWarning" class="text-danger small mt-2" style="display:none;">
                        ⚠️ Total bobot belum mencapai 100%. Silakan sesuaikan angka.
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                    <button type="submit" id="btnSaveBobot" class="btn btn-primary">Simpan Pengaturan Bobot</button>
                </div>
            </form>
        </div>
    </div>
</div>

<script>
const studentData = <?= json_encode($students, JSON_HEX_TAG|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_HEX_AMP) ?>;
const bobotData = <?= json_encode($bobot_map, JSON_HEX_TAG|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_HEX_AMP) ?>;
let curKKM = 75;
let curBobot = { bobot_tugas: 30, bobot_uts: 30, bobot_uas: 40, bobot_praktik: 0, bobot_ekstra: 0 };

document.getElementById('assignment').addEventListener('change', function() {
    const val = this.value;
    const studentSelect = document.getElementById('student');
    const bobotBox = document.getElementById('bobotInfoBox');

    if (!val) {
        studentSelect.innerHTML = '<option>Pilih penugasan kelas terlebih dahulu</option>';
        studentSelect.disabled = true;
        bobotBox.style.display = 'none';
        return;
    }

    const parts = val.split('|');
    const idKelas = parts[0];
    const idMapel = parts[1];
    curKKM = parseFloat(parts[2]) || 75;

    document.getElementById('id_kelas').value = idKelas;
    document.getElementById('id_mapel').value = idMapel;

    // Muat daftar siswa
    studentSelect.innerHTML = '<option value="">-- Pilih Siswa --</option>';
    (studentData[idKelas] || []).forEach(st => {
        studentSelect.add(new Option(st.nama_siswa + ' (' + st.nis + ')', st.nis));
    });
    studentSelect.disabled = false;

    // Ambil bobot untuk kombinasi ini
    const key = idMapel + '_' + idKelas;
    curBobot = bobotData[key] || { bobot_tugas: 30, bobot_uts: 30, bobot_uas: 40, bobot_praktik: 0, bobot_ekstra: 0 };

    document.getElementById('b_tugas_badge').textContent = curBobot.bobot_tugas + '%';
    document.getElementById('b_uts_badge').textContent = curBobot.bobot_uts + '%';
    document.getElementById('b_uas_badge').textContent = curBobot.bobot_uas + '%';

    if (curBobot.bobot_praktik > 0) {
        document.getElementById('extra_badge_wrapper').style.display = 'inline';
        document.getElementById('b_extra_name').textContent = curBobot.nama_ekstra || 'Praktik';
        document.getElementById('b_extra_badge').textContent = curBobot.bobot_praktik + '%';
    } else {
        document.getElementById('extra_badge_wrapper').style.display = 'none';
    }

    bobotBox.style.display = 'block';
    recalculateLive();
});

document.querySelectorAll('.calc-trigger').forEach(inp => {
    inp.addEventListener('input', recalculateLive);
});

function recalculateLive() {
    const tugas = parseFloat(document.getElementById('inp_tugas').value) || 0;
    const uts = parseFloat(document.getElementById('inp_uts').value) || 0;
    const uas = parseFloat(document.getElementById('inp_uas').value) || 0;
    const praktik = parseFloat(document.getElementById('inp_praktik').value) || 0;
    const ekstra = parseFloat(document.getElementById('inp_ekstra').value) || 0;

    const bTugas = curBobot.bobot_tugas ?? 30;
    const bUts = curBobot.bobot_uts ?? 30;
    const bUas = curBobot.bobot_uas ?? 40;
    const bPraktik = curBobot.bobot_praktik || 0;
    const bEkstra = curBobot.bobot_ekstra || 0;

    let totBobot = bTugas + bUts + bUas + bPraktik + bEkstra;
    if (totBobot <= 0) totBobot = 100;

    const akhir = ((tugas * bTugas) + (uts * bUts) + (uas * bUas) + (praktik * bPraktik) + (ekstra * bEkstra)) / totBobot;
    const finalScore = akhir.toFixed(2);

    document.getElementById('previewNilaiAkhir').textContent = finalScore;

    // Hitung predikat dinamis KKM
    const interval = (100 - curKKM) / 3;
    const bMin = curKKM + interval;
    const aMin = curKKM + (2 * interval);

    let pred = 'D', ket = 'Kurang / Perlu Remedial', badge = 'danger';
    if (akhir >= aMin) {
        pred = 'A'; ket = 'Sangat Baik (Tuntas KKM)'; badge = 'success';
    } else if (akhir >= bMin) {
        pred = 'B'; ket = 'Baik (Tuntas KKM)'; badge = 'primary';
    } else if (akhir >= curKKM) {
        pred = 'C'; ket = 'Cukup (Tuntas KKM)'; badge = 'info';
    }

    document.getElementById('previewPredikat').innerHTML = `<span class="badge bg-${badge} fs-5">${pred}</span>`;
    document.getElementById('previewKet').textContent = ket + ` (KKM: ${curKKM})`;
}

// Modal bobot kalkulator live
document.querySelectorAll('.bobot-calc').forEach(inp => {
    inp.addEventListener('input', checkModalBobot);
});

function checkModalBobot() {
    const t = parseFloat(document.getElementById('m_bobot_tugas').value) || 0;
    const u = parseFloat(document.getElementById('m_bobot_uts').value) || 0;
    const a = parseFloat(document.getElementById('m_bobot_uas').value) || 0;
    const p = parseFloat(document.getElementById('m_bobot_praktik').value) || 0;

    const tot = t + u + a + p;
    const totText = document.getElementById('totalBobotText');
    const warning = document.getElementById('bobotWarning');
    const btn = document.getElementById('btnSaveBobot');

    totText.textContent = tot + '%';
    if (Math.abs(tot - 100) < 0.01) {
        totText.className = 'mb-0 fw-bold text-success';
        warning.style.display = 'none';
        btn.disabled = false;
    } else {
        totText.className = 'mb-0 fw-bold text-danger';
        warning.style.display = 'block';
        btn.disabled = true;
    }
}
</script>

<?php require '../includes/footer.php'; ?>
