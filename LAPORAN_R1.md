# LAPORAN IMPLEMENTASI FASE R1

Tanggal: 30 Oktober 2026. Status: **implementasi dan pengujian R1 selesai pada development/staging**. **Belum deployment ke layanan aktif; R2 tidak dimulai.**

## 1. Baseline, branch dan batas perubahan

- Baseline: R0 `531d2f8` yang telah aktif pada 8085.
- Branch: `r1/security-crud-20261030`.
- Worktree: `/home/muflih/sia-r1-worktree`.
- Commit implementasi: `87ee47275ff41ca18bb33712bbee6c4722a4d09f`.
- Laporan ini ditambahkan dalam commit dokumentasi berikutnya; gunakan `git log -2 --oneline` untuk melihat keduanya.
- Target utama `/home/muflih/sistem_akademik` beserta perubahan existing tetap utuh. Proyek Laravel sumber hanya dibaca. Tidak ada migrasi framework, perubahan grant aktif, restart/deployment 8085, DROP TABLE, TRUNCATE, reset database atau perubahan historis produksi.
- HTTP staging: `http://127.0.0.1:18091`, non-root, loopback saja. Database sintetis `r1_testing_20261030` menggunakan instance MariaDB socket-only yang terpisah dari database aktif. Identitas runtime, session, log dan state keamanan terpisah dari R0.

## 2. Ringkasan hasil

Autentikasi kini memeriksa kembali akun dan referensinya pada setiap request. Seluruh CRUD inti memeriksa role, input, relasi dan operasi pada backend. Guru dibatasi oleh kelas, mapel, siswa, jadwal dan periode. Siswa hanya membaca datanya sendiri serta rapor periode yang dipublikasikan. Kepala sekolah dapat membaca laporan dan melakukan supervisi yang diizinkan, tanpa mendapatkan akses perubahan nilai/absensi admin.

Pembuatan siswa baru menggunakan INSERT, mempertahankan nol depan NIS, menolak duplikasi dan memakai penonaktifan untuk menjaga arsip. Jadwal dan penugasan menggunakan relasi existing yang sama. Absensi menyimpan akun pencatat melalui `users.id_user`, sementara guru pengajar tetap melalui jadwal. Audit disimpan bersama transaksi bisnis.

UI form CRUD yang terdampak memakai putih, hitam `#111111`, abu-abu `#F3F4F6`, kontrol sentuh minimal 44px dan navigasi ringkas pada HP. Form telah diuji tanpa horizontal scrolling dari 320px sampai desktop. Tabel lebar menggunakan scroll lokal di wadah tabel. Dashboard, jurnal dan absensi tidak mendapat redesign besar; halaman absensi hanya diperbaiki keamanan/backend dan asosiasi form yang diperlukan.

## 3. Keamanan autentikasi dan sesi

| Area | Implementasi dan verifikasi |
|---|---|
| Password | `password_verify`; akun/password baru menggunakan BCrypt dan validasi 10–72 byte. Tidak ada password/default account otomatis. Password existing tidak di-reset. |
| Session | Regenerasi ID setelah login; cookie HttpOnly, SameSite=Lax, Secure saat diaktifkan/HTTPS server. Idle 30 menit, maksimum 8 jam, dapat dikonfigurasi. |
| Pencabutan sesi | Perubahan username, hash password, role, referensi atau status membatalkan fingerprint sesi. Status master guru/siswa juga diperiksa. |
| Logout | POST + CSRF; sesi dan cookie dibatalkan. Replay cookie lama ditolak. GET hanya menampilkan form konfirmasi. |
| CSRF | Token hilang, salah atau berbentuk array ditolak. Operasi tulis tidak dipindahkan ke GET. |
| Pembatasan login | Reservasi dengan file lock; 5 percobaan/identitas/IP per 15 menit, batas IP terpisah. Uji 12 request serentak: tepat 5 diproses dan 7 ditolak. |
| Error | Pesan autentikasi generik; error PDO/stack/credential tidak ditampilkan. Error validasi 422, konflik relasi/unik 409, kegagalan operasi generik. |
| DDL saat login | Tidak ada CREATE/ALTER/provisioning pada request login. Snapshot database sebelum/sesudah alur autentikasi identik. |
| Audit/log | Audit before/after mengecualikan password/hash/token. Log keamanan hanya event dan identifier terbatas, berada di luar document root. |

