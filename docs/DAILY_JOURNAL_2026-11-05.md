# Jurnal harian per kelas

Pada popup **Ekspor jurnal**, pilih kelas dan tanggal, lalu biarkan **Guru: Semua guru** untuk menggabungkan seluruh jurnal tersimpan pada hari itu. Tanggal juga dapat berupa rentang dan kelas dapat dipilih seluruhnya. Pratinjau dikelompokkan per kelas/periode/tanggal dan diurutkan menurut jam jadwal. Mengganti kelas atau periode mengembalikan filter guru ke Semua guru.

PDF menampilkan satu tabel harian dengan kolom nomor, jam/pertemuan, guru, mapel, TP/ATP dan materi, kegiatan, refleksi/tindak lanjut, serta catatan. Catatan menyertakan guru pengganti dan ketidakhadiran jika ada. Guru yang mengajar beberapa sesi tetap mempunyai beberapa baris. Setiap kelompok kelas/tanggal dimulai pada halaman baru; isi panjang dapat berlanjut ke halaman berikutnya dengan identitas kelas/tanggal/periode dan header tabel diulang.

Pengisian, edit, dan penyimpanan tetap per sesi. Laporan memuat jurnal yang sudah tersimpan. CSV/XLSX tetap menggunakan format yang dapat diimpor kembali. Filter guru juga berlaku pada ekspor data, template, dan validasi impor. Hak akses dan konfirmasi edit jurnal tetap berlaku.

## Validasi

13 kelompok uji lulus: 9 regresi impor/ekspor dan 4 kelompok khusus jurnal harian. Pemeriksaan memakai HTTP, Chromium, dan teks serta jumlah halaman PDF aktual pada database sintetis terpisah. Hash database sekolah tidak berubah.

- Enam sesi, enam mapel, lima guru; satu guru muncul dalam dua sesi. Keenam sesi biasa muat dalam satu halaman PDF.
- Filter guru menghasilkan dua sesi milik guru tersebut; referensi guru yang tidak sesuai kelas ditolak, dan siswa tidak dapat mengekspor jurnal.
- Rentang dua tanggal dan dua kelas menghasilkan kelompok terpisah; isi 150 baris tetap utuh pada halaman sambungan.
- Popup menampilkan kelompok harian, unduhan PDF nyata mengikuti filter, pilihan guru direset saat kelas berubah, serta tampilan sesuai lebar 320, 390, dan 1440 px.
- Regresi pratinjau/konfirmasi impor CSV/XLSX, revisi, transaksi, periode terkunci, serta pemisahan absensi/nilai tetap lolos.

Build production dan TypeScript Next.js 16.4.3 lulus (82 halaman). Snapshot sumber build sama dengan repository. Bukti: [DAILY_JOURNAL_2026-11-05.json](evidence/DAILY_JOURNAL_2026-11-05.json). Script: `tests/tsx_daily_journal.cjs`, menggunakan fixture eksternal dari `tsx_teacher_setup.py` dan Python dengan `pypdf` melalui `SIA_PDF_PYTHON`.
