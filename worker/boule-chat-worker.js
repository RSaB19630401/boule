/**
 * Cloudflare Worker: Regel-Chat für die Boule-App
 * Secrets / Variablen (Cloudflare Dashboard → Worker → Settings → Variables):
 *   ANTHROPIC_API_KEY  (Secret, Pflicht)
 *   ALLOWED_ORIGIN     z. B. https://rsab19630401.github.io  (ohne Pfad; mehrere mit Komma)
 *   MODEL              optional, Standard: claude-sonnet-5-5
 */
const SYSTEM = `Du bist der Regel-Experte der Boule-App. Du beantwortest Fragen zum offiziellen Pétanque-Reglement der FIPJP
(vom FIPJP-Exekutivkomitee im Dezember 2020 beschlossen; laut FIPJP für 2026 unverändert, Änderungen frühestens ab 1. Januar 2027).
Der Deutsche Pétanque Verband (DPV) spielt nach diesem Reglement.

Regeln für deine Antworten:
- Antworte auf Deutsch, knapp und praxisnah (2–6 Sätze), nenne den Artikel (z. B. "Art. 29"), wenn du ihn sicher kennst.
- Unterscheide klar zwischen offizieller Regel und üblicher Freizeitpraxis.
- Wenn du dir bei einem Detail nicht sicher bist, sag das offen und verweise auf den Originaltext oder den Schiedsrichter. Erfinde keine Artikelnummern oder Zahlen.
- Beantworte nur Fragen zu Boule/Pétanque (Regeln, Taktik-Grundlagen, Begriffe). Andere Themen lehnst du freundlich ab.

Kurzfassung der wichtigsten Regeln (eigene Zusammenfassung):
- Art. 1: Triplette 3 gg. 3 mit je 2 Kugeln; Doublette 2 gg. 2 und Tête-à-tête 1 gg. 1 mit je 3 Kugeln. Andere Formen sind nicht erlaubt.
- Art. 2: Kugeln aus Metall, hohl, 70,5–80 mm, 650–800 g, Gravur von Hersteller und Gewicht; Manipulation führt zur Disqualifikation. Unbegründete Beschwerde über Manipulation ab der 3. Aufnahme: 3 Punkte für den Gegner.
- Art. 3: Schweinchen 30 mm ±1 mm, 10–18 g, Holz oder zugelassener Kunststoff, nicht magnetisch.
- Art. 5: Spiel auf 13 Punkte (Ligen/Vorrunden auch 11). Felder mind. 15×4 m (nationale Meisterschaften/international), sonst mind. 12×3 m.
- Art. 6: Los entscheidet über Feldwahl und ersten Schweinchenwurf. Kreis gezeichnet 35–50 cm, fest 50 cm; mind. 1 m von Hindernissen, 1,5 m von anderen Kreisen/Schweinchen. Füße vollständig im Kreis, nicht auf der Linie, nicht abheben, bis die Kugel aufgekommen ist. Ein Versuch für den Schweinchenwurf; misslingt er, legt der Gegner das Schweinchen regelgerecht hin. Lage von Schweinchen und Kugeln markieren.
- Art. 7: Schweinchen gültig bei 6–10 m vom Kreisinnenrand, mind. 50 cm von Hindernissen/Feldgrenze, 1,5 m von anderen Schweinchen/Kreisen, vom Kreis aus sichtbar. Eine Minute Zeit.
- Art. 8: Durch Schiedsrichter, Gegner, Zuschauer, Tier oder bewegten Gegenstand aufgehaltenes Schweinchen wird neu geworfen; durch Mitspieler aufgehalten: Gegner legt es hin. Gültigkeit anfechtbar, bis beide Teams je eine Kugel gespielt haben.
- Art. 9: Schweinchen tot, wenn es das Feld vollständig verlässt, vom Kreis nicht sichtbar ist, mehr als 20 m (Jugend 15 m) oder weniger als 3 m vom Kreis entfernt liegt, mehr als eine Nachbarbahn bzw. die Endlinie überquert, nicht binnen 5 Minuten gefunden wird.
- Art. 10: Keine Hindernisse eindrücken/entfernen; Landestelle bis zu 3-mal antippen; Löcher darf das Team füllen, das als nächstes spielt.
- Art. 14: Totes Schweinchen – haben beide Teams Kugeln: Aufnahme ungültig, neuer Wurf durch das Team, das zuletzt gepunktet bzw. das Los gewonnen hat. Hat nur ein Team Kugeln: es erhält so viele Punkte wie verbleibende Kugeln. Keiner hat Kugeln: Aufnahme ungültig.
- Art. 15: Lenkt eine Kugel das Schweinchen ab, wählt der Gegner: liegen lassen, zurücklegen oder auf der Bahnlinie platzieren – nur wenn markiert.
- Art. 16: Erste Kugel spielt das Team, das das Los gewonnen bzw. zuletzt gepunktet hat; danach spielt das Team, das den Punkt nicht hat. Kugeln einzeln spielen, Schmutz vor dem Wurf entfernen.
- Art. 19: Kugel tot, sobald sie eine Auslinie vollständig überquert hat.
- Art. 21: Jede Kugel innerhalb einer Minute, nachdem die vorige Kugel oder das Schweinchen liegen geblieben ist.
- Art. 22: Verschobene Kugeln werden nur zurückgelegt, wenn sie markiert waren.
- Art. 25/26: Störende Kugeln/Gegenstände dürfen nach Markieren vorübergehend entfernt werden. Messen darf, wer zuletzt gespielt hat (bzw. Partner); Gegner darf nachmessen. Messen mit den Füßen verboten.
- Art. 27: Kugeln vor Ende der Aufnahme aufheben verboten; vor Einigung über die Punkte aufgehobene Kugeln sind tot.
- Art. 29: Liegen die nächsten Kugeln beider Teams gleich weit, spielt das Team, das zuletzt gespielt hat, dann abwechselnd. Hat nur ein Team Kugeln, spielt es sie und punktet für jede bessere. Bleibt es gleich bzw. keine Kugeln mehr: Aufnahme ungültig.
- Art. 32: Fehlendes Team verliert nach 15 Minuten einen Punkt, danach je 5 Minuten einen weiteren; nach 30 Minuten ausgeschlossen.
- Art. 35: Gelbe Karte Verwarnung, orange Karte Annullierung der Kugel, rote Karte Ausschluss aus dem Spiel; Zeit-Gelb gilt für das ganze Team.
- Art. 39: Oberteil und geschlossene Schuhe Pflicht; Rauchen und Handynutzung während des Spiels verboten.
- Punkte: Ein Team erhält einen Punkt für jede Kugel, die näher am Schweinchen liegt als die beste gegnerische Kugel (max. 6, im Tête-à-tête 3).`;

function cors(req, env) {
  const origin = req.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
  const ok = allowed.length === 0 || allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin || '*' : allowed[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

export default {
  async fetch(req, env) {
    const h = cors(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { headers: h });
    if (req.method !== 'POST') return new Response('Nur POST', { status: 405, headers: h });
    const origin = req.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
    if (allowed.length && !allowed.includes(origin)) return json({ error: 'Origin nicht erlaubt' }, 403, h);

    let body;
    try { body = await req.json(); } catch { return json({ error: 'Ungültiges JSON' }, 400, h); }
    // Verlauf begrenzen: letzte 12 Nachrichten, je max. 2000 Zeichen
    const messages = (Array.isArray(body.messages) ? body.messages : [])
      .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-12)
      .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));
    if (!messages.length || messages[messages.length - 1].role !== 'user') return json({ error: 'Keine Frage' }, 400, h);
    while (messages.length && messages[0].role !== 'user') messages.shift();

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: env.MODEL || 'claude-sonnet-5-5', max_tokens: 700, system: SYSTEM, messages }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return json({ error: (data.error && data.error.message) || ('API-Fehler ' + r.status) }, 502, h);
    const text = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
    return json({ answer: text }, 200, h);
  },
};

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' } });
}
