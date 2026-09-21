"""
Synthesizes dramatic cinematic sound effects:
1. cinematic_braam.wav - Deep aggressive sub-bass brass/braam impact
2. f1_engine_whoosh.wav - High-speed F1 turbo-hybrid flyby whoosh
"""

import numpy as np
import soundfile as sf
import scipy.signal as signal
import os

sr = 44100

def create_braam(out_path):
    dur = 3.0
    t = np.linspace(0, dur, int(sr * dur), False)
    # Fundamental pitch drop: 75Hz -> 42Hz
    freq = np.exp(np.linspace(np.log(75), np.log(42), len(t)))
    phase = 2 * np.pi * np.cumsum(freq) / sr
    
    # Rich harmonics
    saw = signal.sawtooth(phase)
    sub = np.sin(phase * 0.5)
    harm = 0.5 * signal.square(phase * 2)
    
    raw = 0.5 * saw + 0.35 * sub + 0.15 * harm
    # Lowpass filter sweep
    b, a = signal.butter(4, [60 / (sr / 2), 650 / (sr / 2)], btype='band')
    filtered = signal.lfilter(b, a, raw)
    
    # Distortion / saturation
    dist = np.tanh(filtered * 3.5)
    
    # Envelope: Instant attack, slow exponential decay
    env = np.exp(-t * 1.2)
    sound = dist * env
    sound = (sound / np.max(np.abs(sound))) * 0.9
    sf.write(out_path, sound, sr)
    print(f"Created braam -> {out_path}")

def create_f1_whoosh(out_path):
    dur = 2.0
    t = np.linspace(0, dur, int(sr * dur), False)
    # Doppler shift whoosh: 800Hz -> 1800Hz -> 400Hz
    freq = 600 + 1200 * np.exp(-((t - 0.7)**2) / 0.08)
    phase = 2 * np.pi * np.cumsum(freq) / sr
    
    # Turbo whine + engine roar
    engine = 0.4 * signal.sawtooth(phase) + 0.3 * np.sin(phase * 3)
    noise = np.random.normal(0, 0.25, len(t))
    
    raw = (engine + noise)
    b, a = signal.butter(2, [200 / (sr / 2), 3500 / (sr / 2)], btype='band')
    filtered = signal.lfilter(b, a, raw)
    
    # Envelope swell at t=0.7s
    env = np.exp(-((t - 0.7)**2) / 0.12)
    sound = filtered * env
    sound = (sound / np.max(np.abs(sound))) * 0.85
    sf.write(out_path, sound, sr)
    print(f"Created whoosh -> {out_path}")

if __name__ == "__main__":
    out_dir = "brag-output-cinematic/composition/assets/sfx"
    create_braam(os.path.join(out_dir, "cinematic_braam.wav"))
    create_f1_whoosh(os.path.join(out_dir, "f1_engine_whoosh.wav"))
