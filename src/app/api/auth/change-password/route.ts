import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Silakan login terlebih dahulu.' }, { status: 401 });
    }

    const { old_password, new_password, confirm_password } = await request.json();

    if (!old_password || !new_password || !confirm_password) {
      return NextResponse.json({ success: false, error: 'Data password tidak lengkap.' }, { status: 400 });
    }

    if (new_password !== confirm_password) {
      return NextResponse.json({ success: false, error: 'Konfirmasi password baru tidak cocok.' }, { status: 400 });
    }

    if (new_password.length < 8) {
      return NextResponse.json({ success: false, error: 'Password baru minimal 8 karakter.' }, { status: 400 });
    }

    const row = db.prepare('SELECT password FROM users WHERE id_user = ?').get(user.id_user) as any;
    if (!row) {
      return NextResponse.json({ success: false, error: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    const hash = row.password.replace(/^\$2y\$/, '$2a$');
    if (!bcrypt.compareSync(old_password, hash)) {
      return NextResponse.json({ success: false, error: 'Password lama tidak sesuai.' }, { status: 400 });
    }

    const newHash = bcrypt.hashSync(new_password, 12);
    db.prepare('UPDATE users SET password = ? WHERE id_user = ?').run(newHash, user.id_user);

    return NextResponse.json({ success: true, message: 'Password berhasil diperbarui.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
