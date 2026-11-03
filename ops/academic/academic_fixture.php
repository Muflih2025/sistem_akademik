<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') exit(2);
require dirname(__DIR__,2).'/config/config.php';
// Explicitly synthetic. No shared test DB, active DB, real students or legacy schedules.
if (app_setting('APP_ENV') !== 'testing' || DB_NAME !== 'sia_academic_dev_20261031'
    || DB_SOCKET === '' || app_setting('ALLOW_FIXTURE') !== '1') exit(2);
try {
    $pdo = db();
    if ((int)$pdo->query('SELECT @@skip_networking')->fetchColumn() !== 1) exit(2);
    if ((int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn() !== 0) exit(2);
    $credential = json_decode(file_get_contents($argv[1] ?? ''), true, 512, JSON_THROW_ON_ERROR);
    $hash = password_hash($credential['password'], PASSWORD_BCRYPT);
    $pdo->beginTransaction();
    $pdo->exec("INSERT INTO jurusan(id_jurusan,kode_jurusan,nama_jurusan) VALUES(1,'PPLG','Pengembangan Perangkat Lunak dan Gim (UJI)')");
    $pdo->exec("INSERT INTO kelas(id_kelas,nama_kelas,tingkat,id_jurusan) VALUES(1,'XII PPLG 2','XII',1),(2,'XII PPLG 1','XII',1)");
    $pdo->exec("INSERT INTO guru(id_guru,nip,nama_guru) VALUES(1,'UJI-GURU-1','Guru Pengajar Uji'),(2,'UJI-GURU-2','Guru Pembanding Uji'),(3,'UJI-PIKET-1','Guru Piket Uji')");
    $pdo->exec("INSERT INTO mata_pelajaran(id_mapel,kode_mapel,nama_mapel,kkm) VALUES(1,'UJI-PPL','Pemrograman (UJI)',75),(2,'UJI-BD','Basis Data (UJI)',75)");
    $pdo->exec("INSERT INTO tahun_ajaran(id_tahun_ajaran,tahun_ajaran,semester,status) VALUES(1,'2026/2027','Ganjil','Aktif'),(2,'2025/2026','Genap','Tidak Aktif')");
    $q = $pdo->prepare('INSERT INTO users(id_user,username,password,role,id_referensi) VALUES(?,?,?,?,?)');
    foreach ([[1,'uji_admin','admin',null],[2,'uji_guru','guru','1'],[3,'uji_guru_lain','guru','2'],[4,'uji_piket','guru','3'],[5,'uji_siswa','siswa','0000001'],[6,'uji_kepsek','kepala_sekolah',null]] as [$id,$username,$role,$ref]) $q->execute([$id,$username,$hash,$role,$ref]);
    $pdo->exec("INSERT INTO ak_periode VALUES(1,'2026-07-01','2026-12-31','1,2,3,4,5',1,'DATA SINTETIS UJI, bukan kalender resmi',1)");
    $q = $pdo->prepare("INSERT INTO siswa(nis,nama_siswa,jenis_kelamin,tanggal_lahir,id_kelas) VALUES(?,?,'L','2009-01-01',?)");
    $member = $pdo->prepare("INSERT INTO ak_anggota_kelas(nis,id_kelas,id_tahun_ajaran,nomor_absen,mulai,selesai,created_by) VALUES(?,?,1,?,'2026-07-01','2026-12-31',1)");
    for ($i=1; $i<=22; $i++) {
        $nis = str_pad((string)$i,7,'0',STR_PAD_LEFT); $kelas=$i<=20?1:2;
        $q->execute([$nis,'Siswa Uji '.str_pad((string)$i,2,'0',STR_PAD_LEFT),$kelas]);
        $member->execute([$nis,$kelas,$i<=20?$i:$i-20]);
    }
    $pdo->exec("INSERT INTO jadwal(id_jadwal,id_guru,id_mapel,id_kelas,hari,jam_mulai,jam_selesai,ruang,id_tahun_ajaran) VALUES(1,1,1,1,'Jumat','07:00','08:30','UJI-01',1),(2,2,2,2,'Jumat','07:00','08:30','UJI-02',1),(3,1,1,1,'Senin','07:00','08:30','UJI-01',1),(4,2,2,1,'Jumat','09:00','10:30','UJI-01',1),(5,1,1,1,'Kamis','07:00','08:30','LEGACY-UJI',NULL)");
    $pdo->exec("INSERT INTO ak_penugasan SELECT id_jadwal,'2026-07-01','2026-12-31',1,'Fixture sintetis eksplisit; bukan penugasan legacy',1 FROM jadwal WHERE id_jadwal IN(1,2,3,4)");
    $pdo->exec("INSERT INTO ak_tugas_piket(id_guru,id_tahun_ajaran,id_kelas,mulai,selesai,boleh_koreksi,catatan,created_by) VALUES(3,1,NULL,'2026-07-01','2026-12-31',0,'UJI: monitor seluruh sekolah tanpa koreksi',1)");
    $pdo->commit(); echo "Fixture sintetis: 20 siswa kelas utama, 2 siswa pembanding, 6 akun uji.\n";
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    fwrite(STDERR,"Pembuatan fixture gagal; rincian privat disembunyikan.\n"); exit(1);
}
