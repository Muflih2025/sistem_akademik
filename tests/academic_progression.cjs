'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(__dirname,'..'),state='/home/muflih/.local/state/sia-academic-dev/20261031',base='http://127.0.0.1:18125';
const cfg=JSON.parse(fs.readFileSync(state+'/private/runtime.json')),creds=JSON.parse(fs.readFileSync(state+'/private/test-accounts.json')),fixture=JSON.parse(fs.readFileSync(state+'/private/progression-browser-fixture.json'));
if(cfg.APP_ENV!=='testing'||cfg.DB_NAME!=='sia_academic_dev_20261031'||!cfg.DB_SOCKET)throw Error('Fixture only');
const {chromium}=require(cfg.PDF_PLAYWRIGHT_PATH),results=[],contexts=[];let browser;
function check(v){if(!v)throw Error('Browser/DB condition failed; private data omitted');}
function db(sql,args=[]){return JSON.parse(cp.execFileSync('php',[root+'/tests/academic_db.php',state+'/private/inspector.json'],{input:JSON.stringify({sql,args})}));}
async function test(name,fn){try{await fn();results.push({test:name,status:'PASS'});}catch(e){results.push({test:name,status:'FAIL',error_type:e.name});throw e;}process.stdout.write(results.at(-1).status+' '+name+'\n');}
async function login(role){const c=await browser.newContext({viewport:{width:375,height:900}});contexts.push(c);await c.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());const p=await c.newPage();await p.goto(base+'/auth/login.php');await p.locator('[name=username]').fill(creds[role]);await p.locator('[name=password]').fill(creds.password);await Promise.all([p.waitForURL('**/academic/index.php'),p.locator('button').click()]);return p;}
const form=(p,a)=>p.locator('form:has(input[name=action][value="'+a+'"])');
async function submit(p,f){const [r]=await Promise.all([p.waitForNavigation(),f.locator('button[type=submit]').click()]);check(r.status()===200);}
async function editLatest(p){await p.goto(base+'/academic/index.php?view=jam');await p.getByRole('link',{name:'Ubah Jam Senin',exact:true}).click();await p.waitForLoadState('load');await p.evaluate(()=>document.fonts.ready);await form(p,'jam_belajar').waitFor({state:'visible'});return form(p,'jam_belajar');}
(async()=>{
 browser=await chromium.launch();const admin=await login('admin');
 const original=db("SELECT * FROM ak_jam_belajar WHERE nama='Senin' ORDER BY versi DESC LIMIT 1")[0],oldProfile=JSON.parse(original.payload_json);
 await test('browser_admin_edits_bell_adds_activity_saves_DB_reload',async()=>{
  const f=await editLatest(admin),rows=f.locator('.bell-edit-row');await rows.last().locator('input[type=time]').last().fill('15:25');await f.locator('[data-add-bell]').click();const added=rows.last();await added.locator('input[type=time]').first().fill('15:25');await added.locator('input[type=time]').last().fill('15:30');await added.locator('input[name$="[keterangan]"]').fill('Kegiatan uji browser');await f.locator('[name=alasan]').fill('Pemeriksaan browser tambah kegiatan');await f.locator('[name=terverifikasi]').check();await submit(admin,f);await admin.reload();
  const row=db("SELECT * FROM ak_jam_belajar WHERE nama='Senin' ORDER BY versi DESC LIMIT 1")[0],p=JSON.parse(row.payload_json);check(p.slots.length===oldProfile.slots.length+1&&p.slots.at(-1)[3]==='Kegiatan uji browser'&&row.created_by===1);check((await admin.locator('main').innerText()).includes('15:25–15:30'));
 });
 await test('browser_admin_removes_activity_restores_times_new_version',async()=>{
  const f=await editLatest(admin);await f.locator('.bell-edit-row').last().locator('[data-remove-bell]').click();await f.locator('.bell-edit-row').last().locator('input[type=time]').last().fill('15:20');await f.locator('[name=alasan]').fill('Kembalikan acuan gambar setelah uji');await f.locator('[name=terverifikasi]').check();await submit(admin,f);
  const row=db("SELECT * FROM ak_jam_belajar WHERE nama='Senin' ORDER BY versi DESC LIMIT 1")[0];check(JSON.stringify(JSON.parse(row.payload_json).slots)===JSON.stringify(oldProfile.slots));check(db('SELECT * FROM ak_jam_belajar WHERE id=?',[original.id])[0].payload_json===original.payload_json);
 });
 await test('browser_nonadmin_reads_latest_without_edit_controls',async()=>{const p=await login('teacher');await p.goto(base+'/academic/index.php?view=jam');check(await p.getByRole('link',{name:'Ubah Jam Senin',exact:true}).count()===0&&await p.locator('.bell-reference').count()===3);check((await p.locator('.bell-grid h2').allInnerTexts()).map(t=>t.split(' · ')[0]).join('|')==='Senin|Selasa–Kamis|Jumat');await p.goto(base+'/academic/index.php?view=jurnal');check(await p.getByRole('link',{name:'Naik Kelas',exact:true}).count()===0&&await p.getByRole('link',{name:'Alumni',exact:true}).count()===0);});
 await test('browser_class_master_filters_12_classes_per_grade',async()=>{
  const major=db("SELECT id_jurusan FROM jurusan WHERE kode_jurusan='PM'")[0].id_jurusan;await admin.goto(base+'/admin/master.php?table=kelas&tingkat=XI&id_jurusan='+major);check((await admin.locator('.crud-pager').innerText()).includes('3 data'));check(await admin.locator('tbody tr').count()===3);
 });
 const url=base+'/academic/index.php?view=kenaikan&periode_asal='+fixture.source;
 await test('browser_whole_cohort_preview_no_writes',async()=>{
  await admin.goto(url);const f=form(admin,'kenaikan_preview');await f.locator('[name=periode_tujuan]').selectOption(String(fixture.target));for(const[k,v]of Object.entries(fixture.mapping))await f.locator('[name="tujuan['+k+']"]').selectOption(String(v));await f.locator('[name=alasan]').fill('Keputusan kenaikan fixture browser');await submit(admin,f);check(await form(admin,'kenaikan_commit').count()===1&&db('SELECT id FROM ak_kenaikan_batch WHERE periode_asal=?',[fixture.source]).length===0);
 });
 await test('browser_admin_confirms_and_commits_X_XI_XII_to_alumni',async()=>{
  const f=form(admin,'kenaikan_commit');await f.locator('[name=konfirmasi]').check();await submit(admin,f);await admin.reload();const batch=db('SELECT * FROM ak_kenaikan_batch WHERE periode_asal=?',[fixture.source])[0];check(batch.jumlah===3&&batch.created_by===1);check(db('SELECT * FROM ak_kenaikan_detail WHERE id_batch=?',[batch.id]).length===3);check(db('SELECT * FROM ak_anggota_kelas WHERE id_tahun_ajaran=?',[fixture.target]).length===2);check((await admin.locator('main').innerText()).includes('Hasil batch #'+batch.id));
 });
 await test('browser_alumni_saved_reload_and_search',async()=>{
  const nis=fixture.students.find(s=>s.level==='XII').nis;await admin.goto(base+'/academic/index.php?view=alumni&q='+nis);check(await admin.locator('tbody tr').count()===1);check((await admin.locator('tbody').innerText()).includes(nis));await admin.reload();check((await admin.locator('tbody').innerText()).includes('Calon alumni'));
 });
 await test('browser_foundation_search_limits_students_and_pages_members',async()=>{
  await admin.goto(base+'/academic/index.php?view=fondasi&id_tahun_ajaran=1&id_kelas=352');check(await admin.locator('form:has(input[name=action][value=anggota]) select[name=nis] option').count()<=51);const memberPanel=admin.locator('section.panel').filter({has:admin.getByRole('heading',{name:'Anggota kelas pada periode',exact:true})});check(await memberPanel.locator('tbody tr').count()===20);await memberPanel.getByRole('link',{name:'Berikutnya',exact:true}).click();check(await memberPanel.locator('tbody tr').count()===15);
 });
 for(const width of [320,375,430,768,1440])for(const view of ['jam','kenaikan','alumni']){
  await test('browser_'+view+'_responsive_'+width,async()=>{await admin.setViewportSize({width,height:900});await admin.goto(base+'/academic/index.php?view='+view);check(await admin.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await admin.screenshot({path:state+'/reports/progression-'+view+'-'+width+'.png',fullPage:true});});
 }
 for(const width of [320,375,430,768,1440])await test('browser_bell_edit_form_responsive_'+width,async()=>{await admin.setViewportSize({width,height:900});await editLatest(admin);await admin.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await admin.screenshot({path:state+'/reports/progression-edit-'+width+'.png',fullPage:true});const size=await admin.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));check(size.scroll<=size.width);});
})().catch(e=>{if(!results.some(r=>r.status==='FAIL'))results.push({test:'browser_runner',status:'FAIL',error_type:e.name});}).finally(async()=>{
 for(const c of contexts)await c.close();if(browser)await browser.close();const report={passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length,skipped:0,tests:results};fs.writeFileSync(state+'/reports/progression-browser-tests.json',JSON.stringify(report,null,2)+'\n',{mode:0o600});process.stdout.write(`${report.passed} PASS, ${report.failed} FAIL, 0 SKIP\n`);process.exitCode=report.failed?1:0;
});
