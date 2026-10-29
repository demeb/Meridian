/* ============================================================
   Meridian — Universities
   A flat dot-matrix world map (not the globe: that belongs to
   projects and scholarships), filters, full profiles, and the
   directory of every other university we know of.
   ============================================================ */
(function () {
  'use strict';

  var unis = [];
  var land = null;
  var hover = null;
  var filters = { q: '', region: 'all', country: 'all', tier: 'all', tuition: 'all', platform: 'all', aid: false };
  var dirPage = 0;
  var dirTimer = null;

  var REGIONS = {
    all: { en: 'All regions', ka: 'ყველა რეგიონი', ar: 'كل المناطق' },
    europe: { en: 'Europe', ka: 'ევროპა', ar: 'أوروبا' },
    americas: { en: 'Americas', ka: 'ამერიკა', ar: 'الأمريكتان' },
    asia: { en: 'Asia', ka: 'აზია', ar: 'آسيا' },
    'middle-east': { en: 'Middle East', ka: 'ახლო აღმოსავლეთი', ar: 'الشرق الأوسط' },
    africa: { en: 'Africa', ka: 'აფრიკა', ar: 'أفريقيا' },
    oceania: { en: 'Oceania', ka: 'ოკეანია', ar: 'أوقيانوسيا' }
  };
  var TIERS = {
    all: { en: 'Any ranking', ka: 'ნებისმიერი', ar: 'أي تصنيف' },
    'top-50': { en: 'QS top 50', ka: 'QS ტოპ 50', ar: 'أفضل 50 (QS)' },
    'top-200': { en: 'QS top 200', ka: 'QS ტოპ 200', ar: 'أفضل 200 (QS)' },
    'top-500': { en: 'QS top 500', ka: 'QS ტოპ 500', ar: 'أفضل 500 (QS)' },
    other: { en: 'Unranked / other', ka: 'სხვა', ar: 'غير مصنفة / أخرى' }
  };
  var TUITION = {
    all: { en: 'Any tuition', ka: 'ნებისმიერი', ar: 'أي رسوم' },
    free: { en: 'Free', ka: 'უფასო', ar: 'مجانية' },
    '5000': { en: 'Under $5,000', ka: '$5,000-მდე', ar: 'أقل من 5,000$' },
    '15000': { en: 'Under $15,000', ka: '$15,000-მდე', ar: 'أقل من 15,000$' },
    '30000': { en: 'Under $30,000', ka: '$30,000-მდე', ar: 'أقل من 30,000$' }
  };
  // rough rates, only used to compare tuition across currencies
  var USD = { USD: 1, EUR: 1.08, GBP: 1.27, CHF: 1.12, CAD: 0.73, AUD: 0.66, NZD: 0.6, JPY: 0.0067, KRW: 0.00073,
    CNY: 0.14, HKD: 0.13, SGD: 0.74, QAR: 0.27, AED: 0.27, SAR: 0.27, TRY: 0.03, SEK: 0.095, NOK: 0.093, DKK: 0.145,
    PLN: 0.25, CZK: 0.043, HUF: 0.0027, GEL: 0.37, INR: 0.012, MYR: 0.21, THB: 0.028, ZAR: 0.055, EGP: 0.02,
    MXN: 0.055, BRL: 0.18, CLP: 0.0011, COP: 0.00025, ARS: 0.001, KZT: 0.002, TWD: 0.031, IDR: 0.000063, LBP: 0.000011,
    MAD: 0.1, KES: 0.0077, NGN: 0.00065, GHS: 0.065, UGX: 0.00027, RWF: 0.00075, ILS: 0.27, OMR: 2.6, KWD: 3.25, BHD: 2.65 };

  function L(t, k) { return t[k] ? M.pick(t[k]) : k; }

  function tuitionUSD(u) {
    var t = u.tuition_intl;
    if (!t || t.amount === null || t.amount === undefined) return null;
    var rate = USD[(t.currency || 'USD').toUpperCase()];
    if (!rate) return null;
    var perYear = t.per === 'semester' ? t.amount * 2 : t.amount;
    return Math.round(perYear * rate);
  }

  function hay(u) {
    if (!u._hay) {
      u._hay = [u.name.en, u.name.ka, u.name.ar, u.city, u.country.en, u.country.ka, u.country.ar, u.platform,
        (u.keywords || []).join(' '), u.summary && u.summary.en].join(' ').toLowerCase();
    }
    return u._hay;
  }

  function matches(u) {
    if (filters.q && hay(u).indexOf(filters.q.toLowerCase()) === -1) return false;
    if (filters.region !== 'all' && u.region !== filters.region) return false;
    if (filters.country !== 'all' && u.iso !== filters.country) return false;
    if (filters.tier !== 'all') {
      var order = ['top-50', 'top-200', 'top-500', 'other'];
      if (filters.tier === 'other' ? u.tier !== 'other' : order.indexOf(u.tier) > order.indexOf(filters.tier) || order.indexOf(u.tier) === -1) return false;
    }
    if (filters.tuition !== 'all') {
      var usd = tuitionUSD(u);
      if (usd === null) return false;
      if (filters.tuition === 'free' ? usd > 0 : usd >= +filters.tuition) return false;
    }
    if (filters.platform !== 'all' && u.platform !== filters.platform) return false;
    if (filters.aid) {
      var aid = (M.pick(u.aid_intl) || '').toLowerCase();
      if (!aid || /^none|no aid|not available/.test(aid)) return false;
    }
    return true;
  }

  function visible() {
    return unis.filter(matches).sort(function (a, b) {
      return (a.rank_qs || 9999) - (b.rank_qs || 9999);
    });
  }

  /* ---------------------------------------------------------- filters */
  function select(id, table, key) {
    var node = document.getElementById(id);
    node.innerHTML = Object.keys(table).map(function (v) {
      return '<option value="' + v + '"' + (filters[key] === v ? ' selected' : '') + '>' + M.esc(L(table, v)) + '</option>';
    }).join('');
    node.onchange = function () { filters[key] = node.value; refresh(); };
  }

  function paintFilters() {
    select('fRegion', REGIONS, 'region');
    select('fTier', TIERS, 'tier');
    select('fTuition', TUITION, 'tuition');
    var countries = {};
    unis.forEach(function (u) { countries[u.iso] = { name: M.pick(u.country), flag: u.flag }; });
    var c = { all: { en: 'All countries', ka: 'ყველა ქვეყანა', ar: 'كل الدول' } };
    Object.keys(countries).sort(function (a, b) { return countries[a].name.localeCompare(countries[b].name); })
      .forEach(function (iso) { c[iso] = countries[iso].flag + ' ' + countries[iso].name; });
    var node = document.getElementById('fCountry');
    node.innerHTML = Object.keys(c).map(function (v) {
      return '<option value="' + v + '"' + (filters.country === v ? ' selected' : '') + '>' +
        M.esc(typeof c[v] === 'string' ? c[v] : M.pick(c[v])) + '</option>';
    }).join('');
    node.onchange = function () { filters.country = node.value; refresh(); dirPage = 0; loadDirectory(); };
    var platforms = {};
    unis.forEach(function (u) { if (u.platform) platforms[u.platform] = 1; });
    var p = { all: { en: 'Any system', ka: 'ნებისმიერი', ar: 'أي نظام' } };
    Object.keys(platforms).sort().forEach(function (k) { p[k] = { en: k, ka: k, ar: k }; });
    select('fPlatform', p, 'platform');
    var aid = document.getElementById('fAid');
    aid.checked = filters.aid;
    aid.onchange = function () { filters.aid = aid.checked; refresh(); };
  }

  /* ---------------------------------------------------------- cards */
  function money(u) {
    var t = u.tuition_intl;
    if (!t || t.amount === null || t.amount === undefined) return '—';
    if (t.amount === 0) return M.t('uni.free');
    return Number(t.amount).toLocaleString('en-US') + ' ' + (t.currency || '') + ' / ' + M.t(t.per === 'semester' ? 'uni.semester' : 'uni.year');
  }

  function card(u) {
    var days = M.daysUntil(u.deadline);
    return '<a class="uni-card" href="/universities/' + encodeURIComponent(u.id) + '" data-reveal>' +
      '<div class="uni-card-top">' +
        '<span class="uni-flag">' + (u.flag || '') + '</span>' +
        (u.rank_qs ? '<span class="uni-rank">QS #' + u.rank_qs + '</span>' : '<span class="uni-rank is-muted">' + M.t('uni.unranked') + '</span>') +
      '</div>' +
      '<h3>' + M.esc(M.pick(u.name)) + '</h3>' +
      '<p class="uni-loc">' + M.esc(u.city ? u.city + ', ' : '') + M.esc(M.pick(u.country)) + '</p>' +
      '<dl class="uni-stats">' +
        '<div><dt>' + M.t('uni.tuition') + '</dt><dd>' + M.esc(money(u)) + '</dd></div>' +
        '<div><dt>' + M.t('uni.deadline') + '</dt><dd>' + (u.deadline ? M.formatDate(u.deadline) + (days !== null && days >= 0 && days <= 45 ? ' <em>· ' + days + ' ' + M.t('home.rail.days') + '</em>' : '') : '—') + '</dd></div>' +
        '<div><dt>' + M.t('uni.apply') + '</dt><dd>' + M.esc(u.platform || '—') + '</dd></div>' +
        '<div><dt>' + M.t('uni.admit') + '</dt><dd>' + (u.acceptance_rate ? Math.round(u.acceptance_rate * 100) + '%' : '—') + '</dd></div>' +
      '</dl>' +
    '</a>';
  }

  function paintGrid() {
    var list = visible();
    var host = document.getElementById('uniGrid');
    document.getElementById('uniCount').textContent = list.length + ' / ' + unis.length;
    host.innerHTML = list.length ? list.map(card).join('') :
      '<div class="empty-state">' + M.icon('search', 42) + '<p>' + M.t(unis.length ? 'uni.empty' : 'uni.dir.lede') + '</p></div>';
    M.observeReveal(host);
  }

  /* ---------------------------------------------------------- the map */
  var canvas, ctx, dpr = 1, W = 0, H = 0, startTime = 0;

  function project(lon, lat) {
    // equirectangular, trimmed of the poles; reads well at any width
    var x = (lon + 180) / 360 * W;
    var y = (78 - lat) / (78 + 58) * H;
    return [x, y];
  }

  function colors() {
    var dark = document.documentElement.getAttribute('data-theme') !== 'light';
    return dark
      ? { land: 'rgba(140,170,230,0.22)', top: '#ffd76e', mid: '#5aa8ff', other: 'rgba(190,210,255,0.75)', dim: 'rgba(140,170,230,0.12)', ring: 'rgba(255,215,110,0.35)' }
      : { land: 'rgba(255,255,255,0.45)', top: '#ffd76e', mid: '#0b2a6b', other: 'rgba(11,42,107,0.55)', dim: 'rgba(255,255,255,0.25)', ring: 'rgba(255,215,110,0.6)' };
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(now) {
    if (!ctx || !W) return;
    var c = colors();
    var t = (now - startTime) / 1000;
    var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    ctx.clearRect(0, 0, W, H);
    if (land) {
      ctx.fillStyle = c.land;
      var pts = land.points, r = Math.max(0.9, W / 900);
      for (var i = 0; i < pts.length; i += 2) {
        if (pts[i + 1] < -58) continue;
        var p = project(pts[i], pts[i + 1]);
        ctx.fillRect(p[0] - r / 2, p[1] - r / 2, r, r);
      }
    }
    var shown = {};
    visible().forEach(function (u) { shown[u.id] = 1; });
    unis.forEach(function (u) {
      if (u.lat === undefined || u.lon === undefined) return;
      var p = project(u.lon, u.lat);
      var on = !!shown[u.id];
      var top = u.tier === 'top-50';
      var size = top ? 4.2 : u.tier === 'top-200' ? 3.4 : 2.8;
      if (on && top && !calm) {
        var pulse = (t * 0.6 + (u.lon + 180) / 360) % 1;
        ctx.beginPath();
        ctx.arc(p[0], p[1], size + pulse * 12, 0, Math.PI * 2);
        ctx.strokeStyle = c.ring.replace(/[\d.]+\)$/, (0.5 * (1 - pulse)).toFixed(2) + ')');
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(p[0], p[1], hover === u ? size + 2.5 : size, 0, Math.PI * 2);
      ctx.fillStyle = !on ? c.dim : top ? c.top : u.tier === 'top-200' ? c.mid : c.other;
      ctx.fill();
    });
    if (!calm) requestAnimationFrame(draw);
  }

  function nearest(x, y) {
    var best = null, bestD = 14 * 14;
    visible().forEach(function (u) {
      if (u.lat === undefined) return;
      var p = project(u.lon, u.lat);
      var d = (p[0] - x) * (p[0] - x) + (p[1] - y) * (p[1] - y);
      if (d < bestD) { bestD = d; best = u; }
    });
    return best;
  }

  function mountMap() {
    canvas = document.getElementById('uniMap');
    ctx = canvas.getContext('2d');
    var tip = document.getElementById('uniTip');
    resize();
    new ResizeObserver(function () { resize(); if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) draw(performance.now()); }).observe(canvas);
    fetch('/assets/globe-dots.json').then(function (r) { return r.json(); }).then(function (d) { land = d; });
    canvas.addEventListener('pointermove', function (e) {
      var rect = canvas.getBoundingClientRect();
      var u = nearest(e.clientX - rect.left, e.clientY - rect.top);
      hover = u;
      canvas.style.cursor = u ? 'pointer' : 'default';
      if (!u) { tip.hidden = true; return; }
      var p = project(u.lon, u.lat);
      tip.hidden = false;
      tip.innerHTML = '<b>' + u.flag + ' ' + M.esc(M.pick(u.name)) + '</b><span>' + M.esc(u.city || M.pick(u.country)) +
        (u.rank_qs ? ' · QS #' + u.rank_qs : '') + '</span>';
      tip.style.left = Math.min(Math.max(p[0], 90), W - 90) + 'px';
      tip.style.top = p[1] + 'px';
    });
    canvas.addEventListener('pointerleave', function () { hover = null; tip.hidden = true; });
    canvas.addEventListener('click', function () {
      if (hover) window.location.href = '/universities/' + encodeURIComponent(hover.id);
    });
    startTime = performance.now();
    requestAnimationFrame(draw);
  }

  /* ---------------------------------------------------------- directory */
  function loadDirectory(append) {
    var params = new URLSearchParams({ q: filters.q, page: String(dirPage) });
    if (filters.country !== 'all') params.set('country', filters.country);
    M.api('/api/universities/directory?' + params.toString()).then(function (data) {
      var host = document.getElementById('dirList');
      var rows = (data.items || []).map(function (d) {
        return '<a class="dir-row" href="/universities/' + encodeURIComponent(d.id) + '">' +
          '<span class="dir-flag">' + d.flag + '</span><span class="dir-name">' + M.esc(d.name) + '</span>' +
          '<span class="dir-meta">' + M.esc((d.state ? d.state + ', ' : '') + (d.country || '')) + '</span></a>';
      }).join('');
      host.innerHTML = append ? host.innerHTML + rows : rows;
      document.getElementById('dirCount').textContent = data.total.toLocaleString('en-US') + ' ' + M.t('uni.dir.count');
      document.getElementById('dirMore').hidden = (dirPage + 1) * 60 >= data.total;
    });
  }

  function refresh() {
    paintGrid();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) draw(performance.now());
  }

  function init() {
    mountMap();
    var search = document.getElementById('uniSearch');
    var params = new URLSearchParams(window.location.search);
    filters.q = params.get('q') || '';
    search.value = filters.q;
    search.addEventListener('input', function () {
      window.clearTimeout(dirTimer);
      dirTimer = window.setTimeout(function () {
        filters.q = search.value.trim();
        refresh();
        dirPage = 0;
        loadDirectory();
        if (filters.q.length > 1) M.track('search', null, { q: filters.q.slice(0, 60), section: 'university' });
      }, 220);
    });
    document.getElementById('uniReset').addEventListener('click', function () {
      filters = { q: '', region: 'all', country: 'all', tier: 'all', tuition: 'all', platform: 'all', aid: false };
      search.value = '';
      paintFilters(); refresh(); dirPage = 0; loadDirectory();
    });
    document.getElementById('dirMore').addEventListener('click', function () { dirPage += 1; loadDirectory(true); });

    M.api('/api/universities').then(function (data) {
      unis = data.universities || [];
      document.getElementById('uniTotal').textContent = (unis.length + (data.directory_count || 0)).toLocaleString('en-US');
      paintFilters();
      refresh();
    });
    loadDirectory();
    window.addEventListener('meridian:lang', function () { unis.forEach(function (u) { delete u._hay; }); paintFilters(); refresh(); });
    window.addEventListener('meridian:theme', function () { draw(performance.now()); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
