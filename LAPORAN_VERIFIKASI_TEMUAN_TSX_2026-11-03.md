# Verifikasi temuan branch TSX — 3 November 2026

**Keputusan: BLOCKED untuk penggunaan data sekolah dan untuk merge sebagai pengganti main.**

Temuan utama pengguna terkonfirmasi. Masalah melibatkan kontrak frontend–API,
skema database, dan otorisasi. Mengganti tampilan atau menambahkan index saja tidak
menyelesaikan alur presensi yang sekarang mencampur data harian dengan sesi mapel.

## 1. Baseline yang sebenarnya

| Komponen | Hasil pemeriksaan |
| --- | --- |
| Folder yang diperiksa | `/home/muflih/sistem_akademik` |
| Branch aktif | `rebase-tsx` |
| Commit aplikasi | `b4843b1` |
| Stack branch ini | Next.js 16.4.3, React, TypeScript/TSX, better-sqlite3 |
| Database branch ini | `data/sia.db`, SQLite |
| Main sebagai pembanding | `6f2d097`, PHP native dan MariaDB |
| Perbedaan branch | 238 file berubah terhadap main |
| `pnpm dev` pada branch ini | `next dev`; berbeda dengan peluncur PHP pada main |

Jadi hasil pengujian PHP sebelumnya **tidak membuktikan** kesetaraan fungsi branch
TSX. Isi halaman Kepsek pada screenshot cocok dengan branch TSX. Header pada commit
yang diperiksa sudah hitam dan sticky; screenshot pengguna memiliki header lain.
Ini menunjukkan perbedaan versi tampilan, tetapi tidak membuktikan penyebabnya
cache atau branch tertentu tanpa identitas proses server saat screenshot dibuat.

Tidak dilakukan checkout/reset branch, penggantian framework, atau perubahan
skema/data aplikasi asli selama verifikasi ini.

## 2. Metode dan hasil nyata

Server Next.js dijalankan pada **127.0.0.1:18128**, dari salinan kode di luar repo:
`~/.local/state/sia-tsx-review-20261103/app`.

Database pengujian dibangun dari **struktur tabel saja**, lalu diisi tiga siswa,
dua kelas, dua guru, tiga jadwal, serta akun dan rapor sintetis. Tidak menyalin
baris data siswa sekolah ke lingkungan ini. Pengujian tulis hanya menuju fixture
tersebut. Akun uji salinan menggunakan password acak yang disimpan secara privat.

- HTTP/browser: **9 PASS, 17 FAIL, 0 ERROR runner**, dari 26 pemeriksaan.
- Typecheck langsung: **PASS**, exit code 0, dengan
  `./node_modules/.bin/tsc --noEmit --incremental false` pada salinan review.
- Browser aktual: login, navigasi, logout, halaman unggah, jadwal, serta ukuran
  320/375/430/768/1440px.
- Hash berkas database asli, termasuk berkas pendamping yang dicatat sebelum
  pengujian, sama sesudah pengujian: **PASS**.

FAIL di sini merupakan persyaratan aplikasi yang tidak terpenuhi. Bukan angka
pengujian PHP lama dan bukan klaim bahwa semua bug telah diperbaiki. Typecheck yang
lulus tidak mendeteksi ketidakcocokan kolom SQL atau akses data lintas kelas.

Bukti terstruktur: [TSX_REVIEW_2026-11-03.json](docs/evidence/TSX_REVIEW_2026-11-03.json).

## 3. Verifikasi temuan pengguna

