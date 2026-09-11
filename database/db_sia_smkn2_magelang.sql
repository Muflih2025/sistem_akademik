-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Waktu pembuatan: 11 Sep 2026 pada 01.07
-- Versi server: 8.0.30
-- Versi PHP: 8.4.24

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Basis data: `db_sia_smkn2_magelang`
--

DELIMITER $$
--
-- Prosedur
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_hitung_nilai_akhir` (IN `p_nis` VARCHAR(15), IN `p_id_mapel` INT, IN `p_id_tahun_ajaran` INT)   BEGIN
    UPDATE nilai
    SET nilai_akhir = ROUND((nilai_tugas + nilai_uts + nilai_uas) / 3, 2)
    WHERE nis = p_nis
      AND id_mapel = p_id_mapel
      AND id_tahun_ajaran = p_id_tahun_ajaran;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Struktur dari tabel `guru`
--

CREATE TABLE `guru` (
  `id_guru` int NOT NULL,
  `nip` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_guru` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `no_hp` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `guru`
--

INSERT INTO `guru` (`id_guru`, `nip`, `nama_guru`, `email`, `no_hp`) VALUES
(1, '198501012010011001', 'Budi Santoso, S.Kom', 'budi.santoso@smkn2magelang.sch.id', '081234567801'),
(2, '198602022011022002', 'Siti Rahayu, S.Pd', 'siti.rahayu@smkn2magelang.sch.id', '081234567802'),
(3, '198703032012011003', 'Ahmad Fauzi, S.Kom', 'ahmad.fauzi@smkn2magelang.sch.id', '081234567803'),
(4, '198804042013022004', 'Dewi Lestari, S.Pd', 'dewi.lestari@smkn2magelang.sch.id', '081234567804'),
(5, '198905052014011005', 'Eko Prasetyo, S.T', 'eko.prasetyo@smkn2magelang.sch.id', '081234567805');

-- --------------------------------------------------------

--
-- Struktur dari tabel `jadwal`
--

