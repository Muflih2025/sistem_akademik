import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kelas = searchParams.get('kelas');
    const hari = searchParams.get('hari');

    let query = 'SELECT * FROM jadwal WHERE 1=1';
    const params: any[] = [];

    if (kelas) {
      query += ' AND kelas = ?';
      params.push(kelas);
    }
    if (hari) {
      query += ' AND hari = ?';
      params.push(hari);
    }

    query += ' ORDER BY id ASC';
    const rows = db.prepare(query).all(...params);
    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { hari, jam_ke, jam_mulai, jam_selesai, mapel, kelas, ruang, guru_nama } = body;

    const stmt = db.prepare(`
      INSERT INTO jadwal (hari, jam_ke, jam_mulai, jam_selesai, mapel, kelas, ruang, guru_nama)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(hari, jam_ke, jam_mulai, jam_selesai, mapel, kelas, ruang, guru_nama);

    return NextResponse.json({ success: true, id: result.lastInsertRowid });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
