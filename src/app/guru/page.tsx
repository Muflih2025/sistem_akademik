import PortalLayout from '@/components/PortalLayout';
import {
  BookOpen,
  Calendar,
  Clock,
  Award,
  UserCheck,
  CheckCircle2,
  FileText
} from 'lucide-react';

export default function GuruDashboard() {
  const navItems = [
    { label: 'Jadwal Mengajar', href: '/guru', icon: Clock },
    { label: 'Presensi Siswa', href: '/guru', icon: UserCheck },
    { label: 'Jurnal Harian KBM', href: '/guru', icon: FileText },
    { label: 'Penilaian Akademik', href: '/guru', icon: Award },
    { label: 'Rekap Rapor', href: '/guru', icon: BookOpen },
    { label: 'Kalender Pendidikan', href: '/guru', icon: Calendar },
  ];

  return (
    <PortalLayout roleTitle="Portal Guru & Wali Kelas" roleBadge="Guru" navItems={navItems}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Presensi & Jurnal Mengajar</h2>
          <p className="text-sm text-slate-500 mt-1">
            Penugasan mengajar aktif, pencatatan absensi, dan keterlaksanaan modul pembelajaran.
          </p>
        </div>

        {/* Schedule preview card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <h3 className="font-bold text-slate-900">Jadwal Mengajar Hari Ini</h3>
              <p className="text-xs text-slate-500">Senin, Jam ke-1 s.d ke-4</p>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full">
              KBM Berlangsung
            </span>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-slate-900">Pemrograman Web & Perangkat Bergerak</p>
                <p className="text-xs text-slate-500">Kelas XII PPLG 2 • Ruang Lab RPL 1 • 07.15 - 08.45</p>
              </div>
              <button className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition">
                Buka Jurnal & Absen
              </button>
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
