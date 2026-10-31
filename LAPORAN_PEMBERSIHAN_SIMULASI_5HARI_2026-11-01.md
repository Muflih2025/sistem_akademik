# Laporan pembersihan fixture dan simulasi lima hari

Tanggal penyelesaian dokumentasi: **1 November 2026**, zona waktu Asia/Jakarta. Branch **`development/academic-workflows-20261031`**, commit kode **`42fd812`**. Worktree `/home/muflih/sia-academic-dev`, website **http://127.0.0.1:18125**.

**Status: SIAP DICOBA MANUAL DI LOCALHOST.** Pembersihan dan pengisian simulasi sudah selesai; tidak diulang ketika melanjutkan checkpoint. Bukti browser **19 PASS, 0 FAIL, 0 SKIP** disimpan terpisah dari suite historis 869 pemeriksaan. Verifikasi integritas terakhir `2026-11-01T03:54:23.179640+07:00` lulus.

## 1. Ruang lingkup dan pengamanan data

Pengguna menyetujui penghapusan **hanya fixture otomatis** setelah backup. Sebelum pembersihan, snapshot development dibandingkan dengan hasil restore checkpoint otomatis sebelumnya: seluruh tabel/skema/data cocok. Ini menjadi dasar identifikasi data hasil automation, bukan sekadar menebak dari nama.

Backup baru dibuat dan dipulihkan ke **database staging baru**, kemudian manifest penghapusan berisi primary key spesifik ditinjau. Penghapusan dilakukan dalam satu transaksi, mengikuti dependency foreign key, dengan pemeriksaan hash data sebelum penerapan. Tidak menggunakan DROP, TRUNCATE, reset, penonaktifan foreign key, atau penggantian database existing. Operator CLI terpisah dari akun runtime.

Hasil aktual:

| Kelompok | Sebelum | Sesudah | Keterangan |
|---|---:|---:|---|
| Siswa | 982 | 411 | 571 fixture acak dihapus; 389 Excel + 22 contoh terkurasi tetap ada |
| Kelas | 271 | 36 | 235 kelas acak dihapus; X/XI/XII × 4 jurusan × 3 paralel tetap |
| Profil Guru | 176 | 4 | 172 fixture dihapus; dua pengajar, piket dan wali contoh dipertahankan |
| Jurusan | 188 | 4 | Referensi PPLG, PM, AKL, MPLB dipertahankan |
| Mata pelajaran | 140 | 2 | Dua mapel contoh untuk simulasi |
| Periode | 90 | 2 | Periode contoh awal dipertahankan, tahun acak dibuang |
| Ruang/lab | 35 | 29 | Seluruh referensi pengguna dipertahankan |
| Akun | 57 | 57 | 8 aktif; 49 akun lama dinonaktifkan agar identitas audit tetap terbaca |

**Total 3.278 record fixture dihapus**, termasuk pertemuan/absensi/nilai/rapor/kenaikan hasil automation sebelumnya. **Tidak ada baris audit lama yang dihapus**. Satu catatan cleanup baru ditambahkan. Riwayat jam berversi juga dipertahankan. Akun inti tidak di-reset password/role/referensinya.

Jadwal negatif `LEGACY-UJI` lokal dinonaktifkan melalui backend Admin dan tidak memberi hak mengajar. Record ini merupakan fixture sintetis terpisah; **18 penugasan database aktif tetap utuh**. Record fixture lama yang dihapus dapat ditinjau pada backup privat; ID tidak di-reset/dipakai ulang.

Pemeriksaan akhir membandingkan baris roster Excel, keanggotaan, kelas, jurusan, ruang dan versi jam dengan **backup sebelum cleanup**, bukan hanya membandingkan jumlah. Semua cocok. Seluruh baris audit sebelum cleanup dibandingkan berdasarkan hash per baris: tetap sama. Cleanup CLI ditutup oleh marker/hash sehingga tidak dapat diputar ulang pada dataset yang sudah berubah; penolakan replay sudah diuji tanpa mutasi.

## 2. Simulasi Senin–Jumat yang sudah tersimpan

Tanggal **26–30 Oktober 2026**, periode **2026/2027 Ganjil**. Semua data berikut berlabel simulasi, bukan laporan kegiatan sekolah nyata.

