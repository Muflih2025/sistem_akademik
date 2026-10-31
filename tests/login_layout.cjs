'use strict';
const fs=require('fs');const path=require('path');
const state='/home/muflih/.local/state/sia-academic-dev/20261031';const cfg=JSON.parse(fs.readFileSync(state+'/private/runtime.json'));
if(cfg.DB_NAME!=='sia_academic_dev_20261031'||cfg.APP_ENV!=='testing')throw Error('Fixture only');
const creds=JSON.parse(fs.readFileSync(state+'/private/test-accounts.json'));const{chromium}=require(cfg.PDF_PLAYWRIGHT_PATH);const base='http://127.0.0.1:18125';const results=[];let browser;
const check=(value,message)=>{if(!value)throw Error(message||'Login assertion failed');};
async function test(name,fn){try{await fn();results.push({test:name,status:'PASS'});}catch(e){results.push({test:name,status:'FAIL',detail:e.message});}process.stdout.write(results.at(-1).status+' '+name+'\n');}
(async()=>{
 browser=await chromium.launch();fs.mkdirSync(state+'/reports/screenshots',{recursive:true});
 for(const width of [320,375,430,768,1440]){
  const context=await browser.newContext({viewport:{width,height:900}});const page=await context.newPage();await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());await page.goto(base+'/auth/login.php');
  await test('login_card_layout_'+width,async()=>{
   const r=await page.evaluate(()=>{const c=document.querySelector('.login-card').getBoundingClientRect();const s=document.querySelector('.login-shell').getBoundingClientRect();return {card:{left:c.left,right:c.right,width:c.width},shell:{left:s.left,right:s.right,top:s.top,bottom:s.bottom},scroll:document.documentElement.scrollWidth,width:innerWidth,height:innerHeight};});
   check(r.scroll<=width+1,'Horizontal overflow');check(r.card.width<=420.1&&r.card.width>=Math.min(420,width-32)-1,'Card responsive width');check(Math.abs((r.card.left+r.card.right)/2-width/2)<1,'Horizontal centering');check(Math.abs((r.shell.top+r.shell.bottom)/2-r.height/2)<2,'Vertical centering');
  });
  await test('login_full_width_touch_controls_'+width,async()=>{check(await page.locator('form input:not([type=hidden]),form button').evaluateAll(xs=>xs.length===3&&xs.every(x=>{const f=x.form.getBoundingClientRect(),r=x.getBoundingClientRect();return Math.abs(r.width-f.width)<1&&r.height>=48;})),'Controls must fill form and be touch sized');});
  await test('login_white_black_theme_'+width,async()=>{check(await page.locator('.login-card').evaluate(x=>getComputedStyle(x).backgroundColor)==='rgb(255, 255, 255)');check(await page.locator('button').evaluate(x=>getComputedStyle(x).backgroundColor)==='rgb(17, 17, 17)');});
  await page.screenshot({path:state+'/reports/screenshots/login-'+width+'.png',fullPage:true});await context.close();
 }
 for(const role of ['admin','teacher','duty','student','head']){
  const context=await browser.newContext();const page=await context.newPage();await page.goto(base+'/auth/login.php');
  await test('login_backend_'+role,async()=>{await page.locator('[name=username]').fill(creds[role]);await page.locator('[name=password]').fill(creds.password);await Promise.all([page.waitForURL('**/academic/index.php'),page.locator('button').click()]);check(await page.locator('.identity').innerText().then(x=>x.includes(creds[role])));const cookies=await context.cookies();check(cookies.some(x=>x.name===cfg.SESSION_NAME&&x.httpOnly&&x.sameSite==='Lax'));});
  await test('logout_backend_'+role,async()=>{await Promise.all([page.waitForURL('**/auth/login.php'),page.locator('.identity button').click()]);check(await page.locator('.login-card').isVisible());});await context.close();
 }
 const context=await browser.newContext({viewport:{width:375,height:900}});const page=await context.newPage();await page.goto(base+'/auth/login.php');
 await test('login_invalid_password_feedback',async()=>{await page.locator('[name=username]').fill(creds.teacher);await page.locator('[name=password]').fill('incorrect-fixture-password');await Promise.all([page.waitForNavigation(),page.locator('button').click()]);check(await page.locator('[role=alert]').innerText().then(x=>x.includes('Username atau password salah/nonaktif.')));check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));});
 await page.screenshot({path:state+'/reports/screenshots/login-error-375.png',fullPage:true});
 await test('login_missing_csrf_rejected',async()=>{const r=await context.request.post(base+'/auth/login.php',{form:{username:creds.teacher,password:creds.password}});check(r.status()===419);});await context.close();
 const report={passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length,skipped:0,viewports:[320,375,430,768,1440],tests:results};fs.writeFileSync(state+'/reports/login-layout-tests.json',JSON.stringify(report,null,2));process.stdout.write(`${report.passed} PASS, ${report.failed} FAIL, 0 SKIP\n`);process.exitCode=report.failed?1:0;
})().catch(e=>{fs.writeFileSync(state+'/reports/login-layout-tests.json',JSON.stringify({passed:results.filter(r=>r.status==='PASS').length,failed:1,skipped:0,tests:[...results,{test:'login_runner',status:'FAIL',error_type:e.name}]}));process.stdout.write('FAIL login browser runner '+e.name+'\n');process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
