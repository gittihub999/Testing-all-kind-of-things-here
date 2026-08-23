"""Day 2 score and sound design.

Brighter than day 1 on purpose: C major rather than A minor, marimba-ish
plucks and bells instead of saws, shakers and rim clicks instead of a heavy
snare. One continuous piece — the transitions live in the SFX layer.

The arrangement is deliberately sparse under the two pain beats and opens up
at the brand reveal, so the turn in the script is also a turn in the music.
"""
import numpy as np, wave, os

SR = 48000; DUR = 36.0
N = int(SR * DUR); T = np.arange(N) / SR
OUT = os.path.dirname(os.path.abspath(__file__))
BPM = 120.0; BEAT = 60.0 / BPM; BAR = BEAT * 4
NBARS = int(np.ceil(DUR / BAR))
rs = np.random.RandomState(20260823)

def place(buf, sig, start):
    i0 = int(start * SR)
    if i0 >= N or i0 < 0: return
    n = min(len(sig), N - i0)
    if n > 0: buf[i0:i0 + n] += sig[:n]
def noise(n): return rs.uniform(-1, 1, n)
def biquad(x, b, a):
    y = np.zeros_like(x); x1 = x2 = y1 = y2 = 0.0
    for i in range(len(x)):
        v = b[0]*x[i] + b[1]*x1 + b[2]*x2 - a[1]*y1 - a[2]*y2
        x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v
    return y
def lp(x, f0, q=0.707):
    w0 = 2*np.pi*f0/SR; al = np.sin(w0)/(2*q); c = np.cos(w0)
    b0 = (1-c)/2; b1 = 1-c; b2 = b0; a0 = 1+al; a1 = -2*c; a2 = 1-al
    return biquad(x, [b0/a0, b1/a0, b2/a0], [1.0, a1/a0, a2/a0])
def hp(x, f0, q=0.707):
    w0 = 2*np.pi*f0/SR; al = np.sin(w0)/(2*q); c = np.cos(w0)
    b0 = (1+c)/2; b1 = -(1+c); b2 = b0; a0 = 1+al; a1 = -2*c; a2 = 1-al
    return biquad(x, [b0/a0, b1/a0, b2/a0], [1.0, a1/a0, a2/a0])
def fftconv(x, ir):
    n = len(x) + len(ir) - 1; Mx = 1 << int(np.ceil(np.log2(n)))
    return np.fft.irfft(np.fft.rfft(x, Mx) * np.fft.rfft(ir, Mx), Mx)[:len(x)]

# a short, bright room — nothing cavernous
def make_ir(tail=0.85, damp=6500.0):
    n = int(tail * SR); x = np.arange(n) / SR
    ir = noise(n) * np.exp(-x * (6.0 / tail))
    ir[:int(0.006 * SR)] *= np.linspace(0, 1, int(0.006 * SR))
    ir = lp(ir, damp)
    return ir / (np.abs(ir).max() + 1e-9) * 0.5
IR = make_ir()

NOTE = {'C2':65.41,'G1':49.00,'A1':55.00,'F1':43.65,
        'C3':130.81,'E3':164.81,'G3':196.00,'A3':220.00,'C4':261.63,'D4':293.66,
        'E4':329.63,'F4':349.23,'G4':392.00,'A4':440.00,'B4':493.88,'C5':523.25,
        'D5':587.33,'E5':659.26,'G5':783.99,'A5':880.00,'C6':1046.50}
PROG = [('C2', ['C4','E4','G4']), ('G1', ['B4','D5','G4']),
        ('A1', ['A3','C4','E4']), ('F1', ['F4','A4','C5'])]

music = np.zeros(N)

def bell(f, dur, gain=1.0, bright=1.0):
    n = int(dur * SR); x = np.arange(n) / SR
    s = (np.sin(2*np.pi*f*x) +
         0.42*bright*np.sin(2*np.pi*f*2*x) +
         0.18*bright*np.sin(2*np.pi*f*3.01*x) +
         0.09*bright*np.sin(2*np.pi*f*4.98*x))
    e = np.clip(x/0.003, 0, 1) * np.exp(-x*(7.5/dur))
    return s * e * gain

