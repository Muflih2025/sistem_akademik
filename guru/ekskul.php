<?php
require_once __DIR__.'/../config/academic_service.php'; require_role('guru');
$pdo = db(); $gid = (int)user_reference();

// Guru's classes
$q = $pdo->prepare('SELECT DISTINCT j.id_kelas, k.nama_kelas FROM jadwal j JOIN kelas k ON k.id_kelas=j.id_kelas WHERE j.id_guru=? AND j.status="aktif" AND k.status="aktif" AND EXISTS(SELECT 1 FROM tahun_ajaran scope_period WHERE scope_period.id_tahun_ajaran=j.id_tahun_ajaran AND scope_period.status="Aktif") ORDER BY k.nama_kelas');
$q->execute([$gid]); $kelas_list = $q->fetchAll();

$tahun_list = $pdo->query('SELECT * FROM tahun_ajaran ORDER BY status DESC, tahun_ajaran DESC')->fetchAll();
$q=$pdo->prepare("SELECT * FROM ekstrakurikuler WHERE id_guru_pembina=? AND status='aktif' ORDER BY nama_ekskul");$q->execute([$gid]);$ekskul_list=$q->fetchAll();

$sel_kelas = (($_POST+$_GET)['id_kelas']??'')!==''?input_id($_POST+$_GET,'id_kelas'):0;
$sel_ta = (($_POST+$_GET)['id_tahun_ajaran']??'')!==''?input_id($_POST+$_GET,'id_tahun_ajaran'):0;
$sel_ekskul = (($_POST+$_GET)['id_ekskul']??'')!==''?input_id($_POST+$_GET,'id_ekskul'):0;

if (!$sel_ta) { foreach ($tahun_list as $t) { if ($t['status']==='Aktif') { $sel_ta=(int)$t['id_tahun_ajaran']; break; } } }

if($sel_kelas)teacher_assignment($sel_kelas,null,$sel_ta?:null);
if($sel_ekskul){$q=$pdo->prepare("SELECT 1 FROM ekstrakurikuler WHERE id_ekskul=? AND id_guru_pembina=? AND status='aktif'");$q->execute([$sel_ekskul,$gid]);if(!$q->fetch())deny_access();}
$students = [];
if ($sel_kelas && $sel_ekskul && $sel_ta) {
    $q = $pdo->prepare('SELECT s.nis, s.nama_siswa, ne.predikat, ne.keterangan
        FROM siswa s
        LEFT JOIN nilai_ekskul ne ON ne.nis=s.nis AND ne.id_ekskul=? AND ne.id_tahun_ajaran=?
        WHERE s.id_kelas=? AND s.status="aktif" ORDER BY s.nama_siswa');
    $q->execute([$sel_ekskul, $sel_ta, $sel_kelas]); $students = $q->fetchAll();
}

$error='';if($_SERVER['REQUEST_METHOD']==='POST'){verify_csrf();try{input_choice($_POST,'action',['save']);save_extracurricular($_POST);flash('success','Nilai ekskul berhasil disimpan.');redirect('ekskul.php?'.http_build_query(['id_kelas'=>$sel_kelas,'id_tahun_ajaran'=>$sel_ta,'id_ekskul'=>$sel_ekskul]));}catch(Throwable $e){$error=operation_error($e);}}
$page_title = 'Input Nilai Ekstrakurikuler';
require __DIR__.'/../includes/header.php'; require __DIR__.'/../includes/sidebar.php'; require __DIR__.'/../includes/flash.php';
?>
<h2>Input Nilai Ekstrakurikuler</h2><?php if($error):?><div role="alert" class="alert alert-danger"><?=e($error)?></div><?php endif;?>

<div class="card p-3 mb-4">
    <form method="get" class="row g-2 align-items-end">
        <div class="col-md-3">
            <label class="form-label">Kelas</label>
            <select class="form-select" name="id_kelas" required>
                <option value="">Pilih Kelas</option>
                <?php foreach ($kelas_list as $k): ?>
                <option value="<?= $k['id_kelas'] ?>" <?= $sel_kelas==$k['id_kelas']?'selected':'' ?>><?= e($k['nama_kelas']) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="col-md-3">
            <label class="form-label">Tahun Ajaran</label>
            <select class="form-select" name="id_tahun_ajaran">
                <?php foreach ($tahun_list as $t): ?>
                <option value="<?= $t['id_tahun_ajaran'] ?>" <?= $sel_ta==$t['id_tahun_ajaran']?'selected':'' ?>><?= e($t['tahun_ajaran'].' - '.$t['semester']) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="col-md-3">
            <label class="form-label">Ekstrakurikuler</label>
            <select class="form-select" name="id_ekskul" required>
                <option value="">Pilih Ekskul</option>
                <?php foreach ($ekskul_list as $ek): ?>
                <option value="<?= $ek['id_ekskul'] ?>" <?= $sel_ekskul==$ek['id_ekskul']?'selected':'' ?>><?= e($ek['nama_ekskul']) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="col-md-2"><button class="btn btn-primary w-100">Tampilkan</button></div>
    </form>
</div>

<?php if ($sel_kelas && $sel_ekskul && $students): ?>
<div class="card p-3">
    <form method="post">
        <?= csrf_field() ?>
        <input type="hidden" name="action" value="save">
        <input type="hidden" name="id_kelas" value="<?= $sel_kelas ?>">
        <input type="hidden" name="id_tahun_ajaran" value="<?= $sel_ta ?>">
        <input type="hidden" name="id_ekskul" value="<?= $sel_ekskul ?>">
        <div class="table-responsive">
            <table class="table table-hover">
                <thead><tr><th>No</th><th>NIS</th><th>Nama Siswa</th><th>Predikat</th><th>Keterangan</th></tr></thead>
                <tbody>
                <?php $no=1; foreach ($students as $s): ?>
                <tr>
                    <td><?= $no++ ?></td>
                    <td><?= e($s['nis']) ?></td>
                    <td><?= e($s['nama_siswa']) ?></td>
                    <td>
                        <input type="hidden" name="nis[]" value="<?= e($s['nis']) ?>">
                        <select class="form-select form-select-sm" name="predikat[]">
                            <?php foreach (['Sangat Baik','Baik','Cukup','Kurang'] as $p): ?>
                            <option <?= ($s['predikat']??'Baik')===$p?'selected':'' ?>><?= $p ?></option>
                            <?php endforeach; ?>
                        </select>
                    </td>
                    <td><input type="text" class="form-control form-control-sm" name="keterangan[]" value="<?= e($s['keterangan']??'') ?>" placeholder="Opsional"></td>
                </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        <button type="submit" class="btn btn-primary">Simpan Semua Nilai Ekskul</button>
    </form>
</div>
<?php elseif ($sel_kelas && $sel_ekskul): ?>
<div class="alert alert-info">Tidak ada siswa di kelas ini.</div>
<?php endif; ?>

<?php require __DIR__.'/../includes/footer.php'; ?>
