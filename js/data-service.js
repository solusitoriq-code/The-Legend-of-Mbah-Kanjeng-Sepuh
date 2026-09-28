/**
 * DATA-SERVICE.JS
 * Modul abstraksi data (Adapter Pattern) untuk Sistem Evaluasi & Leaderboard.
 * Mendukung mode luring (LOCAL JSON/XLSX) dan daring (GOOGLE_SHEETS).
 */

import { POSTTEST_QUESTIONS } from './quiz-data.js';

export const CONFIG = {
  // Mode operasional data: 'LOCAL' atau 'GOOGLE_SHEETS'
  // MODE: 'LOCAL',
  MODE: 'GOOGLE_SHEETS',

  // Lokasi data lokal (offline fallback)
  LOCAL_DATA_PATH: './data/materi_evaluasi.json',

  // URL Web App Google Apps Script (diisi saat mode GOOGLE_SHEETS diaktifkan)
  GOOGLE_SHEETS_URL: 'https://script.google.com/macros/s/AKfycbytpjrJIgMYHO-V2rQYyir_afvgAM0XBcXh-latQcCbwsL0kFrYjZ_gSPhxpm2xYg6s/exec'
};

const STORAGE_KEYS = {
  CURRENT_STUDENT: 'evaluasi_current_student',
  PRETEST_SCORE: 'evaluasi_pretest_score',
  POSTTEST_SCORE: 'evaluasi_posttest_score',
  LOCAL_DATA_CACHE: 'evaluasi_data_cache',
  LEADERBOARD_LOCAL: 'evaluasi_leaderboard_local',
  MAX_SLIDE_VISITED: 'evaluasi_max_slide_visited',
  INTRO_COMPLETED: 'evaluasi_intro_completed',
  SLIDE6_STRUCTURES: 'evaluasi_slide6_structures',
  SLIDE11_FEATURES: 'evaluasi_slide11_features'
};

/**
 * Abstraksi penyimpanan aman dengan fallback memori lokal
 * Mencegah SecurityError pada iframe, sandbox, atau browser dengan akses storage terbatas
 */
class SafeStorage {
  constructor() {
    this.memoryStore = {};
    this.storageAvailable = false;
    try {
      if (typeof window !== 'undefined' && 'localStorage' in window && window.localStorage !== null) {
        const testKey = '__test_storage_check__';
        window.localStorage.setItem(testKey, testKey);
        window.localStorage.removeItem(testKey);
        this.storageAvailable = true;
      }
    } catch (e) {
      this.storageAvailable = false;
    }
  }

  getItem(key) {
    if (this.storageAvailable) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        this.storageAvailable = false;
      }
    }
    return Object.prototype.hasOwnProperty.call(this.memoryStore, key) ? this.memoryStore[key] : null;
  }

  setItem(key, value) {
    if (this.storageAvailable) {
      try {
        window.localStorage.setItem(key, String(value));
        return;
      } catch (e) {
        this.storageAvailable = false;
      }
    }
    this.memoryStore[key] = String(value);
  }

  removeItem(key) {
    if (this.storageAvailable) {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch (e) {
        this.storageAvailable = false;
      }
    }
    delete this.memoryStore[key];
  }
}

const safeStorage = new SafeStorage();

class DataService {
  constructor() {
    this.data = null;
    this.currentStudent = null;
    this.pretestScore = null;
    this.posttestScore = null;
    this.maxSlideVisited = 1;
    this.isLoaded = false;
    this.initFromStorage();
  }

  getStorageKeyWithNISN(baseKey) {
    if (this.currentStudent && this.currentStudent.NISN) {
      return `${baseKey}_${this.currentStudent.NISN}`;
    }
    return baseKey;
  }

