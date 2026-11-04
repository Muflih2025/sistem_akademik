# Verifikasi tombol dan alur lintas peran — 4 November 2026

Tombol diuji dengan Chromium melalui klik, pengisian formulir, penyimpanan, dan muat ulang. Pengujian HTTP dan pemeriksaan SQLite melengkapi pemeriksaan browser. Peran yang diuji: Admin, Guru Mapel, Guru Piket, Kepala Sekolah, dan Siswa.

Seluruh operasi tulis memakai database sintetis di luar repository. Fixture menyalin definisi tabel, tanpa menyalin baris data sekolah. Hash `data/sia.db`, WAL, dan SHM sama sebelum dan sesudah pengujian.

## Perubahan yang diverifikasi

- Pengguna: tambah, edit, status aktif/nonaktif, batal, validasi akun, penyimpanan setelah reload, serta pencabutan sesi saat logout/ganti password. Label dan pesan hasil formulir dapat diakses oleh pembaca layar dan pengujian browser.
- Master: tujuh kategori CRUD, pilihan referensi lengkap dengan pagination, nama jadwal yang terbaca, serta pengisian ulang ruang saat edit. Konflik versi ditolak agar perubahan pengguna lain tidak tertimpa.
- Akademik: periode, penugasan, anggota kelas, izin Piket, jam belajar, kalender, dan impor XLSX melalui preview lalu konfirmasi. Preview tidak menulis data.
- Mengajar: absensi dan jurnal dari pertemuan yang sama, nama siswa tidak hadir pada jurnal, guru pengganti, validasi nomor pertemuan/jam, nilai, ekstrakurikuler, dan pembatasan guru sesuai penugasan. Kegagalan transaksi tidak menyisakan sebagian perubahan.
- Rapor: buat draft, verifikasi, terbitkan, akses siswa pada rapornya sendiri, serta unduhan CSV/XLSX/PDF. Tombol Cetak memuat PDF yang telah diperiksa izinnya ke iframe untuk dialog cetak browser; unduhan PDF tetap tersedia.
- Operasi lain: rekonsiliasi harian Piket, catatan evaluasi Kepala Sekolah, kenaikan kelas dengan konfirmasi, histori, alumni, dan pencegahan proses ganda.
- Navigasi: halaman riwayat perubahan Admin, rekap nilai, dan jurnal Admin/Kepala Sekolah tersedia. URL singkat mengikuti peran. Menu ekstrakurikuler ganda dihapus. Beranda menampilkan identitas, jumlah, dan jadwal dari database, dengan tautan sesuai akun.
- Screenshot hydration: atribut `data-new-gr-c-s-check-loaded`/`data-gr-ext-installed` berasal dari ekstensi penulisan browser. `suppressHydrationWarning` dibatasi pada `<body>`. Uji tambah pengguna menyuntikkan atribut ekstensi sebelum hydration dan memeriksa error browser.

## Hasil

| Suite | PASS | FAIL / ERROR |
|---|---:|---:|
| Alur lengkap lintas peran, production Turbopack | 18 kelompok | 0 / 0 |
| Regresi Guru dan Piket, simulasi lima hari | 44 | 0 / 0 |
| Pengganti buku fisik, daftar 20 siswa | 24 | 0 / 0 |
| Klik interaktif pada Next dev Turbopack | 6 | 0 / 0 |
| Klik unduh CSV/XLSX dan Cetak Rapor | 4 | 0 / 0 |
| Total | 96 | 0 / 0 |

Hitungan mencakup assertion dan kelompok alur; beberapa pemeriksaan sengaja tumpang tindih. Suite lengkap membuka 36 halaman modul, menguji URL singkat sesuai peran, dan memeriksa tampilan pada lebar 320, 375, 768, serta 1440 px. Unduhan diperiksa isinya, bukan hanya status HTTP.

`pnpm exec tsc --noEmit --incremental false`, `pnpm build` standar Turbopack (82 route), serta `git diff --check` lulus. Build Webpack juga pernah lulus sebagai pembanding. Suite pengguna yang sudah tersedia juga lulus pada server development.

Bukti tersanitasi, daftar assertion, dan hash sumber tersedia di [JSON hasil pengujian](evidence/TSX_ALL_ROLE_BUTTONS_2026-11-04.json). Hash sumber mengidentifikasi perubahan aplikasi yang belum masuk base commit saat tes berlangsung; nomor base commit sendiri bukan representasi lengkap kode yang diuji.

## Menjalankan ulang

Gunakan Node.js 22+, dependensi proyek yang sudah dipasang, dan SQLite development dengan skema yang diperlukan. Buat fixture baru untuk setiap suite yang mengubah data; jangan arahkan runner ke database sekolah.

```bash
python3 tests/tsx_teacher_setup.py --state /tmp/sia-buttons-review --port 18170 --serve
```

Di terminal lain, untuk pengujian development:

```bash
SIA_ADMIN_STATE=/tmp/sia-buttons-review SIA_ADMIN_URL=http://127.0.0.1:18170 node tests/tsx_dev_interactions.cjs
```

Runner memakai konfigurasi browser eksternal melalui `SIA_BROWSER_CONFIG` (atau default yang dijelaskan di `tests/tsx_admin_helpers.cjs`), berisi `PDF_PLAYWRIGHT_PATH`, `PDF_BROWSERS_PATH`, dan bila diperlukan `PDF_LIBRARY_PATH`. Chromium ini hanya untuk tes browser; ekspor aplikasi memakai PDFKit dan ExcelJS.

Untuk suite lengkap, buat fixture baru, build aplikasi di direktori `app` fixture, lalu jalankan hasil build dengan `SESSION_SECRET` privat fixture. Setelah server siap, jalankan `tests/tsx_complete_workflows.cjs` dengan kedua environment variable di atas, kemudian `tests/tsx_document_buttons.cjs` pada fixture yang sama. Jangan mencetak atau meng-commit `private.json`. Jika menyalin `.next` yang sudah dibangun, pertahankan symbolic link dependensinya; menyalin dengan dereference dapat memutus resolusi dependensi PDFKit pada pnpm.

Regresi Guru memakai fixture baru dengan `tests/tsx_teacher_flows.cjs` dan environment `SIA_TEACHER_STATE`/`SIA_TEACHER_URL`. Audit buku fisik memakai fixture baru dengan opsi `--paperless`, `tests/tsx_paperless_audit.cjs`, dan environment `SIA_PAPER_STATE`/`SIA_PAPER_URL`. Laporan lengkap tiap run ditulis ke direktori `reports` fixture.

## Lingkup hasil

Pengujian rapor memakai mode default wali kelas sebagai informasi. Cabang UI `HOMEROOM_MODE=required` telah dihubungkan ke modul rapor, tetapi mode opsional itu tidak termasuk sertifikasi alur di atas. Hasil berlaku untuk fixture, aturan izin, dan sumber yang dicatat; bukan bukti kesetaraan setiap baris implementasi PHP atau seluruh kemungkinan konfigurasi sekolah. Tidak ada migrasi, reset, aktivasi akun, atau restart layanan sekolah yang dilakukan oleh pengujian ini.
