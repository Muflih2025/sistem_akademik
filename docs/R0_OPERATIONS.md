# R0 — operasi lokal dan staging

Pekerjaan R0 berada pada branch `r0/baseline-staging-20261030`, worktree `/home/muflih/sia-r0-worktree`. Working tree layanan aktif `/home/muflih/sistem_akademik` dan proyek Laravel sumber tidak diubah. Jangan menunjuk layanan aktif ke branch ini sebelum persetujuan dan pemeriksaan operator.

## Batas keamanan

- `public/` adalah satu-satunya document root. `public/index.php` merupakan dispatcher allowlist; tidak meneruskan berkas sembarang ke static server. Tidak memakai `.htaccess`.
- Rute lama seperti `/auth/login.php` tetap tersedia melalui dispatcher. Direktori config/includes/shared/ops/database, SQL, dotfiles, README, log, Adminer dan wrapper database tidak dirutekan.
- `php -S` tanpa `-t public public/index.php` **bukan** konfigurasi aman. Jangan menjalankan server dari root proyek.
- Konfigurasi database harus berasal dari environment `SIA_*` atau `SIA_CONFIG_FILE` JSON **di luar direktori aplikasi**. Tidak ada fallback akun database bawaan. File konfigurasi, backup, sesi, dan log harus berada di direktori privat 0700 dengan berkas 0600.
- Konfigurasi contoh `ops/config.example.json` hanya berisi placeholder. Jangan memasukkan kredensial nyata ke Git, shell arguments, URL, dokumentasi, atau output tes.
- Staging MariaDB menggunakan `--skip-networking` dan Unix socket di direktori privat. HTTP hanya `127.0.0.1`. Akun runtime hanya DML pada database fixture, tidak mempunyai DDL atau akses ke salinan database asli.
- Nama sesi dan lokasi session staging terpisah dari layanan aktif; cookie tidak dibedakan berdasarkan port sehingga isolasi nama sesi ini wajib.

## Baseline dan backup

Baseline awal lengkap disimpan privat, termasuk perubahan untracked dan penghapusan yang sudah ada. Archive working tree dan Git bundle mempertahankan keadaan sebelum R0. Dump yang sudah terlanjur ada pada riwayat Git lama tidak dibersihkan dengan rewrite history dalam R0; jangan memublikasikan history tersebut.

SQL dan alat DB dikeluarkan dari tracking branch R0 dan ditambahkan ke `.gitignore`. `git rm --cached` tidak menghapus salinan berkas dari filesystem atau database. Dump tetap berada pada target aktif sampai operator menerapkan pembatasan document root; ignore Git bukan kontrol HTTP.

Metode database: dump baru melalui `mariadb-dump --single-transaction --skip-lock-tables`, mencakup data, struktur, view, trigger, routine dan event. Tidak menggunakan skrip reset SQL yang ada pada proyek. Semua tabel aktif yang diaudit memakai InnoDB. Hentikan bila terdapat drift bersamaan atau tabel nontransaksional sebelum menyatakan backup konsisten.

State R0 pertama berada di `/home/muflih/.local/state/sia-r0/20261030-r0`. Isi privat:

- `backups/working-tree-before.tar.gz`, `backups/history-before.bundle`;
- `backups/database.sql.gz`, `backups/schema-only.sql`;
- `private/` untuk konfigurasi, socket, PID dan fixture login;
- `sessions/`, `logs/`, `reports/` dan `database/` untuk staging.

Backup lokal ini belum menjadi pengganti kebijakan retensi, enkripsi dan backup off-host. Jangan melampirkan archive, dump atau konfigurasi privat ke issue/PR.

## Mengulangi backup dan restore

Siapkan **direktori state baru**, bukan menghapus atau menginisialisasi ulang state yang ada:

```bash
umask 077
mkdir -p /private/new-r0-state/{backups,reports,private,database,sessions,logs}
chmod 700 /private/new-r0-state
```

Buat JSON koneksi database asal secara privat, dengan key `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` atau `DB_SOCKET`. Gunakan akun yang diizinkan membaca data, view, trigger/routine/event. Jangan menambahkan akun atau grant pada database aktif tanpa izin operator.

Dari worktree R0:

```bash
python3 ops/r0_environment.py backup \
  --state /private/new-r0-state \
  --config /private/source-connection.json

python3 ops/r0_environment.py stage --state /private/new-r0-state
python3 ops/r0_environment.py start-web --state /private/new-r0-state --port 18085
python3 tests/r0_http.py --state /private/new-r0-state
```

Backup menolak menimpa berkas backup yang sudah ada. Inisialisasi staging menolak direktori data yang sudah berisi sistem MariaDB. Restore hanya dilakukan pada server baru yang dibuat oleh prosedur ini, melalui socket lokalnya. Tidak ada fallback koneksi ke server aktif.

Restore hasil backup memakai database dengan nama yang sama pada **instance berbeda** untuk menjaga referensi view/procedure. Web staging memakai database fixture lain, dengan data sintetis dan kredensial runtime terpisah. Akun siswa/guru asli tidak dipakai untuk pengujian login atau mutasi.

