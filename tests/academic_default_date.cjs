'use strict';
// Read-only browser regression against the curated local DB. Never seed/reset it.
const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(__dirname,'..'),state='/home/muflih/.local/state/sia-academic-dev/20261031',base='http://127.0.0.1:18125';
const cfg=JSON.parse(fs.readFileSync(state+'/private/runtime.json'));
if(cfg.APP_ENV!=='testing'||cfg.DB_NAME!=='sia_academic_dev_20261031'||!cfg.DB_SOCKET||cfg.ALLOW_SCHEMA_CHANGES!=='0')throw Error('Refuse wrong environment');
const {chromium}=require(cfg.PDF_PLAYWRIGHT_PATH),results=[];
const check=(v,m='Condition failed')=>{if(!v)throw Error(m);};
const snapshot=()=>cp.execFileSync('php',[root+'/ops/db_snapshot.php',state+'/private/inspector.json']).toString();
async function test(name,fn){try{await fn();results.push({test:name,status:'PASS'});console.log('PASS '+name);}catch(e){results.push({test:name,status:'FAIL',error:e.name});console.error('FAIL '+name+': '+e.message);}}
(async()=>{
 const before=snapshot(),browser=await chromium.launch(),contexts=[];
 try{
  async function login(username){const context=await browser.newContext({viewport:{width:1440,height:1000}});contexts.push(context);await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());const p=await context.newPage();await p.goto(base+'/auth/login.php');await p.locator('[name=username]').fill(username);await p.locator('[name=password]').fill('password');await Promise.all([p.waitForURL(/\/beranda(?:\?|$)|\/academic\/index\.php/),p.getByRole('button',{name:'Masuk',exact:true}).click()]);return p;}
  const teacher=await login('uji_guru');
  await test('teacher_default_attendance_and_grade_navigation_loads_with_valid_dates',async()=>{
   for(const route of ['/absensi','/nilai','/absensi?id_jadwal=3','/nilai?id_jadwal=3','/academic/index.php?view=pertemuan','/academic/index.php?view=nilai']){
    const response=await teacher.goto(base+route);check(response.status()===200,'Default page denied: '+route);check(!((await teacher.locator('main').innerText()).includes('Akses ditolak.')));check(await teacher.locator('.notice').filter({hasText:'Tanggal otomatis:'}).count()===1);const date=await teacher.locator('form[method=get] [name=tanggal]').inputValue();check(date>='2026-10-26'&&date<='2026-10-30','Date escaped assignment');
   }
  });
  await test('explicit_Monday_link_reload_and_cross_page_roster_preserved',async()=>{
   const route='/absensi?id_jadwal=3&tanggal=2026-10-26';check((await teacher.goto(base+route)).status()===200);check(await teacher.locator('form[method=get] [name=tanggal]').inputValue()==='2026-10-26');check(await teacher.locator('.notice').filter({hasText:'Tanggal otomatis:'}).count()===0);check(await teacher.locator('[data-student]').count()===20);check(await teacher.locator('[data-student]:visible').count()===10);
   const values=()=>teacher.locator('[data-student] input[type=radio]:checked').evaluateAll(nodes=>nodes.map(n=>[n.name,n.value]));const stored=await values();await teacher.getByRole('button',{name:'Halaman siswa 2',exact:true}).click();await teacher.reload();check(JSON.stringify(await values())===JSON.stringify(stored),'Reload changed attendance');
  });
  await test('explicit_out_of_window_dates_still_denied_and_invalid_dates_rejected',async()=>{
   for(const route of ['/absensi?id_jadwal=3&tanggal=2026-11-03','/absensi?id_jadwal=3&tanggal=2026-10-25','/nilai?id_jadwal=3&tanggal=2026-11-03'])check((await teacher.request.get(base+route)).status()===403);
   check((await teacher.request.get(base+'/absensi?id_jadwal=3&tanggal=invalid')).status()===422);
  });
  await test('other_teacher_and_admin_cannot_edit_teacher_schedule',async()=>{
   const other=await login('uji_guru_lain'),admin=await login('uji_admin');
   for(const route of ['/absensi?id_jadwal=3','/absensi?id_jadwal=3&tanggal=2026-10-26','/nilai?id_jadwal=3'])check((await other.request.get(base+route)).status()===403);
   check((await admin.request.get(base+'/absensi?id_jadwal=3&tanggal=2026-10-26')).status()===403);check((await teacher.request.get(base+'/admin/users.php')).status()===403);
  });
  await test('CSRF_and_internal_file_protection_unchanged',async()=>{
   check((await teacher.request.post(base+'/absensi?id_jadwal=3&tanggal=2026-10-26',{form:{action:'pertemuan',csrf_token:'invalid'}})).status()===419);
   for(const route of ['/.git/config','/.env','/db_sia_smkn2_magelang.sql','/config/config.php','/server.log'])check((await teacher.request.get(base+route)).status()===404);
  });
  await test('actual_default_page_screenshots_mobile_and_desktop_without_overflow',async()=>{
   for(const width of [320,375,430,768,1440]){await teacher.setViewportSize({width,height:1000});check((await teacher.goto(base+'/absensi')).status()===200);check(await teacher.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await teacher.screenshot({path:state+`/reports/default-date-attendance-${width}.png`,fullPage:true});}
  });
  await test('logout_revokes_browser_access',async()=>{
   await teacher.setViewportSize({width:1440,height:1000});await Promise.all([teacher.waitForNavigation(),teacher.getByRole('button',{name:'Keluar',exact:true}).click()]);check((await teacher.request.get(base+'/absensi',{maxRedirects:0})).status()===302);
  });
 }finally{for(const c of contexts)await c.close();await browser.close();await test('whole_database_schema_and_data_unchanged_by_regression',async()=>check(snapshot()===before,'Database changed'));}
 const report={tested_at:new Date().toISOString(),passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length,skipped:0,tests:results};fs.writeFileSync(state+'/reports/default-date-tests.json',JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(`${report.passed} PASS, ${report.failed} FAIL`);process.exitCode=report.failed?1:0;
})().catch(e=>{console.error('Regression runner failed: '+e.name);process.exitCode=1;});
