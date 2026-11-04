'use client';
import { useEffect, useState } from 'react';
import PortalLayout from '@/components/PortalLayout';
import Notice from './Notice';
import { TeachingPicker, useTeachingContext } from './TeachingContext';
import RuleEditor from '@/components/modules/RuleEditor';
import { Downloads } from '@/components/modules/Common';
const components = ['tugas','uts','uas','praktik','proyek'];
export default function GradeBook({ readOnly = false }: { readOnly?: boolean }) {
  const context = useTeachingContext();
  const [rows, setRows] = useState<any[]>([]), [rule, setRule] = useState<any>(null);
  const [error, setError] = useState(''), [success, setSuccess] = useState(''), [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false), [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(''), [search, setSearch] = useState(''), [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => { setSuccess(''); }, [context.id]);
  useEffect(() => {
    setRows([]); setRule(null); setLoaded(''); setError(''); setPage(1); setReason('');
    if (!context.ready || !context.id) return;
    const controller = new AbortController(); setLoading(true);
    fetch(`/api/nilai?id_jadwal=${encodeURIComponent(context.id)}`, { signal: controller.signal, cache: 'no-store' }).then(r => r.json()).then(j => {
      if (!j.success) throw Error(j.error);
      setRows(j.data); setRule(j.rule); setLoaded(context.id); setLoading(false);
    }).catch(e => { if (e.name !== 'AbortError') { setError(e.message); setLoading(false); } });
    return () => controller.abort();
  }, [context.ready, context.id, refresh]);
  const weights = rule ? JSON.parse(rule.bobot_json) : {};
  const columns = components.filter(c => Number(weights[c]) > 0);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSuccess(''); setSaving(true);
    try {
      const response = await fetch('/api/nilai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id_jadwal: context.id, id_aturan: rule?.id, items: rows, alasan: reason }) });
      const j = await response.json();
      if (!response.ok || !j.success) throw Error(j.error);
      setSuccess(j.message); setRefresh(x => x + 1);
    } catch(e) { setError(e instanceof Error ? e.message : 'Penyimpanan gagal.'); }
    finally { setSaving(false); }
  }
  const filtered = rows.filter(r => `${r.nama_siswa} ${r.nis}`.toLowerCase().includes(search.toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  return <PortalLayout roleTitle="Portal Guru - Nilai & Rapor"><div className="space-y-5 pb-16">
    <h2 className="text-2xl font-bold">{readOnly ? 'Buku Rapor Kelas — Nilai Berjalan' : 'Input & Rekap Nilai'}</h2>
    <p className="text-sm">Rekap nilai terbaru sesuai kelas, mata pelajaran, dan periode penugasan. Rapor resmi yang sudah diterbitkan merupakan arsip terpisah.</p>
    <TeachingPicker context={context} withDate={false} disabled={saving} />
    <Notice error={error} success={success} />
    {rule && <p className="text-sm">Aturan versi {rule.versi} · KKM {rule.kkm} · {columns.map(c => `${c.toUpperCase()} ${weights[c]}%`).join(' / ')}</p>}
    {!rule && loaded && <Notice error="Aturan nilai belum tersedia. Minta admin menyiapkan aturan sebelum input nilai." />}
    <div className="flex flex-wrap gap-3"><input aria-label="Cari siswa" placeholder="Cari siswa / NIS" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="p-2.5 border rounded-lg w-full sm:w-auto min-w-0" />
    <button type="button" disabled={saving} onClick={() => { setSuccess(''); setRefresh(x => x + 1); }} className="border rounded-lg p-2.5">Muat ulang nilai</button>
    {readOnly && <button type="button" onClick={() => window.print()} className="bg-black text-white p-2.5 rounded-lg">Cetak Rekap</button>}</div>
    {!readOnly && <RuleEditor schedule={context.id} rule={rule} onSaved={() => { setSuccess('Versi aturan tersimpan.'); setRefresh(x => x + 1); }} />}
    <a href="/guru/impor" className="underline text-sm">Impor nilai dari CSV / Excel</a>
    {context.id && <Downloads params={{ kind: 'nilai', id_jadwal: context.id }} setError={setError} />}
    <form onSubmit={save} className="space-y-4">
    {loading ? <p>Memuat nilai…</p> : <div className="overflow-x-auto bg-white border rounded-xl"><table className="w-full text-sm text-left"><thead className="bg-gray-100"><tr><th className="p-3">NIS / Nama</th><th className="p-3">Mata Pelajaran</th>{columns.map(c => <th key={c} className="p-3">{c.toUpperCase()}</th>)}<th className="p-3">Nilai akhir</th><th className="p-3">Predikat</th><th className="p-3">Deskripsi capaian</th></tr></thead><tbody>
      {filtered.slice((page-1)*10,page*10).map(r => <tr key={r.nis} className="border-t"><td className="p-3">{r.nis}<br />{r.nama_siswa}</td><td className="p-3">{r.nama_mapel}</td>
        {columns.map(c => <td key={c} className="p-3">{readOnly ? r[`nilai_${c}`] === '' ? 'Belum diisi' : r[`nilai_${c}`] : <input aria-label={`${r.nis} ${c}`} type="number" min="0" max="100" step="0.01" required disabled={saving || loaded !== context.id} value={r[`nilai_${c}`] ?? ''} onChange={e => setRows(rows.map(x => x.nis === r.nis ? { ...x, [`nilai_${c}`]: e.target.value } : x))} className="w-20 border rounded-lg p-2" />}</td>)}
        <td className="p-3">{r.nilai_akhir ?? 'Belum diisi'}</td><td className="p-3">{r.predikat || '—'}</td><td className="p-3 min-w-64">{readOnly ? r.deskripsi || 'Belum diisi' : <textarea aria-label={`Deskripsi capaian ${r.nis}`} maxLength={2000} rows={3} disabled={saving || loaded !== context.id} value={r.deskripsi || ''} onChange={e => setRows(rows.map(x => x.nis === r.nis ? { ...x, deskripsi: e.target.value } : x))} className="w-full border rounded-lg p-2" placeholder="Capaian kompetensi dan hal yang perlu ditingkatkan" />}</td></tr>)}
    </tbody></table>{!rows.length && <p className="p-4">Belum ada daftar siswa yang sesuai.</p>}</div>}
    <div className="flex flex-wrap gap-3 items-center text-sm"><button type="button" disabled={page<=1} onClick={() => setPage(page-1)} className="border p-2 rounded">Sebelumnya</button>Halaman {page} dari {pages}<button type="button" disabled={page>=pages} onClick={() => setPage(page+1)} className="border p-2 rounded">Berikutnya</button></div>
    {!readOnly && <><label className="block text-sm">Alasan koreksi (wajib untuk nilai existing)<input aria-label="Alasan koreksi" value={reason} onChange={e => setReason(e.target.value)} className="block mt-2 w-full border rounded-lg p-2.5" /></label>
      <button type="submit" disabled={saving || loading || !rule || !rows.length || loaded !== context.id} className="bg-black text-white rounded-lg p-3 disabled:opacity-40">{saving ? 'Menyimpan…' : 'Simpan Nilai'}</button></>}
    </form>
  </div></PortalLayout>;
}
