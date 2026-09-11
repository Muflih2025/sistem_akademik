<?php
require_once __DIR__.'/config/config.php';
if (current_user()) { redirect(dashboard_path(current_user()['role'])); }
?><!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= e(APP_NAME) ?></title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="assets/css/app.css" rel="stylesheet">
  <style>
    .landing-hero{background:linear-gradient(135deg,#082b52 0%,#0d6efd 100%);min-height:470px;color:#fff}
    .landing-hero h1{color:#fff;font-size:clamp(2rem,5vw,3.7rem)}
    .landing-hero p{color:#dcecff;max-width:620px}
    .feature-icon{width:48px;height:48px;border-radius:12px;background:#eaf2fc;color:#0d6efd;display:grid;place-items:center;font-size:1.35rem}
    .school-mark{width:76px;height:76px;border-radius:50%;background:#fff;color:#082b52;display:grid;place-items:center;font-size:2rem;font-weight:800;box-shadow:0 8px 22px #001b3c55}
  </style>
</head>
<body>
  <nav class="navbar navbar-expand-lg navbar-dark bg-navy">
    <div class="container py-2">
      <a class="navbar-brand fw-bold" href="index.php">SMKN 2 Magelang</a>
      <a class="btn btn-light text-primary fw-semibold" href="auth/login.php">Masuk ke Sistem</a>
    </div>
  </nav>

  <section class="landing-hero d-flex align-items-center">
    <div class="container py-5">
      <div class="row align-items-center g-5">
        <div class="col-lg-8">
          <div class="school-mark mb-4">S2</div>
          <h1>Sistem Informasi Akademik<br>SMK Negeri 2 Magelang</h1>
          <p class="lead mt-3">Platform terpadu untuk mengelola data akademik, jadwal pelajaran, nilai, rapor, dan laporan sekolah secara mudah dan terstruktur.</p>
          <a class="btn btn-warning btn-lg mt-3 px-4" href="auth/login.php">Mulai Sekarang</a>
        </div>
        <div class="col-lg-4 d-none d-lg-block">
          <div class="card p-4 text-dark">
            <h4>Portal Akademik</h4>
            <p class="text-muted mb-3">Akses sesuai peran pengguna:</p>
            <div class="d-flex justify-content-between border-bottom py-2"><span>Administrator</span><span class="badge text-bg-primary">Kelola</span></div>
            <div class="d-flex justify-content-between border-bottom py-2"><span>Guru</span><span class="badge text-bg-success">Mengajar</span></div>
            <div class="d-flex justify-content-between border-bottom py-2"><span>Kepala Sekolah</span><span class="badge text-bg-warning">Monitor</span></div>
            <div class="d-flex justify-content-between py-2"><span>Siswa</span><span class="badge text-bg-info">Belajar</span></div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="container py-5">
    <div class="text-center mb-4"><h2>Fitur Utama</h2><p class="text-muted">Semua kebutuhan akademik dalam satu sistem.</p></div>
    <div class="row g-4">
      <div class="col-md-4"><div class="card h-100 p-4"><div class="feature-icon mb-3">▣</div><h5>Data Akademik Terpusat</h5><p class="text-muted mb-0">Kelola data siswa, guru, kelas, jurusan, mata pelajaran, dan tahun ajaran dengan rapi.</p></div></div>
      <div class="col-md-4"><div class="card h-100 p-4"><div class="feature-icon mb-3">✓</div><h5>Nilai dan Rapor</h5><p class="text-muted mb-0">Guru dapat memasukkan nilai, sedangkan siswa dapat melihat rapor pribadi beserta status ketuntasan.</p></div></div>
      <div class="col-md-4"><div class="card h-100 p-4"><div class="feature-icon mb-3">▤</div><h5>Laporan Akademik</h5><p class="text-muted mb-0">Kepala sekolah dapat memantau capaian akademik dan menyimpan catatan evaluasi sekolah.</p></div></div>
    </div>
  </section>

  <footer class="bg-navy text-white text-center py-4"><small>&copy; <?= date('Y') ?> SMK Negeri 2 Magelang · Sistem Informasi Akademik</small></footer>
</body>
</html>
