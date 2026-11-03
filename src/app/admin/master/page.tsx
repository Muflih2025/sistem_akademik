'use client';

import React, { useState } from 'react';
import PortalLayout from '@/components/PortalLayout';
import {
  Settings,
  Users,
  ShieldCheck,
  Calendar,
  Clock,
  Award,
  Upload,
  BookOpen,
  School,
  MapPin,
  Layers,
  GraduationCap
} from 'lucide-react';

export default function AdminMasterPage() {
  const [activeTab, setActiveTab] = useState<'siswa' | 'guru' | 'kelas' | 'ruang'>('kelas');

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

  const masterStats = [
    { title: 'Master Siswa', count: '411 Siswa', desc: '389 dari Excel + 22 siswa contoh', icon: GraduationCap },
    { title: 'Rombongan Belajar', count: '36 Kelas', desc: 'Tingkat X, XI, dan XII', icon: Layers },
    { title: 'Kompetensi Keahlian', count: '4 Jurusan', desc: 'PPLG, TJKT, AKL, MPLB', icon: School },
    { title: 'Ruang & Lab', count: '29 Ruang', desc: 'Lab PPLG, Bengkel, dan Ruang Teori', icon: MapPin },
  ];

  const sampleKelas = [
    { nama: 'XII PPLG 2', jurusan: 'Pengembangan Perangkat Lunak & Gim', wali: 'Dewi Kartika, S.Pd', siswa: 20 },
    { nama: 'XII PPLG 1', jurusan: 'Pengembangan Perangkat Lunak & Gim', wali: 'Siti Aminah, S.Pd', siswa: 2 },
    { nama: 'XI PPLG 1', jurusan: 'Pengembangan Perangkat Lunak & Gim', wali: 'Rudi Hermawan, S.Pd', siswa: 36 },
    { nama: 'X PPLG 1', jurusan: 'Pengembangan Perangkat Lunak & Gim', wali: 'Budi Santoso, S.Kom', siswa: 36 },
  ];

  return (
    <PortalLayout roleTitle="Administrator - Master Data" roleBadge="Admin" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Master Data Akademik</h2>
            <p className="text-sm text-slate-500 mt-1">
              Data referensi inti sekolah: rombongan belajar, kompetensi keahlian, ruang belajar, dan tenaga pengajar.
            </p>
          </div>
          <span className="px-3.5 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-xl border border-blue-200">
            Tahun Ajaran 2026/2027
          </span>
        </div>

        {/* Master Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {masterStats.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase">{item.title}</span>
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 mt-2">{item.count}</div>
                <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Rombel Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Daftar Rombongan Belajar Aktif</h3>
            <span className="text-xs text-slate-500">Terdaftar 36 Kelas</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold">
                  <th className="py-3 px-4">Nama Kelas</th>
                  <th className="py-3 px-4">Program Keahlian</th>
                  <th className="py-3 px-4">Wali Kelas</th>
                  <th className="py-3 px-4 text-center">Jumlah Siswa</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sampleKelas.map((k, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-blue-600">{k.nama}</td>
                    <td className="py-3 px-4 text-slate-700">{k.jurusan}</td>
                    <td className="py-3 px-4 text-slate-600">{k.wali}</td>
                    <td className="py-3 px-4 text-center font-mono font-semibold">{k.siswa}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        Aktif
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
