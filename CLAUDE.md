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
css/            base, shell, tools
js/             der gesamte Code, siehe Tabelle unten
icons/          192, 512, maskable 512, apple-touch-icon 180
fonts/          Instrument Serif und Barlow als woff2, selbst gehostet
tools/          Entwicklungswerkzeuge und Tests, nie Teil der App
```

**Die Werkzeuge, nach Bereichen:**

| Bereich | Werkzeuge |
|---|---|
| Üben | Session-Runner: sieben Blöcke, Countdown, Merkpunkte, Wochen 1 bis 4 |
| Ton | Stimmgerät mit Intonationskarte, Bordun über zwölf klingende Tonhöhen |
| Technik | Tonleitern, Rhythmus mit Messung, Blattspiel, Griffe, Metronom |
| Gehör | Nachspielen mit Mikrofonkontrolle, Intervalle/Akkorde/Skalen |
| Impro | Begleitung aus Bass, Comping und Becken über neun Akkordfolgen |
| Journal | Protokoll, Auswertung, Repertoire, Wissen, Daten |

Bordun und Metronom laufen über Bereichswechsel hinweg weiter; der Streifen
„läuft gerade" über der Reiterleiste schaltet sie von überall ab.

Der Code liegt in ES-Modulen. Kein Build-Schritt, keine
Laufzeit-Abhängigkeiten. Aufteilung:

| Ordner | Inhalt |
|---|---|
| `js/core/` | DOM-Helfer, Zustand und Speicherung, Session-Timer und Wake Lock |
| `js/audio/` | AudioContext, Bordun, Metronom, Signale, Tonhöhenerkennung, Notenerkennung, Begleitung |
| `js/music/` | Theorie, Harmonielehre, Notensatz, Notenzeichen, Griffbild, Rhythmus- und Melodiegenerator |
| `js/data/` | Übungsplan und Wissenstexte — alles Inhaltliche |
| `js/tools/` | ein Modul je Werkzeug, alle mit derselben Schnittstelle |
| `js/views.js` | welches Werkzeug in welchem Bereich steht |
| `js/main.js` | Navigation, Startsequenz, Service-Worker-Registrierung |
| `css/` | `base.css` Tokens und Schriften, `shell.css` Gerüst, `tools.css` Bausteine |

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

Weitere Vorgaben: Mindesthöhe 58 px für alle primären Bedienelemente,
maximale Spaltenbreite 480 px, `prefers-reduced-motion` respektieren,
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

**Was noch offen ist, in der Reihenfolge des Nutzens:**

1. **Aufnahme und Tonanalyse.** Einen langen Ton aufnehmen, Tonhöhenverlauf
   in Cent, Hüllkurve, Spektrum und spektralen Schwerpunkt über die Zeit
   zeigen. Zweck: sichtbar machen, ob das Spektrum stabil bleibt — Flackern
   heißt, dass Ansatz oder Luft wackeln. Audio gehört in IndexedDB, nicht in
   localStorage.
2. **Referenzaufnahmen vergleichen**, Tag 1 gegen Tag 30, identische
   Aufnahmekette. Baut auf 1 auf.
3. **Vibrato-Analyse**: Geschwindigkeit in Hz und Tiefe in Cent aus dem
   Tonhöhenverlauf. Baut auf 1 auf.
4. **Melodiediktat** in der Gehörbildung: Melodie hören, Töne eingeben.
   Der Notensatz und der Melodiegenerator stehen bereits.
5. **Call and Response über die Begleitung**: die App spielt zwei Takte
   vor, der Nutzer antwortet zwei Takte. Begleitung und Notenerkennung
   stehen beide schon; es fehlt die Taktsynchronisation zwischen beiden.
6. **Obertonübung mit Rückmeldung**: erkennen, welcher Teilton gerade
   klingt, und ob das Matching gegen den gegriffenen Ton stimmt. Das ist die
   fachlich wertvollste offene Idee, weil sie genau den Block unterstützt,
   der laut Auswertung am häufigsten ausgelassen wird.
7. **Prüfungssimulation**: Ablauf mit Zeitdruck, zufällige Tonart, Blattspiel
   ohne zweiten Versuch.

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
- Wenn du auf eine Plattformgrenze stößt, die in Abschnitt 3 nicht steht:
  recherchieren, hier dokumentieren, dann erst umsetzen.

## 10. Verifizieren

**`node tools/check.mjs` vor jedem Deployen.** Das bündelt alles: Syntax
jeder Moduldatei, Ladbarkeit aller Module (findet kaputte Importpfade, die
eine Syntaxprüfung nicht sieht), gültiges Manifest, die Precache-Liste und
die vier Testsuiten — Theorie, Notensatz, Rhythmus, Melodien,
Tonhöhenerkennung. Rund 12 500 Prüfungen.

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
  statt die App abzuschieszen — aber gesehen werden muss es trotzdem.
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
