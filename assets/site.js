/* Halo & Block. Scroll film + configurator + leads. PRICES ARE PREVIEW ESTIMATES (validate with Max/Kleber). */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 699px)').matches;
const money = n => '$' + Math.round(n).toLocaleString('en-US');

/* ---------- pricing (same formula as FUNIL.md) ---------- */
const P = {
  base: 179, minL: 24, maxL: 96, oversizeOver: 60, oversizeFee: 59,
  finishes: { walnut: { name: 'Walnut', rate: 6.5 }, oak: { name: 'White Oak', rate: 5.5 }, black: { name: 'Matte Black', rate: 4.5 }, white: { name: 'Matte White', rate: 4.5 } },
  depths: { 8: .92, 10: 1, 12: 1.12 },
  leds: { warm: { name: '2700K Warm', sat: 0 }, soft: { name: '3000K Soft', sat: .32 }, neutral: { name: '4000K Neutral', sat: .78 } }
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const unit = c => Math.round(P.base + P.finishes[c.finish].rate * clamp(c.length, P.minL, P.maxL) * P.depths[c.depth] + (c.length > P.oversizeOver ? P.oversizeFee : 0));
const minPrice = Math.min(...Object.keys(P.finishes).map(f => unit({ finish: f, length: 24, depth: 8 })));

/* ---------- motion (CDN, optional) ---------- */
let M = null;
if (!reduce) {
  try { M = await import('https://cdn.jsdelivr.net/npm/motion@14.8.0/+esm'); document.documentElement.classList.add('js-motion'); }
  catch (e) { M = null; }
}

/* ---------- nav ---------- */
const nav = $('#nav');
const onScrollNav = () => nav.classList.toggle('solid', scrollY > innerHeight * 0.6);
addEventListener('scroll', onScrollNav, { passive: true }); onScrollNav();

/* ---------- hero film ---------- */
const FRAMES_D = 145, FRAMES_M = 145;
const FILM = mobile ? { dir: 'assets/frames/m/', n: FRAMES_M } : { dir: 'assets/frames/d/', n: FRAMES_D };
const cue = $('.cue'), hero = $('.hero'), poster = $('#poster'), canvas = $('#film');
const caps = $$('.cap').map(el => { const [a, b] = el.dataset.range.split(',').map(Number); return { el, a, b }; });
$('#fromPrice').textContent = 'From ' + money(minPrice);
const src = i => FILM.dir + 'f' + String(i + 1).padStart(3, '0') + '.webp';

if (reduce) {
  poster.removeAttribute('srcset');
  poster.src = src(FILM.n - 1);
} else {
  const ctx = canvas.getContext('2d', { alpha: false });
  const imgs = new Array(FILM.n), ready = new Uint8Array(FILM.n);
  let want = 0, drawn = -1, raf = 0, cw = 0, ch = 0;
  const size = () => {
    const dpr = Math.min(devicePixelRatio || 1, mobile ? 2 : 1.5);
    cw = canvas.width = Math.round(canvas.clientWidth * dpr);
    ch = canvas.height = Math.round(canvas.clientHeight * dpr);
    drawn = -1; schedule();
  };
  const nearest = i => { for (let d = 0; d < FILM.n; d++) { if (i - d >= 0 && ready[i - d]) return i - d; if (i + d < FILM.n && ready[i + d]) return i + d; } return -1; };
  const draw = () => {
    raf = 0;
    const k = nearest(want); if (k < 0 || k === drawn) return;
    const im = imgs[k], iw = im.naturalWidth, ih = im.naturalHeight;
    const s = Math.max(cw / iw, ch / ih), w = iw * s, h = ih * s;
    ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
    if (drawn < 0) canvas.classList.add('on');
    drawn = k;
  };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(draw); };
  // coarse-to-fine load order: first frame, then every 16th, 8th, 4th, 2nd, all
  const order = [0]; const seen = new Set(order);
  for (const step of [16, 8, 4, 2, 1]) for (let i = 0; i < FILM.n; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
  if (!seen.has(FILM.n - 1)) order.splice(2, 0, FILM.n - 1);
  let next = 0, active = 0;
  const pump = () => {
    while (active < 6 && next < order.length) {
      const i = order[next++], im = new Image(); active++;
      im.decoding = 'async'; im.src = src(i); imgs[i] = im;
      const done = ok => { active--; if (ok) { ready[i] = 1; schedule(); } pump(); };
      (im.decode ? im.decode() : Promise.resolve()).then(() => done(true), () => done(false));
    }
  };
  pump();
  addEventListener('resize', size); size();

  const capOpacity = (p, a, b) => {
    const e = 0.07;
    const inn = a <= 0 ? 1 : (p - a) / e;
    const out = b > 1 ? 1 : (b - p) / e;
    return clamp(Math.min(inn, out), 0, 1);
  };
  const onProgress = p => {
    want = clamp(Math.round(p * (FILM.n - 1)), 0, FILM.n - 1); schedule();
    for (const c of caps) {
      const o = capOpacity(p, c.a, c.b);
      c.el.style.opacity = o;
      c.el.style.transform = `translate3d(0,${((1 - o) * 24).toFixed(1)}px,0)`;
      c.el.classList.toggle('on', o > 0.5);
    }
    cue.style.opacity = p > 0.03 ? 0 : 1;
  };
  const heroProgress = () => {
    const r = hero.getBoundingClientRect(), total = hero.offsetHeight - innerHeight;
    return clamp(-r.top / total, 0, 1);
  };
  if (M) M.scroll(p => onProgress(p), { target: hero, offset: ['start start', 'end end'] });
  else addEventListener('scroll', () => onProgress(heroProgress()), { passive: true });
  onProgress(heroProgress());
}

/* ---------- reveals ---------- */
function splitWords(el) {
  const walk = node => {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(t => {
          if (!t) return;
          if (/^\s+$/.test(t)) { frag.append(document.createTextNode(t)); return; }
          const s = document.createElement('span'); s.className = 'w'; s.textContent = t; frag.append(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
    });
  };
  walk(el);
}
if (M) {
  const { animate, inView, scroll, stagger } = M;
  const spring = { type: 'spring', stiffness: 120, damping: 22, mass: 0.9 };
  $$('.split').forEach(el => {
    splitWords(el);
    inView(el, () => { animate(el.querySelectorAll('.w'), { opacity: [0, 1], y: ['0.5em', '0em'] }, { ...spring, delay: stagger(0.06) }); }, { amount: 0.4 });
  });
  const rv = $$('.body, .facts li, .steps li, .incl, .inline-form, .panel > *, .faq details, .cap-actions');
  rv.filter(el => !el.closest('.hero')).forEach(el => el.classList.add('rv'));
  $$('.light-copy, .box-copy, .blocks-copy, .panel, .faq').forEach(group => {
    inView(group, () => { animate(group.querySelectorAll('.rv'), { opacity: [0, 1], y: [28, 0] }, { ...spring, delay: stagger(0.07, { startDelay: 0.15 }) }); }, { amount: 0.15 });
  });
  // LED "turns on" as the shelf enters view
  const lamp = $('.lamp-off');
  scroll(animate(lamp, { opacity: [0.72, 0] }, { ease: 'linear' }), { target: $('.light-img'), offset: ['start end', 'center 55%'] });
  // depth parallax on photos
  scroll(animate($('.blocks-img img'), { y: ['-6%', '6%'] }, { ease: 'linear' }), { target: $('.blocks-img'), offset: ['start end', 'end start'] });
  $$('.reveal-img img').forEach(img => {
    img.style.transformOrigin = 'center';
    scroll(animate(img, { scale: [1.12, 1] }, { ease: 'linear' }), { target: img.parentElement, offset: ['start end', 'center center'] });
  });
}

/* ---------- configurator ---------- */
const state = { finish: 'walnut', length: 48, depth: 10, led: 'warm', qty: 1 };
try {
  const q = new URLSearchParams(location.search);
  if (P.finishes[q.get('f')]) state.finish = q.get('f');
  if (q.get('l')) state.length = clamp(parseInt(q.get('l'), 10) || 48, P.minL, P.maxL);
  if (P.depths[q.get('d')]) state.depth = +q.get('d');
  if (P.leds[q.get('led')]) state.led = q.get('led');
} catch (e) {}

const viewerImgs = $$('#viewer img');
const priceEl = $('#price'), totalEl = $('#total');
let shownFinish = null, shownPrice = null;

function showFinish(f) {
  if (f === shownFinish) return;
  viewerImgs.forEach(img => {
    const on = img.dataset.finish === f;
    if (on) img.loading = 'eager';
    if (M && shownFinish) M.animate(img, { opacity: on ? 1 : 0 }, { duration: 0.6, ease: [0.22, 0.7, 0.2, 1] });
    else img.style.opacity = on ? 1 : 0;
    img.classList.toggle('on', on);
  });
  shownFinish = f;
}
function showPrice(v) {
  if (M && shownPrice !== null && shownPrice !== v) {
    const from = shownPrice;
    M.animate(from, v, { duration: 0.45, ease: [0.22, 0.7, 0.2, 1], onUpdate: x => { priceEl.textContent = money(x); } });
  } else priceEl.textContent = money(v);
  shownPrice = v;
}
function update() {
  const u = unit(state), t = u * state.qty;
  showFinish(state.finish);
  showPrice(t);
  $('#priceNote').textContent = state.qty > 1 ? `${state.qty} shelves, ${money(u)} each` : 'per shelf';
  totalEl.textContent = '';
  $('#finishName').textContent = P.finishes[state.finish].name;
  $('#lenOut').textContent = state.length;
  const len = $('#len'); len.value = state.length;
  len.style.setProperty('--p', ((state.length - P.minL) / (P.maxL - P.minL) * 100) + '%');
  $('#qty').textContent = state.qty;
  $('#dimTxt').textContent = `${state.length} in  /  ${state.depth} in deep  /  ${state.led === 'warm' ? '2700K' : state.led === 'soft' ? '3000K' : '4000K'}`;
  const sx = 0.55 + 0.45 * (state.length - P.minL) / (P.maxL - P.minL);
  const dim = $('#dim .dim-line');
  if (M) M.animate(dim, { scaleX: sx }, { type: 'spring', stiffness: 200, damping: 28 }); else dim.style.transform = `scaleX(${sx})`;
  $$('[data-group]').forEach(g => {
    const k = g.dataset.group;
    $$('button', g).forEach(b => b.setAttribute('aria-pressed', String(String(state[k]) === b.dataset.v)));
  });
}
$('#len').addEventListener('input', e => { state.length = +e.target.value; update(); });
$$('[data-group]').forEach(g => g.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const k = g.dataset.group; state[k] = k === 'depth' ? +b.dataset.v : b.dataset.v; update();
}));
$('#minus').addEventListener('click', () => { state.qty = Math.max(1, state.qty - 1); update(); });
$('#plus').addEventListener('click', () => { state.qty = Math.min(12, state.qty + 1); update(); });
update();

