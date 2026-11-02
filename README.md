# EML AI Team: website (homepage "Het hoofdkwartier")

Statische site, geen build-stap op Cloudflare. Wat in deze map staat, gaat online, behalve wat in `.assetsignore` staat (`_bron/`, README, alle `.md`, `wrangler.jsonc`, `controle/`, `_backup-*`).

## Bestanden
- `index.html`: de homepage. **Niet rechtstreeks aanpassen**: hij wordt gemaakt uit `_bron/index.template.html`.
- `404.html`: pagina voor elk adres dat niet bestaat (absolute paden, `noindex`).
- `robots.txt` en `sitemap.xml`: worden mee gemaakt door het bouwscript.
- `assets/`: css, js, lettertypes, afbeeldingen en de three.js-bundel.
- `_headers`: beveiligingsheaders, cache (css/js/vendor/fonts 1 jaar, afbeeldingen 1 week) en `noindex` op het workers.dev-adres.
- `wrangler.jsonc`: Cloudflare Worker `emlaiteam`, alleen statische bestanden, `not_found_handling: "404-page"`.

## Aanpassen
1. Pas `_bron/index.template.html` aan (of `_bron/maak-netwerk.mjs`).
2. Bouw: `node _bron/maak-netwerk.mjs` (maakt `index.html`, `robots.txt` en `sitemap.xml`).
3. Pas je `assets/css/site.css`, `assets/js/site.js`, `assets/js/hq3d.js` of de three-bundel aan, verhoog dan het `?v=`-nummer waar het bestand geladen wordt (css en js worden een jaar gecachet).

## Domein
Het domein staat op één plaats: de constante `DOMEIN` bovenaan `_bron/maak-netwerk.mjs` (nu de tijdelijke waarde `https://emlteam.ai`). Na het aanpassen opnieuw bouwen: canonical, hreflang, og:url, og:image, schema, `robots.txt` en `sitemap.xml` volgen vanzelf.

## Formulier "Gratis analyse"
- Elke knop met `data-boeking` opent het venster `#ga` (in `site.js`). Pas na een klik laadt de site het formulier uit ons platform (formulier-ID `a58Nhfp57odLnpaM6Kov`), daarna de agenda "EMLaunchpad Agenda" (`OoJsvpiXXpwS5oGbQGIE`). Geen sleutels of tokens in de code.
- Zonder JavaScript gaat de knop onderaan rechtstreeks naar de agenda.
- De opmaak van het formulier zelf staat in ons platform (Formulier > Stijlen en opties > Geavanceerd > Aangepaste CSS). De bron daarvan is `_bron/ghl-formulier.css`: pas je die aan, plak ze dan opnieuw in het formulier.

## Cloudflare
Workers & Pages > Create > Import a repository > deze repo, branch `main`. Worker-naam exact `emlaiteam` (zoals in `wrangler.jsonc`). Geen build command, deploy command `npx wrangler deploy`.
