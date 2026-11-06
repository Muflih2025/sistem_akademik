'use strict';
const {db,assert,request,login,browser,context,base,unchanged}=require('./tsx_admin_helpers.cjs');
(async()=>{
 const admin=await login('uji_admin'),b=await browser();
 try{const ctx=await context(b,admin),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/unique.*key|same key|hydration/i.test(m.text()))errors.push(m.text());});
 const response=await request('/api/admin?table=jadwal',admin);assert.equal(response.status,200);assert(response.json.data.some(r=>r.id_jadwal==='1'&&r.id_mapel==='1'&&r.id_kelas==='1'&&r.id_guru==='1'));
 await p.goto(base+'/admin/jadwal');const row=p.getByRole('row').filter({has:p.getByRole('cell',{name:'Mapel Review A',exact:true})}).filter({has:p.getByRole('cell',{name:'Jumat',exact:true})}).first();await row.waitFor();await row.getByRole('cell',{name:'XII PPLG 2',exact:true}).waitFor();await row.getByRole('cell',{name:'Guru Review Satu',exact:true}).waitFor();console.log('PASS schedule subject/class/teacher and identity match API');
 await p.getByRole('link',{name:'Master Data',exact:true}).click();await p.getByRole('heading',{name:'Master Data Akademik',exact:true}).waitFor();await p.getByRole('button',{name:'Tambah Siswa',exact:true}).waitFor();await p.getByRole('link',{name:'Akademik',exact:true}).click();await p.getByRole('link',{name:'Kelola Jadwal',exact:true}).click();await p.getByRole('heading',{name:'Jadwal mengajar',exact:true}).waitFor();await row.waitFor();assert.equal(errors.length,0,errors.join('\n'));console.log('PASS client navigation retains no key or hydration issues');await ctx.close();
 }finally{await b.close()}
 unchanged();console.log('PASS original database unchanged');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.close());
