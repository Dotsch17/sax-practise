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
| **Üben** | Session-Runner für drei Übe-Kontexte: Probelokal, zuhause leise, Travel Sax — mit Countdown, Merkpunkten und dem passenden Werkzeug direkt im Block |
| **Ton** | Stimmgerät mit Intonationskarte · Obertonübung mit Rückmeldung · Tonanalyse · Bordun |
| **Technik** | Tonleitern in allen Tonarten · Rhythmus mit Messung · Blattspiel · Griffe · Metronom |
| **Gehör** | Nachspielen mit Mikrofonkontrolle · Intervalle · Akkorde · Skalen |
| **Impro** | Grundlagen mit Griffrechner · Begleitband über zwölf Akkordfolgen · Call and Response · Gig-Training |
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
- **Nachspielen prüft mit dem Mikrofon.** Die App spielt eine Phrase, du
  spielst sie nach, und sie sagt dir Ton für Ton, ob du getroffen hast. Das
  ist die Übung, die man sonst nur zu zweit machen kann.
- **Die Begleitband zeigt gegriffene Akkorde.** Über einem klingenden C7
  steht groß „A7" — das, was du liest und spielst. Dazu wahlweise die Skala,
  die Zieltöne, die Akkordtöne oder ein Muster.
- **Die Session weiß, wo du bist.** Zuhause leise heißt nicht dieselbe
  Session leiser, sondern andere Blöcke: Atem, Ansatz ohne Instrument,
  pp-Töne, Griffe still. Am Travel Sax steht dabei, was dort *nicht* geht —
  Ansatz, Voicing, Obertöne, Klangfarbe.
- **Das Werkzeug steht im Block.** Kein Wechsel in einen anderen Reiter
  mitten in der Übung: Stimmgerät, Bordun oder Tonanalyse laden direkt unter
  dem Countdown.
- **Call and Response läuft über die Begleitband.** Die App spielt zwei
  Takte, du antwortest zwei Takte, das Mikrofon zählt mit. Im Tempo, ohne
  anzuhalten.
- **Die Obertonübung erkennt, welcher Teilton klingt** — über das
  Frequenzverhältnis, nicht über die nächste Klaviertaste. Der fünfte
  Teilton liegt 14 Cent tiefer als die Klaviertaste und ist trotzdem
  richtig; ein Stimmgerät würde dir hier das Falsche sagen.
- **Die Tonanalyse zeigt, ob der Ton steht.** Tonhöhe in Cent, Lautstärke und
  Klangfarbe über die ganze Dauer. Ein flackernder Verlauf heißt, dass Luft
  oder Ansatz wackeln — sichtbar, bevor man es hört.
- **Die Improvisations-Grundlagen erklären erst, dann üben sie.** Was eine
  Moll-Pentatonik ist, wofür sie taugt, wann sie schiefgeht. Dazu der
  Griffrechner: Tonart auf Spotify gehört, klingend eingegeben, Griff kommt
  heraus.
- **Das Gig-Training gibt Auflagen statt Freiheit.** Nur Zieltöne. Zwei Takte
  spielen, zwei schweigen. Ein einziges Motiv. Taktweise wechselnd über die
  laufende Band — genau die Beschränkungen, die aus Tonleiterläufen Musik
  machen.
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
Precache-Liste und rund 26 600 Einzelprüfungen in zehn Testsuiten
(Musiktheorie, Notensatz, Tonhöhenerkennung, Notenerkennung, Harmonielehre,
Licks, Obertöne, Übungsplan, Rhythmus- und Melodiegenerator).
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