Cookie Secure diuji sebagai atribut konfigurasi melalui fixture localhost. TLS end-to-end/reverse proxy produksi belum diuji dalam R1.

## 4. RBAC, kepemilikan dan IDOR

- Admin: pengguna, master akademik, jadwal/penugasan, periode, publikasi dan konfigurasi bobot sesuai permission.
- Guru: kelas/mapel yang ditugaskan, siswa di kelas tersebut, jadwal dan jurnal miliknya. Nilai juga memeriksa pemilik record dan periode aktif tidak terkunci. Nama guru pengganti bebas tidak dapat dipakai sebagai delegasi otorisasi.
- Ekskul guru: harus pembina yang ditetapkan melalui ID guru, sekaligus memenuhi scope kelas/periode; teks nama pembina saja tidak memberikan akses.
- Siswa: parameter NIS asing ditolak, POST pada halaman baca ditolak; nilai dan ekskul rapor difilter menurut publikasi periode.
- Kepala sekolah: halaman tahun ajaran menjadi baca saja, tidak mengaktifkan periode. Catatan supervisi milik pengguna lain tidak bisa diedit/dihapus melalui manipulasi ID.
- Export dan rekap: pemeriksaan role/kelas/mapel/periode dilakukan kembali, termasuk request endpoint langsung. `deny_access()` tersedia terpusat.
- Rute publik tetap melalui allowlist R0; SQL, `.git`, `.env`, konfigurasi, log, Adminer, helper tes dan migration CLI tidak disajikan. Wrapper kalender memperoleh pemeriksaan role; shared calendar tidak dapat dipanggil sebagai endpoint langsung.
- Tidak menambah role operator/wali kelas secara spekulatif; empat role existing dipertahankan.

Pengujian meliputi manipulasi GET/POST untuk kelas, NIS, mapel, guru, ID nilai, ID absensi dan periode. Kontrol tidak bergantung pada tombol/dropdown.

## 5. Hasil CRUD

| Modul | CREATE / READ / UPDATE | Nonaktifkan dan relasi | Pencarian/filter/pagination | Status |
|---|---|---|---|---|
| User | Username unik, referensi guru/siswa valid, password eksplisit; edit dan reset fixture teruji | Menjaga admin aktif terakhir; perubahan membatalkan sesi; akun master yang dinonaktifkan ikut dicabut | Cari username/role/referensi, filter role/status, 20 per halaman | PASS |
| Guru | NIP unik; nama, email, telepon divalidasi | Arsip tetap ada; akun guru terkait dinonaktifkan secara transaksional | Pencarian dan filter status, 20 per halaman | PASS |
| Siswa | NIS baru benar-benar INSERT; nol depan tetap; tanggal lahir/kelas valid; UPDATE tepat sasaran | Tidak menghapus nilai/absensi; NIS immutable; pindah kelas siswa berarsip ditolak | Cari identitas/nama, filter kelas/jurusan/status, 20 per halaman | PASS |
| Kelas | Nama unik, tingkat dan jurusan aktif valid | Penonaktifan menjaga seluruh referensi | Cari dan filter status, 20 per halaman | PASS |
| Mata pelajaran | Kode unik, kelompok valid, KKM 1–100 | Penonaktifan tanpa menghapus nilai | Cari dan filter status, 20 per halaman | PASS |
| Jadwal | Guru/mapel/kelas aktif, periode eksplisit, jam/hari valid; bentrok guru/kelas/ruang ditolak; jadwal berdampingan diterima | Nonaktifkan; konteks/jam penugasan berarsip dibekukan | Cari, filter guru/kelas/mapel/periode/status, 20 per halaman | PASS |
| Penugasan | Halaman `admin/penugasan.php` memakai layanan dan entitas jadwal yang sama | Aturan arsip dan bentrok sama, tanpa model semester baru | Pencarian/filter/pagination sama dengan jadwal | PASS |
| Jurusan | Kode unik, validasi nama, CREATE/UPDATE | Nonaktifkan, relasi tetap ada | Cari/filter status/pagination | PASS |
| Tahun/semester | Format tahun berurutan, semester valid, aktivasi/kunci/publikasi eksplisit | Periode berarsip tidak diganti identitasnya; aktivasi ID tidak ada tidak menonaktifkan semua periode | Pencarian tahun; daftar periode existing kecil | PASS |

