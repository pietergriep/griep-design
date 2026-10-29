import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { WeeklyUsageShowcase, sampleAgents } from "./WeeklyUsageCard"
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
            const scale = Number(new URLSearchParams(location.search).get("scale"))
            if (scale > 0) setPairScale(scale)
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
    if (tune === "pair")
        return createPortal(
            <div style={{ position: "fixed", inset: 0, zIndex: 2147483000, overflow: "hidden", background: "#F8F8F8" }}>
                <div style={{ position: "absolute", inset: -4, background: `url("${STUDIO.backdropImage}") center / cover no-repeat`, filter: `blur(${STUDIO.backdropBlur}px)` }} />
                <div style={{ position: "absolute", inset: 0, background: "#000", opacity: STUDIO.backdropOverlayOpacity }} />
                <style>
                    {"@keyframes wu-rec-in { from { opacity: 0; transform: translateY(14px) scale(0.985) } }" +
                        "@keyframes wu-pair-out { to { opacity: 0; transform: translateY(14px) scale(0.985) } }"}
                </style>
                {/* The list (higher, left) and an open agent (lower, right), staggered, centred in
                    the window: sized in "u", 1vw on a window as wide as the one it was drawn for
                    (1964 x 1254), smaller on a wider one (a 16:9 video) so both stay in view */}
                {pairIn && [
                    { x: 0, y: 0, open: undefined },
                    { x: 40.8, y: 13.75, open: "reviewer" },
                ].map((f, i) => (
                    // fades in on load, the right card a little after the left; out the same way
                    <div
                        key={i}
                        style={{
                            ["--u" as string]: `calc(min(1vw, 1.566vh) * ${pairScale})`,
                            position: "absolute",
                            left: `calc((100vw - 75.7 * var(--u)) / 2 + ${f.x} * var(--u))`,
                            top: `calc((100vh - (34.9 * 749 / 685 + 13.75) * var(--u)) / 2 + ${f.y} * var(--u))`,
                            width: "calc(34.9 * var(--u))",
                            aspectRatio: "685 / 749",
                            animation: pairOut
                                ? `wu-pair-out 420ms cubic-bezier(0.55, 0, 0.75, 0.2) ${i * 180}ms both`
                                : `wu-rec-in 520ms cubic-bezier(0.22, 1, 0.36, 1) ${300 + i * 180}ms both`,
                        }}
                    >
                        <WeeklyUsageShowcase
                            panel={false}
                            mode="fill"
                            design={{ ...DESIGN, fit: PAIR_FIT }}
                            openAgentId={f.open}
                            agents={PAIR_AGENTS}
                        />
                    </div>
                ))}
            </div>,
            document.body,
        )
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
