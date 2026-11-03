<?php
declare(strict_types=1);

const APP_NAME = 'SIA SMKN 2 Magelang';
const DEFAULT_KKM = 75;

// Credentials must come from the process environment or a private file outside the web tree.
$appSettings = [];
$settingsPath = getenv('SIA_CONFIG_FILE');
if ($settingsPath !== false && $settingsPath !== '') {
    $resolved = realpath($settingsPath);
    $projectRoot = realpath(__DIR__.'/..');
    if (!$resolved || !is_file($resolved) || str_starts_with($resolved, $projectRoot.DIRECTORY_SEPARATOR)) {
        throw new RuntimeException('Konfigurasi privat tidak tersedia atau berada di direktori aplikasi.');
    }
    $appSettings = json_decode(file_get_contents($resolved), true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($appSettings)) throw new RuntimeException('Konfigurasi privat tidak valid.');
}
function app_setting(string $key, string $default = ''): string {
    global $appSettings;
    $value = getenv('SIA_'.$key);
    return $value !== false ? $value : (string)($appSettings[$key] ?? $default);
}
define('DB_HOST', app_setting('DB_HOST', '127.0.0.1'));
define('DB_PORT', (int)app_setting('DB_PORT', '3306'));
define('DB_NAME', app_setting('DB_NAME'));
define('DB_USER', app_setting('DB_USER'));
define('DB_PASS', app_setting('DB_PASS'));
define('DB_SOCKET', app_setting('DB_SOCKET'));
date_default_timezone_set('Asia/Jakarta');

if (PHP_SAPI !== 'cli' && session_status() !== PHP_SESSION_ACTIVE) {
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_name(app_setting('SESSION_NAME', 'PHPSESSID'));
    if (app_setting('SESSION_PATH') !== '') session_save_path(app_setting('SESSION_PATH'));
    session_set_cookie_params([
        'httponly' => true, 'samesite' => 'Lax',
        'secure' => app_setting('COOKIE_SECURE', '0') === '1' || (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'), 'path' => '/',
    ]);
    session_start();
}

function db(): PDO {
    static $pdo;
    if (!$pdo) {
        if (DB_NAME === '' || DB_USER === '') throw new RuntimeException('Konfigurasi database belum tersedia.');
        if (strtolower(DB_USER) === 'root') throw new RuntimeException('Akun database aplikasi harus non-root.');
        $transport = DB_SOCKET !== '' ? 'unix_socket='.DB_SOCKET : 'host='.DB_HOST.';port='.DB_PORT;
        $pdo = new PDO('mysql:'.$transport.';dbname='.DB_NAME.';charset=utf8mb4', DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_TIMEOUT => 3,
        ]);
    }
    return $pdo;
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
        $q = $pdo->prepare('SELECT * FROM bobot_penilaian WHERE id_guru=? AND id_mapel=? AND (id_kelas=? OR id_kelas IS NULL) ORDER BY id_kelas DESC LIMIT 2');
        $q->execute([$id_guru, $id_mapel, $id_kelas]);
        $rows=$q->fetchAll();if(count($rows)>1 && (string)$rows[0]['id_kelas']===(string)$rows[1]['id_kelas'])throw new InputError('Bobot pada cakupan yang sama duplikat; perlu peninjauan.');$row=$rows[0]??null;
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
        $q = $pdo->prepare('SELECT * FROM bobot_penilaian WHERE id_guru IS NULL AND id_mapel=? AND id_kelas IS NULL ORDER BY id_bobot LIMIT 2');
        $q->execute([$id_mapel]);
        $rows=$q->fetchAll();if(count($rows)>1)throw new InputError('Default bobot mata pelajaran duplikat; perlu peninjauan.');$row=$rows[0]??null;
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
    $q=$pdo->query('SELECT * FROM bobot_penilaian WHERE id_guru IS NULL AND id_mapel IS NULL AND id_kelas IS NULL ORDER BY id_bobot LIMIT 2');$rows=$q->fetchAll();
    if(count($rows)>1)throw new InputError('Default bobot duplikat memerlukan peninjauan.');
    if($rows){$resolved=array_intersect_key($rows[0],$default)+$default;foreach($resolved as $key=>$value)if(str_starts_with($key,'bobot_'))$resolved[$key]=(float)$value;return $resolved;}
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

function e(mixed $value): string { return htmlspecialchars(is_scalar($value)||$value===null?(string)$value:'', ENT_QUOTES, 'UTF-8'); }
function url(string $path = ''): string { return rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/'), '/').'/'.$path; }
function redirect(string $path): never { header('Location: '.$path); exit; }
function flash(string $type, string $message): void { $_SESSION['flash'][] = compact('type','message'); }
function flashes(): array { $items = $_SESSION['flash'] ?? []; unset($_SESSION['flash']); return $items; }
function csrf_token(): string { return $_SESSION['csrf'] ??= bin2hex(random_bytes(32)); }
function csrf_field(): string { return '<input type="hidden" name="csrf_token" value="'.e(csrf_token()).'">'; }
function verify_csrf(): void {
    $expected = $_SESSION['csrf'] ?? null;
    $provided = $_POST['csrf_token'] ?? null;
    if (!is_string($expected) || $expected === '' || !is_string($provided) || $provided === '' || !hash_equals($expected, $provided)) {
        http_response_code(419); exit('CSRF token tidak valid.');
    }
}
function current_user(): ?array { return function_exists('authenticated_user') ? authenticated_user() : null; }
function role_label(string $role): string { return ['admin'=>'Administrator','guru'=>'Guru','kepala_sekolah'=>'Kepala Sekolah','siswa'=>'Siswa'][$role] ?? $role; }
function dashboard_path(string $role): string {
    if(app_setting('ACADEMIC_WORKFLOWS')==='1' && in_array($role,['admin','guru','kepala_sekolah','siswa'],true))return 'academic/index.php';
    return ['admin'=>'admin/index.php','guru'=>'guru/index.php','kepala_sekolah'=>'kepsek/index.php','siswa'=>'siswa/index.php'][$role] ?? 'auth/login.php';
}
