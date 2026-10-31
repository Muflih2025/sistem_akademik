# Panduan fungsi dan uji manual lokal

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
python3 tests/run_academic.py
```

Tes memakai fixture dengan ID unik, tidak me-reset database. Skenario browser menyimpan, memeriksa DB, reload, mengedit/nonaktifkan dan menguji izin; CSV/XLSX/PDF dibaca kembali. Teks PDF dinormalisasi untuk whitespace/ligatur font sebelum dibandingkan dengan NIS/nama/materi sumber. Parser PDF berada di tooling privat, bukan dependency backend aplikasi.

Log, screenshot, hasil rinci dan backup privat: `/home/muflih/.local/state/sia-academic-dev/20261031/`. `reports/restore-latest.json` mencatat backup/restore ke database baru dan hash. Suite terakhir melakukan restart hanya 18125 dan menguji startup salah credential yang gagal tertutup, kemudian memulihkan konfigurasi benar. Jalankan tes saat tidak ada pengisian manual development.

Jangan mengimpor dump ke database existing, mengganti grant aktif atau memetakan 18 penugasan asli lewat fixture. Untuk memulihkan eksperimen lokal, hentikan service development, simpan checkpoint/backup, lalu gunakan worktree/database baru. Tidak ada rollback DDL destruktif otomatis.

## Batas yang masih perlu keputusan

Delapan alur inti sudah dapat diuji lokal. Data sekolah asli/18 penugasan, kalender resmi, pengesahan kurikulum/format cetak persis foto dan tanda tangan resmi masih memerlukan validasi sekolah. Kenaikan kelas/mutasi massal, penyetaraan nilai lintas kelas serta modul tambahan legacy ekstrakurikuler/evaluasi belum dinyatakan selesai seluruhnya. Pengujian beban/multi-worker, Android/iOS fisik, LAN dan produksi belum dilakukan. Tidak ada Docker/deployment produksi pada pekerjaan ini.
