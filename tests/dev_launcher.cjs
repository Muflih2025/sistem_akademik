'use strict';
// End-to-end CLI/HTTP checks; no database writes, seed or migration.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),net=require('node:net');
const {spawn,spawnSync,execFileSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..'),source=process.env.SIA_TEST_CONFIG,inspector=process.env.SIA_TEST_INSPECTOR,results=[];
if(!source||!inspector)throw Error('Explicit private development test config/inspector required');
const original=JSON.parse(fs.readFileSync(source));
if(original.APP_ENV!=='testing'||original.DB_NAME!=='sia_academic_dev_20261031'||!original.DB_SOCKET)throw Error('Refuse non-fixture database');
const check=(v,m='Condition failed')=>{if(!v)throw Error(m);};
const snapshot=()=>execFileSync('php',[ROOT+'/ops/db_snapshot.php',inspector]).toString();
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sia-dev-command-'));fs.chmodSync(tmp,0o700);
const config=path.join(tmp,'runtime.json');
const cfg={...original,SESSION_PATH:path.join(tmp,'sessions'),SECURITY_STATE_PATH:path.join(tmp,'security'),SECURITY_LOG:path.join(tmp,'logs','security.jsonl')};
fs.writeFileSync(config,JSON.stringify(cfg),{mode:0o600});
const env={...process.env,SIA_CONFIG_FILE:config,XDG_STATE_HOME:path.join(tmp,'state')};
const run=(args,custom={})=>spawnSync('pnpm',args,{cwd:ROOT,env:{...env,...custom},encoding:'utf8',timeout:15000});
async function test(name,fn){try{await fn();results.push({test:name,status:'PASS'});console.log('PASS '+name);}catch(e){results.push({test:name,status:'FAIL',error:e.name});console.error('FAIL '+name+': '+e.message);}}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let server,port=18126,serverOutput='';
(async()=>{
 const before=snapshot();
 try{
  await test('pnpm_setup_creates_private_template_and_never_overwrites_existing_config',async()=>{
   const file=path.join(tmp,'new','local.json'),r=run(['dev:setup'],{SIA_CONFIG_FILE:file});check(r.status===0);const data=fs.readFileSync(file);check(JSON.parse(data).DB_USER==='');check(JSON.parse(data).ALLOW_SCHEMA_CHANGES==='0');check((fs.statSync(file).mode&0o077)===0);check(run(['dev:setup'],{SIA_CONFIG_FILE:file}).status===0);check(fs.readFileSync(file).equals(data));
  });
  await test('pnpm_rejects_production_root_repository_config_and_active_service_port',async()=>{
   for(const change of [{APP_ENV:'production'},{DB_USER:'root'},{DB_NAME:'db_sia_smkn2_magelang'}]){const file=path.join(tmp,'refused.json');fs.writeFileSync(file,JSON.stringify({...cfg,...change}),{mode:0o600});const r=run(['dev:check'],{SIA_CONFIG_FILE:file});check(r.status!==0);check(!r.stdout.includes(cfg.DB_PASS)&&!r.stderr.includes(cfg.DB_PASS));}
   check(run(['dev','--port','8085']).status!==0);check(run(['dev:setup'],{SIA_CONFIG_FILE:path.join(ROOT,'config','local-launcher-test.json')}).status!==0);check(!fs.existsSync(path.join(ROOT,'config','local-launcher-test.json')));
  });
  await test('pnpm_dev_check_connects_read_only_without_leaking_credentials',async()=>{
   const r=run(['dev:check']);check(r.status===0,'Preflight failed');check(r.stdout.includes('PASS:'));check(!r.stdout.includes(cfg.DB_PASS)&&!r.stderr.includes(cfg.DB_PASS));check(JSON.stringify(JSON.parse(fs.readFileSync(config)))===JSON.stringify(cfg));check(snapshot()===before);
  });
  await test('pnpm_dev_starts_real_PHP_with_safe_public_router',async()=>{
   // Pick an unused test port without touching the existing 18125 service.
   const probe=net.createServer();await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(0,'127.0.0.1',resolve);});port=probe.address().port;await new Promise(r=>probe.close(r));
   server=spawn('pnpm',['dev','--port',String(port)],{cwd:ROOT,env,detached:true,stdio:['ignore','pipe','pipe']});for(const stream of[server.stdout,server.stderr])stream.on('data',d=>{serverOutput=(serverOutput+d).slice(-65536);});
   let ready=false;for(let i=0;i<100;i++){try{const r=await fetch('http://127.0.0.1:'+port+'/auth/login.php');if(r.status===200&&(await r.text()).includes('Masuk ke akun Anda')){ready=true;break;}}catch{}await sleep(100);}check(ready,'Server did not become ready');check(serverOutput.includes('PHP native'));for(const p of ['/.git/config','/.env','/config/config.php','/ops/dev.cjs','/db_sia_smkn2_magelang.sql'])check((await fetch('http://127.0.0.1:'+port+p)).status===404);
  });
  await test('pnpm_server_real_login_and_role_protected_navigation',async()=>{
   const base='http://127.0.0.1:'+port;let cookie='';const request=async(url,body)=>{const r=await fetch(base+url,{method:body?'POST':'GET',redirect:'manual',headers:{Cookie:cookie,...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{})},body:body?new URLSearchParams(body):undefined});const c=r.headers.get('set-cookie');if(c)cookie=c.split(';')[0];return r;};
   const login=await request('/auth/login.php'),html=await login.text(),token=html.match(/name="csrf_token"[^>]*value="([^"]+)"/);check(token);check(cookie.split('=')[0].endsWith('_'+port),'Parallel development session cookie is not isolated by port');check((await request('/auth/login.php',{username:'uji_admin',password:'password',csrf_token:token[1]})).status===302);const page=await request('/admin/master.php?table=siswa');check(page.status===200);check((await page.text()).includes('sia-sidebar'));check((await request('/absensi?id_jadwal=3&tanggal=2026-10-26')).status===403);
  });
  await test('busy_port_is_reported_without_stopping_existing_server',async()=>{const r=run(['dev','--port',String(port)]);check(r.status!==0);check(r.stderr.includes('sedang dipakai'));check((await fetch('http://127.0.0.1:'+port+'/auth/login.php')).status===200);});
 }finally{
  await test('Ctrl_C_stops_launcher_and_its_PHP_child_only',async()=>{if(server&&server.exitCode===null&&server.signalCode===null){process.kill(-server.pid,'SIGINT');for(let i=0;i<100&&server.exitCode===null&&server.signalCode===null;i++)await sleep(100);}let stopped=false;for(let i=0;i<30;i++){try{await fetch('http://127.0.0.1:'+port+'/auth/login.php');}catch{stopped=true;break;}await sleep(100);}check(stopped,'PHP child still listening');check(server&&(server.exitCode===0||server.exitCode===130||server.signalCode==='SIGINT'),'Launcher did not stop after Ctrl+C');});
  await test('all_database_schema_and_data_remain_identical',async()=>check(snapshot()===before));
 }
 const report={tested_at:new Date().toISOString(),passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length,skipped:0,tests:results};console.log(JSON.stringify(report,null,2));process.exitCode=report.failed?1:0;
 // Generated test files contain private config; remove only this unique temp tree.
 fs.rmSync(tmp,{recursive:true,force:true});
})().catch(e=>{console.error('Launcher test failed: '+e.name);process.exitCode=1;});
