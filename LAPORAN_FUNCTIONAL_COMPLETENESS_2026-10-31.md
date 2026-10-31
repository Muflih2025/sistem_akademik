# Laporan penyelesaian fungsi akademik development

31 Oktober 2026. **SIAP UJI MANUAL LOKAL untuk delapan kelompok wajib.** Ini bukan aktivasi produksi dan bukan pernyataan bahwa seluruh kebutuhan data resmi/modul tambahan telah selesai.

## Checkpoint dan URL

- Branch `development/academic-workflows-20261031`, worktree `/home/muflih/sia-academic-dev`.
- Melanjutkan kode `620fa27` dan laporan `d53c95f`; tidak mengulang implementasi/reset.
- Commit kode terbaru: `31882ff8b7e020a7571fa823ba4f3b898ec069d6` (31 berkas). Laporan ini ditambahkan pada commit dokumentasi berikutnya.
- Website: **http://127.0.0.1:18125**; login: **http://127.0.0.1:18125/auth/login.php**.
- Matriks rinci: [MATRIKS_FUNGSI_AKADEMIK.md](docs/MATRIKS_FUNGSI_AKADEMIK.md).
- Panduan login, menjalankan dan uji manual: [PANDUAN_FUNGSI_AKADEMIK_LOKAL.md](docs/PANDUAN_FUNGSI_AKADEMIK_LOKAL.md).

## Hasil audit dan fungsi yang diselesaikan

README Laravel sumber menyebut autentikasi Admin, CRUD User/Jadwal/Kelas/Mapel/Guru/Siswa dan rapor. Ketentuan sekolah menambahkan jurnal bersama agenda, absensi HP/harian, piket, kalender dan aturan nilai/rapor. Audit memeriksa service, route, operasi DB dan bukti pengujian; halaman terbuka bukan bukti CRUD/persist.

| Kelompok wajib | Status development | Bukti utama |
| --- | --- | --- |
| Autentikasi dan master | Lengkap pada fixture | Browser create/read/edit/nonaktif/aktif untuk user/guru/siswa/kelas/jurusan/mapel/jadwal; verifikasi DB dan reload, HTTP invalid/role/CSRF/revocation |
| Jurnal kelas | Lengkap alur/cetak | Simpan dan koreksi pertemuan+absensi; jurnal KBM berbentuk tabel buku dan daftar hadir, PDF/Excel dibaca kembali |
| Agenda guru | Lengkap | ID pertemuan bersama; TP/ATP/materi/ketidakhadiran/pengganti/refleksi/tindak lanjut pada cetakan dan ekspor |
| Daftar hadir siswa | Lengkap | Browser kelas 20 siswa: 18 H, 1 S, 1 I, 0 A, 0 B; konfirmasi, pencarian, simpan/edit/audit/matriks |
| Guru Piket | Lengkap sesuai izin | Browser rekonsiliasi kelas baru, read-back harian dan unduh; backend cakupan tanggal/kelas/koreksi/alasan/riwayat |
| Kalender | Lengkap | Browser tambah/edit/sahkan/nonaktif; draft tidak terlihat siswa; template/preview/impor/ekspor dan aturan hari efektif |
| Nilai–wali–rapor | Lengkap alur | Browser aturan/input/edit/nilai invalid → snapshot → wali periksa → admin verifikasi/terbit → siswa baca; beda kelas/revocation/draft ditolak |
| Import/export | Lengkap untuk tujuh modul impor dan laporan terkait | CSV/XLSX nyata; commit atomik dan DB read-back; teks PDF terurai memuat NIS/nama/materi/isi laporan, bukan hanya 200/signature |

Fungsi baru/bug yang ditutup:

