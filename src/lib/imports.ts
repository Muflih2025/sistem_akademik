import ExcelJS from 'exceljs';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { AuthUser } from './auth';
import { Row, schedule, roster, saveMeeting, saveGrades, gradeRows } from './academic';
import { db, rows, fail, role, text, hash, today } from './store';
import { saveCatalog, saveFoundation } from './admin';
import { saveEvent } from './operations';
export const importHeaders:Record<string,string[]>={
  siswa:['nis','nama_siswa','jenis_kelamin','tanggal_lahir','id_kelas','alamat'],guru:['nip','nama_guru','email','no_hp'],jurusan:['kode_jurusan','nama_jurusan'],ak_ruang:['kode_ruang','nama_ruang','jenis'],kelas:['nama_kelas','tingkat','id_jurusan'],mata_pelajaran:['kode_mapel','nama_mapel','kelompok','kkm'],anggota:['nis','id_kelas','nomor_absen','mulai','selesai'],penugasan:['id_guru','id_mapel','id_kelas','hari','jam_mulai','jam_selesai','ruang','mulai','selesai','catatan'],kalender:['mulai','selesai','judul','jenis','status','catatan'],absensi:['nis','status','keterangan'],nilai:['nis','tugas','uts','uas','praktik','proyek','deskripsi'],
};
function authorize(user:AuthUser,kind:string) {if(!importHeaders[kind])fail('Modul impor tidak dikenal.');role(user,...(['absensi','nilai'].includes(kind)?['guru','admin']:['admin']));}
export function importTemplate(user:AuthUser,input:Row) {const module=text(input.module,'Modul');authorize(user,module);const headers=importHeaders[module];const data=['absensi','nilai'].includes(module)?roster(schedule(user,input.id_jadwal,input.tanggal),input.tanggal).map(m=>Object.fromEntries(headers.map(k=>[k,k==='nis'?m.nis:k==='status'?'B':'']))):[];return {headers,data};}
function sourceHash() {return hash(['siswa','guru','kelas','jurusan','mata_pelajaran','jadwal','tahun_ajaran','ak_periode','ak_penugasan','ak_anggota_kelas','ak_pertemuan','ak_absensi_sesi','ak_nilai','ak_aturan_nilai','ak_ruang','ak_kalender'].map(t=>[t,rows(`SELECT * FROM ${t} ORDER BY rowid`)]));}
function applyImport(user:AuthUser,input:Row,data:Row[]) {
  const module=input.module;
  if(module==='absensi')return saveMeeting(user,{...input,items:data});
  if(module==='nilai'){const current=gradeRows(schedule(user,input.id_jadwal)).data;return saveGrades(user,{...input,items:data.map(r=>({...r,revision:current.find(n=>n.nis===r.nis)?.revision||0,...Object.fromEntries(['tugas','uts','uas','praktik','proyek'].map(k=>['nilai_'+k,r[k]]))}))});}
  for(const entry of data) {
    if(module==='kalender')saveEvent(user,{...entry,id_tahun_ajaran:input.id_tahun_ajaran});
    else if(module==='anggota')saveFoundation(user,{...entry,kind:'anggota',id_tahun_ajaran:input.id_tahun_ajaran,alasan:input.alasan});
    else if(module==='penugasan'){const saved=saveCatalog(user,{...entry,table:'jadwal',action:'create',id_tahun_ajaran:input.id_tahun_ajaran});saveFoundation(user,{kind:'penugasan',id_jadwal:saved.id_jadwal,mulai:entry.mulai,selesai:entry.selesai,terverifikasi:'1',catatan:entry.catatan});}
    else saveCatalog(user,{...entry,table:module,action:'create',alasan:input.alasan});
  }return data.length;
}
export async function previewImport(user:AuthUser,input:Row) {
  const module=text(input.module,'Modul');authorize(user,module);const filename=text(input.filename,'Nama berkas',180),format=filename.split('.').at(-1)?.toLowerCase();if(!['xlsx','csv'].includes(format||''))fail('Gunakan CSV atau XLSX.');
  if(typeof input.content!=='string'||input.content.length>7_000_000||! /^[A-Za-z0-9+/\r\n]*={0,2}$/.test(input.content))fail('Berkas terlalu besar atau tidak valid.');
  const buffer=Buffer.from(input.content,'base64');if(!buffer.length||buffer.length>5_000_000)fail('Ukuran berkas maksimal 5 MB.');
  const workbook=new ExcelJS.Workbook();try{if(format==='xlsx')await workbook.xlsx.load(buffer as any);else await workbook.csv.read(Readable.from(buffer));}catch{fail('Berkas tidak dapat dibaca.');}
  if(workbook.worksheets.length!==1)fail('Gunakan tepat satu lembar kerja.');const sheet=workbook.worksheets[0];if(sheet.rowCount<2||sheet.rowCount>1001)fail('Isi 1–1000 baris data.');
  const headers=importHeaders[module],readCell=(cell:ExcelJS.Cell)=>{if(cell.type===ExcelJS.ValueType.Formula)fail('Rumus spreadsheet tidak diperbolehkan.');if(cell.value instanceof Date)return cell.value.toISOString().slice(0,10);return cell.text.trim().replace(/^\uFEFF/,'');};
  const actual=Array.from({length:sheet.getRow(1).cellCount},(_,i)=>readCell(sheet.getRow(1).getCell(i+1)));if(JSON.stringify(actual)!==JSON.stringify(headers))fail('Header harus persis sesuai template, termasuk urutannya.');
  const data:Row[]=[];for(let n=2;n<=sheet.rowCount;n++){const row=sheet.getRow(n);if(row.cellCount>headers.length)fail(`Baris ${n}: kolom berlebih.`);const entry=Object.fromEntries(headers.map((h,i)=>[h,readCell(row.getCell(i+1))]));if(Object.values(entry).every(v=>v===''))continue;data.push(entry);}
  if(!data.length)fail('Berkas tidak berisi data.');const ids=new Set();for(const row of data){const key=module==='kalender'?hash(row):module==='penugasan'?hash(row):String(row.nis||row.nip||row.kode_jurusan||row.kode_mapel||row.kode_ruang||row.nama_kelas).toLowerCase();if(ids.has(key))fail('Berkas mengandung identitas ganda.');ids.add(key);}
  const rollback=Symbol('preview');try{db.transaction(()=>{applyImport(user,{...input,module},data);throw rollback;}).immediate();}catch(e){if(e!==rollback)throw e;}
  const token=randomBytes(32).toString('hex'),dir=path.join(process.cwd(),'data','.imports');fs.mkdirSync(dir,{recursive:true,mode:0o700});const context={...input};delete context.content;
  fs.writeFileSync(path.join(dir,token),JSON.stringify({actor:user.id_user,expires:Date.now()+15*60*1000,source_hash:sourceHash(),context:{...context,module},data}),{flag:'wx',mode:0o600});
  return {token,total:data.length,data,headers,module};
}
export function commitImport(user:AuthUser,input:Row) {
  if(input.konfirmasi!==true||! /^[a-f0-9]{64}$/.test(input.token))fail('Konfirmasi pratinjau diperlukan.');const file=path.join(process.cwd(),'data','.imports',input.token);let preview:Row;try{preview=JSON.parse(fs.readFileSync(file,'utf8'));}catch{fail('Preview tidak ditemukan atau sudah dipakai.',409);}
  if(preview.actor!==user.id_user||preview.expires<Date.now())fail('Preview kedaluwarsa atau milik akun lain.',403);authorize(user,preview.context.module);
  const result=db.transaction(()=>{if(preview.source_hash!==sourceHash())fail('Data berubah sejak preview. Unggah dan periksa ulang.',409);return applyImport(user,preview.context,preview.data);}).immediate();fs.rmSync(file,{force:true});return {jumlah:preview.data.length,result};
}
