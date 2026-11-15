/* Regelkunde – eigene, verkürzte Zusammenfassung des offiziellen FIPJP-Reglements
 * (Fassung vom Exekutivkomitee im Dezember 2020 beschlossen; laut FIPJP für 2026 unverändert,
 * Änderungen wären frühestens ab 1. Januar 2027 möglich). Im Zweifel gilt der Originaltext.
 */
window.BOULE_RULES = {
  stand: 'FIPJP-Reglement, Fassung Dezember 2020 (für 2026 unverändert)',
  sections: [
    {
      title: 'Spielformen & Material', arts: 'Art. 1–3',
      items: [
        ['Triplette', '3 gegen 3, je 2 Kugeln pro Spieler (6 pro Team).'],
        ['Doublette', '2 gegen 2, je 3 Kugeln pro Spieler (6 pro Team).'],
        ['Tête-à-tête', '1 gegen 1, je 3 Kugeln.'],
        ['Kugeln', 'Metall, hohl, 70,5–80 mm Durchmesser, 650–800 g, mit Hersteller- und Gewichtsgravur. Nachbearbeiten (z. B. Nachhärten) ist verboten.'],
        ['Schweinchen', '30 mm (±1 mm), 10–18 g, Holz oder zugelassener Kunststoff, nicht magnetisch.'],
      ],
    },
    {
      title: 'Spielfeld & Wurfkreis', arts: 'Art. 5–6',
      items: [
        ['Untergrund', 'Gespielt wird auf jedem Boden. Markierte Felder: mind. 15 × 4 m bei nationalen Meisterschaften und internationalen Turnieren, sonst mind. 12 × 3 m.'],
        ['Kreis', 'Gezeichnet 35–50 cm Durchmesser, fester Kreis 50 cm. Mind. 1 m von Hindernissen und 1,5 m von anderen Kreisen entfernt.'],
        ['Füße', 'Beide Füße bleiben im Kreis und am Boden, bis die geworfene Kugel aufgekommen ist.'],
        ['Auslosung', 'Das Los bestimmt, wer das Feld wählt und zuerst das Schweinchen wirft. Danach wirft das Team, das die letzte Aufnahme gewonnen hat.'],
      ],
    },
    {
      title: 'Schweinchen werfen', arts: 'Art. 6–8',
      items: [
        ['Distanz', '6–10 m vom Innenrand des Kreises.'],
        ['Abstände', 'Mind. 50 cm von Hindernissen und Feldgrenzen, 1,5 m von anderen Schweinchen oder Kreisen. Es muss vom Kreis aus sichtbar sein.'],
        ['Versuche', 'Das Team hat einen Versuch. Ist der Wurf ungültig, legt der Gegner das Schweinchen an eine regelgerechte Stelle.'],
        ['Zeit', 'Für den Wurf des Schweinchens gilt eine Minute.'],
        ['Aufgehalten', 'Hält ein Schiedsrichter, Gegner, Zuschauer, Tier oder bewegter Gegenstand das Schweinchen auf, wird neu geworfen. Hält es ein Mitspieler auf, legt der Gegner es hin.'],
      ],
    },
    {
      title: 'Spielablauf', arts: 'Art. 16, 21',
      items: [
        ['Erste Kugel', 'Spielt das Team, das das Schweinchen geworfen hat.'],
        ['Danach', 'Es spielt immer das Team, das den Punkt nicht hält, bis es keine Kugeln mehr hat.'],
        ['Zeit', 'Jede Kugel muss innerhalb einer Minute gespielt werden, nachdem die vorige Kugel oder das Schweinchen liegen geblieben ist.'],
        ['Zielfläche', 'Der Werfer darf die Landestelle bis zu dreimal mit einer Kugel antippen, aber keine Hindernisse wegdrücken oder entfernen.'],
      ],
    },
    {
      title: 'Tote Kugel & totes Schweinchen', arts: 'Art. 9, 14, 19',
      items: [
        ['Tote Kugel', 'Eine Kugel ist tot, sobald sie eine Auslinie vollständig überquert hat.'],
        ['Totes Schweinchen', 'Es ist tot, wenn es das Spielfeld vollständig verlässt, vom Kreis aus nicht sichtbar ist, weiter als 20 m oder näher als 3 m vom Kreis liegt, oder nicht innerhalb von 5 Minuten gefunden wird.'],
        ['Folge (beide haben Kugeln)', 'Die Aufnahme ist ungültig; sie wird neu gespielt.'],
        ['Folge (nur ein Team hat Kugeln)', 'Dieses Team erhält so viele Punkte, wie es noch Kugeln in der Hand hat.'],
        ['Folge (keiner hat Kugeln)', 'Die Aufnahme ist ungültig.'],
      ],
    },
    {
      title: 'Markieren & verschobene Kugeln', arts: 'Art. 15, 22, 27',
      items: [
        ['Markieren', 'Lage von Schweinchen und Kugeln markieren. Nur markierte Kugeln können zurückgelegt werden.'],
        ['Schweinchen verschoben', 'Wird es durch eine Kugel abgelenkt, entscheidet der Gegner, ob es liegen bleibt, zurückgelegt oder auf der Bahnlinie platziert wird. Das geht nur, wenn die Lage markiert war.'],
        ['Kugeln aufheben', 'Vor Ende der Aufnahme verboten. Kugeln, die aufgehoben werden, bevor die Punkte vereinbart sind, zählen nicht.'],
      ],
    },
    {
      title: 'Messen & Punkte', arts: 'Art. 5, 25, 26, 29',
      items: [
        ['Wer misst', 'Wer die letzte Kugel gespielt hat (oder ein Partner). Danach darf der Gegner nachmessen. Messen mit den Füßen ist verboten.'],
        ['Hindernisse', 'Störende Kugeln oder Gegenstände dürfen nach dem Markieren vorübergehend entfernt werden.'],
        ['Punkte', 'Ein Team erhält einen Punkt für jede Kugel, die näher am Schweinchen liegt als die beste Kugel des Gegners.'],
        ['Gleich weit', 'Liegen die nächsten Kugeln beider Teams gleich weit entfernt, spielt das Team weiter, das zuletzt gespielt hat, dann abwechselnd. Hat nur ein Team noch Kugeln, spielt es sie und punktet für jede, die besser liegt. Bleibt es gleich, ist die Aufnahme ungültig.'],
        ['Spielende', 'Gespielt wird auf 13 Punkte (in Ligen und Vorrunden auch 11). Kein Zwei-Punkte-Vorsprung nötig.'],
      ],
    },
    {
      title: 'Disziplin & Strafen', arts: 'Art. 32, 35, 39',
      items: [
        ['Karten', 'Gelb: Verwarnung. Orange: Annullierung der Kugel. Rot: Ausschluss aus dem Spiel. Bei Zeitüberschreitung gilt Gelb für das ganze Team.'],
        ['Verspätung', 'Nach 15 Minuten verliert ein fehlendes Team einen Punkt, danach je 5 Minuten einen weiteren. Nach 30 Minuten wird es ausgeschlossen.'],
        ['Verhalten', 'Oberteil und geschlossene Schuhe sind Pflicht. Rauchen und Handynutzung während des Spiels sind untersagt.'],
      ],
    },
  ],
  quick: [
    'Wann ist das Schweinchen tot?',
    'Wer darf messen?',
    'Beide Kugeln gleich weit weg – was nun?',
    'Darf ich eine Kugel vor dem Zählen aufheben?',
  ],
};
