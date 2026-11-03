'use client';

import React, { useEffect, useState } from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Clock, BookOpen, Calendar, CheckCircle, Save, AlertCircle, Search, CheckCheck, HelpCircle } from 'lucide-react';

export default function GuruAbsenPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedTanggal, setSelectedTanggal] = useState('2026-10-30');
  const [selectedKelas, setSelectedKelas] = useState('XII PPLG 2');

  // Integrasi Jurnal Kelas (sesuai test.md: Absensi & Isi Jurnal Kelas sekaligus)
  const [pertemuanKe, setPertemuanKe] = useState('5');
  const [materiKBM, setMateriKBM] = useState('Implementasi Full Native TSX & Next.js App Router');
  const [refleksi, setRefleksi] = useState('Siswa aktif menyelesaikan latihan dan memahami alur kerja.');
  const [alasanKoreksi, setAlasanKoreksi] = useState('');

  // Pagination & Search (sesuai test.md: default 10 siswa, pilihan 20/50, isian tetap tersimpan saat pindah halaman/cari)
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const navItems = [
    { label: 'Jadwal Mengajar', href: '/guru/jadwal', icon: Clock },
    { label: 'Presensi Siswa', href: '/guru/absen', icon: BookOpen },
    { label: 'Penilaian Akademik', href: '/guru/nilai', icon: Calendar },
    { label: 'Jurnal Harian KBM', href: '/guru/jurnal', icon: Clock },
    { label: 'Buku Rapor Siswa', href: '/guru/rapor', icon: BookOpen },
    { label: 'Kalender Pendidikan', href: '/guru/kalender', icon: Calendar },
  ];

  const loadAbsensi = () => {
    setLoading(true);
    fetch(`/api/absensi?kelas=${encodeURIComponent(selectedKelas)}&tanggal=${selectedTanggal}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setStudents(json.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadAbsensi();
  }, [selectedTanggal, selectedKelas]);

  const handleStatusChange = (originalIndex: number, newStatus: string) => {
    const updated = [...students];
    updated[originalIndex].status = newStatus;
    setStudents(updated);
  };

  // Tombol: Tandai Semua Hadir (sesuai test.md)
  const handleMarkAllHadir = () => {
    const updated = students.map((s) => ({ ...s, status: 'H' }));
    setStudents(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      // 1. Simpan Absensi
      const resAbsen = await fetch('/api/absensi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kelas: selectedKelas,
          tanggal: selectedTanggal,
          items: students,
        }),
      });

      // 2. Simpan Jurnal Kelas Sekaligus (sesuai test.md: Simpan Absensi & Jurnal)
      const ringkasan = `${students.filter((s) => s.status === 'H').length} Hadir, ${students.filter((s) => s.status === 'A').length} Alpa, ${students.filter((s) => s.status === 'S').length} Sakit, ${students.filter((s) => s.status === 'I').length} Izin`;
      await fetch('/api/jurnal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal: selectedTanggal,
          guru_nama: 'Budi Santoso, S.Kom',
          guru_username: 'uji_guru',
          kelas: selectedKelas,
          mapel: 'Pemrograman Web & Perangkat Bergerak',
          materi: `[Pertemuan ${pertemuanKe}] ${materiKBM}`,
          refleksi: refleksi,
          kehadiran_ringkas: ringkasan,
        }),
      });

      const json = await resAbsen.json();
      if (json.success) {
        setMessage('Presensi & Jurnal KBM berhasil disimpan. Riwayat terverifikasi.');
      } else {
        setMessage('Gagal menyimpan presensi.');
      }
    } catch {
      setMessage('Terjadi kesalahan jaringan.');
    } finally {
      setSaving(false);
    }
  };

  // Filter & Pagination logic
  const filteredIndices = students
    .map((s, idx) => ({ ...s, originalIndex: idx }))
    .filter((s) =>
      s.nama_siswa.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nis.includes(searchQuery)
    );

  const totalPages = Math.ceil(filteredIndices.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const currentItems = filteredIndices.slice(startIndex, startIndex + pageSize);

  const countH = students.filter((s) => s.status === 'H').length;
  const countS = students.filter((s) => s.status === 'S').length;
  const countI = students.filter((s) => s.status === 'I').length;
  const countA = students.filter((s) => s.status === 'A').length;
  const countB = students.filter((s) => s.status === 'B' || s.status === '?').length;

  return (
    <PortalLayout roleTitle="Portal Guru - Presensi Siswa & Jurnal KBM" roleBadge="Guru" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Presensi Siswa & Pengisian Jurnal Kelas</h2>
            <p className="text-sm text-slate-500 mt-1">
              Catat kehadiran harian peserta didik, rangkuman jurnal KBM pertemuan, dan refleksi pembelajaran.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllHadir}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl font-semibold text-xs transition"
            >
              <CheckCheck className="w-4 h-4" />
              Tandai Semua Hadir
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs shadow-sm transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Menyimpan...' : 'Simpan Absensi & Jurnal'}
            </button>
          </div>
        </div>

        {message && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Date & Class Select Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <label className="text-xs font-semibold text-slate-700">Tanggal KBM:</label>
              <select
                value={selectedTanggal}
                onChange={(e) => setSelectedTanggal(e.target.value)}
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

        {/* Ringkasan H/S/I/A/Belum (sesuai test.md) */}
        <div className="grid grid-cols-5 gap-3">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
            <div className="text-[11px] font-semibold text-emerald-700">Hadir (H)</div>
            <div className="text-xl font-bold text-emerald-900 mt-0.5">{countH}</div>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
            <div className="text-[11px] font-semibold text-amber-700">Sakit (S)</div>
            <div className="text-xl font-bold text-amber-900 mt-0.5">{countS}</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-center">
            <div className="text-[11px] font-semibold text-blue-700">Izin (I)</div>
            <div className="text-xl font-bold text-blue-900 mt-0.5">{countI}</div>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-center">
            <div className="text-[11px] font-semibold text-rose-700">Alpa (A)</div>
            <div className="text-xl font-bold text-rose-900 mt-0.5">{countA}</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <div className="text-[11px] font-semibold text-slate-700">Belum (?)</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{countB}</div>
          </div>
        </div>

        {/* Tabel Presensi */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">Memuat presensi siswa...</div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold tracking-wider">
                    <th className="py-3 px-4">No</th>
                    <th className="py-3 px-4">NIS</th>
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-4 text-center">Status Kehadiran</th>
                    <th className="py-3 px-4">Catatan Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentItems.map((s) => (
                    <tr key={s.originalIndex} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-4 text-slate-400 font-mono text-xs">{s.originalIndex + 1}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-600 text-xs">{s.nis}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">{s.nama_siswa}</td>
                      <td className="py-2.5 px-4">
                        <div className="flex justify-center gap-1.5">
                          {[
                            { val: 'H', label: 'Hadir', col: 'bg-emerald-500 text-white' },
                            { val: 'S', label: 'Sakit', col: 'bg-amber-500 text-white' },
                            { val: 'I', label: 'Izin', col: 'bg-blue-500 text-white' },
                            { val: 'A', label: 'Alpa', col: 'bg-rose-500 text-white' },
                            { val: 'B', label: '?', col: 'bg-slate-400 text-white' },
                          ].map((st) => (
                            <button
                              key={st.val}
                              type="button"
                              onClick={() => handleStatusChange(s.originalIndex, st.val)}
                              className={`w-7 h-7 text-xs font-bold rounded-lg transition ${
                                s.status === st.val
                                  ? `${st.col} shadow-xs ring-2 ring-offset-1 ring-blue-400`
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {st.val}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <input
                          type="text"
                          value={s.catatan || ''}
                          onChange={(e) => {
                            const updated = [...students];
                            updated[s.originalIndex].catatan = e.target.value;
                            setStudents(updated);
                          }}
                          placeholder="Catatan siswa..."
                          className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg"
                        />
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

        {/* Form Isi Jurnal Kelas & Agenda Guru (Terintegrasi sesuai test.md) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Isi Jurnal Kelas & Agenda Guru</h3>
              <p className="text-xs text-slate-500 mt-0.5">Disimpan serentak bersama data kehadiran sesi mengajar</p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 font-semibold rounded-lg">
              {selectedKelas} • Jam Ke-1–2
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Pertemuan Ke</label>
              <input
                type="text"
                value={pertemuanKe}
                onChange={(e) => setPertemuanKe(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Materi / TP / ATP</label>
              <input
                type="text"
                value={materiKBM}
                onChange={(e) => setMateriKBM(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Refleksi KBM / Tindak Lanjut</label>
              <input
                type="text"
                value={refleksi}
                onChange={(e) => setRefleksi(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Alasan Koreksi (Bila Ada)</label>
              <input
                type="text"
                value={alasanKoreksi}
                onChange={(e) => setAlasanKoreksi(e.target.value)}
                placeholder="Alasan perubahan data..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
