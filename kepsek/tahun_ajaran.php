<?php
require_once '../config/auth.php';
require_role('kepala_sekolah');
$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'activate_ta') {
    verify_csrf();
    $id = (int)$_POST['id'];
    $pdo->beginTransaction();
    $pdo->exec("UPDATE tahun_ajaran SET status='Tidak Aktif'");
    $q = $pdo->prepare("UPDATE tahun_ajaran SET status='Aktif' WHERE id_tahun_ajaran=?");
    $q->execute([$id]);
    $pdo->commit();
    flash('success', 'Status Tahun Ajaran berhasil diperbarui dan diaktifkan di seluruh sistem.');
    redirect('tahun_ajaran.php');
}

$rows = $pdo->query('SELECT * FROM tahun_ajaran ORDER BY id_tahun_ajaran DESC')->fetchAll();
$page_title = 'Monitoring & Aktivasi Tahun Ajaran';
require '../includes/header.php';
require '../includes/sidebar.php';
require '../includes/flash.php';
?>

<div class="d-flex justify-content-between align-items-center mb-3">
    <h2>Monitoring & Pengaturan Tahun Ajaran</h2>
    <span class="badge bg-info fs-6">Hak Akses: Kepala Sekolah (Supervisi)</span>
</div>

<div class="card p-3 shadow-sm mb-4">
    <div class="alert alert-warning d-flex align-items-center mb-3">
        <i class="bi bi-exclamation-triangle-fill fs-4 me-3 text-warning"></i>
        <div>
            <strong>Pemberitahuan Wewenang:</strong>
            Mengaktifkan Tahun Ajaran baru akan mengubah periode aktif transaksi KBM, absensi, jurnal mengajar, dan penginputan nilai di seluruh sistem sekolah.
        </div>
    </div>

    <div class="table-responsive">
        <table class="table table-hover table-bordered align-middle">
            <thead class="table-dark">
                <tr>
                    <th style="width: 60px;" class="text-center">No</th>
                    <th>Tahun Ajaran</th>
                    <th>Semester</th>
                    <th class="text-center">Status Periode</th>
                    <th class="text-center" style="width: 200px;">Aksi Pengesahan</th>
                </tr>
            </thead>
            <tbody>
                <?php $no = 1; foreach ($rows as $r): 
                    $isAktif = ($r['status'] === 'Aktif');
                ?>
                <tr class="<?= $isAktif ? 'table-success' : '' ?>">
                    <td class="text-center"><?= $no++ ?></td>
                    <td><strong><?= e($r['tahun_ajaran']) ?></strong></td>
                    <td><?= e($r['semester']) ?></td>
                    <td class="text-center">
                        <?php if ($isAktif): ?>
                            <span class="badge bg-success fs-6"><i class="bi bi-check-circle"></i> Sedang Aktif</span>
                        <?php else: ?>
                            <span class="badge bg-secondary">Tidak Aktif</span>
                        <?php endif; ?>
                    </td>
                    <td class="text-center">
                        <?php if ($isAktif): ?>
                            <button class="btn btn-sm btn-outline-success" disabled>
                                <i class="bi bi-check2-all"></i> Periode Aktif
                            </button>
                        <?php else: ?>
                            <button class="btn btn-sm btn-primary" data-bs-toggle="modal" data-bs-target="#confirmModal<?= $r['id_tahun_ajaran'] ?>">
                                <i class="bi bi-arrow-repeat"></i> Jadikan Aktif
                            </button>

                            <!-- Double Confirmation Modal -->
                            <div class="modal fade" id="confirmModal<?= $r['id_tahun_ajaran'] ?>" tabindex="-1">
                                <div class="modal-dialog">
                                    <div class="modal-content">
                                        <form method="post" action="tahun_ajaran.php">
                                            <?= csrf_field() ?>
                                            <input type="hidden" name="action" value="activate_ta">
                                            <input type="hidden" name="id" value="<?= $r['id_tahun_ajaran'] ?>">
                                            <div class="modal-header bg-danger text-white">
                                                <h5 class="modal-title"><i class="bi bi-shield-lock"></i> Konfirmasi Perubahan Tahun Ajaran</h5>
                                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                                            </div>
                                            <div class="modal-body text-start">
                                                <p class="mb-3">
                                                    Anda akan mengaktifkan periode:
                                                </p>
                                                <div class="alert alert-primary py-2 text-center fs-5 fw-bold">
                                                    <?= e($r['tahun_ajaran']) ?> · Semester <?= e($r['semester']) ?>
                                                </div>
                                                <div class="alert alert-warning small mb-0">
                                                    ⚠️ <strong>Konfirmasi Ganda:</strong> Tindakan ini akan mengalihkan seluruh pencatatan absensi harian dan rekapitulasi nilai rapor ke periode ini. Apakah Anda yakin ingin melanjutkan?
                                                </div>
                                            </div>
                                            <div class="modal-footer">
                                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batalkan</button>
                                                <button type="submit" class="btn btn-danger fw-bold">Ya, Sahkan & Aktifkan</button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        <?php endif; ?>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<?php require '../includes/footer.php'; ?>
