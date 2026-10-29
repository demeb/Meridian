/* ============================================================
   Meridian — home page
   ============================================================ */
(function () {
  'use strict';

  var programs = [];

  /* ---------------------------------------------------------- hero */
  var earth = null;

  function mountEarth() {
    var host = document.getElementById('heroEarth');
    if (!host || !window.MeridianEarth) return;
    earth = window.MeridianEarth(host, { mode: 'hero' });
    if (earth && programs.length) earth.setDestinations(destinations());
  }

  function destinations() {
    return programs.map(function (p) { return { lat: p.lat, lng: p.lon }; });
  }

  /* Split the headline into letters for the typed reveal. Each word stays
     unbreakable; screen readers get the plain sentence via aria-label. */
  function splitTitle() {
    var title = document.getElementById('heroTitle');
    if (!title) return;
    var index = 0;
    var plain = [];
    title.querySelectorAll('[data-split]').forEach(function (line) {
      var text = M.t(line.getAttribute('data-split'));
      plain.push(text);
      line.innerHTML = text.split(' ').map(function (word) {
        return '<span class="w">' + Array.prototype.map.call(word, function (ch) {
          return '<span class="ch" style="--i:' + (index++) + '">' + M.esc(ch) + '</span>';
        }).join('') + '</span>';
      }).join(' ');
      line.setAttribute('aria-hidden', 'true');
    });
    title.setAttribute('aria-label', plain.join(' '));
    tintAccent();
  }

  var ACCENT = {
    dark: ['#7cc4ff', '#b9e2ff', '#ffd76e'],
    light: ['#0071bc', '#1e90ff', '#29a9e0']
  };

  function mix(a, b, t) {
    var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    var r = Math.round(((pa >> 16) & 255) + ((((pb >> 16) & 255) - ((pa >> 16) & 255)) * t));
    var g = Math.round(((pa >> 8) & 255) + ((((pb >> 8) & 255) - ((pa >> 8) & 255)) * t));
    var bl = Math.round((pa & 255) + (((pb & 255) - (pa & 255)) * t));
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  }

  /* Colour each accent letter along the brand gradient */
  function tintAccent() {
    var stops = ACCENT[M.state.theme === 'light' ? 'light' : 'dark'];
    var chars = document.querySelectorAll('.hero2-accent .ch');
    var last = Math.max(chars.length - 1, 1);
    chars.forEach(function (ch, i) {
      var t = i / last;
      var color = t < 0.5 ? mix(stops[0], stops[1], t * 2) : mix(stops[1], stops[2], (t - 0.5) * 2);
      ch.style.setProperty('--c', color);
    });
  }

  /* ---------------------------------------------------------- content blocks */
  var JOURNEY = [
    { key: 1, icon: 'globe' },
    { key: 2, icon: 'book' },
    { key: 3, icon: 'file' },
    { key: 4, icon: 'cap' }
  ];

  function paintJourney() {
    var host = document.getElementById('journeyGrid');
    if (!host) return;
    host.innerHTML = JOURNEY.map(function (item) {
      return '<div class="journey-step" data-reveal>' +
        '<span class="journey-dot">' + M.icon(item.icon, 26) + '</span>' +
        '<h4>' + M.t('home.journey.' + item.key + '.title') + '</h4>' +
        '<p>' + M.t('home.journey.' + item.key + '.body') + '</p>' +
      '</div>';
    }).join('');
    M.observeReveal(host);
  }

  var PARTNERS = [
    ['UWC', 'globe'], ['Erasmus+', 'star'], ['FLEX Global', 'send'], ['Yale', 'cap'],
    ['LSE', 'building'], ['ETH Zürich', 'zap'], ['TU München', 'briefcase'],
    ['Sciences Po', 'book'], ['Gates Cambridge', 'award'], ['U of Toronto', 'shield'],
    ['Minerva', 'compass'], ['NYU Abu Dhabi', 'pin'], ['CMU Qatar', 'target'],
    ['Hult Prize', 'trending'], ['Chevening', 'sparkles'], ['Fulbright', 'users']
  ];

  function paintPartners() {
    var host = document.getElementById('partnerMarquee');
    if (!host) return;
    var items = PARTNERS.map(function (p) {
      return '<span class="marquee-item">' + M.icon(p[1], 19) + p[0] + '</span>';
    }).join('');
    host.innerHTML = '<div class="marquee-track">' + items + items + '</div>';
  }

  /* Cited findings from /api/research (the full set lives on /about/research) */
  var facts = [];

  function paintFacts() {
    var host = document.getElementById('factGrid');
    if (!host || !facts.length) return;
    host.innerHTML = facts.filter(function (f) { return f.home; }).map(function (fact) {
      return '<article class="fact" data-reveal>' +
        '<span class="fact-region">' + M.t('research.region.global') + ' · ' + M.esc(fact.year) + '</span>' +
        '<span class="fact-value">' + M.esc(fact.stat) + '</span>' +
        '<p class="fact-label">' + M.esc(M.pick(fact.label)) + '</p>' +
        '<p class="fact-claim">' + M.esc(M.pick(fact.detail)) + '</p>' +
        '<p class="fact-source">' + M.t('research.source') + ' <a href="' + M.esc(fact.url) +
          '" target="_blank" rel="noopener noreferrer">' + M.esc(fact.source) + '</a></p>' +
      '</article>';
    }).join('');
    M.observeReveal(host);
  }

  /* ---------------------------------------------------------- programmes */
  function deadlineBadge(program) {
    var days = M.daysUntil(program.deadline);
    if (days === null) return '';
    if (days < 0) return '<span class="badge">' + M.t('home.rail.closed') + '</span>';
    if (days === 0) return '<span class="badge badge-danger badge-dot">' + M.t('home.rail.today') + '</span>';
    var tone = days <= 30 ? 'badge-accent' : 'badge-success';
    return '<span class="badge ' + tone + ' badge-dot">' + days + ' ' + M.t('home.rail.days') + '</span>';
  }

  function programCard(program) {
    var locked = program.locked;
    var summary = locked
      ? M.t('common.unlock')
      : M.pick(program.summary).slice(0, 132) + '…';
    return '<article class="card card-hover card-lit program-card" data-reveal>' +
      '<div class="pc-top">' +
        '<span class="program-flag">' + program.flag + '</span>' +
        deadlineBadge(program) +
      '</div>' +
      '<h3>' + M.esc(M.pick(program.name)) + '</h3>' +
      '<p class="pc-desc">' + M.esc(summary) + '</p>' +
      '<div class="program-meta">' +
        '<span>' + M.icon('pin', 14) + M.esc(M.pick(program.country)) + '</span>' +
        '<span>' + M.icon('clock', 14) + M.esc(M.pick(program.duration)) + '</span>' +
      '</div>' +
      '<div class="pc-foot">' +
        '<span class="badge badge-brand">' + M.esc(program.org) + '</span>' +
        '<a class="btn-link" href="/programs?p=' + encodeURIComponent(program.id) + '">' +
          (locked ? M.icon('lock', 16) : '') + M.t('common.learnMore') +
          M.icon('arrowRight', 16) + '</a>' +
      '</div>' +
    '</article>';
  }

  function paintNewPrograms() {
    var host = document.getElementById('newPrograms');
    if (!host) return;
    var recent = programs.slice().sort(function (a, b) {
      return (b.opens || '') < (a.opens || '') ? -1 : 1;
    }).slice(0, 6);
    host.innerHTML = recent.map(programCard).join('');
    M.observeReveal(host);
  }

  /* ---------------------------------------------------------- boot */
  function paintAll() {
    paintJourney();
    paintPartners();
    paintFacts();
    paintNewPrograms();
  }

  function init() {
    splitTitle();
    mountEarth();

    var form = document.getElementById('heroSearch');
    if (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var value = document.getElementById('heroSearchInput').value.trim();
        window.location.href = '/programs' + (value ? '?q=' + encodeURIComponent(value) : '');
      });
    }

    M.api('/api/programs').then(function (data) {
      programs = data.programs || [];
      paintAll();
      if (earth) earth.setDestinations(destinations());
    }).catch(function () {
      M.toast(M.t('common.error'), 'error');
    });

    M.api('/api/research').then(function (data) {
      facts = (data.research && data.research.facts) || [];
      paintFacts();
    }).catch(function () {});

    window.addEventListener('meridian:lang', function () {
      paintAll();
      splitTitle();
    });
    window.addEventListener('meridian:theme', tintAccent);
    window.addEventListener('meridian:user', function () {
      M.api('/api/programs').then(function (data) {
        programs = data.programs || [];
        paintAll();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
