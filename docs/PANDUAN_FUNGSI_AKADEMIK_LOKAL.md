# Panduan fungsi dan uji manual lokal

> Konfigurasi staf terbaru: bulk Excel di `/admin/bulk_upload.php`; wali sebagai informasi, verifikasi rapor oleh Admin; akun uji yang dicantumkan memakai password development `password`. Gunakan [panduan manual terbaru](PANDUAN_TEST_MANUAL_ADMIN_GURU_KEPSEK.md). Langkah persetujuan wali pada bagian lama di bawah adalah riwayat alur kompatibilitas, bukan alur operasional saat ini.

Kelanjutan checkpoint `d53c95f`. Gunakan worktree `/home/muflih/sia-academic-dev`, branch `development/academic-workflows-20261031`. Seluruh contoh di bawah memakai data development sintetis, bukan data asli sekolah.

## Membuka aplikasi dan akun

URL: **http://127.0.0.1:18125** atau **http://127.0.0.1:18125/auth/login.php**.

| Peran uji | Username | Cakupan utama |
| --- | --- | --- |
| Admin | `uji_admin` | CRUD, fondasi akademik, kalender, tugas piket/wali, pembuatan/verifikasi/penerbitan rapor |
| Guru | `uji_guru` | XII PPLG 2, Pemrograman; absensi/jurnal/nilai sesuai jadwal |
| Guru lain | `uji_guru_lain` | Basis Data; sesi kedua XII PPLG 2 dan kelas pembanding |
| Guru Piket | `uji_piket` | Monitoring cakupan sekolah dan rekonsiliasi awal, tanpa hak Admin/koreksi terkonfirmasi secara default |
| Wali kelas | `uji_wali` | Akun role Guru dengan tugas wali XII PPLG 2 pada periode fixture; memeriksa rapor, tidak menerbitkan |
| Siswa | `uji_siswa` | NIS `0000001`, hanya data/rapor terbit sendiri |
| Kepala sekolah | `uji_kepsek` | Supervisi read-only nilai/rapor dan kalender sesuai kebijakan |

Password akun fixture tersedia pada file privat mode 0600:
`/home/muflih/.local/state/sia-academic-dev/20261031/private/test-accounts.json`.
Password testing juga diberikan langsung dalam jawaban percakapan sesuai permintaan pengguna; tidak dicatat dalam Git/laporan. Password database tidak diberikan.

```bash
cd /home/muflih/sia-academic-dev
python3 ops/academic_server.py status
python3 ops/academic_server.py start
# Bila diperlukan, hanya restart development:
python3 ops/academic_server.py restart
```

Server menggunakan unit lokal yang sudah ada, DynamicUser non-root, kode read-only untuk proses web, credential terpisah dan MariaDB socket-only. Wrapper memerlukan izin operator lokal `sudo -n`; tidak menerima port/unit produksi. Tidak perlu mengulangi setup database atau membuat Docker. Akun root bukan akun runtime.

## Admin: CRUD dan fondasi

1. Masuk sebagai Admin → **Akademik** → **Master data**. Coba tambah, cari, edit, nonaktifkan, dan aktifkan Guru, Siswa, Kelas, Jurusan, Mapel. Identitas NIS berarsip tidak diganti. Nonaktifkan menjaga relasi/riwayat.
2. Buka **Akun & role**. Buat akun guru/siswa dengan referensi yang benar dari Master, bukan memilih Admin untuk memberi akses khusus. Uji nonaktif akun dan penolakan login. Jangan menggunakan akun sekolah asli.
3. Buka **CRUD jadwal**. Pilih guru/kelas/mapel/periode serta hari/jam/ruang. Bentrok ditolak. Setelah tersimpan, kembali ke Akademik → **Verifikasi rentang penugasan** untuk menetapkan tanggal berlaku dan dasar verifikasi. Jadwal tanpa periode/rentang terverifikasi tidak dapat dipakai mengisi.
4. Atur periode dan hari efektif secara eksplisit. Tahun ajaran/semester dari data yang dipilih; aplikasi tidak menebak tahun arsip. Kunci periode untuk memeriksa bahwa pengisian, koreksi, kalender/nilai/rapor ditolak, lalu buka kembali hanya pada fixture.
5. Tambah anggota kelas dengan nomor absen dan rentang tanggal. Overlap siswa/nomor ditolak. Tutup rentang sebelum membuat rentang baru untuk perpindahan; jangan mengganti konteks historis yang sudah digunakan.
6. Tugas **Guru Piket** dan **Wali Kelas** dikelola di Akademik. Keduanya tambahan izin pada akun guru existing. Tetapkan kelas/periode/tanggal; tugas piket boleh seluruh sekolah, wali dibatasi satu kelas per rentang. Koreksi piket adalah izin terpisah. Cabut tugas melalui form edit, bukan mengganti role menjadi Admin.

