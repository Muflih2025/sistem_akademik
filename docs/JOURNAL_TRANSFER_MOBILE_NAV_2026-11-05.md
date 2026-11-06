# Navigasi HP dan impor/ekspor jurnal — 5 November 2026

Perubahan melanjutkan `5f0c4fa` pada branch `rebase-tsx`.

## Penggunaan

- Desktop: sidebar putih memenuhi tinggi layar di bawah header/navbar tetap. Menu panjang dapat digulir. Tabel lebar memiliki ruang baca per kolom dan dapat digeser di dalam wadahnya.
- HP: baris navigasi menampilkan modul / fitur aktif. **Pilih modul** dan **Menu fitur** membuka popup. Memilih tautan menutup popup dan berpindah halaman; Escape atau **Tutup** juga menutupnya.
- Jurnal: tekan **Ekspor jurnal** atau **Impor jurnal** pada halaman jurnal. Pilihan tersedia untuk satu kelas atau seluruh kelas, periode, tanggal tertentu atau rentang tanggal, dan filter hari. Menu impor umum juga mempunyai modul **Jurnal kelas**.
- Ekspor CSV/XLSX memuat identitas sesi, kelas, guru, mapel, tanggal, revisi, dan isi jurnal agar dapat diimpor kembali. PDF memakai rincian per pertemuan dengan identitas periode, kelas, dan tanggal pilihan.
- Impor: unduh template atau gunakan ekspor CSV/XLSX, isi materi pada sesi yang diperlukan, unggah dengan alasan, periksa pratinjau, lalu centang konfirmasi dan simpan. Baris tanpa materi diabaikan. Jangan mengganti identitas sesi, format tanggal `YYYY-MM-DD`, atau revisi.

Admin/guru dapat mengimpor jurnal kelas bersama sesuai hak edit jurnal yang sudah ada. Kepala sekolah hanya dapat mengekspor. Hak absensi sesi dan nilai tetap mengikuti penugasan guru. Impor jurnal tidak mengubah absensi atau nilai.

## Validasi

Rentang ekspor maksimal 370 hari dan berada dalam periode yang dipilih. Template mengikuti hari jadwal, tanggal penugasan, periode terverifikasi, hari efektif, libur, dan batas hari ini. Maksimal 1.000 baris / 5 MB per impor; persempit pilihan jika template melampaui batas.

Server memeriksa identitas kelas/guru/mapel, tanggal, nomor pertemuan positif, revisi, periode terkunci, dan identitas ganda. Pratinjau menjalankan validasi dalam transaksi yang dibatalkan. Penyimpanan memerlukan konfirmasi, token milik akun yang sama, dan sumber yang belum berubah; kegagalan satu baris membatalkan seluruh batch.

CSV dibaca sebagai teks literal untuk mempertahankan NIS/ID dan tanggal tanpa pergeseran zona waktu. Pengamanan formula ekspor tetap berlaku; impor jurnal memulihkan teks literal termasuk awalan apostrof/tanda minus dan baris baru. Rumus XLSX ditolak. Pilihan modul impor menunggu inisialisasi peran agar pilihan pengguna tidak tertimpa pengaturan awal.

## Hasil uji

**69 kelompok uji lulus, 0 gagal**, dengan HTTP dan Chromium pada database sintetis terpisah. Hash database sekolah tetap sama. Hasil ini menghitung kelompok pemeriksaan, bukan jumlah tombol atau kasus individual.

| Suite | Lulus |
|---|---:|
| Impor/ekspor jurnal, isi PDF aktual, validasi, popup, navigasi HP | 9 |
| Responsif 40 halaman lintas peran pada lebar 320–1920 px | 4 |
| Referensi popup admin dan tinggi sidebar/navbar | 4 |
| Jurnal bersama empat guru dan versi jam pembelajaran | 8 |
| Alur lengkap lintas peran | 18 |
| CRUD dan sidebar | 15 |
| Tombol admin, jadwal, audit, periode, evaluasi | 6 |
| Impor absensi/nilai serta penarikan/penerbitan rapor | 5 |

Build production Next.js 16.4.3 dan pemeriksaan TypeScript lulus; 82 halaman dihasilkan. Sumber snapshot build dibandingkan byte demi byte dengan repository. Perbaikan tampilan tabel diuji kembali melalui suite responsif; perbaikan teks impor diuji kembali melalui suite jurnal.

Bukti tersanitasi: [JOURNAL_TRANSFER_MOBILE_NAV_2026-11-05.json](evidence/JOURNAL_TRANSFER_MOBILE_NAV_2026-11-05.json). Script baru: [tsx_journal_transfer.cjs](../tests/tsx_journal_transfer.cjs). Suite ini memerlukan fixture baru dari `tsx_teacher_setup.py`, Chromium sesuai konfigurasi pengujian, dan Python dengan `pypdf` melalui `SIA_PDF_PYTHON` untuk memeriksa teks PDF sebenarnya.