Error record tidak ada menghasilkan 404, bukan pesan sukses palsu. Validasi duplikasi dan constraint database dipertahankan; operasi multi-tabel dan audit menggunakan transaksi. Akun siswa/guru tidak dibuat otomatis ketika master diimpor/disimpan.

NISN: **SKIP / tidak berlaku**, karena kolom ini tidak digunakan oleh skema existing. Tidak dibuat kolom identitas baru tanpa kebutuhan domain.

Impor CSV/XLSX existing diperbaiki: header eksplisit, NIS sebagai teks, dukungan shared/inline string dan kolom Excel renggang, tanggal ISO, batas ukuran/baris/dekompresi, penolakan formula/DOCTYPE dan kelas tidak dikenal. Satu batch memakai satu transaksi; baris invalid membatalkan seluruh batch. Ekspor CSV teruji kembali, termasuk perlindungan formula pada data dan metadata nama kelas/mapel.

## 6. Absensi, jurnal dan nilai

- `absensi.created_by` diisi dari akun login (`current_user()['id_user']`), bukan ID guru. Fixture sengaja memakai user 50 dengan guru 1; create, update, baca ulang, FK dan audit lulus.
- Upsert memakai unique key existing sehingga koreksi tidak menggandakan absensi. Penghapusan fisik absensi ditolak; koreksi diaudit.
- Jadwal harus milik guru, siswa harus pada kelasnya, tanggal sesuai hari penugasan, dan periode harus aktif/tidak terkunci. Jadwal NULL periode ditolak untuk tulis tanpa menebak periodenya.
- Penyimpanan jurnal dan daftar kehadiran kelas berada pada satu transaksi. Roster harus tepat sesuai semua siswa aktif kelas; status yang hilang tidak otomatis dianggap hadir.
- Uji kegagalan di tengah transaksi melalui trigger fixture membuktikan jurnal, absensi dan audit seluruhnya rollback, tanpa perubahan trigger produksi.
- Nilai dibatasi 0–100; nol diterima, nilai negatif/nonangka/di atas 100 ditolak. Akses nilai milik guru lain, mapel lain, siswa lain dan periode terkunci ditolak. Bobot tervalidasi total 100 dan scope-nya, NULL default ditangani tanpa membuat duplikasi baru. Default bobot ambigu ditolak untuk peninjauan.
- Tidak menghitung ulang seluruh nilai lama. Hanya operasi fixture yang memang diminta tes melakukan penyimpanan ulang.
- Pemeriksaan READ ONLY atas database aktif: **4 absensi, 0 identitas pencatat yang tidak cocok dengan role/referensi guru jadwal**. Ini hasil dataset saat pemeriksaan, bukan jaminan untuk data yang belum masuk. Fixture legacy yang sengaja ambigu dipertahankan utuh; tidak ada perbaikan historis berdasarkan tebakan.

## 7. Perubahan skema dan kompatibilitas R0

Migrasi aditif `002_r1_security` hanya dijalankan di staging:

