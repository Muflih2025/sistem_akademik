import { getCurrentUser } from './auth';
import { redirect } from 'next/navigation';
const destinations: Record<string, Record<string, string>> = {
  jadwal: { admin: '/admin/jadwal', guru: '/guru/jadwal', kepala_sekolah: '/kepsek/jadwal', siswa: '/siswa/jadwal' },
  kalender: { admin: '/admin/kalender', guru: '/guru/kalender', kepala_sekolah: '/kepsek/kalender', siswa: '/siswa/kalender' },
  nilai: { admin: '/admin/rekap-nilai', guru: '/guru/nilai', kepala_sekolah: '/kepsek/rekap-nilai', siswa: '/siswa/rapor' },
  rapor: { admin: '/admin/nilai', guru: '/guru/rapor', kepala_sekolah: '/kepsek/rapor', siswa: '/siswa/rapor' },
  jurnal: { admin: '/admin/jurnal', guru: '/guru/jurnal', kepala_sekolah: '/kepsek/jurnal', siswa: '/siswa/absen' },
  absensi: { admin: '/guru/absen', guru: '/guru/absen', kepala_sekolah: '/piket', siswa: '/siswa/absen' },
};
export async function portalRedirect(module: string, search: Record<string, string | string[] | undefined>) {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');
  const target = destinations[module]?.[user.role] || '/beranda', query = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) if (typeof value === 'string') query.set(key, value);
  redirect(target + (query.size ? '?' + query : ''));
}
