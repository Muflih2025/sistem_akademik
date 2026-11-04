import { NextResponse } from 'next/server';
import { actor, checkWrite, errorResponse } from '@/lib/academic';
import { db } from '@/lib/store';
import { saveRule } from '@/lib/operations';
export async function POST(request: Request) {
  try { const user = await actor(); checkWrite(request); const body = await request.json(); const data = db.transaction(() => saveRule(user, body)).immediate(); return NextResponse.json({ success: true, data, message: 'Versi aturan nilai tersimpan.' }); }
  catch (e) { return errorResponse(e); }
}
