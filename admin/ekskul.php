<?php
require_once __DIR__.'/../config/auth.php';
require_role('admin');

$pdo = db();
$error = '';
$edit = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $action = $_POST['action'] ?? 'save';

    try {
        if ($action === 'delete') {
            $id = (int)($_POST['id_ekskul'] ?? $_POST['id'] ?? 0);
            if ($id > 0) {
                $q = $pdo->prepare("DELETE FROM ekstrakurikuler WHERE id_ekskul = ?");
                $q->execute([$id]);
                flash('success', 'Data ekstrakurikuler berhasil dihapus.');
            }
            redirect('ekskul.php');
        }

        if ($action === 'save') {
            $id = !empty($_POST['id_ekskul']) ? (int)$_POST['id_ekskul'] : null;
            $nama = trim((string)($_POST['nama_ekskul'] ?? ''));
            $pembina = trim((string)($_POST['pembina'] ?? ''));
            $deskripsi = trim((string)($_POST['deskripsi'] ?? ''));

            if ($nama === '') {
                throw new InvalidArgumentException('Nama ekstrakurikuler wajib diisi.');
            }

            if ($id !== null && $id > 0) {
                $q = $pdo->prepare("UPDATE ekstrakurikuler SET nama_ekskul = ?, pembina = ?, deskripsi = ? WHERE id_ekskul = ?");
                $q->execute([$nama, $pembina !== '' ? $pembina : null, $deskripsi !== '' ? $deskripsi : null, $id]);
                flash('success', 'Data ekstrakurikuler berhasil diperbarui.');
            } else {
                $q = $pdo->prepare("INSERT INTO ekstrakurikuler (nama_ekskul, pembina, deskripsi) VALUES (?, ?, ?)");
                $q->execute([$nama, $pembina !== '' ? $pembina : null, $deskripsi !== '' ? $deskripsi : null]);
                flash('success', 'Data ekstrakurikuler berhasil ditambahkan.');
            }
            redirect('ekskul.php');
        }
    } catch (InvalidArgumentException $e) {
        $error = $e->getMessage();
    } catch (Throwable $e) {
        $error = 'Gagal memproses data ekstrakurikuler: ' . $e->getMessage();
    }
}

if (isset($_GET['edit'])) {
    $q = $pdo->prepare("SELECT * FROM ekstrakurikuler WHERE id_ekskul = ?");
    $q->execute([(int)$_GET['edit']]);
    $edit = $q->fetch();
    if (!$edit) {
        flash('warning', 'Data ekstrakurikuler tidak ditemukan.');
        redirect('ekskul.php');
    }
}

$rows = $pdo->query("SELECT * FROM ekstrakurikuler ORDER BY id_ekskul ASC")->fetchAll();
$page_title = 'Manajemen Ekstrakurikuler';
require_once __DIR__.'/../includes/header.php';
require_once __DIR__.'/../includes/sidebar.php';
require_once __DIR__.'/../includes/flash.php';
?>
<div class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
    <h2 class="mb-0"><?= e($page_title) ?></h2>
    <?php if ($edit): ?>
        <a class="btn btn-outline-secondary" href="ekskul.php">Form Baru</a>
    <?php endif; ?>
</div>

<?php if ($error): ?>
    <div class="alert alert-danger"><?= e($error) ?></div>
<?php endif; ?>

<div class="card p-3 mb-4 shadow-sm">
    <h5 class="card-title mb-3"><?= $edit ? 'Edit Ekstrakurikuler' : 'Tambah Ekstrakurikuler Baru' ?></h5>
    <form method="post" class="row g-3">
        <?= csrf_field() ?>
        <input type="hidden" name="action" value="save">
        <input type="hidden" name="id_ekskul" value="<?= e($edit['id_ekskul'] ?? '') ?>">

        <div class="col-md-6">
            <label class="form-label">Nama Ekstrakurikuler <span class="text-danger">*</span></label>
            <input type="text" class="form-control" name="nama_ekskul" maxlength="100" required value="<?= e($edit['nama_ekskul'] ?? '') ?>" placeholder="Contoh: Pramuka, PMR, Futsal">
        </div>

        <div class="col-md-6">
            <label class="form-label">Pembina / Pelatih</label>
            <input type="text" class="form-control" name="pembina" maxlength="100" value="<?= e($edit['pembina'] ?? '') ?>" placeholder="Contoh: Budi Santoso, S.Pd.">
        </div>

        <div class="col-12">
            <label class="form-label">Deskripsi</label>
            <textarea class="form-control" name="deskripsi" rows="3" placeholder="Deskripsi atau keterangan kegiatan ekstrakurikuler..."><?= e($edit['deskripsi'] ?? '') ?></textarea>
        </div>

        <div class="col-12">
            <button type="submit" class="btn btn-primary"><?= $edit ? 'Simpan Perubahan' : 'Tambah Ekstrakurikuler' ?></button>
            <?php if ($edit): ?>
                <a href="ekskul.php" class="btn btn-secondary ms-2">Batal</a>
            <?php endif; ?>
        </div>
    </form>
</div>

<div class="card p-3 shadow-sm">
    <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="card-title mb-0">Daftar Ekstrakurikuler (<?= count($rows) ?>)</h5>
    </div>
    <div class="table-responsive">
        <table class="table table-hover align-middle">
            <thead class="table-light">
                <tr>
                    <th style="width: 60px;">No</th>
                    <th>Nama Ekstrakurikuler</th>
                    <th>Pembina / Pelatih</th>
                    <th>Deskripsi</th>
                    <th style="width: 150px;" class="text-center">Aksi</th>
                </tr>
            </thead>
            <tbody>
                <?php if (empty($rows)): ?>
                    <tr>
                        <td colspan="5" class="text-center text-muted py-4">Belum ada data ekstrakurikuler.</td>
                    </tr>
                <?php else: ?>
                    <?php $no = 1; foreach ($rows as $r): ?>
                        <tr>
                            <td><?= $no++ ?></td>
                            <td class="fw-semibold"><?= e($r['nama_ekskul']) ?></td>
                            <td><?= e($r['pembina'] ?? '-') ?></td>
                            <td><?= !empty($r['deskripsi']) ? nl2br(e($r['deskripsi'])) : '<span class="text-muted">-</span>' ?></td>
                            <td class="text-center text-nowrap">
                                <a class="btn btn-sm btn-outline-primary" href="ekskul.php?edit=<?= (int)$r['id_ekskul'] ?>">Edit</a>
                                <form method="post" class="d-inline" onsubmit="return confirm('Yakin ingin menghapus ekstrakurikuler ini?')">
                                    <?= csrf_field() ?>
                                    <input type="hidden" name="action" value="delete">
                                    <input type="hidden" name="id_ekskul" value="<?= (int)$r['id_ekskul'] ?>">
                                    <button type="submit" class="btn btn-sm btn-outline-danger">Hapus</button>
                                </form>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<?php
require_once __DIR__.'/../includes/footer.php';
