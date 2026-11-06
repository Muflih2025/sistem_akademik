import { NextResponse } from 'next/server';
import { actor,schedules,errorResponse } from '@/lib/academic';
import { role,rows } from '@/lib/store';
export async function GET(){try{const u=await actor();role(u,'admin','kepala_sekolah');return NextResponse.json({success:true,data:schedules(u),meetings:rows('SELECT * FROM ak_pertemuan ORDER BY tanggal DESC')});}catch(e){return errorResponse(e);}}