1. Status aktif/nonaktif pada jurusan, kelas, guru, siswa, mata pelajaran, jadwal dan ekstrakurikuler.
2. Kunci transaksi serta publikasi rapor pada tahun ajaran, default 0.
3. `jadwal.id_tahun_ajaran` nullable dan FK RESTRICT; jadwal lama tidak dibackfill otomatis.
4. `ekstrakurikuler.id_guru_pembina` nullable dan FK RESTRICT; nama pembina bebas tidak diubah menjadi identitas secara tebakan.
5. `audit_aktivitas` dengan FK actor ke users dan index record; runtime staging INSERT-only untuk audit.
6. Ledger migrasi CLI; runner menolak web, database yang tidak cocok, environment production dan owner tanpa flag eksplisit.

Dijalankan saat setup dan diulang dua kali pada akhir pengujian; snapshot schema/data/akun/view/trigger/routine tetap sama setelah pengulangan. DDL MariaDB memiliki implicit commit; tidak ada klaim rollback DDL otomatis. Sintaks telah diuji pada MariaDB lokal, belum pada engine lain.

Document root/router R0 tetap dipakai. R1 menambah allowlist CSS CRUD dan penugasan, serta membatasi POST pada endpoint yang memang mempunyai operasi tulis. Migration dan helper tes tetap tidak dapat diakses melalui HTTP. Framework tetap PHP native.

## 8. Pengujian dan bukti

| Suite akhir yang benar-benar dijalankan | PASS | FAIL | SKIP |
|---|---:|---:|---:|
| HTTP/auth/RBAC/CRUD/absensi/regresi | 179 | 0 | 1 |
| Browser Chromium, layout dan submit nyata | 59 | 0 | 0 |
| Database staging, migrasi ulang dan 26 FK | 29 | 0 | 0 |
| Integritas target/sumber/release/database/layanan aktif | 12 | 0 | 0 |
| **Total** | **279** | **0** | **1** |

Tambahan: lint **62 file PHP** lulus; Python test runner terkompilasi; JavaScript runner lolos `node --check`; `git diff --check` lulus. Lint tidak dijumlahkan sebagai kasus suite di atas.

Browser memeriksa sembilan halaman CRUD pada 320, 360, 390, 768, 1024 dan 1440px, warna aksi utama, tombol logout monokrom, asosiasi input-form, pembuatan siswa lewat form HP, serta koreksi absensi lewat submit browser dan baca ulang backend. Tidak ada error JavaScript pada alur tersebut atau fatal PHP pada suite HTTP. Ini pengujian Chromium headless; bukan pengujian semua perangkat browser fisik atau TLS produksi.

Ringkasan dan semua nama kasus/status tanpa credential ada di [docs/evidence/R1_TEST_RESULTS.json](docs/evidence/R1_TEST_RESULTS.json). Bukti privat terperinci ada di `/home/muflih/.local/state/sia-r1/20261030-r1/reports/`:

- `http-tests-latest.json` dan `http-tests-45ea95.json`: hasil HTTP akhir.
- `browser-tests.json`, `database-tests.json`, `integrity-tests.json`, `lint.json`.
- `active-database-before.json`, `active-database-after.json`, `fixture-before.json`, `fixture-after.json`.
- `target-before/after.json`, `source-before/after.json`, `active-release-before/after.json`, baseline Git dan hash konfigurasi service.
- `historical-identity.json` dan `environment.json`.
- `screenshots/crud-siswa-320.png`, `screenshots/penugasan-desktop.png`: fixture sintetis.

Pengujian awal sempat mendeteksi perbandingan atribut cookie Secure yang peka huruf besar/kecil pada test runner. Atribut PHP adalah `secure`; assertion diperbaiki menjadi case-insensitive dan suite akhir dijalankan ulang. Tidak ada kegagalan disembunyikan atau hasil awal dihitung sebagai hasil akhir.

## 9. Bukti integritas dan backup

