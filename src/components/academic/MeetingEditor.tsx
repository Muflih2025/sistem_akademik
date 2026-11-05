'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Downloads } from '@/components/modules/Common';
import PortalLayout from '@/components/PortalLayout';
import Notice from './Notice';
import JournalConfirmation from './JournalConfirmation';
import { classKey, TeachingPicker, useTeachingContext } from './TeachingContext';

export default function MeetingEditor({ attendance = false }: { attendance?: boolean }) {
  const context = useTeachingContext({ sharedJournal: !attendance });
  const [confirmedKey, setConfirmedKey] = useState(''), [confirmOpen, setConfirmOpen] = useState(false);
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
  const notice = useRef<HTMLDivElement>(null);
  const key = `${context.classId}/${context.id}/${context.date}`;
  const selected = context.schedules.find(s => String(s.id_jadwal) === context.id);
  const historyQuery = `/api/jurnal?id_jadwal=${encodeURIComponent(context.id)}${attendance ? '' : '&scope=kelas&id_kelas=' + encodeURIComponent(selected?.id_kelas || '') + '&id_tahun_ajaran=' + encodeURIComponent(selected?.id_tahun_ajaran || '')}`;
  useEffect(() => { if (error) notice.current?.scrollIntoView({ block: 'nearest' }); }, [error]);
  useEffect(() => { const c = new AbortController(); fetch('/api/guru-options', { signal: c.signal }).then(r => r.json()).then(j => { if (!j.success) throw Error(j.error); setTeachers(j.data); }).catch(e => { if (e.name !== 'AbortError') setError(e.message); }); return () => c.abort(); }, []);
  useEffect(() => { setDownloadStart(context.date); setDownloadEnd(context.date); }, [context.date]);
  useEffect(() => {
    setStudents([]); setLoading(false); setMeeting({}); setHistory([]); setError(''); setSuccess(''); setLoaded(''); setConfirmedKey(''); setConfirmOpen(false); setVerified(false); setReason(''); setPage(1);
    if (!context.ready || !context.id || !context.date || !attendance && !context.classId) return;
    const controller = new AbortController(); setLoading(true);
    Promise.all([
      fetch(attendance ? `/api/absensi?id_jadwal=${encodeURIComponent(context.id)}&tanggal=${context.date}` : `${historyQuery}&view=editor&tanggal=${context.date}`, { signal: controller.signal, cache: 'no-store' }).then(r => r.json()),
      fetch(historyQuery, { signal: controller.signal, cache: 'no-store' }).then(r => r.json()),
    ]).then(([a, h]) => {
      if (!a.success) throw Error(a.error);
      if (!h.success) throw Error(h.error);
      setStudents(a.data || []); setMeeting(a.meeting || { pertemuan_ke: 1, materi: '', refleksi: '', revision: 0, jam_ke: a.schedule?.jam_ke || '' }); setHistory(h.data); setLoaded(key); setLoading(false);
    }).catch(e => { if (e.name !== 'AbortError') { setError(e.message); setLoading(false); } });
    return () => controller.abort();
  }, [context.ready, context.id, context.date, context.classId, key, attendance, historyQuery]);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSuccess('');
    if (loaded !== key || !attendance && confirmedKey !== key) { setError('Muat jadwal dan tanggal yang sesuai terlebih dahulu.'); return; }
    setSaving(true);
    try {
      const response = await fetch(attendance ? '/api/absensi' : '/api/jurnal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...meeting, id_jadwal: context.id, tanggal: context.date, alasan: reason, ...(attendance ? { items: students } : { scope: 'kelas', id_kelas: selected?.id_kelas, id_tahun_ajaran: selected?.id_tahun_ajaran, konfirmasi: confirmedKey === key }) }) });
      const json = await response.json();
      if (!response.ok || !json.success) throw Error(json.error || 'Penyimpanan gagal.');
      setMeeting(json.data); if (!attendance) setConfirmedKey(''); setReason(''); setSuccess(json.message);
      try {
        const h = await fetch(historyQuery, { cache: 'no-store' }).then(r => r.json());
        if (!h.success) throw Error(h.error);
        setHistory(h.data);
      } catch {
        setSuccess(`${json.message} Riwayat belum dapat diperbarui. Muat ulang halaman untuk melihatnya.`);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Penyimpanan gagal.'); }
    finally { setSaving(false); }
  }
  const filtered = students.filter(s => `${s.nama_siswa} ${s.nis}`.toLowerCase().includes(search.toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const editable = loaded === key && !loading && !saving && (attendance || confirmedKey === key);
  function field(name: string, label: string, required = false) {
    return <label className="text-sm min-w-0">{label}{required && <span className="text-xs"> (wajib)</span>}<input aria-label={label} required={required} disabled={!editable} type={name === 'pertemuan_ke' ? 'number' : 'text'} min={name === 'pertemuan_ke' ? 1 : undefined} max={name === 'pertemuan_ke' ? 1000 : undefined} maxLength={name === 'jam_ke' ? 30 : name === 'pertemuan_ke' ? undefined : 5000} aria-describedby={name === 'jam_ke' ? 'lesson-help' : undefined} value={meeting[name] || ''} onChange={e => setMeeting({ ...meeting, [name]: e.target.value })} className="mt-2 w-full p-2.5 border border-gray-300 rounded-lg" />{name === 'jam_ke' && <span id="lesson-help" className="block mt-1 text-xs">Contoh: 1–2 atau 07:00–08:30. Boleh dikosongkan untuk mengikuti jadwal.</span>}</label>;
  }
  function invalid(event: React.InvalidEvent<HTMLFormElement>) {
    const input = event.currentTarget.querySelector<HTMLInputElement>('input:invalid');
    setSuccess('');
    setError(input?.getAttribute('aria-label') === 'Alasan koreksi'
      ? 'Alasan koreksi wajib diisi karena pertemuan ini sudah tersimpan, termasuk jika dibuat melalui absensi.'
      : `${input?.getAttribute('aria-label') || 'Isian jurnal'} belum lengkap atau tidak valid. Periksa isian yang ditandai.`);
  }
  return <PortalLayout roleTitle="Portal Guru"><div className="space-y-6 pb-16">
    <h2 className="text-2xl font-bold">{attendance ? 'Presensi Siswa & Jurnal Kelas' : 'Jurnal Kelas Bersama'}</h2>
    {!attendance && <p className="text-sm leading-relaxed">Semua guru dapat mengisi atau mengoreksi jurnal kelas, termasuk sesi guru lain. Pilih kelas, tanggal, lalu sesi pelajaran dan konfirmasi sebelum mengedit.</p>}
    <TeachingPicker context={context} disabled={saving} />
    <div ref={notice}><Notice error={error} success={success} /></div>
    <Link className="underline text-sm" href="/guru/impor">Impor absensi dari CSV / Excel</Link>
    {context.id && context.date && <details className="border rounded-xl p-4 bg-white"><summary>Unduh buku absensi, jurnal & agenda</summary><div className="space-y-3 mt-3"><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Mulai unduhan<input aria-label="Mulai unduhan buku" type="date" value={downloadStart} onChange={e => setDownloadStart(e.target.value)} className="block w-full border rounded p-2" /></label><label className="text-sm">Selesai unduhan<input aria-label="Selesai unduhan buku" type="date" value={downloadEnd} onChange={e => setDownloadEnd(e.target.value)} className="block w-full border rounded p-2" /></label></div>{(attendance ? ['absensi', 'jurnal', 'agenda'] : ['jurnal', 'agenda']).map(kind => <div key={kind}><h3 className="font-semibold capitalize">{kind}</h3><Downloads params={{ kind, id_jadwal: context.id, mulai: downloadStart, selesai: downloadEnd, ...(!attendance ? { scope: 'kelas', id_kelas: selected?.id_kelas || '', id_tahun_ajaran: selected?.id_tahun_ajaran || '' } : {}) }} setError={setError} /></div>)}</div></details>}
    {loading && <p>Memuat pertemuan…</p>}
    {!attendance && loaded === key && selected && <section className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm leading-relaxed"><strong>{selected.nama_kelas}</strong> · {selected.hari}, {context.date.split('-').reverse().join('-')} · {selected.jam_ke ? `Jam ke ${selected.jam_ke} · ` : ''}{selected.nama_mapel} · {selected.nama_guru}</p>
      <p className="text-sm">{confirmedKey === key ? 'Konteks telah dikonfirmasi. Form jurnal dapat diedit.' : 'Periksa konteks kelas dan sesi sebelum membuka form untuk diedit.'}</p>
      {confirmedKey !== key && <button type="button" onClick={() => setConfirmOpen(true)} className="rounded-lg bg-black px-4 py-3 text-sm text-white">Edit jurnal kelas</button>}
    </section>}
    <JournalConfirmation open={confirmOpen && !attendance && loaded === key} schedule={selected} date={context.date} onCancel={() => setConfirmOpen(false)} onConfirm={() => { if (loaded === key && selected && context.classId) { setConfirmedKey(key); setConfirmOpen(false); } }} />
    <form onSubmit={save} onInvalidCapture={invalid} className="space-y-5">
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
        <label className="text-sm">Alasan koreksi{meeting.id && <span className="text-xs"> (wajib)</span>}<input aria-label="Alasan koreksi" aria-describedby="correction-help" required={!!meeting.id} disabled={!editable} value={reason} onChange={e => setReason(e.target.value)} className="mt-2 w-full border rounded-lg p-2.5" /><span id="correction-help" className="block mt-1 text-xs">{meeting.id ? 'Pertemuan ini sudah tersimpan. Isi alasan untuk mengubah jurnal atau absensi yang sama.' : 'Hanya wajib saat mengubah pertemuan yang sudah tersimpan.'}</span></label>
        <button disabled={!editable} type="submit" className="bg-black text-white rounded-lg p-3 self-end disabled:opacity-40">{saving ? 'Menyimpan…' : attendance ? 'Simpan Absensi & Jurnal' : 'Simpan Jurnal'}</button>
      </section>
    </form>

    <section className="bg-white border rounded-xl p-4 space-y-3"><h3 className="font-bold">Riwayat Jurnal KBM</h3>
      {history.map(h => <div key={h.id} className="border-t pt-3 text-sm"><p>{h.tanggal} · {h.nama_kelas} · {h.jam_ke ? `Jam ke ${h.jam_ke} · ` : ''}{h.nama_mapel} · {h.nama_guru}</p><p>{h.materi}</p><Link className="underline" onClick={() => { context.setClassId(classKey(h)); context.setDate(h.tanggal); context.setId(String(h.id_jadwal)); }} href={`/guru/jurnal?id_jadwal=${encodeURIComponent(h.id_jadwal)}&id_kelas=${encodeURIComponent(h.id_kelas)}&id_tahun_ajaran=${encodeURIComponent(h.id_tahun_ajaran)}&tanggal=${h.tanggal}`}>Buka / koreksi jurnal</Link></div>)}
      {!history.length && <p className="text-sm">Belum ada jurnal tersimpan untuk jadwal ini.</p>}
    </section>
  </div></PortalLayout>;
}
