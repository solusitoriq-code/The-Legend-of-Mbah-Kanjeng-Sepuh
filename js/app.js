import { sound } from './audio.js?v=20';
import { dataService } from './data-service.js?v=20';
import { FORMATIVE_GAME, GENERIC_STRUCTURES, LANGUAGE_FEATURES } from './quiz-data.js?v=20';

// Metadata for Slide Navigator Table of Contents
const SLIDE_DIRECTORY = [
  { id: 0, title: 'PRETEST', isPretest: true },
  { id: 3, title: 'Main Interactive Menu' },
  { id: 4, title: "Game: Let's find me!" },
  { id: 5, title: 'The Meaning of Legend' },
  { id: 6, title: 'The Generic Structure' },
  { id: 7, title: 'Orientation: Who, When, Where' },
  { id: 8, title: 'Complication: What Went Wrong' },
  { id: 9, title: 'Resolution: How Was It Fixed' },
  { id: 10, title: 'Coda: What is the Takeaway' },
  { id: 11, title: 'Language Features' },
  { id: 12, title: 'Video: The Legend of Mbah Kanjeng Sepuh' },
  { id: 13, title: 'Story: Raden Suryodiningrat' },
  { id: 14, title: 'Augmented Reality (AR)' },
  { id: 15, title: 'Evaluation Quiz (Post-test)' },
  { id: 16, title: 'Glossary (Vocabulary)' },
  { id: 17, title: 'Closing' }
];

class InteractivePresentationApp {
  constructor() {
    this.currentSlide = 1;
    this.totalSlides = 17; // slide 16 = Glosarium, slide 17 = Closing
    this.deferredPrompt = null;

    // Slide 16 Glosarium Single Card Slider State
    this.glossaryItems = [];
    this.glossaryCurrentIndex = 0;
    this.glossaryAudioState = 'idle'; // 'idle' | 'playing' | 'paused'
    this.glossaryUtterance = null;

    // Pelacak Progres Materi (Fase 4 Guided Navigation)
    this.maxSlideVisited = dataService.getMaxSlideVisited();

    // Post-test Evaluasi Akhir State (Fase 5)
    this.posttestQuestions = [];
    this.posttestIndex = 0;
    this.posttestAnswers = {};
    this.posttestScore = null;
    this.posttestActiveLeftId = null;
    this.posttestTempPairs = {};
    this.posttestAnswered = false;
    this.currentMatchingData = null;

    // Formative Mini Game State
    this.gameRound = 0;
    this.gameScore = 0;

    // Mobile Portrait Auto-Rotate State
    this.portraitRotationAngle = 90;
    this.isPortraitMode = false;

    // Pretest State (Fase 3)
    this.pretestQuestions = [];
    this.pretestIndex = 0;
    this.pretestAnswers = {};
    this.pretestScore = null;

    this.init();
  }

  init() {
    this.cacheDOM();
    this.initOrientationHandler();
    this.updateLockUI();
    this.updateSlide6LockUI();
    this.updateSlide11LockUI();
    this.renderDrawerList();
    this.bindEvents();
    const initialSlide = this.hasVisitedIntro() ? 3 : 1;
    this.goToSlide(initialSlide, false);
    if (this.hasVisitedIntro() && this.btnSlide3Prev) {
      this.btnSlide3Prev.style.display = 'none';
    }
    this.initPWA();
  }

  cacheDOM() {
    this.appContainer = document.getElementById('app-container');
    this.slideFrames = document.querySelectorAll('.slide-frame');
    this.progressBar = document.getElementById('progress-bar-fill');
    this.counterPill = document.getElementById('slide-counter-pill');

    // Splash Screen & NIS/NISN Verification Elements
    this.splashOverlay = document.getElementById('splash-screen');
    this.btnStartSplash = document.getElementById('btn-start-splash');
    this.btnCloseSplash = document.getElementById('btn-close-splash');
    this.inputNISN = document.getElementById('input-nisn');
    this.btnCheckNISN = document.getElementById('btn-check-nisn');
    this.feedbackNISN = document.getElementById('splash-nisn-feedback');
    this.studentCard = document.getElementById('splash-student-card');
    this.studentName = document.getElementById('student-name');
    this.studentNIS = document.getElementById('student-nis');
    this.studentNISN = document.getElementById('student-nisn');
    this.studentClass = document.getElementById('student-class');

    // Corner / navigation elements
    this.btnSlide3Prev = document.getElementById('btn-slide3-prev');

    // Video Elements (Opsional jika masih ada)
    this.videoSlide1 = document.getElementById('video-slide-1');
    this.videoSlide2 = document.getElementById('video-slide-2');

    // Slide 12 Video Modal Elements & YouTube State
    this.videoSlide12 = document.getElementById('youtube-player-slide12') || document.getElementById('video-slide-12');
    this.btnLaunchVideoSlide12 = document.getElementById('btn-launch-video-slide12');
    this.modalVideoSlide12 = document.getElementById('slide12-video-modal');
    this.backdropVideoSlide12 = document.getElementById('slide12-modal-backdrop');
    this.btnCloseVideoSlide12 = document.getElementById('btn-close-video-slide12');
    this.statusTextSlide12 = document.getElementById('slide12-status-text');
    this.watchStatusSlide12 = document.getElementById('slide12-watch-status');
    this.watchedPillSlide12 = document.getElementById('slide12-watched-pill');
    this.footerHintSlide12 = document.getElementById('slide12-footer-hint');
    this.closeIconSlide12 = document.getElementById('slide12-close-icon');
    this.isSlide12VideoCompleted = false;
    this.slide12MaxTimeWatched = 0;
    this.ytPlayerSlide12 = null;
    this.isYtPlayerReady = false;
    this.ytProgressInterval = null;

    // Slide 3 Hotspots & Lock Indicators
    this.hotspotMenuVideo = document.getElementById('btn-menu-video') || document.querySelector('.btn-menu-video');
    this.hotspotVideoLockBadge = document.getElementById('hotspot-video-lock-badge');
    this.hotspotMenuAr = document.getElementById('btn-menu-ar') || document.querySelector('.btn-menu-ar');
    this.hotspotArLockBadge = document.getElementById('hotspot-ar-lock-badge');
    this.hotspotMenuQuiz = document.getElementById('btn-menu-quiz') || document.getElementById('hotspot-menu-quiz') || document.querySelector('.btn-menu-quiz');
    this.hotspotQuizLockBadge = document.getElementById('hotspot-quiz-lock-badge');

    // Drawer
    this.drawer = document.getElementById('slide-drawer');
    this.drawerSlidesContainer = document.getElementById('drawer-slides-container');
    this.drawerProgressText = document.getElementById('drawer-progress-text');
    this.btnCloseDrawer = document.getElementById('btn-close-drawer');

    // Info Modal
    this.infoModal = document.getElementById('info-modal');
    this.modalTitle = document.getElementById('modal-title');
    this.modalBadge = document.getElementById('modal-badge');
    this.modalDesc = document.getElementById('modal-desc');
    this.modalExample = document.getElementById('modal-example');
    this.btnCloseInfoModal = document.getElementById('btn-close-info-modal');
    this.btnModalSpeaker = document.getElementById('btn-modal-speaker');
    this.modalSpeakerIcon = document.getElementById('modal-speaker-icon');
    this.modalSpeakerText = document.getElementById('modal-speaker-text');
    this.activeStructureAudioText = '';
    this.isAudioPlaying = false;
    this.isAudioPaused = false;
    this.currentUtterance = null;

    // Slide 6 Generic Structure Elements
    this.slide6Hotspots = document.querySelectorAll('#slide6-structure-hotspots [data-structure]');
    this.btnSlide6Next = document.getElementById('btn-slide6-next');
    this.slide6HalfNext = document.getElementById('slide6-half-next');
    this.slide6ProgressBadge = document.getElementById('slide6-progress-badge');
    this.slide6Count = document.getElementById('slide6-count');
    this.slide6ViewedStructures = new Set(dataService.getSlide6Progress());

    // Slide 11 Language Features Elements
    this.slide11Cards = document.querySelectorAll('#slide11-cards-container [data-feature]');
    this.btnSlide11Next = document.getElementById('btn-slide11-next');
    this.slide11HalfNext = document.getElementById('slide11-half-next');
    this.slide11ProgressBadge = document.getElementById('slide11-progress-badge');
    this.slide11Count = document.getElementById('slide11-count');
    this.slide11ViewedFeatures = new Set(dataService.getSlide11Progress());

    // Glosarium Modal
    this.glosariumModal = document.getElementById('glosarium-modal');
    this.btnOpenGlosarium = document.getElementById('btn-menu-glosarium');
    this.btnCloseGlosarium = document.getElementById('btn-close-glosarium');
    this.glosariumSearch = document.getElementById('glosarium-search');
    this.glosariumGrid = document.getElementById('glosarium-items-grid');

    // Glossary Vocabulary Slide 16 — tabel dirender saat masuk slide
    this.glossaryTableBody = document.getElementById('glossary-table-body');
    this.btnSlide16Glossary = null;  // tidak digunakan lagi (sekarang slide 16 adalah halaman Glosarium)
    this.glossaryModalOverlay = null;
    this.btnGlossaryClose = null;

    // HUD Buttons & Quick Menu
    this.topHUD = document.getElementById('top-hud');
    this.btnHUDMenuToggle = document.getElementById('btn-hud-menu-toggle');
    this.hudActionsMenu = document.getElementById('hud-actions-menu');
    this.btnSFX = document.getElementById('btn-toggle-sfx');
    this.btnFullscreen = document.getElementById('btn-toggle-fullscreen');
    this.btnFlipOrientation = document.getElementById('btn-flip-orientation');
    this.btnInstallPWA = document.getElementById('btn-install-pwa');

    // Toast
    this.toast = document.getElementById('toast-notification');

    // Formative Game Elements
    this.gameIntroScreen = document.getElementById('game-intro-screen');
    this.gamePlayScreen = document.getElementById('game-play-screen');
    this.gameRoundIndicator = document.getElementById('game-round-indicator');
    this.gameVerbPrompt = document.getElementById('game-verb-prompt');
    this.gameSentenceText = document.getElementById('game-sentence-text');
    this.gameOptionsContainer = document.getElementById('game-options-container');
    this.btnStartVerbGame = document.getElementById('btn-start-verb-game');

    // Post-test Elements (Fase 5)
    this.quizModal = document.getElementById('quiz-modal-box');
    this.btnLaunchQuiz = document.getElementById('btn-launch-quiz-modal');
    this.btnCloseQuiz = document.getElementById('btn-close-quiz');
    this.posttestStartView = document.getElementById('posttest-start-view');
    this.posttestStartStudentName = document.getElementById('posttest-start-student-name');
    this.posttestStartStudentClass = document.getElementById('posttest-start-student-class');
    this.posttestStartStudentNisn = document.getElementById('posttest-start-student-nisn');
    this.posttestPrevScorePill = document.getElementById('posttest-prev-score-pill');
    this.posttestPrevScoreVal = document.getElementById('posttest-prev-score-val');
    this.posttestQuizView = document.getElementById('posttest-quiz-view');
    this.posttestTypeBadge = document.getElementById('posttest-type-badge');
    this.posttestCounter = document.getElementById('posttest-counter');
    this.posttestStudentTag = document.getElementById('posttest-student-tag');
    this.posttestProgressFill = document.getElementById('posttest-progress-fill');
    this.posttestQuestionText = document.getElementById('posttest-question-text');
    this.posttestMcqContainer = document.getElementById('posttest-mcq-container');
    this.posttestOptionsList = document.getElementById('posttest-options-list');
    this.posttestMatchingContainer = document.getElementById('posttest-matching-container');
    this.posttestMatchingHint = document.getElementById('posttest-matching-hint');
    this.matchingItemsLeft = document.getElementById('matching-items-left');
    this.matchingItemsRight = document.getElementById('matching-items-right');
    this.matchingStatusText = document.getElementById('matching-status-text');
    this.btnResetMatching = document.getElementById('btn-reset-matching');
    this.btnVerifyMatching = document.getElementById('btn-verify-matching');
    this.posttestExplanationBox = document.getElementById('posttest-explanation-box');
    this.posttestFooter = document.getElementById('posttest-footer');
    this.posttestHint = document.getElementById('posttest-hint');
    this.btnNextQuestion = document.getElementById('btn-next-question');

    // Post-test Result & Leaderboard Elements (Fase 6)
    this.quizResultScreen = document.getElementById('posttest-result-screen');
    this.posttestSummaryName = document.getElementById('posttest-summary-name');
    this.posttestSummaryClass = document.getElementById('posttest-summary-class');
    this.posttestSummaryNISN = document.getElementById('posttest-summary-nisn');
    this.posttestFinalScore = document.getElementById('posttest-final-score');
    this.posttestScoreBreakdown = document.getElementById('posttest-score-breakdown');
    this.posttestCompPretest = document.getElementById('posttest-comp-pretest');
    this.posttestCompPosttest = document.getElementById('posttest-comp-posttest');
    this.posttestCompGain = document.getElementById('posttest-comp-gain');
    this.posttestCompNGain = document.getElementById('posttest-comp-ngain');
    this.posttestCompNGainBadge = document.getElementById('posttest-comp-ngain-badge');
    this.ngainCategoryPill = document.getElementById('ngain-category-pill');
    this.ngainDescText = document.getElementById('ngain-desc-text');
    this.ngainProgressFill = document.getElementById('ngain-progress-fill');
    this.tabBtnSummary = document.getElementById('tab-btn-summary');
    this.tabBtnLeaderboard = document.getElementById('tab-btn-leaderboard');
    this.tabPaneSummary = document.getElementById('tab-pane-summary');
    this.tabPaneLeaderboard = document.getElementById('tab-pane-leaderboard');
    this.btnViewLeaderboardTab = document.getElementById('btn-view-leaderboard-tab');
    this.leaderboardMyStatus = document.getElementById('leaderboard-my-status');
    this.myRankText = document.getElementById('my-rank-text');
    this.leaderboardAvgPill = document.getElementById('leaderboard-avg-pill');
    this.leaderboardTopPill = document.getElementById('leaderboard-top-pill');
    this.leaderboardTableBody = document.getElementById('leaderboard-table-body');
    this.btnRetryQuiz = document.getElementById('btn-retry-quiz');
    this.btnBackToStart = document.getElementById('btn-back-to-start');
    this.btnFinishQuiz = document.getElementById('btn-finish-quiz-goto16');
    this.btnSlide15Leaderboard = document.getElementById('btn-slide15-leaderboard');
    this.btnSlide16Leaderboard = document.getElementById('btn-slide16-leaderboard');
    this.btnDrawerLeaderboard = document.getElementById('btn-drawer-leaderboard');
    this.btnSlide15Next = document.getElementById('btn-slide15-next');
    this.slide15HalfNext = document.querySelector('.slide-frame[data-slide="15"] .slide-half-next');

    // Pretest Elements (Fase 3)
    this.pretestModal = document.getElementById('pretest-modal');
    this.pretestQuizView = document.getElementById('pretest-quiz-view');
    this.pretestCounter = document.getElementById('pretest-counter');
    this.pretestProgressFill = document.getElementById('pretest-progress-fill');
    this.pretestStudentTag = document.getElementById('pretest-student-tag');
    this.pretestQuestionText = document.getElementById('pretest-question-text');
    this.pretestOptionsList = document.getElementById('pretest-options-list');
    this.btnPretestNext = document.getElementById('btn-pretest-next');
    this.pretestHint = document.getElementById('pretest-hint');
    this.pretestResultView = document.getElementById('pretest-result-view');
    this.pretestFinalScore = document.getElementById('pretest-final-score');
    this.pretestScoreDetail = document.getElementById('pretest-score-detail');
    this.btnPretestFinish = document.getElementById('btn-pretest-finish');
    this.btnRetakePretest = document.getElementById('btn-retake-pretest');

    // Slide 16 Glosarium Single Card Slider Elements
    this.slide16Container = document.getElementById('slide16-glossary-container');
    this.btnSlide16Prev = document.getElementById('btn-slide16-prev-card');
    this.btnSlide16Next = document.getElementById('btn-slide16-next-card');
    this.btnSlide16Audio = document.getElementById('btn-slide16-audio');
    this.btnSlide16Phonetic = document.getElementById('btn-slide16-phonetic');
    this.slide16DotsContainer = document.getElementById('slide16-dots-container');
  }

