'use client';
import { useEffect, useState } from 'react';
import { api, message, Screen, Feedback, DataTable, Downloads, inputClass, today, type Row } from './Common';
export default function MonitoringBoard() {
  const [date, setDate] = useState(''), [result, setResult] = useState<Row>({ data: [], meetings: [] }), [error, setError] = useState('');
  useEffect(() => { setDate(today()); const c = new AbortController(); api('/api/monitoring', undefined, c.signal).then(setResult).catch(e => { if (e.name !== 'AbortError') setError(message(e)); }); return () => c.abort(); }, []);
  const weekday = date ? ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date(date + 'T00:00:00Z').getUTCDay()] : '';
  const data = result.data.filter((j: Row) => j.hari === weekday && date >= j.mulai && date <= j.selesai && date >= j.periode_mulai && date <= j.periode_selesai).map((j: Row) => ({ ...j, journal: result.meetings.find((p: Row) => p.id_jadwal === j.id_jadwal && p.tanggal === date) }));
  return <Screen title="Pemantauan Guru & Jurnal"><Feedback error={error} /><p className="text-sm">Pemantauan berdasarkan penugasan dan jurnal tersimpan. Status menunjukkan bukti pengisian, bukan lokasi fisik guru.</p><label className="block text-sm">Tanggal pemantauan<input aria-label="Tanggal pemantauan" type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} /></label><DataTable rows={data} columns={[{ key: 'nama_guru', label: 'Guru' }, { key: 'nama_kelas', label: 'Kelas' }, { key: 'nama_mapel', label: 'Mapel' }, { key: 'jam_mulai', label: 'Mulai' }, { key: 'jam_selesai', label: 'Selesai' }, { key: 'ruang', label: 'Ruang' }, { key: 'journal', label: 'Jurnal', render: r => r.journal ? r.journal.materi : 'Belum diisi' }]} /><Downloads params={{ kind: 'jurnal', mulai: date, selesai: date }} setError={setError} /></Screen>;
}
