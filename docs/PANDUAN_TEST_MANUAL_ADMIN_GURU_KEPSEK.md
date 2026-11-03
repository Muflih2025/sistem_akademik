# Panduan pengujian manual — Admin, Guru Mapel, Kepala Sekolah

> **Pembaruan setelah pembersihan fixture 31 Oktober 2026:** gunakan [SIMULASI_5_HARI.md](SIMULASI_5_HARI.md) untuk akun, ID dan URL terbaru. Contoh acak/ID lama di dokumen ini adalah riwayat checkpoint, tidak lagi menjadi dataset aktif.


Lingkungan: **http://127.0.0.1:18125**. Website responsif untuk browser HP/desktop. Data dan akun berikut khusus development. Layanan 8085 serta database sekolah aktif tidak digunakan untuk pengujian ini.

Tunggu pengujian otomatis selesai sebelum melakukan pengisian manual bersamaan. Gunakan jendela Incognito/profil browser berbeda untuk setiap peran, supaya session Admin/Guru/Kepsek tidak tertukar.

## 1. Akun dan data contoh

| Peran | Username | Password development |
|---|---|---|
| Admin | `uji_admin` | `password` |
| Guru mapel contoh lama | `uji_guru` | `password` |
| Kepala Sekolah | `uji_kepsek` | `password` |
| Guru Piket, bila perlu | `uji_piket` | `password` |
| Guru mapel contoh terbaru | `uji_mapel_d75604` | `password` |

Password sederhana ini hanya diizinkan pada database testing localhost yang tepat. Password database bukan password akun web dan tidak dicantumkan di sini. Tidak ada tombol Ganti Password pada navigasi aplikasi. Admin tetap mengelola akun, role dan referensi guru melalui Manajemen Akun.

Contoh terbaru yang sudah siap:

