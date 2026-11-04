import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sistem Informasi Akademik - SMKN 2 Magelang',
  description: 'Portal Akademik Terpadu Siswa, Guru, dan Tenaga Kependidikan',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      {/* Browser writing extensions may add attributes to body before hydration. */}
      <body suppressHydrationWarning className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
