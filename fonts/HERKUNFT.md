# Schriften

Selbst gehostet, damit die App im Flugmodus vom ersten Start an richtig
aussieht. Beide Familien stehen unter der SIL Open Font License 1.1, der
Lizenztext liegt daneben in `OFL.txt`.

Es sind die von Google Fonts ausgelieferten woff2-Subsets, nicht die
vollstaendigen Schnitte. `latin` deckt alles, was die Oberflaeche braucht
(Umlaute, „ ", Mittelpunkt, Minuszeichen). Barlow bekommt zusaetzlich
`latin-ext`, weil dort die selbst getippten Notizen im Protokoll landen.
Notenzeichen wie ♯ und ♭ sind in keinem der Subsets enthalten und werden
wie bisher von der Systemschrift gerendert.

Neu holen, falls Google die Dateien austauscht: die CSS-Datei unter
`https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Barlow:wght@400;500;600&display=swap`
mit einem Desktop-Browser-User-Agent abrufen und die woff2-URLs der Bloecke
`/* latin */` und `/* latin-ext */` entnehmen.

| Datei | Familie | Schnitt | Subset |
|---|---|---|---|
| `instrument-serif-400-latin.woff2` | Instrument Serif | 400 normal | latin |
| `instrument-serif-400-italic-latin.woff2` | Instrument Serif | 400 kursiv | latin |
| `barlow-400-latin.woff2` | Barlow | 400 | latin |
| `barlow-400-latin-ext.woff2` | Barlow | 400 | latin-ext |
| `barlow-500-latin.woff2` | Barlow | 500 | latin |
| `barlow-500-latin-ext.woff2` | Barlow | 500 | latin-ext |
| `barlow-600-latin.woff2` | Barlow | 600 | latin |
| `barlow-600-latin-ext.woff2` | Barlow | 600 | latin-ext |
