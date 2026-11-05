'use client';
import { useEffect, useRef, useState } from 'react';
import { bellTemplates, profileDays, schoolDays } from '@/lib/bell-times';
import { api, message, Screen, Feedback, DataTable, useRole, FieldInput, inputClass, buttonClass, secondaryClass, type Row } from './Common';
import Modal from './Modal';
import ManagementAction from './ManagementAction';

export default function BellBoard() {
  const user = useRole();
  const [rows, setRows] = useState<Row[]>([]), [edit, setEdit] = useState<Row | null>(null);
  const [error, setError] = useState(''), [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false), [refresh, setRefresh] = useState(0), [loading, setLoading] = useState(true);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const c = new AbortController(); setLoading(true);
    api('/api/jam-belajar', undefined, c.signal).then(j => { setRows(j.data); setLoading(false); }).catch(e => { if (e.name !== 'AbortError') { setError(message(e)); setLoading(false); } });
    return () => c.abort();
  }, [refresh]);
  function open(value: Row) { setEdit(value); setError(''); setSuccess(''); }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { await api('/api/jam-belajar', edit!); setEdit(null); setSuccess('Versi jam belajar baru tersimpan.'); setRefresh(x => x + 1); }
    catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  function slot(index: number, column: number, value: string) {
    setEdit(old => old && ({ ...old, slots: old.slots.map((s: any[], i: number) => i === index ? s.map((v, c) => c === column ? value : v) : s) }));
  }
  function addSlot(rest = false) {
    if (!edit || edit.slots.length >= 40) return;
    const start = edit.slots.at(-1)?.[2] || '07:00', [hours, minutes] = start.split(':').map(Number);
    const end = Math.min(hours * 60 + minutes + 40, 1439);
    const number = edit.slots.filter((s: any[]) => s[0] !== '' && s[0] !== null).length + 1;
    setEdit({ ...edit, slots: [...edit.slots, [rest ? null : number, start, `${String(Math.floor(end / 60)).padStart(2,'0')}:${String(end % 60).padStart(2,'0')}`, rest ? 'Istirahat' : 'Pelajaran']] });
  }
  function removeSlot(index: number) {
    if (!edit) return;
    let number = 0;
    setEdit({ ...edit, slots: edit.slots.filter((_: any, i: number) => i !== index).map((s: any[]) => [s[0] === null || s[0] === '' ? null : ++number, ...s.slice(1)]) });
  }
  function copyTemplate(template: typeof bellTemplates[number]) {
    const current = rows.find(r => r.nama === template.nama);
    open({ ...current, nama: template.nama, hari: [...template.hari], slots: template.slots.map(s => [...s]), status: current?.status || 'perlu_konfirmasi', catatan: 'Acuan lampiran jam pembelajaran sekolah', alasan: '', terverifikasi: false });
  }
  const columns = [{ key: 'nomor', label: 'Jam ke' }, { key: 'waktu', label: 'Waktu' }, { key: 'keterangan', label: 'Keterangan' }];
  const timetable = (slots: any[]) => slots.map((s: any[], i: number) => ({ id: i, nomor: s[0] ?? '—', waktu: `${s[1]}–${s[2]}`, keterangan: s[3] }));
  return <Screen title="Jam Pembelajaran">
    <Feedback error={edit?'':error} success={success} />
    <p className="text-sm leading-relaxed">Jam pembelajaran berlaku sesuai hari yang dipilih. Admin dapat menambah profil, mengubah waktu, serta menambah atau menghapus jam pelajaran, istirahat, dan kegiatan.</p>
    {user?.role === 'admin' && <button type="button" disabled={busy || loading} className={buttonClass} onClick={() => open({ nama: '', hari: [], status: 'perlu_konfirmasi', catatan: '', alasan: '', slots: [[1, '07:00', '07:40', 'Pelajaran']] })}>Tambah profil jam</button>}
    {edit && <Modal title={edit.id?'Ubah jam pembelajaran':'Tambah jam pembelajaran'} error={error} busy={busy} onClose={()=>setEdit(null)}><form ref={form} className="space-y-5" onSubmit={save}>
      <div className="grid gap-4 md:grid-cols-2">
        {[{ key: 'nama', label: 'Nama profil hari' }, { key: 'status', label: 'Status profil', options: ['referensi', 'perlu_konfirmasi'] }, { key: 'catatan', label: 'Catatan', optional: true }, { key: 'alasan', label: 'Alasan versi baru' }].map(f => <FieldInput key={f.key} field={f} value={edit[f.key]} disabled={busy || !!edit.id && f.key === 'nama'} onChange={v => setEdit({ ...edit, [f.key]: v })} />)}
      </div>
      <fieldset disabled={busy} className="space-y-2"><legend className="text-sm font-semibold">Hari berlaku</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-3">{schoolDays.map(day => <label key={day} className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" aria-label={`Berlaku hari ${day}`} checked={(edit.hari || []).includes(day)} onChange={e => setEdit({ ...edit, hari: e.target.checked ? [...(edit.hari || []), day] : edit.hari.filter((d: string) => d !== day) })} />{day}</label>)}</div>
        <p className="text-xs text-gray-600">Pilih minimal satu hari untuk menjadikan profil sebagai referensi. Hari yang sama menggunakan satu profil referensi.</p>
      </fieldset>
      <div className="space-y-4">{edit.slots.map((s: any[], i: number) => <fieldset key={i} disabled={busy} className="min-w-0 rounded-xl border p-3"><legend className="px-1 text-sm font-semibold">Baris {i + 1}</legend>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-[100px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)_auto]">
          <label className="min-w-0 text-sm">Jam ke<input aria-label={`Jam ke baris ${i + 1}`} type="number" min="1" max="40" step="1" value={s[0] ?? ''} onChange={e => slot(i, 0, e.target.value)} className={inputClass} /><span className="text-xs text-gray-500">Kosong: kegiatan</span></label>
          <label className="min-w-0 text-sm">Mulai<input aria-label={`Mulai baris ${i + 1}`} type="time" required value={s[1]} onChange={e => slot(i, 1, e.target.value)} className={inputClass} /></label>
          <label className="min-w-0 text-sm">Selesai<input aria-label={`Selesai baris ${i + 1}`} type="time" required value={s[2]} onChange={e => slot(i, 2, e.target.value)} className={inputClass} /></label>
          <label className="min-w-0 text-sm">Keterangan<input aria-label={`Keterangan baris ${i + 1}`} required value={s[3]} onChange={e => slot(i, 3, e.target.value)} className={inputClass} /></label>
          <button type="button" className={secondaryClass + ' self-start sm:mt-5'} onClick={() => removeSlot(i)}>Hapus baris</button>
        </div>
      </fieldset>)}</div>
      <div className="flex flex-wrap gap-3"><button type="button" disabled={busy || edit.slots.length >= 40} className={secondaryClass} onClick={() => addSlot()}>Tambah baris jam</button><button type="button" disabled={busy || edit.slots.length >= 40} className={secondaryClass} onClick={() => addSlot(true)}>Tambah istirahat / kegiatan</button></div>
      {!edit.slots.length && <p role="status" className="text-sm">Tambahkan minimal satu jam pelajaran sebelum menyimpan.</p>}
      <label className="flex items-start gap-2 text-sm"><input aria-label="Konfirmasi pemeriksaan jam" type="checkbox" disabled={busy} checked={!!edit.terverifikasi} onChange={e => setEdit({ ...edit, terverifikasi: e.target.checked })} />Saya sudah memeriksa kesesuaian jam belajar</label>
      <div className="flex flex-wrap gap-3"><button className={buttonClass} disabled={busy || !edit.slots.length}>{busy ? 'Menyimpan…' : 'Simpan versi jam'}</button><button disabled={busy} type="button" className={secondaryClass} onClick={() => setEdit(null)}>Batal</button></div>
    </form></Modal>}
    {loading && <p role="status">Memuat jam pembelajaran…</p>}
    <div className="grid min-w-0 gap-5 xl:grid-cols-2 2xl:grid-cols-3">{rows.map(r => <section className="min-w-0 space-y-3 rounded-xl border bg-white p-4" key={r.id}>
      <h2 className="font-bold">{r.nama} · Versi {Number(r.versi)} · {r.status}</h2><p className="text-sm">Hari: {profileDays(r.payload).join(', ') || 'Belum ditetapkan'}</p>{r.catatan && <p className="break-words text-sm">{r.catatan}</p>}
      <DataTable paginate={false} rows={timetable(r.payload.slots || [])} columns={columns} />
      {user?.role === 'admin' && <div className="flex flex-wrap gap-3"><button type="button" disabled={busy} className={secondaryClass} onClick={() => open({ ...r, ...r.payload, hari: [...profileDays(r.payload)], id: r.id, slots: r.payload.slots.map((s: any[]) => [...s]), alasan: '', terverifikasi: false })}>Buat revisi profil</button><ManagementAction title={`Hapus profil ${r.nama}`} endpoint="/api/jam-belajar" body={{...r,action:'delete'}} onDone={()=>{setSuccess('Profil jam dihapus.');setRefresh(x=>x+1);}} /></div>}
    </section>)}</div>
    {!loading && !rows.length && <p>Belum ada profil jam belajar tersimpan. Admin dapat menggunakan contoh lampiran atau menambah profil baru.</p>}
    <details open={!loading && !rows.length} className="min-w-0 space-y-4 rounded-xl border bg-white p-4"><summary className="cursor-pointer font-semibold">Acuan jam pembelajaran dari lampiran</summary>
      <p className="text-sm">Contoh Senin, Selasa–Kamis, dan Jumat. Admin dapat memeriksa, mengubah, lalu menyimpannya sebagai profil sekolah.</p>
      <div className="grid min-w-0 gap-5 xl:grid-cols-2 2xl:grid-cols-3">{bellTemplates.map(template => <section key={template.nama} className="min-w-0 space-y-3"><h2 className="font-bold">{template.nama}</h2><DataTable paginate={false} rows={timetable(template.slots)} columns={columns} />{user?.role === 'admin' && <button disabled={busy || loading} type="button" className={secondaryClass} onClick={() => copyTemplate(template)}>Gunakan contoh {template.nama}</button>}</section>)}</div>
    </details>
  </Screen>;
}
