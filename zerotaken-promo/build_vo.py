"""Voiceover: ten lines, one per beat, synthesised offline with Piper.
   The three pain-point questions run slower and heavier; the product half is
   brisk. Offsets let the picture land a beat before the line does.

     python3 -m piper.download_voices en_US-ryan-high --data-dir /tmp/voices
     python3 build_vo.py
"""
import wave, json, os
from piper import PiperVoice, SynthesisConfig

VOICE = os.environ.get('PIPER_VOICE', '/tmp/voices/en_US-ryan-high.onnx')

#     at      pace  line
LINES = [
    (0,  0.34, 1.14, "How long have you been searching for a name?"),
    (1,  3.86, 1.10, "Every good dot com... already gone."),
    (2,  7.26, 1.08, "And the one you loved? Two thousand dollars."),
    (3, 10.70, 0.99, "There is a faster way. ZeroTaken."),
    (4, 14.28, 0.98, "Just describe your idea, in plain words."),
    (5, 17.86, 0.97, "Dozens of brandable names. Verified available."),
    (6, 21.36, 0.97, "Dot com. Dot I O. Dot A I. A hundred more."),
    (7, 24.46, 0.97, "Every name, scored. No premium traps."),
    (8, 27.36, 0.97, "Handles checked too. Every search, private."),
    (9, 30.30, 0.99, "ZeroTaken dot com. Your name is still out there."),
]

os.makedirs('vo', exist_ok=True)
voice = PiperVoice.load(VOICE)
timing = []
for i, at, pace, txt in LINES:
    path = 'vo/l%d.wav' % i
    with wave.open(path, 'wb') as w:
        voice.synthesize_wav(txt, w, syn_config=SynthesisConfig(
            length_scale=pace, noise_scale=0.60, noise_w_scale=0.75))
    with wave.open(path) as w:
        dur = w.getnframes() / w.getframerate()
    timing.append([i, at, dur])
    print('%d  at %5.2f  dur %5.2f  end %5.2f  "%s"' % (i, at, dur, at + dur, txt))
json.dump(timing, open('vo/timing.json', 'w'))
