import { DialRoot, useDialKit } from "dialkit"
import "dialkit/styles.css"
import { WeeklyUsageShowcase, sampleAgents, stepsOf } from "../components/islands/WeeklyUsageCard"
import { SITE_DESIGN } from "../components/islands/WeeklyUsageIsland"

// Dev-only page (/tune/grid, see astro.config.mjs): the Workload card with its four agents
// in a 2x2 grid, the layout tried before the scrollable list. Same card as on the site,
// only the agent list is laid out differently. Switch Layout to compare with the list.
const config = {
    Layout: { type: "select" as const, options: ["Grid 2x2", "List"], default: "Grid 2x2" },
    // 1 = the card filling the window as on the site; above 1 it runs past the window
    Scale: [1, 0.3, 2.5, 0.01],
    Card: {
        width: [150, 110, 220, 1],
        padding: [4, 2, 8, 0.25],
    },
    Agents: {
        gap: [3, 1, 8, 0.25],
        tilePadding: [3, 1.5, 6, 0.25],
        tileRadius: [3, 0, 8, 0.25],
        // name, model line and task lines together (1 = as on the site); the token count stays
        textSize: [1, 0.7, 1.4, 0.01],
        // the usage chip's text: 2.64 = 11px beside a 20px title
        chipSize: [2.64, 1.8, 4, 0.01],
        chipFill: "#EBEBEB",
        // the agent cards: fill, border and fill on hover (the site's colours)
        cardFill: "#FFFFFF",
        cardBorder: "#DEDEDE",
        cardHover: "#F7F7F7",
        toggle: false,
    },
    Project: {
        show: true,
        // off: no fill or padding, just the icon and text
        pill: true,
        // off: the folder icon and the name only
        label: true,
        chevron: true,
        // 2.88 = 12px beside a 20px title
        size: [2.88, 2, 5, 0.01],
        padX: [1.9, 0.5, 4, 0.05],
        padY: [1.9, 0.5, 4, 0.05],
        gap: [1, 0.25, 3, 0.05],
        // the folder icon's stroke (1 = as in the SVG file)
        iconStroke: [1, 0.5, 2.5, 0.05],
        fill: "#F0F0F0",
        // folder icon and "Project:"
        labelColor: "#6E6E6E",
        nameColor: "#000000",
    },
    Background: "#F8F8F8",
}

// On every load all four agents are working: one task running and 3 waiting behind it
// (the last four subtasks of each one's list), so the grid shows them all busy at once
const BACKLOG = 3
const BUSY_AGENTS = sampleAgents.map((a) => ({
    ...a,
    status: "active" as const,
    tasksDone: Math.max(0, stepsOf(a).length - 1 - BACKLOG),
    currentProgress: 0,
}))

export default function GridTune() {
    const v = useDialKit("Workload grid", config, { id: "workload-grid-2", persist: true })
    const grid = v.Layout === "Grid 2x2"
    return (
        <>
            <div style={{ position: "fixed", inset: 0, background: v.Background, overflow: "hidden" }}>
                {/* The card fills its frame; the frame grows and shrinks with Scale around the
                    window's centre (sizes, not a transform, so opening an agent still lines up) */}
                <div
                    style={{
                        position: "absolute",
                        left: `${50 - 50 * v.Scale}vw`,
                        top: `${50 - 50 * v.Scale}vh`,
                        width: `${100 * v.Scale}vw`,
                        height: `${100 * v.Scale}vh`,
                    }}
                >
                    <WeeklyUsageShowcase
                        panel={false}
                        mode="fill"
                        agents={BUSY_AGENTS}
                        design={{
                            ...SITE_DESIGN,
                            backdrop: "transparent",
                            backdropImage: "",
                            backdropRatio: "Fill screen",
                            fit: 0.85,
                            cardWidth: grid ? v.Card.width : 118,
                            cardPadding: v.Card.padding,
                            agentColumns: grid ? 2 : 1,
                            // the grid shows all four at once; the list scrolls after two
                            maxVisibleTiles: grid ? 0 : 2,
                            tileGap: v.Agents.gap,
                            tilePadding: v.Agents.tilePadding,
                            tileRadius: v.Agents.tileRadius,
                            nameSize: 4 * v.Agents.textSize,
                            modelSize: 3.2 * v.Agents.textSize,
                            taskSize: 3.2 * v.Agents.textSize,
                            showToggle: v.Agents.toggle,
                            // each agent's usage in a chip at its top right, instead of in the model line;
                            // the Agents count chip hidden
                            shareDisplay: "Chip",
                            shareChipSize: v.Agents.chipSize,
                            shareChipBg: v.Agents.chipFill,
                            tileFill: true,
                            tileBg: v.Agents.cardFill,
                            tileBorderColor: v.Agents.cardBorder,
                            tileHoverBg: v.Agents.cardHover,
                            showAgentCount: false,
                            projectFolder: v.Project.show ? "Dashboard" : "",
                            projectLabel: "Project:",
                            projectShowLabel: v.Project.label,
                            projectChevron: v.Project.chevron,
                            projectSize: v.Project.size,
                            projectGap: v.Project.gap,
                            projectIconStroke: v.Project.iconStroke,
                            // a grey pill, fully rounded
                            projectPadX: v.Project.pill ? v.Project.padX : 0,
                            projectPadY: v.Project.pill ? v.Project.padY : 0,
                            projectRadius: 99,
                            projectBg: v.Project.pill ? v.Project.fill : "transparent",
                            projectLabelColor: v.Project.labelColor,
                            projectNameColor: v.Project.nameColor,
                        }}
                    />
                </div>
            </div>
            <DialRoot position="top-right" />
        </>
    )
}
