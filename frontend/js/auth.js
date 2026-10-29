/* ============================================================
   Meridian — log in, sign up, verify email, reset password
   ============================================================ */
(function () {
  'use strict';

  var mode = 'login';           // login | register
  var codeMode = 'verify';      // verify | reset
  var pendingEmail = '';
  var nextUrl = '/account';

  var STAGES = [
    { group: 'auth.group.school', items: ['grade-7', 'grade-8', 'grade-9', 'grade-10', 'grade-11', 'grade-12'] },
    { group: 'auth.group.university', items: ['bachelor', 'master', 'phd'] },
    { group: 'auth.group.other', items: ['graduate', 'parent', 'educator', 'other'] }
  ];
  var INTERESTS = ['uwc', 'flex', 'erasmus', 'summer', 'scholarships', 'us-uni', 'uk-uni', 'eu-uni', 'asia-uni', 'test-prep', 'tutoring', 'counselling'];

  function el(id) { return document.getElementById(id); }

  function fieldError(input, message) {
    var field = input.closest('.field');
    if (!field) return;
    field.classList.toggle('has-error', !!message);
    var slot = field.querySelector('.field-error');
    if (slot && message) slot.textContent = message;
  }

  function clearErrors() {
    document.querySelectorAll('.field.has-error').forEach(function (f) { f.classList.remove('has-error'); });
  }

  function errorText(code) {
    var key = 'auth.error.' + (code || 'generic');
    var msg = M.t(key);
    return msg === key ? M.t('auth.error.generic') : msg;
  }

  function show(panel) {
    ['authPanel', 'forgotPanel', 'verifyPanel'].forEach(function (id) { el(id).hidden = id !== panel; });
  }

  /* ---------------------------------------------------------- selects & chips */
  function paintStages() {
    var node = el('grade');
    var current = node.value || 'grade-11';
    node.innerHTML = STAGES.map(function (g) {
      return '<optgroup label="' + M.esc(M.t(g.group)) + '">' + g.items.map(function (k) {
        return '<option value="' + k + '"' + (k === current ? ' selected' : '') + '>' + M.esc(M.t('auth.grade.' + k)) + '</option>';
      }).join('') + '</optgroup>';
    }).join('');
  }

  function paintInterests() {
    var host = el('interests');
    var picked = Array.prototype.map.call(host.querySelectorAll('[aria-pressed="true"]'), function (c) { return c.dataset.value; });
    host.innerHTML = INTERESTS.map(function (k) {
      return '<button type="button" class="chip" data-value="' + k + '" aria-pressed="' + (picked.indexOf(k) !== -1) + '">' +
        M.esc(M.t('auth.interest.' + k)) + '</button>';
    }).join('');
  }

  function paintCountries() {
    fetch('/assets/countries.geojson').then(function (r) { return r.json(); }).then(function (d) {
      var lang = M.state.lang;
      var select = el('country');
      var current = select.value || 'GE';
      var list = d.features.map(function (f) { return f.properties; }).filter(function (p) { return p.iso; });
      list.sort(function (a, b) {
        if (a.iso === 'GE') return -1;
        if (b.iso === 'GE') return 1;
        return (a.name[lang] || a.name.en).localeCompare(b.name[lang] || b.name.en);
      });
      select.innerHTML = list.map(function (c) {
        return '<option value="' + c.iso + '"' + (c.iso === current ? ' selected' : '') + '>' + M.esc(c.name[lang] || c.name.en) + '</option>';
      }).join('');
    });
  }

  /* ---------------------------------------------------------- mode */
  function setMode(next) {
    mode = next;
    var register = mode === 'register';
    show('authPanel');
    el('tabLogin').setAttribute('aria-selected', String(!register));
    el('tabRegister').setAttribute('aria-selected', String(register));
    el('nameRow').hidden = !register;
    el('registerExtra').hidden = !register;
    el('pwMeter').hidden = !register;
    el('pwHint').hidden = !register;
    el('forgotLink').hidden = register;
    el('authTitle').textContent = M.t(register ? 'auth.register.title' : 'auth.login.title');
    el('authLede').textContent = M.t(register ? 'auth.register.lede' : 'auth.login.lede');
    el('authSubmit').querySelector('span').textContent = M.t(register ? 'auth.submit.register' : 'auth.submit.login');
    el('altText').textContent = M.t(register ? 'auth.hasAccount' : 'auth.noAccount');
    el('altSwitch').textContent = M.t(register ? 'auth.tab.login' : 'auth.tab.register');
    el('password').setAttribute('autocomplete', register ? 'new-password' : 'current-password');
    clearErrors();
    var url = new URL(window.location.href);
    url.searchParams.set('mode', mode);
    window.history.replaceState({}, '', url);
  }

  /* ---------------------------------------------------------- code screen */
  function showCode(kind, email, response) {
    codeMode = kind;
    pendingEmail = email;
    show('verifyPanel');
    el('verifyIcon').innerHTML = M.icon(kind === 'reset' ? 'lock' : 'mail', 24);
    el('verifyTitle').textContent = M.t(kind === 'reset' ? 'auth.reset.title' : 'auth.verify.title');
    el('verifyEmail').textContent = email;
    el('newPasswordField').hidden = kind !== 'reset';
    el('verifySubmit').textContent = M.t(kind === 'reset' ? 'auth.reset.submit' : 'auth.verify.submit');
    el('codeError').style.display = 'none';
    paintDevNote(response);
    var inputs = el('codeInputs').querySelectorAll('input');
    inputs.forEach(function (input) { input.value = ''; });
    inputs[0].focus();
  }

  function paintDevNote(response) {
    var note = el('devCodeNote');
    if (response && response.dev_code) {
      note.hidden = false;
      note.innerHTML = M.t('auth.verify.devNote') + ' <b>' + M.esc(response.dev_code) + '</b>';
    } else if (response && response.mail_error) {
      note.hidden = false;
      note.innerHTML = M.t('auth.verify.mailError');
    } else {
      note.hidden = true;
    }
  }

  function codeValue() {
    return Array.prototype.map.call(el('codeInputs').querySelectorAll('input'), function (i) { return i.value.trim(); }).join('');
  }

  function bindCodeInputs() {
    var inputs = Array.prototype.slice.call(el('codeInputs').querySelectorAll('input'));
    inputs.forEach(function (input, index) {
      input.addEventListener('input', function () {
        var digits = input.value.replace(/\D/g, '');
        if (digits.length > 1) {
          digits.split('').forEach(function (d, o) { if (inputs[index + o]) inputs[index + o].value = d; });
          inputs[Math.min(index + digits.length, inputs.length - 1)].focus();
        } else {
          input.value = digits;
          if (digits && index < inputs.length - 1) inputs[index + 1].focus();
        }
        if (codeValue().length === 6 && codeMode === 'verify') el('verifyForm').requestSubmit();
        if (codeValue().length === 6 && codeMode === 'reset') el('newPassword').focus();
      });
      input.addEventListener('keydown', function (event) {
        if (event.key === 'Backspace' && !input.value && index > 0) inputs[index - 1].focus();
        if (event.key === 'ArrowLeft' && index > 0) inputs[index - 1].focus();
        if (event.key === 'ArrowRight' && index < inputs.length - 1) inputs[index + 1].focus();
      });
      input.addEventListener('paste', function (event) {
        event.preventDefault();
        var digits = (event.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
        digits.split('').forEach(function (d, o) { if (inputs[o]) inputs[o].value = d; });
        if (digits.length === 6 && codeMode === 'verify') el('verifyForm').requestSubmit();
        else if (inputs[digits.length]) inputs[digits.length].focus();
      });
    });
  }

  function strength(value) {
    var score = 0;
    if (value.length >= 8) score++;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
    if (/\d/.test(value) || /[^A-Za-z0-9]/.test(value)) score++;
    return score;
  }

  /* ---------------------------------------------------------- submit handlers */
  function onAuthSubmit(event) {
    event.preventDefault();
    clearErrors();
    var email = el('email');
    var password = el('password');
    var button = el('authSubmit');

    if (!/^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(email.value.trim())) { fieldError(email, M.t('auth.error.invalid_email')); return; }
    if (mode === 'register') {
      if (!el('firstName').value.trim()) { fieldError(el('firstName'), M.t('auth.error.name_required')); return; }
      if (!el('lastName').value.trim()) { fieldError(el('lastName'), M.t('auth.error.name_required')); return; }
      if (password.value.length < 8) { fieldError(password, M.t('auth.error.weak_password')); return; }
    } else if (!password.value) {
      fieldError(password, M.t('auth.error.bad_credentials'));
      return;
    }

    var payload = mode === 'register' ? {
      first_name: el('firstName').value.trim(),
      last_name: el('lastName').value.trim(),
      email: email.value.trim(),
      phone: el('phone').value.trim(),
      password: password.value,
      grade: el('grade').value,
      birth_year: el('birthYear').value,
      country: el('country').value,
      interests: Array.prototype.map.call(el('interests').querySelectorAll('[aria-pressed="true"]'), function (c) { return c.dataset.value; }),
      locale: M.state.lang
    } : { email: email.value.trim(), password: password.value };

    button.disabled = true;
    M.api(mode === 'register' ? '/api/auth/register' : '/api/auth/login', { body: payload }).then(function (data) {
      button.disabled = false;
      if (!data.ok) {
        var message = errorText(data.error);
        if (data.error === 'email_taken') fieldError(email, message);
        else if (data.error === 'bad_credentials' || data.error === 'weak_password') fieldError(password, message);
        else M.toast(message, 'error');
        return;
      }
      if (data.step === 'verify') { showCode('verify', data.email, data); return; }
      M.state.user = data.user;
      window.location.href = nextUrl;
    });
  }

  function onForgotSubmit(event) {
    event.preventDefault();
    var email = el('forgotEmail');
    if (!/^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(email.value.trim())) { fieldError(email, M.t('auth.error.invalid_email')); return; }
    var button = el('forgotSubmit');
    button.disabled = true;
    M.api('/api/auth/forgot', { body: { email: email.value.trim() } }).then(function (data) {
      button.disabled = false;
      if (!data.ok) { fieldError(email, errorText(data.error)); return; }
      showCode('reset', data.email, data);
    });
  }

  function onCodeSubmit(event) {
    event.preventDefault();
    var code = codeValue();
    var error = el('codeError');
    if (code.length !== 6) return;
    var button = el('verifySubmit');

    var path = '/api/auth/verify';
    var body = { email: pendingEmail, code: code };
    if (codeMode === 'reset') {
      var pw = el('newPassword');
      if (pw.value.length < 8) { fieldError(pw, M.t('auth.error.weak_password')); return; }
      path = '/api/auth/reset';
      body.password = pw.value;
    }

    button.disabled = true;
    M.api(path, { body: body }).then(function (data) {
      button.disabled = false;
      if (!data.ok) {
        if (data.error === 'weak_password') { fieldError(el('newPassword'), errorText(data.error)); return; }
        error.textContent = errorText(data.error);
        error.style.display = 'block';
        el('codeInputs').querySelectorAll('input').forEach(function (i) { i.value = ''; });
        el('code0').focus();
        return;
      }
      M.state.user = data.user;
      if (codeMode === 'reset') M.toast(M.t('auth.reset.done'), 'success');
      window.location.href = nextUrl;
    });
  }

  function resend() {
    var button = el('resendCode');
    button.disabled = true;
    var call = codeMode === 'reset'
      ? M.api('/api/auth/forgot', { body: { email: pendingEmail } })
      : M.api('/api/auth/resend', { body: { email: pendingEmail } });
    call.then(function (data) {
      button.disabled = false;
      if (!data.ok) { M.toast(errorText(data.error), 'error'); return; }
      paintDevNote(data);
      M.toast(M.t('auth.verify.sent'), 'success');
    });
  }

  /* ---------------------------------------------------------- eyes */
  function bindEyes() {
    document.querySelectorAll('[data-eye]').forEach(function (button) {
      var input = el(button.getAttribute('data-eye'));
      var paint = function () {
        var visible = input.type === 'text';
        button.innerHTML = M.icon(visible ? 'eyeOff' : 'eye', 18);
        button.setAttribute('aria-label', M.t(visible ? 'auth.hidePassword' : 'auth.showPassword'));
      };
      button.addEventListener('click', function () {
        input.type = input.type === 'password' ? 'text' : 'password';
        paint();
        input.focus();
      });
      paint();
    });
  }

  /* ---------------------------------------------------------- boot */
  function init() {
    var params = new URLSearchParams(window.location.search);
    nextUrl = params.get('next') || '/account';
    if (!/^\/[^/]/.test(nextUrl)) nextUrl = '/account';     // only same-site paths

    el('authBrand').innerHTML = M.logoMarkup();
    paintStages();
    paintInterests();
    paintCountries();
    bindCodeInputs();
    bindEyes();

    el('interests').addEventListener('click', function (event) {
      var chip = event.target.closest('.chip');
      if (chip) chip.setAttribute('aria-pressed', String(chip.getAttribute('aria-pressed') !== 'true'));
    });

    var startMode = params.get('mode');
    if (startMode === 'forgot') { show('forgotPanel'); }
    else setMode(startMode === 'register' ? 'register' : 'login');

    el('tabLogin').addEventListener('click', function () { setMode('login'); });
    el('tabRegister').addEventListener('click', function () { setMode('register'); });
    el('altSwitch').addEventListener('click', function () { setMode(mode === 'register' ? 'login' : 'register'); });
    el('forgotLink').addEventListener('click', function () {
      el('forgotEmail').value = el('email').value;
      show('forgotPanel');
      el('forgotEmail').focus();
    });
    document.querySelectorAll('[data-back]').forEach(function (b) {
      b.addEventListener('click', function () { setMode('login'); });
    });

    el('password').addEventListener('input', function () {
      var score = strength(this.value);
      el('pwMeter').querySelectorAll('i').forEach(function (bar, i) { bar.className = i < score ? 'on-' + score : ''; });
    });

    el('authForm').addEventListener('submit', onAuthSubmit);
    el('forgotForm').addEventListener('submit', onForgotSubmit);
    el('verifyForm').addEventListener('submit', onCodeSubmit);
    el('resendCode').addEventListener('click', resend);

    M.loadUser().then(function (user) { if (user && startMode !== 'forgot') window.location.href = nextUrl; });

    window.addEventListener('meridian:lang', function () {
      paintStages();
      paintInterests();
      paintCountries();
      if (!el('authPanel').hidden) setMode(mode);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
