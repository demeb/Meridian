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

  function groupOf(e) { return e.group || GROUP_OF[e.id] || 'admissions'; }

  function paintTabs() {
    var host = document.getElementById('prepTabs');
    var present = GROUPS.filter(function (g) { return exams.some(function (e) { return groupOf(e) === g; }); });
    group = current ? groupOf(current) : present[0];
    host.innerHTML = '<div class="prep-groups" role="tablist">' + present.map(function (g) {
        return '<button type="button" data-group="' + g + '" aria-selected="' + (g === group) + '">' + M.t('prep.group.' + g) + '</button>';
      }).join('') + '</div>' +
      '<div class="prep-exams">' + exams.filter(function (e) { return groupOf(e) === group; }).map(function (e) {
        return '<button type="button" role="tab" title="' + M.esc(e.name) + '" data-exam="' + M.esc(e.id) + '" aria-selected="' + (current && current.id === e.id) + '">' +
          M.esc(String(e.name).split(' / ')[0].replace(/\s*\(.*\)\s*$/, '')) + '</button>';
      }).join('') + '</div>';
    host.querySelectorAll('[data-exam]').forEach(function (b) {
      b.addEventListener('click', function () { show(b.getAttribute('data-exam'), true); });
    });
    host.querySelectorAll('[data-group]').forEach(function (b) {
      b.addEventListener('click', function () {
        var first = exams.filter(function (e) { return groupOf(e) === b.getAttribute('data-group'); })[0];
        if (first) show(first.id, true);
      });
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
    var bySection = (e.resources || []).some(function (r) { return r.section && r.section !== 'All'; });
    var groups = {};
    var order = [];
    (e.resources || []).forEach(function (r) {
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
    host.innerHTML =
      '<div class="prep-main">' +
        '<div class="prep-hero"><h2>' + M.esc(e.name) + '</h2>' +
          (e.by ? '<p class="by">' + M.esc(e.by) + '</p>' : '') +
          (P(e.what) ? '<p>' + M.esc(firstSentence(P(e.what))) + '</p>' : '') + '</div>' +
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