- `uji_guru`: kelas **XII PPLG 2**, **20 siswa**, mapel Pemrograman, **Lab PPLG 1**, jam ke-1–2 setiap hari.
- `uji_guru_lain`: **XII PPLG 1**, **2 siswa**, Basis Data, **A1**, jam ke-1–2; tambahan Jumat jam ke-3–4 di XII PPLG 2.
- Senin jam ke-1–2 **07:40–09:00**; Selasa–Kamis **07:00–08:20**; Jumat **07:45–08:45**. Jumat jam ke-3–4 **08:45–09:45**.
- **11 jadwal terverifikasi**, **9 pertemuan/jurnal terisi**, **2 sengaja belum diisi**: guru kedua pada kelas XII PPLG 1 hari Rabu/Jumat.
- **42 nilai**, **3 aturan nilai**, **110 record harian** hasil rekonsiliasi Piket; **2 rapor terbit** melalui verifikasi/penerbitan Admin.
- Kalender mempunyai satu agenda simulasi disahkan dan satu agenda hasil impor Excel berstatus draft.

Rekap awal kelas XII PPLG 2:

| Tanggal | H | S | I | A | Belum |
|---|---:|---:|---:|---:|---:|
| 26-10-2026 | 18 | 1 | 1 | 0 | 0 |
| 27-10-2026 | 19 | 0 | 0 | 1 | 0 |
| 28-10-2026 | 18 | 1 | 0 | 0 | 1 |
| 29-10-2026 | 20 | 0 | 0 | 0 | 0 |
| 30-10-2026 | 18 | 1 | 1 | 0 | 0 |

Absensi sesi dan harian tidak disamakan diam-diam; rekap harian memakai rekonsiliasi, bukti, revision dan izin. Dua sesi Jumat tidak dihitung menjadi dua hari. Siswa belum diverifikasi tetap Belum. Rapor semester tetap menghitung rentang semester/anggota; tanggal lain tanpa data menjadi Belum, tidak diasumsikan hadir.

## 3. Perubahan fungsi website

**Pemantauan Kepala Sekolah:** tersedia filter tanggal, guru, kelas, ruang dan jam pelajaran. Tampilan menunjukkan **Jam ke-1–2 / 3–4**, waktu, guru/mapel, kelas/ruang, wali dan status jurnal. Tautan Sudah diisi membuka jurnal sebenarnya. Nomor jam memakai acuan jam terbaru dan versi acuannya ditampilkan; jadwal yang tidak cocok ditandai belum dipetakan. Tidak mengubah arsip waktu atau mengklaim lokasi fisik guru.

**Pengisian jurnal guru:** navigasi **Absensi & Isi Jurnal** dan bagian **Isi Jurnal Kelas & Agenda Guru** memperjelas tempat input materi di kelas/jadwal yang menjadi tugasnya. Riwayat/cetak tetap terpisah sebagai cara membaca hasil yang sama. Navigasi bawah Guru mengarah ke Nilai, sesuai kebijakan akses rapor penuh yang dibatasi.

**Pagination absensi:** default **10 siswa**, pilihan **10/20/50**, nomor halaman dan pencarian seluruh roster. Semua input siswa tetap aktif dalam satu formulir supaya penyimpanan backend tetap atomik untuk seluruh kelas. Bukan LIMIT SQL yang memotong payload absensi. Perubahan halaman/pencarian tidak membuang isian. Simpan dari satu hasil pencarian telah dibuktikan tetap menyimpan 20 siswa, termasuk perubahan pada halaman kedua. Tanpa JavaScript, seluruh roster tetap tampil sebagai fallback. Daftar master Admin/Jadwal tetap menggunakan pagination server.

**URL ringkas:** alias tetap memakai allowlist dan endpoint/otorisasi yang sama. Contoh `/beranda`, `/absensi`, `/jurnal`, `/guru-mengajar`, `/piket`, `/nilai`, `/rapor`, `/kalender`, `/jadwal`, `/jam-belajar`, `/akademik`, `/kenaikan`, `/alumni`, `/kehadiran`. Parameter jadwal/tanggal/filter tetap dipakai untuk menyimpan konteks halaman. URL lama tetap berfungsi; manipulasi parameter view pada alias tidak mengubah otorisasi. Entry point monitoring legacy diarahkan ke pemantauan akademik terbaru. Flag development `FRIENDLY_ROUTES=1`; layanan 8085 tidak diubah.

## 4. Hasil pengujian yang benar-benar dijalankan

