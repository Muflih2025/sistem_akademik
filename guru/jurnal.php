<?php
require_once '../config/academic_service.php';require_role('guru');$pdo=db();$gid=(int)user_reference();$error='';
$q=$pdo->prepare("SELECT j.*,k.nama_kelas,mp.nama_mapel,jr.nama_jurusan FROM jadwal j JOIN kelas k ON k.id_kelas=j.id_kelas JOIN mata_pelajaran mp ON mp.id_mapel=j.id_mapel LEFT JOIN jurusan jr ON jr.id_jurusan=k.id_jurusan WHERE j.id_guru=? AND j.status='aktif' AND k.status='aktif' AND mp.status='aktif' AND EXISTS(SELECT 1 FROM tahun_ajaran scope_period WHERE scope_period.id_tahun_ajaran=j.id_tahun_ajaran AND scope_period.status='Aktif') ORDER BY j.hari,j.jam_mulai");$q->execute([$gid]);$schedules=$q->fetchAll();
$input=$_SERVER['REQUEST_METHOD']==='POST'?$_POST:$_GET;$selected=($input['id_jadwal']??'')!==''?input_id($input,'id_jadwal'):(int)($schedules[0]['id_jadwal']??0);$date=input_date($input+['tanggal'=>date('Y-m-d')],'tanggal');
if($selected)own_schedule($selected);
if($_SERVER['REQUEST_METHOD']==='POST'){verify_csrf();try{input_choice($_POST,'action',['save_jurnal']);save_journal($_POST);flash('success','Jurnal dan seluruh absensi disimpan dalam satu transaksi.');redirect('jurnal.php?'.http_build_query(['id_jadwal'=>$selected,'tanggal'=>$date]));}catch(Throwable $e){$error=operation_error($e);}}
$students=[];$today_jurnal=null;$selected_info=null;$pertemuan_ke=1;
if($selected){foreach($schedules as $schedule)if((int)$schedule['id_jadwal']===$selected)$selected_info=$schedule;
$q=$pdo->prepare("SELECT s.nis,s.nama_siswa,s.jenis_kelamin,a.status,a.keterangan FROM siswa s LEFT JOIN absensi a ON a.nis=s.nis AND a.id_jadwal=? AND a.tanggal=? WHERE s.id_kelas=? AND s.status='aktif' ORDER BY s.nama_siswa");$q->execute([$selected,$date,$selected_info['id_kelas']]);$students=$q->fetchAll();
$q=$pdo->prepare('SELECT * FROM jurnal_kelas WHERE id_jadwal=? AND tanggal=? AND id_guru=?');$q->execute([$selected,$date,$gid]);$today_jurnal=$q->fetch()?:null;
$q=$pdo->prepare('SELECT COUNT(*) FROM jurnal_kelas WHERE id_jadwal=? AND id_guru=?');$q->execute([$selected,$gid]);$pertemuan_ke=$today_jurnal?(int)$today_jurnal['pertemuan_ke']:(int)$q->fetchColumn()+1;
}
$q=$pdo->prepare("SELECT jk.*,k.nama_kelas,mp.nama_mapel FROM jurnal_kelas jk JOIN jadwal j ON j.id_jadwal=jk.id_jadwal JOIN kelas k ON k.id_kelas=jk.id_kelas JOIN mata_pelajaran mp ON mp.id_mapel=jk.id_mapel WHERE jk.id_guru=? AND j.id_guru=? AND j.status='aktif' ORDER BY jk.tanggal DESC LIMIT 20");$q->execute([$gid,$gid]);$recent_journals=$q->fetchAll();
$page_title='Buku Agenda Harian Guru & Jurnal KBM';require '../includes/header.php';require '../includes/sidebar.php';require '../includes/flash.php';
?>

<div class="d-flex justify-content-between align-items-center mb-3">
    <div>
        <h2 class="mb-0">Buku Agenda Harian Guru & Jurnal KBM</h2>
        <small class="text-muted">Format Resmi SMKN 2 Magelang (No. Dokumen: FM-03/03-04/WKST)</small>
    </div>
    <a href="rekap_absen.php?id_jadwal=<?= $selected ?>" class="btn btn-outline-info">
        <i class="bi bi-card-checklist"></i> Buka Daftar Hadir Siswa (FM-03/03-02/WKST)
    </a>
