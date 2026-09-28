# The Legend of Mbah Kanjeng Sepuh - Media Pembelajaran Interaktif (PWA)

Aplikasi Progressive Web App (PWA) materi pembelajaran sejarah berbasis slide interaktif dengan video latar, audio synthesizer native Web Audio API, simulasi kanvas, serta evaluasi kuis otomatis (Pretest & Posttest) yang terintegrasi dengan kalkulasi N-Gain dan leaderboard.

## Persyaratan Sistem

- Node.js versi 16.0.0 atau lebih baru (untuk menjalankan server dan skrip utilitas lokal)
- Peramban web modern (Google Chrome, Microsoft Edge, Mozilla Firefox, atau Safari)

## Menjalankan Proyek Secara Lokal

### 1. Instalasi Dependensi
Sebelum menjalankan server lokal atau skrip utilitas, pasang dependensi yang diperlukan:
```bash
npm install
```

### 2. Pilihan Menjalankan Server

#### Opsi A: Server Node.js Lokal (Rekomendasi - Fitur Lengkap)
Menjalankan server statis sekaligus API endpoint lokal (`/api/save-score`) untuk menyimpan hasil evaluasi siswa langsung ke berkas Excel `data/materi_evaluasi.xlsx`:
```bash
npm start
```
Akses aplikasi melalui peramban di: `http://localhost:3000`

#### Opsi B: Server Statis Murni (Live Server / `serve`)
Jika hanya ingin menguji antarmuka frontend tanpa penyimpanan lokal ke Excel:
```bash
npx serve .
```
Atau gunakan ekstensi **Live Server** pada VS Code dengan membuka berkas `index.html` lalu klik **Go Live**.
*Catatan: Pada mode ini, penyimpanan data evaluasi dialihkan ke LocalStorage peramban atau ke Google Apps Script (jika endpoint online telah dikonfigurasi).*

### 3. Skrip Utilitas Data

Proyek menyediakan beberapa skrip otomasi data pada `package.json`:
- `npm run sync:data`: Sinkronisasi data dari spreadsheet `data/materi_evaluasi.xlsx` ke berkas `data/materi_evaluasi.json`.
- `npm run sync:excel`: Mengekspor data dari `data/materi_evaluasi.json` kembali ke berkas Excel `data/materi_evaluasi.xlsx`.
- `npm run update:leaderboard`: Menghitung ulang skor total dan memutakhirkan susunan peringkat siswa pada basis data lokal.
- `npm run convert:webp`: Mengonversi dan mengompresi gambar mentah pada folder aset menjadi format WebP teroptimasi.

## Struktur Berkas dan Direktori

```
├── assets/
│   ├── icons/                  # Ikon aplikasi PWA (icon-192.png, icon-512.png, tombol navigasi)
│   └── slides/                 # Aset gambar WebP slide 0-16 yang telah dioptimasi
├── css/
│   └── style.css               # Tata letak responsif 16:9, tema glassmorphism, HUD, dan animasi
├── data/
│   ├── materi_evaluasi.json    # Basis data lokal (data siswa, soal pretest, posttest, leaderboard)
│   └── materi_evaluasi.xlsx    # Berkas spreadsheet rekapitulasi data evaluasi lokal
├── google-apps-script/
│   ├── Code.gs                 # Kode backend Google Apps Script (integrasi Google Sheets & Drive)
│   └── README.md               # Dokumentasi konfigurasi deployment Google Apps Script
├── js/
│   ├── app.js                  # Logika utama antarmuka, navigasi slide, gesture sentuh, dan kuis
│   ├── audio.js                # Synthesizer audio native (Web Audio API) untuk sound effect
│   ├── data-service.js         # Adapter data (LocalStorage, Server Lokal, Google Sheets) & N-Gain
│   └── quiz-data.js            # Bank soal kuis evaluasi materi
├── scripts/
│   ├── convert-webp.js         # Utilitas kompresi aset gambar ke format WebP
│   ├── excel-service.js        # Modul baca/tulis spreadsheet Excel pada server lokal
│   ├── sync-excel-to-json.js   # Skrip konversi dua arah Excel <-> JSON
│   └── update-leaderboard.js   # Skrip kalkulasi peringkat dan leaderboard
├── .gitignore                  # Berkas yang diabaikan oleh Git
├── .vercelignore               # Berkas yang dikecualikan dari bundle deployment Vercel
├── AGENTS.md                   # Pedoman teknis dan aturan kerja agen AI
├── index.html                  # Dokumen HTML utama antarmuka slide media pembelajaran
├── manifest.json               # Konfigurasi metadata Progressive Web App (PWA)
├── package.json                # Definisi dependensi dan skrip proyek
├── README.md                   # Dokumentasi panduan operasional proyek
├── server.js                   # Server HTTP lokal Node.js dan router API simpan nilai
├── sw.js                       # Service Worker untuk caching aset dan dukungan mode luring
└── vercel.json                 # Konfigurasi routing, cache header, dan ignore build Vercel
```

