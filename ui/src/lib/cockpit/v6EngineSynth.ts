"use client";

/**
 * APX-IQ Procedural V6 Turbo-Hybrid Web Audio Synthesizer
 * Pure Web Audio API harmonic engine audio without external audio sample dependencies.
 *
 * Layers:
 *  1. ICE (Internal Combustion Engine): Sawtooth fundamental with harmonic distortion
 *  2. Turbocharger: High-frequency sine wave with exponential spool on throttle
 *  3. MGU-K: Dual-tone electrical regeneration whine on braking
 *  4. Downshift / Exhaust: Transient noise burst on gear change
 */

class V6EngineSynthesizer {
  private ctx: AudioContext | null = null;
  private isRunning: boolean = false;
  public enabled: boolean = false;

  // Audio Nodes
  private masterGain: GainNode | null = null;
  private iceOsc: OscillatorNode | null = null;
  private iceSubOsc: OscillatorNode | null = null;
  private iceGain: GainNode | null = null;
  private iceFilter: BiquadFilterNode | null = null;

  private turboOsc: OscillatorNode | null = null;
  private turboGain: GainNode | null = null;

  private mgukOsc: OscillatorNode | null = null;
  private mgukGain: GainNode | null = null;

  private currentRpm: number = 5000;
  private currentGear: number | string = 1;

  private init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // ── 1. ICE (Internal Combustion Engine) ──
      this.iceOsc = this.ctx.createOscillator();
      this.iceOsc.type = "sawtooth";

      this.iceSubOsc = this.ctx.createOscillator();
      this.iceSubOsc.type = "triangle";

      this.iceFilter = this.ctx.createBiquadFilter();
      this.iceFilter.type = "lowpass";
      this.iceFilter.frequency.setValueAtTime(2400, this.ctx.currentTime);
      this.iceFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);

      this.iceGain = this.ctx.createGain();
      this.iceGain.gain.setValueAtTime(0.6, this.ctx.currentTime);

      this.iceOsc.connect(this.iceFilter);
      this.iceSubOsc.connect(this.iceFilter);
      this.iceFilter.connect(this.iceGain);
      this.iceGain.connect(this.masterGain);

      // ── 2. Turbocharger Spool ──
      this.turboOsc = this.ctx.createOscillator();
      this.turboOsc.type = "sine";
      this.turboGain = this.ctx.createGain();
      this.turboGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

      this.turboOsc.connect(this.turboGain);
      this.turboGain.connect(this.masterGain);

      // ── 3. MGU-K Electrical Whine ──
      this.mgukOsc = this.ctx.createOscillator();
      this.mgukOsc.type = "sine";
      this.mgukGain = this.ctx.createGain();
      this.mgukGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

      this.mgukOsc.connect(this.mgukGain);
      this.mgukGain.connect(this.masterGain);

      // Start Oscillators
      this.iceOsc.start();
      this.iceSubOsc.start();
      this.turboOsc.start();
      this.mgukOsc.start();

      this.isRunning = true;
    } catch {
      // AudioContext fallback
    }
  }

  public setTelemetry(rpm: number, throttle: number = 0, brake: number = 0, gear: number | string = 1) {
    if (!this.enabled) return;
    if (!this.ctx || !this.isRunning) {
      this.init();
    }
    if (!this.ctx || !this.iceOsc || !this.iceGain || !this.turboOsc || !this.turboGain || !this.mgukOsc || !this.mgukGain) return;

    // Trigger gearshift pop if gear changed
    if (gear !== this.currentGear && gear !== "N") {
      this.playGearshiftPop();
      this.currentGear = gear;
    }

    this.currentRpm = Math.max(3000, Math.min(13000, rpm));
    const now = this.ctx.currentTime;

    // ICE fundamental: F1 V6 = 3 cylinders firing per revolution = (RPM / 60) * 3 Hz
    const fundamentalFreq = (this.currentRpm / 60) * 3;
    this.iceOsc.frequency.setTargetAtTime(fundamentalFreq, now, 0.04);
    this.iceSubOsc?.frequency.setTargetAtTime(fundamentalFreq * 0.5, now, 0.04);

    // Throttle modulates volume & filter brightness
    const loadGain = 0.2 + (throttle / 100) * 0.8;
    this.iceGain.gain.setTargetAtTime(loadGain * 0.7, now, 0.05);
    if (this.iceFilter) {
      this.iceFilter.frequency.setTargetAtTime(1200 + (throttle / 100) * 3500, now, 0.05);
    }

    // Turbo spool: Exponential high pitch when throttle > 30%
    if (throttle > 25) {
      const turboPitch = 2200 + (throttle / 100) * 4500 + (this.currentRpm / 13000) * 2000;
      this.turboOsc.frequency.setTargetAtTime(turboPitch, now, 0.08);
      this.turboGain.gain.setTargetAtTime((throttle / 100) * 0.15, now, 0.08);
    } else {
      this.turboGain.gain.setTargetAtTime(0.0, now, 0.1);
    }

    // MGU-K Whine: High-pitch harmonic when braking
    if (brake > 10) {
      const mgukPitch = 1400 + (brake / 100) * 2800;
      this.mgukOsc.frequency.setTargetAtTime(mgukPitch, now, 0.06);
      this.mgukGain.gain.setTargetAtTime((brake / 100) * 0.22, now, 0.06);
    } else {
      this.mgukGain.gain.setTargetAtTime(0.0, now, 0.1);
    }
  }

  public playGearshiftPop() {
    if (!this.ctx || !this.enabled) return;
    try {
      const now = this.ctx.currentTime;
      // White noise pop
      const bufferSize = this.ctx.sampleRate * 0.04;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(800, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      noise.start(now);
    } catch {
      // Audio fallback
    }
  }

  public stop() {
    if (this.iceGain && this.ctx) {
      this.iceGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
    if (this.turboGain && this.ctx) {
      this.turboGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
    if (this.mgukGain && this.ctx) {
      this.mgukGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
  }
}

export const v6EngineSynth = new V6EngineSynthesizer();
