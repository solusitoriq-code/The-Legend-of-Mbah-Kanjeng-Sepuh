# The Legend of Mbah Kanjeng Sepuh - Media Pembelajaran Interaktif (PWA)

Aplikasi Progressive Web App (PWA) materi pembelajaran berbasis slide interaktif dengan video latar belakang, simulasi 3D canvas, audio synthesizer, dan evaluasi kuis otomatis.

## Persyaratan Sistem
- Node.js (versi 16 atau lebih baru) untuk server lokal
- Peramban web modern (Google Chrome, Microsoft Edge, Mozilla Firefox, atau Safari)

## Menjalankan Proyek Secara Lokal

1. Buka folder proyek di peramban web modern menggunakan server statis (misalnya melalui ekstensi Live Server VS Code atau `npx serve .`).
2. Akses alamat server lokal yang ditampilkan pada peramban.

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
- Berkas pengujian dan aset internal dikecualikan dari bundle deployment melalui `.vercelignore`.

## Struktur Berkas

- `index.html`: Struktur utama antarmuka slide, overlay tombol, dan container media.
- `sw.js`: Service Worker untuk fungsionalitas luring (offline cache).
- `manifest.json`: Konfigurasi metadata Progressive Web App.
- `vercel.json`: Konfigurasi routing dan header cache pada hosting Vercel.
- `css/style.css`: Tata letak responsif 16:9, modal glassmorphism, dan animasi UI.
- `js/app.js`: Logika interaksi navigasi, drawer, gestur, engine pretest & posttest.
- `js/data-service.js`: Abstraksi data adapter lokal/online dan engine N-Gain.
- `js/quiz-data.js`: Bank data kuis dan evaluasi formatif.
- `js/audio.js`: Synthesizer efek suara native Web Audio API.
- `data/materi_evaluasi.json`: Dataset lokal (Siswa, Pretest, Posttest, Leaderboard).
- `data/materi_evaluasi.xlsx`: Dataset format Excel.
- `assets/slides/`: Aset gambar WebP slide 1-16 terkompresi optimal.

