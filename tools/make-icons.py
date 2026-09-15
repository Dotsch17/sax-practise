#!/usr/bin/env python3
"""Erzeugt die PWA-Icons.

Nicht Teil der App und nicht Teil eines Build-Schritts. Die fertigen PNGs
liegen im Repo; dieses Skript ist nur da, damit sie reproduzierbar sind,
falls das Motiv einmal geaendert wird.

    pip install pillow
    python tools/make-icons.py pfad/zu/InstrumentSerif-Regular.ttf

Die TTF wird bewusst nicht mitgeliefert: fuer die App reichen die
woff2-Subsets unter fonts/, und das Rendern hier ist ein Einmal-Schritt.
Quelle: https://github.com/google/fonts/tree/main/ofl/instrumentserif
"""

import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

GROUND = (0x0C, 0x22, 0x26)   # --ground
BRASS  = (0xC8, 0x9B, 0x4A)   # --brass
GLYPH  = "Ü"             # Ü, passend zum Home-Screen-Titel "Üben"

OUT = Path(__file__).resolve().parent.parent / "icons"

# (Datei, Kantenlaenge, Anteil der Kante, den die Glyphenhoehe einnimmt)
# Maskable-Icons werden von Android beschnitten, deshalb bleibt die Glyphe
# dort in der Safe Zone, also innerhalb von 80 Prozent der Kante.
TARGETS = [
    ("icon-192.png",          192, 0.60),
    ("icon-512.png",          512, 0.60),
    ("icon-maskable-512.png", 512, 0.42),
    ("apple-touch-icon.png",  180, 0.60),
]

# Ueber der Zeichenkante rendern und herunterskalieren -- das gibt weiche
# Kanten auch bei 180 px, ohne Antialiasing-Tricks.
SS = 4


def render(size, height_ratio, font_path):
    big = size * SS
    img = Image.new("RGB", (big, big), GROUND)
    draw = ImageDraw.Draw(img)

    # Schriftgroesse so waehlen, dass die tatsaechliche Glyphenhoehe passt,
    # nicht die nominelle Em-Groesse. Instrument Serif hat viel Luft ueber
    # den Umlautpunkten, das wuerde das Icon sonst zu klein aussehen lassen.
    target_h = big * height_ratio
    px = int(target_h)
    while True:
        font = ImageFont.truetype(font_path, px)
        l, t, r, b = font.getbbox(GLYPH)
        if (b - t) <= target_h or px <= 8:
            break
        px -= max(1, px // 40)

    font = ImageFont.truetype(font_path, px)
    l, t, r, b = font.getbbox(GLYPH)
    x = (big - (r - l)) / 2 - l
    y = (big - (b - t)) / 2 - t
    draw.text((x, y), GLYPH, font=font, fill=BRASS)

    return img.resize((size, size), Image.LANCZOS)


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    font_path = sys.argv[1]
    OUT.mkdir(exist_ok=True)
    for name, size, ratio in TARGETS:
        path = OUT / name
        render(size, ratio, font_path).save(path, optimize=True)
        print(f"{path.stat().st_size:>7} B  {name}")


if __name__ == "__main__":
    main()
