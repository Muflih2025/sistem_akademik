import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const row = db.prepare('SELECT * FROM ak_rapor_snapshot WHERE id = ?').get(id) as any;
      if (!row) {
        return NextResponse.json({ success: false, error: 'Rapor tidak ditemukan' }, { status: 404 });
      }

      // Proteksi IDOR (sesuai test.md: Siswa hanya rapor sendiri; tidak boleh membaca rapor siswa lain)
      if (user.role === 'siswa' && user.id_referensi !== row.nis) {
        return NextResponse.json({ success: false, error: 'Akses ditolak: Anda hanya berhak mengakses rapor sendiri.' }, { status: 403 });
      }

      const payload = JSON.parse(row.payload_json);
      return NextResponse.json({ success: true, data: { ...row, payload } });
    }

    // List rapor
    let rows;
    if (user.role === 'siswa') {
      rows = db.prepare('SELECT * FROM ak_rapor_snapshot WHERE nis = ?').all(user.id_referensi);
    } else {
      rows = db.prepare('SELECT * FROM ak_rapor_snapshot ORDER BY id DESC').all();
    }

    const data = rows.map((r: any) => ({
      ...r,
      payload: JSON.parse(r.payload_json),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
