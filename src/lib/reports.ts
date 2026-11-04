import { createHash } from 'crypto';
import { AuthUser } from './auth';
import { Row, period, revisionCheck, dateValue } from './academic';
import { rows, one, fail, role, text, choice, hash, write, nextId, today } from './store';
export const homeroomRequired = () => process.env.HOMEROOM_MODE === 'required';
export function schoolDay(p:Row,date:string) {
  const events=rows("SELECT jenis FROM ak_kalender WHERE id_tahun_ajaran=? AND mulai<=? AND selesai>=? AND status='disahkan'",p.id_tahun_ajaran,date,date);
  if(events.some(e=>e.jenis==='Libur'))return false;if(events.some(e=>e.jenis==='Hari Efektif'))return true;
  return String(p.hari_efektif).split(',').includes(String(new Date(date+'T00:00:00Z').getUTCDay()||7));
}
export function reportSources(nis:string,year:string,cls:string,date:string) {
  return hash({nilai:rows('SELECT * FROM ak_nilai WHERE nis=? AND id_tahun_ajaran=? AND id_kelas=? ORDER BY id',nis,year,cls),harian:rows('SELECT * FROM ak_absensi_harian WHERE nis=? AND id_tahun_ajaran=? AND id_kelas=? AND tanggal<=? ORDER BY tanggal,id',nis,year,cls,date),anggota:rows('SELECT * FROM ak_anggota_kelas WHERE nis=? AND id_tahun_ajaran=? AND id_kelas=? ORDER BY id',nis,year,cls),periode:one('ak_periode',{id_tahun_ajaran:year}),kalender:rows("SELECT * FROM ak_kalender WHERE id_tahun_ajaran=? AND mulai<=? AND status='disahkan' ORDER BY id",year,date),penugasan:rows("SELECT j.*,a.mulai,a.selesai,a.terverifikasi FROM jadwal j JOIN ak_penugasan a ON a.id_jadwal=j.id_jadwal WHERE j.id_tahun_ajaran=? AND j.id_kelas=? AND a.terverifikasi='1' ORDER BY j.id_jadwal",year,cls)});
}
function wali(user:AuthUser,r:Row,date:string) {return rows("SELECT * FROM ak_wali_kelas WHERE id_guru=? AND id_kelas=? AND id_tahun_ajaran=? AND aktif='1' AND mulai<=? AND selesai>=?",user.id_referensi,r.id_kelas,r.id_tahun_ajaran,date,date)[0];}
export function readReport(user:AuthUser,id:string): Row {
  const snapshot=one('ak_rapor_snapshot',{id}),state=one('ak_rapor_status',{id_snapshot:id});
  if(!snapshot||!state)fail('Rapor tidak ditemukan.',404);
  if(user.role==='siswa'&&(snapshot.nis!==user.id_referensi||state.status!=='diterbitkan'))fail('Rapor belum diterbitkan atau bukan milik Anda.',403);
  if(user.role==='guru'&&!homeroomRequired())fail('Gunakan rekap nilai sesuai penugasan.',403);
  if(createHash('sha256').update(snapshot.payload_json).digest('hex')!==snapshot.payload_hash)fail('Integritas arsip rapor gagal.',409);
  const payload=JSON.parse(snapshot.payload_json);
  if(user.role==='guru'&&!wali(user,snapshot,payload.periode.batas_rekap))fail('Rapor di luar penugasan wali.',403);
  return {...snapshot,...state,id:snapshot.id,payload,reviews:rows('SELECT id,actor_id,keputusan,catatan,created_at FROM ak_review_rapor WHERE id_snapshot=? ORDER BY created_at',id)};
}
export function listReports(user:AuthUser,q:URLSearchParams) {
  role(user,'admin','kepala_sekolah','siswa',...(homeroomRequired()?['guru']:[]));
  const args:any[]=[];let where='WHERE 1=1';
  if(user.role==='siswa'){where+=" AND r.nis=? AND s.status='diterbitkan'";args.push(user.id_referensi);}
  for(const key of ['id_kelas','id_tahun_ajaran','nis'])if(q.get(key)){if(user.role==='siswa'&&key==='nis'&&q.get(key)!==user.id_referensi)fail('Akses ditolak.',403);where+=` AND r.${key}=?`;args.push(q.get(key));}
  const list=rows(`SELECT r.id,r.nis,r.id_kelas,r.id_tahun_ajaran,r.versi,r.created_at,s.status,s.revision,t.tahun_ajaran,t.semester,k.nama_kelas,st.nama_siswa FROM ak_rapor_snapshot r JOIN ak_rapor_status s ON s.id_snapshot=r.id JOIN tahun_ajaran t ON t.id_tahun_ajaran=r.id_tahun_ajaran JOIN kelas k ON k.id_kelas=r.id_kelas JOIN siswa st ON st.nis=r.nis ${where} ORDER BY r.created_at DESC,r.id DESC`,...args);
  return user.role==='guru'?list.filter(r=>{try{readReport(user,r.id);return true;}catch{return false;}}):list;
}
export function buildReport(user:AuthUser,input:Row) {
  role(user,'admin');const year=text(input.id_tahun_ajaran,'Periode'),date=dateValue(input.tanggal),p=period(year,true),nis=text(input.nis,'NIS',15);
  if(date>today()||date<p.mulai||date>p.selesai)fail('Batas rekap harus dalam periode dan tidak di masa mendatang.');
  const members=rows('SELECT a.*,s.nama_siswa,k.nama_kelas,j.nama_jurusan FROM ak_anggota_kelas a JOIN siswa s ON s.nis=a.nis JOIN kelas k ON k.id_kelas=a.id_kelas LEFT JOIN jurusan j ON j.id_jurusan=k.id_jurusan WHERE a.nis=? AND a.id_tahun_ajaran=? AND a.mulai<=? AND a.selesai>=?',nis,year,date,date);
  if(members.length!==1)fail('Keanggotaan siswa belum tersedia atau ambigu.',409);const m=members[0];
  const expected=rows("SELECT DISTINCT j.id_mapel FROM jadwal j JOIN ak_penugasan a ON a.id_jadwal=j.id_jadwal WHERE j.id_tahun_ajaran=? AND j.id_kelas=? AND a.terverifikasi='1'",year,m.id_kelas).map(x=>x.id_mapel).sort();
  const grades=rows('SELECT n.*,m.nama_mapel,r.versi versi_aturan,r.kkm,r.formula FROM ak_nilai n JOIN mata_pelajaran m ON m.id_mapel=n.id_mapel JOIN ak_aturan_nilai r ON r.id=n.id_aturan WHERE n.nis=? AND n.id_tahun_ajaran=? AND n.id_kelas=? ORDER BY n.id_mapel',nis,year,m.id_kelas);
  if(!expected.length||JSON.stringify(expected)!==JSON.stringify(grades.map(g=>g.id_mapel).sort())||grades.some(g=>g.nilai_akhir==null||!Number.isFinite(Number(g.nilai_akhir))))fail('Nilai seluruh mapel terverifikasi belum lengkap.',409);
  const counts:Row={H:0,S:0,I:0,A:0,B:0};const daily:Row={};for(const d of rows('SELECT tanggal,status FROM ak_absensi_harian WHERE nis=? AND id_tahun_ajaran=? AND id_kelas=? AND tanggal<=?',nis,year,m.id_kelas,date)){if(daily[d.tanggal])fail('Data harian ganda.',409);daily[d.tanggal]=d.status;}
  for(let d=[p.mulai,m.mulai].sort().at(-1)!;d<=[date,m.selesai].sort()[0];d=new Date(Date.parse(d+'T00:00:00Z')+86400000).toISOString().slice(0,10))if(schoolDay(p,d))counts[daily[d] in counts?daily[d]:'B']++;
  const payload={siswa:{nis,nama:m.nama_siswa,kelas:m.nama_kelas,jurusan:m.nama_jurusan,nomor_absen:m.nomor_absen},periode:{tahun_ajaran:p.tahun_ajaran,semester:p.semester,mulai:p.mulai,selesai:p.selesai,batas_rekap:date},nilai:grades,kehadiran_harian:counts,formula_predikat:'weighted_kkm_v1',dibuat_pada:new Date().toISOString(),source_hash:reportSources(nis,year,m.id_kelas,date),workflow_version:homeroomRequired()?2:3};
  const json=JSON.stringify(payload),version=Number(rows('SELECT COALESCE(MAX(CAST(versi AS INTEGER)),0) v FROM ak_rapor_snapshot WHERE nis=? AND id_tahun_ajaran=?',nis,year)[0].v)+1;
  const id=nextId('ak_rapor_snapshot','id');write(user,'ak_rapor_snapshot',{id},{nis,id_tahun_ajaran:year,id_kelas:m.id_kelas,versi:version,payload_json:json,payload_hash:createHash('sha256').update(json).digest('hex')},'Snapshot rapor baru');write(user,'ak_rapor_status',{id_snapshot:id},{status:'draft',revision:1},'Draft baru');return readReport(user,id);
}
export function transitionReport(user:AuthUser,input:Row) {
  role(user,'admin');const r=readReport(user,text(input.id,'Rapor')),before=one('ak_rapor_status',{id_snapshot:r.id});period(r.id_tahun_ajaran,true);revisionCheck(before,input.revision,input.alasan);
  const next=choice(input.status,['terverifikasi','diterbitkan','ditarik']);const allowed:Record<string,string[]>={draft:['terverifikasi'],terverifikasi:['diterbitkan','ditarik'],diterbitkan:['ditarik'],ditarik:[]};
  if(!allowed[r.status]?.includes(next))fail('Transisi tidak diizinkan. Buat snapshot baru untuk revisi.',409);
  if(next!=='ditarik') {
    if(r.payload.source_hash!==reportSources(r.nis,r.id_tahun_ajaran,r.id_kelas,r.payload.periode.batas_rekap))fail('Sumber berubah. Buat snapshot baru.',409);
    if(homeroomRequired()) {const review=rows('SELECT * FROM ak_review_rapor WHERE id_snapshot=? ORDER BY created_at DESC',r.id)[0],account=review&&one('users',{id_user:review.actor_id});if(!review||!account||account.status!=='aktif'||account.role!=='guru'||review.keputusan!=='disetujui'||review.payload_hash!==r.payload_hash||review.source_hash!==r.payload.source_hash||!wali({...user,id_referensi:account.id_referensi},r,r.payload.periode.batas_rekap))fail('Persetujuan wali yang masih berlaku wajib tersedia.',409);}
  }
  write(user,'ak_rapor_status',{id_snapshot:r.id},{status:next,revision:Number(r.revision)+1,verified_by:next==='terverifikasi'?user.id_user:r.verified_by,published_by:next==='diterbitkan'?user.id_user:r.published_by},text(input.alasan,'Alasan'));return readReport(user,r.id);
}
export function reviewReport(user:AuthUser,input:Row) {
  role(user,'guru');if(!homeroomRequired())fail('Mode wali saat ini bersifat informasional.',403);const r=readReport(user,text(input.id,'Rapor'));period(r.id_tahun_ajaran,true);revisionCheck(one('ak_rapor_status',{id_snapshot:r.id}),input.revision,input.catatan);
  if(r.status!=='draft'||r.payload.source_hash!==reportSources(r.nis,r.id_tahun_ajaran,r.id_kelas,r.payload.periode.batas_rekap))fail('Draft atau sumber telah berubah.',409);
  const task=wali(user,r,r.payload.periode.batas_rekap);write(user,'ak_review_rapor',{id:nextId('ak_review_rapor','id')},{id_snapshot:r.id,id_penugasan_wali:task.id,actor_id:user.id_user,keputusan:choice(input.keputusan,['disetujui','perlu_perbaikan']),catatan:text(input.catatan,'Catatan',1000),payload_hash:r.payload_hash,source_hash:r.payload.source_hash});write(user,'ak_rapor_status',{id_snapshot:r.id},{revision:Number(r.revision)+1},input.catatan);return readReport(user,r.id);
}
