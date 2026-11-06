'use client';
import { useEffect, useId, useRef } from 'react';
import Notice from '@/components/academic/Notice';

export default function Modal({ title, children, onClose, busy=false, error='' }: {
  title:string; children:React.ReactNode; onClose:()=>void; busy?:boolean; error?:string;
}) {
  const ref=useRef<HTMLDialogElement>(null),id=useId();
  useEffect(()=>{
    const dialog=ref.current,overflow=document.body.style.overflow;
    dialog?.showModal();document.body.style.overflow='hidden';
    return()=>{dialog?.close();document.body.style.overflow=overflow;};
  },[]);
  return <dialog ref={ref} aria-labelledby={id} onCancel={e=>{e.preventDefault();if(!busy)onClose();}}
    className="m-auto w-[calc(100%_-_2rem)] max-w-4xl max-h-[90dvh] overflow-y-auto rounded-2xl border border-gray-300 bg-white p-0 shadow-xl backdrop:bg-black/50">
    <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b bg-white px-4 py-3 sm:px-6"><h2 id={id} className="text-lg font-bold">{title}</h2><button type="button" disabled={busy} aria-label={'Tutup '+title} onClick={onClose} className="min-h-11 shrink-0 rounded-lg border px-3 py-2">Tutup</button></div>
    <div className="min-w-0 space-y-4 p-4 sm:p-6"><Notice error={error} />{children}</div>
  </dialog>;
}