| Pengujian | Hasil | Bukti |
|---|---|---|
| Browser mengisi lima tanggal | 5 PASS | Simpan/reload setiap hari, cocokkan SQL/status/actor |
| Pagination lintas halaman/pencarian | 1 PASS | Perubahan siswa 15 tetap ikut tersimpan; ringkasan seluruh kelas benar |
| Impor Excel absensi dan kalender | 1 PASS | Template XLSX nyata diisi, preview, commit, DB readback; jurnal existing tetap ada |
| Review fungsi/keamanan/browser | 12 PASS | Semua alias utama sesuai role, Kepsek jam/kelas/jurnal, harian 5 hari, rapor own/IDOR, unduhan, login/logout, akun arsip ditolak, proteksi file, 5 viewport, fallback tanpa JS |
| **Total skenario fungsi terfokus** | **19 PASS / 0 FAIL / 0 SKIP** | Tidak menambah jumlah dengan menghitung ulang setiap assertion/viewport |
| Integritas final | PASS | 99 foreign key, 0 orphan, data sekolah dan audit cocok dengan backup, runtime non-root/tanpa DDL |
| Restart development | PASS | Session tetap berfungsi dan snapshot DB tetap sama setelah restart 18125 |
| Backup/restore sebelum cleanup | PASS | Database staging baru cocok persis dengan sumber |
| Backup/restore dataset terkurasi | PASS | 44 tabel / 9.766 baris cocok persis; backup masih cocok dengan DB saat penutupan checkpoint |
| Syntax/whitespace | PASS | 116 file PHP, 12 JavaScript, Python compile dan git diff --check |

Regresi besar 869 pemeriksaan sebelumnya **tidak dijalankan ulang**. CRUD master/kenaikan dan modul legacy yang tidak diubah bukan klaim run E2E baru di checkpoint ini. Pengujian browser menulis melalui backend pada fase fill; review sesudah finalisasi bersifat baca-saja, dengan snapshot seluruh database tetap sama. Screenshot aktual 320/375/430/768/1440px tersedia privat sebagai `week-attendance-*.png` dan `week-head-*.png`.

Bukti tersanitasi: [CURATED_WEEK_TEST_RESULTS.json](docs/evidence/CURATED_WEEK_TEST_RESULTS.json).

## 5. Backup, database aktif dan pemulihan

- Sebelum cleanup: SHA256 **`05ce0e31bdcaeb08b8cd79a3501b37cae88617a23475fa3faaf393a7be7436ef`**; restore ke `sia_academic_test_restore_41717e26` lulus.
- Dataset terkurasi: SHA256 **`7242f1deb1769e4b7fc11eb06954e4b27704d00a1070a36520a89b81599f85e2`**; restore ke `sia_academic_test_restore_eba9fa67` lulus. Backup/dump/manifest/config berada di direktori privat di luar web/repository.
- Snapshot database aktif tetap identik baseline: **23 tabel + 1 view, 203 baris**, termasuk **18 penugasan**. Fingerprint canonical JSON SHA256 **`716d5f00f69f9cda6ecf24d522ac99b398462dc63f2b0ca658ec24743e164e41`**.
- PID/waktu start/user/config service 8085, release aktif dan seluruh hash berkas proyek Laravel sumber tetap sama.
- Pada direktori target asli, hanya panduan **`test.md`** yang diperbarui untuk akun/tautan terbaru. Perubahan kode dilakukan di worktree development; perubahan existing pengguna tetap dipertahankan.
- Runtime tetap non-root, tanpa DDL/GRANT dan berbeda dari akun operator/deployment. Tidak ada perubahan grant aktif, migration framework, Dockerisasi, atau deployment publik.

Jika perlu rollback aplikasi, gunakan commit Git/revert yang ditinjau atau nonaktifkan flag URL ringkas pada konfigurasi **development** lalu restart hanya 18125. Jangan reset worktree atau menghapus perubahan pengguna. Rollback kode tidak mengembalikan fixture yang dihapus. Untuk meninjau dataset lama, restore backup ke **DB staging baru**, verifikasi, lalu minta persetujuan terpisah sebelum pengalihan/penimpaan data existing. Jangan mengeksekusi dump ke database aktif. Cleanup dan seeding tidak boleh diulang untuk mengembalikan angka setelah input manual.

## 6. Cara mencoba sekarang

Buka login 18125. Akun: `uji_admin`, `uji_guru`, `uji_guru_lain`, `uji_piket`, `uji_kepsek`; password testing **`password`**. Gunakan profil browser terpisah.

