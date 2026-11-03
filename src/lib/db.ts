import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'sia.db');
const db = new Database(DB_PATH);

// Initialize schema and sample seed data
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    nama TEXT NOT NULL,
    role TEXT NOT NULL, -- admin, guru, kepsek, siswa
    nip_nis TEXT,
    kelas TEXT
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
    guru_nama TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS absensi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanggal TEXT NOT NULL,
    kelas TEXT NOT NULL,
    nis TEXT NOT NULL,
    nama_siswa TEXT NOT NULL,
    status TEXT NOT NULL, -- H (Hadir), S (Sakit), I (Izin), A (Alpa)
    catatan TEXT
  );

  CREATE TABLE IF NOT EXISTS jurnal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanggal TEXT NOT NULL,
    guru_nama TEXT NOT NULL,
    kelas TEXT NOT NULL,
    mapel TEXT NOT NULL,
    materi TEXT NOT NULL,
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
`);

// Check if seeded
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  const insertUser = db.prepare('INSERT INTO users (username, nama, role, nip_nis, kelas) VALUES (?, ?, ?, ?, ?)');
  insertUser.run('uji_admin', 'Administrator SIA', 'admin', '198001012005011001', null);
  insertUser.run('uji_guru', 'Budi Santoso, S.Kom', 'guru', '198503152010011012', 'XII PPLG 2');
  insertUser.run('uji_kepsek', 'Drs. H. Muflih, M.Pd', 'kepsek', '197005021995121001', null);
  insertUser.run('uji_siswa', 'Ahmad Rizki Pratama', 'siswa', '10293', 'XII PPLG 2');

  const insertJadwal = db.prepare('INSERT INTO jadwal (hari, jam_ke, jam_mulai, jam_selesai, mapel, kelas, ruang, guru_nama) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  insertJadwal.run('Senin', '1 - 2', '07.15', '08.45', 'Pemrograman Web & Perangkat Bergerak', 'XII PPLG 2', 'Lab RPL 1', 'Budi Santoso, S.Kom');
  insertJadwal.run('Senin', '3 - 4', '09.00', '10.30', 'Basis Data & SQL Lanjutan', 'XII PPLG 2', 'Lab RPL 1', 'Budi Santoso, S.Kom');
  insertJadwal.run('Selasa', '1 - 2', '07.15', '08.45', 'Pemodelan Perangkat Lunak', 'XII PPLG 1', 'Lab RPL 2', 'Budi Santoso, S.Kom');
  insertJadwal.run('Rabu', '5 - 6', '10.45', '12.15', 'Projek Kreatif & Kewirausahaan', 'XII PPLG 2', 'Lab RPL 1', 'Budi Santoso, S.Kom');
  insertJadwal.run('Kamis', '1 - 4', '07.15', '10.30', 'Produk Kreatif RPL', 'XII PPLG 2', 'Lab RPL 1', 'Budi Santoso, S.Kom');
  insertJadwal.run('Jumat', '1 - 2', '07.00', '08.30', 'Pemrograman Berorientasi Objek', 'XII PPLG 2', 'Lab RPL 1', 'Budi Santoso, S.Kom');

  const insertAbsen = db.prepare('INSERT INTO absensi (tanggal, kelas, nis, nama_siswa, status, catatan) VALUES (?, ?, ?, ?, ?, ?)');
  const sampleStudents = [
    { nis: '10291', nama: 'Aditya Pratama' },
    { nis: '10292', nama: 'Agnes Monica' },
    { nis: '10293', nama: 'Ahmad Rizki Pratama' },
    { nis: '10294', nama: 'Anisa Rahmawati' },
    { nis: '10295', nama: 'Bagus Setiawan' },
    { nis: '10296', nama: 'Bella Safitri' },
    { nis: '10297', nama: 'Dimas Anggara' },
    { nis: '10298', nama: 'Fajar Nugroho' },
  ];
  const todayStr = '2026-11-03';
  for (const s of sampleStudents) {
    insertAbsen.run(todayStr, 'XII PPLG 2', s.nis, s.nama, 'H', 'Hadir tepat waktu');
  }

  const insertJurnal = db.prepare('INSERT INTO jurnal (tanggal, guru_nama, kelas, mapel, materi, kehadiran_ringkas) VALUES (?, ?, ?, ?, ?, ?)');
  insertJurnal.run('2026-11-03', 'Budi Santoso, S.Kom', 'XII PPLG 2', 'Pemrograman Web & Perangkat Bergerak', 'Implementasi Full TSX & Next.js App Router', '8 Hadir, 0 Alpa');
  insertJurnal.run('2026-11-02', 'Budi Santoso, S.Kom', 'XII PPLG 2', 'Basis Data & SQL Lanjutan', 'Desain Skema Relasional Akademik', '8 Hadir, 0 Alpa');

  const insertNilai = db.prepare('INSERT INTO nilai (kelas, nis, nama_siswa, mapel, nilai_tugas, nilai_uts, nilai_uas, nilai_akhir, predikat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const s of sampleStudents) {
    const tugas = 88;
    const uts = 85;
    const uas = 90;
    const akhir = Math.round((tugas + uts + uas) / 3);
    insertNilai.run('XII PPLG 2', s.nis, s.nama, 'Pemrograman Web & Perangkat Bergerak', tugas, uts, uas, akhir, 'A');
  }
}

export default db;
