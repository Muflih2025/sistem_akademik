<?php
$role=current_user()['role'];
?><div class="panel"><h2>Selamat datang, <?=e(current_user()['username'])?></h2><p>Gunakan data uji untuk mencoba alur akademik. Absensi yang belum diperiksa tetap <strong>Belum Dikonfirmasi</strong>.</p><a class="button secondary" href="<?=e($role==='admin'?'/admin/master.php?table=siswa':ak_link(['guru'=>'pertemuan','siswa'=>'kehadiran','kepala_sekolah'=>'piket'][$role]))?>"><?=e($role==='admin'?'Kelola data master':($role==='guru'?'Mulai absensi':($role==='siswa'?'Lihat kehadiran saya':'Pantau kehadiran')))?></a></div>
<?php
$periodId=(int)active_period()['id_tahun_ajaran'];
if($role==='siswa')$metrics=['Rapor diterbitkan'=>(int)ak_query("SELECT COUNT(*) FROM ak_rapor_snapshot r JOIN ak_rapor_status s ON s.id_snapshot=r.id WHERE r.nis=? AND r.id_tahun_ajaran=? AND s.status='diterbitkan'",[(string)user_reference(),$periodId])->fetchColumn()];
elseif($role==='guru')$metrics=['Penugasan terverifikasi'=>count(ak_teacher_schedules()),'Pertemuan tersimpan'=>(int)ak_query('SELECT COUNT(*) FROM ak_pertemuan WHERE id_guru=? AND id_tahun_ajaran=?',[user_reference(),$periodId])->fetchColumn(),'Nilai tersimpan'=>(int)ak_query('SELECT COUNT(*) FROM ak_nilai WHERE id_guru=? AND id_tahun_ajaran=?',[user_reference(),$periodId])->fetchColumn()];
else $metrics=['Siswa aktif'=>(int)ak_query("SELECT COUNT(*) FROM siswa s WHERE status='aktif' AND NOT EXISTS(SELECT 1 FROM ak_kenaikan_detail d WHERE d.nis=s.nis AND d.hasil='alumni' AND d.tanggal_berlaku<=CURRENT_DATE)")->fetchColumn(),'Pertemuan tersimpan'=>(int)ak_query('SELECT COUNT(*) FROM ak_pertemuan WHERE id_tahun_ajaran=?',[$periodId])->fetchColumn(),'Rapor diterbitkan'=>(int)ak_query("SELECT COUNT(*) FROM ak_rapor_snapshot r JOIN ak_rapor_status s ON s.id_snapshot=r.id WHERE r.id_tahun_ajaran=? AND s.status='diterbitkan'",[$periodId])->fetchColumn()];
?><div class="card-grid"><?php foreach($metrics as $label=>$number):?><section class="panel"><p class="muted"><?=e($label)?></p><h2><?=e($number)?></h2></section><?php endforeach;?></div>
<div class="card-grid">
<?php
$cards=match($role){
    'admin'=>[['jam','Jam belajar','Kelola pola hari, jam pelajaran dan istirahat untuk seluruh kelas.'],['kenaikan','Naik Kelas','Pratinjau kenaikan tahunan dan kelulusan seluruh siswa.'],['alumni','Alumni','Cari alumni dan riwayat kelulusan.'],['fondasi','Fondasi akademik','Verifikasi periode, anggota kelas, penugasan, dan izin Guru Piket.'],['piket','Kehadiran sekolah','Pantau sesi yang belum terisi dan rekap harian.'],['kalender','Kalender akademik','Kelola kegiatan, hari efektif, ujian dan libur.']],
    'guru'=>[['pertemuan','Isi absensi kelas','Pilih jadwal. Verifikasi kehadiran, isi materi, lalu simpan sekali.'],['jurnal','Jurnal & agenda','Baca kembali pertemuan, refleksi dan riwayat perubahan.'],['piket','Tugas Guru Piket','Pemantauan sesuai cakupan dan izin tugas.']],
    'kepala_sekolah'=>[['jurnal','Supervisi KBM','Baca jurnal dan agenda pembelajaran.'],['piket','Kehadiran sekolah','Pantau pengisian dan rekap harian.'],['kalender','Kalender akademik','Tinjau agenda dan kegiatan sekolah.']],
    default=>[['rapor','Rapor saya','Hanya rapor yang telah diterbitkan dapat dilihat.'],['kalender','Kalender akademik','Lihat kegiatan yang telah disahkan.']],
};
foreach($cards as [$key,$label,$text]):?><a class="panel module-card" href="<?=e(ak_link($key))?>"><h2><?=e($label)?></h2><p><?=e($text)?></p><span>Buka →</span></a><?php endforeach;?></div>
<section class="panel"><h2>Alur data</h2><p>Penugasan + anggota kelas bertanggal → pertemuan → absensi sesi, jurnal dan agenda. Rekap harian sekolah ditetapkan terpisah melalui rekonsiliasi Guru Piket; bukti yang belum lengkap tidak dihitung Hadir atau Alpa.</p></section>

<?php if($role==='kepala_sekolah')require __DIR__.'/teaching_monitor.php';?>
