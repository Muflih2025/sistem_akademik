import PortalLayout from '@/components/PortalLayout';
import {
  Award,
  BookOpen,
  Calendar,
  Clock,
  BarChart3,
  TrendingUp,
  Users
} from 'lucide-react';

export default function KepsekDashboard() {
  const navItems = [
    { label: 'Ringkasan Eksekutif', href: '/kepsek', icon: BarChart3 },
    { label: 'Monitoring KBM', href: '/kepsek', icon: Clock },
    { label: 'Distribusi Nilai', href: '/kepsek', icon: TrendingUp },
    { label: 'Progres Rapor', href: '/kepsek', icon: Award },
    { label: 'Kalender Akademik', href: '/kepsek', icon: Calendar },
  ];

  return (
    <PortalLayout roleTitle="Portal Kepala Sekolah" roleBadge="Pimpinan" navItems={navItems}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Monitoring & Evaluasi KBM</h2>
          <p className="text-sm text-slate-500 mt-1">
            Pengawasan real-time keterlaksanaan jadwal mengajar dan ketuntasan penilaian belajar.
          </p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="font-bold text-slate-900 mb-2">Keterlaksanaan Jam Pelajaran Minggu Ini</h3>
          <p className="text-sm text-slate-500 mb-4">
            99.2% jam tatap muka terlaksana sesuai plotting jadwal kurikulum nasional.
          </p>
          <div className="w-full bg-slate-100 rounded-full h-3">
            <div className="bg-emerald-500 h-3 rounded-full" style={{ width: '99.2%' }}></div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