## Guru: absensi, jurnal, agenda

1. Login `uji_guru` → **Absensi**. Pilih **XII PPLG 2 / Pemrograman / Jumat 07:00**, tanggal **2026-10-30**. Tersedia 20 siswa dari database, urut nomor absen.
2. Centang bahwa kehadiran telah diperiksa → **Tandai Semua Hadir** → nomor 4 S, nomor 5 I. Ringkasan harus 18 H, 1 S, 1 I, 0 A, 0 belum. `?` berarti Belum Dikonfirmasi; tidak dihitung H/A.
3. Isi pertemuan/jam ke, TP/ATP, materi, kegiatan, pengganti bila ada, refleksi, catatan dan tindak lanjut. Karena fixture sudah pernah diisi, sertakan alasan koreksi. Klik **Simpan Absensi & Jurnal** lalu reload.
4. Buka **Jurnal & Agenda** → detail. Perubahan harus sama dengan pertemuan tadi. Unduh PDF/Excel/CSV atau cetak. Jurnal dicetak sebagai tabel kegiatan belajar mengajar dan daftar hadir; agenda berisi ketidakhadiran, refleksi dan tindak lanjut, dari ID pertemuan yang sama.
5. Pilih **Matriks kehadiran sesi** untuk cetakan siswa-baris/tanggal-kolom. Daftar harian sekolah tetap sumber terpisah. Pengganti pada jurnal adalah pencatatan; tidak otomatis mendapat izin mengedit.
6. **Jadwal** menampilkan penugasan terverifikasi yang berlaku. Jadwal siswa memakai keanggotaan bertanggal, bukan hanya kolom kelas terkini pada master.

## Guru Piket: rekap harian dan koreksi

1. Login `uji_piket` → **Guru Piket**, tanggal **2026-10-30**, kelas **XII PPLG 2**. Periksa sesi sudah/belum terisi, jumlah status, siswa tidak hadir, kalender tanggal dan riwayat.
2. Kelas contoh mempunyai dua sesi Jumat. Jika hanya satu sesi terisi atau status bertentangan, rekonsiliasi menghasilkan Belum Dikonfirmasi. Tidak ada pemilihan otomatis sesi pertama/terakhir atau prioritas H/S/I/A.
3. Isi alasan dan **Rekonsiliasi dari bukti seluruh sesi**. Data harian yang sudah terkonfirmasi tidak otomatis ditimpa setelah guru mengedit sesi; muncul tanda perlu tinjau.
4. Untuk koreksi terkonfirmasi, Admin harus memberi izin koreksi pada tugas piket. Pilih siswa, isi status/keterangan/alasan, simpan, periksa before/after dan actor. Izin monitor saja tidak cukup. Admin juga dapat melakukan pemeriksaan sesuai haknya.
5. Unduh rekap Excel/CSV/PDF, atau pilih rentang harian/mingguan/bulanan/semester. Cakupan izin diperiksa untuk setiap tanggal. Data belum terverifikasi tetap B; sesi tidak dijumlah sebagai beberapa hari.

## Kalender dan impor

