# EML AI Team: website (homepage en privacypagina)

Ontwerp: de variant "premium", goedgekeurd door Martijn op 3/11/2026 (ronde 1 tot 4: rustig en premium, idee A in de hero, het gewone EM-logo, het menu over het volle scherm, kleurvelden en glas, beweging in de hero). De vroegere versie met het 3D-gebouw staat in `_backup-v4j/` en `_backup-v4k/` (niet in de repo).

Statische site, geen build-stap op Cloudflare. Domein: **https://emlteam.eu** (gekocht door Martijn bij Hostinger op 3/11/2026). Schrijf het altijd voluit met ".eu": emlteam.com is van iemand anders.

Wat in deze map staat, gaat online, behalve wat in `.assetsignore` staat (`_bron/`, README, alle `.md`, `wrangler.jsonc`, `controle/`, `_backup-*`, `.taste-skill/`).

## Bestanden
- `index.html`: de homepage. **Niet rechtstreeks aanpassen**: hij wordt gemaakt uit `_bron/index.template.html`.
- `privacy.html`: de privacypagina, op `/privacy`. **Niet rechtstreeks aanpassen**: hij wordt gemaakt uit `_bron/privacy.template.html`.
- `404.html`: pagina voor elk adres dat niet bestaat (absolute paden, `noindex`, geen domein erin).
- `robots.txt` en `sitemap.xml` (homepage en `/privacy`): worden mee gemaakt door het bouwscript.
- `assets/`: css, js, lettertypes (lokaal, geen Google Fonts) en afbeeldingen.
- `_headers`: beveiligingsheaders, cache (css/js/fonts 1 jaar, afbeeldingen 1 week) en `noindex` alleen op het workers.dev-adres.
- `wrangler.jsonc`: Cloudflare Worker `emlaiteam`, alleen statische bestanden, `not_found_handling: "404-page"`. Cloudflare toont `privacy.html` op `/privacy` en stuurt `/privacy.html` door naar `/privacy`.
- `_bron/ghl-formulier.css`: de opmaak van het formulier in ons platform (zie "Formulier").

