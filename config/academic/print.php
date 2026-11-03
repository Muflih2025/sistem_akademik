<?php
declare(strict_types=1);
function ak_print_journal(array $meeting,array $students): string {
    $counts=ak_summary($students);$absent=[];
    foreach($students as $s)if($s['status']!=='H')$absent[]=$s['nomor_absen'].'. '.$s['nama_snapshot'].' ('.$s['status'].')'.($s['keterangan']!==''?' — '.$s['keterangan']:'');
    $html='<h2>JURNAL KEGIATAN BELAJAR MENGAJAR</h2><p>Kelas: '.e($meeting['nama_kelas']).' · Tahun ajaran: '.e($meeting['tahun_ajaran']).' / '.e($meeting['semester']).'</p>';
    $html.='<table><thead><tr><th>Tanggal</th><th>Jam ke / Pertemuan</th><th>Mapel / Guru</th><th>TP/ATP</th><th>Materi / Kegiatan</th><th>Ketidakhadiran</th><th>Catatan / Tindak lanjut</th><th>Paraf guru</th></tr></thead><tbody><tr>';
    $cells=[$meeting['tanggal'],$meeting['jam_ke'].' / '.$meeting['pertemuan_ke'],$meeting['nama_mapel']."\n".$meeting['nama_guru'].($meeting['pengganti']?"\nPengganti: ".$meeting['pengganti']:''),$meeting['tp_atp'],$meeting['materi']."\nKegiatan: ".$meeting['kegiatan'],implode("\n",$absent)?:'Tidak ada siswa tidak hadir',$meeting['catatan']."\nTindak lanjut: ".$meeting['tindak_lanjut'],''];
    foreach($cells as $cell)$html.='<td>'.e($cell).'</td>';
    $html.='</tr></tbody></table><p>';
    foreach(AK_STATUSES as $code=>$label)$html.=e($code.' '.$label.': '.$counts[$code]).' · ';
    $html.='</p><p>Refleksi KBM: '.e($meeting['refleksi']).'</p><h3>Daftar Hadir Siswa — Pertemuan #'.e($meeting['id']).'</h3><table><thead><tr><th>No. absen</th><th>NIS</th><th>Nama siswa</th><th>H/S/I/A/B</th><th>Keterangan</th></tr></thead><tbody>';
    foreach($students as $row){$html.='<tr>';foreach([$row['nomor_absen'],$row['nis'],$row['nama_snapshot'],$row['status'],$row['keterangan']] as $cell)$html.='<td>'.e($cell).'</td>';$html.='</tr>';}
    return $html.'</tbody></table><p>Paraf disediakan untuk pengesahan manual; dokumen ini tidak memuat tanda tangan digital.</p>';
}
function ak_print_agenda(array $meetings): string {
    $html='<h2>BUKU AGENDA HARIAN GURU</h2><table><thead><tr><th>No.</th><th>Tanggal</th><th>Kelas / Mapel</th><th>Jam ke / Pertemuan</th><th>TP / ATP</th><th>Uraian materi & kegiatan</th><th>Siswa tidak hadir / belum dikonfirmasi</th><th>Guru / Pengganti</th><th>Refleksi KBM</th><th>Catatan / Tindak lanjut</th><th>Paraf</th></tr></thead><tbody>';
    foreach($meetings as $i=>$m){$html.='<tr>';foreach([$i+1,$m['tanggal'],$m['nama_kelas']."\n".$m['nama_mapel'],$m['jam_ke'].' / '.$m['pertemuan_ke'],$m['tp_atp'],$m['materi']."\n".$m['kegiatan'],$m['tidak_hadir'],$m['nama_guru'].($m['pengganti']?"\nPengganti: ".$m['pengganti']:''),$m['refleksi'],$m['catatan']."\n".$m['tindak_lanjut'],''] as $cell)$html.='<td>'.e($cell).'</td>';$html.='</tr>';}
    return $html.'</tbody></table>';
}
