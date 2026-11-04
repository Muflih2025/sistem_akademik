# Verifikasi ulang temuan Admin dan Guru — 4 November 2026

Pengujian memakai HTTP nyata dan Chromium pada salinan aplikasi dengan SQLite sintetis di luar repository. Setup menyalin metadata skema, bukan baris data sekolah. Hash database asli, WAL dan SHM tetap sama setelah seluruh runner terfokus di bawah dijalankan.

## Temuan pengguna

| Temuan | Hasil uji ulang |
| --- | --- |
| `/api/users` menghasilkan 500 | PASS: daftar akun memakai skema `id_user`, identitas guru/siswa sesuai referensi, hash password tidak dikirim; akses tanpa izin ditolak |
| Manajemen akun tidak dapat menambah akun | PASS: browser menambah akun, menyimpan dan membacanya setelah reload; password dihash; duplikasi, referensi tidak valid, revisi lama dan perubahan Admin aktif terakhir ditolak |
| Pilih Berkas Excel tidak bekerja | PASS: klik tombol membuka file chooser; XLSX sungguhan masuk preview; belum ada penulisan sebelum konfirmasi; data tersimpan setelah konfirmasi; token tidak dapat dipakai ulang |
| Kelola jadwal memunculkan issue yang ikut saat pindah halaman | PASS: nama mapel/guru/kelas sesuai record API; navigasi Jadwal → Master Data → Jadwal tidak menghasilkan page error, duplicate key atau hydration error |
| Penugasan guru tidak dapat disimpan | PASS: buat jadwal baru, verifikasi penugasan melalui browser, reload dan buka edit dengan nilai yang sama; akses absensi ditolak sebelum verifikasi dan diizinkan sesudahnya untuk guru terkait |
| Simpan tugas Piket | PASS: browser simpan/reload/edit, batas periode, cakupan kelas, penolakan edit revisi lama dan pencabutan akses langsung |
| Favicon 404 | Ikon aplikasi tersedia melalui `src/app/favicon.ico`; respons HTTP 200 telah diperiksa pada perbaikan ikon |
| Lima temuan Guru | Runner `tsx_teacher_flows.cjs` terbaru: **44 PASS, 0 FAIL, 0 ERROR**; jurnal Senin–Jumat, ikon gagal, mapel/nilai di buku rekap dan dashboard Piket termasuk di dalamnya |

Impor master mendukung **XLSX dan CSV sesuai template**. Berkas Excel lama `.xls` mendapat pesan penolakan yang jelas; konversikan ke `.xlsx` sebelum mengunggah. NIS berawalan nol tetap dipertahankan. Baris kedua yang tidak valid membatalkan seluruh preview, termasuk penulisan baris pertama.

## Runner yang dijalankan

- `tests/tsx_users_read.cjs` — PASS.
- `tests/tsx_users_write.cjs` — PASS.
- `tests/tsx_bulk_upload.cjs` — PASS, termasuk chooser dan upload browser.
- `tests/tsx_admin_foundation.cjs` — PASS, termasuk pencabutan tugas dan cakupan Piket.
- `tests/tsx_teaching_assignment.cjs` — PASS, termasuk verifikasi penugasan mengajar melalui browser.
- `tests/tsx_admin_schedule.cjs` — PASS, termasuk navigasi klien kembali ke jadwal.
- `tests/tsx_teacher_flows.cjs` — 44 PASS, 0 FAIL, 0 ERROR pada fixture Guru terpisah.

Typecheck `pnpm exec tsc --noEmit --incremental false`, `pnpm build` dan `git diff --check` juga PASS. Uji ini memakai Linux/Chromium dengan data sintetis; belum merupakan pengujian langsung di Windows/XAMPP milik pelapor.

## Versi dan batas bukti

Perbaikan akun dipisahkan pada `c8d2ed5` dan `af6fd64`; perbaikan jadwal pada `8ff654a`; ikon pada `4927ddd`. Implementasi bulk dan modul penugasan sudah berada pada `b005849`. Regresi tambahan penugasan dan jadwal disimpan dalam commit tersendiri; bukan diklaim sebagai implementasi baru.

Pengujian awal Guru/Admin memakai workspace berbasis `b005849`, termasuk penyesuaian label akun dan feedback yang saat itu belum dicommit. Untuk memastikan hasil Admin tidak bergantung pada perubahan tersebut, **keenam runner Admin dijalankan lagi dan PASS** pada sandbox baru dengan `src/`, `package.json` dan konfigurasi aplikasi diambil dari commit `d9aefc2`. Data fixture tetap sintetis. Runner akun menerima dua label tombol/form yang setara dan menunggu pesan sukses melalui role aksesibilitas, bukan atribut khusus komponen feedback.

Selama pengujian, perubahan lain tetap muncul bersamaan di workspace. Hasil salinan commit tersebut tidak otomatis memvalidasi setiap perubahan yang muncul kemudian; perubahan aplikasi yang belum dicommit tidak dicampurkan ke commit regresi ini.

Laporan audit awal dan laporan Guru sebelumnya merupakan catatan checkpoint historis. Tabel di atas memperbarui status temuan terfokusnya. Ini belum membuktikan seluruh fitur PHP/main setara, seluruh workflow rapor/kenaikan kelas lolos, atau constraint SQLite sudah dimigrasikan. Database sekolah tidak diubah untuk membuat pengujian lolos.

## Mencoba perbaikan

Gunakan branch `rebase-tsx`, Node.js 22+ dan pnpm. Ambil pembaruan, jalankan `pnpm install`, hentikan server development lama lalu jalankan `pnpm dev`. Buka `http://localhost:3000/auth/login` dan login kembali. Runtime ini memakai Next.js/SQLite; XAMPP tidak diperlukan. Lihat [panduan development](DEVELOPMENT.md).

Gunakan `uji_guru` untuk alur mengajar. Dashboard Piket mengikuti penugasan Piket yang aktif; akun demo `uji_piket` mempunyai penugasan tersebut. Jangan menambah hak ke akun guru sekadar untuk melewati pemeriksaan izin.
