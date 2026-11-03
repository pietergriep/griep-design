import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { BackdropPanel, DEFAULT_DESIGN, WeeklyUsageShowcase, backdropPaint, sampleAgents } from "./WeeklyUsageCard"
import type { Design } from "./WeeklyUsageCard"

// The weekly usage / agents card (from Downloads/WeeklyUsageCard.tsx), on its own: no
// settings panel, filling its carousel card, on the card's own background.
// The site's settings on top of the card's own defaults:
const DESIGN: Partial<Design> = {
    backdrop: "transparent",
    backdropRatio: "Fill screen", // the carousel card is its frame
    fit: 0.83,
    titleSize: 4.8,
    tracking: -0.01,
    titleWeight: 400,
    tileBorderColor: "#DEDEDE",
    sectionGap: 7.5,
    scrollbarOpacity: 0.14,
    promptChipSize: 2.65,
    threadTextSize: 3.2,
    threadGap: 8,
    stepIconSize: 3,
    stepCheckScale: 1.1,
    // concentric-radius: the send button sits inside the input, and the input inside the agent card
    composerRadius: 2,
    sendRadius: 1.35,
    suggestionsOnly: true, // prompts can't be typed, only the suggested ones sent
    closeBg: "#EBEBEB",
    tileHoverBg: "#F7F7F7",
    // the card, its agent cards and the input white
    card: "#FFFFFF",
    tileBg: "#FFFFFF",
    inputBg: "#FFFFFF",
    inputBorderColor: "#D6D6D6",
    threadBlur: 1, // a light blur where the chat slides under the agent's header
    threadBlurHeight: 11.25,
    solidFade: 0,
    headerCutGap: 3, // that edge a little below the header
    threadTopSpace: 4, // and the chat starts as much lower, so the first message stays clear
    paceMatchesBar: true, // "On pace for…" in the bars' green
    readyWeight: 500, // "Ready for the next prompt"
    workSpeed: 3.5, // agents get through their subtasks 3.5× as fast
    chatTextBoost: 0.5, // the agent chat's text 0.5px bigger
    summaryInMs: 300,
    listBlur: 0.5, // a lighter, shorter blur where the list scrolls under its top edge
    listBlurHeight: 6.25,
    listBlurReveal: 4,
}

// The studio view (?tune=usage-studio): the same card on its own framed backdrop
// The carousel's settings, only the backdrop is its own
const STUDIO: Partial<Design> = {
    ...DESIGN,
    backdrop: "#F8F8F8",
    backdropRatio: "1:1.414 (A4)", // a tall A-paper frame (1415 × 2000)
    autoPromptSec: 0, // agents don't send prompts by themselves (for now)
    backdropImage: "/media/usage/backdrop.jpg",
    backdropBlur: 2,
    backdropOverlayOpacity: 0.14,
}

// Where the settings panel saves its edits (in this browser), one per view
// How much of its frame each card fills in the pair view
const PAIR_FIT = 0.98
// Reviewer is done at rest; in the pair view it works on its review, so the open card keeps moving.
// Researcher stays at the top of the list: it finishes last, and shouldn't drop back down then
const PAIR_AGENTS = sampleAgents.map((a) =>
    a.id === "reviewer" ? { ...a, status: "active" as const, tasksDone: 0, currentProgress: 0 } : a.id === "researcher" ? { ...a, pinned: true } : a
)

