import { sound } from './audio.js';
import { QUIZ_VOLCANO, FORMATIVE_GAME, GENERIC_STRUCTURES } from './quiz-data.js';

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
  { id: 13, title: 'Video: Raden Suryodiningrat' },
  { id: 14, title: 'Augmented Reality & 3D Volcano' },
  { id: 15, title: 'Kuis Evaluasi: 10 Soal Berapi' },
  { id: 16, title: 'Penutup & Profil Pengembang' }
];

class InteractivePresentationApp {
  constructor() {
    this.currentSlide = 1;
    this.totalSlides = 16;
    this.deferredPrompt = null;

    // Quiz State
    this.quizIndex = 0;
    this.quizScore = 0;
    this.quizAnswered = false;

    // Formative Mini Game State
    this.gameRound = 0;
    this.gameScore = 0;

    // Mobile Portrait Auto-Rotate State
    this.portraitRotationAngle = 90;
    this.isPortraitMode = false;

    this.init();
  }

  init() {
    this.cacheDOM();
    this.initOrientationHandler();
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

    // Splash Screen
    this.splashOverlay = document.getElementById('splash-screen');
    this.btnStartSplash = document.getElementById('btn-start-splash');

    // Video Elements (Slide 1 & Slide 2)
    this.videoSlide1 = document.getElementById('video-slide-1');
    this.videoSlide2 = document.getElementById('video-slide-2');

    // Drawer
    this.drawer = document.getElementById('slide-drawer');
    this.drawerSlidesContainer = document.getElementById('drawer-slides-container');
    this.btnCloseDrawer = document.getElementById('btn-close-drawer');

    // Info Modal
    this.infoModal = document.getElementById('info-modal');
    this.modalTitle = document.getElementById('modal-title');
    this.modalBadge = document.getElementById('modal-badge');
    this.modalDesc = document.getElementById('modal-desc');
    this.modalExample = document.getElementById('modal-example');
    this.btnCloseInfoModal = document.getElementById('btn-close-info-modal');

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

    // Quiz Elements
    this.quizModal = document.getElementById('quiz-modal-box');
    this.btnLaunchQuiz = document.getElementById('btn-launch-quiz-modal');
    this.btnCloseQuiz = document.getElementById('btn-close-quiz');
    this.quizBody = document.getElementById('quiz-body-container');
    this.quizFooter = document.getElementById('quiz-footer');
    this.quizResultScreen = document.getElementById('quiz-result-screen');
    this.quizQuestionNumber = document.getElementById('quiz-question-number');
    this.quizLiveScore = document.getElementById('quiz-live-score');
    this.quizQuestionText = document.getElementById('quiz-question-text');
    this.quizOptionsList = document.getElementById('quiz-options-list');
    this.quizExplanationBox = document.getElementById('quiz-explanation-box');
    this.btnNextQuestion = document.getElementById('btn-next-question');
    this.quizFinalScore = document.getElementById('quiz-final-score');
    this.btnRetryQuiz = document.getElementById('btn-retry-quiz');
    this.btnFinishQuiz = document.getElementById('btn-finish-quiz-goto16');
  }

