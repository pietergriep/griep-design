"""Trims the site's fonts to the characters it uses, for a much smaller download (the
intro waits for the fonts before it blurs in). Reads the full fonts in fonts-src/ and
writes public/fonts/<name>.latin.woff2. Every OpenType feature is kept (tabular and
proportional figures, alternates, kerning) and Geist keeps its variable weight axis.

The set: Basic Latin, Latin-1 (accents, © · × °), a few extras, typographic
punctuation (– — ‘ ’ “ ” … •), the euro and arrows (→ ⇄) and a little maths (≈ ≥ −).
If the site starts using a character outside it, add it to RANGES and run this again.

    pip install fonttools brotli && python3 scripts/subset-fonts.py
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.subset import Subsetter, Options

FONTS = ["Geist-Variable", "InterDisplay-Regular", "InterDisplay-Medium", "Inter-Medium"]
RANGES = [
    (0x0020, 0x007E), (0x00A0, 0x00FF), (0x0131, 0x0131), (0x0152, 0x0153),
    (0x02C6, 0x02C6), (0x02DA, 0x02DA), (0x02DC, 0x02DC),
    (0x2010, 0x2027), (0x2030, 0x203A), (0x2044, 0x2044), (0x20AC, 0x20AC), (0x2122, 0x2122),
    (0x2190, 0x2199), (0x21C4, 0x21C4), (0x2212, 0x2212), (0x2248, 0x2248), (0x2260, 0x2260), (0x2264, 0x2265),
]
unicodes = [u for a, b in RANGES for u in range(a, b + 1)]

root = Path(__file__).resolve().parent.parent
for name in FONTS:
    src = root / "fonts-src" / f"{name}.woff2"
    out = root / "public" / "fonts" / f"{name}.latin.woff2"
    opts = Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    font = TTFont(src)
    sub = Subsetter(opts)
    sub.populate(unicodes=unicodes)
    sub.subset(font)
    font.save(out)
    print(f"{name}: {src.stat().st_size // 1024} KB -> {out.stat().st_size // 1024} KB")
