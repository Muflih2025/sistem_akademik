import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Silakan login terlebih dahulu.' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 403 });
  try {
    const q = new URL(request.url).searchParams;
    const params: string[] = [];
    let sql = `SELECT u.id_user, u.id_user AS id, u.username, u.role, u.id_referensi, u.status,
      COALESCE(g.nama_guru, s.nama_siswa, u.username) AS nama,
      COALESCE(g.nip, s.nis, '') AS nip_nis, k.nama_kelas AS kelas,
      CASE WHEN u.status='aktif' THEN 1 ELSE 0 END AS is_active
      FROM users u
      LEFT JOIN guru g ON u.role='guru' AND g.id_guru=u.id_referensi
      LEFT JOIN siswa s ON u.role='siswa' AND s.nis=u.id_referensi
      LEFT JOIN kelas k ON k.id_kelas=s.id_kelas WHERE 1=1`;
    if (q.get('role')) { sql += ' AND u.role=?'; params.push(q.get('role')!); }
    if (q.get('username')) { sql += ' AND u.username=?'; params.push(q.get('username')!); }
    const data = db.prepare(sql + ' ORDER BY u.role, nama, u.id_user').all(...params);
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: 'Data akun tidak dapat dimuat.' }, { status: 500 });
  }
}
