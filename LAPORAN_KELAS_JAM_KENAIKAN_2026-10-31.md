# Kelas, editor jam, kenaikan dan alumni — checkpoint development

Tanggal: **31 Oktober 2026, Asia/Jakarta**. Branch: `development/academic-workflows-20261031`. Commit kode: **`1499177`**. URL: **http://127.0.0.1:18125**. Hasil akhir **740 PASS, 0 FAIL, 0 SKIP**. Tidak ada aktivasi ke 8085.

## Fungsi yang tersedia

**36 kelas acuan sekolah:** X/XI/XII × PPLG/AKL/PM/MPLB × paralel 1/2/3. Ditambahkan **23 kelas** tanpa mengubah 13 existing, termasuk PM 3 dan XI PPLG 1/2 sesuai penegasan pengguna. Kelas tambahan kosong sampai diberi siswa/jadwal secara sah. Database juga mempunyai kelas fixture Uji/F; 36 merupakan katalog sekolah, bukan jumlah seluruh kelas fixture. Admin dapat menambah, memperbaiki nama, memfilter tingkat/jurusan dan menonaktifkan kelas. Tingkat/jurusan yang telah dipakai anggota historis dilindungi dari perubahan konteks.

**Jam Belajar:** tiga pola Senin, Selasa–Kamis dan Jumat, berdampingan pada desktop dan bertumpuk pada HP. Admin dapat mengubah mulai/selesai, nomor pelajaran, keterangan/status/catatan, menambah atau menghapus baris, mengisi alasan dan menyimpan. Waktu terbalik/bertumpang tindih, nomor ganda/tidak urut, alasan kosong, pemeriksaan yang kurang dan formulir versi lama ditolak. Penyimpanan membuat versi baru serta audit dengan identitas Admin; versi lama tetap utuh. Selain Admin hanya membaca versi terbaru. Pilihan kelas menampilkan pola umum yang sama; tidak membuat penugasan guru/mapel atau mengubah jadwal/pertemuan existing.

**Naik Kelas seluruh siswa:** Admin memilih Genap asal dan Ganjil tahun berikutnya yang terverifikasi dan tidak dikunci. Sumber merupakan anggota yang berlaku pada akhir periode asal. Pemetaan X→XI dan XI→XII harus pada jurusan yang sama; XII→Alumni. Admin mengisi dasar keputusan, memeriksa pratinjau lalu mengonfirmasi penerapan. Pratinjau tidak menulis database; token terikat akun/session, berlaku 15 menit dan sekali pakai. Commit memvalidasi snapshot ulang dan menyimpan seluruh batch dalam satu transaksi. Data berubah setelah pratinjau, tujuan berisi anggota/histori, rentang bentrok, penggabungan kelas otomatis, siswa ganda/nonaktif, periode terkunci dan batch berulang ditolak.

Hasil berupa anggota kelas baru sejak awal periode tujuan, nomor absen dipertahankan, detail per siswa, calon alumni/alumni, aktor dan audit. Keanggotaan lama, nilai, rapor, absensi, jurnal serta akun/password tidak dipindah, dihapus atau direset. Periode aktif tidak diganti otomatis. Master Siswa menampilkan kelas dari keanggotaan yang berlaku **hari ini**, sementara referensi kelas master lama dipertahankan. Kenaikan bertanggal mendatang belum mengubah kelas hari ini. Keanggotaan yang dirujuk batch dan batas periode yang sudah dipakai dilindungi dari perubahan.

**Alumni:** pencarian NIS/nama/kelas, tautan batch dan pagination. Sebelum tanggal berlaku ditandai calon alumni, sesudahnya alumni. Identitas dan akses rapor terbit historis tetap mengikuti RBAC. Form keanggotaan biasa menolak pendaftaran setelah tanggal kelulusan. Penerimaan kembali alumni memerlukan workflow tersendiri.

**Siswa baru:** Master Siswa → tambah siswa → keanggotaan kelas X bertanggal di Akademik. Pilihan siswa pada form anggota dibatasi 50 hasil, dengan pencarian NIS/nama; siswa yang sedang diedit tetap tersedia.

**Pagination backend:** master siswa/guru/kelas/jurusan/mapel, akun, periode, anggota, batch/detail, alumni, rapor dan jurnal menggunakan 20 baris per halaman. Piket dibatasi 6 kelas per halaman. COUNT/LIMIT/OFFSET dan filter berlaku di server. Roster absensi satu kelas tetap lengkap saat disimpan agar siswa tidak hilang karena pagination.

## Database dan pengamanan

Migration additive **008_student_progression.php** menambah `ak_kenaikan_batch` dan `ak_kenaikan_detail`, dengan foreign key dan unique `(nis, periode_asal)`. Tidak ada DROP/TRUNCATE/reset/backfill. Migration hanya dijalankan melalui CLI terkontrol pada `sia_academic_dev_20261031`.

