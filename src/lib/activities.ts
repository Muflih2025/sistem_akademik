import { AuthUser } from './auth';
import { Row, schedules, schedule, roster, period } from './academic';
import { rows, one, fail, role, text, choice, hash, write, nextId, today } from './store';
import { currentSchoolYear } from './academic-year';

function activityClass(user: AuthUser, input: Row, classes: Row[], write = false) {
  // Keep legacy schedule requests scoped to the teacher who owns the schedule.
  if (input.id_jadwal) return schedule(user, input.id_jadwal, undefined, write);
  const cls = classes.find(c => c.id_kelas === String(input.id_kelas) && c.id_tahun_ajaran === String(input.id_tahun_ajaran));
  if (!cls) fail('Kelas kegiatan tidak tersedia pada periode berjalan.', 403);
  const p = period(cls.id_tahun_ajaran, write);
  return { ...cls, mulai: p.mulai, selesai: p.selesai };
}
export function activityData(user: AuthUser, input: Row) {
  role(user, 'admin', 'guru');
  const activities: Row[] = rows("SELECT e.id_ekskul,e.nama_ekskul,e.id_guru_pembina,g.nama_guru FROM ekstrakurikuler e LEFT JOIN guru g ON g.id_guru=e.id_guru_pembina WHERE e.status='aktif' ORDER BY e.nama_ekskul")
    .map(a => ({ ...a, boleh_menilai: user.role === 'admin' || a.id_guru_pembina === user.id_referensi }));
  const available = schedules(user);
  // An extracurricular coach may also be a duty teacher with no subject timetable.
  const classes = rows(`SELECT DISTINCT k.id_kelas,k.nama_kelas,t.id_tahun_ajaran,t.tahun_ajaran,t.semester
    FROM kelas k JOIN ak_anggota_kelas a ON a.id_kelas=k.id_kelas
    JOIN tahun_ajaran t ON t.id_tahun_ajaran=a.id_tahun_ajaran
    JOIN ak_periode p ON p.id_tahun_ajaran=t.id_tahun_ajaran
    WHERE k.status='aktif' AND t.status='Aktif' AND t.tahun_ajaran=? AND p.terverifikasi='1'
    AND p.mulai<=? AND p.selesai>=? AND a.mulai<=? AND a.selesai>=? ORDER BY k.nama_kelas`, currentSchoolYear().tahun_ajaran, today(), today(), today(), today());
  const context = { activities, schedules: available, classes };
  if (!input.id_ekskul) return { ...context, data: [] };
  const activity = activities.find(a => a.id_ekskul === String(input.id_ekskul));
  if (!activity) fail('Kegiatan tidak tersedia.', 404);
  if (!activity.boleh_menilai) fail('Anda belum ditugaskan sebagai pembina kegiatan ini. Hubungi admin.', 403);
  if (!input.id_jadwal && (!input.id_kelas || !input.id_tahun_ajaran)) return { ...context, data: [] };
  const j = activityClass(user, input, classes);
  return { ...context, schedule: j, data: roster(j).map(m => {
    const value = one('nilai_ekskul', { nis: m.nis, id_ekskul: activity.id_ekskul, id_tahun_ajaran: j.id_tahun_ajaran });
    return { nis: m.nis, nama_siswa: m.nama_siswa, predikat: value?.predikat || '', keterangan: value?.keterangan || '', etag: value ? hash(value) : '' };
  }) };
}
export function saveActivities(user: AuthUser, input: Row) {
  const result = activityData(user, input), j = activityClass(user, input, result.classes, true);
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > result.data.length || new Set(input.items.map((r: Row) => r.nis)).size !== input.items.length) fail('Daftar nilai kegiatan kosong atau ganda.');
  for (const item of input.items) {
    const member = result.data.find(m => m.nis === String(item.nis));
    if (!member) fail('Siswa di luar kelas penugasan.', 403);
    const keys = { nis: member.nis, id_ekskul: String(input.id_ekskul), id_tahun_ajaran: j.id_tahun_ajaran }, before = one('nilai_ekskul', keys);
    if (before && item.etag !== hash(before)) fail('Nilai kegiatan berubah. Muat ulang.', 409);
    if (before && !text(input.alasan, 'Alasan koreksi')) fail('Alasan wajib diisi.');
    write(user, 'nilai_ekskul', keys, { id_nilai_ekskul: before?.id_nilai_ekskul || nextId('nilai_ekskul', 'id_nilai_ekskul'), predikat: choice(item.predikat, ['Sangat Baik', 'Baik', 'Cukup', 'Kurang']), keterangan: text(item.keterangan, 'Keterangan', 255, false) }, input.alasan || 'Nilai kegiatan baru');
  }
  return { jumlah: input.items.length };
}
