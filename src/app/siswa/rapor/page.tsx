'use client';

import React, { useState, useEffect } from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Clock, UserCheck, BookOpen, Calendar, Printer, Award, CheckCircle } from 'lucide-react';

export default function SiswaRaporPage() {
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const navItems = [
    { label: 'Jadwal Kelas', href: '/siswa/jadwal', icon: Clock },
    { label: 'Kehadiran Saya', href: '/siswa/absen', icon: UserCheck },
    { label: 'Buku Rapor Digital', href: '/siswa/rapor', icon: BookOpen },
    { label: 'Agenda & Kalender', href: '/siswa/kalender', icon: Calendar },
  ];

  useEffect(() => {
    fetch('/api/nilai?kelas=XII%20PPLG%202')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          // Hanya tampilkan nilai milik siswa ini (NIS: 10293, Ahmad Rizki Pratama)
          const myGrades = data.data.filter((g: any) => g.nis === '10293');
          setGrades(myGrades);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <PortalLayout roleTitle="Portal Siswa - Buku Rapor Digital" roleBadge="Siswa" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Laporan Hasil Belajar (Rapor Digital)</h2>
            <p className="text-sm text-slate-500 mt-1">
              Buku rapor siswa Ahmad Rizki Pratama (NIS: 10293) — Kelas XII PPLG 2.
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <Printer className="w-4 h-4" />
            Cetak Salinan Rapor
          </button>
        </div>

        {/* Profil Siswa Card */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Identitas Siswa</span>
            <h3 className="text-lg font-bold text-slate-900">Ahmad Rizki Pratama</h3>
            <p className="text-xs text-slate-500">NIS: 10293 • Kelas: XII PPLG 2 • Program: Rekayasa Perangkat Lunak</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Rapor Terbit & Terverifikasi
            </span>
          </div>
        </div>

        {/* Rapor Nilai Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Capaian Kompetensi Akademik</h3>
            <span className="text-xs text-slate-500">Tahun Ajaran 2026/2027 Ganjil</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400">Memuat nilai rapor...</div>
          ) : grades.length === 0 ? (
            <div className="p-12 text-center text-slate-400">Belum ada nilai yang diterbitkan.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold">
                    <th className="py-3 px-4">No</th>
                    <th className="py-3 px-4">Mata Pelajaran</th>
                    <th className="py-3 px-4 text-center">Tugas</th>
                    <th className="py-3 px-4 text-center">UTS</th>
                    <th className="py-3 px-4 text-center">UAS</th>
                    <th className="py-3 px-4 text-center">Nilai Akhir</th>
                    <th className="py-3 px-4 text-center">Predikat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {grades.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-400 font-mono text-xs">{idx + 1}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{item.mapel}</td>
                      <td className="py-3 px-4 text-center font-mono text-xs">{item.nilai_tugas}</td>
                      <td className="py-3 px-4 text-center font-mono text-xs">{item.nilai_uts}</td>
                      <td className="py-3 px-4 text-center font-mono text-xs">{item.nilai_uas}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">{item.nilai_akhir}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block w-7 h-7 leading-7 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
                          {item.predikat}
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
