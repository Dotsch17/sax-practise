# CLAUDE.md — Übeplan Saxophon

Diese Datei ist der dauerhafte Projektkontext. Lies sie vollständig, bevor du
Code änderst. Wenn sich eine Entscheidung ändert, aktualisiere sie hier.

**Wenn du neu auf dem Projekt bist:** lies diese Datei ganz, dann
`js/views.js` (was es überhaupt gibt), dann das Werkzeug, das du anfassen
willst. Jede Datei beginnt mit einem Kopfkommentar, der das *Warum* erklärt —
der ist meistens wichtiger als der Code darunter. Danach einmal
`node tools/check.mjs` laufen lassen, damit du weißt, wie ein grüner Stand
aussieht.

Der kürzeste Weg in die Irre ist, eine der Festlegungen in Abschnitt 3, 5
oder 7 für Stilfragen zu halten. Sie sind keine. Jede davon steht dort, weil
sie einmal falsch war.

---

## 1. Was das ist

Eine Übe-App für einen einzelnen Nutzer: Dominik, Visual-Computing-Master an
der TU Wien, spielt Altsaxophon (Yamaha YAS-480). Die App führt durch die
Übe-Session, deckt die Prüfungsdisziplinen ab und ist zugleich das Werkzeug
für das freie Spielen. Ziel ist, dass zum Üben kein zweites Werkzeug nötig
ist — kein Stimmgerät, kein Metronom, keine zweite App fürs Gehör, kein
Begleitautomat.

**Zwei Ziele, und beide zählen.** Sie ziehen in verschiedene Richtungen, und
wer nur eines davon kennt, baut am anderen vorbei:

1. **Zulassungsprüfung IGP Saxophon *Popularmusik* an der mdw, Juni 2027.**
   Nicht Klassik — das war lange falsch in dieser Datei, und die App war
   deshalb auf Ferling, Mule und klassischen Ton ausgerichtet. Verlangt sind
   (Stand 2026/27, Quellen in `js/data/pruefung.js`): Tonleitern und Akkorde
   in allen Tonarten theoretisch und am Instrument, zwei Jazzetüden oder
   Etüde plus Transkription, drei Stücke verschiedener Stilrichtungen mit
   Improvisation, Blattlesen. Dazu zwei Prüfungsteile außerhalb des
   Saxophons, die genauso bestanden werden müssen: **Klavier** (zwei Stücke,
   Blattspiel, Kadenzen inklusive II–V–I) und ein **schriftlicher Hörtest**
   (Melodie- und Rhythmusdiktat, Akkorde mit Umkehrungen, Fehler erkennen).
   Der Nutzer fängt am Klavier bei null an. Seine Kandidaten für die Stücke:
   There Will Never Be Another You, Straight No Chaser, Parker's Mood, Oleo,
   Have You Met Miss Jones — alles Swing, deshalb mahnt das Cockpit eine
   Ballade und einen geraden Groove an. Er hat einen Lehrer.
2. **Auf Events, Aperitivi und Hochzeiten mit DJ spielen.** Das ist eine
   andere Disziplin: Tonart eines laufenden Stücks nach Gehör finden, über
   eine Begleitung improvisieren, den Hook treffen, in die Lücken spielen,
   Time gegen eine Maschine halten. Dafür stehen der Impro-Bereich und das
   Gig-Training.

**Wie wirklich geübt wird** — das bestimmt mehr Entwurfsentscheidungen als
jede Technikfrage:

- An drei Orten mit drei verschiedenen Möglichkeiten: Probelokal (echtes
  Saxophon, beliebig laut), zuhause leise (Rücksicht auf Nachbarn, alles im
  pp oder ganz ohne Ton), Travel Sax (digitales Blasrohr, akustisch still —
  Technik ja, Ansatz und Voicing nein). Siehe `KONTEXTE` in `plan.js`.
- **Nicht nach Kalender, sondern nach Lust und Zeit.** Die App ist kein
  Vier-Wochen-Kurs, sondern der Helfer für jedes Mal, wenn das Instrument
  ausgepackt wird. Deshalb wählt man die Länge der Session, nicht eine
  Wochennummer.
