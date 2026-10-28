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
    fit: 0.85,
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
    tileHoverBg: "#FAFAFA",
    // the card and its agent cards white, the input off-white
    card: "#FFFFFF",
    tileBg: "#FFFFFF",
    inputBg: "#FDFCFC",
    threadBlur: 2, // a light blur where the chat slides under the agent's header
    threadBlurHeight: 2.25,
    solidFade: 0,
    headerCutGap: 3, // that edge a little below the header
    threadTopSpace: 4, // and the chat starts as much lower, so the first message stays clear
    paceMatchesBar: true, // "On pace for…" in the bars' green
    readyWeight: 500, // "Ready for the next prompt"
    workSpeed: 3.5, // agents get through their subtasks 3.5× as fast
    chatTextBoost: 0.5, // the agent chat's text 0.5px bigger
}

// The studio view (?tune=usage-studio): the same card on its own framed backdrop
const STUDIO: Partial<Design> = {
    ...DESIGN,
    card: "#FDFCFC", // the colours unflipped here: the flip is only for the carousel
    tileBg: "#FDFCFC",
    inputBg: "#FFFFFF",
    backdrop: "#F8F8F8",
    backdropRatio: "4:3",
    backdropImage: "/media/usage/backdrop.jpg",
    backdropBlur: 2,
    backdropOverlayOpacity: 0.14,
    fit: 0.75,
    scrollbarOpacity: 0.14,
}

// Where the settings panel saves its edits (in this browser), one per view
const STUDIO_KEY = "agent-overview-panel-v1"
const CAROUSEL_KEY = "agent-overview-panel-carousel-v1"

export default function WeeklyUsageIsland() {
    // dev only, the card's own settings panel (it saves in this browser; ask to bake values in):
    //   localhost:4322/?tune=usage         the panel at the right, the card in its carousel card
    //   localhost:4322/?tune=usage-studio  the card full screen on its own backdrop, everything
    //                                      tunable (the backdrop too); open it in another tab
    //   localhost:4322/?tune=usage-record  the studio card full screen, no panel, typing allowed,
    //                                      shown on a "usage-record-start" event (for screen videos)
    const [tune, setTune] = useState<"" | "carousel" | "studio" | "record">("")
    const [recording, setRecording] = useState(false)
    useEffect(() => {
        if (!import.meta.env.DEV) return
        const t = new URLSearchParams(location.search).get("tune")
        if (t === "usage-record") {
            const start = () => setRecording(true)
            window.addEventListener("usage-record-start", start)
            setTune("record")
            return () => window.removeEventListener("usage-record-start", start)
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
