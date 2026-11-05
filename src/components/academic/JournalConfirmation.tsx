'use client';
import { useEffect, useRef } from 'react';

export default function JournalConfirmation({ open, schedule, date, onConfirm, onCancel }: {
  open: boolean; schedule: any; date: string; onConfirm: () => void; onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  const displayDate = date.split('-').reverse().join('-');
  return <dialog ref={ref} aria-labelledby="journal-confirm-title" aria-describedby="journal-confirm-message" onCancel={onCancel} onClose={onCancel} className="m-auto w-[calc(100%_-_2rem)] max-w-lg max-h-[85dvh] overflow-y-auto rounded-2xl border border-gray-300 p-5 sm:p-6 backdrop:bg-black/50">
    <h2 id="journal-confirm-title" className="text-xl font-bold">Periksa jurnal yang akan diedit</h2>
    <p id="journal-confirm-message" className="mt-4 leading-relaxed">Apakah yakin tidak salah edit jurnal untuk kelas <strong>{schedule?.nama_kelas}</strong>, hari <strong>{schedule?.hari}</strong>, tanggal <strong>{displayDate}</strong>?</p>
    <dl className="my-4 space-y-2 rounded-xl bg-gray-100 p-4 text-sm">
      <div><dt className="font-semibold">Jam pelajaran</dt><dd>{schedule?.jam_ke ? `Jam ke ${schedule.jam_ke} · ` : ''}{schedule?.jam_mulai}–{schedule?.jam_selesai}</dd></div>
      <div><dt className="font-semibold">Mata pelajaran / guru terjadwal</dt><dd>{schedule?.nama_mapel} · {schedule?.nama_guru}</dd></div>
      <div><dt className="font-semibold">Periode</dt><dd>{schedule?.tahun_ajaran} {schedule?.semester}</dd></div>
    </dl>
    <p className="text-sm">Pastikan kelas dan sesi benar. Perubahan jurnal dicatat atas nama akun Anda.</p>
    <div className="mt-5 flex flex-wrap justify-end gap-3">
      <button type="button" autoFocus onClick={onCancel} className="rounded-lg border bg-white px-4 py-3 text-sm">Batal, pilih ulang</button>
      <button type="button" onClick={onConfirm} className="rounded-lg bg-black px-4 py-3 text-sm text-white">Ya, edit jurnal ini</button>
    </div>
  </dialog>;
}
