/* ==========================================================================
   Den Bluetooth-Verzug messen

   Das iPhone schickt seinen Ton an den Travel Sax, und der mischt ihn in
   die Kopfhörer. Dazwischen liegt Bluetooth, meist 150 bis 250 ms. Die
   Web-Audio-Uhr kennt diesen Weg nicht, und Safari meldet ihn nicht
   verlässlich. Also misst man ihn: die App klickt, man tippt mit, und der
   typische Abstand zwischen Klick und Tipp ist der Verzug.

   Darin steckt auch die eigene Reaktion des Fingers auf dem Glas. Das ist
   gewollt: dieselbe steckt in jeder Rhythmusmessung. Unter 30 ms gilt als
   kein Verzug — das ist der Finger, nicht das Kabel, und wer dort
   korrigiert, versteckt, dass er eilt oder schleppt.

   Kein DOM.
   ========================================================================== */

"use strict";

export const MESSUNG = {
  bpm: 100,
  einzaehler: 4,        // diese Klicks zählen nicht, da findet man den Puls
  klicks: 12,           // so viele werden ausgewertet
  frueh: 0.15,          // so weit vor dem Klick darf ein Tipp liegen
  spaet: 0.45,          // und so weit danach — Bluetooth ist langsam
  mindestens: 6,        // weniger zugeordnete Tipps sind keine Messung
  unruhe: 0.04,         // mittlere Abweichung, ab der man neu misst
  keinVerzug: 0.03,
};

const median = xs => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * Ordnet jedem Klick den nächsten passenden Tipp zu und bestimmt den
 * Verzug. Zeiten in Sekunden auf derselben Uhr.
 * Gibt `{ ok, ms, streuung, anzahl, grund }` zurück.
 */
export function verzugAusTipps(klicks, tipps, M = MESSUNG) {
  const frei = [...tipps].sort((a, b) => a - b);
  const abstaende = [];
  // Bei 100 Schlägen je Minute berühren sich die Fenster zweier Klicks nur,
  // sie überlappen nicht: jeder Tipp gehört zu höchstens einem Klick.
  // Doppelt getippt zählt der erste.
  for (const k of klicks) {
    const j = frei.findIndex(t => t - k >= -M.frueh && t - k <= M.spaet);
    if (j >= 0) { abstaende.push(frei[j] - k); frei.splice(j, 1); }
  }
  if (abstaende.length < M.mindestens) {
    return { ok: false, anzahl: abstaende.length, grund: "zu wenig" };
  }
  const mitte = median(abstaende);
  const streuung = median(abstaende.map(d => Math.abs(d - mitte)));
  if (streuung > M.unruhe) {
    return { ok: false, anzahl: abstaende.length, streuung: Math.round(streuung * 1000), grund: "unruhig" };
  }
  const ms = mitte < M.keinVerzug ? 0 : Math.round(mitte * 1000 / 5) * 5;
  return { ok: true, ms, roh: Math.round(mitte * 1000), streuung: Math.round(streuung * 1000), anzahl: abstaende.length };
}
