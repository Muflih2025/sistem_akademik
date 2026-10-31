# Checkpoint data dummy kelas X dan referensi jam belajar

Tanggal: 31 Oktober 2026 (Asia/Jakarta). Branch: `development/academic-workflows-20261031`. Commit kode: `506761d`. Development: **http://127.0.0.1:18125**. Tidak ada deployment ke 8085.

## Hasil

Sumber yang digunakan adalah **`/home/muflih/sistem_akademik/data kelas 10 clean.xlsx`**, menggantikan berkas kelas XI yang salah diunggah. Berkas kelas XI hanya sempat diperiksa, **tidak diimpor**. Sumber pengganti tetap utuh dengan SHA-256:

`0edb2f32099e0a13c95fd3f4b2f37d548c931903503085ccb8fc0dd509596429`

Sebanyak **389 siswa dan 389 keanggotaan kelas bertanggal** tersimpan di database terisolasi `sia_academic_dev_20261031`, melalui login Admin serta endpoint CRUD dan impor preview/commit existing. Ditambahkan 11 kelas dan 3 jurusan; jurusan PPLG existing dipakai kembali. Tidak ada NIS existing yang ditimpa, akun siswa otomatis, penugasan guru rekaan, atau jadwal existing yang diganti.

| Kelas | Siswa |
|---|---:|
| X AKL 1 | 36 |
| X AKL 2 | 36 |
| X AKL 3 | 36 |
| X MPLB 1 | 35 |
| X MPLB 2 | 36 |
| X MPLB 3 | 36 |
| X PM 1 | 33 |
| X PM 2 | 34 |
| X PPLG 1 | 36 |
| X PPLG 2 | 35 |
| X PPLG 3 | 36 |
| **Total** | **389** |

NIS, nama, kelamin, kelas dan nomor absen sesuai Excel, diverifikasi ulang seluruh baris. Variasi spasi pada nama kelas dinormalisasi. Kolom NIS mengandung 377 rumus penambahan satu dari baris sebelumnya; hanya pola persis tersebut dengan cache yang sesuai diterima. Tidak ada eksekusi rumus bebas, pemetaan NISN/NIK menjadi NIS, atau pengurutan ulang nomor absen berdasarkan nama.

**Batas data:** Excel tidak memuat tanggal lahir atau periode. Untuk fixture dummy ini, tanggal lahir `2010-01-01` diberi keterangan **DATA UJI, placeholder, tidak berasal dari Excel** pada alamat karena kolom legacy wajib diisi. Periode keanggotaan menggunakan fixture sintetis yang sudah eksplisit ada: **2026/2027 Ganjil, 1 Juli–31 Desember 2026**. Kedua nilai tersebut bukan informasi resmi yang disimpulkan dari sumber; jangan digunakan untuk pemutakhiran data sekolah asli.

## Referensi jam dari gambar

Migration additive **007_bell_reference.php** menambah `ak_jam_belajar`. Tiga profil berversi disimpan dari transkripsi gambar: Senin 10 jam pelajaran, Selasa–Kamis 10, Jumat 8. Upacara, kegiatan Jumat dan istirahat dibedakan dari jam pelajaran. Seed CLI dibatasi ke database development sintetis yang tepat; runtime mendapat **SELECT saja** untuk tabel ini, tanpa privilege DDL atau perubahan akun aktif.

Menu **Jam Belajar** tersedia bagi pengguna terautentikasi. Referensi disimpan di database, bukan hanya tabel HTML. UI mengikuti tema putih-hitam dan diperiksa pada 320, 375, 430, 768 dan 1440px; tabel tiga kolom tidak memerlukan scroll horizontal.

**Jumat masih perlu konfirmasi:** jam ke-6 ditranskripsi **10:50–11:40**, jam ke-7 mulai **13:00**. Durasi tidak diseragamkan, dan jenis jeda 11:40–13:00 belum ditentukan. Referensi ini belum menjadi validasi otomatis penjadwalan. Guru/mapel dan alokasi kelas tidak tercantum dalam gambar, sehingga tidak dibuat dari perkiraan. Jadwal dan pertemuan contoh XII existing tetap dipertahankan.

