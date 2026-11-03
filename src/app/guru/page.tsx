'use client';

import PortalLayout from '@/components/PortalLayout';
import Link from 'next/link';
import {
  BookOpen,
  Calendar,
  Clock,
  Award,
  UserCheck,
  FileText,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export default function GuruDashboard() {
  const navItems = [
    { label: 'Jadwal Mengajar', href: '/guru/jadwal', icon: Clock },
    { label: 'Presensi Siswa', href: '/guru/absen', icon: UserCheck },
    { label: 'Penilaian Akademik', href: '/guru/nilai', icon: Award },
    { label: 'Jurnal Harian KBM', href: '/guru/jurnal', icon: FileText },
    { label: 'Buku Rapor Siswa', href: '/guru/rapor', icon: BookOpen },
    { label: 'Kalender Pendidikan', href: '/guru/kalender', icon: Calendar },
  ];

  return (
    <PortalLayout roleTitle="Portal Guru & Wali Kelas" roleBadge="Guru" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2 border border-emerald-200">
              <Sparkles className="w-3.5 h-3.5" />
              Full TSX Modern Mode Aktif
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Presensi & Jurnal Mengajar</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Kelola jadwal pelajaran harian, absensi kelas interaktif, dan entri penilaian siswa secara instan.
            </p>
          </div>
        </div>

        {/* Action quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/guru/jadwal"
            className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-blue-500 hover:shadow-md transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition">
                  Jadwal Mengajar
                </h4>
                <p className="text-xs text-slate-400">Jadwal mingguan & plotting kelas</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-blue-600 transition" />
          </Link>

          <Link
            href="/guru/absen"
            className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-500 hover:shadow-md transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-slate-900 group-hover:text-emerald-600 transition">
                  Presensi Siswa
                </h4>
                <p className="text-xs text-slate-400">Absen interaktif Hadir/Sakit/Izin/Alpa</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-emerald-600 transition" />
          </Link>

          <Link
            href="/guru/nilai"
            className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-amber-500 hover:shadow-md transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-slate-900 group-hover:text-amber-600 transition">
                  Penilaian Akademik
                </h4>
                <p className="text-xs text-slate-400">Input Tugas, UTS, UAS & Kalkulasi Rapor</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-amber-600 transition" />
          </Link>
        </div>

        {/* Schedule preview card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <h3 className="font-bold text-slate-900">Jadwal Mengajar Hari Ini</h3>
              <p className="text-xs text-slate-500">Kelas XII PPLG 2 • Pemrograman Web & Perangkat Bergerak</p>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full">
              KBM Aktif
            </span>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-sm text-slate-900">Pemrograman Web & Perangkat Bergerak</p>
                <p className="text-xs text-slate-500">Kelas XII PPLG 2 • Ruang Lab RPL 1 • 07.15 - 08.45</p>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/guru/absen"
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                >
                  Buka Presensi
                </Link>
                <Link
                  href="/guru/nilai"
                  className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition"
                >
                  Buka Nilai
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
