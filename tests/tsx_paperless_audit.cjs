'use strict';
// Audit acceptance criteria for the three physical books. FAIL = a real gap,
// not a claim that unrelated functional checks have regressed.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),os=require('os');
const ROOT=path.resolve(__dirname,'..');
const STATE=path.resolve(process.env.SIA_PAPER_STATE||path.join(os.homedir(),'.local/state/sia-paper-audit-20261104'));
const BASE=process.env.SIA_PAPER_URL||'http://127.0.0.1:18133';
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(BASE))throw Error('Loopback URL required');
const filename=fs.realpathSync(path.join(STATE,'app/data/sia.db'));
if(filename.startsWith(ROOT+path.sep))throw Error('Refuse repository DB');
const db=new(require('better-sqlite3'))(filename,{fileMustExist:true});
if(db.prepare('SELECT COUNT(*) n FROM siswa').get().n!==21||!db.prepare("SELECT 1 FROM siswa WHERE nama_siswa='Siswa Paper 20'").get())throw Error('20+1 synthetic roster required');
if(db.prepare('SELECT COUNT(*) n FROM ak_pertemuan').get().n)throw Error('Create a new sandbox for each audit');
const secret=JSON.parse(fs.readFileSync(path.join(STATE,'private.json')));
const results=[];const record=(id,ok,observed={})=>{results.push({id,status:ok?'PASS':'FAIL',observed});console.log(`${ok?'PASS':'FAIL'} ${id}`)};
const fingerprint=table=>crypto.createHash('sha256').update(JSON.stringify(db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all())).digest('hex');
const beforeDaily=fingerprint('ak_absensi_harian');
async function request(url,session,body){const r=await fetch(BASE+url,{redirect:'manual',signal:AbortSignal.timeout(90000),method:body?'POST':'GET',headers:{...(session?{Cookie:session.cookie}:{}),...(body?{'Content-Type':'application/json',Origin:BASE}:{})},body:body?JSON.stringify(body):undefined});const bytes=Buffer.from(await r.arrayBuffer());let json;try{json=JSON.parse(bytes.toString())}catch{}return{status:r.status,json,headers:r.headers,bytes,text:bytes.toString()}}
async function login(username){const r=await request('/api/auth',null,{username,password:secret.password});if(r.status!==200||!r.json?.success)throw Error('Fixture login unavailable');return{cookie:r.headers.get('set-cookie').split(';')[0]}}
(async()=>{
 const guru=await login('uji_guru'),piket=await login('uji_piket'),other=await login('uji_guru_lain');
 let r=await request('/api/absensi?id_jadwal=1&tanggal=2026-10-30',guru);
 record('ROSTER_20_students_pending_before_verification',r.status===200&&r.json.data.length===20&&r.json.data.every(s=>s.status==='B'));
 record('ROSTER_identity_can_fill_LP_column_in_physical_register',r.status===200&&r.json.data.every(s=>['L','P'].includes(s.jenis_kelamin)),{gender_field_in_session_response:r.json.data.some(s=>s.jenis_kelamin)});
 const cfg=JSON.parse(fs.readFileSync(process.env.SIA_BROWSER_CONFIG||path.join(os.homedir(),'.local/state/sia-academic-dev/20261031/private/runtime.json')));
 process.env.PLAYWRIGHT_BROWSERS_PATH=cfg.PDF_BROWSERS_PATH;process.env.LD_LIBRARY_PATH=cfg.PDF_LIBRARY_PATH;
 const browser=await require(cfg.PDF_PLAYWRIGHT_PATH).chromium.launch();
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),p=await context.newPage();
  await p.goto(BASE+'/auth/login');await p.locator('[name=username]').fill('uji_guru');await p.locator('[name=password]').fill(secret.password);
  await Promise.all([p.waitForURL('**/guru'),p.getByRole('button',{name:'Masuk',exact:true}).click()]);
  await p.goto(BASE+'/guru/absen?id_jadwal=1&tanggal=2026-10-30');await p.getByLabel('Materi pembelajaran',{exact:true}).waitFor();
  await p.getByRole('checkbox').check();await p.getByRole('button',{name:'Tandai Semua Hadir',exact:true}).click();
  await p.getByLabel('9800004 S',{exact:true}).click();await p.getByLabel('9800005 I',{exact:true}).click();
  await p.getByLabel('Keterangan 9800004',{exact:true}).fill('Keterangan sakit sintetis');await p.getByLabel('Keterangan 9800005',{exact:true}).fill('Keterangan izin sintetis');
  const fields={'Pertemuan ke':'1','Jam pelajaran (opsional)':'1–2','TP / ATP':'TP-UJI-01','Materi pembelajaran':'Materi audit tiga buku','Kegiatan pembelajaran':'Diskusi sintetis','Refleksi KBM':'Refleksi audit','Tindak lanjut':'Tindak lanjut audit','Catatan':'Catatan audit'};
  for(const[label,value]of Object.entries(fields))await p.getByLabel(label,{exact:true}).fill(value);
  const writes=[];p.on('request',q=>{if(q.method()==='POST'&&new URL(q.url()).pathname.startsWith('/api/'))writes.push(new URL(q.url()).pathname)});
  await p.getByRole('button',{name:'Simpan Absensi & Jurnal',exact:true}).click();await p.locator('[data-status=success]').waitFor();
  const meeting=db.prepare("SELECT * FROM ak_pertemuan WHERE id_jadwal='1' AND tanggal='2026-10-30'").get();
  const sessions=db.prepare('SELECT * FROM ak_absensi_sesi WHERE id_pertemuan=? ORDER BY CAST(nomor_absen AS INTEGER)').all(meeting.id);
  const counts=Object.fromEntries(['H','S','I','A','B'].map(c=>[c,sessions.filter(s=>s.status===c).length]));
  record('ONE_SUBMISSION_saves_one_meeting_and_20_session_rows',JSON.stringify(writes)===JSON.stringify(['/api/absensi'])&&sessions.length===20&&db.prepare('SELECT COUNT(*) n FROM ak_pertemuan').get().n===1,{write_endpoints:writes,meeting_rows:1,session_rows:sessions.length});
  record('ATTENDANCE_exact_18H_1S_1I_0A_0B',JSON.stringify(counts)===JSON.stringify({H:18,S:1,I:1,A:0,B:0}),counts);
  await p.screenshot({path:path.join(STATE,'screenshots/absensi-20-siswa.png'),fullPage:true});
  record('JOURNAL_stores_TP_material_activity_reflection_followup',meeting.tp_atp==='TP-UJI-01'&&meeting.materi===fields['Materi pembelajaran']&&meeting.refleksi===fields['Refleksi KBM']&&meeting.tindak_lanjut===fields['Tindak lanjut']&&meeting.kegiatan===fields['Kegiatan pembelajaran']);
  record('AUDIT_actor_and_timestamp_saved',meeting.created_by==='2'&&!!meeting.created_at&&db.prepare('SELECT COUNT(*) n FROM ak_riwayat WHERE actor_id=?').get('2').n===21);
  await p.reload();await p.getByRole('button',{name:'Tandai Semua Hadir',exact:true}).waitFor();
  r=await request('/api/absensi?id_jadwal=1&tanggal=2026-10-30',guru);
  record('RELOAD_session_data_persists',r.json.data.length===20&&r.json.data.filter(s=>s.status==='H').length===18&&r.json.data.find(s=>s.nomor_absen==='4').status==='S'&&r.json.data.find(s=>s.nomor_absen==='5').status==='I');
  r=await request('/api/absensi?id_jadwal=3&tanggal=2026-10-30',guru);
  const foreign=await request('/api/absensi?id_jadwal=2&tanggal=2026-10-30',other);
  record('ISOLATION_other_subject_and_class_not_overwritten',r.json.data.every(s=>s.status==='B')&&foreign.json.data.length===1&&foreign.json.data[0].status==='B');
  r=await request('/api/jurnal?id_jadwal=1&tanggal=2026-10-30',guru);
  record('SHARED_MEETING_journal_and_attendance_same_record',r.json.data.length===1&&r.json.data[0].id===meeting.id&&r.json.data[0].materi===meeting.materi);
  await p.goto(BASE+'/guru/jurnal?id_jadwal=1&tanggal=2026-10-30');
  await p.waitForFunction(()=>document.querySelector('[aria-label="Materi pembelajaran"]')?.value==='Materi audit tiga buku');
  const text=await p.locator('main').innerText();
  record('AGENDA_displays_nonpresent_names_and_statuses_from_same_meeting',text.includes('Siswa Paper 04')&&text.includes('Siswa Paper 05'),{absent_names_visible:text.includes('Siswa Paper 04')&&text.includes('Siswa Paper 05')});
  const printActions=await p.locator('main button, main a').allTextContents();
  await p.screenshot({path:path.join(STATE,'screenshots/jurnal-tanpa-laporan.png'),fullPage:true});
  record('DOCUMENTS_three_print_or_download_outputs_available',printActions.some(t=>/cetak.*jurnal|unduh.*jurnal/i.test(t))&&printActions.some(t=>/cetak.*agenda|unduh.*agenda/i.test(t))&&printActions.some(t=>/matriks|daftar hadir/i.test(t)),{available_actions:printActions.map(t=>t.trim()).filter(Boolean)});
  const replacement=await p.locator('[name=id_guru_pengganti], [aria-label*="pengganti" i]').count();
  record('JOURNAL_substitute_teacher_workflow_available',replacement>0,{substitute_controls:replacement});
  const journalData=await request('/api/jurnal?id_jadwal=1',guru);
  r=await request('/api/jurnal',guru,{...journalData.json.data[0],id_guru_pengganti:'2',alasan:'Uji audit kolom guru pengganti'});
  const changed=db.prepare('SELECT * FROM ak_pertemuan WHERE id=?').get(meeting.id);
  record('VALIDATION_substitute_field_not_silently_discarded',r.status>=400||changed.id_guru_pengganti==='2',{http:r.status,stored_substitute:changed.id_guru_pengganti??null});
  r=await request('/api/jurnal',guru,{id_jadwal:'1',tanggal:'2026-11-06',pertemuan_ke:2,jam_ke:'99',materi:'Probe jam pelajaran sintetis'});
  record('VALIDATION_invalid_lesson_number_rejected',r.status>=400,{http:r.status,submitted_lesson_number:'99'});
  r=await request('/api/piket?tanggal=2026-10-30&id_kelas=1',piket);
  record('DAILY_school_source_is_not_overwritten_by_session',fingerprint('ak_absensi_harian')===beforeDaily,{session_counts:counts,daily_counts:r.json.data[0].counts});
  await p.goto(BASE+'/piket?tanggal=2026-10-30');await p.waitForLoadState('networkidle');
  // Teacher has no duty. Its denial must not be confused with a missing route.
  record('RBAC_non_duty_teacher_cannot_read_piket',await p.locator('[role=alert]').count()>0);
  await p.goto(BASE+'/auth/login');await p.locator('[name=username]').fill('uji_piket');await p.locator('[name=password]').fill(secret.password);
  await Promise.all([p.waitForURL('**/piket'),p.getByRole('button',{name:'Masuk',exact:true}).click()]);
  await p.getByLabel('Tanggal piket',{exact:true}).fill('2026-10-30');await p.waitForLoadState('networkidle');
  const dutyActions=(await p.locator('main button,main a').allTextContents()).map(t=>t.trim());
  record('DAILY_piket_reconciliation_action_available',dutyActions.some(t=>/rekonsiliasi|konfirmasi.*harian|sahkan.*absensi/i.test(t)),{available_actions:dutyActions});
  const raw=await request('/api/export?kind=jurnal&id_jadwal=1&tanggal=2026-10-30&format=csv',guru);
  fs.writeFileSync(path.join(STATE,'reports/journal-export-response.csv'),raw.bytes,{mode:0o600});
  record('EXPORT_journal_CSV_contains_requested_meeting',raw.status===200&&raw.text.includes('Materi audit tiga buku')&&raw.text.includes('TP-UJI-01'),{http:raw.status,type:raw.headers.get('content-type'),first_line:raw.text.split('\n')[0]});
  for(const[kind,format]of[['agenda','xlsx'],['absensi','pdf']]){
   const file=await request(`/api/export?kind=${kind}&id_jadwal=1&format=${format}`,guru);
   fs.writeFileSync(path.join(STATE,'reports',`requested-${kind}-${format}.response`),file.bytes,{mode:0o600});
   record('EXPORT_'+kind+'_'+format+'_is_real_file',file.status===200&&(format==='pdf'?file.bytes.subarray(0,5).toString()==='%PDF-':file.bytes.subarray(0,2).toString()==='PK'),{http:file.status,type:file.headers.get('content-type'),signature:file.bytes.subarray(0,5).toString()});
  }
  const bypass=await request('/api/export?kind=piket&id_kelas=2&tanggal=2026-11-06',guru);
  record('EXPORT_piket_enforces_same_permission_as_dashboard',bypass.status===403,{dashboard_status:(await request('/api/piket?tanggal=2026-11-06',guru)).status,export_status:bypass.status});
  record('MATRIX_subject_session_matrix_action_available',printActions.some(t=>/matriks|matrix|daftar hadir/i.test(t)),{observed:'No session matrix action in teacher journal. The Piket matrix uses daily school attendance.'});
  await p.screenshot({path:path.join(STATE,'screenshots/paperless-audit.png'),fullPage:true});
  await context.close();
 }finally{await browser.close()}
 record('INTEGRITY_synthetic_database_check',db.pragma('integrity_check')[0].integrity_check==='ok');
})().catch(e=>{results.push({id:'runner',status:'ERROR',message:e.message});console.error(e.stack)}).finally(()=>{
 db.close();const original=JSON.parse(fs.readFileSync(path.join(STATE,'reports/original-db-before.json')));
 record('INTEGRITY_repository_DB_WAL_SHM_unchanged',Object.entries(original).every(([f,h])=>crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,'data',f))).digest('hex')===h));
 const report={date:'2026-11-04',commit:require('child_process').execFileSync('git',['rev-parse','--short','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),method:'Focused paper-replacement acceptance audit using actual Chromium + HTTP + isolated synthetic SQLite; no application fixes applied',passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length,errors:results.filter(r=>r.status==='ERROR').length,tests:results};
 fs.writeFileSync(path.join(STATE,'reports/paperless-audit.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(`${report.passed} PASS, ${report.failed} FAIL, ${report.errors} ERROR`);process.exitCode=report.errors?2:report.failed?1:0;
});
