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
    const table = searchParams.get('table') || 'siswa';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const q = searchParams.get('q') || '';

    let rows: any[] = [];
    let total = 0;

    if (table === 'siswa') {
      let sql = 'SELECT s.*, k.nama_kelas, j.nama_jurusan FROM siswa s LEFT JOIN kelas k ON s.id_kelas=k.id_kelas LEFT JOIN jurusan j ON k.id_jurusan=j.id_jurusan WHERE 1=1';
      const args: any[] = [];
      if (q) {
        sql += ' AND (s.nis LIKE ? OR s.nama_siswa LIKE ?)';
        args.push(`%${q}%`, `%${q}%`);
      }
      total = (db.prepare(sql.replace('SELECT s.*, k.nama_kelas, j.nama_jurusan', 'SELECT COUNT(*) as c')).get(...args) as any).c;
      sql += ' ORDER BY s.nis ASC LIMIT ? OFFSET ?';
      args.push(limit, offset);
      rows = db.prepare(sql).all(...args);
    } else if (table === 'kelas') {
      rows = db.prepare('SELECT k.*, j.nama_jurusan, (SELECT COUNT(*) FROM siswa s WHERE s.id_kelas=k.id_kelas) as jumlah_siswa FROM kelas k LEFT JOIN jurusan j ON k.id_jurusan=j.id_jurusan ORDER BY k.id_kelas ASC').all();
      total = rows.length;
    } else if (table === 'guru') {
      rows = db.prepare('SELECT * FROM guru ORDER BY id_guru ASC').all();
      total = rows.length;
    } else if (table === 'jurusan') {
      rows = db.prepare('SELECT * FROM jurusan ORDER BY id_jurusan ASC').all();
      total = rows.length;
    } else if (table === 'ruang') {
      rows = db.prepare('SELECT * FROM ak_ruang ORDER BY kode_ruang ASC').all();
      total = rows.length;
    } else if (table === 'mapel') {
      rows = db.prepare('SELECT * FROM mata_pelajaran ORDER BY id_mapel ASC').all();
      total = rows.length;
    }

    return NextResponse.json({ success: true, table, total, data: rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
