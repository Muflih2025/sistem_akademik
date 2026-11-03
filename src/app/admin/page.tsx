'use client';

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
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export default function AdminDashboard() {
  const navItems = [
    { label: 'Master Data', href: '/admin/master', icon: Settings },
    { label: 'Pengguna & Akun', href: '/admin/users', icon: Users },
    { label: 'Penugasan Guru', href: '/admin/penugasan', icon: ShieldCheck },
    { label: 'Tahun Ajaran', href: '/admin/tahun-ajaran', icon: Calendar },
    { label: 'Jadwal Pelajaran', href: '/admin/jadwal', icon: Clock },
    { label: 'Nilai & Verifikasi', href: '/admin/nilai', icon: Award },
    { label: 'Bulk Upload Data', href: '/admin/bulk-upload', icon: Upload },
    { label: 'Ekspor Impor', href: '/admin/export-import', icon: BookOpen },
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Administrator</h2>
            <p className="text-sm text-slate-500 mt-1">
              Pengelolaan master data, pengguna, dan alur administrasi akademik semester berjalan.
            </p>
          </div>
          <a
            href="/admin"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-xs transition"
          >
            Buka Panel Admin
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
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

        {/* Action quick links */}
        <div>
          <h3 className="font-bold text-slate-900 text-sm mb-3">Modul Administrasi Utama</h3>
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
                      <p className="text-xs text-slate-400">Buka modul</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-blue-600 transition" />
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
