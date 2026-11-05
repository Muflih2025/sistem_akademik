import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { actor, schedules, schedule, one, dateValue, checkWrite, saveMeeting, errorResponse, fail } from '@/lib/academic';
export async function GET(request: Request) {
  try {
    const user = await actor(), q = new URL(request.url).searchParams;
    const scope = q.get('scope') === 'kelas' ? 'journal' : 'own';
    if (scope === 'journal' && (!q.get('id_kelas') || !q.get('id_tahun_ajaran'))) fail('Pilih kelas dan periode jurnal terlebih dahulu.');
    const selected = q.get('id_jadwal') ? schedule(user, q.get('id_jadwal'), q.get('view') === 'editor' ? dateValue(q.get('tanggal')) : undefined, false, scope) : null;
    if (selected && scope === 'journal' && (selected.id_kelas !== q.get('id_kelas') || selected.id_tahun_ajaran !== q.get('id_tahun_ajaran'))) fail('Kelas atau periode tidak sesuai dengan sesi jurnal.');
    if (q.get('view') === 'editor') {
      if (!selected) fail('Pilih sesi jurnal terlebih dahulu.');
      const meeting = one('ak_pertemuan', { id_jadwal: selected.id_jadwal, tanggal: dateValue(q.get('tanggal')) });
      if (meeting && ['id_tahun_ajaran','id_kelas','id_guru','id_mapel'].some(k => meeting[k] !== selected[k])) fail('Konteks jurnal lama berbeda. Hubungi admin.',409);
      return NextResponse.json({ success: true, schedule: selected, meeting: meeting || null });
    }
    if (q.get('tanggal')) dateValue(q.get('tanggal'));
    const allowed = schedules(user, scope);
    const data = (db.prepare('SELECT * FROM ak_pertemuan ORDER BY tanggal DESC,created_at DESC').all() as any[])
      .filter(p => allowed.some(j => j.id_jadwal === p.id_jadwal && j.id_kelas === p.id_kelas && j.id_guru === p.id_guru && j.id_mapel === p.id_mapel && j.id_tahun_ajaran === p.id_tahun_ajaran && p.tanggal >= j.mulai && p.tanggal <= j.selesai))
      .filter(p => (!q.get('id') || p.id === q.get('id')) && (!q.get('id_jadwal') || p.id_jadwal === q.get('id_jadwal')) && (!q.get('tanggal') || p.tanggal === q.get('tanggal')) && (!q.get('id_kelas') || p.id_kelas === q.get('id_kelas')) && (!q.get('id_tahun_ajaran') || p.id_tahun_ajaran === q.get('id_tahun_ajaran')))
      .map(p => ({ ...allowed.find(j => j.id_jadwal === p.id_jadwal), ...p }));
    if (q.get('id') && !data.length) fail('Jurnal tidak tersedia.', 404);
    return NextResponse.json({ success: true, data: q.get('id') ? data[0] : data });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const user = await actor(); checkWrite(request);
    const body = await request.json();
    const data = db.transaction(() => saveMeeting(user, body, body.scope === 'kelas' ? 'journal' : 'own')).immediate();
    return NextResponse.json({ success: true, data, message: 'Jurnal berhasil disimpan.' });
  } catch (error) { return errorResponse(error); }
}
