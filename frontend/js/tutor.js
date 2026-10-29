/* ============================================================
   Meridian — tutor dashboard
   Schedule: a week grid. Click or drag across times to open them for
   booking; drag again to close. Booked times show the student. Nothing
   leaves Meridian — no external calendar needed.
   ============================================================ */
(function () {
  'use strict';

  var data = null;
  var tab = 'schedule';
  var weekStart = startOfWeek(new Date());
  var slotsByKey = {};
  var pending = {};          // starts_at -> true (open) / false (close), flushed in batches
  var flushTimer = null;

  var FIRST_HOUR = 8;
  var LAST_HOUR = 22;        // last start 21:30

  function startOfWeek(date) {
    var d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    var shift = (d.getDay() + 6) % 7;            // weeks start on Monday
    d.setDate(d.getDate() - shift);
    return d;
  }

  function addDays(date, n) { var d = new Date(date); d.setDate(d.getDate() + n); return d; }
  function pad(n) { return String(n).padStart(2, '0'); }
  function key(date, h, m) { return M.iso(date) + ' ' + pad(h) + ':' + pad(m); }

  function index() {
    slotsByKey = {};
    (data.slots || []).forEach(function (s) { slotsByKey[s.starts_at] = s; });
    (data.bookings || []).forEach(function (b) {
      var k = b.date + ' ' + b.time;
      if (slotsByKey[k] && b.status === 'confirmed') slotsByKey[k].booking = b;
    });
  }

  /* ---------------------------------------------------------- header */
  function paintHead() {
    var t = data.tutor;
    var upcoming = (data.bookings || []).filter(function (b) {
      return b.status === 'confirmed' && (b.date + ' ' + b.time) >= M.iso(new Date());
    }).length;
    var open = (data.slots || []).filter(function (s) { return s.status === 'open'; }).length;
    var service = (t.services || [])[0] || { price: t.price, price_display: t.price };
    var statusBadge = t.status === 'approved'
      ? '<span class="badge badge-success badge-dot">' + M.t('tutor.live') + '</span>'
      : '<span class="badge badge-accent badge-dot">' + M.t('tutor.status.' + t.status) + '</span>';

    document.getElementById('tutorHead').innerHTML =
      '<div class="tutor-head">' +
        '<label class="tutor-photo" title="' + M.t('tutor.changePhoto') + '">' +
          M.avatar(t, 'avatar-lg') +
          '<span class="tutor-photo-edit">' + M.icon('camera', 16) + '</span>' +
          '<input type="file" id="photoSwap" accept="image/jpeg,image/png,image/webp" hidden />' +
        '</label>' +
        '<div style="min-width:0;flex:1">' +
          '<div class="cluster" style="margin-bottom:.4rem">' + statusBadge + '</div>' +
          '<h1 style="font-size:var(--step-3)">' + M.esc(M.pick(t.name)) + '</h1>' +
          '<p class="tc-role" style="margin-top:.3rem">' + M.esc(M.pick(t.headline)) + '</p>' +
        '</div>' +
        (t.status === 'approved' ? '<a class="btn btn-outline" href="/teacher?id=' + encodeURIComponent(t.id) + '">' + M.icon('eye', 17) + M.t('tutor.viewPublic') + '</a>' : '') +
      '</div>' +
      '<div class="grid grid-4 tutor-stats">' +
        stat(upcoming, 'tutor.stat.upcoming') +
        stat(open, 'tutor.stat.open') +
        stat(M.money((data.earnings.payout_minor || 0) / 100), 'tutor.stat.earned', true) +
        stat(M.money(service.price) + ' <span class="dim" style="font-size:.9rem">→ ' + M.money(service.price_display) + '</span>', 'tutor.stat.price', true) +
      '</div>';

    document.getElementById('photoSwap').addEventListener('change', function () {
      var picked = this.files[0];
      this.value = '';
      if (!picked) return;
      (window.MeridianCrop ? window.MeridianCrop.open(picked) : Promise.resolve(picked)).then(function (file) {
      if (!file) return;
      var form = new FormData();
      form.append('photo', file);
      fetch('/api/tutor/photo', { method: 'POST', body: form, credentials: 'same-origin' })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (!res.ok) { M.toast(M.t('apply.err.' + res.error), 'error'); return; }
          data.tutor.photo = res.photo;
          paintHead();
          M.toast(M.t('tutor.photoSaved'), 'success');
        });
      });
    });
  }

  function stat(value, labelKey, html) {
    return '<div class="card"><div class="stat-value" style="font-size:var(--step-2)">' + (html ? value : M.esc(value)) +
      '</div><div class="stat-label">' + M.t(labelKey) + '</div></div>';
  }

  /* ---------------------------------------------------------- schedule */
  function scheduleMarkup() {
    var days = [];
    for (var i = 0; i < 7; i++) days.push(addDays(weekStart, i));
    var dow = M.dow[M.state.lang] || M.dow.en;
    var months = M.months[M.state.lang] || M.months.en;
    var now = new Date();
    var nowKey = key(now, now.getHours(), now.getMinutes());
    var floorWeek = startOfWeek(now);

    var head = '<div class="wk-corner"></div>' + days.map(function (d) {
      var today = M.iso(d) === M.iso(now);
      return '<div class="wk-day' + (today ? ' is-today' : '') + '"><span>' + dow[d.getDay()] + '</span><b>' + d.getDate() + '</b></div>';
    }).join('');

    var rows = '';
    for (var h = FIRST_HOUR; h < LAST_HOUR; h++) {
      for (var m = 0; m < 60; m += 30) {
        rows += '<div class="wk-time">' + (m === 0 ? pad(h) + ':00' : '') + '</div>';
        days.forEach(function (d) {
          var k = key(d, h, m);
          var slot = slotsByKey[k];
          var past = k < nowKey;
          var state = slot ? (slot.booking ? 'booked' : slot.status) : 'closed';
          if (pending[k] === true) state = 'open';
          if (pending[k] === false && state === 'open') state = 'closed';
          var label = slot && slot.booking ? M.esc(slot.booking.student.name.split(' ')[0]) : '';
          rows += '<button type="button" class="wk-cell is-' + state + (past ? ' is-past' : '') + (m === 0 ? ' on-hour' : '') +
            '" data-key="' + k + '"' + (past || state === 'booked' || state === 'held' ? ' disabled' : '') +
            ' aria-label="' + k + ' ' + state + '">' + label + '</button>';
        });
      }
    }

    var label = months[weekStart.getMonth()] + ' ' + weekStart.getDate() + ' – ' +
      months[addDays(weekStart, 6).getMonth()] + ' ' + addDays(weekStart, 6).getDate();

    return '<div class="card card-pad-lg">' +
      '<div class="spread" style="flex-wrap:wrap;margin-bottom:1.1rem">' +
        '<div><h2 style="font-size:var(--step-1)">' + M.t('tutor.schedule.title') + '</h2>' +
          '<p class="muted" style="font-size:.88rem;margin-top:.3rem">' + M.t('tutor.schedule.help') + '</p></div>' +
        '<div class="cluster">' +
          '<button type="button" class="btn btn-ghost btn-sm" id="copyWeek">' + M.icon('layers', 16) + M.t('tutor.schedule.copy') + '</button>' +
          '<div class="cal-nav">' +
            '<button type="button" id="wkPrev"' + (weekStart <= floorWeek ? ' disabled' : '') + ' aria-label="Previous week">' + M.icon('chevronLeft', 15) + '</button>' +
            '<span class="wk-label">' + label + '</span>' +
            '<button type="button" id="wkNext" aria-label="Next week">' + M.icon('chevronRight', 15) + '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="wk-legend"><span><i class="lg-open"></i>' + M.t('tutor.legend.open') + '</span>' +
        '<span><i class="lg-booked"></i>' + M.t('tutor.legend.booked') + '</span>' +
        '<span><i class="lg-closed"></i>' + M.t('tutor.legend.closed') + '</span>' +
        '<span class="wk-saving" id="wkSaving"></span></div>' +
      '<div class="wk-scroll"><div class="wk-grid" id="wkGrid">' + head + rows + '</div></div>' +
    '</div>';
  }

  function bindSchedule() {
    var grid = document.getElementById('wkGrid');
    var painting = null;     // 'open' | 'close' while dragging

    function apply(cell) {
      if (!cell || cell.disabled) return;
      var k = cell.getAttribute('data-key');
      var isOpen = cell.classList.contains('is-open');
      if (painting === 'open' && !isOpen) { cell.classList.replace('is-closed', 'is-open'); pending[k] = true; }
      if (painting === 'close' && isOpen) { cell.classList.replace('is-open', 'is-closed'); pending[k] = false; }
    }

    grid.addEventListener('pointerdown', function (event) {
      var cell = event.target.closest('.wk-cell');
      if (!cell || cell.disabled) return;
      event.preventDefault();
      painting = cell.classList.contains('is-open') ? 'close' : 'open';
      apply(cell);
      grid.setPointerCapture && grid.setPointerCapture(event.pointerId);
    });
    grid.addEventListener('pointermove', function (event) {
      if (!painting) return;
      apply(document.elementFromPoint(event.clientX, event.clientY));
    });
    var stop = function (event) {
      if (!painting) return;
      if (event && event.clientX != null) apply(document.elementFromPoint(event.clientX, event.clientY));
      painting = null;
      scheduleFlush();
    };
    grid.addEventListener('pointerup', stop);
    grid.addEventListener('pointercancel', stop);
    // keyboard: Enter/Space toggles one time
    grid.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      var cell = event.target.closest('.wk-cell');
      if (!cell) return;
      event.preventDefault();
      painting = cell.classList.contains('is-open') ? 'close' : 'open';
      apply(cell);
      painting = null;
      scheduleFlush();
    });

    document.getElementById('wkPrev').addEventListener('click', function () { weekStart = addDays(weekStart, -7); paintTab(); });
    document.getElementById('wkNext').addEventListener('click', function () { weekStart = addDays(weekStart, 7); paintTab(); });
    document.getElementById('copyWeek').addEventListener('click', copyForward);
  }

  function scheduleFlush() {
    window.clearTimeout(flushTimer);
    var saving = document.getElementById('wkSaving');
    if (saving) saving.textContent = M.t('tutor.saving');
    flushTimer = window.setTimeout(flush, 350);
  }

  function flush() {
    var opens = [], closes = [];
    Object.keys(pending).forEach(function (k) { (pending[k] ? opens : closes).push(k); });
    pending = {};
    var calls = [];
    if (opens.length) calls.push(M.api('/api/tutor/slots', { body: { open: true, slots: opens } }));
    if (closes.length) calls.push(M.api('/api/tutor/slots', { body: { open: false, slots: closes } }));
    Promise.all(calls).then(function (results) {
      var last = results[results.length - 1];
      if (last && last.slots) { data.slots = last.slots; index(); }
      var saving = document.getElementById('wkSaving');
      if (saving) {
        saving.textContent = M.t('tutor.saved');
        window.setTimeout(function () { if (saving) saving.textContent = ''; }, 1600);
      }
      paintHead();
    });
  }

  /* Repeat this week's open times for the next four weeks */
  function copyForward() {
    var source = [];
    for (var i = 0; i < 7; i++) {
      var day = addDays(weekStart, i);
      Object.keys(slotsByKey).forEach(function (k) {
        if (k.indexOf(M.iso(day)) === 0 && slotsByKey[k].status === 'open') source.push({ offset: i, time: k.slice(11) });
      });
    }
    if (!source.length) { M.toast(M.t('tutor.schedule.nothing'), 'info'); return; }
    var target = [];
    for (var w = 1; w <= 4; w++) {
      source.forEach(function (s) { target.push(M.iso(addDays(weekStart, w * 7 + s.offset)) + ' ' + s.time); });
    }
    M.api('/api/tutor/slots', { body: { open: true, slots: target } }).then(function (res) {
      if (res.slots) { data.slots = res.slots; index(); }
      M.toast(M.t('tutor.schedule.copied').replace('{n}', source.length), 'success');
      paintHead();
    });
  }

  /* ---------------------------------------------------------- bookings */
  function bookingsMarkup() {
    var nowKey = M.iso(new Date()) + ' ' + pad(new Date().getHours()) + ':' + pad(new Date().getMinutes());
    var list = (data.bookings || []).slice();
    var upcoming = list.filter(function (b) { return b.status === 'confirmed' && (b.date + ' ' + b.time) >= nowKey; });
    var past = list.filter(function (b) { return upcoming.indexOf(b) === -1; }).reverse();

    function row(b, canCancel) {
      var stage = b.student.grade ? M.t('auth.grade.' + b.student.grade) : '';
      return '<article class="lesson-row">' +
        '<div class="lesson-date"><b>' + M.parseDate(b.date).getUTCDate() + '</b><span>' +
          (M.months[M.state.lang] || M.months.en)[M.parseDate(b.date).getUTCMonth()] + '</span></div>' +
        '<div class="lesson-main">' +
          '<h4>' + M.esc(b.student.name) + (stage && stage.indexOf('auth.') !== 0 ? ' <span class="badge">' + M.esc(stage) + '</span>' : '') + '</h4>' +
          '<p>' + M.esc(b.time) + ' · ' + M.esc(b.service || '') + '</p>' +
          (b.note ? '<p class="lesson-note">“' + M.esc(b.note) + '”</p>' : '') +
          '<p class="lesson-contact">' + M.icon('mail', 14) + '<a href="mailto:' + M.esc(b.student.email) + '">' + M.esc(b.student.email) + '</a>' +
            (b.student.phone ? ' · ' + M.esc(b.student.phone) : '') + '</p>' +
        '</div>' +
        '<div class="lesson-side">' +
          '<span class="badge ' + (b.status === 'confirmed' ? 'badge-success' : b.status === 'cancelled' ? 'badge-danger' : '') + '">' +
            M.t('account.status.' + b.status) + '</span>' +
          (b.base_minor ? '<span class="lesson-pay">' + M.t('tutor.youReceive') + ' <b>' + M.money(b.base_minor / 100) + '</b></span>' : '') +
          (canCancel ? '<button type="button" class="btn btn-ghost btn-sm" data-cancel="' + b.id + '">' + M.t('tutor.cancel') + '</button>' : '') +
        '</div>' +
      '</article>';
    }

    return '<div class="stack" style="gap:var(--space-5)">' +
      '<section class="card card-pad-lg"><h2 style="font-size:var(--step-1);margin-bottom:1rem">' + M.t('tutor.upcoming') + '</h2>' +
        (upcoming.length ? upcoming.map(function (b) { return row(b, true); }).join('')
          : '<div class="empty-state">' + M.icon('calendar', 42) + '<p>' + M.t('tutor.noUpcoming') + '</p></div>') +
      '</section>' +
      (past.length ? '<section class="card card-pad-lg"><h2 style="font-size:var(--step-1);margin-bottom:1rem">' + M.t('tutor.history') + '</h2>' +
        past.map(function (b) { return row(b, false); }).join('') + '</section>' : '') +
    '</div>';
  }

  function bindBookings() {
    document.querySelectorAll('[data-cancel]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (!window.confirm(M.t('tutor.cancelConfirm'))) return;
        button.disabled = true;
        M.api('/api/tutor/bookings/' + button.getAttribute('data-cancel') + '/cancel', { body: {} }).then(function (res) {
          if (!res.ok) { button.disabled = false; M.toast(M.t('auth.error.generic'), 'error'); return; }
          M.toast(M.t('tutor.cancelled'), 'success');
          load();
        });
      });
    });
  }

  /* ---------------------------------------------------------- profile */
  function bindProfile() {
    var host = document.getElementById('profileFields');
    var t = data.tutor;
    MeridianTutorForm.render(host, {
      headline: t.headline, intro: t.intro, bio: t.bio, subjects: t.subjects, regions: t.regions,
      languages: t.languages, experience: t.experience, iso: t.iso, city: t.city,
      education: t.education, price: (t.services && t.services[0] ? t.services[0].price : t.price)
    }, { photo: false, feeRate: data.fee_rate });
    document.getElementById('profileForm').addEventListener('submit', function (event) {
      event.preventDefault();
      var form = MeridianTutorForm.collect(host);
      if (!MeridianTutorForm.validate(host, form, false)) return;
      var button = document.getElementById('profileSave');
      button.disabled = true;
      M.api('/api/tutor/me', { method: 'PATCH', body: form }).then(function (res) {
        button.disabled = false;
        if (!res.ok) { M.toast(M.t('auth.error.generic'), 'error'); return; }
        M.toast(M.t('tutor.profileSaved'), 'success');
        load();
      });
    });
  }

  /* ---------------------------------------------------------- tabs */
  function paintTab() {
    var root = document.getElementById('tutorRoot');
    document.querySelectorAll('#tutorTabs [data-tab]').forEach(function (b) {
      b.setAttribute('aria-selected', String(b.getAttribute('data-tab') === tab));
    });
    if (tab === 'schedule') { root.innerHTML = scheduleMarkup(); bindSchedule(); }
    if (tab === 'bookings') { root.innerHTML = bookingsMarkup(); bindBookings(); }
    if (tab === 'profile') {
      root.innerHTML = '<form class="card card-pad-lg apply-form" id="profileForm" novalidate>' +
        '<div id="profileFields"></div>' +
        '<button type="submit" class="btn btn-primary btn-lg" id="profileSave">' + M.t('tutor.saveProfile') + '</button></form>';
      bindProfile();
    }
  }

  function load() {
    return M.api('/api/tutor/me').then(function (res) {
      if (!res.ok) {
        document.getElementById('tutorRoot').innerHTML =
          '<div class="card card-pad-lg" style="text-align:center"><h2 style="font-size:var(--step-2)">' + M.t('tutor.notTutor.title') + '</h2>' +
          '<p class="muted" style="margin:.7rem 0 1.4rem">' + M.t('tutor.notTutor.body') + '</p>' +
          '<a class="btn btn-primary" href="/tutors/apply">' + M.t('teachers.join.cta') + '</a></div>';
        document.getElementById('tutorTabs').hidden = true;
        return;
      }
      data = res;
      index();
      paintHead();
      paintTab();
    });
  }

  function init() {
    M.loadUser().then(function (user) {
      if (!user) { window.location.href = '/login?next=/tutor'; return; }
      document.querySelectorAll('#tutorTabs [data-tab]').forEach(function (b) {
        b.addEventListener('click', function () { tab = b.getAttribute('data-tab'); paintTab(); });
      });
      load();
    });
    window.addEventListener('meridian:lang', function () { if (data) { paintHead(); paintTab(); } });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
