'use client';

import React, { useEffect, useState } from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Clock, BookOpen, Calendar, CheckCircle, Save, AlertCircle } from 'lucide-react';

export default function GuruAbsenPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const navItems = [
    { label: 'Jadwal Mengajar', href: '/guru/jadwal', icon: Clock },
    { label: 'Presensi Siswa', href: '/guru/absen', icon: BookOpen },
    { label: 'Penilaian Akademik', href: '/guru/nilai', icon: Calendar },
  ];

  useEffect(() => {
    fetch('/api/absensi?kelas=XII%20PPLG%202&tanggal=2026-11-03')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setStudents(json.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleStatusChange = (index: number, newStatus: string) => {
    const updated = [...students];
    updated[index].status = newStatus;
    setStudents(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/absensi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kelas: 'XII PPLG 2',
          tanggal: '2026-11-03',
          items: students,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Presensi kelas XII PPLG 2 berhasil tersimpan ke sistem!');
      } else {
        setMessage('Gagal menyimpan: ' + data.error);
      }
    } catch (e: any) {
      setMessage('Terjadi kesalahan koneksi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalLayout roleTitle="Portal Guru - Presensi Siswa" roleBadge="Guru" navItems={navItems}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Presensi Siswa Harian</h2>
            <p className="text-sm text-slate-500 mt-1">
              Kelas XII PPLG 2 • Pemrograman Web & Perangkat Bergerak
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Menyimpan...' : 'Simpan Presensi'}
          </button>
        </div>

        {message && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-slate-400">Memuat data presensi...</div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold tracking-wider">
                    <th className="py-3.5 px-4">No</th>
                    <th className="py-3.5 px-4">NIS</th>
                    <th className="py-3.5 px-4">Nama Siswa</th>
                    <th className="py-3.5 px-4 text-center">Status Kehadiran</th>
                    <th className="py-3.5 px-4">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {students.map((s, idx) => (
                    <tr key={s.id || idx} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-xs">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 text-xs">{s.nis}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{s.nama_siswa}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {[
                            { key: 'H', label: 'Hadir', color: 'bg-emerald-500 text-white' },
                            { key: 'S', label: 'Sakit', color: 'bg-amber-500 text-white' },
                            { key: 'I', label: 'Izin', color: 'bg-blue-500 text-white' },
                            { key: 'A', label: 'Alpa', color: 'bg-rose-500 text-white' },
                          ].map((stat) => (
                            <button
                              key={stat.key}
                              type="button"
                              onClick={() => handleStatusChange(idx, stat.key)}
                              className={`px-3 py-1 text-xs font-bold rounded-lg border transition ${
                                s.status === stat.key
                                  ? stat.color + ' border-transparent shadow-xs'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {stat.key}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <input
                          type="text"
                          value={s.catatan || ''}
                          onChange={(e) => {
                            const updated = [...students];
                            updated[idx].catatan = e.target.value;
                            setStudents(updated);
                          }}
                          placeholder="Keterangan..."
                          className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500 text-slate-700"
                        />
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
