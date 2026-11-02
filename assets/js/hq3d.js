/* EML AI Team v4: het 3D-hoofdkwartier, versie 3 (2/11/2026: "nog realistischer"), met v4i (2/11/2026): het gebouw in het
   midden van het beeld (de uitleg staat in glaspanelen errond, zie site.css) en een achtergrond met sterren, een stad in de
   nevel en een zachte gloed aan de horizon.
   Laadt pas na de tekst: site.js importeert dit bestand na "load", in idle-tijd, alleen met WebGL en zonder "beweging verminderen".
   Alle texturen worden hier in code getekend (beton, bestrating, grind, tapijt, hout, aluminium, plafond, bladeren, schermen):
   geen foto's, niets gedownload. De spiegelingen komen uit een nachtscène met buurgebouwen, straatlicht en een gloed aan
   de horizon, die PMREMGenerator omzet in een omgevingskaart (alleen kernklassen van three, geen addons).
   Nieuw in versie 3: glas met Fresnel (schuin bekeken spiegelt het meer en zie je minder binnen) en ruiten die elk iets anders
   staan; verlaagd plafond met lichtpanelen; zachte lichtvlekken en contactschaduwen (gebakken lichtkaarten) op vloer en wand;
   gevel met aluminium boord, diepere stijlen, lamellen op de zijgevels en hier en daar een rolgordijn; bomen en planten uit
   bladkaarten; figuurtjes met echte verhoudingen; bureaustoelen met kruisvoet; nat glanzende bestrating; zachte gloed (bloom)
   op lampen, schermen en ledlijnen. De gloed is een eigen, kleine nabewerking: het beeld zelf wordt nog altijd rechtstreeks
   getekend, zodat het EM-logo op de luifel exact zijn kleuren houdt (geen tonemapping, geen gloed op het logo).
   Light (aanraakscherm vanaf 1024 px): minder detail, kleinere texturen, geen schaduwen, geen lampen per verdieping, geen gloed.
   Alles is voorbeeld, met verzonnen gegevens. */
import * as T from '../vendor/three/three-hq.min.js?v=4';

const FLOORS = [
  { key: 'sales', name: 'Sales en opvolging', acc: '#4fd394', wood: false, warm: true, tint: 0x75706a },
  { key: 'plan', name: 'Planning', acc: '#7fb0ff', wood: true, warm: false },
  { key: 'ks', name: 'Klantenservice', acc: '#4fd394', wood: false, warm: true, tint: 0x5f6979 },
  { key: 'mkt', name: 'Marketing', acc: '#7fb0ff', wood: true, warm: false },
  { key: 'adm', name: 'Administratie', acc: '#4fd394', wood: false, warm: true, tint: 0x71695e },
  { key: 'cs', name: 'Chief of Staff', acc: '#f4f1ea', wood: true, warm: true }
];
const W = 14, D = 9, H = 3.4, NF = FLOORS.length, ROOF = NF * H, TER = -0.15, GROUND = -0.5;
const FW = W - 0.4, FD = D - 0.4;          // vloer- en plafondvlak per verdieping
const CEIL = H - 0.42;                     // verlaagd plafond, gemeten vanaf de vloerplaat
const LIGHTS = [];                         // lichtpanelen 60 x 60 cm in het plafond (zelfde plaatsen op elke verdieping)
for (const z of [-2.6, 0, 2.6]) for (const x of [-5.2, -2.6, 0, 2.6, 5.2]) LIGHTS.push([x, z]);
const DESKS = [-4.4, 0, 4.4], DZ = 0.55;

