'use client';
import { useEffect, useState } from 'react';

export function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
export function useTeachingContext() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [id, setId] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const q = new URLSearchParams(location.search);
    setDate(q.get('tanggal') || today());
    fetch('/api/jadwal', { signal: controller.signal, cache: 'no-store' }).then(r => r.json()).then(j => {
      if (!j.success) throw Error(j.error);
      setSchedules(j.data);
      // An explicitly requested unauthorized ID is never replaced with another class.
      const date = q.get('tanggal') || today();
      const day = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][new Date(date + 'T00:00:00Z').getUTCDay()];
      const matching = j.data.find((s: any) => s.hari === day && s.mulai <= date && s.selesai >= date);
      setId(q.get('id_jadwal') || String(matching?.id_jadwal || j.data[0]?.id_jadwal || ''));
      setReady(true);
      if (!j.data.length) setError('Belum ada penugasan terverifikasi. Hubungi admin.');
    }).catch(e => { if (e.name !== 'AbortError') { setError(e.message); setReady(true); } });
    return () => controller.abort();
  }, []);
  return { schedules, id, setId, date, setDate, error, ready };
}
export function TeachingPicker({ context, withDate = true, disabled = false }: { context: ReturnType<typeof useTeachingContext>; withDate?: boolean; disabled?: boolean }) {
  const selected = context.schedules.find(s => String(s.id_jadwal) === context.id);
  return <div className="bg-white border border-gray-200 rounded-xl p-4 grid gap-4 sm:grid-cols-2">
    <label className="text-sm min-w-0">Jadwal / kelas / mata pelajaran
      <select aria-label="Jadwal mengajar" disabled={disabled} value={context.id} onChange={e => context.setId(e.target.value)} className="mt-2 w-full min-w-0 border border-gray-300 rounded-lg p-2.5">
        <option value="">Pilih jadwal</option>
        {context.schedules.map(s => <option key={s.id_jadwal} value={s.id_jadwal}>{s.hari} · {s.jam_mulai}–{s.jam_selesai} · {s.nama_kelas} · {s.nama_mapel} · {s.tahun_ajaran} {s.semester}</option>)}
      </select>
    </label>
    {withDate && <label className="text-sm min-w-0">Tanggal KBM
      <input aria-label="Tanggal KBM" disabled={disabled} type="date" value={context.date} min={selected ? [selected.mulai, selected.periode_mulai].sort().at(-1) : undefined} max={selected ? [selected.selesai, selected.periode_selesai].sort()[0] : undefined} onChange={e => context.setDate(e.target.value)} className="mt-2 w-full min-w-0 border border-gray-300 rounded-lg p-2.5" />
      {selected && <span className="block mt-1 text-xs">Pilih tanggal hari {selected.hari} sesuai jadwal, dalam rentang penugasan.</span>}
    </label>}
    {context.error && <p role="alert" className="text-red-800 sm:col-span-2">{context.error}</p>}
  </div>;
}
