import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { actor, schedule, schedules, gradeRows, checkWrite, saveGrades, errorResponse, fail } from '@/lib/academic';
export async function GET(request: Request) {
  try {
    const user = await actor(), q = new URL(request.url).searchParams;
    // Existing head/admin recap pages request a list rather than one teaching form.
    if (!q.get('id_jadwal')) {
      if (user.role === 'siswa') fail('Gunakan rapor yang sudah diterbitkan.', 403);
      const allowed = schedules(user).filter(j => (!q.get('id_kelas') || j.id_kelas === q.get('id_kelas')) && (!q.get('kelas') || j.nama_kelas === q.get('kelas')) && (!q.get('id_mapel') || j.id_mapel === q.get('id_mapel')));
      const seen = new Set<string>();
      const data = allowed.flatMap(j => gradeRows(j).data).filter(n => n.id_aturan && !seen.has(n.id) && !!seen.add(n.id));
      return NextResponse.json({ success: true, data });
    }
    return NextResponse.json({ success: true, ...gradeRows(schedule(user, q.get('id_jadwal'))) });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const user = await actor(); checkWrite(request);
    const body = await request.json();
    const count = db.transaction(() => saveGrades(user, body)).immediate();
    return NextResponse.json({ success: true, count, message: `${count} nilai benar-benar disimpan.` });
  } catch (error) { return errorResponse(error); }
}
