import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { actor,checkWrite,errorResponse,fail } from '@/lib/academic';
import { SESSION_COOKIE } from '@/lib/auth';
import { audit } from '@/lib/store';
export async function POST(request:Request) {
  try{const u=await actor();checkWrite(request);const b=await request.json();
    if(typeof b.new_password!=='string'||typeof b.old_password!=='string'||b.new_password.length<8||Buffer.byteLength(b.new_password)>72||b.new_password!==b.confirm_password)fail('Password baru harus 8–72 byte dan konfirmasinya sama.');
    const before=db.prepare('SELECT password FROM users WHERE id_user=?').get(u.id_user) as any;
    if(!before||!await bcrypt.compare(b.old_password,before.password.replace(/^\$2y\$/,'$2a$')))fail('Password lama tidak sesuai.');
    const password=await bcrypt.hash(b.new_password,12);db.transaction(()=>{db.prepare('UPDATE users SET password=? WHERE id_user=?').run(password,u.id_user);audit(u,'users',u.id_user,null,{password_changed:true},'Perubahan password sendiri');}).immediate();
    const r=NextResponse.json({success:true,message:'Password diperbarui. Silakan login kembali.'});r.cookies.set(SESSION_COOKIE,'',{path:'/',maxAge:0,httpOnly:true,sameSite:'lax'});return r;
  }catch(e){return errorResponse(e);}
}
