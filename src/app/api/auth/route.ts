import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username dan password harus diisi' },
        { status: 400 }
      );
    }

    const user = db
      .prepare('SELECT * FROM users WHERE username = ? AND password = ? AND is_active = 1')
      .get(username, password) as any;

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Username atau password salah, atau akun nonaktif' },
        { status: 401 }
      );
    }

    // Map role to portal redirect path
    const roleRedirects: Record<string, string> = {
      admin: '/admin',
      guru: '/guru',
      kepsek: '/kepsek',
      siswa: '/siswa',
      piket: '/piket',
      wali: '/guru', // wali uses guru portal view
    };

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        nama: user.nama,
        role: user.role,
        nip_nis: user.nip_nis,
        kelas: user.kelas,
      },
      redirect: roleRedirects[user.role] || '/guru',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
