# Favicon (32 px, afgeronde donkere tegel) en apple-touch-icon (180 px, vierkant: iOS rondt zelf af) uit het
# 3D EM-logo van de EML AI Team-site (Martijn, 31/10/2026). Uitsnede: het logo zelf, met een smalle rand van de
# gloed (de volle gloed maakt het logo op 32 px te klein). Het logo blijft ongewijzigd: alleen evenredig verkleind.
# Bron: branding/em-logo-3d.png (vrijstaand, zie branding/_bron/maak-em-logo-3d.py). Gebruik: python _bron/maak-iconen.py
import os
import numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'branding', 'em-logo-3d.png')
IMG = os.path.join(HERE, '..', 'assets', 'img')
NACHT = (24, 42, 72, 255)   # iets lichter dan #0B1526: anders valt het donkere metaal van de E weg op 32 px
logo = Image.open(SRC).convert('RGBA')
a = np.asarray(logo)[..., 3]
ys, xs = np.nonzero(a > 200)                     # het logo zelf (de gloed is halfdoorzichtig)
m = 6
logo = logo.crop((max(0, xs.min() - m), max(0, ys.min() - m), min(logo.width, xs.max() + m + 1), min(logo.height, ys.max() + m + 1)))

def icoon(size, breedte, rond):
    k = 4
    tegel = Image.new('RGBA', (size * k, size * k), (0, 0, 0, 0))
    ImageDraw.Draw(tegel).rounded_rectangle((0, 0, size * k - 1, size * k - 1), radius=int(size * k * rond), fill=NACHT)
    tegel = tegel.resize((size, size), Image.LANCZOS)
    w = round(size * breedte); h = round(w * logo.height / logo.width)
    tegel.alpha_composite(logo.resize((w, h), Image.LANCZOS), ((size - w) // 2, (size - h) // 2))
    return tegel

icoon(32, 0.94, 0.2).save(os.path.join(IMG, 'favicon.png'))
icoon(180, 0.8, 0).save(os.path.join(IMG, 'apple-touch-icon.png'))
print('favicon.png en apple-touch-icon.png gemaakt, uitsnede', logo.size)
