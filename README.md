# Buku Servis Motor — React + Node.js

Aplikasi web untuk mencatat servis motor pribadi. Tampilan memakai **React**, proses penyimpanan memakai **Node.js**, dan data tersimpan di **SQLite**. Semua penggunaan utama berjalan di browser komputer, dengan label Bahasa Indonesia dan tampilan yang menyesuaikan layar kecil.

## Cara paling mudah mencoba

Klik dua kali **`Test-Aplikasi.bat`**. Browser akan terbuka ke:

**http://localhost:3000**

Pada halaman pertama, pilih **Coba data contoh** untuk melihat isi garasi, riwayat, dan pengingat tanpa mengetik semua data. Pilih **Tambah kendaraan** untuk mulai dengan data Anda sendiri. Data contoh hanya dapat dimuat saat garasi masih kosong.

File pembuka akan memakai server yang sudah aktif atau membangun tampilan dan menjalankan server Node.js di latar belakang. Untuk menghentikan server yang dibuka file tersebut, jalankan **`Stop-Aplikasi.bat`**. Menutup tab browser tidak menghapus data.

### Mode Android

Klik dua kali **`Test-Android.bat`** atau buka **http://localhost:3000/?mode=android**. Anda juga dapat menekan tombol **Mode Android** di bagian atas tampilan desktop.

Pratinjau menampilkan aplikasi dalam layar ponsel dengan pilihan ukuran **360 × 800**, **390 × 844**, atau **412 × 915**. Data yang dipakai sama dengan garasi desktop. Klik, ketik, dan gulir langsung di dalam layar tersebut. Untuk kembali, pilih **Tampilan desktop**.

Pada browser Android dengan layar kecil, tata letak ponsel diterapkan otomatis: tiga navigasi utama di bawah, kartu riwayat tanpa tabel yang melebar, serta formulir layar penuh dengan tombol Simpan tetap di bagian bawah. Kendaraan dan Pengaturan dapat dibuka melalui menu; tombol profil juga membuka Pengaturan. Formulir mengikuti tinggi area layar yang tersedia saat keyboard terbuka.

Komputer membutuhkan **Node.js 22.13 atau lebih baru**. Node.js 22.14 sudah tersedia dan digunakan saat pengujian proyek ini. Paket ZIP menyertakan tampilan siap pakai di `web-dist`, sehingga launcher dapat berjalan tanpa mengunduh dependency. Internet dibutuhkan saat memasang dependency untuk mengembangkan atau membangun ulang source React.

## Menjalankan dari terminal

Buka terminal pada folder proyek:

```powershell
npm.cmd ci --offline=false --cache .npm-cache
npm.cmd run dev
```

Buka **http://localhost:3000**. Perubahan komponen React dan CSS langsung diperbarui. Hentikan mode pengembangan dengan **Ctrl+C** pada terminal. Jika mengubah kode server, jalankan ulang proses Node.js.

Untuk menjalankan hasil build:

```powershell
npm.cmd run build
npm.cmd start
```

Di terminal non-Windows, gunakan `npm` menggantikan `npm.cmd`. Port bawaan adalah 3000; variabel lingkungan `PORT` dapat mengubahnya. Server hanya mendengarkan koneksi lokal komputer ini.

## Fitur

- Banyak kendaraan dengan pelat unik, pilihan kendaraan aktif, serta pembaruan kilometer.
- Satu kunjungan dengan satu atau banyak pekerjaan, tanggal, kilometer, biaya, bengkel, dan catatan.
- Riwayat yang dikelompokkan menurut bulan; pencarian pekerjaan atau bengkel tanpa membedakan huruf besar.
- Detail dan koreksi catatan. Menambahkan nota lama mempertahankan servis terbaru di Garasi.
- Kilometer manual tidak boleh turun; kilometer pada nota lama boleh lebih kecil. Biaya kosong berbeda dari Rp0.
- Pengingat per komponen dengan target tanggal dan/atau kilometer, waktu pemberitahuan, status tertulis, perubahan, dan penonaktifan.
- Profil lokal, pilihan notifikasi browser, panduan penggunaan, serta ekspor/impor CSV yang kompatibel dengan format Android sebelumnya.
- Transaksi SQLite: impor yang rusak dibatalkan seluruhnya. Impor ulang catatan identik tidak membuat duplikat.
- Formulir mempertahankan isian saat validasi atau penyimpanan gagal. ID kunjungan tetap sama ketika Simpan dicoba ulang.

