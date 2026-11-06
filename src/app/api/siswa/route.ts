import { NextResponse } from 'next/server';
import { actor,errorResponse } from '@/lib/academic';
import { studentData } from '@/lib/students';
export async function GET(request:Request){try{return NextResponse.json({success:true,...studentData(await actor(),new URL(request.url).searchParams)});}catch(e){return errorResponse(e);}}
