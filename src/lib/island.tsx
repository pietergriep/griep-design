import { useEffect, useState, type ComponentType } from "react"
import { toProps } from "./controls"

// One island per interactive card. Framer kept a separate copy of each card per
// breakpoint (different scale and size on desktop / tablet / phone); here one
// island holds all three setting sets and renders the one for the current width.
// It renders only in the browser (the cards have a fixed size, so nothing shifts
// while it loads), which also keeps server and client output from disagreeing.

export type Breakpoint = "desktop" | "tablet" | "phone"
type Size = { width?: string; height?: string }
export type Variants = Partial<Record<Breakpoint, { size: Size; raw: Record<string, any> }>>

// From 600px up (iPads, small windows) every card uses its desktop settings, so it
// looks like the desktop version (carousel.ts scales the row to fit); only phones
// get the phone settings. The tablet set is a fallback for cards that only have one.
const PHONE = "(max-width: 599.98px)"

const current = (): Breakpoint => (matchMedia(PHONE).matches ? "phone" : "desktop")

// Framer layout values -> CSS. "1fr" fills the card, "auto" sizes to content.
const css = (v?: string) => (!v || v === "auto" ? undefined : v === "1fr" ? "100%" : v)

export function makeIsland(Component: ComponentType<any>) {
    return function Island({ variants }: { variants: Variants }) {
        const [bp, setBp] = useState<Breakpoint | null>(null)
        useEffect(() => {
            const update = () => setBp(current())
            update()
            const q = matchMedia(PHONE)
            q.addEventListener("change", update)
            return () => q.removeEventListener("change", update)
        }, [])
        const variant = bp ? (variants[bp] ?? (bp === "desktop" ? variants.tablet : undefined)) : undefined
        const width = css(variant?.size.width)
        const height = css(variant?.size.height)
        return (
            // Fills the card (so Astro can see it scroll into view, even before the
            // component exists) and centres the component like the Framer card did.
            <div className="island-root">
                {variant && (
                    // the sized box Framer put around every code component
                    <div style={{ position: "relative", width, height, flex: "none", maxWidth: "100%" }}>
                        <Component
                            key={bp}
                            {...toProps(Component, variant.raw)}
                            style={{ width: width ? "100%" : undefined, height: height ? "100%" : undefined }}
                        />
                    </div>
                )}
            </div>
        )
    }
}
