# The Legend of Mbah Kanjeng Sepuh - Media Pembelajaran Interaktif (PWA)

Aplikasi Progressive Web App (PWA) materi pembelajaran berbasis slide interaktif dengan video latar belakang, simulasi 3D canvas, audio synthesizer, dan evaluasi kuis otomatis.

## Persyaratan Sistem
- Node.js (versi 16 atau lebih baru) untuk server lokal
- Peramban web modern (Google Chrome, Microsoft Edge, Mozilla Firefox, atau Safari)

## Menjalankan Proyek Secara Lokal

1. Salin repositori atau buka terminal pada direktori proyek:
   ```bash
   git clone https://github.com/solusitoriq-code/The-Legend-of-Mbah-Kanjeng-Sepuh.git
   cd The-Legend-of-Mbah-Kanjeng-Sepuh
   ```

2. Jalankan server lokal:
   ```bash
   node server.js
   ```

3. Buka browser dan akses alamat berikut:
   ```
   http://localhost:3000
   ```

## Kontrol Navigasi

- **Keyboard**:
  - `ArrowRight` / `Space` / `PageDown`: Slide berikutnya
  - `ArrowLeft` / `PageUp`: Slide sebelumnya
  - `Home`: Kembali ke Menu Interaktif (Slide 3)
  - `Escape`: Menutup modal, drawer, atau menu popover HUD
- **Sentuh / Mobile**:
  - Geser (swipe) horizontal ke kiri/kanan untuk berpindah slide
  - Tombol rotasi orientasi (90° / 270°) otomatis aktif saat layar berada pada mode portrait

## Pemasangan PWA (Offline Support)

- **Desktop (Chrome / Edge)**: Klik tombol "Pasang Aplikasi" di HUD atas atau melalui ikon instalasi pada address bar browser.
- **Android (Chrome)**: Buka tautan di browser, lalu pilih tombol "Pasang Aplikasi" pada HUD atau menu browser > "Tambahkan ke Layar Utama".
- **iOS (Safari)**: Tekan menu "Bagikan" (Share) > "Add to Home Screen".

## Deployment (Vercel)

Proyek ini telah dikonfigurasi untuk hosting statis di Vercel:
- Konfigurasi cache (`Cache-Control: immutable` untuk aset statis) tercantum di `vercel.json`.
- Berkas server lokal dan pengujian dikecualikan dari bundle deployment melalui `.vercelignore`.

## Struktur Berkas

- `index.html`: Struktur utama antarmuka slide, overlay tombol, dan container media.
- `server.js`: Server statis lokal berbasis Node.js dengan dukungan HTTP Range untuk streaming video MP4.
- `sw.js`: Service Worker untuk fungsionalitas luring (offline cache).
- `manifest.json`: Konfigurasi metadata Progressive Web App.
- `vercel.json`: Konfigurasi routing dan header cache pada hosting Vercel.
- `css/style.css`: Tata letak responsif 16:9, HUD mobile, dan animasi UI.
- `js/app.js`: Logika interaksi navigasi, drawer, gestur, dan evaluasi.
- `js/audio.js`: Synthesizer efek suara native Web Audio API.
- `js/volcano3d.js`: Simulator visual 3D gunung berapi berbasis Canvas.
- `js/quiz-data.js`: Bank data kuis dan mini-game formatif.
- `assets/slides/`: Aset video (`slide_1.mp4`, `slide_2.mp4`) dan gambar slide WebP (1-16).
