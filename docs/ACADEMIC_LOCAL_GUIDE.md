# Panduan pengujian lokal akademik

> Panduan terbaru setelah penyelesaian fungsi wali dan impor fondasi: [PANDUAN_FUNGSI_AKADEMIK_LOKAL.md](PANDUAN_FUNGSI_AKADEMIK_LOKAL.md). Dokumen di bawah merekam checkpoint awal.

Checkpoint development, 31 Oktober 2026. Website PHP native modular/PDO berbasis R1.5; seluruh data pada database development ini **sintetis**. Bukan APK. Tidak ada aktivasi produksi, Docker, perubahan port 8085, atau pemetaan penugasan legacy.

## Membuka dan menjalankan

Worktree: `/home/muflih/sia-academic-dev`.

```bash
cd /home/muflih/sia-academic-dev
python3 ops/academic/academic_server.py status
python3 ops/academic/academic_server.py start
```

Buka **http://127.0.0.1:18125/auth/login.php**. Login mengarahkan ke Ruang Akademik sesuai role.

```bash
python3 ops/academic/academic_server.py restart
python3 ops/academic/academic_server.py stop
```

Wrapper hanya mengendalikan `sia-academic-dev-20261031.service`. Membutuhkan akses operator lokal `sudo -n`; tidak menerima nama service/port lain. Tidak ada fallback ke database atau service produksi. Service development sudah dipasang dan berjalan; perintah `install` atau setup database **tidak perlu diulang**. Service tidak di-enable otomatis saat boot.

Runtime menggunakan DynamicUser, document root `public`, router allowlist, kode yang di-bind read-only, private session/upload/log, dan `LoadCredential`. Konfigurasi host runtime di luar repository; konfigurasi migration dan konfigurasi produksi tidak dapat dibaca proses web. Server ini tetap server pengembangan PHP, belum merupakan konfigurasi server sekolah.

Database: `sia_academic_dev_20261031`, pada MariaDB staging **socket-only**, terpisah dari database aktif TCP 3307. Akun runtime non-root tanpa DDL; akun migration terpisah. Jika socket staging tidak tersedia setelah reboot, periksa proses/datadir staging yang sudah ada dengan panduan R0. Jangan menginisialisasi ulang datadir atau menggantinya dengan koneksi produksi.

## Akun pengujian

| Pengguna | Username | Kewenangan |
| --- | --- | --- |
| Admin | `uji_admin` | Master, fondasi akademik, kalender, izin piket, verifikasi/penerbitan rapor |
| Guru | `uji_guru` | Penugasan miliknya, terutama XII PPLG 2 / Pemrograman |
| Guru pembanding | `uji_guru_lain` | Basis Data; penugasan kelas pembanding dan sesi kedua XII PPLG 2 |
| Guru Piket | `uji_piket` | Monitoring dan rekonsiliasi awal; tanpa izin koreksi data terkonfirmasi secara default |
| Siswa | `uji_siswa` | NIS `0000001`; kehadiran dan rapor terbit miliknya |
| Kepala sekolah | `uji_kepsek` | Supervisi, kalender; tidak mengisi nilai atau menerbitkan rapor |

Password acak ada pada **file privat mode 0600**, bukan dalam Git/laporan:

`/home/muflih/.local/state/sia-academic-dev/20261031/private/test-accounts.json`

Buka file tersebut melalui editor lokal milik pengguna. Jangan menyalinnya ke repository atau log. Akun tambahan dari pengujian juga bertanda uji; tidak ada penggunaan akun siswa/guru asli.

## Uji manual utama

