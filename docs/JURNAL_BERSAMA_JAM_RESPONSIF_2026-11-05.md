# Jurnal bersama, jam pembelajaran, dan responsivitas

Permintaan 5 November 2026: semua guru boleh mengisi/mengedit jurnal sendiri maupun guru lain, dengan pilihan kelas dan peringatan konteks sebelum edit; jam pembelajaran dapat ditambah/diubah admin sesuai lampiran; tampilan tetap nyaman di HP dan desktop. Perubahan ini disiapkan untuk commit dan push ke `rebase-tsx` setelah pengujian.

## Cara menggunakan

1. Guru membuka **Mengajar → Jadwal Mengajar**, memilih tanggal, kemudian kelas dan sesi pada **Jurnal kelas per sesi**. Pilihan menampilkan jam ke, waktu, mata pelajaran, dan guru terjadwal. Tautan **Buka jurnal kelas** membawa konteks tersebut ke editor.
2. Alternatifnya, buka **Mengajar → Jurnal Kelas Bersama**, pilih kelas terlebih dahulu, tanggal, lalu sesi. Tidak ada kelas yang dipilih otomatis saat membuka halaman tanpa parameter kelas.
3. Tekan **Edit jurnal kelas**. Dialog menanyakan apakah kelas, hari, dan tanggal sudah benar, serta menampilkan jam pelajaran, mapel, guru terjadwal, dan periode. **Batal, pilih ulang** mempertahankan form terkunci; **Ya, edit jurnal ini** membuka form.
4. Isi jurnal dan alasan koreksi untuk data yang sudah tersimpan, lalu simpan. Mengubah kelas/tanggal/sesi membatalkan konfirmasi sebelumnya. Setelah simpan, edit berikutnya meminta konfirmasi kembali. Tautan riwayat memuat tanggal dan sesi yang dipilih, termasuk navigasi tanpa reload halaman.
5. Admin membuka **Akademik → Ubah Jam Pembelajaran**. Gunakan contoh Senin, Selasa–Kamis, atau Jumat dari lampiran; atau pilih **Tambah profil jam**. Admin dapat memilih hari berlaku, mengubah waktu/keterangan, menambah jam pelajaran atau istirahat/kegiatan, dan menghapus baris. Profil referensi memerlukan hari berlaku dan konfirmasi pemeriksaan. Revisi disimpan sebagai versi baru.

Nomor jam pada jadwal diturunkan dari profil referensi hari yang sesuai. Acuan lampiran digunakan jika belum ada profil referensi. Rentang waktu yang tidak tepat sesuai batas jam tetap menampilkan waktu jadwal tanpa mengarang nomor jam. Mengubah profil tidak menulis ulang jadwal atau jurnal historis.

## Batas operasi

- Akses jurnal bersama berlaku untuk akun guru, termasuk guru piket, dan sesi dengan penugasan terverifikasi. Identitas guru terjadwal tetap; akun yang mengubah tersimpan pada audit.
- Backend memeriksa kecocokan kelas/periode/sesi, tanggal, konfirmasi, revisi, alasan koreksi, dan kunci periode.
- Perubahan jurnal bersama tidak mengubah absensi sesi maupun kehadiran harian. Payload absensi pada operasi tersebut ditolak. Hak absensi dan nilai tetap mengikuti penugasan guru masing-masing.
- Profil jam hanya dapat diubah admin. Jam terbalik/bertumpang tindih, nomor tidak berurutan, profil referensi tanpa hari, hari referensi ganda, dan versi lama ditolak.

## Tampilan

Pada HP, tombol **Menu fitur** membuka navigasi fitur dan menutup kembali setelah pindah halaman. Form jam memakai susunan vertikal pada layar sempit; dialog konfirmasi mengikuti lebar layar dan dapat digulir jika tinggi terbatas. Kontrol memiliki ruang sentuh dan input ponsel memakai ukuran font 16px. Tabel lebar dapat digeser di dalam kontainernya.

Pada desktop, konten memakai ruang yang tersedia sampai lebar shell 1920px. Sidebar berukuran 230–256px; form dan tabel tidak dipaksa ke kolom tengah yang sempit.

## Pengujian akhir

**64 kelompok pemeriksaan PASS, 0 FAIL/ERROR.** Angka adalah kelompok pengujian; beberapa mencakup banyak klik dan pemeriksaan integritas berulang.

| Runner | PASS |
| --- | ---: |
| `tsx_complete_workflows.cjs` | 18 |
| `tsx_crud_sidebar.cjs` | 15 |
| `tsx_document_buttons.cjs` | 4 |
| `tsx_admin_button_followup.cjs` | 6 |
| `tsx_teacher_comparison.cjs` | 4 |
| `tsx_import_report_buttons.cjs` | 5 |
| `tsx_shared_journal_bells.cjs` | 8 |
| `tsx_responsive_portals.cjs` | 4 |

Skenario khusus memakai empat guru dalam satu hari, pada jam **1–2, 3–4, 5–6, 7–8**. Keempat akun berhasil mengedit jurnal sesi guru lain setelah konfirmasi. Pengujian mencakup batal/Escape, pergantian kelas dan tanggal, tautan riwayat, penyimpanan dan reload, serta penolakan konteks salah/versi usang/periode terkunci. Checksum tabel absensi sesi dan harian tetap sama setelah edit jurnal lintas guru.

Pengujian responsif mencakup **40 halaman/konteks peran**, masing-masing pada lebar **320, 390, 768, 1024, 1440, 1920px**. Selain lebar halaman dan batas kontrol, diuji form jam lengkap, dialog konfirmasi, lebar konten desktop, serta buka/tutup menu HP. Tabel yang memang digulir di dalam kontainer diperiksa sebagai scroll lokal, bukan luapan halaman.

Regresi mencakup CRUD tujuh master, akun, jadwal/penugasan, kalender, profil jam, absensi, nilai, ekskul, impor, rekonsiliasi piket, publikasi/penarikan rapor, kenaikan/alumni, audit, unduhan, dan 55 tautan sidebar. TypeScript, sintaks runner baru, pemeriksaan whitespace, dan build produksi berhasil.

Semua tes tulis memakai database sintetis terpisah dari schema, tanpa menyalin baris sekolah. Source aplikasi uji dibandingkan dengan `src` workspace; checksum database utama tetap sama. Lokasi bukti sementara:

- `/tmp/sia-journal-regression-20261105/reports/` untuk regresi.
- `/tmp/sia-journal-bells-20261105-r2/reports/final-summary.json` untuk ringkasan gabungan.
- `/tmp/sia-journal-bells-20261105-r2/screenshots/` untuk form jam dan dialog pada enam lebar layar.

Uji khusus dijalankan pada fixture baru dengan `tests/tsx_teacher_setup.py --paperless`; runner memerlukan `SIA_ADMIN_STATE` dan `SIA_ADMIN_URL` yang menunjuk fixture eksternal tersebut. Pengujian dilakukan dengan Chromium dan ukuran viewport, bukan HP fisik atau seluruh browser seluler. Dialog printer fisik dan beban produksi tidak termasuk audit ini. Laporan sementara tidak masuk Git dan dapat hilang saat lingkungan dibersihkan.
