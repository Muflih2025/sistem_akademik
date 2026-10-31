# Laporan checkpoint akademik dan perbaikan login

Tanggal: 31 Oktober 2026. Status: **SIAP UJI LOKAL — DEVELOPMENT CHECKPOINT. Belum siap aktivasi produksi.**

## Hasil utama

Website lokal berjalan di **http://127.0.0.1:18125/auth/login.php**, dengan backend PHP native modular/PDO dan database development asli berisi fixture sintetis. Implementasi dilanjutkan dari R1.5; tidak ada reset, rewrite framework, Docker, atau deployment publik.

Branch: `development/academic-workflows-20261031`. Worktree: `/home/muflih/sia-academic-dev`. Baseline: `2cf717065f22420f4fd549c32e3cb2148b77249d`. Commit kode/tes/panduan: **`620fa27065e4475562f6c9aa66fff7de24b3708b`**. Laporan ini dicatat pada commit dokumentasi berikutnya agar rujukan commit kode tetap pasti.

**540 PASS, 0 FAIL, 0 SKIP** pada run terakhir. Ini merupakan hasil kasus yang benar-benar dijalankan, bukan pernyataan bahwa seluruh kebutuhan sekolah sudah selesai. Detail tersedia di [bukti terstruktur](docs/evidence/ACADEMIC_TEST_RESULTS.json).

## Modul yang dapat diuji sekarang

| Modul | Implementasi yang tersedia dan diuji |
| --- | --- |
| Autentikasi | Login/logout empat role; akun piket tetap guru; CSRF, cookie HttpOnly/SameSite, regenerasi session, revocation, rate limit; login tidak membuat tabel/akun |
| Master | CRUD siswa, guru, kelas, jurusan, mapel, akun, jadwal, tahun ajaran/semester; validasi referensi/duplikasi dan soft-deactivation |
| Fondasi akademik | Batas periode/hari efektif eksplisit; anggota kelas bertanggal/nomor absen; rentang penugasan terverifikasi; larangan overlap dan perubahan konteks historis |
| Absensi sesi | Roster database, pencarian, konfirmasi pemeriksaan, Tandai Semua Hadir, H/S/I/A/B, simpan/edit, optimistic revision, identitas user pengisi dan audit per siswa |
| Jurnal & agenda | Satu identitas pertemuan bersama absensi; TP/ATP, materi, kegiatan, guru pengganti sebagai catatan, refleksi, catatan/tindak lanjut; daftar/filter/detail/edit/cetak/ekspor |
| Guru Piket | Penugasan guru existing dengan cakupan kelas/sekolah dan tanggal; izin koreksi terpisah; dashboard, kelas/sesi belum terisi, rekap, kalender absensi, riwayat/koreksi beralasan |
| Absensi harian | Sumber kanonik terpisah dari sesi; rekonsiliasi eksplisit dari seluruh sesi terjadwal; konflik/missing/B tetap B; data terkonfirmasi tidak ditimpa guru/sinkronisasi otomatis |
| Kalender | Kalender bulanan, navigasi/today, periode, libur/ujian/hari efektif/agenda, draft/pengesahan/nonaktif, impor draft; tidak mengarang kalender resmi |
| Nilai | Input individu/massal sesuai penugasan, lima komponen/bobot total 100, nilai 0–100, deskripsi, perhitungan/predikat konsisten dan aturan immutable berversi |
| Rapor | Snapshot immutable dan hash, cek kelengkapan mapel, draft → verifikasi → terbit/penarikan; sumber berubah sebelum penerbitan ditolak; siswa hanya membaca arsip terbit miliknya |
| Impor | CSV/XLSX absensi sesi, nilai, kalender, master siswa/guru; template, preview tanpa perubahan DB, duplikasi/referensi/range/formula validation, konfirmasi dan commit atomik sekali pakai |
| Ekspor | CSV, XLSX sebenarnya, PDF sebenarnya, HTML cetak untuk jurnal/agenda, matriks harian/sesi, kalender, nilai dan rapor; NIS tetap teks, total/nilai numerik pada Excel |
| Siswa | Kehadiran sendiri dan rapor terbit sendiri; URL/ekspor identitas lain ditolak |
| UI | Putih/teks hitam/tombol hitam, kartu siswa, status ramah sentuhan, navigasi bawah HP, feedback; aset lokal, tanpa ketergantungan CDN saat membuka aplikasi |

Contoh database **XII PPLG 2 / 20 siswa / 2026-10-30** menghasilkan **18 H, 1 S, 1 I, 0 A, 0 B**. Dua sesi kelas tersebut disediakan agar rekonsiliasi dapat diuji. Pengujian browser menutup alurnya dengan rekonsiliasi Admin yang diaudit sehingga fixture harian sesuai bukti sesi terakhir.

