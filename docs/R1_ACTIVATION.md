# R1 — review final, aktivasi terpisah, dan rollback

Dokumen ini adalah runbook yang harus ditinjau operator. Tidak menjalankan deployment. Persetujuan pengembangan/review R1 tidak memberi izin mengubah 8085, menjalankan DDL aktif, atau menerapkan grant produksi.

## Gate sebelum aktivasi

1. Pengguna menyetujui **secara terpisah** pembuatan dua akun database baru beserta grant pada satu database aplikasi; grant akun lama tetap dipertahankan. Runtime aktif yang diperiksa masih root. Aktivasi menggunakan root tetap diblokir.
2. Operator memverifikasi candidate commit, SHA-256 archive dan setiap berkas pada `RELEASE.json`. Candidate adalah snapshot Git dengan permission read-only, bukan working tree pengguna. Salinan yang diterapkan harus dimiliki operator/root dan tidak writable oleh user layanan.
3. Admin menerima daftar 18 penugasan yang periodenya belum terverifikasi. Tidak ada akses nilai lintas periode dari penugasan NULL. Tanpa penugasan berperiode yang telah ditinjau, transaksi baru dan pembacaan nilai/rapor guru dapat diblokir. Ini dampak operasional yang harus diterima sebelum aktivasi; bukan alasan memberi akses tambahan atau backfill semua data ke periode aktif.
4. Kebijakan sementara rapor disetujui: semua periode existing default belum terbit; tidak dianggap terbit karena nilai ada. Publikasi eksplisit admin hanya gate sementara. Workflow penerbitan, persetujuan dan snapshot rapor lengkap tetap R6.
5. Backup terbaru, restore terisolasi dan jendela maintenance tersedia. Hentikan jika ada drift yang tidak dijelaskan atau backup/restore gagal. Data asli tidak boleh direset untuk meloloskan pemeriksaan.

## Paket yang disiapkan

- `RELEASE.json`: commit, baseline R0 dan hash setiap file tracked. Tidak berisi credential atau backup. Manifest tidak meng-hash dirinya sendiri; SHA archive eksternal menjadi pin artefak utuh.
- Archive candidate dan salinan read-only terpisah di state review privat. Tidak ada `git pull`, checkout atau reset pada working tree pengguna.
- Rencana privat grant/config di `activation-plan/`, dibuat oleh `ops/r1_prepare_grants.py`. Generator **tidak terhubung ke database**. SQL berisi password acak: jangan cat, commit, tempel ke laporan atau kirim melalui chat.
- Konfigurasi owner dan runtime terpisah, masing-masing mode 0600. Approval owner sengaja kosong. Runtime tidak menyimpan approval/DDL flag.
- Patch service review-only ada di state; menunjuk candidate public/router dan konfigurasi runtime baru, mempertahankan user non-root, loopback, NoNewPrivileges, UMask 0077 serta direktori log/upload privat. Belum dipasang.

## Urutan operator setelah persetujuan

Gunakan jalur candidate dan plan **yang tercantum pada laporan readiness**, bukan placeholder tanpa pemeriksaan.

1. Batasi ingress jika binding akan berubah dari loopback. Saat review, 8085 tetap 127.0.0.1. Jangan membuka ingress baru sebagai bagian R1.
2. Simpan konfigurasi systemd, konfigurasi aplikasi privat, release R0, snapshot DB lengkap dan status Git pengguna. Bekukan penulisan aplikasi selama pemeriksaan migrasi awal. Jangan membunuh semua proses PHP/MariaDB; gunakan service yang memang disetujui.
3. Ambil backup baru dengan `ops/r0_environment.py backup` pada **state baru** dan konfigurasi privat; dump snapshot tanpa lock mencakup tabel/view/trigger/routine. Restore ke instance baru socket-only, normalisasikan hanya nama database/definer salinan, dan verifikasi proyeksi seluruh kolom asli. Rehearsal final review sudah membuktikan pola ini; backup saat aktivasi tetap harus segar.
4. Buat baseline proyeksi yang tidak mengabaikan data lama ketika kolom aditif ditambahkan:

   ```bash
   python3 ops/r1_data_fingerprint.py capture --config /private/active-config.json \
     --baseline /private/new-activation/original-columns.json
   ```

5. Periksa nama akun baru belum ada. Setelah persetujuan grant terpisah, terapkan file grant privat menggunakan koneksi operator dengan database target yang telah diverifikasi. Jangan memakai `--force`, mengubah root/grant lama, atau mencabut grant lama. Jika CREATE USER gagal karena nama sudah ada, berhenti; jangan GRANT ke identitas yang belum diverifikasi.
6. Uji koneksi baru lewat file client privat. Runtime harus non-root, hanya SELECT dan INSERT/UPDATE pada tabel yang dikelola, INSERT-only audit serta DELETE terbatas `catatan_evaluasi`. Owner migration mempunyai SELECT/INSERT/CREATE/ALTER/INDEX/REFERENCES pada database aplikasi, tanpa hak administratif global. Akun runtime tidak mendapat DDL atau approval setting.
7. Setelah persetujuan aktivasi/migrasi, operator mengisi `R1_APPROVED_RELEASE` pada **konfigurasi owner**, dengan commit candidate penuh. Jangan mengisi pada konfigurasi runtime. Runner production memverifikasi seluruh hash manifest, expected database dan release yang sama sebelum koneksi migrasi:

   ```bash
   SIA_CONFIG_FILE=/private/plan/deployment-owner.json \
     php /private/candidate/ops/migrate_r1.php --check \
       --expected-database=DATABASE_YANG_DISETUJUI --production-release=COMMIT_PENUH
   SIA_CONFIG_FILE=/private/plan/deployment-owner.json \
     php /private/candidate/ops/migrate_r1.php --apply \
       --expected-database=DATABASE_YANG_DISETUJUI --production-release=COMMIT_PENUH
   ```

   Tidak memakai label testing/staging untuk melewati guard. Semua skenario production-mode pada review hanya memakai database salinan socket-only, bukan database aktif.

