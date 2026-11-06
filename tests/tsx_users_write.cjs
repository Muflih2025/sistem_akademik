'use strict';
const {db,assert,request,login,browser,context,base,unchanged}=require('./tsx_admin_helpers.cjs');
const nonce=require('crypto').randomBytes(4).toString('hex');
(async()=>{
 const admin=await login('uji_admin'),guru=await login('uji_guru');
 let list=(await request('/api/users',admin)).json.data,primary=list.find(u=>u.username==='uji_admin');
 assert.equal((await request('/api/users',admin,{...primary,action:'deactivate'})).status,409);console.log('PASS last active admin protected');
 const input={username:'api_admin_'+nonce,role:'admin',id_referensi:'',status:'aktif',password:'Synthetic-password-27'};
 assert.equal((await request('/api/users',null,input)).status,401);assert.equal((await request('/api/users',guru,input)).status,403);
 assert.equal((await request('/api/users',admin,input,{Origin:'https://example.invalid'})).status,403);console.log('PASS user creation requires admin and same origin');
 let r=await request('/api/users',admin,input);assert.equal(r.status,200);assert(r.json.data.id_user);const saved=r.json.data;assert(!('password'in saved));assert(require('bcryptjs').compareSync(input.password,db.prepare('SELECT password FROM users WHERE id_user=?').get(saved.id_user).password));console.log('PASS create persists a hashed password');
 assert.equal((await request('/api/users',admin,input)).status,409);assert.equal((await request('/api/users',admin,{...input,username:'weak_'+nonce,password:'short'})).status,422);assert.equal((await request('/api/users',admin,{...input,username:'ref_'+nonce,role:'guru',id_referensi:'missing'})).status,422);console.log('PASS duplicate, weak password and invalid reference rejected');
 r=await request('/api/users',admin,{...saved,action:'deactivate'});assert.equal(r.status,200);assert.equal((await request('/api/users',admin,{...saved,action:'activate'})).status,409);console.log('PASS persisted status and stale edit rejected');
 const b=await browser();try{const ctx=await context(b,admin),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'/admin/users');await p.getByRole('button',{name:/^(Tambah Pengguna|Tambah akun)$/}).click();await p.getByLabel(/^Username(?: akun)?$/).fill('ui_admin_'+nonce);await p.getByLabel(/^Peran(?: akun)?$/).selectOption('admin');await p.getByLabel(/^Password(?: akun)?$/).fill(input.password);await p.getByRole('button',{name:/^Simpan akun$/i}).click();await p.getByRole('status').filter({hasText:/Akun tersimpan/}).waitFor();await p.reload();await p.getByRole('cell',{name:'ui_admin_'+nonce,exact:true}).first().waitFor();assert.equal(errors.length,0,errors.join('\n'));console.log('PASS browser add account and reload without client errors');await ctx.close();}finally{await b.close()}
 unchanged();console.log('PASS original database unchanged');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.close());
