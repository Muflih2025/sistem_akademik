'use strict';
// Orchestrates isolated localhost browser suites and persists evidence in runtime/.
const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(__dirname,'..'),run=fs.mkdtempSync('/tmp/sia-audit-20261106-');
const output=path.join(root,'runtime','local-audit-20261106');fs.mkdirSync(output,{recursive:true,mode:0o700});
const servers=[],summary=[];
const localOnly=process.argv.includes('--local-only');
const extended=process.argv.includes('--extended');
function child(cmd,args,env={}){return new Promise(resolve=>{const p=cp.spawn(cmd,args,{cwd:root,env:{...process.env,...env,NEXT_TELEMETRY_DISABLED:'1'},stdio:'inherit'});p.on('error',e=>{console.error(e.message);resolve(1)});p.on('exit',code=>resolve(code??1));});}
async function server(args,port,cwd=root){const logfile=path.join(output,'server-'+port+'.log'),fd=fs.openSync(logfile,'a',0o600);const p=cp.spawn(process.execPath,args,{cwd,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore',fd,fd]});fs.closeSync(fd);servers.push(p);for(let attempt=0;attempt<120;attempt++){if(p.exitCode!==null)throw Error('Server exited: '+port+'; inspect '+logfile);try{const r=await fetch('http://127.0.0.1:'+port+'/auth/login',{signal:AbortSignal.timeout(1000)});if(r.ok){console.log('READY localhost:'+port);return}}catch{}await new Promise(r=>setTimeout(r,500));}throw Error('Server did not become ready: '+port);}
async function suite(name,state,port){const code=await child(process.execPath,['tests/'+name+'.cjs'],{SIA_ADMIN_STATE:state,SIA_ADMIN_URL:'http://127.0.0.1:'+port});const reports=path.join(state,'reports');for(const file of fs.readdirSync(reports)){if(file.endsWith('.json')&&!file.startsWith('original-db'))fs.copyFileSync(path.join(reports,file),path.join(output,file));}summary.push({suite:name,exit_code:code});return code;}
async function preserve(state){
 const dest=path.join(output,'preserved-fixtures',path.basename(path.dirname(state))+'-'+path.basename(state));
 fs.cpSync(state,dest,{recursive:true,filter:file=>!['.next','node_modules','data'].includes(path.basename(file))});
 const app=path.join(dest,'app');fs.symlinkSync(path.join(root,'node_modules'),path.join(app,'node_modules'),'dir');
 const config=path.join(app,'next.config.ts');fs.writeFileSync(config,fs.readFileSync(config,'utf8').replaceAll(path.join(state,'app'),app));fs.mkdirSync(path.join(app,'data'),{mode:0o700});
 const database=new(require('better-sqlite3'))(path.join(state,'app/data/sia.db'),{readonly:true});try{await database.backup(path.join(app,'data/sia.db'));}finally{database.close();}fs.chmodSync(path.join(app,'data/sia.db'),0o600);
}
(async()=>{
 if(!localOnly)fs.writeFileSync(path.join(output,extended?'fixture-location-extended.txt':'fixture-location.txt'),run+'\n');
 if(extended){
  for(const [folder,port,names,paperless]of [['journal',18163,['tsx_journal_transfer','tsx_daily_journal'],false],['shared',18164,['tsx_shared_journal_bells'],true],['schedule',18165,['tsx_schedule_edit'],false],['supervision',18166,['tsx_evaluation_period','tsx_duty_teaching'],false]]){
   const state=path.join(run,folder);const setup=await child('python3',['tests/tsx_teacher_setup.py','--state',state,'--port',String(port),...(paperless?['--paperless']:[])]);if(setup)throw Error('Fixture setup failed');
   await server([path.join(state,'serve.cjs')],port);for(const name of names)if(await suite(name,state,port))break;
   await preserve(state);
   servers.at(-1).kill('SIGTERM');
  }
  return;
 }
 if(localOnly){
  let ready=false;try{ready=(await fetch('http://127.0.0.1:3000/auth/login')).ok}catch{}
  if(!ready)await server([path.join(root,'node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port','3000'],3000);
  summary.push({suite:'local-roles',exit_code:await child(process.execPath,['tests/tsx_local_role_smoke.cjs'],{SIA_LOCAL_REPORT_DIR:output})});return;
 }
 await server([path.join(root,'node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port','3000'],3000);
 const sm=await child(process.execPath,['tests/tsx_local_role_smoke.cjs'],{SIA_LOCAL_REPORT_DIR:output});summary.push({suite:'local-roles',exit_code:sm});
 for(const [folder,port,names]of [['workflows',18160,['tsx_complete_workflows','tsx_crud_sidebar']],['auth',18161,['tsx_account_access']],['delete',18162,['tsx_admin_popups_delete','tsx_admin_restore']]]){
  const state=path.join(run,folder);const setup=await child('python3',['tests/tsx_teacher_setup.py','--state',state,'--port',String(port)]);if(setup)throw Error('Fixture setup failed');
  await server([path.join(state,'serve.cjs')],port);
  for(const name of names)if(await suite(name,state,port)){console.log('Suite failed; continuing independent checks.');break;}
  await preserve(state);
 }
 const types=await child('pnpm',['exec','tsc','--noEmit','--incremental','false']);summary.push({suite:'typescript',exit_code:types});
 const build=await child('pnpm',['build']);summary.push({suite:'production-build',exit_code:build});
})().catch(e=>{summary.push({suite:'orchestrator',exit_code:1,message:e.stack});console.error(e.stack)}).finally(()=>{fs.writeFileSync(path.join(output,localOnly?'local-summary.json':extended?'extended-summary.json':'summary.json'),JSON.stringify({date:'2026-11-06',fixture_root:run,checks:summary},null,2)+'\n');for(const p of servers){p.kill('SIGTERM');}console.log('Evidence: '+output);process.exitCode=summary.some(s=>s.exit_code)?1:0;});
