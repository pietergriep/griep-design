// Custom cursor (ported from the Framer Cursor component + CursorFeel.tsx).
// The arrow's tip is the click point. It follows the mouse directly (no lag),
// shrinks slightly while pressed, grows slightly over anything clickable, and
// casts a soft shadow. Only for a real mouse: touch screens keep their default.

const PRESSED_SCALE = 0.9 // size while pressed (1 = no shrink)
const HOVER_SCALE = 1.1 // size over something clickable (1 = no growth)
const PRESS_MS = 110 // how quickly it shrinks
const RELEASE_MS = 220 // how quickly it springs back
const HOVER_MS = 180 // how quickly it grows / settles on hover
// a touchpad tap presses and releases at once; keep every press visible this long
const MIN_PRESS_MS = PRESS_MS
const SHADOW = "drop-shadow(0px 1px 2px rgba(60, 60, 60, 0.28))"
const EASE = "cubic-bezier(0.2, 0, 0, 1)"
// Chrome-based browsers can predict where the pointer will be by the next frame
const PREDICT_AHEAD = true

const CLICKABLE = 'a[href], button, [role="button"], [role="link"], summary, label[for], select'

// The arrow, drawn with its tip at (0,0) and turned 9° around the tip.
// colours, normal and over something clickable (src/data/cursor.json; tune them in the
// dev panel's Cursor section)
import colours from "../data/cursor.json"
const FILL_MS = 180 // how quickly the colour changes on hover

