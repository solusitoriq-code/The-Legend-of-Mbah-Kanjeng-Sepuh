# Roadmap Implementasi Fase 3 - 7: Sistem Evaluasi & Leaderboard

Dokumen ini memuat spesifikasi teknis dan panduan pengerjaan untuk melanjutkan implementasi Fase 3 hingga Fase 7 pada sesi kerja berikutnya.

---

## Ringkasan Progres Sebelumnya
- **Fase 1 (Selesai)**: Modul `js/data-service.js` telah dibuat menggunakan pola adapter yang membaca data lokal `data/materi_evaluasi.json` dan siap dialihkan ke Google Sheets melalui satu konfigurasi `CONFIG.MODE`.
- **Fase 2 (Selesai)**: Antarmuka Splash Screen telah dilengkapi dengan form input NISN, pengecekan ketersediaan data siswa secara asinkron, kartu identitas siswa, serta tombol mulai Pretest.
- **Fase 3 (Selesai)**: Modul & Engine Pretest (5 soal pilihan ganda) telah diimplementasikan penuh. Meliputi markup dialog modal interaktif `#pretest-modal`, visualisasi kartu soal dan 4 tombol opsi responsif, engine kalkulasi nilai (skala 0-100), penyimpanan skor diagnostik ke `localStorage` melalui `dataService.savePretestScore()`, layar hasil skor, serta opsi kerjakan ulang di Splash Screen.
- **Fase 4 (Selesai)**: Penguncian & Guided Navigation Slide Materi (Slide 1–14). Tombol hotspot "6. Kuis Interaktif" di Slide 3 dikunci dengan badge visual gembok dan animasi getar; item Slide 15 & 16 di Drawer navigasi dinonaktifkan dengan badge status `🔒 Terkunci`; pelacak progres `maxSlideVisited` aktif merekam pencapaian belajar siswa; Slide 15 terbuka otomatis saat tiba di Slide 14; materi Slide 1–14 dioptimalkan menjadi slide statis web murni tanpa beban video MP4 maupun eksternal AR Sketchfab.
- **Fase 5 (Selesai)**: Modul & Engine Post-test Dinamis (15 Soal: 10 MCQ & 5 Matching). Modal `#quiz-modal-box` berdesain glassmorphism dark theme; renderer MCQ interaktif dengan audio/visual instant feedback; renderer matching (Tap-to-Pair) 2 kolom dengan 4 palet visual unik; engine kalkulasi nilai skala 0–100 tersinkronisasi ke `dataService.savePosttestScore()` dan leaderboard; layar hasil komparasi lengkap dengan analisis selisih nilai Pretest vs Post-test (+Δ); abstraksi `SafeStorage` in-memory fallback mencegah `SecurityError` di semua lingkungan peramban.
- **Fase 6 (Selesai)**: Sistem Leaderboard & Rekapitulasi Akhir interaktif. Integrasi pengiriman payload nilai (`dataService.submitScore`) dengan timestamp presisi; engine kalkulasi analisis efektivitas pembelajaran Hake's Normalized Gain (*N-Gain Score* skala 0–1 dan persentase) dengan klasifikasi kategori Tinggi/Sedang/Rendah dan visual meter bar; antarmuka tab responsif (*Ringkasan Nilai & N-Gain* vs *Papan Peringkat*); tabel peringkat real-time lengkap dengan kolom Peringkat (#1–3 badge), Nama, Pretest, Post-test, Nilai Peningkatan (+Δ), dan N-Gain; sorotan baris visual (*highlight*) siswa aktif berlabel *(Anda)*; integrasi tombol akses leaderboard di Slide 15, Slide 16, dan Drawer; serta tombol *"Selesai & Ke Halaman Penutup ➔"* yang mengarahkan langsung ke Slide 16.
- **Fase 7 (Selesai)**: Dokumentasi & Panduan Migrasi ke Google Sheets. Modul backend Google Apps Script siap pakai (`Code.gs`) dengan handler `doGet` (`getData` & `checkNISN`), `doPost` dengan penanganan concurency `LockService` dan perankingan otomatis; penyempurnaan `js/data-service.js` dengan fallback verifikasi daring dan sinkronisasi real-time leaderboard; serta berkas panduan teknis langkah-demi-langkah `PANDUAN_MIGRASI_GOOGLE_SHEETS.md`.

---

## Fase 3: Modul & Engine Pretest (5 Soal Pilihan Ganda) - [SELESAI]

### Tujuan
Menyajikan 5 butir soal pilihan ganda sebelum siswa mengakses materi pembelajaran, menghitung perolehan nilai awal (skala 0–100), dan menyimpan skor Pretest ke sesi siswa.

