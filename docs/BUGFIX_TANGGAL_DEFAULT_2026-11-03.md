# Perbaikan tanggal awal Absensi dan Nilai — 3 November 2026

Branch: `development/academic-workflows-20261031`. Lingkup hanya development `http://127.0.0.1:18125`; layanan 8085, database aktif, sumber Laravel dan penugasan legacy tidak diubah.

## Penyebab dan bukti reproduksi

Dengan akun `uji_guru`, sebelum perbaikan:

| URL | HTTP sebelum | HTTP sesudah |
|---|---:|---:|
| `/absensi` | 403 | 200 |
| `/absensi?id_jadwal=3` | 403 | 200 |
| `/absensi?id_jadwal=3&tanggal=2026-10-26` | 200 | 200 |
| `/nilai` | 403 | 200 |

Tanggal awal sebelumnya adalah hari jadwal terakhir sebelum hari ini, tanpa mempertimbangkan batas penugasan. Pada November, penugasan contoh yang hanya berlaku 26–30 Oktober menghasilkan penolakan yang benar di backend tetapi menu yang tidak dapat digunakan. URL bertanggal eksplisit berhasil karena konteksnya sesuai.

## Perubahan

- Helper bersama memilih tanggal dengan hari yang cocok, tidak mendatang, di dalam irisan rentang penugasan terverifikasi dan periode akademik.
- Absensi dan Nilai memakai helper hanya jika parameter tanggal tidak diberikan. Tanggal eksplisit tidak diganti diam-diam.
- Halaman memberi keterangan tanggal otomatis dan rentang penugasan, agar guru memeriksa konteks sebelum mengoreksi arsip.
- Bila belum ada tanggal mengajar yang telah berlangsung, halaman menampilkan pesan dan pemilih jadwal; tidak memperluas rentang atau membuat penugasan baru.
- Backend `ak_schedule()`, RBAC, otorisasi tulis, CSRF, revisi dan penyimpanan tidak dilonggarkan. Admin tetap tidak menggunakan formulir pengisian milik guru.
- Tidak ada migration atau perubahan konfigurasi database/service. Server development sudah aktif saat pemeriksaan dan tetap berjalan.

## Pengujian aktual

| Kelompok | PASS | FAIL |
|---|---:|---:|
| Batas tanggal murni: penugasan kedaluwarsa/berjalan/mendatang, kecocokan hari, batas periode, larangan tanggal default mendatang | 9 | 0 |
| Browser Chromium: menu default dan URL lama, tautan Senin dan reload/pagination, penolakan tanggal eksplisit, lintas akun/role, CSRF/file internal, lima lebar layar, logout, hash seluruh database | 8 | 0 |
| **Total** | **17** | **0** |

Screenshot browser aktual di lebar 320, 375, 430, 768 dan 1440px dibuat di direktori privat `reports/default-date-attendance-*.png`; screenshot 320px diperiksa secara visual. Tidak ada horizontal overflow halaman. Status sesi tersimpan tidak berubah setelah reload. Snapshot seluruh skema/data database development sebelum/sesudah pengujian identik. Pengujian ini tidak melakukan penyimpanan ulang absensi/nilai yang valid atau mengulang suite besar yang membuat fixture.

PHP lint untuk tiga file aplikasi dan test PHP, pemeriksaan sintaks JavaScript, serta `git diff --check` lulus.

## Mengulang tes

Jalankan dari `/home/muflih/sia-academic-dev` dengan server development aktif:

```bash
php tests/academic_default_date.php
python3 - <<'PY'
import json,pathlib,os,subprocess
s=pathlib.Path('/home/muflih/.local/state/sia-academic-dev/20261031')
c=json.loads((s/'private/runtime.json').read_text())
env={**os.environ,'PLAYWRIGHT_BROWSERS_PATH':c['PDF_BROWSERS_PATH'],'LD_LIBRARY_PATH':c['PDF_LIBRARY_PATH']}
raise SystemExit(subprocess.call(['node','tests/academic_default_date.cjs'],env=env))
PY
```

Hasil browser privat: `reports/default-date-tests.json`. Runner hanya memakai database development bernama tetap dengan socket staging, menolak lingkungan lain, tidak membuat/menghapus fixture, dan membandingkan snapshot database.

## Uji manual

Login `uji_guru`, password development `password`, lalu buka `/absensi` dan `/nilai`. Tanggal terpilih harus berada pada rentang 26–30 Oktober dan keterangan tanggal otomatis terlihat. Tautan eksplisit Senin tetap membuka 26 Oktober. Mengakses jadwal ini melalui akun guru pembanding atau memakai tanggal di luar rentang tetap ditolak. Jangan memperpanjang penugasan historis untuk menghilangkan penolakan.

## File dan pemulihan

Kode: `config/academic/attendance.php`, `academic/views/meeting.php`, `academic/views/grades.php`. Tes baru: `tests/academic_default_date.php`, `tests/academic_default_date.cjs`. Panduan simulasi diperbarui dengan catatan tanggal otomatis.

Rollback cukup membatalkan perubahan kode pada branch development setelah meninjau perubahan berikutnya. Tidak ada skema/data yang perlu di-restore. Pembatalan kode akan mengembalikan bug pemilihan tanggal; URL bertanggal eksplisit tetap menjadi jalan sementara.
