"""Voiceover.

en_GB-alan-medium reads at ~130 wpm unstretched, so the pace comes from the
voice rather than from slowing a fast one down. Each line is synthesised
phrase by phrase with real silences between the phrases, which is what makes
a read sound considered instead of hurried.
"""
import numpy as np, wave, os, io
from piper import PiperVoice, SynthesisConfig

SR = 48000
DUR = 46.0
LS = 1.10                       # ~124 wpm
OUT = os.path.dirname(os.path.abspath(__file__))
voice = PiperVoice.load('/tmp/voices/en_GB-alan-medium.onnx')

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
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        voice.synthesize_wav(text, w, SynthesisConfig(
            length_scale=LS, noise_scale=0.62, noise_w_scale=0.80, volume=1.0))
    buf.seek(0)
    with wave.open(buf, 'rb') as w:
        sr = w.getframerate()
        a = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float64) / 32768.0
    return a, sr

def trim(a, sr, thr=0.006):
    idx = np.where(np.abs(a) > thr)[0]
    if len(idx) == 0: return a
    return a[max(0, idx[0] - int(0.015 * sr)):min(len(a), idx[-1] + int(0.05 * sr))]

def resample(a, src, dst):
    if src == dst: return a
    n = int(round(len(a) * dst / src))
    return np.interp(np.linspace(0, len(a) - 1, n), np.arange(len(a)), a)

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
        f = int(0.012 * SR)
        a[:f] *= np.linspace(0, 1, f); a[-f:] *= np.linspace(1, 0, f)
        pieces.append(a)
    line = np.concatenate(pieces)
    i0 = int(t0 * SR)
    n = min(len(line), len(bed) - i0)
    bed[i0:i0 + n] += line[:n]
    end = t0 + len(line) / SR
    slack = BEAT_END[bi] - end
    report.append((t0, end, slack, ' / '.join(p for p in parts if isinstance(p, str))))

# ---- polish: high-pass, presence, gentle compression, a small room ---------
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
def compress(x, thr=0.16, ratio=3.2, atk=0.006, rel=0.16):
    env = np.zeros_like(x); e = 0.0
    ca = np.exp(-1/(atk*SR)); cr = np.exp(-1/(rel*SR))
    ax = np.abs(x)
    for i in range(len(x)):
        c = ca if ax[i] > e else cr
        e = c*e + (1-c)*ax[i]
        env[i] = e
    g = np.ones_like(x)
    over = env > thr
    g[over] = (thr + (env[over]-thr)/ratio) / env[over]
    return x * g

bed = highpass(bed, 90.0)
bed = highshelf(bed, 4000.0, 2.5)
bed = compress(bed) * 1.5

room = np.random.RandomState(7).uniform(-1, 1, int(0.30*SR))
room *= np.exp(-np.arange(len(room))/SR * 16)
room[:int(0.006*SR)] = 0
room /= np.abs(room).max()
def conv(x, ir):
    n = len(x)+len(ir)-1; M = 1 << int(np.ceil(np.log2(n)))
    return np.fft.irfft(np.fft.rfft(x, M)*np.fft.rfft(ir, M), M)[:len(x)]
bed = bed + conv(bed, room) * 0.10

bed = np.tanh(bed * 1.05) * 0.92
bed /= (np.abs(bed).max() + 1e-9); bed *= 0.95
with wave.open(os.path.join(OUT, 'vo.wav'), 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(bed, -1, 1) * 32767).astype('<i2').tobytes())

# ducking envelope for the music — slow, so the bed never pumps
env = np.zeros(len(bed))
for (s, e, slack, txt) in report:
    env[max(0, int((s-0.45)*SR)):min(len(env), int((e+0.55)*SR))] = 1.0
k = int(0.42 * SR)
env = np.convolve(env, np.hanning(k)/np.hanning(k).sum(), mode='same')
np.save(os.path.join(OUT, 'duck.npy'), env.astype(np.float32))

wc = sum(len(t.replace(' / ', ' ').split()) for _, _, _, t in report)
spoken = sum(e - s for s, e, _, _ in report)
print('%d words · %.1fs of speech in %.0fs · %.0f wpm while speaking' % (wc, spoken, DUR, wc/spoken*60))
for (s, e, slack, txt) in report:
    flag = '  <-- TIGHT' if slack < 0.35 else ''
    print('%6.2f -> %6.2f  slack %5.2fs   %s%s' % (s, e, slack, txt, flag))
