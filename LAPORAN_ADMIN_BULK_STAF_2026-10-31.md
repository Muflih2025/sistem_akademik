# Laporan checkpoint Admin bulk, staf, dan pagination — 31 Oktober 2026

**Status: SIAP UNTUK UJI MANUAL DEVELOPMENT.** Website berjalan di **http://127.0.0.1:18125**. Kode disimpan pada branch `development/academic-workflows-20261031`, commit **`5f1da11`**. Worktree implementasi: `/home/muflih/sia-academic-dev`.

Layanan 8085, database aktif, proyek Laravel sumber dan 18 penugasan legacy tetap dipertahankan. Tidak ada deployment publik, Dockerisasi atau migrasi framework. Checkpoint sebelumnya `1499177` / `f3a388f` tetap menjadi riwayat Git.

## 1. Hasil yang dapat dicoba

- **Pagination mengikuti pola contoh:** master Admin, akun, jadwal/penugasan dan periode dimulai dengan **10 baris**, pilihan **10/20/25/50/100**, rentang “Menampilkan 1–10 dari …”, nomor halaman/elipsis, Awal/Sebelumnya/Berikutnya/Terakhir. Filter dipertahankan. COUNT dan LIMIT/OFFSET dijalankan di server; ukuran tidak sah ditolak. Tombol putih/hitam, ramah sentuhan, teruji 320/375/430/768/1440px. Tabel lebar mempunyai area gulir sendiri di HP, tanpa overflow seluruh halaman/form. Roster pengisian absensi satu kelas tetap lengkap.
- **Bulk Excel berada di area Admin/master:** siswa, guru, kelas, jurusan, mapel, ruang/lab. Template → upload XLSX/CSV → preview → konfirmasi → transaksi database → reload. Referensi ID kelas/jurusan dan preview dipaginasi. Batas 5 MB/2.000 baris. Impor master hanya menambah; tidak menimpa identitas existing atau membuat akun otomatis.
- **Impor akademik tetap dapat dipakai dari modul:** Kalender oleh Admin/Kepsek, Absensi/Nilai oleh guru pemilik tugas, Anggota/Penugasan dari Fondasi Admin. URL memakai `view` modul + `upload=1`; tidak bergantung pada menu umum Impor/Ekspor. URL lama master diarahkan ke `/admin/bulk_upload.php`. Download PDF/Excel/CSV/Cetak tetap ada di modul masing-masing.
- **Admin mengontrol guru mapel:** master Guru → akun role Guru → jadwal, mapel, kelas, ruang, periode dan rentang terverifikasi. Perubahan role/status diperiksa server dan membatalkan session lama. Metadata/localStorage/POST klien tidak memberi role Admin.
- **Guru mengisi absensi, jurnal KBM dan agenda harian dari satu pertemuan.** Termasuk jam, pertemuan ke, TP/ATP, materi, kegiatan, pengganti, ketidakhadiran, refleksi, tindak lanjut dan catatan. H/S/I/A/B; B tetap belum dikonfirmasi. Identitas pengisi berasal dari session server, dengan audit/revision dan alasan koreksi. PDF buku serta unduhan Nilai/Rapor dibaca kembali, bukan sekadar HTTP 200.
- **Wali kelas menjadi informasi penanggung jawab.** Penugasan metadata tetap dikelola Admin. Status wali tidak memberi hak mengajar/review rapor. Pada workflow v3, Admin memverifikasi lalu menerbitkan rapor secara eksplisit; snapshot terbit/histori review existing dipertahankan. Siswa opsional, tetap hanya melihat rapor terbit miliknya.
- **Dashboard Kepala Sekolah:** tanggal, guru, kelas, ruang, wali dan status sudah/belum mengisi; tautan ke jurnal. Informasi berbasis jadwal/pengisian, tanpa klaim posisi fisik/GPS. Kepala Sekolah tidak dapat mengubah akun, input nilai milik guru atau menerbitkan rapor sebagai Admin.
- **Katalog 29 ruang:** 20 ruang kelas dan 9 lab sesuai daftar pengguna. A10 mengikuti denah. Dropdown jadwal baru mengambil ruang aktif dari database. Nama ruang yang telah dipakai jadwal dilindungi agar arsip tidak berganti arti. Ruang fixture UJI terpisah dari 29 referensi sekolah.
- **Navigasi disederhanakan:** tombol Ganti Password dan menu umum Impor/Ekspor dilepas. Akun testing yang ditentukan pengguna memakai password development yang dijelaskan di panduan; pengecualiannya dijaga oleh environment testing, nama DB tepat, socket dan flag privat. Akun sekolah/aktif tidak di-reset.

