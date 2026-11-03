'use client';

import React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Clock, UserCheck, BookOpen, Calendar } from 'lucide-react';

export default function SiswaKalenderPage() {
  const navItems = [
    { label: 'Jadwal Kelas', href: '/siswa/jadwal', icon: Clock },
    { label: 'Kehadiran Saya', href: '/siswa/absen', icon: UserCheck },
    { label: 'Buku Rapor Digital', href: '/siswa/rapor', icon: BookOpen },
    { label: 'Agenda & Kalender', href: '/siswa/kalender', icon: Calendar },
  ];

  const agendas = [
    { tanggal: '26 - 30 Okt 2026', nama: 'Simulasi Terpadu KBM & Presensi', status: 'Selesai' },
    { tanggal: '10 - 15 Nov 2026', nama: 'Penilaian Tengah Semester (PTS) Ganjil', status: 'Akan Datang' },
    { tanggal: '01 - 08 Des 2026', nama: 'Penilaian Akhir Semester (PAS) Berbasis Komputer', status: 'Akan Datang' },
    { tanggal: '19 Des 2026', nama: 'Penerimaan Buku Rapor Semester Ganjil', status: 'Akan Datang' },
    { tanggal: '21 Des 2026 - 02 Jan 2027', nama: 'Libur Akhir Semester Ganjil', status: 'Akan Datang' },
  ];

  return (
    <PortalLayout roleTitle="Portal Siswa - Kalender Pendidikan" roleBadge="Siswa" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Agenda & Kalender Akademik</h2>
            <p className="text-sm text-slate-500 mt-1">
              Kalender kegiatan belajar mengajar dan jadwal penting siswa SMKN 2 Magelang.
            </p>
          </div>
          <span className="px-3.5 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-xl border border-blue-200">
            Tahun Ajaran 2026/2027
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="divide-y divide-slate-100">
            {agendas.map((a, i) => (
              <div key={i} className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 transition">
                <div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                    {a.tanggal}
                  </span>
                  <h4 className="font-semibold text-slate-900 mt-1 text-sm">{a.nama}</h4>
                </div>
                <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full font-medium">
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
