import { NextResponse } from 'next/server';
import { actor, checkWrite, errorResponse, fail } from '@/lib/academic';
import { previewImport, commitImport } from '@/lib/imports';
export async function POST(request: Request) {
  try { const user = await actor(); checkWrite(request); if (Number(request.headers.get('content-length') || 0) > 8_000_000) fail('Ukuran berkas maksimal 5 MB.'); const body = await request.json(); return NextResponse.json({ success: true, data: body.action === 'commit' ? commitImport(user, body) : await previewImport(user, body) }); }
  catch (e) { return errorResponse(e); }
}
