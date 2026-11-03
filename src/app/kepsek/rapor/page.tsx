'use client';

import React, { useState, useEffect } from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Clock, TrendingUp, Award, BarChart3, Calendar, CheckCircle, Printer } from 'lucide-react';

export default function KepsekRaporPage() {
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const navItems = [
    { label: 'Jadwal & Ruang', href: '/kepsek/jadwal', icon: Clock },
    { label: 'Evaluasi & Nilai', href: '/kepsek/evaluasi', icon: TrendingUp },
    { label: 'Rekap Rapor', href: '/kepsek/rapor', icon: Award },
    { label: 'Posisi Guru', href: '/kepsek/posisi-guru', icon: BarChart3 },
    { label: 'Kalender Pendidikan', href: '/kepsek/kalender', icon: Calendar },
  ];

  useEffect(() => {
    fetch('/api/nilai?kelas=XII%20PPLG%202')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setGrades(data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <PortalLayout roleTitle="Portal Kepala Sekolah - Rekap Rapor" roleBadge="Pimpinan" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Verifikasi & Pengesahan Buku Rapor</h2>
            <p className="text-sm text-slate-500 mt-1">
              Pemeriksaan kesiapan cetak rapor semester ganjil, verifikasi tandatangan digital kepala sekolah.
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <Printer className="w-4 h-4" />
            Cetak Rekapitulasi Rapor
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Status Penerbitan Rapor Kelas XII PPLG 2</h3>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Status: Terverifikasi Siap Terbit
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400">Memuat rekapitulasi rapor...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold">
                    <th className="py-3 px-4">No</th>
                    <th className="py-3 px-4">NIS</th>
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-4">Mata Pelajaran</th>
                    <th className="py-3 px-4 text-center">Nilai Rapor</th>
                    <th className="py-3 px-4 text-center">Predikat</th>
                    <th className="py-3 px-4 text-center">Validasi Kepsek</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {grades.map((g, idx) => (
                    <tr key={g.id || idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 text-slate-400 font-mono text-xs">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-600 text-xs">{g.nis}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">{g.nama_siswa}</td>
                      <td className="py-2.5 px-4 text-xs text-slate-600">{g.mapel}</td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-900">{g.nilai_akhir}</td>
                      <td className="py-2.5 px-4 text-center font-semibold text-xs text-blue-600">{g.predikat}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Sah
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
