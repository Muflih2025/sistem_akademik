# Uji manual perbaikan Guru / Guru Piket — 4 November 2026

Panduan ini untuk branch `rebase-tsx` (Next.js + SQLite). Panduan PHP di port 18125 merupakan lingkungan berbeda. XAMPP tidak menjalankan kode TSX ini.

## Menjalankan website

Dari `/home/muflih/sistem_akademik`:

```bash
pnpm dev --hostname 127.0.0.1 --port 3000
```

Buka `http://localhost:3000/auth/login`. Jika server sudah berjalan saat mengambil patch, hentikan **proses development tersebut** dengan Ctrl+C lalu jalankan lagi. Jangan menghentikan layanan 8085. Jangan mengganti database atau menjalankan ulang impor SQL.

Akun development yang diverifikasi read-only: `uji_guru` dan `uji_piket`, gunakan password testing yang telah Anda kirim. Password tidak dicantumkan dalam repository atau laporan. Pengujian otomatis menggunakan password acak berbeda pada database sintetis terisolasi.

`uji_guru` adalah guru mapel dan **belum ditugaskan sebagai Guru Piket**. `uji_piket` memiliki penugasan piket periode Juli–Desember 2026. Hak piket diperiksa kembali di server setiap permintaan. Peran dari localStorage bukan dasar izin.

Gunakan hanya data testing dan jangan mengoreksi data sekolah historis. Catat kelas, mapel, tanggal, dan hasil setiap langkah.

## Guru: jadwal dan jurnal Senin–Jumat

1. Login sebagai `uji_guru`. Buka **Mengajar → Jadwal Mengajar**.
2. Pilih tanggal Senin 26 Oktober 2026. Ulangi dengan 27, 28, 29, dan 30 Oktober. Jadwal hanya muncul jika guru memang memiliki penugasan terverifikasi pada hari/tanggal tersebut; jadwal kosong tidak berarti boleh memakai jadwal guru lain.
3. Klik **Riwayat / Isi Jurnal** pada salah satu jadwal. Pastikan kelas, mapel, dan tanggal tetap sesuai jadwal yang diklik.
4. Isi **Pertemuan ke**, **Materi pembelajaran**, TP/ATP, kegiatan, refleksi, tindak lanjut, dan catatan sesuai kebutuhan testing.
5. Klik **Simpan Jurnal**. Harus muncul pesan berhasil. Reload: materi dan kolom lainnya tetap tersimpan; jurnal juga muncul di riwayat.
6. Ubah materi, isi **Alasan koreksi**, lalu simpan. Reload dan periksa lagi.
7. Pilih tanggal yang tidak sesuai hari jadwal. Harus muncul penolakan dengan ikon silang dan form tidak dapat disimpan. Jangan mengartikan tanggal apa pun sebagai jadwal mengajar yang sah.
8. Untuk menguji penolakan simpan server, isi materi lebih dari 5000 karakter pada data testing. Harus muncul pesan gagal dengan ikon silang; data sebelumnya tetap ada.

## Guru: absensi per sesi

1. Dari jadwal yang sah klik **Buka Absen**.
2. Daftar siswa harus berasal dari keanggotaan kelas/periode jadwal. Sesi baru berstatus **Belum Dikonfirmasi**, walaupun sudah ada absensi harian sekolah.
3. Setelah memeriksa siswa, centang **Saya sudah memeriksa kehadiran siswa**, lalu klik **Tandai Semua Hadir**.
4. Ubah siswa testing yang tidak hadir ke S, I, atau A. Gunakan `?` jika belum dikonfirmasi. Isi keterangan bila perlu.
5. Jika lebih dari 10 siswa, ubah status pada halaman pertama, buka **Berikutnya**, ubah siswa lain, lalu kembali. Isian tidak boleh hilang. Pencarian juga tidak boleh menghapus isian siswa lain.
6. Isi materi jurnal dan klik **Simpan Absensi & Jurnal**. Kedua data tersimpan bersama; jika salah satu gagal, transaksi dibatalkan.
7. Reload dan cocokkan status, keterangan, ringkasan H/S/I/A/Belum, serta materi.
8. Buka mapel lain pada kelas yang sama dan kelas lain yang memang menjadi penugasan akun testing. Status sesi pertama tidak boleh ikut tersalin.
9. Buka sesi yang sama pada dua tab. Simpan koreksi pada tab pertama; tab kedua harus ditolak jika masih memakai versi lama. Muat ulang sebelum mencoba lagi.

## Guru: nilai dan buku rapor kelas

