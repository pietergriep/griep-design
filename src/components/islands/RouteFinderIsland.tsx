import { useEffect, useRef, useState } from "react"
import RouteFinder from "./RouteFinder"

// How much bigger than its 400px design size the route finder is on desktop.
// Everything scales together (text, cards, spacing), like zooming in.
const DESKTOP_SCALE = 1.15
const DESKTOP = "(min-width: 1200px)"

// Renders in the browser only (client:visible), centred in its card like the other islands.
// It never grows past the card: on narrow cards (phones) it scales down to fit instead.
export default function RouteFinderIsland(props: Parameters<typeof RouteFinder>[0]) {
    const ref = useRef<HTMLDivElement>(null)
    const [scale, setScale] = useState<number>()
    useEffect(() => {
        const el = ref.current
        if (!el) return
        const media = matchMedia(DESKTOP)
        const update = () => {
            const cs = getComputedStyle(el)
            const room = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
            setScale(Math.min(media.matches ? DESKTOP_SCALE : 1, room / 400))
        }
        update()
        const ro = new ResizeObserver(update)
        ro.observe(el)
        media.addEventListener("change", update)
        return () => {
            ro.disconnect()
            media.removeEventListener("change", update)
        }
    }, [])
    return (
        <div className="island-root" ref={ref}>
            {scale && <RouteFinder scale={scale} {...props} />}
        </div>
    )
}
