# Pemeriksaan simpan jurnal — 4 November 2026

Jurnal baru berhasil disimpan melalui tombol **Simpan Jurnal** dan tetap tersedia setelah reload pada pemeriksaan awal. Keluhan teman pengguna belum dapat dipetakan ke satu penyebab tanpa pesan error dan URL aplikasi yang dipakainya.

Pemeriksaan lanjutan berhasil mereproduksi dua kendala formulir pada kode sebelumnya:

1. Jurnal dan absensi memakai pertemuan yang sama. Sesudah pertemuan disimpan, alasan koreksi wajib diisi. Jika kosong, browser menghentikan pengiriman formulir, tetapi aplikasi tidak menampilkan pesan error sendiri. Ini bisa terlihat seperti tombol tidak berfungsi.
2. Jam pelajaran ` 1-2 ` ditolak dengan HTTP 422 karena spasi di awal/akhir.

## Perbaikan

- Validasi formulir menampilkan pesan aplikasi, termasuk penjelasan khusus alasan koreksi. Pesan error dibawa ke area pandang. Label wajib, batas nomor pertemuan, contoh format jam, dan petunjuk tanggal sesuai hari jadwal diperjelas.
- Jam pelajaran baru/berubah dirapikan dari spasi di awal/akhir sebelum validasi. Isian jam historis yang tidak diubah tetap diterima; izin, versi data, alasan koreksi, dan batas tanggal tetap diperiksa server.
- Simpan yang berhasil tetap dilaporkan berhasil saat permintaan berikutnya untuk memperbarui riwayat gagal. Pengguna mendapat petunjuk untuk memuat ulang riwayat, sehingga tidak terdorong mengirim ulang data yang sudah tersimpan.

## Verifikasi

Runner [tests/tsx_journal_save.cjs](../tests/tsx_journal_save.cjs) menggunakan klik Chromium, reload, pemeriksaan SQLite, dan HTTP pada fixture sintetis di luar repository. Pada hasil build production standar Turbopack, **10 pemeriksaan lulus, 0 gagal**:

1. Buat jurnal mandiri dengan jam berspasi; reload membuktikan data tersimpan tanpa menciptakan absensi.
2. Alasan koreksi kosong menampilkan pesan dan tidak menulis data/audit.
3. Koreksi tersimpan bersama alasan pada audit.
4. Jurnal setelah absensi dapat diedit tanpa mengubah baris kehadiran.
5. Gangguan pemuatan riwayat tidak mengubah hasil simpan menjadi pesan gagal.
6. Hari yang salah ditolak; pemilihan tanggal benar memulihkan formulir.
7. Versi lama, guru di luar penugasan, jam 99, dan alasan kosong tetap ditolak server.
8. Isian jam legacy yang tidak diubah tidak menghalangi koreksi materi.
9. Tidak ada runtime error browser.
10. Hash database sekolah, WAL, dan SHM tetap sama.

Typecheck, `pnpm build` (82 route), pemeriksaan sintaks runner, dan `git diff --check` juga lulus. [Bukti JSON dan hash sumber](evidence/TSX_JOURNAL_SAVE_2026-11-04.json) mencatat versi yang diuji. Database sekolah tidak dimigrasi atau diubah.

Untuk reproduksi, buat fixture baru menggunakan `tests/tsx_teacher_setup.py`, jalankan server fixture, kemudian jalankan runner dengan `SIA_ADMIN_STATE` dan `SIA_ADMIN_URL` menunjuk fixture tersebut. Konfigurasi Chromium mengikuti `tests/tsx_admin_helpers.cjs`; lihat juga [panduan pengujian lintas peran](VERIFIKASI_TOMBOL_LINTAS_PERAN_TSX_2026-11-04.md#menjalankan-ulang). Jangan menjalankan tes tulis pada database sekolah.
