# Audit lokal autentikasi, CRUD Admin dan alur akun — 6 November 2026

**Pembaruan setelah audit:** atas permintaan berikutnya, 49 akun tes acak dihapus dan delapan akun utama diubah ke username email. Jumlah akun lokal sekarang **8, semuanya aktif**. Angka 57 dan nama `uji_*` dalam hasil audit di bawah merupakan kondisi sebelum pembersihan. Lihat [daftar akun terbaru](../test.md) dan [bukti pembersihan](evidence/ACCOUNT_CLEANUP_2026-11-06.json). Data akademik tetap utuh; tidak ada commit.

**Hasil akhir: 110 kelompok uji lolos, 0 gagal, pada 12 suite.** Pemeriksaan TypeScript, build production Next.js 16.4.3 dan `git diff --check` berhasil. Tidak ada commit; HEAD tetap `5e39b47`.

Aplikasi lokal berjalan di **http://127.0.0.1:3000/auth/login**. Pengujian browser menggunakan Chromium. Delapan akun demo dipakai untuk login dan navigasi pada database lokal sebenarnya; semua pengujian tulis, penghapusan, rollback dan perubahan password memakai fixture sintetis terpisah. Fingerprint isi seluruh tabel membuktikan baris database lokal tidak berubah: **57 akun tetap ada, 8 aktif**. Akun hasil registrasi pada fixture juga dipertahankan.

## Jawaban untuk empat permintaan Admin

| Permintaan | Hasil verifikasi |
|---|---|
| Siswa terdaftar tidak muncul lagi di select | Lolos. Pada `/admin/penugasan` → Keanggotaan kelas, pilihan Siswa menyembunyikan siswa yang sudah ditetapkan pada periode tersebut. |
| Tombol Cabut dan pemilihan kembali | Lolos. Cabut memiliki modal konfirmasi dan alasan; batal tidak mengubah data. Setelah dicabut, siswa dapat dipilih lagi. Keanggotaan bersejarah ditutup rentangnya; penetapan baru memperoleh ID baru dan mulai setelah rentang lama. Nilai serta absensi historis tidak berubah. |
| Form Tambah/Edit/aksi menggunakan modal, serta Hapus Akun | Lolos. Form pengelolaan Admin dan konfirmasi Hapus/Cabut/Pulihkan tetap pada halaman terkait. Hapus Akun menolak penghapusan Admin aktif terakhir, mencabut sesi akun yang dihapus, dan tidak menyertakan password dalam audit. |
| Jarak pencarian Alumni dan responsivitas | Lolos. Jarak input ke tabel minimal 16 px; halaman dan modal diperiksa pada lebar 320, 390, 768 dan 1440 px. |

Fitur empat poin tersebut sudah ada pada kode awal audit dan sekarang telah diuji ulang. Perubahan sesi ini terutama menambahkan registrasi/pemulihan password, menghapus pengisian akun uji pada login, menyatukan aturan API akun, dan memperbarui pengujian/dokumentasi. Dashboard `/admin` adalah pintu masuk; halaman periode/roster sebenarnya berada di `/admin/penugasan`.

## Temuan yang ditangani

- Halaman login mengisi `uji_guru` dan password demo, serta menampilkan tombol pengisian cepat akun. Keduanya dihapus; formulir sekarang kosong.
- Registrasi belum tersedia. `/auth/register` menerima Guru/Siswa yang identitas aktifnya sudah ada pada master dan belum memiliki akun. Pendaftaran disimpan nonaktif sampai Admin memverifikasi identitas melalui modal **Setujui pendaftaran**. Pendaftar tidak dapat memilih hak Admin/Kepala Sekolah atau langsung memperoleh sesi.
- Alur lupa password belum jelas. `/auth/forgot-password` menjelaskan verifikasi melalui Admin. Manajemen Akun menyediakan modal **Reset password** untuk menerbitkan tautan 30 menit, sekali pakai. Tautan baru menggantikan yang lama; password/status yang berubah membatalkan tautan terkait. Reset berhasil membatalkan sesi lama.
- Dua jalur API akun memiliki implementasi terpisah. Jalur katalog Admin kini menggunakan pengelolaan akun yang sama agar persetujuan registrasi dan perlindungan Admin terakhir konsisten.
- Ekspektasi tanggal pada uji Cabut lama sudah kedaluwarsa. Pengujian sekarang menghitung tanggal setelah pencabutan dan jadwal Jumat berikutnya.
- `uji_guru_lain` memiliki tugas Piket aktif 1–10 November pada database lokal. Login menuju `/piket` merupakan perilaku yang benar; menu mengajar tetap tersedia. Panduan dan pengujian mengikuti penugasan aktif tersebut.

