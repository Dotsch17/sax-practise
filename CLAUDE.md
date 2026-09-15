# CLAUDE.md — Übeplan Saxophon

Diese Datei ist der dauerhafte Projektkontext. Lies sie vollständig, bevor du
Code änderst. Wenn sich eine Entscheidung ändert, aktualisiere sie hier.

---

## 1. Was das ist

Eine Übe-App für einen einzelnen Nutzer: Dominik, Visual-Computing-Master an
der TU Wien, spielt Altsaxophon (Yamaha YAS-480), bereitet sich auf die
Aufnahmeprüfung IGP Saxophon an der mdw vor. Die App führt durch eine
strukturierte tägliche Übe-Session für klassischen Ton, liefert Bordunton und
Metronom und protokolliert, was gemacht wurde.

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
- Ein Framework-Umbau, solange der aktuelle Umfang in einer Datei passt.
  Siehe Phase 4.
- Notendarstellung, Playalongs, Repertoireverwaltung.

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
Der gesamte Code steht weiterhin in `index.html`, daneben liegen nur statische
Dateien:

```
index.html      Oberfläche, Logik, Stile — die gesamte App
manifest.json   Name, Icons, Vollbildstart
sw.js           Service Worker, versionierter Precache für den Offlinebetrieb
icons/          192, 512, maskable 512, apple-touch-icon 180
fonts/          Instrument Serif und Barlow als woff2, selbst gehostet
tools/          Icon-Generator, gehört nicht zur App und läuft nie beim Deploy
```

Inhalt von `index.html`:

- Session-Runner: sieben Blöcke, Countdown pro Block, Merkpunkte, Pause,
  automatisches Weiterspringen, Signalton am Blockende, Wochenauswahl 1 bis 4
  mit abweichenden Minutenverteilungen.
- Bordunton über alle zwölf klingenden Tonhöhen, jeweils mit dem zugehörigen
  Griff am Alt. Sägezahn plus zwei Teiltöne plus leichte Verstimmung durch
  einen Tiefpass.
- Metronom mit vorausschauendem Scheduler (25 ms Intervall, 100 ms Vorlauf,
  Klicks exakt auf der Audio-Uhr).
- Protokoll mit Notiz, Verlauf, JSON-Export und -Import.
- Screen Wake Lock während laufender Timer.
- Offlinebetrieb: Service Worker mit Cache-First-Precache. Eine neue Fassung
  übernimmt nicht von selbst, sondern meldet sich als antippbarer Hinweis —
  sonst würde mitten in einer laufenden Session neu geladen.

Der Code ist in sieben nummerierte Module geteilt. Die Nummerierung ist die
geplante Schnittkante für einen späteren Framework-Umbau:

| Modul | Inhalt | Beim Umbau |
|---|---|---|
| 1 | Übungsplan als reine Daten (`BLOCKS`, `WEEKS`) | `plan.js` |
| 2 | Zustand, localStorage, Migration | Store |
| 3 | Audio: Bordun, Metronom, Signalton | `audio.js`, unverändert übernehmbar |
| 4 | Timer, Wake Lock | Hook oder Service |
| 5 | Rendering | Komponenten |
| 6 | Event-Bindung | entfällt |
| 7 | Startsequenz, Service-Worker-Registrierung | Entry Point |

**Regel:** Alle inhaltlichen Änderungen am Übungsplan passieren ausschließlich
in Modul 1. Nirgends sonst stehen Blocknamen, Minuten oder Merkpunkte.

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

Weitere Vorgaben: Mindesthöhe 58 px für alle primären Bedienelemente,
maximale Spaltenbreite 480 px, `prefers-reduced-motion` respektieren,
sichtbarer Tastaturfokus, `env(safe-area-inset-*)` beachten. Keine
Einblend-Animationen beim Seitenaufbau.

## 6. Datenmodell

Ein einziges Objekt in localStorage unter `sax.uebeplan.v1`. Bewusst eines,
damit Export und Import trivial bleiben.

```js
{
  week: 1..4,
  day:  { date: "YYYY-MM-DD", done: [blockId], spent: { blockId: seconds } },
  log:  [ { date, week, blocks: [name], minutes, note } ],
  settings: { droneVol, bpm, beats }
}
```

Beim Laden wird `day` verworfen, wenn das Datum nicht dem heutigen entspricht.
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
  Falls Altissimo-Funktionen dazukommen, ist das der Ausgangspunkt.

