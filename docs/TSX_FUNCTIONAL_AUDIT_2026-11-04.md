# Audit fungsi migrasi PHP → TypeScript — 4 November 2026

Branch `rebase-tsx`, commit awal `3d13bf9`; pembanding PHP `main` adalah
`6f2d097`. Migrasi belum setara secara fungsi dengan PHP meskipun build berhasil.

Selama audit, **perubahan aplikasi muncul secara bersamaan di workspace**.
Audit ini tidak menulis perubahan aplikasi tersebut; satu perbaikan deklarasi
tipe `gradeRows()` ditambahkan saat build terbaru menemukan akses `id/id_aturan`
yang tidak tercakup pada tipe inferensi. Typecheck dan build kembali PASS.
Karena itu hasil di bawah
memisahkan commit awal dan salinan setelah perubahan backend, bukan menganggap
semua kegagalan awal masih berlaku pada workspace yang terus berubah.

## Verifikasi nyata

| Pemeriksaan | Hasil |
| --- | --- |
| `pnpm exec tsc --noEmit --incremental false` | PASS |
| `pnpm build` | PASS |
| Commit awal: HTTP dan Chromium | 46 pemeriksaan: 11 PASS, 35 FAIL, 0 ERROR runner |
| Salinan setelah perubahan backend: HTTP dan Chromium | 26 pemeriksaan: 15 PASS, 11 FAIL, 0 ERROR runner |
| Pemeriksaan ulang GUI guru setelah refresh source | 7 PASS, 0 FAIL, 0 ERROR runner |
| Hash database asli beserta WAL/SHM | Sama setelah kedua pengujian |

Angka tersebut adalah pemeriksaan terfokus, bukan jumlah bug unik dan bukan
pengujian seluruh fitur PHP. Lima ukuran layar pada pengujian awal adalah
320/375/430/768/1440 px. Header dan tombol keluar tetap terlihat di kelimanya.

Semua penulisan tes menggunakan database **sintetis**, terdiri dari tiga siswa,
dua guru, dua kelas, tiga jadwal dan akun uji dengan password acak. Skema diambil
tanpa menyalin baris sekolah. Server uji hanya di `127.0.0.1:18129` dan `18130`.

Bukti rinci, hasil per pemeriksaan dan hash source salinan kedua tersedia dalam
[JSON audit](evidence/TSX_FUNCTIONAL_AUDIT_2026-11-04.json).

## Temuan yang masih terkonfirmasi pada salinan kedua

| Prioritas | Fungsi dan sumber | Bukti / akibat |
| --- | --- | --- |
| P0 | Ekspor nilai — [`api/export`](../src/app/api/export/route.ts) | Siswa mendapat HTTP 200 dan CSV berisi NIS siswa lain. Query ekspor tidak dibatasi identitas siswa atau penugasan guru. |
| P0 | Master — [`api/master`](../src/app/api/master/route.ts) | Siswa dapat membaca seluruh tiga siswa fixture, termasuk kelas lain. Login saja belum membatasi izin modul/record. |
| P0 | Rapor draft — [`api/rapor`](../src/app/api/rapor/route.ts) | Siswa membaca snapshot miliknya yang masih draft, HTTP 200. Pemeriksaan NIS belum memeriksa status terbit. |
| P0 | Logout — [`PortalLayout`](../src/components/PortalLayout.tsx) | Tombol hanya membuka halaman login; sesudah diklik, API jadwal tetap HTTP 200 dengan cookie yang sama. |
| P1 | Akun — [`api/users`](../src/app/api/users/route.ts) | HTTP 500 `no such column: id`. Query memakai `id/nama/nip_nis/kelas/is_active`, sedangkan tabel memiliki `id_user/username/password/role/id_referensi/status/created_at`. Endpoint juga tidak memeriksa autentikasi. Ini memengaruhi layar akun Admin dan posisi guru Kepsek. |
| P1 | Penugasan Piket — [`admin/penugasan`](../src/app/admin/penugasan/page.tsx) | Tombol menampilkan sukses tanpa POST; jumlah tugas tetap nol dan nilai form kembali setelah reload. |
| P1 | Penerbitan rapor — [`admin/nilai`](../src/app/admin/nilai/page.tsx) | Tombol hanya menampilkan alert; status snapshot tetap draft. |
| P1 | Rapor siswa — [`siswa/rapor`](../src/app/siswa/rapor/page.tsx) | Akun fixture NIS `9000001` tetap melihat identitas hardcode NIS `10293` dan label “Rapor Terbit & Terverifikasi” meskipun database masih draft. |

Temuan tambahan dari salinan awal yang file sumbernya belum berubah pada saat
penyusunan laporan:

- Bulk upload belum memiliki `input[type=file]`; POST master menghasilkan 405.
- Kalender mengabaikan parameter `bulan`; permintaan November juga mengembalikan
  agenda Oktober. Halaman kalender menggunakan daftar agenda hardcode.
