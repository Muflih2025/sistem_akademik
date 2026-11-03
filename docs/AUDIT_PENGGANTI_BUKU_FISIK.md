# Audit fungsi inti: pengganti tiga buku fisik

Tanggal: **4 November 2026**. Branch: `rebase-tsx`. Source yang diuji: **`95bb181`**, termasuk patch guru `d4b5a77`. Referensi: tiga foto pengguna dan `docs/ABSENSI_DIGITAL_REQUIREMENTS.md`.

**Keputusan: BELUM MEMENUHI pengganti tiga buku secara utuh.** Penyimpanan pertemuan dan absensi sesi sudah bekerja; keluaran jurnal kelas, agenda guru, serta matriks absensi pertemuan belum lengkap. Keberhasilan patch sebelumnya dan 53 pemeriksaan terfokus tidak berarti tiga dokumen ini sudah tergantikan.

Tujuan yang benar: **guru mengisi satu pertemuan melalui browser HP, lalu data yang sama dapat dibaca sebagai tiga buku tanpa mengetik ulang.** Cetak/unduh berfungsi sebagai salinan arsip bila diperlukan; bukan mengharuskan guru mengisi buku kertas lagi.

## 1. Pemetaan foto ke fungsi yang diperlukan

| Dokumen | Struktur yang terlihat pada foto | Keadaan aplikasi sekarang | Status |
|---|---|---|---|
| Jurnal Kegiatan Belajar Mengajar / jurnal kelas | Tahun ajaran, semester, hari/tanggal; baris jam ke-1–10; mapel; guru pengajar/pengganti; kegiatan/materi; jumlah hadir/tidak hadir; keterangan; paraf | Tanggal, konteks kelas/mapel/guru, materi/kegiatan dan absensi tersedia di DB. Belum ada tampilan jurnal harian kelas berbaris jam pelajaran, rangkuman hadir/tidak hadir beserta keterangan, pengajar pengganti terotorisasi, atau keluaran dokumen sesuai struktur tersebut | **Sebagian** |
| Buku Agenda Harian Guru | Mapel, kelas/program keahlian, tahun ajaran, semester; nomor, hari/tanggal, pertemuan ke-, TP/ATP/uraian materi; nama siswa tidak hadir dengan S/I/A; refleksi KBM; tindak lanjut bila diperlukan | TP/ATP, materi, refleksi, tindak lanjut, pertemuan dan konteks jadwal tersimpan. Halaman jurnal masih form/edit dan daftar ringkas materi; nama siswa S/I/A tidak muncul sebagai agenda dari data sesi yang sama. Belum tersedia tabel agenda/rentang tanggal dan keluaran khusus | **Sebagian** |
| Daftar Hadir Siswa | Kelas, program keahlian, tahun ajaran, semester; nomor absen, NIS, nama, L/P; kolom tanggal/pertemuan; simbol kehadiran; rekap S/I/A dan persentase | Input H/S/I/A/B per sesi tersimpan dengan nomor absen, NIS dan nama. Belum ada matriks sesi per mapel/pertemuan seperti buku; L/P belum dikirim oleh API roster. Matriks Piket yang ada adalah **absensi harian sekolah**, sumber yang berbeda | **Sebagian** |

Nama dan NIS pada foto tidak disalin menjadi fixture. Metadata formulir seperti nomor dokumen, revisi, tanggal berlaku dan nomor halaman perlu menjadi konfigurasi template yang disetujui sekolah; audit ini tidak menebak kode dokumen yang kurang jelas.

Catatan mengenai paraf: identitas akun pengisi, waktu, versi dan riwayat koreksi sudah menjadi dasar jejak pengisian. Belum ada tampilan/pengesahan pengganti kolom paraf yang lengkap. Jangan menggambar atau menyalin tanda tangan dari foto sebagai bukti pengesahan.

## 2. Yang terbukti bekerja dengan pengisian sungguhan

Browser Chromium digunakan untuk login guru, membuka sesi Jumat 30 Oktober 2026, memeriksa roster DB, mencentang verifikasi, menandai semua hadir, mengubah nomor 4 menjadi S dan 5 menjadi I, mengisi TP/ATP, materi, kegiatan, refleksi, tindak lanjut dan catatan, lalu menyimpan.

Hasil pada database testing:

