import { cookies } from 'next/headers';
import db from '@/lib/db';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
export interface AuthUser {
  id_user: string; username: string; role: 'admin' | 'guru' | 'kepala_sekolah' | 'siswa';
  id_referensi: string | null; nama: string; is_piket?: boolean;
}
export const SESSION_COOKIE = 'sia_session_token';
const directory = () => path.join(process.cwd(), 'data', '.sessions');
function secret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const file = path.join(directory(), 'key');
  fs.mkdirSync(directory(), { recursive: true, mode: 0o700 });
  try { fs.writeFileSync(file, crypto.randomBytes(48).toString('hex'), { flag: 'wx', mode: 0o600 }); }
  catch (e) { if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e; }
  return fs.readFileSync(file, 'utf8');
}
function fingerprint(row: Record<string, unknown>) {
  return crypto.createHmac('sha256', secret()).update(JSON.stringify([row.id_user, row.username, row.password, row.role, row.id_referensi, row.status])).digest('hex');
}
export function userProfile(row: Record<string, any>): AuthUser {
  const ref = row.role === 'guru'
    ? db.prepare('SELECT nama_guru AS nama,status FROM guru WHERE id_guru=?').get(row.id_referensi) as any
    : row.role === 'siswa' ? db.prepare('SELECT nama_siswa AS nama,status FROM siswa WHERE nis=?').get(row.id_referensi) as any : null;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  return { id_user: String(row.id_user), username: row.username, role: row.role, id_referensi: row.id_referensi,
    nama: ref?.nama || row.username, is_piket: row.role === 'guru' && !!db.prepare("SELECT 1 FROM ak_tugas_piket WHERE id_guru=? AND aktif='1' AND mulai<=? AND selesai>=?").get(row.id_referensi, today, today) };
}
export function createSessionToken(user: AuthUser): string {
  const row = db.prepare("SELECT * FROM users WHERE id_user=? AND status='aktif'").get(user.id_user) as any;
  if (!row) throw Error('Akun tidak aktif');
  const sid = crypto.randomBytes(32).toString('hex'), exp = Date.now() + 8 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ ...user, sid, exp })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret()).update(payload).digest('hex');
  fs.mkdirSync(directory(), { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(directory(), sid), JSON.stringify({ id: user.id_user, fingerprint: fingerprint(row), exp }), { flag: 'wx', mode: 0o600 });
  return `${payload}.${signature}`;
}
export function parseSessionToken(token: string): (AuthUser & { sid: string; exp: number }) | null {
  try {
    const parts = token.split('.'); if (parts.length !== 2 || !/^[a-f0-9]{64}$/.test(parts[1])) return null;
    const signature = crypto.createHmac('sha256', secret()).update(parts[0]).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(parts[1]), Buffer.from(signature))) return null;
    const data = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    if (!/^[a-f0-9]{64}$/.test(data.sid) || !Number.isFinite(data.exp) || Date.now() >= data.exp) return null;
    const session = JSON.parse(fs.readFileSync(path.join(directory(), data.sid), 'utf8'));
    const rows = db.prepare("SELECT * FROM users WHERE id_user=? AND status='aktif'").all(data.id_user) as any[];
    if (rows.length !== 1 || session.id !== data.id_user || session.exp !== data.exp || session.fingerprint !== fingerprint(rows[0])) return null;
    const row = rows[0];
    if (row.role === 'guru' && !db.prepare("SELECT 1 FROM guru WHERE id_guru=? AND status='aktif'").get(row.id_referensi)) return null;
    if (row.role === 'siswa' && !db.prepare("SELECT 1 FROM siswa WHERE nis=? AND status='aktif'").get(row.id_referensi)) return null;
    return { ...userProfile(row), sid: data.sid, exp: data.exp };
  } catch { return null; }
}
export function revokeSession(token: string) {
  const data = parseSessionToken(token);
  if (data) fs.rmSync(path.join(directory(), data.sid), { force: true });
}
export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const data = token ? parseSessionToken(token) : null;
  if (!data) return null; const { sid, exp, ...user } = data; return user;
}
