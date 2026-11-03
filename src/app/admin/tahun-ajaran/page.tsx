'use client';

import React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Settings, Users, ShieldCheck, Calendar, Clock, Award, Upload, BookOpen, CheckCircle } from 'lucide-react';

export default function AdminTahunAjaranPage() {
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

  return (
    <PortalLayout roleTitle="Administrator - Tahun Ajaran & Jam" roleBadge="Admin" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Tahun Ajaran & Pengaturan Jam Belajar</h2>
            <p className="text-sm text-slate-500 mt-1">
              Pengelolaan periode akademik aktif, semester, dan konfigurasi master versi jam KBM sekolah.
            </p>
          </div>
          <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200">
            Status: 2026/2027 Ganjil (Aktif)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Periode Akademik Berjalan</h3>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Tahun Ajaran</span>
                <span className="font-semibold text-slate-900">2026/2027</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Semester</span>
                <span className="font-semibold text-slate-900">Ganjil</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Rentang Simulasi</span>
                <span className="font-semibold text-blue-600">26 – 30 Oktober 2026</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Status Validasi</span>
                <span className="font-semibold text-emerald-600">Terverifikasi</span>
              </div>
            </div>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Konfigurasi Jam Pelajaran</h3>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Jam Ke-1</span>
                <span className="font-mono">07.00 - 07.45</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Jam Ke-2</span>
                <span className="font-mono">07.45 - 08.30</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Istirahat 1</span>
                <span className="font-mono text-amber-600">08.30 - 08.45</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Jam Ke-3 s.d 4</span>
                <span className="font-mono">08.45 - 10.15</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
