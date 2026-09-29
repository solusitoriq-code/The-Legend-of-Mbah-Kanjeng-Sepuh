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
    if (this.currentStudent) {
      const id = this.currentStudent.NISN || this.currentStudent.NIS;
      if (id) return `${baseKey}_${id}`;
    }
    return baseKey;
  }

  /**
   * Menyinkronkan dan memuat skor pretest & posttest tertinggi siswa yang aktif
   * dari LocalStorage, cache Leaderboard, dan data.leaderboard
   * @param {object} student
   */
  syncStudentScores(student = this.currentStudent) {
    if (!student) return;
    const nisn = String(student.NISN || '').trim();
    const nis = String(student.NIS || '').trim();
    const nama = String(student.Nama || '').trim().toLowerCase();

    const pretestKey = this.getStorageKeyWithNISN(STORAGE_KEYS.PRETEST_SCORE);
    const posttestKey = this.getStorageKeyWithNISN(STORAGE_KEYS.POSTTEST_SCORE);
    const slideKey = this.getStorageKeyWithNISN(STORAGE_KEYS.MAX_SLIDE_VISITED);

    let maxPre = null;
    let maxPost = null;

    // 1. Cek storage siswa saat ini (mendukung identitas NISN dan NIS)
    const candidatePreKeys = [pretestKey, nisn ? `${STORAGE_KEYS.PRETEST_SCORE}_${nisn}` : null, nis ? `${STORAGE_KEYS.PRETEST_SCORE}_${nis}` : null].filter(Boolean);
    for (const k of candidatePreKeys) {
      const val = safeStorage.getItem(k);
      if (val !== null && val !== '' && !isNaN(Number(val))) {
        const n = Number(val);
        if (maxPre === null || n > maxPre) maxPre = n;
      }
    }

    const candidatePostKeys = [posttestKey, nisn ? `${STORAGE_KEYS.POSTTEST_SCORE}_${nisn}` : null, nis ? `${STORAGE_KEYS.POSTTEST_SCORE}_${nis}` : null].filter(Boolean);
    for (const k of candidatePostKeys) {
      const val = safeStorage.getItem(k);
      if (val !== null && val !== '' && !isNaN(Number(val))) {
        const n = Number(val);
        if (maxPost === null || n > maxPost) maxPost = n;
      }
    }

    // 2. Cek semua sumber leaderboard (cache lokal & data yang dimuat)
    let lbEntries = [];
    try {
      const storedLb = safeStorage.getItem(STORAGE_KEYS.LEADERBOARD_LOCAL);
      if (storedLb) lbEntries = JSON.parse(storedLb);
    } catch (e) {}

    if (this.data?.leaderboard && Array.isArray(this.data.leaderboard)) {
      lbEntries = [...lbEntries, ...this.data.leaderboard];
    }

    const matches = lbEntries.filter(item => {
      const iNISN = String(item.NISN || item.nisn || '').trim();
      const iNIS = String(item.NIS || item.nis || '').trim();
      const iNama = String(item.Nama || item.nama || '').trim().toLowerCase();
      return (nisn && iNISN === nisn) || (nis && iNIS === nis) || (nama && iNama === nama);
    });

    matches.forEach(item => {
      const pre = item.Nilai_Pretest ?? item.nilaiPretest;
      const post = item.Nilai_Posttest ?? item.nilaiPosttest ?? item.Total_Skor ?? item.totalSkor;
      if (pre !== undefined && pre !== null && pre !== '' && !isNaN(Number(pre))) {
        const numPre = Number(pre);
        if (maxPre === null || numPre > maxPre) maxPre = numPre;
      }
      if (post !== undefined && post !== null && post !== '' && !isNaN(Number(post))) {
        const numPost = Number(post);
        if (maxPost === null || numPost > maxPost) maxPost = numPost;
      }
    });

    this.pretestScore = maxPre;
    this.posttestScore = maxPost;

    if (maxPre !== null) {
      safeStorage.setItem(pretestKey, String(maxPre));
      safeStorage.setItem(STORAGE_KEYS.PRETEST_SCORE, String(maxPre));
    }
    if (maxPost !== null) {
      safeStorage.setItem(posttestKey, String(maxPost));
      safeStorage.setItem(STORAGE_KEYS.POSTTEST_SCORE, String(maxPost));
      // Jika memiliki skor post test, semua slide terbuka (max slide = 17)
      this.maxSlideVisited = 17;
      safeStorage.setItem(slideKey, '17');
    } else {
      let candidateSlide = null;
      const candidateSlideKeys = [slideKey, nisn ? `${STORAGE_KEYS.MAX_SLIDE_VISITED}_${nisn}` : null, nis ? `${STORAGE_KEYS.MAX_SLIDE_VISITED}_${nis}` : null].filter(Boolean);
      for (const k of candidateSlideKeys) {
        const val = safeStorage.getItem(k);
        if (val !== null && !isNaN(parseInt(val, 10))) {
          const s = parseInt(val, 10);
          if (candidateSlide === null || s > candidateSlide) candidateSlide = s;
        }
      }
      this.maxSlideVisited = candidateSlide !== null ? Math.max(1, candidateSlide) : 1;
    }
  }

  initFromStorage() {
    try {
      const savedStudent = safeStorage.getItem(STORAGE_KEYS.CURRENT_STUDENT);
      if (savedStudent) {
        this.currentStudent = JSON.parse(savedStudent);
        this.syncStudentScores(this.currentStudent);
      }
      const pretestKey = this.getStorageKeyWithNISN(STORAGE_KEYS.PRETEST_SCORE);
      const savedPretest = safeStorage.getItem(pretestKey) || safeStorage.getItem(STORAGE_KEYS.PRETEST_SCORE);
      if (savedPretest !== null && this.pretestScore === null) {
        this.pretestScore = Number(savedPretest);
      }
      const posttestKey = this.getStorageKeyWithNISN(STORAGE_KEYS.POSTTEST_SCORE);
      const savedPosttest = safeStorage.getItem(posttestKey) || safeStorage.getItem(STORAGE_KEYS.POSTTEST_SCORE);
      if (savedPosttest !== null && this.posttestScore === null) {
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
        if (this.currentStudent) {
          this.syncStudentScores(this.currentStudent);
        }
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
              if (this.currentStudent) this.syncStudentScores(this.currentStudent);
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
        if (this.currentStudent) this.syncStudentScores(this.currentStudent);
      } else {
        // Mode LOCAL: Muat dari berkas materi_evaluasi.json
        const response = await fetch(CONFIG.LOCAL_DATA_PATH, {
          cache: 'no-cache'
        });
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        this.data = await response.json();
        safeStorage.setItem(STORAGE_KEYS.LOCAL_DATA_CACHE, JSON.stringify(this.data));
        if (this.currentStudent) this.syncStudentScores(this.currentStudent);
      }
      this.isLoaded = true;
      return this.data;
    } catch (error) {
      console.warn('[DataService] Failed to load data, attempting local cache:', error);
      const cached = safeStorage.getItem(STORAGE_KEYS.LOCAL_DATA_CACHE);
      if (cached) {
        this.data = JSON.parse(cached);
        this.isLoaded = true;
        if (this.currentStudent) this.syncStudentScores(this.currentStudent);
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
      this.syncStudentScores(found);
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
   * Menyeragamkan daftar soal Post-test (10 MCQ + 1 Soal Matching terpadu dengan 5 pasang kartu)
   * @param {Array} questions
   * @returns {Array}
   */
  normalizePosttestQuestions(questions) {
    if (!Array.isArray(questions)) return POSTTEST_QUESTIONS;

    const matchingQuestions = questions.filter(q => (q?.Tipe || '').toLowerCase() === 'matching');
    if (matchingQuestions.length <= 1) {
      return questions;
    }

    const mcqQuestions = questions.filter(q => (q?.Tipe || '').toLowerCase() !== 'matching');

    const combinedMatching = {
      ID: mcqQuestions.length + 1,
      Tipe: 'matching',
      Pertanyaan: 'Match each base verb (Column A) with its correct irregular past simple form (Column B) based on the actions performed in the story!',
      Opsi_A: '',
      Opsi_B: '',
      Opsi_C: '',
      Opsi_D: '',
      Opsi_E: '',
      Kunci: '',
      Pasangan_Kiri: 'Leave|Throw|Dig|Bring|Build',
      Pasangan_Kanan: 'left|threw|dug|brought|built',
      Pembahasan: 'Answer Key: Leave ➔ left | Throw ➔ threw | Dig ➔ dug | Bring ➔ brought | Build ➔ built.'
    };

    return [...mcqQuestions, combinedMatching];
  }

  /**
   * Mengambil daftar soal Post-test (10 soal MCQ & 1 soal Matching terpadu)
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
      return this.normalizePosttestQuestions(questions);
    }
    return POSTTEST_QUESTIONS;
  }

  /**
   * Mengambil daftar kosakata Glossary dari Google Sheets atau fallback hardcode
   * @returns {Promise<Array>}
   */
  async getGlossary() {
    // Coba ambil dari Google Sheets API
    if (CONFIG.MODE === 'GOOGLE_SHEETS' && CONFIG.GOOGLE_SHEETS_URL) {
      try {
        const resp = await fetch(`${CONFIG.GOOGLE_SHEETS_URL}?action=getGlossary`, {
          headers: { 'Accept': 'application/json' }
        });
        if (resp.ok) {
          const json = await resp.json();
          if (json && json.success && Array.isArray(json.glossary) && json.glossary.length > 0) {
            return json.glossary;
          }
        }
      } catch (err) {
        console.warn('[DataService] getGlossary remote failed, using fallback:', err);
      }
    }

    // Fallback hardcode (16 kata dari Glossary.docx)
    return [
      { No: 1, Kata: 'Protagonist', Pronounsiasi: '/ˈproʊ.tæɡ.ə.nɪst/', Jenis_Kata: 'Noun', English_Meaning: 'The main or central character in a story, play, or narrative.', Arti_ID: 'Tokoh utama dalam cerita naratif.', Contoh_Kalimat: 'Kanjeng Sepuh is the benevolent protagonist of the legend.' },
      { No: 2, Kata: 'Drought', Pronounsiasi: '/draʊt/', Jenis_Kata: 'Noun', English_Meaning: 'A prolonged period of abnormally low rainfall leading to a severe shortage of water.', Arti_ID: 'Bencana kekeringan / musim kemarau panjang yang parah.', Contoh_Kalimat: 'A severe drought destroyed the farms along the Lamongan-Tuban border.' },
      { No: 3, Kata: 'Disruption', Pronounsiasi: '/dɪsˈrʌp.ʃən/', Jenis_Kata: 'Noun', English_Meaning: 'A disturbance or problem that interrupts an event, activity, or continuous peaceful state.', Arti_ID: 'Gangguan / kekacauan yang merusak ketentraman.', Contoh_Kalimat: 'Unfair colonial taxes caused severe economic disruption for native merchants.' },
      { No: 4, Kata: 'Excavate', Pronounsiasi: '/ˈek.skə.veɪt/', Jenis_Kata: 'Verb', English_Meaning: 'To make a hole or channel by digging out earth, stone, or sand.', Arti_ID: 'Menggali / mengeruk tanah.', Contoh_Kalimat: 'Kanjeng Sepuh excavated a vital canal known as Kalibela.' },
      { No: 5, Kata: 'Confront', Pronounsiasi: '/kənˈfrʌnt/', Jenis_Kata: 'Verb', English_Meaning: 'To face, meet, or stand up to someone or something in an assertive or courageous way.', Arti_ID: 'Menghadapi secara berani / menentang secara langsung.', Contoh_Kalimat: 'He confronted the colonial officers without any fear.' },
      { No: 6, Kata: 'Relic', Pronounsiasi: '/ˈrel.ɪk/', Jenis_Kata: 'Noun', English_Meaning: 'An object, structure, or custom that has survived from an earlier historical era.', Arti_ID: 'Peninggalan bersejarah / artefak peninggalan masa lampau.', Contoh_Kalimat: 'The sacred spring of Telaga Rambit remains an enduring historical relic.' },
      { No: 7, Kata: 'Enduring', Pronounsiasi: '/ɪnˈdjʊər.ɪŋ/', Jenis_Kata: 'Adjective', English_Meaning: 'Lasting for a very long time; continuing or long-lived across generations.', Arti_ID: 'Abadi / bertahan lama melintasi zaman.', Contoh_Kalimat: 'His moral teachings left an enduring legacy in Sedayu.' },
      { No: 8, Kata: 'Humility', Pronounsiasi: '/hjuːˈmɪl.ɪ.ti/', Jenis_Kata: 'Noun', English_Meaning: 'The quality of being modest, respectful, and not considering oneself better than others.', Arti_ID: 'Kerendahan hati / sikap tidak sombong.', Contoh_Kalimat: 'Despite his royal background, he showed great humility toward the farmers.' },
      { No: 9, Kata: 'Decree', Pronounsiasi: '/dɪˈkriː/', Jenis_Kata: 'Noun', English_Meaning: 'An official order, command, or legal proclamation issued by an authority or ruler.', Arti_ID: 'Surat ketetapan / titah resmi / surat perintah penguasa.', Contoh_Kalimat: 'He firmly pushed aside the unfair tax decree.' },
      { No: 10, Kata: 'Steed', Pronounsiasi: '/stiːd/', Jenis_Kata: 'Noun', English_Meaning: 'A noble, high-spirited, or well-trained horse used for riding.', Arti_ID: 'Kuda tunggangan yang gagah / luhur.', Contoh_Kalimat: 'He entrusted his noble steeds to Kyai Jayeng Katon in Ujungpangkah.' },
      { No: 11, Kata: 'Vanity', Pronounsiasi: '/ˈvæn.ɪ.ti/', Jenis_Kata: 'Noun', English_Meaning: "Excessive pride in one's own appearance, status, abilities, or achievements.", Arti_ID: 'Kesombongan / kebanggaan diri yang berlebihan / kepamrihan.', Contoh_Kalimat: 'He stated that a throne is not for personal vanity.' },
      { No: 12, Kata: 'Subjugation', Pronounsiasi: '/ˌsʌb.dʒʊˈɡeɪ.ʃən/', Jenis_Kata: 'Noun', English_Meaning: 'The act of conquering, defeating, or bringing someone under complete political or military control.', Arti_ID: 'Penaklukan / penundukan / penindasan kekuasaan.', Contoh_Kalimat: 'The local community resisted foreign subjugation.' },
      { No: 13, Kata: 'Overflow', Pronounsiasi: '/ˌoʊ.vəˈfloʊ/', Jenis_Kata: 'Verb', English_Meaning: 'To flow over the brim, edges, or limits because of excess liquid.', Arti_ID: 'Meluap / memancar berlimpah-limpah.', Contoh_Kalimat: 'The fresh springs overflowed, supplying water to thousands of villagers.' },
      { No: 14, Kata: 'Takeaway', Pronounsiasi: '/ˈteɪk.ə.weɪ/', Jenis_Kata: 'Noun', English_Meaning: 'A key fact, message, or moral point to be remembered from an event or story.', Arti_ID: 'Pesan inti / pelajaran moral yang dipetik dari suatu peristiwa.', Contoh_Kalimat: 'The primary takeaway of this legend is to lead with compassion and serve the weak.' },
      { No: 15, Kata: 'Reconcile', Pronounsiasi: '/ˈrek.ən.saɪl/', Jenis_Kata: 'Verb', English_Meaning: 'To restore friendly relations and settle differences between opposing parties.', Arti_ID: 'Mendamaikan / mempertemukan dua pihak yang berselisih.', Contoh_Kalimat: 'The canal effectively reconciled the two neighboring villages.' },
      { No: 16, Kata: 'Benevolent', Pronounsiasi: '/bɪˈnev.əl.ənt/', Jenis_Kata: 'Adjective', English_Meaning: 'Kind, generous, well-meaning, and actively dedicated to doing good for others.', Arti_ID: 'Penuh kebajikan / suka menolong / berhati mulia dan penyayang kepada rakyat.', Contoh_Kalimat: 'Kanjeng Sepuh was remembered as a benevolent leader who protected the vulnerable.' }
    ];
  }

  /**
   * Menyimpan skor Pretest (Hanya jika belum ada atau lebih tinggi dari nilai sebelumnya)
   * @param {number} score
   * @returns {{saved: boolean, isHighest: boolean, currentScore: number, newScore: number}}
   */
  savePretestScore(score) {
    const candidateScore = Math.round(Number(score));
    if (isNaN(candidateScore)) {
      return { saved: false, isHighest: false, currentScore: this.pretestScore, newScore: score };
    }

    this.syncStudentScores();

    const existingScore = (this.pretestScore !== null && this.pretestScore !== undefined && !isNaN(Number(this.pretestScore)))
      ? Number(this.pretestScore)
      : null;

    // Jika sudah ada nilai sebelumnya dan lebih tinggi atau sama, jangan simpan!
    if (existingScore !== null && existingScore >= candidateScore) {
      console.log(`[DataService] Nilai pretest baru (${candidateScore}) <= skor tertinggi sebelumnya (${existingScore}). Nilai tidak diubah.`);
      return {
        saved: false,
        isHighest: false,
        currentScore: existingScore,
        newScore: candidateScore
      };
    }

    this.pretestScore = candidateScore;
    try {
      const key = this.getStorageKeyWithNISN(STORAGE_KEYS.PRETEST_SCORE);
      safeStorage.setItem(key, String(candidateScore));
      safeStorage.setItem(STORAGE_KEYS.PRETEST_SCORE, String(candidateScore));
    } catch (e) {
      console.warn(e);
    }

    // Otomatis kirim nilai pretest ke database / data/materi_evaluasi.xlsx
    this.submitScore({
      nilaiPretest: candidateScore,
      isPretest: true
    }).catch(err => {
      console.warn('[DataService] Pretest auto-submit notice:', err);
    });

    return {
      saved: true,
      isHighest: true,
      currentScore: candidateScore,
      newScore: candidateScore
    };
  }

  getPretestScore() {
    return this.pretestScore;
  }

  /**
   * Menyimpan skor Post-test (Hanya jika belum ada atau lebih tinggi dari nilai sebelumnya)
   * @param {number} score
   * @returns {{saved: boolean, isHighest: boolean, currentScore: number, newScore: number}}
   */
  savePosttestScore(score) {
    const candidateScore = Math.round(Number(score));
    if (isNaN(candidateScore)) {
      return { saved: false, isHighest: false, currentScore: this.posttestScore, newScore: score };
    }

    this.syncStudentScores();

    const existingScore = (this.posttestScore !== null && this.posttestScore !== undefined && !isNaN(Number(this.posttestScore)))
      ? Number(this.posttestScore)
      : null;

    // Jika sudah ada nilai sebelumnya dan lebih tinggi atau sama, jangan simpan!
    if (existingScore !== null && existingScore >= candidateScore) {
      console.log(`[DataService] Nilai posttest baru (${candidateScore}) <= skor tertinggi sebelumnya (${existingScore}). Nilai tidak diubah.`);
      return {
        saved: false,
        isHighest: false,
        currentScore: existingScore,
        newScore: candidateScore
      };
    }

    this.posttestScore = candidateScore;
    try {
      const key = this.getStorageKeyWithNISN(STORAGE_KEYS.POSTTEST_SCORE);
      safeStorage.setItem(key, String(candidateScore));
      safeStorage.setItem(STORAGE_KEYS.POSTTEST_SCORE, String(candidateScore));
    } catch (e) {
      console.warn(e);
    }

    return {
      saved: true,
      isHighest: true,
      currentScore: candidateScore,
      newScore: candidateScore
    };
  }

  getPosttestScore() {
    return this.posttestScore;
  }

  /**
   * Mengecek apakah siswa aktif memiliki skor Post-test yang valid
   * @returns {boolean}
   */
  hasPosttestScore() {
    return this.posttestScore !== null && this.posttestScore !== undefined && !isNaN(Number(this.posttestScore));
  }

  /**
   * Mengecek apakah siswa aktif memiliki skor Pretest yang valid
   * @returns {boolean}
   */
  hasPretestScore() {
    return this.pretestScore !== null && this.pretestScore !== undefined && !isNaN(Number(this.pretestScore));
  }

  /**
   * Mengambil slide tertinggi yang pernah dikunjungi siswa
   */
  getMaxSlideVisited() {
    if (this.hasPosttestScore()) {
      return 17;
    }
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
    if (this.hasPosttestScore()) {
      this.maxSlideVisited = 17;
      return 17;
    }
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
    if (this.hasPosttestScore()) {
      return true;
    }
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
   * Mengecek apakah Post-test (Slide 15) sudah terbuka.
   * Syarat: harus lewati slide 0 (pretest) dan slide 1-14, ATAU sudah memiliki nilai post-test.
   */
  isPosttestUnlocked() {
    if (this.hasPosttestScore()) {
      return true;
    }
    const hasPretest = this.hasPretestScore();
    const hasPassedThrough14 = this.getMaxSlideVisited() >= 14;
    return Boolean(hasPretest && hasPassedThrough14);
  }

  /**
   * Mengirim / menyimpan skor evaluasi siswa ke data/materi_evaluasi.xlsx & Leaderboard
   * @param {object} payload { timestamp, nisn, nama, nilaiPretest, nilaiPosttest, totalSkor, isPretest }
   */
  async submitScore(payload) {
    if (!this.data) {
      await this.loadData();
    }

    this.syncStudentScores();

    const pad = (n) => String(n).padStart(2, '0');
    const now = new Date();
    const defaultTimestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const isPretestOnly = Boolean(payload.isPretest || (payload.nilaiPosttest === undefined && payload.nilaiPretest !== undefined));

    // Bandingkan dengan nilai tertinggi yang tersimpan di memori & storage
    let finalPre = (this.pretestScore !== null && this.pretestScore !== undefined && !isNaN(Number(this.pretestScore)))
      ? Number(this.pretestScore)
      : undefined;

    if (payload.nilaiPretest !== undefined && payload.nilaiPretest !== null && !isNaN(Number(payload.nilaiPretest))) {
      const candidatePre = Math.round(Number(payload.nilaiPretest));
      if (finalPre === undefined || candidatePre > finalPre) {
        finalPre = candidatePre;
      }
    }

    let finalPost = (this.posttestScore !== null && this.posttestScore !== undefined && !isNaN(Number(this.posttestScore)))
      ? Number(this.posttestScore)
      : undefined;

    if (payload.nilaiPosttest !== undefined && payload.nilaiPosttest !== null && !isNaN(Number(payload.nilaiPosttest))) {
      const candidatePost = Math.round(Number(payload.nilaiPosttest));
      if (finalPost === undefined || candidatePost > finalPost) {
        finalPost = candidatePost;
      }
    }

    if (finalPre !== undefined) this.pretestScore = finalPre;
    if (finalPost !== undefined) this.posttestScore = finalPost;

    const totalVal = Number(payload.totalSkor ?? finalPost ?? finalPre ?? 0);

    // Hitung N-Gain Hake jika pretest dan posttest ada
    let nGain = 0;
    if (finalPre !== undefined && finalPost !== undefined) {
      if (100 - finalPre <= 0) {
        nGain = finalPost >= 100 ? 1.0 : 0.0;
      } else {
        nGain = Math.round(((finalPost - finalPre) / (100 - finalPre)) * 100) / 100;
      }
    }

    const record = {
      Timestamp: payload.timestamp || payload.Timestamp || defaultTimestamp,
      NISN: payload.nisn || payload.NISN || this.currentStudent?.NISN || '-',
      Nama: payload.nama || payload.Nama || this.currentStudent?.Nama || 'Student',
      Nilai_Pretest: finalPre !== undefined ? finalPre : 0,
      Nilai_Posttest: finalPost !== undefined ? finalPost : (isPretestOnly ? '' : 0),
      Total_Skor: totalVal,
      Peningkatan: (finalPre !== undefined && finalPost !== undefined) ? (finalPost - finalPre) : 0,
      Nilai_NGain: nGain,
      timestamp: payload.timestamp || defaultTimestamp,
      nisn: payload.nisn || this.currentStudent?.NISN || '-',
      nama: payload.nama || this.currentStudent?.Nama || 'Student',
      nilaiPretest: finalPre,
      nilaiPosttest: finalPost,
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
        nilaiPretest: finalPre,
        nilaiPosttest: finalPost,
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

    // 3. Selalu perbarui cache leaderboard lokal dengan skor tertinggi
    try {
      let localLb = [];
      const stored = safeStorage.getItem(STORAGE_KEYS.LEADERBOARD_LOCAL);
      if (stored) {
        localLb = JSON.parse(stored);
      } else if (this.data?.leaderboard) {
        localLb = [...this.data.leaderboard];
      }

      const cleanNISN = String(record.NISN || record.nisn || '').trim();
      const existingEntry = localLb.find(item => String(item.NISN || item.nisn).trim() === cleanNISN);
      if (existingEntry) {
        const oldPre = existingEntry.Nilai_Pretest ?? existingEntry.nilaiPretest;
        const oldPost = existingEntry.Nilai_Posttest ?? existingEntry.nilaiPosttest;
        if (oldPre !== undefined && oldPre !== null && !isNaN(Number(oldPre))) {
          finalPre = (finalPre !== undefined) ? Math.max(finalPre, Number(oldPre)) : Number(oldPre);
        }
        if (oldPost !== undefined && oldPost !== null && !isNaN(Number(oldPost))) {
          finalPost = (finalPost !== undefined) ? Math.max(finalPost, Number(oldPost)) : Number(oldPost);
        }
        record.Nilai_Pretest = finalPre !== undefined ? finalPre : 0;
        record.nilaiPretest = finalPre;
        if (finalPost !== undefined) {
          record.Nilai_Posttest = finalPost;
          record.nilaiPosttest = finalPost;
          record.Total_Skor = finalPost;
          record.totalSkor = finalPost;
        }
      }

      // Hapus entri lama dengan NISN yang sama jika ada, lalu tambahkan yang baru
      localLb = localLb.filter(item => String(item.NISN || item.nisn).trim() !== cleanNISN);
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
  /**
   * Menormalisasi dan mengurutkan entri data leaderboard
   * @param {Array} list
   * @returns {Array}
   */
  normalizeLeaderboardList(list) {
    if (!Array.isArray(list) || list.length === 0) return [];

    const normalized = list.map(item => {
      const pre = Number(item.Nilai_Pretest ?? item.nilaiPretest ?? 0);
      const post = Number(item.Nilai_Posttest ?? item.nilaiPosttest ?? item.Total_Skor ?? 0);
      const total = Number(item.Total_Skor ?? item.totalSkor ?? post);

      let nGain = 0;
      if (100 - pre <= 0) {
        nGain = post >= 100 ? 1.0 : 0.0;
      } else {
        nGain = Math.round(((post - pre) / (100 - pre)) * 100) / 100;
      }

      return {
        ...item,
        Nilai_Pretest: pre,
        nilaiPretest: pre,
        Nilai_Posttest: post,
        nilaiPosttest: post,
        Total_Skor: total,
        totalSkor: total,
        Peningkatan: post - pre,
        Nilai_NGain: Number(item.Nilai_NGain ?? nGain)
      };
    });

    normalized.sort((a, b) => {
      const scoreA = Number(a.Total_Skor);
      const scoreB = Number(b.Total_Skor);
      if (scoreB !== scoreA) return scoreB - scoreA;
      const postA = Number(a.Nilai_Posttest);
      const postB = Number(b.Nilai_Posttest);
      if (postB !== postA) return postB - postA;
      return Number(b.Nilai_Pretest) - Number(a.Nilai_Pretest);
    });

    return normalized;
  }

  /**
   * Mengambil data leaderboard langsung dari memori atau penyimpanan lokal (sinkron, 0ms)
   * @returns {Array}
   */
  getCachedLeaderboard() {
    let list = [];

    // 1. Cek storage lokal
    try {
      const stored = safeStorage.getItem(STORAGE_KEYS.LEADERBOARD_LOCAL);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed;
        }
      }
    } catch (e) {
      // ignore
    }

    // 2. Cek memori this.data
    if (list.length === 0 && this.data?.leaderboard && Array.isArray(this.data.leaderboard)) {
      list = [...this.data.leaderboard];
    }

    // 3. Normalisasi & urutkan
    return this.normalizeLeaderboardList(list);
  }

  /**
   * Mengambil data leaderboard terurut dengan strategi Stale-While-Revalidate
   * Mengutamakan data lokal cepat dan memperbarui dari server lokal / Google Sheets di latar belakang
   * @returns {Promise<Array>}
   */
  async getLeaderboard() {
    let list = this.getCachedLeaderboard();

    // 1. Coba ambil data terbaru dari berkas lokal jika menjalankan server lokal
    try {
      const localResp = await Promise.race([
        fetch('./data/materi_evaluasi.json?_t=' + Date.now(), { cache: 'no-store' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
      ]);
      if (localResp && localResp.ok) {
        const localJson = await localResp.json();
        if (localJson?.leaderboard && Array.isArray(localJson.leaderboard) && localJson.leaderboard.length > 0) {
          list = this.normalizeLeaderboardList(localJson.leaderboard);
          safeStorage.setItem(STORAGE_KEYS.LEADERBOARD_LOCAL, JSON.stringify(list));
        }
      }
    } catch (e) {
      // Abaikan jika tidak tersedia
    }

    // 2. Jika mode GOOGLE_SHEETS aktif, gunakan action=getLeaderboard (ringan & cepat) dengan timeout 3.5 detik
    if (CONFIG.MODE === 'GOOGLE_SHEETS' && CONFIG.GOOGLE_SHEETS_URL) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const response = await fetch(`${CONFIG.GOOGLE_SHEETS_URL}?action=getLeaderboard`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response && response.ok) {
          const remoteData = await response.json();
          const remoteList = remoteData?.leaderboard || (Array.isArray(remoteData) ? remoteData : null);
          if (remoteList && Array.isArray(remoteList) && remoteList.length > 0) {
            list = this.normalizeLeaderboardList(remoteList);
            safeStorage.setItem(STORAGE_KEYS.LEADERBOARD_LOCAL, JSON.stringify(list));
          }
        }
      } catch (err) {
        console.warn('[DataService] Remote leaderboard sync timeout/failed, using local leaderboard:', err);
      }
    }

    // 3. Jika masih kosong, load fallback data
    if (list.length === 0) {
      if (!this.data) {
        await this.loadData();
      }
      list = this.normalizeLeaderboardList(this.data?.leaderboard || []);
    }

    return list;
  }

  /**
   * Mengambil progres eksplorasi 4 struktur generic Slide 6
   * @returns {string[]}
   */
  getSlide6Progress() {
    if (this.hasPosttestScore()) {
      return ['orientation', 'complication', 'resolution', 'coda'];
    }
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
    if (this.hasPosttestScore()) {
      return ['past_tense', 'time_conjunctions', 'action_verbs', 'saying_verbs', 'direct_speech'];
    }
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
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('evaluasi_current_student');
      }
    } catch (e) {}
  }
}

export const dataService = new DataService();
