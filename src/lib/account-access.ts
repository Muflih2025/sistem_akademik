import bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import type { AuthUser } from './auth';
import type { Row } from './academic';
import { audit, choice, db, ensureVersion, fail, hash, nextId, one, role, rows, text, unique, write } from './store';

const digest = (token: string) => createHash('sha256').update(token).digest('hex');
const credentialVersion = (u: Row) => hash([u.id_user, u.username, u.password, u.role, u.id_referensi, u.status]);
export function registrationPending(id: string) {
  return rows("SELECT action FROM ak_riwayat WHERE entity='users' AND record_id=? AND action IN ('daftar','setujui') ORDER BY rowid DESC LIMIT 1", id)[0]?.action === 'daftar';
}

export async function registerAccount(input: Row) {
  const username = text(input.username, 'Username', 50);
  if (!/^[A-Za-z0-9_.@-]{3,50}$/.test(username)) fail('Username harus 3–50 karakter huruf, angka, titik, garis bawah, @ atau tanda hubung.');
  const accountRole = choice(input.role, ['guru', 'siswa'], 'Peran');
  const identity = text(input.identity, 'NIP / NIS', 50), name = text(input.nama, 'Nama lengkap', 150);
  if (typeof input.password !== 'string' || input.password.length < 8 || Buffer.byteLength(input.password) > 72 || input.password !== input.confirm_password) fail('Password minimal 8 karakter, maksimal 72 byte dan konfirmasinya harus sama.');
  const password = await bcrypt.hash(input.password, 12);
  return db.transaction(() => {
    unique('users', 'username', username, 'id_user');
    const matches = rows(`SELECT * FROM ${accountRole} WHERE ${accountRole === 'guru' ? 'nip' : 'nis'}=? AND status='aktif'`, identity);
    const profile = matches[0];
    if (matches.length !== 1 || String(profile[accountRole === 'guru' ? 'nama_guru' : 'nama_siswa']).trim().toLocaleLowerCase('id') !== name.toLocaleLowerCase('id')) fail('Identitas tidak cocok atau sudah memiliki akun. Hubungi admin sekolah untuk verifikasi.');
    const ref = String(profile[accountRole === 'guru' ? 'id_guru' : 'nis']);
    if (rows('SELECT 1 FROM users WHERE role=? AND id_referensi=?', accountRole, ref).length) fail('Identitas tidak cocok atau sudah memiliki akun. Hubungi admin sekolah untuk verifikasi.');
    const id = nextId('users', 'id_user');
    const applicant: AuthUser = { id_user: id, username, role: accountRole as 'guru' | 'siswa', id_referensi: ref, nama: name };
    write(applicant, 'users', { id_user: id }, { username, password, role: accountRole, id_referensi: ref, status: 'nonaktif' }, 'Pendaftaran mandiri menunggu verifikasi identitas oleh admin');
    audit(applicant, 'users', id, null, { username, role: accountRole, status: 'menunggu_persetujuan' }, 'Admin harus memverifikasi identitas sebelum mengaktifkan akun', 'daftar');
    return { message: 'Pendaftaran diterima. Hubungi admin sekolah untuk verifikasi identitas dan aktivasi akun, lalu masuk dengan password yang Anda buat.' };
  }).immediate();
}

export function issuePasswordReset(user: AuthUser, input: Row) {
  role(user, 'admin');
  const id = text(input.id_user, 'ID akun', 40), target = one('users', { id_user: id });
  if (!target || target.status !== 'aktif') fail('Pilih akun aktif untuk reset password.');
  ensureVersion(target, input);
  const reason = text(input.alasan, 'Alasan verifikasi identitas', 500);
  const token = randomBytes(32).toString('base64url'), expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  // Persist a token digest in the existing transactional audit store. Never store the usable token.
  // Issuing another link supersedes every previous link for this account.
  audit(user, 'password_reset', digest(token), null, { id_user: id, expires_at: expires, credential_version: credentialVersion(target) }, reason, 'diterbitkan');
  return { reset_path: '/auth/reset-password#token=' + token, expires_at: expires };
}

export async function resetPassword(input: Row) {
  if (typeof input.token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(input.token)) fail('Tautan reset tidak valid atau kedaluwarsa.');
  if (typeof input.new_password !== 'string' || input.new_password.length < 8 || Buffer.byteLength(input.new_password) > 72 || input.new_password !== input.confirm_password) fail('Password minimal 8 karakter, maksimal 72 byte dan konfirmasinya harus sama.');
  const password = await bcrypt.hash(input.new_password, 12);
  db.transaction(() => {
    const event = rows("SELECT * FROM ak_riwayat WHERE entity='password_reset' AND record_id=? ORDER BY rowid DESC LIMIT 1", digest(input.token))[0];
    if (!event || event.action !== 'diterbitkan') fail('Tautan reset tidak valid atau kedaluwarsa.');
    const data = JSON.parse(event.sesudah), target = one('users', { id_user: data.id_user });
    const latest = rows("SELECT record_id,sesudah FROM ak_riwayat WHERE entity='password_reset' AND action='diterbitkan' ORDER BY rowid DESC").find(r => JSON.parse(r.sesudah).id_user === data.id_user);
    if (!target || target.status !== 'aktif' || data.expires_at <= new Date().toISOString() || data.credential_version !== credentialVersion(target) || latest?.record_id !== event.record_id) fail('Tautan reset tidak valid atau kedaluwarsa.');
    if (target.role === 'guru' && !rows("SELECT 1 FROM guru WHERE id_guru=? AND status='aktif'", target.id_referensi).length || target.role === 'siswa' && !rows("SELECT 1 FROM siswa WHERE nis=? AND status='aktif'", target.id_referensi).length) fail('Profil akun tidak aktif.');
    const owner: AuthUser = { id_user: target.id_user, username: target.username, role: target.role, id_referensi: target.id_referensi, nama: target.username };
    write(owner, 'users', { id_user: target.id_user }, { password }, 'Pemulihan password melalui tautan dari admin');
    audit(owner, 'password_reset', event.record_id, null, { id_user: target.id_user }, 'Tautan reset sudah digunakan', 'digunakan');
  }).immediate();
}
