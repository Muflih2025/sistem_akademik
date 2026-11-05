'use client';
import { useState } from 'react';
import Modal from './Modal';
import { api, message, inputClass, secondaryClass, today, type Row } from './Common';

export default function ManagementAction({ label='Hapus', title, endpoint, body, onDone, membership=false }: {
  label?:string;title:string;endpoint:string;body:Row;onDone:()=>void;membership?:boolean;
}) {
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[reason,setReason]=useState(''),[until,setUntil]=useState('');
  const verb=label==='Cabut'?'cabut':label==='Pulihkan'?'pulihkan':'hapus';
  async function submit(e:React.FormEvent) {
    e.preventDefault();setBusy(true);setError('');
    try {await api(endpoint,{...body,konfirmasi:true,alasan:reason,...(membership?{selesai:until}:{})});setOpen(false);onDone();}
    catch(e){setError(message(e));}finally{setBusy(false);}
  }
  return <><button type="button" className={secondaryClass+' text-red-700'} onClick={()=>{setError('');setReason('');setUntil([today(),body.selesai||today()].sort()[0]);setOpen(true);}}>{label}</button>
    {open&&<Modal title={title} busy={busy} error={error} onClose={()=>setOpen(false)}><form onSubmit={submit} className="space-y-4">
      <p>{label==='Cabut'?'Cabut penetapan ini? Siswa atau tugas yang dicabut kembali tersedia untuk penetapan berikutnya.':label==='Pulihkan'?'Pulihkan data arsip ini ke daftar pengelolaan?':'Hapus data ini dari daftar pengelolaan?'}</p>
      <p className="text-sm">Data yang telah digunakan disimpan sebagai riwayat. Tindakan dan alasan Anda dicatat.</p>
      {membership&&body.mulai<=today()&&<label className="block text-sm">Tanggal akhir keanggotaan<input aria-label="Tanggal akhir keanggotaan" type="date" required min={body.mulai} max={[today(),body.selesai||today()].sort()[0]} value={until} disabled={busy} onChange={e=>setUntil(e.target.value)} className={inputClass} /><span className="block mt-1 text-xs">Jika sudah ada riwayat, penetapan berikutnya dimulai setelah tanggal ini.</span></label>}
      <label className="block text-sm">Alasan tindakan<textarea aria-label="Alasan tindakan" required maxLength={500} value={reason} disabled={busy} onChange={e=>setReason(e.target.value)} className={inputClass} /></label>
      <div className="flex flex-wrap justify-end gap-3"><button autoFocus type="button" disabled={busy} onClick={()=>setOpen(false)} className={secondaryClass}>Batal</button><button disabled={busy} className="rounded-lg bg-red-700 px-4 py-2.5 text-sm text-white disabled:opacity-40">{busy?'Memproses…':'Ya, '+verb}</button></div>
    </form></Modal>}
  </>;
}
