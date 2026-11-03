import type { NextConfig } from 'next';

const PHP_BACKEND = process.env.PHP_BACKEND_URL || 'http://127.0.0.1:18125';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      // Proxy all .php file requests directly to PHP backend
      {
        source: '/:path*.php',
        destination: `${PHP_BACKEND}/:path*.php`,
      },
      // Proxy assets and errors if requested
      {
        source: '/assets/:path*',
        destination: `${PHP_BACKEND}/assets/:path*`,
      },
      {
        source: '/errors/:path*',
        destination: `${PHP_BACKEND}/errors/:path*`,
      },
      // Proxy academic backend module routes
      {
        source: '/academic/:path*',
        destination: `${PHP_BACKEND}/academic/:path*`,
      },
    ];
  },
};

export default nextConfig;
