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
