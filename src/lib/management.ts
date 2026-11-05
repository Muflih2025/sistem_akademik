import { AuthUser } from './auth';
import { currentSchoolYear } from './academic-year';
import { Row, dateValue } from './academic';
import { audit, db, ensureVersion, fail, one, role, rows, text, today, write } from './store';

// The audit is also the deletion marker for records retained by historical data.
export function visibleRecordSql(table:string,pk:string,alias=table) {
  return `COALESCE((SELECT h.action FROM ak_riwayat h WHERE h.entity='${table}' AND h.record_id=CAST(${alias}.${pk} AS TEXT) ORDER BY h.rowid DESC LIMIT 1),'') NOT IN ('hapus','cabut')`;
}
export function actionReason(user:AuthUser,input:Row,before:Row|undefined) {
  role(user,'admin');
  if(!before)fail('Data tidak ditemukan.',404);
  ensureVersion(before,input);
  if(input.konfirmasi!==true)fail('Konfirmasi tindakan diperlukan.');
  return text(input.alasan,'Alasan tindakan',500);
}
const references:Record<string,string[]>={
  siswa:['nis'],guru:['id_guru','id_guru_pengganti','id_guru_pembina'],kelas:['id_kelas'],jurusan:['id_jurusan'],mata_pelajaran:['id_mapel'],ak_ruang:['ruang'],tahun_ajaran:['id_tahun_ajaran','periode_asal','periode_tujuan'],jadwal:['id_jadwal'],ekstrakurikuler:['id_ekskul'],ak_anggota_kelas:['id_anggota','id_anggota_asal','id_anggota_tujuan'],ak_penugasan:['id_jadwal'],ak_periode:['id_tahun_ajaran'],ak_tugas_piket:[],ak_wali_kelas:['id_penugasan_wali'],ak_kalender:[],ak_jam_belajar:[],catatan_evaluasi:[],ak_rapor_snapshot:['id_snapshot'],
};
function used(table:string,pk:string,before:Row) {
  if(table==='users')return false;
  if(['siswa','guru'].includes(table)&&rows('SELECT 1 FROM users WHERE role=? AND id_referensi=? LIMIT 1',table,before[pk]).length)return true;
  for(const {name} of rows("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")) {
    if(name===table||name==='ak_riwayat')continue;
    if(table==='ak_penugasan'&&name==='jadwal'||table==='ak_periode'&&name==='tahun_ajaran')continue;
    const columns=rows(`PRAGMA table_info("${name}")`).map(c=>c.name);
    for(const key of references[table]||[])if(columns.includes(key)) {
      const value=table==='ak_ruang'?before.nama_ruang:before[pk];
      if(rows(`SELECT 1 FROM "${name}" WHERE "${key}"=? LIMIT 1`,value).length)return true;
    }
  }
  return false;
}
export function removeManaged(user:AuthUser,table:string,pk:string,id:string,input:Row,action='hapus') {
  const before=one(table,{[pk]:id}),reason=actionReason(user,input,before);
  if(table==='users'&&before?.role==='admin'&&before.status==='aktif'&&rows("SELECT 1 FROM users WHERE role='admin' AND status='aktif'").length<=1)fail('Admin aktif terakhir tidak dapat dihapus.',409);
  let after:Row|null=null;
  if(used(table,pk,before!)) {
    const changes:Row={};
    if('status' in before!)changes.status=table==='tahun_ajaran'?'Tidak Aktif':'nonaktif';
    if('aktif' in before!)changes.aktif='0';
    if('terverifikasi' in before!)changes.terverifikasi='0';
    if(Object.keys(changes).length)after=write(user,table,{[pk]:id},changes,reason);
    else after=before!;
  } else db.prepare(`DELETE FROM ${table} WHERE rowid=?`).run(before!._rowid);
  if(['siswa','guru'].includes(table))for(const u of rows('SELECT * FROM users WHERE role=? AND id_referensi=?',table,id))write(user,'users',{id_user:u.id_user},{status:'nonaktif'},reason);
  audit(user,table,id,before,after,reason,action);
  return {[pk]:id,removed:true,archived:!!after};
}
export function restoreManaged(user:AuthUser,table:string,pk:string,id:string,input:Row) {
  const before=one(table,{[pk]:id}),reason=actionReason(user,input,before);
  const event=rows('SELECT * FROM ak_riwayat WHERE entity=? AND record_id=? ORDER BY rowid DESC LIMIT 1',table,id)[0];
  if(!event||!['hapus','cabut'].includes(event.action))fail('Data tidak sedang dihapus atau dicabut.',409);
  const original=JSON.parse(event.sebelum),changes:Row={};
  for(const key of ['status','aktif','terverifikasi'])if(key in before!)changes[key]=original[key];
  if(table==='ak_anggota_kelas') {
    if(rows('SELECT 1 FROM ak_anggota_kelas WHERE id<>? AND id_tahun_ajaran=? AND mulai<=? AND selesai>=? AND (nis=? OR (id_kelas=? AND nomor_absen=?))',id,original.id_tahun_ajaran,original.selesai,original.mulai,original.nis,original.id_kelas,original.nomor_absen).length)fail('Sudah ada penetapan baru yang bertumpang tindih. Gunakan penetapan yang aktif.',409);
    changes.selesai=original.selesai;
  }
  if(table==='tahun_ajaran'&&changes.status==='Aktif') {
    const current=currentSchoolYear();
    if(original.tahun_ajaran!==current.tahun_ajaran||original.semester!==current.semester||rows("SELECT 1 FROM tahun_ajaran WHERE status='Aktif' AND id_tahun_ajaran<>?",id).length)changes.status='Tidak Aktif';
  }
  if(table==='jadwal'&&changes.status==='aktif'&&rows("SELECT 1 FROM jadwal WHERE status='aktif' AND id_tahun_ajaran=? AND hari=? AND substr(jam_mulai,1,5)<? AND substr(jam_selesai,1,5)>? AND (id_guru=? OR id_kelas=? OR (?<>'' AND ruang=?)) AND id_jadwal<>?",original.id_tahun_ajaran,original.hari,String(original.jam_selesai).slice(0,5),String(original.jam_mulai).slice(0,5),original.id_guru,original.id_kelas,original.ruang,original.ruang,id).length)fail('Jadwal bertabrakan dengan jadwal aktif. Nonaktifkan jadwal pengganti terlebih dahulu.',409);
  const after=Object.keys(changes).length?write(user,table,{[pk]:id},changes,reason):before!;
  audit(user,table,id,before,after,reason,'pulih');
  return {[pk]:id,restored:true};
}
export function revokeMembership(user:AuthUser,input:Row) {
  const id=text(input.id,'Keanggotaan',40),before=one('ak_anggota_kelas',{id}),reason=actionReason(user,input,before);
  if(!used('ak_anggota_kelas','id',before!))return removeManaged(user,'ak_anggota_kelas','id',id,input,'cabut');
  const until=dateValue(input.selesai||today());
  if(!/^\d{4}-\d{2}-\d{2}$/.test(until)||until<before!.mulai||until>before!.selesai||until>today())fail('Tanggal akhir pencabutan harus dalam rentang keanggotaan dan tidak di masa depan.');
  for(const table of ['ak_absensi_harian','ak_absensi_sesi','ak_nilai']) {
    const late=table==='ak_absensi_sesi'?rows('SELECT 1 FROM ak_absensi_sesi a JOIN ak_pertemuan p ON p.id=a.id_pertemuan WHERE a.id_anggota=? AND p.tanggal>? LIMIT 1',id,until):table==='ak_absensi_harian'?rows('SELECT 1 FROM ak_absensi_harian WHERE id_anggota=? AND tanggal>? LIMIT 1',id,until):[];
    if(late.length)fail('Tanggal akhir tidak boleh mendahului riwayat kehadiran siswa.',409);
  }
  if(rows('SELECT 1 FROM ak_kenaikan_detail WHERE id_anggota_asal=? OR id_anggota_tujuan=? LIMIT 1',id,id).length)fail('Keanggotaan sudah menjadi riwayat kenaikan kelas. Gunakan periode berjalan.',409);
  const after=write(user,'ak_anggota_kelas',{id},{selesai:until},reason);
  audit(user,'ak_anggota_kelas',id,before,after,reason,'cabut');
  return {id,removed:true,archived:true,selesai:until};
}
