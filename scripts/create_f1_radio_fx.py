"""
Applies an authentic Formula 1 Pit-to-Car Radio filter to voice lines.
Adds:
1. 2.4kHz radio opening tone beep
2. Bandpass filtering (300Hz - 3400Hz telephone/walkie-talkie spectrum)
3. Radio distortion / saturation
4. Ambient RF static noise
5. Radio squelch / closing click
"""

import numpy as np
import soundfile as sf
import scipy.signal as signal
import os

def f1_radio_filter(input_wav_path, output_wav_path):
    data, sr = sf.read(input_wav_path)
    if data.ndim > 1:
        data = data.mean(axis=1) # convert to mono
    
    # 1. Bandpass filter: 350 Hz to 3200 Hz
    b, a = signal.butter(4, [350 / (sr / 2), 3200 / (sr / 2)], btype='band')
    filtered = signal.lfilter(b, a, data)
    
    # 2. Add subtle harmonic saturation
    distorted = np.tanh(filtered * 2.2) * 0.75
    
    # 3. Add low-level radio hiss / static
    noise = np.random.normal(0, 0.008, len(distorted))
    b_noise, a_noise = signal.butter(2, [400 / (sr / 2), 3000 / (sr / 2)], btype='band')
    filtered_noise = signal.lfilter(b_noise, a_noise, noise)
    
    radio_voice = distorted + filtered_noise
    
    # 4. Generate radio intro beep (2150 Hz tone, 45ms)
    beep_len = int(sr * 0.05)
    t_beep = np.linspace(0, 0.05, beep_len, False)
    intro_beep = 0.25 * np.sin(2 * np.pi * 2150 * t_beep) * np.hanning(beep_len)
    
    # 5. Generate outro radio squelch/click (15ms white noise burst)
    squelch_len = int(sr * 0.03)
    outro_squelch = np.random.normal(0, 0.2, squelch_len) * np.hanning(squelch_len)
    
    # Concatenate with brief padding
    silence_gap = np.zeros(int(sr * 0.04))
    combined = np.concatenate([intro_beep, silence_gap, radio_voice, silence_gap, outro_squelch])
    
    # Normalize peak
    max_val = np.max(np.abs(combined))
    if max_val > 0:
        combined = (combined / max_val) * 0.85
        
    sf.write(output_wav_path, combined, sr)
    print(f"Processed radio voice -> {output_wav_path}")

if __name__ == "__main__":
    voice_dir = "brag-output-cinematic/composition/assets/voice"
    for i in [1, 2, 3]:
        raw_p = os.path.join(voice_dir, f"raw_voice{i}.wav")
        out_p = os.path.join(voice_dir, f"radio_voice{i}.wav")
        if os.path.exists(raw_p):
            f1_radio_filter(raw_p, out_p)
