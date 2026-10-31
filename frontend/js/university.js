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
  function isBasic(u) { return u.basic || u.profile === 'basic'; }

  function initials(text) {
    var short = /\(([A-Z][A-Za-z&]{1,4})\)/.exec(String(text || ''));
    if (short) return short[1].toUpperCase();
    var words = String(text || '').replace(/\(.*?\)/g, '').split(/\s+/).filter(function (w) {
      return w && !/^(of|the|and|for|de|di|du|la|le|der|des|et|y|&|-)$/i.test(w);
    });
    return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] || '?').slice(0, 2)).toUpperCase();
  }

  function logo(u) {
    var en = typeof u.name === 'string' ? u.name : u.name.en;
    var mono = '<span class="uni-mono" aria-hidden="true">' + M.esc(initials(en)) + '</span>';
    return '<span class="uni-logo' + (u.logo ? ' has-img' : '') + '" style="--s:76px">' + mono +
      (u.logo ? '<img src="' + M.esc(u.logo) + '" alt="" referrerpolicy="no-referrer" onerror="this.parentNode.classList.remove(\'has-img\');this.remove()" />' : '') +
      '</span>';
  }
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
    var facts = isBasic(uni) ? [
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
        logo(uni) +
        '<div>' +
          '<div class="cluster" style="margin-bottom:.7rem">' +
            (uni.rank_qs ? '<span class="badge badge-accent">' + M.icon('award', 13) + ' QS World Rankings #' + M.esc(uni.rank_label || uni.rank_qs) + '</span>' : '') +
            (isBasic(uni) ? '<span class="badge">' + M.t('uni.basic') + '</span>' : '') +
            ((uni.languages || []).length ? '<span class="badge">' + M.esc(uni.languages.join(' · ')) + '</span>' : '') +
          '</div>' +
          '<h1>' + M.esc(name(uni)) + '</h1>' +
          '<p class="op-org">' + (uni.flag || '') + ' ' + M.esc((uni.city ? uni.city + ', ' : '') + country(uni)) + '</p>' +
        '</div>' +
      '</div>' +
      '<dl class="op-facts">' + facts + '</dl>';
    document.title = name(uni) + ' · Meridian';
  }

  function paintMain() {
    var host = document.getElementById('opMain');
    if (isBasic(uni)) {
      host.innerHTML = '<section class="op-block"><h2 class="op-h2">' + M.t('op.about') + '</h2>' +
        '<div class="op-prose"><p>' + M.t('uni.basicBody') + '</p></div></section>' +
        requirementsBlock(null);
      return;
    }
    var strengths = M.pick(uni.strengths) || [];
    var programs = M.pick(uni.top_programs) || [];
    host.innerHTML =
      glance() +
      schoolBlock() +
      '<section class="op-block"><h2 class="op-h2">' + M.t('op.about') + '</h2><div class="op-prose">' +
        paragraphs(M.pick(uni.about) || M.pick(uni.summary)) + '</div></section>' +
      (programs.length ? '<section class="op-block"><h2 class="op-h2">' + M.t('uni.topPrograms') + '</h2><div class="tag-list">' +
        programs.map(function (s) { return '<span class="badge badge-brand">' + M.esc(s) + '</span>'; }).join('') + '</div></section>' : '') +
      scholarshipsBlock() +
      (strengths.length ? '<section class="op-block"><h2 class="op-h2">' + M.t('uni.strengths') + '</h2><div class="tag-list">' +
        strengths.map(function (s) { return '<span class="badge">' + M.esc(s) + '</span>'; }).join('') + '</div></section>' : '') +
      (M.pick(uni.gpa_note) ? '<section class="op-block"><h2 class="op-h2">' + M.t('uni.grades') + '</h2><div class="op-prose"><p>' + M.esc(M.pick(uni.gpa_note)) + '</p></div></section>' : '') +
      (M.pick(uni.tests) ? '<section class="op-block"><h2 class="op-h2">' + M.t('uni.tests') + '</h2><div class="op-prose"><p>' + M.esc(M.pick(uni.tests)) + '</p></div></section>' : '') +
      (M.pick(uni.aid_intl) ? '<section class="op-block"><h2 class="op-h2">' + M.t('uni.aid') + '</h2><div class="op-prose"><p>' + M.esc(M.pick(uni.aid_intl)) + '</p></div></section>' : '') +
      (uni.tuition_intl && uni.tuition_intl.note ? '<p class="muted" style="font-size:.86rem">' + M.esc(uni.tuition_intl.note) + '</p>' : '') +
      requirementsBlock(uni.requirements) +
      (uni.deadline_note ? '<div class="evidence"><p><b>' + M.t('programs.note') + '</b> ' + M.esc(uni.deadline_note) + '</p></div>' : '');
  }

  /* Admission numbers in one glance: the same data the filters use */
  function glance() {
    var cells = [];
    if (uni.sat && uni.sat.low && uni.sat.high) cells.push(['SAT', uni.sat.low + '–' + uni.sat.high, uni.sat.required ? M.t('uni.sat.' + uni.sat.required) : '']);
    else if (uni.sat && uni.sat.required) cells.push(['SAT', M.t('uni.sat.' + uni.sat.required), '']);
    if (uni.act && uni.act.low && uni.act.high) cells.push(['ACT', uni.act.low + '–' + uni.act.high, '']);
    if (uni.ielts_min) cells.push(['IELTS', uni.ielts_min + '+', M.t('uni.minimum')]);
    if (uni.toefl_min) cells.push(['TOEFL iBT', uni.toefl_min + '+', M.t('uni.minimum')]);
    if (uni.duolingo_min) cells.push(['Duolingo', uni.duolingo_min + '+', M.t('uni.minimum')]);
    if (uni.other_tests && uni.other_tests.length) cells.push([M.t('uni.otherTests'), uni.other_tests.join(', '), M.t('uni.otherTests.note')]);
    if (uni.acceptance_rate) cells.push([M.t('uni.admit'), Math.round(uni.acceptance_rate * 100) + '%', '']);
    if (uni.students) cells.push([M.t('uni.students'), Number(uni.students).toLocaleString('en-US'), uni.intl_pct ? Math.round(uni.intl_pct * 100) + '% ' + M.t('uni.international') : '']);
    if (!cells.length) return '';
    return '<section class="op-block"><h2 class="op-h2">' + M.t('uni.glance') + '</h2><dl class="uni-glance">' +
      cells.map(function (c) {
        return '<div><dt>' + M.esc(c[0]) + '</dt><dd>' + M.esc(c[1]) + '</dd>' + (c[2] ? '<small>' + M.esc(c[2]) + '</small>' : '') + '</div>';
      }).join('') + '</dl></section>';
  }

  /* Which school diplomas the university takes, and the language of teaching */
  var DIPLOMA_ROWS = [['national', 'uni.dip.national'], ['a-level', 'uni.dip.alevel'], ['ib', 'uni.dip.ib'], ['us-diploma', 'uni.dip.us']];
  function schoolBlock() {
    var q = uni.qualifications || {};
    var rows = DIPLOMA_ROWS.filter(function (row) { return q[row[0]]; });
    var langs = (uni.languages || []).join(' · ');
    var english = uni.english_bachelors ? M.t('uni.eng.' + uni.english_bachelors) : '';
    var note = uni.qualifications_note ? M.pick(uni.qualifications_note) : '';
    if (!rows.length && !note && !langs) return '';
    return '<section class="op-block"><h2 class="op-h2">' + M.t('uni.school.title') + '</h2>' +
      (rows.length ? '<ul class="dip-list">' + rows.map(function (row) {
        var status = q[row[0]];
        return '<li class="dip-' + status + '"><span class="dip-dot"></span><b>' + M.esc(M.t(row[1])) + '</b><span>' +
          M.esc(M.t('uni.dip.' + status)) + '</span></li>';
      }).join('') + '</ul>' : '') +
      (note ? '<p class="muted" style="margin-top:.8rem">' + M.esc(note) + '</p>' : '') +
      (langs ? '<p class="dip-lang"><b>' + M.t('uni.f.teachLang') + ':</b> ' + M.esc(langs) + (english ? ' · ' + M.esc(english) : '') + '</p>' : '') +
      '</section>';
  }

  function scholarshipsBlock() {
    var list = (uni.scholarships || []).filter(function (s) { return s && s.name; });
    if (!list.length) return '';
    return '<section class="op-block"><h2 class="op-h2">' + M.t('uni.scholarships') + '</h2><ul class="uni-schol">' +
      list.map(function (s) {
        return '<li>' + M.icon('award', 17) + '<div><b>' + M.esc(s.name) + '</b>' +
          (s.coverage ? '<span class="badge' + (s.coverage === 'full' ? ' badge-success' : '') + '">' + M.t('uni.cover.' + s.coverage) + '</span>' : '') +
          '</div>' + (s.url ? '<a href="' + M.esc(s.url) + '" target="_blank" rel="noopener noreferrer" class="link-btn">' + M.t('uni.details') + M.icon('external', 13) + '</a>' : '') + '</li>';
      }).join('') + '</ul></section>';
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
        '<button type="button" class="btn btn-outline btn-block' + (saved ? ' is-saved' : '') + '" id="saveBtn" aria-pressed="' + saved + '">' + M.icon('bookmark', 17) +
          '<span>' + M.t(saved ? 'programs.saved' : 'programs.save') + '</span></button>' +
        (uni.application_url ? '<a class="btn btn-outline btn-block" id="admBtn" href="' + M.esc(uni.application_url) +
          '" target="_blank" rel="noopener noreferrer">' + M.t('uni.admissionsPage') + M.icon('external', 15) + '</a>' : '') +
        (uni.website ? '<a class="btn btn-ghost btn-block op-official" id="officialBtn" href="' + M.esc(uni.website) +
          '" target="_blank" rel="noopener noreferrer">' + M.t('uni.website') + M.icon('external', 15) + '</a>' : '') +
        '<button type="button" class="btn btn-ghost btn-block" data-ask-ai="' + M.esc(M.t('uni.askAiPrompt').replace('{name}', name(uni))) + '">' +
          M.icon('sparkles', 16) + '<span>' + M.t('uni.askAi') + '</span></button>' +
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
    var adm = document.getElementById('admBtn');
    if (adm) adm.addEventListener('click', function () { M.track('apply_click', uni.id); });
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
