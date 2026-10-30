/* ============================================================
   Meridian — Meridian AI chat
   A button with our mark on every page opens a small chat panel.
   The conversation stays in this browser (localStorage); the server
   only counts messages. Any element with data-ask-ai="question"
   opens the chat and asks that question.
   ============================================================ */
(function () {
  'use strict';
  if (window.MeridianAI) return;

  var STORE = 'meridian.ai.chat';
  var status = null;
  var history = [];
  var busy = false;
  var root, panel, list, input, sendBtn, note;

  var SUGGEST = [
    'ai.s.uni', 'ai.s.startup', 'ai.s.scholar', 'ai.s.essay'
  ];

  function load() {
    try { history = JSON.parse(localStorage.getItem(STORE) || '[]') || []; } catch (e) { history = []; }
    if (!Array.isArray(history)) history = [];
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(history.slice(-30))); } catch (e) { /* private mode */ }
  }

  /* Tiny, safe markdown: escape everything, then bold, links (our pages or https), lists, headings */
  function render(text) {
    var html = M.esc(text);
    html = html.replace(/\[([^\]]+)\]\(((?:\/|https:\/\/)[^\s)]+)\)/g, function (_m, label, href) {
      var external = /^https:/.test(href);
      return '<a href="' + href + '"' + (external ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + label + '</a>';
    });
    html = html.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    var out = [], inList = null;
    html.split('\n').forEach(function (line) {
      var bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
      var number = /^\s*\d+[.)]\s+(.*)$/.exec(line);
      var head = /^#{1,4}\s+(.*)$/.exec(line);
      if (bullet || number) {
        var tag = bullet ? 'ul' : 'ol';
        if (inList !== tag) { if (inList) out.push('</' + inList + '>'); out.push('<' + tag + '>'); inList = tag; }
        out.push('<li>' + (bullet || number)[1] + '</li>');
        return;
      }
      if (inList) { out.push('</' + inList + '>'); inList = null; }
      if (head) out.push('<h4>' + head[1] + '</h4>');
      else if (line.trim()) out.push('<p>' + line + '</p>');
    });
    if (inList) out.push('</' + inList + '>');
    return out.join('');
  }

  function bubble(msg) {
    var me = msg.role === 'user';
    return '<div class="ai-msg ' + (me ? 'is-me' : 'is-ai') + '">' +
      (me ? '<p>' + M.esc(msg.content).replace(/\n/g, '<br>') + '</p>' : render(msg.content)) + '</div>';
  }

  function paint() {
    if (!list) return;
    if (!history.length) {
      list.innerHTML = '<div class="ai-hello">' +
        '<span class="ai-hello-mark" aria-hidden="true"></span>' +
        '<h3>' + M.t('ai.hello') + '</h3>' +
        '<p>' + M.t(status && !status.enabled ? 'ai.soon' : 'ai.helloBody') + '</p>' +
        (status && status.enabled ? '<div class="ai-suggest">' + SUGGEST.map(function (k) {
          return '<button type="button" data-suggest="' + M.esc(M.t(k)) + '">' + M.esc(M.t(k)) + '</button>';
        }).join('') + '</div>' : '') +
      '</div>';
      list.querySelectorAll('[data-suggest]').forEach(function (b) {
        b.addEventListener('click', function () { ask(b.getAttribute('data-suggest')); });
      });
    } else {
      list.innerHTML = history.map(bubble).join('') +
        (busy ? '<div class="ai-msg is-ai is-typing" aria-label="…"><i></i><i></i><i></i></div>' : '');
    }
    list.scrollTop = list.scrollHeight;
    var off = status && !status.enabled;
    input.disabled = off || busy;
    sendBtn.disabled = off || busy;
    note.textContent = off ? M.t('ai.soonShort') :
      status && typeof status.left === 'number' ? M.t('ai.left').replace('{n}', status.left) : '';
  }

  function ask(text) {
    text = String(text || '').trim();
    if (!text || busy) return;
    if (status && !status.enabled) { open(); return; }
    history.push({ role: 'user', content: text });
    busy = true;
    save(); paint();
    M.track('page', 'ai', { kind: 'ai_message' });
    fetch('/api/ai/chat', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history, page: window.location.pathname })
    }).then(function (r) { return r.json().then(function (d) { return { status: r.status, data: d }; }); })
      .then(function (res) {
        var d = res.data || {};
        if (d.ok && d.reply) {
          history.push({ role: 'assistant', content: d.reply });
          if (typeof d.left === 'number') status.left = d.left;
        } else if (d.ok && d.refused) {
          history.push({ role: 'assistant', content: M.t('ai.refused') });
        } else {
          history.pop();                       // let them try again
          var key = d.error === 'ai_limit' ? (d.authed ? 'ai.limit' : 'ai.limitGuest') :
            d.error === 'ai_off' ? 'ai.soonShort' : d.error === 'ai_busy' ? 'ai.busy' : 'ai.error';
          M.toast(M.t(key), 'error', 4200);
          input.value = text;
        }
      })
      .catch(function () { history.pop(); input.value = text; M.toast(M.t('ai.error'), 'error'); })
      .then(function () { busy = false; save(); paint(); if (!input.disabled) input.focus(); });
  }

  function open(prompt) {
    root.classList.add('is-open');
    panel.hidden = false;
    document.getElementById('aiFab').setAttribute('aria-expanded', 'true');
    paint();
    if (prompt) ask(prompt); else window.setTimeout(function () { input.focus(); }, 60);
  }
  function close() {
    root.classList.remove('is-open');
    document.getElementById('aiFab').setAttribute('aria-expanded', 'false');
    window.setTimeout(function () { if (!root.classList.contains('is-open')) panel.hidden = true; }, 220);
  }

  function mount() {
    root = document.createElement('div');
    root.className = 'ai-root';
    root.innerHTML =
      '<section class="ai-panel" id="aiPanel" role="dialog" aria-label="Meridian AI" hidden>' +
        '<header class="ai-head">' +
          '<span class="ai-head-mark" aria-hidden="true"></span>' +
          '<div><b>Meridian AI</b><small>' + M.t('ai.sub') + '</small></div>' +
          '<button type="button" class="ai-icon" id="aiClear" aria-label="' + M.esc(M.t('ai.clear')) + '" title="' + M.esc(M.t('ai.clear')) + '">' + M.icon('edit', 17) + '</button>' +
          '<button type="button" class="ai-icon" id="aiClose" aria-label="' + M.esc(M.t('common.close') || 'Close') + '">' + M.icon('x', 18) + '</button>' +
        '</header>' +
        '<div class="ai-list" id="aiList" aria-live="polite"></div>' +
        '<form class="ai-form" id="aiForm">' +
          '<textarea id="aiInput" rows="1" maxlength="6000" placeholder="' + M.esc(M.t('ai.placeholder')) + '"></textarea>' +
          '<button type="submit" class="ai-send" id="aiSend" aria-label="' + M.esc(M.t('ai.send')) + '">' + M.icon('send', 18) + '</button>' +
        '</form>' +
        '<p class="ai-note"><span id="aiNote"></span> · ' + M.t('ai.disclaimer') + '</p>' +
      '</section>' +
      '<button type="button" class="ai-fab" id="aiFab" aria-controls="aiPanel" aria-expanded="false" aria-label="Meridian AI">' +
        '<span class="ai-fab-mark" aria-hidden="true"></span><span class="ai-fab-label">AI</span></button>';
    document.body.appendChild(root);
    panel = root.querySelector('#aiPanel');
    list = root.querySelector('#aiList');
    input = root.querySelector('#aiInput');
    sendBtn = root.querySelector('#aiSend');
    note = root.querySelector('#aiNote');

    root.querySelector('#aiFab').addEventListener('click', function () {
      if (root.classList.contains('is-open')) close(); else open();
    });
    root.querySelector('#aiClose').addEventListener('click', close);
    root.querySelector('#aiClear').addEventListener('click', function () { history = []; save(); paint(); input.focus(); });
    root.querySelector('#aiForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var text = input.value;
      input.value = '';
      input.style.height = '';
      ask(text);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); root.querySelector('#aiForm').requestSubmit(); }
    });
    input.addEventListener('input', function () {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 140) + 'px';
    });
  }

  function init() {
    load();
    mount();
    // page-level listeners are bound once; the panel itself is rebuilt on a language change
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root.classList.contains('is-open')) close(); });
    document.addEventListener('click', function (e) {
      var trigger = e.target.closest && e.target.closest('[data-ask-ai]');
      if (!trigger) return;
      e.preventDefault();
      open(trigger.getAttribute('data-ask-ai') || '');
    });
    window.addEventListener('meridian:lang', function () {
      var wasOpen = root.classList.contains('is-open');
      root.remove(); mount(); paint();
      if (wasOpen) open();
    });
    fetch('/api/ai/status', { credentials: 'same-origin' }).then(function (r) { return r.json(); })
      .then(function (d) { status = d; paint(); })
      .catch(function () { status = { enabled: false }; paint(); });
    window.addEventListener('meridian:user', function () {
      fetch('/api/ai/status', { credentials: 'same-origin' }).then(function (r) { return r.json(); })
        .then(function (d) { status = d; paint(); }).catch(function () {});
    });
  }

  window.MeridianAI = { open: open, ask: function (q) { open(q); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
