/* Boule-App – Messen, Spielstand, Regeln, Trainer (Platzhalter) */
(() => {
  'use strict';
  const OPENCV_URL = 'https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.10.0-release.1/dist/opencv.js';
  const $ = id => document.getElementById(id);
  const LS = {
    get(k, d) { try { const v = localStorage.getItem('boule.' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('boule.' + k, JSON.stringify(v)); } catch { /* voll/privat */ } },
  };
  const DEFAULTS = { ball: 73, jack: 30, tie: 1.5, auto: true, worker: 'https://boule-chat.rsab1963.workers.dev' };
  let S = Object.assign({}, DEFAULTS, LS.get('settings', {}));
  const fmtCm = mm => (mm / 10).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' cm';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- Tabs ---------- */
  document.querySelectorAll('#tabs button').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
  function showTab(t) {
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
    document.querySelectorAll('section.tab').forEach(s => s.classList.toggle('active', s.id === 'tab-' + t));
    if (t !== 'messen') stopCamera();
    LS.set('tab', t);
    window.scrollTo(0, 0);
  }
  showTab(LS.get('tab', 'messen'));

  /* ---------- Einstellungen ---------- */
  $('btnSettings').addEventListener('click', () => {
    $('sBall').value = S.ball; $('sJack').value = S.jack; $('sTie').value = S.tie; $('sWorker').value = S.worker; $('sAuto').checked = S.auto;
    $('dlgSettings').showModal();
  });
  $('sSave').addEventListener('click', () => {
    const num = (v, d, lo, hi) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) && n >= lo && n <= hi ? n : d; };
    S.ball = num($('sBall').value, S.ball, 60, 85);
    S.jack = num($('sJack').value, S.jack, 20, 40);
    S.tie = num($('sTie').value, S.tie, 0, 10);
    S.worker = $('sWorker').value.trim();
    S.auto = $('sAuto').checked;
    LS.set('settings', S);
    if (M.balls) render();
  });

  /* ---------- OpenCV laden (einmalig, danach aus dem Cache) ---------- */
  let cvPromise = null;
  function loadCV() {
    if (cvPromise) return cvPromise;
    // Achtung: das OpenCV-Modul ist selbst "thenable" – nie direkt per resolve() weiterreichen,
    // sonst ruft der Promise-Mechanismus endlos cv.then() auf und die Seite hängt.
    cvPromise = new Promise((resolve, reject) => {
      let fired = false;
      const done = () => { if (!fired) { fired = true; resolve(); } };
      const s = document.createElement('script');
      s.src = OPENCV_URL; s.async = true;
      s.onload = () => {
        const cv = window.cv;
        if (!cv) return reject(new Error('OpenCV nicht verfügbar'));
        if (cv.Mat) { try { new cv.Mat().delete(); return done(); } catch { /* noch nicht initialisiert */ } }
        cv.onRuntimeInitialized = done;
      };
      s.onerror = () => { cvPromise = null; reject(new Error('OpenCV konnte nicht geladen werden (Internet?)')); };
      document.head.appendChild(s);
    });
    return cvPromise;
  }

  /* ---------- Kamera + Libelle ---------- */
  let stream = null, tilt = null, levelSince = 0, shooting = false;
  function onOrient(e) {
    if (e.beta == null) return;
    // Handy flach (Display oben, Kamera zum Boden): beta ≈ 0, gamma ≈ 0
    const b = e.beta, g = e.gamma;
    tilt = Math.sqrt(b * b + g * g);
    const k = 2.2, cx = Math.max(-48, Math.min(48, g * k)), cy = Math.max(-48, Math.min(48, b * k));
    const bub = $('bubble');
    bub.style.transform = `translate(${cx}px,${cy}px)`;
    bub.classList.toggle('good', tilt < 3);
    $('tiltTxt').textContent = tilt.toFixed(0) + '° Neigung';
    // Automatisch auslösen, wenn das Handy ~1 s ruhig und waagerecht ist (wie bei einer Wasserwaage)
    if (S.auto && stream && !shooting && $('video').videoWidth) {
      const now = performance.now();
      if (tilt < 2.5) {
        levelSince = levelSince || now;
        const left = Math.max(0, 1000 - (now - levelSince));
        $('liveHint').textContent = left > 0 ? 'Ruhig halten … Aufnahme gleich' : 'Aufnahme!';
        if (left === 0) shoot();
      } else { levelSince = 0; $('liveHint').textContent = 'Schweinchen in die Mitte, Libelle grün halten'; }
    }
  }
  $('btnCam').addEventListener('click', async () => {
    loadCV().catch(() => {}); // im Hintergrund vorladen
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        await DeviceOrientationEvent.requestPermission().catch(() => 'denied');
      }
      window.addEventListener('deviceorientation', onOrient);
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 3840 }, height: { ideal: 2160 } },
      });
      $('video').srcObject = stream;
      $('live').classList.add('on'); shooting = false; levelSince = 0;
      $('tiltTxt').textContent = '';
      $('liveHint').textContent = S.auto ? 'Libelle grün halten – Aufnahme erfolgt automatisch' : 'Schweinchen in die Mitte, Libelle grün halten';
    } catch (err) {
      alert('Kamera nicht verfügbar: ' + err.message + '\nAlternativ „Foto wählen" nutzen.');
      stopCamera();
    }
  });
  function stopCamera() {
    window.removeEventListener('deviceorientation', onOrient);
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null; $('live').classList.remove('on');
  }
  $('liveCancel').addEventListener('click', stopCamera);
  $('shutter').addEventListener('click', () => shoot());
  async function shoot() {
    if (shooting) return; shooting = true;
    if (navigator.vibrate) navigator.vibrate(40);
    const v = $('video'); const capturedTilt = tilt;
    let bmp = null;
    try { // volle Fotoauflösung, wo unterstützt (Android/Chrome)
      if ('ImageCapture' in window && stream) {
        const blob = await new ImageCapture(stream.getVideoTracks()[0]).takePhoto();
        bmp = await createImageBitmap(blob);
      }
    } catch { bmp = null; }
    const c = document.createElement('canvas');
    if (bmp) { c.width = bmp.width; c.height = bmp.height; c.getContext('2d').drawImage(bmp, 0, 0); }
    else { c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0); }
    stopCamera();
    analyse(c, capturedTilt);
  }
  $('filePick').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0); URL.revokeObjectURL(img.src); analyse(c, null);
    };
    img.onerror = () => alert('Bild konnte nicht gelesen werden.');
    img.src = URL.createObjectURL(f);
    e.target.value = '';
  });

  /* ---------- Analyse ---------- */
  const M = { src: null, mat: null, balls: null, jack: null, ballR: 0, tilt: null, mode: 'view', zoom: false, crop: null };
  function setMView(v) { ['mIdle', 'mBusy', 'mResult'].forEach(id => $(id).classList.toggle('hide', id !== v)); }

  async function analyse(canvas, capturedTilt) {
    // Größe begrenzen (Speicher/Tempo); Erkennung skaliert intern weiter
    const MAX = 3000, L = Math.max(canvas.width, canvas.height);
    if (L > MAX) {
      const s = MAX / L, c2 = document.createElement('canvas');
      c2.width = Math.round(canvas.width * s); c2.height = Math.round(canvas.height * s);
      c2.getContext('2d').drawImage(canvas, 0, 0, c2.width, c2.height); canvas = c2;
    }
    setMView('mBusy');
    $('busyText').textContent = window.cv && window.cv.Mat ? 'Erkenne Kugeln …' : 'Bilderkennung wird geladen (einmalig ca. 10 MB) …';
    let cv;
    try { await loadCV(); cv = window.cv; } catch (e) { alert(e.message); setMView('mIdle'); return; }
    $('busyText').textContent = 'Erkenne Kugeln …';
    await new Promise(r => setTimeout(r, 30)); // Spinner zeichnen lassen
    if (M.mat) { M.mat.delete(); M.mat = null; }
    try {
      M.mat = cv.imread(canvas);
      const r = BouleDetect.detectAuto(cv, M.mat);
      Object.assign(M, { src: canvas, balls: r.balls, jack: r.jack, ballR: r.ballR, tilt: capturedTilt, mode: 'view', zoom: false });
    } catch (e) {
      console.error(e); alert('Bilderkennung fehlgeschlagen.'); setMView('mIdle'); return;
    }
    setMode('view');
    setMView('mResult');
    render();
  }

  const COL = ['#2f9e5b', '#2c5d8a', '#2c5d8a', '#2c5d8a', '#2c5d8a', '#2c5d8a'];
  function render() {
    const cvs = $('cv'), src = M.src; if (!src) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = cvs.parentElement.clientWidth;
    const ranked = BouleDetect.rank(M.balls, M.jack, S.ball, S.jack);
    const top = ranked.slice(0, 6);
    // Ausschnitt: ganzes Bild oder Nahansicht auf Schweinchen + Plätze 1–2
    let crop = { x: 0, y: 0, w: src.width, h: src.height };
    if (M.zoom && M.jack && top.length) {
      const pts = [M.jack, ...top.slice(0, 2)], pad = M.ballR * 1.6;
      let x0 = Math.min(...pts.map(p => p.x - p.r)) - pad, x1 = Math.max(...pts.map(p => p.x + p.r)) + pad;
      let y0 = Math.min(...pts.map(p => p.y - p.r)) - pad, y1 = Math.max(...pts.map(p => p.y + p.r)) + pad;
      const asp = 4 / 3; let w = x1 - x0, h = y1 - y0;
      if (w / h < asp) { const nw = h * asp; x0 -= (nw - w) / 2; w = nw; } else { const nh = w / asp; y0 -= (nh - h) / 2; h = nh; }
      crop = { x: x0, y: y0, w, h };
    }
    M.crop = crop;
    const scale = W / crop.w;
    cvs.width = Math.round(W * dpr); cvs.height = Math.round(crop.h * scale * dpr);
    const ctx = cvs.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cvs.width, cvs.height);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, -crop.x * dpr * scale, -crop.y * dpr * scale);
    ctx.drawImage(src, 0, 0);
    $('btnZoom').classList.toggle('hide', !(M.jack && top.length));
    $('btnZoom').textContent = M.zoom ? 'Gesamtbild' : 'Nahansicht Platz 1–2';
    const lw = Math.max(2 / scale, M.ballR * 0.07);
    // übrige Kugeln
    ctx.setLineDash([lw * 2, lw * 2]); ctx.lineWidth = lw * 0.7; ctx.strokeStyle = 'rgba(255,255,255,.75)';
    const rest = M.jack ? ranked.slice(6) : M.balls.map(b => ({ x: b.x, y: b.y, r: b.r }));
    rest.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.stroke(); });
    ctx.setLineDash([]);
    // Linien + Kreise der Top 6
    if (M.jack) top.forEach((b, i) => {
      ctx.strokeStyle = i === 0 ? 'rgba(47,158,91,.9)' : 'rgba(255,255,255,.55)'; ctx.lineWidth = lw * 0.6;
      ctx.beginPath(); ctx.moveTo(M.jack.x, M.jack.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    });
    top.forEach((b, i) => {
      ctx.lineWidth = lw * (i === 0 ? 1.4 : 1); ctx.strokeStyle = i === 0 ? COL[0] : '#fff';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.stroke();
      const br = Math.max(M.ballR * 0.42, 11 / scale), bx = b.x + b.r * 0.72, by = b.y - b.r * 0.72;
      ctx.fillStyle = COL[i]; ctx.beginPath(); ctx.arc(bx, by, br, 0, 7); ctx.fill();
      ctx.lineWidth = lw * 0.5; ctx.strokeStyle = '#fff'; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = `700 ${br * 1.25}px system-ui,sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), bx, by + br * 0.05);
    });
    if (M.jack) {
      ctx.lineWidth = lw; ctx.strokeStyle = '#e0552b';
      ctx.beginPath(); ctx.arc(M.jack.x, M.jack.y, M.jack.r * 1.6, 0, 7); ctx.stroke();
    }
    // Liste
    const tb = $('rankTable');
    if (!M.jack) tb.innerHTML = '<tr><td class="muted">Kein Schweinchen gefunden.</td></tr>';
    else if (!top.length) tb.innerHTML = '<tr><td class="muted">Keine Kugeln gefunden.</td></tr>';
    else tb.innerHTML = top.map((b, i) => {
      const gap = i ? b.mm - top[i - 1].mm : null;
      const tight = gap !== null && gap / 10 < S.tie;
      return `<tr><td class="n"><span class="badge" style="background:${COL[i]}">${i + 1}</span></td>
        <td><span class="dist">${fmtCm(b.mm)}</span>${tight ? '<span class="tag">knapp – nachmessen</span>' : ''}</td>
        <td class="muted" style="text-align:right">${gap === null ? '' : '+' + fmtCm(gap)}</td></tr>`;
    }).join('') + (ranked.length > 6 ? `<tr><td></td><td class="muted" colspan="2">${ranked.length - 6} weitere Kugel(n) weiter entfernt</td></tr>` : '');
    // Hinweise
    const notes = [];
    if (!M.ballR) notes.push('Keine Kugeln erkannt. Näher herangehen (ca. 1–1,5 m), Schatten vermeiden und alle Kugeln vollständig ins Bild nehmen.');
    else if (!M.jack) notes.push('Schweinchen nicht erkannt: Modus „Schweinchen" wählen und es im Bild antippen.');
    if (M.tilt != null && M.tilt > 6) notes.push(`Das Handy war ${M.tilt.toFixed(0)}° geneigt – Abstände können ungenau sein.`);
    if (M.ballR) notes.push('Fehlt eine Kugel oder ist eine falsch? Mit „+ Kugel" / „− Kugel" korrigieren.');
    $('resNotes').innerHTML = notes.map((n, i) => `<div class="${i === notes.length - 1 && M.ballR ? 'muted' : 'note'}" style="margin:6px 2px">${esc(n)}</div>`).join('');
  }
  window.addEventListener('resize', () => { if (!$('mResult').classList.contains('hide')) render(); });

  const HINTS = { view: '', add: 'Fehlende Kugel im Bild antippen.', del: 'Falsch erkannte Kugel antippen.', jack: 'Schweinchen im Bild antippen.' };
  function setMode(m) {
    M.mode = m;
    document.querySelectorAll('#editSeg button').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
    $('modeHint').textContent = HINTS[m];
  }
  document.querySelectorAll('#editSeg button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  $('cv').addEventListener('click', e => {
    if (M.mode === 'view' || !M.src) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const c = M.crop;
    const x = c.x + (e.clientX - rect.left) / rect.width * c.w, y = c.y + (e.clientY - rect.top) / rect.height * c.h;
    const cv = window.cv;
    if (M.mode === 'add') {
      if (!M.ballR) { alert('Zuerst muss mindestens eine Kugel erkannt sein (für den Maßstab).'); return; }
      M.balls.push(BouleDetect.findNear(cv, M.mat, x, y, M.ballR));
    } else if (M.mode === 'del') {
      let bi = -1, bd = Infinity;
      M.balls.forEach((b, i) => { const d = Math.hypot(b.x - x, b.y - y); if (d < bd) { bd = d; bi = i; } });
      if (bi >= 0 && bd < M.balls[bi].r * 1.5) M.balls.splice(bi, 1);
    } else if (M.mode === 'jack') {
      const rj = (M.ballR || M.src.width * 0.01) * S.jack / S.ball;
      const j = M.ballR ? BouleDetect.findNear(cv, M.mat, x, y, rj) : { x, y, r: rj };
      M.jack = { x: j.x, y: j.y, r: j.r };
      setMode('view');
    }
    render();
  });
  $('btnZoom').addEventListener('click', () => { M.zoom = !M.zoom; render(); });
  $('btnAgain').addEventListener('click', () => {
    setMView('mIdle');
    if (M.mat) { M.mat.delete(); M.mat = null; }
    M.src = null; M.balls = null;
  });

  /* ---------- Spielstand ---------- */
  const FORMS = { tete: { label: 'Tête-à-tête', max: 3 }, doublette: { label: 'Doublette', max: 6 }, triplette: { label: 'Triplette', max: 6 } };
  let G = LS.get('game', null);
  let pickTeam = null;
  const sum = (g, t) => g.ends.filter(e => e.t === t).reduce((a, e) => a + e.p, 0);
  function saveG() { LS.set('game', G); }
  function renderGame() {
    const playing = !!G;
    $('gSetup').classList.toggle('hide', playing);
    $('gPlay').classList.toggle('hide', !playing);
    renderPast();
    if (!playing) return;
    const a = sum(G, 0), b = sum(G, 1), winner = a >= G.target ? 0 : b >= G.target ? 1 : null;
    $('nA').textContent = G.a; $('nB').textContent = G.b; $('pA').textContent = a; $('pB').textContent = b;
    document.querySelectorAll('.team').forEach(el => {
      const t = +el.dataset.t;
      el.classList.toggle('sel', pickTeam === t && winner === null);
      el.classList.toggle('win', winner === t);
    });
    $('winBox').classList.toggle('hide', winner === null);
    $('pickHint').classList.toggle('hide', winner !== null || pickTeam !== null);
    $('picker').classList.toggle('hide', winner !== null || pickTeam === null);
    if (winner !== null) $('winText').textContent = `${winner ? G.b : G.a} gewinnt ${Math.max(a, b)}:${Math.min(a, b)}`;
    if (pickTeam !== null && winner === null) {
      const max = FORMS[G.form].max;
      $('picker').innerHTML = Array.from({ length: 6 }, (_, i) => `<button data-p="${i + 1}" ${i + 1 > max ? 'disabled' : ''}>${i + 1}</button>`).join('');
    }
    let ra = 0, rb = 0;
    $('gHist').innerHTML = G.ends.map((e, i) => {
      if (e.t === 0) ra += e.p; else rb += e.p;
      return `<li><span>${i + 1}. ${esc(e.t ? G.b : G.a)} +${e.p}</span><b>${ra}:${rb}</b></li>`;
    }).reverse().join('') || '<li class="muted">Noch keine Aufnahme.</li>';
  }
  function renderPast() {
    const past = LS.get('past', []);
    $('gPastCard').classList.toggle('hide', !past.length || !!G);
    $('gPast').innerHTML = past.slice(0, 10).map(p => `<li><span>${esc(p.a)} – ${esc(p.b)} <span class="muted">· ${esc(FORMS[p.form]?.label || '')} · ${new Date(p.date).toLocaleDateString('de-DE')}</span></span><b>${p.sa}:${p.sb}</b></li>`).join('');
  }
  $('gStart').addEventListener('click', () => {
    G = { form: $('gForm').value, a: $('gA').value.trim() || 'Team A', b: $('gB').value.trim() || 'Team B', target: +$('gTarget').value, ends: [], date: Date.now() };
    pickTeam = null; saveG(); renderGame();
  });
  document.querySelectorAll('.team').forEach(el => el.addEventListener('click', () => {
    if (!G || sum(G, 0) >= G.target || sum(G, 1) >= G.target) return;
    const t = +el.dataset.t; pickTeam = pickTeam === t ? null : t; renderGame();
  }));
  $('picker').addEventListener('click', e => {
    const p = +e.target.dataset.p; if (!p || pickTeam === null) return;
    G.ends.push({ t: pickTeam, p }); pickTeam = null; saveG();
    const a = sum(G, 0), b = sum(G, 1);
    if (a >= G.target || b >= G.target) archive();
    renderGame();
    if (navigator.vibrate) navigator.vibrate(30);
  });
  function archive() {
    const past = LS.get('past', []);
    past.unshift({ date: Date.now(), form: G.form, a: G.a, b: G.b, sa: sum(G, 0), sb: sum(G, 1) });
    LS.set('past', past.slice(0, 50)); G.archived = true; saveG();
  }
  $('gUndo').addEventListener('click', () => {
    if (!G || !G.ends.length) return;
    if (G.archived) { const past = LS.get('past', []); past.shift(); LS.set('past', past); G.archived = false; }
    G.ends.pop(); pickTeam = null; saveG(); renderGame();
  });
  $('gEnd').addEventListener('click', () => {
    if (!G) return;
    if (!G.archived && G.ends.length && !confirm('Spiel ohne Sieger beenden? Es wird nicht gespeichert.')) return;
    G = null; saveG(); renderGame();
  });
  $('gRematch').addEventListener('click', () => { G = { ...G, ends: [], archived: false, date: Date.now() }; saveG(); renderGame(); });
  $('gNew').addEventListener('click', () => { if (G) { $('gForm').value = G.form; $('gA').value = G.a; $('gB').value = G.b; } G = null; saveG(); renderGame(); });
  renderGame();

  /* ---------- Regeln: Übersicht ---------- */
  const R = window.BOULE_RULES;
  $('ruleStand').textContent = 'Eigene Kurzfassung · ' + R.stand + '. Im Zweifel gilt der Originaltext.';
  $('ruleList').innerHTML = R.sections.map(s => `<details class="rule"><summary>${esc(s.title)}<span>${esc(s.arts)}</span></summary><dl>${
    s.items.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('')}</dl></details>`).join('');
  document.querySelectorAll('#ruleSeg button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('#ruleSeg button').forEach(x => x.classList.toggle('on', x === b));
    $('rOverview').classList.toggle('hide', b.dataset.v !== 'overview');
    $('rChat').classList.toggle('hide', b.dataset.v !== 'chat');
  }));

  /* ---------- Regeln: Chat ---------- */
  let chat = LS.get('chat', []);
  function renderChat(pending) {
    const log = $('chatLog');
    const items = chat.length ? chat : [{ role: 'assistant', content: 'Frag mich zu den offiziellen Pétanque-Regeln (FIPJP), z. B. zum Messen, zum Schweinchen oder zu Strafen.' }];
    log.innerHTML = items.map(m => `<div class="msg ${m.role === 'user' ? 'u' : 'a'}${m.err ? ' err' : ''}">${esc(m.content)}</div>`).join('') +
      (pending ? '<div class="msg a muted">…</div>' : '');
    $('chips').innerHTML = chat.length ? '' : R.quick.map(q => `<button>${esc(q)}</button>`).join('');
    log.lastElementChild && log.lastElementChild.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }
  $('chips').addEventListener('click', e => { if (e.target.tagName === 'BUTTON') send(e.target.textContent); });
  $('chatSend').addEventListener('click', () => send($('chatIn').value));
  $('chatIn').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send($('chatIn').value); } });
  $('chatClear').addEventListener('click', () => { chat = []; LS.set('chat', chat); renderChat(); });
  let busy = false;
  async function send(text) {
    text = (text || '').trim(); if (!text || busy) return;
    if (!S.worker) { alert('Bitte die Adresse des Regel-Chat-Workers in den Einstellungen eintragen.'); return; }
    chat.push({ role: 'user', content: text }); $('chatIn').value = ''; busy = true; renderChat(true);
    try {
      const r = await fetch(S.worker, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chat.filter(m => !m.err).map(({ role, content }) => ({ role, content })) }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.answer) throw new Error(d.error || 'Fehler ' + r.status);
      chat.push({ role: 'assistant', content: d.answer });
    } catch (e) {
      chat.push({ role: 'assistant', content: 'Keine Antwort: ' + e.message, err: true });
    }
    busy = false; LS.set('chat', chat.slice(-30)); renderChat();
  }
  renderChat();

  /* ---------- Offline ---------- */
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
