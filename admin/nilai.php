<?php
require_once '../config/academic_service.php';
require_role('admin');
$pdo = db();
$error = '';
$success = '';

if($_SERVER['REQUEST_METHOD']==='POST'){
    verify_csrf();try{
        $action=input_choice($_POST,'action',['save_global_bobot','update_nilai']);
        if($action==='save_global_bobot')save_weights($_POST,true);else save_admin_grade($_POST);
        flash('success','Data penilaian berhasil disimpan.');redirect('nilai.php');
    }catch(Throwable $errorInput){$error=operation_error($errorInput);}
}

// Ambil daftar nilai siswa
$rows = $pdo->query('SELECT n.*, s.nama_siswa, k.nama_kelas, mp.id_mapel, mp.nama_mapel, mp.kkm, g.nama_guru, ta.tahun_ajaran, ta.semester
                     FROM nilai n
                     JOIN siswa s ON s.nis=n.nis
                     JOIN kelas k ON k.id_kelas=s.id_kelas
                     JOIN mata_pelajaran mp ON mp.id_mapel=n.id_mapel
                     JOIN guru g ON g.id_guru=n.id_guru
                     JOIN tahun_ajaran ta ON ta.id_tahun_ajaran=n.id_tahun_ajaran
                     ORDER BY n.id_nilai DESC')->fetchAll();

// Daftar mapel untuk modal pengaturan bobot
$mapels = $pdo->query('SELECT * FROM mata_pelajaran ORDER BY nama_mapel')->fetchAll();

$page_title = 'Manajemen Nilai Siswa';
require '../includes/header.php';
require '../includes/sidebar.php';
require '../includes/flash.php';
?>

<div class="d-flex justify-content-between align-items-center mb-3">
    <h2>Manajemen Nilai Siswa (Terpusat)</h2>
    <button class="btn btn-outline-primary" data-bs-toggle="modal" data-bs-target="#modalBobotAdmin">
        <i class="bi bi-sliders"></i> Standar Bobot Kurikulum (Tugas 30%, UTS 30%, UAS 40%)
    </button>
</div>

<?php if ($error): ?>
    <div class="alert alert-danger"><?= e($error) ?></div>
<?php endif; ?>

<div class="card p-3 shadow-sm">
    <div class="table-responsive">
        <table class="table table-hover table-bordered align-middle">
            <thead class="table-dark">
                <tr>
                    <th>No</th>
                    <th>Siswa</th>
                    <th>Kelas</th>
                    <th>Mata Pelajaran</th>
                    <th>Guru Pengampu</th>
                    <th>Tugas</th>
                    <th>UTS</th>
                    <th>UAS</th>
                    <th>Praktik</th>
                    <th>Nilai Akhir</th>
                    <th>KKM</th>
                    <th>Predikat</th>
                    <th>Ketuntasan</th>
                    <th>Aksi</th>
                </tr>
            </thead>
            <tbody>
                <?php if (empty($rows)): ?>
                    <tr><td colspan="14" class="text-center text-muted py-4">Belum ada data nilai tersimpan.</td></tr>
                <?php else: ?>
                    <?php $no = 1; foreach ($rows as $r):
                        $pred = hitung_predikat_kkm((float)$r['nilai_akhir'], (float)$r['kkm']);
                    ?>
                    <tr>
                        <td><?= $no++ ?></td>
                        <td>
                            <strong><?= e($r['nama_siswa']) ?></strong><br>
                            <small class="text-muted"><?= e($r['nis']) ?></small>
                        </td>
                        <td><span class="badge bg-secondary"><?= e($r['nama_kelas']) ?></span></td>
                        <td><?= e($r['nama_mapel']) ?></td>
                        <td><?= e($r['nama_guru']) ?></td>
                        <td class="text-center"><?= e($r['nilai_tugas']) ?></td>
                        <td class="text-center"><?= e($r['nilai_uts']) ?></td>
                        <td class="text-center"><?= e($r['nilai_uas']) ?></td>
                        <td class="text-center"><?= e($r['nilai_praktik'] ?? '0.00') ?></td>
                        <td class="text-center fw-bold fs-6"><?= e($r['nilai_akhir']) ?></td>
                        <td class="text-center"><?= e($r['kkm']) ?></td>
                        <td class="text-center"><span class="badge bg-<?= $pred['badge'] ?>"><?= $pred['predikat'] ?></span></td>
                        <td><span class="badge bg-<?= $pred['badge'] ?>"><?= $pred['status'] ?></span></td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#editModal<?= $r['id_nilai'] ?>">
                                Edit
                            </button>

                            <!-- Modal Edit Nilai -->
                            <div class="modal fade" id="editModal<?= $r['id_nilai'] ?>" tabindex="-1">
                                <div class="modal-dialog">
                                    <div class="modal-content">
                                        <form method="post" action="nilai.php">
                                            <?= csrf_field() ?>
                                            <input type="hidden" name="action" value="update_nilai">
                                            <input type="hidden" name="id_nilai" value="<?= $r['id_nilai'] ?>">
                                            <div class="modal-header bg-primary text-white">
                                                <h5 class="modal-title">Edit Nilai - <?= e($r['nama_siswa']) ?></h5>
                                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                                            </div>
                                            <div class="modal-body">
                                                <div class="mb-2">
                                                    <small class="text-muted">Mata Pelajaran: <strong><?= e($r['nama_mapel']) ?></strong> (KKM: <?= $r['kkm'] ?>)</small>
                                                </div>
                                                <div class="mb-3">
                                                    <label class="form-label">Nilai Tugas</label>
                                                    <input class="form-control" type="number" min="0" max="100" step="0.01" name="nilai_tugas" value="<?= e($r['nilai_tugas']) ?>" required>
                                                </div>
                                                <div class="mb-3">
                                                    <label class="form-label">Nilai UTS</label>
                                                    <input class="form-control" type="number" min="0" max="100" step="0.01" name="nilai_uts" value="<?= e($r['nilai_uts']) ?>" required>
                                                </div>
                                                <div class="mb-3">
                                                    <label class="form-label">Nilai UAS</label>
                                                    <input class="form-control" type="number" min="0" max="100" step="0.01" name="nilai_uas" value="<?= e($r['nilai_uas']) ?>" required>
                                                </div>
                                                <div class="mb-3">
                                                    <label class="form-label">Nilai Praktik / Proyek</label>
                                                    <input class="form-control" type="number" min="0" max="100" step="0.01" name="nilai_praktik" value="<?= e($r['nilai_praktik'] ?? '0.00') ?>">
                                                </div>
                                            </div>
                                            <div class="modal-footer">
                                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                                                <button type="submit" class="btn btn-primary">Simpan Perubahan</button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- Modal Setting Standar Bobot Kurikulum Admin -->
<div class="modal fade" id="modalBobotAdmin" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <form method="post" action="nilai.php">
                <?= csrf_field() ?>
                <input type="hidden" name="action" value="save_global_bobot">
                <div class="modal-header bg-dark text-white">
                    <h5 class="modal-title"><i class="bi bi-sliders"></i> Standar Bobot Penilaian Kurikulum Sekolah</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p class="text-muted small">
                        Atur formula pembobotan standar default untuk semua mata pelajaran atau per mapel.
                        <strong>Total bobot harus tepat 100%</strong> (Default: Tugas 30%, UTS 30%, UAS 40%).
                    </p>

                    <div class="mb-3">
                        <label class="form-label fw-bold">Pilih Mata Pelajaran (Kosongkan jika untuk Standar Global Seluruh Mapel)</label>
                        <select class="form-select" name="id_mapel">
                            <option value="">-- Berlaku untuk Seluruh Mata Pelajaran (Global) --</option>
                            <?php foreach ($mapels as $m): ?>
                                <option value="<?= $m['id_mapel'] ?>"><?= e($m['nama_mapel']) ?> (KKM: <?= $m['kkm'] ?>)</option>
                            <?php endforeach; ?>
                        </select>
                    </div>

                    <div class="row g-3 mb-3">
                        <div class="col-md-4">
                            <label class="form-label">Bobot Tugas (%)</label>
                            <input class="form-control adm-bobot-calc" type="number" id="adm_tugas" name="bobot_tugas" min="0" max="100" step="1" value="30" required>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Bobot UTS (%)</label>
                            <input class="form-control adm-bobot-calc" type="number" id="adm_uts" name="bobot_uts" min="0" max="100" step="1" value="30" required>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Bobot UAS (%)</label>
                            <input class="form-control adm-bobot-calc" type="number" id="adm_uas" name="bobot_uas" min="0" max="100" step="1" value="40" required>
                        </div>
                    </div>

                    <div class="row g-3 mb-3">
                        <div class="col-md-6">
                            <label class="form-label">Bobot Praktik / Proyek (%)</label>
                            <input class="form-control adm-bobot-calc" type="number" id="adm_praktik" name="bobot_praktik" min="0" max="100" step="1" value="0">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Nama Komponen Ekstra</label>
                            <input class="form-control" type="text" name="nama_ekstra" value="Praktik/Proyek">
                        </div>
                    </div>

                    <div class="alert alert-secondary d-flex justify-content-between align-items-center mb-0">
                        <span>Total Persentase:</span>
                        <h4 class="mb-0 fw-bold" id="admTotalBobotText">100%</h4>
                    </div>
                    <div id="admBobotWarning" class="text-danger small mt-2" style="display:none;">
                        ⚠️ Total bobot belum mencapai 100%.
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                    <button type="submit" id="btnAdmSaveBobot" class="btn btn-primary">Simpan Standar Bobot</button>
                </div>
            </form>
        </div>
    </div>
</div>

<script>
document.querySelectorAll('.adm-bobot-calc').forEach(inp => {
    inp.addEventListener('input', checkAdmModalBobot);
});

function checkAdmModalBobot() {
    const t = parseFloat(document.getElementById('adm_tugas').value) || 0;
    const u = parseFloat(document.getElementById('adm_uts').value) || 0;
    const a = parseFloat(document.getElementById('adm_uas').value) || 0;
    const p = parseFloat(document.getElementById('adm_praktik').value) || 0;

    const tot = t + u + a + p;
    const totText = document.getElementById('admTotalBobotText');
    const warning = document.getElementById('admBobotWarning');
    const btn = document.getElementById('btnAdmSaveBobot');

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
