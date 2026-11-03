<?php
declare(strict_types=1);

const APP_NAME = 'SIA SMKN 2 Magelang';
const DB_HOST = '127.0.0.1';
const DB_PORT = 3307;
const DB_NAME = 'db_sia_smkn2_magelang';
const DB_USER = 'root';
const DB_PASS = '';
const DEFAULT_KKM = 75;

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax']);
    session_start();
}

function db(): PDO {
    static $pdo;
    if (!$pdo) {
        $pdo = new PDO('mysql:host='.DB_HOST.';port='.(defined('DB_PORT') ? DB_PORT : 3306).';dbname='.DB_NAME.';charset=utf8mb4', DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
    return $pdo;
}
function ensure_auth_tables(): void {
    $pdo = db();
    try {
        if ($pdo->query("SELECT 1 FROM users LIMIT 1") !== false) {
            // Already have basic tables, run migrations
        }
    } catch (Throwable) {
        // Proceed with creates
    }
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id_user INT NOT NULL AUTO_INCREMENT,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin','guru','kepala_sekolah','siswa') NOT NULL,
        id_referensi VARCHAR(20) DEFAULT NULL,
        status ENUM('aktif','nonaktif') NOT NULL DEFAULT 'aktif',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id_user), KEY idx_users_ref (role,id_referensi)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $pdo->exec("ALTER TABLE mata_pelajaran ADD COLUMN IF NOT EXISTS kkm DECIMAL(5,2) NOT NULL DEFAULT 75.00");
    $pdo->exec("CREATE TABLE IF NOT EXISTS absensi (
        id_absen INT NOT NULL AUTO_INCREMENT,
        tanggal DATE NOT NULL,
        nis VARCHAR(15) NOT NULL,
        id_jadwal INT NOT NULL,
        status ENUM('Hadir','Izin','Sakit','Alpa') NOT NULL DEFAULT 'Hadir',
        keterangan VARCHAR(255) DEFAULT NULL,
        created_by INT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id_absen), UNIQUE KEY uq_absensi (tanggal,nis,id_jadwal),
        KEY idx_absensi_siswa (nis,tanggal), KEY idx_absensi_guru (created_by,tanggal)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $q = $pdo->prepare('SELECT COUNT(*) FROM users WHERE username=?');
    $q->execute(['admin']);
    if (!(int)$q->fetchColumn()) {
        $q = $pdo->prepare('INSERT INTO users(username,password,role,status) VALUES(?,?,?,?)');
        $q->execute(['admin', password_hash('password', PASSWORD_BCRYPT), 'admin', 'aktif']);
    }
    // Setiap siswa dapat login menggunakan NIS sebagai username.
    $students = $pdo->query('SELECT nis FROM siswa')->fetchAll(PDO::FETCH_COLUMN);
    $check = $pdo->prepare('SELECT COUNT(*) FROM users WHERE username=?');
    $insert = $pdo->prepare('INSERT INTO users(username,password,role,id_referensi,status) VALUES(?,?,?,?,?)');
    foreach ($students as $nis) {
        $check->execute([(string)$nis]);
        if (!(int)$check->fetchColumn()) {
            $insert->execute([(string)$nis, password_hash('password', PASSWORD_BCRYPT), 'siswa', (string)$nis, 'aktif']);
        }
    }
    // Auto-create jurnal_kelas table with official SMKN 2 Magelang columns
    $pdo->exec("CREATE TABLE IF NOT EXISTS `jurnal_kelas` (
        `id_jurnal` INT NOT NULL AUTO_INCREMENT,
        `id_jadwal` INT NOT NULL,
        `id_guru` INT NOT NULL,
        `id_kelas` INT NOT NULL,
        `id_mapel` INT NOT NULL,
        `tanggal` DATE NOT NULL,
        `pertemuan_ke` INT NOT NULL DEFAULT 1,
        `jam_ke` VARCHAR(30) DEFAULT NULL,
        `guru_pengganti` VARCHAR(100) DEFAULT NULL,
        `materi` TEXT NOT NULL,
        `kegiatan` TEXT DEFAULT NULL,
        `catatan` TEXT DEFAULT NULL,
        `refleksi` TEXT DEFAULT NULL,
        `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id_jurnal`),
        UNIQUE KEY `uq_jurnal_jadwal_tgl` (`id_jadwal`, `tanggal`),
        KEY `idx_jurnal_tanggal` (`tanggal`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    // Ensure new columns in jurnal_kelas
    try {
        $pdo->exec("ALTER TABLE jurnal_kelas ADD COLUMN IF NOT EXISTS pertemuan_ke INT NOT NULL DEFAULT 1");
        $pdo->exec("ALTER TABLE jurnal_kelas ADD COLUMN IF NOT EXISTS guru_pengganti VARCHAR(100) DEFAULT NULL");
        $pdo->exec("ALTER TABLE jurnal_kelas ADD COLUMN IF NOT EXISTS refleksi TEXT DEFAULT NULL");
    } catch (Throwable) {}

    // Auto-create bobot_penilaian table (flexible weights: Tugas 30%, UTS 30%, UAS 40% default)
    $pdo->exec("CREATE TABLE IF NOT EXISTS `bobot_penilaian` (
        `id_bobot` INT NOT NULL AUTO_INCREMENT,
        `id_guru` INT DEFAULT NULL,
        `id_mapel` INT DEFAULT NULL,
        `id_kelas` INT DEFAULT NULL,
        `bobot_tugas` DECIMAL(5,2) NOT NULL DEFAULT 30.00,
        `bobot_uts` DECIMAL(5,2) NOT NULL DEFAULT 30.00,
        `bobot_uas` DECIMAL(5,2) NOT NULL DEFAULT 40.00,
        `bobot_praktik` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        `nama_ekstra` VARCHAR(50) DEFAULT NULL,
        `bobot_ekstra` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id_bobot`),
        UNIQUE KEY `uq_bobot_guru_mapel_kelas` (`id_guru`, `id_mapel`, `id_kelas`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Ensure columns in nilai for praktik / ekstra
    try {
        $pdo->exec("ALTER TABLE nilai ADD COLUMN IF NOT EXISTS nilai_praktik DECIMAL(5,2) NOT NULL DEFAULT 0.00");
        $pdo->exec("ALTER TABLE nilai ADD COLUMN IF NOT EXISTS nilai_ekstra DECIMAL(5,2) NOT NULL DEFAULT 0.00");
    } catch (Throwable) {}

    // Auto-create ekstrakurikuler table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `ekstrakurikuler` (
        `id_ekskul` INT NOT NULL AUTO_INCREMENT,
        `nama_ekskul` VARCHAR(100) NOT NULL,
        `pembina` VARCHAR(100) DEFAULT NULL,
        `id_guru_pembina` INT DEFAULT NULL,
        `deskripsi` TEXT DEFAULT NULL,
        PRIMARY KEY (`id_ekskul`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Auto-create nilai_ekskul table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `nilai_ekskul` (
        `id_nilai_ekskul` INT NOT NULL AUTO_INCREMENT,
        `nis` VARCHAR(15) NOT NULL,
        `id_ekskul` INT NOT NULL,
        `id_tahun_ajaran` INT NOT NULL,
        `predikat` ENUM('Sangat Baik','Baik','Cukup','Kurang') NOT NULL DEFAULT 'Baik',
        `keterangan` VARCHAR(255) DEFAULT NULL,
        PRIMARY KEY (`id_nilai_ekskul`),
        UNIQUE KEY `uq_ekskul_siswa_tahun` (`nis`, `id_ekskul`, `id_tahun_ajaran`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

function get_bobot_penilaian(?int $id_guru = null, ?int $id_mapel = null, ?int $id_kelas = null): array {
    $pdo = db();
    $default = [
        'bobot_tugas' => 30.00,
        'bobot_uts' => 30.00,
        'bobot_uas' => 40.00,
        'bobot_praktik' => 0.00,
        'nama_ekstra' => 'Praktik/Proyek',
        'bobot_ekstra' => 0.00,
    ];
    if ($id_guru !== null && $id_mapel !== null) {
        $q = $pdo->prepare('SELECT * FROM bobot_penilaian WHERE id_guru=? AND id_mapel=? AND (id_kelas=? OR id_kelas IS NULL) ORDER BY id_kelas DESC LIMIT 1');
        $q->execute([$id_guru, $id_mapel, $id_kelas]);
        $row = $q->fetch();
        if ($row) {
            return [
                'bobot_tugas' => (float)$row['bobot_tugas'],
                'bobot_uts' => (float)$row['bobot_uts'],
                'bobot_uas' => (float)$row['bobot_uas'],
                'bobot_praktik' => (float)$row['bobot_praktik'],
                'nama_ekstra' => $row['nama_ekstra'] ?: 'Praktik/Proyek',
                'bobot_ekstra' => (float)$row['bobot_ekstra'],
            ];
        }
    }
    // Check mapel-level default or global default
    if ($id_mapel !== null) {
        $q = $pdo->prepare('SELECT * FROM bobot_penilaian WHERE id_guru IS NULL AND id_mapel=? LIMIT 1');
        $q->execute([$id_mapel]);
        $row = $q->fetch();
        if ($row) {
            return [
                'bobot_tugas' => (float)$row['bobot_tugas'],
                'bobot_uts' => (float)$row['bobot_uts'],
                'bobot_uas' => (float)$row['bobot_uas'],
                'bobot_praktik' => (float)$row['bobot_praktik'],
                'nama_ekstra' => $row['nama_ekstra'] ?: 'Praktik/Proyek',
                'bobot_ekstra' => (float)$row['bobot_ekstra'],
            ];
        }
    }
    return $default;
}

function hitung_nilai_akhir_berbobot(float $tugas, float $uts, float $uas, float $praktik = 0.0, float $ekstra = 0.0, ?array $bobot = null): float {
    if (!$bobot) {
        $bobot = ['bobot_tugas' => 30.0, 'bobot_uts' => 30.0, 'bobot_uas' => 40.0, 'bobot_praktik' => 0.0, 'bobot_ekstra' => 0.0];
    }
    $total_bobot = (float)($bobot['bobot_tugas'] + $bobot['bobot_uts'] + $bobot['bobot_uas'] + ($bobot['bobot_praktik'] ?? 0) + ($bobot['bobot_ekstra'] ?? 0));
    if ($total_bobot <= 0) $total_bobot = 100.0;

    $score = ($tugas * (float)$bobot['bobot_tugas']) +
             ($uts * (float)$bobot['bobot_uts']) +
             ($uas * (float)$bobot['bobot_uas']) +
             ($praktik * (float)($bobot['bobot_praktik'] ?? 0)) +
             ($ekstra * (float)($bobot['bobot_ekstra'] ?? 0));

    return round($score / $total_bobot, 2);
}

function hitung_predikat_kkm(float $nilai, float $kkm = DEFAULT_KKM): array {
    if ($kkm <= 0 || $kkm > 100) $kkm = DEFAULT_KKM;
    $interval = (100.0 - $kkm) / 3.0;
    $b_min = $kkm + $interval;
    $a_min = $kkm + (2.0 * $interval);

    if ($nilai >= $a_min) {
        return ['predikat' => 'A', 'keterangan' => 'Sangat Baik', 'status' => 'Tuntas', 'badge' => 'success'];
    } elseif ($nilai >= $b_min) {
        return ['predikat' => 'B', 'keterangan' => 'Baik', 'status' => 'Tuntas', 'badge' => 'primary'];
    } elseif ($nilai >= $kkm) {
        return ['predikat' => 'C', 'keterangan' => 'Cukup', 'status' => 'Tuntas', 'badge' => 'info'];
    } else {
        return ['predikat' => 'D', 'keterangan' => 'Kurang / Perlu Remedial', 'status' => 'Belum Tuntas', 'badge' => 'danger'];
    }
}

function e(mixed $value): string { return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8'); }
function url(string $path = ''): string { return rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/'), '/').'/'.$path; }
function redirect(string $path): never { header('Location: '.$path); exit; }
function flash(string $type, string $message): void { $_SESSION['flash'][] = compact('type','message'); }
function flashes(): array { $items = $_SESSION['flash'] ?? []; unset($_SESSION['flash']); return $items; }
function csrf_token(): string { return $_SESSION['csrf'] ??= bin2hex(random_bytes(32)); }
function csrf_field(): string { return '<input type="hidden" name="csrf_token" value="'.e(csrf_token()).'">'; }
function verify_csrf(): void { if (!hash_equals($_SESSION['csrf'] ?? '', $_POST['csrf_token'] ?? '')) { http_response_code(419); exit('CSRF token tidak valid.'); } }
function current_user(): ?array { return $_SESSION['user'] ?? null; }
function role_label(string $role): string { return ['admin'=>'Administrator','guru'=>'Guru','kepala_sekolah'=>'Kepala Sekolah','siswa'=>'Siswa'][$role] ?? $role; }
function dashboard_path(string $role): string { return ['admin'=>'admin/index.php','guru'=>'guru/index.php','kepala_sekolah'=>'kepsek/index.php','siswa'=>'siswa/index.php'][$role] ?? 'auth/login.php'; }
