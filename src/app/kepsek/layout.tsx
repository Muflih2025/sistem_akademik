import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
export default async function Layout({children}:{children:React.ReactNode}){const user=await getCurrentUser();if(!user)redirect('/auth/login');if(!["kepala_sekolah", "admin"].includes(user.role))redirect('/');return <>{children}</>;}
