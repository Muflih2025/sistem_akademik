# Development melalui pnpm

Website tetap PHP native dan MariaDB. pnpm menyediakan pintasan perintah; JavaScript launcher tidak menggantikan backend dan tidak menjalankan migration/seed.

## Pertama kali di komputer lain

1. Pasang Git, Node.js 18+ dan pnpm 9+, PHP CLI 8.1+ dengan ekstensi `pdo_mysql`, `mbstring`, `dom`, `zip`, serta MariaDB lokal.
2. Clone repository, masuk ke foldernya, lalu jalankan:

   ```bash
   git clone https://github.com/Muflih2025/sistem_akademik.git
   cd sistem_akademik
   pnpm install
   pnpm dev:setup
   ```

3. Setup menampilkan lokasi konfigurasi privat. Default Linux/macOS: `~/.config/sia-akademik/local.json`; pada Windows mengikuti folder home pengguna melalui Node. Direktori sesi/log/security dibuat di luar repository. File existing tidak ditimpa. Nilai konfigurasi berupa string; isi `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`, atau `DB_SOCKET` untuk Unix socket. Gunakan akun runtime **non-root**, database khusus development dengan nama bertanda `local`, `dev`, `testing` atau `staging`, dan `ALLOW_SCHEMA_CHANGES: "0"`.
4. Database development harus sudah mempunyai skema akademik release ini dan akun testing yang diizinkan. Minta database sintetis/konfigurasi development dari pengelola atau jalankan prosedur provisioning terkontrol dengan akun deployment terpisah. Repository tidak berisi credential, dump data sekolah, maupun akun otomatis. `pnpm dev:setup` **hanya menyiapkan konfigurasi**, bukan instalasi skema pada database kosong. Runner migration R0/R1/akademik memiliki batas lingkungan dan prasyarat tersendiri; jangan mematikan guard atau menjalankannya ke database produksi. Panduan existing: [R0](R0_OPERATIONS.md), [R1](R1_OPERATIONS.md), [akademik](ACADEMIC_LOCAL_GUIDE.md).
5. Setelah koneksi dan skema tersedia:

   ```bash
   pnpm dev:check
   pnpm dev
   ```

6. Buka **http://127.0.0.1:18125/auth/login.php**, masuk menggunakan akun testing dari pengelola development, lalu ikuti [panduan manual](SIMULASI_5_HARI.md). Data demo tanggal 26–30 Oktober berlaku hanya bila database demo tersebut memang disediakan; clone kode tidak menyalin data lokal komputer pengembang.

## Perintah sehari-hari

```bash
pnpm dev                  # Menjalankan PHP pada localhost 18125
pnpm dev --port 18126     # Port lain bila 18125 dipakai
pnpm dev:check            # Pemeriksaan PHP dan database secara baca-saja
pnpm dev:setup            # Template privat, tidak menimpa file existing
pnpm dev --help
```

Tekan **Ctrl+C** pada terminal untuk berhenti. Perintah ini tidak mengendalikan service systemd, tidak menghentikan server lain dan menolak port 8085. Tidak ada hot module replacement; PHP dibaca ulang per request, perubahan CSS/JS terlihat setelah refresh browser.

## Memakai konfigurasi development existing

Linux/macOS, berikan **path file**, bukan credential di command line:

```bash
SIA_CONFIG_FILE=/lokasi/privat/local.json pnpm dev
```

PowerShell:

```powershell
$env:SIA_CONFIG_FILE = "C:\lokasi-privat\local.json"
pnpm dev
```

Path tersebut adalah contoh dan harus diganti dengan lokasi file Anda. `PHP_BINARY` dapat dipakai untuk memilih executable PHP yang tidak ada di PATH. Override `SIA_*` dari shell selain file konfigurasi tidak diwariskan ke PHP agar koneksi tidak beralih tanpa sengaja. File/dir privat harus di luar repository; pada Unix diperiksa milik pengguna dan mode 0600/0700. Pada Windows atur ACL direktori privat agar hanya pemilik yang dapat membaca.

Pada komputer pengembang yang sudah memiliki service 18125, service tersebut tetap dapat dipakai. Jangan menjalankan server kedua pada port yang sama; pilih 18126 untuk mencoba launcher ini. Script Python lama adalah alat operator khusus lingkungan itu dan bukan syarat `pnpm dev`.

## PDF dan dependensi opsional

Excel/CSV menggunakan implementasi PHP existing. PDF memakai worker Node/Playwright lokal: isi `PDF_PLAYWRIGHT_PATH`, `PDF_BROWSERS_PATH`, `PDF_NODE_BINARY` dan, jika perlu, `PDF_LIBRARY_PATH` dalam konfigurasi privat sesuai instalasi Playwright/Chromium di komputer tersebut. Jangan menyalin path pribadi komputer pengembang. `pnpm dev` tidak mengunduh Chromium atau memasang library sistem otomatis. Sebelum worker tersedia, fitur **Cetak** tetap dapat menggunakan dialog browser untuk menyimpan PDF.

## Jika gagal

- **Template baru dibuat:** isi konfigurasi/database sekali, lalu ulangi. Setup tidak mengisi password maupun akun otomatis.
- **`database_or_config`:** periksa MariaDB hidup dan konfigurasi runtime yang benar. Password/driver error tidak dicetak launcher.
- **`schema_not_ready`:** database dapat dihubungi tetapi tabel akademik belum lengkap. Minta provisioning skema development; menjalankan `pnpm dev` berulang tidak membuat tabel.
- **PHP/ekstensi belum ada:** pasang PHP CLI dan empat ekstensi di atas. Untuk XAMPP/Laragon, gunakan executable PHP yang sesuai.
- **Port dipakai:** pilih port lain. Launcher tidak mematikan proses yang memakai port tersebut.
- **Permission privat:** pada Linux/macOS pastikan file konfigurasi 0600 dan direktori state 0700, dimiliki pengguna yang menjalankan perintah. Jangan memakai sudo untuk melewati penolakan.

Server ini hanya untuk development lokal dan bind `127.0.0.1`. Merge ke `main`/push Git tidak menjalankan deployment layanan publik, perubahan grant, atau migration database aktif.
