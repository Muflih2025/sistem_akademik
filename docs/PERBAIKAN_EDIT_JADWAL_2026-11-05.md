# Edit jadwal terverifikasi

Pesan lama `Jadwal terverifikasi memiliki konteks tetap. Buat jadwal baru.`
muncul setiap kali jadwal mempunyai baris penugasan, termasuk penugasan yang
belum pernah digunakan. Akibatnya jadwal yang baru dibuat dengan verifikasi
langsung pun tidak dapat dikoreksi melalui tombol Edit.

## Perilaku sekarang

- Admin dapat mengubah guru, mapel, kelas, periode, hari, jam, dan ruang pada
  jadwal yang belum mempunyai riwayat pemakaian, termasuk jadwal terverifikasi.
  Koreksi mempertahankan ID jadwal dan penetapan penugasannya. Rentang penugasan
  tetap harus sesuai periode tujuan yang terverifikasi.
- Konteks dikunci jika jadwal mempunyai pertemuan/jurnal/absensi, konteks
  guru–kelas–mapel–periode mempunyai nilai, kelas/periode mempunyai snapshot
  rapor, atau periode asal tidak aktif/terkunci/diterbitkan.
- Form menjelaskan penyebab penguncian sebelum admin mengubah data. Isian
  konteks menjadi nonaktif; status jadwal dan alasan perubahan tetap tersedia.
- **Salin ke jadwal baru** membuka form tambah dengan guru, mapel, kelas,
  hari, jam, dan ruang terisi. Periode/rentang baru mengikuti periode aktif.
  Admin memeriksa dan menyimpan form tersebut untuk menghasilkan ID serta
  penugasan baru. Jadwal sumber dan catatannya tetap tersimpan.
- Benturan jadwal diperiksa saat menyimpan jadwal aktif dan saat mengaktifkan
  kembali jadwal nonaktif. Jadwal lama tidak dapat diaktifkan bersamaan dengan
  salinannya jika guru, kelas, atau ruang bertabrakan.

Pemeriksaan riwayat dijalankan kembali pada server ketika menyimpan. Jika guru
menyimpan pertemuan setelah admin membuka form, perubahan konteks ditolak dengan
alasan riwayat tersebut. Validasi versi, kewenangan admin, jam, alasan koreksi,
dan audit tetap berlaku.

## Verifikasi

[Bukti terstruktur](evidence/TSX_SCHEDULE_EDIT_2026-11-05.json) mencatat sumber
yang diuji, hasil browser/HTTP, dan build. Pengujian memakai database sintetis
di luar repositori; file database lokal pengguna tidak dimasukkan ke commit.

| Runner | Kelompok |
| --- | ---: |
| `tests/tsx_schedule_edit.cjs` | 8 |
| `tests/tsx_complete_workflows.cjs` | 18 |
| `tests/tsx_crud_sidebar.cjs` | 15 |
| `tests/tsx_admin_button_followup.cjs` | 6 |
| `tests/tsx_shared_journal_bells.cjs` | 8 |
| `tests/tsx_responsive_portals.cjs` | 4 |

Hasil akhir: **59 kelompok lolos** dan build produksi/TypeScript berhasil.
Satu kelompok navigasi pada runner umum sempat timeout ketika beberapa server
uji dan build berjalan bersamaan. Kelompok yang sama beserta helper browsernya
dijalankan ulang setelah build selesai dan lolos; hasil awal dan pengulangan
dicatat pada bukti. Pengujian responsif juga lolos untuk 40 halaman pada enam
ukuran layar.