- Improvisation läuft über den Travel Sax am Handy, mit Spotify im Ohr und
  zufälligen Stücken zum Mitspielen. Deshalb kann die App beim Improvisieren
  nicht mithören — das Mikrofon würde den Song verfolgen, nicht den Spieler.
- Der Stand am Instrument: Altissimo wird gerade erarbeitet, G, G♯ und A
  gelingen teilweise.

Die Werkzeuge im Einzelnen stehen in Abschnitt 4.

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
| Üben | Session-Runner: Kontext und Zeit wählen, Blöcke, Countdown, Merkpunkte, Werkzeug im Block. Prüfung: Countdown, alle Prüfungspunkte mit Stufen, Zeitplan rückwärts. Aufnahme: aufnehmen, nach Titel ablegen, erste gegen letzte hören |
| Ton | Stimmgerät mit Intonationskarte, Obertonübung, Tonanalyse, Bordun |
| Technik | Tonleitern und Akkorde mit Prüfermodus und Abdeckung, Rhythmus mit Messung, Blattspiel, Griffe, Metronom |
| Gehör | Hörtest (Melodie- und Rhythmusdiktat, Akkorde mit Lage, Fehler finden, Wiedererkennen), Erkennen (Intervalle/Akkorde/Skalen benennen), Nachspielen mit Mikrofonkontrolle |
| Impro | Grundlagen, Begleitband, Tonart finden, Zum Song spielen, Call and Response, Gig-Training |
| Journal | Protokoll, Auswertung, Repertoire, Wissen, Daten |

**Fünf Übe-Kontexte statt eines Plans.** Probelokal (voller Ton, übt für die
Prüfung), Tonarbeit (der klassische Tonplan), zuhause leise, Travel Sax und
Klavier. Die Kontexte stehen in `KONTEXTE` in `js/data/plan.js`, `planFor()`
liefert die Blöcke dazu.

Das **Probelokal** hat seit v14 einen eigenen Plan: Einspielen und Ton,
Tonleitern und Akkorde, Etüde oder Transkription, Prüfungsstück, Durchlauf
mit Aufnahme, Blattlesen. Der alte Plan war achtzig Minuten reine
Tonarbeit; bei vierzig Minuten fiel die Etüde weg, und Tonleitern kamen im
Probelokal gar nicht vor. Jetzt gilt: jede Session hat Ton, Technik und
Musik. Blöcke dürfen ein `prio` tragen — gestrichen wird bei knapper Zeit
nach `prio`, gespielt wird trotzdem in Planreihenfolge. Deshalb bleibt bei
zwanzig Minuten das Prüfungsstück und nicht die Tonleiter.

`BLOCKS` selbst bleibt unangetastet und lebt als Kontext **Tonarbeit**
weiter, mit der Werkzeugzuordnung aus `BLOCK_WERKZEUG`.
Der Travel-Sax-Kontext trägt eine Warnung: Ansatz, Voicing, Obertöne und
Klangfarbe lassen sich dort nicht üben, und das muss dastehen, sonst hält man
das digitale Blasrohr für ein Saxophon.

**Die Session richtet sich nach der Zeit, nicht nach dem Kalender.** Der
Vier-Wochen-Plan war als Konzept richtig und als Steuergröße falsch: man
nimmt das Instrument in die Hand, wenn man Lust und Zeit hat, und eine
Wochennummer weiß darüber nichts. Stattdessen wählt man, wie lange man Zeit
hat; `baueSession()` in `js/data/plan.js` schneidet den Plan darauf zu. Drei
Regeln halten das musikalisch heil: die Reihenfolge wird nie umgestellt, der
erste Block bleibt immer drin, und statt gegen die Mindestlänge wird gegen
eine **Ziellänge** von zehn Minuten gerechnet — sonst passen in zwanzig
Minuten sechs Blöcke, und man übt sechsmal drei Minuten statt zweimal zehn.
Kurz üben heißt weniger Sachen, nicht dieselben Sachen in Häppchen.
`BLOCKS` und `WEEKS` bleiben unverändert; `state.day.schwerpunkt` hält den
Block, der heute mehr Zeit bekommt, und wird mit dem Tag verworfen.

