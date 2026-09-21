"""
Generates an aggressive, high-octane 128 BPM Dark Cyberpunk / F1 Trailer soundtrack in D-Minor.
Replaces generic stock music with a custom Hans Zimmer / Cyberpunk style electronic trailer score.
"""

import numpy as np
import soundfile as sf
import scipy.signal as signal
import os

sr = 44100
bpm = 128
beat_sec = 60.0 / bpm
total_duration = 26.5
total_samples = int(sr * total_duration)

def create_f1_trailer_soundtrack(output_path):
    t = np.linspace(0, total_duration, total_samples, False)
    mix = np.zeros(total_samples)
    
    # ── 1. DRUMS (Punchy Kick, Snare, Hi-Hats) ─────────────────────────────
    # Kick drum synthesizer (120Hz -> 45Hz exponential pitch sweep)
    kick_len = int(sr * 0.35)
    t_k = np.linspace(0, 0.35, kick_len, False)
    k_pitch = 45 + 95 * np.exp(-t_k * 24)
    k_phase = 2 * np.pi * np.cumsum(k_pitch) / sr
    kick_body = np.sin(k_phase) * np.exp(-t_k * 8)
    kick_click = np.sin(2 * np.pi * 1800 * t_k) * np.exp(-t_k * 80) * 0.4
    kick = (kick_body + kick_click) * 0.95
    
    # Snare / Clap (Tone + Filtered Noise)
    snare_len = int(sr * 0.3)
    t_s = np.linspace(0, 0.3, snare_len, False)
    s_tone = np.sin(2 * np.pi * 190 * t_s) * np.exp(-t_s * 15) * 0.4
    s_noise = np.random.normal(0, 0.4, snare_len) * np.exp(-t_s * 9)
    b_s, a_s = signal.butter(2, [800 / (sr/2), 6000 / (sr/2)], btype='band')
    s_noise = signal.lfilter(b_s, a_s, s_noise)
    snare = (s_tone + s_noise) * 0.8
    
    # Place drums along 128 BPM grid (Starts building at 4.6s to 25.0s)
    drum_track = np.zeros(total_samples)
    num_beats = int(total_duration / beat_sec)
    
    for beat_idx in range(num_beats):
        beat_t = beat_idx * beat_sec
        sample_idx = int(beat_t * sr)
        
        # Kicks on every beat from 4.7s onwards
        if beat_t >= 4.6 and beat_t <= 24.2:
            if sample_idx + kick_len < total_samples:
                drum_track[sample_idx:sample_idx+kick_len] += kick * 0.85
                
        # Snares on beats 2 & 4 from 5.1s onwards
        if beat_t >= 5.0 and beat_t <= 24.0 and (beat_idx % 2 == 1):
            if sample_idx + snare_len < total_samples:
                drum_track[sample_idx:sample_idx+snare_len] += snare * 0.75
                
        # 16th-note Hi-Hats
        if beat_t >= 5.0 and beat_t <= 24.0:
            for sub in range(4):
                hat_idx = sample_idx + int(sub * (beat_sec / 4) * sr)
                hat_len = int(sr * 0.05)
                if hat_idx + hat_len < total_samples:
                    hat = np.random.normal(0, 0.15, hat_len) * np.exp(-np.linspace(0, 0.05, hat_len) * 60)
                    drum_track[hat_idx:hat_idx+hat_len] += hat * (0.35 if sub % 2 == 0 else 0.2)

    # ── 2. ROLLING 16TH-NOTE BASS ARPEGGIATOR (D Minor: D1, F1, G1, A1) ──
    bass_track = np.zeros(total_samples)
    notes_dmin = [36.71, 43.65, 49.00, 55.00] # D1, F1, G1, A1 frequencies
    sixteenth_sec = beat_sec / 4
    num_sixteenths = int(total_duration / sixteenth_sec)
    
    for i in range(num_sixteenths):
        note_t = i * sixteenth_sec
        if note_t >= 4.6 and note_t <= 24.5:
            note_idx = int(note_t * sr)
            freq = notes_dmin[i % len(notes_dmin)]
            note_samples = int(sr * sixteenth_sec * 0.9)
            if note_idx + note_samples < total_samples:
                t_n = np.linspace(0, sixteenth_sec * 0.9, note_samples, False)
                # Saw wave with low-pass filter
                saw = signal.sawtooth(2 * np.pi * freq * t_n)
                sub = np.sin(2 * np.pi * (freq * 0.5) * t_n)
                b_env = np.exp(-t_n * 16)
                note_wave = (saw * 0.6 + sub * 0.5) * b_env
                bass_track[note_idx:note_idx+note_samples] += note_wave * 0.55

    # Lowpass filter on Bass
    b_b, a_b = signal.butter(3, 450 / (sr/2), btype='low')
    bass_track = signal.lfilter(b_b, a_b, bass_track)

    # ── 3. AGGRESSIVE CYBERPUNK LEAD SYNTH (D Minor melodies) ─────────────
    lead_track = np.zeros(total_samples)
    lead_notes = [293.66, 349.23, 440.0, 523.25, 587.33, 440.0, 349.23, 329.63] # D4, F4, A4, C5, D5, A4, F4, E4
    
    for i in range(num_sixteenths):
        note_t = i * sixteenth_sec
        if note_t >= 9.8 and note_t <= 23.8:
            note_idx = int(note_t * sr)
            freq = lead_notes[i % len(lead_notes)]
            note_samples = int(sr * sixteenth_sec * 0.85)
            if note_idx + note_samples < total_samples:
                t_n = np.linspace(0, sixteenth_sec * 0.85, note_samples, False)
                # Square + Saw lead with decay
                sq = signal.square(2 * np.pi * freq * t_n, duty=0.3)
                saw = signal.sawtooth(2 * np.pi * (freq * 1.002) * t_n)
                env = np.exp(-t_n * 12)
                lead_wave = (sq * 0.35 + saw * 0.35) * env
                lead_track[note_idx:note_idx+note_samples] += lead_wave * 0.35

    # Bandpass on Lead
    b_l, a_l = signal.butter(2, [500 / (sr/2), 4500 / (sr/2)], btype='band')
    lead_track = signal.lfilter(b_l, a_l, lead_track)

    # ── 4. SUB-BASS DRONES, BRAAMS & RISERS ────────────────────────────────
    fx_track = np.zeros(total_samples)
    
    # Intro Drone (0.0s - 5.0s)
    drone_t = t[(t >= 0.0) & (t <= 5.0)]
    drone_wave = np.sin(2 * np.pi * 55 * drone_t) * (0.35 * np.exp(-drone_t * 0.3))
    fx_track[:len(drone_wave)] += drone_wave
    
    # Tension Riser leading into Scene 5 Title drop (18.5s - 20.6s)
    riser_dur = 2.1
    t_r = np.linspace(0, riser_dur, int(sr * riser_dur), False)
    riser_freq = np.exp(np.linspace(np.log(120), np.log(1400), len(t_r)))
    riser_phase = 2 * np.pi * np.cumsum(riser_freq) / sr
    riser_wave = np.sin(riser_phase) * np.linspace(0, 0.45, len(t_r))
    riser_start = int(18.5 * sr)
    if riser_start + len(riser_wave) < total_samples:
        fx_track[riser_start:riser_start+len(riser_wave)] += riser_wave

    # ── 5. FINAL MASTERING & LIMITING ─────────────────────────────────────
    mix = drum_track * 0.85 + bass_track * 0.9 + lead_track * 0.7 + fx_track * 0.75
    
    # Analog saturation / clipping curve
    mix = np.tanh(mix * 1.35)
    
    # Fade out at the end
    fade_len = int(sr * 1.5)
    mix[-fade_len:] *= np.linspace(1, 0, fade_len)
    
    # Normalize peak
    mix = (mix / np.max(np.abs(mix))) * 0.92
    
    sf.write(output_path, mix, sr)
    print(f"Generated Dark Cyberpunk F1 Soundtrack -> {output_path}")

if __name__ == "__main__":
    out_dir = "brag-output-cinematic/composition/assets/music"
    os.makedirs(out_dir, exist_ok=True)
    create_f1_trailer_soundtrack(os.path.join(out_dir, "f1_dark_synthwave_trailer.wav"))
