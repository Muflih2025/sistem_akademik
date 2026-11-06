'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
export const classKey = (schedule: any) => `${schedule.id_tahun_ajaran}/${schedule.id_kelas}`;
export function useTeachingContext({ sharedJournal = false } = {}) {
  const query = useSearchParams().toString();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [id, setId] = useState(''), [classId, setClassId] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setReady(false); setError(''); setSchedules([]); setId(''); setClassId('');
    const q = new URLSearchParams(query), date = q.get('tanggal') || today();
    setDate(date);
    fetch('/api/jadwal' + (sharedJournal ? '?scope=jurnal' : ''), { signal: controller.signal, cache: 'no-store' }).then(r => r.json()).then(j => {
      if (!j.success) throw Error(j.error);
      setSchedules(j.data);
      const requested = j.data.find((s: any) => String(s.id_jadwal) === q.get('id_jadwal'));
      const chosenClass = q.get('id_kelas') ? j.data.find((s: any) => s.id_kelas === q.get('id_kelas') && (!q.get('id_tahun_ajaran') || s.id_tahun_ajaran === q.get('id_tahun_ajaran'))) : null;
      setClassId(chosenClass ? classKey(chosenClass) : '');
      // An explicitly requested unauthorized ID is never replaced with another class.
      const day = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][new Date(date + 'T00:00:00Z').getUTCDay()];
      const matching = j.data.find((s: any) => s.hari === day && s.mulai <= date && s.selesai >= date);
      setId(sharedJournal ? chosenClass && requested && classKey(requested) === classKey(chosenClass) ? String(requested.id_jadwal) : '' : q.get('id_jadwal') || String(matching?.id_jadwal || j.data[0]?.id_jadwal || ''));
      setReady(true);
      if (!j.data.length) setError(sharedJournal ? 'Belum ada jadwal kelas terverifikasi. Hubungi admin.' : 'Belum ada penugasan terverifikasi. Hubungi admin.');
    }).catch(e => { if (e.name !== 'AbortError') { setError(e.message); setReady(true); } });
    return () => controller.abort();
  }, [sharedJournal, query]);
  return { schedules, id, setId, classId, setClassId, date, setDate, error, ready, sharedJournal };
}
export function TeachingPicker({ context, withDate = true, disabled = false }: { context: ReturnType<typeof useTeachingContext>; withDate?: boolean; disabled?: boolean }) {
  const selected = context.schedules.find(s => String(s.id_jadwal) === context.id);
  const shared = context.sharedJournal;
  const classes = [...new Map(context.schedules.map(s => [classKey(s), s])).values()];
  const classSchedules = context.schedules.filter(s => classKey(s) === context.classId);
  const day = context.date ? ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][new Date(context.date + 'T00:00:00Z').getUTCDay()] : '';
  const available = shared ? classSchedules.filter(s => s.hari === day && s.mulai <= context.date && s.selesai >= context.date && s.periode_mulai <= context.date && s.periode_selesai >= context.date) : context.schedules;
  const dateBounds = shared ? classSchedules[0] : selected;
  const inputClass = 'mt-2 block w-full min-w-0 border border-gray-300 bg-white rounded-lg p-2.5';
  return <div className={'bg-white border border-gray-200 rounded-xl p-4 grid gap-4 ' + (shared ? 'xl:grid-cols-2' : withDate ? 'lg:grid-cols-[minmax(0,2fr)_minmax(180px,1fr)]' : 'grid-cols-1')}>
    {shared && <label className="text-sm min-w-0">Kelas jurnal
      <select aria-label="Kelas jurnal" disabled={disabled} value={context.classId} onChange={e => { context.setClassId(e.target.value); context.setId(''); }} className={inputClass}>
        <option value="">Pilih kelas terlebih dahulu</option>{classes.map(s => <option key={classKey(s)} value={classKey(s)}>{s.nama_kelas} · {s.tahun_ajaran} {s.semester}</option>)}
      </select>
    </label>}
    {withDate && <label className="text-sm min-w-0">Tanggal KBM
      <input aria-label="Tanggal KBM" disabled={disabled} type="date" value={context.date} min={dateBounds ? shared ? dateBounds.periode_mulai : [dateBounds.mulai, dateBounds.periode_mulai].sort().at(-1) : undefined} max={dateBounds ? shared ? [dateBounds.periode_selesai, today()].sort()[0] : [dateBounds.selesai, dateBounds.periode_selesai].sort()[0] : undefined} onChange={e => { context.setDate(e.target.value); if (shared) context.setId(''); }} className={inputClass} />
      {shared ? <span className="block mt-1 text-xs">{day ? `Hari ${day}. ` : ''}Pilih sesi yang sesuai pada tanggal ini.</span> : selected && <span className="block mt-1 text-xs">Pilih tanggal hari {selected.hari} sesuai jadwal, dalam rentang penugasan.</span>}
    </label>}
    <label className={'text-sm min-w-0 ' + (shared ? 'xl:col-span-2' : !withDate ? '' : 'lg:row-start-1 lg:col-start-1')}>{shared ? 'Pilih / edit jurnal kelas' : 'Jadwal / kelas / mata pelajaran'}
      <select aria-label={shared ? 'Pilih / edit jurnal kelas' : 'Jadwal mengajar'} disabled={disabled || shared && !context.classId} value={context.id} onChange={e => context.setId(e.target.value)} className={inputClass}>
        <option value="">{shared ? 'Pilih sesi pelajaran untuk diisi / diedit' : 'Pilih jadwal'}</option>
        {available.map(s => <option key={s.id_jadwal} value={s.id_jadwal}>{s.jam_ke ? `Jam ke ${s.jam_ke} · ` : ''}{s.hari} · {s.jam_mulai}–{s.jam_selesai} · {s.nama_mapel} · {shared ? s.nama_guru : `${s.nama_kelas} · ${s.tahun_ajaran} ${s.semester}`}</option>)}
      </select>
      {selected && <span className="mt-2 block break-words text-sm leading-relaxed">{selected.nama_kelas} · {selected.nama_mapel}<br />{selected.jam_ke ? `Jam ke ${selected.jam_ke} · ` : ''}{selected.hari}, {selected.jam_mulai}–{selected.jam_selesai} · {selected.nama_guru} · {selected.tahun_ajaran} {selected.semester}</span>}
      {shared && context.classId && !available.length && context.ready && <span role="status" className="mt-2 block text-sm">Tidak ada sesi terverifikasi untuk kelas dan tanggal ini.</span>}
    </label>
    {context.error && <p role="alert" className={'text-red-800 ' + (shared ? 'xl:col-span-2' : '')}>{context.error}</p>}
  </div>;
}
