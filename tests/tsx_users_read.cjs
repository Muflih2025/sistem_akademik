'use strict';
const {db,assert,request,login,unchanged}=require('./tsx_admin_helpers.cjs');
(async()=>{
 const admin=await login('uji_admin'),guru=await login('uji_guru');
 let r=await request('/api/users',admin);assert.equal(r.status,200);assert.equal(r.json.success,true);assert(r.json.data.some(u=>u.username==='uji_guru'&&u.nama==='Guru Review Satu'));assert(r.json.data.every(u=>u.id===u.id_user&&!('password'in u)));console.log('PASS users API matches schema and resolves names without password hashes');
 r=await request('/api/users?role=guru',admin);assert(r.json.data.length>0&&r.json.data.every(u=>u.role==='guru'));console.log('PASS role filter');
 r=await request('/api/users?username=uji_admin',admin);assert.equal(r.json.data.length,1);assert.equal(r.json.data[0].username,'uji_admin');console.log('PASS username filter');
 assert.equal((await request('/api/users')).status,401);assert.equal((await request('/api/users',guru)).status,403);console.log('PASS anonymous and non-admin access denied');
 unchanged();console.log('PASS original database unchanged');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.close());
