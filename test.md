# Uji manual terbaru — simulasi Senin sampai Jumat

Website: **http://127.0.0.1:18125/auth/login.php**. Data simulasi: **26–30 Oktober 2026**, periode **2026/2027 Ganjil**. Website tetap di browser, bukan APK.

Menu **Absensi** dan **Nilai** tanpa parameter tanggal memilih tanggal mengajar terakhir dalam rentang penugasan terverifikasi, disertai keterangan tanggal otomatis. Ini tetap bekerja setelah minggu simulasi berakhir. Periksa tanggal sebelum mengoreksi; tanggal eksplisit di luar rentang dan akses memakai guru lain tetap ditolak.

Panduan ini menggantikan contoh akun/ID acak sebelum pembersihan fixture. Akun `uji_mapel_d75604`, kelas Uji Staf, jurnal #17 dan rapor #136 sudah tidak dipakai. Jangan menggunakan tautan lama tersebut sebagai contoh aktif.

## Akun yang dipakai

Password seluruh akun berikut: **`password`**, khusus development localhost.

| Peran | Username | Fungsi |
|---|---|---|
| Admin | `uji_admin` | Master, akun, penugasan, kalender, verifikasi/penerbitan rapor |
| Guru mapel utama | `uji_guru` | XII PPLG 2, 20 siswa contoh, jam ke-1–2 setiap hari |
| Guru mapel kedua | `uji_guru_lain` | XII PPLG 1, 2 siswa contoh; Jumat jam ke-3–4 juga mengajar XII PPLG 2 |
| Guru Piket | `uji_piket` | Pantau dan rekonsiliasi awal, tanpa izin koreksi data terkonfirmasi |
| Kepala Sekolah | `uji_kepsek` | Melihat jadwal guru, kelas/ruang, status jurnal, nilai dan rapor |
| Wali, opsional | `uji_wali` | Informasi penanggung jawab kelas; tidak memberi hak mengajar/review rapor tambahan |
| Siswa, opsional | `uji_siswa` | Rapor terbit milik siswa pertama |
| Siswa pembanding, opsional | `uji_siswa_lain` | Contoh siswa kelas kedua; tidak boleh membaca rapor siswa lain |

Gunakan profil browser terpisah atau logout saat berganti peran. Beberapa tab Incognito bisa berbagi login. Pada HP fisik, localhost menunjuk HP itu sendiri; untuk kondisi server saat ini, coba tampilan HP melalui DevTools komputer.

## Kondisi data setelah dirapikan

- **389 siswa dari Excel tetap utuh**, ditambah **22 siswa contoh**. Total master siswa **411**.
- **36 kelas sekolah**, **4 jurusan**, **29 ruang/lab** dan semua riwayat versi jam tetap tersedia.
- **4 profil guru contoh**, **2 mapel**, **2 periode**, **8 akun contoh aktif**. Akun uji otomatis lain dinonaktifkan supaya identitas audit tidak hilang; pada Manajemen Akun, pilih Status Nonaktif/Semua bila perlu melihat arsipnya.
- **11 jadwal terverifikasi**, **9 jurnal terisi**, **2 sengaja belum diisi** untuk menguji pemantauan Kepsek. Satu jadwal negatif `LEGACY-UJI` lokal tetap nonaktif dan tidak memberi akses mengajar; ini bukan 18 penugasan pada database aktif.
- **42 nilai**, **3 konfigurasi nilai**, **110 record absensi harian**, dan **2 rapor contoh terbit**.
- Satu agenda kalender disahkan dan satu agenda impor Excel masih draft.
- Data Uji/Bulk/F acak dari pengujian lama dihapus setelah backup/restore terverifikasi; audit log tetap disimpan. Database aktif dan layanan 8085 tidak dipakai untuk simulasi ini.

## Navigasi modul dan fitur

Pilih **modul utama di atas**, kemudian **fitur di sidebar kiri**. Pada layar HP, klik **Menu fitur** untuk membuka/menutup daftar fitur modul. Navigasi bawah tetap menyediakan akses cepat. Tautan langsung di panduan ini tetap berlaku.

