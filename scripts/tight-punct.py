"""Makes public/fonts/Inter-Medium-Punct.woff2: Inter Medium's comma and dot only,
with TRIM font units taken off each side. The swap card's rolling numbers draw every
character on its own, so the font's kerning never applies and the separators read as
loose; this font (listed first, for those two characters only) tightens them while
the library still measures plain glyphs.

    pip install fonttools brotli && python3 scripts/tight-punct.py [TRIM]
"""
import sys
from fontTools.ttLib import TTFont
from fontTools.subset import Subsetter, Options

TRIM = int(sys.argv[1]) if len(sys.argv) > 1 else 60  # of 2048 units per em

opts = Options()
opts.flavor = "woff2"
opts.layout_features = []
opts.name_IDs = ["*"]
font = TTFont("public/fonts/Inter-Medium.woff2")
sub = Subsetter(opts)
sub.populate(unicodes=[ord(","), ord(".")])
sub.subset(font)

glyf, hmtx = font["glyf"], font["hmtx"]
for name in ("comma", "period"):
    g = glyf[name]
    if g.isComposite():
        for c in g.components:
            c.x -= TRIM
    else:
        g.coordinates.translate((-TRIM, 0))
    g.recalcBounds(glyf)
    adv, lsb = hmtx[name]
    hmtx[name] = (adv - 2 * TRIM, lsb - TRIM)

font.flavor = "woff2"
font.save("public/fonts/Inter-Medium-Punct.woff2")
print("trim", TRIM)
