(function () {
  var KEY = 'registrar_bulletin_v2';
  var state = {
    images: [], note: '', ticker: 'Welcome to the Office of the College Registrar',
    title: 'Office of the College Registrar', subtitle: 'City College of Calamba',
    seal: '', logo: '', speed: 90, secs: 8, maxfs: 56, auto: true
  };
  var idx = 0, timer = null;
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Storage ---------- */
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var s = JSON.parse(raw); for (var k in s) state[k] = s[k]; }
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

  /* ---------- Notepad: formatted view + auto-fit ---------- */
  function renderNote() {
    var box = $('note'); box.innerHTML = '';
    var lines = (state.note || '').replace(/\r/g, '').split('\n');
    if (!lines.join('').trim()) {
      var ph = document.createElement('p'); ph.className = 'ph';
      ph.textContent = 'Press Ctrl+E to type the announcement…';
      box.appendChild(ph); fitNote(); return;
    }
    var first = true, para = null, list = null;
    lines.forEach(function (raw) {
      var line = raw.trim();
      if (!line) { para = null; list = null; return; }
      if (first) {                       /* first line = title */
        var h = document.createElement('h2'); h.textContent = line;
        box.appendChild(h); first = false; return;
      }
      var m = line.match(/^[-•*]\s+(.*)$/);
      if (m) {                           /* "- item" = bullet */
        para = null;
        if (!list) { list = document.createElement('ul'); box.appendChild(list); }
        var li = document.createElement('li'); li.textContent = m[1]; list.appendChild(li);
      } else {
        list = null;
        if (!para) { para = document.createElement('p'); box.appendChild(para); }
        else para.appendChild(document.createElement('br'));
        para.appendChild(document.createTextNode(line));
      }
    });
    fitNote();
  }
  function fitNote() {
    var el = $('note'), lo = 12, hi = state.maxfs, best = lo;
    if (!state.auto) { el.style.fontSize = hi + 'px'; return; }
    for (var i = 0; i < 9; i++) {      /* largest size that fits without scrolling */
      var mid = (lo + hi) / 2;
      el.style.fontSize = mid + 'px';
      if (el.scrollHeight <= el.clientHeight + 1) { best = mid; lo = mid; } else { hi = mid; }
    }
    el.style.fontSize = best + 'px';
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
    var t = $('noteEdit');
    $('noteModal').hidden = false;
    t.value = state.note; t.focus(); t.setSelectionRange(t.value.length, t.value.length);
  }
  function closeNote() { $('noteModal').hidden = true; }
  $('editNote').onclick = openNote;
  $('noteClose').onclick = closeNote;
  $('note').onclick = function () { if (isEdit()) openNote(); };
  $('noteModal').onmousedown = function (e) { if (e.target === this) closeNote(); };
  $('noteEdit').oninput = function (e) {
    state.note = e.target.value; save(); renderNote();
  };

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
