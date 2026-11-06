import { NextResponse } from 'next/server';
import { actor,errorResponse } from '@/lib/academic';
import { alumni } from '@/lib/progression';
export async function GET(request:Request){try{return NextResponse.json({success:true,data:alumni(await actor(),new URL(request.url).searchParams.get('q')||'')});}catch(e){return errorResponse(e);}}
