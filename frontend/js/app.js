/* ============================================================
   Meridian — shared runtime
   Theme, language, navigation, footer, reveal, toasts, API.
   ============================================================ */
(function () {
  'use strict';

  var STORE = { theme: 'meridian.theme', lang: 'meridian.lang' };
  var DICT = window.MERIDIAN_I18N || { en: {}, ka: {} };

  /* ---------------------------------------------------------- icons */
  var ICONS = {
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3.6 9h16.8M3.6 15h16.8"/><path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5.2-5.2 2 2-5.2z"/>',
    users: '<path d="M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20"/><circle cx="9" cy="7" r="3.2"/><path d="M22 20v-1.5a4 4 0 0 0-3-3.85"/><path d="M16.5 3.9a4 4 0 0 1 0 6.2"/>',
    book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v16H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 16.5A2.5 2.5 0 0 1 6.5 14H20"/>',
    cap: '<path d="M22 9 12 4 2 9l10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 1.9"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    sun: '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    lock: '<rect x="4" y="10.5" width="16" height="10.5" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
    check: '<path d="m4.5 12.5 5 5 10-11"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12.2 2.8 2.8L16 9.5"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5M12 16.2v.2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.2"/>',
    star: '<path d="m12 3.5 2.7 5.6 6.1.85-4.4 4.3 1.05 6.1L12 17.5l-5.45 2.85L7.6 14.25 3.2 9.95l6.1-.85z"/>',
    mail: '<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3 7 9 6 9-6"/>',
    pin: '<path d="M12 21s7-5.8 7-11a7 7 0 1 0-14 0c0 5.2 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
    award: '<circle cx="12" cy="9" r="5.5"/><path d="m8.5 13.8-1.3 7.2L12 18.6l4.8 2.4-1.3-7.2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    sparkles: '<path d="m12 3 1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M18.5 16.5 19.4 19l2.5.9-2.5.9-.9 2.5-.9-2.5-2.5-.9 2.5-.9z" transform="translate(0 -3)"/>',
    send: '<path d="M21.5 2.5 2 10.2l8 2.8 2.8 8z"/><path d="m10 13 4.5-4.5"/>',
    building: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8.5 7.5h2M13.5 7.5h2M8.5 11.5h2M13.5 11.5h2M9.5 21v-4.5h5V21"/>',
    briefcase: '<rect x="2.5" y="7" width="19" height="13" rx="2.5"/><path d="M8.5 7V5.5A2 2 0 0 1 10.5 3.5h3a2 2 0 0 1 2 2V7"/>',
    bookmark: '<path d="M6 3.5h12v17l-6-4-6 4z"/>',
    external: '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4.5"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    shield: '<path d="M12 3 5 6v5.5c0 4.4 3 8 7 9.5 4-1.5 7-5.1 7-9.5V6z"/><path d="m9.2 12 2 2 3.6-4"/>',
    trending: '<path d="m3 16 5.5-5.5 3.5 3.5L21 5"/><path d="M15.5 5H21v5.5"/>',
    zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    file: '<path d="M14 2.5H7A2 2 0 0 0 5 4.5v15a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5z"/><path d="M14 2.5V7.5H19"/><path d="M8.5 13h7M8.5 16.5h5"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5.2"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.6" r=".9" fill="currentColor"/>',
    linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7.5 10.5V17M7.5 7.2v.2M11.5 17v-3.6a2.2 2.2 0 0 1 4.4 0V17"/>',
    facebook: '<path d="M14.5 8.5h2.5V5.2h-2.5c-2 0-3.5 1.6-3.5 3.6v1.7H8.5v3.3H11V21h3.3v-7.2h2.4l.5-3.3h-2.9V8.8c0-.2.1-.3.2-.3z"/>',
    youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="m10.5 9.5 5 2.5-5 2.5z"/>',
    tiktok: '<path d="M15 3.5c.4 2.2 1.9 3.7 4 4v3c-1.6 0-3-.5-4-1.3v6.1a5.8 5.8 0 1 1-5-5.7v3.1a2.7 2.7 0 1 0 2 2.6V3.5z"/>',
    card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 9.5h19M6.5 15h3"/>',
    camera: '<path d="M4 8h3l1.6-2.4h6.8L17 8h3a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18V9.5A1.5 1.5 0 0 1 4 8z"/><circle cx="12" cy="13.2" r="3.4"/>',
    wallet: '<path d="M4 7.5h14.5A1.5 1.5 0 0 1 20 9v9.5a1.5 1.5 0 0 1-1.5 1.5H5A2 2 0 0 1 3 18V6.5A2 2 0 0 1 5 4.5h11"/><path d="M16 13.5h.01"/>',
    bank: '<path d="M3 9.5 12 4l9 5.5M5 10v7M9.5 10v7M14.5 10v7M19 10v7M3 20h18"/>',
    dashboard: '<rect x="3" y="3" width="7.5" height="9" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="5" rx="1.5"/><rect x="13.5" y="11" width="7.5" height="10" rx="1.5"/><rect x="3" y="15" width="7.5" height="6" rx="1.5"/>',
    userPlus: '<circle cx="9" cy="8" r="3.6"/><path d="M2.5 20v-.8A5.2 5.2 0 0 1 7.7 14h2.6a5.2 5.2 0 0 1 5.2 5.2v.8M18.5 8v6M15.5 11h6"/>',
    upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    chevronUp: '<path d="m6 15 6-6 6 6"/>',
    heart: '<path d="M12 20.5s-8-4.6-8-10.4A4.6 4.6 0 0 1 12 7.3a4.6 4.6 0 0 1 8 2.8c0 5.8-8 10.4-8 10.4z"/>',
    message: '<path d="M20.5 14.5a2 2 0 0 1-2 2H8l-4.5 4V5.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z"/>',
    download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15"/>',
    play: '<circle cx="12" cy="12" r="9"/><path d="m10 8.5 5.5 3.5-5.5 3.5z"/>',
    edit: '<path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-4-4L4 16z"/><path d="m14 6 4 4"/>',
    bulb: '<path d="M9 18h6M10 21.5h4"/><path d="M12 2.5a6.5 6.5 0 0 0-3.8 11.8c.5.4.8 1 .8 1.7v.5h6v-.5c0-.7.3-1.3.8-1.7A6.5 6.5 0 0 0 12 2.5z"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.8M6.6 6.6C3.9 8.3 2.5 12 2.5 12S6 18.5 12 18.5c1.5 0 2.8-.4 4-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'
  };

  function icon(name, size) {
    var path = ICONS[name];
    if (!path) return '';
    var s = size || 24;
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>';
  }

  /* ---------------------------------------------------------- state */
  var state = {
    lang: localStorage.getItem(STORE.lang) || 'en',
    theme: document.documentElement.getAttribute('data-theme') || 'dark',
    user: undefined,
    saved: []
  };

  function t(key, fallback) {
    var table = DICT[state.lang] || DICT.en;
    return table[key] || DICT.en[key] || fallback || key;
  }

  function pick(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return value[state.lang] || value.en || '';
    return value;
  }

  function esc(str) {
    return String(str === null || str === undefined ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------------------------------------------------------- theme */
  function applyTheme(next, animate) {
    state.theme = next;
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem(STORE.theme, next); } catch (e) {}
    if (animate) {
      document.documentElement.classList.add('theme-transition');
      window.setTimeout(function () {
        document.documentElement.classList.remove('theme-transition');
      }, 420);
    }
    document.querySelectorAll('[data-theme-toggle]').forEach(function (node) {
      node.setAttribute('aria-pressed', String(next === 'light'));
    });
    window.dispatchEvent(new CustomEvent('meridian:theme', { detail: { theme: next } }));
  }

  function toggleTheme() {
    var next = state.theme === 'dark' ? 'light' : 'dark';
    var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // a soft crossfade of the whole page, like oceanholding.ge's colour change
    if (document.startViewTransition && !calm) {
      document.startViewTransition(function () { applyTheme(next, false); });
    } else {
      applyTheme(next, true);
    }
  }

  /* ---------------------------------------------------------- language */
  var LANGS = ['en', 'ka', 'ar'];

  function applyLang(next) {
    if (LANGS.indexOf(next) === -1) next = 'en';
    state.lang = next;
    try { localStorage.setItem(STORE.lang, next); } catch (e) {}
    document.documentElement.setAttribute('lang', next);
    // Arabic reads right to left; the layout mirrors with it
    document.documentElement.setAttribute('dir', next === 'ar' ? 'rtl' : 'ltr');
    translate(document);
    document.querySelectorAll('[data-lang-btn]').forEach(function (node) {
      node.setAttribute('aria-pressed', String(node.getAttribute('data-lang-btn') === next));
    });
    document.querySelectorAll('[data-lang-current]').forEach(function (node) { node.textContent = LANG_SHORT[next]; });
    document.querySelectorAll('.lang-pick.is-open').forEach(function (node) { node.classList.remove('is-open'); });
    fitNav();
    window.dispatchEvent(new CustomEvent('meridian:lang', { detail: { lang: next } }));
  }

  function translate(scope) {
    (scope || document).querySelectorAll('[data-i18n]').forEach(function (node) {
      node.textContent = t(node.getAttribute('data-i18n'));
    });
    (scope || document).querySelectorAll('[data-i18n-ph]').forEach(function (node) {
      node.setAttribute('placeholder', t(node.getAttribute('data-i18n-ph')));
    });
    (scope || document).querySelectorAll('[data-i18n-label]').forEach(function (node) {
      node.setAttribute('aria-label', t(node.getAttribute('data-i18n-label')));
    });
    (scope || document).querySelectorAll('[data-i18n-html]').forEach(function (node) {
      node.innerHTML = t(node.getAttribute('data-i18n-html'));
    });
  }

  /* ---------------------------------------------------------- api */
  function api(path, options) {
    var config = Object.assign({ credentials: 'same-origin', headers: {} }, options || {});
    if (config.body && typeof config.body !== 'string') {
      config.headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(config.body);
      config.method = config.method || 'POST';
    }
    return fetch(path, config).then(function (response) {
      return response.json().catch(function () { return { ok: false, error: 'bad_json' }; })
        .then(function (data) {
          data.status = response.status;
          return data;
        });
    });
  }

  function loadUser(force) {
    if (state.user !== undefined && !force) return Promise.resolve(state.user);
    return api('/api/auth/me').then(function (data) {
      state.user = data.user || null;
      state.saved = data.saved || [];
      window.dispatchEvent(new CustomEvent('meridian:user', { detail: { user: state.user } }));
      return state.user;
    }).catch(function () {
      state.user = null;
      return null;
    });
  }

  /* ---------------------------------------------------------- toasts */
  function toast(message, kind, ms) {
    var stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      stack.setAttribute('role', 'status');
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }
    var glyph = kind === 'error' ? 'alert' : kind === 'success' ? 'checkCircle' : 'info';
    var node = document.createElement('div');
    node.className = 'toast toast-' + (kind || 'info');
    node.innerHTML = icon(glyph, 19) + '<span>' + esc(message) + '</span>';
    stack.appendChild(node);
    window.setTimeout(function () {
      node.classList.add('is-out');
      window.setTimeout(function () { node.remove(); }, 260);
    }, ms || 4200);
  }

  /* ---------------------------------------------------------- dates */
  var MONTHS = {
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    ka: ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'],
    ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
  };
  var DOW = {
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    ka: ['კვი', 'ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ'],
    ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
  };

  function parseDate(iso) {
    if (!iso) return null;
    var bits = String(iso).slice(0, 10).split('-');
    if (bits.length !== 3) return null;
    return new Date(Date.UTC(+bits[0], +bits[1] - 1, +bits[2]));
  }

  function formatDate(iso) {
    var date = parseDate(iso);
    if (!date) return '—';
    var months = MONTHS[state.lang] || MONTHS.en;
    return date.getUTCDate() + ' ' + months[date.getUTCMonth()] + ' ' + date.getUTCFullYear();
  }

  function daysUntil(iso) {
    var date = parseDate(iso);
    if (!date) return null;
    var today = new Date();
    var utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.round((date.getTime() - utcToday) / 86400000);
  }

  function iso(date) {
    return date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
  }

  /* ---------------------------------------------------------- reveal */
  /* Content must never be left invisible. Anything already on screen reveals
     straight away; only below-the-fold elements wait for a scroll. An
     IntersectionObserver does that when it can, and a throttled scroll check
     backs it up for the cases where observer callbacks never arrive
     (hidden tabs, prerender, restored pages). */
  var pending = [];
  var pendingCounts = [];
  var scrollHooked = false;

  function revealNow(node) {
    node.classList.add('is-in');
  }

  function inViewport(node, slack) {
    var rect = node.getBoundingClientRect();
    if (!rect.height && !rect.width) return false;
    return rect.top < window.innerHeight * (slack || 1) && rect.bottom > 0;
  }

  function pastFold(node) {
    return node.getBoundingClientRect().top < window.innerHeight * 0.94;
  }

  function sweepPending() {
    if (pending.length) {
      pending = pending.filter(function (node) {
        if (node.classList.contains('is-in')) return false;
        // Reveal once an element has reached the fold — including anything a
        // jump scrolled straight past, so nothing is left blank above you.
        if (pastFold(node)) { revealNow(node); return false; }
        return true;
      });
    }
    if (pendingCounts.length) {
      pendingCounts = pendingCounts.filter(function (node) {
        if (pastFold(node)) { countUp(node); return false; }
        return true;
      });
    }
  }

  function hookScroll() {
    if (scrollHooked) return;
    scrollHooked = true;
    var ticking = false;
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        sweepPending();
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    document.addEventListener('visibilitychange', sweepPending);
  }

  function observeReveal(scope) {
    var nodes = Array.prototype.slice.call(
      (scope || document).querySelectorAll('[data-reveal]:not(.is-in)')
    );
    if (!nodes.length) return;

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) {
      nodes.forEach(revealNow);
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        revealNow(entry.target);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });

    nodes.forEach(function (node, index) {
      if (!node.style.getPropertyValue('--reveal-delay')) {
        var group = node.closest('[data-reveal-group]');
        if (group) node.style.setProperty('--reveal-delay', (index % 8) * 70 + 'ms');
      }
      if (inViewport(node, 0.98)) {
        // already on screen: animate in on the next frame, no observer needed
        window.requestAnimationFrame(function () { revealNow(node); });
        return;
      }
      pending.push(node);
      observer.observe(node);
    });

    hookScroll();
  }

  function countUp(node) {
    var target = parseFloat(node.getAttribute('data-count'));
    if (isNaN(target)) return;
    var suffix = node.getAttribute('data-count-suffix') || '';
    var format = function (value) {
      return (target % 1 === 0 ? Math.round(value) : value.toFixed(1)) + suffix;
    };
    var settle = function () { node.textContent = format(target); };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { settle(); return; }

    var duration = 1300;
    var start = null;
    var done = false;
    function step(stamp) {
      if (done) return;
      if (!start) start = stamp;
      var progress = Math.min((stamp - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = format(target * eased);
      if (progress < 1) requestAnimationFrame(step);
      else done = true;
    }
    requestAnimationFrame(step);
    // if rAF is throttled (background tab, reduced power) land on the real number anyway
    window.setTimeout(function () { if (!done) { done = true; settle(); } }, duration + 400);
  }

  function observeCounters() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
    if (!nodes.length) return;
    nodes.forEach(function (node) {
      if (pastFold(node)) {
        window.requestAnimationFrame(function () { countUp(node); });
      } else {
        pendingCounts.push(node);
      }
    });
    hookScroll();
  }

  /* ---------------------------------------------------------- chrome */
  /* The real Meridian logo, as layered masks (see .brand-mark in components.css). */
  function markMarkup() {
    return '<span class="brand-mark" aria-hidden="true">' +
        '<i class="bm-book-dark"></i><i class="bm-book-light"></i>' +
        '<span class="brand-star"><i class="bm-star-dark"></i><i class="bm-star-light"></i></span>' +
      '</span>';
  }

  function logoMarkup() {
    return markMarkup() + '<span class="brand-word" role="img" aria-label="Meridian"></span>';
  }

  function brandMarkup(stacked) {
    return '<a class="logo' + (stacked ? ' logo-stacked' : '') + '" href="/" aria-label="Meridian — home">' +
      logoMarkup() + '</a>';
  }

  var ABOUT_LINKS = [
    { href: '/about', key: 'nav.overview', note: 'about.title', ico: 'compass' },
    { href: '/about/leadership', key: 'nav.leadership', note: 'nav.leadership.note', ico: 'users' },
    { href: '/about/offerings', key: 'nav.offerings', note: 'nav.offerings.note', ico: 'layers' },
    { href: '/about/global-teachers', key: 'nav.globalTeachers', note: 'nav.globalTeachers.note', ico: 'globe' },
    { href: '/about/research', key: 'nav.research', note: 'nav.research.note', ico: 'trending' },
    { href: '/about/faq', key: 'nav.faq', note: 'nav.faq.note', ico: 'info' },
    { href: '/engage', key: 'nav.engage', note: 'nav.engage.note', ico: 'message' }
  ];

  var MENTOR_LINKS = [
    { href: '/teachers', key: 'nav.teachers', note: 'nav.teachers.note', ico: 'users' },
    { href: '/prep', key: 'nav.prep', note: 'nav.prep.note', ico: 'book' }
  ];

  var LANG_SHORT = { en: 'EN', ka: 'ქარ', ar: 'عربي' };
  var LANG_NAME = { en: 'English', ka: 'ქართული', ar: 'العربية' };

  function langPickMarkup() {
    return '<div class="lang-pick">' +
      '<button type="button" class="lang-btn" aria-haspopup="true" aria-expanded="false" aria-label="Language">' +
        icon('globe', 17) + '<span data-lang-current>' + LANG_SHORT[state.lang] + '</span>' +
        '<span class="caret">' + icon('chevronDown', 14) + '</span></button>' +
      '<div class="lang-menu" role="menu">' +
        LANGS.map(function (code) {
          return '<button type="button" role="menuitemradio" data-lang-btn="' + code + '" lang="' + code + '" aria-pressed="' +
            (state.lang === code) + '">' + LANG_NAME[code] + '</button>';
        }).join('') +
      '</div></div>';
  }

  function navMarkup(page) {
    var active = function (name) { return page === name ? ' is-active' : ''; };
    var aboutItems = ABOUT_LINKS.map(function (link) {
      return '<a href="' + link.href + '">' + icon(link.ico, 17) +
        '<span>' + t(link.key) + '<span class="menu-note">' + t(link.note) + '</span></span></a>';
    }).join('');
    var mentorItems = MENTOR_LINKS.map(function (link) {
      return '<a href="' + link.href + '">' + icon(link.ico, 17) +
        '<span>' + t(link.key) + '<span class="menu-note">' + t(link.note) + '</span></span></a>';
    }).join('');

    return '' +
      '<nav class="site-nav" id="siteNav" aria-label="Main">' +
        '<div class="container-wide nav-inner">' +
          brandMarkup() +
          '<ul class="nav-links">' +
            '<li><a class="nav-link' + active('home') + '" href="/">' + t('nav.home') + '</a></li>' +
            '<li><a class="nav-link' + active('programs') + '" href="/programs">' + t('nav.programs') + '</a></li>' +
            '<li><a class="nav-link' + active('universities') + '" href="/universities">' + t('nav.universities') + '</a></li>' +
            '<li class="has-menu">' +
              '<a class="nav-link' + (page === 'teachers' || page === 'prep' ? ' is-active' : '') + '" href="/teachers">' + t('nav.mentorship') +
                '<span class="caret">' + icon('chevronDown', 14) + '</span></a>' +
              '<div class="nav-menu">' + mentorItems + '</div>' +
            '</li>' +
            '<li><a class="nav-link' + active('counselling') + '" href="/counselling">' + t('nav.counselling') + '</a></li>' +
            '<li><a class="nav-link' + active('pricing') + '" href="/pricing">' + t('nav.pricing') + '</a></li>' +
            '<li class="has-menu">' +
              '<a class="nav-link' + (page === 'about' || page === 'engage' ? ' is-active' : '') + '" href="/about">' + t('nav.about') +
                '<span class="caret">' + icon('chevronDown', 14) + '</span></a>' +
              '<div class="nav-menu">' + aboutItems + '</div>' +
            '</li>' +
          '</ul>' +
          '<div class="nav-actions">' +
            langPickMarkup() +
            '<button type="button" class="theme-toggle" data-theme-toggle ' +
              'data-i18n-label="nav.theme" aria-label="' + t('nav.theme') + '">' +
              '<span class="ico-sun">' + icon('sun', 22) + '</span>' +
              '<span class="ico-moon">' + icon('moon', 22) + '</span>' +
            '</button>' +
            '<span class="nav-auth desk-only" id="navAuth"></span>' +
            '<button type="button" class="nav-toggle" id="navToggle" aria-expanded="false" ' +
              'aria-controls="navDrawer" aria-label="' + t('nav.menu') + '">' + icon('menu', 21) + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="nav-drawer" id="navDrawer">' +
          '<a href="/">' + t('nav.home') + '</a>' +
          '<a href="/programs">' + t('nav.programs') + '</a>' +
          '<a href="/universities">' + t('nav.universities') + '</a>' +
          '<a href="/teachers">' + t('nav.teachers') + '</a>' +
          '<a href="/counselling">' + t('nav.counselling') + '</a>' +
          '<a href="/prep">' + t('nav.prep') + '</a>' +
          '<a href="/pricing">' + t('nav.pricing') + '</a>' +
          '<a href="/about">' + t('nav.about') + '</a>' +
          '<div class="drawer-sub">' +
            ABOUT_LINKS.slice(1).map(function (l) {
              return '<a href="' + l.href + '">' + t(l.key) + '</a>';
            }).join('') +
          '</div>' +
          '<div class="drawer-lang">' +
            '<span class="label">' + t('teachers.filter.language') + '</span>' +
            '<span class="seg" role="group" aria-label="Language">' +
              '<button type="button" data-lang-btn="en" aria-pressed="' + (state.lang === 'en') + '">EN</button>' +
              '<button type="button" data-lang-btn="ka" aria-pressed="' + (state.lang === 'ka') + '">ქარ</button>' +
              '<button type="button" data-lang-btn="ar" aria-pressed="' + (state.lang === 'ar') + '" lang="ar">عربي</button>' +
            '</span>' +
          '</div>' +
          '<div class="drawer-actions" id="drawerAuth"></div>' +
        '</div>' +
      '</nav>';
  }

  /* Show the full link row only when it really fits (labels are much longer in
     Georgian and Arabic); otherwise fall back to the menu button. */
  function fitNav() {
    var nav = document.getElementById('siteNav');
    if (!nav) return;
    var inner = nav.querySelector('.nav-inner');
    var over = function () { return inner.scrollWidth > inner.clientWidth + 1; };
    nav.classList.remove('nav-collapsed', 'nav-tight');
    if (window.innerWidth < 900) { nav.classList.add('nav-collapsed'); return; }
    if (over()) nav.classList.add('nav-tight');
    if (over()) nav.classList.add('nav-collapsed');
  }
  var fitQueued = false;
  window.addEventListener('resize', function () {
    if (fitQueued) return;
    fitQueued = true;
    window.requestAnimationFrame(function () { fitQueued = false; fitNav(); });
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitNav);

  function authMarkup(user) {
    if (!user) {
      return '<a class="btn btn-ghost btn-sm" href="/login">' + t('nav.login') + '</a>' +
        '<a class="btn btn-primary btn-sm" href="/login?mode=register">' + t('nav.join') + '</a>';
    }
    var tutorLink = user.tutor && user.tutor.status === 'approved'
      ? '<a class="btn btn-ghost btn-sm" href="/tutor" title="' + t('nav.tutorDashboard') + '" aria-label="' + t('nav.tutorDashboard') + '">' + icon('dashboard', 16) + t('nav.tutorDashboard') + '</a>'
      : '';
    return tutorLink + '<a class="btn btn-ghost btn-sm" href="/account">' +
      '<span class="avatar avatar-sm">' + esc(user.initials) + '</span>' + esc(user.first_name) + '</a>' +
      '<button type="button" class="btn btn-outline btn-sm" data-logout>' + t('nav.logout') + '</button>';
  }

  function paintAuth() {
    var user = state.user;
    var slot = document.getElementById('navAuth');
    if (slot) slot.innerHTML = authMarkup(user);
    var drawer = document.getElementById('drawerAuth');
    if (drawer) drawer.innerHTML = authMarkup(user);
    document.querySelectorAll('[data-logout]').forEach(function (button) {
      button.addEventListener('click', function () {
        api('/api/auth/logout', { method: 'POST' }).then(function () {
          state.user = null;
          state.saved = [];
          toast(t('auth.loggedOut'), 'info');
          window.location.href = '/';
        });
      });
    });
    document.querySelectorAll('[data-when-auth]').forEach(function (node) {
      var want = node.getAttribute('data-when-auth');
      var show = want === 'in' ? !!user : !user;
      node.hidden = !show;
    });
    fitNav();
  }

  function footerMarkup() {
    var columns = [
      { title: 'footer.explore', links: [
        ['/programs', 'nav.programs'], ['/teachers', 'nav.teachers'],
        ['/pricing', 'nav.pricing'], ['/about/offerings', 'footer.database']
      ] },
      { title: 'footer.company', links: [
        ['/about', 'nav.about'], ['/about/leadership', 'nav.leadership'],
        ['/tutors/apply', 'footer.becomeTutor'], ['/engage', 'footer.careers']
      ] },
      { title: 'footer.resources', links: [
        ['/teachers?subject=sat', 'footer.testPrep'], ['/teachers?subject=us-admissions', 'footer.counselling'],
        ['/teachers', 'footer.tutoring'], ['/about/global-teachers', 'nav.globalTeachers']
      ] },
      { title: 'footer.legal', links: [
        ['/about/faq', 'footer.privacy'], ['/about/faq', 'footer.terms'], ['/engage', 'footer.contact']
      ] }
    ];

    var socials = [
      ['https://www.instagram.com', 'instagram', 'Instagram'],
      ['https://www.linkedin.com', 'linkedin', 'LinkedIn'],
      ['https://www.facebook.com', 'facebook', 'Facebook'],
      ['https://www.tiktok.com', 'tiktok', 'TikTok'],
      ['https://www.youtube.com', 'youtube', 'YouTube']
    ];

    return '' +
      '<footer class="site-footer">' +
        '<div class="container">' +
          '<div class="footer-grid">' +
            '<div class="footer-col footer-brand">' +
              brandMarkup(true) +
              '<p>' + t('footer.tagline') + '</p>' +
              '<div class="footer-social">' +
                socials.map(function (s) {
                  return '<a href="' + s[0] + '" target="_blank" rel="noopener noreferrer" aria-label="' + s[2] + '">' +
                    icon(s[1], 18) + '</a>';
                }).join('') +
              '</div>' +
              '<p style="margin-top:1.25rem;font-size:.82rem;">' +
                '<span class="badge badge-accent">' + t('footer.soon') + '</span> ' + t('footer.ai') +
              '</p>' +
            '</div>' +
            columns.map(function (col) {
              return '<div class="footer-col"><h4>' + t(col.title) + '</h4><ul>' +
                col.links.map(function (link) {
                  return '<li><a href="' + link[0] + '">' + t(link[1]) + '</a></li>';
                }).join('') + '</ul></div>';
            }).join('') +
          '</div>' +
          '<div class="footer-wordmark" aria-hidden="true"></div>' +
          '<div class="footer-bottom">' +
            '<span>© ' + new Date().getFullYear() + ' Meridian. ' + t('footer.rights') + '</span>' +
            '<nav><a href="mailto:hello@meridian.ge">hello@meridian.ge</a>' +
            '<span>' + t('footer.built') + '</span></nav>' +
          '</div>' +
        '</div>' +
      '</footer>';
  }

  /* A slow drift of light behind every page — never a dead background */
  function mountAmbient() {
    if (document.querySelector('.ambient')) return;
    var layer = document.createElement('div');
    layer.className = 'ambient';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = '<i class="am-a"></i><i class="am-b"></i><i class="am-c"></i><i class="am-grid"></i>' +
      '<i class="am-beam"></i><i class="am-beam am-beam-2"></i>' +
      // slow meridian lines flowing across the page
      '<svg class="am-lines" viewBox="0 0 1600 1000" preserveAspectRatio="none">' +
        '<path pathLength="100" d="M-50 820 C 400 620, 900 700, 1650 380" />' +
        '<path pathLength="100" d="M-50 300 C 500 420, 1000 160, 1650 260" />' +
        '<path pathLength="100" d="M-50 560 C 380 470, 1150 620, 1650 520" />' +
      '</svg>';
    document.body.insertBefore(layer, document.body.firstChild);
  }

  function mountChrome() {
    mountAmbient();
    var page = document.body.getAttribute('data-page') || '';
    var navRoot = document.getElementById('nav-root');
    if (navRoot) navRoot.outerHTML = navMarkup(page);
    try {
      if (!sessionStorage.getItem('meridian.brand') && !document.documentElement.classList.contains('has-intro')) {
        var navLogo = document.querySelector('.site-nav .logo');
        if (navLogo) navLogo.classList.add('brand-enter');
      }
      sessionStorage.setItem('meridian.brand', '1');
    } catch (e) {}
    var footRoot = document.getElementById('footer-root');
    if (footRoot) footRoot.outerHTML = footerMarkup();

    var nav = document.getElementById('siteNav');
    var drawer = document.getElementById('navDrawer');
    var toggle = document.getElementById('navToggle');

    if (toggle && drawer) {
      toggle.addEventListener('click', function () {
        var open = drawer.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(open));
        toggle.innerHTML = icon(open ? 'x' : 'menu', 21);
      });
      drawer.addEventListener('click', function (event) {
        if (event.target.tagName === 'A') {
          drawer.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.innerHTML = icon('menu', 21);
        }
      });
    }

    var onScroll = function () {
      var live = document.getElementById('siteNav');
      if (live) live.classList.toggle('is-stuck', window.scrollY > 12);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    document.querySelectorAll('[data-theme-toggle]').forEach(function (node) {
      node.addEventListener('click', toggleTheme);
    });
    document.querySelectorAll('[data-lang-btn]').forEach(function (node) {
      node.addEventListener('click', function () {
        applyLang(node.getAttribute('data-lang-btn'));
      });
    });
  }

  /* ---------------------------------------------------------- accordion */
  function bindAccordions(scope) {
    (scope || document).querySelectorAll('.accordion-trigger').forEach(function (trigger) {
      if (trigger.dataset.bound) return;
      trigger.dataset.bound = '1';
      trigger.addEventListener('click', function () {
        var item = trigger.closest('.accordion-item');
        var open = item.classList.toggle('is-open');
        trigger.setAttribute('aria-expanded', String(open));
      });
    });
  }

  /* ---------------------------------------------------------- boot */
  function boot() {
    document.documentElement.setAttribute('lang', state.lang);
    mountChrome();
    applyLang(state.lang);
    applyTheme(state.theme, false);
    observeReveal();
    observeCounters();
    bindAccordions();
    // language dropdown: one listener for every copy of it (the nav is re-mounted on language change)
    document.addEventListener('click', function (event) {
      var button = event.target.closest && event.target.closest('.lang-btn');
      document.querySelectorAll('.lang-pick.is-open').forEach(function (pick) {
        if (!button || pick !== button.parentNode) pick.classList.remove('is-open');
      });
      if (button) {
        var open = button.parentNode.classList.toggle('is-open');
        button.setAttribute('aria-expanded', String(open));
      }
    });
    loadUser().then(paintAuth);
    watchSelects();
    // Meridian AI: the chat button on every page (loaded after the page itself)
    if (!document.querySelector('script[src^="/js/ai.js"]') && document.body.getAttribute('data-page') !== 'admin') {
      var ai = document.createElement('script');
      ai.src = '/js/ai.js?v=r7';
      ai.defer = true;
      document.body.appendChild(ai);
    }
    window.addEventListener('meridian:lang', function () {
      var page = document.body.getAttribute('data-page') || '';
      var nav = document.getElementById('siteNav');
      var footer = document.querySelector('.site-footer');
      if (nav) {
        var wrapper = document.createElement('div');
        wrapper.innerHTML = navMarkup(page);
        nav.replaceWith(wrapper.firstElementChild);
      }
      if (footer) {
        var wrap2 = document.createElement('div');
        wrap2.innerHTML = footerMarkup();
        footer.replaceWith(wrap2.firstElementChild);
      }
      rebind();
      paintAuth();
    });
  }

  function rebind() {
    var nav = document.getElementById('siteNav');
    var drawer = document.getElementById('navDrawer');
    var toggle = document.getElementById('navToggle');
    if (toggle && drawer) {
      toggle.addEventListener('click', function () {
        var open = drawer.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(open));
        toggle.innerHTML = icon(open ? 'x' : 'menu', 21);
      });
    }
    if (nav) nav.classList.toggle('is-stuck', window.scrollY > 12);
    fitNav();
    document.querySelectorAll('[data-theme-toggle]').forEach(function (node) {
      node.addEventListener('click', toggleTheme);
    });
    document.querySelectorAll('[data-lang-btn]').forEach(function (node) {
      node.addEventListener('click', function () { applyLang(node.getAttribute('data-lang-btn')); });
    });
  }

  /* ---------------------------------------------------------- collapsible cards */
  /* Adds a fold button to the top-right of a card's header row; everything below
     the header hides. The choice is remembered per card. */
  var FOLD_KEY = 'meridian.folded';
  function folded() {
    try { return JSON.parse(localStorage.getItem(FOLD_KEY) || '{}'); } catch (e) { return {}; }
  }
  function collapsible(card, key) {
    var head = card && card.firstElementChild;
    if (!head || head.querySelector('.fold-btn')) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'fold-btn';
    var set = function (shut) {
      card.classList.toggle('is-folded', shut);
      button.setAttribute('aria-expanded', String(!shut));
      button.setAttribute('aria-label', t(shut ? 'common.expand' : 'common.collapse'));
      button.title = t(shut ? 'common.expand' : 'common.collapse');
      button.innerHTML = icon('chevronDown', 18);
    };
    button.addEventListener('click', function () {
      var shut = !card.classList.contains('is-folded');
      set(shut);
      var state = folded();
      if (shut) state[key] = 1; else delete state[key];
      try { localStorage.setItem(FOLD_KEY, JSON.stringify(state)); } catch (e) {}
    });
    head.appendChild(button);
    head.classList.add('fold-head');
    set(!!folded()[key]);
  }

  /* ---------------------------------------------------------- fields of study */
  /* The "major" filter. Round-6 records name their fields; older ones are read
     from their text. 'any' = open to every subject. */
  var FIELDS = {
    any: { en: 'Any field', ka: 'ნებისმიერი სფერო', ar: 'أي تخصص' },
    business: { en: 'Business & management', ka: 'ბიზნესი და მენეჯმენტი', ar: 'الأعمال والإدارة' },
    economics: { en: 'Economics & finance', ka: 'ეკონომიკა და ფინანსები', ar: 'الاقتصاد والمالية' },
    'computer-science': { en: 'Computer science & AI', ka: 'კომპიუტერული მეცნიერება და AI', ar: 'علوم الحاسوب والذكاء الاصطناعي' },
    engineering: { en: 'Engineering', ka: 'ინჟინერია', ar: 'الهندسة' },
    mathematics: { en: 'Mathematics', ka: 'მათემატიკა', ar: 'الرياضيات' },
    'natural-sciences': { en: 'Natural sciences', ka: 'საბუნებისმეტყველო მეცნიერებები', ar: 'العلوم الطبيعية' },
    'medicine-health': { en: 'Medicine & health', ka: 'მედიცინა და ჯანდაცვა', ar: 'الطب والصحة' },
    law: { en: 'Law', ka: 'სამართალი', ar: 'القانون' },
    'international-relations': { en: 'International relations & policy', ka: 'საერთაშორისო ურთიერთობები', ar: 'العلاقات الدولية والسياسات' },
    'social-sciences': { en: 'Social sciences & psychology', ka: 'სოციალური მეცნიერებები და ფსიქოლოგია', ar: 'العلوم الاجتماعية وعلم النفس' },
    humanities: { en: 'Humanities & writing', ka: 'ჰუმანიტარული მეცნიერებები', ar: 'العلوم الإنسانية والكتابة' },
    'arts-design': { en: 'Arts, design & media', ka: 'ხელოვნება, დიზაინი და მედია', ar: 'الفنون والتصميم والإعلام' },
    education: { en: 'Education', ka: 'განათლება', ar: 'التعليم' },
    environment: { en: 'Environment & climate', ka: 'გარემო და კლიმატი', ar: 'البيئة والمناخ' },
    languages: { en: 'Languages', ka: 'ენები', ar: 'اللغات' }
  };
  var FIELD_WORDS = [
    ['computer-science', /comput|coding|\bcode|programm|software|hackathon|\bai\b|artificial intel|data scien|informatic|cyber|machine learning/],
    ['engineering', /engineer|robot|aerospace|space|mechanic|electric|civil eng|architecture/],
    ['medicine-health', /medic|health|biomed|pharma|nursing|dental|clinical|public health/],
    ['natural-sciences', /physic|chemi|biolog|scien|astronom|genetic|research|\bstem\b/],
    ['mathematics', /\bmath|statistic/],
    ['business', /business|entrepreneur|startup|management|marketing|\bmba\b|case competition|leadership/],
    ['economics', /econom|financ|banking|account/],
    ['law', /\blaw\b|legal|moot|human rights/],
    ['international-relations', /diplom|international relation|model united nations|\bmun\b|global affairs|public policy|\bpolicy|united nations|model eu/],
    ['social-sciences', /psycholog|sociolog|politic|social scien|anthropolog|social work/],
    ['humanities', /histor|philosoph|literat|essay|writing|journalism|religio/],
    ['arts-design', /\bart\b|\barts\b|design|film|music|photograph|creative|media|theatre|fashion/],
    ['education', /teach|education|pedagog|youth work/],
    ['environment', /climate|environment|sustainab|green|renewable|ocean|ecolog|conservation/],
    ['languages', /language|linguist|translation|\benglish\b|german|french|spanish|chinese|japanese/]
  ];
  function fieldsOf(record, text) {
    if (record && record.fields && record.fields.length) return record.fields;
    if (record && record._fields) return record._fields;
    var hay = String(text || '').toLowerCase();
    var found = FIELD_WORDS.filter(function (row) { return row[1].test(hay); }).map(function (row) { return row[0]; });
    if (record) record._fields = found;
    return found;
  }

  /* ---------------------------------------------------------- searchable select */
  /* A searchable dropdown on top of a native <select> (long country lists): type
     "qa", "Qatar", "კატარი" or "قطر". The <select> stays the source of truth: picking
     an option sets its value and fires its change event. Call again after the
     options are re-rendered; `extra` maps option value -> more words to match. */
  function fold(text) {
    return String(text || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
  }

  function searchSelect(node, extra) {
    if (!node) return;
    var wrap = node.parentNode && node.parentNode.classList.contains('ss-wrap') ? node.parentNode : null;
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'ss-wrap';
      node.parentNode.insertBefore(wrap, node);
      wrap.appendChild(node);
      node.classList.add('ss-native');
      node.tabIndex = -1;
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'select ss-button';
      button.setAttribute('aria-haspopup', 'listbox');
      var panel = document.createElement('div');
      panel.className = 'ss-panel';
      panel.innerHTML = '<input type="search" class="input ss-search" autocomplete="off" spellcheck="false" />' +
        '<div class="ss-list" role="listbox"></div>';
      wrap.appendChild(button);
      wrap.appendChild(panel);
      var input = panel.querySelector('.ss-search');
      var list = panel.querySelector('.ss-list');
      var active = 0;

      var options = function () {
        var q = fold(input.value).trim();
        return Array.prototype.slice.call(node.options).filter(function (opt) {
          if (!q) return true;
          var hay = fold(opt.textContent + ' ' + opt.value + ' ' + ((wrap._extra || {})[opt.value] || ''));
          return q.split(/\s+/).every(function (word) { return hay.indexOf(word) !== -1; });
        });
      };
      var paint = function () {
        var shown = options();
        active = Math.max(0, Math.min(active, shown.length - 1));
        list.innerHTML = shown.length ? shown.map(function (opt, i) {
          return '<button type="button" role="option" data-v="' + esc(opt.value) + '" class="ss-opt' +
            (i === active ? ' is-active' : '') + '" aria-selected="' + (opt.value === node.value) + '">' +
            esc(opt.textContent) + '</button>';
        }).join('') : '<p class="ss-empty">—</p>';
      };
      var choose = function (value) {
        close();
        if (value === node.value) return;
        node.value = value;
        wrap._sync();
        node.dispatchEvent(new Event('change', { bubbles: true }));
      };
      var open = function () {
        document.querySelectorAll('.ss-wrap.is-open').forEach(function (other) {
          if (other !== wrap) other.classList.remove('is-open');
        });
        // short lists (Funding, Type…) need no search box, only the options
        wrap.classList.toggle('ss-short', node.options.length <= 9);
        wrap.classList.add('is-open');
        button.setAttribute('aria-expanded', 'true');
        input.value = '';
        input.placeholder = t('common.typeToSearch');
        active = Math.max(0, node.selectedIndex);
        paint();
        input.focus();
        var current = list.querySelector('.is-active');
        if (current) current.scrollIntoView({ block: 'nearest' });
      };
      var close = function () {
        wrap.classList.remove('is-open');
        button.setAttribute('aria-expanded', 'false');
      };
      button.addEventListener('click', function () { if (wrap.classList.contains('is-open')) close(); else open(); });
      input.addEventListener('input', function () { active = 0; paint(); });
      input.addEventListener('keydown', function (event) {
        var shown = options();
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          active = (active + (event.key === 'ArrowDown' ? 1 : -1) + shown.length) % Math.max(shown.length, 1);
          paint();
          var current = list.querySelector('.is-active');
          if (current) current.scrollIntoView({ block: 'nearest' });
        } else if (event.key === 'Enter') {
          event.preventDefault();
          if (shown[active]) choose(shown[active].value);
        } else if (event.key === 'Escape') {
          close();
          button.focus();
        }
      });
      list.addEventListener('mousedown', function (event) { event.preventDefault(); });
      list.addEventListener('click', function (event) {
        var opt = event.target.closest('[data-v]');
        if (opt) choose(opt.getAttribute('data-v'));
      });
      document.addEventListener('click', function (event) {
        if (!wrap.contains(event.target)) close();
      });
      wrap._sync = function () {
        var opt = node.options[node.selectedIndex];
        button.textContent = opt ? opt.textContent : '';
        button.classList.toggle('is-set', node.selectedIndex > 0);
        button.disabled = node.disabled;
      };
      // pages re-render the options or set .value directly: follow both
      new MutationObserver(function () { wrap._sync(); }).observe(node, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
      var proto = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
      Object.defineProperty(node, 'value', {
        configurable: true,
        get: function () { return proto.get.call(node); },
        set: function (v) { proto.set.call(node, v); wrap._sync(); }
      });
      node.addEventListener('change', function () { wrap._sync(); });
      if (node.id) { button.id = node.id + 'Btn'; }
      if (node.getAttribute('aria-label')) button.setAttribute('aria-label', node.getAttribute('aria-label'));
      var label = wrap.closest('label');
      if (label) label.addEventListener('click', function (event) {
        // the <label> would forward clicks to the hidden <select>
        if (event.target === label || event.target.tagName === 'SPAN') { event.preventDefault(); button.focus(); }
      });
    }
    wrap._extra = extra || wrap._extra || {};
    wrap._sync();
  }

  /* Every plain <select class="select"> becomes the site-styled dropdown: the
     browser's own option list is grey/white and ignores the site colours. */
  function niceSelects(root) {
    if (!root || !root.querySelectorAll) return;
    var found = root.matches && root.matches('select.select') ? [root] : root.querySelectorAll('select.select');
    Array.prototype.forEach.call(found, function (node) {
      if (node.hasAttribute('data-native') || node.multiple || node.classList.contains('ss-native')) return;
      searchSelect(node);
    });
  }
  // sliders show their filled part in the brand colour (CSS reads --fill)
  function fillRange(range) {
    var min = Number(range.min || 0), max = Number(range.max || 100);
    range.style.setProperty('--fill', ((Number(range.value) - min) / ((max - min) || 1) * 100) + '%');
  }
  function watchSelects() {
    niceSelects(document);
    document.querySelectorAll('input[type="range"]').forEach(fillRange);
    document.addEventListener('input', function (event) {
      if (event.target.type === 'range') fillRange(event.target);
    });
    new MutationObserver(function (records) {
      records.forEach(function (record) {
        Array.prototype.forEach.call(record.addedNodes, function (added) {
          if (added.nodeType === 1 && (added.tagName === 'SELECT' || added.querySelector('select.select'))) niceSelects(added);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  /* Activity for the weekly report: what was opened, clicked, searched. */
  function track(kind, item, meta) {
    try {
      var payload = JSON.stringify({ kind: kind, item: item || null, meta: meta || {} });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/events', new Blob([payload], { type: 'application/json' }));
      } else {
        fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true });
      }
    } catch (e) {}
  }

  window.M = {
    t: t, pick: pick, esc: esc, icon: icon, api: api, toast: toast, track: track, searchSelect: searchSelect, collapsible: collapsible, FIELDS: FIELDS, fieldsOf: fieldsOf,
    state: state, loadUser: loadUser, paintAuth: paintAuth,
    formatDate: formatDate, daysUntil: daysUntil, parseDate: parseDate, iso: iso,
    months: MONTHS, dow: DOW,
    observeReveal: observeReveal, bindAccordions: bindAccordions,
    translate: translate, applyLang: applyLang, applyTheme: applyTheme,
    logoMarkup: logoMarkup, markMarkup: markMarkup, brandMarkup: brandMarkup,
    avatar: function (person, size) {
      if (person && person.photo) {
        return '<span class="avatar avatar-photo ' + (size || '') + '"><img src="' + esc(person.photo) +
          '" alt="" loading="lazy" decoding="async" /></span>';
      }
      return '<span class="avatar ' + (size || '') + '">' + esc((person && person.initials) || '?') + '</span>';
    },
    money: function (amount) {
      var value = Number(amount || 0);
      var text = value % 1 === 0 ? String(value) : value.toFixed(2);
      return '<span class="cur">$</span>' + text;
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
