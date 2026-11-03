'use client';

import React, { useState, useEffect } from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Clock, TrendingUp, Award, BarChart3, Calendar, MapPin, User, CheckCircle, AlertCircle } from 'lucide-react';

export default function KepsekJadwalPage() {
  const [jadwal, setJadwal] = useState<any[]>([]);
  const [jurnalList, setJurnalList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const navItems = [
    { label: 'Jadwal & Ruang', href: '/kepsek/jadwal', icon: Clock },
    { label: 'Evaluasi & Nilai', href: '/kepsek/evaluasi', icon: TrendingUp },
    { label: 'Rekap Rapor', href: '/kepsek/rapor', icon: Award },
    { label: 'Posisi Guru', href: '/kepsek/posisi-guru', icon: BarChart3 },
    { label: 'Kalender Pendidikan', href: '/kepsek/kalender', icon: Calendar },
  ];

  useEffect(() => {
    Promise.all([
      fetch('/api/jadwal').then((r) => r.json()),
      fetch('/api/jurnal').then((r) => r.json()),
    ])
      .then(([jadwalData, jurnalData]) => {
        if (jadwalData.success) setJadwal(jadwalData.data || []);
        if (jurnalData.success) setJurnalList(jurnalData.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <PortalLayout roleTitle="Portal Kepala Sekolah - Monitoring Jadwal" roleBadge="Pimpinan" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Monitoring Keterlaksanaan KBM & Jadwal Guru</h2>
            <p className="text-sm text-slate-500 mt-1">
              Pemantauan distribusi jam mengajar, ruang/lab, dan kepatuhan pengisian jurnal kelas oleh guru mapel.
            </p>
          </div>
          <span className="px-3.5 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-xl border border-blue-200">
            Akun: uji_kepsek
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Memuat data jadwal KBM...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jadwal.map((item) => {
              // Cek apakah ada jurnal yang sudah diisi untuk guru dan kelas ini
              const hasJurnal = jurnalList.some(
                (j) => j.guru_username === item.guru_username && j.kelas === item.kelas
              );

              return (
                <div
                  key={item.id}
                  className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold">
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

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {item.guru_nama}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                        hasJurnal
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {hasJurnal ? (
                        <>
                          <CheckCircle className="w-3 h-3" /> Sudah diisi
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3" /> Belum diisi
                        </>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
