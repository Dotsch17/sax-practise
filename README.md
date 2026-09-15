# Übeplan Saxophon

Tägliche Übe-Session für klassischen Saxophonton: Session-Runner mit Countdown
je Block, Bordunton über alle zwölf klingenden Tonhöhen mit dem zugehörigen
Griff am Alt, Metronom und Protokoll. Einzelnutzer, kein Backend, kein Konto.

**→ https://dotsch17.github.io/sax-practise/**

## Auf dem iPhone installieren

In Safari öffnen, Teilen, „Zum Home-Bildschirm". Danach startet die App im
Vollbild und läuft vollständig offline — auch im Flugmodus.

## Zwei Dinge, die man wissen muss

- **Der Bildschirm muss anbleiben.** iOS stoppt Web Audio, sobald die App in
  den Hintergrund geht. Solange ein Timer läuft, hält die App das Display per
  Wake Lock wach; Bildschirm sperren beendet Bordun und Metronom trotzdem.
- **Exportiere ab und zu.** Safari löscht lokal gespeicherte Daten nach etwa
  sieben Tagen ohne Nutzung. Protokoll → „Daten exportieren" legt eine
  JSON-Datei ab, „Daten einlesen" holt sie zurück.

## Entwicklung

Kein Build-Schritt, keine Abhängigkeiten. Lokal testen über einen
HTTP-Server, nicht über `file://`:

```
python -m http.server 8000
```

Beim Deployen `VERSION` in `sw.js` hochzählen, sonst bekommen installierte
Geräte die Änderung nie zu sehen. Projektkontext, Designfestlegungen und
Roadmap stehen in [CLAUDE.md](CLAUDE.md).