- **Satu POST `/api/absensi`** membuat satu `ak_pertemuan` dan 20 `ak_absensi_sesi`.
- Hasil tepat **18 H / 1 S / 1 I / 0 A / 0 B**. Keterangan sakit/izin tersimpan pada sesi masing-masing.
- `ak_pertemuan` yang sama dibaca oleh API jurnal; ID dan materi cocok, tidak ada pertemuan ganda untuk membentuk jurnal kedua.
- TP/ATP, kegiatan, refleksi dan tindak lanjut tersimpan. Reload tetap menampilkan data.
- Mapel lain pada kelas sama dan kelas lain tetap belum dikonfirmasi; tidak ikut tertimpa.
- Identitas actor dan timestamp tersimpan. Audit awal berisi satu pencatatan pertemuan dan 20 pencatatan siswa.
- Absensi harian sekolah tidak ditimpa. Integritas SQLite serta hash database repository/WAL/SHM tetap sama.

Penyimpanan sudah menjadi fondasi yang tepat. Yang belum selesai adalah pemakaian data tersebut sebagai tiga dokumen sekolah, bukan membuat tiga form penyimpanan baru.

## 3. Kekurangan yang dibuktikan, beserta prioritas

### P0 — ekspor melewati izin dashboard

Guru tanpa tugas piket ditolak oleh `/api/piket` dengan **403**, tetapi `/api/export?kind=piket` memberikan **200** dan CSV. Filter kelas/tanggal pada permintaan juga tidak diterapkan pada ekspor lama; implementasi masih memakai kelas 1 dan lima tanggal Oktober tetap.

Ini mengulang temuan ekspor pada audit sebelumnya, bukan regresi yang baru disebabkan patch guru. Tetap menjadi penghalang pemakaian data sekolah. Semua keluaran harus menggunakan pemeriksaan role, penugasan, kelas, periode dan tanggal yang sama dengan tampilan. Jenis/format tidak didukung wajib ditolak, bukan diam-diam diberi keluaran lain.

### P1 — tiga keluaran belum tersedia

Pada halaman jurnal, aksi utama yang ditemukan hanya **Simpan Jurnal** dan **Buka / koreksi jurnal**. Belum ada tiga keluaran yang diminta, baik tabel digital lengkap maupun tindakan cetak/unduh khusus.

Pemeriksaan file nyata:

| Permintaan | Hasil aktual | Makna |
|---|---|---|
| Ekspor jurnal CSV | HTTP 200, `text/csv`, header `NIS,Nama Siswa,Kelas,Mata Pelajaran,Guru,Nilai Akhir,Predikat`; tidak berisi materi/TP audit | Server mengembalikan CSV nilai sebagai fallback, bukan jurnal |
| Agenda format XLSX | HTTP 200, `text/csv`, signature awal `NIS,N`; bukan ZIP XLSX `PK` | Excel agenda belum tersedia |
| Absensi format PDF | HTTP 200, `text/csv`, signature awal `NIS,N`; bukan `%PDF-` | PDF absensi belum tersedia |

HTTP 200 atau ekstensi file saja tidak membuktikan fitur ekspor selesai. Berkas respons disimpan privat dan dibaca kembali; pemeriksaan di atas menilai isi dan signature, bukan hanya tombol.

### P1 — agenda belum merangkum absensi sesi

Siswa nomor 4 Sakit dan nomor 5 Izin ada di DB, tetapi nama/status keduanya tidak muncul pada halaman agenda/jurnal. Data seharusnya diturunkan dari `ak_absensi_sesi` melalui ID pertemuan, tanpa diminta mengetik ulang nama siswa tidak hadir.

### P1 — matriks daftar hadir per pelajaran belum ada

Daftar pada buku fisik memakai kolom tanggal/pertemuan. Matriks Piket saat ini berasal dari `ak_absensi_harian`, sehingga tidak bisa dijadikan pengganti matriks absensi mapel. Perlu matriks dari **`ak_pertemuan` + `ak_absensi_sesi`**, dengan kelas/mapel/periode yang jelas, anggota yang berlaku pada tanggal itu, rekap serta persentase berpenyebut terdefinisi.

Status B wajib terpisah. Belum ada pertemuan, belum diisi, dan tidak tercatat sebagai anggota bukan bukti H atau A. Simbol tulisan tangan selain H/S/I/A pada foto tidak otomatis diterjemahkan tanpa aturan sekolah.

### P1 — guru pengganti belum menjadi alur kerja

Tidak ada kontrol guru pengganti pada form. Kolom `id_guru_pengganti` ada di skema, tetapi probe POST pada fixture mengembalikan **200** sementara nilainya tetap **NULL**: field diabaikan. Data yang tidak didukung semestinya ditolak secara jelas; dukungan penuh memerlukan penugasan pengganti yang sah, identitas pengajar sebenarnya dan audit. Jangan memberikan akses guru lain hanya agar kolom bisa diisi.

