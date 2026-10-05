// Turns the settings Framer saved for a component instance into the props the
// component expects. Framer stored everything as text, wrapped list/group items in
// { type, value } labels, saved dropdowns by their display name ("Dark" instead of
// "dark"), and filled in each control's default value whenever one wasn't set.
// The control definitions come from the component's own addPropertyControls call
// (recorded by framer-shim.ts), so each value is converted by its real type.

type Control = {
    type: string
    title?: string
    defaultValue?: any
    options?: any[]
    optionTitles?: string[]
    controls?: Record<string, Control>
    control?: Control
}

const MEDIA = /https:\/\/framerusercontent\.com\/(?:assets|images)\/([^"?\s)]+)/g

// Assets that lived on Framer's CDN are served from /media now.
const localise = (value: string) => value.replace(MEDIA, "/media/$1")

const parse = (value: any) => {
    if (typeof value !== "string") return value
    const t = value.trim()
    if (t.startsWith("[") || t.startsWith("{")) {
        try {
            return JSON.parse(t)
        } catch {
            return value
        }
    }
    return value
}

// { type: "number", value: 25 } -> 25, all the way down
const unwrap = (value: any): any => {
    if (Array.isArray(value)) return value.map(unwrap)
    if (value && typeof value === "object") {
        if ("type" in value && "value" in value && Object.keys(value).every((k) => k === "type" || k === "value" || k === "id"))
            return unwrap(value.value)
        const out: Record<string, any> = {}
        for (const [k, v] of Object.entries(value)) out[k] = unwrap(v)
        return out
    }
    return value
}

const defaultOf = (control: Control): any => {
    if (control.defaultValue !== undefined) return control.defaultValue
    if (control.type === "object" && control.controls) {
        const out: Record<string, any> = {}
        for (const [k, c] of Object.entries(control.controls)) out[k] = defaultOf(c)
        return out
    }
    if (control.type === "array") return []
    return undefined
}

// Framer's export names settings after their label in the settings panel, camel-
// cased ("ETH price" -> "eTHPrice", "File colour" -> "fileColour"); a label used
// twice gets a number ("borderColour", "borderColour1"). Groups keep code names.
const labelKey = (title: string) => {
    const words = title.split(/[^A-Za-z0-9]+/).filter(Boolean)
    if (!words.length) return ""
    return words.map((w, i) => (i === 0 ? w[0].toLowerCase() + w.slice(1) : w[0].toUpperCase() + w.slice(1))).join("")
}

// For each control key, where its value sits in Framer's saved data.
const savedKeys = (controls: Record<string, Control>) => {
    const seen: Record<string, number> = {}
    const out: Record<string, string> = {}
    for (const [key, control] of Object.entries(controls)) {
        const base = labelKey(control.title || key) || key
        const n = seen[base] ?? 0
        seen[base] = n + 1
        out[key] = n === 0 ? base : base + n
    }
    return out
}

const pick = (raw: Record<string, any>, key: string, saved: string) => (saved in raw ? raw[saved] : raw[key])

export function coerce(control: Control, raw: any): any {
    if (raw === undefined || raw === null) return defaultOf(control)
    // an optional colour / file left empty was saved as the text "null"
    if (raw === "null" && control.type !== "string") return defaultOf(control)
    // only lists and groups were stored as JSON text; a text setting that happens to
    // hold JSON (like FileStacks' "Settings JSON") stays text
    const structured = control.type === "array" || control.type === "object"
    const value = structured ? unwrap(parse(raw)) : unwrap(raw)
    switch (control.type) {
        case "boolean":
            return value === true || value === "true"
        case "number":
        case "fusednumber": {
            const n = typeof value === "number" ? value : parseFloat(value)
            return Number.isFinite(n) ? n : defaultOf(control)
        }
        case "enum":
        case "segmentedenum": {
            const options = control.options || []
            const byValue = options.find((o) => String(o) === String(value))
            if (byValue !== undefined) return byValue
            const i = (control.optionTitles || []).findIndex((t) => t === value)
            return i >= 0 ? options[i] : value
        }
        case "array": {
            const list = Array.isArray(value) ? value : []
            const item = control.control
            if (!item) return list
            // list items are saved by label too
            if (item.type === "object" && item.controls) {
                const keys = savedKeys(item.controls)
                return list.map((v) => {
                    const obj = v && typeof v === "object" ? v : {}
                    const out: Record<string, any> = {}
                    for (const [k, c] of Object.entries(item.controls!)) out[k] = coerce(c, pick(obj, k, keys[k]))
                    return out
                })
            }
            return list.map((v) => coerce(item, v))
        }
        case "object": {
            const obj = value && typeof value === "object" ? value : {}
            const out: Record<string, any> = { ...obj }
            for (const [k, c] of Object.entries(control.controls || {})) out[k] = coerce(c, obj[k])
            return out
        }
        case "file":
        case "image":
        case "string":
        case "color":
        case "link":
            return typeof value === "string" ? localise(value) : value
        case "eventhandler":
            return undefined
        default:
            return value
    }
}

// Every control gets a value (its saved setting, or Framer's default for it).
export function toProps(component: any, raw: Record<string, any>) {
    const controls: Record<string, Control> = component?.__controls || {}
    const keys = savedKeys(controls)
    const props: Record<string, any> = {}
    for (const [key, control] of Object.entries(controls)) {
        const v = coerce(control, pick(raw, key, keys[key]))
        if (v !== undefined) props[key] = v
    }
    return props
}