1. **Wali kelas terpisah dari Admin.** Penugasan kelas/periode/tanggal, CRUD/nonaktif, tidak tumpang tindih dan harus akun guru aktif. Wali hanya membaca/memeriksa rapor dalam tugasnya. Keputusan disimpan append-only dengan actor dan hash sumber/snapshot. Admin tidak dapat menerbitkan tanpa persetujuan wali yang masih sah. Pencabutan tugas membatalkan kelayakan review untuk publikasi tertunda; arsip terbit tetap disimpan. Draft versi lama juga tidak dapat melewati gate wali.
2. **Impor anggota kelas dan penugasan.** Header/template eksplisit, periode dipilih, preview tanpa DB write, validasi identitas/rentang/nomor/jam/bentrok/duplikasi, konfirmasi administratif dan commit atomik. Impor hanya membuat data baru; bukan backdoor memetakan ID penugasan legacy. Tujuh modul impor: siswa, guru, anggota, penugasan, kalender, absensi sesi, nilai.
3. **Jurnal dan agenda menyerupai struktur buku fisik.** Tabel KBM berisi tanggal/jam/pertemuan/mapel/guru/pengganti/TP-ATP/materi/kegiatan/siswa tidak hadir/catatan/tindak lanjut/paraf kosong; daftar hadir berasal dari pertemuan yang sama. Agenda memuat ketidakhadiran yang sebelumnya belum ada pada ekspor. Pengesahan tanda tangan manual tetap dibedakan dari data tersimpan.
4. **Jadwal dan laporan memakai sumber baru.** Jadwal guru/siswa berdasarkan rentang dan anggota bertanggal; supervisi nilai admin/kepsek dapat difilter dan diekspor. Pintu masuk dashboard/nilai/rapor/kalender/jadwal legacy inti dialihkan ke modul kanonik hanya saat flag development aktif.
5. **Preview lama dibatalkan pada unggahan baru yang gagal**, sehingga pengguna tidak salah menerapkan file sebelumnya. Perlindungan stale revision, CSRF, formula CSV/XLSX, duplikasi dan rollback tetap ada.
6. **Header halaman utama hitam #111111, teks putih, S2 dihapus.** Layout tidak dirombak. Palet halaman mengikuti putih-hitam. Overflow 12px dari gutter Bootstrap pada HP diperbaiki khusus breakpoint kecil. Screenshot nyata HP 320px dan desktop 1440px tersedia privat; login responsif checkpoint tetap dipertahankan.

## Pengujian akhir

| Suite | PASS | FAIL | SKIP |
| --- | ---: | ---: | ---: |
| HTTP/RBAC/CRUD | 189 | 0 | 0 |
| Kasus batas/transaksi | 50 | 0 | 0 |
| Alur tambahan dan pembacaan isi file | 47 | 0 | 0 |
| Alur browser menyimpan/edit/nonaktif/read-back | 19 | 0 | 0 |
| Browser regresi/responsive | 154 | 0 | 0 |
| Browser login/session/CSRF | 27 | 0 | 0 |
| Integritas/restore/restart/security | 127 | 0 | 0 |
| **TOTAL** | **613** | **0** | **0** |

Bukti terstruktur lengkap: [ACADEMIC_FUNCTIONAL_COMPLETION_TEST_RESULTS.json](docs/evidence/ACADEMIC_FUNCTIONAL_COMPLETION_TEST_RESULTS.json).

Skenario browser fungsi dikelompokkan per alur utuh, bukan menambah assertion tampilan berulang: simpan → query DB → reload → edit/nonaktif → validasi/izin. Browser responsive tetap diuji 320/375/430/768/1440. Kasus tambahan memeriksa wali lintas kelas GET/POST, actor review yang tidak dapat dipalsukan, penarikan tugas, draft versi lama, stale source dan izin publikasi. Seluruh suite memakai database fixture asli dan backend nyata.

PDF yang diunduh dibuka dengan pypdf 6.21.4 dan isi dibandingkan dengan identitas/konten sumber; normalisasi whitespace/ligatur font tidak mengganti data. XLSX dibaca openpyxl, NIS tetap teks, nilai/rekap numerik; CSV juga dibaca kembali. Parser PDF hanya tooling testing privat dan tidak menambah dependency runtime aplikasi. Bootstrap/Node/Chromium runtime yang sudah berfungsi dipertahankan.

Pemeriksaan integritas mencakup **88 FK tanpa orphan**, **100 berkas PHP** pada satu pemeriksaan lint kelompok, proteksi SQL/Git/config/log, privilege runtime, namespace non-root/kode read-only, restore dan restart. Pemeriksaan syntax bukan pengganti bukti fitur.

## Perubahan database dan pemulihan

Migration baru **006_homeroom_review.php**, additive pada development saja:

- `ak_wali_kelas`: FK guru/kelas/periode/user, rentang tugas, status nonaktif dan dasar penugasan.
- `ak_review_rapor`: FK snapshot/tugas/actor, keputusan/catatan/hash dan waktu; runtime hanya SELECT/INSERT.

Runtime development tetap `ak_dev_runtime_1031`, bukan root dan tanpa DDL. Hanya grant dua tabel baru di schema development yang ditambahkan; principal migration tetap terpisah. Fixture wali ditambahkan melalui CLI yang menolak DB aktif/TCP/nama lain dan tidak mereset akun/password existing. Tidak ada migration pada login.

Backup fresh dipulihkan ke database baru pada server staging socket-only. **40 tabel, 4745 baris sintetis, seluruh hash skema/data/objek cocok persis**. SHA-256 backup: `9397b001a0e692f204f5cc578098594c8a7cc50aa667cd048d46a7c92bad2b8d`. Lokasi dump/config tetap privat; laporan hanya menyimpan bukti hash. Detail operator ada pada state privat `reports/restore-latest.json`.