## Cakupan pengujian

| Suite | Kelompok lolos |
|---|---:|
| Delapan akun lokal, seluruh menu dan integritas data | 9 |
| Alur lengkap: master, penugasan, impor, absensi, nilai, ekskul, Piket, rapor, kenaikan, Kepsek, siswa, ekspor, sesi | 18 |
| CRUD master, tombol dan 55 klik sidebar lintas peran | 15 |
| Registrasi, persetujuan Admin, reset, perubahan password dan kasus penolakan | 10 |
| Cabut, Hapus, modal, rollback dan spacing Alumni | 9 |
| Pulihkan arsip dan penolakan konflik | 4 |
| Transfer jurnal CSV/XLSX, preview/konfirmasi, filter, isi PDF dan mobile | 9 |
| Jurnal harian, urutan sesi dan kelengkapan PDF | 4 |
| Jurnal bersama, empat guru, konfirmasi konteks dan versi jam | 8 |
| Edit jadwal, konflik, versi, periode terkunci dan riwayat | 8 |
| Evaluasi Kepsek pada periode aktif/arsip, izin dan konflik versi | 9 |
| Guru Piket yang juga mengajar, impor absensi dan kalender | 7 |
| **Total** | **110** |

Pengujian akun lokal membuka **82 tautan fitur** pada delapan konteks akun. Kasus negatif mencakup lintas peran/identitas, duplikasi, CSRF, password tidak valid, tautan reset kedaluwarsa/dipakai ulang, perubahan bersamaan, konflik jadwal/keanggotaan, dan kegagalan transaksi yang disimulasikan. Pengujian ekspor memeriksa isi PDF/CSV/XLSX, bukan hanya status unduhan.

## Yang masih perlu diperhatikan

- Email reset otomatis belum dikonfigurasi. Saat ini Admin memberikan tautan secara pribadi setelah verifikasi. Pemulihan Admin tunggal yang lupa password memerlukan pengelola server; tidak disediakan pintu masuk tanpa autentikasi.
- Data mengajar masih berupa demo: 4 guru, 2 mapel, 11 jadwal aktif untuk 2 kelas; master memiliki 411 siswa dan 36 kelas. Kelengkapan data sekolah perlu diisi Admin sesuai kondisi riil.
- Tabel identitas pada SQLite existing belum memiliki constraint PK/UNIQUE. Validasi dan transaksi aplikasi diuji; migrasi constraint database tidak dilakukan dalam audit ini.
- Pengujian layar HP menggunakan viewport Chromium, bukan perangkat fisik atau semua browser. Kelulusan berlaku untuk skenario yang tercatat dalam bukti; bukan klaim bahwa setiap kemungkinan input telah diuji.
- Data akademik yang sudah digunakan tetap dilindungi: hapus mengarsipkan data bersejarah, perubahan konteks terkunci ditolak, dan audit tidak dapat dihapus bebas. Hak Admin tetap mengikuti integritas riwayat.

Panduan langkah tiap akun, register, persetujuan, lupa password dan simulasi manual tersedia di [test.md](../test.md). Bukti tersanitasi: [LOCAL_AUTH_CRUD_AUDIT_2026-11-06.json](evidence/LOCAL_AUTH_CRUD_AUDIT_2026-11-06.json).

Laporan mentah, log dan salinan fixture dengan akun yang dipertahankan berada di `runtime/local-audit-20261106/` (diabaikan Git). Kredensial fixture tersimpan privat bersama fixture, bukan dalam laporan publik. Runner: `node tests/tsx_local_audit.cjs`, tambahan jurnal/supervisi dengan `--extended`, dan navigasi akun lokal saja dengan `--local-only`. Jangan menjalankan runner lokal terpisah bersamaan dengan supervisor audit lain yang akan menghentikan server port 3000.
