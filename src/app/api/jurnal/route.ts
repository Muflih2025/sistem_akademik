import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { actor, schedules, schedule, one, dateValue, checkWrite, saveMeeting, errorResponse, fail } from '@/lib/academic';
export async function GET(request: Request) {
  try {
    const user = await actor(), q = new URL(request.url).searchParams;
    if (q.get('id_jadwal')) schedule(user, q.get('id_jadwal'));
    if (q.get('tanggal')) dateValue(q.get('tanggal'));
    const allowed = schedules(user);
    const data = (db.prepare('SELECT * FROM ak_pertemuan ORDER BY tanggal DESC,created_at DESC').all() as any[])
      .filter(p => allowed.some(j => j.id_jadwal === p.id_jadwal && j.id_kelas === p.id_kelas && j.id_guru === p.id_guru && j.id_mapel === p.id_mapel && j.id_tahun_ajaran === p.id_tahun_ajaran && p.tanggal >= j.mulai && p.tanggal <= j.selesai))
      .filter(p => (!q.get('id') || p.id === q.get('id')) && (!q.get('id_jadwal') || p.id_jadwal === q.get('id_jadwal')) && (!q.get('tanggal') || p.tanggal === q.get('tanggal')) && (!q.get('id_kelas') || p.id_kelas === q.get('id_kelas')))
      .map(p => ({ ...allowed.find(j => j.id_jadwal === p.id_jadwal), ...p }));
    if (q.get('id') && !data.length) fail('Jurnal tidak tersedia.', 404);
    return NextResponse.json({ success: true, data: q.get('id') ? data[0] : data });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const user = await actor(); checkWrite(request);
    const body = await request.json();
    const data = db.transaction(() => saveMeeting(user, body)).immediate();
    return NextResponse.json({ success: true, data, message: 'Jurnal berhasil disimpan.' });
  } catch (error) { return errorResponse(error); }
}