  initFromStorage() {
    try {
      const savedStudent = safeStorage.getItem(STORAGE_KEYS.CURRENT_STUDENT);
      if (savedStudent) {
        this.currentStudent = JSON.parse(savedStudent);
      }
      const pretestKey = this.getStorageKeyWithNISN(STORAGE_KEYS.PRETEST_SCORE);
      const savedPretest = safeStorage.getItem(pretestKey) || safeStorage.getItem(STORAGE_KEYS.PRETEST_SCORE);
      if (savedPretest !== null) {
        this.pretestScore = Number(savedPretest);
      }
      const posttestKey = this.getStorageKeyWithNISN(STORAGE_KEYS.POSTTEST_SCORE);
      const savedPosttest = safeStorage.getItem(posttestKey) || safeStorage.getItem(STORAGE_KEYS.POSTTEST_SCORE);
      if (savedPosttest !== null) {
        this.posttestScore = Number(savedPosttest);
      }
      const slideKey = this.getStorageKeyWithNISN(STORAGE_KEYS.MAX_SLIDE_VISITED);
      const savedSlide = safeStorage.getItem(slideKey) || safeStorage.getItem(STORAGE_KEYS.MAX_SLIDE_VISITED);
      if (savedSlide !== null) {
        this.maxSlideVisited = Math.max(1, parseInt(savedSlide, 10) || 1);
      }

      // Muat cache dataset lokal langsung dari storage (0ms)
      const cached = safeStorage.getItem(STORAGE_KEYS.LOCAL_DATA_CACHE);
      if (cached) {
        this.data = JSON.parse(cached);
        this.isLoaded = true;
      }
    } catch (e) {
      console.warn('[DataService] Failed to read session storage:', e);
    }

    // Jalankan preloading data lokal & sinkronisasi daring di latar belakang
    this.preloadData();
  }

  /**
   * Preload data lokal instan dan sinkronisasi daring di latar belakang
   */
  preloadData() {
    // 1. Pastikan data lokal selalu tersedia di memori (10-30ms)
    if (!this.data) {
      fetch(CONFIG.LOCAL_DATA_PATH)
        .then(r => r.json())
        .then(localData => {
          if (!this.data) {
            this.data = localData;
            this.isLoaded = true;
            safeStorage.setItem(STORAGE_KEYS.LOCAL_DATA_CACHE, JSON.stringify(localData));
          }
        })
        .catch(() => {});
    }

    // 2. Jika mode GOOGLE_SHEETS, sinkronkan data terbaru di latar belakang tanpa memblokir interaksi
    if (CONFIG.MODE === 'GOOGLE_SHEETS' && CONFIG.GOOGLE_SHEETS_URL) {
      setTimeout(() => {
        fetch(`${CONFIG.GOOGLE_SHEETS_URL}?action=getData`, {
          headers: { 'Accept': 'application/json' }
        })
          .then(r => r.json())
          .then(remoteData => {
            if (remoteData && remoteData.success) {
              this.data = remoteData;
              this.isLoaded = true;
              safeStorage.setItem(STORAGE_KEYS.LOCAL_DATA_CACHE, JSON.stringify(remoteData));
            }
          })
          .catch(err => {
            console.warn('[DataService] Background sync deferred:', err.message);
          });
      }, 400);
    }
  }

