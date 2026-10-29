/* ============================================================
   Meridian — intro sequence controller
   The animation itself is pure CSS (css/home.css). This file only:
   remembers it was seen this visit, lets people skip it (click,
   tap, Escape, any key), and tidies up when it ends.
   ============================================================ */
(function () {
  'use strict';
  var root = document.documentElement;
  if (!root.classList.contains('has-intro')) return;

  try { sessionStorage.setItem('meridian.intro', '1'); } catch (e) {}

  var intro = document.getElementById('intro');
  var finished = false;

  function finish() {
    if (finished) return;
    finished = true;
    root.classList.add('intro-done');
    if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
    document.removeEventListener('keydown', onKey);
  }

  function skip() {
    if (finished || root.classList.contains('intro-skipping')) return;
    root.classList.add('intro-skipping');
    window.setTimeout(finish, 600);
  }

  function onKey(event) {
    if (event.key === 'Tab') return;
    skip();
  }

  if (intro) {
    intro.addEventListener('animationend', function (event) {
      if (event.target === intro) finish();
    });
    intro.addEventListener('click', skip);
  }
  document.addEventListener('keydown', onKey);
  // belt and braces: never hold the page longer than the sequence itself
  window.setTimeout(finish, 4600);
})();
