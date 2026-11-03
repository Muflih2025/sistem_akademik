import { cookies } from 'next/headers';
import db from '@/lib/db';
import crypto from 'crypto';

export interface AuthUser {
  id_user: string;
  username: string;
  role: 'admin' | 'guru' | 'kepala_sekolah' | 'siswa';
  id_referensi: string | null;
  nama: string;
  is_piket?: boolean;
}

const SESSION_COOKIE = 'sia_session_token';
const SECRET_KEY = process.env.SESSION_SECRET || 'sia_smkn2_magelang_secret_key_2026';

// Map session tokens in memory or signed token
export function createSessionToken(user: AuthUser): string {
  const payload = JSON.stringify({
    ...user,
    exp: Date.now() + 8 * 60 * 60 * 1000, // 8 hours
  });
  const hmac = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
  return Buffer.from(payload).toString('base64') + '.' + hmac;
}

export function parseSessionToken(token: string): AuthUser | null {
  try {
    const [b64, hmac] = token.split('.');
    if (!b64 || !hmac) return null;
    const expected = crypto.createHmac('sha256', SECRET_KEY).update(Buffer.from(b64, 'base64').toString()).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected))) return null;
    const data = JSON.parse(Buffer.from(b64, 'base64').toString());
    if (Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const user = parseSessionToken(token);
  if (!user) return null;

  // Double check user still active in DB
  const row = db.prepare("SELECT * FROM users WHERE id_user = ? AND status = 'aktif'").get(user.id_user) as any;
  if (!row) return null;

  // Authorization uses current database metadata, never a stale role in a cookie.
  const duty = row.role === 'guru' && !!db.prepare("SELECT 1 FROM ak_tugas_piket WHERE id_guru=? AND aktif='1'").get(row.id_referensi);
  return { ...user, role: row.role, id_referensi: row.id_referensi, is_piket: duty };
}
