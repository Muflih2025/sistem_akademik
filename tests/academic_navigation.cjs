'use strict';
// Real, read-only navigation across both academic and retained Admin templates.
const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(__dirname,'..'),state='/home/muflih/.local/state/sia-academic-dev/20261031',base=process.env.SIA_TEST_BASE_URL||'http://127.0.0.1:18125';
if(!['http://127.0.0.1:18125','http://127.0.0.1:18126'].includes(base))throw Error('Only isolated local development ports accepted');
const cfg=JSON.parse(fs.readFileSync(state+'/private/runtime.json'));
if(cfg.APP_ENV!=='testing'||cfg.DB_NAME!=='sia_academic_dev_20261031'||!cfg.DB_SOCKET||cfg.ALLOW_SCHEMA_CHANGES!=='0')throw Error('Refuse wrong environment');
const {chromium}=require(cfg.PDF_PLAYWRIGHT_PATH),results=[],contexts=[];
const check=(v,m='Condition failed')=>{if(!v)throw Error(m);};
const snapshot=()=>cp.execFileSync('php',[root+'/ops/database/db_snapshot.php',state+'/private/inspector.json']).toString();
async function test(name,fn){try{await fn();results.push({test:name,status:'PASS'});console.log('PASS '+name);}catch(e){results.push({test:name,status:'FAIL',error:e.name});console.error('FAIL '+name+': '+e.message);}}
(async()=>{
 const before=snapshot(),browser=await chromium.launch();
 try{
  async function login(username,js=true){const c=await browser.newContext({viewport:{width:1440,height:1000},javaScriptEnabled:js});contexts.push(c);await c.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());const p=await c.newPage();await p.goto(base+'/auth/login.php');await p.locator('[name=username]').fill(username);await p.locator('[name=password]').fill('password');await Promise.all([p.waitForURL(/\/beranda(?:\?|$)|\/academic\/index\.php/),p.getByRole('button',{name:'Masuk',exact:true}).click()]);return p;}
  const admin=await login('uji_admin'),teacher=await login('uji_guru'),duty=await login('uji_piket'),head=await login('uji_kepsek'),student=await login('uji_siswa');
  await test('admin_top_modules_change_contextual_left_sidebar_on_real_pages',async()=>{
   for(const[key,items]of [['master',['Data Siswa','Data Guru','Data Kelas','Data Jurusan','Mata Pelajaran','Ruang & Laboratorium','Bulk Upload Excel']],['akademik',['Periode & Penugasan','Kelola Jadwal','Penugasan Guru','Tahun Ajaran','Lihat Jadwal','Jam Belajar','Kalender Akademik','Naik Kelas','Alumni','Ekstrakurikuler']],['kehadiran',['Absensi Harian & Piket','Jurnal Kelas & Agenda Guru']],['penilaian',['Rekap Nilai','Rapor Semester']],['monitoring',['Guru Mengajar']],['pengaturan',['Manajemen Akun']]]){
    await Promise.all([admin.waitForNavigation(),admin.locator(`.sia-modules [data-module="${key}"]`).click()]);check(await admin.locator(`.sia-modules [data-module="${key}"][aria-current]`).count()===1,'Module active state incorrect');check(JSON.stringify(await admin.locator('.sia-sidebar nav a>span:first-child').allTextContents())===JSON.stringify(items),'Features from another module leaked into sidebar');
    for(const label of items){const response=await Promise.all([admin.waitForNavigation(),admin.locator('.sia-sidebar').getByRole('link',{name:label,exact:true}).click()]);check(response[0].status()===200,'Feature did not load: '+label);check(await admin.locator('main').count()===1,'Malformed legacy layout');check(await admin.locator('.sia-sidebar [aria-current=page]').count()===1,'Feature active state missing: '+label);}
   }
  });
  await test('role_specific_modules_and_piket_assignment_do_not_grant_admin_access',async()=>{
   for(const p of [teacher,duty,head,student]){check(await p.locator('.sia-modules [data-module=master]').count()===0);check(await p.locator('.sia-modules [data-module=pengaturan]').count()===0);check((await p.request.get(base+'/admin/users.php')).status()===403);}
   check(await teacher.locator('.sia-modules [data-module=piket]').count()===0);check(await duty.locator('.sia-modules [data-module=piket]').count()===1);check(await teacher.locator('.bottom-nav a[href="/rapor"]').count()===0);check((await teacher.request.get(base+'/rapor?id=137')).status()===403);
   await Promise.all([duty.waitForNavigation(),duty.locator('.sia-modules [data-module=piket]').click()]);check(await duty.locator('.sia-sidebar').getByRole('link',{name:'Pantau & Rekap Absensi',exact:true}).count()===1);
   await Promise.all([head.waitForNavigation(),head.locator('.sia-modules [data-module=monitoring]').click()]);check(await head.locator('.sia-sidebar').getByRole('link',{name:'Guru Mengajar',exact:true}).count()===1);
   for(const p of [teacher,duty,head,student]){
    const moduleLinks=await p.locator('.sia-modules a').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));
    for(const url of moduleLinks){check((await p.goto(base+url)).status()===200);const links=await p.locator('.sia-sidebar nav a').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));for(const feature of links){check((await p.goto(base+feature)).status()===200,'Role feature unavailable: '+feature);check(await p.locator('main').count()===1);check(await p.locator('.sia-sidebar [aria-current=page]').count()===1,'Role feature selection incorrect: '+feature);}}
   }
  });
  await test('mobile_menu_keyboard_toggle_keeps_unsaved_attendance_inputs',async()=>{
   await teacher.setViewportSize({width:375,height:900});await teacher.goto(base+'/absensi?id_jadwal=3&tanggal=2026-10-26');const menu=teacher.locator('#sia-feature-menu'),summary=menu.locator('summary');check(!await menu.evaluate(e=>e.open));const radio=teacher.locator('[data-student] input[value=I]').first();await radio.check();await teacher.locator('[name=materi]').fill('Belum disimpan: uji buka tutup navigasi');await summary.focus();await teacher.keyboard.press('Enter');check(await menu.evaluate(e=>e.open));check(await menu.getByRole('link',{name:'Riwayat & Cetak',exact:true}).isVisible());await teacher.keyboard.press('Enter');check(!await menu.evaluate(e=>e.open));check(await radio.isChecked());check(await teacher.locator('[name=materi]').inputValue()==='Belum disimpan: uji buka tutup navigasi');await teacher.reload();check(await teacher.locator('[name=materi]').inputValue()!=='Belum disimpan: uji buka tutup navigasi');
  });
  await test('320_to_desktop_academic_and_master_pages_have_no_page_overflow',async()=>{
   for(const width of [320,375,430,768,1440])for(const[p,url,name]of [[admin,'/admin/master.php?table=siswa','admin'],[teacher,'/absensi?id_jadwal=3&tanggal=2026-10-26','teacher'],[head,'/guru-mengajar?tanggal=2026-10-30&jam_ke=1','head']]){
    await p.setViewportSize({width,height:1000});check((await p.goto(base+url)).status()===200);check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Page overflow '+name+' '+width);const menu=p.locator('#sia-feature-menu');check(await menu.evaluate(e=>e.open)===(width>=1000),'Incorrect responsive menu state');if(width>=1000){const side=await menu.boundingBox(),main=await p.locator('main').boundingBox();check(side.x+side.width<=main.x+1,'Sidebar is not left of content');}else{await menu.locator('summary').click();check(await menu.locator('nav a').first().isVisible());await menu.locator('summary').click();}if([320,1440].includes(width))await p.screenshot({path:state+`/reports/navigation-${name}-${width}.png`,fullPage:true});
   }
  });
  await test('without_javascript_native_feature_menu_still_navigates',async()=>{
   const p=await login('uji_admin',false);await p.setViewportSize({width:320,height:900});await p.goto(base+'/admin/master.php?table=siswa');check(await p.locator('.sia-sidebar').getByRole('link',{name:'Data Guru',exact:true}).isVisible());await Promise.all([p.waitForNavigation(),p.locator('.sia-sidebar').getByRole('link',{name:'Data Guru',exact:true}).click()]);check(await p.locator('.sia-sidebar [aria-current=page]').innerText()==='Data Guru\n›');check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  });
  await test('print_hides_navigation_and_original_backend_guards_still_apply',async()=>{
   await teacher.goto(base+'/absensi?id_jadwal=3&tanggal=2026-10-26');await teacher.emulateMedia({media:'print'});for(const selector of ['.sia-header','.sia-modules','.sia-sidebar','.sia-bottom'])check(!await teacher.locator(selector).isVisible());check(await teacher.locator('main').isVisible());await teacher.emulateMedia({media:'screen'});
   check((await teacher.request.get(base+'/absensi?id_jadwal=2&tanggal=2026-10-30')).status()===403);check((await teacher.request.post(base+'/absensi?id_jadwal=3&tanggal=2026-10-26',{form:{action:'pertemuan',csrf_token:'invalid'}})).status()===419);for(const url of ['/.git/config','/.env','/db_sia_smkn2_magelang.sql','/includes/app_navigation.php'])check((await teacher.request.get(base+url)).status()===404);
  });
  await test('four_operational_roles_logout_and_protected_routes_require_login',async()=>{
   for(const p of [admin,teacher,duty,head]){await p.goto(base+'/beranda');await Promise.all([p.waitForNavigation(),p.getByRole('button',{name:'Keluar',exact:true}).click()]);check((await p.request.get(base+'/beranda',{maxRedirects:0})).status()===302);}
  });
 }finally{for(const c of contexts)await c.close();await browser.close();await test('navigation_tests_preserve_whole_database_schema_and_data',async()=>check(snapshot()===before));}
 const report={tested_at:new Date().toISOString(),passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length,skipped:0,tests:results};fs.writeFileSync(state+'/reports/navigation-tests.json',JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(`${report.passed} PASS, ${report.failed} FAIL`);process.exitCode=report.failed?1:0;
})().catch(e=>{console.error('Navigation runner failed: '+e.name);process.exitCode=1;});