- Kalender: tambah kegiatan draft; siswa tidak boleh melihatnya. Sahkan setelah diperiksa, edit, lalu nonaktifkan untuk membatalkan. Libur tidak dapat membatalkan pertemuan historis yang sudah disimpan. Tidak ada kalender resmi yang dibuat dari perkiraan.
- Impor Guru: absensi sesi dan nilai. Admin: siswa, guru, kalender, anggota kelas dan penugasan. Kepsek: kalender sesuai izin. Unduh template CSV/XLSX, isi literal, unggah, periksa preview, konfirmasi, lalu terapkan. Identitas siswa tetap teks agar nol di depan terjaga.
- Anggota kelas/penugasan diimpor sebagai data baru dalam periode yang dipilih. Penugasan memerlukan konfirmasi verifikasi administratif; file tidak menerima ID penugasan legacy untuk menimpa arsip. Data bentrok/duplikat ditolak.
- Preview hanya 15 menit dan sekali pakai. Percobaan unggah baru membatalkan preview lama, termasuk bila file baru gagal validasi. Gagal satu baris saat commit membatalkan seluruh batch. Impor kalender selalu draft.

## Nilai, wali dan rapor

1. Guru → **Nilai**, pilih penugasan dan tanggal roster yang sah. Pilih siswa tertentu untuk individu atau kosongkan untuk massal. Buat versi aturan bobot total 100. Nilai 0–100 dan deskripsi wajib. Uji 101 untuk penolakan backend; nilai tersimpan sebelumnya harus tetap.
2. Aturan/predikat disimpan per versi. Mengubah aturan tidak menghitung ulang nilai lama. Rapor terbit juga tidak berubah ketika guru mengoreksi nilai sesudah snapshot.
3. Admin → **Rapor** → buat snapshot untuk **Siswa Uji 01** setelah seluruh mapel lengkap, dengan batas rekap yang jelas. Snapshot baru berstatus draft; siswa belum dapat membaca.
4. Login `uji_wali` → **Rapor**, pilih draft siswa dalam kelas/periode/tanggal tugasnya. Periksa seluruh isi dan pilih **Disetujui** atau **Perlu perbaikan**, isi catatan, simpan. Riwayat pemeriksaan append-only. Wali tidak dapat membaca kelas lain atau mengubah nilai mapel lain melalui izin wali.
5. Admin membuka snapshot tersebut, memverifikasi, kemudian menerbitkan. Tanpa persetujuan wali yang masih sah, penerbitan ditolak, termasuk draft versi lama. Bila sumber berubah, buat snapshot baru. Pencabutan tugas wali sebelum publikasi membatalkan kelayakan review; arsip terbit tidak dihapus.
6. Login `uji_siswa` → hanya snapshot terbit sendiri terlihat. PDF/Excel menggunakan isi snapshot, bukan menghitung ulang nilai terkini. Hari yang belum pernah diverifikasi tetap B pada rekap, bukan Hadir otomatis. Nilai fixture terkini dan arsip lama dapat berbeda karena arsip dibekukan.
7. Admin/kepsek dapat melihat dan mengekspor rekap nilai terfilter periode/kelas/mapel. Role tersebut tidak memperoleh jalur mengganti nilai guru melalui halaman supervisi.

## Pengujian dan pemulihan

```bash
# Sudah tersedia di lingkungan ini; hanya bila dependency tes PDF belum ada:
python3 ops/academic_test_dependencies.py
# Seluruh suite berurutan, termasuk operasi browser yang menyimpan data:
python3 tests/run_academic.py --with-kelas10 --with-progression --with-bulk-master --with-staff \
  --baseline-directory /home/muflih/.local/state/sia-academic-dev/20261031/reports/kelas10-baseline
```

Tes memakai fixture dengan ID unik, tidak me-reset database. Skenario browser menyimpan, memeriksa DB, reload, mengedit/nonaktifkan dan menguji izin; CSV/XLSX/PDF dibaca kembali. Teks PDF dinormalisasi untuk whitespace/ligatur font sebelum dibandingkan dengan NIS/nama/materi sumber. Parser PDF berada di tooling privat, bukan dependency backend aplikasi.

Log, screenshot, hasil rinci dan backup privat: `/home/muflih/.local/state/sia-academic-dev/20261031/`. `reports/restore-latest.json` mencatat backup/restore ke database baru dan hash. Suite terakhir melakukan restart hanya 18125 dan menguji startup salah credential yang gagal tertutup, kemudian memulihkan konfigurasi benar. Jalankan tes saat tidak ada pengisian manual development.

