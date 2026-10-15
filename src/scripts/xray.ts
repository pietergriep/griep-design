// "Learn more" on the File Explorer card: an exploded technical drawing of the component.
// The live component fades out; in its place its layers are redrawn as solid line-art
// shapes (measured from the component as it is on screen right now), first lying exactly
// on top of it, then tilted into an isometric stack. Flat labels with leader lines name
// the parts, like an exploded-view diagram.
// "Close" plays it back. Triggered by notes.ts.

// ---- tuning ----------------------------------------------------------------------
const TILT_X = 58 // deg: how far the stack leans back
const TILT_Z = -28 // deg: turn, for the isometric look
const SPREAD = 125 // px between layers
const FIT = 0.74 // the stack's size relative to the card
const MS = 1000 // open / close duration
const EASE = "cubic-bezier(.22,1,.36,1)"
const INK = "#a8a8a8" // outlines of the parts
const INK_SOFT = "#d4d4d4" // placeholder lines and leader lines
const TEXT = "#8f8f8f" // labels
const PAPER = "none" // fill of the parts: outlines only
const TINT = "none" // fill of the highlighted parts (stacks, type tags): outlines only too
const LEADER_GAP = 16 // px left free between a leader line and its part
const LINE_W = 1 // px, at any tilt or scale
const EDGE_FADE = 56 // px: where a layer is cut off by the container's top / bottom edge, it dissolves over this distance
const EDGE_BLUR = 3 // blur of the dissolving part

type Box = { x: number; y: number; w: number; h: number; r: number }
type Shape = Box & { fill?: string; line?: boolean } // line: drawn as a single stroke (placeholders)
type Callout = { text: string; box: Box; side: "left" | "right" }
type Layer = { shapes: Shape[]; callouts: Callout[]; soften?: boolean } // soften: no hard cut where it meets the container's edge

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches

// measure an element in the card's own (unscaled) coordinates
function measure(card: HTMLElement) {
    const cr = card.getBoundingClientRect()
    const z = cr.width / card.offsetWidth || 1
    return (el: Element | null, textOnly = false): Box | null => {
        if (!el) return null
        let r: DOMRect
        if (textOnly) {
            const range = document.createRange()
            range.selectNodeContents(el)
            r = range.getBoundingClientRect()
        } else r = el.getBoundingClientRect()
        if (!r.width || !r.height) return null
        const he = el as HTMLElement
        const own = he.offsetWidth ? r.width / he.offsetWidth : 1
        const radius = textOnly ? 0 : (parseFloat(getComputedStyle(he).borderTopLeftRadius) || 0) * own
        return { x: (r.left - cr.left) / z, y: (r.top - cr.top) / z, w: r.width / z, h: r.height / z, r: radius / z }
    }
}

const inside = (b: Box, c: Box) => b.x + b.w > c.x && b.x < c.x + c.w && b.y + b.h > c.y && b.y < c.y + c.h

