import { AuthUser } from './auth';
import { Row, schedules, schedule, roster } from './academic';
import { rows, one, fail, role, text, choice, hash, write, nextId } from './store';
export function activityData(user: AuthUser, input: Row) {
  role(user, 'admin', 'guru');
  const activities = rows(`SELECT id_ekskul,nama_ekskul,id_guru_pembina FROM ekstrakurikuler WHERE status='aktif' ${user.role === 'guru' ? 'AND id_guru_pembina=?' : ''} ORDER BY nama_ekskul`, ...(user.role === 'guru' ? [user.id_referensi] : []));
  const available = schedules(user);
  if (!input.id_jadwal || !input.id_ekskul) return { activities, schedules: available, data: [] };
  const j = schedule(user, input.id_jadwal), activity = activities.find(a => a.id_ekskul === String(input.id_ekskul));
  if (!activity) fail('Kegiatan di luar penugasan pembina.', 403);
  return { activities, schedules: available, schedule: j, data: roster(j).map(m => {
    const value = one('nilai_ekskul', { nis: m.nis, id_ekskul: activity.id_ekskul, id_tahun_ajaran: j.id_tahun_ajaran });
    return { nis: m.nis, nama_siswa: m.nama_siswa, predikat: value?.predikat || '', keterangan: value?.keterangan || '', etag: value ? hash(value) : '' };
  }) };
}
export function saveActivities(user: AuthUser, input: Row) {
  const result = activityData(user, input), j = schedule(user, input.id_jadwal, undefined, true);
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
