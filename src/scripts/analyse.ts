// The "Analyse" tab under a card: while it's showing, the live component on the
// card becomes an inspector, like Figma's dev mode. Every named layer (data/specs.ts)
// gets a faint outline; the one under the pointer (or tapped) is outlined with its
// padding shaded, and its path, size, type, colours, radius and padding are listed
// in the Analyse tab itself. The card carries no text of its own.
// Values are read from the page as it is, divided back to the design scale, and
// colours are named by the card's tokens where they match.
// Runs while the Analyse tab is showing in an open note (notes.ts tells us).

type Layer = { selector: string; name: string; text?: boolean }
type Token = { name: string; value: string; swatch?: string }
type Spec = { layers: Layer[]; tokens: { group: string; items: Token[] }[]; scaleVar?: string }

const WEIGHTS: Record<string, string> = { "300": "Light", "400": "Regular", "500": "Medium", "600": "Semibold", "700": "Bold" }

// "rgb(26, 26, 26)" / "#1a1a1a" / "rgba(…)" -> [r, g, b, a]
function rgba(colour: string): [number, number, number, number] | null {
    const hex = colour.trim().match(/^#([0-9a-f]{6})$/i)
    if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)).concat(1) as [number, number, number, number]
    const m = colour.match(/rgba?\(([^)]+)\)/)
    if (!m) return null
    const [r, g, b, a = "1"] = m[1].split(/[,\s/]+/).filter(Boolean)
    return [+r, +g, +b, +a]
}
const toHex = ([r, g, b]: number[]) => "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase()
const same = (a: number[], b: number[]) => a.every((v, i) => Math.abs(v - b[i]) < (i === 3 ? 0.02 : 1.5))

const round = (n: number) => Math.round(n * 2) / 2 // to the half pixel, like the design values

