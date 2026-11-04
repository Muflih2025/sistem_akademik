import { NextResponse } from 'next/server';
import { actor,checkWrite,errorResponse,fail } from '@/lib/academic';
import { db,rows } from '@/lib/store';
import { saveEvent } from '@/lib/operations';
export async function GET(request:Request){try{const u=await actor(),q=new URL(request.url).searchParams;const bulan=q.get('bulan');if(bulan&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(bulan))fail('Bulan tidak valid.');let data=rows('SELECT * FROM ak_kalender ORDER BY mulai,id').filter(r=>(u.role==='admin'||r.status==='disahkan')&&(!q.get('id_tahun_ajaran')||r.id_tahun_ajaran===q.get('id_tahun_ajaran'))&&(!bulan||(r.mulai.slice(0,7)<=bulan&&r.selesai.slice(0,7)>=bulan)));return NextResponse.json({success:true,data});}catch(e){return errorResponse(e);}}
export async function POST(request:Request){try{const u=await actor();checkWrite(request);const b=await request.json();return NextResponse.json({success:true,data:db.transaction(()=>saveEvent(u,b)).immediate()});}catch(e){return errorResponse(e);}}
