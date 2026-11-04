'use client';
import { useEffect, useState } from 'react';
import { api, message, Screen, Feedback, DataTable, Downloads, inputClass, type Row } from './Common';
export default function GradeSummary() {
  const [rows, setRows] = useState<Row[]>([]), [q, setQ] = useState(''), [error, setError] = useState('');
  useEffect(() => { const c = new AbortController(); api('/api/nilai', undefined, c.signal).then(j => setRows(j.data)).catch(e => { if (e.name !== 'AbortError') setError(message(e)); }); return () => c.abort(); }, []);
  return <Screen title="Rekap Nilai Akademik"><Feedback error={error} /><p className="text-sm">Nilai berjalan sesuai kelas, mapel, dan periode penugasan. Rapor resmi tersedia melalui modul Rapor Semester.</p><label className="block text-sm">Cari siswa, kelas, atau mapel<input aria-label="Cari rekap nilai" className={inputClass} value={q} onChange={e => setQ(e.target.value)} /></label><DataTable rows={rows.filter(r => `${r.nis} ${r.nama_siswa} ${r.nama_kelas} ${r.nama_mapel}`.toLowerCase().includes(q.toLowerCase()))} columns={[{ key: 'nis', label: 'NIS' }, { key: 'nama_siswa', label: 'Nama' }, { key: 'nama_kelas', label: 'Kelas' }, { key: 'nama_mapel', label: 'Mapel' }, { key: 'nilai_tugas', label: 'Tugas' }, { key: 'nilai_uts', label: 'UTS' }, { key: 'nilai_uas', label: 'UAS' }, { key: 'nilai_praktik', label: 'Praktik' }, { key: 'nilai_proyek', label: 'Proyek' }, { key: 'nilai_akhir', label: 'Nilai akhir' }, { key: 'predikat', label: 'Predikat' }]} /><Downloads params={{ kind: 'nilai' }} setError={setError} /></Screen>;
}
