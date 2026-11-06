import { NextResponse } from 'next/server';
import { actor, checkWrite, errorResponse } from '@/lib/academic';
import { db } from '@/lib/store';
import { activityData, saveActivities } from '@/lib/activities';
export async function GET(request: Request) {
  try { return NextResponse.json({ success: true, ...activityData(await actor(), Object.fromEntries(new URL(request.url).searchParams)) }); } catch (e) { return errorResponse(e); }
}
export async function POST(request: Request) {
  try { const user = await actor(); checkWrite(request); const body = await request.json(); return NextResponse.json({ success: true, data: db.transaction(() => saveActivities(user, body)).immediate() }); } catch (e) { return errorResponse(e); }
}
