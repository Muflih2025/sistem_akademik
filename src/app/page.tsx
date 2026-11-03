import Link from 'next/link';
import {
  GraduationCap,
  ShieldCheck,
  UserCheck,
  BookOpen,
  Award,
  ArrowRight,
  School
} from 'lucide-react';

export default function HomePage() {
  const portalRoles = [
    {
      title: 'Portal Siswa',
      desc: 'Jadwal pelajaran, presensi harian, nilai akademik, dan rapor digital siswa.',
      href: '/siswa',
      icon: BookOpen,
      badge: 'Siswa',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400',
      btnColor: 'bg-emerald-600 hover:bg-emerald-700',
    },
    {
      title: 'Portal Guru',
      desc: 'Pengisian jurnal KBM, absensi siswa, input penilaian capaian, dan ekskul.',
      href: '/guru',
      icon: UserCheck,
      badge: 'Guru & Wali',
      color: 'bg-sky-50 text-sky-700 border-sky-200 hover:border-sky-400',
      btnColor: 'bg-sky-600 hover:bg-sky-700',
    },
    {
      title: 'Portal Kepala Sekolah',
      desc: 'Monitoring keterlaksanaan KBM harian, rekapitulasi nilai rapor, dan kalender.',
      href: '/kepsek',
      icon: Award,
      badge: 'Pimpinan',
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:border-indigo-400',
      btnColor: 'bg-indigo-600 hover:bg-indigo-700',
    },
    {
      title: 'Portal Administrator',
      desc: 'Manajemen pengguna, tahun ajaran, plotting jam mengajar, dan verifikasi rapor.',
      href: '/admin',
      icon: ShieldCheck,
      badge: 'Admin & Staf',
      color: 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400',
      btnColor: 'bg-amber-600 hover:bg-amber-700',
    },
  ];

  return (
    <main className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 bg-white shadow-xs sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
              <School className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-tight">SIA SMKN 2 MAGELANG</h1>
              <p className="text-xs text-slate-500">Sistem Informasi Akademik Terpadu</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition"
            >
              Masuk Akun
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 sm:py-16 bg-linear-to-b from-white to-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 mb-6">
            <GraduationCap className="w-4 h-4" />
            Tahun Ajaran 2026/2027 Ganjil — Sistem Terverifikasi
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Layanan Akademik Digital Sekolah
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
            Akses menyeluruh untuk presensi mengajar, rekapitulasi jurnal, validasi nilai, dan penerbitan buku rapor digital.
          </p>
        </div>
      </section>

      {/* Portal Cards Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {portalRoles.map((portal) => {
            const Icon = portal.icon;
            return (
              <div
                key={portal.title}
                className="flex flex-col justify-between p-6 bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`p-2.5 rounded-xl border ${portal.color}`}>
                      <Icon className="w-6 h-6" />
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {portal.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition">
                    {portal.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                    {portal.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <Link
                    href={portal.href}
                    className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-xs transition ${portal.btnColor}`}
                  >
                    Buka Portal
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
          © 2026 SMKN 2 Magelang. Hak cipta dilindungi undang-undang.
        </div>
      </footer>
    </main>
  );
}
