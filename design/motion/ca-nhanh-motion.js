// Ca Nhanh motion helpers — ES module, an toàn khi SSR (chỉ chạm window bên trong hàm).
// Dùng trong client component: useEffect(() => { odometer(ref.current, balance) }, [balance]).
var SVGNS = 'http://www.w3.org/2000/svg';

function reduced() { return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
function vnd(n) { return Math.round(n).toLocaleString('vi-VN') + 'đ'; }
function cssVar(name, el) { return getComputedStyle(el || document.documentElement).getPropertyValue(name).trim(); }
function pad(n) { return String(n).padStart(2, '0'); }
function rng(seed) {
  var t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    var r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/* Pseudo QR for design previews only (not scannable). The app renders the real
   HMAC token with the `qrcode` package; see the QrKiosk guidelines. */
function fakeQr(svg, seed) {
  var n = 25, rand = rng(seed || 1), d = '';
  function on(x, y) { d += 'M' + x + ' ' + y + 'h1v1h-1z'; }
  function finder(x0, y0) {
    for (var i = 0; i < 7; i++) for (var j = 0; j < 7; j++) {
      var edge = i === 0 || i === 6 || j === 0 || j === 6, core = i > 1 && i < 5 && j > 1 && j < 5;
      if (edge || core) on(x0 + i, y0 + j);
    }
  }
  function reserved(x, y) { return (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9); }
  finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
  for (var x = 0; x < n; x++) for (var y = 0; y < n; y++) {
    if (reserved(x, y)) continue;
    var bit = (x === 6 || y === 6) ? (x + y) % 2 === 0 : rand() > 0.52;
    if (bit) on(x, y);
  }
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  svg.setAttribute('viewBox', '0 0 ' + n + ' ' + n);
  svg.setAttribute('shape-rendering', 'crispEdges');
  var p = document.createElementNS(SVGNS, 'path');
  p.setAttribute('d', d); p.setAttribute('fill', '#050917');
  svg.appendChild(p);
}

/* QR kiosk: ring depletes over `seconds`, QR flips to a new code each window. */
function kiosk(root, opts) {
  opts = opts || {};
  var secs = opts.seconds || 30;
  var qr = root.querySelector('.cn-kiosk__qr'), svg = qr.querySelector('svg');
  var prog = root.querySelector('.cn-kiosk__progress'), label = root.querySelector('[data-secs]');
  var circ = 2 * Math.PI * Number(prog.getAttribute('r'));
  var win = -1, flipTimer = 0;
  prog.style.strokeDasharray = circ.toFixed(2);
  function tick() {
    var now = Date.now() / 1000, w = Math.floor(now / secs), left = secs - (now % secs);
    prog.style.strokeDashoffset = (circ * (1 - left / secs)).toFixed(2);
    if (label) label.textContent = pad(Math.ceil(left));
    if (w === win) return;
    var first = win === -1;
    win = w;
    if (first || reduced()) { fakeQr(svg, w); }
    else {
      qr.classList.remove('cn-kiosk__qr--flip'); void qr.offsetWidth; qr.classList.add('cn-kiosk__qr--flip');
      clearTimeout(flipTimer); flipTimer = setTimeout(function () { fakeQr(svg, w); }, 240);
    }
    if (opts.onRotate) opts.onRotate(w);
  }
  tick();
  var id = setInterval(tick, 250);
  return { stop: function () { clearInterval(id); clearTimeout(flipTimer); } };
}

/* Odometer: every digit is a 0–9 strip that slides to its value (right-most first). */
function odometer(el, value, opts) {
  opts = opts || {};
  var text = Math.round(value).toLocaleString('vi-VN');
  if (el.getAttribute('data-text') === null || el.getAttribute('data-text').length !== text.length) {
    while (el.firstChild) el.removeChild(el.firstChild);
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (/\d/.test(ch)) {
        var col = document.createElement('span'), strip = document.createElement('span');
        col.className = 'cn-odo__col'; strip.className = 'cn-odo__strip';
        for (var k = 0; k <= 9; k++) { var s = document.createElement('span'); s.textContent = String(k); strip.appendChild(s); }
        col.setAttribute('aria-hidden', 'true'); col.appendChild(strip); el.appendChild(col);
      } else {
        var sep = document.createElement('span'); sep.className = 'cn-odo__sep'; sep.textContent = ch;
        sep.setAttribute('aria-hidden', 'true'); el.appendChild(sep);
      }
    }
    var cur = document.createElement('span'); cur.className = 'cn-odo__sep'; cur.textContent = opts.suffix || 'đ';
    cur.setAttribute('aria-hidden', 'true'); el.appendChild(cur);
  }
  el.setAttribute('data-text', text);
  el.setAttribute('aria-label', vnd(value));
  var strips = el.querySelectorAll('.cn-odo__strip'), digits = text.replace(/\D/g, '');
  void el.offsetWidth;
  for (var j = 0; j < strips.length; j++) {
    strips[j].style.transitionDelay = (reduced() ? 0 : (strips.length - 1 - j) * 45) + 'ms';
    strips[j].style.transform = 'translateY(' + (-Number(digits.charAt(j))) + 'em)';
  }
}

/* "+150.000đ" floats up from `anchor` inside a position:relative host. */
function gain(host, anchor, amount) {
  var g = document.createElement('span'), hr = host.getBoundingClientRect(), ar = anchor.getBoundingClientRect();
  g.className = 'cn-gain'; g.textContent = '+' + vnd(amount); g.setAttribute('aria-hidden', 'true');
  g.style.left = (ar.right - hr.left - 8) + 'px'; g.style.top = (ar.top - hr.top - 6) + 'px';
  host.appendChild(g);
  setTimeout(function () { if (g.parentNode) g.parentNode.removeChild(g); }, 1200);
}

/* Small canvas confetti in brand colours (~1.3 s). Skipped under reduced motion. */
function confetti(host, opts) {
  if (reduced()) return;
  opts = opts || {};
  var rect = host.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
  var c = document.createElement('canvas');
  c.className = 'cn-confetti'; c.width = Math.round(rect.width * dpr); c.height = Math.round(rect.height * dpr);
  c.style.width = rect.width + 'px'; c.style.height = rect.height + 'px';
  host.appendChild(c);
  var ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
  var colors = [cssVar('--spark'), cssVar('--primary'), cssVar('--money'), cssVar('--lam-200')].filter(Boolean);
  var ox = opts.x != null ? opts.x : rect.width / 2, oy = opts.y != null ? opts.y : rect.height * 0.4;
  var parts = [], N = opts.count || 70, D = opts.duration || 1300, t0 = performance.now();
  for (var i = 0; i < N; i++) {
    var a = Math.random() * Math.PI * 2, v = 3 + Math.random() * 5;
    parts.push({ x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4, s: 4 + Math.random() * 5,
                 r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: colors[i % colors.length], k: i % 3 });
  }
  (function frame(t) {
    var p = Math.min(1, (t - t0) / D);
    ctx.clearRect(0, 0, rect.width, rect.height);
    for (var q = 0; q < parts.length; q++) {
      var o = parts[q];
      o.vy += 0.22; o.vx *= 0.985; o.x += o.vx; o.y += o.vy; o.r += o.vr;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - p * p); ctx.translate(o.x, o.y); ctx.rotate(o.r); ctx.fillStyle = o.c;
      if (o.k === 0) { ctx.beginPath(); ctx.arc(0, 0, o.s / 2, 0, 6.283); ctx.fill(); }
      else if (o.k === 1) { ctx.fillRect(-o.s / 2, -o.s / 4, o.s, o.s / 2); }
      else { ctx.beginPath(); ctx.moveTo(0, -o.s / 2); ctx.lineTo(o.s / 2, o.s / 2); ctx.lineTo(-o.s / 2, o.s / 2); ctx.fill(); }
      ctx.restore();
    }
    if (p < 1) requestAnimationFrame(frame); else if (c.parentNode) c.parentNode.removeChild(c);
  })(t0);
}