Runtime tetap non-root, terpisah dari owner migration. Tabel jam memperoleh SELECT/INSERT untuk versi baru; dua tabel kenaikan juga SELECT/INSERT, tanpa UPDATE/DELETE atau privilege DDL. Grant aktif tidak diubah. Audit dan snapshot tetap append-only. Login tidak menjalankan DDL atau membuat akun default. CSRF, revokasi sesi, RBAC/IDOR dan proteksi SQL/Git/config/log tetap diuji.

**389 siswa dari Excel kelas X tidak dinaikkan otomatis.** Isi dan nomor absen tetap cocok dengan sumber. Mereka masih memakai periode fixture Ganjil sebelumnya; Admin harus menyiapkan keanggotaan Genap dan periode tujuan sebelum memproses cohort tersebut. Sistem tidak menentukan kelayakan kenaikan dari nilai secara otomatis: keputusan berasal dari Admin dengan dasar yang dicatat.

## Pengujian aktual

| Suite | PASS | FAIL | SKIP |
|---|---:|---:|---:|
| HTTP akademik | 189 | 0 | 0 |
| Kasus batas | 50 | 0 | 0 |
| Kelengkapan fungsi / isi ekspor | 47 | 0 | 0 |
| Alur browser CRUD/akademik | 19 | 0 | 0 |
| Browser responsif dan role | 154 | 0 | 0 |
| Login/layout | 27 | 0 | 0 |
| Data kelas X | 25 | 0 | 0 |
| Browser kelas X | 13 | 0 | 0 |
| HTTP jam/kenaikan/alumni/pagination | 49 | 0 | 0 |
| Browser jam/kenaikan/alumni | 28 | 0 | 0 |
| Integritas/restore/restart | 139 | 0 | 0 |
| **Total** | **740** | **0** | **0** |

Uji massal memakai **45 siswa khusus testing**: 23 X, 1 XI, 21 XII. Hasil **24 anggota tujuan dan 21 calon alumni**, dibaca kembali setiap NIS/kelas/nomor. Seluruh anggota asal serta tabel jadwal, nilai, absensi dan snapshot rapor dibandingkan sebelum/sesudah dan tetap sama. Browser terpisah benar-benar menekan Pratinjau/Terapkan untuk tiga siswa, menyimpan, reload serta membaca hasil/alumni kembali. Batch 45 siswa ditampilkan 20+20+5, anggota X PPLG 2 menjadi 20+15; daftar periode maksimum 20 dan Piket 6 kelas. Semester/tingkat/jurusan salah, periode terkunci, tujuan terisi, stale preview, replay serta pengeditan histori ditolak backend.

Browser mengubah jam, menambah kegiatan, menyimpan, menghapus kegiatan dan mengembalikan jam gambar melalui **versi baru**, tanpa menghapus versi uji. Screenshot aktual 320/375/430/768/1440px diperiksa, termasuk form Admin dan Naik Kelas/Alumni. Menu Admin yang sempat ikut tampil di pager umum dibuang; browser memeriksa guru tidak melihat tautan Naik Kelas/Alumni.

Satu percobaan sebelumnya gagal pada pengukuran lebar form edit 320px. Pemeriksaan ulang lima kali menunjukkan lebar normal; tes diperbaiki agar menunggu navigasi lengkap, font dan tata letak stabil. Bukti gagal tetap disimpan privat. **Suite lengkap terakhir setelah koreksi 740/0/0.** Lint PHP **108 berkas** dan **97 foreign key tanpa orphan** termasuk verifikasi integritas. Tidak ada klaim pengujian HP fisik, beban atau multi-worker.

## Backup, restore dan integritas

- Backup gzip privat dibuat sebelum editor/kenaikan dan kembali setelah regresi. Restore terakhir ke database baru **`sia_academic_test_restore_0b3f84`** cocok semua schema/data/objek: **43 tabel, 9.696 baris**. SHA-256 backup: `905f03295889ffd36f41274138a4ab99a35ecff5232efe7a24c1351dda297ca7`.
- Restart hanya unit development 18125 berhasil; sesi dan hash DB bertahan. Startup dengan credential salah gagal tertutup; konfigurasi benar dipulihkan dan login diuji lagi.
- Konfigurasi, User, PID dan waktu mulai layanan **8085 tetap sama**. Hash semua file proyek Laravel dan release R0 aktif tetap sama. Perubahan `.gitignore` dan Excel baru milik pengguna di target original dipertahankan menurut baseline sebelum tugas; baseline audit lama tidak ditimpa.
- Schema/data/view/trigger/routine DB aktif tetap cocok, fingerprint kanonis `259ce5469f2ab4a2c5c19e38b7854bb204722b1111c9a3496b29251e49a0cdef`. Seluruh **18 penugasan legacy** tetap dipertahankan.
- Credential, dump/backup, session, ledger identitas dan Excel tidak masuk Git/document root. Tidak ada migrasi framework, Docker, grant aktif atau deployment publik.

