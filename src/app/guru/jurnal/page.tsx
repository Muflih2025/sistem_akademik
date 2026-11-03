'use client';

import React, { useState, useEffect } from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Clock, BookOpen, Calendar, FileText, CheckCircle, Save, Plus } from 'lucide-react';

export default function GuruJurnalPage() {
  const [jurnalList, setJurnalList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tanggal, setTanggal] = useState('2026-10-30');
  const [kelas, setKelas] = useState('XII PPLG 2');
  const [mapel, setMapel] = useState('Pemrograman Web & Perangkat Bergerak');
  const [materi, setMateri] = useState('');
  const [refleksi, setRefleksi] = useState('');
  const [kehadiran, setKehadiran] = useState('20 Hadir, 0 Alpa');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const navItems = [
    { label: 'Jadwal Mengajar', href: '/guru/jadwal', icon: Clock },
    { label: 'Presensi Siswa', href: '/guru/absen', icon: BookOpen },
    { label: 'Penilaian Akademik', href: '/guru/nilai', icon: Calendar },
    { label: 'Jurnal Harian KBM', href: '/guru/jurnal', icon: FileText },
    { label: 'Buku Rapor Siswa', href: '/guru/rapor', icon: BookOpen },
    { label: 'Kalender Pendidikan', href: '/guru/kalender', icon: Calendar },
  ];

  const fetchJurnal = () => {
    setLoading(true);
    fetch('/api/jurnal')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setJurnalList(data.data || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchJurnal();
  }, []);

  const handleSimpanJurnal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materi) return;
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/jurnal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal,
          guru_nama: 'Budi Santoso, S.Kom',
          guru_username: 'uji_guru',
          kelas,
          mapel,
          materi,
          refleksi,
          kehadiran_ringkas: kehadiran,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Jurnal KBM berhasil disimpan.');
        setMateri('');
        setRefleksi('');
        fetchJurnal();
      } else {
        setMessage('Gagal menyimpan jurnal.');
      }
    } catch {
      setMessage('Terjadi kesalahan jaringan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalLayout roleTitle="Portal Guru - Jurnal KBM" roleBadge="Guru" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Jurnal Harian Mengajar</h2>
            <p className="text-sm text-slate-500 mt-1">
              Catatan materi pembelajaran, refleksi kelas, dan rekapitulasi kehadiran per sesi KBM.
            </p>
          </div>
          <span className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-xl border border-blue-200">
            Semester Ganjil 2026/2027
          </span>
        </div>

        {/* Form Pengisian Jurnal */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" />
            Pengisian Jurnal KBM Baru
          </h3>

          {message && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleSimpanJurnal} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Tanggal</label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Kelas</label>
              <select
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
              >
                <option value="XII PPLG 2">XII PPLG 2</option>
                <option value="XII PPLG 1">XII PPLG 1</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Mata Pelajaran</label>
              <input
                type="text"
                value={mapel}
                onChange={(e) => setMapel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Materi & Capaian Pembelajaran</label>
              <textarea
                rows={2}
                value={materi}
                onChange={(e) => setMateri(e.target.value)}
                placeholder="Tuliskan materi dan topik KBM..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Catatan / Refleksi</label>
              <input
                type="text"
                value={refleksi}
                onChange={(e) => setRefleksi(e.target.value)}
                placeholder="Catatan perkembangan atau kendala belajar (opsional)"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Menyimpan...' : 'Simpan Jurnal'}
              </button>
            </div>
          </form>
        </div>

        {/* Riwayat Jurnal */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Riwayat Jurnal KBM Terverifikasi</h3>
            <span className="text-xs text-slate-500">{jurnalList.length} Jurnal Tercatat</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Memuat data jurnal...</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {jurnalList.map((j) => (
                <div key={j.id} className="p-5 hover:bg-slate-50/80 transition space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {j.tanggal}
                      </span>
                      <span className="font-semibold text-sm text-slate-900">{j.mapel}</span>
                      <span className="text-xs text-slate-500">• {j.kelas}</span>
                    </div>
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      {j.kehadiran_ringkas}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">{j.materi}</p>
                  {j.refleksi && (
                    <p className="text-xs text-slate-500 italic">Refleksi: {j.refleksi}</p>
                  )}
                  <div className="text-[11px] text-slate-400">Guru: {j.guru_nama}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