1. Masuk sebagai `uji_guru`. Buka **Absensi**, pilih **XII PPLG 2 · Pemrograman (UJI) · Jumat 07:00**, tanggal **2026-10-30**. Fixture memiliki 20 siswa dengan NIS dan nomor absen dari database.
2. Coba tombol **Tandai Semua Hadir** tanpa centang pemeriksaan: status tidak berubah. Centang konfirmasi, tandai semua hadir, lalu nomor 4 menjadi **S**, nomor 5 **I**. Ringkasan: **18 H, 1 S, 1 I, 0 A, 0 Belum**. Status `?` pada kartu berarti Belum Dikonfirmasi, disimpan sebagai `B`.
3. Isi materi dan kegiatan; isi alasan jika mengoreksi pertemuan tersimpan. Klik **Simpan Absensi & Jurnal**. Muat ulang, periksa status, materi, identitas pengisi, dan riwayat perubahan.
4. Buka **Jurnal & Agenda**, lihat detail pertemuan yang sama. Coba cetak, CSV, Excel, PDF, serta matriks sesi. Tidak ada pengisian ulang data jurnal/agenda terpisah.
5. Masuk sebagai `uji_guru_lain` untuk memeriksa sesi **XII PPLG 2 · Basis Data · Jumat 09:00**. Penugasan kelas utama memiliki dua sesi pada tanggal contoh. Rekap harian membutuhkan bukti keduanya. Sesi kelas XII PPLG 1 merupakan pembanding untuk pengujian akses.
6. Masuk sebagai `uji_piket`, buka **Guru Piket**, pilih tanggal **2026-10-30**, kelas **XII PPLG 2**. Periksa sesi terisi/belum terisi, ringkasan, siswa tidak hadir, kalender absensi dan ekspor matriks harian/rentang tanggal.
7. Jika bukti sesi diubah, data harian terkonfirmasi tetap tersimpan dan muncul tanda perlu tinjau. Admin dapat merekonsiliasi dengan alasan, atau memberikan izin **boleh koreksi** pada tugas piket melalui **Akademik**. Guru Piket tetap bukan Admin. Status antar sesi yang berbeda, sesi hilang, atau status B menghasilkan B sampai ditinjau; tidak ada prioritas S/I/A atau asumsi hadir otomatis.
8. Sebagai Admin, coba master siswa/guru/kelas/jurusan/mapel, akun, jadwal, serta tahun ajaran/semester. Nonaktifkan sebagai pengganti penghapusan yang merusak arsip. Data hasil tes tambahan ditandai `UJI`/`CRUD`; gunakan filter kelas utama untuk contoh 20 siswa.
9. Di **Akademik**, tetapkan batas tanggal/hari efektif periode, keanggotaan bertanggal dengan nomor absen, rentang penugasan terverifikasi, dan tugas piket. Untuk perpindahan, tutup rentang lama dan buat rentang baru tanpa tumpang tindih. Rentang/nomor yang sudah digunakan tidak boleh mengubah konteks historis.
10. Di **Kalender**, tambah kegiatan bertanda uji sebagai draft; pastikan tidak terlihat siswa. Sahkan setelah diperiksa, kemudian lihat melalui akun siswa. Nonaktifkan untuk membatalkan. Impor kalender selalu draft; tidak ada kalender resmi yang di-seed secara fiktif.
11. Sebagai Guru, buka **Nilai**. Pilih jadwal dan tanggal roster yang diizinkan. Pilih siswa tertentu untuk input individu atau kosongkan untuk input massal. Buat aturan dengan bobot total 100; komponen saat ini Tugas, UTS, UAS, Praktik, Proyek. Nilai 0–100 dan deskripsi wajib. Aturan baru tidak mengubah nilai lama.
12. Sebagai Admin, buka **Rapor**, pilih **Siswa Uji 01**, buat snapshot, lihat isinya, verifikasi, lalu terbitkan. Kedua mapel siswa tersebut memiliki nilai fixture. Siswa lain bisa ditolak jika nilainya belum lengkap. Perubahan sumber setelah snapshot dibuat mengharuskan snapshot baru sebelum verifikasi/penerbitan.
13. Sebagai `uji_siswa`, hanya rapor terbit miliknya tersedia. Nilai yang diedit setelah rapor terbit tidak mengubah arsip itu. Batas rekap tercantum jelas; hari sebelumnya yang tidak pernah diverifikasi tetap B, bukan diasumsikan Hadir. Buka **Kehadiran Saya** untuk rekap harian sendiri.
14. Di **Impor / Ekspor**, unduh template CSV/XLSX, isi, unggah, periksa preview, centang konfirmasi dan terapkan. Guru: absensi sesi/nilai. Admin: master siswa/guru dan kalender. Kepala sekolah: kalender. Impor master hanya menambah identitas baru, tidak menimpa existing atau membuat akun otomatis. Preview 15 menit, sekali pakai, dan commit atomik. Kehadiran selain B memerlukan konfirmasi pemeriksaan.

Jika menguji tanggal selain contoh, gunakan hari jadwal, periode/rentang terverifikasi, tanggal yang tidak mendatang, dan hari efektif yang disahkan. Penolakan tanggal/jadwal/periode yang tidak sesuai adalah validasi backend.

## Tes otomatis dan bukti

```bash
cd /home/muflih/sia-academic-dev
python3 tests/run_academic.py
```

Runner menjalankan HTTP, kasus batas/otorisasi, browser, login responsive, lalu integritas/restore/restart secara berurutan. Menggunakan akun/fixture khusus pada database development yang namanya diperiksa secara ketat. Tidak me-reset database. Fixture baru diberi identitas unik sehingga tes dapat diulang. Pengujian negatif kredensial akan menghentikan sementara **18125** lalu memulihkannya; lakukan saat tidak sedang mengisi formulir manual development.

Log, hasil rinci, screenshot lima lebar layar, backup dan kredensial tetap privat di:

`/home/muflih/.local/state/sia-academic-dev/20261031/`

Ringkasan yang sudah disanitasi ada pada `docs/evidence/ACADEMIC_TEST_RESULTS.json`. Pengujian browser memakai Playwright 1.64.1/Chromium yang telah tersedia di cache testing. Browser testing memblokir internet; login dan aset UI tersedia lokal. PDF memakai worker Chromium lokal, JavaScript mati dan seluruh permintaan jaringan render ditolak. Dependency library publik disalin ke direktori runtime read-only, tanpa mengubah izin cache privat lama.

## Backup, restore dan pemulihan

`tests/academic_integrity.py` membuat dump single-transaction/no-lock, menyimpannya terkompresi secara privat, membuat database restore dengan nama baru, dan membandingkan seluruh hash skema/data/objek. Tidak mengimpor ke database existing. Lokasi dan checksum backup terbaru ada dalam `reports/restore-latest.json` di state privat.

Untuk membatalkan eksperimen lokal, hentikan hanya service development dan simpan perubahan Git pada branch/worktree terpisah. Restore diuji ke database baru; jangan mengimpor backup di atas data existing atau menjalankan rollback DDL otomatis. Migration baru additive dan hanya dapat dijalankan runner melalui konfigurasi owner development yang terpisah. Pergantian database/release produksi memerlukan pekerjaan dan persetujuan tersendiri.

## Batas checkpoint

Pemetaan 18 penugasan asli, keanggotaan/periode historis asli, kalender resmi, format cetak resmi sekolah, keputusan kurikulum/formula dan kebijakan penerbitan resmi belum disahkan. Impor massal penugasan/keanggotaan, alur kenaikan/mutasi lengkap, penyetaraan seluruh dashboard/laporan legacy dengan sumber baru, dan pengujian beban/multi-worker belum selesai. Browser HP diuji melalui emulasi Chromium; perangkat Android/iOS fisik dan akses LAN belum diuji/diaktifkan. Jangan menganggap tidak adanya SKIP berarti pekerjaan tersebut sudah selesai.
