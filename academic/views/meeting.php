<?php
require_role('guru');
$schedules=ak_teacher_schedules();
if (!$schedules) { echo '<div class="panel">Belum ada penugasan dengan periode dan rentang tanggal terverifikasi. Hubungi admin.</div>'; return; }
$scheduleId=isset($_GET['id_jadwal'])?input_id($_GET,'id_jadwal'):(int)$schedules[0]['id_jadwal'];
$schedule=ak_schedule($scheduleId);
$dayNumbers=['Senin'=>1,'Selasa'=>2,'Rabu'=>3,'Kamis'=>4,'Jumat'=>5];
$default=new DateTimeImmutable('today'); while((int)$default->format('N')!==$dayNumbers[$schedule['hari']]) $default=$default->modify('-1 day');
$date=isset($_GET['tanggal'])?input_date($_GET,'tanggal'):$default->format('Y-m-d');
ak_schedule($scheduleId,false,$date);
$meeting=ak_one('SELECT * FROM ak_pertemuan WHERE id_jadwal=? AND tanggal=?',[$scheduleId,$date]);
$roster=ak_roster((int)$schedule['id_kelas'],(int)$schedule['id_tahun_ajaran'],$date);
$stored=[]; if($meeting) foreach(ak_meeting_rows((int)$meeting['id']) as $row) $stored[$row['nis']]=$row;
$options=[];foreach($schedules as $row)$options[$row['id_jadwal']]=$row['nama_kelas'].' · '.$row['nama_mapel'].' · '.$row['hari'].' '.substr($row['jam_mulai'],0,5);
?><p><a class="button secondary" href="<?=e(ak_link('pertemuan',['upload'=>1,'module'=>'absensi','id_jadwal'=>$scheduleId,'tanggal'=>$date]))?>">Bulk Upload Excel Absensi</a></p><form method="get" class="panel form-grid"><?php ak_hidden('view','pertemuan');ak_select('id_jadwal','Jadwal mengajar',$options,$scheduleId);ak_field('tanggal','Tanggal',$date,'date');?><button class="secondary">Tampilkan kelas</button></form>
<section class="panel class-heading"><div><p class="eyebrow">ABSENSI KELAS</p><h2><?=e($schedule['nama_kelas'])?></h2><p><?=e($schedule['nama_mapel'])?> · <?=e($schedule['hari'])?>, <?=e($date)?></p><p class="muted"><?=count($roster)?> siswa · <?=e($schedule['nama_guru'])?></p></div><span class="pill"><?=$meeting?'Tersimpan · versi '.e($meeting['revision']):'Belum diisi'?></span></section>
<?php if(!$roster):?><div class="notice">Anggota kelas pada tanggal ini belum ditetapkan. Pengisian dinonaktifkan.</div><?php return;endif;?>
<form method="post" id="meeting-form" data-attendance-form>
<?=csrf_field()?><?php ak_hidden('action','pertemuan');ak_hidden('id_jadwal',$scheduleId);ak_hidden('tanggal',$date);ak_hidden('revision',$meeting['revision']??0);?>
<section class="panel"><h2>Periksa kehadiran</h2><p class="muted">H = Hadir · S = Sakit · I = Izin · A = Alpa · ? = Belum Dikonfirmasi</p>
<?php ak_summary_cards(ak_summary(array_map(fn($s)=>['status'=>$stored[$s['nis']]['status']??'B'],$roster)));?>
<label class="check"><input type="checkbox" name="terverifikasi" value="1" id="verified"><span>Saya telah memeriksa kehadiran dan informasi ketidakhadiran siswa.</span></label>
<div class="attendance-tools"><label class="search"><span>Cari siswa</span><input type="search" id="student-search" placeholder="Nama, NIS, atau nomor absen" autocomplete="off"></label><button type="button" id="all-present" class="secondary">Tandai Semua Hadir</button></div>
<p id="attendance-feedback" role="status" class="muted">Status awal adalah Belum Dikonfirmasi. Verifikasi sebelum menandai hadir.</p></section>
<div class="students">
<?php foreach($roster as $student):$nis=$student['nis'];$row=$stored[$nis]??[];$status=$row['status']??'B';$parts=preg_split('/\s+/u',trim($student['nama_siswa']));$initial=mb_strtoupper(mb_substr($parts[0]??'S',0,1).mb_substr($parts[count($parts)-1]??'',0,1));?>
<article class="student-card" data-student="<?=e(mb_strtolower($student['nama_siswa'].' '.$nis.' '.$student['nomor_absen']))?>"><div class="student-info"><span class="avatar" aria-hidden="true"><?=e($initial)?></span><div><h3><?=e($student['nama_siswa'])?></h3><p>No. <?=e($student['nomor_absen'])?> · NIS <?=e($nis)?></p></div></div>
<fieldset class="status-options"><legend class="sr-only">Status <?=e($student['nama_siswa'])?></legend><?php foreach(AK_STATUSES as $code=>$label):?><label title="<?=e($label)?>"><input type="radio" name="status[<?=e($nis)?>]" value="<?=e($code)?>" <?=$status===$code?'checked':''?>><span><?=$code==='B'?'?':e($code)?><small><?=e($code==='B'?'Belum':$label)?></small></span></label><?php endforeach;?></fieldset>
<label class="field note"><span>Keterangan <?=e($student['nomor_absen'])?></span><input name="keterangan[<?=e($nis)?>]" value="<?=e($row['keterangan']??'')?>" maxlength="500" placeholder="Keterangan (opsional)"></label></article>
<?php endforeach;?></div>
<section class="panel"><h2>Jurnal & agenda pertemuan</h2><p class="muted">Disimpan bersama absensi dengan satu identitas pertemuan.</p><div class="form-grid"><?php ak_field('pertemuan_ke','Pertemuan ke',$meeting['pertemuan_ke']??1,'number');ak_field('jam_ke','Jam ke',$meeting['jam_ke']??'1–2');?></div>
<?php foreach(['tp_atp'=>'TP / ATP','materi'=>'Materi pembelajaran','kegiatan'=>'Kegiatan pembelajaran','refleksi'=>'Refleksi KBM','catatan'=>'Catatan','tindak_lanjut'=>'Tindak lanjut'] as $key=>$label)ak_textarea($key,$label,$meeting[$key]??'',in_array($key,['materi','kegiatan'],true));
$teachers=[];foreach(ak_rows("SELECT id_guru,nama_guru FROM guru WHERE status='aktif' ORDER BY nama_guru") as $row)$teachers[$row['id_guru']]=$row['nama_guru'];ak_select('id_guru_pengganti','Guru pengganti (pencatatan, tidak memberi akses)',$teachers,$meeting['id_guru_pengganti']??'',false);
ak_field('alasan',$meeting?'Alasan koreksi (wajib)':'Catatan pengisian','', 'text',(bool)$meeting);?>
<button class="save-button" type="submit">Simpan Absensi & Jurnal</button></section></form>
<?php if($meeting):ak_exports('jurnal',['id'=>(int)$meeting['id']]);$history=ak_rows("SELECT r.action,r.alasan,r.created_at,u.username FROM ak_riwayat r JOIN users u ON u.id_user=r.actor_id WHERE r.entity='pertemuan' AND r.record_id=? ORDER BY r.id DESC LIMIT 30",[(string)$meeting['id']]);?><section class="panel"><h2>Matriks kehadiran sesi bulan ini</h2><?php $period=ak_period((int)$schedule['id_tahun_ajaran']);ak_exports('sesi',['id_jadwal'=>$scheduleId,'id_tahun_ajaran'=>$schedule['id_tahun_ajaran'],'mulai'=>max($period['mulai'],$schedule['berlaku_mulai'],substr($date,0,8).'01'),'selesai'=>$date]);?></section><section class="panel"><h2>Riwayat pengisian</h2><?php foreach($history as $item):?><p><strong><?=e($item['username'])?></strong> · <?=e($item['created_at'])?> · <?=e($item['action'])?><br><?=e($item['alasan'])?></p><?php endforeach;?></section><?php endif;?>

<?php if($meeting):$changes=ak_rows("SELECT r.*,u.username,a.nama_snapshot FROM ak_riwayat r JOIN users u ON u.id_user=r.actor_id JOIN ak_absensi_sesi a ON r.entity='sesi' AND r.record_id=CONCAT(a.id_pertemuan,':',a.nis) WHERE a.id_pertemuan=? ORDER BY r.id DESC LIMIT 100",[$meeting['id']]);?><details class="panel"><summary>Riwayat perubahan status per siswa (100 terbaru)</summary><?php foreach($changes as $change):$before=json_decode($change['sebelum']??'null',true);$after=json_decode($change['sesudah']??'null',true);?><p class="history-entry"><strong><?=e($change['nama_snapshot'])?></strong> · <?=e($before['status']??'Belum diisi')?> → <?=e($after['status']??'B')?><br><?=e($change['username'])?> · <?=e($change['created_at'])?><br><?=e($change['alasan'])?></p><?php endforeach;?></details><?php endif;?>
