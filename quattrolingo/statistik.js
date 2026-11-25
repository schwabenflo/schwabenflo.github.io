(function () {
  var SLOTS = { Morgen: 1, Mittag: 1, Abend: 1 };
  var CATS = ['Genus', 'Zeiten/Verbform', 'Wortstellung', 'Präposition', 'Vokabel'];
  var CAT_COLOR = {
    'Genus': '#4f6bff',
    'Zeiten/Verbform': '#7b5cff',
    'Wortstellung': '#e69a1c',
    'Präposition': '#22a45d',
    'Vokabel': '#e04848'
  };
  var WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  var $ = function (s) { return document.querySelector(s); };
  function ls(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; }
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function theme(t) {
    document.documentElement.dataset.theme = t;
    ls('fr-theme', t);
    var b = $('#th');
    if (b) b.textContent = t === 'dark' ? '☀️' : '🌙';
  }
  theme(ls('fr-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  var th = $('#th');
  if (th) th.onclick = function () {
    theme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    drawAll();
  };

  function iso(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function parseDay(s) { return new Date(s + 'T12:00:00'); }
  function addDays(s, n) { var d = parseDay(s); d.setDate(d.getDate() + n); return iso(d); }
  function dayDiff(a, b) { return Math.round((parseDay(b) - parseDay(a)) / 86400000); }
  function dlabel(s) {
    var d = parseDay(s);
    return WD[(d.getDay() + 6) % 7] + ' ' + d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear();
  }
  function isoWeek(s) {
    var d = parseDay(s);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    var w1 = new Date(d.getFullYear(), 0, 4);
    var week = 1 + Math.round(((d - w1) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7);
    return d.getFullYear() + '-W' + String(week).padStart(2, '0');
  }
  function isoWeekStart(week) {
    var y = +week.slice(0, 4), w = +week.slice(6);
    var d = new Date(y, 0, 4);
    var mon = new Date(d);
    mon.setDate(d.getDate() - ((d.getDay() + 6) % 7) + (w - 1) * 7);
    return iso(mon);
  }
  function weekLabel(week) {
    var from = parseDay(isoWeekStart(week));
    var to = new Date(from); to.setDate(to.getDate() + 6);
    return from.getDate() + '.' + (from.getMonth() + 1) + '.–' + to.getDate() + '.' + (to.getMonth() + 1) + '.';
  }
  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }
  function isDark() { return document.documentElement.dataset.theme === 'dark'; }

  var TODAY = iso(new Date());
  var YEAR = new Date().getFullYear();
  var H = { entries: [] }, L = [], ST = { done: {} };
  var state = null;

  function get(p) {
    return fetch(p + '?v=' + Date.now()).then(function (r) {
      if (!r.ok) throw new Error(p + ' ' + r.status);
      return r.json();
    });
  }

  Promise.all([
    get('data/history.json'),
    get('data/lessons.json'),
    get('data/status.json')
  ]).then(function (r) {
    H = r[0] || H; L = r[1] || []; ST = r[2] || ST;
    build();
  }).catch(function () {
    $('#lead').textContent = 'Daten konnten nicht geladen werden.';
  });

  function lessonTitle(id, slot) {
    if (id === 'Test-leise-L1') return 'Test (leise)';
    if (id.indexOf('_5MIN') > 0 || slot === '5MIN') return 'Fünf-Minuten-Modus';
    var found = L.filter(function (m) { return m.id === id; })[0];
    if (found && found.kind === 'tag') {
      var d = found.date ? found.date.slice(8) + '.' + found.date.slice(5, 7) + '.' : '';
      var sl = found.slot + (id.indexOf('_leise') > 0 ? ' (leise)' : '');
      return (d ? d + ' ' : '') + sl;
    }
    if (found) return found.title || id;
    var m = id.match(/^(\d{4}-\d\d-\d\d)_(Morgen|Mittag|Abend)(_leise)?$/);
    if (m) return m[1].slice(8) + '.' + m[1].slice(5, 7) + '. ' + m[2] + (m[3] ? ' (leise)' : '');
    return id;
  }

  function aggregate() {
    var entries = (H.entries || []).slice().sort(function (a, b) {
      return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    });
    var byDay = {};
    var totalXP = 0, correct = 0, total = 0;
    var errTot = {}, weeks = {}, slots = {};
    entries.forEach(function (e) {
      var d = e.date;
      if (!byDay[d]) byDay[d] = { xp: 0, items: [] };
      byDay[d].xp += e.xp || 0;
      byDay[d].items.push(e);
      totalXP += e.xp || 0;
      correct += e.correct || 0;
      total += e.total || 0;
      var w = isoWeek(d);
      if (!weeks[w]) weeks[w] = { xp: 0, correct: 0, total: 0, errors: {}, n: 0 };
      weeks[w].xp += e.xp || 0;
      weeks[w].correct += e.correct || 0;
      weeks[w].total += e.total || 0;
      weeks[w].n++;
      var err = e.errors || {};
      Object.keys(err).forEach(function (k) {
        errTot[k] = (errTot[k] || 0) + err[k];
        weeks[w].errors[k] = (weeks[w].errors[k] || 0) + err[k];
      });
      if (SLOTS[e.slot]) {
        if (!slots[e.slot]) slots[e.slot] = { correct: 0, total: 0, n: 0 };
        slots[e.slot].correct += e.correct || 0;
        slots[e.slot].total += e.total || 0;
        slots[e.slot].n++;
      }
    });
    var days = Object.keys(byDay).sort();
    var best = 0, cur = 0, prev = null;
    days.forEach(function (d) {
      if (prev && dayDiff(prev, d) === 1) cur++;
      else cur = 1;
      if (cur > best) best = cur;
      prev = d;
    });
    var current = 0;
    if (days.length) {
      var last = days[days.length - 1];
      if (dayDiff(last, TODAY) <= 1) {
        current = 1;
        for (var i = days.length - 2; i >= 0; i--) {
          if (dayDiff(days[i], days[i + 1]) === 1) current++;
          else break;
        }
      }
    }
    return { entries: entries, byDay: byDay, days: days, totalXP: totalXP, correct: correct, total: total, errTot: errTot, weeks: weeks, slots: slots, best: best, current: current };
  }

  function isDoneMeta(m) {
    if (ST.done[m.id]) return true;
    if (m.kind === 'tag') {
      var k = m.date + '_' + m.slot;
      for (var id in ST.done) { if (id.indexOf(k) === 0) return true; }
    }
    return false;
  }

  function build() {
    state = aggregate();
    drawAll();
  }

  function drawAll() {
    if (!state) return;
    renderKpis(state);
    renderCalendar(state);
    renderCounts(state);
    renderXpChart(state);
    renderAccChart(state);
    renderErrChart(state);
    renderTrendChart(state);
    renderTod(state);
  }

  function renderKpis(S) {
    $('#calYear').textContent = YEAR;
    $('#kt').textContent = S.totalXP;
    $('#ks').textContent = S.current + ' T';
    $('#kb').textContent = S.best + ' T';
    $('#ka').textContent = S.total ? Math.round(S.correct / S.total * 100) + '%' : '–';
    var lead = '';
    if (!S.days.length) lead = 'Noch keine Ergebnisse. Sobald du ein Ergebnis schickst, füllt sich der Kalender.';
    else if (S.current === 0) {
      var last = S.days[S.days.length - 1];
      lead = 'Deine letzte Lektion war am ' + dlabel(last) + '. Die Serie beginnt neu, sobald du wieder eine machst.';
    } else {
      lead = 'Starke Serie: ' + S.current + ' Tag' + (S.current === 1 ? '' : 'e') + ' am Stück. Weiter so!';
    }
    $('#lead').textContent = lead;
  }

  function xpLevel(xp) {
    if (!xp) return 0;
    if (xp <= 40) return 1;
    if (xp <= 80) return 2;
    if (xp <= 120) return 3;
    return 4;
  }

  function renderCalendar(S) {
    var jan1 = new Date(YEAR, 0, 1);
    var dec31 = new Date(YEAR, 11, 31);
    var start = new Date(jan1);
    start.setDate(1 - ((jan1.getDay() + 6) % 7));
    var end = new Date(dec31);
    end.setDate(end.getDate() + (6 - ((dec31.getDay() + 6) % 7)));
    var weeks = Math.round((end - start) / 86400000 / 7);
    var months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    var html = '<div class="cal-corner"></div>';
    var curMonth = -1;
    for (var w = 0; w < weeks; w++) {
      var day = new Date(start);
      day.setDate(start.getDate() + w * 7 + 3);
      var mo = day.getMonth();
      var lab = (mo !== curMonth && day.getFullYear() === YEAR) ? months[mo] : '';
      if (lab) curMonth = mo;
      html += '<div class="cal-ml" style="grid-column:' + (w + 2) + '">' + lab + '</div>';
    }
    for (var r = 0; r < 7; r++) {
      html += '<div class="cal-wd">' + (r % 2 === 0 ? WD[r] : '') + '</div>';
      for (var c = 0; c < weeks; c++) {
        var d = new Date(start);
        d.setDate(start.getDate() + c * 7 + r);
        var ds = iso(d);
        var inYear = d.getFullYear() === YEAR;
        var info = S.byDay[ds];
        var lv = inYear ? xpLevel(info ? info.xp : 0) : -1;
        var cls = 'cal-sq' + (lv < 0 ? ' out' : ' lv' + lv) + (ds === TODAY ? ' today' : '');
        var label = inYear ? tipText(ds, info) : '';
        html += '<button type="button" class="' + cls + '" data-d="' + ds + '" title="' + esc(label) + '" ' + (inYear ? '' : 'tabindex="-1" ') + 'aria-label="' + esc(label || ds) + '"></button>';
      }
    }
    $('#cal').style.setProperty('--weeks', weeks);
    $('#cal').innerHTML = html;
    var tip = $('#tip');
    $('#cal').onclick = function (ev) {
      var b = ev.target.closest('.cal-sq');
      if (!b || b.classList.contains('out')) { tip.hidden = true; return; }
      tip.innerHTML = tipText(b.dataset.d, S.byDay[b.dataset.d], true);
      tip.hidden = false;
    };
    var sc = $('#calScroll');
    if (sc) {
      var todayBtn = $('#cal').querySelector('.cal-sq.today') || $('#cal').querySelector('.cal-sq.lv1, .cal-sq.lv2, .cal-sq.lv3, .cal-sq.lv4');
      if (todayBtn) {
        var left = todayBtn.offsetLeft - sc.clientWidth + 80;
        sc.scrollLeft = Math.max(0, left);
      }
    }
  }

  function tipText(ds, info, html) {
    var head = dlabel(ds);
    if (!info) return head + ' · keine Lektion';
    var lines = info.items.map(function (e) {
      var t = lessonTitle(e.id, e.slot);
      var sc = (e.total ? (e.correct + '/' + e.total) : '');
      var rep = e.repeat ? 'Wiederholung · ' : '';
      var st = e.secondTry ? (', ' + e.secondTry + ' im 2. Versuch') : '';
      return (html ? '• ' : '') + rep + t + (sc ? ' (' + sc + st + ')' : '') + ' · ' + (e.xp || 0) + ' XP';
    });
    if (html) return '<b>' + esc(head) + ' · ' + info.xp + ' XP</b><br>' + lines.map(esc).join('<br>');
    return head + ' · ' + info.xp + ' XP · ' + lines.join(' · ');
  }

  function renderCounts(S) {
    var tags = L.filter(function (m) { return m.kind === 'tag'; });
    var seenSlot = {}, doneTags = 0, open = [];
    tags.forEach(function (m) {
      var k = m.date + '_' + m.slot;
      if (seenSlot[k]) return;
      seenSlot[k] = 1;
      if (isDoneMeta(m)) doneTags++;
      else open.push(m);
    });
    var practice = S.entries.length;
    var uniqueDone = {};
    S.entries.forEach(function (e) { if (!e.repeat) uniqueDone[e.id] = 1; });
    $('#counts').innerHTML =
      '<div><b>' + practice + '</b>Ergebnisse</div>' +
      '<div><b>' + doneTags + '</b>Tageslektionen erledigt</div>' +
      '<div><b>' + open.length + '</b>Tageslektionen offen</div>' +
      '<div><b>' + S.totalXP + '</b>XP insgesamt</div>';
    if (open.length) {
      var items = open.map(function (m) {
        var href = m.file || ('l/' + m.id + '.html');
        return '<a href="' + esc(href) + '">' + esc(m.date.slice(8) + '.' + m.date.slice(5, 7) + '. ' + m.slot) + '</a>';
      });
      $('#openList').innerHTML = 'Noch offen: ' + items.join(' · ') + '.';
    } else {
      $('#openList').textContent = 'Keine offenen Tageslektionen. Super!';
    }
  }

  function weekRange(S) {
    var keys = Object.keys(S.weeks).sort();
    if (!keys.length) keys = [isoWeek(TODAY)];
    var first = keys[0], last = isoWeek(TODAY);
    var out = [], w = first;
    var guard = 0;
    while (w <= last && guard++ < 60) {
      out.push(w);
      w = isoWeek(addDays(isoWeekStart(w), 7));
    }
    if (out.indexOf(last) < 0) out.push(last);
    return out;
  }

  function renderXpChart(S) {
    var weeks = weekRange(S);
    var values = weeks.map(function (w) { return (S.weeks[w] && S.weeks[w].xp) || 0; });
    var labels = weeks.map(function (w) { return weekLabel(w); });
    barChart($('#xpChart'), labels, values, cssVar('--pri', '#4f6bff'), function (v) { return v + ' XP'; });
  }

  function renderAccChart(S) {
    var weeks = weekRange(S);
    var values = weeks.map(function (w) {
      var x = S.weeks[w];
      return (x && x.total) ? Math.round(x.correct / x.total * 1000) / 10 : null;
    });
    var labels = weeks.map(function (w) { return weekLabel(w); });
    lineChart($('#accChart'), labels, [{ name: 'Trefferquote', values: values, color: cssVar('--ok', '#22a45d') }], 100, function (v) { return v + ' %'; });
  }

  function renderErrChart(S) {
    var cats = CATS.filter(function (c) { return S.errTot[c]; });
    var empty = $('#errEmpty');
    if (!cats.length) {
      empty.hidden = false;
      clearCanvas($('#errChart'));
      return;
    }
    empty.hidden = true;
    var values = cats.map(function (c) { return S.errTot[c]; });
    var colors = cats.map(function (c) { return CAT_COLOR[c]; });
    hbarChart($('#errChart'), cats, values, colors);
  }

  function renderTrendChart(S) {
    var weeks = weekRange(S);
    var labels = weeks.map(function (w) { return weekLabel(w); });
    var used = CATS.filter(function (c) {
      return weeks.some(function (w) { return S.weeks[w] && S.weeks[w].errors[c]; });
    });
    var series = used.map(function (c) {
      return {
        name: c,
        color: CAT_COLOR[c],
        values: weeks.map(function (w) { return (S.weeks[w] && S.weeks[w].errors[c]) || 0; })
      };
    });
    lineChart($('#trendChart'), labels, series, null, function (v) { return v; }, true);
  }

  function renderTod(S) {
    var order = ['Morgen', 'Mittag', 'Abend'];
    var icon = { Morgen: '🌅', Mittag: '☀️', Abend: '🌙' };
    var best = null, bestPct = -1;
    var html = order.map(function (s) {
      var x = S.slots[s];
      if (!x || !x.total) {
        return '<div class="tod-card"><div class="tod-ico">' + icon[s] + '</div><b>' + s + '</b><div class="tod-pct mut">noch keine Daten</div></div>';
      }
      var pct = Math.round(x.correct / x.total * 100);
      if (pct > bestPct) { bestPct = pct; best = s; }
      var n = x.n + (x.n === 1 ? ' Ergebnis' : ' Ergebnisse');
      return '<div class="tod-card" data-s="' + s + '"><div class="tod-ico">' + icon[s] + '</div><b>' + s + '</b><div class="tod-pct">' + pct + ' %</div><div class="mut">' + n + ' · ' + x.correct + '/' + x.total + '</div></div>';
    }).join('');
    $('#tod').innerHTML = html + (best ? '<p class="mut" style="margin:.8rem 0 0">Bisher am besten: <b>' + best + '</b> mit ' + bestPct + ' % Trefferquote im ersten Versuch.</p>' : '');
    if (best) {
      var card = $('#tod').querySelector('[data-s="' + best + '"]');
      if (card) card.classList.add('best');
    }
  }

  /* ---------- tiny canvas charts (no CDN) ---------- */
  function clearCanvas(cv) {
    var ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
  }
  function prep(cv) {
    var wrap = cv.parentNode;
    var cssW = Math.max(280, wrap.clientWidth || 640);
    var cssH = +cv.getAttribute('height') || 220;
    var r = window.devicePixelRatio || 1;
    cv.width = Math.round(cssW * r);
    cv.height = Math.round(cssH * r);
    cv.style.width = cssW + 'px';
    cv.style.height = cssH + 'px';
    var ctx = cv.getContext('2d');
    ctx.setTransform(r, 0, 0, r, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    return { ctx: ctx, w: cssW, h: cssH };
  }
  function pad(max) {
    if (max <= 0) return 10;
    var p = Math.pow(10, Math.floor(Math.log10(max)));
    return Math.ceil(max / p) * p;
  }
  function axisColor() { return cssVar('--mut', '#6b7488'); }
  function txColor() { return cssVar('--tx', '#1b2233'); }

  function barChart(cv, labels, values, color, fmt) {
    var P = prep(cv), ctx = P.ctx, w = P.w, h = P.h;
    var left = 36, right = 8, top = 18, bottom = 36;
    var max = pad(Math.max.apply(null, values.concat([0])));
    var n = values.length, iw = (w - left - right) / n;
    ctx.strokeStyle = axisColor();
    ctx.fillStyle = axisColor();
    ctx.lineWidth = 1;
    ctx.font = '11px system-ui,-apple-system,sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (var t = 0; t <= 4; t++) {
      var y = top + (h - top - bottom) * (1 - t / 4);
      ctx.globalAlpha = isDark() ? 0.25 : 0.2;
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(w - right, y); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillText(String(Math.round(max * t / 4)), left - 6, y);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    values.forEach(function (v, i) {
      var x = left + i * iw + iw * 0.18;
      var bw = iw * 0.64;
      var bh = (h - top - bottom) * (v / max);
      var y = h - bottom - bh;
      ctx.fillStyle = color;
      roundRect(ctx, x, y, bw, Math.max(bh, v ? 2 : 0), 5);
      ctx.fill();
      ctx.fillStyle = axisColor();
      var lab = labels[i];
      if (n > 8 && i % 2) return;
      ctx.save();
      ctx.translate(left + i * iw + iw / 2, h - bottom + 6);
      if (n > 6) { ctx.rotate(-Math.PI / 5); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; }
      ctx.fillText(lab, 0, 0);
      ctx.restore();
      if (v) {
        ctx.fillStyle = txColor();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(fmt ? fmt(v) : String(v), left + i * iw + iw / 2, y - 2);
      }
    });
  }

  function hbarChart(cv, labels, values, colors) {
    var P = prep(cv), ctx = P.ctx, w = P.w, h = P.h;
    var left = 128, right = 36, top = 8, bottom = 8;
    var max = pad(Math.max.apply(null, values.concat([0])));
    var n = values.length, ih = (h - top - bottom) / n;
    ctx.font = '12px system-ui,-apple-system,sans-serif';
    values.forEach(function (v, i) {
      var y = top + i * ih + ih * 0.2;
      var bh = ih * 0.6;
      var bw = (w - left - right) * (v / max);
      ctx.fillStyle = colors[i];
      roundRect(ctx, left, y, Math.max(bw, 2), bh, 6);
      ctx.fill();
      ctx.fillStyle = txColor();
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels[i], left - 8, y + bh / 2);
      ctx.textAlign = 'left';
      ctx.fillText(String(v), left + bw + 6, y + bh / 2);
    });
  }

  function lineChart(cv, labels, series, yMax, fmt, allowZero) {
    var P = prep(cv), ctx = P.ctx, w = P.w, h = P.h;
    var left = 36, right = 8, top = 18, bottom = 36;
    var all = [];
    series.forEach(function (s) { s.values.forEach(function (v) { if (v != null) all.push(v); }); });
    var max = yMax != null ? yMax : pad(Math.max.apply(null, all.concat([0])));
    var n = labels.length;
    var plotW = w - left - right, plotH = h - top - bottom;
    function X(i) { return left + (n === 1 ? plotW / 2 : i * plotW / (n - 1)); }
    function Y(v) { return top + plotH * (1 - (v / max)); }
    ctx.strokeStyle = axisColor();
    ctx.fillStyle = axisColor();
    ctx.lineWidth = 1;
    ctx.font = '11px system-ui,-apple-system,sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (var t = 0; t <= 4; t++) {
      var y = top + plotH * (1 - t / 4);
      ctx.globalAlpha = isDark() ? 0.25 : 0.2;
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(w - right, y); ctx.stroke();
      ctx.globalAlpha = 1;
      var lab = Math.round(max * t / 4);
      ctx.fillText(fmt && yMax === 100 ? (lab + '%') : String(lab), left - 6, y);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    labels.forEach(function (lab, i) {
      if (n > 8 && i % 2) return;
      ctx.fillStyle = axisColor();
      ctx.save();
      ctx.translate(X(i), h - bottom + 6);
      if (n > 6) { ctx.rotate(-Math.PI / 5); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; }
      ctx.fillText(lab, 0, 0);
      ctx.restore();
    });
    series.forEach(function (s) {
      ctx.beginPath();
      var started = false;
      s.values.forEach(function (v, i) {
        if (v == null) { started = false; return; }
        if (!started) { ctx.moveTo(X(i), Y(v)); started = true; }
        else ctx.lineTo(X(i), Y(v));
      });
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.stroke();
      s.values.forEach(function (v, i) {
        if (v == null) return;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(X(i), Y(v), 3.2, 0, Math.PI * 2);
        ctx.fill();
      });
    });
    if (series.length > 1) {
      var lx = left, ly = 6;
      ctx.font = '11px system-ui,-apple-system,sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      series.forEach(function (s) {
        ctx.fillStyle = s.color;
        ctx.fillRect(lx, ly, 10, 10);
        ctx.fillStyle = txColor();
        ctx.fillText(s.name, lx + 14, ly + 5);
        lx += ctx.measureText(s.name).width + 32;
      });
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    if (h <= 0 || w <= 0) return;
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  window.addEventListener('resize', function () {
    if (!state) return;
    clearTimeout(window.__stR);
    window.__stR = setTimeout(function () {
      renderXpChart(state);
      renderAccChart(state);
      renderErrChart(state);
      renderTrendChart(state);
    }, 120);
  });
})();