</div>

<?php if ($error): ?>
    <div class="alert alert-danger"><?= e($error) ?></div>
<?php endif; ?>

<!-- Filter & Pemilihan Jadwal KBM -->
<div class="card p-3 mb-4 shadow-sm">
    <form method="get" class="row g-2 align-items-end">
        <div class="col-md-5">
            <label class="form-label fw-bold">Jadwal Mata Pelajaran & Kelas</label>
            <select class="form-select" name="id_jadwal" required onchange="this.form.submit()">
                <option value="">-- Pilih Jadwal KBM --</option>
                <?php foreach ($schedules as $s): ?>
                    <option value="<?= $s['id_jadwal'] ?>" <?= ($selected === (int)$s['id_jadwal']) ? 'selected' : '' ?>>
                        <?= e($s['hari'] . ' (' . substr($s['jam_mulai'], 0, 5) . '-' . substr($s['jam_selesai'], 0, 5) . ') · ' . $s['nama_kelas'] . ' · ' . $s['nama_mapel']) ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="col-md-3">
            <label class="form-label fw-bold">Tanggal Pertemuan (Default: Hari-H)</label>
            <input class="form-control" type="date" name="tanggal" value="<?= e($date) ?>" required onchange="this.form.submit()">
        </div>
        <div class="col-md-2">
            <button class="btn btn-primary w-100"><i class="bi bi-arrow-clockwise"></i> Muat Data</button>
        </div>
        <div class="col-md-2">
            <a href="jurnal.php?id_jadwal=<?= $selected ?>&tanggal=<?= date('Y-m-d') ?>" class="btn btn-outline-secondary w-100">Set Hari Ini</a>
        </div>
    </form>
</div>

