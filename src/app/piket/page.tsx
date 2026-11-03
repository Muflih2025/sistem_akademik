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
  Filter
} from 'lucide-react';

export default function PiketDashboard() {
  const [selectedDate, setSelectedDate] = useState('2026-10-30');
  const [selectedKelas, setSelectedKelas] = useState('XII PPLG 2');
  const [absensiList, setAbsensiList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const navItems = [
    { label: 'Pantau Presensi', href: '/piket', icon: UserCheck },
    { label: 'Jadwal Guru Hari Ini', href: '/guru/jadwal', icon: Clock },
    { label: 'Kalender Akademik', href: '/guru/kalender', icon: Calendar },
  ];

  useEffect(() => {
    setLoading(true);
    fetch(`/api/absensi?kelas=${encodeURIComponent(selectedKelas)}&tanggal=${selectedDate}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAbsensiList(data.data || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedDate, selectedKelas]);

  const stats = {
    hadir: absensiList.filter((a) => a.status === 'H').length,
    sakit: absensiList.filter((a) => a.status === 'S').length,
    izin: absensiList.filter((a) => a.status === 'I').length,
    alpa: absensiList.filter((a) => a.status === 'A').length,
  };

  return (
    <PortalLayout roleTitle="Portal Guru Piket" roleBadge="Piket" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Pemantauan & Rekapitulasi Presensi</h2>
            <p className="text-sm text-slate-500 mt-1">
              Rekonsiliasi awal keterlaksanaan KBM, pemantauan kehadiran siswa per kelas, dan pencatatan catatan piket.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-xl border border-blue-200">
              Akun: uji_piket
            </span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
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

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
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
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
            <div className="text-xs font-semibold text-emerald-700">Hadir (H)</div>
            <div className="text-2xl font-bold text-emerald-900 mt-1">{stats.hadir}</div>
          </div>
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
            <div className="text-xs font-semibold text-amber-700">Sakit (S)</div>
            <div className="text-2xl font-bold text-amber-900 mt-1">{stats.sakit}</div>
          </div>
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200">
            <div className="text-xs font-semibold text-blue-700">Izin (I)</div>
            <div className="text-2xl font-bold text-blue-900 mt-1">{stats.izin}</div>
          </div>
          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200">
            <div className="text-xs font-semibold text-rose-700">Alpa (A)</div>
            <div className="text-2xl font-bold text-rose-900 mt-1">{stats.alpa}</div>
          </div>
        </div>

        {/* Table Presensi */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">
              Rekap Presensi {selectedKelas} — {selectedDate}
            </h3>
            <span className="text-xs text-slate-500">{absensiList.length} Siswa Terdaftar</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Memuat data presensi...</div>
          ) : absensiList.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Belum ada data presensi untuk tanggal ini.</div>
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
      </div>
    </PortalLayout>
  );
}
