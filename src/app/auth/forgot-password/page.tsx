import Link from 'next/link';
export default function ForgotPasswordPage() {
  return <main className="min-h-screen grid place-items-center bg-gray-100 p-5"><section className="w-full max-w-md rounded-2xl border bg-white p-6 space-y-5">
    <h1 className="text-2xl font-bold">Lupa password?</h1>
    <p>Hubungi admin sekolah dan sampaikan username serta NIS atau NIP Anda. Admin akan memeriksa identitas Anda sebelum membuat tautan reset password.</p>
    <ol className="list-decimal pl-5 space-y-2 text-sm"><li>Admin membuka Pengaturan → Manajemen Akun, lalu memilih Reset password pada akun Anda.</li><li>Setelah memverifikasi identitas, admin memberikan tautan reset melalui kanal pribadi yang disepakati.</li><li>Buka tautan dalam 30 menit, isi password baru beserta konfirmasinya, lalu login kembali. Tautan hanya bisa dipakai sekali.</li></ol>
    <p className="text-sm text-gray-600">Pengiriman email otomatis belum tersedia. Jika masih dapat masuk dan ingin mengganti password, gunakan menu Ganti password pada akun Anda. Jika satu-satunya admin lupa password, pemulihan harus dibantu pengelola server setelah verifikasi identitas.</p>
    <Link href="/auth/login" className="inline-block text-sm underline">Kembali ke login</Link>
  </section></main>;
}
