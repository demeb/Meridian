/* ============================================================
   Meridian — tutor directory
   ============================================================ */
(function () {
  'use strict';

  var all = [];
  var access = {};
  var filters = { q: '', subjects: [], regions: [], languages: [], price: 200, sort: 'recommended' };

  var TAX = window.MERIDIAN_TAXONOMY;
  var SUBJECTS = TAX.subjects;
  var REGIONS = TAX.regions;
  var LANGUAGES = TAX.languages;


  function subjectLabel(slug) {
    return SUBJECTS[slug] ? M.pick(SUBJECTS[slug]) : slug;
  }

  /* ---------------------------------------------------------- filters */
  function checkGroup(hostId, table, key, source) {
    var host = document.getElementById(hostId);
    if (!host) return;
    var used = {};
    all.forEach(function (teacher) {
      (teacher[source] || []).forEach(function (value) { used[value] = (used[value] || 0) + 1; });
    });
    host.innerHTML = Object.keys(table).filter(function (value) { return used[value]; }).map(function (value) {
      return '<label class="check-row">' +
        '<input type="checkbox" value="' + value + '"' +
        (filters[key].indexOf(value) !== -1 ? ' checked' : '') + ' />' +
        '<span>' + M.esc(M.pick(table[value])) + '</span>' +
        '<span class="count">' + used[value] + '</span>' +
      '</label>';
    }).join('');
    host.querySelectorAll('input').forEach(function (input) {
      input.addEventListener('change', function () {
        var index = filters[key].indexOf(input.value);
        if (input.checked && index === -1) filters[key].push(input.value);
        if (!input.checked && index !== -1) filters[key].splice(index, 1);
        render();
      });
    });
  }

  function matches(teacher) {
    if (filters.price < 200 && teacher.price_display > filters.price) return false;
    if (filters.subjects.length && !filters.subjects.some(function (s) {
      return (teacher.subjects || []).indexOf(s) !== -1;
    })) return false;
    if (filters.regions.length && !filters.regions.some(function (r) {
      return (teacher.regions || []).indexOf(r) !== -1;
    })) return false;
    if (filters.languages.length && !filters.languages.some(function (l) {
      return (teacher.languages || []).indexOf(l) !== -1;
    })) return false;
    if (filters.q) {
      var haystack = [
        M.pick(teacher.name), M.pick(teacher.headline), M.pick(teacher.country), M.pick(teacher.city),
        (teacher.subjects || []).map(subjectLabel).join(' ')
      ].join(' ').toLowerCase();
      if (haystack.indexOf(filters.q.toLowerCase()) === -1) return false;
    }
    return true;
  }

  var SORTS = {
    recommended: function (a, b) { return ((b.rating || 4.5) * 20 + b.reviews / 10) - ((a.rating || 4.5) * 20 + a.reviews / 10); },
    priceAsc: function (a, b) { return a.price_display - b.price_display; },
    priceDesc: function (a, b) { return b.price_display - a.price_display; },
    rating: function (a, b) { return b.rating - a.rating; },
    experience: function (a, b) { return b.experience - a.experience; }
  };

  /* ---------------------------------------------------------- cards */
  function stars(rating) {
    return '<span class="tc-rating" style="margin-top:0">' + M.icon('star', 14) +
      '<strong style="color:var(--text-strong)">' + rating.toFixed(1) + '</strong></span>';
  }

  function card(teacher) {
    if (teacher.locked) {
      return '<article class="card teacher-card" style="align-items:center;text-align:center;justify-content:center">' +
        '<span class="lock-icon" style="width:48px;height:48px;display:grid;place-items:center;border-radius:50%;background:var(--brand-soft);color:var(--brand-hover)">' +
          M.icon('lock', 22) + '</span>' +
        '<h3 style="font-size:1.02rem">' + M.t('teachers.locked.title') + '</h3>' +
        '<p class="tc-bio">' + M.t('teachers.locked.body') + '</p>' +
        '<a class="btn btn-primary btn-block" href="/login?mode=register">' + M.t('common.signUp') + '</a>' +
      '</article>';
    }

    var tags = (teacher.subjects || []).slice(0, 4).map(function (slug) {
      return '<span class="badge">' + M.esc(subjectLabel(slug)) + '</span>';
    }).join('');

    var rating = teacher.sample
      ? '<span class="badge sample-badge" title="' + M.t('teachers.sampleWhy') + '">' + M.t('teachers.sample') + '</span>'
      : teacher.rating
      ? stars(teacher.rating) + '<span class="dim" style="font-size:.78rem"> · ' + teacher.reviews + ' ' + M.t('teachers.reviews') + '</span>'
      : '<span class="badge badge-brand">' + M.t('teachers.new') + '</span>';

    return '<article class="card card-hover card-lit teacher-card" data-reveal>' +
      '<div class="tc-head">' +
        avatar(teacher, '') +
        '<div style="min-width:0;flex:1">' +
          '<h3 class="tc-name">' + M.esc(M.pick(teacher.name)) +
            (teacher.verified ? ' <span class="verified-tick" title="' + M.t('teachers.verified') + '">' +
              M.icon('check', 11) + '</span>' : '') + '</h3>' +
          '<p class="tc-role">' + M.esc(M.pick(teacher.headline)) + '</p>' +
          '<p class="dim" style="font-size:.8rem;margin-top:.25rem">' + (teacher.flag || '') + ' ' +
            M.esc(M.pick(teacher.city)) + (M.pick(teacher.city) ? ', ' : '') + M.esc(M.pick(teacher.country)) + '</p>' +
          '<div class="tc-meta">' + rating +
            (teacher.experience ? '<span class="dim" style="font-size:.78rem"> · ' + teacher.experience + ' ' + M.t('teachers.years') + '</span>' : '') +
          '</div>' +
        '</div>' +
      '</div>' +
      '<p class="tc-bio">' + M.esc(M.pick(teacher.intro) || '') + '</p>' +
      '<div class="tag-list">' + tags + '</div>' +
      '<div class="tc-foot">' +
        '<span class="tc-price"><b>' + M.money(teacher.price_display) + '</b> <span>' + M.t('teachers.perHour') + '</span></span>' +
        '<a class="btn btn-primary btn-sm" href="/teacher?id=' + encodeURIComponent(teacher.id) + '">' +
          M.t('teachers.view') + M.icon('arrowRight', 16) + '</a>' +
      '</div>' +
    '</article>';
  }

  function avatar(teacher, size) { return M.avatar(teacher, size); }

  function joinCard() {
    return '<article class="card teacher-card join-card" data-reveal>' +
      '<span class="value-icon">' + M.icon('userPlus', 22) + '</span>' +
      '<h3 style="font-size:1.06rem">' + M.t('teachers.join.title') + '</h3>' +
      '<p class="tc-bio">' + M.t('teachers.join.body') + '</p>' +
      '<a class="btn btn-outline btn-sm" href="/tutors/apply">' + M.t('teachers.join.cta') + M.icon('arrowRight', 16) + '</a>' +
    '</article>';
  }

  function render() {
    var host = document.getElementById('teacherGrid');
    var count = document.getElementById('resultCount');
    if (!host) return;

    var unlocked = all.filter(function (t) { return !t.locked; });
    var lockedOnes = all.filter(function (t) { return t.locked; });
    var list = unlocked.filter(matches).sort(SORTS[filters.sort] || SORTS.recommended);

    count.textContent = list.length + ' ' + M.t('teachers.count');

    if (!list.length && !lockedOnes.length) {
      host.innerHTML = '<div class="empty-state" style="grid-column:1/-1">' + M.icon('users', 42) +
        '<h3 style="font-size:1.05rem;margin-bottom:.5rem">' + M.t('teachers.empty.title') + '</h3>' +
        '<p>' + M.t('teachers.empty.body') + '</p></div>';
      return;
    }

    var markup = list.map(card).join('');
    if (lockedOnes.length) markup += card(lockedOnes[0]);

    host.innerHTML = markup;
    M.observeReveal(host);
  }

  function paintSort() {
    var node = document.getElementById('sortSelect');
    if (!node) return;
    node.innerHTML = Object.keys(SORTS).map(function (key) {
      return '<option value="' + key + '"' + (filters.sort === key ? ' selected' : '') + '>' +
        M.esc(M.t('teachers.sort.' + key)) + '</option>';
    }).join('');
    node.onchange = function () { filters.sort = node.value; render(); };
  }

  function paintFilters() {
    checkGroup('subjectFilters', SUBJECTS, 'subjects', 'subjects');
    checkGroup('regionFilters', REGIONS, 'regions', 'regions');
    checkGroup('languageFilters', LANGUAGES, 'languages', 'languages');
    paintSort();
  }

  /* ---------------------------------------------------------- boot */
  function paintBanner() {
    var icon = document.querySelector('.teach-banner [data-icon]');
    if (icon) icon.innerHTML = M.icon('userPlus', 22);
    var points = document.querySelector('.teach-banner .tb-points');
    if (points) points.innerHTML = ['teachers.join.p1', 'teachers.join.p2', 'teachers.join.p3'].map(function (k) {
      return '<span>' + M.icon('check', 15) + M.t(k) + '</span>';
    }).join('');
  }

  function init() {
    paintBanner();
    window.addEventListener('meridian:lang', paintBanner);
    var params = new URLSearchParams(window.location.search);
    if (params.get('subject')) filters.subjects = params.get('subject').split(',').filter(Boolean);
    filters.q = params.get('q') || '';

    var search = document.getElementById('teacherSearch');
    search.value = filters.q;
    var timer = null;
    search.addEventListener('input', function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(function () { filters.q = search.value.trim(); render(); }, 170);
    });

    var range = document.getElementById('priceRange');
    var output = document.getElementById('priceValue');
    range.addEventListener('input', function () {
      filters.price = Number(range.value);
      output.innerHTML = '$' + (filters.price >= 200 ? '200+' : filters.price);
      render();
    });

    document.getElementById('clearFilters').addEventListener('click', function () {
      filters = { q: '', subjects: [], regions: [], languages: [], price: 200, sort: filters.sort };
      search.value = '';
      range.value = 200;
      output.textContent = '$200+';
      paintFilters();
      render();
    });

    M.api('/api/teachers').then(function (data) {
      all = data.teachers || [];
      access = data.access || {};
      paintFilters();
      render();
    });

    window.addEventListener('meridian:lang', function () { paintFilters(); render(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
