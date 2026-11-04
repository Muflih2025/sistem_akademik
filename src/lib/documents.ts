import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { AuthUser } from './auth';
import { Row, schedules, schedule, roster, dutySummary, dateValue } from './academic';
import { rows, fail, role, today, text } from './store';
import { readReport } from './reports';
import { studentData } from './students';
import { listCatalog } from './admin';
import { importTemplate } from './imports';
export interface DocumentTable { title:string;headers:string[];data:unknown[][] }
const statuses=['H','S','I','A','B'];
export function dateRange(q:URLSearchParams) {
  const from=dateValue(q.get('mulai')||q.get('tanggal')||today()),until=dateValue(q.get('selesai')||from);if(from>until||(Date.parse(until)-Date.parse(from))/86400000>62)fail('Pilih rentang berurutan, maksimal 63 hari.');const dates:string[]=[];for(let d=from;d<=until;d=new Date(Date.parse(d+'T00:00:00Z')+86400000).toISOString().slice(0,10))dates.push(d);return dates;
}
export function documentTable(user:AuthUser,q:URLSearchParams):DocumentTable {
  const kind=q.get('kind')||'nilai';
  if(kind==='template'){const t=importTemplate(user,Object.fromEntries(q.entries()));return{title:'Template '+q.get('module'),headers:t.headers,data:t.data.map(r=>t.headers.map(h=>r[h]))};}
  if(kind==='master'){const t=listCatalog(user,q.get('table')||'siswa','',1000);const fields=t.definition.fields.filter(f=>f.type!=='password');return {title:t.definition.label,headers:fields.map(f=>f.key),data:t.data.map(r=>fields.map(f=>r[f.key]))};}
  if(kind==='rapor'){
    const r=readReport(user,text(q.get('id'),'ID rapor')),p=r.payload;
    return {title:`Rapor ${p.siswa.nama} (${p.siswa.nis}) — ${p.periode.tahun_ajaran} ${p.periode.semester} — ${r.status}`,headers:['Mata pelajaran','Nilai akhir','Predikat','Versi aturan'],data:[...p.nilai.map((n:Row)=>[n.nama_mapel,n.nilai_akhir,n.predikat,n.versi_aturan]),['','','',''],['Kehadiran harian','','',''],...statuses.map(s=>[s,p.kehadiran_harian[s],null,null])]};
  }
  if(kind==='piket') {
    const dates=dateRange(q);const summaries=dates.map(date=>({date,...dutySummary(user,date,q.get('id_kelas'))}));const pupils=new Map<string,Row>();for(const s of summaries)for(const c of s.data)for(const m of c.students)pupils.set(`${c.id_tahun_ajaran}/${c.id_kelas}/${m.nis}`,{...m,...c});
    return {title:'Matriks absensi harian sekolah',headers:['NIS','Nama siswa','Kelas',...dates,...statuses.map(s=>'Total '+s)],data:[...pupils.values()].map(m=>{const values=summaries.map(s=>s.data.find(c=>c.id_kelas===m.id_kelas&&c.id_tahun_ajaran===m.id_tahun_ajaran)?.students.find((x:Row)=>x.nis===m.nis)?.status||'B');return[m.nis,m.nama_siswa,m.nama_kelas,...values,...statuses.map(s=>values.filter(x=>x===s).length)];})};
  }
  if(kind==='jadwal') {
    const data=user.role==='siswa'?studentData(user,new URLSearchParams({...Object.fromEntries(q),kind:'jadwal'})).data:schedules(user);
    return{title:'Jadwal pelajaran',headers:['Hari','Mulai','Selesai','Kelas','Mata pelajaran','Guru','Ruang'],data:data.map(j=>[j.hari,j.jam_mulai,j.jam_selesai,j.nama_kelas,j.nama_mapel,j.nama_guru,j.ruang])};
  }
  if(kind==='nilai') {
    role(user,'admin','guru','kepala_sekolah');const allowed=q.get('id_jadwal')?[schedule(user,q.get('id_jadwal'))]:schedules(user);const gradeRows=rows('SELECT n.*,s.nama_siswa,m.nama_mapel,k.nama_kelas FROM ak_nilai n JOIN siswa s ON s.nis=n.nis JOIN mata_pelajaran m ON m.id_mapel=n.id_mapel JOIN kelas k ON k.id_kelas=n.id_kelas ORDER BY n.nis,n.id_mapel').filter(n=>allowed.some(j=>j.id_tahun_ajaran===n.id_tahun_ajaran&&j.id_kelas===n.id_kelas&&j.id_guru===n.id_guru&&j.id_mapel===n.id_mapel));
    return {title:'Rekap nilai akademik',headers:['NIS','Nama siswa','Kelas','Mapel','Nilai akhir','Predikat'],data:gradeRows.map(n=>[n.nis,n.nama_siswa,n.nama_kelas,n.nama_mapel,n.nilai_akhir,n.predikat])};
  }
  if(['jurnal','agenda','absensi'].includes(kind)) {
    const allowed=q.get('id_jadwal')?[schedule(user,q.get('id_jadwal'))]:schedules(user);const dates=dateRange(q);
    if(kind==='absensi') {
      if(allowed.length!==1)fail('Pilih satu jadwal untuk daftar hadir.');const j=allowed[0];
      const records=rows('SELECT a.*,p.tanggal FROM ak_absensi_sesi a JOIN ak_pertemuan p ON p.id=a.id_pertemuan WHERE p.id_jadwal=? AND p.tanggal BETWEEN ? AND ?',j.id_jadwal,dates[0],dates.at(-1));
      return{title:`Daftar hadir sesi — ${j.nama_kelas} — ${j.nama_mapel}`,headers:['No','NIS','Nama siswa','L/P',...dates,...statuses.map(s=>'Total '+s)],data:roster(j).map(m=>{const codes=dates.map(date=>records.find(r=>r.nis===m.nis&&r.tanggal===date)?.status||'B');return[m.nomor_absen,m.nis,m.nama_siswa,m.jenis_kelamin,...codes,...statuses.map(s=>codes.filter(c=>c===s).length)];})};
    }
    const meetings=rows('SELECT * FROM ak_pertemuan WHERE tanggal BETWEEN ? AND ? ORDER BY tanggal,jam_ke',dates[0],dates.at(-1)).filter(p=>allowed.some(j=>j.id_jadwal===p.id_jadwal&&j.id_guru===p.id_guru&&j.id_kelas===p.id_kelas&&j.id_tahun_ajaran===p.id_tahun_ajaran));
    return {title:kind==='jurnal'?'Jurnal kelas':'Agenda harian guru',headers:['Tanggal','Jam','Pertemuan','Guru','Kelas','Mapel','TP / ATP','Materi','Kegiatan','Refleksi','Tindak lanjut','Catatan','Guru pengganti','Siswa tidak hadir / belum dikonfirmasi'],data:meetings.map(p=>{const j=allowed.find(j=>j.id_jadwal===p.id_jadwal)!;const absent=rows("SELECT nama_snapshot,status,keterangan FROM ak_absensi_sesi WHERE id_pertemuan=? AND status<>'H' ORDER BY CAST(nomor_absen AS INTEGER)",p.id).map(r=>`${r.nama_snapshot}: ${r.status}${r.keterangan?' ('+r.keterangan+')':''}`).join('; ');const g=p.id_guru_pengganti?rows('SELECT nama_guru FROM guru WHERE id_guru=?',p.id_guru_pengganti)[0]?.nama_guru:'';return[p.tanggal,p.jam_ke,p.pertemuan_ke,j.nama_guru,j.nama_kelas,j.nama_mapel,p.tp_atp,p.materi,p.kegiatan,p.refleksi,p.tindak_lanjut,p.catatan,g,absent];})};
  }
  fail('Jenis dokumen tidak dikenal.',404);
}
const safeCell=(v:unknown)=>{const s=v==null?'':String(v);return /^[=+@\-\t\r]/.test(s)?"'"+s:s;};
export async function renderDocument(table:DocumentTable,format:string) {
  if(format==='csv')return{bytes:Buffer.from('\uFEFF'+[table.headers,...table.data].map(row=>row.map(v=>'"'+safeCell(v).replace(/"/g,'""')+'"').join(',')).join('\r\n')),'type':'text/csv; charset=utf-8',extension:'csv'};
  if(format==='xlsx') {
    const workbook=new ExcelJS.Workbook();workbook.creator='SIA Akademik';const sheet=workbook.addWorksheet('Data');sheet.addRow(table.headers);table.data.forEach(r=>sheet.addRow(r.map(safeCell)));sheet.getRow(1).font={bold:true};sheet.views=[{state:'frozen',ySplit:1}];sheet.columns.forEach(c=>{c.width=22;});sheet.autoFilter={from:{row:1,column:1},to:{row:1,column:table.headers.length}};return{bytes:Buffer.from(await workbook.xlsx.writeBuffer()),type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',extension:'xlsx'};
  }
  if(format==='pdf') {
    const doc=new PDFDocument({size:'A4',layout:'landscape',margin:32}),chunks:Buffer[]=[];const completed=new Promise<Buffer>((resolve,reject)=>{doc.on('data',c=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});doc.fontSize(14).text(table.title);doc.moveDown();
    for(const row of [table.headers,...table.data]){if(doc.y>doc.page.height-85)doc.addPage();doc.fontSize(8).text(row.map((v,i)=>`${table.headers[i]}: ${v??''}`).join('  |  '),{width:doc.page.width-64});doc.moveDown(.5);}doc.end();return{bytes:await completed,type:'application/pdf',extension:'pdf'};
  }
  fail('Format harus CSV, XLSX, atau PDF.');
}
