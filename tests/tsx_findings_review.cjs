'use strict';
// Audit only. HTTP writes target an external synthetic review database, never data/sia.db.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'..'),STATE=path.resolve(process.env.SIA_REVIEW_STATE||path.join(require('os').homedir(),'.local/state/sia-tsx-review-20261103'));
const BASE=process.env.SIA_REVIEW_BASE||'http://127.0.0.1:18128',secrets=JSON.parse(fs.readFileSync(path.join(STATE,'private.json')));
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(BASE))throw Error('Review server must use an explicit loopback port');
const Database=require('better-sqlite3');
const fixturePath=path.join(STATE,'app/data/sia.db');
if(fixturePath.startsWith(ROOT+path.sep)||!fs.existsSync(fixturePath))throw Error('Isolated review fixture required');
const db=new Database(fixturePath,{fileMustExist:true});
if(db.prepare('SELECT COUNT(*) n FROM siswa').get().n!==3||!db.prepare("SELECT 1 FROM guru WHERE nama_guru='Guru Review Satu'").get())throw Error('Refuse non-synthetic fixture');
const results=[];
function record(id,ok,observed){results.push({id,status:ok?'PASS':'FAIL',observed});console.log((ok?'PASS':'FAIL')+' '+id);}
async function request(url,session={},body){const r=await fetch(BASE+url,{redirect:'manual',signal:AbortSignal.timeout(90000),method:body?'POST':'GET',headers:{...(session.cookie?{Cookie:session.cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const text=await r.text();let json;try{json=JSON.parse(text)}catch{}return{status:r.status,headers:r.headers,text,json};}
async function login(username){const r=await request('/api/auth',{}, {username,password:secrets.password});if(r.status!==200||!r.json?.success)throw Error('Fixture login failed');return{cookie:r.headers.get('set-cookie').split(';')[0],user:r.json.user};}
(async()=>{
 const admin=await login('uji_admin'),guru=await login('uji_guru'),other=await login('uji_guru_lain'),head=await login('uji_kepsek'),student=await login('uji_siswa');
 record('AUTH_five_fixture_accounts_login',true,{accounts:5});
 let r=await request('/api/users',admin);record('ADMIN_users_matches_database_schema',r.status===200,{http:r.status,error:r.json?.error});
 r=await request('/api/master?table=kelas',admin);record('ADMIN_master_read_API',r.status===200&&r.json?.data?.length===2,{http:r.status,rows:r.json?.data?.length});
 r=await request('/admin/users');record('AUTH_guest_admin_page_denied',[301,302,303,307,308,401,403].includes(r.status),{http:r.status});
 r=await request('/api/master?table=siswa',student);record('RBAC_student_cannot_read_school_master',[401,403].includes(r.status),{http:r.status,rows:r.json?.data?.length});
 const a=await request('/api/absensi?kelas=XII%20PPLG%202&tanggal=2026-10-30',guru),b=await request('/api/absensi?kelas=XII%20PPLG%201&tanggal=2026-10-30',guru);
 record('ABSENSI_class_filter_isolates_roster',a.json?.data?.length===2&&b.json?.data?.length===1,{class_one_rows:a.json?.data?.length,class_two_rows:b.json?.data?.length,identical:JSON.stringify(a.json?.data)===JSON.stringify(b.json?.data)});
 const s1=await request('/api/absensi?id_jadwal=1&tanggal=2026-10-30',guru),s2=await request('/api/absensi?id_jadwal=3&tanggal=2026-10-30',guru);
 record('ABSENSI_schedule_filter_isolates_sessions',s1.json?.data?.every(x=>x.id_jadwal==='1')&&s2.json?.data?.every(x=>x.id_jadwal==='3'),{identical:JSON.stringify(s1.json?.data)===JSON.stringify(s2.json?.data),source_has_schedule_id:s1.json?.data?.some(x=>x.id_jadwal)});
 r=await request('/api/absensi?kelas=XII%20PPLG%202&tanggal=2026-10-29',guru);record('ABSENSI_new_date_loads_roster_with_pending',r.json?.data?.length===2,{http:r.status,rows:r.json?.data?.length});
 r=await request('/api/absensi',guru,{tanggal:'2026-10-30',id_kelas:'1',id_jadwal:'1',items:[{nis:'9000001',status:'S'}]});record('ABSENSI_save_compatible_with_schema',r.status===200,{http:r.status,error:r.json?.error});
 r=await request('/api/jurnal',guru,{id_jadwal:'1',tanggal:'2026-10-30',materi:'Fixture review'});record('JURNAL_save_compatible_with_schema',r.status===200,{http:r.status,error:r.json?.error});
 r=await request('/api/rapor?id=1',student);record('RAPOR_student_draft_denied',[401,403,404].includes(r.status),{http:r.status,fixture_status:'draft'});
 r=await request('/api/master',admin,{table:'kelas',nama_kelas:'Kelas Review Baru'});record('ADMIN_master_write_implemented',r.status!==405,{http:r.status});
 r=await request('/api/nilai',guru,{id_mapel:1,id_kelas:1,items:[{nis:'9000001',nilai_tugas:80,nilai_uts:80,nilai_uas:80}]});record('NILAI_create_really_persists',r.status===200&&db.prepare("SELECT COUNT(*) n FROM ak_nilai WHERE nis='9000001'").get().n===1,{http:r.status,rows:db.prepare('SELECT COUNT(*) n FROM ak_nilai').get().n,claimed_success:r.json?.success});
 r=await request('/api/jadwal',guru);record('JADWAL_teacher_own_scope',r.json?.data?.every(x=>x.id_guru==='1'),{http:r.status,rows:r.json?.data?.length,teachers:[...new Set(r.json?.data?.map(x=>x.id_guru))]});
 const cfg=JSON.parse(fs.readFileSync(path.join(require('os').homedir(),'.local/state/sia-academic-dev/20261031/private/runtime.json')));
 process.env.PLAYWRIGHT_BROWSERS_PATH=cfg.PDF_BROWSERS_PATH;process.env.LD_LIBRARY_PATH=cfg.PDF_LIBRARY_PATH;
 const{chromium}=require(cfg.PDF_PLAYWRIGHT_PATH),browser=await chromium.launch();
 try{
  const ctx=await browser.newContext({viewport:{width:1440,height:900}}),p=await ctx.newPage();
  await p.goto(BASE+'/auth/login');await p.locator('[name=username]').fill('uji_kepsek');await p.locator('[name=password]').fill(secrets.password);await Promise.all([p.waitForURL('**/kepsek'),p.getByRole('button',{name:'Masuk',exact:true}).click()]);
  const panel=p.getByRole('link',{name:'Buka Panel Kepsek',exact:false});const target=await panel.getAttribute('href');await Promise.all([p.waitForURL('**/kepsek'),panel.click()]);record('KEPSEK_open_panel_goes_to_other_page',target!=='/kepsek',{href:target});
  await p.waitForLoadState('networkidle');const menu=await p.locator('.sia-modules').innerText();record('KEPSEK_navigation_matches_server_role',menu.includes('Monitoring'),{labels:menu.replace(/\n/g,' | '),role:head.user.role});
  const links=await p.locator('main a[href^="/kepsek/"]').evaluateAll(xs=>xs.map(x=>({href:x.getAttribute('href'),label:x.innerText})));
  let cardsOk=true;for(const l of links){const response=await p.goto(BASE+l.href);if(response.status()!==200)cardsOk=false;}
  record('KEPSEK_feature_cards_have_real_routes',links.length===5&&cardsOk,{cards:links.length});
  await p.goto(BASE+'/kepsek');await p.getByRole('link',{name:'Keluar',exact:true}).click();const after=await p.request.get(BASE+'/api/jadwal');record('AUTH_logout_revokes_session',[401,403].includes(after.status()),{http_after_logout:after.status()});
  await p.goto(BASE+'/auth/login');await p.locator('[name=username]').fill('uji_admin');await p.locator('[name=password]').fill(secrets.password);await Promise.all([p.waitForURL('**/admin'),p.getByRole('button',{name:'Masuk',exact:true}).click()]);
  await p.goto(BASE+'/admin/bulk-upload');record('ADMIN_bulk_upload_has_real_file_input',await p.locator('input[type=file]').count()>0,{file_inputs:await p.locator('input[type=file]').count()});
  await p.goto(BASE+'/guru/jadwal');await p.waitForLoadState('networkidle');const txt=await p.locator('main').innerText();record('JADWAL_GUI_uses_API_field_names',txt.includes('Mapel Review A')&&txt.includes('XII PPLG 2'),{fixture_subject_visible:txt.includes('Mapel Review A')});
  await p.goto(BASE+'/auth/login');await p.locator('[name=username]').fill('uji_kepsek');await p.locator('[name=password]').fill(secrets.password);await Promise.all([p.waitForURL('**/kepsek'),p.getByRole('button',{name:'Masuk',exact:true}).click()]);
  for(const width of [320,375,430,768,1440]){
   await p.setViewportSize({width,height:900});await p.goto(BASE+'/kepsek');await p.waitForLoadState('networkidle');await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));const geometry=await p.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,headerTop:document.querySelector('header').getBoundingClientRect().top,logoutTop:[...document.querySelectorAll('header a')].find(x=>x.textContent.trim()==='Keluar')?.getBoundingClientRect().top}));record('UI_header_logout_and_overflow_'+width,geometry.scrollWidth<=width+1&&geometry.headerTop>=-1&&geometry.logoutTop>=0,geometry);await p.screenshot({path:path.join(STATE,'screenshots','kepsek-'+width+'.png'),fullPage:true});
  }
  await ctx.close();
 }finally{await browser.close();}
})().catch(e=>{results.push({id:'review_runner',status:'ERROR',error_type:e.name});console.error('REVIEW ERROR '+e.name);}).finally(()=>{
 db.close();const before=JSON.parse(fs.readFileSync(path.join(STATE,'reports/original-db-before.json'))),after={};for(const name of Object.keys(before))after[name]=crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,'data',name))).digest('hex');record('INTEGRITY_original_database_files_unchanged',JSON.stringify(before)===JSON.stringify(after),{unchanged:JSON.stringify(before)===JSON.stringify(after)});
 const git=(...args)=>require('child_process').execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim();
 const report={branch:git('branch','--show-current'),commit:git('rev-parse','--short','HEAD'),method:'Actual Next HTTP/browser on schema-only synthetic fixture; original database read-only',url:BASE,passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length,errors:results.filter(x=>x.status==='ERROR').length,tests:results};fs.writeFileSync(path.join(STATE,'reports/tsx-findings.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(`${report.passed} PASS, ${report.failed} FAIL, ${report.errors} ERROR`);process.exitCode=report.errors?2:report.failed?1:0;
});