Restart hanya service development 18125 benar-benar dijalankan; session/login/absensi dan semua hash DB tetap. Startup salah credential diuji gagal tertutup tanpa fallback, lalu konfigurasi benar dipulihkan. Tidak ada reset DB, DROP/TRUNCATE, reverse migration atau restore di atas DB existing.

## Batas perlindungan yang diverifikasi

- Service **8085 tetap PID 372**, waktu mulai `2026-10-31 09:58:43 WIB`, konfigurasi sama; tidak direstart/dideploy.
- DB aktif tetap **23 tabel dasar, 1 view, 203 baris**; seluruh skema/data/view/trigger/routine identik. Fingerprint agregat `259ce5469f2ab4a2c5c19e38b7854bb204722b1111c9a3496b29251e49a0cdef`.
- **18 penugasan legacy** hanya dibaca untuk count/integritas, tidak dipetakan/diubah. Nilai, absensi, jurnal dan rapor asli tidak diubah.
- Hash 58 file target existing, 1.940 file sumber Laravel dan 61 file release R0 aktif sama; working tree target existing tetap dipertahankan. Tidak ada perubahan sumber Laravel, framework, Docker atau publikasi credential/backup.

## Belum selesai / bukan klaim siap produksi

- Keputusan admin dan integrasi data sekolah asli: 18 penugasan, periode/anggota historis, kalender resmi. Fixture bukan pengganti keputusan tersebut.
- Kesesuaian cetakan **persis** foto buku resmi, kebijakan kurikulum/kelengkapan/tanggal terbit serta pengesahan/tanda tangan resmi memerlukan review sekolah. Guru pengganti tercatat; hak mengedit memerlukan penugasan sendiri, bukan otomatis dari kolom nama pengganti.
- Workflow kenaikan kelas/mutasi massal dan penyetaraan nilai lintas kelas belum diselesaikan. Modul tambahan legacy ekstrakurikuler/evaluasi belum disetarakan seluruhnya dengan model baru. Keduanya ditandai **sebagian** pada matriks, tidak disebut lulus oleh suite baru.
- Uji beban multi-worker, reboot host, Android/iOS fisik dan LAN belum dilakukan. Server ini development loopback; tidak ada klaim siap server sekolah/produksi.

Daftar tersebut tidak menghalangi uji manual delapan alur inti dengan fixture lokal. Tidak ada user sekolah asli atau credential database yang digunakan sebagai akun uji.

## Akun dan menjalankan

Usernames: `uji_admin`, `uji_guru`, `uji_guru_lain`, `uji_piket`, `uji_wali`, `uji_siswa`, `uji_kepsek`. Password fixture diberikan langsung pada percakapan sesuai permintaan, tetap tersimpan privat mode 0600 pada `/home/muflih/.local/state/sia-academic-dev/20261031/private/test-accounts.json`, tidak dicetak dalam laporan/repository.

```bash
cd /home/muflih/sia-academic-dev
python3 ops/academic_server.py start
python3 tests/run_academic.py
```

Untuk contoh utama pilih XII PPLG 2 / Jumat / `2026-10-30`. Pengguna Admin menyiapkan tugas wali; Guru mengisi, Wali memeriksa, Admin menerbitkan, Siswa membaca sendiri. Panduan lengkap menjelaskan koreksi piket, impor dan pemulihan aman. Tidak perlu mengulangi setup atau mengimpor dump. Semua konfigurasi/credential/backup tetap di state privat dan namespace lokal.

## Berkas berubah pada commit kode

```
academic/index.php
academic/layout.php
academic/views/foundation.php
academic/views/grades.php
academic/views/homeroom_management.php
academic/views/homeroom_review.php
academic/views/reports.php
academic/views/schedules.php
academic/views/transfer.php
config/academic/export.php
config/academic/grades.php
config/academic/homeroom.php
config/academic/print.php
config/academic/transfer.php
config/academic/transfer_foundation.php
database/migrations/006_homeroom_review.php
docs/ABSENSI_DIGITAL_REQUIREMENTS.md
docs/ACADEMIC_LOCAL_GUIDE.md
docs/MATRIKS_FUNGSI_AKADEMIK.md
docs/PANDUAN_FUNGSI_AKADEMIK_LOKAL.md
docs/evidence/ACADEMIC_FUNCTIONAL_COMPLETION_TEST_RESULTS.json
index.php
ops/academic_completion_fixture.php
ops/academic_dev_setup.py
ops/academic_test_dependencies.py
public/index.php
tests/academic_completion_http.py
tests/academic_edges.py
tests/academic_functional_browser.cjs
tests/academic_http.py
tests/run_academic.py
```