Pemulihan eksperimen menggunakan backup ke database baru, verifikasi snapshot, lalu pergantian konfigurasi development secara terkontrol. Jangan menghapus batch/detail/versi atau mengimpor backup ke DB existing. Rollback kode lama saja belum disertifikasi: view jam checkpoint lama membaca semua versi, sehingga pemulihan memerlukan pasangan kode dan salinan backup sebelum fitur. Restore salinan terbaru telah diuji; rollback otomatis batch dan restore menimpa DB existing tidak disediakan.

## Cara mencoba

Login Admin **`uji_admin`** pada [halaman login](http://127.0.0.1:18125/auth/login.php), memakai password testing existing yang tidak diubah. Password tidak dicetak pada laporan atau masuk Git; credential fixture tetap pada state privat.

1. [Kelola kelas](http://127.0.0.1:18125/admin/master.php?table=kelas): filter tingkat/jurusan, tambah/perbaiki nama/nonaktifkan bila sesuai. XI + jurusan PM menghasilkan tiga kelas sekolah.
2. [Jam Belajar](http://127.0.0.1:18125/academic/index.php?view=jam): Ubah Jam → sesuaikan baris → alasan/catatan/status → konfirmasi pemeriksaan bila diperlukan → Simpan Jam → reload/riwayat.
3. [Naik Kelas](http://127.0.0.1:18125/academic/index.php?view=kenaikan): pilih Genap asal secara eksplisit. Tahun sekolah tidak ditebak dari tahun sekarang.
4. **Uji tiga siswa dummy yang belum diproses:** [buka fixture manual](http://127.0.0.1:18125/academic/index.php?view=kenaikan&periode_asal=69). Sumber ID **69**, tujuan ID **70**, label **5857/5858 Genap (DATA UJI)**. Tahun jauh di depan adalah ruang uji sintetis, bukan kalender sekolah resmi. Kelas berlabel Uji; petakan X→XI dan XI→XII dengan akhiran kode yang sama, XII→Alumni. Pratinjau lalu konfirmasi; hasil harus 2 naik dan 1 calon alumni. Jangan memproses periode lain tanpa meninjau data.
5. [Alumni](http://127.0.0.1:18125/academic/index.php?view=alumni): cari siswa dummy yang diluluskan, reload, periksa tanggal dan tautan batch. Tanggal berlaku mendatang masih calon alumni.
6. [Master Siswa](http://127.0.0.1:18125/admin/master.php?table=siswa) serta Akademik tetap menyediakan siswa baru dan anggota bertanggal. Gunakan pencarian NIS/nama untuk siswa di luar 50 opsi pertama.

Server aktif. Dari `/home/muflih/sia-academic-dev` gunakan `python3 ops/academic_server.py status` atau `start` bila diperlukan; jangan menjalankan setup ulang pada DB existing. Jalankan pengujian ketika tidak ada pengisian manual bersamaan:

```bash
python3 tests/run_academic.py --with-kelas10 --with-progression \
  --baseline-directory /home/muflih/.local/state/sia-academic-dev/20261031/reports/kelas10-baseline
```

Runner menambah fixture unik tanpa reset. Menjalankan ulang memperbarui link fixture manual pada laporan privat `reports/progression-manual-guide.json`; link Git ini adalah checkpoint saat penulisan.

## Batas tersisa

Jam adalah pola umum sekolah; guru/mapel dan jadwal kelas tetap ditetapkan Admin. Jumat **10:50–11:40**, serta jeda hingga **13:00**, dipertahankan dari gambar dengan status perlu konfirmasi sampai Admin memeriksanya. Tidak ada perubahan retroaktif ke jadwal/pertemuan.

Kenaikan tahunan tersedia. Perpindahan semester Ganjil→Genap, mutasi khusus/tinggal kelas sebagian, penyetaraan nilai, penerimaan kembali alumni dan pembatalan batch dengan audit memerlukan workflow lanjutan. Tidak ada undo destruktif. Validasi kalender/kurikulum/cetakan resmi dan 18 penugasan ambigu tetap memerlukan keputusan sekolah. Produksi, LAN, HP fisik dan uji beban belum diklaim.

## Berkas dan bukti

Commit kode `1499177` berisi 30 file: controller/layout dan view jam/fondasi/home/Piket/jurnal/rapor, view kenaikan/alumni baru; `admin/master.php`, `admin/tahun_ajaran.php`; CSS/JS akademik; service baru `config/academic/bells.php` dan `progression.php`, pengamanan fondasi/master; helper CRUD/pager; migration 008; CLI katalog kelas dan penyesuaian setup; suite HTTP/browser baru dan penyesuaian runner/integritas/kelas X; panduan serta matriks fungsi.

Daftar persis: `git show --name-only 1499177`. Bukti tersanitasi: **`docs/evidence/KELAS_JAM_KENAIKAN_TEST_RESULTS.json`**. Bukti rinci, screenshot dan backup berada privat di `/home/muflih/.local/state/sia-academic-dev/20261031/`. Laporan/bukti checkpoint 652 PASS sebelumnya tetap disimpan sebagai catatan historis.
