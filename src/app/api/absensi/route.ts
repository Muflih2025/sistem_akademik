import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kelas = searchParams.get('kelas') || 'XII PPLG 2';
    const tanggal = searchParams.get('tanggal') || '2026-11-03';

    const rows = db.prepare('SELECT * FROM absensi WHERE kelas = ? AND tanggal = ?').all(kelas, tanggal);
    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, kelas, tanggal } = body; // items: [{ nis, nama_siswa, status, catatan }]

    const updateStmt = db.prepare(`
      INSERT INTO absensi (tanggal, kelas, nis, nama_siswa, status, catatan)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET status=excluded.status, catatan=excluded.catatan
    `);

    // In simple SQLite, let's delete existing for date & class then insert
    const deleteStmt = db.prepare('DELETE FROM absensi WHERE tanggal = ? AND kelas = ?');
    const insertStmt = db.prepare('INSERT INTO absensi (tanggal, kelas, nis, nama_siswa, status, catatan) VALUES (?, ?, ?, ?, ?, ?)');

    const transaction = db.transaction((attendanceList) => {
      deleteStmt.run(tanggal, kelas);
      for (const item of attendanceList) {
        insertStmt.run(tanggal, kelas, item.nis, item.nama_siswa, item.status, item.catatan || '');
      }
    });

    transaction(items);

    return NextResponse.json({ success: true, message: 'Presensi berhasil disimpan' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
