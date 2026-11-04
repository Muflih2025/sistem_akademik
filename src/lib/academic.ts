import db from './db';
import { AuthUser, getCurrentUser } from './auth';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export type Row = Record<string, any>;
export class AcademicError extends Error {
  constructor(message: string, public status = 422) { super(message); }
}
export function fail(message: string, status = 422): never { throw new AcademicError(message, status); }
export function errorResponse(error: unknown) {
  return NextResponse.json({ success: false, error: error instanceof AcademicError ? error.message : 'Operasi gagal. Data tidak disimpan; hubungi pengelola.' }, { status: error instanceof AcademicError ? error.status : error instanceof SyntaxError ? 400 : 500 });
}
export async function actor() {
  const user = await getCurrentUser();
  if (!user) fail('Silakan login terlebih dahulu.', 401);
  return user;
}
export function checkWrite(request: Request) {
  const origin = request.headers.get('origin');
  // Next may normalize request.url to localhost even when the browser uses 127.0.0.1.
  // Host is the browser's actual request authority; never trust forwarded-host here.
  const host = request.headers.get('host') || new URL(request.url).host;
  if ((origin && (!/^https?:\/\//.test(origin) || new URL(origin).host !== host)) || request.headers.get('sec-fetch-site') === 'cross-site') fail('Asal permintaan tidak diizinkan.', 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) fail('Gunakan format JSON.', 415);
}
export function dateValue(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('Tanggal tidak valid.');
  const parsed = new Date(value + 'T00:00:00Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) fail('Tanggal tidak valid.');
  return value;
}
export const weekdays = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export function weekday(date: string) { return weekdays[new Date(date + 'T00:00:00Z').getUTCDay()]; }
export function one(table: string, keys: Row): Row | undefined {
  const rows = db.prepare(`SELECT rowid AS _rowid, * FROM ${table} WHERE ${Object.keys(keys).map(k => `${k} = ?`).join(' AND ')}`).all(...Object.values(keys)) as Row[];
  if (rows.length > 1) fail('Data ganda/ambigu ditemukan. Minta admin memeriksa; tidak ada data ditimpa.', 409);
  return rows[0];
}
export function period(id: string, write = false) {
  const p = one('ak_periode', { id_tahun_ajaran: id });
  const y = one('tahun_ajaran', { id_tahun_ajaran: id });
  if (!p || String(p.terverifikasi) !== '1' || !y) fail('Periode akademik belum terverifikasi.', 409);
  if (write && y.status !== 'Aktif') fail('Periode tidak aktif.', 409);
  if (write && (String(y.dikunci) !== '0' || String(y.rapor_diterbitkan) !== '0')) fail('Periode terkunci atau rapor telah diterbitkan.', 409);
  return { ...y, ...p };
}
export function schedules(user: AuthUser): Row[] {
  if (!['admin', 'guru', 'kepala_sekolah'].includes(user.role)) fail('Akses jadwal guru ditolak.', 403);
  const rows = db.prepare(`SELECT j.*, g.nama_guru, k.nama_kelas, m.nama_mapel,
    p.mulai AS periode_mulai, p.selesai AS periode_selesai, a.mulai, a.selesai,
    y.tahun_ajaran, y.semester FROM jadwal j
    JOIN guru g ON g.id_guru=j.id_guru JOIN kelas k ON k.id_kelas=j.id_kelas
    JOIN mata_pelajaran m ON m.id_mapel=j.id_mapel
    JOIN ak_penugasan a ON a.id_jadwal=j.id_jadwal AND a.terverifikasi='1'
    JOIN ak_periode p ON p.id_tahun_ajaran=j.id_tahun_ajaran AND p.terverifikasi='1'
    JOIN tahun_ajaran y ON y.id_tahun_ajaran=j.id_tahun_ajaran
    WHERE j.status='aktif' ${user.role === 'guru' ? 'AND j.id_guru=?' : ''}
    ORDER BY j.hari,j.jam_mulai,j.id_jadwal`).all(...(user.role === 'guru' ? [user.id_referensi] : [])) as Row[];
  // Ambiguous legacy assignments never widen access.
  return rows.filter(r => rows.filter(x => x.id_jadwal === r.id_jadwal).length === 1);
}
export function schedule(user: AuthUser, id: unknown, date?: string, write = false) {
  if (!id) fail('Pilih jadwal mengajar terlebih dahulu.');
  const j = schedules(user).find(r => String(r.id_jadwal) === String(id));
  if (!j) fail('Jadwal tidak tersedia atau di luar penugasan Anda.', 403);
  if (write && !['admin', 'guru'].includes(user.role)) fail('Akses tulis ditolak.', 403);
  const p = period(j.id_tahun_ajaran, write);
  if (date) {
    dateValue(date);
    if (date < j.mulai || date > j.selesai || date < p.mulai || date > p.selesai || weekday(date) !== j.hari.replace("'", '')) fail('Tanggal tidak sesuai hari atau rentang penugasan jadwal.');
    const events = db.prepare("SELECT jenis FROM ak_kalender WHERE id_tahun_ajaran=? AND status='disahkan' AND mulai<=? AND selesai>=?").all(j.id_tahun_ajaran, date, date) as Row[];
    if (!events.some(e => e.jenis === 'Hari Efektif') && !String(p.hari_efektif).split(',').includes(String(new Date(date + 'T00:00:00Z').getUTCDay() || 7))) fail('Tanggal bukan hari efektif.');
    if (write && date > new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())) fail('Absensi tidak dapat diisi untuk tanggal mendatang.');
    if (write && db.prepare("SELECT 1 FROM ak_kalender WHERE id_tahun_ajaran=? AND status='disahkan' AND jenis='Libur' AND mulai<=? AND selesai>=?").get(j.id_tahun_ajaran, date, date)) fail('Tanggal merupakan hari libur.');
  }
  return j;
}
export function roster(j: Row, date?: string): Row[] {
  const rows = db.prepare(`SELECT a.*, a.id AS id_anggota, s.nama_siswa, s.jenis_kelamin FROM ak_anggota_kelas a
    JOIN siswa s ON s.nis=a.nis WHERE a.id_kelas=? AND a.id_tahun_ajaran=?
    ${date ? 'AND a.mulai<=? AND a.selesai>=?' : 'AND a.mulai<=? AND a.selesai>=?'}
    ORDER BY CAST(a.nomor_absen AS INTEGER),a.nis`).all(j.id_kelas, j.id_tahun_ajaran, date || j.selesai, date || j.mulai) as Row[];
  if (new Set(rows.map(r => r.nis)).size !== rows.length) fail('Keanggotaan siswa ambigu; minta admin memeriksa.', 409);
  return rows;
}
// TEXT-only imported SQLite schemas lack UNIQUE/defaults. Serialize application writes,
// refuse ambiguous rows, and assign explicit IDs. No runtime DDL or historical cleanup.
export function saveRow(table: string, keys: Row, values: Row, user: AuthUser, before?: Row, reason = '') {
  if (before && 'id' in before && !before.id) fail('Identitas record lama tidak lengkap. Minta admin memeriksa.', 409);
  const now = new Date().toISOString();
  const data = { ...values, updated_by: user.id_user, updated_at: now };
  if (before) {
    db.prepare(`UPDATE ${table} SET ${Object.keys(data).map(k => `${k}=?`).join(',')} WHERE rowid=?`).run(...Object.values(data), before._rowid);
  } else {
    const row = { ...keys, ...data };
    db.prepare(`INSERT INTO ${table} (${Object.keys(row).join(',')}) VALUES (${Object.keys(row).map(() => '?').join(',')})`).run(...Object.values(row));
  }
  const after = one(table, keys)!;
  db.prepare('INSERT INTO ak_riwayat(id,actor_id,entity,record_id,action,sebelum,sesudah,alasan,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(randomUUID(), user.id_user, table, String(after.id || after.id_pertemuan), before ? 'ubah' : 'buat', JSON.stringify(before || null), JSON.stringify(after), reason, now);
  return after;
}
export function revisionCheck(before: Row | undefined, revision: unknown, reason: unknown) {
  if (before && (Number(revision) !== Number(before.revision) || revision == null)) fail('Data telah berubah atau versi belum dimuat. Muat ulang sebelum menyimpan.', 409);
  if (before && (typeof reason !== 'string' || !reason.trim())) fail('Alasan koreksi wajib diisi.');
}
function checkMeetingScope(j: Row, meeting?: Row) {
  if (meeting && ['id_tahun_ajaran','id_kelas','id_guru','id_mapel'].some(k => meeting[k] !== j[k])) fail('Pertemuan lama memiliki penugasan berbeda. Minta admin memeriksa.', 409);
}
export function saveMeeting(user: AuthUser, body: Row) {
  const date = dateValue(body.tanggal), j = schedule(user, body.id_jadwal, date, true);
  const keys = { id_jadwal: j.id_jadwal, tanggal: date };
  const before = one('ak_pertemuan', keys);
  checkMeetingScope(j, before);
  revisionCheck(before, body.revision, body.alasan);
  if (typeof body.materi !== 'string' || !body.materi.trim() || body.materi.length > 5000) fail('Materi wajib diisi (maksimum 5000 karakter).');
  if (!Number.isInteger(Number(body.pertemuan_ke)) || Number(body.pertemuan_ke) < 1 || Number(body.pertemuan_ke) > 1000) fail('Pertemuan ke harus berupa bilangan bulat 1–1000.');
  const members = roster(j, date);
  if (!members.length) fail('Daftar siswa periode ini belum tersedia.', 409);
  if (body.items !== undefined) {
    if (!Array.isArray(body.items) || body.items.length !== members.length || new Set(body.items.map((r: Row) => String(r.nis))).size !== members.length) fail('Daftar absensi harus lengkap dan tidak ganda.');
    for (const item of body.items) if (!members.some(r => r.nis === String(item.nis)) || !['H', 'S', 'I', 'A', 'B'].includes(item.status)) fail('Siswa atau status absensi tidak sesuai jadwal.');
  }
  const fields: Row = {};
  const replacement = body.id_guru_pengganti === undefined ? before?.id_guru_pengganti || null : body.id_guru_pengganti === '' || body.id_guru_pengganti === null ? null : body.id_guru_pengganti;
  if (replacement !== null && (typeof replacement !== 'string' || replacement.length > 40 || !db.prepare("SELECT 1 FROM guru WHERE id_guru=? AND status='aktif'").get(replacement))) fail('Guru pengganti tidak dikenal atau nonaktif.');
  const submittedLesson = typeof body.jam_ke === 'string' && body.jam_ke !== before?.jam_ke ? body.jam_ke.trim() : body.jam_ke;
  const lesson = submittedLesson || before?.jam_ke || `${j.jam_mulai}–${j.jam_selesai}`;
  if (typeof lesson !== 'string' || lesson.length > 30) fail('Jam pelajaran maksimal 30 karakter.');
  if (lesson !== before?.jam_ke) {
    const times = /^(\d{2}:\d{2})\s*[–—-]\s*(\d{2}:\d{2})$/.exec(lesson);
    const validTimes = times && times.slice(1).every(t => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t)) && times[1] < times[2];
    const numbers = lesson.replace(/[–—]/g, '-').split(/\s*[,-]\s*/);
    if (!validTimes && !numbers.every((n, i) => /^\d{1,2}$/.test(n) && Number(n) >= 1 && Number(n) <= 40 && (i === 0 || Number(n) > Number(numbers[i - 1])))) fail('Isi nomor jam 1–40 (contoh 1–2) atau rentang waktu 07:00–08:30.');
  }
  for (const key of ['tp_atp', 'kegiatan', 'refleksi', 'catatan', 'tindak_lanjut']) {
    if (body[key] != null && (typeof body[key] !== 'string' || body[key].length > 5000)) fail('Isian jurnal tidak valid.');
    fields[key] = body[key] ?? before?.[key] ?? '';
  }
  const meeting = saveRow('ak_pertemuan', keys, {
    id: before?.id || randomUUID(), id_tahun_ajaran: j.id_tahun_ajaran, id_kelas: j.id_kelas,
    id_guru: j.id_guru, id_mapel: j.id_mapel, materi: body.materi.trim(), pertemuan_ke: String(body.pertemuan_ke),
    jam_ke: lesson, id_guru_pengganti: replacement, ...fields,
    revision: Number(before?.revision || 0) + 1, created_by: before ? before.created_by : user.id_user,
    created_at: before ? before.created_at : new Date().toISOString(),
  }, user, before, body.alasan);
  if (body.items) for (const member of members) {
    const item = body.items.find((x: Row) => String(x.nis) === member.nis);
    const key = { id_pertemuan: meeting.id, nis: member.nis };
    const previous = one('ak_absensi_sesi', key);
    saveRow('ak_absensi_sesi', key, { id_anggota: member.id_anggota, nomor_absen: member.nomor_absen,
      nama_snapshot: member.nama_siswa, status: item.status, keterangan: String(item.keterangan || item.catatan || '').slice(0, 1000),
      created_by: previous ? previous.created_by : user.id_user }, user, previous, body.alasan);
  }
  return meeting;
}
export function attendance(user: AuthUser, id: string | null, date: string) {
  const j = schedule(user, id, date);
  const meeting = one('ak_pertemuan', { id_jadwal: j.id_jadwal, tanggal: date });
  checkMeetingScope(j, meeting);
  return { schedule: j, meeting: meeting || null, data: roster(j, date).map(s => {
    const a = meeting ? one('ak_absensi_sesi', { id_pertemuan: meeting.id, nis: s.nis }) : undefined;
    if (a && a.id_anggota !== s.id_anggota) fail('Keanggotaan absensi lama berbeda. Minta admin memeriksa.', 409);
    return { ...s, id_jadwal: j.id_jadwal, status: a?.status || 'B', keterangan: a?.keterangan || '' };
  }) };
}
export function gradeRule(j: Row): Row | undefined {
  const rules = db.prepare('SELECT * FROM ak_aturan_nilai WHERE id_tahun_ajaran=? AND id_kelas=? AND id_mapel=? AND id_guru=? ORDER BY CAST(versi AS INTEGER) DESC').all(j.id_tahun_ajaran, j.id_kelas, j.id_mapel, j.id_guru) as Row[];
  if (rules.length > 1 && rules[0].versi === rules[1].versi) fail('Versi aturan nilai ambigu.', 409);
  return rules[0];
}
export function gradeRows(j: Row): { rule: Row | null; schedule: Row; data: Row[] } {
  const rule = gradeRule(j);
  return { rule: rule || null, schedule: j, data: roster(j).map(s => {
    const n = one('ak_nilai', { nis: s.nis, id_tahun_ajaran: j.id_tahun_ajaran, id_mapel: j.id_mapel });
    if (n && (n.id_guru !== j.id_guru || n.id_kelas !== j.id_kelas || n.id_anggota !== s.id_anggota)) fail('Pemilik nilai berbeda; perlu pemeriksaan admin.', 409);
    const c = JSON.parse(n?.komponen_json || '{}');
    return { ...s, ...n, nama_mapel: j.nama_mapel, nama_kelas: j.nama_kelas,
      nilai_tugas: c.tugas ?? '', nilai_uts: c.uts ?? '', nilai_uas: c.uas ?? '',
      nilai_praktik: c.praktik ?? '', nilai_proyek: c.proyek ?? '', revision: n?.revision || 0 };
  }) };
}
export function saveGrades(user: AuthUser, body: Row) {
  const j = schedule(user, body.id_jadwal, undefined, true);
  const rule = gradeRule(j);
  if (!rule || String(body.id_aturan) !== rule.id || rule.formula !== 'weighted_kkm_v1') fail('Aturan nilai terverifikasi belum tersedia atau telah berubah. Muat ulang.', 409);
  const weights = JSON.parse(rule.bobot_json), components = ['tugas', 'uts', 'uas', 'praktik', 'proyek'];
  if (components.some(k => !Number.isFinite(Number(weights[k])) || Number(weights[k]) < 0) || Math.abs(components.reduce((n,k) => n + Number(weights[k]), 0) - 100) > 0.00001) fail('Konfigurasi bobot tidak valid.', 409);
  if (!Number.isFinite(Number(rule.kkm)) || Number(rule.kkm) < 0 || Number(rule.kkm) >= 100) fail('KKM tidak valid.', 409);
  const members = roster(j);
  if (!Array.isArray(body.items) || !body.items.length || new Set(body.items.map((x: Row) => String(x.nis))).size !== body.items.length) fail('Data nilai kosong atau ganda.');
  for (const item of body.items) {
    const member = members.find(x => x.nis === String(item.nis));
    if (!member) fail('Siswa di luar kelas penugasan.', 403);
    const keys = { nis: member.nis, id_tahun_ajaran: j.id_tahun_ajaran, id_mapel: j.id_mapel };
    const before = one('ak_nilai', keys);
    if (before && (before.id_guru !== j.id_guru || before.id_kelas !== j.id_kelas || before.id_anggota !== member.id_anggota)) fail('Pemilik nilai berbeda.', 403);
    revisionCheck(before, item.revision, body.alasan);
    if (item.deskripsi != null && (typeof item.deskripsi !== 'string' || item.deskripsi.length > 2000)) fail('Deskripsi capaian maksimal 2000 karakter.');
    const description = item.deskripsi == null ? before?.deskripsi || '' : item.deskripsi.trim();
    const scores: Row = {};
    for (const k of components) {
      const value = item[`nilai_${k}`];
      if ((value === '' || value == null) && Number(weights[k]) > 0) fail('Seluruh komponen berbobot wajib diisi.');
      if (!['number', 'string'].includes(typeof value) && value != null) fail('Nilai harus angka.');
      scores[k] = Number(value || 0);
      if (!Number.isFinite(scores[k]) || scores[k] < 0 || scores[k] > 100) fail('Nilai harus angka dalam rentang 0–100.');
    }
    const final = Math.round(components.reduce((n,k) => n + scores[k] * Number(weights[k]), 0) + 1e-8) / 100;
    const interval = (100 - Number(rule.kkm)) / 3;
    const predikat = final < Number(rule.kkm) ? 'D' : final < Number(rule.kkm) + interval ? 'C' : final < Number(rule.kkm) + 2 * interval ? 'B' : 'A';
    saveRow('ak_nilai', keys, { id: before?.id || randomUUID(), id_anggota: member.id_anggota,
      id_kelas: j.id_kelas, id_guru: j.id_guru, id_aturan: rule.id, komponen_json: JSON.stringify(scores),
      nilai_akhir: final.toFixed(2), predikat, deskripsi: description,
      revision: Number(before?.revision || 0) + 1, created_by: before ? before.created_by : user.id_user }, user, before, body.alasan);
  }
  return body.items.length;
}
export function duties(user: AuthUser, date: string): Row[] {
  if (user.role === 'admin' || user.role === 'kepala_sekolah') return db.prepare(`SELECT k.id_kelas,k.nama_kelas,p.id_tahun_ajaran FROM kelas k
    CROSS JOIN ak_periode p WHERE p.terverifikasi='1' AND p.mulai<=? AND p.selesai>=? AND k.status='aktif'`).all(date,date) as Row[];
  if (user.role !== 'guru') fail('Akses Guru Piket ditolak.', 403);
  const tasks = db.prepare(`SELECT * FROM ak_tugas_piket WHERE id_guru=? AND aktif='1' AND mulai<=? AND selesai>=?`).all(user.id_referensi,date,date) as Row[];
  const classes: Row[] = [];
  for (const task of tasks) {
    const p = period(task.id_tahun_ajaran);
    if (date < p.mulai || date > p.selesai) continue;
    const rows = db.prepare(`SELECT id_kelas,nama_kelas FROM kelas WHERE status='aktif' ${task.id_kelas && task.id_kelas !== '0' ? 'AND id_kelas=?' : ''}`).all(...(task.id_kelas && task.id_kelas !== '0' ? [task.id_kelas] : [])) as Row[];
    for (const r of rows) if (!classes.some(c => c.id_kelas === r.id_kelas && c.id_tahun_ajaran === task.id_tahun_ajaran)) classes.push({ ...r, id_tahun_ajaran: task.id_tahun_ajaran });
  }
  if (!classes.length) fail('Tidak ada penugasan Guru Piket yang berlaku pada tanggal ini.', 403);
  return classes;
}
export function dutySummary(user: AuthUser, date: string, classId?: string | null): { classes: Row[]; data: Row[] } {
  dateValue(date);
  const classes = duties(user, date);
  if (classId && !classes.some(c => c.id_kelas === classId)) fail('Kelas di luar penugasan piket.', 403);
  const data = classes.filter(c => !classId || c.id_kelas === classId).map(c => {
    const rows = db.prepare(`SELECT a.nis,s.nama_siswa,a.nomor_absen,h.status,h.keterangan
      FROM ak_anggota_kelas a JOIN siswa s ON s.nis=a.nis LEFT JOIN ak_absensi_harian h ON h.nis=a.nis AND h.id_kelas=a.id_kelas AND h.id_tahun_ajaran=a.id_tahun_ajaran AND h.tanggal=?
      WHERE a.id_kelas=? AND a.id_tahun_ajaran=? AND a.mulai<=? AND a.selesai>=? ORDER BY CAST(a.nomor_absen AS INTEGER)`).all(date,c.id_kelas,c.id_tahun_ajaran,date,date) as Row[];
    if (new Set(rows.map(r => r.nis)).size !== rows.length) fail('Data absensi harian ambigu; perlu pemeriksaan admin.', 409);
    const scheduleRows = db.prepare(`SELECT j.id_jadwal,j.jam_mulai,j.jam_selesai,g.nama_guru,m.nama_mapel,p.id AS id_pertemuan,p.materi
      FROM jadwal j JOIN guru g ON g.id_guru=j.id_guru JOIN mata_pelajaran m ON m.id_mapel=j.id_mapel
      JOIN ak_penugasan a ON a.id_jadwal=j.id_jadwal AND a.terverifikasi='1' AND a.mulai<=? AND a.selesai>=?
      LEFT JOIN ak_pertemuan p ON p.id_jadwal=j.id_jadwal AND p.tanggal=?
      WHERE j.id_kelas=? AND j.id_tahun_ajaran=? AND j.hari=? AND j.status='aktif' ORDER BY j.jam_mulai`).all(date,date,date,c.id_kelas,c.id_tahun_ajaran,weekday(date)) as Row[];
    const students = rows.map(r => ({ ...r, status: ['H','S','I','A'].includes(r.status) ? r.status : 'B' }));
    return { ...c, students, schedules: scheduleRows, counts: Object.fromEntries(['H','S','I','A','B'].map(code => [code, students.filter(s => s.status === code).length])) };
  });
  return { classes, data };
}
