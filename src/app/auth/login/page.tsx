'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { School, KeyRound, User, AlertCircle, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';

const PRESET_ACCOUNTS: Record<string, { username: string; roleName: string }> = {
  admin: { username: 'uji_admin', roleName: 'Administrator (uji_admin)' },
  guru: { username: 'uji_guru', roleName: 'Guru Utama (uji_guru - XII PPLG 2)' },
  guru_lain: { username: 'uji_guru_lain', roleName: 'Guru Kedua (uji_guru_lain - XII PPLG 1)' },
  piket: { username: 'uji_piket', roleName: 'Guru Piket (uji_piket)' },
  kepsek: { username: 'uji_kepsek', roleName: 'Kepala Sekolah (uji_kepsek)' },
  siswa: { username: 'uji_siswa', roleName: 'Siswa (uji_siswa - XII PPLG 2)' },
  siswa_lain: { username: 'uji_siswa_lain', roleName: 'Siswa Pembanding (uji_siswa_lain - XII PPLG 1)' },
};

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState('guru');
  const [username, setUsername] = useState('uji_guru');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = (roleKey: string) => {
    setSelectedRole(roleKey);
    const preset = PRESET_ACCOUNTS[roleKey];
    if (preset) {
      setUsername(preset.username);
      setPassword('password');
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (data.success) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('sia_user', JSON.stringify(data.user));
        }
        window.location.href = data.redirect;
      } else {
        setError(data.error || 'Username atau password salah.');
      }
    } catch {
      setError('Gagal menghubungi server autentikasi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 px-6 py-8 text-white text-center">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-xs">
            <School className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">SIA SMKN 2 MAGELANG</h2>
          <p className="text-xs text-blue-100 mt-1">
            Masuk dengan akun terdaftar untuk mengakses layanan
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Pilihan Akun Uji Coba
            </label>
            <select
              value={selectedRole}
              onChange={(e) => handleRoleSelect(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white text-slate-800"
            >
              {Object.entries(PRESET_ACCOUNTS).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.roleName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              Simulasi siap: Pilih akun dari dropdown di atas (password default:{' '}
              <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-semibold">password</code>).
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                Masuk ke Portal
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="text-center pt-2">
            <Link href="/" className="text-xs text-slate-500 hover:text-slate-800 underline">
              Kembali ke Beranda
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
