# Ketentuan absensi digital — fase setelah fondasi penugasan/periode

> Status development 31 Oktober 2026: implementasi dan bukti fungsi terbaru dicatat pada [MATRIKS_FUNGSI_AKADEMIK.md](MATRIKS_FUNGSI_AKADEMIK.md). Catatan R1.5 di bawah tetap merupakan riwayat fase tersebut; 18 penugasan asli tidak otomatis dipetakan.

Sumber: penegasan pengguna 31 Oktober 2026. **Spesifikasi dicatat; belum diimplementasikan pada R1.5.** R1.5 tidak menambah permission Guru Piket, status baru, migration absensi atau fitur kalender. Implementasi menunggu penugasan/periode yang sah dan fondasi riwayat kelas R2, lalu fase absensi/jurnal terkait. Jangan membuka akses guru untuk mengatasi 18 penugasan yang masih PENDING ADMIN REVIEW.

## Platform dan visual

Website responsif untuk Chrome smartphone dan desktop, bukan APK/Android/iOS native. Dominan putih, teks hitam, aksi utama hitam/teks putih, kontrol ramah sentuhan. Nama/NIS/nomor absen berasal dari roster database yang berlaku pada tanggal/periode, bukan data hardcode atau urutan yang berubah tanpa riwayat.

## Guru pengajar

Login → pilih jadwal/kelas/tanggal yang diizinkan → baca roster → periksa kehadiran → **Tandai Semua Hadir setelah verifikasi** → koreksi S/I/A atau Belum Dikonfirmasi → simpan transaksi backend → baca ulang. Catat actor `users.id_user`, guru/penugasan, waktu dan seluruh perubahan. Tidak mengubah kelas lain atau periode terkunci. Batch gagal harus rollback, tidak memberi pesan sukses palsu.

Status: H Hadir, S Sakit, I Izin, A Alpa, **Belum Dikonfirmasi**. Siswa yang belum diverifikasi tidak dianggap H maupun A, termasuk ketika form baru dibuka. Alasan yang belum terverifikasi tetap Belum Dikonfirmasi. Contoh acceptance fixture: 20 siswa, nomor 4 S dan 5 I, seluruhnya telah diverifikasi → 18 H / 1 S / 1 I / 0 A / 0 belum dikonfirmasi.

## Guru Piket

Permission/penugasan tambahan pada akun guru existing, tanpa Admin penuh; cakupan tanggal/periode dan batas operasi eksplisit. Hak monitoring seluruh sekolah berbeda dari hak koreksi. Koreksi membutuhkan permission, alasan dan audit before/after; tidak memberikan hak kelola user/nilai/grant database.

Dashboard seluruh kelas; filter tanggal/kelas/jurusan/tahun; status sudah/belum mengisi dan kelengkapan verifikasi; jumlah H/S/I/A serta jumlah belum dikonfirmasi secara terpisah; daftar siswa tidak hadir/alasan; rekap siswa/kelas; riwayat input/koreksi; harian/mingguan/bulanan/semester; Excel/CSV/PDF. “Sudah disimpan” dan “seluruh siswa terverifikasi” harus dibedakan.

## Harian sekolah versus sesi pembelajaran

Wajib dua konsep terpisah. Sesi adalah bukti pertemuan sesuai jadwal/jurnal. Rekap harian sekolah mempunyai **satu record harian terverifikasi sebagai sumber resmi**, bukan menghitung semua sesi menjadi beberapa hari kehadiran.

Usulan desain untuk ditinjau pada fase domain: record harian per siswa/tanggal sekolah sebagai sumber rekap harian, ditautkan ke bukti sesi dan diverifikasi oleh permission yang sah (misalnya Guru Piket). Jangan otomatis mengambil sesi pertama/terakhir atau menganggap konflik H/S/I/A sebagai keputusan harian. Ketidaksesuaian/ketidaklengkapan tetap belum dikonfirmasi sampai rekonsiliasi dengan alasan, actor dan audit. Aturan hari parsial, batas waktu verifikasi dan otoritas final perlu persetujuan sekolah sebelum implementasi.

Unique constraint wajib mencegah duplikasi pada identitas pertemuan+siswa dan siswa+tanggal harian resmi, dengan sekolah/periode/kalender yang konsisten. Jangan memasukkan kelas sebagai cara meloloskan duplikasi harian ketika siswa berpindah kelas. Detail constraint/FK diputuskan setelah model penugasan, pertemuan dan riwayat keanggotaan siap. Tidak menebak periode arsip atau menimpa sejarah.

## Kalender, impor/ekspor dan jurnal

Kalender absensi menampilkan riwayat per tanggal. Kalender akademik adalah modul terpisah yang menghubungkan tanggal sekolah, hari efektif, hari libur dan agenda; tidak menyamakan agenda dengan bukti hadir.

Impor/ekspor Excel memakai template berversi: validasi identitas siswa, periode, tanggal, jadwal, status, alasan, akses dan duplikasi sebelum satu batch atomik. CSV/Excel formula harus aman; kesalahan tidak menggandakan atau menimpa record kelas/periode lain. Ekspor CSV/Excel/PDF dan cetak memakai filter serta permission server yang sama.

Jurnal kelas menampilkan matriks seperti buku fisik: nomor absen/NIS/nama, kolom tanggal, simbol H/S/I/A, belum dikonfirmasi yang ditandai terpisah, rekap, PDF dan Excel. Kehadiran dan materi memakai konteks pertemuan yang sama untuk jurnal/agenda; tidak membuat salinan status yang bertentangan. Hitungan harian tidak menjumlah semua sesi secara keliru.

## Acceptance/security wajib

- Guru hanya dapat memilih/menulis jadwal, kelas dan periode sah; URL/POST palsu ditolak. Guru Piket tidak memperoleh Admin penuh.
- Belum diverifikasi tidak berubah menjadi H/A saat load, simpan, impor, rekonsiliasi, laporan atau ekspor.
- Kasus 20 siswa di atas, satu siswa belum dikonfirmasi, sesi yang saling bertentangan, jadwal belum terisi, duplikasi, perpindahan kelas dan periode terkunci diuji.
- Data persist dan dapat dibaca ulang; actor/waktu/alasan/koreksi diaudit; transaksi gagal tidak menyisakan sebagian batch.
- Rekap harian dapat ditelusuri ke keputusan verifikasi dan bukti sesi. Tidak menghitung satu siswa beberapa kali karena beberapa pelajaran.
- Browser mobile/desktop dan ekspor nyata diuji; tidak membuat simulasi frontend sebagai pengganti backend.

Dokumen ini menyimpan arahan terbaru pengguna dan tidak mengaktifkan fase berikutnya otomatis.