  bindEvents() {
    // Inisialisasi pengecekan NISN di Splash Screen
    this.initNISNCheck();

    // Splash Screen Start & Unlock Audio (Fase 2 & Fase 3)
    if (this.btnStartSplash && this.splashOverlay) {
      this.btnStartSplash.addEventListener('click', () => {
        sound.init();
        sound.playSuccess();
        this.requestLandscapeLock();
        this.splashOverlay.classList.add('fade-out');
        setTimeout(() => {
          this.splashOverlay.style.display = 'none';
          if (dataService.hasPosttestScore()) {
            dataService.setIntroCompleted();
            this.goToSlide(3, false);
            this.showToast('Semua slide telah terbuka. Selamat mengeksplorasi!');
            return;
          }
          const savedPretest = dataService.getPretestScore();
          if (savedPretest !== null && savedPretest !== undefined) {
            // Siswa sudah memiliki skor pretest dan memilih "Next ke Slide 3"
            dataService.setIntroCompleted();
            this.goToSlide(3, false);
            const student = dataService.getCurrentStudent();
            if (student) {
              this.showToast(`Lanjut ke Slide 3 (Skor Pretest: ${savedPretest}).`);
            }
          } else {
            // Belum mengerjakan pretest, luncurkan modul Pretest
            this.startPretest();
          }
        }, 400);
      });
    }

    // Tombol Kerjakan Ulang Pretest di Splash Screen
    if (this.btnRetakePretest && this.splashOverlay) {
      this.btnRetakePretest.addEventListener('click', () => {
        sound.init();
        sound.playClick();
        this.requestLandscapeLock();
        this.splashOverlay.classList.add('fade-out');
        setTimeout(() => {
          this.splashOverlay.style.display = 'none';
          this.startPretest();
        }, 400);
      });
    }

    // Tombol Tutup Splash Screen (saat dibuka kembali dari Daftar Isi)
    if (this.btnCloseSplash) {
      this.btnCloseSplash.addEventListener('click', () => {
        sound.playClick();
        this.closeSplash();
      });
    }

    // Event Navigasi & Penyelesaian Pretest (Fase 3)
    if (this.btnPretestNext) {
      this.btnPretestNext.addEventListener('click', () => {
        this.handlePretestNext();
      });
    }

    if (this.btnPretestFinish) {
      this.btnPretestFinish.addEventListener('click', () => {
        this.closePretestAndStartLearning();
      });
    }

    // Global delegation for data-goto buttons (all interactive corner buttons, menu buttons, etc.)
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-goto]');
      if (target) {
        // Intersepsi tombol hotspot menu di Slide 3 yang masih terkunci
        if (target.classList.contains('menu-item-hotspot') && target.classList.contains('is-locked')) {
          e.preventDefault();
          e.stopPropagation();
          sound.playError();
          target.classList.remove('shake-locked');
          void target.offsetWidth;
          target.classList.add('shake-locked');
          if (target.classList.contains('btn-menu-video') || target.id === 'btn-menu-video') {
            this.showToast('Complete material up to Slide 12 to unlock Video.');
          } else if (target.classList.contains('btn-menu-ar') || target.id === 'btn-menu-ar') {
            this.showToast('Complete material up to Slide 13 to unlock AR.');
          } else if (target.classList.contains('btn-menu-quiz') || target.id === 'btn-menu-quiz') {
            const hasPretest = dataService.hasPretestScore();
            if (!hasPretest) {
              this.showToast('Complete Pretest (Slide 0) and material up to Slide 14 to unlock Quiz.');
            } else {
              this.showToast('Complete material up to Slide 14 to unlock Quiz.');
            }
          }
          return;
        }

        const slideNum = parseInt(target.getAttribute('data-goto'), 10);
        if (!isNaN(slideNum)) {
          sound.playClick();
          this.goToSlide(slideNum);
        }
      }
    });

    // Drawer opener buttons
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-drawer="true"]') || e.target.closest('#btn-open-drawer-3')) {
        sound.playPop();
        this.openDrawer();
      }
    });

    this.btnCloseDrawer.addEventListener('click', () => {
      sound.playClick();
      this.closeDrawer();
    });

    this.drawer.addEventListener('click', (e) => {
      if (e.target === this.drawer) {
        this.closeDrawer();
      }
    });

    // Pastikan audio video aktif saat pengguna berinteraksi pertama kali jika terhambat browser autoplay
    const unlockVideoAudio = () => {
      if (!sound.muted) {
        if (this.currentSlide === 1 && this.videoSlide1 && this.videoSlide1.muted) {
          this.videoSlide1.muted = false;
        } else if (this.currentSlide === 2 && this.videoSlide2 && this.videoSlide2.muted) {
          this.videoSlide2.muted = false;
        }
      }
    };
    document.addEventListener('pointerdown', unlockVideoAudio, { passive: true });
    document.addEventListener('keydown', unlockVideoAudio, { passive: true });

    // Slide 1 "MULAI BELAJAR!"
    const btnSlide1 = document.getElementById('btn-slide1-start');
    if (btnSlide1) {
      btnSlide1.addEventListener('click', () => {
        sound.playSuccess();
        this.stopSlideVideo(this.videoSlide1);
        this.goToSlide(2);
      });
    }

    // Slide 2 "START"
    const btnSlide2 = document.getElementById('btn-slide2-start');
    if (btnSlide2) {
      btnSlide2.addEventListener('click', () => {
        sound.playSuccess();
        this.stopSlideVideo(this.videoSlide2);
        this.markIntroCompleted();
        this.goToSlide(3);
      });
    }

    // Slide 5: The Meaning of Legend (Interactive Concept Cards & English Audio)
    const slide5Container = document.getElementById('slide5-board-container');
    if (slide5Container) {
      slide5Container.addEventListener('click', (e) => {
        const audioBtn = e.target.closest('.slide5-audio-btn');
        if (audioBtn) {
          e.stopPropagation();
          const textToSpeak = audioBtn.getAttribute('data-audio-text');
          if (textToSpeak && 'speechSynthesis' in window) {
            if (window.speechSynthesis.speaking) {
              window.speechSynthesis.cancel();
              document.querySelectorAll('.slide5-audio-btn').forEach(b => b.classList.remove('playing'));
            }
            sound.playClick();
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            utterance.lang = 'en-US';
            utterance.rate = 0.92;
            audioBtn.classList.add('playing');
            utterance.onend = () => audioBtn.classList.remove('playing');
            utterance.onerror = () => audioBtn.classList.remove('playing');
            window.speechSynthesis.speak(utterance);
          }
          return;
        }

        const card = e.target.closest('.slide5-card');
        if (card) {
          sound.playPop();
          slide5Container.querySelectorAll('.slide5-card').forEach(c => c.classList.remove('active'));
          card.classList.add('active');
        }
      });
    }

    // Slide 6 Generic Structure Hotspots & Audio Narration
    if (this.slide6Hotspots && this.slide6Hotspots.length > 0) {
      this.slide6Hotspots.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const key = e.currentTarget.getAttribute('data-structure');
          const data = GENERIC_STRUCTURES[key];
          if (data) {
            sound.playPop();
            this.recordSlide6StructureView(key);
            this.showInfoModal(data.title, null, data.desc, null, data.audioText || data.desc);
          }
        });
      });
    }

    // Modal Speaker Button: Toggle Play / Pause Audio
    if (this.btnModalSpeaker) {
      this.btnModalSpeaker.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleStructureAudio();
      });
    }

    // Slide 6 Next Button Guard
    if (this.btnSlide6Next) {
      this.btnSlide6Next.addEventListener('click', (e) => {
        if (!this.isSlide6Completed()) {
          e.preventDefault();
          e.stopPropagation();
          sound.playError();
          const count = this.slide6ViewedStructures ? this.slide6ViewedStructures.size : 0;
          this.showToast(`Explore all 4 narrative structures first (${4 - count} remaining).`);
        }
      }, true);
    }

    if (this.slide6HalfNext) {
      this.slide6HalfNext.addEventListener('click', (e) => {
        if (!this.isSlide6Completed()) {
          e.preventDefault();
          e.stopPropagation();
          sound.playError();
          const count = this.slide6ViewedStructures ? this.slide6ViewedStructures.size : 0;
          this.showToast(`Explore all 4 narrative structures first (${4 - count} remaining).`);
        }
      }, true);
    }

    // Slide 11 Language Features Cards
    if (this.slide11Cards && this.slide11Cards.length > 0) {
      this.slide11Cards.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const key = e.currentTarget.getAttribute('data-feature');
          const data = LANGUAGE_FEATURES[key];
          if (data) {
            sound.playPop();
            this.recordSlide11FeatureView(key);
            this.showInfoModal(data.title, 'Language Feature', data.desc, data.example, data.audioText || data.desc);
          }
        });
      });
    }

    // Slide 11 Next Button Guard
    if (this.btnSlide11Next) {
      this.btnSlide11Next.addEventListener('click', (e) => {
        if (!this.isSlide11Completed()) {
          e.preventDefault();
          e.stopPropagation();
          sound.playError();
          const count = this.slide11ViewedFeatures ? this.slide11ViewedFeatures.size : 0;
          this.showToast(`Explore all 5 Language Features first (${5 - count} remaining).`);
        }
      }, true);
    }

    if (this.slide11HalfNext) {
      this.slide11HalfNext.addEventListener('click', (e) => {
        if (!this.isSlide11Completed()) {
          e.preventDefault();
          e.stopPropagation();
          sound.playError();
          const count = this.slide11ViewedFeatures ? this.slide11ViewedFeatures.size : 0;
          this.showToast(`Explore all 5 Language Features first (${5 - count} remaining).`);
        }
      }, true);
    }

    // Slide 7, 8, 9, 10, 12 & 13: Narrative Analysis (Interactive Cards & TTS Audio)
    ['slide7-analysis-container', 'slide8-analysis-container', 'slide9-analysis-container', 'slide10-analysis-container', 'slide12-analysis-container', 'slide13-analysis-container'].forEach(containerId => {
      const container = document.getElementById(containerId);
      if (container) {
        container.addEventListener('click', (e) => {
          const audioBtn = e.target.closest('.slide7-audio-btn');
          if (audioBtn) {
            e.stopPropagation();
            const textToSpeak = audioBtn.getAttribute('data-audio-text');
            if (textToSpeak && 'speechSynthesis' in window) {
              if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
                document.querySelectorAll('.slide7-audio-btn').forEach(b => b.classList.remove('playing'));
              }
              sound.playClick();
              const utterance = new SpeechSynthesisUtterance(textToSpeak);
              utterance.lang = 'en-US';
              utterance.rate = 0.92;
              audioBtn.classList.add('playing');
              utterance.onend = () => audioBtn.classList.remove('playing');
              utterance.onerror = () => audioBtn.classList.remove('playing');
              window.speechSynthesis.speak(utterance);
            }
            return;
          }

          const card = e.target.closest('.slide7-card');
          if (card) {
            sound.playPop();
            container.querySelectorAll('.slide7-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
          }
        });
      }
    });

    // Slide 11 Facts
    document.querySelectorAll('[data-fact]').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playSuccess();
        this.showToast('Fact confirmed: Environmental benefit noted.');
      });
    });

    // Slide 12 Video Interactive Lifecycle
    this.initSlide12Video();

    // Slide 13 Video Demo Audio
    const btnPlayVideo = document.getElementById('btn-play-video-demo');
    if (btnPlayVideo) {
      btnPlayVideo.addEventListener('click', () => {
        sound.playSuccess();
        this.showToast('Playing narrative audio...');
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(
            "Sidayu is led by Raden Adipati Suryodiningrat, a notable figure in Kanjeng Sepuh. Under his leadership, the region flourished with irrigation and great agriculture."
          );
          utterance.lang = 'en-US';
          utterance.rate = 0.95;
          window.speechSynthesis.speak(utterance);
        }
      });
    }

    // Slide 14: 3D Interactive Model of Situs Kanjeng Sepuh
    this.initSlide14Situs3D();

    // Slide 15 Post-test Launch & Controls (Fase 5)
    if (this.btnLaunchQuiz) {
      this.btnLaunchQuiz.addEventListener('click', () => {
        sound.playPop();
        this.startPosttest();
      });
    }

    if (this.btnCloseQuiz) {
      this.btnCloseQuiz.addEventListener('click', () => {
        sound.playClick();
        this.closePosttest();
      });
    }

    if (this.btnResetMatching) {
      this.btnResetMatching.addEventListener('click', () => {
        sound.playClick();
        this.resetMatchingPairs();
      });
    }

    if (this.btnVerifyMatching) {
      this.btnVerifyMatching.addEventListener('click', () => {
        this.verifyMatchingAnswer();
      });
    }

    // Slide 15 Next Lock Listeners
    if (this.btnSlide15Next) {
      this.btnSlide15Next.addEventListener('click', (e) => {
        if (!this.isPosttestCompleted()) {
          e.preventDefault();
          e.stopPropagation();
          sound.playError();
          this.showToast('Complete the Post-test evaluation before proceeding to Slide 16 (Glossary).');
        }
      }, true);
    }

    if (this.slide15HalfNext) {
      this.slide15HalfNext.addEventListener('click', (e) => {
        if (!this.isPosttestCompleted()) {
          e.preventDefault();
          e.stopPropagation();
          sound.playError();
          this.showToast('Complete the Post-test evaluation before proceeding to Slide 16 (Glossary).');
        }
      }, true);
    }

    if (this.btnNextQuestion) {
      this.btnNextQuestion.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const q = this.posttestQuestions && this.posttestQuestions[this.posttestIndex];
        const isMatching = (q?.Tipe || '').toLowerCase() === 'matching';

        if (!this.posttestAnswered) {
          if (isMatching) {
            const rawLeft = (q.Pasangan_Kiri || '').split('|').map(s => s.trim()).filter(Boolean);
            const pairedCount = Object.keys(this.posttestTempPairs || {}).length;
            if (pairedCount === rawLeft.length && pairedCount > 0) {
              this.verifyMatchingAnswer();
              return;
            } else {
              sound.playError();
              this.showToast(`Match all (${pairedCount}/${rawLeft.length}) pairs first.`);
              return;
            }
          } else {
            sound.playError();
            this.showToast('Select an answer option first.');
            return;
          }
        }

        sound.playClick();
        this.nextPosttestQuestion();
      });
    }

    if (this.btnRetryQuiz) {
      this.btnRetryQuiz.addEventListener('click', () => {
        sound.playPop();
        this.startPosttest();
      });
    }

    if (this.btnBackToStart) {
      this.btnBackToStart.addEventListener('click', () => {
        sound.playClick();
        this.closePosttest();
      });
    }

    if (this.btnFinishQuiz) {
      this.btnFinishQuiz.addEventListener('click', () => {
        sound.playSuccess();
        this.closePosttest();
        this.goToSlide(17);
      });
    }

    // Tabs & Leaderboard Event Listeners (Fase 6)
    if (this.tabBtnSummary) {
      this.tabBtnSummary.addEventListener('click', () => {
        sound.playClick();
        this.switchPosttestTab('summary');
      });
    }

    if (this.tabBtnLeaderboard) {
      this.tabBtnLeaderboard.addEventListener('click', () => {
        sound.playClick();
        this.switchPosttestTab('leaderboard');
      });
    }

    if (this.btnViewLeaderboardTab) {
      this.btnViewLeaderboardTab.addEventListener('click', () => {
        sound.playClick();
        this.switchPosttestTab('leaderboard');
      });
    }

    if (this.btnSlide15Leaderboard) {
      this.btnSlide15Leaderboard.addEventListener('click', () => {
        this.openLeaderboard('leaderboard');
      });
    }

    if (this.btnSlide16Leaderboard) {
      this.btnSlide16Leaderboard.addEventListener('click', () => {
        this.openLeaderboard('leaderboard');
      });
    }

    // Slide 16 Glosarium Single Card Slider Navigation & Audio Events
    if (this.btnSlide16Prev) {
      this.btnSlide16Prev.addEventListener('click', (e) => {
        e.stopPropagation();
        sound.playPop();
        this.prevGlossaryCard();
      });
    }

    if (this.btnSlide16Next) {
      this.btnSlide16Next.addEventListener('click', (e) => {
        e.stopPropagation();
        sound.playPop();
        this.nextGlossaryCard();
      });
    }

    if (this.btnSlide16Audio) {
      this.btnSlide16Audio.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleGlossaryAudio();
      });
    }

    if (this.btnSlide16Phonetic) {
      this.btnSlide16Phonetic.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleGlossaryAudio();
      });
    }

    // Touch swipe support on Slide 16
    if (this.slide16Container) {
      let touchStartX = 0;
      let touchStartY = 0;

      this.slide16Container.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      }, { passive: true });

      this.slide16Container.addEventListener('touchend', (e) => {
        if (e.changedTouches && e.changedTouches.length === 1) {
          const deltaX = e.changedTouches[0].clientX - touchStartX;
          const deltaY = e.changedTouches[0].clientY - touchStartY;
          if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX < 0) {
              sound.playPop();
              this.nextGlossaryCard();
            } else {
              sound.playPop();
              this.prevGlossaryCard();
            }
          }
        }
      }, { passive: true });
    }

    if (this.btnDrawerLeaderboard) {
      this.btnDrawerLeaderboard.addEventListener('click', () => {
        this.closeDrawer();
        this.openLeaderboard('leaderboard');
      });
    }

    // Slide 10 Formative Game
    if (this.btnStartVerbGame) {
      this.btnStartVerbGame.addEventListener('click', () => {
        sound.playPop();
        this.startFormativeGame();
      });
    }

    // Slide 17 Exit App — btn-restart-app ditangani via delegation (elemen ada di slide 17)
    document.addEventListener('click', (e) => {
      if (e.target.closest('#btn-restart-app')) {
        e.stopPropagation();
        sound.playClick();
        this.handleExitApp();
      }
    });

    // Info Modal Close
    if (this.btnCloseInfoModal) {
      this.btnCloseInfoModal.addEventListener('click', () => {
        this.closeInfoModal();
      });
    }
    if (this.infoModal) {
      this.infoModal.addEventListener('click', (e) => {
        if (e.target === this.infoModal) {
          this.closeInfoModal();
        }
      });
    }

    // Tombol Glosarium slide 3 menggunakan data-goto="16" — navigasi ditangani oleh delegation global.
    // Handler khusus tidak diperlukan; modal Glosarium (Vocabulary) dibuka dari tombol di slide 16.

    if (this.btnCloseGlosarium) {
      this.btnCloseGlosarium.addEventListener('click', () => {
        this.closeGlosarium();
      });
    }

    if (this.glosariumModal) {
      this.glosariumModal.addEventListener('click', (e) => {
        if (e.target === this.glosariumModal) {
          this.closeGlosarium();
        }
      });
    }

    if (this.glosariumSearch) {
      this.glosariumSearch.addEventListener('input', () => {
        this.renderGlosariumList(this.glosariumSearch.value);
      });
    }

    // Top HUD Quick Menu Toggle & Popover
    if (this.btnHUDMenuToggle && this.hudActionsMenu) {
      this.btnHUDMenuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        sound.playPop();
        this.toggleHUDMenu();
      });
    }

    // Tutup popover jika user klik di luar HUD
    document.addEventListener('click', (e) => {
      if (this.hudActionsMenu && this.hudActionsMenu.classList.contains('open')) {
        if (!this.topHUD || !this.topHUD.contains(e.target)) {
          this.closeHUDMenu();
        }
      }
    });

    // Tutup popover otomatis setelah aksi dipilih di perangkat sentuh/mobile
    if (this.hudActionsMenu) {
      this.hudActionsMenu.querySelectorAll('.hud-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (window.innerWidth <= 1024) {
            this.closeHUDMenu();
          }
        });
      });
    }

    // Top HUD Actions
    this.btnSFX.addEventListener('click', () => {
      const isMuted = sound.toggleMute();
      this.updateSFXButton(isMuted);
      if (isMuted) {
        if (this.videoSlide1) this.videoSlide1.muted = true;
        if (this.videoSlide2) this.videoSlide2.muted = true;
      } else {
        sound.playPop();
        if (this.currentSlide === 1 && this.videoSlide1) {
          this.videoSlide1.muted = false;
        } else if (this.currentSlide === 2 && this.videoSlide2) {
          this.videoSlide2.muted = false;
        }
      }
    });

    this.btnFullscreen.addEventListener('click', () => {
      sound.playClick();
      this.toggleFullscreen();
    });

    document.addEventListener('fullscreenchange', () => {
      this.updateFullscreenButton(!!document.fullscreenElement);
    });

    if (this.btnFlipOrientation) {
      this.btnFlipOrientation.addEventListener('click', () => {
        sound.playPop();
        this.flipOrientation();
      });
    }

    // Keyboard Navigation
    window.addEventListener('keydown', (e) => {
      const isQuizTakingActive = this.currentSlide === 15 && this.posttestQuizView && this.posttestQuizView.style.display === 'flex';

      // Khusus saat berada di Slide 16 (Glosarium): Panah Kiri & Kanan menggeser kartu kata
      if (this.currentSlide === 16 && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        e.preventDefault();
        sound.playPop();
        if (e.key === 'ArrowRight') {
          this.nextGlossaryCard();
        } else {
          this.prevGlossaryCard();
        }
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        if (this.currentSlide === 15 && !this.isPosttestCompleted()) {
          e.preventDefault();
          sound.playError();
          this.showToast('Complete the Post-test evaluation before proceeding to Slide 16.');
          return;
        }
        if (this.currentSlide < this.totalSlides && !isQuizTakingActive) {
          e.preventDefault();
          this.goToSlide(this.currentSlide + 1);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (this.currentSlide > 1 && !isQuizTakingActive) {
          e.preventDefault();
          this.goToSlide(this.currentSlide - 1);
        }
      } else if (e.key === 'Escape') {
        if (this.modalVideoSlide12 && this.modalVideoSlide12.style.display !== 'none') {
          if (!this.isSlide12VideoCompleted) {
            sound.playError();
            this.showToast('Watch video to completion before navigating.');
            return;
          } else {
            this.closeSlide12VideoModal();
            return;
          }
        }
        this.closeHUDMenu();
        this.closeDrawer();
        this.closeInfoModal();
        if (this.currentSlide === 15 && (this.posttestQuizView?.style.display === 'flex' || this.quizResultScreen?.style.display === 'flex')) {
          this.closePosttest();
        }
        if (this.glosariumModal) this.glosariumModal.style.display = 'none';
      } else if (e.key === 'Home') {
        this.goToSlide(3);
      }
    });

    // Mobile Touch Swipes (menyesuaikan orientasi rotasi saat mode portrait)
    let touchStartX = 0;
    let touchStartY = 0;
    document.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].screenX;
      const touchEndY = e.changedTouches[0].screenY;
      const dx = touchEndX - touchStartX;
      const dy = touchEndY - touchStartY;

      let effectiveDx = dx;
      let effectiveDy = dy;

      if (this.isPortraitMode) {
        if (this.portraitRotationAngle === 270) {
          effectiveDx = -dy;
          effectiveDy = dx;
        } else {
          effectiveDx = dy;
          effectiveDy = -dx;
        }
      }

      // Hanya picu swipe horizontal slide jika bukan scroll vertikal konten & bukan pada iframe interaktif / post-test
      if (Math.abs(effectiveDx) > 60 && Math.abs(effectiveDy) < 80 && !e.target.closest('.ar-screen-container') && !e.target.closest('.wordwall-embed-wrapper') && !e.target.closest('.posttest-modal-card')) {
        if (effectiveDx < 0 && this.currentSlide < this.totalSlides) {
          // Swipe Left -> Next
          if (this.currentSlide === 15 && !this.isPosttestCompleted()) {
            sound.playError();
            this.showToast('Complete the Post-test evaluation before proceeding to Slide 16.');
            return;
          }
          this.goToSlide(this.currentSlide + 1);
        } else if (effectiveDx > 0 && this.currentSlide > 1) {
          // Swipe Right -> Prev
          this.goToSlide(this.currentSlide - 1);
        }
      }
    }, { passive: true });
  }

  playSlideVideo(video) {
    if (!video) return;
    video.currentTime = 0;
    video.muted = sound.muted;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fallback jika browser membatasi autoplay dengan suara sebelum ada interaksi pengguna
        video.muted = true;
        video.play().catch(() => { });
      });
    }
  }

  stopSlideVideo(video) {
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  }

  goToSlide(slideNumber, playSound = true) {
    if (slideNumber < 1 || slideNumber > this.totalSlides) return;

    const allUnlocked = dataService.hasPosttestScore();

    // Slide 6 Generic Structure Lock: Tidak bisa lanjut sebelum seluruh 4 struktur dibuka
    if (!allUnlocked && this.currentSlide === 6 && slideNumber > 6 && !this.isSlide6Completed()) {
      sound.playError();
      const count = this.slide6ViewedStructures ? this.slide6ViewedStructures.size : 0;
      this.showToast(`Explore all 4 narrative structures first (${4 - count} remaining).`);
      return;
    }

    // Slide 11 Language Features Lock: Tidak bisa lanjut sebelum seluruh 5 fitur bahasa dibuka
    if (!allUnlocked && this.currentSlide === 11 && slideNumber > 11 && !this.isSlide11Completed()) {
      sound.playError();
      const count = this.slide11ViewedFeatures ? this.slide11ViewedFeatures.size : 0;
      this.showToast(`Explore all 5 Language Features first (${5 - count} remaining).`);
      return;
    }

    // Slide 15 Post-test Lock: Tidak bisa lanjut ke Slide 16 sebelum Post-test diselesaikan
    if (!allUnlocked && this.currentSlide === 15 && slideNumber > 15 && !this.isPosttestCompleted()) {
      sound.playError();
      this.showToast('Complete the Post-test evaluation before proceeding to Slide 16 (Glossary).');
      return;
    }

    // Video Lock (Slide 13): Baru bisa terakses jika sudah buka sampai slide 12
    if (!allUnlocked && slideNumber === 13 && this.maxSlideVisited < 12) {
      sound.playError();
      this.showToast('Complete material up to Slide 12 to unlock Video.');
      return;
    }

    // AR Lock (Slide 14): Baru bisa terakses jika sudah buka sampai slide 13
    if (!allUnlocked && slideNumber === 14 && this.maxSlideVisited < 13) {
      sound.playError();
      this.showToast('Complete material up to Slide 13 to unlock AR.');
      return;
    }

    // Quiz Lock (Slide 15): Harus lewati slide 0-14
    if (!allUnlocked && slideNumber === 15 && !dataService.isPosttestUnlocked()) {
      sound.playError();
      const hasPretest = dataService.hasPretestScore();
      if (!hasPretest) {
        this.showToast('Complete Pretest (Slide 0) and material up to Slide 14 to unlock Quiz.');
      } else {
        this.showToast('Complete material up to Slide 14 to unlock Quiz.');
      }
      return;
    }

    // Slide 17 Lock: Tidak bisa lompat langsung ke Slide 17 sebelum Post-test selesai
    if (!allUnlocked && slideNumber === 17 && !this.isPosttestCompleted()) {
      sound.playError();
      this.showToast('Complete Post-test before accessing Slide 17.');
      return;
    }

    // Slide 12 Video Lock: Do not navigate away if video modal is open and video is incomplete
    if (!allUnlocked && this.currentSlide === 12 && slideNumber !== 12) {
      if (this.modalVideoSlide12 && this.modalVideoSlide12.style.display !== 'none' && !this.isSlide12VideoCompleted) {
        sound.playError();
        this.showToast('Watch video to completion before navigating.');
        return;
      }
    }

    // Stop modal narration audio when changing slides
    this.stopStructureAudio();

    if (playSound) {
      sound.playWhoosh();
    }

    this.currentSlide = slideNumber;

    if (slideNumber >= 3) {
      this.markIntroCompleted();
    }

    if (slideNumber === 6) {
      this.updateSlide6LockUI();
    }

    if (slideNumber === 11) {
      this.updateSlide11LockUI();
    }

    if (slideNumber === 15) {
      this.updateSlide15UI();
      this.updateSlide15LockUI();
    }

    // Progress Tracker (Phase 4): Record highest slide visited by student
    const prevMax = this.maxSlideVisited;
    if (allUnlocked) {
      this.maxSlideVisited = 17;
      this.isSlide12VideoCompleted = true;
    } else if (slideNumber > this.maxSlideVisited) {
      this.maxSlideVisited = slideNumber;
      dataService.saveMaxSlideVisited(slideNumber);

      // Unlock notification upon first arrival at Slide 14
      if (slideNumber === 14 && prevMax < 14) {
        if (dataService.isPosttestUnlocked()) {
          sound.playSuccess();
          this.showToast('Learning material completed. Post-test (Slide 15) is unlocked.');
        } else {
          this.showToast('Material completed. Complete Pretest (Slide 0) to unlock Post-test.');
        }
      }
    }

    // Perbarui visualisasi status kunci di menu Slide 3 dan Drawer
    this.updateLockUI();

    // Update active slide frame
    this.slideFrames.forEach(frame => {
      const num = parseInt(frame.getAttribute('data-slide'), 10);
      if (num === slideNumber) {
        frame.classList.add('active');
      } else {
        frame.classList.remove('active');
      }
    });

    // Update Progress bar & counter
    const pct = ((slideNumber / this.totalSlides) * 100).toFixed(1);
    this.progressBar.style.width = `${pct}%`;
    this.counterPill.innerHTML = `<span class="pill-prefix">Slide </span>${slideNumber} / ${this.totalSlides}`;
    this.closeHUDMenu();

    // Highlight drawer item
    const drawerItems = document.querySelectorAll('.drawer-slide-item');
    drawerItems.forEach((item) => {
      const targetId = parseInt(item.getAttribute('data-drawer-slide'), 10);
      if (targetId === slideNumber) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Handle background videos (Slide 1 & Slide 2 jika elemen ada)
    if (slideNumber === 1) {
      this.stopSlideVideo(this.videoSlide2);
      const isSplashVisible = this.splashOverlay && this.splashOverlay.style.display !== 'none' && !this.splashOverlay.classList.contains('fade-out');
      const isPretestOpen = this.pretestModal && this.pretestModal.style.display !== 'none';
      if (!isSplashVisible && !isPretestOpen) {
        this.playSlideVideo(this.videoSlide1);
      } else {
        this.stopSlideVideo(this.videoSlide1);
      }
    } else if (slideNumber === 2) {
      this.stopSlideVideo(this.videoSlide1);
      this.playSlideVideo(this.videoSlide2);
    } else {
      this.stopSlideVideo(this.videoSlide1);
      this.stopSlideVideo(this.videoSlide2);
    }

    // Manage Slide 4 Wordwall interactive game lifecycle
    const wordwallFrame4 = document.getElementById('wordwall-frame-4');
    if (wordwallFrame4) {
      let targetWordwallSrc4 = wordwallFrame4.dataset.src || 'https://wordwall.net/embed/play/119932/671/540?wwmethod=link';
      if (targetWordwallSrc4.includes('wordwall.net/play/') && !targetWordwallSrc4.includes('/embed/')) {
        targetWordwallSrc4 = targetWordwallSrc4.replace('wordwall.net/play/', 'wordwall.net/embed/play/');
      }
      if (!wordwallFrame4.dataset.src) {
        wordwallFrame4.dataset.src = targetWordwallSrc4;
      }
      if (slideNumber === 4) {
        if (!wordwallFrame4.src || wordwallFrame4.src.includes('about:blank')) {
          wordwallFrame4.src = targetWordwallSrc4;
        }
      } else {
        if (wordwallFrame4.src && !wordwallFrame4.src.includes('about:blank')) {
          wordwallFrame4.src = 'about:blank';
        }
      }
    }

    // Manage Slide 10 Wordwall video/interactive lifecycle
    const wordwallFrame = document.getElementById('wordwall-frame');
    if (wordwallFrame) {
      const targetWordwallSrc = wordwallFrame.dataset.src || 'https://wordwall.net/id/embed/6f2aa61931a9401081cdae7b7d9c5dc3?themeId=46';
      if (!wordwallFrame.dataset.src) {
        wordwallFrame.dataset.src = targetWordwallSrc;
      }
      if (slideNumber === 10) {
        if (!wordwallFrame.src || wordwallFrame.src.includes('about:blank')) {
          wordwallFrame.src = targetWordwallSrc;
        }
      } else {
        if (wordwallFrame.src && !wordwallFrame.src.includes('about:blank')) {
          wordwallFrame.src = 'about:blank';
        }
      }
    }

    // Slide 12 or 13: Trigger Proximity Background Preload of 3D Model (AGENTS.md Compliant)
    if (slideNumber === 12 || slideNumber === 13) {
      this.prefetchSitusModel();
    }

    // Manage Slide 14 3D Historical Relic lifecycle
    const situsViewer = document.getElementById('situs-viewer');
    if (situsViewer) {
      if (slideNumber === 14) {
        if (!situsViewer.getAttribute('src')) {
          situsViewer.setAttribute('src', situsViewer.dataset.src || 'assets/situs_ks.glb');
        }
        situsViewer.autoRotate = true;
        if (typeof situsViewer.dismissPoster === 'function') {
          situsViewer.dismissPoster();
        }
      } else {
        situsViewer.autoRotate = false;
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      }
    }

    // Stop any HTML5 video or audio on inactive slides
    document.querySelectorAll('.slide-frame:not(.active) video, .slide-frame:not(.active) audio').forEach(media => {
      if (media !== this.videoSlide1 && media !== this.videoSlide2) {
        media.pause();
        media.currentTime = 0;
      }
    });

    if (slideNumber !== 12 && this.modalVideoSlide12) {
      this.closeSlide12VideoModal();
    }

    // Cancel speech synthesis if narration is playing
    if ('speechSynthesis' in window && (window.speechSynthesis.speaking || window.speechSynthesis.paused)) {
      window.speechSynthesis.cancel();
    }
    this.stopGlossaryAudio(true);

    // Slide 16 (Glosarium): render kartu slider saat masuk slide 16
    if (slideNumber === 16) {
      this._renderGlossarySlide();
    }
  }

  updateLockUI() {
    const allUnlocked = dataService.hasPosttestScore();
    const maxVisited = allUnlocked ? 17 : (this.maxSlideVisited || dataService.getMaxSlideVisited());
    const isVideoUnlocked = allUnlocked || maxVisited >= 12;
    const isArUnlocked = allUnlocked || maxVisited >= 13;
    const isQuizUnlocked = allUnlocked || dataService.isPosttestUnlocked();

    // Hotspot Video on Slide 3 (Accessible if maxSlideVisited >= 12 or allUnlocked)
    if (this.hotspotMenuVideo) {
      if (isVideoUnlocked) {
        this.hotspotMenuVideo.classList.remove('is-locked');
        this.hotspotMenuVideo.classList.add('is-unlocked');
        this.hotspotMenuVideo.title = 'Educational Video (Unlocked)';
      } else {
        this.hotspotMenuVideo.classList.add('is-locked');
        this.hotspotMenuVideo.classList.remove('is-unlocked');
        this.hotspotMenuVideo.title = 'Educational Video (Locked - Complete up to Slide 12)';
      }
    }
    if (this.hotspotVideoLockBadge) {
      this.hotspotVideoLockBadge.style.display = isVideoUnlocked ? 'none' : 'inline-flex';
    }

    // Hotspot AR on Slide 3 (Accessible if maxSlideVisited >= 13 or allUnlocked)
    if (this.hotspotMenuAr) {
      if (isArUnlocked) {
        this.hotspotMenuAr.classList.remove('is-locked');
        this.hotspotMenuAr.classList.add('is-unlocked');
        this.hotspotMenuAr.title = 'Augmented Reality (AR) (Unlocked)';
      } else {
        this.hotspotMenuAr.classList.add('is-locked');
        this.hotspotMenuAr.classList.remove('is-unlocked');
        this.hotspotMenuAr.title = 'Augmented Reality (AR) (Locked - Complete up to Slide 13)';
      }
    }
    if (this.hotspotArLockBadge) {
      this.hotspotArLockBadge.style.display = isArUnlocked ? 'none' : 'inline-flex';
    }

    // Hotspot Quiz on Slide 3 (Accessible if slide 0-14 completed or allUnlocked)
    if (this.hotspotMenuQuiz) {
      if (isQuizUnlocked) {
        this.hotspotMenuQuiz.classList.remove('is-locked');
        this.hotspotMenuQuiz.classList.add('is-unlocked');
        this.hotspotMenuQuiz.title = 'Interactive Quiz (Unlocked)';
      } else {
        this.hotspotMenuQuiz.classList.add('is-locked');
        this.hotspotMenuQuiz.classList.remove('is-unlocked');
        this.hotspotMenuQuiz.title = 'Interactive Quiz (Locked - Complete Slide 0 to 14)';
      }
    }
    if (this.hotspotQuizLockBadge) {
      this.hotspotQuizLockBadge.style.display = isQuizUnlocked ? 'none' : 'inline-flex';
    }

    // Refresh progress text in drawer
    if (this.drawerProgressText) {
      const displayCompleted = allUnlocked ? 14 : Math.max(1, Math.min(this.maxSlideVisited - 2, 14));
      this.drawerProgressText.textContent = `Progress: ${displayCompleted} / 14 Slides`;
    }
  }

  renderDrawerList() {
    if (!this.drawerSlidesContainer) return;
    this.drawerSlidesContainer.innerHTML = '';

    const allUnlocked = dataService.hasPosttestScore();
    const unlocked = allUnlocked || dataService.isPosttestUnlocked();

    if (this.drawerProgressText) {
      const displayCompleted = allUnlocked ? 14 : Math.max(1, Math.min(this.maxSlideVisited - 2, 14));
      this.drawerProgressText.textContent = `Progress: ${displayCompleted} / 14 Slides`;
    }

    SLIDE_DIRECTORY.forEach((slide) => {
      const div = document.createElement('div');
      const isCurrent = !slide.isPretest && slide.id === this.currentSlide;
      let isLocked = false;
      if (!allUnlocked && !slide.isPretest) {
        if (slide.id === 13) {
          isLocked = this.maxSlideVisited < 12;
        } else if (slide.id === 14) {
          isLocked = this.maxSlideVisited < 13;
        } else if (slide.id === 15) {
          isLocked = !unlocked;
        } else if (slide.id === 16) {
          isLocked = false;
        } else if (slide.id === 17) {
          isLocked = !unlocked || !this.isPosttestCompleted();
        }
      }

      let badgeHtml = '';
      if (slide.isPretest) {
        const preScore = dataService.getPretestScore();
        badgeHtml = preScore !== null && preScore !== undefined
          ? `<span class="drawer-status-badge completed">Score: ${preScore}</span>`
          : '<span class="drawer-status-badge unlocked">Start</span>';
      } else if (isLocked) {
        badgeHtml = '<span class="drawer-status-badge locked">Locked</span>';
      } else if (slide.id === 17 && (allUnlocked || this.isPosttestCompleted())) {
        badgeHtml = '<span class="drawer-status-badge unlocked">Completed</span>';
      } else if (slide.id === 16) {
        badgeHtml = '<span class="drawer-status-badge unlocked">Glossary</span>';
      } else if (allUnlocked || slide.id <= this.maxSlideVisited) {
        badgeHtml = '<span class="drawer-status-badge completed">✓ Viewed</span>';
      } else {
        badgeHtml = '<span class="drawer-status-badge unlocked">Unlocked</span>';
      }

      const thumbSrc = slide.isPretest
        ? 'assets/slides/slide_0.webp'
        : (slide.id === 7
          ? 'assets/slides/slide_7_background.webp'
          : (slide.id === 11
            ? 'assets/slides/slide_11_background.webp'
            : `assets/slides/slide_${slide.id}.webp`));

      div.className = `drawer-slide-item ${isCurrent ? 'active' : ''} ${isLocked ? 'is-locked' : ''}`;
      div.setAttribute('data-drawer-slide', slide.id);
      div.innerHTML = `
        <img class="drawer-item-thumb" src="${thumbSrc}" alt="${slide.title}" loading="lazy" decoding="async">
        <div class="drawer-item-info">
          <div class="drawer-item-header">
            <div class="drawer-item-num">${slide.isPretest ? 'Pretest' : `Slide ${slide.id}`}</div>
            ${badgeHtml}
          </div>
          <div class="drawer-item-name">${slide.title}</div>
        </div>
      `;

      div.addEventListener('click', () => {
        if (slide.isPretest) {
          sound.playClick();
          this.closeDrawer();
          this.openSplash();
          return;
        }

        if (isLocked) {
          sound.playError();
          if (slide.id === 13) {
            this.showToast('Complete material up to Slide 12 to unlock Video.');
          } else if (slide.id === 14) {
            this.showToast('Complete material up to Slide 13 to unlock AR.');
          } else if (slide.id === 15) {
            const hasPretest = dataService.hasPretestScore();
            if (!hasPretest) {
              this.showToast('Complete Pretest (Slide 0) and material up to Slide 14 to unlock Quiz.');
            } else {
              this.showToast('Complete material up to Slide 14 to unlock Quiz.');
            }
          } else {
            this.showToast('Complete material up to Slide 14 to unlock Post-test.');
          }
          return;
        }
        sound.playClick();
        this.goToSlide(slide.id);
        this.closeDrawer();
      });

      this.drawerSlidesContainer.appendChild(div);
    });
  }

  openDrawer() {
    this.renderDrawerList();
    this.drawer.classList.add('active');
  }

  closeDrawer() {
    this.drawer.classList.remove('active');
  }

  openSplash() {
    if (!this.splashOverlay) return;
    this.splashOverlay.style.display = 'flex';
    requestAnimationFrame(() => {
      this.splashOverlay.classList.remove('fade-out');
    });

    // Pastikan data siswa di-restore dari storage jika memori kosong
    let currentStudent = dataService.getCurrentStudent();
    if (!currentStudent) {
      try {
        const stored = localStorage.getItem('evaluasi_current_student');
        if (stored) {
          currentStudent = JSON.parse(stored);
          // Sinkronkan kembali ke dataService
          if (currentStudent && currentStudent.NISN) {
            dataService.currentStudent = currentStudent;
          }
        }
      } catch (e) { /* ignore */ }
    }

    if (currentStudent) {
      if (this.inputNISN) {
        this.inputNISN.value = currentStudent.NISN || currentStudent.NIS || '';
      }
      this.renderVerifiedStudent(currentStudent);
      if (this.btnCloseSplash) {
        this.btnCloseSplash.style.display = 'flex';
      }
    } else {
      if (this.inputNISN) this.inputNISN.value = '';
      if (this.studentCard) this.studentCard.style.display = 'none';
      if (this.btnStartSplash) this.btnStartSplash.style.display = 'none';
      if (this.btnRetakePretest) this.btnRetakePretest.style.display = 'none';
      if (this.btnCloseSplash) {
        this.btnCloseSplash.style.display = 'none';
      }
      this.showNISNFeedback('', '');
    }
  }

  closeSplash() {
    if (!this.splashOverlay) return;
    this.splashOverlay.classList.add('fade-out');
    setTimeout(() => {
      this.splashOverlay.style.display = 'none';
      if (this.hasVisitedIntro() && this.currentSlide < 3) {
        this.goToSlide(3, false);
      }
    }, 400);
  }

  hasVisitedIntro() {
    return dataService.isIntroCompleted();
  }

  markIntroCompleted() {
    dataService.setIntroCompleted();
    if (this.btnSlide3Prev) {
      this.btnSlide3Prev.style.display = 'none';
    }
  }

  showInfoModal(title, badge, desc, example = null, audioText = null) {
    if (!this.infoModal) return;
    this.modalTitle.textContent = title;

    if (badge) {
      this.modalBadge.textContent = badge;
      this.modalBadge.style.display = 'inline-block';
    } else {
      this.modalBadge.style.display = 'none';
      this.modalBadge.textContent = '';
    }

    this.modalDesc.textContent = desc;

    if (example && this.modalExample) {
      this.modalExample.innerHTML = `<span class="modal-example-label">Example:</span> <em class="modal-example-text">"${example}"</em>`;
      this.modalExample.style.display = 'block';
    } else if (this.modalExample) {
      this.modalExample.style.display = 'none';
      this.modalExample.textContent = '';
    }

    this.infoModal.style.display = 'flex';

    if (audioText) {
      this.activeStructureAudioText = audioText;
      if (this.btnModalSpeaker) this.btnModalSpeaker.style.display = 'inline-flex';
      this.playStructureAudio(audioText);
    } else {
      this.activeStructureAudioText = '';
      if (this.btnModalSpeaker) this.btnModalSpeaker.style.display = 'none';
      this.stopStructureAudio();
    }
  }

  playStructureAudio(text) {
    if (!('speechSynthesis' in window)) return;

    // Jika sedang jeda (paused), lanjutkan pemutaran
    if (this.isAudioPaused && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      this.isAudioPaused = false;
      this.isAudioPlaying = true;
      this.updateAudioButtonUI('playing');
      return;
    }

    this.stopStructureAudio();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.92;
    this.currentUtterance = utterance;

    utterance.onstart = () => {
      this.isAudioPlaying = true;
      this.isAudioPaused = false;
      this.updateAudioButtonUI('playing');
    };

    utterance.onpause = () => {
      this.isAudioPlaying = true;
      this.isAudioPaused = true;
      this.updateAudioButtonUI('paused');
    };

    utterance.onresume = () => {
      this.isAudioPlaying = true;
      this.isAudioPaused = false;
      this.updateAudioButtonUI('playing');
    };

    utterance.onend = () => {
      this.isAudioPlaying = false;
      this.isAudioPaused = false;
      this.currentUtterance = null;
      this.updateAudioButtonUI('idle');
    };

    utterance.onerror = () => {
      this.isAudioPlaying = false;
      this.isAudioPaused = false;
      this.currentUtterance = null;
      this.updateAudioButtonUI('idle');
    };

    this.isAudioPlaying = true;
    this.isAudioPaused = false;
    this.updateAudioButtonUI('playing');
    window.speechSynthesis.speak(utterance);
  }

  toggleStructureAudio() {
    if (!('speechSynthesis' in window)) return;

    if (!this.isAudioPlaying && !this.isAudioPaused) {
      if (this.activeStructureAudioText) {
        sound.playClick();
        this.playStructureAudio(this.activeStructureAudioText);
      }
    } else if (this.isAudioPlaying && !this.isAudioPaused) {
      // Sedang berbicara -> Pause
      sound.playClick();
      window.speechSynthesis.pause();
      this.isAudioPaused = true;
      this.updateAudioButtonUI('paused');
    } else if (this.isAudioPaused) {
      // Sedang dijeda -> Resume
      sound.playClick();
      window.speechSynthesis.resume();
      this.isAudioPaused = false;
      this.updateAudioButtonUI('playing');
    }
  }

  stopStructureAudio() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isAudioPlaying = false;
    this.isAudioPaused = false;
    this.currentUtterance = null;
    this.updateAudioButtonUI('idle');
  }

  updateAudioButtonUI(state) {
    if (!this.btnModalSpeaker) return;
    const playSvg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>`;
    const pauseSvg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></svg>`;

    if (state === 'playing') {
      this.btnModalSpeaker.classList.add('speaking');
      this.btnModalSpeaker.classList.remove('paused');
      this.btnModalSpeaker.title = 'Pause Audio';
      if (this.modalSpeakerIcon) this.modalSpeakerIcon.innerHTML = pauseSvg;
      if (this.modalSpeakerText) this.modalSpeakerText.textContent = 'Pause Audio';
    } else if (state === 'paused') {
      this.btnModalSpeaker.classList.remove('speaking');
      this.btnModalSpeaker.classList.add('paused');
      this.btnModalSpeaker.title = 'Resume Audio';
      if (this.modalSpeakerIcon) this.modalSpeakerIcon.innerHTML = playSvg;
      if (this.modalSpeakerText) this.modalSpeakerText.textContent = 'Resume Audio';
    } else {
      this.btnModalSpeaker.classList.remove('speaking');
      this.btnModalSpeaker.classList.remove('paused');
      this.btnModalSpeaker.title = 'Play Audio';
      if (this.modalSpeakerIcon) this.modalSpeakerIcon.innerHTML = playSvg;
      if (this.modalSpeakerText) this.modalSpeakerText.textContent = 'Play Audio';
    }
  }

  closeInfoModal() {
    sound.playClick();
    this.stopStructureAudio();
    if (this.infoModal) {
      this.infoModal.style.display = 'none';
    }
  }

  isSlide6Completed() {
    if (dataService.hasPosttestScore()) return true;
    return this.slide6ViewedStructures && this.slide6ViewedStructures.size >= 4;
  }

  recordSlide6StructureView(key) {
    if (!this.slide6ViewedStructures) {
      this.slide6ViewedStructures = new Set();
    }
    const prevSize = this.slide6ViewedStructures.size;
    this.slide6ViewedStructures.add(key);
    dataService.saveSlide6Progress([...this.slide6ViewedStructures]);
    this.updateSlide6LockUI();

    if (prevSize < 4 && this.slide6ViewedStructures.size === 4) {
      sound.playSuccess();
      this.showToast('Generic structures completed. Next slide unlocked.');
    }
  }

  updateSlide6LockUI() {
    const allUnlocked = dataService.hasPosttestScore();
    const count = this.slide6ViewedStructures ? this.slide6ViewedStructures.size : 0;
    const isCompleted = allUnlocked || count >= 4;

    if (this.slide6Count) {
      this.slide6Count.textContent = allUnlocked ? 4 : count;
    }

    if (this.slide6ProgressBadge) {
      if (isCompleted) {
        this.slide6ProgressBadge.classList.add('is-complete');
        this.slide6ProgressBadge.innerHTML = `<span class="slide6-progress-icon">✓</span> <span class="slide6-progress-text">All 4 structures completed</span>`;
      } else {
        this.slide6ProgressBadge.classList.remove('is-complete');
        this.slide6ProgressBadge.innerHTML = `<span class="slide6-progress-icon"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C9.24 2 7 4.24 7 7v3H6c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2h-1V7c0-2.76-2.24-5-5-5zm-3 8V7c0-1.66 1.34-3 3-3s3 1.34 3 3v3H9z"/></svg></span> <span class="slide6-progress-text">Explore all 4 structures to proceed (${count}/4)</span>`;
      }
    }

    if (this.slide6Hotspots) {
      this.slide6Hotspots.forEach(btn => {
        const key = btn.getAttribute('data-structure');
        if (allUnlocked || (this.slide6ViewedStructures && this.slide6ViewedStructures.has(key))) {
          btn.classList.add('is-viewed');
        } else {
          btn.classList.remove('is-viewed');
        }
      });
    }

    if (this.btnSlide6Next) {
      if (isCompleted) {
        this.btnSlide6Next.classList.remove('is-locked');
        this.btnSlide6Next.title = 'Next Slide';
      } else {
        this.btnSlide6Next.classList.add('is-locked');
        this.btnSlide6Next.title = `Locked: Explore ${4 - count} more structure(s)`;
      }
    }

    if (this.slide6HalfNext) {
      if (isCompleted) {
        this.slide6HalfNext.classList.remove('is-locked');
      } else {
        this.slide6HalfNext.classList.add('is-locked');
      }
    }
  }

  isSlide11Completed() {
    if (dataService.hasPosttestScore()) return true;
    return this.slide11ViewedFeatures && this.slide11ViewedFeatures.size >= 5;
  }

  recordSlide11FeatureView(key) {
    if (!this.slide11ViewedFeatures) {
      this.slide11ViewedFeatures = new Set();
    }
    const prevSize = this.slide11ViewedFeatures.size;
    this.slide11ViewedFeatures.add(key);
    dataService.saveSlide11Progress([...this.slide11ViewedFeatures]);
    this.updateSlide11LockUI();

    if (prevSize < 5 && this.slide11ViewedFeatures.size === 5) {
      sound.playSuccess();
      this.showToast('Language Features completed. Slide 12 unlocked.');
    }
  }

  updateSlide11LockUI() {
    const allUnlocked = dataService.hasPosttestScore();
    const count = this.slide11ViewedFeatures ? this.slide11ViewedFeatures.size : 0;
    const isCompleted = allUnlocked || count >= 5;

    if (this.slide11Count) {
      this.slide11Count.textContent = allUnlocked ? 5 : count;
    }

    if (this.slide11ProgressBadge) {
      if (isCompleted) {
        this.slide11ProgressBadge.classList.add('is-complete');
        this.slide11ProgressBadge.innerHTML = `<span class="slide11-progress-icon">✓</span> <span class="slide11-progress-text">All 5 Language Features completed</span>`;
      } else {
        this.slide11ProgressBadge.classList.remove('is-complete');
        this.slide11ProgressBadge.innerHTML = `<span class="slide11-progress-icon"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C9.24 2 7 4.24 7 7v3H6c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2h-1V7c0-2.76-2.24-5-5-5zm-3 8V7c0-1.66 1.34-3 3-3s3 1.34 3 3v3H9z"/></svg></span> <span class="slide11-progress-text">Explore all 5 Language Features to proceed (${count}/5)</span>`;
      }
    }

    if (this.slide11Cards) {
      this.slide11Cards.forEach(btn => {
        const key = btn.getAttribute('data-feature');
        if (allUnlocked || (this.slide11ViewedFeatures && this.slide11ViewedFeatures.has(key))) {
          btn.classList.add('is-viewed');
        } else {
          btn.classList.remove('is-viewed');
        }
      });
    }

    if (this.btnSlide11Next) {
      if (isCompleted) {
        this.btnSlide11Next.classList.remove('is-locked');
        this.btnSlide11Next.title = 'Go to Slide 12';
      } else {
        this.btnSlide11Next.classList.add('is-locked');
        this.btnSlide11Next.title = `Locked: Explore ${5 - count} more language features`;
      }
    }

    if (this.slide11HalfNext) {
      if (isCompleted) {
        this.slide11HalfNext.classList.remove('is-locked');
      } else {
        this.slide11HalfNext.classList.add('is-locked');
      }
    }
  }

  initSlide12Video() {
    if (!this.btnLaunchVideoSlide12) return;

    this.initYouTubePlayer();

    // Launch Video Modal
    this.btnLaunchVideoSlide12.addEventListener('click', () => {
      sound.playClick();
      if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      this.openSlide12VideoModal();
    });

    // Close Video Button
    if (this.btnCloseVideoSlide12) {
      this.btnCloseVideoSlide12.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!this.isSlide12VideoCompleted) {
          sound.playError();
          this.showToast('Watch video to completion before closing.');
          return;
        }
        sound.playClick();
        this.closeSlide12VideoModal();
      });
    }

    // Modal Backdrop Click
    if (this.backdropVideoSlide12) {
      this.backdropVideoSlide12.addEventListener('click', () => {
        if (!this.isSlide12VideoCompleted) {
          sound.playError();
          this.showToast('Watch video to completion before closing.');
        } else {
          this.closeSlide12VideoModal();
        }
      });
    }
  }

  initYouTubePlayer() {
    const setupPlayer = () => {
      if (this.ytPlayerSlide12) return;
      const targetElement = document.getElementById('youtube-player-slide12');
      if (!targetElement || !window.YT || !window.YT.Player) return;

      try {
        this.ytPlayerSlide12 = new window.YT.Player('youtube-player-slide12', {
          videoId: '2sJGVx6b27k',
          playerVars: {
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            controls: 1,
            enablejsapi: 1,
            origin: window.location.origin
          },
          events: {
            'onReady': () => {
              this.isYtPlayerReady = true;
              if (this.modalVideoSlide12 && this.modalVideoSlide12.style.display === 'flex') {
                try {
                  this.ytPlayerSlide12.playVideo();
                } catch (e) { }
              }
            },
            'onStateChange': (event) => {
              // 0 = YT.PlayerState.ENDED, 1 = PLAYING
              const state = event.data;
              const endedState = window.YT && window.YT.PlayerState ? window.YT.PlayerState.ENDED : 0;
              const playingState = window.YT && window.YT.PlayerState ? window.YT.PlayerState.PLAYING : 1;

              if (state === endedState) {
                this.onSlide12VideoEnded();
                this.stopYtProgressTracking();
              } else if (state === playingState) {
                this.startYtProgressTracking();
              } else {
                this.stopYtProgressTracking();
              }
            },
            'onError': (err) => {
              console.warn('[YouTube API] Player error:', err);
              // Unlock so user is not stuck if video is unavailable or offline
              this.onSlide12VideoEnded();
            }
          }
        });
      } catch (err) {
        console.warn('[YouTube API] Init exception:', err);
        this.onSlide12VideoEnded();
      }
    };

    if (window.YT && window.YT.Player) {
      setupPlayer();
    } else {
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevCallback === 'function') prevCallback();
        setupPlayer();
      };
    }
  }

  startYtProgressTracking() {
    this.stopYtProgressTracking();
    this.ytProgressInterval = setInterval(() => {
      if (!this.ytPlayerSlide12 || typeof this.ytPlayerSlide12.getCurrentTime !== 'function') return;
      try {
        const currentTime = this.ytPlayerSlide12.getCurrentTime();
        // Prevent skip ahead past maximum watched time (+ 3.0s buffer)
        if (!this.isSlide12VideoCompleted && currentTime > this.slide12MaxTimeWatched + 3.0) {
          this.ytPlayerSlide12.seekTo(this.slide12MaxTimeWatched, true);
          this.showToast('Watch video sequentially.');
        } else if (currentTime > this.slide12MaxTimeWatched) {
          this.slide12MaxTimeWatched = currentTime;
        }
      } catch (e) { }
    }, 500);
  }

  stopYtProgressTracking() {
    if (this.ytProgressInterval) {
      clearInterval(this.ytProgressInterval);
      this.ytProgressInterval = null;
    }
  }

  onSlide12VideoEnded() {
    this.isSlide12VideoCompleted = true;
    sound.playSuccess();

    if (this.btnCloseVideoSlide12) {
      this.btnCloseVideoSlide12.disabled = false;
      this.btnCloseVideoSlide12.removeAttribute('aria-disabled');
      this.btnCloseVideoSlide12.classList.add('is-ready');
      this.btnCloseVideoSlide12.title = 'Close Video';
    }
    if (this.closeIconSlide12) {
      this.closeIconSlide12.textContent = '✕';
    }
    if (this.statusTextSlide12) {
      this.statusTextSlide12.textContent = '✓ Video completed';
    }
    if (this.watchStatusSlide12) {
      this.watchStatusSlide12.classList.add('completed');
    }
    if (this.footerHintSlide12) {
      this.footerHintSlide12.textContent = 'Video playback completed! Please click Close to proceed.';
    }
    if (this.watchedPillSlide12) {
      this.watchedPillSlide12.style.display = 'inline-flex';
    }
    if (this.btnLaunchVideoSlide12) {
      this.btnLaunchVideoSlide12.classList.add('is-completed');
      const textSpan = this.btnLaunchVideoSlide12.querySelector('.slide12-btn-text');
      if (textSpan) {
        textSpan.textContent = 'Watch the Video! (Replay)';
      }
    }
    this.showToast('Video completed. Close player to proceed.');
  }

  openSlide12VideoModal() {
    if (!this.modalVideoSlide12) return;
    this.modalVideoSlide12.style.display = 'flex';

    if (!this.isSlide12VideoCompleted) {
      if (this.btnCloseVideoSlide12) {
        this.btnCloseVideoSlide12.disabled = true;
        this.btnCloseVideoSlide12.setAttribute('aria-disabled', 'true');
        this.btnCloseVideoSlide12.classList.remove('is-ready');
        this.btnCloseVideoSlide12.title = 'Watch full video to unlock close';
      }
      if (this.closeIconSlide12) {
        this.closeIconSlide12.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2C9.24 2 7 4.24 7 7v3H6c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2h-1V7c0-2.76-2.24-5-5-5zm-3 8V7c0-1.66 1.34-3 3-3s3 1.34 3 3v3H9z"/></svg>';
      }
      if (this.statusTextSlide12) {
        this.statusTextSlide12.textContent = 'Watch full video to unlock close';
      }
      if (this.watchStatusSlide12) {
        this.watchStatusSlide12.classList.remove('completed');
      }
    } else {
      if (this.btnCloseVideoSlide12) {
        this.btnCloseVideoSlide12.disabled = false;
        this.btnCloseVideoSlide12.removeAttribute('aria-disabled');
        this.btnCloseVideoSlide12.classList.add('is-ready');
        this.btnCloseVideoSlide12.title = 'Close Video';
      }
      if (this.closeIconSlide12) {
        this.closeIconSlide12.textContent = '✕';
      }
      if (this.statusTextSlide12) {
        this.statusTextSlide12.textContent = '✓ Video completed';
      }
      if (this.watchStatusSlide12) {
        this.watchStatusSlide12.classList.add('completed');
      }
    }

    if (this.ytPlayerSlide12 && typeof this.ytPlayerSlide12.playVideo === 'function') {
      try {
        this.ytPlayerSlide12.playVideo();
      } catch (err) { }
    }
  }

  closeSlide12VideoModal() {
    if (!this.modalVideoSlide12) return;
    this.stopYtProgressTracking();
    if (this.ytPlayerSlide12 && typeof this.ytPlayerSlide12.pauseVideo === 'function') {
      try {
        this.ytPlayerSlide12.pauseVideo();
      } catch (err) { }
    }
    this.modalVideoSlide12.style.display = 'none';
  }

  openGlosarium() {
    if (!this.glosariumModal) return;
    sound.playPop();
    this.renderGlosariumList('');
    if (this.glosariumSearch) this.glosariumSearch.value = '';
    this.glosariumModal.style.display = 'flex';
  }

  closeGlosarium() {
    if (!this.glosariumModal) return;
    sound.playClick();
    this.glosariumModal.style.display = 'none';
  }

  async openGlossaryModal() {
    if (!this.glossaryModalOverlay) return;

    // Tampilkan overlay loading state
    this.glossaryModalOverlay.removeAttribute('hidden');

    if (this.glossaryTableBody && this.glossaryTableBody.innerHTML.includes('Loading')) {
      // Fetch data hanya sekali — jika sudah dirender, tidak perlu ulang
      try {
        const data = await dataService.getGlossary();
        this.renderGlossaryTable(data);
      } catch (err) {
        if (this.glossaryTableBody) {
          this.glossaryTableBody.innerHTML = `<tr><td colspan="7" class="glossary-loading">Failed to load glossary data. Please check your connection.</td></tr>`;
        }
      }
    }

    // Tutup dengan tombol Escape
    this._glossaryEscHandler = (e) => {
      if (e.key === 'Escape') this.closeGlossaryModal();
    };
    document.addEventListener('keydown', this._glossaryEscHandler);
  }

  closeGlossaryModal() {
    if (!this.glossaryModalOverlay) return;
    this.glossaryModalOverlay.setAttribute('hidden', '');
    if (this._glossaryEscHandler) {
      document.removeEventListener('keydown', this._glossaryEscHandler);
      this._glossaryEscHandler = null;
    }
  }

  renderGlossaryTable(data) {
    if (!this.glossaryTableBody) return;
    if (!Array.isArray(data) || data.length === 0) {
      this.glossaryTableBody.innerHTML = `<tr><td colspan="7" class="glossary-loading">No data available.</td></tr>`;
      return;
    }

    const rows = data.map((item, idx) => {
      const no = item.No ?? (idx + 1);
      const kata = item.Kata || '';
      const pron = item.Pronounsiasi || '';
      const jenis = item.Jenis_Kata || '';
      const en = item.English_Meaning || '';
      const id = item.Arti_ID || '';
      const ex = item.Contoh_Kalimat || '';
      const badge = jenis ? `<span class="glossary-jenis-badge">${jenis}</span>` : '';
      return `<tr>
        <td class="col-no">${no}</td>
        <td class="col-kata">${kata}</td>
        <td class="col-pron">${pron}</td>
        <td class="col-jenis">${badge}</td>
        <td class="col-en">${en}</td>
        <td class="col-id">${id}</td>
        <td class="col-ex">${ex}</td>
      </tr>`;
    });

    this.glossaryTableBody.innerHTML = rows.join('');
  }

  /**
   * Slide 16: Glosarium Single Card Slider (Slide 13 Style)
   */
  async _renderGlossarySlide() {
    try {
      if (!this.glossaryItems || this.glossaryItems.length === 0) {
        const data = await dataService.getGlossary();
        this.glossaryItems = Array.isArray(data) && data.length > 0 ? data : [];
      }
      if (this.glossaryItems.length === 0) return;

      // Inisialisasi Dots Pagination sekali saja
      if (this.slide16DotsContainer && this.slide16DotsContainer.children.length === 0) {
        this.slide16DotsContainer.innerHTML = '';
        this.glossaryItems.forEach((item, idx) => {
          const dot = document.createElement('button');
          dot.type = 'button';
          dot.className = `slide16-dot ${idx === this.glossaryCurrentIndex ? 'active' : ''}`;
          dot.setAttribute('role', 'tab');
          dot.setAttribute('aria-label', `Go to word ${idx + 1}`);
          dot.title = `Word ${idx + 1}: ${item.Kata}`;
          dot.addEventListener('click', (e) => {
            e.stopPropagation();
            sound.playPop();
            const dir = idx >= this.glossaryCurrentIndex ? 'next' : 'prev';
            this.goToGlossaryCard(idx, dir);
          });
          this.slide16DotsContainer.appendChild(dot);
        });
      }

      // Tampilkan kartu aktif
      this.goToGlossaryCard(this.glossaryCurrentIndex, 'next', false);
    } catch (err) {
      console.warn('[Glossary] Failed to load glossary items:', err);
    }
  }

  goToGlossaryCard(index, direction = 'next', shouldAnimate = true) {
    if (!this.glossaryItems || this.glossaryItems.length === 0) return;
    this.stopGlossaryAudio(true);

    if (index < 0) index = this.glossaryItems.length - 1;
    if (index >= this.glossaryItems.length) index = 0;
    this.glossaryCurrentIndex = index;

    const item = this.glossaryItems[index];
    const card = document.getElementById('slide16-card');

    if (card && shouldAnimate) {
      card.classList.remove('slide-in-right', 'slide-in-left');
      void card.offsetWidth; // Force reflow
      card.classList.add(direction === 'next' ? 'slide-in-right' : 'slide-in-left');
    }

    // Populate data
    const badgeType = document.getElementById('slide16-badge-type');
    const counterPill = document.getElementById('slide16-counter-pill');
    const wordTitle = document.getElementById('slide16-word-title');
    const wordPhonetic = document.getElementById('slide16-word-phonetic');
    const descEn = document.getElementById('slide16-meaning-en');
    const descId = document.getElementById('slide16-meaning-id');
    const descEx = document.getElementById('slide16-example-text');

    if (badgeType) badgeType.textContent = item.Jenis_Kata || 'Vocabulary';
    if (counterPill) counterPill.textContent = `Word ${index + 1} of ${this.glossaryItems.length}`;
    if (wordTitle) wordTitle.textContent = item.Kata || '';
    if (wordPhonetic) wordPhonetic.textContent = item.Pronounsiasi || '';
    if (descEn) descEn.textContent = item.English_Meaning || '';
    if (descId) descId.textContent = item.Arti_ID || '';
    if (descEx) descEx.textContent = item.Contoh_Kalimat ? `"${item.Contoh_Kalimat}"` : '';

    // Update active dot
    if (this.slide16DotsContainer) {
      const dots = this.slide16DotsContainer.querySelectorAll('.slide16-dot');
      dots.forEach((dot, idx) => {
        if (idx === index) {
          dot.classList.add('active');
          dot.setAttribute('aria-selected', 'true');
        } else {
          dot.classList.remove('active');
          dot.setAttribute('aria-selected', 'false');
        }
      });
    }
  }

  nextGlossaryCard() {
    if (!this.glossaryItems || this.glossaryItems.length === 0) return;
    const nextIdx = (this.glossaryCurrentIndex + 1) % this.glossaryItems.length;
    this.goToGlossaryCard(nextIdx, 'next');
  }

  prevGlossaryCard() {
    if (!this.glossaryItems || this.glossaryItems.length === 0) return;
    const prevIdx = (this.glossaryCurrentIndex - 1 + this.glossaryItems.length) % this.glossaryItems.length;
    this.goToGlossaryCard(prevIdx, 'prev');
  }

  toggleGlossaryAudio() {
    if (!('speechSynthesis' in window)) {
      this.showToast('Speech synthesis not supported in this browser.');
      return;
    }
    const currentItem = this.glossaryItems[this.glossaryCurrentIndex];
    if (!currentItem) return;

    sound.playClick();

    // 1. Sedang playing -> Pause
    if (this.glossaryAudioState === 'playing') {
      window.speechSynthesis.pause();
      this.glossaryAudioState = 'paused';
      this.updateGlossaryAudioUI('paused');
      return;
    }

    // 2. Sedang paused -> Resume
    if (this.glossaryAudioState === 'paused') {
      window.speechSynthesis.resume();
      this.glossaryAudioState = 'playing';
      this.updateGlossaryAudioUI('playing');
      return;
    }

    // 3. Sedang idle -> Ucapkan kata dengan bahasa Inggris (en-US)
    this.stopGlossaryAudio(false);

    const wordToSpeak = currentItem.Kata || '';
    const utterance = new SpeechSynthesisUtterance(wordToSpeak);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      this.glossaryAudioState = 'playing';
      this.updateGlossaryAudioUI('playing');
    };

    utterance.onend = () => {
      this.glossaryAudioState = 'idle';
      this.updateGlossaryAudioUI('idle');
      this.glossaryUtterance = null;
    };

    utterance.onerror = (e) => {
      console.warn('[Glossary Audio] Utterance error:', e);
      this.glossaryAudioState = 'idle';
      this.updateGlossaryAudioUI('idle');
      this.glossaryUtterance = null;
    };

    this.glossaryUtterance = utterance;
    this.glossaryAudioState = 'playing';
    this.updateGlossaryAudioUI('playing');
    window.speechSynthesis.speak(utterance);
  }

  stopGlossaryAudio(resetUI = true) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.glossaryAudioState = 'idle';
    this.glossaryUtterance = null;
    if (resetUI) {
      this.updateGlossaryAudioUI('idle');
    }
  }

  updateGlossaryAudioUI(state) {
    const playIcon = document.getElementById('slide16-icon-play');
    const pauseIcon = document.getElementById('slide16-icon-pause');
    const btnAudio = document.getElementById('btn-slide16-audio');
    const statusText = document.getElementById('slide16-audio-state-text');

    if (!btnAudio) return;

    if (state === 'playing') {
      btnAudio.classList.add('playing');
      if (playIcon) playIcon.style.display = 'none';
      if (pauseIcon) pauseIcon.style.display = 'block';
      if (statusText) statusText.textContent = 'Pause';
      btnAudio.title = 'Pause Pronunciation';
    } else if (state === 'paused') {
      btnAudio.classList.remove('playing');
      if (playIcon) playIcon.style.display = 'block';
      if (pauseIcon) pauseIcon.style.display = 'none';
      if (statusText) statusText.textContent = 'Resume';
      btnAudio.title = 'Resume Pronunciation';
    } else {
      btnAudio.classList.remove('playing');
      if (playIcon) playIcon.style.display = 'block';
      if (pauseIcon) pauseIcon.style.display = 'none';
      if (statusText) statusText.textContent = 'Pronounce';
      btnAudio.title = 'Play Pronunciation';
    }
  }



  renderGlosariumList(searchTerm = '') {
    if (!this.glosariumGrid) return;
    this.glosariumGrid.innerHTML = '';

    const clean = searchTerm.trim().toLowerCase();
    const filtered = clean
      ? GLOSARIUM_DATA.filter(item =>
        item.term.toLowerCase().includes(clean) ||
        item.def.toLowerCase().includes(clean) ||
        item.category.toLowerCase().includes(clean)
      )
      : GLOSARIUM_DATA;

    if (filtered.length === 0) {
      this.glosariumGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 24px;">Tidak ditemukan istilah yang sesuai.</div>';
      return;
    }

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'glosarium-card';
      card.innerHTML = `
        <div class="glosarium-card-term">
          <span>${item.term}</span>
          <span class="glosarium-card-category">${item.category}</span>
        </div>
        <div class="glosarium-card-def">${item.def}</div>
      `;
      this.glosariumGrid.appendChild(card);
    });
  }

  showToast(message) {
    this.toast.textContent = message;
    this.toast.classList.add('show');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toast.classList.remove('show');
    }, 2500);
  }

  // --- Validasi NIS/NISN & Identitas Siswa (Auto-Cek) ---
  initNISNCheck() {
    if (!this.inputNISN || !this.btnCheckNISN) return;

    // Default kosong sesuai instruksi
    this.inputNISN.value = '';
    this.inputNISN.placeholder = '';

    this.btnCheckNISN.addEventListener('click', () => {
      sound.playClick();
      this.handleCheckNISN();
    });

    this.inputNISN.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sound.playClick();
        this.handleCheckNISN();
      }
    });

    // Reset tombol jika pengguna mengubah isi input (input NIS/NISN baru)
    this.inputNISN.addEventListener('input', () => {
      const val = this.inputNISN.value.trim();

      const currentSaved = dataService.getCurrentStudent();
      const matchesCurrent = currentSaved && (val === currentSaved.NISN || (currentSaved.NIS && val === currentSaved.NIS));
      if (!matchesCurrent) {
        if (currentSaved) {
          dataService.clearSession();
          this.maxSlideVisited = 1;
          this.slide6ViewedStructures = new Set();
          this.slide11ViewedFeatures = new Set();
          this.isSlide12VideoCompleted = false;
          this.updateLockUI();
          this.updateSlide6LockUI();
          this.updateSlide11LockUI();
          this.updateSlide15LockUI();
          this.renderDrawerList();
        }
        if (this.btnStartSplash) this.btnStartSplash.style.display = 'none';
        if (this.btnRetakePretest) this.btnRetakePretest.style.display = 'none';
        if (this.studentCard) this.studentCard.style.display = 'none';
        if (this.btnCloseSplash) this.btnCloseSplash.style.display = 'none';
        this.showNISNFeedback(val ? 'ID number changed. Please click "Verify" again.' : '', '');
      }
    });
  }

  async handleCheckNISN() {
    const rawVal = this.inputNISN ? this.inputNISN.value.trim() : '';

    if (!rawVal) {
      sound.playError();
      this.showNISNFeedback('Please enter your Student ID (NIS/NISN) first.', 'error');
      return;
    }

    this.btnCheckNISN.disabled = true;
    this.btnCheckNISN.textContent = 'Verifying...';
    this.showNISNFeedback('Verifying student data...', '');

    try {
      const result = await dataService.validateNISN(rawVal);
      if (result.success && result.student) {
        sound.playSuccess();
        this.renderVerifiedStudent(result.student);
        const hasPost = dataService.hasPosttestScore();
        const savedPost = dataService.getPosttestScore();
        const savedPre = dataService.getPretestScore();

        let msg = '';
        if (hasPost) {
          msg = `Data siswa terverifikasi (Skor Post-test: ${savedPost}). Semua slide telah terbuka!`;
        } else if (savedPre !== null && savedPre !== undefined) {
          msg = `Data siswa terverifikasi (Skor Pretest: ${savedPre}). Silakan pilih "Next ke Slide 3" atau "Pretest Lagi".`;
        } else {
          msg = 'Data siswa berhasil diverifikasi. Silakan klik "Start Pretest".';
        }
        this.showNISNFeedback(msg, 'success');
      } else {
        sound.playError();
        this.showNISNFeedback(`Student ID "${rawVal}" is not registered in the database.`, 'error');
        if (this.studentCard) this.studentCard.style.display = 'none';
        if (this.btnStartSplash) this.btnStartSplash.style.display = 'none';
        if (this.btnRetakePretest) this.btnRetakePretest.style.display = 'none';
      }
    } catch (err) {
      sound.playError();
      this.showNISNFeedback('Failed to connect to data source. Please try again later.', 'error');
      console.error('[App] Student identity validation error:', err);
    } finally {
      this.btnCheckNISN.disabled = false;
      this.btnCheckNISN.textContent = 'Verify';
    }
  }

  renderVerifiedStudent(student) {
    if (this.studentName) this.studentName.textContent = student.Nama;
    if (this.studentNIS) this.studentNIS.textContent = student.NIS || '-';
    if (this.studentNISN) this.studentNISN.textContent = student.NISN || '-';
    if (this.studentClass) this.studentClass.textContent = student.Kelas || '-';
    if (this.studentCard) this.studentCard.style.display = 'block';

    const hasPostScore = dataService.hasPosttestScore();
    const savedPosttest = dataService.getPosttestScore();
    const savedPretest = dataService.getPretestScore();

    if (hasPostScore) {
      // Siswa sudah memiliki skor post test: semua slide terbuka semua!
      this.maxSlideVisited = 17;
      dataService.saveMaxSlideVisited(17);
      this.isSlide12VideoCompleted = true;
      this.slide6ViewedStructures = new Set(dataService.getSlide6Progress());
      this.slide11ViewedFeatures = new Set(dataService.getSlide11Progress());

      if (this.btnStartSplash) {
        this.btnStartSplash.textContent = `Buka Materi (Post-test: ${savedPosttest}) ➔`;
        this.btnStartSplash.setAttribute('title', 'Semua slide terbuka. Klik untuk masuk.');
        this.btnStartSplash.style.display = 'inline-flex';
      }
      if (this.btnRetakePretest) {
        this.btnRetakePretest.textContent = 'Pretest Lagi ↺';
        this.btnRetakePretest.setAttribute('title', 'Kerjakan ulang Pretest');
        this.btnRetakePretest.style.display = 'inline-flex';
      }
    } else {
      // Siswa belum memiliki skor post test: sinkronkan lock dengan progres akun ini
      this.maxSlideVisited = dataService.getMaxSlideVisited();
      this.slide6ViewedStructures = new Set(dataService.getSlide6Progress());
      this.slide11ViewedFeatures = new Set(dataService.getSlide11Progress());
      this.isSlide12VideoCompleted = false;

      if (savedPretest !== null && savedPretest !== undefined) {
        if (this.btnStartSplash) {
          this.btnStartSplash.textContent = `Next ke Slide 3 (Pretest: ${savedPretest}) ➔`;
          this.btnStartSplash.setAttribute('title', 'Lanjut langsung ke materi Slide 3');
          this.btnStartSplash.style.display = 'inline-flex';
        }
        if (this.btnRetakePretest) {
          this.btnRetakePretest.textContent = 'Pretest Lagi ↺';
          this.btnRetakePretest.setAttribute('title', 'Kerjakan ulang Pretest');
          this.btnRetakePretest.style.display = 'inline-flex';
        }
      } else {
        if (this.btnStartSplash) {
          this.btnStartSplash.textContent = 'Start Pretest ➔';
          this.btnStartSplash.setAttribute('title', 'Mulai pengerjaan Pretest');
          this.btnStartSplash.style.display = 'inline-flex';
        }
        if (this.btnRetakePretest) {
          this.btnRetakePretest.style.display = 'none';
        }
      }
    }

    // Perbarui status semua UI penguncian
    this.updateLockUI();
    this.updateSlide6LockUI();
    this.updateSlide11LockUI();
    this.updateSlide15LockUI();
    this.renderDrawerList();
  }

  handleExitApp() {
    // 1. Reset data sesi siswa aktif
    dataService.clearSession();

    // 2. Reset status progres dan runtime state aplikasi
    this.maxSlideVisited = 1;
    this.slide6ViewedStructures = new Set();
    this.slide11ViewedFeatures = new Set();
    this.isSlide12VideoCompleted = false;
    this.pretestQuestions = [];
    this.pretestIndex = 0;
    this.pretestAnswers = {};
    this.pretestScore = null;
    this.posttestQuestions = [];
    this.posttestIndex = 0;
    this.posttestAnswers = {};
    this.posttestScore = null;
    this.posttestActiveLeftId = null;
    this.posttestTempPairs = {};
    this.posttestAnswered = false;

    // 3. Reset formulir & kartu siswa di Splash Screen
    if (this.inputNISN) this.inputNISN.value = '';
    if (this.studentCard) this.studentCard.style.display = 'none';
    if (this.btnStartSplash) this.btnStartSplash.style.display = 'none';
    if (this.btnRetakePretest) this.btnRetakePretest.style.display = 'none';
    if (this.btnCloseSplash) this.btnCloseSplash.style.display = 'none';
    this.showNISNFeedback('', '');

    // 4. Perbarui status semua UI penguncian (kembali ke kondisi terkunci)
    this.updateLockUI();
    this.updateSlide6LockUI();
    this.updateSlide11LockUI();
    this.updateSlide15LockUI();
    this.renderDrawerList();

    // 5. Kembalikan posisi slide ke Slide 1
    this.goToSlide(1, false);

    // 6. Buka Splash Screen untuk input NIS/NISN baru
    this.openSplash();

    this.showToast('Sesi telah direset. Silakan masukkan NIS/NISN baru.');
  }

  showNISNFeedback(message, type = '') {
    if (!this.feedbackNISN) return;
    this.feedbackNISN.textContent = message;
    this.feedbackNISN.className = `splash-feedback ${type}`.trim();
  }

  // --- HUD Menu & Utility UI Helpers ---
  toggleHUDMenu() {
    if (!this.hudActionsMenu) return;
    const isOpen = this.hudActionsMenu.classList.toggle('open');
    if (this.btnHUDMenuToggle) {
      this.btnHUDMenuToggle.classList.toggle('active', isOpen);
      this.btnHUDMenuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
  }

  openHUDMenu() {
    if (!this.hudActionsMenu) return;
    this.hudActionsMenu.classList.add('open');
    if (this.btnHUDMenuToggle) {
      this.btnHUDMenuToggle.classList.add('active');
      this.btnHUDMenuToggle.setAttribute('aria-expanded', 'true');
    }
  }

  closeHUDMenu() {
    if (!this.hudActionsMenu) return;
    this.hudActionsMenu.classList.remove('open');
    if (this.btnHUDMenuToggle) {
      this.btnHUDMenuToggle.classList.remove('active');
      this.btnHUDMenuToggle.setAttribute('aria-expanded', 'false');
    }
  }

  updateSFXButton(isMuted) {
    if (!this.btnSFX) return;
    if (isMuted) {
      this.btnSFX.classList.remove('active');
      this.btnSFX.innerHTML = `
        <svg class="hud-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <line x1="23" y1="9" x2="17" y2="15"></line>
          <line x1="17" y1="9" x2="23" y2="15"></line>
        </svg>
        <span class="hud-btn-text">Audio Mati</span>
      `;
    } else {
      this.btnSFX.classList.add('active');
      this.btnSFX.innerHTML = `
        <svg class="hud-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
        </svg>
        <span class="hud-btn-text">Audio Aktif</span>
      `;
    }
  }

  updateFullscreenButton(isFullscreen) {
    if (!this.btnFullscreen) return;
    if (isFullscreen) {
      this.btnFullscreen.classList.add('active');
      this.btnFullscreen.innerHTML = `
        <svg class="hud-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
        </svg>
        <span class="hud-btn-text">Exit Fullscreen</span>
      `;
    } else {
      this.btnFullscreen.classList.remove('active');
      this.btnFullscreen.innerHTML = `
        <svg class="hud-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
        </svg>
        <span class="hud-btn-text">Fullscreen</span>
      `;
    }
  }

  updateFlipButton(labelAngle) {
    if (!this.btnFlipOrientation) return;
    this.btnFlipOrientation.innerHTML = `
      <svg class="hud-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="23 4 23 10 17 10"></polyline>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
      </svg>
      <span class="hud-btn-text">Rotate ${labelAngle}</span>
    `;
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        this.requestLandscapeLock();
        this.updateFullscreenButton(true);
      }).catch(err => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      this.updateFullscreenButton(false);
    }
  }

  // --- Orientasi Layar & Auto Rotate ---
  initOrientationHandler() {
    const checkOrientation = () => {
      const isPortrait = window.matchMedia('(orientation: portrait)').matches || (window.innerHeight > window.innerWidth);
      const isMobileOrTablet = window.innerWidth <= 1024 || window.innerHeight <= 1024;
      this.handleOrientationChange(isPortrait && isMobileOrTablet);
    };

    const mql = window.matchMedia('(orientation: portrait)');
    if (mql && mql.addEventListener) {
      mql.addEventListener('change', (e) => {
        const isMobileOrTablet = window.innerWidth <= 1024 || window.innerHeight <= 1024;
        this.handleOrientationChange(e.matches && isMobileOrTablet);
      });
    }

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', () => {
      setTimeout(checkOrientation, 200);
    });

    // Pengecekan awal saat inisialisasi
    checkOrientation();
  }

  requestLandscapeLock() {
    if (screen.orientation && typeof screen.orientation.lock === 'function') {
      screen.orientation.lock('landscape').catch(() => {
        // Abaikan jika browser membatasi penguncian layar tanpa fullscreen atau standalone mode
      });
    }
  }

  handleOrientationChange(isPortrait) {
    this.isPortraitMode = isPortrait;

    if (!this.appContainer) return;

    if (isPortrait) {
      // Hitung dimensi proporsional 16:9 pas saat perangkat diorientasi portrait
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const availW = vh;
      const availH = vw;
      let targetW, targetH;
      if (availW / availH >= (16 / 9)) {
        targetH = availH;
        targetW = availH * (16 / 9);
      } else {
        targetW = availW;
        targetH = availW / (16 / 9);
      }
      this.appContainer.style.width = `${Math.round(targetW)}px`;
      this.appContainer.style.height = `${Math.round(targetH)}px`;

      // Terapkan rotasi landscape simulasi
      if (this.portraitRotationAngle === 270) {
        this.appContainer.classList.remove('force-rotate-90');
        this.appContainer.classList.add('force-rotate-270');
      } else {
        this.appContainer.classList.remove('force-rotate-270');
        this.appContainer.classList.add('force-rotate-90');
      }
      if (this.btnFlipOrientation) {
        this.btnFlipOrientation.style.display = 'inline-flex';
        this.updateFlipButton(this.portraitRotationAngle === 90 ? '270°' : '90°');
      }
      this.requestLandscapeLock();
    } else {
      // Posisi landscape fisik normal
      this.appContainer.style.width = '';
      this.appContainer.style.height = '';
      this.appContainer.classList.remove('force-rotate-90', 'force-rotate-270');
      if (this.btnFlipOrientation) {
        this.btnFlipOrientation.style.display = 'none';
      }
    }
  }

  flipOrientation() {
    this.portraitRotationAngle = this.portraitRotationAngle === 90 ? 270 : 90;
    this.handleOrientationChange(this.isPortraitMode);
    this.showToast(`Screen rotation changed to ${this.portraitRotationAngle}°`);
  }

  // --- Slide 10: Formative Mini-Game ---
  startFormativeGame() {
    this.gameRound = 0;
    this.gameScore = 0;
    this.gameIntroScreen.style.display = 'none';
    this.gamePlayScreen.style.display = 'flex';
    this.renderFormativeRound();
  }

  renderFormativeRound() {
    if (this.gameRound >= FORMATIVE_GAME.length) {
      sound.playFanfare();
      this.gamePlayScreen.innerHTML = `
        <div style="font-family:'Fredoka', cursive; font-size:1.6rem; color:#38bdf8; margin-bottom:6px;">Game Complete</div>
        <p style="color:#cbd5e1; margin-bottom:18px;">Your score: ${this.gameScore} / ${FORMATIVE_GAME.length}</p>
        <button class="game-start-btn" id="btn-replay-game">Play Again</button>
      `;
      document.getElementById('btn-replay-game').addEventListener('click', () => {
        this.startFormativeGame();
      });
      return;
    }

    const current = FORMATIVE_GAME[this.gameRound];
    this.gameRoundIndicator.textContent = `Round ${this.gameRound + 1} / ${FORMATIVE_GAME.length}`;
    this.gameVerbPrompt.textContent = current.present;
    this.gameSentenceText.textContent = current.sentence;

    this.gameOptionsContainer.innerHTML = '';
    current.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'game-opt-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => this.handleFormativeAnswer(btn, opt, current.correct));
      this.gameOptionsContainer.appendChild(btn);
    });
  }

  handleFormativeAnswer(clickedBtn, selectedOption, correctOption) {
    const buttons = this.gameOptionsContainer.querySelectorAll('.game-opt-btn');
    buttons.forEach(b => b.disabled = true);

    if (selectedOption === correctOption) {
      sound.playSuccess();
      clickedBtn.classList.add('correct');
      this.gameScore++;
    } else {
      sound.playError();
      clickedBtn.classList.add('wrong');
      buttons.forEach(b => {
        if (b.textContent === correctOption) {
          b.classList.add('correct');
        }
      });
    }

    setTimeout(() => {
      this.gameRound++;
      this.renderFormativeRound();
    }, 1400);
  }

  // =========================================================================
  // FASE 3: MODUL & ENGINE PRETEST
  // =========================================================================

  async startPretest() {
    try {
      this.pretestQuestions = await dataService.getPretestQuestions();
    } catch (err) {
      console.warn('[Pretest] Failed to load pretest questions:', err);
      this.pretestQuestions = [];
    }

    if (!this.pretestQuestions || this.pretestQuestions.length === 0) {
      this.showToast('Failed to load pretest questions. Redirecting to material...');
      this.closePretestAndStartLearning();
      return;
    }

    this.pretestIndex = 0;
    this.pretestAnswers = {};
    this.pretestScore = null;

    const student = dataService.getCurrentStudent();
    if (this.pretestStudentTag) {
      this.pretestStudentTag.textContent = student ? `${student.Nama} (${student.Kelas || 'Student'})` : 'Student';
    }

    if (this.pretestQuizView) this.pretestQuizView.style.display = 'flex';
    if (this.pretestResultView) this.pretestResultView.style.display = 'none';

    if (this.pretestModal) {
      this.pretestModal.style.display = 'flex';
      // Force reflow for CSS animation
      void this.pretestModal.offsetWidth;
      this.pretestModal.classList.add('active');
    }

    this.renderPretestQuestion();
  }

  renderPretestQuestion() {
    const total = this.pretestQuestions.length;
    if (this.pretestIndex < 0 || this.pretestIndex >= total) return;

    const q = this.pretestQuestions[this.pretestIndex];

    if (this.pretestCounter) {
      this.pretestCounter.textContent = `Question ${this.pretestIndex + 1} of ${total}`;
    }

    if (this.pretestProgressFill) {
      const pct = Math.round(((this.pretestIndex + 1) / total) * 100);
      this.pretestProgressFill.style.width = `${pct}%`;
    }

    if (this.pretestQuestionText) {
      this.pretestQuestionText.textContent = q.Pertanyaan || '';
    }

    const currentAnswer = this.pretestAnswers[this.pretestIndex];
    if (this.pretestHint) {
      if (currentAnswer) {
        this.pretestHint.textContent = `Your answer: Option ${currentAnswer}`;
      } else {
        this.pretestHint.textContent = 'Select an answer to proceed.';
      }
    }

    if (this.btnPretestNext) {
      this.btnPretestNext.disabled = !currentAnswer;
      if (this.pretestIndex === total - 1) {
        this.btnPretestNext.textContent = 'Submit Answers ➔';
      } else {
        this.btnPretestNext.textContent = 'Next Question ➔';
      }
    }

    if (this.pretestOptionsList) {
      this.pretestOptionsList.innerHTML = '';
      const options = [
        { letter: 'A', text: q.Opsi_A },
        { letter: 'B', text: q.Opsi_B },
        { letter: 'C', text: q.Opsi_C },
        { letter: 'D', text: q.Opsi_D }
      ];
      if (q.Opsi_E) {
        options.push({ letter: 'E', text: q.Opsi_E });
      }

      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pretest-opt-btn';
        if (currentAnswer === opt.letter) {
          btn.classList.add('selected');
        }

        const letterSpan = document.createElement('span');
        letterSpan.className = 'pretest-opt-letter';
        letterSpan.textContent = opt.letter;

        const textSpan = document.createElement('span');
        textSpan.className = 'pretest-opt-text';
        textSpan.textContent = opt.text || '';

        btn.appendChild(letterSpan);
        btn.appendChild(textSpan);

        btn.addEventListener('click', () => {
          this.handlePretestOptionSelect(opt.letter, btn);
        });

        this.pretestOptionsList.appendChild(btn);
      });
    }
  }

  handlePretestOptionSelect(letter, clickedBtn) {
    sound.playClick();
    this.pretestAnswers[this.pretestIndex] = letter;

    if (this.pretestOptionsList) {
      const allBtns = this.pretestOptionsList.querySelectorAll('.pretest-opt-btn');
      allBtns.forEach(b => b.classList.remove('selected'));
    }
    clickedBtn.classList.add('selected');

    if (this.pretestHint) {
      this.pretestHint.textContent = `Your answer: Option ${letter}`;
    }

    if (this.btnPretestNext) {
      this.btnPretestNext.disabled = false;
    }
  }

  handlePretestNext() {
    if (!this.pretestAnswers[this.pretestIndex]) return;

    sound.playClick();
    const total = this.pretestQuestions.length;

    if (this.pretestIndex < total - 1) {
      this.pretestIndex++;
      this.renderPretestQuestion();
    } else {
      this.finishPretest();
    }
  }

  finishPretest() {
    let correctCount = 0;
    const total = this.pretestQuestions.length || 5;

    this.pretestQuestions.forEach((q, idx) => {
      const answered = this.pretestAnswers[idx];
      const correctKey = String(q.Kunci || '').trim().toUpperCase();
      if (answered && answered.toUpperCase() === correctKey) {
        correctCount++;
      }
    });

    const finalScore = Math.round((correctCount / total) * 100);
    const saveRes = dataService.savePretestScore(finalScore);
    const highestScore = dataService.getPretestScore() ?? finalScore;
    this.pretestScore = highestScore;

    sound.playSuccess();

    if (this.pretestQuizView) this.pretestQuizView.style.display = 'none';
    if (this.pretestResultView) this.pretestResultView.style.display = 'flex';

    if (this.pretestFinalScore) {
      this.pretestFinalScore.textContent = `${finalScore} / 100`;
    }

    if (this.pretestScoreDetail) {
      if (saveRes && !saveRes.saved && saveRes.currentScore > finalScore) {
        this.pretestScoreDetail.textContent = `Correct answers: ${correctCount} of ${total} questions (Highest score kept: ${saveRes.currentScore})`;
      } else {
        this.pretestScoreDetail.textContent = `Correct answers: ${correctCount} of ${total} questions`;
      }
    }

    if (saveRes && !saveRes.saved && saveRes.currentScore > finalScore) {
      this.showToast(`Pretest: ${finalScore} (Highest score kept: ${saveRes.currentScore})`);
    } else {
      this.showToast(`Pretest completed. Score: ${finalScore}`);
    }
  }

  closePretestAndStartLearning() {
    sound.playPop();

    if (this.pretestModal) {
      this.pretestModal.classList.add('fade-out');
      setTimeout(() => {
        this.pretestModal.style.display = 'none';
        this.pretestModal.classList.remove('fade-out', 'active');
      }, 300);
    }

    // Arahkan ke materi (Slide 3 jika intro sudah pernah dibuka, atau Slide 1 jika pertama kali)
    const targetSlide = this.hasVisitedIntro() ? 3 : 1;
    this.goToSlide(targetSlide, false);
    if (targetSlide === 1 && this.videoSlide1) {
      this.videoSlide1.muted = sound.muted;
      this.playSlideVideo(this.videoSlide1);
    }

    const student = dataService.getCurrentStudent();
    if (student) {
      this.showToast(`Pretest verified for ${student.Nama}.`);
    }
  }

  // =========================================================================
  // FASE 5: MODUL & ENGINE POST-TEST DINAMIS (15 SOAL: MCQ & MATCHING)
  // =========================================================================

  isPosttestCompleted() {
    if (dataService.hasPosttestScore()) return true;
    const score = dataService.getPosttestScore();
    return score !== null && score !== undefined;
  }

  updateSlide15LockUI() {
    const completed = this.isPosttestCompleted();
    if (this.btnSlide15Next) {
      if (completed) {
        this.btnSlide15Next.classList.remove('is-locked');
        this.btnSlide15Next.title = 'Go to Slide 16 (Glossary)';
      } else {
        this.btnSlide15Next.classList.add('is-locked');
        this.btnSlide15Next.title = 'Locked - Complete Post-test to proceed';
      }
    }
  }

  updateSlide15UI() {
    const student = dataService.getCurrentStudent();
    if (this.posttestStartStudentName) {
      this.posttestStartStudentName.textContent = student?.Nama || 'Student';
    }
    if (this.posttestStartStudentClass) {
      this.posttestStartStudentClass.textContent = student?.Kelas ? `Class ${student.Kelas}` : 'Class -';
    }
    if (this.posttestStartStudentNisn) {
      this.posttestStartStudentNisn.textContent = student?.NISN ? `NISN: ${student.NISN}` : 'NISN: -';
    }

    const prevScore = dataService.getPosttestScore();
    if (prevScore !== null && prevScore !== undefined) {
      if (this.posttestPrevScorePill) this.posttestPrevScorePill.style.display = 'inline-flex';
      if (this.posttestPrevScoreVal) this.posttestPrevScoreVal.textContent = String(prevScore);
      if (this.btnLaunchQuiz) {
        this.btnLaunchQuiz.textContent = 'Retake Post-test ➔';
      }
    } else {
      if (this.posttestPrevScorePill) this.posttestPrevScorePill.style.display = 'none';
      if (this.btnLaunchQuiz) {
        this.btnLaunchQuiz.textContent = 'Start Post-test ➔';
      }
    }

    if (this.quizModal) {
      this.quizModal.style.display = 'flex';
    }
  }

  async startPosttest() {
    try {
      this.posttestQuestions = await dataService.getPosttestQuestions();
    } catch (err) {
      console.warn('[Posttest] Failed to load evaluation questions:', err);
      this.posttestQuestions = [];
    }

    if (!this.posttestQuestions || this.posttestQuestions.length === 0) {
      this.showToast('Failed to load evaluation questions. Please try again later.');
      return;
    }

    this.posttestIndex = 0;
    this.posttestAnswers = {};
    this.posttestScore = null;
    this.posttestActiveLeftId = null;
    this.posttestTempPairs = {};
    this.posttestAnswered = false;
    this.currentMatchingData = null;

    const student = dataService.getCurrentStudent();
    if (this.posttestStudentTag) {
      this.posttestStudentTag.textContent = student ? `${student.Nama} (${student.Kelas || 'Student'})` : 'Student';
    }

    if (this.posttestStartView) this.posttestStartView.style.display = 'none';
    if (this.posttestQuizView) this.posttestQuizView.style.display = 'flex';
    if (this.quizResultScreen) this.quizResultScreen.style.display = 'none';

    if (this.quizModal) {
      this.quizModal.style.display = 'flex';
      void this.quizModal.offsetWidth;
      this.quizModal.classList.add('active');
    }

    this.renderPosttestQuestion();
  }

  renderPosttestQuestion() {
    const total = this.posttestQuestions.length || 15;
    if (this.posttestIndex < 0 || this.posttestIndex >= total) return;

    const q = this.posttestQuestions[this.posttestIndex];
    this.posttestAnswered = false;
    this.posttestActiveLeftId = null;
    this.posttestTempPairs = {};

    // Header Meta
    if (this.posttestCounter) {
      this.posttestCounter.textContent = `Question ${this.posttestIndex + 1} of ${total}`;
    }

    if (this.posttestProgressFill) {
      const pct = Math.round(((this.posttestIndex + 1) / total) * 100);
      this.posttestProgressFill.style.width = `${pct}%`;
    }

    const isMatching = (q.Tipe || '').toLowerCase() === 'matching';
    if (this.posttestTypeBadge) {
      this.posttestTypeBadge.textContent = isMatching ? 'Matching Pairs' : 'Multiple Choice';
    }

    if (this.posttestQuestionText) {
      this.posttestQuestionText.textContent = q.Pertanyaan || '';
    }

    // Reset Box Penjelasan & Tombol Lanjut
    if (this.posttestExplanationBox) {
      this.posttestExplanationBox.style.display = 'none';
      this.posttestExplanationBox.innerHTML = '';
    }

    if (this.btnNextQuestion) {
      this.btnNextQuestion.disabled = true;
      if (this.posttestIndex === total - 1) {
        this.btnNextQuestion.textContent = 'View Evaluation Results ➔';
      } else {
        this.btnNextQuestion.textContent = 'Next Question ➔';
      }
    }

    if (isMatching) {
      // Tampilkan kontainer Matching
      if (this.posttestMcqContainer) this.posttestMcqContainer.style.display = 'none';
      if (this.posttestMatchingContainer) this.posttestMatchingContainer.style.display = 'flex';
      if (this.posttestHint) {
        this.posttestHint.textContent = 'Connect all card pairs, then click "Confirm Pairs".';
      }
      this.setupMatchingQuestion(q);
    } else {
      // Tampilkan kontainer MCQ
      if (this.posttestMatchingContainer) this.posttestMatchingContainer.style.display = 'none';
      if (this.posttestMcqContainer) this.posttestMcqContainer.style.display = 'flex';
      if (this.posttestHint) {
        this.posttestHint.textContent = 'Select an answer to proceed.';
      }
      this.setupMCQQuestion(q);
    }
  }

  // --- Penangan Soal Pilihan Ganda (MCQ) ---
  setupMCQQuestion(q) {
    if (!this.posttestOptionsList) return;
    this.posttestOptionsList.innerHTML = '';

    const currentAnswer = this.posttestAnswers[this.posttestIndex]?.selected;

    const options = [
      { letter: 'A', text: q.Opsi_A },
      { letter: 'B', text: q.Opsi_B },
      { letter: 'C', text: q.Opsi_C },
      { letter: 'D', text: q.Opsi_D }
    ];

    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'posttest-opt-btn';
      if (currentAnswer === opt.letter) {
        btn.classList.add('selected');
      }

      const letterSpan = document.createElement('span');
      letterSpan.className = 'posttest-opt-letter';
      letterSpan.textContent = opt.letter;

      const textSpan = document.createElement('span');
      textSpan.className = 'posttest-opt-text';
      textSpan.textContent = opt.text || '';

      btn.appendChild(letterSpan);
      btn.appendChild(textSpan);

      btn.addEventListener('click', () => {
        this.handlePosttestMCQSelection(btn, opt.letter, q);
      });

      this.posttestOptionsList.appendChild(btn);
    });

    if (currentAnswer) {
      if (this.posttestHint) {
        this.posttestHint.textContent = `Your answer: Option ${currentAnswer}. Click "Next Question" to proceed.`;
      }
      if (this.btnNextQuestion) {
        this.btnNextQuestion.disabled = false;
      }
    }
  }

  handlePosttestMCQSelection(clickedBtn, letter, q) {
    sound.playClick();

    const allButtons = this.posttestOptionsList.querySelectorAll('.posttest-opt-btn');
    allButtons.forEach(b => b.classList.remove('selected'));
    clickedBtn.classList.add('selected');

    const correctKey = String(q.Kunci || '').trim().toUpperCase();
    const isCorrect = letter.toUpperCase() === correctKey;

    this.posttestAnswers[this.posttestIndex] = {
      type: 'mcq',
      selected: letter,
      isCorrect: isCorrect,
      earnedPoints: isCorrect ? 1.0 : 0.0
    };

    if (this.posttestHint) {
      this.posttestHint.textContent = `Your answer: Option ${letter}. Click "Next Question" to proceed.`;
    }

    // Pastikan kunci jawaban dan pembahasan TIDAK ditampilkan pada post-test
    if (this.posttestExplanationBox) {
      this.posttestExplanationBox.style.display = 'none';
      this.posttestExplanationBox.innerHTML = '';
    }

    if (this.btnNextQuestion) {
      this.btnNextQuestion.disabled = false;
    }
  }

  // --- Penangan Soal Mencocokkan (Tap-to-Pair) ---
  setupMatchingQuestion(q) {
    const rawLeft = (q.Pasangan_Kiri || '').split('|').map(s => s.trim()).filter(Boolean);
    const rawRight = (q.Pasangan_Kanan || '').split('|').map(s => s.trim()).filter(Boolean);

    const leftItems = rawLeft.map((text, idx) => ({ id: idx, text }));
    const rightItems = rawRight.map((text, idx) => ({ originalId: idx, text }));

    // Acak posisi item kanan (Fisher-Yates shuffle)
    const shuffledRight = [...rightItems];
    for (let i = shuffledRight.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledRight[i], shuffledRight[j]] = [shuffledRight[j], shuffledRight[i]];
    }

    this.currentMatchingData = { leftItems, shuffledRight, q };
    this.posttestTempPairs = {};
    this.posttestActiveLeftId = null;

    if (this.posttestMatchingHint) {
      this.posttestMatchingHint.textContent = 'Tap a card in the left column, then tap its matching pair in the right column.';
    }

    this.renderMatchingCards();
  }

  renderMatchingCards() {
    if (!this.currentMatchingData) return;
    const { leftItems, shuffledRight } = this.currentMatchingData;

    // Tentukan nomor pasangan untuk visualisasi (1-4)
    const pairColors = ['paired-1', 'paired-2', 'paired-3', 'paired-4', 'paired-5'];
    const assignedPairs = {};
    let pairCounter = 1;
    leftItems.forEach(item => {
      if (this.posttestTempPairs[item.id] !== undefined) {
        assignedPairs[item.id] = {
          num: pairCounter,
          colorClass: pairColors[(pairCounter - 1) % pairColors.length]
        };
        pairCounter++;
      }
    });

    // Render Kolom Kiri
    if (this.matchingItemsLeft) {
      this.matchingItemsLeft.innerHTML = '';
      leftItems.forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = 'matching-item';
        card.setAttribute('data-left-id', String(item.id));

        const pairInfo = assignedPairs[item.id];
        if (pairInfo) {
          card.classList.add(pairInfo.colorClass);
        }

        if (this.posttestActiveLeftId === item.id) {
          card.classList.add('is-selected');
        }

        if (this.posttestAnswered) {
          card.classList.add('locked');
        }

        const badge = document.createElement('div');
        badge.className = 'matching-item-badge';
        badge.textContent = String(idx + 1);

        const content = document.createElement('div');
        content.className = 'matching-item-content';
        content.textContent = item.text;

        card.appendChild(badge);
        card.appendChild(content);

        if (pairInfo) {
          const statusTag = document.createElement('span');
          statusTag.className = 'matching-pair-badge';
          statusTag.textContent = `Pair ${pairInfo.num}`;
          card.appendChild(statusTag);
        }

        card.addEventListener('click', () => {
          this.handleMatchingLeftClick(item.id);
        });

        this.matchingItemsLeft.appendChild(card);
      });
    }

    // Render Kolom Kanan
    if (this.matchingItemsRight) {
      this.matchingItemsRight.innerHTML = '';
      shuffledRight.forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = 'matching-item';
        card.setAttribute('data-right-id', String(item.originalId));

        // Cari apakah right item ini terpasang ke left item manapun
        let pairedLeftId = null;
        for (const [lId, rId] of Object.entries(this.posttestTempPairs)) {
          if (Number(rId) === item.originalId) {
            pairedLeftId = Number(lId);
            break;
          }
        }

        const pairInfo = pairedLeftId !== null ? assignedPairs[pairedLeftId] : null;
        if (pairInfo) {
          card.classList.add(pairInfo.colorClass);
        }

        if (this.posttestAnswered) {
          card.classList.add('locked');
        }

        const badge = document.createElement('div');
        badge.className = 'matching-item-badge';
        badge.textContent = String.fromCharCode(65 + idx);

        const content = document.createElement('div');
        content.className = 'matching-item-content';
        content.textContent = item.text;

        card.appendChild(badge);
        card.appendChild(content);

        if (pairInfo) {
          const statusTag = document.createElement('span');
          statusTag.className = 'matching-pair-badge';
          statusTag.textContent = `Pair ${pairInfo.num}`;
          card.appendChild(statusTag);
        }

        card.addEventListener('click', () => {
          this.handleMatchingRightClick(item.originalId);
        });

        this.matchingItemsRight.appendChild(card);
      });
    }

    // Update Action Status
    const count = Object.keys(this.posttestTempPairs).length;
    const totalPairs = leftItems.length;

    if (this.matchingStatusText) {
      this.matchingStatusText.textContent = `Matched: ${count} / ${totalPairs} Pairs`;
    }

    if (this.btnVerifyMatching) {
      this.btnVerifyMatching.disabled = count < totalPairs || this.posttestAnswered;
    }

    if (this.btnResetMatching) {
      this.btnResetMatching.disabled = count === 0 || this.posttestAnswered;
    }
  }

  handleMatchingLeftClick(leftId) {
    if (this.posttestAnswered) return;

    if (this.posttestTempPairs[leftId] !== undefined) {
      // Hapus pasangan yang sudah ada jika diklik kembali
      delete this.posttestTempPairs[leftId];
      this.posttestActiveLeftId = null;
      sound.playClick();
      if (this.posttestMatchingHint) {
        this.posttestMatchingHint.textContent = 'Pair cancelled. Select a left card to pair again.';
      }
    } else {
      if (this.posttestActiveLeftId === leftId) {
        this.posttestActiveLeftId = null;
        sound.playPop();
      } else {
        this.posttestActiveLeftId = leftId;
        sound.playPop();
        if (this.posttestMatchingHint) {
          this.posttestMatchingHint.textContent = 'Left card selected. Now tap its matching pair in the right column.';
        }
      }
    }
    this.renderMatchingCards();
  }

  handleMatchingRightClick(rightOrigId) {
    if (this.posttestAnswered) return;

    if (this.posttestActiveLeftId === null) {
      // Tidak ada kartu kiri yang aktif dipilih
      // Cek apakah kartu kanan ini sudah terpasang
      let pairedLeft = null;
      for (const [lId, rId] of Object.entries(this.posttestTempPairs)) {
        if (Number(rId) === rightOrigId) {
          pairedLeft = lId;
          break;
        }
      }
      if (pairedLeft !== null) {
        delete this.posttestTempPairs[pairedLeft];
        sound.playClick();
        if (this.posttestMatchingHint) {
          this.posttestMatchingHint.textContent = 'Pair cancelled. Tap a card in the left column first.';
        }
        this.renderMatchingCards();
      } else {
        sound.playPop();
        if (this.posttestMatchingHint) {
          this.posttestMatchingHint.textContent = 'Select a card in the left column first before choosing a right pair.';
        }
      }
      return;
    }

    // Jika kartu kanan ini sebelumnya telah terpasang ke left item lain, hapus pasangan sebelumnya
    for (const [lId, rId] of Object.entries(this.posttestTempPairs)) {
      if (Number(rId) === rightOrigId) {
        delete this.posttestTempPairs[lId];
        break;
      }
    }

    // Pasangkan dengan left item yang aktif
    this.posttestTempPairs[this.posttestActiveLeftId] = rightOrigId;
    this.posttestActiveLeftId = null;
    sound.playClick();

    const count = Object.keys(this.posttestTempPairs).length;
    const total = this.currentMatchingData.leftItems.length;

    if (this.posttestMatchingHint) {
      if (count === total) {
        this.posttestMatchingHint.textContent = 'All pairs connected. Click "Confirm Pairs" to confirm.';
      } else {
        this.posttestMatchingHint.textContent = `Pair connected! Continue (${count} of ${total}).`;
      }
    }

    this.renderMatchingCards();
  }

  resetMatchingPairs() {
    if (this.posttestAnswered) return;
    this.posttestTempPairs = {};
    this.posttestActiveLeftId = null;
    if (this.posttestMatchingHint) {
      this.posttestMatchingHint.textContent = 'All pairs reset. Tap a left card, then match with a right card.';
    }
    this.renderMatchingCards();
  }

  verifyMatchingAnswer() {
    if (this.posttestAnswered || !this.currentMatchingData) return;
    this.posttestAnswered = true;

    sound.playClick();

    const { leftItems } = this.currentMatchingData;
    let correctCount = 0;

    leftItems.forEach(item => {
      if (this.posttestTempPairs[item.id] === item.id) {
        correctCount++;
      }
    });

    const totalPairs = leftItems.length || 5;
    const earnedPoints = correctCount;

    this.posttestAnswers[this.posttestIndex] = {
      type: 'matching',
      correctCount,
      totalPairs,
      earnedPoints
    };

    if (this.posttestHint) {
      this.posttestHint.textContent = 'Pairs confirmed. Click "Next Question" to proceed.';
    }

    // Render kartu dengan status terkunci tanpa menampilkan kunci benar/salah
    this.renderMatchingCards();

    // Pastikan penjelasan dan kunci jawaban pasangan TIDAK ditampilkan
    if (this.posttestExplanationBox) {
      this.posttestExplanationBox.style.display = 'none';
      this.posttestExplanationBox.innerHTML = '';
    }

    if (this.btnNextQuestion) {
      this.btnNextQuestion.disabled = false;
    }
  }

  nextPosttestQuestion() {
    const total = this.posttestQuestions.length || 15;
    if (this.posttestIndex < total - 1) {
      this.posttestIndex++;
      this.renderPosttestQuestion();
    } else {
      this.finishPosttest();
    }
  }

  async finishPosttest() {
    let totalEarned = 0;
    let mcqCorrect = 0;
    let matchingFullCorrect = 0;
    let matchingPairsCorrect = 0;
    let matchingPairsTotal = 0;

    // Total butir evaluasi: 10 MCQ (10 poin) + 5 Pasangan Menjodohkan (5 poin) = 15 poin maksimal
    const totalItems = 15;

    this.posttestQuestions.forEach((q, idx) => {
      const ans = this.posttestAnswers[idx];
      if (ans) {
        if (ans.type === 'mcq') {
          if (ans.isCorrect) {
            mcqCorrect++;
            totalEarned += 1;
          }
        } else if (ans.type === 'matching') {
          const pairsCorrect = (ans.correctCount || 0);
          matchingPairsCorrect += pairsCorrect;
          matchingPairsTotal += (ans.totalPairs || 5);
          totalEarned += pairsCorrect; // 1 poin per pasangan cocok
          if (ans.correctCount === ans.totalPairs) matchingFullCorrect++;
        }
      }
    });

    const finalScore = Math.min(100, Math.round((totalEarned / totalItems) * 100));
    const saveRes = dataService.savePosttestScore(finalScore);
    const highestPosttest = dataService.getPosttestScore() ?? finalScore;
    this.posttestScore = highestPosttest;

    // Kirim & simpan skor ke Leaderboard secara otomatis
    const student = dataService.getCurrentStudent();
    const pretestScore = dataService.getPretestScore() || 0;

    const pad = (n) => String(n).padStart(2, '0');
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    try {
      await dataService.submitScore({
        timestamp: timestamp,
        nisn: student?.NISN || '-',
        nama: student?.Nama || 'Student',
        nilaiPretest: pretestScore,
        nilaiPosttest: highestPosttest,
        totalSkor: highestPosttest
      });
    } catch (e) {
      console.warn('[Posttest] Failed to update leaderboard:', e);
    }

    sound.playFanfare();

    // Kalkulasi N-Gain Score (Hake, 1998) berdasarkan skor tertinggi yang tersimpan
    const delta = highestPosttest - pretestScore;
    let nGain = 0;
    if (100 - pretestScore <= 0) {
      nGain = highestPosttest >= 100 ? 1.0 : 0.0;
    } else {
      nGain = Math.round(((highestPosttest - pretestScore) / (100 - pretestScore)) * 100) / 100;
    }
    const nGainPercent = Math.round(nGain * 100);

    let nGainCategory = 'Low';
    let nGainCatClass = 'low';
    let nGainDesc = `Material comprehension improvement is categorized as low (g = ${nGain.toFixed(2)}). It is recommended to review the material on Slides 4–14.`;

    if (nGain >= 0.70) {
      nGainCategory = 'High';
      nGainCatClass = 'high';
      nGainDesc = `Outstanding! Material comprehension improvement is categorized as high (g = ${nGain.toFixed(2)}, effectiveness ${nGainPercent}%). Concepts were mastered thoroughly.`;
    } else if (nGain >= 0.30) {
      nGainCategory = 'Medium';
      nGainCatClass = 'mid';
      nGainDesc = `Good job! Material comprehension improvement is moderately effective (g = ${nGain.toFixed(2)}, effectiveness ${nGainPercent}%). Core concepts were well understood.`;
    }

    // Tampilkan Layar Hasil
    if (this.posttestStartView) this.posttestStartView.style.display = 'none';
    if (this.posttestQuizView) this.posttestQuizView.style.display = 'none';
    if (this.quizResultScreen) this.quizResultScreen.style.display = 'flex';
    if (this.quizModal) this.quizModal.style.display = 'flex';

    if (this.posttestSummaryName) this.posttestSummaryName.textContent = student?.Nama || 'Student';
    if (this.posttestSummaryClass) this.posttestSummaryClass.textContent = student?.Kelas || '-';
    if (this.posttestSummaryNISN) this.posttestSummaryNISN.textContent = student?.NISN || '-';

    if (this.posttestFinalScore) {
      this.posttestFinalScore.textContent = `${finalScore} / 100`;
    }

    if (this.posttestScoreBreakdown) {
      if (saveRes && !saveRes.saved && saveRes.currentScore > finalScore) {
        this.posttestScoreBreakdown.textContent = `Multiple Choice: ${mcqCorrect} / 10 • Matching: ${matchingPairsCorrect} / ${matchingPairsTotal || 5} Pairs (Highest score kept: ${highestPosttest})`;
      } else {
        this.posttestScoreBreakdown.textContent = `Multiple Choice: ${mcqCorrect} / 10 • Matching: ${matchingPairsCorrect} / ${matchingPairsTotal || 5} Pairs`;
      }
    }

    if (this.posttestCompPretest) {
      this.posttestCompPretest.textContent = pretestScore !== null ? `${pretestScore}` : '0';
    }

    if (this.posttestCompPosttest) {
      this.posttestCompPosttest.textContent = `${highestPosttest}`;
    }

    if (this.posttestCompGain) {
      this.posttestCompGain.textContent = delta >= 0 ? `+${delta}` : `${delta}`;
      this.posttestCompGain.className = delta > 0 ? 'comp-val gain-pos' : (delta < 0 ? 'comp-val gain-neg' : 'comp-val');
    }

    if (this.posttestCompNGain) {
      this.posttestCompNGain.textContent = `${nGain.toFixed(2)}`;
    }

    if (this.posttestCompNGainBadge) {
      this.posttestCompNGainBadge.textContent = `${nGainCategory} (${nGainPercent}%)`;
      this.posttestCompNGainBadge.className = `comp-sub ${nGainCatClass}`;
    }

    if (this.ngainCategoryPill) {
      this.ngainCategoryPill.textContent = nGainCategory;
      this.ngainCategoryPill.className = `ngain-category-pill ${nGainCatClass}`;
    }

    if (this.ngainDescText) {
      this.ngainDescText.textContent = nGainDesc;
    }

    if (this.ngainProgressFill) {
      this.ngainProgressFill.style.width = `${Math.min(100, Math.max(0, nGainPercent))}%`;
    }

    // Default ke tab ringkasan
    this.switchPosttestTab('summary');
    // Pre-render data leaderboard di latar belakang
    this.renderLeaderboard();

    this.maxSlideVisited = 17;
    dataService.saveMaxSlideVisited(17);
    this.isSlide12VideoCompleted = true;
    this.updateLockUI();
    this.updateSlide6LockUI();
    this.updateSlide11LockUI();
    this.updateSlide15LockUI();
    this.renderDrawerList();

    if (saveRes && !saveRes.saved && saveRes.currentScore > finalScore) {
      this.showToast(`Post-test: ${finalScore} (Highest score kept: ${highestPosttest}, N-Gain: ${nGain.toFixed(2)})`);
    } else {
      this.showToast(`Post-test completed. Score: ${finalScore} (N-Gain: ${nGain.toFixed(2)})`);
    }
  }

  switchPosttestTab(tabName = 'summary') {
    if (tabName === 'leaderboard') {
      if (this.tabBtnSummary) {
        this.tabBtnSummary.classList.remove('active');
        this.tabBtnSummary.setAttribute('aria-selected', 'false');
      }
      if (this.tabBtnLeaderboard) {
        this.tabBtnLeaderboard.classList.add('active');
        this.tabBtnLeaderboard.setAttribute('aria-selected', 'true');
      }
      if (this.tabPaneSummary) this.tabPaneSummary.style.display = 'none';
      if (this.tabPaneLeaderboard) {
        this.tabPaneLeaderboard.style.display = 'flex';
        this.renderLeaderboard();
      }
    } else {
      if (this.tabBtnLeaderboard) {
        this.tabBtnLeaderboard.classList.remove('active');
        this.tabBtnLeaderboard.setAttribute('aria-selected', 'false');
      }
      if (this.tabBtnSummary) {
        this.tabBtnSummary.classList.add('active');
        this.tabBtnSummary.setAttribute('aria-selected', 'true');
      }
      if (this.tabPaneLeaderboard) this.tabPaneLeaderboard.style.display = 'none';
      if (this.tabPaneSummary) this.tabPaneSummary.style.display = 'flex';
    }
  }

  async renderLeaderboard() {
    if (!this.leaderboardTableBody) return;
    this.leaderboardTableBody.innerHTML = `<tr><td colspan="6" style="padding: 16px; color: #94a3b8;">Loading leaderboard data...</td></tr>`;

    try {
      const list = await dataService.getLeaderboard();
      const currentStudent = dataService.getCurrentStudent();
      const currentNisn = String(currentStudent?.NISN || '').trim();

      if (!list || list.length === 0) {
        this.leaderboardTableBody.innerHTML = `<tr><td colspan="6" style="padding: 16px; color: #94a3b8;">No evaluation data recorded yet.</td></tr>`;
        return;
      }

      // Hitung statistik kelas
      const totalStudents = list.length;
      const sumPost = list.reduce((acc, cur) => acc + Number(cur.Total_Skor ?? cur.Nilai_Posttest ?? 0), 0);
      const avgScore = Math.round(sumPost / (totalStudents || 1));
      const topScore = Math.max(...list.map(cur => Number(cur.Total_Skor ?? cur.Nilai_Posttest ?? 0)));

      // Posisi siswa aktif
      let myRank = null;
      list.forEach((item, idx) => {
        if (currentNisn && String(item.NISN || item.nisn).trim() === currentNisn) {
          myRank = idx + 1;
        }
      });

      if (this.myRankText) {
        this.myRankText.textContent = myRank ? `Rank #${myRank} of ${totalStudents} Students` : `Not Ranked (Take Quiz)`;
      }
      if (this.leaderboardAvgPill) {
        this.leaderboardAvgPill.textContent = `Average: ${avgScore}`;
      }
      if (this.leaderboardTopPill) {
        this.leaderboardTopPill.textContent = `Highest: ${topScore}`;
      }

      // Render Baris Tabel
      this.leaderboardTableBody.innerHTML = '';
      list.forEach((item, idx) => {
        const rank = idx + 1;
        const isCurrent = currentNisn && String(item.NISN || item.nisn).trim() === currentNisn;
        const tr = document.createElement('tr');
        if (isCurrent) tr.classList.add('is-current-student');

        // Rank Badge
        let rankClass = 'rank-default';
        if (rank === 1) rankClass = 'rank-1';
        else if (rank === 2) rankClass = 'rank-2';
        else if (rank === 3) rankClass = 'rank-3';

        // Delta Peningkatan
        const pre = Number(item.Nilai_Pretest ?? item.nilaiPretest ?? 0);
        const post = Number(item.Nilai_Posttest ?? item.nilaiPosttest ?? item.Total_Skor ?? 0);
        const delta = post - pre;
        let deltaHtml = `<span class="gain-pill zero">0</span>`;
        if (delta > 0) {
          deltaHtml = `<span class="gain-pill pos">+${delta}</span>`;
        } else if (delta < 0) {
          deltaHtml = `<span class="gain-pill neg">${delta}</span>`;
        }

        // N-Gain
        const nGain = Number(item.Nilai_NGain ?? 0);
        let ngainClass = 'low';
        let ngainLabel = 'Low';
        if (nGain >= 0.70) {
          ngainClass = 'high';
          ngainLabel = 'High';
        } else if (nGain >= 0.30) {
          ngainClass = 'mid';
          ngainLabel = 'Medium';
        }

        const nameHtml = `${item.Nama || item.nama || 'Student'}${isCurrent ? '<span class="current-user-tag">You</span>' : ''}`;

        tr.innerHTML = `
          <td class="col-rank"><span class="rank-badge ${rankClass}">#${rank}</span></td>
          <td class="col-name">${nameHtml}</td>
          <td class="col-pre">${pre}</td>
          <td class="col-post"><strong>${post}</strong></td>
          <td class="col-gain">${deltaHtml}</td>
          <td class="col-ngain"><span class="ngain-pill ${ngainClass}">${nGain.toFixed(2)} (${ngainLabel})</span></td>
        `;

        this.leaderboardTableBody.appendChild(tr);
      });
    } catch (err) {
      console.warn('[Leaderboard] Failed to render data:', err);
      this.leaderboardTableBody.innerHTML = `<tr><td colspan="6" style="padding: 16px; color: #f87171;">An error occurred while loading leaderboard data.</td></tr>`;
    }
  }

  async openLeaderboard(tab = 'leaderboard') {
    sound.playPop();

    if (this.currentSlide !== 15) {
      this.goToSlide(15, false);
    }

    // Muat data siswa aktif & skor
    const student = dataService.getCurrentStudent();
    const pretestScore = dataService.getPretestScore();
    const posttestScore = dataService.getPosttestScore();

    if (this.posttestSummaryName) this.posttestSummaryName.textContent = student?.Nama || 'Student';
    if (this.posttestSummaryClass) this.posttestSummaryClass.textContent = student?.Kelas || '-';
    if (this.posttestSummaryNISN) this.posttestSummaryNISN.textContent = student?.NISN || '-';

    if (posttestScore !== null && posttestScore !== undefined) {
      if (this.posttestFinalScore) this.posttestFinalScore.textContent = `${posttestScore} / 100`;
      if (this.posttestCompPretest) this.posttestCompPretest.textContent = pretestScore !== null ? `${pretestScore}` : '0';
      if (this.posttestCompPosttest) this.posttestCompPosttest.textContent = `${posttestScore}`;
      const gain = posttestScore - (pretestScore || 0);
      if (this.posttestCompGain) this.posttestCompGain.textContent = gain >= 0 ? `+${gain}` : `${gain}`;

      // N-Gain
      const pre = Number(pretestScore || 0);
      const post = Number(posttestScore);
      let nGain = 0;
      if (100 - pre <= 0) {
        nGain = post >= 100 ? 1.0 : 0.0;
      } else {
        nGain = Math.round(((post - pre) / (100 - pre)) * 100) / 100;
      }
      const nGainPercent = Math.round(nGain * 100);
      let nGainCategory = 'Low';
      let nGainCatClass = 'low';
      let nGainDesc = `Material comprehension improvement is categorized as low (g = ${nGain.toFixed(2)}). It is recommended to review Narrative Text material on Slides 4–14.`;
      if (nGain >= 0.70) {
        nGainCategory = 'High';
        nGainCatClass = 'high';
        nGainDesc = `Outstanding! Material comprehension improvement is categorized as high (g = ${nGain.toFixed(2)}, effectiveness ${nGainPercent}%). Concepts were mastered thoroughly.`;
      } else if (nGain >= 0.30) {
        nGainCategory = 'Medium';
        nGainCatClass = 'mid';
        nGainDesc = `Good job! Material comprehension improvement is moderately effective (g = ${nGain.toFixed(2)}, effectiveness ${nGainPercent}%).`;
      }

      if (this.posttestCompNGain) this.posttestCompNGain.textContent = `${nGain.toFixed(2)}`;
      if (this.posttestCompNGainBadge) {
        this.posttestCompNGainBadge.textContent = `${nGainCategory} (${nGainPercent}%)`;
        this.posttestCompNGainBadge.className = `comp-sub ${nGainCatClass}`;
      }
      if (this.ngainCategoryPill) {
        this.ngainCategoryPill.textContent = nGainCategory;
        this.ngainCategoryPill.className = `ngain-category-pill ${nGainCatClass}`;
      }
      if (this.ngainDescText) this.ngainDescText.textContent = nGainDesc;
      if (this.ngainProgressFill) this.ngainProgressFill.style.width = `${Math.min(100, Math.max(0, nGainPercent))}%`;
    }

    if (this.posttestStartView) this.posttestStartView.style.display = 'none';
    if (this.posttestQuizView) this.posttestQuizView.style.display = 'none';
    if (this.quizResultScreen) this.quizResultScreen.style.display = 'flex';

    if (this.quizModal) {
      this.quizModal.style.display = 'flex';
      void this.quizModal.offsetWidth;
      this.quizModal.classList.add('active');
    }

    this.switchPosttestTab(tab);
    await this.renderLeaderboard();
  }

  closePosttest() {
    sound.playPop();
    if (this.posttestQuizView) this.posttestQuizView.style.display = 'none';
    if (this.quizResultScreen) this.quizResultScreen.style.display = 'none';
    if (this.posttestStartView) this.posttestStartView.style.display = 'flex';
    if (this.quizModal) {
      this.quizModal.style.display = 'flex';
    }
    this.updateSlide15UI();
  }

  // --- Slide 14: 3D Historical Relic & 6 Educational Points ---
  prefetchSitusModel() {
    if (this.situsModelPrefetched) return;
    this.situsModelPrefetched = true;
    const modelUrl = 'assets/situs_ks.glb';

    const executePrefetch = () => {
      // 1. Inisialisasi src pada model-viewer agar engine Three.js langsung memuat dan menyiapkan model di background
      const situsViewer = document.getElementById('situs-viewer');
      if (situsViewer && !situsViewer.getAttribute('src')) {
        situsViewer.setAttribute('src', situsViewer.dataset.src || modelUrl);
      }

      // 2. Tuntaskan unduhan ke Service Worker / Browser Cache dengan membaca blob
      if ('fetch' in window) {
        fetch(modelUrl, { priority: 'low' })
          .then((res) => {
            if (res.ok) return res.blob();
            return null;
          })
          .then(() => console.log('[Prefetch] assets/situs_ks.glb fully loaded into cache.'))
          .catch(() => {});
      } else {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = modelUrl;
        document.head.appendChild(link);
      }
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(executePrefetch, { timeout: 1500 });
    } else {
      setTimeout(executePrefetch, 400);
    }
  }

  initSlide14Situs3D() {
    const viewer = document.getElementById('situs-viewer');
    if (!viewer) return;

    const infoCard = document.getElementById('situs-info-card');
    const cardTitle = document.getElementById('situs-card-title');
    const cardBadge = document.getElementById('situs-card-badge');
    const cardSub = document.getElementById('situs-card-sub');
    const cardDesc = document.getElementById('situs-card-desc');
    const cardCounter = document.getElementById('situs-counter-pill');
    const btnCloseCard = document.getElementById('btn-close-situs-card');
    const btnAudio = document.getElementById('btn-situs-audio');
    const btnAutoRotate = document.getElementById('btn-situs-autorotate');
    const btnReset = document.getElementById('btn-situs-reset');
    const btnAR = document.getElementById('btn-situs-ar');
    const progressBar = document.getElementById('situs-progress-bar');
    const updateBar = document.getElementById('situs-update-bar');
    const loadingBox = document.getElementById('situs-loading-box');
    const stripPills = document.querySelectorAll('.situs-strip-pill');
    const hotspots = document.querySelectorAll('.situs-hotspot');

    const SITUS_POINTS_DATA = [
      {
        id: 1,
        title: "Meru Roof Apex",
        badge: "Point 1",
        sub: "Sacred Symbol",
        desc: "The three-tiered top structure symbolizing the sacred mountain, reflecting classical Hindu-Javanese cosmological architecture.",
        audioText: "Point 1: Meru Roof Apex. The three-tiered top structure symbolizing the sacred mountain.",
        orbit: "35deg 65deg 1.85m",
        target: "0.22m 0.28m -0.05m"
      },
      {
        id: 2,
        title: "Main Gateway Entrance",
        badge: "Point 2",
        sub: "Candi Bentar",
        desc: "The reconstructed central entrance of the main split gate (Candi Bentar), forming a ceremonial passageway between realms.",
        audioText: "Point 2: Main Gateway Entrance. The reconstructed central entrance of the main split gate, Candi Bentar.",
        orbit: "15deg 78deg 1.9m",
        target: "0.08m 0.02m 0.02m"
      },
      {
        id: 3,
        title: "Rubble Pile",
        badge: "Point 3",
        sub: "Historical Debris",
        desc: "Remnants of original red-brick material that have fallen and accumulated across centuries of environmental exposure.",
        audioText: "Point 3: Rubble Pile. Remnants of original material that have fallen and accumulated.",
        orbit: "25deg 82deg 1.65m",
        target: "0.12m -0.22m 0.14m"
      },
      {
        id: 4,
        title: "Structural Cracks & Damage",
        badge: "Point 4",
        sub: "Weathering Signs",
        desc: "Visible structural fractures and weathering signs resulting from tectonic tremors and natural aging over centuries.",
        audioText: "Point 4: Structural Cracks and Damage. Signs of wear, weathering, and damage accumulated over centuries.",
        orbit: "-40deg 76deg 1.75m",
        target: "-0.24m 0.05m 0.12m"
      },
      {
        id: 5,
        title: "Pillar Wall & Foundation",
        badge: "Point 5",
        sub: "Basal Relief",
        desc: "Side retaining walls and the supporting basal foundation adorned with classic relief carvings honoring ancient craftsmanship.",
        audioText: "Point 5: Pillar Wall and Foundation. Side walls and the supporting base of the structure.",
        orbit: "20deg 85deg 1.65m",
        target: "0.05m -0.29m 0.22m"
      },
      {
        id: 6,
        title: "Modern Conservation Context",
        badge: "Point 6",
        sub: "Heritage Preservation",
        desc: "Active documentation, archaeological survey, and modern protective sheltering safeguarding the relic for future generations.",
        audioText: "Point 6: Modern Conservation Context. Active documentation and archaeological heritage preservation practices.",
        orbit: "48deg 80deg 1.75m",
        target: "0.28m -0.26m 0.20m"
      }
    ];

    let currentPointId = null;

    // Loading progress event
    viewer.addEventListener('progress', (e) => {
      const progress = e.detail.totalProgress;
      if (updateBar) {
        updateBar.style.width = `${Math.round(progress * 100)}%`;
      }
      if (progress >= 1 && progressBar) {
        progressBar.classList.add('hide');
      }
    });

    viewer.addEventListener('load', () => {
      console.log('[ModelViewer] 3D Model loaded successfully.');
      if (typeof viewer.dismissPoster === 'function') {
        viewer.dismissPoster();
      }
      if (loadingBox) loadingBox.style.display = 'none';
      if (progressBar) progressBar.classList.add('hide');
    });

    viewer.addEventListener('error', (err) => {
      console.error('[ModelViewer Error]', err);
      const loaderText = document.getElementById('situs-loader-text');
      if (loaderText) {
        loaderText.textContent = 'Failed to load 3D model.';
      }
    });

    const selectPoint = (pointId) => {
      const point = SITUS_POINTS_DATA.find(p => p.id === Number(pointId));
      if (!point) return;

      currentPointId = point.id;
      sound.playPop();

      // Update hotspot active state
      hotspots.forEach(h => {
        h.classList.toggle('active', Number(h.dataset.point) === point.id);
      });

      // Update bottom strip active state
      stripPills.forEach(p => {
        p.classList.toggle('active', Number(p.dataset.point) === point.id);
      });

      // Camera transition
      if (viewer.cameraOrbit && point.orbit) {
        viewer.cameraOrbit = point.orbit;
      }
      if (viewer.cameraTarget && point.target) {
        viewer.cameraTarget = point.target;
      }

      // Populate info card
      if (cardTitle) cardTitle.textContent = point.title;
      if (cardBadge) cardBadge.textContent = point.badge;
      if (cardSub) cardSub.textContent = point.sub;
      if (cardDesc) cardDesc.textContent = point.desc;
      if (cardCounter) cardCounter.textContent = `${point.id} / ${SITUS_POINTS_DATA.length}`;

      if (infoCard) {
        infoCard.style.display = 'block';
      }
    };

    // Hotspot click events
    hotspots.forEach(h => {
      h.addEventListener('click', (e) => {
        e.stopPropagation();
        selectPoint(h.dataset.point);
      });
    });

    // Strip pill click events
    stripPills.forEach(p => {
      p.addEventListener('click', (e) => {
        e.stopPropagation();
        selectPoint(p.dataset.point);
      });
    });

    // Close info card
    if (btnCloseCard) {
      btnCloseCard.addEventListener('click', (e) => {
        e.stopPropagation();
        sound.playClick();
        if (infoCard) infoCard.style.display = 'none';
        hotspots.forEach(h => h.classList.remove('active'));
        stripPills.forEach(p => p.classList.remove('active'));
        currentPointId = null;
        if (viewer) {
          viewer.cameraOrbit = '38deg 74deg 2.2m';
          viewer.cameraTarget = 'auto auto auto';
        }
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      });
    }

    // Audio narration TTS button
    if (btnAudio) {
      btnAudio.addEventListener('click', (e) => {
        e.stopPropagation();
        sound.playClick();
        const point = SITUS_POINTS_DATA.find(p => p.id === currentPointId);
        if (!point) return;

        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(point.audioText || point.desc);
          utterance.lang = 'en-US';
          utterance.rate = 0.95;
          window.speechSynthesis.speak(utterance);
        }
      });
    }

    // Auto-rotate toggle
    if (btnAutoRotate) {
      btnAutoRotate.addEventListener('click', () => {
        sound.playClick();
        viewer.autoRotate = !viewer.autoRotate;
        const label = btnAutoRotate.querySelector('.tool-label');
        if (label) {
          label.textContent = viewer.autoRotate ? 'Pause' : 'Rotate';
        }
      });
    }

    // Reset camera button
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        sound.playClick();
        viewer.cameraOrbit = '38deg 74deg 2.2m';
        viewer.cameraTarget = 'auto auto auto';
        if (infoCard) infoCard.style.display = 'none';
        hotspots.forEach(h => h.classList.remove('active'));
        stripPills.forEach(p => p.classList.remove('active'));
        currentPointId = null;
      });
    }

    // AR Button
    if (btnAR) {
      btnAR.addEventListener('click', () => {
        sound.playSuccess();
        if (viewer.canActivateAR) {
          viewer.activateAR();
        } else {
          this.showToast('AR view requires WebXR/QuickLook on mobile.');
        }
      });
    }
  }

  // --- PWA Installation & Service Worker ---
  initPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('[PWA] Service Worker registered with scope:', reg.scope))
          .catch(err => console.warn('[PWA] Service Worker registration failed:', err));
      });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      if (this.btnInstallPWA) {
        this.btnInstallPWA.style.display = 'flex';
        this.btnInstallPWA.addEventListener('click', () => {
          sound.playPop();
          this.deferredPrompt.prompt();
          this.deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
              this.showToast('App installed.');
            }
            this.deferredPrompt = null;
            this.btnInstallPWA.style.display = 'none';
          });
        });
      }
    });

    window.addEventListener('appinstalled', () => {
      this.showToast('App installed.');
      if (this.btnInstallPWA) {
        this.btnInstallPWA.style.display = 'none';
      }
    });
  }
}

// Instantiate on DOM Loaded
document.addEventListener('DOMContentLoaded', () => {
  new InteractivePresentationApp();
});
