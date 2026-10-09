// The Work row: a finite horizontal carousel (ported from the Framer override
// HoverScroll.tsx). Drag / trackpad-swipe it, or use the prev / next buttons, and
// it softly snaps to the nearest card. Motion is a translate3d on the track,
// never scrollLeft (iOS flashes a blank frame when native scroll is touched).

const SNAP_MS = 520 // how long a snap / step takes
const SNAP_AFTER_MS = 130 // quiet time after wheel input before snapping
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
    const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3)
    const frame = (now: number) => {
        if (!animating) {
            raf = 0
            return
        }
        const p = Math.min((now - start) / SNAP_MS, 1)
        offset = from + (to - from) * easeOutCubic(p)
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
        animating = false
        if (raf) cancelAnimationFrame(raf)
        raf = 0
    }
    const animateTo = (target: number) => {
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
        animateTo(target)
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
            if (location.pathname === "/") e.preventDefault()
            clearTimeout(snapTimer)
            stop()
            animateTo(0)
        })
    )

    // --- Trackpad / wheel (only while hovered, only horizontal intent) -------------
    let hovered = false
    row.addEventListener("mouseenter", () => (hovered = true))
    row.addEventListener("mouseleave", () => (hovered = false))
    row.addEventListener(
        "wheel",
        (e) => {
            if (!hovered) return
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
        animateTo(nearestRest(clamp(offset + velocity * FLING)))
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
    if (!reduce && canClip) {
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
