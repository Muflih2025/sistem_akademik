import { NextResponse } from 'next/server';
import { actor, checkWrite, errorResponse } from '@/lib/academic';
import { db } from '@/lib/store';
import { listFoundation,saveFoundation } from '@/lib/admin';
export async function GET(request:Request){try{const u=await actor(),q=new URL(request.url).searchParams;return NextResponse.json({success:true,...listFoundation(u,q.get('kind')||'periode')});}catch(e){return errorResponse(e);}}
export async function POST(request:Request){try{const u=await actor();checkWrite(request);const b=await request.json();const data=db.transaction(()=>saveFoundation(u,b)).immediate();return NextResponse.json({success:true,data,message:'Penetapan akademik berhasil disimpan.'});}catch(e){return errorResponse(e);}}
