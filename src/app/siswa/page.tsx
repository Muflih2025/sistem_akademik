import PortalLayout from '@/components/PortalLayout';
import {
  Award,
  BookOpen,
  Calendar,
  Clock,
  UserCheck,
  CheckCircle,
  FileText
} from 'lucide-react';

export default function SiswaDashboard() {
  const navItems = [
    { label: 'Jadwal Kelas', href: '/siswa', icon: Clock },
    { label: 'Kehadiran Saya', href: '/siswa', icon: UserCheck },
    { label: 'Capaian Nilai', href: '/siswa', icon: Award },
    { label: 'Buku Rapor Digital', href: '/siswa', icon: BookOpen },
    { label: 'Agenda & Kalender', href: '/siswa', icon: Calendar },
  ];

  return (
    <PortalLayout roleTitle="Portal Siswa" roleBadge="Siswa" navItems={navItems}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Akademik Siswa</h2>
          <p className="text-sm text-slate-500 mt-1">
            Informasi presensi, materi jadwal harian, serta rekap capaian nilai rapor.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase">Tingkat Kehadiran</span>
            <div className="text-3xl font-extrabold text-emerald-600 mt-2">100%</div>
            <p className="text-xs text-slate-500 mt-1">Tanpa catatan alpa / dispensasi</p>
          </div>
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase">Rata-rata Nilai</span>
            <div className="text-3xl font-extrabold text-blue-600 mt-2">88.4</div>
            <p className="text-xs text-slate-500 mt-1">Mata pelajaran produktif & normatif</p>
          </div>
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase">Status Kelulusan</span>
            <div className="text-3xl font-extrabold text-indigo-600 mt-2">Tuntas</div>
            <p className="text-xs text-slate-500 mt-1">Semua capaian kompetensi terpenuhi</p>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
