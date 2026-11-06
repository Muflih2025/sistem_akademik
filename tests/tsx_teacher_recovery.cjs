'use strict';
// Run after tsx_teacher_flows.cjs. Only backs up the external synthetic sandbox.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'..');
const STATE=path.resolve(process.env.SIA_TEACHER_STATE||path.join(require('os').homedir(),'.local/state/sia-teacher-fixes-20261104/review'));
const BASE=process.env.SIA_TEACHER_URL||'http://127.0.0.1:18128';
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(BASE))throw Error('Loopback URL required');
const filename=fs.realpathSync(path.join(STATE,'app/data/sia.db'));
if(filename.startsWith(ROOT+path.sep))throw Error('Refuse repository DB');
const Database=require('better-sqlite3'),db=new Database(filename,{fileMustExist:true});
if(!db.prepare("SELECT 1 FROM guru WHERE nama_guru='Guru Piket Review'").get()||!db.prepare("SELECT 1 FROM siswa WHERE nis='PAGE-14'").get())throw Error('Completed synthetic regression fixture required');
const results=[];
const record=(id,ok,observed={})=>{results.push({id,status:ok?'PASS':'FAIL',observed});console.log(`${ok?'PASS':'FAIL'} ${id}`)};
function fingerprints(connection){return Object.fromEntries(connection.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(({name})=>[name,crypto.createHash('sha256').update(JSON.stringify(connection.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all())).digest('hex')]))}
(async()=>{
 const hashes=fingerprints(db);
 if(process.argv.includes('--after-restart')){
  const before=JSON.parse(fs.readFileSync(path.join(STATE,'reports/before-restart.json')));
  record('RECOVERY_restart_preserves_all_table_content',JSON.stringify(hashes)===JSON.stringify(before));
  const secrets=JSON.parse(fs.readFileSync(path.join(STATE,'private.json')));
  const auth=await fetch(BASE+'/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'uji_guru',password:secrets.password})});
  record('RECOVERY_login_after_restart',auth.status===200);
  const cookie=auth.headers.get('set-cookie')?.split(';')[0];
  const a=await fetch(BASE+'/api/absensi?id_jadwal=3&tanggal=2026-10-30',{headers:{Cookie:cookie||''}}),aj=await a.json();
  record('RECOVERY_attendance_after_restart',a.status===200&&aj.data.length===13&&aj.data.find(s=>s.nis==='PAGE-14').status==='S');
  const n=await fetch(BASE+'/api/nilai?id_jadwal=1',{headers:{Cookie:cookie||''}}),nj=await n.json();
  record('RECOVERY_grade_after_restart',n.status===200&&Number(nj.data.find(s=>s.nis==='9000001').nilai_akhir)===83);
  const blocked=await fetch(BASE+'/api/piket?tanggal=2026-10-30',{headers:{Cookie:cookie||''}});
  record('RECOVERY_duty_permission_still_enforced',blocked.status===403);
 }else{
  const dir=path.join(STATE,'recovery-'+Date.now());fs.mkdirSync(dir,{mode:0o700});
  const backup=path.join(dir,'backup.sqlite');await db.backup(backup);fs.chmodSync(backup,0o600);
  const restored=path.join(dir,'restore.sqlite');fs.copyFileSync(backup,restored,fs.constants.COPYFILE_EXCL);fs.chmodSync(restored,0o600);
  const copy=new Database(restored,{readonly:true,fileMustExist:true});
  record('RECOVERY_sqlite_backup_restores_all_table_content',JSON.stringify(hashes)===JSON.stringify(fingerprints(copy)));
  record('RECOVERY_restored_database_integrity',copy.pragma('integrity_check')[0].integrity_check==='ok'&&copy.pragma('foreign_key_check').length===0);
  copy.close();fs.writeFileSync(path.join(STATE,'reports/before-restart.json'),JSON.stringify(hashes),{mode:0o600});
 }
 const original=JSON.parse(fs.readFileSync(path.join(STATE,'reports/original-db-before.json')));
 record('RECOVERY_original_database_files_unchanged',Object.entries(original).every(([file,hash])=>crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,'data',file))).digest('hex')===hash));
})().catch(e=>{results.push({id:'recovery_runner',status:'ERROR',message:e.message});console.error(e.message)}).finally(()=>{
 db.close();const report={date:'2026-11-04',method:'Synthetic SQLite backup/restore and explicit development-server restart; no active-service operations',passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length,errors:results.filter(r=>r.status==='ERROR').length,tests:results};
 fs.writeFileSync(path.join(STATE,'reports',process.argv.includes('--after-restart')?'after-restart.json':'backup-restore.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(`${report.passed} PASS, ${report.failed} FAIL, ${report.errors} ERROR`);process.exitCode=report.failed||report.errors?1:0;
});
