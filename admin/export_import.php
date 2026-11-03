<?php
require_once '../config/auth.php';
require_role('admin');
$pdo = db();
$error = '';
$success = '';

// Helper membaca XLSX sederhana via ZipArchive & XML
function parse_excel_rows(string $filePath): array {
    $zip = new ZipArchive();
    if ($zip->open($filePath) !== true) {
        throw new RuntimeException("Gagal membuka file Excel.");
    }
    // Baca Shared Strings
    $sharedStrings = [];
    $ssXml = $zip->getFromName('xl/sharedStrings.xml');
    if ($ssXml !== false) {
        $xml = simplexml_load_string($ssXml);
        foreach ($xml->si as $val) {
            $text = '';
            if (isset($val->t)) {
                $text = (string)$val->t;
            } elseif (isset($val->r)) {
                foreach ($val->r as $r) {
                    $text .= (string)$r->t;
                }
            }
            $sharedStrings[] = $text;
        }
    }
    // Baca Sheet 1
    $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
    if ($sheetXml === false) {
        $zip->close();
        throw new RuntimeException("Sheet 1 tidak ditemukan di dalam file Excel.");
    }
    $xml = simplexml_load_string($sheetXml);
    $rows = [];
    foreach ($xml->sheetData->row as $r) {
        $rowVals = [];
        foreach ($r->c as $c) {
            $t = (string)$c['t'];
            $v = isset($c->v) ? (string)$c->v : '';
            if ($t === 's' && is_numeric($v)) {
                $val = $sharedStrings[(int)$v] ?? '';
            } else {
                $val = $v;
            }
            $rowVals[] = trim($val);
        }
        if (!empty(array_filter($rowVals))) {
            $rows[] = $rowVals;
        }
    }
    $zip->close();
    return $rows;
}

