'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import PortalLayout from '@/components/PortalLayout';
import Notice from '@/components/academic/Notice';
import { today } from '@/components/academic/TeachingContext';
export default function Page() {
  const [date, setDate] = useState(''), [rows, setRows] = useState<any[]>([]), [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { setDate(new URLSearchParams(location.search).get('tanggal') || today()); }, []);
  useEffect(() => {
    if (!date) return;
    const controller = new AbortController(); setRows([]); setLoading(true); setError('');
    fetch(`/api/jadwal?tanggal=${date}`, { signal: controller.signal, cache: 'no-store' }).then(r => r.json()).then(j => {
      if (!j.success) throw Error(j.error); setRows(j.data); setLoading(false);
    }).catch(e => { if (e.name !== 'AbortError') { setError(e.message); setLoading(false); } });
    return () => controller.abort();
  }, [date]);
  return <PortalLayout roleTitle="Portal Guru - Jadwal Mengajar"><div className="space-y-5 pb-16">
    <h2 className="text-2xl font-bold">Jadwal Mengajar & Riwayat KBM</h2>
    <label className="block text-sm">Tanggal mengajar<input aria-label="Tanggal mengajar" type="date" value={date} onChange={e => setDate(e.target.value)} className="block mt-2 p-3 border rounded-lg bg-white max-w-full" /></label>
    <Notice error={error} />
    {loading ? <p>Memuat jadwal…</p> : !rows.length && !error ? <p>Tidak ada penugasan terverifikasi pada tanggal ini. Pilih tanggal lain atau hubungi admin.</p> : null}
    <div className="grid gap-4 lg:grid-cols-2">{rows.map(j => <article key={j.id_jadwal} className="bg-white p-5 border rounded-xl space-y-3">
      <h3 className="font-bold">{j.nama_mapel} · {j.nama_kelas}</h3><p>{j.hari}, {date} · {j.jam_mulai}–{j.jam_selesai}</p>
      <p>{j.nama_guru} · {j.ruang}</p><p className="text-sm">{j.tahun_ajaran} · {j.semester}</p>
      <div className="flex gap-3 flex-wrap"><Link className="p-3 bg-black text-white rounded-lg" href={`/guru/absen?id_jadwal=${encodeURIComponent(j.id_jadwal)}&tanggal=${date}`}>Buka Absen</Link>
      <Link className="p-3 border rounded-lg" href={`/guru/jurnal?id_jadwal=${encodeURIComponent(j.id_jadwal)}&tanggal=${date}`}>Riwayat / Isi Jurnal</Link></div>
    </article>)}</div>
  </div></PortalLayout>;
}
