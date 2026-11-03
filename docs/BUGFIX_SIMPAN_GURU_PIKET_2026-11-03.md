# Perbaikan tampilan hasil Simpan tugas Guru Piket

Development `http://127.0.0.1:18125`, branch `development/academic-workflows-20261031`, 3 November 2026.

## Penyebab

Pengguna menerima pesan berhasil tetapi isian kembali kosong. `ak_save_duty()` mengembalikan ID record yang disimpan, tetapi controller mengabaikannya dan mengalihkan kembali ke halaman fondasi tanpa parameter `piket`. View lalu membuka konteks tambah, sehingga tugas yang tersimpan tidak dimuat ke formulir. Parameter edit `piket` juga hilang setelah menyimpan perubahan. Pada validasi gagal, formulir sebelumnya tidak mempertahankan isian POST dan dapat kembali tertutup.

## Perbaikan

- Controller menggunakan ID yang dikembalikan backend, lalu mengarahkan ke periode dan tugas yang tepat dengan anchor `#tugas-guru-piket`.
- Pesan keberhasilan menyebut nomor tugas dan membedakan simpan/cabut.
- Formulir tugas yang tersimpan terbuka, memuat nilai dari database dan mempertahankan hidden ID; penyimpanan berikutnya memperbarui tugas tersebut.
- Tombol **Tambah tugas Guru Piket** membuka formulir baru secara eksplisit tanpa menulis data.
- Saat validasi gagal, isian dipertahankan, bagian tetap terbuka, dan status menyebut bahwa perubahan belum disimpan.
- Status aktif/dicabut ditampilkan; admin diberi penjelasan bahwa menyimpan tugas dicabut mengaktifkannya kembali, mengikuti perilaku backend existing.
- RBAC Admin, CSRF, validasi periode/tanggal/guru/kelas dan audit tetap menggunakan backend existing. Tidak ada pelonggaran izin atau migration.

## Pengujian aktual

`tests/academic_duty_save.cjs`: **7 PASS, 0 FAIL, 0 SKIP** pada hasil akhir.

1. Simpan melalui browser dengan fixture guru testing, baca record langsung dari database, periksa ID/redirect/nilai form, lalu reload.
2. Edit dan simpan kedua kali; ID tetap sama, jumlah tugas tidak bertambah, catatan database sesuai dan bertahan setelah reload.
3. Tanggal mulai setelah selesai ditolak 422; form tetap terbuka dan isian tidak hilang; snapshot seluruh database tidak berubah oleh permintaan invalid.
4. CSRF salah ditolak 419; guru tidak dapat memberi izin Piket melalui POST (403). Permintaan ditolak tidak mengubah database.
5. Audit mencatat identitas Admin dan perubahan; editor diuji pada 320px/1440px tanpa overflow halaman dan dibuat screenshot browser aktual. Screenshot form 320px juga diperiksa secara visual.
6. Tombol Tambah tugas membuka formulir kosong tanpa ID, tetap terbuka, dan tidak membuat record sebelum disimpan.
7. Tugas khusus regresi dicabut melalui backend aplikasi. Semua tugas existing selain fixture, semua audit lama, seluruh data pada tabel lain dan objek database dipastikan tidak berubah. Definisi kedua tabel yang menerima data tes tetap sama setelah menormalkan penghitung AUTO_INCREMENT.

Fixture menggunakan akun guru testing `uji_wali`, satu kelas contoh, tanggal 3–30 November dan **tanpa hak koreksi**. Hanya satu record fixture dibuat, kemudian digunakan kembali saat mengulang test, dan status akhirnya **dicabut**. Tidak ada akun baru atau penghapusan data/audit. Dua tabel yang menerima operasi yang diizinkan selama tes adalah `ak_tugas_piket` (fixture) dan `ak_riwayat` (audit baru). Akun runtime tetap non-root.

Hasil akhir tersanitasi ada di `docs/evidence/PIKET_SAVE_TEST_RESULTS.json`. Lint kedua file PHP, sintaks runner JavaScript dan `git diff --check` lulus. Suite besar pembuat fixture tidak dijalankan.

## Backup dan lingkup

Backup database development dibuat dengan single transaction tanpa lock; snapshot sebelum/sesudah backup identik. Lokasi/checksum backup tersimpan privat pada `reports/piket-save-backup.json` di state development. Backup tidak dimasukkan ke repository dan tidak dipulihkan di atas database existing. Fase ini tidak mengulangi restore database; bukti restore sebelumnya tetap terpisah.

File aplikasi: `academic/index.php`, `academic/views/foundation.php`. Test baru: `tests/academic_duty_save.cjs`. Panduan `docs/SIMULASI_5_HARI.md` dan `/home/muflih/sistem_akademik/test.md` diperbarui. Tidak ada perubahan layanan 8085/database aktif, sumber Laravel, penugasan legacy, grant atau skema.

## Mengulang dan uji manual

```bash
cd /home/muflih/sia-academic-dev
python3 - <<'PY'
import json,pathlib,os,subprocess
s=pathlib.Path('/home/muflih/.local/state/sia-academic-dev/20261031')
c=json.loads((s/'private/runtime.json').read_text())
env={**os.environ,'PLAYWRIGHT_BROWSERS_PATH':c['PDF_BROWSERS_PATH'],'LD_LIBRARY_PATH':c['PDF_LIBRARY_PATH']}
raise SystemExit(subprocess.call(['node','tests/academic_duty_save.cjs'],env=env))
PY
```

Runner menolak lingkungan selain database testing bernama tetap pada socket staging, memerlukan laporan backup dan menolak mengambil alih fixture yang aktif/ambigu. Gunakan hanya saat tidak sedang mengedit izin development secara bersamaan, karena pengujian membandingkan data sebelum/sesudah.

Untuk uji manual login Admin, buka **Akademik → Periode & Penugasan**, cari tugas yang sudah dibuat pada daftar **Tugas Guru Piket**, lalu klik **Edit / cabut izin**. Simpan perubahan yang diinginkan; pastikan pesan menyebut ID, URL tetap merujuk ID tersebut, form terbuka dan reload menampilkan data yang sama. Tidak perlu menambah ulang tugas sebelumnya.

Rollback cukup membatalkan commit perbaikan UI/controller di branch development setelah meninjau perubahan berikutnya. Jangan menghapus tugas/audit atau me-restore database hanya untuk membatalkan perubahan tampilan.
