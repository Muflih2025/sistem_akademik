# Development TypeScript melalui pnpm

Branch `rebase-tsx` memakai Next.js 16, React, TypeScript dan SQLite. `pnpm dev` menjalankan Node pada port 3000. XAMPP, Apache, PHP dan MariaDB tidak diperlukan untuk runtime ini.

## Menjalankan aplikasi

Gunakan Node.js 22+ dan pnpm 9+. Batas Node mengikuti `better-sqlite3` yang terpasang; Next.js sendiri mensyaratkan setidaknya Node 20.9.

```bash
git clone --branch rebase-tsx https://github.com/Muflih2025/sistem_akademik.git
cd sistem_akademik
pnpm install
pnpm dev --hostname 127.0.0.1 --port 3000
```

Buka **http://127.0.0.1:3000/auth/login**. Gunakan hostname yang sama sepanjang pengujian agar cookie tetap sesuai. Berhenti dengan Ctrl+C. Port lain dapat dipilih dengan `pnpm dev --port 3001`.

Aplikasi membaca `data/sia.db` dari root repository. File tersebut harus memiliki skema akademik dan akun development yang sesuai. Startup tidak menjalankan migration atau seed. Jangan menghapus database untuk mencoba memperbaiki error; mintalah database development yang benar bila tabel atau akun belum tersedia.

Untuk mengambil pembaruan pada checkout branch ini:

```bash
git pull --ff-only origin rebase-tsx
pnpm install
pnpm dev --hostname 127.0.0.1 --port 3000
```

Hentikan proses development sebelumnya sebelum menjalankan ulang. Setelah perubahan autentikasi, masuk kembali melalui halaman login.

## Pemeriksaan aplikasi

```bash
pnpm exec tsc --noEmit --incremental false
pnpm build
pnpm start --hostname 127.0.0.1 --port 3000
```

`pnpm start` memerlukan hasil build; jalankan sebagai alternatif server development pada port yang tersedia.

Untuk regresi dengan data sintetis, setup berikut menyalin kode dan metadata skema ke direktori baru di luar repository. Baris data sekolah tidak disalin dan database aplikasi tidak direset.

```bash
python3 tests/tsx_teacher_setup.py --state /lokasi/di-luar-repo/sia-uji-baru --port 18143 --serve
```

Terminal kedua dapat menjalankan runner terfokus dengan `SIA_ADMIN_STATE` menuju direktori tersebut dan `SIA_ADMIN_URL=http://127.0.0.1:18143`. Setup menolak menimpa sandbox existing. Contoh runner: `tests/tsx_users_read.cjs`, `tests/tsx_users_write.cjs`, `tests/tsx_bulk_upload.cjs`, `tests/tsx_admin_foundation.cjs`, `tests/tsx_teaching_assignment.cjs`, dan `tests/tsx_admin_schedule.cjs`. Pengujian penulisan akun memerlukan fixture baru agar pemeriksaan Admin aktif terakhir berlaku.

## Sesi lokal

`SESSION_SECRET` dapat diatur di lingkungan Node. Bila tidak diatur, aplikasi membuat kunci acak privat pada `data/.sessions/key`; direktori tersebut diabaikan Git. Jangan mengubah kunci saat server masih dipakai jika ingin mempertahankan sesi login. Logout, perubahan password dan perubahan identitas/status akun membatalkan sesi terkait.

## PDF dan dependensi opsional

API ekspor TypeScript menggunakan ExcelJS untuk XLSX dan PDFKit untuk PDF, termasuk `Content-Disposition` unduhan. Tidak diperlukan worker PHP, browser atau konfigurasi `PDF_*` untuk unduhan ini. Cetak menggunakan dialog browser pengguna.

Runner browser menggunakan Playwright/Chromium terpisah. `SIA_BROWSER_CONFIG` dapat menunjuk berkas JSON privat yang berisi `PDF_PLAYWRIGHT_PATH`, `PDF_BROWSERS_PATH`, serta `PDF_LIBRARY_PATH` bila diperlukan. Nama konfigurasi ini diwarisi helper pengujian; bukan dependensi ekspor PDF aplikasi.

## Jika gagal

- **`/api/users` 500 pada checkout lama:** ambil perbaikan `rebase-tsx`, instal dependensi, lalu restart proses Node. Query akun sekarang memakai kolom `id_user` pada skema SQLite.
- **Tabel tidak ditemukan:** periksa bahwa terminal berada di root repository dan `data/sia.db` adalah database development yang benar.
- **Native module SQLite gagal dimuat:** periksa Node 22+ dan hasil instalasi `better-sqlite3` untuk OS/arsitektur komputer tersebut. Jangan menyalin `node_modules` dari Windows ke Linux atau sebaliknya.
- **Port dipakai:** pilih port lain atau hentikan hanya proses development yang Anda jalankan.
- **HTTP 401/403:** login kembali; periksa peran akun, status profil dan penugasan bertanggal. Guru Piket memakai penugasan tambahan, bukan username khusus.
- **HTTP 409 saat edit:** muat ulang data dan ulangi perubahan dengan versi terbaru.

## Runtime PHP historis

Folder PHP dan launcher lama tetap tersedia. `pnpm dev:php` menjalankan launcher PHP, sedangkan `pnpm dev:setup` dan `pnpm dev:check` mengatur/memeriksa konfigurasi PHP/MariaDB lama. Perintah tersebut tidak menyiapkan Next.js/SQLite. Panduan operator PHP historis ada pada [R0](R0_OPERATIONS.md), [R1](R1_OPERATIONS.md) dan [panduan akademik lokal](ACADEMIC_LOCAL_GUIDE.md).
