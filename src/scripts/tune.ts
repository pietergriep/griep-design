// Dev-only tuning panel (never in a production build; see index.astro).
// Lists a component's settings, by their Framer names, and applies changes to it
// live. "Save" writes the changed values into src/data/instances.json for every
// breakpoint (through the dev server, see astro.config.mjs).

type Control = {
    type: string
    title?: string
    defaultValue?: any
    min?: number
    max?: number
    step?: number
    unit?: string
    options?: any[]
    optionTitles?: string[]
    description?: string
}
type Entry = {
    controls: Record<string, Control>
    keys: Record<string, string>
    raw: () => Record<string, any>
    set: (values: Record<string, any>) => void
}

const ISLAND = "FileStacks"
const TITLE = "File Explorer"
// shown first, in this order (saved names)
const PINNED = ["outerBorder", "outerBorderWidth", "outerBorderColour", "pdfText", "pdfFill", "figText", "figFill", "docxText", "docxFill", "xlsxText", "xlsxFill"]
// clearer names where Framer's labels repeat (saved name -> label)
const RENAME: Record<string, string> = {} // (the File Explorer's own names are unique now)
const SKIP = new Set(["array", "object", "file", "image", "responsiveimage", "eventhandler", "componentinstance", "font", "transition"])

const CSS = `
.tune{position:fixed;top:76px;right:12px;z-index:2147483646;width:300px;max-height:calc(100vh - 96px);display:flex;flex-direction:column;background:#fff;color:#111;border-radius:12px;box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 12px 40px rgba(0,0,0,.18);font:12px/1.3 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;cursor:auto}
.tune *{box-sizing:border-box;cursor:auto}
.tune button,.tune select,.tune input[type=checkbox],.tune input[type=color],.tune input[type=range]{cursor:pointer}
.tune.min .tune-body,.tune.min .tune-search{display:none}
.tune-head{display:flex;align-items:center;gap:6px;padding:10px 10px 8px 12px;border-bottom:.5px solid #eee}
.tune-head b{flex:1;font-size:12.5px}
.tune-head button{border:0;border-radius:7px;padding:5px 9px;font:inherit;background:#f1f1f1;color:#111}
.tune-head .save{background:#111;color:#fff}
.tune-head .save:disabled{opacity:.35;cursor:default}
.tune-search{margin:8px 10px 2px;padding:6px 8px;border:.5px solid #ddd;border-radius:7px;font:inherit}
.tune-body{overflow:auto;padding:4px 0 8px}
.tune-sep{margin:8px 12px 2px;color:#999;font-size:10.5px;text-transform:uppercase;letter-spacing:.04em}
.tune-row{display:grid;grid-template-columns:104px 1fr;align-items:center;gap:8px;padding:4px 12px}
.tune-row.changed label{font-weight:600}
.tune-row label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#444}
.tune-ctl{display:flex;align-items:center;gap:6px;min-width:0}
.tune-ctl input[type=color]{width:24px;height:22px;padding:0;border:.5px solid #ccc;border-radius:5px;background:none;flex:none}
.tune-ctl input[type=text],.tune-ctl input[type=number],.tune-ctl select{min-width:0;flex:1;padding:3px 5px;border:.5px solid #ddd;border-radius:5px;font:inherit;background:#fff;color:#111}
.tune-ctl input[type=number]{flex:none;width:58px}
.tune-ctl input[type=range]{flex:1;min-width:0}
.tune-ctl .a{flex:none;width:42px}
.tune-msg{padding:0 12px 8px;color:#16a34a;font-size:11px}
`

// ---- colours: any CSS colour <-> hex + alpha ----
const probe = document.createElement("canvas").getContext("2d")!
const toRgba = (css: string): [number, number, number, number] => {
    if (!css || css === "null") return [0, 0, 0, 0]
    probe.fillStyle = "#000"
    probe.fillStyle = css
    const v = String(probe.fillStyle)
    if (v.startsWith("#")) return [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16), 1]
    const m = v.match(/[\d.]+/g)!.map(Number)
    return [m[0], m[1], m[2], m[3] ?? 1]
}
const hex = (r: number, g: number, b: number) => "#" + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("")
const css = (r: number, g: number, b: number, a: number) => (a >= 1 ? hex(r, g, b) : `rgba(${r}, ${g}, ${b}, ${Math.round(a * 100) / 100})`)

