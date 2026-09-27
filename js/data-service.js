/**
 * DATA-SERVICE.JS
 * Modul abstraksi data (Adapter Pattern) untuk Sistem Evaluasi & Leaderboard.
 * Mendukung mode luring (LOCAL JSON/XLSX) dan daring (GOOGLE_SHEETS).
 */

export const CONFIG = {
  // Mode operasional data: 'LOCAL' atau 'GOOGLE_SHEETS'
  MODE: 'LOCAL',

  // Lokasi data lokal (offline fallback)
  LOCAL_DATA_PATH: './data/materi_evaluasi.json',

  // URL Web App Google Apps Script (diisi saat mode GOOGLE_SHEETS diaktifkan)
  GOOGLE_SHEETS_URL: ''
};

const STORAGE_KEYS = {
  CURRENT_STUDENT: 'evaluasi_current_student',
  PRETEST_SCORE: 'evaluasi_pretest_score',
  POSTTEST_SCORE: 'evaluasi_posttest_score',
  LOCAL_DATA_CACHE: 'evaluasi_data_cache',
  LEADERBOARD_LOCAL: 'evaluasi_leaderboard_local',
  MAX_SLIDE_VISITED: 'evaluasi_max_slide_visited'
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
    } catch (e) {
      console.warn('[DataService] Gagal membaca session storage:', e);
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
      console.warn('[DataService] Memuat data gagal, mencoba cache lokal:', error);
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
   * Validasi NISN siswa
   * @param {string} nisn
   * @returns {Promise<{success: boolean, student?: object, message?: string}>}
   */
  async validateNISN(nisn) {
    const cleanNISN = String(nisn || '').trim();
    if (!cleanNISN) {
      return { success: false, message: 'Harap masukkan nomor NIS atau NISN Anda.' };
    }

    if (!this.data) {
      await this.loadData();
    }

    const students = this.data?.dataSiswa || [];
    let found = students.find(s => String(s.NISN).trim() === cleanNISN || (s.NIS && String(s.NIS).trim() === cleanNISN));

    // Jika mode GOOGLE_SHEETS aktif dan belum ditemukan di memori lokal, coba verifikasi daring
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

    if (found) {
      this.currentStudent = found;
      try {
        safeStorage.setItem(STORAGE_KEYS.CURRENT_STUDENT, JSON.stringify(found));
      } catch (e) {
        console.warn('[DataService] Gagal menyimpan data siswa ke local storage', e);
      }
      return { success: true, student: found };
    }

    return {
      success: false,
      message: `NIS/NISN "${cleanNISN}" tidak terdaftar di basis data.`
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
      await this.loadData();
    }
    return this.data?.soalPosttest || [];
  }

  /**
   * Menyimpan skor Pretest
   * @param {number} score
   */
  savePretestScore(score) {
    this.pretestScore = Number(score);
    try {
      safeStorage.setItem(STORAGE_KEYS.PRETEST_SCORE, String(score));
    } catch (e) {
      console.warn(e);
    }
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
   * Mengecek apakah Post-test (Slide 15) sudah terbuka
   */
  isPosttestUnlocked() {
    return this.getMaxSlideVisited() >= 14 || this.getPosttestScore() !== null;
  }

  /**
   * Mengirim / menyimpan skor evaluasi siswa ke Leaderboard
   * @param {object} payload { timestamp, nisn, nama, nilaiPretest, nilaiPosttest, totalSkor }
   */
  async submitScore(payload) {
    if (!this.data) {
      await this.loadData();
    }

    const pad = (n) => String(n).padStart(2, '0');
    const now = new Date();
    const defaultTimestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const preVal = Number(payload.nilaiPretest ?? payload.Nilai_Pretest ?? this.pretestScore ?? 0);
    const postVal = Number(payload.nilaiPosttest ?? payload.Nilai_Posttest ?? this.posttestScore ?? 0);
    const totalVal = Number(payload.totalSkor ?? payload.Total_Skor ?? postVal);

    // Hitung N-Gain Hake
    let nGain = 0;
    if (100 - preVal <= 0) {
      nGain = postVal >= 100 ? 1.0 : 0.0;
    } else {
      nGain = Math.round(((postVal - preVal) / (100 - preVal)) * 100) / 100;
    }

    const record = {
      Timestamp: payload.timestamp || payload.Timestamp || defaultTimestamp,
      NISN: payload.nisn || payload.NISN || this.currentStudent?.NISN || '-',
      Nama: payload.nama || payload.Nama || this.currentStudent?.Nama || 'Siswa',
      Nilai_Pretest: preVal,
      Nilai_Posttest: postVal,
      Total_Skor: totalVal,
      Peningkatan: postVal - preVal,
      Nilai_NGain: nGain,
      // Alias huruf kecil untuk kompatibilitas
      timestamp: payload.timestamp || defaultTimestamp,
      nisn: payload.nisn || this.currentStudent?.NISN || '-',
      nama: payload.nama || this.currentStudent?.Nama || 'Siswa',
      nilaiPretest: preVal,
      nilaiPosttest: postVal,
      totalSkor: totalVal
    };

    if (CONFIG.MODE === 'GOOGLE_SHEETS' && CONFIG.GOOGLE_SHEETS_URL) {
      try {
        await fetch(CONFIG.GOOGLE_SHEETS_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(record)
        });
      } catch (err) {
        console.warn('[DataService] Gagal kirim ke Google Sheets, mencadangkan ke lokal:', err);
      }
    }

    // Selalu perbarui cache leaderboard lokal
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
      console.warn('[DataService] Gagal perbarui leaderboard lokal:', e);
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
        console.warn('[DataService] Gagal memuat leaderboard daring, beralih ke cache lokal:', err);
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
   * Reset data sesi siswa aktif
   */
  clearSession() {
    const slideKey = this.getStorageKeyWithNISN(STORAGE_KEYS.MAX_SLIDE_VISITED);
    const pretestKey = this.getStorageKeyWithNISN(STORAGE_KEYS.PRETEST_SCORE);
    const posttestKey = this.getStorageKeyWithNISN(STORAGE_KEYS.POSTTEST_SCORE);

    this.currentStudent = null;
    this.pretestScore = null;
    this.posttestScore = null;
    this.maxSlideVisited = 1;

    safeStorage.removeItem(STORAGE_KEYS.CURRENT_STUDENT);
    safeStorage.removeItem(STORAGE_KEYS.PRETEST_SCORE);
    safeStorage.removeItem(STORAGE_KEYS.POSTTEST_SCORE);
    safeStorage.removeItem(STORAGE_KEYS.MAX_SLIDE_VISITED);
    if (slideKey) safeStorage.removeItem(slideKey);
    if (pretestKey) safeStorage.removeItem(pretestKey);
    if (posttestKey) safeStorage.removeItem(posttestKey);
  }
}

export const dataService = new DataService();
