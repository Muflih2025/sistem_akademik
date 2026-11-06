import { NextResponse } from 'next/server';
import { actor,checkWrite,errorResponse } from '@/lib/academic';
import { db } from '@/lib/store';
import { listReports,readReport,buildReport,transitionReport,reviewReport,removeReport } from '@/lib/reports';
export async function GET(request:Request){try{const u=await actor(),q=new URL(request.url).searchParams;return NextResponse.json({success:true,data:q.get('id')?readReport(u,q.get('id')!):listReports(u,q)});}catch(e){return errorResponse(e);}}
export async function POST(request:Request){try{const u=await actor();checkWrite(request);const b=await request.json();const data=db.transaction(()=>b.action==='delete'?removeReport(u,b):b.action==='transition'?transitionReport(u,b):b.action==='review'?reviewReport(u,b):buildReport(u,b)).immediate();return NextResponse.json({success:true,data,message:'Status rapor berhasil disimpan.'});}catch(e){return errorResponse(e);}}
