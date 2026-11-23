import type { ClientDirective } from "astro"

// client:near, for the carousel's cards (registered in astro.config.mjs). Like client:visible,
// but it gets a card ready before it scrolls in, at a quiet moment: once the card is within a
// window's width of the screen its script loads, and the component starts as soon as the row
// is at rest (scripts/carousel.ts sets data-carousel-moving while it moves and sends
// "carousel:rest" when it stops). Starting a component costs up to ~40 ms of main thread,
// which done mid-swipe was the carousel's stutter. A card that is actually on screen starts
// straight away, moving or not, so nothing stays empty in view.
const AHEAD = "100%"

const nearDirective: ClientDirective = (load, _options, el) => {
    // the card is what the carousel moves (and what content-visibility skips when off screen)
    const target = (el.closest(".card") as HTMLElement | null) ?? el
    let loading: Promise<() => Promise<void>> | null = null
    let started = false
    const start = async () => {
        if (started) return
        started = true
        near.disconnect()
        inView.disconnect()
        removeEventListener("carousel:rest", whenQuiet)
        const hydrate = await (loading ??= load())
        await hydrate()
    }
    const moving = () => document.documentElement.hasAttribute("data-carousel-moving")
    const idle = (fn: () => void) => ("requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 500 }) : setTimeout(fn, 50))
    function whenQuiet() {
        if (started) return
        removeEventListener("carousel:rest", whenQuiet)
        if (moving()) return addEventListener("carousel:rest", whenQuiet, { once: true })
        idle(() => (moving() ? whenQuiet() : start()))
    }
    const near = new IntersectionObserver(
        (entries) => {
            if (!entries.some((e) => e.isIntersecting)) return
            loading ??= load() // the download and parse happen off the busy path
            whenQuiet()
        },
        // measured against the row, which clips the cards (against the window, cards past its
        // edge would never count as near)
        { root: el.closest<HTMLElement>("[data-carousel]"), rootMargin: `0px ${AHEAD}` },
    )
    const inView = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && start())
    near.observe(target)
    inView.observe(target)
}

export default nearDirective
