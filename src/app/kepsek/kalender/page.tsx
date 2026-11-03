'use client';

import React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Clock, TrendingUp, Award, BarChart3, Calendar } from 'lucide-react';

export default function KepsekKalenderPage() {
  const navItems = [
    { label: 'Jadwal & Ruang', href: '/kepsek/jadwal', icon: Clock },
    { label: 'Evaluasi & Nilai', href: '/kepsek/evaluasi', icon: TrendingUp },
    { label: 'Rekap Rapor', href: '/kepsek/rapor', icon: Award },
    { label: 'Posisi Guru', href: '/kepsek/posisi-guru', icon: BarChart3 },
    { label: 'Kalender Pendidikan', href: '/kepsek/kalender', icon: Calendar },
  ];

  const agendas = [
    { tanggal: '26 - 30 Okt 2026', nama: 'Simulasi Terpadu KBM & Presensi Lima Hari', status: 'Selesai Dilaksanakan' },
    { tanggal: '10 - 15 Nov 2026', nama: 'Penilaian Tengah Semester (PTS) Ganjil', status: 'Terjadwal' },
    { tanggal: '01 - 08 Des 2026', nama: 'Penilaian Akhir Semester (PAS) Berbasis Komputer', status: 'Terjadwal' },
    { tanggal: '18 Des 2026', nama: 'Rapat Pleno Dewan Guru & Verifikasi Kenaikan/Rapor', status: 'Terjadwal' },
    { tanggal: '19 Des 2026', nama: 'Pembagian Buku Laporan Hasil Belajar (Rapor Digital)', status: 'Terjadwal' },
  ];

  return (
    <PortalLayout roleTitle="Portal Kepala Sekolah - Kalender" roleBadge="Pimpinan" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Kalender Akademik Sekolah</h2>
            <p className="text-sm text-slate-500 mt-1">
              Kalender resmi kegiatan pembelajaran dan agenda manajerial SMKN 2 Magelang.
            </p>
          </div>
          <span className="px-3.5 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-xl border border-blue-200">
            Tahun Ajaran 2026/2027
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="divide-y divide-slate-100">
            {agendas.map((a, i) => (
              <div key={i} className="p-5 flex items-center justify-between hover:bg-slate-50">
                <div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                    {a.tanggal}
                  </span>
                  <h4 className="font-semibold text-slate-900 mt-1 text-sm">{a.nama}</h4>
                </div>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