### P1 — nomor jam pelajaran belum divalidasi

POST dengan `jam_ke: "99"` diterima **200** pada fixture. Form memakai teks bebas, bahkan defaultnya jam waktu seperti `07:45–08:45`, sedangkan buku memisahkan **jam ke** dari waktu mulai/selesai. Nomor/rentang jam harus berasal dari konfigurasi jam belajar yang berlaku per hari/versi dan sesuai jadwal. Konfigurasi tetap perlu dapat dikelola Admin dengan validasi server.

### P2 — identitas dan arsip belum lengkap

- Roster sesi mengirim nomor absen, NIS dan nama, tetapi belum mengirim L/P yang diperlukan pada daftar hadir cetak.
- Ringkasan riwayat belum menampilkan rincian kegiatan, jumlah hadir/tidak hadir, pengisi/waktu, atau before/after koreksi secara lengkap.
- Belum ada template khusus dengan header dokumen, penomoran halaman, tabel lintas halaman dan pemisahan navigasi dari hasil cetak. Tombol `window.print()` pada Piket bukan bukti bahwa template ketiga buku sudah tersedia.
- Belum tersedia pembacaan agenda dan matriks sesi dalam rentang bulanan/semester yang tepat untuk kebutuhan arsip sekolah.

## 4. Harian sekolah dan sesi: jangan disamakan

Pada fixture uji, sesi yang baru disimpan berisi **18 H / 1 S / 1 I**, sedangkan sumber harian kelas masih **1 H / 1 S / 18 B**. Perbedaan ini sesuai sumber data yang berbeda; solusinya bukan menyalin otomatis sesi terakhir/pertama ke seluruh hari.

Untuk mengganti tiga buku pada foto, keluaran utama dapat langsung memakai data sesi; tidak perlu menunggu fitur rapor atau memaksakan rekonsiliasi harian.

Untuk Guru Piket, tampilkan jelas dua bagian:

1. **Absensi pembelajaran:** sesi apa yang sudah diisi, siapa pengisinya, siswa tidak hadir, kelas dan mapel terkait.
2. **Absensi harian sekolah:** keputusan harian terverifikasi, sumber bukti, perbedaan antarsesi dan status belum dikonfirmasi.

Saat ini Piket membaca rekap harian dan status pengisian jurnal, tetapi belum memiliki aksi rekonsiliasi yang dapat mengonfirmasi bukti sesi menjadi keputusan harian. Kebijakan otoritas final, keterlambatan/hadir sebagian dan konflik perlu disepakati sekolah sebelum aturan otomatis dibuat. Pengembangan tiga tampilan buku tidak perlu tertunda oleh kebijakan tersebut.

## 5. Urutan penyelesaian yang langsung mendukung tujuan pengguna

| Urutan | Hasil yang harus dibuat | Syarat dinyatakan selesai |
|---|---|---|
| 1 | Tutup bypass ekspor dan validasi jenis/format/filter | Akun yang ditolak di dashboard juga ditolak ketika mengunduh; jenis tidak didukung menghasilkan error jelas |
| 2 | Satu pintu **Isi Pertemuan / Absensi & Jurnal** | Guru memilih jadwal sah, mengisi sekali, semua data memakai ID pertemuan yang sama, koreksi terversi dan tercatat |
| 3 | Tiga tampilan baca dari sumber yang sama | Jurnal kelas per hari/jam; agenda guru per pertemuan dengan nama S/I/A; matriks sesi per tanggal/pertemuan beserta rekap; perubahan terlihat konsisten di ketiganya |
| 4 | Lengkapi pengajar pengganti, nomor jam dan identitas daftar hadir | Penugasan sah, jam tervalidasi, L/P berasal dari database; tidak ada data yang diam-diam dibuang |
| 5 | Arsip dan cetak/unduh ketiga dokumen | PDF valid yang dibuka kembali, XLSX valid yang dibaca kembali, semua baris/kolom sesuai filter dan izin; cetak tidak memuat form/navigasi |
| 6 | Pemantauan Piket/Kepsek yang dapat ditelusuri | Tahu guru/jam/kelas dan status pengisian; absensi sesi terpisah dari harian; koreksi harian hanya sesuai izin, alasan dan audit |

Ini daftar gap dan prioritas hasil audit, **bukan klaim sudah diimplementasikan**. Tidak ada redesign besar atau pembuatan fitur di luar alur inti dalam audit ini.

## 6. Uji penerimaan utama sebelum benar-benar berhenti mengisi buku

