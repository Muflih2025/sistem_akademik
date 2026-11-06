'use strict';
// External fixture; may run after tsx_journal_transfer.cjs.
const {fs,path,state,base,db,assert,request,login,browser,context,unchanged}=require('./tsx_admin_helpers.cjs');
const cp=require('child_process'),os=require('os');let b;const tests=[];const pass=id=>{tests.push({id,status:'PASS'});console.log('PASS '+id)};
const query=(extra={})=>new URLSearchParams({scope:'kelas',id_kelas:'1',id_tahun_ajaran:'1',mulai:'2026-11-02',selesai:'2026-11-02',...extra}).toString();
const records=t=>JSON.stringify(db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all());
const python=process.env.SIA_PDF_PYTHON||path.join(os.homedir(),'.local/state/sia-pdf-inspection/venv/bin/python');
function pages(bytes){return JSON.parse(cp.execFileSync(python,['-c','import sys,io,json;from pypdf import PdfReader;print(json.dumps([p.extract_text() for p in PdfReader(io.BytesIO(sys.stdin.buffer.read())).pages]))'],{input:bytes,encoding:'utf8'}));}
async function get(url,user,status=200){const r=await request(url,user);assert.equal(r.status,status,JSON.stringify(r.json));return r;}
function put(table,row){db.prepare(`INSERT INTO ${table}(${Object.keys(row).join(',')}) VALUES(${Object.keys(row).map(()=>'?')})`).run(...Object.values(row).map(String));}
(async()=>{
 const admin=await login('uji_admin'),guru=await login('uji_guru'),head=await login('uji_kepsek'),student=await login('uji_siswa');
 const untouched=['ak_absensi_sesi','ak_absensi_harian','ak_nilai'].map(records);
 db.prepare("UPDATE jadwal SET status='nonaktif' WHERE id_jadwal='4'").run();
 for(let i=4;i<=5;i++)put('guru',{id_guru:i,nama_guru:'Guru Harian '+i,status:'aktif'});
 for(let i=3;i<=6;i++)put('mata_pelajaran',{id_mapel:i,kode_mapel:'DAILY-'+i,nama_mapel:'Mapel Harian '+i,kkm:75,status:'aktif'});
 for(let i=0;i<7;i++){
  const id=String(100+i),hour=String(i<5?7+i:13+i-5).padStart(2,'0'),teacher=[1,2,3,1,4,5,2][i];
  put('jadwal',{id_jadwal:id,id_guru:teacher,id_mapel:i<6?i+1:2,id_kelas:i===6?2:1,id_tahun_ajaran:1,hari:'Senin',jam_mulai:hour+':00',jam_selesai:hour+':40',status:'aktif',ruang:'A1'});
  put('ak_penugasan',{id_jadwal:id,mulai:'2026-07-01',selesai:'2026-12-31',terverifikasi:1});
  const r=await request('/api/jurnal',guru,{scope:'kelas',id_jadwal:id,id_kelas:i===6?'2':'1',id_tahun_ajaran:'1',tanggal:'2026-11-02',pertemuan_ke:1,jam_ke:String(i+1),materi:'Materi sesi '+(i+1),konfirmasi:true});assert.equal(r.status,200,JSON.stringify(r.json));
 }
 let r=await get('/api/jurnal?'+query({transfer:'1'}),guru);assert.equal(r.json.data.length,6);assert.equal(r.json.data.filter(x=>x.id_guru==='1').length,2);assert.equal(new Set(r.json.data.map(x=>x.id_mapel)).size,6);
 r=await get('/api/jurnal?'+query({transfer:'1',id_guru:'1'}),head);assert.equal(r.json.data.length,2);
 await get('/api/jurnal?'+query({transfer:'1',id_guru:'999'}),head,422);await get('/api/jurnal?'+query({transfer:'1',id_guru:'5',id_kelas:'2'}),head,422);await get('/api/export?'+query({kind:'jurnal',format:'pdf'}),student,403);
 pass('DAILY_six_sessions_six_subjects_repeated_teacher_and_validated_optional_teacher_filter');
 const pdf=await get('/api/export?'+query({kind:'jurnal',format:'pdf'}),head);fs.writeFileSync(path.join(state,'reports/daily-six-sessions.pdf'),pdf.bytes);let text=pages(pdf.bytes);assert.equal(text.length,1,'Six ordinary sessions fit in one daily table');let flat=text[0].replace(/\s+/g,' ');assert(flat.includes('Senin, 02-11-2026'));for(let i=1;i<=6;i++)assert(flat.includes('Materi sesi '+i));assert(!flat.includes('Materi sesi 7'));assert.equal((flat.match(/Guru Review Satu/g)||[]).length,2);assert(flat.indexOf('Materi sesi 1')<flat.indexOf('Materi sesi 4'));
 const filtered=pages((await get('/api/export?'+query({kind:'jurnal',format:'pdf',id_guru:'1'}),guru)).bytes).join(' ');assert(filtered.includes('Materi sesi 1')&&filtered.includes('Materi sesi 4')&&!filtered.includes('Materi sesi 2'));
 pass('PDF_actual_single_page_contains_all_six_ordered_sessions_and_keeps_two_rows_for_same_teacher');
 let saved=(await request('/api/jurnal',guru,{scope:'kelas',id_jadwal:'100',id_kelas:'1',id_tahun_ajaran:'1',tanggal:'2026-10-26',pertemuan_ke:2,materi:'Hari sebelumnya',konfirmasi:true}));assert.equal(saved.status,200);
 const range=pages((await get('/api/export?'+query({kind:'jurnal',format:'pdf',scope:'seluruh',id_kelas:'',mulai:'2026-10-26',hari:'Senin'}),head)).bytes);assert.equal(range.length,3);assert(range[0].includes('26-10-2026'));assert(range[1].includes('XII PPLG 1'));assert(range[2].includes('XII PPLG 2'));
 const meeting=db.prepare("SELECT * FROM ak_pertemuan WHERE id_jadwal='100' AND tanggal='2026-11-02'").get();const longText=Array.from({length:150},(_,i)=>'Baris panjang '+String(i).padStart(3,'0')).join('\n');let updated=await request('/api/jurnal',guru,{...meeting,scope:'kelas',konfirmasi:true,materi:longText,alasan:'Uji sambungan halaman'});assert.equal(updated.status,200,JSON.stringify(updated.json));
 const longPdf=(await get('/api/export?'+query({kind:'jurnal',format:'pdf'}),head)).bytes;fs.writeFileSync(path.join(state,'reports/daily-long.pdf'),longPdf);text=pages(longPdf);assert(text.length>1);for(const page of text){assert(page.includes('02-11-2026'));assert(page.includes('Mapel'));}assert(text.join(' ').includes('Baris panjang 149'));for(let i=2;i<=6;i++)assert(text.join(' ').includes('Materi sesi '+i));
 pass('PDF_class_date_groups_separate_and_long_content_keeps_daily_heading_and_table_header_on_continuations');
 b=await browser();const ctx=await context(b,guru),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));try{
  await p.goto(base+'/guru/jurnal');await p.getByRole('button',{name:'Ekspor jurnal',exact:true}).click();await p.getByLabel('Kelas transfer jurnal',{exact:true}).selectOption('1');await p.getByLabel('Tanggal jurnal',{exact:true}).fill('2026-11-02');await p.getByText('6 jurnal sesuai pilihan.',{exact:true}).waitFor();assert.equal(await p.getByLabel('Guru jurnal',{exact:true}).inputValue(),'');await p.getByRole('heading',{name:'XII PPLG 2 · Senin, 02-11-2026',exact:true}).waitFor();
  await p.getByLabel('Guru jurnal',{exact:true}).selectOption('1');await p.getByText('2 jurnal sesuai pilihan.',{exact:true}).waitFor();const download=p.waitForEvent('download');await p.getByRole('button',{name:'Unduh Jurnal PDF',exact:true}).click();const file=await download;assert.equal(await file.failure(),null);assert(!pages(fs.readFileSync(await file.path())).join(' ').includes('Materi sesi 2'));
  await p.getByLabel('Kelas transfer jurnal',{exact:true}).selectOption('2');assert.equal(await p.getByLabel('Guru jurnal',{exact:true}).inputValue(),'');await p.getByText('1 jurnal sesuai pilihan.',{exact:true}).waitFor();
  for(const width of [320,390,1440]){await p.setViewportSize({width,height:900});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));const rect=await p.getByRole('dialog').boundingBox();assert(rect.x>=0&&rect.x+rect.width<=width+1);}
  await p.setViewportSize({width:390,height:900});await p.screenshot({path:path.join(state,'screenshots/daily-journal-popup-mobile.png')});assert.deepEqual(errors,[]);
 }finally{await ctx.close();}
 assert.deepEqual(['ak_absensi_sesi','ak_absensi_harian','ak_nilai'].map(records),untouched);unchanged();pass('BROWSER_grouped_preview_teacher_filter_real_pdf_download_filter_reset_mobile_and_attendance_integrity');
})().catch(e=>{tests.push({id:'daily-journal',status:'FAIL',message:e.stack});console.error(e.stack)}).finally(async()=>{if(b)await b.close();db.close();const report={passed:tests.filter(t=>t.status==='PASS').length,failed:tests.filter(t=>t.status==='FAIL').length,tests};fs.writeFileSync(path.join(state,'reports/daily-journal.json'),JSON.stringify(report,null,2)+'\n');console.log(`${report.passed} PASS, ${report.failed} FAIL`);process.exitCode=report.failed?1:0;});
