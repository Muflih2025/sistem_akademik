import { AuthUser } from './auth';
import { Row,dateValue } from './academic';
import { catalog,masterTables } from './catalog';
import { rows,one,role,fail,text,choice,number,reference,unique,write,nextId,ensureVersion,publicRow,today } from './store';
export function masterTable(input:string){const name=({mapel:'mata_pelajaran',ruang:'ak_ruang'} as Record<string,string>)[input]||input;if(!masterTables.includes(name))fail('Master tidak dikenal.',404);return name;}
export function listMaster(user:AuthUser,table:string,q='',limit=50,offset=0){role(user,'admin');table=masterTable(table);const d=catalog[table];if(!Number.isInteger(limit)||limit<1||limit>1000||!Number.isInteger(offset)||offset<0)fail('Pagination tidak valid.');const where=q?'WHERE '+d.fields.map(f=>`${f.key} LIKE ?`).join(' OR '):'',args=q?d.fields.map(()=>`%${q.slice(0,100)}%`):[];return{table,definition:d,total:rows(`SELECT COUNT(*) n FROM ${table} ${where}`,...args)[0].n,data:rows(`SELECT rowid _rowid,* FROM ${table} ${where} ORDER BY CAST(${d.pk} AS INTEGER),${d.pk} LIMIT ? OFFSET ?`,...args,limit,offset).map(publicRow)};}
export function saveMaster(user:AuthUser,input:Row){role(user,'admin');const table=masterTable(text(input.table,'Master')),d=catalog[table],id=input.id?String(input.id):'',before=id?one(table,{[d.pk]:id}):undefined;if(id&&!before)fail('Data tidak ditemukan.',404);ensureVersion(before,input);const action=choice(input.action||'save',['save','activate','deactivate']);const v:Row={};
 if(action!=='save'){if(!before)fail('Pilih data existing.');v.status=action==='activate'?'aktif':'nonaktif';}
 else{for(const f of d.fields){v[f.key]=f.options?choice(input[f.key],f.options,f.label):text(input[f.key],f.label,f.key==='alamat'?2000:150,!f.optional);if(f.reference)reference(f.reference,catalog[f.reference].pk,v[f.key]);}v.status=choice(input.status||before?.status||'aktif',['aktif','nonaktif']);
 const keys:Record<string,string[]>={siswa:['nis'],guru:['nip'],jurusan:['kode_jurusan'],kelas:['nama_kelas'],mata_pelajaran:['kode_mapel'],ak_ruang:['kode_ruang','nama_ruang']};for(const field of keys[table]||[])unique(table,field,v[field],d.pk,id);
 if(table==='siswa'){if(!/^\d{1,15}$/.test(v.nis)||before&&v.nis!==id)fail('NIS harus 1–15 digit dan tidak boleh diganti.');const date=dateValue(v.tanggal_lahir);if(date<'1900-01-01'||date>=today())fail('Tanggal lahir tidak valid.');if(before&&before.id_kelas!==v.id_kelas&&rows('SELECT 1 FROM ak_anggota_kelas WHERE nis=?',id).length)fail('Gunakan keanggotaan bertanggal untuk perpindahan.',409);}
 if(table==='guru'){if(!/^[A-Za-z0-9.\/-]{3,20}$/.test(v.nip))fail('NIP tidak valid.');if(v.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email))fail('Email tidak valid.');if(v.no_hp&&!/^[+0-9() -]{5,20}$/.test(v.no_hp))fail('Nomor telepon tidak valid.');}
 if(table==='mata_pelajaran')v.kkm=number(v.kkm,1,100);
 if(table==='kelas'&&before&&(v.tingkat!==before.tingkat||v.id_jurusan!==before.id_jurusan)&&rows('SELECT 1 FROM ak_anggota_kelas WHERE id_kelas=?',id).length)fail('Konteks kelas historis tidak dapat diubah.',409);
 if(table==='ak_ruang'&&before&&v.nama_ruang!==before.nama_ruang&&rows('SELECT 1 FROM jadwal WHERE ruang=? OR ruang=?',before.nama_ruang,before.kode_ruang).length)fail('Nama ruang sudah dipakai jadwal.',409);
 }
 const target=id||(table==='siswa'?v.nis:nextId(table,d.pk)),saved=write(user,table,{[d.pk]:target},v,text(input.alasan||'Pengelolaan master','Alasan'));
 if(['siswa','guru'].includes(table)&&v.status==='nonaktif')for(const u of rows('SELECT id_user FROM users WHERE role=? AND id_referensi=?',table,target))write(user,'users',{id_user:u.id_user},{status:'nonaktif'},'Referensi dinonaktifkan');return publicRow(saved);
}
