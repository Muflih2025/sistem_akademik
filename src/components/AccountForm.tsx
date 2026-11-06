'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { inputClass, buttonClass } from './modules/Common';

export default function AccountForm({ mode }: { mode: 'register' | 'reset' }) {
  const registering = mode === 'register';
  const [values, setValues] = useState({ username: '', nama: '', role: 'siswa', identity: '', password: '', confirm_password: '', token: '' });
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState('');
  useEffect(() => {
    if (!registering) {
      const token = new URLSearchParams(location.hash.slice(1)).get('token') || '';
      if (token) {
        setValues(v => ({ ...v, token }));
        history.replaceState(null, '', location.pathname);
      }
    }
  }, [registering]);
  function field(key: keyof typeof values, label: string, type = 'text', maxLength = 150) {
    return <label className="block text-sm">{label}<input aria-label={label} name={key} type={type} required disabled={busy} maxLength={maxLength} minLength={key.includes('password') ? 8 : undefined} autoComplete={key.includes('password') ? 'new-password' : key === 'username' ? 'username' : 'off'} value={values[key]} onChange={e => setValues({ ...values, [key]: e.target.value })} className={inputClass} /></label>;
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/' + (registering ? 'register' : 'reset-password'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(registering ? values : { token: values.token, new_password: values.password, confirm_password: values.confirm_password }) });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || 'Permintaan gagal.');
      if (!registering) localStorage.removeItem('sia_user');
      setValues(v => ({ ...v, password: '', confirm_password: '', token: '' })); setSuccess(result.message);
    } catch (e) { setError(e instanceof Error ? e.message : 'Layanan sementara tidak tersedia.'); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen grid place-items-center bg-gray-100 p-5"><section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 space-y-5">
    <h1 className="text-2xl font-bold">{registering ? 'Daftar akun sekolah' : 'Atur ulang password'}</h1>
    <p className="text-sm text-gray-600">{registering ? 'Guru dan siswa yang sudah terdaftar di sekolah dapat mengajukan akun. Admin memverifikasi identitas sebelum akun dapat digunakan. Akun Admin dan Kepala Sekolah dibuat oleh admin.' : 'Gunakan tautan sekali pakai dari admin sekolah. Tautan berlaku 30 menit. Setelah berhasil, masuk kembali dengan password baru.'}</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {success ? <p role="status" className="text-sm">{success}</p> : <form onSubmit={submit} className="space-y-4">
      {registering && <>{field('nama', 'Nama lengkap sesuai data sekolah')}<label className="block text-sm">Peran<select aria-label="Peran" className={inputClass} value={values.role} disabled={busy} onChange={e => setValues({ ...values, role: e.target.value, identity: '' })}><option value="siswa">Siswa</option><option value="guru">Guru</option></select></label>{field('identity', values.role === 'guru' ? 'NIP' : 'NIS', 'text', 50)}{field('username', 'Username', 'text', 50)}</>}
      {!registering && !values.token && <p className="text-sm">Tautan reset belum tersedia. Hubungi admin untuk memperoleh tautan baru.</p>}
      {field('password', 'Password baru', 'password', 72)}{field('confirm_password', 'Konfirmasi password', 'password', 72)}
      <button disabled={busy || !registering && !values.token} className={buttonClass + ' w-full'}>{busy ? 'Memproses…' : registering ? 'Ajukan pendaftaran' : 'Simpan password baru'}</button>
    </form>}
    <div className="flex flex-wrap justify-between gap-3 text-sm"><Link href="/auth/login" className="underline">Kembali ke login</Link>{!registering && <Link href="/auth/forgot-password" className="underline">Bantuan lupa password</Link>}</div>
  </section></main>;
}
