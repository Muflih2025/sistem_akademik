import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'sia.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL DEFAULT 'password',
    nama TEXT NOT NULL,
    role TEXT NOT NULL, -- admin, guru, kepsek, siswa, piket, wali
    nip_nis TEXT,
    kelas TEXT,
    is_active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS jadwal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hari TEXT NOT NULL,
    jam_ke TEXT NOT NULL,
    jam_mulai TEXT NOT NULL,
    jam_selesai TEXT NOT NULL,
    mapel TEXT NOT NULL,
    kelas TEXT NOT NULL,
    ruang TEXT NOT NULL,
    guru_nama TEXT NOT NULL,
    guru_username TEXT
  );

  CREATE TABLE IF NOT EXISTS absensi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanggal TEXT NOT NULL,
    kelas TEXT NOT NULL,
    nis TEXT NOT NULL,
    nama_siswa TEXT NOT NULL,
    status TEXT NOT NULL, -- H (Hadir), S (Sakit), I (Izin), A (Alpa), B (Belum)
    catatan TEXT
  );

  CREATE TABLE IF NOT EXISTS jurnal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanggal TEXT NOT NULL,
    guru_nama TEXT NOT NULL,
    guru_username TEXT,
    kelas TEXT NOT NULL,
    mapel TEXT NOT NULL,
    materi TEXT NOT NULL,
    refleksi TEXT,
    kehadiran_ringkas TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS nilai (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kelas TEXT NOT NULL,
    nis TEXT NOT NULL,
    nama_siswa TEXT NOT NULL,
    mapel TEXT NOT NULL,
    nilai_tugas INTEGER,
    nilai_uts INTEGER,
    nilai_uas INTEGER,
    nilai_akhir INTEGER,
    predikat TEXT
  );

  CREATE TABLE IF NOT EXISTS piket_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanggal TEXT NOT NULL,
    guru_piket_username TEXT NOT NULL,
    kelas TEXT NOT NULL,
    catatan TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Check if seeded — use a version marker
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };

