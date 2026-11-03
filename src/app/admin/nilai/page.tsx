'use client';

import React, { useState, useEffect } from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Settings, Users, ShieldCheck, Calendar, Clock, Award, Upload, BookOpen, CheckCircle, Printer } from 'lucide-react';

export default function AdminNilaiPage() {
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const navItems = [
    { label: 'Master Data', href: '/admin/master', icon: Settings },
    { label: 'Pengguna & Akun', href: '/admin/users', icon: Users },
    { label: 'Penugasan Guru', href: '/admin/penugasan', icon: ShieldCheck },
    { label: 'Tahun Ajaran', href: '/admin/tahun-ajaran', icon: Calendar },
    { label: 'Jadwal Pelajaran', href: '/admin/jadwal', icon: Clock },
    { label: 'Nilai & Verifikasi', href: '/admin/nilai', icon: Award },
    { label: 'Bulk Upload Data', href: '/admin/bulk-upload', icon: Upload },
    { label: 'Ekspor Impor', href: '/admin/export-import', icon: BookOpen },
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
    <PortalLayout roleTitle="Administrator - Verifikasi Nilai" roleBadge="Admin" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Verifikasi Nilai & Penerbitan Rapor</h2>
            <p className="text-sm text-slate-500 mt-1">
              Pemeriksaan integritas nilai capaian KBM seluruh kelas dan kunci penerbitan buku rapor digital.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => alert('Seluruh nilai kelas telah disahkan dan siap diterbitkan!')}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              Sahkan Penerbitan Rapor
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Verifikasi Nilai Kelas XII PPLG 2</h3>
            <span className="text-xs text-slate-500">{grades.length} Nilai Terkumpul</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400">Memuat nilai...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold">
                    <th className="py-3 px-4">NIS</th>
                    <th className="py-3 px-4">Nama Siswa</th>
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
                      <td className="py-2.5 px-4 font-mono text-xs text-slate-600">{item.nis}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{item.nama_siswa}</td>
                      <td className="py-2.5 px-4 text-xs text-slate-600">{item.mapel}</td>
                      <td className="py-2.5 px-4 text-center font-mono text-xs">{item.nilai_tugas}</td>
                      <td className="py-2.5 px-4 text-center font-mono text-xs">{item.nilai_uts}</td>
                      <td className="py-2.5 px-4 text-center font-mono text-xs">{item.nilai_uas}</td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-900">{item.nilai_akhir}</td>
                      <td className="py-2.5 px-4 text-center font-bold text-xs text-emerald-700">{item.predikat}</td>
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
