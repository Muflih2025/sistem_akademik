import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // Authentication & legacy entry points
      {
        source: '/auth/login.php',
        destination: '/auth/login',
        permanent: false,
      },
      {
        source: '/auth/change_password.php',
        destination: '/auth/change-password',
        permanent: false,
      },
      {
        source: '/academic/index.php',
        destination: '/beranda',
        permanent: false,
      },
      // Short URLs (sesuai test.md Bagian 6)
      {
        source: '/beranda',
        destination: '/guru',
        permanent: false,
      },
      {
        source: '/absensi',
        destination: '/guru/absen',
        permanent: false,
      },
      {
        source: '/jurnal',
        destination: '/guru/jurnal',
        permanent: false,
      },
      {
        source: '/guru-mengajar',
        destination: '/kepsek/jadwal',
        permanent: false,
      },
      {
        source: '/piket.php',
        destination: '/piket',
        permanent: false,
      },
      {
        source: '/nilai',
        destination: '/guru/nilai',
        permanent: false,
      },
      {
        source: '/rapor',
        destination: '/guru/rapor',
        permanent: false,
      },
      {
        source: '/kalender',
        destination: '/guru/kalender',
        permanent: false,
      },
      {
        source: '/jadwal',
        destination: '/guru/jadwal',
        permanent: false,
      },
      {
        source: '/jam-belajar',
        destination: '/admin/tahun-ajaran',
        permanent: false,
      },
      {
        source: '/akademik',
        destination: '/admin/penugasan',
        permanent: false,
      },
      {
        source: '/kenaikan',
        destination: '/admin/tahun-ajaran',
        permanent: false,
      },
      {
        source: '/alumni',
        destination: '/admin/master',
        permanent: false,
      },
      // Admin legacy .php mappings
      {
        source: '/admin/:path*.php',
        destination: '/admin',
        permanent: false,
      },
      // Guru legacy .php mappings
      {
        source: '/guru/:path*.php',
        destination: '/guru',
        permanent: false,
      },
      // Kepsek legacy .php mappings
      {
        source: '/kepsek/:path*.php',
        destination: '/kepsek',
        permanent: false,
      },
      // Siswa legacy .php mappings
      {
        source: '/siswa/:path*.php',
        destination: '/siswa',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
