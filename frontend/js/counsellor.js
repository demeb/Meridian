/* ============================================================
   Meridian — school counsellor: my students
   Every student of the counsellor's partner school, their GPA,
   tests, applications and saved universities, and meetings.
   ============================================================ */
(function () {
  'use strict';

  var data = null;        // {school, students}
  var meetings = [];
  var openId = null;
  var detail = null;
  var filter = 'all';
  var query = '';
  var sample = false;

  /* shown only when the school has no students yet, clearly labelled as a sample */
  var SAMPLE = {
    student: { id: 0, name: 'Nino Example', email: 'student@example.com', grade: '12', gpa: '3.8 / 4.0',
      test_scores: 'SAT 1420 · IELTS 7.5', country: 'GE', city: 'Tbilisi', plan: 'compass', verified: true,
      last_login_at: null, applications: 3, universities: 2, submitted: 1, progress: { done: 9, total: 17 }, saved: 6,
      profile: { phone: '', school: 'Meridian Demo School', interests: ['economics', 'computer-science'], target_regions: ['europe'] } },
    applications: [
      { kind: 'university', stage: 'documents', progress: { done: 4, total: 7 }, files: [],
        item: { name: { en: 'IE University' }, flag: '🇪🇸', deadline: '2027-01-15', url: '/universities/ie-university' },
        checklist: [{ label: { en: 'Secondary school transcripts' }, done: true }, { label: { en: 'English test (IELTS/TOEFL)' }, done: true },
          { label: { en: 'Personal statement' }, done: false }] },
      { kind: 'university', stage: 'submitted', progress: { done: 5, total: 5 }, files: [],
        item: { name: { en: 'LUT University' }, flag: '🇫🇮', deadline: null, url: '/universities/lut-university' }, checklist: [] },
      { kind: 'program', stage: 'preparing', progress: { done: 0, total: 5 }, files: [],
        item: { name: { en: 'FLEX Global (Future Leaders Exchange)' }, flag: '🇺🇸', deadline: null, url: '/programs/flex-global' }, checklist: [] }
    ],
    saved: [{ name: { en: 'Bocconi University' }, flag: '🇮🇹', url: '/universities', kind: 'university' }],
    meetings: []
  };

  function root() { return document.getElementById('csRoot'); }

  function gradeLabel(g) {
    if (!g) return '';
    var t = M.t('auth.grade.' + g);
    return t.indexOf('auth.') === 0 ? g : t;
  }

  function when(iso) {
    if (!iso) return '—';
    var d = new Date(iso.replace(' ', 'T'));
    return isNaN(d) ? iso : d.toLocaleString(M.state.lang === 'ka' ? 'ka-GE' : M.state.lang === 'ar' ? 'ar' : 'en-GB',
      { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function bar(p) {
    var pct = p && p.total ? Math.round(p.done / p.total * 100) : 0;
    return '<div class="progress-line"><i style="width:' + pct + '%"></i></div>';
  }

  /* ---------------------------------------------------------- list */
  function visible() {
    var list = sample ? [SAMPLE.student] : data.students;
    return list.filter(function (s) {
      if (query && (s.name + ' ' + s.email).toLowerCase().indexOf(query) === -1) return false;
      if (filter === 'applying') return s.applications > 0;
      if (filter === 'none') return s.applications === 0;
      if (filter === 'submitted') return s.submitted > 0;
      return true;
    });
  }

  function studentRow(s) {
    return '<button type="button" class="cs-row' + (openId === s.id ? ' is-open' : '') + '" data-student="' + s.id + '">' +
      '<span class="avatar avatar-sm">' + M.esc(s.name.split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase()) + '</span>' +
      '<span class="cs-main"><b>' + M.esc(s.name) + '</b><small>' +
        [gradeLabel(s.grade), s.gpa ? 'GPA ' + M.esc(s.gpa) : '', s.test_scores ? M.esc(s.test_scores) : ''].filter(Boolean).join(' · ') +
      '</small>' + bar(s.progress) + '</span>' +
      '<span class="cs-meta"><b>' + s.applications + '</b><small>' + M.t('cs.apps') + '</small></span>' +
    '</button>';
  }

  function meetingsCard() {
    var upcoming = meetings.filter(function (m) { return m.status !== 'cancelled'; });
    if (!upcoming.length) return '';
    return '<section class="card card-pad-lg" id="meetings"><h2 class="op-h2">' + M.t('cs.meetings') + '</h2>' +
      upcoming.map(meetingRow).join('') + '</section>';
  }

  function meetingRow(m) {
    var mineToConfirm = m.status === 'requested' && m.requested_by === 'student';
    return '<div class="meet-row">' +
      '<span class="meet-when">' + M.icon('calendar', 16) + M.esc(when(m.starts_at)) + ' · ' + m.minutes + ' min</span>' +
      '<span class="meet-who"><b>' + M.esc(m.student) + '</b>' + (m.topic ? '<small>' + M.esc(m.topic) + '</small>' : '') + '</span>' +
      '<span class="badge ' + (m.status === 'confirmed' ? 'badge-success' : '') + '">' + M.t('cs.meet.' + m.status) + '</span>' +
      (mineToConfirm ? '<button type="button" class="btn btn-primary btn-sm" data-meet="' + m.id + '" data-status="confirmed">' + M.t('cs.confirm') + '</button>' : '') +
      (m.status !== 'cancelled' ? '<button type="button" class="btn btn-ghost btn-sm" data-meet="' + m.id + '" data-status="cancelled">' + M.t('cs.cancel') + '</button>' : '') +
    '</div>';
  }

  function paint() {
    var list = visible();
    var total = sample ? 1 : data.students.length;
    document.getElementById('csLede').textContent = M.t('cs.lede').replace('{school}', data.school || '');
    var empty = !data.students.length && !sample;
    root().innerHTML =
      '<div class="cs-top">' +
        '<div class="cluster">' +
          '<span class="badge badge-brand">' + M.esc(data.school || '') + '</span>' +
          '<span class="badge">' + total + ' ' + M.t('cs.students') + '</span>' +
          (sample ? '<span class="badge badge-accent">' + M.t('cs.sampleBadge') + '</span>' : '') +
        '</div>' +
        '<a class="btn btn-outline btn-sm" href="/counselling#board">' + M.icon('edit', 15) + M.t('cs.post') + '</a>' +
      '</div>' +
      meetingsCard() +
      (empty ? '<section class="card card-pad-lg"><div class="empty-state">' + M.icon('users', 42) +
          '<p>' + M.t('cs.empty') + '</p>' +
          '<button type="button" class="btn btn-outline btn-sm" style="margin-top:1rem" id="csSample">' + M.t('cs.showSample') + '</button></div></section>'
        : '<div class="cs-grid">' +
          '<aside class="card cs-list">' +
            '<input class="input" id="csSearch" placeholder="' + M.esc(M.t('cs.search')) + '" value="' + M.esc(query) + '" />' +
            '<div class="cluster cs-filters">' + ['all', 'applying', 'submitted', 'none'].map(function (f) {
              return '<button type="button" class="fchip' + (filter === f ? ' is-on' : '') + '" data-filter="' + f + '">' + M.t('cs.f.' + f) + '</button>';
            }).join('') + '</div>' +
            '<div class="cs-rows">' + (list.length ? list.map(studentRow).join('') : '<p class="dim">' + M.t('cs.noMatch') + '</p>') + '</div>' +
          '</aside>' +
          '<div id="csDetail">' + detailMarkup() + '</div>' +
        '</div>');
    bind();
  }

  /* ---------------------------------------------------------- one student */
  function detailMarkup() {
    if (!detail) return '<section class="card card-pad-lg"><div class="empty-state">' + M.icon('user', 40) + '<p>' + M.t('cs.pick') + '</p></div></section>';
    var s = detail.student, p = s.profile || {};
    var facts = [
      ['cs.f.email', '<a href="mailto:' + M.esc(s.email) + '">' + M.esc(s.email) + '</a>'],
      ['cs.f.grade', M.esc(gradeLabel(s.grade) || '—')],
      ['cs.f.gpa', M.esc(s.gpa || '—')],
      ['cs.f.tests', M.esc(s.test_scores || '—')],
      ['cs.f.school', M.esc(p.school || '—')],
      ['cs.f.place', M.esc([s.city, s.country].filter(Boolean).join(', ') || '—')],
      ['cs.f.goals', M.esc([].concat(p.target_regions || []).concat(p.interests || []).join(', ') || '—')],
      ['cs.f.plan', M.esc(M.t('account.plan.' + (s.plan || 'free')))],
      ['cs.f.lastSeen', M.esc(s.last_login_at ? M.formatDate(s.last_login_at.slice(0, 10)) : '—')]
    ];
    var apps = detail.applications.map(function (a) {
      var item = a.item || {};
      return '<div class="cs-app">' +
        '<div class="spread"><a href="' + M.esc(item.url || '#') + '" target="_blank" rel="noopener"><span class="flag">' + (item.flag || '') + '</span> ' +
          '<b>' + M.esc(M.pick(item.name) || '') + '</b></a>' +
          '<span class="badge badge-brand">' + M.t('app.stage.' + a.stage) + ' · ' + a.progress.done + '/' + a.progress.total + '</span></div>' +
        bar(a.progress) +
        '<small class="dim">' + (item.deadline ? M.t('uni.deadline') + ': ' + M.formatDate(item.deadline) : '') +
          ((a.files || []).length ? ' · ' + a.files.length + ' ' + M.t('cs.files') : '') + '</small>' +
        ((a.checklist || []).length ? '<ul class="cs-check">' + a.checklist.map(function (c) {
          return '<li class="' + (c.done ? 'is-done' : '') + '">' + M.icon(c.done ? 'checkCircle' : 'file', 14) + M.esc(M.pick(c.label)) + '</li>';
        }).join('') + '</ul>' : '') +
      '</div>';
    }).join('');
    var saved = detail.saved.map(function (x) {
      return '<a class="badge" href="' + M.esc(x.url) + '" target="_blank" rel="noopener">' + (x.flag || '') + ' ' + M.esc(M.pick(x.name)) + '</a>';
    }).join(' ');
    var meets = (detail.meetings || []).map(meetingRow).join('');
    var now = new Date(Date.now() + 864e5);
    var min = now.toISOString().slice(0, 16);
    return '<section class="card card-pad-lg">' +
      (sample ? '<p class="badge badge-accent" style="margin-bottom:.8rem">' + M.t('cs.sampleBadge') + '</p>' : '') +
      '<h2 style="font-size:var(--step-2)">' + M.esc(s.name) + '</h2>' +
      '<dl class="cs-facts">' + facts.map(function (f) { return '<div><dt>' + M.t(f[0]) + '</dt><dd>' + f[1] + '</dd></div>'; }).join('') + '</dl>' +
      '<h3 class="cc-sub">' + M.t('cs.applications') + ' <span class="badge">' + detail.applications.length + '</span></h3>' +
      (apps || '<p class="dim">' + M.t('cs.noApps') + '</p>') +
      '<h3 class="cc-sub">' + M.t('cs.saved') + ' <span class="badge">' + detail.saved.length + '</span></h3>' +
      '<div class="cluster">' + (saved || '<span class="dim">—</span>') + '</div>' +
      '<h3 class="cc-sub">' + M.t('cs.meetWith') + '</h3>' + meets +
      (sample ? '' : '<form class="cs-meet-form" id="csMeetForm">' +
        '<input class="input" type="datetime-local" id="csWhen" min="' + min + '" required />' +
        '<select class="input" id="csMinutes"><option value="15">15 min</option><option value="30" selected>30 min</option><option value="45">45 min</option><option value="60">60 min</option></select>' +
        '<input class="input" id="csTopic" maxlength="200" placeholder="' + M.esc(M.t('cs.topic')) + '" />' +
        '<button type="submit" class="btn btn-primary">' + M.icon('calendar', 16) + M.t('cs.schedule') + '</button></form>') +
    '</section>';
  }

  function openStudent(id) {
    openId = id;
    if (sample) { detail = SAMPLE; paint(); return; }
    detail = null;
    paint();
    M.api('/api/counsellor/students/' + id).then(function (res) {
      if (!res.ok) { M.toast(M.t('auth.error.generic'), 'error'); return; }
      detail = res;
      document.getElementById('csDetail').innerHTML = detailMarkup();
      bindDetail();
    });
  }

  /* ---------------------------------------------------------- events */
  function bindMeetingButtons(host) {
    host.querySelectorAll('[data-meet]').forEach(function (b) {
      b.addEventListener('click', function () {
        b.disabled = true;
        M.api('/api/meetings/' + b.getAttribute('data-meet'), { method: 'PATCH', body: { status: b.getAttribute('data-status') } })
          .then(function (res) {
            if (!res.ok) { b.disabled = false; M.toast(M.t('auth.error.generic'), 'error'); return; }
            loadMeetings().then(function () { if (openId) openStudent(openId); else paint(); });
          });
      });
    });
  }

  function bindDetail() {
    var host = document.getElementById('csDetail');
    bindMeetingButtons(host);
    var form = document.getElementById('csMeetForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var whenValue = document.getElementById('csWhen').value;
      if (!whenValue) return;
      M.api('/api/meetings', { body: { student_id: openId, starts_at: whenValue,
        minutes: +document.getElementById('csMinutes').value, topic: document.getElementById('csTopic').value } })
        .then(function (res) {
          if (!res.ok) { M.toast(M.t('auth.error.generic'), 'error'); return; }
          M.toast(M.t('cs.sent'), 'success');
          loadMeetings().then(function () { openStudent(openId); });
        });
    });
  }

  function bind() {
    var search = document.getElementById('csSearch');
    if (search) search.addEventListener('input', function () {
      query = search.value.trim().toLowerCase();
      var rows = root().querySelector('.cs-rows');
      var list = visible();
      rows.innerHTML = list.length ? list.map(studentRow).join('') : '<p class="dim">' + M.t('cs.noMatch') + '</p>';
      bindRows();
    });
    root().querySelectorAll('[data-filter]').forEach(function (b) {
      b.addEventListener('click', function () { filter = b.getAttribute('data-filter'); paint(); });
    });
    var sampleBtn = document.getElementById('csSample');
    if (sampleBtn) sampleBtn.addEventListener('click', function () { sample = true; openStudent(0); });
    bindRows();
    bindMeetingButtons(root().querySelector('#meetings') || document.createElement('div'));
    if (detail) bindDetail();
  }

  function bindRows() {
    root().querySelectorAll('[data-student]').forEach(function (b) {
      b.addEventListener('click', function () { openStudent(+b.getAttribute('data-student')); });
    });
  }

  function loadMeetings() {
    return M.api('/api/meetings').then(function (res) { meetings = res.ok ? res.meetings : []; });
  }

  function init() {
    M.loadUser().then(function (user) {
      if (!user) { window.location.href = '/login?next=/counsellor'; return; }
      Promise.all([M.api('/api/counsellor/students'), loadMeetings()]).then(function (results) {
        var res = results[0];
        if (!res.ok) {
          root().innerHTML = '<section class="card card-pad-lg" style="text-align:center"><h2 style="font-size:var(--step-2)">' +
            M.t('cs.not.title') + '</h2><p class="muted" style="margin:.7rem 0 1.4rem">' + M.t('cs.not.body') + '</p>' +
            '<a class="btn btn-primary" href="/counselling#counsellors">' + M.t('cs.not.cta') + '</a></section>';
          return;
        }
        data = res;
        paint();
      });
    });
    window.addEventListener('meridian:lang', function () { if (data) paint(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
