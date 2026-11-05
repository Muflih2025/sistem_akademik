import bcrypt from 'bcryptjs';
import { currentSchoolYear } from './academic-year';
import { AuthUser } from './auth';
import { Row, period } from './academic';
import { catalog } from './catalog';
import { db, rows, one, fail, role, text, choice, number, reference, unique, write, nextId, ensureVersion, publicRow, range, today } from './store';
export const aliases:Record<string,string>={mapel:'mata_pelajaran',ruang:'ak_ruang'};
export function canonical(value:string) { return aliases[value]||value; }
function scheduleEditLock(schedule:Row) {
  const year=one('tahun_ajaran',{id_tahun_ajaran:schedule.id_tahun_ajaran});
  if(year?.dikunci==='1'||year?.rapor_diterbitkan==='1')return 'Periode jadwal terkunci atau rapor telah diterbitkan.';
  if(year?.status!=='Aktif')return 'Periode jadwal sudah tidak aktif.';
  if(rows('SELECT 1 FROM ak_pertemuan WHERE id_jadwal=? LIMIT 1',schedule.id_jadwal).length)return 'Jadwal sudah memiliki riwayat jurnal atau absensi.';
  if(rows('SELECT 1 FROM ak_nilai WHERE id_tahun_ajaran=? AND id_kelas=? AND id_mapel=? AND id_guru=? LIMIT 1',schedule.id_tahun_ajaran,schedule.id_kelas,schedule.id_mapel,schedule.id_guru).length)return 'Penugasan jadwal sudah memiliki riwayat nilai.';
  if(rows('SELECT 1 FROM ak_rapor_snapshot WHERE id_tahun_ajaran=? AND id_kelas=? LIMIT 1',schedule.id_tahun_ajaran,schedule.id_kelas).length)return 'Kelas dan periode jadwal sudah memiliki arsip rapor.';
  return '';
}
function checkScheduleCollision(schedule:Row,id:string) {
  if(rows("SELECT 1 FROM jadwal WHERE status='aktif' AND id_tahun_ajaran=? AND hari=? AND substr(jam_mulai,1,5)<? AND substr(jam_selesai,1,5)>? AND (id_guru=? OR id_kelas=? OR (?<>'' AND ruang=?)) AND id_jadwal<>?",schedule.id_tahun_ajaran,schedule.hari,String(schedule.jam_selesai).slice(0,5),String(schedule.jam_mulai).slice(0,5),schedule.id_guru,schedule.id_kelas,schedule.ruang,schedule.ruang,id).length)fail('Jadwal guru, kelas, atau ruang bertabrakan.',409);
}
export function listCatalog(user:AuthUser,table:string,q='',limit=50,offset=0) {
  table=canonical(table);if(!catalog[table])fail('Modul tidak dikenal.',404);
  role(user,...(['catatan_evaluasi','tahun_ajaran'].includes(table)?['admin','kepala_sekolah']:['admin']));
  if(!Number.isInteger(limit)||limit<1||limit>1000||!Number.isInteger(offset)||offset<0)fail('Pagination tidak valid.');
  const def=catalog[table], cols=def.fields.filter(f=>f.type!=='password').map(f=>f.key);
  const where=q?`WHERE ${cols.map(c=>`CAST(${c} AS TEXT) LIKE ?`).join(' OR ')}`:'';const args=cols.map(()=>`%${q.slice(0,100)}%`);
  const total=rows(`SELECT COUNT(*) n FROM ${table} ${where}`,...(q?args:[]))[0].n;
  const data=rows(`SELECT rowid _rowid,* FROM ${table} ${where} ORDER BY CAST(${def.pk} AS INTEGER),${def.pk} LIMIT ? OFFSET ?`,...(q?args:[]),limit,offset).map(publicRow);
  if(table==='tahun_ajaran')for(const r of data){const p=one('ak_periode',{id_tahun_ajaran:r.id_tahun_ajaran});r.mulai=p?.mulai;r.selesai=p?.selesai;r.terverifikasi=p?.terverifikasi;}
  if(table==='jadwal')for(const r of data){r.nama_kelas=one('kelas',{id_kelas:r.id_kelas})?.nama_kelas;r.nama_guru=one('guru',{id_guru:r.id_guru})?.nama_guru;r.nama_mapel=one('mata_pelajaran',{id_mapel:r.id_mapel})?.nama_mapel;const y=one('tahun_ajaran',{id_tahun_ajaran:r.id_tahun_ajaran});r.tahun_ajaran=y?.tahun_ajaran;r.semester=y?.semester;r.sudah_ditugaskan=!!one('ak_penugasan',{id_jadwal:r.id_jadwal});r.alasan_kunci=scheduleEditLock(r);r.konteks_terkunci=!!r.alasan_kunci;}
  if(table==='users')for(const r of data){const ref=r.role==='guru'?one('guru',{id_guru:r.id_referensi}):r.role==='siswa'?one('siswa',{nis:r.id_referensi}):null;r.nama=ref?.nama_guru||ref?.nama_siswa||r.username;r.nip_nis=ref?.nip||ref?.nis||'';r.id=r.id_user;r.is_active=r.status==='aktif';}
  return {data,total,table,definition:def};
}
export function saveCatalog(user:AuthUser,input:Row):Row {
  const table=canonical(text(input.table,'Modul'));const def=catalog[table];if(!def)fail('Modul tidak dikenal.',404);
  role(user,...(table==='catatan_evaluasi'?['admin','kepala_sekolah']:['admin']));
  const id=input.id||input.original_id||input[def.pk]&&input.action!=='create'?String(input.id||input.original_id||input[def.pk]):'';
  const before=id?one(table,{[def.pk]:id}):undefined;if(id&&!before)fail('Data tidak ditemukan.',404);
  ensureVersion(before,input);
  const action=input.action|| (before?'update':'create');const values:Row={};
  if(['deactivate','delete','activate'].includes(action)) {
    if(!before || !('status' in before)||table==='tahun_ajaran')fail('Operasi tidak tersedia.');
    values.status=action==='activate'?'aktif':'nonaktif';
    if(table==='jadwal'&&values.status==='aktif'&&before.status!=='aktif')checkScheduleCollision(before,id);
  } else {
    for(const f of def.fields) {
      if(f.key==='password')continue;
      const v=input[f.key]??before?.[f.key];
      values[f.key]=f.options?choice(v,f.options,f.label):text(v,f.label,f.key==='alamat'||f.key==='isi'?4000:150,!f.optional);
      if(f.reference&&values[f.key]) {
        const ref=catalog[f.reference];
        if(f.key==='ruang') {
          const room=rows("SELECT * FROM ak_ruang WHERE (id_ruang=? OR nama_ruang=? OR kode_ruang=?) AND status='aktif'",values[f.key],values[f.key],values[f.key]);
          if(room.length!==1)fail('Ruang aktif tidak ditemukan.');values.ruang=room[0].nama_ruang;
        } else {
          // Supervisory notes may refer to an archived period without reopening it.
          // Other catalog references still require an active record.
          const archivedEvaluationPeriod=table==='catatan_evaluasi'&&f.key==='id_tahun_ajaran'&&f.reference==='tahun_ajaran';
          reference(f.reference,ref.pk,values[f.key],!archivedEvaluationPeriod);
        }
      }
    }
    if(table!=='tahun_ajaran'&&table!=='catatan_evaluasi')values.status=choice(input.status||before?.status||'aktif',['aktif','nonaktif'],'Status');
  }
  if(table==='users') {
    const next={...before,...values};if(!/^[A-Za-z0-9_.@-]{3,50}$/.test(next.username))fail('Username harus 3–50 karakter.');
    unique(table,'username',next.username,def.pk,id);
    if(['guru','siswa'].includes(next.role)){reference(next.role,next.role==='guru'?'id_guru':'nis',next.id_referensi);if(rows('SELECT 1 FROM users WHERE role=? AND id_referensi=? AND id_user<>?',next.role,next.id_referensi,id).length)fail('Identitas sudah memiliki akun.',409);}else if(next.id_referensi)fail('Peran ini tidak memakai ID referensi.');
    if(!before||input.password){if(typeof input.password!=='string'||input.password.length<8||Buffer.byteLength(input.password)>72)fail('Password harus 8–72 byte.');values.password=bcrypt.hashSync(input.password,12);}
    if(before?.role==='admin'&&before.status==='aktif'&&(next.role!=='admin'||next.status!=='aktif')&&rows("SELECT 1 FROM users WHERE role='admin' AND status='aktif'").length<2)fail('Admin aktif terakhir tidak dapat diubah.',409);
  }
  if(!['deactivate','delete','activate'].includes(action)) {
    if(table==='siswa') {
      if(!/^\d{1,15}$/.test(values.nis)||before&&values.nis!==id)fail('NIS harus 1–15 digit dan tidak dapat diubah.');unique(table,'nis',values.nis,def.pk,id);
      const born=range({mulai:values.tanggal_lahir,selesai:values.tanggal_lahir}).mulai;if(born<'1900-01-01'||born>=today())fail('Tanggal lahir tidak valid.');
      if(before&&values.id_kelas!==before.id_kelas&&rows('SELECT 1 FROM ak_anggota_kelas WHERE nis=?',id).length)fail('Gunakan keanggotaan bertanggal untuk perpindahan siswa.',409);
    }
    const uniqueFields:Record<string,string[]>={guru:['nip'],jurusan:['kode_jurusan'],kelas:['nama_kelas'],mata_pelajaran:['kode_mapel'],ak_ruang:['kode_ruang','nama_ruang']};
    for(const key of uniqueFields[table]||[])unique(table,key,values[key],def.pk,id);
    if(table==='guru') {if(!/^[A-Za-z0-9.\/-]{3,20}$/.test(values.nip))fail('NIP tidak valid.');if(values.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))fail('Email tidak valid.');if(values.no_hp&&!/^[+0-9() -]{5,20}$/.test(values.no_hp))fail('Nomor telepon tidak valid.');}
    if(table==='mata_pelajaran')values.kkm=number(values.kkm,1,100);
    if(table==='kelas'&&before&&(values.tingkat!==before.tingkat||values.id_jurusan!==before.id_jurusan)&&rows('SELECT 1 FROM ak_anggota_kelas WHERE id_kelas=?',id).length)fail('Tingkat/jurusan kelas bersejarah tidak dapat diubah.',409);
    if(table==='ak_ruang'&&before&&values.nama_ruang!==before.nama_ruang&&rows('SELECT 1 FROM jadwal WHERE ruang=?',before.nama_ruang).length)fail('Ruang sudah digunakan jadwal; buat ruang baru.',409);
    if(table==='jadwal') {
      const p=reference('tahun_ajaran','id_tahun_ajaran',values.id_tahun_ajaran);if(p.dikunci==='1')fail('Periode terkunci.',409);
      for(const k of ['jam_mulai','jam_selesai']){if(!/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(values[k]))fail('Jam tidak valid.');values[k]=values[k].slice(0,5);}
      if(values.jam_mulai>=values.jam_selesai)fail('Jam selesai harus setelah mulai.');
      if(before) {
        const changed=def.fields.some(f=>String(values[f.key])!==String(before[f.key]||'').slice(0,f.key.startsWith('jam_')?5:undefined));
        if(changed) {
          const locked=scheduleEditLock(before);
          if(locked)fail(`${locked} Buat jadwal baru untuk mengganti konteksnya.`,409);
          const assignment=one('ak_penugasan',{id_jadwal:id});
          if(assignment)range(assignment,period(values.id_tahun_ajaran,true));
        }
      }
      if(values.status==='aktif')checkScheduleCollision(values,id);
    }
    if(table==='tahun_ajaran') {
      const current = currentSchoolYear();
      if (!before && (values.tahun_ajaran !== current.tahun_ajaran || values.semester !== current.semester)) fail('Periode baru harus mengikuti tahun ajaran dan semester berjalan.');
      if (before && (values.tahun_ajaran !== before.tahun_ajaran || values.semester !== before.semester)) fail('Identitas tahun ajaran dan semester tidak dapat diubah.');
      if (values.status === 'Aktif' && (values.tahun_ajaran !== current.tahun_ajaran || values.semester !== current.semester)) fail('Hanya tahun ajaran dan semester berjalan yang dapat diaktifkan.');
      const m=/^(\d{4})\/(\d{4})$/.exec(values.tahun_ajaran);if(!m||Number(m[2])!==Number(m[1])+1)fail('Tahun ajaran harus dua tahun berurutan.');
      if(rows('SELECT 1 FROM tahun_ajaran WHERE tahun_ajaran=? AND semester=? AND id_tahun_ajaran<>?',values.tahun_ajaran,values.semester,id).length)fail('Periode sudah ada.',409);
      if(before&&(before.tahun_ajaran!==values.tahun_ajaran||before.semester!==values.semester)&&one('ak_periode',{id_tahun_ajaran:id}))fail('Identitas periode bersejarah tidak dapat diubah.',409);
      if(before?.status==='Aktif'&&values.status!=='Aktif')fail('Aktifkan periode pengganti untuk mengganti periode aktif.');
      if(values.status==='Aktif')for(const p of rows("SELECT rowid _rowid,* FROM tahun_ajaran WHERE status='Aktif' AND id_tahun_ajaran<>?",id))write(user,table,{id_tahun_ajaran:p.id_tahun_ajaran},{status:'Tidak Aktif'},'Aktivasi periode pengganti');
    }
  }
  const target=id||(table==='siswa'?values.nis:nextId(table,def.pk));
  const saved=write(user,table,{[def.pk]:target},values,text(input.alasan||input.catatan||'Perubahan data oleh pengelola','Alasan',500));
  if(table==='jadwal'&&!before&&(input.penugasan_mulai||input.penugasan_selesai)) saveFoundation(user,{kind:'penugasan',id_jadwal:target,mulai:input.penugasan_mulai,selesai:input.penugasan_selesai,terverifikasi:input.verifikasi_penugasan||'0',catatan:input.alasan||'Penugasan dari jadwal baru'});
  if(['siswa','guru'].includes(table)&&values.status==='nonaktif')for(const u of rows('SELECT * FROM users WHERE role=? AND id_referensi=?',table,target))write(user,'users',{id_user:u.id_user},{status:'nonaktif'},'Referensi dinonaktifkan');
  return publicRow(saved);
}
export const foundationDefs:Record<string,{table:string;pk:string;fields:string[]}>={
  periode:{table:'ak_periode',pk:'id_tahun_ajaran',fields:['id_tahun_ajaran','mulai','selesai','hari_efektif','terverifikasi','catatan']},
  anggota:{table:'ak_anggota_kelas',pk:'id',fields:['nis','id_kelas','id_tahun_ajaran','nomor_absen','mulai','selesai']},
  penugasan:{table:'ak_penugasan',pk:'id_jadwal',fields:['id_jadwal','mulai','selesai','terverifikasi','catatan']},
  piket:{table:'ak_tugas_piket',pk:'id',fields:['id_guru','id_kelas','id_tahun_ajaran','mulai','selesai','boleh_koreksi','aktif','catatan']},
  wali:{table:'ak_wali_kelas',pk:'id',fields:['id_guru','id_kelas','id_tahun_ajaran','mulai','selesai','aktif','catatan']},
};
export function listFoundation(user:AuthUser,kind:string) {role(user,'admin');const d=foundationDefs[kind];if(!d)fail('Modul tidak dikenal.',404);return {data:rows(`SELECT rowid _rowid,* FROM ${d.table} ORDER BY ${d.pk} DESC`).map(publicRow),definition:d};}
export function saveFoundation(user:AuthUser,input:Row) {
  role(user,'admin');const d=foundationDefs[input.kind];if(!d)fail('Modul tidak dikenal.',404);
  const keys={[d.pk]:text(input[d.pk]||input.id||nextId(d.table,d.pk),d.pk,40)},before=one(d.table,keys);ensureVersion(before,input);
  const v:Row=Object.fromEntries(d.fields.map(k=>[k,text(input[k]??before?.[k]??'',k,500,!['catatan','id_kelas'].includes(k))]));
  const year=input.kind==='penugasan'?reference('jadwal','id_jadwal',v.id_jadwal).id_tahun_ajaran:v.id_tahun_ajaran;
  const y=reference('tahun_ajaran','id_tahun_ajaran',year,false);if(y.dikunci==='1'||y.rapor_diterbitkan==='1')fail('Periode terkunci.',409);
  const p=input.kind==='periode'?null:period(year,true);Object.assign(v,range(v,p||undefined));
  if(input.kind==='periode') {
    if((Date.parse(v.selesai)-Date.parse(v.mulai))/86400000>370||! /^[1-7](,[1-7])*$/.test(v.hari_efektif)||new Set(v.hari_efektif.split(',')).size!==v.hari_efektif.split(',').length)fail('Rentang maksimal 370 hari dan hari efektif harus unik 1–7.');
    v.terverifikasi=choice(v.terverifikasi,['0','1']);
    if(before){for(const table of ['ak_pertemuan','ak_kenaikan_batch']){const used=rows(table==='ak_kenaikan_batch'?'SELECT 1 FROM ak_kenaikan_batch WHERE periode_asal=? OR periode_tujuan=?':'SELECT 1 FROM ak_pertemuan WHERE id_tahun_ajaran=?',... (table==='ak_kenaikan_batch'?[year,year]:[year]));if(used.length&&['mulai','selesai','hari_efektif','terverifikasi'].some(k=>v[k]!==before[k]))fail('Aturan periode sudah digunakan.',409);}for(const table of ['ak_anggota_kelas','ak_kalender'])if(rows(`SELECT 1 FROM ${table} WHERE id_tahun_ajaran=? AND (mulai<? OR selesai>?)`,year,v.mulai,v.selesai).length)fail('Tanggal baru tidak mencakup data existing.',409);}
  } else if(input.kind==='anggota') {
    reference('siswa','nis',v.nis);reference('kelas','id_kelas',v.id_kelas);v.nomor_absen=String(number(v.nomor_absen,1,1000));if(!Number.isInteger(Number(v.nomor_absen)))fail('Nomor absen harus bulat.');
    if(rows("SELECT 1 FROM ak_kenaikan_detail WHERE nis=? AND hasil='alumni' AND tanggal_berlaku<=?",v.nis,v.selesai).length)fail('Siswa telah menjadi alumni.',409);
    if(rows('SELECT 1 FROM ak_anggota_kelas WHERE id_tahun_ajaran=? AND mulai<=? AND selesai>=? AND id<>? AND (nis=? OR (id_kelas=? AND nomor_absen=?))',year,v.selesai,v.mulai,keys.id,v.nis,v.id_kelas,v.nomor_absen).length)fail('Keanggotaan atau nomor absen bertumpang tindih.',409);
    if(before){if(['nis','id_kelas','id_tahun_ajaran','mulai'].some(k=>v[k]!==before[k]))fail('Identitas keanggotaan tetap; tutup rentang lama lalu buat baru.',409);if(rows('SELECT 1 FROM ak_kenaikan_detail WHERE id_anggota_asal=? OR id_anggota_tujuan=?',keys.id,keys.id).length)fail('Keanggotaan sudah digunakan kenaikan kelas.',409);const last=rows('SELECT MAX(p.tanggal) tanggal FROM ak_absensi_sesi a JOIN ak_pertemuan p ON p.id=a.id_pertemuan WHERE a.id_anggota=?',keys.id)[0].tanggal;const daily=rows('SELECT MAX(tanggal) tanggal FROM ak_absensi_harian WHERE id_anggota=?',keys.id)[0].tanggal;if((last&&v.selesai<last)||(daily&&v.selesai<daily)||((last||daily)&&v.nomor_absen!==before.nomor_absen))fail('Riwayat keanggotaan tidak boleh berubah.',409);}
    if((!before||v.selesai>before.selesai)&&rows('SELECT 1 FROM ak_pertemuan WHERE id_kelas=? AND id_tahun_ajaran=? AND tanggal BETWEEN ? AND ?',v.id_kelas,year,before?before.selesai:v.mulai,v.selesai).length)fail('Roster tidak boleh ditambah secara retroaktif.',409);
  } else if(input.kind==='penugasan') {
    v.terverifikasi=choice(v.terverifikasi,['0','1']);if(before&&rows('SELECT 1 FROM ak_pertemuan WHERE id_jadwal=?',v.id_jadwal).length&&['mulai','selesai','terverifikasi'].some(k=>v[k]!==before[k]))fail('Penugasan sudah memiliki riwayat.',409);
  } else {
    reference('guru','id_guru',v.id_guru);if(!rows("SELECT 1 FROM users WHERE role='guru' AND id_referensi=? AND status='aktif'",v.id_guru).length)fail('Guru harus mempunyai akun aktif.');
    if(v.id_kelas&&v.id_kelas!=='0')reference('kelas','id_kelas',v.id_kelas);else v.id_kelas=null;
    v.aktif=choice(v.aktif||'1',['0','1']);if(input.kind==='piket')v.boleh_koreksi=choice(v.boleh_koreksi,['0','1']);
    if(input.kind==='wali'){if(!v.id_kelas)fail('Kelas wajib diisi.');if(v.aktif==='1'&&rows("SELECT 1 FROM ak_wali_kelas WHERE id_kelas=? AND id_tahun_ajaran=? AND aktif='1' AND mulai<=? AND selesai>=? AND id<>?",v.id_kelas,year,v.selesai,v.mulai,keys.id).length)fail('Wali kelas bertumpang tindih.',409);if(before&&rows('SELECT 1 FROM ak_review_rapor WHERE id_penugasan_wali=?',keys.id).length&&v.aktif!=='0')fail('Tugas sudah digunakan; cabut dan buat tugas baru.',409);}
  }
  return publicRow(write(user,d.table,keys,v,text(input.alasan||v.catatan||'Penetapan akademik','Alasan',500)));
}
