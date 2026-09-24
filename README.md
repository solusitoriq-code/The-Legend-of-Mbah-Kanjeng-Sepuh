# Panduan Menjalankan Materi Pembelajaran Interaktif (PWA)

Aplikasi Progressive Web App (PWA) materi pembelajaran berbasis slide interaktif dengan video latar belakang, evaluasi kuis otomatis, dan simulator 3D.

## Persyaratan Sistem
- Node.js (versi 16 atau lebih baru)
- Web Browser modern (Google Chrome, Microsoft Edge, Mozilla Firefox, atau Safari)

## Cara Menjalankan

1. Buka terminal pada direktori proyek:
   ```bash
   cd "c:\Project\solusi.toriq\Materi Interaktif"
   ```

2. Jalankan server lokal:
   ```bash
   node server.js
   ```

3. Buka browser dan akses alamat berikut:
   ```
   http://localhost:3000
   ```

## Cara Pemasangan Aplikasi (PWA Install)

- **Desktop (Chrome / Edge)**: Klik tombol "Pasang Aplikasi" di bar bagian atas atau klik ikon instalasi pada address bar browser.
- **Android**: Buka tautan di Chrome, lalu pilih "Pasang Aplikasi" atau menu browser > "Tambahkan ke Layar Utama".
- **iOS (Safari)**: Tekan tombol Bagikan (Share), lalu pilih "Add to Home Screen".

## Struktur Berkas Utama

- `index.html`: Struktur utama antarmuka slide, overlay tombol, dan container media.
- `server.js`: Server statis berbasis Node.js dengan dukungan HTTP Range untuk streaming MP4.
- `sw.js`: Service Worker untuk fungsionalitas luring (offline cache).
- `manifest.json`: Konfigurasi metadata Progressive Web App.
- `css/style.css`: Tata letak responsif 16:9 dan gaya visual.
- `js/app.js`: Logika interaksi navigasi, kontrol video, dan evaluasi.
- `js/audio.js`: Synthesizer efek suara native Web Audio API.
- `js/volcano3d.js`: Simulator visual 3D gunung berapi berbasis Canvas.
- `js/quiz-data.js`: Bank data kuis dan mini-game.
- `assets/slides/`: Aset video (`slide_1.mp4`, `slide_2.mp4`) dan gambar slide 1-16.
