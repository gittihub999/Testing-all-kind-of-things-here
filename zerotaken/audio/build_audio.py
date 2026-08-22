"""ZeroTaken promo — score, SFX and voiceover.

Everything is synthesised here so the audio is deterministic and locked to the
edit: cuts sit on a 120 BPM bar grid (2.0s), and every hit below is written in
seconds against that grid.
"""
import numpy as np, wave, os, sys

SR = 48000
DUR = 36.0
N = int(SR * DUR)
T = np.arange(N) / SR
OUT = os.path.dirname(os.path.abspath(__file__))

BPM = 120.0
BEAT = 60.0 / BPM          # 0.5s
BAR = BEAT * 4             # 2.0s
CUTS = [0.0, 4.0, 8.0, 12.0, 18.0, 22.0, 26.0, 30.0, 36.0]

rs = np.random.RandomState(20260822)

# ---------------------------------------------------------------- helpers
def env(start, dur, attack=0.005, decay=None, hold=0.0, curve=3.0):
    """One amplitude envelope placed on the master timeline."""
    e = np.zeros(N)
    i0 = int(start * SR)
    n = int(dur * SR)
    if i0 >= N or n <= 0:
        return e
    n = min(n, N - i0)
    x = np.arange(n) / SR
    a = np.clip(x / max(attack, 1e-4), 0, 1)
    d = np.ones(n)
    if decay is None:
        decay = dur - attack - hold
    if decay > 0:
        past = np.clip((x - attack - hold) / decay, 0, 1)
        d = (1 - past) ** curve
    e[i0:i0 + n] = a * d
    return e

def place(buf, sig, start):
    i0 = int(start * SR)
    if i0 >= N: return
    n = min(len(sig), N - i0)
    if n <= 0: return
    buf[i0:i0 + n] += sig[:n]

def noise(n):
    return rs.uniform(-1, 1, n)

def onepole_lp(x, cutoff):
    """cutoff may be a scalar or per-sample array (Hz)."""
    c = np.atleast_1d(cutoff)
    if c.size == 1:
        a = np.exp(-2 * np.pi * float(c[0]) / SR)
        y = np.empty_like(x); acc = 0.0
        # vectorised one-pole via lfilter-style recurrence
        from math import isnan
        b = 1 - a
        for i in range(0, len(x), 1 << 16):          # chunked python loop
            blk = x[i:i + (1 << 16)]
            out = np.empty_like(blk)
            for j in range(len(blk)):
                acc = a * acc + b * blk[j]
                out[j] = acc
            y[i:i + len(blk)] = out
        return y
    a = np.exp(-2 * np.pi * np.clip(c, 20, SR / 2.2) / SR)
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)):
        acc = a[i] * acc + (1 - a[i]) * x[i]
        y[i] = acc
    return y

def biquad_lp(x, f0, q=0.707):
    """Fast static 2-pole lowpass (scalar cutoff)."""
    w0 = 2 * np.pi * f0 / SR
    alpha = np.sin(w0) / (2 * q)
    b0 = (1 - np.cos(w0)) / 2; b1 = 1 - np.cos(w0); b2 = b0
    a0 = 1 + alpha; a1 = -2 * np.cos(w0); a2 = 1 - alpha
    b = np.array([b0, b1, b2]) / a0
    a = np.array([1.0, a1 / a0, a2 / a0])
    y = np.zeros_like(x)
    x1 = x2 = y1 = y2 = 0.0
    for i in range(len(x)):
        v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2
        x2 = x1; x1 = x[i]; y2 = y1; y1 = v
        y[i] = v
    return y

def biquad_hp(x, f0, q=0.707):
    w0 = 2 * np.pi * f0 / SR
    alpha = np.sin(w0) / (2 * q)
    b0 = (1 + np.cos(w0)) / 2; b1 = -(1 + np.cos(w0)); b2 = b0
    a0 = 1 + alpha; a1 = -2 * np.cos(w0); a2 = 1 - alpha
    b = np.array([b0, b1, b2]) / a0
    a = np.array([1.0, a1 / a0, a2 / a0])
    y = np.zeros_like(x)
    x1 = x2 = y1 = y2 = 0.0
    for i in range(len(x)):
        v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2
        x2 = x1; x1 = x[i]; y2 = y1; y1 = v
        y[i] = v
    return y

