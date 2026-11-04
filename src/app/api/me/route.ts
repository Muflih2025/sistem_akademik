import { NextResponse } from 'next/server';
import { actor,errorResponse } from '@/lib/academic';
export async function GET(){try{return NextResponse.json({success:true,user:await actor()});}catch(e){return errorResponse(e);}}
