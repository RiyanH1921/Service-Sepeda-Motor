# Catatan pengujian — 19 November 2026

## Hasil yang sudah diverifikasi

| Pemeriksaan | Hasil |
| --- | --- |
| Build APK debug dan APK pengujian | Lulus |
| Unit test domain dan CSV | 13 lulus, 0 gagal |
| Suite Android utama (SQLite, notifikasi, UI) | 17 lulus, 0 gagal, 0 error |
| Izin notifikasi ditolak (pengujian terpisah) | 1 lulus |
| Tombol Simpan setelah gulir, skala teks 150% | Lulus |
| Mode pesawat selama suite Android | Aktif, terverifikasi |
| 1.000 kunjungan, 20 pencarian lokal | 20/20 di bawah 1 detik; terlama 26 ms |
| Android Lint | Lulus, 0 error; masih ada peringatan nonfatal |
| Penandatanganan APK | APK debug; verifikasi dicatat bersama artefak distribusi |

Toolchain aktual: Windows, JBR 21.0.11, Gradle 8.14.3, AGP 8.13.0, compile/target SDK 35, Build Tools 35.0.1, minSdk 29. Dependency runtime menggunakan framework Android; JUnit hanya untuk pengujian.

Unit test meliputi CSV berkoma/kutip/baris baru/BOM, nomor baris kesalahan, jumlah kolom, perbedaan kosong dan nol, angka negatif, normalisasi pelat, tanggal servis mendatang, pekerjaan kosong, batas tanggal pengingat 10/11/18 Januari, batas km 16.499/16.500, prioritas dua target, dan pembacaan km yang belum tersedia.

Bukti disimpan dalam [evidence/unit-tests.xml](evidence/unit-tests.xml) dan [evidence/lint.txt](evidence/lint.txt). Peringatan lint terkait SDK lebih baru yang tersedia, ukuran vector, constructor alat pratinjau, dan teks khusus Bahasa Indonesia tidak menggagalkan build.

## Uji Android yang disiapkan

Suite instrumentasi memakai database terpisah `instrumentation-main.db` dan `test.db`. Runner pengujian mengisolasi fixture dari `buku-servis.db` milik pengguna.

| Acuan SRS | Cakupan suite |
| --- | --- |
| U01–U02 | Dua kendaraan terpisah, nota lama, Simpan berulang, urutan waktu dibuat |
| U03 | Pencarian OLI, banyak pekerjaan hanya satu hasil, koreksi bengkel, pemisahan motor, navigasi UI |
| U04 | Biaya negatif, odometer turun, pekerjaan majemuk, simulasi gagal menyimpan relasi pekerjaan |
| U05 | Perubahan status km, satu notifikasi, penanda tersimpan, sakelar mati mempertahankan daftar |
| U06 | Batas tanggal diuji pada domain; pengiriman alarm ketika aplikasi tertutup perlu pengujian perangkat |
| U07 | CSV round trip, impor ulang tanpa duplikasi, konflik ID, rollback seluruh impor termasuk kendaraan baru |
| U08 | Persistensi setelah database dibuka ulang, 20 pencarian dengan 1.000 kunjungan, alur UI |

Hasil aktual: emulator Android 16/API 36, image `BP22.250325.006`, RAM 4 GB, dua core, tampilan 720 × 1600 dengan density 320. Suite Android utama selesai dalam 5,922 detik. Pengujian izin ditolak dan skala teks dilakukan terpisah. Pengukuran 26 ms menghitung pembacaan dan penyaringan `Store.visits`, bukan waktu menggambar seluruh layar. Riwayat menampilkan 50 hasil pertama dan menyediakan tombol untuk memuat hasil berikutnya.

Bukti: [suite Android](evidence/android-tests.txt), [izin ditolak](evidence/notification-denied.txt), [teks 150%](evidence/font-scale.txt), [performa](evidence/search-performance.txt), dan [build](evidence/build.txt). [Tangkapan layar](screenshots/preview-garasi.png) serta [formulir pada teks 150%](screenshots/preview-formulir-150.png) berasal dari emulator yang menjalankan aplikasi.

Runner utama memberikan izin notifikasi pada instalasi uji agar perilaku pengiriman dapat diperiksa. Skenario izin ditolak dijalankan terpisah pada Android 13+:

```powershell
adb shell pm revoke id.riyan.bukuservis android.permission.POST_NOTIFICATIONS
adb shell am instrument -w -e class id.riyan.bukuservis.NotificationDeniedTest id.riyan.bukuservis.test/id.riyan.bukuservis.TestRunner
```

Pengujian Android belum dilakukan pada perangkat fisik atau Android 10. Pemilih berkas Android, pengiriman alarm saat aplikasi lama tertutup, reboot, dan ketukan notifikasi masih memerlukan pemeriksaan penerimaan pada perangkat sasaran. Pengujian CSV yang lulus menguji isi berkas dan transaksi database, sedangkan pengujian notifikasi memeriksa penerimaan, PendingIntent, pencegahan duplikasi, dan sakelar.

## Pemeriksaan penerimaan pada ponsel

Jalankan pula U01–U08 dalam SRS pada perangkat fisik sasaran sebelum distribusi produksi. Catat model, RAM, versi Android, waktu, hasil, dan bukti untuk setiap kegagalan. Gunakan data contoh tanggal 10 Agustus dan 19 November 2026 setelah memastikan tanggal lokal perangkat setidaknya 19 November 2026.

- Pasang APK pada Android 10 dan perangkat utama pengguna.
- Aktifkan mode pesawat; tambah kendaraan, simpan, cari, buka detail, tutup dan buka ulang aplikasi.
- Perbesar teks ke 150%; gulir seluruh formulir hingga Simpan dapat dijangkau.
- Tolak izin notifikasi; pastikan catatan dan daftar pengingat tetap berfungsi.
- Izinkan notifikasi, uji target tanggal pada jam terpilih, reboot, dan ketuk notifikasi untuk membuka pengingat terkait.
- Uji pemilih lokasi ekspor dan berkas impor melalui penyedia berkas Android yang benar-benar digunakan.
- Ekspor sebelum mencopot aplikasi, pasang bersih, lalu impor dua kali.

Alarm memakai API Android yang tidak menjamin ketepatan menit ketika perangkat menghemat daya. Uji ketepatan penerimaan pada merek perangkat sasaran. APK produksi belum ditandatangani dengan keystore rilis pemilik proyek.
