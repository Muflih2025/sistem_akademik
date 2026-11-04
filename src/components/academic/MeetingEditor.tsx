'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Downloads } from '@/components/modules/Common';
import PortalLayout from '@/components/PortalLayout';
import Notice from './Notice';
import { TeachingPicker, useTeachingContext } from './TeachingContext';

export default function MeetingEditor({ attendance = false }: { attendance?: boolean }) {
  const context = useTeachingContext();
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [downloadStart, setDownloadStart] = useState(''), [downloadEnd, setDownloadEnd] = useState('');
  const [meeting, setMeeting] = useState<any>({});
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState(''), [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false), [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState('');
  const [reason, setReason] = useState(''), [verified, setVerified] = useState(false);
  const [search, setSearch] = useState(''), [page, setPage] = useState(1), [size, setSize] = useState(10);
  const key = `${context.id}/${context.date}`;
  useEffect(() => { const c = new AbortController(); fetch('/api/guru-options', { signal: c.signal }).then(r => r.json()).then(j => { if (!j.success) throw Error(j.error); setTeachers(j.data); }).catch(e => { if (e.name !== 'AbortError') setError(e.message); }); return () => c.abort(); }, []);
  useEffect(() => { setDownloadStart(context.date); setDownloadEnd(context.date); }, [context.date]);
  useEffect(() => {
    setStudents([]); setMeeting({}); setHistory([]); setError(''); setSuccess(''); setLoaded(''); setVerified(false); setReason(''); setPage(1);
    if (!context.ready || !context.id || !context.date) return;
    const controller = new AbortController(); setLoading(true);
    Promise.all([
      fetch(`/api/absensi?id_jadwal=${encodeURIComponent(context.id)}&tanggal=${context.date}`, { signal: controller.signal, cache: 'no-store' }).then(r => r.json()),
      fetch(`/api/jurnal?id_jadwal=${encodeURIComponent(context.id)}`, { signal: controller.signal, cache: 'no-store' }).then(r => r.json()),
    ]).then(([a, h]) => {
      if (!a.success) throw Error(a.error);
      if (!h.success) throw Error(h.error);
      setStudents(a.data); setMeeting(a.meeting || { pertemuan_ke: 1, materi: '', refleksi: '', revision: 0 }); setHistory(h.data); setLoaded(key); setLoading(false);
    }).catch(e => { if (e.name !== 'AbortError') { setError(e.message); setLoading(false); } });
    return () => controller.abort();
  }, [context.ready, context.id, context.date, key]);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSuccess('');
    if (loaded !== key) { setError('Muat jadwal dan tanggal yang sesuai terlebih dahulu.'); return; }
    setSaving(true);
    try {
      const response = await fetch(attendance ? '/api/absensi' : '/api/jurnal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...meeting, id_jadwal: context.id, tanggal: context.date, alasan: reason, ...(attendance ? { items: students } : {}) }) });
      const json = await response.json();
      if (!response.ok || !json.success) throw Error(json.error || 'Penyimpanan gagal.');
      setMeeting(json.data); setReason(''); setSuccess(json.message);
      const h = await fetch(`/api/jurnal?id_jadwal=${encodeURIComponent(context.id)}`, { cache: 'no-store' }).then(r => r.json());
      if (!h.success) throw Error(h.error);
      setHistory(h.data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Penyimpanan gagal.'); }
    finally { setSaving(false); }
  }
  const filtered = students.filter(s => `${s.nama_siswa} ${s.nis}`.toLowerCase().includes(search.toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const editable = loaded === key && !loading && !saving;
  function field(name: string, label: string, required = false) {
    return <label className="text-sm min-w-0">{label}<input aria-label={label} required={required} disabled={!editable} type={name === 'pertemuan_ke' ? 'number' : 'text'} min={name === 'pertemuan_ke' ? 1 : undefined} value={meeting[name] || ''} onChange={e => setMeeting({ ...meeting, [name]: e.target.value })} className="mt-2 w-full p-2.5 border border-gray-300 rounded-lg" /></label>;
  }
  return <PortalLayout roleTitle="Portal Guru"><div className="space-y-6 pb-16">
    <h2 className="text-2xl font-bold">{attendance ? 'Presensi Siswa & Jurnal Kelas' : 'Jurnal Harian Mengajar'}</h2>
    <TeachingPicker context={context} disabled={saving} />
    <Notice error={error} success={success} />
    <Link className="underline text-sm" href="/guru/impor">Impor absensi dari CSV / Excel</Link>
    {context.id && context.date && <details className="border rounded-xl p-4 bg-white"><summary>Unduh buku absensi, jurnal & agenda</summary><div className="space-y-3 mt-3"><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Mulai unduhan<input aria-label="Mulai unduhan buku" type="date" value={downloadStart} onChange={e => setDownloadStart(e.target.value)} className="block w-full border rounded p-2" /></label><label className="text-sm">Selesai unduhan<input aria-label="Selesai unduhan buku" type="date" value={downloadEnd} onChange={e => setDownloadEnd(e.target.value)} className="block w-full border rounded p-2" /></label></div>{['absensi', 'jurnal', 'agenda'].map(kind => <div key={kind}><h3 className="font-semibold capitalize">{kind}</h3><Downloads params={{ kind, id_jadwal: context.id, mulai: downloadStart, selesai: downloadEnd }} setError={setError} /></div>)}</div></details>}
    {loading && <p>Memuat pertemuan…</p>}
    <form onSubmit={save} className="space-y-5">
      {attendance && <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        <p className="text-sm">Absensi per sesi pelajaran. Rekap harian sekolah dikelola terpisah oleh Guru Piket.</p>
        <div className="flex flex-wrap gap-3 text-sm">{['H','S','I','A','B'].map(c => <span key={c}>{c === 'B' ? 'Belum Dikonfirmasi' : c}: {students.filter(s => s.status === c).length}</span>)}</div>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={verified} disabled={!editable} onChange={e => setVerified(e.target.checked)} />Saya sudah memeriksa kehadiran siswa</label>
        <button type="button" disabled={!editable || !verified} onClick={() => setStudents(students.map(s => ({ ...s, status: 'H' })))} className="bg-black text-white rounded-lg p-3 disabled:opacity-40">Tandai Semua Hadir</button>
        <div className="flex flex-wrap gap-3"><input aria-label="Cari siswa" placeholder="Cari siswa / NIS" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="border border-gray-300 rounded-lg p-2 min-w-0 w-full sm:w-auto" /><select aria-label="Siswa per halaman" value={size} onChange={e => { setSize(Number(e.target.value)); setPage(1); }} className="border rounded-lg p-2">{[10,20,50].map(n => <option key={n}>{n}</option>)}</select></div>
        <div className="space-y-3">{filtered.slice((page - 1) * size, page * size).map(s => <article key={s.nis} className="border border-gray-200 rounded-xl p-3 space-y-3">
          <p className="font-semibold">{s.nomor_absen}. {s.nama_siswa} <span className="font-normal text-xs">({s.nis})</span></p>
          <div className="flex flex-wrap gap-2">{['H','S','I','A','B'].map(code => <button type="button" key={code} disabled={!editable} aria-label={`${s.nis} ${code === 'B' ? 'Belum Dikonfirmasi' : code}`} aria-pressed={s.status === code} onClick={() => setStudents(students.map(x => x.nis === s.nis ? { ...x, status: code } : x))} className={`min-w-11 min-h-11 rounded-lg border ${s.status === code ? 'bg-black text-white' : 'bg-white text-black'}`}>{code === 'B' ? '?' : code}</button>)}</div>
          <input aria-label={`Keterangan ${s.nis}`} disabled={!editable} placeholder="Keterangan" value={s.keterangan || ''} onChange={e => setStudents(students.map(x => x.nis === s.nis ? { ...x, keterangan: e.target.value } : x))} className="w-full min-w-0 border rounded-lg p-2" />
        </article>)}</div>
        {!students.length && <p>Daftar siswa belum dimuat.</p>}
        <div className="flex flex-wrap items-center gap-3 text-sm"><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-2 border rounded">Sebelumnya</button>Halaman {page} dari {pages} · {filtered.length} siswa<button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="p-2 border rounded">Berikutnya</button></div>
      </section>}
      <section className="grid gap-4 sm:grid-cols-2 bg-white p-4 border border-gray-200 rounded-xl">
        {field('pertemuan_ke', 'Pertemuan ke', true)}{field('jam_ke', 'Jam pelajaran (opsional)')}
        <label className="text-sm">Guru pengganti (opsional)<select aria-label="Guru pengganti" disabled={!editable} value={meeting.id_guru_pengganti || ''} onChange={e => setMeeting({ ...meeting, id_guru_pengganti: e.target.value })} className="mt-2 block w-full border rounded-lg p-2.5"><option value="">Tidak ada guru pengganti</option>{teachers.map(t => <option key={t.id_guru} value={t.id_guru}>{t.nama_guru}</option>)}</select></label>{field('tp_atp', 'TP / ATP')}{field('materi', 'Materi pembelajaran', true)}
        {field('kegiatan', 'Kegiatan pembelajaran')}{field('refleksi', 'Refleksi KBM')}
        {field('tindak_lanjut', 'Tindak lanjut')}{field('catatan', 'Catatan')}
        <label className="text-sm">Alasan koreksi<input aria-label="Alasan koreksi" required={!!meeting.id} disabled={!editable} value={reason} onChange={e => setReason(e.target.value)} className="mt-2 w-full border rounded-lg p-2.5" /></label>
        <button disabled={!editable} type="submit" className="bg-black text-white rounded-lg p-3 self-end disabled:opacity-40">{saving ? 'Menyimpan…' : attendance ? 'Simpan Absensi & Jurnal' : 'Simpan Jurnal'}</button>
      </section>
    </form>
    {!attendance && loaded === key && <section className="bg-white border rounded-xl p-4 space-y-3"><h3 className="font-bold">Kehadiran pertemuan</h3><p className="text-sm">{['H','S','I','A','B'].map(c => `${c}: ${students.filter(s => s.status === c).length}`).join(' · ')}</p>{students.filter(s => s.status !== 'H').map(s => <p key={s.nis} className="text-sm">{s.nama_siswa} ({s.nis}) · {s.status} · {s.keterangan}</p>)}</section>}
    <section className="bg-white border rounded-xl p-4 space-y-3"><h3 className="font-bold">Riwayat Jurnal KBM</h3>
      {history.map(h => <div key={h.id} className="border-t pt-3 text-sm"><p>{h.tanggal} · {h.nama_kelas} · {h.nama_mapel}</p><p>{h.materi}</p><Link className="underline" href={`/guru/jurnal?id_jadwal=${encodeURIComponent(h.id_jadwal)}&tanggal=${h.tanggal}`}>Buka / koreksi jurnal</Link></div>)}
      {!history.length && <p className="text-sm">Belum ada jurnal tersimpan untuk jadwal ini.</p>}
    </section>
  </div></PortalLayout>;
}
