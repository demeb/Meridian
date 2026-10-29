/* ============================================================
   Meridian — become a tutor
   ============================================================ */
(function () {
  'use strict';

  function statusCard(icon, titleKey, bodyKey, cta) {
    return '<div class="card card-pad-lg" style="text-align:center">' +
      '<span class="lock-icon" style="margin:0 auto 1rem">' + M.icon(icon, 24) + '</span>' +
      '<h2 style="font-size:var(--step-2)">' + M.t(titleKey) + '</h2>' +
      '<p class="muted" style="margin:.7rem auto 1.4rem;max-width:46ch">' + M.t(bodyKey) + '</p>' + (cta || '') + '</div>';
  }

  function paint(user) {
    var host = document.getElementById('applyRoot');
    if (!user) {
      host.innerHTML = statusCard('userPlus', 'apply.signin.title', 'apply.signin.body',
        '<div class="cluster" style="justify-content:center">' +
        '<a class="btn btn-primary" href="/login?mode=register&next=/tutors/apply">' + M.t('common.signUp') + '</a>' +
        '<a class="btn btn-ghost" href="/login?next=/tutors/apply">' + M.t('common.logIn') + '</a></div>');
      return;
    }
    if (user.tutor && user.tutor.status === 'pending') {
      host.innerHTML = statusCard('clock', 'apply.pending.title', 'apply.pending.body');
      return;
    }
    if (user.tutor && user.tutor.status === 'approved') {
      host.innerHTML = statusCard('checkCircle', 'apply.approved.title', 'apply.approved.body',
        '<a class="btn btn-primary" href="/tutor">' + M.t('nav.tutorDashboard') + '</a>');
      return;
    }

    host.innerHTML = '<form class="card card-pad-lg apply-form" id="applyForm" novalidate>' +
      '<div id="formFields"></div>' +
      '<label class="check-row agree-row"><input type="checkbox" id="agree" /><span>' + M.t('apply.agree') + '</span></label>' +
      '<button type="submit" class="btn btn-primary btn-lg btn-block" id="applySubmit">' + M.icon('send', 18) + M.t('apply.submit') + '</button>' +
      '<p class="field-hint" style="text-align:center;margin-top:.8rem">' + M.t('apply.review') + '</p>' +
    '</form>';

    var fields = document.getElementById('formFields');
    MeridianTutorForm.render(fields, {}, {});

    document.getElementById('applyForm').addEventListener('submit', function (event) {
      event.preventDefault();
      var data = MeridianTutorForm.collect(fields);
      if (!MeridianTutorForm.validate(fields, data, true)) return;
      if (!document.getElementById('agree').checked) { M.toast(M.t('apply.err.agree'), 'error'); return; }

      var form = new FormData();
      Object.keys(data).forEach(function (key) {
        form.append(key, Array.isArray(data[key]) ? data[key].join(',') : data[key]);
      });
      form.append('photo', document.getElementById('photoInput').files[0]);

      var button = document.getElementById('applySubmit');
      button.disabled = true;
      fetch('/api/tutor/apply', { method: 'POST', body: form, credentials: 'same-origin' })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          button.disabled = false;
          if (!res.ok) {
            var key = 'apply.err.' + res.error;
            M.toast(M.t(key) === key ? M.t('auth.error.generic') : M.t(key), 'error');
            return;
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
          M.loadUser(true).then(paint);
        });
    });
  }

  function init() {
    document.querySelectorAll('[data-icon]').forEach(function (n) { n.innerHTML = M.icon(n.getAttribute('data-icon'), 22); });
    M.loadUser().then(paint);
    window.addEventListener('meridian:lang', function () { M.loadUser().then(paint); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
