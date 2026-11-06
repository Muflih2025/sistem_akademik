'use strict';
// Run on a fresh external fixture from tsx_teacher_setup.py.
const {fs,path,state,base,db,assert,request,login,browser,context,unchanged}=require('./tsx_admin_helpers.cjs');
const results=[],nonce=require('crypto').randomBytes(3).toString('hex');let appBrowser;
const pass=id=>{results.push({id,status:'PASS'});console.log('PASS '+id)};
async function json(url,session,body,expected=200){const r=await request(url,session,body);assert.equal(r.status,expected,JSON.stringify({url,error:r.json?.error}));return r.json;}
async function post(page,name,endpoint){const pending=page.waitForResponse(r=>new URL(r.url()).pathname===endpoint&&r.request().method()==='POST');await page.getByRole('button',{name,exact:true}).click();const r=await pending,j=await r.json();assert.equal(r.status(),200,JSON.stringify(j));return j.data;}
const count=t=>db.prepare('SELECT COUNT(*) n FROM '+t).get().n;
const rows=t=>db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all();
async function field(page,label,value){const input=page.getByLabel(label,{exact:true});if(await input.evaluate(el=>el.tagName==='SELECT'))await input.selectOption(String(value));else await input.fill(String(value));}
async function confirm(page,verb,endpoint){await page.getByLabel('Alasan tindakan',{exact:true}).fill('Pengujian '+verb+' sintetis');return post(page,'Ya, '+verb,endpoint);}
async function memberForm(page,nis){await page.getByRole('button',{name:'Tambah Keanggotaan kelas',exact:true}).click();await field(page,'Siswa',nis);await field(page,'Kelas','1');await field(page,'Dasar penetapan / alasan koreksi','Penetapan siswa sintetis');}

