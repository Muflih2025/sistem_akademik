export interface Field { key: string; label: string; type?: string; options?: string[]; reference?: string; optional?: boolean }
export interface Definition { label: string; pk: string; fields: Field[] }
const f = (key: string, label: string, extra: Partial<Field> = {}): Field => ({ key, label, ...extra });
export const catalog: Record<string, Definition> = {
  jurusan: { label: 'Jurusan', pk: 'id_jurusan', fields: [f('kode_jurusan','Kode jurusan'), f('nama_jurusan','Nama jurusan')] },
  kelas: { label: 'Kelas', pk: 'id_kelas', fields: [f('nama_kelas','Nama kelas'), f('tingkat','Tingkat',{options:['X','XI','XII']}),f('id_jurusan','Jurusan',{reference:'jurusan'})] },
  siswa: { label: 'Siswa', pk: 'nis', fields: [f('nis','NIS'),f('nama_siswa','Nama siswa'),f('jenis_kelamin','Jenis kelamin',{options:['L','P']}),f('tanggal_lahir','Tanggal lahir',{type:'date'}),f('id_kelas','Kelas',{reference:'kelas'}),f('alamat','Alamat',{optional:true})] },
  guru: { label: 'Guru', pk: 'id_guru', fields: [f('nip','NIP'),f('nama_guru','Nama guru'),f('email','Email',{type:'email',optional:true}),f('no_hp','No. HP',{optional:true})] },
  mata_pelajaran: { label: 'Mata pelajaran', pk: 'id_mapel', fields:[f('kode_mapel','Kode mapel'),f('nama_mapel','Nama mapel'),f('kelompok','Kelompok',{options:['Muatan Nasional','Muatan Kewilayahan','Produktif']}),f('kkm','KKM',{type:'number'})] },
  ak_ruang: { label:'Ruang & laboratorium',pk:'id_ruang',fields:[f('kode_ruang','Kode ruang'),f('nama_ruang','Nama ruang'),f('jenis','Jenis',{options:['Kelas','Laboratorium']})] },
  users: {label:'Akun pengguna',pk:'id_user',fields:[f('username','Username'),f('role','Peran',{options:['admin','guru','kepala_sekolah','siswa']}),f('id_referensi','ID guru / NIS siswa',{optional:true}),f('password','Password (kosongkan untuk mempertahankan)',{type:'password',optional:true})]},
  tahun_ajaran:{label:'Tahun ajaran',pk:'id_tahun_ajaran',fields:[f('tahun_ajaran','Tahun ajaran (2026/2027)'),f('semester','Semester',{options:['Ganjil','Genap']}),f('status','Status',{options:['Aktif','Tidak Aktif']}),f('dikunci','Kunci transaksi',{options:['0','1']}),f('rapor_diterbitkan','Publikasi periode',{options:['0','1']})]},
  jadwal:{label:'Jadwal mengajar',pk:'id_jadwal',fields:[f('id_guru','Guru',{reference:'guru'}),f('id_mapel','Mata pelajaran',{reference:'mata_pelajaran'}),f('id_kelas','Kelas',{reference:'kelas'}),f('id_tahun_ajaran','Periode',{reference:'tahun_ajaran'}),f('hari','Hari',{options:['Senin','Selasa','Rabu','Kamis','Jumat']}),f('jam_mulai','Jam mulai',{type:'time'}),f('jam_selesai','Jam selesai',{type:'time'}),f('ruang','Ruang',{reference:'ak_ruang',optional:true})]},
  ekstrakurikuler:{label:'Ekstrakurikuler',pk:'id_ekskul',fields:[f('nama_ekskul','Nama kegiatan'),f('id_guru_pembina','Guru pembina',{reference:'guru'}),f('pembina','Nama pembina'),f('deskripsi','Deskripsi',{optional:true})]},
  catatan_evaluasi:{label:'Catatan evaluasi',pk:'id_evaluasi',fields:[f('judul','Judul'),f('isi','Isi catatan'),f('id_tahun_ajaran','Periode',{reference:'tahun_ajaran'})]},
};
export const labels = (row: Record<string, any>) => row.nama_siswa || row.nama_guru || row.nama_kelas || row.nama_jurusan || row.nama_mapel || row.nama_ruang || row.tahun_ajaran && `${row.tahun_ajaran} ${row.semester}` || row.username || row.nama_ekskul || row.judul;
export const masterTables = ['siswa','guru','kelas','jurusan','mata_pelajaran','ak_ruang','ekstrakurikuler'];