Katalog **36 kelas X/XI/XII × PPLG/PM/AKL/MPLB × 1/2/3**, jam belajar yang dapat diedit Admin, 389 siswa Excel kelas X dan kenaikan tahunan tetap tersedia dari checkpoint sebelumnya. Dataset testing tambahan tidak dihapus; gunakan filter kelas/pencarian dan pagination saat mencoba data sekolah.

## 2. Bug dan celah yang diperbaiki

1. Pembaca XLSX gagal pada XML namespace tertentu: pemrosesan SimpleXML, atribut tak bernamespace dan hasil validasi XML diperbaiki.
2. Urutan worksheet kini mengikuti relasi workbook, bukan menebak nama `sheet1.xml`. Referensi eksternal/path tidak aman ditolak.
3. Tanggal Excel asli (epoch 1900/1904) dan ISO date dikonversi dengan benar. Sel formula/error, tanggal waktu pecahan, data ganda dan header salah ditolak; kolom opsional kosong di akhir baris dipertahankan.
4. Bulk upload baru tidak kehilangan preview/konteks ketika dipaginasi dan tidak mencampur modul. Race/duplikat pada commit membatalkan seluruh batch.
5. Dropdown ruang, pengecekan ruang aktif, actor dan izin tidak mempercayai input role klien.
6. Penghapusan menu umum sempat membuat jalur upload akademik sulit diakses; entry point dipasang pada modul terkait dan diuji end-to-end. Impor absensi mempertahankan materi/refleksi existing; impor nilai tidak memutasi payload rapor terbit.
7. Pagination lama hanya Sebelumnya/Berikutnya dan ukuran tetap; kini ukuran, nomor halaman dan query database konsisten. Tautan impor/ekspor legacy yang tertinggal pada header/sidebar dibersihkan.

## 3. Pengujian dan batas bukti

| Tahap nyata | PASS | FAIL | SKIP | Cakupan |
|---|---:|---:|---:|---|
| Regresi penuh sebelum penyempurnaan akhir pagination/navigasi | 869 | 0 | 0 | 15 suite: HTTP, browser, keamanan, CRUD, akademik, restore/restart/integritas |
| Bagian regresi di atas: kompatibilitas kebijakan lama | 601 | 0 | 0 | Gate review wali lama dan entry point lama, dengan konfigurasi kompatibilitas eksplisit |
| Bagian regresi di atas: konfigurasi staf aktif | 268 | 0 | 0 | Bulk69+12, staf25+21, integritas141 |
| Pagination setelah perubahan akhir | 10 | 0 | 0 | Data per halaman dibanding SQL, 8 daftar Admin, filter, validasi ukuran, RBAC Kepsek, 5 viewport; tanpa menambah fixture |
| Upload modul setelah perubahan navigasi akhir | 6 | 0 | 0 | Excel nyata kalender/absensi/nilai → preview → commit → DB/reload; tautan Fondasi, RBAC/IDOR/CSRF, layout |

**869 adalah jumlah pemeriksaan, bukan jumlah fitur.** Dua baris 601/268 merupakan rincian 869, bukan tambahan. Hasil fokus 10 dan 6 dilaporkan terpisah; tidak diklaim sebagai satu regresi penuh baru. Regresi 869 tidak diulang sesudah perubahan akhir karena pengujian terkait sudah dijalankan. Beberapa percobaan awal harness browser perlu koreksi URL absolut, locator select dan ekspektasi CSRF419; hasil tabel adalah run akhir yang benar-benar lulus.

Validasi akhir: **114 file PHP lint**, 4 JavaScript syntax, 4 Python compile, `git diff --check` lulus. **99 foreign key** diperiksa ulang setelah pengujian terakhir, **0 orphan row**. Screenshot aktual tersimpan privat di `/home/muflih/.local/state/sia-academic-dev/20261031/reports`: `pagination-320.png` hingga `pagination-1440.png`, `module-upload-320.png` dan `module-upload-1440.png`; browser staf 3 role juga tersedia. Browser Chromium memakai viewport emulasi; HP fisik/LAN dan uji beban belum dilakukan.

Bukti tersanitasi: [ADMIN_BULK_STAFF_TEST_RESULTS.json](docs/evidence/ADMIN_BULK_STAFF_TEST_RESULTS.json). Matriks seluruh fitur beserta operasi DB/batas: [MATRIKS_FUNGSI_AKADEMIK.md](docs/MATRIKS_FUNGSI_AKADEMIK.md).

## 4. Database, backup dan integritas

