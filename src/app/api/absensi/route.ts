import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { actor, attendance, dateValue, checkWrite, saveMeeting, errorResponse, fail } from '@/lib/academic';
export async function GET(request: Request) {
  try {
    const user = await actor(), q = new URL(request.url).searchParams;
    return NextResponse.json({ success: true, ...attendance(user, q.get('id_jadwal'), dateValue(q.get('tanggal'))) });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const user = await actor(); checkWrite(request);
    const body = await request.json();
    if (!Array.isArray(body.items)) fail('Daftar absensi wajib diisi.');
    const data = db.transaction(() => saveMeeting(user, body)).immediate();
    return NextResponse.json({ success: true, data, message: 'Absensi sesi dan jurnal berhasil disimpan bersama.' });
  } catch (error) { return errorResponse(error); }
}