| Temuan | Status | Bukti dan penyebab | Prioritas |
| --- | --- | --- | --- |
| Tombol Buka Panel Kepsek tidak berpindah halaman | Terkonfirmasi | `src/app/kepsek/page.tsx:35` menunjuk `/kepsek` ketika pengguna sudah di `/kepsek`. | P2 |
| Semua kartu Kepsek tidak memiliki halaman tujuan | Tidak terkonfirmasi sebagai pernyataan menyeluruh | Lima kartu menuju lima rute yang benar-benar memberikan HTTP 200. Keterbukaan halaman belum membuktikan isi modul bekerja. | — |
| Menu tiap portal tidak sesuai | Terkonfirmasi pada Kepsek | Server mengembalikan role `kepala_sekolah`, tetapi `PortalLayout` memakai key `kepsek`. Setelah hidrasi, fallback menampilkan menu Guru: Beranda/Mengajar/Penilaian/Guru Piket. | P1 |
| Presensi kelas/mapel lain ikut termuat | Terkonfirmasi | Dua pilihan kelas mengembalikan tiga record identik dari kedua kelas. `id_jadwal=1` dan `id_jadwal=3` juga mengembalikan data sama. | P0 |
| Simpan presensi/jurnal error | Terkonfirmasi | Keduanya menghasilkan HTTP 500: `ON CONFLICT clause does not match any PRIMARY KEY or UNIQUE constraint`. | P0 |
| Admin seluruhnya kosong/error | Terkonfirmasi sebagian | API pengguna HTTP 500; API master kelas HTTP 200. Beberapa layar memakai data hardcode atau tombol tanpa implementasi. Tidak tepat menyatakan setiap endpoint Admin error. | P1 |
| Jadwal terlihat kosong/tidak lengkap | Terkonfirmasi | API memberi `nama_mapel`, `nama_kelas`, `nama_guru`, `id_jadwal`; GUI membaca `mapel`, `kelas`, `guru_nama`, `id`. Nama mapel fixture tidak tampil meski API berisi jadwal. | P1 |
| Tanggal presensi baru kosong | Terkonfirmasi | API hanya membaca record harian yang sudah ada, bukan roster kelas dengan status awal B. Tanggal belum diisi mengembalikan nol siswa. | P0 |
| Nilai tampak tersimpan tetapi tidak ada data | Terkonfirmasi | POST nilai HTTP 200 dan `success: true`, tetapi jumlah record tetap nol. Endpoint hanya UPDATE, tidak menciptakan nilai awal dan tidak memeriksa affected rows. | P0 |
| Bulk upload belum berfungsi | Terkonfirmasi | Halaman punya tombol Pilih Berkas Excel, tetapi nol `input[type=file]`; tombol belum terhubung ke unggah/preview/commit. Master API juga hanya memiliki GET: POST menghasilkan 405. | P1 |
| Navbar tidak tetap/logout hanya di bawah | Tidak direproduksi pada commit ini | Pada kelima ukuran, header tetap di atas, tombol Keluar terlihat, dan tidak ada horizontal overflow halaman Kepsek. | — |
| Logout benar-benar mengakhiri sesi | Gagal | Keluar hanya membuka halaman login. Sesudah diklik, API terautentikasi masih HTTP 200. | P0 |

## 4. Presensi: akar masalah dan batas kesimpulan

Referensi: `src/app/guru/absen/page.tsx:35`, `:67`, `:79`, serta
`src/app/api/absensi/route.ts:13`, `:19`, `:57`, `:63`.

1. GUI mengirim `kelas=<nama kelas>`. API membaca `id_kelas`; parameter dari GUI
   tidak digunakan sehingga filter kelas tidak diterapkan.
2. API membaca `id_jadwal` tetapi tidak memakainya pada query atau penyimpanan.
3. Halaman guru menggunakan `ak_absensi_harian`. Kehadiran harian sekolah tidak
   menyimpan identitas sesi mapel; tidak boleh diperlakukan sebagai presensi tiap
   pertemuan.
4. POST GUI tidak mengirim ID kelas/jadwal. Backend menggunakan fallback kelas 1,
   periode 1 dan anggota 1, serta bukti placeholder. Nilai ini bukan hasil validasi
   penugasan guru dan roster siswa.
5. Target konflik hanya tanggal dan NIS. Menambahkan UNIQUE agar SQL berhenti
   error tetap tidak memisahkan kehadiran tiap sesi pembelajaran.
6. GUI mengirim jurnal melalui request kedua dengan identitas guru/mapel hardcode.
   Respons jurnal tidak diperiksa. Tidak ada satu transaksi untuk menjamin presensi
   dan jurnal berhasil bersama.

**Yang terbukti adalah pemuatan data bercampur dan kegagalan penyimpanan pada
skema saat ini.** Tidak dilakukan percobaan menimpa histori sekolah, dan belum
disimpulkan bahwa histori asli sudah rusak. Pemeriksaan koreksi historis memerlukan
rekonsiliasi terhadap bukti pertemuan dan audit, tanpa menebak atau overwrite massal.

Kontrak yang diperlukan: guru → penugasan terverifikasi → jadwal → periode/tanggal
→ roster berlaku → pertemuan → absensi sesi. Identitas kelas/mapel/guru diturunkan
server dari jadwal, bukan dipercaya dari input bebas. Jurnal dan absensi sesi
disimpan atomik; Guru Piket merekonsiliasi sumber tersebut menjadi harian sekolah.

## 5. Skema dan keamanan tambahan

Metadata SQLite aktual menunjukkan **45 tabel, 43 seluruh kolomnya bertipe TEXT,
hanya dua tabel memiliki primary key, nol index, dan nol kolom foreign key**.
Tabel akademik yang diperiksa, termasuk `users`, `jadwal`, `ak_pertemuan`,
`ak_absensi_harian`, dan `ak_absensi_sesi`, tidak memiliki primary/unique key yang
dibutuhkan. Mengaktifkan `PRAGMA foreign_keys=ON` tidak menciptakan foreign key.

Temuan pengujian tambahan yang menghalangi release:

- Siswa dapat membaca API master seluruh siswa fixture: HTTP 200, termasuk kelas
  lain. `getCurrentUser()` saja belum merupakan pembatasan akses modul/record.
- Guru mendapat jadwal milik guru lain dari `/api/jadwal` tanpa filter kewenangan.
- Siswa bisa membaca snapshot rapornya yang masih **draft** melalui `/api/rapor`.
  Pemeriksaan NIS sendiri tidak menggantikan pemeriksaan status publikasi.
- Halaman Admin dapat dimuat tanpa login. API sensitif tetap perlu otorisasi
  sendiri; penyembunyian tombol atau localStorage bukan pembatasan akses.
