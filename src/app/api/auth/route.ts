import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createSessionToken,userProfile,SESSION_COOKIE } from '@/lib/auth';
import { checkWrite,errorResponse,fail } from '@/lib/academic';
const attempts=new Map<string,{count:number;until:number}>();
export async function POST(request:Request) {
  try {
    checkWrite(request);const {username,password}=await request.json();
    if(typeof username!=='string'||typeof password!=='string'||!username||!password||username.length>50||Buffer.byteLength(password)>72)fail('Username atau password tidak valid.',400);
    const key=username.toLowerCase(),now=Date.now(),attempt=attempts.get(key);
    if(attempt&&attempt.until>now&&attempt.count>=10)fail('Terlalu banyak percobaan. Coba lagi dalam 15 menit.',429);
    const users=db.prepare("SELECT * FROM users WHERE username=? AND status='aktif'").all(username) as any[];
    const user=users.length===1?users[0]:null;
    if(!user||!await bcrypt.compare(password,String(user.password).replace(/^\$2y\$/,'$2a$'))) {
      if(attempts.size>10000)for(const[k,v]of attempts)if(v.until<now)attempts.delete(k);
      attempts.set(key,{count:attempt&&attempt.until>now?attempt.count+1:1,until:now+900000});fail('Username atau password salah/nonaktif.',401);
    }
    if(user.role==='guru'&&!db.prepare("SELECT 1 FROM guru WHERE id_guru=? AND status='aktif'").get(user.id_referensi)||user.role==='siswa'&&!db.prepare("SELECT 1 FROM siswa WHERE nis=? AND status='aktif'").get(user.id_referensi))fail('Profil akun tidak aktif.',401);
    if(!['admin','guru','kepala_sekolah','siswa'].includes(user.role))fail('Peran tidak dikenal.',403);attempts.delete(key);
    const profile=userProfile(user),token=createSessionToken(profile);const redirect=user.role==='admin'?'/admin':user.role==='kepala_sekolah'?'/kepsek':user.role==='siswa'?'/siswa':profile.is_piket?'/piket':'/guru';
    const response=NextResponse.json({success:true,user:profile,redirect});response.cookies.set({name:SESSION_COOKIE,value:token,httpOnly:true,path:'/',sameSite:'lax',maxAge:28800,secure:new URL(request.url).protocol==='https:'});return response;
  }catch(e){return errorResponse(e);}
}
