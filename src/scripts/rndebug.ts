// TEMPORARY diagnostic (remove once the iPhone digit gap is fixed): with ?rndebug in
// the address, prints where the rolling-number library measured each digit versus
// where the glyph is actually drawn, for the swap card's numbers. Tap the panel to refresh.
const box = document.createElement("pre")
box.style.cssText =
    "position:fixed;left:6px;right:6px;bottom:6px;z-index:2147483647;max-height:55vh;overflow:auto;margin:0;padding:8px;background:rgba(0,0,0,.85);color:#7CFC9A;font:10px/1.35 ui-monospace,Menlo,monospace;white-space:pre-wrap;border-radius:8px"
const report = () => {
    const out: string[] = [`dpr ${devicePixelRatio} | ${navigator.userAgent.replace(/.*(iPhone OS [\d_]+|Version\/[\d.]+).*/, "$1")}`]
    document.querySelectorAll<HTMLElement>(".swap-card__amount, .swap-card__sub, .swap-card__avail-val").forEach((el) => {
        const root = el.querySelector<HTMLElement>(".rn-root")
        if (!root) return
        const cs = getComputedStyle(root)
        const base = root.getBoundingClientRect().left
        const f = (n: number) => (n - base).toFixed(1)
        const meas = [...root.querySelectorAll<HTMLElement>(".rn-measure .rn-token")].map((t) => {
            const r = t.getBoundingClientRect()
            return `${t.textContent}@${f(r.left)}+${r.width.toFixed(1)}`
        })
        const slots = [...root.querySelectorAll<HTMLElement>(".rn-visual > .rn-slot")].map((s) => {
            const r = s.getBoundingClientRect()
            // the face showing right now (the one nearest the slot's vertical middle)
            const mid = r.top + r.height / 2
            let glyph = ""
            let best = Infinity
            s.querySelectorAll<HTMLElement>(".rn-face").forEach((face) => {
                const fr = face.getBoundingClientRect()
                const d = Math.abs(fr.top + fr.height / 2 - mid)
                if (d < best && face.firstChild) {
                    best = d
                    const range = document.createRange()
                    range.selectNodeContents(face)
                    const g = range.getBoundingClientRect()
                    glyph = `${face.textContent}@${f(g.left)}+${g.width.toFixed(1)}`
                }
            })
            return `[slot ${f(r.left)}+${r.width.toFixed(1)} op${getComputedStyle(s).opacity} ${glyph}]`
        })
        out.push(
            `\n${el.className.replace("swap-card__", "")} "${root.querySelector(".rn-semantic, .rn-value")?.textContent}" font ${cs.fontSize} ${cs.fontFamily.split(",")[0]} ls ${cs.letterSpacing} fvn ${cs.fontVariantNumeric}`,
            `  measured: ${meas.join("  ")}`,
            `  drawn:    ${slots.join(" ")}`
        )
    })
    box.textContent = out.join("\n")
}
document.body.appendChild(box)
box.addEventListener("click", report)
setInterval(report, 1500)
report()
