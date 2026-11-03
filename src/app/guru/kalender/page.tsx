'use client';

import React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Clock, BookOpen, Calendar, CheckCircle, MapPin, Tag } from 'lucide-react';

export default function GuruKalenderPage() {
  const navItems = [
    { label: 'Jadwal Mengajar', href: '/guru/jadwal', icon: Clock },
    { label: 'Presensi Siswa', href: '/guru/absen', icon: BookOpen },
    { label: 'Penilaian Akademik', href: '/guru/nilai', icon: Calendar },
    { label: 'Jurnal Harian KBM', href: '/guru/jurnal', icon: Clock },
    { label: 'Buku Rapor Siswa', href: '/guru/rapor', icon: BookOpen },
    { label: 'Kalender Pendidikan', href: '/guru/kalender', icon: Calendar },
  ];

  const agendas = [
    { tanggal: '26 - 30 Okt 2026', nama: 'Pekan Simulasi KBM & Rekonsiliasi Presensi Terpadu', kategori: 'KBM', status: 'Berlangsung' },
    { tanggal: '10 - 15 Nov 2026', nama: 'Penilaian Tengah Semester (PTS) Ganjil', kategori: 'Ujian', status: 'Akan Datang' },
    { tanggal: '01 - 08 Des 2026', nama: 'Penilaian Akhir Semester (PAS) Berbasis Komputer', kategori: 'Ujian', status: 'Akan Datang' },
    { tanggal: '18 Des 2026', nama: 'Rapat Pleno Dewan Guru & Verifikasi Kenaikan/Rapor', kategori: 'Rapat', status: 'Akan Datang' },
    { tanggal: '19 Des 2026', nama: 'Pembagian Buku Laporan Hasil Belajar (Rapor Digital)', kategori: 'Rapor', status: 'Akan Datang' },
    { tanggal: '21 Des 2026 - 02 Jan 2027', nama: 'Libur Akhir Semester Ganjil 2026/2027', kategori: 'Libur', status: 'Akan Datang' },
  ];

  return (
    <PortalLayout roleTitle="Portal Guru - Kalender Pendidikan" roleBadge="Guru" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Kalender Pendidikan Akademik</h2>
            <p className="text-sm text-slate-500 mt-1">
              Jadwal agenda resmi sekolah, pekan KBM, ujian sumatif, dan masa pembagian rapor semester ganjil.
            </p>
          </div>
          <span className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-xl border border-blue-200">
            Tahun Ajaran 2026/2027
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Agenda Semester Ganjil</h3>
            <span className="text-xs text-slate-500">SMK Negeri 2 Magelang</span>
          </div>

          <div className="divide-y divide-slate-100">
            {agendas.map((item, idx) => (
              <div key={idx} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-100 text-blue-800">
                      {item.tanggal}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                      {item.kategori}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-base">{item.nama}</h4>
                </div>
                <div>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      item.status === 'Berlangsung'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