## Mencoba alur utama

1. Tambahkan **Vario Uji**, pelat **B 1234 UJI**, kilometer **14500**.
2. Catat **Ganti kampas rem**, tanggal **19 November 2026**, kilometer **14500**.
3. Catat nota lama **Ganti oli mesin**, tanggal **10 Agustus 2026**, kilometer **12000**. Garasi tetap menampilkan servis tanggal 19 November.
4. Di **Riwayat servis**, cari **OLI**, buka hasilnya, dan ubah nama bengkel.
5. Buat pengingat **Oli mesin** pada target **16500 km**. Perbarui kilometer motor menjadi **16500**; status berubah menjadi **Jatuh tempo**.
6. Ekspor CSV, lalu impor kembali. Kunjungan identik dilewati. Coba CSV rusak dan periksa bahwa jumlah kunjungan tidak berubah.
7. Muat ulang halaman atau tutup dan buka kembali aplikasi. Data tetap tersedia.

## Penyimpanan dan notifikasi

Database berada di **`data/buku-servis.sqlite`**, dengan berkas pendamping SQLite WAL/SHM saat server berjalan. Satu tabel `app_state` menyimpan dokumen profil, kendaraan, kunjungan, dan pengingat dalam transaksi atomik. Folder `data` diabaikan Git dan tidak disertakan dalam ZIP source.

Ekspor CSV melalui Pengaturan untuk membuat salinan riwayat. CSV memuat seluruh kunjungan dan kendaraan terkait, satu baris per pekerjaan. Pengingat, profil, dan kendaraan tanpa kunjungan tidak termasuk CSV. Ukuran impor maksimal 20 MB dan encoding harus UTF-8. Koma, kutip, serta baris baru didukung. Jika browser mendukung pemilih lokasi simpan, lokasi ekspor dapat dipilih; browser lain mengunduh berkas sesuai pengaturan unduhannya.

**Notifikasi browser bekerja selama aplikasi terbuka dan izin diberikan.** Browser tidak menggantikan penjadwal notifikasi Android ketika seluruh tab ditutup. Daftar dan status pengingat tetap tersedia walaupun izin ditolak atau notifikasi dimatikan. Tanggal dan waktu pengingat memakai Asia/Jakarta.

Aplikasi ini memakai satu profil lokal, tanpa login atau sinkronisasi antarkomputer. Database tersimpan pada komputer yang menjalankan server. Versi ini disiapkan untuk pengujian dan pemakaian lokal; hosting publik belum dikonfigurasi.

## Struktur project

| Folder / file | Isi |
| --- | --- |
| `src/` | Antarmuka React, formulir, komponen, dan CSS responsif |
| `shared/domain.js` | Validasi, aturan kendaraan/servis/pengingat, pencarian |
| `shared/csv.js` | Parser, ekspor, dan validasi impor CSV |
| `server/` | HTTP API Node.js, transaksi dan penyimpanan SQLite |
| `tests/` | Pengujian Node.js, API, dan alur browser Playwright |
| `scripts/` | Pembuka dan penghenti server lokal Windows |
| `public/` | Aset ikon lokal |
| `web-dist/` | Hasil build React; dibuat oleh `npm run build` |
| `legacy/android/` | Arsip implementasi Java sebelumnya |

Source utama sudah memakai JavaScript/JSX. Referensi PDF tetap tersedia di folder utama. Implementasi Java disimpan di arsip agar hasil kerja sebelumnya tetap tersedia.

## Pengujian

```powershell
npm.cmd test
npm.cmd run test:browser
npm.cmd run build
```

Pengujian browser memakai Google Chrome yang terpasang di lokasi standar Windows. Untuk lokasi berbeda, tetapkan `CHROME_PATH`; jika Chrome belum ada, pasang browser Playwright dengan `npx playwright install chromium`. Pengujian memakai database di memori, terpisah dari data pribadi pada port 3000.

Lihat [hasil pengujian web](docs/PENGUJIAN-WEB.md), [pratinjau desktop](docs/screenshots/web-garasi.png), dan [pratinjau ponsel](docs/screenshots/web-mobile.png).
