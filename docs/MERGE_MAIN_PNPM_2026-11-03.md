# Merge development ke main dan pnpm dev — 3 November 2026

Dasar `main`: `a5c7b87`. Branch development yang digabungkan: `development/academic-workflows-20261031`, sampai launcher `18b58f9`. Merge dilakukan di worktree integrasi terpisah; file dan perubahan existing di `/home/muflih/sistem_akademik` tidak ditimpa.

## Hasil

- Navigasi modul atas/sidebar, perbaikan tanggal awal absensi/nilai, perbaikan simpan tugas Piket dan fondasi akademik yang menjadi ketergantungannya masuk ke hasil merge.
- `pnpm dev` menjalankan PHP native pada localhost melalui document root `public` dan router allowlist, tanpa Python, sudo, systemd, Docker, migration, seed atau perubahan grant.
- `pnpm dev:setup` membuat template konfigurasi privat sekali; file existing tidak ditimpa. `pnpm dev:check` memeriksa PHP, ekstensi, koneksi dan tabel dengan transaksi baca-saja.
- Konfigurasi produksi, akun root runtime, file konfigurasi di dalam repo dan port 8085 ditolak. Port yang sedang dipakai tidak dihentikan. Cookie sesi diberi suffix port agar dua localhost tidak saling menghapus login.
- Setup database, akun testing dan dependensi worker PDF tetap merupakan langkah pertama yang terpisah. Clone dan pnpm tidak menyalin data komputer pengembang atau membuat database otomatis. Instruksi lengkap: [DEVELOPMENT.md](DEVELOPMENT.md).

## Resolusi merge

Ada **27 konflik** pada konfigurasi, header/sidebar dan modul legacy. File konflik diselesaikan menggunakan implementasi development yang sudah diaudit, termasuk autentikasi/otorisasi serta modul akademik database nyata. Setelah resolusi awal, kandidat identik dengan development selain `test.md` yang diselaraskan dengan panduan terbaru. Penyesuaian sesi per port dan bukti merge kemudian ditambahkan pada kandidat.

Empat tambahan lokal pada main lama tidak dimasukkan kembali ke HEAD: `db.php`, `adminer.php`, workbook `data kelas 10 clean.xlsx`, dan skrip SQL legacy. Salinan file dipertahankan pada worktree asli dan backup privat; bukan penghapusan database atau data sekolah. Skema yang sah tetap dikelola lewat migration PHP existing. `.gitignore` mengabaikan spreadsheet lokal, dependency installs, credential, dump dan log. Riwayat Git lama tidak ditulis ulang.

## Pengujian hasil merge

| Kelompok | PASS | FAIL | SKIP |
|---|---:|---:|---:|
| Launcher nyata `tests/dev_launcher.cjs` | 8 | 0 | 0 |
| Browser navigasi `tests/academic_navigation.cjs`, server pnpm port 18126 | 8 | 0 | 0 |
| **Total skenario terfokus** | **16** | **0** | **0** |

Launcher diuji mulai dari pembuatan config/no-overwrite, penolakan konfigurasi berbahaya, pemeriksaan baca-saja, startup PHP, proteksi file, login nyata/RBAC, port terpakai, sampai Ctrl+C yang menghentikan child PHP. Exit SIGINT standar pnpm (0/130 atau signal SIGINT) diterima hanya bila server PHP benar-benar berhenti. Seluruh snapshot skema/data tetap identik.

Browser menguji klik modul dan fitur Admin/Guru/Piket/Kepsek/Siswa, pemisahan menu sesuai tugas, editor absensi yang tidak hilang saat menu dibuka/ditutup, tanpa JS, logout, cetak, CSRF/IDOR/RBAC dan proteksi internal. Halaman Admin, absensi Guru dan monitoring Kepsek diuji pada 320/375/430/768/1440px. Ini hasil pada kode merge yang disajikan lewat launcher pnpm, bukan hanya pada server development lama.

**119 file PHP tracked** lulus lint. Sintaks JavaScript dan `git diff --check` lulus. Scan file tracked tidak menemukan berkas konfigurasi privat/dump/log/spreadsheet atau nilai password database runtime/maintenance dari konfigurasi privat. Bukti tersanitasi: [PNPM_MAIN_TEST_RESULTS.json](evidence/PNPM_MAIN_TEST_RESULTS.json).

## Integritas dan batasan

Manifest 58 path serta status perubahan pada worktree asli dibandingkan sebelum/sesudah integrasi dan identik. Branch local `main` yang sedang dipakai worktree asli tidak di-reset/di-checkout paksa. Update main di remote tidak otomatis menerapkan kode pada folder kerja yang memiliki perubahan lokal. Gunakan worktree development/integrasi yang bersih atau clone baru untuk mencoba perintah baru.

Tidak ada deployment/restart layanan 8085, perubahan database aktif, perubahan sumber Laravel, perubahan penugasan legacy, migration framework atau Dockerisasi. Tidak ada tes tulis pada database aktif. Pengujian menggunakan database development existing, akun testing dan snapshot integritas; tidak membuat fixture baru. Sistem operasi yang benar-benar diuji adalah Linux; langkah Windows didokumentasikan tetapi belum diuji pada perangkat Windows. Instalasi database kosong dan instalasi worker PDF pada komputer baru tidak dilakukan otomatis oleh launcher.

Merge kode dapat dibatalkan melalui revert commit merge dengan peninjauan perubahan berikutnya. Jangan reset database atau menghapus perubahan pengguna untuk membatalkan merge.
