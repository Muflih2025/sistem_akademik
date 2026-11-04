import db from './db';
import { AuthUser } from './auth';
import { Row, fail, dateValue, one } from './academic';
import { randomUUID, createHash } from 'crypto';
export { db, one, fail };
export const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const rows = (sql: string, ...params: any[]): Row[] => db.prepare(sql).all(...params) as Row[];
export function role(user: AuthUser, ...roles: string[]) { if (!roles.includes(user.role)) fail('Akses ditolak.',403); }
export function text(value: unknown, label: string, max=500, required=true): string {
  if (value == null && !required) return '';
  if (typeof value !== 'string' && typeof value !== 'number') fail(`${label} tidak valid.`);
  const result = String(value).trim(); if ((required && !result) || result.length > max) fail(`${label} wajib diisi, maksimum ${max} karakter.`); return result;
}
export function choice(value: unknown, allowed: string[], label='Pilihan') { const v=text(value,label); if(!allowed.includes(v))fail(`${label} tidak valid.`);return v; }
export function number(value: unknown, min=0,max=100) { if(!['string','number'].includes(typeof value)||String(value).trim()==='')fail('Angka wajib diisi.');const n=Number(value);if(!Number.isFinite(n)||n<min||n>max)fail(`Angka harus ${min}–${max}.`);return n; }
export function reference(table: string, pk: string, value: unknown, active=true) { const r=one(table,{[pk]:text(value,pk,40)}); if(!r || active && r.status !== 'aktif' && r.status !== 'Aktif')fail('Referensi tidak dikenal atau nonaktif.'); return r; }
export function range(input: Row, p?: Row) { const mulai=dateValue(input.mulai),selesai=dateValue(input.selesai);if(mulai>selesai || p && (mulai<p.mulai || selesai>p.selesai))fail('Rentang tanggal tidak sesuai periode.'); return {mulai,selesai}; }
export function audit(user: AuthUser, table: string, id: string, before: unknown, after: unknown, reason='') {
  const redact=(v:any)=>{if(!v||typeof v!=='object')return v;const r={...v};delete r.password;delete r._rowid;return r;};
  db.prepare('INSERT INTO ak_riwayat(id,actor_id,entity,record_id,action,sebelum,sesudah,alasan,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(randomUUID(),user.id_user,table,id,before?'ubah':'buat',JSON.stringify(redact(before)),JSON.stringify(redact(after)),reason,new Date().toISOString());
}
export function write(user:AuthUser,table:string,keys:Row,values:Row,reason=''):Row {
  const before=one(table,keys);const columns=new Set(rows(`PRAGMA table_info(${table})`).map(r=>r.name));
  const data=Object.fromEntries(Object.entries({...values,updated_by:user.id_user,updated_at:new Date().toISOString()}).filter(([key,v])=>columns.has(key)&&v!==undefined));
  if(before)db.prepare(`UPDATE ${table} SET ${Object.keys(data).map(k=>`${k}=?`).join(',')} WHERE rowid=?`).run(...Object.values(data),before._rowid);
  else {const all:Row={...keys,...data};if(columns.has('created_by')&&!all.created_by)all.created_by=user.id_user;if(columns.has('created_at')&&!all.created_at)all.created_at=new Date().toISOString();db.prepare(`INSERT INTO ${table}(${Object.keys(all).join(',')}) VALUES(${Object.keys(all).map(()=>'?').join(',')})`).run(...Object.values(all));}
  const after=one(table,keys)!;audit(user,table,String(Object.values(keys)[0]),before||null,after,reason);return after;
}
export function nextId(table:string,pk:string) { return String(Number(rows(`SELECT COALESCE(MAX(CAST(${pk} AS INTEGER)),0) n FROM ${table}`)[0].n)+1); }
export function unique(table:string,key:string,value:unknown,pk:string,id?:string) { if(rows(`SELECT 1 FROM ${table} WHERE lower(${key})=lower(?) ${id?'AND '+pk+'<>?':''}`,String(value),...(id?[id]:[])).length)fail(`${key} sudah digunakan.`,409); }
export function ensureVersion(before:Row|undefined, input:Row) { if(before && input.etag!==hash(before))fail('Data berubah. Muat ulang sebelum menyimpan.',409); }
export function publicRow(row:Row): Row {const r: Row={...row,etag:hash(row)};delete r.password;delete r._rowid;return r;}
