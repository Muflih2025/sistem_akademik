<?php
require_once __DIR__.'/../config/crud_service.php';
require_role('admin');

$pdo = db();
$error = '';
$edit = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $action = $_POST['action'] ?? 'save';

    try {
        db_transaction(function(PDO $pdo)use($action):void {
            if(!in_array($action,['save','delete','activate'],true))throw new InputError('Aksi tidak valid.');
            $id=($_POST['id_ekskul']??'')!==''?input_id($_POST,'id_ekskul'):null;
            $before=$id!==null?locked_row('ekstrakurikuler','id_ekskul',$id):null;
            if($action!=='save'){
                if(!$before)throw new InputError('Pilih ekstrakurikuler yang valid.');
                $status=$action==='activate'?'aktif':'nonaktif';
                $pdo->prepare('UPDATE ekstrakurikuler SET status=? WHERE id_ekskul=?')->execute([$status,$id]);
                audit_change('ekstrakurikuler',(string)$id,$action,$before,['status'=>$status]);return;
            }
            $name=input_text($_POST,'nama_ekskul',100);
            unique_value('ekstrakurikuler','nama_ekskul',$name,'id_ekskul',$id);
            $coach=input_text($_POST,'pembina',100,false);$description=input_text($_POST,'deskripsi',5000,false);
            $teacher=($_POST['id_guru_pembina']??'')!==''?input_id($_POST,'id_guru_pembina'):null;
            if($teacher!==null)active_reference('guru','id_guru',$teacher);
            $values=[$name,$coach?:null,$description?:null,$teacher];
            if($before)$pdo->prepare('UPDATE ekstrakurikuler SET nama_ekskul=?,pembina=?,deskripsi=?,id_guru_pembina=? WHERE id_ekskul=?')->execute([...$values,$id]);
            else{$pdo->prepare('INSERT INTO ekstrakurikuler(nama_ekskul,pembina,deskripsi,id_guru_pembina) VALUES(?,?,?,?)')->execute($values);$id=(int)$pdo->lastInsertId();}
            audit_change('ekstrakurikuler',(string)$id,$before?'update':'create',$before,['nama_ekskul'=>$name,'pembina'=>$coach,'deskripsi'=>$description,'id_guru_pembina'=>$teacher]);
        });
        flash('success',$action==='delete'?'Ekstrakurikuler dinonaktifkan; arsip tetap dipertahankan.':'Data ekstrakurikuler berhasil disimpan.');
        redirect('ekskul.php');
    } catch (Throwable $e) {
        $error=operation_error($e);
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

        <div class="col-md-6"><label class="form-label">Akun guru pembina</label><select name="id_guru_pembina" class="form-select"><option value="">Belum ditugaskan</option><?php foreach(db()->query("SELECT id_guru,nama_guru FROM guru WHERE status='aktif' ORDER BY nama_guru") as $g):?><option value="<?=$g['id_guru']?>" <?=($edit['id_guru_pembina']??null)==$g['id_guru']?'selected':''?>><?=e($g['nama_guru'])?></option><?php endforeach;?></select></div>
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
                            <td class="fw-semibold"><?= e($r['nama_ekskul']) ?> <?= $r['status']==='nonaktif'?'(Nonaktif)':'' ?></td>
                            <td><?= e($r['pembina'] ?? '-') ?></td>
                            <td><?= !empty($r['deskripsi']) ? nl2br(e($r['deskripsi'])) : '<span class="text-muted">-</span>' ?></td>
                            <td class="text-center text-nowrap">
                                <a class="btn btn-sm btn-outline-primary" href="ekskul.php?edit=<?= (int)$r['id_ekskul'] ?>">Edit</a>
                                <form method="post" class="d-inline" onsubmit="return confirm('Ubah status ekstrakurikuler ini?')">
                                    <?= csrf_field() ?>
                                    <input type="hidden" name="action" value="<?= $r['status']==='aktif'?'delete':'activate' ?>">
                                    <input type="hidden" name="id_ekskul" value="<?= (int)$r['id_ekskul'] ?>">
                                    <button type="submit" class="btn btn-sm btn-outline-danger"> <?= $r['status']==='aktif'?'Nonaktifkan':'Aktifkan' ?></button>
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
