// Bouwt index.html uit _bron/index.template.html en vult de netwerken in (statische SVG, ook zonder JavaScript zichtbaar).
// Bouwt ook privacy.html uit _bron/privacy.template.html, en schrijft robots.txt en sitemap.xml met hetzelfde domein.
// Gebruik (in site-v4): node _bron/maak-netwerk.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// DOMEIN: de enige plaats in de site waar het domein staat (canonical, hreflang, og:url, og:image, JSON-LD, robots.txt,
// sitemap.xml, op index.html en privacy.html). 404.html gebruikt alleen paden (/...), geen domein.
// Gekozen en gekocht door Martijn op 3/11/2026 (bij Hostinger): emlteam.eu. Voluit .eu: emlteam.com is van iemand anders.
// Verandert het domein ooit: pas het hier aan, bouw opnieuw en push. Pas dan ook de link aan in het formulier in ons platform
// (sub-account EM Launchpad, formulier a58Nhfp57odLnpaM6Kov, tekstelement boven het vinkje Privacy: nu https://emlteam.eu/privacy).
const DOMEIN = 'https://emlteam.eu';
if (!/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}$/.test(DOMEIN)) throw new Error('DOMEIN moet https://<domein> zijn, zonder pad en zonder / op het einde');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const r = (n) => Math.round(n * 10) / 10;
const pol = (cx, cy, rad, deg) => [r(cx + rad * Math.cos((deg * Math.PI) / 180)), r(cy + rad * Math.sin((deg * Math.PI) / 180))];

/* ---------- het voorbeeldteam in de hero: Groei-opzet met 3 afdelingen en 7 agents ---------- */
function heroNet() {
  const N = {};
  const add = (id, x, y, type, label, side) => { N[id] = { id, x, y, type, label, side }; };
  add('jij', 380, 64, 'you', 'Jij en je team');
  add('cs', 380, 300, 'cos', 'Chief of Staff');
  add('d-sales', 210, 262, 'dept', 'Sales en opvolging');
  add('d-plan', 550, 262, 'dept', 'Planning');
  add('d-admin', 262, 432, 'dept', 'Administratie');
  const sales = [['a-lo', 'Leadopvolger', 150], ['a-om', 'Offertemaker', 196], ['a-ap', 'Afsprakenplanner', 246]];
  sales.forEach(([id, l, a]) => { const [x, y] = pol(210, 262, 104, a); add(id, x, y, 'agent', l, a > 230 ? 'above' : 'left'); });
  const plan = [['a-pl', 'Planner', -92], ['a-ww', 'Weerwacht', -44], ['a-mb', 'Materiaalbesteller', 4]];
  plan.forEach(([id, l, a]) => { const [x, y] = pol(550, 262, 104, a); add(id, x, y, 'agent', l, a < -70 ? 'above' : 'right'); });
  { const [x, y] = pol(262, 432, 96, 150); add('a-fj', x, y, 'agent', 'Factuurjager', 'left'); }
  const E = [['jij', 'cs'], ['cs', 'd-sales'], ['cs', 'd-plan'], ['cs', 'd-admin'],
    ['d-sales', 'a-lo'], ['d-sales', 'a-om'], ['d-sales', 'a-ap'], ['d-plan', 'a-pl'], ['d-plan', 'a-ww'], ['d-plan', 'a-mb'], ['d-admin', 'a-fj']];
  return svg({ id: 'hero', w: 760, h: 600, N, E, rings: [[380, 300, 132], [380, 300, 236]] });
}

/* ---------- ons eigen team (EM Launchpad): rollen, geen namen van agents, geen aantallen ---------- */
function hqNet() {
  const N = {};
  const add = (id, x, y, type, label, side) => { N[id] = { id, x, y, type, label, side }; };
  add('em', 300, 46, 'you', 'Ebert en Martijn keuren goed');
  add('cs', 300, 214, 'cos', 'Chief of Staff');
  const deps = [['d1', 'Sales en outreach', 162], ['d2', 'Marketing en content', 108], ['d3', 'AI en automatisatie', 54], ['d4', 'Strategie en financiën', 216], ['d5', 'Support en onderhoud', -36]];
  // vijf afdelingen in een halve kring onder en naast de Chief of Staff
  const angles = [180, 135, 90, 45, 0];
  deps.forEach(([id, l], i) => { const [x, y] = pol(300, 214, 146, angles[i]); add(id, x, y, 'dept', l, x < 300 ? 'left' : x > 300 ? 'right' : 'below'); });
  const E = [['em', 'cs'], ...deps.map(([id]) => ['cs', id])];
  return svg({ id: 'hq', w: 600, h: 420, N, E, rings: [[300, 214, 96]] });
}