<?php if ($selected && $students): ?>
<form method="post" action="jurnal.php">
    <?= csrf_field() ?>
    <input type="hidden" name="action" value="save_jurnal">
    <input type="hidden" name="id_jadwal" value="<?= $selected ?>">
    <input type="hidden" name="tanggal" value="<?= e($date) ?>">

    <div class="row g-4 mb-4">
        <!-- Kolom Kiri: Form Agenda Harian Guru -->
        <div class="col-lg-5">
            <div class="card p-3 h-100 shadow-sm border-primary">
                <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center mb-3">
                    <h5 class="mb-0"><i class="bi bi-journal-bookmark"></i> Agenda Harian Guru</h5>
                    <span class="badge bg-light text-primary">Pertemuan Ke-<?= $pertemuan_ke ?></span>
                </div>

                <div class="row g-2 mb-3">
                    <div class="col-6">
                        <label class="form-label fw-bold">Pertemuan Ke-</label>
                        <input type="number" class="form-control" name="pertemuan_ke" value="<?= $pertemuan_ke ?>" min="1" max="36" required>
                    </div>
                    <div class="col-6">
                        <label class="form-label fw-bold">Jam Ke- / Sesi</label>
                        <input type="text" class="form-control" name="jam_ke" placeholder="Contoh: Jam 1 - 3" value="<?= e($today_jurnal['jam_ke'] ?? '') ?>">
                    </div>
                </div>

                <div class="mb-3">
                    <label class="form-label fw-bold">Guru Pengganti (Opsional)</label>
                    <input type="text" class="form-control" name="guru_pengganti" placeholder="Isi nama jika guru piket / pengganti" value="<?= e($today_jurnal['guru_pengganti'] ?? '') ?>">
                </div>

                <div class="mb-3">
                    <label class="form-label fw-bold">TP / ATP / Uraian Materi <span class="text-danger">*</span></label>
                    <textarea class="form-control" name="materi" rows="3" required placeholder="Contoh: Berpikir Komputasional, Dekomposisi Masalah, Tipe Data..."><?= e($today_jurnal['materi'] ?? '') ?></textarea>
                </div>

                <div class="mb-3"><label class="form-label fw-bold">Kegiatan pembelajaran</label><textarea class="form-control" name="kegiatan" rows="2"><?= e($today_jurnal['kegiatan'] ?? '') ?></textarea></div>
                <div class="mb-3">
                    <label class="form-label fw-bold">Refleksi KBM / Catatan Pembelajaran</label>
                    <textarea class="form-control" name="refleksi" rows="2" placeholder="Contoh: Tugas membuat poster, Diskusi kelompok, Praktik coding lab..."><?= e($today_jurnal['refleksi'] ?? $today_jurnal['kegiatan'] ?? '') ?></textarea>
                </div>

                <div class="mb-2">
                    <label class="form-label fw-bold">Catatan Tambahan Kelas</label>
                    <textarea class="form-control" name="catatan" rows="1" placeholder="Catatan opsional..."><?= e($today_jurnal['catatan'] ?? '') ?></textarea>
                </div>
            </div>
        </div>

        <!-- Kolom Kanan: Presensi Siswa Terpadu -->
        <div class="col-lg-7">
            <div class="card p-3 h-100 shadow-sm">
                <div class="card-header bg-light mb-3 d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">👥 Presensi Siswa: <?= e($selected_info['nama_kelas'] ?? '') ?></h5>
                    <span class="badge bg-success">Default: Otomatis Hadir</span>
                </div>
                <p class="text-muted small">
                    💡 <em>Siswa yang tidak Anda ubah statusnya akan <strong>otomatis tercatat HADIR</strong>. Cukup pilih <strong>Sakit (S) / Izin (I) / Alpa (A)</strong> untuk siswa yang berhalangan hadir.</em>
                </p>

                <div class="table-responsive" style="max-height: 420px; overflow-y: auto;">
                    <table class="table table-sm table-hover align-middle">
                        <thead class="table-light sticky-top">
                            <tr>
                                <th style="width: 35px;">No</th>
                                <th>NIS & Nama Siswa</th>
                                <th style="width: 45px;" class="text-center">L/P</th>
                                <th style="width: 140px;">Status Kehadiran</th>
                                <th>Keterangan</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php $no = 1; foreach ($students as $s):
                                $cur_status = $s['status'] ?? 'Hadir';
                            ?>
                            <tr class="<?= in_array($cur_status, ['Sakit', 'Izin', 'Alpa']) ? 'table-warning' : '' ?>" id="row-<?= e($s['nis']) ?>">
                                <td><?= $no++ ?></td>
                                <td>
                                    <strong><?= e($s['nama_siswa']) ?></strong><br>
                                    <small class="text-muted"><?= e($s['nis']) ?></small>
                                </td>
                                <td class="text-center fw-bold"><?= e($s['jenis_kelamin'] ?? '-') ?></td>
                                <td>
                                    <select class="form-select form-select-sm status-select" name="status_custom[<?= e($s['nis']) ?>]" onchange="checkRow(this, 'row-<?= e($s['nis']) ?>')">
                                        <option value="Hadir" <?= $cur_status === 'Hadir' ? 'selected' : '' ?>>Hadir (.)</option>
                                        <option value="Sakit" <?= $cur_status === 'Sakit' ? 'selected' : '' ?>>Sakit (S)</option>
                                        <option value="Izin" <?= $cur_status === 'Izin' ? 'selected' : '' ?>>Izin (I)</option>
                                        <option value="Alpa" <?= $cur_status === 'Alpa' ? 'selected' : '' ?>>Alpa (A)</option>
                                    </select>
                                </td>
                                <td>
                                    <input type="text" class="form-control form-control-sm" name="ket_custom[<?= e($s['nis']) ?>]" value="<?= e($s['keterangan'] ?? '') ?>" placeholder="Keterangan alasan...">
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>

                <div class="mt-3">
                    <button type="submit" class="btn btn-success btn-lg w-100 fw-bold">
                        💾 Simpan Agenda Harian & Presensi Kelas
                    </button>
                </div>
            </div>
        </div>
    </div>
</form>

