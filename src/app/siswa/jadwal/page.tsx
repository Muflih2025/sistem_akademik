'use client';

import React, { useState, useEffect } from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Clock, UserCheck, BookOpen, Calendar, MapPin, User } from 'lucide-react';

export default function SiswaJadwalPage() {
  const [jadwal, setJadwal] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const navItems = [
    { label: 'Jadwal Kelas', href: '/siswa/jadwal', icon: Clock },
    { label: 'Kehadiran Saya', href: '/siswa/absen', icon: UserCheck },
    { label: 'Buku Rapor Digital', href: '/siswa/rapor', icon: BookOpen },
    { label: 'Agenda & Kalender', href: '/siswa/kalender', icon: Calendar },
  ];

  useEffect(() => {
    fetch('/api/jadwal?kelas=XII%20PPLG%202')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setJadwal(data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <PortalLayout roleTitle="Portal Siswa - Jadwal Pelajaran" roleBadge="Siswa" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Jadwal Pelajaran Kelas XII PPLG 2</h2>
            <p className="text-sm text-slate-500 mt-1">
              Daftar mata pelajaran mingguan, jam belajar, dan ruang laboratorium.
            </p>
          </div>
          <span className="px-3.5 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-xl border border-blue-200">
            Semester Ganjil 2026/2027
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Memuat jadwal...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jadwal.map((item) => (
              <div key={item.id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold">
                    {item.hari} • Jam {item.jam_ke}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 font-mono">
                    {item.jam_mulai} - {item.jam_selesai}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 leading-snug">{item.mapel}</h4>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.ruang}</span>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-600">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{item.guru_nama}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
