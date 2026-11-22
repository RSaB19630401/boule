# Boule-App (PWA) – Version 1

Fünf Reiter: **Messen** (Kamera → die 6 nächsten Kugeln mit Abstand), **Spielstand**, **Spieler** (Liste, Statistik, Rangliste), **Regeln** (Übersicht + Regel-Chat), **Trainer**.

## Dateien
| Datei | Zweck |
|---|---|
| `index.html` | Oberfläche + Styles |
| `app.js` | App-Logik (Kamera, Libelle, Auswertung, Spielstand, Chat) |
| `detect.js` | Kugel- und Schweinchenerkennung (OpenCV.js) |
| `stats.js` | Statistik (Siege, Partner/Gegner, Verlauf, Rangliste) |
| `trainer.js` | Trainer: Übungskatalog, geführte Einheiten, Auswertung |
| `rules.js` | Regelübersicht (eigene Kurzfassung FIPJP, Stand Dez. 2020 – für 2026 unverändert) |
| `sw.js`, `manifest.webmanifest`, `icon*.{svg,png}` | Offline-Fähigkeit, „Zum Home-Bildschirm“ |
| `worker/boule-chat-worker.js` | Cloudflare Worker für den Regel-Chat (nicht nach GitHub Pages hochladen nötig) |

## Einrichtung (nur Browser)
1. **GitHub:** neues Repo, z. B. `boule`, alle Dateien außer `worker/` hochladen → Settings → Pages → Branch `main`, Ordner `/` → URL z. B. `https://rsab19630401.github.io/boule/`.
2. **Cloudflare Worker:** Dashboard → Workers → *Create* → Name `boule-chat` → Code aus `worker/boule-chat-worker.js` einfügen → Deploy.
   - Settings → Variables: Secret `ANTHROPIC_API_KEY`, Variable `ALLOWED_ORIGIN` = `https://rsab19630401.github.io`, optional `MODEL` (Standard `claude-sonnet-5-5`, günstiger: `claude-haiku-5-5`).
3. In der App ⚙️ → Worker-Adresse prüfen (Standard `https://boule-chat.rsab1963.workers.dev`).
4. Auf dem Handy öffnen → „Zum Home-Bildschirm“. Kamera nur über HTTPS (GitHub Pages passt).

## So funktioniert das Messen
- Libelle über den Lagesensor; ist das Handy ~1 s waagerecht (< 2,5°), wird automatisch ausgelöst (abschaltbar).
- Erkennung: Kreise (Hough) auf mehreren Glättungsstufen, jede Kandidatin wird an der Randkante geprüft; Schweinchen zuerst über Farbe, sonst über Form.
- Maßstab über den bekannten Kugeldurchmesser (⚙️, Standard 73 mm). Abstand = Kante zu Kante.
- **Höhen- und Neigungskorrektur (v4):** Kamerahöhe aus der Kugelgröße, Neigung aus dem Lagesensor (nur Hochformat, ≤ 15°); jede Position wird auf ihre Bodenlage zurückgerechnet (Kugelmitte 36,5 mm, Schweinchenmitte 15 mm hoch). Brennweite (KB-äquiv., Standard 26 mm) in ⚙️. Bei Fotos aus der Galerie nur Höhenkorrektur.
- Korrektur: „+ Kugel“, „− Kugel“, „Schweinchen“ antippen; „Nahansicht“ zoomt auf Schweinchen + Platz 1–2.
- Beim ersten Messen werden ca. 10 MB OpenCV geladen, danach aus dem Cache (offline).

## Ehrliche Grenzen (Stand Test mit synthetischen Bildern)
- Bei weichem Licht: ~5 mm mittlerer Fehler, Reihenfolge korrekt, solange alle Kugeln erkannt sind.
- **Harter Sonnenschatten** verschiebt die Kreismitten um 1–3 cm → selbst Schatten spenden.
- Unter dem eingestellten „knapp“-Wert (Standard 1,5 cm) zeigt die App „nachmessen“.
- Im offiziellen Wettkampf ist Handynutzung während des Spiels untersagt (Art. 39); es zählt die Messung durch Spieler/Schiedsrichter.
- **Nächster Schritt:** mit echten Fotos vom Platz die Parameter in `detect.js` nachjustieren.

## Spieler & Statistik (v2)
- Spieler anlegen (Name, Kürzel, Lizenz-Nr., Kontakt, aktiv); beim Spielstart je Team aus der Liste wählen.
- Statistik je Spieler: Siege/Niederlagen, Punkte, je Spielform, beste Partner, schwierigste Gegner (ab 2 gemeinsamen Spielen), Verlauf.
- Rangliste nach Siegquote, dann Punktdifferenz; Mindestanzahl Spiele in ⚙️ (Standard 3).
- Daten nur auf dem Handy → regelmäßig **Exportieren** (JSON). Import führt zusammen, überschreibt nichts.

## Trainer (v3)
- **Legen:** Distanzleiter (6–10 m), Zufallsdistanz, Kurz–lang. Erfassung per Zone (≤10 / 10–30 / 30–50 / >50 cm) oder per Kamera je Runde.
- **Schießen:** Trefferserie (6–9 m, Carreau/Treffer/Fehl), Kugel am Schweinchen, Schweinchen schießen.
- **Präzisionsschießen:** komplett (5 Aufgaben × 6–9 m, max. 100) und kurz (6 m, max. 25); vereinfachte Wertung 5/3/1/0 nach DPV-Richtlinie DM Tireur (Stand 03/2026).
- **Taktik-Quiz (v8):** 25 Situationen mit maßstäblicher Skizze, je 3 Antworten (gemischt) und Erklärung; Themen Legen oder Schießen, Kugelzählen & Spielstand, Schweinchen & Regeln, Rollen im Team. „Taktik-Quiz“ zieht 10 zufällige, „nach Thema“ geht ein Thema komplett durch. Regelfragen nach FIPJP (Art. 14, 16, 27, 29), Taktik = Empfehlungen.
- Einzeln oder Gruppe (Auswahlreihenfolge = Wurfreihenfolge), „Gast“ ohne Statistik; laufende Einheit übersteht einen Neustart.
- Auswertung je Spieler und Bereich; Trainings sind im Export enthalten.

## Ideen für später
Turniermodus (Supermêlée), Trainer (Legen/Schießen mit Messung), Messung direkt in den Spielstand übernehmen.
