import { NextResponse } from 'next/server';
import { actor, schedules, errorResponse, weekdays } from '@/lib/academic';
import { rows, today } from '@/lib/store';
import { studentData } from '@/lib/students';
import { listReports } from '@/lib/reports';
export async function GET() {
  try {
    const user = await actor(), date = today(), day = weekdays[new Date(date + 'T00:00:00Z').getUTCDay()];
    if (user.role === 'siswa') {
      const result = studentData(user, new URLSearchParams({ kind: 'jadwal' }));
      const data = result.data.filter(j => j.hari === day && result.memberships.some(a => a.id_kelas === j.id_kelas && a.mulai <= date && a.selesai >= date));
      return NextResponse.json({ success: true, user, date, data, stats: [{ label: 'Jadwal hari ini', value: data.length }, { label: 'Rapor terbit', value: listReports(user, new URLSearchParams()).length }], links: [{ label: 'Jadwal Kelas', href: '/siswa/jadwal' }, { label: 'Kehadiran Saya', href: '/siswa/absen' }, { label: 'Rapor Saya', href: '/siswa/rapor' }, { label: 'Kalender', href: '/siswa/kalender' }, { label: 'Jam Belajar', href: '/jam-belajar' }] });
    }
    const allowed = schedules(user), data = allowed.filter(j => j.hari === day && date >= j.mulai && date <= j.selesai && date >= j.periode_mulai && date <= j.periode_selesai);
    const meetings = rows('SELECT id_jadwal FROM ak_pertemuan WHERE tanggal=?', date);
    const stats = user.role === 'admin' ? [{ label: 'Siswa aktif', value: rows("SELECT COUNT(*) n FROM siswa WHERE status='aktif'")[0].n }, { label: 'Guru aktif', value: rows("SELECT COUNT(*) n FROM guru WHERE status='aktif'")[0].n }, { label: 'Kelas aktif', value: rows("SELECT COUNT(*) n FROM kelas WHERE status='aktif'")[0].n }, { label: 'Rapor terbit', value: rows("SELECT COUNT(*) n FROM ak_rapor_status WHERE status='diterbitkan'")[0].n }] : [{ label: 'Kelas penugasan', value: new Set(allowed.map(j => `${j.id_tahun_ajaran}/${j.id_kelas}`)).size }, { label: 'Jadwal hari ini', value: data.length }, { label: 'Jurnal hari ini terisi', value: data.filter(j => meetings.some(m => m.id_jadwal === j.id_jadwal)).length }];
    const links = user.role === 'admin' ? [{ label: 'Master Data', href: '/admin/master' }, { label: 'Tambah / Edit Pengguna', href: '/admin/users' }, { label: 'Periode & Penugasan', href: '/admin/penugasan' }, { label: 'Jadwal', href: '/admin/jadwal' }, { label: 'Rapor Semester', href: '/admin/nilai' }, { label: 'Impor Excel', href: '/admin/bulk-upload' }, { label: 'Kenaikan Kelas', href: '/admin/kenaikan' }, { label: 'Alumni', href: '/admin/alumni' }] : user.role === 'kepala_sekolah' ? [{ label: 'Pemantauan Guru', href: '/kepsek/jadwal' }, { label: 'Jurnal & Agenda', href: '/kepsek/jurnal' }, { label: 'Absensi Harian', href: '/piket' }, { label: 'Rekap Nilai', href: '/kepsek/rekap-nilai' }, { label: 'Rapor', href: '/kepsek/rapor' }, { label: 'Catatan Evaluasi', href: '/kepsek/evaluasi' }] : [{ label: 'Jadwal Mengajar', href: '/guru/jadwal' }, { label: 'Absensi & Jurnal', href: '/guru/absen' }, { label: 'Input Nilai', href: '/guru/nilai' }, { label: 'Nilai Ekstrakurikuler', href: '/guru/ekskul' }, { label: 'Impor Akademik', href: '/guru/impor' }, ...(user.is_piket ? [{ label: 'Guru Piket', href: '/piket' }] : [])];
    return NextResponse.json({ success: true, user, date, stats, links, data: data.map(j => ({ ...j, journal_filled: meetings.some(m => m.id_jadwal === j.id_jadwal) })) });
  } catch (e) { return errorResponse(e); }
}
