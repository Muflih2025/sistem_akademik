# Regresi evaluasi periode arsip dan alur guru piket

Pengujian 5 November 2026 menggunakan salinan aplikasi dan database sintetis
di luar repositori. Data sekolah tidak disalin atau diubah. Hasil terstruktur:
[evidence](evidence/TSX_EVALUATION_DUTY_2026-11-05.json).

## Catatan evaluasi kepala sekolah

Periode lokal `2025/2026 Genap` berstatus `Tidak Aktif`. Dropdown menyediakan
periode tersebut, tetapi penyimpanan sebelumnya memakai pemeriksaan referensi
aktif yang sama dengan jadwal. Reproduksi sebelum perbaikan menghasilkan HTTP
422 dengan pesan `Referensi tidak dikenal atau nonaktif.`

Catatan evaluasi kini boleh merujuk periode arsip yang masih tercatat. Aturan
ini khusus referensi periode pada `catatan_evaluasi`. Menulis evaluasi tidak
mengaktifkan periode lama atau membuka transaksi akademik. Referensi tidak ada,
peran tanpa izin, dan perubahan dengan versi kedaluwarsa tetap ditolak.

Uji browser akun `uji_kepsek` mencakup tambah, edit, muat ulang, dan label
`2025/2026 Genap` pada lebar 1440 dan 390 piksel. Uji HTTP mencakup perpindahan
periode catatan oleh admin, riwayat pelaku/perubahan, penolakan referensi salah,
konflik versi, serta penolakan jadwal baru pada periode arsip.

## Laporan guru piket

Pemeriksaan hanya baca terhadap database lokal menemukan akun `uji_piket`
memiliki tugas piket aktif, **0 jadwal mengajar**, dan **0 agenda disahkan pada
November 2026**. Karena itu jadwal dan absensi pribadinya kosong. Jurnal kelas
bersama tetap dapat digunakan dengan memilih kelas, tanggal, dan sesi guru
yang sudah memiliki penugasan terverifikasi.

Perbaikan antarmuka:

- Impor absensi membatasi nomor pertemuan ke bilangan bulat 1–1000, memberi
  pesan validasi, dan mencegah pengiriman nomor tidak valid. Validasi server
  yang sudah ada tetap diuji untuk CSV dan XLSX.
- Akun tanpa penugasan mendapat petunjuk pengaturan admin serta tautan
  presensi harian bila mempunyai tugas piket. Form impor dan tombol template
  yang membutuhkan jadwal tidak ditampilkan dalam kondisi ini.
- Form absensi/jurnal muncul setelah konteksnya berhasil dimuat. Memilih
  kelas dan sesi jurnal tetap wajib, termasuk sebelum konfirmasi edit.
- Halaman jadwal menjelaskan kebutuhan penugasan pribadi serta cara membuka
  jurnal kelas lain melalui pilihan kelas dan sesi.

Untuk menyediakan data mengajar sungguhan, admin membuka **Akademik → Kelola
Jadwal** dan menetapkan guru, kelas, mapel, hari/jam, serta rentang penugasan.
Periode, penugasan, dan anggota kelas harus ditetapkan melalui **Periode &
Penugasan**; penugasan dan periode harus terverifikasi. Agenda dibuat di
**Kalender Akademik** dan diubah menjadi `disahkan` agar terlihat oleh guru.
Tidak ada jadwal atau agenda sekolah rekaan yang ditambahkan oleh perbaikan ini.

Uji sintetis menjalankan alur tersebut: kondisi tanpa jadwal → jurnal bersama
oleh guru piket → admin menambah dan memverifikasi penugasan → jadwal pribadi
muncul → siswa dimuat → absensi/jurnal tersimpan → impor CSV/XLSX → agenda
draft disahkan dan terlihat setelah muat ulang. Rekap harian tetap terpisah.

## Pengujian ulang

Gunakan `tests/tsx_teacher_setup.py --state <direktori-baru-di-luar-repo>
--port <port>` untuk membuat fixture, lalu jalankan `node <state>/serve.cjs`.
Set `SIA_ADMIN_STATE` dan `SIA_ADMIN_URL` ke fixture dan URL loopback tersebut.

| Fixture | Urutan skrip | Kelompok lolos |
| --- | --- | ---: |
| Umum | `tsx_complete_workflows.cjs`, `tsx_crud_sidebar.cjs`, `tsx_admin_button_followup.cjs`, `tsx_import_report_buttons.cjs` | 44 |
| Targeted, fixture baru | `tsx_evaluation_period.cjs`, `tsx_duty_teaching.cjs` | 16 |
| Jurnal, fixture baru dengan `--paperless` | `tsx_shared_journal_bells.cjs`, `tsx_responsive_portals.cjs` | 12 |

Seluruh skrip berada di `tests/`. Total **72 kelompok lolos, 0 gagal**.
Pemeriksaan responsif mencakup 40 halaman pada lebar 320, 390, 768, 1024,
1440, dan 1920 piksel, termasuk editor jam dan dialog konfirmasi jurnal.
TypeScript dan `next build` juga berhasil pada salinan sumber yang sama.
Checksum database sekolah tetap sama setelah seluruh pengujian.
