/* ============================================================
   Meridian — partnership enquiries
   ============================================================ */
(function () {
  'use strict';

  var KINDS = ['partnership', 'school', 'sponsor', 'teach', 'press', 'other'];

  function paintKinds() {
    var node = document.getElementById('kind');
    if (!node) return;
    var current = node.value || (new URLSearchParams(window.location.search).get('topic') === 'schools' ? 'school' : '');
    node.innerHTML = KINDS.map(function (key) {
      return '<option value="' + key + '"' + (current === key ? ' selected' : '') + '>' +
        M.esc(M.t('engage.kind.' + key)) + '</option>';
    }).join('');
  }

  function paintBenefits() {
    var host = document.getElementById('partnerBenefits');
    if (!host) return;
    host.innerHTML = [1, 2, 3, 4].map(function (index) {
      return '<li>' + M.icon('check', 17) + '<span>' + M.t('engage.why.' + index) + '</span></li>';
    }).join('');
  }

  function fieldError(input, message) {
    var field = input.closest('.field');
    if (!field) return;
    field.classList.toggle('has-error', !!message);
    var slot = field.querySelector('.field-error');
    if (slot && message) slot.textContent = message;
  }

  function init() {
    paintKinds();
    paintBenefits();
    window.addEventListener('meridian:lang', function () { paintKinds(); paintBenefits(); });

    var form = document.getElementById('engageForm');
    if (!form) return;

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var company = document.getElementById('company');
      var name = document.getElementById('contactName');
      var email = document.getElementById('contactEmail');
      var message = document.getElementById('message');
      var button = document.getElementById('engageSubmit');

      var valid = true;
      [company, name, message].forEach(function (input) {
        var empty = !input.value.trim();
        fieldError(input, empty ? M.t('auth.error.name_required') : '');
        if (empty) valid = false;
      });
      var emailOk = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(email.value.trim());
      fieldError(email, emailOk ? '' : M.t('auth.error.invalid_email'));
      if (!emailOk) valid = false;
      if (!valid) return;

      var label = button.querySelector('span');
      var original = label.textContent;
      button.disabled = true;
      label.textContent = M.t('engage.form.sending');

      M.api('/api/engage', {
        body: {
          company: company.value.trim(),
          name: name.value.trim(),
          email: email.value.trim(),
          kind: document.getElementById('kind').value,
          message: message.value.trim()
        }
      }).then(function (data) {
        button.disabled = false;
        label.textContent = original;
        if (!data.ok) {
          M.toast(M.t('auth.error.generic'), 'error');
          return;
        }
        form.reset();
        paintKinds();
        M.toast(M.t('engage.form.success'), 'success', 6000);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