- Dari review sumber: sesi memiliki fallback secret di kode. Validasi server
  hanya mengecek akun masih aktif, lalu mengembalikan role/identitas dari token
  lama; perubahan role/password/referensi belum mencabut sesi secara memadai.
  Nilai secret tidak dicetak dalam laporan ini.
- Dari review sumber: penulisan presensi belum memeriksa roster, penugasan, periode
  terkunci, revisi konflik dan audit secara setara dengan fondasi PHP sebelumnya.
- `data/sia.db`, `data/sia.db-wal`, dan `data/sia.db-shm` ter-track Git. Snapshot
  database dan hash akun perlu dikeluarkan dari distribusi/repository melalui
  pekerjaan tersendiri. Tidak dilakukan penghapusan berkas atau rewrite history.

## 6. Urutan remediasi yang disarankan

| Tahap | Perubahan | Kriteria selesai |
| --- | --- | --- |
| 0 — pilih baseline | Tetapkan apakah PHP main tetap menjadi release utama atau TSX akan diremediasi sebagai kandidat terpisah. Jangan merge hanya karena TSX bisa build. | Branch, stack, sumber database, commit dan URL setiap lingkungan tercatat; tidak ada dua aplikasi menulis sumber data berbeda untuk proses yang sama. |
| 1 — identitas dan akses | Secret privat wajib, role/referensi diperiksa dari DB server, logout mencabut sesi, RBAC dan pembatasan record untuk semua endpoint. Draft rapor ditutup. | Uji tamper URL/POST, revocation, lintas role/guru/siswa dan rapor draft menolak akses tanpa perubahan data. |
| 2 — skema | Bandingkan skema hasil konversi dengan migration dan constraint asli. Analisis duplikasi/orphan sebelum menambah constraint. Simulasi di database baru, backup dan restore terlebih dahulu. | Primary/unique/FK terbukti bekerja; jumlah/hash data dan pemetaan identitas dapat dipertanggungjawabkan; tidak ada data lama ditebak/dihapus. |
| 3 — presensi/jurnal | Endpoint pertemuan terotorisasi, roster berdasarkan jadwal/periode, transaksi tunggal dan audit. Harian sekolah tetap sumber hasil rekonsiliasi. | Dua kelas dan dua mapel tidak saling berubah; tanggal baru memuat B; 20 siswa → 18 H/1 S/1 I; reload, stale revision dan rollback atomik diuji. |
| 4 — Admin/nilai | Perbaiki DTO query/GUI, CRUD nyata, upload Excel/CSV preview–konfirmasi, nilai create/update, aturan berversi, validasi hasil simpan. | Simpan dibuktikan isi DB dan reload; kesalahan tampil jelas; data kosong memiliki petunjuk penugasan/roster, bukan sukses palsu. |
| 5 — navigasi/regresi | Selaraskan key role, tujuan tombol panel, pertahankan header/logout atas dan tema putih-hitam. | Lima ukuran browser, semua rute per role, unduhan dibaca ulang, seluruh temuan P0/P1 tertutup. |

Untuk guru, daftar siswa/jadwal disiapkan Admin melalui master data, periode,
keanggotaan dan penugasan. Menambahkan tombol upload pada semua halaman guru
tidak akan memperbaiki roster/otorisasi yang belum benar. Petunjuk saat kosong
harus mengarah ke prasyarat dan pihak yang berwenang mengisinya.

## 7. Reproduksi dan artefak

- Runner: [tests/tsx_findings_review.cjs](tests/tsx_findings_review.cjs).
- Setup create-only: [tests/tsx_review_setup.py](tests/tsx_review_setup.py).
- Hasil: [docs/evidence/TSX_REVIEW_2026-11-03.json](docs/evidence/TSX_REVIEW_2026-11-03.json).
- Screenshot privat: `~/.local/state/sia-tsx-review-20261103/screenshots/`.

Pada mesin pemeriksaan ini, salinan review sudah tersedia. Jalankan ulang:

```bash
node tests/tsx_findings_review.cjs
```

Untuk setup pertama pada state kosong, dari root proyek:

```bash
python3 tests/tsx_review_setup.py --serve
# Terminal kedua:
node tests/tsx_findings_review.cjs
```

Setup menolak menimpa salinan yang sudah ada. Browser runner memakai Playwright
yang telah dipasang di tool state pemeriksaan sebelumnya; runner tidak memasang
paket atau menyentuh service lama. Jalur dependency browser tersebut perlu
disesuaikan untuk menjalankan runner pada komputer lain.

Layanan 8085, database MariaDB existing, proyek Laravel sumber dan 18 penugasan
legacy tidak dimodifikasi. Pekerjaan Docker pada worktree PHP tetap terpisah;
hasilnya tidak dipakai untuk menyatakan branch TSX lolos pengujian. Aplikasi TSX
belum diperbaiki oleh tahap verifikasi ini; perubahan hanya berupa alat review,
bukti pengujian dan laporan. Tidak dilakukan merge/push/deployment.
