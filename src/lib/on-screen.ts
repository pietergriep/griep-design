import { createContext, useEffect, useRef, useState, type RefObject } from "react"

// Whether a card is on screen. The carousel moves cards out of view, where the browser
// skips drawing them (content-visibility), but their scripts would keep running: progress
// bars, live prices, timers. Those bursts of work land in the middle of the card you're
// looking at (the DCA sheet growing, a swipe) and make it stutter, so loops check this and
// wait while their card is away. Outside the carousel (case study, tune pages) it stays true.
export const OnScreenContext = createContext(true)

export function useOnScreen(ref: RefObject<Element | null>) {
    const [onScreen, setOnScreen] = useState(true)
    useEffect(() => {
        const el = ref.current
        if (!el || typeof IntersectionObserver === "undefined") return
        const io = new IntersectionObserver((es) => setOnScreen(es.some((e) => e.isIntersecting)))
        io.observe(el)
        return () => io.disconnect()
    }, [ref])
    return onScreen
}

/** The latest value as a ref, for loops that shouldn't restart when it changes */
export function useLatest<T>(value: T) {
    const r = useRef(value)
    r.current = value
    return r
}
