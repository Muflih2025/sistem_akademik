# Perbaikan temuan Guru dan Guru Piket — 4 November 2026

## Status dan batas pekerjaan

Lima temuan pengguna telah diperbaiki di branch yang sedang digunakan, **`rebase-tsx`**, berdasarkan checkpoint `3d13bf9`. Branch ini sudah menggunakan Next.js/SQLite sebelum pekerjaan dimulai; patch ini tidak melakukan migrasi framework, merge ke main, atau deployment. PHP/main, Laravel sumber, database aktif, layanan 8085, dan 18 penugasan legacy tidak diubah.

**Hasil terbaru: 53 PASS, 0 FAIL, 0 ERROR, 0 SKIP**, khusus ruang lingkup perbaikan ini. Ini bukan klaim seluruh sistem atau seluruh pengujian PHP sebelumnya lulus. TypeScript dan `git diff --check` juga lulus.

Status patch: **TERUJI UNTUK DEVELOPMENT LOKAL**. Status release seluruh branch: **BLOCKED untuk aktivasi produksi**, karena blocker lain pada audit sebelumnya belum diselesaikan.

## Temuan, perbaikan, dan bukti

| Temuan | Penyebab | Perbaikan | Bukti aktual |
|---|---|---|---|
| Jurnal gagal disimpan, ikon tetap checklist | Form tidak membawa ID jadwal; API memakai UPSERT pada kolom tanpa UNIQUE; pesan gagal memakai komponen sukses | ID jadwal wajib, simpan transaksi terkontrol tanpa DDL, ID eksplisit, validasi pertemuan, pesan error berikon silang | Browser mengisi, menyimpan, reload jurnal lima tanggal; penolakan materi tidak valid menampilkan silang dan database tetap sama |
| Riwayat hanya Jumat | Link jadwal kehilangan ID/tanggal; form memakai tanggal tetap 30 Oktober | Link membawa ID/tanggal; tanggal bebas dipilih dalam batas penugasan; jadwal dan hari diverifikasi server | Browser membuka dan menyimpan jurnal 26–30 Oktober 2026; tanggal/hari salah ditolak |
| Mapel di buku rapor kosong | Nama properti UI berbeda dengan API | Input nilai dan buku rapor memakai komponen serta respons yang sama: `nama_mapel`, komponen, nilai akhir, predikat | Nama mapel tampil dalam uji browser buku rapor |
| Nilai “tersimpan” tetapi rekap tidak berubah | UPDATE saja tanpa INSERT, tanpa pemeriksaan baris, periode dan mapel diabaikan | Create/update berdasarkan NIS + periode + mapel; kelas/guru/keanggotaan diverifikasi; aturan berversi; reload dari database | Nilai 80 tersimpan; koreksi Tugas ke 90 menghasilkan 83,00 dan terlihat di buku rapor; periode lain tetap 60 |
| Dashboard Piket tidak dapat dibuka | Redirect `/piket` ke dirinya sendiri; data/izin tugas tidak menjadi sumber dashboard | Hapus self-redirect; dashboard harian dan matriks mingguan dari DB; izin berdasarkan tugas, periode, tanggal, dan kelas | Browser login Piket berhasil, melihat kelas dan pengisian jurnal; guru tanpa tugas, tugas habis, dan tugas dicabut ditolak |

## Integritas dan otorisasi

- Seluruh pengujian menulis hanya ke database sintetis di luar repository. Setup menyalin metadata CREATE TABLE, tidak menyalin baris data sekolah.
- Jurnal dan absensi sesi disimpan dalam satu transaksi `IMMEDIATE`. Kegagalan INSERT sesi yang disimulasikan memakai trigger testing membatalkan jurnal, sesi, dan audit sekaligus.
- Rekap harian sekolah tidak ditimpa oleh absensi mapel. Sesi baru memuat anggota kelas berstatus B, bukan mengimpor status dari mapel/kelas lain.
- Duplikasi record atau keanggotaan ambigu ditolak. ID jadwal, periode, kelas, guru, mapel, dan keanggotaan harus sesuai; tidak ada fallback jadwal/periode 1.
- Koreksi memerlukan revision yang sesuai dan alasan. `created_by` dipertahankan; `updated_by` dan audit berasal dari pengguna terautentikasi. Periode terkunci menolak perubahan.
- Role dan referensi pengguna dibaca kembali dari database. Penugasan piket diperiksa di server pada setiap akses; username testing tidak memberikan hak khusus.
- Permintaan JSON lintas origin ditolak pada endpoint penulisan yang diubah. LocalStorage hanya membantu navigasi, bukan dasar otorisasi API.
- Tidak ada CREATE/ALTER/DROP/TRUNCATE pada database aplikasi. Tidak ada migration baru, reset akun, reset password, perubahan grant, atau import dump.