const ARROW_PATH = "M 0.09 0.996 L 8.721 14.667 C 8.871 14.902 9.161 15.031 9.456 14.994 C 9.75 14.957 9.992 14.762 10.067 14.499 L 11.643 8.138 C 11.701 7.935 11.838 7.64 12.049 7.558 L 17.554 4.005 C 17.851 3.897 18.037 3.626 18.016 3.334 C 17.994 3.042 17.768 2.797 17.458 2.727 L 0.914 0.02 C 0.631 -0.045 0.332 0.05 0.153 0.262 C -0.025 0.473 -0.05 0.761 0.09 0.996 Z"
const ARROW = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="20" viewBox="-1 -1 22 20" overflow="visible" aria-hidden="true"><g transform="rotate(9) translate(-0.09 -0.996)"><path d="${ARROW_PATH}" style="fill:var(--cursor-fill);transition:fill ${FILL_MS}ms ease" stroke="#fff" stroke-width="1.2" stroke-miterlimit="10"/></g></svg>`

const fine = matchMedia("(hover: hover) and (pointer: fine)")

// Which cursor: "native" (the default: the arrow handed to the browser as the real
// system cursor, like recent.design: no lag, and never a second arrow at the page's
// edges; its states swap instantly instead of animating), "dom" (drawn on the page and
// animated, but the system arrow can show beside it as the pointer leaves or enters
// the page) or "off" (the plain system arrow, e.g. for feedback recordings). Try one
// with ?cursor=native / dom / off.
const MODE = new URLSearchParams(location.search).get("cursor") || "native"

if (fine.matches) {
    if (MODE === "native") setupNative()
    else if (MODE !== "off") setup()
}

// ---- native: the arrow as a system-cursor image ------------------------------------
// One image per state (normal, over something clickable, pressed, both), each drawn the
// way the page cursor looks in that state: its colour, its scale from the tip, its
// shadow. The browser picks between them with plain CSS (clickable selectors, :active),
// so nothing is restyled from script while the mouse moves. Text fields keep the I-beam.
function setupNative() {
    const PAD = 4 // room for the shadow above and left of the tip; also the hotspot
    const SIZE = 32 // the safe size for a cursor image everywhere
    const svg = (colour: string, scale: number) =>
        `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">` +
        `<defs><filter id="s" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="rgb(60,60,60)" flood-opacity="0.28"/></filter></defs>` +
        `<g filter="url(#s)"><g transform="translate(${PAD} ${PAD}) scale(${scale}) rotate(9) translate(-0.09 -0.996)">` +
        `<path d="${ARROW_PATH}" fill="${colour}" stroke="#fff" stroke-width="1.2" stroke-miterlimit="10"/></g></g></svg>`
    // drawn to PNG at 1x and 2x, so it's sharp on retina screens (browsers draw an SVG
    // cursor at 1x)
    const png = (markup: string, dpr: number) =>
        new Promise<string>((resolve, reject) => {
            const img = new Image()
            img.onload = () => {
                const c = document.createElement("canvas")
                c.width = c.height = SIZE * dpr
                const ctx = c.getContext("2d")
                if (!ctx) return reject()
                ctx.drawImage(img, 0, 0, SIZE * dpr, SIZE * dpr)
                resolve(c.toDataURL("image/png"))
            }
            img.onerror = reject
            img.src = "data:image/svg+xml," + encodeURIComponent(markup)
        })
    const imageSet = CSS.supports("cursor", `image-set(url("a.png") 1x) 1 1, auto`)
        ? "image-set"
        : CSS.supports("cursor", `-webkit-image-set(url("a.png") 1x) 1 1, auto`)
          ? "-webkit-image-set"
          : ""
    const cursorFor = async (colour: string, scale: number) => {
        const markup = svg(colour, scale)
        const [a, b] = await Promise.all([png(markup, 1), png(markup, 2)])
        return imageSet ? `${imageSet}(url("${a}") 1x, url("${b}") 2x) ${PAD} ${PAD}, auto` : `url("${a}") ${PAD} ${PAD}, auto`
    }

    // the same "clickable" as the page cursor: known clickable elements, plus anything
    // the page's own CSS gives a pointer cursor (components add theirs as they load)
    const pointerSelectors = () => {
        const out: string[] = []
        const collect = (rules: CSSRuleList) => {
            for (const rule of Array.from(rules)) {
                if (rule instanceof CSSStyleRule && rule.style.cursor === "pointer")
                    for (const sel of rule.selectorText.split(",")) {
                        const clean = sel.replace(/::?(before|after|placeholder|selection|marker)\b/g, "").trim()
                        try {
                            document.querySelector(clean)
                            out.push(clean)
                        } catch {}
                    }
                if ("cssRules" in rule && (rule as CSSGroupingRule).cssRules) collect((rule as CSSGroupingRule).cssRules)
            }
        }
        for (const sheet of Array.from(document.styleSheets))
            try {
                if (sheet.ownerNode !== style) collect(sheet.cssRules)
            } catch {}
        return [CLICKABLE, ...out].join(", ")
    }
    const TEXT = 'input:not([type="button"],[type="checkbox"],[type="radio"],[type="range"],[type="submit"],[type="color"],[type="reset"]), textarea, [contenteditable="true"]'

    const style = document.createElement("style")
    let sheets = -1
    let urls: Record<string, string> | null = null
    const write = () => {
        if (!urls) return
        sheets = document.styleSheets.length
        const C = pointerSelectors()
        // equal specificity throughout (:where), so later rules win: normal, clickable,
        // pressed, pressed on something clickable, and text fields last
        style.textContent = `@media (hover: hover) and (pointer: fine) {
html, html * { cursor: ${urls.normal} !important; }
html :where(${C}), html :where(${C}) * { cursor: ${urls.hover} !important; }
html :where(:active) { cursor: ${urls.press} !important; }
html :where(${C}):active, html :where(${C}) :active { cursor: ${urls.hoverPress} !important; }
html :where(${TEXT}), html :where(${TEXT}):active { cursor: text !important; }
}`
    }
    let fill = colours.fill
    let hoverFill = colours.hoverFill
    const build = () =>
        Promise.all([
            cursorFor(fill, 1),
            cursorFor(hoverFill, HOVER_SCALE),
            cursorFor(fill, PRESSED_SCALE),
            cursorFor(hoverFill, HOVER_SCALE * PRESSED_SCALE),
        ]).then(([normal, hover, press, hoverPress]) => {
            urls = { normal, hover, press, hoverPress }
            if (!style.isConnected) document.head.appendChild(style)
            write()
        })
    build()
    // dev only: the tuning panel can try colours live
    if (import.meta.env.DEV)
        (window as any).__cursor = {
            get: () => ({ fill, hoverFill }),
            set: (v: { fill?: string; hoverFill?: string }) => {
                if (v.fill) fill = v.fill
                if (v.hoverFill) hoverFill = v.hoverFill
                build()
            },
        }
    // components bring their styles when they load: pick up their pointer selectors
    document.addEventListener("pointerover", () => document.styleSheets.length !== sheets && write(), true)
}