1. Guru login melalui HP, memilih jadwal/kelas/tanggal yang sah; roster sesuai DB.
2. Satu kali isi pada 20 siswa menghasilkan 18 H / 1 S / 1 I, materi, TP/ATP dan refleksi pada satu pertemuan.
3. **Jurnal kelas** menunjukkan mapel, pengajar/pengganti, jam, kegiatan, jumlah hadir 18 dan tidak hadir 2; status belum dikonfirmasi ditampilkan terpisah jika ada.
4. **Agenda guru** menunjukkan tanggal, pertemuan, TP/ATP/materi, nama siswa nomor 4 S dan 5 I, serta refleksi/tindak lanjut tanpa input ulang.
5. **Daftar hadir siswa** menunjukkan NIS/nama/L/P dan kolom pertemuan tersebut; status serta rekap sama dengan dua keluaran lain.
6. Buat pertemuan berikutnya dengan tanggal sah. Kolom baru muncul; data sebelumnya tidak tertimpa.
7. Koreksi satu status dengan alasan dan revision sesuai; ketiga tampilan berubah konsisten dan riwayat sebelum/sesudah dapat ditelusuri. Versi lama ditolak.
8. Buka mapel lain, kelas lain, periode lama/terkunci dan URL hasil unduhan secara langsung: izin dan data tetap terpisah.
9. Baca kembali PDF/XLSX yang dihasilkan; cocokkan seluruh 20 siswa dan periode/filter, bukan hanya sepuluh siswa pada pagination layar.
10. Guru Piket dan Kepsek melihat data sesuai kewenangan; “jurnal diisi” tidak diklaim sebagai bukti lokasi fisik guru.

Poin 2 pada pengisian/penyimpanan sudah terbukti. Poin 3–5 dan 9 belum lulus sebagai keluaran operasional lengkap.

## 7. Bukti dan batas pengujian

**24 pemeriksaan terfokus: 12 PASS / 12 FAIL / 0 ERROR / 0 SKIP.** FAIL mencakup kemampuan yang belum tersedia serta validasi/otorisasi yang belum benar; ini bukan 12 bug unik dan tidak menggantikan hasil 53 pemeriksaan patch guru sebelumnya.

Bukti terstruktur: [PAPERLESS_AUDIT_2026-11-04.json](evidence/PAPERLESS_AUDIT_2026-11-04.json). Runner: `tests/tsx_paperless_audit.cjs`. Test setup `--paperless` menambah 18 siswa sintetis ke dua siswa awal pada kelas uji; satu siswa kelas lain tetap menjadi kontrol isolasi. Username/password sekolah maupun nama/NIS pada foto tidak digunakan sebagai fixture.

Pengujian memakai HTTP, Chromium, isi SQLite sungguhan dan isi file respons. Server final terisolasi: `127.0.0.1:18134`; aplikasi/DB disalin ke state privat di luar Git, `~/.local/state/sia-paper-audit-20261104-final/`. Screenshot hanya memuat identitas sintetis. Database repository beserta WAL/SHM diverifikasi hash-identik sebelum/sesudah. Tidak ada DDL atau mutasi database aktif, perubahan Laravel sumber, layanan 8085, 18 penugasan legacy, migration framework, atau deployment. Source aplikasi tidak diperbaiki pada audit ini; yang ditulis hanya tes/setup fixture, evidence dan laporan. Saat laporan disusun, perubahan lain muncul pada package/dependency, autentikasi dan helper aplikasi. Perubahan tersebut dipertahankan, tidak disalin ke sandbox final dan tidak dimasukkan ke commit audit ini. Hasil berlaku untuk snapshot `95bb181` beserta hash source dalam evidence; perubahan yang sedang berlangsung membutuhkan verifikasi terpisah.

Menjalankan ulang pada direktori baru (setup menolak menimpa yang sudah ada):

```bash
python3 tests/tsx_teacher_setup.py \
  --state /tmp/sia-paper-audit-baru --port 18134 --paperless --serve
```

Terminal kedua:

```bash
SIA_PAPER_STATE=/tmp/sia-paper-audit-baru \
SIA_PAPER_URL=http://127.0.0.1:18134 \
node tests/tsx_paperless_audit.cjs
```

Browser tooling dibaca dari `SIA_BROWSER_CONFIG` atau konfigurasi Playwright lokal yang dipakai audit sebelumnya. Jika dependensi browser tidak tersedia, harus dilaporkan ERROR. Exit code 1 saat gap masih ada adalah hasil audit yang diharapkan, bukan alasan untuk mengganti pemeriksaan agar terlihat PASS.