document.querySelectorAll<HTMLElement>(".work-note[data-spec]").forEach((note) => {
    const card = note.closest(".work-item")?.querySelector<HTMLElement>(".card")
    if (!card) return
    const spec: Spec = JSON.parse(note.dataset.spec!)
    if (!spec.layers?.length) return
    const colours = spec.tokens.flatMap((g) => g.items).filter((t) => t.swatch)

    let overlay: HTMLElement | null = null
    let selected: Element | null = null
    const panel = note.querySelector<HTMLElement>("[data-analyse-panel]")
    const hint = panel?.innerHTML ?? ""

    const tokenFor = (c: number[]) => colours.find((t) => same(rgba(t.swatch!) ?? [], c))?.name
    const describeColour = (value: string) => {
        const c = rgba(value)
        if (!c || c[3] === 0) return null
        const name = tokenFor(c)
        const hex = toHex(c) + (c[3] < 1 ? ` · ${Math.round(c[3] * 100)}%` : "")
        return { name, hex, css: value }
    }
    const layerOf = (el: Element) => spec.layers.find((l) => el.matches(l.selector))
    // only what can be seen: parts waiting in the wings (faded out, hidden) are skipped
    const visible = (el: Element) => {
        for (let n: Element | null = el; n && n !== card; n = n.parentElement) {
            const cs = getComputedStyle(n)
            if (parseFloat(cs.opacity) < 0.05 || cs.visibility === "hidden" || cs.display === "none") return false
        }
        return true
    }

    // the component's own scale (it grows with its card); sizes are shown at scale 1.
    // Custom properties inherit, so any layer can read it.
    const scaleOf = (el: Element) => (spec.scaleVar && parseFloat(getComputedStyle(el).getPropertyValue(spec.scaleVar))) || 1
    // an element's box in the card's own (unscaled) coordinates
    const boxOf = (el: Element) => {
        const cr = card.getBoundingClientRect()
        const z = cr.width / card.offsetWidth || 1
        const r = el.getBoundingClientRect()
        return { x: (r.left - cr.left) / z, y: (r.top - cr.top) / z, w: r.width / z, h: r.height / z }
    }

    const make = (cls: string, parent: HTMLElement, tag = "div") => {
        const el = document.createElement(tag)
        el.className = cls
        parent.appendChild(el)
        return el
    }

    const outlineAll = () => {
        if (!overlay) return
        const layer = overlay.querySelector<HTMLElement>(".an-outlines")!
        layer.replaceChildren()
        spec.layers.forEach((l) =>
            card.querySelectorAll(l.selector).forEach((el) => {
                const b = boxOf(el)
                if (!b.w || !b.h || !visible(el)) return
                const o = make("an-outline", layer)
                Object.assign(o.style, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px` })
            }),
        )
    }

    const show = (el: Element | null) => {
        if (!overlay || el === selected) return
        selected = el
        const focus = overlay.querySelector<HTMLElement>(".an-focus")!
        const pad = overlay.querySelector<HTMLElement>(".an-pad")!
        overlay.classList.toggle("has-focus", !!el)
        if (!panel) return
        if (!el) {
            panel.innerHTML = hint
            return
        }
        const layer = layerOf(el)!
        const cs = getComputedStyle(el)
        const k = scaleOf(el)
        const b = boxOf(el)
        Object.assign(focus.style, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px` })

        const p = ["Top", "Right", "Bottom", "Left"].map((s) => parseFloat(cs.getPropertyValue(`padding-${s.toLowerCase()}`)) || 0)
        const z = b.w / ((el as HTMLElement).offsetWidth || b.w) // the carousel's scale, if any
        Object.assign(pad.style, {
            left: `${b.x}px`,
            top: `${b.y}px`,
            width: `${b.w}px`,
            height: `${b.h}px`,
        })
        pad.style.borderWidth = `${p[0] * z}px ${p[1] * z}px ${p[2] * z}px ${p[3] * z}px`

        // the layer's path: its named ancestors, outermost first
        const names: string[] = []
        for (let n: Element | null = el; n && n !== card; n = n.parentElement) {
            const l = layerOf(n)
            if (l) names.unshift(l.name)
        }

        const w = (el as HTMLElement).offsetWidth / k
        const h = (el as HTMLElement).offsetHeight / k
        const px = (n: number) => `${round(n)}px`
        const rows: [string, string][] = [["Size", `${px(w)} × ${px(h)}`]]
        if (layer.text) {
            const family = cs.fontFamily.split(",").map((f) => f.trim().replace(/["']/g, "")).find((f) => f !== "Inter Punct") ?? ""
            rows.push(["Type", `${family} ${WEIGHTS[cs.fontWeight] ?? cs.fontWeight} · ${px(parseFloat(cs.fontSize) / k)}`])
        }
        const swatch = (c: ReturnType<typeof describeColour>) =>
            c ? `<span class="an-sw" style="background:${c.css}"></span>${c.name ? `<b>${c.name}</b> ` : ""}${c.hex}` : ""
        const fill = describeColour(cs.backgroundColor)
        if (fill) rows.push(["Fill", swatch(fill)])
        if (layer.text) {
            const ink = describeColour(cs.color)
            if (ink) rows.push(["Text", swatch(ink)])
        }
        const radius = parseFloat(cs.borderTopLeftRadius) / k
        if (radius) rows.push(["Radius", px(radius)])
        if (p.some(Boolean)) {
            const v = p.map((x) => round(x / k))
            const list = v.every((x) => x === v[0]) ? [v[0]] : v[0] === v[2] && v[1] === v[3] ? [v[0], v[1]] : v
            const short = list.map((x) => `${x}px`).join(" ")
            rows.push(["Padding", short])
        }
        const gap = parseFloat(cs.columnGap || cs.gap) / k
        if (gap && cs.display.includes("flex")) rows.push(["Gap", px(gap)])

        panel.innerHTML =
            `<p class="an-path">${names.map((n, i) => (i === names.length - 1 ? `<b>${n}</b>` : n)).join(" › ")}</p>` +
            `<dl>${rows.map(([t, v]) => `<div><dt>${t}</dt><dd>${v}</dd></div>`).join("")}</dl>`
    }

    // the deepest named layer under a point
    const pick = (x: number, y: number) => {
        for (const el of document.elementsFromPoint(x, y)) {
            if (overlay?.contains(el)) continue
            if (!card.contains(el)) break
            if (layerOf(el) && visible(el)) return el
        }
        return null
    }

    const start = () => {
        if (overlay) return
        overlay = make("an-overlay", card)
        make("an-outlines", overlay)
        make("an-pad", overlay)
        make("an-focus", overlay)
        selected = undefined as any
        show(null)
        outlineAll()
        card.classList.add("is-analysing")
        requestAnimationFrame(() => overlay?.classList.add("is-in"))

        overlay.addEventListener("pointermove", (e) => {
            if (e.pointerType !== "mouse") return
            const el = pick(e.clientX, e.clientY)
            if (el) show(el)
        })
        // leaving the card keeps the last layer listed, so its values can be read
        overlay.addEventListener("click", (e) => show(pick(e.clientX, e.clientY)))
        addEventListener("resize", outlineAll)
    }
    const stop = () => {
        if (!overlay) return
        const old = overlay
        overlay = null
        old.classList.remove("is-in")
        setTimeout(() => old.remove(), 200)
        if (panel) panel.innerHTML = hint
        card.classList.remove("is-analysing")
        removeEventListener("resize", outlineAll)
    }

    note.addEventListener("note:tab", (e) => {
        const { tab, open } = (e as CustomEvent).detail
        if (open && tab === 1) start()
        else stop()
    })
})
