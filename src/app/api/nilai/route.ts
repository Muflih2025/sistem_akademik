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
    const nis = searchParams.get('nis');
    const id_mapel = searchParams.get('id_mapel');

    // Siswa hanya boleh melihat nilainya sendiri (IDOR Protection)
    if (user.role === 'siswa' && nis && nis !== user.id_referensi) {
      return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 403 });
    }

    let query = `
      SELECT n.*, s.nama_siswa, k.nama_kelas, m.nama_mapel, g.nama_guru
      FROM ak_nilai n
      JOIN siswa s ON s.nis = n.nis
      JOIN kelas k ON k.id_kelas = n.id_kelas
      JOIN mata_pelajaran m ON m.id_mapel = n.id_mapel
      JOIN guru g ON g.id_guru = n.id_guru
      WHERE 1=1
    `;
    const params: any[] = [];

    if (user.role === 'siswa') {
      query += ' AND n.nis = ?';
      params.push(user.id_referensi);
    } else if (nis) {
      query += ' AND n.nis = ?';
      params.push(nis);
    }

    if (id_kelas) {
      query += ' AND n.id_kelas = ?';
      params.push(id_kelas);
    }
    if (id_mapel) {
      query += ' AND n.id_mapel = ?';
      params.push(id_mapel);
    }

    query += ' ORDER BY s.nis ASC';
    const rows = db.prepare(query).all(...params);

    const formatted = rows.map((r: any) => {
      let komp = {};
      try {
        komp = JSON.parse(r.komponen_json || '{}');
      } catch {}
      return {
        ...r,
        komponen: komp,
      };
    });

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!['guru', 'admin'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 403 });
    }

    const body = await request.json();
    const { items, id_mapel, id_kelas, alasan } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Data nilai kosong.' }, { status: 400 });
    }

    // Validasi nilai 0-100 (sesuai test.md: penolakan nilai 101 atau < 0)
    for (const it of items) {
      const tugas = Number(it.nilai_tugas ?? it.tugas ?? 0);
      const uts = Number(it.nilai_uts ?? it.uts ?? 0);
      const uas = Number(it.nilai_uas ?? it.uas ?? 0);

      if (tugas < 0 || tugas > 100 || uts < 0 || uts > 100 || uas < 0 || uas > 100) {
        return NextResponse.json(
          {
            success: false,
            error: `Nilai untuk siswa NIS ${it.nis} tidak valid (${tugas}/${uts}/${uas}). Nilai harus berada dalam rentang 0 - 100.`,
          },
          { status: 422 }
        );
      }
    }

    const updateStmt = db.prepare(`
      UPDATE ak_nilai
      SET komponen_json = ?, nilai_akhir = ?, predikat = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE nis = ? AND id_mapel = ?
    `);

    const tx = db.transaction((list) => {
      for (const it of list) {
        const tugas = Number(it.nilai_tugas ?? it.tugas ?? 0);
        const uts = Number(it.nilai_uts ?? it.uts ?? 0);
        const uas = Number(it.nilai_uas ?? it.uas ?? 0);
        const akhir = Math.round((tugas * 0.3) + (uts * 0.3) + (uas * 0.4));
        let predikat = 'D';
        if (akhir >= 85) predikat = 'A';
        else if (akhir >= 75) predikat = 'B';
        else if (akhir >= 65) predikat = 'C';

        const json = JSON.stringify({ tugas, uts, uas, praktik: 0, proyek: 0 });
        updateStmt.run(json, akhir.toFixed(2), predikat, user.id_user, it.nis, id_mapel || 1);
      }
    });

    tx(items);

    return NextResponse.json({ success: true, message: 'Nilai akademik berhasil disimpan.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
