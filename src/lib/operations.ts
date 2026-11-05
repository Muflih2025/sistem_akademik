import { schoolDays, profileDays } from './bell-times';
import { currentSchoolYear } from './academic-year';
import { AuthUser } from './auth';
import { Row, period, schedule, roster, duties, weekday, dateValue, revisionCheck } from './academic';
import { rows, one, fail, role, text, choice, number, reference, range, write, nextId, hash, today } from './store';
import { schoolDay } from './reports';
export function saveEvent(user:AuthUser,input:Row) {
  role(user,'admin');const p=period(text(input.id_tahun_ajaran,'Periode'),true),dates=range(input,p);const before=input.id?one('ak_kalender',{id:String(input.id)}):undefined;
  if(input.id&&!before||before&&before.id_tahun_ajaran!==p.id_tahun_ajaran)fail('Agenda tidak ditemukan.',404);revisionCheck(before,input.revision,input.alasan||input.catatan);
  const v={...dates,id_tahun_ajaran:p.id_tahun_ajaran,judul:text(input.judul,'Judul',150),jenis:choice(input.jenis,['Libur','Ujian','Hari Efektif','Agenda']),status:choice(input.status,['draft','disahkan','nonaktif']),catatan:text(input.catatan,'Catatan',1000,false),revision:Number(before?.revision||0)+1};
  const used=(a:string,b:string)=>rows('SELECT 1 FROM ak_pertemuan WHERE id_tahun_ajaran=? AND tanggal BETWEEN ? AND ?',p.id_tahun_ajaran,a,b).length;
  if(v.jenis==='Libur'&&v.status==='disahkan'&&used(v.mulai,v.selesai))fail('Libur tidak boleh membatalkan pertemuan tersimpan.',409);
  if(before&&before.status==='disahkan'&&['Libur','Hari Efektif'].includes(before.jenis)&&used(before.mulai,before.selesai)&&['mulai','selesai','jenis','status'].some(k=>v[k as keyof typeof v]!==before[k]))fail('Aturan hari sudah digunakan pertemuan.',409);
  if(rows("SELECT 1 FROM ak_kalender WHERE id_tahun_ajaran=? AND mulai=? AND selesai=? AND judul=? AND status<>'nonaktif' AND id<>?",p.id_tahun_ajaran,v.mulai,v.selesai,v.judul,input.id||'').length)fail('Agenda identik sudah ada.',409);
  return write(user,'ak_kalender',{id:String(input.id||nextId('ak_kalender','id'))},v,input.catatan||'Agenda akademik');
}
export function listBells(): Row[] {
  return rows('SELECT b.* FROM ak_jam_belajar b WHERE CAST(b.versi AS INTEGER)=(SELECT MAX(CAST(v.versi AS INTEGER)) FROM ak_jam_belajar v WHERE v.nama=b.nama) ORDER BY b.nama').map(r=>({...r,payload:JSON.parse(r.payload_json)}));
}
export function saveBell(user:AuthUser,input:Row) {
  role(user,'admin');const nama=text(input.nama,'Profil hari',80),old=listBells().filter(r=>r.nama===nama);if(old.length>1)fail('Versi profil ambigu.',409);const before=old[0];if(before&&String(before.id)!==String(input.id)||before&&Number(input.versi)!==Number(before.versi))fail('Versi profil berubah. Muat ulang.',409);
  const hari = input.hari === undefined ? profileDays(before ? JSON.parse(before.payload_json) : { nama }) : input.hari;
  if (!Array.isArray(hari) || hari.some(d => !schoolDays.includes(d)) || new Set(hari).size !== hari.length) fail('Hari profil jam tidak valid.');
  const status=choice(input.status,['referensi','perlu_konfirmasi']);
  if (status === 'referensi' && !hari.length) fail('Pilih minimal satu hari berlaku untuk profil referensi.');
  if (status === 'referensi' && old.length <= 1 && listBells().some(p => p.nama !== nama && p.status === 'referensi' && profileDays(p.payload).some(d => hari.includes(d)))) fail('Hari sudah memiliki profil referensi. Revisi profil hari yang sama.');if(status==='referensi'&&input.terverifikasi!==true)fail('Konfirmasi pemeriksaan jam wajib diisi.');
  const slots=input.slots;if(!Array.isArray(slots)||!slots.length||slots.length>40)fail('Isi 1–40 baris jam.');let last='00:00',n=1;
  const normalized=slots.map((s:any)=>{if(!Array.isArray(s)||s.length!==4)fail('Baris jam tidak valid.');const start=text(s[1],'Jam mulai',5),end=text(s[2],'Jam selesai',5);if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(start)||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(end)||start>=end||start<last)fail('Jam tidak valid atau bertumpang tindih.');last=end;let num=null;if(s[0]!==null&&s[0]!==''){num=number(s[0],1,40);if(num!==n++)fail('Nomor pelajaran harus berurutan.');}return[num,start,end,text(s[3],'Keterangan',80)];});
  if(n===1)fail('Minimal satu jam pelajaran bernomor.');const version=Number(before?.versi||0)+1,payload={nama,hari,versi:version,status,catatan:text(input.catatan,'Catatan',1000,false),slots:normalized};return write(user,'ak_jam_belajar',{id:nextId('ak_jam_belajar','id')},{nama,versi:version,status,payload_json:JSON.stringify(payload),sumber_sha256:hash(payload),catatan:payload.catatan},text(input.alasan,'Alasan'));
}
function dutyContext(user:AuthUser,input:Row,correct=false) {
  const date=dateValue(input.tanggal),year=text(input.id_tahun_ajaran,'Periode'),cls=text(input.id_kelas,'Kelas'),p=period(year,true);
  if(date>today()||date<p.mulai||date>p.selesai||!schoolDay(p,date))fail('Tanggal bukan hari efektif yang dapat diisi.');
  if(user.role==='kepala_sekolah'||!duties(user,date).some(c=>c.id_kelas===cls&&c.id_tahun_ajaran===year))fail('Di luar tugas Piket.',403);
  if(correct&&user.role!=='admin'&&!rows("SELECT 1 FROM ak_tugas_piket WHERE id_guru=? AND id_tahun_ajaran=? AND aktif='1' AND boleh_koreksi='1' AND mulai<=? AND selesai>=? AND (id_kelas IS NULL OR id_kelas='' OR id_kelas='0' OR id_kelas=?)",user.id_referensi,year,date,date,cls).length)fail('Izin koreksi terkonfirmasi diperlukan.',403);
  return {date,year,cls,p};
}
export function reconciliation(user:AuthUser,input:Row): {data:Row[];source_hash:string;schedules:Row[]} {
  const date=dateValue(input.tanggal),year=text(input.id_tahun_ajaran,'Periode'),cls=text(input.id_kelas,'Kelas');
  if(!duties(user,date).some(c=>c.id_kelas===cls&&c.id_tahun_ajaran===year))fail('Di luar tugas Piket.',403);const p=period(year);if(date<p.mulai||date>p.selesai)fail('Tanggal di luar periode.');
  const members=roster({id_kelas:cls,id_tahun_ajaran:year},date),expected=rows("SELECT j.id_jadwal,p.id id_pertemuan,p.revision FROM jadwal j JOIN ak_penugasan a ON a.id_jadwal=j.id_jadwal LEFT JOIN ak_pertemuan p ON p.id_jadwal=j.id_jadwal AND p.tanggal=? WHERE j.id_kelas=? AND j.id_tahun_ajaran=? AND j.hari=? AND a.terverifikasi='1' AND a.mulai<=? AND a.selesai>=? ORDER BY j.id_jadwal",date,cls,year,weekday(date),date,date);
  const data=members.map(m=>{const sessions=rows('SELECT a.*,p.id_jadwal,p.revision FROM ak_absensi_sesi a JOIN ak_pertemuan p ON p.id=a.id_pertemuan WHERE p.id_kelas=? AND p.id_tahun_ajaran=? AND p.tanggal=? AND a.nis=? ORDER BY p.id_jadwal',cls,year,date,m.nis);const statuses=new Set(sessions.map(r=>r.status));const evidence={jadwal:expected,sesi:sessions};const status=expected.length>0&&expected.every(j=>j.id_pertemuan)&&sessions.length===expected.length&&statuses.size===1&&sessions[0].status!=='B'?sessions[0].status:'B';return{...m,status,keterangan:status==='B'?'Bukti sesi belum lengkap atau berbeda.':'Konsensus semua sesi terjadwal.',bukti:evidence,evidence_hash:hash(evidence)};});return {data,source_hash:hash(data),schedules:expected};
}
export function reconcile(user:AuthUser,input:Row) {
  const {date,year,cls}=dutyContext(user,input),preview=reconciliation(user,input);if(input.source_hash!==preview.source_hash)fail('Bukti berubah sejak preview.',409);if(!preview.data.length)fail('Roster belum tersedia.');const reason=text(input.alasan,'Alasan');let count=0;
  for(const m of preview.data){const before=one('ak_absensi_harian',{tanggal:date,nis:m.nis});if(before&&(before.id_kelas!==cls||before.id_tahun_ajaran!==year||before.id_anggota!==m.id_anggota))fail('Konteks harian lama berbeda.',409);if(before?.evidence_hash===m.evidence_hash)continue;if(before&&(before.status!=='B'||before.metode==='manual'))dutyContext(user,input,true);
    write(user,'ak_absensi_harian',{tanggal:date,nis:m.nis},{id:before?.id||nextId('ak_absensi_harian','id'),nis:m.nis,id_tahun_ajaran:year,id_kelas:cls,id_anggota:m.id_anggota,status:m.status,keterangan:m.keterangan,metode:'konsensus',bukti_json:JSON.stringify(m.bukti),evidence_hash:m.evidence_hash,revision:Number(before?.revision||0)+1,created_by:before?.created_by||user.id_user},reason);count++;}return {count};
}
export function correctDaily(user:AuthUser,input:Row) {
  const c=dutyContext(user,input,true),before=one('ak_absensi_harian',{id:text(input.id,'Absensi')});if(!before||before.id_kelas!==c.cls||before.id_tahun_ajaran!==c.year||before.tanggal!==c.date)fail('Absensi tidak ditemukan.',404);revisionCheck(before,input.revision,input.alasan);
  return write(user,'ak_absensi_harian',{id:before.id},{status:choice(input.status,['H','S','I','A','B']),keterangan:text(input.keterangan,'Keterangan',500),metode:'manual',revision:Number(before.revision)+1},text(input.alasan,'Alasan'));
}
export function saveRule(user:AuthUser,input:Row) {
  const j=schedule(user,input.id_jadwal,undefined,true),components=['tugas','uts','uas','praktik','proyek'],weights:Row={};for(const k of components)weights[k]=number(input.bobot?.[k]);if(Math.abs(Object.values(weights).reduce((a:number,b:any)=>a+Number(b),0)-100)>0.00001)fail('Total bobot harus tepat 100.');
  const old=rows('SELECT * FROM ak_aturan_nilai WHERE id_tahun_ajaran=? AND id_kelas=? AND id_mapel=? AND id_guru=? ORDER BY CAST(versi AS INTEGER) DESC',j.id_tahun_ajaran,j.id_kelas,j.id_mapel,j.id_guru);if(Number(input.versi||0)!==Number(old[0]?.versi||0))fail('Aturan sudah berubah.',409);
  return write(user,'ak_aturan_nilai',{id:nextId('ak_aturan_nilai','id')},{id_tahun_ajaran:j.id_tahun_ajaran,id_kelas:j.id_kelas,id_mapel:j.id_mapel,id_guru:j.id_guru,versi:Number(old[0]?.versi||0)+1,bobot_json:JSON.stringify(weights),kkm:reference('mata_pelajaran','id_mapel',j.id_mapel).kkm,formula:'weighted_kkm_v1',catatan:text(input.catatan,'Catatan',500,false)},'Versi aturan baru; nilai lama dipertahankan');
}