// The film view (a staged screen video of the studio): prompts typed out (not the suggested
// ones), each with a short plan of its own; Reviewer gets through its review faster
const FILM_REVIEW = "Review the pricing page PR #240"
const FILM_PROMPT = "Polish the settings page"
const FILM_AGENTS = sampleAgents.map((a) =>
    a.id === "reviewer"
        ? {
              ...a,
              speed: 2.2,
              plans: {
                  [FILM_REVIEW]: [
                      { doing: "Reading the diff {n} of 6 files", done: "Read the diff of 6 files", count: 6 },
                      { doing: "Stress-testing the layout", done: "Found 2 overflow bugs", skill: "break-ui" },
                      { doing: "Leaving comments {n} of 2", done: "Left 2 comments", count: 2 },
                  ],
              },
          }
        : a.id === "coder"
          ? {
                ...a,
                suggestions: ["Add dark mode to the dashboard"], // what the input suggests; the prompt typed is another
                plans: {
                    [FILM_PROMPT]: [
                        { doing: "Reading src/pages/Settings.tsx", done: "Read src/pages/Settings.tsx" },
                        { doing: "Fixing spacing and focus states", done: "Fixed 5 spacing and focus issues" },
                        { doing: "Running tests {n} of 14", done: "14 tests passed", count: 14 },
                    ],
                },
            }
          : a
)

const STUDIO_KEY = "agent-overview-panel-v1"
const CAROUSEL_KEY = "agent-overview-panel-carousel-v1"
const PAIR_KEY = "agent-overview-panel-pair-v1"
/** What the pair view's panel saved (its backdrop edits, the cards' size) */
const savedPair = () => {
    try {
        return JSON.parse(localStorage.getItem(PAIR_KEY) || "{}")
    } catch {
        return {}
    }
}
/** The design a view's panel saved in this browser */
const loadDesign = (key: string): Partial<Design> => {
    try {
        return JSON.parse(localStorage.getItem(key) || "null")?.design ?? {}
    } catch {
        return {}
    }
}

/**
 * The list (higher, left) and an open agent (lower, right), staggered, centred in the
 * frame around it, which must be a size container: sized in "u", 1cqw on a frame as wide
 * as the one it was drawn for (1964 x 1254), smaller on a wider one (a 16:9 video) so
 * both stay in view. Used by the pair view and the case study.
 */
function PairCards({ scale = 1, autoSec, out = false }: { scale?: number; autoSec: number; out?: boolean }) {
    return (
        <>
            <style>
                {"@keyframes wu-rec-in { from { opacity: 0; transform: translateY(14px) scale(0.985) } }" +
                    "@keyframes wu-pair-out { to { opacity: 0; transform: translateY(14px) scale(0.985) } }"}
            </style>
            {[
                { x: 0, y: 0, open: undefined },
                { x: 40.8, y: 13.75, open: "reviewer" },
            ].map((f, i) => (
                // fades in on load, the right card a little after the left; out the same way
                <div
                    key={i}
                    style={{
                        ["--u" as string]: `calc(min(1cqw, 1.566cqh) * ${scale})`,
                        position: "absolute",
                        left: `calc((100cqw - 75.7 * var(--u)) / 2 + ${f.x} * var(--u))`,
                        top: `calc((100cqh - (34.9 * 749 / 685 + 13.75) * var(--u)) / 2 + ${f.y} * var(--u))`,
                        width: "calc(34.9 * var(--u))",
                        aspectRatio: "685 / 749",
                        animation: out
                            ? `wu-pair-out 420ms cubic-bezier(0.55, 0, 0.75, 0.2) ${i * 180}ms both`
                            : `wu-rec-in 520ms cubic-bezier(0.22, 1, 0.36, 1) ${300 + i * 180}ms both`,
                    }}
                >
                    <WeeklyUsageShowcase
                        panel={false}
                        mode="fill"
                        design={{ ...DESIGN, fit: PAIR_FIT, autoPromptSec: autoSec }}
                        openAgentId={f.open}
                        agents={PAIR_AGENTS}
                    />
                </div>
            ))}
        </>
    )
}

