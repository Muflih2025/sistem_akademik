'use client';

import React, { useEffect, useState } from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Clock, BookOpen, Calendar, Save, CheckCircle, Award, AlertCircle, Search, Filter } from 'lucide-react';

export default function GuruNilaiPage() {
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [alasanKoreksi, setAlasanKoreksi] = useState('');

  // Pagination & Search (sesuai test.md)
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const navItems = [
    { label: 'Jadwal Mengajar', href: '/guru/jadwal', icon: Clock },
    { label: 'Presensi Siswa', href: '/guru/absen', icon: BookOpen },
    { label: 'Penilaian Akademik', href: '/guru/nilai', icon: Calendar },
    { label: 'Jurnal Harian KBM', href: '/guru/jurnal', icon: Clock },
    { label: 'Buku Rapor Siswa', href: '/guru/rapor', icon: Award },
    { label: 'Kalender Pendidikan', href: '/guru/kalender', icon: Calendar },
  ];

  useEffect(() => {
    fetch('/api/nilai?kelas=XII%20PPLG%202')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setGrades(json.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleGradeChange = (originalIndex: number, field: string, value: number) => {
    setErrorMessage('');
    const updated = [...grades];
    updated[originalIndex][field] = value;
    const tugas = Number(updated[originalIndex].nilai_tugas) || 0;
    const uts = Number(updated[originalIndex].nilai_uts) || 0;
    const uas = Number(updated[originalIndex].nilai_uas) || 0;
    // Bobot: 30% Tugas, 30% UTS, 40% UAS (sesuai test.md)
    const akhir = Math.round((tugas * 0.3) + (uts * 0.3) + (uas * 0.4));
    updated[originalIndex].nilai_akhir = akhir;
    if (akhir >= 85) updated[originalIndex].predikat = 'A';
    else if (akhir >= 75) updated[originalIndex].predikat = 'B';
    else if (akhir >= 65) updated[originalIndex].predikat = 'C';
    else updated[originalIndex].predikat = 'D';

    setGrades(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    setErrorMessage('');

    // Validasi input 0-100 di client sebelum POST
    for (const g of grades) {
      if (g.nilai_tugas < 0 || g.nilai_tugas > 100 ||
          g.nilai_uts < 0 || g.nilai_uts > 100 ||
          g.nilai_uas < 0 || g.nilai_uas > 100) {
        setErrorMessage(`Nilai tidak valid untuk ${g.nama_siswa}. Input harus dalam rentang 0 sampai 100. Nilai 101 atau negatif ditolak.`);
        setSaving(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/nilai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kelas: 'XII PPLG 2',
          mapel: 'Pemrograman Web & Perangkat Bergerak',
          items: grades,
          alasan: alasanKoreksi,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage('Nilai berhasil disimpan dan divalidasi dengan bobot 30/30/40.');
      } else {
        setErrorMessage(json.error || 'Gagal menyimpan nilai.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan jaringan saat menyimpan nilai.');
    } finally {
      setSaving(false);
    }
  };

  // Filter & Pagination logic (perubahan lintas halaman tetap tersimpan di state grades)
  const filteredIndices = grades
    .map((g, idx) => ({ ...g, originalIndex: idx }))
    .filter((g) =>
      g.nama_siswa.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.nis.includes(searchQuery)
    );

  const totalPages = Math.ceil(filteredIndices.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const currentItems = filteredIndices.slice(startIndex, startIndex + pageSize);

  return (
    <PortalLayout roleTitle="Portal Guru - Input & Rekap Nilai" roleBadge="Guru" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Penilaian Hasil Belajar Siswa</h2>
            <p className="text-sm text-slate-500 mt-1">
              Aturan bobot penilaian: <strong>Tugas 30%</strong>, <strong>UTS 30%</strong>, <strong>UAS 40%</strong>. Nilai valid berada pada rentang 0 – 100.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Menyimpan...' : 'Simpan Nilai'}
          </button>
        </div>

        {message && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Filter & Pagination Control Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-700">Tampilkan:</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white"
              >
                <option value={10}>10 Siswa per halaman</option>
                <option value={20}>20 Siswa per halaman</option>
                <option value={50}>50 Siswa per halaman</option>
              </select>
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Cari NIS atau Nama Siswa..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-300 text-xs w-64"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2 pointer-events-none" />
          </div>
        </div>

        {/* Table Grades */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">Memuat data nilai...</div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold tracking-wider">
                    <th className="py-3 px-4">No</th>
                    <th className="py-3 px-4">NIS</th>
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-4 text-center">Tugas (30%)</th>
                    <th className="py-3 px-4 text-center">UTS (30%)</th>
                    <th className="py-3 px-4 text-center">UAS (40%)</th>
                    <th className="py-3 px-4 text-center">Nilai Akhir</th>
                    <th className="py-3 px-4 text-center">Predikat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentItems.map((g) => (
                    <tr key={g.originalIndex} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-4 text-slate-400 font-mono text-xs">{g.originalIndex + 1}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-600 text-xs">{g.nis}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{g.nama_siswa}</td>
                      <td className="py-2.5 px-4 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={g.nilai_tugas ?? ''}
                          onChange={(e) => handleGradeChange(g.originalIndex, 'nilai_tugas', Number(e.target.value))}
                          className="w-16 px-2 py-1 text-center font-semibold text-xs border border-slate-200 rounded-lg focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={g.nilai_uts ?? ''}
                          onChange={(e) => handleGradeChange(g.originalIndex, 'nilai_uts', Number(e.target.value))}
                          className="w-16 px-2 py-1 text-center font-semibold text-xs border border-slate-200 rounded-lg focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={g.nilai_uas ?? ''}
                          onChange={(e) => handleGradeChange(g.originalIndex, 'nilai_uas', Number(e.target.value))}
                          className="w-16 px-2 py-1 text-center font-semibold text-xs border border-slate-200 rounded-lg focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-slate-900 font-mono text-xs">
                        {g.nilai_akhir}
                      </td>
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

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Menampilkan {startIndex + 1} - {Math.min(startIndex + pageSize, filteredIndices.length)} dari total {filteredIndices.length} siswa (Isian lintas halaman tetap tersimpan)
              </span>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
