'use client';
import { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import { api, message, DataTable, Downloads, inputClass, buttonClass, secondaryClass, today, type Row } from './Common';

type Initial={id_kelas?:string;id_tahun_ajaran?:string;tanggal?:string};
export default function JournalTransfer({user,initial={},onImported}:{user:Row|null;initial?:Initial;onImported?:()=>void}) {
  const [mode,setMode]=useState<'import'|'export'|null>(null);
  if(!user||!['admin','guru','kepala_sekolah'].includes(user.role))return null;
  return <><div className="flex flex-wrap gap-3"><button type="button" className={secondaryClass} onClick={()=>setMode('export')}>Ekspor jurnal</button>{user.role!=='kepala_sekolah'&&<button type="button" className={buttonClass} onClick={()=>setMode('import')}>Impor jurnal</button>}</div>{mode&&<TransferDialog mode={mode} initial={initial} onClose={()=>setMode(null)} onImported={onImported} />}</>;
}
function TransferDialog({mode,initial,onClose,onImported}:{mode:'import'|'export';initial:Initial;onClose:()=>void;onImported?:()=>void}) {
  const [schedules,setSchedules]=useState<Row[]>([]),[ready,setReady]=useState(false),[period,setPeriod]=useState(''),[classId,setClassId]=useState(initial.id_kelas||''),[range,setRange]=useState(false),[start,setStart]=useState(initial.tanggal||today()),[end,setEnd]=useState(initial.tanggal||today()),[day,setDay]=useState('');
  const [entries,setEntries]=useState<Row[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState(''),[loadError,setLoadError]=useState(''),[success,setSuccess]=useState(''),[busy,setBusy]=useState(false),[file,setFile]=useState<File|null>(null),[reason,setReason]=useState(''),[preview,setPreview]=useState<Row|null>(null),[confirmed,setConfirmed]=useState(false);
  const fileInput=useRef<HTMLInputElement>(null);
  useEffect(()=>{const c=new AbortController();api('/api/jadwal?scope=jurnal',undefined,c.signal).then(j=>{
    setSchedules(j.data);const first=j.data.find((s:Row)=>s.id_tahun_ajaran===initial.id_tahun_ajaran)||j.data.find((s:Row)=>s.periode_mulai<=today()&&s.periode_selesai>=today())||j.data[0];
    if(first){setPeriod(first.id_tahun_ajaran);const date=[first.periode_mulai,initial.tanggal||today()].sort().at(-1)!;setStart([date,first.periode_selesai].sort()[0]);setEnd([date,first.periode_selesai].sort()[0]);}setReady(true);
  }).catch(e=>{if(e.name!=='AbortError'){setLoadError(message(e));setReady(true);}});return()=>c.abort();},[]);
  const periods=[...new Map(schedules.map(s=>[s.id_tahun_ajaran,s])).values()],selected=periods.find(p=>p.id_tahun_ajaran===period),classes=[...new Map(schedules.filter(s=>s.id_tahun_ajaran===period).map(s=>[s.id_kelas,s])).values()];
  const params:Row={scope:classId?'kelas':'seluruh',id_tahun_ajaran:period,...(classId?{id_kelas:classId}:{}),mulai:start,selesai:range?end:start,...(day?{hari:day}:{})};
  const until=range?end:start,key=JSON.stringify(params),valid=!!period&&!!start&&!!until&&start<=until&&(!selected||start>=selected.periode_mulai&&until<=selected.periode_selesai)&&(mode==='export'||until<=today());
  function changed(){setPreview(null);setConfirmed(false);setError('');setLoadError('');setSuccess('');}
  useEffect(()=>{
    if(mode!=='export'||!ready||!valid){setLoading(false);setEntries([]);return;}
    const c=new AbortController();setLoading(true);setEntries([]);setLoadError('');
    api('/api/jurnal?'+new URLSearchParams({...params,transfer:'1'}),undefined,c.signal).then(j=>{setEntries(j.data);setLoading(false);}).catch(e=>{if(e.name!=='AbortError'){setLoadError(message(e));setLoading(false);}});return()=>c.abort();
  },[mode,ready,key,valid]);
  async function inspect(e:React.FormEvent) {
    e.preventDefault();if(!file||!valid)return;setBusy(true);setError('');setPreview(null);setConfirmed(false);setSuccess('');
    try {
      if(file.size>5_000_000)throw Error('Ukuran berkas maksimal 5 MB.');
      const content=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('Berkas tidak dapat dibaca.'));reader.readAsDataURL(file);});
      const j=await api('/api/impor-akademik',{...params,module:'jurnal',action:'preview',filename:file.name,content,alasan:reason});setPreview(j.data);
    }catch(e){setError(message(e));}finally{setBusy(false);}
  }
  async function commit(){if(!preview)return;setBusy(true);setError('');try{const j=await api('/api/impor-akademik',{action:'commit',token:preview.token,konfirmasi:confirmed});setSuccess(`${j.data.jumlah} jurnal berhasil disimpan.`);setPreview(null);setConfirmed(false);setFile(null);if(fileInput.current)fileInput.current.value='';onImported?.();}catch(e){setError(message(e));}finally{setBusy(false);}}
  const columns=[{key:'tanggal',label:'Tanggal'},{key:'nama_kelas',label:'Kelas'},{key:'nama_guru',label:'Guru'},{key:'nama_mapel',label:'Mapel'},{key:'jam_ke',label:'Jam'},{key:'pertemuan_ke',label:'Pertemuan'},{key:'materi',label:'Materi'}];
  return <Modal title={mode==='export'?'Ekspor jurnal kelas':'Impor jurnal kelas'} error={error||loadError} busy={busy} onClose={onClose}>
    {!ready?<p role="status">Memuat kelas dan periode jurnal…</p>:!schedules.length?<p role="status">Belum ada jadwal kelas terverifikasi. Hubungi admin untuk menetapkan periode dan jadwal.</p>:<>
      <fieldset disabled={busy} className="grid min-w-0 gap-4 sm:grid-cols-2">
        <label className="text-sm">Periode<select aria-label="Periode jurnal" className={inputClass} value={period} onChange={e=>{changed();setPeriod(e.target.value);setClassId('');const p=periods.find(p=>p.id_tahun_ajaran===e.target.value);if(p){const date=[p.periode_mulai,today()].sort().at(-1)!;setStart([date,p.periode_selesai].sort()[0]);setEnd([date,p.periode_selesai].sort()[0]);}}}>{periods.map(p=><option key={p.id_tahun_ajaran} value={p.id_tahun_ajaran}>{p.tahun_ajaran} {p.semester}</option>)}</select></label>
        <label className="text-sm">Kelas<select aria-label="Kelas transfer jurnal" className={inputClass} value={classId} onChange={e=>{changed();setClassId(e.target.value);}}><option value="">Seluruh kelas</option>{classes.map(c=><option key={c.id_kelas} value={c.id_kelas}>{c.nama_kelas}</option>)}</select></label>
        <label className="text-sm">Pilihan tanggal<select aria-label="Pilihan tanggal jurnal" className={inputClass} value={range?'range':'date'} onChange={e=>{changed();setRange(e.target.value==='range');}}><option value="date">Tanggal tertentu</option><option value="range">Rentang tanggal</option></select></label>
        <label className="text-sm">Hari<select aria-label="Hari jurnal" className={inputClass} value={day} onChange={e=>{changed();setDay(e.target.value);}}><option value="">Semua hari</option>{['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'].map(d=><option key={d}>{d}</option>)}</select></label>
        <label className="text-sm">{range?'Mulai':'Tanggal'}<input aria-label={range?'Mulai jurnal':'Tanggal jurnal'} type="date" required min={selected?.periode_mulai} max={mode==='import'?[selected?.periode_selesai||today(),today()].sort()[0]:selected?.periode_selesai} className={inputClass} value={start} onChange={e=>{changed();setStart(e.target.value);}} /></label>
        {range&&<label className="text-sm">Selesai<input aria-label="Selesai jurnal" type="date" required min={start} max={mode==='import'?[selected?.periode_selesai||today(),today()].sort()[0]:selected?.periode_selesai} className={inputClass} value={end} onChange={e=>{changed();setEnd(e.target.value);}} /></label>}
      </fieldset>
      <p className="rounded-lg bg-gray-100 p-3 text-sm">{selected?.tahun_ajaran} {selected?.semester} · {classId?classes.find(c=>c.id_kelas===classId)?.nama_kelas:'Seluruh kelas'} · {start}{range?` sampai ${end}`:''}{day?` · ${day}`:''}</p>
      {!valid&&<p role="alert" className="text-sm text-red-700">Pilih tanggal berurutan dalam periode yang dipilih. Impor tersedia sampai hari ini.</p>}
      {success&&<p role="status" className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm">{success}</p>}
      {mode==='export'?<>
        <p className="text-sm">CSV/Excel dapat diedit dan diimpor kembali. PDF berisi identitas periode, kelas, tanggal, dan isi jurnal untuk dicetak.</p>
        {loading?<p role="status">Memuat pratinjau jurnal…</p>:valid&&!loadError&&<><p className="text-sm">{entries.length} jurnal sesuai pilihan.</p><Downloads formats={['csv','xlsx']} params={{...params,kind:'jurnal_data'}} setError={setError} /><Downloads formats={['pdf']} params={{...params,kind:'jurnal'}} setError={setError} /><DataTable rows={entries} columns={columns} /></>}
      </>:<>
        <p className="text-sm">Gunakan berkas ekspor CSV/Excel atau unduh template sesuai pilihan. Pertahankan tanggal YYYY-MM-DD dan identitas sesi. Isi materi pada sesi yang akan disimpan; baris materi kosong diabaikan. Maksimal 1.000 baris dan 5 MB.</p>
        {valid&&<Downloads formats={['csv','xlsx']} params={{...params,kind:'template',module:'jurnal'}} setError={setError} />}
        <form onSubmit={inspect} className="space-y-4"><label className="block text-sm">Berkas CSV atau Excel<input ref={fileInput} aria-label="Berkas jurnal" type="file" required accept=".csv,.xlsx" disabled={busy} className={inputClass} onChange={e=>{changed();setFile(e.target.files?.[0]||null);}} /></label><label className="block text-sm">Alasan impor<textarea aria-label="Alasan impor jurnal" required maxLength={500} disabled={busy} className={inputClass} value={reason} onChange={e=>{changed();setReason(e.target.value);}} /></label><button disabled={busy||!file||!valid} className={buttonClass}>{busy?'Memproses…':'Pratinjau impor jurnal'}</button></form>
        {preview&&<section className="space-y-4"><h3 className="font-bold">Pratinjau: {preview.total} jurnal</h3><DataTable rows={preview.data} columns={columns} />{preview.skipped>0&&<p className="text-sm">{preview.skipped} baris tanpa materi diabaikan.</p>}<p className="text-sm">Periksa setiap kelas, tanggal, guru, dan jam. Impor memperbarui jurnal tanpa mengubah absensi siswa.</p><label className="flex items-start gap-2 text-sm"><input aria-label="Konfirmasi seluruh jurnal" type="checkbox" disabled={busy} checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} />Saya sudah memeriksa kelas, tanggal, guru, dan isi seluruh jurnal.</label><button disabled={busy||!confirmed} className={buttonClass} onClick={commit}>Simpan impor jurnal</button></section>}
      </>}
    </>}
  </Modal>;
}
