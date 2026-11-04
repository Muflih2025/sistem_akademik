'use strict';
const ExcelJS=require('exceljs');
const {db,assert,request,login,browser,context,base,unchanged}=require('./tsx_admin_helpers.cjs');
const seed=String(require('crypto').randomInt(100000,999999)),nis='001'+seed;
const headers=['nis','nama_siswa','jenis_kelamin','tanggal_lahir','id_kelas','alamat'];
async function workbook(data){const w=new ExcelJS.Workbook(),s=w.addWorksheet('Data');s.addRow(headers);data.forEach(r=>s.addRow(r));return Buffer.from(await w.xlsx.writeBuffer());}
(async()=>{
 const admin=await login('uji_admin'),guru=await login('uji_guru');
 const bytes=await workbook([[nis,'Siswa Impor '+seed,'P','2009-01-01','1','Alamat sintetis']]);
 const input={module:'siswa',filename:'siswa.xlsx',content:bytes.toString('base64')};
 let r=await request('/api/impor?module=siswa&format=xlsx',admin);assert.equal(r.status,200);assert.equal(r.bytes.subarray(0,2).toString(),'PK');const template=new ExcelJS.Workbook();await template.xlsx.load(r.bytes);assert.deepEqual(template.worksheets[0].getRow(1).values.slice(1),headers);console.log('PASS real XLSX template has expected headers');
 assert.equal((await request('/api/impor',null,input)).status,401);assert.equal((await request('/api/impor',guru,input)).status,403);console.log('PASS import requires admin');
 const before=db.prepare('SELECT COUNT(*) n FROM siswa').get().n;
 r=await request('/api/impor',admin,input);assert.equal(r.status,200,JSON.stringify(r.json));assert.equal(r.json.data.data[0].nis,nis);assert.equal(db.prepare('SELECT COUNT(*) n FROM siswa').get().n,before);const preview=r.json.data;
 assert.equal((await request('/api/impor',admin,{action:'commit',token:preview.token,konfirmasi:false})).status,422);r=await request('/api/impor',admin,{action:'commit',token:preview.token,konfirmasi:true});assert.equal(r.status,200,JSON.stringify(r.json));assert.equal(db.prepare('SELECT nama_siswa FROM siswa WHERE nis=?').get(nis).nama_siswa,'Siswa Impor '+seed);assert.equal((await request('/api/impor',admin,{action:'commit',token:preview.token,konfirmasi:true})).status,409);console.log('PASS preview writes nothing, confirmation persists, replay denied and leading-zero NIS preserved');
 const rollbackNis='002'+seed,bad=await workbook([[rollbackNis,'Rollback Siswa','L','2009-01-01','1',''],['9000001','Duplicate','L','2009-01-01','1','']]);
 r=await request('/api/impor',admin,{...input,content:bad.toString('base64')});assert.equal(r.status,409);assert(!db.prepare('SELECT 1 FROM siswa WHERE nis=?').get(rollbackNis));console.log('PASS invalid second row rolls back the entire preview');
 r=await request('/api/impor',admin,{...input,filename:'siswa.xls'});assert.equal(r.status,422);console.log('PASS unsupported legacy XLS returns actionable error');
 const b=await browser();try{const ctx=await context(b,admin),p=await ctx.newPage(),uiNis='003'+seed,ui=await workbook([[uiNis,'Siswa Browser '+seed,'L','2009-01-01','1','']]);await p.goto(base+'/admin/bulk-upload');const chooser=p.waitForEvent('filechooser');await p.getByRole('button',{name:'Pilih Berkas Excel',exact:true}).click();await(await chooser).setFiles({name:'uji-browser.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:ui});await p.getByRole('heading',{name:'Preview: 1 data valid',exact:true}).waitFor();assert(!db.prepare('SELECT 1 FROM siswa WHERE nis=?').get(uiNis));await p.getByRole('checkbox').check();await p.getByRole('button',{name:'Konfirmasi Impor',exact:true}).click();await p.locator('[data-status=success]').waitFor();assert(db.prepare('SELECT 1 FROM siswa WHERE nis=?').get(uiNis));console.log('PASS file chooser, real browser XLSX upload, preview and confirm');await ctx.close();}finally{await b.close()}
 unchanged();console.log('PASS original database unchanged');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.close());