# --- sub: soft, one note per bar with a gentle pulse ----------------------
bass = np.zeros(N)
for b in range(NBARS):
    root = NOTE[PROG[b % 4][0]]
    for k in range(4):
        t0 = b*BAR + k*BEAT
        if t0 >= DUR: break
        d = BEAT*0.9; n = int(d*SR); x = np.arange(n)/SR
        s = np.sin(2*np.pi*root*x)*0.9 + np.sin(2*np.pi*root*2*x)*0.12
        e = np.clip(x/0.010, 0, 1) * (1 - np.clip(x/d, 0, 1))**1.4
        place(bass, s*e, t0)
music += bass * 0.42

# --- airy pad -------------------------------------------------------------
pad = np.zeros(N)
for b in range(NBARS):
    notes = PROG[b % 4][1]; t0 = b*BAR
    if int(t0*SR) >= N: break
    d = BAR*1.35; n = int(d*SR); x = np.arange(n)/SR
    s = np.zeros(n)
    for f in notes:
        base = NOTE[f]
        for det in (-0.10, 0.0, 0.11):
            ph = rs.rand()
            s += np.sin(2*np.pi*base*(1+det/100.0)*x + ph) + 0.22*np.sin(2*np.pi*base*2*(1+det/100.0)*x + ph)
    s /= (len(notes)*3)
    e = np.clip(x/0.60, 0, 1) * np.clip((d-x)/(BAR*0.8), 0, 1)
    place(pad, s*e, t0)
pad = lp(pad, 1600.0)
music += pad * 0.20 * (0.55 + 0.45*np.clip((T-1.0)/16.0, 0, 1))

# --- marimba pluck arp, eighth notes, from bar 2 --------------------------
arp = np.zeros(N)
step = BEAT/2
for i in range(int(DUR/step)):
    t0 = i*step
    if t0 < 7.6: continue
    b = int(t0//BAR); notes = PROG[b % 4][1]
    pat = [0,1,2,1]
    f = NOTE[notes[pat[i % 4]]] * (2.0 if (i % 8) in (2,6) else 1.0)
    g = np.clip((t0-7.4)/1.5, 0, 1) * (0.85 if t0 < 14.0 else 1.0)
    place(arp, bell(f, 0.42, 0.5*g, 0.6), t0)
arp = arp*0.82 + fftconv(arp, IR)*0.26
music += arp * 0.30

# --- a bell melody lifting the last third ---------------------------------
lead = np.zeros(N)
MOTIF = [('E5',0.0,0.9),('G5',0.75,0.9),('C6',1.5,1.3),('A5',3.0,0.9),('G5',3.75,1.4)]
for base_t in (22.0, 30.0):
    for (nm, off, d) in MOTIF:
        t0 = base_t + off
        if t0 < DUR - 0.3: place(lead, bell(NOTE[nm], d, 0.45, 0.8), t0)
lead = lead*0.6 + fftconv(lead, IR)*0.55
music += lead * 0.16

# --- light kit ------------------------------------------------------------
drums = np.zeros(N)
def kick(t0, g=1.0):
    d=0.30; n=int(d*SR); x=np.arange(n)/SR
    f = 48 + 90*np.exp(-x*40)
    s = np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-x*13)
    place(drums, s*g, t0)
def clap(t0, g=1.0):
    d=0.26; n=int(d*SR); x=np.arange(n)/SR
    s = hp(noise(n), 1600.0)*np.exp(-x*20)
    s += hp(noise(n), 2600.0)*np.exp(-x*45)*0.6
    s = s*0.85 + fftconv(s, IR)[:n]*0.35
    place(drums, s*g, t0)
def shaker(t0, g=1.0):
    d=0.075; n=int(d*SR); x=np.arange(n)/SR
    place(drums, hp(noise(n), 8000.0)*np.exp(-x*95)*g, t0)
def rim(t0, g=1.0):
    d=0.09; n=int(d*SR); x=np.arange(n)/SR
    s = (np.sin(2*np.pi*1750*x)*0.6 + hp(noise(n), 3000.0)*0.4)*np.exp(-x*130)
    place(drums, s*g, t0)
