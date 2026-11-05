import bcrypt from 'bcryptjs';
import { AuthUser } from './auth';
import { Row } from './academic';
import { db, rows, one, fail, role, text, choice, unique, write, nextId, hash, ensureVersion } from './store';
import { removeManaged } from './management';
function view(row:Row):Row {
  const ref=row.role==='guru'?one('guru',{id_guru:row.id_referensi}):row.role==='siswa'?one('siswa',{nis:row.id_referensi}):null;
  const cls=ref?.id_kelas?one('kelas',{id_kelas:ref.id_kelas}):null;
  return {id:row.id_user,id_user:row.id_user,username:row.username,role:row.role,id_referensi:row.id_referensi||'',status:row.status,is_active:row.status==='aktif',nama:ref?.nama_guru||ref?.nama_siswa||row.username,nip_nis:ref?.nip||ref?.nis||'',kelas:cls?.nama_kelas||'',etag:hash(row)};
}
export function usersList(user:AuthUser,q:URLSearchParams) {
  role(user,'admin');return rows('SELECT rowid _rowid,* FROM users ORDER BY role,username,id_user').filter(r=>(!q.get('role')||r.role===q.get('role'))&&(!q.get('username')||r.username===q.get('username'))).map(view);
}
export function userReferences(user:AuthUser) {
  role(user,'admin');return {guru:rows("SELECT id_guru id,nama_guru nama FROM guru WHERE status='aktif' ORDER BY nama_guru"),siswa:rows("SELECT nis id,nama_siswa nama FROM siswa WHERE status='aktif' ORDER BY nama_siswa")};
}
export function saveUser(user:AuthUser,input:Row) {
  if(input.action==='delete')return removeManaged(user,'users','id_user',text(input.id_user,'ID akun',40),input);
  role(user,'admin');const id=input.id_user?text(input.id_user,'ID akun',40):'',before=id?one('users',{id_user:id}):undefined;
  if(id&&!before)fail('Akun tidak ditemukan.',404);ensureVersion(before,input);
  const action=choice(input.action||'save',['save','activate','deactivate']);
  const data:Row={};
  if(action!=='save') {if(!before)fail('Pilih akun yang sudah ada.');data.status=action==='activate'?'aktif':'nonaktif';}
  else {
    data.username=text(input.username,'Username',50);if(!/^[A-Za-z0-9_.@-]{3,50}$/.test(data.username))fail('Username harus 3–50 karakter huruf, angka, titik, garis bawah, @ atau tanda hubung.');unique('users','username',data.username,'id_user',id);
    data.role=choice(input.role,['admin','guru','kepala_sekolah','siswa'],'Peran');data.status=choice(input.status||'aktif',['aktif','nonaktif'],'Status');data.id_referensi=text(input.id_referensi,'Referensi',20,false)||null;
    const pw=input.password;if(pw!==undefined&&typeof pw!=='string')fail('Password tidak valid.');if(!before||pw){if(typeof pw!=='string'||pw.length<8||Buffer.byteLength(pw)>72)fail('Password harus minimal 8 karakter, maksimal 72 byte.');data.password=bcrypt.hashSync(pw,12);}
  }
  const next={...before,...data};
  if(['guru','siswa'].includes(next.role)) {const ref=one(next.role,{[next.role==='guru'?'id_guru':'nis']:next.id_referensi});if(!ref||ref.status!=='aktif')fail('Pilih identitas guru atau siswa yang aktif.');if(rows('SELECT 1 FROM users WHERE role=? AND id_referensi=? AND id_user<>?',next.role,next.id_referensi,id).length)fail('Identitas sudah memiliki akun dengan peran tersebut.',409);}
  else if(next.id_referensi)fail('Admin dan Kepala Sekolah tidak memakai referensi guru/siswa.');
  if(before?.role==='admin'&&before.status==='aktif'&&(next.role!=='admin'||next.status!=='aktif')&&rows("SELECT 1 FROM users WHERE role='admin' AND status='aktif'").length===1)fail('Admin aktif terakhir tidak dapat dinonaktifkan atau diganti perannya.',409);
  const saved=write(user,'users',{id_user:id||nextId('users','id_user')},data,'Pengelolaan akun oleh Admin');return view(saved);
}
export function transactionalSaveUser(user:AuthUser,input:Row) {return db.transaction(()=>saveUser(user,input)).immediate();}
