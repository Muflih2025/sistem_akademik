# Akun lokal terbaru — setelah pembersihan 6 November 2026

Sesuai permintaan terbaru, **49 akun tes acak** (`fg_*`, `fs_*`, `uji_rev_*`, `uji_mapel_*`) sudah dihapus. Kini hanya tersisa **8 akun utama aktif** berikut. Username diubah ke format email; ID, password, peran, referensi profil, dan data akademik tetap sama. Sesi lama tidak berlaku setelah username berubah: silakan login kembali.

| Peran | Username login baru |
|---|---|
| Admin | `admin@mail.com` |
| Guru utama | `guru@mail.com` |
| Guru pembanding | `guru.lain@mail.com` |
| Guru Piket | `piket@mail.com` |
| Kepala Sekolah | `kepsek@mail.com` |
| Guru/Wali | `wali@mail.com` |
| Siswa | `siswa@mail.com` |
| Siswa pembanding | `siswa.lain@mail.com` |

Password demo tetap **`password`** untuk localhost. Username ini dipakai untuk login; perubahan nama akun ini tidak mengonfigurasi kotak email atau pengiriman email reset otomatis. Data siswa/guru dan riwayat akademik tidak ikut dihapus. Backup privat sebelum perubahan disimpan di `runtime/account-cleanup-20261106T134104Z/before.sqlite`. Bukti perubahan: [ACCOUNT_CLEANUP_2026-11-06.json](docs/evidence/ACCOUNT_CLEANUP_2026-11-06.json). Perubahan kemudian disiapkan untuk commit/push atas permintaan pengguna; database demo disimpan utuh di `data/sia.db`, sedangkan file runtime WAL/SHM diabaikan Git.

Angka 57 akun pada hasil audit di bawah adalah kondisi **sebelum pembersihan**, bukan jumlah akun saat ini. Panduan akun berikut sudah memakai username baru. Login dan seluruh menu delapan akun email baru sudah diperiksa ulang: **9 kelompok uji lolos, 0 gagal**, dan isi database tidak berubah selama verifikasi.

---

# Audit lokal dan alur akun — 6 November 2026

Aplikasi Next.js dibuka di **http://127.0.0.1:3000/auth/login** (`pnpm dev`). Ini menggantikan alamat PHP/port 18125 pada panduan sebelumnya. **Pada audit awal, akun tidak dihapus atau diganti passwordnya. Pembersihan atas permintaan berikutnya tercatat di bagian paling atas. Tidak ada commit.**

Pengujian terdiri dari navigasi browser pada database lokal yang sebenarnya dan simulasi tulis pada database sintetis terpisah. Uji Hapus memakai data disposable di fixture; akun demo utama tetap dipertahankan. Hasil otomatis diperiksa ulang pada setiap suite, bukan mengambil angka kelulusan dari laporan lama.

## Temuan dan perubahan autentikasi

1. **Login masih terisi akun/password demo.** Isian awal sekarang kosong dan tombol pengisian cepat akun uji sudah dihapus. Sesi hanya dibuat setelah login berhasil; registrasi tidak langsung login.
2. **Belum ada register.** Tersedia `/auth/register`: pilih Guru/Siswa, isi nama sesuai master, NIP/NIS, username, password dan konfirmasinya. Identitas harus aktif, unik, dan belum memiliki akun. Admin/Kepala Sekolah dibuat oleh Admin. Pendaftaran tersimpan nonaktif dengan status **Menunggu persetujuan**.
3. **Persetujuan registrasi.** Admin membuka `/admin/users`, mencari username, memilih **Setujui pendaftaran**, memverifikasi pemilik NIP/NIS secara langsung dan mengisi alasan di modal. Sesudah disetujui, pengguna masuk dengan password yang dibuat sendiri. Mengedit akun nonaktif tetap mempertahankan status menunggu persetujuan. API pengelolaan akun alternatif menggunakan aturan yang sama.
4. **Lupa password belum punya alur yang jelas.** Tersedia `/auth/forgot-password`. Pengguna menghubungi Admin, lalu Admin memverifikasi identitas → **Reset password** → mengisi dasar verifikasi → **Buat tautan reset** → memberikan tautan melalui kanal pribadi. Pemilik membuka tautan, mengisi password baru dan konfirmasi, lalu login kembali.
5. Tautan reset **berlaku 30 menit, sekali pakai**; tautan baru menggantikan tautan sebelumnya. Password/status akun yang berubah membatalkan tautan terkait. Reset password membatalkan sesi lama. Server menyimpan digest token dalam riwayat, bukan token yang bisa dipakai. Password tidak disertakan dalam riwayat perubahan.
6. Uji Cabut lama bergantung pada tanggal 5 November. Ekspektasi tanggal pengujian kini menghitung hari setelah pencabutan dan jadwal Jumat berikutnya, supaya valid saat dijalankan pada 6 November.

