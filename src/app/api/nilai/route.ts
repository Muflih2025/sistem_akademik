import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kelas = searchParams.get('kelas') || 'XII PPLG 2';

    const rows = db.prepare('SELECT * FROM nilai WHERE kelas = ? ORDER BY nama_siswa ASC').all(kelas);
    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, kelas, mapel } = body;

    const deleteStmt = db.prepare('DELETE FROM nilai WHERE kelas = ? AND mapel = ?');
    const insertStmt = db.prepare(`
      INSERT INTO nilai (kelas, nis, nama_siswa, mapel, nilai_tugas, nilai_uts, nilai_uas, nilai_akhir, predikat)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((gradesList) => {
      deleteStmt.run(kelas, mapel);
      for (const item of gradesList) {
        const akhir = Math.round(((Number(item.nilai_tugas) || 0) + (Number(item.nilai_uts) || 0) + (Number(item.nilai_uas) || 0)) / 3);
        let predikat = 'D';
        if (akhir >= 85) predikat = 'A';
        else if (akhir >= 75) predikat = 'B';
        else if (akhir >= 65) predikat = 'C';

        insertStmt.run(
          kelas,
          item.nis,
          item.nama_siswa,
          mapel,
          item.nilai_tugas,
          item.nilai_uts,
          item.nilai_uas,
          akhir,
          predikat
        );
      }
    });

    transaction(items);

    return NextResponse.json({ success: true, message: 'Nilai berhasil disimpan' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