(async()=>{
 const admin=await login('uji_admin'),teacher=await login('uji_guru'),head=await login('uji_kepsek');
 const nis='970'+String(parseInt(nonce,16)).padStart(8,'0');
 await json('/api/admin',admin,{table:'siswa',action:'create',nis,nama_siswa:'Siswa popup '+nonce,jenis_kelamin:'L',tanggal_lahir:'2009-01-01',id_kelas:'1',alamat:''});
 appBrowser=await browser();const ctx=await context(appBrowser,admin),page=await ctx.newPage();page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/admin/penugasan');await page.getByRole('button',{name:'Keanggotaan kelas',exact:true}).click();
  await page.getByRole('button',{name:'Tambah Keanggotaan kelas',exact:true}).click();
  const picker=page.getByLabel('Siswa',{exact:true});
  for(const used of ['9000001','9000002','9000003'])assert.equal(await picker.locator(`option[value="${used}"]`).count(),0);
  assert.equal(await picker.locator(`option[value="${nis}"]`).count(),1);
  assert.equal(await page.getByRole('dialog').count(),1);await page.keyboard.press('Escape');
  await memberForm(page,nis);const first=await post(page,'Simpan penetapan','/api/foundation');
  let row=page.getByRole('row').filter({has:page.getByRole('cell',{name:'Siswa popup '+nonce,exact:true})});await row.waitFor();
  await page.getByRole('button',{name:'Tambah Keanggotaan kelas',exact:true}).click();assert.equal(await picker.locator(`option[value="${nis}"]`).count(),0);await page.keyboard.press('Escape');
  await row.getByRole('button',{name:'Cabut',exact:true}).click();await page.keyboard.press('Escape');assert(db.prepare('SELECT 1 FROM ak_anggota_kelas WHERE id=?').get(first.id));
  await row.getByRole('button',{name:'Cabut',exact:true}).click();await confirm(page,'cabut','/api/foundation');await row.waitFor({state:'hidden'});
  await memberForm(page,nis);const second=await post(page,'Simpan penetapan','/api/foundation');assert.notEqual(second.id,first.id);
  pass('MEMBERSHIP_options_exclude_assigned_students_cancel_preserves_and_revoke_allows_readd_with_new_id');

  const grade=await json('/api/nilai?id_jadwal=1',teacher);await json('/api/nilai',teacher,{id_jadwal:'1',id_aturan:grade.rule.id,items:grade.data.map(m=>({...m,nilai_tugas:80,nilai_uts:80,nilai_uas:80,nilai_praktik:0,nilai_proyek:0}))});
  const gradesBefore=rows('ak_nilai'),dailyBefore=rows('ak_absensi_harian');
  const usedRow=page.getByRole('row').filter({has:page.getByRole('cell',{name:'Siswa Review 2',exact:true})});
  await usedRow.getByRole('button',{name:'Cabut',exact:true}).click();await confirm(page,'cabut','/api/foundation');await usedRow.waitFor({state:'hidden'});
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const nextDate=new Date(today+'T00:00:00Z');nextDate.setUTCDate(nextDate.getUTCDate()+1);const rejoin=nextDate.toISOString().slice(0,10);
  await memberForm(page,'9000002');assert.equal(await page.getByLabel('Berlaku mulai',{exact:true}).inputValue(),rejoin);
  const returned=await post(page,'Simpan penetapan','/api/foundation');assert.notEqual(returned.id,'2');
  assert.deepEqual(rows('ak_nilai'),gradesBefore);assert.deepEqual(rows('ak_absensi_harian'),dailyBefore);
  const gradeAfter=await json('/api/nilai?id_jadwal=1',teacher);assert.equal(gradeAfter.data.find(s=>s.nis==='9000002').id_anggota,'2');
  while(nextDate.getUTCDay()!==5)nextDate.setUTCDate(nextDate.getUTCDate()+1);
  const past=await json('/api/absensi?id_jadwal=1&tanggal=2026-10-30',teacher),future=await json('/api/absensi?id_jadwal=1&tanggal='+nextDate.toISOString().slice(0,10),teacher);
  assert.equal(past.data.find(s=>s.nis==='9000002').id_anggota,'2');assert.equal(future.data.find(s=>s.nis==='9000002').id_anggota,returned.id);
  pass('MEMBERSHIP_revoke_with_history_preserves_grades_daily_records_and_dated_rosters_after_readd');

  await page.goto(base+'/admin/users');await page.getByRole('button',{name:'Tambah Pengguna',exact:true}).click();
  await field(page,'Username akun','popup_'+nonce);await field(page,'Peran akun','kepala_sekolah');await field(page,'Password akun','Popup-fixture-password-123');
  const account=await post(page,'Simpan Akun','/api/users');
  const accountRow=page.getByRole('row').filter({has:page.getByRole('cell',{name:'popup_'+nonce,exact:true})});await accountRow.waitFor();
  await accountRow.getByRole('button',{name:'Edit akun',exact:true}).click();await field(page,'Alasan perubahan','Uji edit akun dalam popup');await post(page,'Simpan Akun','/api/users');
  const signed=await request('/api/auth',null,{username:'popup_'+nonce,password:'Popup-fixture-password-123'});assert.equal(signed.status,200);const other={cookie:signed.headers.get('set-cookie').split(';')[0]};
  await accountRow.getByRole('button',{name:'Hapus',exact:true}).click();await page.keyboard.press('Escape');assert(db.prepare('SELECT 1 FROM users WHERE id_user=?').get(account.id_user));
  await accountRow.getByRole('button',{name:'Hapus',exact:true}).click();await confirm(page,'hapus','/api/users');await accountRow.waitFor({state:'hidden'});
  assert(!db.prepare('SELECT 1 FROM users WHERE id_user=?').get(account.id_user));await json('/api/me',other,undefined,401);
  const next=(await json('/api/users',admin,{username:'next_'+nonce,role:'kepala_sekolah',status:'aktif',id_referensi:'',password:'Popup-fixture-password-456'})).data;assert(Number(next.id_user)>Number(account.id_user));
  const last=(await json('/api/users',admin)).data.find(u=>u.username==='uji_admin');
  await json('/api/users',admin,{...last,action:'delete',konfirmasi:true,alasan:'Harus menjaga admin terakhir'},409);
  pass('USERS_add_edit_delete_popup_cancel_session_revocation_reserved_ids_and_last_admin_guard');

  const department=(await json('/api/admin',admin,{table:'jurusan',action:'create',kode_jurusan:'POP'+nonce,nama_jurusan:'Jurusan popup '+nonce})).data;
  await page.goto(base+'/admin/master?table=jurusan');const departmentRow=page.getByRole('row').filter({has:page.getByRole('cell',{name:'Jurusan popup '+nonce,exact:true})});await departmentRow.waitFor();
  await departmentRow.getByRole('button',{name:'Hapus',exact:true}).click();await confirm(page,'hapus','/api/admin');await departmentRow.waitFor({state:'hidden'});
  assert(!db.prepare('SELECT 1 FROM jurusan WHERE id_jurusan=?').get(department.id_jurusan));
  const student=(await json('/api/admin?table=siswa&limit=1000',admin)).data.find(s=>s.nis===nis);
  await json('/api/admin',admin,{...student,table:'siswa',id:nis,action:'delete',konfirmasi:true,alasan:'Hapus siswa yang mempunyai riwayat'});
  assert(!(await json('/api/admin?table=siswa&limit=1000',admin)).data.some(s=>s.nis===nis));
  assert.equal(db.prepare('SELECT status FROM siswa WHERE nis=?').get(nis).status,'nonaktif');assert.deepEqual(rows('ak_nilai'),gradesBefore);
  pass('CATALOG_popup_delete_removes_unused_records_and_archives_used_records_without_losing_history');

  const protectedRow=(await json('/api/admin?table=jurusan',admin)).data[0],deletion={...protectedRow,table:'jurusan',id:protectedRow.id_jurusan,action:'delete',konfirmasi:true,alasan:'Validasi penghapusan'};
  await json('/api/admin',head,deletion,403);await json('/api/admin',teacher,deletion,403);await json('/api/admin',admin,{...deletion,konfirmasi:false},422);await json('/api/admin',admin,{...deletion,etag:'stale'},409);
  const rollback=(await json('/api/admin',admin,{table:'jurusan',action:'create',kode_jurusan:'ROLL'+nonce,nama_jurusan:'Rollback popup'})).data,audits=count('ak_riwayat');
  db.exec("CREATE TRIGGER popup_delete_failure BEFORE INSERT ON ak_riwayat WHEN NEW.entity='jurusan' AND NEW.action='hapus' BEGIN SELECT RAISE(ABORT,'synthetic deletion failure'); END");
  try{await json('/api/admin',admin,{...rollback,table:'jurusan',id:rollback.id_jurusan,action:'delete',konfirmasi:true,alasan:'Uji rollback penghapusan'},500);assert(db.prepare('SELECT 1 FROM jurusan WHERE id_jurusan=?').get(rollback.id_jurusan));assert.equal(count('ak_riwayat'),audits);}finally{db.exec('DROP TRIGGER popup_delete_failure');}
  pass('DELETE_admin_only_confirmation_version_and_atomic_rollback_enforced');

  const event=(await json('/api/kalender',admin,{id_tahun_ajaran:'1',judul:'Agenda popup '+nonce,mulai:'2026-11-05',selesai:'2026-11-05',jenis:'Agenda',status:'draft',catatan:'Fixture popup'})).data;
  await page.goto(base+'/admin/kalender');const eventRow=page.getByRole('row').filter({has:page.getByRole('cell',{name:'Agenda popup '+nonce,exact:true})});await eventRow.getByRole('button',{name:'Hapus',exact:true}).click();await confirm(page,'hapus','/api/kalender');await eventRow.waitFor({state:'hidden'});assert(!db.prepare('SELECT 1 FROM ak_kalender WHERE id=?').get(event.id));
  await json('/api/jam-belajar',admin,{nama:'Profil popup '+nonce,hari:[],status:'perlu_konfirmasi',catatan:'Uji popup',alasan:'Profil baru',slots:[[1,'07:00','07:40','Pelajaran']]});
  let bell=(await json('/api/jam-belajar',admin)).data.find(b=>b.nama==='Profil popup '+nonce);
  await json('/api/jam-belajar',admin,{...bell,...bell.payload,alasan:'Revisi profil',slots:[[1,'07:00','07:45','Pelajaran']]});
  await page.goto(base+'/admin/jam-belajar');const bellSection=page.locator('section').filter({has:page.getByRole('heading',{name:new RegExp('Profil popup '+nonce)})});await bellSection.getByRole('button',{name:'Hapus',exact:true}).click();await confirm(page,'hapus','/api/jam-belajar');await bellSection.waitFor({state:'hidden'});assert(!(await json('/api/jam-belajar',admin)).data.some(b=>b.nama==='Profil popup '+nonce));
  const report=(await json('/api/rapor',admin)).data.find(r=>r.id==='1');await json('/api/rapor',admin,{...report,action:'delete',konfirmasi:true,alasan:'Arsipkan draft fixture yang tidak digunakan'});assert(!(await json('/api/rapor',admin)).data.some(r=>r.id==='1'));assert(db.prepare("SELECT 1 FROM ak_rapor_snapshot WHERE id='1'").get());await json('/api/rapor?id=1',head,undefined,404);
  pass('DELETE_calendar_bell_versions_and_report_management_work_with_history_retained');

  const masters=[
   ['guru',{nip:'POP'+nonce,nama_guru:'Guru popup',email:'',no_hp:''}],
   ['kelas',{nama_kelas:'Kelas popup '+nonce,tingkat:'XI',id_jurusan:rollback.id_jurusan}],
   ['mata_pelajaran',{kode_mapel:'POP'+nonce,nama_mapel:'Mapel popup',kelompok:'Produktif',kkm:75}],
   ['ak_ruang',{kode_ruang:'POP'+nonce,nama_ruang:'Ruang popup',jenis:'Kelas'}],
   ['ekstrakurikuler',{nama_ekskul:'Ekskul popup',id_guru_pembina:'1',pembina:'Guru Review Satu',deskripsi:''}],
   ['jadwal',{id_guru:'1',id_mapel:'1',id_kelas:'2',id_tahun_ajaran:'1',hari:'Sabtu',jam_mulai:'15:30',jam_selesai:'16:10',ruang:''}],
   ['catatan_evaluasi',{judul:'Evaluasi popup',isi:'Catatan sintetis',id_tahun_ajaran:'1'}],
  ];
  for(const [table,values]of masters){const created=(await json('/api/admin',admin,{table,action:'create',...values})).data;const pk=Object.keys(created).find(k=>k.startsWith('id_')&&!(k in values));assert(pk,table+' primary key');await json('/api/admin',admin,{...created,table,id:created[pk],action:'delete',konfirmasi:true,alasan:'Uji hapus '+table});assert(!(await json('/api/admin?table='+table,admin)).data.some(r=>r[pk]===created[pk]),table+' hidden after delete');}
  const assignmentSchedule=(await json('/api/admin',admin,{table:'jadwal',action:'create',id_guru:'1',id_mapel:'1',id_kelas:'2',id_tahun_ajaran:'1',hari:'Sabtu',jam_mulai:'15:30',jam_selesai:'16:10',ruang:'',penugasan_mulai:'2026-07-01',penugasan_selesai:'2026-12-31',verifikasi_penugasan:'1'})).data;
  const assignment=(await json('/api/foundation?kind=penugasan',admin)).data.find(r=>r.id_jadwal===assignmentSchedule.id_jadwal);
  await json('/api/foundation',admin,{...assignment,kind:'penugasan',action:'revoke',konfirmasi:true,alasan:'Cabut penugasan yang belum dipakai'});
  assert.equal((await json('/api/admin?table=jadwal',admin)).data.find(r=>r.id_jadwal===assignmentSchedule.id_jadwal).sudah_ditugaskan,false);
  await json('/api/foundation',admin,{kind:'penugasan',id_jadwal:assignmentSchedule.id_jadwal,mulai:'2026-07-01',selesai:'2026-12-31',terverifikasi:'1',catatan:'Tetapkan ulang setelah cabut'});
  pass('DELETE_remaining_admin_masters_and_unused_teaching_assignment_revoke_reassign');

  const popupPages=[['/admin/users','Tambah Pengguna'],['/admin/master?table=jurusan','Tambah Jurusan'],['/admin/jadwal','Tambah Jadwal mengajar'],['/admin/tahun-ajaran','Tambah Tahun ajaran'],['/admin/ekskul','Tambah Ekstrakurikuler'],['/admin/penugasan','Tambah Periode akademik'],['/admin/kalender','Tambah agenda'],['/admin/jam-belajar','Tambah profil jam'],['/admin/nilai','Tambah rapor'],['/admin/kenaikan','Proses kenaikan kelas']];
  for(const [route,button]of popupPages){await page.goto(base+route);await page.getByRole('button',{name:button,exact:true}).click();const dialog=page.getByRole('dialog');await dialog.waitFor();for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});const rect=await dialog.boundingBox();assert(rect&&rect.x>=-1&&rect.x+rect.width<=width+1,route+' dialog width');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route+' page width');}await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});assert.equal(await page.evaluate(()=>document.body.style.overflow),'');}
  await page.goto(base+'/admin/alumni');const gap=await page.evaluate(()=>{const search=document.querySelector('[aria-label="Cari alumni"]'),table=document.querySelector('main table');return table.getBoundingClientRect().top-search.getBoundingClientRect().bottom;});assert(gap>=16,'Alumni search/table spacing');
  assert.deepEqual(errors,[]);pass('POPUPS_all_admin_create_forms_fit_mobile_desktop_escape_closes_and_alumni_spacing');
  const deletionAudit=db.prepare("SELECT sebelum FROM ak_riwayat WHERE entity='users' AND record_id=? AND action='hapus'").get(account.id_user);assert(deletionAudit);assert(!JSON.parse(deletionAudit.sebelum).password);
 }finally{await ctx.close();}
 unchanged();pass('INTEGRITY_school_database_unchanged_and_deleted_account_audit_redacts_password');
})().catch(error=>{results.push({id:'admin-popups-delete',status:'FAIL',message:error.stack});console.error(error.stack)}).finally(async()=>{if(appBrowser)await appBrowser.close();db.close();const report={passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length,tests:results};fs.writeFileSync(path.join(state,'reports/admin-popups-delete.json'),JSON.stringify(report,null,2)+'\n');console.log(`${report.passed} PASS, ${report.failed} FAIL`);process.exitCode=report.failed?1:0;});
