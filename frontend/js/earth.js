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
    function size() {
      var rect = el.getBoundingClientRect();
      var w = Math.max(1, Math.round(rect.width));
      var h = Math.max(1, Math.round(rect.height));
      globe.width(w).height(h);
      // Hero: the box is taller than it is wide so the arcs can climb up into the
      // page instead of being cut at the top of the earth. Render it as the top
      // part of a taller virtual frame, so the earth keeps its size and place.
      var lift = mode === 'hero' ? h - w : 0;
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
    }
    new ResizeObserver(size).observe(el);
    size();

    var api = { globe: globe };

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
    controls.minDistance = 112;
    controls.maxDistance = 520;
    controls.zoomSpeed = 0.8;
    globe.pointOfView({ lat: 34, lng: 22, altitude: 2.1 }, 0);

    // Quality never drops when you zoom out: far away the bundled 4K image (with
    // full anisotropic filtering) is sharper than low-level map tiles, so the
    // NASA tile engine only takes over once you are close to the surface.
    globe.globeImageUrl(TEX.day);
    var tilesReady = false, tilesOn = false;
    function crisp() {
      var material = globe.globeMaterial();
      var max = globe.renderer().capabilities.getMaxAnisotropy();
      if (material && material.map && material.map.anisotropy !== max) {
        material.map.anisotropy = max;
        material.map.needsUpdate = true;
      }
    }
    function pickDetail() {
      if (!tilesReady) return;
      var alt = globe.pointOfView().altitude;
      if (!tilesOn && alt < 0.9) {
        tilesOn = true;
        globe.globeTileEngineMaxLevel(GIBS_MAX)
          .globeTileEngineUrl(function (x, y, level) { return GIBS + level + '/' + y + '/' + x + '.jpeg'; });
      } else if (tilesOn && alt > 1.2) {
        tilesOn = false;
        globe.globeTileEngineUrl(null);
        globe.globeImageUrl(TEX.day);
        window.setTimeout(crisp, 400);
      }
    }
    fetch(GIBS + '1/0/0.jpeg', { mode: 'cors' }).then(function (r) {
      tilesReady = r.ok;
      pickDetail();
    }).catch(function () {});
    controls.addEventListener('end', pickDetail);
    controls.addEventListener('change', function () { window.clearTimeout(api._detailTimer); api._detailTimer = window.setTimeout(pickDetail, 250); });
    globe.onGlobeReady(crisp);

    var state = { hover: null, selected: null, selectedCountry: null, counts: {}, points: [], pins: {} };
    var lang = function () { return (window.M && M.state.lang) || 'en'; };
    var nameOf = function (f) { var n = f.properties.name || {}; return n[lang()] || n.en || ''; };
    var isSel = function (f) { return f.properties.iso && f.properties.iso === state.selectedCountry; };

    function capColor(f) {
      if (f === state.hover) return 'rgba(140, 200, 255, 0.36)';
      if (isSel(f)) return 'rgba(255, 215, 110, 0.34)';
      if (state.counts[f.properties.iso]) return 'rgba(255, 215, 110, 0.12)';
      return 'rgba(255, 255, 255, 0.015)';
    }
    function sideColor(f) {
      if (f === state.hover) return 'rgba(140, 200, 255, 0.28)';
      if (isSel(f)) return 'rgba(255, 215, 110, 0.26)';
      return 'rgba(255, 255, 255, 0.03)';
    }
    function strokeColor(f) {
      if (f === state.hover) return 'rgba(255, 255, 255, 0.95)';
      if (isSel(f)) return '#ffd76e';
      return 'rgba(255, 255, 255, 0.22)';
    }
    function altitude(f) {
      if (f === state.hover) return 0.014;
      if (isSel(f)) return 0.01;
      return 0.004;
    }
    function repaintPolygons() {
      globe
        .polygonCapColor(function (f) { return capColor(f); })
        .polygonSideColor(function (f) { return sideColor(f); })
        .polygonStrokeColor(function (f) { return strokeColor(f); })
        .polygonAltitude(function (f) { return altitude(f); });
    }

    globe
      .atmosphereColor('#8cc8ff')
      .polygonCapCurvatureResolution(3)
      .polygonsTransitionDuration(320)
      .polygonLabel(function (f) {
        var p = f.properties;
        var count = state.counts[p.iso] || 0;
        var sub = count ? count + ' ' + (window.M ? M.t('programs.results') : 'programmes')
                        : (window.M ? M.t('programs.noneHere') : '');
        return '<div class="earth-tip"><b>' + esc(nameOf(f)) + '</b>' +
          (p.official && p.official !== p.name.en ? '<em>' + esc(p.official) + '</em>' : '') +
          (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>';
      })
      .onPolygonHover(function (f) {
        state.hover = f || null;
        el.style.cursor = f ? 'pointer' : '';
        repaintPolygons();
      })
      .onPolygonClick(function (f) {
        if (options.onCountry) options.onCountry(f.properties.iso, nameOf(f), f.properties);
      })
      .onGlobeClick(function () { if (options.onDeselect) options.onDeselect(); });

    loadCountries().then(function (features) {
      globe.polygonsData(features);
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
      repaintPolygons();
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
      window.setTimeout(pickDetail, 1300);
    };
    api.zoomBy = function (factor) {
      var pov = globe.pointOfView();
      globe.pointOfView({ altitude: Math.max(0.12, Math.min(4, pov.altitude * factor)) }, 420);
      window.setTimeout(pickDetail, 480);
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
