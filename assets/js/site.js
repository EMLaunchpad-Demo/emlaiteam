/* EML AI Team, variant "premium" (3/11/2026, ronde 2: menu, menubalk, actieve sectie). Alles werkt ook zonder dit script: de tekst, de afdelingen, het scherm in de
   hero (op de vraag), de pakketten en de vragen staan in de HTML. Dit script voegt toe: het venster gratis analyse, het
   scherm dat één taak afspeelt, de keuze bij "Zo werkt het", je team samenstellen en de vragen als index op een breed scherm.
   Geen 3D, geen klok, geen ticker. */
(() => {
  'use strict';

  // Gratis analyse (Martijn, 2/11/2026): eerst het formulier "EML AI Team · Gratis analyse", daarna meteen een moment
  // in de EMLaunchpad Agenda (30 minuten, Teams; nooit "Client Meeting"). Beide komen uit ons platform (sub-account
  // EM Launchpad) en laden pas bij de klik. Geen sleutels of tokens nodig: het zijn openbare insluitlinks.
  const GA = {
    formId: 'a58Nhfp57odLnpaM6Kov',
    form: 'https://api.leadconnectorhq.com/widget/form/a58Nhfp57odLnpaM6Kov',
    agendaId: 'OoJsvpiXXpwS5oGbQGIE',
    agenda: 'https://api.leadconnectorhq.com/widget/booking/OoJsvpiXXpwS5oGbQGIE',
    embed: 'https://link.msgsndr.com/js/form_embed.js'
  };

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wide = window.matchMedia('(min-width: 1100px)');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- gratis analyse: venster met het formulier en daarna de agenda ---------- */
  const ga = $('#ga');
  if (ga && typeof ga.showModal === 'function') {
    const steps = $$('.ga-step', ga), marks = $$('.ga-steps li', ga);
    const formBox = $('.ga-frame--form', ga), agendaBox = $('.ga-frame--agenda', ga);
    let embed = null, formFrame = null, agendaFrame = null, stap = 1;
    // het insluitscript van ons platform: past de hoogte van de iframes aan en geeft naam en e-mail door van het formulier
    // aan de agenda. Eén keer laden, pas bij de eerste klik.
    const loadEmbed = () => embed || (embed = new Promise((res) => {
      const s = document.createElement('script');
      s.src = GA.embed; s.async = true; s.onload = res; s.onerror = res; // ook zonder script werken de iframes
      document.head.appendChild(s);
    }));
    const frame = (box, attrs) => {
      const f = document.createElement('iframe');
      Object.entries(attrs).forEach(([k, v]) => f.setAttribute(k, v));
      f.addEventListener('load', () => box.classList.add('is-ready'), { once: true });
      box.appendChild(f);
      return f;
    };
    const showForm = () => {
      if (formFrame) return;
      formFrame = frame(formBox, {
        src: GA.form, id: `inline-${GA.formId}`, title: 'Formulier: gratis analyse voor je AI-team',
        'data-layout': "{'id':'INLINE'}", 'data-trigger-type': 'alwaysShow', 'data-trigger-value': '',
        'data-activation-type': 'alwaysActivated', 'data-activation-value': '',
        'data-deactivation-type': 'neverDeactivate', 'data-deactivation-value': '',
        'data-form-name': 'EML AI Team · Gratis analyse', 'data-layout-iframe-id': `inline-${GA.formId}`, 'data-form-id': GA.formId
      });
    };
    const showAgenda = () => {
      if (agendaFrame) return;
      agendaFrame = frame(agendaBox, { src: GA.agenda, id: `${GA.agendaId}_ga`, title: 'Agenda: kies een moment voor je gratis analyse' });
    };
    const go = (n) => {
      stap = n;
      steps.forEach((s) => { s.hidden = +s.dataset.gaStap !== n; });
      marks.forEach((m) => {
        const k = +m.dataset.gaStap;
        m.classList.toggle('is-on', k === n); m.classList.toggle('is-done', k < n);
        if (k === n) m.setAttribute('aria-current', 'step'); else m.removeAttribute('aria-current');
      });
      $('.ga-body', ga).scrollTop = 0;
    };
    const open = () => {
      document.documentElement.classList.add('ga-open');
      ga.showModal();
      loadEmbed().then(() => (stap === 1 ? showForm() : showAgenda()));
    };
    ga.addEventListener('close', () => document.documentElement.classList.remove('ga-open'));
    $('.ga-close', ga).addEventListener('click', () => ga.close());
    ga.addEventListener('click', (e) => { if (e.target === ga) ga.close(); }); // klik naast het venster
    // na het versturen meldt het formulier dat aan de pagina (bericht "set-sticky-contacts"): dan meteen de agenda
    window.addEventListener('message', (e) => {
      let host = '';
      try { host = new URL(e.origin).hostname; } catch (err) { return; }
      if (!/(^|\.)(leadconnectorhq\.com|msgsndr\.com)$/.test(host)) return;
      const d = e.data;
      if (!formFrame || e.source !== formFrame.contentWindow || !Array.isArray(d) || d[0] !== 'set-sticky-contacts' || d[1] !== '_ud' || stap !== 1) return;
      let naam = '';
      try { naam = String((JSON.parse(d[2]) || {}).first_name || '').trim().slice(0, 40); } catch (err) { /* geen naam: ook goed */ }
      $('[data-ga-naam]', ga).textContent = naam ? `, ${naam}` : '';
      go(2);
      showAgenda();
      $('.ga-title', ga).focus({ preventScroll: true });
    });
    $$('[data-boeking]').forEach((a) => a.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return; // nieuw tabblad: gewoon de link volgen
      e.preventDefault();
      open();
    }));
  } else {
    // oude browser zonder <dialog>: zoals voordien rechtstreeks naar de agenda
    $$('[data-boeking]').forEach((a) => { a.href = GA.agenda; a.target = '_blank'; a.rel = 'noopener'; });
  }

  /* ---------- verschijnen bij het scrollen (één keer) ---------- */
  const revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    revealEls.forEach((el) => io.observe(el));
  } else revealEls.forEach((el) => el.classList.add('is-in'));

  /* ---------- menubalk: donker met blur zodra je scrolt ---------- */
  const bar = $('.bar');
  if (bar) {
    const onScroll = () => bar.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- het menu (details/summary, werkt ook zonder JavaScript) ----------
     Alleen onder 900 px (vanaf 900 px staan de links in de balk). Met JavaScript: de pagina scrolt niet mee, de focus blijft
     in het menu, Escape sluit, een link sluit het menu (de link scrolt dan naar de sectie), en sluiten vervaagt kort. */
  const menu = $('.menu');
  if (menu) {
    const btn = $('summary', menu), panel = $('.menu-panel', menu);
    const focusables = () => [btn, ...$$('a[href], button', panel)].filter((el) => el.offsetParent !== null || el === btn);
    let closing = null;
    const setOpen = (o) => {
      // de schuifbalk verdwijnt als de pagina niet scrolt: vul die breedte op, zodat niets verspringt
      const sb = window.innerWidth - document.documentElement.clientWidth;
      document.documentElement.style.paddingRight = o && sb > 0 ? `${sb}px` : '';
      document.documentElement.classList.toggle('menu-open', o);
      if (bar) bar.classList.toggle('menu-is-open', o);
      btn.setAttribute('aria-label', o ? 'Menu sluiten' : 'Menu');
    };
    const close = (instant) => {
      if (!menu.open) return;
      clearTimeout(closing);
      if (instant) { menu.classList.remove('is-closing'); menu.open = false; setOpen(false); return; }
      menu.classList.add('is-closing');
      closing = setTimeout(() => { menu.classList.remove('is-closing'); menu.open = false; setOpen(false); }, reduce ? 150 : 200);
    };
    menu.addEventListener('toggle', () => {
      setOpen(menu.open);
      if (menu.open) { menu.classList.remove('is-closing'); const first = $('.menu-nav a', panel); if (first) first.focus({ preventScroll: true }); }
    });
    // de knop: sluiten met een korte fade (openen doet details zelf)
    btn.addEventListener('click', (e) => { if (menu.open) { e.preventDefault(); close(false); btn.focus({ preventScroll: true }); } });
    // een link sluit het menu meteen; daarna scrolt de browser naar de sectie (of opent het venster gratis analyse)
    panel.addEventListener('click', (e) => { if (e.target.closest('a')) close(true); });
    document.addEventListener('click', (e) => { if (menu.open && !menu.contains(e.target)) close(false); });
    document.addEventListener('keydown', (e) => {
      if (!menu.open) return;
      if (e.key === 'Escape') { e.preventDefault(); close(false); btn.focus({ preventScroll: true }); return; }
      if (e.key !== 'Tab') return;
      const f = focusables(); const i = f.indexOf(document.activeElement);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus({ preventScroll: true }); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus({ preventScroll: true }); }
    });
    // wordt het venster 900 px of breder, dan verdwijnt het menu: sluit het, zodat de pagina weer scrolt
    window.matchMedia('(min-width: 900px)').addEventListener('change', (e) => { if (e.matches) close(true); });
  }

  /* ---------- welke sectie actief is: in de menubalk en in het menu ---------- */
  const navLinks = $$('.bar-nav a, .menu-nav a');
  const secs = [...new Set(navLinks.map((a) => (a.getAttribute('href') || '').split('#')[1]).filter(Boolean))].map((id) => document.getElementById(id)).filter(Boolean);
  if (secs.length && 'IntersectionObserver' in window) {
    const mark = (id) => navLinks.forEach((a) => { if (id && a.getAttribute('href').endsWith('#' + id)) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    const vis = new Map();
    const io = new IntersectionObserver((en) => {
      en.forEach((e) => vis.set(e.target.id, e.isIntersecting));
      const cur = secs.find((s) => vis.get(s.id));
      mark(cur ? cur.id : null);
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
    secs.forEach((s) => io.observe(s));
  }

  /* ---------- hero: het scherm speelt één taak af ----------
     Een mail van een klant komt binnen, de Offertemaker zet de offerte klaar, de Chief of Staff legt de beslissing
     voor en de bezoeker kiest zelf. De HTML staat al op de vraag: zo ziet iemand het zonder JavaScript of met minder
     beweging. Alles beweegt met opacity en transform op vaste plaatsen, dus niets verspringt (CLS 0). */
  const scr = $('.scr');
  if (scr) {
    const cards = [$('.scr-mail', scr), $('.scr-agent', scr), $('.scr-cos', scr)];
    const steps = $$('.scr-steps li', scr), file = $('.scr-file', scr);
    const mailSt = $('.scr-mail-st', scr), agentSt = $('.scr-agent-st', scr);
    const now = $('.scr-now', scr), reply = $('.scr-reply', scr), logT = $('.scr-log-t', scr), again = $('.scr-again', scr);
    const btns = $$('.scr-act .ch', scr);
    const LOG0 = logT.textContent;
    const KEUZE = {
      yes: { reply: 'Verstuurd om 09:14. Opvolging staat op donderdag.', log: '09:14 · Verstuurd na jouw akkoord' },
      wait: { reply: 'Ze blijft klaarstaan. Ik vraag het je morgen om 08:00 opnieuw.', log: '09:14 · In de wacht tot morgen 08:00' }
    };
    let timers = [];
    const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
    const stop = () => { timers.forEach(clearTimeout); timers = []; };
    const setSt = (el, text, kind) => { el.classList.remove('st--new', 'st--busy', 'st--ok'); el.classList.add(`st--${kind}`); el.textContent = text; };
    const stepOn = (i) => steps[i] && steps[i].classList.add('is-on');
    const stepDone = (i) => { steps[i].classList.remove('is-on'); steps[i].classList.add('is-done'); };
    // ronde 4: het scherm meldt elke stap, zodat de beweging eromheen in de maat blijft (zie "hero: het hele team werkt mee")
    const emit = (k) => scr.dispatchEvent(new CustomEvent('scr', { detail: k }));

    // de vraag: alles staat klaar, de knoppen zijn open
    const atQuestion = () => {
      scr.classList.remove('is-empty');
      cards.forEach((c) => { c.classList.add('is-in'); c.classList.remove('is-hot'); });
      steps.forEach((li, i) => stepDone(i));
      file.classList.add('is-on'); cards[1].classList.add('is-done');
      setSt(mailSt, 'Opgenomen', 'ok'); setSt(agentSt, 'Klaar', 'ok');
      scr.classList.remove('is-typing'); scr.classList.add('is-asking');
      now.textContent = '09:13';
      emit('static');
    };
    const reset = () => {
      stop();
      scr.classList.remove('is-asking', 'is-typing', 'is-decided', 'is-done', 'is-yes', 'is-wait');
      btns.forEach((b) => { b.removeAttribute('aria-disabled'); b.classList.remove('is-chosen'); });
      reply.textContent = ''; logT.textContent = LOG0;
      emit('reset');
    };
    // stap 0: nog niets binnen
    const prime = () => {
      cards.forEach((c) => c.classList.remove('is-in', 'is-hot', 'is-done'));
      steps.forEach((li) => li.classList.remove('is-on', 'is-done'));
      file.classList.remove('is-on');
      setSt(mailSt, 'Nieuw', 'new'); setSt(agentSt, 'Bezig', 'busy');
      now.textContent = '08:56';
      scr.classList.add('is-empty');
    };
    const play = (focusAfter) => {
      reset();
      if (reduce) { atQuestion(); if (focusAfter) btns[0].focus({ preventScroll: true }); return; }
      prime();
      emit('start');
      const T = [
        [300, () => { scr.classList.remove('is-empty'); cards[0].classList.add('is-in', 'is-hot'); now.textContent = '08:57'; emit('mail'); }],
        [1400, () => { setSt(mailSt, 'Opgenomen', 'ok'); cards[0].classList.remove('is-hot'); cards[1].classList.add('is-in', 'is-hot'); stepOn(0); emit('agent'); }],
        [2150, () => { stepDone(0); stepOn(1); now.textContent = '09:03'; }],
        [2950, () => { stepDone(1); stepOn(2); now.textContent = '09:08'; }],
        [3750, () => { stepDone(2); file.classList.add('is-on'); cards[1].classList.add('is-done'); setSt(agentSt, 'Klaar', 'ok'); now.textContent = '09:12'; emit('done'); }],
        [4300, () => { cards[1].classList.remove('is-hot'); cards[2].classList.add('is-in'); scr.classList.add('is-typing'); now.textContent = '09:13'; emit('typing'); }],
        [5100, () => { scr.classList.remove('is-typing'); scr.classList.add('is-asking'); emit('ask'); if (focusAfter) btns[0].focus({ preventScroll: true }); }]
      ];
      T.forEach(([ms, fn]) => later(fn, ms));
    };
    const decide = (btn) => {
      if (!scr.classList.contains('is-asking') || scr.classList.contains('is-decided')) return;
      const k = btn.dataset.keuze, keyboard = btn.matches(':focus-visible');
      scr.classList.add('is-decided', `is-${k}`);
      btns.forEach((b) => b.setAttribute('aria-disabled', 'true'));
      btn.classList.add('is-chosen');
      emit(k);
      later(() => {
        reply.textContent = KEUZE[k].reply; logT.textContent = KEUZE[k].log; now.textContent = '09:14';
        scr.classList.add('is-done');
        if (keyboard) again.focus({ preventScroll: true });
      }, reduce ? 0 : 320);
    };
    btns.forEach((b) => b.addEventListener('click', () => decide(b)));
    again.addEventListener('click', () => play(again.matches(':focus-visible')));

    /* ---------- hero: het hele team werkt mee (ronde 4, 3/11/2026) ----------
       Rond het scherm: kaartjes van andere afdelingen (twee lagen), een lijn langs de zijbalk met lichtpulsen naar de Chief of
       Staff, een gloed bij de vraag en een puls na de keuze; het scherm kantelt licht mee met de muis (desktop). Alleen
       transform en opacity. Pauzeert buiten beeld en in een verborgen tabblad. Met minder beweging blijft dit een stil beeld. */
    const fig = scr.closest('.hero-fig');
    const front = fig && $('.hs-front', fig), back = fig && $('.hs-back', fig);
    if (fig && front && back) {
      const svg = $('.hs-lines', front), pulse = $('.hs-pulse', front), ring = $('.hs-ring', front), halo = $('.hs-halo', back);
      const blobs = $$('.hs-blob', back);
      const slot = (n) => $(`.hs-card[data-slot="${n}"]`, fig);
      const dot = (d) => $(`.app-side [data-d="${d}"] .sd`, scr);
      const TASK = { plan: ['Planner', '3 plaatsbezoeken'], adm: ['Factuurjager', '4 herinneringen'], ks: ['Storingsdesk', 'een antwoord'], mkt: ['Reviewvrager', 'een reviewvraag'] };
      const phone = window.matchMedia('(max-width: 720px)');
      let P = {}, st = [], live = true;
      const at = (fn, ms) => { st.push(setTimeout(fn, ms)); };
      const clear = () => { st.forEach(clearTimeout); st = []; };
      // posities meten (zonder transform: offsetLeft/Top) en de lijn tekenen
      const layout = () => {
        const app = scr, side = $('.app-side', app);
        fig.style.setProperty('--app-h', `${app.offsetHeight}px`);
        front.style.height = back.style.height = `${app.offsetHeight}px`;
        P = {};
        if (!side || getComputedStyle(side).display === 'none') { svg.innerHTML = ''; return; }
        $$('li[data-d]', side).forEach((li) => { const d = $('.sd', li); P[li.dataset.d] = { x: app.offsetLeft + d.offsetLeft + d.offsetWidth / 2, y: app.offsetTop + d.offsetTop + d.offsetHeight / 2 }; });
        const x = P.cos.x, n1 = Math.round(P.adm.y + 40), n2 = n1 + 86, nx = Math.round(x + 13);
        fig.style.setProperty('--n1', `${n1}px`); fig.style.setProperty('--n2', `${n2}px`); fig.style.setProperty('--n-x', `${nx}px`);
        P.n1 = { x, y: n1 + 21, cx: nx }; P.n2 = { x, y: n2 + 21, cx: nx };
        const W = fig.offsetWidth, H = app.offsetHeight;
        svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        svg.innerHTML = `<defs><linearGradient id="hs-g" gradientUnits="userSpaceOnUse" x1="0" y1="${P.cos.y}" x2="0" y2="${P.n2.y}"><stop offset="0" stop-color="#2f7bff"/><stop offset=".5" stop-color="#13c7e6"/><stop offset="1" stop-color="#2ff0a6"/></linearGradient></defs>`
          + `<path stroke="url(#hs-g)" stroke-opacity=".55" d="M${x} ${P.cos.y + 7}V${P.n2.y}M${x} ${P.n1.y}H${nx}M${x} ${P.n2.y}H${nx}"/>`;
      };
      // een lichtpuls langs de lijn naar de Chief of Staff (transform en opacity, WAAPI)
      const send = (from) => {
        const a = P[from], c = P.cos;
        if (!a || !c || !pulse.animate || !live) return;
        const k = [{ transform: `translate3d(${a.cx || a.x}px,${a.y}px,0)`, opacity: 0 }];
        k.push({ transform: `translate3d(${a.x}px,${a.y}px,0)`, opacity: 1, offset: a.cx ? 0.18 : 0.1 });
        k.push({ transform: `translate3d(${c.x}px,${c.y + 2}px,0)`, opacity: 1, offset: 0.92 }, { transform: `translate3d(${c.x}px,${c.y}px,0)`, opacity: 0 });
        const dur = 360 + Math.abs(a.y - c.y) * 2.4;
        pulse.animate(k, { duration: dur, easing: 'cubic-bezier(.4,0,.2,1)' });
        at(() => { const d = dot('cos'); if (d) { d.classList.add('is-hit'); at(() => d.classList.remove('is-hit'), 650); } }, dur * 0.9);
      };
      const side = (d, state) => { const el = dot(d); if (el) { el.classList.toggle('is-busy', state === 'busy'); el.classList.toggle('is-done', state === 'done'); } };
      const card = (n, task, state) => {
        const el = slot(n); if (!el) return;
        const [who, what] = TASK[task];
        const show = () => { $('b', el).textContent = who; $('.hs-c2', el).textContent = what; el.dataset.task = task; el.classList.remove('is-done', 'is-busy'); el.classList.add(`is-${state}`); el.classList.remove('is-out'); };
        if (el.dataset.task && el.dataset.task !== task && !el.classList.contains('is-out')) { el.classList.add('is-out'); at(show, 650); } else show();
      };
      const done = (n, task, pulseFrom) => { const el = slot(n); if (el) { el.classList.remove('is-busy'); el.classList.add('is-done'); } side(task, 'done'); if (pulseFrom) send(pulseFrom); };
      // alles uit: kaartjes weg, bolletjes neutraal
      const blank = () => { clear(); ['n1', 'n2', 'f1', 'f2'].forEach((n) => { const el = slot(n); if (el) { el.classList.add('is-out'); delete el.dataset.task; } }); ['sales', 'plan', 'ks', 'mkt', 'adm'].forEach((d) => side(d, null)); halo.classList.remove('is-on'); };
      // daarna rustig verder: om de beurt een kaartje weg, een nieuwe taak, even later klaar
      const ORDER = [['n1', 'ks'], ['f1', 'adm'], ['n2', 'mkt'], ['f2', 'plan'], ['n1', 'adm'], ['f1', 'mkt'], ['n2', 'plan'], ['f2', 'ks']];
      let ai = 0;
      const ambient = () => {
        if (!live || phone.matches) return;
        const pair = ORDER[ai % ORDER.length];
        const n = pair[0], t = pair[1];
        ai += 1;
        card(n, t, 'busy'); side(t, 'busy');
        at(() => done(n, t, n.charAt(0) === 'n' ? n : null), 2600);
        at(ambient, 4300);
      };
      // de choreografie, in de maat van het scherm (mail 300, agent 1400, klaar 3750, typen 4300, vraag 5100 ms)
      const run = () => {
        blank();
        if (phone.matches) return; // gsm: geen kaartjes (3/11, op vraag van Martijn: het kaartje boven het scherm oogde als een fout)
        at(() => { card('f1', 'ks', 'busy'); side('ks', 'busy'); }, 350);
        at(() => { card('n1', 'plan', 'busy'); side('plan', 'busy'); }, 1000);
        at(() => { card('n2', 'adm', 'busy'); side('adm', 'busy'); }, 2300);
        at(() => done('n1', 'plan', 'n1'), 2750);
        at(() => done('f1', 'ks', 'ks'), 3350);
        at(() => { card('f2', 'mkt', 'busy'); side('mkt', 'busy'); }, 4400);
        at(() => done('n2', 'adm', 'n2'), 4800);
        at(() => done('f2', 'mkt'), 6600);
        at(ambient, 8200);
      };
      scr.addEventListener('scr', (e) => {
        const k = e.detail;
        if (k === 'start') run();
        if (k === 'agent') side('sales', 'busy');
        if (k === 'done') { side('sales', 'done'); send('sales'); }
        if (k === 'ask') halo.classList.add('is-on');
        if (k === 'reset') halo.classList.remove('is-on');
        if ((k === 'yes' || k === 'wait') && ring.animate && !reduce) {
          halo.classList.remove('is-on');
          const yes = k === 'yes';
          ring.style.setProperty('--ring', yes ? 'rgba(47,240,166,.9)' : 'rgba(19,199,230,.7)');
          ring.style.setProperty('--ring-g', yes ? 'rgba(47,240,166,.5)' : 'rgba(19,199,230,.35)');
          ring.animate([{ transform: 'scale(1)', opacity: yes ? 0.95 : 0.7 }, { transform: `scale(${yes ? 1.06 : 1.035})`, opacity: 0 }], { duration: yes ? 1300 : 1900, easing: 'cubic-bezier(.2,.7,.2,1)' });
        }
      });
      // muis-kanteling met een zachte veer (desktop met muis); de lagen bewegen elk anders
      const tiltOK = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1100px)');
      let tx = 0, ty = 0, cx = 0, cy = 0, vx = 0, vy = 0, raf = 0;
      const apply = () => {
        const tr = `perspective(1600px) rotateX(${(-cy * 2.2).toFixed(3)}deg) rotateY(${(cx * 3.2).toFixed(3)}deg)`;
        scr.style.transform = tr; front.style.transform = tr;
        back.style.transform = `translate3d(${(-cx * 9).toFixed(2)}px,${(-cy * 7).toFixed(2)}px,0)`;
        if (blobs[0]) blobs[0].style.translate = `${(cx * 16).toFixed(1)}px ${(cy * 12).toFixed(1)}px`;
        if (blobs[1]) blobs[1].style.translate = `${(-cx * 22).toFixed(1)}px ${(-cy * 16).toFixed(1)}px`;
      };
      const step = () => {
        vx = (vx + (tx - cx) * 0.05) * 0.82; vy = (vy + (ty - cy) * 0.05) * 0.82;
        cx += vx; cy += vy; apply();
        raf = (Math.abs(vx) + Math.abs(vy) + Math.abs(tx - cx) + Math.abs(ty - cy) > 0.0006) && live ? requestAnimationFrame(step) : 0;
      };
      const kick = () => { if (!raf && live) raf = requestAnimationFrame(step); };
      const hero = fig.closest('.hero') || fig;
      hero.addEventListener('pointermove', (e) => {
        if (!tiltOK.matches || reduce) return;
        const r = fig.getBoundingClientRect();
        tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2 + 200)));
        ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2 + 160)));
        kick();
      }, { passive: true });
      hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });
      // pauzeren buiten beeld of in een verborgen tabblad
      let inView = true;
      const setLive = (v) => {
        if (v === live) return;
        live = v; fig.classList.toggle('hs-paused', !v);
        if (!v) { clear(); if (raf) { cancelAnimationFrame(raf); raf = 0; } }
        else if (!reduce && (scr.classList.contains('is-asking') || scr.classList.contains('is-done'))) at(ambient, 1200);
      };
      if ('IntersectionObserver' in window) new IntersectionObserver((en) => { inView = en[0].isIntersecting; setLive(inView && !document.hidden); }).observe(hero);
      document.addEventListener('visibilitychange', () => setLive(inView && !document.hidden));
      layout();
      let rz = 0;
      window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(layout, 150); }, { passive: true });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
      // minder beweging: een stil beeld (kaartjes op klaar, de lijn staat er, geen puls)
      if (reduce) ['sales', 'plan', 'adm', 'ks', 'mkt'].forEach((d) => side(d, 'done'));
    }

    scr.classList.add('is-live');
    if (reduce) atQuestion();
    else {
      prime();
      // pas afspelen als het scherm echt in beeld is (op de gsm staat het onder de knop)
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((en) => { if (en.some((e) => e.isIntersecting)) { io.disconnect(); play(false); } }, { threshold: 0.35 });
        io.observe(scr);
      } else play(false);
    }
  }

  /* ---------- zo werkt het: de keuze bij de Chief of Staff ---------- */
  const how = $('.how-resp--cos');
  if (how) {
    const hb = $$('.ch', how), out = $('.how-reply', how);
    const TXT = { yes: 'Goedgekeurd. De 3 plaatsbezoeken staan in de agenda.', wait: 'In de wacht. De voorstellen blijven klaarstaan tot jij beslist.' };
    hb.forEach((b) => b.addEventListener('click', () => {
      if (b.getAttribute('aria-disabled') === 'true') return;
      hb.forEach((x) => x.setAttribute('aria-disabled', 'true'));
      b.classList.add('is-chosen');
      out.classList.toggle('is-wait', b.dataset.plan === 'wait');
      out.textContent = TXT[b.dataset.plan];
    }));
  }

  /* ---------- stel je team samen: per afdeling opnemen, links verschijnt het pakket ---------- */
  const team = $('.team');
  if (team) {
    // dezelfde voorbeeldagents als in de tekst van elke afdeling (ronde 2, 3/11/2026: Vragenbeantwoorder en Marge-analist
    // stonden alleen hier, niet op de pagina)
    const DEPS = {
      sales: { name: 'Sales en opvolging', agents: ['Leadopvolger', 'Offertemaker', 'Afsprakenplanner'] },
      plan: { name: 'Planning', agents: ['Planner', 'Weerwacht', 'Materiaalbesteller'] },
      ks: { name: 'Klantenservice', agents: ['Storingsdesk', 'Onderhoudsherinnering'] },
      mkt: { name: 'Marketing', agents: ['Reviewvrager', 'Advertentie-opvolger', 'E-mailschrijver'] },
      adm: { name: 'Administratie', agents: ['Factuurjager', 'Dossier-checker'] }
    };
    const ORDER = ['sales', 'plan', 'ks', 'mkt', 'adm'];
    const PACKS = {
      start: { name: 'Start', price: '€3.500 setup', month: '+ €750 per maand', note: 'Eén afdeling met 3 à 4 agents. De agent legt je het werk voor in de Telegram-groep. De Chief of Staff en het dashboard zitten vanaf Groei.' },
      groei: { name: 'Groei', price: '€7.500 setup', month: '+ €1.500 per maand', note: 'Met de Chief of Staff, die samenvat en je de beslissingen voorlegt, en het dashboard.' },
      volledig: { name: 'Volledig', price: 'vanaf €15.000 setup', month: '+ vanaf €2.500 per maand', note: 'Met integraties op maat en alles uit Groei. Het aantal agents en de precieze prijs volgen uit de analyse.' }
    };
    const picks = $$('.pick', team);
    const out = { name: $('.b-name', team), count: $('.b-count', team), price: $('.b-price', team), note: $('.b-note', team), agents: $('.b-agents', team) };
    const outs = $$('.pick-out', team); // gsm en tablet: je pakket naast elke knop (op desktop staat het links)
    let cur = null;
    const markCur = () => $$('li', out.agents).forEach((li) => li.classList.toggle('is-cur', li.dataset.dep === cur));
    const render = () => {
      const sel = ORDER.filter((k) => picks.find((c) => c.dataset.dep === k).getAttribute('aria-pressed') === 'true');
      const n = sel.length;
      if (!n) {
        out.name.textContent = 'Kies een afdeling'; out.count.textContent = 'nog geen afdeling'; out.price.innerHTML = '';
        out.note.textContent = 'Kies een of meer afdelingen, dan zie je welk pakket past.'; out.agents.innerHTML = '';
        outs.forEach((o) => { o.textContent = 'Nog geen afdeling gekozen'; });
        return;
      }
      const p = n === 1 ? PACKS.start : n <= 3 ? PACKS.groei : PACKS.volledig;
      out.name.textContent = p.name;
      const agents = sel.reduce((t, k) => t + DEPS[k].agents.length, 0);
      out.count.textContent = `${n} ${n === 1 ? 'afdeling' : 'afdelingen'}, ${agents} voorbeeldagent${agents === 1 ? '' : 's'}`;
      out.price.innerHTML = `${p.price} <span>${p.month}</span>`;
      out.note.textContent = p.note;
      out.agents.innerHTML = sel.map((k) => `<li data-dep="${k}"><b>${DEPS[k].name}</b> ${DEPS[k].agents.join(', ')}</li>`).join('');
      outs.forEach((o) => { o.textContent = `Jouw opzet: ${p.name}, ${p.price} ${p.month}`; });
      markCur();
    };
    picks.forEach((c) => c.addEventListener('click', () => { c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true')); render(); }));
    render();

    if ('IntersectionObserver' in window) {
      // de afdeling die je nu leest, licht op in je opzet (rustig, alleen een kleur)
      const deps = $$('.dep', team);
      const io = new IntersectionObserver((en) => {
        en.forEach((e) => { if (e.isIntersecting) { cur = e.target.dataset.dep; markCur(); deps.forEach((d) => d.classList.toggle('is-cur', d.dataset.dep === cur)); } });
      }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
      deps.forEach((d) => io.observe(d));
    }
  }

  /* ---------- vragen: één tegelijk open; op een breed scherm links de vragen en rechts het antwoord ---------- */
  const faq = $('.faq');
  if (faq) {
    const qs = $$('details[name="faq"]', faq);
    qs.forEach((d) => d.addEventListener('toggle', () => { if (d.open) qs.forEach((o) => { if (o !== d) o.open = false; }); }));
    let ix = null;
    const build = () => {
      ix = document.createElement('div');
      ix.className = 'faq-ix';
      ix.setAttribute('role', 'tablist');
      ix.setAttribute('aria-label', 'Vragen');
      ix.setAttribute('aria-orientation', 'vertical');
      const pane = document.createElement('div');
      pane.className = 'faq-pane';
      pane.id = 'faq-pane';
      pane.setAttribute('role', 'tabpanel');
      pane.innerHTML = '<p class="faq-pane-q"></p><div class="faq-pane-a"></div>';
      const bs = qs.map((d, i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.id = `faq-t${i}`;
        b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', 'faq-pane');
        b.textContent = $('summary', d).textContent;
        ix.appendChild(b);
        return b;
      });
      const pick = (i, focus) => {
        bs.forEach((b, j) => { b.setAttribute('aria-selected', String(i === j)); b.tabIndex = i === j ? 0 : -1; });
        pane.setAttribute('aria-labelledby', bs[i].id);
        const set = () => { $('.faq-pane-q', pane).textContent = bs[i].textContent; $('.faq-pane-a', pane).innerHTML = $('.a', qs[i]).innerHTML; pane.classList.remove('is-swap'); };
        if (reduce || !pane.firstChild.textContent) set(); else { pane.classList.add('is-swap'); setTimeout(set, 150); }
        if (focus) bs[i].focus();
      };
      bs.forEach((b, i) => {
        b.addEventListener('click', () => pick(i));
        b.addEventListener('keydown', (e) => {
          const k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
          if (k) { e.preventDefault(); pick((i + k + bs.length) % bs.length, true); }
          if (e.key === 'Home') { e.preventDefault(); pick(0, true); }
          if (e.key === 'End') { e.preventDefault(); pick(bs.length - 1, true); }
        });
      });
      faq.append(ix, pane);
      pick(0);
    };
    const apply = () => {
      if (wide.matches) { if (!ix) build(); faq.classList.add('is-index'); }
      else faq.classList.remove('is-index');
    };
    apply();
    wide.addEventListener('change', apply);
  }
})();