  bindEvents() {
    // Splash Screen Start & Unlock Audio
    if (this.btnStartSplash && this.splashOverlay) {
      this.btnStartSplash.addEventListener('click', () => {
        sound.init();
        sound.playSuccess();
        this.requestLandscapeLock();
        this.splashOverlay.classList.add('fade-out');
        if (this.videoSlide1) {
          this.videoSlide1.muted = sound.muted;
          this.playSlideVideo(this.videoSlide1);
        }
        setTimeout(() => {
          this.splashOverlay.style.display = 'none';
        }, 400);
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

    // Slide 15 Quiz Launch & Controls
    if (this.btnLaunchQuiz) {
      this.btnLaunchQuiz.addEventListener('click', () => {
        sound.playPop();
        this.startQuiz();
      });
    }

    this.btnCloseQuiz.addEventListener('click', () => {
      sound.playClick();
      this.quizModal.style.display = 'none';
    });

    this.btnNextQuestion.addEventListener('click', () => {
      sound.playClick();
      this.nextQuizQuestion();
    });

    this.btnRetryQuiz.addEventListener('click', () => {
      sound.playPop();
      this.startQuiz();
    });

    this.btnFinishQuiz.addEventListener('click', () => {
      sound.playSuccess();
      this.quizModal.style.display = 'none';
      this.goToSlide(16);
    });

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

    // Handle background videos (Slide 1 & Slide 2)
    if (slideNumber === 1) {
      this.stopSlideVideo(this.videoSlide2);
      if (!this.splashOverlay || this.splashOverlay.classList.contains('fade-out')) {
        this.playSlideVideo(this.videoSlide1);
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

    // Manage Slide 14 Sketchfab video/3D interactive lifecycle
    const sketchfabFrame = document.getElementById('sketchfab-frame');
    if (sketchfabFrame) {
      const targetSketchfabSrc = sketchfabFrame.dataset.src || 'https://sketchfab.com/models/aafcbe2ce9744bde81ab74bdfcf249b5/embed?autostart=1';
      if (!sketchfabFrame.dataset.src) {
        sketchfabFrame.dataset.src = targetSketchfabSrc;
      }
      if (slideNumber === 14) {
        if (!sketchfabFrame.src || sketchfabFrame.src.includes('about:blank')) {
          sketchfabFrame.src = targetSketchfabSrc;
        }
      } else {
        if (sketchfabFrame.src && !sketchfabFrame.src.includes('about:blank')) {
          sketchfabFrame.src = 'about:blank';
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

  renderDrawerList() {
    this.drawerSlidesContainer.innerHTML = '';
    SLIDE_DIRECTORY.forEach((slide) => {
      const div = document.createElement('div');
      div.className = `drawer-slide-item ${slide.id === this.currentSlide ? 'active' : ''}`;
      div.innerHTML = `
        <img class="drawer-item-thumb" src="assets/slides/slide_${slide.id}.webp" alt="Slide ${slide.id}" loading="lazy" decoding="async">
        <div class="drawer-item-info">
          <div class="drawer-item-num">Slide ${slide.id}</div>
          <div class="drawer-item-name">${slide.title}</div>
        </div>
      `;
      div.addEventListener('click', () => {
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

  showToast(message) {
    this.toast.textContent = message;
    this.toast.classList.add('show');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toast.classList.remove('show');
    }, 2500);
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

  // --- Slide 15: Quiz Time Implementation ---
  startQuiz() {
    this.quizIndex = 0;
    this.quizScore = 0;
    this.quizModal.style.display = 'flex';
    this.quizBody.style.display = 'flex';
    this.quizFooter.style.display = 'flex';
    this.quizResultScreen.style.display = 'none';
    this.renderQuizQuestion();
  }

  renderQuizQuestion() {
    this.quizAnswered = false;
    this.btnNextQuestion.style.visibility = 'hidden';
    this.quizExplanationBox.style.display = 'none';

    const q = QUIZ_VOLCANO[this.quizIndex];
    this.quizQuestionNumber.textContent = `Soal ${this.quizIndex + 1} / ${QUIZ_VOLCANO.length}`;
    this.quizLiveScore.textContent = `${this.quizScore * 10} Poin`;
    this.quizQuestionText.textContent = q.question;

    this.quizOptionsList.innerHTML = '';
    q.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-opt-btn';
      btn.innerHTML = `<span style="font-weight:700; color:#ea580c;">${String.fromCharCode(65 + idx)}.</span> ${opt}`;
      btn.addEventListener('click', () => this.handleQuizSelection(btn, idx, q));
      this.quizOptionsList.appendChild(btn);
    });
  }

  handleQuizSelection(clickedBtn, selectedIdx, questionData) {
    if (this.quizAnswered) return;
    this.quizAnswered = true;

    const allButtons = this.quizOptionsList.querySelectorAll('.quiz-opt-btn');
    allButtons.forEach(b => b.disabled = true);

    if (selectedIdx === questionData.answer) {
      sound.playSuccess();
      clickedBtn.classList.add('selected-correct');
      this.quizScore++;
      this.quizLiveScore.textContent = `${this.quizScore * 10} Poin`;
    } else {
      sound.playError();
      clickedBtn.classList.add('selected-wrong');
      allButtons[questionData.answer].classList.add('selected-correct');
    }

    // Show Explanation
    this.quizExplanationBox.textContent = `💡 Penjelasan: ${questionData.explanation}`;
    this.quizExplanationBox.style.display = 'block';

    // Show Next Button
    this.btnNextQuestion.style.visibility = 'visible';
    if (this.quizIndex === QUIZ_VOLCANO.length - 1) {
      this.btnNextQuestion.textContent = 'Lihat Hasil Akhir 🏆';
    } else {
      this.btnNextQuestion.textContent = 'Soal Selanjutnya ➔';
    }
  }

  nextQuizQuestion() {
    if (this.quizIndex < QUIZ_VOLCANO.length - 1) {
      this.quizIndex++;
      this.renderQuizQuestion();
    } else {
      this.showQuizResults();
    }
  }

  showQuizResults() {
    sound.playFanfare();
    this.quizBody.style.display = 'none';
    this.quizFooter.style.display = 'none';
    this.quizResultScreen.style.display = 'flex';

    const finalPoints = this.quizScore * 10;
    this.quizFinalScore.textContent = `${finalPoints} / 100`;
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
