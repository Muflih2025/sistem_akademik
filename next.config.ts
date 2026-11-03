import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/auth/login.php',
        destination: '/auth/login',
        permanent: false,
      },
      {
        source: '/admin/:path*.php',
        destination: '/admin',
        permanent: false,
      },
      {
        source: '/guru/:path*.php',
        destination: '/guru',
        permanent: false,
      },
      {
        source: '/kepsek/:path*.php',
        destination: '/kepsek',
        permanent: false,
      },
      {
        source: '/siswa/:path*.php',
        destination: '/siswa',
        permanent: false,
      },
      {
        source: '/piket.php',
        destination: '/piket',
        permanent: false,
      },
      {
        source: '/absensi',
        destination: '/guru/absen',
        permanent: false,
      },
      {
        source: '/jadwal',
        destination: '/guru/jadwal',
        permanent: false,
      },
      {
        source: '/nilai',
        destination: '/guru/nilai',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
