"""Day 2 voiceover.

Different voice from day 1 (af_heart), still female. As on day 1 the question
lines are checked for terminal pitch rise, because most phrasings make this
class of model fall at the end and read as a statement.
"""
import numpy as np, wave, os
from kokoro_onnx import Kokoro

SR = 48000
DUR = 36.0
VOICE = os.environ.get('VO_VOICE', 'af_bella')
SPEED = float(os.environ.get('VO_SPEED', '0.74'))
OUT = os.path.dirname(os.path.abspath(__file__))
kok = Kokoro('/tmp/kokoro/kokoro-v1.0.onnx', '/tmp/kokoro/voices-v1.0.bin')

LINES = [
    (0.62,  ["Found a domain you like?"]),
    (4.32,  ["One. Available at the real price.", 0.26, "Not the aftermarket ask."]),
    (10.55, ["Two. Memorable, right?", 0.30, "Short, sayable, spellable."]),
    (16.55, ["Three. Is the handle free everywhere?"]),
    (22.60, ["ZeroTaken checks all three.", 0.36, "Before it ever shows you a name."]),
    (30.65, ["ZeroTaken dot com.", 0.36, "Free to search."]),
]
BEAT_END = [4.0, 10.0, 16.0, 22.0, 30.0, 36.0]

def synth(text):
    a, sr = kok.create(text, voice=VOICE, speed=SPEED,
                       lang='en-gb' if VOICE[0] == 'b' else 'en-us')
    return np.asarray(a, dtype=np.float64), sr

def f0_track(x, sr, fmin=70, fmax=430, hop=0.010, win=0.045):
    n = int(win * sr); h = int(hop * sr)
    lo, hi = int(sr / fmax), int(sr / fmin)
    out = []
    for i in range(0, max(0, len(x) - n), h):
        seg = x[i:i + n] - x[i:i + n].mean()
        if np.sqrt((seg ** 2).mean()) < 0.012:
            out.append(0.0); continue
        seg = seg * np.hanning(n)
        c = np.correlate(seg, seg, 'full')[n - 1:]
        c[:lo] = 0
        hi2 = min(hi, len(c) - 2)
        k = int(np.argmax(c[:hi2]))
        if k <= lo or c[k] <= 0:
            out.append(0.0); continue
        a_, b_, c_ = c[k - 1], c[k], c[k + 1]
        d = (a_ - c_) / (2 * (a_ - 2 * b_ + c_) + 1e-12)
        out.append(sr / (k + d))
    return np.array(out)

def terminal_rise(x, sr, tail=0.42, hop=0.010):
    f = f0_track(x, sr, hop=hop)
    v = np.where(f > 0)[0]
    if len(v) < 8: return None
    fv = np.clip(f[v][-max(5, int(tail / hop)):], 60, 460)
    k = max(2, len(fv) // 3)
    return 12 * np.log2(np.median(fv[-k:]) / np.median(fv[:k]))

def resample(a, src, dst):
    if src == dst: return a
    n = int(round(len(a) * dst / src))
    return np.interp(np.linspace(0, len(a) - 1, n), np.arange(len(a)), a)

def trim(a, sr, thr=0.010):
    idx = np.where(np.abs(a) > thr)[0]
    if len(idx) == 0: return a
    return a[max(0, idx[0] - int(0.020 * sr)):min(len(a), idx[-1] + int(0.060 * sr))]

bed = np.zeros(int(SR * DUR)); report = []; questions = []
for bi, (t0, parts) in enumerate(LINES):
    pieces = []
    for part in parts:
        if isinstance(part, (int, float)):
            pieces.append(np.zeros(int(part * SR))); continue
        a, sr = synth(part)
        a = trim(a, sr)
        if part.rstrip().endswith('?'):
            questions.append((part, terminal_rise(a, sr)))
        a = resample(a, sr, SR)
        f = int(0.010 * SR)
        a[:f] *= np.linspace(0, 1, f); a[-f:] *= np.linspace(1, 0, f)
        pieces.append(a)
    line = np.concatenate(pieces)
    i0 = int(t0 * SR); n = min(len(line), len(bed) - i0)
    bed[i0:i0 + n] += line[:n]
    end = t0 + len(line) / SR
    report.append((t0, end, BEAT_END[bi] - end, ' / '.join(p for p in parts if isinstance(p, str))))

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
def highshelf(x, f0, gdb, q=0.707):
    A = 10**(gdb/40); w0 = 2*np.pi*f0/SR
    al = np.sin(w0)/(2*q); c = np.cos(w0); s2 = 2*np.sqrt(A)*al
    b0 = A*((A+1)+(A-1)*c+s2); b1 = -2*A*((A-1)+(A+1)*c)
    b2 = A*((A+1)+(A-1)*c-s2); a0 = (A+1)-(A-1)*c+s2
    a1 = 2*((A-1)-(A+1)*c);    a2 = (A+1)-(A-1)*c-s2
    return biquad(x, [b0/a0, b1/a0, b2/a0], [1.0, a1/a0, a2/a0])
def level(x, thr=0.28, ratio=2.2, atk=0.010, rel=0.22):
    e = 0.0; env = np.zeros_like(x)
    ca = np.exp(-1/(atk*SR)); cr = np.exp(-1/(rel*SR)); ax = np.abs(x)
    for i in range(len(x)):
        c = ca if ax[i] > e else cr
        e = c*e + (1-c)*ax[i]; env[i] = e
    g = np.ones_like(x); over = env > thr
    g[over] = (thr + (env[over]-thr)/ratio) / env[over]
    return x * g

bed = highpass(bed, 80.0)
bed = highshelf(bed, 4500.0, 2.0)
pk = np.abs(bed).max()
if pk > 0: bed = bed / pk * 0.80
bed = level(bed)
pk = np.abs(bed).max()
if pk > 0: bed = bed / pk * 0.95
with wave.open(os.path.join(OUT, 'day2_vo.wav'), 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(bed, -1, 1) * 32767).astype('<i2').tobytes())

env = np.zeros(len(bed))
for (s, e, slack, txt) in report:
    env[max(0, int((s-0.45)*SR)):min(len(env), int((e+0.55)*SR))] = 1.0
k = int(0.42 * SR)
env = np.convolve(env, np.hanning(k)/np.hanning(k).sum(), mode='same')
np.save(os.path.join(OUT, 'day2_duck.npy'), env.astype(np.float32))

wc = sum(len(t.replace(' / ', ' ').split()) for _, _, _, t in report)
spoken = sum(e - s for s, e, _, _ in report)
print('voice=%s speed=%.2f · %d words · %.1fs speech in %.0fs · %.0f wpm while speaking'
      % (VOICE, SPEED, wc, spoken, DUR, wc/spoken*60))
for (s, e, slack, txt) in report:
    print('%6.2f -> %6.2f  slack %5.2fs   %s%s' % (s, e, slack, txt, '  <-- TIGHT' if slack < 0.3 else ''))
print('question intonation:')
for (q, r) in questions:
    print('   %-42s %+5.1f st   %s' % (q, r if r is not None else -99,
          'rises' if (r or -9) > 0.5 else 'FLAT/FALLS — rephrase'))
