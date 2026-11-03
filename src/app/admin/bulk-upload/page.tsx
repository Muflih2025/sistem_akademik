'use client';

import React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Settings, Users, ShieldCheck, Calendar, Clock, Award, Upload, BookOpen, FileSpreadsheet, CheckCircle } from 'lucide-react';

export default function AdminBulkUploadPage() {
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
    <PortalLayout roleTitle="Administrator - Bulk Upload Excel" roleBadge="Admin" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Bulk Upload Excel Master Data</h2>
            <p className="text-sm text-slate-500 mt-1">
              Impor massal master siswa, jadwal, dan nilai akademik dari template spreadsheet terstandar.
            </p>
          </div>
          <span className="px-3.5 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-xl border border-blue-200">
            389 Siswa Terimpor Excel
          </span>
        </div>

        <div className="p-8 bg-white rounded-2xl border-2 border-dashed border-slate-300 text-center space-y-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-base">Unggah Berkas Excel (.xlsx, .xls)</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Sistem akan memvalidasi preview data (Jurusan → Kelas → Siswa) sebelum proses commit ke database.
            </p>
          </div>
          <div>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition">
              Pilih Berkas Excel
            </button>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