1. Buka **Penilaian → Input & Rekap Nilai**. Pilih jadwal/mapel/kelas yang sah.
2. Periksa aturan versi, bobot, dan KKM. Jika aturan belum tersedia, jangan menganggap nilai sudah bisa disimpan; pengelola perlu menyiapkan aturan melalui proses terkontrol.
3. Isi seluruh komponen berbobot untuk siswa testing. Kosong bukan nilai nol otomatis. Klik **Simpan Nilai**.
4. Reload: angka harus tetap sama. Masukkan nilai 101, negatif, atau bukan angka: harus ditolak.
5. Buka **Buku Rapor Kelas**, pilih jadwal yang sama. Nama mapel, komponen, nilai akhir, dan predikat harus tampil.
6. Contoh aturan Tugas 30%, UTS 30%, UAS 40%: 80/80/80 menghasilkan 80,00. Koreksi Tugas menjadi 90 dengan alasan; hasil akhir menjadi 83,00. Periksa buku rapor setelah reload atau **Muat ulang nilai**.
7. Pilih mapel lain. Nilai mapel pertama tidak boleh terbawa.
8. **Buku Rapor Kelas — Nilai Berjalan bukan rapor resmi terbit.** Perubahan nilai tidak otomatis mengganti snapshot rapor yang sudah diarsipkan. Penerbitan rapor masih merupakan ruang lingkup terpisah.

## Guru Piket

1. Login sebagai `uji_piket`; halaman awal harus membuka `/piket` tanpa redirect berulang.
2. Pilih tanggal dalam masa penugasan, misalnya 30 Oktober 2026. Filter kelas harus berasal dari ruang lingkup tugas piket.
3. Periksa rekap harian H/S/I/A/B serta daftar siswa tidak hadir/belum dikonfirmasi.
4. Periksa kartu jadwal guru dan status **Jurnal sudah diisi / belum diisi**. Materi jurnal tersimpan harus terlihat.
5. Klik **Tampilkan Matriks Mingguan**. Lima tanggal mengikuti minggu yang dipilih, bukan selalu minggu Oktober yang sama. Status B tidak boleh dianggap H atau A.
6. Klik **Cetak Rekap Piket** untuk memeriksa pratinjau cetak browser.
7. Login sebagai `uji_guru` tanpa penugasan piket dan buka `/piket` langsung. Server harus menolak data piket. Jangan menambah hak admin untuk mengatasi penolakan tersebut.
8. Absensi harian dan absensi sesi adalah sumber berbeda. Mengisi sesi tidak otomatis menetapkan status harian sekolah; dashboard menampilkan sumbernya secara eksplisit. Alur rekonsiliasi/koreksi harian lengkap belum diselesaikan dalam patch ini.

## Browser HP dan hasil

Uji pada lebar 320, 375, 430, 768 px dan desktop. Form utama tidak boleh melebar keluar layar; tabel rekap boleh digeser di dalam pembungkus tabel. Tombol status minimal 44 px, teks hitam, tombol utama hitam/putih.

Catat setiap kasus dengan format:

| Kasus | Role | Jadwal/mapel/kelas/tanggal | Langkah | Hasil yang diharapkan | Hasil aktual | PASS/FAIL |
|---|---|---|---|---|---|---|
| Jurnal simpan-reload | Guru | isi saat menguji | Simpan, reload | Materi tetap tersimpan | | |
| Nilai → buku rapor | Guru | isi saat menguji | Koreksi, reload rekap | Nilai dan mapel sesuai | | |
| Pantau jurnal | Guru Piket | isi saat menguji | Pilih tanggal | Status pengisian benar | | |

## Mengulang pengujian otomatis terisolasi

Buat **direktori baru di luar repository** untuk setiap run; setup sengaja menolak direktori aplikasi yang sudah ada. Tidak ada reset database.

Terminal pertama (contoh direktori baru):

```bash
python3 tests/tsx_teacher_setup.py --state /tmp/sia-teacher-review-baru --port 18128 --serve
```

Terminal kedua:

```bash
SIA_TEACHER_STATE=/tmp/sia-teacher-review-baru node tests/tsx_teacher_flows.cjs
SIA_TEACHER_STATE=/tmp/sia-teacher-review-baru node tests/tsx_teacher_recovery.cjs
./node_modules/.bin/tsc --noEmit --incremental false
```

Python di atas hanya menyiapkan fixture pengujian; website tetap dijalankan oleh Node/Next. Tidak dibutuhkan XAMPP untuk branch TSX. Runner browser memerlukan instalasi Playwright/Chromium lokal; lokasi dibaca dari `SIA_BROWSER_CONFIG` atau konfigurasi tool lokal yang tercatat di laporan. Jika tidak tersedia, runner harus melaporkan ERROR, bukan mengklaim PASS. Backup berisi fixture tetap disimpan di direktori privat, jangan dimasukkan ke Git.

Untuk menguji restart setelah backup/restore: hentikan server **sandbox** di terminal pertama, lalu jalankan kembali direktori yang sama tanpa membuat fixture ulang:

```bash
node /tmp/sia-teacher-review-baru/serve.cjs
```

Di terminal kedua:

```bash
SIA_TEACHER_STATE=/tmp/sia-teacher-review-baru node tests/tsx_teacher_recovery.cjs --after-restart
```

File `serve.cjs` dibuat oleh setup, membaca secret sandbox dari file privat, dan tidak mengubah data saat dijalankan. Jangan memakai skrip pengujian ini pada database aplikasi atau layanan aktif.