### Hasil Implementasi
1. **Markup Modal Pretest (`index.html`)**:
   - Kontainer dialog modal `#pretest-modal` dengan glassmorphism backdrop.
   - Header interaktif: Badge evaluasi awal, nomor soal dinamis (`Soal X dari 5`), nama & kelas siswa aktif, dan animated progress bar.
   - Body: Pertanyaan dan 4 tombol opsi pilihan ganda berdesain kartu modern (A, B, C, D) dengan state aktif glow.
   - Footer: Informasi status jawaban dan tombol navigasi soal berikutnya / kirim jawaban.
   - Screen Hasil Pretest: Menampilkan skor akhir diagnostik (skala 100), rincian jawaban benar, dan tombol *"Lanjut ke Materi Pembelajaran ➔"*.
2. **Engine di `js/app.js`**:
   - Mengambil dataset 5 soal pretest via `dataService.getPretestQuestions()`.
   - Mengelola state: `pretestQuestions`, `pretestIndex`, `pretestAnswers`, `pretestScore`.
   - Menghitung nilai otomatis: `(jumlah_benar / 5) * 100`.
   - Menyimpan nilai ke state dan cache `localStorage` via `dataService.savePretestScore(score)`.
   - Mendukung deteksi status: siswa yang sudah memiliki nilai pretest dapat langsung lanjut ke materi atau memilih opsi *"Kerjakan Ulang Pretest"*.

---

## Fase 4: Penguncian & Guided Navigation Slide Materi (Slide 1–14) - [SELESAI]

### Tujuan
Memastikan siswa mempelajari materi secara bertahap dan mencegah akses langsung ke Post-test sebelum materi selesai dipelajari, serta mengoptimalkan materi slide 1–14 secara efisien tanpa beban video maupun AR berat.

### Hasil Implementasi
1. **Aturan Navigasi & Penguncian Hotspot**:
   - Hotspot tombol ke-6 di Slide 3 (`#hotspot-menu-quiz` data-goto="15") memiliki state `is-locked` dengan badge visual gembok `🔒 Terkunci`.
   - Jika siswa mencoba mengetuk sebelum mencapai Slide 14, sistem membatalkan navigasi, memicu animasi getar (*shake animation*), memutar efek suara peringatan, dan menampilkan toast instruksi: *"Kuis Interaktif terkunci! Selesaikan materi hingga Slide 14 terlebih dahulu."*
   - Navigasi global `data-goto` dan tombol sudut dilindungi oleh *navigation guard* asinkron.
2. **Drawer Navigasi Terpandu (`slide-drawer`)**:
   - Indikator progres materi dinamis di header drawer: `Progres: X / 14 Slide`.
   - Item Slide 15 & 16 menampilkan status `🔒 Terkunci` dengan tampilan redup dan diblokir dari klik pintas.
   - Slide materi 1–14 yang sudah dipelajari diberi tanda status `✓ Dibaca`.
3. **Pelacak Progres Otomatis (`maxSlideVisited`)**:
   - Terekam persisten di `dataService` dan `localStorage` berdasarkan sesi NISN siswa aktif.
   - Nilai diperbarui otomatis saat siswa berpindah ke slide yang lebih tinggi.
   - Kunci Slide 15 dan Slide 16 terbuka otomatis (*auto-unlock*) seketika siswa tiba di Slide 14, disertai notifikasi perayaan dan efek suara sukses.
4. **Optimalisasi Materi Slide 1–14 Tanpa Video & Tanpa AR**:
   - Slide 1 & 2 beralih ke gambar WebP statis terkompresi optimal, meniadakan unduhan file video MP4 sebesar 14.1 MB.
   - Slide 13 menyajikan visualisasi cerita Mbah Kanjeng Sepuh secara utuh dan bersih, dengan bilah narasi audio ringkas tanpa menutupi konten slide.
   - Slide 14 menyajikan papan materi edukasi IPA vulkanisme (Magma vs Lava, Kesuburan Tanah, Energi Geotermal, Mitigasi Bencana) yang terintegrasi pada papan tulis slide tanpa memuat iframe 3D Sketchfab eksternal.
   - Konfigurasi `.vercelignore` diperbarui untuk mengabaikan aset `*.mp4` guna menjaga kepatuhan batas hosting Vercel Free Tier.

---

## Fase 5: Modul & Engine Post-test Dinamis (15 Soal: MCQ & Matching) - [SELESAI]

### Tujuan
Menyediakan engine evaluasi akhir 15 soal dengan dukungan 2 jenis tipe soal: Pilihan Ganda (10 butir) dan Mencocokkan Kata/Kalimat (5 butir).