- Database aktif: **23 base table, 1 view, 203 baris tabel**, semua hash struktur/data sebelum dan sesudah identik. Hash trigger/routine juga identik. Digest SHA-256 manifest kanonik sebelum/sesudah: `716d5f00f69f9cda6ecf24d522ac99b398462dc63f2b0ca658ec24743e164e41`.
- Target utama: **58 berkas** identik dengan baseline, termasuk status Git dirty existing.
- Sumber Laravel: **1.940 berkas** identik; tidak ada perubahan pada sumber.
- Release aktif R0: **61 berkas** identik; hash override service identik; service tetap running sebagai `muflih`, binding 127.0.0.1:8085.
- HEAD login 8085 tetap 200. Dump SQL, `.git/config`, `.env`, log, konfigurasi dan Adminer tetap 404. Pada staging, canary berkas sensitif yang secara fisik ada di public juga ditolak GET/HEAD.
- Backup database R0 aktivasi pada state privat tetap ada, SHA-256 cocok dan gzip dibaca sampai selesai. Bukti restore R0 sebelumnya tetap PASS: 23 tabel, 1 view, 1 trigger, 1 routine, data/skema normalisasi cocok.
- **R1 tidak melakukan restore ulang database aktif maupun salinan berisi data nyata.** Restore R0 dipakai sebagai bukti yang tersedia, dengan hash backup diverifikasi kembali. Staging R1 diisi fixture sintetis dari struktur, bukan akun/data sekolah.
- Seluruh 26 relasi FK staging diperiksa: tidak ada orphan.
- Credential scan terhadap file kode/dokumentasi terpilih dibanding rahasia konfigurasi privat tidak menemukan password aktual; konfigurasi/dump/session/browser binaries tidak masuk repository.

## 10. Risiko dan pekerjaan tersisa

1. **Deployment R1: PENDING persetujuan terpisah.** Port 8085 masih menjalankan R0; perbaikan R1 belum melindungi proses produksi sampai diaktifkan melalui prosedur terkontrol.
2. **Penugasan lama tanpa periode:** dapat dibaca dalam scope yang sah, tetapi transaksi baru diblokir. Admin perlu meninjau lalu menonaktifkan jadwal lama dan membuat jadwal berperiode. Penugasan berarsip tidak diubah identitasnya. Tidak ada backfill massal otomatis.
3. **Publikasi rapor:** default kolom baru 0 menyembunyikan rapor dari siswa sampai admin secara eksplisit mempublikasikannya. Kebijakan publikasi dan review kelengkapan harus disepakati sebelum aktivasi.
4. **Riwayat keanggotaan kelas belum dimodelkan.** Pindah kelas siswa yang sudah mempunyai arsip ditolak. Perancangan domain ini menjadi masukan R2; tidak disiasati dengan menulis ulang sejarah.
5. **Grant produksi belum diubah.** Runtime produksi perlu ditinjau terhadap kebutuhan audit INSERT dan pembatasan DDL/DELETE. Runner migrasi sengaja menolak production; mekanisme penerapan skema produksi masih perlu review dan izin, bukan mengganti label environment untuk melewati guard.
6. **Batas login berbasis file/IP:** memerlukan state privat writable dan persisten; sesuaikan batas IP untuk NAT sekolah. Koordinasi multi-server membutuhkan penyimpanan limit terpusat saat arsitektur berubah.
7. **DDL:** aditif tetapi dapat mengunci tabel/implicit commit. Waktu maintenance, engine/version dan kemampuan rollback kode perlu diverifikasi pada staging hasil salinan terbaru sebelum aktivasi.
8. **Cakupan UI:** CRUD terdampak sudah responsif; redesign absensi HP, jurnal, dashboard dan integrasi domain lengkap belum dikerjakan. Styling Bootstrap/CDN existing masih membutuhkan konektivitas; dukungan offline tidak diklaim.
9. **Cakupan tes:** tidak mencakup semua browser fisik, beban produksi, TLS end-to-end, kebijakan multi-server atau seluruh format pencetakan. CSV dan impor CSV/XLSX serta alur prioritas existing sudah diuji; tidak mengklaim sertifikasi keamanan menyeluruh.
10. Backup yang diverifikasi adalah backup privat R0 pada host yang sama. Sebelum deployment perlu backup terbaru, restore ulang terisolasi, dan kebijakan retensi/off-host. Jangan memublikasikan history Git lama yang pernah berisi dump.

