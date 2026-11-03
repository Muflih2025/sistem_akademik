'use client';

import React, { useState } from 'react';
import PortalLayout from '@/components/PortalLayout';
import {
  ShieldCheck,
  Settings,
  Users,
  Calendar,
  Clock,
  Award,
  Upload,
  BookOpen,
  CheckCircle,
  Save,
  Plus
} from 'lucide-react';

export default function AdminPenugasanPage() {
  const [piketGuru, setPiketGuru] = useState('uji_piket');
  const [piketHari, setPiketHari] = useState('Senin - Jumat');
  const [izinKoreksi, setIzinKoreksi] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

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

  const handleSimpanPiket = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMessage('Penugasan Guru Piket berhasil diperbarui & disimpan.');
    setTimeout(() => setSavedMessage(''), 4000);
  };

  return (
    <PortalLayout roleTitle="Administrator - Penugasan Guru" roleBadge="Admin" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Penugasan Guru & Guru Piket</h2>
            <p className="text-sm text-slate-500 mt-1">
              Plotting penugasan jam mengajar, pembagian tugas guru piket harian, dan pengaturan hak izin koreksi.
            </p>
          </div>
          <span className="px-3.5 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-xl border border-blue-200">
            Semester Ganjil 2026/2027
          </span>
        </div>

        {/* Form Penugasan Guru Piket */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Penugasan Guru Piket & Izin Koreksi</h3>
              <p className="text-xs text-slate-500 mt-0.5">Konfigurasi tugas pemantauan presensi dan batas akses audit</p>
            </div>
            <span className="px-2.5 py-1 bg-amber-50 text-amber-800 text-xs font-semibold rounded-lg">
              Tugas Aktif: ID #101
            </span>
          </div>

          {savedMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{savedMessage}</span>
            </div>
          )}

          <form onSubmit={handleSimpanPiket} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Guru Piket Ditugaskan</label>
                <select
                  value={piketGuru}
                  onChange={(e) => setPiketGuru(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="uji_piket">Rudi Hermawan, S.Pd (uji_piket)</option>
                  <option value="uji_guru">Budi Santoso, S.Kom (uji_guru)</option>
                  <option value="uji_guru_lain">Siti Aminah, S.Pd (uji_guru_lain)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Jadwal Tugas Hari</label>
                <input
                  type="text"
                  value={piketHari}
                  onChange={(e) => setPiketHari(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
              <input
                type="checkbox"
                id="izinKoreksi"
                checked={izinKoreksi}
                onChange={(e) => setIzinKoreksi(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600"
              />
              <label htmlFor="izinKoreksi" className="text-xs text-slate-700 leading-relaxed cursor-pointer">
                <strong>Beri izin koreksi data presensi terkonfirmasi.</strong> Bila tidak dicentang, guru piket hanya dapat memantau dan merekonsiliasi awal tanpa mengubah catatan yang telah disahkan guru mapel.
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
              >
                <Save className="w-4 h-4" />
                Simpan Penugasan Guru Piket
              </button>
            </div>
          </form>
        </div>

        {/* Tabel Penugasan Guru Mapel */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Daftar Penugasan Mengajar Guru Terverifikasi</h3>
            <span className="text-xs text-slate-500">11 Jadwal Terverifikasi</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold">
                  <th className="py-3 px-4">Guru Pengampu</th>
                  <th className="py-3 px-4">Mata Pelajaran</th>
                  <th className="py-3 px-4">Rombel Penugasan</th>
                  <th className="py-3 px-4">Ruang / Lab</th>
                  <th className="py-3 px-4 text-center">Beban Jam</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-semibold text-slate-900">Budi Santoso, S.Kom</td>
                  <td className="py-3 px-4 text-slate-700">Pemrograman Web & Perangkat Bergerak</td>
                  <td className="py-3 px-4 text-blue-600 font-semibold">XII PPLG 2</td>
                  <td className="py-3 px-4 text-slate-600">Lab PPLG 1</td>
                  <td className="py-3 px-4 text-center font-mono">10 Jam</td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                      Disahkan
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-semibold text-slate-900">Siti Aminah, S.Pd</td>
                  <td className="py-3 px-4 text-slate-700">Basis Data & SQL Lanjutan</td>
                  <td className="py-3 px-4 text-blue-600 font-semibold">XII PPLG 1 & XII PPLG 2</td>
                  <td className="py-3 px-4 text-slate-600">Lab PPLG 2</td>
                  <td className="py-3 px-4 text-center font-mono">10 Jam</td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                      Disahkan
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
