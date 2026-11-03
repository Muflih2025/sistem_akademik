import PortalLayout from '@/components/PortalLayout';
import {
  Award,
  BookOpen,
  Calendar,
  Clock,
  UserCheck,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export default function SiswaDashboard() {
  const navItems = [
    { label: 'Jadwal Kelas', href: '/siswa/jadwal', icon: Clock },
    { label: 'Kehadiran Saya', href: '/siswa/absen', icon: UserCheck },
    { label: 'Buku Rapor Digital', href: '/siswa/rapor', icon: BookOpen },
    { label: 'Agenda & Kalender', href: '/siswa/kalender', icon: Calendar },
  ];

  return (
    <PortalLayout roleTitle="Portal Siswa" roleBadge="Siswa" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Akademik Siswa</h2>
            <p className="text-sm text-slate-500 mt-1">
              Informasi presensi, materi jadwal harian, serta rekap capaian nilai rapor.
            </p>
          </div>
          <a
            href="/siswa"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-xs transition"
          >
            Buka Portal Siswa
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Action quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.label}
                href={item.href}
                className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-md transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition">
                      {item.label}
                    </h4>
                    <p className="text-xs text-slate-400">Buka halaman</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-blue-600 transition" />
              </a>
            );
          })}
        </div>
      </div>
    </PortalLayout>
  );
}
