// Copied from ~/Downloads/WeeklyUsageCard.tsx. Changes: Geist isn't fetched from Google
// Fonts here, the site serves it itself (see FONTS); the usage bar measures its layout width,
// so it still fills when a parent is scaled (see StripeBar's measure); and the showcase takes
// `panelPortal`, to tune the card where it sits on the page; a `suggestionsOnly` setting
// (only the suggested prompts can be sent, no typing); a search field in the panel; backdrop
// blur and overlay settings; `paceMatchesBar` (pace text in the bar's own green);
// `readyWeight`; `threadTopSpace`; and a 40px hit area on the close button.

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type PointerEvent as ReactPointerEvent,
    type ReactNode,
    type Ref,
} from "react"
import { createPortal } from "react-dom"

/*
 * Agent overview card — built from Figma "Frame 31" (node 15:1347).
 *
 * Every visual value lives in one `Design` object (DEFAULT_DESIGN below).
 * Sizes are Figma units (1×), multiplied by the CSS variable --s ("px per
 * Figma unit"). On its own the card renders at 3× (--s: 3px); inside the
 * showcase it scales with the window.
 *
 * The default export shows the card with a live settings panel. Pass
 * `panel={false}` (e.g. in Framer) to show the card on its own.
 */

/* Motion tokens: the only curves used in this file (hover/colour changes use plain `ease`) */
/** Opening and closing an agent, and every fade that goes with it */
const EXPAND_EASE = "cubic-bezier(0.4, 0, 0.2, 1)"
/** Strong ease-out for things that enter, settle or respond: toggle pill, loader, task slide, fades */
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)"

/** Figma units → CSS length */
const u = (n: number) => `calc(${n} * var(--s, 3px))`
/** A text size in units, set 1px under the scale */
const ut = (n: number) => `calc(${n} * var(--s, 3px) - 1px)`
/** A text size in the agent's chat: the scale, plus the chat's own px boost */
const uc = (d: { chatTextBoost: number }, n: number) => `calc(${n} * var(--s, 3px) - 1px + ${d.chatTextBoost}px)`

/* ------------------------------------------------------------------ */
/* Design                                                              */
/* ------------------------------------------------------------------ */

export interface Design {
    // Text
    fontFamily: string
    tracking: number
    titleText: string
    titleSize: number
    titleWeight: number
    resetText: string
    resetSize: number
    paceText: string
    paceSize: number
    metaWeight: number
    resetColor: string
    paceFollowsStatus: boolean
    paceColor: string
    /** Pace text in exactly the bar's green (off: a darker green, for text contrast) */
    paceMatchesBar: boolean
    agentsLabel: string
    labelSize: number
    activeLabel: string
    idleLabel: string
    toggleTextSize: number
    nameSize: number
    nameWeight: number
    modelSize: number
    taskSize: number
    emptyActiveText: string
    emptyIdleText: string
    readyText: string
    /** Weight of the ready message (its hint stays regular) */
    readyWeight: number
    readyHint: string
    // Numbers
    heroSize: number
    heroUnitSize: number
    heroWeight: number
    shareSize: number
    shareUnitSize: number
    shareWeight: number
    shareTracking: number
    shareDisplay: string
    shareLabel: string
    // Colors
    backdrop: string
    /** Backdrop shape: the whole screen, or a frame in a fixed aspect ratio */
    backdropRatio: string
    /** Second colour for a gradient backdrop */
    backdropGradient: boolean
    backdrop2: string
    backdropAngle: number
    /** Optional image (URL) laid over the backdrop colour */
    backdropImage: string
    /** Outside the frame, when an aspect ratio is set */
    backdropSurround: string
    backdropRadius: number
    /** Space around the frame, px */
    backdropMargin: number
    /** Blur of the backdrop's colour / gradient / image (px), not of the card */
    backdropBlur: number
    /** A colour laid over the backdrop, under the card, at this opacity (0–1) */
    backdropOverlay: string
    backdropOverlayOpacity: number
    card: string
    text: string
    labelOpacity: number
    mutedOpacity: number
    shimmerBase: number
    green: string
    amber: string
    red: string
    toggleBg: string
    pill: string
    tileFill: boolean
    tileBg: string
    tileBorderColor: string
    tileBorderWidth: number
    emptyBg: string
    iconColor: string
    // Card
    fit: number
    cardWidth: number
    cardPadding: number
    cardRadius: number
    cardBorderWidth: number
    cardBorderColor: string
    sectionGap: number
    heroGap: number
    metaGap: number
    heroBarGap: number
    // Usage bar
    segments: number
    barFollowsPace: boolean
    barColor: string
    barTrack: string
    barHeight: number
    stripeWidth: number
    stripeAdjust: number
    stripeRadius: number
    paceWarnAt: number
    // Toggle
    labelToggleGap: number
    /** After the ordinary-interfaces review: contrast, input border, stagger cap, copy */
    a11yFixes: boolean
    /** Working / Ready toggle. Off: one scrollable list, working agents first */
    showToggle: boolean
    /** Number chip after the "Agents" label */
    showAgentCount: boolean
    /** Label ↔ list, when the toggle is off */
    labelListGap: number
    /** px the agents section is nudged up */
    agentsNudge: number
    /** Agents reordering in the single list (working ones move up) */
    reorderMs: number
    toggleTilesGap: number
    toggleRadius: number
    togglePadding: number
    toggleGap: number
    togglePadX: number
    togglePadY: number
    // Agent cards
    tileGap: number
    /** Agent cards shown per tab; the rest scroll into view */
    maxVisibleTiles: number
    showScrollbar: boolean
    scrollbarWidth: number
    scrollbarColor: string
    scrollbarOpacity: number
    /** Distance of the scrollbar from the cards' right edge */
    scrollbarOffset: number
    tileRadius: number
    tilePadding: number
    tileHeaderGap: number
    nameModelGap: number
    effortGap: number
    showModelIcon: boolean
    iconSize: number
    iconGap: number
    // Tasks
    tasksTop: number
    rowHeight: number
    fade: number
    showTaskProgress: boolean
    // Status (loader + counter)
    showLoader: boolean
    loaderColor: string
    loaderSize: number
    loaderStroke: number
    loaderGap: number
    loaderSpeedMs: number
    checkMs: number
    showCounter: boolean
    counterSize: number
    counterBg: string
    /** Text size in the prompt chip next to an agent's name */
    promptChipSize: number
    /** Context chip drawn as a chip (fill + padding), or as plain text */
    contextChipBg: boolean
    counterTotalOpacity: number
    counterRadius: number
    counterPadX: number
    counterPadY: number
    counterGap: number
    // Agent detail (expanded)
    expandMs: number
    /** The chat fading in (and rising slightly) when an agent opens */
    chatInMs: number
    chatInDelayMs: number
    /** The input comes in this long after the chat content */
    chatInStaggerMs: number
    expandOvershoot: number
    threadTextSize: number
    /** Subtasks listed under a prompt in the chat */
    subtaskSize: number
    /** Chat subtasks: space between rows, and icon ↔ text */
    subtaskGap: number
    subtaskIconGap: number
    /** Chat input and the suggestion inside it */
    inputTextSize: number
    /** The "Tab" key hint in the input */
    tabHintSize: number
    tabHintBg: string
    tabHintBorderColor: string
    /** In px; drawn inside the chip, so it doesn't change its size */
    tabHintBorderWidth: number
    tabHintTextColor: string
    /** Count chip after the Agents label */
    agentCountSize: number
    /** Skills label, library chips, their dropdown and the skill chips in the chat */
    skillsTextSize: number
    /** File card: name, and the line below it */
    fileNameSize: number
    fileMetaSize: number
    threadGap: number
    bubbleGap: number
    bubbleBg: string
    stepIconSize: number
    /** Checkmark of a finished subtask in the chat, as a share of the icon size */
    stepCheckScale: number
    composerRadius: number
    /** Chat input border (used with the review fixes; Before uses the card border) */
    inputBorderColor: string
    inputBg: string
    composerGap: number
    /** A new prompt's bubble and subtasks rise in one after another */
    promptInMs: number
    /** The summary under a finished prompt: its space opens up, then the text fades in */
    summaryInMs: number
    promptStaggerMs: number
    /** Example prompts as chips above the input */
    showSuggestions: boolean
    /** How many example prompts show at once */
    suggestionCount: number
    /** Off: one suggestion at a time inside the input. On: a row of chips above it */
    suggestionChips: boolean
    /** Only the suggested prompts can be sent: the input can't be typed in */
    suggestionsOnly: boolean
    suggestionInMs: number
    /** Installed skills, at the top of an agent's chat */
    showSkills: boolean
    /** Header ↔ skills row, and skills row ↔ chat */
    skillsGap: number
    /** Soft edge below the solid area behind the header */
    solidFade: number
    /** Extra solid space below the agent's header: where scrolled chat gets cut off */
    headerCutGap: number
    /** Clear room below the skills row before the blur starts */
    solidGap: number
    /** File cards: name ↔ details line */
    /** Cards for the files a finished prompt wrote or edited */
    showFiles: boolean
    /** A closing message under a prompt once all its subtasks are done */
    showSummary: boolean
    /** A finished prompt's subtasks fold into one line ("Compared … in 42s"), with a caret to open them */
    collapseSteps: boolean
    collapseMs: number
    /** Px added to that line's text, on top of the subtasks' size */
    foldTextBoost: number
    fileLineGap: number
    fileHoverBg: string
    suggestionSize: number
    suggestionRadius: number
    suggestionBg: string
    suggestionHoverBg: string
    /** Chips ↔ input */
    suggestionGap: number
    threadBlur: number
    threadBlurHeight: number
    /** Extra room above the first chat message (open agent), so a taller blur doesn't cover it at rest */
    threadTopSpace: number
    threadBlurBottom: boolean
    threadBlurTint: string
    threadBlurTintOpacity: number
    sendRadius: number
    // Hover
    tileHover: boolean
    tileHoverBg: string
    tileHoverBorder: string
    hoverMs: number
    closeSize: number
    closeRadius: number
    closeBg: string
    closeHoverBg: string
    closeIconColor: string
    closeHoverIconColor: string
    /** Scale of the close button while pressed */
    closePressScale: number
    composerPlaceholder: string
    // Motion
    live: boolean
    slideMs: number
    /** Pause after an agent finishes before it moves to the Ready tab */
    moveToReadyMs: number
    /** How long the finished agent takes to leave the Working tab */
    moveOutMs: number
    stepPauseMs: number
    /** How fast an agent's context ("343k / 1M") fills as it works */
    contextGrowth: number
    /** Px added to every text size in the agent chat (messages, subtasks, summary, input) */
    chatTextBoost: number
    /** How fast every agent works through its subtasks (on top of each agent's own speed) */
    workSpeed: number
    shimmerMs: number
    toggleMs: number
    bigCountMs: number
    /** Usage (% points) added to the weekly total by the time every running subtask is done */
    usageGain: number
    /** Usage (% points) each prompt sent in a chat adds, a share per subtask as they finish */
    promptUsageGain: number
    /** Every this many seconds an agent picks up one of its suggested prompts by itself (0: never) */
    autoPromptSec: number
    /** The agent list settles on whole cards after scrolling */
    listSnap: boolean
    /** Blur where cards scroll out under the top of the list (px; 0 = off) */
    listBlur: number
    /** How far down from the list's top edge it reaches (u) */
    listBlurHeight: number
    /** The card colour laid over it, strongest at the edge (0–1) */
    listBlurTintOpacity: number
    /** How much scrolling (u) it takes to fade fully in; 0 = always there */
    listBlurReveal: number
}

export const DEFAULT_DESIGN: Design = {
    fontFamily: "Geist",
    tracking: -0.02,
    titleText: "Workload",
    titleSize: 6,
    titleWeight: 500,
    resetText: "Reset in {d} days",
    resetSize: 3.5,
    paceText: "On pace for ~{p}% at reset",
    paceSize: 9.5 / 3,
    metaWeight: 500,
    resetColor: "#000000",
    paceFollowsStatus: true,
    paceColor: "#2FBB2D",
    paceMatchesBar: false,
    agentsLabel: "Agents",
    labelSize: 3.2,
    activeLabel: "Working",
    idleLabel: "Ready",
    toggleTextSize: 3.2,
    nameSize: 4,
    nameWeight: 500,
    modelSize: 3.2,
    taskSize: 3.2,
    emptyActiveText: "No agents working right now",
    emptyIdleText: "Every agent is still working",
    readyText: "Ready for the next prompt",
    readyWeight: 400,
    readyHint: "Click to give {name} a task",

    heroSize: 11,
    heroUnitSize: 8,
    heroWeight: 400,
    shareSize: 8,
    shareUnitSize: 6,
    shareWeight: 400,
    shareTracking: -0.0175,
    shareDisplay: "Label",
    shareLabel: "{p}% of usage",

    backdrop: "#F6F6F6",
    backdropRatio: "1:1",
    backdropGradient: false,
    backdrop2: "#E7E7E7",
    backdropAngle: 160,
    backdropImage: "",
    backdropSurround: "#E9E9E9",
    backdropRadius: 0,
    backdropMargin: 40,
    backdropBlur: 0,
    backdropOverlay: "#000000",
    backdropOverlayOpacity: 0,
    card: "#FDFCFC",
    text: "#000000",
    labelOpacity: 0.4,
    mutedOpacity: 0.3,
    shimmerBase: 0.35,
    green: "#2FBB2D",
    amber: "#E3A23B",
    red: "#E5484D",
    toggleBg: "#F5F5F5",
    pill: "#FFFFFF",
    tileFill: true,
    tileBg: "#FDFCFC",
    tileBorderColor: "#E8E8E8",
    tileBorderWidth: 0.5,
    emptyBg: "#F9F9F9",
    iconColor: "#D97757",

    fit: 0.6,
    cardWidth: 118,
    cardPadding: 4,
    cardRadius: 4,
    cardBorderWidth: 0.5,
    cardBorderColor: "#E8E8E8",
    sectionGap: 10,
    heroGap: 4,
    metaGap: 3,
    heroBarGap: 6,

    segments: 43,
    barFollowsPace: true,
    barColor: "#2FBB2D",
    barTrack: "#E3E3E3",
    barHeight: 6.5,
    stripeWidth: 1,
    stripeAdjust: -1,
    stripeRadius: 0.3,
    paceWarnAt: 90,

    labelToggleGap: 2,
    a11yFixes: true,
    showToggle: false,
    showAgentCount: true,
    labelListGap: 3,
    agentsNudge: 2,
    reorderMs: 300,
    toggleTilesGap: 2,
    toggleRadius: 2,
    togglePadding: 0.5,
    toggleGap: 0,
    togglePadX: 2.5,
    togglePadY: 2,

    tileGap: 3,
    maxVisibleTiles: 2,
    showScrollbar: true,
    scrollbarWidth: 1,
    scrollbarColor: "#000000",
    scrollbarOpacity: 0.16,
    scrollbarOffset: 1.5,
    tileRadius: 3,
    tilePadding: 3,
    tileHeaderGap: 4,
    nameModelGap: 3.5,
    effortGap: 1.5,
    showModelIcon: false,
    iconSize: 6.5,
    iconGap: 2.5,

    tasksTop: 5,
    rowHeight: 5,
    fade: 3,
    showTaskProgress: false,

    showLoader: true,
    loaderColor: "#2FBB2D",
    loaderSize: 4.2,
    loaderStroke: 1.8,
    loaderGap: 1.5,
    loaderSpeedMs: 900,
    checkMs: 450,
    showCounter: true,
    counterSize: 2.3,
    counterBg: "#F0F0F0",
    promptChipSize: 2.4,
    contextChipBg: false,
    counterTotalOpacity: 0.5,
    counterRadius: 1.2,
    counterPadX: 1.2,
    counterPadY: 0.9,
    counterGap: 2,

    expandMs: 230,
    chatInMs: 300,
    chatInDelayMs: 0,
    chatInStaggerMs: 110,
    expandOvershoot: 0,
    threadTextSize: 3,
    subtaskSize: 3.2,
    subtaskGap: 3,
    subtaskIconGap: 1.6,
    inputTextSize: 3.3,
    tabHintSize: 2.8,
    tabHintBg: "#F0F0F0",
    tabHintBorderColor: "#DEDEDE",
    tabHintBorderWidth: 0.5,
    tabHintTextColor: "#6C6C6C",
    agentCountSize: 2.8,
    skillsTextSize: 2.8,
    fileNameSize: 2.76,
    fileMetaSize: 2.3,
    threadGap: 6,
    bubbleGap: 4.5,
    bubbleBg: "#F0F0F0",
    stepIconSize: 2.8,
    stepCheckScale: 1,
    composerRadius: 3,
    inputBorderColor: "#D1D1D1",
    inputBg: "#FDFCFC",
    composerGap: 3,
    promptInMs: 360,
    summaryInMs: 220,
    promptStaggerMs: 55,
    showSuggestions: true,
    suggestionCount: 4,
    suggestionChips: false,
    suggestionsOnly: false,
    suggestionInMs: 320,
    showSkills: false,
    skillsGap: 2.5,
    solidFade: 4,
    headerCutGap: 0,
    solidGap: 3.3,
    showFiles: false,
    showSummary: true,
    collapseSteps: true,
    collapseMs: 320,
    foldTextBoost: 0,
    fileLineGap: 1.6,
    fileHoverBg: "#F7F7F7",
    suggestionSize: 2.6,
    suggestionRadius: 99,
    suggestionBg: "#F4F4F4",
    suggestionHoverBg: "#EAEAEA",
    suggestionGap: 1.5,
    threadBlur: 4,
    threadBlurHeight: 6.75,
    threadTopSpace: 0,
    threadBlurBottom: false,
    threadBlurTint: "#FFFFFF",
    threadBlurTintOpacity: 1,
    sendRadius: 2,

    tileHover: true,
    tileHoverBg: "#F5F5F5",
    tileHoverBorder: "#DCDCDC",
    hoverMs: 150,
    closeSize: 5.5,
    closeRadius: 2.75,
    closeBg: "#F0F0F0",
    closeHoverBg: "#E6E6E6",
    closeIconColor: "#666666",
    closeHoverIconColor: "#1A1A1A",
    closePressScale: 0.9,
    composerPlaceholder: "Ask {name} to do something…",

    live: true,
    slideMs: 450,
    moveToReadyMs: 1800,
    moveOutMs: 260,
    stepPauseMs: 250,
    contextGrowth: 1,
    chatTextBoost: 0,
    workSpeed: 1,
    shimmerMs: 2200,
    toggleMs: 220,
    bigCountMs: 2600,
    usageGain: 1,
    promptUsageGain: 0.5,
    listSnap: false, // free scrolling; true settles on whole cards
    listBlur: 1, // the chat's edge blur settings, at the top of the list
    listBlurHeight: 11.25,
    listBlurTintOpacity: 1,
    listBlurReveal: 8,
    autoPromptSec: 0, // off for now (was 35: an agent sends a suggested prompt by itself every 35s)
}

const DesignContext = createContext<Design>(DEFAULT_DESIGN)
const useD = () => useContext(DesignContext)

/** Fonts the panel offers. `google` is the Google Fonts family name, if it needs loading. */
const FONTS: Record<string, { stack: string; google?: string }> = {
    Geist: { stack: `"Geist", -apple-system, BlinkMacSystemFont, system-ui, sans-serif` }, // served by the site, not Google Fonts
    Inter: { stack: `"Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif`, google: "Inter" },
    "DM Sans": { stack: `"DM Sans", system-ui, sans-serif`, google: "DM+Sans" },
    Manrope: { stack: `"Manrope", system-ui, sans-serif`, google: "Manrope" },
    "IBM Plex Sans": { stack: `"IBM Plex Sans", system-ui, sans-serif`, google: "IBM+Plex+Sans" },
    "Instrument Sans": { stack: `"Instrument Sans", system-ui, sans-serif`, google: "Instrument+Sans" },
    "SF Pro (system)": { stack: `-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif` },
}
const fontStack = (name: string) => (FONTS[name] ?? FONTS.Geist).stack

/** "#RRGGBB" + alpha → rgba() */
function alpha(hex: string, a: number) {
    let h = hex.replace("#", "")
    if (h.length === 3) h = h.split("").map((c) => c + c).join("")
    const n = parseInt(h.slice(0, 6), 16)
    if (Number.isNaN(n)) return hex
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

/* ------------------------------------------------------------------ */
/* Content types                                                       */
/* ------------------------------------------------------------------ */

export type AgentStatus = "active" | "idle"

export interface AgentTask {
    title: string
    /** Task progress, 0–100. Omit when the task hasn't started. */
    progress?: number
}

/**
 * One concrete subtask. `doing` shows while it runs or waits ("Editing src/app.ts"),
 * `done` once it has finished ("Edited src/app.ts"). A plain string is used for both.
 * Counting steps put {n} in `doing` and set `count`: "Running tests {n} of 48".
 */
/** `skill`: the agent skill this subtask runs with (shown as a chip in the chat) */
export type QueueStep =
    | string
    | {
          doing: string
          done: string
          count?: number
          skill?: string
          /** This subtask runs `npx skills add <install>`; its skills are usable once it's done */
          install?: string
      }

/** Something the user asked the agent, and the subtasks the agent split it into */
export interface AgentPrompt {
    id: string
    text: string
    steps: QueueStep[]
    /** The agent answered instead of working (e.g. the prompt didn't make sense) */
    reply?: string
    /** What the agent says once every subtask is done (written from the subtasks when left out) */
    summary?: string
}

export interface Agent {
    id: string
    name: string
    /** Full model name, e.g. "Claude Opus 5.5" */
    model: string
    /** Effort level shown after the model, e.g. "High" */
    effort?: string
    /** Share of the weekly limit this agent consumed, 0–100 */
    share: number
    status: AgentStatus
    /** Prompts so far, oldest first. Their subtasks, in order, are the agent's task list. */
    prompts?: AgentPrompt[]
    /** How many subtasks were already done when the card loaded */
    tasksDone?: number
    /** Progress (0–100) of the subtask that's running when the card loads */
    currentProgress?: number
    /** Speed multiplier (1 = normal, 2 = twice as fast) */
    speed?: number
    /** Always first in the list, whatever its share (for staged videos) */
    pinned?: boolean
    /** Agent skills it has installed, e.g. "emil-design-eng" (see SKILL_AUTHORS) */
    skills?: string[]
    /** Example prompts shown as chips above the chat input (defaults by role) */
    suggestions?: string[]
    /** Hand-written subtasks for prompts of its own (e.g. its `suggestions`), by prompt text */
    plans?: Record<string, QueueStep[]>
    /** Fallback lines for an agent without prompts */
    currentTask?: AgentTask
    secondaryLine?: string
}

function stepLabel(step: QueueStep, finished: boolean, progress = 0) {
    if (typeof step === "string") return step
    if (finished) return step.done
    if (!step.count) return step.doing
    const n = Math.min(step.count, Math.floor((progress / 100) * step.count))
    return step.doing.replace("{n}", String(n))
}

const step = (doing: string, done: string, count?: number): QueueStep =>
    count ? { doing, done, count } : { doing, done }

/** A subtask that runs with an agent skill */
const skillStep = (skill: string, doing: string, done: string, count?: number): QueueStep => ({
    ...(step(doing, done, count) as object),
    skill,
}) as QueueStep

/** Skill packages, installed with `npx skills add <source>` */
export const SKILL_SOURCES: Record<string, { label: string; skills: string[]; roles: RegExp }> = {
    "emilkowalski/skill": {
        label: "Emil Kowalski",
        skills: [
            "emil-design-eng",
            "animate",
            "review-animations",
            "improve-animations",
            "find-animation-opportunities",
            "animation-performance",
            "animation-vocabulary",
            "apple-design",
            "break-ui",
            "mobile-native",
            "animate-expo",
            "ask-sonner",
            "write-swift",
            "pick-ui-library",
            "prototype",
        ],
        roles: /code|dev|engineer|review|qa/,
    },
    "jakubkrehel/make-interfaces-feel-better": {
        label: "Jakub Krehel",
        skills: ["make-interfaces-feel-better"],
        roles: /code|dev|engineer/,
    },
}

const INSTALL_RE = /^npx\s+skills\s+add\s+(\S+)/i

const cleanSource = (src: string) => {
    const s = src.replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "")
    // Repo names aren't case-sensitive on GitHub
    return Object.keys(SKILL_SOURCES).find((k) => k.toLowerCase() === s.toLowerCase()) ?? s
}

/** Skills a package installs (known packages, or the repo's own name) */
export function skillsOfSource(src: string): string[] {
    const s = cleanSource(src)
    return SKILL_SOURCES[s]?.skills ?? [s.split("/").pop() || s]
}

/** Skills a `npx skills add` prompt installs */
export function skillsFromCommand(text: string): string[] {
    const m = text.trim().match(INSTALL_RE)
    return m ? skillsOfSource(m[1]) : []
}

/** Package a skill comes from */
const sourceOfSkill = (skill: string) => Object.keys(SKILL_SOURCES).find((k) => SKILL_SOURCES[k].skills.includes(skill))

/** The subtask that runs `npx skills add <src>` */
function installStep(src: string): QueueStep {
    const s = cleanSource(src)
    const n = skillsOfSource(s).length
    return {
        doing: `npx skills add ${s}`,
        done: n === 1 ? `Installed ${skillsOfSource(s)[0]}` : `Installed ${n} skills from ${s}`,
        install: s,
    }
}

/** Plan for a `npx skills add` prompt */
function installSteps(text: string): QueueStep[] | null {
    const m = text.trim().match(INSTALL_RE)
    if (!m) return null
    const n = skillsOfSource(m[1]).length
    return [installStep(m[1]), step("Reading the new skills", n === 1 ? "Ready to use" : `${n} skills ready to use`)]
}

/** Installed skills grouped by the library they came from */
export function skillLibraries(skills: string[]): { source: string; label: string; skills: string[] }[] {
    const out: { source: string; label: string; skills: string[] }[] = []
    for (const sk of skills) {
        const source = sourceOfSkill(sk) ?? sk
        let lib = out.find((l) => l.source === source)
        if (!lib) {
            lib = { source, label: SKILL_SOURCES[source]?.label ?? source.split("/").pop() ?? source, skills: [] }
            out.push(lib)
        }
        lib.skills.push(sk)
    }
    return out
}

/** Skills the agent can use after its first `done` subtasks (installed ones included) */
export function installedSkills(agent: Agent, done = Infinity): string[] {
    const out = [...(agent.skills ?? [])]
    stepsOf(agent)
        .slice(0, done)
        .forEach((st) => {
            if (typeof st === "object" && st.install)
                for (const sk of skillsOfSource(st.install)) if (!out.includes(sk)) out.push(sk)
        })
    return out
}

/** Who made each skill (shown on hover) */
export const SKILL_AUTHORS: Record<string, string> = {
    "emil-design-eng": "Emil Kowalski",
    animate: "Emil Kowalski",
    "review-animations": "Emil Kowalski",
    "break-ui": "Emil Kowalski",
    "make-interfaces-feel-better": "Jakub Krehel",
}

const prompt = (id: string, text: string, steps: QueueStep[], summary?: string): AgentPrompt => ({ id, text, steps, summary })

/** All subtasks of an agent, oldest prompt first */
export const stepsOf = (a: Agent): QueueStep[] => (a.prompts ?? []).flatMap((p) => p.steps)

/** Subtasks before the agent's latest prompt, i.e. where it starts when everything earlier is done */
export const stepsBeforeLast = (a: Agent): number => {
    // The latest prompt that has work in it (an answered-only prompt has none)
    const ps = (a.prompts ?? []).filter((p) => p.steps.length > 0)
    return ps.slice(0, -1).reduce((n, p) => n + p.steps.length, 0)
}

/**
 * Whether a prompt reads as an actual request rather than a keyboard mash
 * ("ijijijijii", "asdfgh", "xxxx"). Deliberately lenient: real requests can be
 * short or oddly phrased, so this only catches text that isn't made of words.
 */
export function looksLikeRequest(text: string): boolean {
    const t = text.trim()
    if (INSTALL_RE.test(t)) return true
    const words = t.toLowerCase().match(/[\p{L}]+/gu) ?? []
    if (words.join("").length < 3) return false
    const wordish = (w: string) => {
        if (/asdf|sdfg|qwer|wert|zxcv|xcvb|hjkl|uiop|ghjk/.test(w)) return false // runs along a keyboard row
        if (w.length <= 3) return /[aeiouy]/.test(w) || /^(a|i|ok|ui|ux|qa|pr|css|js|ts|api|db|id|url|svg|png)$/.test(w)
        const vowels = (w.match(/[aeiouy]/g) ?? []).length / w.length
        if (vowels < 0.15 || vowels > 0.8) return false
        if (/(.)\1\1/.test(w)) return false // the same letter three times
        if (/^(..?)\1{2,}/.test(w) || /(..)\1{2,}/.test(w)) return false // a short pattern on repeat ("ijijij")
        if (/[^aeiouy]{5,}/.test(w)) return false // five consonants in a row
        if (new Set(w).size / w.length < 0.35) return false // too few different letters
        return true
    }
    const good = words.filter(wordish).length
    return good >= Math.max(1, Math.ceil(words.length * 0.6))
}

/** What an agent says back to a prompt it can't make sense of */
export function nonsenseReply(hasSuggestion: boolean): string {
    return `I couldn't make sense of that, so I haven't started anything. Tell me what you'd like me to do${hasSuggestion ? ", or press Tab to use the suggestion below" : ""}.`
}

