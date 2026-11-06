import { NextResponse } from 'next/server';
import { actor, errorResponse } from '@/lib/academic';
import { role, rows } from '@/lib/store';
export async function GET() {
  try { const user = await actor(); role(user, 'admin', 'guru', 'kepala_sekolah'); return NextResponse.json({ success: true, data: rows("SELECT id_guru,nama_guru FROM guru WHERE status='aktif' ORDER BY nama_guru,id_guru") }); }
  catch (e) { return errorResponse(e); }
}