- Migration baru **`009_room_catalog.php`** additive: tabel `ak_ruang`, identitas unik, status, actor dan timestamp. Dijalankan hanya pada DB development socket-only. Migration 001–008 yang sudah terpasang tetap dipertahankan. Tidak ada DROP/TRUNCATE/reset maupun perubahan skema aktif.
- Runtime development non-root, terpisah dari deployment/owner, tanpa DDL/GRANT. Hak runtime tabel ruang: **SELECT/INSERT/UPDATE**. Kebijakan append-only audit/snapshot tetap diuji. Tidak ada pencabutan/perubahan grant akun aktif.
- Perubahan data: tambah 29 referensi ruang dan fixture khusus testing untuk pengujian bulk/staf. Delapan akun fixture bernama yang diperiksa diubah ke password testing atas instruksi pengguna; fixture guru baru juga dibuat lewat Admin. Tidak mengubah akun nyata/histori sekolah. Impor ulang file kelas X tidak dilakukan.
- **Backup terbaru:** `final-admin-staff-6dc78253.sql.gz`, SHA256 **`0afa662f80f7e4f181eaab4911460375f2bae4294f040d8882428235d0baa1da`**. Disimpan privat di direktori backup development, tidak dimasukkan repository atau document root.
- **Restore terbaru PASS**, waktu `2026-10-31T22:29:24.624389+07:00`: hanya ke database baru `sia_academic_test_restore_6dc78253`. **44 tabel / 12.397 baris**, seluruh skema/data/objek cocok persis, sumber development tidak berubah. Tidak memulihkan dump ke database existing.
- Restore/restart development dan startup dengan credential salah sudah benar-benar diuji pada suite integritas: session bertahan setelah restart; database tidak berubah; startup salah gagal tertutup dan layanan dipulihkan. Restart 8085 tidak dilakukan.
- Pemeriksaan perlindungan terakhir `2026-10-31T22:30:30.201941+07:00`: semua hash target existing, Laravel sumber dan release aktif sama baseline; status Git target existing serta PID/waktu start/user/config service 8085 sama; **18 penugasan legacy** tetap ada; DB aktif **23 tabel + 1 view / 203 baris** sama baseline.
- Fingerprint snapshot aktif sebelum/sesudah sama: **`716d5f00f69f9cda6ecf24d522ac99b398462dc63f2b0ca658ec24743e164e41`** (SHA256 JSON UTF-8 dengan key diurutkan dan separator koma/titik dua tanpa spasi). Tidak ada write aktif untuk menghasilkan bukti ini.

Konfigurasi development aktif tetap `HOMEROOM_MODE=informational`, `ROOM_CATALOG_ENFORCED=1`, `ADMIN_BULK_ONLY=1`. Runner memulihkan konfigurasi asli melalui `finally`; snapshot kebijakan terakhir membuktikan mode staf aktif sesudah pengujian. Tidak ada perubahan konfigurasi tersebut pada 8085.

## 5. Cara membuka dan menguji

Buka **http://127.0.0.1:18125/auth/login.php**. Gunakan profil browser/Incognito terpisah untuk Admin/Guru/Kepsek. Daftar akun fixture dan langkah lengkap tersedia di [PANDUAN_TEST_MANUAL_ADMIN_GURU_KEPSEK.md](docs/PANDUAN_TEST_MANUAL_ADMIN_GURU_KEPSEK.md).

Urutan ringkas: Admin mencoba master/bulk/jadwal/penugasan → Guru mengisi dan reload absensi/jurnal/agenda/nilai → Kepsek memilih tanggal yang sama dan membaca hasil → Admin memverifikasi/menerbitkan rapor dan mengunduh. Untuk contoh siap pakai, guru **`uji_mapel_d75604`**, tanggal **2026-10-30**, jadwal **#118**, rapor **#136**. Tanggal hari ini bisa tidak memiliki jadwal; gunakan tanggal fixture yang sah.

Dari worktree development:

```bash
python3 ops/academic_server.py status
python3 ops/academic_server.py start
```

`start` dipakai jika layanan development berhenti; konfigurasi privat dan database staging yang sudah disiapkan harus tetap tersedia. Tidak menyalin credential ke `.env` publik. Pengujian menulis hanya fixture development; hindari input manual bersamaan dengan run otomatis.

Untuk mengulang pagination saja, wrapper berikut membaca lokasi browser dari konfigurasi privat tanpa mencetak credential:

```bash
python3 - <<'PYTEST'
import json, os, pathlib, subprocess
p=pathlib.Path('/home/muflih/.local/state/sia-academic-dev/20261031/private/runtime.json')
c=json.loads(p.read_text())
e={**os.environ, 'PLAYWRIGHT_BROWSERS_PATH':c['PDF_BROWSERS_PATH'], 'LD_LIBRARY_PATH':c['PDF_LIBRARY_PATH']}
raise SystemExit(subprocess.call(['node','tests/academic_pagination.cjs'],env=e))
PYTEST
```

