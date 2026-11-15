/* Boule-Erkennung – funktioniert im Browser (OpenCV.js) und in Node (Tests).
 * detectAuto(cv, rgbaMat) -> { balls:[{x,y,r,score}], jack:{x,y,r}|null, ballR }  (Originalkoordinaten)
 * findNear(cv, rgbaMat, x, y, ballR) -> eine Kugel nahe der Tipp-Position
 * rank(balls, jack, kugelDurchmesserMm, schweinchenDurchmesserMm) -> nach Abstand sortiert
 * Grenzen: harter Sonnenschatten verschiebt Kreismitten; Kugeln müssen vollständig im Bild sein.
 */
(function (root) {
  function hough(cv, gray, minR, maxR, minDist, alt, p2) {
    const c = new cv.Mat();
    if (alt) cv.HoughCircles(gray, c, cv.HOUGH_GRADIENT_ALT, 1.5, minDist, 300, p2, Math.round(minR), Math.round(maxR));
    else cv.HoughCircles(gray, c, cv.HOUGH_GRADIENT, 1.2, minDist, 120, p2, Math.round(minR), Math.round(maxR));
    const out = [];
    for (let i = 0; i < c.cols; i++) out.push({ x: c.data32F[i * 3], y: c.data32F[i * 3 + 1], r: c.data32F[i * 3 + 2] });
    c.delete();
    return out;
  }
  function median(a) { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; }

  // Mittlere Farbsättigung und Helligkeit in einem Kreis (für Schweinchen-Wahl)
  function colorStats(hsv, x, y, r) {
    let s = 0, n = 0; const rr = r * 0.7;
    for (let dy = -rr; dy <= rr; dy += 1) for (let dx = -rr; dx <= rr; dx += 1) {
      if (dx * dx + dy * dy > rr * rr) continue;
      const px = Math.round(x + dx), py = Math.round(y + dy);
      if (px < 0 || py < 0 || px >= hsv.cols || py >= hsv.rows) continue;
      const p = (py * hsv.cols + px) * 3; s += hsv.data[p + 1]; n++;
    }
    return n ? s / n : 0;
  }

  // Kreis verfeinern: radiale Kantenprofile + robuster Kreis-Fit (reduziert Schatteneinfluss)
  function refine(gray, c) {
    const W = gray.cols, H = gray.rows, d = gray.data, pts = [];
    const N = 72;
    for (let k = 0; k < N; k++) {
      const a = 2 * Math.PI * k / N, ca = Math.cos(a), sa = Math.sin(a);
      let best = 0, br = -1, prev = null;
      for (let rr = c.r * 0.7; rr <= c.r * 1.3; rr += 0.5) {
        const x = Math.round(c.x + ca * rr), y = Math.round(c.y + sa * rr);
        if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) { br = -1; break; }
        const v = d[y * W + x];
        if (prev !== null) { const g = Math.abs(v - prev); if (g > best) { best = g; br = rr; } }
        prev = v;
      }
      if (br > 0) pts.push({ x: c.x + ca * br, y: c.y + sa * br });
    }
    if (pts.length < N / 3) return c;
    let cur = pts, fit = c;
    for (let it = 0; it < 4; it++) {
      fit = kasa(cur) || fit;
      const res = cur.map(p => Math.abs(Math.hypot(p.x - fit.x, p.y - fit.y) - fit.r));
      const thr = median(res) * 2 + 0.5;
      const nxt = cur.filter((p, i) => res[i] <= thr);
      if (nxt.length < 12 || nxt.length === cur.length) break;
      cur = nxt;
    }
    if (Math.hypot(fit.x - c.x, fit.y - c.y) > c.r * 0.3 || Math.abs(fit.r - c.r) > c.r * 0.25) return c;
    return { x: fit.x, y: fit.y, r: fit.r };
  }
  function kasa(p) {
    let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0, sz = 0; const n = p.length;
    for (const q of p) { const z = q.x * q.x + q.y * q.y; sx += q.x; sy += q.y; sxx += q.x * q.x; syy += q.y * q.y; sxy += q.x * q.y; sxz += q.x * z; syz += q.y * z; sz += z; }
    const M = [[sxx, sxy, sx, sxz], [sxy, syy, sy, syz], [sx, sy, n, sz]];
    for (let i = 0; i < 3; i++) {
      let m = i; for (let j = i + 1; j < 3; j++) if (Math.abs(M[j][i]) > Math.abs(M[m][i])) m = j;
      [M[i], M[m]] = [M[m], M[i]];
      if (Math.abs(M[i][i]) < 1e-9) return null;
      for (let j = 0; j < 3; j++) if (j !== i) { const f = M[j][i] / M[i][i]; for (let k = i; k < 4; k++) M[j][k] -= f * M[i][k]; }
    }
    const A = M[0][3] / M[0][0], B = M[1][3] / M[1][1], C = M[2][3] / M[2][2];
    const x = A / 2, y = B / 2, r = Math.sqrt(C + x * x + y * y);
    return isFinite(r) ? { x, y, r } : null;
  }

  // Kantenunterstützung entlang des Kreisrands (0..1): Anteil der Richtungen mit deutlichem Hell-Dunkel-Sprung
  function edgeSupport(img, c, T) {
    const W = img.cols, H = img.rows, d = img.data, N = 48; let hit = 0, tot = 0;
    for (let k = 0; k < N; k++) {
      const a = 2 * Math.PI * k / N, ca = Math.cos(a), sa = Math.sin(a);
      const xi = Math.round(c.x + ca * c.r * 0.72), yi = Math.round(c.y + sa * c.r * 0.72);
      const xo = Math.round(c.x + ca * c.r * 1.28), yo = Math.round(c.y + sa * c.r * 1.28);
      if (xi < 0 || yi < 0 || xo < 0 || yo < 0 || xi >= W || xo >= W || yi >= H || yo >= H) continue;
      tot++; if (Math.abs(d[yi * W + xi] - d[yo * W + xo]) > T) hit++;
    }
    return tot >= N / 2 ? hit / tot : 0;
  }
  // Rauschpegel des Untergrunds: typische Helligkeitsdifferenz zweier Punkte im Abstand dist
  function noiseLevel(img, dist) {
    const W = img.cols, H = img.rows, d = img.data, v = [];
    let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let i = 0; i < 2000; i++) {
      const x = Math.floor(rnd() * (W - dist - 1)), y = Math.floor(rnd() * H);
      v.push(Math.abs(d[y * W + x] - d[y * W + x + Math.round(dist)]));
    }
    v.sort((a, b) => a - b); return v[Math.floor(v.length * 0.8)];
  }
  // Kandidaten sammeln, bewerten, überlappende unterdrücken
  function scoredCircles(cv, gray, minR, maxR, minScore) {
    const cands = [];
    const R = (minR + maxR) / 2;
    const ks = KS(R);
    for (const k of ks) {
      const b = new cv.Mat(); cv.medianBlur(gray, b, k);
      const T = Math.max(12, noiseLevel(b, (minR + maxR) / 2));
      const list = hough(cv, b, minR, maxR, minR * 0.8, false, Math.max(8, minR * 0.7));
      for (const c of list.slice(0, 400)) { c.score = edgeSupport(b, c, T); if (c.score >= minScore) cands.push(c); }
      b.delete();
    }
    cands.sort((a, b) => b.score - a.score);
    const keep = [];
    for (const c of cands) if (!keep.some(k => Math.hypot(k.x - c.x, k.y - c.y) < (k.r + c.r) * 0.8)) keep.push(c);
    return keep;
  }

  // Glättungsstufen relativ zur Kugelgröße (unterdrücken Kies/Sand, erhalten den Kugelrand)
  let KS = R => [Math.max(3, odd(R * 0.2)), Math.max(5, odd(R * 0.35)), Math.min(15, Math.max(7, odd(R * 0.55)))];
  function odd(n) { n = Math.round(n); return n % 2 ? n : n + 1; }

  // Schweinchen über Farbe: farbige/hölzerne Kugeln heben sich vom grauen Stahl ab
  function jackByColor(cv, hsv, ballR, balls) {
    const ch = new cv.MatVector(); cv.split(hsv, ch);
    const sat = ch.get(1), mask = new cv.Mat();
    cv.threshold(sat, mask, 80, 255, cv.THRESH_BINARY);
    const k = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3));
    cv.morphologyEx(mask, mask, cv.MORPH_OPEN, k);
    const contours = new cv.MatVector(), hier = new cv.Mat();
    cv.findContours(mask, contours, hier, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    const expA = Math.PI * Math.pow(ballR * 0.41, 2);
    let best = null;
    for (let i = 0; i < contours.size(); i++) {
      const c = contours.get(i); const a = cv.contourArea(c);
      if (a < expA * 0.35 || a > expA * 2.8) { c.delete(); continue; }
      const p = cv.arcLength(c, true); const circ = 4 * Math.PI * a / (p * p);
      const e = cv.minEnclosingCircle(c); c.delete();
      if (circ < 0.55) continue;
      if (balls.some(b => Math.hypot(b.x - e.center.x, b.y - e.center.y) < b.r)) continue;
      const score = circ - Math.abs(Math.log(a / expA)) * 0.3;
      if (!best || score > best.score) best = { x: e.center.x, y: e.center.y, r: Math.sqrt(a / Math.PI), score };
    }
    ch.delete(); sat.delete(); mask.delete(); k.delete(); contours.delete(); hier.delete();
    return best;
  }

  function detectBoules(cv, src, opts = {}) {
    const W = src.cols, H = src.rows, S = Math.min(W, H);
    const gray = new cv.Mat(), blur = new cv.Mat(), rgb = new cv.Mat(), hsv = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB);
    cv.cvtColor(rgb, hsv, cv.COLOR_RGB2HSV);
    const minScore = opts.minScore || 0.6;

    // 1) Kugelgröße schätzen: gut bewertete Kreise, größte Gruppe ähnlicher Radien
    let ballR = opts.ballRadiusPx || 0;
    if (!ballR) {
      const wide = scoredCircles(cv, gray, S * 0.012, S * 0.12, 0.7);
      let best = 0;
      for (const c of wide) {
        const grp = wide.filter(o => Math.abs(o.r - c.r) <= c.r * 0.15);
        const val = grp.reduce((a, g) => a + g.score, 0);
        if (val > best) { best = val; ballR = median(grp.map(g => g.r)); }
      }
    }
    let balls = [], jack = null;
    if (ballR > 0) {
      // 2) Kugeln mit bekannter Größe
      balls = scoredCircles(cv, gray, ballR * 0.85, ballR * 1.18, minScore);
      if (opts.refine) {
        cv.GaussianBlur(gray, blur, new cv.Size(3, 3), 0);
        balls = balls.map(b => Object.assign(refine(blur, b), { score: b.score }));
      }
      // 3) Schweinchen (30 mm ≈ 0,4 × Kugelradius): erst über Farbe, dann über Form
      jack = jackByColor(cv, hsv, ballR, balls);
      if (!jack) {
        const small = scoredCircles(cv, gray, ballR * 0.3, ballR * 0.58, 0.5)
          .filter(j => !balls.some(b => Math.hypot(b.x - j.x, b.y - j.y) < b.r * 1.05));
        small.forEach(j => { j.sat = colorStats(hsv, j.x, j.y, j.r); });
        small.sort((a, b) => b.sat - a.sat);
        if (small.length && small[0].sat > 60) jack = { x: small[0].x, y: small[0].y, r: small[0].r };
      }
    }
    gray.delete(); blur.delete(); rgb.delete(); hsv.delete();
    return { balls, jack, ballR };
  }

  // Einzelne Kugel nahe einer Tipp-Position suchen (für manuelles Ergänzen)
  function findNear(cv, src, x, y, ballR) {
    const S = Math.round(ballR * 4), x0 = Math.max(0, Math.round(x - S / 2)), y0 = Math.max(0, Math.round(y - S / 2));
    const w = Math.min(S, src.cols - x0), h = Math.min(S, src.rows - y0);
    const roi = src.roi(new cv.Rect(x0, y0, w, h)); const g = new cv.Mat();
    cv.cvtColor(roi, g, cv.COLOR_RGBA2GRAY); roi.delete();
    const c = scoredCircles(cv, g, ballR * 0.85, ballR * 1.18, 0.3)
      .map(c => ({ x: c.x + x0, y: c.y + y0, r: c.r, score: c.score }))
      .filter(c => Math.hypot(c.x - x, c.y - y) < ballR);
    g.delete();
    return c.length ? c[0] : { x, y, r: ballR, score: 0 };
  }

  // Mehrstufig: grob bei 1000 px, bei kleinen Kugeln feiner nachrechnen. Ergebnis in Originalkoordinaten.
  function detectAuto(cv, full, opts = {}) {
    const L = Math.max(full.cols, full.rows);
    const run = (target, o) => {
      const s = Math.min(1, target / L); const m = new cv.Mat();
      cv.resize(full, m, new cv.Size(Math.round(full.cols * s), Math.round(full.rows * s)), 0, 0, cv.INTER_AREA);
      const r = detectBoules(cv, m, o); m.delete();
      if (!r.ballR) return { balls: [], jack: null, ballR: 0, procR: 0 };
      const sc = c => c && ({ x: c.x / s, y: c.y / s, r: c.r / s });
      return { balls: r.balls.map(sc), jack: sc(r.jack), ballR: r.ballR / s, procR: r.ballR };
    };
    let r = run(1000, opts);
    if (r.procR > 0 && r.procR < 24 && L > 1000) {
      const target = Math.min(2400, L, 1000 * 28 / r.procR);
      const s2 = Math.min(1, target / L);
      r = run(target, { ...opts, ballRadiusPx: r.ballR * s2 });
    }
    return r;
  }

  // Abstände: Kante Kugel zu Kante Schweinchen in mm (Maßstab über den bekannten Kugeldurchmesser)
  function rank(balls, jack, ballDiameterMm, jackDiameterMm) {
    if (!jack || !balls.length) return [];
    const rPx = median(balls.map(b => b.r));
    const mmPerPx = (ballDiameterMm / 2) / rPx;
    return balls.map((b, i) => {
      const dPx = Math.hypot(b.x - jack.x, b.y - jack.y);
      const mm = dPx * mmPerPx - ballDiameterMm / 2 - jackDiameterMm / 2;
      return { i, mm: Math.max(0, mm), x: b.x, y: b.y, r: b.r };
    }).sort((a, b) => a.mm - b.mm);
  }

  const api = { setKS: f => { KS = f; }, detectBoules, detectAuto, findNear, rank, median };
  if (typeof module !== 'undefined') module.exports = api; else root.BouleDetect = api;
})(typeof window !== 'undefined' ? window : globalThis);