for b in range(NBARS):
    t0 = b*BAR
    if t0 >= DUR: break
    thin = t0 >= DUR - BAR*1.2
    if t0 >= 0.0:
        kick(t0, 0.70 if t0 < 8.0 else (0.7 if thin else 1.0))
        kick(t0 + BEAT*2, 0.62 if t0 < 8.0 else (0.6 if thin else 0.9))
    if t0 >= 4.0:
        clap(t0 + BEAT*3, 0.40 if t0 < 8.0 else (0.44 if thin else 0.66))
    if t0 >= 8.0:
        clap(t0 + BEAT, 0.62 if not thin else 0.4)
        for k in range(8):
            shaker(t0 + k*BEAT/2, (0.16 if k % 2 else 0.26) * (0.55 if thin else 1.0))
    if t0 >= 14.0 and not thin:
        rim(t0 + BEAT*1.5, 0.28); rim(t0 + BEAT*3.5, 0.24)
music += drums * 0.38

duck = np.ones(N)
for b in range(NBARS):
    for k in (0, 2):
        t0 = b*BAR + k*BEAT
        if t0 >= DUR or t0 < 2.0: continue
        i0 = int(t0*SR); n = min(int(0.26*SR), N-i0)
        if n <= 0: continue
        x = np.arange(n)/SR
        duck[i0:i0+n] = np.minimum(duck[i0:i0+n], 0.70 + 0.30*np.clip(x/0.26, 0, 1)**0.6)
music = music * (0.78 + 0.22*duck)
music *= np.clip(T/0.35, 0, 1)**1.2
music *= 1 - np.clip((T - 34.4)/1.6, 0, 1)**1.3
music = music*0.88 + fftconv(music, IR)*0.13

# ------------------------------------------------------------------- SFX
sfx = np.zeros(N)
def pop(t0, g=0.5, f=520, drop=1.9):
    d=0.20; n=int(d*SR); x=np.arange(n)/SR
    ff = f*(1 + (drop-1)*np.exp(-x*40))
    s = np.sin(2*np.pi*np.cumsum(ff)/SR)*np.exp(-x*24)
    s += hp(noise(n), 2500.0)*np.exp(-x*130)*0.25
    s = s*0.85 + fftconv(s, IR)[:n]*0.28
    place(sfx, s*g, t0)
def ding(t0, g=0.42, f=1568):
    place(sfx, (lambda s: s*0.7 + fftconv(s, IR)[:len(s)]*0.55)(bell(f, 0.85, 1.0, 1.0))*g, t0)
def swish(t0, dur=0.5, g=0.30, up=True):
    n=int(dur*SR); x=np.arange(n)/SR; p=x/dur
    cut = (700*(5200/700)**p) if up else (5200*(700/5200)**p)
    s = np.zeros(n); acc = 0.0
    a = np.exp(-2*np.pi*np.clip(cut,60,20000)/SR); nz = noise(n)
    for i in range(n):
        acc = a[i]*acc + (1-a[i])*nz[i]; s[i] = nz[i]-acc
    e = np.sin(np.clip(p,0,1)*np.pi)**1.4
    s = s*e; s = s*0.8 + fftconv(s, IR)[:n]*0.3
    place(sfx, s*g, t0)
def sparkle(t0, g=0.30, n_notes=9, spread=0.55):
    r = np.random.RandomState(int(t0*1000) % 9999)
    for i in range(n_notes):
        f = [1046.5, 1318.5, 1568.0, 2093.0, 2637.0, 3136.0][i % 6] * (1 + 0.01*r.randn())
        place(sfx, bell(f, 0.55 + 0.3*r.rand(), 0.30, 1.0)*g, t0 + r.rand()*spread)
def keytick(t0, g=0.09):
    d=0.045; n=int(d*SR); x=np.arange(n)/SR
    s = (np.sin(2*np.pi*2400*x)*0.4 + hp(noise(n), 3200.0)*0.6)*np.exp(-x*150)
    place(sfx, s*g, t0)
def thunk(t0, g=0.45):
    d=0.30; n=int(d*SR); x=np.arange(n)/SR
    f = 190*(1 + 1.4*np.exp(-x*36))
    s = np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-x*17)
    s += hp(noise(n), 900.0)*np.exp(-x*38)*0.45
    s = s*0.85 + fftconv(s, IR)[:n]*0.35
    place(sfx, s*g, t0)

