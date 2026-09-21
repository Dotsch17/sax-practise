# CLAUDE.md — Übeplan Saxophon

Diese Datei ist der dauerhafte Projektkontext. Lies sie vollständig, bevor du
Code änderst. Wenn sich eine Entscheidung ändert, aktualisiere sie hier.

---

## 1. Was das ist

Eine Übe-App für einen einzelnen Nutzer: Dominik, Visual-Computing-Master an
der TU Wien, spielt Altsaxophon (Yamaha YAS-480), bereitet sich auf die
Aufnahmeprüfung IGP Saxophon an der mdw vor. Die App führt durch eine
strukturierte tägliche Übe-Session für klassischen Ton und deckt daneben die
Prüfungsdisziplinen ab: Stimmgerät mit Intonationskarte, Bordun, Metronom,
Tonleitern, Rhythmus, Blattspiel, Gehörbildung, Nachspielen nach Gehör,
Improvisation mit Begleitband, Auswertung, Repertoire, eigene Griffe und
einen Wissensteil. Ziel ist, dass zum Üben kein zweites Werkzeug nötig ist.

**Primärer Nutzungskontext, der alle UI-Entscheidungen bestimmt:** Das iPhone
steht am Notenständer im Probelokal. Der Nutzer hat beide Hände am Instrument,
liest aus etwa 60 cm Entfernung und will mit einem Blick und einem Fingertipp
auskommen. Große Flächen, große Ziffern, kein Scrollen für die Hauptaktion,
dunkler Grund gegen Blendung. Alles, was mehr als zwei Taps braucht, ist falsch
entworfen.

Es gibt genau einen Nutzer. Kein Login, keine Nutzerverwaltung, kein Backend,
keine Analytics, keine Mehrsprachigkeit. Oberfläche und Code-Kommentare sind
auf Deutsch, Bezeichner im Code auf Englisch.

## 2. Nicht-Ziele

