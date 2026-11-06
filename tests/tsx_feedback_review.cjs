'use strict';
// Use tsx_teacher_setup.py with an external --state; no school data is modified.
const {fs,path,state,db,assert,request,login,browser,context,base,unchanged}=require('./tsx_admin_helpers.cjs');
const {createHash}=require('crypto');
function add(table,row){db.prepare(`INSERT INTO ${table}(${Object.keys(row).join(',')}) VALUES(${Object.keys(row).map(()=>'?').join(',')})`).run(...Object.values(row).map(String));}
const ok=(r)=>assert.equal(r.status,200,JSON.stringify(r.json));
(async()=>{
 const admin=await login('uji_admin'),guru=await login('uji_guru'),duty=await login('uji_piket'),student=await login('uji_siswa');
 add('tahun_ajaran',{id_tahun_ajaran:'90',tahun_ajaran:'2025/2026',semester:'Genap',status:'Tidak Aktif',dikunci:0,rapor_diterbitkan:0});
 add('ak_periode',{id_tahun_ajaran:'90',mulai:'2026-01-01',selesai:'2026-06-30',hari_efektif:'1,2,3,4,5',terverifikasi:1});
 add('ak_anggota_kelas',{id:'old-review',nis:'9000001',id_kelas:1,id_tahun_ajaran:90,nomor_absen:1,mulai:'2026-01-01',selesai:'2026-06-30'});
 let r=await request('/api/siswa?kind=absensi',student);ok(r);assert.deepEqual(r.json.periods.map(p=>p.id_tahun_ajaran),['1']);
 assert.equal((await request('/api/siswa?kind=absensi&id_tahun_ajaran=90',student)).status,403);
 assert.equal((await request('/api/siswa?kind=absensi&mulai=2027-02-18',student)).status,422);
 for(const month of ['2023-02','2030-01'])assert.equal((await request('/api/kalender?bulan='+month,student)).status,422);
 r=await request('/api/kalender?bulan=2026-11',student);ok(r);assert.deepEqual(r.json.bounds,{min:'2026-07',max:'2026-12'});
 ok(await request('/api/kalender?bulan=2023-02',admin));
 console.log('PASS current student period, date limits and calendar API restrictions');
 r=await request('/api/admin?table=tahun_ajaran',admin);ok(r);const year=r.json.data.find(y=>y.id_tahun_ajaran==='1');
 assert.equal((await request('/api/admin',admin,{...year,table:'tahun_ajaran',action:'update',id:'1',tahun_ajaran:'2030/2031'})).status,422);
 assert.equal((await request('/api/admin',admin,{table:'tahun_ajaran',action:'create',tahun_ajaran:'2030/2031',semester:'Ganjil',status:'Tidak Aktif',dikunci:'0',rapor_diterbitkan:'0'})).status,422);
 console.log('PASS arbitrary school years rejected by server');
 add('ekstrakurikuler',{id_ekskul:'91',nama_ekskul:'Robotika Review',id_guru_pembina:3,pembina:'Guru Piket Review',status:'aktif'});
 add('ekstrakurikuler',{id_ekskul:'92',nama_ekskul:'Seni Review',id_guru_pembina:1,pembina:'Guru Review Satu',status:'aktif'});
 r=await request('/api/ekskul',duty);ok(r);assert.equal(r.json.activities.length,2);assert.equal(r.json.classes.length,2);assert.equal(r.json.schedules.length,0);
 const selection={id_ekskul:'91',id_kelas:'1',id_tahun_ajaran:'1'};
 r=await request('/api/ekskul?'+new URLSearchParams(selection),duty);ok(r);assert.equal(r.json.data.length,2);
 ok(await request('/api/ekskul',duty,{...selection,items:r.json.data.map(m=>({...m,predikat:'Baik',keterangan:'Aktif berkegiatan'}))}));
 assert.equal((await request('/api/ekskul?'+new URLSearchParams({...selection,id_ekskul:'92'}),duty)).status,403);
 console.log('PASS all activity options visible; duty coach saves without teaching schedule; other coaches protected');
 r=await request('/api/nilai?id_jadwal=1',guru);ok(r);
 const grades=r.json.data.map(m=>({...m,nilai_tugas:85,nilai_uts:85,nilai_uas:85,deskripsi:'Mampu merancang solusi dan menguji program.'}));
 ok(await request('/api/nilai',guru,{id_jadwal:'1',id_aturan:r.json.rule.id,items:grades}));
 r=await request('/api/nilai?id_jadwal=1',guru);ok(r);assert(r.json.data.every(m=>m.deskripsi===grades[0].deskripsi));
 // Import clients that omit descriptions must not erase existing comments.
 const preserved=r.json.data.map(({deskripsi,...m})=>m);
 ok(await request('/api/nilai',guru,{id_jadwal:'1',id_aturan:r.json.rule.id,items:preserved,alasan:'Koreksi komponen tanpa menghapus deskripsi'}));
 r=await request('/api/nilai?id_jadwal=1',guru);assert(r.json.data.every(m=>m.deskripsi===grades[0].deskripsi));
 console.log('PASS descriptions saved, reloaded and preserved when omitted');
 const newSchedule={table:'jadwal',action:'create',id_guru:'2',id_mapel:'2',id_kelas:'2',id_tahun_ajaran:'1',hari:'Selasa',jam_mulai:'14:00',jam_selesai:'15:00',ruang:'',status:'aktif',penugasan_mulai:'2026-07-01',penugasan_selesai:'2026-12-31',verifikasi_penugasan:'1'};
 const before=db.prepare('SELECT COUNT(*) n FROM jadwal').get().n;
 assert.equal((await request('/api/admin',admin,{...newSchedule,penugasan_selesai:'2027-02-01'})).status,422);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM jadwal').get().n,before);
 r=await request('/api/admin',admin,newSchedule);ok(r);assert.equal(db.prepare('SELECT terverifikasi FROM ak_penugasan WHERE id_jadwal=?').get(r.json.data.id_jadwal).terverifikasi,'1');
 console.log('PASS schedule and verified assignment saved atomically; invalid dates roll back');
 // Add enough management records to exercise actual page changes.
 for(let i=0;i<25;i++)add('ak_tugas_piket',{id:'feedback-'+i,id_guru:3,id_kelas:1,id_tahun_ajaran:1,mulai:'2026-07-01',selesai:'2026-12-31',aktif:1,boleh_koreksi:0});
 // A real long journal checks line wrapping across pages.
 ok(await request('/api/absensi',guru,{id_jadwal:'1',tanggal:'2026-10-30',pertemuan_ke:1,materi:'Materi panjang. '.repeat(250),tp_atp:'Menguji solusi',kegiatan:'Diskusi dan praktik',refleksi:'Tujuan tercapai',tindak_lanjut:'Latihan mandiri',items:[{nis:'9000001',status:'H'},{nis:'9000002',status:'S'}]}));
 const reportPayload={siswa:{nis:'9000001',nama:'Siswa Review 1',kelas:'XII PPLG 2'},periode:{tahun_ajaran:'2026/2027',semester:'Ganjil'},nilai:[{nama_mapel:'Pemrograman dan Pengembangan Perangkat Lunak',nilai_akhir:'85',predikat:'B',deskripsi:grades[0].deskripsi,versi_aturan:7}],kehadiran_harian:{H:5,S:1,I:0,A:0,B:0}};
 const payload=JSON.stringify(reportPayload);
 add('ak_rapor_snapshot',{id:'feedback-report',nis:'9000001',id_tahun_ajaran:1,id_kelas:1,versi:1,payload_json:payload,payload_hash:createHash('sha256').update(payload).digest('hex')});
 add('ak_rapor_status',{id_snapshot:'feedback-report',status:'diterbitkan',revision:1});
 for(const [name,session,query] of [['nilai',guru,'kind=nilai&id_jadwal=1'],['jurnal',guru,'kind=jurnal&id_jadwal=1&tanggal=2026-10-30'],['rapor',student,'kind=rapor&id=feedback-report'],['absensi',guru,'kind=absensi&id_jadwal=1&mulai=2026-10-01&selesai=2026-10-30']]){
  r=await request('/api/export?format=pdf&'+query,session);ok(r);assert.equal(r.bytes.subarray(0,4).toString(),'%PDF');fs.writeFileSync(path.join(state,'reports',name+'.pdf'),r.bytes);
 }
 r=await request('/api/export?format=csv&kind=rapor&id=feedback-report',student);ok(r);assert(r.bytes.toString().includes('Deskripsi capaian'));assert(!r.bytes.toString().includes('Versi aturan'));
 console.log('PASS grade, journal, report and wide attendance PDFs generated; report columns include description');
 const b=await browser();
 try{
  const errors=[];const ctx=await context(b,admin),p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'/admin/jadwal');await p.getByRole('button',{name:'Tambah Jadwal mengajar',exact:true}).click();
  assert.equal(await p.getByLabel('Penugasan mulai',{exact:true}).inputValue(),'2026-07-01');
  await p.getByLabel('Guru',{exact:true}).selectOption('2');await p.getByLabel('Mata pelajaran',{exact:true}).selectOption('2');await p.getByLabel('Kelas',{exact:true}).selectOption('2');await p.getByLabel('Hari',{exact:true}).selectOption('Rabu');await p.getByLabel('Jam mulai',{exact:true}).fill('14:00');await p.getByLabel('Jam selesai',{exact:true}).fill('15:00');
  const saved=p.waitForResponse(r=>r.url().endsWith('/api/admin')&&r.request().method()==='POST');await p.getByRole('button',{name:'Simpan',exact:true}).click();assert.equal((await saved).status(),200);await p.getByText('Data tersimpan. Daftar telah diperbarui.',{exact:true}).waitFor();
  await p.goto(base+'/admin/penugasan');await p.getByRole('button',{name:'Guru Piket',exact:true}).click();await p.getByRole('navigation',{name:'Halaman tabel'}).waitFor();assert.equal(await p.locator('tbody tr').count(),20);
  await p.getByRole('button',{name:'Berikutnya',exact:true}).click();await p.getByText('Halaman 2 dari 2',{exact:false}).waitFor();assert.equal(await p.locator('tbody tr').count(),6);
  await p.goto(base+'/admin/tahun-ajaran');await p.getByRole('button',{name:'Tambah Tahun ajaran',exact:true}).click();assert(await p.getByLabel('Tahun ajaran (2026/2027)',{exact:true}).isDisabled());assert(await p.getByLabel('Semester',{exact:true}).isDisabled());
  console.log('PASS browser schedule creation, 20-row management pagination and locked year fields');
  const dc=await context(b,duty),dp=await dc.newPage();await dp.goto(base+'/guru/ekskul');await dp.getByLabel('Kegiatan',{exact:true}).locator('option[value="91"]').waitFor({state:'attached'});assert.equal(await dp.getByLabel('Kegiatan',{exact:true}).locator('option').count(),3);await dp.getByLabel('Kelas kegiatan',{exact:true}).selectOption('1/1');await dp.getByLabel('Kegiatan',{exact:true}).selectOption('91');await dp.getByLabel('Predikat kegiatan 9000001',{exact:true}).waitFor();
  const sc=await context(b,student),sp=await sc.newPage();await sp.goto(base+'/siswa/absen');await sp.getByLabel('Periode siswa',{exact:true}).waitFor();assert(await sp.getByLabel('Periode siswa',{exact:true}).isDisabled());assert.equal(await sp.getByLabel('Mulai',{exact:true}).getAttribute('min'),'2026-07-01');await sp.goto(base+'/siswa/kalender');await sp.getByLabel('Bulan',{exact:true}).waitFor();await sp.waitForFunction(()=>document.querySelector('input[type=month]')?.min==='2026-07');
  await sp.goto(base+'/siswa/rapor');await sp.getByRole('button',{name:'Buka rapor',exact:true}).click();await sp.getByRole('columnheader',{name:'Deskripsi capaian',exact:true}).waitFor();assert.equal(await sp.getByRole('columnheader',{name:'Versi aturan',exact:true}).count(),0);
  const gc=await context(b,guru),gp=await gc.newPage();gp.on('pageerror',e=>errors.push(e.message));
  for(const width of [390,1280]){await gp.setViewportSize({width,height:900});await gp.goto(base+'/guru/nilai');await gp.getByLabel('Jadwal mengajar',{exact:true}).locator('option[value="1"]').waitFor({state:'attached'});await gp.getByLabel('Jadwal mengajar',{exact:true}).selectOption('1');await gp.getByLabel('Deskripsi capaian 9000001',{exact:true}).waitFor();assert(await gp.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));await gp.locator('label > span').filter({hasText:'XII PPLG 2 · Mapel Review A'}).waitFor();await gp.screenshot({path:path.join(state,'screenshots','nilai-'+width+'.png'),fullPage:true});}
  await gc.close();
  assert.deepEqual(errors,[]);await ctx.close();await dc.close();await sc.close();
  console.log('PASS duty coach activity UI, student date/calendar bounds, report descriptions and responsive teacher form');
 }finally{await b.close()}
 unchanged();console.log('PASS original school database unchanged');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.close());
