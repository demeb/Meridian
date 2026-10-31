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

  /* Exams are grouped so the tab row stays short: pick a group, then the exam */
  var GROUPS = ['admissions', 'english', 'graduate', 'medicine-law', 'uk-subject', 'languages', 'school'];
  var GROUP_OF = { sat: 'admissions', act: 'admissions', 'naec-georgia': 'admissions', 'qu-placement': 'admissions',
    ielts: 'english', toefl: 'english', duolingo: 'english', pte: 'english', cambridge: 'english',
    gre: 'graduate', gmat: 'graduate', ap: 'school', ib: 'school' };
  var group = null;
  var view = { kind: 'all', free: false, q: '' };   // resource filters inside an exam

  function groupOf(e) { return e.group || GROUP_OF[e.id] || 'admissions'; }

  function paintTabs() {
    var host = document.getElementById('prepTabs');
    var present = GROUPS.filter(function (g) { return exams.some(function (e) { return groupOf(e) === g; }); });
    group = current ? groupOf(current) : present[0];
    var q = view.q.toLowerCase();
    // word starts only: "ucat" finds UCAT, not "edUCATion"
    var listed = q ? exams.filter(function (e) {
      var words = (e.name + ' ' + (e.by || '') + ' ' + e.id + ' ' + M.t('prep.group.' + groupOf(e))).toLowerCase().split(/[^\p{L}\p{N}]+/u);
      return q.split(/\s+/).every(function (part) { return words.some(function (w) { return w.indexOf(part) === 0; }); });
    }) : exams.filter(function (e) { return groupOf(e) === group; });
    host.innerHTML = '<div class="prep-bar">' +
        '<div class="prep-groups" role="tablist">' + present.map(function (g) {
          var n = exams.filter(function (e) { return groupOf(e) === g; }).length;
          return '<button type="button" data-group="' + g + '" aria-selected="' + (!q && g === group) + '">' + M.t('prep.group.' + g) +
            ' <span class="prep-gn">' + n + '</span></button>';
        }).join('') + '</div>' +
        '<label class="prep-find">' + M.icon('search', 16) +
          '<input type="search" id="prepFind" autocomplete="off" placeholder="' + M.esc(M.t('prep.find')) + '" value="' + M.esc(view.q) + '" /></label>' +
      '</div>' +
      '<div class="prep-exams">' + (listed.length ? '' : '<span class="muted" style="padding:.5rem 0">' + M.t('prep.noExam') + '</span>') + listed.map(function (e) {
        return '<button type="button" role="tab" title="' + M.esc(e.name) + '" data-exam="' + M.esc(e.id) + '" aria-selected="' + (current && current.id === e.id) + '">' +
          M.esc(String(e.name).split(' / ')[0].replace(/\s*\(.*\)\s*$/, '')) + '</button>';
      }).join('') + '</div>';
    host.querySelectorAll('[data-exam]').forEach(function (b) {
      b.addEventListener('click', function () { show(b.getAttribute('data-exam'), true); });
    });
    host.querySelectorAll('[data-group]').forEach(function (b) {
      b.addEventListener('click', function () {
        view.q = '';
        var first = exams.filter(function (e) { return groupOf(e) === b.getAttribute('data-group'); })[0];
        if (first) show(first.id, true);
      });
    });
    var find = document.getElementById('prepFind');
    var timer = null;
    find.addEventListener('input', function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        view.q = find.value.trim();
        paintTabs();
        var again = document.getElementById('prepFind');
        again.focus();
        again.setSelectionRange(again.value.length, again.value.length);
      }, 160);
    });
  }

  // one short line on screen; the full note is a tooltip
  function resource(r) {
    var kind = r.kind || 'official';
    return '<a href="' + M.esc(r.url) + '" target="_blank" rel="noopener noreferrer"' + (P(r.note) ? ' title="' + M.esc(P(r.note)) + '"' : '') + '>' +
      '<span class="ico">' + M.icon(KIND_ICON[kind] || 'external', 17) + '</span>' +
      '<b>' + M.esc(P(r.title)) + '</b>' +
      '<small>' + M.esc(r.provider || '') + (r.free ? ' · <span class="free">' + M.t('prep.free') + '</span>' : '') + '</small>' +
    '</a>';
  }

  function firstSentence(text) {
    var m = /^(.{40,}?[.!?。])\s/.exec(String(text || '') + ' ');
    return m ? m[1] : String(text || '');
  }

  function paintBody() {
    var host = document.getElementById('prepBody');
    var e = current;
    if (!e) {
      host.innerHTML = '<div class="empty-state">' + M.icon('book', 42) + '<p>' + M.t('prep.soon') + '</p></div>';
      return;
    }
    // materials by exam section (Reading, Math, Listening…) when the data names
    // them, otherwise by kind (official, practice tests, courses…)
    var all = e.resources || [];
    var kinds = {};
    all.forEach(function (r) { kinds[r.kind || 'official'] = (kinds[r.kind || 'official'] || 0) + 1; });
    var shownRes = all.filter(function (r) {
      return (view.kind === 'all' || (r.kind || 'official') === view.kind) && (!view.free || r.free);
    });
    var bySection = shownRes.some(function (r) { return r.section && r.section !== 'All'; });
    var groups = {};
    var order = [];
    shownRes.forEach(function (r) {
      var key = bySection ? (r.section || 'All') : (r.kind || 'official');
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(r);
    });
    var keys = bySection
      ? ['All'].filter(function (k) { return groups[k]; }).concat(order.filter(function (k) { return k !== 'All'; }))
      : KIND_ORDER.concat(order.filter(function (k) { return KIND_ORDER.indexOf(k) === -1; })).filter(function (k) { return groups[k]; });
    var title = function (k) {
      if (!bySection) return M.t('prep.kind.' + k);
      return k === 'All' ? M.t('prep.section.all') : k;
    };
    // facts: one line each, the full text one tap away
    var facts = [
      ['prep.format', P(e.format)], ['prep.dates', P(e.dates)], ['prep.cost', P(e.cost)]
    ].filter(function (f) { return f[1]; });
    var tips = P(e.tips) || [];
    var filterBar = '<div class="prep-filter">' +
      ['all'].concat(KIND_ORDER.filter(function (k) { return kinds[k]; })).map(function (k) {
        return '<button type="button" class="fchip" data-kind="' + k + '" aria-pressed="' + (view.kind === k) + '"><span>' +
          (k === 'all' ? M.t('prep.kind.all') : M.t('prep.kind.' + k)) + '</span><span class="fchip-count">' + (k === 'all' ? all.length : kinds[k]) + '</span></button>';
      }).join('') +
      '<button type="button" class="fchip fchip-free" data-free aria-pressed="' + view.free + '">' + M.icon('check', 14) + '<span>' + M.t('prep.freeOnly') + '</span></button>' +
    '</div>';
    host.innerHTML =
      '<div class="prep-main">' +
        '<div class="prep-hero"><h2>' + M.esc(e.name) + '</h2>' +
          (e.by ? '<p class="by">' + M.esc(e.by) + '</p>' : '') +
          (P(e.what) ? '<p>' + M.esc(firstSentence(P(e.what))) + '</p>' : '') + '</div>' +
        ((P(e.who) || P(e.scores) || tips.length) ? '<div class="prep-info">' +
          (P(e.who) ? '<div><b>' + M.icon('users', 15) + M.t('prep.who') + '</b><p>' + M.esc(P(e.who)) + '</p></div>' : '') +
          (P(e.scores) ? '<div><b>' + M.icon('target', 15) + M.t('prep.scores') + '</b><p>' + M.esc(P(e.scores)) + '</p></div>' : '') +
          (tips.length ? '<div class="prep-tips"><b>' + M.icon('zap', 15) + M.t('prep.tips') + '</b><ol>' + tips.map(function (t) { return '<li>' + M.esc(t) + '</li>'; }).join('') + '</ol></div>' : '') +
        '</div>' : '') +
        filterBar +
        (keys.length ? '' : '<p class="muted">' + M.t('prep.noMatch') + '</p>') +
        keys.map(function (k) {
          return '<section class="prep-group"><h3>' + M.esc(title(k)) + ' <span class="prep-n">' + groups[k].length + '</span></h3><div class="prep-res">' +
            groups[k].map(resource).join('') + '</div></section>';
        }).join('') +
      '</div>' +
      '<aside class="prep-facts">' +
        facts.map(function (f) {
          var short = firstSentence(f[1]);
          return '<details' + (short === f[1] ? ' class="is-short"' : '') + '><summary><dt>' + M.t(f[0]) + '</dt><dd>' + M.esc(short) + '</dd></summary>' +
            (short === f[1] ? '' : '<p>' + M.esc(f[1]) + '</p>') + '</details>';
        }).join('') +
        (e.register_url ? '<a class="btn btn-primary btn-block" href="' + M.esc(e.register_url) + '" target="_blank" rel="noopener noreferrer">' +
          M.t('prep.register') + M.icon('external', 15) + '</a>' : '') +
        '<button type="button" class="btn btn-outline btn-block" data-ask-ai="' + M.esc(M.t('prep.examAi').replace('{exam}', e.name)) + '">' +
          M.icon('sparkles', 16) + M.t('prep.askAi') + '</button>' +
        '<a class="btn btn-ghost btn-block" href="/teachers?q=' + encodeURIComponent(e.name) + '">' + M.t('prep.people.tutors') + '</a>' +
      '</aside>';
    host.querySelectorAll('[data-kind]').forEach(function (b) {
      b.addEventListener('click', function () { view.kind = b.getAttribute('data-kind'); paintBody(); });
    });
    var free = host.querySelector('[data-free]');
    if (free) free.addEventListener('click', function () { view.free = !view.free; paintBody(); });
  }

  function show(id, push) {
    var next = exams.filter(function (e) { return e.id === id; })[0] || exams[0] || null;
    if (next !== current) view.kind = 'all';
    current = next;
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
