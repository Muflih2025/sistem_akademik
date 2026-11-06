'use strict';
// Run after tsx_complete_workflows.cjs against the same external synthetic fixture.
const {fs,path,state,base,db,assert,request,login,browser,context,unchanged}=require('./tsx_admin_helpers.cjs');
const nonce=require('crypto').randomBytes(4).toString('hex'),results=[];
const record=(id,details={})=>{results.push({id,status:'PASS',details});console.log('PASS '+id)};
async function group(id,fn){try{await fn()}catch(e){results.push({id,status:'FAIL',message:e.stack});console.error('FAIL '+id+' '+e.message)}}
async function post(p,name,url,scope=p){const pending=p.waitForResponse(r=>new URL(r.url()).pathname===url&&r.request().method()==='POST');await scope.getByRole('button',{name,exact:true}).click();const r=await pending,j=await r.json();assert.equal(r.status(),200,JSON.stringify(j));return j;}
async function field(p,label,value){const input=p.getByLabel(label,{exact:true});if(await input.evaluate(el=>el.tagName==='SELECT'))await input.selectOption(String(value));else await input.fill(String(value));}
const saved={};let b,admin,guru,duty,head,student;
(async()=>{
 [admin,guru,duty,head,student]=await Promise.all(['uji_admin','uji_guru','uji_piket','uji_kepsek','uji_siswa'].map(login));b=await browser();
 const ctx=await context(b,admin),p=await ctx.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 const specs=[
  ['jurusan','Jurusan','id_jurusan','Nama jurusan',{ 'Kode jurusan':'J'+nonce,'Nama jurusan':'Jurusan Tombol '+nonce}],
  ['kelas','Kelas','id_kelas','Nama kelas',()=>({'Nama kelas':'X Tombol '+nonce,'Tingkat':'X','Jurusan':saved.jurusan.id_jurusan})],
  ['guru','Guru','id_guru','Nama guru',{'NIP':'NIP'+nonce,'Nama guru':'Guru Tombol '+nonce,'Email':'uji@example.invalid','No. HP':'08123456789'}],
  ['siswa','Siswa','nis','Nama siswa',()=>({'NIS':'93'+parseInt(nonce,16),'Nama siswa':'Siswa Tombol '+nonce,'Jenis kelamin':'P','Tanggal lahir':'2009-02-01','Kelas':saved.kelas.id_kelas,'Alamat':'Alamat sintetis'})],
  ['mata_pelajaran','Mata pelajaran','id_mapel','Nama mapel',{'Kode mapel':'M'+nonce,'Nama mapel':'Mapel Tombol '+nonce,'Kelompok':'Produktif','KKM':'75'}],
  ['ak_ruang','Ruang & laboratorium','id_ruang','Nama ruang',{'Kode ruang':'R'+nonce,'Nama ruang':'Ruang Tombol '+nonce,'Jenis':'Laboratorium'}],
  ['ekstrakurikuler','Ekstrakurikuler','id_ekskul','Nama kegiatan',{'Nama kegiatan':'Ekskul Tombol '+nonce,'Guru pembina':'1','Nama pembina':'Guru Review Satu','Deskripsi':'Latihan sintetis'}],
 ];
 for(const [table,label,pk,name,values] of specs)await group('CRUD_'+table,async()=>{
  await p.goto(base+'/admin/master?table='+table);
  const add=p.getByRole('button',{name:'Tambah '+label,exact:true});await add.click();
  for(const [key,value]of Object.entries(typeof values==='function'?values():values))await field(p,key,value);
  let j=await post(p,'Simpan','/api/admin');saved[table]=j.data;const id=j.data[pk],original=String((typeof values==='function'?values():values)[name]);
  await p.reload();await p.getByLabel('Cari data',{exact:true}).fill(nonce);
  let row=p.getByRole('row').filter({has:p.getByRole('cell',{name:original,exact:true})});await row.waitFor();
  await row.getByRole('button',{name:'Edit',exact:true}).click();const revised='Revisi '+original;
  await field(p,name,revised);await field(p,'Alasan perubahan','Perbaikan data sintetis');j=await post(p,'Simpan','/api/admin');
  assert.equal(db.prepare(`SELECT * FROM ${table} WHERE ${pk}=?`).get(id)[Object.keys(j.data).find(k=>j.data[k]===revised)],revised);
  row=p.getByRole('row').filter({has:p.getByRole('cell',{name:revised,exact:true})});await row.waitFor();
  await post(p,'Nonaktifkan','/api/admin',row);assert.equal(db.prepare(`SELECT status FROM ${table} WHERE ${pk}=?`).get(id).status,'nonaktif');
  await row.getByRole('button',{name:'Aktifkan',exact:true}).waitFor();await post(p,'Aktifkan','/api/admin',row);assert.equal(db.prepare(`SELECT status FROM ${table} WHERE ${pk}=?`).get(id).status,'aktif');
  await p.reload();await p.getByLabel('Cari data',{exact:true}).fill(nonce);await row.waitFor();
  const downloaded=p.waitForEvent('download');await p.getByRole('button',{name:'Unduh Data CSV',exact:true}).click();const file=await downloaded;assert.equal(await file.failure(),null);assert(fs.readFileSync(await file.path(),'utf8').includes(revised));
  await add.click();await p.getByRole('button',{name:'Batal',exact:true}).click();assert.equal(await p.locator('form').count(),0);
  record('CRUD_'+table,{actions:['create','reload','edit','deactivate','reactivate','search','download CSV','cancel']});
 });
 await group('FOUNDATION_membership_and_homeroom_buttons',async()=>{
  assert(saved.siswa&&saved.kelas);await p.goto(base+'/admin/penugasan');
  await p.getByRole('button',{name:'Keanggotaan kelas',exact:true}).click();await p.getByRole('button',{name:'Tambah Keanggotaan kelas',exact:true}).click();
  await field(p,'Siswa',saved.siswa.nis);await field(p,'Kelas',saved.kelas.id_kelas);await field(p,'Nomor absen','1');await field(p,'Dasar penetapan / alasan koreksi','Roster sintetis tombol');
  let j=await post(p,'Simpan penetapan','/api/foundation');assert(db.prepare('SELECT 1 FROM ak_anggota_kelas WHERE id=?').get(j.data.id));
  await p.reload();await p.getByRole('button',{name:'Keanggotaan kelas',exact:true}).click();await p.getByLabel('Cari penetapan',{exact:true}).fill(nonce);
  const row=p.getByRole('row').filter({hasText:nonce});await row.getByRole('button',{name:'Edit',exact:true}).click();await field(p,'Nomor absen','2');await field(p,'Dasar penetapan / alasan koreksi','Koreksi nomor absen sebelum dipakai');j=await post(p,'Simpan penetapan','/api/foundation');assert.equal(j.data.nomor_absen,'2');
  await p.getByRole('button',{name:'Wali kelas',exact:true}).click();await p.getByRole('button',{name:'Tambah Wali kelas',exact:true}).click();await field(p,'Guru wali','2');await field(p,'Kelas',saved.kelas.id_kelas);await field(p,'Dasar penetapan / alasan koreksi','Penetapan wali sintetis');j=await post(p,'Simpan penetapan','/api/foundation');const wid=j.data.id;
  await p.reload();await p.getByRole('button',{name:'Wali kelas',exact:true}).click();await p.getByLabel('Cari penetapan',{exact:true}).fill(nonce);await p.getByRole('row').filter({hasText:nonce}).getByRole('button',{name:'Edit',exact:true}).click();await field(p,'Tugas aktif','0');await field(p,'Dasar penetapan / alasan koreksi','Pencabutan tugas sintetis');await post(p,'Simpan penetapan','/api/foundation');assert.equal(db.prepare('SELECT aktif FROM ak_wali_kelas WHERE id=?').get(wid).aktif,'0');
  record('FOUNDATION_membership_create_edit_and_homeroom_create_revoke');
 });
 await group('CALENDAR_edit_publication_and_deactivation',async()=>{
  const title='Agenda Tombol '+nonce;await p.goto(base+'/admin/kalender');await p.getByRole('button',{name:'Tambah agenda',exact:true}).click();await field(p,'Periode','1');await field(p,'Judul agenda',title);await field(p,'Catatan / alasan perubahan','Agenda draft sintetis');
  let j=await post(p,'Simpan agenda','/api/kalender'),id=j.data.id;
  let publicData=await request('/api/kalender?bulan=2026-11',student);assert(!publicData.json.data.some(r=>r.id===id));
  await p.reload();let row=p.getByRole('row').filter({has:p.getByRole('cell',{name:title,exact:true})});await row.getByRole('button',{name:'Edit',exact:true}).click();await field(p,'Status','disahkan');await field(p,'Catatan / alasan perubahan','Pengesahan agenda sintetis');await post(p,'Simpan agenda','/api/kalender');
  publicData=await request('/api/kalender?bulan=2026-11',student);assert(publicData.json.data.some(r=>r.id===id));
  await p.reload();await row.getByRole('button',{name:'Edit',exact:true}).click();await field(p,'Status','nonaktif');await field(p,'Catatan / alasan perubahan','Pembatalan agenda sintetis');await post(p,'Simpan agenda','/api/kalender');
  publicData=await request('/api/kalender?bulan=2026-11',student);assert(!publicData.json.data.some(r=>r.id===id));record('CALENDAR_draft_publish_edit_deactivate_and_student_visibility');
 });
 await group('BELL_add_remove_and_revision',async()=>{
  const name='Profil Tombol '+nonce;await p.goto(base+'/admin/jam-belajar');await p.getByRole('button',{name:'Tambah profil jam',exact:true}).click();await field(p,'Nama profil hari',name);await field(p,'Alasan versi baru','Profil jam sintetis');
  await p.getByRole('button',{name:'Tambah baris jam',exact:true}).click();assert.equal(await p.getByRole('button',{name:'Hapus baris',exact:true}).count(),2);await p.getByRole('button',{name:'Hapus baris',exact:true}).nth(1).click();assert.equal(await p.getByRole('button',{name:'Hapus baris',exact:true}).count(),1);
  await post(p,'Simpan versi jam','/api/jam-belajar');await p.reload();let section=p.locator('section').filter({has:p.getByRole('heading',{name:new RegExp(name)})});await section.getByRole('button',{name:'Buat revisi profil',exact:true}).click();await field(p,'Selesai baris 1','07:50');await field(p,'Status profil','referensi');await field(p,'Alasan versi baru','Revisi jam sintetis');await p.getByLabel('Berlaku hari Sabtu',{exact:true}).check();await p.getByLabel('Konfirmasi pemeriksaan jam',{exact:true}).check();await post(p,'Simpan versi jam','/api/jam-belajar');await p.reload();await p.getByRole('heading',{name:new RegExp(name+' · Versi 2 · referensi')}).waitFor();assert.equal(db.prepare('SELECT COUNT(*) n FROM ak_jam_belajar WHERE nama=?').get(name).n,2);record('BELL_add_remove_rows_and_versioned_revision_saved');
 });
 assert.deepEqual(errors,[]);await ctx.close();
 await group('TEACHER_edit_attendance_grades_and_rules',async()=>{
  const tc=await context(b,guru),t=await tc.newPage();
  try{
   await t.goto(base+'/guru/absen?id_jadwal=1&tanggal=2026-10-30');await t.getByLabel('9000001 H',{exact:true}).waitFor();assert(await t.getByRole('button',{name:'Tandai Semua Hadir',exact:true}).isDisabled());await t.getByRole('checkbox',{name:'Saya sudah memeriksa kehadiran siswa',exact:true}).check();await t.getByRole('button',{name:'Tandai Semua Hadir',exact:true}).click();await t.getByLabel('9000002 I',{exact:true}).click();await field(t,'Materi pembelajaran','Revisi materi audit '+nonce);await field(t,'Alasan koreksi','Koreksi absensi sintetis');await post(t,'Simpan Absensi & Jurnal','/api/absensi');await t.reload();await t.getByLabel('9000002 I',{exact:true}).waitFor();assert.equal(await t.getByLabel('9000002 I',{exact:true}).getAttribute('aria-pressed'),'true');
   await t.goto(base+'/guru/nilai?id_jadwal=1');await t.getByLabel('9000001 tugas',{exact:true}).waitFor();const priorRule=db.prepare("SELECT id_aturan FROM ak_nilai WHERE nis='9000001' AND id_tahun_ajaran='1' AND id_mapel='1'").get().id_aturan;
   await t.getByText('Aturan & bobot penilaian',{exact:true}).click();await field(t,'Bobot tugas','20');await field(t,'Bobot uts','40');await field(t,'Dasar perubahan bobot','Revisi bobot sintetis');await post(t,'Simpan versi aturan','/api/aturan-nilai');await t.getByText('Versi aturan tersimpan.',{exact:true}).waitFor();assert.equal(db.prepare("SELECT id_aturan FROM ak_nilai WHERE nis='9000001' AND id_tahun_ajaran='1' AND id_mapel='1'").get().id_aturan,priorRule);
   for(const nis of ['9000001','9000002']){for(const component of ['tugas','uts','uas'])await field(t,nis+' '+component,'86');await field(t,'Deskripsi capaian '+nis,'Mampu menyelesaikan latihan audit.');}
   await field(t,'Alasan koreksi','Koreksi nilai dan deskripsi sintetis');await post(t,'Simpan Nilai','/api/nilai');await t.reload();await t.getByLabel('9000001 tugas',{exact:true}).waitFor();assert.equal(await t.getByLabel('9000001 tugas',{exact:true}).inputValue(),'86');assert.equal(await t.getByLabel('Deskripsi capaian 9000001',{exact:true}).inputValue(),'Mampu menyelesaikan latihan audit.');
   record('TEACHER_attendance_edit_bulk_attendance_rules_and_grade_descriptions_persist');
  }finally{await tc.close()}
 });
 await group('DUTY_correction_weekly_matrix_and_print',async()=>{
  const dc=await context(b,duty);await dc.addInitScript(()=>{window.__printCalls=0;window.print=()=>window.__printCalls++});const d=await dc.newPage();
  try{await d.goto(base+'/piket?tanggal=2026-10-30');const cls=d.locator('section').filter({has:d.getByRole('heading',{name:'XII PPLG 2',exact:true})}).first();await cls.getByText('Koreksi catatan harian terkonfirmasi',{exact:true}).click();await field(cls,'Koreksi siswa 1','9000001');await field(cls,'Status koreksi harian','I');await field(cls,'Keterangan koreksi harian','Izin pada audit sintetis');await field(cls,'Alasan harian 1','Koreksi berdasarkan bukti sintetis');await post(d,'Simpan koreksi harian','/api/piket',cls);assert.equal(db.prepare("SELECT status FROM ak_absensi_harian WHERE nis='9000001' AND tanggal='2026-10-30'").get().status,'I');
   await d.reload();await d.getByRole('button',{name:'Tampilkan Matriks Mingguan',exact:true}).click();await d.getByRole('heading',{name:'Matriks Absensi Harian Sekolah',exact:true}).waitFor();await d.getByRole('button',{name:'Cetak Tampilan Piket',exact:true}).click();assert.equal(await d.evaluate(()=>window.__printCalls),1);record('DUTY_correct_daily_record_weekly_matrix_and_print_button');
  }finally{await dc.close()}
 });
 await group('SIDEBAR_all_roles_actual_link_clicks',async()=>{
  let links=0;
  for(const [who,home]of [[admin,'/admin'],[guru,'/guru'],[duty,'/guru'],[head,'/kepsek'],[student,'/siswa']]){
   const nc=await context(b,who),n=await nc.newPage(),navErrors=[];n.on('pageerror',e=>navErrors.push(e.message));
   try{await n.goto(base+home);await n.waitForFunction(name=>document.querySelector('.sia-identity')?.textContent.includes(name),who.user.nama);
    const modules=await n.getByRole('navigation',{name:'Modul utama',exact:true}).getByRole('link').evaluateAll(nodes=>nodes.map(el=>({href:el.getAttribute('href'),label:el.textContent.trim()})));
    if(who===guru)assert(!modules.some(m=>m.label==='Guru Piket'));if(who===duty)assert(modules.some(m=>m.label==='Guru Piket'));
    for(const mod of modules){await n.getByRole('navigation',{name:'Modul utama',exact:true}).getByRole('link',{name:mod.label,exact:true}).click();await n.waitForURL(base+mod.href);await n.getByRole('navigation',{name:'Fitur modul',exact:true}).waitFor();
     const features=await n.getByRole('navigation',{name:'Fitur modul',exact:true}).getByRole('link').evaluateAll(nodes=>nodes.map(el=>({href:el.getAttribute('href'),label:el.textContent.trim()})));
     for(const item of features){await n.getByRole('navigation',{name:'Fitur modul',exact:true}).getByRole('link',{name:item.label,exact:true}).click();await n.waitForURL(base+item.href);assert.equal(await n.locator('main').count(),1,item.href);await n.getByRole('navigation',{name:'Fitur modul',exact:true}).locator('a[aria-current=page]').waitFor();assert.equal(await n.getByRole('navigation',{name:'Fitur modul',exact:true}).locator('a[aria-current=page]').getAttribute('href'),item.href);assert.equal(await n.getByRole('navigation',{name:'Modul utama',exact:true}).locator('a[aria-current=page]').innerText(),mod.label,item.href);links++;}
    }
    if(who===admin){await n.goto(base+'/jam-belajar');await n.getByRole('navigation',{name:'Fitur modul',exact:true}).getByRole('link',{name:'Ubah Jam Pembelajaran',exact:true}).waitFor();assert.equal(await n.getByRole('navigation',{name:'Fitur modul',exact:true}).locator('a[aria-current=page]').getAttribute('href'),'/admin/jam-belajar');}
    if(who===head){await n.goto(base+'/kepsek/rapor');await n.getByRole('navigation',{name:'Fitur modul',exact:true}).getByRole('link',{name:'Rapor Semester',exact:true}).waitFor();assert.equal(await n.getByRole('link',{name:'Verifikasi Rapor',exact:true}).count(),0);}
    if(who===student)for(const width of [320,390,768,1440]){await n.setViewportSize({width,height:900});assert(await n.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'sidebar overflow '+width);}
    assert.deepEqual(navErrors,[]);
   }finally{await nc.close()}
  }
  record('SIDEBAR_five_role_menus_links_highlights_shared_pages_and_mobile',{clicked:links});
 });
 await group('TEACHER_clear_selection_during_loading',async()=>{
  const tc=await context(b,guru),t=await tc.newPage();
  try{await t.route('**/api/nilai?id_jadwal=*',async route=>{await new Promise(resolve=>setTimeout(resolve,500));await route.continue().catch(()=>{})});await t.goto(base+'/guru/nilai?id_jadwal=1');await t.getByText('Memuat nilai…',{exact:true}).waitFor();await t.getByLabel('Jadwal mengajar',{exact:true}).selectOption('');await t.getByText('Memuat nilai…',{exact:true}).waitFor({state:'hidden'});assert(await t.getByRole('button',{name:'Simpan Nilai',exact:true}).isDisabled());
   await t.route('**/api/absensi?*',async route=>{await new Promise(resolve=>setTimeout(resolve,500));await route.continue().catch(()=>{})});await t.goto(base+'/guru/absen?id_jadwal=1&tanggal=2026-10-30');await t.getByText('Memuat pertemuan…',{exact:true}).waitFor();await t.getByLabel('Jadwal mengajar',{exact:true}).selectOption('');await t.getByText('Memuat pertemuan…',{exact:true}).waitFor({state:'hidden'});record('TEACHER_clear_schedule_aborts_loading_without_stuck_form');
  }finally{await tc.close()}
 });
 unchanged();record('INTEGRITY_original_school_database_unchanged');
})().catch(e=>{results.push({id:'runner',status:'ERROR',message:e.stack});console.error(e.stack)}).finally(async()=>{if(b)await b.close();db.close();const report={method:'Actual Chromium create/edit/status/download/cancel buttons plus every module/sidebar link for five role contexts on an external synthetic fixture',passed:results.filter(t=>t.status==='PASS').length,failed:results.filter(t=>t.status==='FAIL'||t.status==='ERROR').length,tests:results};fs.writeFileSync(path.join(state,'reports/crud-sidebar.json'),JSON.stringify(report,null,2)+'\n');console.log(`${report.passed} PASS, ${report.failed} FAIL`);process.exitCode=report.failed?1:0});
