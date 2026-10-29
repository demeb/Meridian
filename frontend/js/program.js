/* ============================================================
   Meridian — one project or scholarship, on its own page
   /programs/<id>
   ============================================================ */
(function () {
  'use strict';

  var program = null;
  var related = [];
  var application = null;

  var COST = {
    'fully-funded': { en: 'Fully funded', ka: 'სრულად დაფინანსებული', ar: 'ممول بالكامل' },
    scholarship: { en: 'Scholarship available', ka: 'სტიპენდიით', ar: 'منحة متاحة' },
    'tuition-free': { en: 'Tuition free', ka: 'უფასო სწავლება', ar: 'بدون رسوم دراسية' },
    funded: { en: 'Grant supported', ka: 'გრანტით', ar: 'بدعم منحة' },
    paid: { en: 'Self funded', ka: 'თვითდაფინანსებით', ar: 'تمويل ذاتي' },
    free: { en: 'Free to join', ka: 'უფასო', ar: 'مجاني' }
  };
  var FAMILY = {
    erasmus: { en: 'Erasmus+', ka: 'Erasmus+', ar: 'إيراسموس+' },
    mun: { en: 'Model United Nations', ka: 'გაეროს მოდელირება', ar: 'نموذج الأمم المتحدة' },
    flex: { en: 'Exchange', ka: 'გაცვლა', ar: 'تبادل' },
    summer: { en: 'Summer school', ka: 'საზაფხულო სკოლა', ar: 'مدرسة صيفية' },
    competition: { en: 'Competition', ka: 'კონკურსი', ar: 'مسابقة' },
    startup: { en: 'Startup programme', ka: 'სტარტაპ პროგრამა', ar: 'برنامج للشركات الناشئة' },
    youth: { en: 'Youth programme', ka: 'ახალგაზრდული პროგრამა', ar: 'برنامج شبابي' },
    uwc: { en: 'UWC', ka: 'UWC', ar: 'UWC' },
    scholarship: { en: 'Scholarship', ka: 'სტიპენდია', ar: 'منحة' }
  };

  function idFromPath() {
    return decodeURIComponent(window.location.pathname.split('/').filter(Boolean)[1] || '');
  }

  function L(table, key) { return table[key] ? M.pick(table[key]) : (key || ''); }

  function paragraphs(text) {
    return String(text || '').split(/\n{2,}/).map(function (p) {
      return '<p>' + M.esc(p.trim()) + '</p>';
    }).join('');
  }

  function countdown(deadline) {
    var days = M.daysUntil(deadline);
    if (days === null) return '<div class="op-count"><b>' + M.t('programs.rolling') + '</b><span>' + M.t('op.noDeadline') + '</span></div>';
    var tone = days <= 14 ? ' is-urgent' : days <= 45 ? ' is-soon' : '';
    return '<div class="op-count' + tone + '"><b>' + Math.max(days, 0) + '</b><span>' + M.t('op.daysLeft') +
      ' · ' + M.formatDate(deadline) + '</span></div>';
  }

  function paintCrumbs() {
    var sec = program.section === 'scholarship' ? 'scholarships' : 'projects';
    document.getElementById('crumbs').innerHTML =
      '<a href="/programs?s=' + sec + '">' + M.t('programs.sec.' + sec) + '</a>' + M.icon('chevronRight', 14) +
      '<span>' + M.esc(M.pick(program.name)) + '</span>';
  }

  function paintHero() {
    var facts = [
      ['op.where', program.city ? program.city + ', ' + M.pick(program.country) : M.pick(program.country)],
      ['op.when', program.event_dates || M.pick(program.duration)],
      ['programs.level', program.grades],
      ['programs.cost', L(COST, program.cost)]
    ].filter(function (f) { return f[1]; }).map(function (f) {
      return '<div><dt>' + M.t(f[0]) + '</dt><dd>' + M.esc(f[1]) + '</dd></div>';
    }).join('');
    document.getElementById('opHero').innerHTML =
      '<div class="op-title">' +
        '<span class="op-flag">' + (program.flag || '') + '</span>' +
        '<div>' +
          '<div class="cluster" style="margin-bottom:.7rem">' +
            '<span class="badge badge-brand">' + M.esc(L(FAMILY, program.family)) + '</span>' +
            (program.type && program.type.toLowerCase() !== (program.family || '').toLowerCase() &&
              program.type.toLowerCase() !== 'scholarship' ? '<span class="badge">' + M.esc(program.type) + '</span>' : '') +
            (program.score >= 8 ? '<span class="badge badge-accent">' + M.icon('star', 13) + M.t('op.highlight') + '</span>' : '') +
          '</div>' +
          '<h1>' + M.esc(M.pick(program.name)) + '</h1>' +
          '<p class="op-org">' + M.esc(program.org) + '</p>' +
        '</div>' +
      '</div>' +
      '<dl class="op-facts">' + facts + '</dl>';
    document.title = M.pick(program.name) + ' · Meridian';
  }

  function list(items, icon) {
    return '<ul class="op-list">' + (items || []).map(function (item) {
      return '<li>' + M.icon(icon || 'check', 17) + '<span>' + M.esc(item) + '</span></li>';
    }).join('') + '</ul>';
  }

  function paintMain() {
    var host = document.getElementById('opMain');
    if (program.locked) {
      host.innerHTML = '<div class="lock-card" style="text-align:center">' +
        '<span class="lock-icon">' + M.icon('lock', 24) + '</span>' +
        '<h3>' + M.t('common.locked') + '</h3>' +
        '<p class="muted" style="margin:.6rem 0 1.2rem">' + M.t('teachers.locked.body') + '</p>' +
        '<a class="btn btn-primary" href="/login?mode=register">' + M.t('common.signUp') + '</a></div>';
      return;
    }
    var steps = M.pick(program.how_to_apply);
    var stepsHtml = Array.isArray(steps) && steps.length
      ? '<ol class="op-steps">' + steps.map(function (s) { return '<li>' + M.esc(s) + '</li>'; }).join('') + '</ol>'
      : '<p class="muted">' + M.t('op.stepsFallback') + '</p>';
    var about = M.pick(program.about) || M.pick(program.summary);
    host.innerHTML =
      '<section class="op-block"><h2 class="op-h2">' + M.t('op.about') + '</h2><div class="op-prose">' + paragraphs(about) + '</div></section>' +
      ((M.pick(program.highlights) || []).length ? '<section class="op-block"><h2 class="op-h2">' + M.t('programs.highlights') + '</h2>' + list(M.pick(program.highlights)) + '</section>' : '') +
      '<section class="op-block"><h2 class="op-h2">' + M.t('programs.eligibility') + '</h2><div class="op-prose"><p>' + M.esc(M.pick(program.eligibility)) + '</p></div></section>' +
      (M.pick(program.costs) ? '<section class="op-block"><h2 class="op-h2">' + M.t('op.costs') + '</h2><div class="op-prose"><p>' + M.esc(M.pick(program.costs)) + '</p></div></section>' : '') +
      '<section class="op-block"><h2 class="op-h2">' + M.t('op.howTo') + '</h2>' + stepsHtml + '</section>' +
      sources();
  }

  function sources() {
    var note = M.pick(program.deadline_note);
    var seen = {};
    var links = (program.sources || []).filter(function (url) {
      var host = url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
      if (seen[host]) return false;
      seen[host] = true;
      return true;
    }).slice(0, 4).map(function (url) {
      var host = url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
      return '<a href="' + M.esc(url) + '" target="_blank" rel="noopener noreferrer">' + M.esc(host) + '</a>';
    }).join(' · ');
    if (!note && !links) return '';
    return '<div class="evidence">' +
      (note ? '<p><b>' + M.t('programs.note') + '</b> ' + M.esc(note) + '</p>' : '') +
      (links ? '<p class="evidence-src">' + M.icon('check', 14) + ' ' + M.t('programs.sources') + ' ' + links +
        (program.verified_at || program.found_at ? ' · ' + M.formatDate((program.verified_at || program.found_at).slice(0, 10)) : '') + '</p>' : '') +
    '</div>';
  }

  var STAGES = ['planning', 'preparing', 'submitted', 'result'];

  function trackerCard() {
    if (!M.state.user) {
      return '<button type="button" class="btn btn-primary btn-block" id="startApp">' + M.icon('plus', 17) + M.t('op.start') + '</button>' +
        '<p class="op-side-note">' + M.t('op.startNote') + '</p>';
    }
    if (!application) {
      return '<button type="button" class="btn btn-primary btn-block" id="startApp">' + M.icon('plus', 17) + M.t('op.start') + '</button>' +
        '<p class="op-side-note">' + M.t('op.startNote') + '</p>';
    }
    var stage = application.stage;
    return '<div class="op-track">' +
        '<div class="spread"><b>' + M.t('op.yourApp') + '</b><a class="btn-link" href="/account#applications">' + M.t('op.openTracker') + '</a></div>' +
        '<div class="stage-bar">' + STAGES.map(function (s, i) {
          var on = STAGES.indexOf(stage) >= i;
          return '<button type="button" class="stage-step' + (on ? ' is-on' : '') + (s === stage ? ' is-current' : '') +
            '" data-stage="' + s + '"><i></i><span>' + M.t('app.stage.' + s) + '</span></button>';
        }).join('') + '</div>' +
        '<div class="mini-check">' + application.checklist.map(function (c) {
          return '<label><input type="checkbox" data-check="' + c.key + '"' + (c.done ? ' checked' : '') + ' /><span>' + M.esc(M.pick(c.label)) + '</span></label>';
        }).join('') + '</div>' +
      '</div>';
  }

  function paintSide() {
    var host = document.getElementById('opSide');
    var saved = (M.state.saved || []).indexOf(program.id) !== -1;
    var apply = program.apply_url || program.url;
    host.innerHTML =
      '<div class="card op-card">' +
        countdown(program.deadline) +
        '<div id="trackerSlot">' + trackerCard() + '</div>' +
        '<button type="button" class="btn btn-outline btn-block" id="saveBtn">' + M.icon('bookmark', 17) +
          '<span>' + M.t(saved ? 'programs.saved' : 'programs.save') + '</span></button>' +
        (apply ? '<a class="btn btn-ghost btn-block op-official" id="officialBtn" href="' + M.esc(apply) + '" target="_blank" rel="noopener noreferrer">' +
          M.t('op.register') + M.icon('external', 15) + '</a>' +
          '<p class="op-side-note">' + M.t('op.officialNote') + '</p>' : '') +
      '</div>';
    bindSide();
  }

  function bindSide() {
    var start = document.getElementById('startApp');
    if (start) {
      start.addEventListener('click', function () {
        if (!M.state.user) { window.location.href = '/login?mode=register&next=' + encodeURIComponent(window.location.pathname); return; }
        M.api('/api/applications', { body: { kind: 'program', item_id: program.id } }).then(function (data) {
          if (!data.ok) return M.toast(M.t('common.error'), 'error');
          application = data.application;
          M.track('start_application', program.id, { kind: 'program' });
          M.toast(M.t('op.started'), 'success', 2200);
          paintSide();
        });
      });
    }
    document.querySelectorAll('[data-stage]').forEach(function (b) {
      b.addEventListener('click', function () { patch({ stage: b.getAttribute('data-stage') }); });
    });
    document.querySelectorAll('[data-check]').forEach(function (box) {
      box.addEventListener('change', function () {
        var done = {}; done[box.getAttribute('data-check')] = box.checked;
        patch({ done: done });
      });
    });
    var save = document.getElementById('saveBtn');
    save.addEventListener('click', function () {
      if (!M.state.user) { window.location.href = '/login?mode=register'; return; }
      M.api('/api/saved', { body: { program_id: program.id } }).then(function (data) {
        if (!data.ok) return;
        M.state.saved = data.all || [];
        if (data.saved) M.track('save', program.id);
        save.querySelector('span').textContent = M.t(data.saved ? 'programs.saved' : 'programs.save');
      });
    });
    var official = document.getElementById('officialBtn');
    if (official) official.addEventListener('click', function () { M.track('apply_click', program.id); });
  }

  function patch(changes) {
    M.api('/api/applications/' + application.id, { method: 'PATCH', body: changes }).then(function (data) {
      if (data.ok) { application = data.application; document.getElementById('trackerSlot').innerHTML = trackerCard(); bindSide(); }
    });
  }

  function paintSimilar() {
    var same = related.filter(function (p) {
      return p.id !== program.id && (p.section || 'project') === (program.section || 'project') &&
        (p.family === program.family || p.iso === program.iso);
    }).sort(function (a, b) { return (b.score || 0) - (a.score || 0); }).slice(0, 3);
    if (!same.length) return;
    document.getElementById('similarWrap').hidden = false;
    document.getElementById('similar').innerHTML = same.map(function (p) {
      var days = M.daysUntil(p.deadline);
      return '<a class="card card-hover op-mini" href="/programs/' + encodeURIComponent(p.id) + '">' +
        '<span class="op-mini-top"><span>' + p.flag + '</span>' +
        (p.deadline ? '<span class="badge">' + (days >= 0 ? days + ' ' + M.t('home.rail.days') : '') + '</span>' : '') + '</span>' +
        '<b>' + M.esc(M.pick(p.name)) + '</b><span class="muted">' + M.esc(p.org) + '</span></a>';
    }).join('');
  }

  function paintAll() {
    paintCrumbs(); paintHero(); paintMain(); paintSide(); paintSimilar();
  }

  function notFound(closed) {
    document.getElementById('opHero').innerHTML =
      '<div class="empty-state" style="padding:3rem 0">' + M.icon(closed ? 'clock' : 'search', 42) +
      '<h1 style="font-size:var(--step-2);margin-top:1rem">' + M.t(closed ? 'op.closed' : 'op.missing') + '</h1>' +
      '<p class="muted">' + M.t(closed ? 'op.closedBody' : 'op.missingBody') + '</p>' +
      '<a class="btn btn-primary" style="margin-top:1.2rem" href="/programs">' + M.t('op.browse') + '</a></div>';
  }

  function init() {
    var id = idFromPath();
    Promise.all([
      fetch('/api/programs/' + encodeURIComponent(id), { credentials: 'same-origin' }).then(function (r) { return r.json(); }),
      M.api('/api/programs'),
      M.loadUser ? M.loadUser() : Promise.resolve()
    ]).then(function (out) {
      if (!out[0].ok) return notFound(out[0].error === 'closed');
      program = out[0].program;
      related = out[1].programs || [];
      M.track('view_program', program.id, { section: program.section, family: program.family });
      if (M.state.user) {
        return M.api('/api/applications').then(function (data) {
          application = (data.applications || []).filter(function (a) { return a.kind === 'program' && a.item_id === program.id; })[0] || null;
        }).catch(function () {}).then(paintAll);
      }
      paintAll();
    }).catch(function () { notFound(false); });
    window.addEventListener('meridian:lang', function () { if (program) paintAll(); });
    window.addEventListener('meridian:user', function () { if (program) paintSide(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