B = Belum Dikonfirmasi, ditampilkan `?` pada tombol kartu. B tidak pernah otomatis dihitung Hadir atau Alpa. Kehadiran yang belum diisi pada hari efektif tetap belum terverifikasi. Pengganti yang dicatat pada jurnal tidak otomatis memperoleh izin mengajar/mengedit.

Pintu masuk legacy absensi/jurnal/nilai guru, kalender, rapor siswa dan impor master dialihkan/dibatasi hanya ketika flag development `ACADEMIC_WORKFLOWS=1`. POST lama tidak dapat menulis sumber paralel. Konfigurasi aktif 8085 tidak mengaktifkan flag tersebut.

## Bug login dan perbaikan lain

**Akar masalah login:** container dibatasi 460 px, lalu Bootstrap `.col-md-5` memperkecil kartu menjadi sekitar 5/12 ruang itu di desktop. Judul dan input ikut menyempit. Layout login sekarang menggunakan wrapper mandiri `width:100%; max-width:420px`, padding layar 16 px, grid centering horizontal/vertikal, kartu putih, input minimal 48 px dan tombol penuh 50 px. Tidak memakai grid Bootstrap/container induk lama. Logika autentikasi PHP dipertahankan.

Screenshot aktual diperiksa pada **320, 375, 430, 768, 1440 px**; tidak ada horizontal overflow. Login/logout, credential failure, cookie session dan CSRF tetap lulus. Lokasi screenshot privat: `reports/screenshots/login-{320,375,430,768,1440}.png` dalam state development. Screenshot error 375 px juga tersedia.

Audit pola grid halaman lain tidak menemukan kombinasi parent 460 px + kolom sempit yang sama pada form utama. Browser suite memeriksa CRUD dan modul akademik lima ukuran layar. Pemeriksaan awal keliru memasukkan tombol aksi pada tabel yang dapat digulir sebagai form utama; cakupan geometrinya diperbaiki, bukan menyembunyikan overflow halaman. Form utama tetap diuji penuh, sementara matriks/tabel lebar memiliki scroll lokal.

PDF sempat gagal setelah filesystem runtime diisolasi: executable Node berada di home yang disembunyikan, dan dependency Chromium cache lama berizin privat. Node kini di-bind read-only, 31 library publik yang diperlukan disalin ke direktori runtime readable/read-only; izin cache privat lama tidak diubah. Semua jenis ekspor PDF kemudian lulus ulang pada runtime terisolasi. Render worker menolak jaringan dan mematikan JavaScript.

Perbaikan lain mencakup rentang penugasan eksplisit, pencegahan roster retroaktif, penolakan konflik versi, pembatasan rekonsiliasi ulang data terkonfirmasi, penolakan publikasi snapshot dengan sumber berubah, proteksi formula CSV, penolakan formula XLSX impor, serta tipe numerik yang benar pada rekap Excel.

## Pengujian terakhir

| Suite | PASS | FAIL | SKIP |
| --- | ---: | ---: | ---: |
| HTTP/backend/RBAC/CRUD/ekspor | 189 | 0 | 0 |
| Kasus batas periode, piket, impor, bulk nilai, rapor | 50 | 0 | 0 |
| Browser akademik/CRUD/mobile/desktop | 154 | 0 | 0 |
| Browser login/layout/CSRF/session | 27 | 0 | 0 |
| Integritas, privilege, restore, runtime dan restart | 120 | 0 | 0 |
| **Total** | **540** | **0** | **0** |

Termasuk pemeriksaan **81 foreign key** tanpa orphan, lint **92 file PHP** sebagai satu pemeriksaan kelompok, dan syntax JS sebagai pemeriksaan terpisah. Jumlah di atas tidak dibangun dari menghitung setiap file lint sebagai satu kelulusan fitur. XLSX dibuka kembali dengan openpyxl; PDF diperiksa format dan objek halaman setelah render nyata; browser melakukan submit dan read-back database, bukan mock response.

Restart development benar-benar dijalankan. Session/login dan halaman absensi dibaca kembali; hash seluruh database development tetap sama. Startup dengan password runtime salah benar-benar gagal tanpa fallback, lalu konfigurasi benar dipulihkan dan website sehat kembali. Proteksi runtime diuji dalam namespace proses, termasuk kode read-only dan ketidakmampuan membaca konfigurasi owner/produksi.

Kasus yang belum masuk cakupan tidak dianggap lulus hanya karena SKIP = 0: perangkat HP fisik, beban multi-worker, seluruh modul tambahan legacy (misalnya alur ekstrakurikuler/evaluasi), format resmi sekolah dan kebijakan bisnis lanjutan tetap memerlukan pengujian tersendiri.

