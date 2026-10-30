<?php
require_once __DIR__.'/../config/auth.php'; require_role('kepala_sekolah');
$pdo = db();

$tahun_list = $pdo->query('SELECT * FROM tahun_ajaran ORDER BY status DESC, tahun_ajaran DESC')->fetchAll();
$sel_ta = (int)($_GET['id_tahun_ajaran'] ?? $_POST['id_tahun_ajaran'] ?? 0);
if (!$sel_ta) { foreach ($tahun_list as $t) { if ($t['status']==='Aktif') { $sel_ta=(int)$t['id_tahun_ajaran']; break; } } }

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $action=input_choice($_POST+['action'=>'save'],'action',['save','delete']);
    if(!empty($_POST['id_evaluasi'])){$q=$pdo->prepare('SELECT created_by FROM catatan_evaluasi WHERE id_evaluasi=?');$q->execute([input_id($_POST,'id_evaluasi')]);if((int)$q->fetchColumn()!==(int)current_user()['id_user'])deny_access();}
    active_period($sel_ta?:null,true);
    try {
        if ($action === 'delete') {
            $q = $pdo->prepare('DELETE FROM catatan_evaluasi WHERE id_evaluasi=?');
            $q->execute([(int)$_POST['id_evaluasi']]);
            flash('success', 'Catatan evaluasi dihapus.');
        } else {
            $judul=input_text($_POST,'judul',150);
            $isi=input_text($_POST,'isi',10000);
            if (!$judul || !$isi) throw new RuntimeException('Judul dan isi wajib diisi.');

            $uid = (int)current_user()['id_user'];
            if (!empty($_POST['id_evaluasi'])) {
                $q = $pdo->prepare('UPDATE catatan_evaluasi SET judul=?, isi=?, id_tahun_ajaran=? WHERE id_evaluasi=?');
                $q->execute([$judul, $isi, $sel_ta, (int)$_POST['id_evaluasi']]);
                flash('success', 'Catatan evaluasi diperbarui.');
            } else {
                $q = $pdo->prepare('INSERT INTO catatan_evaluasi (judul, isi, id_tahun_ajaran, created_by) VALUES (?,?,?,?)');
                $q->execute([$judul, $isi, $sel_ta, $uid]);
                flash('success', 'Catatan evaluasi ditambahkan.');
            }
        }
        redirect("evaluasi.php?id_tahun_ajaran=$sel_ta");
    } catch (Throwable $e) {
        $error=operation_error($e);
    }
}

$edit = null;
if (isset($_GET['edit'])) {
    $q = $pdo->prepare('SELECT * FROM catatan_evaluasi WHERE id_evaluasi=?');
    $q->execute([input_id($_GET,'edit')]); $edit=$q->fetch();if(!$edit || (int)$edit['created_by']!==(int)current_user()['id_user'])deny_access();
}

$q = $pdo->prepare('SELECT ce.*, ta.tahun_ajaran, ta.semester, u.username
    FROM catatan_evaluasi ce
    JOIN tahun_ajaran ta ON ta.id_tahun_ajaran=ce.id_tahun_ajaran
    LEFT JOIN users u ON u.id_user=ce.created_by
    WHERE ce.id_tahun_ajaran=? ORDER BY ce.created_at DESC');
$q->execute([$sel_ta]); $rows = $q->fetchAll();

$page_title = 'Catatan Evaluasi';
require __DIR__.'/../includes/header.php'; require __DIR__.'/../includes/sidebar.php'; require __DIR__.'/../includes/flash.php';
?>
<h2>Catatan Evaluasi</h2>

<?php if ($error): ?><div class="alert alert-danger"><?= e($error) ?></div><?php endif; ?>

<div class="card p-3 mb-4">
    <form method="get" class="row g-2 align-items-end mb-3">
        <div class="col-md-5">
            <label class="form-label">Tahun Ajaran</label>
            <select class="form-select" name="id_tahun_ajaran" onchange="this.form.submit()">
                <?php foreach ($tahun_list as $t): ?>
                <option value="<?= $t['id_tahun_ajaran'] ?>" <?= $sel_ta==$t['id_tahun_ajaran']?'selected':'' ?>><?= e($t['tahun_ajaran'].' - '.$t['semester']) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
    </form>

    <h5><?= $edit ? 'Edit Catatan' : 'Tambah Catatan Baru' ?></h5>
    <form method="post" class="row g-2">
        <?= csrf_field() ?>
        <input type="hidden" name="action" value="save">
        <input type="hidden" name="id_tahun_ajaran" value="<?= $sel_ta ?>">
        <?php if ($edit): ?><input type="hidden" name="id_evaluasi" value="<?= $edit['id_evaluasi'] ?>"><?php endif; ?>
        <div class="col-12">
            <label class="form-label">Judul</label>
            <input type="text" class="form-control" name="judul" required value="<?= e($edit['judul'] ?? '') ?>">
        </div>
        <div class="col-12">
            <label class="form-label">Isi Catatan</label>
            <textarea class="form-control" name="isi" rows="4" required><?= e($edit['isi'] ?? '') ?></textarea>
        </div>
        <div class="col-12">
            <button class="btn btn-primary"><?= $edit ? 'Simpan Perubahan' : 'Tambah Catatan' ?></button>
            <?php if ($edit): ?><a href="evaluasi.php?id_tahun_ajaran=<?= $sel_ta ?>" class="btn btn-secondary ms-2">Batal</a><?php endif; ?>
        </div>
    </form>
</div>

<div class="card p-3">
    <h5>Daftar Catatan (<?= count($rows) ?>)</h5>
    <?php if ($rows): ?>
    <?php foreach ($rows as $r): ?>
    <div class="border rounded p-3 mb-2">
        <div class="d-flex justify-content-between">
            <h6 class="mb-1"><?= e($r['judul']) ?></h6>
            <div class="text-nowrap">
                <a href="?id_tahun_ajaran=<?= $sel_ta ?>&edit=<?= $r['id_evaluasi'] ?>" class="btn btn-sm btn-outline-primary">Edit</a>
                <form method="post" class="d-inline" onsubmit="return confirm('Hapus catatan ini?')">
                    <?= csrf_field() ?>
                    <input type="hidden" name="action" value="delete">
                    <input type="hidden" name="id_evaluasi" value="<?= $r['id_evaluasi'] ?>">
                    <input type="hidden" name="id_tahun_ajaran" value="<?= $sel_ta ?>">
                    <button class="btn btn-sm btn-outline-danger">Hapus</button>
                </form>
            </div>
        </div>
        <p class="mb-1"><?= nl2br(e($r['isi'])) ?></p>
        <small class="text-muted">Oleh: <?= e($r['username']??'-') ?> | <?= e($r['created_at']) ?></small>
    </div>
    <?php endforeach; ?>
    <?php else: ?>
    <p class="text-muted text-center py-3">Belum ada catatan evaluasi.</p>
    <?php endif; ?>
</div>

<?php require __DIR__.'/../includes/footer.php'; ?>