/* Fill the first empty seat with an avatar; returns true when the shift becomes full. */
function fillSeat(container, src, alt) {
  var seat = container.querySelector('.cn-seat--empty');
  if (!seat) return true;
  var img = document.createElement('img');
  img.src = src; img.alt = alt || ''; img.width = 32; img.height = 32;
  seat.classList.remove('cn-seat--empty'); seat.appendChild(img);
  if (!reduced()) seat.classList.add('cn-seat--pop');
  var seats = container.querySelectorAll('.cn-seat').length, empty = container.querySelectorAll('.cn-seat--empty').length;
  var count = container.querySelector('.cn-seats__count');
  if (count) count.textContent = (seats - empty) + '/' + seats;
  return empty === 0;
}

/* Rubber-stamp a status word onto `host` (ĐÃ NHẬN, ĐỦ NGƯỜI, ĐÃ KÝ QUỸ, VẮNG MẶT). */
function stamp(host, text, tone) {
  var old = host.querySelector('.cn-stamp');
  if (old) old.parentNode.removeChild(old);
  var s = document.createElement('span');
  s.className = 'cn-stamp cn-stamp--in' + (tone ? ' cn-stamp--' + tone : '');
  s.setAttribute('role', 'status'); s.textContent = text;
  host.appendChild(s);
  return s;
}

/* Countdown to a start time; turns spark when under 15 minutes. */
function countdown(el, target, opts) {
  opts = opts || {};
  var t = new Date(target).getTime(), timeEl = el.querySelector('.cn-countdown__time'), labelEl = el.querySelector('.cn-countdown__label');
  function fmt(ms) {
    var s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return (h > 0 ? pad(h) + ':' : '') + pad(m) + ':' + pad(s % 60);
  }
  function tick() {
    var left = t - Date.now();
    timeEl.textContent = fmt(left);
    el.classList.toggle('cn-countdown--soon', left > 0 && left <= 15 * 60000);
    el.classList.toggle('cn-countdown--now', left <= 0);
    if (left <= 0 && labelEl) labelEl.textContent = opts.doneLabel || 'Đến giờ vào ca';
  }
  tick();
  var id = setInterval(tick, 1000);
  return { stop: function () { clearInterval(id); } };
}

/* Insert a new item at the top of a realtime list; existing items glide down (FLIP). */
function pushShift(list, item) {
  var kids = Array.prototype.slice.call(list.children);
  var before = kids.map(function (k) { return k.getBoundingClientRect().top; });
  list.insertBefore(item, list.firstChild);
  item.classList.add('cn-feed__item--arrive');
  if (!reduced()) {
    kids.forEach(function (k, i) {
      var dy = before[i] - k.getBoundingClientRect().top;
      if (!dy) return;
      k.style.transition = 'none'; k.style.transform = 'translateY(' + dy + 'px)';
      void k.offsetWidth;
      k.style.transition = 'transform var(--cn-dur-sheet) var(--cn-ease-out)'; k.style.transform = '';
    });
  }
  var max = Number(list.getAttribute('data-max') || 4);
  while (list.children.length > max) list.removeChild(list.lastChild);
  setTimeout(function () { item.classList.remove('cn-feed__item--arrive'); }, 1700);
}

export { reduced, vnd, fakeQr, kiosk, odometer, gain, confetti, fillSeat, stamp, countdown, pushShift };