export const sampleAgents: Agent[] = [
    {
        id: "coder",
        name: "Coder",
        model: "Claude Opus 5.5",
        effort: "High",
        share: 24,
        status: "active",
        prompts: [
            prompt("c1", "Fix the flaky login test on Safari", [
                step("Reading test logs {n} of 6", "Read 6 test logs", 6),
                step("Looking for the race condition", "Found a race in useSession"),
                step("Editing src/auth/useSession.ts", "Edited src/auth/useSession.ts"),
                step("Running tests {n} of 24", "24 tests passed", 24),
            ], "The test failed when the session refreshed while it was still loading. useSession now waits for the refresh, and all 24 tests pass."),
            prompt("c2", "Add skeleton loading states to the dashboard", [
                step("Reading dashboard files {n} of 5", "Read 5 dashboard files", 5),
                // Installs skills mid-task, right before it needs them
                installStep("emilkowalski/skill"),
                skillStep("emil-design-eng", "Shaping the skeletons", "Skeletons match the final layout"),
                step("Adding Skeleton to Dashboard.tsx", "Added Skeleton to Dashboard.tsx"),
                skillStep("animate", "Tuning the shimmer", "Shimmer at 1.6s, linear, reduced-motion safe"),
                step("Checking contrast {n} of 3 themes", "Checked contrast on 3 themes", 3),
            ], "While the dashboard loads, skeletons now hold the shape of the final layout, with a 1.6s shimmer that stays still for reduced motion. Contrast holds up in all 3 themes."),
            prompt("c3", "Refactor the onboarding flow into reusable steps", [
                step("Reading files {n} of 12", "Read 12 files in src/onboarding", 12),
                step("Searching for step components", "Found 4 step components"),
                step("Planning the new structure", "Planned 3 reusable steps"),
                installStep("jakubkrehel/make-interfaces-feel-better"),
                skillStep("make-interfaces-feel-better", "Polishing the step transitions", "Smoothed 3 step transitions"),
                step("Editing src/onboarding/Flow.tsx", "Edited src/onboarding/Flow.tsx"),
                step("Extracting useStepState hook", "Extracted useStepState hook"),
                step("Updating imports {n} of 6", "Updated imports in 6 files", 6),
                step("Running tests {n} of 48", "48 tests passed", 48),
            ], "The onboarding flow is now 3 reusable steps that share a useStepState hook, with smoother transitions between them. Imports are updated in 6 files and all 48 tests pass."),
        ],
        // Earlier prompts are done; it starts on its latest one
        tasksDone: -1,
        currentProgress: 0,
        speed: 1.7,
    },
    {
        id: "researcher",
        name: "Researcher",
        model: "Claude Sonnet 5.5",
        effort: "Medium",
        share: 17,
        status: "active",
        prompts: [
            prompt("r1", "Summarize last week's user interviews", [
                step("Reading transcripts {n} of 8", "Read 8 interview transcripts", 8),
                step("Tagging quotes {n} of 46", "Tagged 46 quotes by theme", 46),
                step("Clustering pain points", "Found 6 pain points"),
                step("Writing research/interviews.md", "Wrote research/interviews.md"),
            ], "Across 8 interviews, 6 pain points came up again and again. I tagged 46 quotes by theme and wrote it all up in research/interviews.md."),
            prompt("r2", "Compare usage limits across 5 competitors", [
                step("Visiting pricing pages {n} of 5", "Visited 5 pricing pages", 5),
                step("Comparing plan tiers", "Compared 14 plan tiers"),
                step("Extracting usage limits per plan", "Extracted usage limits per plan"),
                step("Building comparison table", "Built comparison table"),
                step("Checking sources {n} of 9", "Cited 9 sources", 9),
                step("Writing research/limits.md", "Wrote research/limits.md"),
                step("Summarizing findings", "Summarized the findings"),
            ], "The usage limits of all 5 competitors now sit side by side in one table: 14 plan tiers, with 9 sources cited."),
        ],
        // Earlier prompts are done; it starts on its latest one
        tasksDone: -1,
        currentProgress: 0,
        speed: 0.95,
    },
    {
        id: "writer",
        name: "Writer",
        model: "Claude Sonnet 5.5",
        effort: "Medium",
        share: 10,
        status: "idle",
        prompts: [
            prompt("w1", "Draft the release notes for v2.4", [
                step("Reading merged PRs {n} of 18", "Read 18 merged PRs", 18),
                step("Grouping changes by area", "Grouped changes into 5 areas"),
                step("Writing docs/release-notes/v2.4.md", "Wrote docs/release-notes/v2.4.md"),
            ], "The v2.4 release notes cover 18 merged PRs, grouped into 5 areas, in docs/release-notes/v2.4.md."),
            prompt("w2", "Tighten the onboarding copy", [
                step("Reading onboarding screens {n} of 6", "Read 6 onboarding screens", 6),
                step("Rewriting strings {n} of 14", "Rewrote 14 strings", 14),
                step("Checking tone against the style guide", "Checked tone against the style guide"),
            ], "All 6 onboarding screens now match the tone of the style guide, with 14 strings rewritten."),
        ],
        tasksDone: 6,
    },
    {
        id: "reviewer",
        name: "Reviewer",
        model: "Claude Haiku 5.5",
        share: 7,
        status: "idle",
        prompts: [
            prompt("v1", "Review the checkout form PR (#218)", [
                step("Reading the diff {n} of 7 files", "Read the diff of 7 files", 7),
                step("Running checkout tests {n} of 12", "12 checkout tests passed", 12),
                installStep("emilkowalski/skill"),
                skillStep("break-ui", "Stress-testing the form", "Found 2 overflow bugs"),
                step("Leaving comments {n} of 3", "Left 3 comments on PR #218", 3),
                step("Approving with changes", "Approved PR #218 with changes"),
            ], "The diff looks good and all 12 checkout tests pass, but the form overflows in 2 places. I left 3 comments and approved PR #218 with changes."),
        ],
    },
]
// `tasksDone: -1` above means "start on the latest prompt"
for (const a of sampleAgents) if (a.tasksDone === -1) a.tasksDone = stepsBeforeLast(a)

const STOP_WORDS = new Set(
    "the a an and or for with into from this that these those our my your can could please add make fix update create write review check all some new about of to in on at by it is be we us me i just also more".split(
        " "
    )
)

/**
 * Splits a chat prompt into subtasks that fit the agent's role. Rule-based:
 * picks a subject from the prompt's own words and fills a role template.
 */
/**
 * Example prompts per kind of agent, each with a hand-written plan, so tapping a
 * chip gives a believable run. Picked to suit the model: heavy multi-file work for
 * Opus, reading and synthesis for Sonnet, quick focused checks for Haiku.
 */
const SUGGESTED: { role: RegExp; prompts: [string, QueueStep[]][] }[] = [
    {
        role: /code|dev|engineer/,
        prompts: [
            ["Add dark mode to the dashboard", [
                step("Reading theme files {n} of 9", "Read 9 theme files", 9),
                step("Adding dark tokens to src/theme/tokens.ts", "Added 34 dark tokens"),
                step("Updating components {n} of 21", "Updated 21 components", 21),
                skillStep("make-interfaces-feel-better", "Polishing borders and shadows", "Softened 6 borders and shadows"),
                step("Checking contrast {n} of 3 themes", "Contrast passes in 3 themes", 3),
                step("Running tests {n} of 52", "52 tests passed", 52),
            ]],
            ["Fix the flaky checkout test", [
                step("Running checkout.spec.ts {n} of 20 times", "Reproduced 3 failures in 20 runs", 20),
                step("Tracing the payment mock", "Found a race in the payment mock"),
                step("Editing tests/checkout.spec.ts", "Awaited the mock before submit"),
                step("Re-running {n} of 50 times", "Passed 50 runs in a row", 50),
            ]],
            ["Polish the modal open animation", [
                step("Reading src/components/Modal.tsx", "Read src/components/Modal.tsx"),
                skillStep("animate", "Planning the motion", "200ms ease-out, from scale 0.96"),
                step("Editing src/components/Modal.tsx", "Edited src/components/Modal.tsx"),
                skillStep("emil-design-eng", "Checking the details", "Added a reduced-motion fallback"),
                step("Running tests {n} of 31", "31 tests passed", 31),
            ]],
            ["Add a command palette", [
                step("Reading the routes {n} of 14", "Read 14 routes", 14),
                step("Writing src/components/CommandPalette.tsx", "Wrote CommandPalette.tsx"),
                skillStep("emil-design-eng", "Keeping it instant to open", "No open animation, as it should be"),
                step("Wiring ⌘K", "Wired ⌘K"),
                step("Running tests {n} of 18", "18 tests passed", 18),
            ]],
            ["Make the toasts stack and swipe away", [
                step("Reading src/components/Toast.tsx", "Read Toast.tsx"),
                skillStep("animate", "Planning the stack motion", "Spring stack, swipe to dismiss"),
                step("Editing src/components/Toast.tsx", "Edited Toast.tsx"),
                skillStep("review-animations", "Reviewing the motion", "Interruptible, no jumps"),
                step("Running tests {n} of 12", "12 tests passed", 12),
            ]],
            ["Speed up the dashboard first load", [
                step("Profiling the first load", "First load takes 3.4s"),
                step("Splitting bundles {n} of 6", "Split 6 bundles", 6),
                step("Lazy-loading the charts", "Lazy-loaded 4 charts"),
                step("Measuring again", "Now 1.6s (−53%)"),
            ]],
            ["Add empty states to all tables", [
                step("Finding tables {n} of 9", "Found 9 tables", 9),
                skillStep("make-interfaces-feel-better", "Designing the empty states", "One calm pattern for all 9"),
                step("Editing components {n} of 9", "Edited 9 components", 9),
                step("Running tests {n} of 27", "27 tests passed", 27),
            ]],
            ["Fix layout shift on the pricing page", [
                step("Recording layout shifts", "CLS is 0.21"),
                step("Reserving space for images {n} of 7", "Reserved space for 7 images", 7),
                step("Preloading the heading font", "Preloaded Geist"),
                step("Measuring again", "CLS is now 0.01"),
            ]],
        ],
    },
    {
        role: /research/,
        prompts: [
            ["Summarize this week's support tickets", [
                step("Reading tickets {n} of 64", "Read 64 tickets", 64),
                step("Grouping by topic", "Grouped into 7 topics"),
                step("Ranking by how often they come up", "Billing questions are #1"),
                step("Writing research/support-week-43.md", "Wrote research/support-week-43.md"),
            ]],
            ["Compare onboarding of 4 competitors", [
                step("Signing up for products {n} of 4", "Signed up for 4 products", 4),
                step("Capturing onboarding screens {n} of 37", "Captured 37 screens", 37),
                step("Comparing steps to first value", "Fastest: 3 steps, slowest: 9"),
                step("Writing research/onboarding.md", "Wrote research/onboarding.md"),
            ]],
            ["Find what users say about pricing", [
                step("Searching reviews and forums {n} of 12", "Searched 12 sources", 12),
                step("Collecting quotes {n} of 40", "Collected 40 quotes", 40),
                step("Tagging sentiment", "62% positive, 23% confused"),
                step("Writing research/pricing-voices.md", "Wrote research/pricing-voices.md"),
            ]],
            ["Why do trial users churn in week one?", [
                step("Reading churn survey answers {n} of 112", "Read 112 answers", 112),
                step("Comparing with product events", "Matched 87 users to their events"),
                step("Finding the drop-off point", "Most leave before inviting a teammate"),
                step("Writing research/week-one-churn.md", "Wrote research/week-one-churn.md"),
            ]],
            ["Collect best practices for empty states", [
                step("Searching articles and talks {n} of 15", "Found 15 sources", 15),
                step("Capturing examples {n} of 24", "Captured 24 examples", 24),
                step("Sorting into patterns", "Found 5 patterns"),
                step("Writing research/empty-states.md", "Wrote research/empty-states.md"),
            ]],
            ["How do competitors explain usage limits?", [
                step("Reading help pages {n} of 6", "Read 6 help pages", 6),
                step("Comparing wording", "3 use percentages, 3 use credits"),
                step("Writing research/limit-wording.md", "Wrote research/limit-wording.md"),
            ]],
            ["Summarize the latest accessibility guidelines", [
                step("Reading the guidelines", "Read the guidelines"),
                step("Listing what changed {n} of 9", "Listed 9 changes", 9),
                step("Writing research/a11y-changes.md", "Wrote research/a11y-changes.md"),
            ]],
        ],
    },
    {
        role: /writ|copy|doc/,
        prompts: [
            ["Draft the changelog for v2.5", [
                step("Reading merged PRs {n} of 23", "Read 23 merged PRs", 23),
                step("Grouping into features and fixes", "6 features, 11 fixes"),
                step("Writing docs/changelog/v2.5.md", "Wrote docs/changelog/v2.5.md"),
                step("Editing for tone", "Edited for tone"),
            ]],
            ["Write a launch thread for dark mode", [
                step("Reading the dark mode PR", "Read the dark mode PR"),
                step("Drafting posts {n} of 5", "Drafted 5 posts", 5),
                step("Tightening the hook", "Tightened the hook"),
            ]],
            ["Rewrite the pricing page intro", [
                step("Reading the current page", "Read the current page"),
                step("Drafting options {n} of 3", "Drafted 3 options", 3),
                step("Checking against the style guide", "Checked against the style guide"),
            ]],
            ["Write the empty state copy for search", [
                step("Reading the search screens {n} of 3", "Read 3 search screens", 3),
                step("Drafting options {n} of 4", "Drafted 4 options", 4),
                step("Picking the clearest", "Picked the clearest"),
            ]],
            ["Turn the research into a blog post", [
                step("Reading research/onboarding.md", "Read research/onboarding.md"),
                step("Outlining the post", "Outlined 5 sections"),
                step("Drafting docs/blog/onboarding.md", "Drafted 1,200 words"),
                step("Editing for tone", "Edited for tone"),
            ]],
            ["Write error messages for the payment form", [
                step("Listing payment errors {n} of 11", "Listed 11 errors", 11),
                step("Rewriting messages {n} of 11", "Rewrote 11 messages", 11),
                step("Checking against the style guide", "Checked against the style guide"),
            ]],
            ["Draft the onboarding welcome email", [
                step("Reading the onboarding flow", "Read the onboarding flow"),
                step("Drafting subject lines {n} of 5", "Drafted 5 subject lines", 5),
                step("Writing the email", "Wrote the email"),
            ]],
        ],
    },
    {
        role: /review|qa/,
        prompts: [
            ["Review the animations in PR #231", [
                step("Reading the diff {n} of 9 files", "Read the diff of 9 files", 9),
                skillStep("review-animations", "Reviewing the motion", "Found 3 issues"),
                step("Leaving comments {n} of 3", "Left 3 comments", 3),
            ]],
            ["Check the settings page for UI polish", [
                step("Reading settings screens {n} of 4", "Read 4 settings screens", 4),
                skillStep("emil-design-eng", "Checking the details", "2 controls feel unfinished"),
                step("Writing the report", "Wrote the report"),
            ]],
            ["Break the signup form with worst-case data", [
                skillStep("break-ui", "Feeding worst-case data {n} of 12", "Tried 12 worst cases", 12),
                step("Checking what broke", "4 layouts broke"),
                step("Writing fixes for each", "Wrote 4 fixes"),
            ]],
            ["Review the toast component", [
                step("Reading src/components/Toast.tsx", "Read Toast.tsx"),
                skillStep("review-animations", "Reviewing the motion", "Found 2 issues"),
                step("Leaving comments {n} of 2", "Left 2 comments", 2),
            ]],
            ["Check the dashboard on small screens", [
                step("Rendering at widths {n} of 5", "Rendered at 5 widths", 5),
                skillStep("break-ui", "Trying long names and big numbers", "3 cards overflow"),
                step("Writing the report", "Wrote the report"),
            ]],
            ["Review PR #240 for accessibility", [
                step("Reading the diff {n} of 6 files", "Read the diff of 6 files", 6),
                step("Checking labels and focus", "Found 1 missing label"),
                step("Leaving comments {n} of 2", "Left 2 comments", 2),
            ]],
            ["Find animation opportunities in the onboarding", [
                step("Reading onboarding screens {n} of 6", "Read 6 screens", 6),
                skillStep("find-animation-opportunities", "Looking for missing motion", "3 places could use motion"),
                step("Writing the report", "Wrote the report"),
            ]],
        ],
    },
]

const roleOf = (agent: Agent) => `${agent.id} ${agent.name}`.toLowerCase()

/** Example prompts for this agent: its own, or the defaults for its role */
export function suggestionsFor(agent: Agent, have: Set<string> = new Set(installedSkills(agent))): string[] {
    if (agent.suggestions) return agent.suggestions
    const role = roleOf(agent)
    // Skill packages that suit this agent and aren't installed yet come first
    const installs = Object.entries(SKILL_SOURCES)
        .filter(([, src]) => src.roles.test(role) && src.skills.some((sk) => !have.has(sk)))
        .map(([name]) => `npx skills add ${name}`)
    const group = SUGGESTED.find((g) => g.role.test(role))
    const prompts = group ? group.prompts : []
    const usesSkill = ([, steps]: [string, QueueStep[]]) => steps.some((st) => typeof st === "object" && !!st.skill)
    // Prompts that put a skill to work come before plain ones
    return [...installs, ...prompts.filter(usesSkill).map(([t]) => t), ...prompts.filter((x) => !usesSkill(x)).map(([t]) => t)]
}

export function generateSteps(agent: Agent, text: string): QueueStep[] {
    const install = installSteps(text)
    if (install) return install
    const plan = planFor(agent, text).steps
    // A skill the agent doesn't have yet gets installed first, mid-task
    const have = new Set(installedSkills(agent))
    const out: QueueStep[] = []
    for (const st of plan) {
        const sk = typeof st === "object" ? st.skill : undefined
        const src = sk && !have.has(sk) ? sourceOfSkill(sk) : undefined
        if (src) {
            out.push(installStep(src))
            skillsOfSource(src).forEach((x) => have.add(x))
        }
        out.push(st)
    }
    return out
}

/** What an agent says when a typed prompt is done (undefined: written from its subtasks) */
export function generateSummary(agent: Agent, text: string): string | undefined {
    return installSteps(text) ? undefined : planFor(agent, text).summary
}

function planFor(agent: Agent, text: string): { steps: QueueStep[]; summary?: string } {
    const own = agent.plans && Object.entries(agent.plans).find(([t]) => t.toLowerCase() === text.trim().toLowerCase())
    if (own) return { steps: own[1] }
    // A suggested prompt gets its hand-written plan
    for (const g of SUGGESTED) {
        const hit = g.prompts.find(([t]) => t.toLowerCase() === text.trim().toLowerCase())
        if (hit) return { steps: hit[1] }
    }
    const rand = mulberry32(hashString(agent.id + text))
    const between = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1))
    const words = text
        .replace(/[^\p{L}\p{N}\s-]/gu, " ")
        .split(/\s+/)
        .filter((w, i) => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()) && !(i === 0 && VERBS.has(w.toLowerCase())))
    const key = words.slice(0, 2)
    const pascal = key.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join("") || "Feature"
    const kebab = key.map((w) => w.toLowerCase()).join("-") || "notes"
    let subject = text.trim().replace(/[.!?]+$/, "")
    // "Draft a welcome email" → "a welcome email", so steps read "Outlined a welcome email"
    const [verb, ...object] = subject.split(/\s+/)
    if (verb && VERBS.has(verb.toLowerCase()) && object.length) subject = object.join(" ")
    subject = subject[0] ? subject[0].toLowerCase() + subject.slice(1) : "the task"
    if (subject.length > 30) subject = subject.slice(0, 30).replace(/\s+\S*$/, "") + "…"

    const role = `${agent.id} ${agent.name}`.toLowerCase()
    // UI or motion work uses one of the agent's skills
    // Typed UI or motion work uses a fitting skill (installed first if needed)
    const has = (sk: string) => installedSkills(agent).includes(sk) || !!sourceOfSkill(sk)
    const motion = /animat|motion|transition|hover|spring|ease/i.test(text)
    const ui = /ui|design|page|screen|button|modal|layout|card|form|polish|style|spacing|dark mode/i.test(text)

    if (/code|dev|engineer/.test(role)) {
        const files = between(4, 14)
        const tests = between(8, 60)
        const sk = motion && has("animate") ? "animate" : ui && has("emil-design-eng") ? "emil-design-eng" : null
        const how = sk === "animate" ? ", with the motion planned using the animate skill" : sk ? `, polished with the ${sk} skill` : ""
        return {
            steps: [
                step(`Reading files {n} of ${files}`, `Read ${files} files`, files),
                step(`Planning changes to ${pascal}`, `Planned changes to ${pascal}`),
                ...(sk ? [skillStep(sk, sk === "animate" ? "Planning the motion" : "Polishing the interface", sk === "animate" ? "Planned the motion" : "Polished the interface")] : []),
                step(`Editing src/${pascal}.tsx`, `Edited src/${pascal}.tsx`),
                step(`Running tests {n} of ${tests}`, `${tests} tests passed`, tests),
            ],
            summary: `That's in. The change lives in src/${pascal}.tsx${how}, and all ${tests} tests pass.`,
        }
    }
    if (/research/.test(role)) {
        const sources = between(5, 14)
        const points = between(4, 9)
        return {
            steps: [
                step(`Searching sources {n} of ${sources}`, `Found ${sources} sources`, sources),
                step(`Reading about ${subject}`, `Read about ${subject}`),
                step("Extracting key points", `Extracted ${points} key points`),
                step(`Writing research/${kebab}.md`, `Wrote research/${kebab}.md`),
            ],
            summary: `Out of ${sources} sources, ${points} points matter most. The write-up is in research/${kebab}.md.`,
        }
    }
    if (/writ|copy|doc/.test(role)) {
        const links = between(3, 12)
        return {
            steps: [
                step(`Outlining ${subject}`, `Outlined ${subject}`),
                step(`Drafting docs/${kebab}.md`, `Drafted docs/${kebab}.md`),
                step("Editing for tone", "Edited for tone"),
                step(`Checking links {n} of ${links}`, `Checked ${links} links`, links),
            ],
            summary: `The draft is ready in docs/${kebab}.md. I edited it for tone and all ${links} links work.`,
        }
    }
    if (/review|qa/.test(role)) {
        const files = between(3, 15)
        const comments = between(1, 6)
        const sk = motion && has("review-animations") ? "review-animations" : ui && has("emil-design-eng") ? "emil-design-eng" : null
        return {
            steps: [
                step(`Reading the diff {n} of ${files} files`, `Read the diff of ${files} files`, files),
                sk ? skillStep(sk, `Checking ${subject}`, `Checked ${subject}`) : step(`Checking ${subject}`, `Checked ${subject}`),
                step(`Leaving comments {n} of ${comments}`, `Left ${comments} comments`, comments),
            ],
            summary: `The diff across ${files} files is reviewed${sk ? ` with the ${sk} skill` : ""}, with ${comments} comment${comments === 1 ? "" : "s"} where something needs a look.`,
        }
    }
    return {
        steps: [
            step(`Thinking about ${subject}`, `Planned ${subject}`),
            step(`Working on ${subject}`, `Finished ${subject}`),
            step("Checking the result", "Checked the result"),
        ],
        summary: "That's done, and I checked the result.",
    }
}

export interface CardContent {
    /** Percentage of the weekly limit used, 0–100 */
    used: number
    /** Projected percentage at reset, based on current pace */
    projected: number
    daysUntilReset: number
    agents: Agent[]
}

export const DEFAULT_CONTENT: CardContent = { used: 58, projected: 81, daysUntilReset: 2, agents: sampleAgents }

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function omit<T extends Record<string, unknown>>(o: T, k: string): T {
    const { [k]: _, ...rest } = o
    return rest as T
}

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n))

const prefersReducedMotion = () =>
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

/** Figma's "trim to cap height" text, so spacing matches the frame */
const trimmed = {
    lineHeight: "normal",
    textBoxTrim: "trim-both",
    textBoxEdge: "cap alphabetic",
    whiteSpace: "nowrap",
} as CSSProperties

function tx(d: Design, size: number, weight = 400, color = d.text): CSSProperties {
    return { ...trimmed, fontSize: ut(size), fontWeight: weight, color, letterSpacing: `${d.tracking}em` }
}

/* overflow-x: clip (not hidden) so descenders below the trimmed text box stay visible */
const ellipsis: CSSProperties = { overflowX: "clip", overflowY: "visible", textOverflow: "ellipsis", minWidth: 0 }

