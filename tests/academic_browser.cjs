'use strict';
const fs=require('fs');const path=require('path');
const state='/home/muflih/.local/state/sia-academic-dev/20261031';
const config=JSON.parse(fs.readFileSync(path.join(state,'private/runtime.json')));
if(config.DB_NAME!=='sia_academic_dev_20261031'||config.APP_ENV!=='testing'||!config.DB_SOCKET)throw Error('Synthetic fixture only');
const creds=JSON.parse(fs.readFileSync(path.join(state,'private/test-accounts.json')));
const {chromium}=require(config.PDF_PLAYWRIGHT_PATH);
const base='http://127.0.0.1:18125';const results=[];let browser;const errors=[];
function check(value,detail='Browser assertion failed'){if(!value)throw Error(detail);}
async function test(name,fn){try{await fn();results.push({test:name,status:'PASS'});}catch(e){results.push({test:name,status:'FAIL',detail:e.message});}process.stdout.write(results.at(-1).status+' '+name+'\n');}
async function login(role){
 const context=await browser.newContext({viewport:{width:320,height:850}});
 await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
 const page=await context.newPage();page.on('pageerror',()=>errors.push('pageerror'));
 await page.goto(base+'/auth/login.php');await page.locator('input[name=username]').fill(creds[role]);await page.locator('input[name=password]').fill(creds.password);
 await Promise.all([page.waitForURL(/\/(?:academic\/index\.php|beranda)(?:\?|$)/),page.locator('button').filter({hasText:'Masuk'}).click()]);return {context,page};
}
async function geometry(page,width){
 const m=await page.evaluate(()=>({body:document.documentElement.scrollWidth,viewport:innerWidth,forms:[...document.querySelectorAll('main form')].filter(f=>!f.closest('.table-scroll,.table-responsive')).map(f=>({left:f.getBoundingClientRect().left,right:f.getBoundingClientRect().right,scroll:f.scrollWidth,width:f.clientWidth})),inputs:[...document.querySelectorAll('main input:not([type=hidden]):not([type=radio]):not([type=checkbox]),main select,main textarea,main button,.status-options span')].filter(x=>x.getClientRects().length>0&&!x.closest('.table-scroll,.table-responsive')).map(x=>({left:x.getBoundingClientRect().left,right:x.getBoundingClientRect().right,height:x.getBoundingClientRect().height}))}));
 check(m.body<=m.viewport+1,'Page overflow '+m.body+'/'+m.viewport);check(m.forms.every(x=>x.left>=-1&&x.right<=width+1&&x.scroll<=x.width+2),'Form overflow');check(m.inputs.every(x=>x.left>=-1&&x.right<=width+1&&x.height>=43),'Touch control bounds/height');
}
(async()=>{
 browser=await chromium.launch({headless:true});fs.mkdirSync(path.join(state,'reports/screenshots'),{recursive:true});
 const admin=await login('admin');
 const oldPages=['/admin/master.php?table=siswa','/admin/master.php?table=guru','/admin/master.php?table=kelas','/admin/master.php?table=mata_pelajaran','/admin/master.php?table=jurusan','/admin/users.php','/admin/penugasan.php','/admin/tahun_ajaran.php','/admin/export_import.php'];
 for(const width of [320,375,430,768,1440]){
  await admin.page.setViewportSize({width,height:900});
  for(const route of [...oldPages,'/academic/index.php?view=fondasi','/academic/index.php?view=kalender','/academic/index.php?view=rapor','/academic/index.php?view=jurnal','/academic/index.php?view=nilai','/academic/index.php?view=impor&module=siswa']){
   await test('admin_responsive_'+width+'_'+route,async()=>{const r=await admin.page.goto(base+route);check(r.status()===200);await geometry(admin.page,width);});
  }
 }
 await admin.context.close();
 const teacher=await login('teacher');
 const teacherPages=['/academic/index.php','/academic/index.php?view=pertemuan&id_jadwal=1&tanggal=2026-10-30','/academic/index.php?view=jurnal','/academic/index.php?view=nilai&id_jadwal=1&tanggal=2026-10-30&nis=0000001','/academic/index.php?view=nilai&id_jadwal=1&tanggal=2026-10-30','/academic/index.php?view=kalender','/academic/index.php?view=impor&module=absensi&id_jadwal=1&tanggal=2026-10-30'];
 for(const width of [320,375,430,768,1440]){
  await teacher.page.setViewportSize({width,height:900});
  for(const route of teacherPages)await test('teacher_responsive_'+width+'_'+route,async()=>{const r=await teacher.page.goto(base+route);check(r.status()===200);await geometry(teacher.page,width);});
 }
 const p=teacher.page;await p.setViewportSize({width:320,height:850});await p.goto(base+teacherPages[1]);
 await test('attendance_20_real_database_cards',async()=>check(await p.locator('.student-card').count()===20));
 const original=await p.locator('input[type=radio]:checked').evaluateAll(xs=>xs.map(x=>x.value));
 await test('all_present_requires_explicit_verification',async()=>{await p.locator('#all-present').click();check(await p.locator('input[type=radio]:checked').evaluateAll(xs=>xs.map(x=>x.value)).then(x=>JSON.stringify(x)===JSON.stringify(original)));check(await p.locator('#attendance-feedback').innerText().then(x=>x.includes('Centang')));});
 await test('search_name_NIS_roll_number',async()=>{await p.locator('#student-search').fill('0000004');check(await p.locator('.student-card:visible').count()===1);await p.locator('#student-search').fill('');check(await p.locator('.student-card:visible').count()===20);});
 await test('save_20_students_browser_and_read_back',async()=>{
  await p.locator('#verified').check();await p.locator('#all-present').click();
  await p.locator('input[name="status[0000004]"][value=S]').check();await p.locator('input[name="status[0000005]"][value=I]').check();
  check(await p.locator('[data-count=H]').innerText()==='18');check(await p.locator('[data-count=S]').innerText()==='1');check(await p.locator('[data-count=I]').innerText()==='1');
  await p.locator('input[name=alasan]').fill('Verifikasi 20 siswa melalui browser pengujian');
  await Promise.all([p.waitForNavigation(),p.locator('.save-button').click()]);
  await p.reload();check(await p.locator('input[name="status[0000004]"][value=S]').isChecked());check(await p.locator('input[name="status[0000005]"][value=I]').isChecked());check(await p.locator('[data-count=H]').innerText()==='18');
 });
 await test('white_black_mobile_theme',async()=>{check(await p.locator('.save-button').evaluate(x=>getComputedStyle(x).backgroundColor)==='rgb(17, 17, 17)');check(await p.locator('.student-card').first().evaluate(x=>getComputedStyle(x).backgroundColor)==='rgb(255, 255, 255)');check(await p.locator('.bottom-nav').isVisible());});
 await p.screenshot({path:path.join(state,'reports/screenshots/absensi-320.png'),fullPage:true});await p.setViewportSize({width:1440,height:1000});await p.screenshot({path:path.join(state,'reports/screenshots/absensi-desktop.png'),fullPage:true});
 await test('journal_and_attendance_same_meeting_browser',async()=>{await p.goto(base+'/academic/index.php?view=jurnal');await p.locator('a').filter({hasText:'Lihat jurnal & daftar hadir'}).first().click();check(await p.locator('h2').first().innerText().then(x=>x.includes('XII PPLG 2')));check(await p.locator('[data-count=H]').innerText()==='18');});
 await teacher.context.close();
 for(const role of ['duty','student','head']){
  const c=await login(role);const pages=role==='duty'?['piket&tanggal=2026-10-30']:role==='student'?['rapor','kalender','kehadiran']:['piket&tanggal=2026-10-30','jurnal','rapor'];
  for(const width of [320,375,430,768,1440]){await c.page.setViewportSize({width,height:900});for(const view of pages)await test(role+'_responsive_'+width+'_'+view,async()=>{const r=await c.page.goto(base+'/academic/index.php?view='+view);check(r.status()===200);await geometry(c.page,width);});}
  if(role==='student')await test('student_opens_published_snapshot_in_browser',async()=>{await c.page.goto(base+'/academic/index.php?view=rapor');await c.page.locator('.panel a').first().click();check(await c.page.locator('.eyebrow').last().innerText().then(x=>x.includes('diterbitkan')));});
  await c.context.close();
 }
 const finalAdmin=await login('admin');
 await test('browser_final_daily_consensus_18H_1S_1I',async()=>{
  const page=finalAdmin.page;await page.goto(base+'/academic/index.php?view=piket&id_kelas=1&id_tahun_ajaran=1&tanggal=2026-10-30');
  const form=page.locator('form:has(input[name=action][value=rekonsiliasi])');
  await form.locator('input[name=alasan]').fill('Verifikasi akhir fixture setelah pengujian browser');
  await Promise.all([page.waitForNavigation(),form.locator('button').click()]);
  check(await page.locator('[data-count=H]').innerText()==='18');check(await page.locator('[data-count=S]').innerText()==='1');check(await page.locator('[data-count=I]').innerText()==='1');
  check(!await page.getByText('data harian memiliki bukti sesi yang berubah.',{exact:false}).count());
 });
 await finalAdmin.context.close();
 await test('browser_no_javascript_errors',async()=>check(errors.length===0));
 const report={passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length,skipped:0,viewports:[320,375,430,768,1440],external_network_blocked:true,tests:results};fs.writeFileSync(path.join(state,'reports/academic-browser-tests.json'),JSON.stringify(report,null,2));process.stdout.write(`${report.passed} PASS, ${report.failed} FAIL, 0 SKIP\n`);process.exitCode=report.failed?1:0;
})().catch(error=>{fs.writeFileSync(path.join(state,'reports/academic-browser-tests.json'),JSON.stringify({passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length+1,skipped:0,tests:[...results,{test:'browser_runner',status:'FAIL',error_type:error.name}]}));process.stdout.write('FAIL browser runner '+error.name+'; private details omitted.\n');process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
