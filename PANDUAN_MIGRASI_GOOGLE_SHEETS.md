# Panduan Migrasi & Integrasi Google Sheets

Dokumen ini merupakan panduan teknis langkah-demi-langkah untuk menghubungkan media pembelajaran interaktif *The Legend of Mbah Kanjeng Sepuh* dengan Google Spreadsheet menggunakan Google Apps Script (GAS) Web App.

---

## 1. Ikhtisar Integrasi

Aplikasi ini menggunakan pola adapter pada modul [js/data-service.js](file:///c:/Project/solusi.toriq/Materi%20Interaktif/js/data-service.js) yang dapat berjalan dalam dua mode:
- **Mode `LOCAL` (Default)**: Membaca dataset statis dari [data/materi_evaluasi.json](file:///c:/Project/solusi.toriq/Materi%20Interaktif/data/materi_evaluasi.json) dan menyimpan skor ke `localStorage` peramban.
- **Mode `GOOGLE_SHEETS`**: Terhubung secara daring ke Google Spreadsheet untuk verifikasi NISN real-time, sinkronisasi bank soal, serta pencatatan dan pemeringkatan nilai siswa secara terpusat.

---

## 2. Struktur Lembar Kerja (Spreadsheet)

Berkas basis data [data/materi_evaluasi.xlsx](file:///c:/Project/solusi.toriq/Materi%20Interaktif/data/materi_evaluasi.xlsx) memiliki 4 sheet:

| Nama Sheet | Fungsi | Kolom Utama |
|---|---|---|
| `Data_Siswa` | Basis data identitas siswa | `NIS`, `NISN`, `Nama`, `Kelas` |
| `Soal_Pretest` | 5 butir soal pilihan ganda evaluasi awal | `ID`, `Pertanyaan`, `Opsi_A`, `Opsi_B`, `Opsi_C`, `Opsi_D`, `Opsi_E`, `Kunci`, `Pembahasan` |
| `Soal_Posttest` | 15 butir soal evaluasi akhir (MCQ & Matching) | `ID`, `Tipe`, `Pertanyaan`, `Opsi_A`-`D`, `Kunci`, `Pasangan_Kiri`, `Pasangan_Kanan`, `Pembahasan` |
| `Leaderboard` | Rekapitulasi perolehan nilai dan pemeringkatan | `Timestamp`, `NISN`, `Nama`, `Nilai_Pretest`, `Nilai_Posttest`, `Total_Skor`, `Peningkatan`, `Nilai_NGain` |

---

## 3. Langkah-Langkah Aktivasi

### Langkah 1: Unggah Dataset ke Google Drive
1. Buka [Google Drive](https://drive.google.com).
2. Unggah berkas [data/materi_evaluasi.xlsx](file:///c:/Project/solusi.toriq/Materi%20Interaktif/data/materi_evaluasi.xlsx).
3. Buka berkas tersebut di Google Drive, lalu pilih **File > Simpan sebagai Google Spreadsheet** (*Save as Google Sheets*).
4. Pastikan terdapat 4 tab sheet: `Data_Siswa`, `Soal_Pretest`, `Soal_Posttest`, dan `Leaderboard`.

### Langkah 2: Pemasangan Skrip Backend
1. Pada Google Spreadsheet yang telah dibuka, klik menu **Ekstensi > Apps Script**.
2. Beri nama proyek, misalnya: `Backend Evaluasi Kanjeng Sepuh`.
3. Buka berkas skrip [Code.gs](file:///c:/Project/solusi.toriq/Materi%20Interaktif/Code.gs) pada repositori proyek ini.
4. Salin seluruh isi berkas [Code.gs](file:///c:/Project/solusi.toriq/Materi%20Interaktif/Code.gs) dan tempelkan ke editor Google Apps Script (menggantikan kode default `myFunction`).
5. Simpan proyek dengan menekan tombol **Ctrl + S** atau ikon simpan.

### Langkah 3: Uji Coba Fungsi di Editor Apps Script
Sebelum melakukan deployment, jalankan fungsi uji coba berikut pada dropdown fungsi Apps Script:
1. Pilih fungsi `testDoGet` lalu klik **Jalankan** (*Run*). Berikan izin otorisasi akses spreadsheet jika diminta. Pastikan log eksekusi menampilkan data JSON lengkap.
2. Pilih fungsi `testCheckNISN` lalu klik **Jalankan**. Pastikan log eksekusi menampilkan data siswa NISN `3103894907`.
3. Pilih fungsi `testDoPost` lalu klik **Jalankan**. Periksa tab sheet `Leaderboard`, baris nilai baru atas nama siswa uji coba harus tertera dan terurut.

### Langkah 4: Publikasikan sebagai Web App
1. Di kanan atas editor Apps Script, klik tombol **Terapkan > Deployment baru** (*Deploy > New deployment*).
2. Klik ikon gerigi (Pilih jenis) > pilih **Aplikasi Web** (*Web app*).
3. Isi parameter konfigurasi:
   - **Deskripsi**: `v1.0 Produksi Evaluasi`
   - **Jalankan sebagai** (*Execute as*): **Saya** (*Me / email akun Google Anda*)
   - **Siapa yang memiliki akses** (*Who has access*): **Siapa saja** (*Anyone*)
4. Klik **Terapkan** (*Deploy*).
5. Salin tautan **URL Aplikasi Web** yang dihasilkan (format URL: `https://script.google.com/macros/s/AKfycb.../exec`).

> [!IMPORTANT]
> Opsi akses **Siapa saja** (*Anyone*) wajib dipilih agar aplikasi frontend di browser siswa dapat membaca data dan mengirim skor tanpa kewajiban login akun Google.

### Langkah 5: Hubungkan ke Aplikasi Frontend
1. Buka berkas [js/data-service.js](file:///c:/Project/solusi.toriq/Materi%20Interaktif/js/data-service.js).
2. Perbarui objek konfigurasi `CONFIG` di bagian paling atas berkas:
   ```javascript
   export const CONFIG = {
     // Ubah mode operasional dari 'LOCAL' menjadi 'GOOGLE_SHEETS'
     MODE: 'GOOGLE_SHEETS',

     // Lokasi data lokal (sebagai offline cache fallback)
     LOCAL_DATA_PATH: './data/materi_evaluasi.json',

     // Tempelkan URL Web App Google Apps Script dari Langkah 4
     GOOGLE_SHEETS_URL: 'https://script.google.com/macros/s/AKfycb.../exec'
   };
   ```
3. Simpan berkas. Jalankan aplikasi web (`node server.js` atau akses URL deployment).

---

## 4. Spesifikasi Teknis Endpoint API

### 1. `GET ?action=getData`
Mengambil seluruh data evaluasi dan leaderboard.
- **Method**: `GET`
- **Response Format**:
  ```json
  {
    "success": true,
    "dataSiswa": [
      { "NIS": "11486", "NISN": "3103894907", "Nama": "ACHMAD RIZKY RADITYA", "Kelas": "XI - 1" }
    ],
    "soalPretest": [ ... ],
    "soalPosttest": [ ... ],
    "leaderboard": [ ... ]
  }
  ```

### 2. `GET ?action=checkNISN&nisn=3103894907`
Memvalidasi identitas siswa secara langsung tanpa memuat seluruh basis data (mendukung pencarian lewat NISN maupun NIS).
- **Method**: `GET`
- **Response Format**:
  ```json
  {
    "success": true,
    "student": {
      "NIS": "11486",
      "NISN": "3103894907",
      "Nama": "ACHMAD RIZKY RADITYA",
      "Kelas": "XI - 1"
    }
  }
  ```

### 3. `POST /exec`
Merekam atau memperbarui perolehan nilai siswa ke sheet `Leaderboard`.
- **Method**: `POST`
- **Content-Type**: `text/plain;charset=utf-8` (atau `application/json`)
- **Payload Body**:
  ```json
  {
    "timestamp": "2026-09-26 14:15",
    "nisn": "0081234501",
    "nama": "Ahmad Fauzi",
    "nilaiPretest": 40,
    "nilaiPosttest": 93,
    "totalSkor": 93,
    "peningkatan": 53,
    "nilaiNGain": 0.88
  }
  ```
- **Fitur Otomatis Backend**:
  - Menggunakan `LockService` untuk mencegah tabrakan data (*race condition*) antar siswa.
  - Memperbarui baris jika NISN sudah terdaftar sebelumnya (*anti-duplicate submission*).
  - Mengurutkan sheet secara otomatis berdasarkan `Total_Skor` menurun.

---

## 5. Pemecahan Masalah (Troubleshooting)

1. **CORS Error saat `POST`**:
   Frontend menggunakan `mode: 'no-cors'` dengan tipe payload teks. Ini adalah rancangan standar untuk Web App Google Apps Script guna melewati pembatasan preflight OPTIONS di peramban.

2. **Perubahan Kode di Apps Script Tidak Berefek**:
   Setiap kali berkas `Code.gs` diubah di editor Google, wajib melakukan deployment ulang versi:
   - Pilih menu **Terapkan > Kelola deployment** (*Deploy > Manage deployments*).
   - Klik ikon pensil (Edit) > ubah Versi ke **Versi Baru** (*New version*).
   - Klik **Terapkan** (*Deploy*).

3. **Angka Nol Awal pada NISN Hilang**:
   Skrip `Code.gs` secara otomatis menormalkan input NISN numerik menjadi teks 10 digit dengan tanda kutip tunggal (`'0081234501`) pada spreadsheet untuk menjaga integritas data.