def fftconv(x, ir):
    n = len(x) + len(ir) - 1
    M = 1 << int(np.ceil(np.log2(n)))
    y = np.fft.irfft(np.fft.rfft(x, M) * np.fft.rfft(ir, M), M)[:len(x)]
    return y

def reverb_ir(tail=1.6, damp=4200.0):
    n = int(tail * SR)
    x = np.arange(n) / SR
    ir = noise(n) * np.exp(-x * (5.5 / tail))
    ir[:int(0.008 * SR)] *= np.linspace(0, 1, int(0.008 * SR))
    ir = biquad_lp(ir, damp)
    return ir / (np.abs(ir).max() + 1e-9) * 0.55

IR = reverb_ir()

def saw(freq, n, phase=0.0):
    t = np.arange(n) / SR
    ph = (freq * t + phase) % 1.0
    return 2 * ph - 1

def sq(freq, n, duty=0.5, phase=0.0):
    t = np.arange(n) / SR
    return np.where(((freq * t + phase) % 1.0) < duty, 1.0, -1.0)

# ---------------------------------------------------------------- score
# A natural minor. One chord per bar: Am F C G, looping across 15 bars.
NOTE = {'A1': 55.00, 'F1': 43.65, 'C2': 65.41, 'G1': 49.00,
        'A2': 110.00, 'C3': 130.81, 'E3': 164.81, 'F2': 87.31,
        'G2': 98.00, 'B2': 123.47, 'D3': 146.83,
        'A3': 220.00, 'C4': 261.63, 'E4': 329.63, 'F3': 174.61,
        'G3': 196.00, 'B3': 246.94, 'D4': 293.66, 'A4': 440.00,
        'E5': 659.26, 'C5': 523.25, 'G4': 392.00}
PROG = [
    ('A1', ['A3', 'C4', 'E4']),
    ('F1', ['F3', 'A3', 'C4']),
    ('C2', ['C4', 'E4', 'G4']),
    ('G1', ['G3', 'B3', 'D4']),
]
NBARS = int(np.ceil(DUR / BAR))

music = np.zeros(N)

# --- sub bass: root of the bar, pulsing on every beat -----------------------
bass = np.zeros(N)
for b in range(NBARS):
    root = NOTE[PROG[b % 4][0]]
    for k in range(4):
        t0 = b * BAR + k * BEAT
        if t0 >= DUR: break
        d = BEAT * 0.92
        n = int(d * SR)
        x = np.arange(n) / SR
        sig = np.sin(2 * np.pi * root * x) * 0.85 + np.sin(2 * np.pi * root * 2 * x) * 0.18
        e = np.clip(x / 0.006, 0, 1) * (1 - np.clip(x / d, 0, 1)) ** 1.6
        place(bass, sig * e, t0)
music += bass * 0.50

# --- pad: detuned saws, slow filter opening across the film ----------------
pad = np.zeros(N)
for b in range(NBARS):
    notes = PROG[b % 4][1]
    t0 = b * BAR
    d = BAR * 1.02
    n = int(d * SR)
    if int(t0 * SR) >= N: break
    x = np.arange(n) / SR
    sig = np.zeros(n)
    for f in notes:
        base = NOTE[f]
        for det in (-0.14, 0.0, 0.15):
            sig += saw(base * (1 + det / 100.0), n, phase=rs.rand())
    sig /= (len(notes) * 3)
    e = np.clip(x / 0.28, 0, 1) * np.clip((d - x) / 0.5, 0, 1)
    place(pad, sig * e, t0)
pad = biquad_lp(pad, 900.0)
# the pad opens up as the film builds
open_env = 0.35 + 0.65 * np.clip((T - 4.0) / 16.0, 0, 1)
music += pad * 0.30 * open_env

