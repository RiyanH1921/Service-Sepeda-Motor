# Buku Servis Motor

Aplikasi Android luring untuk mencatat perawatan motor milik Riyan, berdasarkan **SRS-Buku-Servis-Android.pdf** dan **Buku-Servis-Desain-UI.pdf**. Bahasa antarmuka Indonesia; tema krem dan hijau tua mengikuti referensi. Ilustrasi motor dibuat sebagai vector drawable asli.

## Menjalankan aplikasi

1. Pasang `dist/Buku-Servis-Motor-1.0.0-debug.apk` pada perangkat **Android 10 atau lebih baru**. Android mungkin meminta izin pemasangan dari aplikasi pengelola berkas yang dipakai.
2. Buka **Buku Servis**, pilih **Tambah kendaraan**, lalu isi nama dan pelat motor.
3. Pilih **Catat servis**. Tanggal dan minimal satu pekerjaan wajib diisi; kilometer, biaya, bengkel, dan catatan opsional.
4. Gunakan **Riwayat** untuk mencari pekerjaan atau bengkel, dan **Pengingat** untuk membuat target tanggal atau kilometer.
5. Ekspor CSV melalui **Pengaturan** untuk menyimpan salinan riwayat sebelum mencopot aplikasi atau mengganti perangkat.

APK debug disediakan untuk pemasangan dan pengujian langsung. Distribusi produksi memerlukan release APK yang ditandatangani dengan keystore pemilik proyek. Jangan menyimpan keystore dan kata sandinya di repository.

## Mencoba di komputer sebelum memakai HP

Klik dua kali **`Test-Aplikasi.bat`** di folder proyek. Script akan membuka jendela emulator Android, memasang APK, dan membuka Buku Servis. Android Studio/SDK dan system image Android harus sudah tersedia; semuanya sudah ditemukan di komputer pengembangan ini. Pembukaan pertama dapat memerlukan beberapa menit.

Emulator preview memiliki data sendiri di `.preview/`. Data percobaan tetap tersedia saat emulator dibuka ulang. Jalankan kembali file yang sama untuk melanjutkan. Tutup emulator memakai tombol **X** pada jendelanya.

Coba alur berikut menggunakan mouse seperti menyentuh layar HP:

1. Tambahkan motor bernama **Vario Uji**, pelat **B 1234 UJI**, kilometer **14500**.
2. Catat **Ganti kampas rem**, tanggal **19 November 2026**, kilometer **14500**.
3. Catat nota lama **Ganti oli mesin**, tanggal **10 Agustus 2026**, kilometer **12000**. Garasi seharusnya tetap menampilkan servis 19 November.
4. Buka **Riwayat**, cari **OLI**, lalu buka dan ubah catatannya.
5. Buat pengingat target **16500 km**, lalu perbarui kilometer motor ke **16500**. Status seharusnya **Jatuh tempo**. Beri izin notifikasi saat diminta jika ingin memeriksa pemberitahuannya.
6. Coba ekspor dan impor CSV di **Pengaturan**, lalu tutup dan buka kembali aplikasi untuk memeriksa penyimpanan.

