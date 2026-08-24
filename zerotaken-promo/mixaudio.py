"""Builds the film's audio bed: voiceover + restrained sound design.
   Everything is synthesised, so there is no third-party audio in the output."""
import numpy as np, wave, json

SR, DUR = 48000, 33.6
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)

def put(buf, sig, at, gain=1.0):
    i = int(at * SR)
    if i < 0: sig = sig[-i:]; i = 0
    n = min(len(sig), len(buf) - i)
    if n > 0: buf[i:i+n] += sig[:n] * gain

def env(n, a, d, curve=2.0):
    e = np.ones(n)
    na, nd = int(a*SR), int(d*SR)
    if na: e[:na] = np.linspace(0,1,na)**0.6
    if nd: e[-nd:] = np.linspace(1,0,nd)**curve
    return e

def onepole(x, cut):                      # cheap lowpass
    a = np.exp(-2*np.pi*cut/SR); y = np.zeros_like(x); acc = 0.0
    for i in range(len(x)):
        acc = a*acc + (1-a)*x[i]; y[i] = acc
    return y

rs = np.random.RandomState(7)

def whoosh(dur=0.42, cut=2400, peak=0.62):
    n = int(dur*SR)
    t = np.linspace(0,1,n)
    nz = rs.randn(n) * 0.35
    nz = onepole(nz, cut)
    e = (np.sin(np.pi*np.clip(t/peak,0,1))**1.6) * np.exp(-t*2.2)
    return nz * e

def impact(dur=1.1, f0=118, f1=42, click=0.5):
    n = int(dur*SR); t = np.arange(n)/SR
    f = f1 + (f0-f1)*np.exp(-t*11)
    body = np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-t*4.4)
    nz = onepole(rs.randn(n)*0.5, 900) * np.exp(-t*26) * click
    return body*0.9 + nz

def riser(dur=1.25):
    n = int(dur*SR); t = np.linspace(0,1,n)
    nz = rs.randn(n)*0.3
    out = np.zeros(n); acc=0.0
    for i in range(n):                     # sweeping lowpass
        cut = 300 + 5200*(t[i]**2.2)
        a = np.exp(-2*np.pi*cut/SR)
        acc = a*acc + (1-a)*nz[i]; out[i]=acc
    return out * (t**1.9) * 0.9

def tick(dur=0.16, f=1650, decay=34):
    n=int(dur*SR); t=np.arange(n)/SR
    return (np.sin(2*np.pi*f*t)*0.55 + np.sin(2*np.pi*f*2.02*t)*0.25) * np.exp(-t*decay)

def ping(dur=0.55, f=1046.5, decay=9):
    n=int(dur*SR); t=np.arange(n)/SR
    s = (np.sin(2*np.pi*f*t) + 0.42*np.sin(2*np.pi*f*1.5*t) + 0.2*np.sin(2*np.pi*f*2*t))
    return s * np.exp(-t*decay) * 0.5

# ---- ambient drone: one key, no rhythm, so nothing can clash with the VO ----
t = np.arange(N)/SR
lfo = 0.5 + 0.5*np.sin(2*np.pi*0.055*t)
drone = (np.sin(2*np.pi*110.0*t)*0.55 + np.sin(2*np.pi*164.81*t)*0.32 +
         np.sin(2*np.pi*220.0*t)*0.18 + np.sin(2*np.pi*329.63*t)*0.07)
lift = np.clip((t-10.4)/1.6, 0, 1)*0.55 + 0.45          # opens up at the reveal
fade = np.clip(t/2.0,0,1) * np.clip((DUR-t)/1.6,0,1)
drone = drone * (0.55+0.45*lfo) * lift * fade * 0.055
shimmer = (np.sin(2*np.pi*1760*t)*0.5 + np.sin(2*np.pi*2640*t)*0.3) \
          * (0.5+0.5*np.sin(2*np.pi*0.19*t)) * np.clip((t-10.4)/2.5,0,1) * fade * 0.010
bed = drone + shimmer
L += bed; R += bed

CUTS = [3.60, 7.10, 10.40, 14.00, 17.60, 21.20, 24.30, 27.20, 30.00]
for i, c in enumerate(CUTS):
    w = whoosh(0.44 if i % 2 == 0 else 0.36, 2200 + (i % 3)*700)
    pan = 0.5 + (0.22 if i % 2 else -0.22)
    put(L, w, c-0.20, 0.085*(1-pan+0.5)); put(R, w, c-0.20, 0.085*(pan+0.5-0.5+0.5))

put(L, riser(), 11.02-1.25, 0.10); put(R, riser(), 11.02-1.25, 0.10)   # into the snap
for at, g in [(7.72, 0.34), (11.02, 0.46)]:                            # the two hits
    im = impact(1.2 if g > 0.4 else 0.9)
    put(L, im, at, g); put(R, im, at, g)

for i in range(5):                                                     # TAKEN stamps
    at = 4.30 + i*0.135
    put(L, tick(0.14, 420, 40), at, 0.10); put(R, tick(0.14, 402, 40), at, 0.10)
for i in range(3):                                                     # Available checks
    at = 18.22 + i*0.30
    put(L, ping(0.5, [1046.5, 1244.5, 1567.9][i]), at, 0.075)
    put(R, ping(0.5, [1046.5, 1244.5, 1567.9][i]), at, 0.075)
for i in range(5):                                                     # handle ticks
    at = 27.74 + i*0.135
    put(L, tick(0.13, 1320, 44), at, 0.045); put(R, tick(0.13, 1290, 44), at, 0.045)
put(L, ping(0.9, 1567.9, 5), 31.55, 0.06); put(R, ping(0.9, 1567.9, 5), 31.55, 0.06)

# ---- voiceover on top, ducking the bed under each line ----
timing = json.load(open('vo/timing.json'))
duck = np.ones(N)
for i, at, d in timing:
    with wave.open(f'vo/l{int(i)}.wav') as w:
        sr = w.getframerate()
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32)/32768.0
    x = np.linspace(0, len(a)/sr, int(len(a)/sr*SR), endpoint=False)   # resample to 48k
    a = np.interp(x, np.arange(len(a))/sr, a)
    a *= env(len(a), 0.012, 0.05, 1.4)
    put(L, a, at, 0.98); put(R, a, at, 0.98)
    s, e = int((at-0.18)*SR), int((at+len(a)/SR+0.30)*SR)
    duck[max(0,s):min(N,e)] = 0.45

k = int(0.09*SR); duck = np.convolve(duck, np.ones(k)/k, mode='same')
bedduck = (duck-1.0)                                   # only the bed is ducked
L += bed*bedduck; R += bed*bedduck

peak = max(np.abs(L).max(), np.abs(R).max())
L *= 0.89/peak; R *= 0.89/peak
out = np.stack([L, R], axis=1)
out = np.clip(out, -1, 1)
with wave.open('audio.wav','wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out*32767).astype(np.int16).tobytes())
print('audio.wav written  peak %.3f  dur %.2fs' % (peak, DUR))