# --- arpeggio: 16ths, enters at the brand beat -----------------------------
arp = np.zeros(N)
step = BEAT / 4
nsteps = int(DUR / step)
for i in range(nsteps):
    t0 = i * step
    if t0 < 8.0 - 0.25:
        continue
    b = int(t0 // BAR)
    notes = PROG[b % 4][1]
    pat = [0, 1, 2, 1, 2, 0, 1, 2]
    f = NOTE[notes[pat[i % len(pat)]]] * (2.0 if (i % 8) in (4, 5) else 1.0)
    d = step * 1.5
    n = int(d * SR)
    x = np.arange(n) / SR
    sig = sq(f, n, duty=0.32) * 0.5 + saw(f, n) * 0.5
    e = np.clip(x / 0.002, 0, 1) * np.exp(-x * 22)
    gain = 0.55 if t0 < 12.0 else (0.85 if t0 < 22.0 else 1.0)
    place(arp, sig * e * gain, t0)
arp = biquad_lp(arp, 2600.0)
arp = arp * 0.8 + fftconv(arp, IR) * 0.22
music += arp * 0.16

# --- drums -----------------------------------------------------------------
drums = np.zeros(N)
def kick(t0, gain=1.0):
    d = 0.34; n = int(d * SR); x = np.arange(n) / SR
    f = 45 + 115 * np.exp(-x * 42)
    sig = np.sin(2 * np.pi * np.cumsum(f) / SR)
    e = np.exp(-x * 11) * np.clip(x / 0.002, 0, 1)
    click = noise(n) * np.exp(-x * 320) * 0.25
    place(drums, (sig * e + click) * gain, t0)

def snare(t0, gain=1.0):
    d = 0.30; n = int(d * SR); x = np.arange(n) / SR
    body = np.sin(2 * np.pi * 190 * x) * np.exp(-x * 26) * 0.35
    nz = biquad_hp(noise(n), 1400.0) * np.exp(-x * 17)
    sig = (body + nz) * gain
    place(drums, sig * 0.9, t0)

def hat(t0, gain=1.0, dcy=70.0):
    d = 0.10; n = int(d * SR); x = np.arange(n) / SR
    nz = biquad_hp(noise(n), 7200.0) * np.exp(-x * dcy)
    place(drums, nz * gain, t0)

for b in range(NBARS):
    t0 = b * BAR
    if t0 >= DUR: break
    full = t0 >= 8.0
    if t0 >= 2.0:
        kick(t0, 1.0)
        kick(t0 + BEAT * 2, 0.95)
    if t0 >= 4.0:
        snare(t0 + BEAT * 3, 0.70)
    if full:
        kick(t0 + BEAT * 2 + BEAT * 0.75, 0.45)
        snare(t0 + BEAT, 0.75)
        snare(t0 + BEAT * 3, 0.80)
    if t0 >= 12.0:
        for k in range(8):
            hat(t0 + k * BEAT / 2, 0.20 if k % 2 else 0.32)
    if t0 >= 18.0:
        for k in range(16):
            if k % 2:
                hat(t0 + k * BEAT / 4, 0.12, 110.0)
music += drums * 0.42

# sidechain the sustained parts to the kick so the bed breathes
duck = np.ones(N)
for b in range(NBARS):
    for k in (0, 2):
        t0 = b * BAR + k * BEAT
        if t0 >= DUR or t0 < 2.0: continue
        d = 0.34; i0 = int(t0 * SR); n = min(int(d * SR), N - i0)
        if n <= 0: continue
        x = np.arange(n) / SR
        duck[i0:i0 + n] = np.minimum(duck[i0:i0 + n], 0.42 + 0.58 * np.clip(x / d, 0, 1) ** 0.6)
music = music * (0.55 + 0.45 * duck)

# --- transitions: risers into each cut, and a downlifter out of it ---------
def riser(t0, dur, f0=180.0, f1=3200.0, gain=0.5, kind='noise'):
    n = int(dur * SR); x = np.arange(n) / SR
    p = x / dur
    if kind == 'noise':
        nz = noise(n)
        cutoff = f0 * (f1 / f0) ** p
        sig = onepole_lp(nz, cutoff)
        sig = sig - onepole_lp(sig, cutoff * 0.35)
    else:
        f = f0 * (f1 / f0) ** p
        sig = np.sin(2 * np.pi * np.cumsum(f) / SR)
    e = (p ** 2.2) * (1 - np.clip((x - dur + 0.03) / 0.03, 0, 1))
    place(music, sig * e * gain, t0)

def downlift(t0, dur=1.1, gain=0.35):
    n = int(dur * SR); x = np.arange(n) / SR
    p = x / dur
    f = 2400 * (0.06) ** p
    sig = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.6 + onepole_lp(noise(n), 900) * 0.5
    e = np.exp(-x * 3.2)
    place(music, sig * e * gain, t0)

for c in CUTS[1:-1]:
    riser(c - 1.1, 1.1, 200, 3400, 0.30)
    downlift(c, 1.0, 0.26)
riser(7.3, 0.70, 220, 4200, 0.42)

# --- ending: let the bed ring out ------------------------------------------
tail_mask = 1 - np.clip((T - 34.4) / 1.6, 0, 1) ** 1.4
music *= tail_mask
music = music * 0.86 + fftconv(music, IR) * 0.16

# ---------------------------------------------------------------- SFX
sfx = np.zeros(N)

def impact(t0, gain=1.0, tone=52.0, tail=1.2):
    d = tail; n = int(d * SR); x = np.arange(n) / SR
    f = tone * (1 + 3.4 * np.exp(-x * 26))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 4.2)
    crack = biquad_hp(noise(n), 900.0) * np.exp(-x * 30) * 0.55
    sig = (body + crack) * gain
    sig = sig * 0.8 + fftconv(sig, IR)[:n] * 0.5
    place(sfx, sig, t0)