Untuk mencoba dari Android Studio, buka proyek, jalankan perangkat di **Device Manager**, lalu pilih **Run app**. APK juga dapat diseret ke jendela emulator untuk dipasang, sesuai [panduan Android Emulator](https://developer.android.com/studio/run/emulator-install-add-files).

## Fitur aplikasi

- Banyak kendaraan, pemilihan motor aktif, pelat unik tanpa membedakan spasi dan kapital.
- Satu kunjungan dengan banyak pekerjaan, tanggal, biaya rupiah bulat, bengkel, catatan, dan odometer.
- Koreksi catatan; pencarian tanpa membedakan kapital; pengelompokan riwayat menurut bulan.
- Riwayat ditampilkan bertahap per 50 hasil agar daftar panjang tetap ringan.
- Garasi menampilkan tanggal servis terbesar, lalu waktu pembuatan terbaru jika tanggal sama.
- Nota lama boleh memiliki kilometer lebih kecil. Odometer terkini hanya naik; pembaruan manual tidak boleh turun.
- Pengingat per kendaraan dan komponen, target tanggal dan/atau km, jam pemberitahuan, perubahan dan penonaktifan.
- Status **Jatuh tempo**, **Mendekati**, **Terjadwal**, dan **Perlu data km** ditampilkan sebagai teks.
- Notifikasi lokal, pemeriksaan ulang setelah reboot/perubahan waktu, dan pembukaan pengingat terkait ketika notifikasi diketuk.
- Profil lokal dan sakelar notifikasi yang tersimpan.
- Ekspor/impor CSV UTF-8 dengan pemilih berkas Android; impor transaksional dan kunjungan identik dilewati.
- Bantuan di dalam aplikasi. Instalasi awal kosong; data contoh PDF tidak dimasukkan sebagai data pengguna.

## Membuka source dan membangun

Gunakan Android Studio dengan **JDK 17–24** (di lingkungan pengembangan ini digunakan JBR 21), Android SDK Platform 35, Build Tools 35.0.1. Gradle wrapper memakai 8.14.3 dan Android Gradle Plugin 8.13.0. JDK 25 tidak cocok untuk Gradle 8.14.3.

1. Buka folder proyek ini di Android Studio.
2. Atur **Gradle JDK** ke JDK 21 atau 17, lalu lakukan Gradle Sync.
3. Jika diperlukan, buat `local.properties` dengan lokasi SDK perangkat pengembang; Android Studio dapat membuatnya otomatis. Contoh Windows: `sdk.dir=C\:/Users/NAMA/AppData/Local/Android/Sdk`.
4. Pilih perangkat atau emulator, lalu **Run app**.

```powershell
.\gradlew.bat assembleDebug testDebugUnitTest lintDebug
.\gradlew.bat connectedDebugAndroidTest
```

APK hasil build berada di `app/build/outputs/apk/debug/app-debug.apk`. Unit test report ada di `app/build/reports/tests/testDebugUnitTest/index.html`; laporan lint ada di `app/build/reports/lint-results-debug.html`.

Folder `.tools`, `.gradle-home`, dan `local.properties` hanya membantu pengujian lokal dan diabaikan Git. Jika `.tools/maven` tersedia, Gradle dapat memakai salinan cache lokal sebagai repository tambahan; instalasi normal mengambil dependency dari Google Maven/Maven Central.

## Struktur

| Berkas | Peran |
| --- | --- |
| `MainActivity.java` | Layar, formulir, navigasi, pemilih berkas Android |
| `Store.java` | SQLite privat, transaksi, pencarian, ekspor/impor |
| `Models.java` | Validasi angka/tanggal, data, aturan status pengingat |
| `Csv.java` | Parser dan penulis CSV dengan pelaporan nomor baris |
| `ReminderReceiver.java` | Notifikasi, alarm, evaluasi setelah boot/perubahan waktu |
| `IconView.java` | Ikon vektor untuk antarmuka |
| `app/src/test` | Unit test aturan domain dan CSV |
| `app/src/androidTest` | Uji SQLite dan integritas pada Android |

Database `buku-servis.db` berada di ruang privat aplikasi. Tabel: `vehicles`, `visits`, `jobs`, `visit_jobs`, `reminders`, dan `prefs`. Penyimpanan satu kunjungan serta seluruh pekerjaan dilakukan dalam satu transaksi. ID formulir dipertahankan untuk mencegah duplikasi karena Simpan berulang. Perubahan formulir servis/pengingat dipulihkan setelah pembuatan ulang Activity.

## CSV dan batasan

Urutan judul kolom harus tepat:

```csv
id_servis,id_kendaraan,nama_kendaraan,pelat,tanggal_servis,dibuat_pada,pekerjaan,odometer_km,biaya_rp,bengkel,catatan
```

Satu baris per pekerjaan. Tanggal `YYYY-MM-DD`; waktu pembuatan ISO 8601 dengan zona waktu. Teks berkoma/baris baru diberi kutip, tanda kutip digandakan. Nilai kosong berbeda dari biaya `0`. Semua baris satu kunjungan harus memiliki metadata yang sama. ID atau pelat yang bertentangan membatalkan seluruh impor. Nama dan pelat kendaraan ber-ID sama harus sesuai data tersimpan. Ukuran impor dibatasi 20 MB dan encoding harus UTF-8.

Ekspor memuat semua riwayat dan kendaraan terkait. Pengingat, profil, preferensi, dan kendaraan yang belum memiliki riwayat tidak termasuk CSV. Aplikasi tidak memakai akun, server, izin internet, pembayaran, atau sinkronisasi perangkat. Backup sistem dinonaktifkan; pengguna mengendalikan ekspor CSV.

Notifikasi tanggal menggunakan jam lokal perangkat dan alarm Android tanpa izin alarm presisi. Android dapat menunda pengirimannya saat perangkat menghemat daya. Status daftar tetap dihitung dari tanggal lokal. Target km dievaluasi ketika odometer diperbarui, servis disimpan, atau CSV diimpor. Izin notifikasi yang ditolak tidak membatasi pencatatan atau daftar pengingat. Setelah aplikasi di-force-stop, buka kembali agar alarm aktif kembali.

## Acuan teknis

- [Dokumentasi AlarmManager Android](https://developer.android.com/reference/android/app/AlarmManager) — perilaku alarm dan penghematan daya.
- [Izin notifikasi Android](https://developer.android.com/develop/ui/views/notifications/notification-permission) — izin runtime pada Android 13 ke atas.
- [Android Gradle Plugin 8.13](https://developer.android.com/build/releases/agp-8-13-0-release-notes) — toolchain build.

Lihat [catatan pengujian](docs/PENGUJIAN.md) untuk hasil aktual dan pemeriksaan lanjutan pada perangkat fisik.

Pratinjau emulator: [Garasi](docs/screenshots/preview-garasi.png), [pencarian riwayat](docs/screenshots/preview-riwayat.png), dan [pengingat](docs/screenshots/preview-pengingat.png).
