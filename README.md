# Übeplan Saxophon

Eine Übe-App für Altsaxophon, gebaut für die Vorbereitung auf die
Aufnahmeprüfung IGP Saxophon an der mdw. Sie führt durch die tägliche Session
für klassischen Ton und deckt daneben die Prüfungsdisziplinen ab — mit dem
Ziel, dass zum Üben kein zweites Werkzeug nötig ist.

**→ https://dotsch17.github.io/sax-practise/**

Läuft vollständig offline, ohne Konto, ohne Backend, ohne Tracking. Alle Daten
bleiben auf dem Gerät.

## Was drin ist

| Bereich | Werkzeuge |
|---|---|
| **Üben** | Session-Runner: sieben Blöcke, Countdown, Merkpunkte, vier Wochenpläne |
| **Ton** | Stimmgerät mit Intonationskarte · Bordun über zwölf klingende Tonhöhen |
| **Technik** | Tonleitern in allen Tonarten · Rhythmus mit Messung · Blattspiel · Metronom |
| **Gehör** | Intervalle · Akkorde · Skalen · höher oder tiefer |
| **Journal** | Protokoll · Auswertung · Repertoire · Wissen · Daten |

Ein paar Dinge, die es anderswo so nicht gibt:

- **Das Stimmgerät merkt sich, welche Töne du wie verstimmst.** Nach ein paar
  Sessions steht in der Intonationskarte deine eigene Liste — statt einer
  fremden, die für dein Instrument ohnehin nicht stimmt.
- **Griff und klingende Tonhöhe stehen überall nebeneinander.** Am
  Es-Instrument ist das der Unterschied zwischen „ich spiele ein A" und „im
  Raum kommt ein C an".
- **Der Rhythmus-Trainer misst.** Nach dem Durchgang steht da, ob du
  gleichmäßig streust oder durchgehend schleppst — zwei verschiedene Probleme
  mit zwei verschiedenen Lösungen.
- **Die Auswertung zeigt, welchen Block du systematisch auslässt.** Meistens
  ist es der, den du am nötigsten hättest.
- **Der Wissensteil geht vom Symptom aus.** Beim Üben hat man ein Problem,
  keine Frage.

## Auf dem iPhone installieren

In Safari öffnen, Teilen, „Zum Home-Bildschirm". Danach startet die App im
Vollbild und läuft vollständig offline — auch im Flugmodus.

## Drei Dinge, die man wissen muss

- **Der Bildschirm muss anbleiben.** iOS stoppt Web Audio, sobald die App in
  den Hintergrund geht. Solange ein Timer läuft, hält die App das Display per
  Wake Lock wach; Bildschirm sperren beendet Bordun und Metronom trotzdem.
- **Das Mikrofon braucht HTTPS.** Über die GitHub-Pages-Adresse funktioniert
  es; über eine lokale IP-Adresse nicht.
- **Exportiere ab und zu.** Safari löscht lokal gespeicherte Daten nach etwa
  sieben Tagen ohne Nutzung. Journal → Daten → „Daten exportieren" legt eine
  JSON-Datei ab, „Daten einlesen" holt sie zurück.

## Entwicklung

Kein Build-Schritt, keine Laufzeit-Abhängigkeiten. Lokal testen über einen
HTTP-Server, nicht über `file://` — ES-Module und Service Worker brauchen ihn:

```bash
python -m http.server 8000
```

Vor jedem Deployen:

```bash
node tools/check.mjs
```

Das prüft Syntax und Ladbarkeit aller Module, das Manifest, die
Precache-Liste und rund 12 500 Einzelprüfungen in fünf Testsuiten
(Musiktheorie, Notensatz, Tonhöhenerkennung, Rhythmus- und Melodiegenerator).
Was dort grün ist, kann trotzdem am Gerät scheitern — Audio, Mikrofon, Wake
Lock und Service Worker lassen sich nur dort testen. Was rot ist, ist am
Gerät sicher kaputt.

**Beim Deployen `VERSION` in [sw.js](sw.js) hochzählen**, sonst bekommen
installierte Geräte die Änderung nie zu sehen: der Browser erkennt eine neue
Fassung ausschließlich daran, dass sich `sw.js` byteweise unterscheidet.

Projektkontext, Designfestlegungen, fachliche Regeln und Roadmap stehen in
[CLAUDE.md](CLAUDE.md).

## Lizenzen

Der Code gehört zum Projekt. Mitgeliefert sind:

- **Instrument Serif** und **Barlow** als woff2-Subsets unter `fonts/`,
  SIL OFL 1.1, siehe [fonts/HERKUNFT.md](fonts/HERKUNFT.md).
- **Bravura**-Notenzeichen als SVG-Pfaddaten in `js/music/glyphs.js`,
  SIL OFL 1.1, einmalig mit `tools/extract-glyphs.py` extrahiert. Bewusst
  als Quellcode statt als Schriftdatei: so lädt die App zur Laufzeit nichts
  nach.

Der Lizenztext für alle drei liegt in [fonts/OFL.txt](fonts/OFL.txt).
