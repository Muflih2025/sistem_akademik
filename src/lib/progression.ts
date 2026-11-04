import { AuthUser } from './auth';
import { Row, period } from './academic';
import { rows, one, fail, role, text, write, nextId, hash } from './store';
export function progressionPlan(user:AuthUser,input:Row) {
  role(user,'admin');const from=period(text(input.periode_asal,'Periode asal')),to=period(text(input.periode_tujuan,'Periode tujuan'));
  if(from.dikunci==='1'||to.dikunci==='1'||from.semester!=='Genap'||to.semester!=='Ganjil'||Number(from.tahun_ajaran.slice(0,4))+1!==Number(to.tahun_ajaran.slice(0,4))||from.selesai>=to.mulai)fail('Kenaikan harus Genap ke Ganjil tahun berikutnya, tidak terkunci, tanpa tanggal bertumpang tindih.');
  const mapping=input.tujuan;if(!mapping||typeof mapping!=='object'||Array.isArray(mapping))fail('Pemetaan kelas tidak valid.');text(input.alasan,'Alasan');
  const members=rows('SELECT a.*,s.nama_siswa,s.status,k.nama_kelas,k.tingkat,k.id_jurusan,k.status status_kelas FROM ak_anggota_kelas a JOIN siswa s ON s.nis=a.nis JOIN kelas k ON k.id_kelas=a.id_kelas WHERE a.id_tahun_ajaran=? AND a.mulai<=? AND a.selesai>=? ORDER BY a.id_kelas,a.nomor_absen,a.nis',from.id_tahun_ajaran,from.selesai,from.selesai);
  if(!members.length||members.length>5000||new Set(members.map(r=>r.nis)).size!==members.length)fail('Roster asal kosong, ganda, atau melebihi 5000 siswa.',409);
  const classes:Row={},destinations=new Set(),rolls=new Set();
  for(const r of members) {
    if(r.status!=='aktif'||r.status_kelas!=='aktif'||!['X','XI','XII'].includes(r.tingkat)||rolls.has(`${r.id_kelas}/${r.nomor_absen}`))fail('Siswa/kelas nonaktif atau nomor absen ganda.',409);rolls.add(`${r.id_kelas}/${r.nomor_absen}`);
    if(rows("SELECT 1 FROM ak_kenaikan_detail WHERE nis=? AND (periode_asal=? OR (hasil='alumni' AND tanggal_berlaku<=?))",r.nis,from.id_tahun_ajaran,to.selesai).length||rows('SELECT 1 FROM ak_anggota_kelas WHERE nis=? AND mulai<=? AND selesai>=?',r.nis,to.selesai,to.mulai).length)fail('Siswa sudah diproses atau memiliki keanggotaan tujuan.',409);
    if(!classes[r.id_kelas]) {
      const target=mapping[r.id_kelas];if(r.tingkat==='XII'){if(target!=='alumni')fail('Kelas XII harus menuju Alumni.');classes[r.id_kelas]={asal:r.nama_kelas,tujuan:'Alumni',id_tujuan:null,jumlah:0};}
      else {const k=one('kelas',{id_kelas:String(target)});if(!k||k.status!=='aktif'||k.tingkat!==(r.tingkat==='X'?'XI':'XII')||k.id_jurusan!==r.id_jurusan||destinations.has(k.id_kelas))fail('Tujuan harus satu tingkat di atas, jurusan sama, dan tidak digabung.');
        if(rows('SELECT 1 FROM ak_anggota_kelas WHERE id_kelas=? AND id_tahun_ajaran=?',k.id_kelas,to.id_tahun_ajaran).length||rows('SELECT 1 FROM ak_pertemuan WHERE id_kelas=? AND tanggal BETWEEN ? AND ?',k.id_kelas,to.mulai,to.selesai).length||rows('SELECT 1 FROM ak_absensi_harian WHERE id_kelas=? AND tanggal BETWEEN ? AND ?',k.id_kelas,to.mulai,to.selesai).length)fail('Kelas tujuan sudah berisi data atau riwayat.',409);
        destinations.add(k.id_kelas);classes[r.id_kelas]={asal:r.nama_kelas,tujuan:k.nama_kelas,id_tujuan:k.id_kelas,jumlah:0};}
    }classes[r.id_kelas].jumlah++;
  }
  if(Object.keys(mapping).length!==Object.keys(classes).length)fail('Pemetaan harus mencakup tepat seluruh kelas asal.');
  return {from,to,members,classes,source_hash:hash([from,to,members,classes])};
}
export function commitProgression(user:AuthUser,input:Row) {
  if(input.konfirmasi!==true)fail('Konfirmasi preview wajib dicentang.');const plan=progressionPlan(user,input);if(plan.source_hash!==input.source_hash)fail('Sumber berubah sejak preview. Buat preview baru.',409);
  const id=nextId('ak_kenaikan_batch','id');write(user,'ak_kenaikan_batch',{id},{periode_asal:plan.from.id_tahun_ajaran,periode_tujuan:plan.to.id_tahun_ajaran,tanggal_berlaku:plan.to.mulai,alasan:text(input.alasan,'Alasan'),source_hash:plan.source_hash,jumlah:plan.members.length});
  for(const m of plan.members){const c=plan.classes[m.id_kelas];let target=null;if(c.id_tujuan){target=nextId('ak_anggota_kelas','id');write(user,'ak_anggota_kelas',{id:target},{nis:m.nis,id_kelas:c.id_tujuan,id_tahun_ajaran:plan.to.id_tahun_ajaran,nomor_absen:m.nomor_absen,mulai:plan.to.mulai,selesai:plan.to.selesai},input.alasan);}
    write(user,'ak_kenaikan_detail',{id:nextId('ak_kenaikan_detail','id')},{id_batch:id,nis:m.nis,periode_asal:plan.from.id_tahun_ajaran,id_anggota_asal:m.id,id_anggota_tujuan:target,hasil:target?'naik':'alumni',tanggal_berlaku:plan.to.mulai},input.alasan);}
  return {id,jumlah:plan.members.length};
}
export function alumni(user:AuthUser,q='') {role(user,'admin');return rows("SELECT d.*,s.nama_siswa,k.nama_kelas,t.tahun_ajaran FROM ak_kenaikan_detail d JOIN siswa s ON s.nis=d.nis JOIN ak_anggota_kelas a ON a.id=d.id_anggota_asal JOIN kelas k ON k.id_kelas=a.id_kelas JOIN tahun_ajaran t ON t.id_tahun_ajaran=d.periode_asal WHERE d.hasil='alumni' AND (s.nis LIKE ? OR s.nama_siswa LIKE ? OR k.nama_kelas LIKE ?) ORDER BY d.tanggal_berlaku DESC,d.id",`%${q}%`,`%${q}%`,`%${q}%`);}