- Admin: **Master Data** → Siswa/Guru/Kelas/Jurusan/Mapel/Ruang/Bulk Upload Excel; **Akademik** → Periode & Penugasan/Jadwal/Tahun Ajaran/Jam/Kalender/Naik Kelas/Alumni/Ekskul; **Pengaturan** → Manajemen Akun.
- Guru: **Mengajar** → Absensi & Isi Jurnal/Riwayat & Cetak/Jadwal/Kalender/Jam; **Penilaian** → Input & Rekap Nilai/Nilai Ekstrakurikuler.
- Guru dengan tugas Piket aktif: modul **Guru Piket** → Pantau & Rekap Absensi. Izin backend tetap menentukan cakupan tanggal/kelas dan hak koreksi.
- Kepsek: **Monitoring** → Guru Mengajar/Jurnal Kelas & Agenda Guru/Absensi Harian; **Nilai & Rapor** → Rekap Nilai/Rapor Siswa/Catatan Evaluasi.

## 1. Guru: buka hari mengajar dan isi jurnal kelas

Login **`uji_guru`**. Pilih tanggal yang sesuai dengan jadwal berikut:

| Hari / tanggal | ID jadwal | Jam ke | Waktu | Kelas / ruang | Buka |
|---|---:|---|---|---|---|
| Senin, 26-10-2026 | 3 | 1–2 | 07:40–09:00 | XII PPLG 2 / Lab PPLG 1 | [Absensi dan jurnal Senin](http://127.0.0.1:18125/absensi?id_jadwal=3&tanggal=2026-10-26) |
| Selasa, 27-10-2026 | 120 | 1–2 | 07:00–08:20 | XII PPLG 2 / Lab PPLG 1 | [Absensi dan jurnal Selasa](http://127.0.0.1:18125/absensi?id_jadwal=120&tanggal=2026-10-27) |
| Rabu, 28-10-2026 | 122 | 1–2 | 07:00–08:20 | XII PPLG 2 / Lab PPLG 1 | [Absensi dan jurnal Rabu](http://127.0.0.1:18125/absensi?id_jadwal=122&tanggal=2026-10-28) |
| Kamis, 29-10-2026 | 124 | 1–2 | 07:00–08:20 | XII PPLG 2 / Lab PPLG 1 | [Absensi dan jurnal Kamis](http://127.0.0.1:18125/absensi?id_jadwal=124&tanggal=2026-10-29) |
| Jumat, 30-10-2026 | 1 | 1–2 | 07:45–08:45 | XII PPLG 2 / Lab PPLG 1 | [Absensi dan jurnal Jumat](http://127.0.0.1:18125/absensi?id_jadwal=1&tanggal=2026-10-30) |

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

Login **`uji_kepsek`**, buka [Guru Mengajar pada Jumat jam ke-1](http://127.0.0.1:18125/guru-mengajar?tanggal=2026-10-30&jam_ke=1).

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
2. Pada browser lain login **`uji_guru_lain`**, buka [jadwal #2 Jumat](http://127.0.0.1:18125/absensi?id_jadwal=2&tanggal=2026-10-30).
3. Periksa 2 siswa, verifikasi, isi absensi dan jurnal/materi, jam ke **1–2**, pertemuan ke **5**, lalu simpan.
4. Reload dashboard Kepsek: status harus menjadi **Sudah diisi** dan jurnal dapat dibuka.
5. Sebagai Piket, tinjau/rekonsiliasi kelas XII PPLG 1 tanggal tersebut. Sebelumnya rekap awal 2 Belum; perubahan tidak otomatis menimpa rekap tanpa pemeriksaan.

Setelah langkah ini, angka 9 terisi/2 belum pada contoh awal berubah sesuai isian Anda. Jangan menghapus data hanya untuk mengembalikan angka pengujian.

## 3. Guru Piket: periksa lima hari dan unduh matriks

Login **`uji_piket`**, buka [Piket XII PPLG 2](http://127.0.0.1:18125/piket?id_kelas=1&tanggal=2026-10-30).

1. Pilih tanggal dan kelas. Cocokkan H/S/I/A/Belum dengan tabel rekap awal di atas.
2. Periksa sesi yang sudah/belum terisi, daftar siswa tidak hadir dan riwayat.
3. Buka **Kalender absensi**, pilih tanggal lain dalam minggu simulasi.
4. Pada **Matriks & laporan periode**, pilih **26-10-2026 sampai 30-10-2026**. Unduh PDF/Excel/CSV atau Cetak.
5. Buka file dan periksa lima kolom tanggal, NIS, nama, status dan total.
6. Jika guru melakukan koreksi, periksa peringatan bukti sesi berubah. Rekonsiliasi ulang data yang sudah terkonfirmasi memerlukan Admin/permission koreksi. `uji_piket` awalnya hanya boleh monitor dan rekonsiliasi awal, tanpa koreksi data terkonfirmasi.

**Hasil yang benar:** satu siswa mempunyai satu record harian per tanggal. Dua sesi pada Jumat kelas utama tidak dihitung sebagai dua hari. Pada kelas kedua, Rabu/Jumat yang belum diisi awalnya mempunyai 2 Belum, bukan 2 Hadir/Alpa.

## 4. Nilai, rapor dan kalender

### Guru dan nilai

1. Login `uji_guru`, buka [Nilai siswa pertama](http://127.0.0.1:18125/nilai?id_jadwal=1&tanggal=2026-10-30&nis=0000001).
2. Periksa versi aturan dan bobot 30/30/40. Nilai awal siswa pertama mapel Pemrograman **80**, Basis Data **85**.
3. Ubah nilai valid 0–100 dengan alasan, simpan dan reload. Coba 101: harus ditolak tanpa menimpa nilai sah.
4. Unduh PDF/Excel/CSV atau Cetak langsung dari Nilai. Gunakan **Bulk Upload Excel Nilai** jika ingin mencoba template → preview → konfirmasi → simpan.

### Admin/Kepsek dan rapor

1. Login Admin atau Kepsek, buka [rapor #137](http://127.0.0.1:18125/rapor?id=137) dan [rapor #138](http://127.0.0.1:18125/rapor?id=138).
2. Periksa kedua mapel dan hasil cetak/download. Keduanya sudah diterbitkan melalui verifikasi Admin.
3. Login `uji_siswa`: rapor #137 dapat dibaca; #138 milik siswa lain harus ditolak.
4. Untuk membuat versi baru, Admin membuka Rapor → pilih siswa/periode/batas rekap → buat draft → verifikasi → terbitkan. Wali tidak menjadi langkah approval wajib.
5. Nilai yang Anda edit tidak mengubah arsip rapor yang sudah terbit. Buat snapshot baru jika ingin menerbitkan koreksi.

Rapor semester tetap menghitung rentang semester/keanggotaan, bukan hanya lima hari demo. Tanggal efektif lain yang belum diisi tercatat Belum. Untuk melihat tepat lima hari, gunakan ekspor matriks dengan rentang tanggal di atas.

### Kalender

Login Admin/Kepsek, buka [Kalender Oktober 2026](http://127.0.0.1:18125/kalender?bulan=2026-10).

1. Periksa agenda **Simulasi: evaluasi kegiatan belajar**, disahkan tanggal 29 Oktober.
2. Periksa agenda **Simulasi: agenda dari Excel**, masih draft. Guru tidak boleh menganggap draft sebagai agenda resmi.
3. Coba edit/nonaktifkan **agenda simulasi saja**, lalu reload dan periksa ekspor.
4. Bulk Excel Kalender selalu masuk sebagai draft untuk diperiksa terlebih dahulu.

## 5. Admin: master, bulk upload, penugasan dan jam

1. Login `uji_admin`. Buka Master Siswa/Kelas/Guru/Jurusan/Mapel/Ruang. Data acak lama sudah dibersihkan.
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
