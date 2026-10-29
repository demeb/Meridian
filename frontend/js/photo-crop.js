/* ============================================================
   Meridian — profile photo editor (LinkedIn-style)
   MeridianCrop.open(file) -> Promise<File | null>
   Drag to reposition, slider / scroll / pinch to zoom, rotate 90°.
   Produces an 800×800 JPEG; the server stores it as a 640px square.
   ============================================================ */
(function () {
  'use strict';

  var OUT = 800;

  function open(file) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { build(img, file, resolve, url); };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  }

  function build(img, file, resolve, url) {
    var t = window.M ? M.t : function (k) { return k; };
    var scrim = document.createElement('div');
    scrim.className = 'modal-scrim crop-scrim';
    scrim.innerHTML =
      '<div class="modal crop-modal" role="dialog" aria-modal="true" aria-labelledby="cropTitle">' +
        '<h2 id="cropTitle" class="crop-title">' + t('crop.title') + '</h2>' +
        '<p class="crop-help">' + t('crop.help') + '</p>' +
        '<div class="crop-stage" id="cropStage"><canvas id="cropCanvas"></canvas><span class="crop-ring"></span></div>' +
        '<div class="crop-tools">' +
          '<span class="crop-zoom-ico" aria-hidden="true">−</span>' +
          '<input type="range" id="cropZoom" min="1" max="4" step="0.01" value="1" aria-label="' + t('crop.zoom') + '" />' +
          '<span class="crop-zoom-ico" aria-hidden="true">+</span>' +
          '<button type="button" class="btn btn-ghost btn-sm" id="cropRotate">' + t('crop.rotate') + '</button>' +
        '</div>' +
        '<div class="cluster" style="justify-content:flex-end;margin-top:1.2rem">' +
          '<button type="button" class="btn btn-ghost" id="cropCancel">' + t('crop.cancel') + '</button>' +
          '<button type="button" class="btn btn-primary" id="cropSave">' + t('crop.save') + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(scrim);
    requestAnimationFrame(function () { scrim.classList.add('is-open'); });

    var stage = scrim.querySelector('#cropStage');
    var canvas = scrim.querySelector('#cropCanvas');
    var ctx = canvas.getContext('2d');
    var zoomInput = scrim.querySelector('#cropZoom');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var view = 0;
    var state = { zoom: 1, rot: 0, x: 0, y: 0 };

    function dims() {
      var w = state.rot % 180 ? img.height : img.width;
      var h = state.rot % 180 ? img.width : img.height;
      return { w: w, h: h };
    }
    function baseScale(size) {
      var d = dims();
      return size / Math.min(d.w, d.h);     // the shorter side fills the circle at zoom 1
    }
    function clamp() {
      var d = dims();
      var s = baseScale(view) * state.zoom;
      var maxX = Math.max(0, (d.w * s - view) / 2);
      var maxY = Math.max(0, (d.h * s - view) / 2);
      state.x = Math.max(-maxX, Math.min(maxX, state.x));
      state.y = Math.max(-maxY, Math.min(maxY, state.y));
    }
    function draw(target, size, scaleFactor) {
      var c = target.getContext('2d');
      var s = baseScale(size) * state.zoom;
      c.save();
      c.clearRect(0, 0, target.width, target.height);
      c.fillStyle = '#0b1c3f';
      c.fillRect(0, 0, target.width, target.height);
      c.translate(target.width / 2 + state.x * scaleFactor, target.height / 2 + state.y * scaleFactor);
      c.rotate(state.rot * Math.PI / 180);
      c.scale(s * (target.width / size), s * (target.width / size));
      c.drawImage(img, -img.width / 2, -img.height / 2);
      c.restore();
    }
    function paint() {
      clamp();
      draw(canvas, view, dpr);
    }
    function resize() {
      view = stage.clientWidth;
      canvas.width = Math.round(view * dpr);
      canvas.height = Math.round(view * dpr);
      canvas.style.width = view + 'px';
      canvas.style.height = view + 'px';
      paint();
    }

    // drag + pinch
    var pointers = {};
    var last = null;
    var pinch = null;
    stage.addEventListener('pointerdown', function (e) {
      stage.setPointerCapture(e.pointerId);
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      last = { x: e.clientX, y: e.clientY };
      stage.classList.add('is-dragging');
    });
    stage.addEventListener('pointermove', function (e) {
      if (!pointers[e.pointerId]) return;
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pointers);
      if (ids.length === 2) {
        var a = pointers[ids[0]], b = pointers[ids[1]];
        var dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) setZoom(state.zoom * dist / pinch);
        pinch = dist;
        return;
      }
      if (last) {
        state.x += e.clientX - last.x;
        state.y += e.clientY - last.y;
        last = { x: e.clientX, y: e.clientY };
        paint();
      }
    });
    function up(e) {
      delete pointers[e.pointerId];
      pinch = null;
      last = null;
      stage.classList.remove('is-dragging');
    }
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    stage.addEventListener('wheel', function (e) {
      e.preventDefault();
      setZoom(state.zoom * (e.deltaY > 0 ? 0.94 : 1.06));
    }, { passive: false });

    function setZoom(z) {
      state.zoom = Math.max(1, Math.min(4, z));
      zoomInput.value = state.zoom;
      paint();
    }
    zoomInput.addEventListener('input', function () { setZoom(Number(zoomInput.value)); });
    scrim.querySelector('#cropRotate').addEventListener('click', function () {
      state.rot = (state.rot + 90) % 360;
      var x = state.x; state.x = -state.y; state.y = x;
      paint();
    });

    function close(result) {
      scrim.classList.remove('is-open');
      window.removeEventListener('resize', resize);
      document.removeEventListener('keydown', onKey);
      setTimeout(function () { scrim.remove(); URL.revokeObjectURL(url); }, 260);
      resolve(result);
    }
    function onKey(e) { if (e.key === 'Escape') close(null); }
    document.addEventListener('keydown', onKey);
    scrim.querySelector('#cropCancel').addEventListener('click', function () { close(null); });
    scrim.addEventListener('click', function (e) { if (e.target === scrim) close(null); });
    scrim.querySelector('#cropSave').addEventListener('click', function () {
      var out = document.createElement('canvas');
      out.width = OUT; out.height = OUT;
      draw(out, view, OUT / view);
      out.toBlob(function (blob) {
        if (!blob) { close(null); return; }
        var name = (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg';
        close(new File([blob], name, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.9);
    });

    window.addEventListener('resize', resize);
    requestAnimationFrame(resize);
  }

  window.MeridianCrop = { open: open };
})();