// If old seed exists with fewer users, drop and re-seed
if (userCount.count < 8) {
  // Clean up old data
  db.exec('DELETE FROM users');
  db.exec('DELETE FROM jadwal');
  db.exec('DELETE FROM absensi');
  db.exec('DELETE FROM jurnal');
  db.exec('DELETE FROM nilai');
  db.exec('DELETE FROM piket_log');

  // ============================================
  // USERS — sesuai test.md
  // ============================================
  const insertUser = db.prepare(
    'INSERT INTO users (username, password, nama, role, nip_nis, kelas, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  // Admin
  insertUser.run('uji_admin', 'password', 'Administrator SIA', 'admin', '198001012005011001', null, 1);
  // Guru utama — XII PPLG 2, mengajar jam 1-2 setiap hari
  insertUser.run('uji_guru', 'password', 'Budi Santoso, S.Kom', 'guru', '198503152010011012', 'XII PPLG 2', 1);
  // Guru kedua — XII PPLG 1, Jumat juga mengajar XII PPLG 2
  insertUser.run('uji_guru_lain', 'password', 'Siti Aminah, S.Pd', 'guru', '199001202015012005', 'XII PPLG 1', 1);
  // Guru Piket
  insertUser.run('uji_piket', 'password', 'Rudi Hermawan, S.Pd', 'piket', '198712102012011003', null, 1);
  // Kepala Sekolah
  insertUser.run('uji_kepsek', 'password', 'Drs. H. Muflih, M.Pd', 'kepsek', '197005021995121001', null, 1);
  // Wali Kelas (opsional)
  insertUser.run('uji_wali', 'password', 'Dewi Kartika, S.Pd', 'wali', '198908152014022001', 'XII PPLG 2', 1);
  // Siswa utama
  insertUser.run('uji_siswa', 'password', 'Ahmad Rizki Pratama', 'siswa', '10293', 'XII PPLG 2', 1);
  // Siswa pembanding kelas lain
  insertUser.run('uji_siswa_lain', 'password', 'Rina Wulandari', 'siswa', '10321', 'XII PPLG 1', 1);

  // ============================================
  // SISWA XII PPLG 2 — 20 siswa contoh
  // ============================================
  const siswaXII_PPLG2 = [
    { nis: '10291', nama: 'Aditya Pratama' },
    { nis: '10292', nama: 'Agnes Monica Putri' },
    { nis: '10293', nama: 'Ahmad Rizki Pratama' },
    { nis: '10294', nama: 'Anisa Rahmawati' },
    { nis: '10295', nama: 'Bagus Setiawan' },
    { nis: '10296', nama: 'Bella Safitri' },
    { nis: '10297', nama: 'Dimas Anggara' },
    { nis: '10298', nama: 'Fajar Nugroho' },
    { nis: '10299', nama: 'Galih Purnama' },
    { nis: '10300', nama: 'Hana Permata' },
    { nis: '10301', nama: 'Indra Kusuma' },
    { nis: '10302', nama: 'Jasmine Aulia' },
    { nis: '10303', nama: 'Kevin Ardiansyah' },
    { nis: '10304', nama: 'Lestari Dewi' },
    { nis: '10305', nama: 'Muhammad Faisal' },
    { nis: '10306', nama: 'Nabila Syahrani' },
    { nis: '10307', nama: 'Oscar Ramadhan' },
    { nis: '10308', nama: 'Putri Handayani' },
    { nis: '10309', nama: 'Qori Hidayat' },
    { nis: '10310', nama: 'Rizka Amelia' },
  ];

  // SISWA XII PPLG 1 — 2 siswa contoh (guru_lain)
  const siswaXII_PPLG1 = [
    { nis: '10321', nama: 'Rina Wulandari' },
    { nis: '10322', nama: 'Sandi Firmansyah' },
  ];

  // ============================================
  // JADWAL — sesuai test.md (guru utama setiap hari jam 1-2, guru_lain terpisah + Jumat XII PPLG 2)
  // ============================================
  const insertJadwal = db.prepare(
    'INSERT INTO jadwal (hari, jam_ke, jam_mulai, jam_selesai, mapel, kelas, ruang, guru_nama, guru_username) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  // uji_guru — XII PPLG 2, Senin-Jumat jam 1-2
  insertJadwal.run('Senin', '1 - 2', '07.40', '09.00', 'Pemrograman Web & Perangkat Bergerak', 'XII PPLG 2', 'Lab PPLG 1', 'Budi Santoso, S.Kom', 'uji_guru');
  insertJadwal.run('Selasa', '1 - 2', '07.00', '08.20', 'Pemrograman Web & Perangkat Bergerak', 'XII PPLG 2', 'Lab PPLG 1', 'Budi Santoso, S.Kom', 'uji_guru');
  insertJadwal.run('Rabu', '1 - 2', '07.00', '08.20', 'Pemrograman Web & Perangkat Bergerak', 'XII PPLG 2', 'Lab PPLG 1', 'Budi Santoso, S.Kom', 'uji_guru');
  insertJadwal.run('Kamis', '1 - 2', '07.00', '08.20', 'Pemrograman Web & Perangkat Bergerak', 'XII PPLG 2', 'Lab PPLG 1', 'Budi Santoso, S.Kom', 'uji_guru');
  insertJadwal.run('Jumat', '1 - 2', '07.00', '08.30', 'Pemrograman Web & Perangkat Bergerak', 'XII PPLG 2', 'Lab PPLG 1', 'Budi Santoso, S.Kom', 'uji_guru');

  // uji_guru_lain — XII PPLG 1, Senin-Kamis jam 1-2
  insertJadwal.run('Senin', '1 - 2', '07.40', '09.00', 'Basis Data & SQL Lanjutan', 'XII PPLG 1', 'Lab PPLG 2', 'Siti Aminah, S.Pd', 'uji_guru_lain');
  insertJadwal.run('Selasa', '1 - 2', '07.00', '08.20', 'Basis Data & SQL Lanjutan', 'XII PPLG 1', 'Lab PPLG 2', 'Siti Aminah, S.Pd', 'uji_guru_lain');
  insertJadwal.run('Rabu', '1 - 2', '07.00', '08.20', 'Basis Data & SQL Lanjutan', 'XII PPLG 1', 'Lab PPLG 2', 'Siti Aminah, S.Pd', 'uji_guru_lain');
  insertJadwal.run('Kamis', '1 - 2', '07.00', '08.20', 'Basis Data & SQL Lanjutan', 'XII PPLG 1', 'Lab PPLG 2', 'Siti Aminah, S.Pd', 'uji_guru_lain');
  // uji_guru_lain — Jumat jam 3-4, juga mengajar XII PPLG 2
  insertJadwal.run('Jumat', '3 - 4', '08.45', '10.15', 'Basis Data & SQL Lanjutan', 'XII PPLG 2', 'Lab PPLG 1', 'Siti Aminah, S.Pd', 'uji_guru_lain');

  // ============================================
  // ABSENSI — 5 hari simulasi (26-30 Oktober 2026)
  // ============================================
  const insertAbsen = db.prepare(
    'INSERT INTO absensi (tanggal, kelas, nis, nama_siswa, status, catatan) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const simDates = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30'];

  for (const tanggal of simDates) {
    for (const s of siswaXII_PPLG2) {
      // Vary some attendance
      let status = 'H';
      let catatan = 'Hadir tepat waktu';
      if (s.nis === '10296' && tanggal === '2026-10-27') {
        status = 'S'; catatan = 'Sakit demam';
      }
      if (s.nis === '10301' && tanggal === '2026-10-28') {
        status = 'I'; catatan = 'Izin keluarga';
      }
      if (s.nis === '10307' && tanggal === '2026-10-30') {
        status = 'A'; catatan = '';
      }
      insertAbsen.run(tanggal, 'XII PPLG 2', s.nis, s.nama, status, catatan);
    }
    // XII PPLG 1
    for (const s of siswaXII_PPLG1) {
      insertAbsen.run(tanggal, 'XII PPLG 1', s.nis, s.nama, 'H', 'Hadir tepat waktu');
    }
  }

  // ============================================
  // JURNAL — 9 terisi, 2 sengaja belum diisi
  // ============================================
  const insertJurnal = db.prepare(
    'INSERT INTO jurnal (tanggal, guru_nama, guru_username, kelas, mapel, materi, refleksi, kehadiran_ringkas) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );

  // uji_guru jurnal
  insertJurnal.run('2026-10-26', 'Budi Santoso, S.Kom', 'uji_guru', 'XII PPLG 2', 'Pemrograman Web & Perangkat Bergerak', 'Pengenalan Next.js App Router dan Server Components', 'Siswa antusias, perlu latihan lebih lanjut', '20 Hadir, 0 Alpa');
  insertJurnal.run('2026-10-27', 'Budi Santoso, S.Kom', 'uji_guru', 'XII PPLG 2', 'Pemrograman Web & Perangkat Bergerak', 'Implementasi Routing dan Layout di Next.js', 'Materi tersampaikan dengan baik', '19 Hadir, 1 Sakit');
  insertJurnal.run('2026-10-28', 'Budi Santoso, S.Kom', 'uji_guru', 'XII PPLG 2', 'Pemrograman Web & Perangkat Bergerak', 'Data Fetching dan API Routes', 'Siswa mulai memahami pola fetch', '19 Hadir, 1 Izin');
  insertJurnal.run('2026-10-29', 'Budi Santoso, S.Kom', 'uji_guru', 'XII PPLG 2', 'Pemrograman Web & Perangkat Bergerak', 'Database Integration dengan SQLite', 'Perlu review materi SQL dasar', '20 Hadir, 0 Alpa');
  // 2026-10-30 sengaja belum diisi (untuk monitoring Kepsek)

  // uji_guru_lain jurnal
  insertJurnal.run('2026-10-26', 'Siti Aminah, S.Pd', 'uji_guru_lain', 'XII PPLG 1', 'Basis Data & SQL Lanjutan', 'Normalisasi Database dan ERD', 'Siswa perlu praktek lebih banyak', '2 Hadir, 0 Alpa');
  insertJurnal.run('2026-10-27', 'Siti Aminah, S.Pd', 'uji_guru_lain', 'XII PPLG 1', 'Basis Data & SQL Lanjutan', 'Query JOIN dan Subquery', 'Materi cukup padat, perlu pengulangan', '2 Hadir, 0 Alpa');
  insertJurnal.run('2026-10-28', 'Siti Aminah, S.Pd', 'uji_guru_lain', 'XII PPLG 1', 'Basis Data & SQL Lanjutan', 'Stored Procedure dan Trigger', 'Beberapa siswa masih kesulitan', '2 Hadir, 0 Alpa');
  insertJurnal.run('2026-10-29', 'Siti Aminah, S.Pd', 'uji_guru_lain', 'XII PPLG 1', 'Basis Data & SQL Lanjutan', 'Indexing dan Query Optimization', null, '2 Hadir, 0 Alpa');
  // 2026-10-30 sengaja belum diisi

  // ============================================
  // NILAI — 42 record (20 siswa PPLG 2 + 2 siswa PPLG 1, 2 mapel)
  // ============================================
  const insertNilai = db.prepare(
    'INSERT INTO nilai (kelas, nis, nama_siswa, mapel, nilai_tugas, nilai_uts, nilai_uas, nilai_akhir, predikat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  const nilaiVariants = [
    { tugas: 88, uts: 85, uas: 90 },
    { tugas: 92, uts: 78, uas: 85 },
    { tugas: 75, uts: 80, uas: 82 },
    { tugas: 95, uts: 90, uas: 88 },
    { tugas: 70, uts: 72, uas: 78 },
    { tugas: 85, uts: 88, uas: 92 },
    { tugas: 78, uts: 82, uas: 80 },
    { tugas: 90, uts: 85, uas: 87 },
    { tugas: 82, uts: 79, uas: 84 },
    { tugas: 88, uts: 91, uas: 86 },
    { tugas: 76, uts: 74, uas: 80 },
    { tugas: 93, uts: 89, uas: 91 },
    { tugas: 80, uts: 83, uas: 78 },
    { tugas: 87, uts: 85, uas: 90 },
    { tugas: 72, uts: 76, uas: 75 },
    { tugas: 91, uts: 88, uas: 94 },
    { tugas: 84, uts: 80, uas: 82 },
    { tugas: 79, uts: 77, uas: 83 },
    { tugas: 86, uts: 84, uas: 88 },
    { tugas: 90, uts: 92, uas: 85 },
  ];

  function getPredikat(n: number) {
    if (n >= 85) return 'A';
    if (n >= 75) return 'B';
    if (n >= 65) return 'C';
    return 'D';
  }

  for (let i = 0; i < siswaXII_PPLG2.length; i++) {
    const s = siswaXII_PPLG2[i];
    const v = nilaiVariants[i % nilaiVariants.length];
    const akhir = Math.round((v.tugas + v.uts + v.uas) / 3);
    insertNilai.run('XII PPLG 2', s.nis, s.nama, 'Pemrograman Web & Perangkat Bergerak', v.tugas, v.uts, v.uas, akhir, getPredikat(akhir));
  }

  // Nilai mapel kedua untuk XII PPLG 2
  for (let i = 0; i < siswaXII_PPLG2.length; i++) {
    const s = siswaXII_PPLG2[i];
    const v = nilaiVariants[(i + 5) % nilaiVariants.length];
    const akhir = Math.round((v.tugas + v.uts + v.uas) / 3);
    insertNilai.run('XII PPLG 2', s.nis, s.nama, 'Basis Data & SQL Lanjutan', v.tugas, v.uts, v.uas, akhir, getPredikat(akhir));
  }

  // Nilai XII PPLG 1
  for (let i = 0; i < siswaXII_PPLG1.length; i++) {
    const s = siswaXII_PPLG1[i];
    const v = nilaiVariants[(i + 3) % nilaiVariants.length];
    const akhir = Math.round((v.tugas + v.uts + v.uas) / 3);
    insertNilai.run('XII PPLG 1', s.nis, s.nama, 'Basis Data & SQL Lanjutan', v.tugas, v.uts, v.uas, akhir, getPredikat(akhir));
  }

  // ============================================
  // PIKET LOG — sample
  // ============================================
  const insertPiket = db.prepare(
    'INSERT INTO piket_log (tanggal, guru_piket_username, kelas, catatan) VALUES (?, ?, ?, ?)'
  );
  insertPiket.run('2026-10-26', 'uji_piket', 'XII PPLG 2', 'KBM berjalan lancar');
  insertPiket.run('2026-10-27', 'uji_piket', 'XII PPLG 2', 'Ada 1 siswa sakit');
  insertPiket.run('2026-10-28', 'uji_piket', 'XII PPLG 1', 'KBM normal');
}

export default db;
