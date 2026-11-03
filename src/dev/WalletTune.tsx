import { useRef, useState } from "react"
import { DialRoot, useDialKit } from "dialkit"
import "dialkit/styles.css"
import WalletWidget from "../components/islands/WalletWidget"
import instances from "../data/instances.json"
import { coerce, savedKeys } from "../lib/controls"

// Dev-only page (/tune/wallet, see astro.config.mjs): the portfolio widget with a
// DialKit panel. The controls come from the widget's own settings; "Send to portfolio"
// writes the ones you changed into src/data/instances.json, which the portfolio reads.

type Control = { type: string; title?: string; defaultValue?: any; min?: number; max?: number; step?: number }

const controls: Record<string, Control> = (WalletWidget as any).__controls
const keys = savedKeys(controls)
const raw: Record<string, any> = instances.WalletWidget.desktop.raw
const WIDTH = instances.WalletWidget.desktop.size.width

// the panel's folders, by setting (the rest go under "Data")
const FOLDERS: [string, string[]][] = [
    ["Time of day", ["hour", "dayPreview"]],
    ["Slider intro", ["sliderIntro", "sliderDuration", "sliderDelay"]],
    ["Live price", ["live", "liveEvery", "liveDrift"]],
    ["Card", ["radius"]],
    ["Balance", ["dollarSize", "dollarGap"]],
    ["Afternoon sun", ["sunShades", "sunStrength"]],
    ["Stars", ["stars", "starBrightness", "twinkle"]],
    ["Shooting stars", ["shootingStars", "starEveryMin", "starEveryMax", "starDuration", "starLength"]],
]
// the sky's colours, a folder per moment of the day (closed to start with): settings
// named nightTop … morning1 … duskBottom, titled "Night top" … "Morning 1"
const MOMENTS: [string, string][] = [
    ["Night", "night"],
    ["Dawn", "dawn"],
    ["Morning", "morning"],
    ["Midday", "midday"],
    ["Golden hour", "golden"],
    ["Sunset", "sunset"],
    ["Dusk", "dusk"],
]
const COLOURS: [string, string[]][] = MOMENTS.map(([name, id]) => [
    `${name} colours`,
    Object.keys(controls).filter((k) => controls[k].type === "color" && k.startsWith(id)),
])
const DATA = Object.keys(controls).filter((k) => ![...FOLDERS, ...COLOURS].some(([, ks]) => ks.includes(k)))
const SEND = "Send to portfolio"

// what the portfolio shows now, per setting
const saved = (key: string) => coerce(controls[key], key in raw ? raw[key] : raw[keys[key]])

// a setting as a DialKit control, labelled by its title
const dial = (key: string) => {
    const c = controls[key]
    const v = saved(key)
    if (c.type === "number") {
        const min = c.min ?? 0
        const max = c.max ?? Math.max(10, Math.abs(v) * 2)
        return [v, min, max, c.step ?? (max - min <= 10 ? 0.1 : 1)]
    }
    return v
}
// a setting's label in the panel: its title, without the moment in front for colours
// ("Night top" -> "Top" in "Night colours")
const label = (k: string) => {
    const title = controls[k].title || k
    const moment = MOMENTS.find(([name, id]) => controls[k].type === "color" && k.startsWith(id) && title.startsWith(name + " "))
    if (!moment) return title
    const rest = title.slice(moment[0].length + 1)
    return rest[0].toUpperCase() + rest.slice(1)
}
const folder = (ks: string[]) => Object.fromEntries(ks.map((k) => [label(k), dial(k)]))
const ALL: [string, string[]][] = [...FOLDERS, ...COLOURS, ["Data", DATA]]
const CONFIG = {
    [SEND]: { type: "action" as const },
    // "Time of day", then its colours, then the rest
    ...Object.fromEntries(FOLDERS.slice(0, 1).map(([name, ks]) => [name, folder(ks)])),
    ...Object.fromEntries(COLOURS.map(([name, ks]) => [name, { ...folder(ks), _collapsed: true }])),
    ...Object.fromEntries(FOLDERS.slice(1).map(([name, ks]) => [name, folder(ks)])),
    Data: { ...folder(DATA), _collapsed: true },
}

// DialKit's values (nested by folder, keyed by label) -> { setting: value }
const flatten = (values: Record<string, any>) => {
    const out: Record<string, any> = {}
    for (const [name, ks] of ALL)
        for (const k of ks) {
            const v = values[name]?.[label(k)]
            if (v !== undefined) out[k] = v
        }
    return out
}

export default function WalletTune() {
    // saving rewrites instances.json, which reloads the page: the note survives that
    const [note, setNote] = useState(() => {
        try {
            const n = sessionStorage.getItem("wallet-tune-note") || ""
            sessionStorage.removeItem("wallet-tune-note")
            return n
        } catch {
            return ""
        }
    })
    const latest = useRef<Record<string, any>>({})
    const values = useDialKit("Portfolio widget", CONFIG as any, {
        onAction: async (path: string) => {
            if (path !== SEND) return
            // only what differs from the portfolio, under the names instances.json uses
            const changed: Record<string, any> = {}
            for (const [k, v] of Object.entries(latest.current)) if (String(v) !== String(saved(k))) changed[keys[k]] = v
            if (!Object.keys(changed).length) return setNote("Nothing changed yet.")
            const res = await fetch("/__tune/save", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ island: "WalletWidget", values: changed }),
            }).catch(() => null)
            const n = Object.keys(changed).length
            const text = res?.ok ? `Sent ${n} ${n === 1 ? "change" : "changes"} to the portfolio.` : "Couldn't save. Is the dev server running?"
            setNote(text)
            try {
                if (res?.ok) sessionStorage.setItem("wallet-tune-note", text)
            } catch {}
        },
    })
    const props = flatten(values as any)
    latest.current = props

    return (
        <>
            <div className="card card-image card-gradient-widget">
                <div className="island-root">
                    <div style={{ position: "relative", width: WIDTH, flex: "none", maxWidth: "100%" }}>
                        <WalletWidget {...props} style={{ width: "100%" }} />
                    </div>
                </div>
            </div>
            <p className="tune-note" role="status">
                {note}
            </p>
            <DialRoot position="top-right" />
        </>
    )
}
