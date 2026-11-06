import { NextResponse } from 'next/server';
import { actor,checkWrite,errorResponse } from '@/lib/academic';
import { usersList,userReferences,transactionalSaveUser } from '@/lib/users';
export async function GET(request:Request){try{const u=await actor(),q=new URL(request.url).searchParams;return NextResponse.json({success:true,data:usersList(u,q),...(q.get('references')==='1'?{references:userReferences(u)}:{})});}catch(e){return errorResponse(e);}}
export async function POST(request:Request){try{const u=await actor();checkWrite(request);return NextResponse.json({success:true,data:transactionalSaveUser(u,await request.json()),message:'Akun berhasil disimpan.'});}catch(e){return errorResponse(e);}}
