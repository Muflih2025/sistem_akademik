'use client';

import React, { useState, useEffect } from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Settings, Users, ShieldCheck, Calendar, Clock, Award, Upload, BookOpen, MapPin, User, Plus } from 'lucide-react';

export default function AdminJadwalPage() {
  const [jadwal, setJadwal] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetch('/api/jadwal')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setJadwal(data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <PortalLayout roleTitle="Administrator - Jadwal Pelajaran" roleBadge="Admin" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Plotting Jadwal Pelajaran Sekolah</h2>
            <p className="text-sm text-slate-500 mt-1">
              Distribusi jadwal mengajar harian, pembagian ruang kelas/lab, dan alokasi jam tatap muka.
            </p>
          </div>
          <span className="px-3.5 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-xl border border-blue-200">
            Total {jadwal.length} Jadwal Terplot
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Memuat jadwal...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jadwal.map((item) => (
              <div key={item.id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold">
                    {item.hari} • Jam {item.jam_ke}
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-500">
                    {item.jam_mulai} - {item.jam_selesai}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 leading-snug">{item.mapel}</h4>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <span className="font-semibold text-blue-600">{item.kelas}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {item.ruang}
                    </span>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {item.guru_nama}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">ID #{item.id}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
