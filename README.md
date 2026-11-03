# Sistem Informasi Akademik SMK Negeri 2 Magelang

Website akademik responsif untuk **Admin, Guru Mapel, Guru Piket, dan Kepala Sekolah**, dengan akses siswa opsional. Dibuka melalui browser komputer maupun smartphone, menggunakan tema putih–hitam.

Backend memakai **PHP native modular dan MariaDB**. Perintah **`pnpm dev` menjalankan server PHP**; Node.js/pnpm adalah alat bantu development, bukan pengganti backend. Tidak memerlukan Python, Docker, atau aplikasi APK untuk menjalankan website lokal.

## Mulai di komputer baru

### 1. Siapkan kebutuhan

| Kebutuhan | Keterangan |
|---|---|
| Git | Mengambil kode repository |
| Node.js 18+ dan pnpm 9+ | Menjalankan perintah development |
| PHP CLI 8.1+ | Ekstensi `pdo_mysql`, `mbstring`, `dom`, dan `zip` |
| MariaDB lokal | Database development terpisah, dengan skema akademik release ini |

### 2. Clone dan buat konfigurasi lokal

```bash
git clone --branch main https://github.com/Muflih2025/sistem_akademik.git
cd sistem_akademik
pnpm install
pnpm dev:setup
```

Setup menampilkan lokasi file konfigurasi privat. Default Linux/macOS:

```text
~/.config/sia-akademik/local.json
```

Edit file tersebut menggunakan editor lokal:

| Key | Isi |
|---|---|
| `DB_HOST` / `DB_PORT` | Host dan port MariaDB lokal; gunakan `DB_SOCKET` bila memakai Unix socket |
| `DB_NAME` | Database development dengan nama bertanda `local`, `dev`, `testing`, atau `staging` |
| `DB_USER` / `DB_PASS` | Akun runtime non-root untuk database development |
| `APP_ENV` | Pertahankan `development` untuk konfigurasi lokal baru |
| `ALLOW_SCHEMA_CHANGES` | Pertahankan string `"0"` |

Semua nilai konfigurasi berupa string. Pengaturan sesi, log, dan fitur lainnya sudah disediakan template. **Konfigurasi tetap di luar repository**, bukan `.env` dalam folder aplikasi. Setup tidak menimpa file existing.

**Database dan akun testing harus disiapkan terlebih dahulu.** `pnpm install` memasang tooling; `pnpm dev:setup` hanya membuat template konfigurasi. Keduanya tidak membuat tabel, mengimpor data, membuat akun, atau mereset database. Untuk database kosong, minta provisioning skema dan data sintetis yang diizinkan dari pengelola development. Clone Git tidak menyalin database komputer pengembang.

### 3. Periksa dan jalankan

```bash
pnpm dev:check
pnpm dev
```

Buka **http://127.0.0.1:18125/auth/login.php**. Tekan **Ctrl+C** pada terminal untuk berhenti.

Setelah setup pertama selesai, penggunaan sehari-hari cukup:

```bash
pnpm dev
```

Jika port 18125 sedang dipakai:

```bash
pnpm dev --port 18126
```

Lalu buka **http://127.0.0.1:18126/auth/login.php**. Launcher tidak menghentikan server lain dan menolak port layanan aktif 8085. Cookie session dipisahkan per port agar login pada dua server development tidak saling menimpa.

### Perintah yang tersedia

| Perintah | Fungsi |
|---|---|
| `pnpm dev` | Menjalankan website PHP pada localhost |
| `pnpm dev --port 18126` | Memilih port development lain |
| `pnpm dev:setup` | Membuat template konfigurasi privat tanpa menimpa file existing |
| `pnpm dev:check` | Memeriksa PHP, konfigurasi, koneksi dan tabel secara baca-saja |
| `pnpm dev --help` | Menampilkan bantuan launcher |

Panduan Windows, konfigurasi existing melalui `SIA_CONFIG_FILE`, executable PHP dan troubleshooting: **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)**. Perubahan PHP/CSS/JS terlihat setelah refresh browser; tidak ada proses build frontend atau hot module replacement.

## Modul dan pembagian tugas

