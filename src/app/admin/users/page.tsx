'use client';

import React, { useState, useEffect } from 'react';
import PortalLayout from '@/components/PortalLayout';
import {
  Users,
  Settings,
  ShieldCheck,
  Calendar,
  Clock,
  Award,
  Upload,
  BookOpen,
  Search,
  Filter,
  CheckCircle,
  UserPlus
} from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [filterRole, setFilterRole] = useState('semua');
  const [searchQuery, setSearchQuery] = useState('');
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
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setUsers(data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchRole = filterRole === 'semua' || u.role === filterRole;
    const matchSearch =
      u.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase());
    return matchRole && matchSearch;
  });

  return (
    <PortalLayout roleTitle="Administrator - Manajemen Akun" roleBadge="Admin" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Manajemen Pengguna & Akun</h2>
            <p className="text-sm text-slate-500 mt-1">
              Pengaturan kredensial, peran pengguna (Admin, Guru, Kepsek, Piket, Siswa), dan status keaktifan.
            </p>
          </div>
          <button className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition">
            <UserPlus className="w-4 h-4" />
            Tambah Pengguna
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <label className="text-xs font-semibold text-slate-700">Peran:</label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white"
              >
                <option value="semua">Semua Peran</option>
                <option value="admin">Admin</option>
                <option value="guru">Guru</option>
                <option value="piket">Guru Piket</option>
                <option value="kepsek">Kepala Sekolah</option>
                <option value="siswa">Siswa</option>
                <option value="wali">Wali Kelas</option>
              </select>
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Cari nama atau username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-300 text-xs w-64"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2 pointer-events-none" />
          </div>
        </div>

        {/* Tabel Akun */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Memuat data pengguna...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold">
                    <th className="py-3 px-4">No</th>
                    <th className="py-3 px-4">Username</th>
                    <th className="py-3 px-4">Nama Lengkap</th>
                    <th className="py-3 px-4">Peran (Role)</th>
                    <th className="py-3 px-4">NIP / NIS</th>
                    <th className="py-3 px-4">Kelas / Rombel</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u, idx) => (
                    <tr key={u.id || idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 text-slate-400 font-mono text-xs">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-mono font-semibold text-blue-600 text-xs">{u.username}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">{u.nama}</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-500 text-xs">{u.nip_nis || '-'}</td>
                      <td className="py-2.5 px-4 text-xs text-slate-600">{u.kelas || '-'}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> Aktif
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