### Hasil Implementasi
1. **Markup Modal & UI Post-test (`index.html` & `css/style.css`)**:
   - Kontainer dialog `#quiz-modal-box` dan `.posttest-modal-card` berdesain glassmorphism gelap modern dengan tema lava/vulkanik beraksen oranye-amber (`#ea580c`, `#f59e0b`).
   - Header interaktif: Badge evaluasi akhir, badge tipe soal dinamis (`Pilihan Ganda` / `Mencocokkan Pasangan`), nomor soal (`Soal X dari 15`), tag identitas siswa aktif, tombol tutup, dan progress bar teranimasi halus.
   - Body area responsif: Mendukung perataan kisi 2 kolom untuk kartu opsi MCQ dan 2 kolom untuk kartu pencocokan tap-to-pair (Premis vs Target Pasangan).
   - Layar hasil komparasi: Menampilkan skor akhir (skala 0–100), rincian pencapaian (MCQ & Matching), serta tabel komparasi nilai Pretest vs Post-test vs Peningkatan (+Δ).
2. **Engine Renderer MCQ (Soal 1–10)**:
   - Menampilkan 4 opsi berhuruf (A, B, C, D).
   - Feedback seketika saat diklik: hijau glow untuk benar, merah shake untuk salah disertai sorotan opsi benar.
   - Efek suara sintetis instan (`sound.playSuccess()` / `sound.playError()`).
   - Kotak pembahasan materi tampil otomatis di bawah opsi.
3. **Engine Renderer Tap-to-Pair Matching (Soal 11–15)**:
   - Kolom kiri (Premis / Konsep tetap) dan kolom kanan (Target Pasangan diacak via Fisher-Yates shuffle).
   - Interaksi sentuh: Ketuk kartu kiri (state glow aktif) lalu ketuk kartu kanan untuk menghubungkan pasangan.
   - Visualisasi pasangan: 4 palet warna berbeda (`paired-1` hingga `paired-4`) dengan badge status pasangan.
   - Pembatalan/reset: Siswa dapat mengetuk kembali kartu untuk membatalkan koneksi atau menekan tombol *"Reset Pasangan"*.
   - Verifikasi jawaban: Tombol *"Periksa Pasangan"* memvalidasi kecocokan dengan kunci data, memberikan penandaan `✓ Benar` atau `✕ Salah` per kartu, memicu feedback audio, serta membuka kunci pembahasan pasangan yang benar.
4. **Kalkulasi Nilai & Integrasi Data (`js/data-service.js` & `js/app.js`)**:
   - Total bobot dihitung proporsional dari 15 butir soal berskala 0–100 (MCQ: 1 poin per soal, Matching: 0.25 poin per pasangan benar).
   - Skor otomatis tersimpan ke sesi siswa via `dataService.savePosttestScore(score)` dan terekam ke antrean Leaderboard via `dataService.submitScore(...)`.
   - Mengimplementasikan kelas `SafeStorage` pada `js/data-service.js` dengan fallback *in-memory* otomatis untuk memastikan kestabilan tanpa terhambat batasan izin `localStorage` peramban.

---

## Fase 6: Leaderboard & Rekapitulasi Akhir - [SELESAI]

### Tujuan
Mengirimkan rekap nilai siswa ke sistem data dan menampilkan papan peringkat interaktif beserta analisis peningkatan nilai (*N-Gain Score*).

### Hasil Implementasi
1. **Pengiriman & Standarisasi Payload Data**:
   - Fungsi `dataService.submitScore(payload)` menerima dan menstandarisasi payload:
     ```json
     {
       "timestamp": "YYYY-MM-DD HH:mm",
       "nisn": "0081234501",
       "nama": "Ahmad Fauzi",
       "nilaiPretest": 40,
       "nilaiPosttest": 93,
       "totalSkor": 93
     }
     ```
   - Menyimpan dan memperbarui data secara persisten ke `SafeStorage` (`evaluasi_leaderboard_local`) dan siap terkirim ke Google Sheets Web App endpoint saat mode diaktifkan.
   - Pengurutan peringkat otomatis menurun berdasarkan `Total_Skor`, `Nilai_Posttest`, lalu `Nilai_Pretest`.
2. **Kalkulasi Analisis Efektivitas Hake's N-Gain**:
   - Engine menghitung Normalized Gain:
     $$g = \frac{\text{Posttest} - \text{Pretest}}{100 - \text{Pretest}}$$
   - Mengelompokkan capaian belajar ke dalam 3 kategori efektivitas Hake:
     - **Tinggi** ($g \ge 0.70$): Disertai badge hijau emerald dan deskripsi serapan konsep maksimal.
     - **Sedang** ($0.30 \le g < 0.70$): Disertai badge amber dan evaluasi pemahaman cukup efektif.
     - **Rendah** ($g < 0.30$): Disertai badge oranye/merah dan rekomendasi belajar ulang modul 4–14.
   - Dilengkapi visual meter bar progres peningkatan nilai interaktif.
