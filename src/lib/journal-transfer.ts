import { AuthUser } from './auth';
import { Row, dateValue, period, schedule, schedules, weekday } from './academic';
import { fail, one, role, rows, text, today } from './store';

export const journalHeaders=['id_jadwal','id_kelas','id_tahun_ajaran','tanggal','nama_kelas','nama_guru','nama_mapel','jam_ke','pertemuan_ke','revision','tp_atp','materi','kegiatan','refleksi','tindak_lanjut','catatan','id_guru_pengganti'];
export function journalSelection(user:AuthUser,input:Row) {
  role(user,'admin','guru','kepala_sekolah');
  const shared=['kelas','seluruh'].includes(input.scope),scope=shared?'journal':'own';
  if(input.scope==='kelas'&&(!input.id_kelas||!input.id_tahun_ajaran))fail('Pilih kelas dan periode jurnal terlebih dahulu.');
  if(input.scope==='seluruh'&&!input.id_tahun_ajaran)fail('Pilih periode jurnal terlebih dahulu.');
  const chosen=input.id_jadwal?schedule(user,input.id_jadwal,undefined,false,scope):null;
  const year=input.id_tahun_ajaran?period(String(input.id_tahun_ajaran)):chosen?period(chosen.id_tahun_ajaran):null;
  const from=dateValue(input.mulai||input.tanggal||today()),until=dateValue(input.selesai||input.tanggal||from);
  if(from>until||(Date.parse(until)-Date.parse(from))/86400000>369)fail('Pilih rentang jurnal berurutan, maksimal 370 hari.');
  if(year&&(from<year.mulai||until>year.selesai))fail('Tanggal jurnal harus berada dalam periode yang dipilih.');
  if(input.hari&&!['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'].includes(input.hari))fail('Hari jurnal tidak valid.');
  const context=(chosen?[chosen]:schedules(user,scope)).filter(j=>(!input.id_tahun_ajaran||j.id_tahun_ajaran===input.id_tahun_ajaran)&&(!input.id_kelas||j.id_kelas===input.id_kelas));
  if(input.id_guru&&!context.some(j=>j.id_guru===input.id_guru))fail('Guru tidak tersedia untuk kelas atau periode jurnal yang dipilih.');
  const allowed=context.filter(j=>!input.id_guru||j.id_guru===input.id_guru);
  if(chosen&&!allowed.length||input.scope==='kelas'&&!allowed.length)fail('Sesi tidak sesuai kelas atau periode jurnal.');
  return {allowed,from,until,year};
}
export function journalEntries(user:AuthUser,input:Row) {
  const selection=journalSelection(user,input),byId=new Map(selection.allowed.map(j=>[j.id_jadwal,j]));
  const data=rows('SELECT * FROM ak_pertemuan WHERE tanggal BETWEEN ? AND ? ORDER BY tanggal,jam_ke,id',selection.from,selection.until).flatMap(p=>{
    const j=byId.get(p.id_jadwal);
    if(!j||['id_kelas','id_tahun_ajaran','id_guru','id_mapel'].some(k=>p[k]!==j[k])||p.tanggal<j.mulai||p.tanggal>j.selesai||p.tanggal<j.periode_mulai||p.tanggal>j.periode_selesai||input.hari&&weekday(p.tanggal)!==input.hari)return [];
    return [{...j,...p}];
  });
  return {...selection,data};
}
export function journalTemplate(user:AuthUser,input:Row) {
  role(user,'admin','guru');
  const selection=journalSelection(user,input),data:Row[]=[];
  if(selection.year)period(selection.year.id_tahun_ajaran,true);
  for(let date=selection.from;date<=selection.until;date=new Date(Date.parse(date+'T00:00:00Z')+86400000).toISOString().slice(0,10)) {
    if(date>today()||input.hari&&weekday(date)!==input.hari)continue;
    for(const j of selection.allowed) {
      if(weekday(date)!==j.hari.replace("'",'')||date<j.mulai||date>j.selesai||date<j.periode_mulai||date>j.periode_selesai)continue;
      const academic=period(j.id_tahun_ajaran,true),events=rows("SELECT jenis FROM ak_kalender WHERE id_tahun_ajaran=? AND status='disahkan' AND mulai<=? AND selesai>=?",j.id_tahun_ajaran,date,date);
      if(events.some(e=>e.jenis==='Libur')||!String(academic.hari_efektif).split(',').includes(String(new Date(date+'T00:00:00Z').getUTCDay()||7))&&!events.some(e=>e.jenis==='Hari Efektif'))continue;
      schedule(user,j.id_jadwal,date,true,'journal');
      const existing=one('ak_pertemuan',{id_jadwal:j.id_jadwal,tanggal:date});
      data.push({...j,...existing,tanggal:date,jam_ke:existing?.jam_ke||j.jam_ke||`${j.jam_mulai}–${j.jam_selesai}`,pertemuan_ke:existing?.pertemuan_ke||'1',revision:existing?.revision||'0',materi:existing?.materi||''});
      if(data.length>1000)fail('Template melebihi 1.000 sesi. Perkecil rentang tanggal atau pilih satu kelas.');
    }
  }
  return {headers:journalHeaders,data:data.map(r=>Object.fromEntries(journalHeaders.map(k=>[k,r[k]??''])))};
}
export function validateJournalRow(user:AuthUser,input:Row,row:Row,selection=journalSelection(user,input)) {
  const date=dateValue(row.tanggal);
  if(date<selection.from||date>selection.until||input.hari&&weekday(date)!==input.hari)fail('Tanggal pada berkas di luar filter jurnal.');
  const j=selection.allowed.find(j=>j.id_jadwal===row.id_jadwal);
  if(!j||row.id_kelas!==j.id_kelas||row.id_tahun_ajaran!==j.id_tahun_ajaran)fail('Kelas, periode, atau sesi pada berkas tidak sesuai pilihan jurnal.');
  for(const key of ['nama_kelas','nama_guru','nama_mapel'])if(String(row[key]).trim()!==String(j[key]).trim())fail('Identitas kelas, guru, atau mapel tidak sesuai sesi. Gunakan template terbaru.');
  text(input.alasan,'Alasan impor jurnal',500);
  return j;
}
