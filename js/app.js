import { sound } from './audio.js?v=17';
import { dataService } from './data-service.js?v=17';
import { FORMATIVE_GAME, GENERIC_STRUCTURES } from './quiz-data.js?v=17';

// Metadata untuk Daftar Isi Slide Navigator
const SLIDE_DIRECTORY = [
  { id: 1, title: 'Cover: Mbah Kanjeng Sepuh' },
  { id: 2, title: 'Intro: Mengenal Sejarah' },
  { id: 3, title: 'Menu Interaktif Utama' },
  { id: 4, title: "Let's Discuss! (Studi Kasus)" },
  { id: 5, title: 'Learning Goals (Tujuan)' },
  { id: 6, title: 'The Meaning of Legend' },
  { id: 7, title: 'The Generic Structure' },
  { id: 8, title: 'Orientation: Sidayu Gresik' },
  { id: 9, title: 'Complication: Irigasi & Krisis' },
  { id: 10, title: 'Formative Game: Verb Challenge' },
  { id: 11, title: 'IPA: Manfaat Gunung Berapi' },
  { id: 12, title: 'IPA: Dampak Erupsi & Mitigasi' },
  { id: 13, title: 'Kisah: Raden Suryodiningrat' },
  { id: 14, title: 'Edukasi: Erupsi & Vulkanik' },
  { id: 15, title: 'Kuis Evaluasi (Post-test)' },
  { id: 16, title: 'Penutup & Profil Pengembang' }
];

class InteractivePresentationApp {
  constructor() {
    this.currentSlide = 1;
    this.totalSlides = 16;
    this.deferredPrompt = null;

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
    this.renderDrawerList();
    this.bindEvents();
    this.goToSlide(1, false);
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
    this.inputNISN = document.getElementById('input-nisn');
    this.btnCheckNISN = document.getElementById('btn-check-nisn');
    this.feedbackNISN = document.getElementById('splash-nisn-feedback');
    this.studentCard = document.getElementById('splash-student-card');
    this.studentName = document.getElementById('student-name');
    this.studentNIS = document.getElementById('student-nis');
    this.studentNISN = document.getElementById('student-nisn');
    this.studentClass = document.getElementById('student-class');

    // Video Elements (Opsional jika masih ada)
    this.videoSlide1 = document.getElementById('video-slide-1');
    this.videoSlide2 = document.getElementById('video-slide-2');

    // Slide 3 Hotspot Quiz & Lock Indicator (Fase 4)
    this.hotspotMenuQuiz = document.getElementById('hotspot-menu-quiz');
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

    // Glosarium Modal
    this.glosariumModal = document.getElementById('glosarium-modal');
    this.btnOpenGlosarium = document.getElementById('btn-menu-glosarium');
    this.btnCloseGlosarium = document.getElementById('btn-close-glosarium');
    this.glosariumSearch = document.getElementById('glosarium-search');
    this.glosariumGrid = document.getElementById('glosarium-items-grid');

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
    this.btnFinishQuiz = document.getElementById('btn-finish-quiz-goto16');
    this.btnSlide15Leaderboard = document.getElementById('btn-slide15-leaderboard');
    this.btnSlide16Leaderboard = document.getElementById('btn-slide16-leaderboard');
    this.btnDrawerLeaderboard = document.getElementById('btn-drawer-leaderboard');

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
          const savedPretest = dataService.getPretestScore();
          if (savedPretest !== null && savedPretest !== undefined) {
            // Siswa sudah memiliki skor pretest, langsung arahkan ke materi slide 1
            this.goToSlide(1, false);
            if (this.videoSlide1) {
              this.videoSlide1.muted = sound.muted;
              this.playSlideVideo(this.videoSlide1);
            }
            const student = dataService.getCurrentStudent();
            if (student) {
              this.showToast(`Selamat datang kembali, ${student.Nama}!`);
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
        this.goToSlide(3);
      });
    }

