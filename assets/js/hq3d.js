/* EML AI Team v4c: het 3D-hoofdkwartier, versie 2 (31/10/2026: realistischer, met texturen, zonder raster).
   Laadt pas na de tekst: site.js importeert dit bestand na "load", in idle-tijd, alleen met WebGL en zonder "beweging verminderen".
   Alle texturen worden hier in code getekend (beton, bestrating, tapijt, hout, geborsteld aluminium, schermen, borden):
   geen foto's, niets gedownload. De spiegelingen in het glas komen uit een eenvoudige nachtscène die PMREMGenerator
   omzet in een omgevingskaart (alleen kernklassen van three, geen addons).
   Gsm (light): minder detail, kleinere texturen, geen schaduwen, geen lampen per verdieping, pixelratio 1.
   Alles is voorbeeld, met verzonnen gegevens. */
import * as T from '../vendor/three/three-hq.min.js?v=2';

const FLOORS = [
  { key: 'sales', name: 'Sales en opvolging', acc: '#4fd394', wood: false, warm: true, tint: 0x75706a },
  { key: 'plan', name: 'Planning', acc: '#7fb0ff', wood: true, warm: false },
  { key: 'ks', name: 'Klantenservice', acc: '#4fd394', wood: false, warm: true, tint: 0x5f6979 },
  { key: 'mkt', name: 'Marketing', acc: '#7fb0ff', wood: true, warm: false },
  { key: 'adm', name: 'Administratie', acc: '#4fd394', wood: false, warm: true, tint: 0x71695e },
  { key: 'cs', name: 'Chief of Staff', acc: '#f4f1ea', wood: true, warm: true }
];
const W = 14, D = 9, H = 3.4, NF = FLOORS.length, ROOF = NF * H, TER = -0.15, GROUND = -0.5;

/* ---------- procedurele texturen ---------- */
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function pix(w, h, fn) {
  const c = cnv(w, h), x = c.getContext('2d'), im = x.createImageData(w, h), d = im.data;
  for (let y = 0, p = 0; y < h; y++) for (let X = 0; X < w; X++, p += 4) { fn(X, y, d, p); d[p + 3] = 255; }
  x.putImageData(im, 0, 0);
  return c;
}
// naadloze waarderuis (value noise) met een paar octaven
function noise(size, cells, seed) {
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
    tot += amp; amp *= 0.55;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
}
const cl = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

