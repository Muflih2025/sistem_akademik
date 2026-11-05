import { NextResponse } from 'next/server';
import { actor, checkWrite, errorResponse } from '@/lib/academic';
import { db } from '@/lib/store';
import { listCatalog,saveCatalog } from '@/lib/admin';
export async function GET(request:Request){try{const u=await actor(),q=new URL(request.url).searchParams;return NextResponse.json({success:true,...listCatalog(u,q.get('table')||'siswa',q.get('q')||'',Number(q.get('limit')||50),Number(q.get('offset')||0),q.get('archived')==='1')});}catch(e){return errorResponse(e);}}
export async function POST(request:Request){try{const u=await actor();checkWrite(request);const b=await request.json();const data=db.transaction(()=>saveCatalog(u,b)).immediate();return NextResponse.json({success:true,data,message:'Data berhasil disimpan.'});}catch(e){return errorResponse(e);}}