export function calendarData(user: AuthUser, q: URLSearchParams) {
  const month = q.get('bulan') || today().slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) fail('Bulan tidak valid.');
  const current = rows("SELECT t.*,p.mulai,p.selesai FROM tahun_ajaran t JOIN ak_periode p ON p.id_tahun_ajaran=t.id_tahun_ajaran WHERE t.status='Aktif' AND p.terverifikasi='1' AND p.mulai<=? AND p.selesai>=?", today(), today());
  if (current.length > 1) fail('Periode aktif ambigu. Hubungi admin.', 409);
  const p = current[0];
  const bounds = user.role === 'siswa' && p ? { min: p.mulai.slice(0, 7), max: p.selesai.slice(0, 7) } : null;
  if (user.role === 'siswa' && (!p || p.tahun_ajaran !== currentSchoolYear().tahun_ajaran)) return { data: [], bounds: null, period: null, notice: 'Periode berjalan belum ditetapkan admin.' };
  if (bounds && (month < bounds.min || month > bounds.max)) fail(`Kalender siswa hanya tersedia pada periode berjalan (${bounds.min} sampai ${bounds.max}).`);
  if (user.role === 'siswa' && q.get('id_tahun_ajaran') && q.get('id_tahun_ajaran') !== p.id_tahun_ajaran) fail('Kalender siswa hanya tersedia pada periode berjalan.', 403);
  const data = rows('SELECT * FROM ak_kalender ORDER BY mulai,id').filter(r =>
    (user.role === 'admin' || r.status === 'disahkan') &&
    (user.role !== 'siswa' || r.id_tahun_ajaran === p.id_tahun_ajaran) &&
    (!q.get('id_tahun_ajaran') || r.id_tahun_ajaran === q.get('id_tahun_ajaran')) &&
    r.mulai.slice(0, 7) <= month && r.selesai.slice(0, 7) >= month);
  return { data, bounds, period: user.role === 'siswa' ? p : null, notice: data.length ? '' : 'Belum ada agenda yang disahkan pada bulan ini.' };
}