**Die App sagt, woran heute zu arbeiten ist.** `js/core/koennen.js` liest
den gesamten Messbestand — Trefferquoten, Intonationskarte, höchster
Teilton, nie geübte Tonarten, Zeit bis zur gefundenen Tonart — und macht
daraus sortierte Befunde. Der oberste steht als Karte über dem Plan, mit
einem Knopf, der direkt ins passende Werkzeug springt. Bewusst **ein**
Vorschlag und nicht fünf: eine Liste von Schwächen liest man einmal und nie
wieder. Zwei Regeln halten das Ergebnis brauchbar: unter sechs Versuchen
wird nichts beurteilt, und ein leerer Eintrag zählt nicht als geübt — den
legt schon das Öffnen eines Werkzeugs an. Der Übe-Kontext filtert mit;
Obertöne am Travel Sax vorzuschlagen wäre schlechter als gar kein Vorschlag.
Das Modul ist DOM-frei und mit 61 Prüfungen getestet.

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
| `js/core/` | DOM-Helfer, Zustand und Speicherung, Session-Timer und Wake Lock, Können-Profil |
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
  nächste MIDI-Nummer: `playFreqs()` und `halteFreq()` in `signals.js`.
  Voreingestellt ist der Dauerton, nicht das kurze Vorspiel: wer ein Voicing
  sucht, braucht das Ziel währenddessen im Ohr und nicht eine Sekunde vorher. Der siebte Teilton
  läge sonst 31 Cent daneben — ausgerechnet der, der ohnehin am
  schwersten kommt.
- Tonleitern und Blattspiel bleiben im notierten Umfang B3 bis Fis6
  (`RANGE` in `theory.js`). Eine Übung, die darüber hinausläuft, ist
  unbrauchbar.
- **Der Prüfungsstoff für Tonleitern steht in `js/music/skalenarten.js`**:
  siebzehn Arten mal zwölf Grundtöne. Grundtöne der Modi und Akkorde
  werden je Tonhöhe in der Schreibweise mit den wenigsten Vorzeichen
  gewählt — Cis-phrygisch, nicht Des-phrygisch mit Eses und Fes. „Ganzer
  Umfang“ heißt vom tiefsten Grundton bis zum höchsten Ton, hinunter bis
  zum tiefsten und zurück. Zwei Oktaven passen auf G, Gis/As und A
  physikalisch nicht; das ist kein Fehler, dafür gibt es den ganzen Umfang.
  Abdeckung zählt Tonhöhen, nicht Namen: Fis- und Ges-Dur sind eine Aufgabe.
- **Aufnahmen liegen in IndexedDB** (`js/core/aufnahmen.js`), nicht im
  Zustandsobjekt und nicht im JSON-Export — dafür sind sie zu groß. Jede
  Aufnahme lässt sich einzeln als Datei sichern. `recordings` im Zustand
  gehört weiterhin der Tonanalyse und enthält nur Messwerte.

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

**Phase 9 — Ausrichtung auf die Zulassungsprüfung Popularmusik, umgesetzt (v14).**
- `data/pruefung.js` und `tools/pruefung.js`: die Anforderungen aller drei
  Prüfungsteile, jeder Punkt mit Stufen und „fertig, wenn“, Zeitplan
  rückwärts vom Prüfungstag, Hinweise zum Programm (Stilrichtungen,
  fehlende Ballade, was hinter dem Zeitplan liegt).
- `audio/rekorder.js`, `core/aufnahmen.js`, `tools/aufnahme.js`: aufnehmen
  mit Pegelanzeige und Warnung bei Übersteuerung, Ablage nach Titel,
  Vergleich erste gegen letzte Aufnahme. Aus jedem Prüfungspunkt direkt
  erreichbar.
- `music/skalenarten.js` und das umgebaute Tonleitern-Werkzeug: alle
  siebzehn Prüfungsarten, ganzer Umfang, auswendig, Prüfermodus mit
  „erst sagen, dann aufdecken“, Abdeckung über 204 Aufgaben.