8. Verifikasi proyeksi kolom/data asli, seluruh FK, view/trigger/routine dan daftar perubahan skema yang direncanakan. Full schema hash memang berubah setelah migrasi; jumlah dan hash data kolom asli wajib sama sebelum lalu lintas tulis dibuka. Ledger baru dan audit kosong adalah perubahan yang direncanakan.

   ```bash
   python3 ops/r1_data_fingerprint.py verify --config /private/active-config.json \
     --baseline /private/new-activation/original-columns.json
   SIA_CONFIG_FILE=/private/plan/runtime.json \
     php /private/candidate/ops/check_r1_runtime.php \
       --expected-database=DATABASE_YANG_DISETUJUI --expected-environment=production
   ```

9. Set COOKIE_SECURE sesuai terminasi HTTPS; pada HTTP loopback tetap 0. Gunakan nama session R1 yang baru, lokasi session/security/log/upload di luar code, direktori 0700 dan file 0600. Jangan memakai session R0 untuk R1. State pembatasan login harus persisten saat restart. Verifikasi disk space dan jalur export: CSV dialirkan ke response, impor menggunakan upload temp privat; tidak ada direktori export publik baru.
10. Baru setelah seluruh gate PASS dan persetujuan deployment, pasang patch service yang telah ditinjau, reload konfigurasi, restart **service 8085 yang disetujui**, dan periksa status/binding/proses non-root. Tidak ada langkah ini yang dikerjakan saat review.
11. Jalankan HEAD/GET login/public dan blok SQL/Git/env/log/config/Adminer; periksa log fatal secara privat. Login/logout empat role memakai akun fixture khusus yang disetujui operator, CSRF, role guard, halaman admin/guru, rapor draft dan export. Jangan menciptakan akun otomatis pada login atau menggunakan akun sekolah untuk tes tulis.
12. Sebelum membuka penulisan, ulangi fingerprint data asli dan verifikasi migrasi/privilege. Sesudah ada transaksi sah baru, drift harus direkonsiliasi dengan audit; jangan menganggap semua perubahan sebagai korupsi dan memulihkan backup menimpanya.

## Rollback aplikasi

- Hentikan aktivasi/ingress tulis jika smoke test gagal. Kembalikan konfigurasi service dan release ke R0 yang disimpan, memakai konfigurasi runtime yang dapat membaca skema aditif. Tidak memindahkan document root ke root proyek.
- Ganti nama session ketika rollback; R0 tidak memakai fingerprint sesi R1. Jangan mempertahankan sesi lintas versi.
- R0 sudah diuji login/logout admin fixture, halaman admin/master, role guard, CSRF dan blok berkas pada database salinan setelah migrasi R1, dengan akun runtime terbatas. Hasil review membuktikan kompatibilitas alur baca/autentikasi tersebut; bukan izin menguji operasi destruktif R0 pada arsip aktif.
- Pertahankan kolom/tabel aditif, audit dan transaksi yang sah. Tidak ada down migration, DROP TABLE atau TRUNCATE. Jangan restore backup menimpa transaksi yang masuk setelah aktivasi.
- Setelah rollback, pertahankan pembatasan write sampai operator meninjau operasi R0 lama yang mungkin memerlukan DELETE atau tidak memeriksa periode. Jangan memberikan grant tambahan untuk meloloskan kegagalan R0.
- Pemulihan data dilakukan dari backup ke **instance baru**, lalu diverifikasi dan direkonsiliasi. Penggantian database aktif/restore in-place memerlukan rencana serta persetujuan baru.
- Jika hanya grant akun baru sudah diterapkan tetapi aktivasi belum dilakukan, biarkan akun lama dan service R0 tetap utuh; jangan otomatis menghapus akun/grant baru saat kegagalan. Catat dan minta tindakan operator terpisah.

## Batas pengujian

Regression suite normal memakai database sintetis. Rehearsal memakai salinan privat data existing untuk membuktikan migrasi tanpa perubahan historis dan rollback kode; hanya satu akun admin sintetis sementara ditambahkan untuk smoke lalu dibersihkan. Semua port rehearsal loopback dan dihentikan sesudah tes. Tidak ada akun asli dipakai untuk operasi tulis.

Playwright adalah tooling development privat. Uji viewport 320, 375, 430, 768, 1024 dan 1440px menggunakan Chromium, bukan sertifikasi semua perangkat/TLS. Workflow R2/R6, multi-server rate limiting dan deployment publik tidak dikerjakan.
