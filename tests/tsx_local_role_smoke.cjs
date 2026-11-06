'use strict';
// Read-only portal checks on the actual development database. No accounts/data deleted.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),base=process.env.SIA_LOCAL_URL||'http://127.0.0.1:3000';
assert(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base),'Loopback server required');
const cfg=JSON.parse(fs.readFileSync(process.env.SIA_BROWSER_CONFIG||path.join(require('os').homedir(),'.local/state/sia-academic-dev/20261031/private/runtime.json')));
process.env.PLAYWRIGHT_BROWSERS_PATH=cfg.PDF_BROWSERS_PATH;process.env.LD_LIBRARY_PATH=cfg.PDF_LIBRARY_PATH;
const db=new(require('better-sqlite3'))(path.join(root,'data/sia.db'),{readonly:true,fileMustExist:true});
const snapshot=()=>Object.fromEntries(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(({name})=>[name,crypto.createHash('sha256').update(JSON.stringify(db.prepare('SELECT * FROM "'+name+'" ORDER BY rowid').all())).digest('hex')]));
let b;const tests=[],before=snapshot();
const pass=(id,details={})=>{tests.push({id,status:'PASS',details});console.log('PASS '+id)};
(async()=>{
 b=await require(cfg.PDF_PLAYWRIGHT_PATH).chromium.launch();
 const accounts=[['admin@mail.com','/admin'],['guru@mail.com','/guru'],['guru.lain@mail.com','/guru'],['piket@mail.com','/piket'],['kepsek@mail.com','/kepsek'],['wali@mail.com','/guru'],['siswa@mail.com','/siswa'],['siswa.lain@mail.com','/siswa']];
 for(const [username,home]of accounts){
  const ctx=await b.newContext(),p=await ctx.newPage(),errors=[],failures=[];p.setDefaultTimeout(60000);p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=500)failures.push(new URL(r.url()).pathname+': '+r.status())});
  try{
   await p.goto(base+'/auth/login');assert.equal(await p.getByLabel('Username / NIS',{exact:true}).inputValue(),'');assert.equal(await p.getByLabel('Password',{exact:true}).inputValue(),'');await p.getByLabel('Username / NIS',{exact:true}).fill(username);await p.getByLabel('Password',{exact:true}).fill(process.env.SIA_LOCAL_TEST_PASSWORD||'password');const signed=p.waitForResponse(r=>new URL(r.url()).pathname==='/api/auth'&&r.request().method()==='POST');await p.getByRole('button',{name:'Masuk',exact:true}).click();const auth=await(await signed).json();assert(auth.success);assert(home==='/guru'?['/guru','/piket'].includes(auth.redirect):auth.redirect===home);await p.waitForURL(base+auth.redirect);await p.locator('nav[aria-label="Modul utama"][aria-busy="false"]').waitFor();
   const modules=await p.getByRole('navigation',{name:'Modul utama',exact:true}).getByRole('link').evaluateAll(nodes=>nodes.map(e=>({href:e.getAttribute('href'),label:e.textContent.trim()})));assert(modules.length>0,'Role modules loaded');let links=0;
   for(const mod of modules){await p.goto(base+mod.href);await p.locator('nav[aria-label="Modul utama"][aria-busy="false"]').waitFor();await p.getByRole('navigation',{name:'Fitur modul',exact:true}).waitFor();const features=await p.getByRole('navigation',{name:'Fitur modul',exact:true}).getByRole('link').evaluateAll(nodes=>nodes.map(e=>({href:e.getAttribute('href'),label:e.textContent.trim()})));for(const feature of features){const r=await p.goto(base+feature.href);assert.equal(r.status(),200,username+feature.href);await p.locator('nav[aria-label="Modul utama"][aria-busy="false"]').waitFor();await p.getByRole('navigation',{name:'Fitur modul',exact:true}).waitFor();await p.waitForLoadState('networkidle');assert.equal(await p.locator('main').count(),1);links++;}}
   if(username==='admin@mail.com'){
    await p.goto(base+'/admin/alumni');await p.getByLabel('Cari alumni',{exact:true}).waitFor();for(const width of [320,390,768,1440]){await p.setViewportSize({width,height:900});const sizes=await p.evaluate(()=>{const search=document.querySelector('[aria-label="Cari alumni"]'),table=document.querySelector('main table');return{gap:table.getBoundingClientRect().top-search.getBoundingClientRect().bottom,overflow:document.documentElement.scrollWidth>innerWidth+1}});assert(sizes.gap>=16);assert(!sizes.overflow);}
    await p.screenshot({path:path.join(process.env.SIA_LOCAL_REPORT_DIR||'/tmp','alumni-desktop.png'),fullPage:true});
    await p.setViewportSize({width:390,height:900});await p.screenshot({path:path.join(process.env.SIA_LOCAL_REPORT_DIR||'/tmp','alumni-mobile.png'),fullPage:true});
   }
   assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);pass('LOCAL_'+username+'_login_and_all_module_pages',{links,redirect:auth.redirect});
  }finally{await ctx.close()}
 }
 assert.deepEqual(snapshot(),before);pass('LOCAL_all_database_rows_and_accounts_preserved',{accounts:db.prepare('SELECT COUNT(*) n FROM users').get().n,active:db.prepare("SELECT COUNT(*) n FROM users WHERE status='aktif'").get().n});
})().catch(e=>{tests.push({id:'local-roles',status:'FAIL',message:e.stack});console.error(e.stack)}).finally(async()=>{if(b)await b.close();db.close();const report={date:'2026-11-06',base,method:'Real Chromium login and portal navigation for eight retained local accounts; all database rows fingerprinted before/after',passed:tests.filter(t=>t.status==='PASS').length,failed:tests.filter(t=>t.status==='FAIL').length,tests};fs.writeFileSync(path.join(process.env.SIA_LOCAL_REPORT_DIR||'/tmp','local-roles.json'),JSON.stringify(report,null,2)+'\n');console.log(`${report.passed} PASS, ${report.failed} FAIL`);process.exitCode=report.failed?1:0;});
