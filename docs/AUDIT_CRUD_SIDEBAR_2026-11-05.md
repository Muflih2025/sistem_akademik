# Audit CRUD, tombol, dan sidebar — 5 November 2026

Audit Chromium dan HTTP terhadap kode workspace pada branch `rebase-tsx`, termasuk perubahan lokal yang sudah ada sebelum audit. Commit `5e216fa` sudah ditemukan langsung di remote `origin/rebase-tsx`; perubahan lokal tambahan belum termasuk commit tersebut. Tidak ada push atau commit baru pada audit ini.

## Hasil akhir

**52 kelompok pemeriksaan PASS, 0 FAIL, 0 ERROR.** Pengujian mencakup 36 halaman dan 55 tautan modul/sidebar yang diklik langsung. Pemeriksaan TypeScript, sintaks kedua runner tambahan, `git diff --check`, dan build produksi pada salinan aplikasi terpisah berhasil.

| Runner | PASS | FAIL |
| --- | ---: | ---: |
| `tsx_complete_workflows.cjs` | 18 | 0 |
| `tsx_crud_sidebar.cjs` | 15 | 0 |
| `tsx_document_buttons.cjs` | 4 | 0 |
| `tsx_admin_button_followup.cjs` | 6 | 0 |
| `tsx_teacher_comparison.cjs` | 4 | 0 |
| `tsx_import_report_buttons.cjs` | 5 | 0 |

Jumlah tersebut adalah kelompok pemeriksaan; satu kelompok dapat melakukan banyak klik dan memeriksa beberapa hasil penyimpanan. Pemeriksaan integritas database ikut dihitung oleh masing-masing runner. Kegagalan selektor pengujian pada uji tambahan jadwal diperbaiki dengan mencocokkan pasangan jam mulai/selesai dan memilih slot sintetis yang kosong; hasil tabel adalah hasil akhir setelah koreksi runner.

## Peran dan tindakan yang diuji

| Akun sintetis | Cakupan |
| --- | --- |
| Admin | Tambah/edit akun; nonaktif/aktif kembali; tujuh master akademik; pencarian, pembatalan, unduhan; tambah jadwal beserta penugasan; edit jadwal sebelum penugasan; verifikasi; anggota kelas dan nomor absen; tugas piket/wali; kalender draft/disahkan/nonaktif; revisi jam belajar; kunci/buka periode; impor; kenaikan/alumni; draft/verifikasi/penerbitan/penarikan rapor; rincian audit dan pagination. |
| Guru utama | Simpan dan edit absensi/jurnal, konfirmasi sebelum semua hadir, perubahan bobot, nilai/deskripsi, ekskul sesuai pembina, impor absensi/nilai, unduh template dan ekspor. |
| Guru pembanding | Simpan absensi/jurnal/nilai/deskripsi pada kelas sendiri; ekspor berisi siswa sendiri; akses nilai dan absensi guru lain ditolak; ekskul tanpa penugasan memberi pesan dan tombol simpan nonaktif. |
| Guru piket | Pratinjau/simpan rekonsiliasi, koreksi harian dengan izin, matriks mingguan, dan pemanggilan cetak tampilan. |
| Kepala sekolah | Pemantauan, tambah/edit evaluasi, pembacaan rapor dan kalender; operasi pengelolaan akun dan penulisan piket ditolak. |
| Siswa | Profil/jadwal/kehadiran sendiri, rapor terbit sendiri, unduhan CSV/XLSX dan pemuatan PDF cetak; rapor yang ditarik tidak dapat dibuka. |

Penyimpanan utama diperiksa dengan reload browser serta pembacaan ulang SQLite. Versi usang dan kegagalan transaksi turut diuji. Untuk data yang memakai arsip, tindakan penghapusan yang tersedia adalah **Nonaktifkan/cabut/tarik**; audit tidak menambahkan penghapusan fisik riwayat.

