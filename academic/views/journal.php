<?php
require_role('guru','admin','kepala_sekolah');
$role=current_user()['role'];
$args=[]; $scope='1=1';
if ($role==='guru') { $scope='p.id_guru=?'; $args[]=(int)user_reference(); }
if (isset($_GET['id'])) {
    $meeting=ak_one('SELECT p.*,k.nama_kelas,g.nama_guru,m.nama_mapel,x.nama_guru AS nama_pengganti FROM ak_pertemuan p JOIN kelas k ON k.id_kelas=p.id_kelas JOIN guru g ON g.id_guru=p.id_guru JOIN mata_pelajaran m ON m.id_mapel=p.id_mapel LEFT JOIN guru x ON x.id_guru=p.id_guru_pengganti WHERE '.$scope.' AND p.id=?',[...$args,input_id($_GET,'id')]);
    if (!$meeting) deny_access();
    $rows=ak_meeting_rows((int)$meeting['id']);
    ?><section class="panel"><p class="eyebrow">PERTEMUAN #<?=e($meeting['id'])?> · VERSI <?=e($meeting['revision'])?></p><h2><?=e($meeting['nama_kelas'])?> · <?=e($meeting['nama_mapel'])?></h2><p><?=e($meeting['tanggal'])?> · <?=e($meeting['nama_guru'])?> · Jam <?=e($meeting['jam_ke'])?> · Pertemuan <?=e($meeting['pertemuan_ke'])?></p><?php ak_summary_cards(ak_summary($rows));?><dl><?php foreach(['tp_atp'=>'TP / ATP','materi'=>'Materi','kegiatan'=>'Kegiatan','nama_pengganti'=>'Guru pengganti','refleksi'=>'Refleksi','catatan'=>'Catatan','tindak_lanjut'=>'Tindak lanjut'] as $key=>$label):?><dt><?=e($label)?></dt><dd><?=e($meeting[$key]??'—')?></dd><?php endforeach;?></dl><?php if($role==='guru'):?><div class="actions"><a class="button" href="<?=e(ak_link('pertemuan',['id_jadwal'=>$meeting['id_jadwal'],'tanggal'=>$meeting['tanggal']]))?>">Edit absensi & jurnal</a></div><?php endif;ak_exports('jurnal',['id'=>$meeting['id']]);?></section><section class="panel"><h2>Daftar hadir pertemuan</h2><div class="table-scroll"><table><thead><tr><th>No.</th><th>NIS</th><th>Nama</th><th>Status</th><th>Keterangan</th></tr></thead><tbody><?php foreach($rows as $row):?><tr><td><?=e($row['nomor_absen'])?></td><td><?=e($row['nis'])?></td><td><?=e($row['nama_snapshot'])?></td><td><?=e(AK_STATUSES[$row['status']])?></td><td class="wrap"><?=e($row['keterangan'])?></td></tr><?php endforeach;?></tbody></table></div></section><?php return;
}
$period=isset($_GET['id_tahun_ajaran'])?input_id($_GET,'id_tahun_ajaran'):(int)active_period()['id_tahun_ajaran'];
$scope.=' AND p.id_tahun_ajaran=?'; $args[]=$period;
$policy=ak_period($period);$from=isset($_GET['mulai'])?input_date($_GET,'mulai'):$policy['mulai'];$until=isset($_GET['selesai'])?input_date($_GET,'selesai'):min($policy['selesai'],date('Y-m-d'));
if($from>$until)throw new InputError('Rentang jurnal tidak berurutan.');ak_period($period,false,$from);ak_period($period,false,$until);
$scope.=' AND p.tanggal BETWEEN ? AND ?';$args[]=$from;$args[]=$until;
$class=isset($_GET['id_kelas'])&&$_GET['id_kelas']!==''?input_id($_GET,'id_kelas'):null;if($class!==null){$scope.=' AND p.id_kelas=?';$args[]=$class;}
$periodOptions=[];foreach(ak_rows('SELECT t.* FROM tahun_ajaran t JOIN ak_periode a USING(id_tahun_ajaran) WHERE a.terverifikasi=1 ORDER BY t.id_tahun_ajaran DESC') as $t)$periodOptions[$t['id_tahun_ajaran']]=$t['tahun_ajaran'].' '.$t['semester'];
$classOptions=$role==='guru'?[]:crud_options('kelas','id_kelas','nama_kelas',false);if($role==='guru')foreach(ak_teacher_schedules() as $j)$classOptions[$j['id_kelas']]=$j['nama_kelas'];
?><form method="get" class="panel form-grid filter"><?php ak_hidden('view','jurnal');ak_select('id_tahun_ajaran','Periode',$periodOptions,$period);ak_select('id_kelas','Kelas',$classOptions,$class??'',false);ak_field('mulai','Dari tanggal',$from,'date');ak_field('selesai','Sampai tanggal',$until,'date');?><button class="secondary">Terapkan filter</button></form><?php
$exportContext=['id_tahun_ajaran'=>$period,'mulai'=>$from,'selesai'=>$until]+($class!==null?['id_kelas'=>$class]:[]);

?><section class="panel"><p>Jurnal kelas dan agenda harian mengambil satu record pertemuan yang sama. Koreksi pada form pertemuan langsung terlihat pada kedua tampilan.</p><?php ak_exports('agenda',$exportContext);?></section>
<?php $journalTotal=(int)ak_query('SELECT COUNT(*) FROM ak_pertemuan p WHERE '.$scope,$args)->fetchColumn();[$page,$journalPages,$offset]=crud_page_bounds($journalTotal);$rows=ak_rows('SELECT p.*,k.nama_kelas,m.nama_mapel,g.nama_guru FROM ak_pertemuan p JOIN kelas k ON k.id_kelas=p.id_kelas JOIN mata_pelajaran m ON m.id_mapel=p.id_mapel JOIN guru g ON g.id_guru=p.id_guru WHERE '.$scope.' ORDER BY p.tanggal DESC,p.id DESC LIMIT '.crud_page_limit().' OFFSET '.$offset,$args);if(!$rows):?><div class="panel">Belum ada pertemuan tersimpan pada periode ini.</div><?php endif;foreach($rows as $row):?><article class="panel"><p class="eyebrow"><?=e($row['tanggal'])?> · JAM <?=e($row['jam_ke'])?></p><h2><?=e($row['nama_kelas'])?> · <?=e($row['nama_mapel'])?></h2><p><?=e($row['nama_guru'])?> · Pertemuan <?=e($row['pertemuan_ke'])?></p><p><?=e(mb_substr($row['materi'],0,200))?></p><a class="button secondary" href="<?=e(ak_link('jurnal',['id'=>$row['id']]))?>">Lihat jurnal & daftar hadir</a></article><?php endforeach;?>

<?php crud_pager($page,$journalPages,$journalTotal);?>