## Empat permintaan Admin yang diperiksa

| Permintaan | Perilaku yang diuji |
|---|---|
| Siswa tidak muncul lagi di select setelah ditetapkan | **Akademik → Periode & Penugasan → Keanggotaan kelas** (`/admin/penugasan`). Select Siswa menyembunyikan siswa yang sudah terdaftar pada periode terpilih. Form Edit tetap mempertahankan siswa pemilik record. |
| Cabut dan pilih siswa kembali | Tombol **Cabut** membuka modal berisi penjelasan, tanggal akhir bila diperlukan, alasan dan konfirmasi. Batal/Escape tidak mengubah data. Setelah dicabut, siswa tersedia kembali di select. |
| Riwayat setelah Cabut | Keanggotaan yang belum dipakai dapat dihapus. Keanggotaan yang sudah memiliki riwayat ditutup rentangnya dan diarsipkan; penetapan baru dimulai setelah tanggal akhir yang lama. Nilai, absensi lama, dan identitas keanggotaan historis tetap tersimpan. Rentang yang bertumpang tindih ditolak. |
| Form admin berupa modal | Tambah/Edit master, pengguna, jadwal, tahun ajaran, periode/penugasan, kalender, jam belajar, rapor dan proses kenaikan memakai modal. Hapus/Cabut/Pulihkan meminta konfirmasi dan alasan. Escape/Batal menutup modal; lebar modal diperiksa pada 320/390/768/1440 px. |
| Hapus Akun | `/admin/users` → **Hapus** pada baris akun → modal konfirmasi → isi alasan → **Ya, hapus**. Sesi akun yang dihapus langsung tidak berlaku. Admin aktif terakhir dilindungi agar sistem tetap dapat dikelola. |
| CRUD admin | Pengelolaan siswa, guru, kelas, jurusan, mapel, ruang, ekskul, pengguna, jadwal, tahun/periode, keanggotaan, penugasan, Piket/wali, kalender, versi jam, rapor, impor/ekspor dan riwayat diuji sesuai fungsi modul. Data terpakai diarsipkan agar rekam akademik tidak hilang; arsip menyediakan Pulihkan bila tidak konflik. |
| Jarak pencarian Alumni | `/admin/alumni` memiliki jarak di bawah kolom pencarian (`mb-6`), diuji secara terukur minimal 16 px dari input ke tabel dan tanpa overflow halaman pada desktop maupun layar kecil. |

Dashboard `/admin` merupakan pintu masuk; pengelolaan periode dan roster berada di **`/admin/penugasan`**, bukan langsung pada dashboard.

## Alur setiap akun

Password akun demo di tabel berikut tetap **`password`**, khusus localhost. Ketik manual pada halaman login; tidak ada pengisian otomatis.

| Akun | Alur yang dapat dijalankan |
|---|---|
| `admin@mail.com` | Login → Master Data (jurusan, kelas, guru, siswa, mapel, ruang) → Tahun Ajaran/Periode terverifikasi → Keanggotaan kelas → Jadwal dan Penugasan → penetapan Piket/wali → Kalender/Jam → pantau akademik → draft, verifikasi, terbitkan rapor → kenaikan/alumni. Manajemen Akun mencakup tambah/edit/aktivasi/nonaktif/hapus, persetujuan pendaftaran dan reset password. Impor memakai preview serta konfirmasi. |
| `guru@mail.com` | Login → Mengajar → pilih jadwal dan tanggal → periksa daftar siswa → isi H/S/I/A/Belum, materi dan jurnal → simpan → muat ulang → riwayat/cetak/ekspor. Penilaian → input komponen/deskripsi → simpan → rekap nilai. Nilai dan absensi mengikuti penugasan sendiri. |
| `guru.lain@mail.com` | Alur guru pembanding dengan kelas/mapel penugasannya. **Pada data lokal saat audit, akun ini juga memiliki tugas Piket aktif 1–10 November 2026**, sehingga login menuju `/piket`; menu Mengajar tetap tersedia. Tujuan login mengikuti penugasan aktif, bukan nama username. |
| `piket@mail.com` | Login → `/piket` → pilih tanggal/kelas → pantau jurnal dan siswa tidak hadir → preview rekonsiliasi → simpan rekap harian → matriks mingguan/cetak. Koreksi catatan terkonfirmasi hanya tersedia jika Admin memberikan izin, dengan alasan dan audit. |
| `kepsek@mail.com` | Login → Monitoring → tanggal/jam/guru/kelas/ruang → baca jurnal dan absensi → rekap nilai dan rapor → catatan evaluasi supervisi. Tidak diberi hak pengelolaan akun atau mengubah nilai guru. |
| `wali@mail.com` | Login → menu guru; tugas wali pada demo bersifat informasi penanggung jawab kelas. Hak mengajar tetap berasal dari penugasan mapel, dan penerbitan rapor dilakukan Admin. |
| `siswa@mail.com` | Login → profil/jadwal kelas → kehadiran harian → Buku Rapor Digital → buka/unduh rapor milik sendiri yang sudah terbit. Tidak dapat membaca draft atau rapor siswa lain. |
| `siswa.lain@mail.com` | Alur siswa pembanding pada kelas kedua untuk memeriksa pembatasan data antar siswa. |

