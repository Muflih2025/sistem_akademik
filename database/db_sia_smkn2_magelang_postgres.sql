-- Schema & Data untuk PostgreSQL / pgAdmin 4
-- Sistem Informasi Akademik SMKN 2 Magelang

-- 1. Tabel Jurusan
CREATE TABLE IF NOT EXISTS jurusan (
    id_jurusan SERIAL PRIMARY KEY,
    kode_jurusan VARCHAR(10) NOT NULL UNIQUE,
    nama_jurusan VARCHAR(100) NOT NULL
);

INSERT INTO jurusan (id_jurusan, kode_jurusan, nama_jurusan) VALUES
(1, 'RPL', 'Rekayasa Perangkat Lunak'),
(2, 'TKJ', 'Teknik Komputer dan Jaringan'),
(3, 'AKL', 'Akuntansi dan Keuangan Lembaga'),
(4, 'OTKP', 'Otomatisasi dan Tata Kelola Perkantoran'),
(5, 'BDP', 'Bisnis Daring dan Pemasaran')
ON CONFLICT (id_jurusan) DO NOTHING;

-- 2. Tabel Kelas
CREATE TABLE IF NOT EXISTS kelas (
    id_kelas SERIAL PRIMARY KEY,
    nama_kelas VARCHAR(20) NOT NULL,
    tingkat VARCHAR(5) NOT NULL,
    id_jurusan INT REFERENCES jurusan(id_jurusan) ON DELETE SET NULL
);

INSERT INTO kelas (id_kelas, nama_kelas, tingkat, id_jurusan) VALUES
(1, 'X RPL 1', 'X', 1),
(2, 'X RPL 2', 'X', 1),
(3, 'XI RPL 1', 'XI', 1),
(4, 'XII RPL 1', 'XII', 1),
(5, 'X TKJ 1', 'X', 2),
(6, 'XI TKJ 1', 'XI', 2)
ON CONFLICT (id_kelas) DO NOTHING;

-- 3. Tabel Guru
CREATE TABLE IF NOT EXISTS guru (
    id_guru SERIAL PRIMARY KEY,
    nip VARCHAR(20) NOT NULL UNIQUE,
    nama_guru VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    no_hp VARCHAR(20)
);

INSERT INTO guru (id_guru, nip, nama_guru, email, no_hp) VALUES
(1, '198501012010011001', 'Budi Santoso, S.Kom', 'budi.santoso@smkn2magelang.sch.id', '081234567801'),
(2, '198602022011022002', 'Siti Rahayu, S.Pd', 'siti.rahayu@smkn2magelang.sch.id', '081234567802'),
(3, '198703032012011003', 'Ahmad Fauzi, S.Kom', 'ahmad.fauzi@smkn2magelang.sch.id', '081234567803'),
(4, '198804042013022004', 'Dewi Lestari, S.Pd', 'dewi.lestari@smkn2magelang.sch.id', '081234567804'),
(5, '198905052014011005', 'Eko Prasetyo, S.T', 'eko.prasetyo@smkn2magelang.sch.id', '081234567805')
ON CONFLICT (id_guru) DO NOTHING;

-- 4. Tabel Siswa
CREATE TABLE IF NOT EXISTS siswa (
    nis VARCHAR(15) PRIMARY KEY,
    nama_siswa VARCHAR(100) NOT NULL,
    jenis_kelamin VARCHAR(1) CHECK (jenis_kelamin IN ('L', 'P')),
    tanggal_lahir DATE,
    alamat TEXT,
    id_kelas INT REFERENCES kelas(id_kelas) ON DELETE SET NULL
);

INSERT INTO siswa (nis, nama_siswa, jenis_kelamin, tanggal_lahir, alamat, id_kelas) VALUES
('2425001', 'Ahmad Rizky Pratama', 'L', '2008-03-15', 'Jl. Pahlawan No. 12, Magelang', 1),
('2425002', 'Bunga Citra Lestari', 'P', '2008-07-22', 'Jl. Pemuda No. 45, Magelang', 1),
('2425003', 'Candra Wijaya', 'L', '2008-01-10', 'Jl. Tidar No. 8, Magelang', 1),
('2425004', 'Dina Maulida', 'P', '2008-11-05', 'Jl. Gatot Subroto No. 30, Magelang', 1),
('2425005', 'Fajar Ramadhan', 'L', '2008-09-18', 'Jl. Sudirman No. 99, Magelang', 2)
ON CONFLICT (nis) DO NOTHING;

-- 5. Tabel Mata Pelajaran
CREATE TABLE IF NOT EXISTS mata_pelajaran (
    id_mapel SERIAL PRIMARY KEY,
    kode_mapel VARCHAR(10) NOT NULL UNIQUE,
    nama_mapel VARCHAR(100) NOT NULL,
    kelompok VARCHAR(30) DEFAULT 'Umum',
    kkm NUMERIC(5,2) DEFAULT 75.00
);

