/* ============================================================
   Meridian — checkout
   One page for every payment: a lesson or a membership.

   Card details never leave this page in full. We validate the number
   locally (Luhn + brand), then send only the brand and last four digits —
   enough for a receipt, useless to anyone who intercepts it. In production
   the card form is replaced by the provider's hosted page (Stripe, Bank of
   Georgia iPay, TBC Pay), which keeps Meridian out of PCI-DSS scope.
   ============================================================ */
(function () {
  'use strict';

  var order = null;
  var method = 'card';
  var holdTimer = null;

  // Visa and Mastercard only — no wallets, no country-specific bank lists
  var METHODS = [{ id: 'card', label: 'checkout.method.card', mark: 'cards' }];
  var MARKS = {
    cards: '<span class="pm-cards"><i class="pm-visa">VISA</i><i class="pm-mc"><b></b><b></b></i></span>'
  };

  /* ---------------------------------------------------------- card helpers */
  function digits(value) { return String(value || '').replace(/\D/g, ''); }

  function brandOf(number) {
    if (/^4/.test(number)) return 'Visa';
    if (/^(5[1-5]|2[2-7])/.test(number)) return 'Mastercard';
    return '';
  }

  function luhn(number) {
    var sum = 0;
    var flip = false;
    for (var i = number.length - 1; i >= 0; i--) {
      var n = +number[i];
      if (flip) { n *= 2; if (n > 9) n -= 9; }
      sum += n;
      flip = !flip;
    }
    return number.length >= 13 && sum % 10 === 0;
  }

  function formatCard(number) {
    var brand = brandOf(number);
    return number.slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  /* ---------------------------------------------------------- summary */
  function summaryMarkup() {
    var lines = '';
    var head = '';
    if (order.kind === 'lesson') {
      var tutor = order.tutor || {};
      var when = order.meta.starts_at || '';
      var parts = when.split(' ');
      head = '<div class="sum-head">' + M.avatar(tutor, '') +
        '<div><b>' + M.esc(M.pick(tutor.name)) + '</b><span>' + M.esc(M.pick(tutor.headline)) + '</span></div></div>' +
        '<div class="sum-detail">' +
          '<div>' + M.icon('book', 16) + '<span>' + M.esc(order.meta.service) + '</span></div>' +
          '<div>' + M.icon('calendar', 16) + '<span>' + M.formatDate(parts[0]) + ' · ' + M.esc(parts[1] || '') + '</span></div>' +
          '<div>' + M.icon('clock', 16) + '<span>60 min · ' + M.t('checkout.online') + '</span></div>' +
        '</div>';
      lines = '';
    } else {
      var plan = order.meta.plan;
      head = '<div class="sum-head"><span class="sum-plan-mark">' + M.markMarkup() + '</span>' +
        '<div><b>' + M.t('pricing.' + plan + '.name') + '</b><span>' + M.t('pricing.cycle.' + order.meta.cycle) + '</span></div></div>' +
        '<ul class="plan-list" style="margin-top:1rem">' + [1, 2, 3].map(function (i) {
          return '<li>' + M.icon('check', 17) + '<span>' + M.t('pricing.' + plan + '.f' + i) + '</span></li>';
        }).join('') + '</ul>';
      lines = '<div><span>' + M.t('pricing.' + plan + '.name') + '</span><span>' + M.money(order.base_minor / 100) + '</span></div>';
    }
    return '<aside class="card card-pad-lg checkout-summary">' +
      '<h2 class="sum-title">' + M.t('checkout.summary') + '</h2>' + head +
      '<div class="price-lines" style="margin-top:1.2rem">' + lines +
        '<div class="price-total"><span>' + M.t('checkout.total') + '</span><span>' + M.money(order.total_minor / 100) + '</span></div>' +
      '</div>' +
      (order.kind === 'lesson' ? '<div class="hold-timer" id="holdTimer"></div>' : '') +
      '<ul class="trust-list">' +
        '<li>' + M.icon('lock', 15) + M.t('checkout.trust.encrypted') + '</li>' +
        '<li>' + M.icon('shield', 15) + M.t('checkout.trust.card') + '</li>' +
        (order.kind === 'lesson' ? '<li>' + M.icon('checkCircle', 15) + M.t('checkout.trust.refund') + '</li>' : '<li>' + M.icon('checkCircle', 15) + M.t('checkout.trust.cancel') + '</li>') +
      '</ul>' +
    '</aside>';
  }

  /* ---------------------------------------------------------- method panels */
  function cardPanel() {
    return '<div class="card-preview" id="cardPreview" aria-hidden="true">' +
        '<div class="cp-face cp-front">' +
          '<div class="cp-top"><span class="cp-chip"></span><span class="cp-brand" id="cpBrand"></span></div>' +
          '<div class="cp-number" id="cpNumber">•••• •••• •••• ••••</div>' +
          '<div class="cp-bottom"><span id="cpName">' + M.t('checkout.card.namePh') + '</span><span id="cpExp">MM/YY</span></div>' +
        '</div>' +
        '<div class="cp-face cp-back"><div class="cp-stripe"></div><div class="cp-cvc"><span id="cpCvc">•••</span></div></div>' +
      '</div>' +
      '<div class="pay-fields">' +
        field('cardName', 'checkout.card.name', 'text', 'cc-name', '') +
        field('cardNumber', 'checkout.card.number', 'text', 'cc-number', 'numeric', '1234 1234 1234 1234') +
        '<div class="auth-row">' +
          field('cardExp', 'checkout.card.expiry', 'text', 'cc-exp', 'numeric', 'MM / YY') +
          field('cardCvc', 'checkout.card.cvc', 'text', 'cc-csc', 'numeric', '123') +
        '</div>' +
      '</div>';
  }

  function field(id, label, type, autocomplete, inputmode, placeholder) {
    return '<div class="field"><label for="' + id + '">' + M.t(label) + '</label>' +
      '<input class="input" id="' + id + '" type="' + type + '" autocomplete="' + autocomplete + '"' +
      (inputmode ? ' inputmode="' + inputmode + '"' : '') +
      (placeholder ? ' placeholder="' + placeholder + '"' : '') + ' />' +
      '<span class="field-error">—</span></div>';
  }

  function walletPanel(kind) {
    var name = kind === 'apple_pay' ? 'Apple Pay' : 'Google Pay';
    return '<div class="redirect-panel">' +
      '<span class="redirect-mark">' + MARKS[kind === 'apple_pay' ? 'apple' : 'google'] + '</span>' +
      '<p>' + M.t('checkout.wallet.body').replace('{name}', name) + '</p></div>';
  }

  function bankPanel(kind) {
    var name = kind === 'bog' ? 'Bank of Georgia' : 'TBC Bank';
    return '<div class="redirect-panel">' +
      '<span class="redirect-mark">' + MARKS[kind] + '</span>' +
      '<p>' + M.t('checkout.bank.body').replace('{name}', name) + '</p>' +
      '<p class="field-hint">' + M.t('checkout.bank.cards') + '</p></div>';
  }

  function paintMethod() {
    var host = document.getElementById('methodPanel');
    if (!host) return;
    host.innerHTML = method === 'card' ? cardPanel()
      : (method === 'apple_pay' || method === 'google_pay') ? walletPanel(method)
      : bankPanel(method);
    document.querySelectorAll('[data-method]').forEach(function (node) {
      var on = node.getAttribute('data-method') === method;
      node.classList.toggle('is-active', on);
      node.setAttribute('aria-checked', String(on));
    });
    var label = method === 'card' ? M.t('checkout.pay')
      : method === 'apple_pay' ? M.t('checkout.payWith').replace('{name}', 'Apple Pay')
      : method === 'google_pay' ? M.t('checkout.payWith').replace('{name}', 'Google Pay')
      : M.t('checkout.continueBank');
    document.getElementById('payLabel').innerHTML = label + ' · ' + M.money(order.total_minor / 100);
    if (method === 'card') bindCard();
  }

  function bindCard() {
    var number = document.getElementById('cardNumber');
    var exp = document.getElementById('cardExp');
    var cvc = document.getElementById('cardCvc');
    var name = document.getElementById('cardName');
    var preview = document.getElementById('cardPreview');

    number.addEventListener('input', function () {
      var raw = digits(number.value).slice(0, 19);
      number.value = formatCard(raw);
      var brand = brandOf(raw);
      document.getElementById('cpBrand').textContent = brand ? brand.toUpperCase() : '';
      preview.setAttribute('data-brand', brand.toLowerCase());
      var masked = (raw + '•'.repeat(Math.max(0, 16 - raw.length))).slice(0, 16);
      document.getElementById('cpNumber').textContent = masked.replace(/(.{4})/g, '$1 ').trim();
      clearError(number);
    });
    exp.addEventListener('input', function () {
      var raw = digits(exp.value).slice(0, 4);
      exp.value = raw.length > 2 ? raw.slice(0, 2) + ' / ' + raw.slice(2) : raw;
      document.getElementById('cpExp').textContent = raw.length ? (raw.slice(0, 2) + '/' + raw.slice(2)) : 'MM/YY';
      clearError(exp);
    });
    cvc.addEventListener('input', function () {
      cvc.value = digits(cvc.value).slice(0, 4);
      document.getElementById('cpCvc').textContent = cvc.value ? cvc.value.replace(/./g, '•') : '•••';
      clearError(cvc);
    });
    name.addEventListener('input', function () {
      document.getElementById('cpName').textContent = name.value.trim() || M.t('checkout.card.namePh');
      clearError(name);
    });
    // the card turns over while you type the code on its back
    cvc.addEventListener('focus', function () { preview.classList.add('is-flipped'); });
    cvc.addEventListener('blur', function () { preview.classList.remove('is-flipped'); });
  }

  function setError(input, key) {
    var f = input.closest('.field');
    f.classList.add('has-error');
    f.querySelector('.field-error').textContent = M.t(key);
  }
  function clearError(input) { input.closest('.field').classList.remove('has-error'); }

  function readCard() {
    var name = document.getElementById('cardName');
    var number = document.getElementById('cardNumber');
    var exp = document.getElementById('cardExp');
    var cvc = document.getElementById('cardCvc');
    var raw = digits(number.value);
    var ok = true;
    if (!name.value.trim()) { setError(name, 'checkout.err.name'); ok = false; }
    if (!luhn(raw)) { setError(number, 'checkout.err.number'); ok = false; }
    var e = digits(exp.value);
    var month = +e.slice(0, 2);
    var year = 2000 + +e.slice(2, 4);
    var now = new Date();
    if (e.length !== 4 || month < 1 || month > 12 ||
        year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
      setError(exp, 'checkout.err.expiry'); ok = false;
    }
    if (!brandOf(raw)) { setError(number, 'checkout.err.brand'); ok = false; }
    if (digits(cvc.value).length !== 3) { setError(cvc, 'checkout.err.cvc'); ok = false; }
    if (!ok) return null;
    // only these two values ever leave the browser
    return { brand: brandOf(raw) || 'Card', last4: raw.slice(-4) };
  }

  /* ---------------------------------------------------------- hold timer */
  function startHold() {
    var host = document.getElementById('holdTimer');
    if (!host) return;
    var created = Date.parse(order.created_at);
    var deadline = created + 15 * 60 * 1000;
    function tick() {
      var left = Math.max(0, deadline - Date.now());
      var m = Math.floor(left / 60000);
      var s = Math.floor((left % 60000) / 1000);
      host.innerHTML = M.icon('clock', 15) + M.t('checkout.held').replace('{time}', m + ':' + String(s).padStart(2, '0'));
      host.classList.toggle('is-low', left < 120000);
      if (left <= 0) {
        window.clearInterval(holdTimer);
        expired();
      }
    }
    tick();
    holdTimer = window.setInterval(tick, 1000);
  }

  /* ---------------------------------------------------------- pay */
  function pay() {
    var button = document.getElementById('payButton');
    var payload = { method: method };
    if (method === 'card') {
      var card = readCard();
      if (!card) return;
      payload.card = card;
    }
    button.disabled = true;
    button.classList.add('is-loading');
    M.api('/api/orders/' + encodeURIComponent(order.id) + '/pay', { body: payload }).then(function (data) {
      button.disabled = false;
      button.classList.remove('is-loading');
      if (!data.ok) {
        var key = 'checkout.err.' + (data.error || 'generic');
        var msg = M.t(key);
        if (msg === key) msg = M.t('auth.error.generic');
        if (data.error === 'hold_expired') { expired(); return; }
        M.toast(msg, 'error', 5200);
        if (data.error === 'card_declined' && method === 'card') setError(document.getElementById('cardNumber'), key);
        return;
      }
      window.clearInterval(holdTimer);
      success(data.order);
    });
  }

  function success(paid) {
    M.loadUser(true).then(M.paintAuth);
    var host = document.getElementById('checkoutRoot');
    document.getElementById('checkoutTitle').textContent = M.t('checkout.done.title');
    var lesson = paid.kind === 'lesson';
    host.innerHTML = '<div class="card card-pad-lg success-card">' +
      '<svg class="success-check" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="M15 27.5l7 7 15-16"/></svg>' +
      '<h2>' + M.t(lesson ? 'checkout.done.lesson' : 'checkout.done.plan') + '</h2>' +
      '<p class="muted">' + M.t('checkout.done.receipt') + '</p>' +
      '<div class="price-lines" style="margin-top:1.4rem;text-align:left">' +
        '<div><span>' + M.t('checkout.receipt.order') + '</span><span class="mono">' + M.esc(paid.id) + '</span></div>' +
        '<div><span>' + M.t('checkout.receipt.item') + '</span><span>' + M.esc(paid.description) + '</span></div>' +
        '<div><span>' + M.t('checkout.receipt.method') + '</span><span>' + M.esc(paid.method_detail || '') + '</span></div>' +
        '<div class="price-total"><span>' + M.t('checkout.total') + '</span><span>' + M.money(paid.total_minor / 100) + '</span></div>' +
      '</div>' +
      '<div class="cluster" style="justify-content:center;margin-top:1.6rem">' +
        '<a class="btn btn-primary" href="/account">' + M.t(lesson ? 'checkout.done.lessons' : 'checkout.done.account') + '</a>' +
        '<a class="btn btn-ghost" href="' + (lesson ? '/teachers' : '/programs') + '">' + M.t(lesson ? 'checkout.done.more' : 'home.cta.explore') + '</a>' +
      '</div></div>';
  }

  function expired() {
    var host = document.getElementById('checkoutRoot');
    host.innerHTML = '<div class="card card-pad-lg success-card">' +
      '<span class="lock-icon" style="margin:0 auto 1rem">' + M.icon('clock', 24) + '</span>' +
      '<h2>' + M.t('checkout.expired.title') + '</h2>' +
      '<p class="muted">' + M.t('checkout.expired.body') + '</p>' +
      '<div class="cluster" style="justify-content:center;margin-top:1.4rem">' +
        '<a class="btn btn-primary" href="' + (order && order.tutor ? '/teacher?id=' + encodeURIComponent(order.tutor.id) : '/teachers') + '">' +
        M.t('checkout.expired.cta') + '</a></div></div>';
  }

  /* ---------------------------------------------------------- page */
  function paint() {
    var host = document.getElementById('checkoutRoot');
    var test = order.provider === 'test';
    host.innerHTML =
      (test ? '<div class="test-banner">' + M.icon('info', 17) + '<span>' + M.t('checkout.testMode') + '</span></div>' : '') +
      '<div class="checkout-grid">' +
        '<div class="card card-pad-lg checkout-main">' +
          '<div class="spread" style="margin-bottom:1rem"><h2 class="sum-title" style="margin:0">' + M.t('checkout.method.card') + '</h2>' + MARKS.cards + '</div>' +
          '<div id="methodPanel" class="method-panel"></div>' +
          '<button type="button" class="btn btn-primary btn-lg btn-block pay-button" id="payButton">' +
            M.icon('lock', 17) + '<span id="payLabel"></span></button>' +
          '<p class="field-hint" style="text-align:center;margin-top:.8rem">' + M.t('checkout.terms') + '</p>' +
        '</div>' +
        summaryMarkup() +
      '</div>';

    document.querySelectorAll('[data-method]').forEach(function (node) {
      node.addEventListener('click', function () {
        method = node.getAttribute('data-method');
        paintMethod();
      });
    });
    document.getElementById('payButton').addEventListener('click', pay);
    paintMethod();
    startHold();
  }

  function init() {
    var id = new URLSearchParams(window.location.search).get('order');
    M.loadUser().then(function (user) {
      if (!user) { window.location.href = '/login?next=' + encodeURIComponent(location.pathname + location.search); return; }
      if (!id) { window.location.href = '/pricing'; return; }
      M.api('/api/orders/' + encodeURIComponent(id)).then(function (data) {
        if (data.error === 'order_expired') { order = null; expired(); return; }
        if (!data.ok) { window.location.href = '/account'; return; }
        order = data.order;
        if (order.status === 'paid') { success(order); return; }
        paint();
      });
    });
    window.addEventListener('meridian:lang', function () { if (order && order.status === 'pending') paint(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
