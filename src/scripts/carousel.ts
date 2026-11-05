// The Work row: a finite horizontal carousel (ported from the Framer override
// HoverScroll.tsx). Drag / trackpad-swipe it, or use the prev / next buttons, and
// it softly snaps to the nearest card. Motion is a translate3d on the track,
// never scrollLeft (iOS flashes a blank frame when native scroll is touched).

// How the row settles on a card: after a swipe or the wheel (snap), and for the prev /
// next buttons and the logo's rewind (step). The same soft ease-in-out, the snap a
// touch quicker (x1, y1, x2, y2 like a CSS cubic-bezier).
const STEP_MS = 600
const STEP_CURVE: [number, number, number, number] = [0.4, 0, 0.2, 1]
const SNAP_MS = 700
// a finger's swipe ends while the row is still moving: it carries on at that speed and
// coasts in (an ease-out), so there's no pause after letting go
const FLING_MS = 520
const SNAP_CURVE: [number, number, number, number] = STEP_CURVE
const SNAP_NUDGE = 40 // px: a trackpad scroll shorter than this settles on the nearest card, not the next one
const SNAP_AFTER_MS = 250 // quiet time after wheel / trackpad input before snapping
// A mouse wheel over the row: "free" glides it (each notch adds WHEEL_SPEED px, eased
// toward, then it settles on the nearest card after WHEEL_SNAP_AFTER_MS); "step"
// moves exactly one card per notch.
const WHEEL_MODE: "free" | "step" = "free"
const WHEEL_SPEED = 1.6 // px of row per px of wheel delta (a notch is ~100)
const WHEEL_EASE_MS = 90 // how quickly the row catches up with the wheel (time constant)
const WHEEL_SNAP_AFTER_MS = 260 // a mouse wheel's notches come further apart than a trackpad's
// false: the wheel glides the row and leaves it where it stops, no snapping to a card
// afterwards (trackpads still snap; true brings the wheel's snap back)
const WHEEL_SNAP = false
// At either end the row keeps the wheel while it's still spinning; only after a pause
// this long does the next scroll move the page, so a spin that reaches the last card
// doesn't carry on into the page
const WHEEL_HANDOFF_MS = 350
const RESISTANCE = 0.35 // how much the row gives past either end (touch)
const FLING = 140 // how far a touch fling carries, in ms of velocity

const PHONE = "(max-width: 599.98px)"
const DESKTOP = "(min-width: 600px)" // desktop-sized cards (desktop, iPad, small windows)
// The cards keep their desktop size (up to 800 × 640px), shown at
// SCALE (cards and what's in them alike). On a short window (a 14"
// MacBook in Safari shows ~860px) or a narrow one (an iPad) the row is scaled down so
// the widest card, and a card's note, fit on screen.
const NOTE_ROOM = 70 // px kept free under the cards for the "About" note
const MIN_FIT = 0.72 // never smaller than this
const SCALE = 0.9775 // the whole row, cards and components alike, when the window has room

// The carousel / grid switch: the cards move from one layout to the other (each from
// where it was to where it lands); cards that weren't on screen fade in instead.
const VIEW_MS = 300
const VIEW_CURVE = "cubic-bezier(0.22, 1, 0.36, 1)"
const VIEW_KEY = "work-view" // remembered per visitor (also read in Portfolio.astro's <head>)
// true: scrolling down moves the row sideways (the work sticks until the last card);
// false: the row only moves sideways (swipe, wheel over it, arrows)
const SCROLL_DRIVEN = false
// false: on desktop a sideways trackpad swipe over the cards does nothing (scrolling,
// the wheel and the arrows move them); phones and tablets still swipe with a finger
const SIDEWAYS_SCROLL = true
// true: scrolling up / down on a trackpad over the cards moves them sideways (like the mouse
// wheel does); the page scrolls normally everywhere else, and carries on past the last card
const TRACKPAD_VERTICAL = true
const PIN_BOTTOM = 24 // px kept free under "Learn more" while the first screen is pinned
const PIN_HOLD = 320 // px of scroll the last card stays put for, before the page carries on
const PIN_SETTLE_MS = 200 // quiet time after scrolling before the row eases to the nearest card
const GRID_COLS = 3 // cards per row in the grid
const GRID_MIN_FIT = 0.5 // smaller than this and the grid drops a column
const row = document.querySelector<HTMLElement>("[data-carousel]")
const track = row?.querySelector<HTMLElement>(".track")
const prevBtn = document.querySelector<HTMLButtonElement>("[data-carousel-prev]")
const nextBtn = document.querySelector<HTMLButtonElement>("[data-carousel-next]")