Reproduksi: `python3 tests/run_academic.py` dari worktree development. Runner menolak database lain, menggunakan fixture sintetis, menyimpan log privat, berhenti jika suite gagal, dan tidak me-reset data. Run berulang menambah data uji bertanda unik dan audit, bukan membersihkan sejarah.

## Database, backup dan bukti integritas

Migration additive baru:

- `003_academic_workflows`: `ak_periode`, `ak_anggota_kelas`, `ak_tugas_piket`, `ak_kalender`, `ak_pertemuan`, `ak_absensi_sesi`, `ak_absensi_harian`, `ak_riwayat`.
- `004_assignment_validity`: `ak_penugasan`.
- `005_versioned_grades_reports`: `ak_aturan_nilai`, `ak_nilai`, `ak_rapor_snapshot`, `ak_rapor_status`.

Total **13 tabel additive**. Foreign key RESTRICT pada struktur baru, unique pertemuan `(id_jadwal,tanggal)`, sesi `(id_pertemuan,nis)`, harian `(tanggal,nis)`, nilai dan versi snapshot mencegah duplikasi. Overlap keanggotaan/nomor absen diperiksa dalam transaksi dengan lock periode. Migration punya ledger dan guard CLI/testing/socket/database; tidak ada perubahan skema pada login, backfill legacy atau recalculation nilai historis. Rerun migration tidak mengubah snapshot DB.

Runtime tidak menggunakan root, tidak memiliki DDL/grant, dan berbeda dari principal migration. Aturan nilai, snapshot rapor, serta riwayat baru hanya SELECT/INSERT bagi runtime; update/delete ditolak. Session, upload, log, credential dan backup berada di luar document root/repository. Akun/grant database aktif tidak disentuh.

Backup terbaru pada state privat dibuat dengan single transaction/no lock dan dipulihkan ke **database baru**, tidak menimpa DB existing. Hasil: **38 tabel, 2295 baris sintetis**, seluruh hash skema/data/objek cocok persis. SHA-256 backup: `b8dad62e57c0ab426e99f66f202defbf53e3c5d4f5cccc9986ffd8454db20ad2`.

Lokasi privat dan hasil restore lengkap tercatat dalam `/home/muflih/.local/state/sia-academic-dev/20261031/reports/restore-latest.json`. Tidak ada dump atau credential dalam Git/laporan ini.

Bukti sumber yang dilindungi:

- Database aktif: **23 tabel dasar, 1 view, 203 baris**, seluruh hash skema/data/view/trigger/routine identik sebelum/sesudah. Fingerprint agregat metadata/hash: `259ce5469f2ab4a2c5c19e38b7854bb204722b1111c9a3496b29251e49a0cdef`.
- Jumlah **18 penugasan legacy** diverifikasi dengan SELECT dalam transaksi read-only; tidak ada pemetaan periode, perubahan grant, reset password, atau perubahan data historis.
- Semua hash **58 berkas target existing**, **1.940 berkas Laravel sumber**, dan **61 berkas release R0 aktif** identik; perubahan working tree target existing dipertahankan.
- Service 8085 tetap **PID 372**, waktu mulai **2026-10-31 09:58:43 WIB**, konfigurasi sama; tidak direstart oleh pekerjaan ini.

## Konfigurasi lokal di luar Git

Hanya runtime development baru `sia-academic-dev-20261031.service` pada loopback **18125** yang dipasang/direstart. Konfigurasi berada di `/etc/sia-academic-dev/20261031/`, state proses di `/var/lib/sia-academic-dev-20261031/`, dependency PDF publik read-only di `/opt/sia-academic-dev/20261031/pdf-libs/`. Source worktree di-bind read-only bagi proses web. Tidak ada release copying/deployment publik atau Docker.

Template/reproduksi konfigurasi ada di `ops/academic_runtime.py`; kontrol terbatas pada `ops/academic_server.py`. Password serta konfigurasi owner tetap privat. Proses staging MariaDB yang sudah ada digunakan melalui socket dengan schema/principal development baru; database produksi dan proyek sumber tetap tidak dimodifikasi.

## Belum selesai / risiko residual

