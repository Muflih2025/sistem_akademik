import { NextResponse } from 'next/server';
import { actor, dateValue, dutySummary, errorResponse } from '@/lib/academic';
export async function GET(request: Request) {
  try {
    const user = await actor(), q = new URL(request.url).searchParams;
    return NextResponse.json({ success: true, ...dutySummary(user, dateValue(q.get('tanggal')), q.get('id_kelas')) });
  } catch (error) { return errorResponse(error); }
}
