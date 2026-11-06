'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const state=path.resolve(process.env.SIA_ADMIN_STATE||path.join(os.homedir(),'.local/state/sia-admin-fixes-20261104'));
const base=process.env.SIA_ADMIN_URL||'http://127.0.0.1:18140';
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Explicit loopback URL required');
const fixture=fs.realpathSync(path.join(state,'app/data/sia.db'));
if(fixture.startsWith(root+path.sep))throw Error('Refuse repository database');
const db=new(require('better-sqlite3'))(fixture,{fileMustExist:true});
assert(db.prepare("SELECT 1 FROM guru WHERE nama_guru='Guru Piket Review'").get(),'Synthetic fixture required');
const privateData=JSON.parse(fs.readFileSync(path.join(state,'private.json')));
async function request(url,session,body,extra={}){const r=await fetch(base+url,{redirect:'manual',signal:AbortSignal.timeout(90000),method:body?'POST':'GET',headers:{...(session?{Cookie:session.cookie}:{}),...(body?{'Content-Type':'application/json',Origin:base}:{}),...extra},body:body?JSON.stringify(body):undefined});const bytes=Buffer.from(await r.arrayBuffer());let json;try{json=JSON.parse(bytes.toString())}catch{}return{status:r.status,headers:r.headers,bytes,json};}
async function login(username){const r=await request('/api/auth',null,{username,password:privateData.password});assert.equal(r.status,200,'Fixture login');return{cookie:r.headers.get('set-cookie').split(';')[0],user:r.json.user};}
async function browser(){const cfg=JSON.parse(fs.readFileSync(process.env.SIA_BROWSER_CONFIG||path.join(os.homedir(),'.local/state/sia-academic-dev/20261031/private/runtime.json')));process.env.PLAYWRIGHT_BROWSERS_PATH=cfg.PDF_BROWSERS_PATH;process.env.LD_LIBRARY_PATH=cfg.PDF_LIBRARY_PATH;return require(cfg.PDF_PLAYWRIGHT_PATH).chromium.launch();}
async function context(browser,session){const ctx=await browser.newContext();await ctx.addCookies([{name:'sia_session_token',value:session.cookie.slice(session.cookie.indexOf('=')+1),url:base}]);return ctx;}
function unchanged(){const before=JSON.parse(fs.readFileSync(path.join(state,'reports/original-db-before.json'))),crypto=require('crypto');assert(Object.entries(before).every(([n,h])=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'data',n))).digest('hex')===h),'Original database unchanged');}
module.exports={fs,path,root,state,base,db,assert,request,login,browser,context,unchanged};