## Pengujian aktual

| Suite | PASS | FAIL | SKIP |
|---|---:|---:|---:|
| HTTP akademik/auth/RBAC/CRUD/impor-ekspor | 189 | 0 | 0 |
| Kasus batas | 50 | 0 | 0 |
| Kelengkapan fungsi, wali dan isi ekspor | 47 | 0 | 0 |
| Alur browser menyimpan/edit/reload | 19 | 0 | 0 |
| Browser responsif dan role | 154 | 0 | 0 |
| Layout/login | 27 | 0 | 0 |
| Data kelas X, idempotensi dan ekspor nyata | 25 | 0 | 0 |
| Browser kelas X dan jam belajar | 13 | 0 | 0 |
| Integritas, restore, restart dan pengamanan | 128 | 0 | 0 |
| **Total** | **652** | **0** | **0** |

Setelah pengetatan validasi tipe nama/nomor sumber, suite terkait 25 pengujian dijalankan lagi dan seluruhnya PASS. Ini pengulangan verifikasi terkait, bukan tambahan 25 pada total suite. PHP lint 103 berkas dan pemeriksaan 89 foreign key termasuk dalam pengujian integritas.

Bukti nyata mencakup pembandingan seluruh 389 baris dengan database, reload/pagination Admin 35 siswa X PPLG 2 menjadi 20+15, Guru Piket menampilkan 35 Belum dan 0 H/S/I/A, serta XLSX hasil ekspor dibaca kembali dengan NIS/nama/status cocok. Guru tanpa penugasan tidak diberi akses kelas baru. File Excel, script internal, SQL, Git dan konfigurasi tidak dapat diakses melalui router development. Screenshot browser disimpan privat dan diperiksa, termasuk tabel jam 320px.

## Backup, integritas dan pemulihan

- Backup gzip privat baru dibuat sebelum impor. Peta sumber dan ledger penyelesaian berada di state privat; mengulang sumber yang selesai hanya membaca dan memverifikasi data. Status impor sebagian menghentikan retry otomatis untuk mencegah penimpaan.
- Sebelum/sesudah impor dibandingkan pada **13 tabel**: seluruh baris lama dipertahankan. Tabel guru, jadwal, user, penugasan, pertemuan, absensi, nilai dan snapshot rapor tidak berubah karena impor. Regresi berikutnya hanya menggunakan fixture development sesuai suite existing.
- Backup terbaru setelah regresi dipulihkan ke database baru **`sia_academic_test_restore_c299f9`**. Cocok seluruh schema/data/objek: **41 tabel, 6.750 baris**. SHA-256 backup: `4e3383ab59863349e957059cd6a1f088d4b6c8c4e55b3f801a3813e775f387d7`.
- Restart hanya unit development 18125 berhasil; sesi tetap berfungsi dan hash DB sebelum/sesudah restart sama. Startup dengan credential salah gagal tertutup; konfigurasi benar dipulihkan dan login diuji kembali.
- Database aktif tetap cocok terhadap baseline audit lama, termasuk schema/data/view/trigger/routine. Fingerprint snapshot kanonis tetap `259ce5469f2ab4a2c5c19e38b7854bb204722b1111c9a3496b29251e49a0cdef`. Seluruh 18 penugasan legacy dipertahankan.
- Konfigurasi, User, PID dan waktu mulai layanan 8085 tetap sama. Hash setiap berkas proyek Laravel dan release R0 aktif tetap sama.
- Pada direktori target original, pengguna sudah menambahkan Excel kelas X dan mengubah `.gitignore` sebelum tugas ini. Keduanya dicatat dalam baseline tambahan `reports/kelas10-baseline`; baseline audit lama tidak ditimpa. Pemeriksaan akhir membuktikan perubahan pengguna tersebut tetap utuh.