/** Counts smoothly from the previous value to `target` (ease-out cubic) */
function useAnimatedNumber(target: number, duration: number, fromZero = true) {
    // fromZero = false: show the value straight away, only animate later changes
    const [value, setValue] = useState(fromZero ? 0 : target)
    const current = useRef(fromZero ? 0 : target)

    useEffect(() => {
        if (prefersReducedMotion() || duration <= 0) {
            current.current = target
            setValue(target)
            return
        }
        const from = current.current
        const start = performance.now()
        let raf = 0
        const tick = (now: number) => {
            const p = Math.min(1, (now - start) / duration)
            const eased = 1 - Math.pow(1 - p, 3)
            current.current = from + (target - from) * eased
            setValue(current.current)
            if (p < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [target, duration])

    return value
}

/** Font import + shimmer sweeping left → right through the active task */
function cardCss(d: Design) {
    const google = FONTS[d.fontFamily]?.google
    const base = alpha(d.text, d.shimmerBase)
    return `
${google ? `@import url("https://fonts.googleapis.com/css2?family=${google}:wght@300;400;500;600;700&display=swap");` : ""}
@keyframes wuc-spin { to { transform: rotate(360deg); } }
@keyframes wuc-in { from { opacity: 0; transform: translateY(calc(1.6 * var(--s, 3px))); } }
@keyframes wuc-in-fade { from { opacity: 0; } }
@keyframes wuc-out-fade { to { opacity: 0; } }
@keyframes wuc-in-rise { from { opacity: 0; transform: translateY(calc(2.5 * var(--s, 3px))); } }
@keyframes wuc-pop { from { opacity: 0; transform: scale(0.96) translateY(-2px); } }
@keyframes wuc-chip-in { from { opacity: 0; transform: scale(0.94); filter: blur(2px); } }
.wuc-tile:focus-visible { outline: 2px solid ${alpha(d.text, 0.5)}; outline-offset: 2px; }
/* focus-visible: one 3:1 ring (50% black, #808080) for every control */
.wuc-close:focus-visible, .wuc-send:focus-visible, .wuc-file:focus-visible { outline: 2px solid ${alpha(d.text, 0.5)}; outline-offset: 2px; }
/* The chat input has no outline of its own: its field shows focus instead, but only when
   reached with the keyboard (Tab), not when it's focused automatically on opening */
.wuc-composer { transition: border-color ${d.hoverMs}ms ease, box-shadow ${d.hoverMs}ms ease; }
.wuc-composer[data-kbd]:has(.wuc-input:focus) { border-color: ${alpha(d.text, 0.6)}; box-shadow: 0 0 0 1px ${alpha(d.text, 0.6)}; }
/* touch-target: small chips get an invisible 24px-tall hit area */
.wuc-hit { position: relative; }
.wuc-hit::after { content: ""; position: absolute; inset: -4px -2px; }
/* A wider grab area for the thin scrollbar */
.wuc-thumb { position: relative; }
.wuc-thumb::after { content: ""; position: absolute; inset: 0 -6px; }
.wuc-tile {
    background-color: var(--wuc-tile-bg);
    border-color: var(--wuc-tile-border);
    transition: background-color ${d.hoverMs}ms ease, border-color ${d.hoverMs}ms ease;
}
/* touch-target: the close circle stays as designed, its hit area grows to 40px around it */
.wuc-close { position: relative; }
.wuc-close::after { content: ""; position: absolute; inset: min(0px, calc((100% - 40px) / 2)); border-radius: 50%; }
.wuc-close {
    background-color: ${d.closeBg};
    color: ${d.closeIconColor};
    transition: background-color ${d.hoverMs}ms ease, color ${d.hoverMs}ms ease, transform 150ms cubic-bezier(0.2, 0, 0, 1);
}
.wuc-close:active { transform: scale(${d.closePressScale}); transition-duration: ${d.hoverMs}ms, ${d.hoverMs}ms, 100ms; }
/* Hover only on devices with a mouse, so it doesn't stick after a tap */
@media (hover: hover) {
    ${d.tileHover ? `.wuc-tile:not([data-open]):hover { background-color: ${d.tileHoverBg}; border-color: ${d.tileHoverBorder}; }` : ""}
    .wuc-close:hover { background-color: ${d.closeHoverBg}; color: ${d.closeHoverIconColor}; }
    .wuc-chip:hover { background-color: ${d.suggestionHoverBg}; }
}
.wuc-chip { background-color: ${d.suggestionBg}; transition: background-color ${d.hoverMs}ms ease; }
.wuc-fold { color: ${alpha(d.text, Math.min(1, d.mutedOpacity + 0.15))}; transition: color ${d.hoverMs}ms ease; }
@media (hover: hover) { .wuc-fold:hover { color: ${d.text}; } }
.wuc-fold:focus-visible { outline: 2px solid ${alpha(d.text, 0.5)}; outline-offset: 2px; border-radius: 4px; }
.wuc-chip:focus-visible { outline: 2px solid ${alpha(d.text, 0.5)}; outline-offset: 1px; }
.wuc-scroll { scrollbar-width: none; }
.wuc-thumb { transition: filter 150ms ease; }
.wuc-file { background-color: ${d.card}; transition: background-color ${d.hoverMs}ms ease; }
@media (hover: hover) { .wuc-file:hover { background-color: ${d.fileHoverBg}; } }
@media (hover: hover) { .wuc-thumb:hover { filter: brightness(0.6); } }
.wuc-thumb:active { filter: brightness(0.6); }
.wuc-scroll::-webkit-scrollbar { display: none; }
.wuc-input::placeholder { color: ${alpha(d.text, d.labelOpacity)}; }
.wuc-thread { scrollbar-width: none; }
.wuc-thread::-webkit-scrollbar { display: none; }
@keyframes wuc-shimmer {
    from { background-position: 120% 0; }
    to   { background-position: -20% 0; }
}
.wuc-shimmer {
    background-image: linear-gradient(90deg, ${base} 0%, ${base} 38%, ${d.text} 50%, ${base} 62%, ${base} 100%);
    background-size: 250% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: wuc-shimmer ${Math.max(100, d.shimmerMs)}ms linear infinite;
}
@media (prefers-reduced-motion: reduce) {
    .wuc-shimmer { animation: none; background: none; color: ${base}; }
}
`
}

/** A colour pasted without its "#" ("FDFCFC") is invalid CSS and renders as nothing: add it back */
function fixHexColors(design: Partial<Design> | undefined): Partial<Design> {
    const out: Record<string, unknown> = { ...(design ?? {}) }
    for (const [k, v] of Object.entries(out)) {
        const def = (DEFAULT_DESIGN as unknown as Record<string, unknown>)[k]
        if (typeof v === "string" && typeof def === "string" && def.startsWith("#") && /^([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v)) out[k] = `#${v}`
    }
    return out as Partial<Design>
}

/**
 * Values from the ordinary-interfaces review, applied on top of the design when
 * `a11yFixes` is on (the Before / After toggle). Each line notes the rule it fixes.
 */
function withFixes(d: Design): Design {
    if (!d.a11yFixes) return d
    // (Corner radii are left as designed: the concentric-radius change was tried and not kept)
    return {
        ...d,
        // wcag-contrast: 0.54 black on white is #767676, 4.54:1
        mutedOpacity: Math.max(d.mutedOpacity, 0.54),
        labelOpacity: Math.max(d.labelOpacity, 0.54),
        shimmerBase: Math.max(d.shimmerBase, 0.54),
        // wcag-contrast: "/ 9" on the #F0F0F0 chip, #6D6D6D is 4.54:1
        counterTotalOpacity: Math.max(d.counterTotalOpacity, 0.58),
        // device-verb: "Click" doesn't fit touch
        readyHint: d.readyHint.replace(/^Click to give/, "Give"),
    }
}

/** wcag-contrast: the pace text in a green dark enough to read (the bar keeps the bright green) */
const paceTextColor = (d: Design, color: string) =>
    d.a11yFixes && !d.paceMatchesBar && color.toUpperCase() === "#2FBB2D" ? "#228821" : color

/** True when the most recent key was Tab: focus that follows came from the keyboard */
let lastKeyWasTab = false
if (typeof window !== "undefined") {
    window.addEventListener("keydown", (e) => (lastKeyWasTab = e.key === "Tab"), true)
    window.addEventListener("pointerdown", () => (lastKeyWasTab = false), true)
}

function getPace(d: Design, used: number, projected: number) {
    if (used >= 100) return { label: "Limit reached", color: d.red }
    if (projected >= 100) return { label: "On pace to hit the limit", color: d.red }
    const label = d.paceText.replace("{p}", String(Math.round(projected)))
    if (projected >= d.paceWarnAt) return { label, color: d.amber }
    return { label, color: d.green }
}

function getResetLabel(d: Design, days: number) {
    if (days <= 0) return "Reset today"
    if (days === 1) return "Reset tomorrow"
    return d.resetText.replace("{d}", String(days))
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

function Percent({
    value,
    size,
    unitSize,
    weight,
    tracking,
}: {
    value: number
    size: number
    unitSize: number
    weight: number
    tracking?: number
}) {
    const d = useD()
    return (
        <span
            style={{
                ...trimmed,
                fontSize: ut(size),
                fontWeight: weight,
                letterSpacing: `${tracking ?? d.tracking}em`,
                fontVariantNumeric: "tabular-nums",
            }}
        >
            {Math.round(useAnimatedNumber(value, d.bigCountMs, false))}
            <span style={{ fontSize: ut(unitSize) }}>%</span>
        </span>
    )
}

function AnimatedPercent({ value }: { value: number }) {
    return <>{Math.round(useAnimatedNumber(value, 700, false))}%</>
}

function StripeBar({ value, color }: { value: number; color: string }) {
    const d = useD()
    const segments = Math.max(1, Math.round(d.segments))
    const filled = Math.round((clamp(value) / 100) * segments)

    // Lay stripes out on whole pixels: equal integer widths at integer offsets.
    // Fractional positions make the browser draw a mix of e.g. 3px and 4px bars.
    const ref = useRef<HTMLDivElement>(null)
    const [width, setWidth] = useState(0)
    useLayoutEffect(() => {
        const el = ref.current
        if (!el) return
        // layout width, not getBoundingClientRect: that's the on-screen size, smaller than the
        // bar itself wherever a parent is scaled down (the site's carousel), so the stripes stopped short
        const measure = () => setWidth(el.offsetWidth)
        measure()
        const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null
        ro?.observe(el)
        return () => ro?.disconnect()
    }, [])

    const barUnits = Math.max(1, d.cardWidth - 2 * d.cardPadding)
    const span = Math.floor(width)
    const stripe = Math.max(1, Math.round((span / barUnits) * d.stripeWidth) + Math.round(d.stripeAdjust))
    const stepPx = segments > 1 ? (span - stripe) / (segments - 1) : 0

    return (
        <div
            ref={ref}
            role="meter"
            aria-label="Weekly usage"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(value)}
            style={
                width
                    ? { position: "relative", height: u(d.barHeight), width: "100%" }
                    : { display: "flex", justifyContent: "space-between", height: u(d.barHeight), width: "100%" }
            }
        >
            {Array.from({ length: segments }, (_, i) => (
                <span
                    key={i}
                    style={{
                        ...(width
                            ? { position: "absolute", top: 0, bottom: 0, left: Math.round(i * stepPx), width: stripe }
                            : { width: u(d.stripeWidth), flexShrink: 0 }),
                        borderRadius: u(d.stripeRadius),
                        background: i < filled ? color : d.barTrack,
                    }}
                />
            ))}
        </div>
    )
}

/** Claude mark, shown next to the model name when enabled. Override via the `modelIcon` prop. */
function ClaudeIcon() {
    const d = useD()
    return (
        <svg width="100%" height="100%" viewBox="0 0 24 24" fill={d.iconColor} role="img" aria-label="Claude">
            <path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" />
        </svg>
    )
}

function ModelLabel({ label, effort, share }: { label: string; effort?: string; share?: number }) {
    const d = useD()
    const muted = alpha(d.text, d.mutedOpacity)
    return (
        <span style={{ ...tx(d, d.modelSize), maxWidth: "100%", ...ellipsis }}>
            {label}
            {effort && <span style={{ color: muted, marginLeft: u(d.effortGap) }}>{effort}</span>}
            {share !== undefined && (
                <span style={{ color: muted, marginLeft: u(d.effortGap), fontVariantNumeric: "tabular-nums" }}>
                    {/* Same gap on both sides of the dot as between model and effort */}
                    <span style={{ marginRight: u(d.effortGap) }}>·</span>
                    <ShareText value={share} />
                </span>
            )}
        </span>
    )
}

/** "24% of usage", counting smoothly when the share changes */
function ShareText({ value }: { value: number }) {
    const d = useD()
    const n = Math.round(useAnimatedNumber(value, d.bigCountMs, false))
    return <>{d.shareLabel.replace("{p}", String(n))}</>
}

/**
 * Spinning ring while the agent works. When its tasks are done the ring closes into
 * a full circle and a checkmark draws inside it; when work resumes it reverses.
 */
function Loader({ done, size, pending = false }: { done: boolean; size?: number; pending?: boolean }) {
    const d = useD()
    const reduce = prefersReducedMotion()
    const ease = EASE_OUT
    const ms = reduce ? 0 : d.checkMs
    const px = u(size ?? d.loaderSize)
    // Two layers: the ring spins inside a plain HTML element (a transform animation the browser
    // runs off the main thread; it doesn't do that for SVG elements), so it keeps turning while
    // the page is busy, e.g. while an agent opens or closes. The check draws on top, unrotated.
    return (
        <span role="img" aria-label={done ? "Done" : pending ? "To do" : "Working"} style={{ position: "relative", display: "flex", width: px, height: px, flexShrink: 0 }}>
            <span
                aria-hidden="true"
                className="wuc-spinner"
                style={{
                    position: "absolute",
                    inset: 0,
                    display: "block",
                    animation: reduce ? "none" : `wuc-spin ${d.loaderSpeedMs}ms linear infinite`,
                    // Paused, not removed: the closed ring keeps its angle, so nothing jumps
                    animationPlayState: done || pending ? "paused" : "running",
                    willChange: "transform",
                }}
            >
            <svg viewBox="0 0 24 24" style={{ display: "block", width: "100%", height: "100%", overflow: "visible" }}>
                <circle
                    cx="12"
                    cy="12"
                    r="9.5"
                    fill="none"
                    // Pending: a full faint ring, which opens into the arc and starts turning
                    stroke={pending ? alpha(d.text, 0.2) : d.loaderColor}
                    strokeWidth={d.loaderStroke}
                    strokeLinecap="round"
                    pathLength={100}
                    strokeDasharray={done || pending ? "100 0" : "72 28"}
                    style={{ transition: `stroke-dasharray ${ms}ms ${ease}, stroke ${ms}ms ${ease}` }}
                />
            </svg>
            </span>
            <svg viewBox="0 0 24 24" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
                <path
                    d="M7.6 12.4 L10.6 15.3 L16.4 9.2"
                    fill="none"
                    stroke={d.loaderColor}
                    strokeWidth={d.loaderStroke}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pathLength={100}
                    strokeDasharray="100"
                    strokeDashoffset={done ? 0 : 100}
                    // Hidden until it starts drawing: with round caps an "undrawn" line still shows as a dot
                    opacity={done ? 1 : 0}
                    style={{
                        transition: done
                            ? `stroke-dashoffset ${ms}ms ${ease} ${ms * 0.6}ms, opacity 0s linear ${ms * 0.6}ms`
                            : `stroke-dashoffset ${ms}ms ${ease}, opacity 0s linear ${ms}ms`,
                    }}
                />
            </svg>
        </span>
    )
}

/** Context window per model (sample sizes): bigger models get more room */
function contextLimit(model: string): number {
    const m = model.toLowerCase()
    if (m.includes("opus")) return 1_000_000
    if (m.includes("sonnet")) return 400_000
    return 200_000
}

/**
 * How much of its context window an agent has used: a starting amount (its instructions
 * and the files it opened), plus a share for every prompt and every finished task.
 * Never quite full; a real agent would compact before that.
 */
function contextUsed(agent: Agent, done: number, growth = 1): number {
    const limit = contextLimit(agent.model)
    const rand = mulberry32(hashString(agent.id + "ctx"))
    const base = limit * (0.08 + rand() * 0.14)
    // `growth` scales how fast it fills (1: about 1% of the window per prompt, plus ~0.4% per task)
    const perPrompt = limit * 0.01 * growth
    const perTask = limit * (0.0027 + rand() * 0.0027) * growth
    const prompts = (agent.prompts ?? []).length
    return Math.min(limit * 0.94, base + prompts * perPrompt + done * perTask)
}

/** 120000 → "120k", 1000000 → "1M" */
function formatTokens(n: number): string {
    if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
    return `${Math.round(n / 1000)}k`
}

function ContextCounter({ used, limit }: { used: number; limit: number }) {
    const d = useD()
    // Close to full: the agent will soon have to compact or start a fresh chat
    const nearFull = used / limit >= 0.8
    return (
        <span
            title={`Context: ${formatTokens(used)} of ${formatTokens(limit)} tokens`}
            style={{
                display: "inline-flex",
                alignItems: "center",
                // Plain text: no padding vertically either, so it lines up with the name
                padding: d.contextChipBg ? `${u(d.counterPadY)} ${u(d.counterPadX)}` : `${u(d.counterPadY)} 0`,
                borderRadius: u(d.counterRadius),
                background: d.contextChipBg ? d.counterBg : "transparent",
                minWidth: 0,
                maxWidth: "100%",
            }}
        >
            <span
                style={{
                    ...tx(d, d.promptChipSize),
                    fontVariantNumeric: "tabular-nums",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                    color: nearFull ? d.amber : d.text,
                    transition: `color 200ms ${EASE_OUT}`,
                }}
            >
                {formatTokens(used)}
                <span style={{ color: nearFull ? d.amber : alpha(d.text, d.counterTotalOpacity), transition: `color 200ms ${EASE_OUT}` }}>
                    {" "}/ {formatTokens(limit)}
                </span>
            </span>
        </span>
    )
}

/** Small number chip, styled like the task counter */
function CountChip({ value }: { value: number }) {
    const d = useD()
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                padding: `${u(d.counterPadY)} ${u(d.counterPadX)}`,
                borderRadius: u(d.counterRadius),
                // Same fill as the close button in an open agent
                background: d.closeBg,
                flexShrink: 0,
            }}
        >
            <span style={{ ...tx(d, d.agentCountSize), fontVariantNumeric: "tabular-nums" }}>{value}</span>
        </span>
    )
}

function SegmentedControl({ value, onChange }: { value: AgentStatus; onChange: (v: AgentStatus) => void }) {
    const d = useD()
    // The pill sits `togglePadding` inside the track; its radius is that much smaller to stay concentric
    const inner = u(Math.max(0, d.toggleRadius - d.togglePadding))
    const options: { id: AgentStatus; label: string }[] = [
        { id: "active", label: d.activeLabel },
        { id: "idle", label: d.idleLabel },
    ]

    // The pill is one element that slides under the selected option.
    // Its position is measured from the buttons, so it follows scaling and text changes.
    const buttons = useRef<Record<string, HTMLButtonElement | null>>({})
    const [pill, setPill] = useState<{ left: number; width: number } | null>(null)
    const [animate, setAnimate] = useState(false)

    useLayoutEffect(() => {
        const measure = () => {
            const el = buttons.current[value]
            if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth })
        }
        measure()
        const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null
        Object.values(buttons.current).forEach((el) => el && ro?.observe(el))
        return () => ro?.disconnect()
    }, [value])

    const ease = EASE_OUT

    return (
        <div
            role="tablist"
            aria-label="Agent status"
            style={{
                position: "relative",
                display: "inline-flex",
                padding: u(d.togglePadding),
                gap: u(d.toggleGap),
                borderRadius: u(d.toggleRadius),
                background: d.toggleBg,
            }}
        >
            <span
                aria-hidden="true"
                style={{
                    position: "absolute",
                    top: u(d.togglePadding),
                    bottom: u(d.togglePadding),
                    left: 0,
                    width: pill?.width ?? 0,
                    transform: `translateX(${pill?.left ?? 0}px)`,
                    borderRadius: inner,
                    background: d.pill,
                    opacity: pill ? 1 : 0,
                    transition:
                        animate && !prefersReducedMotion()
                            ? `transform ${d.toggleMs}ms ${ease}, width ${d.toggleMs}ms ${ease}`
                            : "none",
                }}
            />
            {options.map((o) => {
                const selected = o.id === value
                return (
                    <button
                        key={o.id}
                        ref={(el) => {
                            buttons.current[o.id] = el
                        }}
                        role="tab"
                        aria-selected={selected}
                        onClick={() => {
                            setAnimate(true)
                            onChange(o.id)
                        }}
                        style={{
                            position: "relative",
                            appearance: "none",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            padding: `${u(d.togglePadY)} ${u(d.togglePadX)}`,
                            borderRadius: inner,
                            fontFamily: "inherit",
                            background: "transparent",
                        }}
                    >
                        <span
                            style={{
                                ...tx(d, d.toggleTextSize, 400, selected ? d.text : alpha(d.text, d.labelOpacity)),
                                transition: "color 200ms ease",
                            }}
                        >
                            {o.label}
                        </span>
                    </button>
                )
            })}
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* Task queue (live loop)                                              */
/* ------------------------------------------------------------------ */

const mod = (n: number, m: number) => ((n % m) + m) % m

/** Cap height used for spacing, as a share of the font size (Figma: 2u for 3u text) */
const CAP = 2 / 3

/** Small seeded PRNG, so every task gets its own but repeatable rhythm */
function mulberry32(seed: number) {
    return () => {
        seed |= 0
        seed = (seed + 0x6d2b79f5) | 0
        let r = Math.imul(seed ^ (seed >>> 15), 1 | seed)
        r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296
    }
}

const hashString = (str: string) => {
    let h = 2166136261
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
    return h >>> 0
}

interface Segment {
    t0: number
    t1: number
    p0: number
    p1: number
}

/**
 * A task is a run of 3–6 subtasks. Each subtask covers a random slice of the
 * progress and takes its own time (some crawl, some jump), with short
 * "thinking" pauses in between. Returns the segments and total duration (ms).
 */
function makePlan(seed: number, from: number, speed: number) {
    const rand = mulberry32(seed)
    const count = 3 + Math.floor(rand() * 4)
    const weights = Array.from({ length: count }, () => 0.3 + rand())
    const sum = weights.reduce((a, b) => a + b, 0)

    const segments: Segment[] = []
    let time = 0
    let progress = from
    weights.forEach((w, i) => {
        const slice = (w / sum) * (100 - from)
        let duration = 250 + rand() * 1300
        if (rand() < 0.25) duration *= 2.4 // the occasional slow subtask
        segments.push({ t0: time, t1: time + duration, p0: progress, p1: progress + slice })
        time += duration
        progress += slice
        if (i < count - 1 && rand() < 0.55) time += 150 + rand() * 600 // pause
    })

    // A task resumed part-way only needs the remaining share of the time
    const k = (100 - from) / 100 / Math.max(0.05, speed)
    for (const seg of segments) {
        seg.t0 *= k
        seg.t1 *= k
    }
    return { segments, total: time * k }
}

const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2)

function progressAt(segments: Segment[], time: number) {
    let value = segments[0].p0
    for (const seg of segments) {
        if (time >= seg.t1) value = seg.p1
        else if (time > seg.t0) return seg.p0 + (seg.p1 - seg.p0) * easeInOut((time - seg.t0) / (seg.t1 - seg.t0))
        else break
    }
    return value
}

/**
 * Geometry of the three-row task window. Row height is rounded to whole pixels:
 * the slide moves exactly one row and then resets, so fractional rows would
 * pixel-snap differently and jump 1–2px. The window reaches `fade` above and
 * below the rows so steps fade in and out instead of being cut off.
 */
function queueFrame(d: Design) {
    const rowPx = `round(${u(d.rowHeight)}, 1px)`
    const fadePx = `round(${u(d.fade)}, 1px)`
    const mask = `linear-gradient(to bottom, transparent 0, #000 ${u(d.fade + 1)}, #000 calc(100% - ${u(d.fade)}), transparent 100%)`
    // Untrimmed rows carry space above/below the cap height that Figma trims away
    const slack = Math.max(0, (d.rowHeight - d.taskSize * CAP) / 2)
    const outer: CSSProperties = { paddingTop: u(Math.max(0, d.tasksTop - slack)), minWidth: 0 }
    const window: CSSProperties = {
        // Two visible rows: the running subtask and the next one
        height: `calc(2 * ${rowPx} + 2 * ${fadePx})`,
        marginTop: `calc(-1 * ${fadePx})`,
        paddingTop: fadePx,
        boxSizing: "border-box",
        overflow: "hidden",
        marginBottom: `calc(-1 * ${fadePx} - ${u(slack)})`,
        maskImage: mask,
        WebkitMaskImage: mask,
    }
    return { rowPx, outer, window }
}

/** Empty stand-in with exactly the task window's size */
function QueueSpacer() {
    const { outer, window } = queueFrame(useD())
    return (
        <div style={outer}>
            <div style={window} />
        </div>
    )
}

export interface QueueStatus {
    /** Subtasks completed */
    done: number
    /** All subtasks completed (loader shows a check) */
    finished: boolean
    /** Progress (0–100) of the running subtask */
    progress: number
}

/**
 * Two visible rows: current · next, running through the agent's
 * subtasks in order. A finished subtask holds briefly, then the list slides up a row.
 * After the last subtask it stays put until new subtasks are added, then carries on.
 */