Ganti akun dengan **Keluar**, atau gunakan profil browser terpisah. Mengubah nama/status/peran/password akun membatalkan sesi yang lama.

## Batasan yang masih ada

- Pengiriman email reset otomatis belum dikonfigurasi; tautan diberikan manual setelah verifikasi oleh Admin. Ini adalah alur pemulihan yang bekerja saat ini.
- Jika satu-satunya Admin lupa password, diperlukan bantuan pengelola server sesudah verifikasi identitas; tidak tersedia pintu masuk tanpa autentikasi.
- Register tidak membuat master siswa/guru sembarangan. Identitas harus lebih dahulu ada di master sekolah. Akun yang sudah ada dipulihkan melalui Admin, bukan didaftarkan ulang.
- Admin memiliki fungsi pengelolaan, tetapi perubahan yang merusak riwayat (misalnya menimpa jadwal yang sudah dipakai, menghapus admin terakhir, atau membuat keanggotaan bertumpang tindih) tetap ditolak. Riwayat audit merupakan catatan, bukan master yang dapat dihapus bebas.
- Data lokal masih berupa cakupan demo mengajar: 4 guru, 2 mapel dan 11 jadwal aktif untuk 2 kelas. Master memiliki 411 siswa dan 36 kelas; kelengkapan guru/mapel/jadwal sekolah perlu diisi Admin sesuai data riil.
- Skema SQLite existing pada tabel identitas masih menggunakan kolom TEXT tanpa constraint PK/UNIQUE. Validasi dan transaksi aplikasi mencegah duplikasi; penambahan constraint database membutuhkan migrasi tersendiri dan tidak dilakukan pada audit ini.
- Pengujian responsif memakai Chromium pada ukuran viewport HP; bukan pengujian perangkat fisik atau seluruh mesin browser.

## Bukti audit otomatis

Runner audit: `node tests/tsx_local_audit.cjs`; konfigurasi Chromium memakai `SIA_BROWSER_CONFIG` bila lokasi instalasinya berbeda. Menjalankan runner memerlukan izin membuka port localhost dan meluncurkan browser. Fixture pengujian disiapkan dari metadata skema tanpa menyalin baris data sekolah. Lokasi fixture dan laporan rinci disimpan di `runtime/local-audit-20261106/` (diabaikan Git).

**Hasil akhir: 110 kelompok uji pada 12 suite lolos, 0 gagal.** TypeScript, build production dan `git diff --check` berhasil. Delapan akun lokal membuka 82 tautan fitur; isi seluruh tabel sebelum/sesudah tetap sama: **57 akun total, 8 aktif**.

| Cakupan | Lolos |
|---|---:|
| Login/navigasi delapan akun lokal dan integritas | 9 |
| Alur akademik lengkap | 18 |
| CRUD master dan sidebar | 15 |
| Registrasi/persetujuan/reset/password/logout | 10 |
| Cabut/Hapus/modal/Alumni | 9 |
| Pulihkan arsip dan konflik | 4 |
| Transfer jurnal dan isi PDF | 9 |
| Jurnal harian | 4 |
| Jurnal bersama dan jam belajar | 8 |
| Edit jadwal | 8 |
| Evaluasi periode Kepsek | 9 |
| Piket mengajar, impor absensi dan kalender | 7 |
| **Total** | **110** |

Rincian hasil dan batasan: [laporan audit lokal](docs/AUDIT_LOKAL_AUTH_CRUD_2026-11-06.md). Bukti: [JSON pengujian](docs/evidence/LOCAL_AUTH_CRUD_AUDIT_2026-11-06.json). Salinan fixture beserta akun yang tersisa disimpan di `runtime/local-audit-20261106/preserved-fixtures/`; fixture registrasi mempertahankan akun Guru/Siswa yang baru dibuat. Akun database utama tidak diubah.

Panduan simulasi akademik berikut tetap memakai data 26–30 Oktober 2026; pilih tanggal tersebut saat mencoba alur mengajar secara manual.

---

