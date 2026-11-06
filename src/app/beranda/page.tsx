import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
export default async function Page() {
  const user = await getCurrentUser();
  redirect(!user ? '/auth/login' : user.role === 'admin' ? '/admin' : user.role === 'kepala_sekolah' ? '/kepsek' : user.role === 'siswa' ? '/siswa' : user.is_piket ? '/piket' : '/guru');
}
