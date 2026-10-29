/* ============================================================
   Meridian — one university, on its own page
   /universities/<id>
   ============================================================ */
(function () {
  'use strict';

  var uni = null;
  var application = null;

  function idFromPath() {
    return decodeURIComponent(window.location.pathname.split('/').filter(Boolean)[1] || '');
  }

  function name(u) { return typeof u.name === 'string' ? u.name : M.pick(u.name); }
  function country(u) { return typeof u.country === 'string' ? u.country : M.pick(u.country); }

  function paragraphs(text) {
    return String(text || '').split(/\n{2,}/).map(function (p) { return '<p>' + M.esc(p.trim()) + '</p>'; }).join('');
  }

  function tuition(u) {
    var t = u.tuition_intl;
    if (!t || t.amount === null || t.amount === undefined) return '—';
    if (t.amount === 0) return M.t('uni.free');
    return Number(t.amount).toLocaleString('en-US') + ' ' + (t.currency || '') + ' / ' + M.t(t.per === 'semester' ? 'uni.semester' : 'uni.year');
  }

  function paintHero() {
    document.getElementById('crumbs').innerHTML =
      '<a href="/universities">' + M.t('programs.sec.universities') + '</a>' + M.icon('chevronRight', 14) +
      '<span>' + M.esc(name(uni)) + '</span>';
    var facts = uni.basic ? [
      ['uni.f.country', country(uni)], ['uni.region', uni.state]
    ] : [
      ['uni.tuition', tuition(uni)],
      ['uni.deadline', uni.deadline ? M.formatDate(uni.deadline) : '—'],
      ['uni.apply', uni.platform],
      ['uni.admit', uni.acceptance_rate ? Math.round(uni.acceptance_rate * 100) + '%' : null],
      ['uni.type', uni.type ? M.t('uni.type.' + uni.type) : null],
      ['uni.intakes', (uni.intakes || []).join(', ')]
    ];
    facts = facts.filter(function (f) { return f[1]; }).map(function (f) {
      return '<div><dt>' + M.t(f[0]) + '</dt><dd>' + M.esc(f[1]) + '</dd></div>';
    }).join('');
    document.getElementById('opHero').innerHTML =
      '<div class="op-title">' +
        '<span class="op-flag">' + (uni.flag || '') + '</span>' +
        '<div>' +
          '<div class="cluster" style="margin-bottom:.7rem">' +
            (uni.rank_qs ? '<span class="badge badge-accent">QS #' + uni.rank_qs + '</span>' : '') +
            (uni.basic ? '<span class="badge">' + M.t('uni.basic') + '</span>' : '') +
            ((uni.languages || []).length ? '<span class="badge">' + M.esc(uni.languages.join(' · ')) + '</span>' : '') +
          '</div>' +
          '<h1>' + M.esc(name(uni)) + '</h1>' +
          '<p class="op-org">' + M.esc((uni.city ? uni.city + ', ' : '') + country(uni)) + '</p>' +
        '</div>' +
      '</div>' +
      '<dl class="op-facts">' + facts + '</dl>';
    document.title = name(uni) + ' · Meridian';
  }

  function paintMain() {
    var host = document.getElementById('opMain');
    if (uni.basic) {
      host.innerHTML = '<section class="op-block"><h2 class="op-h2">' + M.t('op.about') + '</h2>' +
        '<div class="op-prose"><p>' + M.t('uni.basicBody') + '</p></div></section>' +
        requirementsBlock(null);
      return;
    }
    var strengths = M.pick(uni.strengths) || [];
    host.innerHTML =
      '<section class="op-block"><h2 class="op-h2">' + M.t('op.about') + '</h2><div class="op-prose">' +
        paragraphs(M.pick(uni.about) || M.pick(uni.summary)) + '</div></section>' +
      (strengths.length ? '<section class="op-block"><h2 class="op-h2">' + M.t('uni.strengths') + '</h2><div class="tag-list">' +
        strengths.map(function (s) { return '<span class="badge">' + M.esc(s) + '</span>'; }).join('') + '</div></section>' : '') +
      (M.pick(uni.tests) ? '<section class="op-block"><h2 class="op-h2">' + M.t('uni.tests') + '</h2><div class="op-prose"><p>' + M.esc(M.pick(uni.tests)) + '</p></div></section>' : '') +
      (M.pick(uni.aid_intl) ? '<section class="op-block"><h2 class="op-h2">' + M.t('uni.aid') + '</h2><div class="op-prose"><p>' + M.esc(M.pick(uni.aid_intl)) + '</p></div></section>' : '') +
      (uni.tuition_intl && uni.tuition_intl.note ? '<p class="muted" style="font-size:.86rem">' + M.esc(uni.tuition_intl.note) + '</p>' : '') +
      requirementsBlock(uni.requirements) +
      (uni.deadline_note ? '<div class="evidence"><p><b>' + M.t('programs.note') + '</b> ' + M.esc(uni.deadline_note) + '</p></div>' : '');
  }

  function requirementsBlock(reqs) {
    var list = reqs && reqs.length ? reqs : null;
    return '<section class="op-block"><h2 class="op-h2">' + M.t('uni.checklist') + '</h2>' +
      '<p class="muted" style="margin-bottom:.8rem">' + M.t('uni.checklistLede') + '</p>' +
      (list ? '<ul class="op-list op-list-check">' + list.map(function (r) {
        return '<li>' + M.icon('file', 17) + '<span>' + M.esc(M.pick(r.label)) + '</span></li>';
      }).join('') + '</ul>' : '<p class="muted">' + M.t('uni.checklistDefault') + '</p>') + '</section>';
  }

  function trackerMarkup() {
    if (!application) {
      return '<button type="button" class="btn btn-primary btn-block" id="startApp">' + M.icon('send', 17) + M.t('uni.start') + '</button>' +
        '<p class="op-side-note">' + M.t('uni.startNote') + '</p>';
    }
    var p = application.progress;
    var pct = p.total ? Math.round(p.done / p.total * 100) : 0;
    return '<div class="op-track">' +
      '<div class="spread"><b>' + M.t('op.yourApp') + '</b><span class="badge">' + M.t('app.stage.' + application.stage) + '</span></div>' +
      '<div class="progress-line"><i style="width:' + pct + '%"></i></div>' +
      '<p class="op-side-note">' + p.done + ' / ' + p.total + ' ' + M.t('uni.itemsDone') + '</p>' +
      '<a class="btn btn-primary btn-block" href="/account#applications">' + M.t('uni.continue') + M.icon('arrowRight', 16) + '</a>' +
    '</div>';
  }

  function paintSide() {
    var days = M.daysUntil(uni.deadline);
    var saved = (M.state.saved || []).indexOf(uni.id) !== -1;
    document.getElementById('opSide').innerHTML =
      '<div class="card op-card">' +
        (uni.deadline ? '<div class="op-count' + (days !== null && days <= 21 ? ' is-urgent' : '') + '"><b>' + Math.max(days || 0, 0) + '</b><span>' +
          M.t('op.daysLeft') + ' · ' + M.formatDate(uni.deadline) + '</span></div>' : '') +
        '<div id="trackerSlot">' + trackerMarkup() + '</div>' +
        '<button type="button" class="btn btn-outline btn-block" id="saveBtn">' + M.icon('bookmark', 17) +
          '<span>' + M.t(saved ? 'programs.saved' : 'programs.save') + '</span></button>' +
        (uni.website ? '<a class="btn btn-ghost btn-block op-official" id="officialBtn" href="' + M.esc(uni.website) +
          '" target="_blank" rel="noopener noreferrer">' + M.t('uni.website') + M.icon('external', 15) + '</a>' : '') +
      '</div>';
    var start = document.getElementById('startApp');
    if (start) start.addEventListener('click', function () {
      if (!M.state.user) { window.location.href = '/login?mode=register&next=' + encodeURIComponent(window.location.pathname); return; }
      M.api('/api/applications', { body: { kind: 'university', item_id: uni.id } }).then(function (data) {
        if (!data.ok) return M.toast(M.t('common.error'), 'error');
        application = data.application;
        M.track('start_application', uni.id, { kind: 'university' });
        M.toast(M.t('op.started'), 'success', 2200);
        paintSide();
      });
    });
    document.getElementById('saveBtn').addEventListener('click', function () {
      if (!M.state.user) { window.location.href = '/login?mode=register'; return; }
      M.api('/api/saved', { body: { program_id: uni.id } }).then(function (data) {
        if (!data.ok) return;
        M.state.saved = data.all || [];
        if (data.saved) M.track('save', uni.id);
        paintSide();
      });
    });
    var official = document.getElementById('officialBtn');
    if (official) official.addEventListener('click', function () { M.track('official_click', uni.id); });
  }

  function paintAll() { paintHero(); paintMain(); paintSide(); }

  function init() {
    var id = idFromPath();
    Promise.all([
      fetch('/api/universities/' + encodeURIComponent(id), { credentials: 'same-origin' }).then(function (r) { return r.json(); }),
      M.loadUser()
    ]).then(function (out) {
      if (!out[0].ok) {
        document.getElementById('opHero').innerHTML = '<div class="empty-state" style="padding:3rem 0">' + M.icon('search', 42) +
          '<h1 style="font-size:var(--step-2);margin-top:1rem">' + M.t('op.missing') + '</h1>' +
          '<a class="btn btn-primary" style="margin-top:1.2rem" href="/universities">' + M.t('programs.sec.universities') + '</a></div>';
        return;
      }
      uni = out[0].university;
      M.track('view_university', uni.id);
      if (M.state.user) {
        return M.api('/api/applications').then(function (data) {
          application = (data.applications || []).filter(function (a) { return a.kind === 'university' && a.item_id === uni.id; })[0] || null;
        }).catch(function () {}).then(paintAll);
      }
      paintAll();
    });
    window.addEventListener('meridian:lang', function () { if (uni) paintAll(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
