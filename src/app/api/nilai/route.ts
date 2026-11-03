import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kelas = searchParams.get('kelas') || 'XII PPLG 2';
    const nis = searchParams.get('nis');

    let query = 'SELECT * FROM nilai WHERE kelas = ?';
    const params: any[] = [kelas];

    if (nis) {
      query += ' AND nis = ?';
      params.push(nis);
    }

    query += ' ORDER BY nama_siswa ASC';
    const rows = db.prepare(query).all(...params);
    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, kelas, mapel } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Data nilai kosong.' }, { status: 400 });
    }

    // Validasi nilai 0-100 (sesuai test.md: penolakan nilai 101 atau < 0)
    for (const item of items) {
      const tugas = Number(item.nilai_tugas);
      const uts = Number(item.nilai_uts);
      const uas = Number(item.nilai_uas);

      if (isNaN(tugas) || tugas < 0 || tugas > 100 ||
          isNaN(uts) || uts < 0 || uts > 100 ||
          isNaN(uas) || uas < 0 || uas > 100) {
        return NextResponse.json(
          {
            success: false,
            error: `Nilai untuk siswa ${item.nama_siswa || item.nis} tidak valid (${tugas}/${uts}/${uas}). Nilai harus berada dalam rentang 0 - 100.`,
          },
          { status: 422 }
        );
      }
    }

    const deleteStmt = db.prepare('DELETE FROM nilai WHERE kelas = ? AND mapel = ?');
    const insertStmt = db.prepare(`
      INSERT INTO nilai (kelas, nis, nama_siswa, mapel, nilai_tugas, nilai_uts, nilai_uas, nilai_akhir, predikat)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((gradesList) => {
      deleteStmt.run(kelas, mapel);
      for (const item of gradesList) {
        const tugas = Number(item.nilai_tugas) || 0;
        const uts = Number(item.nilai_uts) || 0;
        const uas = Number(item.nilai_uas) || 0;
        // Bobot: Tugas 30%, UTS 30%, UAS 40% (sesuai test.md)
        const akhir = Math.round((tugas * 0.3) + (uts * 0.3) + (uas * 0.4));
        let predikat = 'D';
        if (akhir >= 85) predikat = 'A';
        else if (akhir >= 75) predikat = 'B';
        else if (akhir >= 65) predikat = 'C';

        insertStmt.run(
          kelas,
          item.nis,
          item.nama_siswa,
          mapel,
          tugas,
          uts,
          uas,
          akhir,
          predikat
        );
      }
    });

    transaction(items);

    return NextResponse.json({ success: true, message: 'Nilai berhasil disimpan dan diverifikasi' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
