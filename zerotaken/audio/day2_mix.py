import numpy as np, wave, os
SR = 48000; OUT = os.path.dirname(os.path.abspath(__file__))
def rd(p):
    with wave.open(os.path.join(OUT, p), 'rb') as w:
        return np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float64)/32768.0
music, sfx, vo = rd('day2_music.wav'), rd('day2_sfx.wav'), rd('day2_vo.wav')
n = max(len(music), len(sfx), len(vo))
pad = lambda a: np.pad(a, (0, n-len(a)))
music, sfx, vo = pad(music), pad(sfx), pad(vo)
duck = pad(np.load(os.path.join(OUT, 'day2_duck.npy')).astype(np.float64))[:n]
db = lambda x: 10**(x/20)
mus_g = db(-11.5)*(1 - duck*(1 - db(-5.0)))
sfx_g = db(-9.0)*(1 - duck*(1 - db(-2.0)))
mix = music*mus_g + sfx*sfx_g + vo*db(1.0)
mix = np.tanh(mix*0.92)*0.97
mix = mix/(np.abs(mix).max()+1e-9)*0.94
st = np.stack([mix, mix], axis=1)
with wave.open(os.path.join(OUT, 'day2_mix.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(st, -1, 1)*32767).astype('<i2').tobytes())
print('day2 mix %.2fs peak %.3f' % (n/SR, np.abs(mix).max()))
