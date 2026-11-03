'use client';

import React, { useEffect, useState } from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Clock, Calendar, MapPin, User, BookOpen, Plus } from 'lucide-react';

export default function GuruJadwalPage() {
  const [jadwal, setJadwal] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const navItems = [
    { label: 'Jadwal Mengajar', href: '/guru/jadwal', icon: Clock },
    { label: 'Presensi Siswa', href: '/guru/absen', icon: BookOpen },
    { label: 'Penilaian Akademik', href: '/guru/nilai', icon: Calendar },
  ];

  useEffect(() => {
    fetch('/api/jadwal')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setJadwal(json.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <PortalLayout roleTitle="Portal Guru - Jadwal Mengajar" roleBadge="Guru" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Jadwal Mengajar Guru</h2>
            <p className="text-sm text-slate-500 mt-1">Daftar agenda mengajar mingguan dan plotting ruang kelas.</p>
          </div>
          <span className="px-3.5 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-xl border border-blue-200">
            Semester Ganjil 2026/2027
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Memuat jadwal pelajaran...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jadwal.map((item) => (
              <div
                key={item.id}
                className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold">
                    {item.hari} • Jam {item.jam_ke}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
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

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {item.guru_nama}
                  </span>
                  <a
                    href="/guru/absen"
                    className="text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    Buka Absen →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