## Kontrol Navigasi

- **Keyboard**:
  - `ArrowRight` / `Space` / `PageDown`: Berpindah ke slide berikutnya.
  - `ArrowLeft` / `PageUp`: Berpindah ke slide sebelumnya.
  - `Home`: Langsung kembali ke Menu Interaktif (Slide 3).
  - `Escape`: Menutup modal dialog, drawer materi, atau menu bantuan.
- **Layar Sentuh (Mobile / Tablet)**:
  - Usap (*swipe*) horizontal ke kiri atau ke kanan untuk berpindah slide.
  - Tombol orientasi otomatis tampil pada mode portrait untuk mengunci atau menyesuaikan orientasi ke landscape.

## Pemasangan PWA (Dukungan Offline)

Aplikasi ini dapat dipasang sebagai Progressive Web App tanpa membutuhkan instalasi melalui app store:
- **Desktop (Google Chrome / Microsoft Edge)**: Klik tombol "Pasang Aplikasi" pada bilah navigasi atas (HUD) atau klik ikon instalasi pada address bar browser.
- **Android (Chrome)**: Buka tautan di peramban, lalu klik tombol "Pasang Aplikasi" di HUD atau pilih menu Chrome > "Tambahkan ke Layar Utama" / "Instal Aplikasi".
- **iOS (Safari)**: Buka aplikasi di Safari, tekan tombol "Bagikan" (ikon kotak dengan panah atas), lalu pilih "Tambahkan ke Layar Utama" (*Add to Home Screen*).

## Deployment ke Vercel

Proyek ini dirancang sebagai aplikasi web statis murni (*zero-configuration static site*) yang siap di-deploy ke Vercel.

### Metode 1: Integrasi Git (Rekomendasi)
1. Dorong (*push*) repositori lokal ke GitHub / GitLab / Bitbucket.
2. Masuk ke dashboard [vercel.com](https://vercel.com) dan pilih **Add New Project**.
3. Impor repositori proyek ini.
4. Pada konfigurasi build:
   - **Framework Preset**: Pilih `Other`.
   - **Build Command**: Kosongkan / `None`.
   - **Output Directory**: Kosongkan (menggunakan direktori root `./`).
5. Klik **Deploy**.

### Metode 2: Menggunakan Vercel CLI
1. Pasang Vercel CLI secara global:
   ```bash
   npm install -g vercel
   ```
2. Lakukan autentikasi akun:
   ```bash
   vercel login
   ```
3. Lakukan deployment preview atau produksi:
   ```bash
   # Preview deployment
   vercel

   # Production deployment
   vercel --prod
   ```

### Mencegah Re-deploy Otomatis Saat Push Dokumentasi

Untuk menghemat kuota deployment dan menit build bulanan pada akun Vercel Free / Hobby:

#### 1. Melalui Konfigurasi `vercel.json` (Otomatis)
Berkas `vercel.json` telah dilengkapi dengan perintah pengabaian build:
```json
"ignoreCommand": "git diff --quiet ${VERCEL_GIT_PREVIOUS_SHA:-HEAD^1} HEAD -- . ':!*.md' ':!.vercelignore'"
```
Ketika commit yang di-push ke branch hanya berisi perubahan pada berkas Markdown (`*.md`, seperti `README.md` dan `AGENTS.md`) atau `.vercelignore`, Vercel akan menghasilkan kode keluar `0` sehingga proses build dan deployment otomatis dibatalkan (*skipped*).

#### 2. Melalui Pesan Commit Git
Sertakan tag `[skip ci]` atau `[skip vercel]` pada pesan commit saat melakukan push perubahan dokumentasi:
```bash
git commit -m "docs: perbarui panduan README dan AGENTS [skip ci]"
git push origin main
```
Tag ini secara bawaan memerintahkan sistem CI Vercel untuk tidak memicu proses deployment.

#### 3. Melalui Pengaturan Dashboard Vercel (Opsional)
Jika ingin mengonfigurasi tanpa `vercel.json`:
1. Masuk ke **Settings** > **Git** pada dashboard proyek di Vercel.
2. Temukan bagian **Ignored Build Step**.
3. Pilih opsi **Custom** dan masukkan perintah:
   ```bash
   git diff --quiet ${VERCEL_GIT_PREVIOUS_SHA:-HEAD^1} HEAD -- . ':!*.md' ':!.vercelignore'
   ```
4. Klik **Save**.
