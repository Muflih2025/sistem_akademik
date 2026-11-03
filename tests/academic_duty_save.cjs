'use strict';
// One reusable, synthetic duty assignment; revoke it through the app after testing.
const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(__dirname,'..'),state='/home/muflih/.local/state/sia-academic-dev/20261031',base='http://127.0.0.1:18125',marker='REGRESI-PIKET-SIMPAN-20261103';
const cfg=JSON.parse(fs.readFileSync(state+'/private/runtime.json'));
if(cfg.APP_ENV!=='testing'||cfg.DB_NAME!=='sia_academic_dev_20261031'||!cfg.DB_SOCKET||cfg.DB_USER!=='ak_dev_runtime_1031'||cfg.ALLOW_SCHEMA_CHANGES!=='0')throw Error('Refuse wrong environment');
if(JSON.parse(fs.readFileSync(state+'/reports/piket-save-backup.json')).status!=='PASS')throw Error('Private backup required');
const {chromium}=require(cfg.PDF_PLAYWRIGHT_PATH),results=[],contexts=[];
const check=(v,m='Condition failed')=>{if(!v)throw Error(m);};
const db=(sql,args=[])=>JSON.parse(cp.execFileSync('php',[root+'/tests/academic_db.php',state+'/private/inspector.json'],{input:JSON.stringify({sql,args}),maxBuffer:64*1024*1024}));
const snapshot=()=>JSON.parse(cp.execFileSync('php',[root+'/ops/database/db_snapshot.php',state+'/private/inspector.json']));
const createSchema=table=>Object.values(db('SHOW CREATE TABLE `'+table+'`')[0])[1].replace(/ AUTO_INCREMENT=\d+/g,'');
async function test(name,fn){try{await fn();results.push({test:name,status:'PASS'});console.log('PASS '+name);}catch(e){results.push({test:name,status:'FAIL',error:e.name});console.error('FAIL '+name+': '+e.message);}}
(async()=>{
 const guru=db("SELECT id_referensi FROM users WHERE username='uji_wali' AND role='guru' AND status='aktif'")[0];check(guru&&/^[1-9][0-9]*$/.test(String(guru.id_referensi)),'Expected synthetic fixture missing');const guruId=String(guru.id_referensi);
 const existing=db('SELECT * FROM ak_tugas_piket WHERE catatan LIKE ?',[marker+'%']);check(existing.length<=1,'Ambiguous regression fixture');let id=existing[0]?.id;check(!existing.length||(String(existing[0].id_guru)===guruId&&existing[0].aktif===0),'Refuse altering active/manual fixture');
 const before=snapshot(),duties=db('SELECT * FROM ak_tugas_piket'+(id?' WHERE id<>?':''),id?[id]:[]),auditMax=db('SELECT COALESCE(MAX(id),0) id FROM ak_riwayat')[0].id,auditBefore=db('SELECT * FROM ak_riwayat WHERE id<=? ORDER BY id',[auditMax]);
 const schemas=Object.fromEntries(['ak_tugas_piket','ak_riwayat'].map(t=>[t,createSchema(t)]));
 const browser=await chromium.launch();let admin;
 try{
  async function login(username){const c=await browser.newContext({viewport:{width:1440,height:1000}});contexts.push(c);await c.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());const p=await c.newPage();await p.goto(base+'/auth/login.php');await p.locator('[name=username]').fill(username);await p.locator('[name=password]').fill('password');await Promise.all([p.waitForURL(/\/beranda(?:\?|$)|\/academic\/index\.php/),p.getByRole('button',{name:'Masuk',exact:true}).click()]);return p;}
  admin=await login('uji_admin');
  const form=()=>admin.locator('#tugas-guru-piket form');
  const fill=async(note)=>{await form().locator('[name=id_guru]').selectOption(guruId);await form().locator('[name=id_kelas]').selectOption('2');await form().locator('[name=mulai]').fill('2026-11-03');await form().locator('[name=selesai]').fill('2026-11-30');await form().locator('[name=boleh_koreksi]').selectOption('0');await form().locator('[name=catatan]').fill(note);};
  const submit=async(label='Simpan tugas Guru Piket')=>{const [r]=await Promise.all([admin.waitForNavigation(),form().getByRole('button',{name:label,exact:true}).click()]);return r;};
  await test('save_real_duty_opens_saved_id_and_reads_back_from_database',async()=>{
   await admin.goto(base+'/akademik?id_tahun_ajaran=1&'+(id?'piket='+id:'piket_baru=1'));await fill(marker+' awal');check((await submit()).status()===200);const rows=db('SELECT * FROM ak_tugas_piket WHERE catatan=?',[marker+' awal']);check(rows.length===1,'Saved duty missing');id=rows[0].id;const u=new URL(admin.url());check(u.searchParams.get('piket')===String(id)&&u.searchParams.get('id_tahun_ajaran')==='1');check(u.hash==='#tugas-guru-piket');check(await admin.locator('#tugas-guru-piket').evaluate(e=>e.open));check(await form().locator('[name=id]').inputValue()===String(id));check(String(rows[0].id_guru)===guruId&&rows[0].id_kelas===2&&rows[0].boleh_koreksi===0&&rows[0].aktif===1);check((await admin.locator('main').innerText()).includes('Tugas Guru Piket #'+id+' berhasil disimpan.'));await admin.reload();check(await form().locator('[name=catatan]').inputValue()===marker+' awal');check(await form().locator('[name=mulai]').inputValue()==='2026-11-03');check(await form().locator('[name=selesai]').inputValue()==='2026-11-30');
  });
  await test('second_save_updates_same_id_instead_of_creating_duplicate',async()=>{
   const count=db('SELECT COUNT(*) n FROM ak_tugas_piket')[0].n;await form().locator('[name=catatan]').fill(marker+' diedit');check((await submit()).status()===200);check(db('SELECT COUNT(*) n FROM ak_tugas_piket')[0].n===count);check(db('SELECT catatan FROM ak_tugas_piket WHERE id=?',[id])[0].catatan===marker+' diedit');await admin.reload();check(await form().locator('[name=catatan]').inputValue()===marker+' diedit');
  });
  await test('validation_failure_preserves_open_form_inputs_without_database_write',async()=>{
   const beforeInvalid=snapshot();await form().locator('[name=mulai]').fill('2026-12-01');await form().locator('[name=catatan]').fill(marker+' invalid belum disimpan');check((await submit()).status()===422);check(await admin.locator('#tugas-guru-piket').evaluate(e=>e.open));check(await form().locator('[name=mulai]').inputValue()==='2026-12-01');check(await form().locator('[name=catatan]').inputValue()===marker+' invalid belum disimpan');check((await admin.locator('[role=alert]').innerText()).includes('Tanggal tugas di luar periode.'));check((await admin.locator('#tugas-guru-piket').innerText()).includes('Perubahan tugas belum disimpan.'));check(JSON.stringify(snapshot())===JSON.stringify(beforeInvalid));await admin.goto(base+'/akademik?id_tahun_ajaran=1&piket='+id);
  });
  await test('CSRF_and_non_admin_cannot_assign_duty_permissions',async()=>{
   const beforeDenied=snapshot();check((await admin.request.post(base+'/akademik',{form:{action:'piket',csrf_token:'invalid'}})).status()===419);const teacher=await login('uji_guru');const token=await teacher.locator('[name=csrf_token]').first().inputValue();check((await teacher.request.post(base+'/akademik',{form:{action:'piket',csrf_token:token,id_tahun_ajaran:'1',id_guru:'1',id_kelas:'',mulai:'2026-11-01',selesai:'2026-11-30',boleh_koreksi:'1',catatan:'Forbidden self grant'}})).status()===403);check(JSON.stringify(snapshot())===JSON.stringify(beforeDenied));
  });
  await test('saved_duty_has_admin_audit_and_responsive_editor',async()=>{
   const actor=db("SELECT id_user FROM users WHERE username='uji_admin'")[0].id_user;const history=db("SELECT action,actor_id FROM ak_riwayat WHERE entity='piket' AND record_id=? AND id>?",[String(id),auditMax]);check(history.length>=2&&history.every(r=>r.actor_id===actor));check(history.some(r=>r.action==='ubah'));for(const width of [320,1440]){await admin.setViewportSize({width,height:1000});await admin.goto(base+'/akademik?id_tahun_ajaran=1&piket='+id+'#tugas-guru-piket');check(await admin.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));check(await form().locator('[name=catatan]').inputValue()===marker+' diedit');await admin.screenshot({path:state+`/reports/piket-save-${width}.png`,fullPage:true});}
  });
  await test('explicit_add_new_button_opens_empty_form_without_creating_record',async()=>{
   const beforeNew=snapshot();await Promise.all([admin.waitForNavigation(),admin.getByRole('link',{name:'Tambah tugas Guru Piket',exact:true}).click()]);check(await admin.locator('#tugas-guru-piket').evaluate(e=>e.open));check(await form().locator('[name=id]').count()===0);check(await form().locator('[name=catatan]').inputValue()==='');check(JSON.stringify(snapshot())===JSON.stringify(beforeNew));
  });
 }finally{
  await test('revoke_only_regression_fixture_and_keep_existing_permissions_and_school_data',async()=>{
   if(!id){const rows=db('SELECT id FROM ak_tugas_piket WHERE catatan LIKE ?',[marker+'%']);if(rows.length===1)id=rows[0].id;}
   if(id&&admin){await admin.goto(base+'/akademik?id_tahun_ajaran=1&piket='+id);const f=admin.locator('#tugas-guru-piket form');const [r]=await Promise.all([admin.waitForNavigation(),f.getByRole('button',{name:'Cabut tugas',exact:true}).click()]);check(r.status()===200);check(db('SELECT aktif FROM ak_tugas_piket WHERE id=?',[id])[0].aktif===0);check(new URL(admin.url()).searchParams.get('piket')===String(id));}
   check(JSON.stringify(db('SELECT * FROM ak_tugas_piket'+(id?' WHERE id<>?':''),id?[id]:[]))===JSON.stringify(duties),'Existing duty changed');check(JSON.stringify(db('SELECT * FROM ak_riwayat WHERE id<=? ORDER BY id',[auditMax]))===JSON.stringify(auditBefore),'Existing audit changed');const after=snapshot();check(JSON.stringify(before.objects)===JSON.stringify(after.objects));check(JSON.stringify(Object.keys(before.tables))===JSON.stringify(Object.keys(after.tables)));for(const[t,v]of Object.entries(before.tables))if(!['ak_tugas_piket','ak_riwayat'].includes(t))check(JSON.stringify(after.tables[t])===JSON.stringify(v),'Protected table changed: '+t);for(const[t,v]of Object.entries(schemas))check(createSchema(t)===v,'Schema changed');
  });
  for(const c of contexts)await c.close();await browser.close();
 }
 const report={tested_at:new Date().toISOString(),passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length,skipped:0,fixture_id:id,fixture_final_state:'revoked; audit retained',tests:results};fs.writeFileSync(state+'/reports/piket-save-tests.json',JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(`${report.passed} PASS, ${report.failed} FAIL`);process.exitCode=report.failed?1:0;
})().catch(e=>{fs.writeFileSync(state+'/reports/piket-save-runner-error.txt',String(e.stack),{mode:0o600});console.error('Duty runner failed: '+e.name+'; '+(e.stack||'').split('\n').slice(1,3).join(' '));process.exitCode=1;});