CREATE TABLE `jadwal` (
  `id_jadwal` int NOT NULL,
  `id_guru` int NOT NULL,
  `id_mapel` int NOT NULL,
  `id_kelas` int NOT NULL,
  `hari` enum('Senin','Selasa','Rabu','Kamis','Jumat') COLLATE utf8mb4_unicode_ci NOT NULL,
  `jam_mulai` time NOT NULL,
  `jam_selesai` time NOT NULL,
  `ruang` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `jadwal`
--

INSERT INTO `jadwal` (`id_jadwal`, `id_guru`, `id_mapel`, `id_kelas`, `hari`, `jam_mulai`, `jam_selesai`, `ruang`) VALUES
(1, 1, 6, 2, 'Senin', '07:00:00', '08:30:00', 'RPL-1'),
(2, 1, 7, 2, 'Senin', '08:30:00', '10:00:00', 'RPL-1'),
(3, 3, 5, 2, 'Selasa', '07:00:00', '08:30:00', 'RPL-1'),
(4, 3, 6, 1, 'Selasa', '08:30:00', '10:00:00', 'RPL-2'),
(5, 2, 2, 2, 'Rabu', '07:00:00', '08:30:00', 'R-01'),
(6, 2, 2, 1, 'Rabu', '08:30:00', '10:00:00', 'R-02'),
(7, 4, 3, 2, 'Kamis', '07:00:00', '08:30:00', 'R-03'),
(8, 4, 3, 3, 'Kamis', '08:30:00', '10:00:00', 'R-04'),
(9, 5, 1, 2, 'Jumat', '07:00:00', '08:30:00', 'R-05'),
(10, 5, 1, 4, 'Jumat', '08:30:00', '10:00:00', 'R-06'),
(11, 1, 5, 3, 'Senin', '10:15:00', '11:45:00', 'RPL-2'),
(12, 3, 7, 1, 'Selasa', '10:15:00', '11:45:00', 'RPL-1'),
(13, 2, 4, 2, 'Rabu', '10:15:00', '11:45:00', 'R-01'),
(14, 4, 9, 2, 'Kamis', '10:15:00', '11:45:00', 'Lapangan'),
(15, 1, 10, 3, 'Jumat', '10:15:00', '11:45:00', 'RPL-2');

-- --------------------------------------------------------

--
-- Struktur dari tabel `jurusan`
--

CREATE TABLE `jurusan` (
  `id_jurusan` int NOT NULL,
  `kode_jurusan` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_jurusan` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `jurusan`
--

INSERT INTO `jurusan` (`id_jurusan`, `kode_jurusan`, `nama_jurusan`) VALUES
(1, 'PPLG', 'Pengembangan Perangkat Lunak dan Gim'),
(2, 'AKL', 'Akuntansi dan Keuangan Lembaga'),
(3, 'MPLB', 'Manajemen Perkantoran dan Layanan Bisnis'),
(4, 'PM', 'Pemasaran'),
(5, 'TKJ', 'Teknik Komputer dan Jaringan');

-- --------------------------------------------------------

--
-- Struktur dari tabel `kelas`
--

CREATE TABLE `kelas` (
  `id_kelas` int NOT NULL,
  `nama_kelas` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tingkat` enum('X','XI','XII') COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_jurusan` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `kelas`
--

INSERT INTO `kelas` (`id_kelas`, `nama_kelas`, `tingkat`, `id_jurusan`) VALUES
(1, 'X PPLG 1', 'X', 1),
(2, 'XI PPLG 1', 'XI', 1),
(3, 'XII PPLG 1', 'XII', 1),
(4, 'X AKL 1', 'X', 2),
(5, 'XI MPLB 1', 'XI', 3),
(6, 'X PM 1', 'X', 4);

-- --------------------------------------------------------

--
-- Struktur dari tabel `log_perubahan_nilai`
--

CREATE TABLE `log_perubahan_nilai` (
  `id_log` int NOT NULL,
  `id_nilai` int NOT NULL,
  `nilai_lama` decimal(5,2) DEFAULT NULL,
  `nilai_baru` decimal(5,2) DEFAULT NULL,
  `waktu_ubah` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `mata_pelajaran`
--

CREATE TABLE `mata_pelajaran` (
  `id_mapel` int NOT NULL,
  `kode_mapel` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_mapel` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kelompok` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Umum'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `mata_pelajaran`
--

INSERT INTO `mata_pelajaran` (`id_mapel`, `kode_mapel`, `nama_mapel`, `kelompok`) VALUES
(1, 'MTK', 'Matematika', 'Umum'),
(2, 'BIN', 'Bahasa Indonesia', 'Umum'),
(3, 'BIG', 'Bahasa Inggris', 'Umum'),
(4, 'PPKN', 'Pendidikan Pancasila', 'Umum'),
(5, 'PBO', 'Pemrograman Berorientasi Objek', 'Kejuruan'),
(6, 'BASDA', 'Basis Data', 'Kejuruan'),
(7, 'PWEB', 'Pemrograman Web', 'Kejuruan'),
(8, 'DGP', 'Desain Grafis Percetakan', 'Kejuruan'),
(9, 'PJOK', 'Pendidikan Jasmani', 'Umum'),
(10, 'PKK', 'Produk Kreatif dan Kewirausahaan', 'Kejuruan');

-- --------------------------------------------------------

--
-- Struktur dari tabel `nilai`
--

CREATE TABLE `nilai` (
  `id_nilai` int NOT NULL,
  `nis` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_mapel` int NOT NULL,
  `id_guru` int NOT NULL,
  `id_tahun_ajaran` int NOT NULL,
  `nilai_tugas` decimal(5,2) DEFAULT '0.00',
  `nilai_uts` decimal(5,2) DEFAULT '0.00',
  `nilai_uas` decimal(5,2) DEFAULT '0.00',
  `nilai_akhir` decimal(5,2) DEFAULT '0.00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `nilai`
--

INSERT INTO `nilai` (`id_nilai`, `nis`, `id_mapel`, `id_guru`, `id_tahun_ajaran`, `nilai_tugas`, `nilai_uts`, `nilai_uas`, `nilai_akhir`) VALUES
(1, '2425001', 6, 1, 2, 85.00, 80.00, 88.00, 84.33),
(2, '2425001', 7, 1, 2, 90.00, 85.00, 87.00, 87.33),
(3, '2425002', 6, 1, 2, 78.00, 75.00, 80.00, 77.67),
(4, '2425002', 7, 1, 2, 82.00, 79.00, 84.00, 81.67),
(5, '2425003', 6, 1, 2, 65.00, 60.00, 68.00, 64.33),
(6, '2425003', 5, 3, 2, 70.00, 72.00, 75.00, 72.33),
(7, '2425004', 6, 1, 2, 92.00, 90.00, 95.00, 92.33),
(8, '2425004', 2, 2, 2, 88.00, 85.00, 90.00, 87.67),
(9, '2425005', 6, 1, 2, 60.00, 58.00, 55.00, 57.67),
(10, '2425005', 5, 3, 2, 75.00, 70.00, 78.00, 74.33),
(11, '2425006', 7, 1, 2, 80.00, 82.00, 79.00, 80.33),
(12, '2425006', 3, 4, 2, 85.00, 83.00, 88.00, 85.33),
(13, '2425007', 6, 1, 2, 95.00, 92.00, 96.00, 94.33),
(14, '2425007', 1, 5, 2, 90.00, 88.00, 91.00, 89.67),
(15, '2425008', 6, 1, 2, 55.00, 50.00, 90.00, 65.00),
(16, '2425008', 7, 1, 2, 68.00, 65.00, 70.00, 67.67),
(17, '2425009', 5, 3, 2, 88.00, 85.00, 90.00, 87.67),
(18, '2425009', 6, 1, 2, 91.00, 89.00, 93.00, 91.00),
(19, '2425010', 6, 1, 2, 72.00, 70.00, 75.00, 72.33),
(20, '2425010', 2, 2, 2, 76.00, 74.00, 78.00, 76.00),
(21, '2425011', 5, 3, 1, 80.00, 78.00, 82.00, 80.00),
(22, '2425012', 6, 3, 1, 85.00, 88.00, 90.00, 87.67),
(23, '2425013', 7, 3, 1, 79.00, 76.00, 81.00, 78.67),
(24, '2425014', 5, 3, 1, 65.00, 68.00, 70.00, 67.67),
(25, '2425015', 6, 3, 1, 90.00, 92.00, 89.00, 90.33),
(26, '2425016', 1, 5, 2, 84.00, 80.00, 86.00, 83.33),
(27, '2425017', 3, 4, 2, 77.00, 75.00, 79.00, 77.00),
(28, '2425018', 4, 2, 2, 88.00, 86.00, 90.00, 88.00),
(29, '2425019', 9, 4, 2, 92.00, 90.00, 94.00, 92.00),
(30, '2425020', 10, 1, 2, 81.00, 79.00, 83.00, 81.00);

--
-- Trigger `nilai`
--
DELIMITER $$
CREATE TRIGGER `trg_log_nilai_akhir` AFTER UPDATE ON `nilai` FOR EACH ROW BEGIN
    IF OLD.nilai_akhir <> NEW.nilai_akhir THEN
        INSERT INTO log_perubahan_nilai (id_nilai, nilai_lama, nilai_baru)
        VALUES (OLD.id_nilai, OLD.nilai_akhir, NEW.nilai_akhir);
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Struktur dari tabel `siswa`
--

CREATE TABLE `siswa` (
  `nis` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_siswa` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `jenis_kelamin` enum('L','P') COLLATE utf8mb4_unicode_ci NOT NULL,
  `tanggal_lahir` date NOT NULL,
  `alamat` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_kelas` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `siswa`
--

INSERT INTO `siswa` (`nis`, `nama_siswa`, `jenis_kelamin`, `tanggal_lahir`, `alamat`, `id_kelas`) VALUES
('2425001', 'Andi Saputra', 'L', '2008-03-12', 'Jl. Magelang No.1A, Magelang', 2),
('2425002', 'Bella Anggraini', 'P', '2008-05-21', 'Jl. Mertoyudan No.2, Magelang', 2),
('2425003', 'Candra Wijaya', 'L', '2008-01-15', 'Jl. Tidar No.3, Magelang', 2),
('2425004', 'Dinda Permatasari', 'P', '2008-07-09', 'Jl. Sriwijaya No.4, Magelang', 2),
('2425005', 'Eka Nur Fadillah', 'P', '2008-02-27', 'Jl. Diponegoro No.5, Magelang', 2),
('2425006', 'Farhan Maulana', 'L', '2008-09-30', 'Jl. Pahlawan No.6, Magelang', 2),
('2425007', 'Gita Ramadhani', 'P', '2008-04-18', 'Jl. Ahmad Yani No.7, Magelang', 2),
('2425008', 'Hendra Kurniawan', 'L', '2008-06-05', 'Jl. Sudirman No.8, Magelang', 2),
('2425009', 'Indah Puspitasari', 'P', '2008-11-11', 'Jl. Veteran No.9, Magelang', 2),
('2425010', 'Joko Prasetyo', 'L', '2008-08-23', 'Jl. Gatot Subroto No.10, Magelang', 2),
('2425011', 'Kartika Sari', 'P', '2008-12-02', 'Jl. Cendrawasih No.11, Magelang', 1),
('2425012', 'Lutfi Hakim', 'L', '2007-10-19', 'Jl. Melati No.12, Magelang', 3),
('2425013', 'Maya Oktaviani', 'P', '2007-03-25', 'Jl. Mawar No.13, Magelang', 3),
('2425014', 'Naufal Ramadhan', 'L', '2008-01-30', 'Jl. Kenanga No.14, Magelang', 1),
('2425015', 'Olivia Zahra', 'P', '2008-05-14', 'Jl. Anggrek No.15, Magelang', 1),
('2425016', 'Putra Adi Nugroho', 'L', '2008-06-22', 'Jl. Menoreh No.16, Magelang', 4),
('2425017', 'Qonita Nabila', 'P', '2008-09-08', 'Jl. Pattimura No.17, Magelang', 4),
('2425018', 'Rizky Ramadhani', 'L', '2008-02-14', 'Jl. Borobudur No.18, Magelang', 5),
('2425019', 'Sinta Dewi', 'P', '2008-07-27', 'Jl. Ki Mangunsarkoro No.19, Magelang', 6),
('2425020', 'Taufik Hidayat', 'L', '2008-04-03', 'Jl. Elo No.20, Magelang', 6);

-- --------------------------------------------------------

--
-- Struktur dari tabel `tahun_ajaran`
--

CREATE TABLE `tahun_ajaran` (
  `id_tahun_ajaran` int NOT NULL,
  `tahun_ajaran` varchar(9) COLLATE utf8mb4_unicode_ci NOT NULL,
  `semester` enum('Ganjil','Genap') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('Aktif','Tidak Aktif') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Tidak Aktif'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `tahun_ajaran`
--

INSERT INTO `tahun_ajaran` (`id_tahun_ajaran`, `tahun_ajaran`, `semester`, `status`) VALUES
(1, '2025/2026', 'Ganjil', 'Tidak Aktif'),
(2, '2025/2026', 'Genap', 'Aktif');

-- --------------------------------------------------------

--
-- Struktur dari tabel `users`
--

CREATE TABLE `users` (
  `id_user` int NOT NULL,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','guru','kepala_sekolah','siswa') COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_referensi` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('aktif','nonaktif') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'aktif',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `users`
--

INSERT INTO `users` (`id_user`, `username`, `password`, `role`, `id_referensi`, `status`, `created_at`) VALUES
(1, 'admin', '$2y$12$yb28sf8y5Ziou.E2uCcR9.oFS2ZlDf5d4B7.l8wInHFaCRvfsQxue', 'admin', NULL, 'aktif', '2026-09-04 04:13:11'),
(2, '2425001', '$2y$12$40hZeNPbUdxKGO121zJTreFuEBNkD2weCoBEhH8/4oVHK6Mt5J1Ue', 'siswa', '2425001', 'aktif', '2026-09-04 04:13:12'),
(3, '2425003', '$2y$12$3Lce9h6z3uV0n48pFUnrd.CcEVZfl7NVT0qUxFbk.WNLff/i2ri4q', 'siswa', '2425003', 'aktif', '2026-09-04 04:13:12'),
(4, '2425006', '$2y$12$IhquJJPoQSQ3dztZK8nY0eDyezQ8kepAAd.Pkpdwzc6EVO4ROZ1JO', 'siswa', '2425006', 'aktif', '2026-09-04 04:13:13'),
(5, '2425008', '$2y$12$ZmYERR9baomyjUd5dGqUHOwYzM9ggDvlXcWzJtKM/CcXfANDC/ij2', 'siswa', '2425008', 'aktif', '2026-09-04 04:13:13'),
(6, '2425010', '$2y$12$nCpvrMZF8YA6xSwJ3Cza4uz7kvJI92PlYB6G6Kv1nXr15qTWpXeZa', 'siswa', '2425010', 'aktif', '2026-09-04 04:13:14'),
(7, '2425012', '$2y$12$BdXQl/enqcthVVpXYfzliuUimF/A/s66W.Yft9wizuDHPjGBIuVue', 'siswa', '2425012', 'aktif', '2026-09-04 04:13:14'),
(8, '2425014', '$2y$12$/dm2.OljESjVJz01bzYTyuu03KiMO/YjI3AA1ZTxtNQ3RkYhqxOTG', 'siswa', '2425014', 'aktif', '2026-09-04 04:13:15'),
(9, '2425016', '$2y$12$v.Ehp2zuIb4DT3Ho7MewHuZNb1wBVEQzQ1ZtC0Wma9tRcn.6/ToIa', 'siswa', '2425016', 'aktif', '2026-09-04 04:13:15'),
(10, '2425018', '$2y$12$ONBX5b9G7ly7Z5ki33dXSOQK5MyGbMkow7quV0DAsjvZ53fYc8BzO', 'siswa', '2425018', 'aktif', '2026-09-04 04:13:16'),
(11, '2425020', '$2y$12$cEkoR/PCRYzsFtU81o7ou.eNOr3bzCCVTmGmh7NwFC0qMmY5ySFuW', 'siswa', '2425020', 'aktif', '2026-09-04 04:13:16'),
(12, '2425002', '$2y$12$Z.aEwSav.1ISJcx1vrUZV.5chizQbNAUVUYAE0cU4YsRFRkwUbjR6', 'siswa', '2425002', 'aktif', '2026-09-04 04:13:17'),
(13, '2425004', '$2y$12$dJ3hbY.CCFhuZzaHgXZOEuUBRPltADdP9dRnqnC1U6S6ktNxqE4u.', 'siswa', '2425004', 'aktif', '2026-09-04 04:13:17'),
(14, '2425005', '$2y$12$GyVc.BjgBCvwsuRWHpsahO7YCP.Q/TrvhBZRjJSOKxBQLejHilHeC', 'siswa', '2425005', 'aktif', '2026-09-04 04:13:17'),
(15, '2425007', '$2y$12$M0g8VRlV6cZ9rIRjA9t0.ezJmHOfCBm.L.r9c7/4Ws5gEGdROz5aq', 'siswa', '2425007', 'aktif', '2026-09-04 04:13:18'),
(16, '2425009', '$2y$12$Dq.LR9YNoUadMqz/9yga5uIkNMByY1QO8OsJF7b5X/Nn5W97y93nu', 'siswa', '2425009', 'aktif', '2026-09-04 04:13:18'),
(17, '2425011', '$2y$12$QxN8RNIZ5/m34RMPFOl14e4AAJ5.JJQgNWrMvI7RgieyhItnyTtwO', 'siswa', '2425011', 'aktif', '2026-09-04 04:13:19'),
(18, '2425013', '$2y$12$A4aiggPC0QgNkmitN9sB3.2VGECDbIcg3/slHqkFchUMWyDlC3FZO', 'siswa', '2425013', 'aktif', '2026-09-04 04:13:19'),
(19, '2425015', '$2y$12$0atu17sZ60gSh7KwvcYD5.NMHfmwpyIQfJZ72v4z3xIJESt6743aq', 'siswa', '2425015', 'aktif', '2026-09-04 04:13:20'),
(20, '2425017', '$2y$12$5EG9IsZIfTKLeT.425PGpeD97Khh3NBxEZ9OlTdKvbm6omwIf4WBu', 'siswa', '2425017', 'aktif', '2026-09-04 04:13:20'),
(21, '2425019', '$2y$12$QPyog6Yr3lCmQ8F7rMcnrO7QzAlPBC7T.tVLS7q4NAda0pFzsdKyG', 'siswa', '2425019', 'aktif', '2026-09-04 04:13:21');

-- --------------------------------------------------------

--
-- Stand-in struktur untuk tampilan `view_rapor_siswa`
-- (Lihat di bawah untuk tampilan aktual)
--
CREATE TABLE `view_rapor_siswa` (
`nis` varchar(15)
,`nama_siswa` varchar(100)
,`nama_kelas` varchar(30)
,`nama_mapel` varchar(100)
,`nilai_tugas` decimal(5,2)
,`nilai_uts` decimal(5,2)
,`nilai_uas` decimal(5,2)
,`nilai_akhir` decimal(5,2)
,`tahun_ajaran` varchar(9)
,`semester` enum('Ganjil','Genap')
);

--
-- Indeks untuk tabel yang dibuang
--

--
-- Indeks untuk tabel `guru`
--
ALTER TABLE `guru`
  ADD PRIMARY KEY (`id_guru`),
  ADD UNIQUE KEY `nip` (`nip`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_guru_nama` (`nama_guru`);

--
-- Indeks untuk tabel `jadwal`
--
ALTER TABLE `jadwal`
  ADD PRIMARY KEY (`id_jadwal`),
  ADD KEY `fk_jadwal_mapel` (`id_mapel`),
  ADD KEY `idx_jadwal_hari` (`hari`),
  ADD KEY `idx_jadwal_guru_hari` (`id_guru`,`hari`,`jam_mulai`),
  ADD KEY `idx_jadwal_kelas_hari` (`id_kelas`,`hari`,`jam_mulai`);

--
-- Indeks untuk tabel `jurusan`
--
ALTER TABLE `jurusan`
  ADD PRIMARY KEY (`id_jurusan`),
  ADD UNIQUE KEY `kode_jurusan` (`kode_jurusan`);

--
-- Indeks untuk tabel `kelas`
--
ALTER TABLE `kelas`
  ADD PRIMARY KEY (`id_kelas`),
  ADD KEY `fk_kelas_jurusan` (`id_jurusan`),
  ADD KEY `idx_kelas_tingkat` (`tingkat`);

--
-- Indeks untuk tabel `log_perubahan_nilai`
--
ALTER TABLE `log_perubahan_nilai`
  ADD PRIMARY KEY (`id_log`);

--
-- Indeks untuk tabel `mata_pelajaran`
--
ALTER TABLE `mata_pelajaran`
  ADD PRIMARY KEY (`id_mapel`),
  ADD UNIQUE KEY `kode_mapel` (`kode_mapel`),
  ADD KEY `idx_mapel_nama` (`nama_mapel`);

--
-- Indeks untuk tabel `nilai`
--
ALTER TABLE `nilai`
  ADD PRIMARY KEY (`id_nilai`),
  ADD UNIQUE KEY `uq_nilai` (`nis`,`id_mapel`,`id_tahun_ajaran`),
  ADD KEY `fk_nilai_guru` (`id_guru`),
  ADD KEY `fk_nilai_tahun` (`id_tahun_ajaran`),
  ADD KEY `idx_nilai_siswa_tahun` (`nis`,`id_tahun_ajaran`),
  ADD KEY `idx_nilai_mapel_akhir` (`id_mapel`,`nilai_akhir`),
  ADD KEY `idx_nilai_akhir` (`nilai_akhir`);

--
-- Indeks untuk tabel `siswa`
--
ALTER TABLE `siswa`
  ADD PRIMARY KEY (`nis`),
  ADD KEY `fk_siswa_kelas` (`id_kelas`),
  ADD KEY `idx_siswa_nama` (`nama_siswa`),
  ADD KEY `idx_siswa_jk` (`jenis_kelamin`);

--
-- Indeks untuk tabel `tahun_ajaran`
--
ALTER TABLE `tahun_ajaran`
  ADD PRIMARY KEY (`id_tahun_ajaran`),
  ADD UNIQUE KEY `uq_tahun_semester` (`tahun_ajaran`,`semester`);

--
-- Indeks untuk tabel `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id_user`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `idx_users_ref` (`role`,`id_referensi`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `guru`
--
ALTER TABLE `guru`
  MODIFY `id_guru` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT untuk tabel `jadwal`
--
ALTER TABLE `jadwal`
  MODIFY `id_jadwal` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT untuk tabel `jurusan`
--
ALTER TABLE `jurusan`
  MODIFY `id_jurusan` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT untuk tabel `kelas`
--
ALTER TABLE `kelas`
  MODIFY `id_kelas` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT untuk tabel `log_perubahan_nilai`
--
ALTER TABLE `log_perubahan_nilai`
  MODIFY `id_log` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `mata_pelajaran`
--
ALTER TABLE `mata_pelajaran`
  MODIFY `id_mapel` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT untuk tabel `nilai`
--
ALTER TABLE `nilai`
  MODIFY `id_nilai` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT untuk tabel `tahun_ajaran`
--
ALTER TABLE `tahun_ajaran`
  MODIFY `id_tahun_ajaran` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT untuk tabel `users`
--
ALTER TABLE `users`
  MODIFY `id_user` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

-- --------------------------------------------------------

--
-- Struktur untuk view `view_rapor_siswa`
--
DROP TABLE IF EXISTS `view_rapor_siswa`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_rapor_siswa`  AS SELECT `s`.`nis` AS `nis`, `s`.`nama_siswa` AS `nama_siswa`, `k`.`nama_kelas` AS `nama_kelas`, `mp`.`nama_mapel` AS `nama_mapel`, `n`.`nilai_tugas` AS `nilai_tugas`, `n`.`nilai_uts` AS `nilai_uts`, `n`.`nilai_uas` AS `nilai_uas`, `n`.`nilai_akhir` AS `nilai_akhir`, `ta`.`tahun_ajaran` AS `tahun_ajaran`, `ta`.`semester` AS `semester` FROM ((((`nilai` `n` join `siswa` `s` on((`n`.`nis` = `s`.`nis`))) join `kelas` `k` on((`s`.`id_kelas` = `k`.`id_kelas`))) join `mata_pelajaran` `mp` on((`n`.`id_mapel` = `mp`.`id_mapel`))) join `tahun_ajaran` `ta` on((`n`.`id_tahun_ajaran` = `ta`.`id_tahun_ajaran`))) ;

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `jadwal`
--
ALTER TABLE `jadwal`
  ADD CONSTRAINT `fk_jadwal_guru` FOREIGN KEY (`id_guru`) REFERENCES `guru` (`id_guru`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_jadwal_kelas` FOREIGN KEY (`id_kelas`) REFERENCES `kelas` (`id_kelas`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_jadwal_mapel` FOREIGN KEY (`id_mapel`) REFERENCES `mata_pelajaran` (`id_mapel`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `kelas`
--
ALTER TABLE `kelas`
  ADD CONSTRAINT `fk_kelas_jurusan` FOREIGN KEY (`id_jurusan`) REFERENCES `jurusan` (`id_jurusan`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `nilai`
--
ALTER TABLE `nilai`
  ADD CONSTRAINT `fk_nilai_guru` FOREIGN KEY (`id_guru`) REFERENCES `guru` (`id_guru`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_nilai_mapel` FOREIGN KEY (`id_mapel`) REFERENCES `mata_pelajaran` (`id_mapel`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_nilai_siswa` FOREIGN KEY (`nis`) REFERENCES `siswa` (`nis`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_nilai_tahun` FOREIGN KEY (`id_tahun_ajaran`) REFERENCES `tahun_ajaran` (`id_tahun_ajaran`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `siswa`
--
ALTER TABLE `siswa`
  ADD CONSTRAINT `fk_siswa_kelas` FOREIGN KEY (`id_kelas`) REFERENCES `kelas` (`id_kelas`) ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
