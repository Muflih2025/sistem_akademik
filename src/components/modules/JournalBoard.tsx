'use client';
import { useEffect, useState } from 'react';
import { api, message, Screen, Feedback, DataTable, Downloads, inputClass, today, useRole, type Row } from './Common';
import JournalTransfer from './JournalTransfer';
export default function JournalBoard() {
  const user=useRole(),[refresh,setRefresh]=useState(0);
  const [date, setDate] = useState(''), [start, setStart] = useState(''), [rows, setRows] = useState<Row[]>([]), [error, setError] = useState('');
  useEffect(() => { setDate(today()); setStart(today()); }, []);
  useEffect(() => { const c = new AbortController(); api('/api/jurnal', undefined, c.signal).then(j => setRows(j.data)).catch(e => { if (e.name !== 'AbortError') setError(message(e)); }); return () => c.abort(); }, [refresh]);
  return <Screen title="Jurnal Kelas & Agenda Guru"><Feedback error={error} /><JournalTransfer user={user} initial={{tanggal:date||undefined}} onImported={()=>setRefresh(x=>x+1)} /><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Mulai<input aria-label="Mulai rekap jurnal" type="date" className={inputClass} value={start} onChange={e => setStart(e.target.value)} /></label><label className="text-sm">Selesai<input aria-label="Selesai rekap jurnal" type="date" className={inputClass} value={date} onChange={e => setDate(e.target.value)} /></label></div><DataTable rows={rows.filter(r => r.tanggal >= start && r.tanggal <= date)} columns={[{ key: 'tanggal', label: 'Tanggal' }, { key: 'nama_guru', label: 'Guru' }, { key: 'nama_kelas', label: 'Kelas' }, { key: 'nama_mapel', label: 'Mapel' }, { key: 'pertemuan_ke', label: 'Pertemuan' }, { key: 'tp_atp', label: 'TP / ATP' }, { key: 'materi', label: 'Materi' }, { key: 'kegiatan', label: 'Kegiatan' }, { key: 'refleksi', label: 'Refleksi' }, { key: 'tindak_lanjut', label: 'Tindak lanjut' }]} />{start && date && ['jurnal', 'agenda'].map(kind => <section key={kind} className="space-y-2"><h2 className="font-semibold capitalize">{kind}</h2><Downloads params={{ kind, mulai: start, selesai: date }} setError={setError} /></section>)}</Screen>;
}
