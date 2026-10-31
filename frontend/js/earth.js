/* ============================================================
   Meridian — the Earth
   Real NASA imagery on a WebGL globe (globe.gl, vendored locally).

   MeridianEarth(el, { mode: 'hero' })      slow horizon behind the home hero,
                                            arcs from Tbilisi to every destination
   MeridianEarth(el, { mode: 'explorer' })  the programme globe: UN-practice country
                                            shapes that rise and glow on hover,
                                            HTML pins that open programme briefs
   ============================================================ */
(function () {
  'use strict';

  var TEX = {
    day: '/assets/earth/earth-blue-marble.jpg',
    night: '/assets/earth/earth-night.jpg',
    bump: '/assets/earth/earth-topology.png'
  };
  // NASA GIBS — public-domain Blue Marble tiles, sharp when you zoom in (needs internet)
  var GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/';
  var GIBS_MAX = 8;
  var HOME = { lat: 25.2854, lng: 51.531 };   // Doha, where Meridian is based

  var countriesPromise = null;
  function loadCountries() {
    if (!countriesPromise) {
      countriesPromise = fetch('/assets/countries.geojson?v=un1')
        .then(function (r) { return r.json(); })
        .then(function (d) { return d.features || []; })
        .catch(function () { return []; });
    }
    return countriesPromise;
  }

  function theme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }
  function reducedMotion() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function webglAvailable() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }
  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = src;
    });
  }

  /* Night that you can still read: a dimmed daytime Earth with the city-lights
     image glowing on top as an emissive map — land and ocean stay distinct. */
  function nightLook(globe, on) {
    var material = globe.globeMaterial();
    // onGlobeReady can fire before the textured Phong material exists
    if (!material || !material.map || !material.color || !material.emissive) {
      if (on) setTimeout(function () { nightLook(globe, theme() === 'dark'); }, 300);
      return;
    }
    if (on) {
      material.color.setRGB(0.52, 0.6, 0.78);
      if (!material.__nightLights) {
        loadImage(TEX.night).then(function (img) {
          var lights = material.map.clone();
          lights.image = img;
          lights.needsUpdate = true;
          material.__nightLights = lights;
          if (theme() === 'dark') {
            material.emissiveMap = lights;
            material.emissive.setRGB(1, 0.86, 0.62);
            material.emissiveIntensity = 0.85;
            material.needsUpdate = true;
          }
        }).catch(function () {});
      } else {
        material.emissiveMap = material.__nightLights;
        material.emissive.setRGB(1, 0.86, 0.62);
        material.emissiveIntensity = 0.85;
      }
    } else {
      material.color.setRGB(1, 1, 1);
      material.emissiveMap = null;
      material.emissive.setRGB(0, 0, 0);
    }
    material.needsUpdate = true;
  }

  function createEarth(el, options) {
    options = options || {};
    var mode = options.mode || 'explorer';
    if (!window.Globe || !webglAvailable()) {
      el.classList.add('earth-fallback');
      return null;
    }

    var globe = window.Globe({ animateIn: mode === 'explorer', waitForGlobeReady: true })(el)
      .backgroundColor('rgba(0,0,0,0)')
      .bumpImageUrl(TEX.bump)
      .showAtmosphere(true)
      .atmosphereAltitude(mode === 'hero' ? 0.18 : 0.2);

    globe.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    var controls = globe.controls();
    controls.autoRotate = !reducedMotion();
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    var baseFov = null;
    // Hero: a hidden probe reads the CSS --lift (room above the earth for the arcs) in px
    var probe = null;
    if (mode === 'hero') {
      probe = document.createElement('div');
      probe.className = 'earth-lift-probe';
      el.appendChild(probe);
    }
    function size() {
      var rect = el.getBoundingClientRect();
      var w = Math.max(1, Math.round(rect.width));
      var h = Math.max(1, Math.round(rect.height));
      globe.width(w).height(h);
      // Hero: the earth is a w×w square whose top sits --lift below the box top, so
      // the arcs can climb into the page. The box only reaches the bottom of the
      // hero, so render just that top slice of a taller virtual frame: the earth
      // keeps its size and place and the GPU never draws the hidden part.
      var lift = mode === 'hero' ? (probe ? probe.offsetHeight : Math.max(0, h - w)) : 0;
      var apply = function () {
        var camera = globe.camera();
        if (baseFov === null) baseFov = camera.fov;
        if (lift > 0) {
          var fullH = w + 2 * lift;
          camera.fov = 2 * Math.atan(Math.tan(baseFov * Math.PI / 360) * fullH / w) * 180 / Math.PI;
          camera.aspect = w / fullH;
          camera.setViewOffset(w, fullH, 0, 0, w, h);
          camera.updateProjectionMatrix();
        } else if (camera.view && camera.view.enabled) {
          camera.fov = baseFov;
          camera.clearViewOffset();
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        }
      };
      apply();
      // globe.gl applies the new size on its next tick and resets the camera
      // aspect; set the view again after that
      window.requestAnimationFrame(function () { window.requestAnimationFrame(apply); });
    }
    new ResizeObserver(size).observe(el);
    size();

    var api = { globe: globe };
    el.__earth = api;             // for debugging in the console

    /* =================================================== hero */
    if (mode === 'hero') {
      controls.enableZoom = false;
      controls.enableRotate = false;
      controls.enablePan = false;
      controls.autoRotateSpeed = 0.14;        // half the earlier speed
      el.style.pointerEvents = 'none';
      globe.pointOfView({ lat: -6, lng: 34, altitude: 1.46 }, 0);
      globe.globeImageUrl(TEX.day);

      var paintHero = function () {
        var dark = theme() === 'dark';
        globe.atmosphereColor(dark ? '#5aa8ff' : '#dff0ff');
        // gold fading into sky blue — the arcs belong to the same palette as the headline
        globe.arcColor(function () {
          return dark
            ? ['rgba(124, 196, 255, 0)', 'rgba(255, 215, 110, 0.9)', 'rgba(124, 196, 255, 0.15)']
            : ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.2)'];
        });
        globe.pointColor(function () { return dark ? '#ffd76e' : '#ffffff'; });
        sharpen();
        // daytime: sharp NASA tiles; night keeps the texture so the city lights can glow
        if (!dark && gibsOk) {
          globe.globeTileEngineMaxLevel(6).globeTileEngineUrl(tileUrl);
        } else if (dark && tilesOn) {
          globe.globeTileEngineUrl(null);
        }
        tilesOn = !dark && gibsOk;
        nightLook(globe, dark);
      };
      var gibsOk = false, tilesOn = false;
      var tileUrl = function (x, y, level) { return GIBS + level + '/' + y + '/' + x + '.jpeg'; };
      var sharpen = function () {
        // full anisotropic filtering keeps the texture crisp at the glancing horizon angle
        var material = globe.globeMaterial();
        var max = globe.renderer().capabilities.getMaxAnisotropy();
        if (material && material.map && material.map.anisotropy !== max) {
          material.map.anisotropy = max;
          material.map.needsUpdate = true;
        }
      };
      fetch(GIBS + '1/0/0.jpeg', { mode: 'cors' }).then(function (r) {
        gibsOk = r.ok;
        if (gibsOk) paintHero();
      }).catch(function () {});

      api.setDestinations = function (places) {
        var seen = {};
        var arcs = [];
        places.forEach(function (p, index) {
          if (p.lat == null || p.lng == null) return;
          var key = Math.round(p.lat) + ':' + Math.round(p.lng);
          if (seen[key]) return;
          seen[key] = 1;
          arcs.push({ startLat: HOME.lat, startLng: HOME.lng, endLat: p.lat, endLng: p.lng, delay: (index % 7) * 520 });
        });
        globe
          .arcsData(arcs)
          .arcStroke(0.38)
          .arcAltitudeAutoScale(0.62)     // arcs climb high enough to reach up behind the headline
          .arcDashLength(0.5)
          .arcDashGap(1.4)
          .arcDashInitialGap(function (d) { return d.delay / 1000; })
          .arcDashAnimateTime(reducedMotion() ? 0 : 5200)
          .pointsData(arcs.map(function (a) { return { lat: a.endLat, lng: a.endLng }; })
            .concat([{ lat: HOME.lat, lng: HOME.lng, home: true }]))
          .pointAltitude(0.002)
          .pointRadius(function (d) { return d.home ? 0.5 : 0.24; });
        paintHero();
      };

      var paused = false;
      var watch = function () {
        var rect = el.getBoundingClientRect();
        var hidden = rect.bottom < 0 || rect.top > window.innerHeight || document.hidden;
        if (hidden && !paused) { globe.pauseAnimation(); paused = true; }
        if (!hidden && paused) { globe.resumeAnimation(); paused = false; }
      };
      window.addEventListener('scroll', watch, { passive: true });
      document.addEventListener('visibilitychange', watch);
      window.addEventListener('meridian:theme', paintHero);
      globe.onGlobeReady(paintHero);
      return api;
    }

    /* =================================================== explorer */
    controls.autoRotateSpeed = 0.18;          // half the earlier speed
    controls.minDistance = 118;
    controls.maxDistance = 520;
    controls.zoomSpeed = 0.8;
    globe.pointOfView({ lat: 34, lng: 22, altitude: 2.1 }, 0);

    // One picture, no extra meshes: the 4K NASA image with every country's
    // border and tint painted into it (a canvas used as the globe texture).
    // Drawing 235 countries as 3D shapes cost ~8,000 draw calls a frame; now
    // only the country under the pointer (and the chosen one) rises as a shape.
    // No map-tile engine either: tiles left the globe black while loading.
    globe.globeImageUrl(TEX.day);
    var paper = document.createElement('canvas');
    paper.width = 4096;
    paper.height = 2048;
    var baseImage = null, features = [], paintTimer = null;
    loadImage(TEX.day).then(function (img) { baseImage = img; paintMap(); }).catch(function () {});

    function trace(ctx, f) {
      var g = f.geometry || {};
      var polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
      ctx.beginPath();
      polys.forEach(function (rings) {
        rings.forEach(function (ring) {
          ring.forEach(function (pt, i) {
            var x = (pt[0] + 180) / 360 * paper.width, y = (90 - pt[1]) / 180 * paper.height;
            if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
          });
          ctx.closePath();
        });
      });
    }
    function paintMap() {
      var material = globe.globeMaterial();
      if (!baseImage || !material || !material.map) return;
      var ctx = paper.getContext('2d');
      ctx.drawImage(baseImage, 0, 0, paper.width, paper.height);
      ctx.lineJoin = 'round';
      features.forEach(function (f) {
        trace(ctx, f);
        if (state.counts[f.properties.iso]) {
          ctx.fillStyle = 'rgba(255, 215, 110, 0.16)';
          ctx.fill('evenodd');
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      });
      if (material.map.image !== paper) {
        material.map.image = paper;
        material.map.anisotropy = globe.renderer().capabilities.getMaxAnisotropy();
      }
      material.map.needsUpdate = true;
    }
    function repaintSoon() {
      window.clearTimeout(paintTimer);
      paintTimer = window.setTimeout(paintMap, 60);
    }
    globe.onGlobeReady(paintMap);

    /* which country is at this lat/lng: bounding box first, then ray casting */
    function inRing(ring, lng, lat) {
      var inside = false;
      for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        var xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
        if ((yi > lat) !== (yj > lat) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    }
    function countryAt(lat, lng) {
      for (var k = 0; k < features.length; k++) {
        var f = features[k], b = f.__box;
        if (!b || lng < b[0] || lng > b[2] || lat < b[1] || lat > b[3]) continue;
        var g = f.geometry;
        var polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
        for (var p = 0; p < polys.length; p++) {
          if (inRing(polys[p][0], lng, lat) && !polys[p].slice(1).some(function (hole) { return inRing(hole, lng, lat); })) return f;
        }
      }
      return null;
    }
    function boxOf(f) {
      var g = f.geometry || {};
      var polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
      var box = [180, 90, -180, -90];
      polys.forEach(function (rings) {
        rings[0].forEach(function (pt) {
          box[0] = Math.min(box[0], pt[0]); box[1] = Math.min(box[1], pt[1]);
          box[2] = Math.max(box[2], pt[0]); box[3] = Math.max(box[3], pt[1]);
        });
      });
      return box;
    }

    var state = { hover: null, selected: null, selectedCountry: null, counts: {}, points: [], pins: {} };
    var lang = function () { return (window.M && M.state.lang) || 'en'; };
    var nameOf = function (f) { var n = f.properties.name || {}; return n[lang()] || n.en || ''; };
    var isSel = function (f) { return f.properties.iso && f.properties.iso === state.selectedCountry; };

    // only the hovered and the chosen country are 3D shapes (rise and glow)
    function repaintPolygons() {
      var raised = [];
      if (state.selectedCountry) {
        features.forEach(function (f) { if (isSel(f)) raised.push(f); });
      }
      if (state.hover && raised.indexOf(state.hover) === -1) raised.push(state.hover);
      globe.polygonsData(raised);
    }
    globe
      .atmosphereColor('#8cc8ff')
      .polygonCapCurvatureResolution(3)
      .polygonsTransitionDuration(220)
      .polygonCapColor(function (f) { return f === state.hover ? 'rgba(140, 200, 255, 0.36)' : 'rgba(255, 215, 110, 0.34)'; })
      .polygonSideColor(function (f) { return f === state.hover ? 'rgba(140, 200, 255, 0.28)' : 'rgba(255, 215, 110, 0.26)'; })
      .polygonStrokeColor(function (f) { return f === state.hover ? 'rgba(255, 255, 255, 0.95)' : '#ffd76e'; })
      .polygonAltitude(function (f) { return f === state.hover ? 0.014 : 0.01; })
      .polygonLabel(function (f) {
        var p = f.properties;
        var count = state.counts[p.iso] || 0;
        var sub = count ? count + ' ' + (window.M ? M.t('programs.results') : 'programmes')
                        : (window.M ? M.t('programs.noneHere') : '');
        return '<div class="earth-tip"><b>' + esc(nameOf(f)) + '</b>' +
          (p.official && p.official !== p.name.en ? '<em>' + esc(p.official) + '</em>' : '') +
          (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>';
      })
      .onPolygonClick(function (f) {
        if (options.onCountry) options.onCountry(f.properties.iso, nameOf(f), f.properties);
      })
      .onGlobeClick(function (at) {
        var f = at && countryAt(at.lat, at.lng);
        if (f && options.onCountry) options.onCountry(f.properties.iso, nameOf(f), f.properties);
        else if (options.onDeselect) options.onDeselect();
      });

    // hover: find the country under the pointer once per frame, never while dragging
    var pointer = null, hoverQueued = false;
    function hoverTick() {
      hoverQueued = false;
      if (!pointer || !features.length) return;
      var rect = el.getBoundingClientRect();
      var at = globe.toGlobeCoords(pointer.x - rect.left, pointer.y - rect.top);
      var f = at ? countryAt(at.lat, at.lng) : null;
      if (f !== state.hover) {
        state.hover = f;
        el.style.cursor = f ? 'pointer' : '';
        repaintPolygons();
      }
    }
    el.addEventListener('pointermove', function (event) {
      if (event.pointerType !== 'mouse' || event.buttons) return;
      pointer = { x: event.clientX, y: event.clientY };
      if (!hoverQueued) { hoverQueued = true; window.requestAnimationFrame(hoverTick); }
    });
    el.addEventListener('pointerleave', function () {
      pointer = null;
      if (state.hover) { state.hover = null; el.style.cursor = ''; repaintPolygons(); }
    });

    loadCountries().then(function (list) {
      features = list;
      features.forEach(function (f) { f.__box = boxOf(f); });
      paintMap();
      repaintPolygons();
    });

    /* ---- HTML pins: a crisp dot with a soft halo, not 3D cylinders ---- */
    function pinClass(p) {
      return 'earth-pin' + (p.locked ? ' is-locked' : p.urgent ? ' is-urgent' : '') +
        (p.highlight ? ' is-highlight' : '') + (p.id === state.selected ? ' is-selected' : '');
    }
    function makePin(p) {
      var node = document.createElement('button');
      node.type = 'button';
      node.className = pinClass(p);
      node.setAttribute('aria-label', p.title);
      node.innerHTML = '<span class="ep-halo"></span><span class="ep-dot"></span>' +
        '<span class="ep-label"><b>' + esc(p.title) + '</b><small>' + esc(p.subtitle) + '</small></span>';
      node.addEventListener('click', function (event) {
        event.stopPropagation();
        if (options.onSelect) options.onSelect(p);
      });
      state.pins[p.id] = node;
      return node;
    }
    globe
      .htmlLat('lat').htmlLng('lon').htmlAltitude(0.004)   // on the surface, level with the country caps
      .htmlElement(function (p) { return makePin(p); })
      .htmlTransitionDuration(0)
      .htmlElementVisibilityModifier(function (node, visible) {
        node.style.opacity = visible ? '1' : '0';
        node.style.pointerEvents = visible ? 'auto' : 'none';
      });

    function restyle() {
      state.points.forEach(function (p) {
        var node = state.pins[p.id];
        if (node) node.className = pinClass(p);
      });
    }

    api.setPins = function (pins) {
      state.points = pins || [];
      state.pins = {};
      state.counts = {};
      state.points.forEach(function (p) { if (p.iso) state.counts[p.iso] = (state.counts[p.iso] || 0) + 1; });
      globe.htmlElementsData(state.points.slice());
      repaintSoon();
    };
    api.select = function (id) {
      state.selected = id;
      controls.autoRotate = !id && !state.selectedCountry && !reducedMotion();
      restyle();
    };
    api.selectCountry = function (iso) {
      state.selectedCountry = iso || null;
      controls.autoRotate = !iso && !state.selected && !reducedMotion();
      repaintPolygons();
    };
    api.flyTo = function (lat, lng, alt) {
      globe.pointOfView({ lat: lat, lng: lng, altitude: alt || 1.55 }, reducedMotion() ? 0 : 1200);
    };
    api.zoomBy = function (factor) {
      var pov = globe.pointOfView();
      globe.pointOfView({ altitude: Math.max(0.18, Math.min(4, pov.altitude * factor)) }, 420);
    };
    api.setAutoRotate = function (on) { controls.autoRotate = on && !reducedMotion(); };
    window.addEventListener('meridian:lang', repaintPolygons);
    return api;
  }

  function esc(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  window.MeridianEarth = createEarth;
})();
