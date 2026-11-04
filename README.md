# Sistem Informasi Akademik SMK Negeri 2 Magelang

Website akademik responsif untuk **Admin, Guru Mapel, Guru Piket, dan Kepala Sekolah**, dengan akses siswa opsional. Dibuka melalui browser komputer maupun smartphone, menggunakan tema putih–hitam.

Backend memakai **Next.js dan SQLite**. Perintah **`pnpm dev` menjalankan server Next.js** dan seluruh API akademik; data lokal dibaca dari `data/sia.db`. Jangan memakai database sekolah produksi untuk pengujian lokal.

## Mulai di komputer baru

### 1. Siapkan kebutuhan

| Kebutuhan | Keterangan |
|---|---|
| Git | Mengambil kode repository |
| Node.js 22+ dan pnpm 9+ | Menjalankan aplikasi dan build; dibutuhkan oleh better-sqlite3 |
| SQLite | File database development pada `data/sia.db` |

### 2. Clone dan buat konfigurasi lokal

```bash
git clone --branch rebase-tsx https://github.com/Muflih2025/sistem_akademik.git
cd sistem_akademik
pnpm install
```

Database development sudah disediakan sebagai SQLite. Untuk pengujian terisolasi, gunakan fixture pada `tests/tsx_review_setup.py`; script tersebut membuat salinan database sintetis dan tidak mengubah `data/sia.db`.


### 3. Jalankan

```bash
pnpm dev
```

Buka **http://127.0.0.1:3000/auth/login**. Tekan **Ctrl+C** pada terminal untuk berhenti.

Setelah setup pertama selesai, penggunaan sehari-hari cukup:

```bash
pnpm dev
```

Jika port 3000 sedang dipakai:

```bash
pnpm dev --hostname 127.0.0.1 --port 3001
```

Lalu buka **http://127.0.0.1:3001/auth/login**. XAMPP tidak diperlukan untuk runtime TypeScript ini.

### Perintah yang tersedia

| Perintah | Fungsi |
|---|---|
| `pnpm dev` | Menjalankan website Next.js pada localhost |
| `pnpm dev --port 3001` | Memilih port development lain |
| `pnpm build` | Memvalidasi dan membangun aplikasi production |
| `pnpm start` | Menjalankan hasil build production |

Detail pengembangan dan pengujian: **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)**.

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

Ekspor XLSX memakai ExcelJS dan PDF memakai PDFKit di server Node; unduhan API tidak memerlukan Chromium. Tombol **Cetak** menggunakan dialog browser. Playwright/Chromium digunakan oleh pengujian browser, dengan konfigurasi tersendiri. Detail: [dependensi PDF](docs/DEVELOPMENT.md#pdf-dan-dependensi-opsional).

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

Pada halaman **Penugasan Guru**, pilih tab **Guru Piket**, lalu **Tambah Guru Piket** dan **Simpan penetapan**. Setelah tersimpan, gunakan **Edit / cabut** pada baris terkait untuk membuka kembali data atau mencabut tugas.

## Struktur proyek

```text
src/app/               Halaman per peran dan route API Next.js
src/components/        Layout, formulir, tabel dan komponen akademik
src/lib/               Autentikasi, akses SQLite dan aturan akademik
data/sia.db            Database lokal SQLite
public/                Aset statis yang disajikan Next.js
tests/                 Pengujian HTTP, browser dan integritas
docs/                  Panduan, laporan dan bukti pengujian
```

Next.js dijalankan dari root repository melalui `pnpm dev`. Direktori PHP seperti `academic/`, `config/academic/`, `includes/` dan launcher `ops/dev/` dipertahankan sebagai sumber legacy; perintah `dev:php`, `dev:setup` dan `dev:check` khusus runtime PHP tersebut.

## Pengujian dan operasi

Hasil launcher/UI pada 3 November 2026 berlaku untuk runtime PHP historis. Untuk TypeScript, lihat [audit fungsi](docs/TSX_FUNCTIONAL_AUDIT_2026-11-04.md), [perbaikan Guru](docs/LAPORAN_PERBAIKAN_GURU_2026-11-04.md), dan [verifikasi Admin terbaru](docs/VERIFIKASI_ADMIN_TSX_2026-11-04.md). Setiap laporan menjelaskan versi dan lingkup yang diuji.

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
