/* EML AI Team, homepage v4c "Het hoofdkwartier". Alles werkt ook zonder dit script: de tekst, de panelen per
   verdieping, het gesprek en de doorsnede van het gebouw staan in de HTML. Dit script voegt toe: de scrollrit,
   het 3D-gebouw (pas na het laden, en alleen als het toestel het aankan), het gesprek, de ticker en de teambouwer.
   Gsm (smal scherm, of aanraakscherm zonder breed venster; v4d, 31/10/2026): geen 3D, geen scrollrit en geen beweging
   bij het scrollen. De afdelingen worden compacte kaarten; het gesprek speelt pas verder als je erop tikt. */
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
  // zelfde voorwaarde als de gsm-regels in site.css en de <source media> van de heroafbeelding
  const phone = window.matchMedia('(max-width: 720px), (hover: none) and (pointer: coarse) and (max-width: 1023px)').matches;
  const calm = reduce || phone;
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

  /* ---------- verschijnen bij het scrollen ---------- */
  const revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !calm) {
    const io = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -4% 0px', threshold: 0 });
    revealEls.forEach((el) => io.observe(el));
  } else revealEls.forEach((el) => el.classList.add('is-in'));

  /* ---------- vragen: één tegelijk open ---------- */
  const qs = $$('details[name="faq"]');
  qs.forEach((d) => d.addEventListener('toggle', () => { if (d.open) qs.forEach((o) => { if (o !== d) o.open = false; }); }));

  /* ---------- menu op de gsm ---------- */
  const menu = $('.sbar-menu');
  if (menu) {
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) menu.open = false; });
    document.addEventListener('click', (e) => { if (menu.open && !menu.contains(e.target)) menu.open = false; });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.open) { menu.open = false; $('summary', menu).focus(); } });
  }

  /* ---------- tikkende tijd in de statusbalk ---------- */
  const clock = $('.clock');
  if (clock) {
    const tick = () => { const d = new Date(); clock.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':'); };
    tick(); setInterval(tick, 1000);
  }

  /* ---------- de scrollrit: welke verdieping is in beeld ---------- */
  const ride = $('.ride');
  let hq = null; // het 3D-gebouw, zodra het geladen is
  if (ride) {
    const steps = $$('.step', ride);
    const where = $('.ride-where', ride), kEl = $('.ride-k', ride);
    const floorsSvg = $$('.bld--static .fl', ride);
    const NAMES = ['Buitenkant', 'Sales en opvolging', 'Planning', 'Klantenservice', 'Marketing', 'Administratie', 'Chief of Staff'];
    let cur = -1;
    const update = () => {
      const mid = window.innerHeight * 0.55;
      let j = 0;
      steps.forEach((s, i) => { if (s.getBoundingClientRect().top <= mid) j = i; });
      if (j === cur) return;
      cur = j;
      steps.forEach((s, i) => s.classList.toggle('is-on', i === j));
      ride.dataset.step = String(j);
      if (where) where.textContent = NAMES[j];
      if (kEl) kEl.textContent = `0${j} / 06`;
      floorsSvg.forEach((f) => f.classList.toggle('is-on', +f.dataset.floor === j - 1));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });

    // 3D alleen als het toestel het aankan; anders blijft de doorsnede staan (alle inhoud blijft gelijk)
    const conn = navigator.connection || {};
    const weak = (navigator.deviceMemory && navigator.deviceMemory < 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) || conn.saveData;
    const canGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();
    if (!reduce && !weak && canGL && !phone) {
      const go = () => {
        const light = window.innerWidth < 720 || window.matchMedia('(pointer: coarse)').matches;
        import('./hq3d.js?v=5').then((m) => {
          hq = m.start({ canvas: $('.hq-canvas', ride), ride, steps, light, onReady: () => ride.classList.add('is-3d') });
          if (!hq) ride.classList.add('no-3d');
        }).catch(() => ride.classList.add('no-3d'));
      };
      const idle = window.requestIdleCallback || ((f) => setTimeout(f, 300));
      if (document.readyState === 'complete') idle(go, { timeout: 1500 });
      else window.addEventListener('load', () => idle(go, { timeout: 1500 }), { once: true });
    } else ride.classList.add('no-3d');
  }

  /* ---------- gsm: "mag zelf / vraagt eerst akkoord / nooit" open te klikken per afdeling ---------- */
  if (phone) $$('.floor .limits').forEach((ul) => {
    const d = document.createElement('details');
    d.className = 'lim-acc';
    d.innerHTML = '<summary>Mag zelf, vraagt eerst akkoord, nooit</summary>';
    ul.replaceWith(d);
    d.appendChild(ul);
  });

  /* ---------- het gesprek op de bovenste verdieping ---------- */
  const chat = $('.chat');
  if (chat) {
    const log = $('.chat-log', chat);
    const WAVE = [.35, .6, .9, .5, .75, 1, .55, .3, .7, .95, .6, .4, .8, .5, .65, .35];
    const SCENES = {
      offerte: {
        chip: 'Offerte klaarzetten', floor: 0,
        me: { voice: '0:14', text: 'Zet de offerte voor de renovatie in de Kerkstraat klaar, op basis van de aanvraag van gisteren.', time: '08:20' },
        agent: { name: 'Offertemaker', dept: 'Sales en opvolging', av: 'OM', text: 'Het concept staat klaar: renovatie Kerkstraat, met de werken en materialen uit de aanvraag.', file: ['Offerte-concept Kerkstraat', "2 pagina's"], time: '08:31' },
        cos: { text: 'Eén beslissing voor jou: de offerte voor de renovatie in de Kerkstraat is klaar om te vertrekken. Goedkeuren of wachten?', time: '08:32' },
        yes: 'Goedgekeurd. De offerte is vrijgegeven.', wait: 'In de wacht. De offerte blijft klaarstaan tot jij beslist.'
      },
      facturen: {
        chip: 'Facturen opvolgen', floor: 4,
        me: { text: 'Volg de facturen op die langer dan 30 dagen openstaan.', time: '10:05' },
        agent: { name: 'Factuurjager', dept: 'Administratie', av: 'FJ', text: '4 facturen staan langer dan 30 dagen open. Voor elke klant staat een vriendelijke herinnering klaar.', file: ['Herinneringen, 4 klanten', '4 mails'], time: '10:09' },
        cos: { text: 'Eén beslissing voor jou: 4 herinneringen zijn klaar om te vertrekken. Goedkeuren of wachten?', time: '10:10' },
        yes: 'Goedgekeurd. De 4 herinneringen zijn vrijgegeven.', wait: 'In de wacht. De herinneringen blijven klaarstaan tot jij beslist.'
      },
      planning: {
        chip: 'Plaatsbezoeken inplannen', floor: 1,
        me: { voice: '0:09', text: 'Plan de 3 plaatsbezoeken van volgende week in.', time: '11:40' },
        agent: { name: 'Planner', dept: 'Planning', av: 'PL', text: '3 momenten passen in de agenda van je techniekers en in hun route: dinsdag 09:00, woensdag 14:00 en donderdag 10:30.', time: '11:44' },
        cos: { text: 'Eén beslissing voor jou: 3 plaatsbezoeken zijn klaar om in te plannen. Goedkeuren of wachten?', time: '11:45' },
        yes: 'Goedgekeurd. De 3 plaatsbezoeken staan in de agenda.', wait: 'In de wacht. De voorstellen blijven klaarstaan tot jij beslist.'
      }
    };
    let current = 'offerte', timers = [], started = false;
    const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
    const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
    const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const scrollDown = () => log.scrollTo({ top: log.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
    const meMsg = (m) => el(`<li class="msg msg--me"><div class="bubble">${m.voice ? `<p class="voice"><svg class="voice-play" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.2v9.6L12.6 8z"/></svg><span class="wave" aria-hidden="true">${WAVE.map((h) => `<i style="--h:${h}"></i>`).join('')}</span><span class="voice-len">${m.voice}</span></p>` : ''}<p>${esc(m.text)}</p><span class="time">${m.time}</span></div></li>`);
    const agentMsg = (a) => el(`<li class="msg msg--agent"><span class="av" aria-hidden="true">${a.av}</span><div class="bubble"><p class="who">${a.name} <span>${a.dept}</span></p><p>${esc(a.text)}</p>${a.file ? `<p class="file"><span class="file-ic" aria-hidden="true">${a.file[1].includes('mail') ? 'MAIL' : 'PDF'}</span><span>${esc(a.file[0])}<br><small>${esc(a.file[1])}</small></span></p>` : ''}<span class="time">${a.time}</span></div></li>`);
    const cosMsg = (c) => el(`<li class="msg msg--cos"><span class="av av--cos" aria-hidden="true">CS</span><div class="bubble"><p class="who">Chief of Staff</p><p>${esc(c.text)}</p><div class="choice"><button type="button" class="ch ch--yes" data-choice="yes">Goedkeuren</button><button type="button" class="ch" data-choice="wait">Wacht</button></div><span class="time">${c.time}</span></div></li>`);
    const typingMsg = (a) => el(`<li class="msg msg--agent typing"><span class="av" aria-hidden="true">${a.av}</span><div class="bubble"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="sr-only">${a.name} typt</span></div></li>`);
    const replyMsg = (text, ok, time) => el(`<li class="msg msg--cos"><span class="av av--cos" aria-hidden="true">CS</span><div class="bubble"><p class="who">Chief of Staff</p><p class="reply${ok ? ' reply--ok' : ''}">${esc(text)}</p><span class="time">${time}</span></div></li>`);
    const add = (node) => { if (!reduce) node.classList.add('is-new'); log.appendChild(node); scrollDown(); return node; };
    const plusMinutes = (t, n) => { const [h, m] = t.split(':').map(Number); const d = h * 60 + m + n; return `${String(Math.floor(d / 60)).padStart(2, '0')}:${String(d % 60).padStart(2, '0')}`; };
    const flow = (from, to) => { if (hq) hq.flow(from, to); };

    function offerNext(focusFirst) {
      const others = Object.keys(SCENES).filter((k) => k !== current);
      const row = el(`<li class="chat-next"><p>Geef nog een taak door</p><div class="chips">${others.map((k) => `<button type="button" class="chip" data-scene="${k}">${SCENES[k].chip}</button>`).join('')}</div></li>`);
      add(row);
      if (focusFirst) $('.chip', row).focus({ preventScroll: true });
    }
    function decide(btn) {
      const msg = btn.closest('.msg');
      if (!msg || msg.dataset.done) return;
      msg.dataset.done = '1';
      const ok = btn.dataset.choice === 'yes';
      $$('.ch', msg).forEach((b) => b.setAttribute('aria-disabled', 'true'));
      btn.classList.add('is-chosen');
      const sc = SCENES[current];
      const keyboard = btn.matches(':focus-visible');
      if (ok) flow(5, sc.floor); // het akkoord reist van de Chief of Staff naar de afdeling
      later(() => { add(replyMsg(ok ? sc.yes : sc.wait, ok, plusMinutes(sc.cos.time, 2))); later(() => offerNext(keyboard), reduce ? 0 : 500); }, reduce ? 0 : 350);
    }
    function play(key, focusCard) {
      clearTimers();
      current = key;
      const sc = SCENES[key];
      $$('.msg, .chat-next', log).forEach((n) => n.remove());
      const steps = [
        () => add(meMsg(sc.me)),
        () => { add(typingMsg(sc.agent)); flow(5, sc.floor); },
        () => { const t = $('.typing', log); if (t) t.remove(); add(agentMsg(sc.agent)); },
        () => { const c = add(cosMsg(sc.cos)); flow(sc.floor, 5); if (focusCard) $('.ch--yes', c).focus({ preventScroll: true }); }
      ];
      if (reduce) { steps.forEach((s, i) => { if (i !== 1) s(); }); return; }
      [250, 1000, 2100, 3000].forEach((ms, i) => later(steps[i], ms));
    }
    // het gesprek speelt zich af zodra de bovenste verdieping in beeld komt (niet op de gsm: daar staat het er meteen)
    const first = $$('.msg[data-step]', log);
    const run = () => {
      if (started) return; started = true;
      const show = (i) => { first[i].classList.remove('is-pending'); first[i].classList.add('is-new'); scrollDown(); };
      later(() => show(0), 300);
      later(() => { add(typingMsg(SCENES.offerte.agent)); flow(5, 0); }, 1100);
      later(() => { const t = $('.typing', log); if (t) t.remove(); show(1); }, 2200);
      later(() => { show(2); flow(0, 5); }, 3100);
    };
    if (!calm && 'IntersectionObserver' in window) {
      first.forEach((m) => m.classList.add('is-pending'));
      const io = new IntersectionObserver((en) => { if (en[0].isIntersecting) { run(); io.disconnect(); } }, { threshold: 0.35 });
      io.observe(chat);
    }
    chat.addEventListener('click', (e) => {
      const ch = e.target.closest('.ch');
      if (ch && ch.getAttribute('aria-disabled') !== 'true') { decide(ch); return; }
      const chip = e.target.closest('.chip');
      if (chip) play(chip.dataset.scene, chip.matches(':focus-visible'));
    });
  }

  /* ---------- ticker: naadloos lopen, pauzeerbaar ---------- */
  const ticker = $('.ticker');
  if (ticker) {
    const track = $('.ticker-track', ticker);
    if (!calm) $$('li', track).forEach((li) => { const c = li.cloneNode(true); c.setAttribute('aria-hidden', 'true'); track.appendChild(c); });
    const btn = $('.ticker-btn', ticker);
    btn.addEventListener('click', () => { const p = ticker.classList.toggle('is-paused'); btn.setAttribute('aria-pressed', String(p)); btn.textContent = p ? 'Verder' : 'Pauze'; });
  }

  /* ---------- stel je team samen: gekozen afdelingen lichten op als verdiepingen ---------- */
  const builder = $('.builder');
  if (builder) {
    const DEPS = {
      sales: { name: 'Sales en opvolging', agents: ['Leadopvolger', 'Offertemaker', 'Afsprakenplanner'] },
      plan: { name: 'Planning', agents: ['Planner', 'Weerwacht', 'Materiaalbesteller'] },
      ks: { name: 'Klantenservice', agents: ['Storingsdesk', 'Onderhoudsherinnering', 'Vragenbeantwoorder'] },
      mkt: { name: 'Marketing', agents: ['Reviewvrager', 'Advertentie-opvolger', 'E-mailschrijver'] },
      adm: { name: 'Administratie', agents: ['Factuurjager', 'Dossier-checker', 'Marge-analist'] }
    };
    const ORDER = ['sales', 'plan', 'ks', 'mkt', 'adm'];
    const PACKS = {
      start: { name: 'Start', price: '€3.500 setup', month: '+ €750 per maand', note: 'Eén afdeling met 3 à 4 agents. De agent legt je het werk voor in de Telegram-groep. De Chief of Staff en het dashboard zitten vanaf Groei.' },
      groei: { name: 'Groei', price: '€7.500 setup', month: '+ €1.500 per maand', note: 'Met de Chief of Staff, die samenvat en je de beslissingen voorlegt, en het dashboard.' },
      volledig: { name: 'Volledig', price: 'vanaf €15.000 setup', month: '+ vanaf €2.500 per maand', note: 'Met integraties op maat en alles uit Groei. Het aantal agents en de precieze prijs volgen uit de analyse.' }
    };
    const chips = $$('.chip-dep', builder);
    const floors = $$('.bld--builder .fl', builder);
    const out = { name: $('.b-name', builder), count: $('.b-count', builder), price: $('.b-price', builder), note: $('.b-note', builder), agents: $('.b-agents', builder) };
    const render = (justAdded) => {
      const sel = ORDER.filter((k) => chips.find((c) => c.dataset.dep === k).getAttribute('aria-pressed') === 'true');
      const n = sel.length;
      floors.forEach((f) => {
        const on = f.dataset.dep === 'cs' ? n >= 2 : sel.includes(f.dataset.dep);
        f.classList.toggle('lit', on);
        f.classList.toggle('pop', on && f.dataset.dep === justAdded);
      });
      if (!n) {
        out.name.textContent = 'Kies een afdeling'; out.count.textContent = ''; out.price.innerHTML = '';
        out.note.textContent = 'Kies hierboven een of meer afdelingen, dan zie je welk pakket past.'; out.agents.innerHTML = '';
        return;
      }
      const p = n === 1 ? PACKS.start : n <= 3 ? PACKS.groei : PACKS.volledig;
      out.name.textContent = p.name;
      out.count.textContent = `${n} ${n === 1 ? 'afdeling' : 'afdelingen'}, ${n * 3} voorbeeldagents`;
      out.price.innerHTML = `${p.price} <span>${p.month}</span>`;
      out.note.textContent = p.note;
      out.agents.innerHTML = sel.map((k) => `<li><b>${DEPS[k].name}</b> ${DEPS[k].agents.join(', ')}</li>`).join('');
    };
    chips.forEach((c) => c.addEventListener('click', () => { const on = c.getAttribute('aria-pressed') !== 'true'; c.setAttribute('aria-pressed', String(on)); render(on ? c.dataset.dep : null); }));
    render(null);
  }
})();
