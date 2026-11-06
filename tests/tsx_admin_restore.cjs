'use strict';
// Run after tsx_admin_popups_delete.cjs on the same external synthetic fixture.
const {fs,path,state,base,db,assert,request,login,browser,context,unchanged}=require('./tsx_admin_helpers.cjs');
let appBrowser;const tests=[];const pass=id=>{tests.push({id,status:'PASS'});console.log('PASS '+id)};
async function json(url,session,body,expected=200){const r=await request(url,session,body);assert.equal(r.status,expected,JSON.stringify({url,error:r.json?.error}));return r.json;}
(async()=>{
 const admin=await login('uji_admin'),teacher=await login('uji_guru');
 const archived=(await json('/api/admin?table=siswa&archived=1',admin)).data.find(s=>s.nama_siswa.startsWith('Siswa popup '));assert(archived);
 const grades=db.prepare('SELECT * FROM ak_nilai ORDER BY rowid').all();
 appBrowser=await browser();const ctx=await context(appBrowser,admin),page=await ctx.newPage();
 try{
  await page.goto(base+'/admin/master?table=siswa');await page.getByLabel('Tampilkan data dihapus / arsip',{exact:true}).check();
  const row=page.getByRole('row').filter({has:page.getByRole('cell',{name:archived.nama_siswa,exact:true})});await row.getByRole('button',{name:'Pulihkan',exact:true}).click();
  await page.getByLabel('Alasan tindakan',{exact:true}).fill('Pulihkan data siswa untuk melanjutkan penetapan');
  const pending=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin'&&r.request().method()==='POST');await page.getByRole('button',{name:'Ya, pulihkan',exact:true}).click();assert.equal((await pending).status(),200);
  await page.getByText('Data dipulihkan.',{exact:true}).waitFor();assert.equal(db.prepare('SELECT status FROM siswa WHERE nis=?').get(archived.nis).status,'aktif');
  assert((await json('/api/admin?table=siswa&limit=1000',admin)).data.some(s=>s.nis===archived.nis));
  assert.deepEqual(db.prepare('SELECT * FROM ak_nilai ORDER BY rowid').all(),grades);
  pass('RESTORE_archived_student_from_popup_reappears_without_changing_grades');
 }finally{await ctx.close();}
 let year=(await json('/api/admin?table=tahun_ajaran',admin)).data.find(p=>p.id_tahun_ajaran==='1');
 await json('/api/admin',admin,{...year,table:'tahun_ajaran',id:'1',action:'delete',konfirmasi:true,alasan:'Uji hapus periode yang dapat dipulihkan'});
 year=(await json('/api/admin?table=tahun_ajaran&archived=1',admin)).data.find(p=>p.id_tahun_ajaran==='1');assert.equal(year.status,'Tidak Aktif');
 await json('/api/admin',admin,{...year,table:'tahun_ajaran',id:'1',action:'restore',konfirmasi:true,alasan:'Pulihkan periode berjalan'});assert.equal(db.prepare("SELECT status FROM tahun_ajaran WHERE id_tahun_ajaran='1'").get().status,'Aktif');
 let period=(await json('/api/foundation?kind=periode',admin)).data.find(p=>p.id_tahun_ajaran==='1');
 await json('/api/foundation',admin,{...period,kind:'periode',action:'delete',konfirmasi:true,alasan:'Uji pemulihan penetapan periode'});
 period=(await json('/api/foundation?kind=periode',admin)).archived.find(p=>p.id_tahun_ajaran==='1');assert.equal(period.terverifikasi,'0');
 await json('/api/foundation',admin,{...period,kind:'periode',action:'restore',konfirmasi:true,alasan:'Pulihkan penetapan sebelumnya'});
 assert.equal((await json('/api/foundation?kind=periode',admin)).data.find(p=>p.id_tahun_ajaran==='1').terverifikasi,'1');await json('/api/nilai?id_jadwal=1',teacher);
 pass('RESTORE_current_year_and_verified_period_can_be_recovered_after_delete');
 const member=(await json('/api/foundation?kind=anggota',admin)).archived.find(m=>m.id==='2');assert(member);
 const before=db.prepare('SELECT * FROM ak_anggota_kelas ORDER BY rowid').all();
 await json('/api/foundation',admin,{...member,kind:'anggota',action:'restore',konfirmasi:true,alasan:'Tidak boleh menimpa penetapan pengganti'},409);assert.deepEqual(db.prepare('SELECT * FROM ak_anggota_kelas ORDER BY rowid').all(),before);
 const input={table:'jadwal',action:'create',id_guru:'1',id_mapel:'1',id_kelas:'2',id_tahun_ajaran:'1',hari:'Senin',jam_mulai:'17:00',jam_selesai:'17:40',ruang:'',penugasan_mulai:'2026-07-01',penugasan_selesai:'2026-12-31',verifikasi_penugasan:'1'};
 const old=(await json('/api/admin',admin,input)).data;
 await json('/api/admin',admin,{...old,table:'jadwal',id:old.id_jadwal,action:'delete',konfirmasi:true,alasan:'Ganti dengan jadwal baru'});await json('/api/admin',admin,input);
 const removed=(await json('/api/admin?table=jadwal&archived=1',admin)).data.find(j=>j.id_jadwal===old.id_jadwal);
 await json('/api/admin',admin,{...removed,table:'jadwal',id:old.id_jadwal,action:'restore',konfirmasi:true,alasan:'Konflik dengan jadwal pengganti'},409);assert.equal(db.prepare('SELECT status FROM jadwal WHERE id_jadwal=?').get(old.id_jadwal).status,'nonaktif');
 pass('RESTORE_rejects_membership_overlap_and_schedule_collision_atomically');
 unchanged();pass('INTEGRITY_original_school_database_unchanged');
})().catch(e=>{tests.push({id:'admin-restore',status:'FAIL',message:e.stack});console.error(e.stack)}).finally(async()=>{if(appBrowser)await appBrowser.close();db.close();const report={passed:tests.filter(t=>t.status==='PASS').length,failed:tests.filter(t=>t.status==='FAIL').length,tests};fs.writeFileSync(path.join(state,'reports/admin-restore.json'),JSON.stringify(report,null,2)+'\n');console.log(`${report.passed} PASS, ${report.failed} FAIL`);process.exitCode=report.failed?1:0;});