## 8. Roadmap

**Phase 1 — abgeschlossen.** Session-Runner, Bordun, Metronom, Protokoll.

**Phase 2 — umgesetzt, Abnahme am Gerät steht aus.**
- `manifest.json` liegt vor, verlinkt, mit Icons 192, 512 und maskable 512,
  `display: "standalone"`, `start_url: "."`, `scope: "./"`,
  `theme_color: "#0C2226"`. Zusätzlich ein `apple-touch-icon` mit 180 px, weil
  iOS den für „Zum Home-Bildschirm" zuverlässiger auswertet als das Manifest.
- `sw.js` precacht Seite, Manifest, Icons und Schriften und beantwortet
  eigene GET-Requests cache-first, Navigationen mit `index.html`. Fremde
  Herkünfte und alles außer GET laufen unangetastet durch. Network-First für
  nichts, weil es kein Backend gibt.
- Die Schriften liegen selbst gehostet im Repo, siehe Abschnitt 5.
- Offen — das kann nur der Nutzer am iPhone: im Flugmodus vom Home-Bildschirm
  starten, Session vollständig durchlaufen, Bordun und Metronom prüfen.
  Lokal ist nur die Worker-Logik gegengeprüft, nicht die Registrierung: der
  eingebettete Testbrowser lässt keine Service Worker zu.

**Phase 3 — Übe-Auswertung.**
- Verlaufsansicht: Minuten pro Woche, Blockverteilung, Serie ohne Lücke.
- Das bereits erfasste `day.spent` auswerten, also tatsächlich verbrachte statt
  geplanter Zeit.
- Abnahme: Nach zwei Wochen Nutzung ist erkennbar, welcher Block regelmäßig
  ausgelassen wird.

**Phase 4 — Umbau auf Vite plus React,** nur falls der Umfang es erzwingt.
Vorher begründen, warum eine Datei nicht mehr reicht. Modul 3 wandert dabei
unverändert und framework-frei nach `audio.js`.

**Phase 5 — Audio-Analyse.** Der fachlich interessanteste und für das Üben
unwichtigste Teil, deshalb bewusst zuletzt.
- `getUserMedia` plus AudioWorklet.
- Tonhöhenerkennung per YIN oder Autokorrelation, Ziel unter 10 ms Latenz auf
  einem aktuellen iPhone.
- Stimmanzeige in Cent, mit Bezug auf die klingende und die gegriffene Tonhöhe.
- Aufnahme eines langen Tons plus Spektrogramm und spektraler Schwerpunkt über
  die Zeit. Zweck: sichtbar machen, ob das Spektrum stabil bleibt — Flackern
  bedeutet, dass Ansatz oder Luft wackeln.
- Referenzaufnahmen vergleichen (Tag 1 gegen Tag 30, identische Aufnahmekette).

## 9. Arbeitsweise

- Keine Abhängigkeiten ohne Rückfrage. Der aktuelle Stand ist bewusst
  abhängigkeitsfrei.
- Kein Build-Schritt in den Phasen 1 bis 3.
- Änderungen klein halten und einzeln verifizieren. Nicht mehrere Phasen
  gleichzeitig angehen.
- Kommentare auf Deutsch, knapp, und nur dort, wo das *Warum* nicht offensichtlich
  ist. Was der Code tut, steht im Code.
- Wenn du auf eine Plattformgrenze stößt, die in Abschnitt 3 nicht steht:
  recherchieren, hier dokumentieren, dann erst umsetzen.

## 10. Verifizieren

- JavaScript-Syntax prüfen, bevor du eine Änderung für fertig erklärst.
- Alle im JS über `$("#...")` angesprochenen IDs müssen im HTML existieren.
  Das ist bei einer Einzeldatei die häufigste Fehlerquelle.
- Lokal über einen HTTP-Server testen, nicht über `file://` — sonst
  verhalten sich Audio und Storage anders.
- Audio lässt sich headless nicht sinnvoll testen. Bei Änderungen an Modul 3
  klar sagen, was der Nutzer am Gerät gegenprüfen muss.
- iOS-Test läuft über GitHub Pages oder einen HTTPS-Tunnel. Simulator und
  Desktop-Safari verhalten sich bei Audio-Unlock und Wake Lock anders.
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