1. Guru: [Absensi dan isi jurnal Jumat](http://127.0.0.1:18125/absensi?id_jadwal=1&tanggal=2026-10-30).
2. Kepsek: [Lihat guru pada jam ke-1](http://127.0.0.1:18125/guru-mengajar?tanggal=2026-10-30&jam_ke=1), atau pilih jam ke-3 untuk sesi berikutnya.
3. Piket: [Rekap Jumat kelas utama](http://127.0.0.1:18125/piket?id_kelas=1&tanggal=2026-10-30).
4. Guru kedua: [Isi jadwal yang masih kosong](http://127.0.0.1:18125/absensi?id_jadwal=2&tanggal=2026-10-30); setelah disimpan, Kepsek reload untuk melihat perubahan status.
5. Admin/Kepsek: [Rapor #137](http://127.0.0.1:18125/rapor?id=137); siswa `uji_siswa` hanya boleh membaca miliknya, bukan #138.

Panduan lengkap terbaru: [SIMULASI_5_HARI.md](docs/SIMULASI_5_HARI.md), disalin ke **`/home/muflih/sistem_akademik/test.md`**. Versi lama panduan dibackup privat; dokumen checkpoint lama diberi penanda historis karena ID acak lama sudah tidak aktif.

Perintah cek layanan dari worktree: `python3 ops/academic_server.py status`. Untuk mengulang review baca-saja gunakan `node tests/academic_week.cjs review` dengan environment browser dari konfigurasi privat seperti panduan sebelumnya. Fase fill/prepare/finalize hanya untuk dataset awal yang sudah disiapkan; jangan menjalankannya ulang pada data yang sedang dipakai manual. `tests/academic_week_integrity.py` membaca/verifikasi saja; opsi restart hanya untuk development yang dijaga wrapper.

## 7. Batas yang masih perlu dipahami

- Pilih tanggal **26–30 Oktober 2026**. Pada akhir pekan/tanggal di luar rentang penugasan, jadwal kosong atau penolakan sesuai konteks adalah hasil yang benar.
- Dua jurnal kosong disengaja untuk menguji alur Belum diisi → Sudah diisi. Setelah pengguna mengisi, statistik contoh dan ekspektasi data awal berubah; jangan melakukan reset untuk memaksa tes lulus.
- 389 siswa Excel belum diberi jadwal guru/sekolah resmi secara otomatis. Jangan menganggap seluruh 36 kelas sudah mempunyai penugasan nyata.
- Akun arsip dan audit masih disimpan untuk integritas; filter default akun hanya aktif. Piket contoh tidak memiliki izin koreksi data terkonfirmasi, sehingga perubahan bukti pada data terkonfirmasi perlu Admin/izin koreksi.
- Nomor jam pada pemantauan merupakan pemetaan terhadap acuan terbaru, belum penguncian versi jam per jadwal. Waktu jadwal/histori tidak berubah otomatis.
- Kenaikan/mutasi khusus, pengesahan format dokumen resmi, modul legacy tambahan, HP fisik/LAN dan uji beban bukan pengujian baru pada checkpoint ini. Tidak ada otomatisasi R2 atau deployment 8085.

## File pada commit kode

- `academic/index.php`
- `academic/layout.php`
- `academic/views/meeting.php`
- `academic/views/teaching_monitor.php`
- `admin/users.php`
- `assets/css/academic.css`
- `assets/js/academic.js`
- `config/academic/bells.php`
- `config/academic/routes.php`
- `config/web_routes.php`
- `docs/MATRIKS_FUNGSI_AKADEMIK.md`
- `docs/PANDUAN_FUNGSI_AKADEMIK_LOKAL.md`
- `docs/PANDUAN_TEST_MANUAL_ADMIN_GURU_KEPSEK.md`
- `docs/SIMULASI_5_HARI.md`
- `includes/crud.php`
- `includes/header.php`
- `ops/academic_fixture_cleanup.php`
- `ops/academic_simulate_week.py`
- `public/index.php`
- `tests/academic_browser.cjs`
- `tests/academic_bulk_master.cjs`
- `tests/academic_functional_browser.cjs`
- `tests/academic_kelas10.cjs`
- `tests/academic_module_upload.cjs`
- `tests/academic_pagination.cjs`
- `tests/academic_progression.cjs`
- `tests/academic_staff.cjs`
- `tests/academic_week.cjs`
- `tests/academic_week_integrity.py`
- `tests/login_layout.cjs`
- `tests/run_academic.py`
