// The Work row: a finite horizontal carousel (ported from the Framer override
// HoverScroll.tsx). Drag / trackpad-swipe it, or use the prev / next buttons, and
// it softly snaps to the nearest card. Motion is a translate3d on the track,
// never scrollLeft (iOS flashes a blank frame when native scroll is touched).

// How the row settles on a card: after a swipe or the wheel (snap), and for the prev /
// next buttons and the logo's rewind (step). The same soft ease-in-out, the snap a
// touch quicker (x1, y1, x2, y2 like a CSS cubic-bezier).
const STEP_MS = 600
const STEP_CURVE: [number, number, number, number] = [0.4, 0, 0.2, 1]
const SNAP_MS = 550
// a finger's swipe ends while the row is still moving: it carries on at that speed and
// coasts in (an ease-out), so there's no pause after letting go
const FLING_MS = 520
const SNAP_CURVE: [number, number, number, number] = STEP_CURVE
const SNAP_AFTER_MS = 130 // quiet time after wheel input before snapping
// A mouse wheel over the row: "free" glides it (each notch adds WHEEL_SPEED px, eased
// toward, then it settles on the nearest card after WHEEL_SNAP_AFTER_MS); "step"
// moves exactly one card per notch.
const WHEEL_MODE: "free" | "step" = "free"
const WHEEL_SPEED = 1.6 // px of row per px of wheel delta (a notch is ~100)
const WHEEL_EASE_MS = 90 // how quickly the row catches up with the wheel (time constant)
const WHEEL_SNAP_AFTER_MS = 260 // a mouse wheel's notches come further apart than a trackpad's
const RESISTANCE = 0.35 // how much the row gives past either end (touch)
const FLING = 140 // how far a touch fling carries, in ms of velocity

const PHONE = "(max-width: 599.98px)"
const DESKTOP = "(min-width: 600px)" // desktop-sized cards (desktop, iPad, small windows)
// The cards keep their desktop size (up to 800 × 640px). On a short window (a 14"
// MacBook in Safari shows ~860px) or a narrow one (an iPad) the row is scaled down so
// the widest card, and a card's note, fit on screen.
const NOTE_ROOM = 70 // px kept free under the cards for the "About" note
const MIN_FIT = 0.72 // never smaller than this

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
    let fit = 1
    const fitToHeight = () => {
        let next = 1
        const card = track.querySelector<HTMLElement>(".card")
        if (matchMedia(DESKTOP).matches && card) {
            const top = row.getBoundingClientRect().top + scrollY
            const byHeight = (innerHeight - top - NOTE_ROOM) / card.offsetHeight
            // the row's own width, before scaling (its parent's content box)
            const parent = row.parentElement!
            const pcs = getComputedStyle(parent)
            const roomW = parent.clientWidth - parseFloat(pcs.paddingLeft) - parseFloat(pcs.paddingRight)
            const widest = Math.max(...cards().map((c) => c.offsetWidth))
            const byWidth = widest > 0 ? roomW / widest : 1
            next = Math.min(1, Math.max(MIN_FIT, Math.min(byHeight, byWidth)))
            next = Math.round(next * 1000) / 1000
        }
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
        ease = kind === "step" ? stepEase : kind === "fling" ? easeOutCubic : snapEase
        duration = kind === "step" ? STEP_MS : kind === "fling" ? FLING_MS : SNAP_MS
        from = offset
        to = clamp(target)
        start = performance.now()
        animating = true
        if (!raf) raf = requestAnimationFrame(frame)
    }

    let snapTimer = 0
    const snapSoon = () => {
        clearTimeout(snapTimer)
        snapTimer = window.setTimeout(() => animateTo(nearestRest(offset)), SNAP_AFTER_MS)
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

    // --- Trackpad / wheel (only while hovered) ------------------------------------
    // A trackpad moves the row with sideways swipes (up/down still scrolls the page).
    // A mouse wheel has no sideways, so over the row it moves the row instead: down
    // goes forward, up goes back (see WHEEL_MODE); at either end the wheel scrolls the
    // page again, so nobody gets stuck in the row.
    let hovered = false
    row.addEventListener("mouseenter", () => (hovered = true))
    row.addEventListener("mouseleave", () => (hovered = false))
    // Chrome and Safari report a trackpad's wheelDeltaY as exactly -3 × deltaY; a mouse
    // wheel's isn't (and Firefox's mouse wheel counts in lines).
    const isMouseWheel = (e: WheelEvent) => {
        if (e.deltaMode !== 0) return true
        if (e.deltaX !== 0) return false
        const legacy = (e as WheelEvent & { wheelDeltaY?: number }).wheelDeltaY
        return typeof legacy === "number" && legacy !== 0 && legacy !== -3 * e.deltaY
    }
    const WHEEL_STEP_GAP = 260 // ms between card steps, so one flick of the wheel moves one card
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
    row.addEventListener(
        "wheel",
        (e) => {
            if (!hovered) return
            if (e.deltaY !== 0 && Math.abs(e.deltaY) > Math.abs(e.deltaX) && isMouseWheel(e)) {
                const dir = e.deltaY > 0 ? 1 : -1
                const pos = wheelTarget ?? (animating ? to : offset) // where the row is (heading)
                if (dir > 0 ? pos >= maxOffset() - 1 : pos <= 1) return // at the end: the page scrolls
                e.preventDefault()
                if (WHEEL_MODE === "step") {
                    const now = performance.now()
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
                snapTimer = window.setTimeout(() => {
                    endWheel()
                    animateTo(nearestRest(offset))
                }, WHEEL_SNAP_AFTER_MS)
                return
            }
            if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || e.deltaX === 0) return
            e.preventDefault()
            e.stopPropagation()
            stop()
            offset = clamp(offset + e.deltaX / fit)
            render()
            publish()
            snapSoon()
        },
        { passive: false }
    )

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
            if (e.touches.length !== 1) return
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
            if (raw < 0) raw *= RESISTANCE
            else if (raw > max) raw = max + (raw - max) * RESISTANCE
            offset = raw
            const now = performance.now()
            const dt = now - lastT
            if (dt > 0) velocity = velocity * 0.4 + ((lastX - t.clientX) / fit / dt) * 0.6
            lastX = t.clientX
            lastT = now
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
    }
    addEventListener("resize", onResize)
    new ResizeObserver(onResize).observe(row)

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