- Neuer Probelokal-Plan und Kontext Klavier, siehe Abschnitt 4.

**Phase 10 — Hörtest als Diktat, umgesetzt (v15).**
- `music/diktat.js` und `tools/hoertest.js`: der schriftliche Hörtest der
  Zulassungsprüfung zum Üben. Melodiediktat tonal (Dur und harmonisch Moll,
  Kadenz vorweg) und freitonal, Rhythmusdiktat aus Bausteinen,
  Drei- und Septakkorde mit Lage (Sextakkord, Quintsextakkord …),
  veränderten Ton in Melodie oder Akkord finden, eines von drei notierten
  Beispielen wiedererkennen. Alles klingend im Violinschlüssel.
- Beim Eintragen klingt nichts — im Prüfungsraum gibt es kein Klavier zum
  Nachprüfen. Die Oktave ergibt sich aus dem kleinsten Abstand zum
  vorigen Ton und lässt sich korrigieren. Im tonalen Diktat zählt die
  Schreibweise (Gis ist kein As), im freitonalen nicht.
- Der Rhythmus des Melodiediktats steht blass da; eingetragen werden nur
  die Tonhöhen. Rhythmus wird im Rhythmusdiktat eigens geübt. Beides in
  einer Aufgabe zu verlangen wäre prüfungsnäher und ist der nächste
  Schritt, wenn beides einzeln sitzt.
- Akkorde stehen gebrochen von unten nach oben, weil der Notensatz keine
  Akkorde übereinander setzt.
- Das Werkzeug „Gehörbildung“ heißt in der Oberfläche jetzt „Erkennen“
  (id weiterhin `gehoerbildung`). Das Können-Profil verwies bisher auf die
  id `gehoer`, die es nie gab, und landete deshalb im Nachspielen.
- Das Können-Profil kennt den Hörtest und meldet ihn, solange er nie
  geübt wurde. Außerdem zählt es Tonleitern jetzt als geübt, wenn sie
  abgehakt wurden — vorher zählte es nur richtig und falsch, was das
  Tonleiter-Werkzeug nie schreibt, und meldete deshalb dauerhaft alle
  dreizehn Tonarten als nie geübt.

**Was noch offen ist, in der Reihenfolge des Nutzens:**

1. **Kadenztrainer am Klavier**: Kadenzen in drei Lagen und II–V–I bis zwei
   Vorzeichen, als Notenbild plus Vorspiel.
2. **Begleitband für die Prüfungsstücke**: eigene Akkordfolgen eingeben,
   damit auch Another You und Miss Jones mit der eingebauten Band laufen.
   Bis dahin iReal Pro.
3. **Pop-Saxophon-Vokabular** für Ziel 2: Subtone, Growl, Bends, Falls,
   Ghost Notes; Lick der Woche aus echten Aufnahmen; Gig-Setlist.
4. **Vibrato-Analyse**: Geschwindigkeit in Hz und Tiefe in Cent. Dabei den
   Wissensartikel prüfen — er lehrt Lippen- statt Kiefervibrato, die
   klassische Schule (Mule, Teal, Rousseau) lehrt Kiefervibrato.
5. **Prüfungssimulation**: das ganze Programm kalt, am Stück, mit Aufnahme.
6. **Vollständiges Melodiediktat**: Tonhöhen und Rhythmus in einer Aufgabe,
   dazu Zweistimmigkeit, falls die mdw sie verlangt — vorher bei
   MusicCoach nachsehen, wie die Aufgaben dort aussehen.

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
alle Testsuiten. Stand heute vierzehn Suiten mit zusammen rund 42 000
Prüfungen: Theorie, Notensatz, Rhythmus, Melodien, Harmonielehre,
Notenerkennung, Licks, Teiltöne, Können-Profil, Übungsplan,
Prüfungsstoff Tonleitern, Prüfungsplan, Hörtest, Tonhöhenerkennung. Dazu die
Rechtschreibprüfung aus Abschnitt 9.

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

## 12. Zusammenarbeit mit dem Nutzer

Das hier ist kein Auftragsprojekt mit Lastenheft. Der Nutzer sagt, was ihm
beim Üben fehlt, und erwartet, dass daraus etwas Gebautes wird — inklusive
der Entscheidungen, die er nicht getroffen hat. Was sich dabei bewährt hat:

