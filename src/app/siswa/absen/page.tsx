'use client';

import React, { useState, useEffect } from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Clock, UserCheck, BookOpen, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';

export default function SiswaAbsenPage() {
  const [absenList, setAbsenList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const navItems = [
    { label: 'Jadwal Kelas', href: '/siswa/jadwal', icon: Clock },
    { label: 'Kehadiran Saya', href: '/siswa/absen', icon: UserCheck },
    { label: 'Buku Rapor Digital', href: '/siswa/rapor', icon: BookOpen },
    { label: 'Agenda & Kalender', href: '/siswa/kalender', icon: Calendar },
  ];

  useEffect(() => {
    // Ambil data absensi seluruh kelas XII PPLG 2 lalu filter siswa ini (10293)
    fetch('/api/absensi?kelas=XII%20PPLG%202&tanggal=2026-10-26')
      .then((res) => res.json())
      .then((data) => {
        // Ambil data untuk semua tanggal simulasi
        const dates = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30'];
        Promise.all(
          dates.map((d) =>
            fetch(`/api/absensi?kelas=XII%20PPLG%202&tanggal=${d}`).then((r) => r.json())
          )
        ).then((results) => {
          const allAbsen: any[] = [];
          results.forEach((res, idx) => {
            if (res.success && res.data) {
              const myRecord = res.data.find((s: any) => s.nis === '10293');
              if (myRecord) {
                allAbsen.push(myRecord);
              } else {
                allAbsen.push({
                  tanggal: dates[idx],
                  status: 'H',
                  catatan: 'Hadir tepat waktu',
                });
              }
            }
          });
          setAbsenList(allAbsen);
          setLoading(false);
        });
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <PortalLayout roleTitle="Portal Siswa - Kehadiran Saya" roleBadge="Siswa" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Rekap Kehadiran Presensi</h2>
            <p className="text-sm text-slate-500 mt-1">
              Data kehadiran belajar mandiri Ahmad Rizki Pratama (NIS: 10293) — XII PPLG 2.
            </p>
          </div>
          <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200">
            Persentase: 100% Hadir
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
            <span className="text-xs font-semibold text-emerald-700">Hadir (H)</span>
            <div className="text-2xl font-bold text-emerald-900 mt-1">5 Hari</div>
          </div>
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
            <span className="text-xs font-semibold text-amber-700">Sakit (S)</span>
            <div className="text-2xl font-bold text-amber-900 mt-1">0 Hari</div>
          </div>
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200">
            <span className="text-xs font-semibold text-blue-700">Izin (I)</span>
            <div className="text-2xl font-bold text-blue-900 mt-1">0 Hari</div>
          </div>
          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200">
            <span className="text-xs font-semibold text-rose-700">Alpa (A)</span>
            <div className="text-2xl font-bold text-rose-900 mt-1">0 Hari</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Riwayat Presensi Harian KBM</h3>
            <span className="text-xs text-slate-500">Pekan 26 - 30 Oktober 2026</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400">Memuat catatan kehadiran...</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {absenList.map((item, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-mono text-xs rounded-lg">
                      {item.tanggal}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      Presensi KBM Harian
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">{item.catatan || 'Hadir'}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      Hadir
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
