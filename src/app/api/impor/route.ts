import { NextResponse } from 'next/server';
import { actor,checkWrite,errorResponse,fail } from '@/lib/academic';
import { bulkTemplate,bulkPreview,bulkCommit } from '@/lib/bulk';
export async function GET(request:Request){try{const u=await actor(),q=new URL(request.url).searchParams,f=await bulkTemplate(u,q.get('module')||'siswa',q.get('format')||'xlsx');return new NextResponse(new Uint8Array(f.bytes),{headers:{'Content-Type':f.type,'Content-Disposition':`attachment; filename="template.${f.extension}"`,'Cache-Control':'private, no-store'}});}catch(e){return errorResponse(e);}}
export async function POST(request:Request){try{const u=await actor();checkWrite(request);if(Number(request.headers.get('content-length')||0)>8_000_000)fail('Ukuran berkas maksimal 5 MB.');const b=await request.json();return NextResponse.json({success:true,data:b.action==='commit'?bulkCommit(u,b):await bulkPreview(u,b)});}catch(e){return errorResponse(e);}}