Pilih **modul utama di atas**, kemudian fitur pada **sidebar kiri**. Di smartphone, buka **Menu fitur**; navigasi bawah menyediakan akses cepat. Menu mengikuti peran/penugasan, sedangkan izin setiap operasi tetap diperiksa di server.

| Pengguna | Fungsi |
|---|---|
| **Admin** | Akun/role, master siswa/guru/kelas/jurusan/mapel/ruang, bulk Excel, jadwal, periode/penugasan, jam belajar, kalender, kenaikan kelas/alumni, serta verifikasi dan penerbitan rapor |
| **Guru Mapel** | Absensi sesi, jurnal kelas dan agenda harian dari pertemuan yang sama, input/rekap nilai, cetak dan ekspor sesuai penugasan |
| **Guru Piket** | Pantau kelas yang sudah/belum mengisi, periksa ketidakhadiran, rekonsiliasi absensi harian dan unduh rekap sesuai cakupan izin |
| **Kepala Sekolah** | Lihat jadwal guru per jam, kelas/ruang, status jurnal, serta supervisi kehadiran, nilai dan rapor |
| **Siswa, opsional** | Lihat kehadiran dan rapor terbit miliknya sendiri |

Guru Piket adalah **penugasan tambahan untuk akun guru**, bukan hak Admin. Koreksi data terkonfirmasi memerlukan permission yang sesuai, alasan dan audit trail. Pemantauan Kepala Sekolah bersumber dari jadwal/jurnal, bukan pelacakan lokasi fisik guru.

### Absensi, jurnal, dan agenda

Admin menetapkan periode, keanggotaan kelas bertanggal dan penugasan guru terverifikasi. Guru memilih jadwal/tanggal yang diizinkan, memeriksa daftar siswa dari database, lalu menyimpan absensi bersama materi, TP/ATP, kegiatan, refleksi, tindak lanjut dan catatan.

Status absensi: **H — Hadir, S — Sakit, I — Izin, A — Alpa**, serta **Belum Dikonfirmasi**. Status Belum tidak dihitung sebagai Hadir atau Alpa. Pencarian dan pagination mempertahankan isian seluruh kelas.

Satu pertemuan menghasilkan jurnal kelas, agenda guru dan matriks absensi sesi. Guru Piket memeriksa bukti sesi untuk menetapkan rekap harian; beberapa sesi pada satu tanggal tidak dihitung sebagai beberapa hari. Pengisi dan koreksi dicatat pada audit.

### Nilai, rapor, dan wali kelas

Nilai mengikuti mapel yang diampu dan bobot berversi. Rapor menggunakan snapshot berstatus draft/verifikasi/terbit; nilai tersedia tidak otomatis berarti rapor diterbitkan. Perubahan nilai tidak mengubah arsip rapor terbit secara diam-diam.

**Demo saat ini memakai wali kelas sebagai informasi penanggung jawab.** Pembuatan, verifikasi dan penerbitan rapor dilakukan Admin; pemeriksaan wali bukan langkah wajib pada mode ini. Satu akun guru dapat mempunyai penugasan mapel dan wali, tetapi hak mengajar tetap berasal dari penugasan mapelnya.

### Impor, ekspor, dan PDF

Bulk Upload Excel tersedia pada master Admin dengan template, preview dan konfirmasi. Modul akademik yang relevan menyediakan impor/ekspor, matriks, CSV, Excel dan cetak.

