'use client';

import React, { useState, useEffect } from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Clock, TrendingUp, Award, BarChart3, Calendar, MapPin, UserCheck } from 'lucide-react';

export default function KepsekPosisiGuruPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const navItems = [
    { label: 'Jadwal & Ruang', href: '/kepsek/jadwal', icon: Clock },
    { label: 'Evaluasi & Nilai', href: '/kepsek/evaluasi', icon: TrendingUp },
    { label: 'Rekap Rapor', href: '/kepsek/rapor', icon: Award },
    { label: 'Posisi Guru', href: '/kepsek/posisi-guru', icon: BarChart3 },
    { label: 'Kalender Pendidikan', href: '/kepsek/kalender', icon: Calendar },
  ];

  useEffect(() => {
    fetch('/api/users?role=guru')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setTeachers(data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <PortalLayout roleTitle="Portal Kepala Sekolah - Posisi Guru" roleBadge="Pimpinan" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Posisi & Penugasan Guru KBM</h2>
            <p className="text-sm text-slate-500 mt-1">
              Daftar guru aktif, tugas pokok mengajar, ruang lab penugasan, dan status beban mengajar mingguan.
            </p>
          </div>
          <span className="px-3.5 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-xl border border-blue-200">
            Semester Ganjil 2026/2027
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teachers.map((t) => (
            <div key={t.id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg">
                  {t.nip_nis ? `NIP. ${t.nip_nis}` : 'Guru Honorer'}
                </span>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                  Status Aktif
                </span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">{t.nama}</h4>
                <p className="text-xs text-slate-500 mt-0.5">Username: {t.username}</p>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>Penugasan: {t.kelas || 'Lintas Rombel'}</span>
                <span className="font-semibold text-blue-600">Beban: 24 Jam/Minggu</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PortalLayout>
  );
}
