# Favicon (32 px, afgeronde donkere tegel) en apple-touch-icon (180 px, vierkant: iOS rondt zelf af) uit het gewone EM-logo
# (het blauw-groene logo van emlaunchpad.com). Martijn, 3/11/2026: "Zet het oude logo maar terug." Zelfde werkwijze als op
# 31/10 (STATUS "31/10 (nacht, 3)"). Het logo blijft ongewijzigd: alleen evenredig verkleind, niet herkleurd, niet bijgesneden.
# Bron: Websites/EMLaunchpad/_logo-em-src.png (438 x 278, uitgeknipt). Gebruik (in site-varianten/premium): python _bron/maak-iconen.py
import os
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', '..', '..', 'EMLaunchpad', '_logo-em-src.png')
IMG = os.path.join(HERE, '..', 'assets', 'img')
NACHT = (11, 21, 38, 255)   # #0B1526, de merkachtergrond
logo = Image.open(SRC).convert('RGBA')


def icoon(size, breedte, rond):
    k = 4  # tegel op 4x tekenen voor zachte hoeken, daarna verkleinen
    tegel = Image.new('RGBA', (size * k, size * k), (0, 0, 0, 0))
    ImageDraw.Draw(tegel).rounded_rectangle((0, 0, size * k - 1, size * k - 1), radius=int(size * k * rond), fill=NACHT)
    tegel = tegel.resize((size, size), Image.LANCZOS)
    w = round(size * breedte); h = round(w * logo.height / logo.width)
    tegel.alpha_composite(logo.resize((w, h), Image.LANCZOS), ((size - w) // 2, (size - h) // 2))
    return tegel


icoon(32, 0.84, 0.2).save(os.path.join(IMG, 'favicon.png'))
icoon(180, 0.74, 0).save(os.path.join(IMG, 'apple-touch-icon.png'))
print('favicon.png en apple-touch-icon.png gemaakt uit', os.path.normpath(SRC))