function svg({ id, w, h, N, E, rings = [] }) {
  const edge = ([a, b]) => `<line class="e" data-a="${a}" data-b="${b}" x1="${N[a].x}" y1="${N[a].y}" x2="${N[b].x}" y2="${N[b].y}"/>`;
  const node = (n) => {
    const R = { you: 22, cos: 30, dept: 17, agent: 8 }[n.type];
    let lx = n.x, ly = n.y + R + 20, anchor = 'middle';
    if (n.side === 'above') { lx = n.x; ly = n.y - R - 12; anchor = 'middle'; }
    else if (n.type === 'agent' || n.side === 'left' || n.side === 'right') {
      if (n.side === 'left') { lx = n.x - R - 10; ly = n.y + 4; anchor = 'end'; }
      if (n.side === 'right') { lx = n.x + R + 10; ly = n.y + 4; anchor = 'start'; }
    }
    if (n.type === 'dept' && (n.side === 'left' || n.side === 'right') && id === 'hero') { lx = n.x; ly = n.y - R - 12; anchor = 'middle'; }
    if (n.type === 'you') { ly = n.y - R - 12; }
    const inner = n.type === 'cos' ? `<text class="n-i" x="${n.x}" y="${n.y + 5}" text-anchor="middle">CS</text>`
      : n.type === 'you' ? `<text class="n-i" x="${n.x}" y="${n.y + 5}" text-anchor="middle">${id === 'hq' ? 'EM' : 'Jij'}</text>` : '';
    return `<g class="n n--${n.type}" data-id="${n.id}" data-x="${n.x}" data-y="${n.y}"><circle class="n-h" cx="${n.x}" cy="${n.y}" r="${R + 9}"/><circle class="n-c" cx="${n.x}" cy="${n.y}" r="${R}"/>${inner}<text class="n-l" x="${r(lx)}" y="${r(ly)}" text-anchor="${anchor}">${n.label}</text></g>`;
  };
  const ringEls = rings.map(([cx, cy, rr]) => `<circle class="ring" cx="${cx}" cy="${cy}" r="${rr}"/>`).join('');
  return `<svg class="net net--${id}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true"><defs><linearGradient id="g-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2F74E0"/><stop offset="1" stop-color="#33A06A"/></linearGradient></defs>${ringEls}<g class="edges">${E.map(edge).join('')}</g><g class="nodes">${Object.values(N).map(node).join('')}</g><g class="pulses"></g></svg>`;
}

/* ---------- kleine netwerkglyphs per pakket ---------- */
function glyph(kind) {
  const W = 132, H = 72, cx = 66, cy = 36;
  const dot = (x, y, rr, cls) => `<circle class="${cls}" cx="${r(x)}" cy="${r(y)}" r="${rr}"/>`;
  const line = (x1, y1, x2, y2) => `<line x1="${r(x1)}" y1="${r(y1)}" x2="${r(x2)}" y2="${r(y2)}"/>`;
  let L = '', D = '';
  if (kind === 'analyse') {
    D += `<circle class="g-ring" cx="${cx}" cy="${cy}" r="22"/>` + dot(cx, cy, 6, 'g-you');
  } else if (kind === 'start') {
    D += dot(cx, cy, 9, 'g-dept');
    [200, 270, 340].forEach((a) => { const [x, y] = pol(cx, cy, 26, a); L += line(cx, cy, x, y); D += dot(x, y, 4, 'g-agent'); });
  } else {
    const n = kind === 'groei' ? 3 : 5;
    D += dot(cx, cy, 8, 'g-cos');
    for (let i = 0; i < n; i++) {
      const a = -90 + (360 / n) * i + (n === 3 ? 0 : 0);
      const [x, y] = pol(cx, cy, 26, a); L += line(cx, cy, x, y); D += dot(x, y, 5, 'g-dept');
    }
  }
  return `<svg class="glyph" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false"><g class="g-l">${L}</g>${D}</svg>`;
}

/* ---------- scheiding tussen secties: een reeks knopen ---------- */
const divider = () => {
  const xs = [10, 60, 110, 160, 210];
  const L = xs.slice(1).map((x, i) => `<line x1="${xs[i]}" y1="10" x2="${x}" y2="10"/>`).join('');
  const D = xs.map((x, i) => `<circle cx="${x}" cy="10" r="${i === 2 ? 5 : 3}"/>`).join('');
  return `<svg class="divnet" viewBox="0 0 220 20" aria-hidden="true" focusable="false"><g>${L}</g>${D}</svg>`;
};

