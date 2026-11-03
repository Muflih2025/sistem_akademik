<?php require_once __DIR__.'/../config/auth.php'; $page_title = $page_title ?? APP_NAME; $role = current_user()['role'];
// Module tabs per role
$modules = match($role) {
    'admin' => [
        ['url'=>'../admin/index.php','label'=>'Dashboard'],
        ['url'=>'../admin/master.php?table=siswa','label'=>'Master Data'],
        ['url'=>'../admin/jadwal.php','label'=>'Jadwal'],
        ['url'=>'../admin/users.php','label'=>'Akun'],
        ['url'=>'../admin/export_import.php','label'=>'Export / Import'],
        ['url'=>'../admin/posisi_guru.php','label'=>'Monitoring Guru'],
        ['url'=>'../admin/ekskul.php','label'=>'Ekskul'],
    ],
    'guru' => [
        ['url'=>'../guru/index.php','label'=>'Dashboard'],
        ['url'=>'../guru/jurnal.php','label'=>'Jurnal'],
        ['url'=>'../guru/nilai.php','label'=>'Nilai'],
        ['url'=>'../guru/absen.php','label'=>'Absensi'],
        ['url'=>'../guru/rapor.php','label'=>'Rapor'],
        ['url'=>'../guru/ekskul.php','label'=>'Ekskul'],
        ['url'=>'../guru/export_nilai.php','label'=>'Export'],
    ],
    'kepala_sekolah' => [
        ['url'=>'../kepsek/index.php','label'=>'Dashboard'],
        ['url'=>'../kepsek/akademik.php','label'=>'Akademik'],
        ['url'=>'../kepsek/rapor.php','label'=>'Rapor'],
        ['url'=>'../kepsek/posisi_guru.php','label'=>'Monitoring Guru'],
        ['url'=>'../kepsek/evaluasi.php','label'=>'Evaluasi'],
        ['url'=>'../kepsek/tahun_ajaran.php','label'=>'Tahun Ajaran'],
    ],
    'siswa' => [
        ['url'=>'../siswa/index.php','label'=>'Dashboard'],
        ['url'=>'../siswa/jadwal.php','label'=>'Jadwal'],
        ['url'=>'../siswa/rapor.php','label'=>'Rapor'],
        ['url'=>'../siswa/absen.php','label'=>'Absensi'],
    ],
    default => [],
};
$current_file = basename($_SERVER['SCRIPT_NAME']);
?>
<!doctype html><html lang="id"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($page_title) ?> &middot; <?= APP_NAME ?></title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
<link href="../assets/css/app.css" rel="stylesheet">
</head><body>

<div class="navbar-top">
  <a class="brand" href="<?= e('../'.dashboard_path($role)) ?>">SIA SMKN 2 Magelang</a>
  <div class="user-info">
    <span><?= e(current_user()['username']) ?> &middot; <?= e(role_label($role)) ?></span>
    <a class="btn btn-outline-light" href="../auth/change_password.php">Ganti Password</a>
    <a class="btn btn-warning text-dark" href="../auth/logout.php">Keluar</a>
  </div>
</div>

<div class="module-tabs">
  <?php foreach ($modules as $m):
    $is_active = str_contains($m['url'], $current_file);
  ?>
  <a href="<?= e($m['url']) ?>" class="<?= $is_active ? 'active' : '' ?>"><?= e($m['label']) ?></a>
  <?php endforeach; ?>
</div>

<div class="container-fluid"><div class="row">
