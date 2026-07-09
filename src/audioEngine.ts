import { SoundType, SoundPosition, EarLevels } from './types';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private panner: PannerNode | null = null;
  private splitter: ChannelSplitterNode | null = null;
  private leftAnalyser: AnalyserNode | null = null;
  private rightAnalyser: AnalyserNode | null = null;
  private leftSeparationGain: GainNode | null = null;
  private rightSeparationGain: GainNode | null = null;
  private separationMerger: ChannelMergerNode | null = null;

  // Active sources
  private activeSource: AudioBufferSourceNode | OscillatorNode | null = null;
  private activeSoundGain: GainNode | null = null;
  private activeSoundType: SoundType | null = null;
  private currentVolume: number = 0.6;
  private currentPosition: SoundPosition = { x: 0, y: 0, z: 0 };

  // Cached buffers
  private buffers: Record<string, AudioBuffer> = {};

  // Synth Arpeggiator states
  private arpeggioTimer: number | null = null;
  private arpeggioIndex: number = 0;
  private synthNodes: { oscs: OscillatorNode[]; gain: GainNode }[] = [];

  constructor() {
    // Lazy initialization on user interaction
  }

  private init() {
    if (this.ctx) return;

    // Create audio context
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();

    // Create main nodes
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.currentVolume;

    this.panner = this.ctx.createPanner();
    this.panner.panningModel = 'HRTF';
    this.panner.distanceModel = 'inverse';
    this.panner.refDistance = 1;
    this.panner.maxDistance = 100;
    this.panner.rolloffFactor = 1.2;

    // Create channel separation nodes
    this.splitter = this.ctx.createChannelSplitter(2);
    this.leftSeparationGain = this.ctx.createGain();
    this.rightSeparationGain = this.ctx.createGain();
    this.separationMerger = this.ctx.createChannelMerger(2);

    this.leftAnalyser = this.ctx.createAnalyser();
    this.rightAnalyser = this.ctx.createAnalyser();

    this.leftAnalyser.fftSize = 128;
    this.rightAnalyser.fftSize = 128;

    // Connect Source -> Panner -> Splitter -> (Left/Right Gain Nodes) -> Merger -> Master Gain -> Destination
    this.panner.connect(this.splitter);

    // Route Left Channel (channel 0)
    this.splitter.connect(this.leftSeparationGain, 0, 0);
    this.leftSeparationGain.connect(this.leftAnalyser);
    this.leftSeparationGain.connect(this.separationMerger, 0, 0);

    // Route Right Channel (channel 1)
    this.splitter.connect(this.rightSeparationGain, 1, 0);
    this.rightSeparationGain.connect(this.rightAnalyser);
    this.rightSeparationGain.connect(this.separationMerger, 0, 1);

    // Connect merged stereo signal to Master Gain
    this.separationMerger.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // Update initial panner coordinates
    this.updatePosition(this.currentPosition);

    // Build static sound buffers
    this.generateWhiteNoiseBuffer();
    this.generatePinkNoiseBuffer();
    this.generateOrganicRainBuffer();
  }

  private generateWhiteNoiseBuffer() {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * 2; // 2 seconds of looping white noise
    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.buffers['white_noise'] = buffer;
  }

  private generatePinkNoiseBuffer() {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * 2; // 2 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    // Paul Kellet's refined Voss-McCartney pink noise algorithm
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;
      data[i] = pink * 0.12; // Rescale to fit standard audio level
    }

    this.buffers['pink_noise'] = buffer;
  }

  private generateOrganicRainBuffer() {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * 4; // 4 seconds of rich audio
    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    // 1. Generate pink noise baseline wash with seamless crossfade (distant rain)
    const crossfadeDuration = 0.2; // 200ms crossfade
    const crossfadeSize = Math.floor(sampleRate * crossfadeDuration);
    const tempSize = bufferSize + crossfadeSize;
    const tempPink = new Float32Array(tempSize);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < tempSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;
      tempPink[i] = pink * 0.035; // Gentle atmospheric wash
    }

    // Blend the extra tail part into the head using a power-complementary crossfade
    for (let i = 0; i < bufferSize; i++) {
      if (i < crossfadeSize) {
        const alpha = i / crossfadeSize;
        const gainIn = Math.sin(alpha * Math.PI / 2);
        const gainOut = Math.cos(alpha * Math.PI / 2);
        data[i] = tempPink[i] * gainIn + tempPink[bufferSize + i] * gainOut;
      } else {
        data[i] = tempPink[i];
      }
    }

    // 2. Sprinkle random near-field high-fidelity drops (sharp transients)
    // We wrap around using modulo to avoid truncating any drops near the loop boundary
    const numDrops = 150;
    for (let d = 0; d < numDrops; d++) {
      const startIdx = Math.floor(Math.random() * bufferSize);
      const freq = 1200 + Math.random() * 1800; // High-pitched clean resonance
      const duration = 0.008 + Math.random() * 0.012; // Super quick plops (8-20ms)
      const samples = duration * sampleRate;

      for (let i = 0; i < samples; i++) {
        const t = i / sampleRate;
        const amp = Math.exp(-t * 220); // Fast decay exponent
        const wave = Math.sin(2 * Math.PI * freq * t);
        const targetIdx = (startIdx + i) % bufferSize; // Perfect seamless wrap-around
        data[targetIdx] += wave * amp * 0.14;
      }
    }

    this.buffers['organic_rain'] = buffer;
  }

  public async start(type: SoundType, isAutopilot: boolean = false) {
    this.init();
    if (!this.ctx || !this.panner) return;

    // Resume context if suspended (browser security check)
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    // Stop current sound (initiates smooth fade-out of previous sound)
    this.stop();
    this.activeSoundType = type;

    // Create a new session gain node for the new sound
    const sessionGain = this.ctx.createGain();
    sessionGain.gain.setValueAtTime(0, this.ctx.currentTime);
    // Smoothly fade in the new sound over 30ms to prevent any attack click
    sessionGain.gain.linearRampToValueAtTime(1.0, this.ctx.currentTime + 0.03);
    sessionGain.connect(this.panner);
    this.activeSoundGain = sessionGain;

    if (type === 'organic_rain') {
      const buffer = this.buffers[type];
      if (buffer) {
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.connect(sessionGain);
        source.start(0);
        this.activeSource = source;
      }
    } else if (type === 'forest_birds') {
      // Gentle wind chimes and warm bird sweeps
      const scheduler = () => {
        if (!this.ctx || !this.panner || !sessionGain) return;
        const now = this.ctx.currentTime;

        // Randomly decide to play a chime (wind chime sound) or a chirp (bird)
        if (Math.random() > 0.4) {
          // Play a sweet wind chime
          const chimeOsc = this.ctx.createOscillator();
          const chimeGain = this.ctx.createGain();
          
          chimeOsc.type = 'sine';
          const notes = [587.33, 659.25, 783.99, 880.00, 987.77, 1174.66];
          const freq = notes[Math.floor(Math.random() * notes.length)];
          chimeOsc.frequency.setValueAtTime(freq, now);

          chimeGain.gain.setValueAtTime(0, now);
          chimeGain.gain.linearRampToValueAtTime(0.12, now + 0.01);
          chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

          chimeOsc.connect(chimeGain);
          chimeGain.connect(sessionGain);
          chimeOsc.start(now);
          chimeOsc.stop(now + 1.3);

          const nodeRef = { oscs: [chimeOsc], gain: chimeGain };
          this.synthNodes.push(nodeRef);
          setTimeout(() => {
            if (this.ctx) {
              this.synthNodes = this.synthNodes.filter((n) => n !== nodeRef);
            }
          }, 1500);
        } else {
          // Play a gentle forest bird chirp
          const chirpOsc = this.ctx.createOscillator();
          const chirpGain = this.ctx.createGain();

          chirpOsc.type = 'sine';
          const startFreq = 1800 + Math.random() * 600;
          chirpOsc.frequency.setValueAtTime(startFreq, now);
          chirpOsc.frequency.exponentialRampToValueAtTime(startFreq + 500, now + 0.05);
          chirpOsc.frequency.exponentialRampToValueAtTime(startFreq - 300, now + 0.12);

          chirpGain.gain.setValueAtTime(0, now);
          chirpGain.gain.linearRampToValueAtTime(0.06, now + 0.005);
          chirpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

          chirpOsc.connect(chirpGain);
          chirpGain.connect(sessionGain);
          chirpOsc.start(now);
          chirpOsc.stop(now + 0.2);

          const nodeRef = { oscs: [chirpOsc], gain: chirpGain };
          this.synthNodes.push(nodeRef);
          setTimeout(() => {
            if (this.ctx) {
              this.synthNodes = this.synthNodes.filter((n) => n !== nodeRef);
            }
          }, 300);
        }
      };

      scheduler();
      this.arpeggioTimer = window.setInterval(scheduler, 400);

    } else if (type === 'bowl_gong') {
      // 4 oscillators slightly detuned to create that rich, vibrating singing bowl sound
      const freqs = [180, 360.5, 541, 811.5];
      const gains = [0.35, 0.18, 0.08, 0.04];
      const bowlGain = this.ctx.createGain();
      bowlGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      bowlGain.connect(sessionGain);

      const oscs: OscillatorNode[] = [];

      freqs.forEach((f, idx) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, this.ctx!.currentTime);
        
        // Subtle slow vibrato for each oscillator to mimic a hand-rubbed bowl
        const vibrato = this.ctx!.createOscillator();
        vibrato.frequency.setValueAtTime(0.22 + idx * 0.04, this.ctx!.currentTime);
        const vibratoGain = this.ctx!.createGain();
        vibratoGain.gain.setValueAtTime(1.8, this.ctx!.currentTime);
        
        vibrato.connect(vibratoGain);
        vibratoGain.connect(osc.frequency);
        vibrato.start();
        
        const oscGain = this.ctx!.createGain();
        oscGain.gain.setValueAtTime(gains[idx], this.ctx!.currentTime);
        
        osc.connect(oscGain);
        oscGain.connect(bowlGain);
        osc.start();
        
        oscs.push(osc);
        oscs.push(vibrato);
      });

      this.activeSource = oscs[0];
      this.synthNodes.push({ oscs: oscs.slice(1), gain: bowlGain });

    } else if (type === 'binaural_beat') {
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(528, this.ctx.currentTime); // 528 Hz Solfeggio

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(264, this.ctx.currentTime); // 264 Hz sub-octave

      const osc3 = this.ctx.createOscillator();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(132, this.ctx.currentTime); // 132 Hz deep anchor

      const padGain = this.ctx.createGain();
      padGain.gain.setValueAtTime(0.25, this.ctx.currentTime);

      osc1.connect(padGain);
      osc2.connect(padGain);
      osc3.connect(padGain);
      padGain.connect(sessionGain);

      osc1.start();
      osc2.start();
      osc3.start();

      this.activeSource = osc1;
      this.synthNodes.push({ oscs: [osc2, osc3], gain: padGain });

    } else if (['heartbeat_sba', 'handpan_sba', 'hang_drum_sba', 'tongue_drum_sba', 'bol_tibetan_premium', 'kalimba_sba'].includes(type)) {
      if (!isAutopilot) {
        const intervals: Record<string, number> = {
          heartbeat_sba: 1000,
          handpan_sba: 900,
          hang_drum_sba: 1100,
          tongue_drum_sba: 1300,
          bol_tibetan_premium: 2500,
          kalimba_sba: 550
        };
        const interval = intervals[type] || 1000;

        // Run first note immediately
        this.triggerSbaNote();

        // Start interval
        this.arpeggioTimer = window.setInterval(() => {
          this.triggerSbaNote();
        }, interval);
      }
    }
  }

  private startArpeggiator() {
    if (!this.ctx || !this.panner) return;

    const scheduler = () => {
      if (!this.ctx || !this.panner) return;

      const nextNoteTime = this.ctx.currentTime;
      // 320Hz is a classic gentle woodblock / click frequency
      const freq = 320; 

      const osc1 = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();

      osc1.type = 'triangle'; // triangle is much warmer and gentler than sine or sawtooth
      osc1.frequency.setValueAtTime(freq, nextNoteTime);

      // Woodblock-like attack and quick decay (extremely soft but precise)
      noteGain.gain.setValueAtTime(0, nextNoteTime);
      noteGain.gain.linearRampToValueAtTime(0.24, nextNoteTime + 0.002);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, nextNoteTime + 0.06); // 60ms click is crisp yet gentle

      osc1.connect(noteGain);
      noteGain.connect(this.panner);

      osc1.start(nextNoteTime);
      
      const stopTime = nextNoteTime + 0.1;
      osc1.stop(stopTime);

      const noteRef = { oscs: [osc1], gain: noteGain };
      this.synthNodes.push(noteRef);
      setTimeout(() => {
        this.synthNodes = this.synthNodes.filter((n) => n !== noteRef);
      }, 150);
    };

    // Run first tick immediately
    scheduler();

    // Schedule subsequent ticks: 450ms is perfect therapeutic tempo for bilateral clicks
    this.arpeggioTimer = window.setInterval(scheduler, 450);
  }

  public stop() {
    // Clear arpeggiator timer immediately
    if (this.arpeggioTimer) {
      clearInterval(this.arpeggioTimer);
      this.arpeggioTimer = null;
    }

    const oldGain = this.activeSoundGain;
    const oldSource = this.activeSource;
    const oldSynthNodes = this.synthNodes;

    if (oldGain && this.ctx) {
      const now = this.ctx.currentTime;
      try {
        oldGain.gain.setValueAtTime(oldGain.gain.value, now);
        oldGain.gain.linearRampToValueAtTime(0, now + 0.08); // Smooth 80ms fade out
      } catch (e) {
        try {
          oldGain.gain.value = 0;
        } catch (err) {}
      }

      // Schedule cleanup after the fade-out completes
      setTimeout(() => {
        if (oldSource) {
          try {
            oldSource.stop();
          } catch (e) {}
        }
        oldSynthNodes.forEach((node) => {
          node.oscs.forEach((osc) => {
            try {
              osc.stop();
            } catch (e) {}
          });
        });
        try {
          oldGain.disconnect();
        } catch (e) {}
      }, 100);
    } else {
      // Fallback synchronous cleanup
      if (oldSource) {
        try {
          oldSource.stop();
        } catch (e) {}
      }
      oldSynthNodes.forEach((node) => {
        node.oscs.forEach((osc) => {
          try {
            osc.stop();
          } catch (e) {}
        });
      });
    }

    // Instantly reset class active state so next sound starts fresh
    this.activeSource = null;
    this.synthNodes = [];
    this.activeSoundGain = null;
    this.activeSoundType = null;
  }

  public setVolume(vol: number) {
    this.currentVolume = vol;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(vol, this.ctx.currentTime);
    }
  }

  public updatePosition(pos: SoundPosition) {
    this.currentPosition = pos;
    if (!this.panner || !this.ctx) return;

    // Map X, Y, Z to Panner's spatial coordinate system
    // Our top-down 2D canvas mapping:
    // - X maps directly to horizontal axis (positionX). Panning Left is negative, Right is positive.
    // - Y maps to elevation (positionY). Up is positive, Down is negative.
    // - Z maps to front-back axis (positionZ).
    // Let's scale to exaggerate spatial effect in headphones (2.5x coefficient)
    const scale = 2.5;
    const px = pos.x * scale;
    const py = pos.y * scale;
    
    // In Web Audio, listener looks at -Z (forward direction).
    // Therefore, positive pos.z (In front / Haute) should map to -Z (forward).
    // Negative pos.z (Behind / Bas) should map to +Z (backward).
    const pz = -pos.z * scale;

    if (this.panner.positionX) {
      const t = this.ctx.currentTime;
      // Use a shorter ramp time (12ms) to match high-frequency animation frames, preventing lagging/smoothing
      this.panner.positionX.linearRampToValueAtTime(px, t + 0.012);
      this.panner.positionY.linearRampToValueAtTime(py, t + 0.012);
      this.panner.positionZ.linearRampToValueAtTime(pz, t + 0.012);
    } else {
      // Legacy browsers
      this.panner.setPosition(px, py, pz);
    }

    // Dynamic Left/Right Crosstalk Separation (100% isolation at extremes)
    // pos.x ranges from -5 (extreme left) to +5 (extreme right).
    // We normalize to -1.0 to +1.0
    const normX = Math.max(-1, Math.min(1, pos.x / 5));

    let leftGain = 1.0;
    let rightGain = 1.0;

    // To ensure 100% separation when panned, let's map normX such that:
    // If it's panned past 80% to one side (e.g. >= 0.8), the opposite ear is 100% muted (0.0 gain).
    // This gives a solid, clean, therapeutic bilateral separation.
    const separationThreshold = 0.8;
    const absX = Math.abs(normX);
    
    if (absX >= separationThreshold) {
      if (normX < 0) {
        leftGain = 1.0;
        rightGain = 0.0;
      } else {
        leftGain = 0.0;
        rightGain = 1.0;
      }
    } else {
      // Smooth transition between center and the separation threshold
      if (normX < 0) {
        leftGain = 1.0;
        rightGain = Math.pow(1.0 - (absX / separationThreshold), 1.5);
      } else {
        rightGain = 1.0;
        leftGain = Math.pow(1.0 - (absX / separationThreshold), 1.5);
      }
    }

    if (this.leftSeparationGain && this.rightSeparationGain) {
      const t = this.ctx.currentTime;
      // Faster, high-performance ramp time (12ms) to respond instantly without lagging
      this.leftSeparationGain.gain.linearRampToValueAtTime(leftGain, t + 0.012);
      this.rightSeparationGain.gain.linearRampToValueAtTime(rightGain, t + 0.012);
    }
  }

  public getLevels(): EarLevels {
    if (!this.leftAnalyser || !this.rightAnalyser || !this.activeSoundType) {
      return { left: 0, right: 0 };
    }

    // Calculate RMS in time domain for real-time responsiveness
    const leftData = new Float32Array(this.leftAnalyser.fftSize);
    const rightData = new Float32Array(this.rightAnalyser.fftSize);

    this.leftAnalyser.getFloatTimeDomainData(leftData);
    this.rightAnalyser.getFloatTimeDomainData(rightData);

    let leftSum = 0;
    for (let i = 0; i < leftData.length; i++) {
      leftSum += leftData[i] * leftData[i];
    }
    const leftRMS = Math.sqrt(leftSum / leftData.length);

    let rightSum = 0;
    for (let i = 0; i < rightData.length; i++) {
      rightSum += rightData[i] * rightData[i];
    }
    const rightRMS = Math.sqrt(rightSum / rightData.length);

    // Apply scale multiplier for visual aesthetics
    const scale = 4.0;
    return {
      left: Math.min(1, leftRMS * scale),
      right: Math.min(1, rightRMS * scale),
    };
  }

  public getWaveforms() {
    if (!this.leftAnalyser || !this.rightAnalyser || !this.activeSoundType) {
      return { left: new Float32Array(0), right: new Float32Array(0) };
    }

    const leftData = new Float32Array(64);
    const rightData = new Float32Array(64);

    this.leftAnalyser.getFloatTimeDomainData(leftData);
    this.rightAnalyser.getFloatTimeDomainData(rightData);

    return { left: leftData, right: rightData };
  }

  public isPlaying(): boolean {
    return this.activeSoundType !== null;
  }

  public getActiveSoundType(): SoundType | null {
    return this.activeSoundType;
  }

  public triggerSbaNote() {
    if (!this.ctx || !this.activeSoundGain || !this.activeSoundType) return;
    const now = this.ctx.currentTime;
    const type = this.activeSoundType;
    const sessionGain = this.activeSoundGain;

    if (type === 'heartbeat_sba') {
      const triggerBeat = (delay: number, intensity: number) => {
        const time = now + delay;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(90, time);
        osc.frequency.exponentialRampToValueAtTime(25, time + 0.12);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(intensity, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);

        osc.connect(gain);
        gain.connect(sessionGain);
        osc.start(time);
        osc.stop(time + 0.25);

        const nodeRef = { oscs: [osc], gain };
        this.synthNodes.push(nodeRef);
        setTimeout(() => {
          if (this.ctx) {
            this.synthNodes = this.synthNodes.filter((n) => n !== nodeRef);
          }
        }, 300);
      };

      triggerBeat(0, 0.45);
      triggerBeat(0.16, 0.35);

    } else if (type === 'handpan_sba') {
      const notes = [146.83, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00];
      const freq = notes[Math.floor(Math.random() * notes.length)];

      const oscF = this.ctx.createOscillator();
      oscF.type = 'sine';
      oscF.frequency.setValueAtTime(freq, now);

      const oscOct = this.ctx.createOscillator();
      oscOct.type = 'sine';
      oscOct.frequency.setValueAtTime(freq * 2, now);

      const oscFifth = this.ctx.createOscillator();
      oscFifth.type = 'sine';
      oscFifth.frequency.setValueAtTime(freq * 3, now);

      const groupGain = this.ctx.createGain();
      groupGain.gain.setValueAtTime(0, now);
      groupGain.gain.linearRampToValueAtTime(0.18, now + 0.005);
      groupGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

      oscF.connect(groupGain);
      oscOct.connect(groupGain);
      oscFifth.connect(groupGain);
      groupGain.connect(sessionGain);

      oscF.start(now);
      oscOct.start(now);
      oscFifth.start(now);

      const stopTime = now + 2.0;
      oscF.stop(stopTime);
      oscOct.stop(stopTime);
      oscFifth.stop(stopTime);

      const nodeRef = { oscs: [oscF, oscOct, oscFifth], gain: groupGain };
      this.synthNodes.push(nodeRef);
      setTimeout(() => {
        if (this.ctx) {
          this.synthNodes = this.synthNodes.filter((n) => n !== nodeRef);
        }
      }, 2200);

    } else if (type === 'hang_drum_sba') {
      const notes = [110.00, 164.81, 220.00, 246.94, 329.63, 392.00];
      const freq = notes[Math.floor(Math.random() * notes.length)];

      const oscF = this.ctx.createOscillator();
      oscF.type = 'sine';
      oscF.frequency.setValueAtTime(freq, now);

      const oscGu = this.ctx.createOscillator();
      oscGu.type = 'sine';
      oscGu.frequency.setValueAtTime(85, now);

      const groupGain = this.ctx.createGain();
      groupGain.gain.setValueAtTime(0, now);
      groupGain.gain.linearRampToValueAtTime(0.22, now + 0.008);
      groupGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

      oscF.connect(groupGain);
      oscGu.connect(groupGain);
      groupGain.connect(sessionGain);

      oscF.start(now);
      oscGu.start(now);

      const stopTime = now + 2.5;
      oscF.stop(stopTime);
      oscGu.stop(stopTime);

      const nodeRef = { oscs: [oscF, oscGu], gain: groupGain };
      this.synthNodes.push(nodeRef);
      setTimeout(() => {
        if (this.ctx) {
          this.synthNodes = this.synthNodes.filter((n) => n !== nodeRef);
        }
      }, 2700);

    } else if (type === 'tongue_drum_sba') {
      const notes = [220.00, 246.94, 293.66, 329.63, 392.00, 440.00, 523.25];
      const freq = notes[Math.floor(Math.random() * notes.length)];

      const oscF = this.ctx.createOscillator();
      oscF.type = 'triangle';
      oscF.frequency.setValueAtTime(freq, now);

      const oscDetune = this.ctx.createOscillator();
      oscDetune.type = 'sine';
      oscDetune.frequency.setValueAtTime(freq * 1.004, now);

      const groupGain = this.ctx.createGain();
      groupGain.gain.setValueAtTime(0, now);
      groupGain.gain.linearRampToValueAtTime(0.20, now + 0.004);
      groupGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

      const lpFilter = this.ctx.createBiquadFilter();
      lpFilter.type = 'lowpass';
      lpFilter.frequency.setValueAtTime(1100, now);
      lpFilter.Q.setValueAtTime(1.0, now);

      oscF.connect(groupGain);
      oscDetune.connect(groupGain);
      groupGain.connect(lpFilter);
      lpFilter.connect(sessionGain);

      oscF.start(now);
      oscDetune.start(now);

      const stopTime = now + 2.8;
      oscF.stop(stopTime);
      oscDetune.stop(stopTime);

      const nodeRef = { oscs: [oscF, oscDetune], gain: groupGain };
      this.synthNodes.push(nodeRef);
      setTimeout(() => {
        if (this.ctx) {
          this.synthNodes = this.synthNodes.filter((n) => n !== nodeRef);
        }
      }, 3000);

    } else if (type === 'bol_tibetan_premium') {
      const freqs = [144.0, 404.6, 809.2, 1224.0];
      const gains = [0.38, 0.16, 0.08, 0.04];
      
      const groupGain = this.ctx.createGain();
      groupGain.gain.setValueAtTime(0, now);
      groupGain.gain.linearRampToValueAtTime(0.40, now + 0.02);
      groupGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);

      const oscs: OscillatorNode[] = [];

      freqs.forEach((f, idx) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);

        const lfo = this.ctx!.createOscillator();
        lfo.frequency.setValueAtTime(0.18 + idx * 0.05, now);
        const lfoGain = this.ctx!.createGain();
        lfoGain.gain.setValueAtTime(1.5, now);

        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start(now);
        lfo.stop(now + 4.0);

        const oscGain = this.ctx!.createGain();
        oscGain.gain.setValueAtTime(gains[idx], now);

        osc.connect(oscGain);
        oscGain.connect(groupGain);
        osc.start(now);
        osc.stop(now + 4.0);

        oscs.push(osc);
        oscs.push(lfo);
      });

      groupGain.connect(sessionGain);

      const nodeRef = { oscs, gain: groupGain };
      this.synthNodes.push(nodeRef);
      setTimeout(() => {
        if (this.ctx) {
          this.synthNodes = this.synthNodes.filter((n) => n !== nodeRef);
        }
      }, 4200);

    } else if (type === 'kalimba_sba') {
      const notes = [523.25, 587.33, 659.25, 783.99, 880.00, 987.77, 1046.50];
      const freq = notes[Math.floor(Math.random() * notes.length)];

      const oscF = this.ctx.createOscillator();
      oscF.type = 'sine';
      oscF.frequency.setValueAtTime(freq, now);

      const oscThump = this.ctx.createOscillator();
      oscThump.type = 'triangle';
      oscThump.frequency.setValueAtTime(140, now);

      const lpThumpFilter = this.ctx.createBiquadFilter();
      lpThumpFilter.type = 'lowpass';
      lpThumpFilter.frequency.setValueAtTime(250, now);

      const thumpGain = this.ctx.createGain();
      thumpGain.gain.setValueAtTime(0.15, now);
      thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      oscThump.connect(lpThumpFilter);
      lpThumpFilter.connect(thumpGain);
      thumpGain.connect(sessionGain);

      const groupGain = this.ctx.createGain();
      groupGain.gain.setValueAtTime(0, now);
      groupGain.gain.linearRampToValueAtTime(0.24, now + 0.002);
      groupGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      oscF.connect(groupGain);
      groupGain.connect(sessionGain);

      oscF.start(now);
      oscThump.start(now);

      const stopTime = now + 1.4;
      oscF.stop(stopTime);
      oscThump.stop(stopTime);

      const nodeRef = { oscs: [oscF, oscThump], gain: groupGain };
      this.synthNodes.push(nodeRef);
      setTimeout(() => {
        if (this.ctx) {
          this.synthNodes = this.synthNodes.filter((n) => n !== nodeRef);
        }
      }, 1600);
    }
  }
}
