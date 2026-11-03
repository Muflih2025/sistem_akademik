# Navigasi modul atas dan fitur di sidebar — 3 November 2026

Status: selesai pada branch `development/academic-workflows-20261031`, localhost `http://127.0.0.1:18125`.

## Perilaku

- Baris atas menampilkan modul utama sesuai akun. Klik modul membuka fitur pertamanya; daftar fitur modul tersebut berada di sidebar kiri. Modul dan fitur aktif ditandai hitam dengan teks putih.
- Admin: Beranda, Master Data, Akademik, Absensi & Jurnal, Nilai & Rapor, Monitoring, Pengaturan.
- Guru: Beranda, Mengajar, Penilaian. Modul Guru Piket ditampilkan jika akun guru mempunyai penugasan piket aktif. Ini hanya pemilihan menu; izin backend tetap memeriksa cakupan tanggal/kelas dan permission koreksi.
- Kepsek: Beranda, Monitoring, Akademik, Nilai & Rapor. Siswa: Beranda, Akademik, Hasil Belajar.
- Halaman akademik dan halaman Admin/legacy yang masih digunakan berbagi satu definisi navigasi. Sidebar master tidak lagi bercampur dengan semua fitur dari modul lain.
- Desktop mulai 1000px: sidebar kiri 240px, konten di kanan. Pada HP/tablet: daftar fitur berada pada kontrol native **Menu fitur**, bisa dibuka/ditutup melalui sentuhan atau keyboard. Modul atas dapat digeser horizontal di dalam barisnya tanpa membuat halaman overflow. Akses cepat bawah dipertahankan.
- Tanpa JavaScript, menu fitur tetap tersedia menggunakan `details/summary`. Saat mencetak, seluruh navigasi disembunyikan.
- Tema tetap putih/hitam, latar sekunder `#F3F4F6`; konten, formulir, pagination, URL, ekspor dan operasi penyimpanan tetap memakai modul existing.

## Pengujian aktual

| Runner | PASS | FAIL | SKIP |
|---|---:|---:|---:|
| `tests/academic_navigation.cjs` | 8 | 0 | 0 |
| `tests/academic_default_date.cjs` (regresi absensi/nilai) | 8 | 0 | 0 |
| **Total skenario terfokus** | **16** | **0** | **0** |

Runner navigasi mengklik modul dan semua fitur Admin melalui browser, termasuk master, bulk Excel, jadwal, penugasan, tahun ajaran, nilai, rapor dan akun. Seluruh tujuan fitur yang ditampilkan untuk Guru, Piket, Kepsek dan Siswa juga dibuka, dengan satu elemen main dan penanda fitur aktif yang benar. Tidak ada POST bisnis yang sah atau fixture baru dibuat.

Pemeriksaan lain: buka/tutup menu via keyboard tidak menghapus perubahan radio status/materi yang belum disimpan; reload memulihkan data tersimpan. Screenshot aktual untuk Admin, Guru dan Kepsek pada desktop 1440px dan HP 320px dibuat, dan screenshot Admin/Guru desktop serta Admin mobile diperiksa secara visual. Ketiga halaman diuji di lebar 320, 375, 430, 768 dan 1440px tanpa overflow horizontal halaman. Tabel lebar tetap menggunakan area scroll internal.

Login/logout empat akun operasional, penggunaan tanpa JS, tampilan cetak, CSRF 419, IDOR/RBAC 403, SQL/Git/env/config/internal 404 tetap lulus. Kedua runner membandingkan snapshot seluruh skema dan data development sebelum/sesudah dan mendapatkan hasil identik. Regresi tanggal memastikan menu Absensi/Nilai tanpa tanggal tetap dapat dibuka sesudah minggu demo berakhir.

PHP lint untuk enam file PHP yang berubah, sintaks JavaScript navigasi/runner, serta `git diff --check` lulus. Bukti tersanitasi: `docs/evidence/NAVIGATION_TEST_RESULTS.json`. Detail/screenshot privat: `/home/muflih/.local/state/sia-academic-dev/20261031/reports/`.

## Mengulang

```bash
cd /home/muflih/sia-academic-dev
python3 - <<'PY'
import json,pathlib,os,subprocess
s=pathlib.Path('/home/muflih/.local/state/sia-academic-dev/20261031')
c=json.loads((s/'private/runtime.json').read_text())
env={**os.environ,'PLAYWRIGHT_BROWSERS_PATH':c['PDF_BROWSERS_PATH'],'LD_LIBRARY_PATH':c['PDF_LIBRARY_PATH']}
raise SystemExit(subprocess.call(['node','tests/academic_navigation.cjs'],env=env))
PY
```

Untuk mengulang regresi tanggal, ganti nama runner dengan `tests/academic_default_date.cjs`. Keduanya menolak konfigurasi selain database development bernama tetap pada socket staging. Suite besar yang menciptakan banyak fixture tidak dijalankan.

## File dan batas perubahan

Baru: `includes/app_navigation.php`, `assets/css/navigation.css`, `assets/js/navigation.js`, `tests/academic_navigation.cjs`, laporan ini dan bukti hasil. Diubah: `academic/layout.php`, `includes/header.php`, `includes/sidebar.php`, `includes/footer.php`, `config/web_routes.php` (hanya dua asset), `docs/SIMULASI_5_HARI.md`. Panduan pengguna `/home/muflih/sistem_akademik/test.md` ditambah petunjuk navigasi tanpa menimpa isi lainnya.

Tidak ada migration, perubahan data, reset akun, grant database, deployment, perubahan layanan 8085, sumber Laravel atau penugasan legacy. Jalur template lama untuk flag `ACADEMIC_WORKFLOWS` yang tidak aktif dipertahankan; lingkungan aktif tidak dipakai untuk pengujian. Pengujian browser memakai emulasi Chromium; perangkat HP fisik/LAN belum diuji pada perubahan ini.

## Uji manual dan rollback

Login Admin, klik **Master Data → Data Guru**, lalu **Akademik → Kelola Jadwal**, kemudian **Pengaturan → Manajemen Akun**. Pastikan fitur sidebar mengikuti modul. Sebagai Guru, klik **Mengajar → Absensi & Isi Jurnal**. Di HP buka **Menu fitur**; pilih **Riwayat & Cetak**, kemudian kembali melalui akses cepat Absensi. Tanggal contoh tetap 26–30 Oktober 2026.

Rollback menggunakan revert commit navigasi pada branch development setelah memeriksa perubahan sesudahnya; tidak perlu pemulihan database. Jangan menggunakan reset/checkout destruktif atau menerapkan perubahan ke layanan aktif 8085.