function build(entry: Entry) {
    const style = document.createElement("style")
    style.textContent = CSS
    document.head.appendChild(style)

    const raw = entry.raw()
    const changed: Record<string, any> = {}
    const panel = document.createElement("div")
    panel.className = "tune"
    panel.innerHTML = `<div class="tune-head"><b>${TITLE} settings</b><button class="reset" title="Back to the saved values">Reset</button><button class="save" disabled>Save</button><button class="min" title="Collapse">–</button></div><input class="tune-search" placeholder="Search settings" /><div class="tune-msg" hidden></div><div class="tune-body"></div>`
    document.body.appendChild(panel)
    // the page's own scripts (carousel drag, custom cursor) leave the panel alone
    ;["pointerdown", "click", "wheel", "touchstart"].forEach((t) => panel.addEventListener(t, (e) => e.stopPropagation()))

    const body = panel.querySelector<HTMLElement>(".tune-body")!
    const save = panel.querySelector<HTMLButtonElement>(".save")!
    const msg = panel.querySelector<HTMLElement>(".tune-msg")!
    // saving rewrites instances.json, which reloads the page: say so after the reload
    try {
        if (sessionStorage.getItem("tune-saved")) {
            sessionStorage.removeItem("tune-saved")
            msg.textContent = "Saved to instances.json. Tell Claude when it's right."
            msg.hidden = false
        }
    } catch {}
    const apply = () => {
        entry.set(changed)
        const n = Object.keys(changed).length
        save.disabled = n === 0
        save.textContent = n ? `Save ${n}` : "Save"
    }

    const rows: { el: HTMLElement; text: string }[] = []
    // colour rows by saved name, so the pill-opacity slider can set their alpha
    const colourRows: Record<string, { alpha: (a: number) => void; value: () => string }> = {}
    const rowFor = (key: string, c: Control) => {
        const saved = entry.keys[key]
        const current = saved in raw ? raw[saved] : raw[key] ?? c.defaultValue
        const row = document.createElement("div")
        row.className = "tune-row"
        row.title = c.description || ""
        const label = document.createElement("label")
        label.textContent = RENAME[saved] || c.title || key
        const ctl = document.createElement("div")
        ctl.className = "tune-ctl"
        row.append(label, ctl)
        const set = (v: any) => {
            if (String(v) === String(current)) delete changed[saved]
            else changed[saved] = v
            row.classList.toggle("changed", saved in changed)
            msg.hidden = true
            apply()
        }
        if (c.type === "color") {
            let [r, g, b, a] = toRgba(String(current ?? ""))
            const pick = Object.assign(document.createElement("input"), { type: "color", value: hex(r, g, b) })
            const alpha = Object.assign(document.createElement("input"), { type: "number", min: "0", max: "100", step: "1", value: String(Math.round(a * 100)), className: "a", title: "Opacity %" })
            const text = Object.assign(document.createElement("input"), { type: "text", value: String(current ?? "") })
            const fromParts = () => {
                const v = css(r, g, b, Math.min(100, Math.max(0, +alpha.value || 0)) / 100)
                text.value = v
                set(v)
            }
            pick.addEventListener("input", () => {
                ;[r, g, b] = toRgba(pick.value)
                if (+alpha.value === 0) alpha.value = "100"
                fromParts()
            })
            alpha.addEventListener("input", fromParts)
            colourRows[saved] = {
                alpha: (pct) => {
                    alpha.value = String(pct)
                    fromParts()
                },
                value: () => text.value,
            }
            text.addEventListener("change", () => {
                ;[r, g, b, a] = toRgba(text.value)
                pick.value = hex(r, g, b)
                alpha.value = String(Math.round(a * 100))
                set(text.value)
            })
            ctl.append(pick, alpha, text)
        } else if (c.type === "number" || c.type === "fusednumber") {
            const n = parseFloat(current)
            const min = c.min ?? 0
            const max = c.max ?? Math.max(100, (Number.isFinite(n) ? n : 0) * 2)
            const step = c.step ?? (max - min <= 10 ? 0.1 : 1)
            const range = Object.assign(document.createElement("input"), { type: "range", min: String(min), max: String(max), step: String(step), value: String(Number.isFinite(n) ? n : min) })
            const num = Object.assign(document.createElement("input"), { type: "number", min: String(min), max: String(max), step: String(step), value: String(Number.isFinite(n) ? n : "") })
            range.addEventListener("input", () => {
                num.value = range.value
                set(range.value)
            })
            num.addEventListener("input", () => {
                range.value = num.value
                set(num.value)
            })
            ctl.append(range, num)
        } else if (c.type === "boolean") {
            const box = Object.assign(document.createElement("input"), { type: "checkbox", checked: current === true || current === "true" })
            box.addEventListener("change", () => set(String(box.checked)))
            ctl.append(box)
        } else if (c.type === "enum" || c.type === "segmentedenum") {
            const sel = document.createElement("select")
            ;(c.options || []).forEach((o, i) => {
                const title = c.optionTitles?.[i] ?? String(o)
                const opt = new Option(title, String(o))
                if (String(o) === String(current) || title === current) opt.selected = true
                sel.add(opt)
            })
            sel.addEventListener("change", () => set(sel.value))
            ctl.append(sel)
        } else {
            const text = Object.assign(document.createElement("input"), { type: "text", value: String(current ?? "") })
            text.addEventListener("change", () => set(text.value))
            ctl.append(text)
        }
        rows.push({ el: row, text: `${c.title || ""} ${key} ${saved}`.toLowerCase() })
        return row
    }

    const all = Object.entries(entry.controls).filter(([k, c]) => !SKIP.has(c.type) && entry.keys[k] !== "settingsJSON")
    const pinned = PINNED.map((s) => all.find(([k]) => entry.keys[k] === s)).filter(Boolean) as [string, Control][]
    const rest = all.filter((e) => !pinned.includes(e))
    const sep = (t: string) => Object.assign(document.createElement("div"), { className: "tune-sep", textContent: t })
    body.append(sep("Border and type pills"), ...pinned.map(([k, c]) => rowFor(k, c)), sep("Everything else"), ...rest.map(([k, c]) => rowFor(k, c)))

    // settings packed inside "Settings JSON" (the component's own style-panel values)
    const JSON_FIELDS = [{ field: "bdFs", label: "Pill text size", min: 6, max: 18, step: 0.5 }]
    const packed = (() => {
        try {
            return JSON.parse(raw.settingsJSON || "{}")
        } catch {
            return {}
        }
    })()
    const packedStart = JSON.stringify(packed)
    const jsonRows = JSON_FIELDS.filter((f) => f.field in packed).map(({ field, label, min, max, step }) => {
        const row = document.createElement("div")
        row.className = "tune-row"
        const v = packed[field]
        row.innerHTML = `<label>${label}</label><div class="tune-ctl"><input type="range" min="${min}" max="${max}" step="${step}" value="${v}"><input type="number" min="${min}" max="${max}" step="${step}" value="${v}"></div>`
        const [range, num] = row.querySelectorAll("input")
        const update = (val: string) => {
            range.value = num.value = val
            packed[field] = +val
            const next = JSON.stringify(packed)
            if (next === packedStart) delete changed.settingsJSON
            else changed.settingsJSON = next
            row.classList.toggle("changed", String(+val) !== String(v))
            msg.hidden = true
            apply()
        }
        range.addEventListener("input", () => update(range.value))
        num.addEventListener("input", () => update(num.value))
        rows.push({ el: row, text: `${label} ${field}`.toLowerCase() })
        return row
    })

    // one slider for the background opacity of all four type pills
    const FILLS = ["pdfFill", "figFill", "docxFill", "xlsxFill"].filter((k) => colourRows[k])
    if (FILLS.length) {
        const start = Math.round(toRgba(colourRows[FILLS[0]].value())[3] * 100)
        const row = document.createElement("div")
        row.className = "tune-row"
        row.title = "Sets the opacity of all four pill backgrounds at once"
        row.innerHTML = `<label>Pill background</label><div class="tune-ctl"><input type="range" min="0" max="100" step="1" value="${start}"><input type="number" min="0" max="100" step="1" value="${start}"></div>`
        const [range, num] = row.querySelectorAll("input")
        const setAll = (pct: string) => {
            range.value = num.value = pct
            FILLS.forEach((k) => colourRows[k].alpha(+pct))
        }
        range.addEventListener("input", () => setAll(range.value))
        num.addEventListener("input", () => setAll(num.value))
        // just above the first type-pill row
        const firstPill = [...body.querySelectorAll<HTMLElement>(".tune-row")].find((r) => r.querySelector("label")?.textContent?.startsWith(".")) ?? null
        body.insertBefore(row, firstPill)
        jsonRows.forEach((r) => body.insertBefore(r, row))
        rows.push({ el: row, text: "pill background opacity" })
    }

    panel.querySelector<HTMLInputElement>(".tune-search")!.addEventListener("input", (e) => {
        const q = (e.target as HTMLInputElement).value.trim().toLowerCase()
        rows.forEach((r) => (r.el.style.display = !q || r.text.includes(q) ? "" : "none"))
        body.querySelectorAll<HTMLElement>(".tune-sep").forEach((s) => (s.style.display = q ? "none" : ""))
    })
    panel.querySelector(".min")!.addEventListener("click", (e) => {
        panel.classList.toggle("min")
        ;(e.target as HTMLElement).textContent = panel.classList.contains("min") ? "+" : "–"
    })
    panel.querySelector(".reset")!.addEventListener("click", () => location.reload())
    save.addEventListener("click", async () => {
        save.disabled = true
        const res = await fetch("/__tune/save", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ island: ISLAND, values: changed }),
        }).catch(() => null)
        if (res?.ok) {
            try {
                sessionStorage.setItem("tune-saved", "1")
            } catch {}
            msg.textContent = "Saved to instances.json. Tell Claude when it's right."
            msg.style.color = "#16a34a"
        } else {
            msg.textContent = "Couldn't save. Is the dev server running?"
            msg.style.color = "#dc2626"
            save.disabled = false
        }
        msg.hidden = false
    })
}

const w = window as any
const start = () => {
    const entry = w.__tune?.[ISLAND]
    if (!entry || w.__tuneBuilt) return
    w.__tuneBuilt = true
    build(entry)
}
addEventListener("tune:ready", start)
start()