3. **Antarmuka Tab & Papan Peringkat Responsif**:
   - Tab bar interaktif di dalam modal `#quiz-modal-box`:
     - *Tab 1*: Ringkasan Nilai, Kartu Komparasi 4 Kolom (Pretest, Post-test, Peningkatan +Δ, Skor N-Gain), Kartu Analisis Hake, dan tombol pintas ke Leaderboard.
     - *Tab 2*: Papan Peringkat (Leaderboard) lengkap dengan bar status posisi siswa (`Peringkat #X dari N Siswa`) serta rata-rata dan skor tertinggi kelas.
   - Tabel responsif 6 kolom: Peringkat, Nama Siswa, Pretest, Post-test, Peningkatan (+Δ), dan N-Gain.
   - Baris data siswa aktif diberikan sorotan visual khusus (`.is-current-student`) dengan border emas/amber menyala dan badge tag *(Anda)*.
4. **Aksesibilitas & Navigasi Terpadu**:
   - Tombol pintas papan peringkat tersedia langsung di:
     - Slide 15 (`#btn-slide15-leaderboard`): Membuka leaderboard tanpa harus mengerjakan ulang soal.
     - Slide 16 (`#btn-slide16-leaderboard`): Membuka leaderboard dari halaman penutup.
     - Slide Drawer (`#btn-drawer-leaderboard`): Akses cepat dari daftar isi.
   - Tombol *"Selesai & Ke Halaman Penutup ➔"* di footer hasil kuis menutup modal evaluasi dan memindahkan presentasi ke Slide 16.

---

## Fase 7: Dokumentasi & Panduan Migrasi ke Google Sheets - [SELESAI]

### Tujuan
Menyediakan kode Google Apps Script siap pakai dan panduan aktivasi integrasi online spreadsheet.

### Hasil Implementasi
1. **Skrip Google Apps Script Backend (`Code.gs`)**:
   - `doGet(e)`:
     - `action=getData`: Membaca 4 sheet (`Data_Siswa`, `Soal_Pretest`, `Soal_Posttest`, `Leaderboard`) dan mengembalikan seluruh koleksi dalam format JSON standar.
     - `action=checkNISN&nisn=XXX`: Memvalidasi NISN siswa secara instan langsung ke lembar `Data_Siswa`.
     - `default`: Mengembalikan respon diagnostik status kesehatan layanan Web App.
   - `doPost(e)`:
     - Membaca payload hasil evaluasi siswa (mendukung `text/plain` dan `application/json` untuk mencegah blokir preflight CORS di peramban).
     - Proteksi persaingan data (*thread safety*) melalui `LockService.getScriptLock()`.
     - Memperbarui data siswa jika NISN sudah ada sebelumnya (*anti-duplicate*) atau menambahkan baris baru jika siswa baru pertama kali menyelesaikan evaluasi.
     - Mengurutkan lembar kerja `Leaderboard` secara otomatis menurun berdasarkan `Total_Skor` (Kolom F).
   - Fungsi pengujian internal: `testDoGet()`, `testCheckNISN()`, dan `testDoPost()` siap dijalankan langsung di editor Apps Script.
2. **Penyempurnaan Modul Frontend (`js/data-service.js`)**:
   - Menambahkan fallback verifikasi daring via `action=checkNISN` jika siswa belum terdaftar di cache lokal.
   - Mengoptimalkan metode `getLeaderboard()` untuk mengambil data perankingan real-time langsung dari Google Sheets saat mode `GOOGLE_SHEETS` aktif.
   - Menggunakan header `text/plain;charset=utf-8` dengan `mode: 'no-cors'` untuk transmisi `submitScore` ke Google Apps Script tanpa hambatan preflight CORS.
3. **Dokumentasi Lengkap (`PANDUAN_MIGRASI_GOOGLE_SHEETS.md`)**:
   - Panduan terstruktur 5 langkah: Unggah spreadsheet, penempelan `Code.gs`, uji fungsi, deployment Web App (`Execute as: Me`, `Access: Anyone`), dan penyesuaian konfigurasi `CONFIG` di frontend.
   - Spesifikasi teknis skema data sheet dan API endpoint.
   - Panduan pemecahan kendala (CORS, versi deployment, dan format string NISN 10 digit).
