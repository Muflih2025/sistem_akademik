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
    const id_kelas = searchParams.get('id_kelas');
    const tanggal = searchParams.get('tanggal');

    if (id) {
      const row = db.prepare(`
        SELECT p.*, g.nama_guru, k.nama_kelas, m.nama_mapel
        FROM ak_pertemuan p
        JOIN guru g ON g.id_guru = p.id_guru
        JOIN kelas k ON k.id_kelas = p.id_kelas
        JOIN mata_pelajaran m ON m.id_mapel = p.id_mapel
        WHERE p.id = ?
      `).get(id);
      return NextResponse.json({ success: true, data: row });
    }

    let query = `
      SELECT p.*, g.nama_guru, k.nama_kelas, m.nama_mapel
      FROM ak_pertemuan p
      JOIN guru g ON g.id_guru = p.id_guru
      JOIN kelas k ON k.id_kelas = p.id_kelas
      JOIN mata_pelajaran m ON m.id_mapel = p.id_mapel
      WHERE 1=1
    `;
    const params: any[] = [];

    if (id_kelas) {
      query += ' AND p.id_kelas = ?';
      params.push(id_kelas);
    }
    if (tanggal) {
      query += ' AND p.tanggal = ?';
      params.push(tanggal);
    }

    query += ' ORDER BY p.tanggal DESC, p.id DESC';
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

    if (!['guru', 'admin'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 403 });
    }

    const body = await request.json();
    const { id_jadwal, tanggal, pertemuan_ke, jam_ke, tp_atp, materi, kegiatan, refleksi, catatan, tindak_lanjut } = body;

    const j = db.prepare('SELECT * FROM jadwal WHERE id_jadwal = ?').get(id_jadwal || 1) as any;
    if (!j) {
      return NextResponse.json({ success: false, error: 'Jadwal tidak ditemukan' }, { status: 404 });
    }

    const insertOrUpdate = db.prepare(`
      INSERT INTO ak_pertemuan (
        id_jadwal, id_tahun_ajaran, id_kelas, id_guru, id_mapel,
        tanggal, pertemuan_ke, jam_ke, tp_atp, materi, kegiatan,
        refleksi, catatan, tindak_lanjut, revision, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(id_jadwal, tanggal) DO UPDATE SET
        pertemuan_ke = excluded.pertemuan_ke,
        jam_ke = excluded.jam_ke,
        tp_atp = excluded.tp_atp,
        materi = excluded.materi,
        kegiatan = excluded.kegiatan,
        refleksi = excluded.refleksi,
        catatan = excluded.catatan,
        tindak_lanjut = excluded.tindak_lanjut,
        updated_by = excluded.updated_by,
        revision = revision + 1,
        updated_at = CURRENT_TIMESTAMP
    `);

    insertOrUpdate.run(
      j.id_jadwal,
      j.id_tahun_ajaran || 1,
      j.id_kelas,
      j.id_guru,
      j.id_mapel,
      tanggal,
      pertemuan_ke || 1,
      jam_ke || '1–2',
      tp_atp || 'Simulasi TP/ATP',
      materi || 'Materi KBM Terverifikasi',
      kegiatan || 'Diskusi dan Latihan',
      refleksi || 'Refleksi pembelajaran tersimpan',
      catatan || 'SIMULASI KBM',
      tindak_lanjut || 'Latihan pertemuan berikutnya',
      user.id_user,
      user.id_user
    );

    return NextResponse.json({ success: true, message: 'Jurnal kelas & agenda guru berhasil disimpan.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
