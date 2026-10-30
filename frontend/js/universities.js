/* ============================================================
   Meridian — Universities
   Its own section, independent of projects and scholarships:
   QS-ranked universities with a filter sidebar (your scores, place,
   cost, ranking), clean cards without the rank (the rank lives on
   the university's own page), saving, and an optional map view.
   ============================================================ */
(function () {
  'use strict';

  var PAGE = 30;
  var unis = [];
  var land = null;
  var hover = null;
  var shown = PAGE;
  var view = 'list';
  var DEFAULTS = { q: '', region: 'all', country: 'all', tier: 'all', tuition: 'all', platform: 'all', admit: 'all',
    type: 'all', aid: false, schol: false, full: false, fitOnly: false, testOptional: false, sort: 'rank',
    sat: null, act: null, ielts: null, toefl: null, duo: null };
  var filters = Object.assign({}, DEFAULTS);

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
    other: { en: 'Ranked 500+', ka: '500-ის შემდეგ', ar: 'بعد المرتبة 500' }
  };
  var TUITION = {
    all: { en: 'Any tuition', ka: 'ნებისმიერი', ar: 'أي رسوم' },
    free: { en: 'Free', ka: 'უფასო', ar: 'مجانية' },
    '5000': { en: 'Under $5,000', ka: '$5,000-მდე', ar: 'أقل من 5,000$' },
    '15000': { en: 'Under $15,000', ka: '$15,000-მდე', ar: 'أقل من 15,000$' },
    '30000': { en: 'Under $30,000', ka: '$30,000-მდე', ar: 'أقل من 30,000$' },
    '50000': { en: 'Under $50,000', ka: '$50,000-მდე', ar: 'أقل من 50,000$' }
  };
  var ADMIT = {
    all: { en: 'Any', ka: 'ნებისმიერი', ar: 'أي نسبة' },
    low: { en: 'Very selective (under 15%)', ka: 'ძალიან შერჩევითი (<15%)', ar: 'انتقائية جداً (أقل من 15%)' },
    mid: { en: 'Selective (15–40%)', ka: 'შერჩევითი (15–40%)', ar: 'انتقائية (15–40%)' },
    high: { en: 'Accessible (over 40%)', ka: 'ხელმისაწვდომი (>40%)', ar: 'متاحة (أكثر من 40%)' }
  };
  var TYPES = {
    all: { en: 'Public or private', ka: 'საჯარო ან კერძო', ar: 'حكومية أو خاصة' },
    public: { en: 'Public', ka: 'საჯარო', ar: 'حكومية' },
    private: { en: 'Private', ka: 'კერძო', ar: 'خاصة' }
  };
  var SORTS = {
    rank: { en: 'QS ranking', ka: 'QS რეიტინგი', ar: 'تصنيف QS' },
    name: { en: 'Name (A–Z)', ka: 'სახელი (ა–ჰ)', ar: 'الاسم (أ–ي)' },
    tuition: { en: 'Tuition: low to high', ka: 'სწავლის საფასური: იაფიდან', ar: 'الرسوم: من الأقل' },
    deadline: { en: 'Deadline: soonest', ka: 'ვადა: უახლოესი', ar: 'الموعد: الأقرب' },
    admit: { en: 'Acceptance rate: highest', ka: 'მიღების მაჩვენებელი: მაღალი', ar: 'نسبة القبول: الأعلى' }
  };
  // rough rates, only used to compare tuition across currencies
  var USD = { USD: 1, EUR: 1.08, GBP: 1.27, CHF: 1.12, CAD: 0.73, AUD: 0.66, NZD: 0.6, JPY: 0.0067, KRW: 0.00073,
    CNY: 0.14, HKD: 0.13, SGD: 0.74, QAR: 0.27, AED: 0.27, SAR: 0.27, TRY: 0.03, SEK: 0.095, NOK: 0.093, DKK: 0.145,
    PLN: 0.25, CZK: 0.043, HUF: 0.0027, GEL: 0.37, INR: 0.012, MYR: 0.21, THB: 0.028, ZAR: 0.055, EGP: 0.02,
    MXN: 0.055, BRL: 0.18, CLP: 0.0011, COP: 0.00025, ARS: 0.001, KZT: 0.002, TWD: 0.031, IDR: 0.000063, LBP: 0.000011,
    MAD: 0.1, KES: 0.0077, NGN: 0.00065, GHS: 0.065, UGX: 0.00027, RWF: 0.00075, ILS: 0.27, OMR: 2.6, KWD: 3.25, BHD: 2.65 };

  function L(t, k) { return t[k] ? M.pick(t[k]) : k; }
  function num(v) { var n = parseFloat(v); return isNaN(n) ? null : n; }

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
      u._hay = [u.name.en, u.name.ka, u.name.ar, u.city, u.country && u.country.en, u.country && u.country.ka,
        u.country && u.country.ar, u.platform, (u.keywords || []).join(' '), u.summary && u.summary.en].join(' ').toLowerCase();
    }
    return u._hay;
  }

  /* ---------------------------------------------------------- fit */
  function testOptional(u) {
    var req = u.sat && u.sat.required;
    return req === 'optional' || req === 'not-considered';
  }

  /* "reach", "match" or "likely" from the student's own scores, or null */
  function fitOf(u) {
    var verdicts = [];
    if (filters.sat && u.sat && u.sat.low && u.sat.high) {
      verdicts.push(filters.sat >= u.sat.high ? 2 : filters.sat >= u.sat.low ? 1 : 0);
    } else if (filters.act && u.act && u.act.low && u.act.high) {
      verdicts.push(filters.act >= u.act.high ? 2 : filters.act >= u.act.low ? 1 : 0);
    }
    var english = englishOk(u);
    if (english === false) verdicts.push(-1);
    if (!verdicts.length) return english === true ? 'english' : null;
    var worst = Math.min.apply(null, verdicts);
    return worst < 0 ? 'english-short' : ['reach', 'match', 'likely'][worst];
  }

  /* true / false when the student entered an English score we can compare, else null */
  function englishOk(u) {
    var checks = [];
    if (filters.ielts && u.ielts_min) checks.push(filters.ielts >= u.ielts_min);
    if (filters.toefl && u.toefl_min) checks.push(filters.toefl >= u.toefl_min);
    if (filters.duo && u.duolingo_min) checks.push(filters.duo >= u.duolingo_min);
    if (!checks.length) return null;
    return checks.some(Boolean);
  }

  function anyScore() {
    return !!(filters.sat || filters.act || filters.ielts || filters.toefl || filters.duo);
  }

  function matches(u) {
    if (filters.q && hay(u).indexOf(filters.q.toLowerCase()) === -1) return false;
    if (filters.region !== 'all' && u.region !== filters.region) return false;
    if (filters.country !== 'all' && u.iso !== filters.country) return false;
    if (filters.full && u.profile !== 'full') return false;
    if (filters.tier !== 'all') {
      var r = u.rank_qs || 99999;
      if (filters.tier === 'top-50' && r > 50) return false;
      if (filters.tier === 'top-200' && r > 200) return false;
      if (filters.tier === 'top-500' && r > 500) return false;
      if (filters.tier === 'other' && r <= 500) return false;
    }
    if (filters.tuition !== 'all') {
      var usd = tuitionUSD(u);
      if (usd === null) return false;
      if (filters.tuition === 'free' ? usd > 0 : usd >= +filters.tuition) return false;
    }
    if (filters.admit !== 'all') {
      var a = u.acceptance_rate;
      if (a === null || a === undefined) return false;
      if (filters.admit === 'low' && a >= 0.15) return false;
      if (filters.admit === 'mid' && (a < 0.15 || a > 0.4)) return false;
      if (filters.admit === 'high' && a <= 0.4) return false;
    }
    if (filters.type !== 'all' && u.type !== filters.type) return false;
    if (filters.platform !== 'all' && u.platform !== filters.platform) return false;
    if (filters.aid) {
      var aid = (M.pick(u.aid_intl) || '').toLowerCase();
      if (!aid || /^none|no aid|not available|very limited/.test(aid)) return false;
    }
    if (filters.schol && !u.scholarships) return false;
    if (filters.testOptional && !testOptional(u)) return false;
    if (filters.fitOnly && anyScore()) {
      var fit = fitOf(u);
      if (!fit || fit === 'reach' || fit === 'english-short') return false;
    }
    return true;
  }

  function sorter(a, b) {
    switch (filters.sort) {
      case 'name': return M.pick(a.name).localeCompare(M.pick(b.name));
      case 'tuition': return (tuitionUSD(a) === null ? 1e9 : tuitionUSD(a)) - (tuitionUSD(b) === null ? 1e9 : tuitionUSD(b));
      case 'deadline': return (a.deadline || '9999') < (b.deadline || '9999') ? -1 : (a.deadline || '9999') > (b.deadline || '9999') ? 1 : 0;
      case 'admit': return (b.acceptance_rate || -1) - (a.acceptance_rate || -1);
      default: return (a.rank_qs || 99999) - (b.rank_qs || 99999) || (a.profile === 'full' ? -1 : 1);
    }
  }

  function visible() {
    return unis.filter(matches).sort(sorter);
  }

  /* ---------------------------------------------------------- filters */
  function select(id, table, key) {
    var node = document.getElementById(id);
    node.innerHTML = Object.keys(table).map(function (v) {
      return '<option value="' + v + '"' + (filters[key] === v ? ' selected' : '') + '>' + M.esc(L(table, v)) + '</option>';
    }).join('');
    node.onchange = function () { filters[key] = node.value; refresh(true); };
  }

  function check(id, key) {
    var node = document.getElementById(id);
    node.checked = !!filters[key];
    node.onchange = function () { filters[key] = node.checked; refresh(true); };
  }

  function score(id, key) {
    var node = document.getElementById(id);
    node.value = filters[key] === null ? '' : filters[key];
    var timer = null;
    node.oninput = function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        filters[key] = num(node.value);
        saveScores();
        refresh(true);
      }, 250);
    };
  }

  function saveScores() {
    try {
      localStorage.setItem('meridian.uniScores', JSON.stringify({
        sat: filters.sat, act: filters.act, ielts: filters.ielts, toefl: filters.toefl, duo: filters.duo
      }));
    } catch (e) { /* private mode */ }
  }

  function loadScores() {
    try {
      var saved = JSON.parse(localStorage.getItem('meridian.uniScores') || 'null');
      if (saved) ['sat', 'act', 'ielts', 'toefl', 'duo'].forEach(function (k) { filters[k] = num(saved[k]); });
    } catch (e) { /* ignore */ }
  }

  function paintFilters() {
    select('fRegion', REGIONS, 'region');
    select('fTier', TIERS, 'tier');
    select('fTuition', TUITION, 'tuition');
    select('fAdmit', ADMIT, 'admit');
    select('fType', TYPES, 'type');
    select('fSort', SORTS, 'sort');
    var countries = {};
    unis.forEach(function (u) {
      if (!u.iso) return;
      if (!countries[u.iso]) countries[u.iso] = { name: M.pick(u.country), flag: u.flag, n: 0 };
      countries[u.iso].n += 1;
    });
    var node = document.getElementById('fCountry');
    node.innerHTML = '<option value="all">' + M.esc(M.pick({ en: 'All countries', ka: 'ყველა ქვეყანა', ar: 'كل الدول' })) + '</option>' +
      Object.keys(countries).sort(function (a, b) { return countries[a].name.localeCompare(countries[b].name); })
        .map(function (iso) {
          return '<option value="' + iso + '"' + (filters.country === iso ? ' selected' : '') + '>' +
            countries[iso].flag + ' ' + M.esc(countries[iso].name) + ' (' + countries[iso].n + ')</option>';
        }).join('');
    node.onchange = function () { filters.country = node.value; refresh(true); };
    var platforms = {};
    unis.forEach(function (u) { if (u.platform) platforms[u.platform] = 1; });
    var p = { all: { en: 'Any system', ka: 'ნებისმიერი', ar: 'أي نظام' } };
    Object.keys(platforms).sort().forEach(function (k) { p[k] = { en: k, ka: k, ar: k }; });
    select('fPlatform', p, 'platform');
    check('fAid', 'aid'); check('fSchol', 'schol'); check('fFull', 'full');
    check('fFitOnly', 'fitOnly'); check('fTestOptional', 'testOptional');
    score('fSat', 'sat'); score('fAct', 'act'); score('fIelts', 'ielts'); score('fToefl', 'toefl'); score('fDuo', 'duo');
  }

  /* ---------------------------------------------------------- cards */
  function money(u) {
    var t = u.tuition_intl;
    if (!t || t.amount === null || t.amount === undefined) return '—';
    if (t.amount === 0) return M.t('uni.free');
    return Number(t.amount).toLocaleString('en-US') + ' ' + (t.currency || '') + ' / ' + M.t(t.per === 'semester' ? 'uni.semester' : 'uni.year');
  }

  function initials(name) {
    var short = /\(([A-Z][A-Za-z&]{1,4})\)/.exec(String(name || ''));
    if (short) return short[1].toUpperCase();
    var words = String(name || '').replace(/\(.*?\)/g, '').split(/\s+/).filter(function (w) {
      return w && !/^(of|the|and|for|de|di|du|la|le|der|des|et|y|&|-)$/i.test(w);
    });
    return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] || '?').slice(0, 2)).toUpperCase();
  }

  /* The logo when we have one; a crisp monogram when we don't or it fails to load */
  function logo(u, size) {
    var mono = '<span class="uni-mono" aria-hidden="true">' + M.esc(initials(u.name.en)) + '</span>';
    if (!u.logo) return '<span class="uni-logo" style="--s:' + size + 'px">' + mono + '</span>';
    return '<span class="uni-logo has-img" style="--s:' + size + 'px">' + mono +
      '<img src="' + M.esc(u.logo) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" ' +
      'onerror="this.parentNode.classList.remove(\'has-img\');this.remove()" /></span>';
  }
  M.uniLogo = logo;

  function range(r) {
    return r && r.low && r.high ? r.low + '–' + r.high : null;
  }

  function english(u) {
    var parts = [];
    if (u.ielts_min) parts.push('IELTS ' + u.ielts_min);
    if (u.toefl_min) parts.push('TOEFL ' + u.toefl_min);
    if (u.duolingo_min) parts.push('DET ' + u.duolingo_min);
    return parts.join(' · ');
  }

  var FIT = {
    likely: { cls: 'fit-likely', key: 'uni.fit.likely' },
    match: { cls: 'fit-match', key: 'uni.fit.match' },
    reach: { cls: 'fit-reach', key: 'uni.fit.reach' },
    english: { cls: 'fit-match', key: 'uni.fit.english' },
    'english-short': { cls: 'fit-reach', key: 'uni.fit.englishShort' }
  };

  function isSaved(id) { return (M.state.saved || []).indexOf(id) !== -1; }

  function card(u) {
    var days = M.daysUntil(u.deadline);
    var fit = anyScore() ? fitOf(u) : null;
    var stats = [];
    var sat = range(u.sat);
    if (sat) stats.push(['SAT', sat + (testOptional(u) ? ' <i>' + M.t('uni.optional') + '</i>' : '')]);
    else if (u.sat && u.sat.required === 'not-considered') stats.push(['SAT', M.t('uni.notConsidered')]);
    var eng = english(u);
    if (eng) stats.push([M.t('uni.english'), M.esc(eng)]);
    if (u.profile === 'full') {
      if (money(u) !== '—') stats.push([M.t('uni.tuition'), M.esc(money(u))]);
      if (u.acceptance_rate) stats.push([M.t('uni.admit'), Math.round(u.acceptance_rate * 100) + '%']);
      if (u.deadline) stats.push([M.t('uni.deadline'), M.formatDate(u.deadline) +
        (days !== null && days >= 0 && days <= 45 ? ' <em>· ' + days + ' ' + M.t('home.rail.days') + '</em>' : '')]);
    }
    var href = '/universities/' + encodeURIComponent(u.id);
    return '<article class="uni-row' + (u.profile === 'basic' ? ' is-basic' : '') + '">' +
      '<a class="uni-row-link" href="' + href + '" aria-label="' + M.esc(M.pick(u.name)) + '"></a>' +
      logo(u, 52) +
      '<div class="uni-row-main">' +
        '<h3>' + M.esc(M.pick(u.name)) + '</h3>' +
        '<p class="uni-loc">' + (u.flag || '') + ' ' + M.esc(u.city ? u.city + ', ' : '') + M.esc(M.pick(u.country)) +
          (u.type ? ' · ' + M.esc(L(TYPES, u.type)) : '') + '</p>' +
        (stats.length
          ? '<dl class="uni-chips">' + stats.map(function (s) { return '<div><dt>' + s[0] + '</dt><dd>' + s[1] + '</dd></div>'; }).join('') + '</dl>'
          : '<p class="uni-basic-note">' + M.t('uni.basicNote') + '</p>') +
      '</div>' +
      '<div class="uni-row-side">' +
        (fit ? '<span class="fit-badge ' + FIT[fit].cls + '">' + M.t(FIT[fit].key) + '</span>' : '') +
        '<button type="button" class="uni-save' + (isSaved(u.id) ? ' is-on' : '') + '" data-save="' + M.esc(u.id) + '" aria-pressed="' + isSaved(u.id) + '" aria-label="' + M.esc(M.t('uni.save')) + '">' +
          M.icon('bookmark', 18) + '</button>' +
      '</div>' +
    '</article>';
  }

  function paintGrid() {
    var list = visible();
    var host = document.getElementById('uniGrid');
    var fulls = list.filter(function (u) { return u.profile === 'full'; }).length;
    document.getElementById('uniCount').innerHTML = '<b>' + list.length.toLocaleString('en-US') + '</b> ' + M.t('uni.results') +
      (fulls && fulls !== list.length ? ' · ' + fulls + ' ' + M.t('uni.withData') : '');
    host.innerHTML = list.length ? list.slice(0, shown).map(card).join('') :
      '<div class="empty-state">' + M.icon('search', 42) + '<p>' + M.t('uni.empty') + '</p></div>';
    document.getElementById('uniMore').hidden = shown >= list.length;
    host.querySelectorAll('[data-save]').forEach(function (button) {
      button.addEventListener('click', function (event) {
        event.preventDefault();
        toggleSave(button);
      });
    });
  }

  function toggleSave(button) {
    var id = button.getAttribute('data-save');
    if (!M.state.user) {
      window.location.href = '/login?mode=register&next=' + encodeURIComponent(window.location.pathname);
      return;
    }
    M.api('/api/saved', { body: { program_id: id } }).then(function (data) {
      M.state.saved = data.all || [];
      button.classList.toggle('is-on', data.saved);
      button.setAttribute('aria-pressed', String(data.saved));
      M.toast(M.t(data.saved ? 'uni.saved' : 'uni.unsaved'), 'success', 1800);
      if (data.saved) M.track('save', id, { kind: 'university' });
    }).catch(function () { M.toast(M.t('common.error'), 'error'); });
  }

  /* ---------------------------------------------------------- the map */
  var canvas, ctx, dpr = 1, W = 0, H = 0, startTime = 0, drawing = false;

  function project(lon, lat) {
    // equirectangular, trimmed of the poles; reads well at any width
    return [(lon + 180) / 360 * W, (78 - lat) / (78 + 58) * H];
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
    if (!ctx || !W || view !== 'map') { drawing = false; return; }
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
    var on = {};
    visible().forEach(function (u) { on[u.id] = 1; });
    unis.forEach(function (u) {
      if (u.lat === undefined || u.lat === null || u.lon === undefined) return;
      var p = project(u.lon, u.lat);
      var lit = !!on[u.id];
      var top = u.tier === 'top-50';
      var size = top ? 4.2 : u.tier === 'top-200' ? 3.4 : 2.8;
      if (lit && top && !calm) {
        var pulse = (t * 0.6 + (u.lon + 180) / 360) % 1;
        ctx.beginPath();
        ctx.arc(p[0], p[1], size + pulse * 12, 0, Math.PI * 2);
        ctx.strokeStyle = c.ring.replace(/[\d.]+\)$/, (0.5 * (1 - pulse)).toFixed(2) + ')');
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(p[0], p[1], hover === u ? size + 2.5 : size, 0, Math.PI * 2);
      ctx.fillStyle = !lit ? c.dim : top ? c.top : u.tier === 'top-200' ? c.mid : c.other;
      ctx.fill();
    });
    if (!calm) requestAnimationFrame(draw); else drawing = false;
  }

  function startDrawing() {
    if (drawing) return;
    drawing = true;
    requestAnimationFrame(draw);
  }

  function nearest(x, y) {
    var best = null, bestD = 14 * 14;
    visible().forEach(function (u) {
      if (u.lat === undefined || u.lat === null) return;
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
    new ResizeObserver(function () { resize(); startDrawing(); }).observe(canvas);
    canvas.addEventListener('pointermove', function (e) {
      var rect = canvas.getBoundingClientRect();
      var u = nearest(e.clientX - rect.left, e.clientY - rect.top);
      hover = u;
      canvas.style.cursor = u ? 'pointer' : 'default';
      if (!u) { tip.hidden = true; return; }
      var p = project(u.lon, u.lat);
      tip.hidden = false;
      tip.innerHTML = '<b>' + u.flag + ' ' + M.esc(M.pick(u.name)) + '</b><span>' + M.esc(u.city || M.pick(u.country)) + '</span>';
      tip.style.left = Math.min(Math.max(p[0], 90), W - 90) + 'px';
      tip.style.top = p[1] + 'px';
    });
    canvas.addEventListener('pointerleave', function () { hover = null; tip.hidden = true; });
    canvas.addEventListener('click', function () {
      if (hover) window.location.href = '/universities/' + encodeURIComponent(hover.id);
    });
    startTime = performance.now();
  }

  function setView(next) {
    view = next;
    document.querySelectorAll('[data-view]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === view)); });
    document.getElementById('uniMapCard').hidden = view !== 'map';
    if (view === 'map') {
      if (!land) fetch('/assets/globe-dots.json').then(function (r) { return r.json(); }).then(function (d) { land = d; });
      resize();
      startDrawing();
    }
  }

  function refresh(resetPage) {
    if (resetPage) shown = PAGE;
    paintGrid();
    if (view === 'map') startDrawing();
  }

  function init() {
    mountMap();
    loadScores();
    var search = document.getElementById('uniSearch');
    var params = new URLSearchParams(window.location.search);
    filters.q = params.get('q') || '';
    if (params.get('country')) filters.country = params.get('country').toUpperCase();
    search.value = filters.q;
    var timer = null;
    search.addEventListener('input', function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        filters.q = search.value.trim();
        refresh(true);
        if (filters.q.length > 1) M.track('search', null, { q: filters.q.slice(0, 60), section: 'university' });
      }, 200);
    });
    document.getElementById('uniReset').addEventListener('click', function () {
      filters = Object.assign({}, DEFAULTS);
      search.value = '';
      saveScores();
      paintFilters(); refresh(true);
    });
    document.getElementById('uniMore').addEventListener('click', function () { shown += PAGE; paintGrid(); });
    document.querySelectorAll('[data-view]').forEach(function (b) {
      b.addEventListener('click', function () { setView(b.getAttribute('data-view')); });
    });
    var side = document.getElementById('uniSide');
    var toggle = document.getElementById('uniFilterToggle');
    toggle.addEventListener('click', function () {
      var open = !side.classList.contains('is-open');
      side.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });

    M.api('/api/universities').then(function (data) {
      unis = (data.universities || []).filter(function (u) { return u && u.name; });
      document.getElementById('uniTotal') && (document.getElementById('uniTotal').textContent = unis.length.toLocaleString('en-US'));
      paintFilters();
      refresh(true);
    });
    window.addEventListener('meridian:user', function () { paintGrid(); });
    window.addEventListener('meridian:lang', function () { unis.forEach(function (u) { delete u._hay; }); paintFilters(); refresh(); });
    window.addEventListener('meridian:theme', function () { startDrawing(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
