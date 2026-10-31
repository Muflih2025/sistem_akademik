// Browser test runner; Playwright is a development tool outside the application repository.
const fs=require('fs');const path=require('path');
const state=process.argv[2];if(!state)throw Error('Private fixture state required');
const config=JSON.parse(fs.readFileSync(path.join(state,'private/runtime.json')));
if(config.APP_ENV!=='testing'||config.DB_NAME!=='r1_testing_20261030')throw Error('Fixture database required');
const creds=JSON.parse(fs.readFileSync(path.join(state,'private/fixture-login.json')));
const {chromium}=require(path.join(state,'tools/node_modules/playwright'));
const results=[];let browser;
async function test(name,fn){try{await fn();results.push({test:name,status:'PASS'});}catch(e){results.push({test:name,status:'FAIL',error_type:e.name});}process.stdout.write(results.at(-1).status+' '+name+'\n');}
function check(value){if(!value)throw Error('Browser assertion failed');}
(async()=>{
 browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:320,height:800}});const page=await context.newPage();let errors=[];page.on('pageerror',()=>errors.push('pageerror'));
 await page.goto('http://127.0.0.1:18091/auth/login.php');await page.locator('input[name=username]').fill(creds.admin);await page.locator('input[name=password]').fill(creds.password);await Promise.all([page.waitForURL('**/admin/index.php'),page.locator('button[type=submit],button:not([type])').filter({hasText:'Masuk'}).click()]);
 const pages=['/admin/master.php?table=siswa','/admin/master.php?table=guru','/admin/master.php?table=kelas','/admin/master.php?table=mata_pelajaran','/admin/users.php','/admin/jadwal.php','/admin/penugasan.php','/admin/tahun_ajaran.php','/admin/export_import.php'];
 for(const width of [320,375,430,768,1024,1440]){
  await page.setViewportSize({width,height:900});
  for(const route of pages){
   await test('responsive_'+width+'_'+route,async()=>{
    const response=await page.goto('http://127.0.0.1:18091'+route,{waitUntil:'networkidle'});check(response.status()===200);
    const metrics=await page.evaluate(()=>({body:document.documentElement.scrollWidth,viewport:innerWidth,forms:[...document.querySelectorAll('main .crud-grid')].map(x=>({left:x.getBoundingClientRect().left,right:x.getBoundingClientRect().right,scroll:x.scrollWidth,width:x.clientWidth})),controls:[...document.querySelectorAll('main .crud-grid input:not([type=hidden]),main .crud-grid select,main .crud-grid button')].map(x=>({left:x.getBoundingClientRect().left,right:x.getBoundingClientRect().right,height:x.getBoundingClientRect().height}))}));
    check(metrics.body<=metrics.viewport+1);check(metrics.forms.every(x=>x.left>=-1&&x.right<=width+1&&x.scroll<=x.width+1));check(metrics.controls.every(x=>x.left>=-1&&x.right<=width+1&&x.height>=44));
    const color=await page.locator('main .btn-dark').first().evaluate(x=>getComputedStyle(x).backgroundColor);check(color==='rgb(17, 17, 17)');
    const logout=page.locator('.navbar-top .btn-warning');if(await logout.count())check(await logout.evaluate(x=>getComputedStyle(x).backgroundColor)==='rgb(255, 255, 255)');
   });
  }
 }
 await page.setViewportSize({width:320,height:850});await page.goto('http://127.0.0.1:18091/admin/master.php?table=siswa');
 await test('browser_create_student_from_real_form',async()=>{
  const nis='008'+String(Date.now()).slice(-10);await page.locator('input[name=nis]').fill(nis);await page.locator('input[name=nama_siswa]').fill('Siswa Browser Fixture');await page.locator('select[name=jenis_kelamin]').selectOption('P');await page.locator('input[name=tanggal_lahir]').fill('2011-04-05');await page.locator('input[name=alamat]').fill('Alamat sintetis');await page.locator('select[name=id_kelas]').first().selectOption('3');await Promise.all([page.waitForURL('**/admin/master.php?table=siswa'),page.locator('button').filter({hasText:'Simpan Siswa'}).click()]);
  await page.locator('input[name=q]').fill(nis);await Promise.all([page.waitForURL(u=>u.searchParams.get('q')===nis),page.locator('button').filter({hasText:'Terapkan filter'}).click()]);check(await page.locator('tbody').innerText().then(x=>x.includes('Siswa Browser Fixture')&&x.includes(nis)));
 });
 await test('browser_form_input_associations',async()=>{await page.goto('http://127.0.0.1:18091/admin/users.php');check(await page.locator('main input:not([type=hidden]),main select').evaluateAll(xs=>xs.every(x=>x.form!==null)));});
 await page.goto('http://127.0.0.1:18091/admin/master.php?table=siswa');fs.mkdirSync(path.join(state,'reports/screenshots'),{recursive:true});await page.screenshot({path:path.join(state,'reports/screenshots/crud-siswa-320.png'),fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:18091/admin/penugasan.php');await page.screenshot({path:path.join(state,'reports/screenshots/penugasan-desktop.png'),fullPage:true});
 await context.close();
 const teacherContext=await browser.newContext({viewport:{width:390,height:850}});const teacherPage=await teacherContext.newPage();teacherPage.on('pageerror',()=>errors.push('pageerror'));
 await teacherPage.goto('http://127.0.0.1:18091/auth/login.php');await teacherPage.locator('input[name=username]').fill(creds.teacher_a);await teacherPage.locator('input[name=password]').fill(creds.password);await Promise.all([teacherPage.waitForURL('**/guru/index.php'),teacherPage.locator('button').filter({hasText:'Masuk'}).click()]);
 await teacherPage.goto('http://127.0.0.1:18091/guru/absen.php?id_jadwal=1&tanggal=2026-10-26');
 await test('attendance_existing_form_associations',async()=>check(await teacherPage.locator('select[form],input[form]').evaluateAll(xs=>xs.length>0&&xs.every(x=>x.form&&x.form.querySelector('input[name=nis]')))));
 await test('attendance_real_browser_submit_and_backend_readback',async()=>{
  for(const [status,note] of [['Sakit','Fixture browser correction'],['Hadir','Fixture R1']]){
   await teacherPage.locator('select[form="attendance-0000001"]').selectOption(status);await teacherPage.locator('input[form="attendance-0000001"]').fill(note);await Promise.all([teacherPage.waitForNavigation(),teacherPage.locator('#attendance-0000001 button').click()]);
   await teacherPage.reload();check(await teacherPage.locator('select[form="attendance-0000001"]').inputValue()===status);check(await teacherPage.locator('input[form="attendance-0000001"]').inputValue()===note);
  }
 });
 await test('browser_no_javascript_errors',async()=>check(errors.length===0));await teacherContext.close();
 const report={passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length,skipped:0,tests:results,fixture_only:true,viewports:[320,375,430,768,1024,1440]};fs.writeFileSync(path.join(state,'reports/browser-tests.json'),JSON.stringify(report,null,2));
 process.stdout.write(report.passed+' PASS, '+report.failed+' FAIL, 0 SKIP\n');process.exitCode=report.failed?1:0;
})().catch(()=>{process.stdout.write('FAIL browser runner; private credentials redacted.\n');process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
