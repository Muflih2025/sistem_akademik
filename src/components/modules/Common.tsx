'use client';
import { useEffect, useState } from 'react';
import PortalLayout from '@/components/PortalLayout';
import { catalog, labels, type Field } from '@/lib/catalog';
export type Row = Record<string, any>;
export const inputClass = 'w-full min-w-0 rounded-lg border border-gray-300 bg-white p-2.5 text-sm disabled:bg-gray-100';
export const buttonClass = 'rounded-lg bg-black px-4 py-2.5 text-sm text-white disabled:opacity-40';
export const secondaryClass = 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:opacity-40';
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
  return <>{error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">{error}</p>}{success && <p role="status" className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-900">{success}</p>}</>;
}
export function useLookups(tables: string[]) {
  const [data, setData] = useState<Record<string, Row[]>>({}), [error, setError] = useState('');
  const key = tables.join(',');
  useEffect(() => { const c = new AbortController(); setError('');
    Promise.all(key.split(',').filter(Boolean).map(async table => [table, (await api(`/api/admin?table=${table}&limit=1000`, undefined, c.signal)).data] as const))
      .then(entries => setData(Object.fromEntries(entries))).catch(e => { if (e.name !== 'AbortError') setError(message(e)); });
    return () => c.abort();
  }, [key]);
  return { data, error };
}
export function FieldInput({ field, value, onChange, lookups = {}, disabled = false }: {
  field: Field; value: any; onChange: (value: string) => void; lookups?: Record<string, Row[]>; disabled?: boolean;
}) {
  const props = { 'aria-label': field.label, required: !field.optional, disabled, value: value ?? '', onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => onChange(e.target.value), className: inputClass };
  const options = field.reference ? (lookups[field.reference] || []).map(r => ({ value: r[catalog[field.reference!].pk], label: `${labels(r) || r[catalog[field.reference!].pk]}${r.semester && !r.tahun_ajaran ? ' ' + r.semester : ''}` })) : field.options?.map(v => ({ value: v, label: v }));
  return <label className="block min-w-0 text-sm">{field.label}{field.optional ? ' (opsional)' : ''}
    {options ? <select {...props}><option value="">{field.optional ? 'Semua / tidak ditetapkan' : 'Pilih ' + field.label.toLowerCase()}</option>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
      : field.type === 'textarea' ? <textarea {...props} rows={3} /> : <input {...props} type={field.type || 'text'} step={field.type === 'number' ? 'any' : undefined} autoComplete={field.type === 'password' ? 'new-password' : 'off'} />}
  </label>;
}
export function DataTable({ columns, rows, actions }: { columns: { key: string; label: string; render?: (row: Row) => React.ReactNode }[]; rows: Row[]; actions?: (row: Row) => React.ReactNode }) {
  return <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm"><thead className="bg-gray-100"><tr>{columns.map(c => <th key={c.key} className="p-3 whitespace-nowrap">{c.label}</th>)}{actions && <th className="p-3">Aksi</th>}</tr></thead><tbody>{rows.map((row, i) => <tr key={row.id || row.id_user || row.nis || i} className="border-t">{columns.map(c => <td key={c.key} className="p-3 align-top">{c.render ? c.render(row) : String(row[c.key] ?? '—')}</td>)}{actions && <td className="p-3"><div className="flex flex-wrap gap-2">{actions(row)}</div></td>}</tr>)}</tbody></table>{!rows.length && <p className="p-4 text-sm">Belum ada data yang sesuai.</p>}</div>;
}
export function Downloads({ params, setError }: { params: Row; setError: (error: string) => void }) {
  const [busy, setBusy] = useState('');
  async function download(format: string) {
    setBusy(format); setError('');
    try { const r = await fetch('/api/export?' + new URLSearchParams({ ...params, format })); if (!r.ok) throw Error((await r.json()).error || 'Unduhan gagal.');
      const blob = await r.blob(), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = `sia_${params.kind}.${format}`; a.click(); URL.revokeObjectURL(url);
    } catch (e) { setError(message(e)); } finally { setBusy(''); }
  }
  return <div className="flex flex-wrap gap-2">{['csv', 'xlsx', 'pdf'].map(f => <button type="button" key={f} disabled={!!busy} onClick={() => download(f)} className={secondaryClass}>{busy === f ? 'Mengunduh…' : 'Unduh ' + f.toUpperCase()}</button>)}<button type="button" onClick={() => window.print()} className={secondaryClass}>Cetak</button></div>;
}
