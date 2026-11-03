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
    const id_kelas = searchParams.get('id_kelas');
    const id_guru = searchParams.get('id_guru');
    const hari = searchParams.get('hari');

    let query = `
      SELECT j.*, g.nama_guru, k.nama_kelas, m.nama_mapel, r.nama_ruang
      FROM jadwal j
      LEFT JOIN guru g ON g.id_guru = j.id_guru
      LEFT JOIN kelas k ON k.id_kelas = j.id_kelas
      LEFT JOIN mata_pelajaran m ON m.id_mapel = j.id_mapel
      LEFT JOIN ak_ruang r ON r.kode_ruang = j.ruang OR r.nama_ruang = j.ruang
      WHERE j.status = 'aktif'
    `;
    const params: any[] = [];

    if (id_kelas) {
      query += ' AND j.id_kelas = ?';
      params.push(id_kelas);
    }
    if (id_guru) {
      query += ' AND j.id_guru = ?';
      params.push(id_guru);
    }
    if (hari) {
      query += ' AND j.hari = ?';
      params.push(hari);
    }

    query += ' ORDER BY j.id_jadwal ASC';
    const rows = db.prepare(query).all(...params);

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