1. **Data sekolah asli belum diintegrasikan.** Keputusan admin untuk 18 penugasan, periode/anggota kelas historis dan kalender resmi belum tersedia. Tidak boleh mengganti keputusan itu dengan fixture, perkiraan tahun, atau akses guru tambahan.
2. **Format resmi dan kebijakan kurikulum belum diratifikasi.** Jurnal/agenda/matriks/rapor sudah dapat dicetak/diunduh, tetapi kesesuaian persis dengan buku/foto resmi, tanda tangan, komponen kurikulum, aturan wali kelas, kelengkapan kehadiran dan tanggal penerbitan resmi masih perlu konfirmasi sekolah. Lima komponen formula saat ini eksplisit dan berversi.
3. **Transfer/kenaikan kelas penuh dan impor massal penugasan/anggota belum selesai.** Pengelolaan rentang anggota dan jadwal melalui CRUD sudah ada; penyetaraan nilai lintas kelas/periode sengaja ditolak sampai ada aturan yang jelas.
4. **Penyetaraan seluruh dashboard/laporan/modul tambahan legacy belum selesai.** Gunakan Ruang Akademik untuk sumber baru. Data lama tidak dipindah otomatis, dipublikasikan berdasarkan ketersediaan nilai, atau dihapus. Modul ekstrakurikuler/evaluasi di luar alur inti belum menjalani ulang seluruh skenario pada checkpoint ini.
5. **Kesiapan produksi belum dinyatakan.** Server PHP development single-process, pengujian beban/concurrency multi-worker, ketahanan setelah reboot host, lifecycle dependency runtime lintas mesin dan perangkat mobile fisik belum diverifikasi. Akses LAN belum diaktifkan; gunakan localhost/emulasi browser. Akun runtime produksi lama belum diubah karena tidak diizinkan pada tugas ini.

Prioritas selanjutnya: ratifikasi konteks akademik/data resmi, selesaikan impor/transfer dan penyetaraan laporan legacy, verifikasi format/kebijakan rapor sekolah, lalu uji performa serta perangkat nyata. Aktivasi produksi tetap pekerjaan terpisah; jangan menjalankan migration baru pada database aktif.

## Cara menggunakan dan checkpoint

Lihat [panduan lokal dan uji manual](docs/ACADEMIC_LOCAL_GUIDE.md). Akun yang tersedia: `uji_admin`, `uji_guru`, `uji_guru_lain`, `uji_piket`, `uji_siswa`, `uji_kepsek`. Password acak hanya pada file privat mode 0600: `/home/muflih/.local/state/sia-academic-dev/20261031/private/test-accounts.json`.

Pemulihan aman: hentikan hanya 18125, pertahankan branch/worktree, simpan backup, dan gunakan checkout/worktree baru untuk versi pembanding. Restore telah dibuktikan ke database baru; tidak ada rollback DDL destruktif otomatis atau pemulihan di atas data existing.

Konsep relasi guru–jadwal–kelas–mapel dan pengisian rapor dari [referensi Laravel](https://github.com/adhiariyadi/Sistem-Informasi-Akademik-Sekolah-Laravel) diadaptasikan selektif ke service/otorisasi native, tanpa menyalin asumsi authorization atau akun default. Bootstrap lokal dipin 5.3.8 dengan SRI sesuai [dokumentasi resmi](https://getbootstrap.com/docs/5.3/getting-started/download/); lisensi dan checksum aset disimpan pada `assets/vendor/`.

## Daftar berkas commit kode (59 berkas)

```
academic/export.php
academic/index.php
academic/layout.php
academic/views/calendar.php
academic/views/duty.php
academic/views/duty_calendar.php
academic/views/foundation.php
academic/views/grades.php
academic/views/home.php
academic/views/journal.php
academic/views/meeting.php
academic/views/reports.php
academic/views/student_attendance.php
academic/views/transfer.php
assets/css/academic.css
assets/css/login.css
assets/css/neutral.css
assets/js/academic.js
assets/vendor/BOOTSTRAP-ICONS-LICENSE.txt
assets/vendor/BOOTSTRAP-LICENSE.txt
assets/vendor/bootstrap-icons.min.css
assets/vendor/bootstrap.bundle.min.js
assets/vendor/bootstrap.min.css
assets/vendor/fonts/bootstrap-icons.woff
assets/vendor/fonts/bootstrap-icons.woff2
assets/vendor/manifest.json
auth/login.php
config/academic/attendance.php
config/academic/calendar.php
config/academic/export.php
config/academic/foundation.php
config/academic/grades.php
config/academic/transfer.php
config/config.php
config/crud_service.php
config/validation.php
config/web_routes.php
database/migrations/003_academic_workflows.php
database/migrations/004_assignment_validity.php
database/migrations/005_versioned_grades_reports.php
docs/ACADEMIC_LOCAL_GUIDE.md
docs/evidence/ACADEMIC_TEST_RESULTS.json
includes/footer.php
includes/header.php
ops/academic_dev_setup.py
ops/academic_fixture.php
ops/academic_pdf.cjs
ops/academic_runtime.py
ops/academic_runtime_probe.php
ops/academic_server.py
ops/migrate_academic.php
public/index.php
tests/academic_browser.cjs
tests/academic_db.php
tests/academic_edges.py
tests/academic_http.py
tests/academic_integrity.py
tests/login_layout.cjs
tests/run_academic.py
```

Laporan checkpoint ini merupakan satu berkas dokumentasi tambahan. Tidak ada berkas rahasia, backup, session, atau dump SQL yang dimasukkan repository.
