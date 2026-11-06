import { NextResponse } from 'next/server';
import { actor,errorResponse } from '@/lib/academic';
import { role,rows } from '@/lib/store';
export async function GET(){try{role(await actor(),'admin');const redact=(v:string)=>{try{const r=JSON.parse(v);if(r){delete r.password;delete r._rowid;}return r;}catch{return null;}};return NextResponse.json({success:true,data:rows('SELECT * FROM ak_riwayat ORDER BY created_at DESC LIMIT 200').map(r=>({...r,sebelum:redact(r.sebelum),sesudah:redact(r.sesudah)}))});}catch(e){return errorResponse(e);}}
