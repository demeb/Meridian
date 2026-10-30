/* ============================================================
   Meridian — tutor profile + booking
   The calendar shows exactly the times the tutor opened from their
   dashboard. Booking holds the slot for 15 minutes and goes to checkout.
   ============================================================ */
(function () {
  'use strict';

  var TAX = window.MERIDIAN_TAXONOMY;
  var teacher = null;
  var authed = false;
  var feeRate = 0.1;
  var cursor = new Date();
  var chosen = { date: null, slot: null, service: 0 };
  var byDate = {};

  function subjectLabel(slug) {
    return TAX.subjects[slug] ? M.pick(TAX.subjects[slug]) : slug;
  }

  function indexSlots() {
    byDate = {};
    (teacher.slots || []).forEach(function (slot) {
      var parts = slot.starts_at.split(' ');
      (byDate[parts[0]] = byDate[parts[0]] || []).push({ id: slot.id, time: parts[1], available: slot.available });
    });
  }

  function hasFree(dateKey) {
    return (byDate[dateKey] || []).some(function (s) { return s.available; });
  }

  /* ---------------------------------------------------------- calendar */
  function calendarMarkup() {
    var year = cursor.getFullYear();
    var month = cursor.getMonth();
    var startPad = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var months = M.months[M.state.lang] || M.months.en;
    var dow = M.dow[M.state.lang] || M.dow.en;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var atFloor = year === today.getFullYear() && month === today.getMonth();

    var cells = '';
    for (var pad = 0; pad < startPad; pad++) cells += '<span class="cal-day is-empty"></span>';
    for (var day = 1; day <= daysInMonth; day++) {
      var date = new Date(year, month, day);
      var key = M.iso(date);
      var free = date >= today && hasFree(key);
      cells += '<button type="button" class="cal-day' + (free ? ' is-free' : ' is-busy') +
        (chosen.date === key ? ' is-selected' : '') + '" data-date="' + key + '"' +
        (free ? '' : ' disabled aria-disabled="true"') + '>' + day + '</button>';
    }

    return '<div class="cal-head">' +
        '<span class="cal-title">' + months[month] + ' ' + year + '</span>' +
        '<span class="cal-nav">' +
          '<button type="button" id="calPrev"' + (atFloor ? ' disabled' : '') + ' aria-label="Previous month">' + M.icon('chevronLeft', 15) + '</button>' +
          '<button type="button" id="calNext" aria-label="Next month">' + M.icon('chevronRight', 15) + '</button>' +
        '</span>' +
      '</div>' +
      '<div class="cal-grid">' + dow.map(function (d) { return '<span class="cal-dow">' + d + '</span>'; }).join('') + cells + '</div>' +
      '<div id="slotHost"></div>';
  }

  function paintSlots() {
    var host = document.getElementById('slotHost');
    if (!host) return;
    if (!chosen.date) {
      host.innerHTML = '<p class="dim" style="font-size:.84rem;margin-top:1rem">' + M.t('teacher.pickDayFirst') + '</p>';
      return;
    }
    var slots = byDate[chosen.date] || [];
    host.innerHTML = '<p class="label" style="margin-top:1.1rem">' + M.t('teacher.book.time') + '</p>' +
      '<div class="slot-list">' + slots.map(function (slot) {
        return '<button type="button" class="slot' + (chosen.slot === slot.id ? ' is-selected' : '') + '"' +
          (slot.available ? '' : ' disabled title="' + M.t('teacher.taken') + '"') +
          ' data-slot="' + slot.id + '">' + slot.time + '</button>';
      }).join('') + '</div>';
    host.querySelectorAll('[data-slot]').forEach(function (button) {
      button.addEventListener('click', function () {
        chosen.slot = Number(button.getAttribute('data-slot'));
        paintSlots();
        paintSummary();
      });
    });
  }

  function paintCalendar() {
    var host = document.getElementById('calendarHost');
    if (!host) return;
    host.innerHTML = calendarMarkup();
    host.querySelectorAll('[data-date]').forEach(function (button) {
      if (button.disabled) return;
      button.addEventListener('click', function () {
        chosen.date = button.getAttribute('data-date');
        chosen.slot = null;
        paintCalendar();
        paintSummary();
      });
    });
    var prev = document.getElementById('calPrev');
    var next = document.getElementById('calNext');
    if (prev) prev.addEventListener('click', function () { cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1); paintCalendar(); });
    if (next) next.addEventListener('click', function () { cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1); paintCalendar(); });
    paintSlots();
  }

  /* ---------------------------------------------------------- price summary */
  function paintSummary() {
    var host = document.getElementById('bookSummary');
    if (!host) return;
    var service = teacher.services[chosen.service] || teacher.services[0];
    var slot = null;
    Object.keys(byDate).forEach(function (d) {
      byDate[d].forEach(function (s) { if (s.id === chosen.slot) slot = { date: d, time: s.time }; });
    });
    host.innerHTML =
      '<div class="price-lines">' +
        '<div class="price-total" style="border:0;margin:0;padding:0"><span>' + M.esc(M.pick(service.name)) + '</span><span>' + M.money(service.price_display) + '</span></div>' +
      '</div>' +
      (slot ? '<p class="booking-when">' + M.icon('calendar', 16) + M.formatDate(slot.date) + ' · ' + slot.time + '</p>' : '');
    var submit = document.getElementById('bookSubmit');
    if (submit) submit.disabled = !chosen.slot;
  }

  /* ---------------------------------------------------------- profile */
  function avatarFor(size) {
    return M.avatar(teacher, size);
  }

  function lockedView() {
    return '<div class="card card-pad-lg" style="max-width:640px;margin-inline:auto;text-align:center">' +
      '<div style="display:flex;justify-content:center">' + avatarFor('avatar-lg') + '</div>' +
      '<h1 style="margin-top:1.4rem;font-size:var(--step-2)">' + M.esc(M.pick(teacher.name)) + '</h1>' +
      '<p class="tc-role" style="margin-top:.4rem">' + M.esc(M.pick(teacher.headline)) + '</p>' +
      '<div class="lock-card" style="margin-top:1.8rem">' +
        '<span class="lock-icon">' + M.icon('lock', 24) + '</span>' +
        '<h3 style="font-size:1.1rem">' + M.t('teachers.locked.title') + '</h3>' +
        '<p class="muted" style="margin:.7rem 0 1.4rem;font-size:.92rem">' + M.t('teachers.locked.body') + '</p>' +
        '<a class="btn btn-primary btn-block btn-lg" href="/login?mode=register&next=' + encodeURIComponent(location.pathname + location.search) + '">' + M.t('common.signUp') + '</a>' +
        '<a class="btn-link" style="margin-top:1rem;display:inline-flex" href="/login?next=' + encodeURIComponent(location.pathname + location.search) + '">' + M.t('common.logIn') + '</a>' +
      '</div>' +
    '</div>';
  }

  function timeline(items, titleKey) {
    if (!items || !items.length) return '';
    return '<section class="card card-pad-lg" data-reveal>' +
      '<h2 style="font-size:var(--step-1);margin-bottom:1.4rem">' + M.t(titleKey) + '</h2>' +
      '<div class="timeline">' + items.map(function (item) {
        var heading = item.school || M.pick(item.title);
        var sub = item.school ? M.pick(item.degree) : M.pick(item.detail);
        return '<div class="timeline-item"><p class="when">' + M.esc(item.years || item.when || '') + '</p>' +
          '<h4>' + M.esc(heading) + '</h4><p>' + M.esc(sub) + '</p></div>';
      }).join('') + '</div></section>';
  }

  function fullView() {
    var subjects = (teacher.subjects || []).map(function (slug) {
      return '<span class="badge badge-brand">' + M.esc(subjectLabel(slug)) + '</span>';
    }).join('');
    var languages = (teacher.languages || []).map(function (code) {
      return TAX.languages[code] ? M.pick(TAX.languages[code]) : code;
    }).join(' · ');
    var services = teacher.services.map(function (service) {
      return '<div class="spread service-row"><span><b>' + M.esc(M.pick(service.name)) + '</b><br>' +
        '<span class="dim" style="font-size:.8rem">' + M.esc(M.pick(service.unit)) + '</span></span>' +
        '<span class="tc-price"><b>' + M.money(service.price_display) + '</b></span></div>';
    }).join('');
    var serviceOptions = teacher.services.map(function (service, index) {
      return '<option value="' + index + '"' + (index === chosen.service ? ' selected' : '') + '>' +
        M.esc(M.pick(service.name)) + ' — $' + service.price_display + '</option>';
    }).join('');
    var rating = teacher.sample
      ? '<span><span class="badge sample-badge">' + M.t('teachers.sample') + '</span></span>'
      : teacher.rating
      ? '<span><span class="stat-value" style="font-size:1.35rem">' + teacher.rating.toFixed(1) + '</span>' +
        '<span class="stat-label">' + teacher.reviews + ' ' + M.t('teachers.reviews') + '</span></span>'
      : '<span><span class="badge badge-brand">' + M.t('teachers.new') + '</span></span>';

    return '<div class="profile-layout">' +
      '<div class="stack" style="gap:var(--space-5)">' +
        '<section class="card card-pad-lg profile-hero" data-reveal>' +
          avatarFor('avatar-xl avatar-ring') +
          '<div style="min-width:0;flex:1">' +
            '<div class="cluster" style="margin-bottom:.6rem">' +
              (teacher.verified ? '<span class="badge badge-success">' + M.icon('check', 12) + M.t('teachers.verified') + '</span>' : '') +
              '<span class="badge">' + (teacher.flag || '') + ' ' + M.esc(M.pick(teacher.city) || M.pick(teacher.country)) + '</span>' +
            '</div>' +
            '<h1 style="font-size:var(--step-3)">' + M.esc(M.pick(teacher.name)) + '</h1>' +
            '<p class="tc-role" style="font-size:1rem;margin-top:.4rem">' + M.esc(M.pick(teacher.headline)) + '</p>' +
            '<p class="profile-intro">' + M.esc(M.pick(teacher.intro)) + '</p>' +
            '<div class="cluster" style="gap:var(--space-5);margin-top:1.2rem">' + rating +
              (teacher.experience ? '<span><span class="stat-value" style="font-size:1.35rem">' + teacher.experience + '</span><span class="stat-label">' + M.t('teachers.years') + '</span></span>' : '') +
              (teacher.students ? '<span><span class="stat-value" style="font-size:1.35rem">' + teacher.students + '</span><span class="stat-label">' + M.t('teachers.students') + '</span></span>' : '') +
            '</div>' +
          '</div>' +
        '</section>' +

        '<section class="card card-pad-lg" data-reveal>' +
          '<h2 style="font-size:var(--step-1);margin-bottom:1rem">' + M.t('teacher.about') + '</h2>' +
          '<p style="color:var(--text-muted)">' + M.esc(M.pick(teacher.bio)) + '</p>' +
          '<hr class="section-rule" style="margin:1.5rem 0" />' +
          '<p class="label" style="margin-bottom:.6rem">' + M.t('teacher.focus') + '</p>' +
          '<div class="tag-list">' + subjects + '</div>' +
          (languages ? '<p class="label" style="margin:1.2rem 0 .4rem">' + M.t('teacher.speaks') + '</p><p class="muted" style="font-size:.9rem">' + M.esc(languages) + '</p>' : '') +
        '</section>' +

        timeline(teacher.education, 'teacher.education') +
        timeline(teacher.track, 'teacher.experience') +

        '<section class="card card-pad-lg" data-reveal>' +
          '<h2 style="font-size:var(--step-1);margin-bottom:.6rem">' + M.t('teacher.services') + '</h2>' + services +

        '</section>' +
      '</div>' +

      '<aside class="profile-aside">' +
        '<div class="card card-pad-lg book-card">' +
          '<h2 style="font-size:var(--step-1);margin-bottom:1.1rem">' + M.t('teacher.book.title') + '</h2>' +
          '<div class="field">' +
            '<label for="serviceSelect">' + M.t('teacher.book.service') + '</label>' +
            '<select class="select gel" id="serviceSelect">' + serviceOptions + '</select>' +
          '</div>' +
          '<p class="label" style="margin-top:1.2rem">' + M.t('teacher.book.date') + '</p>' +
          '<div id="calendarHost" style="margin-top:.7rem"></div>' +
          '<div class="field" style="margin-top:1.1rem">' +
            '<label for="bookingNote">' + M.t('teacher.book.note') + '</label>' +
            '<textarea class="textarea" id="bookingNote" rows="3" style="min-height:84px" placeholder="' + M.t('teacher.book.notePlaceholder') + '"></textarea>' +
          '</div>' +
          '<div id="bookSummary" style="margin-top:1.1rem"></div>' +
          '<button type="button" class="btn btn-primary btn-block btn-lg" id="bookSubmit" style="margin-top:1rem" disabled>' +
            M.icon('lock', 17) + M.t('teacher.book.continue') + '</button>' +
          '<p class="field-hint" style="margin-top:.7rem;text-align:center">' + M.t('teacher.book.hold') + '</p>' +
        '</div>' +
      '</aside>' +
    '</div>';
  }

  function paint() {
    var host = document.getElementById('profileRoot');
    if (!teacher) {
      host.innerHTML = '<div class="empty-state">' + M.icon('alert', 42) + '<p>' + M.t('common.error') + '</p></div>';
      return;
    }
    host.innerHTML = teacher.locked ? lockedView() : fullView();
    M.observeReveal(host);
    if (teacher.locked) return;

    indexSlots();
    if (!chosen.date) {
      var first = Object.keys(byDate).sort().filter(hasFree)[0];
      if (first) {
        var d = M.parseDate(first);
        cursor = new Date(d.getUTCFullYear(), d.getUTCMonth(), 1);
      }
    }
    paintCalendar();
    paintSummary();

    document.getElementById('serviceSelect').addEventListener('change', function () {
      chosen.service = Number(this.value);
      paintSummary();
    });

    document.getElementById('bookSubmit').addEventListener('click', function () {
      if (!authed) {
        window.location.href = '/login?next=' + encodeURIComponent(location.pathname + location.search);
        return;
      }
      if (!chosen.slot) { M.toast(M.t('teacher.book.pickSlot'), 'error'); return; }
      var button = this;
      button.disabled = true;
      M.api('/api/bookings', {
        body: {
          teacher_id: teacher.id,
          slot_id: chosen.slot,
          service_index: chosen.service,
          note: document.getElementById('bookingNote').value
        }
      }).then(function (data) {
        if (!data.ok) {
          button.disabled = false;
          if (data.error === 'slot_taken') {
            M.toast(M.t('teacher.slotTaken'), 'error');
            load();
          } else if (data.error === 'own_profile') {
            M.toast(M.t('teacher.ownProfile'), 'info');
          } else {
            M.toast(M.t('auth.error.generic'), 'error');
          }
          return;
        }
        window.location.href = '/checkout?order=' + encodeURIComponent(data.order_id);
      });
    });
  }

  function load() {
    var id = new URLSearchParams(window.location.search).get('id');
    if (!id) { window.location.href = '/teachers'; return; }
    M.api('/api/teachers/' + encodeURIComponent(id)).then(function (data) {
      teacher = data.teacher || null;
      feeRate = data.fee_rate || feeRate;
      authed = !!(data.access && data.access.authed);
      chosen.slot = null;
      paint();
    });
  }

  function init() {
    load();
    window.addEventListener('meridian:lang', paint);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
