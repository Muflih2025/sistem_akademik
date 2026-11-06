// Shared presentation for browser previews and PDF; a teacher can have many sessions.
type JournalRow = Record<string, any>;
export function journalDayTitle(date:string,className:string) {
  const day=new Intl.DateTimeFormat('id-ID',{weekday:'long',timeZone:'UTC'}).format(new Date(date+'T00:00:00Z'));
  return `${className} · ${day}, ${date.split('-').reverse().join('-')}`;
}
export function groupJournalDays(entries:JournalRow[]) {
  const sorted=[...entries].sort((a,b)=>{
    for(const key of ['tanggal','nama_kelas','id_tahun_ajaran','id_kelas','jam_mulai','jam_ke','id_jadwal']) {
      const order=String(a[key]??'').localeCompare(String(b[key]??''),'id',{numeric:true});
      if(order)return order;
    }
    return 0;
  });
  const groups=new Map<string,{key:string;title:string;period:string;entries:JournalRow[]}>();
  for(const row of sorted) {
    const key=JSON.stringify([row.id_tahun_ajaran,row.id_kelas,row.tanggal]);
    if(!groups.has(key))groups.set(key,{key,title:journalDayTitle(row.tanggal,row.nama_kelas),period:`${row.tahun_ajaran} ${row.semester}`,entries:[]});
    groups.get(key)!.entries.push(row);
  }
  return [...groups.values()];
}