- Guru: `uji_mapel_d75604`, kelas **Uji Staf d75604**, ruang **UJI-d75604**.
- Hari/tanggal: **Jumat, 30 Oktober 2026**, jam **10:20–10:50 / jam ke-5**.
- Tiga siswa sintetis: hasil contoh **1 H, 1 S, 1 I, 0 A**.
- [Pertemuan guru](http://127.0.0.1:18125/academic/index.php?view=pertemuan&id_jadwal=118&tanggal=2026-10-30), [jurnal](http://127.0.0.1:18125/academic/index.php?view=jurnal&id=17), [dashboard Kepala Sekolah](http://127.0.0.1:18125/academic/index.php?view=beranda&tanggal=2026-10-30&id_guru=205), [rapor contoh](http://127.0.0.1:18125/academic/index.php?view=rapor&id=136).
- Contoh sudah pernah disimpan, sehingga saat mengedit isi **alasan koreksi**. Isi terbaru dapat berubah ketika pengujian dijalankan ulang.

`uji_guru` juga mempunyai contoh lama **XII PPLG 2**, 20 siswa, tanggal **2026-10-30**. Untuk nomor 4 S dan nomor 5 I setelah verifikasi, hasilnya **18 H, 1 S, 1 I, 0 A**. Konteks jadwal lama dipertahankan sebagai fixture; pola jam baru tidak menimpa arsipnya.

Katalog sekolah berisi **36 kelas**: X/XI/XII × PPLG/PM/AKL/MPLB × nomor 1/2/3. Data Excel sebelumnya berisi **389 siswa di 11 kelas X**; X PM 3 dan kelas tambahan boleh kosong. Database juga mempunyai kelas/guru berlabel Uji/F/Bulk untuk pengujian, bukan data sekolah resmi.

## 2. Admin — login, master dan bulk Excel

1. Buka `/auth/login.php`, masuk sebagai `uji_admin` / `password`.
2. Pilih **Kelola data master**. Periksa Siswa, Guru, Kelas, Jurusan, Mapel, serta **Ruang / Lab**. Daftar Admin dimulai dengan **10 baris per halaman**. Pilih **10/20/25/50/100**, periksa “Menampilkan 1–10 dari …”, lalu coba nomor halaman, Awal/Sebelumnya/Berikutnya/Terakhir. Pencarian dan filter tetap dipertahankan.
3. Pada master yang ingin diisi, klik **Bulk Upload Excel**. Halamannya berada di **`/admin/bulk_upload.php`**, bukan menu umum Impor/Ekspor. Jika membuka URL impor lama, Admin diarahkan ke halaman ini.
4. Unduh **Template Excel** untuk modul yang dipilih. Isi **sheet pertama** dan pertahankan header. Unggah satu modul per file. Untuk relasi baru, urutannya **Jurusan → Kelas → Siswa**. Data guru/mapel/ruang dapat diunggah terpisah.
5. Isi data literal, bukan rumus. Simpan NIS/NIP sebagai **Text** di Excel agar nol di depan tidak hilang. Tanggal lahir boleh tanggal Excel asli atau teks `YYYY-MM-DD`; tanggal dengan jam nonnol ditolak. Data yang tidak diketahui jangan dikarang.
6. Untuk `id_jurusan`/`id_kelas`, gunakan **Referensi untuk template** di halaman bulk: cari nama/ID, lalu salin ID yang benar. Daftar referensi juga dipaginasi. ID ini bukan nomor urut baris Excel.
7. Pilih file `.xlsx`, isi alasan/sumber, klik **Buat Preview**. Batas **5 MB dan 2.000 baris data**. Preview menampilkan 20 baris per halaman; semua baris tetap diperiksa.
8. Periksa modul, jumlah, identitas dan relasi. Pada tahap ini database belum ditambah. Centang konfirmasi, lalu klik **Terapkan Impor ke Database**.
9. Klik **Kembali ke Master**, cari identitas yang baru diunggah, reload. Data harus tetap ada dan benar. Mengunggah file yang sama lagi harus ditolak sebagai duplikat, bukan menggandakan atau menimpa data.
10. Coba file salah: kode/NIS berulang, ID kelas/jurusan tidak ada, KKM 101, tanggal tidak valid, atau sel rumus. Server harus menolak. Jika satu baris gagal saat penerapan, seluruh batch batal; tidak boleh ada data parsial. Nomor ID yang melompat setelah rollback bukan kehilangan data.

### Header template

| Modul | Kolom |
|---|---|
| Siswa | `nis,nama_siswa,jenis_kelamin,tanggal_lahir,id_kelas,alamat` |
| Guru | `nip,nama_guru,email,no_hp` |
| Jurusan | `kode_jurusan,nama_jurusan` |
| Kelas | `nama_kelas,tingkat,id_jurusan` |
| Mata Pelajaran | `kode_mapel,nama_mapel,kelompok,kkm` |
| Ruang/Lab | `kode_ruang,nama_ruang,jenis` |

Jenis kelamin `L`/`P`; tingkat `X`/`XI`/`XII`; kelompok mapel `Muatan Nasional`, `Muatan Kewilayahan`, atau `Produktif`; KKM 1–100; jenis ruang `Kelas`/`Laboratorium`. Email, HP dan alamat boleh kosong. Impor hanya menambah; untuk koreksi gunakan **Edit**. Impor tidak otomatis membuat akun login, keanggotaan bertanggal, jadwal atau keputusan kenaikan kelas.

File `data kelas 10 clean.xlsx` sudah dipakai pada checkpoint sebelumnya. Jangan mengunggah ulang identitas yang sama sebagai data baru. File tersebut bukan template umum aplikasi, memuat rumus NIS dan tidak memuat tanggal lahir; gunakan template dan nilai yang sudah diverifikasi untuk unggahan umum.

### Unggahan akademik di modul masing-masing

Menu Impor/Ekspor umum tidak diperlukan. Backend impor akademik yang sudah ada tetap dapat dipakai dari konteks berikut:

- **Admin → Fondasi Akademik → Bulk Upload Excel Anggota Kelas / Penugasan Guru**. Pilih periode terverifikasi, gunakan header template; penugasan tetap perlu konfirmasi verifikasi. Tidak memperbaiki 18 penugasan legacy otomatis.
- **Admin/Kepala Sekolah → Kalender → Bulk Upload Excel Kalender**. Impor kegiatan sebagai **draft**, kemudian periksa sebelum mengesahkan.
- **Guru → Absensi → pilih jadwal/tanggal → Bulk Upload Excel Absensi**. Template sudah berisi NIS satu kelas; isi seluruh roster tepat sekali, H/S/I/A/B, lalu preview/konfirmasi verifikasi. Materi/jurnal existing dipertahankan saat mengimpor status.
- **Guru → Nilai → pilih jadwal/tanggal → Bulk Upload Excel Nilai**. Pilih aturan penilaian milik tugas tersebut, isi komponen/deskripsi pada template. Nilai yang berubah tercatat sebagai revisi; rapor terbit tidak ikut berubah.

Semua jalur menyediakan unduh template → upload → preview → konfirmasi → simpan → kembali ke modul dan reload. Preview bukan penyimpanan. Gunakan alasan koreksi yang jelas. Kepala Sekolah tidak memperoleh akses upload nilai atau absensi guru dari tautan ini.

## 3. Admin — guru mapel, wali, kelas dan ruang

1. Di Master Guru, buat guru pengujian dengan NIP unik, misalnya `UJI-MANUAL-01`. Periksa ID guru pada daftar.
2. Di **Manajemen Akun**, buat username unik, misalnya `guru_manual01`, role **Guru**, referensi **ID Guru** yang benar, status aktif, password development `password`. Data guru dan akun login adalah dua hal terhubung; tidak ada akun default dari bulk upload.
3. Siapkan mapel, kelas dan siswa. Bisa memakai kelas X dari Excel yang sudah tersedia, atau kelas Uji baru. Bila membuat siswa baru, tetapkan anggota kelas pada **Akademik**: periode, kelas, nomor absen serta rentang tanggal. Gunakan pencarian siswa bila tidak ada dalam 50 opsi pertama.
4. Buka **Penugasan Guru/Jadwal**. Pilih guru, mapel, kelas, periode aktif yang benar, hari, jam dan ruang/lab dari database. Contoh slot Jumat **10:20–10:50**, sesuai tabel jam ke-5. Jika bentrok guru/kelas/ruang, pilih slot yang benar atau tinjau penugasan existing; jangan menimpa arsip.
5. Buka **Akademik → Verifikasi rentang penugasan guru**, pilih jadwal baru, isi rentang berlaku dan dasar verifikasi, kemudian tandai terverifikasi. Jadwal tanpa periode/rentang terverifikasi tidak memberikan akses pengisian.
6. Di **Penugasan Wali Kelas**, tetapkan guru wali dan kelas/rentangnya. Pada konfigurasi saat ini wali adalah **informasi penanggung jawab kelas**. Status wali tidak otomatis memberi hak mengajar mapel, melihat seluruh rapor, menilai mapel lain atau menjadi Admin.
7. Uji edit/nonaktifkan jadwal. Konteks penugasan yang sudah dipakai/diperiksa dilindungi: untuk perubahan konteks buat jadwal baru dan nonaktifkan yang lama. Daftar jadwal Admin dimulai dengan **10 baris**, dengan pilihan jumlah baris dan nomor halaman.

### Ruang/lab yang tersedia

- Kelas: **A1, A2, A5, A9, A10, A11; B4, B8, B10, B15, B16; C1, C2, C4, C5, C6, C7, C8, C9, C10**.
- Laboratorium: **Lab PPLG 1/2/3, KKPI 1/2, Lab AKL, Lab Simulasi AKL, Lab Simulasi PM, Lab Bisnis**.
- Total daftar pengguna: **20 ruang kelas + 9 lab**. “10” dibaca **A10** sesuai denah. Ruang UJI tambahan merupakan fixture terpisah.
- Admin dapat menambah/memperbaiki/nonaktifkan ruang dari Master Ruang/Lab. Penugasan baru menolak nama ruang yang tidak terdaftar atau nonaktif. Nama ruang yang telah dipakai jadwal dilindungi agar riwayat tidak berganti arti.

## 4. Guru mapel — absensi, jurnal kelas dan agenda harian

1. Buka browser/profil lain. Login `uji_mapel_d75604` / `password` untuk contoh terbaru, atau akun guru yang dibuat Admin.
2. Pilih **Absensi**, jadwal yang menjadi tugas guru tersebut, dan tanggal yang sah. Untuk fixture gunakan **2026-10-30**. Hari harus sesuai jadwal dan periode/rentang berlaku; tanggal mendatang/libur atau kelas lain ditolak.
3. Cocokkan nama dan nomor absen dari database. Coba pencarian. Menghapus teks pencarian harus menampilkan kembali seluruh siswa.
4. Setelah memeriksa kehadiran, centang konfirmasi, tekan **Tandai Semua Hadir**, lalu ubah siswa tidak hadir menjadi **S**, **I**, atau **A**. Jika alasan belum terverifikasi gunakan **Belum Dikonfirmasi**; jangan dianggap H/A. Periksa ringkasan.
5. Isi tanggal/jam pelajaran, pertemuan ke, **TP/ATP, materi, kegiatan, guru pengganti bila ada, catatan, refleksi KBM dan tindak lanjut**. Field ini mewakili jurnal kelas dan buku agenda harian pada foto. Untuk koreksi isi alasan.
6. Klik **Simpan Absensi & Jurnal**, reload. Status siswa dan seluruh isian harus tetap sama. Contoh terbaru tiga siswa menghasilkan 1 H/1 S/1 I; kelas 20 siswa dengan dua ketidakhadiran menghasilkan 18 H/1 S/1 I. Untuk kelas 35 siswa, hasil contoh dua tidak hadir menjadi 33 H/1 S/1 I.
7. Buka **Jurnal & Agenda**, masuk ke detail pertemuan. Materi/refleksi/ketidakhadiran harus sama tanpa input ulang. Gunakan **PDF, Excel, CSV, Cetak** di modul tersebut. PDF jurnal dan agenda berasal dari ID pertemuan yang sama.
8. Buka **Nilai**, pilih tugas/kelas/tanggal yang sah, buat aturan bobot total 100 bila belum ada, lalu isi nilai 0–100 dan deskripsi. Simpan, reload. Coba 101 untuk memastikan penolakan. Unduh **PDF/Excel/CSV** atau **Cetak** langsung dari Nilai.
9. Guru lain yang bukan pemilik penugasan tidak boleh membuka/menulis kelas ini dengan mengganti URL. Penunjukan sebagai wali saja tidak memberi akses baru untuk mengajar atau mereview rapor.

## 5. Admin — rapor dan kenaikan kelas

1. Pastikan nilai semua mapel terverifikasi pada kelas telah lengkap. Buka **Rapor**, pilih siswa/periode dan batas rekap, lalu **Buat draft snapshot**.
2. Periksa nilai, kehadiran dan isinya. Pada kebijakan sekarang, **Admin memverifikasi** draft dan kemudian **menerbitkan**, dengan alasan. Wali hanya informasi; tidak menjadi langkah approval wajib. Tidak ada penerbitan otomatis hanya karena nilai tersedia.
3. Gunakan **PDF/Excel/CSV/Cetak** langsung pada detail rapor. Rapor terbit adalah snapshot; koreksi nilai berikutnya tidak diam-diam mengubah arsip terbit. Buat snapshot baru untuk revisi.
4. Untuk kenaikan tahunan, pilih **Naik Kelas** → Genap asal → Ganjil tahun berikutnya → tinjau X→XI, XI→XII, XII→Alumni → pratinjau → konfirmasi. Periode terkunci, anggota/tujuan bentrok dan proses ganda ditolak.
5. Jangan menaikkan 389 siswa Excel hanya untuk mencoba tombol. Gunakan fixture kenaikan khusus yang dicantumkan pada laporan checkpoint terdahulu/`reports/progression-manual-guide.json` privat, atau buat cohort Uji tersendiri. Riwayat lama tidak dihapus.

## 6. Kepala Sekolah — pantau guru mengajar

1. Login **`uji_kepsek` / `password`** pada profil browser terpisah.
2. Di dashboard pilih tanggal **2026-10-30**, lalu filter guru contoh `Guru Mapel Uji d75604` atau kelas **Uji Staf d75604**. Pada hari Sabtu/Minggu tanpa jadwal, daftar kosong adalah hasil yang wajar; tanggal pengujian harus sesuai jadwal.
3. Periksa **jam, guru/mapel, kelas, ruang, wali kelas dan status jurnal**. Sebelum guru menyimpan, status Belum diisi; setelah penyimpanan, Sudah diisi dengan tautan jurnal.
4. Klik **Sudah diisi** dan cocokkan materi, absensi serta refleksi dengan akun Guru. Dashboard menampilkan **penugasan dan pengisian**, bukan GPS atau bukti keberadaan fisik guru.
5. Buka **Nilai** untuk supervisi serta **Rapor** untuk membaca/mengunduh arsip sesuai izin. Gunakan PDF/Cetak pada modul masing-masing. Kepala Sekolah tidak dapat mengubah nilai milik guru atau menerbitkan rapor sebagai Admin.
6. Coba membuka `/admin/users.php` atau `/admin/bulk_upload.php` sebagai Kepala Sekolah: harus **403 Akses ditolak**. Filter dan paging pemantauan tidak boleh membuka hak tulis.

## 7. Pemeriksaan keamanan dan catatan hasil

- Login Guru, buka URL master Admin atau ubah parameter kelas/jadwal menjadi milik orang lain: harus ditolak. Mengubah role dalam POST/localStorage/user metadata tidak memberi hak Admin.
- Role akun diambil ulang dari database oleh server pada setiap request. Admin mengubah role/status melalui Manajemen Akun; perubahan membatalkan session lama. Browser tidak menjadi sumber otoritas role.
- Coba tanpa konfirmasi preview, ulangi token impor, unggah file duplikat, atau gunakan rentang terkunci: tidak boleh ada penyimpanan parsial maupun overwrite.
- Setelah logout, halaman yang membutuhkan login harus meminta login lagi.
- SQL, `.git/config`, log dan konfigurasi tidak boleh dapat diunduh dari web.
- Catat per kasus: akun/peran, tanggal/konteks, langkah, hasil di layar, hasil setelah reload, PASS/FAIL dan screenshot bila perlu. Jangan membagikan cookie/session/credential database.
- Login siswa **tidak wajib** pada alur operasional ini. Fitur lama bila dipakai tetap membatasi siswa ke rapor terbit miliknya; tidak perlu membuat akun siswa untuk mengisi jurnal/agenda.

Panduan ini memakai checkpoint development; pengujian produksi, akses LAN/HP fisik dan deployment publik belum dilakukan. Jangan memakai password fixture ini di layanan publik.