function concreteCanvas(S) {
  const n = noise(S, [4, 8, 16, 32, 64], 3), r = rng(5);
  return pix(S, S, (x, y, d, p) => {
    let v = 0.6 + (n[y * S + x] - 0.5) * 0.46 + (r() - 0.5) * 0.09;
    if (r() < 0.0035) v *= 0.6;
    const c = v * 228; d[p] = cl(c); d[p + 1] = cl(c * 0.985); d[p + 2] = cl(c * 0.955);
  });
}
// betonplaten in halfsteens verband: 4 x 8 platen per tegel (1,2 x 0,6 m bij een tegel van 4,8 m)
function pavingCanvas(S) {
  const n = noise(S, [8, 16, 32, 64], 9), r = rng(13), rows = 8, cols = 4, rh = S / rows, cw = S / cols, j = Math.max(1, S / 256);
  const tone = []; for (let i = 0; i < rows * cols; i++) tone.push((r() - 0.5) * 0.2);
  return pix(S, S, (x, y, d, p) => {
    const row = (y / rh) | 0, xx = (x + (row % 2 ? cw / 2 : 0)) % S, col = (xx / cw) | 0;
    let v = 0.52 + tone[row * cols + col] + (n[y * S + x] - 0.5) * 0.32 + (r() - 0.5) * 0.08;
    if (y % rh < j || xx % cw < j) v = 0.31 + (r() - 0.5) * 0.05;
    const c = v * 232; d[p] = cl(c); d[p + 1] = cl(c * 0.98); d[p + 2] = cl(c * 0.94);
  });
}
// tapijttegels van 50 cm, om en om gedraaid
function carpetCanvas(S) {
  const n = noise(S, [16, 32, 64], 21), r = rng(23), t = S / 2;
  return pix(S, S, (x, y, d, p) => {
    const tile = (((x / t) | 0) + ((y / t) | 0)) % 2, stripe = tile ? Math.sin(x * 1.9) : Math.sin(y * 1.9);
    let v = 0.62 + (n[y * S + x] - 0.5) * 0.24 + (r() - 0.5) * 0.24 + stripe * 0.035 + (tile ? 0.025 : -0.025);
    if (x % t === 0 || y % t === 0) v *= 0.84;
    const c = cl(v * 230); d[p] = c; d[p + 1] = c; d[p + 2] = c;
  });
}
// eiken planken van 20 cm met nerf en stuiknaden (tegel van 1,6 m)
function woodCanvas(S) {
  const n = noise(S, [4, 8, 16, 32], 31), r = rng(37), rows = 8, rh = S / rows, plank = [];
  for (let i = 0; i < rows; i++) plank.push({ off: r() * S, len: S * (0.42 + r() * 0.4), tone: (r() - 0.5) * 0.18, s: r() * 50 });
  return pix(S, S, (x, y, d, p) => {
    const pk = plank[(y / rh) | 0], px = (x + pk.off) % S, seg = (px / pk.len) | 0, ex = px % pk.len;
    const grain = Math.sin(y * 0.55 + n[y * S + x] * 26 + pk.s + seg * 7) * 0.5 + 0.5;
    let v = 0.74 + pk.tone + (seg % 2 ? 0.05 : -0.02) - grain * 0.14 + (r() - 0.5) * 0.045;
    if (y % rh < 1 || ex < 1.2) v *= 0.52;
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
function leafCanvas() {
  const S = 128, n = noise(S, [8, 16, 32], 51), r = rng(53);
  return pix(S, S, (x, y, d, p) => { const v = n[y * S + x] + (r() - 0.5) * 0.35; d[p] = cl(28 + v * 44); d[p + 1] = cl(78 + v * 78); d[p + 2] = cl(40 + v * 36); });
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
// uithangbord op de luifel: het 3D EM-logo van de site (Martijn, 31/10/2026), vrijstaand met gloed.
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
// zachte donkere rechthoek (contactschaduw), via shadowBlur zodat het overal werkt
function blobCanvas(w, h, pad) {
  const c = cnv(w, h), x = c.getContext('2d');
  x.shadowColor = '#000'; x.shadowBlur = pad * 0.85; x.shadowOffsetX = w; x.fillStyle = '#000';
  x.fillRect(pad - w, pad, w - pad * 2, h - pad * 2);
  return c;
}
function fadeCanvas() {
  const c = cnv(256, 256), x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, '#fff'); g.addColorStop(0.3, '#fff'); g.addColorStop(0.7, '#5a5a5a'); g.addColorStop(1, '#000');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  return c;
}
// nachtlucht met een stad aan de horizon, alleen voor de spiegelingen
function skyCanvas(light) {
  const w = light ? 512 : 1024, h = w / 2, c = cnv(w, h), x = c.getContext('2d'), r = rng(77), g = x.createLinearGradient(0, 0, 0, h), hz = h / 2;
  g.addColorStop(0, '#03070f'); g.addColorStop(0.36, '#0c1a32'); g.addColorStop(0.49, '#2a3650'); g.addColorStop(0.5, '#0a111d'); g.addColorStop(1, '#05070b');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  const k = w / 1024;
  for (let X = 0; X < w;) {
    const bw = (14 + r() * 40) * k, bh = (8 + r() * r() * 74) * k;
    x.fillStyle = '#060b15'; x.fillRect(X, hz - bh, bw, bh);
    for (let wy = hz - bh + 3 * k; wy < hz - 2; wy += 4 * k) for (let wx = X + 2 * k; wx < X + bw - 2 * k; wx += 4 * k) if (r() < 0.2) { x.fillStyle = r() < 0.6 ? '#ffcf8a' : '#cfe0ff'; x.fillRect(wx, wy, 2 * k, 2 * k); }
    X += bw + r() * 6 * k;
  }
  return c;
}
// omgevingskaart voor glas en metaal: een eenvoudige scène met kernklassen, omgezet met PMREMGenerator
function environment(renderer, light) {
  const s = new T.Scene(), sky = new T.CanvasTexture(skyCanvas(light));
  sky.colorSpace = T.SRGBColorSpace;
  s.add(new T.Mesh(new T.SphereGeometry(60, 48, 24), new T.MeshBasicMaterial({ map: sky, side: T.BackSide })));
  const panel = (w, h, x, y, z, col, k) => {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(col).multiplyScalar(k), side: T.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
  };
  panel(44, 14, 0, 42, 8, 0x9fb8ff, 0.45);    // zacht licht van de nachtlucht
  panel(18, 4, -36, 7, 20, 0xffd2a0, 1.7);    // warm straatlicht links
  panel(14, 3, 34, 6, -16, 0xbcd0ff, 1.4);    // koel licht rechts achter
  panel(12, 2.5, 24, 4, 34, 0xffe0b8, 1.1);   // warm licht rechts voor
  const pm = new T.PMREMGenerator(renderer), rt = pm.fromScene(s, 0.02, 0.1, 150);
  pm.dispose();
  s.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  sky.dispose();
  return rt.texture;
}

export function start({ canvas, ride, steps, light = false, onReady }) {
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas, antialias: !light, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, light ? 1 : 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  const shadows = !light;
  if (shadows) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true; }
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const scene = new T.Scene();
  scene.fog = new T.Fog(0x0b1526, 40, 125);
  scene.environment = environment(renderer, light);
  scene.environmentIntensity = light ? 1 : 0.85;
  const camera = new T.PerspectiveCamera(36, 1, 0.1, 220);

  scene.add(new T.HemisphereLight(0x9db6e6, 0x1b1712, light ? 1.4 : 0.8));
  const moon = new T.DirectionalLight(0xc8d6ff, light ? 1.9 : 2.4);
  moon.position.set(-18, 34, 26); moon.target.position.set(0, 7, 0);
  scene.add(moon, moon.target);
  if (shadows) {
    moon.castShadow = true;
    const sc = moon.shadow.camera;
    moon.shadow.mapSize.set(2048, 2048);
    sc.left = -22; sc.right = 22; sc.top = 24; sc.bottom = -22; sc.near = 4; sc.far = 95;
    moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.03; moon.shadow.radius = 2.5;
  }

  /* texturen en materialen */
  const S = light ? 256 : 512;
  const tx = (c, srgb = true) => { const t = new T.CanvasTexture(c); if (srgb) t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = aniso; return t; };
  const tc = (c, srgb = true) => { const t = new T.CanvasTexture(c); if (srgb) t.colorSpace = T.SRGBColorSpace; t.anisotropy = aniso; return t; };
  const tConcrete = tx(concreteCanvas(S)), tPave = tx(pavingCanvas(S)), tWood = tx(woodCanvas(S));
  const tCarpet = tx(carpetCanvas(light ? 128 : 256)), tAlu = tx(aluCanvas(128)), tGlow = tc(glowCanvas());
  const std = (o) => new T.MeshStandardMaterial(o);
  const basic = (o) => new T.MeshBasicMaterial(o);
  const mat = {
    concrete: std({ map: tConcrete, bumpMap: tConcrete, bumpScale: 1.1, color: 0xe4e1db, roughness: 0.9 }),
    concreteD: std({ map: tConcrete, bumpMap: tConcrete, bumpScale: 1, color: 0x8f8d89, roughness: 0.95 }),
    pave: std({ map: tPave, bumpMap: tPave, bumpScale: 1.4, color: 0xd2cdc5, roughness: 0.88 }),
    alu: std({ map: tAlu, roughnessMap: tAlu, color: 0xccd2d9, metalness: 0.62, roughness: 0.36 }),
    // glas in twee lagen: een lichte blauwe tint (verschilt licht per ruit) en daarbovenop de spiegeling, opgeteld
    // zonder de alfa te wijzigen (zo blijft het binnenwerk zichtbaar en spiegelt het glas toch, sterker onder een schuine hoek)
    glass: basic({ color: 0x0c1a30, transparent: true, opacity: 0.2, depthWrite: false, vertexColors: true }),
    glassRefl: new T.MeshPhysicalMaterial({ color: 0x000000, metalness: 0, roughness: 0.05, ior: 1.5, specularIntensity: 1, specularColor: new T.Color(4.5, 4.5, 4.5), envMapIntensity: 2, transparent: true, depthWrite: false,
      blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneFactor, blendSrcAlpha: T.ZeroFactor, blendDstAlpha: T.OneFactor }),
    wall: std({ color: 0xe8e4dc, roughness: 0.92 }),
    deskW: std({ color: 0xefece5, roughness: 0.42 }),
    deskWood: std({ map: tWood, roughness: 0.5 }),
    fabric: std({ color: 0x29384f, roughness: 0.96 }),
    dark: std({ color: 0x1e242e, metalness: 0.55, roughness: 0.42 }),
    bark: std({ color: 0x3d2f24, roughness: 0.95 }),
    pot: std({ color: 0xe6e1d8, roughness: 0.5 }),
    leaf: std({ map: tx(leafCanvas()), color: 0xffffff, roughness: 0.8 }),
    unit: std({ map: tx(grilleCanvas()), color: 0xb7bdc4, metalness: 0.5, roughness: 0.48 }),
    solar: std({ map: tc(solarCanvas()), metalness: 0.4, roughness: 0.16 }),
    warm: basic({ color: 0xffe3c2 }),
    cool: basic({ color: 0xe8f0ff }),
    screen: basic({ map: tc(uiCanvas()), toneMapped: false }),
    sign: basic({ transparent: true, toneMapped: false, depthWrite: false }),
    glowW: basic({ map: tGlow, color: 0xffc78a, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.5, fog: false }),
    ledOn: basic({ color: 0x4fd394, toneMapped: false }),
    ledOff: basic({ color: 0x24395a }),
    task: basic({ color: 0x4fd394, toneMapped: false }),
    taskB: basic({ color: 0x7fb0ff, toneMapped: false })
  };

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
  const ab = (w, h, d, x, y, z, ry = 0) => add('alu', bx(w, h, d, x, y, z, 1, ry));
  function pl(w, h, u = 0.25) { const g = new T.PlaneGeometry(w, h), a = g.attributes.uv; for (let k = 0; k < a.count; k++) a.setXY(k, a.getX(k) * w * u, a.getY(k) * h * u); return g; }
  const cyl = (rt, rb, h, x, y, z, seg = 16) => new T.CylinderGeometry(rt, rb, h, seg).translate(x, y, z);
  // bobbelige kruin: een icosaëder met een vaste vervorming per hoekpunt (geen naden), facetten blijven zichtbaar
  function ico(r, x, y, z, sy = 1) {
    const g = new T.IcosahedronGeometry(r, light ? 1 : 2), p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const vx = p.getX(k) / r, vy = p.getY(k) / r, vz = p.getZ(k) / r;
      const s = 1 + (Math.sin(vx * 7.3 + vz * 3.1) * Math.cos(vy * 6.1 + vx * 2.3) * 0.5 + Math.sin(vz * 9.7 - vy * 4.2) * 0.3) * 0.17;
      p.setXYZ(k, vx * r * s, vy * r * s * sy, vz * r * s);
    }
    g.computeVertexNormals();
    // facetten verzachten: normaal half richting de bolvorm
    const nn = g.attributes.normal;
    for (let k = 0; k < nn.count; k++) {
      let ax = nn.getX(k) + p.getX(k) / r, ay = nn.getY(k) + p.getY(k) / r, az = nn.getZ(k) + p.getZ(k) / r;
      const l = Math.hypot(ax, ay, az) || 1; nn.setXYZ(k, ax / l, ay / l, az / l);
    }
    return g.rotateY(RU() * 6).translate(x, y, z);
  }
  function merge(list) {
    let nv = 0, ni = 0;
    const col = !!list[0].attributes.color;
    for (const g of list) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
    const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), U = new Float32Array(nv * 2), C = col ? new Float32Array(nv * 3) : null, I = new Uint32Array(ni);
    let v = 0, i = 0;
    for (const g of list) {
      const n = g.attributes.position.count;
      P.set(g.attributes.position.array, v * 3); N.set(g.attributes.normal.array, v * 3); U.set(g.attributes.uv.array, v * 2);
      if (C) C.set(g.attributes.color.array, v * 3);
      if (g.index) { const ix = g.index.array; for (let k = 0; k < ix.length; k++) I[i + k] = ix[k] + v; i += ix.length; } else { for (let k = 0; k < n; k++) I[i + k] = v + k; i += n; }
      v += n; g.dispose();
    }
    const m = new T.BufferGeometry();
    m.setAttribute('position', new T.BufferAttribute(P, 3)); m.setAttribute('normal', new T.BufferAttribute(N, 3)); m.setAttribute('uv', new T.BufferAttribute(U, 2));
    if (C) m.setAttribute('color', new T.BufferAttribute(C, 3));
    m.setIndex(new T.BufferAttribute(I, 1));
    m.computeBoundingSphere();
    return m;
  }
  const world = new T.Group();
  scene.add(world);
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

  /* plein en terras: bestrating die zacht wegvloeit in de donkere lucht (geen raster meer) */
  {
    const tP = tPave.clone(); tP.repeat.set(22, 22); tP.needsUpdate = true;
    const m = std({ map: tP, bumpMap: tP, bumpScale: 1.2, color: 0xaaa69f, roughness: 0.9, transparent: true, alphaMap: tc(fadeCanvas(), false), depthWrite: false });
    const plaza = new T.Mesh(flat(new T.CircleGeometry(52, light ? 40 : 72)), m);
    plaza.position.set(0, GROUND, 4); plaza.renderOrder = -3; plaza.receiveShadow = shadows;
    world.add(plaza);
  }
  const tw = W + 9, td = D + 11, tz = 2;
  add('concreteD', bx(tw, TER - GROUND - 0.04, td, 0, (GROUND + TER - 0.04) / 2, tz));
  add('pave', bx(tw, 0.04, td, 0, TER - 0.02, tz, 1 / 4.8));
  add('concreteD', bx(tw, (TER - GROUND) / 2, 0.5, 0, GROUND + (TER - GROUND) / 4, tz + td / 2 + 0.25));
  // contactschaduwen: onder het gebouw en onder het terras
  {
    const bm = basic({ map: tc(blobCanvas(256, 192, 40)), color: 0x000000, transparent: true, depthWrite: false, opacity: 0.62 });
    const a = new T.Mesh(flat(new T.PlaneGeometry((W + 0.5) * 256 / 176, (D + 0.5) * 192 / 112)), bm);
    a.position.set(0, TER + 0.012, 0); a.renderOrder = -2; world.add(a);
    const b = new T.Mesh(flat(new T.PlaneGeometry(tw * 256 / 176, td * 192 / 112)), bm.clone());
    b.material.opacity = 0.5; b.position.set(0, GROUND + 0.01, tz); b.renderOrder = -2; world.add(b);
  }

  /* verdiepingen */
  const leds = [], lamps = [], boards = [];
  const pane = (w, h, x, y, z, ry, tint) => {
    const g = pl(w, h, 1);
    if (ry) g.rotateY(ry);
    g.translate(x, y, z);
    g.setAttribute('color', new T.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(tint), 3));
    add('glass', g);
  };
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
  function chair(x, fy, z, ry) {
    const sx = Math.sin(ry), sz = Math.cos(ry);
    add('fabric', bx(0.5, 0.08, 0.48, x, fy + 0.44, z, 1, ry));
    add('fabric', bx(0.48, 0.56, 0.07, x - sx * 0.26, fy + 0.8, z - sz * 0.26, 1, ry));
    add('dark', bx(0.05, 0.38, 0.05, x, fy + 0.2, z, 1));
    add('dark', bx(0.56, 0.035, 0.06, x, fy + 0.03, z, 1)); add('dark', bx(0.06, 0.035, 0.56, x, fy + 0.03, z, 1));
  }
  function plant(x, fy, z, s = 1) {
    add('pot', cyl(0.26 * s, 0.2 * s, 0.5 * s, x, fy + 0.25 * s, z, 18));
    add('dark', cyl(0.24 * s, 0.24 * s, 0.02, x, fy + 0.49 * s, z, 18));
    add('leaf', ico(0.36 * s, x, fy + 0.86 * s, z, 1.2));
    add('leaf', ico(0.28 * s, x + 0.16 * s, fy + 1.16 * s, z - 0.08 * s, 1.1));
    add('leaf', ico(0.24 * s, x - 0.14 * s, fy + 1.32 * s, z + 0.1 * s, 1.2));
  }
  FLOORS.forEach((f, i) => {
    const y = i * H, y0 = y + 0.15, yt = y + H - 0.15, gh = yt - y0, gc = (y0 + yt) / 2;
    // vloerplaat in beton met een rand die iets uitsteekt
    add('concrete', bx(W + 0.5, 0.3, D + 0.5, 0, y, 0));
    // vloer: tapijt of hout
    const fm = f.wood ? std({ map: tWood, roughness: 0.5 }) : std({ map: tCarpet, color: f.tint, roughness: 1 });
    if (light) { fm.emissive = new T.Color(f.warm ? 0x3c2c1a : 0x1d2738); fm.emissiveMap = fm.map; }
    const fl = new T.Mesh(flat(pl(W - 0.4, D - 0.4, f.wood ? 1 / 1.6 : 1)), fm);
    fl.position.y = y + 0.16; fl.receiveShadow = shadows; world.add(fl);
    // lichtpanelen in het plafond: warm of koel per verdieping
    for (const px of [-4.4, 0, 4.4]) for (const pz of [-1.7, 1.5]) add(f.warm ? 'warm' : 'cool', pl(1.6, 0.6, 1).rotateX(Math.PI / 2).translate(px, y + H - 0.165, pz));
    // kernwand achteraan
    add('wall', bx(W - 0.4, gh, 0.22, 0, gc, -D / 2 + 0.11, 0.5));
    // glas: voorgevel 7 vakken, zijgevels 4 vakken; op het gelijkvloers is vak 5 de inkom
    for (let b = 0; b < 7; b++) { if (i === 0 && b === 4) continue; pane(1.98, gh, -6 + b * 2, gc, D / 2, 0, 0.84 + RU() * 0.22); }
    for (let b = 0; b < 4; b++) {
      const z = -D / 2 + 1.125 + b * 2.25;
      pane(2.23, gh, W / 2, gc, z, Math.PI / 2, 0.84 + RU() * 0.22);
      pane(2.23, gh, -W / 2, gc, z, -Math.PI / 2, 0.84 + RU() * 0.22);
    }
    // stijlen en regels in geborsteld aluminium
    for (let b = 0; b <= 7; b++) { const c = b === 0 || b === 7; ab(c ? 0.16 : 0.07, gh, c ? 0.16 : 0.14, -7 + b * 2, gc, D / 2 + 0.04); }
    for (let b = 1; b < 4; b++) { const z = -D / 2 + b * 2.25; ab(0.14, gh, 0.07, W / 2 + 0.04, gc, z); ab(0.14, gh, 0.07, -W / 2 - 0.04, gc, z); }
    ab(0.16, gh, 0.16, W / 2, gc, -D / 2); ab(0.16, gh, 0.16, -W / 2, gc, -D / 2);
    for (const hy of [y0 + 0.04, yt - 0.04, yt - 0.5]) { ab(W + 0.1, 0.06, 0.1, 0, hy, D / 2 + 0.03); ab(0.1, 0.06, D, W / 2 + 0.03, hy, 0); ab(0.1, 0.06, D, -W / 2 - 0.03, hy, 0); }
    // ledlijn in de vloerrand: licht groen op bij de actieve verdieping
    const led = new T.Mesh(merge([bx(W + 0.52, 0.04, 0.012, 0, y - 0.07, D / 2 + 0.256), bx(0.012, 0.04, D + 0.52, W / 2 + 0.256, y - 0.07, 0), bx(0.012, 0.04, D + 0.52, -W / 2 - 0.256, y - 0.07, 0)]), mat.ledOff);
    world.add(led); leds.push(led);
    // bord van de afdeling op de kernwand
    const bd = new T.Mesh(new T.PlaneGeometry(3.2, 1.8), basic({ map: tc(boardCanvas(f.name, f.acc, i)), toneMapped: false }));
    bd.position.set(-2.2, y0 + 1.85, -D / 2 + 0.255); world.add(bd); boards.push(bd);
    add('dark', bx(3.34, 1.94, 0.03, -2.2, y0 + 1.85, -D / 2 + 0.235, 1));
    // licht per verdieping (alleen op desktop)
    if (!light) { const L = new T.PointLight(f.warm ? 0xffd4a3 : 0xdbe7ff, 22, 9.5, 2); L.position.set(0, y + H - 0.75, 0.4); world.add(L); lamps.push(L); }
    if (f.key !== 'cs') {
      // drie dubbele bureaus met schermen, toetsenbord, stoelen en een tasje
      const topK = f.wood ? 'deskW' : 'deskWood', top = y0 + 0.74;
      [-4.4, 0, 4.4].forEach((dx, k) => {
        const dz = 0.55;
        add(topK, bx(2.4, 0.04, 1.5, dx, top, dz, f.wood ? 0.25 : 1 / 1.6));
        for (const lx of [-1.1, 1.1]) for (const lz of [-0.62, 0.62]) ab(0.05, 0.72, 0.05, dx + lx, y0 + 0.37, dz + lz);
        add('fabric', bx(2.3, 0.34, 0.03, dx, top + 0.19, dz, 1));
        screen(dx, top, dz + 0.25, 0, (i + k) % 2);
        if (k === 1) screen(dx, top, dz - 0.25, Math.PI, (i + k + 1) % 2);
        add('pot', cyl(0.04, 0.04, 0.1, dx + 0.78, top + 0.07, dz + 0.45, 10));
        chair(dx, y0, dz + 1.0, Math.PI);
        chair(dx, y0, dz - 1.0, 0);
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

  /* inkom op het gelijkvloers: deuren, luifel met naam, verlichting */
  {
    const ex = 2, ez = D / 2, y0 = 0.15;
    ab(0.1, 2.45, 0.16, ex - 0.98, y0 + 1.225, ez + 0.04); ab(0.1, 2.45, 0.16, ex + 0.98, y0 + 1.225, ez + 0.04);
    ab(0.06, 2.4, 0.12, ex, y0 + 1.2, ez + 0.04); ab(2.06, 0.1, 0.16, ex, y0 + 2.45, ez + 0.04);
    pane(0.9, 2.36, ex - 0.48, y0 + 1.2, ez + 0.01, 0, 0.66); pane(0.9, 2.36, ex + 0.48, y0 + 1.2, ez + 0.01, 0, 0.66);
    const fh = H - 0.3 - 2.5; pane(1.96, fh, ex, y0 + 2.5 + fh / 2, ez, 0, 0.9);
    ab(0.03, 0.9, 0.05, ex - 0.1, y0 + 1.1, ez + 0.13); ab(0.03, 0.9, 0.05, ex + 0.1, y0 + 1.1, ez + 0.13);
    add('concrete', bx(3.6, 0.56, 1.9, ex, 2.96, ez + 0.95));   // luifel met een hogere boord voor het logo
    const st = tc(signCanvas(() => { st.needsUpdate = true; }));
    mat.sign.map = st; mat.sign.needsUpdate = true;
    const sh = 0.52, sg = new T.Mesh(new T.PlaneGeometry(sh * SIGN_W / SIGN_H, sh), mat.sign);
    sg.position.set(ex, 2.96, ez + 1.906); sg.renderOrder = 2; world.add(sg);
    for (const dx of [-0.8, 0.8]) add('warm', new T.CircleGeometry(0.12, 16).rotateX(Math.PI / 2).translate(ex + dx, 2.675, ez + 1.0));
    glowAt(1.7, ex, TER + 0.02, ez + 1.2);
  }
  /* terras: plantenbakken met bomen, bank, paaltjes met licht, twee lantaarns op het plein */
  for (const [x, z] of [[-W / 2 - 2.2, D / 2 + 4.6], [W / 2 + 3.0, D / 2 + 0.7]]) {
    add('concreteD', bx(2, 0.55, 2, x, TER + 0.275, z));
    add('dark', bx(1.8, 0.02, 1.8, x, TER + 0.54, z, 1));
    add('bark', cyl(0.09, 0.12, 2.4, x, TER + 1.7, z, 10));
    add('leaf', ico(0.95, x, TER + 3.3, z, 1.1)); add('leaf', ico(0.75, x + 0.5, TER + 3.0, z - 0.3, 1)); add('leaf', ico(0.7, x - 0.45, TER + 3.75, z + 0.25, 1)); add('leaf', ico(0.6, x + 0.1, TER + 4.2, z - 0.1, 1));
  }
  add('deskWood', bx(2.2, 0.07, 0.5, W / 2 + 2.6, TER + 0.45, D / 2 + 4.4, 1 / 1.6));
  add('concreteD', bx(0.14, 0.42, 0.5, W / 2 + 1.8, TER + 0.21, D / 2 + 4.4)); add('concreteD', bx(0.14, 0.42, 0.5, W / 2 + 3.4, TER + 0.21, D / 2 + 4.4));
  for (const bz of [D / 2 + 3.3, D / 2 + 6.0]) for (const dx of [-1.5, 1.5]) {
    add('dark', cyl(0.08, 0.09, 0.8, 2 + dx, TER + 0.4, bz, 12)); add('warm', cyl(0.085, 0.085, 0.07, 2 + dx, TER + 0.72, bz, 12));
    glowAt(0.9, 2 + dx, TER + 0.02, bz);
  }
  const lampHeads = [];
  for (const [lx, lz] of [[-W / 2 - 7, D / 2 + 9], [W / 2 + 8, D / 2 + 5]]) {
    add('dark', cyl(0.06, 0.08, 4.6, lx, GROUND + 2.3, lz, 10)); add('dark', bx(0.7, 0.12, 0.28, lx + 0.3, GROUND + 4.6, lz, 1));
    add('warm', pl(0.6, 0.2, 1).rotateX(Math.PI / 2).translate(lx + 0.3, GROUND + 4.535, lz));
    glowAt(3.6, lx + 0.3, GROUND + 0.02, lz);
    lampHeads.push([lx + 0.3, GROUND + 4.5, lz]);
  }

  /* dak: rand, reling, liftkoker, technische installaties, zonnepanelen en de antenne met baken */
  {
    add('concrete', bx(W + 0.5, 0.3, D + 0.5, 0, ROOF, 0));
    add('concreteD', bx(W + 0.1, 0.03, D + 0.1, 0, ROOF + 0.165, 0, 0.5));
    add('concrete', bx(W + 0.5, 0.35, 0.22, 0, ROOF + 0.325, D / 2 + 0.14)); add('concrete', bx(W + 0.5, 0.35, 0.22, 0, ROOF + 0.325, -D / 2 - 0.14));
    add('concrete', bx(0.22, 0.35, D + 0.06, W / 2 + 0.14, ROOF + 0.325, 0)); add('concrete', bx(0.22, 0.35, D + 0.06, -W / 2 - 0.14, ROOF + 0.325, 0));
    const RT = ROOF + 0.5;
    for (let k = 0; k <= 10; k++) { const x = -W / 2 - 0.14 + (k * (W + 0.28)) / 10; ab(0.045, 1.0, 0.045, x, RT + 0.5, D / 2 + 0.14); ab(0.045, 1.0, 0.045, x, RT + 0.5, -D / 2 - 0.14); }
    for (let k = 1; k < 6; k++) { const z = -D / 2 - 0.14 + (k * (D + 0.28)) / 6; ab(0.045, 1.0, 0.045, W / 2 + 0.14, RT + 0.5, z); ab(0.045, 1.0, 0.045, -W / 2 - 0.14, RT + 0.5, z); }
    for (const hy of [RT + 1.0, RT + 0.5]) { ab(W + 0.3, 0.05, 0.05, 0, hy, D / 2 + 0.14); ab(W + 0.3, 0.05, 0.05, 0, hy, -D / 2 - 0.14); ab(0.05, 0.05, D + 0.3, W / 2 + 0.14, hy, 0); ab(0.05, 0.05, D + 0.3, -W / 2 - 0.14, hy, 0); }
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
  flush('alu', mat.alu, true, false);
  flush('wall', mat.wall, false, true);
  flush('deskW', mat.deskW, true, true);
  flush('deskWood', mat.deskWood, true, true);
  flush('fabric', mat.fabric, true, false);
  flush('dark', mat.dark, true, false);
  flush('bark', mat.bark, true, false);
  flush('pot', mat.pot, true, false);
  flush('leaf', mat.leaf, true, false);
  flush('unit', mat.unit, true, true);
  flush('solar', mat.solar, true, false);
  flush('warm', mat.warm, false, false);
  flush('cool', mat.cool, false, false);
  flush('screen', mat.screen, false, false);
  flush('glowW', mat.glowW, false, false, 1);
  { const gl = flush('glass', mat.glass, false, false, 2), gr = new T.Mesh(gl.geometry, mat.glassRefl); gr.renderOrder = 2; gr.matrixAutoUpdate = false; world.add(gr); }

  // gloed rond het baken en de lantaarns (vlakjes die naar de camera draaien)
  const billboards = [];
  const bb = (x, y, z, s, color, op) => { const m = new T.Mesh(new T.PlaneGeometry(s, s), basic({ map: tGlow, color, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: op, fog: false })); m.position.set(x, y, z); m.renderOrder = 3; world.add(m); billboards.push(m); return m; };
  const beaconGlow = bb(4.5, ROOF + 3.85, -2, 1.6, 0x4fd394, 0.8);
  lampHeads.forEach(([x, y, z]) => bb(x, y - 0.1, z, 1.6, 0xffc78a, 0.7));

  /* figuurtjes: een eenvoudig skelet per figuur, getekend als instanced meshes */
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
  const G = {
    torso: new T.CapsuleGeometry(0.19, 0.3, 6, seg + 4).scale(1.14, 1, 0.8).translate(0, 0.3, 0),
    head: new T.SphereGeometry(0.175, seg + 8, seg + 2),
    hair: new T.SphereGeometry(0.184, seg + 8, 10, 0, Math.PI * 2, 0, Math.PI * 0.56).translate(0, 0.012, -0.014),
    eyes: merge([new T.SphereGeometry(0.024, 8, 6).translate(-0.065, 0.02, 0.158), new T.SphereGeometry(0.024, 8, 6).translate(0.065, 0.02, 0.158)]),
    thigh: new T.CapsuleGeometry(0.088, 0.3, 4, seg).translate(0, -0.22, 0),
    shin: new T.CapsuleGeometry(0.078, 0.33, 4, seg).translate(0, -0.22, 0),
    shoe: new T.CapsuleGeometry(0.066, 0.13, 4, seg).rotateX(Math.PI / 2).scale(1, 0.62, 1).translate(0, -0.46, 0.05),
    arm: new T.CapsuleGeometry(0.066, 0.4, 4, seg).translate(0, -0.25, 0),
    blob: flat(new T.PlaneGeometry(0.95, 0.95))
  };
  const soft = (c = 0xffffff) => std({ color: c, roughness: 0.82 });
  const mShirt = soft(), mSkin = soft(), mHair = soft(), mPants = soft();
  const inst = (g, m, n) => { const o = new T.InstancedMesh(g, m, n); o.frustumCulled = false; world.add(o); return o; };
  const P = {
    torso: inst(G.torso, mShirt, NFIG), head: inst(G.head, mSkin, NFIG), hair: inst(G.hair, mHair, NFIG),
    eyes: inst(G.eyes, basic({ color: 0x0d1220 }), NFIG), thigh: inst(G.thigh, mPants, NFIG * 2), shin: inst(G.shin, mPants, NFIG * 2),
    shoe: inst(G.shoe, std({ color: 0x15191f, roughness: 0.6 }), NFIG * 2), arm: inst(G.arm, mShirt, NFIG * 2),
    blob: inst(G.blob, basic({ map: tc(blobCanvas(64, 64, 20)), color: 0x000000, transparent: true, depthWrite: false, opacity: 0.45 }), NFIG)
  };
  P.blob.renderOrder = 1;
  const C = new T.Color();
  figs.forEach((sp, n) => {
    const root = new T.Object3D(), hips = new T.Object3D(), torso = new T.Object3D(), head = new T.Object3D();
    root.add(hips); hips.add(torso); head.position.y = 0.79; torso.add(head);
    const legs = [-1, 1].map((s) => { const th = new T.Object3D(); th.position.set(0.1 * s, 0.02, 0); hips.add(th); const sh = new T.Object3D(); sh.position.y = -0.41; th.add(sh); return { th, sh }; });
    const arms = [-1, 1].map((s) => { const a = new T.Object3D(); a.position.set(0.245 * s, 0.55, 0); a.rotation.z = 0.08 * s; torso.add(a); return a; });
    sp.rig = { root, hips, torso, head, legs, arms };
    sp.ph = n * 1.37;
    sp.ryNow = sp.ry;
    const shirt = C.setHex(SHIRT[(n * 3 + 1) % SHIRT.length]);
    P.torso.setColorAt(n, shirt); P.arm.setColorAt(n * 2, shirt); P.arm.setColorAt(n * 2 + 1, shirt);
    P.head.setColorAt(n, C.setHex(SKIN[(n * 2 + 1) % SKIN.length]));
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
        r.hips.position.y = 0.55;
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
        r.hips.position.y = 0.87 + (walking ? Math.abs(Math.cos(w)) * 0.03 : 0);
        r.torso.rotation.x = walking ? 0.04 : 0;
        r.head.rotation.set(walking ? 0 : -0.05, walking ? 0 : Math.sin(t * 0.8 + ph) * 0.25, 0);
        for (let s = 0; s < 2; s++) {
          const q = walking ? Math.sin(w + s * Math.PI) : 0;
          r.legs[s].th.rotation.x = -q * 0.5;
          r.legs[s].sh.rotation.x = walking ? Math.max(0, Math.sin(w + s * Math.PI - 1.2)) * 0.75 : 0;
          r.arms[s].rotation.x = q * 0.42;
        }
        // bij het bord: wijzen naar het bord
        if (!walking && ry === Math.PI) r.arms[1].rotation.x = -1.6 + Math.sin(t * 2 + ph) * 0.08;
      }
      r.root.updateMatrixWorld(true);
      P.torso.setMatrixAt(n, r.torso.matrixWorld);
      P.head.setMatrixAt(n, r.head.matrixWorld); P.hair.setMatrixAt(n, r.head.matrixWorld); P.eyes.setMatrixAt(n, r.head.matrixWorld);
      for (let s = 0; s < 2; s++) {
        P.thigh.setMatrixAt(n * 2 + s, r.legs[s].th.matrixWorld);
        P.shin.setMatrixAt(n * 2 + s, r.legs[s].sh.matrixWorld); P.shoe.setMatrixAt(n * 2 + s, r.legs[s].sh.matrixWorld);
        P.arm.setMatrixAt(n * 2 + s, r.arms[s].matrixWorld);
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
  const flowGlow = bb(0, 0, 0, 1.4, 0x4fd394, 0.75); flowGlow.visible = false;
  let flow = null;
  const sendFlow = (from, to) => { flow = { from, to, t0: performance.now() }; flowM.visible = true; flowGlow.visible = true; };

  /* camera: buitenkant, dan verdieping per verdieping (zelfde rit als v4c) */
  const keys = () => {
    const narrow = camera.aspect < 0.9, k = [];
    k.push(narrow ? { p: [3, 15, 54], l: [0, 22.5, 0] } : { p: [26, 13, 36], l: [-8.5, 9.2, 0] });
    for (let i = 0; i < NF; i++) {
      const y = i * H, top = i === NF - 1;
      k.push(narrow ? { p: [3, y + 3.2, 21], l: [0.5, y - 1.6, 0] } : top ? { p: [12, y + 3.6, 19.5], l: [-10, y + 1.3, 0] } : { p: [11, y + 3.4, 19], l: [-4.8, y + 1.1, 0] });
    }
    return k;
  };
  let K = keys();
  const cam = { p: new T.Vector3(...K[0].p), l: new T.Vector3(...K[0].l) };
  const tgt = { p: new T.Vector3(), l: new T.Vector3() }, tmp = new T.Vector3();
  camera.position.copy(cam.p); camera.lookAt(cam.l);

  function size() {
    const r = canvas.getBoundingClientRect(), w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    K = keys();
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
  const stats = { frames: 0, t0: 0, fps: 0, ms: [], draws: 0 };
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
      leds.forEach((l, i) => { l.material = i === act || (act < 0 && i === NF - 1) ? mat.ledOn : mat.ledOff; });
      active = act;
    }
    lamps.forEach((L, i) => { const goal = 22 * (act < 0 ? 1 : i === act ? 1.25 : 0.8); L.intensity += (goal - L.intensity) * damp; });
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
    renderer.render(scene, camera);
    // framesnelheid meten
    stats.frames++;
    stats.draws = renderer.info.render.calls;
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