// the File Explorer, bottom to top
function fileExplorer(card: HTMLElement): { layers: Layer[]; clip: Box } | null {
    const box = measure(card)
    const shellBox = box(card.querySelector(".pcg .shell"))
    if (!shellBox) return null
    const keep = (b: Box | null): b is Box => !!b && inside(b, shellBox)
    const visible = (p: HTMLElement) => getComputedStyle(p).opacity !== "0" && !p.classList.contains("fhide")
    const papers = [...card.querySelectorAll<HTMLElement>(".pcg .paper")].filter(visible)

    // header
    const tabs = [...card.querySelectorAll(".pcg [role=tab]")].map((t) => box(t, true)).filter(keep)
    const crumb = box(card.querySelector(".pcg .crumb-pill"))
    const header: Shape[] = [...(keep(crumb) ? [crumb] : []), ...tabs.map((t) => ({ ...t, r: 3 }))]

    // files: one card per tile, drawn with its own title, tag and placeholder lines (so each
    // card reads as one part); a stack is its top paper with one paper peeking out behind
    const files: Shape[] = []
    const stackTiles: Box[] = []
    const looseBoxes: Box[] = []
    const tagBoxes: Box[] = []
    const titleBoxes: Box[] = []
    const cardWithContent = (p: HTMLElement, fill: string, isStack: boolean) => {
        const card = box(p.querySelector(".sheet"))
        if (!keep(card)) return null
        files.push({ ...card, fill })
        const t = box(isStack ? p.querySelector(".gttl") : p.querySelector(".ttl:not(.gttl)"), true)
        if (keep(t)) {
            files.push({ ...t, y: t.y + t.h * 0.2, h: t.h * 0.6, r: 2 })
            titleBoxes.push(t)
        }
        if (!isStack) {
            const tag = box(p.querySelector(".type"))
            if (keep(tag)) {
                files.push({ ...tag, fill: TINT })
                tagBoxes.push(tag)
            }
        }
        for (const el of p.querySelectorAll<HTMLElement>(".sheet *")) {
            if (el.childElementCount || el.matches(".ttl,.gttl,.type,.check,.check *,svg,svg *")) continue
            const cs = getComputedStyle(el)
            if (cs.backgroundColor === "rgba(0, 0, 0, 0)" || cs.opacity === "0") continue
            const b = box(el)
            if (keep(b)) files.push(b.h > 14 ? { ...b } : { ...b, line: true })
        }
        return card
    }
    for (const g of card.querySelectorAll<HTMLElement>(".pcg .group")) {
        if (!visible(g)) continue
        const members = [...g.querySelectorAll<HTMLElement>(".paper")]
        const top = members.find((p) => p.classList.contains("gtop")) || members[members.length - 1]
        const behind = members.filter((p) => p !== top).pop()
        const bb = box(behind?.querySelector(".sheet") || null)
        if (keep(bb)) files.push({ ...bb, fill: PAPER })
        const tb = top && cardWithContent(top, TINT, true)
        if (tb) stackTiles.push(tb)
    }
    for (const p of papers.filter((p) => !p.classList.contains("ingroup"))) {
        const b = cardWithContent(p, PAPER, false)
        if (b) looseBoxes.push(b)
    }

    // details
    const clips = [...card.querySelectorAll(".pcg .clip.front")].map((c) => box(c)).filter(keep)
    const counts = [...card.querySelectorAll(".pcg .glabel .count")].map((c) => box(c)).filter(keep)
    const thumb = box(card.querySelector(".pcg .sbar .sb-thumb"))
    const details: Shape[] = [...clips.map((c) => ({ ...c, r: c.w / 2 })), ...counts.map((c) => ({ ...c, fill: TINT })), ...(keep(thumb) ? [{ ...thumb, fill: TINT }] : [])]

    // callouts point at one representative part per layer (left side: leftmost, right: rightmost)
    const leftmost = (bs: Box[]) => bs.slice().sort((a, b) => a.x - b.x)[0]
    const rightmost = (bs: Box[]) => bs.slice().sort((a, b) => b.x + b.w - (a.x + a.w))[0]
    const topRow = (bs: Box[]) => {
        const y = Math.min(...bs.map((b) => b.y))
        return bs.filter((b) => b.y < y + 4)
    }
    const c = (text: string, b: Box | undefined, side: "left" | "right"): Callout[] => (b ? [{ text, box: b, side }] : [])
    return {
        clip: shellBox,
        layers: [
            { shapes: [{ ...shellBox, fill: PAPER }], callouts: c("Container", shellBox, "right") },
            {
                shapes: files,
                soften: true,
                callouts: [
                    ...c("Stack", leftmost(stackTiles), "left"),
                    ...c("Type tag", tagBoxes.length ? rightmost(topRow(tagBoxes)) : undefined, "right"),
                    ...c("File", looseBoxes.length ? rightmost(looseBoxes.filter((b) => b.y > Math.min(...looseBoxes.map((x) => x.y)) + 4)) : undefined, "right"),
                ],
            },
            // the header sits above the files, as in the component (pinned over the scrolling files)
            { shapes: header, callouts: c("Header", tabs.length ? rightmost(tabs) : keep(crumb) ? crumb : undefined, "right") },
            { shapes: details, callouts: [...c("Paperclip", clips.length ? leftmost(clips) : undefined, "left"), ...c("Scrollbar", keep(thumb) ? thumb : undefined, "right")] },
        ],
    }
}

