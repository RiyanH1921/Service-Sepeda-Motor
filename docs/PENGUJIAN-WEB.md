# Hasil pengujian versi web

Tanggal: **20 November 2026**, zona waktu Asia/Jakarta.

## Stack yang diuji

- React 19.3.1, Vite 8.3.8, JavaScript/JSX.
- Node.js 22.14.0 dan SQLite bawaan `node:sqlite`.
- Google Chrome lokal, Playwright, tampilan desktop 1440 × 1000 dan ponsel 390 × 844.
- Versi 2.1.0 menambahkan emulasi Android pada lebar 320, 360, 390, dan 412 piksel; landscape 844 × 390; serta penyusutan viewport untuk memeriksa area keyboard.
- Pengujian memakai database SQLite di memori atau berkas sementara khusus pengujian. Database pengguna pada `data/buku-servis.sqlite` tidak diubah.

## Hasil

| Pemeriksaan | Hasil |
| --- | --- |
| Pengujian Node.js / domain / CSV / API | 21 lulus, 0 gagal |
| Alur lengkap antarmuka browser | Lulus |
| Tampilan ponsel dan formulir tanpa gulir horizontal | Lulus |
| Mode Android dan matriks tampilan ponsel (7 skenario tambahan) | 7 lulus; total seluruh suite browser 9 lulus |
| Build React produksi | Lulus |
| Sintaks pembuka / penghenti Windows | Lulus |
| Pembuka Windows dari kondisi server mati | Lulus; server aktif dan browser dibuka |

Pengujian alur browser mencakup tambah dua motor, pemisahan riwayat kendaraan, kunjungan dengan banyak pekerjaan, nota lama, pencarian OLI, hasil pencarian kosong, detail dan koreksi bengkel, pembaruan kilometer yang ditolak jika turun, pemilih komponen dengan pembatalan, status pengingat pada target kilometer, ekspor unduhan, impor identik, pembatalan impor rusak, izin notifikasi ditolak, dan pemuatan ulang halaman.

Pengujian Node.js juga memeriksa transaksi rollback saat operasi gagal, persistensi setelah server dibuka ulang, ID kunjungan pada Simpan berulang, biaya nol dan kosong, pelat unik, kutip/koma/baris baru CSV, penomoran baris fisik, konflik metadata ID, waktu notifikasi lokal, duplikasi pemberitahuan, dan sakelar notifikasi. Batas tanggal pengingat diuji pada 10, 11, dan 18 Januari serta batas kilometer 16.499 / 16.500.

Pencarian 1.000 kunjungan diuji 20 kali. Seluruh percobaan selesai di bawah satu detik; pengukuran awal mencatat maksimum **1,17 ms** untuk fungsi penyaringan dan pengurutan. Angka ini tidak mencakup jaringan atau penggambaran layar. Riwayat menggambar 30 hasil pertama dan memuat hasil berikutnya sesuai tindakan pengguna.

## Bukti dan batas verifikasi

- [Garasi desktop](screenshots/web-garasi.png)
- [Riwayat dan pencarian](screenshots/web-riwayat.png)
- [Pengingat](screenshots/web-pengingat.png)
- [Pengaturan](screenshots/web-pengaturan.png)
- [Tampilan ponsel](screenshots/web-mobile.png)
- [Formulir di layar kecil](screenshots/web-form-mobile.png)
- [Tampilan Android 390 piksel](screenshots/web-android-390.png)
- [Formulir Android layar penuh](screenshots/web-android-form-390.png)
- [Pratinjau Mode Android dari desktop](screenshots/web-mode-android.png)

Pemeriksaan Android meliputi tiga menu bawah dengan sasaran sentuh minimal 48 piksel, menu samping dan pengembalian fokus, pemilihan Kendaraan/Pengaturan, perpindahan halaman kembali ke atas, detail dari kartu riwayat, formulir tanpa gulir horizontal, isian yang tetap ada setelah viewport menyusut, serta tombol Simpan yang tetap terlihat pada area layar lebih pendek. Keyboard diperiksa melalui simulasi perubahan viewport; keyboard sistem pada perangkat Android fisik belum diuji.

Laporan interaktif Playwright tersedia setelah pengujian di `playwright-report/index.html`. Hasil Node/API dan build terakhir disimpan di `docs/evidence/web-tests.txt` dan `docs/evidence/web-build.txt`.

Dialog pemilih lokasi simpan bawaan sistem operasi tidak dikendalikan dalam pengujian otomatis; jalur unduhan browser diuji. Penerimaan notifikasi oleh sistem operasi dan perilaku izin dapat berbeda antarbrowser dan pengaturan desktop. Notifikasi saat seluruh tab ditutup berada di luar kemampuan versi web lokal ini. Belum ada pengujian pada browser HP fisik atau hosting publik.