Script `tests/academic_module_upload.cjs` menggunakan wrapper yang sama dengan mengganti nama file. Itu menulis fixture kalender dan revisi fixture staf. Full runner tersedia dengan `--with-kelas10 --with-progression --with-bulk-master --with-staff`; proses tersebut sengaja membuat data uji dan menguji konfigurasi kompatibilitas secara terpisah. Tidak perlu menjalankannya hanya untuk uji manual pagination.

## 6. Keterbatasan dan pekerjaan yang masih memerlukan keputusan

- **18 penugasan legacy** belum dipetakan ke periode/rentang; tetap diblokir dari hak pengisian tambahan sampai admin memverifikasi. Tidak menebak tahun/periode.
- Jam Jumat pada referensi fisik memiliki jeda/durasi yang perlu konfirmasi sekolah sebelum diterapkan massal. Admin sudah dapat mengubah referensi jam berversi; arsip jadwal/pertemuan tidak diseragamkan otomatis.
- Data guru/mapel/jadwal sekolah yang nyata masih harus ditambahkan/diverifikasi Admin; akun dan kelas Uji bukan daftar guru sekolah resmi. Kelas kosong tidak otomatis diisi siswa/guru.
- Kenaikan tahunan tersedia; mutasi khusus, pembatalan kenaikan/penerimaan kembali alumni, serta penyetaraan modul tambahan legacy ekstrakurikuler/evaluasi belum lengkap. Format dokumen final/paraf/pengesahan sekolah masih memerlukan review sekolah.
- Persamaan password hanya untuk fixture localhost. Tidak ada klaim hasil tes ini mengizinkan deployment publik atau menjadikan akses LAN/HP fisik telah teruji.
- Penggantian kebijakan wali menjadi informasi sengaja mengikuti instruksi pengguna. Alur approval wali lama tetap diuji sebagai kompatibilitas, tanpa menjadikannya kebijakan operasional saat ini.

## 7. Checkpoint dan pemulihan

Commit kode **`5f1da11`** mengubah **52 file** (daftar di bawah). Laporan/evidence disimpan pada commit dokumentasi setelahnya. Tidak ada spreadsheet, SQL dump, log, konfigurasi privat atau credential database dalam commit. Pemeriksaan terhadap nilai secret privat pada file yang dipilih: 0 kecocokan.

Pemulihan aplikasi development dilakukan dari commit sebelumnya melalui worktree/release terpisah dan pemeriksaan konfigurasi sebelum start; jangan `reset --hard` worktree ini. Migration ruang bersifat additive: rollback aplikasi tidak menghapus tabel/data ruang. Jangan mencabut grant/schema aktif untuk rollback development. Backup dipulihkan hanya ke DB staging baru dan diverifikasi sebelum mengganti konfigurasi development yang bersangkutan. 8085 tidak menjadi target rollback checkpoint ini.

### File pada commit kode

- `academic/export.php`
- `academic/index.php`
- `academic/layout.php`
- `academic/views/alumni.php`
- `academic/views/bell_reference.php`
- `academic/views/calendar.php`
- `academic/views/foundation.php`
- `academic/views/grades.php`
- `academic/views/home.php`
- `academic/views/homeroom_management.php`
- `academic/views/import_reference.php`
- `academic/views/journal.php`
- `academic/views/meeting.php`
- `academic/views/progression.php`
- `academic/views/reports.php`
- `academic/views/schedules.php`
- `academic/views/teaching_monitor.php`
- `academic/views/transfer.php`
- `admin/bulk_upload.php`
- `admin/jadwal.php`
- `admin/master.php`
- `admin/tahun_ajaran.php`
- `admin/users.php`
- `assets/css/pagination.css`
- `config/academic/grades.php`
- `config/academic/homeroom.php`
- `config/academic/transfer.php`
- `config/academic/transfer_foundation.php`
- `config/academic/transfer_master.php`
- `config/crud_service.php`
- `config/import_service.php`
- `config/validation.php`
- `config/web_routes.php`
- `database/migrations/009_room_catalog.php`
- `docs/MATRIKS_FUNGSI_AKADEMIK.md`
- `docs/PANDUAN_FUNGSI_AKADEMIK_LOKAL.md`
- `docs/PANDUAN_TEST_MANUAL_ADMIN_GURU_KEPSEK.md`
- `includes/crud.php`
- `includes/header.php`
- `includes/sidebar.php`
- `ops/academic_room_catalog.py`
- `ops/academic_test_credentials.php`
- `public/index.php`
- `tests/academic_bulk_master.cjs`
- `tests/academic_bulk_master.py`
- `tests/academic_integrity.py`
- `tests/academic_kelas10.cjs`
- `tests/academic_module_upload.cjs`
- `tests/academic_pagination.cjs`
- `tests/academic_staff.cjs`
- `tests/academic_staff.py`
- `tests/run_academic.py`
