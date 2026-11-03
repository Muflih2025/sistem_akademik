import PortalLayout from '@/components/PortalLayout';
import Link from 'next/link';
import {
  BookOpen,
  Calendar,
  Clock,
  Award,
  UserCheck,
  FileText,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export default function GuruDashboard() {
  const navItems = [
    { label: 'Jadwal Mengajar', href: '/guru/jadwal.php', icon: Clock },
    { label: 'Presensi Siswa', href: '/guru/absen.php', icon: UserCheck },
    { label: 'Jurnal Harian KBM', href: '/guru/jurnal.php', icon: FileText },
    { label: 'Penilaian Akademik', href: '/guru/nilai.php', icon: Award },
    { label: 'Rekap Absen', href: '/guru/rekap_absen.php', icon: BookOpen },
    { label: 'Rekap Rapor', href: '/guru/rapor.php', icon: BookOpen },
    { label: 'Kalender Pendidikan', href: '/guru/kalender.php', icon: Calendar },
  ];

  return (
    <PortalLayout roleTitle="Portal Guru & Wali Kelas" roleBadge="Guru" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Presensi & Jurnal Mengajar</h2>
            <p className="text-sm text-slate-500 mt-1">
              Pencatatan absensi, input nilai capaian, dan keterlaksanaan modul pembelajaran.
            </p>
          </div>
          <a
            href="/guru/index.php"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-xs transition"
          >
            Buka Tampilan Klasik PHP
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Action quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <p className="text-xs text-slate-400">Buka modul sistem</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-blue-600 transition" />
              </a>
            );
          })}
        </div>

        {/* Schedule preview card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <h3 className="font-bold text-slate-900">Jadwal & Penugasan Mengajar</h3>
              <p className="text-xs text-slate-500">Akses langsung ke pencatatan KBM aktif</p>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full">
              Sistem Aktif
            </span>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-sm text-slate-900">Pemrograman Web & Perangkat Bergerak</p>
                <p className="text-xs text-slate-500">Kelas XII PPLG 2 • Ruang Lab RPL 1</p>
              </div>
              <div className="flex gap-2">
                <a
                  href="/guru/absen.php"
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                >
                  Presensi Siswa
                </a>
                <a
                  href="/guru/jurnal.php"
                  className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition"
                >
                  Isi Jurnal
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
