// The "Analyse" tab under a card: the named layers it can point at on the live
// component, and the colour tokens it names their colours by (the inspector reads
// sizes, spacing and styles from the page itself; see scripts/analyse.ts).

export type Token = { name: string; value: string; swatch?: string }
export type Layer = { selector: string; name: string; text?: boolean }

export type Spec = {
    tokens: { group: string; items: Token[] }[]
    // for Analyse: which elements on the card are named layers (deepest match wins)
    layers?: Layer[]
    // CSS variable on the component that scales it; Analyse divides by it to show design values
    scaleVar?: string
}

export const specs: Record<string, Spec> = {
    swap: {
        tokens: [
            {
                group: "Colour",
                items: [
                    { name: "surface/card", value: "#FFFFFF", swatch: "#ffffff" },
                    { name: "surface/subtle", value: "#F6F6F6", swatch: "#f6f6f6" },
                    { name: "fill/selected", value: "#F2F2F2", swatch: "#f2f2f2" },
                    { name: "border/hairline", value: "#F3F3F3", swatch: "#f3f3f3" },
                    { name: "text/primary", value: "#1A1A1A", swatch: "#1a1a1a" },
                    { name: "text/muted", value: "#B6B6B6", swatch: "#b6b6b6" },
                    { name: "text/faint", value: "#C6C6C6", swatch: "#c6c6c6" },
                    { name: "action/primary", value: "#252525", swatch: "#252525" },
                    { name: "success/fill", value: "#22C55E · 21%", swatch: "rgba(34, 197, 94, 0.2125)" },
                ],
            },
        ],
        scaleVar: "--sc-scale",
        layers: [
            { selector: ".swap-card", name: "SwapCard" },
            { selector: ".swap-card__panels", name: "Panels" },
            { selector: ".swap-card__panel--sell", name: "Panel / Sell" },
            { selector: ".swap-card__panel--receive", name: "Panel / Receive" },
            { selector: ".swap-card__label", name: "Label", text: true },
            { selector: ".swap-card__pill", name: "Token pill", text: true },
            { selector: ".swap-card__amount", name: "Amount", text: true },
            { selector: ".swap-card__sub", name: "Fiat value", text: true },
            { selector: ".swap-card__avail-label", name: "Balance label", text: true },
            { selector: ".swap-card__avail-val", name: "Balance", text: true },
            { selector: ".swap-card__picker", name: "Picker" },
            { selector: ".swap-card__chips", name: "Chips" },
            { selector: ".swap-card__chip", name: "Chip", text: true },
            { selector: ".swap-card__step", name: "Step", text: true },
            { selector: ".swap-card__btn", name: "Button / Primary", text: true },
        ],
    },
}
