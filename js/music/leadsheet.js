/* ==========================================================================
   Leadsheets lesen

   Die eigenen Prüfungsstücke kommen als Text in die App, so wie man sie aus
   dem Real Book abschreibt: Takte zwischen Strichen, Akkorde darin.

     | Cm7 F7 | Bbmaj7 | Ebmaj7 | Am7b5 D7 |

   Drei Dinge entscheiden darüber, ob dabei geübt wird, was dasteht:

   - **Klingend oder gegriffen.** Ein Real Book in C ist klingend, eines in
     Es ist schon für das Alt geschrieben. Gespeichert wird immer klingend,
     wie alle Akkordfolgen der App; angezeigt wird gegriffen. Wer das beim
     Eintippen verwechselt, übt über eine große Sexte daneben — deshalb muss
     man es beim Eintippen sagen.
   - **Das deutsche B.** „B“ allein heißt in Deutschland B♭ und im Real Book
     H. Das hängt an der Namenseinstellung; „Bb“ und „H“ sind in beiden
     Schreibweisen eindeutig.
   - **Was nicht erkannt wird, wird gemeldet, nicht geraten.** Ein Akkord,
     den der Leser nicht kennt, steht als Fehler mit Taktnummer da. Eine
     Band, die still einen falschen Akkord spielt, ist schlimmer als keine.

   Kein DOM, kein Audio.
   ========================================================================== */

"use strict";

import { spellOnStep, toMidi, spell, NAMING } from "./theory.js";
import { chordSymbol } from "./harmonie.js";

const STAMM = [0, 2, 4, 5, 7, 9, 11];
const BUCHSTABE = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, H: 6, B: 6 };

/* --- Grundton ------------------------------------------------------------------ */

/**
 * Liest den Grundton am Anfang eines Akkordsymbols. Gibt `{ step, alter,
 * rest }` oder null. Versteht C♯, C#, Cis, Db, D♭, Des, Es, As, Eb, Ab,
 * H und — je nach Schreibweise — B.
 */
