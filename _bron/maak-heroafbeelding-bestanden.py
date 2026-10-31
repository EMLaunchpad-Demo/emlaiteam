# Zet de render van het 3D-gebouw (controle/heroafbeelding/render.png, uit controle/maak-heroafbeelding.mjs) om naar
# de beelden voor de gsm-hero: assets/img/hq-gebouw-720.webp, -1080.webp en -720.jpg. Gebruik: python _bron/maak-heroafbeelding-bestanden.py
import os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
src = Image.open(os.path.join(HERE, '..', 'controle', 'heroafbeelding', 'render.png')).convert('RGB').crop((0, 60, 1500, 1500))
img = os.path.join(HERE, '..', 'assets', 'img')
for w, q in ((720, 74), (1080, 72)):
    h = round(w * 1440 / 1500)
    p = os.path.join(img, f'hq-gebouw-{w}.webp'); src.resize((w, h), Image.LANCZOS).save(p, quality=q, method=6); print(p, os.path.getsize(p))
p = os.path.join(img, 'hq-gebouw-720.jpg'); src.resize((720, 691), Image.LANCZOS).save(p, quality=76, optimize=True, progressive=True); print(p, os.path.getsize(p))
