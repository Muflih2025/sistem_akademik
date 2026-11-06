import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { revokeSession,SESSION_COOKIE } from '@/lib/auth';
import { checkWrite,errorResponse } from '@/lib/academic';
export async function POST(request:Request){try{checkWrite(request);const token=(await cookies()).get(SESSION_COOKIE)?.value;if(token)revokeSession(token);const response=NextResponse.json({success:true});response.cookies.set(SESSION_COOKIE,'',{httpOnly:true,path:'/',sameSite:'lax',maxAge:0});return response;}catch(e){return errorResponse(e);}}
