/* ============================================================
   Meridian — interactive globe
   Canvas 2D, orthographic projection, dot-matrix landmass.
   Land data: frontend/assets/globe-dots.json (built by tools/build_globe.py)
   ============================================================ */
(function () {
  'use strict';

  var DEG = Math.PI / 180;
  var landPromise = null;

  function loadLand() {
    if (!landPromise) {
      landPromise = fetch('/assets/globe-dots.json')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var raw = data.points || [];
          var points = new Array(raw.length / 2);
          for (var i = 0, j = 0; i < raw.length; i += 2, j++) {
            var lon = raw[i] * DEG;
            var lat = raw[i + 1] * DEG;
            var cosLat = Math.cos(lat);
            // pre-compute the unit-sphere vector once; rotation is cheap after this
            points[j] = { x: cosLat * Math.sin(lon), y: Math.sin(lat), z: cosLat * Math.cos(lon) };
          }
          return points;
        })
        .catch(function () { return []; });
    }
    return landPromise;
  }

  function cssVar(node, name, fallback) {
    var value = getComputedStyle(node).getPropertyValue(name).trim();
    return value || fallback;
  }

  function createGlobe(canvas, options) {
    options = options || {};
    var ctx = canvas.getContext('2d');
    var stage = canvas.parentElement;

    var state = {
      lambda: options.lambda !== undefined ? options.lambda : -40,   // rotation around the poles
      phi: options.phi !== undefined ? options.phi : -18,            // tilt
      zoom: options.zoom || 1,
      spin: options.spin !== undefined ? options.spin : 0.055,       // degrees per frame
      autoSpin: options.autoSpin !== false,
      interactive: options.interactive !== false,
      dotSize: options.dotSize || 1.7,
      pins: [],
      land: [],
      hover: null,
      selected: null,
      width: 0, height: 0, radius: 0, cx: 0, cy: 0,
      dragging: false,
      velocity: { x: 0, y: 0 },
      fly: null,
      raf: null,
      alive: true
    };

    var colors = {};
    function readColors() {
      colors = {
        land: cssVar(canvas, '--globe-land', '#4d86ff'),
        grat: cssVar(canvas, '--globe-grat', 'rgba(126,168,255,.13)'),
        ocean: cssVar(canvas, '--globe-ocean', 'rgba(12,32,74,.55)'),
        halo: cssVar(canvas, '--globe-halo', 'rgba(47,107,255,.5)'),
        brand: cssVar(canvas, '--globe-pin', '#2f6bff'),
        accent: cssVar(canvas, '--globe-pin-urgent', '#ffd76e'),
        muted: cssVar(canvas, '--globe-pin-locked', '#7489b5'),
        ink: cssVar(canvas, '--globe-pin-ink', '#ffffff')
      };
    }
    readColors();

    function resize() {
      var rect = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      state.width = rect.width;
      state.height = rect.height;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      state.cx = rect.width / 2 + (options.offsetX || 0) * rect.width;
      state.cy = rect.height / 2 + (options.offsetY || 0);
      state.radius = Math.min(rect.width, rect.height) * 0.42 * state.zoom;
    }

    /* ---- projection ---------------------------------------------- */
    function project(lon, lat) {
      var lam = (lon + state.lambda) * DEG;
      var ph = lat * DEG;
      var p0 = state.phi * DEG;
      var cosLat = Math.cos(ph);
      var sinLat = Math.sin(ph);
      var cosLam = Math.cos(lam);
      var cosC = Math.sin(p0) * sinLat + Math.cos(p0) * cosLat * cosLam;
      if (cosC <= 0.01) return null;
      var x = cosLat * Math.sin(lam);
      var y = Math.cos(p0) * sinLat - Math.sin(p0) * cosLat * cosLam;
      return {
        x: state.cx + x * state.radius,
        y: state.cy - y * state.radius,
        depth: cosC
      };
    }

    function projectVector(v) {
      // rotate the cached unit vector, then flatten
      var lam = state.lambda * DEG;
      var p0 = state.phi * DEG;
      var cosL = Math.cos(lam), sinL = Math.sin(lam);
      var x1 = v.x * cosL + v.z * sinL;
      var z1 = -v.x * sinL + v.z * cosL;
      var cosP = Math.cos(p0), sinP = Math.sin(p0);
      var y2 = v.y * cosP - z1 * sinP;
      var z2 = v.y * sinP + z1 * cosP;
      if (z2 <= 0.012) return null;
      return { x: state.cx + x1 * state.radius, y: state.cy - y2 * state.radius, depth: z2 };
    }

    /* ---- drawing -------------------------------------------------- */
    function drawSphere() {
      var grad = ctx.createRadialGradient(
        state.cx - state.radius * 0.35, state.cy - state.radius * 0.4, state.radius * 0.1,
        state.cx, state.cy, state.radius
      );
      grad.addColorStop(0, colors.ocean);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(state.cx, state.cy, state.radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // atmosphere
      ctx.save();
      ctx.beginPath();
      ctx.arc(state.cx, state.cy, state.radius * 1.045, 0, Math.PI * 2);
      var halo = ctx.createRadialGradient(
        state.cx, state.cy, state.radius * 0.94,
        state.cx, state.cy, state.radius * 1.14
      );
      halo.addColorStop(0, colors.halo);
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.globalAlpha = 0.55;
      ctx.fill();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(state.cx, state.cy, state.radius, 0, Math.PI * 2);
      ctx.strokeStyle = colors.grat;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    function drawGraticule() {
      ctx.strokeStyle = colors.grat;
      ctx.lineWidth = 1;
      var lat, lon, point, started;

      for (lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        started = false;
        for (lon = -180; lon <= 180; lon += 4) {
          point = project(lon, lat);
          if (!point) { started = false; continue; }
          if (!started) { ctx.moveTo(point.x, point.y); started = true; }
          else ctx.lineTo(point.x, point.y);
        }
        ctx.stroke();
      }
      for (lon = -180; lon < 180; lon += 30) {
        ctx.beginPath();
        started = false;
        for (lat = -88; lat <= 88; lat += 4) {
          point = project(lon, lat);
          if (!point) { started = false; continue; }
          if (!started) { ctx.moveTo(point.x, point.y); started = true; }
          else ctx.lineTo(point.x, point.y);
        }
        ctx.stroke();
      }
    }

    function drawLand() {
      if (!state.land.length) return;
      var size = state.dotSize * Math.max(state.zoom, 0.9);
      var tiers = [[], [], [], []];
      for (var i = 0; i < state.land.length; i++) {
        var point = projectVector(state.land[i]);
        if (!point) continue;
        var tier = point.depth > 0.78 ? 0 : point.depth > 0.5 ? 1 : point.depth > 0.25 ? 2 : 3;
        tiers[tier].push(point.x, point.y);
      }
      var alphas = [0.82, 0.6, 0.37, 0.18];
      ctx.fillStyle = colors.land;
      for (var tierIndex = 0; tierIndex < 4; tierIndex++) {
        var list = tiers[tierIndex];
        if (!list.length) continue;
        ctx.globalAlpha = alphas[tierIndex];
        for (var j = 0; j < list.length; j += 2) {
          ctx.fillRect(list[j] - size / 2, list[j + 1] - size / 2, size, size);
        }
      }
      ctx.globalAlpha = 1;
    }

    function pinColor(pin) {
      if (pin.locked) return colors.muted;
      if (pin.urgent) return colors.accent;
      return colors.brand;
    }

    function drawPins(time) {
      var queue = [];
      for (var i = 0; i < state.pins.length; i++) {
        var pin = state.pins[i];
        var point = project(pin.lon, pin.lat);
        if (!point) continue;
        queue.push({ pin: pin, point: point, index: i });
      }
      // far pins first so the near ones sit on top
      queue.sort(function (a, b) { return a.point.depth - b.point.depth; });

      state.screenPins = [];
      for (var q = 0; q < queue.length; q++) {
        var item = queue[q];
        var p = item.point;
        var thisPin = item.pin;
        var selected = state.selected === thisPin.id;
        var hovered = state.hover === thisPin.id;
        var scale = 0.62 + p.depth * 0.38;
        var r = (selected ? 8.4 : hovered ? 7.4 : 6.2) * scale;
        var color = pinColor(thisPin);
        var fade = 0.3 + p.depth * 0.7;

        // expanding ring on urgent and selected pins
        if (selected || thisPin.urgent) {
          var phase = ((time || 0) / (selected ? 1100 : 2200) + item.index * 0.23) % 1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r + phase * 22, 0, Math.PI * 2);
          ctx.strokeStyle = color;
          ctx.globalAlpha = (1 - phase) * 0.55 * fade;
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }

        // soft glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 2.5, 0, Math.PI * 2);
        ctx.globalAlpha = 0.22 * fade;
        ctx.fillStyle = color;
        ctx.fill();

        // solid head with a contrasting outline so it never blends into the land
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.globalAlpha = fade;
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = selected || hovered ? 2.4 : 1.6;
        ctx.strokeStyle = colors.ink;
        ctx.globalAlpha = fade * (selected || hovered ? 1 : 0.85);
        ctx.stroke();

        // bright centre
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 0.34, 0, Math.PI * 2);
        ctx.globalAlpha = fade;
        ctx.fillStyle = colors.ink;
        ctx.fill();

        ctx.globalAlpha = 1;
        state.screenPins.push({ id: thisPin.id, x: p.x, y: p.y, r: Math.max(r + 8, 13), pin: thisPin });
      }
    }

    function frame(time) {
      if (!state.alive) return;
      ctx.clearRect(0, 0, state.width, state.height);

      if (state.fly) {
        var fly = state.fly;
        fly.t = Math.min(1, fly.t + 0.022);
        var eased = 1 - Math.pow(1 - fly.t, 3);
        state.lambda = fly.fromL + (fly.toL - fly.fromL) * eased;
        state.phi = fly.fromP + (fly.toP - fly.fromP) * eased;
        if (fly.t >= 1) state.fly = null;
      } else if (state.dragging) {
        // user is in control
      } else {
        if (Math.abs(state.velocity.x) > 0.002 || Math.abs(state.velocity.y) > 0.002) {
          state.lambda += state.velocity.x;
          state.phi = Math.max(-78, Math.min(78, state.phi + state.velocity.y));
          state.velocity.x *= 0.94;
          state.velocity.y *= 0.94;
        } else if (state.autoSpin) {
          state.lambda += state.spin;
        }
      }
      if (state.lambda > 360) state.lambda -= 360;
      if (state.lambda < -360) state.lambda += 360;

      drawSphere();
      drawGraticule();
      drawLand();
      drawPins(time || 0);

      state.raf = requestAnimationFrame(frame);
    }

    /* ---- interaction ---------------------------------------------- */
    var pointer = { active: false, x: 0, y: 0, moved: 0 };

    function onDown(event) {
      if (!state.interactive) return;
      pointer.active = true;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.moved = 0;
      state.dragging = true;
      state.velocity.x = 0;
      state.velocity.y = 0;
      stage.classList.add('is-dragging', 'is-touched');
      canvas.setPointerCapture && canvas.setPointerCapture(event.pointerId);
    }

    function onMove(event) {
      if (!state.interactive) return;
      var rect = canvas.getBoundingClientRect();
      var localX = event.clientX - rect.left;
      var localY = event.clientY - rect.top;

      if (pointer.active) {
        var dx = event.clientX - pointer.x;
        var dy = event.clientY - pointer.y;
        pointer.moved += Math.abs(dx) + Math.abs(dy);
        var speed = 0.32 / Math.max(state.zoom, 0.6);
        state.lambda += dx * speed;
        state.phi = Math.max(-78, Math.min(78, state.phi - dy * speed));
        state.velocity.x = dx * speed * 0.55;
        state.velocity.y = -dy * speed * 0.55;
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        return;
      }

      var hit = hitTest(localX, localY);
      var nextHover = hit ? hit.id : null;
      if (nextHover !== state.hover) {
        state.hover = nextHover;
        canvas.style.cursor = hit ? 'pointer' : '';
        if (options.onHover) options.onHover(hit ? hit.pin : null, hit ? { x: localX, y: localY } : null);
      }
    }

    function onUp(event) {
      if (!pointer.active) return;
      pointer.active = false;
      state.dragging = false;
      stage.classList.remove('is-dragging');
      if (pointer.moved < 6) {
        var rect = canvas.getBoundingClientRect();
        var hit = hitTest(event.clientX - rect.left, event.clientY - rect.top);
        if (hit && options.onSelect) options.onSelect(hit.pin);
        else if (!hit && options.onDeselect) options.onDeselect();
      }
    }

    function hitTest(x, y) {
      var list = state.screenPins || [];
      var best = null;
      var bestDist = Infinity;
      for (var i = 0; i < list.length; i++) {
        var item = list[i];
        var dist = Math.hypot(item.x - x, item.y - y);
        if (dist < item.r && dist < bestDist) { best = item; bestDist = dist; }
      }
      return best;
    }

    function onWheel(event) {
      if (!state.interactive) return;
      event.preventDefault();
      setZoom(state.zoom * (event.deltaY > 0 ? 0.92 : 1.08));
    }

    function setZoom(next) {
      state.zoom = Math.max(0.75, Math.min(2.4, next));
      resize();
    }

    function flyTo(lon, lat, zoom) {
      var targetL = -lon;
      // take the shortest way round
      var current = state.lambda % 360;
      if (current > 180) current -= 360;
      if (current < -180) current += 360;
      state.lambda = current;
      var delta = targetL - current;
      while (delta > 180) delta -= 360;
      while (delta < -180) delta += 360;
      state.fly = {
        t: 0,
        fromL: current, toL: current + delta,
        fromP: state.phi, toP: Math.max(-60, Math.min(60, lat))
      };
      if (zoom) setZoom(zoom);
    }

    if (state.interactive) {
      canvas.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      canvas.addEventListener('pointerleave', function () {
        if (state.hover !== null) {
          state.hover = null;
          if (options.onHover) options.onHover(null, null);
        }
      });
      canvas.addEventListener('wheel', onWheel, { passive: false });
    }

    var resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    window.addEventListener('meridian:theme', readColors);

    resize();
    loadLand().then(function (points) {
      state.land = points;
    });
    state.raf = requestAnimationFrame(frame);

    return {
      setPins: function (pins) { state.pins = pins || []; },
      select: function (id) { state.selected = id; },
      flyTo: flyTo,
      zoomBy: function (factor) { setZoom(state.zoom * factor); },
      setAutoSpin: function (on) { state.autoSpin = on; },
      state: state,
      destroy: function () {
        state.alive = false;
        cancelAnimationFrame(state.raf);
        resizeObserver.disconnect();
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('meridian:theme', readColors);
      }
    };
  }

  window.MeridianGlobe = createGlobe;
})();
