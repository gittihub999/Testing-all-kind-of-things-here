"""Voiceover: one line per beat, timed to fit, laid onto a 30s bed."""
import numpy as np, wave, os, io
from piper import PiperVoice, SynthesisConfig

SR = 48000
DUR = 36.0
OUT = os.path.dirname(os.path.abspath(__file__))
voice = PiperVoice.load('/tmp/voices/en_US-ryan-high.onnx')

LINES = [
    (0.45,  3.70, "Naming your startup? You'll check a hundred domains tonight."),
    (4.35,  7.55, "And every good dot com is already gone. Right?"),
    (8.55, 11.60, "Zero Taken flips it. Every name it gives you is available."),
    (12.45, 17.55, "Describe your idea in plain words. The A.I. writes the names and checks them as it goes."),
    (18.45, 21.55, "Hundreds of extensions, checked live at the registry."),
    (22.45, 25.55, "Each one scored for brandability, before you spend a cent."),
    (26.45, 29.55, "One founder found a thirty thousand dollar name for twelve."),
    (30.60, 35.20, "Zero Taken dot com. Free to search. Your name is still out there."),
]

def synth(text, length_scale):
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        voice.synthesize_wav(text, w, SynthesisConfig(length_scale=length_scale,
                                                      noise_scale=0.60,
                                                      noise_w_scale=0.75,
                                                      volume=1.0))
    buf.seek(0)
    with wave.open(buf, 'rb') as w:
        sr = w.getframerate()
        a = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float64) / 32768.0
    return a, sr

def resample(a, src, dst):
    if src == dst: return a
    n = int(round(len(a) * dst / src))
    return np.interp(np.linspace(0, len(a) - 1, n), np.arange(len(a)), a)

def trim(a, sr, thr=0.008):
    idx = np.where(np.abs(a) > thr)[0]
    if len(idx) == 0: return a
    s = max(0, idx[0] - int(0.02 * sr))
    e = min(len(a), idx[-1] + int(0.06 * sr))
    return a[s:e]

bed = np.zeros(int(SR * DUR))
report = []
for (t0, t1, text) in LINES:
    budget = t1 - t0
    ls = 1.08
    for _ in range(6):
        a, sr = synth(text, ls)
        a = trim(a, sr)
        d = len(a) / sr
        if d <= budget:
            break
        ls = max(0.93, ls * max(0.93, (budget / d) * 0.99))
    a = resample(a, sr, SR)
    f = int(0.02 * SR)
    a[:f] *= np.linspace(0, 1, f); a[-f:] *= np.linspace(1, 0, f)
    i0 = int(t0 * SR)
    n = min(len(a), len(bed) - i0)
    bed[i0:i0 + n] += a[:n]
    over = (len(a) / SR) - budget
    if over > 0.02:
        print('  !! OVERRUNS BY %.2fs: %s' % (over, text))
    report.append((t0, t0 + len(a) / SR, round(ls, 3), text))

def biquad(x, b, a):
    y = np.zeros_like(x); x1 = x2 = y1 = y2 = 0.0
    for i in range(len(x)):
        v = b[0]*x[i] + b[1]*x1 + b[2]*x2 - a[1]*y1 - a[2]*y2
        x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v
    return y
def highshelf(x, f0, gain_db, q=0.707):
    A = 10 ** (gain_db / 40); w0 = 2*np.pi*f0/SR
    alpha = np.sin(w0)/(2*q); c = np.cos(w0); s2 = 2*np.sqrt(A)*alpha
    b0 =    A*((A+1) + (A-1)*c + s2); b1 = -2*A*((A-1) + (A+1)*c)
    b2 =    A*((A+1) + (A-1)*c - s2); a0 =    (A+1) - (A-1)*c + s2
    a1 =    2*((A-1) - (A+1)*c);      a2 =    (A+1) - (A-1)*c - s2
    return biquad(x, [b0/a0, b1/a0, b2/a0], [1.0, a1/a0, a2/a0])
def highpass(x, f0, q=0.707):
    w0 = 2*np.pi*f0/SR; alpha = np.sin(w0)/(2*q); c = np.cos(w0)
    b0 = (1+c)/2; b1 = -(1+c); b2 = b0
    a0 = 1+alpha; a1 = -2*c; a2 = 1-alpha
    return biquad(x, [b0/a0, b1/a0, b2/a0], [1.0, a1/a0, a2/a0])

bed = highpass(bed, 85.0)
bed = highshelf(bed, 4200.0, 3.5)
bed = np.tanh(bed * 1.35) * 0.80
m = np.abs(bed).max()
if m > 0: bed = bed / m * 0.95
with wave.open(os.path.join(OUT, 'vo.wav'), 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(bed, -1, 1) * 32767).astype('<i2').tobytes())

env = np.zeros(len(bed))
for (s, e, ls, txt) in report:
    i0 = max(0, int((s - 0.25) * SR)); i1 = min(len(env), int((e + 0.30) * SR))
    env[i0:i1] = 1.0
k = int(0.18 * SR)
env = np.convolve(env, np.ones(k) / k, mode='same')
np.save(os.path.join(OUT, 'duck.npy'), env.astype(np.float32))

for (s, e, ls, txt) in report:
    print('%5.2f -> %5.2f  ls=%.2f  %s' % (s, e, ls, txt))
