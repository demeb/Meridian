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

  function programApp(app) {
    var item = app.item || {};
    return '<article class="app-card" data-app="' + app.id + '">' +
      '<div class="app-head">' +
        '<span class="app-flag">' + (item.flag || '') + '</span>' +
        '<a class="app-title" href="' + M.esc(item.url || '#') + '">' + M.esc(itemName(app)) + '</a>' +
        countdownBadge(item.deadline) +
      '</div>' +
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
    return '<article class="app-card app-uni" data-app="' + app.id + '">' +
      '<div class="app-head">' +
        '<span class="app-flag">' + (item.flag || '') + '</span>' +
        '<a class="app-title" href="' + M.esc(item.url || '#') + '">' + M.esc(itemName(app)) + '</a>' +
        '<span class="badge ' + (locked ? 'badge-brand' : '') + '">' + M.t('app.stage.' + app.stage) + '</span>' +
      '</div>' +
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
          return '<a class="pin-result" href="/programs/' + encodeURIComponent(program.id) + '">' +
            '<span class="flag">' + program.flag + '</span>' +
            '<span style="min-width:0;flex:1"><h4>' + M.esc(M.pick(program.name)) + '</h4>' +
            '<p>' + M.t('programs.deadline') + ': ' + M.formatDate(program.deadline) +
            (days >= 0 ? ' · ' + days + ' ' + M.t('home.rail.days') : '') + '</p></span>' +
          '</a>';
        }).join('') + '</div>'
      : '<div class="empty-state">' + M.icon('bookmark', 42) + '<p>' + M.t('account.noSaved') + '</p></div>';

    return '<section class="card card-pad-lg">' +
      '<div class="spread" style="margin-bottom:1.2rem">' +
        '<h2 style="font-size:var(--step-1)">' + M.t('account.saved') + '</h2>' +
        '<span class="badge">' + list.length + '</span>' +
      '</div>' + body +
    '</section>' + savedUniversitiesSection();
  }

  /* Saved universities, with the one-click Excel of everything about them */
  function savedUniversitiesSection() {
    var body = savedUnis.length
      ? '<div class="grid grid-2">' + savedUnis.map(function (u) {
          return '<a class="pin-result" href="/universities/' + encodeURIComponent(u.id) + '">' +
            '<span class="flag">' + (u.flag || '') + '</span>' +
            '<span style="min-width:0;flex:1"><h4>' + M.esc(M.pick(u.name)) + '</h4>' +
            '<p>' + M.esc((u.city ? u.city + ', ' : '') + M.pick(u.country)) +
            (u.deadline ? ' · ' + M.t('programs.deadline') + ': ' + M.formatDate(u.deadline) : '') + '</p></span>' +
          '</a>';
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

  function paint() {
    var host = document.getElementById('accountRoot');
    host.innerHTML =
      '<aside class="stack" style="gap:var(--space-4)">' + profileCard() + planCard() + tutorCard() + '</aside>' +
      '<div class="stack" style="gap:var(--space-5)">' + applicationsSection() + bookingsSection() + savedSection() + receiptsSection() + '</div>';
    bindApplications(host);
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
        M.api('/api/saved/universities').catch(function () { return {}; })
      ]).then(function (results) {
        programs = results[0].programs || [];
        bookings = results[1].bookings || [];
        orders = results[2].orders || [];
        applications = results[3].applications || [];
        savedUnis = results[4].universities || [];
        paint();
        if (window.location.hash === '#applications' || window.location.hash === '#saved-universities') {
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
