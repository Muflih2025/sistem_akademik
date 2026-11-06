import { NextResponse } from 'next/server';
import { actor,checkWrite,errorResponse } from '@/lib/academic';
import { db,role,rows } from '@/lib/store';
import { progressionPlan,commitProgression } from '@/lib/progression';
export async function GET(){try{const u=await actor();role(u,'admin');return NextResponse.json({success:true,data:rows('SELECT * FROM ak_kenaikan_batch ORDER BY created_at DESC')});}catch(e){return errorResponse(e);}}
export async function POST(request:Request){try{const u=await actor();checkWrite(request);const b=await request.json();const data=db.transaction(()=>b.action==='commit'?commitProgression(u,b):progressionPlan(u,b)).immediate();return NextResponse.json({success:true,data});}catch(e){return errorResponse(e);}}
