# Aturan Kerja AI Agent (AGENTS.md)

Pedoman komunikasi, penulisan kode, dan dokumentasi pada proyek ini:

## 1. Larangan Ikon Non-Substansial dan Alay
- Dilarang menggunakan emoji atau ikon dekoratif yang tidak memiliki nilai fungsional/substansial (seperti emoji roket, api, bintang, piala, dan sejenisnya pada judul, bullet point, atau respon chat).
- Simbol hanya diperbolehkan jika berfungsi sebagai representasi langsung elemen teknis UI atau instruksi kontrol sistem yang esensial.

## 2. Larangan Teks Berlebihan dan Terlalu Panjang
- Jawaban, penjelasan, dan dokumentasi harus ringkas, padat, dan langsung pada inti persoalan (*to the point*).
- Hindari kata pengantar basa-basi, pengulangan informasi yang sama, serta kalimat bertele-tele.
- Utamakan format teknis yang terstruktur (daftar ringkas, perintah terminal langsung, atau tabel komparasi bila diperlukan).

## 3. Standar Dokumentasi dan Kode
- Setiap instruksi kerja harus jelas dan siap dieksekusi tanpa memerlukan penafsiran ganda.
- Jaga kebersihan dan profesionalitas berkas dokumentasi maupun pesan antarmuka pengguna.

## 4. Standar Optimasi Resource dan Batasan Hosting (Vercel Free Tier)
- Wajib menggunakan format gambar web modern (WebP) dengan kompresi optimal; dilarang menggunakan aset gambar beresolusi mentah/lossless (PNG tanpa kompresi) untuk aset slide statis.
- Terapkan pemuatan bertahap (*lazy loading*): gunakan `loading="lazy"` dan `decoding="async"` pada elemen gambar slide.
- Hindari pengunduhan video otomatis di awal: video yang tidak langsung tampil di slide pertama wajib menggunakan `preload="none"` atau `preload="metadata"`.
- Service Worker (`sw.js`) hanya boleh melakukan pre-caching pada *app shell* inti. Aset media berat (gambar slide, video) wajib menggunakan strategi caching saat runtime/on-demand untuk mencegah lonjakan transfer data di awal.
- Konfigurasikan header `Cache-Control` jangka panjang (`max-age=31536000, immutable`) pada `vercel.json` untuk semua aset statis di direktori `assets/`.
- Hindari pemblokiran proses render (*render-blocking*), seperti pemanggilan `@import` font di dalam berkas CSS; gunakan `<link rel="preconnect">` dan `<link rel="stylesheet">` di dalam dokumen HTML.
- Rutin lakukan pembersihan *dead code*, berkas skrip yang tidak digunakan, serta pisahkan berkas pengujian lokal (`server.js`) dari target deployment melalui `.vercelignore`.

