(function () {
  var KEY = 'registrar_bulletin_v2';
  var state = {
    images: [], note: '', ticker: 'Welcome to the Office of the College Registrar',
    title: 'Office of the College Registrar', subtitle: 'City College of Calamba',
    seal: '', logo: '', speed: 90, secs: 8, maxfs: 56, auto: true, noteHtml: ''
  };
  var idx = 0, timer = null;
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Storage ---------- */
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var s = JSON.parse(raw); for (var k in s) state[k] = s[k]; }
      if (!state.noteHtml && state.note) state.noteHtml = legacyToHtml(state.note);
    } catch (e) {}
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { alert('Storage is full. Remove some images and try again.'); }
  }

  /* ---------- Image helpers ---------- */
  function readScaled(file, max, type, quality) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onerror = rej;
      fr.onload = function () {
        var im = new Image();
        im.onerror = rej;
        im.onload = function () {
          var r = Math.min(1, max / Math.max(im.width, im.height));
          var c = document.createElement('canvas');
          c.width = Math.round(im.width * r); c.height = Math.round(im.height * r);
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          res(c.toDataURL(type, quality));
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  /* ---------- Announcement images ---------- */
  function renderImages() {
    var imgs = state.images, slide = $('slide');
    if (idx >= imgs.length) idx = 0;
    $('empty').style.display = imgs.length ? 'none' : 'flex';
    slide.style.display = imgs.length ? 'block' : 'none';
    if (imgs.length) slide.src = imgs[idx];

    var dots = $('dots'); dots.innerHTML = '';
    if (imgs.length > 1) imgs.forEach(function (_, i) {
      var d = document.createElement('i'); if (i === idx) d.className = 'on'; dots.appendChild(d);
    });

    var th = $('thumbs'); th.innerHTML = '';
    th.className = 'thumbs' + (imgs.length ? ' has' : '');
    imgs.forEach(function (src, i) {
      var w = document.createElement('div'); w.className = 'thumb' + (i === idx ? ' on' : '');
      var im = document.createElement('img'); im.src = src;
      im.onclick = function () { idx = i; renderImages(); startShow(); };
      var x = document.createElement('button'); x.textContent = '×'; x.title = 'Remove';
      x.onclick = function (e) {
        e.stopPropagation(); state.images.splice(i, 1); save(); renderImages(); startShow();
      };
      w.appendChild(im); w.appendChild(x); th.appendChild(w);
    });
  }
  function startShow() {
    clearInterval(timer);
    if (state.images.length > 1) {
      timer = setInterval(function () {
        idx = (idx + 1) % state.images.length; renderImages();
      }, state.secs * 1000);
    }
  }

  /* ---------- Logos and header ---------- */
  function renderBrand() {
    $('title').textContent = state.title;
    $('subtitle').textContent = state.subtitle;
    [['logoL', 'seal', 'wmL'], ['logoR', 'logo', 'wmR']].forEach(function (p) {
      var img = $(p[0]), src = state[p[1]];
      if (src) { img.src = src; img.classList.add('on'); $(p[2]).style.backgroundImage = 'url(' + src + ')'; }
      else { img.removeAttribute('src'); img.classList.remove('on'); $(p[2]).style.backgroundImage = 'none'; }
    });
  }

  /* ---------- Clock ---------- */
  function tick() {
    var d = new Date();
    $('time').textContent = d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
    $('date').textContent = d.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  /* ---------- Moving text ---------- */
  function renderTicker() {
    var t = $('track'), vp = t.parentElement;
    t.textContent = state.ticker || 'Moving announcement goes here';
    t.style.animation = 'none'; void t.offsetWidth;
    var start = vp.clientWidth;
    t.style.setProperty('--start', start + 'px');
    t.style.setProperty('--dur', ((start + t.offsetWidth) / state.speed).toFixed(1) + 's');
    t.style.animation = '';
  }

  /* ---------- Notepad: rich text view + auto-fit ---------- */
  var OK_TAGS = { B:1, STRONG:1, I:1, EM:1, U:1, S:1, STRIKE:1, SUB:1, SUP:1, SPAN:1, P:1, DIV:1, BR:1, UL:1, OL:1, LI:1, H2:1, H3:1 };
  var OK_CSS = /^(font-size|font-family|color|background-color|text-align|font-weight|font-style|text-decoration(-[a-z-]+)?)$/;

  function cleanNode(n, parent) {
    if (n.nodeType === 3) { parent.appendChild(document.createTextNode(n.nodeValue)); return; }
    if (n.nodeType !== 1 || /^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED)$/.test(n.tagName)) return;
    var target = parent;
    if (OK_TAGS[n.tagName]) {
      var el = document.createElement(n.tagName.toLowerCase());
      if (n.style) for (var i = 0; i < n.style.length; i++) {
        var p = n.style[i], v = n.style.getPropertyValue(p);
        if (OK_CSS.test(p) && !/url\(|expression|@import/i.test(v)) el.style.setProperty(p, v);
      }
      parent.appendChild(el); target = el;
    }
    for (var c = n.firstChild; c; c = c.nextSibling) cleanNode(c, target);
  }
  function sanitizeToString(html) {      /* whitelist tags/styles; parsed in an inert document */
    var doc = new DOMParser().parseFromString(html || '', 'text/html');
    var out = document.createElement('div');
    cleanNode(doc.body, out);
    return out.innerHTML;
  }
  function esc(t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function legacyToHtml(text) {          /* converts the older plain-text note */
    var out = [], mode = null, first = true;
    function close() { if (mode === 'p') out.push('</p>'); if (mode === 'ul') out.push('</ul>'); mode = null; }
    text.replace(/\r/g, '').split('\n').forEach(function (raw) {
      var l = raw.trim();
      if (!l) { close(); return; }
      if (first) { out.push('<h2>' + esc(l) + '</h2>'); first = false; return; }
      var m = l.match(/^[-•*]\s+(.*)$/);
      if (m) { if (mode !== 'ul') { close(); out.push('<ul>'); mode = 'ul'; } out.push('<li>' + esc(m[1]) + '</li>'); }
      else { if (mode !== 'p') { close(); out.push('<p>'); mode = 'p'; } else out.push('<br>'); out.push(esc(l)); }
    });
    close();
    return out.join('');
  }
  function renderNote() {
    var box = $('note');
    box.innerHTML = sanitizeToString(state.noteHtml);
    if (!box.textContent.trim()) box.innerHTML = '<p class="ph">Press Ctrl+E to type the announcement…</p>';
    fitNote();
  }
  function fitNote() {
    var el = $('note'), lo = 12, hi = state.maxfs, best = lo;
    function put(px) { el.style.fontSize = px + 'px'; el.style.setProperty('--b', px + 'px'); }
    if (!state.auto) { put(hi); return; }
    for (var i = 0; i < 9; i++) {        /* largest size that fits without scrolling */
      var mid = (lo + hi) / 2; put(mid);
      if (el.scrollHeight <= el.clientHeight + 1) { best = mid; lo = mid; } else { hi = mid; }
    }
    put(best);
  }

  /* ---------- Sync UI with state ---------- */
  function applyAll() {
    renderNote();
    $('tickerIn').value = state.ticker; $('tickerEdit').value = state.ticker;
    $('titleIn').value = state.title; $('subtitleIn').value = state.subtitle;
    $('speed').value = state.speed; $('secs').value = state.secs; $('fs').value = state.maxfs; $('auto').checked = state.auto;
    renderBrand(); renderImages(); renderTicker(); startShow();
  }
  function isEdit() { return document.body.classList.contains('edit'); }
  function setEdit(on) {
    $('app').classList.toggle('edit', on);
    document.body.classList.toggle('edit', on);
    $('fab').textContent = on ? 'Close' : 'Edit';
    if (!on) renderTicker();
  }

  /* ---------- Events ---------- */
  $('fab').onclick = $('done').onclick = function () { setEdit(!isEdit()); };

  $('addImg').onclick = function () { $('file').click(); };
  $('file').onchange = function (e) {
    var files = Array.prototype.slice.call(e.target.files);
    Promise.all(files.map(function (f) { return readScaled(f, 1600, 'image/jpeg', 0.82); }))
      .then(function (list) {
        state.images = state.images.concat(list); save(); renderImages(); startShow();
      })
      .catch(function () { alert('Could not read one of the images.'); });
    e.target.value = '';
  };
  $('clearImg').onclick = function () {
    if (state.images.length && confirm('Remove all announcement images?')) {
      state.images = []; save(); renderImages(); startShow();
    }
  };

  function logoPicker(btn, input, key) {
    $(btn).onclick = function () { $(input).click(); };
    $(input).onchange = function (e) {
      var f = e.target.files[0]; if (!f) return;
      readScaled(f, 500, 'image/png').then(function (data) {
        state[key] = data; save(); renderBrand();
      }).catch(function () { alert('Could not read that image.'); });
      e.target.value = '';
    };
  }
  logoPicker('upSeal', 'fileSeal', 'seal');
  logoPicker('upLogo', 'fileLogo', 'logo');
  $('clearLogos').onclick = function () { state.seal = ''; state.logo = ''; save(); renderBrand(); };

  $('tickerIn').oninput = function (e) { state.ticker = e.target.value; $('tickerEdit').value = state.ticker; save(); renderTicker(); };
  $('tickerEdit').oninput = function (e) { state.ticker = e.target.value; $('tickerIn').value = state.ticker; save(); };
  $('titleIn').oninput = function (e) { state.title = e.target.value; save(); renderBrand(); };
  $('subtitleIn').oninput = function (e) { state.subtitle = e.target.value; save(); renderBrand(); };
  $('speed').oninput = function (e) { state.speed = +e.target.value; save(); renderTicker(); };
  $('secs').oninput = function (e) { state.secs = +e.target.value; save(); startShow(); };
  $('fs').oninput = function (e) { state.maxfs = +e.target.value; save(); fitNote(); };
  $('auto').onchange = function (e) { state.auto = e.target.checked; save(); fitNote(); };
  $('full').onclick = function () {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
  };

  /* Pop-out notepad editor */
  function noteOpen() { return !$('noteModal').hidden; }
  function openNote() {
    $('noteModal').hidden = false;
    editor.innerHTML = sanitizeToString(state.noteHtml);
    document.execCommand('defaultParagraphSeparator', false, 'p');
    document.execCommand('styleWithCSS', false, true);
    editor.focus();
    var r = document.createRange(), sel = window.getSelection();
    r.selectNodeContents(editor); r.collapse(false);
    sel.removeAllRanges(); sel.addRange(r);
  }
  function closeNote() { $('noteModal').hidden = true; }
  $('editNote').onclick = openNote;
  $('noteClose').onclick = closeNote;
  $('note').onclick = function () { if (isEdit()) openNote(); };
  $('noteModal').onmousedown = function (e) { if (e.target === this) closeNote(); };
  /* ----- Rich text editor (toolbar) ----- */
  var editor = $('noteEdit'), savedRange = null;
  document.addEventListener('selectionchange', function () {
    var sel = window.getSelection();
    if (sel.rangeCount && editor.contains(sel.anchorNode)) savedRange = sel.getRangeAt(0).cloneRange();
  });
  function restoreSel() {
    editor.focus();
    if (savedRange) { var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(savedRange); }
  }
  function commit() { state.noteHtml = sanitizeToString(editor.innerHTML); save(); renderNote(); }
  function run(cmd, val) { document.execCommand(cmd, false, val); commit(); }

  function applySize(k) {                /* size is relative to the notepad's base size, so auto-fit still works */
    document.execCommand('styleWithCSS', false, false);
    document.execCommand('fontSize', false, '7');
    document.execCommand('styleWithCSS', false, true);
    var made = [];
    Array.prototype.forEach.call(editor.querySelectorAll('font[size="7"]'), function (f) {
      var sp = document.createElement('span');
      sp.style.fontSize = 'calc(var(--b) * ' + k + ')';
      while (f.firstChild) sp.appendChild(f.firstChild);
      f.parentNode.replaceChild(sp, f); made.push(sp);
    });
    if (made.length) {                   /* keep the words selected for more formatting */
      var r = document.createRange(), sel = window.getSelection();
      r.setStartBefore(made[0]); r.setEndAfter(made[made.length - 1]);
      sel.removeAllRanges(); sel.addRange(r); savedRange = r.cloneRange();
    }
    commit();
  }

  Array.prototype.forEach.call(document.querySelectorAll('#tb [data-cmd]'), function (b) {
    b.onmousedown = function (e) { e.preventDefault(); };
    b.onclick = function () { restoreSel(); run(b.getAttribute('data-cmd')); };
  });
  function bindSelect(id, fn) {
    $(id).onchange = function () {
      var v = this.value; this.selectedIndex = 0;
      if (!v) return; restoreSel(); fn(v);
    };
  }
  bindSelect('selBlock', function (v) { run('formatBlock', '<' + v + '>'); });
  bindSelect('selFont', function (v) { run('fontName', v); });
  bindSelect('selSize', applySize);
  function bindColor(id, chip, cmd) {
    var inp = $(id);
    inp.oninput = function () { $(chip).style.setProperty('--c', inp.value); };
    inp.onchange = function () {
      restoreSel();
      if (cmd === 'hiliteColor') {
        if (!document.execCommand('hiliteColor', false, inp.value)) document.execCommand('backColor', false, inp.value);
        commit();
      } else run(cmd, inp.value);
    };
  }
  bindColor('hlIn', 'hlChip', 'hiliteColor');
  bindColor('fgIn', 'fgChip', 'foreColor');

  editor.addEventListener('input', commit);
  editor.addEventListener('paste', function (e) {   /* paste as plain text; format with the toolbar */
    e.preventDefault();
    document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain'));
  });

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'e' || e.key === 'E')) {
      e.preventDefault(); noteOpen() ? closeNote() : openNote(); return;
    }
    if (noteOpen()) {
      if (e.key === 'Escape' || (e.ctrlKey && e.key === 'Enter')) closeNote();
      return;
    }
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'textarea' || tag === 'input') return;
    if (e.key === 'e' || e.key === 'E') setEdit(!isEdit());
  });
  window.addEventListener('resize', function () { renderTicker(); fitNote(); });
  if (window.ResizeObserver) new ResizeObserver(fitNote).observe($('note'));
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) { load(); if (!isEdit()) applyAll(); }
  });

  load(); applyAll(); tick(); setInterval(tick, 1000);
})();