Skema SQLite yang sebelumnya diimpor masih minim PK/UNIQUE/FK. Patch mendeteksi data ambigu dan menserialisasi penulisan aplikasi; ini **tidak menggantikan constraint database** terhadap penulis SQL eksternal. Perbaikan skema penuh memerlukan review/migration terkontrol tersendiri. `foreign_key_check` kosong pada fixture tidak berarti constraint yang belum ada sudah dibangun.

## Pengujian terbaru yang benar-benar dijalankan

| Kelompok | PASS | FAIL | ERROR | SKIP |
|---|---:|---:|---:|---:|
| HTTP + Chromium: jadwal, jurnal, absensi, nilai/rekap, Piket, RBAC, revisi, transaksi, pagination, viewport, integritas | 44 | 0 | 0 | 0 |
| Backup SQLite dan restore ke berkas baru terisolasi | 3 | 0 | 0 | 0 |
| Restart server development dan baca kembali seluruh data, login, absensi, nilai, izin Piket | 6 | 0 | 0 | 0 |
| Total terfokus | **53** | **0** | **0** | **0** |

Validasi tambahan: `./node_modules/.bin/tsc --noEmit --incremental false`, `git diff --check`, sintaks kedua runner Node, dan setup create-only beserta helper restart lulus.

Uji browser menggunakan Chromium sungguhan pada 320, 375, 430, 768, dan 1440 px; tidak ada horizontal overflow pada halaman absensi utama. Screenshot ditinjau untuk 320/1440 px. Pagination diuji dengan 13 siswa sintetis: status halaman pertama dan kedua tetap tersimpan setelah reload, hasil 11 H / 1 I / 1 S. Ini emulasi viewport, bukan klaim sudah diuji pada perangkat fisik ArchLinux/Android milik pengguna.

Runtime pengujian final: Next.js 16.4.3 dengan **Turbopack**, Node 24.18.0. Sandbox menghubungkan node_modules melalui symlink sehingga hanya konfigurasi sandbox ditambah root dependency sempit sesuai dokumentasi lokal Next; konfigurasi tambahan tersebut tidak diterapkan ke aplikasi pengguna.

Percobaan sebelumnya pada Webpack development mengalami HTTP 500 internal `Unexpected end of JSON input` saat kompilasi/refresh, serta satu pembacaan UI sebelum hydration selesai. Hasil gagal tersebut tidak dihitung sebagai PASS. Runner kini menunggu nilai jurnal benar-benar dimuat dan menyiapkan rute sebelum pengujian; tidak melakukan retry permintaan yang gagal. Run final memakai Turbopack, sama dengan default `pnpm dev`, dan seluruh 44 pemeriksaan berhasil. Tidak ada perubahan node_modules/dependency untuk menyembunyikan kegagalan.

Bukti terstruktur: `docs/evidence/TSX_TEACHER_FIXES_2026-11-04.json`. Screenshot, password acak fixture, backup dan log percobaan disimpan privat di luar Git, pada state lokal `~/.local/state/sia-teacher-fixes-20261104/`. Server final pengujian menggunakan `http://127.0.0.1:18131` dan database sintetis tersendiri; port ini bukan pengganti layanan 8085 atau database aplikasi.

## Backup, restore, restart, dan data asli

Backup dibuat memakai SQLite online-backup API pada fixture. Restore dilakukan dengan menyalin backup ke **berkas baru**, tidak menimpa database mana pun. Hash isi setiap tabel dan `integrity_check` pada restore cocok. Setelah restart server sandbox, hash isi seluruh tabel tetap sama; login, status absensi, nilai 83,00, dan penolakan Guru Piket tanpa tugas tetap berfungsi.

Database repository diverifikasi identik byte sebelum/sesudah seluruh pekerjaan:

| Berkas | SHA-256 sebelum = sesudah |
|---|---|
| `data/sia.db` | `1a21075ce4fa60343070186ab7b13cb10bd7bc9e473178f5ac26648f8d1719e7` |
| `data/sia.db-wal` | `bb73e687cd3fc1d58f6f7829041ba887af3a9cb2b55956407eaa3ed1934b7f69` |
| `data/sia.db-shm` | `36a377023a006bfb994296ffacde37c5a912ac50df7438279b8db886209dacff` |