    // Slide 7 Generic Structure Cards
    document.querySelectorAll('[data-structure]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const key = e.currentTarget.getAttribute('data-structure');
        const data = GENERIC_STRUCTURES[key];
        if (data) {
          sound.playPop();
          this.showInfoModal(data.title, data.badge, data.desc, data.example);
        }
      });
    });

    // Slide 11 Facts
    document.querySelectorAll('[data-fact]').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playSuccess();
        this.showToast('✅ Fakta dikonfirmasi: Sangat bermanfaat bagi lingkungan!');
      });
    });

    // Slide 13 Video Demo Audio
    const btnPlayVideo = document.getElementById('btn-play-video-demo');
    if (btnPlayVideo) {
      btnPlayVideo.addEventListener('click', () => {
        sound.playSuccess();
        this.showToast('▶ Memutar audio narasi Mbah Kanjeng Sepuh...');
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

    // Slide 14 Sketchfab / AR Model
    const btnSketchfab = document.getElementById('btn-sketchfab-toggle');
    if (btnSketchfab) {
      btnSketchfab.addEventListener('click', () => {
        sound.playClick();
        window.open('https://skfb.ly/6ZQ7z', '_blank');
      });
    }

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

    if (this.btnNextQuestion) {
      this.btnNextQuestion.addEventListener('click', () => {
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

    if (this.btnFinishQuiz) {
      this.btnFinishQuiz.addEventListener('click', () => {
        sound.playSuccess();
        this.closePosttest();
        this.goToSlide(16);
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

    // Slide 16 Restart App
    const btnRestart = document.getElementById('btn-restart-app');
    if (btnRestart) {
      btnRestart.addEventListener('click', (e) => {
        e.stopPropagation();
        this.goToSlide(1);
      });
    }

    // Info Modal Close
    this.btnCloseInfoModal.addEventListener('click', () => {
      sound.playClick();
      this.infoModal.style.display = 'none';
    });
    this.infoModal.addEventListener('click', (e) => {
      if (e.target === this.infoModal) {
        this.infoModal.style.display = 'none';
      }
    });

    // Glosarium Modal Listeners
    if (this.btnOpenGlosarium) {
      this.btnOpenGlosarium.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openGlosarium();
      });
    }

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
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        if (this.currentSlide < this.totalSlides && this.quizModal.style.display !== 'flex') {
          e.preventDefault();
          this.goToSlide(this.currentSlide + 1);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (this.currentSlide > 1 && this.quizModal.style.display !== 'flex') {
          e.preventDefault();
          this.goToSlide(this.currentSlide - 1);
        }
      } else if (e.key === 'Escape') {
        this.closeHUDMenu();
        this.closeDrawer();
        this.infoModal.style.display = 'none';
        this.quizModal.style.display = 'none';
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

      // Hanya picu swipe horizontal slide jika bukan scroll vertikal konten & bukan pada iframe interaktif
      if (Math.abs(effectiveDx) > 60 && Math.abs(effectiveDy) < 80 && !e.target.closest('.ar-screen-container') && !e.target.closest('#wordwall-embed-box')) {
        if (effectiveDx < 0 && this.currentSlide < this.totalSlides) {
          // Swipe Left -> Next
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
        video.play().catch(() => {});
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

    if (playSound) {
      sound.playWhoosh();
    }

    this.currentSlide = slideNumber;

    // Pelacak Progres (Fase 4): Rekam slide tertinggi yang telah dikunjungi siswa
    const prevMax = this.maxSlideVisited;
    if (slideNumber > this.maxSlideVisited) {
      this.maxSlideVisited = slideNumber;
      dataService.saveMaxSlideVisited(slideNumber);

      // Notifikasi pembukaan kunci saat pertama kali tiba di Slide 14
      if (slideNumber === 14 && prevMax < 14) {
        sound.playSuccess();
        this.showToast('🎉 Materi selesai dipelajari! Kuis Interaktif (Slide 15) kini telah terbuka.');
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
    drawerItems.forEach((item, idx) => {
      if (idx + 1 === slideNumber) {
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

    // Stop any HTML5 video or audio on inactive slides
    document.querySelectorAll('.slide-frame:not(.active) video, .slide-frame:not(.active) audio').forEach(media => {
      if (media !== this.videoSlide1 && media !== this.videoSlide2) {
        media.pause();
        media.currentTime = 0;
      }
    });

    // Cancel speech synthesis if narration is playing
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
  }

  updateLockUI() {
    const isUnlocked = dataService.isPosttestUnlocked();

    // Hotspot Kuis di Slide 3
    if (this.hotspotMenuQuiz) {
      if (isUnlocked) {
        this.hotspotMenuQuiz.classList.remove('is-locked');
        this.hotspotMenuQuiz.classList.add('is-unlocked');
        this.hotspotMenuQuiz.title = '6. Kuis Interaktif (Terbuka)';
      } else {
        this.hotspotMenuQuiz.classList.add('is-locked');
        this.hotspotMenuQuiz.classList.remove('is-unlocked');
        this.hotspotMenuQuiz.title = '6. Kuis Interaktif (Terkunci - Selesaikan Slide 1-14)';
      }
    }

    if (this.hotspotQuizLockBadge) {
      this.hotspotQuizLockBadge.style.display = isUnlocked ? 'none' : 'inline-flex';
    }

    // Refresh teks progres di drawer
    if (this.drawerProgressText) {
      const displayCompleted = Math.min(this.maxSlideVisited, 14);
      this.drawerProgressText.textContent = `Progres: ${displayCompleted} / 14 Slide`;
    }
  }

  renderDrawerList() {
    if (!this.drawerSlidesContainer) return;
    this.drawerSlidesContainer.innerHTML = '';

    const unlocked = dataService.isPosttestUnlocked();

    if (this.drawerProgressText) {
      const displayCompleted = Math.min(this.maxSlideVisited, 14);
      this.drawerProgressText.textContent = `Progres: ${displayCompleted} / 14 Slide`;
    }

    SLIDE_DIRECTORY.forEach((slide) => {
      const div = document.createElement('div');
      const isCurrent = slide.id === this.currentSlide;
      const isLocked = (slide.id === 15 || slide.id === 16) && !unlocked;

      let badgeHtml = '';
      if (slide.id === 15) {
        badgeHtml = isLocked
          ? '<span class="drawer-status-badge locked">🔒 Terkunci</span>'
          : '<span class="drawer-status-badge unlocked">🔓 Terbuka</span>';
      } else if (slide.id === 16) {
        badgeHtml = isLocked
          ? '<span class="drawer-status-badge locked">🔒 Terkunci</span>'
          : '<span class="drawer-status-badge unlocked">Selesai</span>';
      } else if (slide.id <= this.maxSlideVisited) {
        badgeHtml = '<span class="drawer-status-badge completed">✓ Dibaca</span>';
      }

      div.className = `drawer-slide-item ${isCurrent ? 'active' : ''} ${isLocked ? 'is-locked' : ''}`;
      div.innerHTML = `
        <img class="drawer-item-thumb" src="assets/slides/slide_${slide.id}.webp" alt="Slide ${slide.id}" loading="lazy" decoding="async">
        <div class="drawer-item-info">
          <div class="drawer-item-header">
            <div class="drawer-item-num">Slide ${slide.id}</div>
            ${badgeHtml}
          </div>
          <div class="drawer-item-name">${slide.title}</div>
        </div>
      `;

      div.addEventListener('click', () => {
        if (isLocked) {
          sound.playError();
          this.showToast('🔒 Selesaikan materi hingga Slide 14 untuk membuka Kuis Evaluasi.');
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
    this.drawer.classList.add('active');
  }

  closeDrawer() {
    this.drawer.classList.remove('active');
  }

  showInfoModal(title, badge, desc, example) {
    this.modalTitle.textContent = title;
    this.modalBadge.textContent = badge;
    this.modalDesc.textContent = desc;
    this.modalExample.textContent = example;
    this.infoModal.style.display = 'flex';
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

    // Reset tombol jika pengguna mengubah isi input
    this.inputNISN.addEventListener('input', () => {
      const val = this.inputNISN.value.trim();

      if (this.btnStartSplash && this.btnStartSplash.style.display !== 'none') {
        const currentSaved = dataService.getCurrentStudent();
        const matchesCurrent = currentSaved && (val === currentSaved.NISN || (currentSaved.NIS && val === currentSaved.NIS));
        if (!matchesCurrent) {
          this.btnStartSplash.style.display = 'none';
          if (this.btnRetakePretest) this.btnRetakePretest.style.display = 'none';
          if (this.studentCard) this.studentCard.style.display = 'none';
          this.showNISNFeedback('Nomor identitas diubah. Silakan klik "Periksa" kembali.', '');
        }
      }
    });
  }

  async handleCheckNISN() {
    const rawVal = this.inputNISN ? this.inputNISN.value.trim() : '';

    if (!rawVal) {
      sound.playError();
      this.showNISNFeedback('Harap masukkan nomor NIS atau NISN Anda terlebih dahulu.', 'error');
      return;
    }

    this.btnCheckNISN.disabled = true;
    this.btnCheckNISN.textContent = 'Memeriksa...';
    this.showNISNFeedback('Memeriksa ketersediaan data siswa...', '');

    try {
      const result = await dataService.validateNISN(rawVal);
      if (result.success && result.student) {
        sound.playSuccess();
        this.renderVerifiedStudent(result.student);
        const hasScore = dataService.getPretestScore() !== null;
        const msg = hasScore
          ? 'Data siswa terverifikasi. Anda dapat melanjutkan materi atau mengulang Pretest.'
          : 'Data siswa berhasil diverifikasi. Silakan klik "Mulai Pretest".';
        this.showNISNFeedback(msg, 'success');
      } else {
        sound.playError();
        this.showNISNFeedback(`NIS/NISN "${rawVal}" tidak terdaftar di basis data.`, 'error');
        if (this.studentCard) this.studentCard.style.display = 'none';
        if (this.btnStartSplash) this.btnStartSplash.style.display = 'none';
        if (this.btnRetakePretest) this.btnRetakePretest.style.display = 'none';
      }
    } catch (err) {
      sound.playError();
      this.showNISNFeedback('Gagal menghubungi sumber data. Coba beberapa saat lagi.', 'error');
      console.error('[App] Kesalahan validasi identitas siswa:', err);
    } finally {
      this.btnCheckNISN.disabled = false;
      this.btnCheckNISN.textContent = 'Periksa';
    }
  }

  renderVerifiedStudent(student) {
    if (this.studentName) this.studentName.textContent = student.Nama;
    if (this.studentNIS) this.studentNIS.textContent = student.NIS || '-';
    if (this.studentNISN) this.studentNISN.textContent = student.NISN || '-';
    if (this.studentClass) this.studentClass.textContent = student.Kelas || '-';
    if (this.studentCard) this.studentCard.style.display = 'block';

    const savedPretest = dataService.getPretestScore();
    if (savedPretest !== null && savedPretest !== undefined) {
      if (this.btnStartSplash) {
        this.btnStartSplash.textContent = `Lanjut Belajar (Pretest: ${savedPretest}) ➔`;
        this.btnStartSplash.style.display = 'inline-flex';
      }
      if (this.btnRetakePretest) {
        this.btnRetakePretest.style.display = 'inline-block';
      }
    } else {
      if (this.btnStartSplash) {
        this.btnStartSplash.textContent = 'Mulai Pretest ➔';
        this.btnStartSplash.style.display = 'inline-flex';
      }
      if (this.btnRetakePretest) {
        this.btnRetakePretest.style.display = 'none';
      }
    }

    // Sinkronisasi status penguncian dan drawer untuk siswa yang login
    this.maxSlideVisited = dataService.getMaxSlideVisited();
    this.updateLockUI();
    this.renderDrawerList();
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
        <span class="hud-btn-text">Kecilkan</span>
      `;
    } else {
      this.btnFullscreen.classList.remove('active');
      this.btnFullscreen.innerHTML = `
        <svg class="hud-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
        </svg>
        <span class="hud-btn-text">Layar Penuh</span>
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
      <span class="hud-btn-text">Putar ${labelAngle}</span>
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
    this.showToast(`Rotasi layar diubah ke ${this.portraitRotationAngle}°`);
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
        <div style="font-size:3rem; margin-bottom:12px;">🏆</div>
        <div style="font-family:'Fredoka', cursive; font-size:1.6rem; color:#38bdf8; margin-bottom:6px;">Game Selesai!</div>
        <p style="color:#cbd5e1; margin-bottom:18px;">Skor kamu: ${this.gameScore} / ${FORMATIVE_GAME.length}</p>
        <button class="game-start-btn" id="btn-replay-game"><span>🔄</span> Main Lagi</button>
      `;
      document.getElementById('btn-replay-game').addEventListener('click', () => {
        this.startFormativeGame();
      });
      return;
    }

    const current = FORMATIVE_GAME[this.gameRound];
    this.gameRoundIndicator.textContent = `Ronde ${this.gameRound + 1} / ${FORMATIVE_GAME.length}`;
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
      console.warn('[Pretest] Gagal memuat soal pretest:', err);
      this.pretestQuestions = [];
    }

    if (!this.pretestQuestions || this.pretestQuestions.length === 0) {
      this.showToast('Gagal memuat soal pretest. Mengarahkan ke materi...');
      this.closePretestAndStartLearning();
      return;
    }

    this.pretestIndex = 0;
    this.pretestAnswers = {};
    this.pretestScore = null;

    const student = dataService.getCurrentStudent();
    if (this.pretestStudentTag) {
      this.pretestStudentTag.textContent = student ? `${student.Nama} (${student.Kelas || 'Siswa'})` : 'Siswa';
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
      this.pretestCounter.textContent = `Soal ${this.pretestIndex + 1} dari ${total}`;
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
        this.pretestHint.textContent = `Jawaban Anda: Opsi ${currentAnswer}`;
      } else {
        this.pretestHint.textContent = 'Pilih salah satu jawaban untuk melanjutkan.';
      }
    }

    if (this.btnPretestNext) {
      this.btnPretestNext.disabled = !currentAnswer;
      if (this.pretestIndex === total - 1) {
        this.btnPretestNext.textContent = 'Kirim Jawaban ➔';
      } else {
        this.btnPretestNext.textContent = 'Soal Selanjutnya ➔';
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
      this.pretestHint.textContent = `Jawaban Anda: Opsi ${letter}`;
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
    this.pretestScore = finalScore;
    dataService.savePretestScore(finalScore);

    sound.playSuccess();

    if (this.pretestQuizView) this.pretestQuizView.style.display = 'none';
    if (this.pretestResultView) this.pretestResultView.style.display = 'flex';

    if (this.pretestFinalScore) {
      this.pretestFinalScore.textContent = `${finalScore} / 100`;
    }

    if (this.pretestScoreDetail) {
      this.pretestScoreDetail.textContent = `Jawaban benar: ${correctCount} dari ${total} soal`;
    }

    this.showToast(`Pretest selesai! Skor Anda: ${finalScore}`);
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

    // Arahkan ke Slide 1 dan aktifkan media
    this.goToSlide(1, false);
    if (this.videoSlide1) {
      this.videoSlide1.muted = sound.muted;
      this.playSlideVideo(this.videoSlide1);
    }

    const student = dataService.getCurrentStudent();
    if (student) {
      this.showToast(`Selamat belajar, ${student.Nama}!`);
    }
  }

  // =========================================================================
  // FASE 5: MODUL & ENGINE POST-TEST DINAMIS (15 SOAL: MCQ & MATCHING)
  // =========================================================================

  async startPosttest() {
    try {
      this.posttestQuestions = await dataService.getPosttestQuestions();
    } catch (err) {
      console.warn('[Posttest] Gagal memuat soal evaluasi:', err);
      this.posttestQuestions = [];
    }

    if (!this.posttestQuestions || this.posttestQuestions.length === 0) {
      this.showToast('Gagal memuat bank soal evaluasi. Coba beberapa saat lagi.');
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
      this.posttestStudentTag.textContent = student ? `${student.Nama} (${student.Kelas || 'Siswa'})` : 'Siswa';
    }

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
      this.posttestCounter.textContent = `Soal ${this.posttestIndex + 1} dari ${total}`;
    }

    if (this.posttestProgressFill) {
      const pct = Math.round(((this.posttestIndex + 1) / total) * 100);
      this.posttestProgressFill.style.width = `${pct}%`;
    }

    const isMatching = (q.Tipe || '').toLowerCase() === 'matching';
    if (this.posttestTypeBadge) {
      this.posttestTypeBadge.textContent = isMatching ? 'Mencocokkan Pasangan' : 'Pilihan Ganda';
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
        this.btnNextQuestion.textContent = 'Lihat Hasil Evaluasi ➔';
      } else {
        this.btnNextQuestion.textContent = 'Soal Selanjutnya ➔';
      }
    }

    if (isMatching) {
      // Tampilkan kontainer Matching
      if (this.posttestMcqContainer) this.posttestMcqContainer.style.display = 'none';
      if (this.posttestMatchingContainer) this.posttestMatchingContainer.style.display = 'flex';
      if (this.posttestHint) {
        this.posttestHint.textContent = 'Hubungkan 4 pasangan kartu, lalu klik "Periksa Pasangan".';
      }
      this.setupMatchingQuestion(q);
    } else {
      // Tampilkan kontainer MCQ
      if (this.posttestMatchingContainer) this.posttestMatchingContainer.style.display = 'none';
      if (this.posttestMcqContainer) this.posttestMcqContainer.style.display = 'flex';
      if (this.posttestHint) {
        this.posttestHint.textContent = 'Pilih salah satu jawaban yang benar untuk melanjutkan.';
      }
      this.setupMCQQuestion(q);
    }
  }

  // --- Penangan Soal Pilihan Ganda (MCQ) ---
  setupMCQQuestion(q) {
    if (!this.posttestOptionsList) return;
    this.posttestOptionsList.innerHTML = '';

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
  }

  handlePosttestMCQSelection(clickedBtn, letter, q) {
    if (this.posttestAnswered) return;
    this.posttestAnswered = true;

    const allButtons = this.posttestOptionsList.querySelectorAll('.posttest-opt-btn');
    allButtons.forEach(b => b.disabled = true);

    const correctKey = String(q.Kunci || '').trim().toUpperCase();
    const isCorrect = letter.toUpperCase() === correctKey;

    if (isCorrect) {
      sound.playSuccess();
      clickedBtn.classList.add('selected-correct');
      this.posttestAnswers[this.posttestIndex] = {
        type: 'mcq',
        selected: letter,
        isCorrect: true,
        earnedPoints: 1.0
      };
      if (this.posttestHint) {
        this.posttestHint.textContent = 'Jawaban tepat!';
      }
    } else {
      sound.playError();
      clickedBtn.classList.add('selected-wrong');
      allButtons.forEach(b => {
        const l = b.querySelector('.posttest-opt-letter')?.textContent?.trim()?.toUpperCase();
        if (l === correctKey) {
          b.classList.add('selected-correct');
        }
      });
      this.posttestAnswers[this.posttestIndex] = {
        type: 'mcq',
        selected: letter,
        isCorrect: false,
        earnedPoints: 0.0
      };
      if (this.posttestHint) {
        this.posttestHint.textContent = `Jawaban kurang tepat. Jawaban benar: Opsi ${correctKey}.`;
      }
    }

    // Tampilkan pembahasan edukatif
    if (this.posttestExplanationBox && q.Pembahasan) {
      this.posttestExplanationBox.innerHTML = `<strong>Pembahasan:</strong> ${q.Pembahasan}`;
      this.posttestExplanationBox.style.display = 'block';
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
      this.posttestMatchingHint.textContent = 'Ketuk satu kartu di kolom kiri, lalu ketuk pasangannya di kolom kanan.';
    }

    this.renderMatchingCards();
  }

  renderMatchingCards() {
    if (!this.currentMatchingData) return;
    const { leftItems, shuffledRight } = this.currentMatchingData;

    // Tentukan nomor pasangan untuk visualisasi (1-4)
    const pairColors = ['paired-1', 'paired-2', 'paired-3', 'paired-4'];
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
          const isCorrect = this.posttestTempPairs[item.id] === item.id;
          card.classList.add(isCorrect ? 'match-correct' : 'match-wrong');
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
          if (this.posttestAnswered) {
            const isCorrect = this.posttestTempPairs[item.id] === item.id;
            statusTag.textContent = isCorrect ? '✓ Benar' : '✕ Salah';
          } else {
            statusTag.textContent = `Pasangan ${pairInfo.num}`;
          }
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
          if (pairedLeftId !== null) {
            const isCorrect = pairedLeftId === item.originalId;
            card.classList.add(isCorrect ? 'match-correct' : 'match-wrong');
          }
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
          if (this.posttestAnswered) {
            const isCorrect = pairedLeftId === item.originalId;
            statusTag.textContent = isCorrect ? '✓ Benar' : '✕ Salah';
          } else {
            statusTag.textContent = `Pasangan ${pairInfo.num}`;
          }
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
      this.matchingStatusText.textContent = `Terpasang: ${count} / ${totalPairs} Pasangan`;
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
        this.posttestMatchingHint.textContent = 'Pasangan dibatalkan. Pilih kartu kiri untuk memasangkan kembali.';
      }
    } else {
      if (this.posttestActiveLeftId === leftId) {
        this.posttestActiveLeftId = null;
        sound.playPop();
      } else {
        this.posttestActiveLeftId = leftId;
        sound.playPop();
        if (this.posttestMatchingHint) {
          this.posttestMatchingHint.textContent = 'Kartu kiri dipilih. Sekarang ketuk pasangannya di kolom kanan.';
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
          this.posttestMatchingHint.textContent = 'Pasangan dibatalkan. Ketuk kartu di kolom kiri terlebih dahulu.';
        }
        this.renderMatchingCards();
      } else {
        sound.playPop();
        if (this.posttestMatchingHint) {
          this.posttestMatchingHint.textContent = 'Pilih satu kartu di kolom kiri terlebih dahulu sebelum memilih pasangan kanan.';
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
        this.posttestMatchingHint.textContent = 'Seluruh pasangan telah terhubung. Klik "Periksa Pasangan" untuk verifikasi.';
      } else {
        this.posttestMatchingHint.textContent = `Pasangan terhubung! Lanjutkan (${count} dari ${total}).`;
      }
    }

    this.renderMatchingCards();
  }

  resetMatchingPairs() {
    if (this.posttestAnswered) return;
    this.posttestTempPairs = {};
    this.posttestActiveLeftId = null;
    if (this.posttestMatchingHint) {
      this.posttestMatchingHint.textContent = 'Seluruh pasangan direset. Ketuk kartu kiri lalu pasangkan dengan kartu kanan.';
    }
    this.renderMatchingCards();
  }

  verifyMatchingAnswer() {
    if (this.posttestAnswered || !this.currentMatchingData) return;
    this.posttestAnswered = true;

    const { leftItems, q } = this.currentMatchingData;
    let correctCount = 0;

    leftItems.forEach(item => {
      if (this.posttestTempPairs[item.id] === item.id) {
        correctCount++;
      }
    });

    const totalPairs = leftItems.length || 4;
    const earnedPoints = correctCount / totalPairs;

    this.posttestAnswers[this.posttestIndex] = {
      type: 'matching',
      correctCount,
      totalPairs,
      earnedPoints
    };

    if (correctCount === totalPairs) {
      sound.playSuccess();
      if (this.posttestHint) {
        this.posttestHint.textContent = `Sempurna! Semua (${correctCount}/${totalPairs}) pasangan tepat.`;
      }
    } else {
      sound.playError();
      if (this.posttestHint) {
        this.posttestHint.textContent = `${correctCount} dari ${totalPairs} pasangan tepat. Periksa pembahasan di bawah.`;
      }
    }

    // Render kartu dengan status verifikasi
    this.renderMatchingCards();

    // Buat daftar kunci pasangan yang tepat
    const rightOriginalOrder = (q.Pasangan_Kanan || '').split('|').map(s => s.trim());
    const pairsSummary = leftItems
      .map((item, idx) => `• <strong>${item.text}</strong> ➔ ${rightOriginalOrder[idx] || '-'}`)
      .join('<br>');

    if (this.posttestExplanationBox) {
      this.posttestExplanationBox.innerHTML = `<strong>Kunci Pasangan Tepat:</strong><br>${pairsSummary}<br><br><strong>Pembahasan:</strong> ${q.Pembahasan || ''}`;
      this.posttestExplanationBox.style.display = 'block';
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

    const total = this.posttestQuestions.length || 15;

    this.posttestQuestions.forEach((q, idx) => {
      const ans = this.posttestAnswers[idx];
      if (ans) {
        totalEarned += (ans.earnedPoints || 0);
        if (ans.type === 'mcq' && ans.isCorrect) mcqCorrect++;
        if (ans.type === 'matching') {
          matchingPairsCorrect += (ans.correctCount || 0);
          matchingPairsTotal += (ans.totalPairs || 4);
          if (ans.correctCount === ans.totalPairs) matchingFullCorrect++;
        }
      }
    });

    const finalScore = Math.min(100, Math.round((totalEarned / total) * 100));
    this.posttestScore = finalScore;
    dataService.savePosttestScore(finalScore);

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
        nama: student?.Nama || 'Siswa',
        nilaiPretest: pretestScore,
        nilaiPosttest: finalScore,
        totalSkor: finalScore
      });
    } catch (e) {
      console.warn('[Posttest] Gagal memperbarui leaderboard:', e);
    }

    sound.playFanfare();

    // Kalkulasi N-Gain Score (Hake, 1998)
    const delta = finalScore - pretestScore;
    let nGain = 0;
    if (100 - pretestScore <= 0) {
      nGain = finalScore >= 100 ? 1.0 : 0.0;
    } else {
      nGain = Math.round(((finalScore - pretestScore) / (100 - pretestScore)) * 100) / 100;
    }
    const nGainPercent = Math.round(nGain * 100);

    let nGainCategory = 'Rendah';
    let nGainCatClass = 'low';
    let nGainDesc = `Peningkatan pemahaman materi tergolong rendah (g = ${nGain.toFixed(2)}). Disarankan mempelajari kembali materi pada Slide 4–14.`;

    if (nGain >= 0.70) {
      nGainCategory = 'Tinggi';
      nGainCatClass = 'high';
      nGainDesc = `Luar biasa! Peningkatan pemahaman materi tergolong tinggi (g = ${nGain.toFixed(2)}, efektivitas ${nGainPercent}%). Konsep terserap maksimal.`;
    } else if (nGain >= 0.30) {
      nGainCategory = 'Sedang';
      nGainCatClass = 'mid';
      nGainDesc = `Bagus! Terjadi peningkatan pemahaman yang cukup efektif (g = ${nGain.toFixed(2)}, efektivitas ${nGainPercent}%). Konsep utama dipahami dengan baik.`;
    }

    // Tampilkan Layar Hasil
    if (this.posttestQuizView) this.posttestQuizView.style.display = 'none';
    if (this.quizResultScreen) this.quizResultScreen.style.display = 'flex';

    if (this.posttestSummaryName) this.posttestSummaryName.textContent = student?.Nama || 'Siswa';
    if (this.posttestSummaryClass) this.posttestSummaryClass.textContent = student?.Kelas || '-';
    if (this.posttestSummaryNISN) this.posttestSummaryNISN.textContent = student?.NISN || '-';

    if (this.posttestFinalScore) {
      this.posttestFinalScore.textContent = `${finalScore} / 100`;
    }

    if (this.posttestScoreBreakdown) {
      this.posttestScoreBreakdown.textContent = `Pilihan Ganda: ${mcqCorrect} / 10 • Mencocokkan: ${matchingFullCorrect} / 5 Sempurna (${matchingPairsCorrect}/${matchingPairsTotal} Pasangan)`;
    }

    if (this.posttestCompPretest) {
      this.posttestCompPretest.textContent = pretestScore !== null ? `${pretestScore}` : '0';
    }

    if (this.posttestCompPosttest) {
      this.posttestCompPosttest.textContent = `${finalScore}`;
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

    this.showToast(`Post-test selesai! Skor akhir: ${finalScore} (N-Gain: ${nGain.toFixed(2)})`);
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
    this.leaderboardTableBody.innerHTML = `<tr><td colspan="6" style="padding: 16px; color: #94a3b8;">Memuat data papan peringkat...</td></tr>`;

    try {
      const list = await dataService.getLeaderboard();
      const currentStudent = dataService.getCurrentStudent();
      const currentNisn = String(currentStudent?.NISN || '').trim();

      if (!list || list.length === 0) {
        this.leaderboardTableBody.innerHTML = `<tr><td colspan="6" style="padding: 16px; color: #94a3b8;">Belum ada data evaluasi tercatat.</td></tr>`;
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
        this.myRankText.textContent = myRank ? `Peringkat #${myRank} dari ${totalStudents} Siswa` : `Belum Terdaftar (Ikuti Kuis)`;
      }
      if (this.leaderboardAvgPill) {
        this.leaderboardAvgPill.textContent = `Rata-rata: ${avgScore}`;
      }
      if (this.leaderboardTopPill) {
        this.leaderboardTopPill.textContent = `Tertinggi: ${topScore}`;
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
        let ngainLabel = 'Rendah';
        if (nGain >= 0.70) {
          ngainClass = 'high';
          ngainLabel = 'Tinggi';
        } else if (nGain >= 0.30) {
          ngainClass = 'mid';
          ngainLabel = 'Sedang';
        }

        const nameHtml = `${item.Nama || item.nama || 'Siswa'}${isCurrent ? '<span class="current-user-tag">Anda</span>' : ''}`;

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
      console.warn('[Leaderboard] Gagal merender data:', err);
      this.leaderboardTableBody.innerHTML = `<tr><td colspan="6" style="padding: 16px; color: #f87171;">Terjadi kesalahan saat memuat data peringkat.</td></tr>`;
    }
  }

  async openLeaderboard(tab = 'leaderboard') {
    sound.playPop();

    // Muat data siswa aktif & skor
    const student = dataService.getCurrentStudent();
    const pretestScore = dataService.getPretestScore();
    const posttestScore = dataService.getPosttestScore();

    if (this.posttestSummaryName) this.posttestSummaryName.textContent = student?.Nama || 'Siswa';
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
      let nGainCategory = 'Rendah';
      let nGainCatClass = 'low';
      let nGainDesc = `Peningkatan pemahaman materi tergolong rendah (g = ${nGain.toFixed(2)}). Disarankan mempelajari kembali materi vulkanisme.`;
      if (nGain >= 0.70) {
        nGainCategory = 'Tinggi';
        nGainCatClass = 'high';
        nGainDesc = `Luar biasa! Peningkatan pemahaman materi tergolong tinggi (g = ${nGain.toFixed(2)}, efektivitas ${nGainPercent}%). Konsep terserap maksimal.`;
      } else if (nGain >= 0.30) {
        nGainCategory = 'Sedang';
        nGainCatClass = 'mid';
        nGainDesc = `Bagus! Terjadi peningkatan pemahaman yang cukup efektif (g = ${nGain.toFixed(2)}, efektivitas ${nGainPercent}%).`;
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
    if (this.quizModal) {
      this.quizModal.style.display = 'none';
      this.quizModal.classList.remove('active');
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
              this.showToast('Aplikasi berhasil dipasang!');
            }
            this.deferredPrompt = null;
            this.btnInstallPWA.style.display = 'none';
          });
        });
      }
    });

    window.addEventListener('appinstalled', () => {
      this.showToast('Aplikasi Materi Interaktif telah terpasang!');
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
