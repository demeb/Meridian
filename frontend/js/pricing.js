/* ============================================================
   Meridian — membership plans
   ============================================================ */
(function () {
  'use strict';

  var cycle = 'monthly';
  var plans = { free: { monthly: 0, yearly: 0 }, compass: { monthly: 2900, yearly: 29000 }, navigator: { monthly: 7900, yearly: 79000 } };

  var ORDER = ['free', 'compass', 'navigator'];
  /* [key, free, compass, navigator] — a number is a daily allowance; rows
     starting with 'group' are section headings in the comparison table */
  var FEATURES = [
    ['group', 'discover'],
    ['database', 1, 1, 1],
    ['unis', 1, 1, 1],
    ['prep', 1, 1, 1],
    ['courses', 1, 1, 1],
    ['tutors', 1, 1, 1],
    ['save', 1, 1, 1],
    ['group', 'apply'],
    ['excel', 1, 1, 1],
    ['tracker', 0, 1, 1],
    ['shortlist', 0, 1, 1],
    ['alerts', 0, 1, 1],
    ['priority', 0, 1, 1],
    ['group', 'support'],
    ['ai', 25, 120, 300],
    ['checkin', 0, 0, 1],
    ['essay', 0, 0, 1]
  ];
  var ROWS = FEATURES.filter(function (f) { return f[0] !== 'group'; });
  var PLAN_ICON = { free: 'compass', compass: 'target', navigator: 'star' };

  function featLabel(f, col) {
    var v = f[col];
    return typeof v === 'number' && f[0] === 'ai'
      ? M.t('pricing.feat.aiN').replace('{n}', v)
      : M.t('pricing.feat.' + f[0]);
  }

  function priceFor(plan) {
    var minor = plans[plan][cycle];
    if (!minor) return { main: '0', per: M.t('pricing.forever'), note: '' };
    var day = ((cycle === 'yearly' ? minor / 365 : minor * 12 / 365) / 100).toFixed(2);
    if (cycle === 'yearly') {
      var monthly = minor / 12 / 100;
      return {
        main: (monthly % 1 ? monthly.toFixed(2) : String(monthly)),
        per: M.t('account.month'),
        note: M.t('pricing.billedYearly').replace('{total}', (minor / 100) + ' ₾')
          .replace('{save}', ((plans[plan].monthly * 12 - minor) / 100) + ' ₾'),
        day: day
      };
    }
    return { main: String(minor / 100), per: M.t('account.month'), note: M.t('pricing.billedMonthly'), day: day };
  }

  function card(plan) {
    var price = priceFor(plan);
    var user = M.state.user;
    var current = user && user.plan === plan;
    var popular = plan === 'compass';
    var cta;
    if (current) {
      cta = '<span class="btn btn-ghost btn-block" aria-disabled="true">' + M.icon('check', 17) + M.t('pricing.current') + '</span>';
    } else if (plan === 'free') {
      cta = user ? '<a class="btn btn-outline btn-block" href="/programs">' + M.t('home.cta.explore') + '</a>'
                 : '<a class="btn btn-outline btn-block" href="/login?mode=register">' + M.t('common.signUp') + '</a>';
    } else {
      cta = '<button type="button" class="btn ' + (popular ? 'btn-primary' : 'btn-accent') + ' btn-block" data-choose="' + plan + '">' +
        M.t('pricing.choose').replace('{plan}', M.t('pricing.' + plan + '.name')) + '</button>';
    }
    // each tier lists only what it adds over the one below it
    var col = ORDER.indexOf(plan) + 1;
    var included = ROWS.filter(function (f) { return f[col] && (col === 1 || f[col] !== f[col - 1]); });
    var lead = col > 1 ? '<p class="plan-lead">' + M.t('pricing.everything').replace('{plan}', M.t('pricing.' + ORDER[col - 2] + '.name')) + '</p>' : '';
    return '<article class="plan' + (popular ? ' plan-popular' : '') + (plan === 'navigator' ? ' plan-premium' : '') + '" data-reveal>' +
      (popular ? '<span class="plan-flag">' + M.t('pricing.popular') + '</span>' : '') +
      '<div class="plan-head"><span class="plan-ico">' + M.icon(PLAN_ICON[plan], 22) + '</span>' +
        '<h3>' + M.t('pricing.' + plan + '.name') + '</h3></div>' +
      '<p class="plan-for">' + M.t('pricing.' + plan + '.for') + '</p>' +
      '<div class="plan-amount"><b>' + price.main + '</b><span class="gel">₾</span><span class="plan-per">' + price.per + '</span></div>' +
      '<p class="plan-note">' + (price.note || '&nbsp;') + '</p>' +
      (price.day ? '<p class="plan-day">' + M.t('pricing.perDay').replace('{n}', price.day) + '</p>' : '') +
      cta + lead +
      '<ul class="plan-list">' + included.map(function (f) {
        var soon = f[ORDER.indexOf(plan) + 1] === 'soon';
        return '<li>' + M.icon('check', 17) + '<span>' + featLabel(f, col) +
          (soon ? ' <span class="badge badge-accent">' + M.t('footer.soon') + '</span>' : '') + '</span></li>';
      }).join('') + '</ul>' +
    '</article>';
  }

  function paintPlans() {
    var host = document.getElementById('planGrid');
    host.innerHTML = ORDER.map(card).join('');
    host.querySelectorAll('[data-choose]').forEach(function (button) {
      button.addEventListener('click', function () { choose(button.getAttribute('data-choose'), button); });
    });
    M.observeReveal(host);
  }

  function paintCompare() {
    var table = document.getElementById('compareTable');
    var cell = function (v) {
      if (v === 'soon') return '<span class="badge badge-accent">' + M.t('footer.soon') + '</span>';
      return v ? '<span class="yes">' + M.icon('check', 17) + '</span>' : '<span class="no">—</span>';
    };
    table.innerHTML = '<thead><tr><th></th>' + ORDER.map(function (p) {
        return '<th>' + M.t('pricing.' + p + '.name') + '</th>';
      }).join('') + '</tr></thead><tbody>' +
      FEATURES.map(function (f) {
        if (f[0] === 'group') return '<tr class="compare-group"><th colspan="4">' + M.t('pricing.group.' + f[1]) + '</th></tr>';
        return '<tr><th scope="row">' + M.t('pricing.feat.' + f[0]) + '</th>' + f.slice(1).map(function (v) {
          return '<td>' + (typeof v === 'number' && f[0] === 'ai' ? '<b class="mono">' + v + '</b><small class="dim"> / ' + M.t('pricing.day') + '</small>' : cell(v)) + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody>';
  }

  function paintFaq() {
    var host = document.getElementById('pricingFaq');
    host.innerHTML = [1, 2, 4, 5].map(function (i) {
      return '<div class="accordion-item">' +
        '<button type="button" class="accordion-trigger" aria-expanded="false"><span>' + M.t('pricing.faq.q' + i) + '</span>' +
        '<span class="accordion-icon">' + M.icon('plus', 15) + '</span></button>' +
        '<div class="accordion-panel"><div><p>' + M.t('pricing.faq.a' + i) + '</p></div></div></div>';
    }).join('');
    M.bindAccordions(host);
  }

  function choose(plan, button) {
    if (!M.state.user) {
      window.location.href = '/login?mode=register&next=' + encodeURIComponent('/pricing');
      return;
    }
    button.disabled = true;
    M.api('/api/checkout/plan', { body: { plan: plan, cycle: cycle } }).then(function (data) {
      button.disabled = false;
      if (!data.ok) { M.toast(M.t('auth.error.generic'), 'error'); return; }
      window.location.href = '/checkout?order=' + encodeURIComponent(data.order_id);
    });
  }

  function bindCycle() {
    var toggle = document.querySelector('.cycle-toggle');
    toggle.querySelectorAll('[data-cycle]').forEach(function (button) {
      button.addEventListener('click', function () {
        cycle = button.getAttribute('data-cycle');
        toggle.setAttribute('data-active', cycle);
        toggle.querySelectorAll('[data-cycle]').forEach(function (b) {
          b.setAttribute('aria-checked', String(b === button));
        });
        paintPlans();
      });
    });
  }

  function paintAll() { paintPlans(); paintCompare(); paintFaq(); }

  function init() {
    bindCycle();
    paintAll();
    M.api('/api/pricing').then(function (data) { if (data.plans) { plans = data.plans; paintPlans(); } });
    window.addEventListener('meridian:user', paintPlans);
    window.addEventListener('meridian:lang', paintAll);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
