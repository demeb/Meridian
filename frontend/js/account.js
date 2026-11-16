/* ============================================================
   Meridian — account dashboard
   ============================================================ */
(function () {
  'use strict';

  var user = null;
  var programs = [];
  var savedUnis = [];
  var bookings = [];
  var orders = [];
  var applications = [];
  var meetings = [];
  var mySchool = { schools: [], counsellors: [] };

  var PROGRAM_STAGES = ['planning', 'preparing', 'submitted', 'result'];

  /* ---------------------------------------------------------- applications */
  function itemName(app) {
    return app.item ? M.pick(app.item.name) : app.item_id;
  }

  function countdownBadge(deadline) {
    var days = M.daysUntil(deadline);
    if (days === null) return '<span class="badge">' + M.t('programs.rolling') + '</span>';
    if (days < 0) return '<span class="badge">' + M.t('home.rail.closed') + '</span>';
    return '<span class="badge ' + (days <= 14 ? 'badge-danger' : days <= 45 ? 'badge-accent' : 'badge-success') + ' badge-dot">' +
      days + ' ' + M.t('home.rail.days') + '</span>';
  }

  /* tracker cards fold to one line; the open ones are remembered per browser */
  var OPEN_KEY = 'meridian.openApps';
  var openApps = (function () {
    try { return JSON.parse(localStorage.getItem(OPEN_KEY)) || {}; } catch (e) { return {}; }
  })();

  function isOpen(app) { return !!openApps[app.id]; }

  function setOpen(id, open) {
    if (open) openApps[id] = 1; else delete openApps[id];
    try { localStorage.setItem(OPEN_KEY, JSON.stringify(openApps)); } catch (e) {}
  }

  function foldButton(app, summary) {
    return '<button type="button" class="app-fold" data-fold aria-expanded="' + isOpen(app) + '">' +
      '<span class="app-sum">' + summary + '</span>' + M.icon('chevronDown', 18) + '</button>';
  }

  function programApp(app) {
    var item = app.item || {};
    var done = app.checklist.filter(function (c) { return c.done; }).length;
    return '<article class="app-card' + (isOpen(app) ? ' is-open' : '') + '" data-app="' + app.id + '">' +
      '<div class="app-head">' +
        '<span class="app-flag">' + (item.flag || '') + '</span>' +
        '<a class="app-title" href="' + M.esc(item.url || '#') + '">' + M.esc(itemName(app)) + '</a>' +
        countdownBadge(item.deadline) +
        foldButton(app, M.t('app.stage.' + app.stage) + ' · ' + done + '/' + app.checklist.length) +
      '</div>' +
      '<div class="app-body">' +
      '<div class="stage-bar">' + PROGRAM_STAGES.map(function (s, i) {
        var on = PROGRAM_STAGES.indexOf(app.stage) >= i;
        return '<button type="button" class="stage-step' + (on ? ' is-on' : '') + (s === app.stage ? ' is-current' : '') +
          '" data-stage="' + s + '"><i></i><span>' + M.t('app.stage.' + s) + '</span></button>';
      }).join('') + '</div>' +
      '<div class="mini-check">' + app.checklist.map(function (c) {
        return '<label><input type="checkbox" data-check="' + c.key + '"' + (c.done ? ' checked' : '') + ' /><span>' +
          M.esc(M.pick(c.label)) + '</span></label>';
      }).join('') + '</div>' +
      '<button type="button" class="btn-link app-remove" data-remove>' + M.t('app.remove') + '</button>' +
      '</div>' +
    '</article>';
  }

  function uniApp(app) {
    var item = app.item || {};
    var p = app.progress;
    var pct = p.total ? Math.round(p.done / p.total * 100) : 0;
    var locked = app.stage === 'review' || app.stage === 'submitted' || app.stage === 'result';
    var rows = app.checklist.map(function (c) {
      var files = (app.files || []).filter(function (f) { return f.req_key === c.key; });
      return '<div class="req-row' + (c.done ? ' is-done' : '') + '">' +
        '<span class="req-state">' + M.icon(c.done ? 'checkCircle' : 'file', 18) + '</span>' +
        '<span class="req-main"><b>' + M.esc(M.pick(c.label)) + '</b>' +
          (files.length ? '<span class="req-files">' + files.map(function (f) {
            return '<a href="/api/applications/' + app.id + '/files/' + f.id + '">' + M.esc(f.filename) + '</a>' +
              (locked ? '' : '<button type="button" class="req-x" data-delfile="' + f.id + '" aria-label="' + M.t('app.removeFile') + '">×</button>');
          }).join('') + '</span>' : '<span class="req-files dim">' + M.t(c.done ? 'app.markedDone' : 'app.missing') + '</span>') +
        '</span>' +
        (locked ? '' :
          '<span class="req-actions">' +
            '<label class="btn btn-ghost btn-sm">' + M.icon('upload', 15) + M.t('app.upload') +
              '<input type="file" hidden data-upload="' + c.key + '" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt" /></label>' +
            '<label class="req-toggle"><input type="checkbox" data-check="' + c.key + '"' + (c.done ? ' checked' : '') + ' />' + M.t('app.done') + '</label>' +
          '</span>') +
      '</div>';
    }).join('');
    return '<article class="app-card app-uni' + (isOpen(app) ? ' is-open' : '') + '" data-app="' + app.id + '">' +
      '<div class="app-head">' +
        '<span class="app-flag">' + (item.flag || '') + '</span>' +
        '<a class="app-title" href="' + M.esc(item.url || '#') + '">' + M.esc(itemName(app)) + '</a>' +
        '<span class="badge ' + (locked ? 'badge-brand' : '') + '">' + M.t('app.stage.' + app.stage) + '</span>' +
        foldButton(app, p.done + '/' + p.total) +
      '</div>' +
      '<div class="app-body">' +
      '<div class="app-meta"><span>' + M.t('uni.deadline') + ': ' + (item.deadline ? M.formatDate(item.deadline) : '—') + '</span>' +
        countdownBadge(item.deadline) + '<span>' + p.done + ' / ' + p.total + ' ' + M.t('uni.itemsDone') + '</span></div>' +
      '<div class="progress-line"><i style="width:' + pct + '%"></i></div>' +
      '<div class="req-list">' + rows + '</div>' +
      (locked ? '<p class="app-note">' + M.icon('info', 16) + M.t('app.inReview') + '</p>' :
        '<div class="cluster" style="justify-content:space-between">' +
          '<button type="button" class="btn-link app-remove" data-remove>' + M.t('app.remove') + '</button>' +
          '<button type="button" class="btn btn-primary" data-submit' + (p.done < p.total ? ' disabled' : '') + '>' +
            M.icon('send', 16) + M.t('app.submit') + '</button>' +
        '</div>') +
      '</div>' +
    '</article>';
  }

  function applicationsSection() {
    var progs = applications.filter(function (a) { return a.kind === 'program'; });
    var uniApps = applications.filter(function (a) { return a.kind === 'university'; });
    function group(title, list, render, emptyKey, href) {
      return '<div class="app-group">' +
        '<div class="spread" style="margin-bottom:1rem"><h3>' + M.t(title) + '</h3><span class="badge">' + list.length + '</span></div>' +
        (list.length ? '<div class="app-list">' + list.map(render).join('') + '</div>'
          : '<div class="empty-state" style="padding:1.5rem 0">' + M.icon('file', 36) + '<p>' + M.t(emptyKey) + '</p>' +
            '<a class="btn btn-outline btn-sm" style="margin-top:.8rem" href="' + href + '">' + M.t('op.browse') + '</a></div>') +
      '</div>';
    }
    return '<section class="card card-pad-lg" id="applications">' +
      '<div class="spread" style="margin-bottom:1.2rem"><h2 style="font-size:var(--step-1)">' + M.t('app.title') + '</h2></div>' +
      group('app.programs', progs, programApp, 'app.noPrograms', '/programs') +
      group('app.universities', uniApps, uniApp, 'app.noUnis', '/universities') +
    '</section>';
  }

  function replaceApp(updated) {
    applications = applications.map(function (a) { return a.id === updated.id ? updated : a; });
    paint();
  }

  function bindApplications(host) {
    host.querySelectorAll('[data-app]').forEach(function (card) {
      var id = +card.getAttribute('data-app');
      var fold = card.querySelector('[data-fold]');
      if (fold) fold.addEventListener('click', function () {
        var open = !card.classList.contains('is-open');
        card.classList.toggle('is-open', open);
        fold.setAttribute('aria-expanded', String(open));
        setOpen(id, open);
      });
      card.querySelectorAll('[data-stage]').forEach(function (b) {
        b.addEventListener('click', function () {
          M.api('/api/applications/' + id, { method: 'PATCH', body: { stage: b.getAttribute('data-stage') } })
            .then(function (d) { if (d.ok) replaceApp(d.application); });
        });
      });
      card.querySelectorAll('[data-check]').forEach(function (box) {
        box.addEventListener('change', function () {
          var done = {}; done[box.getAttribute('data-check')] = box.checked;
          M.api('/api/applications/' + id, { method: 'PATCH', body: { done: done } })
            .then(function (d) { if (d.ok) replaceApp(d.application); });
        });
      });
      card.querySelectorAll('[data-upload]').forEach(function (input) {
        input.addEventListener('change', function () {
          if (!input.files[0]) return;
          var form = new FormData();
          form.append('req_key', input.getAttribute('data-upload'));
          form.append('file', input.files[0]);
          fetch('/api/applications/' + id + '/files', { method: 'POST', body: form, credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (d) {
              if (!d.ok) return M.toast(M.t('app.err.' + d.error, M.t('common.error')), 'error');
              M.toast(M.t('app.uploaded'), 'success', 1800);
              replaceApp(d.application);
            });
        });
      });
      card.querySelectorAll('[data-delfile]').forEach(function (b) {
        b.addEventListener('click', function () {
          M.api('/api/applications/' + id + '/files/' + b.getAttribute('data-delfile'), { method: 'DELETE' })
            .then(function (d) { if (d.ok) replaceApp(d.application); });
        });
      });
      var remove = card.querySelector('[data-remove]');
      if (remove) remove.addEventListener('click', function () {
        if (!window.confirm(M.t('app.removeConfirm'))) return;
        M.api('/api/applications/' + id, { method: 'DELETE' }).then(function (d) {
          if (d.ok) { applications = applications.filter(function (a) { return a.id !== id; }); paint(); }
        });
      });
      var submit = card.querySelector('[data-submit]');
      if (submit) submit.addEventListener('click', function () {
        M.api('/api/applications/' + id + '/submit', { body: {} }).then(function (d) {
          if (!d.ok) return M.toast(M.t('app.err.' + d.error, M.t('common.error')), 'error');
          M.toast(M.t('app.sent'), 'success', 3000);
          replaceApp(d.application);
        });
      });
    });
  }

  function planCard() {
    var plan = user.plan || 'free';
    var paid = plan !== 'free';
    return '<div class="card card-pad-lg plan-card' + (plan === 'navigator' ? ' plan-premium' : '') + '">' +
      '<p class="sum-title" style="margin-bottom:.6rem">' + M.t('account.plan') + '</p>' +
      '<div class="spread"><h2 style="font-size:var(--step-2)">' + M.t('pricing.' + plan + '.name') + '</h2>' +
        (paid ? '<span class="badge badge-success badge-dot">' + M.t('account.active') + '</span>' : '') + '</div>' +
      '<p class="muted" style="font-size:.88rem;margin-top:.5rem">' + M.t('pricing.' + plan + '.for') + '</p>' +
      (paid && user.plan_renews_at ? '<p class="field-hint" style="margin-top:.7rem">' + M.t('account.renews').replace('{date}', M.formatDate(user.plan_renews_at)) + '</p>' : '') +
      '<a class="btn ' + (paid ? 'btn-ghost' : 'btn-primary') + ' btn-block" style="margin-top:1.2rem" href="/pricing">' +
        M.t(paid ? 'account.changePlan' : 'account.upgrade.cta') + '</a>' +
      (paid ? '<button type="button" class="btn-link" data-cancel-plan style="margin-top:.8rem;display:inline-flex">' + M.t('account.upgrade.cancel') + '</button>' : '') +
    '</div>';
  }

  function tutorCard() {
    var tutor = user.tutor;
    if (tutor && tutor.status === 'approved') {
      return '<a class="card card-hover side-link" href="/tutor">' + M.icon('dashboard', 20) +
        '<span><b>' + M.t('nav.tutorDashboard') + '</b><span>' + M.t('account.tutorDash') + '</span></span></a>';
    }
    if (tutor && tutor.status === 'pending') {
      return '<div class="card side-link">' + M.icon('clock', 20) +
        '<span><b>' + M.t('apply.pending.title') + '</b><span>' + M.t('account.tutorPending') + '</span></span></div>';
    }
    return '<a class="card card-hover side-link" href="/tutors/apply">' + M.icon('userPlus', 20) +
      '<span><b>' + M.t('teachers.join.title') + '</b><span>' + M.t('account.tutorJoin') + '</span></span></a>';
  }

  function receiptsSection() {
    if (!orders.length) return '';
    return '<section class="card card-pad-lg">' +
      '<div class="spread" style="margin-bottom:1.2rem"><h2 style="font-size:var(--step-1)">' + M.t('account.receipts') + '</h2>' +
        '<span class="badge">' + orders.length + '</span></div>' +
      '<div class="receipt-list">' + orders.map(function (o) {
        var tone = o.status === 'paid' ? 'badge-success' : o.status === 'refunded' ? 'badge-accent' : '';
        return '<div class="receipt-row">' + M.icon('receipt', 18) +
          '<span class="receipt-main"><b>' + M.esc(o.description) + '</b><span>' + M.formatDate(o.paid_at || o.created_at) +
            ' · ' + M.esc(o.method_detail || '') + '</span></span>' +
          '<span class="badge ' + tone + '">' + M.t('account.order.' + o.status) + '</span>' +
          '<b class="receipt-amount">' + M.money(o.total_minor / 100) + '</b></div>';
      }).join('') + '</div></section>';
  }

  function profileCard() {
    return '<div class="card card-pad-lg" style="text-align:center">' +
      '<span class="avatar avatar-lg" style="margin-inline:auto">' + M.esc(user.initials) + '</span>' +
      '<h2 style="font-size:var(--step-1);margin-top:1.1rem">' + M.esc(user.first_name + ' ' + user.last_name) + '</h2>' +
      '<p class="dim" style="font-size:.87rem;margin-top:.3rem">' + M.esc(user.email) + '</p>' +
      (user.phone ? '<p class="dim" style="font-size:.87rem">' + M.esc(user.phone) + '</p>' : '') +
      '<div class="cluster" style="justify-content:center;margin-top:1.1rem">' +
        '<span class="badge ' + (user.plan === 'compass' ? 'badge-accent' : 'badge-brand') + '">' +
          M.t('account.plan.' + user.plan) + '</span>' +
        (user.verified ? '<span class="badge badge-success">' + M.icon('check', 12) +
          M.t('teachers.verified') + '</span>' : '') +
      '</div>' +
      '<p class="dim" style="font-size:.78rem;margin-top:1rem">' + M.t('account.member') + ' ' +
        M.formatDate(user.created_at) + '</p>' +
    '</div>';
  }

  function savedSection() {
    var saved = M.state.saved || [];
    var list = programs.filter(function (program) { return saved.indexOf(program.id) !== -1; });
    var body = list.length
      ? '<div class="grid grid-2">' + list.map(function (program) {
          var days = M.daysUntil(program.deadline);
          return '<div class="saved-item">' +
            '<a class="pin-result" href="/programs/' + encodeURIComponent(program.id) + '">' +
            '<span class="flag">' + program.flag + '</span>' +
            '<span style="min-width:0;flex:1"><h4>' + M.esc(M.pick(program.name)) + '</h4>' +
            '<p>' + M.t('programs.deadline') + ': ' + M.formatDate(program.deadline) +
            (days >= 0 ? ' · ' + days + ' ' + M.t('home.rail.days') : '') + '</p></span>' +
            '</a>' + savedActions(program.id, 'program') + '</div>';
        }).join('') + '</div>'
      : '<div class="empty-state">' + M.icon('bookmark', 42) + '<p>' + M.t('account.noSaved') + '</p></div>';

    return '<section class="card card-pad-lg">' +
      '<div class="spread" style="margin-bottom:1.2rem">' +
        '<h2 style="font-size:var(--step-1)">' + M.t('account.saved') + '</h2>' +
        '<span class="cluster" style="gap:.6rem"><span class="badge">' + list.length + '</span>' +
        (list.length ? '<a class="btn btn-primary btn-sm" href="/api/saved/programs.xlsx?lang=' + M.state.lang + '" download>' +
          M.icon('download', 16) + '<span>' + M.t('account.excel') + '</span></a>' : '') + '</span>' +
      '</div>' +
      (list.length ? '<p class="muted" style="font-size:.86rem;margin:-.4rem 0 1rem">' + M.t('account.excelProgramsNote') + '</p>' : '') +
      body +
    '</section>' + savedUniversitiesSection();
  }

  /* Saved universities, with the one-click Excel of everything about them */
  /* small buttons beside every saved item: start an application, or remove it */
  function savedActions(id, kind) {
    var applying = applications.some(function (a) { return a.kind === kind && a.item_id === id; });
    return '<span class="saved-actions">' +
      (applying ? '<span class="badge badge-success" title="' + M.esc(M.t('account.inApplications')) + '">' + M.icon('check', 13) + '</span>'
        : '<button type="button" class="saved-btn" data-start="' + M.esc(id) + '" data-kind="' + kind + '" title="' + M.esc(M.t('account.startApp')) + '" aria-label="' + M.esc(M.t('account.startApp')) + '">' + M.icon('send', 15) + '</button>') +
      '<button type="button" class="saved-btn saved-x" data-unsave="' + M.esc(id) + '" title="' + M.esc(M.t('account.unsave')) + '" aria-label="' + M.esc(M.t('account.unsave')) + '">×</button>' +
    '</span>';
  }

  function bindSaved(host) {
    host.querySelectorAll('[data-unsave]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-unsave');
        b.disabled = true;
        M.api('/api/saved', { body: { program_id: id } }).then(function (d) {
          if (!d.ok) { b.disabled = false; return; }
          M.state.saved = d.all || [];
          savedUnis = savedUnis.filter(function (u) { return u.id !== id; });
          paint();
        });
      });
    });
    host.querySelectorAll('[data-start]').forEach(function (b) {
      b.addEventListener('click', function () {
        b.disabled = true;
        M.api('/api/applications', { body: { kind: b.getAttribute('data-kind'), item_id: b.getAttribute('data-start') } }).then(function (d) {
          if (!d.ok) { b.disabled = false; M.toast(M.t('auth.error.generic'), 'error'); return; }
          if (d.application) applications = [d.application].concat(applications.filter(function (a) { return a.id !== d.application.id; }));
          M.toast(M.t('account.appStarted'), 'success');
          paint();
          var target = document.getElementById('applications');
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    });
  }

  /* GPA, test scores, grade, school: the student keeps them current (their school counsellor sees them) */
  var GRADES = ['grade-9', 'grade-10', 'grade-11', 'grade-12', 'bachelor', 'master', 'graduate', 'other'];
  function profileEditSection() {
    var field = function (key, label, value, extra) {
      return '<label class="field"><span class="field-label">' + M.t(label) + '</span>' +
        '<input class="input" data-pf="' + key + '" value="' + M.esc(value || '') + '" ' + (extra || '') + ' /></label>';
    };
    return '<section class="card card-pad-lg" id="my-profile">' +
      '<div class="spread" style="margin-bottom:1rem"><h2 style="font-size:var(--step-1)">' + M.t('account.myProfile') + '</h2></div>' +
      '<form id="profileEdit" class="grid grid-2" style="gap:.9rem">' +
        '<label class="field"><span class="field-label">' + M.t('cs.f.grade') + '</span><select class="select" data-pf="grade">' +
          '<option value="">—</option>' + GRADES.map(function (g) {
            return '<option value="' + g + '"' + (user.grade === g ? ' selected' : '') + '>' + M.esc(M.t('auth.grade.' + g)) + '</option>';
          }).join('') + '</select></label>' +
        field('school', 'cs.f.school', user.school, 'maxlength="120"') +
        field('gpa', 'cs.f.gpa', user.gpa, 'maxlength="30" placeholder="3.8 / 4.0 · 9.5 / 10"') +
        field('test_scores', 'cs.f.tests', user.test_scores, 'maxlength="160" placeholder="SAT 1450 · IELTS 7.5"') +
        field('city', 'account.city', user.city, 'maxlength="80"') +
        '<div style="display:flex;align-items:end"><button type="submit" class="btn btn-primary">' + M.t('account.saveProfile') + '</button></div>' +
      '</form></section>';
  }

  /* meetings with the student's school counsellors; who can see the student's file */
  function meetingsSection() {
    var counsellors = mySchool.counsellors || [];
    if (!counsellors.length && !meetings.length) return '';
    var rows = meetings.map(function (m) {
      var mineToConfirm = m.status === 'requested' && m.requested_by === 'counsellor';
      return '<div class="meet-row">' +
        '<span class="meet-when">' + M.icon('calendar', 16) + M.esc(m.starts_at.replace('T', ' ')) + ' · ' + m.minutes + ' min</span>' +
        '<span class="meet-who"><b>' + M.esc(m.counsellor) + '</b>' + (m.topic ? '<small>' + M.esc(m.topic) + '</small>' : '') + '</span>' +
        '<span class="badge ' + (m.status === 'confirmed' ? 'badge-success' : '') + '">' + M.t('cs.meet.' + m.status) + '</span>' +
        (mineToConfirm ? '<button type="button" class="btn btn-primary btn-sm" data-meet="' + m.id + '" data-status="confirmed">' + M.t('cs.confirm') + '</button>' : '') +
        (m.status !== 'cancelled' ? '<button type="button" class="btn btn-ghost btn-sm" data-meet="' + m.id + '" data-status="cancelled">' + M.t('cs.cancel') + '</button>' : '') +
      '</div>';
    }).join('');
    var min = new Date(Date.now() + 864e5).toISOString().slice(0, 16);
    return '<section class="card card-pad-lg" id="meetings">' +
      '<div class="spread" style="margin-bottom:.6rem"><h2 style="font-size:var(--step-1)">' + M.t('account.meetings') + '</h2><span class="badge">' + meetings.length + '</span></div>' +
      (counsellors.length ? '<p class="muted" style="font-size:.86rem">' + M.icon('shield', 14) + ' ' +
        M.esc(M.t('account.counsellorSees').replace('{names}', counsellors.map(function (c) { return c.first_name + ' ' + c.last_name; }).join(', '))) + '</p>' : '') +
      rows +
      (counsellors.length ? '<form class="cs-meet-form" id="askMeeting" style="margin-top:1rem">' +
        '<select class="input" id="amWho">' + counsellors.map(function (c) { return '<option value="' + c.id + '">' + M.esc(c.first_name + ' ' + c.last_name) + '</option>'; }).join('') + '</select>' +
        '<input class="input" type="datetime-local" id="amWhen" min="' + min + '" required />' +
        '<input class="input" id="amTopic" maxlength="200" placeholder="' + M.esc(M.t('cs.topic')) + '" />' +
        '<button type="submit" class="btn btn-primary">' + M.icon('calendar', 16) + M.t('account.askMeeting') + '</button></form>' : '') +
    '</section>';
  }

  function bindProfileAndMeetings(host) {
    var form = host.querySelector('#profileEdit');
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      var body = {};
      form.querySelectorAll('[data-pf]').forEach(function (n) { body[n.getAttribute('data-pf')] = n.value.trim(); });
      M.api('/api/auth/profile', { method: 'PATCH', body: body }).then(function (d) {
        if (!d.ok) { M.toast(M.t('auth.error.generic'), 'error'); return; }
        user = d.user; M.state.user = d.user;
        M.toast(M.t('account.profileSaved'), 'success');
      });
    });
    host.querySelectorAll('#meetings [data-meet]').forEach(function (b) {
      b.addEventListener('click', function () {
        b.disabled = true;
        M.api('/api/meetings/' + b.getAttribute('data-meet'), { method: 'PATCH', body: { status: b.getAttribute('data-status') } }).then(function (d) {
          if (!d.ok) { b.disabled = false; return; }
          meetings = meetings.map(function (m) { return m.id === d.meeting.id ? d.meeting : m; });
          paint();
        });
      });
    });
    var ask = host.querySelector('#askMeeting');
    if (ask) ask.addEventListener('submit', function (e) {
      e.preventDefault();
      M.api('/api/meetings', { body: { counsellor_id: +document.getElementById('amWho').value,
        starts_at: document.getElementById('amWhen').value, topic: document.getElementById('amTopic').value } }).then(function (d) {
        if (!d.ok) { M.toast(M.t('auth.error.generic'), 'error'); return; }
        meetings.push(d.meeting);
        M.toast(M.t('cs.sent'), 'success');
        paint();
      });
    });
  }

  function savedUniversitiesSection() {
    var body = savedUnis.length
      ? '<div class="grid grid-2">' + savedUnis.map(function (u) {
          return '<div class="saved-item">' +
            '<a class="pin-result" href="/universities/' + encodeURIComponent(u.id) + '">' +
            '<span class="flag">' + (u.flag || '') + '</span>' +
            '<span style="min-width:0;flex:1"><h4>' + M.esc(M.pick(u.name)) + '</h4>' +
            '<p>' + M.esc((u.city ? u.city + ', ' : '') + M.pick(u.country)) +
            (u.deadline ? ' · ' + M.t('programs.deadline') + ': ' + M.formatDate(u.deadline) : '') + '</p></span>' +
            '</a>' + savedActions(u.id, 'university') + '</div>';
        }).join('') + '</div>'
      : '<div class="empty-state">' + M.icon('cap', 42) + '<p>' + M.t('account.noSavedUnis') + '</p>' +
        '<a class="btn btn-outline" style="margin-top:1rem" href="/universities">' + M.t('nav.universities') + '</a></div>';
    return '<section class="card card-pad-lg" id="saved-universities">' +
      '<div class="spread" style="margin-bottom:1.2rem;gap:.8rem;flex-wrap:wrap">' +
        '<h2 style="font-size:var(--step-1)">' + M.t('account.savedUnis') + ' <span class="badge">' + savedUnis.length + '</span></h2>' +
        (savedUnis.length ? '<a class="btn btn-primary btn-sm" href="/api/saved/universities.xlsx?lang=' + M.state.lang + '" download>' +
          M.icon('download', 16) + '<span>' + M.t('account.excel') + '</span></a>' : '') +
      '</div>' +
      (savedUnis.length ? '<p class="muted" style="font-size:.86rem;margin:-.4rem 0 1rem">' + M.t('account.excelNote') + '</p>' : '') +
      body +
    '</section>';
  }

  function bookingsSection() {
    var body = bookings.length
      ? '<div class="stack" style="gap:.7rem">' + bookings.map(function (booking) {
          var tone = booking.status === 'confirmed' ? 'badge-success'
            : booking.status === 'declined' ? 'badge-danger' : 'badge-accent';
          return '<div class="pin-result" style="cursor:default">' +
            M.avatar(booking.teacher, 'avatar-sm') +
            '<span style="min-width:0;flex:1">' +
              '<h4>' + M.esc(M.pick(booking.teacher.name)) + '</h4>' +
              '<p>' + M.formatDate(booking.date) + ' · ' + M.esc(booking.time) +
                (booking.service ? ' · ' + M.esc(booking.service) : '') + '</p>' +
            '</span>' +
            '<span class="badge ' + tone + '">' + M.t('account.status.' + booking.status) + '</span>' +
          '</div>';
        }).join('') + '</div>'
      : '<div class="empty-state">' + M.icon('calendar', 42) + '<p>' + M.t('account.noBookings') + '</p>' +
        '<a class="btn btn-outline" style="margin-top:1rem" href="/teachers">' + M.t('home.cta.teachers') + '</a></div>';

    return '<section class="card card-pad-lg">' +
      '<div class="spread" style="margin-bottom:1.2rem">' +
        '<h2 style="font-size:var(--step-1)">' + M.t('account.bookings') + '</h2>' +
        '<span class="badge">' + bookings.length + '</span>' +
      '</div>' + body +
    '</section>';
  }

  /* permanent account deletion: the password is typed again before anything goes */
  function deleteSection() {
    return '<section class="card card-pad-lg danger-zone" id="delete-account">' +
      '<h2 style="font-size:var(--step-1);margin-bottom:.4rem">' + M.t('account.delete.title') + '</h2>' +
      '<p class="muted" style="font-size:.9rem;margin-bottom:1rem">' + M.t('account.delete.body') + '</p>' +
      '<form id="deleteAccount" style="display:flex;gap:.6rem;flex-wrap:wrap;align-items:end">' +
        '<label class="field" style="flex:1;min-width:200px"><span class="field-label">' + M.t('account.delete.password') + '</span>' +
        '<input class="input" type="password" id="delPass" autocomplete="current-password" required /></label>' +
        '<button type="submit" class="btn btn-danger">' + M.t('account.delete.button') + '</button>' +
      '</form></section>';
  }

  function bindDelete(host) {
    var form = host.querySelector('#deleteAccount');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var pass = document.getElementById('delPass').value;
      if (!pass || !window.confirm(M.t('account.delete.confirm'))) return;
      M.api('/api/auth/delete', { body: { password: pass } }).then(function (d) {
        if (!d.ok) {
          M.toast(M.t(d.error === 'bad_credentials' ? 'account.delete.wrong' : 'auth.error.generic'), 'error');
          return;
        }
        M.state.user = null;
        window.location.href = '/?deleted=1';
      });
    });
  }

  function paint() {
    var host = document.getElementById('accountRoot');
    host.innerHTML =
      '<aside class="stack" style="gap:var(--space-4)">' + profileCard() + planCard() + tutorCard() + '</aside>' +
      '<div class="stack" style="gap:var(--space-5)">' + applicationsSection() + meetingsSection() + bookingsSection() + savedSection() + profileEditSection() + receiptsSection() + deleteSection() + '</div>';
    bindApplications(host);
    bindDelete(host);
    bindSaved(host);
    bindProfileAndMeetings(host);
    // long lists fold away with the button at the top right of each card
    host.querySelectorAll('.stack > section.card').forEach(function (card, i) {
      M.collapsible(card, 'account.' + (card.id || i));
    });

    var cancel = host.querySelector('[data-cancel-plan]');
    if (cancel) {
      cancel.addEventListener('click', function () {
        if (!window.confirm(M.t('account.cancelConfirm'))) return;
        M.api('/api/checkout/plan', { body: { plan: 'free' } }).then(function (data) {
          if (!data.ok) { M.toast(M.t('auth.error.generic'), 'error'); return; }
          user.plan = 'free';
          paint();
          M.toast(M.t('account.cancelled'), 'success');
        });
      });
    }
  }

  function init() {
    M.loadUser().then(function (current) {
      if (!current) {
        window.location.href = '/login?next=' + encodeURIComponent('/account');
        return;
      }
      user = current;
      Promise.all([
        M.api('/api/programs'),
        M.api('/api/bookings'),
        M.api('/api/orders'),
        M.api('/api/applications'),
        M.api('/api/saved/universities').catch(function () { return {}; }),
        M.api('/api/meetings').catch(function () { return {}; }),
        M.api('/api/counselling').catch(function () { return {}; })
      ]).then(function (results) {
        meetings = results[5].meetings || [];
        var cc = results[6] || {};
        mySchool = { schools: (cc.me && cc.me.schools) || [], counsellors: cc.school_counsellors || [] };
        programs = results[0].programs || [];
        bookings = results[1].bookings || [];
        orders = results[2].orders || [];
        applications = results[3].applications || [];
        savedUnis = results[4].universities || [];
        paint();
        if (['#applications', '#saved-universities', '#meetings', '#my-profile'].indexOf(window.location.hash) !== -1) {
          var target = document.getElementById(window.location.hash.slice(1));
          if (target) target.scrollIntoView({ block: 'start' });
        }
      });
    });

    window.addEventListener('meridian:lang', function () { if (user) paint(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
