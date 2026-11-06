import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
export default async function Layout({ children }: { children: React.ReactNode }) {
  if (!await getCurrentUser()) redirect('/auth/login');
  return <>{children}</>;
}
