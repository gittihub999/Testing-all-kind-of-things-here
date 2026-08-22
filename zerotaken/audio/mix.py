import numpy as np, wave, os
SR = 48000; OUT = os.path.dirname(os.path.abspath(__file__))
def rd(p):
    with wave.open(os.path.join(OUT, p), 'rb') as w:
        a = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float64) / 32768.0
    return a
music, sfx, vo = rd('music.wav'), rd('sfx.wav'), rd('vo.wav')
n = max(len(music), len(sfx), len(vo))
pad = lambda a: np.pad(a, (0, n - len(a)))
music, sfx, vo = pad(music), pad(sfx), pad(vo)
duck = np.load(os.path.join(OUT, 'duck.npy')).astype(np.float64)
duck = pad(duck)[:n]

db = lambda x: 10 ** (x / 20)
mus_g = db(-13.0) * (1 - duck * (1 - db(-6.5)))   # music steps back under the read
sfx_g = db(-7.5) * (1 - duck * (1 - db(-2.5)))
mix = music * mus_g + sfx * sfx_g + vo * db(-1.5)

# soft limit, then leave headroom for loudnorm
mix = np.tanh(mix * 0.92) * 0.97
mix = mix / (np.abs(mix).max() + 1e-9) * 0.94

st = np.stack([mix, mix], axis=1)                  # mono source, stereo file
with wave.open(os.path.join(OUT, 'mix.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(st, -1, 1) * 32767).astype('<i2').tobytes())
print('mix len %.2fs peak %.3f' % (n / SR, np.abs(mix).max()))