def whoosh(t0, dur=0.7, gain=0.55, up=True, f0=300, f1=4200):
    n = int(dur * SR); x = np.arange(n) / SR; p = x / dur
    cutoff = (f0 * (f1 / f0) ** p) if up else (f1 * (f0 / f1) ** p)
    sig = onepole_lp(noise(n), cutoff)
    sig = sig - onepole_lp(sig, cutoff * 0.4)
    e = np.sin(np.clip(p, 0, 1) * np.pi) ** 1.3
    sig = sig * e * gain
    sig = sig * 0.85 + fftconv(sig, IR)[:n] * 0.30
    place(sfx, sig, t0)

def tick(t0, gain=0.16, f=2600):
    d = 0.05; n = int(d * SR); x = np.arange(n) / SR
    sig = (np.sin(2 * np.pi * f * x) * 0.5 + biquad_hp(noise(n), 3000) * 0.5) * np.exp(-x * 120)
    place(sfx, sig * gain, t0)

def blip(t0, gain=0.30, f=1180, up=True):
    d = 0.16; n = int(d * SR); x = np.arange(n) / SR
    ff = f * (1.6 ** (x / d)) if up else f * (0.6 ** (x / d))
    sig = np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-x * 20)
    sig += np.sin(2 * np.pi * np.cumsum(ff * 2) / SR) * np.exp(-x * 28) * 0.3
    sig = sig * 0.8 + fftconv(sig, IR)[:n] * 0.35
    place(sfx, sig * gain, t0)

def shimmer(t0, dur=1.4, gain=0.30):
    n = int(dur * SR); x = np.arange(n) / SR
    sig = np.zeros(n)
    for f in (1568, 2093, 2637, 3136, 4186):
        sig += np.sin(2 * np.pi * f * x + rs.rand() * 6) * np.exp(-x * (2.2 + rs.rand()))
    sig /= 5
    sig = sig * 0.6 + fftconv(sig, IR)[:n] * 0.7
    place(sfx, sig * gain, t0)

def snap(t0, gain=0.9):
    d = 0.5; n = int(d * SR); x = np.arange(n) / SR
    crack = biquad_hp(noise(n), 2200.0) * np.exp(-x * 70)
    body = np.sin(2 * np.pi * 210 * x) * np.exp(-x * 40) * 0.4
    sig = (crack + body) * gain
    sig = sig * 0.75 + fftconv(sig, IR)[:n] * 0.55
    place(sfx, sig, t0)

def sweepup(t0, dur, gain=0.35, f0=220, f1=2400):
    n = int(dur * SR); x = np.arange(n) / SR; p = x / dur
    f = f0 * (f1 / f0) ** p
    sig = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.5
    sig += onepole_lp(noise(n), f * 1.5) * 0.5
    e = p ** 1.5 * (1 - np.clip((x - dur + 0.05) / 0.05, 0, 1))
    place(sfx, sig * e * gain, t0)

# 1 · question one — the feed builds and scans
impact(0.00, 0.80, 46, 1.6)
shimmer(0.05, 1.6, 0.16)
q1 = 'Naming your startup?'
for i in range(len(q1)):
    if q1[i] != ' ':
        tick(0.30 + i * (1.85 - 0.30) / (len(q1) + 0.6), 0.080, 2200 + (i % 5) * 260)
for tt in (1.15, 2.25, 3.25):
    tick(tt, 0.22, 1500)
    blip(tt, 0.10, 820, True)
whoosh(3.40, 0.62, 0.40, True)

# 2 · question two — every line gets stamped
impact(4.00, 0.90, 44, 1.5)
q2 = 'Every .com already gone?'
for i in range(len(q2)):
    if q2[i] != ' ':
        tick(4.18 + i * (5.80 - 4.18) / (len(q2) + 0.6), 0.080, 2000 + (i % 5) * 240)
