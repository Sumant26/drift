/**
 * Generative Cozy Sci-Fi Ambient Synthesizer & Multi-Station Radio Engine for Drift.
 * Includes multi-bus audio mixer with independent controls for Music, Engine, and SFX.
 */

export const RADIO_STATIONS = [
  { id: "cosmic", name: "Deep Cosmic Chill", genre: "Ambient Synthscape" },
  { id: "lofi", name: "Lo-Fi Space Haze", genre: "Warm Rhodes & Dust" },
  { id: "cyber", name: "Cyber Analog Wave", genre: "80s Stellar Chorus" },
  { id: "custom", name: "Custom Space Deck", genre: "Imported Audio Track" },
  { id: "silence", name: "Stellar Silence", genre: "SFX Only" },
];

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicBus = null;
    this.ambientGain = null;
    this.engineGain = null;
    this.sfxGain = null;
    this.engineOsc = null;
    this.engineFilter = null;
    this.isMuted = false;
    this.initialized = false;

    // Real-time Beat / Spectrum Analyser
    this.analyser = null;
    this.freqData = null;

    // Custom Audio Importer
    this.customSource = null;
    this.customBuffer = null;
    this.customTrackName = "";
    this.isCustomPlaying = false;

    // Independent volume settings (0.0 to 1.0)
    this.volumes = {
      master: 0.75,
      music: 0.65,
      engine: 0.45,
      sfx: 0.8,
    };

    // Radio station state
    this.stationIndex = 0;
    this.currentStation = RADIO_STATIONS[0];

    // Vinyl Crackle Noise Node for Lo-Fi
    this.vinylGain = null;

    // Delay & Spatial Reverb Simulation Nodes
    this.delayNode = null;
    this.delayFeedback = null;
    this.delayFilter = null;

    // Music Sequencing State
    this.chordStep = 0;
    this.arpStep = 0;
    this.currentChord = null;
    this.nextChordTime = 0;
    this.nextPluckTime = 0;
    this.activePads = [];

    // Musical Tonality per Sector Biome
    this.biomeChords = {
      "opal-nebula": [
        [174.61, 220.0, 261.63, 329.63, 392.0], // Fmaj9
        [146.83, 220.0, 261.63, 329.63, 440.0], // Dm9
        [130.81, 196.0, 246.94, 293.66, 392.0], // Cmaj9
        [116.54, 174.61, 220.0, 261.63, 349.23], // Bbmaj7#11
      ],
      "solar-expanse": [
        [146.83, 220.0, 293.66, 369.99, 440.0], // Dmaj9
        [196.0, 246.94, 293.66, 369.99, 440.0], // Gmaj9
        [164.81, 246.94, 329.63, 392.0, 493.88], // Em9
        [220.0, 277.18, 329.63, 440.0, 554.37], // A6/9
      ],
      "abyssal-rift": [
        [130.81, 196.0, 233.08, 293.66, 349.23], // Cm11
        [155.56, 233.08, 277.18, 349.23, 415.3], // Ebmaj7#11
        [116.54, 174.61, 233.08, 261.63, 349.23], // Bbsus2
        [130.81, 174.61, 220.0, 261.63, 329.63], // F/C
      ],
      "emerald-genesis": [
        [220.0, 261.63, 329.63, 392.0, 493.88], // Am9
        [174.61, 220.0, 261.63, 329.63, 440.0], // Fmaj7#11
        [196.0, 246.94, 293.66, 392.0, 440.0], // G6
        [164.81, 220.0, 261.63, 329.63, 392.0], // Em7
      ],
      "supernova-core": [
        [123.47, 185.0, 220.0, 277.18, 369.99], // Bm9
        [146.83, 220.0, 293.66, 369.99, 440.0], // Dmaj9
        [164.81, 246.94, 329.63, 369.99, 493.88], // E9
        [196.0, 246.94, 293.66, 369.99, 440.0], // Gmaj7#11
      ],
    };
  }

  /** Initializes Web Audio context on first user interaction */
  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      // Master output bus & Spectrum Analyser
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volumes.master, this.ctx.currentTime);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.8;
      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      // Music Bus
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.setValueAtTime(this.volumes.music, this.ctx.currentTime);
      this.musicBus.connect(this.masterGain);

      // SFX Bus
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.volumes.sfx, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Spatial Delay
      this.setupSpatialDelay();

      // Ambient Pad Bus
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      this.ambientGain.connect(this.musicBus);
      this.ambientGain.connect(this.delayNode);

      // Vinyl noise generator for Lo-Fi station
      this.setupVinylNoise();

      // Engine Thruster Bus
      this.setupEngineSynth();

      this.initialized = true;
    } catch (err) {
      console.warn("Web Audio could not be initialized:", err.message);
    }
  }

  setVolume(type, val) {
    if (val < 0 || val > 1) return;
    this.volumes[type] = val;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (type === "master" && this.masterGain && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(val, now, 0.05);
    } else if (type === "music" && this.musicBus) {
      this.musicBus.gain.setTargetAtTime(val, now, 0.05);
    } else if (type === "engine" && this.engineGain) {
      this.engineGain.gain.setTargetAtTime(val * 0.35, now, 0.05);
    } else if (type === "sfx" && this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(val, now, 0.05);
    }
  }

  setupSpatialDelay() {
    if (!this.ctx) return;
    this.delayNode = this.ctx.createDelay();
    this.delayNode.delayTime.setValueAtTime(0.42, this.ctx.currentTime);

    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.setValueAtTime(0.45, this.ctx.currentTime);

    this.delayFilter = this.ctx.createBiquadFilter();
    this.delayFilter.type = "lowpass";
    this.delayFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);

    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayFilter);
    this.delayFilter.connect(this.delayNode);
    this.delayFilter.connect(this.musicBus);
  }

  setupVinylNoise() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() - 0.5) * (Math.random() > 0.98 ? 0.3 : 0.03);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.2, this.ctx.currentTime);

    this.vinylGain = this.ctx.createGain();
    this.vinylGain.gain.setValueAtTime(0, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(this.vinylGain);
    this.vinylGain.connect(this.musicBus);
    noise.start();
  }

  setupEngineSynth() {
    if (!this.ctx) return;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(this.volumes.engine * 0.3, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = "lowpass";
    this.engineFilter.frequency.setValueAtTime(130, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(3.2, this.ctx.currentTime);

    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = "sawtooth";
    this.engineOsc.frequency.setValueAtTime(52, this.ctx.currentTime);

    const subOsc = this.ctx.createOscillator();
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(26, this.ctx.currentTime);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    subOsc.connect(subGain);
    subGain.connect(this.engineFilter);

    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc.start();
    subOsc.start();
  }

  cycleRadioStation() {
    this.stationIndex = (this.stationIndex + 1) % RADIO_STATIONS.length;
    this.currentStation = RADIO_STATIONS[this.stationIndex];
    this.playTuningStatic();

    if (this.vinylGain && this.ctx) {
      const now = this.ctx.currentTime;
      const vinylTarget = this.currentStation.id === "lofi" ? 0.08 : 0;
      this.vinylGain.gain.setTargetAtTime(vinylTarget, now, 0.2);
    }
    return this.currentStation;
  }

  playTuningStatic() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const noiseOsc = this.ctx.createOscillator();
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.linearRampToValueAtTime(0.06, now + 0.03);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    noiseOsc.frequency.setValueAtTime(800 + Math.random() * 400, now);
    noiseOsc.connect(noiseGain);
    noiseGain.connect(this.sfxGain || this.masterGain);
    noiseOsc.start(now);
    noiseOsc.stop(now + 0.24);
  }

  triggerAmbientPad(biomeId = "opal-nebula") {
    if (!this.ctx || this.isMuted || this.ctx.state !== "running" || this.currentStation.id === "silence") return;
    const now = this.ctx.currentTime;
    const chordList = this.biomeChords[biomeId] || this.biomeChords["opal-nebula"];
    const chord = chordList[this.chordStep % chordList.length];
    this.currentChord = chord;
    this.chordStep++;

    const isLofi = this.currentStation.id === "lofi";
    const isCyber = this.currentStation.id === "cyber";

    const padGain = this.ctx.createGain();
    padGain.gain.setValueAtTime(0.0001, now);
    padGain.gain.linearRampToValueAtTime(isCyber ? 0.16 : 0.13, now + 3.8);
    padGain.gain.exponentialRampToValueAtTime(0.0001, now + 12.8);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(isLofi ? 340 : 260, now);
    filter.frequency.linearRampToValueAtTime(isCyber ? 950 : 680, now + 4.5);
    filter.frequency.linearRampToValueAtTime(isLofi ? 300 : 220, now + 12.8);
    filter.Q.setValueAtTime(isCyber ? 3.5 : 2.0, now);

    padGain.connect(filter);
    filter.connect(this.ambientGain);

    chord.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const oscSub = this.ctx.createOscillator();

      osc.type = isCyber ? "sawtooth" : i === 0 ? "sine" : i % 2 === 0 ? "triangle" : "sine";
      oscSub.type = "sine";

      const detune = (i % 2 === 0 ? 1 : -1) * (isCyber ? 5.5 : 2.5);
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.setValueAtTime(detune, now);
      oscSub.frequency.setValueAtTime(freq * 0.5, now);

      osc.connect(padGain);
      if (i === 0) oscSub.connect(padGain);

      osc.start(now);
      oscSub.start(now);
      osc.stop(now + 13.0);
      oscSub.stop(now + 13.0);
    });

    this.activePads.push(padGain);
    setTimeout(() => {
      const idx = this.activePads.indexOf(padGain);
      if (idx !== -1) this.activePads.splice(idx, 1);
    }, 13500);
  }

  triggerMelodyPluck() {
    if (
      !this.ctx ||
      this.isMuted ||
      this.ctx.state !== "running" ||
      !this.currentChord ||
      this.currentStation.id === "silence"
    )
      return;
    const now = this.ctx.currentTime;
    const isCyber = this.currentStation.id === "cyber";

    const baseTone = isCyber
      ? this.currentChord[this.arpStep % this.currentChord.length]
      : this.currentChord[Math.floor(Math.random() * this.currentChord.length)];
    this.arpStep++;

    const octaveMultiplier = isCyber ? 2 : Math.random() > 0.4 ? 2 : 4;
    const freq = baseTone * octaveMultiplier;

    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const pluckGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = isCyber ? "sawtooth" : "sine";
    osc.frequency.setValueAtTime(freq, now);

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(freq * 1.003, now);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(freq * (isCyber ? 3.5 : 2.5), now);
    filter.frequency.exponentialRampToValueAtTime(280, now + (isCyber ? 0.4 : 1.6));

    pluckGain.gain.setValueAtTime(0.0001, now);
    pluckGain.gain.linearRampToValueAtTime(isCyber ? 0.09 : 0.07, now + 0.015);
    pluckGain.gain.exponentialRampToValueAtTime(0.0001, now + (isCyber ? 0.8 : 2.2));

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(pluckGain);

    pluckGain.connect(this.musicBus);
    pluckGain.connect(this.delayNode);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 2.4);
    osc2.stop(now + 2.4);
  }

  playChime(pitchMultiplier = 1.0) {
    if (!this.ctx || this.isMuted || this.ctx.state !== "running") return;
    const now = this.ctx.currentTime;
    const pentatonic = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66];
    const baseFreq = pentatonic[Math.floor(Math.random() * pentatonic.length)] * pitchMultiplier;

    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const chimeGain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq, now);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(baseFreq * 2.004, now);

    chimeGain.gain.setValueAtTime(0.001, now);
    chimeGain.gain.linearRampToValueAtTime(0.18, now + 0.03);
    chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);

    osc.connect(chimeGain);
    osc2.connect(chimeGain);
    chimeGain.connect(this.sfxGain || this.masterGain);
    chimeGain.connect(this.delayNode);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 2.5);
    osc2.stop(now + 2.5);
  }

  playShieldActivate() {
    if (!this.ctx || this.isMuted || this.ctx.state !== "running") return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.25);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain || this.masterGain);

    osc.start(now);
    osc.stop(now + 0.36);
  }

  playShieldDeflect() {
    if (!this.ctx || this.isMuted || this.ctx.state !== "running") return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.3);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc.connect(gain);
    gain.connect(this.sfxGain || this.masterGain);
    gain.connect(this.delayNode);

    osc.start(now);
    osc.stop(now + 0.33);
  }

  playImpact() {
    if (!this.ctx || this.isMuted || this.ctx.state !== "running") return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.4);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc.connect(gain);
    gain.connect(this.sfxGain || this.masterGain);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  getAudioFrequencies() {
    if (!this.analyser || !this.freqData) return null;
    this.analyser.getByteFrequencyData(this.freqData);
    return this.freqData;
  }

  async loadCustomAudio(file) {
    this.init();
    if (!this.ctx) return;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.customBuffer = audioBuffer;
      this.customTrackName = file.name || "Custom Track";

      if (this.customSource) {
        try {
          this.customSource.stop();
        } catch {
          /* ignore */
        }
      }

      this.customSource = this.ctx.createBufferSource();
      this.customSource.buffer = this.customBuffer;
      this.customSource.loop = true;
      this.customSource.connect(this.musicBus);
      this.customSource.start(0);
      this.isCustomPlaying = true;

      // Switch radio to custom station
      const customStation = RADIO_STATIONS.find((s) => s.id === "custom");
      if (customStation) {
        this.currentStation = customStation;
        this.stationIndex = RADIO_STATIONS.indexOf(customStation);
      }
      return this.customTrackName;
    } catch (err) {
      console.warn("Failed to load custom audio:", err);
      throw err;
    }
  }

  update(speed, isBoost, delta, biomeId = "opal-nebula") {
    if (!this.initialized) return;
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    if (!this.ctx || this.ctx.state !== "running") return;

    const now = this.ctx.currentTime;

    if (this.currentStation.id !== "silence" && this.currentStation.id !== "custom") {
      if (now >= this.nextChordTime) {
        this.triggerAmbientPad(biomeId);
        this.nextChordTime = now + 6.8;
      }

      const isCyber = this.currentStation.id === "cyber";
      const interval = isCyber ? 0.35 : 0.9 + Math.random() * 1.1;
      if (now >= this.nextPluckTime) {
        this.triggerMelodyPluck();
        this.nextPluckTime = now + interval;
      }
    }

    if (this.engineOsc && this.engineFilter && this.engineGain) {
      const targetPitch = 46 + speed * 0.9 + (isBoost ? 18 : 0);
      const targetFilter = 110 + speed * 4.2 + (isBoost ? 170 : 0);
      const baseGain = (this.volumes.engine || 0.45) * 0.35;
      const targetGain = baseGain * (0.8 + (speed / 70) * 0.5 + (isBoost ? 0.4 : 0));

      this.engineOsc.frequency.setTargetAtTime(targetPitch, now, 0.08);
      this.engineFilter.frequency.setTargetAtTime(targetFilter, now, 0.08);
      this.engineGain.gain.setTargetAtTime(targetGain, now, 0.08);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.volumes.master, now, 0.06);
    }
    return this.isMuted;
  }

  dispose() {
    if (this.customSource) {
      try {
        this.customSource.stop();
      } catch {
        /* ignore */
      }
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
