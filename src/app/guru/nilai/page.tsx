'use client';

import React, { useEffect, useState } from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Clock, BookOpen, Calendar, Save, CheckCircle, Award } from 'lucide-react';

export default function GuruNilaiPage() {
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const navItems = [
    { label: 'Jadwal Mengajar', href: '/guru/jadwal', icon: Clock },
    { label: 'Presensi Siswa', href: '/guru/absen', icon: BookOpen },
    { label: 'Penilaian Akademik', href: '/guru/nilai', icon: Calendar },
  ];

  useEffect(() => {
    fetch('/api/nilai?kelas=XII%20PPLG%202')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setGrades(json.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleGradeChange = (index: number, field: string, value: number) => {
    const updated = [...grades];
    updated[index][field] = value;
    const tugas = Number(updated[index].nilai_tugas) || 0;
    const uts = Number(updated[index].nilai_uts) || 0;
    const uas = Number(updated[index].nilai_uas) || 0;
    const akhir = Math.round((tugas + uts + uas) / 3);
    updated[index].nilai_akhir = akhir;
    if (akhir >= 85) updated[index].predikat = 'A';
    else if (akhir >= 75) updated[index].predikat = 'B';
    else if (akhir >= 65) updated[index].predikat = 'C';
    else updated[index].predikat = 'D';

    setGrades(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/nilai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kelas: 'XII PPLG 2',
          mapel: 'Pemrograman Web & Perangkat Bergerak',
          items: grades,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Capaian nilai berhasil disimpan & dihitung secara otomatis!');
      } else {
        setMessage('Gagal menyimpan: ' + data.error);
      }
    } catch {
      setMessage('Terjadi kesalahan koneksi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalLayout roleTitle="Portal Guru - Penilaian Akademik" roleBadge="Guru" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Penilaian Capaian Siswa</h2>
            <p className="text-sm text-slate-500 mt-1">
              Kelas XII PPLG 2 • Mata Pelajaran: Pemrograman Web & Perangkat Bergerak
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Menyimpan...' : 'Simpan Nilai'}
          </button>
        </div>

        {message && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-slate-400">Memuat data nilai...</div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold tracking-wider">
                    <th className="py-3.5 px-4">No</th>
                    <th className="py-3.5 px-4">NIS</th>
                    <th className="py-3.5 px-4">Nama Siswa</th>
                    <th className="py-3.5 px-4 text-center">Tugas (30%)</th>
                    <th className="py-3.5 px-4 text-center">UTS (30%)</th>
                    <th className="py-3.5 px-4 text-center">UAS (40%)</th>
                    <th className="py-3.5 px-4 text-center">Nilai Akhir</th>
                    <th className="py-3.5 px-4 text-center">Predikat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {grades.map((g, idx) => (
                    <tr key={g.id || idx} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-xs">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 text-xs">{g.nis}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{g.nama_siswa}</td>
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={g.nilai_tugas || ''}
                          onChange={(e) => handleGradeChange(idx, 'nilai_tugas', Number(e.target.value))}
                          className="w-16 px-2 py-1 text-center font-semibold text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500"
                        />
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={g.nilai_uts || ''}
                          onChange={(e) => handleGradeChange(idx, 'nilai_uts', Number(e.target.value))}
                          className="w-16 px-2 py-1 text-center font-semibold text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500"
                        />
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={g.nilai_uas || ''}
                          onChange={(e) => handleGradeChange(idx, 'nilai_uas', Number(e.target.value))}
                          className="w-16 px-2 py-1 text-center font-semibold text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500"
                        />
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-900 font-mono">
                        {g.nilai_akhir}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block w-7 h-7 leading-7 text-xs font-bold rounded-full ${
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
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