function svgFor(w: number, h: number, layer: Layer, clip: Box, id: string) {
    const shape = (s: Shape) => {
        if (s.line) {
            const y = (s.y + s.h / 2).toFixed(2)
            return `<line x1="${s.x.toFixed(2)}" y1="${y}" x2="${(s.x + s.w).toFixed(2)}" y2="${y}" stroke="${INK_SOFT}" stroke-width="${LINE_W}" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`
        }
        return `<rect x="${s.x.toFixed(2)}" y="${s.y.toFixed(2)}" width="${s.w.toFixed(2)}" height="${s.h.toFixed(2)}" rx="${Math.min(s.r, s.w / 2, s.h / 2).toFixed(2)}" fill="${s.fill || "none"}" stroke="${INK}" stroke-width="${LINE_W}" vector-effect="non-scaling-stroke"/>`
    }
    const clipDef = `<clipPath id="${id}"><rect x="${clip.x - 2}" y="${clip.y - 2}" width="${clip.w + 4}" height="${clip.h + 4}" rx="${clip.r}"/></clipPath>`
    const body = layer.shapes.map(shape).join("")
    if (!layer.soften) return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><defs>${clipDef}</defs><g clip-path="url(#${id})">${body}</g></svg>`
    // no hard cut at the container's top and bottom edge: towards each edge the sharp drawing
    // fades out while a blurred copy fades in, and that too fades to nothing at the edge
    const top = clip.y, bottom = clip.y + clip.h
    const f = Math.min(EDGE_FADE, clip.h / 4) / clip.h // fade zone as a fraction of the height
    const grad = (gid: string, stops: [number, number][]) =>
        `<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="0" y1="${top}" x2="0" y2="${bottom}">${stops.map(([o, a]) => `<stop offset="${o}" stop-color="#fff" stop-opacity="${a}"/>`).join("")}</linearGradient>`
    const maskOf = (mid: string, gid: string) => `<mask id="${mid}" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}"><rect x="0" y="0" width="${w}" height="${h}" fill="url(#${gid})"/></mask>`
    const defs =
        clipDef +
        grad(`${id}-gs`, [[0, 0], [f, 1], [1 - f, 1], [1, 0]]) +
        grad(`${id}-gb`, [[0, 0], [f * 0.45, 0.7], [f, 0], [1 - f, 0], [1 - f * 0.45, 0.7], [1, 0]]) +
        maskOf(`${id}-ms`, `${id}-gs`) +
        maskOf(`${id}-mb`, `${id}-gb`) +
        `<filter id="${id}-blur" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="${EDGE_BLUR}"/></filter>`
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><defs>${defs}</defs><g clip-path="url(#${id})"><g mask="url(#${id}-mb)" filter="url(#${id}-blur)">${body}</g><g mask="url(#${id}-ms)">${body}</g></g></svg>`
}

const CSS = `
.xray{position:absolute;inset:0;z-index:3;pointer-events:none;perspective:2400px;opacity:0;transition:opacity ${MS * 0.35}ms ease;border-radius:inherit;overflow:hidden}
.xray.on{opacity:1}
.xray-scene{position:absolute;inset:0;transform-style:preserve-3d;transition:transform ${MS}ms ${EASE}}
.xray-plane{position:absolute;inset:0;transform-style:preserve-3d;transition:transform ${MS}ms ${EASE}}
.xray-plane>svg{position:absolute;inset:0;overflow:visible}
.xray-anchor{position:absolute;width:1px;height:1px}
.xray-notes{position:absolute;inset:0;opacity:0;transition:opacity .4s ease}
.xray.open .xray-notes{opacity:1;transition-delay:${MS * 0.7}ms}
.xray-notes svg{position:absolute;inset:0;overflow:visible}
.xray-label{position:absolute;transform:translateY(-50%);white-space:nowrap;font:400 13px/1 "Inter Display",system-ui,sans-serif;color:${TEXT}}
.xray.narrow .xray-label{font-size:11px}
.card.xraying .island-root{opacity:0;transition:opacity ${MS * 0.3}ms ease}
.card .island-root{transition:opacity ${MS * 0.5}ms ease ${MS * 0.4}ms}
`

function setup(card: HTMLElement) {
    if (!document.getElementById("xray-css")) {
        const s = document.createElement("style")
        s.id = "xray-css"
        s.textContent = CSS
        document.head.appendChild(s)
    }
    let overlay: HTMLElement | null = null
    let closing = 0

    const open = () => {
        clearTimeout(closing)
        overlay?.remove()
        const data = fileExplorer(card)
        if (!data) return
        const w = card.offsetWidth
        const h = card.offsetHeight
        const o = document.createElement("div")
        overlay = o
        o.className = "xray"
        o.setAttribute("aria-hidden", "true")
        const scene = document.createElement("div")
        scene.className = "xray-scene"
        o.appendChild(scene)
        const n = data.layers.length
        const narrow = w < 520
        if (narrow) o.classList.add("narrow")
        const mid = (n - 1) / 2

        // planes, with a 1px anchor at each callout's part (outer edge, on its side)
        const anchors: { el: HTMLElement; callout: Callout }[] = []
        const planes = data.layers.map((layer, i) => {
            const plane = document.createElement("div")
            plane.className = "xray-plane"
            plane.innerHTML = svgFor(w, h, layer, data.clip, `xray-clip-${i}`)
            for (const callout of layer.callouts) {
                const a = document.createElement("div")
                a.className = "xray-anchor"
                const b = callout.box
                a.style.left = (callout.side === "left" ? b.x : b.x + b.w) + "px"
                a.style.top = b.y + b.h / 2 + "px"
                plane.appendChild(a)
                anchors.push({ el: a, callout })
            }
            scene.appendChild(plane)
            return plane
        })
        const notes = document.createElement("div")
        notes.className = "xray-notes"
        o.append(notes)
        card.appendChild(o)
        card.classList.add("xraying")

        const place = (exploded: boolean) => {
            const fit = narrow ? FIT * 0.78 : FIT // phones: smaller, so the labels have room beside it
            scene.style.transform = exploded ? `translateY(-2%) scale(${fit}) rotateX(${TILT_X}deg) rotateZ(${TILT_Z}deg)` : "none"
            planes.forEach((p, i) => (p.style.transform = `translateZ(${exploded ? (i - mid) * SPREAD : 0}px)`))
        }

        // where the parts land once exploded: measure there (no animation), then draw callouts
        const all = [scene, ...planes]
        all.forEach((e) => (e.style.transition = "none"))
        place(true)
        const or = o.getBoundingClientRect()
        const z = or.width / o.offsetWidth || 1
        const at = anchors.map(({ el, callout }) => {
            const r = el.getBoundingClientRect()
            return { callout, x: (r.left - or.left) / z, y: (r.top - or.top) / z }
        })
        const xs = at.map((a) => a.x)
        const padX = narrow ? 12 : Math.max(16, w * 0.03)
        // label columns sit just outside the drawing, but never push a label off the card
        const textW = (t: string) => t.length * (narrow ? 6.2 : 7.4) // 13px text (11px on phones)
        const widest = (side: "left" | "right") => Math.max(0, ...at.filter((a) => a.callout.side === side).map((a) => textW(a.callout.text)))
        const colLeft = Math.max(padX + widest("left") + 10, Math.min(...xs) - 48)
        const colRight = Math.min(w - padX - widest("right") - 10, Math.max(...xs) + 48)
        // keep labels on one side at least 22px apart vertically
        for (const side of ["left", "right"] as const) {
            const list = at.filter((a) => a.callout.side === side).sort((a, b) => a.y - b.y)
            for (let i = 1; i < list.length; i++) if (list[i].y - list[i - 1].y < 22) list[i].y = list[i - 1].y + 22
        }
        let arrows = ""
        for (const a of at) {
            const left = a.callout.side === "left"
            const startX = left ? colLeft : colRight
            const tipX = left ? a.x - LEADER_GAP : a.x + LEADER_GAP
            // an arrow too short to read is left out; the label then sits right next to its part
            if (Math.abs(tipX - startX) >= 18) arrows += `<line x1="${startX}" y1="${a.y}" x2="${tipX}" y2="${a.y}" stroke="${INK_SOFT}" stroke-width="1"/>`
            const label = document.createElement("div")
            label.className = "xray-label"
            label.textContent = a.callout.text
            label.style.top = a.y + "px"
            if (left) label.style.right = w - startX + 10 + "px"
            else label.style.left = startX + 10 + "px"
            notes.appendChild(label)
        }
        notes.insertAdjacentHTML("afterbegin", `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${arrows}</svg>`)

        // start flat on the component, then explode
        place(false)
        o.getBoundingClientRect()
        if (!reduced()) all.forEach((e) => (e.style.transition = ""))
        o.classList.add("on", "open")
        requestAnimationFrame(() => requestAnimationFrame(() => place(true)))
        ;(o as any)._flat = () => place(false)
    }

    const close = () => {
        const o = overlay
        if (!o) return
        o.classList.remove("open")
        ;(o as any)._flat?.() // back down flat onto the component...
        card.classList.remove("xraying") // ...which fades back in underneath
        closing = window.setTimeout(() => {
            o.classList.remove("on")
            window.setTimeout(() => o.remove(), MS * 0.4)
            if (overlay === o) overlay = null
        }, reduced() ? 0 : MS * 0.75)
    }

    card.addEventListener("xray", (e) => ((e as CustomEvent).detail?.open ? open() : close()))
}

document.querySelectorAll<HTMLElement>(".card-files").forEach(setup)
