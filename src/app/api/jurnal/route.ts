import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kelas = searchParams.get('kelas');
    const guru_username = searchParams.get('guru_username');
    const tanggal = searchParams.get('tanggal');

    let query = 'SELECT * FROM jurnal WHERE 1=1';
    const params: any[] = [];

    if (kelas) {
      query += ' AND kelas = ?';
      params.push(kelas);
    }
    if (guru_username) {
      query += ' AND guru_username = ?';
      params.push(guru_username);
    }
    if (tanggal) {
      query += ' AND tanggal = ?';
      params.push(tanggal);
    }

    query += ' ORDER BY tanggal DESC, id DESC';
    const rows = db.prepare(query).all(...params);
    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tanggal, guru_nama, guru_username, kelas, mapel, materi, refleksi, kehadiran_ringkas } = body;

    const stmt = db.prepare(`
      INSERT INTO jurnal (tanggal, guru_nama, guru_username, kelas, mapel, materi, refleksi, kehadiran_ringkas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      tanggal,
      guru_nama || 'Budi Santoso, S.Kom',
      guru_username || 'uji_guru',
      kelas,
      mapel,
      materi,
      refleksi || null,
      kehadiran_ringkas || '20 Hadir, 0 Alpa'
    );

    return NextResponse.json({ success: true, id: result.lastInsertRowid });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
