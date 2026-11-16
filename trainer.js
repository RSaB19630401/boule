/* Boule-Trainer: Übungskatalog, geführte Einheiten (einzeln oder Gruppe), Auswertung je Spieler.
 * Braucht window.BouleApp (aus app.js): players(), pName(id), showTab(t), measure(n, cb), LS, esc
 */
(() => {
  'use strict';
  const A = window.BouleApp, $ = id => document.getElementById(id), esc = A.esc;
  const GAST = 'gast';

  /* ---------- Ergebnisarten ---------- */
  const ZONES = [ // Legen: Abstand Kugelkante – Schweinchen
    { k: 'z10', label: '≤ 10 cm', pts: 3, cls: 'z1' },
    { k: 'z30', label: '10–30 cm', pts: 2, cls: 'z2' },
    { k: 'z50', label: '30–50 cm', pts: 1, cls: 'z3' },
    { k: 'zx', label: '> 50 cm', pts: 0, cls: 'z4' },
  ];
  const zoneOf = mm => mm <= 100 ? 'z10' : mm <= 300 ? 'z30' : mm <= 500 ? 'z50' : 'zx';
  const SHOT = [
    { k: 'carreau', label: 'Carreau', pts: 2, cls: 'z1', hint: 'Treffer, eigene Kugel bleibt am Platz' },
    { k: 'treffer', label: 'Treffer', pts: 1, cls: 'z2', hint: 'Kugel getroffen' },
    { k: 'fehl', label: 'Fehlschuss', pts: 0, cls: 'z4', hint: 'nicht getroffen' },
  ];
  const SHOT_JACK = [ // Kugel direkt am Schweinchen wegschießen
    { k: 'sauber', label: 'Treffer, Schweinchen liegt', pts: 2, cls: 'z1' },
    { k: 'bewegt', label: 'Treffer, Schweinchen bewegt', pts: 1, cls: 'z2' },
    { k: 'fehl', label: 'Fehlschuss', pts: 0, cls: 'z4' },
  ];
  const HIT = [{ k: 'treffer', label: 'Treffer', pts: 1, cls: 'z1' }, { k: 'fehl', label: 'Fehlschuss', pts: 0, cls: 'z4' }];
  const PREC = [
    { k: 'p5', label: '5', pts: 5, cls: 'z1', hint: 'Treffer, Ziel raus, Schusskugel bleibt im Kreis' },
    { k: 'p3', label: '3', pts: 3, cls: 'z2', hint: 'Treffer, Ziel und Schusskugel raus' },
    { k: 'p1', label: '1', pts: 1, cls: 'z3', hint: 'Treffer, Ziel bleibt im Kreis – oder Hindernis berührt, bleibt im Kreis' },
    { k: 'p0', label: '0', pts: 0, cls: 'z4', hint: 'Fehlschuss oder Ziel und Hindernis raus' },
  ];
  const D4 = [6, 7, 8, 9];
  const blocks = (dists, n, extra = {}) => dists.map(d => ({ dist: d, n, label: `${d} m`, ...extra }));

  /* ---------- Übungskatalog ---------- */
  const PREC_TASKS = [
    { t: 'Aufgabe 1 – Kugel allein', setup: 'Treffkugel in der Mitte des Zielkreises (1 m), kein Hindernis.' },
    { t: 'Aufgabe 2 – Schweinchen davor', setup: 'Schweinchen als Hindernis vor der Treffkugel, 10 cm lichter Abstand.' },
    { t: 'Aufgabe 3 – Kugel zwischen Hindernissen', setup: 'Treffkugel zwischen dunklen Hinderniskugeln, 3 cm lichter Abstand.' },
    { t: 'Aufgabe 4 – Kugel hinter Hindernis', setup: 'Hinderniskugel vor der Treffkugel, 10 cm lichter Abstand.' },
    { t: 'Aufgabe 5 – Schweinchen', setup: 'Schweinchen allein, 20 cm hinter dem vorderen Rand des Zielkreises.' },
  ];
  const EX = [
    { id: 'L1', cat: 'legen', title: 'Distanzleiter', mode: 'zones', short: 'Je 3 Kugeln auf 6, 7, 8, 9 und 10 m',
      howto: ['Schweinchen auf die Distanz legen (Abstand ab Kreisrand).', 'Jeder Spieler legt 3 Kugeln, dann Zone antippen oder per Kamera messen.', 'Bei Gruppen: nur die Kugeln des aktuellen Spielers liegen lassen, dann wegräumen.'],
      make: () => blocks([6, 7, 8, 9, 10], 3) },
    { id: 'L2', cat: 'legen', title: 'Zufallsdistanz', mode: 'zones', short: '4 Runden à 3 Kugeln, Distanz wird zufällig zwischen 6 und 10 m vorgegeben',
      howto: ['Die App nennt je Runde eine Distanz – wie im Spiel, wo das Schweinchen überall liegen kann.', 'Zone antippen oder per Kamera messen.'],
      make: () => Array.from({ length: 4 }, () => { const d = 6 + Math.round(Math.random() * 8) / 2; return { dist: d, n: 3, label: `${String(d).replace('.', ',')} m` }; }) },
    { id: 'L3', cat: 'legen', title: 'Kurz – lang', mode: 'zones', short: 'Abwechselnd 6 und 10 m, je 2 Kugeln, 4 Runden',
      howto: ['Trainiert das Umstellen der Wurfweite.', 'Schweinchen nach jeder Runde umlegen.'],
      make: () => [6, 10, 6, 10].map(d => ({ dist: d, n: 2, label: `${d} m` })) },
    { id: 'S1', cat: 'schiessen', title: 'Trefferserie', mode: 'shot', short: 'Je 5 Schüsse auf eine freie Kugel aus 6, 7, 8 und 9 m',
      howto: ['Zielkugel frei hinlegen.', 'Nach jedem Schuss Ergebnis antippen.', 'Carreau: die eigene Kugel bleibt (fast) am Platz der getroffenen.'],
      make: () => blocks(D4, 5) },
    { id: 'S2', cat: 'schiessen', title: 'Kugel am Schweinchen', mode: 'shotjack', short: '10 Schüsse aus 7 m auf eine Kugel, die direkt am Schweinchen liegt',
      howto: ['Zielkugel berührt das Schweinchen (davor).', 'Ziel: Kugel weg, Schweinchen bleibt liegen.'],
      make: () => [{ dist: 7, n: 5, label: '7 m' }, { dist: 7, n: 5, label: '7 m' }] },
    { id: 'S3', cat: 'schiessen', title: 'Schweinchen schießen', mode: 'hit', short: 'Je 5 Schüsse auf das Schweinchen aus 6 und 8 m',
      howto: ['Für die Situation „Aufnahme retten“: Schweinchen ins Aus schießen.', 'Treffer zählt, wenn das Schweinchen getroffen wurde.'],
      make: () => blocks([6, 8], 5) },
    { id: 'P1', cat: 'praezision', title: 'Präzisionsschießen (komplett)', mode: 'prec', short: '5 Aufgaben × 6, 7, 8, 9 m = 20 Schüsse, max. 100 Punkte',
      howto: ['Zielkreis 1 m; Wurfkreise 50 cm, vordere Ränder 6–9 m vom vorderen Rand des Zielkreises.', 'Treffkugeln liegen in der Mitte des Zielkreises.', 'Im Wettkampf: 15 Minuten für alle 5 Aufgaben; gültig nur, wenn der Aufschlag im Zielkreis liegt.', 'Vereinfachte Wertung 5/3/1/0 – Sonderfälle siehe DPV-Richtlinie DM Tireur.'],
      make: () => PREC_TASKS.flatMap((t, i) => D4.map(d => ({ dist: d, n: 1, label: `A${i + 1} · ${d} m`, task: i }))) },
    { id: 'P2', cat: 'praezision', title: 'Präzisionsschießen kurz (6 m)', mode: 'prec', short: 'Alle 5 Aufgaben je einmal aus 6 m – wie im K.-o.-Duell',
      howto: ['Format der Duelle ab dem Viertelfinale: je ein Schuss pro Aufgabe aus 6 m.', 'Max. 25 Punkte.'],
      make: () => PREC_TASKS.map((t, i) => ({ dist: 6, n: 1, label: `A${i + 1} · 6 m`, task: i })) },
    { id: 'Q1', cat: 'situation', title: 'Spielsituationen', mode: 'quiz', short: 'Was spielst du hier? Taktik-Aufgaben mit Erklärung',
      howto: ['Lage ansehen, Antwort wählen, Erklärung lesen.', 'Taktik ist Erfahrungssache: Die Antworten sind Empfehlungen, keine Regeln.'],
      make: () => SIT.map((s, i) => ({ n: 1, label: `Situation ${i + 1}`, sit: i })) },
  ];
  const CATS = [
    { k: 'legen', label: 'Legen', icon: '◎' }, { k: 'schiessen', label: 'Schießen', icon: '✕' },
    { k: 'praezision', label: 'Präzisionsschießen', icon: '◉' }, { k: 'situation', label: 'Spielsituationen', icon: '?' },
  ];
  const OUT = { zones: ZONES, shot: SHOT, shotjack: SHOT_JACK, hit: HIT, prec: PREC };

  /* ---------- Spielsituationen (Koordinaten in cm, Schweinchen bei 0/0, Kreis unten) ---------- */
  const SIT = [
    { title: 'Gegner liegt am Schweinchen', ours: [[-30, 35]], theirs: [[3, 6]], hand: [3, 2],
      q: 'Du bist dran. Legen oder Schießen?', a: [
        ['Legen', false, 'Eine Kugel 3 cm am Schweinchen zu überbieten gelingt selten. Du würdest eher eine Kugel verschenken.'],
        ['Schießen', true, 'Die gegnerische Kugel liegt praktisch perfekt. Mit 3 gegen 2 Kugeln kannst du dir einen Schuss leisten – im besten Fall bleibt deine Kugel liegen (Carreau).'],
      ] },
    { title: 'Gegner hat keine Kugeln mehr', ours: [[35, 30]], theirs: [[-12, 15]], hand: [2, 0],
      q: 'Der Gegner liegt mit 20 cm, hat aber keine Kugel mehr. Was spielst du?', a: [
        ['Ruhig legen', true, 'Jetzt hast du alle Zeit: Jede Kugel, die besser als 20 cm liegt, ist ein Punkt. Schießen bringt dir höchstens einen Punkt – Legen bis zu zwei.'],
        ['Schießen', false, 'Möglich, aber unnötig riskant: Bei einem Fehlschuss verschenkst du die Chance auf zwei Punkte.'],
      ] },
    { title: 'Früh in der Aufnahme', ours: [], theirs: [[20, 18]], hand: [3, 2],
      q: 'Der Gegner hat mit der ersten Kugel 27 cm gelegt. Deine erste Kugel?', a: [
        ['Legen', true, '27 cm ist gut, aber schlagbar. Ein guter Leger holt den Punkt zurück, ohne den Kugelvorteil zu verspielen. Schießen lohnt erst bei sehr guten Kugeln.'],
        ['Schießen', false, 'Auf eine mittelmäßige Kugel zu schießen kostet oft eine Kugel ohne Not. Der Gegner kann danach in Ruhe neu legen.'],
      ] },
    { title: 'Drei Punkte drohen', ours: [], theirs: [[-6, 8], [8, -5], [2, 14]], hand: [1, 0], edge: true,
      q: 'Der Gegner liegt mit 3 Kugeln, hat keine mehr. Du hast die letzte Kugel, das Schweinchen liegt 30 cm vor der Auslinie.', a: [
        ['Legen', false, 'Selbst ein perfekter Leger rettet höchstens Punkte, wenn er besser liegt als alle drei – sehr unwahrscheinlich.'],
        ['Eine Kugel wegschießen', false, 'Dann bekommt der Gegner immer noch 2 Punkte.'],
        ['Schweinchen ins Aus schießen', true, 'Verlässt das Schweinchen das Spielfeld, ist es tot. Da danach kein Team mehr Kugeln hat, ist die Aufnahme ungültig (Art. 14) – die 3 Punkte sind gerettet.'],
      ] },
    { title: 'Matchball', ours: [[40, 45]], theirs: [[-25, 35]], hand: [1, 3], score: '12 : 6',
      q: 'Ihr führt 12:6. Der Gegner liegt mit 43 cm, du hast deine letzte Kugel, der Gegner noch drei.', a: [
        ['Legen', true, 'Ein sicherer Leger unter 43 cm holt den Punkt – und der Gegner muss dann mit seinen drei Kugeln reagieren. Mit 12 Punkten reicht dir jeder einzelne Punkt zum Sieg.'],
        ['Schießen', false, 'Selbst ein Treffer nimmt nur eine mittelmäßige Kugel weg; der Gegner hat danach drei Kugeln, um den Punkt zu holen.'],
      ] },
    { title: 'Zwei gegnerische Kugeln liegen', ours: [[30, 25]], theirs: [[-4, 6], [7, -3]], hand: [3, 1],
      q: 'Der Gegner hält zwei Punkte (7 und 8 cm), hat noch eine Kugel. Du hast drei.', a: [
        ['Legen', false, 'Du müsstest unter 7 cm legen, und der Gegner hat noch eine Kugel zum Antworten.'],
        ['Schießen', true, 'Schießen räumt eine der sehr guten Kugeln ab. Mit 3 gegen 1 Kugel hast du danach genug Kugeln, um nachzulegen.'],
      ] },
    { title: 'Letzte Kugel gegen zwei Punkte', ours: [[22, 15]], theirs: [[-5, 6], [9, 6]], hand: [1, 0],
      q: 'Der Gegner hält zwei Punkte (8 und 11 cm) und hat keine Kugel mehr. Du hast die letzte.', a: [
        ['Legen', true, 'Nur ein Leger kann dir selbst einen Punkt bringen (unter 8 cm), und jeder Leger unter 11 cm nimmt dem Gegner einen Punkt.'],
        ['Schießen', false, 'Selbst ein Treffer lässt dem Gegner meist einen Punkt; einen eigenen Punkt gibt es nur mit einem perfekten Carreau.'],
      ] },
    { title: 'Tête-à-tête, erste Kugel', ours: [], theirs: [[45, 40]], hand: [3, 2],
      q: 'Im Tête-à-tête hat dein Gegner mit der ersten Kugel 60 cm gelegt.', a: [
        ['Legen', true, 'Eine 60-cm-Kugel ist keine Bedrohung. Lege den Punkt – dann muss der Gegner Kugeln investieren.'],
        ['Schießen', false, 'Du würdest eine Kugel für eine schlechte gegnerische Kugel verbrauchen.'],
      ] },
  ];

  /* ---------- Speicher ---------- */
  let trainings = A.LS.get('trainings', []);
  let S = A.LS.get('tsession', null);
  const saveT = () => A.LS.set('trainings', trainings);
  const saveS = () => A.LS.set('tsession', S);
  const exById = id => EX.find(e => e.id === id);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pname = id => id === GAST ? 'Gast' : A.pName(id);
  const cm = mm => (mm / 10).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' cm';

  /* ---------- Ansichten ---------- */
  const root = $('trainRoot');
  let view = S ? 'run' : 'home', setupEx = null, setupSel = [], statP = null, statCat = 'legen';
  function show(v) { view = v; render(); window.scrollTo(0, 0); }

  function render() {
    if (view === 'home') return renderHome();
    if (view === 'setup') return renderSetup();
    if (view === 'run') return S ? renderRun() : show('home');
    if (view === 'summary') return renderSummary();
    if (view === 'stats') return renderStats();
  }

  function renderHome() {
    root.innerHTML = `
      <div class="row" style="margin-bottom:10px"><button class="btn block" data-act="stats">📊 Auswertung je Spieler</button></div>
      ${CATS.map(c => `<h2 class="tcat">${c.label}</h2>` + EX.filter(e => e.cat === c.k).map(e => `
        <div class="card exc" data-ex="${e.id}"><div style="display:flex;gap:12px;align-items:center">
          <span class="exi ${c.k}">${c.icon}</span><div style="flex:1"><b>${esc(e.title)}</b><div class="muted">${esc(e.short)}</div></div><span>›</span></div></div>`).join('')).join('')}`;
  }

  function renderSetup() {
    const e = setupEx, quiz = e.mode === 'quiz';
    const pl = A.players().filter(p => p.active !== false).sort((a, b) => a.name.localeCompare(b.name, 'de'));
    root.innerHTML = `
      <button class="btn" data-act="home">← Übungen</button>
      <div class="card" style="margin-top:10px"><h2>${esc(e.title)}</h2><p class="muted" style="margin:0 0 6px">${esc(e.short)}</p>
        <ul class="tips">${e.howto.map(h => `<li>${esc(h)}</li>`).join('')}</ul></div>
      <div class="card"><h2>${quiz ? 'Wer löst die Aufgaben?' : 'Wer trainiert?'}</h2>
        <p class="muted" style="margin:0 0 6px">${quiz ? 'Ein Spieler oder Gast.' : 'Ein oder mehrere Spieler – die Reihenfolge der Auswahl ist die Wurfreihenfolge.'}</p>
        <ul class="plist">${[{ id: GAST, name: 'Gast (ohne Statistik)' }, ...pl].map(p => {
          const i = setupSel.indexOf(p.id);
          return `<li data-sel="${p.id}" class="${i >= 0 ? 'sel' : ''}"><span class="av">${i >= 0 ? i + 1 : (p.id === GAST ? '?' : esc(p.name.slice(0, 2).toUpperCase()))}</span><span class="grow">${esc(p.name)}</span></li>`;
        }).join('')}</ul></div>
      <button class="btn primary block" data-act="start" ${setupSel.length ? '' : 'disabled'}>Training starten</button>`;
  }

  function startSession() {
    const e = setupEx, bl = e.make();
    const steps = [];
    bl.forEach((b, bi) => setupSel.forEach(p => steps.push({ b: bi, p, res: [] })));
    S = { id: uid(), ex: e.id, date: Date.now(), players: [...setupSel], blocks: bl, steps, cur: 0 };
    saveS(); show('run');
  }

  function curStep() { return S.steps[S.cur]; }
  function renderRun() {
    const e = exById(S.ex), st = curStep(), b = S.blocks[st.b], outs = OUT[e.mode];
    const prog = `${S.cur + 1}/${S.steps.length}`;
    let body = '';
    if (e.mode === 'quiz') body = renderQuiz(b, st);
    else {
      const slots = Array.from({ length: b.n }, (_, i) => {
        const r = st.res[i]; const o = r && outs.find(x => x.k === r.k);
        return `<span class="slot ${o ? o.cls : ''}">${o ? (r.mm != null ? cm(r.mm) : esc(o.label)) : i + 1}</span>`;
      }).join('');
      const task = b.task != null ? `<div class="note" style="border-color:var(--blue);background:#eef4fa"><b>${esc(PREC_TASKS[b.task].t)}</b><br>${esc(PREC_TASKS[b.task].setup)}</div>` : '';
      body = `${task}
        <div class="card"><div class="slots">${slots}</div>
          <div class="obtns">${outs.map(o => `<button class="ob ${o.cls}" data-out="${o.k}" ${st.res.length >= b.n ? 'disabled' : ''}>${esc(o.label)}${o.hint ? `<small>${esc(o.hint)}</small>` : ''}</button>`).join('')}</div>
          ${e.mode === 'zones' ? `<button class="btn block" data-act="measure" style="margin-top:10px" ${st.res.length >= b.n ? 'disabled' : ''}>📷 ${b.n - st.res.length} Kugel(n) per Kamera messen</button>` : ''}
        </div>`;
    }
    root.innerHTML = `
      <div class="runhead"><div><div class="muted">${esc(e.title)} · Schritt ${prog}</div>
        <div class="who">${esc(pname(st.p))}</div><div class="dist">${esc(b.label)}${e.mode !== 'quiz' ? ` · ${b.n} ${e.mode === 'zones' ? 'Kugel(n) legen' : 'Schuss'}` : ''}</div></div></div>
      <div class="pbar"><i style="width:${(S.cur / S.steps.length) * 100}%"></i></div>
      ${body}
      <div class="row" style="margin-top:6px">
        <button class="btn" data-act="undo">Rückgängig</button>
        <button class="btn" data-act="abort">Abbrechen</button>
        ${st.res.length >= b.n && S.cur < S.steps.length - 1 ? '<button class="btn primary" data-act="next">Weiter</button>' : ''}
        ${st.res.length >= b.n && S.cur === S.steps.length - 1 ? '<button class="btn accent" data-act="finish">Fertig</button>' : ''}
      </div>`;
  }

  function sitSvg(s) {
    // maßstäblich: Kugel 7,3 cm, Schweinchen 3 cm; Ausschnitt ca. ±60 cm um das Schweinchen
    const sc = 2.6, W = 320, H = 250, cx = W / 2, cy = 120;
    const P = ([x, y]) => [cx + x * sc, cy - y * sc];
    const ball = (p, fill, stroke) => { const [x, y] = P(p); return `<circle cx="${x}" cy="${y}" r="${3.65 * sc}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`; };
    const [jx, jy] = P([0, 0]);
    const ey = cy - 30 * sc;
    return `<svg viewBox="0 0 ${W} ${H}" class="sit">
      <rect width="${W}" height="${H}" rx="12" fill="#e8dcc1"/>
      ${s.edge ? `<rect x="0" y="0" width="${W}" height="${ey}" fill="#d6c7a6"/><line x1="0" x2="${W}" y1="${ey}" y2="${ey}" stroke="#7a5c2e" stroke-width="3" stroke-dasharray="8 6"/><text x="${W - 8}" y="${ey - 6}" text-anchor="end" font-size="11" fill="#7a5c2e">Auslinie (dahinter: Aus)</text>` : ''}
      ${s.ours.map(p => ball(p, '#2c5d8a', '#18344f')).join('')}
      ${s.theirs.map(p => ball(p, '#b44a35', '#6e2a1d')).join('')}
      <circle cx="${jx}" cy="${jy}" r="${1.5 * sc}" fill="#f2b705" stroke="#8a6500"/>
      <g font-size="12" fill="#2b2620"><circle cx="16" cy="${H - 50}" r="6" fill="#2c5d8a"/><text x="27" y="${H - 46}">Ihr · noch ${s.hand[0]} in der Hand</text>
      <circle cx="16" cy="${H - 32}" r="6" fill="#b44a35"/><text x="27" y="${H - 28}">Gegner · noch ${s.hand[1]}</text>
      <circle cx="16" cy="${H - 14}" r="4" fill="#f2b705"/><text x="27" y="${H - 10}">Schweinchen</text></g>
      <text x="${W - 10}" y="${H - 10}" text-anchor="end" font-size="11" fill="#6b6255">↓ Wurfkreis</text>
      ${s.score ? `<text x="${W - 10}" y="${s.edge ? ey + 18 : 20}" text-anchor="end" font-size="13" font-weight="700">Stand ${s.score}</text>` : ''}
    </svg>`;
  }
  function renderQuiz(b, st) {
    const s = SIT[b.sit], ans = st.res[0];
    return `<div class="card"><h2>${esc(s.title)}</h2>${sitSvg(s)}<p style="margin:8px 0">${esc(s.q)}</p>
      <div class="obtns qa">${s.a.map(([t, ok], i) => {
        const cls = ans ? (ok ? 'z1' : (ans.i === i ? 'z4' : '')) : '';
        return `<button class="ob ${cls}" data-quiz="${i}" ${ans ? 'disabled' : ''}>${esc(t)}</button>`;
      }).join('')}</div>
      ${ans ? `<div class="note" style="border-color:${ans.ok ? 'var(--ok)' : '#b44a35'};background:${ans.ok ? '#e3f1e7' : '#fde8e4'}"><b>${ans.ok ? 'Richtig.' : 'Eher nicht.'}</b> ${esc(s.a[ans.i][2])}${ans.ok ? '' : '<br><br><b>Empfehlung:</b> ' + esc(s.a.find(x => x[1])[2])}</div>` : ''}
      </div>`;
  }

  // Punkte/Ergebnisse auswerten
  function summarize(sess) {
    const e = exById(sess.ex), outs = OUT[e.mode] || [];
    const per = {};
    for (const st of sess.steps) {
      const o = per[st.p] || (per[st.p] = { n: 0, pts: 0, max: 0, counts: {}, mm: [], ok: 0 });
      for (const r of st.res) {
        o.n++;
        if (e.mode === 'quiz') { if (r.ok) o.ok++; continue; }
        const def = outs.find(x => x.k === r.k); o.pts += def ? def.pts : 0; o.max += Math.max(...outs.map(x => x.pts));
        o.counts[r.k] = (o.counts[r.k] || 0) + 1; if (r.mm != null) o.mm.push(r.mm);
      }
    }
    return per;
  }
  let lastSummary = null;
  function renderSummary() {
    const sess = lastSummary; if (!sess) return show('home');
    const e = exById(sess.ex), outs = OUT[e.mode] || [], per = summarize(sess);
    root.innerHTML = `<div class="card"><h2>Ergebnis: ${esc(e.title)}</h2><p class="muted" style="margin:0">${new Date(sess.date).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}</p></div>
      ${sess.players.map(p => { const o = per[p] || { n: 0 };
        const main = e.mode === 'quiz' ? `${o.ok} von ${o.n} richtig` : e.mode === 'prec' ? `${o.pts} von ${o.max} Punkten` : `${o.pts} von ${o.max} Punkten (${o.max ? Math.round(100 * o.pts / o.max) : 0} %)`;
        return `<div class="card"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:18px">${esc(pname(p))}</b><b>${main}</b></div>
          ${e.mode !== 'quiz' ? `<div class="chips" style="margin-top:8px">${outs.map(x => `<span class="ob ${x.cls}" style="padding:4px 10px;min-height:0;font-size:13px">${esc(x.label)}: ${o.counts[x.k] || 0}</span>`).join('')}</div>` : ''}
          ${o.mm && o.mm.length ? `<div class="muted" style="margin-top:6px">Gemessen: Ø ${cm(o.mm.reduce((a, b) => a + b, 0) / o.mm.length)} über ${o.mm.length} Kugeln</div>` : ''}</div>`; }).join('')}
      <div class="row"><button class="btn primary" data-act="again">Nochmal</button><button class="btn" data-act="home">Übungen</button></div>`;
  }

  /* ---------- Auswertung je Spieler ---------- */
  function playerTrainings(pid) { return trainings.filter(t => t.players.includes(pid)).sort((a, b) => a.date - b.date); }
  function statsFor(pid, cat) {
    const list = playerTrainings(pid).filter(t => exById(t.ex)?.cat === cat);
    const byDist = {}, sessions = [];
    let qn = 0, qok = 0;
    for (const t of list) {
      const e = exById(t.ex); let sp = 0, sm = 0, sn = 0;
      for (const st of t.steps.filter(s => s.p === pid)) {
        const b = t.blocks[st.b];
        for (const r of st.res) {
          if (e.mode === 'quiz') { qn++; if (r.ok) qok++; continue; }
          const key = cat === 'praezision' ? `A${b.task + 1}` : (b.dist + ' m');
          const d = byDist[key] || (byDist[key] = { n: 0, good: 0, top: 0, mm: [], pts: 0 });
          d.n++;
          if (e.mode === 'zones') { if (r.k === 'z10' || r.k === 'z30') d.good++; if (r.k === 'z10') d.top++; if (r.mm != null) d.mm.push(r.mm); }
          else if (e.mode === 'prec') { const pts = PREC.find(x => x.k === r.k).pts; d.pts += pts; if (pts >= 3) d.good++; }
          else { if (r.k !== 'fehl') d.good++; if (r.k === 'carreau' || r.k === 'sauber') d.top++; }
          { const outs = OUT[e.mode], def = outs.find(x => x.k === r.k); sp += def ? def.pts : 0; sm += Math.max(...outs.map(x => x.pts)); }
          sn++;
        }
      }
      sessions.push({ t, e, sp, sm, sn });
    }
    return { list, byDist, sessions, qn, qok };
  }
  function renderStats() {
    const pl = A.players().sort((a, b) => a.name.localeCompare(b.name, 'de')).filter(p => playerTrainings(p.id).length);
    if (!statP && pl.length) statP = pl[0].id;
    const s = statP ? statsFor(statP, statCat) : null;
    const pc = (a, b) => b ? Math.round(100 * a / b) + ' %' : '–';
    const keys = s ? Object.keys(s.byDist).sort((a, b) => parseFloat(a.replace('A', '')) - parseFloat(b.replace('A', ''))) : [];
    let table = '';
    if (s && statCat === 'legen') table = `<tr><th>Distanz</th><th class="r">Kugeln</th><th class="r">≤ 10 cm</th><th class="r">≤ 30 cm</th><th class="r">Ø gemessen</th></tr>` +
      keys.map(k => { const d = s.byDist[k]; return `<tr><td>${k}</td><td class="r">${d.n}</td><td class="r">${pc(d.top, d.n)}</td><td class="r"><b>${pc(d.good, d.n)}</b></td><td class="r">${d.mm.length ? cm(d.mm.reduce((a, b) => a + b, 0) / d.mm.length) : '–'}</td></tr>`; }).join('');
    if (s && statCat === 'schiessen') table = `<tr><th>Distanz</th><th class="r">Schüsse</th><th class="r">Treffer</th><th class="r">Carreau/sauber</th></tr>` +
      keys.map(k => { const d = s.byDist[k]; return `<tr><td>${k}</td><td class="r">${d.n}</td><td class="r"><b>${pc(d.good, d.n)}</b></td><td class="r">${pc(d.top, d.n)}</td></tr>`; }).join('');
    if (s && statCat === 'praezision') table = `<tr><th>Aufgabe</th><th class="r">Schüsse</th><th class="r">Ø Punkte</th><th class="r">3 oder 5</th></tr>` +
      keys.map(k => { const d = s.byDist[k]; return `<tr><td>${k}</td><td class="r">${d.n}</td><td class="r"><b>${(d.pts / d.n).toFixed(1).replace('.', ',')}</b></td><td class="r">${pc(d.good, d.n)}</td></tr>`; }).join('');
    const prec = s && statCat === 'praezision' ? s.sessions.filter(x => x.e.id === 'P1' && x.sn === 20) : [];
    const recent = s ? s.sessions.slice(-8).reverse() : [];
    root.innerHTML = `<button class="btn" data-act="home">← Übungen</button>
      ${pl.length ? `<div class="filters" style="margin-top:10px">
        <select class="f" id="tsP">${pl.map(p => `<option value="${p.id}" ${p.id === statP ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
        <select class="f" id="tsC">${CATS.map(c => `<option value="${c.k}" ${c.k === statCat ? 'selected' : ''}>${c.label}</option>`).join('')}</select></div>
      ${!s.list.length ? '<div class="card muted">Noch kein Training in diesem Bereich.</div>' : `
        ${statCat === 'situation' ? `<div class="card"><div class="kpis"><div class="kpi"><b>${s.qn}</b><span>Aufgaben</span></div><div class="kpi"><b>${s.qok}</b><span>richtig</span></div><div class="kpi"><b>${pc(s.qok, s.qn)}</b><span>Quote</span></div></div></div>` :
          `<div class="card"><table class="st">${table}</table></div>`}
        ${prec.length ? `<div class="card"><h2>Präzisionsschießen komplett</h2><div class="kpis"><div class="kpi"><b>${prec.length}</b><span>Serien</span></div><div class="kpi"><b>${Math.max(...prec.map(x => x.sp))}</b><span>Bestwert</span></div><div class="kpi"><b>${Math.round(prec.reduce((a, x) => a + x.sp, 0) / prec.length)}</b><span>Ø Punkte</span></div></div></div>` : ''}
        <div class="card"><h2>Letzte Einheiten</h2><ul class="hist">${recent.map(x => `<li><span>${esc(x.e.title)} <span class="muted">· ${new Date(x.t.date).toLocaleDateString('de-DE')}</span></span>
          <span style="white-space:nowrap;margin-left:10px"><b>${x.e.mode === 'quiz' ? '' : x.sm ? x.sp + '/' + x.sm : ''}</b><button class="x" data-tdel="${x.t.id}" aria-label="Einheit löschen">×</button></span></li>`).join('')}</ul></div>`}`
      : '<div class="card muted" style="margin-top:10px">Noch keine Trainingsdaten. Trainings mit „Gast“ werden nicht ausgewertet.</div>'}`;
    const p = $('tsP'), c = $('tsC');
    if (p) p.onchange = () => { statP = p.value; renderStats(); };
    if (c) c.onchange = () => { statCat = c.value; renderStats(); };
  }

  /* ---------- Eingaben ---------- */
  function record(r) {
    const st = curStep(), b = S.blocks[st.b];
    if (st.res.length >= b.n) return;
    st.res.push(r); saveS();
    if (navigator.vibrate) navigator.vibrate(20);
    // automatisch weiter, wenn der Schritt voll ist (außer Quiz – Erklärung lesen)
    if (st.res.length >= b.n && exById(S.ex).mode !== 'quiz' && S.cur < S.steps.length - 1) { setTimeout(() => { S.cur++; saveS(); renderRun(); }, 350); }
    renderRun();
  }
  function finish() {
    const sess = { ...S }; trainings.push(sess); saveT();
    lastSummary = sess; S = null; saveS(); show('summary');
  }
  root.addEventListener('click', ev => {
    const t = ev.target.closest('[data-act],[data-ex],[data-sel],[data-out],[data-quiz],[data-tdel]'); if (!t) return;
    const d = t.dataset;
    if (d.ex) { setupEx = exById(d.ex); setupSel = []; show('setup'); return; }
    if (d.sel) {
      const quiz = setupEx.mode === 'quiz', i = setupSel.indexOf(d.sel);
      if (i >= 0) setupSel.splice(i, 1); else if (quiz) setupSel = [d.sel]; else setupSel.push(d.sel);
      renderSetup(); return;
    }
    if (d.out) { const r = { k: d.out }; record(r); return; }
    if (d.quiz) { const st = curStep(), s = SIT[S.blocks[st.b].sit], i = +d.quiz; record({ i, ok: !!s.a[i][1] }); return; }
    if (d.tdel) { if (confirm('Diese Trainingseinheit löschen?')) { trainings = trainings.filter(x => x.id !== d.tdel); saveT(); renderStats(); } return; }
    switch (d.act) {
      case 'home': show('home'); break;
      case 'stats': show('stats'); break;
      case 'start': startSession(); break;
      case 'next': S.cur++; saveS(); renderRun(); break;
      case 'finish': finish(); break;
      case 'again': setupEx = exById(lastSummary.ex); setupSel = [...lastSummary.players]; startSession(); break;
      case 'undo': {
        const st = curStep();
        if (st.res.length) st.res.pop(); else if (S.cur > 0) { S.cur--; curStep().res.pop(); }
        saveS(); renderRun(); break;
      }
      case 'abort':
        if (confirm('Training abbrechen? Bisherige Würfe werden nicht gespeichert.')) { S = null; saveS(); show('home'); }
        break;
      case 'measure': {
        const st = curStep(), b = S.blocks[st.b], n = b.n - st.res.length;
        A.measure(n, `${pname(st.p)} · ${b.label}`, mms => {
          mms.slice(0, n).forEach(mm => st.res.push({ k: zoneOf(mm), mm: Math.round(mm) }));
          saveS(); A.showTab('trainer');
          if (st.res.length >= b.n && S.cur < S.steps.length - 1) { S.cur++; saveS(); }
          renderRun();
        });
        break;
      }
    }
  });

  // für Export/Import in app.js
  window.BouleTrainer = {
    all: () => trainings,
    merge: list => { const ids = new Set(trainings.map(t => t.id)); const add = list.filter(t => t && t.id && t.ex && !ids.has(t.id)); trainings = trainings.concat(add); saveT(); return add.length; },
    refresh: () => render(),
  };
  render();
})();
