'use client';
import { useEffect, useState } from 'react';
import PortalLayout from '@/components/PortalLayout';
import Notice from '@/components/academic/Notice';
import { catalog, labels, type Field } from '@/lib/catalog';
export type Row = Record<string, any>;
export const inputClass = 'w-full min-w-0 rounded-lg border border-gray-300 bg-white p-2.5 text-sm disabled:bg-gray-100';
export const buttonClass = 'rounded-lg bg-black px-4 py-2.5 text-sm text-white disabled:opacity-40';
export const secondaryClass = 'whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:opacity-40';
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export async function api(url: string, body?: Row, signal?: AbortSignal): Promise<Row> {
  const response = await fetch(url, { method: body ? 'POST' : 'GET', cache: 'no-store', signal,
    headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  const json = await response.json();
  if (!response.ok || !json.success) throw Error(json.error || 'Operasi gagal. Silakan coba kembali.');
  return json;
}
export const message = (error: unknown) => error instanceof Error ? error.message : 'Operasi gagal.';
export function useRole() {
  const [user, setUser] = useState<Row | null>(null);
  useEffect(() => { const c = new AbortController(); api('/api/me', undefined, c.signal).then(j => setUser(j.user)).catch(() => {}); return () => c.abort(); }, []);
  return user;
}
export function Screen({ title, children }: { title: string; children: React.ReactNode }) {
  return <PortalLayout roleTitle={title}><div className="space-y-5 pb-20"><h1 className="text-2xl font-bold">{title}</h1>{children}</div></PortalLayout>;
}
export function Feedback({ error, success }: { error?: string; success?: string }) {
  return <Notice error={error} success={error ? undefined : success} />;
}
export function useLookups(tables: string[], refresh = 0) {
  const [data, setData] = useState<Record<string, Row[]>>({}), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  const key = tables.join(','),generation=key+'#'+refresh;
  const [loadedGeneration,setLoadedGeneration]=useState('');
  useEffect(() => { const c = new AbortController(); setError(''); setLoading(true);
    Promise.all(key.split(',').filter(Boolean).map(async table => {
      const items: Row[] = []; let total = 0;
      do { const result = await api(`/api/admin?table=${table}&limit=1000&offset=${items.length}`, undefined, c.signal); items.push(...result.data); total = Number(result.total); if (!result.data.length) break; } while (items.length < total);
      return [table, items] as const;
    })).then(entries => { if(c.signal.aborted)return;setData(Object.fromEntries(entries));setLoadedGeneration(generation); setLoading(false); }).catch(e => { if (!c.signal.aborted&&e.name !== 'AbortError') { setData({});setError(message(e));setLoadedGeneration(generation); setLoading(false); } });
    return () => c.abort();
  }, [key, refresh]);
  return { data:loadedGeneration===generation?data:{}, error, loading:loading||loadedGeneration!==generation };
}
export function FieldInput({ field, value, onChange, lookups = {}, disabled = false }: {
  field: Field; value: any; onChange: (value: string) => void; lookups?: Record<string, Row[]>; disabled?: boolean;
}) {
  const props = { 'aria-label': field.label, required: !field.optional, disabled, value: value ?? '', onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => onChange(e.target.value), className: inputClass };
  const options = field.reference ? (lookups[field.reference] || []).map(r => ({ value: field.key === 'ruang' ? r.nama_ruang : r[catalog[field.reference!].pk], label: field.reference === 'jadwal' ? `${r.nama_kelas || ''} · ${r.nama_mapel || ''} · ${r.nama_guru || ''} · ${r.hari} ${r.jam_mulai} · ${r.tahun_ajaran || ''} ${r.semester || ''} (#${r.id_jadwal})` : `${labels(r) || r[catalog[field.reference!].pk]}${r.semester && !r.tahun_ajaran ? ' ' + r.semester : ''}` })) : field.options?.map(v => ({ value: v, label: v === '1' ? 'Ya' : v === '0' ? 'Tidak' : v }));
  return <label className="block min-w-0 text-sm">{field.label}{field.optional ? ' (opsional)' : ''}
    {options ? <select {...props}><option value="">{field.optional ? 'Semua / tidak ditetapkan' : 'Pilih ' + field.label.toLowerCase()}</option>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
      : field.type === 'textarea' ? <textarea {...props} rows={3} /> : <input {...props} type={field.type || 'text'} min={field.min} max={field.max} step={field.type === 'number' ? field.step ?? 'any' : undefined} autoComplete={field.type === 'password' ? 'new-password' : 'off'} />}
  </label>;
}
export function DataTable({ columns, rows, actions, paginate = true }: { columns: { key: string; label: string; render?: (row: Row) => React.ReactNode }[]; rows: Row[]; actions?: (row: Row) => React.ReactNode; paginate?: boolean }) {
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [JSON.stringify(rows), columns.map(c => c.key).join(',')]);
  const pages = Math.max(1, Math.ceil(rows.length / 20)), current = Math.min(page, pages - 1);
  const visible = paginate ? rows.slice(current * 20, (current + 1) * 20) : rows;
  return <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm"><thead className="bg-gray-100"><tr>{columns.map(c => <th key={c.key} className="p-3 whitespace-nowrap">{c.label}</th>)}{actions && <th className="p-3">Aksi</th>}</tr></thead><tbody>{visible.map((row, i) => <tr key={JSON.stringify([row.id ?? row.id_user ?? row.id_jadwal ?? row.nis ?? i, row.tanggal, row.id_tahun_ajaran, row.id_kelas, row.id_mapel, row.id_ekskul])} className="border-t">{columns.map(c => <td key={c.key} className="p-3 align-top">{c.render ? c.render(row) : String(row[c.key] ?? '—')}</td>)}{actions && <td className="p-3"><div className="flex flex-wrap gap-2">{actions(row)}</div></td>}</tr>)}</tbody></table>{!rows.length && <p className="p-4 text-sm">Belum ada data yang sesuai.</p>}{paginate && rows.length > 20 && <nav aria-label="Halaman tabel" className="flex flex-wrap items-center gap-3 border-t p-3 text-sm"><button type="button" className={secondaryClass} disabled={current === 0} onClick={() => setPage(current - 1)}>Sebelumnya</button><span>Halaman {current + 1} dari {pages} · {rows.length} data · 20 per halaman</span><button type="button" className={secondaryClass} disabled={current + 1 >= pages} onClick={() => setPage(current + 1)}>Berikutnya</button></nav>}</div>;
}
export function Downloads({ params, setError, formats = ['csv', 'xlsx', 'pdf'] }: { params: Row; setError: (error: string) => void; formats?: string[] }) {
  const [busy, setBusy] = useState('');
  const title = ({ absensi: 'Daftar Hadir', jurnal: 'Jurnal', agenda: 'Agenda', piket: 'Rekap Piket', nilai: 'Nilai', rapor: 'Rapor', jadwal: 'Jadwal', master: 'Data', template: 'Template' } as Record<string, string>)[params.kind] || 'Data';
  async function download(format: string, print = false) {
    setBusy(format); setError('');
    try { const r = await fetch('/api/export?' + new URLSearchParams({ ...params, format })); if (!r.ok) throw Error((await r.json()).error || 'Unduhan gagal.');
      const blob = await r.blob(), url = URL.createObjectURL(blob);
      if (print) {
        const frame = document.createElement('iframe'); frame.title = 'Cetak ' + title; frame.style.cssText = 'position:fixed;width:1px;height:1px;right:0;bottom:0;border:0';
        frame.onload = () => { try { frame.contentWindow?.focus(); frame.contentWindow?.print(); } catch { setError('Cetak otomatis tidak tersedia. Gunakan Unduh PDF lalu cetak berkasnya.'); } };
        frame.src = url; document.body.appendChild(frame); setTimeout(() => { frame.remove(); URL.revokeObjectURL(url); }, 60000);
      } else { const a = document.createElement('a'); a.href = url; a.download = `sia_${params.kind}.${format}`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    } catch (e) { setError(message(e)); } finally { setBusy(''); }
  }
  return <div className="flex flex-wrap gap-2">{formats.map(f => <button type="button" key={f} disabled={!!busy} onClick={() => download(f)} className={secondaryClass}>{busy === f ? 'Mengunduh…' : `Unduh ${title} ${f.toUpperCase()}`}</button>)}{formats.includes('pdf') && <button type="button" disabled={!!busy} onClick={() => download('pdf', true)} className={secondaryClass}>Cetak {title}</button>}</div>;
}
