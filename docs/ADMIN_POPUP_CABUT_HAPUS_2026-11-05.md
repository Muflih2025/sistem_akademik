# Popup, pencabutan penetapan, dan penghapusan admin

## Periode & Penugasan

Pada tab **Keanggotaan kelas**, form tambah hanya menawarkan siswa yang belum
terdaftar pada periode terpilih. Siswa yang sudah tercantum pada tabel tidak
ditawarkan lagi, termasuk jika berada di kelas lain dalam periode yang sama.

Tombol **Edit** dan **Cabut** kini terpisah. Cabut membuka popup konfirmasi dengan
alasan dan tanggal akhir keanggotaan. Penetapan yang belum digunakan dihapus;
penetapan yang memiliki riwayat diakhiri pada tanggal tersebut dan disimpan
sebagai arsip. Siswa kembali muncul pada pilihan form tambah. Jika terdapat
riwayat, tanggal mulai penetapan berikutnya diisi setelah tanggal akhir lama.
Nomor absen diisi dari nomor yang masih tersedia pada kelas yang dipilih.

Absensi lama tetap merujuk ke keanggotaan pada tanggalnya. Jika siswa kembali
ke kelas yang sama dalam semester yang sama, rentang yang tidak bertumpang
tindih tidak menghasilkan siswa ganda pada rekap nilai. Nilai yang sudah
tersimpan mempertahankan ID pemilik keanggotaannya.

Cabut juga tersedia untuk penugasan mengajar, Guru Piket, dan Wali Kelas.
Penugasan mengajar yang belum digunakan dapat dicabut dan ditetapkan ulang.
Penugasan yang sudah memiliki riwayat tetap disimpan; perubahan konteks baru
menggunakan jadwal baru.

## Popup dan hapus

Form tambah/edit master, jadwal, tahun ajaran, ekstrakurikuler, akun, periode,
kalender, serta jam pembelajaran menggunakan dialog modal yang bisa ditutup
dengan Batal, Tutup, atau Escape. Form pembuatan rapor, detail rapor, proses
kenaikan kelas, dan rincian audit juga menggunakan popup. Pesan gagal simpan
ditampilkan di dalam popup tanpa membuang isian. Dialog menahan fokus browser
dan gulir latar, serta menyesuaikan layar HP.

Hapus tersedia pada pengelolaan master, akun, periode/penugasan, kalender,
profil jam, dan rapor. Tindakan membutuhkan konfirmasi serta alasan dan hanya
dapat dijalankan admin. Data tanpa ketergantungan dihapus dari tabel; data
yang digunakan diarsipkan dan dihilangkan dari daftar aktif. Rapor yang dihapus
ditarik dari akses siswa, sementara payload historisnya dipertahankan.

Pada master dan penetapan, pilihan **Tampilkan data dihapus / arsip** atau
**Tampilkan penetapan dicabut / dihapus** menyediakan tombol **Pulihkan** untuk
arsip yang masih tersimpan. Pemulihan memeriksa benturan jadwal, rentang
keanggotaan, dan aturan periode berjalan. Dengan demikian periode aktif yang
diarsipkan bisa dipulihkan tanpa membuat ulang relasi akademik.

Pada **Manajemen Akun**, Tambah Pengguna, Edit akun, dan Hapus berfungsi melalui
popup. Hapus akun membatalkan sesi akun tersebut. Admin aktif terakhir tetap
dilindungi. ID numerik yang telah dihapus tidak dipakai ulang, sehingga jejak
audit dan sesi lama tidak menunjuk ke akun atau siswa lain.

Pencarian pada **Alumni** dibuat sebagai blok tersendiri dengan jarak dari tabel.

## Navbar dan sidebar seluruh peran

Header sekolah dan navbar modul berada dalam satu area tetap saat halaman
digulir. Tingginya diukur ulang saat ukuran layar atau isi navbar berubah;
sidebar mengikuti tinggi aktual tersebut, sehingga tidak tertutup atau
meninggalkan celah. Sidebar tidak lagi memaksa tinggi kosong satu layar.
Jika daftar fiturnya panjang, panel sidebar dapat digulir sendiri.

Form tambah menunggu seluruh referensi selesai dimuat. Pergantian tab master
tidak memakai referensi tab sebelumnya. Jika layanan referensi sementara gagal,
Muat ulang mengambil ulang referensi sebelum form dapat dibuka.

## Pengujian

Seluruh penulisan uji menggunakan database sintetis di luar repositori. Database
lokal pengguna tidak di-reset atau dimasukkan ke commit. Tidak ada perubahan
skema atau migrasi yang dibutuhkan; penanda arsip memakai audit yang sudah ada.

| Runner | Kelompok lolos |
| --- | ---: |
| `tsx_complete_workflows.cjs` | 18 |
| `tsx_crud_sidebar.cjs` | 15 |
| `tsx_admin_button_followup.cjs` | 6 |
| `tsx_import_report_buttons.cjs` | 5 |
| `tsx_admin_popups_delete.cjs` | 9 |
| `tsx_admin_restore.cjs` | 4 |
| `tsx_shared_journal_bells.cjs` | 8 |
| `tsx_responsive_portals.cjs` | 4 |
| `tsx_admin_navigation.cjs` | 4 |

Total **73 kelompok**, termasuk pembatalan popup, cabut/tambah ulang siswa,
kelangsungan absensi/nilai, hapus semua jenis master, hapus akun dan pencabutan
sesi, perlindungan admin terakhir, penolakan versi kedaluwarsa, rollback ketika
audit gagal, pemulihan arsip, dan larangan pemulihan yang bertabrakan. Popup
form baru diperiksa pada lebar 320, 390, 768, dan 1440 piksel; regresi portal
mencakup 40 halaman pada enam ukuran layar, termasuk posisi navbar saat gulir
dan tinggi sidebar. Pemulihan referensi juga diuji dengan simulasi respons gagal.
TypeScript dan build produksi lolos.

Bukti: [hasil terstruktur](evidence/ADMIN_POPUP_CABUT_HAPUS_2026-11-05.json).
