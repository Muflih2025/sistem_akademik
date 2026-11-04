import { NextResponse } from 'next/server';
import { actor,errorResponse } from '@/lib/academic';
import { documentTable,renderDocument } from '@/lib/documents';
export async function GET(request:Request){try{const q=new URL(request.url).searchParams,t=documentTable(await actor(),q),file=await renderDocument(t,q.get('format')||'csv');return new NextResponse(new Uint8Array(file.bytes),{headers:{'Content-Type':file.type,'Content-Disposition':`attachment; filename="sia_${(q.get('kind')||'nilai').replace(/[^a-z_]/g,'')}.${file.extension}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}catch(e){return errorResponse(e);}}
