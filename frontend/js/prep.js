/* ============================================================
   Meridian — Prep materials
   One tab per exam: how it works, when to sit it, what it costs,
   and the best official and free resources to study with.
   ============================================================ */
(function () {
  'use strict';

  var exams = [];
  var current = null;

  var KIND_ORDER = ['official', 'practice-test', 'course', 'video', 'app', 'book'];
  var KIND_ICON = { official: 'shield', 'practice-test': 'checkCircle', course: 'book', video: 'play', app: 'zap', book: 'bookmark' };

  function P(v) { return M.pick(v); }

  function paintTabs() {
    var host = document.getElementById('prepTabs');
    host.innerHTML = exams.map(function (e) {
      return '<button type="button" role="tab" data-exam="' + M.esc(e.id) + '" aria-selected="' + (current && current.id === e.id) + '">' +
        M.esc(e.name) + '</button>';
    }).join('');
    host.querySelectorAll('[data-exam]').forEach(function (b) {
      b.addEventListener('click', function () { show(b.getAttribute('data-exam'), true); });
    });
  }

  function resource(r) {
    var kind = r.kind || 'official';
    return '<a href="' + M.esc(r.url) + '" target="_blank" rel="noopener noreferrer">' +
      '<span class="ico">' + M.icon(KIND_ICON[kind] || 'external', 17) + '</span>' +
      '<b>' + M.esc(P(r.title)) + '</b>' +
      '<small>' + M.esc(r.provider || '') + (r.free ? ' · <span class="free">' + M.t('prep.free') + '</span>' : '') +
        (P(r.note) ? ' — ' + M.esc(P(r.note)) : '') + '</small>' +
    '</a>';
  }

  function paintBody() {
    var host = document.getElementById('prepBody');
    var e = current;
    if (!e) {
      host.innerHTML = '<div class="empty-state">' + M.icon('book', 42) + '<p>' + M.t('prep.soon') + '</p></div>';
      return;
    }
    var groups = {};
    (e.resources || []).forEach(function (r) { (groups[r.kind || 'official'] = groups[r.kind || 'official'] || []).push(r); });
    var kinds = KIND_ORDER.concat(Object.keys(groups).filter(function (k) { return KIND_ORDER.indexOf(k) === -1; }))
      .filter(function (k) { return groups[k]; });
    var facts = [
      ['prep.format', P(e.format)], ['prep.dates', P(e.dates)], ['prep.cost', P(e.cost)]
    ].filter(function (f) { return f[1]; });
    host.innerHTML =
      '<div class="prep-main">' +
        '<div class="prep-hero"><h2>' + M.esc(e.name) + '</h2>' +
          (e.by ? '<p class="by">' + M.esc(e.by) + '</p>' : '') +
          (P(e.what) ? '<p>' + M.esc(P(e.what)) + '</p>' : '') + '</div>' +
        kinds.map(function (k) {
          return '<section class="prep-group"><h3>' + M.t('prep.kind.' + k) + '</h3><div class="prep-res">' +
            groups[k].map(resource).join('') + '</div></section>';
        }).join('') +
      '</div>' +
      '<aside class="prep-facts">' +
        facts.map(function (f) { return '<div><dt>' + M.t(f[0]) + '</dt><dd>' + M.esc(f[1]) + '</dd></div>'; }).join('') +
        (e.register_url ? '<a class="btn btn-primary btn-block" href="' + M.esc(e.register_url) + '" target="_blank" rel="noopener noreferrer">' +
          M.t('prep.register') + M.icon('external', 15) + '</a>' : '') +
        '<button type="button" class="btn btn-outline btn-block" data-ask-ai="' + M.esc(M.t('prep.examAi').replace('{exam}', e.name)) + '">' +
          M.icon('sparkles', 16) + M.t('prep.askAi') + '</button>' +
        '<a class="btn btn-ghost btn-block" href="/teachers?q=' + encodeURIComponent(e.name) + '">' + M.t('prep.people.tutors') + '</a>' +
      '</aside>';
  }

  function show(id, push) {
    current = exams.filter(function (e) { return e.id === id; })[0] || exams[0] || null;
    paintTabs(); paintBody();
    if (push && current) {
      var url = new URL(window.location.href);
      url.searchParams.set('exam', current.id);
      window.history.replaceState({}, '', url);
    }
  }

  function init() {
    var ask = document.getElementById('prepAsk');
    var setAsk = function () { ask.setAttribute('data-ask-ai', M.t('prep.askAiPrompt')); };
    setAsk();
    M.api('/api/prep').then(function (res) {
      exams = (res.prep && res.prep.exams) || [];
      show(new URLSearchParams(window.location.search).get('exam') || (exams[0] && exams[0].id), false);
    }).catch(function () { M.toast(M.t('common.error'), 'error'); });
    window.addEventListener('meridian:lang', function () { setAsk(); if (current) { paintTabs(); paintBody(); } });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