## Aanpassen
1. Pas `_bron/index.template.html` of `_bron/privacy.template.html` aan (of `_bron/maak-netwerk.mjs`).
2. Bouw: `node _bron/maak-netwerk.mjs` (maakt `index.html`, `privacy.html`, `robots.txt` en `sitemap.xml`).
3. Pas je `assets/css/site.css` of `assets/js/site.js` aan (nu `site.css?v=26`, `site.js?v=26`), verhoog dan het `?v=`-nummer waar het bestand geladen wordt (in de twee templates en in `404.html`): css en js worden een jaar gecachet.
4. Controle (de scripts staan in `controle/`, dat niet online en niet op GitHub gaat): `node controle/cfserver.mjs <absoluut pad> 8782` (lokale server die Cloudflare nabootst: `/privacy`, 404-pagina, `.assetsignore`; met een relatief pad vindt hij de pagina's niet), dan `node controle/maak-launch.mjs` (consolefouten, zijwaarts scrollen op 320 tot 1920, links en ankers, venster, beelden in `controle/launch/`). Het script voor cookies staat in `site-v4/controle/cookies.mjs`; aan cookies en externe verzoeken is in deze variant niets veranderd.

## Domein in één stap
Het domein staat in de site op één plaats: de constante `DOMEIN` bovenaan `_bron/maak-netwerk.mjs` (nu `https://emlteam.eu`). Na het aanpassen opnieuw bouwen: canonical, hreflang, og:url, og:image, schema, `robots.txt` en `sitemap.xml` volgen vanzelf, op de homepage en de privacypagina. `404.html` en alle interne links gebruiken alleen paden (`/privacy`, `/#prijzen`), geen domein.
Buiten deze map staat het domein nog op twee plaatsen, die bij een ander domein mee moeten:
- het formulier in ons platform (sub-account EM Launchpad, formulier `a58Nhfp57odLnpaM6Kov`): de link in de zin "Hoe we met je gegevens omgaan, lees je in ons privacybeleid." boven het vinkje Privacy (nu `https://emlteam.eu/privacy`);
- emlaunchpad.com, branch `eml-ai-team-eigen-site`: `py scripts/eml_ai_team_site.py https://<domein>` (staat al op `https://emlteam.eu`, commit 707e223).

## Livegang op emlteam.eu (domein bij Hostinger)
Stand op 3/11/2026 rond 11u40: emlteam.eu heeft al de nameservers van Cloudflare (`darwin.ns.cloudflare.com` en `rosalie.ns.cloudflare.com`) en toont via Cloudflare nog een parkeerpagina van Hostinger. Stap 1 en 2 lijken dus gedaan: kijk het na en ga verder bij stap 3. Er bestaat nog geen Worker `emlaiteam`.

1. **Cloudflare:** Add a domain > `emlteam.eu` > Free plan. Cloudflare geeft 2 nameservers.
2. **Hostinger (hPanel):** Domeinen > `emlteam.eu` > DNS / Nameservers > Nameservers wijzigen > de 2 nameservers van Cloudflare invullen en opslaan.
3. **Wachten** tot de zone `emlteam.eu` in Cloudflare op **Active** staat (Cloudflare mailt dan ook).
4. **Oude records weg:** Cloudflare > `emlteam.eu` > DNS > Records. Verwijder de A-, AAAA- of CNAME-records voor `emlteam.eu` (@) en `www` die Cloudflare van Hostinger overnam (die tonen de parkeerpagina). Een Custom Domain kan niet op een naam die al zo'n record heeft. Andere records (MX, TXT) laat je staan.
5. **Worker maken uit de repo:** Workers & Pages > Create > Import a repository > `EMLaunchpad-Demo/emlaiteam`, branch `main`. Worker-naam exact `emlaiteam` (zoals in `wrangler.jsonc`). Geen build command, deploy command `npx wrangler deploy`. Wacht tot de eerste deploy groen is.
6. **Domein op de Worker:** Worker `emlaiteam` > Settings > Domains & Routes > Add > Custom domain > `emlteam.eu` > Add Custom Domain. Cloudflare maakt zelf het DNS-record en het certificaat.
7. **www doorsturen naar emlteam.eu** (de eenvoudigste juiste manier volgens de Cloudflare-documentatie: een Custom Domain luistert alleen naar die ene naam, dus www krijgt een doorverwijzing en geen kopie van de site):
   - DNS > Records > Add record: type `AAAA`, name `www`, IPv6-adres `100::`, Proxy status **Proxied** (oranje wolk). Dat adres is een plaatshouder: Cloudflare vangt het verkeer op voor het er komt.
   - Rules > Redirect Rules > Create rule > sjabloon **"Redirect from WWW to Root"**. Kijk na: verzoek `https://www.emlteam.eu/*`, doel `https://emlteam.eu/${1}`, statuscode **301**, query string behouden. Deploy.
   - SSL/TLS > Edge Certificates > **Always Use HTTPS** aan.
8. **Controles** (in een privévenster en met `curl -sI`):
   - `https://emlteam.eu/` toont de site, `https://emlteam.eu/privacy` geeft 200, `http://emlteam.eu/` stuurt door naar https.
   - `https://www.emlteam.eu/privacy` geeft een 301 naar `https://emlteam.eu/privacy`.
   - **Geen noindex op emlteam.eu:** `curl -sI https://emlteam.eu/` en `curl -sI https://emlteam.eu/privacy` tonen geen `x-robots-tag`, en in de broncode staat geen `<meta name="robots" content="noindex">` (alleen `404.html` heeft dat). Het workers.dev-adres moet wel `x-robots-tag: noindex` tonen.
   - De canonical in de broncode is `https://emlteam.eu/` (homepage) en `https://emlteam.eu/privacy` (privacypagina). `https://emlteam.eu/sitemap.xml` en `/robots.txt` tonen emlteam.eu.
   - Het venster "Gratis analyse" opent, het formulier laadt en de link "privacybeleid" in het formulier opent `https://emlteam.eu/privacy`. Niet versturen tenzij je zelf een test doet.
9. **Pas daarna emlaunchpad.com:** branch `eml-ai-team-eigen-site` (al op `https://emlteam.eu`, commit 707e223, gaat zonder conflict samen met `origin/main`) samenvoegen in `main` en pushen, zoals in het commitbericht van die branch staat. Controleer dat `https://emlaunchpad.com/eml-ai-team` een 301 geeft naar `https://emlteam.eu/`. IndexNow voor de gewijzigde pagina's van emlaunchpad.com.
10. **Google Search Console:** nieuwe property van het type Domein voor `emlteam.eu`, verifiëren met het TXT-record in Cloudflare DNS, sitemap `https://emlteam.eu/sitemap.xml` indienen en voor `https://emlteam.eu/` om indexering vragen. Bing Webmaster Tools kan de property uit Search Console overnemen.

## Formulier "Gratis analyse"
- Elke knop met `data-boeking` opent het venster `#ga` (in `site.js`). Pas na een klik laadt de site het formulier uit ons platform (formulier-ID `a58Nhfp57odLnpaM6Kov`), daarna de agenda "EMLaunchpad Agenda" (`OoJsvpiXXpwS5oGbQGIE`). Geen sleutels of tokens in de code.
- Zonder JavaScript gaat de knop onderaan rechtstreeks naar de agenda.
- De opmaak van het formulier zelf staat in ons platform (Formulier > Stijlen en opties > Geavanceerd > Aangepaste CSS). De bron daarvan is `_bron/ghl-formulier.css`: pas je die aan, plak ze dan opnieuw in het formulier en sla op.
- Boven het vinkje Privacy staat een tekstelement met de link naar `https://emlteam.eu/privacy` (3/11/2026).
- Workflows in ons platform: "EML AI Team - formulier gratis analyse - opvolging" en "... - afspraak geboekt - naar Afspraak geboekt" (gepubliceerd, sturen niets naar het contact) en "EML AI Team - formulier gratis analyse - bevestiging aan contact" (mail 1 en mail 2 aan het contact, **Concept**, nog niet aan).

## Cloudflare
Workers & Pages > Create > Import a repository > deze repo, branch `main`. Worker-naam exact `emlaiteam` (zoals in `wrangler.jsonc`). Geen build command, deploy command `npx wrangler deploy`. Elke push naar `main` zet de site daarna meteen live.
