import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const kind = searchParams.get('kind') || 'nilai';
    const id = searchParams.get('id');

    let filename = `ekspor_${kind}.csv`;
    let csvContent = '';

    if (kind === 'rapor') {
      const row = db.prepare('SELECT * FROM ak_rapor_snapshot WHERE id = ?').get(id || 137) as any;
      if (!row) return new NextResponse('Not found', { status: 404 });

      // IDOR Check
      if (user.role === 'siswa' && user.id_referensi !== row.nis) {
        return new NextResponse('Forbidden', { status: 403 });
      }

      const p = JSON.parse(row.payload_json);
      filename = `rapor_${p.siswa.nis}_${p.siswa.nama.replace(/\s+/g, '_')}.csv`;
      csvContent = `Siswa,${p.siswa.nis} - ${p.siswa.nama}\nKelas,${p.siswa.kelas}\nPeriode,${p.periode.tahun_ajaran} ${p.periode.semester}\n\nMata Pelajaran,Nilai Akhir,Predikat,Versi Aturan\n`;
      for (const n of p.nilai) {
        csvContent += `"${n.nama_mapel}",${n.nilai_akhir},${n.predikat},v${n.versi_aturan}\n`;
      }
      csvContent += `\nRekap Kehadiran\nHadir,${p.kehadiran_harian.H}\nSakit,${p.kehadiran_harian.S}\nIzin,${p.kehadiran_harian.I}\nAlpa,${p.kehadiran_harian.A}\nBelum,${p.kehadiran_harian.B}\n`;
    } else if (kind === 'piket') {
      filename = `matriks_piket_5_hari.csv`;
      const dates = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30'];
      const students = db.prepare('SELECT * FROM siswa WHERE id_kelas = 1 ORDER BY nis ASC').all() as any[];

      csvContent = `NIS,Nama Siswa,Senin (26),Selasa (27),Rabu (28),Kamis (29),Jumat (30),Total Hadir\n`;
      for (const s of students) {
        const statuses = dates.map((d) => {
          const rec = db.prepare('SELECT status FROM ak_absensi_harian WHERE nis = ? AND tanggal = ?').get(s.nis, d) as any;
          return rec ? rec.status : 'B';
        });
        const totalH = statuses.filter((st) => st === 'H').length;
        csvContent += `"${s.nis}","${s.nama_siswa}",${statuses.join(',')},${totalH}\n`;
      }
    } else {
      // Rekap nilai
      filename = `rekap_nilai_akademik.csv`;
      const rows = db.prepare(`
        SELECT n.*, s.nama_siswa, k.nama_kelas, m.nama_mapel, g.nama_guru
        FROM ak_nilai n
        JOIN siswa s ON s.nis = n.nis
        JOIN kelas k ON k.id_kelas = n.id_kelas
        JOIN mata_pelajaran m ON m.id_mapel = n.id_mapel
        JOIN guru g ON g.id_guru = n.id_guru
        ORDER BY s.nis ASC
      `).all() as any[];

      csvContent = `NIS,Nama Siswa,Kelas,Mata Pelajaran,Guru,Nilai Akhir,Predikat\n`;
      for (const r of rows) {
        csvContent += `"${r.nis}","${r.nama_siswa}","${r.nama_kelas}","${r.nama_mapel}","${r.nama_guru}",${r.nilai_akhir},"${r.predikat}"\n`;
      }
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
