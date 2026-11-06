import { fail } from './academic';
const attempts = new Map<string, { count: number; until: number }>();
export function limitAccountWrite(request: Request, operation: string) {
  // Do not trust caller-controlled forwarded IP headers. Bound anonymous expensive writes
  // across this instance; shared deployment-wide limiting belongs at the reverse proxy.
  const key = operation, now = Date.now(), previous = attempts.get(key);
  if (previous && previous.until > now && previous.count >= 30) fail('Terlalu banyak permintaan. Coba lagi dalam 15 menit.', 429);
  attempts.set(key, { count: previous && previous.until > now ? previous.count + 1 : 1, until: previous && previous.until > now ? previous.until : now + 900000 });
}
