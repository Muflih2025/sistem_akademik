'use strict';
// Portable developer entry point. No sudo, systemd, migration, seed or DB write.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),net=require('node:net');
const {spawn,spawnSync}=require('node:child_process');
const ROOT=fs.realpathSync(path.resolve(__dirname,'..'));
function fail(message){throw new Error(message);}
function outsideProject(target){
  let parent=path.resolve(target),tail=[];
  while(!fs.existsSync(parent)){tail.unshift(path.basename(parent));const next=path.dirname(parent);if(next===parent)break;parent=next;}
  const resolved=path.join(fs.realpathSync(parent),...tail),relative=path.relative(ROOT,resolved);
  if(relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)))fail('Konfigurasi/state privat wajib di luar direktori proyek.');
  return resolved;
}
function privateDirectory(target){
  const resolved=outsideProject(target);
  fs.mkdirSync(resolved,{recursive:true,mode:0o700});
  if(process.platform!=='win32'){
    const stat=fs.statSync(resolved);
    if(stat.uid!==process.getuid()||(stat.mode&0o077)!==0)fail('Direktori state harus milik pengguna ini dengan permission 0700: '+resolved);
  }
  fs.accessSync(resolved,fs.constants.R_OK|fs.constants.W_OK);
  return resolved;
}
function options(args){
  let mode='serve',port=18125;
  for(let i=0;i<args.length;i++){
    const arg=args[i];if(arg==='--')continue;
    if(['--setup','--check','--help'].includes(arg)){if(mode!=='serve')fail('Pilih satu mode saja.');mode=arg.slice(2);}
    else if(arg==='--port'){const value=args[++i];if(!value||!/^\d+$/.test(value))fail('Port harus berupa angka.');port=Number(value);}
    else if(arg.startsWith('--port=')){const value=arg.slice(7);if(!/^\d+$/.test(value))fail('Port harus berupa angka.');port=Number(value);}
    else fail('Argumen tidak dikenal. Gunakan pnpm dev --help.');
  }
  if(!Number.isInteger(port)||port<1024||port>65535||port===8085)fail('Gunakan port 1024–65535 selain port layanan aktif 8085.');
  return {mode,port};
}
async function freePort(port){
  await new Promise((resolve,reject)=>{const probe=net.createServer();probe.once('error',()=>reject(new Error('Port '+port+' sedang dipakai. Gunakan pnpm dev --port '+(port+1)+'; layanan existing tidak dihentikan.')));probe.listen(port,'127.0.0.1',()=>probe.close(resolve));});
}
function readConfig(file){
  let config;try{config=JSON.parse(fs.readFileSync(file,'utf8'));}catch{fail('Konfigurasi JSON tidak dapat dibaca. Periksa file privat tanpa menyalin credential ke terminal.');}
  if(!config||typeof config!=='object'||Array.isArray(config)||Object.values(config).some(v=>typeof v!=='string'))fail('Nilai konfigurasi harus berupa string.');
  if(!['development','testing','staging'].includes(config.APP_ENV))fail('pnpm dev hanya untuk development/testing/staging; konfigurasi produksi ditolak.');
  if(!/(?:^|_)(?:dev|development|local|test|testing|stage|staging)(?:_|$)/i.test(config.DB_NAME||''))fail('Gunakan database development terpisah dengan nama bertanda local/dev/testing/staging.');
  if(!config.DB_USER||config.DB_USER.toLowerCase()==='root')fail('Isi DB_USER dengan akun runtime non-root untuk database development.');
  if(config.ALLOW_SCHEMA_CHANGES!=='0')fail('Akun runtime harus memakai ALLOW_SCHEMA_CHANGES="0".');
  if(!config.DB_SOCKET&&!['127.0.0.1','localhost','::1'].includes(config.DB_HOST||'127.0.0.1'))fail('Server development ini hanya menerima database lokal atau Unix socket.');
  return config;
}
async function main(){
  const args=options(process.argv.slice(2));
  if(args.mode==='help'){console.log('pnpm dev                 Jalankan website di http://127.0.0.1:18125\npnpm dev --port 18126    Pilih port localhost lain\npnpm dev:setup           Buat template konfigurasi privat, tanpa database write\npnpm dev:check           Periksa PHP, konfigurasi dan skema secara baca-saja\nPanduan: docs/DEVELOPMENT.md');return;}
  if(process.getuid&&process.getuid()===0)fail('Jalankan sebagai pengguna biasa, bukan root/sudo.');
  const configBase=process.env.XDG_CONFIG_HOME||path.join(os.homedir(),'.config');
  const file=outsideProject(process.env.SIA_CONFIG_FILE||path.join(configBase,'sia-akademik','local.json'));
  if(!fs.existsSync(file)){
    privateDirectory(path.dirname(file));
    const state=privateDirectory(path.join(process.env.XDG_STATE_HOME||path.join(os.homedir(),'.local','state'),'sia-akademik'));
    const config={APP_ENV:'development',DB_HOST:'127.0.0.1',DB_PORT:'3306',DB_SOCKET:'',DB_NAME:'sia_local',DB_USER:'',DB_PASS:'',ALLOW_SCHEMA_CHANGES:'0',ACADEMIC_WORKFLOWS:'1',FRIENDLY_ROUTES:'1',ADMIN_BULK_ONLY:'1',ROOM_CATALOG_ENFORCED:'1',HOMEROOM_MODE:'informational',SESSION_NAME:'SIA_LOCAL',SESSION_PATH:path.join(state,'sessions'),SECURITY_STATE_PATH:path.join(state,'security'),SECURITY_LOG:path.join(state,'logs','security.jsonl'),COOKIE_SECURE:'0'};
    for(const name of ['sessions','security','logs','uploads'])privateDirectory(path.join(state,name));
    fs.writeFileSync(file,JSON.stringify(config,null,2)+'\n',{flag:'wx',mode:0o600});
    console.log('Template konfigurasi privat dibuat: '+file+'\nIsi koneksi database development dan akun runtime non-root, lalu jalankan pnpm dev.\nTidak ada database yang dibuat, diimpor, di-reset, atau diubah. Panduan: docs/DEVELOPMENT.md');
    if(args.mode!=='setup')process.exitCode=2;return;
  }
  if(process.platform!=='win32'){
    const stat=fs.statSync(file);
    if(!stat.isFile()||stat.uid!==process.getuid()||(stat.mode&0o077)!==0)fail('Konfigurasi harus file privat milik pengguna ini dengan permission 0600.');
  }
  if(args.mode==='setup'){console.log('Konfigurasi sudah ada, tidak ditimpa: '+file);return;}
  const config=readConfig(file);
  const sessions=privateDirectory(config.SESSION_PATH||path.join(path.dirname(file),'sessions'));
  const security=privateDirectory(config.SECURITY_STATE_PATH||path.join(path.dirname(file),'security'));
  const logs=privateDirectory(path.dirname(config.SECURITY_LOG||path.join(path.dirname(file),'logs','security.jsonl')));
  const uploads=privateDirectory(path.join(logs,'uploads'));
  const php=process.env.PHP_BINARY||'php',env={...process.env};
  // Use exactly the selected config; unrelated shell overrides cannot switch DBs.
  for(const name of Object.keys(env))if(name.startsWith('SIA_'))delete env[name];
  Object.assign(env,{SIA_CONFIG_FILE:file,SIA_ALLOW_SCHEMA_CHANGES:'0',SIA_SESSION_PATH:sessions,SIA_SECURITY_STATE_PATH:security,SIA_SECURITY_LOG:config.SECURITY_LOG||path.join(logs,'security.jsonl')});
  const probe=spawnSync(php,[path.join(ROOT,'ops','dev_check.php')],{cwd:ROOT,env,encoding:'utf8'});
  if(probe.error)fail('PHP CLI belum tersedia. Pasang PHP 8.1+ dan ekstensi pdo_mysql, mbstring, dom, zip.');
  if(probe.status!==0){let code='unavailable';try{code=JSON.parse(probe.stdout).reason;}catch{}fail('Pemeriksaan lokal gagal ('+code+'). Periksa koneksi/akun runtime dan skema development. Detail: docs/DEVELOPMENT.md. Credential tidak ditampilkan.');}
  if(args.mode==='check'){console.log('PASS: PHP, konfigurasi privat, koneksi runtime dan tabel akademik tersedia. Pemeriksaan baca-saja; tidak ada migration/seed.');return;}
  await freePort(args.port);
  // Cookies are shared across ports by browsers; keep parallel dev logins apart.
  env.SIA_SESSION_NAME=(/^[A-Za-z][A-Za-z0-9_]{0,60}$/.test(config.SESSION_NAME||'')?config.SESSION_NAME:'SIA_LOCAL')+'_'+args.port;
  console.log('SIA development: http://127.0.0.1:'+args.port+'/auth/login.php\nPHP native · document root public/ · localhost saja\nCtrl+C untuk berhenti. Tidak ada migration/seed otomatis.');
  const child=spawn(php,['-d','display_errors=0','-d','log_errors=1','-d','error_log='+path.join(logs,'php-errors.log'),'-d','upload_tmp_dir='+uploads,'-d','upload_max_filesize=5M','-d','post_max_size=6M','-d','max_input_vars=2000','-S','127.0.0.1:'+args.port,'-t',path.join(ROOT,'public'),path.join(ROOT,'public','index.php')],{cwd:ROOT,env,stdio:'inherit'});
  const stop=signal=>{if(!child.killed)child.kill(signal);};
  process.once('SIGINT',()=>stop('SIGINT'));process.once('SIGTERM',()=>stop('SIGTERM'));
  child.once('error',()=>{console.error('Server PHP gagal dijalankan.');process.exitCode=1;});
  child.once('exit',(code,signal)=>{process.exitCode=['SIGINT','SIGTERM'].includes(signal)?0:code??1;});
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
