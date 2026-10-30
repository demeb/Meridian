/* ============================================================
   Meridian — tutor profile form (shared by the application page
   and the tutor dashboard). Builds the fields, chip pickers, photo
   picker and the live "students will see" price.
   ============================================================ */
(function () {
  'use strict';

  var TAX = window.MERIDIAN_TAXONOMY;
  var countries = null;

  function loadCountries() {
    if (countries) return Promise.resolve(countries);
    return fetch('/assets/countries.geojson').then(function (r) { return r.json(); }).then(function (d) {
      countries = d.features.map(function (f) { return f.properties; })
        .filter(function (p) { return p.iso; });
      return countries;
    });
  }

  function chips(name, table, selected, limit) {
    return '<div class="chip-picker" data-picker="' + name + '" data-limit="' + (limit || 99) + '">' +
      Object.keys(table).map(function (key) {
        var on = selected.indexOf(key) !== -1;
        return '<button type="button" class="chip" data-value="' + key + '" aria-pressed="' + on + '">' +
          M.esc(M.pick(table[key])) + '</button>';
      }).join('') + '</div>';
  }

  function counter(id, max) {
    return '<span class="char-count" data-for="' + id + '" data-max="' + max + '">0 / ' + max + '</span>';
  }

  function render(host, profile, opts) {
    opts = opts || {};
    profile = profile || {};
    var pick = function (v) { return typeof v === 'object' && v ? (v.en || '') : (v || ''); };
    var education = (profile.education || []).map(function (e) {
      return [e.school, pick(e.degree), e.years].join(' | ');
    }).join('\n');

    host.innerHTML =
      (opts.photo !== false ? (
      '<section class="form-block">' +
        '<h3><span class="step-no">1</span>' + M.t('apply.photo.title') + '</h3>' +
        '<p class="form-help">' + M.t('apply.photo.help') + '</p>' +
        '<label class="photo-drop" id="photoDrop">' +
          '<input type="file" id="photoInput" name="photo" accept="image/jpeg,image/png,image/webp" hidden />' +
          '<span class="photo-preview" id="photoPreview">' +
            (profile.photo ? '<img src="' + M.esc(profile.photo) + '" alt="" />' : M.icon('camera', 30)) +
          '</span>' +
          '<span class="photo-copy"><b>' + M.t('apply.photo.cta') + '</b><span>' + M.t('apply.photo.formats') + '</span></span>' +
        '</label>' +
        '<span class="field-error" id="photoError">—</span>' +
      '</section>') : '') +

      '<section class="form-block">' +
        '<h3><span class="step-no">' + (opts.photo !== false ? 2 : 1) + '</span>' + M.t('apply.about.title') + '</h3>' +
        '<div class="field"><label for="f-headline">' + M.t('apply.headline') + counter('f-headline', 90) + '</label>' +
          '<input class="input" id="f-headline" name="headline" maxlength="90" value="' + M.esc(pick(profile.headline)) + '" placeholder="' + M.t('apply.headlinePh') + '" />' +
          '<span class="field-error">—</span></div>' +
        '<div class="field"><label for="f-intro">' + M.t('apply.intro') + counter('f-intro', 280) + '</label>' +
          '<textarea class="textarea" id="f-intro" name="intro" maxlength="280" rows="3" style="min-height:96px" placeholder="' + M.t('apply.introPh') + '">' + M.esc(pick(profile.intro)) + '</textarea>' +
          '<span class="field-hint">' + M.t('apply.introHint') + '</span><span class="field-error">—</span></div>' +
        '<div class="field"><label for="f-bio">' + M.t('apply.bio') + '</label>' +
          '<textarea class="textarea" id="f-bio" name="bio" maxlength="2400" rows="6" placeholder="' + M.t('apply.bioPh') + '">' + M.esc(pick(profile.bio)) + '</textarea></div>' +
      '</section>' +

      '<section class="form-block">' +
        '<h3><span class="step-no">' + (opts.photo !== false ? 3 : 2) + '</span>' + M.t('apply.expertise.title') + '</h3>' +
        '<p class="label">' + M.t('apply.subjects') + '</p>' + chips('subjects', TAX.subjects, profile.subjects || [], 10) +
        '<span class="field-error" id="subjectsError">—</span>' +
        '<p class="label" style="margin-top:1.2rem">' + M.t('apply.regions') + '</p>' + chips('regions', TAX.regions, profile.regions || [], 4) +
        '<p class="label" style="margin-top:1.2rem">' + M.t('apply.languages') + '</p>' + chips('languages', TAX.languages, profile.languages || [], 8) +
        '<div class="auth-row" style="margin-top:1.2rem">' +
          '<div class="field"><label for="f-experience">' + M.t('apply.experience') + '</label>' +
            '<input class="input" id="f-experience" name="experience" type="number" min="0" max="60" inputmode="numeric" value="' + (profile.experience || '') + '" /></div>' +
          '<div class="field"><label for="f-country">' + M.t('apply.country') + '</label>' +
            '<select class="select" id="f-country" name="country"><option value="">—</option></select></div>' +
        '</div>' +
        '<div class="field" style="margin-top:1rem"><label for="f-city">' + M.t('apply.city') + '</label>' +
          '<input class="input" id="f-city" name="city" value="' + M.esc(pick(profile.city)) + '" /></div>' +
      '</section>' +

      '<section class="form-block">' +
        '<h3><span class="step-no">' + (opts.photo !== false ? 4 : 3) + '</span>' + M.t('apply.education.title') + '</h3>' +
        '<p class="form-help">' + M.t('apply.education.help') + '</p>' +
        '<textarea class="textarea mono-ish" id="f-education" name="education" rows="3" placeholder="Carnegie Mellon University | BSc Information Systems | 2022–2026">' + M.esc(education) + '</textarea>' +
      '</section>' +

      '<section class="form-block">' +
        '<h3><span class="step-no">' + (opts.photo !== false ? 5 : 4) + '</span>' + M.t('apply.price.title') + '</h3>' +
        '<div class="price-builder">' +
          '<div class="field"><label for="f-price">' + M.t('apply.price.yours') + '</label>' +
            '<div class="input-suffix"><input class="input" id="f-price" name="price" type="number" min="5" max="2000" step="1" inputmode="decimal" value="' + (profile.price || '') + '" /><span class="gel">USD</span></div>' +
            '<span class="field-error">—</span></div>' +
          '<div class="price-mirror" id="priceMirror"></div>' +
        '</div>' +
      '</section>';

    // live counters
    host.querySelectorAll('.char-count').forEach(function (count) {
      var input = host.querySelector('#' + count.getAttribute('data-for'));
      var update = function () { count.textContent = input.value.length + ' / ' + count.getAttribute('data-max'); };
      input.addEventListener('input', update);
      update();
    });

    // chip pickers
    host.querySelectorAll('[data-picker]').forEach(function (picker) {
      var limit = Number(picker.getAttribute('data-limit'));
      picker.addEventListener('click', function (event) {
        var chip = event.target.closest('.chip');
        if (!chip) return;
        var on = chip.getAttribute('aria-pressed') === 'true';
        if (!on && picker.querySelectorAll('[aria-pressed="true"]').length >= limit) {
          M.toast(M.t('apply.limit').replace('{n}', limit), 'info', 2000);
          return;
        }
        chip.setAttribute('aria-pressed', String(!on));
      });
    });

    // price mirror: what the student sees, what the tutor keeps
    var price = host.querySelector('#f-price');
    var mirror = host.querySelector('#priceMirror');
    var fee = opts.feeRate || 0.1;
    var paintMirror = function () {
      var base = Math.max(0, Number(price.value) || 0);
      var total = Math.round(base * (1 + fee) * 100) / 100;
      mirror.innerHTML =
        '<div><span>' + M.t('apply.price.students') + '</span><b>' + M.money(total) + '</b></div>' +
        '<div><span>' + M.t('apply.price.youKeep') + '</span><b>' + M.money(base) + '</b></div>' +
        '<p class="field-hint">' + M.t('apply.price.how').replace('{rate}', Math.round(fee * 100)) + '</p>';
    };
    price.addEventListener('input', paintMirror);
    paintMirror();

    // countries
    loadCountries().then(function (list) {
      var select = host.querySelector('#f-country');
      var lang = M.state.lang;
      var sorted = list.slice().sort(function (a, b) {
        if (a.iso === 'GE') return -1;
        if (b.iso === 'GE') return 1;
        return (a.name[lang] || a.name.en).localeCompare(b.name[lang] || b.name.en);
      });
      select.innerHTML = '<option value="">—</option>' + sorted.map(function (c) {
        return '<option value="' + c.iso + '" data-name="' + M.esc(c.name.en) + '"' +
          (c.iso === (profile.iso || '') ? ' selected' : '') + '>' + M.esc(c.name[lang] || c.name.en) + '</option>';
      }).join('');
    });

    // photo picker with instant preview
    var input = host.querySelector('#photoInput');
    if (input) {
      var drop = host.querySelector('#photoDrop');
      var previewPhoto = function (file) {
        if (!file) return;
        if (!/^image\//.test(file.type)) { showPhotoError('apply.photo.type'); return; }
        if (file.size > 6 * 1024 * 1024) { showPhotoError('apply.photo.size'); return; }
        host.querySelector('#photoError').style.display = 'none';
        // straight into the editor: position, zoom, rotate — then keep the cropped version
        var edit = window.MeridianCrop ? window.MeridianCrop.open(file) : Promise.resolve(file);
        edit.then(function (cropped) {
          if (!cropped) { input.value = ''; return; }
          var dt = new DataTransfer();
          dt.items.add(cropped);
          input.files = dt.files;
          var url = URL.createObjectURL(cropped);
          host.querySelector('#photoPreview').innerHTML = '<img src="' + url + '" alt="" />';
          drop.classList.add('has-photo');
          if (opts.onPhoto) opts.onPhoto(cropped);
        });
      };
      var showPhotoError = function (key) {
        var e = host.querySelector('#photoError');
        e.textContent = M.t(key);
        e.style.display = 'block';
      };
      input.addEventListener('change', function () { previewPhoto(input.files[0]); });
      ['dragenter', 'dragover'].forEach(function (type) {
        drop.addEventListener(type, function (e) { e.preventDefault(); drop.classList.add('is-over'); });
      });
      ['dragleave', 'drop'].forEach(function (type) {
        drop.addEventListener(type, function (e) { e.preventDefault(); drop.classList.remove('is-over'); });
      });
      drop.addEventListener('drop', function (e) {
        var file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) previewPhoto(file);
      });
    }
  }

  function collect(host) {
    var val = function (id) { var el = host.querySelector('#' + id); return el ? el.value.trim() : ''; };
    var picked = function (name) {
      return Array.prototype.map.call(host.querySelectorAll('[data-picker="' + name + '"] [aria-pressed="true"]'),
        function (chip) { return chip.getAttribute('data-value'); });
    };
    var country = host.querySelector('#f-country');
    var option = country && country.options[country.selectedIndex];
    return {
      headline: val('f-headline'),
      intro: val('f-intro'),
      bio: val('f-bio'),
      subjects: picked('subjects'),
      regions: picked('regions'),
      languages: picked('languages'),
      experience: val('f-experience'),
      country: country ? country.value : '',
      country_name: option ? (option.getAttribute('data-name') || '') : '',
      city: val('f-city'),
      education: val('f-education'),
      price: val('f-price')
    };
  }

  function validate(host, data, needPhoto) {
    var ok = true;
    var mark = function (id, bad, key) {
      var el = host.querySelector('#' + id);
      if (!el) return;
      var field = el.closest('.field');
      if (field) {
        field.classList.toggle('has-error', bad);
        if (bad) field.querySelector('.field-error').textContent = M.t(key);
      }
      if (bad) ok = false;
    };
    mark('f-headline', data.headline.length < 6, 'apply.err.headline');
    mark('f-intro', data.intro.length < 30, 'apply.err.intro');
    mark('f-price', !(Number(data.price) >= 5), 'apply.err.price');
    var subjErr = host.querySelector('#subjectsError');
    if (!data.subjects.length) { subjErr.textContent = M.t('apply.err.subjects'); subjErr.style.display = 'block'; ok = false; }
    else subjErr.style.display = 'none';
    if (needPhoto) {
      var input = host.querySelector('#photoInput');
      if (!input || !input.files || !input.files[0]) {
        var e = host.querySelector('#photoError');
        e.textContent = M.t('apply.err.photo'); e.style.display = 'block'; ok = false;
      }
    }
    if (!ok) {
      var first = host.querySelector('.has-error, .field-error[style*="block"]');
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return ok;
  }

  window.MeridianTutorForm = { render: render, collect: collect, validate: validate };
})();