- **Sobald es kompiliert und die Tests grün sind, wird gepusht** — vor dem
  nächsten Feature, nicht danach. Er übt mit dem, was auf GitHub Pages
  liegt; ein fertiges Feature im Arbeitsverzeichnis nützt ihm nichts. Also:
  `node tools/check.mjs`, `VERSION` in `sw.js` hochzählen, committen,
  pushen, und dann prüfen, dass die neue Fassung wirklich ausgeliefert wird.
- **Weiterbauen ist erwünscht.** „Mach coole Features, verbessere
  bestehende“ ist eine echte Aufgabe, kein Höflichkeitssatz. Vorschläge
  müssen aber aus seiner Übepraxis kommen, nicht aus dem Technikbaukasten.
  Die Frage ist immer: Was fehlt ihm, wenn er das Instrument in der Hand
  hat?
- **Fachlich Stellung beziehen.** Er hat ausdrücklich darum gebeten, dass
  die App wie ein Konservatoriumsprofessor auftritt. Ein Hinweis ohne
  Begründung wird weggetippt; jeder Befund und jeder Übungsschritt trägt
  deshalb ein *Warum* und ein *fertig, wenn*.
- **Widerspruch ist willkommen, wenn er begründet ist.** Die Wochenansicht
  ist auf seinen Einwand hin verschwunden, und das war richtig. Umgekehrt
  sind die Altissimo-Griffe bis heute nicht eingebaut, weil die gelieferte
  Grifftabelle nicht verlässlich lesbar war — geraten wird bei Griffen
  nicht, lieber fehlt die Funktion.
- **Ton der Texte.** Deutsch, knapp, in ganzen Sätzen, ohne Ausrufezeichen
  und ohne Motivationssprache. Eine Zeile, die erklärt, warum etwas zählt,
  ist mehr wert als drei, die anfeuern.
- **Er prüft am Gerät.** Alles mit Mikrofon, der Kaltstart im Flugmodus und
  jede Audio-Latenz lassen sich hier nicht testen. Nach Änderungen daran
  ausdrücklich dazusagen, was er gegenprüfen muss.

## 13. Was offen ist

Ehrlicher Stand, damit niemand zweimal dieselbe Lücke sucht:

- **Altissimo-Griffe fehlen weiterhin.** Der Nutzer hat eine Grifftabelle
  geschickt, aus der sich F♯, G, G♯ und A ableiten ließen; sicher lesbar war
  sie nicht, und H und B kannte er selbst nicht. Zwei Wege: er trägt sie
  unter Technik → Griffe selbst ein, oder er schickt einen größeren
  Ausschnitt. Bis dahin gilt Abschnitt 2: keine abgeschriebenen Griffe.
- **Nie am Gerät geprüft:** Kaltstart im Flugmodus vom Home-Bildschirm,
  Stimmgerät, Nachspielen, Tonanalyse und Obertöne mit echtem Mikrofon,
  Wake Lock unter iOS, **die Aufnahme** (MediaRecorder mit audio/mp4 in
  der Home-Bildschirm-App, Pegelanzeige, Abspielen und Sichern der Datei).
  Im Testbrowser ist das Mikrofon gesperrt; Speichern, Liste und Vergleich
  sind dort mit einer eingespielten Datei geprüft.
- **Mundstück und Blätter** des Nutzers sind noch nicht erfasst. Er schaut
  nach; danach fragen, wenn es um Gig-Setup oder Klang geht. Im Browser am Rechner läuft alles; das heißt bei
  Audio wenig.
- **Die Obertonübung hört sich selbst zu**, wenn der Dauerton läuft und das
  Mikrofon an ist. Steht als Hinweis in der Oberfläche. Eine echte Lösung
  wäre, die eigene Frequenz aus der Erkennung herauszurechnen — bisher nicht
  gebaut, weil unklar ist, ob es in der Praxis stört.
- **Offene Ideen in der Reihenfolge des Nutzens** stehen am Ende von
  Abschnitt 8.