Tidak ada backup database sekolah yang dibuat atau dipublikasikan oleh patch ini. Backup/restore yang dinyatakan PASS hanya berlaku untuk fixture terisolasi. Tidak ada SQL atau proses restart yang diarahkan ke layanan/database aktif.

## Berkas patch

- `src/lib/academic.ts`: pemilihan periode/penugasan, roster, transaksi simpan, aturan nilai, scope Piket, audit dan error terkontrol.
- `src/lib/auth.ts`, `src/app/api/auth/route.ts`: metadata role terkini dan tugas piket tanpa bypass username.
- `src/app/api/{jadwal,jurnal,absensi,nilai,piket}/route.ts`: kontrak API berbasis ID dan pemeriksaan izin.
- `src/components/academic/{TeachingContext,Notice,MeetingEditor,GradeBook}.tsx`: form bersama, context jadwal/tanggal, feedback gagal/sukses, nilai dan rekap dari sumber sama.
- `src/app/guru/{jadwal,jurnal,absen,nilai,rapor}/page.tsx`, `src/app/piket/page.tsx`: halaman terkait lima temuan.
- `src/components/PortalLayout.tsx`: pemetaan role kepala sekolah dan visibilitas menu piket.
- `next.config.ts`: menghapus self-redirect Piket.
- `tests/tsx_teacher_{setup.py,flows.cjs,recovery.cjs}`: setup create-only dan pengujian terisolasi.
- Laporan ini, panduan `docs/TEST_MANUAL_GURU_TSX.md`, serta evidence JSON terfokus.

Perubahan audit lain yang muncul bersamaan pada tests/laporan lain dipertahankan dan tidak dimasukkan ke commit patch ini. Tidak ada reset/checkout destruktif atau penghapusan perubahan existing.

## Cara menjalankan dan menguji

Lihat `docs/TEST_MANUAL_GURU_TSX.md` untuk langkah lengkap. Website branch ini dijalankan dengan:

```bash
pnpm dev --hostname 127.0.0.1 --port 3000
```

Buka `http://localhost:3000/auth/login`. Restart hanya server development jika masih menjalankan kode lama. `uji_guru` untuk mapel; `uji_piket` untuk dashboard piket. Kredensial yang telah diberikan pengguna diverifikasi read-only; tidak diubah atau dicantumkan dalam Git/laporan. `uji_guru` memang tidak memiliki tugas piket; `uji_piket` memiliki tugas periode Juli–Desember 2026. Jangan memberikan hak tambahan untuk menghindari penolakan akses.

## Batas yang masih terbuka

1. Buku rapor pada patch adalah **nilai berjalan untuk mapel penugasan**, bukan workflow penerbitan rapor resmi/wali kelas. Snapshot terbit tidak disinkronkan dengan menimpa arsip. Penerbitan lengkap tetap pekerjaan tersendiri/R6.
2. Dashboard piket sudah membaca rekap harian, matriks, dan pengisian jurnal nyata. Rekonsiliasi absensi harian dari berbagai sesi, koreksi dengan approval, serta export XLSX/PDF server lengkap belum dibangun dalam patch ini. Cetak tersedia melalui browser.
3. Blocker admin CRUD/import, publikasi/otorisasi snapshot rapor dan export lama, session revocation/logout, dan secret sesi pada audit `LAPORAN_VERIFIKASI_TEMUAN_TSX_2026-11-03.md` belum seluruhnya ditutup. Jangan memakai branch ini untuk publik/data sekolah sebelum review keamanan lanjutan.
4. Tampilan dan backend modul di luar lima temuan belum menjalani regresi penuh dalam pekerjaan ini. Build produksi dan deployment tidak dilakukan.
5. Penugasan atau aturan nilai yang belum terverifikasi tidak ditebak atau dibuat otomatis. Data ambigu ditolak agar admin dapat meninjau dengan aman.

Rollback patch aplikasi dilakukan melalui revert commit setelah meninjau perubahan lain, bukan reset database. Data tes tinggal di sandbox tersendiri; pemulihan database sekolah tidak diperlukan karena database tersebut tidak berubah. Tidak ada migrasi/deployment/R2 yang dijalankan otomatis.