Jangan mengimpor dump ke database existing, mengganti grant aktif atau memetakan 18 penugasan asli lewat fixture. Untuk memulihkan eksperimen lokal, hentikan service development, simpan checkpoint/backup, lalu gunakan worktree/database baru. Tidak ada rollback DDL destruktif otomatis.

## Data uji kelas X dan referensi jam

Sumber pengganti yang dipakai adalah `/home/muflih/sistem_akademik/data kelas 10 clean.xlsx`: 389 siswa, 11 kelas X. Berkas kelas XI sebelumnya tidak diimpor. NIS, nama, kelamin, kelas dan nomor absen dibaca dari Excel. Rumus NIS hanya diterima untuk pola penambahan satu dari baris sebelumnya, dengan hasil cache diperiksa; rumus bebas tidak dieksekusi.

- Admin `uji_admin`: buka `/admin/master.php?table=siswa`, pilih kelas X dan **Terapkan filter**. Contoh **X PPLG 2** mempunyai 35 siswa, terbagi 20 dan 15 pada dua halaman. Kelas/jurusan juga tersedia di master masing-masing.
- Guru Piket `uji_piket`: buka `/academic/index.php?view=piket`, tanggal **2026-10-30**, pilih kelas X. Siswa baru seluruhnya Belum Dikonfirmasi sampai ada pengisian yang sah. Excel/CSV/PDF memakai roster keanggotaan yang sama.
- Semua akun testing yang sudah login dapat membuka **Jam Belajar**: `/academic/index.php?view=jam`. Profil Senin, Selasa–Kamis dan Jumat berasal dari gambar, disimpan berversi di database. **Admin dapat mengubah jam**; guru/siswa/kepsek membaca versi terbaru. Perubahan jam umum tidak otomatis mengubah jadwal dan pertemuan historis.
- Guru belum diberi penugasan tambahan untuk kelas X. Admin harus menetapkan guru, mapel, hari, rentang jam dan periode, kemudian memverifikasi rentang penugasan di **Akademik**. Tabel jam bel tidak menyebut guru/mapel, sehingga tidak digunakan untuk mengarang jadwal. Alur guru/jurnal contoh XII tetap tersedia.
- Keanggotaan kelas X memakai **periode fixture sintetis 2026/2027 Ganjil** yang sudah ada, bukan periode yang diperoleh dari Excel. Excel tidak mempunyai tanggal lahir; nilai `2010-01-01` adalah placeholder **DATA UJI**, diberi keterangan pada alamat, bukan informasi siswa dari sumber. Jangan gunakan sebagai data sekolah resmi.
- Jumat jam ke-6 **10:50–11:40**, jam ke-7 **13:00–13:30** dipertahankan sesuai gambar; status referensi **perlu konfirmasi**. Jenis jeda 11:40–13:00 belum ditetapkan pengguna.

Impor dilakukan sekali melalui CRUD dan preview/commit yang terautentikasi; script `ops/academic_kelas10.py` menolak menimpa NIS existing. Mengulang dengan sumber yang sudah selesai hanya memverifikasi data, tanpa membuat duplikasi. Peta baris dan backup berada di direktori state privat, tidak masuk Git atau document root. Baseline khusus tugas ini mencatat file Excel baru dan perubahan `.gitignore` yang telah dibuat pengguna; baseline audit lama tetap disimpan.

## Batas yang masih perlu keputusan

Delapan alur inti sudah dapat diuji lokal. Data sekolah asli/18 penugasan, kalender resmi, pengesahan kurikulum/format cetak persis foto dan tanda tangan resmi masih memerlukan validasi sekolah. Kenaikan tahunan kini tersedia. Mutasi khusus massal, penyetaraan nilai lintas kelas serta modul tambahan legacy ekstrakurikuler/evaluasi belum dinyatakan selesai seluruhnya. Pengujian beban/multi-worker, Android/iOS fisik, LAN dan produksi belum dilakukan. Tidak ada Docker/deployment produksi pada pekerjaan ini.

## Kelola kelas, jam, kenaikan dan alumni