function TaskQueue({
    tasks,
    initialDone = 0,
    startProgress = 0,
    speed = 1,
    seed = 0,
    onComplete,
    onStatus,
    ready,
}: {
    tasks: QueueStep[]
    initialDone?: number
    startProgress?: number
    speed?: number
    seed?: number
    onComplete?: () => void
    onStatus?: (s: QueueStatus) => void
    /** Shown in place of the rows once every subtask is done */
    ready?: [string, string | undefined]
}) {
    const d = useD()
    // Timing is read through refs, so tweaking the design doesn't restart a running step
    const dRef = useRef(d)
    dRef.current = d
    const onCompleteRef = useRef(onComplete)
    onCompleteRef.current = onComplete
    const onStatusRef = useRef(onStatus)
    onStatusRef.current = onStatus

    const total = tasks.length
    const first = useRef(Math.max(0, Math.min(initialDone, total)))
    const [done, setDone] = useState(first.current)
    // holdLast: the current slot still shows the step that just finished
    // (during the short pause before sliding, or once everything is done)
    const [holdLast, setHoldLast] = useState(first.current > 0 && first.current >= total)
    const [sliding, setSliding] = useState(false)
    const [progress, setProgress] = useState(first.current >= total ? 100 : startProgress)
    const running = done < total

    useEffect(() => {
        onStatusRef.current?.({ done, finished: total > 0 && done >= total, progress })
    }, [done, total, progress])

    // Fill the current step to 100%, subtask by subtask
    useEffect(() => {
        if (!running || holdLast || sliding) return
        const from = done === first.current ? startProgress : 0
        const { segments, total: duration } = makePlan(seed + done * 7919, from, speed * d.workSpeed)
        const start = performance.now()
        let raf = 0
        let last = -1
        const tick = (now: number) => {
            const elapsed = now - start
            const p = elapsed >= duration ? 100 : progressAt(segments, elapsed)
            const rounded = Math.floor(p)
            if (rounded !== last) {
                last = rounded
                setProgress(rounded)
            }
            if (elapsed < duration) raf = requestAnimationFrame(tick)
            else {
                onCompleteRef.current?.()
                setDone(done + 1)
                setHoldLast(true)
            }
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [done, running, holdLast, sliding, startProgress, speed, seed, d.workSpeed])

    // After a short pause, slide the next step up. This also resumes the list
    // when new subtasks arrive after everything was done.
    useEffect(() => {
        if (!holdLast || sliding || !running) return
        const id = setTimeout(() => setSliding(true), dRef.current.stepPauseMs / dRef.current.workSpeed)
        return () => clearTimeout(id)
    }, [holdLast, sliding, running])

    // After the slide, settle into the new position (an invisible reset)
    useEffect(() => {
        if (!sliding) return
        const id = setTimeout(
            () => {
                setHoldLast(false)
                setSliding(false)
                setProgress(0)
            },
            prefersReducedMotion() ? 0 : dRef.current.slideMs
        )
        return () => clearTimeout(id)
    }, [sliding])

    const reduce = prefersReducedMotion()

    const { rowPx, outer, window: windowStyle } = queueFrame(d)
    const muted = alpha(d.text, d.mutedOpacity)
    const shimmerColor = alpha(d.text, d.shimmerBase)
    // Index of the step in the current (middle) slot
    const v = holdLast ? done - 1 : done
    // Everything done and nothing new queued: show the ready message instead of the rows
    const allDone = total > 0 && done >= total && holdLast && !sliding && !!ready

    const rowText = (color: string): CSSProperties => ({
        fontSize: ut(d.taskSize),
        fontWeight: 400,
        color,
        letterSpacing: `${d.tracking}em`,
        lineHeight: rowPx,
        whiteSpace: "nowrap",
        fontVariantNumeric: "tabular-nums", // counters tick without the text shifting
    })

    return (
        // The window reaches `fade` above the first row and below the last, so steps
        // fade out at the top and in at the bottom instead of being cut off.
        <div style={outer}>
            <div style={{ ...windowStyle, position: "relative" }}>
                {ready && (
                    <div
                        aria-hidden={!allDone}
                        style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            top: windowStyle.paddingTop,
                            opacity: allDone ? 1 : 0,
                            // A short beat after the last subtask finishes, then the message fades in
                            transition: reduce ? "none" : allDone ? `opacity 300ms ${EASE_OUT} 650ms` : `opacity 180ms ${EASE_OUT}`,
                        }}
                    >
                        <div style={{ height: rowPx, display: "flex", alignItems: "center", minWidth: 0 }}>
                            <span style={{ ...rowText(d.text), fontWeight: d.readyWeight, ...ellipsis }}>{ready[0]}</span>
                        </div>
                        {ready[1] && (
                            <div style={{ height: rowPx, display: "flex", alignItems: "center", minWidth: 0 }}>
                                <span style={{ ...rowText(muted), ...ellipsis }}>{ready[1]}</span>
                            </div>
                        )}
                    </div>
                )}
                <div
                    style={{
                        // Always on its own layer, so text is drawn the same way before and after the reset
                        willChange: "transform",
                        // Shifted up one row: the finished row sits above the window (hidden), so
                        // the running subtask is on top and the next one below it
                        transform: sliding ? `translateY(calc(-2 * ${rowPx}))` : `translateY(calc(-1 * ${rowPx}))`,
                        transition: [
                            sliding && !reduce ? `transform ${d.slideMs}ms ${EASE_OUT}` : "",
                            reduce ? "" : allDone ? `opacity 250ms ${EASE_OUT} 400ms` : `opacity 180ms ${EASE_OUT}`,
                        ]
                            .filter(Boolean)
                            .join(", ") || "none",
                        opacity: allDone ? 0 : 1,
                    }}
                >
                    {[0, 1, 2, 3].map((k) => {
                        const idx = v - 1 + k
                        // role: -1 gone · 0 just finished (hidden) · 1 current · 2 next · 3 waiting below
                        const role = k - (sliding ? 1 : 0)
                        const stepAt = idx >= 0 && idx < total ? tasks[idx] : null
                        const completed = idx < done
                        const isCurrent = role === 1 && idx === done && running
                        // The subtask that just finished stays put during the pause, then fades out
                        // while it slides up. Older finished rows are never shown.
                        const justFinished = holdLast && idx === done - 1
                        const leaving = sliding && justFinished
                        const visible =
                            stepAt !== null && role >= 1 && role <= 2 && (!completed || justFinished)
                        const live = idx === done && !holdLast && !sliding ? progress : 0
                        return (
                            <div
                                key={idx}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: u(1),
                                    height: rowPx,
                                    minWidth: 0,
                                    opacity: visible ? 1 : 0,
                                    // A finished row leaves quickly; new rows ease in with the slide
                                    transition: reduce ? "none" : `opacity ${leaving ? d.slideMs * 0.7 : completed ? 120 : d.slideMs}ms ${EASE_OUT}`,
                                }}
                            >
                                {/* A finished row keeps its in-progress wording and colour while it
                                    fades, so a grey "done" line never flashes up */}
                                <span
                                    style={{
                                        ...rowText(isCurrent || completed ? shimmerColor : muted),
                                        ...ellipsis,
                                    }}
                                >
                                    <span className={isCurrent ? "wuc-shimmer" : undefined}>
                                        {stepAt ? stepLabel(stepAt, false, completed ? 100 : live) : " "}
                                    </span>
                                </span>
                                {stepAt && typeof stepAt === "object" && stepAt.skill && d.showSkills && (
                                    <SkillChip name={stepAt.skill} faded={!isCurrent} />
                                )}
                                {isCurrent && d.showTaskProgress && (
                                    <>
                                        <span
                                            aria-hidden="true"
                                            style={{
                                                width: u(0.75),
                                                height: u(0.75),
                                                borderRadius: "50%",
                                                background: d.text,
                                                flexShrink: 0,
                                            }}
                                        />
                                        <span style={rowText(d.text)}>{live}%</span>
                                    </>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* Agent header (tile + detail)                                        */
/* ------------------------------------------------------------------ */

function AgentHeader({
    agent,
    status,
    icon,
    right,
    hideCounter = false,
}: {
    agent: Agent
    status: QueueStatus
    icon: ReactNode
    /** Right side; defaults to the agent's share of the limit */
    right?: ReactNode
    /** Fade the prompt chip out (inside an open agent) */
    hideCounter?: boolean
}) {
    const d = useD()
    const total = stepsOf(agent).length
    const showLoader = d.showLoader && (agent.status === "active" || status.finished)
    const showCounter = d.showCounter && total > 0
    const nameCap = d.nameSize * CAP

    return (
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: u(3) }}>
            <div style={{ display: "flex", alignItems: "center", gap: u(d.iconGap), minWidth: 0 }}>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: u(d.nameModelGap),
                        minWidth: 0,
                    }}
                >
                    {/* Loader and counter overhang the name's cap height, so the row keeps its height */}
                    <div style={{ display: "flex", alignItems: "center", minWidth: 0, maxWidth: "100%" }}>
                        {showLoader && (
                            <span
                                style={{
                                    display: "flex",
                                    margin: `${u(-(d.loaderSize - nameCap) / 2)} ${u(d.loaderGap)} ${u(-(d.loaderSize - nameCap) / 2)} 0`,
                                }}
                            >
                                <Loader done={status.finished} />
                            </span>
                        )}
                        <h3 style={{ margin: 0, flexShrink: 0, ...tx(d, d.nameSize, d.nameWeight), ...ellipsis }}>
                            {agent.name}
                        </h3>
                        {showCounter && (
                            <span
                                style={{
                                    display: "flex",
                                    minWidth: 0,
                                    margin: `${u(-d.counterPadY)} 0 ${u(-d.counterPadY)} ${u(d.counterGap)}`,
                                    // Can be hidden (fades); shown both in the list and in an open agent
                                    opacity: hideCounter ? 0 : 1,
                                    transition: prefersReducedMotion()
                                        ? "none"
                                        : hideCounter
                                          ? `opacity ${Math.round(d.expandMs * 0.4)}ms ${EXPAND_EASE}`
                                          : `opacity ${Math.round(d.expandMs * 0.6)}ms ${EXPAND_EASE} ${Math.round(d.expandMs * 0.4)}ms`,
                                }}
                                aria-hidden={hideCounter || undefined}
                            >
                                <ContextCounter used={contextUsed(agent, status.done, d.contextGrowth)} limit={contextLimit(agent.model)} />
                            </span>
                        )}
                    </div>
                    <ModelLabel
                        label={agent.model}
                        effort={agent.effort}
                        share={d.shareDisplay === "Label" ? agent.share : undefined}
                    />
                </div>
                {icon && (
                    <span style={{ display: "flex", width: u(d.iconSize), height: u(d.iconSize), flexShrink: 0 }}>
                        {icon}
                    </span>
                )}
            </div>
            {right ?? (
                <Percent
                    value={agent.share}
                    size={d.shareSize}
                    unitSize={d.shareUnitSize}
                    weight={d.shareWeight}
                    tracking={d.shareTracking}
                />
            )}
        </header>
    )
}

/* ------------------------------------------------------------------ */
/* Agent tile                                                          */
/* ------------------------------------------------------------------ */

/** Two lines for an agent that isn't running its loop (idle, or live mode off) */
function StaticLines({ agent, status }: { agent: Agent; status: QueueStatus }) {
    const d = useD()
    const steps = stepsOf(agent)
    const cap = d.taskSize * CAP
    const muted = alpha(d.text, d.mutedOpacity)

    let first: string
    let second: string | undefined
    let shimmer = false
    let ready = false
    if (steps.length && agent.status === "active" && status.done < steps.length) {
        // Working: current subtask (shimmering) and the next one
        first = stepLabel(steps[status.done], false, agent.currentProgress ?? 0)
        second = steps[status.done + 1] ? stepLabel(steps[status.done + 1], false) : undefined
        shimmer = true
    } else if (!steps.length && agent.currentTask) {
        // No prompts, but fallback lines were given
        first = agent.currentTask.title
        second = agent.secondaryLine
        shimmer = agent.status === "active"
    } else {
        // Everything done (or nothing asked yet): ready for the next prompt
        ;[first, second] = readyLines(d, agent)
        ready = true
    }

    // Same frame as the live task list, so every agent card has the same height
    const { rowPx, outer, window: windowStyle } = queueFrame(d)
    const row = (color: string): CSSProperties => ({
        fontSize: ut(d.taskSize),
        fontWeight: 400,
        color,
        letterSpacing: `${d.tracking}em`,
        lineHeight: rowPx,
        whiteSpace: "nowrap",
        fontVariantNumeric: "tabular-nums",
        ...ellipsis,
    })
    void cap

    return (
        <div style={outer}>
            <div style={windowStyle}>
                <div style={{ height: rowPx, display: "flex", alignItems: "center", minWidth: 0 }}>
                    <span style={{ ...row(shimmer ? alpha(d.text, d.shimmerBase) : d.text), ...(ready ? { fontWeight: d.readyWeight } : null) }}>
                        <span className={shimmer ? "wuc-shimmer" : undefined}>{first}</span>
                    </span>
                </div>
                <div style={{ height: rowPx, display: "flex", alignItems: "center", minWidth: 0 }}>
                    {second && <span style={row(muted)}>{second}</span>}
                </div>
            </div>
        </div>
    )
}

/** The two lines an agent shows once all its tasks are done */
function readyLines(d: Design, agent: Agent): [string, string | undefined] {
    return [d.readyText, d.readyHint ? d.readyHint.replace("{name}", agent.name) : undefined]
}

/** Box inside the card, in px */
type Box = { top: number; left: number; width: number; height: number }

/**
 * An agent tile. Clicking it grows this same element to fill the card: the header
 * stays put, the task rows fade out and the chat fades in. Closing reverses it,
 * landing exactly on the tile's spot, so there is never a second copy to line up.
 */
/** Right side of a tile header: the share %, crossfading to a close button while open */
function ShareSlot({
    agent,
    expanded,
    open,
    onClose,
}: {
    agent: Agent
    expanded: boolean
    open: boolean
    onClose?: () => void
}) {
    const d = useD()
    const ms = prefersReducedMotion() ? 0 : d.expandMs
    const outWhenOpen: CSSProperties = {
        opacity: open ? 0 : 1,
        transition: open
            ? `opacity ${Math.round(ms * 0.3)}ms ${EXPAND_EASE}`
            : `opacity ${Math.round(ms * 0.5)}ms ${EXPAND_EASE} ${Math.round(ms * 0.45)}ms`,
    }
    // Mounts already open (no waiting frame), so it fades in with an animation, not a transition
    const inWhenOpen: CSSProperties = {
        opacity: open ? 1 : 0,
        transition: open ? "none" : `opacity 80ms ${EASE_OUT}`,
        animation: open && ms > 0 ? `wuc-in-fade 220ms ${EXPAND_EASE} ${Math.round(ms * 0.55)}ms backwards` : undefined,
        pointerEvents: open ? "auto" : "none",
    }
    return (
        <span style={{ position: "relative", display: "flex", flexShrink: 0 }}>
            {d.shareDisplay === "Big number" && (
                <span style={{ display: "flex", ...outWhenOpen }}>
                    <Percent
                        value={agent.share}
                        size={d.shareSize}
                        unitSize={d.shareUnitSize}
                        weight={d.shareWeight}
                        tracking={d.shareTracking}
                    />
                </span>
            )}
            {expanded && (
                // Centred on the same spot as before (5.5u button, 1u outside the corner)
                <span
                    style={{
                        position: "absolute",
                        top: u(-1 + (5.5 - d.closeSize) / 2),
                        right: u(-1 + (5.5 - d.closeSize) / 2),
                        display: "flex",
                        ...inWhenOpen,
                    }}
                >
                    <button
                        className="wuc-close"
                        onClick={onClose}
                        aria-label="Close"
                        style={{
                            appearance: "none",
                            border: "none",
                            cursor: "pointer",
                            width: u(d.closeSize),
                            height: u(d.closeSize),
                            borderRadius: u(d.closeRadius),
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 0,
                        }}
                    >
                        <svg viewBox="0 0 24 24" style={{ width: "46%", height: "46%" }} aria-hidden="true">
                            <path d="M6 6 L18 18 M18 6 L6 18" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
                        </svg>
                    </button>
                </span>
            )}
        </span>
    )
}

/** Box styles shared by a tile and its stand-in */
function tileChrome(d: Design): CSSProperties {
    return {
        // Longhands, so a tile can leave its border colour to the stylesheet (for hover)
        borderWidth: d.tileBorderWidth > 0 ? d.tileBorderWidth : 0,
        borderStyle: d.tileBorderWidth > 0 ? "solid" : "none",
        borderColor: d.tileBorderColor,
        borderRadius: u(d.tileRadius),
        padding: u(d.tilePadding),
        display: "flex",
        flexDirection: "column",
        gap: u(d.tileHeaderGap),
        overflow: "hidden",
    }
}

/**
 * Invisible copy of a tile, left in its spot while the real tile is lifted out.
 * It follows the agent's current state, so the spot has the right size and
 * position to land on, even if the agent changed (e.g. idle → active).
 */
function TileStandIn({ agent, status, looping }: { agent: Agent; status: QueueStatus; looping: boolean }) {
    const d = useD()
    return (
        <div aria-hidden="true" style={{ ...tileChrome(d), visibility: "hidden", pointerEvents: "none" }}>
            <AgentHeader agent={agent} status={status} icon={null} right={<ShareSlot agent={agent} expanded={false} open={false} />} />
            {looping ? (
                <div style={{ position: "relative" }}>
                    <div>
                        <QueueSpacer />
                    </div>
                </div>
            ) : (
                <div style={{ position: "relative" }}>
                    <div>
                        <StaticLines agent={agent} status={status} />
                    </div>
                </div>
            )}
        </div>
    )
}

function AgentTile({
    agent,
    status,
    looping,
    working,
    icon,
    expanded,
    open,
    box,
    full,
    onOpen,
    onClose,
    onClosed,
    onSend,
    onStatus,
    onTaskComplete,
}: {
    agent: Agent
    status: QueueStatus
    looping: boolean
    /** The agent is actively running its subtasks */
    working: boolean
    icon: ReactNode
    /** This tile is lifted out to grow into the detail view */
    expanded: boolean
    /** Grown to the full card (false while growing from / shrinking back to `box`) */
    open: boolean
    box: Box | null
    /** The card's inner box, which the tile grows to */
    full: Box | null
    onOpen: () => void
    onClose: () => void
    /** Shrinking back has finished */
    onClosed: () => void
    onSend: (text: string) => void
    onStatus: (s: QueueStatus) => void
    onTaskComplete: () => void
}) {
    const d = useD()
    const reduce = prefersReducedMotion()
    const ms = reduce ? 0 : d.expandMs
    const ease = EXPAND_EASE
    // Lifted: positioned at its resting box for the current state. The grow/shrink
    // itself is a keyframe animation (below), so it can overshoot and settle.
    const lifted: CSSProperties =
        expanded && box
            ? // Well above the rest of the card (which fades back in under it while it closes)
              { position: "absolute", zIndex: 20, isolation: "isolate", boxSizing: "border-box", ...(open && full ? full : box) }
            : {}

    const articleRef = useRef<HTMLElement>(null)

    // Header height, so the open chat can reach up behind it
    const headerRef = useRef<HTMLDivElement>(null)
    const [headerH, setHeaderH] = useState(0)
    useLayoutEffect(() => {
        const el = headerRef.current
        if (!expanded || !el) return
        const measure = () => setHeaderH(el.offsetHeight)
        measure()
        const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null
        ro?.observe(el)
        return () => ro?.disconnect()
    }, [expanded])
    /** From the tile's top edge (inside its border) down to where the chat content starts */
    const behindHeader = `calc(${headerH}px + ${u(d.tilePadding)} + ${u(d.tileHeaderGap)})`

    // Installed skills sit fixed under the header while open (the chat scrolls behind them)
    const skillsNow = expanded && d.showSkills ? installedSkills(agent, status.done) : []
    const skillsRef = useRef<HTMLDivElement>(null)
    const [skillsH, setSkillsH] = useState(0)
    useLayoutEffect(() => {
        const el = skillsRef.current
        if (!el) {
            setSkillsH(0)
            return
        }
        const measure = () => setSkillsH(el.offsetHeight)
        measure()
        const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null
        ro?.observe(el)
        return () => ro?.disconnect()
    }, [skillsNow.length > 0])
    // Extra room the skills row takes above the chat
    // Space the skills row takes above the chat, plus a little clear room below it before the blur
    const skillsSpace = skillsNow.length > 0 ? `(${skillsH}px + ${u(d.skillsGap)} + ${u(d.solidGap)})` : "0px"
    // The chat is built once the grow has finished, not on the click: building it is the
    // heavy part, and doing it during the grow stalled every animation on the page
    const [chatOn, setChatOn] = useState(false)
    useEffect(() => {
        if (!expanded) {
            // Taken down a moment after the card is back in the list, not in the same frame
            // (removing it is heavy too, and froze the spinners right as the card landed)
            if (!chatOn) return
            const id = setTimeout(() => setChatOn(false), 400)
            return () => clearTimeout(id)
        }
        if (!open || chatOn) return
        const id = setTimeout(() => setChatOn(true), reduce ? 0 : ms)
        return () => clearTimeout(id)
    }, [expanded, open, chatOn, reduce, ms])
    const anim = useRef<Animation | null>(null)
    const shownOpen = useRef(false)
    const onClosedRef = useRef(onClosed)
    onClosedRef.current = onClosed

    useLayoutEffect(() => {
        const el = articleRef.current
        if (!expanded || !box || !full || !el || shownOpen.current === open) return
        shownOpen.current = open

        // Start from where it is right now (mid-animation if the user changed their mind)
        let from: Box = open ? box : full
        if (anim.current && anim.current.playState === "running") {
            const cs = getComputedStyle(el)
            from = { top: parseFloat(cs.top), left: parseFloat(cs.left), width: parseFloat(cs.width), height: parseFloat(cs.height) }
        }
        anim.current?.cancel()

        const to = open ? full : box
        if (ms <= 0 || typeof el.animate !== "function") {
            if (!open) onClosedRef.current()
            return
        }
        // Overshoot in px: grow past the card's inner edges (top and bottom) when opening, dip inside the spot when closing
        const unitPx = full.width / Math.max(1, d.cardWidth - 2 * d.cardPadding)
        const o = d.expandOvershoot * unitPx * (open ? 1 : -0.5)
        // Vertical only: the width stays put
        const over: Box = { top: to.top - o, left: to.left, width: to.width, height: to.height + 2 * o }
        const px = (b: Box) => ({ top: `${b.top}px`, left: `${b.left}px`, width: `${b.width}px`, height: `${b.height}px` })

        const a = el.animate(
            o === 0
                ? // No bounce: one smooth move on the open/close curve
                  [{ ...px(from), easing: ease }, px(to)]
                : [
                      { ...px(from), easing: ease },
                      { ...px(over), offset: 0.72, easing: "cubic-bezier(0.3, 0, 0.3, 1)" },
                      px(to),
                  ],
            { duration: ms }
        )
        anim.current = a
        if (!open) a.finished.then(() => onClosedRef.current()).catch(() => {})
    }, [open, expanded, box, full, ms, ease, d.cardWidth, d.cardPadding, d.expandOvershoot])

    // Reset when the tile is put back
    useEffect(() => {
        if (!expanded) {
            shownOpen.current = false
            anim.current?.cancel()
            anim.current = null
        }
    }, [expanded])

    // Crossfades inside the tile: tasks ⇄ chat, share % ⇄ close button
    const outWhenOpen: CSSProperties = {
        opacity: open ? 0 : 1,
        transition: open
            ? `opacity ${Math.round(ms * 0.3)}ms ${EXPAND_EASE}`
            : `opacity ${Math.round(ms * 0.5)}ms ${EXPAND_EASE} ${Math.round(ms * 0.45)}ms`,
    }
    // Mounts already open (no waiting frame), so it fades in with an animation, not a transition
    const inWhenOpen: CSSProperties = {
        opacity: open ? 1 : 0,
        transition: open ? "none" : `opacity 80ms ${EASE_OUT}`,
        animation: open && ms > 0 ? `wuc-in-fade 220ms ${EXPAND_EASE} ${Math.round(ms * 0.55)}ms backwards` : undefined,
        pointerEvents: open ? "auto" : "none",
    }

    return (
        <article
            ref={articleRef}
            className="wuc-tile"
            data-open={expanded ? "" : undefined}
            role={expanded ? "dialog" : "button"}
            tabIndex={expanded ? -1 : 0}
            aria-label={expanded ? `${agent.name}: tasks and chat` : `Open ${agent.name}`}
            onClick={expanded ? undefined : onOpen}

            onKeyDown={(e) => {
                if (expanded || e.target !== e.currentTarget) return
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onOpen()
                }
            }}
            style={{
                ...tileChrome(d),
                // Colours come from the stylesheet (so hover can change them);
                // opaque while lifted, so the faded card doesn't show through
                ...({
                    // Never see-through: cards pass over each other when the list reorders
                    "--wuc-tile-bg": d.tileFill ? d.tileBg : d.card,
                    "--wuc-tile-border": d.tileBorderColor,
                } as CSSProperties),
                borderColor: undefined,
                cursor: expanded ? "auto" : "pointer",
                ...lifted,
            }}
        >
            {/* Above the chat, which scrolls up behind it (blurred) while open */}
            <div ref={headerRef} style={{ position: "relative", zIndex: 3 }}>
                <AgentHeader
                    agent={agent}
                    status={status}
                    icon={icon}
                    right={<ShareSlot agent={agent} expanded={expanded} open={open} onClose={onClose} />}
                />
                {skillsNow.length > 0 && (
                    // Out of the flow, so the tile's layout (and its close animation) is unchanged
                    <div
                        ref={skillsRef}
                        style={{
                            position: "absolute",
                            top: `calc(100% + ${u(d.skillsGap)})`,
                            left: 0,
                            right: 0,
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: u(1),
                            ...inWhenOpen,
                        }}
                    >
                        <span style={{ ...tx(d, d.skillsTextSize, 400, alpha(d.text, d.labelOpacity)), marginRight: u(0.5) }}>
                            Skills
                        </span>
                        {/* One chip per library; its skills are in a dropdown */}
                        {skillLibraries(skillsNow).map((lib) => (
                            <LibraryChip key={lib.source} source={lib.source} label={lib.label} skills={lib.skills} />
                        ))}
                    </div>
                )}
            </div>

            <div style={{ position: "relative", flex: expanded ? 1 : undefined, minHeight: 0 }}>
                <div style={expanded ? outWhenOpen : undefined}>
                    {looping ? (
                        <TaskQueue
                            key={String(agent.tasksDone ?? 0)}
                            tasks={stepsOf(agent)}
                            initialDone={agent.tasksDone ?? 0}
                            startProgress={agent.currentProgress ?? 0}
                            speed={agent.speed}
                            seed={hashString(agent.id)}
                            onComplete={onTaskComplete}
                            onStatus={onStatus}
                            ready={readyLines(d, agent)}
                        />
                    ) : (
                        <StaticLines agent={agent} status={status} />
                    )}
                </div>
                {chatOn && (
                    <div
                        style={{
                            // Kept (hidden) for a moment after closing, see chatOn
                            ...(expanded ? {} : { display: "none" }),
                            position: "absolute",
                            // Reaches up to the tile's top edge, behind the header, and across its full
                            // width (padding moves inside), so the blur has room and isn't clipped
                            top: `calc(-1 * ${behindHeader})`,
                            left: u(-d.tilePadding),
                            right: u(-d.tilePadding),
                            // Always the open size, anchored at the top: while the tile grows (or shrinks)
                            // it reveals the chat like a window, so nothing inside reflows or scrolls
                            // mid-animation (that made the content under the blur jump)
                            ...(full
                                ? { height: `calc(${full.height}px - ${2 * d.tileBorderWidth}px - ${u(d.tilePadding)})` }
                                : { bottom: 0 }),
                            display: "flex",
                            flexDirection: "column",
                            // No overflow clipping here: Chrome drops a backdrop blur inside a rounded
                            // clip once the open animation ends, which made the blur jump.
                            // Not faded in with opacity either: an ancestor below full opacity changes
                            // what the backdrop blur sees (the top line turned heavy, then switched).
                            // It shows at once; a solid cover on top fades away instead (below).
                            // Closing does fade it out, so the task rows come back underneath.
                            opacity: open ? 1 : 0,
                            transition: open ? "none" : `opacity 80ms ${EASE_OUT}`,
                            pointerEvents: open ? "auto" : "none",
                        }}
                    >
                        <AgentChat
                            agent={agent}
                            status={status}
                            working={working}
                            open={open}
                            onSend={onSend}
                            topInset={`calc(${behindHeader} + ${skillsSpace} + ${u(d.threadTopSpace)})`}
                            // the blur starts where the solid area behind the header (and the space
                            // before the cut-off) ends, so that solid area never covers it
                            blurHeight={`calc(${headerH}px + ${skillsSpace} + ${u(d.tilePadding)} + ${u(d.headerCutGap)} + ${u(d.threadBlurHeight)})`}
                            solidHeight={`calc(${headerH}px + ${u(d.tilePadding)} + ${skillsSpace} + ${u(d.headerCutGap)})`}
                        />
                        {/* Solid behind the header (and skills row), so scrolled chat never shows
                            through them; the blur takes over just below */}
                        <div
                            aria-hidden="true"
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                // Solid to the bottom of the skills row, then a short soft fade
                                height: `calc(${headerH}px + ${u(d.tilePadding)} + ${skillsSpace} + ${u(d.headerCutGap)} + ${u(d.solidFade)})`,
                                background: `linear-gradient(to bottom, ${d.tileFill ? d.tileBg : d.card} calc(100% - ${u(d.solidFade)}), ${alpha(d.tileFill ? d.tileBg : d.card, 0)} 100%)`,
                                // Rounded like the tile (inside its border), so it doesn't cover the corner border
                                borderTopLeftRadius: `max(0px, calc(${u(d.tileRadius)} - ${d.tileBorderWidth}px))`,
                                borderTopRightRadius: `max(0px, calc(${u(d.tileRadius)} - ${d.tileBorderWidth}px))`,
                                zIndex: 1,
                                pointerEvents: "none",
                            }}
                        />
                    </div>
                )}
            </div>
        </article>
    )
}

/* ------------------------------------------------------------------ */
/* Agent chat (inside an expanded tile)                                */
/* ------------------------------------------------------------------ */

function StepRow({ step: s, state, progress }: { step: QueueStep; state: "done" | "current" | "pending"; progress: number }) {
    const d = useD()
    const size = u(d.stepIconSize)
    return (
        // Every row the icon's height: a skill chip sticks out a little instead of
        // making its row taller, so the rows stay evenly spaced
        <div style={{ display: "flex", alignItems: "center", gap: u(d.subtaskIconGap), minWidth: 0, height: size }}>
            <span style={{ display: "flex", width: size, height: size, flexShrink: 0 }}>
                {state !== "done" ? (
                    // one ring for both: the pending circle morphs into the loader
                    <Loader done={false} pending={state === "pending"} size={d.stepIconSize} />
                ) : (
                    <svg
                        viewBox="0 0 24 24"
                        style={{
                            width: "100%",
                            height: "100%",
                            overflow: "visible",
                            // Only the checkmark scales; the row keeps its height and the text stays put
                            transform: state === "done" && d.stepCheckScale !== 1 ? `scale(${d.stepCheckScale})` : undefined,
                        }}
                        aria-hidden="true"
                    >
                        <path
                            d="M4.6 12.8 L9.8 17.8 L19.4 7.4"
                            fill="none"
                            stroke={d.loaderColor}
                            strokeWidth={d.loaderStroke * 1.1}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                )}
            </span>
            <span
                style={{
                    ...tx(
                        d,
                        d.subtaskSize,
                        400,
                        state === "current"
                            ? alpha(d.text, d.shimmerBase)
                            : alpha(d.text, state === "done" ? Math.min(1, d.mutedOpacity + 0.25) : d.mutedOpacity)
                    ),
                    fontSize: uc(d, d.subtaskSize),
                    fontVariantNumeric: "tabular-nums",
                    ...ellipsis,
                }}
            >
                <span className={state === "current" ? "wuc-shimmer" : undefined}>
                    {stepLabel(s, state === "done", progress)}
                </span>
            </span>
            {typeof s === "object" && s.skill && <SkillChip name={s.skill} faded={state === "pending"} />}
        </div>
    )
}

/* ---- Files an agent produced ---- */

interface ProducedFile {
    path: string
    /** What happened to it: Wrote, Edited, Drafted… */
    verb: string
}

const FILE_RE = /((?:[\w.-]+\/)*[\w-]+(?:\.[\w-]+)*\.(?:md|mdx|tsx|ts|jsx|js|css|json))\b/

/** Files named in a prompt's finished subtasks (e.g. "Wrote research/pricing.md") */
function filesOf(p: AgentPrompt): ProducedFile[] {
    const out: ProducedFile[] = []
    for (const st of p.steps) {
        if (typeof st !== "object") continue
        const m = st.done.match(FILE_RE)
        if (m && !out.some((f) => f.path === m[1])) out.push({ path: m[1], verb: st.done.split(" ")[0] })
    }
    return out.slice(-3)
}

// Verbs a prompt can start with, for "Compare …" → "Compared …"
const VERBS = new Set(
    ("add fix make write draft review summarize summarise compare tighten refactor polish speed find build create update improve design check test " +
        "clean remove rename move explain document research audit translate rewrite edit plan run set cut get put stop ship map swap trim " +
        "migrate optimize optimise debug investigate list collect gather outline prepare analyze analyse sort merge split replace reduce " +
        "show hide change convert generate send read look tidy port upgrade simplify extract wire turn give").split(" ")
)
const PAST: Record<string, string> = { write: "wrote", find: "found", make: "made", build: "built", run: "ran", set: "set", cut: "cut", get: "got", put: "put", read: "read", send: "sent", give: "gave", split: "split", rewrite: "rewrote", stop: "stopped", plan: "planned", ship: "shipped", map: "mapped", swap: "swapped", trim: "trimmed" }
const past = (w: string) => {
    const v = w.toLowerCase()
    if (PAST[v]) return PAST[v]
    if (v.endsWith("e")) return v + "d"
    if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + "ied"
    return v + "ed"
}

const GERUND: Record<string, string> = { run: "running", set: "setting", cut: "cutting", get: "getting", put: "putting", stop: "stopping", plan: "planning", ship: "shipping", map: "mapping", swap: "swapping", trim: "trimming" }
const gerund = (w: string) => {
    const v = w.toLowerCase()
    if (GERUND[v]) return GERUND[v]
    if (/[^e]e$/.test(v)) return v.slice(0, -1) + "ing"
    return v + "ing"
}

/** The line over a prompt's subtasks: "Comparing usage limits across 5 competitors" while it runs,
 *  "Compared usage limits across 5 competitors in 42s" once done */
function promptLine(p: AgentPrompt, done: boolean): string {
    const t = p.text.trim().replace(/[.!?]+$/, "")
    const took = done ? ` in ${promptTook(p)}` : ""
    const install = t.match(INSTALL_RE)
    if (install) return `${done ? "Installed" : "Installing"} ${cleanSource(install[1])}${took}`
    const [first, ...rest] = t.split(/\s+/)
    if (VERBS.has(first.toLowerCase())) {
        const v = done ? past(first) : gerund(first)
        return `${v[0].toUpperCase()}${v.slice(1)} ${rest.join(" ")}`.trim() + took
    }
    return `${done ? "Worked" : "Working"} on ${/^[A-Z][a-z]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t}${took}`
}

/** When each prompt started and finished, as seen live (kept outside React: the chat comes and goes) */
const promptTimes = new Map<string, { start?: number; end?: number }>()

/** How long a prompt took: measured when it ran while the page was open, otherwise a believable guess */
function promptTook(p: AgentPrompt): string {
    const t = promptTimes.get(p.id)
    const ms =
        t?.start != null && t.end != null
            ? t.end - t.start
            : (() => {
                  const rand = mulberry32(hashString(p.id + p.text))
                  return p.steps.reduce((a) => a + 6000 + rand() * 16000, 0)
              })()
    return formatSecs(ms, true)
}

/** "12s", "1m 5s" (at least 1s when rounding a finished time; a running timer counts from 0s) */
function formatSecs(ms: number, round = false): string {
    const sec = round ? Math.max(1, Math.round(ms / 1000)) : Math.max(0, Math.floor(ms / 1000))
    return sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m ${sec % 60}s`
}

/** What the agent says when a prompt is done: its own summary, or one written from the subtasks */
function summaryOf(p: AgentPrompt, withFiles: boolean): string | undefined {
    if (p.reply || p.steps.length === 0) return undefined
    if (p.summary) return p.summary
    const done = p.steps.map((st) => (typeof st === "object" ? st.done : st))
    const install = p.steps.find((st) => typeof st === "object" && st.install)
    if (install && p.steps.length <= 2) return `${done[0]}. ${done.length > 1 ? "They're" : "It's"} ready to use in your next prompt.`
    const tests = done.find((t) => /^\d+ (\w+ )?tests passed$/.test(t))
    const results = done.filter(
        (t) =>
            t !== tests &&
            !/^(Installed|Ready to use|Read |Reading|\d+ skills ready)/.test(t) &&
            // files get their own cards below when those are on
            !(withFiles && FILE_RE.test(t))
    )
    // "Added 34 dark tokens" reads as something the agent did (joined: "Added …, updated … and …");
    // "CLS is now 0.01" as a fact on its own. No "I" up front: the chat is the agent's anyway
    const isDeed = (t: string) => /^([A-Z][a-z]+ed|Found|Wrote|Rewrote|Built|Split|Made|Left|Kept|Ran|Drew|Cut|Set)\b/.test(t)
    const lower = (t: string) => (/^[A-Z][a-z]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t)
    const and = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}` : xs[0])
    const picked = results.slice(-3)
    const deeds = picked.filter(isDeed).map(lower)
    const facts = picked.filter((t) => !isDeed(t))
    const deedLine = deeds.length ? and(deeds) : ""
    const out = [deedLine ? `${deedLine[0].toUpperCase()}${deedLine.slice(1)}.` : "", ...facts.map((f) => `${f}.`)]
    const n = tests?.match(/^\d+/)?.[0]
    if (tests) out.push(`All ${n} tests pass.`)
    return out.filter(Boolean).join(" ") || "That's done."
}

/** A document's text, written from what the agent did for the prompt */
function docText(p: AgentPrompt, file: ProducedFile): string {
    const findings = p.steps
        .map((st) => (typeof st === "object" ? st.done : st))
        .filter((t) => !t.includes(file.path) && !/^(Installed|Ready|Read the|Reading)/.test(t))
    return [`# ${p.text}`, "", ...findings.map((f) => `- ${f}`)].join("\n")
}

function FileCard({ file, prompt }: { file: ProducedFile; prompt: AgentPrompt }) {
    const d = useD()
    const name = file.path.split("/").pop() ?? file.path
    const dir = file.path.includes("/") ? file.path.slice(0, file.path.lastIndexOf("/")) : ""
    const isDoc = /\.mdx?$/.test(name)
    // Docs: a size from what went into them. Code: a believable size of change. Same every time.
    const rand = mulberry32(hashString(file.path + prompt.id))
    const added = 6 + Math.floor(rand() * 60)
    const removed = Math.floor(rand() * 24)
    const meta = isDoc ? `${Math.max(0.6, (docText(prompt, file).length * 9) / 1024).toFixed(1)} KB` : null
    const muted = alpha(d.text, d.mutedOpacity)
    return (
        <div
            className="wuc-file"
            style={{
                display: "flex",
                alignItems: "center",
                gap: u(1.6),
                padding: `${u(1.4)} ${u(1.6)}`,
                border: `${Math.max(0.5, d.tileBorderWidth)}px solid ${d.tileBorderColor}`,
                borderRadius: u(2.5),
                maxWidth: "100%",
            }}
        >
            {/* File icon */}
            <span
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: u(5),
                    height: u(5),
                    borderRadius: u(1.4),
                    background: d.counterBg,
                    flexShrink: 0,
                }}
            >
                <svg viewBox="0 0 16 16" style={{ width: "55%", height: "55%" }} aria-hidden="true">
                    <path d="M4 1.8h5.2L12.5 5v9.2H4z M9 1.8V5.2h3.4" fill="none" stroke={alpha(d.text, 0.55)} strokeWidth="1.2" strokeLinejoin="round" />
                    {isDoc && <path d="M6 8.5h4.5 M6 10.8h3" stroke={alpha(d.text, 0.55)} strokeWidth="1.2" strokeLinecap="round" />}
                </svg>
            </span>
            <span style={{ display: "flex", flexDirection: "column", gap: u(d.fileLineGap), minWidth: 0, flex: 1 }}>
                <span style={{ ...tx(d, d.fileNameSize, 500, d.text), ...ellipsis }}>{name}</span>
                <span style={{ ...tx(d, d.fileMetaSize, 400, muted), ...ellipsis, fontVariantNumeric: "tabular-nums" }}>
                    {file.verb}
                    {dir ? ` · ${dir}` : ""}
                    {meta ? ` · ${meta}` : ""}
                    {!isDoc && (
                        <>
                            {" · "}
                            <span style={{ color: d.green }}>+{added}</span> <span style={{ color: d.red }}>−{removed}</span>
                        </>
                    )}
                </span>
            </span>
        </div>
    )
}

/** A skill library (e.g. Emil Kowalski's) as one chip, with its skills in a dropdown */
function LibraryChip({ source, label, skills }: { source: string; label: string; skills: string[] }) {
    const d = useD()
    const reduce = prefersReducedMotion()
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLSpanElement>(null)
    // Close on a click outside, or Escape (without also closing the agent)
    useEffect(() => {
        if (!open) return
        const onDown = (e: PointerEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.stopImmediatePropagation()
                setOpen(false)
            }
        }
        document.addEventListener("pointerdown", onDown)
        window.addEventListener("keydown", onKey, true)
        return () => {
            document.removeEventListener("pointerdown", onDown)
            window.removeEventListener("keydown", onKey, true)
        }
    }, [open])
    const text = alpha(d.text, 0.7)
    return (
        <span ref={ref} style={{ position: "relative", display: "inline-flex" }}>
            <button
                type="button"
                className="wuc-chip wuc-hit"
                aria-expanded={open}
                aria-haspopup="true"
                title={source}
                onClick={() => setOpen((o) => !o)}
                style={{
                    appearance: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: u(0.8),
                    padding: `${u(0.5)} ${u(1.1)} ${u(0.5)} ${u(1.3)}`,
                    borderRadius: u(d.counterRadius),
                    background: d.counterBg,
                    fontFamily: "inherit",
                    ...tx(d, d.skillsTextSize, 400, text),
                    whiteSpace: "nowrap",
                }}
            >
                <svg viewBox="0 0 16 16" style={{ width: u(d.skillsTextSize), height: u(d.skillsTextSize), flexShrink: 0 }} aria-hidden="true">
                    <path d="M3.5 2.5h7a2 2 0 0 1 2 2v9h-7a2 2 0 0 1-2-2z M3.5 11.5a2 2 0 0 1 2-2h7" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
                {label}
                <span style={{ color: alpha(d.text, 0.4), fontVariantNumeric: "tabular-nums" }}>{skills.length}</span>
                <svg
                    viewBox="0 0 16 16"
                    style={{
                        width: u(d.skillsTextSize * 0.85),
                        height: u(d.skillsTextSize * 0.85),
                        flexShrink: 0,
                        transform: open ? "rotate(180deg)" : "none",
                        transition: reduce ? "none" : `transform 200ms ${EASE_OUT}`,
                    }}
                    aria-hidden="true"
                >
                    <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
            {open && (
                <span
                    role="menu"
                    style={{
                        position: "absolute",
                        top: `calc(100% + ${u(1)})`,
                        left: 0,
                        zIndex: 5,
                        minWidth: "100%",
                        maxHeight: u(48),
                        overflowY: "auto",
                        display: "flex",
                        flexDirection: "column",
                        padding: u(1),
                        background: d.card,
                        border: `${Math.max(0.5, d.tileBorderWidth)}px solid ${d.tileBorderColor}`,
                        borderRadius: u(2.5),
                        boxShadow: "0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)",
                        // Grows from the chip it belongs to
                        transformOrigin: "top left",
                        animation: reduce ? `wuc-in-fade 150ms ${EASE_OUT}` : `wuc-pop 160ms ${EASE_OUT}`,
                    }}
                >
                    <span style={{ ...tx(d, d.skillsTextSize, 400, alpha(d.text, d.labelOpacity)), padding: `${u(0.8)} ${u(1.2)}`, whiteSpace: "nowrap" }}>
                        {source}
                    </span>
                    {skills.map((sk) => (
                        <span
                            key={sk}
                            role="menuitem"
                            style={{ ...tx(d, d.skillsTextSize, 400, d.text), padding: `${u(0.8)} ${u(1.2)}`, whiteSpace: "nowrap" }}
                        >
                            {sk}
                        </span>
                    ))}
                </span>
            )}
        </span>
    )
}