// 1. Ekspor Data Siswa / Guru ke CSV
if (isset($_GET['export'])) {
    $type = $_GET['export'];
    if ($type === 'siswa') {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="data_siswa_' . date('Ymd_His') . '.csv"');
        $out = fopen('php://output', 'w');
        fputcsv($out, ['NIS', 'Nama Siswa', 'Jenis Kelamin', 'Kelas', 'Tanggal Lahir', 'Alamat']);
        $q = $pdo->query('SELECT s.nis, s.nama_siswa, s.jenis_kelamin, k.nama_kelas, s.tanggal_lahir, s.alamat 
                          FROM siswa s LEFT JOIN kelas k ON k.id_kelas = s.id_kelas ORDER BY k.nama_kelas, s.nama_siswa');
        while ($r = $q->fetch()) {
            fputcsv($out, [$r['nis'], $r['nama_siswa'], $r['jenis_kelamin'], $r['nama_kelas'], $r['tanggal_lahir'], $r['alamat']]);
        }
        fclose($out);
        exit;
    } elseif ($type === 'guru') {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="data_guru_' . date('Ymd_His') . '.csv"');
        $out = fopen('php://output', 'w');
        fputcsv($out, ['NIP', 'Nama Guru', 'Email', 'No HP']);
        $q = $pdo->query('SELECT nip, nama_guru, email, no_hp FROM guru ORDER BY nama_guru');
        while ($r = $q->fetch()) {
            fputcsv($out, [$r['nip'], $r['nama_guru'], $r['email'], $r['no_hp']]);
        }
        fclose($out);
        exit;
    }
}

// 2. Import Upload Excel / CSV
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    verify_csrf();
    $target = $_POST['target_import'] ?? 'siswa';
    if (!isset($_FILES['file_data']) || $_FILES['file_data']['error'] !== UPLOAD_ERR_OK) {
        $error = 'Silakan pilih file Excel (.xlsx) atau CSV yang valid untuk diunggah.';
    } else {
        $tmpPath = $_FILES['file_data']['tmp_name'];
        $origName = $_FILES['file_data']['name'];
        $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));

        try {
            $parsedRows = [];
            if ($ext === 'csv') {
                if (($h = fopen($tmpPath, 'r')) !== false) {
                    while (($data = fgetcsv($h, 1000, ',')) !== false) {
                        $parsedRows[] = $data;
                    }
                    fclose($h);
                }
            } elseif ($ext === 'xlsx') {
                $parsedRows = parse_excel_rows($tmpPath);
            } else {
                throw new RuntimeException('Format file tidak didukung. Harap upload file berekstensi .xlsx atau .csv');
            }

            if (empty($parsedRows)) {
                throw new RuntimeException('File kosong atau tidak dapat dibaca.');
            }

            // Cache ID Kelas
            $kelasMap = [];
            foreach ($pdo->query('SELECT id_kelas, nama_kelas FROM kelas')->fetchAll() as $k) {
                $clean = strtoupper(trim(str_replace(' ', '', $k['nama_kelas'])));
                $kelasMap[$clean] = (int)$k['id_kelas'];
            }

            // Default password hash
            $defPass = password_hash('password', PASSWORD_BCRYPT);
            $inserted = 0;

            if ($target === 'siswa') {
                // Mencari header atau langsung baris data
                $stmtInsertSiswa = $pdo->prepare('INSERT INTO siswa (nis, nama_siswa, jenis_kelamin, id_kelas) 
                    VALUES (?, ?, ?, ?) 
                    ON DUPLICATE KEY UPDATE nama_siswa = VALUES(nama_siswa), jenis_kelamin = VALUES(jenis_kelamin), id_kelas = VALUES(id_kelas)');
                
                $stmtUser = $pdo->prepare('INSERT IGNORE INTO users (username, password, role, id_referensi, status) VALUES (?, ?, "siswa", ?, "aktif")');

                foreach ($parsedRows as $r) {
                    // Cari baris yang berisi NIS (angka)
                    $nis = '';
                    $nama = '';
                    $jk = 'L';
                    $kelasId = 1;

                    // Deteksi pola kolom
                    // Jika format seperti "data kelas 10 clean.xlsx": [absen, nis, nama, kelamin, kelas]
                    if (isset($r[1]) && is_numeric($r[1]) && strlen($r[1]) >= 4) {
                        $nis = trim($r[1]);
                        $nama = trim($r[2] ?? '');
                        $jk = strtoupper(substr(trim($r[3] ?? 'L'), 0, 1)) ?: 'L';
                        $namaKelasRaw = strtoupper(trim(str_replace(' ', '', $r[4] ?? '')));
                        $kelasId = $kelasMap[$namaKelasRaw] ?? 1;
                    } elseif (isset($r[0]) && is_numeric($r[0]) && strlen($r[0]) >= 4) { // NIS di kolom 0
                        $nis = trim($r[0]);
                        $nama = trim($r[1] ?? '');
                        $jk = strtoupper(substr(trim($r[2] ?? 'L'), 0, 1)) ?: 'L';
                        $namaKelasRaw = strtoupper(trim(str_replace(' ', '', $r[3] ?? '')));
                        $kelasId = $kelasMap[$namaKelasRaw] ?? 1;
                    }

                    if ($nis && $nama) {
                        $stmtInsertSiswa->execute([$nis, $nama, in_array($jk, ['L', 'P']) ? $jk : 'L', $kelasId]);
                        $stmtUser->execute([$nis, $defPass, $nis]);
                        $inserted++;
                    }
                }
                $success = "Berhasil mengimpor/memperbarui $inserted data siswa dan otomatis membuat akun login (Password default: 'password').";
            } elseif ($target === 'guru') {
                $stmtGuru = $pdo->prepare('INSERT INTO guru (nip, nama_guru, email, no_hp) VALUES (?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE nama_guru = VALUES(nama_guru), email = VALUES(email), no_hp = VALUES(no_hp)');
                
                foreach ($parsedRows as $r) {
                    $nip = trim($r[0] ?? '');
                    $nama = trim($r[1] ?? '');
                    $email = trim($r[2] ?? '') ?: null;
                    $hp = trim($r[3] ?? '') ?: null;

                    if ($nip && $nama && strtolower($nip) !== 'nip') {
                        $stmtGuru->execute([$nip, $nama, $email, $hp]);
                        $inserted++;
                    }
                }
                $success = "Berhasil mengimpor/memperbarui $inserted data guru ke database.";
            }
        } catch (Throwable $e) {
            $error = 'Gagal memproses file: ' . $e->getMessage();
        }
    }
}