<script>
function checkRow(sel, rowId) {
    const row = document.getElementById(rowId);
    if (sel.value !== 'Hadir') {
        row.classList.add('table-warning');
    } else {
        row.classList.remove('table-warning');
    }
}
</script>
<?php endif; ?>

<!-- Tabel Riwayat Agenda Harian Guru Sesuai Format Resmi -->
<div class="card p-3 shadow-sm mt-4">
    <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0">📖 Riwayat Buku Agenda Harian Guru (FM-03/03-04/WKST)</h5>
        <button onclick="window.print()" class="btn btn-sm btn-outline-secondary">🖨️ Cetak Buku Agenda</button>
    </div>
    <div class="table-responsive">
        <table class="table table-bordered table-striped align-middle">
            <thead class="table-dark">
                <tr>
                    <th style="width: 40px;" class="text-center">No</th>
                    <th style="width: 130px;">Hari / Tanggal</th>
                    <th style="width: 80px;" class="text-center">Pertemuan Ke</th>
                    <th>TP / ATP / Uraian Materi</th>
                    <th>Absensi Siswa (S / I / A)</th>
                    <th>Refleksi KBM / Catatan</th>
                </tr>
            </thead>
            <tbody>
                <?php if (empty($recent_journals)): ?>
                    <tr><td colspan="6" class="text-center text-muted py-4">Belum ada agenda harian yang diisi.</td></tr>
                <?php else: ?>
                    <?php $no = 1; foreach ($recent_journals as $rj):
                        // Ambil rekap absen pertemuan ini
                        $q = $pdo->prepare("SELECT s.nama_siswa, a.status, a.keterangan FROM absensi a JOIN siswa s ON s.nis=a.nis WHERE a.id_jadwal=? AND a.tanggal=? AND a.status IN ('Sakit','Izin','Alpa')");
                        $q->execute([$rj['id_jadwal'], $rj['tanggal']]);
                        $abs_unhadir = $q->fetchAll();
                    ?>
                    <tr>
                        <td class="text-center"><?= $no++ ?></td>
                        <td>
                            <strong><?= e(date('d/m/Y', strtotime($rj['tanggal']))) ?></strong><br>
                            <span class="badge bg-secondary"><?= e($rj['nama_kelas']) ?></span><br>
                            <small class="text-muted"><?= e($rj['nama_mapel']) ?></small>
                        </td>
                        <td class="text-center fs-5 fw-bold"><?= e($rj['pertemuan_ke'] ?: '-') ?></td>
                        <td>
                            <strong><?= nl2br(e($rj['materi'])) ?></strong>
                            <?php if ($rj['jam_ke']): ?>
                                <br><small class="text-primary"><i class="bi bi-clock"></i> <?= e($rj['jam_ke']) ?></small>
                            <?php endif; ?>
                            <?php if ($rj['guru_pengganti']): ?>
                                <br><small class="text-info"><i class="bi bi-person"></i> Pengganti: <?= e($rj['guru_pengganti']) ?></small>
                            <?php endif; ?>
                        </td>
                        <td>
                            <?php if (empty($abs_unhadir)): ?>
                                <span class="badge bg-success">Hadir Semua (Nihil)</span>
                            <?php else: ?>
                                <ul class="mb-0 ps-3 small">
                                    <?php foreach ($abs_unhadir as $au):
                                        $cls = ['Sakit'=>'warning','Izin'=>'info','Alpa'=>'danger'][$au['status']] ?? 'secondary';
                                    ?>
                                        <li>
                                            <?= e($au['nama_siswa']) ?> - <span class="badge bg-<?= $cls ?>"><?= $au['status'] ?></span>
                                            <?= $au['keterangan'] ? '('.e($au['keterangan']).')' : '' ?>
                                        </li>
                                    <?php endforeach; ?>
                                </ul>
                            <?php endif; ?>
                        </td>
                        <td>
                            <?= nl2br(e($rj['refleksi'] ?: $rj['kegiatan'] ?: $rj['catatan'] ?: '-')) ?>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<?php require '../includes/footer.php'; ?>