/** A skill's name in a small chip; hover shows who made it */
function SkillChip({ name, faded }: { name: string; faded?: boolean }) {
    const d = useD()
    const by = SKILL_AUTHORS[name]
    return (
        <span
            title={by ? `${name} · skill by ${by}` : `${name} skill`}
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: u(0.7),
                flexShrink: 0,
                padding: `${u(0.5)} ${u(1.3)}`,
                borderRadius: u(d.counterRadius),
                background: d.counterBg,
                opacity: faded ? 0.6 : 1,
                ...tx(d, d.skillsTextSize, 400, alpha(d.text, 0.7)),
                whiteSpace: "nowrap",
            }}
        >
            {/* Book mark, for "skill" */}
            <svg viewBox="0 0 16 16" style={{ width: u(d.skillsTextSize), height: u(d.skillsTextSize), flexShrink: 0 }} aria-hidden="true">
                <path d="M3.5 2.5h7a2 2 0 0 1 2 2v9h-7a2 2 0 0 1-2-2z M3.5 11.5a2 2 0 0 1 2-2h7" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
            {name}
        </span>
    )
}

/**
 * Progressive blur pinned to one edge of the chat. It lives inside the scrolling
 * thread (sticky), so the thread's fade mask fades the blurred content too and
 * there is no hard edge. A few stacked backdrop-blur layers, each masked to a
 * shorter band, make the blur stronger toward the edge.
 */
function EdgeBlur({
    side,
    height,
    amount,
    tint,
    tintFade,
    skip,
}: {
    side: "top" | "bottom"
    height: string
    amount: number
    /** Colour laid over the blur */
    tint?: string
    /** Length over which the tint fades out at the inner end; before that it's at full strength */
    tintFade?: string
    /** Leave this much at the outer edge without blur (it's covered anyway). Keeps the
        blur away from the tile's rounded corners, where it would smear the border. */
    skip?: string
}) {
    const layers = 4
    const dir = side === "top" ? "to bottom" : "to top"
    return (
        <div
            aria-hidden="true"
            style={{
                position: "sticky",
                [side]: 0,
                height,
                flexShrink: 0,
                // Takes no space: overlaps the start (or end) of the thread
                ...(side === "top" ? { marginBottom: `calc(-1 * (${height}))` } : { marginTop: `calc(-1 * (${height}))` }),
                pointerEvents: "none",
                zIndex: 1,
            }}
        >
            {Array.from({ length: layers }, (_, i) => {
                const end = ((layers - i) / layers) * 100
                const start = Math.max(0, end - 150 / layers)
                const mask = `linear-gradient(${dir}, #000 ${start}%, transparent ${end}%)`
                const blur = `blur(${(amount * (i + 1)) / layers}px)`
                return (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            inset: 0,
                            ...(skip ? { [side]: skip } : {}),
                            backdropFilter: blur,
                            WebkitBackdropFilter: blur,
                            maskImage: mask,
                            WebkitMaskImage: mask,
                        }}
                    />
                )
            })}
            {tint && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        background: tintFade
                            ? `linear-gradient(${dir}, ${tint} 0, ${tint} calc(100% - ${tintFade}), transparent 100%)`
                            : `linear-gradient(${dir}, ${tint}, transparent)`,
                    }}
                />
            )}
        </div>
    )
}