def sweepup(t0, dur=0.85, g=0.24, f0=280, f1=1600):
    n=int(dur*SR); x=np.arange(n)/SR; p=x/dur
    f = f0*(f1/f0)**p
    s = np.sin(2*np.pi*np.cumsum(f)/SR)*0.5
    acc = 0.0; a = np.exp(-2*np.pi*np.clip(f*1.5,60,20000)/SR); nz = noise(n)
    lpn = np.zeros(n)
    for i in range(n):
        acc = a[i]*acc + (1-a[i])*nz[i]; lpn[i] = acc
    s += lpn*0.5
    e = p**1.5 * (1 - np.clip((x - dur + 0.06)/0.06, 0, 1))
    s = s*e; s = s*0.85 + fftconv(s, IR)[:n]*0.30
    place(sfx, s*g, t0)

# 1 · the pain: a feed of names, each one stamped
swish(0.02, 0.55, 0.24)
for i in range(3):
    thunk(0.26 + i * 1.28, 0.30)
    pop(0.28 + i * 1.28, 0.20, 300, 1.5)
for i in range(26):
    keytick(0.34 + i * 0.086, 0.038)

# 2 · the pain: the AI names were gone too
swish(3.86, 0.50, 0.30); pop(4.12, 0.40, 430)
for i in range(3): pop(4.18 + i * 0.14, 0.22, 520 + i * 40)
for i in range(3):
    thunk(5.37 + i * 0.34, 0.34)
    pop(5.39 + i * 0.34, 0.18, 300, 1.4)
pop(6.72, 0.30, 380, 1.4)

# 3 · the fix
swish(7.86, 0.55, 0.34)
ding(8.06, 0.50, 1046.5); sparkle(8.08, 0.42, 14, 0.8); pop(8.06, 0.42, 380)
swish(9.32, 0.40, 0.22, False)
pop(10.22, 0.36, 460)
q = 'eco coffee subscription'
for i in range(len(q)):
    if q[i] != ' ': keytick(10.55 + i * (0.90/(len(q)+0.6)), 0.06)
for r in range(3):
    pop(11.57 + r * 0.22, 0.34, 500 + r * 45)
    ding(11.90 + r * 0.22, 0.24, 1760 + r * 130)
sparkle(12.62, 0.36, 13, 0.8)

# 4 · the ring of extensions
swish(13.86, 0.55, 0.34)
sweepup(14.02, 0.85, 0.24, 280, 1600)
for j in range(8):
    pop(14.10 + j * 0.055, 0.18, 480 + j * 35)
    ding(15.06 + j * 0.11, 0.20, 1568 + j * 95)
sparkle(16.06, 0.36, 12, 0.8); pop(16.08, 0.36, 700)
ding(18.12, 0.18, 1318)

# 5 · the real price, and the score
swish(19.86, 0.50, 0.30); pop(20.12, 0.40, 430)
pop(20.86, 0.34, 560); ding(21.22, 0.26, 1760)
pop(21.46, 0.34, 380)
for i in range(9): keytick(21.50 + i * 0.09, 0.055)
thunk(22.22, 0.42)
pop(22.48, 0.30, 620)
pop(23.38, 0.36, 640); ding(23.52, 0.30, 2093); sparkle(23.55, 0.20, 6, 0.5)

# 6 · the handle
swish(25.86, 0.50, 0.30); pop(26.02, 0.36, 460)
for i in range(5): pop(26.14 + i * 0.09, 0.24, 520 + i * 40)
for i in range(5): ding(26.98 + i * 0.11, 0.22, 1568 + i * 130)
sparkle(27.62, 0.34, 11, 0.7); pop(27.64, 0.40, 700)

# 7 · close
swish(29.86, 0.52, 0.32)
for i in range(8): keytick(30.04 + i * 0.045, 0.05)
ding(30.95, 0.46, 1046.5); sparkle(30.96, 0.40, 14, 0.8); pop(30.95, 0.40, 380)
pop(32.32, 0.40, 700); ding(32.36, 0.30, 2093)
sparkle(34.05, 0.22, 7, 0.6)

sfx *= 1 - np.clip((T - 35.2)/0.8, 0, 1)

def write(path, sig, peak=0.92):
    m = np.abs(sig).max()
    if m > 0: sig = sig/m*peak
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(sig, -1, 1)*32767).astype('<i2').tobytes())
write(os.path.join(OUT, 'day2_music.wav'), music, 0.90)
write(os.path.join(OUT, 'day2_sfx.wav'), sfx, 0.92)
print('day2 music/sfx written')
