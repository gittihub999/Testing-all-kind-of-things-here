"""Voiceover.

Kokoro-82M (Apache-2.0) rather than Piper: markedly more natural, and
`am_michael` reads at ~115 wpm unstretched so the pace comes from the voice.

Deliberately DRY — no reverb. A room on a promo read is what makes it sound
processed and artificial; the music carries the space instead. Processing is
one high-pass, a small presence shelf and gentle levelling, with no
saturation stage.
"""
import numpy as np, wave, os
from kokoro_onnx import Kokoro

SR = 48000
DUR = 46.0
VOICE = os.environ.get('VO_VOICE', 'am_michael')
SPEED = float(os.environ.get('VO_SPEED', '1.0'))
OUT = os.path.dirname(os.path.abspath(__file__))
kok = Kokoro('/tmp/kokoro/kokoro-v1.0.onnx', '/tmp/kokoro/voices-v1.0.bin')

# (start, [phrase | pause_in_seconds, ...])  — one entry per beat
LINES = [
    (0.70,  ["Naming your startup?"]),
    (4.55,  ["Every good dot com is gone."]),
    (8.40,  ["The free ones?", 0.34, "Premium priced."]),
    (12.65, ["ZeroTaken.", 0.40, "Only names you can actually register."]),
    (18.60, ["Describe your idea.", 0.32, "The A.I. writes the names."]),
    (24.50, ["Two hundred forty extensions."]),
    (28.60, ["Every name scored for brandability."]),
    (32.60, ["And the handle, everywhere."]),
    (36.60, ["Searches never leave your browser."]),
    (40.70, ["ZeroTaken dot com.", 0.38, "Free to search."]),
]
BEAT_END = [4.0, 8.0, 12.0, 18.0, 24.0, 28.0, 32.0, 36.0, 40.0, 46.0]

def synth(text):
    a, sr = kok.create(text, voice=VOICE, speed=SPEED,
                       lang='en-gb' if VOICE[0] == 'b' else 'en-us')
    return np.asarray(a, dtype=np.float64), sr

def resample(a, src, dst):
    if src == dst: return a
    n = int(round(len(a) * dst / src))
    return np.interp(np.linspace(0, len(a) - 1, n), np.arange(len(a)), a)

def trim(a, sr, thr=0.010):
    idx = np.where(np.abs(a) > thr)[0]
    if len(idx) == 0: return a
    return a[max(0, idx[0] - int(0.020 * sr)):min(len(a), idx[-1] + int(0.060 * sr))]

bed = np.zeros(int(SR * DUR))
report = []
for bi, (t0, parts) in enumerate(LINES):
    pieces = []
    for part in parts:
        if isinstance(part, (int, float)):
            pieces.append(np.zeros(int(part * SR)))
            continue
        a, sr = synth(part)
        a = resample(trim(a, sr), sr, SR)
        f = int(0.010 * SR)
        a[:f] *= np.linspace(0, 1, f); a[-f:] *= np.linspace(1, 0, f)
        pieces.append(a)
    line = np.concatenate(pieces)
    i0 = int(t0 * SR)
    n = min(len(line), len(bed) - i0)
    bed[i0:i0 + n] += line[:n]
    end = t0 + len(line) / SR
    report.append((t0, end, BEAT_END[bi] - end, ' / '.join(p for p in parts if isinstance(p, str))))

# ---------------- processing: minimal, and dry -----------------------------
def biquad(x, b, a):
    y = np.zeros_like(x); x1 = x2 = y1 = y2 = 0.0
    for i in range(len(x)):
        v = b[0]*x[i] + b[1]*x1 + b[2]*x2 - a[1]*y1 - a[2]*y2
        x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v
    return y
def highpass(x, f0, q=0.707):
    w0 = 2*np.pi*f0/SR; al = np.sin(w0)/(2*q); c = np.cos(w0)
    b0 = (1+c)/2; b1 = -(1+c); b2 = b0; a0 = 1+al; a1 = -2*c; a2 = 1-al
    return biquad(x, [b0/a0, b1/a0, b2/a0], [1.0, a1/a0, a2/a0])
def highshelf(x, f0, gain_db, q=0.707):
    A = 10 ** (gain_db/40); w0 = 2*np.pi*f0/SR
    al = np.sin(w0)/(2*q); c = np.cos(w0); s2 = 2*np.sqrt(A)*al
    b0 = A*((A+1) + (A-1)*c + s2); b1 = -2*A*((A-1) + (A+1)*c)
    b2 = A*((A+1) + (A-1)*c - s2); a0 = (A+1) - (A-1)*c + s2
    a1 = 2*((A-1) - (A+1)*c);      a2 = (A+1) - (A-1)*c - s2
    return biquad(x, [b0/a0, b1/a0, b2/a0], [1.0, a1/a0, a2/a0])
def level(x, thr=0.28, ratio=2.2, atk=0.010, rel=0.22):
    """Gentle levelling only — no limiting, no saturation."""
    e = 0.0; env = np.zeros_like(x)
    ca = np.exp(-1/(atk*SR)); cr = np.exp(-1/(rel*SR)); ax = np.abs(x)
    for i in range(len(x)):
        c = ca if ax[i] > e else cr
        e = c*e + (1-c)*ax[i]; env[i] = e
    g = np.ones_like(x)
    over = env > thr
    g[over] = (thr + (env[over]-thr)/ratio) / env[over]
    return x * g

bed = highpass(bed, 80.0)
bed = highshelf(bed, 4500.0, 2.0)
peak = np.abs(bed).max()
if peak > 0: bed = bed / peak * 0.80
bed = level(bed)
peak = np.abs(bed).max()
if peak > 0: bed = bed / peak * 0.95

with wave.open(os.path.join(OUT, 'vo.wav'), 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(bed, -1, 1) * 32767).astype('<i2').tobytes())

env = np.zeros(len(bed))
for (s, e, slack, txt) in report:
    env[max(0, int((s-0.45)*SR)):min(len(env), int((e+0.55)*SR))] = 1.0
k = int(0.42 * SR)
env = np.convolve(env, np.hanning(k)/np.hanning(k).sum(), mode='same')
np.save(os.path.join(OUT, 'duck.npy'), env.astype(np.float32))

wc = sum(len(t.replace(' / ', ' ').split()) for _, _, _, t in report)
spoken = sum(e - s for s, e, _, _ in report)
print('voice=%s speed=%.2f  ·  %d words · %.1fs of speech in %.0fs · %.0f wpm while speaking'
      % (VOICE, SPEED, wc, spoken, DUR, wc/spoken*60))
for (s, e, slack, txt) in report:
    print('%6.2f -> %6.2f  slack %5.2fs   %s%s' % (s, e, slack, txt, '  <-- TIGHT' if slack < 0.3 else ''))