function AgentChat({
    agent,
    status,
    working,
    open,
    onSend,
    topInset,
    blurHeight,
    solidHeight,
}: {
    agent: Agent
    status: QueueStatus
    working: boolean
    open: boolean
    onSend: (text: string) => void
    /** Space at the top that sits behind the header */
    topInset: string
    /** How far down from the tile's top edge the blur reaches */
    blurHeight: string
    /** The solid area at the top (behind the header); the blur starts below it */
    solidHeight?: string
}) {
    const d = useD()
    const reduce = prefersReducedMotion()
    const [draft, setDraft] = useState("")
    // Mounted as the agent opens (vs. already open): its content rises in once
    const openedNow = useRef(open)
    // Whether the input was reached with Tab (then its field shows a focus ring)
    const [kbdFocus, setKbdFocus] = useState(false)
    const threadRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    // On a phone (touch, no hover) with only suggested prompts: the suggestion is already in
    // the field and the field can't be tapped (tapping it zoomed the page on iPhone); the
    // send button is all there is to press
    const [tapToSend] = useState(
        () => d.suggestionsOnly && typeof window !== "undefined" && matchMedia("(hover: none) and (pointer: coarse)").matches
    )
    const prompts = agent.prompts ?? []
    // The running prompt's timer: ticks while the agent is at work
    const [now, setNow] = useState(() => performance.now())
    const running = working && !status.finished
    useEffect(() => {
        if (!running) return
        setNow(performance.now())
        const id = setInterval(() => setNow(performance.now()), 250)
        return () => clearInterval(id)
    }, [running])

    // Start at the newest prompt, before the first paint. The header (and skills row) are
    // measured just after mounting, which adds space at the top, so this runs again then,
    // as long as the person hasn't scrolled themselves.
    const userScrolled = useRef(false)
    useLayoutEffect(() => {
        const el = threadRef.current
        if (el && !userScrolled.current) el.scrollTop = el.scrollHeight
    }, [topInset])
    // Keep the newest prompt in view when one is added (not on opening: that's handled above)
    const promptCount = useRef(prompts.length)
    useEffect(() => {
        if (prompts.length === promptCount.current) return
        promptCount.current = prompts.length
        const el = threadRef.current
        if (el && open) el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" })
    }, [prompts.length, open, reduce])

    // Subtasks folded or unfolded by hand (true = open)
    const [folded, setFolded] = useState<Record<string, boolean>>({})
    const toggleSteps = (key: string, open: boolean) => setFolded((prev) => ({ ...prev, [key]: open }))

    // A prompt finishing adds its summary at the bottom: follow it, if the chat was down there
    // (it grows in, so the scroll eases after it for as long as that takes)
    // Only the person's own scrolling decides this (not the chat easing down by itself), and
    // any scroll up at all counts: the chat then stays where they put it until they're back down
    const atBottom = useRef(true)
    const lastInput = useRef(0)
    useEffect(() => {
        const el = threadRef.current
        if (!el || !open || !atBottom.current) return
        if (reduce) {
            el.scrollTop = el.scrollHeight
            return
        }
        const until = performance.now() + d.summaryInMs + 250
        let raf = 0
        const follow = () => {
            const target = el.scrollHeight - el.clientHeight
            const left = target - el.scrollTop
            // eases in; the last couple of px in one go (scrollTop rounds, so tiny steps stall)
            el.scrollTop = Math.abs(left) < 4 ? target : el.scrollTop + left * 0.22
            // the person scrolling meanwhile takes over
            if (atBottom.current && performance.now() < until) raf = requestAnimationFrame(follow)
        }
        raf = requestAnimationFrame(follow)
        return () => cancelAnimationFrame(raf)
    }, [status.done, open, reduce])

    // Focus the chat input once the expand has finished
    useEffect(() => {
        if (!open) return
        if (tapToSend) return // nothing to focus on a phone (and focusing zooms the page)
        const id = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), reduce ? 0 : d.expandMs)
        return () => clearTimeout(id)
    }, [open, reduce, d.expandMs])

    // Suggestions not sent yet
    const sent = new Set(prompts.map((p) => p.text.toLowerCase()))

    // Up to `suggestionCount` chips. Picking one sends it, and the next suggestion
    // fades into its place, so there are always the same number.
    const pool = d.showSuggestions ? suggestionsFor(agent) : []
    // In the input: one suggestion at a time. As chips: `suggestionCount` of them.
    const chipCount = d.suggestionChips ? d.suggestionCount : 1
    const poolKey = pool.join("|")
    const nextChip = (shown: string[], alsoSent: string[] = []) => {
        const taken = new Set([...shown, ...alsoSent].map((t) => t.toLowerCase()))
        const fresh = pool.find((t) => !taken.has(t.toLowerCase()) && !sent.has(t.toLowerCase()))
        // Everything sent: offer the prompts again (installs only once)
        return fresh ?? pool.find((t) => !taken.has(t.toLowerCase()) && !INSTALL_RE.test(t))
    }
    const fill = (keep: string[]) => {
        const out = [...keep]
        while (out.length < chipCount) {
            const n = nextChip(out)
            if (!n) break
            out.push(n)
        }
        return out
    }
    const [chips, setChips] = useState<string[]>(() =>
        fill(pool.filter((t) => !sent.has(t.toLowerCase())).slice(0, chipCount))
    )
    const [freshChips, setFreshChips] = useState<Set<string>>(new Set())
    // Drop chips that no longer fit (e.g. that package got installed) and top up
    useEffect(() => {
        setChips((cur) => {
            const valid = cur.filter((t) => pool.includes(t) && !(INSTALL_RE.test(t) && sent.has(t.toLowerCase()))).slice(0, chipCount)
            const next = fill(valid)
            if (next.join("|") === cur.join("|")) return cur
            setFreshChips(new Set(next.filter((t) => !cur.includes(t))))
            return next
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [poolKey, chipCount])
    const pickChip = (text: string, i: number) => {
        onSend(text)
        const others = chips.filter((_, j) => j !== i)
        const replacement = nextChip(others, [text])
        setChips((cur) => {
            const next = [...cur]
            if (replacement) next[i] = replacement
            else next.splice(i, 1)
            return next
        })
        if (replacement) setFreshChips(new Set([replacement]))
    }

    // The suggestion shown inside the empty input
    const inlineTip = !d.suggestionChips && !draft.trim() ? chips[0] : undefined
    const send = () => {
        const text = (tapToSend ? inlineTip ?? "" : draft).trim()
        // A suggestion taken in with Tab (and sent as is): the next one takes its place
        const slot = chips.findIndex((c) => c.toLowerCase() === text.toLowerCase())
        if (text && slot >= 0) {
            pickChip(chips[slot], slot)
            setDraft("")
            return
        }
        if (!text) return
        onSend(text)
        setDraft("")
    }


    // Prompts already there when the chat opened don't animate; new ones come in staggered
    const initialIds = useRef(new Set(prompts.map((p) => p.id)))
    // Prompts already finished when the chat opened (their file cards don't animate in)
    // The latest prompt when the chat opened: its subtasks start unfolded, even if it's done
    const lastAtOpen = useRef([...prompts].reverse().find((p) => p.steps.length > 0)?.id)
    const doneAtOpen = useRef(
        (() => {
            const ids = new Set<string>()
            let end = 0
            for (const p of prompts) {
                end += p.steps.length
                if (end <= status.done) ids.add(p.id)
            }
            return ids
        })()
    )
    const enter = (isNew: boolean, i: number): CSSProperties =>
        isNew
            ? {
                  animation: `${reduce ? "wuc-in-fade" : "wuc-in"} ${d.promptInMs}ms ${EASE_OUT} both`,
                  // stagger: capped, so a long plan doesn't take ages to land (≤180ms with the fixes)
                  animationDelay: `${d.a11yFixes ? Math.min(i * d.promptStaggerMs, 180) : i * d.promptStaggerMs}ms`,
              }
            : {}

    let offset = 0
    return (
        <>
            <div
                ref={threadRef}
                className="wuc-thread"
                onWheel={() => {
                    userScrolled.current = true
                    lastInput.current = performance.now()
                }}
                onScroll={(e) => {
                    // scrolls the person made (wheel, trackpad momentum, touch, keys, scrollbar)
                    if (performance.now() - lastInput.current > 400) return
                    const el = e.currentTarget
                    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 2
                }}
                onTouchMove={() => {
                    userScrolled.current = true
                    lastInput.current = performance.now()
                }}
                onKeyDown={() => (lastInput.current = performance.now())}
                onPointerDown={() => (lastInput.current = performance.now())}
                onPointerMove={(e) => {
                    if (e.buttons) lastInput.current = performance.now() // dragging the scrollbar
                }}
                style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    // Solid behind the blur (blurring over transparency darkens text)
                    background: d.tileFill ? d.tileBg : d.card,
                    // Rounded like the tile's top corners (inside its border)
                    borderTopLeftRadius: `max(0px, calc(${u(d.tileRadius)} - ${d.tileBorderWidth}px))`,
                    borderTopRightRadius: `max(0px, calc(${u(d.tileRadius)} - ${d.tileBorderWidth}px))`,
                }}
            >
                {/* Pinned to the top edge: content scrolling up behind the header gets blurred, strongest at the edge */}
                {d.threadBlur > 0 && (
                    <EdgeBlur
                        side="top"
                        height={blurHeight}
                        amount={d.threadBlur}
                        tint={d.threadBlurTintOpacity > 0 ? alpha(d.threadBlurTint, d.threadBlurTintOpacity) : undefined}
                        // Full strength behind the header; fades out over the part below it
                        tintFade={u(d.threadBlurHeight)}
                        skip={solidHeight}
                    />
                )}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: u(d.threadGap),
                        // Opening: the chat content fades in first, the input follows (rising).
                        // A fade only here: moving it would change how far the chat can scroll
                        // mid-animation, which nudged the content. Its own opacity, not an
                        // ancestor's, so the blur above it isn't affected.
                        ...(openedNow.current && open
                            ? { animation: `wuc-in-fade ${d.chatInMs}ms ${EASE_OUT} ${d.chatInDelayMs}ms both` }
                            : {}),
                        // At rest the first prompt sits just below the header, as before
                        // Bottom: room above the input at rest (scrolled content runs on behind it)
                        padding: `calc(${topInset} + ${u(1)}) ${u(d.tilePadding)} calc(${u(3)} + ${u(d.composerGap)})`,
                        flexShrink: 0,
                    }}
                >
                    {prompts.length === 0 && (
                        <span style={{ ...tx(d, d.threadTextSize, 400, alpha(d.text, d.mutedOpacity)), fontSize: uc(d, d.threadTextSize), whiteSpace: "normal" }}>
                            No tasks yet. Ask {agent.name} to do something.
                        </span>
                    )}
                    {prompts.map((p) => {
                        const startIdx = offset
                        offset += p.steps.length
                        const isNew = !initialIds.current.has(p.id)
                        return (
                            <div key={p.id} style={{ display: "flex", flexDirection: "column", gap: u(d.bubbleGap) }}>
                                <div
                                    style={{
                                        ...enter(isNew, 0),
                                        alignSelf: "flex-end",
                                        maxWidth: "85%",
                                        background: d.bubbleBg,
                                        borderRadius: u(2.5),
                                        padding: `${u(1.6)} ${u(2.2)}`,
                                        fontSize: uc(d, d.threadTextSize),
                                        lineHeight: 1.35,
                                        letterSpacing: `${d.tracking}em`,
                                        color: d.text,
                                        whiteSpace: "pre-wrap",
                                        overflowWrap: "anywhere",
                                    }}
                                >
                                    {p.text}
                                </div>
                                {(() => {
                                    // A line over the subtasks ("Comparing …" while running, "Compared … in 42s" when
                                    // done) that folds and unfolds them. Finishing doesn't fold them; prompts that
                                    // were already done when the chat opened start folded
                                    const folds = d.collapseSteps && !p.reply && p.steps.length > 0
                                    const finished = startIdx + p.steps.length <= status.done
                                    const key = p.id
                                    const open = !folds || (folded[key] ?? (p.id === lastAtOpen.current || !doneAtOpen.current.has(p.id)))
                                    const ease = reduce ? "0ms" : `${d.collapseMs}ms ${EASE_OUT}`
                                    return (
                                        <div style={{ display: "flex", flexDirection: "column" }}>
                                            {folds && (
                                                <button
                                                    className="wuc-fold"
                                                    onClick={() => toggleSteps(key, !open)}
                                                    aria-expanded={open}
                                                    style={{
                                                        appearance: "none",
                                                        background: "none",
                                                        border: "none",
                                                        padding: 0,
                                                        font: "inherit",
                                                        textAlign: "left",
                                                        cursor: "pointer",
                                                        alignSelf: "flex-start",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: u(1),
                                                        maxWidth: "100%",
                                                        ...enter(isNew, 1),
                                                    }}
                                                >
                                                    <span style={{ ...tx(d, d.subtaskSize, 400, "currentColor"), fontSize: `calc(${uc(d, d.subtaskSize)} + ${d.foldTextBoost}px)`, ...ellipsis }}>
                                                        {/* the shimmer of the running subtask runs through it while the agent is on this prompt */}
                                                        <span className={working && status.done >= startIdx && !finished ? "wuc-shimmer" : undefined}>
                                                            {promptLine(p, finished)}
                                                        </span>
                                                        {/* how long it's been going, counting up (the "in 12s" once done) */}
                                                        {!finished && status.done >= startIdx && promptTimes.get(p.id)?.start != null && (
                                                            <span style={{ fontVariantNumeric: "tabular-nums" }}> {formatSecs(now - promptTimes.get(p.id)!.start!)}</span>
                                                        )}
                                                    </span>
                                                    <svg
                                                        viewBox="0 0 16 16"
                                                        aria-hidden="true"
                                                        style={{
                                                            width: uc(d, d.subtaskSize * 0.8),
                                                            height: uc(d, d.subtaskSize * 0.8),
                                                            flexShrink: 0,
                                                            transform: open ? "rotate(90deg)" : undefined,
                                                            transition: `transform ${ease}`,
                                                        }}
                                                    >
                                                        <path d="M6 3.5 L10.5 8 L6 12.5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </button>
                                            )}
                                            {/* Folding: the rows' space closes up (grid 1fr → 0fr) */}
                                            <div
                                                style={{
                                                    display: "grid",
                                                    gridTemplateRows: open ? "1fr" : "0fr",
                                                    overflow: "hidden",
                                                    // room for the last row's descenders inside the clip, given back below
                                                    marginBottom: open ? `calc(-1 * ${u(1)})` : 0,
                                                    transition: `grid-template-rows ${ease}, margin-bottom ${ease}`,
                                                }}
                                            >
                                                {/* no padding on the grid item itself: padding can't shrink to 0fr */}
                                                <div style={{ minHeight: 0, opacity: open ? 1 : 0, transition: `opacity ${ease}` }}>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        gap: u(d.subtaskGap),
                                                        paddingTop: folds ? u(d.subtaskGap) : 0,
                                                        paddingBottom: u(1),
                                                    }}
                                                >
                                                    {p.steps.map((s, i) => {
                                                        const gi = startIdx + i
                                                        const state = gi < status.done ? "done" : gi === status.done && working ? "current" : "pending"
                                                        return (
                                                            // The bubble first, then each subtask a beat later
                                                            <div key={i} style={enter(isNew, i + 2)}>
                                                                <StepRow step={s} state={state} progress={state === "current" ? status.progress : 0} />
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })()}
                                {p.reply && (
                                    // The agent's answer, on the left like its work
                                    <div
                                        style={{
                                            ...enter(isNew, 1),
                                            ...tx(d, d.threadTextSize, 400, alpha(d.text, 0.85)),
                                            fontSize: uc(d, d.threadTextSize),
                                            whiteSpace: "normal",
                                            lineHeight: 1.45,
                                            maxWidth: "85%",
                                        }}
                                    >
                                        {p.reply}
                                    </div>
                                )}
                                {/* The agent's summary, once the prompt is done */}
                                {d.showSummary && startIdx + p.steps.length <= status.done && summaryOf(p, d.showFiles) && (
                                    // In place at once, the text fading in (like a terminal printing its answer)
                                    <div
                                        style={{
                                            display: "grid",
                                            gridTemplateRows: "1fr",
                                            marginTop: `calc(-1 * ${u(d.bubbleGap)})`,
                                            // the text box is trimmed at the baseline: room for descenders inside the clip
                                            marginBottom: `calc(-1 * ${u(1.5)})`,
                                        }}
                                    >
                                        <div style={{ minHeight: 0, overflow: "hidden" }}>
                                            <div
                                                style={{
                                                    ...tx(d, d.threadTextSize, 400, alpha(d.text, 0.85)),
                                                    fontSize: uc(d, d.threadTextSize),
                                                    whiteSpace: "normal",
                                                    lineHeight: 1.45,
                                                    maxWidth: "92%",
                                                    paddingTop: `calc(${u(d.bubbleGap)} + ${u(0.5)})`,
                                                    paddingBottom: u(1.5),
                                                    ...(doneAtOpen.current.has(p.id)
                                                        ? {}
                                                        : {
                                                              // its space is there at once; the text just fades in, in place
                                                              animation: `wuc-in-fade ${d.summaryInMs}ms ${EASE_OUT} both`,
                                                          }),
                                                }}
                                            >
                                                {summaryOf(p, d.showFiles)}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {/* Files the prompt produced, once it's done */}
                                {d.showFiles && startIdx + p.steps.length <= status.done && filesOf(p).length > 0 && (
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: u(1),
                                            marginTop: u(0.5),
                                            ...(doneAtOpen.current.has(p.id)
                                                ? {}
                                                : { animation: `${reduce ? "wuc-in-fade" : "wuc-in"} ${d.promptInMs}ms ${EASE_OUT} both` }),
                                        }}
                                    >
                                        {filesOf(p).map((f) => (
                                            <FileCard key={f.path} file={f} prompt={p} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {d.suggestionChips && chips.length > 0 && (
                // Example prompts that suit this agent; tapping one sends it
                <div
                    className="wuc-scroll"
                    style={{
                        display: "flex",
                        gap: u(1),
                        overflowX: "auto",
                        flexShrink: 0,
                        marginTop: u(d.composerGap),
                        paddingInline: u(d.tilePadding),
                        // Fade at the right edge when the row runs past it
                        maskImage: `linear-gradient(to right, #000 calc(100% - ${u(d.tilePadding + 2)}), transparent 100%)`,
                        WebkitMaskImage: `linear-gradient(to right, #000 calc(100% - ${u(d.tilePadding + 2)}), transparent 100%)`,
                    }}
                >
                    {chips.map((text, i) => (
                        <button
                            key={text}
                            type="button"
                            className="wuc-chip"
                            onClick={() => pickChip(text, i)}
                            style={{
                                // A new suggestion fades in where the picked one was
                                ...(freshChips.has(text) && !reduce
                                    ? { animation: `wuc-chip-in ${d.suggestionInMs}ms ${EASE_OUT} both` }
                                    : freshChips.has(text)
                                      ? { animation: `wuc-in-fade ${d.suggestionInMs}ms ${EASE_OUT} both` }
                                      : {}),
                                appearance: "none",
                                border: "none",
                                cursor: "pointer",
                                flexShrink: 0,
                                whiteSpace: "nowrap",
                                fontFamily: "inherit",
                                fontSize: ut(d.suggestionSize),
                                letterSpacing: `${d.tracking}em`,
                                color: alpha(d.text, 0.75),
                                padding: `${u(1.2)} ${u(2)}`,
                                borderRadius: u(d.suggestionRadius),
                            }}
                        >
                            {text}
                        </button>
                    ))}
                    {/* Room to scroll the last chip clear of the fade */}
                    <span style={{ flexShrink: 0, width: u(2) }} />
                </div>
            )}

            {/* Not a <form>: sandboxed previews (and some hosts) block form submission,
                so Enter and the button send directly */}
            <div
                role="group"
                aria-label={`Message ${agent.name}`}
                className="wuc-composer"
                data-kbd={kbdFocus ? "" : undefined}
                style={{
                    // Opening: comes in after the chat content
                    ...(openedNow.current && open
                        ? {
                              animation: `${reduce ? "wuc-in-fade" : "wuc-in-rise"} ${d.chatInMs}ms ${EASE_OUT} ${d.chatInDelayMs + d.chatInStaggerMs}ms both`,
                          }
                        : {}),
                    display: "flex",
                    alignItems: "center",
                    gap: u(1.5),
                    // wcag-contrast (1.4.11): the field's edge at 3:1 when the fixes are on
                    border: `${Math.max(0.5, d.tileBorderWidth)}px solid ${d.a11yFixes ? d.inputBorderColor : d.tileBorderColor}`,
                    borderRadius: u(d.composerRadius),
                    padding: `${u(1)} ${u(1)} ${u(1)} ${u(2.2)}`,
                    background: d.inputBg,
                    flexShrink: 0,
                    // The chat scrolls right up to the input; the gap lives inside the chat instead
                    marginTop: d.suggestionChips && chips.length > 0 ? u(d.suggestionGap) : 0,
                    marginInline: u(d.tilePadding),
                }}
            >
                <div style={{ position: "relative", flex: 1, minWidth: 0, display: "flex" }}>
                {inlineTip && (
                    // One suggestion, shown in the empty input; Tab fills it in, Enter sends it.
                    // A new one fades in after each is used.
                    <span
                        key={inlineTip}
                        aria-hidden="true"
                        style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            gap: u(1.5),
                            pointerEvents: "none",
                            fontSize: uc(d, d.inputTextSize),
                            letterSpacing: `${d.tracking}em`,
                            color: tapToSend ? d.text : alpha(d.text, d.labelOpacity),
                            animation: freshChips.has(inlineTip)
                                ? `${reduce ? "wuc-in-fade" : "wuc-chip-in"} ${d.suggestionInMs}ms ${EASE_OUT} both`
                                : undefined,
                        }}
                    >
                        <span style={{ ...ellipsis, minWidth: 0 }}>{inlineTip}</span>
                        {!tapToSend && <span
                            style={{
                                flexShrink: 0,
                                padding: `${u(0.3)} ${u(1)}`,
                                borderRadius: u(d.counterRadius),
                                background: d.tabHintBg,
                                boxShadow: d.tabHintBorderWidth ? `inset 0 0 0 ${d.tabHintBorderWidth}px ${d.tabHintBorderColor}` : undefined,
                                fontSize: ut(d.tabHintSize),
                                color: d.tabHintTextColor,
                            }}
                        >
                            Tab
                        </span>}
                    </span>
                )}
                <input
                    ref={inputRef}
                    className="wuc-input"
                    value={draft}
                    // suggestionsOnly: nothing can be typed (but it still takes focus and shows the
                    // caret, unlike readOnly); Tab takes the suggestion in, Backspace clears it
                    // again, Enter sends it. inputMode "none": no on-screen keyboard on phones.
                    onChange={(e) => !d.suggestionsOnly && setDraft(e.target.value)}
                    onBeforeInput={(e) => d.suggestionsOnly && e.preventDefault()}
                    onPaste={(e) => d.suggestionsOnly && e.preventDefault()}
                    onDrop={(e) => d.suggestionsOnly && e.preventDefault()}
                    inputMode={d.suggestionsOnly ? "none" : undefined}
                    onFocus={() => setKbdFocus(lastKeyWasTab)}
                    onBlur={() => setKbdFocus(false)}
                    onKeyDown={(e) => {
                        // Tab takes the suggestion into the input, to edit or send
                        if (e.key === "Tab" && !e.shiftKey && inlineTip) {
                            e.preventDefault()
                            setDraft(inlineTip)
                            return
                        }
                        if (d.suggestionsOnly && (e.key === "Backspace" || e.key === "Delete" || e.key === "Escape") && draft) {
                            e.preventDefault()
                            setDraft("")
                            return
                        }
                        // Enter sends (but not while an input method is composing a character)
                        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                            e.preventDefault()
                            send()
                        }
                    }}
                    enterKeyHint="send"
                    readOnly={tapToSend}
                    tabIndex={tapToSend ? -1 : undefined}
                    aria-hidden={tapToSend || undefined}
                    placeholder={inlineTip || d.suggestionsOnly ? "" : d.composerPlaceholder.replace("{name}", agent.name)}
                    aria-label={inlineTip ? `Message ${agent.name}. Suggestion: ${inlineTip}. Press Tab to use it` : `Message ${agent.name}`}
                    style={{
                        flex: 1,
                        width: "100%",
                        minWidth: 0,
                        border: "none",
                        outline: "none",
                        background: "transparent",
                        fontFamily: "inherit",
                        fontSize: uc(d, d.inputTextSize),
                        letterSpacing: `${d.tracking}em`,
                        color: d.text,
                        padding: `${u(1)} 0`,
                        pointerEvents: tapToSend ? "none" : undefined,
                    }}
                />
                </div>
                <button
                    type="button"
                    onClick={send}
                    aria-label={tapToSend && inlineTip ? `Send: ${inlineTip}` : "Send"}
                    className="wuc-send"
                    // Only sends what's in the input: a suggestion has to be taken in with Tab first
                    disabled={!(tapToSend ? inlineTip : draft.trim())}
                    style={{
                        appearance: "none",
                        border: "none",
                        cursor: (tapToSend ? inlineTip : draft.trim()) ? "pointer" : "default",
                        width: u(5.5),
                        height: u(5.5),
                        borderRadius: u(d.sendRadius),
                        background: d.text,
                        color: d.card,
                        opacity: (tapToSend ? inlineTip : draft.trim()) ? 1 : 0.2,
                        transition: "opacity 150ms ease",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        padding: 0,
                    }}
                >
                    <svg viewBox="0 0 24 24" style={{ width: "52%", height: "52%" }} aria-hidden="true">
                        <path
                            d="M12 19 V5 M5.5 11.5 L12 5 L18.5 11.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.4}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
            </div>
        </>
    )
}

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

export interface WeeklyUsageCardProps extends Partial<CardContent> {
    /** Any design values to override (see DEFAULT_DESIGN) */
    design?: Partial<Design>
    defaultTab?: AgentStatus
    /** Icon next to the model name when `showModelIcon` is on */
    modelIcon?: ReactNode
    /** Called when chatting adds a prompt. Without it the card keeps its own copy of the agents. */
    onAgentsChange?: (agents: Agent[]) => void
    sectionRef?: Ref<HTMLElement>
    /** Opens this agent's chat as soon as the card is on screen (e.g. for a side-by-side video) */
    openAgentId?: string
    style?: CSSProperties
}

export function WeeklyUsageCard({
    used = DEFAULT_CONTENT.used,
    projected = DEFAULT_CONTENT.projected,
    daysUntilReset = DEFAULT_CONTENT.daysUntilReset,
    agents: agentsProp = DEFAULT_CONTENT.agents,
    design,
    defaultTab = "active",
    modelIcon,
    onAgentsChange,
    sectionRef,
    style,
    openAgentId,
}: WeeklyUsageCardProps) {
    const d = useMemo(() => withFixes({ ...DEFAULT_DESIGN, ...fixHexColors(design), a11yFixes: true }), [design])
    const dRef = useRef(d)
    dRef.current = d

    // Agents: controlled through onAgentsChange, or kept here
    const [localAgents, setLocalAgents] = useState(agentsProp)
    const agents = onAgentsChange ? agentsProp : localAgents
    const agentsRef = useRef(agents)
    agentsRef.current = agents
    const updateAgents = (fn: (list: Agent[]) => Agent[]) => {
        const next = fn(agentsRef.current)
        if (onAgentsChange) onAgentsChange(next)
        else setLocalAgents(next)
    }

    const [tab, setTab] = useState<AgentStatus>(defaultTab)

    // Live mode: usage each agent added since load, in % points
    const [growth, setGrowth] = useState<Record<string, number>>({})
    const totalGrowth = Object.values(growth).reduce((a, b) => a + b, 0)

    // Usage rises by `usageGain` in total, spread evenly over the subtasks still to do at
    // load, plus `promptUsageGain` for every prompt sent in a chat, spread over that prompt's
    // subtasks: the more prompts are sent, the further it climbs (in whole % points)
    const start = useRef<Record<string, { done: number; total: number }> | null>(null)
    if (!start.current) {
        start.current = {}
        for (const a of agents) {
            const total = stepsOf(a).length
            const done = Math.min(a.status === "active" ? (a.tasksDone ?? 0) : (a.tasksDone ?? total), total)
            start.current[a.id] = { done, total }
        }
    }
    const finished = useRef<Record<string, number>>({})
    const gained = useRef(0)
    const handleTaskComplete = useCallback((agentId: string) => {
        const st = start.current![agentId] ?? { done: 0, total: 0 }
        const a = agentsRef.current.find((x) => x.id === agentId)
        if (!a) return
        finished.current[agentId] = (finished.current[agentId] ?? 0) + 1
        const index = st.done + finished.current[agentId] - 1 // the subtask that just finished
        if (index < st.total) {
            // Work that was there at load
            let toDo = 0
            for (const s of Object.values(start.current!)) toDo += Math.max(0, s.total - s.done)
            if (toDo > 0) gained.current += dRef.current.usageGain / toDo
        } else {
            // Work from a prompt sent since: that prompt's share of usage, per subtask
            let at = 0
            for (const pr of a.prompts ?? []) {
                if (index < at + pr.steps.length) {
                    gained.current += dRef.current.promptUsageGain / pr.steps.length
                    break
                }
                at += pr.steps.length
            }
        }
        const target = Math.floor(gained.current + 1e-9)
        setGrowth((g) => {
            const sum = Object.values(g).reduce((x, y) => x + y, 0)
            if (sum >= target) return g
            return { ...g, [agentId]: (g[agentId] ?? 0) + (target - sum) }
        })
    }, [])

    // Live progress of each looping agent, reported by its task list
    const [statuses, setStatuses] = useState<Record<string, QueueStatus>>({})
    const reportStatus = useCallback((id: string, s: QueueStatus) => {
        setStatuses((prev) => {
            const p = prev[id]
            if (p && p.done === s.done && p.finished === s.finished && p.progress === s.progress) return prev
            return { ...prev, [id]: s }
        })
    }, [])

    // Note when each prompt starts and finishes, for the "… in 42s" once it's done
    useEffect(() => {
        const now = performance.now()
        for (const a of agents) {
            const s = statuses[a.id]
            if (!s) continue
            let at = 0
            for (const p of a.prompts ?? []) {
                const t = promptTimes.get(p.id) ?? {}
                const from = at
                at += p.steps.length
                // a start that was seen; a prompt already under way when first seen gets one estimated
                // from the subtasks it has done (so its timer doesn't start at 0 halfway through)
                if (t.start == null && !s.finished && s.done >= from && s.done < at)
                    promptTimes.set(p.id, { start: now - (s.done - from) * 1500 })
                else if (t.start != null && t.end == null && s.done >= at) promptTimes.set(p.id, { ...t, end: now })
            }
        }
    }, [statuses, agents])

    const isLooping = (a: Agent) => d.live && a.status === "active" && stepsOf(a).length > 0
    const statusOf = (a: Agent): QueueStatus => {
        const total = stepsOf(a).length
        if (isLooping(a)) {
            const s = statuses[a.id]
            if (s) return s
            const dn = Math.min(a.tasksDone ?? 0, total)
            return { done: dn, finished: total > 0 && dn >= total, progress: a.currentProgress ?? 0 }
        }
        // Not running: idle agents have finished everything unless told otherwise
        const dn = Math.min(a.tasksDone ?? (a.status === "idle" ? total : 0), total)
        return { done: dn, finished: total > 0 && dn >= total, progress: a.currentProgress ?? 0 }
    }

    const currentUsed = Math.min(100, used + totalGrowth)
    // Using more this week means a faster pace: the projection grows in proportion
    const currentProjected = used > 0 ? Math.round((projected * currentUsed) / used) : projected + totalGrowth
    const pace = getPace(d, currentUsed, currentProjected)
    // The bar starts full; it only fills further when usage goes up
    const animatedUsed = useAnimatedNumber(currentUsed, d.bigCountMs, false)

    // All tiles stay mounted; the tabs only hide/show them. Switching tabs then shows
    // the numbers as they are (no count-up) and task loops keep running.
    const sortedAgents = useMemo(
        () =>
            [...agents]
                .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.share - a.share)
                .map((a) => (growth[a.id] ? { ...a, share: a.share + growth[a.id] } : a)),
        [agents, growth]
    )
    const icon = d.showModelIcon ? (modelIcon ?? <ClaudeIcon />) : null

    /* ---- Expand an agent ---- */
    const sectionEl = useRef<HTMLElement | null>(null)
    // Each tile sits in a slot; while its tile is lifted the slot keeps the space
    const slotEls = useRef<Record<string, HTMLElement | null>>({})
    const [detail, setDetail] = useState<{ id: string; from: Box; full: Box } | null>(null)
    const [detailOpen, setDetailOpen] = useState(false)
    const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

    // Which tab each agent belongs in: "active" (Working) while it has subtasks to do,
    // "idle" (Ready) once everything is done. A finished agent stays in Working for a
    // beat (so you see the check), then leaves; a new prompt moves it back at once.
    const workingNow = (a: Agent) => a.status === "active" && !statusOf(a).finished
    const [ready, setReady] = useState<Record<string, true>>(() =>
        Object.fromEntries(agents.filter((a) => !workingNow(a)).map((a) => [a.id, true as const]))
    )
    const [leaving, setLeaving] = useState<Record<string, true>>({})
    const moveTimers = useRef<Record<string, ReturnType<typeof setTimeout>[]>>({})
    const openId = detail?.id
    const workingKey = agents.map((a) => a.id + (workingNow(a) ? "1" : "0")).join(",")
    // Screen readers hear when an agent finishes or starts (a polite status message)
    const [announcement, setAnnouncement] = useState("")
    const wasWorking = useRef<Record<string, boolean> | null>(null)
    useEffect(() => {
        const now = Object.fromEntries(agents.map((a) => [a.id, workingNow(a)]))
        const before = wasWorking.current
        wasWorking.current = now
        if (!before) return
        const msgs = agents
            .filter((a) => a.id in before && before[a.id] !== now[a.id])
            .map((a) => (now[a.id] ? `${a.name} started working` : `${a.name} finished. Ready for the next prompt`))
        if (msgs.length) setAnnouncement(msgs.join(". "))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workingKey])
    useEffect(() => {
        for (const a of agents) {
            const timers = moveTimers.current
            if (workingNow(a)) {
                // Back to work: cancel a pending move and return to Working right away
                timers[a.id]?.forEach(clearTimeout)
                delete timers[a.id]
                setReady((r) => (r[a.id] ? omit(r, a.id) : r))
                setLeaving((l) => (l[a.id] ? omit(l, a.id) : l))
            } else if (!ready[a.id] && !timers[a.id] && (openId !== a.id || !d.showToggle)) {
                // With tabs, an open agent stays in its tab until it's closed, so it closes back
                // into its slot. In one list it moves on while open: the list holds its order
                // while an agent is open, so it doesn't show, and closing it then changes nothing
                // (instead of the card going up to the working agents and back down after)
                const { moveToReadyMs, moveOutMs } = dRef.current
                const out = prefersReducedMotion() ? 0 : moveOutMs
                timers[a.id] = [
                    setTimeout(() => setLeaving((l) => ({ ...l, [a.id]: true })), moveToReadyMs),
                    setTimeout(() => {
                        delete timers[a.id]
                        setReady((r) => ({ ...r, [a.id]: true }))
                        setLeaving((l) => omit(l, a.id))
                    }, moveToReadyMs + out),
                ]
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workingKey, openId])
    useEffect(() => () => Object.values(moveTimers.current).flat().forEach(clearTimeout), [])
    const tabOf = (a: Agent): AgentStatus => (ready[a.id] ? "idle" : "active")
    const useTabs = d.showToggle
    const shown = (a: Agent) => !useTabs || tabOf(a) === tab
    const hasVisible = sortedAgents.some(shown)
    // One list: working agents first (a finished one moves down after its pause), then by share
    const sortedList = useTabs
        ? sortedAgents
        : [...sortedAgents].sort((a, b) => (ready[a.id] ? 1 : 0) - (ready[b.id] ? 1 : 0))
    // While an agent is open the list keeps its order: moving the open card in the DOM
    // would reset its chat's scroll and replay its entrance. The new order (and its glide)
    // follows once it closes.
    const heldOrder = useRef<string[]>([])
    if (!detail) heldOrder.current = sortedList.map((a) => a.id)
    const listAgents = detail
        ? [...sortedList].sort((a, b) => {
              const i = heldOrder.current.indexOf(a.id), j = heldOrder.current.indexOf(b.id)
              return (i < 0 ? Infinity : i) - (j < 0 ? Infinity : j)
          })
        : sortedList
    const orderKey = listAgents.map((a) => a.id).join(",")

    // Reordering glides: each card starts where it was and slides to its new spot.
    // Positions are read during the render that changes the order (the DOM still
    // shows the old order then), and compared after the new layout.
    const topOf = (el: HTMLElement) => {
        // Screen px → layout px (the card may be scaled)
        const scale = el.getBoundingClientRect().height / (el.offsetHeight || 1) || 1
        return el.getBoundingClientRect().top / scale
    }
    const prevOrder = useRef(orderKey)
    const beforeTops = useRef<Record<string, number> | null>(null)
    if (prevOrder.current !== orderKey) {
        prevOrder.current = orderKey
        const tops: Record<string, number> = {}
        for (const a of listAgents) {
            const el = slotEls.current[a.id]
            if (el) tops[a.id] = topOf(el)
        }
        beforeTops.current = tops
    }
    useLayoutEffect(() => {
        const before = beforeTops.current
        beforeTops.current = null
        if (!before || useTabs || prefersReducedMotion()) return
        // Cards that moved, and how far
        const moves: { el: HTMLElement; dy: number }[] = []
        for (const a of listAgents) {
            const el = slotEls.current[a.id]
            if (!el || before[a.id] === undefined || detail?.id === a.id || typeof el.animate !== "function") continue
            const dy = before[a.id] - topOf(el)
            if (Math.abs(dy) >= 0.5) moves.push({ el, dy })
        }
        if (!moves.length) return
        // A longer trip takes longer: `reorderMs` for one place, +45% for each place
        // beyond that (up to 2.5×). Every card in the same reorder shares the duration,
        // so they move as one and land together.
        const slot = moves[0].el.offsetHeight * 1.1 || 1
        const places = Math.max(...moves.map((m) => Math.abs(m.dy) / slot))
        const duration = dRef.current.reorderMs * Math.min(2.5, 1 + 0.45 * Math.max(0, places - 1))
        for (const { el, dy } of moves) {
            el.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], {
                duration,
                // Same curve as opening and closing an agent
                easing: EXPAND_EASE,
            })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderKey, useTabs])

    // Only `maxVisibleTiles` cards show at once; the list scrolls for the rest,
    // with a soft fade on the side where more cards are hidden
    const listEl = useRef<HTMLDivElement | null>(null)
    const [listMax, setListMax] = useState<number | null>(null)
    const [listEdges, setListEdges] = useState({ top: false, bottom: false })
    // The list's edge blur fades in with the scroll (set straight on the element, no re-render)
    const listBlurEl = useRef<HTMLDivElement>(null)
    const revealListBlur = () => {
        const el = listEl.current, blur = listBlurEl.current
        if (!el || !blur) return
        const { listBlurReveal, listBlurHeight } = dRef.current
        const perU = (blur.firstElementChild as HTMLElement | null)?.offsetHeight ?? 0
        const px = listBlurReveal * (perU / Math.max(0.01, listBlurHeight))
        blur.style.opacity = String(px > 0 ? Math.min(1, el.scrollTop / px) : 1)
    }
    // after every render too (React would otherwise put back the opacity it was given)
    useLayoutEffect(revealListBlur)
    const updateEdges = () => {
        const el = listEl.current
        if (!el) return
        revealListBlur()
        const top = el.scrollTop > 1
        const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1
        setListEdges((e) => (e.top === top && e.bottom === bottom ? e : { top, bottom }))
        // Scrollbar thumb: its length shows how much of the list is in view
        const range = el.scrollHeight - el.clientHeight
        const h = range > 0 ? Math.max(24, (el.clientHeight / el.scrollHeight) * el.clientHeight) : 0
        const y = range > 0 ? (el.scrollTop / range) * (el.clientHeight - h) : 0
        setThumb((t) => (Math.abs(t.h - h) < 0.5 && Math.abs(t.y - y) < 0.5 ? t : { h, y }))
    }
    const [thumb, setThumb] = useState({ h: 0, y: 0 })
    // Snapping to whole cards, done here rather than with CSS scroll snap: CSS snap
    // follows the snapped card when the list reorders, which scrolled the list by itself
    const dragging = useRef(false)
    const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    // True while the list glides onto a card by itself: its own scroll events are ignored,
    // so settling never re-triggers itself
    const settling = useRef(false)
    const detailRef = useRef(detail)
    detailRef.current = detail
    const settleListRef = useRef<() => void>(() => {})
    const settleList = () => {
        const el = listEl.current
        if (!el || dragging.current) return
        const slot = [...el.children].find((c) => (c as HTMLElement).style.display !== "none") as HTMLElement | undefined
        if (!slot) return
        const step = listStep(el)
        const maxTop = el.scrollHeight - el.clientHeight
        // At either end there's nothing to settle (the ends are whole-card positions already)
        if (el.scrollTop <= 1 || el.scrollTop >= maxTop - 1) return
        const target = Math.round(Math.min(maxTop, Math.round(el.scrollTop / step) * step))
        if (Math.abs(target - el.scrollTop) <= 1.5) return
        settling.current = true
        el.scrollTo({ top: target, behavior: prefersReducedMotion() ? "auto" : "smooth" })
        // Released when the glide ends (scrollend), or after a fallback
        clearTimeout(settleTimer.current)
        settleTimer.current = setTimeout(() => (settling.current = false), 600)
    }
    settleListRef.current = settleList
    const onListScroll = () => {
        updateEdges()
        if (!dRef.current.listSnap || detail || keepScroll.current !== null || settling.current) return
        // Browsers with scrollend settle once all scrolling (trackpad momentum too) is over
        if ("onscrollend" in window) return
        clearTimeout(settleTimer.current)
        settleTimer.current = setTimeout(settleList, 220)
    }
    useEffect(() => {
        const el = listEl.current
        if (!el || !("onscrollend" in window)) return
        // Wait until the person has stopped too (wheel notches can each end a scroll)
        let lastInput = 0
        let wait: ReturnType<typeof setTimeout> | undefined
        const onInput = () => {
            lastInput = performance.now()
            // Taking over mid-glide: stop gliding, follow the person
            if (settling.current) {
                settling.current = false
                el.scrollTo({ top: el.scrollTop })
            }
        }
        const onEnd = () => {
            if (settling.current) {
                settling.current = false
                return
            }
            clearTimeout(wait)
            const quiet = 180 - (performance.now() - lastInput)
            wait = setTimeout(() => {
                if (dRef.current.listSnap && !detailRef.current && keepScroll.current === null && performance.now() - lastInput >= 150)
                    settleListRef.current()
            }, Math.max(0, quiet))
        }
        el.addEventListener("scrollend", onEnd)
        el.addEventListener("wheel", onInput, { passive: true })
        el.addEventListener("touchmove", onInput, { passive: true })
        return () => {
            clearTimeout(wait)
            el.removeEventListener("scrollend", onEnd)
            el.removeEventListener("wheel", onInput)
            el.removeEventListener("touchmove", onInput)
        }
        // Bound once (re-binding on every render would cancel the pending settle)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [listMax !== null])
    useEffect(() => () => clearTimeout(settleTimer.current), [])

    // Drag the thumb to scroll
    const dragThumb = (e: ReactPointerEvent<HTMLDivElement>) => {
        const el = listEl.current
        if (!el) return
        e.preventDefault()
        const target = e.currentTarget
        target.setPointerCapture(e.pointerId)
        const startY = e.clientY
        const startTop = el.scrollTop
        // Screen px → layout px (the card may be scaled)
        const scale = el.getBoundingClientRect().height / el.offsetHeight || 1
        const ratio = (el.scrollHeight - el.clientHeight) / Math.max(1, el.clientHeight - thumb.h)
        // Free movement while dragging; it settles onto the nearest card when let go
        dragging.current = true
        const move = (ev: PointerEvent) => {
            el.scrollTop = startTop + ((ev.clientY - startY) / scale) * ratio
        }
        const up = () => {
            dragging.current = false
            settleList()
            target.removeEventListener("pointermove", move)
            target.removeEventListener("pointerup", up)
            target.removeEventListener("pointercancel", up)
        }
        target.addEventListener("pointermove", move)
        target.addEventListener("pointerup", up)
        target.addEventListener("pointercancel", up)
    }
    const visibleKey = sortedAgents.filter(shown).map((a) => a.id).join(",")
    useLayoutEffect(() => {
        const el = listEl.current
        if (!el) return
        const measure = () => {
            const slots = [...el.children].filter(
                (c) => (c as HTMLElement).style.display !== "none"
            ) as HTMLElement[]
            const n = dRef.current.maxVisibleTiles
            if (n <= 0 || slots.length <= n) setListMax(null)
            else {
                // Exact (fractional) sizes: offsetHeight rounds, which over two cards could leave
                // the last one's bottom border a pixel past the clipping edge
                const scale = el.getBoundingClientRect().height / (el.offsetHeight || 1) || 1
                const h = (slots[n - 1].getBoundingClientRect().bottom - slots[0].getBoundingClientRect().top) / scale
                // (The list's padding, LIST_EDGE, comes on top of this max-height)
                setListMax(h)
            }
            updateEdges()
        }
        measure()
        const ro = new ResizeObserver(measure)
        ;[...el.children].forEach((c) => ro.observe(c))
        // The list's own size changes once its max height applies
        const ro2 = new ResizeObserver(updateEdges)
        ro2.observe(el)
        return () => {
            ro.disconnect()
            ro2.disconnect()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visibleKey, tab, d.maxVisibleTiles, useTabs])
    // Recompute the scrollbar once the list's max height is applied
    useLayoutEffect(() => {
        updateEdges()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [listMax])
    const keepScroll = useRef<number | null>(null)
    // Keyboard focus goes back to the agent's card when it closes (otherwise it falls to the page)
    const closedId = useRef<string | null>(null)
    useLayoutEffect(() => {
        if (detail) return
        const id = closedId.current
        closedId.current = null
        if (id) {
            const active = document.activeElement
            const section = sectionEl.current
            if (!active || active === document.body || (section && section.contains(active))) {
                slotEls.current[id]?.querySelector<HTMLElement>(".wuc-tile")?.focus({ preventScroll: true })
            }
        }
        if (keepScroll.current === null || !listEl.current) return
        listEl.current.scrollTop = keepScroll.current
        keepScroll.current = null
        updateEdges()
    }, [detail])
    // Each tab starts at the top
    useLayoutEffect(() => {
        if (listEl.current) listEl.current.scrollTop = 0
        updateEdges()
    }, [tab])
    /** The tile's spot inside the card (its slot stays laid out while the tile is lifted) */
    /**
     * The tile's spot inside the card, in the card's own layout pixels. Screen rects
     * are divided by the card's on-screen scale, so this stays exact when the card
     * is shown zoomed (e.g. on Framer's canvas).
     */
    const tileBox = (id: string): Box | null => {
        const sec = sectionEl.current
        const el = slotEls.current[id]
        if (!sec || !el) return null
        const sr = sec.getBoundingClientRect()
        const tr = el.getBoundingClientRect()
        if (!tr.width || !sec.offsetWidth) return null
        const k = sr.width / sec.offsetWidth
        // Exact border widths (clientTop rounds a 0.5px border)
        const cs = getComputedStyle(sec)
        return {
            top: (tr.top - sr.top) / k - parseFloat(cs.borderTopWidth),
            left: (tr.left - sr.left) / k - parseFloat(cs.borderLeftWidth),
            width: tr.width / k,
            height: tr.height / k,
        }
    }
    /** The full card minus its padding, in layout pixels */
    const fullBox = (): Box => {
        const sec = sectionEl.current!
        const cs = getComputedStyle(sec)
        const pt = parseFloat(cs.paddingTop)
        const pl = parseFloat(cs.paddingLeft)
        return {
            top: pt,
            left: pl,
            width: sec.clientWidth - pl - parseFloat(cs.paddingRight),
            height: sec.clientHeight - pt - parseFloat(cs.paddingBottom),
        }
    }
    const openAgent = (id: string) => {
        const from = tileBox(id)
        if (!from) return
        clearTimeout(closeTimer.current)
        // Open in the same frame as the click: the grow animation runs from the tile's
        // box itself (keyframes), so there's no need to render it small first
        setDetail({ id, from, full: fullBox() })
        setDetailOpen(true)
    }
    // Opened from the start: once the tiles have their places
    useEffect(() => {
        if (!openAgentId) return
        const id = setTimeout(() => openAgent(openAgentId), 400)
        return () => clearTimeout(id)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openAgentId])
    /** Put the tile back in the list (after it has finished shrinking) */
    const releaseAgent = () => {
        clearTimeout(closeTimer.current)
        // Putting the card back into the scrolling list makes the browser jump the
        // scroll; remember where the list was and restore it before paint
        keepScroll.current = listEl.current?.scrollTop ?? null
        closedId.current = detail?.id ?? null
        setDetail(null)
    }
    const closeAgent = () => {
        // If its spot is scrolled out of the list (it may have moved up after a prompt),
        // scroll it into view first; the rest of the card is faded out, so this isn't seen
        // Lands on a whole-card position, so the list doesn't settle (and shift the card)
        // after it's put back
        const list = listEl.current
        const slot = detail ? slotEls.current[detail.id]?.parentElement : null
        if (list && slot && list.scrollHeight > list.clientHeight) {
            const shownSlots = [...list.children].filter((c) => (c as HTMLElement).style.display !== "none")
            const idx = shownSlots.indexOf(slot)
            const step = listStep(list)
            const perView = Math.max(1, Math.round((list.clientHeight + (parseFloat(getComputedStyle(list).rowGap) || 0)) / step))
            const maxTop = list.scrollHeight - list.clientHeight
            let top = Math.round(list.scrollTop / step) * step
            if (idx >= 0) {
                const first = Math.round(top / step)
                if (idx < first) top = idx * step
                else if (idx > first + perView - 1) top = (idx - perView + 1) * step
            }
            top = Math.max(0, Math.min(maxTop, top))
            if (Math.abs(top - list.scrollTop) > 0.5) list.scrollTop = top
        }
        // Shrink to where the tile is now (it may have moved, e.g. idle → active after a prompt)
        setDetail((cur) => (cur ? { ...cur, from: tileBox(cur.id) ?? cur.from } : cur))
        setDetailOpen(false)
        // Normally released when the shrink transition ends; this is only a fallback
        clearTimeout(closeTimer.current)
        closeTimer.current = setTimeout(releaseAgent, prefersReducedMotion() ? 0 : dRef.current.expandMs + 200)
    }
    useEffect(() => {
        if (!detail) return
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeAgent()
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    })
    useEffect(() => () => clearTimeout(closeTimer.current), [])

    const sendPrompt = (id: string, text: string, auto = false) => {
        updateAgents((list) =>
            list.map((a) => {
                if (a.id !== id) return a
                const wasLooping = isLooping(a)
                // Not a real request: the agent answers instead of starting work
                if (!looksLikeRequest(text)) {
                    return {
                        ...a,
                        prompts: [
                            ...(a.prompts ?? []),
                            { id: `p-${Date.now()}`, text, steps: [], reply: nonsenseReply(d.showSuggestions && !d.suggestionChips && suggestionsFor(a).length > 0) },
                        ],
                    }
                }
                // Skills arrive through `npx skills add` subtasks, once those finish
                return {
                    ...a,
                    status: "active",
                    prompts: [...(a.prompts ?? []), { id: `p-${Date.now()}`, text, steps: generateSteps(a, text), summary: generateSummary(a, text) }],
                    // An agent that wasn't running starts after what it had already finished
                    ...(wasLooping ? {} : { tasksDone: statusOf(a).done, currentProgress: 0 }),
                }
            })
        )
        // Show it under "Active" once the detail closes
        if (!auto) setTab("active")
    }

    // Now and then an agent sends one of its suggested prompts by itself: one that's done
    // with its work if there is one, never the agent whose chat is open
    const sendPromptRef = useRef(sendPrompt)
    sendPromptRef.current = sendPrompt
    const statusOfRef = useRef(statusOf)
    statusOfRef.current = statusOf
    useEffect(() => {
        if (!d.live || d.autoPromptSec <= 0) return
        const id = setInterval(() => {
            if (document.hidden) return
            const open = detailRef.current?.id
            const options = agentsRef.current
                .filter((a) => a.id !== open)
                .map((a) => {
                    const sent = new Set((a.prompts ?? []).map((pr) => pr.text.toLowerCase()))
                    const text = suggestionsFor(a).find((t) => !INSTALL_RE.test(t) && !sent.has(t.toLowerCase()))
                    return { a, text, free: statusOfRef.current(a).finished }
                })
                .filter((o) => o.text)
            const free = options.filter((o) => o.free)
            const pool = free.length ? free : options
            if (!pool.length) return
            const pick = pool[Math.floor(Math.random() * pool.length)]
            sendPromptRef.current(pick.a.id, pick.text!, true)
        }, d.autoPromptSec * 1000)
        return () => clearInterval(id)
    }, [d.live, d.autoPromptSec])

    const setSectionRef = (el: HTMLElement | null) => {
        sectionEl.current = el
        if (typeof sectionRef === "function") sectionRef(el)
        else if (sectionRef) (sectionRef as { current: HTMLElement | null }).current = el
    }

    // Everything but the open agent fades out while it's open (and back in while it closes)
    const faded: CSSProperties = {
        opacity: detailOpen ? 0 : 1,
        // Closing: the rest of the card waits until the shrinking agent has mostly passed
        // over it, then fades in, so the two never show on top of each other
        transition: detailOpen
            ? `opacity ${Math.round(d.expandMs * 0.5)}ms ${EXPAND_EASE}`
            : `opacity ${Math.round(d.expandMs * 0.6)}ms ${EASE_OUT} ${Math.round(d.expandMs * 0.45)}ms`,
        pointerEvents: detail ? "none" : undefined,
    }
    const hiddenAria = detail ? true : undefined

    return (
        <DesignContext.Provider value={d}>
            <section
                ref={setSectionRef}
                aria-label={d.titleText}
                data-fixes={d.a11yFixes ? "" : undefined}
                style={{
                    position: "relative",
                    boxSizing: "border-box",
                    width: u(d.cardWidth),
                    flexShrink: 0,
                    padding: u(d.cardPadding),
                    borderRadius: u(d.cardRadius),
                    border: d.cardBorderWidth > 0 ? `${d.cardBorderWidth}px solid ${d.cardBorderColor}` : "none",
                    background: d.card,
                    color: d.text,
                    fontFamily: fontStack(d.fontFamily),
                    // Figma-like thin rendering (browsers on macOS draw text bolder by default)
                    WebkitFontSmoothing: "antialiased",
                    MozOsxFontSmoothing: "grayscale",
                    overflow: "hidden",
                    ...style,
                }}
            >
                <style>{cardCss(d)}</style>

                {/* While an agent is open, everything else fades out and ignores clicks */}
                <div style={{ display: "flex", flexDirection: "column", gap: u(d.sectionGap) }}>
                    <h2 style={{ margin: 0, ...tx(d, d.titleSize, d.titleWeight), ...faded }} aria-hidden={hiddenAria}>
                        {d.titleText}
                    </h2>

                    {/* Hero + bar */}
                    <div
                        style={{ display: "flex", flexDirection: "column", gap: u(d.heroBarGap), ...faded }}
                        aria-hidden={hiddenAria}
                    >
                        <div style={{ display: "flex", alignItems: "flex-end", gap: u(d.heroGap) }}>
                            <Percent value={currentUsed} size={d.heroSize} unitSize={d.heroUnitSize} weight={d.heroWeight} />
                            <div style={{ display: "flex", flexDirection: "column", gap: u(d.metaGap) }}>
                                <span style={tx(d, d.resetSize, d.metaWeight, d.resetColor)}>
                                    {getResetLabel(d, daysUntilReset)}
                                </span>
                                <span
                                    style={tx(d, d.paceSize, d.metaWeight, paceTextColor(d, d.paceFollowsStatus ? pace.color : d.paceColor))}
                                >
                                    {pace.label}
                                </span>
                            </div>
                        </div>
                        <StripeBar value={animatedUsed} color={d.barFollowsPace ? pace.color : d.barColor} />
                    </div>

                    {/* Agents */}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: u(useTabs ? d.toggleTilesGap : d.labelListGap),
                            // Nudged up, so the bottom card's border keeps clear of the card's bottom
                            // edge. Margins, not position/transform: those would become the frame the
                            // open agent is positioned in. The card's height stays the same.
                            marginTop: -d.agentsNudge,
                            marginBottom: d.agentsNudge,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "flex-start",
                                gap: u(d.labelToggleGap),
                                ...faded,
                            }}
                            aria-hidden={hiddenAria}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: u(d.counterGap) }}>
                                <span style={tx(d, d.labelSize, 400, alpha(d.text, d.labelOpacity))}>{d.agentsLabel}</span>
                                {d.showAgentCount && (
                                    // Overhangs the label's cap height, so the row keeps the label's height
                                    <span style={{ display: "flex", margin: `${u(-d.counterPadY)} 0` }}>
                                        <CountChip value={agents.length} />
                                    </span>
                                )}
                            </div>
                            {useTabs && <SegmentedControl value={tab} onChange={setTab} />}
                        </div>

                        {/* List and scrollbar share one grid cell, so the bar sits beside the
                            cards without positioning anything (the open card is positioned on the card) */}
                        <div style={{ display: "grid" }}>
                        <div
                            role={useTabs ? "tabpanel" : "list"}
                            ref={listEl}
                            className="wuc-scroll"
                            onScroll={onListScroll}
                            style={{
                                gridArea: "1 / 1",
                                display: "flex",
                                flexDirection: "column",
                                gap: u(d.tileGap),
                                ...(listMax !== null
                                    ? {
                                          maxHeight: listMax,
                                          // Explicit: a page-wide "* { box-sizing: border-box }" (common in
                                          // site builders and CSS resets) would otherwise count the padding
                                          // inside the max-height and cut the bottom card off
                                          boxSizing: "content-box",
                                          // A little room at the top and bottom, taken back with negative
                                          // margins: the first and last card's border never touch the
                                          // clipping edge, so they stay whole when scrolled to an end
                                          paddingBlock: LIST_EDGE,
                                          marginBlock: -LIST_EDGE,
                                          // The open card is lifted out (positioned on the card), so it isn't clipped here
                                          overflowY: "auto",
                                          overscrollBehavior: "contain",
                                          // Swapping the stand-in back for the card must not nudge the scroll
                                          overflowAnchor: "none",
                                          // Settles on whole cards (see onListScroll), so none is ever cut off
                                      }
                                    : {}),
                            }}
                        >
                            {listAgents.map((a) => {
                                const isOpen = detail?.id === a.id
                                const st = statusOf(a)
                                // A finished agent leaving Working: fades and folds away, and the
                                // tiles below close the gap
                                const out = useTabs && !!leaving[a.id] && !isOpen
                                const outMs = prefersReducedMotion() ? 0 : d.moveOutMs
                                return (
                                    <div
                                        key={a.id}
                                        style={{
                                            display: shown(a) || isOpen ? "grid" : "none",
                                            gridTemplateRows: out ? "0fr" : "1fr",
                                            marginBottom: out ? `calc(-1 * ${u(d.tileGap)})` : 0,
                                            transition: out
                                                ? `grid-template-rows ${outMs}ms ${EASE_OUT}, margin-bottom ${outMs}ms ${EASE_OUT}`
                                                : "none",
                                        }}
                                    >
                                    <div
                                        ref={(el) => {
                                            slotEls.current[a.id] = el
                                        }}
                                        style={{
                                            minHeight: 0,
                                            overflow: out ? "hidden" : undefined,
                                            // An opaque backing in the card's shape: cards slide over each other when
                                            // the list reorders, and must never show through (whatever the tile fill is)
                                            ...(isOpen ? {} : { background: d.card, borderRadius: u(d.tileRadius) }),
                                            ...(isOpen ? {} : faded),
                                            ...(out ? { opacity: 0, transition: `opacity ${Math.round(outMs * 0.6)}ms ${EASE_OUT}` } : {}),
                                        }}
                                        aria-hidden={isOpen ? undefined : hiddenAria}
                                    >
                                        {isOpen && <TileStandIn agent={a} status={st} looping={isLooping(a)} />}
                                        <AgentTile
                                            agent={a}
                                            status={st}
                                            looping={isLooping(a)}
                                            working={a.status === "active" && !st.finished}
                                            icon={icon}
                                            expanded={isOpen}
                                            open={isOpen && detailOpen}
                                            box={isOpen ? detail!.from : null}
                                            full={isOpen ? detail!.full : null}
                                            onClosed={releaseAgent}
                                            onOpen={() => openAgent(a.id)}
                                            onClose={closeAgent}
                                            onSend={(text) => sendPrompt(a.id, text)}
                                            onStatus={(s) => reportStatus(a.id, s)}
                                            onTaskComplete={() => handleTaskComplete(a.id)}
                                        />
                                    </div>
                                    </div>
                                )
                            })}
                            {!hasVisible && (
                                <div
                                    style={{
                                        background: d.emptyBg,
                                        borderRadius: u(d.tileRadius),
                                        padding: `${u(7)} ${u(d.tilePadding)}`,
                                        display: "flex",
                                        justifyContent: "center",
                                        ...faded,
                                    }}
                                >
                                    <span style={tx(d, d.taskSize, 400, alpha(d.text, d.mutedOpacity))}>
                                        {tab === "active" ? d.emptyActiveText : d.emptyIdleText}
                                    </span>
                                </div>
                            )}
                        </div>
                        {/* The chat's blur, at the list's top edge too: cards scrolling out under it
                            blur instead of being cut off. Only once scrolled, so the first card is
                            sharp at rest; laid over the list (the list itself clips its cards) */}
                        {d.listBlur > 0 && listMax !== null && (
                            <div
                                aria-hidden="true"
                                style={{
                                    gridArea: "1 / 1",
                                    alignSelf: "start",
                                    marginTop: -LIST_EDGE,
                                    position: "relative",
                                    zIndex: 4, // over the cards' headers (3), under an open card (20)
                                    pointerEvents: "none",
                                    // hidden while an agent is open (the open card sits over the list)
                                    opacity: detail ? 0 : 1,
                                    transition: `opacity 150ms ${EASE_OUT}`,
                                }}
                            >
                                <div ref={listBlurEl} style={{ opacity: 0 }}>
                                    <EdgeBlur
                                        side="top"
                                        height={u(d.listBlurHeight)}
                                        amount={d.listBlur}
                                        tint={d.listBlurTintOpacity > 0 ? alpha(d.tileFill ? d.tileBg : d.card, d.listBlurTintOpacity) : undefined}
                                        tintFade={u(d.listBlurHeight)}
                                    />
                                </div>
                            </div>
                        )}
                        {d.showScrollbar && listMax !== null && thumb.h > 0 && (
                            <div
                                aria-hidden="true"
                                style={{
                                    gridArea: "1 / 1",
                                    justifySelf: "end",
                                    width: u(d.scrollbarWidth),
                                    marginRight: `calc(-1 * ${u(d.scrollbarOffset + d.scrollbarWidth)})`,
                                    pointerEvents: "none",
                                    ...faded,
                                }}
                            >
                                <div
                                    className="wuc-thumb"
                                    onPointerDown={dragThumb}
                                    style={{
                                        width: "100%",
                                        height: thumb.h,
                                        transform: `translateY(${thumb.y}px)`,
                                        borderRadius: 999,
                                        background: alpha(d.scrollbarColor, d.scrollbarOpacity),
                                        pointerEvents: "auto",
                                        cursor: "grab",
                                        touchAction: "none",
                                    }}
                                />
                            </div>
                        )}
                        </div>
                    </div>
                </div>
                {/* Announcements for screen readers only */}
                <div
                    role="status"
                    aria-live="polite"
                    style={{
                        position: "absolute",
                        width: 1,
                        height: 1,
                        overflow: "hidden",
                        clip: "rect(0 0 0 0)",
                        clipPath: "inset(50%)",
                        whiteSpace: "nowrap",
                    }}
                >
                    {announcement}
                </div>
            </section>
        </DesignContext.Provider>
    )
}

/* ------------------------------------------------------------------ */
/* Backdrop                                                            */
/* ------------------------------------------------------------------ */

export interface BackdropProps {
    /** "screen": fixed to the full viewport. "fill": fills its parent (use this in Framer). */
    mode?: "screen" | "fill"
    /** Max share of the backdrop's width AND height the card may take, 0–1 */
    fit?: number
    background?: string
    /** Card size in Figma units, used to fit it inside the backdrop */
    cardWidth?: number
    cardHeight?: number
    /** Blur of the background (px); the card stays sharp */
    blur?: number
    /** Colour over the background, under the card, at `overlayOpacity` (0–1) */
    overlay?: string
    overlayOpacity?: number
    children?: ReactNode
    style?: CSSProperties
}

/** Backdrop with the card centered, scaled to fit both width and height */
/** Backdrop shapes: the whole screen, or a frame in one of these aspect ratios */
export const BACKDROP_RATIOS = ["Fill screen", "16:9", "3:2", "4:3", "1:1", "4:5", "3:4", "1:1.414 (A4)", "9:16"]

/** The backdrop's paint: colour, optional gradient, optional image on top */
export function backdropPaint(d: Design): string {
    const layers: string[] = []
    if (d.backdropImage.trim()) layers.push(`url("${d.backdropImage.trim().replace(/"/g, "%22")}") center / cover no-repeat`)
    if (d.backdropGradient) layers.push(`linear-gradient(${d.backdropAngle}deg, ${d.backdrop}, ${d.backdrop2})`)
    layers.push(d.backdrop)
    return layers.join(", ")
}

export function Backdrop({
    mode = "screen",
    fit = DEFAULT_DESIGN.fit,
    background = DEFAULT_DESIGN.backdrop,
    cardWidth = DEFAULT_DESIGN.cardWidth,
    cardHeight = 126,
    blur = 0,
    overlay = "#000000",
    overlayOpacity = 0,
    children,
    style,
}: BackdropProps) {
    const size: CSSProperties = mode === "screen" ? { position: "fixed", inset: 0 } : { width: "100%", height: "100%" }
    return (
        <div
            style={
                {
                    boxSizing: "border-box",
                    ...size,
                    // with a blur, the background is painted on its own blurred layer instead
                    background: blur > 0 ? "transparent" : background,
                    position: mode === "screen" ? "fixed" : "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    containerType: "size",
                    // Sized for the default width: a wider card keeps its text size and just takes
                    // more of the frame, until it nearly reaches the frame's edges (then it scales down)
                    "--s": `min(${fit} * 100cqw / ${Math.min(cardWidth, DEFAULT_DESIGN.cardWidth)}, 0.96 * 100cqw / ${cardWidth}, ${fit} * 100cqh / ${Math.max(1, cardHeight)})`,
                    ...style,
                } as CSSProperties
            }
        >
            {blur > 0 && (
                // reaches past the edges, so the blur doesn't fade out towards them
                <div aria-hidden="true" style={{ position: "absolute", inset: -2 * blur, background, filter: `blur(${blur}px)`, pointerEvents: "none" }} />
            )}
            {overlayOpacity > 0 && (
                <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: overlay, opacity: overlayOpacity, pointerEvents: "none" }} />
            )}
            {blur > 0 || overlayOpacity > 0 ? (
                // above the blur and overlay layers
                <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center", maxWidth: "100%", maxHeight: "100%" }}>{children}</div>
            ) : (
                children
            )}
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* Settings panel                                                      */
/* ------------------------------------------------------------------ */

interface FieldExtras {
    /** Small explanation shown under the control */
    hint?: string
    /** Other values to set when this one changes (e.g. picking a bar color turns off "Use status color") */
    sets?: Partial<Design>
    /** When false, the row is dimmed: the value is kept but not visible right now */
    activeWhen?: (d: Design) => boolean
}

type Field = FieldExtras &
    (
        | { key: keyof Design; label: string; type: "number"; min: number; max: number; step: number; unit?: string }
        | { key: keyof Design; label: string; type: "color" | "text" | "bool" | "image" }
        | { key: keyof Design; label: string; type: "select"; options: (string | number)[] }
    )

const WEIGHTS = [300, 400, 500, 600, 700]
const n = (
    key: keyof Design,
    label: string,
    min: number,
    max: number,
    step = 0.5,
    unit = "u",
    extras: FieldExtras = {}
): Field => ({
    key,
    label,
    type: "number",
    min,
    max,
    step,
    unit,
    ...extras,
})
const c = (key: keyof Design, label: string, extras: FieldExtras = {}): Field => ({ key, label, type: "color", ...extras })
const txt = (key: keyof Design, label: string, extras: FieldExtras = {}): Field => ({ key, label, type: "text", ...extras })
const img = (key: keyof Design, label: string, extras: FieldExtras = {}): Field => ({ key, label, type: "image", ...extras })

/**
 * Reads an image file into a data URL, scaled down to at most 2400px on its long side
 * (JPEG, or PNG when it has transparency), so it fits in the browser's saved settings.
 */
function readImageFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(reader.error)
        reader.onload = () => {
            const src = String(reader.result)
            // SVGs and GIFs are kept as they are
            if (/^data:image\/(svg|gif)/.test(src)) return resolve(src)
            const im = new Image()
            im.onerror = () => resolve(src)
            im.onload = () => {
                const scale = Math.min(1, 2400 / Math.max(im.width, im.height))
                const c = document.createElement("canvas")
                c.width = Math.round(im.width * scale)
                c.height = Math.round(im.height * scale)
                const ctx = c.getContext("2d")
                if (!ctx) return resolve(src)
                ctx.drawImage(im, 0, 0, c.width, c.height)
                const png = /^data:image\/png/.test(src)
                resolve(c.toDataURL(png ? "image/png" : "image/jpeg", 0.86))
            }
            im.src = src
        }
        reader.readAsDataURL(file)
    })
}

function ImageInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const fileRef = useRef<HTMLInputElement>(null)
    const [busy, setBusy] = useState(false)
    const isData = value.startsWith("data:")
    return (
        <span style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
            {value ? (
                <span
                    aria-hidden="true"
                    style={{
                        width: 26,
                        height: 26,
                        borderRadius: 5,
                        flexShrink: 0,
                        background: `url("${value.replace(/"/g, "%22")}") center / cover, ${P.line}`,
                        boxShadow: `inset 0 0 0 1px rgba(0,0,0,0.08)`,
                    }}
                />
            ) : null}
            {isData ? (
                <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: P.sub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Uploaded image
                </span>
            ) : (
                <input
                    value={value}
                    placeholder="Paste a link…"
                    onChange={(e) => onChange(e.target.value)}
                    style={{ ...inputBase, flex: 1, minWidth: 0 }}
                />
            )}
            <button type="button" onClick={() => fileRef.current?.click()} style={{ ...btn, padding: "4px 8px", flexShrink: 0 }}>
                {busy ? "…" : "Upload"}
            </button>
            {value && (
                <button type="button" aria-label="Remove image" onClick={() => onChange("")} style={{ ...btn, padding: "4px 7px", flexShrink: 0 }}>
                    ×
                </button>
            )}
            <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={async (e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ""
                    if (!file) return
                    setBusy(true)
                    try {
                        onChange(await readImageFile(file))
                    } finally {
                        setBusy(false)
                    }
                }}
            />
        </span>
    )
}
const b = (key: keyof Design, label: string, extras: FieldExtras = {}): Field => ({ key, label, type: "bool", ...extras })
const sel = (key: keyof Design, label: string, options: (string | number)[]): Field => ({
    key,
    label,
    type: "select",
    options,
})

const SECTIONS: { title: string; fields: Field[] }[] = [
    {
        title: "Font sizes",
        fields: [
            n("titleSize", "Title", 2, 14, 0.1),
            n("heroSize", "Main number", 4, 24, 0.1),
            n("heroUnitSize", "Main %", 2, 20, 0.1),
            n("resetSize", "Reset text", 1.5, 8, 0.05),
            n("paceSize", "Pace text", 1.5, 8, 0.05),
            n("labelSize", "Agents label", 1.5, 6, 0.1),
            n("agentCountSize", "Agent count chip", 1.5, 6, 0.1),
            n("toggleTextSize", "Tabs", 1.5, 6, 0.1),
            n("nameSize", "Agent name", 2, 8, 0.1),
            n("promptChipSize", "Context chip", 1.5, 6, 0.05),
            n("modelSize", "Model line", 1.5, 6, 0.1),
            n("taskSize", "Tasks", 1.5, 6, 0.1),
            n("skillsTextSize", "Skills", 1.5, 6, 0.1),
            n("threadTextSize", "Chat messages", 1.5, 6, 0.1),
            n("subtaskSize", "Chat subtasks", 1.5, 6, 0.1),
            n("fileNameSize", "File name", 1.5, 6, 0.05),
            n("fileMetaSize", "File details", 1.5, 6, 0.05),
            n("inputTextSize", "Chat input", 1.5, 6, 0.1),
            n("tabHintSize", "Tab hint", 1.5, 6, 0.1),
            n("chatTextBoost", "Chat text: extra size", -4, 6, 0.5, "px", { hint: "Added to every text in the agent chat" }),
        ],
    },
    {
        title: "Text",
        fields: [
            sel("fontFamily", "Font", Object.keys(FONTS)),
            n("tracking", "Letter spacing", -0.08, 0.08, 0.005, "em"),
            txt("titleText", "Title"),
            sel("titleWeight", "Title weight", WEIGHTS),
            txt("agentsLabel", "Section label"),
            txt("activeLabel", "Tab 1"),
            txt("idleLabel", "Tab 2"),
            sel("nameWeight", "Agent name weight", WEIGHTS),
            txt("emptyActiveText", "Empty (tab 1)"),
            txt("emptyIdleText", "Empty (tab 2)"),
            txt("readyText", "Ready message", { hint: "Shown when an agent has finished all its tasks" }),
            sel("readyWeight", "Ready message weight", WEIGHTS),
            txt("readyHint", "Ready hint", { hint: "{name} = agent name. Leave empty to hide." }),
        ],
    },
    {
        title: "Reset & pace",
        fields: [
            n("metaGap", "Spacing between", 0, 8, 0.25),
            sel("metaWeight", "Weight", WEIGHTS),
            txt("resetText", "Reset text", { hint: "{d} = days left (1 day and 0 days have their own wording)" }),
            c("resetColor", "Reset color"),
            txt("paceText", "Pace text", { hint: "{p} = projected %" }),
            b("paceFollowsStatus", "Pace uses status color"),
            c("paceColor", "Pace color", { sets: { paceFollowsStatus: false }, activeWhen: (d) => !d.paceFollowsStatus }),
            b("paceMatchesBar", "Pace text in the bar's green", { hint: "Off: a darker green, so the text passes contrast (4.5:1)" }),
        ],
    },
    {
        title: "Numbers",
        fields: [
            sel("heroWeight", "Main weight", WEIGHTS),
            n("shareSize", "Agent number", 3, 16, 0.1),
            n("shareUnitSize", "Agent %", 2, 14, 0.1),
            sel("shareWeight", "Agent weight", WEIGHTS),
            n("shareTracking", "Agent spacing", -0.08, 0.08, 0.0025, "em"),
            sel("shareDisplay", "Agent usage shown as", ["Label", "Big number", "Hidden"]),
            txt("shareLabel", "Usage label", { hint: "{p} = the agent's share of the weekly limit" }),
        ],
    },
    {
        title: "Backdrop",
        fields: [
            sel("backdropRatio", "Aspect ratio", BACKDROP_RATIOS),
            c("backdrop", "Color"),
            b("backdropGradient", "Gradient"),
            c("backdrop2", "Gradient to", { sets: { backdropGradient: true }, activeWhen: (d) => d.backdropGradient }),
            n("backdropAngle", "Gradient angle", 0, 360, 5, "°", { activeWhen: (d) => d.backdropGradient }),
            img("backdropImage", "Image", { hint: "Upload from your files or paste a link. Covers the backdrop; large images are scaled to 2400px" }),
            c("backdropSurround", "Around the frame", { activeWhen: (d) => d.backdropRatio !== "Fill screen" }),
            n("backdropRadius", "Frame corners", 0, 48, 1, "px", { activeWhen: (d) => d.backdropRatio !== "Fill screen" }),
            n("backdropMargin", "Frame margin", 0, 160, 2, "px", { activeWhen: (d) => d.backdropRatio !== "Fill screen" }),
            n("backdropBlur", "Background blur", 0, 80, 1, "px"),
            c("backdropOverlay", "Overlay color"),
            n("backdropOverlayOpacity", "Overlay opacity", 0, 1, 0.01, ""),
        ],
    },
    {
        title: "Colors",
        fields: [
            c("card", "Card"),
            c("text", "Text"),
            n("labelOpacity", "Label opacity", 0, 1, 0.05, ""),
            n("mutedOpacity", "Grey text opacity", 0, 1, 0.05, ""),
            n("shimmerBase", "Active task opacity", 0, 1, 0.05, ""),
            c("green", "On track"),
            c("amber", "Warning", { hint: "Shows when Projected (Content) reaches “Warning from” in Usage bar" }),
            c("red", "Over limit", { hint: "Shows when Projected (Content) reaches 100%" }),
            c("toggleBg", "Toggle track"),
            c("pill", "Toggle pill"),
            b("tileFill", "Agent card fill"),
            c("tileBg", "Agent card color", { sets: { tileFill: true }, activeWhen: (d) => d.tileFill }),
            c("tileBorderColor", "Agent card border"),
            n("tileBorderWidth", "Border width", 0, 3, 0.25, "px"),
            c("emptyBg", "Empty state", { hint: "Only visible when a tab has no agents" }),
            c("iconColor", "Icon", { sets: { showModelIcon: true }, activeWhen: (d) => d.showModelIcon }),
        ],
    },
    {
        title: "Card",
        fields: [
            n("fit", "Size on screen", 0.2, 1, 0.01, ""),
            n("cardWidth", "Width", 80, 200, 1, "u", { hint: "Wider keeps the text size, up to the edges of its frame" }),
            n("cardPadding", "Padding", 0, 12, 0.25),
            n("cardRadius", "Corner radius", 0, 20, 0.25),
            n("cardBorderWidth", "Border width", 0, 3, 0.25, "px"),
            c("cardBorderColor", "Border color"),
            n("sectionGap", "Section spacing", 0, 24, 0.5),
            n("heroGap", "Number ↔ reset text", 0, 12, 0.25),
            n("heroBarGap", "Number ↔ bar", 0, 16, 0.25),
        ],
    },
    {
        title: "Usage bar",
        fields: [
            n("segments", "Stripes", 5, 120, 1, ""),
            b("barFollowsPace", "Use status color"),
            c("barColor", "Filled stripes", { sets: { barFollowsPace: false }, activeWhen: (d) => !d.barFollowsPace }),
            c("barTrack", "Empty stripes"),
            n("barHeight", "Height", 1, 30, 0.5),
            n("stripeWidth", "Stripe width", 0.2, 5, 0.1),
            n("stripeAdjust", "Stripe width adjust", -3, 5, 1, "px"),
            n("stripeRadius", "Stripe radius", 0, 3, 0.1),
            n("paceWarnAt", "Warning from", 50, 100, 1, "%"),
        ],
    },
    {
        title: "Toggle",
        fields: [
            b("showToggle", "Working / Ready toggle"),
            b("showAgentCount", "Agent count after label"),
            n("labelToggleGap", "Label ↔ toggle", 0, 8, 0.25),
            n("labelListGap", "Label ↔ list (no toggle)", 0, 10, 0.25),
            n("agentsNudge", "Agents section nudge up", -6, 10, 1, "px"),
            n("toggleTilesGap", "Toggle ↔ agents", 0, 12, 0.25),
            n("toggleRadius", "Corner radius", 0, 10, 0.25),
            n("togglePadding", "Inset", 0, 3, 0.25),
            n("toggleGap", "Gap between tabs", 0, 6, 0.25),
            n("togglePadX", "Tab padding X", 0, 8, 0.25),
            n("togglePadY", "Tab padding Y", 0, 6, 0.25),
        ],
    },
    {
        title: "Agent cards",
        fields: [
            n("tileGap", "Gap between cards", 0, 12, 0.25),
            n("maxVisibleTiles", "Cards shown per tab (rest scroll)", 1, 6, 1, ""),
            b("showScrollbar", "Scrollbar"),
            n("scrollbarWidth", "Scrollbar width", 0.2, 3, 0.1),
            n("scrollbarOffset", "Scrollbar distance from cards", -2, 4, 0.1),
            c("scrollbarColor", "Scrollbar color"),
            n("scrollbarOpacity", "Scrollbar opacity", 0, 1, 0.01, ""),
            b("listSnap", "Snap list to whole cards", { hint: "After scrolling, the agent list settles on whole cards" }),
            n("listBlur", "List edge blur", 0, 20, 0.5, "px", { hint: "Cards scrolling out under the top of the list blur. 0 = off." }),
            n("listBlurHeight", "List blur height", 1, 20, 0.25, "u", { activeWhen: (d) => d.listBlur > 0 }),
            n("listBlurTintOpacity", "List blur fade (card colour)", 0, 1, 0.05, "", { activeWhen: (d) => d.listBlur > 0 }),
            n("listBlurReveal", "Blur fades in over", 0, 40, 0.5, "u", { hint: "Scrolling it takes to show fully. 0 = always on.", activeWhen: (d) => d.listBlur > 0 }),
            n("tileRadius", "Corner radius", 0, 10, 0.25),
            n("tilePadding", "Padding", 0, 10, 0.25),
            n("tileHeaderGap", "Header ↔ tasks", 0, 12, 0.25),
            n("nameModelGap", "Name ↔ model", 0, 8, 0.25),
            n("effortGap", "Model ↔ effort", 0, 6, 0.25),
            b("showModelIcon", "Show model icon"),
            n("iconSize", "Icon size", 1, 14, 0.25),
            n("iconGap", "Icon gap", 0, 8, 0.25),
        ],
    },
    {
        title: "Tasks",
        fields: [
            n("tasksTop", "Space above tasks", 0, 12, 0.25),
            n("rowHeight", "Row height", 3, 10, 0.1),
            n("fade", "Edge fade", 0, 8, 0.25),
            b("showTaskProgress", "Show task %"),
        ],
    },
    {
        title: "Loader & counter",
        fields: [
            b("showLoader", "Show loader"),
            c("loaderColor", "Loader color"),
            n("loaderSize", "Loader size", 1, 8, 0.1),
            n("loaderStroke", "Loader stroke", 0.5, 5, 0.1, ""),
            n("loaderGap", "Loader ↔ name", 0, 6, 0.25),
            n("loaderSpeedMs", "Spin duration", 200, 3000, 50, "ms"),
            n("checkMs", "Check morph", 0, 1500, 10, "ms"),
            b("showCounter", "Show task counter"),
            c("counterBg", "Counter background"),
            n("counterTotalOpacity", "“/ total” opacity", 0, 1, 0.05, ""),
            n("counterRadius", "Counter radius", 0, 6, 0.1),
            n("counterPadX", "Counter padding X", 0, 5, 0.1),
            n("counterPadY", "Counter padding Y", 0, 4, 0.1),
            n("counterGap", "Name ↔ counter", 0, 8, 0.25),
            b("contextChipBg", "Context chip background"),
        ],
    },
    {
        title: "Hover",
        fields: [
            b("tileHover", "Agent card hover"),
            c("tileHoverBg", "Card hover fill", { sets: { tileHover: true }, activeWhen: (d) => d.tileHover }),
            c("tileHoverBorder", "Card hover border", { sets: { tileHover: true }, activeWhen: (d) => d.tileHover }),
            n("hoverMs", "Hover speed", 0, 600, 10, "ms"),
            n("closeSize", "Close button size", 3, 9, 0.1),
            n("closeRadius", "Close button radius", 0, 4.5, 0.05, "u", { hint: "Half the size = fully round" }),
            c("closeBg", "Close button"),
            c("closeHoverBg", "Close button hover"),
            c("closeIconColor", "Close icon"),
            c("closeHoverIconColor", "Close icon hover"),
            n("closePressScale", "Close button pressed", 0.7, 1, 0.01, "×"),
        ],
    },
    {
        title: "Agent detail",
        fields: [
            n("expandMs", "Expand duration", 0, 1500, 10, "ms"),
            n("chatInMs", "Chat fade-in", 0, 1500, 10, "ms"),
            n("chatInDelayMs", "Chat fade-in delay", 0, 600, 10, "ms"),
            n("chatInStaggerMs", "Input after chat", 0, 600, 10, "ms"),
            n("expandOvershoot", "Bounce (overshoot)", 0, 4, 0.1, "u", { hint: "How far it grows past its size before settling. 0 = no bounce." }),
            n("threadGap", "Space between prompts", 0, 14, 0.25),
            n("bubbleGap", "Prompt ↔ its subtasks", 0, 10, 0.25),
            n("subtaskGap", "Between subtasks", 0, 8, 0.1),
            n("subtaskIconGap", "Subtask icon ↔ text", 0, 6, 0.1),
            c("bubbleBg", "Prompt bubble"),
            n("stepIconSize", "Subtask icon size", 1, 6, 0.1),
            n("stepCheckScale", "Checkmark size", 0.5, 2, 0.05, "×"),
            n("composerRadius", "Input radius", 0, 8, 0.25),
            n("composerGap", "Chat ↔ input", 0, 12, 0.25, "u", { hint: "Extra space above the input (on top of the fade area)" }),
            c("inputBg", "Input background"),
            c("inputBorderColor", "Input border"),
            c("tabHintBg", "Tab key"),
            c("tabHintBorderColor", "Tab key border"),
            n("tabHintBorderWidth", "Tab key border width", 0, 2, 0.25, "px"),
            c("tabHintTextColor", "Tab key text"),
            n("promptInMs", "New prompt: rise-in", 0, 1000, 10, "ms"),
            n("promptStaggerMs", "New prompt: stagger per subtask", 0, 200, 5, "ms"),
            b("showSkills", "Installed skills"),
            n("skillsGap", "Skills row spacing", 0, 8, 0.25),
            n("solidFade", "Fade below header", 0, 12, 0.25),
            n("headerCutGap", "Space before the chat's cut-off", 0, 12, 0.25),
            n("solidGap", "Clear room below skills", 0, 12, 0.25),
            b("showSummary", "Summary when a prompt is done"),
            b("collapseSteps", "Fold line over the subtasks (prompts done earlier start folded)"),
            n("collapseMs", "Fold / unfold speed", 0, 1000, 10, "ms"),
            n("foldTextBoost", "Fold line: extra size", -3, 4, 0.5, "px"),
            n("summaryInMs", "Summary: fade-in", 0, 1000, 10, "ms"),
            b("showFiles", "Show produced files"),
            n("fileLineGap", "File name ↔ details", 0, 4, 0.1),
            c("fileHoverBg", "File card hover"),
            b("showSuggestions", "Example prompts"),
            b("suggestionChips", "Example prompts as chips (off: in the input)"),
            b("suggestionsOnly", "Only suggested prompts (no typing)"),
            n("suggestionCount", "Chips shown", 1, 8, 1, ""),
            n("suggestionInMs", "New example prompt fade-in", 0, 1000, 10, "ms"),
            n("suggestionSize", "Example prompt size", 1.5, 5, 0.1),
            n("suggestionRadius", "Example prompt radius", 0, 99, 0.5),
            n("suggestionGap", "Example prompts ↔ input", 0, 8, 0.25),
            c("suggestionBg", "Example prompt fill"),
            c("suggestionHoverBg", "Example prompt hover"),
            n("threadBlur", "Edge blur", 0, 20, 0.5, "px", { hint: "Blur on chat content sliding under the header. 0 = off." }),
            n("threadBlurHeight", "Blur height", 1, 16, 0.25, "u", { hint: "Above the header gap + 1 it starts to blur content at rest" }),
            n("threadTopSpace", "Space above chat", 0, 12, 0.25, "u", { hint: "Raise with the blur height to keep the first message clear" }),
            c("threadBlurTint", "Blur tint"),
            n("threadBlurTintOpacity", "Blur tint opacity", 0, 1, 0.05, "", { hint: "Behind the header; fades out below it" }),
            n("sendRadius", "Send button radius", 0, 2.75, 0.05, "u", { hint: "2.75 = fully round" }),
            txt("composerPlaceholder", "Input placeholder", { hint: "{name} = agent name" }),
        ],
    },
    {
        title: "Motion",
        fields: [
            b("live", "Live task loop"),
            n("slideMs", "Slide duration", 0, 1500, 10, "ms"),
            n("moveToReadyMs", "Finished → Ready tab after", 0, 6000, 100, "ms"),
            n("moveOutMs", "Leave Working tab", 0, 1000, 10, "ms"),
            n("reorderMs", "Reorder in list (no toggle)", 0, 1500, 10, "ms"),
            n("stepPauseMs", "Pause after a step", 0, 2000, 10, "ms"),
            n("workSpeed", "Work speed (all agents)", 0.25, 4, 0.05, "×"),
            n("contextGrowth", "Context fills up", 0, 3, 0.05, "×", { hint: "How fast the '343k / 1M' after an agent's name grows" }),
            n("shimmerMs", "Shimmer duration", 300, 6000, 50, "ms"),
            n("toggleMs", "Toggle slide", 0, 1000, 10, "ms"),
            n("bigCountMs", "Number count", 0, 6000, 50, "ms"),
            n("usageGain", "Usage added when all tasks are done", 0, 42, 1, "%"),
            n("promptUsageGain", "Usage added per sent prompt", 0, 20, 0.5, "%"),
            n("autoPromptSec", "Prompt by itself every", 0, 180, 1, "s", { hint: "An agent sends one of its suggested prompts on its own (0: never)" }),
        ],
    },
]

const P = {
    font: `-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif`,
    text: "#1A1A1A",
    sub: "#8A8A8A",
    line: "#ECECEC",
    field: "#F4F4F4",
}

const inputBase: CSSProperties = {
    font: `12px ${P.font}`,
    color: P.text,
    background: P.field,
    border: "1px solid transparent",
    borderRadius: 6,
    padding: "5px 7px",
    outline: "none",
    boxSizing: "border-box",
    minWidth: 0,
}

function Row({
    label,
    changed,
    onReset,
    dimmed,
    hint,
    children,
}: {
    label: string
    changed?: boolean
    onReset?: () => void
    dimmed?: boolean
    hint?: string
    children: ReactNode
}) {
    return (
        <div>
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "108px 1fr 14px",
                alignItems: "center",
                gap: 8,
                minHeight: 28,
                opacity: dimmed ? 0.45 : 1,
            }}
        >
            <span style={{ fontSize: 11.5, color: P.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={label}>
                {label}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>{children}</div>
            {changed ? (
                <button
                    title="Reset to default"
                    onClick={onReset}
                    style={{ all: "unset", cursor: "pointer", fontSize: 12, color: P.sub, textAlign: "center" }}
                >
                    ↺
                </button>
            ) : (
                <span />
            )}
        </div>
        {hint && <div style={{ fontSize: 10.5, color: P.sub, margin: "0 0 4px 116px", lineHeight: 1.35 }}>{hint}</div>}
        </div>
    )
}

function NumberInput({
    value,
    min,
    max,
    step,
    unit,
    onChange,
}: {
    value: number
    min: number
    max: number
    step: number
    unit?: string
    onChange: (v: number) => void
}) {
    const decimals = (String(step).split(".")[1] ?? "").length
    return (
        <>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                style={{ flex: 1, minWidth: 0, accentColor: P.text, height: 16 }}
            />
            <input
                type="number"
                step={step}
                value={Number(value.toFixed(Math.min(4, Math.max(decimals, 2))))}
                onChange={(e) => {
                    const v = Number(e.target.value)
                    if (!Number.isNaN(v)) onChange(v)
                }}
                style={{ ...inputBase, width: 58, textAlign: "right", padding: "4px 6px" }}
            />
            {unit !== undefined && <span style={{ fontSize: 10.5, color: P.sub, width: 16 }}>{unit}</span>}
        </>
    )
}

function FieldControl({ field, value, onChange }: { field: Field; value: unknown; onChange: (v: unknown) => void }) {
    switch (field.type) {
        case "number":
            return (
                <NumberInput
                    value={value as number}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    unit={field.unit}
                    onChange={onChange}
                />
            )
        case "color":
            return (
                <>
                    <input
                        type="color"
                        value={String(value).slice(0, 7)}
                        onChange={(e) => onChange(e.target.value.toUpperCase())}
                        style={{ width: 26, height: 26, padding: 0, border: "none", background: "none", cursor: "pointer" }}
                    />
                    <input
                        value={String(value)}
                        onChange={(e) => onChange(e.target.value)}
                        style={{ ...inputBase, flex: 1, fontFamily: "ui-monospace, Menlo, monospace" }}
                    />
                </>
            )
        case "text":
            return <input value={String(value)} onChange={(e) => onChange(e.target.value)} style={{ ...inputBase, flex: 1 }} />
        case "image":
            return <ImageInput value={String(value ?? "")} onChange={onChange} />
        case "bool":
            return (
                <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(e) => onChange(e.target.checked)}
                    style={{ accentColor: P.text, width: 15, height: 15, margin: 0 }}
                />
            )
        case "select":
            return (
                <select
                    value={String(value)}
                    onChange={(e) => {
                        const opt = field.options.find((o) => String(o) === e.target.value)
                        onChange(opt ?? e.target.value)
                    }}
                    style={{ ...inputBase, flex: 1 }}
                >
                    {field.options.map((o) => (
                        <option key={String(o)} value={String(o)}>
                            {String(o)}
                        </option>
                    ))}
                </select>
            )
    }
}

function Group({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
    return (
        <details open={defaultOpen} style={{ borderTop: `1px solid ${P.line}` }}>
            <summary
                style={{
                    cursor: "pointer",
                    listStyle: "none",
                    padding: "11px 14px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: P.text,
                    display: "flex",
                    justifyContent: "space-between",
                }}
            >
                {title}
                <span style={{ color: P.sub, fontWeight: 400 }}>▾</span>
            </summary>
            <div style={{ padding: "0 14px 12px", display: "flex", flexDirection: "column", gap: 2 }}>{children}</div>
        </details>
    )
}

/** Prompts ⇄ textarea: "> prompt" starts a prompt, each following line is a subtask "doing | done | count" */
const stepToLine = (s: QueueStep) =>
    typeof s === "string"
        ? s
        : (s.skill ? `@${s.skill} ` : "") + [s.doing, s.done, s.count].filter((x) => x !== undefined && x !== "").join(" | ")

const lineToStep = (line: string): QueueStep => {
    // "@skill-name doing | done | count": the step runs with that skill
    const m = line.match(/^@(\S+)\s+(.*)$/)
    const l = m ? m[2] : line
    const [doing, done, count] = l.split("|").map((p) => p.trim())
    const k = Number(count)
    const st = done === undefined ? step(doing, doing) : step(doing, done || doing, count && !Number.isNaN(k) ? k : undefined)
    if (m) return { ...(st as object), skill: m[1] } as QueueStep
    return done === undefined ? doing : st
}

const promptsToText = (prompts: AgentPrompt[] = []) =>
    prompts.map((p) => [`> ${p.text}`, ...p.steps.map(stepToLine)].join("\n")).join("\n\n")

const textToPrompts = (value: string, prev: AgentPrompt[] = []): AgentPrompt[] => {
    const out: AgentPrompt[] = []
    for (const raw of value.split("\n")) {
        const l = raw.trim()
        if (!l) continue
        if (l.startsWith(">")) {
            out.push({ id: prev[out.length]?.id ?? `p-${out.length}`, text: l.slice(1).trim(), steps: [] })
            continue
        }
        if (!out.length) out.push({ id: prev[0]?.id ?? "p-0", text: "Untitled", steps: [] })
        out[out.length - 1].steps.push(lineToStep(l))
    }
    return out
}

function PromptsEditor({ prompts, onChange }: { prompts?: AgentPrompt[]; onChange: (p: AgentPrompt[]) => void }) {
    // Local text, so typing a "|" or ">" mid-line isn't immediately re-formatted
    const [value, setValue] = useState(() => promptsToText(prompts))
    return (
        <textarea
            value={value}
            rows={10}
            onChange={(e) => {
                setValue(e.target.value)
                onChange(textToPrompts(e.target.value, prompts))
            }}
            style={{
                ...inputBase,
                width: "100%",
                resize: "vertical",
                fontFamily: "ui-monospace, Menlo, monospace",
                fontSize: 11,
                lineHeight: 1.5,
            }}
        />
    )
}

function AgentEditor({
    agent,
    onChange,
    onRemove,
}: {
    agent: Agent
    onChange: (a: Agent) => void
    onRemove: () => void
}) {
    const set = <K extends keyof Agent>(k: K, v: Agent[K]) => onChange({ ...agent, [k]: v })
    const total = stepsOf(agent).length
    return (
        <details style={{ background: "#FAFAFA", borderRadius: 8, padding: "2px 10px", marginBottom: 6 }}>
            <summary
                style={{
                    cursor: "pointer",
                    listStyle: "none",
                    padding: "8px 0",
                    fontSize: 12,
                    display: "flex",
                    justifyContent: "space-between",
                }}
            >
                <span>
                    {agent.name || "Untitled"} <span style={{ color: P.sub }}>· {agent.status}</span>
                </span>
                <span style={{ color: P.sub }}>{agent.share}%</span>
            </summary>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingBottom: 10 }}>
                <Row label="Name">
                    <input value={agent.name} onChange={(e) => set("name", e.target.value)} style={{ ...inputBase, flex: 1 }} />
                </Row>
                <Row label="Model">
                    <input value={agent.model} onChange={(e) => set("model", e.target.value)} style={{ ...inputBase, flex: 1 }} />
                </Row>
                <Row label="Effort">
                    <input
                        value={agent.effort ?? ""}
                        onChange={(e) => set("effort", e.target.value || undefined)}
                        style={{ ...inputBase, flex: 1 }}
                    />
                </Row>
                <Row label="Share">
                    <NumberInput value={agent.share} min={0} max={100} step={1} unit="%" onChange={(v) => set("share", v)} />
                </Row>
                <Row label="Status">
                    <select
                        value={agent.status}
                        onChange={(e) => set("status", e.target.value as AgentStatus)}
                        style={{ ...inputBase, flex: 1 }}
                    >
                        <option value="active">active</option>
                        <option value="idle">idle</option>
                    </select>
                </Row>
                <Row label="Subtasks done" hint={`Out of ${total}. Where the list starts on load.`}>
                    <NumberInput
                        value={Math.min(agent.tasksDone ?? 0, total)}
                        min={0}
                        max={Math.max(1, total)}
                        step={1}
                        unit=""
                        onChange={(v) => set("tasksDone", v)}
                    />
                </Row>
                {agent.status === "active" && (
                    <>
                        <Row label="Current progress">
                            <NumberInput
                                value={agent.currentProgress ?? 0}
                                min={0}
                                max={99}
                                step={1}
                                unit="%"
                                onChange={(v) => set("currentProgress", v)}
                            />
                        </Row>
                        <Row label="Speed">
                            <NumberInput
                                value={agent.speed ?? 1}
                                min={0.2}
                                max={4}
                                step={0.05}
                                unit="×"
                                onChange={(v) => set("speed", v)}
                            />
                        </Row>
                    </>
                )}
                <div style={{ fontSize: 11, color: P.sub, margin: "6px 0 4px", lineHeight: 1.4 }}>
                    Prompts and subtasks. <code>&gt; prompt</code> starts a prompt; each line after it is a subtask:{" "}
                    <code>doing | done | count</code>. Use {"{n}"} for the counter.
                </div>
                <PromptsEditor
                    key={agent.prompts?.length ?? 0}
                    prompts={agent.prompts}
                    onChange={(p) => set("prompts", p)}
                />
                <button onClick={onRemove} style={{ ...btn, alignSelf: "flex-start", marginTop: 8, color: "#C0392B" }}>
                    Remove agent
                </button>
            </div>
        </details>
    )
}

const btn: CSSProperties = {
    font: `12px ${P.font}`,
    color: P.text,
    background: P.field,
    border: "none",
    borderRadius: 7,
    padding: "6px 10px",
    cursor: "pointer",
}

/** Only the values that differ from the defaults */
export function designDiff(d: Design): Partial<Design> {
    const out: Partial<Design> = {}
    for (const k of Object.keys(DEFAULT_DESIGN) as (keyof Design)[]) {
        if (d[k] !== DEFAULT_DESIGN[k]) (out as Record<string, unknown>)[k] = d[k]
    }
    return out
}

function exportText(d: Design, content: CardContent) {
    const parts = [`design={${JSON.stringify(designDiff(d), null, 4)}}`]
    if (content.used !== DEFAULT_CONTENT.used) parts.push(`used={${content.used}}`)
    if (content.projected !== DEFAULT_CONTENT.projected) parts.push(`projected={${content.projected}}`)
    if (content.daysUntilReset !== DEFAULT_CONTENT.daysUntilReset) parts.push(`daysUntilReset={${content.daysUntilReset}}`)
    if (JSON.stringify(content.agents) !== JSON.stringify(DEFAULT_CONTENT.agents))
        parts.push(`agents={${JSON.stringify(content.agents, null, 4)}}`)
    return `<WeeklyUsageShowcase\n    panel={false}\n    ${parts.join("\n    ")}\n/>`
}

function Panel({
    design,
    setDesign,
    content,
    setContent,
    onClose,
    onResetAll,
    only,
    omit = [],
    extra,
}: {
    design: Design
    setDesign: (fn: (d: Design) => Design) => void
    content: CardContent
    setContent: (fn: (c: CardContent) => CardContent) => void
    onClose: () => void
    onResetAll: () => void
    /** Only these sections (by title), without these settings, and no Content */
    only?: string[]
    omit?: (keyof Design)[]
    /** More settings above the sections (a view's own) */
    extra?: ReactNode
}) {
    const [exported, setExported] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const changedCount = Object.keys(designDiff(design)).length
    // Search: every word has to appear in the setting's name, its section's title or its key;
    // matching sections open, the rest (and non-matching rows) are hidden
    const [query, setQuery] = useState("")
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    const matches = (...texts: string[]) => {
        const hay = texts.join(" ").toLowerCase()
        return words.every((w) => hay.includes(w))
    }
    const shown = only
        ? SECTIONS.filter((sec) => only.includes(sec.title)).map((sec) => ({ ...sec, fields: sec.fields.filter((f) => !omit.includes(f.key)) }))
        : SECTIONS
    const sections = words.length
        ? shown.map((sec) => ({ ...sec, fields: sec.fields.filter((f) => matches(f.label, sec.title, String(f.key))) })).filter(
              (sec) => sec.fields.length > 0,
          )
        : shown
    const showContent = !only && (!words.length || matches("Content used projected days until reset agents"))

    const exportSettings = () => {
        const text = exportText(design, content)
        setExported(text)
        setCopied(false)
        navigator.clipboard
            ?.writeText(text)
            .then(() => setCopied(true))
            .catch(() => setCopied(false))
    }

    const setAgent = (i: number, a: Agent) =>
        setContent((cc) => ({ ...cc, agents: cc.agents.map((x, j) => (j === i ? a : x)) }))

    return (
        <aside
            style={{
                width: 340,
                maxWidth: "100vw",
                height: "100%",
                flexShrink: 0,
                background: "#FFFFFF",
                borderLeft: `1px solid ${P.line}`,
                font: `12px ${P.font}`,
                color: P.text,
                display: "flex",
                flexDirection: "column",
                WebkitFontSmoothing: "antialiased",
            }}
        >
            <header
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    gap: 8,
                }}
            >
                <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Customize</div>
                    <div style={{ fontSize: 11, color: P.sub }}>
                        {changedCount ? `${changedCount} change${changedCount > 1 ? "s" : ""}` : "Defaults"} · u = Figma px
                    </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={exportSettings} style={{ ...btn, background: P.text, color: "#fff" }}>
                        Export
                    </button>
                    <button onClick={onResetAll} style={btn}>
                        Reset
                    </button>
                    <button onClick={onClose} style={btn} title="Hide panel">
                        ✕
                    </button>
                </div>
            </header>

            <div style={{ padding: "0 14px 10px" }}>
                <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Escape" && setQuery("")}
                    placeholder="Search settings"
                    aria-label="Search settings"
                    style={{ ...inputBase, width: "100%", boxSizing: "border-box" }}
                />
            </div>

            {exported && (
                <div style={{ padding: "0 14px 12px" }}>
                    <div style={{ fontSize: 11, color: P.sub, marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                        <span>{copied ? "Copied to clipboard" : "Select and copy"}</span>
                        <button onClick={() => setExported(null)} style={{ all: "unset", cursor: "pointer" }}>
                            Close
                        </button>
                    </div>
                    <textarea
                        readOnly
                        value={exported}
                        rows={8}
                        onFocus={(e) => e.target.select()}
                        style={{ ...inputBase, width: "100%", fontFamily: "ui-monospace, Menlo, monospace", fontSize: 10.5 }}
                    />
                </div>
            )}

            <div style={{ overflowY: "auto", flex: 1 }}>
                {words.length > 0 && sections.length === 0 && !showContent && (
                    <div style={{ padding: "12px 14px", color: P.sub, fontSize: 11 }}>No settings match "{query}"</div>
                )}
                {!words.length && extra}
                {showContent && (
                <Group title="Content" defaultOpen>
                    <Row label="Used">
                        <NumberInput
                            value={content.used}
                            min={0}
                            max={100}
                            step={1}
                            unit="%"
                            onChange={(v) => setContent((cc) => ({ ...cc, used: v }))}
                        />
                    </Row>
                    <Row label="Projected">
                        <NumberInput
                            value={content.projected}
                            min={0}
                            max={150}
                            step={1}
                            unit="%"
                            onChange={(v) => setContent((cc) => ({ ...cc, projected: v }))}
                        />
                    </Row>
                    <Row label="Days until reset">
                        <NumberInput
                            value={content.daysUntilReset}
                            min={0}
                            max={7}
                            step={1}
                            unit=""
                            onChange={(v) => setContent((cc) => ({ ...cc, daysUntilReset: v }))}
                        />
                    </Row>
                    <div style={{ fontSize: 11, color: P.sub, margin: "10px 0 6px" }}>Agents</div>
                    {content.agents.map((a, i) => (
                        <AgentEditor
                            key={a.id}
                            agent={a}
                            onChange={(x) => setAgent(i, x)}
                            onRemove={() => setContent((cc) => ({ ...cc, agents: cc.agents.filter((_, j) => j !== i) }))}
                        />
                    ))}
                    <button
                        style={{ ...btn, alignSelf: "flex-start" }}
                        onClick={() =>
                            setContent((cc) => ({
                                ...cc,
                                agents: [
                                    ...cc.agents,
                                    {
                                        id: `agent-${Date.now()}`,
                                        name: "New agent",
                                        model: "Claude Sonnet 5.5",
                                        effort: "Medium",
                                        share: 5,
                                        status: "idle",
                                        prompts: [],
                                        speed: 1,
                                    },
                                ],
                            }))
                        }
                    >
                        + Add agent
                    </button>
                </Group>
                )}

                {sections.map((s) => (
                    // while searching, the matching sections open (re-keyed so they reopen per search)
                    <Group key={s.title + (words.length ? ":search" : "")} title={s.title} defaultOpen={words.length > 0 || !!only}>
                        {s.fields.map((f) => (
                            <Row
                                key={f.key}
                                label={f.label}
                                changed={design[f.key] !== DEFAULT_DESIGN[f.key]}
                                onReset={() => setDesign((dd) => ({ ...dd, [f.key]: DEFAULT_DESIGN[f.key] }))}
                                dimmed={f.activeWhen ? !f.activeWhen(design) : false}
                                hint={
                                    f.activeWhen && !f.activeWhen(design)
                                        ? "Not visible right now. Changing it switches it on."
                                        : f.hint
                                }
                            >
                                <FieldControl
                                    field={f}
                                    value={design[f.key]}
                                    onChange={(v) => setDesign((dd) => ({ ...dd, [f.key]: v, ...f.sets }))}
                                />
                            </Row>
                        ))}
                    </Group>
                ))}
                <div style={{ height: 24 }} />
            </div>
        </aside>
    )
}

/* ------------------------------------------------------------------ */
/* Showcase                                                            */
/** The panel with only the backdrop's settings (the pair view's backdrop: full screen, no frame) */
export function BackdropPanel({ design, setDesign, onClose, onReset, scale, setScale, autoSec, setAutoSec }: {
    design: Design
    setDesign: (fn: (d: Design) => Design) => void
    onClose: () => void
    onReset: () => void
    /** Size of the cards, 1 = as drawn */
    scale: number
    setScale: (v: number) => void
    /** Seconds between prompts the agents send by themselves (0: never) */
    autoSec: number
    setAutoSec: (v: number) => void
}) {
    return (
        <Panel
            design={design}
            setDesign={setDesign}
            content={DEFAULT_CONTENT}
            setContent={() => {}}
            onClose={onClose}
            onResetAll={onReset}
            only={["Backdrop"]}
            omit={["backdropRatio", "backdropSurround", "backdropRadius", "backdropMargin"]}
            extra={
                <Group title="Cards" defaultOpen>
                    <Row label="Size" changed={scale !== 1} onReset={() => setScale(1)} hint="Both cards, 1 = as drawn">
                        <NumberInput value={scale} min={0.5} max={1.6} step={0.01} unit="×" onChange={setScale} />
                    </Row>
                    <Row label="Prompt by itself every" changed={autoSec !== 8} onReset={() => setAutoSec(8)} hint="Keeps the agents working: one that's done sends a suggested prompt on its own (0: never)">
                        <NumberInput value={autoSec} min={0} max={60} step={1} unit="s" onChange={setAutoSec} />
                    </Row>
                </Group>
            }
        />
    )
}

/* ------------------------------------------------------------------ */

const STORAGE_KEY = "agent-overview-panel-v1"
/** Prompts sent in an agent's chat (ids from the send time); never saved */
const isChatPrompt = (pr: AgentPrompt) => /^p-\d{10,}$/.test(pr.id)
/** px of room at each end of the scrolling agent list (see the list) */
const LIST_EDGE = 4

/** Distance from one card in the list to the next, exact (fractional), in layout px */
function listStep(list: HTMLElement): number {
    const shown = [...list.children].filter((c) => (c as HTMLElement).style.display !== "none") as HTMLElement[]
    if (!shown.length) return 1
    const scale = list.getBoundingClientRect().height / (list.offsetHeight || 1) || 1
    if (shown.length > 1) return (shown[1].getBoundingClientRect().top - shown[0].getBoundingClientRect().top) / scale || 1
    return shown[0].getBoundingClientRect().height / scale + (parseFloat(getComputedStyle(list).rowGap) || 0)
}
/** Bumped when saved settings need a one-time fix-up on load (see loadSaved) */
const MIGRATION = 5

function loadSaved(key = STORAGE_KEY): { design?: Partial<Design>; content?: CardContent } {
    try {
        const raw = window.localStorage.getItem(key)
        const saved = raw ? JSON.parse(raw) : {}
        // One-time: chip and close button colours were set to #F0F0F0 by request,
        // so earlier saved values for them shouldn't hide that
        // Title renamed to "Workload": drop a saved copy of the old default
        if (saved.design && (saved.migrated ?? 0) < 2 && saved.design.titleText === "Agent overview") delete saved.design.titleText
        // Prompt chip text size changed: drop an older saved size
        if (saved.design && (saved.migrated ?? 0) < 4) delete saved.design.promptChipSize
        // Title is medium now: drop an older saved weight
        if (saved.design && (saved.migrated ?? 0) < 5) delete saved.design.titleWeight
        if (saved.design && (saved.migrated ?? 0) < 1) {
            delete saved.design.counterBg
            delete saved.design.closeBg
            delete saved.design.closeHoverBg
        }
        // Agents saved before prompts existed: use the sample agent with the same id
        // (keeping name, model, effort and share), or turn the old step list into one prompt
        if (saved.content?.agents) {
            saved.content.agents = saved.content.agents.map((a: Agent & { queue?: QueueStep[] }) => {
                // Chats aren't kept between visits: settings saved before that rule still hold
                // prompts sent in the chat, so drop them (and put a sample agent back as it was)
                if (a.prompts?.some(isChatPrompt)) {
                    const sample = sampleAgents.find((x) => x.id === a.id)
                    if (sample) return { ...sample, name: a.name, model: a.model, effort: a.effort, share: a.share }
                    a = { ...a, prompts: a.prompts.filter((pr) => !isChatPrompt(pr)) }
                }
                // On load, a working agent starts on its latest prompt (everything before it
                // counts as done), whatever point it had reached when the page was saved
                if (a.prompts && a.status === "active") {
                    const { skills: _old, ...rest } = a
                    return { ...rest, tasksDone: stepsBeforeLast(a), currentProgress: 0 }
                }
                // Skills now come from install subtasks; drop the old pre-filled list
                if (a.prompts && a.skills) {
                    const { skills: _old, ...rest } = a
                    return rest
                }
                if (a.prompts) return a
                const sample = sampleAgents.find((x) => x.id === a.id)
                if (sample) return { ...sample, name: a.name, model: a.model, effort: a.effort, share: a.share }
                const { queue, ...rest } = a
                return { ...rest, prompts: queue?.length ? [{ id: "p-legacy", text: "Earlier work", steps: queue }] : [] }
            })
        }
        return saved
    } catch {
        return {}
    }
}

export interface ShowcaseProps extends WeeklyUsageCardProps {
    /** Show the settings panel (turn off in Framer or for screenshots) */
    panel?: boolean
    mode?: "screen" | "fill"
    /** Put the panel (and its Customize button) here instead of beside the card, so the card
     *  keeps its own place on the page while you tune it */
    panelPortal?: HTMLElement
    /** Where the panel saves its edits in this browser; give views their own key to keep
     *  their settings apart */
    storageKey?: string
}

/** The card centered on its backdrop, with a live settings panel beside it */
export function WeeklyUsageShowcase({
    panel = true,
    mode = "screen",
    panelPortal,
    storageKey = STORAGE_KEY,
    design: designProp,
    used,
    projected,
    daysUntilReset,
    agents,
    ...cardProps
}: ShowcaseProps) {
    const initialContent: CardContent = {
        used: used ?? DEFAULT_CONTENT.used,
        projected: projected ?? DEFAULT_CONTENT.projected,
        daysUntilReset: daysUntilReset ?? DEFAULT_CONTENT.daysUntilReset,
        agents: agents ?? DEFAULT_CONTENT.agents,
    }
    const [design, setDesign] = useState<Design>(() => ({
        ...DEFAULT_DESIGN,
        ...designProp,
        ...(panel ? loadSaved(storageKey).design : undefined),
    }))
    // without a panel, settings passed in later apply too (the pair view's own controls)
    const designKey = panel ? "" : JSON.stringify(designProp ?? {})
    useEffect(() => {
        if (!panel) setDesign({ ...DEFAULT_DESIGN, ...designProp })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [designKey])
    const [content, setContent] = useState<CardContent>(() => (panel && loadSaved(storageKey).content) || initialContent)
    // What happens in the card (chats, agents finishing) lives here and isn't saved: every
    // load starts fresh. Editing the agents in the panel starts over from those edits.
    const [liveAgents, setLiveAgents] = useState(content.agents)
    useEffect(() => setLiveAgents(content.agents), [content.agents])
    const [open, setOpen] = useState(true)
    // Bumped by "Reset" to restart the card from scratch
    const [cardKey, setCardKey] = useState(0)

    // Remember panel edits in this browser
    useEffect(() => {
        if (!panel) return
        try {
            // keeps any one-time flags the page set on it (e.g. "blurFromCode")
            const prev = JSON.parse(window.localStorage.getItem(storageKey) || "{}")
            window.localStorage.setItem(storageKey, JSON.stringify({ ...prev, design: designDiff(design), content, migrated: MIGRATION }))
        } catch {
            // Usually a big uploaded image going over the browser's storage limit:
            // keep everything else, just not the image
            try {
                const { backdropImage: _img, ...rest } = designDiff(design) as Partial<Design>
                window.localStorage.setItem(storageKey, JSON.stringify({ design: rest, content, migrated: MIGRATION }))
            } catch {
                /* storage unavailable */
            }
        }
    }, [panel, storageKey, design, content])

    // Backdrop: the whole screen, or a frame in the chosen aspect ratio, centred
    const ratio = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)/.exec(design.backdropRatio)
    const backdrop = (
        <Backdrop
            mode="fill"
            fit={design.fit}
            background={backdropPaint(design)}
            cardWidth={design.cardWidth}
            blur={design.backdropBlur}
            overlay={design.backdropOverlay}
            overlayOpacity={design.backdropOverlayOpacity}
            style={ratio ? { borderRadius: design.backdropRadius } : undefined}
        >
            <WeeklyUsageCard
                key={cardKey}
                {...cardProps}
                {...content}
                agents={liveAgents}
                design={design}
                onAgentsChange={setLiveAgents}
            />
        </Backdrop>
    )
    const stage = ratio ? (
        <div
            style={
                {
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: design.backdropSurround,
                    containerType: "size",
                } as CSSProperties
            }
        >
            <div
                style={{
                    // As large as fits inside the margin, in the chosen ratio
                    width: `min(100cqw - ${2 * design.backdropMargin}px, (100cqh - ${2 * design.backdropMargin}px) * ${+ratio[1]} / ${+ratio[2]})`,
                    aspectRatio: `${ratio[1]} / ${ratio[2]}`,
                    borderRadius: design.backdropRadius,
                    overflow: "hidden",
                    flexShrink: 0,
                }}
            >
                {backdrop}
            </div>
        </div>
    ) : (
        backdrop
    )

    const customize = panel && !open && (
        <button
            onClick={() => setOpen(true)}
            style={{
                ...btn,
                position: "absolute",
                top: 12,
                right: 12,
                background: "#FFFFFF",
                boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
            }}
        >
            Customize
        </button>
    )
    const panelEl = panel && open && (
        <Panel
            design={design}
            setDesign={setDesign}
            content={content}
            setContent={setContent}
            onClose={() => setOpen(false)}
            onResetAll={() => {
                setDesign({ ...DEFAULT_DESIGN, ...designProp })
                setContent(initialContent)
                setCardKey((k) => k + 1)
            }}
        />
    )

    return (
        <div
            style={{
                ...(mode === "screen" ? { position: "fixed", inset: 0 } : { position: "relative", width: "100%", height: "100%" }),
                display: "flex",
                overflow: "hidden",
                background: ratio ? design.backdropSurround : design.backdrop,
            }}
        >
            <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
                {stage}
                {!panelPortal && customize}
            </div>
            {panelPortal
                ? createPortal(
                      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 2147483000, display: "flex" }}>
                          {panelEl}
                          {customize}
                      </div>,
                      panelPortal,
                  )
                : panelEl}
        </div>
    )
}

export default WeeklyUsageShowcase
