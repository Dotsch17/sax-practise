#!/usr/bin/env python3
"""Holt die Notenzeichen einmalig aus Bravura und schreibt sie als SVG-Pfade
nach js/music/glyphs.js.

Nicht Teil der App und kein Build-Schritt. Die erzeugte Datei liegt im Repo
und wird nie zur Laufzeit gebraucht — es kommt also keine Schriftdatei und
kein Laufzeit-Paket dazu. Nur die Pfaddaten wandern in den Quellcode.

    pip install fonttools
    python tools/extract-glyphs.py

Bravura ist die Referenzschrift zu SMuFL, von Steinberg, unter SIL OFL 1.1.
Ein Em ist 1000 Einheiten, ein Notenlinienabstand 250 Einheiten. Hier wird
auf den Maszstab des Renderers umgerechnet: ein Linienabstand ist 10, und
die y-Achse wird gespiegelt, weil SVG nach unten zaehlt.
"""

import sys
import urllib.request
from pathlib import Path

try:
    from fontTools.ttLib import TTFont
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.pens.transformPen import TransformPen
    from fontTools.misc.transform import Transform
except ImportError:
    sys.exit("fontTools fehlt:  pip install fonttools")

URL = "https://raw.githubusercontent.com/steinbergmedia/bravura/master/redist/otf/Bravura.otf"
ROOT = Path(__file__).resolve().parent.parent
CACHE = Path(__file__).resolve().parent / "_Bravura.otf"
OUT = ROOT / "js" / "music" / "glyphs.js"

SP = 10.0            # Linienabstand im Renderer
SPACE_UNITS = 250.0  # Linienabstand in Bravura
SCALE = SP / SPACE_UNITS

# Nur was gebraucht wird. Jeder Eintrag: Name im Code -> SMuFL-Codepoint.
GLYPHS = {
    # Schluessel
    "gClef":            0xE050,
    "fClef":            0xE062,
    # Notenkoepfe
    "noteheadWhole":    0xE0A2,
    "noteheadHalf":     0xE0A3,
    "noteheadBlack":    0xE0A4,
    "noteheadXBlack":   0xE0A9,
    # Faehnchen
    "flag8thUp":        0xE240,
    "flag8thDown":      0xE241,
    "flag16thUp":       0xE242,
    "flag16thDown":     0xE243,
    # Vorzeichen
    "accFlat":          0xE260,
    "accNatural":       0xE261,
    "accSharp":         0xE262,
    "accDoubleSharp":   0xE263,
    "accDoubleFlat":    0xE264,
    # Pausen
    "restWhole":        0xE4E3,
    "restHalf":         0xE4E4,
    "restQuarter":      0xE4E5,
    "rest8th":          0xE4E6,
    "rest16th":         0xE4E7,
    # Taktzahlen
    **{f"timeSig{d}": 0xE080 + d for d in range(10)},
    # Punkt, Artikulation, Atem
    "augmentationDot":  0xE1E7,
    "accentAbove":      0xE4A0,
    "accentBelow":      0xE4A1,
    "staccatoAbove":    0xE4A2,
    "staccatoBelow":    0xE4A3,
    "tenutoAbove":      0xE4A4,
    "tenutoBelow":      0xE4A5,
    "marcatoAbove":     0xE4AC,
    "fermataAbove":     0xE4C0,
    "breathMarkComma":  0xE4CE,
    "caesura":          0xE4D1,
    # Dynamik
    "dynP":             0xE520,
    "dynM":             0xE521,
    "dynF":             0xE522,
    "dynR":             0xE523,
    "dynS":             0xE524,
    "dynZ":             0xE525,
    # Wiederholung und Segno
    "segno":            0xE047,
    "coda":             0xE048,
    "repeatDots":       0xE043,
}


def fetch():
    if CACHE.exists():
        return CACHE
    print("Lade Bravura ...")
    urllib.request.urlretrieve(URL, CACHE)
    return CACHE


def main():
    font = TTFont(fetch())
    cmap = font.getBestCmap()
    glyphset = font.getGlyphSet()
    upem = font["head"].unitsPerEm
    if upem != 1000:
        print(f"Warnung: unerwartete Em-Groesze {upem}")

    rows = []
    missing = []
    for name, cp in GLYPHS.items():
        gname = cmap.get(cp)
        if gname is None:
            missing.append(f"{name} (U+{cp:04X})")
            continue
        pen = SVGPathPen(glyphset, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
        # y spiegeln, weil SVG nach unten waechst, und auf Linienabstand skalieren
        tpen = TransformPen(pen, Transform(SCALE, 0, 0, -SCALE, 0, 0))
        glyphset[gname].draw(tpen)
        d = pen.getCommands()
        if not d:
            missing.append(f"{name} (leer)")
            continue
        adv = glyphset[gname].width * SCALE
        rows.append((name, d, adv))

    if missing:
        print("Nicht gefunden: " + ", ".join(missing))

    head = f'''/* ==========================================================================
   Notenzeichen als SVG-Pfade

   ERZEUGT von tools/extract-glyphs.py — nicht von Hand aendern.

   Die Umrisse stammen aus Bravura, der Referenzschrift zu SMuFL
   (https://github.com/steinbergmedia/bravura), Copyright Steinberg Media
   Technologies GmbH, lizenziert unter der SIL Open Font License 1.1. Der
   Lizenztext liegt in fonts/OFL.txt. Sie stehen hier als Pfaddaten und nicht
   als Schriftdatei, damit zur Laufzeit nichts nachgeladen werden muss.

   Maszstab: ein Notenlinienabstand ist {SP:.0f} Einheiten, der Ursprung jedes
   Zeichens ist sein Setzpunkt auf der Grundlinie. Die y-Achse zeigt nach
   unten, passend zu SVG.
   ========================================================================== */

"use strict";

/** Vorschubbreite je Zeichen, im selben Maszstab. */
export const ADVANCE = {{
{chr(10).join(f'  {n}: {a:.2f},' for n, d, a in rows)}
}};

/** Umrisse. Einsetzen mit <path d="{{...}}" fill="currentColor"/>. */
export const GLYPH = {{
'''
    body = "\n".join(f'  {n}: "{d}",' for n, d, a in rows)
    tail = "\n};\n"

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(head + body + tail, encoding="utf-8")
    size = OUT.stat().st_size
    print(f"{len(rows)} Zeichen -> {OUT.relative_to(ROOT)}  ({size/1024:.1f} KB)")


if __name__ == "__main__":
    main()
