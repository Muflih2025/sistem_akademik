'use client';

import React, { useState, useEffect } from 'react';
import PortalLayout from '@/components/PortalLayout';
import {
  ShieldAlert,
  UserCheck,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle,
  Search,
  Filter,
  Download,
  Printer
} from 'lucide-react';

export default function PiketDashboard() {
  const [selectedDate, setSelectedDate] = useState('2026-10-30');
  const [selectedKelas, setSelectedKelas] = useState('XII PPLG 2');
  const [absensiList, setAbsensiList] = useState<any[]>([]);
  const [matrixData, setMatrixData] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'harian' | 'matriks'>('matriks');
  const [loading, setLoading] = useState(true);

  const simDates = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30'];

  const navItems = [
    { label: 'Pantau Presensi', href: '/piket', icon: UserCheck },
    { label: 'Jadwal Guru Hari Ini', href: '/guru/jadwal', icon: Clock },
    { label: 'Kalender Akademik', href: '/guru/kalender', icon: Calendar },
  ];

  useEffect(() => {
    setLoading(true);
    if (viewMode === 'harian') {
      fetch(`/api/absensi?kelas=${encodeURIComponent(selectedKelas)}&tanggal=${selectedDate}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setAbsensiList(data.data || []);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      // Ambil seluruh 5 hari simulasi untuk membentuk matriks horizontal
      Promise.all(
        simDates.map((d) =>
          fetch(`/api/absensi?kelas=${encodeURIComponent(selectedKelas)}&tanggal=${d}`).then((r) => r.json())
        )
      ).then((results) => {
        // Gabungkan per siswa
        const studentMap: Record<string, { nis: string; nama: string; days: Record<string, string> }> = {};

        results.forEach((res, dIdx) => {
          const date = simDates[dIdx];
          if (res.success && res.data) {
            res.data.forEach((row: any) => {
              if (!studentMap[row.nis]) {
                studentMap[row.nis] = { nis: row.nis, nama: row.nama_siswa, days: {} };
              }
              studentMap[row.nis].days[date] = row.status;
            });
          }
        });

        setMatrixData(Object.values(studentMap));
        setLoading(false);
      });
    }
  }, [selectedDate, selectedKelas, viewMode]);

  return (
    <PortalLayout roleTitle="Portal Guru Piket" roleBadge="Piket" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Pemantauan & Matriks Presensi 5 Hari</h2>
            <p className="text-sm text-slate-500 mt-1">
              Rekonsiliasi awal KBM, matriks kehadiran Senin – Jumat, dan verifikasi siswa tidak hadir.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              <Printer className="w-4 h-4" />
              Cetak Matriks
            </button>
          </div>
        </div>

        {/* View Mode & Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setViewMode('matriks')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === 'matriks' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Matriks 5 Hari (26 - 30 Okt)
              </button>
              <button
                onClick={() => setViewMode('harian')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === 'harian' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tinjauan Per Tanggal
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-700">Kelas:</label>
              <select
                value={selectedKelas}
                onChange={(e) => setSelectedKelas(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white"
              >
                <option value="XII PPLG 2">XII PPLG 2 (20 Siswa)</option>
                <option value="XII PPLG 1">XII PPLG 1 (2 Siswa)</option>
              </select>
            </div>

            {viewMode === 'harian' && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-700">Tanggal:</label>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white"
                >
                  <option value="2026-10-26">Senin, 26 Okt 2026</option>
                  <option value="2026-10-27">Selasa, 27 Okt 2026</option>
                  <option value="2026-10-28">Rabu, 28 Okt 2026</option>
                  <option value="2026-10-29">Kamis, 29 Okt 2026</option>
                  <option value="2026-10-30">Jumat, 30 Okt 2026</option>
                </select>
              </div>
            )}
          </div>

          <span className="text-xs font-semibold text-slate-500">
            {viewMode === 'matriks' ? 'Rentang: 26-10-2026 s.d 30-10-2026' : `Tanggal: ${selectedDate}`}
          </span>
        </div>

        {/* Matriks 5 Hari Table (sesuai test.md) */}
        {viewMode === 'matriks' ? (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">
                Matriks Rekapitulasi Presensi Mingguan {selectedKelas}
              </h3>
              <span className="text-xs text-slate-500">{matrixData.length} Siswa Terdata</span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400">Memuat matriks kehadiran...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 font-bold uppercase">
                      <th className="py-3 px-4">No</th>
                      <th className="py-3 px-4">NIS</th>
                      <th className="py-3 px-4">Nama Siswa</th>
                      <th className="py-3 px-4 text-center">Senin (26)</th>
                      <th className="py-3 px-4 text-center">Selasa (27)</th>
                      <th className="py-3 px-4 text-center">Rabu (28)</th>
                      <th className="py-3 px-4 text-center">Kamis (29)</th>
                      <th className="py-3 px-4 text-center">Jumat (30)</th>
                      <th className="py-3 px-4 text-center">Total Hadir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {matrixData.map((item, idx) => {
                      const days = item.days || {};
                      const totalH = Object.values(days).filter((v) => v === 'H').length;

                      const renderBadge = (st: string) => {
                        if (!st) return <span className="text-slate-300">-</span>;
                        const col =
                          st === 'H'
                            ? 'bg-emerald-100 text-emerald-800'
                            : st === 'S'
                            ? 'bg-amber-100 text-amber-800'
                            : st === 'I'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800';
                        return (
                          <span className={`inline-block w-6 h-6 leading-6 text-xs font-bold rounded-md text-center ${col}`}>
                            {st}
                          </span>
                        );
                      };

                      return (
                        <tr key={item.nis} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 text-slate-400 font-mono text-xs">{idx + 1}</td>
                          <td className="py-2.5 px-4 font-mono text-slate-600 text-xs">{item.nis}</td>
                          <td className="py-2.5 px-4 font-medium text-slate-900">{item.nama}</td>
                          <td className="py-2.5 px-4 text-center">{renderBadge(days['2026-10-26'])}</td>
                          <td className="py-2.5 px-4 text-center">{renderBadge(days['2026-10-27'])}</td>
                          <td className="py-2.5 px-4 text-center">{renderBadge(days['2026-10-28'])}</td>
                          <td className="py-2.5 px-4 text-center">{renderBadge(days['2026-10-29'])}</td>
                          <td className="py-2.5 px-4 text-center">{renderBadge(days['2026-10-30'])}</td>
                          <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-900">
                            {totalH} / 5
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Tabel Harian */
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">
                Rekap Harian {selectedKelas} — {selectedDate}
              </h3>
              <span className="text-xs text-slate-500">{absensiList.length} Siswa Terdaftar</span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Memuat data presensi...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 font-semibold uppercase">
                      <th className="py-3 px-4">No</th>
                      <th className="py-3 px-4">NIS</th>
                      <th className="py-3 px-4">Nama Siswa</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {absensiList.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 text-slate-400 text-xs font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-600 text-xs">{item.nis}</td>
                        <td className="py-2.5 px-4 font-medium text-slate-900">{item.nama_siswa}</td>
                        <td className="py-2.5 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              item.status === 'H'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.status === 'S'
                                ? 'bg-amber-100 text-amber-800'
                                : item.status === 'I'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {item.status === 'H'
                              ? 'Hadir'
                              : item.status === 'S'
                              ? 'Sakit'
                              : item.status === 'I'
                              ? 'Izin'
                              : 'Alpa'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-xs text-slate-500">{item.catatan || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
