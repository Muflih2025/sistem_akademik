'use client';

import React, { useState, useEffect } from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Clock, TrendingUp, Award, BarChart3, Calendar, CheckCircle } from 'lucide-react';

export default function KepsekEvaluasiPage() {
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

  const avgTugas = grades.length ? Math.round(grades.reduce((a, b) => a + (b.nilai_tugas || 0), 0) / grades.length) : 0;
  const avgUts = grades.length ? Math.round(grades.reduce((a, b) => a + (b.nilai_uts || 0), 0) / grades.length) : 0;
  const avgUas = grades.length ? Math.round(grades.reduce((a, b) => a + (b.nilai_uas || 0), 0) / grades.length) : 0;
  const avgAkhir = grades.length ? Math.round(grades.reduce((a, b) => a + (b.nilai_akhir || 0), 0) / grades.length) : 0;

  return (
    <PortalLayout roleTitle="Portal Kepala Sekolah - Evaluasi Nilai" roleBadge="Pimpinan" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Evaluasi Ketercapaian Nilai Akademik</h2>
            <p className="text-sm text-slate-500 mt-1">
              Analisis rata-rata nilai kompetensi, ketuntasan belajar minimum (KKM), dan performa hasil belajar kelas.
            </p>
          </div>
          <span className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-xl border border-indigo-200">
            Kelas: XII PPLG 2
          </span>
        </div>

        {/* Metrik Evaluasi */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase">Rata-rata Tugas</span>
            <div className="text-3xl font-extrabold text-blue-600 mt-2">{avgTugas}</div>
            <div className="text-xs text-slate-400 mt-1">Bobot 30%</div>
          </div>
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase">Rata-rata UTS</span>
            <div className="text-3xl font-extrabold text-indigo-600 mt-2">{avgUts}</div>
            <div className="text-xs text-slate-400 mt-1">Bobot 30%</div>
          </div>
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase">Rata-rata UAS</span>
            <div className="text-3xl font-extrabold text-amber-600 mt-2">{avgUas}</div>
            <div className="text-xs text-slate-400 mt-1">Bobot 40%</div>
          </div>
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase">Indeks Capaian</span>
            <div className="text-3xl font-extrabold text-emerald-600 mt-2">{avgAkhir}</div>
            <div className="text-xs text-emerald-600 mt-1 font-semibold">Tuntas 100%</div>
          </div>
        </div>

        {/* Tabel Rekap Kelas */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Distribusi Nilai Siswa XII PPLG 2</h3>
            <span className="text-xs text-slate-500">{grades.length} Siswa Diuji</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400">Memuat data nilai...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold">
                    <th className="py-3 px-4">No</th>
                    <th className="py-3 px-4">NIS</th>
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-4 text-center">Tugas</th>
                    <th className="py-3 px-4 text-center">UTS</th>
                    <th className="py-3 px-4 text-center">UAS</th>
                    <th className="py-3 px-4 text-center">Nilai Akhir</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {grades.map((g, idx) => (
                    <tr key={g.id || idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 text-slate-400 font-mono text-xs">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-600 text-xs">{g.nis}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">{g.nama_siswa}</td>
                      <td className="py-2.5 px-4 text-center font-mono text-xs">{g.nilai_tugas}</td>
                      <td className="py-2.5 px-4 text-center font-mono text-xs">{g.nilai_uts}</td>
                      <td className="py-2.5 px-4 text-center font-mono text-xs">{g.nilai_uas}</td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-900">{g.nilai_akhir}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          <CheckCircle className="w-3 h-3" /> Tuntas
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
