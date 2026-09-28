# Panduan Integrasi Google Sheets & Google Apps Script

Panduan langkah demi langkah untuk menghubungkan file `materi_evaluasi.xlsx` dengan aplikasi menggunakan Google Apps Script sebagai backend live database.

---

## 1. Unggah File Excel ke Google Sheets
1. Buka [Google Drive](https://drive.google.com).
2. Klik **Baru (+) > Upload File**, lalu pilih file `data/materi_evaluasi.xlsx`.
3. Buka file tersebut di Google Drive, lalu klik **File > Simpan sebagai Google Spreadsheet**.
4. Pastikan terdapat 4 sheet dengan nama persis berikut:
   - `Data_Siswa` (Kolom: NIS, NISN, Nama, Kelas)
   - `Soal_Pretest` (Kolom: ID, Pertanyaan, Opsi_A, Opsi_B, Opsi_C, Opsi_D, Opsi_E, Kunci, Pembahasan)
   - `Soal_Posttest` (Kolom: ID, Tipe, Pertanyaan, Opsi_A, Opsi_B, Opsi_C, Opsi_D, Opsi_E, Kunci, Pasangan_Kiri, Pasangan_Kanan, Pembahasan)
   - `Leaderboard` (Kolom: NIS, NISN, Nama, Kelas, Nilai_Pretest, Nilai_Posttest, Nilai_Remidi, Status)

---

## 2. Pasang Kode Google Apps Script
1. Di dalam Google Spreadsheet, klik menu **Ekstensi > Apps Script**.
2. Hapus seluruh isi kode bawaan, lalu salin dan tempelkan seluruh isi berkas [`google-apps-script/Code.gs`](./Code.gs).
3. Beri nama proyek, misalnya: `Backend-Evaluasi-MbahKanjengSepuh`.
4. Klik ikon **Simpan** (Ctrl + S).

---

## 3. Terapkan (Deploy) sebagai Web App
1. Klik tombol **Terapkan (Deploy) > Deployment baru** di pojok kanan atas.
2. Pada jenis deployment, pilih ikon roda gigi > **Aplikasi web (Web app)**.
3. Konfigurasikan opsi berikut:
   - **Deskripsi**: `API Evaluasi Siswa v1`
   - **Jalankan sebagai (Execute as)**: `Saya (email Anda)`
   - **Yang memiliki akses (Who has access)**: `Siapa saja (Anyone)` *(Wajib dipilih agar siswa tidak perlu login akun Google)*.
4. Klik **Terapkan (Deploy)**.
5. Jika muncul permintaan izin (*Authorization Required*):
   - Klik **Tinjau Izin (Review permissions)**.
   - Pilih akun Google Anda.
   - Klik **Lanjutan (Advanced) > Buka Backend-Evaluasi-MbahKanjengSepuh (tidak aman)**.
   - Klik **Izinkan (Allow)**.
6. Salin **URL Aplikasi Web** yang dihasilkan (format: `https://script.google.com/macros/s/.../exec`).

---

## 4. Hubungkan ke Aplikasi (js/data-service.js)
Buka berkas `js/data-service.js` dan ubah konfigurasi pada baris 9-18:

```javascript
export const CONFIG = {
  // Ubah 'LOCAL' menjadi 'GOOGLE_SHEETS'
  MODE: 'GOOGLE_SHEETS',

  // Lokasi data lokal (fallback otomatis saat offline)
  LOCAL_DATA_PATH: './data/materi_evaluasi.json',

  // Tempelkan URL Web App dari langkah 3 di sini
  GOOGLE_SHEETS_URL: 'https://script.google.com/macros/s/AKfycbx.../exec'
};
```

---

## 5. Sinkronisasi Data Lokal (Jika Mengedit Excel Offline)
Jika sewaktu-waktu Anda memperbarui soal atau siswa di `data/materi_evaluasi.xlsx` pada komputer lokal, jalankan perintah terminal berikut untuk memperbarui `data/materi_evaluasi.json`:

```bash
npm run sync:data
```
