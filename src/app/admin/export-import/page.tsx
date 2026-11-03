'use client';

import React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Settings, Users, ShieldCheck, Calendar, Clock, Award, Upload, BookOpen, Download, Database } from 'lucide-react';

export default function AdminExportImportPage() {
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
    <PortalLayout roleTitle="Administrator - Ekspor Impor" roleBadge="Admin" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Ekspor & Impor Cadangan Data</h2>
            <p className="text-sm text-slate-500 mt-1">
              Pencadangan database SQLite, snapshot data terverifikasi, dan ekspor berkas CSV/Excel.
            </p>
          </div>
          <span className="px-3.5 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-xl border border-blue-200">
            Database: SQLite (sia.db)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Cadangan Database Lengkap</h4>
                <p className="text-xs text-slate-400">Unduh berkas sia.db snapshot terbaru</p>
              </div>
            </div>
            <button className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition">
              <Download className="w-4 h-4" />
              Unduh Snapshot SQLite
            </button>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Ekspor Nilai & Rapor</h4>
                <p className="text-xs text-slate-400">Berkas rekapitulasi nilai rapor Excel/CSV</p>
              </div>
            </div>
            <button className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-xs transition">
              <Download className="w-4 h-4" />
              Ekspor Data Rapor
            </button>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