// The case study (under the Workload card, "Case study"): the card on its own or the
// pair, on its own photo (already motion-blurred, so no blur or overlay on top)
const CASE_FIT = 0.775 // how much of its frame the single card fills
const CASE_PAIR_SCALE = 1.25 // the pair's cards, 1 = as in the pair view
const CASE_BACKDROP: Partial<Design> = { backdropImage: "/media/usage/case-backdrop.webp", backdropBlur: 0, backdropOverlayOpacity: 0 }
const CASE_AUTO_SEC = 0 // no prompts by themselves: the pair only moves when someone uses it
const CASE_PAIR_IN = 0.4 // how much of the pair's frame shows before its cards fade in (0–1)
// phones (the case study's one-column layout, global.css): a card per image, swiped sideways
const CASE_PHONE = "(max-width: 809.98px)"
const CASE_PHONE_FIT = 0.9 // how much of its image the card fills
const CASE_PHONE_OPEN = "reviewer" // the agent open in the second image (as in the pair)

export function WorkloadCase({ view }: { view: "single" | "pair" }) {
    const d: Design = { ...DEFAULT_DESIGN, ...STUDIO, ...CASE_BACKDROP }
    // Starts over on every open of the case study ("case-study-open", scripts/case-study.ts)
    const [run, setRun] = useState(0)
    // the pair waits until it scrolls into view (CASE_PAIR_IN of it showing), each open again
    const [seen, setSeen] = useState(view === "single")
    const root = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const restart = () => {
            setRun((n) => n + 1)
            if (view === "pair") setSeen(false)
        }
        window.addEventListener("case-study-open", restart)
        return () => window.removeEventListener("case-study-open", restart)
    }, [view])
    useEffect(() => {
        if (seen || !root.current) return
        const io = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) setSeen(true)
            },
            { threshold: CASE_PAIR_IN },
        )
        io.observe(root.current)
        return () => io.disconnect()
    }, [seen, run])
    // phones: one card per image, bigger, the second with an agent open (no room for the pair)
    const [phone, setPhone] = useState(false)
    useEffect(() => {
        const q = matchMedia(CASE_PHONE)
        const update = () => setPhone(q.matches)
        update()
        q.addEventListener("change", update)
        return () => q.removeEventListener("change", update)
    }, [])
    const single = (open?: string) => (
        <div key={`${run}-${phone}`} style={{ position: "absolute", inset: 0, animation: "wu-rec-in 520ms cubic-bezier(0.22, 1, 0.36, 1) 300ms both" }}>
            <style>{"@keyframes wu-rec-in { from { opacity: 0; transform: translateY(14px) scale(0.985) } }"}</style>
            <WeeklyUsageShowcase
                panel={false}
                mode="fill"
                design={{ ...STUDIO, ...CASE_BACKDROP, backdrop: "transparent", backdropImage: "", backdropRatio: "Fill screen", fit: phone ? CASE_PHONE_FIT : CASE_FIT, ...(open ? { autoPromptSec: CASE_AUTO_SEC } : {}) }}
                openAgentId={open}
            />
        </div>
    )
    // The photo stays; only the cards fade in on top of it, as in the videos
    return (
        <div ref={root} className="island-root" style={{ position: "absolute", inset: 0, overflow: "hidden", containerType: "size" }}>
            <div style={{ position: "absolute", inset: -2 * Math.max(2, d.backdropBlur), background: backdropPaint(d), filter: d.backdropBlur > 0 ? `blur(${d.backdropBlur}px)` : undefined }} />
            <div style={{ position: "absolute", inset: 0, background: d.backdropOverlay, opacity: d.backdropOverlayOpacity }} />
            {view === "single" ? single() : seen && (phone ? single(CASE_PHONE_OPEN) : <PairCards key={run} scale={CASE_PAIR_SCALE} autoSec={CASE_AUTO_SEC} />)}
        </div>
    )
}