function setup() {
    // outer box: positioned at the pointer. inner box: scale + shadow from the tip.
    const box = document.createElement("div")
    box.setAttribute("aria-hidden", "true")
    Object.assign(box.style, {
        position: "fixed",
        left: "0",
        top: "0",
        zIndex: "2147483647",
        pointerEvents: "none",
        opacity: "0",
        transform: "translate3d(-100px,-100px,0)",
        transition: "opacity 120ms ease",
        willChange: "transform",
    })
    const art = document.createElement("div")
    art.innerHTML = ARROW
    let fill = colours.fill
    let hoverFill = colours.hoverFill
    Object.assign(art.style, {
        lineHeight: "0",
        transformOrigin: "1px 1px", // the tip (the svg's viewBox starts at -1,-1)
        transform: "translate(-1px,-1px) scale(1)",
        filter: SHADOW,
        transition: `transform ${RELEASE_MS}ms ${EASE}`,
    })
    box.appendChild(art)
    document.body.appendChild(box)

    // hide the native cursor everywhere, also over elements that set their own
    const hide = document.createElement("style")
    hide.textContent = `@media (hover: hover) and (pointer: fine) { *, *::before, *::after { cursor: none !important; } }`

    let shown = false
    const show = () => {
        if (shown) return
        shown = true
        document.head.appendChild(hide)
        box.style.opacity = "1"
    }
    const conceal = () => {
        shown = false
        hide.remove()
        box.style.opacity = "0"
    }

    // --- tracking: written straight away, in the input event itself ---------------
    const move = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return
        let x = e.clientX
        let y = e.clientY
        if (PREDICT_AHEAD && typeof e.getPredictedEvents === "function") {
            const ahead = e.getPredictedEvents().at(-1)
            if (ahead) {
                x = ahead.clientX
                y = ahead.clientY
            }
        }
        box.style.transform = `translate3d(${x}px,${y}px,0)`
        show()
    }
    const type = "onpointerrawupdate" in window ? "pointerrawupdate" : "pointermove"
    addEventListener(type as "pointermove", move, true)
    document.documentElement.addEventListener("pointerleave", conceal)
    addEventListener("blur", conceal)

    // --- press + hover -------------------------------------------------------------
    let pressed = false
    let hovering = false
    const apply = () => {
        const scale = (hovering ? HOVER_SCALE : 1) * (pressed ? PRESSED_SCALE : 1)
        const ms = pressed ? PRESS_MS : hovering ? HOVER_MS : RELEASE_MS
        art.style.transition = `transform ${ms}ms ${EASE}`
        art.style.transform = `translate(-1px,-1px) scale(${scale})`
        art.style.setProperty("--cursor-fill", hovering ? hoverFill : fill)
    }

    apply()
    // dev only: the tuning panel can try colours live
    if (import.meta.env.DEV)
        (window as any).__cursor = {
            get: () => ({ fill, hoverFill }),
            set: (v: { fill?: string; hoverFill?: string }) => {
                if (v.fill) fill = v.fill
                if (v.hoverFill) hoverFill = v.hoverFill
                apply()
            },
        }

    let downAt = 0
    let releaseTimer = 0
    addEventListener(
        "pointerdown",
        (e) => {
            if (e.pointerType === "mouse" && e.button !== 0) return
            clearTimeout(releaseTimer)
            downAt = performance.now()
            pressed = true
            apply()
        },
        true
    )
    const up = () => {
        clearTimeout(releaseTimer)
        const wait = MIN_PRESS_MS - (performance.now() - downAt)
        const release = () => {
            pressed = false
            apply()
        }
        if (wait <= 0) release()
        else releaseTimer = window.setTimeout(release, wait)
    }
    addEventListener("pointerup", up, true)
    addEventListener("pointercancel", up, true)

    // clickable = a known clickable element, or anything that asks for a pointer
    // cursor. That's looked up in the page's own CSS rather than read with
    // getComputedStyle: the hide rule overrides every element's cursor, and switching
    // it off to read the real one restyles the whole page (up to ~30ms over the File
    // Explorer), which made the cursor stutter.
    let pointerSelectors: string[] = []
    let sheetCount = -1
    const collect = (rules: CSSRuleList) => {
        for (const rule of Array.from(rules)) {
            if (rule instanceof CSSStyleRule && rule.style.cursor === "pointer") {
                for (const sel of rule.selectorText.split(",")) {
                    // drop pseudo-elements, which can't be matched against an element
                    const clean = sel.replace(/::?(before|after|placeholder|selection|marker)\b/g, "").trim()
                    try {
                        document.querySelector(clean)
                        pointerSelectors.push(clean)
                    } catch {}
                }
            }
            if ("cssRules" in rule && (rule as CSSGroupingRule).cssRules) collect((rule as CSSGroupingRule).cssRules)
        }
    }
    const refreshSelectors = () => {
        // components add their own styles when they load, so re-read when that changes
        if (document.styleSheets.length === sheetCount) return
        sheetCount = document.styleSheets.length
        pointerSelectors = []
        for (const sheet of Array.from(document.styleSheets)) {
            try {
                collect(sheet.cssRules)
            } catch {}
        }
    }
    const isClickable = (t: EventTarget | null) => {
        if (!(t instanceof Element)) return false
        if (t.closest(CLICKABLE)) return true
        // cursor is inherited: a pointer set on any ancestor (in CSS or inline) counts,
        // unless something closer sets a different cursor inline
        refreshSelectors()
        for (let el: Element | null = t; el; el = el.parentElement) {
            const inline = (el as HTMLElement).style?.cursor
            if (inline) return inline === "pointer"
            if (pointerSelectors.some((sel) => el!.matches(sel))) return true
        }
        return false
    }
    document.addEventListener(
        "pointerover",
        (e) => {
            if (e.pointerType !== "mouse") return
            const now = isClickable(e.target)
            if (now !== hovering) {
                hovering = now
                apply()
            }
        },
        true
    )
}