if (row && track) {
    // Cards hidden on this breakpoint (display: none) don't count.
    const cards = () => Array.from(track.children as HTMLCollectionOf<HTMLElement>).filter((c) => c.offsetParent !== null)

    // --- One card per screen on phone --------------------------------------
    const sizeCards = () => {
        const all = Array.from(track.children as HTMLCollectionOf<HTMLElement>)
        if (!matchMedia(PHONE).matches) {
            all.forEach((c) => {
                c.style.removeProperty("width")
                c.style.removeProperty("flex")
            })
            return
        }
        const width = row.clientWidth
        if (!width) return
        all.forEach((c) => {
            c.style.width = width + "px"
            c.style.flex = "0 0 " + width + "px"
        })
    }
    sizeCards()

    // --- Fit the row to the window height (desktop) ------------------------------
    // A transform, not CSS zoom (Safari's zoom measures differently). The row is made
    // wider by 1/fit so after scaling it still spans the page, and the space the scale
    // frees up below is taken back with a negative margin.
    // the grid (html.work-grid): the cards wrap and scroll with the page
    const isGrid = () => document.documentElement.classList.contains("work-grid")

    const gutterPx = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--gutter")) || 0

    let fit = 1
    const fitToHeight = () => {
        let next = 1
        const card = track.querySelector<HTMLElement>(".card")
        if (isGrid()) track.dataset.cols = "measure" // every card at its own width, for a moment
        if (matchMedia(DESKTOP).matches && card) {
            const top = row.getBoundingClientRect().top + scrollY
            // the cards and the note under them fit in the window (the grid's first row too)
            const byHeight = (innerHeight - top - NOTE_ROOM) / card.offsetHeight
            // the row's own width, before scaling (its parent's content box)
            const parent = row.parentElement!
            const pcs = getComputedStyle(parent)
            const roomW = parent.clientWidth - parseFloat(pcs.paddingLeft) - parseFloat(pcs.paddingRight)
            const widest = Math.max(...cards().map((c) => c.offsetWidth))
            const byWidth = widest > 0 ? roomW / widest : 1
            next = Math.min(SCALE, Math.max(MIN_FIT, Math.min(byHeight, byWidth)))
            // the grid: GRID_COLS cards per row, scaled down so they fit across the page (each
            // stretching to its column), never bigger than the carousel's height fit; fewer
            // columns where that would make them smaller than GRID_MIN_FIT, one as above
            if (isGrid()) {
                const unit = track.querySelector<HTMLElement>(".card:not(.card-files)")?.offsetWidth ?? 0
                const gap = parseFloat(getComputedStyle(track).columnGap) || 0
                for (let cols = GRID_COLS; cols >= 2 && unit > 0; cols--) {
                    const scale = Math.min(SCALE, byHeight, (roomW - gutterPx()) / (cols * unit + (cols - 1) * gap))
                    if (scale < GRID_MIN_FIT) continue
                    track.dataset.cols = String(cols)
                    next = scale
                    break
                }
            }
            next = Math.round(next * 1000) / 1000
        }
        if (isGrid() && track.dataset.cols === "measure") track.dataset.cols = "1" // phones, and desktop where two don't fit
        if (isGrid()) {
            track.style.setProperty("--cols", track.dataset.cols!)
            // the page's right margin, whatever the scale
            track.style.paddingRight = `${gutterPx() / next}px`
        } else track.style.removeProperty("padding-right")
        fit = next
        if (fit === 1) {
            row.style.removeProperty("width")
            row.style.removeProperty("transform")
            row.style.removeProperty("transform-origin")
            row.style.removeProperty("margin-bottom")
        } else {
            row.style.width = `calc(100% / ${fit})`
            row.style.transform = `scale(${fit})`
            row.style.transformOrigin = "0 0"
            // the height the scale takes away (or adds, above 1) below the row
            row.style.marginBottom = `${-(1 - fit) * row.offsetHeight}px`
        }
    }
    fitToHeight()

    // --- Geometry ------------------------------------------------------------
    const maxOffset = () => Math.max(0, track.scrollWidth - row.clientWidth)
    const clamp = (v: number) => Math.min(Math.max(v, 0), maxOffset())
    // resting places: each card's left edge, plus the very end
    const restPoints = () => {
        const max = maxOffset()
        const points = cards().map((c) => Math.min(c.offsetLeft, max))
        if (!points.includes(max)) points.push(max)
        return points.sort((a, b) => a - b)
    }
    const nearestRest = (v: number) => {
        let best = 0
        let bestDistance = Infinity
        for (const p of restPoints()) {
            const d = Math.abs(p - v)
            if (d < bestDistance) {
                bestDistance = d
                best = p
            }
        }
        return best
    }

    let offset = 0
    const render = () => {
        track.style.transform = `translate3d(${-offset}px,0,0)`
    }
    const setDisabled = (btn: HTMLButtonElement | null, off: boolean) => {
        if (!btn) return
        btn.setAttribute("aria-disabled", String(off))
        btn.tabIndex = off ? -1 : 0
    }
    const publish = () => {
        setDisabled(prevBtn, !(offset > 1))
        setDisabled(nextBtn, !(offset < maxOffset() - 1))
    }
    render()
    publish()

    // --- Scrolling down moves the row (desktop) ----------------------------------------
    // The first screen sticks where it sits on load (higher, if the cards wouldn't fit), and
    // the page's own scroll moves the row: one px of scroll, one px of row. .work-pin is
    // made as tall as that takes, plus PIN_HOLD, a stretch where the last card stays put
    // before the page carries on. Once the scroll stops among the cards, the page eases to
    // the nearest one, as the row's own snap did. Trackpad and mouse wheel just scroll; the
    // arrows and a sideways swipe scroll the page to the right spot. Phones keep the
    // sideways swipe.
    const pin = document.querySelector<HTMLElement>("[data-work-pin]")
    const stage = pin?.querySelector<HTMLElement>(".work-stage") ?? null
    const work = row.closest<HTMLElement>(".work")
    const pinned = () => SCROLL_DRIVEN && !!pin && !!stage && !!work && !isGrid() && !matchMedia(PHONE).matches
    let pinStart = 0 // the page's scroll where the row starts moving
    const layoutPin = () => {
        if (!pin || !stage || !work) return
        if (!pinned()) {
            pin.style.removeProperty("height")
            stage.style.removeProperty("top")
            return
        }
        pin.style.removeProperty("height")
        const natural = pin.getBoundingClientRect().top + scrollY
        // what has to fit on screen: down to the "Learn more" line under the cards (not the
        // room kept for an open note, nor the gap above the footer); on a short window the
        // intro goes partly off the top instead
        const note = track.querySelector<HTMLElement>(".work-note-btn")
        const stageTop = stage.getBoundingClientRect().top
        const shown = note ? note.getBoundingClientRect().bottom - stageTop + PIN_BOTTOM : stage.offsetHeight
        const top = Math.min(natural, innerHeight - shown)
        stage.style.top = `${top}px`
        pin.style.height = `${stage.offsetHeight + maxOffset() * fit + PIN_HOLD}px`
        pinStart = natural - top
    }
    const fromScroll = () => {
        if (!pinned()) return
        offset = clamp((scrollY - pinStart) / fit)
        render()
        publish()
    }
    const smoothScroll = !matchMedia("(prefers-reduced-motion: reduce)").matches
    // the page's scroll, eased to a spot with the row's own timing and curves (frame by
    // frame, so it isn't the browser's own smooth scroll)
    let pageRaf = 0
    let pageAnimating = false
    const stopPage = () => {
        if (pageRaf) cancelAnimationFrame(pageRaf)
        pageRaf = 0
        pageAnimating = false
    }
    const scrollPageTo = (y: number, ms: number, curve: (p: number) => number) => {
        stopPage()
        const from = scrollY
        if (Math.abs(y - from) < 1 || ms <= 0 || !smoothScroll) return scrollTo({ top: y, behavior: "instant" })
        const t0 = performance.now()
        pageAnimating = true
        const step = (now: number) => {
            const p = Math.min(1, (now - t0) / ms)
            scrollTo({ top: from + (y - from) * curve(p), behavior: "instant" })
            if (p < 1) pageRaf = requestAnimationFrame(step)
            else stopPage()
        }
        pageRaf = requestAnimationFrame(step)
    }
    const scrollToOffset = (target: number, kind: "snap" | "step" | "fling" | "now") => {
        const y = pinStart + clamp(target) * fit
        if (kind === "now") return scrollPageTo(y, 0, (p) => p)
        if (kind === "step") return scrollPageTo(y, STEP_MS, stepEase)
        if (kind === "fling") return scrollPageTo(y, FLING_MS, easeOutCubic)
        scrollPageTo(y, SNAP_MS, snapEase)
    }
    // once the scroll stops among the cards (not before the first, nor in the pause after
    // the last), ease to the nearest one
    let settleTimer = 0
    const settleSoon = () => {
        clearTimeout(settleTimer)
        if (!pinned() || pageAnimating) return
        settleTimer = window.setTimeout(() => {
            const at = (scrollY - pinStart) / fit
            if (at <= 0 || at >= maxOffset()) return
            scrollToOffset(nearestRest(at), "snap")
        }, PIN_SETTLE_MS)
    }
    addEventListener(
        "scroll",
        () => {
            fromScroll()
            settleSoon()
        },
        { passive: true },
    )
    // scrolling by hand takes over from an ease that's under way
    ;["wheel", "touchstart", "keydown", "pointerdown"].forEach((t) => addEventListener(t, () => pageAnimating && stopPage(), { passive: true }))

    // --- Motion --------------------------------------------------------------
    let raf = 0
    let animating = false
    let from = 0
    let to = 0
    let start = 0
    // a CSS cubic-bezier, solved for x (Newton, with a bisection fallback)
    const bezier = ([x1, y1, x2, y2]: [number, number, number, number]) => {
        const at = (a: number, b: number, t: number) => ((1 - 3 * b + 3 * a) * t + (3 * b - 6 * a)) * t * t + 3 * a * t
        const slope = (a: number, b: number, t: number) => 3 * (1 - 3 * b + 3 * a) * t * t + 2 * (3 * b - 6 * a) * t + 3 * a
        return (x: number) => {
            if (x <= 0 || x >= 1) return x <= 0 ? 0 : 1
            let t = x
            for (let i = 0; i < 8; i++) {
                const d = slope(x1, x2, t)
                if (Math.abs(d) < 1e-6) break
                t -= (at(x1, x2, t) - x) / d
            }
            if (t < 0 || t > 1 || Math.abs(at(x1, x2, t) - x) > 1e-4) {
                let lo = 0
                let hi = 1
                t = x
                for (let i = 0; i < 30; i++) {
                    if (at(x1, x2, t) < x) lo = t
                    else hi = t
                    t = (lo + hi) / 2
                }
            }
            return at(y1, y2, t)
        }
    }
    const snapEase = bezier(SNAP_CURVE)
    const stepEase = bezier(STEP_CURVE)
    let ease = snapEase
    let duration = SNAP_MS
    const frame = (now: number) => {
        if (!animating) {
            raf = 0
            return
        }
        const p = Math.min((now - start) / duration, 1)
        offset = from + (to - from) * ease(p)
        render()
        publish()
        if (p < 1) raf = requestAnimationFrame(frame)
        else {
            animating = false
            offset = to
            render()
            publish()
            raf = 0
        }
    }
    const stop = () => {
        endWheel() // (defined with the wheel input below; only called once everything is set up)
        animating = false
        if (raf) cancelAnimationFrame(raf)
        raf = 0
    }
    const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3)
    const animateTo = (target: number, kind: "snap" | "step" | "fling" = "snap") => {
        if (pinned()) return scrollToOffset(target, kind) // the page scrolls there; the row follows
        ease = kind === "step" ? stepEase : kind === "fling" ? easeOutCubic : snapEase
        duration = kind === "step" ? STEP_MS : kind === "fling" ? FLING_MS : SNAP_MS
        from = offset
        to = clamp(target)
        start = performance.now()
        animating = true
        if (!raf) raf = requestAnimationFrame(frame)
    }

    let snapTimer = 0
    // Where a trackpad scroll started and which way it last went: when it stops, the row
    // settles on the next card that way (not the nearest, which could be back where it
    // came from and read as the row jumping back). A nudge of under SNAP_NUDGE px still
    // settles on the nearest.
    let swipeFrom: number | null = null
    let swipeDir = 0
    const settleRest = () => {
        const moved = swipeFrom === null ? 0 : offset - swipeFrom
        if (Math.abs(moved) < SNAP_NUDGE || !swipeDir) return nearestRest(offset)
        const points = restPoints()
        const ahead = swipeDir > 0 ? points.find((p) => p >= offset - 1) : [...points].reverse().find((p) => p <= offset + 1)
        return ahead ?? nearestRest(offset)
    }
    const snapSoon = (delta = 0) => {
        if (swipeFrom === null) swipeFrom = offset - delta
        if (delta) swipeDir = Math.sign(delta)
        clearTimeout(snapTimer)
        snapTimer = window.setTimeout(() => {
            const to = settleRest()
            swipeFrom = null
            swipeDir = 0
            animateTo(to)
        }, SNAP_AFTER_MS)
    }

    // --- Buttons + logo ----------------------------------------------------------
    const stepBy = (dir: number) => {
        const points = restPoints()
        let target = dir > 0 ? points.find((p) => p > offset + 2) : [...points].reverse().find((p) => p < offset - 2)
        if (target === undefined) target = dir > 0 ? maxOffset() : 0
        clearTimeout(snapTimer)
        stop()
        animateTo(target, "step")
    }
    // like stepBy, but counted from where the row is heading, so quick steps add up
    const stepFrom = (pos: number, dir: number) => {
        const points = restPoints()
        let target = dir > 0 ? points.find((p) => p > pos + 2) : [...points].reverse().find((p) => p < pos - 2)
        if (target === undefined) target = dir > 0 ? maxOffset() : 0
        clearTimeout(snapTimer)
        stop()
        animateTo(target, "step")
    }
    prevBtn?.addEventListener("click", () => offset > 1 && stepBy(-1))
    nextBtn?.addEventListener("click", () => offset < maxOffset() - 1 && stepBy(1))

    // press dip: in fast, out slow; released anywhere
    ;[prevBtn, nextBtn].forEach((btn) => {
        btn?.addEventListener("pointerdown", () => {
            btn.classList.add("pressed")
            const release = () => {
                btn.classList.remove("pressed")
                removeEventListener("pointerup", release)
                removeEventListener("pointercancel", release)
            }
            addEventListener("pointerup", release)
            addEventListener("pointercancel", release)
        })
    })

    // the logo rewinds the row to the first card
    document.querySelectorAll<HTMLElement>("[data-carousel-home]").forEach((el) =>
        el.addEventListener("click", (e) => {
            if (location.pathname === new URL((el as HTMLAnchorElement).href).pathname) e.preventDefault()
            clearTimeout(snapTimer)
            stop()
            animateTo(0, "step")
        })
    )

    // --- Trackpad / wheel (over the row) ------------------------------------
    // A trackpad moves the row with sideways swipes (up/down still scrolls the page).
    // A mouse wheel has no sideways, so over the row it moves the row instead: down
    // goes forward, up goes back (see WHEEL_MODE); at either end the wheel scrolls the
    // page again, so nobody gets stuck in the row.
    // On a Mac, Chrome and Safari report a trackpad's wheelDeltaY as exactly -3 × deltaY;
    // a mouse wheel's isn't (and Firefox's mouse wheel counts in lines). Elsewhere there's
    // no telling them apart: a Windows touchpad sends steps from 1 to 500 px within one
    // swipe (recorded with ?wheellog), so treating the big ones as a mouse flipped every
    // swipe between the two ways of moving and the row jumped back and forth. There, all
    // pixel input moves the row directly (a mouse wheel too, 100 px a notch).
    const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform)
    const isMouseWheel = (e: WheelEvent) => {
        if (e.deltaMode !== 0) return true
        if (e.deltaX !== 0) return false
        if (!IS_MAC) return false
        const legacy = (e as WheelEvent & { wheelDeltaY?: number }).wheelDeltaY
        return typeof legacy === "number" && legacy !== 0 && legacy !== -3 * e.deltaY
    }
    const WHEEL_STEP_GAP = 260 // ms between card steps, so one flick of the wheel moves one card
    let lastWheelAt = 0 // the previous mouse-wheel event, to tell one spin from the next
    let wheelOwned = false // the current spin has been moving the row
    // Once the browser has handed a scroll to the page it won't let the row stop it
    // (e.cancelable is false): leave that one to the page, or both would move
    const inOwnScroll = (t: Element | null) => {
        for (let el = t; el && el !== row; el = el.parentElement) {
            if (el.hasAttribute("data-own-scroll")) return true
            const oy = getComputedStyle(el).overflowY
            if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1) return true
        }
        return false
    }
    const pageHasWheel = (e: WheelEvent) => !e.cancelable
    let lastWheelStep = 0
    // free mode: the row eases toward wheelTarget, frame by frame
    let wheelTarget: number | null = null
    let wheelRaf = 0
    let wheelLast = 0
    const wheelFrame = (now: number) => {
        if (wheelTarget === null) return (wheelRaf = 0)
        const dt = Math.min(64, now - wheelLast)
        wheelLast = now
        offset += (wheelTarget - offset) * (1 - Math.exp(-dt / WHEEL_EASE_MS))
        if (Math.abs(wheelTarget - offset) < 0.5) offset = wheelTarget
        render()
        publish()
        wheelRaf = offset === wheelTarget ? 0 : requestAnimationFrame(wheelFrame)
    }
    const endWheel = () => {
        wheelTarget = null
        if (wheelRaf) cancelAnimationFrame(wheelRaf)
        wheelRaf = 0
    }
    // Each scroll picks up / down or sideways at its start and keeps it until a pause of
    // AXIS_GAP_MS. A Mac trackpad does this itself; a Windows touchpad doesn't, and a scroll
    // down there carries small sideways moves, either way, which pushed the row back and forth.
    const AXIS_GAP_MS = 150
    let axisUpDown = true
    let axisAt = -Infinity
    const axisOf = new WeakMap<WheelEvent, boolean>()
    const upDown = (e: WheelEvent) => {
        const known = axisOf.get(e)
        if (known !== undefined) return known
        const now = performance.now()
        if (now - axisAt > AXIS_GAP_MS) axisUpDown = Math.abs(e.deltaY) > Math.abs(e.deltaX)
        axisAt = now
        axisOf.set(e, axisUpDown)
        return axisUpDown
    }
    const onWheel = (e: WheelEvent) => {
            // (no hover check: the wheel goes to whatever is under the pointer, also when the
            // page moved the row under a still pointer and no mouseenter came)
            if (isGrid()) return
            if (!SIDEWAYS_SCROLL && !matchMedia(PHONE).matches && !upDown(e)) {
                e.preventDefault() // (also keeps the browser from swiping back a page)
                return
            }
            // pinned: up / down just scrolls the page (which moves the row); a sideways
            // trackpad swipe scrolls it too
            if (pinned()) {
                if (!upDown(e)) {
                    e.preventDefault()
                    scrollBy(0, e.deltaX)
                }
                return
            }
            // Lists inside a card that scroll (the usage card's agent list and chat, the tasks
            // list: data-own-scroll or an overflowing box) keep up / down scrolling to
            // themselves; the rest of the card moves the row. Sideways swipes always move it
            // A scroll that's moving the row keeps moving it when a list slides under the
            // pointer: the row listens first (capture) and the list never sees it
            const rowHasIt = wheelOwned && performance.now() - lastWheelAt < WHEEL_HANDOFF_MS
            if (!rowHasIt && upDown(e) && inOwnScroll(e.target as Element | null)) return
            // Up / down moves the row only over the cards; under them (the notes, "Learn more")
            // and in the gaps it scrolls the page
            if (!rowHasIt && upDown(e) && !(e.target as Element | null)?.closest?.(".card")) return
            if (e.deltaY !== 0 && upDown(e) && isMouseWheel(e)) {
                const dir = e.deltaY > 0 ? 1 : -1
                const pos = wheelTarget ?? (animating ? to : offset) // where the row is (heading)
                const now = performance.now()
                if (pageHasWheel(e)) return
                const spinning = now - lastWheelAt < WHEEL_HANDOFF_MS
                lastWheelAt = now
                if (dir > 0 ? pos >= maxOffset() - 1 : pos <= 1) {
                    // at the end: the same spin is still absorbed; a fresh scroll moves the page
                    if (wheelOwned && spinning) { e.preventDefault(); e.stopPropagation() }
                    else wheelOwned = false
                    return
                }
                wheelOwned = true
                e.preventDefault()
                e.stopPropagation()
                if (WHEEL_MODE === "step") {
                    if (now - lastWheelStep < WHEEL_STEP_GAP) return
                    lastWheelStep = now
                    stepFrom(pos, dir)
                    return
                }
                stop()
                clearTimeout(snapTimer)
                const delta = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY
                wheelTarget = clamp(pos + (delta * WHEEL_SPEED) / fit)
                if (!wheelRaf) {
                    wheelLast = performance.now()
                    wheelRaf = requestAnimationFrame(wheelFrame)
                }
                if (WHEEL_SNAP)
                    snapTimer = window.setTimeout(() => {
                        endWheel()
                        animateTo(nearestRest(offset))
                    }, WHEEL_SNAP_AFTER_MS)
                return
            }
            // A trackpad scrolling up / down over the row moves it too (TRACKPAD_VERTICAL); at
            // either end the page takes over again, once the swipe's momentum has died down
            if (TRACKPAD_VERTICAL && e.deltaY !== 0 && upDown(e)) {
                const dir = e.deltaY > 0 ? 1 : -1
                const now = performance.now()
                if (pageHasWheel(e)) return
                lastWheelAt = now
                // at either end the same swipe carries straight on into the page
                if (dir > 0 ? offset >= maxOffset() - 1 : offset <= 1) {
                    wheelOwned = false
                    return
                }
                wheelOwned = true
                e.preventDefault()
                e.stopPropagation()
                stop()
                endWheel() // (a glide from mouse-wheel input would pull against this)
                offset = clamp(offset + e.deltaY / fit)
                render()
                publish()
                snapSoon(e.deltaY / fit)
                return
            }
            if (upDown(e) || e.deltaX === 0) return
            e.preventDefault()
            e.stopPropagation()
            stop()
            endWheel()
            offset = clamp(offset + e.deltaX / fit)
            render()
            publish()
            snapSoon(e.deltaX / fit)
    }
    // Up / down: the row hears it first (capture), so a scroll that's moving the row isn't
    // taken over by a list sliding under the pointer. Sideways: after the card's own
    // handlers, as before
    // griep.design/?wheellog: records each wheel event over the row and what the row did,
    // with a button to copy it (for scrolling that misbehaves on someone else's machine)
    const wheelLog: unknown[][] | null = new URLSearchParams(location.search).has("wheellog") ? [] : null
    const handle = (e: WheelEvent) => {
        const before = offset
        onWheel(e)
        if (!wheelLog) return
        const t = Math.round(performance.now())
        wheelLog.push([t, +e.deltaX.toFixed(2), +e.deltaY.toFixed(2), e.deltaMode, upDown(e) ? "y" : "x", isMouseWheel(e) ? "m" : "t", e.cancelable ? 1 : 0, e.defaultPrevented ? 1 : 0, Math.round(before), Math.round(offset)])
        if (wheelLog.length > 600) wheelLog.shift()
        if (logCount) logCount.textContent = `${wheelLog.length} events`
    }
    let logCount: HTMLElement | null = null
    if (wheelLog) {
        const box = document.createElement("div")
        box.style.cssText = "position:fixed;left:12px;bottom:12px;z-index:99999;display:flex;gap:8px;align-items:center;padding:8px 10px;border-radius:10px;background:#111;color:#fff;font:12px system-ui"
        logCount = document.createElement("span")
        logCount.textContent = "0 events"
        const copy = document.createElement("button")
        copy.textContent = "Copy log"
        copy.style.cssText = "border:0;border-radius:6px;padding:4px 8px;background:#fff;color:#111;font:inherit"
        copy.onclick = () => {
            const head = `${navigator.userAgent} | dpr ${devicePixelRatio} | t,dx,dy,mode,axis,mouse/track,cancelable,prevented,from,to`
            const text = head + "\n" + wheelLog.map((r) => r.join(",")).join("\n")
            navigator.clipboard?.writeText(text).then(() => (copy.textContent = "Copied"), () => prompt("Copy this:", text))
        }
        box.append(logCount, copy)
        document.body.append(box)
    }
    row.addEventListener("wheel", (e) => upDown(e) && handle(e), { passive: false, capture: true })
    row.addEventListener("wheel", (e) => !upDown(e) && handle(e), { passive: false })

    // --- Touch -----------------------------------------------------------------
    let dragging = false
    let decided = false
    let horizontal = false
    let startX = 0
    let startY = 0
    let startOffset = 0
    let lastX = 0
    let lastT = 0
    let velocity = 0
    row.addEventListener(
        "touchstart",
        (e) => {
            if (e.touches.length !== 1 || isGrid()) return
            dragging = true
            decided = false
            horizontal = false
            const t = e.touches[0]
            startX = lastX = t.clientX
            startY = t.clientY
            lastT = performance.now()
            velocity = 0
            clearTimeout(snapTimer)
            stop()
            startOffset = offset
        },
        { passive: true }
    )
    row.addEventListener(
        "touchmove",
        (e) => {
            if (!dragging) return
            const t = e.touches[0]
            const dx = t.clientX - startX
            const dy = t.clientY - startY
            if (!decided) {
                if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
                decided = true
                horizontal = Math.abs(dx) > Math.abs(dy)
                if (!horizontal) {
                    dragging = false // vertical: let the page scroll
                    return
                }
            }
            if (!horizontal) return
            e.preventDefault()
            const max = maxOffset()
            let raw = startOffset - dx / fit
            const now = performance.now()
            const dt = now - lastT
            if (dt > 0) velocity = velocity * 0.4 + ((lastX - t.clientX) / fit / dt) * 0.6
            lastX = t.clientX
            lastT = now
            // pinned: a sideways swipe scrolls the page to where the row should be
            if (pinned()) return scrollToOffset(raw, "now")
            if (raw < 0) raw *= RESISTANCE
            else if (raw > max) raw = max + (raw - max) * RESISTANCE
            offset = raw
            render()
            publish()
        },
        { passive: false }
    )
    const touchEnd = () => {
        if (!dragging) return
        dragging = false
        if (!horizontal) return
        stop()
        animateTo(nearestRest(clamp(offset + velocity * FLING)), "fling")
    }
    row.addEventListener("touchend", touchEnd, { passive: true })
    row.addEventListener("touchcancel", touchEnd, { passive: true })

    // --- Resize: stay on the card that was showing ---------------------------------
    const onResize = () => {
        fitToHeight()
        const list = cards()
        let index = 0
        let best = Infinity
        list.forEach((c, i) => {
            const d = Math.abs(c.offsetLeft - offset)
            if (d < best) {
                best = d
                index = i
            }
        })
        sizeCards()
        stop()
        offset = clamp(list[index]?.offsetLeft ?? 0)
        render()
        publish()
        // pinned, the row follows the scroll instead
        layoutPin()
        fromScroll()
    }
    addEventListener("resize", onResize)
    new ResizeObserver(onResize).observe(row)

    // --- Carousel / grid ---------------------------------------------------------------
    const viewBtns = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-view]"))
    const showPressed = () => viewBtns.forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.view === "grid") === isGrid())))
    showPressed()
    const onScreen = (r: DOMRect) => r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight
    const setView = (grid: boolean) => {
        if (grid === isGrid()) return
        const items = cards()
        const before = items.map((c) => c.getBoundingClientRect())
        stop()
        clearTimeout(snapTimer)
        document.documentElement.classList.toggle("work-grid", grid)
        try {
            localStorage.setItem(VIEW_KEY, grid ? "grid" : "carousel")
        } catch {}
        showPressed()
        fitToHeight()
        offset = clamp(offset)
        render()
        publish()
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) return
        items.forEach((c, i) => {
            const from = before[i]
            const to = c.getBoundingClientRect()
            if (!onScreen(to)) return
            if (onScreen(from)) {
                // from where it was (its size isn't animated: in the grid the cards stretch,
                // and scaling would squash what's in them); the row is scaled by fit, so its
                // own px are screen px / fit
                c.animate([{ transform: `translate(${(from.left - to.left) / fit}px, ${(from.top - to.top) / fit}px)` }, { transform: "none" }], {
                    duration: VIEW_MS,
                    easing: VIEW_CURVE,
                })
            } else {
                c.animate([{ opacity: 0, transform: "translateY(14px) scale(0.985)" }, { opacity: 1, transform: "none" }], {
                    duration: VIEW_MS,
                    easing: VIEW_CURVE,
                    delay: Math.min(i, 6) * 30,
                    fill: "backwards",
                })
            }
        })
    }
    viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view === "grid")))

    // --- Keep the videos running ---------------------------------------------------
    // (on the Framer site something paused them while scrolling; kept as a safety net)
    const videos = Array.from(row.querySelectorAll("video"))
    const play = (v: HTMLVideoElement) => {
        if (document.hidden || !v.paused) return
        v.play()?.catch(() => {})
    }
    videos.forEach((v) => {
        v.muted = true
        v.addEventListener("pause", () => play(v))
    })
    setInterval(() => videos.forEach(play), 1000)

    // --- "Interactive" badges: a highlight sweeps through the lettering ----------------
    // (on the text inside the pill, so the pill itself keeps its background)
    const BADGE_PERIOD = 9000
    const BADGE_SWEEP = 1800
    const BADGE_LIFT = 0.55
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches
    const canClip = CSS.supports("-webkit-background-clip", "text") || CSS.supports("background-clip", "text")
    const BADGE_SHIMMER = false // the sweep through "Interactive" is off
    if (BADGE_SHIMMER && !reduce && canClip) {
        row.querySelectorAll<HTMLElement>(".badge-text").forEach((label) => {
            const base = getComputedStyle(label).color
            const ch = base.match(/\d+/g) || ["48", "48", "48"]
            const lift = (v: string) => Math.round(Number(v) + (255 - Number(v)) * BADGE_LIFT)
            const highlight = `rgb(${lift(ch[0])},${lift(ch[1])},${lift(ch[2])})`
            const clear = () => {
                for (const p of ["background-image", "background-size", "background-repeat", "background-position", "-webkit-background-clip", "background-clip", "-webkit-text-fill-color"])
                    label.style.removeProperty(p)
            }
            let running: Animation | null = null
            const sweep = () => {
                if (running) return
                label.style.backgroundImage = `linear-gradient(100deg,${base} 0%,${base} 40%,${highlight} 50%,${base} 60%,${base} 100%)`
                label.style.backgroundSize = "300% 100%"
                label.style.backgroundRepeat = "no-repeat"
                label.style.backgroundPosition = "100% 0"
                label.style.setProperty("-webkit-background-clip", "text")
                label.style.setProperty("background-clip", "text")
                label.style.setProperty("-webkit-text-fill-color", "transparent")
                const a = label.animate([{ backgroundPosition: "100% 0" }, { backgroundPosition: "0% 0" }], {
                    duration: BADGE_SWEEP,
                    easing: "linear",
                    fill: "forwards",
                })
                running = a
                a.onfinish = () => {
                    if (running !== a) return
                    running = null
                    clear()
                    a.cancel()
                }
                a.oncancel = () => {
                    if (running === a) running = null
                }
            }
            let timer = 0
            let visible = false
            new IntersectionObserver(
                (entries) => {
                    const now = entries.some((e) => e.isIntersecting)
                    if (now === visible) return
                    visible = now
                    clearInterval(timer)
                    if (visible) {
                        sweep()
                        timer = window.setInterval(sweep, BADGE_PERIOD)
                    }
                },
                { threshold: 0.6 }
            ).observe(label)
        })
    }
}
