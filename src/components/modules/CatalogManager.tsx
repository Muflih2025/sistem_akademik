'use client';
import { useEffect, useState } from 'react';
import { catalog, masterTables, labels } from '@/lib/catalog';
import { api, message, Screen, Feedback, FieldInput, DataTable, Downloads, useLookups, buttonClass, secondaryClass, inputClass, type Row } from './Common';
export default function CatalogManager({ table: fixed }: { table?: string }) {
  const [table, setTable] = useState(fixed || 'siswa'), [rows, setRows] = useState<Row[]>([]), [total, setTotal] = useState(0), [page, setPage] = useState(0), [q, setQ] = useState('');
  const [edit, setEdit] = useState<Row | null>(null), [error, setError] = useState(''), [success, setSuccess] = useState(''), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [refresh, setRefresh] = useState(0);
  const def = catalog[table], lookup = useLookups([...new Set(def.fields.map(f => f.reference).filter(Boolean))] as string[]);
  useEffect(() => { if (!fixed) { const requested = new URLSearchParams(location.search).get('table'); const mapped = requested === 'mapel' ? 'mata_pelajaran' : requested === 'ruang' ? 'ak_ruang' : requested; if (mapped && masterTables.includes(mapped)) setTable(mapped); } }, [fixed]);
  useEffect(() => { const c = new AbortController(); setLoading(true); setError(''); api(`/api/admin?${new URLSearchParams({ table, q, limit: '20', offset: String(page * 20) })}`, undefined, c.signal)
    .then(j => { setRows(j.data); setTotal(Number(j.total)); setLoading(false); }).catch(e => { if (e.name !== 'AbortError') { setError(message(e)); setLoading(false); } }); return () => c.abort();
  }, [table, q, page, refresh]);
  function create() { setEdit(Object.fromEntries(def.fields.map(f => [f.key, f.key === 'status' ? 'Tidak Aktif' : f.key === 'dikunci' || f.key === 'rapor_diterbitkan' ? '0' : '']))); setSuccess(''); }
  async function save(e: React.FormEvent) { e.preventDefault(); if (!edit) return; setBusy(true); setError(''); setSuccess('');
    try { await api('/api/admin', { ...edit, table, action: edit.etag ? 'update' : 'create', id: edit.etag ? edit[def.pk] : undefined }); setEdit(null); setSuccess('Data tersimpan. Daftar telah diperbarui.'); setRefresh(x => x + 1); } catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  async function status(row: Row) { setBusy(true); setError(''); try { await api('/api/admin', { ...row, table, id: row[def.pk], action: row.status === 'aktif' ? 'deactivate' : 'activate' }); setSuccess('Status tersimpan.'); setRefresh(x => x + 1); } catch (e) { setError(message(e)); } finally { setBusy(false); } }
  const display = (row: Row, key: string, reference?: string) => reference ? labels((lookup.data[reference] || []).find(r => String(r[catalog[reference].pk]) === String(row[key])) || {}) || row[key] : row[key];
  return <Screen title={fixed ? def.label : 'Master Data Akademik'}>
    {!fixed && <div className="flex flex-wrap gap-2">{masterTables.map(t => <button type="button" key={t} className={t === table ? buttonClass : secondaryClass} onClick={() => { setTable(t); setPage(0); setQ(''); setEdit(null); setSuccess(''); }}>{catalog[t].label}</button>)}</div>}
    <Feedback error={error || lookup.error} success={success} />
    <div className="flex flex-wrap gap-3"><input aria-label="Cari data" placeholder="Cari data…" className={inputClass + ' sm:max-w-xs'} value={q} onChange={e => { setQ(e.target.value); setPage(0); }} /><button type="button" onClick={create} className={buttonClass}>Tambah {def.label}</button><button type="button" className={secondaryClass} onClick={() => setRefresh(x => x + 1)}>Muat ulang</button></div>
    {edit && <form onSubmit={save} className="rounded-xl border bg-white p-4 space-y-4"><h2 className="font-bold">{edit.etag ? 'Edit' : 'Tambah'} {def.label}</h2><div className="grid gap-4 sm:grid-cols-2">{def.fields.map(f => <FieldInput key={f.key} field={f} value={edit[f.key]} lookups={lookup.data} disabled={busy || !!edit.etag && f.key === 'nis'} onChange={v => setEdit({ ...edit, [f.key]: v })} />)}
      {table !== 'tahun_ajaran' && table !== 'catatan_evaluasi' && <FieldInput field={{ key: 'status', label: 'Status', options: ['aktif', 'nonaktif'] }} value={edit.status || 'aktif'} onChange={v => setEdit({ ...edit, status: v })} disabled={busy} />}
      <FieldInput field={{ key: 'alasan', label: 'Alasan perubahan', optional: !edit.etag }} value={edit.alasan || ''} onChange={v => setEdit({ ...edit, alasan: v })} disabled={busy} /></div><div className="flex gap-3"><button disabled={busy} className={buttonClass}>{busy ? 'Menyimpan…' : 'Simpan'}</button><button disabled={busy} type="button" onClick={() => setEdit(null)} className={secondaryClass}>Batal</button></div></form>}
    {loading ? <p>Memuat data…</p> : <DataTable rows={rows} columns={[...def.fields.filter(f => f.type !== 'password').map(f => ({ key: f.key, label: f.label, render: (r: Row) => String(display(r, f.key, f.reference) ?? '—') })), ...(table === 'tahun_ajaran' || table === 'catatan_evaluasi' ? [] : [{ key: 'status', label: 'Status' }])]} actions={r => <><button disabled={busy} type="button" className={secondaryClass} onClick={() => { setEdit({ ...r, password: undefined, alasan: '' }); setSuccess(''); }}>Edit</button>{r.status && table !== 'tahun_ajaran' && <button disabled={busy} type="button" className={secondaryClass} onClick={() => status(r)}>{r.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}</button>}</>} />}
    <div className="flex items-center flex-wrap gap-3 text-sm"><button disabled={page === 0 || loading} className={secondaryClass} onClick={() => setPage(x => x - 1)}>Sebelumnya</button>Halaman {page + 1} · {total} data<button disabled={(page + 1) * 20 >= total || loading} className={secondaryClass} onClick={() => setPage(x => x + 1)}>Berikutnya</button></div>
    <Downloads params={{ kind: 'master', table }} setError={setError} />
  </Screen>;
}
