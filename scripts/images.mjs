// Generates the work-card images: for every source in src/assets/work, an AVIF
// (quality 90, full colour, visually lossless) and a lossless WebP fallback, each
// at 1x, 2x and 3x the largest size the card shows it at. The page picks the right
// one per screen (see src/components/WorkImage.astro).
//
// Run: npm run images  (also runs automatically before every build)

import sharp from "sharp"
import { mkdir, writeFile, readdir } from "node:fs/promises"
import { existsSync } from "node:fs"

const SRC = "src/assets/work"
const OUT = "public/media/work"
const MANIFEST = "src/data/images.json"

// the box each image is shown in on desktop (the largest), in CSS pixels
const BOX = {
    "wallet-home-hq": [405, 570],
    SZB8MGBYtuMoqpmrvEvFoBevFxc: [405, 570],
    POSwVU7ZYAKsBv8prb5yQe4nE3k: [405, 570],
    LWyU3Kwt63ukHhi1DEkQvMJm5Y: [575, 570],
    h7fAIMpsN8qqOrXqoJHIz7HGvcQ: [405, 570],
    "8rdpwNSTMBDIBc1ipVIStD4": [405, 570],
    R7s3lREuP7ucRDajhSF9q2dNM: [502, 571],
}

await mkdir(OUT, { recursive: true })
const manifest = {}

for (const file of await readdir(SRC)) {
    const name = file.replace(/\.\w+$/, "")
    const box = BOX[name]
    if (!box) continue
    const meta = await sharp(`${SRC}/${file}`).metadata()
    // the size the image actually shows at inside its box ("contain")
    const scale = Math.min(box[0] / meta.width, box[1] / meta.height)
    const shown = Math.round(meta.width * scale)
    const widths = [...new Set([1, 2, 3].map((x) => Math.min(meta.width, shown * x)))]
    for (const w of widths) {
        const avif = `${OUT}/${name}-${w}.avif`
        const webp = `${OUT}/${name}-${w}.webp`
        const resized = () => sharp(`${SRC}/${file}`).resize({ width: w })
        if (!existsSync(avif)) await writeFile(avif, await resized().avif({ quality: 90, effort: 6, chromaSubsampling: "4:4:4" }).toBuffer())
        if (!existsSync(webp)) await writeFile(webp, await resized().webp({ lossless: true, effort: 6 }).toBuffer())
    }
    manifest[name] = { width: meta.width, height: meta.height, shown, widths }
    console.log(name, "shown at", shown + "px", "→", widths.join(", "))
}

await writeFile(MANIFEST, JSON.stringify(manifest, null, 1) + "\n")