- Mengganti password belum membatalkan token lama; HTTP API tetap 200.
  [`auth.ts`](../src/lib/auth.ts) masih memakai fallback secret di source dan
  belum mengikat token pada versi/password sesi. Role sudah diperbarui dari DB
  oleh perubahan yang muncul selama audit; itu perbaikan yang berbeda.
- [`README`](../README.md) masih mengarahkan pengguna menjalankan PHP/MariaDB,
  padahal `pnpm dev` pada branch ini menjalankan Next.js dengan SQLite.

## Perbaikan backend yang sudah terbukti pada salinan kedua

Penulisan absensi sudah menggunakan pertemuan dan `ak_absensi_sesi`, disimpan
bersama jurnal dalam satu transaksi. Daftar siswa pada sesi baru memuat dua
siswa fixture dengan status B; penyimpanan H/S bertahan setelah reload dan tidak
mengubah tabel absensi harian. Versi lama ditolak HTTP 409. Trigger kegagalan
sintetis pada siswa kedua membuktikan rollback pertemuan, absensi dan audit.

Penulisan nilai sudah menciptakan record baru, membatasi penugasan, memakai
aturan versi dan menolak input nonangka. Nilai periode lain tetap 60 setelah
nilai periode sekarang disimpan 80. Guru tidak dapat menulis jadwal guru lain.
Jadwal guru sudah dibatasi penugasannya, akses Piket tanpa login ditolak, redirect
`/piket` ke dirinya sendiri telah dihapus, dan menu Kepsek sudah memakai role yang
sesuai. Ini bukti uji backend terfokus, belum pernyataan seluruh migrasi selesai.

## Batas hasil saat kode berubah bersamaan

Salinan kedua masih mempunyai kegagalan kontrak pada GUI absensi dan nilai.
**Setelah salinan dibuat**, enam halaman guru/Piket dan empat komponen akademik
baru berubah di workspace. Kegagalan GUI pada salinan kedua tidak boleh langsung
dianggap berlaku pada halaman baru tersebut. Daftar file dan hash source dicatat
dalam JSON audit supaya versi yang diuji dapat dibedakan dari workspace akhir.

GUI baru kemudian disalin ke sandbox dan diuji lagi bersama helper akademik
terbaru. Tujuh pemeriksaan tambahan **PASS**: roster absensi tampil, simpan
absensi HTTP 200, status bertahan setelah reload, komponen nilai tersimpan tampil,
simpan nilai HTTP 200, nilai bertahan setelah reload, dan nama mapel jadwal tampil.
Dengan demikian, dua kegagalan GUI absensi/nilai dari salinan kedua telah
tergantikan oleh bukti PASS untuk halaman terbaru tersebut. Pengujian ulang ini
juga menggunakan header Origin dari browser; pemeriksaan HTTP tanpa Origin saja
tidak cukup untuk membuktikan form browser dapat disimpan.

Skema SQLite yang diperiksa memiliki 45 tabel, hanya dua tabel ber-primary-key,
tanpa index dan tanpa foreign key. Perubahan backend menambahkan validasi pada
aplikasi, tetapi belum memulihkan constraint database hasil migrasi. Data asli
tidak di-reset, diberi index, atau dibersihkan dalam audit ini. File database,
WAL dan SHM juga masih tercatat oleh Git.

## Urutan pekerjaan berikutnya

1. Tutup akses master, ekspor dan rapor draft; implementasikan logout dan
   pembatalan sesi yang benar.
2. Selaraskan query/DTO akun dengan skema dan tambahkan otorisasi endpoint.
3. Implementasikan penyimpanan penugasan, publikasi rapor serta impor sebagai
   operasi server yang dibuktikan dengan reload dan isi database.
4. Verifikasi lagi halaman baru setelah perubahan workspace selesai, kemudian
   uji regresi lintas peran dan data beberapa periode.
5. Pulihkan integritas skema melalui migrasi terkontrol, dan perbarui README
   dengan prosedur Next.js/SQLite yang benar.

## Menjalankan ulang

Setup sudah mendukung `--state` dan `--port`, menolak menimpa salinan existing,
dan menolak direktori state di dalam repository. Contoh dengan direktori baru:

```bash
python3 tests/tsx_review_setup.py --state /tmp/sia-tsx-review-baru --port 18130 --serve
```

Terminal kedua:

```bash
SIA_REVIEW_STATE=/tmp/sia-tsx-review-baru \
SIA_REVIEW_BASE=http://127.0.0.1:18130 \
node tests/tsx_current_review.cjs
```

Runner memakai konfigurasi Playwright lokal yang sama dengan audit sebelumnya;
lokasinya dapat diganti melalui `SIA_BROWSER_CONFIG`. Konfigurasi memuat
`PDF_PLAYWRIGHT_PATH`, `PDF_BROWSERS_PATH`, dan `PDF_LIBRARY_PATH`. Browser tidak
dipasang otomatis. Exit code 1 berarti ada pemeriksaan FAIL; 2 berarti runner
ERROR. Tidak dilakukan merge, push, deployment, atau perubahan database sekolah.