INSERT INTO mata_pelajaran (id_mapel, kode_mapel, nama_mapel, kelompok, kkm) VALUES
(1, 'MP001', 'Pemrograman Berorientasi Objek', 'Produktif', 75.00),
(2, 'MP002', 'Basis Data', 'Produktif', 75.00),
(3, 'MP003', 'Pemrograman Web dan Perangkat Bergerak', 'Produktif', 75.00),
(4, 'MP004', 'Matematika', 'Umum', 75.00),
(5, 'MP005', 'Bahasa Indonesia', 'Umum', 75.00)
ON CONFLICT (id_mapel) DO NOTHING;

-- 6. Tabel Tahun Ajaran
CREATE TABLE IF NOT EXISTS tahun_ajaran (
    id_tahun_ajaran SERIAL PRIMARY KEY,
    tahun_ajaran VARCHAR(10) NOT NULL,
    semester VARCHAR(10) CHECK (semester IN ('Ganjil', 'Genap')),
    status VARCHAR(15) DEFAULT 'Tidak Aktif' CHECK (status IN ('Aktif', 'Tidak Aktif'))
);

INSERT INTO tahun_ajaran (id_tahun_ajaran, tahun_ajaran, semester, status) VALUES
(1, '2025/2026', 'Ganjil', 'Aktif'),
(2, '2025/2026', 'Genap', 'Tidak Aktif')
ON CONFLICT (id_tahun_ajaran) DO NOTHING;

-- 7. Tabel Jadwal
CREATE TABLE IF NOT EXISTS jadwal (
    id_jadwal SERIAL PRIMARY KEY,
    id_guru INT REFERENCES guru(id_guru) ON DELETE CASCADE,
    id_mapel INT REFERENCES mata_pelajaran(id_mapel) ON DELETE CASCADE,
    id_kelas INT REFERENCES kelas(id_kelas) ON DELETE CASCADE,
    hari VARCHAR(10) NOT NULL,
    jam_mulai TIME NOT NULL,
    jam_selesai TIME NOT NULL,
    ruang VARCHAR(20)
);

-- 8. Tabel Nilai
CREATE TABLE IF NOT EXISTS nilai (
    id_nilai SERIAL PRIMARY KEY,
    nis VARCHAR(15) REFERENCES siswa(nis) ON DELETE CASCADE,
    id_mapel INT REFERENCES mata_pelajaran(id_mapel) ON DELETE CASCADE,
    id_guru INT REFERENCES guru(id_guru) ON DELETE SET NULL,
    id_tahun_ajaran INT REFERENCES tahun_ajaran(id_tahun_ajaran) ON DELETE CASCADE,
    nilai_tugas NUMERIC(5,2) DEFAULT 0,
    nilai_uts NUMERIC(5,2) DEFAULT 0,
    nilai_uas NUMERIC(5,2) DEFAULT 0,
    nilai_akhir NUMERIC(5,2) DEFAULT 0
);

-- 9. Tabel Log Perubahan Nilai
CREATE TABLE IF NOT EXISTS log_perubahan_nilai (
    id_log SERIAL PRIMARY KEY,
    id_nilai INT REFERENCES nilai(id_nilai) ON DELETE CASCADE,
    nilai_lama NUMERIC(5,2),
    nilai_baru NUMERIC(5,2),
    waktu_diubah TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Tabel Users
CREATE TABLE IF NOT EXISTS users (
    id_user SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'guru', 'kepala_sekolah', 'siswa')),
    id_referensi VARCHAR(20) DEFAULT NULL,
    status VARCHAR(15) NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Password demo seluruh user: password ($2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi)
INSERT INTO users (username, password, role, id_referensi, status) VALUES
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', NULL, 'aktif'),
('budi', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'guru', '1', 'aktif'),
('siti', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'guru', '2', 'aktif'),
('kepsek', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'kepala_sekolah', NULL, 'aktif'),
('2425001', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'siswa', '2425001', 'aktif'),
('2425002', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'siswa', '2425002', 'aktif')
ON CONFLICT (username) DO NOTHING;

-- 11. Tabel Catatan Evaluasi
CREATE TABLE IF NOT EXISTS catatan_evaluasi (
    id_evaluasi SERIAL PRIMARY KEY,
    judul VARCHAR(150) NOT NULL,
    isi TEXT NOT NULL,
    id_tahun_ajaran INT REFERENCES tahun_ajaran(id_tahun_ajaran) ON DELETE SET NULL,
    created_by INT REFERENCES users(id_user) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Tabel Absensi
CREATE TABLE IF NOT EXISTS absensi (
    id_absen SERIAL PRIMARY KEY,
    tanggal DATE NOT NULL,
    nis VARCHAR(15) REFERENCES siswa(nis) ON DELETE CASCADE,
    id_jadwal INT REFERENCES jadwal(id_jadwal) ON DELETE CASCADE,
    status VARCHAR(10) NOT NULL DEFAULT 'Hadir' CHECK (status IN ('Hadir', 'Izin', 'Sakit', 'Alpa')),
    keterangan VARCHAR(255) DEFAULT NULL,
    created_by INT REFERENCES users(id_user) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_absensi UNIQUE (tanggal, nis, id_jadwal)
);