/* ---------- procedurele texturen ---------- */
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function pix(w, h, fn) {
  const c = cnv(w, h), x = c.getContext('2d'), im = x.createImageData(w, h), d = im.data;
  for (let y = 0, p = 0; y < h; y++) for (let X = 0; X < w; X++, p += 4) { d[p + 3] = 255; fn(X, y, d, p); }
  x.putImageData(im, 0, 0);
  return c;
}
// naadloze waarderuis (value noise) met een paar octaven
function noise(size, cells, seed, fall = 0.55) {
  const r = rng(seed), out = new Float32Array(size * size);
  let amp = 1, tot = 0;
  for (const c of cells) {
    const g = new Float32Array(c * c);
    for (let i = 0; i < g.length; i++) g[i] = r();
    const s = c / size;
    for (let y = 0; y < size; y++) {
      const fy = y * s, y0 = fy | 0, ty = fy - y0, sy = ty * ty * (3 - 2 * ty), r0 = y0 * c, r1 = ((y0 + 1) % c) * c;
      for (let x = 0; x < size; x++) {
        const fx = x * s, x0 = fx | 0, tx = fx - x0, sx = tx * tx * (3 - 2 * tx), x1 = (x0 + 1) % c;
        const a = g[r0 + x0] + (g[r0 + x1] - g[r0 + x0]) * sx, b = g[r1 + x0] + (g[r1 + x1] - g[r1 + x0]) * sx;
        out[y * size + x] += (a + (b - a) * sy) * amp;
      }
    }
    tot += amp; amp *= fall;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
}
const cl = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

// fijn beton: weinig grote vlekken, wel poriën en korrel (de grote vlekken van versie 2 lieten het gebouw klein lijken)
function concreteCanvas(S) {
  const n = noise(S, [8, 16, 32, 64, 128], 3, 0.7), r = rng(5);
  return pix(S, S, (x, y, d, p) => {
    let v = 0.66 + (n[y * S + x] - 0.5) * 0.2 + (r() - 0.5) * 0.07;
    if (r() < 0.006) v *= 0.72;
    const c = v * 226; d[p] = cl(c); d[p + 1] = cl(c * 0.985); d[p + 2] = cl(c * 0.96);
  });
}
// betonplaten in halfsteens verband: 4 x 8 platen per tegel (1,2 x 0,6 m bij een tegel van 4,8 m)
function pavingCanvas(S) {
  const n = noise(S, [8, 16, 32, 64, 128], 9, 0.65), r = rng(13), rows = 8, cols = 4, rh = S / rows, cw = S / cols, j = Math.max(1, S / 300);
  const tone = []; for (let i = 0; i < rows * cols; i++) tone.push((r() - 0.5) * 0.16);
  return pix(S, S, (x, y, d, p) => {
    const row = (y / rh) | 0, xx = (x + (row % 2 ? cw / 2 : 0)) % S, col = (xx / cw) | 0;
    let v = 0.54 + tone[row * cols + col] + (n[y * S + x] - 0.5) * 0.26 + (r() - 0.5) * 0.07;
    const ey = Math.min(y % rh, rh - (y % rh)), ex = Math.min(xx % cw, cw - (xx % cw));
    if (ey < j || ex < j) v = 0.27 + (r() - 0.5) * 0.04;
    else if (ey < j * 2.5 || ex < j * 2.5) v *= 0.9; // afgeronde kanten
    const c = v * 232; d[p] = cl(c); d[p + 1] = cl(c * 0.98); d[p + 2] = cl(c * 0.95);
  });
}
// ruwheid van de bestrating: natte plekken glanzen (laag), voegen zijn ruw
function pavingRoughCanvas(S) {
  const n = noise(S, [4, 8, 16, 32], 17, 0.6), m = noise(S, [32, 64, 128], 19), rows = 8, cols = 4, rh = S / rows, cw = S / cols, j = Math.max(1, S / 300);
  return pix(S, S, (x, y, d, p) => {
    const row = (y / rh) | 0, xx = (x + (row % 2 ? cw / 2 : 0)) % S;
    const wet = Math.min(1, Math.max(0, (n[y * S + x] - 0.52) * 7));
    let v = 0.78 - wet * 0.5 + (m[y * S + x] - 0.5) * 0.15;
    if (y % rh < j || xx % cw < j) v = 0.95;
    const c = cl(v * 255); d[p] = c; d[p + 1] = c; d[p + 2] = c;
  });
}
// grind op het dak
function gravelCanvas(S) {
  const r = rng(61), n = noise(S, [16, 32, 64], 63);
  return pix(S, S, (x, y, d, p) => {
    const g = r(), v = 0.5 + (n[y * S + x] - 0.5) * 0.35 + (g - 0.5) * 0.42;
    const c = v * 200; d[p] = cl(c * 1.02); d[p + 1] = cl(c); d[p + 2] = cl(c * 0.95);
  });
}
// tapijttegels van 50 cm, om en om gedraaid
function carpetCanvas(S) {
  const n = noise(S, [16, 32, 64], 21), r = rng(23), t = S / 2;
  return pix(S, S, (x, y, d, p) => {
    const tile = (((x / t) | 0) + ((y / t) | 0)) % 2, stripe = tile ? Math.sin(x * 1.9) : Math.sin(y * 1.9);
    let v = 0.62 + (n[y * S + x] - 0.5) * 0.2 + (r() - 0.5) * 0.22 + stripe * 0.03 + (tile ? 0.02 : -0.02);
    if (x % t === 0 || y % t === 0) v *= 0.86;
    const c = cl(v * 230); d[p] = c; d[p + 1] = c; d[p + 2] = c;
  });
}
// eiken planken van 20 cm met nerf en stuiknaden (tegel van 1,6 m)
function woodCanvas(S) {
  const n = noise(S, [4, 8, 16, 32], 31), r = rng(37), rows = 8, rh = S / rows, plank = [];
  for (let i = 0; i < rows; i++) plank.push({ off: r() * S, len: S * (0.42 + r() * 0.4), tone: (r() - 0.5) * 0.16, s: r() * 50 });
  return pix(S, S, (x, y, d, p) => {
    const pk = plank[(y / rh) | 0], px = (x + pk.off) % S, seg = (px / pk.len) | 0, ex = px % pk.len;
    const grain = Math.sin(y * 0.55 + n[y * S + x] * 26 + pk.s + seg * 7) * 0.5 + 0.5;
    let v = 0.74 + pk.tone + (seg % 2 ? 0.05 : -0.02) - grain * 0.13 + (r() - 0.5) * 0.04;
    if (y % rh < 1 || ex < 1.2) v *= 0.55;
    d[p] = cl(v * 205); d[p + 1] = cl(v * 150); d[p + 2] = cl(v * 98);
  });
}
// geborsteld aluminium: fijne strepen in één richting
function aluCanvas(S) {
  const r = rng(41), col = new Float32Array(S);
  let a = 0;
  for (let x = 0; x < S; x++) { a = a * 0.7 + (r() - 0.5) * 0.3; col[x] = a; }
  return pix(S, S, (x, y, d, p) => { const c = cl((0.8 + col[x] * 0.35 + (r() - 0.5) * 0.06) * 235); d[p] = c; d[p + 1] = c; d[p + 2] = c; });
}
function grilleCanvas() {
  return pix(64, 64, (x, y, d, p) => { const v = y % 8 < 3 ? 70 : 190 + ((x * 7 + y * 3) % 11); d[p] = v; d[p + 1] = v; d[p + 2] = v + 4; });
}
function solarCanvas() {
  return pix(128, 128, (x, y, d, p) => { const line = x % 21 < 1 || y % 21 < 1 || x < 3 || y < 3 || x > 124 || y > 124; d[p] = line ? 150 : 22; d[p + 1] = line ? 160 : 38 + ((x + y) % 5); d[p + 2] = line ? 175 : 78; });
}
// bladkaart: een tros blaadjes op een doorzichtige achtergrond (rand blijft leeg, zodat je geen vierkantjes ziet)
function leafCanvas(S) {
  const c = cnv(S, S), x = c.getContext('2d'), r = rng(57), k = S / 256;
  for (let i = 0; i < 140; i++) {
    const a = r() * Math.PI * 2, rad = Math.sqrt(r()) * 100 * k, cx = S / 2 + Math.cos(a) * rad, cy = S / 2 + Math.sin(a) * rad;
    const len = (16 + r() * 14) * k, wid = len * (0.36 + r() * 0.14), rot = r() * Math.PI * 2, g = 0.75 + r() * 0.5;
    x.save(); x.translate(cx, cy); x.rotate(rot);
    x.beginPath(); x.moveTo(-len / 2, 0); x.quadraticCurveTo(0, -wid, len / 2, 0); x.quadraticCurveTo(0, wid, -len / 2, 0);
    x.fillStyle = `rgb(${cl(58 * g)},${cl(104 * g)},${cl(46 * g)})`; x.fill();
    x.strokeStyle = `rgba(150,190,110,${0.35 * g})`; x.lineWidth = 1 * k; x.beginPath(); x.moveTo(-len / 2, 0); x.lineTo(len / 2, 0); x.stroke();
    x.restore();
  }
  return c;
}
// schermen: twee varianten in één textuur (boven groen, onder blauw)
function uiCanvas() {
  const c = cnv(256, 256), x = c.getContext('2d');
  ['#4fd394', '#7fb0ff'].forEach((acc, k) => {
    const o = k * 128;
    x.fillStyle = '#0d1a30'; x.fillRect(0, o, 256, 128);
    x.fillStyle = '#18305a'; x.fillRect(0, o, 256, 18);
    x.fillStyle = acc; x.fillRect(8, o + 6, 28, 6);
    for (let i = 0; i < 5; i++) { x.fillStyle = 'rgba(214,226,244,.6)'; x.fillRect(10, o + 28 + i * 18, 80 + ((i * 37 + k * 20) % 60), 6); }
    x.fillStyle = acc;
    [0.5, 0.8, 0.35, 0.95, 0.6].forEach((v, i) => x.fillRect(158 + i * 18, o + 116 - v * 74, 11, v * 74));
  });
  return c;
}
function boardCanvas(name, acc, idx) {
  const c = cnv(512, 288), x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 288);
  g.addColorStop(0, '#15274a'); g.addColorStop(1, '#0b1629');
  x.fillStyle = g; x.fillRect(0, 0, 512, 288);
  x.fillStyle = acc; x.fillRect(28, 31, 12, 12);
  x.fillStyle = '#f3f6fa'; x.font = '700 38px Archivo, Arial, sans-serif'; x.fillText(name, 52, 46);
  x.fillStyle = 'rgba(174,188,203,.9)'; x.font = '20px "JetBrains Mono", Consolas, monospace'; x.fillText('VOORBEELD', 30, 84);
  ['Te doen', 'Bezig', 'Klaar'].forEach((h, k) => {
    const cx = 30 + k * 160, n = [3, 2, 3][(k + idx) % 3];
    x.fillStyle = 'rgba(174,188,203,.8)'; x.font = '17px "JetBrains Mono", Consolas, monospace'; x.fillText(h.toUpperCase(), cx, 122);
    for (let i = 0; i < n; i++) {
      x.fillStyle = k === 2 ? 'rgba(67,181,129,.32)' : 'rgba(47,116,224,.3)'; x.fillRect(cx, 136 + i * 46, 142, 36);
      x.fillStyle = 'rgba(243,246,250,.85)'; x.fillRect(cx + 10, 148 + i * 46, 64 + (((i + k + idx) * 23) % 56), 6);
      x.fillStyle = k === 2 ? '#4fd394' : acc; x.fillRect(cx + 10, 160 + i * 46, 22, 4);
    }
  });
  return c;
}
// uithangbord op de luifel: het 3D EM-logo van de site (Martijn, 31/10/2026), vrijstaand met gloed. Ongewijzigd sinds v2.
// De afbeelding laadt apart; tot ze er is, blijft het bord leeg (doorzichtig).
const SIGN_W = 512, SIGN_H = 323; // zelfde verhouding als assets/img/em-logo-3d-192.webp (304 x 192)
function signCanvas(onload) {
  const c = cnv(SIGN_W, SIGN_H), img = new Image();
  img.decoding = 'async';
  img.onload = () => { c.getContext('2d').drawImage(img, 0, 0, SIGN_W, SIGN_H); onload(); };
  img.src = 'assets/img/em-logo-3d-192.webp';
  return c;
}
function glowCanvas() {
  const c = cnv(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.22, 'rgba(255,255,255,.42)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return c;
}
// lichtplas op de grond: zachte, bijna gaussische val
function poolCanvas() {
  const c = cnv(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  [[0, 1], [0.2, 0.78], [0.4, 0.45], [0.6, 0.2], [0.8, 0.06], [1, 0]].forEach(([s, a]) => g.addColorStop(s, `rgba(255,255,255,${a})`));
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return c;
}
// zachte donkere rechthoek (contactschaduw), via shadowBlur zodat het overal werkt
function blobCanvas(w, h, pad) {
  const c = cnv(w, h), x = c.getContext('2d');
  x.shadowColor = '#000'; x.shadowBlur = pad * 0.85; x.shadowOffsetX = w; x.fillStyle = '#000';
  x.fillRect(pad - w, pad, w - pad * 2, h - pad * 2);
  return c;
}
// licht dat door de ruiten van het gelijkvloers op het terras valt: helder tegen de gevel, met de schaduw van de stijlen
function spillCanvas(bays) {
  const w = 512, h = 128, c = cnv(w, h), x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(255,255,255,.55)'); g.addColorStop(0.55, 'rgba(255,255,255,.14)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = 'destination-out';
  for (let b = 0; b <= bays; b++) {
    const cx = (b / bays) * w;
    x.beginPath(); x.moveTo(cx - 3, 0); x.lineTo(cx + 3, 0); x.lineTo(cx + 16, h); x.lineTo(cx - 16, h); x.closePath();
    x.fillStyle = 'rgba(0,0,0,.55)'; x.fill();
  }
  return c;
}
function fadeCanvas() {
  const c = cnv(256, 256), x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, '#fff'); g.addColorStop(0.3, '#fff'); g.addColorStop(0.7, '#5a5a5a'); g.addColorStop(1, '#000');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  return c;
}
// zachte vorm via shadowBlur (werkt in elke browser, ook zonder ctx.filter)
function soft(x, draw, blur, color) {
  x.save(); x.shadowColor = color; x.shadowBlur = blur; x.shadowOffsetX = 4000; x.translate(-4000, 0); x.fillStyle = color; draw(); x.restore();
}
/* gebakken licht: lichtvlekken onder de panelen en contactschaduwen onder de meubels (lichtkaart van de vloer) */
function floorLightCanvas(cs, tint, light) {
  const w = light ? 256 : 512, h = Math.round(w * FD / FW), c = cnv(w, h), x = c.getContext('2d'), M = w / FW;
  const X = (v) => (v + FW / 2) * M, Z = (v) => (v + FD / 2) * M;
  x.fillStyle = 'rgb(62,62,62)'; x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = 'lighter';
  for (const [px, pz] of LIGHTS) {
    const g = x.createRadialGradient(X(px), Z(pz), 0, X(px), Z(pz), 2.3 * M);
    g.addColorStop(0, 'rgba(255,255,255,.36)'); g.addColorStop(0.45, 'rgba(255,255,255,.15)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  }
  x.globalCompositeOperation = 'multiply';
  const band = (y0, y1, a, b) => { const g = x.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); x.fillStyle = g; x.fillRect(0, Math.min(y0, y1), w, Math.abs(y1 - y0)); };
  band(0, 0.8 * M, 'rgb(118,118,118)', 'rgb(255,255,255)');                    // hoek tegen de kernwand
  const rect = (cx, cz, sw, sd, col, b) => soft(x, () => x.fillRect(X(cx - sw / 2), Z(cz - sd / 2), sw * M, sd * M), b * M, col);
  const disc = (cx, cz, r, col, b) => soft(x, () => { x.beginPath(); x.arc(X(cx), Z(cz), r * M, 0, Math.PI * 2); x.fill(); }, b * M, col);
  if (!cs) {
    for (const dx of DESKS) {
      rect(dx, DZ, 2.3, 1.4, 'rgb(150,150,150)', 0.3);
      for (const s of [-1, 1]) disc(dx, DZ + s * 1.0, 0.3, 'rgb(175,175,175)', 0.12);
    }
    rect(4.3, -D / 2 + 0.5, 3.2, 0.5, 'rgb(120,120,120)', 0.18);
  } else {
    soft(x, () => { x.beginPath(); x.ellipse(X(1.2), Z(0.4), 2.1 * M, 0.95 * M, 0, 0, Math.PI * 2); x.fill(); }, 0.35 * M, 'rgb(150,150,150)');
    rect(-4.6, 2.75, 2.4, 1.0, 'rgb(120,120,120)', 0.2); rect(-4.6, 1.6, 1.0, 0.6, 'rgb(175,175,175)', 0.15);
    disc(-1.25, 0.4, 0.3, 'rgb(175,175,175)', 0.12); disc(3.65, 0.4, 0.3, 'rgb(175,175,175)', 0.12);
  }
  disc(W / 2 - 0.75, D / 2 - 0.8, 0.32, 'rgb(150,150,150)', 0.15); disc(-W / 2 + 0.75, -D / 2 + 0.9, 0.36, 'rgb(150,150,150)', 0.15);
  x.fillStyle = tint; x.fillRect(0, 0, w, h);
  return c;
}
// lichtkaart van de kernwand: donkerder in de hoeken met vloer en plafond, lichtbogen onder de panelen
function wallLightCanvas() {
  const w = 512, h = 128, c = cnv(w, h), x = c.getContext('2d'), gh = H - 0.3, M = h / gh;
  x.fillStyle = 'rgb(120,120,120)'; x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = 'lighter';
  for (const px of [-5.2, -2.6, 0, 2.6, 5.2]) {
    const cx = (px + FW / 2) / FW * w;
    x.save(); x.translate(cx, (H - 0.15 - CEIL) * M); x.scale(1, 2.2);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 0.9 * M * 1.6);
    g.addColorStop(0, 'rgba(255,255,255,.5)'); g.addColorStop(0.5, 'rgba(255,255,255,.18)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(-w, -h, w * 2, h * 2); x.restore();
  }
  x.globalCompositeOperation = 'multiply';
  let g = x.createLinearGradient(0, h, 0, h - 0.45 * M); g.addColorStop(0, 'rgb(130,130,130)'); g.addColorStop(1, 'rgb(255,255,255)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  return c;
}
// verlaagd plafond: kaart met de panelen en hun lichtkrans (emissive, vaste kaart over het hele plafond)
function ceilingGlowCanvas(seed, light) {
  const w = light ? 512 : 1024, h = Math.round(w * FD / FW), c = cnv(w, h), x = c.getContext('2d'), M = w / FW, r = rng(seed);
  x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
  for (const [px, pz] of LIGHTS) {
    const cx = (px + FW / 2) * M, cy = (FD / 2 - pz) * M, k = r() < 0.12 ? 0.55 : 0.92 + r() * 0.08;
    let g = x.createRadialGradient(cx, cy, 0, cx, cy, 1.25 * M);
    g.addColorStop(0, `rgba(255,255,255,${0.3 * k})`); g.addColorStop(0.35, `rgba(255,255,255,${0.11 * k})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    const s = 0.6 * M, v = Math.round(255 * k);
    x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(cx - s / 2, cy - s / 2, s, s);
    x.fillStyle = `rgba(0,0,0,.18)`; x.fillRect(cx - s / 2, cy - 0.5, s, 1); x.fillRect(cx - 0.5, cy - s / 2, 1, s); // diffusorraster
  }
  return c;
}
// plafondtegels van 60 cm (tegel van 1,2 m)
function ceilTileCanvas() {
  const r = rng(71);
  return pix(128, 128, (x, y, d, p) => { const line = x % 64 < 2 || y % 64 < 2; const v = line ? 168 : 228 + (r() - 0.5) * 14; d[p] = cl(v); d[p + 1] = cl(v * 0.99); d[p + 2] = cl(v * 0.965); });
}
/* omgeving voor de spiegelingen: nachtlucht met een warme gloed aan de horizon, een lage skyline, buurgebouwen met verlichte
   ramen en straatlicht. Het vangpunt ligt zo'n 11 m boven het plein, zodat de gevel de buren spiegelt en niet alleen de grond. */
function skyCanvas(light) {
  const w = light ? 512 : 1024, h = w / 2, c = cnv(w, h), x = c.getContext('2d'), r = rng(77), hz = h / 2, k = w / 1024;
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#02050c'); g.addColorStop(0.3, '#08132a'); g.addColorStop(0.44, '#1a2744'); g.addColorStop(0.49, '#3a3a48'); g.addColorStop(0.5, '#4a3e3c');
  g.addColorStop(0.53, '#1a1a20'); g.addColorStop(1, '#05060a');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  for (let X = 0; X < w;) {
    const bw = (14 + r() * 40) * k, bh = (6 + r() * r() * 40) * k;
    x.fillStyle = '#0a0e18'; x.fillRect(X, hz - bh, bw, bh + 2);
    for (let wy = hz - bh + 3 * k; wy < hz - 2; wy += 5 * k) for (let wx = X + 2 * k; wx < X + bw - 3 * k; wx += 5 * k) if (r() < 0.22) { x.fillStyle = r() < 0.6 ? '#ffc98a' : '#cfe0ff'; x.fillRect(wx, wy, 3 * k, 2.5 * k); }
    X += bw + r() * 6 * k;
  }
  return c;
}
// gevel van een buurgebouw (12 x 12 m per tegel): vensters van 1 m met stijlen, per verdieping aan of uit
function facadeCanvas(seed) {
  const S = 512, c = cnv(S, S), x = c.getContext('2d'), r = rng(seed), cols = 12, rows = 4, cw = S / cols, rh = S / rows;
  x.fillStyle = '#0a0f19'; x.fillRect(0, 0, S, S);
  for (let j = 0; j < rows; j++) {
    const floorOn = r() < 0.55 ? 0.15 + r() * 0.75 : 0, warm = r() < 0.6;
    for (let i = 0; i < cols; i++) {
      const on = r() < floorOn, k = 0.45 + r() * 0.4;
      x.fillStyle = on ? (warm ? `rgba(255,${(196 + r() * 34) | 0},${(130 + r() * 50) | 0},${k})` : `rgba(${(185 + r() * 30) | 0},${(212 + r() * 24) | 0},255,${k})`) : '#111827';
      x.fillRect(i * cw + 4, j * rh + rh * 0.22, cw - 8, rh * 0.62);
    }
  }
  return c;
}
function environment(renderer, light) {
  const s = new T.Scene(), trash = [], GY = -11;
  const tex = (c) => { const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; trash.push(t); return t; };
  s.add(new T.Mesh(new T.SphereGeometry(95, 48, 24), new T.MeshBasicMaterial({ map: tex(skyCanvas(light)), side: T.BackSide })));
  const ground = new T.Mesh(new T.CircleGeometry(95, 48).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: 0x0b0c10 }));
  ground.position.y = GY; s.add(ground);
  const bld = (w, h, x, z, seed, k) => {
    const t = tex(facadeCanvas(seed)); t.wrapS = t.wrapT = T.RepeatWrapping;
    const g = new T.PlaneGeometry(w, h), a = g.attributes.uv;
    for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * w / 12, a.getY(i) * h / 12);
    const m = new T.Mesh(g, new T.MeshBasicMaterial({ map: t, color: new T.Color(k, k, k) }));
    m.position.set(x, GY + h / 2, z); m.lookAt(0, GY + h / 2, 0); s.add(m);
  };
  const B = 1.35;
  bld(44 * B, 36 * B, -8 * B, 50 * B, 1, 1.05);   // voor, achter de camera
  bld(30 * B, 42 * B, 36 * B, 36 * B, 3, 1.1);    // schuin rechts voor
  bld(36 * B, 28 * B, 50 * B, 4 * B, 2, 1.0);     // rechts
  bld(28 * B, 22 * B, -40 * B, 34 * B, 6, 0.95);  // links voor
  bld(34 * B, 24 * B, -50 * B, -8 * B, 4, 0.9);   // links
  bld(40 * B, 32 * B, 8 * B, -52 * B, 5, 0.9);    // achter
  const lamp = new T.MeshBasicMaterial({ color: new T.Color(2.6, 1.8, 1.0) }), lg = new T.SphereGeometry(0.25, 8, 6);
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + 0.2, d = 24 + (i % 3) * 7; const m = new T.Mesh(lg, lamp); m.position.set(Math.cos(a) * d, GY + 5, Math.sin(a) * d); s.add(m); }
  const pool = new T.MeshBasicMaterial({ color: 0x3a2a1a, transparent: true, opacity: 0.6, map: tex(poolCanvas()), depthWrite: false });
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + 0.2, d = 24 + (i % 3) * 7; const m = new T.Mesh(new T.PlaneGeometry(9, 9).rotateX(-Math.PI / 2), pool); m.position.set(Math.cos(a) * d, GY + 0.05, Math.sin(a) * d); s.add(m); }
  const pm = new T.PMREMGenerator(renderer), rt = pm.fromScene(s, 0, 0.1, 200, { size: light ? 256 : 512 });
  pm.dispose();
  s.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  trash.forEach((t) => t.dispose());
  return rt.texture;
}

/* ---------- achtergrond (v4i): stad in de nevel en gloed aan de horizon ---------- */
// ramen van de stad in de verte (tegel van 24 x 24 m): per verdieping aan of uit, warm of koel
function cityWindowCanvas() {
  const S = 256, c = cnv(S, S), x = c.getContext('2d'), r = rng(311), cols = 20, rows = 12, cw = S / cols, rh = S / rows;
  x.fillStyle = '#0b1424'; x.fillRect(0, 0, S, S);
  for (let j = 0; j < rows; j++) {
    const fl = r() < 0.4 ? 0.15 + r() * 0.45 : 0.03;
    for (let i = 0; i < cols; i++) {
      if (r() < fl) { const warm = r() < 0.65, k = 0.5 + r() * 0.5; x.fillStyle = warm ? `rgba(255,${(190 + r() * 40) | 0},${(120 + r() * 50) | 0},${k})` : `rgba(${(180 + r() * 40) | 0},${(205 + r() * 30) | 0},255,${k})`; }
      else x.fillStyle = '#0f1a2c';
      x.fillRect(i * cw + 2, j * rh + rh * 0.25, cw - 4, rh * 0.55);
    }
  }
  return c;
}
// stad: hoe verder en hoe lager, hoe meer nevel (eigen mist, zodat de ramen nog zwak door de nevel schijnen)
const CITY_VS = `
uniform float uGround;
varying vec2 vUv; varying float vH;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  float far = clamp((length(wp.xz - cameraPosition.xz) - 200.0) / 200.0, 0.0, 1.0);
  float low = 1.0 - smoothstep(0.0, 30.0, wp.y - uGround);
  vH = clamp(0.66 + far * 0.24 + low * 0.18, 0.0, 0.95);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const CITY_FS = `
uniform sampler2D map; uniform vec3 uTint; uniform vec3 uHaze;
varying vec2 vUv; varying float vH;
void main() {
  vec3 c = texture2D(map, vUv).rgb * uTint;
  gl_FragColor = vec4(mix(c, uHaze, vH), 1.0);
  #include <colorspace_fragment>
}`;
// gloed en nevel aan de horizon: opgeteld licht, sterkst net boven de grond, met een trage zachte ruis
const HAZE_VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const HAZE_FS = `
uniform sampler2D tN; uniform float uT; uniform vec3 uCol; uniform vec3 uAcc;
varying vec2 vUv;
void main() {
  float y = vUv.y;
  float prof = smoothstep(0.12, 0.25, y) * (1.0 - smoothstep(0.25, 0.85, y));
  prof *= prof;
  float n = texture2D(tN, vec2(vUv.x * 5.0 + uT, y * 0.8 + uT * 0.3)).r;
  vec3 col = uCol * prof * (0.55 + 0.9 * n) + uAcc * prof * smoothstep(0.55, 0.9, n);
  gl_FragColor = vec4(col, 0.0);
}`;

/* ---------- glas: tint met Fresnel (eigen shader) ---------- */
const GLASS_VS = `
varying vec3 vN; varying vec3 vV; varying float vT;
#include <fog_pars_vertex>
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix) * normal); vV = cameraPosition - wp.xyz; vT = color.r;
  vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const GLASS_FS = `
uniform vec3 uCol; uniform float uMin; uniform float uMax;
varying vec3 vN; varying vec3 vV; varying float vT;
#include <common>
#include <fog_pars_fragment>
void main() {
  float c = abs(dot(normalize(vN), normalize(vV)));
  float f = pow(1.0 - c, 4.0);
  gl_FragColor = vec4(uCol * vT, mix(uMin, uMax, f) * vT);
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;
/* ---------- gloed (bloom): eigen nabewerking op halve resolutie ---------- */
const FS_VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const DOWN_FS = `uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
vec3 s(vec2 o) { return texture2D(tSrc, vUv + o * uTexel).rgb; }
void main() {
  vec3 col = s(vec2(0.0)) * 0.125 + (s(vec2(-2.0, 2.0)) + s(vec2(2.0, 2.0)) + s(vec2(-2.0, -2.0)) + s(vec2(2.0, -2.0))) * 0.03125
    + (s(vec2(0.0, 2.0)) + s(vec2(-2.0, 0.0)) + s(vec2(2.0, 0.0)) + s(vec2(0.0, -2.0))) * 0.0625
    + (s(vec2(-1.0, 1.0)) + s(vec2(1.0, 1.0)) + s(vec2(-1.0, -1.0)) + s(vec2(1.0, -1.0))) * 0.125;
  gl_FragColor = vec4(col, 1.0);
}`;
const UP_FS = `uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
void main() {
  vec2 t = uTexel;
  vec3 c = texture2D(tSrc, vUv + vec2(-t.x, t.y)).rgb + texture2D(tSrc, vUv + vec2(0.0, t.y)).rgb * 2.0 + texture2D(tSrc, vUv + t).rgb
    + texture2D(tSrc, vUv + vec2(-t.x, 0.0)).rgb * 2.0 + texture2D(tSrc, vUv).rgb * 4.0 + texture2D(tSrc, vUv + vec2(t.x, 0.0)).rgb * 2.0
    + texture2D(tSrc, vUv - t).rgb + texture2D(tSrc, vUv + vec2(0.0, -t.y)).rgb * 2.0 + texture2D(tSrc, vUv + vec2(t.x, -t.y)).rgb;
  gl_FragColor = vec4(c / 16.0, 1.0);
}`;
const COMP_FS = `uniform sampler2D tWide; uniform sampler2D tCore; uniform float uK; uniform float uCore; varying vec2 vUv;
void main() {
  vec3 b = texture2D(tWide, vUv).rgb * uK + texture2D(tCore, vUv).rgb * uCore;
  b = b / (1.0 + b * 0.5);
  gl_FragColor = vec4(b, 0.0);
}`;

export function start({ canvas, ride, steps, light = false, onReady }) {
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas, antialias: !light, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, light ? 1 : 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);
  renderer.info.autoReset = false;
  const shadows = !light;
  if (shadows) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true; }
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const scene = new T.Scene();
  scene.fog = new T.Fog(0x0b1526, 38, 128);
  const envTex = environment(renderer, light);
  scene.environment = envTex;
  scene.environmentIntensity = light ? 0.9 : 0.7;
  const camera = new T.PerspectiveCamera(36, 1, 0.1, 600);

  scene.add(new T.HemisphereLight(0x9db6e6, 0x1b1712, light ? 1.3 : 0.6));
  const moon = new T.DirectionalLight(0xc8d6ff, light ? 1.8 : 2.2);
  moon.position.set(-18, 34, 26); moon.target.position.set(0, 7, 0);
  scene.add(moon, moon.target);
  if (shadows) {
    moon.castShadow = true;
    const sc = moon.shadow.camera;
    moon.shadow.mapSize.set(2048, 2048);
    sc.left = -22; sc.right = 22; sc.top = 24; sc.bottom = -22; sc.near = 4; sc.far = 95;
    moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.03; moon.shadow.radius = 3;
  }

  /* texturen en materialen */
  const S = light ? 256 : 512;
  const tx = (c, srgb = true) => { const t = new T.CanvasTexture(c); if (srgb) t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = aniso; return t; };
  const tc = (c, srgb = true) => { const t = new T.CanvasTexture(c); if (srgb) t.colorSpace = T.SRGBColorSpace; t.anisotropy = aniso; return t; };
  const t1 = (c, srgb = true) => { const t = tc(c, srgb); t.channel = 1; return t; }; // tweede uv-set (0..1 over het vlak)
  const tConcrete = tx(concreteCanvas(S)), tPave = tx(pavingCanvas(S)), tPaveR = tx(pavingRoughCanvas(S), false), tWood = tx(woodCanvas(S));
  const tCarpet = tx(carpetCanvas(light ? 128 : 256)), tAlu = tx(aluCanvas(128)), tGlow = tc(glowCanvas()), tPool = tc(poolCanvas());
  const tLeaf = tc(leafCanvas(light ? 128 : 256));
  const std = (o) => new T.MeshStandardMaterial(o);
  const basic = (o) => new T.MeshBasicMaterial(o);
  const mat = {
    concrete: std({ map: tConcrete, bumpMap: tConcrete, bumpScale: 0.6, roughnessMap: tConcrete, color: 0xe6e3dd, roughness: 1.2 }),
    concreteD: std({ map: tConcrete, bumpMap: tConcrete, bumpScale: 0.6, roughnessMap: tConcrete, color: 0x8f8d89, roughness: 1.25 }),
    pave: std({ map: tPave, bumpMap: tPave, bumpScale: 0.9, roughnessMap: tPaveR, color: 0xd2cdc5, roughness: 1 }),
    gravel: std({ map: tx(gravelCanvas(light ? 128 : 256)), bumpMap: null, color: 0x9a978f, roughness: 0.95 }),
    alu: std({ map: tAlu, roughnessMap: tAlu, color: 0xccd2d9, metalness: 0.62, roughness: 0.36 }),
    // gevelprofielen: geanodiseerd aluminium, donkerder dan de reling, met een zachte glans
    frame: std({ map: tAlu, roughnessMap: tAlu, color: 0xa3aab2, metalness: 0.4, roughness: 0.5 }),
    fascia: std({ color: 0x3a4049, metalness: 0.5, roughness: 0.4 }),
    // glas in twee lagen: tint die met de kijkhoek dichter wordt (Fresnel) en daarbovenop de spiegeling, opgeteld
    glass: new T.ShaderMaterial({
      uniforms: T.UniformsUtils.merge([T.UniformsLib.fog, { uCol: { value: new T.Color(0x0a1729) }, uMin: { value: 0.2 }, uMax: { value: 0.86 } }]),
      vertexShader: GLASS_VS, fragmentShader: GLASS_FS, vertexColors: true, transparent: true, depthWrite: false, fog: true
    }),
    glassRefl: new T.MeshPhysicalMaterial({ color: 0x000000, metalness: 0, roughness: 0.04, ior: 1.5, specularIntensity: 1, specularColor: new T.Color(2, 2, 2), envMap: envTex, envMapIntensity: 1.3, transparent: true, depthWrite: false,
      blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneFactor, blendSrcAlpha: T.ZeroFactor, blendDstAlpha: T.OneFactor }),
    blind: std({ color: 0xd9d3c7, roughness: 0.95, emissive: 0x2a241b }),
    wall: std({ color: 0xe8e4dc, roughness: 0.92 }),
    wallFace: std({ color: 0xe8e4dc, roughness: 0.92, lightMap: t1(wallLightCanvas()), lightMapIntensity: 2.4 }),
    deskW: std({ color: 0xefece5, roughness: 0.42 }),
    deskWood: std({ map: tWood, roughness: 0.5 }),
    fabric: std({ color: 0x29384f, roughness: 0.96 }),
    seat: std({ color: 0x222a36, roughness: 0.9 }),
    dark: std({ color: 0x1e242e, metalness: 0.55, roughness: 0.42 }),
    bark: std({ color: 0x3a2d22, roughness: 0.95 }),
    pot: std({ color: 0xe6e1d8, roughness: 0.5 }),
    soil: std({ color: 0x2a2018, roughness: 1 }),
    // alphaToCoverage (met MSAA op desktop): zachte bladranden en een kruin die ook van ver dicht blijft
    foliage: std({ map: tLeaf, alphaTest: light ? 0.5 : 0.35, alphaToCoverage: !light, vertexColors: true, roughness: 0.78 }),
    unit: std({ map: tx(grilleCanvas()), color: 0xb7bdc4, metalness: 0.5, roughness: 0.48 }),
    solar: std({ map: tc(solarCanvas()), metalness: 0.4, roughness: 0.16 }),
    warm: basic({ color: 0xffe3c2 }),
    screen: basic({ map: tc(uiCanvas()), toneMapped: false }),
    sign: basic({ transparent: true, toneMapped: false, depthWrite: false }),
    glowW: basic({ map: tPool, color: 0xffc78a, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.42, fog: false }),
    ledOn: basic({ color: 0x4fd394, toneMapped: false }),
    ledOff: basic({ color: 0x24395a }),
    task: basic({ color: 0x4fd394, toneMapped: false }),
    taskB: basic({ color: 0x7fb0ff, toneMapped: false })
  };
  mat.glass.uniforms.uCol.value.convertSRGBToLinear();
  const tTile = tx(ceilTileCanvas());
  const ceilMat = (warm, seed) => std({ map: tTile, color: 0xffffff, roughness: 0.9, emissive: warm ? 0xffdcb0 : 0xdfe9ff, emissiveIntensity: 1.7, emissiveMap: t1(ceilingGlowCanvas(seed, light)) });
  mat.ceilW = ceilMat(true, 81); mat.ceilC = ceilMat(false, 83);

  /* geometrie: alles wat stilstaat wordt per materiaal samengevoegd tot één mesh (weinig tekenopdrachten) */
  const RU = rng(99), bk = {};
  const add = (k, g) => { (bk[k] || (bk[k] = [])).push(g); return g; };
  const FACE = [[2, 1], [2, 1], [0, 2], [0, 2], [0, 1], [0, 1]];
  // doos met UV's in meters (u = herhalingen per meter), zodat texturen niet uitrekken
  function bx(w, h, d, x, y, z, u = 0.25, ry = 0) {
    const g = new T.BoxGeometry(w, h, d), a = g.attributes.uv, dm = [w, h, d];
    for (let f = 0; f < 6; f++) {
      const su = dm[FACE[f][0]] * u, sv = dm[FACE[f][1]] * u, ou = RU(), ov = RU();
      for (let k = f * 4; k < f * 4 + 4; k++) a.setXY(k, a.getX(k) * su + ou, a.getY(k) * sv + ov);
    }
    if (ry) g.rotateY(ry);
    return g.translate(x, y, z);
  }
  const fr = (w, h, d, x, y, z, ry = 0) => add('frame', bx(w, h, d, x, y, z, 1, ry));
  const ab = (w, h, d, x, y, z, ry = 0) => add('alu', bx(w, h, d, x, y, z, 1, ry));
  function pl(w, h, u = 0.25) { const g = new T.PlaneGeometry(w, h), a = g.attributes.uv; for (let k = 0; k < a.count; k++) a.setXY(k, a.getX(k) * w * u, a.getY(k) * h * u); return g; }
  // vlak met een tweede uv-set van 0 tot 1 (voor lichtkaarten en de plafondkaart)
  function pl1(w, h, u = 0.25) { const g = new T.PlaneGeometry(w, h); g.setAttribute('uv1', g.attributes.uv.clone()); const a = g.attributes.uv; for (let k = 0; k < a.count; k++) a.setXY(k, a.getX(k) * w * u, a.getY(k) * h * u); return g; }
  const cyl = (rt, rb, h, x, y, z, seg = 16) => new T.CylinderGeometry(rt, rb, h, seg).translate(x, y, z);
  function merge(list) {
    let nv = 0, ni = 0;
    const col = !!list[0].attributes.color, u1 = !!list[0].attributes.uv1;
    for (const g of list) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
    const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), U = new Float32Array(nv * 2), C = col ? new Float32Array(nv * 3) : null, U1 = u1 ? new Float32Array(nv * 2) : null, I = new Uint32Array(ni);
    let v = 0, i = 0;
    for (const g of list) {
      const n = g.attributes.position.count;
      P.set(g.attributes.position.array, v * 3); N.set(g.attributes.normal.array, v * 3); U.set(g.attributes.uv.array, v * 2);
      if (C) C.set(g.attributes.color.array, v * 3);
      if (U1) U1.set(g.attributes.uv1.array, v * 2);
      if (g.index) { const ix = g.index.array; for (let k = 0; k < ix.length; k++) I[i + k] = ix[k] + v; i += ix.length; } else { for (let k = 0; k < n; k++) I[i + k] = v + k; i += n; }
      v += n; g.dispose();
    }
    const m = new T.BufferGeometry();
    m.setAttribute('position', new T.BufferAttribute(P, 3)); m.setAttribute('normal', new T.BufferAttribute(N, 3)); m.setAttribute('uv', new T.BufferAttribute(U, 2));
    if (C) m.setAttribute('color', new T.BufferAttribute(C, 3));
    if (U1) m.setAttribute('uv1', new T.BufferAttribute(U1, 2));
    m.setIndex(new T.BufferAttribute(I, 1));
    m.computeBoundingSphere();
    return m;
  }
  const world = new T.Group();
  scene.add(world);
  const hideInPrepass = [];
  function flush(k, m, cast = true, recv = true, order = 0) {
    if (!bk[k]) return null;
    const o = new T.Mesh(merge(bk[k]), m);
    o.castShadow = cast && shadows; o.receiveShadow = recv && shadows; o.renderOrder = order;
    o.matrixAutoUpdate = false; o.updateMatrix();
    world.add(o); delete bk[k];
    return o;
  }
  const flat = (g) => g.rotateX(-Math.PI / 2);
  const glowAt = (r, x, y, z) => add('glowW', flat(new T.PlaneGeometry(r * 2, r * 2)).translate(x, y, z));
  const tilt = (g, a) => { // ruit iets scheef: de normaal draait een fractie van een graad, zodat elke ruit iets anders spiegelt
    const ax = (RU() - 0.5) * a, ay = (RU() - 0.5) * a, az = (RU() - 0.5) * a, n = g.attributes.normal;
    for (let k = 0; k < n.count; k++) { const x = n.getX(k) + ax, y = n.getY(k) + ay, z = n.getZ(k) + az, l = Math.hypot(x, y, z); n.setXYZ(k, x / l, y / l, z / l); }
  };
  // bladkaarten rond een kruin: elke kaart dubbel (voor en achter) met normalen naar buiten, zodat de kruin zacht belicht wordt
  const leafIdx = [0, 2, 1, 2, 3, 1], leafIdxB = [0, 1, 2, 2, 1, 3];
  function crown(cx, cy, cz, rx, ry, rz, n, size) {
    if (light) n = Math.round(n * 0.55);
    for (let i = 0; i < n; i++) {
      const u = RU() * 2 - 1, th = RU() * Math.PI * 2, s = Math.sqrt(1 - u * u), rr = 0.45 + 0.55 * Math.cbrt(RU());
      const dx = s * Math.cos(th) * rr, dy = u * rr, dz = s * Math.sin(th) * rr;
      const g = new T.PlaneGeometry(size * (0.75 + RU() * 0.5), size * (0.75 + RU() * 0.5));
      g.rotateZ(RU() * 6.28); g.rotateX(RU() * 3.14); g.rotateY(RU() * 6.28);
      g.translate(cx + dx * rx, cy + dy * ry, cz + dz * rz);
      let nx = dx / rx, ny = dy / ry + 0.35, nz = dz / rz; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      const nn = g.attributes.normal; for (let k = 0; k < 4; k++) nn.setXYZ(k, nx, ny, nz);
      const tone = 0.5 + 0.5 * rr + (dy > 0 ? 0.12 : -0.05), hue = RU();
      const C = new Float32Array(12); for (let k = 0; k < 4; k++) { C[k * 3] = tone * (0.85 + hue * 0.3); C[k * 3 + 1] = tone; C[k * 3 + 2] = tone * (0.8 + hue * 0.15); }
      g.setAttribute('color', new T.BufferAttribute(C, 3));
      const b = g.clone(); b.setIndex(leafIdxB); g.setIndex(leafIdx);
      add('foliage', g); add('foliage', b);
    }
  }

  /* plein en terras: bestrating die zacht wegvloeit in de donkere lucht (geen raster) */
  let plaza;
  {
    const tP = tPave.clone(), tR = tPaveR.clone(); tP.repeat.set(22, 22); tR.repeat.set(22, 22); tP.needsUpdate = tR.needsUpdate = true;
    const m = std({ map: tP, bumpMap: tP, bumpScale: 0.9, roughnessMap: tR, color: 0xaaa69f, roughness: 1, transparent: true, alphaMap: tc(fadeCanvas(), false), depthWrite: false });
    plaza = new T.Mesh(flat(new T.CircleGeometry(52, light ? 40 : 72)), m);
    plaza.position.set(0, GROUND, 4); plaza.renderOrder = -3; plaza.receiveShadow = shadows;
    world.add(plaza); hideInPrepass.push(plaza);
  }
  /* achtergrond (v4i): sterren, een stad in de verte in de nevel en een zachte gloed aan de horizon. Beweegt nauwelijks:
     het gebouw blijft de blikvanger. Blauw uur; groen alleen als klein accent in de nevel. */
  const bgObjs = {};
  {
    // donkere grond tot aan de stad; verdwijnt in de mist
    const gnd = new T.Mesh(flat(new T.CircleGeometry(430, 48)), basic({ color: 0x0a1222 }));
    gnd.position.y = GROUND - 0.06; gnd.renderOrder = -5; world.add(gnd);
    // stad: lage en hoge blokken op 230 tot 380 m, dichter achter het gebouw (gezien vanaf de camera)
    const r = rng(303), city = [], back = Math.atan2(-36, -26);
    for (let i = 0; i < (light ? 100 : 170); i++) {
      const a = back + (r() - 0.5) * Math.PI * (r() < 0.7 ? 1.1 : 2), d = 230 + r() * 150;
      const w = 14 + r() * 20, dd = 12 + r() * 16, h = 8 + r() * r() * 38 + (Math.abs(a - back) < 0.45 ? r() * r() * 30 : 0);
      city.push(bx(w, h, dd, Math.cos(a) * d, GROUND + h / 2, Math.sin(a) * d, 1 / 24, -a));
    }
    const cityG = merge(city);
    const tWin = new T.CanvasTexture(cityWindowCanvas()); tWin.colorSpace = T.SRGBColorSpace; tWin.wrapS = tWin.wrapT = T.RepeatWrapping; tWin.anisotropy = aniso;
    const cityM = new T.ShaderMaterial({ uniforms: { map: { value: tWin }, uTint: { value: new T.Color(0.6, 0.6, 0.66) }, uHaze: { value: new T.Color(0x0e1c33).convertSRGBToLinear() }, uGround: { value: GROUND } }, vertexShader: CITY_VS, fragmentShader: CITY_FS });
    const cityMesh = new T.Mesh(cityG, cityM); cityMesh.matrixAutoUpdate = false; world.add(cityMesh);
    // nevel en gloed aan de horizon: een open cilinder rond alles, opgeteld licht met trage, zachte ruis
    const tN = new T.CanvasTexture(pix(256, 64, (() => { const n = noise(256, [8, 16, 32], 404); return (x, y, d, p) => { const v = cl(n[(y * 4 % 256) * 256 + x] * 255); d[p] = d[p + 1] = d[p + 2] = v; }; })()));
    tN.wrapS = tN.wrapT = T.RepeatWrapping;
    const hazeM = new T.ShaderMaterial({ uniforms: { tN: { value: tN }, uT: { value: 0 }, uCol: { value: new T.Color(0x3a5c9a).convertSRGBToLinear().multiplyScalar(1.25) }, uAcc: { value: new T.Color(0x1f9e5f).convertSRGBToLinear().multiplyScalar(0.18) } },
      vertexShader: HAZE_VS, fragmentShader: HAZE_FS, transparent: true, depthWrite: false, side: T.BackSide,
      blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneFactor, blendSrcAlpha: T.ZeroFactor, blendDstAlpha: T.OneFactor });
    const haze = new T.Mesh(new T.CylinderGeometry(215, 215, 70, 72, 1, true), hazeM);
    haze.position.y = GROUND + 20; haze.renderOrder = -4; world.add(haze);
    // sterren: oneindig ver (volgen de camera), zwakker bij de horizon
    const N = light ? 450 : 1000, P3 = new Float32Array(N * 3), C3 = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const u = 0.05 + Math.pow(r(), 0.8) * 0.95, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u), R = 560;
      P3[i * 3] = Math.cos(th) * s * R; P3[i * 3 + 1] = u * R; P3[i * 3 + 2] = Math.sin(th) * s * R;
      const b = (0.25 + Math.pow(r(), 3) * 0.85) * Math.min(1, (u - 0.05) * 5), warm = r() < 0.25;
      C3[i * 3] = b * (warm ? 1 : 0.86); C3[i * 3 + 1] = b * (warm ? 0.92 : 0.92); C3[i * 3 + 2] = b * (warm ? 0.8 : 1);
    }
    const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(P3, 3)); sg.setAttribute('color', new T.BufferAttribute(C3, 3));
    const stars = new T.Points(sg, new T.PointsMaterial({ size: 3.2, sizeAttenuation: false, map: tGlow, vertexColors: true, transparent: true, depthWrite: false, fog: false,
      blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.SrcAlphaFactor, blendDst: T.OneFactor, blendSrcAlpha: T.ZeroFactor, blendDstAlpha: T.OneFactor }));
    stars.frustumCulled = false; stars.renderOrder = -6; scene.add(stars);
    // straatlantaarns tussen het plein en de stad: een paar lanen en een ringweg, klein en warm, zwakker in de verte
    const LP = [], LC = [], sLamp = (x, z, d) => { const k = Math.max(0.18, 0.95 - (d - 60) / 260); LP.push(x, GROUND + 5, z); LC.push(k, k * 0.78, k * 0.5); };
    for (const a of [back + 0.33, back - 0.38, back + 1.05, back - 1.15, back + 1.9]) for (let d = 64; d < 212; d += 8.5) for (const sd of [-6, 6]) sLamp(Math.cos(a) * d - Math.sin(a) * sd, Math.sin(a) * d + Math.cos(a) * sd, d);
    for (let a = back - 1.6; a < back + 1.6; a += 0.045) sLamp(Math.cos(a) * 128, Math.sin(a) * 128, 128);
    const slg = new T.BufferGeometry(); slg.setAttribute('position', new T.BufferAttribute(new Float32Array(LP), 3)); slg.setAttribute('color', new T.BufferAttribute(new Float32Array(LC), 3));
    const streetLamps = new T.Points(slg, stars.material.clone()); streetLamps.material.size = light ? 2.4 : 2.8; streetLamps.frustumCulled = false; world.add(streetLamps);
    Object.assign(bgObjs, { stars, hazeM });
    hideInPrepass.push(haze, stars, streetLamps);
  }
  const tw = W + 9, td = D + 11, tz = 2;
  add('concreteD', bx(tw, TER - GROUND - 0.04, td, 0, (GROUND + TER - 0.04) / 2, tz));
  add('pave', bx(tw, 0.04, td, 0, TER - 0.02, tz, 1 / 4.8));
  add('concreteD', bx(tw, (TER - GROUND) / 2, 0.5, 0, GROUND + (TER - GROUND) / 4, tz + td / 2 + 0.25));
  // contactschaduwen: onder het gebouw, onder het terras, onder plantenbakken, bank en paaltjes
  const tBlob = tc(blobCanvas(256, 192, 40)), tBlobS = tc(blobCanvas(64, 64, 20));
  {
    const bm = basic({ map: tBlob, color: 0x000000, transparent: true, depthWrite: false, opacity: 0.62 });
    const a = new T.Mesh(flat(new T.PlaneGeometry((W + 0.5) * 256 / 176, (D + 0.5) * 192 / 112)), bm);
    a.position.set(0, TER + 0.012, 0); a.renderOrder = -2; world.add(a);
    const b = new T.Mesh(flat(new T.PlaneGeometry(tw * 256 / 176, td * 192 / 112)), bm.clone());
    b.material.opacity = 0.5; b.position.set(0, GROUND + 0.01, tz); b.renderOrder = -2; world.add(b);
    hideInPrepass.push(a, b);
  }
  const blobAt = (w, d, x, y, z) => add('blobS', flat(new T.PlaneGeometry(w, d)).translate(x, y, z));

  /* verdiepingen */
  const leds = [], lamps = [], boards = [];
  const pane = (w, h, x, y, z, ry, tint) => {
    const g = pl(w, h, 1);
    if (ry) g.rotateY(ry);
    g.translate(x, y, z);
    tilt(g, 0.03);
    g.setAttribute('color', new T.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(tint), 3));
    add('glass', g);
  };
  // rolgordijn achter een ruit (hier en daar, kort, zodat de borden zichtbaar blijven)
  const blind = (w, top, x, z, ry) => { const h = 0.18 + RU() * 0.3, g = new T.PlaneGeometry(w - 0.06, h); if (ry) g.rotateY(ry); add('blind', g.translate(x, top - h / 2, z)); add('dark', bx(w - 0.04, 0.05, 0.05, x, top - h - 0.01, z, 1, ry)); };
  function screen(x, top, z, ry, variant, sw = 0.64, sh = 0.38) {
    const sx = Math.sin(ry), sz = Math.cos(ry), g = new T.PlaneGeometry(sw, sh), a = g.attributes.uv;
    for (let k = 0; k < a.count; k++) a.setY(k, a.getY(k) * 0.5 + (variant ? 0 : 0.5));
    g.rotateY(ry); g.translate(x + sx * 0.016, top + 0.34, z + sz * 0.016);
    add('screen', g);
    add('dark', bx(sw + 0.04, sh + 0.04, 0.025, x, top + 0.34, z, 1, ry));
    add('dark', bx(0.04, 0.2, 0.04, x - sx * 0.04, top + 0.1, z - sz * 0.04, 1));
    add('dark', bx(0.22, 0.015, 0.16, x - sx * 0.04, top + 0.02, z - sz * 0.04, 1, ry));
    add('dark', bx(0.44, 0.018, 0.14, x + sx * 0.3, top + 0.03, z + sz * 0.3, 1, ry));
  }
  // bureaustoel: zitkussen, rugleuning op een steun, gasveer en kruisvoet met vijf wieltjes
  function chair(x, fy, z, ry) {
    const sx = Math.sin(ry), sz = Math.cos(ry);
    add('seat', bx(0.48, 0.08, 0.46, x, fy + 0.47, z, 1, ry));
    add('seat', bx(0.46, 0.5, 0.06, x - sx * 0.26, fy + 0.86, z - sz * 0.26, 1, ry));
    add('dark', bx(0.05, 0.34, 0.03, x - sx * 0.25, fy + 0.62, z - sz * 0.25, 1, ry));
    add('dark', bx(0.2, 0.05, 0.2, x, fy + 0.41, z, 1, ry));
    add('alu', cyl(0.022, 0.022, 0.3, x, fy + 0.25, z, 8));
    if (!light) for (let k = 0; k < 5; k++) {
      const a = ry + k * 1.2566;
      add('dark', bx(0.04, 0.035, 0.3, x + Math.sin(a) * 0.15, fy + 0.085, z + Math.cos(a) * 0.15, 1, a));
      add('dark', cyl(0.025, 0.025, 0.05, x + Math.sin(a) * 0.29, fy + 0.04, z + Math.cos(a) * 0.29, 8));
    } else { add('dark', bx(0.56, 0.035, 0.06, x, fy + 0.05, z, 1)); add('dark', bx(0.06, 0.035, 0.56, x, fy + 0.05, z, 1)); }
  }
  function plant(x, fy, z, s = 1) {
    add('pot', cyl(0.24 * s, 0.18 * s, 0.5 * s, x, fy + 0.25 * s, z, 18));
    add('soil', cyl(0.22 * s, 0.22 * s, 0.02, x, fy + 0.48 * s, z, 18));
    add('bark', cyl(0.012 * s, 0.018 * s, 0.5 * s, x, fy + 0.72 * s, z, 6));
    crown(x, fy + 1.02 * s, z, 0.34 * s, 0.42 * s, 0.34 * s, 30, 0.3 * s);
  }
  const ceilW = [], ceilC = [];
  FLOORS.forEach((f, i) => {
    const y = i * H, y0 = y + 0.15, yt = y + H - 0.15, gh = yt - y0, gc = (y0 + yt) / 2;
    // vloerplaat in beton; aan de buitenkant een aluminium boord (bekleding) met een ledlijn
    add('concrete', bx(W + 0.42, 0.3, D + 0.42, 0, y, 0));
    const fy0 = i === 0 ? TER : y - 0.4, fy1 = y + 0.12, fh = fy1 - fy0, fcy = (fy0 + fy1) / 2;
    add('fascia', bx(W + 0.5, fh, 0.06, 0, fcy, D / 2 + 0.22, 0.25)); add('fascia', bx(W + 0.5, fh, 0.06, 0, fcy, -D / 2 - 0.22, 0.25));
    add('fascia', bx(0.06, fh, D + 0.5, W / 2 + 0.22, fcy, 0, 0.25)); add('fascia', bx(0.06, fh, D + 0.5, -W / 2 - 0.22, fcy, 0, 0.25));
    if (i > 0) { ab(W + 0.52, 0.025, 0.06, 0, fy1 + 0.012, D / 2 + 0.22); ab(0.06, 0.025, D + 0.52, W / 2 + 0.22, fy1 + 0.012, 0); ab(0.06, 0.025, D + 0.52, -W / 2 - 0.22, fy1 + 0.012, 0); }
    // vloer: tapijt of hout, met gebakken licht (lichtvlekken onder de panelen, schaduw onder de meubels)
    const tint = f.warm ? 'rgb(255,232,204)' : 'rgb(222,232,255)';
    const lm = t1(floorLightCanvas(f.key === 'cs', tint, light));
    const fm = f.wood ? std({ map: tWood, roughness: 0.5, lightMap: lm, lightMapIntensity: 2.6 }) : std({ map: tCarpet, color: f.tint, roughness: 1, lightMap: lm, lightMapIntensity: 2.6 });
    const fl = new T.Mesh(flat(pl1(FW, FD, f.wood ? 1 / 1.6 : 1)), fm);
    fl.position.y = y + 0.16; fl.receiveShadow = shadows; world.add(fl);
    // verlaagd plafond met lichtpanelen (warm of koel per verdieping); daarboven het plenum achter de boord
    (f.warm ? ceilW : ceilC).push(pl1(FW, FD, 1 / 1.2).rotateX(Math.PI / 2).translate(0, y + CEIL, 0));
    // kernwand achteraan, met een lichtkaart op de voorkant
    add('wall', bx(W - 0.4, gh, 0.22, 0, gc, -D / 2 + 0.11, 0.5));
    add('wallFace', pl1(FW, gh, 0.5).translate(0, gc, -D / 2 + 0.223));
    // glas: voorgevel 7 vakken, zijgevels 4 vakken; op het gelijkvloers is vak 5 de inkom
    for (let b = 0; b < 7; b++) {
      if (i === 0 && b === 4) continue;
      pane(1.98, gh, -6 + b * 2, gc, D / 2, 0, 0.82 + RU() * 0.24);
      if (RU() < 0.28) blind(1.98, yt - 0.03, -6 + b * 2, D / 2 - 0.06, 0);
    }
    for (let b = 0; b < 4; b++) {
      const z = -D / 2 + 1.125 + b * 2.25;
      pane(2.23, gh, W / 2, gc, z, Math.PI / 2, 0.82 + RU() * 0.24);
      pane(2.23, gh, -W / 2, gc, z, -Math.PI / 2, 0.82 + RU() * 0.24);
      if (RU() < 0.25) blind(2.23, yt - 0.03, W / 2 - 0.06, z, Math.PI / 2);
    }
    // stijlen en regels: diepere profielen met een drukprofiel aan de buitenkant
    for (let b = 0; b <= 7; b++) { const c = b === 0 || b === 7; fr(c ? 0.16 : 0.065, gh, c ? 0.2 : 0.2, -7 + b * 2, gc, D / 2 + 0.05); }
    for (let b = 1; b < 4; b++) { const z = -D / 2 + b * 2.25; fr(0.2, gh, 0.065, W / 2 + 0.05, gc, z); fr(0.2, gh, 0.065, -W / 2 - 0.05, gc, z); }
    fr(0.18, gh, 0.18, W / 2, gc, -D / 2); fr(0.18, gh, 0.18, -W / 2, gc, -D / 2);
    for (const hy of [y0 + 0.04, yt - 0.04, yt - 0.55]) { fr(W + 0.1, 0.065, 0.16, 0, hy, D / 2 + 0.04); fr(0.16, 0.065, D, W / 2 + 0.04, hy, 0); fr(0.16, 0.065, D, -W / 2 - 0.04, hy, 0); }
    // ledlijn in de boord: licht groen op bij de actieve verdieping
    const led = new T.Mesh(merge([bx(W + 0.52, 0.04, 0.012, 0, y - 0.07, D / 2 + 0.256), bx(0.012, 0.04, D + 0.52, W / 2 + 0.256, y - 0.07, 0), bx(0.012, 0.04, D + 0.52, -W / 2 - 0.256, y - 0.07, 0)]), mat.ledOff);
    world.add(led); leds.push(led);
    // bord van de afdeling op de kernwand
    const bd = new T.Mesh(new T.PlaneGeometry(3.2, 1.8), basic({ map: tc(boardCanvas(f.name, f.acc, i)), toneMapped: false }));
    bd.position.set(-2.2, y0 + 1.85, -D / 2 + 0.255); world.add(bd); boards.push(bd);
    add('dark', bx(3.34, 1.94, 0.03, -2.2, y0 + 1.85, -D / 2 + 0.235, 1));
    // licht per verdieping (alleen op desktop): verlicht figuurtjes en meubels; de rest komt uit de lichtkaarten
    if (!light) { const L = new T.PointLight(f.warm ? 0xffd4a3 : 0xdbe7ff, 16, 11, 2); L.position.set(0, y + CEIL - 0.5, 0.4); world.add(L); lamps.push(L); }
    if (f.key !== 'cs') {
      // drie dubbele bureaus met schermen, toetsenbord, stoelen en een tasje
      const topK = f.wood ? 'deskW' : 'deskWood', top = y0 + 0.74;
      DESKS.forEach((dx, k) => {
        add(topK, bx(2.4, 0.035, 1.5, dx, top, DZ, f.wood ? 0.25 : 1 / 1.6));
        for (const lx of [-1.1, 1.1]) { ab(0.05, 0.72, 0.05, dx + lx, y0 + 0.37, DZ - 0.62); ab(0.05, 0.72, 0.05, dx + lx, y0 + 0.37, DZ + 0.62); ab(0.05, 0.04, 1.3, dx + lx, y0 + 0.04, DZ); }
        add('fabric', bx(2.3, 0.34, 0.03, dx, top + 0.19, DZ, 1));
        screen(dx, top, DZ + 0.25, 0, (i + k) % 2);
        if (k === 1) screen(dx, top, DZ - 0.25, Math.PI, (i + k + 1) % 2);
        add('pot', cyl(0.04, 0.04, 0.1, dx + 0.78, top + 0.07, DZ + 0.45, 10));
        chair(dx, y0, DZ + 1.0, Math.PI);
        chair(dx, y0, DZ - 1.0, 0);
      });
      // kast achteraan rechts met een plantje
      add(topK, bx(3.2, 0.72, 0.5, 4.3, y0 + 0.36, -D / 2 + 0.5, f.wood ? 0.25 : 1 / 1.6));
      plant(5.4, y0 + 0.72, -D / 2 + 0.5, 0.55);
    } else {
      // Chief of Staff: ovale vergadertafel, twee schermen en een groot dashboard op de wand
      const top = y0 + 0.74;
      add('deskW', new T.CylinderGeometry(1, 1, 0.05, 48).scale(2.1, 1, 0.95).translate(1.2, top, 0.4));
      for (const px of [0.1, 2.3]) { add('alu', cyl(0.07, 0.07, 0.72, px, y0 + 0.37, 0.4, 12)); add('alu', cyl(0.36, 0.36, 0.03, px, y0 + 0.015, 0.4, 24)); }
      chair(-1.25, y0, 0.4, Math.PI / 2); chair(3.65, y0, 0.4, -Math.PI / 2);
      screen(-0.45, top, 0.4, -Math.PI / 2, 0, 0.46, 0.28); screen(2.85, top, 0.4, Math.PI / 2, 1, 0.46, 0.28);
      const g = new T.PlaneGeometry(2.6, 1.46), a = g.attributes.uv;
      for (let k = 0; k < a.count; k++) a.setY(k, a.getY(k) * 0.5);
      add('screen', g.translate(3.5, y0 + 1.8, -D / 2 + 0.255)); add('dark', bx(2.72, 1.58, 0.03, 3.5, y0 + 1.8, -D / 2 + 0.235, 1));
      // zithoek
      add('fabric', bx(2.4, 0.42, 0.9, -4.6, y0 + 0.21, 2.7, 1)); add('fabric', bx(2.4, 0.5, 0.22, -4.6, y0 + 0.62, 3.05, 1));
      add('deskWood', bx(1.0, 0.04, 0.6, -4.6, y0 + 0.42, 1.6, 1 / 1.6)); ab(0.04, 0.4, 0.04, -4.6, y0 + 0.2, 1.6);
    }
    plant(W / 2 - 0.75, y0, D / 2 - 0.8);
    plant(-W / 2 + 0.75, y0, -D / 2 + 0.9, 1.15);
  });
  // lamellen op de zijgevels: slanke verticale vinnen over de volle hoogte
  for (const sx of [-1, 1]) for (let k = 1; k < 8; k++) {
    const z = -D / 2 + k * 1.125;
    fr(0.24, ROOF + 0.7, 0.04, sx * (W / 2 + 0.37), (TER + ROOF + 0.55) / 2, z);
  }

  /* inkom op het gelijkvloers: deuren, luifel met het logo, verlichting */
  {
    const ex = 2, ez = D / 2, y0 = 0.15;
    fr(0.1, 2.45, 0.18, ex - 0.98, y0 + 1.225, ez + 0.04); fr(0.1, 2.45, 0.18, ex + 0.98, y0 + 1.225, ez + 0.04);
    fr(0.06, 2.4, 0.12, ex, y0 + 1.2, ez + 0.04); fr(2.06, 0.1, 0.18, ex, y0 + 2.45, ez + 0.04);
    pane(0.9, 2.36, ex - 0.48, y0 + 1.2, ez + 0.01, 0, 0.66); pane(0.9, 2.36, ex + 0.48, y0 + 1.2, ez + 0.01, 0, 0.66);
    const fh = H - 0.3 - 2.5; pane(1.96, fh, ex, y0 + 2.5 + fh / 2, ez, 0, 0.9);
    ab(0.03, 0.9, 0.05, ex - 0.1, y0 + 1.1, ez + 0.13); ab(0.03, 0.9, 0.05, ex + 0.1, y0 + 1.1, ez + 0.13);
    add('concrete', bx(3.6, 0.56, 1.9, ex, 2.96, ez + 0.95));   // luifel met een hogere boord voor het logo
    ab(3.62, 0.03, 1.92, ex, 3.25, ez + 0.95);                  // aluminium afdekking
    const st = tc(signCanvas(() => { st.needsUpdate = true; }));
    mat.sign.map = st; mat.sign.needsUpdate = true;
    const sh = 0.52, sg = new T.Mesh(new T.PlaneGeometry(sh * SIGN_W / SIGN_H, sh), mat.sign);
    sg.position.set(ex, 2.96, ez + 1.906); sg.renderOrder = 2; world.add(sg); hideInPrepass.push(sg);
    for (const dx of [-0.8, 0.8]) for (const dz of [0.55, 1.35]) add('warm', new T.CircleGeometry(0.09, 16).rotateX(Math.PI / 2).translate(ex + dx, 2.675, ez + dz));
    glowAt(1.9, ex, TER + 0.02, ez + 1.1);
    add('dark', bx(1.6, 0.012, 0.9, ex, TER + 0.006, ez + 0.6, 1)); // deurmat
    // warm licht van binnen op het terras, voor en opzij (de verdieping op het gelijkvloers is warm verlicht)
    const sm = { color: 0xffcf9a, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.42 };
    const front = new T.Mesh(flat(new T.PlaneGeometry(W, 3.4)), basic({ ...sm, map: tc(spillCanvas(7)) }));
    front.position.set(0, TER + 0.014, D / 2 + 0.25 + 1.7); front.renderOrder = 1; world.add(front);
    const side = new T.Mesh(flat(new T.PlaneGeometry(D, 2.6)).rotateY(Math.PI / 2), basic({ ...sm, map: tc(spillCanvas(4)), opacity: 0.28 }));
    side.position.set(W / 2 + 0.25 + 1.3, TER + 0.014, 0); side.renderOrder = 1; world.add(side);
    hideInPrepass.push(front, side);
  }
  /* terras: plantenbakken met bomen, bank, paaltjes met licht, twee lantaarns op het plein */
  function tree(x, z, k = 1) {
    const base = TER + 0.55;
    add('bark', cyl(0.07 * k, 0.12 * k, 2.7 * k, x, base + 1.35 * k, z, 10));
    for (let b = 0; b < 4; b++) {
      const a = b * 1.7 + RU(), g = new T.CylinderGeometry(0.025, 0.05, 1.2 * k, 6).translate(0, 0.6 * k, 0).rotateZ(0.75 + RU() * 0.3).rotateY(a);
      add('bark', g.translate(x, base + (1.9 + b * 0.25) * k, z));
    }
    crown(x, base + 3.25 * k, z, 1.45 * k, 1.15 * k, 1.45 * k, 140, 0.85 * k);
    crown(x + 0.55 * k, base + 2.8 * k, z - 0.4 * k, 1.0 * k, 0.8 * k, 1.0 * k, 65, 0.75 * k);
    crown(x - 0.45 * k, base + 3.85 * k, z + 0.3 * k, 0.95 * k, 0.8 * k, 0.95 * k, 60, 0.75 * k);
  }
  for (const [x, z] of [[-W / 2 - 2.2, D / 2 + 4.6], [W / 2 + 3.0, D / 2 + 0.7]]) {
    add('concreteD', bx(2, 0.55, 2, x, TER + 0.275, z));
    ab(2.04, 0.03, 2.04, x, TER + 0.565, z);
    add('soil', bx(1.8, 0.02, 1.8, x, TER + 0.54, z, 1));
    blobAt(2.8, 2.8, x, TER + 0.01, z);
    tree(x, z);
  }
  add('deskWood', bx(2.2, 0.07, 0.5, W / 2 + 2.6, TER + 0.45, D / 2 + 4.4, 1 / 1.6));
  add('concreteD', bx(0.14, 0.42, 0.5, W / 2 + 1.8, TER + 0.21, D / 2 + 4.4)); add('concreteD', bx(0.14, 0.42, 0.5, W / 2 + 3.4, TER + 0.21, D / 2 + 4.4));
  blobAt(2.8, 1.0, W / 2 + 2.6, TER + 0.01, D / 2 + 4.4);
  for (const bz of [D / 2 + 3.3, D / 2 + 6.0]) for (const dx of [-1.5, 1.5]) {
    add('dark', cyl(0.08, 0.09, 0.8, 2 + dx, TER + 0.4, bz, 14)); add('warm', cyl(0.085, 0.085, 0.07, 2 + dx, TER + 0.72, bz, 14));
    add('dark', cyl(0.095, 0.095, 0.03, 2 + dx, TER + 0.8, bz, 14));
    glowAt(0.95, 2 + dx, TER + 0.02, bz);
  }
  const lampHeads = [];
  for (const [lx, lz] of [[-W / 2 - 7, D / 2 + 9], [W / 2 + 8, D / 2 + 5]]) {
    add('dark', cyl(0.06, 0.08, 4.6, lx, GROUND + 2.3, lz, 10)); add('dark', bx(0.7, 0.12, 0.28, lx + 0.3, GROUND + 4.6, lz, 1));
    add('dark', cyl(0.14, 0.16, 0.25, lx, GROUND + 0.125, lz, 12));
    add('warm', pl(0.6, 0.2, 1).rotateX(Math.PI / 2).translate(lx + 0.3, GROUND + 4.535, lz));
    glowAt(3.6, lx + 0.3, GROUND + 0.02, lz);
    lampHeads.push([lx + 0.3, GROUND + 4.5, lz]);
  }

  /* dak: boord met aluminium afdekking, grind, reling, liftkoker, technische installaties, zonnepanelen, antenne met baken */
  {
    add('concrete', bx(W + 0.42, 0.3, D + 0.42, 0, ROOF, 0));
    add('gravel', bx(W + 0.1, 0.03, D + 0.1, 0, ROOF + 0.165, 0, 0.5));
    const py0 = ROOF - 0.4, py1 = ROOF + 0.55, ph = py1 - py0, pcy = (py0 + py1) / 2;
    add('fascia', bx(W + 0.5, ph, 0.06, 0, pcy, D / 2 + 0.22, 0.25)); add('fascia', bx(W + 0.5, ph, 0.06, 0, pcy, -D / 2 - 0.22, 0.25));
    add('fascia', bx(0.06, ph, D + 0.5, W / 2 + 0.22, pcy, 0, 0.25)); add('fascia', bx(0.06, ph, D + 0.5, -W / 2 - 0.22, pcy, 0, 0.25));
    add('concrete', bx(W + 0.4, 0.4, 0.2, 0, ROOF + 0.35, D / 2 + 0.09)); add('concrete', bx(W + 0.4, 0.4, 0.2, 0, ROOF + 0.35, -D / 2 - 0.09));
    add('concrete', bx(0.2, 0.4, D, W / 2 + 0.09, ROOF + 0.35, 0)); add('concrete', bx(0.2, 0.4, D, -W / 2 - 0.09, ROOF + 0.35, 0));
    ab(W + 0.56, 0.035, 0.36, 0, py1 + 0.017, D / 2 + 0.1); ab(W + 0.56, 0.035, 0.36, 0, py1 + 0.017, -D / 2 - 0.1);
    ab(0.36, 0.035, D + 0.2, W / 2 + 0.1, py1 + 0.017, 0); ab(0.36, 0.035, D + 0.2, -W / 2 - 0.1, py1 + 0.017, 0);
    const RT = py1 + 0.035, rz = D / 2 + 0.05, rx = W / 2 + 0.05;
    for (let k = 0; k <= 10; k++) { const x = -rx + (k * 2 * rx) / 10; ab(0.04, 1.0, 0.04, x, RT + 0.5, rz); ab(0.04, 1.0, 0.04, x, RT + 0.5, -rz); }
    for (let k = 1; k < 6; k++) { const z = -rz + (k * 2 * rz) / 6; ab(0.04, 1.0, 0.04, rx, RT + 0.5, z); ab(0.04, 1.0, 0.04, -rx, RT + 0.5, z); }
    for (const hy of [RT + 1.0, RT + 0.5]) { ab(2 * rx + 0.04, 0.045, 0.045, 0, hy, rz); ab(2 * rx + 0.04, 0.045, 0.045, 0, hy, -rz); ab(0.045, 0.045, 2 * rz + 0.04, rx, hy, 0); ab(0.045, 0.045, 2 * rz + 0.04, -rx, hy, 0); }
    const RB = ROOF + 0.18;
    add('concrete', bx(3.0, 2.5, 2.6, -4.4, RB + 1.25, -1.9)); ab(3.1, 0.06, 2.7, -4.4, RB + 2.53, -1.9);
    add('dark', bx(0.9, 2.0, 0.04, -4.4, RB + 1.0, -1.9 + 1.32, 1)); add('warm', bx(0.3, 0.06, 0.1, -4.4, RB + 2.18, -1.9 + 1.36, 1));
    for (const ux of [-0.9, 1.4]) { add('unit', bx(2.0, 1.0, 1.4, ux, RB + 0.5, -2.4, 1)); for (const fx of [-0.5, 0.5]) add('dark', cyl(0.38, 0.38, 0.06, ux + fx, RB + 1.03, -2.4, 20)); }
    for (const sx of [-5.2, -3.4, -1.6, 0.2]) { add('solar', new T.BoxGeometry(1.6, 0.04, 1.0).rotateX(0.3).translate(sx, RB + 0.5, 2.6)); ab(0.05, 0.4, 0.05, sx - 0.6, RB + 0.2, 2.9); ab(0.05, 0.4, 0.05, sx + 0.6, RB + 0.2, 2.9); }
    ab(0.5, 0.25, 0.5, 4.5, RB + 0.125, -2);
    add('alu', cyl(0.05, 0.07, 3.4, 4.5, RB + 1.95, -2, 10));
    ab(0.9, 0.035, 0.035, 4.5, RB + 2.4, -2); ab(0.035, 0.035, 0.6, 4.5, RB + 2.9, -2);
    add('alu', new T.CylinderGeometry(0.32, 0.1, 0.12, 20).rotateX(Math.PI / 2).rotateY(0.6).translate(4.5 + 0.12, RB + 1.5, -2 + 0.2));
  }
  const beacon = new T.Mesh(new T.SphereGeometry(0.14, 16, 12), mat.task);
  beacon.position.set(4.5, ROOF + 3.85, -2); world.add(beacon);

  // samenvoegen per materiaal
  flush('concreteD', mat.concreteD, true, true);
  flush('pave', mat.pave, false, true);
  flush('concrete', mat.concrete, true, true);
  flush('gravel', mat.gravel, false, true);
  flush('fascia', mat.fascia, true, true);
  flush('frame', mat.frame, true, true);
  flush('alu', mat.alu, true, false);
  flush('wall', mat.wall, false, true);
  flush('wallFace', mat.wallFace, false, true);
  flush('blind', mat.blind, false, false);
  flush('deskW', mat.deskW, true, true);
  flush('deskWood', mat.deskWood, true, true);
  flush('fabric', mat.fabric, true, false);
  flush('seat', mat.seat, true, false);
  flush('dark', mat.dark, true, false);
  flush('bark', mat.bark, true, false);
  flush('pot', mat.pot, true, false);
  flush('soil', mat.soil, false, false);
  flush('foliage', mat.foliage, true, false);
  flush('unit', mat.unit, true, true);
  flush('solar', mat.solar, true, false);
  const warmM = flush('warm', mat.warm, false, false);
  const screenM = flush('screen', mat.screen, false, false);
  bk.cw = ceilW; bk.cc = ceilC;
  const ceilWM = flush('cw', mat.ceilW, false, false), ceilCM = flush('cc', mat.ceilC, false, false);
  const blobM = flush('blobS', basic({ map: tBlobS, color: 0x000000, transparent: true, depthWrite: false, opacity: 0.5 }), false, false, -1);
  const glowM = flush('glowW', mat.glowW, false, false, 1);
  const glassM = flush('glass', mat.glass, false, false, 2), glassR = new T.Mesh(glassM.geometry, mat.glassRefl);
  glassR.renderOrder = 2; glassR.matrixAutoUpdate = false; world.add(glassR);
  hideInPrepass.push(blobM, glowM, glassM, glassR);

  // gloed rond het baken en de lantaarns (vlakjes die naar de camera draaien)
  const billboards = [];
  const bb = (x, y, z, s, color, op) => { const m = new T.Mesh(new T.PlaneGeometry(s, s), basic({ map: tGlow, color, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: op, fog: false })); m.position.set(x, y, z); m.renderOrder = 3; world.add(m); billboards.push(m); hideInPrepass.push(m); return m; };
  const beaconGlow = bb(4.5, ROOF + 3.85, -2, 1.6, 0x4fd394, 0.65);
  lampHeads.forEach(([x, y, z]) => bb(x, y - 0.1, z, 1.4, 0xffc78a, 0.5));

  /* figuurtjes: een eenvoudig skelet per figuur, getekend als instanced meshes, met echte verhoudingen (kleiner hoofd, hals, handen) */
  const SHIRT = [0x1f9e5f, 0x2f74e0, 0xe7e2d6, 0x43b581, 0x5b7fb8, 0xd8d2c4, 0x2a3f62];
  const SKIN = [0xf0d2bb, 0xd7a685, 0xa86e4b, 0x7b4d34, 0xe9c3a5];
  const HAIR = [0x2a201b, 0x4b3527, 0x161616, 0x8b6b46, 0xc2a57c];
  const PANTS = [0x1d2534, 0x2b3447, 0x3a3e46, 0x24303f];
  const figs = [];
  FLOORS.forEach((f, i) => {
    const fy = i * H + 0.16;
    if (f.key === 'cs') { figs.push({ fy, mode: 'sit', x: -1.25, z: 0.4, ry: Math.PI / 2 }, { fy, mode: 'sit', x: 3.65, z: 0.4, ry: -Math.PI / 2 }); return; }
    figs.push({ fy, mode: 'sit', x: -4.4, z: 1.55, ry: Math.PI });
    figs.push({ fy, mode: 'sit', x: 0, z: -0.45, ry: 0 });
    if (!light) figs.push({ fy, mode: 'sit', x: 4.4, z: 1.55, ry: Math.PI });
    figs.push({ fy, mode: 'walk', ax: 4.6, bx: -2.2, z: -2.6, ry: Math.PI / 2 });
  });
  const NFIG = figs.length;
  const seg = light ? 8 : 12;
  const torsoProfile = [[0, -0.04], [0.14, -0.03], [0.165, 0.06], [0.158, 0.2], [0.15, 0.3], [0.165, 0.42], [0.185, 0.52], [0.18, 0.58], [0.14, 0.63], [0.07, 0.655], [0.001, 0.66]].map(([r, y]) => new T.Vector2(r, y));
  const G = {
    torso: new T.LatheGeometry(torsoProfile, seg + 4).scale(1.2, 1, 0.72),
    head: merge([new T.SphereGeometry(0.115, seg + 6, seg).scale(0.92, 1.08, 1), new T.CylinderGeometry(0.046, 0.052, 0.13, seg).translate(0, -0.11, 0)]),
    hair: new T.SphereGeometry(0.122, seg + 6, 10, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(0.92, 1.08, 1).translate(0, 0.012, -0.01),
    thigh: new T.CapsuleGeometry(0.082, 0.3, 4, seg).translate(0, -0.22, 0),
    shin: new T.CapsuleGeometry(0.068, 0.33, 4, seg).translate(0, -0.22, 0),
    shoe: new T.CapsuleGeometry(0.058, 0.14, 4, seg).rotateX(Math.PI / 2).scale(1, 0.6, 1).translate(0, -0.46, 0.05),
    arm: new T.CapsuleGeometry(0.056, 0.42, 4, seg).translate(0, -0.25, 0),
    hand: new T.SphereGeometry(0.045, 10, 8).scale(0.8, 1.15, 0.6).translate(0, -0.55, 0),
    blob: flat(new T.PlaneGeometry(0.95, 0.95))
  };
  const soft2 = (c = 0xffffff, r = 0.82) => std({ color: c, roughness: r });
  const mShirt = soft2(), mSkin = soft2(0xffffff, 0.6), mHair = soft2(0xffffff, 0.7), mPants = soft2();
  // geen slagschaduw: de schaduwkaart wordt maar één keer getekend (stilstaand), de figuurtjes bewegen
  const inst = (g, m, n) => { const o = new T.InstancedMesh(g, m, n); o.frustumCulled = false; world.add(o); return o; };
  const P = {
    torso: inst(G.torso, mShirt, NFIG), head: inst(G.head, mSkin, NFIG), hair: inst(G.hair, mHair, NFIG),
    thigh: inst(G.thigh, mPants, NFIG * 2), shin: inst(G.shin, mPants, NFIG * 2),
    shoe: inst(G.shoe, std({ color: 0x15191f, roughness: 0.6 }), NFIG * 2), arm: inst(G.arm, mShirt, NFIG * 2), hand: inst(G.hand, mSkin, NFIG * 2),
    blob: inst(G.blob, basic({ map: tBlobS, color: 0x000000, transparent: true, depthWrite: false, opacity: 0.42 }), NFIG)
  };
  P.blob.renderOrder = 1; hideInPrepass.push(P.blob);
  const C = new T.Color();
  figs.forEach((sp, n) => {
    const root = new T.Object3D(), hips = new T.Object3D(), torso = new T.Object3D(), head = new T.Object3D();
    root.add(hips); hips.add(torso); head.position.y = 0.775; torso.add(head);
    const legs = [-1, 1].map((s) => { const th = new T.Object3D(); th.position.set(0.095 * s, 0.02, 0); hips.add(th); const sh = new T.Object3D(); sh.position.y = -0.41; th.add(sh); return { th, sh }; });
    const arms = [-1, 1].map((s) => { const a = new T.Object3D(); a.position.set(0.245 * s, 0.55, 0); a.rotation.z = 0.08 * s; torso.add(a); return a; });
    sp.rig = { root, hips, torso, head, legs, arms };
    sp.ph = n * 1.37;
    sp.ryNow = sp.ry;
    const shirt = C.setHex(SHIRT[(n * 3 + 1) % SHIRT.length]);
    P.torso.setColorAt(n, shirt); P.arm.setColorAt(n * 2, shirt); P.arm.setColorAt(n * 2 + 1, shirt);
    const skin = C.setHex(SKIN[(n * 2 + 1) % SKIN.length]);
    P.head.setColorAt(n, skin); P.hand.setColorAt(n * 2, skin); P.hand.setColorAt(n * 2 + 1, skin);
    P.hair.setColorAt(n, C.setHex(HAIR[(n * 3) % HAIR.length]));
    const pants = C.setHex(PANTS[n % PANTS.length]);
    for (let s = 0; s < 2; s++) { P.thigh.setColorAt(n * 2 + s, pants); P.shin.setColorAt(n * 2 + s, pants); }
  });
  const dummy = new T.Object3D();
  const smooth = (x) => x * x * (3 - 2 * x);
  const angTo = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * k; };
  function poseFigures(t, dt) {
    const turn = 1 - Math.exp(-dt * 7);
    for (let n = 0; n < NFIG; n++) {
      const sp = figs[n], r = sp.rig, ph = sp.ph;
      if (sp.mode === 'sit') {
        r.root.position.set(sp.x, sp.fy, sp.z);
        r.root.rotation.y = sp.ry + Math.sin(t * 0.45 + ph) * 0.06;
        r.hips.position.y = 0.56;
        r.torso.rotation.x = 0.08 + Math.sin(t * 0.6 + ph) * 0.02;
        r.head.rotation.set(0.14, Math.sin(t * 0.37 + ph) * 0.22, 0);
        for (let s = 0; s < 2; s++) {
          r.legs[s].th.rotation.x = -1.5; r.legs[s].sh.rotation.x = 1.42;
          r.arms[s].rotation.x = -1.02 + Math.sin(t * 9 + ph + s * 1.7) * 0.035;
        }
      } else {
        // heen en weer tussen de kast en het bord, met even stilstaan bij het bord en bij de kast
        const c = (t / 16 + ph * 0.07) % 1;
        let x, ry, walking = true;
        if (c < 0.32) { x = sp.ax + (sp.bx - sp.ax) * smooth(c / 0.32); ry = -Math.PI / 2; }
        else if (c < 0.5) { x = sp.bx; ry = Math.PI; walking = false; }
        else if (c < 0.82) { x = sp.bx + (sp.ax - sp.bx) * smooth((c - 0.5) / 0.32); ry = Math.PI / 2; }
        else { x = sp.ax; ry = 0; walking = false; }
        sp.ryNow = angTo(sp.ryNow, ry, turn);
        r.root.position.set(x, sp.fy, sp.z);
        r.root.rotation.y = sp.ryNow;
        const w = t * 7.5 + ph;
        r.hips.position.y = 0.87 + (walking ? Math.abs(Math.cos(w)) * 0.025 : 0);
        r.torso.rotation.x = walking ? 0.04 : 0;
        r.head.rotation.set(walking ? 0 : -0.05, walking ? 0 : Math.sin(t * 0.8 + ph) * 0.25, 0);
        for (let s = 0; s < 2; s++) {
          const q = walking ? Math.sin(w + s * Math.PI) : 0;
          r.legs[s].th.rotation.x = -q * 0.45;
          r.legs[s].sh.rotation.x = walking ? Math.max(0, Math.sin(w + s * Math.PI - 1.2)) * 0.7 : 0;
          r.arms[s].rotation.x = q * 0.36;
        }
        // bij het bord: wijzen naar het bord
        if (!walking && ry === Math.PI) r.arms[1].rotation.x = -1.6 + Math.sin(t * 2 + ph) * 0.08;
      }
      r.root.updateMatrixWorld(true);
      P.torso.setMatrixAt(n, r.torso.matrixWorld);
      P.head.setMatrixAt(n, r.head.matrixWorld); P.hair.setMatrixAt(n, r.head.matrixWorld);
      for (let s = 0; s < 2; s++) {
        P.thigh.setMatrixAt(n * 2 + s, r.legs[s].th.matrixWorld);
        P.shin.setMatrixAt(n * 2 + s, r.legs[s].sh.matrixWorld); P.shoe.setMatrixAt(n * 2 + s, r.legs[s].sh.matrixWorld);
        P.arm.setMatrixAt(n * 2 + s, r.arms[s].matrixWorld); P.hand.setMatrixAt(n * 2 + s, r.arms[s].matrixWorld);
      }
      dummy.position.set(r.root.position.x, sp.fy + 0.012, r.root.position.z); dummy.updateMatrix();
      P.blob.setMatrixAt(n, dummy.matrix);
    }
    for (const k in P) P[k].instanceMatrix.needsUpdate = true;
  }

  // een taak die per verdieping doorgegeven wordt tussen twee figuurtjes
  const tasks = [];
  {
    const tg = new T.BoxGeometry(0.2, 0.2, 0.2);
    FLOORS.forEach((f, i) => {
      const own = figs.filter((sp) => sp.fy === i * H + 0.16 && sp.mode === 'sit');
      if (own.length > 1) { const m = new T.Mesh(tg, i % 2 ? mat.taskB : mat.task); world.add(m); tasks.push({ m, a: own[0], b: own[1], phase: i * 0.9 }); }
    });
  }
  // een taak die tussen verdiepingen reist (langs de gevel), na "Goedkeuren" in de chat
  const flowM = new T.Mesh(new T.BoxGeometry(0.34, 0.34, 0.34), mat.task); flowM.visible = false; world.add(flowM);
  const flowGlow = bb(0, 0, 0, 1.4, 0x4fd394, 0.6); flowGlow.visible = false;
  let flow = null;
  const sendFlow = (from, to) => { flow = { from, to, t0: performance.now() }; flowM.visible = true; flowGlow.visible = true; };

  /* gloed (bloom): alleen echte lichtbronnen gloeien (plafondpanelen, schermen, lampen, ledlijn, baken, taken).
     Een diepte-voorpas op halve resolutie verbergt wat erachter zit; daarna vervagen in een mip-keten en optellen op het beeld. */
  const BL = 2;
  let bloom = null;
  if (!light) {
    const em = (src, m, child = false) => { const o = new T.Mesh(src.geometry, m); o.layers.set(BL); o.matrixAutoUpdate = false; o.frustumCulled = src.frustumCulled; (child ? src : world).add(o); return o; };
    const bm = (c, k, o = {}) => basic({ color: new T.Color(c).multiplyScalar(k), fog: false, toneMapped: false, depthWrite: false, ...o });
    em(ceilWM, bm(0xffdcb0, 1.15, { map: mat.ceilW.emissiveMap }));
    em(ceilCM, bm(0xdfe9ff, 1.15, { map: mat.ceilC.emissiveMap }));
    em(screenM, bm(0xffffff, 0.45, { map: mat.screen.map }));
    em(warmM, bm(0xffd9a8, 2.2));
    const ledGlow = leds.map((l) => { const o = em(l, bm(0x4fd394, 2.4), true); o.visible = false; return o; });
    em(beacon, bm(0x4fd394, 3), true);
    tasks.forEach((tk) => em(tk.m, bm(tk.m.material === mat.taskB ? 0x7fb0ff : 0x4fd394, 1.6), true));
    em(flowM, bm(0x4fd394, 2.2), true);
    const HF = T.HalfFloatType;
    const mk = (depth) => new T.WebGLRenderTarget(1, 1, { type: HF, depthBuffer: depth, stencilBuffer: false, generateMipmaps: false, minFilter: T.LinearFilter, magFilter: T.LinearFilter });
    const rt0 = mk(true), mips = [mk(false), mk(false), mk(false), mk(false), mk(false)];
    const tri = new T.BufferGeometry();
    tri.setAttribute('position', new T.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    tri.setAttribute('uv', new T.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
    const fsm = (fs, u, o = {}) => new T.ShaderMaterial({ uniforms: u, vertexShader: FS_VS, fragmentShader: fs, depthTest: false, depthWrite: false, ...o });
    const add1 = { blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneFactor, blendSrcAlpha: T.ZeroFactor, blendDstAlpha: T.OneFactor };
    const down = fsm(DOWN_FS, { tSrc: { value: null }, uTexel: { value: new T.Vector2() } }, { blending: T.NoBlending });
    const up = fsm(UP_FS, { tSrc: { value: null }, uTexel: { value: new T.Vector2() } }, add1);
    const comp = fsm(COMP_FS, { tWide: { value: mips[0].texture }, tCore: { value: rt0.texture }, uK: { value: 0.85 }, uCore: { value: 0.35 } }, add1);
    const quad = new T.Mesh(tri, down); quad.frustumCulled = false;
    const ocam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const occ = basic({ colorWrite: false });
    const pass = (m, src, dst) => { quad.material = m; if (src) { m.uniforms.tSrc.value = src.texture; m.uniforms.uTexel.value.set(1 / src.width, 1 / src.height); } renderer.setRenderTarget(dst); renderer.render(quad, ocam); };
    bloom = {
      ledGlow,
      size(w, h) { let a = Math.max(1, w >> 1), b = Math.max(1, h >> 1); rt0.setSize(a, b); for (const m of mips) { a = Math.max(1, a >> 1); b = Math.max(1, b >> 1); m.setSize(a, b); } },
      render() {
        renderer.autoClear = false;
        renderer.setRenderTarget(rt0); renderer.clear(true, true, false);
        const fog = scene.fog; scene.fog = null;
        for (const o of hideInPrepass) o.userData.v = o.visible, o.visible = false;
        scene.overrideMaterial = occ; renderer.render(scene, camera);
        scene.overrideMaterial = null;
        for (const o of hideInPrepass) o.visible = o.userData.v;
        camera.layers.set(BL); renderer.render(scene, camera); camera.layers.set(0);
        scene.fog = fog;
        pass(down, rt0, mips[0]);
        for (let i = 1; i < mips.length; i++) pass(down, mips[i - 1], mips[i]);
        for (let i = mips.length - 2; i >= 0; i--) pass(up, mips[i + 1], mips[i]);
        quad.material = comp; renderer.setRenderTarget(null); renderer.render(quad, ocam);
        renderer.autoClear = true;
      }
    };
  }

  /* camera: buitenkant, dan verdieping per verdieping. Sinds v4i (2/11/2026) staat het gebouw in het midden van het beeld,
     met de actieve verdieping op halve hoogte: links en rechts staan de glaspanelen met de uitleg. */
  const keys = () => {
    const narrow = camera.aspect < 0.9, k = [];
    k.push(narrow ? { p: [3, 15, 54], l: [0, 22.5, 0] } : { p: [30.3, 15, 42.5], l: [0, 10.8, 0.5] });
    for (let i = 0; i < NF; i++) {
      const y = i * H, top = i === NF - 1;
      k.push(narrow ? { p: [3, y + 3.2, 21], l: [0.5, y - 1.6, 0] } : top ? { p: [6.5, y + 3.8, 28.5], l: [0, y + 1.55, 0] } : { p: [6.5, y + 3.3, 29], l: [0, y + 1.4, 0] });
    }
    return k;
  };
  let K = keys();
  const cam = { p: new T.Vector3(...K[0].p), l: new T.Vector3(...K[0].l) };
  const tgt = { p: new T.Vector3(), l: new T.Vector3() }, tmp = new T.Vector3();
  camera.position.copy(cam.p); camera.lookAt(cam.l);

  const dbs = new T.Vector2();
  function size() {
    const r = canvas.getBoundingClientRect(), w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    K = keys();
    if (bloom) { renderer.getDrawingBufferSize(dbs); bloom.size(dbs.x, dbs.y); }
  }
  size();
  window.addEventListener('resize', size, { passive: true });

  // scrollvoortgang: k = 0 (buiten) tot 6 (Chief of Staff), afgeleid van de stappen in de pagina
  let kNow = 0, active = -2;
  function progress() {
    const mid = window.innerHeight * 0.55;
    let k = 0;
    for (let j = 0; j < steps.length; j++) {
      const r = steps[j].getBoundingClientRect();
      if (r.top <= mid) k = j + Math.min(0.5, Math.max(-0.5, (mid - (r.top + r.height / 2)) / r.height));
    }
    return Math.max(0, Math.min(K.length - 1, k));
  }

  // alleen tekenen als het gebouw in beeld is en het tabblad zichtbaar
  let visible = true, running = false, last = performance.now();
  const stats = { frames: 0, t0: 0, fps: 0, ms: [], draws: 0, tris: 0 };
  window.__hq = stats;
  if ('IntersectionObserver' in window) new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) loop(); }).observe(ride);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loop(); });

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = now / 1000;
    const k = progress();
    kNow = k;
    const a = Math.floor(k), b = Math.min(K.length - 1, a + 1), f = smooth(k - a);
    tgt.p.set(...K[a].p).lerp(tmp.set(...K[b].p), f);
    tgt.l.set(...K[a].l).lerp(tmp.set(...K[b].l), f);
    const damp = 1 - Math.exp(-dt * 6);
    cam.p.lerp(tgt.p, damp); cam.l.lerp(tgt.l, damp);
    if (k < 0.6) cam.p.x += Math.sin(t * 0.25) * 0.02;
    camera.position.copy(cam.p); camera.lookAt(cam.l);
    if (stats.view) { camera.position.set(...stats.view.p); camera.lookAt(tmp.set(...stats.view.l)); }
    // de actieve verdieping: ledlijn groen en iets meer licht
    const act = Math.round(k) - 1;
    if (act !== active) {
      leds.forEach((l, i) => { const on = i === act || (act < 0 && i === NF - 1); l.material = on ? mat.ledOn : mat.ledOff; if (bloom) bloom.ledGlow[i].visible = on; });
      active = act;
    }
    lamps.forEach((L, i) => { const goal = 16 * (act < 0 ? 1 : i === act ? 1.25 : 0.85); L.intensity += (goal - L.intensity) * damp; });
    poseFigures(t, dt);
    tasks.forEach((tk) => {
      const c = (t * 0.22 + tk.phase) % 1;
      if (c < 0.6) {
        const s = smooth(c / 0.6), ax = tk.a.x, az = tk.a.z, bx2 = tk.b.x, bz = tk.b.z;
        tk.m.visible = true;
        tk.m.position.set(ax + (bx2 - ax) * s, tk.a.fy + 1.05 + Math.sin(s * Math.PI) * 0.85, az + (bz - az) * s);
        tk.m.rotation.y = t * 2;
      } else tk.m.visible = false;
    });
    const pulse = 0.85 + Math.sin(t * 3) * 0.15;
    beacon.scale.setScalar(pulse); beaconGlow.scale.setScalar(0.8 + pulse * 0.5);
    if (flow) {
      const s = Math.min(1, (now - flow.t0) / 1700), y0 = flow.from * H + 1.6, y1 = flow.to * H + 1.6;
      flowM.position.set(W / 2 + 0.8, y0 + (y1 - y0) * smooth(s), D / 2 + 0.8);
      flowGlow.position.copy(flowM.position);
      flowM.rotation.y = t * 3;
      if (s >= 1) { flow = null; flowM.visible = false; flowGlow.visible = false; }
    }
    for (const m of billboards) m.quaternion.copy(camera.quaternion);
    bgObjs.stars.position.copy(camera.position);
    bgObjs.hazeM.uniforms.uT.value = t * 0.0025;
    renderer.info.reset();
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
    if (bloom) bloom.render();
    // framesnelheid meten
    stats.frames++;
    stats.draws = renderer.info.render.calls; stats.tris = renderer.info.render.triangles;
    if (!stats.t0) stats.t0 = now;
    stats.ms.push(dt * 1000); if (stats.ms.length > 240) stats.ms.shift();
    if (now - stats.t0 > 1000) { stats.fps = Math.round((stats.frames * 1000) / (now - stats.t0)); stats.frames = 0; stats.t0 = now; }
  }
  function loop() {
    if (running) return;
    running = true;
    last = performance.now();
    const tick = (now) => {
      if (!visible || document.hidden) { running = false; return; }
      frame(now);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  loop();
  if (onReady) onReady();
  return { flow: sendFlow, get k() { return kNow; } };
}