export function leseGrundton(text, naming = NAMING.DE) {
  const m = /^([A-Ha-h])(.*)$/.exec(text.trim());
  if (!m) return null;
  const L = m[1].toUpperCase();
  let rest = m[2];
  let step = BUCHSTABE[L];
  let alter = 0;
  const deutschesB = L === "B" && naming !== NAMING.EN;
  if (deutschesB) alter = -1;

  // Vorzeichen, so viele da stehen. „sus“ ist keine Erniedrigung: Asus4
  // ist A mit Quarte, nicht As.
  for (;;) {
    if (/^(is)/.test(rest) && !deutschesB) { alter += 1; rest = rest.slice(2); continue; }
    if (/^es/.test(rest) && !/^es(?=us)/.test(rest) && !["E", "A"].includes(L) && !deutschesB) { alter -= 1; rest = rest.slice(2); continue; }
    if (/^s(?!us)/.test(rest) && ["E", "A"].includes(L) && alter === 0) { alter -= 1; rest = rest.slice(1); continue; }
    if (/^[#♯]/.test(rest)) { alter += 1; rest = rest.slice(1); continue; }
    if (/^[b♭]/.test(rest) && !/^b5/.test(rest)) {
      // Bb im deutschen Modus ist trotzdem B♭, nicht Heses: so steht es in
      // jedem englischen Leadsheet, und niemand meint Heses.
      if (!deutschesB) alter -= 1;
      rest = rest.slice(1);
      continue;
    }
    break;
  }
  if (alter < -2 || alter > 2) return null;
  return { step, alter, rest };
}

/* --- Akkordart ------------------------------------------------------------------ */

/* Von speziell nach allgemein. Jede Zeile: Muster, Akkordart, und ob der
   Klang dabei vereinfacht wird — dann bekommt der Nutzer einen Hinweis. */
const ARTEN = [
  [/^(m|-|mi|min)7?(b5|-5)$|^ø7?$/, "m7b5"],
  [/^(°|o|dim)7$/, "dim7"],
  [/^(°|o|dim)$/, "dim7", "Verminderter Dreiklang, gespielt als verminderter Septakkord."],
  [/^(m|-|mi|min)(maj|Maj|ma|Ma|Δ|\^|M|j)(7|9)?$/, "mMaj7"],
  [/^(maj|Maj|ma|Ma|Δ|\^|M|j)(7|9|13)?#11$/, "maj7_11"],
  [/^(maj|Maj|ma|Ma|Δ|\^|M|j)(7|9|13)?$/, "maj7"],
  [/^(m|-|mi|min)6(9|\/9)?$/, "m6"],
  [/^(m|-|mi|min)(7|9|11|13)$/, "m7"],
  [/^(m|-|mi|min)$/, "moll"],
  [/^(6|69|6\/9)$/, "dur6"],
  [/^(add9|add2|2)$/, "dur", "Die None wird nicht mitgespielt."],
  [/^(7|9|13)?sus(4|2)?$|^(7|9|13)sus(4|2)?$/, "sus7"],
  [/^(7|9|13)#11$/, "dom7_11"],
  [/^7?alt$/, "dom7_alt"],
  [/^(7|9|13)?((b9|#9|b13|#5|\+5|b5|-9|\+9)+)$/, "dom7_alt"],
  [/^(\+7|7\+|7#5)$/, "dom7_alt"],
  [/^(7|9|11|13)$/, "dom7"],
  [/^(\+|aug)$/, "dur", "Übermäßiger Dreiklang, gespielt als Dur-Dreiklang."],
  [/^$/, "dur"],
];

/** Liest die Akkordart aus dem Rest eines Symbols. */
export function leseArt(rest) {
  const s = rest.replace(/[()\s]/g, "").replace(/♭/g, "b").replace(/♯/g, "#").replace(/−/g, "-");
  for (const [muster, q, hinweis] of ARTEN) if (muster.test(s)) return { q, hinweis: hinweis || null };
  return null;
}

/**
 * Ein ganzes Akkordsymbol. Ein Bass nach Schrägstrich wird gelesen, aber
 * nicht gespielt — die Band spielt immer den Grundton — und das wird gesagt.
 */
export function leseAkkord(text, naming = NAMING.DE) {
  const [kopf, bassText] = text.split("/");
  const g = leseGrundton(kopf, naming);
  if (!g) return { fehler: `„${text}“ hat keinen erkennbaren Grundton.` };
  const art = leseArt(g.rest);
  if (!art) return { fehler: `„${text}“ kenne ich nicht. Schreib ihn einfacher, etwa als 7, m7, maj7, m7b5 oder °7.` };
  const hinweise = [];
  if (art.hinweis) hinweise.push(`${text}: ${art.hinweis}`);
  if (bassText !== undefined && !/^(6\/9|9)$/.test(bassText)) {
    const b = leseGrundton(bassText, naming);
    if (!b || b.rest) return { fehler: `„${text}“: der Bass nach dem Schrägstrich ist unklar.` };
    hinweise.push(`${text}: der Bass ${bassText} wird nicht gespielt, die Band nimmt den Grundton.`);
  }
  return { step: g.step, alter: g.alter, q: art.q, hinweise };
}

/* --- Transposition ------------------------------------------------------------- */

/* Das Alt klingt eine große Sexte tiefer, als es greift: neun Halbtöne,
   fünf Stufen. Über Stufen gerechnet bleibt die Schreibweise richtig —
   gegriffen C wird klingend Es, nicht Dis. */
export const zuKlingend = p => spellOnStep(toMidi(p) - 9, (p.step + 2) % 7);
export const zuGegriffen = p => spellOnStep(toMidi(p) + 9, (p.step + 5) % 7);

/* --- Ganzes Leadsheet ------------------------------------------------------------ */

/**
 * Liest ein Leadsheet. `eingabe` ist "klingend" oder "es".
 *
 * Gibt die Akkorde **klingend** im Format der Begleitung zurück
 * (`root`, `q`, `takte`, `abTakt`, `symbol`), dazu die Takte zur Anzeige,
 * Abschnittsmarken, Fehler und Hinweise.
 *
 * Regeln fürs Schreiben:
 *   |           Taktstrich; ||, |: und :| gehen auch
 *   %           Takt wie der vorige
 *   [A] oder A: Abschnittsmarke am Taktanfang
 *   zwei Akkorde in einem Takt teilen ihn in Hälften, drei in 2+1+1 Schläge,
 *   vier in Viertel.
 */
export function leseLeadsheet(text, { eingabe = "klingend", naming = NAMING.DE, schlaege = 4 } = {}) {
  const fehler = [], hinweise = [], abschnitte = [], takte = [];
  const roh = String(text || "").replace(/\r/g, "").replace(/\n/g, " | ")
    .replace(/:?\|\|?:?/g, "|").split("|").map(t => t.trim());

  for (const zelle of roh) {
    if (!zelle) continue;
    let tokens = zelle.split(/\s+/).filter(Boolean);
    const marke = tokens[0] && (/^\[(.+)\]$/.exec(tokens[0]) || /^([A-Z][0-9']?):$/.exec(tokens[0]));
    if (marke) { abschnitte.push({ label: marke[1], abTakt: takte.length }); tokens = tokens.slice(1); }
    if (!tokens.length) continue;
    const nr = takte.length + 1;

    if (tokens.length === 1 && (tokens[0] === "%" || tokens[0] === "-")) {
      if (!takte.length) { fehler.push({ takt: nr, text: "%", grund: "Wiederholung am Anfang, es gibt noch keinen Takt davor." }); continue; }
      takte.push(takte[takte.length - 1].map(a => ({ ...a })));
      continue;
    }
    if (tokens.length > 4) {
      fehler.push({ takt: nr, text: zelle, grund: "Mehr als vier Akkorde in einem Takt — fehlt ein Taktstrich?" });
      continue;
    }
    const laengen = { 1: [4], 2: [2, 2], 3: [2, 1, 1], 4: [1, 1, 1, 1] }[tokens.length]
      .map(s => s * schlaege / 4);
    const akkorde = [];
    tokens.forEach((t, i) => {
      const a = leseAkkord(t, naming);
      if (a.fehler) { fehler.push({ takt: nr, text: t, grund: a.fehler }); return; }
      hinweise.push(...a.hinweise.map(h => `Takt ${nr}: ${h}`));
      const eingetippt = { step: a.step, alter: a.alter, octave: 3 };
      const klingend = eingabe === "es" ? zuKlingend({ ...eingetippt, octave: 4 }) : eingetippt;
      akkorde.push({ root: { ...klingend, octave: 3 }, q: a.q, schlaege: laengen[i], text: t });
    });
    if (akkorde.length === tokens.length) takte.push(akkorde);
  }

  // Flach machen, gleiche Akkorde hintereinander zusammenfassen: die Band
  // soll einen Akkord über vier Takte als einen spielen, nicht viermal
  // neu anschlagen.
  const akkorde = [];
  let pos = 0;
  for (const takt of takte) {
    for (const a of takt) {
      const vorher = akkorde[akkorde.length - 1];
      const gleich = vorher && vorher.q === a.q && toMidi(vorher.root) === toMidi(a.root)
        && vorher.root.step === a.root.step;
      const laenge = a.schlaege / schlaege;
      if (gleich) vorher.takte += laenge;
      else akkorde.push({ root: a.root, q: a.q, takte: laenge, abTakt: pos, symbol: chordSymbol(a.root, a.q, naming) });
      pos += laenge;
    }
  }
  return { akkorde, takte, abschnitte, fehler, hinweise, taktzahl: takte.length };
}

/** Wie ein klingender Akkord gegriffen heißt, im Symbol der App. */
export function gegriffenSymbol(akkord, naming = NAMING.DE) {
  const g = zuGegriffen({ ...akkord.root, octave: 4 });
  return gross(chordSymbol(g, akkord.q, naming));
}

const gross = s => s.charAt(0).toUpperCase() + s.slice(1);

/* --- Vorlagen ----------------------------------------------------------------------
   Nur allgemeine Formen, die jeder so spielt. Die Harmonien eines
   bestimmten Standards stehen hier bewusst nicht: die trägt man aus dem
   eigenen Leadsheet ein, statt einer Fassung aus dem Gedächtnis zu trauen. */

export const VORLAGEN = [
  { id: "blues", name: "Blues", takte: 12,
    was: "Zwölf Takte mit Quick Change und Turnaround.",
    stufen: "| I7 | IV7 | I7 | I7 | IV7 | IV7 | I7 | I7 | V7 | IV7 | I7 | V7 |" },
  { id: "jazzblues", name: "Jazz-Blues", takte: 12,
    was: "Der Blues, wie ihn eine Jazzband spielt: Zwischendominanten, II–V, Turnaround. Straight, No Chaser ist ein Blues in F, klingend.",
    stufen: "| I7 | IV7 | I7 | v7 I7 | IV7 | #IV°7 | I7 | VI7 | ii7 | V7 | I7 VI7 | ii7 V7 |" },
  { id: "rhythm", name: "Rhythm Changes", takte: 32,
    was: "AABA über 32 Takte, die Form von I Got Rhythm. Oleo ist Rhythm Changes in B, klingend.",
    stufen: "[A] | Imaj7 vi7 | ii7 V7 | Imaj7 vi7 | ii7 V7 | v7 I7 | IVmaj7 #IV°7 | Imaj7 vi7 | ii7 V7 |" +
            "[A] | Imaj7 vi7 | ii7 V7 | Imaj7 vi7 | ii7 V7 | v7 I7 | IVmaj7 #IV°7 | ii7 V7 | Imaj7 |" +
            "[B] | III7 | III7 | VI7 | VI7 | II7 | II7 | V7 | V7 |" +
            "[A] | Imaj7 vi7 | ii7 V7 | Imaj7 vi7 | ii7 V7 | v7 I7 | IVmaj7 #IV°7 | ii7 V7 | Imaj7 |" },
  { id: "mollblues", name: "Moll-Blues", takte: 12,
    was: "Zwölf Takte in Moll, mit der VI als Farbe vor der Dominante.",
    stufen: "| i7 | i7 | i7 | i7 | iv7 | iv7 | i7 | i7 | bVI7 | V7 | i7 | V7 |" },
];

const STUFE = { I: 0, II: 2, III: 4, IV: 5, V: 7, VI: 9, VII: 11 };
/* In Moll liegen III, VI und VII einen Halbton tiefer als in Dur; so steht
   es auch in der Vorlage: ♭VI7 ist in c-Moll As7. */

/**
 * Setzt eine Vorlage in eine klingende Tonart und gibt den Text zurück, so
 * wie man ihn selbst eintippen würde. Großbuchstaben sind Stufen mit dem
 * angegebenen Suffix, kleine sind Moll — „ii7“ heißt m7 auf der zweiten Stufe.
 */
export function vorlageText(id, tonika, naming = NAMING.DE) {
  const v = VORLAGEN.find(x => x.id === id);
  return v ? stufenText(v.stufen, tonika, naming) : "";
}

/**
 * Macht aus Stufen ein Leadsheet in einer Tonart: `| I7 | IV7 | ii7 V7 |`
 * über F wird `| F7 | B7 | Gm7 C7 |`. Groß ist Dur, klein ist Moll; ohne
 * Endung ein Dreiklang (vi → Am), mit 7 ein Septakkord (ii7 → Dm7),
 * dazu maj7 und °7. Vorzeichen vor der Stufe verschieben um einen
 * Halbton (bVI, #IV). Buchstabiert wird über Stufen.
 */
export function stufenText(stufen, tonika, naming = NAMING.DE) {
  const t = { ...tonika, octave: 3 };
  return stufen.replace(/([#b]?)([ivIV]+)(°7|maj7|7)?(?=[\s|]|$)/g, (_, vz, roem, suffix = "") => {
    const klein = roem === roem.toLowerCase();
    const idx = ["I", "II", "III", "IV", "V", "VI", "VII"].indexOf(roem.toUpperCase());
    const halbton = STUFE[roem.toUpperCase()] + (vz === "#" ? 1 : vz === "b" ? -1 : 0);
    const root = spellOnStep(toMidi(t) + halbton, (t.step + idx) % 7);
    const name = gross(spell(root, naming));
    if (suffix === "°7") return name + "°7";
    if (suffix === "7") return name + (klein ? "m7" : "7");
    if (suffix === "maj7") return name + "maj7";
    return name + (klein ? "m" : "");
  }).replace(/\s+/g, " ").trim();
}

export { STAMM };
