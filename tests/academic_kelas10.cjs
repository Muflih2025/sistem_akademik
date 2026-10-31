'use strict';
// Real browser read-back of the imported roster and versioned bell reference.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),state='/home/muflih/.local/state/sia-academic-dev/20261031',base='http://127.0.0.1:18125';
const cfg=JSON.parse(fs.readFileSync(state+'/private/runtime.json')),creds=JSON.parse(fs.readFileSync(state+'/private/test-accounts.json')),data=JSON.parse(fs.readFileSync(state+'/reports/kelas10-import.json'));
if(cfg.DB_NAME!=='sia_academic_dev_20261031'||cfg.APP_ENV!=='testing'||!cfg.DB_SOCKET)throw Error('Fixture only');
const {chromium}=require(cfg.PDF_PLAYWRIGHT_PATH),results=[],contexts=[];let browser;
function check(v){if(!v)throw Error('Browser condition failed; private contents omitted');}
async function test(name,fn){try{await fn();results.push({test:name,status:'PASS'});}catch(e){results.push({test:name,status:'FAIL',error_type:e.name});}process.stdout.write(results.at(-1).status+' '+name+'\n');}
async function login(role){const context=await browser.newContext({viewport:{width:375,height:900}});contexts.push(context);await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());const page=await context.newPage();await page.goto(base+'/auth/login.php');await page.locator('[name=username]').fill(creds[role]);await page.locator('[name=password]').fill(creds.password);await Promise.all([page.waitForURL(/\/(?:academic\/index\.php|beranda)(?:\?|$)/),page.locator('button').click()]);return page;}
(async()=>{browser=await chromium.launch();
 const admin=await login('admin'),cid=data.class_ids['X PPLG 2'];
 await test('admin_filtered_imported_class_pagination_35_persistent_students',async()=>{
  await admin.goto(base+'/admin/master.php?table=siswa&per_page=20&id_kelas='+cid);check((await admin.locator('.crud-pager').innerText()).includes('35 data'));check(await admin.locator('tbody tr').count()===20);
  await admin.getByRole('link',{name:'Berikutnya',exact:true}).click();check(await admin.locator('tbody tr').count()===15);await admin.reload();check(await admin.locator('tbody tr').count()===15);
 });
 const duty=await login('duty');
 await test('Piket_imported_class_pending_not_assumed_present',async()=>{await duty.goto(base+'/academic/index.php?view=piket&id_tahun_ajaran=1&tanggal=2026-10-30&id_kelas='+cid);const panel=duty.locator('section.panel').filter({has:duty.getByRole('heading',{name:'X PPLG 2',exact:true})});check(await panel.count()===1);check((await panel.innerText()).includes('35 siswa'));check(await panel.locator('[data-count=B]').innerText()==='35');for(const c of ['H','S','I','A'])check(await panel.locator('[data-count='+c+']').innerText()==='0');});
 for(const role of ['admin','teacher','duty','student','head']){
  const page=role==='admin'?admin:role==='duty'?duty:await login(role);
  await test(role+'_bell_reference_authenticated_and_DB_rendered',async()=>{const r=await page.goto(base+'/academic/index.php?view=jam');check(r.status()===200&&await page.locator('.bell-reference').count()===3);check((await page.locator('main').innerText()).includes('10:50–11:40'));});
 }
 for(const width of [320,375,430,768,1440]){
  await test('bell_reference_responsive_no_horizontal_overflow_'+width,async()=>{await admin.setViewportSize({width,height:900});await admin.goto(base+'/academic/index.php?view=jam');check(await admin.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&[...document.querySelectorAll(".bell-reference")].every(t=>t.scrollWidth<=t.clientWidth)));await admin.screenshot({path:state+'/reports/kelas10-jam-'+width+'.png',fullPage:true});});
 }
 const guest=await browser.newContext();contexts.push(guest);await test('guest_cannot_access_bell_reference',async()=>{const p=await guest.newPage();await p.goto(base+'/academic/index.php?view=jam');check(p.url().includes('/auth/login.php'));});
})().catch(e=>{results.push({test:'browser_runner',status:'FAIL',error_type:e.name});}).finally(async()=>{
 for(const context of contexts)await context.close();if(browser)await browser.close();
 const report={passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length,skipped:0,tests:results};fs.writeFileSync(state+'/reports/kelas10-browser-tests.json',JSON.stringify(report,null,2)+'\n',{mode:0o600});process.stdout.write(`${report.passed} PASS, ${report.failed} FAIL, 0 SKIP\n`);process.exitCode=report.failed?1:0;
});
