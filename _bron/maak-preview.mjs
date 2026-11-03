// Maakt een zelfstandige preview van variant premium als één HTML-bestand (preview/index.html), voor een privé-artifact.
// Regels: alle CSS en JS inline, lettertypes alleen via Google Fonts, afbeeldingen als data-URI, geen andere externe
// scripts, geen sleutels of tokens. Het venster "Gratis analyse" zit er niet in: de knoppen gaan meteen naar de
// boekingslink (EMLaunchpad Agenda, openbare link).
// Gebruik (in site-varianten/premium): node _bron/maak-netwerk.mjs && node _bron/maak-preview.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => readFileSync(join(ROOT, p), 'utf8');
const b64 = (p) => readFileSync(join(ROOT, p)).toString('base64');
const must = (s, a, b, all = false) => {
  if (!(typeof a === 'string' ? s.includes(a) : a.test(s))) throw new Error('niet gevonden: ' + String(a).slice(0, 90));
  // vervangen met een functie: anders leest replace() "$$", "$&" en "$'" in de ingevoegde JS als speciale patronen
  return all ? s.replaceAll(a, () => b) : s.replace(a, () => b);
};

let html = rd('index.html');
let css = rd('assets/css/site.css');
let js = rd('assets/js/site.js');

// ---- CSS: geen lokale lettertypes (komen van Google Fonts), geen css voor het venster
css = must(css, /@font-face\{[^}]*\}[^\n]*\n/g, '', true);
css = css.replace(/\/\* ---------- gratis analyse: venster[\s\S]*$/, '');

// ---- JS: geen venster en geen insluitscript van ons platform; de knoppen gaan meteen naar de agenda
js = must(js, "    form: 'https://api.leadconnectorhq.com/widget/form/a58Nhfp57odLnpaM6Kov',\n", '');
js = must(js, "    formId: 'a58Nhfp57odLnpaM6Kov',\n", '');
js = must(js, ",\n    embed: 'https://link.msgsndr.com/js/form_embed.js'", '');
js = must(js, "  const ga = $('#ga');", "  const ga = null; // preview: geen venster, de knoppen gaan meteen naar de boekingslink (zie else hieronder)");
// de rest van het vensterblok wordt nooit uitgevoerd, maar bevat geen externe adressen meer
if (/msgsndr\.com\/js|widget\/form/.test(js)) throw new Error('nog een extern script of formulier in de JS');

// ---- HTML
// het gewone EM-logo (ronde 2, 3/11/2026): de scherpe versie van 256 px als data-URI, ook op retina scherp
const logo = `data:image/png;base64,${b64('assets/img/logo-em-256.png')}`;
html = must(html, / src="assets\/img\/logo-em\.png" srcset="assets\/img\/logo-em\.png 107w, assets\/img\/logo-em-256\.png 256w" sizes="\d+px"/g, ` src="${logo}"`, true);
if (/(src|srcset)="[^"]*(em-logo-3d|assets\/img\/logo-em)/.test(html.replace(/data:[a-z/+]+;base64,[A-Za-z0-9+/=]+/g, ''))) throw new Error('nog een logo dat niet inline staat');
html = must(html, /<link rel="icon" href="assets\/img\/favicon\.png"[^>]*>/, `<link rel="icon" href="data:image/png;base64,${b64('assets/img/favicon.png')}" type="image/png" sizes="32x32">`);
html = must(html, /<link rel="apple-touch-icon"[^>]*>\n/, '');
html = must(html, /<link rel="preload" href="assets\/fonts\/[^"]*"[^>]*>\n/g, '', true);
html = must(html, /<link rel="canonical"[^>]*>\n/, '');
html = must(html, /<link rel="alternate"[^>]*>\n/g, '', true);
html = must(html, /<meta property="og:[^>]*>\n/g, '', true);
html = must(html, /<meta name="twitter:[^>]*>\n/, '');
html = must(html, /<!-- DOMEIN:[^\n]*\n/, '');
html = must(html, /<title>[^<]*<\/title>/, '<title>EML AI Team</title>\n<meta name="robots" content="noindex">');
html = must(html, /<link rel="stylesheet" href="assets\/css\/site\.css\?v=\d+">/,
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400..800&family=JetBrains+Mono:wght@400..600&display=swap">\n' +
  `<style>\n${css}\n</style>`);
// het venster weg (de knoppen vallen terug op de boekingslink)
html = must(html, /<!-- ════════ GRATIS ANALYSE:[\s\S]*?<\/dialog>\n/, '');
html = must(html, /<script src="assets\/js\/site\.js\?v=\d+" defer><\/script>/, `<script>\n${js}\n</script>`);
// knoppen zonder JavaScript: meteen naar de agenda
html = html.replaceAll('href="#gratis-analyse" data-boeking', 'href="https://api.leadconnectorhq.com/widget/booking/OoJsvpiXXpwS5oGbQGIE" target="_blank" rel="noopener" data-boeking');

// controles: niets lokaal of extern meer laden behalve Google Fonts
const loads = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]).filter((u) => !u.startsWith('data:') && !u.startsWith('#') && !u.startsWith('mailto:') && !u.startsWith('tel:'));
const bad = loads.filter((u) => /^assets\/|^\.\/?$/.test(u) && u !== './');
if (bad.length) throw new Error('nog lokale bestanden: ' + bad.join(', '));
const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);
if (scripts.length) throw new Error('externe scripts: ' + scripts.join(', '));
// geen sleutels of tokens (de data-URI's van de afbeeldingen niet meegeteld)
if (/\bsk-[A-Za-z0-9_-]{16,}|api[_-]?key|token=|secret|bearer /i.test(html.replace(/data:[a-z/+]+;base64,[A-Za-z0-9+/=]+/g, ''))) throw new Error('mogelijk een sleutel of token in de preview');
html = html.replaceAll('href="./"', 'href="#top"');
// de privacypagina zit niet in de preview: de link wijst naar het toekomstige adres (emlteam.eu staat nog niet live)
html = html.replaceAll('href="/privacy"', 'href="https://emlteam.eu/privacy"');

mkdirSync(join(ROOT, 'preview'), { recursive: true });
writeFileSync(join(ROOT, 'preview', 'index.html'), html);
console.log('preview/index.html', Math.round(Buffer.byteLength(html) / 1024), 'KB');
console.log('externe links (geen scripts):', [...new Set(loads.filter((u) => /^https?:/.test(u)).map((u) => new URL(u).host))].join(', '));