- App Store. PWAs sind dort nicht zulässig (App Store Review Guideline 4.2.2,
  „repackaged websites"). Verteilung läuft über GitHub Pages plus
  „Zum Home-Bildschirm".
- Mehrere Nutzer, Synchronisation zwischen Geräten, Cloud-Konto.
- Ein Framework. Der Umfang hat die Einzeldatei gesprengt, aber die Antwort
  darauf waren native ES-Module, nicht Vite plus React. Null Abhängigkeiten
  und kein Build-Schritt sind das Wertvollste am Projekt: eine App, die in
  zehn Jahren noch startet.
- Playalongs, Aufnahmen fremder Stücke, Notenbibliothek.
- **Mitgelieferte** Grifftabellen. Griffe unterscheiden sich am Instrument,
  besonders im Altissimo; eine abgeschriebene Tabelle wäre für genau dieses
  Alt vermutlich falsch. Das Werkzeug „Griffe" liefert deshalb nur das
  Klappenbild, die Griffe trägt der Nutzer selbst ein.

## 3. Zielplattform und harte Einschränkungen

Ziel ist iOS Safari als Home-Screen-Webapp. Diese Punkte sind recherchiert und
gelten als gesetzt — nicht neu herleiten, nicht dagegen anprogrammieren:

- **Home-Screen-Webapps funktionieren in der EU.** Apple hatte die Entfernung
  für iOS 17.4 angekündigt und diese Entscheidung am 1. März 2024
  zurückgenommen. Ältere Artikel behaupten das Gegenteil.
- **Web Audio wird im Hintergrund suspendiert.** Bildschirm sperren oder App
  wegwischen stoppt Bordun, Metronom und Timer-Ton. Es gibt keine verlässliche
  Umgehung im Web. Gegenmaßnahme ist die Screen Wake Lock API, damit das
  Display anbleibt, solange ein Timer läuft. Das ist im Nutzungskontext
  akzeptabel und bereits umgesetzt.
- **Safari löscht lokalen Speicher.** Intelligent Tracking Prevention entfernt
  script-schreibbaren Speicher nach etwa sieben Tagen ohne Interaktion.
  Konsequenz: localStorage ist nie die einzige Kopie. JSON-Export und -Import
  sind Pflichtfunktionen und bleiben es.
- **getUserMedia funktioniert**, in Safari und seit iOS 16.4 auch in
  installierten Home-Screen-Webapps. Voraussetzung ist ein sicherer Kontext,
  also HTTPS. GitHub Pages liefert das; lokale Tests über eine IP-Adresse
  nicht, dort einen Tunnel verwenden.
- **Ausweg, falls eine dieser Grenzen blockierend wird:** Capacitor um denselben
  Code legen. Das gibt Hintergrund-Audio und ein echtes Dateisystem. Deshalb
  darf die Audio-Schicht niemals DOM-Abhängigkeiten enthalten.

Timer rechnen immer gegen `Date.now()` mit gespeichertem Zielzeitpunkt, nie per
Sekunden-Dekrement — gedrosselte Timer verlieren sonst Zeit.

## 4. Aktueller Stand

Eine installierbare PWA ohne Build-Schritt und ohne Laufzeit-Abhängigkeiten.

```
index.html      Gerüst und Einstiegspunkt
manifest.json   Name, Icons, Vollbildstart
sw.js           Service Worker, versionierter Precache für den Offlinebetrieb
css/            base, shell, tools, responsive
js/             der gesamte Code, siehe Tabelle unten
icons/          192, 512, maskable 512, apple-touch-icon 180
fonts/          Instrument Serif und Barlow als woff2, selbst gehostet
tools/          Entwicklungswerkzeuge und Tests, nie Teil der App
```

**Die Werkzeuge, nach Bereichen:**

| Bereich | Werkzeuge |
|---|---|
| Üben | Session-Runner: Übe-Kontext wählen, Blöcke, Countdown, Merkpunkte, Werkzeug im Block |
| Ton | Stimmgerät mit Intonationskarte, Obertonübung, Tonanalyse, Bordun |
| Technik | Tonleitern, Rhythmus mit Messung, Blattspiel, Griffe, Metronom |
| Gehör | Nachspielen mit Mikrofonkontrolle, Intervalle/Akkorde/Skalen |
| Impro | Grundlagen, Begleitband, Tonart finden, Zum Song spielen, Call and Response, Gig-Training |
| Journal | Protokoll, Auswertung, Repertoire, Wissen, Daten |

**Drei Übe-Kontexte statt eines Plans.** Der Nutzer übt an drei verschiedenen
Orten, und das sind drei verschiedene Sessions: im Probelokal mit vollem Ton,
zuhause leise mit Rücksicht auf die Nachbarn, und am Travel Sax für die
Technik. Die Kontexte stehen in `KONTEXTE` in `js/data/plan.js`, `planFor()` liefert
die Blöcke dazu. Der Probelokal-Kontext ist der unveränderte Plan aus `BLOCKS`,
nur um eine Werkzeugzuordnung ergänzt — `BLOCKS` selbst wird nicht angefasst.
Der Travel-Sax-Kontext trägt eine Warnung: Ansatz, Voicing, Obertöne und
Klangfarbe lassen sich dort nicht üben, und das muss dastehen, sonst hält man
das digitale Blasrohr für ein Saxophon.

**Das Werkzeug steht im Block.** Jeder Block nennt das Werkzeug, mit dem man
ihn übt, und der Session-Runner lädt es per `import()` direkt unter den
Countdown. Ein Block, dessen Werkzeug in einem anderen Reiter liegt, wird
nicht geübt.

Bordun und Metronom laufen über Bereichswechsel hinweg weiter; der Streifen
„läuft gerade" über der Reiterleiste schaltet sie von überall ab.

Der Code liegt in ES-Modulen. Kein Build-Schritt, keine
Laufzeit-Abhängigkeiten. Aufteilung:

| Ordner | Inhalt |
|---|---|
| `js/core/` | DOM-Helfer, Zustand und Speicherung, Session-Timer und Wake Lock |
| `js/audio/` | AudioContext, Bordun, Metronom, Signale, Tonhöhenerkennung, Notenerkennung, Begleitung |
| `js/music/` | Theorie, Harmonielehre, Notensatz, Notenzeichen, Griffbild, Rhythmus- und Melodiegenerator |
| `js/data/` | Übungsplan, Übe-Kontexte, Wissenstexte, Improvisations-Grundlagen — alles Inhaltliche |
| `js/tools/` | ein Modul je Werkzeug, alle mit derselben Schnittstelle |
| `js/views.js` | welches Werkzeug in welchem Bereich steht |
| `js/main.js` | Navigation, Startsequenz, Service-Worker-Registrierung |
| `css/` | `base.css` Tokens und Schriften, `shell.css` Gerüst, `tools.css` Bausteine, `responsive.css` alles ab 600 px |

**Regeln, die nicht verhandelbar sind:**

- Alle inhaltlichen Änderungen am Übungsplan passieren ausschließlich in
  `js/data/plan.js`. Nirgends sonst stehen Blocknamen, Minuten oder
  Merkpunkte. Dasselbe gilt für `js/data/wissen.js`.
- `js/audio/` und `js/music/` enthalten **kein DOM**. Das ist nicht Stilfrage:
  falls iOS blockierend wird, wandert derselbe Code unter Capacitor, und dort
  gibt es kein `document`. Anzeigen hängen sich über Rückrufe ein
  (`onBeat`, `onPitch`, `onChange`).
- Jedes Werkzeug exportiert `{ id, label, mount(root), unmount?() }`.
  `unmount()` bekommt **kein** Argument und muss alles abräumen, was `mount()`
  angelegt hat — besonders Zuhörer auf `document` und laufende Timer.
- Was ohne Browser prüfbar ist, wird geprüft: Theorie, Harmonielehre,
  Notensatz, Tonhöhen- und Notenerkennung sowie die Rhythmus- und
  Melodiegeneratoren liegen bewusst DOM-frei, damit sie das können.

## 5. Design — festgelegt, nicht neu erfinden

Farbwelt ist das Innenfutter eines Instrumentenkoffers. Messing ist die einzige
Akzentfarbe und markiert ausschließlich „läuft gerade" oder „aktiv". Keine
zweite Akzentfarbe einführen.

```
--ground     #0C2226   Grund
--surface    #123236   Karten, Listenzeilen
--surface-hi #18434A   gedrückter Zustand
--line       #1E4E56   Trennlinien
--brass      #C89B4A   Akzent
--brass-dim  #8A6C34   Akzent gedämpft
--cane       #ECE3D0   Haupttext
--cane-dim   #8FA5A6   Nebentext
```

Schrift: Instrument Serif für Countdown-Ziffern und Überschriften, Barlow für
alles andere, mit Fallback auf Georgia beziehungsweise system-ui. Beide liegen
seit Phase 2 als woff2-Subsets unter `fonts/` im Repo und werden nicht mehr von
Google geladen — sonst sähe der erste Start ohne Netz falsch aus. Herkunft,
Subsets und Lizenz stehen in `fonts/HERKUNFT.md`. Die App muss ohne Netz
benutzbar bleiben, deshalb dürfen Schriften nie funktionskritisch sein:
Notenzeichen wie ♯ und ♭ sind in den Subsets nicht enthalten und kommen wie
bisher aus der Systemschrift.

Was daraus folgt und beim Bauen schon zweimal schiefging:

- Richtig und falsch werden **nicht** über Grün und Rot unterschieden,
  sondern über Messing gegen gedämpft, plus ein Zeichen (✓ und ✕) und eine
  andere Strichart. Das hält die eine Akzentfarbe ein und ist bei
  Rotblindheit lesbar.
- `[hidden]` ist in `base.css` mit `!important` erzwungen. Die Browser-Regel
  hat sehr niedrige Spezifität, und jede eigene Regel mit `display:flex`
  schlägt sie — dann steht ein Element sichtbar da, obwohl der Code es
  versteckt hat.
- Auswahlreihen mit vielen Einträgen bekommen `.chips.scroll`: einzeilig und
  seitlich scrollbar. Umbrechende Chips schieben die Hauptsache unter die
  Falz.

Notenzeichen kommen aus `js/music/glyphs.js`, nicht aus einer Schrift. Die
Umrisse stammen aus Bravura (SIL OFL 1.1) und wurden einmalig mit
`tools/extract-glyphs.py` in Pfaddaten übersetzt. Bewusst als Quellcode statt
als Schriftdatei: so kommt zur Laufzeit nichts dazu.

**Was klingt, steht im Streifen „läuft gerade".** Bordun, Metronom,
Begleitband und jedes Vorspiel melden sich dort an und gehen mit einem
Fingertipp wieder aus — das ist die einzige Stelle, an der man nicht wissen
muss, welches Werkzeug den Ton angemacht hat. Wer eine neue Klangquelle baut,
meldet sie dort an; wer ein Werkzeug baut, das die Band startet, hört auf
`band.onStateChange` und richtet seine Anzeige danach, sonst steht der eigene
Knopf auf „Abbrechen", während längst nichts mehr läuft.

**Das Telefon ist der Ausgangspunkt, nicht der einzige Fall.** Geübt wird auch
am iPad auf dem Notenständer und am Laptop. Alles über 600 px steht in
`css/responsive.css`, in drei Stufen: ab 600 px mehr Luft und größere
Ziffern, ab 960 px wandert die Reiterleiste vom unteren Rand an die linke
Seite und wird zur Spalte, ab 1280 px wird der Inhalt breiter. Die
Grundregeln gelten in jeder Stufe: 58 px Mindesthöhe, ein Blick, ein Tipp.
Wer eine neue Ansicht baut, prüft sie in allen drei Breiten — am Telefon
stimmt fast alles von selbst, am Laptop fast nichts.

Weitere Vorgaben: Mindesthöhe 58 px für alle primären Bedienelemente,
maximale Spaltenbreite 480 px am Telefon, `prefers-reduced-motion` respektieren,
sichtbarer Tastaturfokus, `env(safe-area-inset-*)` beachten. Keine
Einblend-Animationen beim Seitenaufbau.

## 6. Datenmodell

Ein einziges Objekt in localStorage unter `sax.uebeplan.v2`. Bewusst eines,
damit Export und Import trivial bleiben.

```js
{
  v: 2,
  week: 1..4,
  day:  { date: "YYYY-MM-DD", done: [blockId], spent: { blockId: seconds } },
  log:  [ { date, week, blocks: [name], minutes, spent, note } ],
  settings: { droneVol, bpm, beats, a4, naming, pitchView, metroSound, countIn },
  drills: { "<id>": { ... } },     // Fortschritt je Übung, frei geformt
  repertoire: [ { id, titel, komponist, status, stellen: [...], notiz } ],
  read: [artikelId],
}
```

`drills` ist bewusst flach und nach Übung getrennt, damit eine neue Übung
keine Migration braucht. Die Schlüssel sind sprechend:
`skala:dur:C-Dur`, `gehoer:intervalle:leicht`, `rhythmus:2`,
`blattspiel:3`, `stimmgeraet:noten`.

Beim Laden wird `day` verworfen, wenn das Datum nicht dem heutigen entspricht.
Die Migration von `v1` läuft automatisch; `v1` bleibt als Sicherung liegen und
wird nicht gelöscht.

Bei jeder Schemaänderung den Schlüssel hochzählen und eine Migration von der
Vorversion schreiben — der Nutzer hat dann echte Übungsdaten drin.

## 7. Fachliches, das im Code korrekt bleiben muss

- Das Altsaxophon ist in Es. Der Griff ist die klingende Tonhöhe plus eine
  große Sexte, also plus 9 Halbtöne. Klingend B entspricht Griff G. Die
  Bordun-Tasten zeigen beides an; diese Zuordnung nie „vereinfachen".
- Bordun-Bezug: A3 = 220 Hz, Tonvorrat C3 bis H3.
- Der Übungsplan stammt aus einem ausgearbeiteten Vier-Wochen-Konzept für
  klassischen Ton. Reihenfolge und Merkpunkte sind fachlich begründet und nicht
  beliebig umsortierbar. Bei Unsicherheit nachfragen statt raten.
- Der Nutzer arbeitet am Altissimo-Register; G, G♯ und A gelingen teilweise.
  Der nächste Schritt ist nicht ein neuer Ton, sondern Verlässlichkeit.
- **Deutsche Tonnamen sind der Standard**: H ist der Ton unter C, B ist H
  erniedrigt. Ohne Tonartzusammenhang gilt die Bläser-Schreibweise
  C Des D Es E F Fis G As A B H — dafür gibt es `chromatic()` in `theory.js`,
  und ein Test hält fest, dass die zwölf Bordun-Tasten genau so heißen wie in
  der ersten Fassung.
- **Skalen und Intervalle werden über Stufen buchstabiert, nie über
  Halbtöne.** Die siebte Stufe in a-Moll harmonisch ist ein Gis, kein As;
  eine große Terz über Fis ist ein Ais, kein B. Beides klingt gleich und
  liest sich falsch. Dafür gibt es `buildScale()`, `buildChord()` und
  `intervalFrom()`.
- **Vorzeichnungen kommen aus dem buchstabierten Grundton**
  (`majorKeySignature`), nicht aus der Tonhöhenklasse: Ges-Dur hat sechs Ben,
  Fis-Dur sechs Kreuze, und beides klingt gleich.
- **Was der Nutzer greift, ist die Hauptangabe**, klingend steht daneben —
  außer in der Gehörbildung. Die wird am Klavier geprüft, also klingend.
- **Bei der Improvisation ist das die teuerste Verwechslung überhaupt.** Die
  Begleitung klingt klingend, die Akkordsymbole stehen gegriffen. Über einem
  klingenden C7 liest man A7. Wer das dreht, übt über die falschen Töne und
  merkt es nicht, weil die Begleitung ja richtig klingt.
- **Zieltöne sind Terz und Septime** und in `harmonie.js` eine eigene Größe,
  nicht etwas, das man aus der Akkordtabelle heraussucht. Sie tragen die
  Harmonie; wer beim Üben nur sie spielt, klingt nach Musik, bevor Skalen
  sitzen.
- **Griffe stehen nicht im Code.** Altissimo-Griffe unterscheiden sich am
  Instrument; eine abgeschriebene Tabelle wäre für genau dieses Alt
  vermutlich falsch. `griffbild.js` kennt nur die Klappenanordnung, die
  Griffe selbst liegen in den Nutzerdaten und werden in der App eingetragen.
- **Balken folgen der Zählzeit, in der eine Note beginnt** — nicht der
  Summe der Dauern. Ragt eine Note über die Zählzeit hinaus, fängt die
  nächste Gruppe trotzdem erst beim nächsten Schlag an. Wer nach jedem
  Überlauf von vorn zählt, verschiebt alle folgenden Balken um den Überhang,
  und dann zeigt der Balken genau das nicht mehr, wofür er da ist. Steht in
  `autoBeam()` und ist mit Synkopen, Pausen und Taktstrichen getestet.
- **Teiltöne werden mit ihrer echten Frequenz vorgespielt**, nicht über die
  nächste MIDI-Nummer: `playFreqs()` in `signals.js`. Der siebte Teilton
  läge sonst 31 Cent daneben — ausgerechnet der, der ohnehin am
  schwersten kommt.
- Tonleitern und Blattspiel bleiben im notierten Umfang B3 bis Fis6
  (`RANGE` in `theory.js`). Eine Übung, die darüber hinausläuft, ist
  unbrauchbar.

## 8. Roadmap

**Phase 1 bis 3 — abgeschlossen.** Session-Runner mit Bordun, Metronom und
Protokoll; PWA mit Offlinebetrieb; Auswertung, die zeigt, welcher Block
regelmäßig ausgelassen wird.

**Phase 4 — Modulsplit statt Framework, abgeschlossen.** Die ursprüngliche
Planung sah Vite plus React vor. Der Umfang hat die Einzeldatei tatsächlich
gesprengt, aber die Antwort darauf waren native ES-Module: das behält null
Abhängigkeiten und keinen Build-Schritt und ist genau die Schnittkante, die
die alte Modultabelle schon vorzeichnete. Diese Entscheidung bleibt, solange
sie trägt.

**Phase 5 — Tonhöhenerkennung, teilweise umgesetzt.**
- Umgesetzt: YIN in `js/audio/pitch.js`, Stimmgerät mit Cent-Anzeige für
  Griff und klingende Tonhöhe, Intonationskarte über viele Sessions.
- Bewusst anders als geplant: die Erkennung läuft im Hauptthread über einen
  `AnalyserNode`, nicht in einem AudioWorklet. Für ein Stimmgerät ist das
  schnell genug (1,2 ms je Durchlauf bei 30 Messungen je Sekunde), und ein
  Worklet wäre nur bei einem hörbaren Regelkreis nötig. Falls das je
  gebraucht wird, ist der Wechsel lokal: `pitch.js` hat keine
  DOM-Abhängigkeiten.
- Die in Abschnitt 3 genannten 10 ms Latenz sind für tiefe Töne physikalisch
  nicht erreichbar. Eine verlässliche Grundtonerkennung braucht rund zwei
  Perioden; bei klingend Des3 sind das 15 ms. Das Fenster ist 2048 Punkte,
  also gut 40 ms.

**Phase 6 — Improvisation und Gehör am Instrument, umgesetzt.**
- `harmonie.js`: Akkordarten mit Skala und Zieltönen, neun Akkordfolgen,
  Muster. Folgen werden klingend gespeichert und gegriffen angezeigt.
- `begleitung.js`: Bass, Comping und Becken aus Web Audio, mit Swing als
  Verhältnis statt als Schalter. Derselbe vorausschauende Scheduler wie beim
  Metronom, aber mit absolut gerechneten Positionen statt fortlaufend
  addierter — das summiert keine Rundungsfehler und übersteht Tempowechsel.
- `notenfolge.js`: macht aus dem Tonhöhenstrom einzelne Noten. Der Sammler
  ist ein reiner Zustandsautomat und deshalb ohne Mikrofon prüfbar; die
  Fälle, die beim Saxophon wirklich vorkommen — Oktavsprung bei der
  Ansprache, gebundene Töne ohne Lücke, Wackler mitten im Ton — stehen
  als Tests drin.
- Nachspielen: die App spielt eine Phrase, der Nutzer spielt sie nach, das
  Mikrofon prüft. Verglichen wird klingend, angezeigt wird der Griff.

**Phase 7 — Rückmeldung am Instrument, umgesetzt.**
- `tonanalyse.js`: einen langen Ton aufnehmen, Tonhöhenverlauf in Cent,
  Hüllkurve und spektralen Schwerpunkt über die Zeit zeigen. Zweck ist nicht
  die Note, sondern die Stabilität: ein flackernder Schwerpunkt heißt, dass
  Ansatz oder Luft wackeln, und das sieht man, bevor man es hört.
- `obertoene.js` plus `music/obertoene.js`: welcher Teilton klingt gerade,
  und stimmt das Matching gegen den gegriffenen Ton. Erkannt wird über das
  **Frequenzverhältnis** zum Grundton, nicht über die nächste Klaviertaste —
  der fünfte Teilton liegt 14 Cent, der siebte 31 Cent unter der
  gleichstufigen Tonhöhe und ist trotzdem richtig. Wer hier ein Stimmgerät
  anlegt, korrigiert einen Ton kaputt, der stimmt.
- `callresponse.js`: die App spielt zwei Takte über die Begleitung, der
  Nutzer antwortet zwei Takte, das Mikrofon zählt mit. Die Phasen werden
  **absolut** gezählt (`durchgang * taktzahl + takt`), nicht innerhalb der
  Form — sonst kippt es an jeder Formgrenze, deren Taktzahl kein Vielfaches
  der Phasenlänge ist. Bei zwölf Takten und vier Takten Phase heißt das:
  nach dem Formende acht Takte Vorspiel am Stück.

**Phase 8 — Vom Übezimmer auf die Bühne, umgesetzt.** Das erklärte Ziel ist
nicht nur die Aufnahmeprüfung, sondern auf Events, Aperitivi und Hochzeiten
mit DJ zu spielen. Das ist eine andere Disziplin als klassischer Ton und
braucht eigene Werkzeuge.
- `data/improwissen.js` und `grundlagen.js`: was eine Moll-Pentatonik *ist*,
  wofür sie taugt, wann sie schiefgeht, was der erste Schritt damit ist. Eine
  Skala, die man nur greifen kann, hilft beim Improvisieren nicht. Dazu der
  Griffrechner: der Nutzer hört eine Tonart auf Spotify, wählt sie klingend
  aus und bekommt den Griff dazu.
- `tonartfinden.js`: die Band spielt in einer zufälligen Tonart, der Nutzer
  sucht den Grundton am Instrument und tippt den **Griff**. Gemessen wird die
  Zeit, nicht nur richtig oder falsch — wer die Tonart nach dreißig Sekunden
  findet, findet sie auf dem Gig nicht. Kein Mikrofon, aus demselben Grund
  wie bei Call and Response: die Band kommt aus dem Lautsprecher, den das
  Mikrofon hört. Das ist zugleich der Grund, warum es am Travel Sax geht.
  Die Rückmeldung benennt den Irrtum, statt ihn nur zu markieren: Quinte,
  Quarte, Terz und vor allem die Paralleltonart, bei der alle Töne stimmen
  und trotzdem jede Phrase auf der falschen Eins landet.
- `data/songwissen.js` und `songmitspielen.js`: sieben Schritte, um ein
  unbekanntes Stück aufzumachen — Grundton, Geschlecht, Form, Time, Farbe,
  Hook, Lücken. Jeder Schritt hat ein Abbruchkriterium, denn ohne
  „fertig, wenn …“ übt man jeden entweder zu kurz oder endlos. Gefundene
  Songs bleiben mit Tonart, Form und Notiz gespeichert, damit man beim
  zweiten Mal bei Schritt vier anfängt. Gespeichert wird unter `drills`,
  nicht in einem eigenen Feld — das Schema bleibt damit bei v2 und braucht
  keine Migration.
- `gigtraining.js`: Auflagen über die laufende Begleitband, taktweise
  wechselnd — nur Zieltöne, zwei Takte spielen und zwei schweigen, ein
  einziges Motiv, nur die mittlere Oktave. Einschränkung erzeugt Ideen;
  freies Spielen über ein Playback erzeugt Gewohnheiten.

**Was noch offen ist, in der Reihenfolge des Nutzens:**

1. **Referenzaufnahmen vergleichen**, Tag 1 gegen Tag 30, identische
   Aufnahmekette. Baut auf der Tonanalyse auf; Audio gehört dann in
   IndexedDB, nicht in localStorage.
2. **Vibrato-Analyse**: Geschwindigkeit in Hz und Tiefe in Cent aus dem
   Tonhöhenverlauf.
3. **Melodiediktat** in der Gehörbildung: Melodie hören, Töne eingeben.
   Der Notensatz und der Melodiegenerator stehen bereits.
4. **Prüfungssimulation**: Ablauf mit Zeitdruck, zufällige Tonart, Blattspiel
   ohne zweiten Versuch.
5. **Setlist für Gigs**: die Stücke, die bei Hochzeiten wirklich drankommen,
   mit Tonart, Form und der Stelle, an der das Solo steht.

## 9. Arbeitsweise

- Keine Abhängigkeiten ohne Rückfrage. Der aktuelle Stand ist bewusst
  abhängigkeitsfrei — zur Laufzeit lädt die App nichts nach.
  Entwicklungswerkzeuge unter `tools/` dürfen eigene Voraussetzungen haben
  (Pillow für die Icons, fontTools für die Notenzeichen); sie laufen nie beim
  Deployen und nie im Browser.
- Kein Build-Schritt. Wer einen einführen will, begründet es hier zuerst.
- Änderungen klein halten und einzeln verifizieren.
- Was rechnerisch prüfbar ist, wird geprüft, bevor es eine Oberfläche
  bekommt. Musiktheorie, Notensatz und die Generatoren sind genau deshalb
  DOM-frei. Bei jedem dieser Module haben die Tests echte Fehler gefunden,
  die im Browser nur zufällig aufgefallen wären.
- Kommentare auf Deutsch, knapp, und nur dort, wo das *Warum* nicht offensichtlich
  ist. Was der Code tut, steht im Code.
- **ß wird ausgeschrieben, auch im Code.** Früher stand überall s-z als
  Ersatz; das liest der Nutzer in der Oberfläche und es ist schlicht falsch.
  `node tools/check.mjs` prüft es mit einer kleinen Ausnahmeliste für
  Wörter, in denen s und z wirklich aufeinandertreffen.
- Wenn du auf eine Plattformgrenze stößt, die in Abschnitt 3 nicht steht:
  recherchieren, hier dokumentieren, dann erst umsetzen.

## 10. Verifizieren

**`node tools/check.mjs` vor jedem Deployen.** Das bündelt alles: Syntax
jeder Moduldatei, Ladbarkeit aller Module (findet kaputte Importpfade, die
eine Syntaxprüfung nicht sieht), gültiges Manifest, die Precache-Liste und
alle Testsuiten — Theorie, Notensatz, Rhythmus, Melodien,
Tonhöhenerkennung, Notenerkennung, Harmonielehre, Licks, Obertöne und den
Übungsplan. Rund 26 600 Prüfungen.

- `node tools/sync-precache.mjs --write` hält die Precache-Liste in `sw.js`
  mit dem Repo im Gleichstand. Eine neue Datei, die nicht drinsteht, fehlt im
  Flugmodus — und das merkt man erst im Probelokal ohne Netz.
- Wie der Notensatz aussieht, zeigt `tools/notation-preview.html`. Das kann
  nur ein Mensch beurteilen; die Testsuite prüft nur, was stumm kaputtgeht.
- Lokal über einen HTTP-Server testen, nicht über `file://` — sonst
  verhalten sich Audio und Storage anders.
- Audio lässt sich headless nicht sinnvoll testen. Bei Änderungen an Modul 3
  klar sagen, was der Nutzer am Gerät gegenprüfen muss.
- iOS-Test läuft über GitHub Pages oder einen HTTPS-Tunnel. Simulator und
  Desktop-Safari verhalten sich bei Audio-Unlock und Wake Lock anders.
- Nach dem Anfassen der Navigation: einmal jedes Werkzeug in jedem Bereich
  öffnen. Ein Werkzeug, dessen `mount()` wirft, zeigt eine Fehlermeldung
  statt die App abzuschießen — aber gesehen werden muss es trotzdem.
- Der Service Worker lässt sich nicht in jedem Testbrowser registrieren. Seine
  Handler sind aber ohne Browser prüfbar: `sw.js` in einem Node-Kontext mit
  nachgebauten `caches`- und Event-Globals laden und Install, Activate, Fetch
  und Message einzeln feuern. Das fängt fehlende Precache-Pfade und falsche
  Cache-Namen ab. Was nur am Gerät geht: Registrierung, Update-Hinweis und
  der echte Kaltstart im Flugmodus.

## 11. Deployment

GitHub Pages, Branch `main`, Ordner root, Datei heißt `index.html`.
Adresse: https://dotsch17.github.io/sax-practise/
Am iPhone in Safari öffnen, Teilen, „Zum Home-Bildschirm".

**Pflicht bei jedem Deploy:** `VERSION` in `sw.js` hochzählen. Der Browser
erkennt eine neue Fassung ausschließlich daran, dass sich `sw.js` byteweise
unterscheidet. Wer nur `index.html` ändert, liefert dem installierten Gerät
dauerhaft den alten Stand aus — die Änderung liegt dann zwar auf GitHub Pages,
kommt aber nie an. Das ist der Preis für Cache-First ohne Build-Schritt.

Achtung: Jede Domain hat eigenen localStorage. Wenn der Nutzer die App von
einer anderen URL neu lädt, sind die Daten leer — dann Export und Import
verwenden.
