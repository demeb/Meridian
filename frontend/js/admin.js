/* ============================================================
   Meridian — internal data viewer
   Reads the same SQLite file the API writes to.
   ============================================================ */
(function () {
  'use strict';

  function table(title, rows, columns) {
    if (!rows.length) {
      return '<section class="card card-pad-lg"><h2 style="font-size:var(--step-1)">' + title +
        '</h2><div class="empty-state" style="margin-top:1rem"><p>Nothing yet.</p></div></section>';
    }
    return '<section class="card card-pad-lg">' +
      '<div class="spread" style="margin-bottom:1.2rem">' +
        '<h2 style="font-size:var(--step-1)">' + title + '</h2>' +
        '<span class="badge badge-brand">' + rows.length + '</span>' +
      '</div>' +
      '<div style="overflow-x:auto">' +
        '<table style="width:100%;border-collapse:collapse;font-size:.85rem">' +
          '<thead><tr>' + columns.map(function (col) {
            return '<th style="text-align:left;padding:.6rem .8rem;border-bottom:1px solid var(--border-strong);' +
              'font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:var(--text-dim)">' +
              col.label + '</th>';
          }).join('') + '</tr></thead>' +
          '<tbody>' + rows.map(function (row) {
            return '<tr>' + columns.map(function (col) {
              var value = col.render ? col.render(row) : row[col.key];
              return '<td style="padding:.7rem .8rem;border-bottom:1px solid var(--divider);vertical-align:top">' +
                (value === null || value === undefined || value === '' ? '<span class="dim">—</span>' : value) + '</td>';
            }).join('') + '</tr>';
          }).join('') + '</tbody>' +
        '</table>' +
      '</div>' +
    '</section>';
  }

  function money(minor) { return M.money((minor || 0) / 100); }

  function paint(data) {
    var host = document.getElementById('adminRoot');
    var c = data.counts;
    var mail = data.mail || {};
    var mailBanner = mail.configured
      ? (mail.last_error
          ? '<div class="test-banner" style="border-color:var(--danger)">' + M.icon('alert', 17) + '<span><b>Email is failing:</b> ' + M.esc(mail.last_error) + '</span></div>'
          : '<div class="test-banner" style="border-color:var(--success)">' + M.icon('checkCircle', 17) + '<span>Email is live — codes and receipts go to real inboxes.</span></div>')
      : '<div class="test-banner">' + M.icon('info', 17) + '<span><b>Email is not set up yet.</b> Messages are saved in <span class="mono">backend/outbox/</span>. Run <span class="mono">python3 tools/setup_email.py</span> to connect Gmail.</span></div>';

    host.innerHTML = mailBanner +
      '<div class="grid grid-4" style="margin-bottom:1.2rem">' +
        [['Accounts', c.users], ['Verified', c.verified], ['Tutors live', c.tutors], ['Applications waiting', c.pending_tutors]]
        .map(function (p) { return '<div class="card"><div class="stat-value">' + p[1] + '</div><div class="stat-label">' + p[0] + '</div></div>'; }).join('') +
      '</div>' +
      '<div class="grid grid-4" style="margin-bottom:2rem">' +
        [['Gross paid', money(c.gross_minor)], ['Meridian revenue', money(c.revenue_minor)], ['Owed to tutors', money(c.payouts_minor)], ['Lessons booked', c.bookings]]
        .map(function (p) { return '<div class="card"><div class="stat-value" style="font-size:var(--step-2)">' + p[1] + '</div><div class="stat-label">' + p[0] + '</div></div>'; }).join('') +
      '</div>' +
      '<div class="stack" style="gap:var(--space-5)">' +
        '<section class="card card-pad-lg" id="weeklyReport"><h2 style="font-size:var(--step-1)">This week on Meridian</h2>' +
        '<p class="muted" style="font-size:.88rem;margin-top:.3rem">Live numbers for the last 7 days. Every 7 days a full report is saved in <span class="mono">backend/reports/</span> and emailed to the team inbox.</p>' +
        '<div id="reportBody" style="margin-top:1rem"><div class="skeleton" style="height:120px"></div></div></section>' +
        '<section class="card card-pad-lg"><h2 style="font-size:var(--step-1)">Student applications</h2>' +
        '<p class="muted" style="font-size:.88rem;margin-top:.3rem">Applications students track on Meridian. University files marked <b>review</b> are complete and waiting for the team.</p>' +
        '<div id="appList" style="margin-top:1rem"><div class="skeleton" style="height:60px"></div></div></section>' +
        '<section class="card card-pad-lg" id="discoveries"><h2 style="font-size:var(--step-1)">Discoveries</h2>' +
        '<p class="muted" style="font-size:.88rem;margin-top:.3rem">New programmes found by the research agents. Nothing goes live until you approve it. Run the agents with <span class="mono">python3 tools/agents/discover.py</span>.</p>' +
        '<div id="discoveryList" style="margin-top:1rem"><div class="skeleton" style="height:60px"></div></div></section>' +
        table('Tutors', data.tutors, [
          { label: '', render: function (r) { return M.avatar({ photo: r.photo, initials: (M.pick(r.name) || '?').split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2) }, 'avatar-sm'); } },
          { label: 'Name', render: function (r) { return '<b>' + M.esc(M.pick(r.name)) + '</b><br><span class="dim">' + M.esc(M.pick(r.headline)) + '</span>'; } },
          { label: 'Email', render: function (r) { return M.esc(r.email || '—'); } },
          { label: 'Price', render: function (r) { return r.price ? money(Math.round(r.price * 100)) + ' → ' + money(Math.round(r.price * 110)) : '—'; } },
          { label: 'Status', render: function (r) {
              var tone = r.status === 'approved' ? 'badge-success' : r.status === 'pending' ? 'badge-accent' : 'badge-danger';
              return '<span class="badge ' + tone + '">' + r.status + '</span>';
            } },
          { label: '', render: function (r) {
              var view = '<button class="btn btn-ghost btn-sm" data-view="' + r.id + '">Application</button>';
              if (r.status !== 'pending') return view;
              return '<span class="cluster" style="flex-wrap:nowrap">' + view + '<button class="btn btn-primary btn-sm" data-approve="' + r.id + '">Approve</button>' +
                '<button class="btn btn-ghost btn-sm" data-reject="' + r.id + '">Reject</button></span>';
            } }
        ]) +
        table('Payments', data.orders, [
          { label: 'Order', render: function (r) { return '<span class="mono">' + M.esc(r.id) + '</span>'; } },
          { label: 'Item', render: function (r) { return M.esc(r.description); } },
          { label: 'Method', render: function (r) { return M.esc(r.method_detail || r.method || ''); } },
          { label: 'Total', render: function (r) { return money(r.total_minor); } },
          { label: 'Meridian fee', render: function (r) { return r.kind === 'lesson' ? money(r.fee_minor) : money(r.total_minor); } },
          { label: 'Status', render: function (r) { return '<span class="badge">' + M.esc(r.status) + '</span>'; } }
        ]) +
        table('Accounts', data.users, [
          { label: 'ID', key: 'id' },
          { label: 'Name', render: function (r) { return M.esc(r.first_name + ' ' + r.last_name); } },
          { label: 'Email', render: function (r) { return M.esc(r.email); } },
          { label: 'Stage', render: function (r) { return M.esc(r.grade || ''); } },
          { label: 'Country', render: function (r) { return M.esc(r.country || ''); } },
          { label: 'Interests', render: function (r) { return '<span class="dim">' + M.esc((r.interests || '').replace(/,/g, ', ')) + '</span>'; } },
          { label: 'Verified', render: function (r) { return r.verified ? '<span class="badge badge-success">yes</span>' : '<span class="badge badge-danger">no</span>'; } },
          { label: 'Plan', render: function (r) { return '<span class="badge">' + M.esc(r.plan) + '</span>'; } },
          { label: 'Role', render: function (r) { return M.esc(r.role || 'student'); } }
        ]) +
        table('Lessons', data.bookings, [
          { label: 'ID', key: 'id' },
          { label: 'Student', key: 'user_id' },
          { label: 'Tutor', render: function (r) { return M.esc(r.teacher_id); } },
          { label: 'When', render: function (r) { return M.esc(r.date + ' ' + r.time); } },
          { label: 'Service', render: function (r) { return M.esc(r.service || ''); } },
          { label: 'Paid', render: function (r) { return r.total_minor ? money(r.total_minor) : '—'; } },
          { label: 'Status', render: function (r) { return '<span class="badge">' + M.esc(r.status) + '</span>'; } }
        ]) +
        table('Partnership enquiries', data.inquiries, [
          { label: 'Company', render: function (r) { return M.esc(r.company); } },
          { label: 'Contact', render: function (r) { return M.esc(r.contact_name); } },
          { label: 'Email', render: function (r) { return M.esc(r.email); } },
          { label: 'Type', render: function (r) { return M.esc(r.kind || ''); } },
          { label: 'Message', render: function (r) { return '<span style="display:block;max-width:360px">' + M.esc(r.message) + '</span>'; } }
        ]) +
      '</div>';

    loadDiscoveries();
    loadReport();
    loadApplications();
    host.querySelectorAll('[data-view]').forEach(function (button) {
      button.addEventListener('click', function () { showApplication(button.getAttribute('data-view')); });
    });
    host.querySelectorAll('[data-approve],[data-reject]').forEach(function (button) {
      button.addEventListener('click', function () {
        var id = button.getAttribute('data-approve') || button.getAttribute('data-reject');
        var action = button.hasAttribute('data-approve') ? 'approve' : 'reject';
        button.disabled = true;
        M.api('/api/admin/tutors/' + encodeURIComponent(id) + '/' + action + '?token=' + encodeURIComponent(token), { method: 'POST' })
          .then(function (res) {
            if (!res.ok) { M.toast('Could not ' + action + '.', 'error'); button.disabled = false; return; }
            M.toast(action === 'approve' ? 'Approved — the tutor has been emailed.' : 'Rejected.', 'success');
            load(token);
          });
      });
    });
  }

  var token = '';

  function bars(title, obj) {
    var entries = Array.isArray(obj) ? obj.map(function (r) { return [r.name || r.q, r.count]; }) : Object.keys(obj || {}).map(function (k) { return [k, obj[k]]; });
    if (!entries.length) return '<div class="rep-block"><h4>' + title + '</h4><p class="dim">Nothing yet.</p></div>';
    var max = Math.max.apply(null, entries.map(function (e) { return e[1]; }));
    return '<div class="rep-block"><h4>' + title + '</h4>' + entries.slice(0, 8).map(function (e) {
      return '<div class="rep-bar"><span>' + M.esc(String(e[0])) + '</span><i style="--w:' + Math.round(e[1] / max * 100) + '%"></i><b>' + e[1] + '</b></div>';
    }).join('') + '</div>';
  }

  function loadReport() {
    M.api('/api/admin/report?token=' + encodeURIComponent(token)).then(function (res) {
      var host = document.getElementById('reportBody');
      if (!host || !res.ok) return;
      var r = res.live, ev = r.events || {};
      host.innerHTML = '<div class="grid grid-4" style="margin-bottom:1.2rem">' +
        [['Visitors', r.visitors], ['New sign-ups', r.signups], ['Programme views', ev.view_program || 0], ['Registration clicks', (ev.apply_click || 0) + (ev.official_click || 0)],
         ['Searches', ev.search || 0], ['University views', ev.view_university || 0], ['Applications started', r.applications_started], ['Sent for review', r.applications_sent_for_review]]
        .map(function (p) { return '<div class="card"><div class="stat-value" style="font-size:var(--step-2)">' + p[1] + '</div><div class="stat-label">' + p[0] + '</div></div>'; }).join('') +
        '</div><div class="rep-grid">' +
        bars('Most viewed programmes', r.top_programs) + bars('Most clicked registrations', r.top_apply_clicks.concat(r.top_official_clicks)) +
        bars('Most viewed universities', r.top_universities) + bars('Top searches', r.top_searches) +
        bars('New users by age', r.signup_ages) + bars('All users by age', r.all_user_ages) +
        bars('New users by country', r.signup_countries) + bars('Saved', r.top_saves) +
        '</div>' +
        (res.past.length ? '<p class="dim" style="margin-top:1rem;font-size:.84rem">Saved reports: ' + res.past.map(function (p) { return p.period_end; }).join(', ') + '</p>' : '');
    });
  }

  function loadApplications() {
    M.api('/api/admin/applications?token=' + encodeURIComponent(token)).then(function (res) {
      var host = document.getElementById('appList');
      if (!host) return;
      var items = res.applications || [];
      if (!items.length) { host.innerHTML = '<div class="empty-state"><p>No applications yet.</p></div>'; return; }
      host.innerHTML = items.map(function (a) {
        var name = a.item ? (a.item.name && (a.item.name.en || a.item.name)) : a.item_id;
        return '<div class="disc-row"><span class="disc-flag">' + ((a.item && a.item.flag) || '') + '</span>' +
          '<div class="disc-main"><b>' + M.esc(name) + '</b> <span class="badge">' + M.esc(a.kind) + '</span> ' +
          '<span class="badge ' + (a.stage === 'review' ? 'badge-accent' : '') + '">' + M.esc(a.stage) + '</span>' +
          '<p>' + M.esc(a.student.name) + ' · ' + M.esc(a.student.email) + ' · ' + a.progress.done + '/' + a.progress.total + ' items · ' +
            (a.files || []).length + ' files</p></div>' +
          (a.kind === 'university' && a.stage === 'review'
            ? '<div class="disc-act"><button type="button" class="btn btn-primary btn-sm" data-stage-set="' + a.id + '">Mark submitted</button></div>' : '') +
        '</div>';
      }).join('');
      host.querySelectorAll('[data-stage-set]').forEach(function (b) {
        b.addEventListener('click', function () {
          M.api('/api/admin/applications/' + b.getAttribute('data-stage-set') + '/stage?token=' + encodeURIComponent(token), { body: { stage: 'submitted' } })
            .then(function () { loadApplications(); });
        });
      });
    });
  }

  function loadDiscoveries() {
    M.api('/api/admin/discoveries?token=' + encodeURIComponent(token)).then(function (res) {
      var list = document.getElementById('discoveryList');
      if (!list) return;
      var items = res.pending || [];
      if (!items.length) { list.innerHTML = '<div class="empty-state"><p>No new discoveries waiting for review.</p></div>'; return; }
      list.innerHTML = items.map(function (r) {
        return '<div class="disc-row"><span class="disc-flag">' + r.flag + '</span>' +
          '<div class="disc-main"><b>' + M.esc(r.name.en) + '</b> <span class="badge">' + M.esc(r.family) + '</span> <span class="badge badge-accent">score ' + r.score + '</span>' +
          '<p>' + M.esc(r.org) + ' · ' + M.esc(r.country.en) + ' · deadline ' + M.esc(r.deadline || '—') + ' (' + M.esc(r.deadline_note || '') + ')</p>' +
          '<p class="dim">' + M.esc(r.summary.en) + '</p>' +
          '<p class="dim" style="font-size:.76rem">Found by ' + M.esc(r.found_by || 'agent') + ' · <a href="' + M.esc(r.url) + '" target="_blank" rel="noopener">official page</a>' +
            (r.sources || []).slice(0, 2).map(function (u) { return ' · <a href="' + M.esc(u) + '" target="_blank" rel="noopener">source</a>'; }).join('') + '</p></div>' +
          '<div class="cluster" style="flex-wrap:nowrap"><button class="btn btn-primary btn-sm" data-disc-ok="' + M.esc(r.id) + '">Publish</button>' +
          '<button class="btn btn-ghost btn-sm" data-disc-no="' + M.esc(r.id) + '">Reject</button></div></div>';
      }).join('');
      list.querySelectorAll('[data-disc-ok],[data-disc-no]').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-disc-ok') || b.getAttribute('data-disc-no');
          var action = b.hasAttribute('data-disc-ok') ? 'approve' : 'reject';
          b.disabled = true;
          M.api('/api/admin/discoveries/' + encodeURIComponent(id) + '/' + action + '?token=' + encodeURIComponent(token), { method: 'POST' })
            .then(function (res2) {
              if (!res2.ok) { M.toast('Could not ' + action + '.', 'error'); b.disabled = false; return; }
              M.toast(action === 'approve' ? 'Published to the programme globe.' : 'Rejected.', 'success');
              loadDiscoveries();
            });
        });
      });
    });
  }

  function showApplication(id) {
    M.api('/api/admin/tutors/' + encodeURIComponent(id) + '?token=' + encodeURIComponent(token)).then(function (res) {
      if (!res.ok) { M.toast('Could not load the application.', 'error'); return; }
      var t = res.tutor;
      var pick = function (v) { return M.esc(M.pick(v) || ''); };
      var list = function (a) { return (a || []).map(function (x) { return '<span class="badge">' + M.esc(x) + '</span>'; }).join(' '); };
      var edu = (t.education || []).map(function (e) {
        return '<li>' + M.esc(e.school) + ' — ' + pick(e.degree) + ' <span class="dim">' + M.esc(e.years || '') + '</span></li>';
      }).join('');
      var scrim = document.createElement('div');
      scrim.className = 'modal-scrim';
      scrim.innerHTML = '<div class="modal app-modal" role="dialog" aria-modal="true">' +
        '<button type="button" class="modal-close" aria-label="Close">' + M.icon('x', 18) + '</button>' +
        '<div class="spread" style="justify-content:flex-start;gap:1rem">' + M.avatar(t, 'avatar-lg') +
          '<div><h2 style="font-size:var(--step-2)">' + pick(t.name) + '</h2><p class="tc-role">' + pick(t.headline) + '</p>' +
          '<p class="dim" style="font-size:.8rem">Status: <b>' + M.esc(t.status) + '</b> · submitted ' + M.esc(t.submitted_at || '—') + '</p></div></div>' +
        (t.account ? '<dl class="app-dl"><dt>Account</dt><dd>' + M.esc(t.account.name) + ' · <a href="mailto:' + M.esc(t.account.email) + '">' + M.esc(t.account.email) + '</a>' + (t.account.phone ? ' · ' + M.esc(t.account.phone) : '') + '</dd>' : '<dl class="app-dl">') +
        '<dt>Short intro</dt><dd>' + pick(t.intro) + '</dd>' +
        '<dt>Biography</dt><dd>' + pick(t.bio) + '</dd>' +
        '<dt>Subjects</dt><dd>' + list(t.subjects) + '</dd>' +
        '<dt>Admissions systems</dt><dd>' + list(t.regions) + '</dd>' +
        '<dt>Languages</dt><dd>' + list(t.languages) + '</dd>' +
        '<dt>Experience</dt><dd>' + M.esc(String(t.experience || 0)) + ' years</dd>' +
        '<dt>Location</dt><dd>' + (t.flag || '') + ' ' + pick(t.city) + ', ' + pick(t.country) + '</dd>' +
        '<dt>Education</dt><dd><ul>' + (edu || '<li>—</li>') + '</ul></dd>' +
        '<dt>Price</dt><dd>' + M.money(t.price) + ' per hour (students see ' + M.money(Math.round(t.price * 110) / 100) + ')</dd>' +
        '<dt>Photo file</dt><dd class="mono">backend' + M.esc(t.photo || '') + '</dd></dl></div>';
      document.body.appendChild(scrim);
      requestAnimationFrame(function () { scrim.classList.add('is-open'); });
      var close = function () { scrim.classList.remove('is-open'); setTimeout(function () { scrim.remove(); }, 250); };
      scrim.addEventListener('click', function (e) { if (e.target === scrim || e.target.closest('.modal-close')) close(); });
    });
  }
  function load(value) {
    token = value;
    M.api('/api/admin/overview?token=' + encodeURIComponent(value)).then(function (data) {
      if (!data.ok) {
        M.toast('That token was rejected.', 'error');
        return;
      }
      try { sessionStorage.setItem('meridian.admin', value); } catch (e) {}
      document.getElementById('tokenForm').hidden = true;
      paint(data.data);
    });
  }

  function init() {
    var form = document.getElementById('tokenForm');
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      load(document.getElementById('adminToken').value.trim());
    });
    var remembered = null;
    try { remembered = sessionStorage.getItem('meridian.admin'); } catch (e) {}
    if (remembered) load(remembered);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
