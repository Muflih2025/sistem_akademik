'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(__dirname,'..'),state='/home/muflih/.local/state/sia-academic-dev/20261031',base='http://127.0.0.1:18125';
const cfg=JSON.parse(fs.readFileSync(state+'/private/runtime.json')),creds=JSON.parse(fs.readFileSync(state+'/private/test-accounts.json'));if(cfg.APP_ENV!=='testing'||cfg.DB_NAME!=='sia_academic_dev_20261031'||!cfg.DB_SOCKET)throw Error('Fixture only');
const{chromium}=require(cfg.PDF_PLAYWRIGHT_PATH),results=[];const tag=Date.now().toString(36).slice(-6);let browser,context;
const check=v=>{if(!v)throw Error('Bulk browser condition failed; private fixture data omitted');};
function db(sql,args=[]){return JSON.parse(cp.execFileSync('php',[root+'/tests/academic_db.php',state+'/private/inspector.json'],{input:JSON.stringify({sql,args})}));}
async function test(name,fn){try{await fn();results.push({test:name,status:'PASS'});process.stdout.write('PASS '+name+'\n');}catch(e){results.push({test:name,status:'FAIL',error_type:e.name});throw e;}}
const form=(p,a)=>p.locator('form:has(input[name=action][value="'+a+'"])');
async function submit(p,f){const[r]=await Promise.all([p.waitForNavigation(),f.locator('button[type=submit]').click()]);check(r.status()===200);}
(async()=>{browser=await chromium.launch();context=await browser.newContext({viewport:{width:375,height:900}});await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());const p=await context.newPage();await p.goto(base+'/auth/login.php');await p.locator('[name=username]').fill(creds.admin);await p.locator('[name=password]').fill(creds.password);await Promise.all([p.waitForURL(/\/(?:academic\/index\.php|beranda)(?:\?|$)/),p.locator('button').click()]);let major,klass;
 for(const module of ['jurusan','kelas','siswa','guru','mata_pelajaran','ak_ruang']){
  const key={jurusan:'kode_jurusan',kelas:'nama_kelas',siswa:'nis',guru:'nip',mata_pelajaran:'kode_mapel',ak_ruang:'kode_ruang'}[module];let rows;
  if(module==='jurusan')rows=Array.from({length:23},(_,i)=>['U'+tag+String(i).padStart(2,'0'),'Jurusan Browser Bulk '+tag+' '+i]);
  if(module==='kelas')rows=[[`BU ${tag} 1`,'X',major],[`BU ${tag} 2`,'XI',major]];
  if(module==='siswa')rows=[['0006'+String(Date.now()).slice(-9)+'01','Siswa Browser Bulk '+tag+' 1','L','2010-02-03',klass,''],['0006'+String(Date.now()).slice(-9)+'02','Siswa Browser Bulk '+tag+' 2','P','2010-02-04',klass,'']];
  if(module==='guru')rows=[[`BU-${tag}-1`,'Guru Browser Bulk '+tag+' 1','',''],[`BU-${tag}-2`,'Guru Browser Bulk '+tag+' 2','','']];
  if(module==='mata_pelajaran')rows=[['V'+tag+'1','Mapel Browser Bulk '+tag+' 1','Produktif',75],['V'+tag+'2','Mapel Browser Bulk '+tag+' 2','Muatan Nasional',76]];
  if(module==='ak_ruang')rows=[['BU-'+tag+'1','Lab Uji '+tag+' 1','Laboratorium'],['BU-'+tag+'2','R Uji '+tag+' 2','Kelas']];
  await test('browser_template_upload_confirm_persist_reload_'+module,async()=>{
   await p.goto(base+'/admin/master.php?table='+module);await p.getByRole('link',{name:'Bulk Upload Excel',exact:true}).click();check(p.url().includes('/admin/bulk_upload.php'));
   const[download]=await Promise.all([p.waitForEvent('download'),p.getByRole('link',{name:'Template Excel',exact:true}).click()]);const source=state+'/reports/bulk-browser-template-'+module+'-'+tag+'.xlsx',filled=state+'/reports/bulk-browser-filled-'+module+'-'+tag+'.xlsx';await download.saveAs(source);
   cp.execFileSync('python3',['-c',"import datetime,json,sys;from openpyxl import load_workbook;b=load_workbook(sys.argv[1]);s=b.active;rows=json.loads(sys.stdin.read());[(s.append([datetime.datetime.fromisoformat(v) if i==3 and sys.argv[3]=='siswa' else v for i,v in enumerate(r)])) for r in rows];b.save(sys.argv[2])",source,filled,module],{input:JSON.stringify(rows)});
   const upload=form(p,'impor_preview');await upload.locator('[name=berkas]').setInputFiles(filled);await upload.locator('[name=alasan]').fill('Sumber workbook browser development '+tag);await submit(p,upload);
   check(await p.locator('[data-import-preview] tbody tr').count()===Math.min(20,rows.length));check(db('SELECT * FROM `'+module+'` WHERE `'+key+'`=?',[rows[0][0]]).length===0);
   if(rows.length>20){await p.locator('[data-import-preview]').getByRole('link',{name:'Berikutnya',exact:true}).click();check(await p.locator('[data-import-preview] tbody tr').count()===3);}
   const commit=form(p,'impor_commit');await commit.locator('[name=konfirmasi]').check();await submit(p,commit);await p.reload();
   for(const r of rows)check(db('SELECT * FROM `'+module+'` WHERE `'+key+'`=?',[r[0]]).length===1);
   await p.getByRole('link',{name:/Kembali ke Master/}).click();await p.locator('form[method=get] [name=q]').fill(rows[0][0]);await Promise.all([p.waitForNavigation(),p.getByRole('button',{name:'Terapkan filter',exact:true}).click()]);check((await p.locator('tbody').innerText()).includes(rows[0][0]));await p.reload();check((await p.locator('tbody').innerText()).includes(rows[0][0]));
  });
  if(module==='jurusan')major=db('SELECT id_jurusan FROM jurusan WHERE kode_jurusan=?',[rows[0][0]])[0].id_jurusan;
  if(module==='kelas')klass=db('SELECT id_kelas FROM kelas WHERE nama_kelas=?',[rows[0][0]])[0].id_kelas;
 }
 await test('bulk_reference_search_uses_real_DB_and_is_paginated',async()=>{await p.goto(base+'/admin/bulk_upload.php?module=siswa');const ref=p.locator('[data-import-reference]');check(await ref.locator('tbody tr').count()<=20);await ref.locator('[name=ref_q]').fill('BU '+tag+' 1');await Promise.all([p.waitForNavigation(),ref.getByRole('button',{name:'Cari referensi',exact:true}).click()]);check((await ref.locator('tbody').innerText()).includes(String(klass)));});
 for(const width of [320,375,430,768,1440])await test('bulk_admin_responsive_'+width,async()=>{await p.setViewportSize({width,height:900});await p.goto(base+'/admin/bulk_upload.php?module=siswa');check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:state+'/reports/bulk-admin-'+width+'.png',fullPage:true});});
})().catch(e=>{if(!results.some(r=>r.status==='FAIL'))results.push({test:'browser_runner',status:'FAIL',error_type:e.name});}).finally(async()=>{if(context)await context.close();if(browser)await browser.close();const report={passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length,skipped:0,tests:results};fs.writeFileSync(state+'/reports/bulk-master-browser-tests.json',JSON.stringify(report,null,2)+'\n',{mode:0o600});process.stdout.write(`${report.passed} PASS, ${report.failed} FAIL, 0 SKIP\n`);process.exitCode=report.failed?1:0;});
