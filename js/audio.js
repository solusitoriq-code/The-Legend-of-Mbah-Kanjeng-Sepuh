// Sound Engine menggunakan Web Audio API (Zero External MP3 Dependency, 100% Offline)
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.bgmPlaying = false;
    this.bgmMode = 'none'; // 'none' | 'splash' | 'pretest'
    this.lastBgmMode = 'splash';
    this.bgmInterval = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      return this.ctx.resume().catch(() => {});
    }
    return Promise.resolve();
  }

  playClick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playPop() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(350, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(700, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  playSuccess() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const startTime = this.ctx.currentTime + idx * 0.08;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });
  }

  playError() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [220, 196]; // A3 to G3
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const startTime = this.ctx.currentTime + idx * 0.12;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.2);
    });
  }

  playWhoosh() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.12);
    osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.22);

    gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.22);
  }

  playFanfare() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const melody = [
      { f: 523.25, d: 0.15 },
      { f: 659.25, d: 0.15 },
      { f: 783.99, d: 0.15 },
      { f: 1046.50, d: 0.4 },
      { f: 880.00, d: 0.2 },
      { f: 1046.50, d: 0.6 }
    ];

    let t = this.ctx.currentTime;
    melody.forEach((note) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, t);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + note.d);

      t += note.d + 0.04;
    });
  }

  /**
   * Menghasilkan ketukan kendang sintetis (punchy bass kick)
   * @param {number} now Waktu mulai (AudioContext currentTime)
   */
  playKendangKick(now) {
    if (this.muted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(170, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  /**
   * Menghasilkan ketukan perkusi kayu / woodblock sintetis (snappy backbeat)
   * @param {number} now Waktu mulai (AudioContext currentTime)
   */
  playWoodblock(now) {
    if (this.muted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(820, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.035);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  /**
   * Menghasilkan nada gamelan perunggu / bonang arcade yang jernih dan bersemangat
   * @param {number} freq Frekuensi nada dasar (Hz)
   * @param {number} duration Durasi nada (detik)
   * @param {number} gainLevel Volume nada (0.0 - 1.0)
   * @param {boolean} isGong Flag apakah nada merupakan gong / bass rendah
   */
  playGamelanTone(freq, duration = 0.35, gainLevel = 0.14, isGong = false) {
    if (this.muted || !this.ctx) return;

    const now = this.ctx.currentTime;

    const noteGain = this.ctx.createGain();
    noteGain.gain.setValueAtTime(0.001, now);
    noteGain.gain.linearRampToValueAtTime(gainLevel, now + 0.008);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    // Osilator nada dasar
    const oscMain = this.ctx.createOscillator();
    oscMain.type = 'sine';
    oscMain.frequency.setValueAtTime(freq, now);

    // Osilator resonansi detune (karakteristik "ombak" gamelan perunggu)
    const oscDetune = this.ctx.createOscillator();
    oscDetune.type = isGong ? 'triangle' : 'sine';
    const detuneOffset = isGong ? 1.0 : 1.6;
    oscDetune.frequency.setValueAtTime(freq + detuneOffset, now);

    // Overtone strike khas pukulan tabuh logam
    const oscOvertone = this.ctx.createOscillator();
    const overtoneGain = this.ctx.createGain();
    oscOvertone.type = 'triangle';
    oscOvertone.frequency.setValueAtTime(freq * 2.76, now);
    overtoneGain.gain.setValueAtTime(gainLevel * (isGong ? 0.2 : 0.35), now);
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + (isGong ? 0.6 : 0.08));

    oscMain.connect(noteGain);
    oscDetune.connect(noteGain);
    oscOvertone.connect(overtoneGain);
    overtoneGain.connect(this.ctx.destination);
    noteGain.connect(this.ctx.destination);

    oscMain.start(now);
    oscDetune.start(now);
    oscOvertone.start(now);

    oscMain.stop(now + duration);
    oscDetune.stop(now + duration);
    oscOvertone.stop(now + (isGong ? 0.6 : 0.08));
  }

  /**
   * Memulai BGM Gamelan Slendro Upbeat (~122 BPM) untuk Splash Screen / Input NISN
   */
  startGamelanBGM() {
    if (this.muted) return;
    this.stopBGM();
    this.init();
    if (!this.ctx) return;

    this.lastBgmMode = 'splash';

    const startSequencer = () => {
      if (this.bgmPlaying || this.muted) return;
      this.bgmPlaying = true;
      this.bgmMode = 'splash';

      // Tangga nada Slendro (Hz)
      const slendro = {
        gong: 130.81,   // C3 Gong / Bass
        gongLow: 98.00, // G2 Low Bass
        ji: 261.63,     // 1 C4
        ro: 293.66,     // 2 D4
        lu: 329.63,     // 3 E4
        ma: 392.00,     // 5 G4
        nem: 440.00,    // 6 A4
        jiAlit: 523.25, // 1' C5
        roAlit: 587.33, // 2' D5
        luAlit: 659.25  // 3' E5
      };

      // Partitur arpeggio energik 16 langkah (~122 BPM, 245ms per ketukan)
      const score = [
        // Bar 1: Intro melodi riang & bersemangat
        { note: slendro.jiAlit, kick: true, dur: 0.32, vol: 0.15 },
        { note: slendro.nem, dur: 0.22, vol: 0.13 },
        { note: slendro.ma, wood: true, dur: 0.22, vol: 0.12 },
        { note: slendro.lu, dur: 0.22, vol: 0.13 },
        { note: slendro.ro, kick: true, dur: 0.26, vol: 0.14 },
        { note: slendro.lu, dur: 0.22, vol: 0.13 },
        { note: slendro.ma, wood: true, dur: 0.22, vol: 0.13 },
        { note: slendro.nem, dur: 0.26, vol: 0.14 },

        // Bar 2: Variasi puncak melodi petualangan
        { note: slendro.roAlit, kick: true, bass: slendro.gongLow, dur: 0.32, vol: 0.16 },
        { note: slendro.jiAlit, dur: 0.22, vol: 0.14 },
        { note: slendro.nem, wood: true, dur: 0.22, vol: 0.13 },
        { note: slendro.luAlit, dur: 0.28, vol: 0.15 },
        { note: slendro.jiAlit, kick: true, dur: 0.28, vol: 0.15 },
        { note: slendro.nem, dur: 0.22, vol: 0.13 },
        { note: slendro.ma, wood: true, dur: 0.22, vol: 0.13 },
        { note: slendro.ro, gong: true, dur: 0.45, vol: 0.14 }
      ];

      let step = 0;
      const playStep = () => {
        if (!this.bgmPlaying || this.muted || this.bgmMode !== 'splash') return;
        const now = this.ctx.currentTime;
        const cur = score[step % score.length];

        if (cur.kick) {
          this.playKendangKick(now);
        }
        if (cur.wood) {
          this.playWoodblock(now);
        }
        if (cur.gong) {
          this.playGamelanTone(slendro.gong, 0.6, 0.16, true);
        } else if (cur.bass) {
          this.playGamelanTone(cur.bass, 0.5, 0.15, true);
        }

        this.playGamelanTone(cur.note, cur.dur, cur.vol, false);
        step++;
      };

      playStep();
      this.bgmInterval = setInterval(playStep, 245);
    };

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(startSequencer).catch(() => {});
    } else {
      startSequencer();
    }
  }

  /**
   * Menghasilkan nada gamelan lembut / meditatif untuk sesi membaca & pretest
   * @param {number} freq Frekuensi nada dasar (Hz)
   * @param {number} duration Durasi nada (detik)
   * @param {number} gainLevel Volume nada (0.0 - 1.0)
   * @param {boolean} isGong Flag apakah nada merupakan gong / bass
   */
  playSlowTone(freq, duration = 3.0, gainLevel = 0.06, isGong = false) {
    if (this.muted || !this.ctx) return;

    const now = this.ctx.currentTime;

    const noteGain = this.ctx.createGain();
    noteGain.gain.setValueAtTime(0.0001, now);
    noteGain.gain.linearRampToValueAtTime(gainLevel, now + 0.04);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    // Osilator utama nada tenang
    const oscMain = this.ctx.createOscillator();
    oscMain.type = 'sine';
    oscMain.frequency.setValueAtTime(freq, now);

    // Osilator detune lembut untuk resonansi riak ombak perunggu
    const oscDetune = this.ctx.createOscillator();
    oscDetune.type = isGong ? 'triangle' : 'sine';
    const detuneOffset = isGong ? 0.7 : 1.1;
    oscDetune.frequency.setValueAtTime(freq + detuneOffset, now);

    // Filter lowpass untuk meredam nada tinggi agar suasana sejuk dan fokus
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isGong ? 450 : 1200, now);

    oscMain.connect(noteGain);
    oscDetune.connect(noteGain);
    noteGain.connect(filter);
    filter.connect(this.ctx.destination);

    oscMain.start(now);
    oscDetune.start(now);

    oscMain.stop(now + duration);
    oscDetune.stop(now + duration);
  }

  /**
   * Memulai BGM Pretest Berinstrumen Tenang/Lambat (~56 BPM) untuk fokus pengerjaan kuis
   */
  startPretestBGM() {
    if (this.muted) return;
    this.stopBGM();
    this.init();
    if (!this.ctx) return;

    this.lastBgmMode = 'pretest';

    const startSequencer = () => {
      if (this.bgmPlaying || this.muted) return;
      this.bgmPlaying = true;
      this.bgmMode = 'pretest';

      const slendro = {
        gong: 130.81,   // C3 Gong Ageng lembut
        kempul: 196.00, // G3 Kempul
        ji: 261.63,     // 1 C4
        ro: 293.66,     // 2 D4
        lu: 329.63,     // 3 E4
        ma: 392.00,     // 5 G4
        nem: 440.00,    // 6 A4
        jiAlit: 523.25  // 1' C5
      };

      // Melodi lambat kontemplatif 12 ketukan (~56 BPM, 1080ms per langkah)
      const score = [
        { note: slendro.ji, gong: true, dur: 4.0, vol: 0.07 },
        { note: slendro.lu, dur: 2.8, vol: 0.05 },
        { note: slendro.nem, dur: 2.8, vol: 0.055 },
        { note: slendro.ma, dur: 2.5, vol: 0.05 },
        { note: slendro.ro, kempul: true, dur: 3.2, vol: 0.06 },
        { note: slendro.lu, dur: 2.6, vol: 0.05 },
        { note: slendro.jiAlit, dur: 3.0, vol: 0.055 },
        { note: slendro.nem, dur: 2.5, vol: 0.05 },
        { note: slendro.ma, gong: true, dur: 3.8, vol: 0.065 },
        { note: slendro.lu, dur: 2.8, vol: 0.05 },
        { note: slendro.ro, dur: 2.6, vol: 0.05 },
        { note: slendro.ji, dur: 3.0, vol: 0.055 }
      ];

      let step = 0;
      const playStep = () => {
        if (!this.bgmPlaying || this.muted || this.bgmMode !== 'pretest') return;
        const cur = score[step % score.length];

        if (cur.gong) {
          this.playSlowTone(slendro.gong, 4.2, 0.075, true);
        } else if (cur.kempul) {
          this.playSlowTone(slendro.kempul, 3.2, 0.06, true);
        }

        this.playSlowTone(cur.note, cur.dur, cur.vol, false);
        step++;
      };

      playStep();
      this.bgmInterval = setInterval(playStep, 1080);
    };

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(startSequencer).catch(() => {});
    } else {
      startSequencer();
    }
  }

  /**
   * Menghentikan pemutaran BGM synthesizer
   */
  stopBGM() {
    this.bgmPlaying = false;
    this.bgmMode = 'none';
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  /**
   * Toggle status senyap (mute/unmute)
   * @param {boolean} allowBGMResume Izinkan memulai kembali BGM jika di-unmute
   * @param {string} preferredMode Mode BGM yang diinginkan ('splash' | 'pretest')
   */
  toggleMute(allowBGMResume = false, preferredMode = null) {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopBGM();
    } else if (allowBGMResume) {
      const mode = preferredMode || this.lastBgmMode;
      if (mode === 'pretest') {
        this.startPretestBGM();
      } else {
        this.startGamelanBGM();
      }
    }
    return this.muted;
  }
}

export const sound = new SoundEngine();