Fingerprint membandingkan SHOW CREATE semua tabel/view, hash seluruh baris, definisi trigger dan routine. Tidak mencetak nilai baris atau hash password individual. Pemeriksaan integritas memakai koneksi inspector privat, bukan menaikkan privilege runtime hanya demi tes.

Jika sebuah langkah gagal setelah instance dibuat, jangan menjalankan reset otomatis. Periksa status privat dan gunakan state baru untuk rehearsal berikutnya. Berkas hasil parsial tidak boleh dilaporkan sebagai backup/restore berhasil.

## Deployment skema terkontrol

Login dan guard tidak memanggil fungsi provisioning. Dua belas statement kompatibilitas DDL lama dipindahkan ke `database/migrations/001_legacy_runtime.php`, tanpa seed akun. Runner `ops/migrate.php` hanya bisa dijalankan CLI, lingkungan `staging/testing`, flag `--apply`, database eksplisit yang cocok, serta konfigurasi owner dengan izin deployment aktif.

```bash
SIA_CONFIG_FILE=/private/staging-owner.json php ops/migrate.php \
  --apply --expected-database=staging_database_name
```

Konfigurasi owner harus mempunyai `APP_ENV` staging/testing dan `ALLOW_SCHEMA_CHANGES` bernilai `1`. Jangan memakai konfigurasi owner untuk web. Runner R0 menolak produksi dan tidak dimaksudkan sebagai installer seluruh skema dari nol. Database dasar harus sudah ada dari restore/schema staging yang diverifikasi.

DDL MariaDB dapat melakukan implicit commit; migration ini tidak mengklaim rollback transaksi DDL. Versi dicatat setelah berhasil; eksekusi kedua tidak mengulang migration. Tidak menjalankan `migrate:fresh`, reset, DROP atau TRUNCATE terhadap database aktif.

## Tes dan hasil

`tests/r0_http.py` memverifikasi fixture/environment/socket dan state database sebelum menjalankan HTTP. Tes berhenti bila fixture sudah drift; tidak menghapus data untuk memperbaiki tes. Hasil JSON hanya berisi nama tes/status dan fakta agregat.

Cakupan: GET/HEAD internal termasuk variasi encoding/path traversal; halaman publik dan CSS; akses guest dan role salah; login benar, salah, tidak dikenal dan nonaktif; token CSRF kosong/salah/array; regenerasi sesi; replay sesi lama; logout GET tanpa mutasi dan logout POST tervalidasi; privilege runtime; deployment dengan kredensial web ditolak; fingerprint seluruh skema/data tetap.

Menghentikan proses staging milik state ini tanpa menghapus datanya:

```bash
python3 ops/r0_environment.py stop --state /private/new-r0-state
```

PID diperiksa terhadap command line sebelum sinyal dikirim. Jangan memakai kill berdasarkan nomor port atau menghentikan MariaDB aktif.

## Aktivasi layanan aktif — belum dilakukan

Template berada di `ops/deploy/systemd.override.conf.example` dan `ops/deploy/nginx.local.conf.example`. Keduanya **belum dipasang, belum di-reload, dan belum dianggap lulus pengujian konfigurasi produksi**. PHP built-in server staging sudah diuji; template Nginx/PHP-FPM memerlukan validasi operator pada host tujuan.

Operator harus meninjau commit dan diff khusus R0 terhadap baseline working tree privat. Jangan menimpa perubahan pengguna dengan checkout/reset/cherry-pick seluruh baseline secara membabi buta.

Sebelum aktivasi: pastikan backup terkini, kredensial existing dipindahkan ke file privat tanpa reset akun, document root `public/`, router selalu dipakai, izin sesi/log, koneksi database yang tepat, dan rencana rollback konfigurasi layanan. Pergantian document root/router/restart layanan aktif memerlukan persetujuan eksplisit pengguna. Pembuatan akun/grant baru pada database aktif juga memerlukan persetujuan terpisah.

Setelah aktivasi yang disetujui, ulangi GET/HEAD SQL, Git, env/log/config/tools; seluruhnya harus 403/404. Uji landing, CSS dan login dengan akun uji khusus yang disetujui untuk lingkungan itu. Jangan menjalankan fixture tests terhadap produksi.

Rollback staging: hentikan hanya proses state staging. Rollback aktivasi aktif: pulihkan konfigurasi layanan/file versi sebelumnya dari baseline yang telah ditinjau; jangan restore dump lama di atas transaksi baru. Mengembalikan konfigurasi lama juga mengembalikan kelemahan lama sehingga bukan penyelesaian keamanan permanen.

## Batas fase

R0 tidak memperbaiki seluruh otorisasi objek, status sesi setelah nonaktif, rate limiting, rumus nilai, actor absensi, riwayat kelas, rapor, kalender, atau UI. Temuan tersebut tetap mengikuti audit dan memerlukan pekerjaan R1/fase berikutnya. Tidak ada migrasi framework dan tidak ada implementasi fitur akademik baru di R0.
