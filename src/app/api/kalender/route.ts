import { NextResponse } from 'next/server';
import { actor,checkWrite,errorResponse } from '@/lib/academic';
import { db } from '@/lib/store';
import { saveEvent, calendarData } from '@/lib/operations';
export async function GET(request:Request){try{const u=await actor(),q=new URL(request.url).searchParams;return NextResponse.json({success:true,...calendarData(u,q)});}catch(e){return errorResponse(e);}}
export async function POST(request:Request){try{const u=await actor();checkWrite(request);const b=await request.json();return NextResponse.json({success:true,data:db.transaction(()=>saveEvent(u,b)).immediate()});}catch(e){return errorResponse(e);}}
