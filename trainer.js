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
    { t: 'Aufgabe 1 – Kugel allein', setup: 'Treffkugel in der Mitte des Zielkreises (1 m), kein Hindernis.', tip: 'Direkt auf die Kugel (au fer). 5 Punkte gibt es nur, wenn deine Kugel im Kreis bleibt – sauber in die Mitte treffen.' },
    { t: 'Aufgabe 2 – Schweinchen davor', setup: 'Schweinchen als Hindernis vor der Treffkugel, 10 cm lichter Abstand.', tip: 'Etwas höhere Flugkurve, über das Schweinchen hinweg direkt auf die Kugel. Jedes Aufsetzen davor trifft das Schweinchen.' },
    { t: 'Aufgabe 3 – Kugel zwischen Hindernissen', setup: 'Treffkugel zwischen dunklen Hinderniskugeln, 3 cm lichter Abstand.', tip: 'Seitliche Genauigkeit zählt: Arm exakt in der Wurfebene pendeln, Schultern parallel zum Kreis. Die Hindernisse nicht ansehen, nur die Mitte der Treffkugel.' },
    { t: 'Aufgabe 4 – Kugel hinter Hindernis', setup: 'Hinderniskugel vor der Treffkugel, 10 cm lichter Abstand.', tip: 'Wie Aufgabe 2, nur ist das Hindernis größer: Flugbahn etwas höher wählen und direkt auf die hintere Kugel zielen.' },
    { t: 'Aufgabe 5 – Schweinchen', setup: 'Schweinchen allein, 20 cm hinter dem vorderen Rand des Zielkreises.', tip: 'Kleinstes Ziel: ruhig bleiben, auf das Schweinchen selbst zielen. Bleibt deine Kugel im Kreis, gibt es die volle Punktzahl.' },
  ];
  const EX = [
    { id: 'L1', cat: 'legen', title: 'Distanzleiter', mode: 'zones', short: 'Je 3 Kugeln auf 6, 7, 8, 9 und 10 m',
      howto: ['Schweinchen auf die Distanz legen (Abstand ab Kreisrand).', 'Jeder Spieler legt 3 Kugeln, dann Zone antippen oder per Kamera messen.', 'Bei Gruppen: nur die Kugeln des aktuellen Spielers liegen lassen, dann wegräumen.'],
      tips: ["Wähle die Technik nach Boden: Roller (rollt fast den ganzen Weg) auf glattem Boden, halbhoch (Aufsetzpunkt etwa auf halber Strecke) als Standard, hoch (Aufsetzen kurz vor dem Ziel) auf unruhigem oder sandigem Boden.", "Vor dem Wurf den Aufsetzpunkt (Donnée) festlegen und nur noch diesen ansehen, nicht das Schweinchen.", "In der Hocke: Gewicht auf Zehen und Fußballen, beim Rechtshänder zeigt das rechte Knie zum Ziel. Gleichgewicht halten, bis die Kugel liegt.", "Arm pendelt locker in einer Ebene, die Kugel verlässt die Hand mit gestrecktem Arm. Rückwärtsdrall (Handrücken oben, Kugel über die Fingerspitzen abrollen lassen) bremst die Kugel nach dem Aufsetzen.", "Bei langen Distanzen nicht fester werfen, sondern höher – so bleibt der Bewegungsablauf gleich."],
      make: () => blocks([6, 7, 8, 9, 10], 3) },
    { id: 'L2', cat: 'legen', title: 'Zufallsdistanz', mode: 'zones', short: '4 Runden à 3 Kugeln, Distanz wird zufällig zwischen 6 und 10 m vorgegeben',
      howto: ['Die App nennt je Runde eine Distanz – wie im Spiel, wo das Schweinchen überall liegen kann.', 'Zone antippen oder per Kamera messen.'],
      tips: ["Distanz erst abschreiten, dann den Aufsetzpunkt wählen.", "Bei jeder neuen Distanz denselben Ablauf beibehalten, nur die Höhe der Flugkurve anpassen.", "Nach der ersten Kugel kurz prüfen: Lag sie zu kurz oder zu lang? Den Aufsetzpunkt verschieben, nicht die Kraft."],
      make: () => Array.from({ length: 4 }, () => { const d = 6 + Math.round(Math.random() * 8) / 2; return { dist: d, n: 3, label: `${String(d).replace('.', ',')} m` }; }) },
    { id: 'L3', cat: 'legen', title: 'Kurz – lang', mode: 'zones', short: 'Abwechselnd 6 und 10 m, je 2 Kugeln, 4 Runden',
      howto: ['Trainiert das Umstellen der Wurfweite.', 'Schweinchen nach jeder Runde umlegen.'],
      tips: ["Der Wechsel kurz–lang ist im Spiel häufig. Konzentriere dich auf einen festen Aufsetzpunkt je Distanz.", "Nicht die Kraft „schätzen“: höher werfen für 10 m, flacher für 6 m.", "Ruhig atmen und vor jedem Wurf neu aufstellen, nicht hastig nachwerfen."],
      make: () => [6, 10, 6, 10].map(d => ({ dist: d, n: 2, label: `${d} m` })) },
    { id: 'S1', cat: 'schiessen', title: 'Trefferserie', mode: 'shot', short: 'Je 5 Schüsse auf eine freie Kugel aus 6, 7, 8 und 9 m',
      howto: ['Zielkugel frei hinlegen.', 'Nach jedem Schuss Ergebnis antippen.', 'Carreau: die eigene Kugel bleibt (fast) am Platz der getroffenen.'],
      tips: ["Stand: aufrecht, Füße schulterbreit im Kreis, Gewicht leicht nach vorn. Die Füße bleiben stehen, bis die Kugel aufgekommen ist.", "Nur die Zielkugel ansehen – nicht die eigene Kugel in der Hand und nicht die Flugbahn.", "Arm pendelt gerade wie ein Uhrpendel, die Schulter bleibt ruhig. Die Hand zeigt nach dem Abwurf zum Ziel.", "Aufbau in Stufen: erst 20–30 cm vor der Kugel aufsetzen (Schuss davor), dann den Aufsetzpunkt immer näher an die Kugel legen, bis du sie direkt triffst (au fer).", "Carreau entsteht bei einem vollen, mittigen Treffer mit Rückwärtsdrall: Die getroffene Kugel nimmt die Energie auf, deine bleibt liegen."],
      make: () => blocks(D4, 5) },
    { id: 'S2', cat: 'schiessen', title: 'Kugel am Schweinchen', mode: 'shotjack', short: 'Je 5 Schüsse aus 7 m: Kugel direkt hinter und direkt neben dem Schweinchen',
      howto: ['Runde 1: Zielkugel liegt direkt hinter dem Schweinchen (vom Kreis aus gesehen), berührend.', 'Runde 2: Zielkugel liegt seitlich am Schweinchen, berührend.', 'Ziel: Kugel weg, Schweinchen bleibt liegen.'],
      tips: ['Nur der direkte Schuss (au fer) funktioniert: Deine Kugel darf vorher nicht aufsetzen, sonst rollt sie ins Schweinchen.',
        'Kugel hinter dem Schweinchen: Flugkurve etwas höher als sonst, damit deine Kugel über das Schweinchen hinweg von oben auf die Zielkugel fällt. Ziel ist die hintere obere Hälfte der Zielkugel.',
        'Kugel neben dem Schweinchen: Die Zielkugel fliegt immer in Richtung der Linie von der Trefferstelle durch ihre Mitte. Triff sie auf der Seite zum Schweinchen hin, dann fliegt sie vom Schweinchen weg. Deine eigene Kugel wird dabei zur Schweinchenseite abgelenkt – deshalb von oben treffen, damit sie nach dem Treffer liegen bleibt statt weiterzurollen.',
        'Kugel vor dem Schweinchen (berührend): Hier wird das Schweinchen fast immer mitbewegt, weil die getroffene Kugel nach vorn ins Schweinchen läuft. Ein dünner, seitlicher Treffer gibt ihm nur einen leichten Stoß. Oft ist hier Legen oder Schweinchen mitnehmen die bessere Wahl.'],
      make: () => [{ dist: 7, n: 5, label: '7 m · Kugel hinter dem Schweinchen' }, { dist: 7, n: 5, label: '7 m · Kugel neben dem Schweinchen' }] },
    { id: 'S3', cat: 'schiessen', title: 'Schweinchen schießen', mode: 'hit', short: 'Je 5 Schüsse auf das Schweinchen aus 6 und 8 m',
      howto: ['Für die Situation „Aufnahme retten“: Schweinchen ins Aus schießen.', 'Treffer zählt, wenn das Schweinchen getroffen wurde.'],
      tips: ["Das Schweinchen ist kleiner als eine Kugel: genau zielen, lieber direkt (au fer) als davor.", "Bei einem Schuss davor auf glattem Boden mit wenig Steinen funktioniert auch Aufsetzen knapp vor dem Schweinchen.", "Typische Lage: Rettet eine Aufnahme, wenn das Schweinchen ins Aus fliegt – vorher prüfen, ob es nah genug an der Linie liegt."],
      make: () => blocks([6, 8], 5) },
    { id: 'P1', cat: 'praezision', title: 'Präzisionsschießen (komplett)', mode: 'prec', short: '5 Aufgaben × 6, 7, 8, 9 m = 20 Schüsse, max. 100 Punkte',
      howto: ['Zielkreis 1 m; Wurfkreise 50 cm, vordere Ränder 6–9 m vom vorderen Rand des Zielkreises.', 'Treffkugeln liegen in der Mitte des Zielkreises.', 'Im Wettkampf: 15 Minuten für alle 5 Aufgaben; gültig nur, wenn der Aufschlag im Zielkreis liegt.', 'Vereinfachte Wertung 5/3/1/0 – Sonderfälle siehe DPV-Richtlinie DM Tireur.'],
      tips: ["Gleiche Wurfroutine bei jedem Schuss: aufstellen, Ziel anvisieren, ausatmen, schießen.", "Die Zeit ist großzügig (15 Minuten für 20 Schüsse) – nicht hetzen.", "Tipps für die einzelnen Aufgaben erscheinen während der Übung."],
      make: () => PREC_TASKS.flatMap((t, i) => D4.map(d => ({ dist: d, n: 1, label: `A${i + 1} · ${d} m`, task: i }))) },
    { id: 'P2', cat: 'praezision', title: 'Präzisionsschießen kurz (6 m)', mode: 'prec', short: 'Alle 5 Aufgaben je einmal aus 6 m – wie im K.-o.-Duell',
      howto: ['Format der Duelle ab dem Viertelfinale: je ein Schuss pro Aufgabe aus 6 m.', 'Max. 25 Punkte.'],
      tips: ["Wie im Duell: nur ein Versuch je Aufgabe, also maximale Konzentration bei jedem Schuss.", "Tipps für die einzelnen Aufgaben erscheinen während der Übung."],
      make: () => PREC_TASKS.map((t, i) => ({ dist: 6, n: 1, label: `A${i + 1} · 6 m`, task: i })) },
    { id: 'Q1', cat: 'situation', title: 'Taktik-Quiz', mode: 'quiz', short: '10 zufällige Situationen aus 25 – je 3 Antworten mit Erklärung',
      howto: ['Lage ansehen, eine von drei Antworten wählen, Erklärung lesen.', 'Themen: Legen oder Schießen, Kugelzählen & Spielstand, Schweinchen & Regeln, Rollen im Team.', 'Regelfragen folgen dem FIPJP-Reglement; Taktik-Antworten sind Empfehlungen, keine Regeln.'],
      make: () => shuffle(SIT).slice(0, 10).map((s, i) => ({ n: 1, label: `Frage ${i + 1} von 10`, sid: s.id, order: shuffle([0, 1, 2]) })) },
    { id: 'Q2', cat: 'situation', title: 'Taktik-Quiz nach Thema', mode: 'quiz', short: 'Alle Situationen eines Themas der Reihe nach',
      howto: ['Wähle beim Start ein Thema.', 'Gut, um ein Thema gezielt mit der Gruppe durchzusprechen.'],
      make: th => SIT.filter(s => !th || s.th === th).map((s, i, arr) => ({ n: 1, label: `Frage ${i + 1} von ${arr.length}`, sid: s.id, order: shuffle([0, 1, 2]) })) },
  ];
  const CATS = [
    { k: 'legen', label: 'Legen', icon: '◎' }, { k: 'schiessen', label: 'Schießen', icon: '✕' },
    { k: 'praezision', label: 'Präzisionsschießen', icon: '◉' }, { k: 'situation', label: 'Taktik', icon: '?' },
  ];
  const OUT = { zones: ZONES, shot: SHOT, shotjack: SHOT_JACK, hit: HIT, prec: PREC };

  /* ---------- Taktik-Quiz: Situationen ----------
   * Positionen polar: [Abstand Kante–Schweinchen in cm, Winkel in Grad]; 90° = hinter dem Schweinchen,
   * 270° = davor (Richtung Wurfkreis). Jede Situation hat genau 3 Antworten, genau eine ist richtig.
   * Themen: ls = Legen oder Schießen, kz = Kugelzählen & Spielstand, sr = Schweinchen & Regeln, ro = Rollen im Team
   */
  const pol = ([d, a]) => { const r = d + 5.15, w = a * Math.PI / 180; return [r * Math.cos(w), r * Math.sin(w)]; };
  const THEMES = { ls: 'Legen oder Schießen', kz: 'Kugelzählen & Spielstand', sr: 'Schweinchen & Regeln', ro: 'Rollen im Team' };
  const SIT_RAW = [
    { id: 'ls1', th: 'ls', title: 'Gegner liegt am Schweinchen', ours: [[30, 120]], theirs: [[1.5, 70]], hand: [3, 2],
      q: 'Die gegnerische Kugel liegt 1,5 cm am Schweinchen. Was spielt ihr?', a: [
        ['Schießen', true, 'So eine Kugel ist kaum zu überlegen. Mit 3 gegen 2 Kugeln könnt ihr euch den Schuss leisten – bleibt eure Kugel liegen (Carreau), habt ihr sogar den Punkt.'],
        ['Legen', false, 'Unter 1,5 cm zu legen gelingt selten. Meist verschenkt ihr damit eine Kugel und müsst danach doch schießen.'],
        ['Abwarten, der Gegner ist dran', false, 'Falsch: Es spielt immer das Team, das den Punkt nicht hält (Art. 16). Der Gegner liegt – also seid ihr dran.'],
      ] },
    { id: 'ls2', th: 'ls', title: 'Gegner ohne Kugeln', ours: [[45, 40]], theirs: [[20, 130]], hand: [2, 0],
      q: 'Der Gegner liegt mit 20 cm und hat keine Kugel mehr. Ihr habt zwei.', a: [
        ['Ruhig legen', true, 'Jetzt habt ihr alle Zeit: Jede Kugel unter 20 cm ist ein Punkt. Mit zwei Kugeln sind bis zu zwei Punkte möglich.'],
        ['Die gegnerische Kugel schießen', false, 'Bringt höchstens einen Punkt (Carreau) und riskiert bei einem Fehlschuss die Chance auf zwei.'],
        ['Schweinchen schießen', false, 'Ist das Schweinchen tot, bekommt das Team mit Kugeln so viele Punkte, wie es noch Kugeln hat (Art. 14) – nach dem Schuss wäre das nur noch eine. Legen bringt mehr.'],
      ] },
    { id: 'ls3', th: 'ls', title: 'Früh in der Aufnahme', ours: [], theirs: [[27, 50]], hand: [3, 2],
      q: 'Der Gegner hat mit seiner ersten Kugel 27 cm gelegt. Eure erste Kugel?', a: [
        ['Legen', true, '27 cm ist gut, aber schlagbar. Ein Leger holt den Punkt zurück, ohne Kugeln zu verschwenden. Schießen lohnt erst bei sehr guten Kugeln.'],
        ['Schießen', false, 'Auf eine mittelmäßige Kugel zu schießen kostet eine Kugel ohne Not – der Gegner legt danach in Ruhe neu.'],
        ['Schweinchen schießen', false, 'Beide Teams haben noch Kugeln: Ist das Schweinchen tot, wird die Aufnahme nur neu gespielt (Art. 14). Ihr gewinnt nichts.'],
      ] },
    { id: 'ls4', th: 'ls', title: 'Zwei gegnerische Kugeln liegen', ours: [[30, 140]], theirs: [[3, 80], [4.5, 330]], hand: [3, 1],
      q: 'Der Gegner hält zwei Punkte (3 und 4,5 cm) und hat noch eine Kugel. Ihr habt drei.', a: [
        ['Schießen', true, 'Zwei so gute Kugeln überlegt man kaum. Ein Schuss räumt eine ab; mit 3 gegen 1 Kugel habt ihr danach genug zum Nachlegen.'],
        ['Legen', false, 'Ihr müsstet unter 3 cm legen – und der Gegner hat noch eine Kugel zum Antworten.'],
        ['Erst eine Kugel „vorlegen“ als Sperre', false, 'Eine Sperrkugel hilft nicht gegen Kugeln, die schon am Schweinchen liegen.'],
      ] },
    { id: 'ls5', th: 'ls', title: 'Letzte Kugel gegen zwei Punkte', ours: [[18, 30]], theirs: [[3, 120], [6, 60]], hand: [1, 0],
      q: 'Der Gegner hält zwei Punkte (3 und 6 cm) und hat keine Kugel mehr. Ihr habt die letzte.', a: [
        ['Legen', true, 'Nur ein Leger kann euch selbst einen Punkt bringen (unter 3 cm), und jeder Leger unter 6 cm nimmt dem Gegner einen Punkt.'],
        ['Die beste Kugel schießen', false, 'Selbst ein Treffer lässt dem Gegner die zweite Kugel – also mindestens einen Punkt, außer bei einem perfekten Carreau.'],
        ['Schweinchen schießen', false, 'Liegt das Schweinchen danach noch im Feld, zählt neu – meist liegen die gegnerischen Kugeln immer noch besser. Ohne Auslinie in der Nähe lohnt das nicht.'],
      ] },
    { id: 'ls6', th: 'ls', title: 'Tête-à-tête, schwacher Start', ours: [], theirs: [[45, 30]], hand: [3, 2],
      q: 'Im Tête-à-tête hat euer Gegner mit der ersten Kugel 45 cm gelegt.', a: [
        ['Legen', true, 'Eine 45-cm-Kugel ist keine Bedrohung. Legt den Punkt – dann muss der Gegner Kugeln investieren.'],
        ['Schießen', false, 'Ihr würdet eine Kugel für eine schlechte gegnerische Kugel opfern.'],
        ['Absichtlich weit legen', false, 'Ihr müsst ohnehin spielen, bis ihr den Punkt habt – eine weite Kugel kostet nur.'],
      ] },
    { id: 'ls7', th: 'ls', title: 'Kugel versperrt den Weg', ours: [], theirs: [[25, 270]], hand: [3, 2],
      q: 'Die gegnerische Kugel liegt 25 cm direkt vor dem Schweinchen – genau auf eurer Rolllinie.', a: [
        ['Hoch legen (Portée)', true, 'Mit hoher Flugkurve setzt die Kugel kurz vor dem Schweinchen auf und rollt kaum noch – so umgeht ihr die Sperre.'],
        ['Rollen (Roulette)', false, 'Eine gerollte Kugel trifft die Sperrkugel und schiebt sie womöglich noch ans Schweinchen.'],
        ['Schießen', false, '25 cm ist keine Kugel, die man schießen muss – Legen über die Sperre ist günstiger.'],
      ] },
    { id: 'ls8', th: 'ls', title: 'Zwei gegen eine Kugel', ours: [[40, 200]], theirs: [[22, 60], [35, 150]], hand: [2, 0],
      q: 'Der Gegner liegt mit 22 cm, hat aber keine Kugel mehr. Ihr habt zwei.', a: [
        ['Legen', true, 'Wie immer, wenn der Gegner leer ist: in Ruhe legen. Jede Kugel unter 22 cm ist ein Punkt.'],
        ['Erst schießen, dann legen', false, 'Unnötig: Ein Fehlschuss kostet euch eine von zwei Chancen auf einen Punkt.'],
        ['Schweinchen schießen', false, 'Ein totes Schweinchen bringt euch nur die Kugeln, die ihr danach noch habt – also eine (Art. 14). Legen bringt bis zu zwei.'],
      ] },
    { id: 'kz1', th: 'kz', title: 'Punkte zählen I', ours: [[5, 60], [12, 180]], theirs: [[10, 300]], hand: [0, 0],
      q: 'Alle Kugeln sind gespielt. Wie viele Punkte bekommt ihr?', a: [
        ['1 Punkt', true, 'Gezählt wird jede eigene Kugel, die näher liegt als die beste gegnerische (10 cm). Nur eure 5-cm-Kugel ist besser.'],
        ['2 Punkte', false, 'Eure 12-cm-Kugel liegt schlechter als die gegnerische 10-cm-Kugel – sie zählt nicht.'],
        ['0 Punkte', false, 'Eure 5-cm-Kugel liegt am nächsten – ihr punktet.'],
      ] },
    { id: 'kz2', th: 'kz', title: 'Punkte zählen II', ours: [[6, 40], [9, 150], [14, 250]], theirs: [[16, 90]], hand: [0, 0],
      q: 'Alle Kugeln sind gespielt. Wie viele Punkte bekommt ihr?', a: [
        ['3 Punkte', true, 'Alle drei eigenen Kugeln (6, 9 und 14 cm) liegen näher als die beste gegnerische (16 cm).'],
        ['2 Punkte', false, 'Auch die 14-cm-Kugel liegt noch vor der gegnerischen 16-cm-Kugel.'],
        ['1 Punkt', false, 'Es zählt jede Kugel vor der besten gegnerischen, nicht nur die beste.'],
      ] },
    { id: 'kz3', th: 'kz', title: 'Matchball', ours: [[40, 140]], theirs: [[35, 50]], hand: [1, 3], score: '12 : 6',
      q: 'Ihr führt 12:6. Der Gegner liegt mit 35 cm, ihr habt eure letzte Kugel, der Gegner noch drei.', a: [
        ['Legen', true, 'Ein sicherer Leger holt den Punkt. Bei 12 Punkten reicht euch jeder einzelne Punkt – und der Gegner muss mit drei Kugeln reagieren.'],
        ['Schießen', false, 'Selbst ein Treffer nimmt nur eine mittelmäßige Kugel weg; der Gegner hat danach drei Kugeln.'],
        ['Schweinchen schießen', false, 'Beide haben noch Kugeln – die Aufnahme würde nur neu gespielt. Ihr verschenkt euren Matchball.'],
      ] },
    { id: 'kz4', th: 'kz', title: 'Der Gegner steht vor dem Sieg', ours: [[30, 160]], theirs: [[6, 70], [9, 20]], hand: [2, 0], score: '10 : 12',
      q: 'Ihr liegt 10:12 zurück. Der Gegner hält zwei Punkte (6 und 9 cm) und hat keine Kugel mehr. Ihr habt zwei.', a: [
        ['Legen, bis ihr den Punkt habt', true, 'Jeder gegnerische Punkt beendet das Spiel. Ein Schuss reicht nicht, denn die zweite Kugel bleibt. Ihr müsst unter 6 cm legen – zwei Versuche.'],
        ['Die beste Kugel schießen', false, 'Selbst ein Treffer lässt die 9-cm-Kugel liegen: Der Gegner punktet und gewinnt 13:10.'],
        ['Abwarten und zählen lassen', false, 'Dann bekommt der Gegner zwei Punkte und gewinnt. Kugeln zählen heißt: vorher rechnen, was reicht.'],
      ] },
    { id: 'kz5', th: 'kz', title: 'Kugelvorteil nutzen', ours: [], theirs: [[30, 40]], hand: [3, 1], score: '12 : 12',
      q: 'Bei 12:12 liegt der Gegner mit 30 cm und hat noch eine Kugel. Ihr habt drei.', a: [
        ['Erst legen', true, 'Mit 3 gegen 1 Kugel habt ihr die Kontrolle. Legt den Punkt; muss der Gegner dann schießen oder legen, habt ihr noch zwei Kugeln zum Antworten.'],
        ['Sofort schießen', false, 'Auf 30 cm zu schießen verschwendet euren Kugelvorteil.'],
        ['Schweinchen schießen', false, 'Beide haben Kugeln – die Aufnahme würde nur neu gespielt, euer Vorteil wäre weg.'],
      ] },
    { id: 'kz6', th: 'kz', title: 'Wie viele Punkte drohen?', ours: [[25, 200]], theirs: [[8, 40], [12, 130], [18, 300]], hand: [1, 0],
      q: 'Der Gegner hat keine Kugel mehr, ihr habt eine. Wie viele Punkte bekommt der Gegner, wenn ihr eure Kugel ins Aus werft?', a: [
        ['3 Punkte', true, 'Alle drei gegnerischen Kugeln (8, 12, 18 cm) liegen besser als eure beste (25 cm).'],
        ['1 Punkt', false, 'Es zählt jede gegnerische Kugel, die besser liegt als eure beste – nicht nur die beste.'],
        ['2 Punkte', false, 'Auch die 18-cm-Kugel liegt vor eurer 25-cm-Kugel.'],
      ] },
    { id: 'sr1', th: 'sr', title: 'Drei Punkte drohen', ours: [], theirs: [[3, 120], [5, 340], [10, 90]], hand: [1, 0], edge: true,
      q: 'Der Gegner liegt mit 3 Kugeln und hat keine mehr. Ihr habt die letzte. Das Schweinchen liegt 30 cm vor der Auslinie.', a: [
        ['Schweinchen ins Aus schießen', true, 'Verlässt das Schweinchen das Spielfeld, ist es tot. Da danach kein Team mehr Kugeln hat, ist die Aufnahme ungültig (Art. 14) – die 3 Punkte sind gerettet.'],
        ['Legen', false, 'Selbst ein perfekter Leger rettet nur Punkte, wenn er besser liegt als alle drei – sehr unwahrscheinlich.'],
        ['Eine Kugel wegschießen', false, 'Dann bekommt der Gegner immer noch 2 Punkte.'],
      ] },
    { id: 'sr2', th: 'sr', title: 'Schweinchen zurückholen', ours: [[30, 85], [38, 100]], theirs: [[6, 270]], hand: [2, 0],
      q: 'Der Gegner liegt 6 cm vor dem Schweinchen und hat keine Kugel mehr. Eure zwei Kugeln liegen 30–40 cm dahinter. Ihr habt noch zwei.', a: [
        ['Schweinchen zu euren Kugeln schießen', true, 'Bleibt das Schweinchen im Feld und rollt nach hinten, liegen plötzlich eure Kugeln vorn – das kann mehrere Punkte bringen. Ihr habt danach noch eine Kugel zum Legen.'],
        ['Legen', false, 'Ihr müsstet unter 6 cm legen; selbst dann bekommt ihr höchstens einen Punkt.'],
        ['Die gegnerische Kugel schießen', false, 'Möglich, aber dann zählen nur eure Kugeln in 30–40 cm – weniger als nach einem gelungenen Schweinchenschuss.'],
      ] },
    { id: 'sr3', th: 'sr', title: 'Wer spielt jetzt?', ours: [[15, 60]], theirs: [[8, 200]], hand: [2, 3],
      q: 'Der Gegner liegt mit 8 cm am nächsten. Ihr habt 2 Kugeln, der Gegner 3. Wer spielt?', a: [
        ['Ihr', true, 'Es spielt immer das Team, das den Punkt nicht hält – so lange, bis es den Punkt hat oder keine Kugeln mehr (Art. 16).'],
        ['Der Gegner, weil er mehr Kugeln hat', false, 'Die Zahl der Kugeln entscheidet nicht – nur, wer den Punkt hält.'],
        ['Abwechselnd', false, 'Abwechselnd gespielt wird nur bei exakt gleichem Abstand (Art. 29).'],
      ] },
    { id: 'sr4', th: 'sr', title: 'Gleich weit entfernt', ours: [[12, 30]], theirs: [[12, 150]], hand: [2, 2],
      q: 'Eure und die gegnerische Kugel liegen exakt gleich weit (12 cm). Ihr habt zuletzt gespielt; beide haben noch Kugeln.', a: [
        ['Ihr spielt weiter', true, 'Bei gleichem Abstand spielt das Team, das zuletzt gespielt hat, danach abwechselnd (Art. 29).'],
        ['Der Gegner spielt', false, 'Nein – bei Gleichstand spielt zuerst das Team, das zuletzt gespielt hat.'],
        ['Die Aufnahme ist ungültig', false, 'Ungültig ist sie nur, wenn es am Ende gleich bleibt und keiner mehr Kugeln hat.'],
      ] },
    { id: 'sr5', th: 'sr', title: 'Gleichstand am Ende', ours: [[10, 20]], theirs: [[10, 160]], hand: [0, 0],
      q: 'Alle Kugeln sind gespielt. Die besten Kugeln beider Teams liegen exakt gleich weit entfernt.', a: [
        ['Die Aufnahme ist ungültig, keiner punktet', true, 'Bleibt es gleich und hat keiner mehr Kugeln, ist die Aufnahme ungültig (Art. 29).'],
        ['Beide bekommen einen Punkt', false, 'Punkte gibt es nur für Kugeln, die besser liegen als die beste gegnerische.'],
        ['Wer zuletzt gespielt hat, bekommt den Punkt', false, 'Die Reihenfolge entscheidet nur, wer bei Gleichstand weiterspielt – nicht, wer punktet.'],
      ] },
    { id: 'sr6', th: 'sr', title: 'Totes Schweinchen I', ours: [[20, 40]], theirs: [[15, 140]], hand: [2, 1],
      q: 'Ein Schuss befördert das Schweinchen ins Aus. Ihr habt noch 2 Kugeln, der Gegner 1.', a: [
        ['Die Aufnahme wird neu gespielt', true, 'Haben beide Teams noch Kugeln, ist die Aufnahme ungültig und wird neu gespielt (Art. 14).'],
        ['Ihr bekommt 2 Punkte', false, 'Punkte für die verbleibenden Kugeln gibt es nur, wenn ausschließlich ein Team noch Kugeln hat.'],
        ['Es zählt, wie die Kugeln liegen', false, 'Ohne gültiges Schweinchen kann nicht gezählt werden.'],
      ] },
    { id: 'sr7', th: 'sr', title: 'Totes Schweinchen II', ours: [[20, 40]], theirs: [[15, 140]], hand: [2, 0],
      q: 'Das Schweinchen wird ins Aus geschossen. Ihr habt noch 2 Kugeln, der Gegner keine mehr.', a: [
        ['Ihr bekommt 2 Punkte', true, 'Hat nur ein Team noch Kugeln, erhält es so viele Punkte, wie es noch Kugeln in der Hand hat (Art. 14).'],
        ['Die Aufnahme wird neu gespielt', false, 'Neu gespielt wird nur, wenn beide Teams noch Kugeln haben.'],
        ['Der Gegner bekommt 1 Punkt', false, 'Seine Kugel zählt nicht mehr – ohne Schweinchen gibt es keine Lage zu werten.'],
      ] },
    { id: 'sr8', th: 'sr', title: 'Kugel zu früh aufgehoben', ours: [[8, 60]], theirs: [[12, 200]], hand: [0, 0],
      q: 'Euer Mitspieler hebt eure 8-cm-Kugel auf, bevor sich beide Teams über die Punkte geeinigt haben. Was gilt?', a: [
        ['Die Kugel zählt nicht', true, 'Kugeln, die vor der Einigung über die Punkte aufgehoben werden, sind tot (Art. 27). Erst messen und einigen, dann aufheben.'],
        ['Sie wird zurückgelegt', false, 'Zurücklegen geht nur bei markierten, versehentlich verschobenen Kugeln – nicht beim Aufheben vor dem Zählen.'],
        ['Der Gegner bekommt einen Strafpunkt', false, 'Es gibt keinen Strafpunkt – die Kugel ist einfach tot.'],
      ] },
    { id: 'ro1', th: 'ro', title: 'Triplette: Wer beginnt?', ours: [], theirs: [], hand: [6, 6],
      q: 'Triplette, neue Aufnahme. Ihr habt das Schweinchen geworfen. Wer spielt eure erste Kugel?', a: [
        ['Der Leger (Pointeur)', true, 'Üblich legt der Pointeur die erste Kugel. Der Schießer hält seine Kugeln zurück, bis es etwas zu schießen gibt.'],
        ['Der Schießer (Tireur)', false, 'Es liegt noch nichts zum Schießen – der Schießer würde nur legen müssen.'],
        ['Egal, wer zuerst bereitsteht', false, 'Mit fester Rollenverteilung spielt ihr planvoller: Erst legen, Schusskugeln aufheben.'],
      ] },
    { id: 'ro2', th: 'ro', title: 'Triplette: Sehr gute Gegnerkugel', ours: [[25, 150]], theirs: [[2, 60]], hand: [5, 5],
      q: 'Triplette. Der Gegner liegt mit 2 cm, eure erste Kugel liegt 25 cm. Wer spielt als Nächstes?', a: [
        ['Der Schießer', true, 'Eine 2-cm-Kugel überlegt man kaum – das ist die Aufgabe des Tireurs. Der Leger hebt sich seine Kugel für danach auf.'],
        ['Der Leger', false, 'Ein Leger unter 2 cm ist sehr unwahrscheinlich – die Kugel wäre meist verschenkt.'],
        ['Der Milieu legt eine Sperre', false, 'Gegen eine Kugel direkt am Schweinchen hilft keine Sperre.'],
      ] },
    { id: 'ro3', th: 'ro', title: 'Triplette: Wer legt nach?', ours: [], theirs: [[25, 70]], hand: [2, 0],
      q: 'Triplette. Der Gegner hat keine Kugel mehr und liegt mit 25 cm. Ihr habt noch je eine Kugel bei Leger und Schießer.', a: [
        ['Der Leger', true, 'Jetzt geht es ums Legen in Ruhe – das ist die Stärke des Pointeurs. Der Schießer bleibt als Reserve, falls der Leger zu kurz oder zu lang kommt.'],
        ['Der Schießer schießt', false, 'Es gibt nichts zu schießen, was mehr bringt als Legen: Der Gegner ist leer.'],
        ['Beide gleichzeitig', false, 'Kugeln werden einzeln gespielt (Art. 16).'],
      ] },
  ];
  const SIT = SIT_RAW.map(s => ({ ...s, ours: s.ours.map(pol), theirs: s.theirs.map(pol) }));
  const sitById = id => SIT.find(s => s.id === id);
  const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

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
  let setupTheme = 'ls';
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
      ${e.tips ? `<div class="card"><h2>💡 Worauf achten</h2><ul class="tips">${e.tips.map(h => `<li>${esc(h)}</li>`).join('')}</ul></div>` : ''}
      ${e.id === 'Q2' ? `<div class="card"><h2>Thema</h2><select class="f" id="qTheme">${Object.entries(THEMES).map(([k, v]) => `<option value="${k}" ${k === setupTheme ? 'selected' : ''}>${v} (${SIT.filter(x => x.th === k).length})</option>`).join('')}</select></div>` : ''}
      <div class="card"><h2>${quiz ? 'Wer löst die Aufgaben?' : 'Wer trainiert?'}</h2>
        <p class="muted" style="margin:0 0 6px">${quiz ? 'Ein Spieler oder Gast.' : 'Ein oder mehrere Spieler – die Reihenfolge der Auswahl ist die Wurfreihenfolge.'}</p>
        <ul class="plist">${[{ id: GAST, name: 'Gast (ohne Statistik)' }, ...pl].map(p => {
          const i = setupSel.indexOf(p.id);
          return `<li data-sel="${p.id}" class="${i >= 0 ? 'sel' : ''}"><span class="av">${i >= 0 ? i + 1 : (p.id === GAST ? '?' : esc(p.name.slice(0, 2).toUpperCase()))}</span><span class="grow">${esc(p.name)}</span></li>`;
        }).join('')}</ul></div>
      <button class="btn primary block" data-act="start" ${setupSel.length ? '' : 'disabled'}>Training starten</button>`;
    const qt = $('qTheme'); if (qt) qt.onchange = () => { setupTheme = qt.value; };
  }

  function startSession() {
    const e = setupEx, bl = e.make(setupTheme);
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
      const task = b.task != null ? `<div class="note" style="border-color:var(--blue);background:#eef4fa"><b>${esc(PREC_TASKS[b.task].t)}</b><br>${esc(PREC_TASKS[b.task].setup)}<br><span style="display:block;margin-top:6px">💡 ${esc(PREC_TASKS[b.task].tip)}</span></div>` : '';
      const tipBox = e.tips ? `<details class="card tipbox"><summary>💡 Technik-Tipps</summary><ul class="tips">${e.tips.map(h => `<li>${esc(h)}</li>`).join('')}</ul></details>` : '';
      body = `${task}${tipBox}
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
    const s = b.sid ? sitById(b.sid) : SIT[b.sit], ans = st.res[0];
    if (!s) return '<div class="card muted">Diese Situation gibt es nicht mehr – bitte „Weiter“.</div>';
    const order = b.order || s.a.map((_, i) => i);
    const right = s.a.find(x => x[1]);
    return `<div class="card"><div class="muted" style="font-size:13px">${esc(THEMES[s.th] || '')}</div><h2>${esc(s.title)}</h2>${sitSvg(s)}<p style="margin:8px 0">${esc(s.q)}</p>
      <div class="obtns qa">${order.map(i => { const [t, ok] = s.a[i];
        const cls = ans ? (ok ? 'z1' : (ans.i === i ? 'z4' : '')) : '';
        return `<button class="ob ${cls}" data-quiz="${i}" ${ans ? 'disabled' : ''}>${esc(t)}</button>`;
      }).join('')}</div>
      ${ans ? `<div class="note" style="border-color:${ans.ok ? 'var(--ok)' : '#b44a35'};background:${ans.ok ? '#e3f1e7' : '#fde8e4'}"><b>${ans.ok ? 'Richtig.' : 'Nicht ganz.'}</b> ${esc(s.a[ans.i][2])}${ans.ok ? '' : `<br><br><b>Besser: ${esc(right[0])}.</b> ` + esc(right[2])}</div>` : ''}
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
    if (d.quiz) { const st = curStep(), bb = S.blocks[st.b], s = bb.sid ? sitById(bb.sid) : SIT[bb.sit], i = +d.quiz; if (!s) return; record({ i, ok: !!s.a[i][1], sid: s.id, th: s.th }); return; }
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