  /**
   * Memuat dataset (baik dari JSON lokal maupun endpoint Google Sheets)
   */
  async loadData() {
    if (this.isLoaded && this.data) {
      return this.data;
    }

    try {
      if (CONFIG.MODE === 'GOOGLE_SHEETS' && CONFIG.GOOGLE_SHEETS_URL) {
        const response = await fetch(`${CONFIG.GOOGLE_SHEETS_URL}?action=getData`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const remoteData = await response.json();
        this.data = remoteData;
        safeStorage.setItem(STORAGE_KEYS.LOCAL_DATA_CACHE, JSON.stringify(remoteData));
      } else {
        // Mode LOCAL: Muat dari berkas materi_evaluasi.json
        const response = await fetch(CONFIG.LOCAL_DATA_PATH, {
          cache: 'no-cache'
        });
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        this.data = await response.json();
        safeStorage.setItem(STORAGE_KEYS.LOCAL_DATA_CACHE, JSON.stringify(this.data));
      }
      this.isLoaded = true;
      return this.data;
    } catch (error) {
      console.warn('[DataService] Failed to load data, attempting local cache:', error);
      const cached = safeStorage.getItem(STORAGE_KEYS.LOCAL_DATA_CACHE);
      if (cached) {
        this.data = JSON.parse(cached);
        this.isLoaded = true;
        return this.data;
      }
      throw error;
    }
  }

  /**
   * Validasi NISN siswa (Dioptimalkan responsif 400-500ms)
   * @param {string} nisn
   * @returns {Promise<{success: boolean, student?: object, message?: string}>}
   */
  async validateNISN(nisn) {
    const startTime = Date.now();
    const cleanNISN = String(nisn || '').trim();
    if (!cleanNISN) {
      return { success: false, message: 'Please enter your Student ID (NIS or NISN).' };
    }

    // Pastikan data lokal sudah tersedia di memori
    if (!this.data) {
      try {
        const cached = safeStorage.getItem(STORAGE_KEYS.LOCAL_DATA_CACHE);
        if (cached) {
          this.data = JSON.parse(cached);
          this.isLoaded = true;
        } else {
          const res = await fetch(CONFIG.LOCAL_DATA_PATH);
          if (res.ok) {
            this.data = await res.json();
            this.isLoaded = true;
          }
        }
      } catch (e) {
        // ignore
      }
    }

    // 1. Cek instan di basis data lokal / cache memori
    const students = this.data?.dataSiswa || [];
    let found = students.find(s => String(s.NISN).trim() === cleanNISN || (s.NIS && String(s.NIS).trim() === cleanNISN));

    // 2. Jika tidak ditemukan di lokal dan mode GOOGLE_SHEETS aktif, tanyakan ke Google Sheets
    if (!found && CONFIG.MODE === 'GOOGLE_SHEETS' && CONFIG.GOOGLE_SHEETS_URL) {
      try {
        const resp = await fetch(`${CONFIG.GOOGLE_SHEETS_URL}?action=checkNISN&nisn=${encodeURIComponent(cleanNISN)}`);
        if (resp.ok) {
          const resJson = await resp.json();
          if (resJson && resJson.success && resJson.student) {
            found = resJson.student;
            if (this.data && Array.isArray(this.data.dataSiswa)) {
              this.data.dataSiswa.push(found);
            }
          }
        }
      } catch (err) {
        console.warn('[DataService] Remote checkNISN failed, using local validation result:', err);
      }
    }

    // Beri jeda visual halus sekitar 400-500ms agar animasi tombol "Verifying..." terlihat natural
    const elapsed = Date.now() - startTime;
    if (elapsed < 450) {
      await new Promise(resolve => setTimeout(resolve, 450 - elapsed));
    }

    if (found) {
      this.currentStudent = found;
      try {
        safeStorage.setItem(STORAGE_KEYS.CURRENT_STUDENT, JSON.stringify(found));
      } catch (e) {
        console.warn('[DataService] Failed to save student data to local storage', e);
      }
      return { success: true, student: found };
    }

    return {
      success: false,
      message: `Student ID (NIS/NISN) "${cleanNISN}" is not registered in the database.`
    };
  }

  /**
   * Mengambil data profil siswa yang sedang aktif
   */
  getCurrentStudent() {
    return this.currentStudent;
  }

  /**
   * Mengambil daftar soal Pretest (5 soal pilihan ganda)
   */
  async getPretestQuestions() {
    if (!this.data) {
      await this.loadData();
    }
    return this.data?.soalPretest || [];
  }

  /**
   * Mengambil daftar soal Post-test (15 soal MCQ & Matching)
   */
  async getPosttestQuestions() {
    if (!this.data) {
      try {
        await this.loadData();
      } catch (err) {
        console.warn('[DataService] loadData failed, falling back to POSTTEST_QUESTIONS:', err);
      }
    }
    const questions = this.data?.soalPosttest;
    if (Array.isArray(questions) && questions.length > 0) {
      return questions;
    }
    return POSTTEST_QUESTIONS;
  }

  /**
   * Menyimpan skor Pretest
   * @param {number} score
   */
  savePretestScore(score) {
    this.pretestScore = Number(score);
    try {
      const key = this.getStorageKeyWithNISN(STORAGE_KEYS.PRETEST_SCORE);
      safeStorage.setItem(key, String(score));
      safeStorage.setItem(STORAGE_KEYS.PRETEST_SCORE, String(score));
    } catch (e) {
      console.warn(e);
    }

    // Otomatis kirim nilai pretest ke database / data/materi_evaluasi.xlsx
    this.submitScore({
      nilaiPretest: score,
      isPretest: true
    }).catch(err => {
      console.warn('[DataService] Pretest auto-submit notice:', err);
    });
  }

  getPretestScore() {
    return this.pretestScore;
  }

  /**
   * Menyimpan skor Post-test
   * @param {number} score
   */
  savePosttestScore(score) {
    this.posttestScore = Number(score);
    try {
      const key = this.getStorageKeyWithNISN(STORAGE_KEYS.POSTTEST_SCORE);
      safeStorage.setItem(key, String(score));
      safeStorage.setItem(STORAGE_KEYS.POSTTEST_SCORE, String(score));
    } catch (e) {
      console.warn(e);
    }
  }

  getPosttestScore() {
    return this.posttestScore;
  }

  /**
   * Mengambil slide tertinggi yang pernah dikunjungi siswa
   */
  getMaxSlideVisited() {
    try {
      const key = this.getStorageKeyWithNISN(STORAGE_KEYS.MAX_SLIDE_VISITED);
      const saved = safeStorage.getItem(key) || safeStorage.getItem(STORAGE_KEYS.MAX_SLIDE_VISITED);
      if (saved !== null) {
        this.maxSlideVisited = Math.max(1, parseInt(saved, 10) || 1);
      }
    } catch (e) {
      console.warn(e);
    }
    return this.maxSlideVisited;
  }

  // Alias kompatibilitas
  getMaxSlide() {
    return this.getMaxSlideVisited();
  }

  /**
   * Menyimpan progres slide tertinggi yang dikunjungi
   * @param {number} slideNum
   */
  saveMaxSlideVisited(slideNum) {
    const num = parseInt(slideNum, 10);
    if (isNaN(num)) return this.maxSlideVisited;
    if (num > this.maxSlideVisited) {
      this.maxSlideVisited = num;
      try {
        const key = this.getStorageKeyWithNISN(STORAGE_KEYS.MAX_SLIDE_VISITED);
        safeStorage.setItem(key, String(num));
        safeStorage.setItem(STORAGE_KEYS.MAX_SLIDE_VISITED, String(num));
      } catch (e) {
        console.warn(e);
      }
    }
    return this.maxSlideVisited;
  }

  /**
   * Mengecek apakah Slide 1 & 2 (Intro) sudah pernah dibuka
   */
  isIntroCompleted() {
    try {
      const key = this.getStorageKeyWithNISN(STORAGE_KEYS.INTRO_COMPLETED);
      const val = (key && safeStorage.getItem(key)) || safeStorage.getItem(STORAGE_KEYS.INTRO_COMPLETED);
      return val === 'true' || this.getMaxSlideVisited() >= 3;
    } catch (e) {
      return this.getMaxSlideVisited() >= 3;
    }
  }

  /**
   * Menandai bahwa Slide 1 & 2 (Intro) sudah pernah dibuka
   */
  setIntroCompleted() {
    try {
      const key = this.getStorageKeyWithNISN(STORAGE_KEYS.INTRO_COMPLETED);
      if (key) safeStorage.setItem(key, 'true');
      safeStorage.setItem(STORAGE_KEYS.INTRO_COMPLETED, 'true');
    } catch (e) {
      // ignore
    }
  }

  /**
   * Mengecek apakah Post-test (Slide 15) sudah terbuka
   */
  isPosttestUnlocked() {
    return this.getMaxSlideVisited() >= 14 || this.getPosttestScore() !== null;
  }

  /**
   * Mengirim / menyimpan skor evaluasi siswa ke data/materi_evaluasi.xlsx & Leaderboard
   * @param {object} payload { timestamp, nisn, nama, nilaiPretest, nilaiPosttest, totalSkor, isPretest }
   */
  async submitScore(payload) {
    if (!this.data) {
      await this.loadData();
    }

    const pad = (n) => String(n).padStart(2, '0');
    const now = new Date();
    const defaultTimestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const isPretestOnly = Boolean(payload.isPretest || (payload.nilaiPosttest === undefined && payload.nilaiPretest !== undefined));

    const preVal = payload.nilaiPretest !== undefined ? Number(payload.nilaiPretest) : (this.pretestScore !== null ? Number(this.pretestScore) : undefined);
    const postVal = payload.nilaiPosttest !== undefined ? Number(payload.nilaiPosttest) : (this.posttestScore !== null ? Number(this.posttestScore) : undefined);

    if (preVal !== undefined) this.pretestScore = preVal;
    if (postVal !== undefined) this.posttestScore = postVal;

    const totalVal = Number(payload.totalSkor ?? postVal ?? preVal ?? 0);

    // Hitung N-Gain Hake jika pretest dan posttest ada
    let nGain = 0;
    if (preVal !== undefined && postVal !== undefined) {
      if (100 - preVal <= 0) {
        nGain = postVal >= 100 ? 1.0 : 0.0;
      } else {
        nGain = Math.round(((postVal - preVal) / (100 - preVal)) * 100) / 100;
      }
    }

    const record = {
      Timestamp: payload.timestamp || payload.Timestamp || defaultTimestamp,
      NISN: payload.nisn || payload.NISN || this.currentStudent?.NISN || '-',
      Nama: payload.nama || payload.Nama || this.currentStudent?.Nama || 'Student',
      Nilai_Pretest: preVal !== undefined ? preVal : 0,
      Nilai_Posttest: postVal !== undefined ? postVal : (isPretestOnly ? '' : 0),
      Total_Skor: totalVal,
      Peningkatan: (preVal !== undefined && postVal !== undefined) ? (postVal - preVal) : 0,
      Nilai_NGain: nGain,
      timestamp: payload.timestamp || defaultTimestamp,
      nisn: payload.nisn || this.currentStudent?.NISN || '-',
      nama: payload.nama || this.currentStudent?.Nama || 'Student',
      nilaiPretest: preVal,
      nilaiPosttest: postVal,
      totalSkor: totalVal
    };

    // 1. Simpan langsung ke backend server lokal yang menulis ke data/materi_evaluasi.xlsx
    try {
      const serverPayload = {
        timestamp: record.Timestamp,
        nisn: record.NISN,
        nis: payload.nis || this.currentStudent?.NIS || '',
        nama: record.Nama,
        kelas: payload.kelas || this.currentStudent?.Kelas || '',
        nilaiPretest: preVal,
        nilaiPosttest: postVal,
        totalSkor: totalVal
      };

      let localSaved = false;
      try {
        const resp = await fetch('/api/save-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(serverPayload)
        });
        if (resp && resp.ok) localSaved = true;
      } catch (e1) {
        // Abaikan jika bukan relative host
      }

      if (!localSaved) {
        try {
          await fetch('http://localhost:3000/api/save-score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(serverPayload)
          });
        } catch (e2) {
          // Server lokal tidak aktif (misal running static hosting)
        }
      }
    } catch (localErr) {
      console.warn('[DataService] Local score sync failed:', localErr);
    }

