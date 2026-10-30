/* Halo & Block - pricing + configurator + modules (static, no backend).
   PRICES ARE ESTIMATES. Validate with Max/Kleber before going live. */
(function (root) {
  'use strict';

  // ---------- pricing model ----------
  var P = {
    base: 179,                 // fixed per shelf: LED driver+remote dimmer, bracket, packaging, labor setup, ground freight
    minL: 24, maxL: 96,
    finishes: {
      black:  { name: 'Matte Black', hex: '#1d1d1f', edge: '#2b2b2e', rate: 4.5 },
      white:  { name: 'Matte White', hex: '#efede7', edge: '#d9d6ce', rate: 4.5 },
      oak:    { name: 'White Oak',   hex: '#c8a57a', edge: '#b38e62', rate: 5.5 },
      walnut: { name: 'Walnut',      hex: '#6a4932', edge: '#553825', rate: 6.5 }
    },
    depths: { 8: 0.92, 10: 1, 12: 1.12 },
    leds: {
      warm:    { name: '2700K Warm',     hex: '#ffbf6b', add: 0 },
      soft:    { name: '3000K Soft',     hex: '#ffd99a', add: 0 },
      neutral: { name: '4000K Neutral',  hex: '#fff1d6', add: 0 },
      rgbw:    { name: 'RGB + White (app)', hex: '#b48cff', add: 49 }
    },
    oversizeOver: 60, oversizeFee: 59,   // boxes over 60 in ship as oversize
    addons: {
      kit:   { name: 'Install kit (template, level, anchors, cord cover)', price: 29 },
      smart: { name: 'Smart Wi-Fi controller (Alexa / Google)', price: 39 }
    },
    qtyDiscount: function (q) { return q >= 3 ? 0.10 : q >= 2 ? 0.05 : 0; }
  };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function shelfUnit(cfg) {
    var f = P.finishes[cfg.finish], d = P.depths[cfg.depth], l = P.leds[cfg.led];
    if (!f || !d || !l) throw new Error('invalid config');
    var L = clamp(Math.round(cfg.length), P.minL, P.maxL);
    var unit = P.base + f.rate * L * d + l.add + (L > P.oversizeOver ? P.oversizeFee : 0);
    return Math.round(unit);
  }

  function shelfQuote(cfg) {
    var unit = shelfUnit(cfg);
    var q = clamp(cfg.qty | 0, 1, 20);
    var disc = P.qtyDiscount(q);
    var shelves = Math.round(unit * q * (1 - disc));
    var addons = 0;
    (cfg.addons || []).forEach(function (k) { if (P.addons[k]) addons += P.addons[k].price; });
    return { unit: unit, qty: q, discount: disc, saved: unit * q - shelves, shelves: shelves, addons: addons, total: shelves + addons };
  }

  // ---------- modules ----------
  var M = {
    open:   { name: 'Open Cube',   price: 279, fill: '#f4f1ea' },
    door:   { name: 'Door Cube',   price: 339, fill: '#e6e1d6' },
    drawer: { name: 'Drawer Cube', price: 379, fill: '#ddd7ca' },
    glow:   { name: 'Glow Cube (LED)', price: 329, fill: '#f4f1ea' },
    bridge: { name: 'Bridge 48 in',    price: 249 },
    shelf:  { name: 'LED Floating Shelf 48 in', price: 0 } // priced via shelf model
  };
  // cube = 24 x 24 x 16 in. layout: cells [col,row,type] (row 0 = floor), bridges [col,row,span], shelves [col,row,span]
  var COMBOS = [
    { id: 'lowline', name: 'The Low Line', blurb: '96 in console + 4 lit shelves. For TVs up to 55 in.',
      cols: 4, rows: 4, tv: [1, 1.5, 2, 1.25],
      cells: [[0,0,'door'],[1,0,'drawer'],[2,0,'drawer'],[3,0,'door']],
      shelves: [[0,2.2,0.9],[3.1,2.2,0.9],[0,3.1,0.9],[3.1,3.1,0.9]] },
    { id: 'towers', name: 'Twin Towers', blurb: 'Two lit towers, 72 in console, bridge on top. 120 in wide.',
      cols: 5, rows: 4,  tv: [1.25, 1.35, 2.5, 1.5],
      cells: [[0,0,'door'],[0,1,'open'],[0,2,'glow'],[0,3,'glow'],[4,0,'door'],[4,1,'open'],[4,2,'glow'],[4,3,'glow'],[1,0,'drawer'],[2,0,'door'],[3,0,'drawer']],
      bridges: [[1,3.6,3]] },
    { id: 'offset', name: 'The Offset', blurb: 'Asymmetric: one tall tower, long low run, floating shelf.',
      cols: 5, rows: 4, tv: [1.6, 1.15, 2.6, 1.5],
      cells: [[0,0,'drawer'],[0,1,'door'],[0,2,'glow'],[0,3,'open'],[1,0,'door'],[2,0,'drawer'],[3,0,'drawer'],[4,0,'door']],
      shelves: [[1.5,3.3,2]] },
    { id: 'fullwall', name: 'Full Wall', blurb: 'Floor-to-ceiling built-in look. 168 in wide, 8 ft tall.',
      cols: 7, rows: 4, tv: [2.1, 1.3, 2.8, 1.6],
      cells: [[0,0,'door'],[0,1,'open'],[0,2,'glow'],[0,3,'open'],[1,0,'door'],[1,1,'glow'],[1,2,'open'],[1,3,'glow'],
              [5,0,'door'],[5,1,'glow'],[5,2,'open'],[5,3,'glow'],[6,0,'door'],[6,1,'open'],[6,2,'glow'],[6,3,'open'],
              [2,0,'drawer'],[3,0,'door'],[4,0,'drawer']],
      bridges: [[2,3.6,3]] }
  ];

  function comboPrice(c) {
    var t = 0;
    c.cells.forEach(function (x) { t += M[x[2]].price; });
    (c.bridges || []).forEach(function (b) { t += M.bridge.price * Math.ceil(b[2] / 2); });
    (c.shelves || []).forEach(function (s) {
      t += shelfUnit({ length: Math.round(s[2] * 24), finish: 'oak', depth: 10, led: 'warm' });
    });
    return t;
  }

  var api = { P: P, M: M, COMBOS: COMBOS, shelfUnit: shelfUnit, shelfQuote: shelfQuote, comboPrice: comboPrice };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  root.HB = api;

  // ---------- DOM ----------
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var money = function (n) { return '$' + n.toLocaleString('en-US'); };
  var NS = 'http://www.w3.org/2000/svg';

  // shelf preview svg
  function shelfSVG(cfg) {
    var f = P.finishes[cfg.finish], l = P.leds[cfg.led];
    var W = 800, H = 480;
    var L = clamp(cfg.length, P.minL, P.maxL);
    var px = 160 + (L - P.minL) / (P.maxL - P.minL) * 520; // 160..680 px
    var x = (W - px) / 2, y = 190, th = 22, dpx = 6 + cfg.depth * 0.9;
    var glowH = 120 + cfg.depth * 6;
    var light = l.hex;
    var n = clamp(cfg.qty, 1, 3);
    var g = '';
    g += '<defs>' +
      '<linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2a2c"/><stop offset="1" stop-color="#18181a"/></linearGradient>' +
      '<radialGradient id="cone" cx="0.5" cy="0" r="1"><stop offset="0" stop-color="' + light + '" stop-opacity=".75"/><stop offset=".55" stop-color="' + light + '" stop-opacity=".16"/><stop offset="1" stop-color="' + light + '" stop-opacity="0"/></radialGradient>' +
      '<filter id="blur"><feGaussianBlur stdDeviation="3"/></filter>' +
      '</defs>';
    g += '<rect width="' + W + '" height="' + H + '" fill="url(#wall)"/>';
    var gap = n === 1 ? 0 : 120;
    var startY = n === 1 ? 190 : n === 2 ? 130 : 90;
    for (var i = 0; i < n; i++) {
      var yy = startY + i * gap;
      g += '<ellipse cx="' + (x + px / 2) + '" cy="' + (yy + th) + '" rx="' + (px / 2 + 30) + '" ry="' + glowH + '" fill="url(#cone)"/>';
      g += '<rect x="' + (x + 6) + '" y="' + (yy + th - 1) + '" width="' + (px - 12) + '" height="3" rx="1.5" fill="' + light + '" filter="url(#blur)"/>';
      g += '<rect x="' + x + '" y="' + (yy - dpx) + '" width="' + px + '" height="' + dpx + '" fill="' + f.edge + '" opacity=".9"/>';
      g += '<rect x="' + x + '" y="' + yy + '" width="' + px + '" height="' + th + '" rx="2" fill="' + f.hex + '"/>';
      // decor objects
      var ox = x + px * 0.18;
      g += '<rect x="' + ox + '" y="' + (yy - dpx - 46) + '" width="26" height="46" rx="4" fill="#3a3a3d"/>';
      g += '<circle cx="' + (x + px * 0.72) + '" cy="' + (yy - dpx - 20) + '" r="20" fill="#4a4743"/>';
      g += '<rect x="' + (x + px * 0.45) + '" y="' + (yy - dpx - 30) + '" width="54" height="30" rx="3" fill="#2f2f31"/>';
    }
    // dimension line
    var dy = H - 46;
    g += '<g stroke="#77746c" stroke-width="1"><line x1="' + x + '" y1="' + dy + '" x2="' + (x + px) + '" y2="' + dy + '"/><line x1="' + x + '" y1="' + (dy - 6) + '" x2="' + x + '" y2="' + (dy + 6) + '"/><line x1="' + (x + px) + '" y1="' + (dy - 6) + '" x2="' + (x + px) + '" y2="' + (dy + 6) + '"/></g>';
    g += '<text x="' + (W / 2) + '" y="' + (dy + 24) + '" fill="#a8a59c" font-size="15" text-anchor="middle" font-family="-apple-system,Helvetica,Arial">' + L + ' in  x  ' + cfg.depth + ' in deep  x  2 in thick</text>';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Preview of your shelf">' + g + '</svg>';
  }

  function comboSVG(c) {
    var u = 60, pad = 20, W = c.cols * u + pad * 2, H = c.rows * u + pad * 2 + 10;
    var floor = H - pad;
    var s = '<rect width="' + W + '" height="' + H + '" fill="#ece9e2"/>';
    // tv
    var t = c.tv;
    s += '<rect x="' + (pad + t[0] * u) + '" y="' + (floor - (t[1] + t[3]) * u) + '" width="' + (t[2] * u) + '" height="' + (t[3] * u) + '" rx="3" fill="#121214"/>';
    (c.shelves || []).forEach(function (sh) {
      var x = pad + sh[0] * u, y = floor - sh[1] * u, w = sh[2] * u;
      s += '<rect x="' + x + '" y="' + (y + 6) + '" width="' + w + '" height="18" fill="#ffcf8a" opacity=".35"/>';
      s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="6" rx="1" fill="#c8a57a"/>';
    });
    c.cells.forEach(function (cell) {
      var x = pad + cell[0] * u, y = floor - (cell[1] + 1) * u, m = M[cell[2]];
      s += '<rect x="' + (x + 1) + '" y="' + (y + 1) + '" width="' + (u - 2) + '" height="' + (u - 2) + '" fill="' + m.fill + '" stroke="#bdb6a6"/>';
      if (cell[2] === 'door') s += '<line x1="' + (x + u / 2) + '" y1="' + (y + 6) + '" x2="' + (x + u / 2) + '" y2="' + (y + u - 6) + '" stroke="#bdb6a6"/>';
      if (cell[2] === 'drawer') s += '<line x1="' + (x + 4) + '" y1="' + (y + u / 2) + '" x2="' + (x + u - 4) + '" y2="' + (y + u / 2) + '" stroke="#bdb6a6"/><rect x="' + (x + u / 2 - 8) + '" y="' + (y + u / 4 - 1) + '" width="16" height="2" fill="#9c9483"/><rect x="' + (x + u / 2 - 8) + '" y="' + (y + 3 * u / 4 - 1) + '" width="16" height="2" fill="#9c9483"/>';
      if (cell[2] === 'glow') s += '<rect x="' + (x + 4) + '" y="' + (y + 4) + '" width="' + (u - 8) + '" height="' + (u - 8) + '" fill="#ffcf8a" opacity=".28"/><rect x="' + (x + 4) + '" y="' + (y + 4) + '" width="' + (u - 8) + '" height="2" fill="#ffbf6b"/>';
    });
    (c.bridges || []).forEach(function (b) {
      var x = pad + b[0] * u, y = floor - (b[1] + 0.4) * u;
      s += '<rect x="' + x + '" y="' + y + '" width="' + (b[2] * u) + '" height="' + (0.4 * u) + '" fill="#e6e1d6" stroke="#bdb6a6"/>';
      s += '<rect x="' + (x + 4) + '" y="' + (y + 0.4 * u - 3) + '" width="' + (b[2] * u - 8) + '" height="2" fill="#ffbf6b"/>';
    });
    s += '<line x1="0" y1="' + floor + '" x2="' + W + '" y2="' + floor + '" stroke="#bdb6a6"/>';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + c.name + ' layout">' + s + '</svg>';
  }

  function renderCombos() {
    $$('[data-combos]').forEach(function (host) {
      host.innerHTML = COMBOS.map(function (c) {
        return '<article class="combo"><div class="art">' + comboSVG(c) + '</div><div class="meta"><div><h3>' + c.name + '</h3><p>' + c.blurb + '</p><p>' + c.cells.length + ' cubes' + (c.bridges ? ' + bridge' : '') + (c.shelves ? ' + ' + c.shelves.length + ' lit shelves' : '') + '</p></div><div class="price">from ' + money(comboPrice(c)) + '</div></div></article>';
      }).join('');
    });
  }

  // configurator
  var state = { length: 48, depth: 10, finish: 'oak', led: 'warm', qty: 1, addons: [] };

  function readURL() {
    try {
      var q = new URLSearchParams(location.search);
      if (q.get('l')) state.length = clamp(+q.get('l'), P.minL, P.maxL);
      if (P.depths[q.get('d')]) state.depth = +q.get('d');
      if (P.finishes[q.get('f')]) state.finish = q.get('f');
      if (P.leds[q.get('led')]) state.led = q.get('led');
    } catch (e) {}
  }

  function update() {
    var host = $('#preview');
    if (!host) return;
    host.innerHTML = shelfSVG(state);
    var q = shelfQuote(state);
    $('#lenVal').textContent = state.length + ' in (' + (state.length / 12).toFixed(1) + ' ft)';
    $('#len').value = state.length;
    $('#qtyOut').textContent = state.qty;
    $('#finishVal').textContent = P.finishes[state.finish].name;
    $('#ledVal').textContent = P.leds[state.led].name;
    $('#depthVal').textContent = state.depth + ' in';
    $('#total').textContent = money(q.total);
    $('#unit').textContent = money(q.unit) + ' per shelf' + (q.discount ? ' - ' + Math.round(q.discount * 100) + '% off for ' + q.qty : '');
    $$('.mbar-total').forEach(function (e) { e.textContent = money(q.total); });
    $$('[data-group]').forEach(function (g) {
      var key = g.getAttribute('data-group');
      $$('.chip', g).forEach(function (c) { c.setAttribute('aria-pressed', String(String(state[key]) === c.getAttribute('data-v'))); });
    });
    return q;
  }

  function bindConfigurator() {
    if (!$('#preview')) return;
    readURL();
    $('#len').addEventListener('input', function (e) { state.length = +e.target.value; update(); });
    $$('[data-group]').forEach(function (g) {
      var key = g.getAttribute('data-group');
      g.addEventListener('click', function (e) {
        var c = e.target.closest('.chip'); if (!c) return;
        var v = c.getAttribute('data-v');
        state[key] = key === 'depth' ? +v : v; update();
      });
    });
    $('#minus').addEventListener('click', function () { state.qty = Math.max(1, state.qty - 1); update(); });
    $('#plus').addEventListener('click', function () { state.qty = Math.min(20, state.qty + 1); update(); });
    $$('[data-addon]').forEach(function (i) {
      i.addEventListener('change', function () {
        state.addons = $$('[data-addon]').filter(function (x) { return x.checked; }).map(function (x) { return x.getAttribute('data-addon'); });
        update();
      });
    });
    $$('[data-checkout]').forEach(function (b) { b.addEventListener('click', openCheckout); });
    update();
  }

  function openCheckout() {
    var q = shelfQuote(state), f = P.finishes[state.finish], l = P.leds[state.led];
    var rows = [
      ['Shelf', state.length + ' x ' + state.depth + ' x 2 in'],
      ['Finish', f.name], ['Light', l.name], ['Quantity', q.qty],
      ['Shelves', money(q.shelves) + (q.saved ? ' (saved ' + money(q.saved) + ')' : '')]
    ];
    state.addons.forEach(function (k) { rows.push([P.addons[k].name, money(P.addons[k].price)]); });
    rows.push(['Shipping (lower 48)', 'Included']);
    rows.push(['Total', money(q.total)]);
    $('#sheetRows').innerHTML = rows.map(function (r) { return '<div class="row"><span>' + r[0] + '</span><span>' + r[1] + '</span></div>'; }).join('');
    $('#modal').classList.add('open');
  }

  function bindModal() {
    var m = $('#modal'); if (!m) return;
    m.addEventListener('click', function (e) { if (e.target === m || e.target.closest('[data-close]')) m.classList.remove('open'); });
  }

  function bindLead() {
    $$('form[data-lead]').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = f.querySelector('input[type=email]').value.trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return;
        try {
          var list = JSON.parse(localStorage.getItem('hb_leads') || '[]');
          list.push({ email: email, at: new Date().toISOString(), cfg: state });
          localStorage.setItem('hb_leads', JSON.stringify(list));
        } catch (x) {}
        f.reset();
        var ok = f.parentNode.querySelector('.ok'); if (ok) ok.style.display = 'block';
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderCombos(); bindConfigurator(); bindModal(); bindLead();
    var y = document.getElementById('yr'); if (y) y.textContent = new Date().getFullYear();
  });
})(this);
