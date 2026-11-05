'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import PortalLayout from '@/components/PortalLayout';
import Notice from '@/components/academic/Notice';
import { classKey, today } from '@/components/academic/TeachingContext';
export default function Page() {
  const [date, setDate] = useState(''), [rows, setRows] = useState<any[]>([]), [error, setError] = useState('');
  const [all, setAll] = useState<any[]>([]), [classId, setClassId] = useState(''), [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { setDate(new URLSearchParams(location.search).get('tanggal') || today()); }, []);
  useEffect(() => { const c = new AbortController(); fetch('/api/jadwal?scope=jurnal', { signal: c.signal, cache: 'no-store' }).then(r => r.json()).then(j => { if (!j.success) throw Error(j.error); setAll(j.data); }).catch(e => { if (e.name !== 'AbortError') setError(e.message); }); return () => c.abort(); }, []);
  useEffect(() => {
    setSessionId('');
    if (!date) return;
    const controller = new AbortController(); setRows([]); setLoading(true); setError('');
    fetch(`/api/jadwal?tanggal=${date}`, { signal: controller.signal, cache: 'no-store' }).then(r => r.json()).then(j => {
      if (!j.success) throw Error(j.error); setRows(j.data); setLoading(false);
    }).catch(e => { if (e.name !== 'AbortError') { setError(e.message); setLoading(false); } });
    return () => controller.abort();
  }, [date]);
  const classes = [...new Map(all.map(j => [classKey(j), j])).values()];
  const day = date ? ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][new Date(date + 'T00:00:00Z').getUTCDay()] : '';
  const sessions = all.filter(j => classKey(j) === classId && j.hari === day && j.mulai <= date && j.selesai >= date && j.periode_mulai <= date && j.periode_selesai >= date);
  const chosen = sessions.find(j => String(j.id_jadwal) === sessionId);
  const journalUrl = (j: any) => `/guru/jurnal?${new URLSearchParams({ id_jadwal: j.id_jadwal, id_kelas: j.id_kelas, id_tahun_ajaran: j.id_tahun_ajaran, tanggal: date })}`;
  return <PortalLayout roleTitle="Portal Guru - Jadwal Mengajar"><div className="space-y-5 pb-16">
    <h2 className="text-2xl font-bold">Jadwal Mengajar & Riwayat KBM</h2>
    <label className="block text-sm">Tanggal mengajar<input aria-label="Tanggal mengajar" type="date" value={date} onChange={e => setDate(e.target.value)} className="block mt-2 p-3 border rounded-lg bg-white max-w-full" /></label>
    <Notice error={error} />
    <section className="min-w-0 space-y-4 rounded-xl border bg-white p-4 sm:p-5">
      <h3 className="text-lg font-bold">Jurnal kelas per sesi</h3><p className="text-sm">Pilih kelas dan sesi pada tanggal di atas. Jurnal sendiri maupun guru lain dapat diedit setelah konfirmasi konteks.</p>
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <label className="min-w-0 text-sm">Kelas<select aria-label="Pilih kelas jadwal" className="mt-2 w-full min-w-0 rounded-lg border bg-white p-3" value={classId} onChange={e => { setClassId(e.target.value); setSessionId(''); }}><option value="">Pilih kelas</option>{classes.map(j => <option key={classKey(j)} value={classKey(j)}>{j.nama_kelas} · {j.tahun_ajaran} {j.semester}</option>)}</select></label>
        <label className="min-w-0 text-sm">Sesi / guru<select aria-label="Pilih jurnal dari jadwal" disabled={!classId} className="mt-2 w-full min-w-0 rounded-lg border bg-white p-3" value={sessionId} onChange={e => setSessionId(e.target.value)}><option value="">Pilih sesi jurnal</option>{sessions.map(j => <option key={j.id_jadwal} value={j.id_jadwal}>{j.jam_ke ? `Jam ke ${j.jam_ke} · ` : ''}{j.jam_mulai}–{j.jam_selesai} · {j.nama_guru} · {j.nama_mapel}</option>)}</select></label>
      </div>
      {chosen && <p className="break-words text-sm">{chosen.nama_kelas} · {day}, {date.split('-').reverse().join('-')} · {chosen.jam_ke ? `Jam ke ${chosen.jam_ke} · ` : ''}{chosen.nama_guru} · {chosen.nama_mapel}</p>}
      {classId && !sessions.length && <p role="status" className="text-sm">Tidak ada sesi untuk kelas dan tanggal ini.</p>}
      {chosen ? <Link className="inline-flex min-h-11 items-center rounded-lg bg-black px-4 py-3 text-sm text-white" href={journalUrl(chosen)}>Buka jurnal kelas</Link> : <button disabled className="rounded-lg bg-black px-4 py-3 text-sm text-white opacity-40">Buka jurnal kelas</button>}
    </section>
    <h3 className="text-lg font-bold">Jadwal mengajar</h3>
    {loading ? <p>Memuat jadwal…</p> : !rows.length && !error ? <p role="status">Tidak ada penugasan terverifikasi pada tanggal ini. Pilih tanggal lain atau hubungi admin. Jadwal pribadi muncul setelah admin menetapkan dan memverifikasi penugasan mengajar. Jurnal kelas lain dapat dibuka melalui pilihan kelas dan sesi di atas.</p> : null}
    <div className="grid gap-4 lg:grid-cols-2">{rows.map(j => <article key={j.id_jadwal} className="bg-white p-5 border rounded-xl space-y-3">
      <h3 className="font-bold">{j.nama_mapel} · {j.nama_kelas}</h3><p>{j.jam_ke ? `Jam ke ${j.jam_ke} · ` : ''}{j.hari}, {date} · {j.jam_mulai}–{j.jam_selesai}</p>
      <p>{j.nama_guru} · {j.ruang}</p><p className="text-sm">{j.tahun_ajaran} · {j.semester}</p>
      <div className="flex gap-3 flex-wrap"><Link className="p-3 bg-black text-white rounded-lg" href={`/guru/absen?id_jadwal=${encodeURIComponent(j.id_jadwal)}&tanggal=${date}`}>Buka Absen</Link>
      <Link className="p-3 border rounded-lg" href={journalUrl(j)}>Riwayat / Isi Jurnal</Link></div>
    </article>)}</div>
  </div></PortalLayout>;
}