/* ---------- checkout: Shopify-ready (not connected yet) ----------
   To go live: fill SHOPIFY.store (e.g. 'haloandblock.myshopify.com') and map each finish
   to a variant id (price set in Shopify per variant/length band, or via a price-option app).
   Until then the button opens the "hold this build" sheet. */
const SHOPIFY = { store: '', variants: { walnut: '', oak: '', black: '', white: '' } };
function shopifyCartUrl(c) {
  const v = SHOPIFY.variants[c.finish];
  if (!SHOPIFY.store || !v) return null;
  const a = new URLSearchParams({
    'attributes[Length]': c.length + ' in', 'attributes[Depth]': c.depth + ' in',
    'attributes[Light]': P.leds[c.led].name, 'attributes[Finish]': P.finishes[c.finish].name,
    'attributes[Quoted unit price]': money(unit(c))
  });
  return `https://${SHOPIFY.store}/cart/${v}:${c.qty}?${a}`;
}

/* ---------- reserve sheet + leads (local only, no backend yet) ---------- */
const sheet = $('#sheet');
$('#reserve').addEventListener('click', () => {
  const go = shopifyCartUrl(state);
  if (go) { location.href = go; return; }
  const u = unit(state);
  const rows = [['Finish', P.finishes[state.finish].name], ['Size', `${state.length} x ${state.depth} in`], ['Light', P.leds[state.led].name], ['Quantity', state.qty]];
  $('#sheetRows').innerHTML = rows.map(r => `<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join('') + `<div class="tot"><dt>Total</dt><dd>${money(u * state.qty)}</dd></div>`;
  if (sheet.showModal) sheet.showModal(); else sheet.setAttribute('open', '');
});
sheet.addEventListener('click', e => { if (e.target === sheet) sheet.close(); });
$$('form[data-lead]').forEach(f => f.addEventListener('submit', e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(f));
  data.source = f.dataset.lead; data.at = new Date().toISOString();
  if (data.source === 'reserve') data.build = { ...state };
  try { const list = JSON.parse(localStorage.getItem('hb_leads') || '[]'); list.push(data); localStorage.setItem('hb_leads', JSON.stringify(list)); } catch (err) {}
  $$('input, button', f).forEach(x => { x.disabled = true; });
  const ok = $('.ok', f); if (ok) ok.hidden = false;
}));
