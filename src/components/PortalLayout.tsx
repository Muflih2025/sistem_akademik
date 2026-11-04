'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavigationModule {
  key: string;
  label: string;
  items: { label: string; href: string }[];
}

interface PortalLayoutProps {
  children: React.ReactNode;
  roleTitle?: string;
  roleBadge?: string;
  navItems?: { label: string; href: string; icon?: any }[];
}

export default function PortalLayout({
  children,
  roleTitle = 'Pengguna',
  roleBadge = 'User',
  navItems,
}: PortalLayoutProps) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/me', { signal: controller.signal, cache: 'no-store' }).then(r => r.json()).then(j => {
      if (j.success) { setCurrentUser(j.user); localStorage.setItem('sia_user', JSON.stringify(j.user)); }
      else { localStorage.removeItem('sia_user'); location.assign('/auth/login'); }
    }).catch(e => { if (e.name !== 'AbortError') setCurrentUser(null); });
    return () => controller.abort();
  }, []);
  async function logout(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    const response = await fetch('/api/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    if (response.ok) { localStorage.removeItem('sia_user'); location.assign('/auth/login'); }
  }

  const storedRole = currentUser?.role === 'kepala_sekolah' ? 'kepsek' : currentUser?.role;
  const role = storedRole || (pathname.startsWith('/admin') ? 'admin' : pathname.startsWith('/kepsek') ? 'kepsek' : pathname.startsWith('/piket') ? 'piket' : pathname.startsWith('/siswa') ? 'siswa' : 'guru');

  // Skema Modul & Sub-fitur identik dengan sia_navigation() di branch main
  const modulesByRole: Record<string, NavigationModule[]> = {
    admin: [
      {
        key: 'beranda',
        label: 'Beranda',
        items: [{ label: 'Dashboard Admin', href: '/admin' }],
      },
      {
        key: 'master',
        label: 'Master Data',
        items: [
          { label: 'Data Siswa & Kelas', href: '/admin/master' },
          { label: 'Manajemen Akun', href: '/admin/users' },
          { label: 'Bulk Upload Excel', href: '/admin/bulk-upload' },
        ],
      },
      {
        key: 'akademik',
        label: 'Akademik',
        items: [
          { label: 'Penugasan Guru', href: '/admin/penugasan' },
          { label: 'Kelola Jadwal', href: '/admin/jadwal' },
          { label: 'Tahun Ajaran', href: '/admin/tahun-ajaran' },
          { label: 'Jam Belajar', href: '/admin/jam-belajar' },
          { label: 'Kalender Akademik', href: '/admin/kalender' },
          { label: 'Naik Kelas', href: '/admin/kenaikan' },
          { label: 'Alumni', href: '/admin/alumni' },
          { label: 'Ekstrakurikuler', href: '/admin/ekskul' },
          { label: 'Ekspor Impor Data', href: '/admin/export-import' },
        ],
      },
      {
        key: 'penilaian',
        label: 'Nilai & Rapor',
        items: [{ label: 'Rapor Semester', href: '/admin/nilai' }, { label: 'Absensi Harian & Piket', href: '/piket' }, { label: 'Riwayat Perubahan', href: '/admin/audit' }],
      },
    ],
    guru: [
      {
        key: 'beranda',
        label: 'Beranda',
        items: [{ label: 'Dashboard Guru', href: '/guru' }],
      },
      {
        key: 'mengajar',
        label: 'Mengajar',
        items: [
          { label: 'Absensi & Isi Jurnal', href: '/guru/absen' },
          { label: 'Riwayat Jurnal KBM', href: '/guru/jurnal' },
          { label: 'Jadwal Mengajar', href: '/guru/jadwal' },
          { label: 'Kalender Akademik', href: '/guru/kalender' },
          { label: 'Jam Belajar', href: '/jam-belajar' },
        ],
      },
      {
        key: 'penilaian',
        label: 'Penilaian',
        items: [
          { label: 'Input & Rekap Nilai', href: '/guru/nilai' },
          { label: 'Nilai Ekstrakurikuler', href: '/guru/ekskul' },
          { label: 'Impor CSV / Excel', href: '/guru/impor' },
          { label: 'Nilai Ekstrakurikuler', href: '/guru/ekskul' },
          { label: 'Buku Rapor Kelas', href: '/guru/rapor' },
        ],
      },
      {
        key: 'piket',
        label: 'Guru Piket',
        items: [{ label: 'Pantau Presensi Harian', href: '/piket' }],
      },
    ],
    kepsek: [
      {
        key: 'beranda',
        label: 'Beranda',
        items: [{ label: 'Dashboard Kepsek', href: '/kepsek' }],
      },
      {
        key: 'monitoring',
        label: 'Monitoring',
        items: [
          { label: 'Guru Mengajar & KBM', href: '/kepsek/jadwal' },
          { label: 'Posisi Guru', href: '/kepsek/posisi-guru' },
        ],
      },
      {
        key: 'penilaian',
        label: 'Nilai & Rapor',
        items: [
          { label: 'Evaluasi Capaian Nilai', href: '/kepsek/evaluasi' },
          { label: 'Verifikasi Rapor', href: '/kepsek/rapor' },
        ],
      },
      {
        key: 'akademik',
        label: 'Akademik',
        items: [{ label: 'Kalender Pendidikan', href: '/kepsek/kalender' }],
      },
    ],
    piket: [
      {
        key: 'beranda',
        label: 'Beranda',
        items: [{ label: 'Dashboard Piket', href: '/piket' }],
      },
      {
        key: 'piket',
        label: 'Guru Piket',
        items: [
          { label: 'Matriks & Rekap Presensi', href: '/piket' },
          { label: 'Jadwal Mengajar Guru', href: '/guru/jadwal' },
          { label: 'Kalender Akademik', href: '/guru/kalender' },
          { label: 'Jam Belajar', href: '/jam-belajar' },
        ],
      },
    ],
    siswa: [
      {
        key: 'beranda',
        label: 'Beranda',
        items: [{ label: 'Dashboard Siswa', href: '/siswa' }],
      },
      {
        key: 'akademik',
        label: 'Akademik',
        items: [
          { label: 'Jadwal Kelas', href: '/siswa/jadwal' },
          { label: 'Kalender Akademik', href: '/siswa/kalender' },
        ],
      },
      {
        key: 'hasil',
        label: 'Hasil Belajar',
        items: [
          { label: 'Kehadiran Saya', href: '/siswa/absen' },
          { label: 'Buku Rapor Digital', href: '/siswa/rapor' },
        ],
      },
    ],
  };

  const currentModules = (modulesByRole[role] || modulesByRole.guru).filter(m => m.key !== 'piket' || role !== 'guru' || currentUser?.is_piket);

  // Temukan modul yang sedang aktif berdasarkan path
  const activeModule = currentModules.find((m) =>
    m.items.some((item) => pathname === item.href)
  ) || currentModules[0];

  return (
    <div className="sia-app min-h-screen flex flex-col bg-[#f3f4f6] text-[#111] font-sans antialiased">
      {/* 1. SIA Top Header (Identik dengan .sia-header di main) */}
      <header className="sia-header flex items-center justify-between gap-4 bg-[#111] text-white px-5 py-3 min-h-[76px] sticky top-0 z-40">
        <Link href="/" className="sia-brand text-white no-underline text-xl font-extrabold leading-tight">
          SIA SMKN 2 MAGELANG
          <span className="block text-xs font-normal text-slate-300">
            Sistem Informasi Akademik Terpadu
          </span>
        </Link>

        <div className="sia-identity flex items-center gap-4 text-xs">
          <span className="hidden sm:inline text-slate-300">
            {currentUser?.nama || roleTitle} ({role})
          </span>
          <Link
            href="/auth/login"
            onClick={logout}
            className="sia-logout inline-flex items-center justify-center min-h-[38px] border border-white bg-white text-[#111] hover:bg-slate-100 rounded-[10px] px-3.5 py-1.5 font-semibold text-xs no-underline transition"
          >
            Keluar
          </Link>
        </div>
      </header>

      {/* 2. Horizontal Module Bar (Identik dengan .sia-modules di main) */}
      <nav className="sia-modules flex gap-2 px-5 py-2.5 overflow-x-auto max-w-full bg-white border-b border-[#e5e7eb] scrollbar-thin">
        {currentModules.map((mod) => {
          const isCurrent = mod.key === activeModule.key;
          const firstTarget = mod.items[0]?.href || '#';
          return (
            <Link
              key={mod.key}
              href={firstTarget}
              className={`flex items-center justify-center flex-none min-h-[40px] rounded-[10px] px-4 py-2 text-sm font-semibold whitespace-nowrap no-underline transition ${
                isCurrent
                  ? 'bg-[#111] text-white'
                  : 'text-[#111] hover:bg-[#f3f4f6]'
              }`}
            >
              {mod.label}
            </Link>
          );
        })}
      </nav>

      {/* 3. Main Shell: Sidebar Kiri & Konten Tengah (Identik dengan .sia-shell di main) */}
      <div className="sia-shell flex-1 grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] items-start">
        {/* Contextual Feature Sidebar */}
        <aside className="sia-sidebar bg-white border-b md:border-b-0 md:border-r border-[#e5e7eb] md:sticky md:top-[128px] md:min-h-[calc(100vh-128px)]">
          <div className="sia-sidebar-inner p-4 space-y-3">
            <div>
              <h3 className="sia-module-title text-sm font-bold text-[#111] px-2.5">
                {activeModule.label}
              </h3>
              <p className="sia-sidebar-hint text-[11px] text-[#60646c] px-2.5 mb-2">
                Pilih menu fitur di bawah ini
              </p>
            </div>

            <nav className="grid gap-1">
              {activeModule.items.map((item) => {
                const isItemActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-[10px] text-xs leading-normal transition no-underline ${
                      isItemActive
                        ? 'bg-[#111] text-white font-bold'
                        : 'text-[#111] hover:bg-[#f3f4f6]'
                    }`}
                  >
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Content Area */}
        <main className="sia-content p-4 sm:p-6 md:p-8 min-w-0 max-w-7xl">
          {children}
        </main>
      </div>

      {/* 4. Mobile Bottom Navigation bar (Identik dengan .sia-bottom di main) */}
      <div className="md:hidden sia-bottom fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around bg-white border-t border-[#e5e7eb] py-2 px-1">
        {currentModules.slice(0, 4).map((mod) => (
          <Link
            key={mod.key}
            href={mod.items[0]?.href || '#'}
            className="flex flex-col items-center justify-center text-[11px] font-semibold text-[#111] py-1 px-2 no-underline"
          >
            {mod.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
