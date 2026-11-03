import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createSessionToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username dan password harus diisi.' },
        { status: 400 }
      );
    }

    const user = db
      .prepare("SELECT * FROM users WHERE username = ? AND status = 'aktif'")
      .get(username) as any;

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Username atau password salah/nonaktif.' },
        { status: 401 }
      );
    }

    // Verify password with bcrypt (supports PHP $2y$ prefix converted to $2a$)
    const hash = user.password.replace(/^\$2y\$/, '$2a$');
    const isValid = bcrypt.compareSync(password, hash);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Username atau password salah/nonaktif.' },
        { status: 401 }
      );
    }

    // Ambil nama profil dari tabel guru / siswa
    let nama = user.username;
    let isPiket = false;

    if (user.role === 'guru') {
      const g = db.prepare('SELECT nama_guru FROM guru WHERE id_guru = ?').get(user.id_referensi) as any;
      if (g) nama = g.nama_guru;
      // Cek apakah guru piket aktif
      const p = db.prepare('SELECT 1 FROM ak_tugas_piket WHERE id_guru = ? AND aktif = 1').get(user.id_referensi);
      if (p) isPiket = true;
    } else if (user.role === 'siswa') {
      const s = db.prepare('SELECT nama_siswa FROM siswa WHERE nis = ?').get(user.id_referensi) as any;
      if (s) nama = s.nama_siswa;
    } else if (user.role === 'admin') {
      nama = 'Administrator SIA';
    } else if (user.role === 'kepala_sekolah') {
      nama = 'Drs. H. Muflih, M.Pd (Kepala Sekolah)';
    }

    const authUser = {
      id_user: String(user.id_user),
      username: user.username,
      role: user.role,
      id_referensi: user.id_referensi,
      nama,
      is_piket: isPiket,
    };

    const token = createSessionToken(authUser as any);

    // Redirect mapping
    let redirect = '/guru';
    if (user.role === 'admin') redirect = '/admin';
    else if (user.role === 'kepala_sekolah') redirect = '/kepsek';
    else if (user.role === 'siswa') redirect = '/siswa';
    else if (isPiket) redirect = '/piket';

    const response = NextResponse.json({
      success: true,
      user: authUser,
      redirect,
    });

    // Set secure HTTP-only session cookie
    response.cookies.set({
      name: 'sia_session_token',
      value: token,
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Layanan login sementara tidak tersedia.' },
      { status: 500 }
    );
  }
}