Tidak ada rollback SQL destruktif. Untuk memulihkan eksperimen lokal, hentikan hanya unit development, simpan backup/checkpoint terbaru, lalu restore ke database baru dan cocokkan snapshot; lakukan pergantian konfigurasi development secara terkontrol. Rollback aplikasi ke kode sebelumnya dapat mempertahankan tabel additive 007 yang tidak digunakan. Jangan mengimpor backup ke database aktif atau menghapus roster dengan SQL massal. Backup, session, credential, file sumber dan peta identitas tidak masuk repository/document root.

## Cara mencoba

1. Buka **http://127.0.0.1:18125/auth/login.php**. Gunakan akun testing existing, tanpa reset password. Password fixture disimpan privat dalam `private/test-accounts.json`; tidak dicetak pada laporan atau masuk Git.
2. Admin **`uji_admin`**: [master siswa](http://127.0.0.1:18125/admin/master.php?table=siswa), pilih kelas X. Contoh langsung [X PPLG 2](http://127.0.0.1:18125/admin/master.php?table=siswa&id_kelas=352).
3. Guru Piket **`uji_piket`**: [monitor X PPLG 2 tanggal 30 Oktober](http://127.0.0.1:18125/academic/index.php?view=piket&id_tahun_ajaran=1&tanggal=2026-10-30&id_kelas=352). Periksa status Belum, daftar siswa dan unduhan laporan.
4. [Jam Belajar](http://127.0.0.1:18125/academic/index.php?view=jam) menampilkan referensi dari gambar. Menu dapat dibaca guru/siswa/kepsek setelah login.
5. Untuk pengisian absensi kelas X, Admin perlu menetapkan dan memverifikasi penugasan guru/mapel/hari/jam/periode. Akun **`uji_guru`** tetap dapat mencoba alur lengkap contoh **XII PPLG 2**, tanggal **2026-10-30**, dari checkpoint sebelumnya. Mengimpor siswa saja tidak memperluas akses guru.

Server telah berjalan. Jika development berhenti, dari `/home/muflih/sia-academic-dev` jalankan `python3 ops/academic_server.py start`. Jangan menjalankan setup database dari awal pada DB existing.

Reproduksi pengujian, saat tidak ada pengisian manual:

```bash
cd /home/muflih/sia-academic-dev
python3 tests/run_academic.py --with-kelas10 \
  --baseline-directory /home/muflih/.local/state/sia-academic-dev/20261031/reports/kelas10-baseline
```

## Berkas dan bukti

Perubahan kode: `academic/index.php`, `academic/layout.php`, view baru `academic/views/bell_reference.php`, CSS khusus tabel jam pada `assets/css/academic.css`; migration 007 dan JSON referensi di `database/`; CLI seed/impor/baseline baru di `ops/`; penyesuaian setup create-only; dua suite dataset baru serta opsi baseline pada runner/integritas. Panduan dan matriks fitur existing diperbarui. Tidak ada redesign besar.

Bukti tersanitasi: **`docs/evidence/KELAS10_JAM_TEST_RESULTS.json`**. Bukti rinci, screenshot, snapshot pembanding dan backup: `/home/muflih/.local/state/sia-academic-dev/20261031/`, dengan permission privat. Checkpoint 613 PASS sebelumnya tetap tersimpan sebagai laporan historis, bukan diganti klaimnya.

Yang masih terbatas: konfirmasi waktu Jumat, penetapan jadwal guru kelas X, pengesahan kalender/kurikulum/format cetak resmi, workflow massal kenaikan/mutasi dan modul tambahan legacy yang sudah dicatat pada matriks sebelumnya. Ini tidak mengubah status 18 penugasan ambigu. Tidak ada aktivasi R1/R2/produksi, perubahan database aktif, Docker, atau pengujian HP fisik/LAN pada tugas ini.