Download PDF memakai worker Node/Playwright dan Chromium lokal yang perlu dikonfigurasi terpisah. `pnpm dev` tidak mengunduh browser atau memasang library sistem otomatis. Tombol **Cetak** dapat menggunakan dialog browser untuk menyimpan PDF. Detail: [dependensi PDF](docs/DEVELOPMENT.md#pdf-dan-dependensi-opsional).

## Akun dan pengujian manual

**Hanya untuk database demo development yang telah disediakan**, akun berikut memakai password **`password`**:

| Username | Peran contoh |
|---|---|
| `uji_admin` | Admin |
| `uji_guru` | Guru mapel utama |
| `uji_guru_lain` | Guru mapel pembanding |
| `uji_piket` | Guru Piket tanpa hak koreksi terkonfirmasi secara default |
| `uji_kepsek` | Kepala Sekolah |
| `uji_wali` | Guru dengan informasi penugasan wali kelas |
| `uji_siswa` | Siswa contoh, opsional |

Akun tersebut **tidak dibuat otomatis pada komputer yang baru clone**. Gunakan akun dari pengelola database development Anda. Password contoh ini bukan credential database atau akses produksi.

Simulasi existing menggunakan **26–30 Oktober 2026**. Pilih tanggal sesuai jadwal pada panduan; tidak setiap tanggal mempunyai penugasan atau jurnal. Admin mengelola penugasan dan izin Piket melalui **Akademik → Periode & Penugasan**.

Langkah per peran, tautan contoh, hasil yang diharapkan dan checklist manual tersedia di **[test.md](test.md)** dan **[docs/SIMULASI_5_HARI.md](docs/SIMULASI_5_HARI.md)**.

Setelah **Simpan tugas Guru Piket**, tugas terbuka kembali beserta ID dan isiannya. Untuk tugas existing, pilih **Edit / cabut izin** pada daftar Tugas Guru Piket; gunakan **Tambah tugas Guru Piket** hanya untuk penugasan baru.

## Struktur proyek

```text
public/                Document root dan router allowlist
academic/              Halaman/modul akademik
config/academic/       Layanan dan validasi domain akademik
admin/                 Master data, akun, jadwal dan bulk upload
guru/, kepsek/, siswa/ Halaman per peran dan kompatibilitas rute lama
includes/              Layout, navigasi dan komponen CRUD
assets/                CSS, JavaScript dan aset vendor lokal
database/migrations/   Perubahan skema melalui deployment terkontrol
ops/                   Launcher development dan alat operator
tests/                 Pengujian HTTP, browser dan integritas
docs/                  Panduan, laporan dan bukti pengujian
```

`public/` wajib menjadi document root dan `public/index.php` wajib menjadi router. Launcher sudah menetapkannya. Jangan menjalankan server dari root repository yang mengekspos konfigurasi atau berkas internal.

## Pengujian dan operasi

Hasil merge launcher/UI pada 3 November 2026: **16 skenario terfokus PASS, 0 FAIL**, mencakup startup PHP melalui pnpm, login/logout, navigasi lintas peran, tampilan 320–1440px, CSRF/RBAC/IDOR, proteksi berkas, penghentian server dan integritas database. Hasil ini bukan klaim seluruh suite proyek dijalankan ulang.

| Dokumen | Isi |
|---|---|
| [Merge main dan pnpm](docs/MERGE_MAIN_PNPM_2026-11-03.md) | Resolusi merge dan hasil validasi |
| [Bukti launcher/UI](docs/evidence/PNPM_MAIN_TEST_RESULTS.json) | Hasil pengujian tersanitasi |
| [Navigasi modul/sidebar](docs/NAVIGASI_MODUL_SIDEBAR_2026-11-03.md) | Pengelompokan fitur dan pengujian responsif |
| [Perbaikan simpan Piket](docs/BUGFIX_SIMPAN_GURU_PIKET_2026-11-03.md) | Simpan, edit, reload, validasi dan audit |
| [Matriks fitur](docs/MATRIKS_FUNGSI_AKADEMIK.md) | Cakupan dan keterbatasan per checkpoint |

Gunakan akun/fixture khusus development untuk tes yang menulis data. Suite besar dapat membuat banyak fixture; jangan menjalankannya sekadar untuk membuka demo atau saat database sedang dipakai uji manual.

Catatan audit/deployment historis: [R0](docs/R0_OPERATIONS.md), [R1](docs/R1_OPERATIONS.md), dan [R1.5](docs/R1_5_OPERATIONS.md). Script operator di sana memiliki prasyarat lingkungan sendiri dan bukan langkah wajib `pnpm dev`.

Merge/push ke `main` **tidak melakukan deployment, migration, atau restart layanan aktif 8085**. Konfigurasi privat, backup, log dan data sekolah tidak ikut repository. Database existing dan histori tidak boleh di-reset untuk menjalankan development; perubahan skema, backup/restore dan aktivasi produksi mengikuti prosedur terkontrol.