    // 2. Kirim ke Google Sheets jika mode GOOGLE_SHEETS aktif
    if (CONFIG.MODE === 'GOOGLE_SHEETS' && CONFIG.GOOGLE_SHEETS_URL) {
      try {
        await fetch(CONFIG.GOOGLE_SHEETS_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(record)
        });
      } catch (err) {
        console.warn('[DataService] Failed to send to Google Sheets, backing up locally:', err);
      }
    }

    // 3. Selalu perbarui cache leaderboard lokal
    try {
      let localLb = [];
      const stored = safeStorage.getItem(STORAGE_KEYS.LEADERBOARD_LOCAL);
      if (stored) {
        localLb = JSON.parse(stored);
      } else if (this.data?.leaderboard) {
        localLb = [...this.data.leaderboard];
      }

      // Hapus entri lama dengan NISN yang sama jika ada, lalu tambahkan yang baru
      localLb = localLb.filter(item => String(item.NISN || item.nisn).trim() !== String(record.NISN).trim());
      localLb.push(record);

      // Urutkan berdasarkan Total_Skor menurun, lalu Nilai_Posttest, lalu Nilai_Pretest
      localLb.sort((a, b) => {
        const scoreA = Number(a.Total_Skor ?? a.totalSkor ?? a.Nilai_Posttest ?? 0);
        const scoreB = Number(b.Total_Skor ?? b.totalSkor ?? b.Nilai_Posttest ?? 0);
        if (scoreB !== scoreA) return scoreB - scoreA;
        const postA = Number(a.Nilai_Posttest ?? a.nilaiPosttest ?? 0);
        const postB = Number(b.Nilai_Posttest ?? b.nilaiPosttest ?? 0);
        if (postB !== postA) return postB - postA;
        return Number(b.Nilai_Pretest ?? 0) - Number(a.Nilai_Pretest ?? 0);
      });

      safeStorage.setItem(STORAGE_KEYS.LEADERBOARD_LOCAL, JSON.stringify(localLb));
    } catch (e) {
      console.warn('[DataService] Failed to update local leaderboard:', e);
    }

    return record;
  }

  /**
   * Mengambil data leaderboard
   */
  async getLeaderboard() {
    let list = [];

    // Jika mode GOOGLE_SHEETS aktif, coba ambil data peringkat real-time terbaru dari Google Sheets
    if (CONFIG.MODE === 'GOOGLE_SHEETS' && CONFIG.GOOGLE_SHEETS_URL) {
      try {
        const response = await fetch(`${CONFIG.GOOGLE_SHEETS_URL}?action=getData`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        if (response.ok) {
          const remoteData = await response.json();
          if (remoteData?.leaderboard && Array.isArray(remoteData.leaderboard)) {
            this.data = remoteData;
            safeStorage.setItem(STORAGE_KEYS.LOCAL_DATA_CACHE, JSON.stringify(remoteData));
            safeStorage.setItem(STORAGE_KEYS.LEADERBOARD_LOCAL, JSON.stringify(remoteData.leaderboard));
            list = [...remoteData.leaderboard];
          }
        }
      } catch (err) {
        console.warn('[DataService] Failed to load online leaderboard, falling back to local cache:', err);
      }
    }

    // Coba ambil dari storage lokal jika belum didapatkan
    if (list.length === 0) {
      try {
        const stored = safeStorage.getItem(STORAGE_KEYS.LEADERBOARD_LOCAL);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            list = parsed;
          }
        }
      } catch (e) {
        console.warn(e);
      }
    }

    if (list.length === 0) {
      if (!this.data) {
        await this.loadData();
      }
      list = [...(this.data?.leaderboard || [])];
    }

    // Normalisasi dan hitung metrik untuk setiap baris
    list.forEach(item => {
      const pre = Number(item.Nilai_Pretest ?? item.nilaiPretest ?? 0);
      const post = Number(item.Nilai_Posttest ?? item.nilaiPosttest ?? item.Total_Skor ?? 0);
      const total = Number(item.Total_Skor ?? item.totalSkor ?? post);
      item.Nilai_Pretest = pre;
      item.Nilai_Posttest = post;
      item.Total_Skor = total;
      item.Peningkatan = post - pre;

      let nGain = 0;
      if (100 - pre <= 0) {
        nGain = post >= 100 ? 1.0 : 0.0;
      } else {
        nGain = Math.round(((post - pre) / (100 - pre)) * 100) / 100;
      }
      item.Nilai_NGain = nGain;
    });

    list.sort((a, b) => {
      const scoreA = Number(a.Total_Skor);
      const scoreB = Number(b.Total_Skor);
      if (scoreB !== scoreA) return scoreB - scoreA;
      const postA = Number(a.Nilai_Posttest);
      const postB = Number(b.Nilai_Posttest);
      if (postB !== postA) return postB - postA;
      return Number(b.Nilai_Pretest) - Number(a.Nilai_Pretest);
    });

    return list;
  }

  /**
   * Mengambil progres eksplorasi 4 struktur generic Slide 6
   * @returns {string[]}
   */
  getSlide6Progress() {
    try {
      const key = this.getStorageKeyWithNISN(STORAGE_KEYS.SLIDE6_STRUCTURES);
      const val = (key && safeStorage.getItem(key)) || safeStorage.getItem(STORAGE_KEYS.SLIDE6_STRUCTURES);
      return val ? JSON.parse(val) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Menyimpan progres eksplorasi struktur generic Slide 6
   * @param {string[]} structures
   */
  saveSlide6Progress(structures) {
    try {
      const json = JSON.stringify(structures);
      const key = this.getStorageKeyWithNISN(STORAGE_KEYS.SLIDE6_STRUCTURES);
      if (key) safeStorage.setItem(key, json);
      safeStorage.setItem(STORAGE_KEYS.SLIDE6_STRUCTURES, json);
    } catch (e) {
      // ignore
    }
  }

  /**
   * Mengambil progres eksplorasi 5 fitur bahasa Slide 11
   * @returns {string[]}
   */
  getSlide11Progress() {
    try {
      const key = this.getStorageKeyWithNISN(STORAGE_KEYS.SLIDE11_FEATURES);
      const val = (key && safeStorage.getItem(key)) || safeStorage.getItem(STORAGE_KEYS.SLIDE11_FEATURES);
      return val ? JSON.parse(val) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Menyimpan progres eksplorasi fitur bahasa Slide 11
   * @param {string[]} features
   */
  saveSlide11Progress(features) {
    try {
      const json = JSON.stringify(features);
      const key = this.getStorageKeyWithNISN(STORAGE_KEYS.SLIDE11_FEATURES);
      if (key) safeStorage.setItem(key, json);
      safeStorage.setItem(STORAGE_KEYS.SLIDE11_FEATURES, json);
    } catch (e) {
      // ignore
    }
  }

  /**
   * Reset data sesi siswa aktif
   */
  clearSession() {
    const slideKey = this.getStorageKeyWithNISN(STORAGE_KEYS.MAX_SLIDE_VISITED);
    const introKey = this.getStorageKeyWithNISN(STORAGE_KEYS.INTRO_COMPLETED);
    const pretestKey = this.getStorageKeyWithNISN(STORAGE_KEYS.PRETEST_SCORE);
    const posttestKey = this.getStorageKeyWithNISN(STORAGE_KEYS.POSTTEST_SCORE);
    const slide6Key = this.getStorageKeyWithNISN(STORAGE_KEYS.SLIDE6_STRUCTURES);
    const slide11Key = this.getStorageKeyWithNISN(STORAGE_KEYS.SLIDE11_FEATURES);

    this.currentStudent = null;
    this.pretestScore = null;
    this.posttestScore = null;
    this.maxSlideVisited = 1;

    safeStorage.removeItem(STORAGE_KEYS.CURRENT_STUDENT);
    safeStorage.removeItem(STORAGE_KEYS.PRETEST_SCORE);
    safeStorage.removeItem(STORAGE_KEYS.POSTTEST_SCORE);
    safeStorage.removeItem(STORAGE_KEYS.MAX_SLIDE_VISITED);
    safeStorage.removeItem(STORAGE_KEYS.INTRO_COMPLETED);
    safeStorage.removeItem(STORAGE_KEYS.SLIDE6_STRUCTURES);
    safeStorage.removeItem(STORAGE_KEYS.SLIDE11_FEATURES);
    if (slideKey) safeStorage.removeItem(slideKey);
    if (introKey) safeStorage.removeItem(introKey);
    if (pretestKey) safeStorage.removeItem(pretestKey);
    if (posttestKey) safeStorage.removeItem(posttestKey);
    if (slide6Key) safeStorage.removeItem(slide6Key);
    if (slide11Key) safeStorage.removeItem(slide11Key);
  }
}

export const dataService = new DataService();
