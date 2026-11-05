export type BellSlot = [number | null, string, string, string];
export const schoolDays = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
export const bellTemplates: { nama: string; hari: string[]; slots: BellSlot[] }[] = [
  { nama: 'Senin', hari: ['Senin'], slots: [
    [null,'07:00','07:40','Upacara'],[1,'07:40','08:20','Pelajaran'],[2,'08:20','09:00','Pelajaran'],[3,'09:00','09:40','Pelajaran'],
    [null,'09:40','10:15','Istirahat'],[4,'10:15','10:55','Pelajaran'],[5,'10:55','11:35','Pelajaran'],[6,'11:35','12:15','Pelajaran'],
    [null,'12:15','12:40','Istirahat'],[7,'12:40','13:20','Pelajaran'],[8,'13:20','14:00','Pelajaran'],[9,'14:00','14:40','Pelajaran'],[10,'14:40','15:20','Pelajaran'],
  ] },
  { nama: 'Selasa–Kamis', hari: ['Selasa','Rabu','Kamis'], slots: [
    [1,'07:00','07:40','Pelajaran'],[2,'07:40','08:20','Pelajaran'],[3,'08:20','09:00','Pelajaran'],[4,'09:00','09:40','Pelajaran'],
    [null,'09:40','10:15','Istirahat'],[5,'10:15','11:00','Pelajaran'],[6,'11:00','11:45','Pelajaran'],[7,'11:45','12:30','Pelajaran'],
    [null,'12:30','13:00','Istirahat'],[8,'13:00','13:45','Pelajaran'],[9,'13:45','14:30','Pelajaran'],[10,'14:30','15:15','Pelajaran'],
  ] },
  { nama: 'Jumat', hari: ['Jumat'], slots: [
    [null,'07:00','07:45',"Kegiatan Jumat"],[1,'07:45','08:15','Pelajaran'],[2,'08:15','08:45','Pelajaran'],[3,'08:45','09:15','Pelajaran'],[4,'09:15','09:45','Pelajaran'],
    [null,'09:45','10:20','Istirahat'],[5,'10:20','10:50','Pelajaran'],[6,'10:50','11:40','Pelajaran'],[null,'11:40','13:00','Jeda'],[7,'13:00','13:30','Pelajaran'],[8,'13:30','14:00','Pelajaran'],
  ] },
];
export function profileDays(profile: { nama?: string; hari?: string[] }) {
  if (Array.isArray(profile.hari)) return profile.hari;
  const normalized = String(profile.nama || '').toLowerCase().replace(/[’']/g, '').replace(/[–—]/g, '-');
  if (normalized === 'senin') return ['Senin'];
  if (normalized === 'selasa-kamis' || normalized === 'selasa - kamis') return ['Selasa','Rabu','Kamis'];
  if (normalized === 'jumat') return ['Jumat'];
  return [];
}
export function lessonPeriod(hari: string, start: string, end: string, profiles: any[] = []) {
  const matching = profiles.filter(p => p.status === 'referensi' && profileDays(p.payload || p).includes(hari));
  if (matching.length > 1) return '';
  const profile = matching[0]?.payload || matching[0] || bellTemplates.find(p => p.hari.includes(hari));
  if (!profile) return '';
  const slots = (profile.slots as BellSlot[]).filter(s => s[0] != null && s[1] >= start.slice(0,5) && s[2] <= end.slice(0,5));
  if (!slots.length || slots[0][1] !== start.slice(0,5) || slots.at(-1)![2] !== end.slice(0,5)) return '';
  return slots.length === 1 ? String(slots[0][0]) : `${slots[0][0]}–${slots.at(-1)![0]}`;
}
