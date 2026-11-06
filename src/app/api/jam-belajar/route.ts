import { NextResponse } from 'next/server';
import { actor,checkWrite,errorResponse } from '@/lib/academic';
import { db } from '@/lib/store';
import { listBells,saveBell } from '@/lib/operations';
export async function GET(){try{await actor();return NextResponse.json({success:true,data:listBells()});}catch(e){return errorResponse(e);}}
export async function POST(request:Request){try{const u=await actor();checkWrite(request);const b=await request.json();return NextResponse.json({success:true,data:db.transaction(()=>saveBell(u,b)).immediate()});}catch(e){return errorResponse(e);}}
