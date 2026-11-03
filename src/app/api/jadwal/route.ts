import { NextResponse } from 'next/server';
import { actor, schedules, dateValue, weekday, errorResponse } from '@/lib/academic';
export async function GET(request: Request) {
  try {
    const user = await actor(), q = new URL(request.url).searchParams;
    const date = q.get('tanggal');
    if (date) dateValue(date);
    const data = schedules(user).filter(j =>
      (!q.get('id_kelas') || j.id_kelas === q.get('id_kelas')) &&
      (!q.get('id_guru') || j.id_guru === q.get('id_guru')) &&
      (!q.get('hari') || j.hari === q.get('hari')) &&
      (!date || (j.hari === weekday(date) && date >= j.mulai && date <= j.selesai && date >= j.periode_mulai && date <= j.periode_selesai)));
    return NextResponse.json({ success: true, data });
  } catch (error) { return errorResponse(error); }
}