Jadwal yang telah mempunyai penugasan terverifikasi mempertahankan konteksnya. Uji perubahan konteks tersebut harus menghasilkan penolakan yang jelas tanpa menghilangkan isian atau mengubah data tersimpan. Jadwal sebelum penugasan dapat diedit dan kemudian diverifikasi. Periode terkunci diuji dengan payload nilai yang valid; penolakan harus berasal dari kunci periode.

## Penempatan menu kiri

- **Admin:** Master Data untuk master/akun/bulk upload; Akademik untuk periode, penugasan, jadwal, tahun ajaran, jam, kalender, kenaikan, alumni, dan ekskul; Nilai & Rapor untuk rekap, jurnal, rapor, piket, dan audit.
- **Guru:** Mengajar untuk jadwal/absensi/jurnal/kalender/jam; Penilaian untuk nilai, ekskul, impor, dan rekap kelas. Modul Guru Piket hanya ditampilkan pada guru dengan tugas piket aktif.
- **Kepala sekolah:** Monitoring, Nilai & Rapor, dan Akademik. Label **Rapor Semester** sesuai kemampuan membaca rapor; tidak menawarkan verifikasi admin.
- **Siswa:** Akademik untuk jadwal/kalender/jam dan Hasil Belajar untuk kehadiran/rapor.

Klik tautan diuji bersama URL tujuan, satu area `main`, menu modul aktif, dan fitur aktif. Halaman bersama `/jam-belajar` mempertahankan navigasi peran. Tampilan diperiksa pada lebar 320, 375/390, 768, dan 1440 piksel dalam runner terkait.

## Isolasi dan bukti

Database pengujian dibuat dari **schema saja**, kemudian diisi data sintetis pada `/tmp/sia-crud-review-20261105-ours/app/data/sia.db`. Tidak ada baris sekolah yang disalin. Checksum berkas database utama dibandingkan setelah pengujian dan tetap sama. Berkas lokal yang sudah berubah sebelum audit dipertahankan; source aplikasi uji dibandingkan dengan `src` workspace dan tidak berbeda.

Bukti sesi tersedia pada:

- `/tmp/sia-crud-review-20261105-ours/reports/summary.json` dan JSON per runner.
- `/tmp/sia-crud-review-20261105-ours/screenshots/`: admin, guru, guru pembanding, guru piket, kepala sekolah, siswa, dan guru pada layar kecil.

Folder sementara tidak masuk Git dan dapat hilang setelah lingkungan dibersihkan. Kredensial fixture tetap berada di berkas privat di luar repository.

## Menjalankan ulang

Buat fixture baru di luar repository untuk setiap audit lengkap. Runner membutuhkan Chromium serta konfigurasi browser lokal yang dipakai `tsx_admin_helpers.cjs`. Jangan mengarahkan runner ke database utama.

```bash
python3 tests/tsx_teacher_setup.py --state /tmp/sia-crud-audit-baru --port 18205
node /tmp/sia-crud-audit-baru/serve.cjs
```

Di terminal lain, jalankan secara berurutan karena runner berikutnya menggunakan hasil fixture sebelumnya:

```bash
export SIA_ADMIN_STATE=/tmp/sia-crud-audit-baru
export SIA_ADMIN_URL=http://127.0.0.1:18205
node tests/tsx_complete_workflows.cjs
node tests/tsx_crud_sidebar.cjs
node tests/tsx_document_buttons.cjs
node tests/tsx_admin_button_followup.cjs
node tests/tsx_teacher_comparison.cjs
node tests/tsx_import_report_buttons.cjs
```

Fixture memakai periode 2026/2027 dan tanggal simulasi Oktober–November 2026; perbarui fixture dan ekspektasi tanggal saat kalender berjalan berubah. Audit ini membuktikan alur yang diuji pada data sintetis dan Chromium desktop/responsif. Dialog printer fisik, browser/perangkat fisik lain, pengujian beban, serta database produksi tidak diuji.
