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
}

export const soundFx = new MotorsportAudioEngine();
