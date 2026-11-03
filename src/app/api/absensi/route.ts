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
    const id_jadwal = searchParams.get('id_jadwal');
    const tanggal = searchParams.get('tanggal');
    const id_kelas = searchParams.get('id_kelas');

    let query = `
      SELECT h.*, s.nama_siswa, s.nis, k.nama_kelas
      FROM ak_absensi_harian h
      JOIN siswa s ON s.nis = h.nis
      JOIN kelas k ON k.id_kelas = h.id_kelas
      WHERE 1=1
    `;
    const params: any[] = [];

    if (tanggal) {
      query += ' AND h.tanggal = ?';
      params.push(tanggal);
    }
    if (id_kelas) {
      query += ' AND h.id_kelas = ?';
      params.push(id_kelas);
    }

    query += ' ORDER BY s.nis ASC';
    const rows = db.prepare(query).all(...params);

    return NextResponse.json({ success: true, data: rows });
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

    // Role check: guru, guru piket, atau admin
    if (!['guru', 'admin'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 403 });
    }

    const body = await request.json();
    const { tanggal, id_kelas, items, id_jadwal, materi, refleksi, alasan } = body;

    if (!tanggal || !items || !Array.isArray(items)) {
      return NextResponse.json({ success: false, error: 'Data absensi tidak valid' }, { status: 400 });
    }

    const updateHarian = db.prepare(`
      INSERT INTO ak_absensi_harian (
        tanggal, nis, id_tahun_ajaran, id_kelas, id_anggota, status, keterangan, metode, bukti_json, evidence_hash, revision, created_by, updated_by
      ) VALUES (?, ?, 1, ?, 1, ?, ?, 'manual', '{}', 'hash_simulation', 1, ?, ?)
      ON CONFLICT(tanggal, nis) DO UPDATE SET
        status = excluded.status,
        keterangan = excluded.keterangan,
        updated_by = excluded.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `);

    const tx = db.transaction((list) => {
      for (const it of list) {
        updateHarian.run(
          tanggal,
          it.nis,
          id_kelas || 1,
          it.status || 'H',
          it.catatan || it.keterangan || '',
          user.id_user,
          user.id_user
        );
      }
    });

    tx(items);

    return NextResponse.json({ success: true, message: 'Absensi harian berhasil disimpan.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
