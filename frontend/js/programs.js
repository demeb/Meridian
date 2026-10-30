/* ============================================================
   Meridian — programmes: Projects and Scholarships on the globe
   (Universities have their own section at /universities)
   ============================================================ */
(function () {
  'use strict';

  var all = [];
  var globe = null;
  var selectedId = null;
  var section = 'project';

  var filters = { type: 'all', region: 'all', cost: 'all', host: 'all', q: '', country: null, field: 'all' };

  /* Category chips per section */
  var TYPES = {
    project: {
      all: { en: 'All projects', ka: 'ყველა პროექტი', ar: 'كل المشاريع' },
      mun: { en: 'MUN conferences', ka: 'MUN კონფერენციები', ar: 'مؤتمرات نموذج الأمم المتحدة' },
      erasmus: { en: 'Erasmus+', ka: 'Erasmus+', ar: 'إيراسموس+' },
      exchange: { en: 'Exchange', ka: 'გაცვლითი პროგრამები', ar: 'برامج التبادل' },
      flex: { en: 'FLEX', ka: 'FLEX', ar: 'FLEX' },
      uwc: { en: 'UWC programmes', ka: 'UWC პროგრამები', ar: 'برامج UWC' },
      summer: { en: 'Summer schools', ka: 'საზაფხულო სკოლები', ar: 'المدارس الصيفية' },
      competition: { en: 'Competitions', ka: 'კონკურსები', ar: 'المسابقات' },
      startup: { en: 'Entrepreneurship & startups', ka: 'მეწარმეობა და სტარტაპები', ar: 'ريادة الأعمال والشركات الناشئة' },
      youth: { en: 'Youth projects', ka: 'ახალგაზრდული პროექტები', ar: 'مشاريع الشباب' },
      volunteering: { en: 'Volunteering', ka: 'მოხალისეობა', ar: 'التطوع' },
      stem: { en: 'STEM programmes', ka: 'STEM პროგრამები', ar: 'برامج العلوم والتكنولوجيا' },
      training: { en: 'Trainings & webinars', ka: 'ტრენინგები და ვებინარები', ar: 'تدريبات وندوات عبر الإنترنت' }
    },
    scholarship: {
      all: { en: 'All scholarships', ka: 'ყველა სტიპენდია', ar: 'كل المنح' },
      bachelor: { en: "Bachelor's", ka: 'ბაკალავრიატი', ar: 'البكالوريوس' },
      masters: { en: "Master's", ka: 'მაგისტრატურა', ar: 'الماجستير' },
      phd: { en: 'PhD', ka: 'დოქტორანტურა', ar: 'الدكتوراه' },
      erasmus: { en: 'Erasmus Mundus', ka: 'Erasmus Mundus', ar: 'إيراسموس موندوس' },
      'fully-funded': { en: 'Fully funded', ka: 'სრულად დაფინანსებული', ar: 'ممولة بالكامل' }
    }
  };
  var TYPE_ICONS = { all: 'globe', uwc: 'cap', erasmus: 'star', flex: 'send', exchange: 'send', summer: 'zap', mun: 'globe',
    youth: 'users', startup: 'trending', competition: 'award', volunteering: 'heart', stem: 'zap', training: 'book',
    bachelor: 'cap', masters: 'book',
    phd: 'building', 'fully-funded': 'shield' };

  var FAMILY_LABEL = {
    erasmus: { en: 'Erasmus+', ka: 'Erasmus+', ar: 'إيراسموس+' },
    mun: { en: 'Model UN', ka: 'გაეროს მოდელირება', ar: 'نموذج الأمم المتحدة' },
    flex: { en: 'FLEX', ka: 'FLEX', ar: 'FLEX' },
    exchange: { en: 'Exchange', ka: 'გაცვლა', ar: 'تبادل' },
    volunteering: { en: 'Volunteering', ka: 'მოხალისეობა', ar: 'تطوع' },
    stem: { en: 'STEM', ka: 'STEM', ar: 'STEM' },
    training: { en: 'Training', ka: 'ტრენინგი', ar: 'تدريب' },
    summer: { en: 'Summer school', ka: 'საზაფხულო სკოლა', ar: 'مدرسة صيفية' },
    competition: { en: 'Competition', ka: 'კონკურსი', ar: 'مسابقة' },
    startup: { en: 'Startup', ka: 'სტარტაპი', ar: 'شركة ناشئة' },
    youth: { en: 'Youth', ka: 'ახალგაზრდული', ar: 'شباب' },
    uwc: { en: 'UWC', ka: 'UWC', ar: 'UWC' },
    scholarship: { en: 'Scholarship', ka: 'სტიპენდია', ar: 'منحة' },
    university: { en: 'Scholarship', ka: 'სტიპენდია', ar: 'منحة' }
  };

  var REGIONS = {
    all: { en: 'All regions', ka: 'ყველა რეგიონი', ar: 'كل المناطق' },
    europe: { en: 'Europe', ka: 'ევროპა', ar: 'أوروبا' },
    americas: { en: 'Americas', ka: 'ამერიკა', ar: 'الأمريكتان' },
    asia: { en: 'Asia', ka: 'აზია', ar: 'آسيا' },
    oceania: { en: 'Oceania', ka: 'ოკეანია', ar: 'أوقيانوسيا' },
    'middle-east': { en: 'Middle East', ka: 'ახლო აღმოსავლეთი', ar: 'الشرق الأوسط' },
    africa: { en: 'Africa', ka: 'აფრიკა', ar: 'أفريقيا' },
    global: { en: 'Global / online', ka: 'გლობალური / ონლაინ', ar: 'عالمي / عبر الإنترنت' }
  };

  var COSTS = {
    all: { en: 'Any funding', ka: 'ნებისმიერი', ar: 'أي تمويل' },
    'fully-funded': { en: 'Fully funded', ka: 'სრულად დაფინანსებული', ar: 'ممول بالكامل' },
    scholarship: { en: 'Scholarship available', ka: 'სტიპენდიით', ar: 'منحة متاحة' },
    'tuition-free': { en: 'Tuition free', ka: 'უფასო სწავლება', ar: 'بدون رسوم دراسية' },
    funded: { en: 'Grant supported', ka: 'გრანტით', ar: 'بدعم منحة' },
    paid: { en: 'Self funded', ka: 'თვითდაფინანსებით', ar: 'تمويل ذاتي' },
    free: { en: 'Free to join', ka: 'უფასო', ar: 'مجاني' }
  };

  /* Words students type → what they mean */
  var SYNONYMS = {
    exchange: ['exchange', 'flex', 'erasmus', 'youth exchange', 'ugrad', 'mobility', 'semester'],
    'გაცვლ': ['exchange', 'flex', 'erasmus'],
    'تبادل': ['exchange', 'flex', 'erasmus'],
    scholarship: ['scholarship', 'fully-funded', 'grant', 'fellowship', 'funding'],
    'სტიპენდ': ['scholarship'],
    'منح': ['scholarship'],
    mun: ['mun', 'model united nations', 'diplomacy'],
    'model un': ['mun'],
    'გაერო': ['mun'],
    'الأمم المتحدة': ['mun'],
    erasmus: ['erasmus', 'erasmus+', 'european solidarity', 'mundus'],
    summer: ['summer', 'pre-college', 'camp'],
    masters: ['master', 'masters', 'msc', 'postgraduate'],
    master: ['master', 'masters', 'postgraduate'],
    phd: ['phd', 'doctoral', 'doctorate'],
    bachelor: ['bachelor', 'undergraduate'],
    olympiad: ['olympiad', 'competition'],
    hackathon: ['hackathon', 'competition'],
    startup: ['startup', 'accelerator', 'founder', 'entrepreneur'],
    volunteer: ['volunteer', 'solidarity', 'esc'],
    free: ['fully-funded', 'free', 'tuition-free']
  };

  /* Big countries get up to 10 pins, the rest up to 5 — the best ones show */
  var LARGE = ('RU CA US CN BR AU IN AR KZ DZ CD SA MX ID SD LY IR MN PE TD NE AO ML ZA CO ET BO MR EG TZ NG VE NA ' +
    'MZ PK TR CL ZM MM AF SS SO CF UA MG BW KE FR YE TH ES TM CM PG SE UZ MA IQ PY ZW JP DE CG FI VN MY NO CI PL ' +
    'OM IT PH EC BF NZ GA GN GB UG GH RO').split(' ');

  function label(table, key) {
    var entry = table[key];
    return entry ? M.pick(entry) : key;
  }

  function levelOf(program) {
    if (program.level && program.level.length) return program.level;
    var text = [(program.keywords || []).join(' '), program.grades, program.type, M.pick(program.name), program.name.en]
      .join(' ').toLowerCase();
    var levels = [];
    if (/bachelor|undergrad/.test(text)) levels.push('bachelor');
    if (/master|msc|mphil|postgrad|graduate/.test(text)) levels.push('masters');
    if (/phd|doctor/.test(text)) levels.push('phd');
    return levels;
  }

  function haystack(program) {
    if (!program._hay) {
      program._hay = [
        program.name.en, program.name.ka, program.name.ar, program.org, program.city,
        program.country.en, program.country.ka, program.country.ar,
        program.summary && program.summary.en, program.family, program.type, program.cost,
        (program.keywords || []).join(' '), program.family === 'mun' ? 'model united nations mun' : '',
        ['flex', 'erasmus', 'exchange'].indexOf(program.family) !== -1 ? 'exchange' : ''
      ].join(' ').toLowerCase();
    }
    return program._hay;
  }

  function queryMatches(program, q) {
    var hay = haystack(program);
    var words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return words.every(function (word) {
      if (hay.indexOf(word) !== -1) return true;
      var alts = null;
      Object.keys(SYNONYMS).some(function (key) {
        if (word.indexOf(key) === 0 || key.indexOf(word) === 0 && word.length >= 3) { alts = SYNONYMS[key]; return true; }
        return false;
      });
      return !!alts && alts.some(function (alt) { return hay.indexOf(alt) !== -1; });
    });
  }

  /* ---------------------------------------------------------- filtering */
  function fieldsFor(program) {
    return M.fieldsOf(program, [program.name.en, program.summary && program.summary.en, program.type,
      (program.keywords || []).join(' '), program.family === 'mun' ? 'model united nations' : ''].join(' '));
  }

  // FLEX is an exchange programme too: it also shows under "Exchange"
  function familyIn(program, key) {
    return program.family === key || (key === 'exchange' && program.family === 'flex');
  }

  function inSection(program) {
    return (program.section || 'project') === section;
  }

  function matches(program) {
    if (!inSection(program)) return false;
    if (filters.country && program.iso !== filters.country) return false;
    if (filters.host !== 'all' && program.iso !== filters.host) return false;
    if (filters.type !== 'all') {
      if (section === 'project' && !familyIn(program, filters.type)) return false;
      if (section === 'scholarship') {
        if (filters.type === 'erasmus' && program.family !== 'erasmus') return false;
        if (filters.type === 'fully-funded' && program.cost !== 'fully-funded') return false;
        if (['bachelor', 'masters', 'phd'].indexOf(filters.type) !== -1 && levelOf(program).indexOf(filters.type) === -1) return false;
      }
    }
    if (filters.region !== 'all' && program.region !== filters.region) return false;
    if (filters.cost !== 'all' && program.cost !== filters.cost) return false;
    if (filters.field !== 'all' && fieldsFor(program).indexOf(filters.field) === -1) return false;
    if (filters.q && !queryMatches(program, filters.q)) return false;
    return true;
  }

  function visible() {
    return all.filter(matches);
  }

  function rank(a, b) {
    var sa = a.score || 0, sb = b.score || 0;
    if (sb !== sa) return sb - sa;
    return (a.deadline || '9999') < (b.deadline || '9999') ? -1 : 1;
  }

  /* ---------------------------------------------------------- chrome */
  function paintSections() {
    document.querySelectorAll('[data-section]').forEach(function (tab) {
      var on = tab.getAttribute('data-section') === section;
      tab.classList.toggle('is-active', on);
      tab.setAttribute('aria-selected', String(on));
      var count = tab.querySelector('.sec-count');
      if (count) {
        var key = tab.getAttribute('data-section');
        count.textContent = all.filter(function (p) { return (p.section || 'project') === key; }).length;
      }
    });
    document.getElementById('programsTitle').textContent = M.t(section === 'scholarship' ? 'programs.s.title' : 'programs.p.title');
    document.getElementById('programsLede').textContent = M.t(section === 'scholarship' ? 'programs.s.lede' : 'programs.p.lede');
  }

  function chipCount(key) {
    return all.filter(function (p) {
      if (!inSection(p)) return false;
      if (key === 'all') return true;
      if (section === 'project') return familyIn(p, key);
      if (key === 'erasmus') return p.family === 'erasmus';
      if (key === 'fully-funded') return p.cost === 'fully-funded';
      return levelOf(p).indexOf(key) !== -1;
    }).length;
  }

  function paintChips() {
    var host = document.getElementById('typeChips');
    if (!host) return;
    var table = TYPES[section];
    host.innerHTML = Object.keys(table).filter(function (key) {
      return key === 'all' || chipCount(key) > 0;
    }).map(function (key) {
      return '<button type="button" class="cat-chip' + (key === 'erasmus' || key === 'mun' ? ' cat-chip-special' : '') +
        '" data-type="' + key + '" aria-pressed="' + (filters.type === key) + '">' +
        M.icon(TYPE_ICONS[key] || 'globe', 16) + '<span>' + M.esc(label(table, key)) + '</span>' +
        '<span class="cat-count">' + chipCount(key) + '</span></button>';
    }).join('');
    host.querySelectorAll('[data-type]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        filters.type = chip.getAttribute('data-type');
        paintChips();
        if (selectedId) deselect(); else refresh();
      });
    });
  }

  function paintSelect(id, table, key) {
    var node = document.getElementById(id);
    if (!node) return;
    node.innerHTML = Object.keys(table).map(function (value) {
      return '<option value="' + value + '"' + (filters[key] === value ? ' selected' : '') + '>' +
        M.esc(label(table, value)) + '</option>';
    }).join('');
    node.onchange = function () {
      filters[key] = node.value;
      if (selectedId) deselect(); else refresh();
    };
  }

  /* Host countries present in this section, for "scholarships by country" */
  function paintHosts() {
    var node = document.getElementById('hostSelect');
    if (!node) return;
    var seen = {};
    var words = {};
    all.filter(inSection).forEach(function (p) {
      if (!seen[p.iso]) {
        seen[p.iso] = { name: M.pick(p.country), flag: p.flag, n: 0 };
        words[p.iso] = [p.country.en, p.country.ka, p.country.ar].join(' ');
      }
      seen[p.iso].n += 1;
    });
    var keys = Object.keys(seen).sort(function (a, b) { return seen[a].name.localeCompare(seen[b].name); });
    node.innerHTML = '<option value="all">' + M.esc(M.t('programs.filter.anyHost')) + '</option>' +
      keys.map(function (iso) {
        return '<option value="' + iso + '"' + (filters.host === iso ? ' selected' : '') + '>' +
          seen[iso].flag + ' ' + M.esc(seen[iso].name) + ' (' + seen[iso].n + ')</option>';
      }).join('');
    node.onchange = function () {
      filters.host = node.value;
      if (selectedId) deselect(); else refresh();
    };
    M.searchSelect(node, words);
  }

  /* Countries we treat as "around you" for the regional highlights */
  var NEIGHBOURS = [
    ['QA', 'AE', 'SA', 'KW', 'BH', 'OM'],
    ['GE', 'AM', 'AZ', 'TR', 'UA'],
    ['EG', 'JO', 'LB', 'IQ', 'PS', 'SY'],
    ['MA', 'DZ', 'TN', 'LY'],
    ['KZ', 'UZ', 'KG', 'TJ', 'TM'],
    ['IN', 'PK', 'BD', 'LK', 'NP'],
    ['US', 'CA', 'MX']
  ];
  var hlScope = 'global';
  var hlTouched = false;

  function homeCountry() {
    var user = M.state.user;
    return user && user.country ? String(user.country).toUpperCase() : null;
  }

  function nearSet(iso) {
    var set = [iso];
    NEIGHBOURS.forEach(function (group) {
      if (group.indexOf(iso) !== -1) set = set.concat(group);
    });
    return set;
  }

  /* Top 10 in this section: agents' score, then nearest deadline. In the
     regional view, programmes in or around the student's country come first. */
  function highlightList() {
    var open = all.filter(inSection).filter(function (p) {
      var d = M.daysUntil(p.deadline);
      return d === null || d >= 0;
    }).sort(rank);
    var home = homeCountry();
    if (hlScope !== 'local' || !home) return open.slice(0, 10);
    // the best ten in the student's own country first, then its neighbours, then its region
    var near = nearSet(home);
    var local = open.filter(function (p) { return p.iso === home; });
    if (local.length < 10) {
      local = local.concat(open.filter(function (p) { return p.iso !== home && near.indexOf(p.iso) !== -1; }));
    }
    if (local.length < 10) {
      var region = (open.filter(function (p) { return p.iso === home; })[0] || {}).region ||
        (all.filter(function (p) { return near.indexOf(p.iso) !== -1; })[0] || {}).region;
      if (region) {
        local = local.concat(open.filter(function (p) {
          return local.indexOf(p) === -1 && p.region === region;
        }));
      }
    }
    return (local.length ? local : open).slice(0, 10);
  }

  function homeName(iso) {
    var any = all.filter(function (p) { return p.iso === iso; })[0];
    return any ? M.pick(any.country) : iso;
  }

  /* "Top 10 in Georgia" / "Global": the country comes from the student's sign-up */
  function paintScope() {
    var host = document.getElementById('hlScope');
    if (!host) return;
    var home = homeCountry();
    host.hidden = false;
    host.innerHTML = ['local', 'global'].map(function (key) {
      var text = key === 'local'
        ? (home ? M.t('programs.hl.inCountry').replace('{country}', homeName(home)) : M.t('programs.hl.myCountry'))
        : M.t('programs.hl.global');
      return '<button type="button" data-scope="' + key + '" aria-pressed="' + (hlScope === key && (key === 'global' || !!home)) + '">' +
        (key === 'local' ? (home ? flagOf(home) + ' ' : M.icon('pin', 14)) : M.icon('globe', 14)) +
        '<span>' + M.esc(text) + '</span></button>';
    }).join('');
    host.querySelectorAll('[data-scope]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (button.getAttribute('data-scope') === 'local' && !home) {
          M.toast(M.t('programs.hl.signIn'), 'info', 3200);
          window.setTimeout(function () { window.location.href = '/login?mode=register&next=' + encodeURIComponent('/programs'); }, 900);
          return;
        }
        hlScope = button.getAttribute('data-scope');
        hlTouched = true;
        paintScope(); paintStrip();
        if (globe) globe.setPins(pinsFromVisible());
      });
    });
    document.getElementById('hlTitle').textContent = hlScope === 'local' && home
      ? M.t('programs.hl.countryTitle').replace('{country}', homeName(home))
      : M.t('programs.hl.title');
  }

  function familyLabel(program) {
    return label(FAMILY_LABEL, program.family);
  }

  function paintStrip() {
    var host = document.getElementById('highlightTrack');
    if (!host) return;
    host.innerHTML = highlightList().map(function (program, index) {
      var days = M.daysUntil(program.deadline);
      var when = program.deadline
        ? (days <= 30 ? '<span class="badge badge-accent badge-dot">' + days + ' ' + M.t('home.rail.days') + '</span>'
                      : '<span class="badge">' + M.formatDate(program.deadline) + '</span>')
        : '<span class="badge">' + M.t('programs.rolling') + '</span>';
      return '<a class="hl-card" href="/programs/' + encodeURIComponent(program.id) + '">' +
        '<span class="hl-rank">' + String(index + 1).padStart(2, '0') + '</span>' +
        '<span class="hl-top"><span class="hl-flag">' + program.flag + '</span>' +
          '<span class="badge badge-brand">' + M.esc(familyLabel(program)) + '</span></span>' +
        '<b class="hl-name">' + M.esc(M.pick(program.name)) + '</b>' +
        '<span class="hl-org">' + M.esc(program.org) + ' · ' + M.esc(M.pick(program.country)) + '</span>' +
        '<span class="hl-foot">' + when + '<span class="hl-cost">' + M.esc(label(COSTS, program.cost)) + '</span></span>' +
      '</a>';
    }).join('');
  }

  /* ---------------------------------------------------------- panel */
  function resultRow(program) {
    var days = M.daysUntil(program.deadline);
    var meta = M.pick(program.country) + ' · ' +
      (program.deadline ? (days >= 0 ? days + ' ' + M.t('home.rail.days') : M.t('home.rail.closed')) : M.t('programs.rolling'));
    return '<button type="button" class="pin-result' + (selectedId === program.id ? ' is-selected' : '') +
      '" data-open="' + M.esc(program.id) + '">' +
      '<span class="flag">' + program.flag + '</span>' +
      '<span style="min-width:0;flex:1">' +
        '<h4>' + M.esc(M.pick(program.name)) + '</h4>' +
        '<p>' + M.esc(meta) + '</p>' +
      '</span>' +
      (program.locked ? '<span class="badge">' + M.icon('lock', 13) + '</span>' : '') +
    '</button>';
  }

  function paintList() {
    var host = document.getElementById('panelBody');
    var count = document.getElementById('panelCount');
    var back = document.getElementById('panelBack');
    if (!host) return;
    back.hidden = true;
    var list = visible().sort(rank);
    count.textContent = list.length + ' ' + M.t('programs.results');
    var ctl = document.getElementById('ctlCount');
    if (ctl) ctl.textContent = list.length + ' / ' + all.filter(inSection).length;

    if (!list.length) {
      host.innerHTML = '<div class="empty-state">' + M.icon('search', 42) +
        '<p>' + M.t('teachers.empty.body') + '</p></div>';
      return;
    }
    // long lists render in pages of 80 rows so filtering stays instant
    var shownRows = 0;
    var more = function () {
      var next = list.slice(shownRows, shownRows + 80);
      shownRows += next.length;
      var old = host.querySelector('.list-more');
      if (old) old.remove();
      host.insertAdjacentHTML('beforeend', next.map(resultRow).join('') +
        (shownRows < list.length ? '<button type="button" class="btn btn-ghost btn-sm list-more">' +
          M.t('programs.showMore').replace('{n}', list.length - shownRows) + '</button>' : ''));
    };
    host.innerHTML = '';
    more();
    host.onclick = function (event) {
      var row = event.target.closest('[data-open]');
      if (row) { select(row.getAttribute('data-open'), true); return; }
      if (event.target.closest('.list-more')) more();
    };
  }

  function detailMarkup(program) {
    var days = M.daysUntil(program.deadline);
    var urgency = days === null ? '<span class="badge">' + M.t('programs.rolling') + '</span>' :
      days < 0 ? '<span class="badge">' + M.t('home.rail.closed') + '</span>' :
      days <= 30 ? '<span class="badge badge-accent badge-dot">' + days + ' ' + M.t('home.rail.days') + '</span>' :
      '<span class="badge badge-success badge-dot">' + days + ' ' + M.t('home.rail.days') + '</span>';

    var rows = [
      ['programs.deadline', program.deadline ? M.formatDate(program.deadline) : M.t('programs.rolling')],
      ['programs.duration', M.pick(program.duration)],
      ['programs.level', program.grades],
      ['programs.cost', label(COSTS, program.cost)],
      ['programs.host', program.org]
    ].map(function (row) {
      return '<div class="detail-row"><dt>' + M.t(row[0]) + '</dt><dd>' + M.esc(row[1] || '—') + '</dd></div>';
    }).join('');

    var href = '/programs/' + encodeURIComponent(program.id);
    var summary = program.locked
      ? '<div class="lock-card" style="text-align:center">' +
          '<span class="lock-icon">' + M.icon('lock', 24) + '</span>' +
          '<h4>' + M.t('common.locked') + '</h4>' +
          '<p class="muted" style="margin:.6rem 0 1.2rem;font-size:.9rem">' + M.t('teachers.locked.body') + '</p>' +
          '<a class="btn btn-primary btn-block" href="/login?mode=register">' + M.t('common.signUp') + '</a>' +
        '</div>'
      : '<p style="font-size:.93rem;color:var(--text-muted)">' + M.esc(M.pick(program.summary)) + '</p>';

    return '<div class="detail-hero">' +
        '<span class="flag-lg">' + program.flag + '</span>' +
        '<div style="min-width:0">' +
          '<div class="cluster" style="margin-bottom:.4rem">' + urgency +
            '<span class="badge badge-brand">' + M.esc(familyLabel(program)) + '</span></div>' +
          '<h3>' + M.esc(M.pick(program.name)) + '</h3>' +
          '<p class="muted" style="font-size:.88rem">' + M.esc(M.pick(program.country)) +
            (program.city ? ' · ' + M.esc(program.city) : '') + '</p>' +
        '</div>' +
      '</div>' +
      summary +
      '<dl class="detail-rows">' + rows + '</dl>' +
      '<div class="cluster" style="margin-top:auto">' +
        '<a class="btn btn-primary" href="' + href + '">' + M.t('common.learnMore') + M.icon('arrowRight', 17) + '</a>' +
      '</div>';
  }

  /* "Back to 🇶🇦 Qatar · Competitions (24)": the back button names the list it returns to */
  function backLabel() {
    var bits = [];
    var iso = filters.country || (filters.host !== 'all' ? filters.host : null);
    if (iso) {
      var any = all.filter(function (p) { return p.iso === iso; })[0];
      bits.push(flagOf(iso) + ' ' + (any ? M.pick(any.country) : iso));
    }
    if (filters.type !== 'all') bits.push(label(TYPES[section], filters.type));
    if (filters.region !== 'all') bits.push(label(REGIONS, filters.region));
    if (filters.field !== 'all') bits.push(M.pick(M.FIELDS[filters.field]));
    if (filters.q) bits.push('“' + filters.q + '”');
    if (!bits.length) return M.t('programs.panel.back');
    return M.t('programs.panel.backTo') + ' ' + bits.join(' · ') + ' (' + visible().length + ')';
  }

  function paintDetail(program) {
    var host = document.getElementById('panelBody');
    var count = document.getElementById('panelCount');
    var back = document.getElementById('panelBack');
    back.hidden = false;
    back.querySelector('span').textContent = backLabel();
    count.textContent = program.flag + ' ' + M.pick(program.country);
    host.innerHTML = detailMarkup(program);
    host.scrollTop = 0;
  }

  function select(id, fly) {
    var program = all.filter(function (p) { return p.id === id; })[0];
    if (!program) return;
    if (!inSection(program)) {
      section = program.section || 'project';
      filters.type = 'all';
      filters.host = 'all';
      paintSections(); paintChips(); paintHosts(); paintStrip();
    }
    selectedId = id;
    if (globe) {
      globe.setPins(pinsFromVisible());
      globe.select(id);
      if (fly) globe.flyTo(program.lat, program.lon);
    }
    paintDetail(program);
    var url = new URL(window.location.href);
    url.searchParams.set('p', id);
    window.history.replaceState({}, '', url);
  }

  function deselect() {
    selectedId = null;
    if (globe) { globe.select(null); }
    refresh();
    var url = new URL(window.location.href);
    url.searchParams.delete('p');
    window.history.replaceState({}, '', url);
  }

  /* ---------------------------------------------------------- globe glue */
  function pinsFromVisible() {
    var highlightIds = highlightList().map(function (p) { return p.id; });
    var list = visible().sort(rank);
    // aesthetic limit: the best 10 per large country, 5 per smaller one,
    // unless the student has picked that country (then show everything)
    var perCountry = {};
    var shown = list.filter(function (program) {
      if (program.id === selectedId) return true;
      if (filters.country || filters.host !== 'all') return true;
      var cap = LARGE.indexOf(program.iso) !== -1 ? 10 : 5;
      perCountry[program.iso] = (perCountry[program.iso] || 0) + 1;
      return perCountry[program.iso] <= cap;
    });
    // every pin is a DOM node moved on each frame: keep the globe smooth by
    // showing the best 160 (or 400 for one country), plus the open programme
    var limit = filters.country || filters.host !== 'all' ? 400 : 160;
    if (shown.length > limit) {
      shown = shown.slice(0, limit).concat(shown.slice(limit).filter(function (p) { return p.id === selectedId; }));
    }
    return shown.map(function (program) {
      var days = M.daysUntil(program.deadline);
      return {
        id: program.id,
        iso: program.iso,
        lon: program.lon,
        lat: program.lat,
        locked: !!program.locked,
        urgent: days !== null && days >= 0 && days <= 30,
        highlight: highlightIds.indexOf(program.id) !== -1,
        title: M.pick(program.name),
        subtitle: M.pick(program.country)
      };
    });
  }

  /* Filters live in the address bar, so "back" from a programme page (or a shared
     link) lands on the same filtered list, e.g. /programs?host=QA&type=mun */
  function syncUrl() {
    var url = new URL(window.location.href);
    [['type', filters.type, 'all'], ['host', filters.host, 'all'], ['region', filters.region, 'all'],
     ['cost', filters.cost, 'all'], ['field', filters.field, 'all'], ['q', filters.q, ''], ['c', filters.country || '', '']].forEach(function (entry) {
      if (entry[1] && entry[1] !== entry[2]) url.searchParams.set(entry[0], entry[1]); else url.searchParams.delete(entry[0]);
    });
    if (url.href !== window.location.href) window.history.replaceState({}, '', url);
  }

  function refresh() {
    syncUrl();
    if (globe) globe.setPins(pinsFromVisible());
    if (selectedId && !visible().some(function (p) { return p.id === selectedId; })) {
      deselect();
    } else if (!selectedId) {
      paintList();
    }
  }

  function flagOf(iso) {
    return iso && iso.length === 2 ? String.fromCodePoint.apply(null, iso.split('').map(function (c) { return 0x1F1E6 + c.charCodeAt(0) - 65; })) : '';
  }

  /* Clicking a country names it the UN way, then filters to its programmes */
  function setCountry(iso, name, props) {
    props = props || {};
    filters.country = iso || null;
    if (globe) globe.selectCountry(iso);
    var chip = document.getElementById('countryChip');
    document.getElementById('countryChipFlag').textContent = flagOf(iso);
    document.getElementById('countryChipLabel').textContent = props.official || name;
    var status = props.un === 'observer' ? M.t('programs.un.observer') : props.un === 'territory' ? M.t('programs.un.territory') : M.t('programs.un.member');
    var local = props.name && props.name[M.state.lang] && M.state.lang !== 'en' ? props.name[M.state.lang] + ' · ' : '';
    document.getElementById('countryChipNote').textContent = local + status + (props.note ? ' · ' + props.note : '');
    chip.hidden = false;
    var hasPrograms = all.some(function (p) { return p.iso === iso && inSection(p); });
    if (!hasPrograms) M.toast(name + ' — ' + M.t('programs.noneHere'), 'info', 2400);
    if (selectedId) deselect(); else refresh();
  }

  function clearCountry() {
    filters.country = null;
    if (globe) globe.selectCountry(null);
    document.getElementById('countryChip').hidden = true;
    refresh();
  }

  function mountGlobe() {
    var host = document.getElementById('programEarth');
    if (!host || !window.MeridianEarth) return;
    globe = window.MeridianEarth(host, {
      mode: 'explorer',
      onSelect: function (pin) { select(pin.id, true); },
      onCountry: function (iso, name, props) { setCountry(iso, name, props); },
      onDeselect: function () { if (selectedId) deselect(); }
    });
    if (!globe) return;
    host.addEventListener('pointerdown', function () {
      document.getElementById('globeStage').classList.add('is-touched');
    }, { once: true });
    document.getElementById('zoomIn').addEventListener('click', function () { globe.zoomBy(0.75); });
    document.getElementById('zoomOut').addEventListener('click', function () { globe.zoomBy(1.3); });
    document.getElementById('countryClear').addEventListener('click', clearCountry);
  }

  function switchSection(next) {
    if (next === section) return;
    section = next;
    filters.type = 'all';
    filters.host = 'all';
    selectedId = null;
    if (globe) globe.select(null);
    var url = new URL(window.location.href);
    url.searchParams.set('s', next === 'scholarship' ? 'scholarships' : 'projects');
    url.searchParams.delete('p');
    window.history.replaceState({}, '', url);
    paintSections(); paintChips(); paintHosts(); paintStrip();
    refresh();
  }

  function paintAll() {
    paintSections();
    paintChips();
    paintSelect('regionSelect', REGIONS, 'region');
    paintSelect('costSelect', COSTS, 'cost');
    var fieldTable = { all: M.FIELDS.any };
    Object.keys(M.FIELDS).forEach(function (key) { if (key !== 'any') fieldTable[key] = M.FIELDS[key]; });
    paintSelect('fieldSelect', fieldTable, 'field');
    paintHosts();
    paintScope();
    paintStrip();
  }

  function init() {
    var params = new URLSearchParams(window.location.search);
    section = /^scholar/.test(params.get('s') || '') || /scholarships/.test(window.location.pathname) ? 'scholarship' : 'project';
    var type = params.get('type');
    if (type) filters.type = type;
    ['host', 'region', 'cost', 'field'].forEach(function (key) { if (params.get(key)) filters[key] = params.get(key); });
    mountGlobe();

    filters.q = params.get('q') || '';
    var searchInput = document.getElementById('programSearch');
    if (searchInput) {
      searchInput.value = filters.q;
      var timer = null;
      var logTimer = null;
      searchInput.addEventListener('input', function () {
        window.clearTimeout(timer);
        window.clearTimeout(logTimer);
        timer = window.setTimeout(function () {
          filters.q = searchInput.value.trim();
          if (selectedId) deselect(); else refresh();
        }, 180);
        logTimer = window.setTimeout(function () {
          if (searchInput.value.trim().length > 1) M.track('search', null, { q: searchInput.value.trim().slice(0, 60), section: section });
        }, 1200);
      });
    }

    document.querySelectorAll('[data-section]').forEach(function (tab) {
      tab.addEventListener('click', function (event) {
        var key = tab.getAttribute('data-section');
        if (key === 'university') return;            // a real link to /universities
        event.preventDefault();
        switchSection(key);
      });
    });

    document.getElementById('panelBack').addEventListener('click', deselect);
    ['hlPrev', 'hlNext'].forEach(function (id, i) {
      document.getElementById(id).addEventListener('click', function () {
        var track = document.getElementById('highlightTrack');
        var dir = document.documentElement.getAttribute('dir') === 'rtl' ? -1 : 1;
        track.scrollBy({ left: dir * (i ? 1 : -1) * track.clientWidth * 0.8, behavior: 'smooth' });
      });
    });
    document.getElementById('resetFilters').addEventListener('click', function () {
      filters = { type: 'all', region: 'all', cost: 'all', host: 'all', q: '', country: null, field: 'all' };
      if (globe) globe.selectCountry(null);
      document.getElementById('countryChip').hidden = true;
      if (searchInput) searchInput.value = '';
      paintAll();
      deselect();
    });

    window.addEventListener('meridian:user', function () {
      if (homeCountry() && hlScope === 'global' && !hlTouched) hlScope = 'local';
      paintScope(); paintStrip();
    });

    M.api('/api/programs').then(function (data) {
      all = data.programs || [];
      if (homeCountry()) hlScope = 'local';
      paintAll();
      var c = params.get('c');
      var inC = c && all.filter(function (p) { return p.iso === c; })[0];
      if (inC) setCountry(c, M.pick(inC.country)); else refresh();
      var wanted = params.get('p');
      if (wanted) select(wanted, true);
    });

    window.addEventListener('meridian:lang', function () {
      all.forEach(function (p) { delete p._hay; });
      paintAll();
      if (selectedId) select(selectedId, false); else paintList();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