# Skenario manual — simulasi Senin sampai Jumat

Website: **http://127.0.0.1:3000/auth/login**. Data simulasi: **26–30 Oktober 2026**, periode **2026/2027 Ganjil**. Website tetap di browser, bukan APK.

Menu **Absensi** dan **Nilai** tanpa parameter tanggal memilih tanggal mengajar terakhir dalam rentang penugasan terverifikasi, disertai keterangan tanggal otomatis. Ini tetap bekerja setelah minggu simulasi berakhir. Periksa tanggal sebelum mengoreksi; tanggal eksplisit di luar rentang dan akses memakai guru lain tetap ditolak.

Panduan ini menggantikan contoh akun/ID acak sebelum pembersihan fixture. Akun `uji_mapel_d75604`, kelas Uji Staf, jurnal #17 dan rapor #136 sudah tidak dipakai. Jangan menggunakan tautan lama tersebut sebagai contoh aktif.

## Akun yang dipakai

Password seluruh akun berikut: **`password`**, khusus development localhost.

| Peran | Username | Fungsi |
|---|---|---|
| Admin | `admin@mail.com` | Master, akun, penugasan, kalender, verifikasi/penerbitan rapor |
| Guru mapel utama | `guru@mail.com` | XII PPLG 2, 20 siswa contoh, jam ke-1–2 setiap hari |
| Guru mapel kedua | `guru.lain@mail.com` | XII PPLG 1, 2 siswa contoh; Jumat jam ke-3–4 juga mengajar XII PPLG 2 |
| Guru Piket | `piket@mail.com` | Pantau dan rekonsiliasi awal, tanpa izin koreksi data terkonfirmasi |
| Kepala Sekolah | `kepsek@mail.com` | Melihat jadwal guru, kelas/ruang, status jurnal, nilai dan rapor |
| Wali, opsional | `wali@mail.com` | Informasi penanggung jawab kelas; tidak memberi hak mengajar/review rapor tambahan |
| Siswa, opsional | `siswa@mail.com` | Rapor terbit milik siswa pertama |
| Siswa pembanding, opsional | `siswa.lain@mail.com` | Contoh siswa kelas kedua; tidak boleh membaca rapor siswa lain |

Gunakan profil browser terpisah atau logout saat berganti peran. Beberapa tab Incognito bisa berbagi login. Pada HP fisik, localhost menunjuk HP itu sendiri; untuk kondisi server saat ini, coba tampilan HP melalui DevTools komputer.

## Kondisi data setelah dirapikan

- **389 siswa dari Excel tetap utuh**, ditambah **22 siswa contoh**. Total master siswa **411**.
- **36 kelas sekolah**, **4 jurusan**, **29 ruang/lab** dan semua riwayat versi jam tetap tersedia.
- **4 profil guru contoh**, **2 mapel**, **2 periode**, **8 akun contoh aktif**. Akun uji otomatis acak sudah dihapus pada pembersihan 6 November; catatan auditnya tetap tersimpan.
- **11 jadwal terverifikasi**, **9 jurnal terisi**, **2 sengaja belum diisi** untuk menguji pemantauan Kepsek. Satu jadwal negatif `LEGACY-UJI` lokal tetap nonaktif dan tidak memberi akses mengajar; ini bukan 18 penugasan pada database aktif.
- **42 nilai**, **3 konfigurasi nilai**, **110 record absensi harian**, dan **2 rapor contoh terbit**.
- Satu agenda kalender disahkan dan satu agenda impor Excel masih draft.
- Pembersihan sebelum audit ini pernah menghapus data Uji/Bulk/F acak setelah backup/restore terverifikasi; audit log tetap disimpan. Audit 6 November tidak mengulangi pembersihan tersebut. Database aktif dan layanan 8085 tidak dipakai untuk simulasi ini.

## Navigasi modul dan fitur

Pilih **modul utama di atas**, kemudian **fitur di sidebar kiri**. Pada layar HP, klik **Menu fitur** untuk membuka/menutup daftar fitur modul. Navigasi bawah tetap menyediakan akses cepat. Tautan langsung di panduan ini tetap berlaku.

- Admin: **Master Data** → Siswa/Guru/Kelas/Jurusan/Mapel/Ruang/Bulk Upload Excel; **Akademik** → Periode & Penugasan/Jadwal/Tahun Ajaran/Jam/Kalender/Naik Kelas/Alumni/Ekskul; **Pengaturan** → Manajemen Akun.
- Guru: **Mengajar** → Absensi & Isi Jurnal/Riwayat & Cetak/Jadwal/Kalender/Jam; **Penilaian** → Input & Rekap Nilai/Nilai Ekstrakurikuler.
- Guru dengan tugas Piket aktif: modul **Guru Piket** → Pantau & Rekap Absensi. Izin backend tetap menentukan cakupan tanggal/kelas dan hak koreksi.
- Kepsek: **Monitoring** → Guru Mengajar/Jurnal Kelas & Agenda Guru/Absensi Harian; **Nilai & Rapor** → Rekap Nilai/Rapor Siswa/Catatan Evaluasi.