Daftar awal sekarang **36 kelas**: X/XI/XII × PPLG/AKL/PM/MPLB × paralel 1/2/3. Penambahan 23 kelas mempertahankan 13 kelas existing. Kelas tanpa siswa memang kosong; tidak diisi siswa rekaan atau diberi jadwal guru otomatis. Admin dapat menambah, memperbaiki nama dan menonaktifkan kelas melalui `/admin/master.php?table=kelas`; tersedia filter tingkat/jurusan dan 20 baris per halaman. Tingkat/jurusan kelas yang sudah mempunyai keanggotaan historis tidak dapat diganti untuk menafsirkan ulang arsip.

**Mengubah jam:** login `uji_admin` → **Jam Belajar** → **Ubah Jam Senin / Selasa–Kamis / Jumat**. Edit mulai/selesai, nomor pelajaran dan keterangan. Kosongkan nomor untuk upacara, istirahat atau kegiatan. Tambah/hapus baris bila diperlukan. Isi alasan, catatan dan status; centang pemeriksaan untuk menyimpan status Referensi. Klik **Simpan Jam**, reload dan periksa versi/riwayat. Waktu yang terbalik/bertumpang tindih, nomor ganda dan formulir versi lama ditolak. Jam berlaku umum bagi semua kelas, belum menetapkan mapel/guru. Akun selain Admin tidak dapat mengedit melalui URL maupun POST.

**Naik Kelas:** login Admin → `/academic/index.php?view=kenaikan`. Pilih **Genap asal** secara eksplisit → **Muat kelas asal**. Pilih Ganjil tahun berikutnya yang terverifikasi dan tidak dikunci, periksa pemetaan X→XI dan XI→XII pada jurusan yang sama, serta XII→Alumni. Masukkan dasar keputusan → **Pratinjau Naik Kelas**. Setelah memeriksa jumlah dan setiap tujuan, centang konfirmasi lalu **Terapkan Naik Kelas**. Proses menyimpan satu batch atomik, keanggotaan baru bertanggal, hasil setiap siswa, identitas Admin dan audit. Kelas tujuan yang sudah berisi anggota/histori serta siswa yang sudah diproses ditolak; tidak ada penimpaan atau klik ulang yang menggandakan data.

Sumber siswa adalah anggota kelas yang berlaku pada akhir Genap asal. Nomor absen dipertahankan. Kenaikan berlaku pada awal Ganjil tujuan dan tidak mengganti periode aktif otomatis. Keanggotaan, nilai, absensi, jurnal dan rapor lama tidak diubah. Master Siswa menampilkan kelas yang berlaku **hari ini** dari keanggotaan; referensi kelas master lama tetap ada. Kenaikan bertanggal mendatang belum mengubah kelas hari ini. XII menjadi calon alumni hingga tanggal berlaku, lalu alumni; akun/rapor terbit historis tidak dihapus atau direset. Form keanggotaan biasa menolak pendaftaran setelah tanggal kelulusan. Penerimaan kembali alumni, mutasi khusus dan pembatalan batch memerlukan workflow tersendiri; tidak tersedia rollback massal yang menghapus riwayat.

Untuk uji manual tanpa menaikkan 389 siswa Excel, tersedia **tiga siswa sintetis khusus** (satu X, satu XI, satu XII) dalam periode berlabel `DATA UJI KENAIKAN Manual`. Link dan ID periode tepat dicatat pada laporan checkpoint terbaru dan `reports/progression-manual-guide.json` privat. Siswa contoh ini belum diproses. Pilih tujuan secara manual pada kelas berlabel Uji, karena penamaan kelas contoh tidak memakai pola sekolah. Jangan menekan Terapkan untuk periode/data lain yang belum ditinjau.

**Alumni:** `/academic/index.php?view=alumni`, cari NIS/nama/kelas dan lihat batch asal. Status calon alumni dibedakan dari alumni berdasarkan tanggal berlaku. Semua daftar memakai pagination backend: master, periode, keanggotaan, batch, alumni, rapor dan jurnal 20 baris per halaman; Piket 6 kelas per halaman. Pilihan siswa pada form anggota dibatasi 50 hasil; gunakan pencarian NIS/nama di filter periode untuk menemukan siswa lainnya. Daftar absensi satu kelas tetap memuat seluruh roster agar penyimpanan tidak menghilangkan siswa di halaman lain.
