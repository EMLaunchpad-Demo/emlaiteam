// Bouwt index.html uit _bron/index.template.html en privacy.html uit _bron/privacy.template.html, en schrijft robots.txt
// en sitemap.xml met hetzelfde domein. Variant premium (3/11/2026): geen gebouw, geen netwerken en geen glyphs meer.
// Gebruik (in site-varianten/premium): node _bron/maak-netwerk.mjs
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

let html = readFileSync(join(ROOT, '_bron', 'index.template.html'), 'utf8');
html = html.replaceAll('%%DOMEIN%%', DOMEIN);
if (/<!--(BLD|NET|GLYPH|DIV)/.test(html)) throw new Error('Er staat nog een plaatshouder van het gebouw of een netwerk in de template');
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
