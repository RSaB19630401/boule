/* Boule-App – Messen, Spielstand, Regeln, Trainer (Platzhalter) */
(() => {
  'use strict';
  const OPENCV_URL = 'https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.10.0-release.1/dist/opencv.js';
  const $ = id => document.getElementById(id);
  let appReady = false; // wird am Ende gesetzt (Daten geladen)
  const LS = {
    get(k, d) { try { const v = localStorage.getItem('boule.' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('boule.' + k, JSON.stringify(v)); } catch { /* voll/privat */ } },
  };
  const DEFAULTS = { ball: 73, jack: 30, tie: 1.5, auto: true, minGames: 3, corr: true, focal: 26, worker: 'https://boule-chat.rsab1963.workers.dev' };
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
    if (t === 'spieler' && appReady) renderPlayers();
    if (t === 'trainer' && window.BouleTrainer) BouleTrainer.refresh();
    window.scrollTo(0, 0);
  }

  /* ---------- Einstellungen ---------- */
  $('btnSettings').addEventListener('click', () => {
    $('sBall').value = S.ball; $('sJack').value = S.jack; $('sTie').value = S.tie; $('sWorker').value = S.worker; $('sAuto').checked = S.auto; $('sMin').value = S.minGames; $('sCorr').checked = S.corr; $('sFocal').value = S.focal;
    $('dlgSettings').showModal();
  });
  $('sSave').addEventListener('click', () => {
    const num = (v, d, lo, hi) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) && n >= lo && n <= hi ? n : d; };
    S.ball = num($('sBall').value, S.ball, 60, 85);
    S.jack = num($('sJack').value, S.jack, 20, 40);
    S.tie = num($('sTie').value, S.tie, 0, 10);
    S.worker = $('sWorker').value.trim();
    S.auto = $('sAuto').checked;
    S.corr = $('sCorr').checked;
    S.focal = num($('sFocal').value, S.focal, 13, 80);
    S.minGames = Math.round(num($('sMin').value, S.minGames, 1, 50));
    LS.set('settings', S);
    if (M.balls) render();
    if (appReady) renderPlayers();
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
  let stream = null, tilt = null, ori = null, levelSince = 0, shooting = false;
  function onOrient(e) {
    if (e.beta == null) return;
    // Handy flach (Display oben, Kamera zum Boden): beta ≈ 0, gamma ≈ 0
    const b = e.beta, g = e.gamma;
    tilt = Math.sqrt(b * b + g * g); ori = { beta: b, gamma: g };
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
    const v = $('video');
    // Neigung nur verwenden, wenn im Hochformat aufgenommen wird (Sensorachsen = Bildachsen)
    const portrait = !screen.orientation || String(screen.orientation.type).startsWith('portrait');
    const capturedTilt = tilt, capturedOri = ori && portrait ? { ...ori } : null;
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
    analyse(c, capturedTilt, capturedOri);
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
  function setMView(v) {
    ['mIdle', 'mBusy', 'mResult'].forEach(id => $(id).classList.toggle('hide', id !== v));
    const ph = $('pendingHint');
    ph.classList.toggle('hide', !M.pending);
    if (M.pending) ph.innerHTML = `<b>Training:</b> ${esc(M.pending.label)} – ${M.pending.n} Kugel(n) messen. Nur die Kugeln dieses Spielers sollten liegen. <button class="x" id="pendCancel" style="float:right">Abbrechen</button>`;
  }
  document.addEventListener('click', e => { if (e.target.id === 'pendCancel') { M.pending = null; setMView('mIdle'); showTab('trainer'); } });

  async function analyse(canvas, capturedTilt, capturedOri) {
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
      Object.assign(M, { src: canvas, balls: r.balls, jack: r.jack, ballR: r.ballR, tilt: capturedTilt, ori: capturedOri || null, mode: 'view', zoom: false });
    } catch (e) {
      console.error(e); alert('Bilderkennung fehlgeschlagen.'); setMView('mIdle'); return;
    }
    setMode('view');
    setMView('mResult');
    render();
  }

  // Rangliste mit Höhen-/Neigungskorrektur (falls aktiv und plausibel), sonst einfache Maßstabsrechnung
  function ranking() {
    if (S.corr && M.jack && M.balls.length) {
      let o = M.ori;
      if (o && (Math.abs(o.beta) > 15 || Math.abs(o.gamma) > 15 || M.src.height < M.src.width)) o = null;
      const r = BouleDetect.rank3D(M.balls, M.jack, { W: M.src.width, H: M.src.height, focal35: S.focal, ballD: S.ball, jackD: S.jack, beta: o ? o.beta : 0, gamma: o ? o.gamma : 0 });
      if (r.info && r.info.heightMm > 250 && r.info.heightMm < 3000) return { ranked: r.ranked, info: { ...r.info, sensor: !!o } };
    }
    return { ranked: BouleDetect.rank(M.balls, M.jack, S.ball, S.jack), info: null };
  }

  const COL = ['#2f9e5b', '#2c5d8a', '#2c5d8a', '#2c5d8a', '#2c5d8a', '#2c5d8a'];
  function render() {
    const cvs = $('cv'), src = M.src; if (!src) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = cvs.parentElement.clientWidth;
    const { ranked, info: corrInfo } = ranking();
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
    const ttb = $('btnToTraining');
    ttb.classList.toggle('hide', !M.pending);
    if (M.pending) { ttb.textContent = `Ins Training übernehmen (${Math.min(M.pending.n, top.length)} von ${M.pending.n})`; ttb.disabled = !top.length; }
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
    if (corrInfo) notes.push(`Korrigiert für ${(corrInfo.heightMm / 1000).toLocaleString('de-DE', { maximumFractionDigits: 2 })} m Höhe${corrInfo.sensor ? ` und ${corrInfo.tilt.toFixed(1).replace('.', ',')}° Neigung` : ' (ohne Neigungsdaten)'}.`);
    else if (M.tilt != null && M.tilt > 6) notes.push(`Das Handy war ${M.tilt.toFixed(0)}° geneigt – Abstände können ungenau sein.`);
    if (M.ballR) notes.push('Fehlt eine Kugel oder ist eine falsch? Mit „+ Kugel" / „− Kugel" korrigieren.');
    $('resNotes').innerHTML = notes.map(n => `<div class="${/^(Fehlt|Korrigiert)/.test(n) ? 'muted' : 'note'}" style="margin:6px 2px">${esc(n)}</div>`).join('');
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
  $('btnToTraining').addEventListener('click', () => {
    if (!M.pending) return;
    const { ranked } = ranking();
    const p = M.pending; M.pending = null;
    p.cb(ranked.slice(0, p.n).map(r => r.mm));
  });
  $('btnZoom').addEventListener('click', () => { M.zoom = !M.zoom; render(); });
  $('btnAgain').addEventListener('click', () => {
    setMView('mIdle');
    if (M.mat) { M.mat.delete(); M.mat = null; }
    M.src = null; M.balls = null;
  });

  /* ---------- Daten: Spieler & Spiele (nur lokal) ---------- */
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  let players = LS.get('players', []);
  let games = LS.get('games', null);
  if (!games) { // Übernahme der bisherigen „Letzte Spiele“ (ohne Spielerzuordnung)
    games = LS.get('past', []).map(p => ({ id: uid(), date: p.date, form: p.form, target: 13,
      teams: [{ name: p.a, players: [] }, { name: p.b, players: [] }], score: [p.sa, p.sb] }));
    LS.set('games', games);
  }
  const savePlayers = () => LS.set('players', players);
  const saveGames = () => LS.set('games', games);
  const pById = id => players.find(p => p.id === id);
  const pName = id => (pById(id) || { name: '(gelöscht)' }).name;
  const initials = p => (p.short || p.name.split(/\s+/).map(w => w[0]).join('').slice(0, 3)).toUpperCase();
  const fmtDate = d => new Date(d).toLocaleDateString('de-DE');
  const pct = (w, g) => g ? Math.round(100 * w / g) + ' %' : '–';

  /* ---------- Spielstand ---------- */
  const FORMS = { tete: { label: 'Tête-à-tête', max: 3, size: 1 }, doublette: { label: 'Doublette', max: 6, size: 2 }, triplette: { label: 'Triplette', max: 6, size: 3 }, misch: { label: '2 gegen 3', max: 6, size: [2, 3] } };
  let G = LS.get('game', null);
  if (G && !G.teams) G.teams = [{ name: G.a, players: [] }, { name: G.b, players: [] }];
  let pickTeam = null;
  const sum = (g, t) => g.ends.filter(e => e.t === t).reduce((a, e) => a + e.p, 0);
  function saveG() { LS.set('game', G); }
  function renderGame() {
    const playing = !!G;
    $('gSetup').classList.toggle('hide', playing);
    $('gPlay').classList.toggle('hide', !playing);
    renderPast();
    if (!playing) { renderSetupChips(); return; }
    const a = sum(G, 0), b = sum(G, 1), winner = a >= G.target ? 0 : b >= G.target ? 1 : null;
    $('nA').textContent = G.teams[0].name; $('nB').textContent = G.teams[1].name; $('pA').textContent = a; $('pB').textContent = b;
    document.querySelectorAll('.team').forEach(el => {
      const t = +el.dataset.t;
      el.classList.toggle('sel', pickTeam === t && winner === null);
      el.classList.toggle('win', winner === t);
    });
    $('winBox').classList.toggle('hide', winner === null);
    $('pickHint').classList.toggle('hide', winner !== null || pickTeam !== null);
    $('picker').classList.toggle('hide', winner !== null || pickTeam === null);
    if (winner !== null) $('winText').textContent = `${G.teams[winner].name} gewinnt ${Math.max(a, b)}:${Math.min(a, b)}`;
    if (pickTeam !== null && winner === null) {
      const max = FORMS[G.form].max;
      $('picker').innerHTML = Array.from({ length: 6 }, (_, i) => `<button data-p="${i + 1}" ${i + 1 > max ? 'disabled' : ''}>${i + 1}</button>`).join('');
    }
    let ra = 0, rb = 0;
    $('gHist').innerHTML = G.ends.map((e, i) => {
      if (e.t === 0) ra += e.p; else rb += e.p;
      return `<li><span>${i + 1}. ${esc(G.teams[e.t].name)} +${e.p}</span><b>${ra}:${rb}</b></li>`;
    }).reverse().join('') || '<li class="muted">Noch keine Aufnahme.</li>';
  }
  const gameLi = g => `<li><span>${esc(g.teams[0].name)} – ${esc(g.teams[1].name)} <span class="muted">· ${esc(FORMS[g.form]?.label || '')} · ${fmtDate(g.date)}</span></span>
      <span style="white-space:nowrap;margin-left:10px"><b>${g.score[0]}:${g.score[1]}</b><button class="x" data-del="${g.id}" aria-label="Spiel löschen">×</button></span></li>`;
  function renderPast() {
    const list = [...games].sort((a, b) => b.date - a.date);
    $('gPastCard').classList.toggle('hide', !list.length || !!G);
    $('gPast').innerHTML = list.slice(0, 10).map(gameLi).join('');
  }
  document.addEventListener('click', e => { // Spiel löschen (Liste oder Spielerdetail)
    const id = e.target.dataset && e.target.dataset.del; if (!id) return;
    const g = games.find(x => x.id === id); if (!g) return;
    if (!confirm(`Spiel ${g.teams[0].name} – ${g.teams[1].name} (${g.score[0]}:${g.score[1]}) löschen?`)) return;
    games = games.filter(x => x.id !== id); saveGames(); renderPast(); renderPlayers();
  });

  // Spielerauswahl beim Spielstart
  const setup = { sel: [[], []], named: [false, false] };
  const nameInputs = [$('gA'), $('gB')];
  nameInputs.forEach((inp, t) => inp.addEventListener('input', () => { setup.named[t] = inp.value.trim() !== ''; }));
  // Spieler je Team; bei „2 gegen 3“ hat Team A zwei, Team B drei Spieler
  function teamSize(t = pickFor) { const z = FORMS[$('gForm').value].size; return Array.isArray(z) ? z[t] : z; }
  function renderSetupChips() {
    setup.sel = setup.sel.map((s, t) => s.filter(pById).slice(0, teamSize(t)));
    ['pcA', 'pcB'].forEach((id, t) => {
      const sel = setup.sel[t], size = teamSize(t);
      $(id).innerHTML = sel.map(pid => `<span class="pchip">${esc(pName(pid))}<button data-rm="${t}:${pid}" aria-label="entfernen">×</button></span>`).join('') +
        (sel.length < size ? `<button class="addp" data-add="${t}">+ Spieler (${sel.length}/${size})</button>` : '');
      if (!setup.named[t]) nameInputs[t].value = sel.length ? sel.map(pName).join(' & ') : (t ? 'Team B' : 'Team A');
    });
  }
  $('gForm').addEventListener('change', renderSetupChips);
  $('gSetup').addEventListener('click', e => {
    const d = e.target.dataset || {};
    if (d.rm) { const [t, pid] = d.rm.split(':'); setup.sel[+t] = setup.sel[+t].filter(x => x !== pid); renderSetupChips(); }
    if (d.add) openPicker(+d.add);
  });
  let pickFor = 0;
  function openPicker(t) {
    pickFor = t; $('pkSearch').value = '';
    $('pkTitle').textContent = `Spieler für Team ${t ? 'B' : 'A'} (max. ${teamSize()})`;
    renderPicker(); $('dlgPick').showModal();
  }
  function renderPicker() {
    const q = $('pkSearch').value.trim().toLowerCase(), other = setup.sel[1 - pickFor], mine = setup.sel[pickFor];
    const list = players.filter(p => p.active !== false && (!q || p.name.toLowerCase().includes(q))).sort((a, b) => a.name.localeCompare(b.name, 'de'));
    $('pkUl').innerHTML = list.map(p => `<li data-pid="${p.id}" class="${mine.includes(p.id) ? 'sel' : ''} ${other.includes(p.id) ? 'off' : ''}">
      <span class="av">${esc(initials(p))}</span><span class="grow">${esc(p.name)}</span>${other.includes(p.id) ? '<span class="muted">anderes Team</span>' : ''}</li>`).join('')
      || '<li class="muted" style="cursor:default">Noch keine Spieler – mit „+ Neu“ anlegen.</li>';
  }
  $('pkSearch').addEventListener('input', renderPicker);
  $('pkUl').addEventListener('click', e => {
    const li = e.target.closest('li[data-pid]'); if (!li || li.classList.contains('off')) return;
    const pid = li.dataset.pid, mine = setup.sel[pickFor];
    if (mine.includes(pid)) setup.sel[pickFor] = mine.filter(x => x !== pid);
    else if (mine.length < teamSize()) mine.push(pid);
    else if (navigator.vibrate) navigator.vibrate(60);
    renderPicker(); renderSetupChips();
    if (setup.sel[pickFor].length >= teamSize()) setTimeout(() => $('dlgPick').close(), 150);
  });
  $('pkDone').addEventListener('click', () => $('dlgPick').close());
  $('pkNew').addEventListener('click', () => openPlayerDlg(null, p => { if (setup.sel[pickFor].length < teamSize()) setup.sel[pickFor].push(p.id); renderPicker(); renderSetupChips(); }));

  $('gStart').addEventListener('click', () => {
    const teams = [0, 1].map(t => ({ name: nameInputs[t].value.trim() || (t ? 'Team B' : 'Team A'), players: [...setup.sel[t]] }));
    G = { id: uid(), form: $('gForm').value, target: +$('gTarget').value, teams, ends: [], date: Date.now() };
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
    games.push({ id: G.id, date: Date.now(), form: G.form, target: G.target, teams: G.teams, score: [sum(G, 0), sum(G, 1)], ends: G.ends });
    saveGames(); G.archived = true; saveG();
  }
  $('gUndo').addEventListener('click', () => {
    if (!G || !G.ends.length) return;
    if (G.archived) { games = games.filter(x => x.id !== G.id); saveGames(); G.archived = false; }
    G.ends.pop(); pickTeam = null; saveG(); renderGame();
  });
  $('gEnd').addEventListener('click', () => {
    if (!G) return;
    if (!G.archived && G.ends.length && !confirm('Spiel ohne Sieger beenden? Es wird nicht gespeichert.')) return;
    G = null; saveG(); renderGame();
  });
  $('gRematch').addEventListener('click', () => { G = { ...G, id: uid(), ends: [], archived: false, date: Date.now() }; saveG(); renderGame(); });
  $('gNew').addEventListener('click', () => {
    if (G) {
      $('gForm').value = G.form;
      setup.sel = G.teams.map(t => t.players.filter(pById));
      setup.named = G.teams.map(t => !t.players.length);
      G.teams.forEach((t, i) => { if (!t.players.length) nameInputs[i].value = t.name; });
    }
    G = null; saveG(); renderGame();
  });
  renderGame();

  /* ---------- Spieler & Statistik ---------- */
  function yearOptions(sel) {
    const ys = [...new Set(games.map(g => new Date(g.date).getFullYear()))].sort((a, b) => b - a);
    sel.innerHTML = '<option value="alle">Alle Jahre</option>' + ys.map(y => `<option>${y}</option>`).join('');
  }
  document.querySelectorAll('#plSeg button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('#plSeg button').forEach(x => x.classList.toggle('on', x === b));
    $('plRank').classList.toggle('hide', b.dataset.v !== 'rank');
    $('plList').classList.toggle('hide', b.dataset.v !== 'list');
  }));
  let detailId = null;
  function renderPlayers() {
    // Rangliste
    const keepY = $('rkYear').value; yearOptions($('rkYear')); if (keepY) $('rkYear').value = keepY;
    const f = { form: $('rkForm').value, year: $('rkYear').value || 'alle' };
    const rk = BouleStats.ranking(games, players, f, S.minGames);
    let divider = false;
    $('rkTable').innerHTML = rk.length ? '<tr><th>#</th><th>Spieler</th><th class="r">Sp.</th><th class="r">S–N</th><th class="r">Quote</th><th class="r">Diff</th></tr>' +
      rk.map((r, i) => {
        let pre = '';
        if (!r.ok && !divider) { divider = true; pre = `<tr><td colspan="6" class="muted" style="font-size:13px">unter ${S.minGames} Spielen</td></tr>`; }
        return pre + `<tr data-open="${r.p.id}" style="cursor:pointer;${r.ok ? '' : 'opacity:.6'}"><td>${r.ok ? i + 1 : ''}</td><td>${esc(r.p.name)}</td>
          <td class="r">${r.s.g}</td><td class="r">${r.s.w}–${r.s.g - r.s.w}</td><td class="r"><b>${pct(r.s.w, r.s.g)}</b></td><td class="r">${r.diff > 0 ? '+' : ''}${r.diff}</td></tr>`;
      }).join('') : '<tr><td class="muted">Noch keine Spiele mit Spielern aus der Liste.</td></tr>';
    $('rkNote').textContent = `Sortiert nach Siegquote, bei Gleichstand nach Punktdifferenz. Mindestens ${S.minGames} Spiele für einen Rang (⚙️).`;
    // Liste
    const q = $('plSearch').value.trim().toLowerCase();
    const list = players.filter(p => !q || p.name.toLowerCase().includes(q)).sort((a, b) => (b.active !== false) - (a.active !== false) || a.name.localeCompare(b.name, 'de'));
    $('plUl').innerHTML = list.map(p => {
      const s = BouleStats.playerStats(games, p.id);
      return `<li data-open="${p.id}" class="${p.active === false ? 'off' : ''}"><span class="av">${esc(initials(p))}</span>
        <span class="grow"><b>${esc(p.name)}</b><br><span class="muted">${s.g} Spiele · ${pct(s.w, s.g)}${p.active === false ? ' · inaktiv' : ''}</span></span>›</li>`;
    }).join('') || '<li class="muted" style="cursor:default">Noch keine Spieler. Mit „+ Spieler“ anlegen.</li>';
    if (detailId) renderDetail();
  }
  ['rkForm', 'rkYear'].forEach(id => $(id).addEventListener('change', renderPlayers));
  $('plSearch').addEventListener('input', renderPlayers);
  $('tab-spieler').addEventListener('click', e => {
    const row = e.target.closest('[data-open]'); if (!row || e.target.dataset.del) return;
    detailId = row.dataset.open; yearOptions($('pdYear')); $('pdForm').value = 'alle';
    $('plMain').classList.add('hide'); $('plDetail').classList.remove('hide'); renderDetail(); window.scrollTo(0, 0);
  });
  $('pdBack').addEventListener('click', () => { detailId = null; $('plDetail').classList.add('hide'); $('plMain').classList.remove('hide'); });
  ['pdForm', 'pdYear'].forEach(id => $(id).addEventListener('change', renderDetail));
  $('pdEdit').addEventListener('click', () => openPlayerDlg(pById(detailId), () => renderPlayers()));

  function sparkline(seq) {
    if (seq.length < 2) return '';
    const W = 300, H = 70; let w = 0;
    const pts = seq.map((s, i) => { if (s.won) w++; return [i / (seq.length - 1) * W, H - (w / (i + 1)) * H]; });
    return `<svg viewBox="-4 -4 ${W + 8} ${H + 8}" style="width:100%;height:80px"><line x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}" stroke="#d8cbb0" stroke-dasharray="4 4"/>
      <polyline fill="none" stroke="#2c5d8a" stroke-width="2.5" stroke-linejoin="round" points="${pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}"/></svg>
      <div class="muted" style="font-size:12px;display:flex;justify-content:space-between"><span>Siegquote im Verlauf</span><span>50 %-Linie gestrichelt</span></div>`;
  }
  function renderDetail() {
    const p = pById(detailId); if (!p) { $('pdBack').click(); return; }
    $('pdName').textContent = p.name + (p.active === false ? ' (inaktiv)' : '');
    const f = { form: $('pdForm').value, year: $('pdYear').value || 'alle' };
    const s = BouleStats.playerStats(games, p.id, f);
    const diff = s.pf - s.pa;
    const formRows = Object.keys(FORMS).filter(k => s.byForm[k]).map(k => { const o = s.byForm[k];
      return `<tr><td>${FORMS[k].label}</td><td class="r">${o.g}</td><td class="r">${o.w}–${o.g - o.w}</td><td class="r"><b>${pct(o.w, o.g)}</b></td><td class="r">${o.pf - o.pa > 0 ? '+' : ''}${o.pf - o.pa}</td></tr>`; }).join('');
    const rel = (arr, empty) => arr.slice(0, 3).map(o => `<tr><td>${esc(pName(o.id))}</td><td class="r">${o.g}</td><td class="r">${o.w}–${o.g - o.w}</td><td class="r"><b>${pct(o.w, o.g)}</b></td></tr>`).join('') || `<tr><td class="muted" colspan="4">${empty}</td></tr>`;
    const partners = BouleStats.topList(s.partners, 2, true), opps = BouleStats.topList(s.opponents, 2, false);
    const recentIds = s.seq.slice(-10).reverse().map(x => x.id);
    const recent = recentIds.map(id => games.find(g => g.id === id)).filter(Boolean);
    const hdr4 = '<tr><th>Name</th><th class="r">Sp.</th><th class="r">S–N</th><th class="r">Quote</th></tr>';
    $('pdBody').innerHTML = s.g ? `
      <div class="card"><div class="kpis">
        <div class="kpi"><b>${s.g}</b><span>Spiele</span></div>
        <div class="kpi"><b>${s.w}–${s.g - s.w}</b><span>Siege–Niederl.</span></div>
        <div class="kpi"><b>${pct(s.w, s.g)}</b><span>Siegquote</span></div>
        <div class="kpi"><b>${s.pf}</b><span>Punkte erzielt</span></div>
        <div class="kpi"><b>${s.pa}</b><span>Punkte kassiert</span></div>
        <div class="kpi"><b>${diff > 0 ? '+' : ''}${diff}</b><span>Differenz</span></div>
      </div></div>
      <div class="card"><h2>Verlauf</h2><div class="wl">${s.seq.slice(-15).map(x => `<i class="${x.won ? 'w' : 'l'}">${x.won ? 'S' : 'N'}</i>`).join('')}</div>
        <div class="muted" style="font-size:12px;margin:4px 0 8px">letzte ${Math.min(15, s.seq.length)} Spiele, neuestes rechts</div>${sparkline(s.seq)}</div>
      <div class="card"><h2>Je Spielform</h2><table class="st"><tr><th>Form</th><th class="r">Sp.</th><th class="r">S–N</th><th class="r">Quote</th><th class="r">Diff</th></tr>${formRows}</table></div>
      <div class="card"><h2>Beste Partner</h2><table class="st">${hdr4}${rel(partners, 'Erst ab 2 gemeinsamen Spielen.')}</table></div>
      <div class="card"><h2>Schwierigste Gegner</h2><table class="st">${hdr4}${rel(opps, 'Erst ab 2 Spielen gegeneinander.')}</table></div>
      <div class="card"><h2>Letzte Spiele</h2><ul class="hist">${recent.map(gameLi).join('')}</ul></div>`
      : '<div class="card muted">Noch keine Spiele in dieser Auswahl.</div>';
  }

  // Spieler anlegen / bearbeiten
  let dlgCb = null, dlgP = null;
  function openPlayerDlg(p, cb) {
    dlgP = p; dlgCb = cb;
    $('dpTitle').textContent = p ? 'Spieler bearbeiten' : 'Neuer Spieler';
    $('dpName').value = p ? p.name : ''; $('dpShort').value = p ? p.short || '' : '';
    $('dpLic').value = p ? p.licence || '' : ''; $('dpContact').value = p ? p.contact || '' : '';
    $('dpActive').checked = p ? p.active !== false : true;
    $('dpDelete').classList.toggle('hide', !p);
    $('dlgPlayer').showModal(); setTimeout(() => $('dpName').focus(), 50);
  }
  $('plNew').addEventListener('click', () => openPlayerDlg(null, () => renderPlayers()));
  $('dpSave').addEventListener('click', e => {
    const name = $('dpName').value.trim();
    if (!name) { e.preventDefault(); $('dpName').focus(); return; }
    if (players.some(x => x.name.toLowerCase() === name.toLowerCase() && x !== dlgP) && !confirm(`„${name}“ gibt es schon. Trotzdem speichern?`)) { e.preventDefault(); return; }
    const data = { name, short: $('dpShort').value.trim(), licence: $('dpLic').value.trim(), contact: $('dpContact').value.trim(), active: $('dpActive').checked };
    let p = dlgP;
    if (p) Object.assign(p, data); else { p = { id: uid(), created: Date.now(), ...data }; players.push(p); }
    savePlayers(); if (dlgCb) dlgCb(p);
  });
  $('dpDelete').addEventListener('click', e => {
    const p = dlgP; if (!p) return;
    const n = games.filter(g => g.teams.some(t => t.players.includes(p.id))).length;
    if (!confirm(n ? `${p.name} hat ${n} Spiele. Löschen entfernt den Namen aus der Statistik (Spiele bleiben als „gelöscht“). Tipp: stattdessen „aktiv“ abwählen. Wirklich löschen?` : `${p.name} löschen?`)) { e.preventDefault(); return; }
    players = players.filter(x => x !== p); savePlayers();
    if (detailId === p.id) $('pdBack').click();
    renderPlayers(); renderSetupChips();
  });

  // Export / Import
  $('btnExport').addEventListener('click', () => {
    const data = { app: 'boule', version: 2, exported: new Date().toISOString(), players, games, trainings: window.BouleTrainer ? BouleTrainer.all() : [] };
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `boule-daten-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  $('impFile').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (d.app !== 'boule' || !Array.isArray(d.players) || !Array.isArray(d.games)) throw new Error('Keine Boule-Datei');
      // Zusammenführen über die IDs – vorhandene Daten gehen nicht verloren
      const pIds = new Set(players.map(p => p.id)), gIds = new Set(games.map(g => g.id));
      const np = d.players.filter(p => p && p.id && p.name && !pIds.has(p.id));
      const ng = d.games.filter(g => g && g.id && g.teams && g.score && !gIds.has(g.id));
      players = players.concat(np); games = games.concat(ng); savePlayers(); saveGames();
      const nt = Array.isArray(d.trainings) && window.BouleTrainer ? BouleTrainer.merge(d.trainings) : 0;
      alert(`Import fertig: ${np.length} neue Spieler, ${ng.length} neue Spiele, ${nt} neue Trainingseinheiten (bereits vorhandene wurden übersprungen).`);
      renderPlayers(); renderPast();
    } catch (err) { alert('Import fehlgeschlagen: ' + err.message); }
  });
  // Schnittstelle für den Trainer (trainer.js)
  window.BouleApp = {
    LS, esc, showTab, players: () => players, pName,
    // Kamera-Messung für das Training: liefert die n nächsten Abstände (mm) an cb
    measure(n, label, cb) { M.pending = { n, label, cb }; $('btnAgain').click(); showTab('messen'); },
  };
  appReady = true;
  renderPlayers();
  showTab(LS.get('tab', 'messen')); // erst jetzt: alle Variablen sind initialisiert

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
