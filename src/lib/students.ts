import { AuthUser } from './auth';
import { Row, dateValue } from './academic';
import { rows, one, role, fail, today } from './store';
import { schoolDay } from './reports';
import { currentSchoolYear } from './academic-year';
export function studentData(user:AuthUser,q:URLSearchParams) {
  role(user,'siswa');if(q.get('nis')&&q.get('nis')!==user.id_referensi)fail('Akses ditolak.',403);
  const student=one('siswa',{nis:user.id_referensi});if(!student)fail('Profil siswa tidak ditemukan.',404);
  const periods=rows("SELECT DISTINCT t.*,p.mulai,p.selesai,p.hari_efektif,p.terverifikasi FROM tahun_ajaran t JOIN ak_periode p ON p.id_tahun_ajaran=t.id_tahun_ajaran JOIN ak_anggota_kelas a ON a.id_tahun_ajaran=t.id_tahun_ajaran WHERE a.nis=? AND t.status='Aktif' AND t.tahun_ajaran=? AND p.terverifikasi='1' AND p.mulai<=? AND p.selesai>=? ORDER BY p.mulai DESC",user.id_referensi,currentSchoolYear().tahun_ajaran,today(),today());
  const p=periods.find(p=>p.id_tahun_ajaran===q.get('id_tahun_ajaran'))||(!q.get('id_tahun_ajaran')?(periods.find(p=>p.status==='Aktif')||periods[0]):null);
  const memberships=p?rows('SELECT a.*,k.nama_kelas FROM ak_anggota_kelas a JOIN kelas k ON k.id_kelas=a.id_kelas WHERE a.nis=? AND a.id_tahun_ajaran=? ORDER BY a.mulai',user.id_referensi,p.id_tahun_ajaran):[];
  if(q.get('id_tahun_ajaran')&&!p)fail('Siswa hanya dapat mengakses periode berjalan yang ditetapkan admin.',403);
  const kind=q.get('kind')||'profile';let data:Row[]=[];
  if(p&&kind==='jadwal')data=rows("SELECT DISTINCT j.*,g.nama_guru,m.nama_mapel,k.nama_kelas FROM jadwal j JOIN ak_penugasan w ON w.id_jadwal=j.id_jadwal JOIN ak_anggota_kelas a ON a.id_kelas=j.id_kelas AND a.id_tahun_ajaran=j.id_tahun_ajaran JOIN guru g ON g.id_guru=j.id_guru JOIN mata_pelajaran m ON m.id_mapel=j.id_mapel JOIN kelas k ON k.id_kelas=j.id_kelas WHERE a.nis=? AND a.id_tahun_ajaran=? AND w.terverifikasi='1' AND a.mulai<=w.selesai AND a.selesai>=w.mulai AND j.status='aktif' ORDER BY j.hari,j.jam_mulai",user.id_referensi,p.id_tahun_ajaran);
  if(p&&kind==='absensi') {
    const start=q.get('mulai')?dateValue(q.get('mulai')):p.mulai,end=q.get('selesai')?dateValue(q.get('selesai')):[p.selesai,today()].sort()[0];if(start>end||start<p.mulai||end>p.selesai||end>today())fail(`Pilih tanggal berurutan dalam periode ${p.mulai} sampai ${[p.selesai,today()].sort()[0]}.`);
    for(let date=start;date<=end;date=new Date(Date.parse(date+'T00:00:00Z')+86400000).toISOString().slice(0,10)) {
      const member=memberships.filter(a=>a.mulai<=date&&a.selesai>=date);if(member.length>1)fail('Keanggotaan ambigu.',409);if(!member.length||!schoolDay(p,date))continue;
      const a=one('ak_absensi_harian',{tanggal:date,nis:user.id_referensi});data.push({tanggal:date,nis:user.id_referensi,nama_siswa:student.nama_siswa,nama_kelas:member[0].nama_kelas,status:a?.status||'B',keterangan:a?.keterangan||''});
    }
  }
  return {profile:{nis:student.nis,nama_siswa:student.nama_siswa,jenis_kelamin:student.jenis_kelamin},periods,period:p||null,notice:p?'':'Periode berjalan atau keanggotaan siswa belum ditetapkan admin.',memberships,data};
}
