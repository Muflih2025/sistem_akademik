'use client';
import { useEffect, useState } from 'react';
import { type Field, catalog, labels } from '@/lib/catalog';
import { api, message, Screen, Feedback, FieldInput, DataTable, useLookups, buttonClass, secondaryClass, type Row } from './Common';
import Modal from './Modal';
import ManagementAction from './ManagementAction';
const reference = (key: string, label: string, table: string, optional = false): Field => ({ key, label, reference: table, optional });
const dateFields: Field[] = [{ key: 'mulai', label: 'Berlaku mulai', type: 'date' }, { key: 'selesai', label: 'Berlaku sampai', type: 'date' }];
const year = reference('id_tahun_ajaran', 'Periode', 'tahun_ajaran');
const configs: Record<string, { label: string; pk: string; fields: Field[] }> = {
  periode: { label: 'Periode akademik', pk: 'id_tahun_ajaran', fields: [year, ...dateFields, { key: 'hari_efektif', label: 'Hari efektif' }, { key: 'terverifikasi', label: 'Terverifikasi', options: ['0', '1'] }] },
  anggota: { label: 'Keanggotaan kelas', pk: 'id', fields: [year, reference('nis', 'Siswa', 'siswa'), reference('id_kelas', 'Kelas', 'kelas'), { key: 'nomor_absen', label: 'Nomor absen', type: 'number' }, ...dateFields] },
  penugasan: { label: 'Penugasan mengajar', pk: 'id_jadwal', fields: [reference('id_jadwal', 'Jadwal', 'jadwal'), ...dateFields, { key: 'terverifikasi', label: 'Terverifikasi', options: ['0', '1'] }] },
  piket: { label: 'Guru Piket', pk: 'id', fields: [year, reference('id_guru', 'Guru Piket', 'guru'), reference('id_kelas', 'Kelas', 'kelas', true), ...dateFields, { key: 'boleh_koreksi', label: 'Izin koreksi terkonfirmasi', options: ['0', '1'] }, { key: 'aktif', label: 'Tugas aktif', options: ['0', '1'] }] },
  wali: { label: 'Wali kelas', pk: 'id', fields: [year, reference('id_guru', 'Guru wali', 'guru'), reference('id_kelas', 'Kelas', 'kelas'), ...dateFields, { key: 'aktif', label: 'Tugas aktif', options: ['0', '1'] }] },
};
export default function FoundationManager() {
  const [kind, setKind] = useState('periode'), [rows, setRows] = useState<Row[]>([]), [edit, setEdit] = useState<Row | null>(null), [error, setError] = useState(''), [success, setSuccess] = useState(''), [busy, setBusy] = useState(false), [refresh, setRefresh] = useState(0), [q, setQ] = useState(''), [loading, setLoading] = useState(true);
  const [archived,setArchived]=useState<Row[]>([]),[showArchived,setShowArchived]=useState(false);
  const config = configs[kind], lookups = useLookups(['tahun_ajaran', 'siswa', 'guru', 'kelas', 'jadwal'], refresh);
  useEffect(() => { const c = new AbortController(); setLoading(true); api('/api/foundation?kind=' + kind, undefined, c.signal).then(j => { setRows(j.data);setArchived(j.archived||[]); setLoading(false); }).catch(e => { if (e.name !== 'AbortError') { setError(message(e)); setLoading(false); } }); return () => c.abort(); }, [kind, refresh]);
  function create() { const active = lookups.data.tahun_ajaran?.find(p => p.status === 'Aktif'); setEdit({ id_tahun_ajaran: active?.id_tahun_ajaran || '', mulai: active?.mulai || '', selesai: active?.selesai || '', aktif: '1', boleh_koreksi: '0', terverifikasi: '0', hari_efektif: '1,2,3,4,5', id_kelas: '', catatan: '' }); setSuccess(''); }
  async function save(e: React.FormEvent) { e.preventDefault(); setBusy(true); setError(''); try { await api('/api/foundation', { ...edit, kind }); setSuccess('Penetapan tersimpan dan daftar dimuat ulang.'); setEdit(null); setRefresh(x => x + 1); } catch (e) { setError(message(e)); } finally { setBusy(false); } }
  function display(r: Row, f: Field) { if (f.key === 'id_kelas' && (!r[f.key] || r[f.key] === '0')) return 'Semua kelas'; if (f.options?.includes('1')) return r[f.key] === '1' ? 'Ya' : 'Tidak'; if (f.reference) { const data = lookups.data[f.reference] || [], match = data.find(a => String(a[catalog[f.reference!].pk]) === String(r[f.key])); return match ? f.reference === 'jadwal' ? `${match.hari} · ${match.jam_mulai} · #${match.id_jadwal}` : labels(match) : r[f.key] || 'Semua kelas'; } return r[f.key]; }
  const filtered = (showArchived?archived:rows).filter(r => config.fields.some(f => String(display(r, f) || '').toLowerCase().includes(q.toLowerCase())));
  const availableStudents=(lookups.data.siswa||[]).filter(s=>edit?.etag&&s.nis===edit.nis||!rows.some(r=>r.nis===s.nis&&r.id_tahun_ajaran===edit?.id_tahun_ajaran));
  function change(field:Field,value:string) {
    if(!edit)return;
    const schedule=field.key==='id_jadwal'?lookups.data.jadwal?.find(j=>j.id_jadwal===value):null;
    const period=lookups.data.tahun_ajaran?.find(p=>p.id_tahun_ajaran===(schedule?.id_tahun_ajaran||(field.key==='id_tahun_ajaran'?value:'')));
    const next:Row={...edit,[field.key]:value,...(period?{mulai:period.mulai||'',selesai:period.selesai||''}:{}),...(kind==='anggota'&&field.key==='id_tahun_ajaran'?{nis:''}:{})};
    if(kind==='anggota'&&!edit.etag&&field.key==='nis') {
      const previous=archived.filter(r=>r.nis===value&&r.id_tahun_ajaran===edit.id_tahun_ajaran).sort((a,b)=>b.selesai.localeCompare(a.selesai))[0];
      if(previous){const date=new Date(previous.selesai+'T00:00:00Z');date.setUTCDate(date.getUTCDate()+1);next.mulai=[next.mulai,date.toISOString().slice(0,10)].sort().at(-1);}
    }
    if(kind==='anggota'&&!edit.etag&&field.key==='id_kelas'){let number=1;while(rows.some(r=>r.id_tahun_ajaran===next.id_tahun_ajaran&&r.id_kelas===value&&Number(r.nomor_absen)===number))number++;next.nomor_absen=number;}
    setEdit(next);
  }
  return <Screen title="Periode & Penugasan"><div className="flex flex-wrap gap-2">{Object.entries(configs).map(([key, c]) => <button type="button" key={key} disabled={busy} className={kind === key ? buttonClass : secondaryClass} onClick={() => { setKind(key);setShowArchived(false); setRows([]); setEdit(null); setQ(''); setError(''); setSuccess(''); }}>{c.label}</button>)}</div>
    <p className="text-sm">Tetapkan periode terlebih dahulu, lalu roster siswa dan penugasan bertanggal. Cabut mengakhiri penetapan; siswa atau tugasnya dapat ditetapkan kembali.</p><Feedback error={edit?'':error || lookups.error} success={success} />
    {kind === 'penugasan' && <p className="text-sm">Buat jadwal baru melalui <a className="underline" href="/admin/jadwal">Kelola Jadwal</a>. Form ini menetapkan jadwal yang belum memiliki penugasan.</p>}
    <button type="button" className={buttonClass} onClick={create} disabled={showArchived || busy || loading || lookups.loading}>Tambah {config.label}</button>
    {edit && <Modal title={`${edit.etag?'Edit':'Tambah'} ${config.label}`} error={error||lookups.error} busy={busy} onClose={()=>setEdit(null)}><form onSubmit={save} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2">{config.fields.map(f => f.key === 'hari_efektif' ? <fieldset key={f.key} className="space-y-2"><legend>Hari efektif</legend><div className="flex flex-wrap gap-3">{['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((name, i) => <label key={name} className="flex gap-2 text-sm"><input type="checkbox" checked={String(edit.hari_efektif).split(',').includes(String(i + 1))} onChange={e => { const days = new Set(String(edit.hari_efektif).split(',').filter(Boolean)); e.target.checked ? days.add(String(i + 1)) : days.delete(String(i + 1)); setEdit({ ...edit, hari_efektif: [...days].sort().join(',') }); }} />{name}</label>)}</div></fieldset> : <FieldInput key={f.key} field={f} value={edit[f.key]} lookups={{ ...lookups.data,siswa:kind==='anggota'?availableStudents:lookups.data.siswa, jadwal: (lookups.data.jadwal || []).filter(j => edit.etag || !j.sudah_ditugaskan) }} disabled={busy || !!edit.etag && (f.key===config.pk||kind==='anggota'&&['nis','id_tahun_ajaran','id_kelas','mulai'].includes(f.key))} onChange={v=>change(f,v)} />)}
      <FieldInput field={{ key: 'catatan', label: 'Dasar penetapan / alasan koreksi', type: 'textarea' }} value={edit.catatan} disabled={busy} onChange={v => setEdit({ ...edit, catatan: v, alasan: v })} /></div><div className="flex gap-3"><button className={buttonClass} disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan penetapan'}</button><button type="button" className={secondaryClass} onClick={() => setEdit(null)}>Batal</button></div></form></Modal>}
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showArchived} onChange={e=>setShowArchived(e.target.checked)} />Tampilkan penetapan dicabut / dihapus</label>
    <label className="block text-sm">Cari penetapan<input aria-label="Cari penetapan" className="ml-3 p-2 border rounded-lg" value={q} onChange={e => setQ(e.target.value)} /></label>
    {(loading || lookups.loading) && !success && <p role="status">Memuat penetapan dan referensi…</p>}
    <DataTable columns={config.fields.map(f => ({ key: f.key, label: f.label, render: r => String(display(r, f) ?? '—') }))} rows={filtered} actions={r => showArchived?<ManagementAction label="Pulihkan" title={`Pulihkan ${config.label}`} endpoint="/api/foundation" body={{...r,kind,action:'restore'}} onDone={()=>{setShowArchived(false);setSuccess('Penetapan dipulihkan.');setRefresh(x=>x+1);}} />:<><button className={secondaryClass} onClick={() => { setEdit({ ...r });setError(''); setSuccess(''); }}>Edit</button>{kind!=='periode'&&<ManagementAction label="Cabut" title={`Cabut ${config.label}`} endpoint="/api/foundation" body={{...r,kind,action:'revoke'}} membership={kind==='anggota'} onDone={()=>{setSuccess('Penetapan dicabut. Pilihan form telah diperbarui.');setRefresh(x=>x+1);}} />}<ManagementAction title={`Hapus ${config.label}`} endpoint="/api/foundation" body={{...r,kind,action:kind==='anggota'?'revoke':'delete'}} membership={kind==='anggota'} onDone={()=>{setSuccess('Penetapan dihapus dari daftar.');setRefresh(x=>x+1);}} /></>} />
  </Screen>;
}