$page_title = 'Export & Import Data (Excel / CSV)';
require '../includes/header.php';
require '../includes/sidebar.php';
require '../includes/flash.php';
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h2>Export & Import Data Excel / CSV</h2>
</div>

<?php if ($error): ?>
    <div class="alert alert-danger"><?= e($error) ?></div>
<?php endif; ?>
<?php if ($success): ?>
    <div class="alert alert-success"><?= e($success) ?></div>
<?php endif; ?>

<div class="row g-4">
    <!-- Ekspor Data -->
    <div class="col-lg-6">
        <div class="card p-4 shadow-sm h-100">
            <h4 class="mb-3 text-primary">📥 Export Data (Unduh Excel / CSV)</h4>
            <p class="text-muted">Unduh seluruh data yang tersimpan di sistem ke dalam format tabel Excel / CSV untuk kebutuhan arsip, laporan, atau backup.</p>

            <div class="list-group mb-3">
                <div class="list-group-item d-flex justify-content-between align-items-center py-3">
                    <div>
                        <h6 class="mb-1">Data Seluruh Siswa</h6>
                        <small class="text-muted">Termasuk NIS, Nama, Jenis Kelamin, Kelas, & Alamat</small>
                    </div>
                    <a href="?export=siswa" class="btn btn-outline-primary btn-sm">Download CSV / Excel</a>
                </div>

                <div class="list-group-item d-flex justify-content-between align-items-center py-3">
                    <div>
                        <h6 class="mb-1">Data Seluruh Guru</h6>
                        <small class="text-muted">Termasuk NIP, Nama Lengkap, Email, & No HP</small>
                    </div>
                    <a href="?export=guru" class="btn btn-outline-success btn-sm">Download CSV / Excel</a>
                </div>

                <div class="list-group-item d-flex justify-content-between align-items-center py-3">
                    <div>
                        <h6 class="mb-1">Rekap Nilai Siswa</h6>
                        <small class="text-muted">Download nilai per kelas & mapel atau cetak rapor PDF</small>
                    </div>
                    <a href="export_nilai.php" class="btn btn-outline-info btn-sm">Buka Export Nilai</a>
                </div>
            </div>
        </div>
    </div>

    <!-- Upload / Import Data -->
    <div class="col-lg-6">
        <div class="card p-4 shadow-sm h-100 border-success">
            <h4 class="mb-3 text-success">📤 Upload & Import File Excel (.xlsx / .csv)</h4>
            <p class="text-muted">Unggah data siswa atau guru dalam jumlah banyak secara instan. Sistem akan otomatis memasukkannya ke database dan membuatkan akun login.</p>

            <form method="post" enctype="multipart/form-data" class="mt-3">
                <?= csrf_field() ?>
                <input type="hidden" name="action" value="import_data">

                <div class="mb-3">
                    <label class="form-label fw-bold">Jenis Data yang Diimpor</label>
                    <select class="form-select" name="target_import" required>
                        <option value="siswa">Data Siswa (Format: NIS, Nama, Kelamin, Kelas)</option>
                        <option value="guru">Data Guru (Format: NIP, Nama, Email, No HP)</option>
                    </select>
                </div>

                <div class="mb-3">
                    <label class="form-label fw-bold">Pilih File (.xlsx atau .csv)</label>
                    <input class="form-control" type="file" name="file_data" accept=".xlsx,.csv" required>
                    <div class="form-text">Mendukung format file Excel .xlsx langsung tanpa perlu convert!</div>
                </div>

                <div class="alert alert-info py-2 small mb-3">
                    ✨ <strong>Fitur Otomatis:</strong> Saat data siswa diupload, sistem akan langsung membuatkan akun siswa dengan username berupa <strong>NIS</strong> dan kata sandi default <strong>password</strong>.
                </div>

                <button type="submit" class="btn btn-success btn-lg w-100 fw-bold">
                    🚀 Proses & Impor ke Database
                </button>
            </form>
        </div>
    </div>
</div>

<?php require '../includes/footer.php'; ?>
