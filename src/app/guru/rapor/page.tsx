'use client';

import React, { useState, useEffect } from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Clock, BookOpen, Calendar, Award, Printer, Download, Search } from 'lucide-react';

export default function GuruRaporPage() {
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKelas, setSelectedKelas] = useState('XII PPLG 2');

  const navItems = [
    { label: 'Jadwal Mengajar', href: '/guru/jadwal', icon: Clock },
    { label: 'Presensi Siswa', href: '/guru/absen', icon: BookOpen },
    { label: 'Penilaian Akademik', href: '/guru/nilai', icon: Calendar },
    { label: 'Jurnal Harian KBM', href: '/guru/jurnal', icon: Clock },
    { label: 'Buku Rapor Siswa', href: '/guru/rapor', icon: Award },
    { label: 'Kalender Pendidikan', href: '/guru/kalender', icon: Calendar },
  ];

  useEffect(() => {
    setLoading(true);
    fetch(`/api/nilai?kelas=${encodeURIComponent(selectedKelas)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setGrades(data.data || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedKelas]);

  return (
    <PortalLayout roleTitle="Portal Guru - Buku Rapor" roleBadge="Guru" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Rekapitulasi Buku Rapor Siswa</h2>
            <p className="text-sm text-slate-500 mt-1">
              Verifikasi capaian kompetensi nilai akhir dan pencetakan rapor digital siswa.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              <Printer className="w-4 h-4" />
              Cetak Rekap
            </button>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-700">Rombongan Belajar:</label>
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white"
            >
              <option value="XII PPLG 2">XII PPLG 2</option>
              <option value="XII PPLG 1">XII PPLG 1</option>
            </select>
          </div>
          <span className="text-xs text-slate-500">Tahun Ajaran 2026/2027 Ganjil</span>
        </div>

        {/* Tabel Rekap Rapor */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Memuat rekap rapor...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold">
                    <th className="py-3 px-4">No</th>
                    <th className="py-3 px-4">NIS</th>
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-4">Mata Pelajaran</th>
                    <th className="py-3 px-4 text-center">Tugas</th>
                    <th className="py-3 px-4 text-center">UTS</th>
                    <th className="py-3 px-4 text-center">UAS</th>
                    <th className="py-3 px-4 text-center">Nilai Rapor</th>
                    <th className="py-3 px-4 text-center">Predikat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {grades.map((g, idx) => (
                    <tr key={g.id || idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 text-slate-400 font-mono text-xs">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-600 text-xs">{g.nis}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{g.nama_siswa}</td>
                      <td className="py-2.5 px-4 text-xs text-slate-600">{g.mapel}</td>
                      <td className="py-2.5 px-4 text-center font-mono text-xs">{g.nilai_tugas}</td>
                      <td className="py-2.5 px-4 text-center font-mono text-xs">{g.nilai_uts}</td>
                      <td className="py-2.5 px-4 text-center font-mono text-xs">{g.nilai_uas}</td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-900">{g.nilai_akhir}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`inline-block w-6 h-6 leading-6 text-xs font-bold rounded-full ${
                            g.predikat === 'A'
                              ? 'bg-emerald-100 text-emerald-800'
                              : g.predikat === 'B'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {g.predikat}
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
