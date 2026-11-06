'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        router.push(data.redirect || '/guru');
      } else {
        setError(data.error || 'Username atau password salah/nonaktif.');
      }
    } catch {
      setError('Layanan login sementara tidak tersedia.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page min-h-screen grid place-items-center p-6 bg-[#f3f4f6]">
      <main className="login-shell w-full max-w-[420px]">
        <section className="login-card p-8 bg-white border border-[#e5e7eb] rounded-[20px] shadow-[0_8px_32px_rgba(17,16,0,0.024)]">
          {/* Logo Mark */}
          <div className="login-mark grid place-items-center w-12 h-12 rounded-[14px] bg-[#111] text-white mb-6" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1z M12 5v15" />
            </svg>
          </div>

          <p className="login-school text-xs font-semibold leading-relaxed mb-3 text-[#575b63]">
            SISTEM INFORMASI AKADEMIK<br />
            SMK Negeri 2 Magelang
          </p>

          <h1 className="text-2xl font-bold tracking-tight text-[#111] mb-2.5">
            Masuk ke akun Anda
          </h1>
          <p className="login-intro text-sm text-[#60646c] mb-7">
            Kelola kegiatan akademik dengan mudah.
          </p>

          {error && (
            <div className="login-error bg-[#f3f4f6] border border-[#d1d5db] border-l-4 border-l-[#111] rounded-[10px] text-[#111] p-3 text-sm mb-5" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="login-field flex flex-col gap-2 min-w-0">
              <span className="text-sm font-semibold text-[#111]">Username / NIS</span>
              <input
                type="text"
                name="username"
                autoComplete="username"
                maxLength={50}
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full min-h-[48px] px-3.5 py-3 text-base text-[#111] bg-white border border-[#d1d5db] rounded-[10px] focus:outline-2 focus:outline-[#111] focus:outline-offset-2"
              />
            </label>

            <label className="login-field flex flex-col gap-2 min-w-0">
              <span className="text-sm font-semibold text-[#111]">Password</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-h-[48px] px-3.5 py-3 text-base text-[#111] bg-white border border-[#d1d5db] rounded-[10px] focus:outline-2 focus:outline-[#111] focus:outline-offset-2"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[50px] px-4 py-3 mt-2 border border-[#111] rounded-[10px] bg-[#111] text-white text-base font-semibold hover:bg-[#2c2c2c] transition duration-150 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#f3f4f6] flex flex-wrap justify-between gap-3 text-sm">
            <Link href="/auth/register" className="underline">Daftar akun</Link>
            <Link href="/auth/forgot-password" className="underline">Lupa password?</Link>
          </div>
        </section>

        <p className="login-footnote text-xs leading-relaxed text-center mt-6 text-[#60646c]">
          Gunakan akun yang diberikan oleh sekolah.
        </p>
      </main>
    </div>
  );
}
