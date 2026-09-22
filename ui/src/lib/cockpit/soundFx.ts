"use client";

/**
 * Tactical Motorsport Web Audio Sound FX Engine
 * Synthesizes zero-latency physical cockpit audio:
 * - Rotary switch ratchet clicks
 * - Pushbutton tactile relay snaps
 * - Team radio squelch & open chirps
 * - DRS activation tones
 * - Shift light / Pit limiter alarms
 */

class MotorsportAudioEngine {
  private ctx: AudioContext | null = null;
  public enabled = true;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private turboOsc: OscillatorNode | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  /** Machined titanium rotary detent click */
  playRotaryClick() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = "triangle";
      osc.frequency.setValueAtTime(640, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.025);
      
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(t);
      osc.stop(t + 0.025);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /** CNC Tactile push-button switch click */
  playButtonClick() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(420, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.03);
      
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(t);
      osc.stop(t + 0.03);
    } catch {
      // Ignore
    }
  }

  /** Pneumatic Gear Shift Clack + Ignition Cut */
  playGearShift(isUpshift = true) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      // Pneumatic actuator pop
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      const startF = isUpshift ? 380 : 520;
      const endF = isUpshift ? 120 : 220;
      osc.frequency.setValueAtTime(startF, t);
      osc.frequency.exponentialRampToValueAtTime(endF, t + 0.04);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.045);

      // Metal dog-ring mesh click
      const clickOsc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      clickOsc.type = "square";
      clickOsc.frequency.setValueAtTime(1400, t + 0.01);
      clickOsc.frequency.exponentialRampToValueAtTime(300, t + 0.035);

      clickGain.gain.setValueAtTime(0.12, t + 0.01);
      clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

      clickOsc.connect(clickGain);
      clickGain.connect(this.ctx.destination);
      clickOsc.start(t + 0.01);
      clickOsc.stop(t + 0.035);
    } catch {
      // Ignore
    }
  }

  /** DRS pneumatic flap open / ready chime */
  playDrsTone(active: boolean) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = "sine";
      const f1 = active ? 880 : 1320;
      const f2 = active ? 1760 : 660;
      osc.frequency.setValueAtTime(f1, t);
      osc.frequency.exponentialRampToValueAtTime(f2, t + 0.06);
      
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(t);
      osc.stop(t + 0.08);
    } catch {
      // Ignore
    }
  }

  /** Team radio static squelch beep */
  playRadioBeep() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      // Dual tone radio roger beep
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(1046, t); // C6
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1318, t + 0.05); // E6
      
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc1.start(t);
      osc1.stop(t + 0.06);
      osc2.start(t + 0.05);
      osc2.stop(t + 0.14);
    } catch {
      // Ignore
    }
  }

  /** Race Engineer Voice Synthesizer with Radio Static */
  speakRadio(message: string) {
    this.playRadioBeep();
    if (!this.enabled || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1.05;
      utterance.pitch = 0.92;
      utterance.volume = 0.85;

      const voices = window.speechSynthesis.getVoices();
      const engVoice = voices.find((v) => v.lang.startsWith("en") && (v.name.includes("Male") || v.name.includes("UK") || v.name.includes("Natural")));
      if (engVoice) {
        utterance.voice = engVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // Fallback
    }
  }

  /** Pit limiter pulsed alarm tone */
  playPitLimiterPulse() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = "square";
      osc.frequency.setValueAtTime(980, t);
      
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(t);
      osc.stop(t + 0.04);
    } catch {
      // Ignore
    }
  }

  /** Dynamic V6 Turbo-Hybrid Engine RPM Synthesizer */
  setEngineRpm(rpm: number, throttle = 1.0) {
    if (!this.enabled) {
      this.stopEngine();
      return;
    }

    try {
      this.initCtx();
      if (!this.ctx) return;

      if (!this.engineOsc) {
        this.engineOsc = this.ctx.createOscillator();
        this.engineGain = this.ctx.createGain();
        this.turboOsc = this.ctx.createOscillator();

        this.engineOsc.type = "sawtooth";
        this.turboOsc.type = "sine";

        this.engineGain.gain.setValueAtTime(0.06, this.ctx.currentTime);

        this.engineOsc.connect(this.engineGain);
        this.turboOsc.connect(this.engineGain);
        this.engineGain.connect(this.ctx.destination);

        this.engineOsc.start();
        this.turboOsc.start();
      }

      const t = this.ctx.currentTime;
      // Formula 1 1.6L V6 Turbo: 3 cylinder combustion cycles per revolution
      const fundamentalHz = Math.max(60, (rpm / 60) * 3);
      const turboWhineHz = Math.max(800, (rpm / 60) * 18);

      if (this.engineOsc) {
        this.engineOsc.frequency.setTargetAtTime(fundamentalHz, t, 0.03);
      }
      if (this.turboOsc) {
        this.turboOsc.frequency.setTargetAtTime(turboWhineHz, t, 0.03);
      }

      const vol = Math.min(0.12, Math.max(0.02, 0.03 + throttle * 0.08));
      this.engineGain?.gain.setTargetAtTime(vol, t, 0.04);
    } catch {
      // Ignore
    }
  }

  /** Stop continuous engine sound */
  stopEngine() {
    if (this.engineGain && this.ctx) {
      try {
        this.engineGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
        setTimeout(() => {
          if (this.engineOsc) {
            try {
              this.engineOsc.stop();
              this.turboOsc?.stop();
              this.engineOsc.disconnect();
              this.turboOsc?.disconnect();
            } catch {}
            this.engineOsc = null;
            this.turboOsc = null;
            this.engineGain = null;
          }
        }, 80);
      } catch {}
    }
  }
}

export const soundFx = new MotorsportAudioEngine();