/* ---------- het gebouw als doorsnede (statische versie en teambouwer) ---------- */
const FLOORS = [['sales', 'Sales en opvolging'], ['plan', 'Planning'], ['ks', 'Klantenservice'], ['mkt', 'Marketing'], ['adm', 'Administratie'], ['cs', 'Chief of Staff']];
function building(kind) {
  const big = kind === 'static';
  const VW = big ? 600 : 420, VH = big ? 620 : 470;
  const fx = big ? 70 : 24, fw = big ? 330 : 372, fh = big ? 84 : 66, ground = VH - (big ? 34 : 18);
  const fig = (x, y, cls, s = 1) => `<g class="fig ${cls}"><rect x="${r(x - 7 * s)}" y="${r(y - 22 * s)}" width="${r(14 * s)}" height="${r(20 * s)}" rx="${r(7 * s)}"/><circle cx="${r(x)}" cy="${r(y - 29 * s)}" r="${r(6 * s)}"/></g>`;
  let s = `<svg class="bld bld--${kind}" viewBox="0 0 ${VW} ${VH}" aria-hidden="true" focusable="false">`;
  s += `<line class="bld-ground" x1="0" y1="${ground}" x2="${VW}" y2="${ground}"/>`;
  FLOORS.forEach(([key, name], i) => {
    const y = ground - (i + 1) * fh;
    s += `<g class="fl" data-floor="${i}" data-dep="${key}">`;
    s += `<rect class="fl-box" x="${fx}" y="${y}" width="${fw}" height="${fh - 6}" rx="4"/>`;
    s += `<rect class="fl-slab" x="${fx - 6}" y="${y + fh - 6}" width="${fw + 12}" height="6"/>`;
    if (big) {
      // bureaus, schermen, bord en figuurtjes
      s += `<rect class="fl-board" x="${fx + 18}" y="${y + 12}" width="62" height="34" rx="3"/>`;
      [0, 1, 2].forEach((k) => {
        const dx = fx + 120 + k * 72;
        if (key !== 'cs' || k === 1) { s += `<rect class="fl-desk" x="${dx}" y="${y + fh - 30}" width="52" height="8" rx="2"/><rect class="fl-screen" x="${dx + 16}" y="${y + fh - 46}" width="20" height="13" rx="2"/>`; }
        if (key !== 'cs' || k < 2) s += fig(dx + (k === 1 && key !== 'cs' ? -10 : 26), y + fh - 8, k % 2 ? 'fig--b' : 'fig--g', 0.95);
      });
      s += `<text class="fl-name" x="${fx + fw + 18}" y="${y + fh / 2 + 2}">${name}</text><text class="fl-code" x="${fx + fw + 18}" y="${y + fh / 2 + 20}">${key === 'cs' ? 'bovenaan' : 'verdieping ' + (i + 1)}</text>`;
    } else {
      s += `<text class="fl-name" x="${fx + 16}" y="${y + fh / 2 + 3}">${name}</text>`;
      [0, 1, 2].forEach((k) => { if (key !== 'cs' || k < 1) s += fig(fx + fw - 26 - k * 24, y + fh - 10, k % 2 ? 'fig--b' : 'fig--g', 0.8); });
      if (key === 'cs') s += `<text class="fl-tag" x="${fx + fw - 50}" y="${y + fh / 2 + 3}" text-anchor="end">vanaf Groei</text>`;
    }
    s += `</g>`;
  });
  const roof = ground - FLOORS.length * fh;
  s += `<rect class="bld-roof" x="${fx - 10}" y="${roof - 10}" width="${fw + 20}" height="10" rx="2"/><line class="bld-ant" x1="${fx + fw - 50}" y1="${roof - 10}" x2="${fx + fw - 50}" y2="${roof - (big ? 50 : 36)}"/><circle class="bld-beacon" cx="${fx + fw - 50}" cy="${roof - (big ? 54 : 40)}" r="${big ? 5 : 4}"/>`;
  return s + `</svg>`;
}

let html = readFileSync(join(ROOT, '_bron', 'index.template.html'), 'utf8');
html = html.replace('<!--BLD:static-->', building('static')).replace('<!--BLD:builder-->', building('builder'));
html = html.replace('<!--NET:hero-->', heroNet()).replace('<!--NET:hq-->', hqNet())
  .replace('<!--GLYPH:analyse-->', glyph('analyse')).replace('<!--GLYPH:start-->', glyph('start'))
  .replace('<!--GLYPH:groei-->', glyph('groei')).replace('<!--GLYPH:volledig-->', glyph('volledig'))
  .replaceAll('<!--DIV-->', divider())
  .replaceAll('%%DOMEIN%%', DOMEIN);
if (html.includes('%%')) throw new Error('Er staat nog een %%-plaatshouder in index.html');
writeFileSync(join(ROOT, 'index.html'), html);
console.log('index.html gebouwd', html.length);

// privacy.html (eigen privacypagina, 3/11/2026): alleen het domein invullen
const privacy = readFileSync(join(ROOT, '_bron', 'privacy.template.html'), 'utf8').replaceAll('%%DOMEIN%%', DOMEIN);
if (privacy.includes('%%')) throw new Error('Er staat nog een %%-plaatshouder in privacy.html');
writeFileSync(join(ROOT, 'privacy.html'), privacy);
console.log('privacy.html gebouwd', privacy.length);

// robots.txt en sitemap.xml (homepage en privacypagina; de 404-pagina staat op noindex).
// Cloudflare toont privacy.html op /privacy (html_handling "auto-trailing-slash"), dus zonder .html in de sitemap.
const vandaag = new Date().toISOString().slice(0, 10);
const urls = ['/', '/privacy'];
writeFileSync(join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${DOMEIN}/sitemap.xml\n`);
writeFileSync(join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url>\n    <loc>${DOMEIN}${u}</loc>\n    <lastmod>${vandaag}</lastmod>\n  </url>\n`).join('')}</urlset>\n`);
console.log('robots.txt en sitemap.xml geschreven voor', DOMEIN);