## 1. Guru: buka hari mengajar dan isi jurnal kelas

Login **`guru@mail.com`**. Pilih tanggal yang sesuai dengan jadwal berikut:

| Hari / tanggal | ID jadwal | Jam ke | Waktu | Kelas / ruang | Buka |
|---|---:|---|---|---|---|
| Senin, 26-10-2026 | 3 | 1–2 | 07:40–09:00 | XII PPLG 2 / Lab PPLG 1 | [Absensi dan jurnal Senin](http://127.0.0.1:3000/absensi?id_jadwal=3&tanggal=2026-10-26) |
| Selasa, 27-10-2026 | 120 | 1–2 | 07:00–08:20 | XII PPLG 2 / Lab PPLG 1 | [Absensi dan jurnal Selasa](http://127.0.0.1:3000/absensi?id_jadwal=120&tanggal=2026-10-27) |
| Rabu, 28-10-2026 | 122 | 1–2 | 07:00–08:20 | XII PPLG 2 / Lab PPLG 1 | [Absensi dan jurnal Rabu](http://127.0.0.1:3000/absensi?id_jadwal=122&tanggal=2026-10-28) |
| Kamis, 29-10-2026 | 124 | 1–2 | 07:00–08:20 | XII PPLG 2 / Lab PPLG 1 | [Absensi dan jurnal Kamis](http://127.0.0.1:3000/absensi?id_jadwal=124&tanggal=2026-10-29) |
| Jumat, 30-10-2026 | 1 | 1–2 | 07:45–08:45 | XII PPLG 2 / Lab PPLG 1 | [Absensi dan jurnal Jumat](http://127.0.0.1:3000/absensi?id_jadwal=1&tanggal=2026-10-30) |

Langkah uji:

1. Buka salah satu tautan. Cocokkan nama guru, kelas, tanggal dan 20 siswa.
2. Halaman awal menampilkan **10 siswa**. Pilih halaman 2, lalu kembali ke halaman 1. Coba pilihan 20/50 siswa per halaman.
3. Untuk uji perubahan lintas halaman, ubah siswa nomor 15 pada halaman 2, kembali ke halaman 1, lalu cari NIS `0000015`. Isian harus tetap ada. Jangan menganggap jumlah siswa pada hasil pencarian sebagai jumlah seluruh kelas.
4. Setelah memeriksa kehadiran, centang verifikasi dan gunakan **Tandai Semua Hadir**. Ubah siswa yang tidak hadir menjadi **S/I/A**. Gunakan **? / Belum Dikonfirmasi** jika belum ada informasi terverifikasi.
5. Scroll ke **Isi Jurnal Kelas & Agenda Guru**. Inilah tempat guru menginput jurnal kelasnya: pertemuan ke, jam ke, TP/ATP, materi, kegiatan, refleksi, tindak lanjut, catatan dan pengganti jika perlu.
6. Isi **alasan koreksi**, karena contoh sudah tersimpan. Klik **Simpan Absensi & Jurnal**.
7. Reload. Periksa isian siswa di halaman 1 dan 2 serta seluruh materi/refleksi.
8. Buka **Riwayat & Cetak** atau tombol PDF/Excel/CSV/Cetak pada modul. Periksa isi jurnal, agenda dan matriks, bukan sekadar file berhasil diunduh.

**Hasil yang benar:** isian pada halaman lain tetap ikut tersimpan. Pencarian/pagination tidak menghilangkan anggota kelas dari penyimpanan. Jurnal dan agenda memakai pertemuan yang sama; pengisi/alasan tercatat pada riwayat. Pengujian browser sudah membuktikan penyimpanan seluruh 20 siswa dari kondisi hanya satu hasil pencarian terlihat.

### Rekap awal XII PPLG 2

Angka di bawah berlaku sebelum Anda mengedit contoh:

| Tanggal | H | S | I | A | Belum | Catatan |
|---|---:|---:|---:|---:|---:|---|
| 26-10-2026 | 18 | 1 | 1 | 0 | 0 | Nomor 4 S, nomor 5 I |
| 27-10-2026 | 19 | 0 | 0 | 1 | 0 | Nomor 7 A |
| 28-10-2026 | 18 | 1 | 0 | 0 | 1 | Nomor 4 S, nomor 8 Belum |
| 29-10-2026 | 20 | 0 | 0 | 0 | 0 | Seluruh siswa terverifikasi hadir |
| 30-10-2026 | 18 | 1 | 1 | 0 | 0 | Nomor 4 S, nomor 5 I |

Belum tidak dihitung sebagai Hadir atau Alpa. Sesi mengajar dan rekap harian merupakan dua jenis data; rekap harian diperbarui melalui pemeriksaan/rekonsiliasi sesuai izin.

## 2. Kepala Sekolah: guru ini jam ke-1–2 ada di kelas mana?

Login **`kepsek@mail.com`**, buka [Guru Mengajar pada Jumat jam ke-1](http://127.0.0.1:3000/guru-mengajar?tanggal=2026-10-30&jam_ke=1).

1. Pilih tanggal **26, 27, 28, 29, atau 30 Oktober 2026**.
2. Pilih **Jam pelajaran 1** atau **2**, lalu **Tampilkan pemantauan**.
3. Periksa guru, mapel, **Jam ke-1–2**, waktu, kelas, ruang, wali dan status jurnal.
4. Guru utama seharusnya terlihat di **XII PPLG 2 / Lab PPLG 1**. Guru kedua di **XII PPLG 1 / A1**.
5. Pilih Jumat **Jam ke-3**: guru kedua terlihat mengajar **Basis Data** di **XII PPLG 2 / Lab PPLG 1**, rentang **3–4 / 08:45–09:45**.
6. Klik **Sudah diisi** untuk membaca jurnal yang disimpan guru. Kepala Sekolah membaca; pengisian jurnal dilakukan guru pemilik jadwal melalui halaman Absensi & Isi Jurnal.
7. Coba filter Guru/Kelas/Ruang dan paging. Filter harus tetap terbawa.

**Status awal:** guru utama sudah mengisi selama lima hari. Guru kedua sengaja belum mengisi untuk **Rabu dan Jumat pada kelas XII PPLG 1**. Jumat pada kelas XII PPLG 2 jam ke-3–4 sudah diisi. Pemantauan berbasis penugasan/jurnal, bukan pelacakan lokasi fisik guru.

Nomor jam dipetakan dari waktu jadwal ke **referensi jam terbaru** dan versi acuannya ditampilkan. Jadwal dengan waktu yang tidak cocok ditandai belum dipetakan; arsip waktunya tidak diganti otomatis.

### Coba perubahan Belum diisi → Sudah diisi

1. Catat status Jumat XII PPLG 1 sebagai Kepsek.
2. Pada browser lain login **`guru.lain@mail.com`**, buka [jadwal #2 Jumat](http://127.0.0.1:3000/absensi?id_jadwal=2&tanggal=2026-10-30).
3. Periksa 2 siswa, verifikasi, isi absensi dan jurnal/materi, jam ke **1–2**, pertemuan ke **5**, lalu simpan.
4. Reload dashboard Kepsek: status harus menjadi **Sudah diisi** dan jurnal dapat dibuka.
5. Sebagai Piket, tinjau/rekonsiliasi kelas XII PPLG 1 tanggal tersebut. Sebelumnya rekap awal 2 Belum; perubahan tidak otomatis menimpa rekap tanpa pemeriksaan.

Setelah langkah ini, angka 9 terisi/2 belum pada contoh awal berubah sesuai isian Anda. Jangan menghapus data hanya untuk mengembalikan angka pengujian.

## 3. Guru Piket: periksa lima hari dan unduh matriks

Login **`piket@mail.com`**, buka [Piket XII PPLG 2](http://127.0.0.1:3000/piket?id_kelas=1&tanggal=2026-10-30).

1. Pilih tanggal dan kelas. Cocokkan H/S/I/A/Belum dengan tabel rekap awal di atas.
2. Periksa sesi yang sudah/belum terisi, daftar siswa tidak hadir dan riwayat.
3. Buka **Kalender absensi**, pilih tanggal lain dalam minggu simulasi.
4. Pada **Matriks & laporan periode**, pilih **26-10-2026 sampai 30-10-2026**. Unduh PDF/Excel/CSV atau Cetak.
5. Buka file dan periksa lima kolom tanggal, NIS, nama, status dan total.
6. Jika guru melakukan koreksi, periksa peringatan bukti sesi berubah. Rekonsiliasi ulang data yang sudah terkonfirmasi memerlukan Admin/permission koreksi. `piket@mail.com` awalnya hanya boleh monitor dan rekonsiliasi awal, tanpa koreksi data terkonfirmasi.

**Hasil yang benar:** satu siswa mempunyai satu record harian per tanggal. Dua sesi pada Jumat kelas utama tidak dihitung sebagai dua hari. Pada kelas kedua, Rabu/Jumat yang belum diisi awalnya mempunyai 2 Belum, bukan 2 Hadir/Alpa.

## 4. Nilai, rapor dan kalender

### Guru dan nilai

1. Login `guru@mail.com`, buka [Nilai siswa pertama](http://127.0.0.1:3000/nilai?id_jadwal=1&tanggal=2026-10-30&nis=0000001).
2. Periksa versi aturan dan bobot 30/30/40. Nilai awal siswa pertama mapel Pemrograman **80**, Basis Data **85**.
3. Ubah nilai valid 0–100 dengan alasan, simpan dan reload. Coba 101: harus ditolak tanpa menimpa nilai sah.
4. Unduh PDF/Excel/CSV atau Cetak langsung dari Nilai. Gunakan **Bulk Upload Excel Nilai** jika ingin mencoba template → preview → konfirmasi → simpan.

### Admin/Kepsek dan rapor

1. Login Admin atau Kepsek, buka [rapor #137](http://127.0.0.1:3000/rapor?id=137) dan [rapor #138](http://127.0.0.1:3000/rapor?id=138).
2. Periksa kedua mapel dan hasil cetak/download. Keduanya sudah diterbitkan melalui verifikasi Admin.
3. Login `siswa@mail.com`: rapor #137 dapat dibaca; #138 milik siswa lain harus ditolak.
4. Untuk membuat versi baru, Admin membuka Rapor → pilih siswa/periode/batas rekap → buat draft → verifikasi → terbitkan. Wali tidak menjadi langkah approval wajib.
5. Nilai yang Anda edit tidak mengubah arsip rapor yang sudah terbit. Buat snapshot baru jika ingin menerbitkan koreksi.

Rapor semester tetap menghitung rentang semester/keanggotaan, bukan hanya lima hari demo. Tanggal efektif lain yang belum diisi tercatat Belum. Untuk melihat tepat lima hari, gunakan ekspor matriks dengan rentang tanggal di atas.

### Kalender

Login Admin/Kepsek, buka [Kalender Oktober 2026](http://127.0.0.1:3000/kalender?bulan=2026-10).

1. Periksa agenda **Simulasi: evaluasi kegiatan belajar**, disahkan tanggal 29 Oktober.
2. Periksa agenda **Simulasi: agenda dari Excel**, masih draft. Guru tidak boleh menganggap draft sebagai agenda resmi.
3. Coba edit/nonaktifkan **agenda simulasi saja**, lalu reload dan periksa ekspor.
4. Bulk Excel Kalender selalu masuk sebagai draft untuk diperiksa terlebih dahulu.

## 5. Admin: master, bulk upload, penugasan dan jam

1. Login `admin@mail.com`. Buka Master Siswa/Kelas/Guru/Jurusan/Mapel/Ruang. Data acak lama sudah dibersihkan.
2. Coba pencarian/filter dan pilihan 10/20/25/50/100 baris; nomor halaman dan rentang data harus cocok.
3. Pada **Manajemen Akun**, default Status Aktif menampilkan 8 akun contoh. Pilih Nonaktif/Semua untuk melihat akun arsip audit.
4. Untuk bulk master, klik **Bulk Upload Excel** pada master yang dipilih, download template, isi data Uji baru, preview, konfirmasi dan terapkan. Ada 6 master: siswa/guru/kelas/jurusan/mapel/ruang. Untuk data berelasi: Jurusan → Kelas → Siswa. Duplikat ditolak; tidak ada overwrite atau akun login otomatis.
5. Guru mapel dikontrol melalui **Master Guru → Akun Guru → Jadwal/Mapel/Kelas/Ruang → Periode dan rentang terverifikasi**. Menjadi wali saja tidak memberi hak mengajar.
6. **Jam Belajar** dapat diubah Admin sebagai versi baru. Jangan mengubah waktu acuan saat sedang membandingkan hasil simulasi, kecuali memang menguji perubahan tersebut. Waktu jadwal/jurnal lama tidak diseragamkan otomatis.
7. Fitur Naik Kelas tetap tersedia, tetapi jangan menerapkannya pada 389 siswa Excel hanya untuk tes. Gunakan cohort dan periode Uji terpisah, Genap → Ganjil tahun berikutnya, periksa preview sebelum konfirmasi. Tidak ada batch kenaikan acak lama yang dibiarkan aktif pada demo ini.

Untuk menambah/mengedit master saat mencoba, gunakan kode/nama berlabel Manual yang unik; nonaktifkan kembali bila selesai. Jangan mengulang suite otomatis besar untuk sekadar membuka demo karena suite itu memang menciptakan banyak fixture.

**Menyimpan tugas Guru Piket:** di **Akademik → Periode & Penugasan**, isi bagian **Penugasan Guru Piket & izin koreksi**. Sesudah simpan, halaman membuka kembali tugas dengan ID-nya dan isian tetap terlihat. Menyimpan lagi memperbarui tugas yang sama. Untuk tugas yang sebelumnya dibuat, cari daftar **Tugas Guru Piket** dan klik **Edit / cabut izin**; jangan menambah ulang hanya karena formulir awal kosong. Gunakan **Tambah tugas Guru Piket** untuk penugasan baru. Jika validasi gagal, isian tetap terbuka dengan keterangan belum disimpan. Pencabutan mempertahankan arsip dan audit; menyimpan kembali tugas yang dicabut akan mengaktifkannya lagi.

## 6. URL pendek dan batas akses

| Halaman | URL |
|---|---|
| Beranda | `/beranda` |
| Absensi dan pengisian jurnal | `/absensi?id_jadwal=1&tanggal=2026-10-30` |
| Riwayat/cetak jurnal | `/jurnal` |
| Pemantauan Kepala Sekolah | `/guru-mengajar?tanggal=2026-10-30&jam_ke=1` |
| Piket | `/piket?tanggal=2026-10-30` |
| Nilai / rapor | `/nilai`, `/rapor` |
| Kalender / jadwal | `/kalender`, `/jadwal` |
| Jam / akademik / kenaikan / alumni | `/jam-belajar`, `/akademik`, `/kenaikan`, `/alumni` |

URL lama `/academic/index.php?view=...` tetap dapat dipakai. Parameter jadwal/tanggal/filter memang wajar untuk menyimpan konteks halaman; bukan password atau pemberi hak akses. Link ekspor masih membawa filter/rentang yang diperlukan.

Coba sebagai Guru membuka jadwal guru lain atau `/admin/users.php`: harus ditolak. Kepsek hanya membaca jurnal/nilai/rapor sesuai izin. Guru Piket tidak menjadi Admin. SQL, `.git/config`, `.env`, log dan konfigurasi tetap tidak dapat diunduh dari web.

## 7. Catatan hasil Anda

Semua baris di bawah merupakan **checklist manual yang belum Anda jalankan**. Hasil otomatis sebelumnya bukan pengganti pengisian checklist ini.

| Kasus | Hasil diharapkan | Status Anda / catatan |
|---|---|---|
| Login/logout Admin, Guru, Piket, Kepsek | Akun aktif berhasil; sesudah logout halaman meminta login | Belum diuji |
| Guru lima tanggal | Jadwal/kelas sesuai; absensi dan jurnal tersimpan setelah reload | Belum diuji |
| Pagination dan pencarian absensi | Edit di halaman 2 tidak hilang saat pindah/cari/simpan | Belum diuji |
| H/S/I/A/Belum | Ringkasan seluruh kelas benar; Belum bukan H/A | Belum diuji |
| Jurnal kelas dan agenda | Materi/refleksi sama, PDF/Excel/CSV/Cetak terbaca | Belum diuji |
| Kepsek jam ke-1–2 dan 3–4 | Guru, kelas/ruang dan status jurnal cocok | Belum diuji |
| Guru kedua mengisi jadwal yang kosong | Kepsek berubah Belum diisi → Sudah diisi | Belum diuji |
| Piket dan matriks lima hari | Rekap harian benar, tanpa menggandakan sesi menjadi hari | Belum diuji |
| Nilai dan penolakan 101 | Simpan/edit benar; input invalid tidak menimpa | Belum diuji |
| Rapor terbit/IDOR | Siswa hanya rapor sendiri; arsip tidak berubah otomatis | Belum diuji |
| Bulk Excel master/akademik | Preview belum write; commit/reload benar; duplikat ditolak | Belum diuji |
| Kalender dan draft | Draft tidak dianggap resmi; perubahan simulasi tersimpan | Belum diuji |
| Master, jadwal dan akun | CRUD/validasi sesuai; role diperiksa server | Belum diuji |
| Responsif 320/375/430/768px dan desktop | Form utama tidak overflow; tombol bisa disentuh | Belum diuji |
| URL lama/baru dan proteksi file | Fungsi sama dan tidak melewati otorisasi | Belum diuji |

Gunakan PASS/FAIL/BLOCKED/N/A dan catat URL, akun/peran, tanggal/kelas, langkah, hasil aktual, hasil setelah reload serta screenshot. Jangan menyertakan password database, cookie atau session token.

Jika Sabtu 31 Oktober tidak menampilkan jadwal, pilih salah satu tanggal **26–30 Oktober**. Jika layanan berhenti, cek dari `/home/muflih/sia-academic-dev` dengan `python3 ops/academic/academic_server.py status`; start hanya layanan development bila diperlukan. Layanan 8085 tidak menjadi target pengujian.