Tidak ada persetujuan produksi diminta dalam pekerjaan R1 ini karena seluruh perubahan tulis dilakukan di staging yang sudah diotorisasi. Aktivasi, perubahan grant dan migrasi produksi menunggu tindakan terpisah.

## 11. Deployment dan rollback yang aman

Panduan rinci ada di [docs/R1_OPERATIONS.md](docs/R1_OPERATIONS.md). Urutannya: review commit/diff, UAT empat role, keputusan periode/publikasi, backup privat terbaru dan restore terisolasi, review DDL/izin, persetujuan eksplisit aktivasi, release baru di luar working tree pengguna, document root public/router allowlist/non-root, lalu verifikasi HTTP dan integritas yang disesuaikan dengan perubahan yang diotorisasi.

Jika verifikasi gagal, kembalikan kode/config ke release R0 dan hentikan operasi baru. Pertahankan kolom aditif, audit dan transaksi sah; jangan DROP/TRUNCATE atau menimpa database dengan backup setelah ada transaksi baru. Pemulihan data membutuhkan rencana terpisah. R1 belum mengubah service, sehingga rollback layanan saat ini tidak diperlukan. Perubahan kode dapat ditinjau/dipulihkan melalui commit tanpa menyentuh working tree pengguna.

## 12. Kesiapan fase R2

**Siap untuk review dan perencanaan R2 pada development/staging.** Kriteria inti R1 lulus dan fondasi autentikasi, otorisasi, transaksi, audit, validasi serta fixture tersedia. Perancangan riwayat keanggotaan kelas, model pertemuan bersama jurnal/absensi/agenda, pemetaan periode legacy dan kebijakan publikasi menjadi masukan berikutnya.

R2 tidak dimulai otomatis. Keberhasilan staging bukan izin deployment R1. Pengguna perlu meninjau laporan dan memberikan instruksi fase berikutnya atau aktivasi secara terpisah.

## 13. Daftar file berubah

Commit implementasi mengubah 59 file berikut. Laporan `LAPORAN_R1.md` ini menjadi file ke-60 dalam commit dokumentasi.

- `README.md`
- `admin/ekskul.php`
- `admin/export_import.php`
- `admin/export_nilai.php`
- `admin/jadwal.php`
- `admin/kalender.php`
- `admin/master.php`
- `admin/nilai.php`
- `admin/penugasan.php`
- `admin/posisi_guru.php`
- `admin/tahun_ajaran.php`
- `admin/users.php`
- `assets/css/crud.css`
- `auth/change_password.php`
- `auth/login.php`
- `auth/logout.php`
- `config/academic_service.php`
- `config/auth.php`
- `config/authorization.php`
- `config/config.php`
- `config/crud_service.php`
- `config/import_service.php`
- `config/validation.php`
- `config/web_routes.php`
- `database/migrations/002_r1_security.php`
- `docs/R1_OPERATIONS.md`
- `docs/evidence/R1_TEST_RESULTS.json`
- `guru/absen.php`
- `guru/ekskul.php`
- `guru/export_nilai.php`
- `guru/index.php`
- `guru/jadwal.php`
- `guru/jurnal.php`
- `guru/kalender.php`
- `guru/nilai.php`
- `guru/rapor.php`
- `guru/rekap_absen.php`
- `includes/crud.php`
- `includes/header.php`
- `includes/sidebar.php`
- `index.php`
- `kepsek/evaluasi.php`
- `kepsek/kalender.php`
- `kepsek/posisi_guru.php`
- `kepsek/tahun_ajaran.php`
- `ops/migrate_r1.php`
- `public/index.php`
- `shared/kalender.php`
- `siswa/absen.php`
- `siswa/index.php`
- `siswa/jadwal.php`
- `siswa/kalender.php`
- `siswa/rapor.php`
- `tests/r1_browser.cjs`
- `tests/r1_database.py`
- `tests/r1_db.php`
- `tests/r1_environment.py`
- `tests/r1_http.py`
- `tests/r1_integrity.py`