export default function WeeklyUsageIsland() {
    // dev only, the card's own settings panel (it saves in this browser; ask to bake values in):
    //   localhost:4322/?tune=usage         the panel at the right, the card in its carousel card
    //   localhost:4322/?tune=usage-studio  the card full screen on its own backdrop, everything
    //                                      tunable (the backdrop too); open it in another tab
    //   localhost:4322/?tune=usage-record  the studio card full screen, no panel, typing allowed,
    //                                      shown on a "usage-record-start" event (for screen videos)
    //   localhost:4322/?tune=usage-pair    two cards side by side on the studio backdrop, the list
    //                                      and an open agent, both running (for the X post)
    const [tune, setTune] = useState<"" | "carousel" | "studio" | "record" | "pair" | "film">("")
    // film view: the studio's saved look (backdrop included), shown on a "usage-film-start" event
    const [film, setFilm] = useState<{ design: Partial<Design>; on: boolean } | null>(null)
    const [recording, setRecording] = useState(false)
    // pair view: the cards fade out again on a "usage-pair-out" event (the end of a looping video)
    const [pairOut, setPairOut] = useState(false)
    // with &wait the cards only come in on a "usage-pair-start" event (for recording a loop)
    const [pairIn, setPairIn] = useState(true)
    // with &scale=1.15 both cards are that much bigger (for a narrower video, e.g. 4:3 for phones)
    const [pairScale, setPairScale] = useState(1)
    // its backdrop: the studio's (as saved in its panel), then its own panel's edits over that
    const [pairDesign, setPairDesign] = useState<Design>({ ...DEFAULT_DESIGN, ...STUDIO })
    const [pairPanel, setPairPanel] = useState(true)
    // the agents keep busy: one that's done sends a suggested prompt every few seconds
    const [pairAuto, setPairAutoState] = useState(8)
    const setPairAuto = (raw: number) => {
        const v = Math.max(0, Math.round(raw) || 0)
        setPairAutoState(v)
        try {
            localStorage.setItem(PAIR_KEY, JSON.stringify({ ...savedPair(), autoSec: v }))
        } catch {}
    }
    const setScale = (raw: number) => {
        const v = Math.min(3, Math.max(0.2, raw || 1))
        setPairScale(v)
        try {
            localStorage.setItem(PAIR_KEY, JSON.stringify({ ...savedPair(), scale: v }))
        } catch {}
    }
    // its panel's edits are saved on their own (only the backdrop's settings), over the studio's
    const editPair = (fn: (d: Design) => Design) =>
        setPairDesign((prev) => {
            const next = fn(prev)
            // only what differs from the studio's backdrop (so its image isn't stored twice)
            const base: Design = { ...DEFAULT_DESIGN, ...STUDIO, ...loadDesign(STUDIO_KEY) }
            const own = Object.fromEntries(
                (Object.keys(next) as (keyof Design)[]).filter((k) => k.startsWith("backdrop") && next[k] !== base[k]).map((k) => [k, next[k]]),
            )
            try {
                localStorage.setItem(PAIR_KEY, JSON.stringify({ ...savedPair(), design: own }))
            } catch {
                /* an image over the storage limit: kept for this visit only */
            }
            return next
        })
    useEffect(() => {
        if (!import.meta.env.DEV) return
        const t = new URLSearchParams(location.search).get("tune")
        if (t === "usage-record") {
            const start = () => setRecording(true)
            window.addEventListener("usage-record-start", start)
            setTune("record")
            return () => window.removeEventListener("usage-record-start", start)
        }
        if (t === "usage-film") {
            let saved: Partial<Design> = {}
            try {
                saved = JSON.parse(localStorage.getItem(STUDIO_KEY) || "null")?.design ?? {}
            } catch {}
            // the code's usage pace, no prompts by themselves, the frame filling the screen
            const { usageGain: _u, promptUsageGain: _p, ...look } = saved
            // and typing allowed, so a prompt can be typed out instead of tabbed in
            const design = { ...STUDIO, ...look, backdropRatio: "Fill screen", autoPromptSec: 0, suggestionsOnly: false }
            setFilm({ design, on: false })
            const start = () => setFilm((f) => f && { ...f, on: true })
            window.addEventListener("usage-film-start", start)
            setTune("film")
            return () => window.removeEventListener("usage-film-start", start)
        }
        if (t === "usage-pair") {
            const out = () => setPairOut(true)
            const start = () => setPairIn(true)
            window.addEventListener("usage-pair-out", out)
            window.addEventListener("usage-pair-start", start)
            if (new URLSearchParams(location.search).has("wait")) setPairIn(false)
            // &scale= (for recording) over the size saved in its panel
            let scale = Number(new URLSearchParams(location.search).get("scale"))
            if (!(scale > 0)) try { scale = Number(JSON.parse(localStorage.getItem(PAIR_KEY) || "null")?.scale) } catch {}
            if (scale > 0) setPairScale(scale)
            // recording (&wait): no panel, and only the scripted work
            if (new URLSearchParams(location.search).has("wait")) {
                setPairPanel(false)
                setPairAutoState(0)
            } else if (typeof savedPair().autoSec === "number") setPairAutoState(savedPair().autoSec)
            setPairDesign({ ...DEFAULT_DESIGN, ...STUDIO, ...loadDesign(STUDIO_KEY), ...loadDesign(PAIR_KEY) })
            setTune("pair")
            return () => {
                window.removeEventListener("usage-pair-out", out)
                window.removeEventListener("usage-pair-start", start)
            }
        }
        if (t !== "usage" && t !== "usage-studio") return
        // The panel brings back what it saved, over the settings given here. Each view saves
        // on its own (CAROUSEL_KEY, STUDIO_KEY), so edits in one don't reach the other. In the
        // studio a saved see-through backdrop (from when the views shared one) is dropped, or
        // the page would show behind.
        try {
            const saved = JSON.parse(localStorage.getItem(STUDIO_KEY) || "null")
            if (t === "usage-studio" && saved?.design?.backdrop === "transparent") {
                delete saved.design.backdrop
                localStorage.setItem(STUDIO_KEY, JSON.stringify(saved))
            }
            // One-time: the studio's saved chat blur (from when it was hidden) gives way to
            // the code's, the same as the live site
            if (t === "usage-studio" && saved?.design && !saved.blurFromCode) {
                for (const k of ["threadBlur", "threadBlurHeight", "threadBlurTintOpacity", "solidFade", "headerCutGap"]) delete saved.design[k]
                saved.blurFromCode = true
                localStorage.setItem(STUDIO_KEY, JSON.stringify(saved))
            }
            // One-time: the studio's frame ratio (now A4), auto prompts (now off) and card corners come from the code
            if (t === "usage-studio" && saved?.design && !saved.ratioFromCode3) {
                if (!saved.ratioFromCode) delete saved.design.backdropRatio
                if (!saved.ratioFromCode2) delete saved.design.autoPromptSec
                delete saved.design.tileRadius // the agent cards' 3u corners
                saved.ratioFromCode = saved.ratioFromCode2 = saved.ratioFromCode3 = true
                localStorage.setItem(STUDIO_KEY, JSON.stringify(saved))
            }
        } catch {}
        setTune(t === "usage" ? "carousel" : "studio")
    }, [])
    if (tune === "record")
        return createPortal(
            <div style={{ position: "fixed", inset: 0, zIndex: 2147483000, background: "#F8F8F8" }}>
                {/* the backdrop on its own until the card loads in (matches the showcase's) */}
                <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
                    <div style={{ position: "absolute", inset: -4, background: `url("${STUDIO.backdropImage}") center / cover no-repeat`, filter: `blur(${STUDIO.backdropBlur}px)` }} />
                    <div style={{ position: "absolute", inset: 0, background: "#000", opacity: STUDIO.backdropOverlayOpacity }} />
                </div>
                {recording && (
                    <div style={{ position: "absolute", inset: 0, animation: "wu-rec-in 520ms cubic-bezier(0.22, 1, 0.36, 1) both" }}>
                        <style>{"@keyframes wu-rec-in { from { opacity: 0; transform: translateY(14px) scale(0.985) } }"}</style>
                        <WeeklyUsageShowcase
                            panel={false}
                            mode="screen"
                            design={{ ...STUDIO, backdropRatio: "Fill screen", suggestionsOnly: false, fit: 0.8 }}
                            // Writer works fast here, so the video can show its loader turn back into a check
                            agents={sampleAgents.map((a) => (a.id === "writer" ? { ...a, speed: 7 } : a))}
                        />
                    </div>
                )}
            </div>,
            document.body,
        )
    if (tune === "film" && film)
        return createPortal(
            <div style={{ position: "fixed", inset: 0, zIndex: 2147483000, background: film.design.backdrop ?? "#F8F8F8" }}>
                {film.on && (
                    <div style={{ position: "absolute", inset: 0, animation: "wu-rec-in 520ms cubic-bezier(0.22, 1, 0.36, 1) both" }}>
                        <style>{"@keyframes wu-rec-in { from { opacity: 0 } }"}</style>
                        <WeeklyUsageShowcase panel={false} mode="screen" design={film.design} agents={FILM_AGENTS} />
                    </div>
                )}
            </div>,
            document.body,
        )
    if (tune === "pair") {
        const d = pairDesign
        return createPortal(
            <div style={{ position: "fixed", inset: 0, zIndex: 2147483000, display: "flex" }}>
            <div style={{ position: "relative", flex: 1, overflow: "hidden", containerType: "size" }}>
                <div style={{ position: "absolute", inset: -2 * Math.max(2, d.backdropBlur), background: backdropPaint(d), filter: d.backdropBlur > 0 ? `blur(${d.backdropBlur}px)` : undefined }} />
                <div style={{ position: "absolute", inset: 0, background: d.backdropOverlay, opacity: d.backdropOverlayOpacity }} />
                {pairIn && <PairCards scale={pairScale} autoSec={pairAuto} out={pairOut} />}
                {!pairPanel && !new URLSearchParams(location.search).has("wait") && (
                    <button onClick={() => setPairPanel(true)} style={{ position: "absolute", top: 12, right: 12, padding: "6px 10px", font: "12px Geist, system-ui, sans-serif", background: "#FFFFFF", border: "none", borderRadius: 6, boxShadow: "0 1px 3px rgba(0,0,0,0.12)", cursor: "pointer" }}>
                        Customize
                    </button>
                )}
            </div>
            {pairPanel && (
                <BackdropPanel
                    design={d}
                    setDesign={editPair}
                    onClose={() => setPairPanel(false)}
                    onReset={() => {
                        editPair(() => ({ ...DEFAULT_DESIGN, ...STUDIO, ...loadDesign(STUDIO_KEY) }))
                        setScale(1)
                        setPairAuto(8)
                    }}
                    scale={pairScale}
                    setScale={setScale}
                    autoSec={pairAuto}
                    setAutoSec={setPairAuto}
                />
            )}
            </div>,
            document.body,
        )
    }
    if (tune === "studio")
        // on <body>: inside the carousel's moving track, "fixed" would only cover this card
        return createPortal(
            <div style={{ position: "fixed", inset: 0, zIndex: 2147483000 }}>
                <WeeklyUsageShowcase panel mode="screen" design={STUDIO} storageKey={STUDIO_KEY} />
            </div>,
            document.body,
        )
    return (
        <div className="island-root" style={{ position: "absolute", inset: 0 }}>
            <WeeklyUsageShowcase
                key={tune || "site"}
                panel={tune === "carousel"}
                panelPortal={tune === "carousel" ? document.body : undefined}
                storageKey={CAROUSEL_KEY}
                mode="fill"
                design={DESIGN}
            />
        </div>
    )
}
