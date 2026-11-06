'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, message, Screen, Feedback, DataTable, type Row } from './Common';
export default function LiveDashboard() {
  const [result, setResult] = useState<Row | null>(null), [error, setError] = useState('');
  useEffect(() => { const c = new AbortController(); api('/api/dashboard', undefined, c.signal).then(setResult).catch(e => { if (e.name !== 'AbortError') setError(message(e)); }); return () => c.abort(); }, []);
  return <Screen title="Beranda Akademik"><Feedback error={error} />{result ? <><p>Selamat datang, <strong>{result.user.nama}</strong>. Tanggal {result.date}.</p><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{result.stats.map((s: Row) => <section key={s.label} className="p-5 bg-white border rounded-xl"><h2 className="text-sm">{s.label}</h2><p className="text-3xl font-bold mt-3">{s.value}</p></section>)}</div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{result.links.map((l: Row) => <Link key={l.href} className="border rounded-xl p-4 bg-white font-semibold hover:bg-gray-100" href={l.href}>{l.label} →</Link>)}</div><h2 className="font-bold">Jadwal Hari Ini</h2><DataTable rows={result.data} columns={[{ key: 'nama_mapel', label: 'Mata pelajaran' }, { key: 'nama_kelas', label: 'Kelas' }, { key: 'nama_guru', label: 'Guru' }, { key: 'jam_mulai', label: 'Mulai' }, { key: 'jam_selesai', label: 'Selesai' }, { key: 'ruang', label: 'Ruang' }]} />{result.user.role === 'guru' && <p className="text-sm">Pilih jadwal dan tanggal di modul mengajar sebelum mengisi jurnal atau absensi.</p>}</> : !error && <p>Memuat ringkasan akun…</p>}</Screen>;
}
