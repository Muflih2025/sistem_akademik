'use client';
import { useEffect, useState } from 'react';
import DailyReconciliation from '@/components/modules/DailyReconciliation';
import { Downloads } from '@/components/modules/Common';
import PortalLayout from '@/components/PortalLayout';
import Notice from '@/components/academic/Notice';
import { today } from '@/components/academic/TeachingContext';
export default function Page() {
  const [refresh, setRefresh] = useState(0);
  const [date, setDate] = useState(''), [classId, setClassId] = useState('');
  const [classes, setClasses] = useState<any[]>([]), [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState(''), [loading, setLoading] = useState(false);
  const [matrix, setMatrix] = useState<any[] | null>(null), [matrixError, setMatrixError] = useState('');
  const [matrixLoading, setMatrixLoading] = useState(false);
  const days = date ? Array.from({ length: 5 }, (_, i) => {
    const d = new Date(date + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + i);
    return d.toISOString().slice(0, 10);
  }) : [];
  useEffect(() => { setMatrix(null); setMatrixError(''); }, [date, classId]);
  async function loadMatrix() {
    setMatrixError(''); setMatrixLoading(true);
    try {
      const results = await Promise.all(days.map(d => fetch(`/api/piket?tanggal=${d}${classId ? `&id_kelas=${encodeURIComponent(classId)}` : ''}`, { cache: 'no-store' }).then(r => r.json())));
      if (results.some(r => !r.success)) throw Error('Tidak semua tanggal minggu ini berada dalam izin piket Anda. Pilih tanggal lain.');
      const students = new Map<string, any>();
      results.forEach((r, i) => r.data.forEach((c: any) => c.students.forEach((s: any) => {
        const key = `${c.id_tahun_ajaran}/${c.id_kelas}/${s.nis}`;
        if (!students.has(key)) students.set(key, { ...s, key, nama_kelas: c.nama_kelas, days: {} });
        students.get(key).days[days[i]] = s.status;
      })));
      setMatrix([...students.values()]);
    } catch (e) { setMatrix(null); setMatrixError(e instanceof Error ? e.message : 'Matriks gagal dimuat.'); }
    finally { setMatrixLoading(false); }
  }
  useEffect(() => { setDate(new URLSearchParams(location.search).get('tanggal') || today()); }, []);
  useEffect(() => {
    if (!date) return;
    const controller = new AbortController(); setRows([]); setError(''); setLoading(true);
    fetch(`/api/piket?tanggal=${date}${classId ? `&id_kelas=${encodeURIComponent(classId)}` : ''}`, { signal: controller.signal, cache: 'no-store' }).then(r => r.json()).then(j => {
      if (!j.success) throw Error(j.error); setClasses(j.classes); setRows(j.data); setLoading(false);
    }).catch(e => { if (e.name !== 'AbortError') { setError(e.message); setLoading(false); } });
    return () => controller.abort();
  }, [date, classId, refresh]);
  return <PortalLayout roleTitle="Portal Guru Piket"><div className="space-y-5 pb-16">
    <h2 className="text-2xl font-bold">Dashboard Guru Piket</h2>
    <p className="text-sm">Rekap harian sekolah dan pemantauan pengisian jurnal per sesi. Jadwal menunjukkan penugasan, bukan bukti lokasi fisik guru.</p>
    <div className="grid gap-4 sm:grid-cols-2 bg-white border rounded-xl p-4"><label className="text-sm min-w-0">Tanggal piket<input aria-label="Tanggal piket" disabled={matrixLoading} type="date" value={date} onChange={e => { setDate(e.target.value); setClassId(''); setClasses([]); }} className="mt-2 block p-2.5 border rounded-lg w-full min-w-0" /></label>
    <label className="text-sm min-w-0">Kelas<select aria-label="Kelas piket" disabled={matrixLoading} value={classId} onChange={e => setClassId(e.target.value)} className="mt-2 block p-2.5 border rounded-lg w-full min-w-0"><option value="">Semua kelas yang ditugaskan</option>{classes.map(c => <option key={`${c.id_kelas}/${c.id_tahun_ajaran}`} value={c.id_kelas}>{c.nama_kelas}</option>)}</select></label></div>
    <Notice error={error} />
    <p className="text-sm">Sumber rekap: absensi harian sekolah yang telah dicatat. Absensi sesi tidak otomatis mengganti status harian. B = Belum Dikonfirmasi, tidak dihitung Hadir atau Alpa.</p>
    <div className="flex flex-wrap gap-3"><button onClick={() => window.print()} className="bg-black text-white p-3 rounded-lg">Cetak Rekap Piket</button>
    <button onClick={loadMatrix} disabled={!date || loading || matrixLoading || !!error} className="border bg-white p-3 rounded-lg disabled:opacity-40">{matrixLoading ? 'Memuat matriks…' : 'Tampilkan Matriks Mingguan'}</button></div>
    {days.length > 0 && <Downloads params={{ kind: 'piket', mulai: days[0], selesai: days[4], ...(classId ? { id_kelas: classId } : {}) }} setError={setError} />}
    <Notice error={matrixError} />
    {matrix && <section className="bg-white border rounded-xl p-4 space-y-3"><h3 className="font-bold">Matriks Absensi Harian Sekolah</h3>
      <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr><th className="p-2">Siswa / Kelas</th>{days.map(d => <th key={d} className="p-2">{d}</th>)}<th className="p-2">H/S/I/A/B</th></tr></thead>
      <tbody>{matrix.map(s => <tr key={s.key} className="border-t"><td className="p-2">{s.nomor_absen}. {s.nama_siswa} ({s.nis})<br />{s.nama_kelas}</td>{days.map(d => <td key={d} className="p-2">{s.days[d] || '—'}</td>)}<td className="p-2">{['H','S','I','A','B'].map(code => Object.values(s.days).filter(v => v === code).length).join('/')}</td></tr>)}</tbody></table></div>
      <p className="text-xs">B = belum dikonfirmasi; — = tidak tercatat sebagai anggota pada tanggal tersebut.</p>
    </section>}
    {loading && <p>Memuat pemantauan…</p>}
    {rows.map(c => <section key={`${c.id_kelas}/${c.id_tahun_ajaran}`} className="bg-white border rounded-xl p-4 space-y-4">
      <h3 className="font-bold">{c.nama_kelas}</h3><p className="text-sm">{Object.entries(c.counts).map(([k,v]) => `${k}: ${v}`).join(' · ')}</p>
      <h4 className="font-semibold text-sm">Jadwal & Pengisian Jurnal</h4>
      {!c.schedules.length && <p className="text-sm">Tidak ada jadwal terverifikasi pada tanggal ini.</p>}
      {c.schedules.map((s:any) => <div key={s.id_jadwal} className="border rounded-lg p-3 text-sm">{s.jam_mulai}–{s.jam_selesai} · {s.nama_guru} · {s.nama_mapel}<br /><strong>{s.id_pertemuan ? 'Jurnal sudah diisi' : 'Jurnal belum diisi'}</strong>{s.materi && <p>{s.materi}</p>}</div>)}
      <h4 className="font-semibold text-sm">Siswa Tidak Hadir / Belum Dikonfirmasi</h4>
      {c.students.filter((s:any) => s.status !== 'H').map((s:any) => <p key={s.nis} className="text-sm">{s.nomor_absen}. {s.nama_siswa} ({s.nis}) — {s.status} {s.keterangan || ''}</p>)}
      <DailyReconciliation date={date} group={c} onSaved={() => setRefresh(x => x + 1)} />
    </section>)}
  </div></PortalLayout>;
}
