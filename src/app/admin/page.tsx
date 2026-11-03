import PortalLayout from '@/components/PortalLayout';
import {
  Users,
  Calendar,
  Clock,
  BookOpen,
  Award,
  Upload,
  Settings,
  ShieldCheck,
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';

export default function AdminDashboard() {
  const navItems = [
    { label: 'Dashboard', href: '/admin', icon: ShieldCheck },
    { label: 'Master Data', href: '/admin', icon: Settings },
    { label: 'Pengguna', href: '/admin', icon: Users },
    { label: 'Tahun Ajaran', href: '/admin', icon: Calendar },
    { label: 'Plotting & Jam', href: '/admin', icon: Clock },
    { label: 'Nilai & Verifikasi', href: '/admin', icon: Award },
    { label: 'Bulk Upload', href: '/admin', icon: Upload },
  ];

  const stats = [
    { label: 'Total Siswa Aktif', val: '840', sub: 'Terbagi 24 Rombel', icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Guru & Tendik', val: '58', sub: 'Semua Status Terverifikasi', icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Rombongan Belajar', val: '24', sub: 'Tingkat X, XI, XII', icon: BookOpen, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Kesiapan Rapor', val: '98.5%', sub: 'Siap Cetak & Distribusi', icon: Award, color: 'text-amber-600 bg-amber-50' },
  ];

  return (
    <PortalLayout roleTitle="Administrator Akademik" roleBadge="Admin" navItems={navItems}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Administrator</h2>
          <p className="text-sm text-slate-500 mt-1">
            Pengelolaan master data, pengguna, dan alur administrasi akademik semester berjalan.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase">{item.label}</span>
                  <div className={`p-2 rounded-xl ${item.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-extrabold text-slate-900">{item.val}</div>
                  <div className="text-xs text-slate-500 mt-1">{item.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Fast Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              Kelola Master & Bulk Upload
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Impor atau ekspor data siswa, mata pelajaran, penugasan guru piket, dan jam mengajar mingguan.
            </p>
            <div className="mt-4 flex gap-3">
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition">
                Import Excel/CSV
              </button>
              <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition">
                Download Template
              </button>
            </div>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              Status Verifikasi Rapor
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              24 dari 24 kelas telah mengirimkan nilai capaian. Buku rapor digital siap dipublikasikan.
            </p>
            <div className="mt-4 flex gap-3">
              <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition">
                Verifikasi Rapor
              </button>
              <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition">
                Rekap Cetak Massal
              </button>
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
