'use strict';
const {db,assert,login,browser,context,base,unchanged}=require('./tsx_admin_helpers.cjs');
(async()=>{
 const admin=await login('uji_admin'),b=await browser();
 try{const ctx=await context(b,admin),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/unique.*key|same key|hydration/i.test(m.text()))errors.push(m.text());});
 await p.goto(base+'/admin/jadwal');await p.getByRole('heading',{name:'Mapel Review A',exact:true}).first().waitFor();assert((await p.locator('main').innerText()).includes('XII PPLG 2'));assert((await p.locator('main').innerText()).includes('Guru Review Satu'));assert((await p.locator('main').innerText()).includes('ID #1'));console.log('PASS schedule subject/class/teacher and identity match API');
 await p.getByRole('link',{name:'Master Data',exact:true}).click();await p.getByRole('heading',{name:'Master Data Akademik',exact:true}).waitFor();assert.equal(errors.length,0,errors.join('\n'));console.log('PASS client navigation retains no key or hydration issues');await ctx.close();
 }finally{await b.close()}
 unchanged();console.log('PASS original database unchanged');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.close());
