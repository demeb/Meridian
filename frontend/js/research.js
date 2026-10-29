/* ============================================================
   Meridian — /about/research
   Everything here comes from /api/research: cited facts from
   OECD, UNESCO, World Bank and Geostat, the competitor scan,
   the business model and the funding calendar.
   ============================================================ */
(function () {
  'use strict';

  var data = null;
  var live = null;
  var KIND_ICON = { accelerator: 'zap', competition: 'award', fund: 'trending', vc: 'trending', angel: 'users', grant: 'star' };

  function hostOf(url) {
    return String(url || '').replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
  }

  function sourceLink(url, label) {
    return '<a href="' + M.esc(url) + '" target="_blank" rel="noopener noreferrer">' + M.esc(label || hostOf(url)) + '</a>';
  }

  /* A fact card, shared with the home page via M.factCard */
  function factCard(fact) {
    return '<article class="fact" data-reveal>' +
      '<span class="fact-region">' + M.esc(fact.year) + '</span>' +
      '<span class="fact-value">' + M.esc(fact.stat) + '</span>' +
      '<p class="fact-label">' + M.esc(M.pick(fact.label)) + '</p>' +
      '<p class="fact-claim">' + M.esc(M.pick(fact.detail)) + '</p>' +
      '<p class="fact-source">' + M.t('research.source') + ' ' + sourceLink(fact.url, fact.source) +
        (fact.confidence === 'medium' ? ' <span class="fact-conf">' + M.t('research.medium') + '</span>' : '') + '</p>' +
    '</article>';
  }
  M.factCard = factCard;

  function paintLive() {
    var host = document.getElementById('liveStats');
    if (!host || !live) return;
    var items = [
      [live.programs, 'research.live.programs'],
      [live.countries, 'research.live.countries'],
      [live.scholarships, 'research.live.scholarships'],
      [live.universities, 'research.live.universities'],
      [data.facts.length, 'research.live.facts']
    ];
    host.innerHTML = items.map(function (item) {
      return '<div><span class="stat-value"><span data-count="' + item[0] + '">' + item[0] + '</span></span>' +
        '<span class="stat-label">' + M.t(item[1]) + '</span></div>';
    }).join('');
  }

  function paintFacts() {
    var host = document.getElementById('researchFacts');
    host.innerHTML = data.facts.map(factCard).join('');
    M.observeReveal(host);
  }

  function paintFit() {
    var byId = {};
    data.facts.forEach(function (f) { byId[f.id] = f; });
    var host = document.getElementById('fitList');
    host.innerHTML = data.solution.map(function (row, index) {
      var chips = (row.facts || []).map(function (id) {
        var f = byId[id];
        return f ? '<span class="fit-chip">' + M.esc(f.stat) + '</span>' : '';
      }).join('');
      return '<article class="fit-row" data-reveal>' +
        '<span class="fit-n">' + String(index + 1).padStart(2, '0') + '</span>' +
        '<div class="fit-problem"><span class="fit-tag">' + M.t('research.fit.problem') + '</span>' +
          '<p>' + M.esc(M.pick(row.problem)) + '</p><div class="fit-chips">' + chips + '</div></div>' +
        '<span class="fit-arrow" aria-hidden="true">' + M.icon('arrowRight', 20) + '</span>' +
        '<div class="fit-answer"><span class="fit-tag">' + M.t('research.fit.answer') + '</span>' +
          '<p>' + M.esc(M.pick(row.answer)) + '</p></div>' +
      '</article>';
    }).join('');
    M.observeReveal(host);
  }

  function paintFunding() {
    var dated = data.funding.slice().sort(function (a, b) {
      return (a.deadline || '9999') < (b.deadline || '9999') ? -1 : 1;
    });
    document.getElementById('fundList').innerHTML = dated.map(function (f) {
      var days = M.daysUntil(f.deadline);
      var badge = f.deadline && days !== null && days >= 0
        ? '<span class="badge ' + (days <= 30 ? 'badge-accent' : 'badge-success') + ' badge-dot">' + days + ' ' + M.t('home.rail.days') + '</span>'
        : '<span class="badge">' + M.t('programs.rolling') + '</span>';
      return '<article class="fund-row" data-reveal>' +
        '<span class="fund-ico">' + M.icon(KIND_ICON[f.kind] || 'star', 20) + '</span>' +
        '<div class="fund-main">' +
          '<div class="fund-top"><a href="' + M.esc(f.url) + '" target="_blank" rel="noopener noreferrer"><b>' + M.esc(f.name) + '</b></a>' +
            '<span class="fund-where">' + M.esc(f.where) + ' · ' + M.t('research.kind.' + f.kind) + '</span></div>' +
          '<p>' + M.esc(M.pick(f.offers)) + '</p>' +
          '<p class="fund-when">' + M.icon('calendar', 14) + ' ' + M.esc(M.pick(f.when)) +
            (f.verified ? '' : ' <span class="fact-conf">' + M.t('research.unverified') + '</span>') + '</p>' +
        '</div>' + badge +
      '</article>';
    }).join('');
    M.observeReveal(document.getElementById('fundList'));
  }

  function paintAll() {
    if (!data) return;
    paintLive();
    paintFacts();
    paintFit();
    paintFunding();
    document.getElementById('researchMethod').textContent = M.pick(data.method);
    M.observeReveal(document.getElementById('main'));
  }

  function init() {
    if (!document.getElementById('researchFacts')) return;
    M.api('/api/research').then(function (res) {
      data = res.research;
      live = res.live;
      paintAll();
    }).catch(function () { M.toast(M.t('common.error'), 'error'); });
    window.addEventListener('meridian:lang', paintAll);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