def stamp(t0, gain=0.42):
    d = 0.34; n = int(d * SR); x = np.arange(n) / SR
    thud = np.sin(2 * np.pi * (150 * (1 + 1.6 * np.exp(-x * 40))) * x) * np.exp(-x * 19)
    grit = biquad_hp(noise(n), 1100.0) * np.exp(-x * 44) * 0.7
    sig = (thud + grit) * gain
    place(sfx, sig * 0.8 + fftconv(sig, IR)[:n] * 0.4, t0)
for tt in (4.62, 5.95, 7.28):
    stamp(tt, 0.42)
    blip(tt + 0.01, 0.16, 620, False)
for k in range(7):                      # the feed runs away into the reveal
    stamp(7.42 + k * 0.075, 0.20 + k * 0.03)
riser(7.30, 0.66, 240, 4400, 0.34) if False else None
whoosh(7.30, 0.68, 0.55, True, 260, 5200)

# 3 · the reveal
impact(8.00, 1.05, 42, 1.7)
snap(8.98, 0.85)
shimmer(9.00, 1.8, 0.28)
blip(9.02, 0.22, 900, True)
for k, tt in enumerate([9.20, 9.55, 9.95]):
    blip(tt, 0.10, 1400 + k * 300, True)

# 4 · prompt — typing, swaps, results landing
whoosh(12.00, 0.55, 0.36, True)
lines = ['fintech for freelancers', 'an AI photo editor', 'tool for indie devs']
each = 6.0 / 3
for li, ln in enumerate(lines):
    t0 = 12.0 + li * each
    ty0, ty1 = t0 + 0.07 * each, t0 + 0.50 * each
    for i in range(len(ln)):
        if ln[i] != ' ':
            tick(ty0 + i * (ty1 - ty0) / (len(ln) + 0.6), 0.075, 2400 + (i % 4) * 300)
    for k in range(3):
        blip(t0 + each * (0.46 + k * 0.13) + 0.04, 0.20, 1250 + k * 280, True)
    if li < 2:
        whoosh(t0 + each * 0.86, 0.34, 0.22, False, 500, 2600)

# 5 · TLDs — the formation opens, then eight availability ticks
impact(18.00, 0.8, 50, 1.3)
whoosh(17.94, 0.6, 0.34, True)
sweepup(18.05, 0.75, 0.20, 300, 1500)
for j in range(8):
    blip(19.15 + j * 0.13, 0.22, 1500 + j * 90, True)

# 6 · score — slam, gauge sweep, ping, two pulses
impact(22.00, 1.05, 42, 1.7)
sweepup(22.06, 0.98, 0.30, 260, 2600)
blip(23.05, 0.42, 1760, True)
shimmer(23.05, 1.2, 0.18)
blip(23.92, 0.16, 1320, True)
blip(24.92, 0.14, 1180, True)

# 7 · proof — the card arrives and whips out
whoosh(25.90, 0.70, 0.55, True, 240, 3000)
impact(26.36, 0.75, 58, 1.2)
shimmer(26.40, 1.0, 0.12)
whoosh(29.62, 0.42, 0.50, True, 700, 5200)

# 8 · close
whoosh(30.00, 0.6, 0.34, True)
shimmer(30.05, 1.6, 0.16)
blip(31.00, 0.24, 980, True)           # .com -> check morph
sweepup(31.55, 0.52, 0.22, 320, 1700)  # container dissolving
snap(32.60, 0.95)                      # the lockup lands
impact(32.60, 0.70, 48, 2.0)
shimmer(32.62, 2.6, 0.34)
blip(34.08, 0.30, 1240, True)          # the button
shimmer(34.10, 1.8, 0.16)

sfx *= 1 - np.clip((T - 35.2) / 0.8, 0, 1)

# ---------------------------------------------------------------- write stems
def write(path, sig, peak=0.98):
    m = np.abs(sig).max()
    if m > 0:
        sig = sig / m * peak
    d = (np.clip(sig, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(d.tobytes())
    return path

write(os.path.join(OUT, 'music.wav'), music, 0.90)
write(os.path.join(OUT, 'sfx.wav'), sfx, 0.92)
print('music peak %.3f  sfx peak %.3f' % (np.abs(music).max(), np.abs(sfx).max()))
