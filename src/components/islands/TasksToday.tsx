import { useDialKit, type DialConfig } from "dialkit";
import { animate, motion, useMotionValue, type MotionValue, type Transition } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";

/** Figma frame "Frame 232" (node 99:2) is 231 × 164. Every length below is authored in Figma px. */
export const BASE_WIDTH = 231;
export const BASE_HEIGHT = 164;

/** Figma px → scaled CSS length. */
const u = (n: number) => `calc(var(--u) * ${n})`;

/* Defaults: Figma Dev Mode values (Frame 232, Nov 4). Ranges ≈ 0.5×–2× the default. */
export const tasksTodayConfig = {
  Scale: [1.14, 0.4, 2, 0.01],
  Card: {
    background: "#ffffff",
    borderWidth: [0.5, 0, 2, 0.1],
    borderColor: "rgba(238,238,238,0.7)",
    radius: [14, 7, 36, 1],
    paddingTop: [10, 5, 20, 1],
    paddingRight: [13, 6.5, 26, 0.5],
    paddingBottom: [13, 6.5, 26, 0.5],
    paddingLeft: [10, 5, 20, 0.5],
    gap: [10, 5, 20, 1],
    shadowX: [0, -20, 20, 1],
    shadowY: [0, -20, 20, 1],
    shadowBlur: [0, 0, 60, 1],
    shadowSpread: [0, -20, 20, 1],
    shadowColor: "#00000000",
  },
  Title: {
    text: "Tasks today",
    size: [9, 4.5, 18, 0.5],
    weight: [500, 300, 800, 10],
    lineHeight: [1, 0.5, 2, 0.01],
    letterSpacing: [-0.14, -0.54, 0.27, 0.01],
    color: "#0c0a0a",
  },
  Button: {
    show: true,
    label: "Add task",
    background: "#252525",
    hoverBackground: "#3a3a3a", // on hover the button lightens a little (it doesn't grow)
    hoverMs: [150, 0, 400, 10],
    pressScale: [0.95, 0.8, 1, 0.01], // on press the button's shape shrinks; the label stays put
    radius: [5, 2, 10, 0.5],
    paddingY: [4, 2, 8, 0.5],
    paddingLeft: [4, 2, 8, 0.5],
    paddingRight: [5, 2.5, 10, 0.5],
    gap: [2, 1, 4, 0.5],
    iconSize: [4, 2, 8, 0.05],
    size: [6, 3, 12, 0.5],
    weight: [400, 300, 700, 10],
    lineHeight: [0.7, 0.35, 1.4, 0.01],
    letterSpacing: [-0.12, -0.28, 0.28, 0.01],
    color: "#ffffff",
  },
  List: {
    indent: [18, 9, 36, 1],
    gap: [10, 5, 20, 1],
    // the card beside the label (halfway down) sits this much further in (7 in Figma)
    currentIndent: [7, 0, 20, 0.5],
    shrinkMs: [380, 0, 1000, 10],
    // the list shows this much (119 = the three rows of the Figma frame); it scrolls freely
    // (wheel, trackpad, finger) and snaps to the nearest card settleMs after it stops
    height: [119, 60, 240, 1],
    fade: [0, 0, 30, 1], // the soft top / bottom edge when there's more list beyond (0 = off)
    move: { type: "spring", visualDuration: 0.3, bounce: 0.1 },
    scrollSpeed: [0.45, 0.1, 2, 0.05], // list px per px scrolled (1 = as fast as the page)
    settleMs: [120, 40, 600, 10],
  },
  Task: {
    height: [33, 16, 66, 0.5],
    paddingX: [7, 3.5, 14, 0.5],
    paddingY: [5, 2.5, 10, 0.5],
    gap: [8, 4, 16, 0.5], // progress bar → text
    radius: [8, 4, 16, 0.5],
    titleSize: [8, 4.5, 18, 0.5],
    titleLineHeight: [1, 0.5, 2, 0.01],
    titleTracking: [-0.13, -0.72, 0.36, 0.01],
    rowGap: [5, 2.5, 10, 0.5], // title → times
    timeSize: [6, 3, 12, 0.5],
    timeWeight: [500, 300, 800, 10],
    timeTracking: [0.12, -0.48, 0.24, 0.01],
    timeGap: [1.5, 0, 4, 0.1], // either side of the dash
    // the progress bar down the left of each card: it fills from the top as the task goes on
    barWidth: [1.7, 1, 4, 0.1],
    barRadius: [5, 0, 5, 0.1],
    trackColor: "#e0e0e0",
    barColor: "#11d064",
  },
  Done: {
    title: "Lunch with Alex",
    tag: "Friends",
    start: "13:00",
    end: "14:00",
    background: "#f8f8f8",
    titleWeight: [400, 300, 800, 10],
    titleColor: "rgba(0,0,0,0.25)",
    timeColor: "rgba(0,0,0,0.25)",
    chipHue: [310, 0, 360, 1], // purple: oklch(0.69 0.24 310), as in the reference (lightness etc. under Pill)
    pillOpacity: [0.5, 0, 1, 0.05],
  },
  Now: {
    title: "Client call",
    tag: "Work",
    start: "15:20",
    end: "16:15",
    background: "#f8f8f8",
    titleWeight: [500, 300, 800, 10],
    titleColor: "#000000",
    timeColor: "#000000",
    // how long the task still runs: the badge says it, and the bar and the rail's ring fill
    // with the rest (23 of the 55 minutes left = 58% gone)
    minutesLeft: [23, 0, 120, 1],
    chipHue: [245, 0, 360, 1], // blue
    badgeHue: [150, 0, 360, 1], // green
    chipGap: [3, 1.5, 6, 0.5], // the badge above the tag
  },
  Upcoming: {
    title: "Board meeting",
    tag: "Work",
    start: "16:45",
    end: "17:10",
    background: "#f8f8f8",
    titleWeight: [400, 300, 800, 10],
    titleColor: "#000000",
    timeColor: "#000000",
    chipHue: [245, 0, 360, 1], // blue
  },
  Pill: {
    padding: [3, 1.5, 6, 0.5], // above and below
    paddingLeft: [3.5, 1, 8, 0.25],
    paddingRight: [3.5, 1, 8, 0.25],
    radius: [7, 3.5, 14, 0.5],
    size: [6, 3, 12, 0.5],
    weight: [500, 300, 800, 10], // Figma's 510
    tracking: [0, -0.48, 0.24, 0.01],
    // every chip is one oklch colour: the text at full strength, the fill the same colour at
    // fillAlpha. Same lightness and chroma for all, so no tag reads louder than another;
    // only the hue changes (each task's hue is in its own section)
    lightness: [0.69, 0.4, 0.9, 0.01],
    chroma: [0.24, 0, 0.37, 0.01],
    fillAlpha: [0.2, 0, 1, 0.01],
    // the rest of the day, above and below the three tasks: Team standup, Design review (Work), Gym (Health)
    workHue: [245, 0, 360, 1], // blue
    workLightness: [0.76, 0.4, 0.9, 0.01], // the Work chips' own lightness: blue reads darker than the others at the same value
    healthHue: [25, 0, 360, 1], // red: oklch(0.69 0.24 25), as in the reference
    // a symbol before the text: the clock on the badge, and one per tag (work.svg, friend.svg, health.svg)
    icons: true,
    iconSize: [5.95, 3, 12, 0.05], // its height (the clock's 5.95 in Figma)
    iconGap: [1.5, 0.5, 4, 0.1],
    iconPaddingY: [2, 1, 4, 0.5], // above and below, on a chip with a symbol (the badge's 2 in Figma)
  },
  Rail: {
    x: [14.8, 7, 30, 0.05],
    lineWidth: [0.5, 0.25, 1, 0.05],
    lineColor: "#e7e7e7",
    // the line stops this far short of each marker (instead of a white ring hiding it)
    halo: [2.5, 0, 6, 0.5],
    markerSize: [9, 5, 20, 0.5],
    doneColor: "#3ac860",
    checkColor: "#ffffff",
    pendingColor: "#d3d3d3",
    // the current task's marker (seen when the list moves it away from the label): a ring
    // that fills clockwise from the top as the task goes on (Now → Progress, like its bar)
    nowStroke: [1, 0.3, 2, 0.05], // the ring's thickness
    nowTrackOpacity: [0.23, 0, 1, 0.01], // the part still to come: the same green, this faint
    nowRoundCaps: false,
    // what the green part is: the time gone, like the bar (from 12 o'clock, clockwise), or the
    // time left (like a timer: it ends at 12 o'clock and shrinks as the task goes on)
    nowRingShows: { type: "select", options: ["time gone", "time left"], default: "time gone" },

    // the label halfway down the rail (just text now, no tag): the line breaks this far
    // above and below its middle
    labelGap: [7.4, 2, 15, 0.1],
    tagText: "Now",
    tagTextColor: "#3ac860",
    doneTagText: "Done",
    doneTagTextColor: "rgba(0,0,0,0.4)",
    upcomingTagText: "Soon",
    upcomingTagTextColor: "#8a8a8a",
    tagColorMs: [200, 0, 600, 10],
    tagTextSize: [7.5, 3.5, 15, 0.5],
    tagTextWeight: [500, 300, 800, 10], // Figma's 590: the site loads Inter Display 400 and 500 only
  },
  Motion: {
    // on load: the header, then the tasks one by one from the top down, then the current
    // task's bar (and its ring) fills
    intro: true,
    enter: { type: "spring", visualDuration: 0.5, bounce: 0.2 },
    enterY: [-30, -100, 100, 1], // where a task comes in from, in % of its height (− = above)
    stagger: [0.08, 0, 0.3, 0.01], // between one task and the next
    barDelay: [0.45, 0, 1.5, 0.01], // after the last task starts coming in, the current task's bar (and ring) fills
    progress: { type: "spring", visualDuration: 0.6, bounce: 0 },
    hoverLift: [1, 0, 4, 0.1],
    replay: { type: "action" },
    copyValues: { type: "action", label: "Copy values" },
  },
} satisfies DialConfig;

type Values = ReturnType<typeof useTasksTodayDials>;

function useTasksTodayDials(onAction: (a: string) => void) {
  // tuned values are kept in this browser on the dev server only (localhost:4322/tune/tasks);
  // on the site the defaults above are what everyone sees
  // (the id is versioned: a browser's saved values from the previous design are left behind)
  return useDialKit("TasksToday", tasksTodayConfig, { id: "tasks-today-30", persist: import.meta.env.DEV, onAction });
}

const textBoxTrim = { textBox: "trim-both cap alphabetic" } as CSSProperties;

export function TasksToday({ className, style }: { className?: string; style?: CSSProperties }) {
  const [run, setRun] = useState(0);
  const latest = useRef<unknown>(null);
  const values = useTasksTodayDials((action) => {
    if (action.endsWith("replay")) setRun((r) => r + 1);
    if (action.endsWith("copyValues")) {
      void copyText(buildDefaultsSnippet("tasksToday", tasksTodayConfig, latest.current));
    }
  });
  useEffect(() => {
    latest.current = values;
  });

  const pct = values.Scale * 100;
  return (
    <div className={className} style={{ width: "100%", ...style }}>
      <div
        style={{
          width: `${pct}%`,
          marginInline: `calc((100% - ${pct}%) / 2)`,
          containerType: "inline-size",
        }}
      >
        <Card key={run} v={values} />
      </div>
    </div>
  );
}

function Card({ v }: { v: Values }) {
  const c = v.Card;
  const enter = v.Motion.enter as Transition;
  return (
    <div
      data-component="tasks-today"
      style={
        {
          "--u": `calc(100cqw / ${BASE_WIDTH})`,
          position: "relative",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: u(c.gap),
          padding: `${u(c.paddingTop)} ${u(c.paddingRight)} ${u(c.paddingBottom)} ${u(c.paddingLeft)}`,
          background: c.background,
          borderRadius: u(c.radius),
          overflow: "clip",
          fontFamily: '"Inter Display", Geist, sans-serif', // the site's own font
          // Figma strokes don't take up layout space, so borders are drawn as inset shadows.
          boxShadow: `inset 0 0 0 ${u(c.borderWidth)} ${c.borderColor}, ${u(c.shadowX)} ${u(c.shadowY)} ${u(c.shadowBlur)} ${u(c.shadowSpread)} ${c.shadowColor}`,
        } as CSSProperties
      }
    >
      <Header v={v} transition={enter} />
      <TaskList v={v} />
    </div>
  );
}

function Header({ v, transition }: { v: Values; transition: Transition }) {
  const t = v.Title;
  const b = v.Button;
  return (
    <motion.div
      initial={v.Motion.intro ? { opacity: 0, y: "-40%" } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={transition}
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}
    >
      <p
        style={{
          fontSize: u(t.size),
          fontWeight: t.weight,
          lineHeight: t.lineHeight,
          letterSpacing: u(t.letterSpacing),
          color: t.color,
          whiteSpace: "nowrap",
        }}
      >
        {t.text}
      </p>
      {b.show && (
      <motion.button
        type="button"
        initial="rest"
        animate="rest"
        whileHover="hover"
        whileTap="press"
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: u(b.gap),
          padding: `${u(b.paddingY)} ${u(b.paddingRight)} ${u(b.paddingY)} ${u(b.paddingLeft)}`,
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        {/* the button's shape, behind the label: it lightens on hover and shrinks on press,
            while the plus and the text stay exactly where they are */}
        <motion.span
          aria-hidden
          variants={{
            rest: { scale: 1, backgroundColor: b.background },
            hover: { scale: 1, backgroundColor: b.hoverBackground },
            press: { scale: b.pressScale, backgroundColor: b.hoverBackground },
          }}
          transition={{
            scale: { type: "spring", visualDuration: 0.2, bounce: 0.3 },
            backgroundColor: { duration: b.hoverMs / 1000, ease: "easeOut" },
          }}
          style={{ position: "absolute", inset: 0, borderRadius: u(b.radius), zIndex: 0 }}
        />
        {/* Figma's plus (node 99:17) */}
        <svg viewBox="0 0 4 4" style={{ position: "relative", width: u(b.iconSize), height: u(b.iconSize), display: "block" }} aria-hidden>
          <path
            d="M2.22222 1.77778H4V2.22222H2.22222V4H1.77778V2.22222H0V1.77778H1.77778V0H2.22222V1.77778Z"
            fill={b.color}
          />
        </svg>
        <span
          style={{
            position: "relative",
            fontSize: u(b.size),
            fontWeight: b.weight,
            lineHeight: b.lineHeight,
            letterSpacing: u(b.letterSpacing),
            color: b.color,
            whiteSpace: "nowrap",
          }}
        >
          {b.label}
        </span>
      </motion.button>
      )}
    </motion.div>
  );
}

type State = "done" | "now" | "upcoming";
type Item = { state: State; title: string; tag: string; start: string; end: string; hue?: number };

// The day around the three tasks of the design (those come from the panel)
const EARLIER: Item[] = [
  { state: "done", title: "Team standup", tag: "Work", start: "09:30", end: "09:45" },
  { state: "done", title: "Design review", tag: "Work", start: "11:00", end: "12:00" },
];
const LATER: Item[] = [{ state: "upcoming", title: "Gym", tag: "Health", start: "18:30", end: "19:30" }];

function agenda(v: Values): Item[] {
  const pick = (state: State, s: { title: string; tag: string; start: string; end: string; chipHue: number }): Item => ({
    state,
    title: s.title,
    tag: s.tag,
    start: s.start,
    end: s.end,
    hue: s.chipHue,
  });
  return [...EARLIER, pick("done", v.Done), pick("now", v.Now), pick("upcoming", v.Upcoming), ...LATER];
}

/**
 * The list scrolls freely and settles on the nearest card. The label stays put halfway down on
 * the rail and reads Done / Now / Soon for the card beside it, which sits a little further in;
 * the others run full width. The list never shows empty space above or below: it scrolls only
 * as far as a card can still sit beside the tag (so the very first and last cards show above
 * and below it at the ends). It opens on the current task.
 *
 * Where the list is: `pos`, in cards (fractional while it moves). Each card has a resting
 * place for the list (ys) and for the tag (tags); in between, both are blended.
 */
function TaskList({ v }: { v: Values }) {
  const l = v.List;
  const r = v.Rail;
  const railLeft = r.x - v.Card.paddingLeft; // rail centre, relative to the list box
  const items = agenda(v);
  const count = items.length;
  const start = Math.max(0, items.findIndex((i) => i.state === "now"));
  const [index, setIndex] = useState(start);
  const pos = useMotionValue(start);
  const y = useMotionValue(0);
  const tagY = useMotionValue(0);
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const lineLayer = useRef<HTMLDivElement>(null);
  // lo / hi: the first and last card that can sit beside the tag (halfway down) without the
  // list showing empty space above or below; the list scrolls between those
  const stops = useRef({ ys: [0], tags: [0], pitch: 40, lo: 0, hi: count - 1, mids: [0], vh: 0, unit: 1 });
  const clampPos = (p: number) => Math.min(stops.current.hi, Math.max(stops.current.lo, p));
  const blend = (arr: number[], p: number) => {
    const i = Math.max(0, Math.min(arr.length - 1, Math.floor(p)));
    const j = Math.min(arr.length - 1, i + 1);
    return arr[i] + (arr[j] - arr[i]) * Math.max(0, Math.min(1, p - i));
  };
  const rail = useRef(r); // the panel's latest values, for apply (subscribed once, below)
  rail.current = r;
  const apply = (p: number) => {
    const s = stops.current;
    const t = blend(s.tags, p);
    const yy = blend(s.ys, p);
    y.set(yy);
    // each edge's fade is only there when there's more list beyond it: none at the start
    // (top) or the end (bottom), growing in over the first fade's worth of scrolling
    const vp = viewport.current;
    if (vp) {
      vp.style.setProperty("--fade-top", `${Math.max(0, s.ys[s.lo] - yy)}px`);
      vp.style.setProperty("--fade-bottom", `${Math.max(0, yy - s.ys[s.hi])}px`);
    }
    tagY.set(t);
    lineLayer.current?.style.setProperty("--tag-y", `${t}px`);
    setIndex(Math.round(clampPos(p)));
    // the label stands in for the marker beside it: each marker fades out as it nears the
    // label and back in as it leaves, wherever the list is (so a fast scroll never shows a
    // marker under the word)
    const markers = content.current?.querySelectorAll<HTMLElement>("[data-marker]");
    markers?.forEach((m, i) => {
      const d = Math.abs(s.mids[i] + yy - (s.vh / 2 + t)) / s.unit; // marker ↔ label, in design units
      const gone = rail.current.labelGap + rail.current.markerSize / 2; // touching the label's gap: hidden
      const back = gone + rail.current.markerSize; // a marker's width further: fully back
      m.style.opacity = String(Math.max(0, Math.min(1, (d - gone) / (back - gone))));
    });
  };
  useEffect(() => pos.on("change", apply), []);

  // the resting places, from the cards' layout
  const measure = () => {
    const vp = viewport.current;
    const c = content.current;
    if (!vp || !c) return;
    const rows = Array.from(c.querySelectorAll<HTMLElement>("[data-task]"));
    const vh = vp.clientHeight;
    const minY = Math.min(0, vh - c.offsetHeight);
    const mid = (row: HTMLElement) => row.offsetTop + row.offsetHeight / 2;
    const centred = rows.map((row) => vh / 2 - mid(row));
    const fits = (y: number) => y <= 0.5 && y >= minY - 0.5;
    let lo = centred.findIndex(fits);
    let hi = rows.length - 1 - [...centred].reverse().findIndex(fits);
    if (lo < 0) lo = hi = Math.max(0, Math.min(rows.length - 1, start)); // a list too short to scroll
    const ys = centred.map((y) => Math.max(minY, Math.min(0, y)));
    const tags = rows.map((row, i) => mid(row) + ys[i] - vh / 2); // 0 between lo and hi
    const card = vp.closest<HTMLElement>("[data-component='tasks-today']");
    stops.current = {
      ys,
      tags,
      pitch: rows.length > 1 ? rows[1].offsetTop - rows[0].offsetTop : 40,
      lo,
      hi,
      mids: rows.map(mid),
      vh,
      unit: (card?.offsetWidth ?? BASE_WIDTH) / BASE_WIDTH,
    };
    const p = clampPos(pos.get());
    if (p !== pos.get()) pos.set(p);
    else apply(p);
  };
  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (viewport.current) ro.observe(viewport.current);
    if (content.current) ro.observe(content.current);
    return () => ro.disconnect();
  }, [l.height, l.gap, l.fade, count]);

  const settling = useRef<ReturnType<typeof animate> | null>(null);
  const settleTo = (p: number) => {
    settling.current?.stop();
    settling.current = animate(pos, clampPos(Math.round(p)), l.move as Transition);
  };

  // Wheel / trackpad: the list moves as far as you scroll, then snaps to the nearest card;
  // at the first or last card a fresh scroll moves the page instead
  useEffect(() => {
    const vp = viewport.current;
    if (!vp) return;
    let timer = 0;
    let lastAt = 0;
    let owned = false;
    const onWheel = (e: WheelEvent) => {
      const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      if (Math.abs(e.deltaX) > Math.abs(d) || d === 0) return;
      const now = performance.now();
      if (now - lastAt > 200) owned = false; // a new scroll
      lastAt = now;
      const p = pos.get();
      const atEnd = d > 0 ? p >= stops.current.hi - 0.001 : p <= stops.current.lo + 0.001;
      if (atEnd && !owned) return;
      e.preventDefault();
      owned = true;
      settling.current?.stop();
      pos.set(clampPos(p + (d * l.scrollSpeed) / stops.current.pitch));
      clearTimeout(timer);
      timer = window.setTimeout(() => settleTo(pos.get()), l.settleMs);
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      vp.removeEventListener("wheel", onWheel);
      clearTimeout(timer);
    };
  }, [count, l.scrollSpeed, l.settleMs, l.move]);

  // A finger: the list follows it, then settles on the nearest card (a flick goes one further)
  const drag = useRef<{ id: number; y0: number; p0: number; t0: number } | null>(null);
  const moved = useRef(false);
  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse") return;
    settling.current?.stop();
    drag.current = { id: e.pointerId, y0: e.clientY, p0: pos.get(), t0: performance.now() };
    moved.current = false;
  };
  const onPointerMove = (e: PointerEvent) => {
    const g = drag.current;
    if (!g || g.id !== e.pointerId) return;
    const dy = e.clientY - g.y0;
    if (!moved.current && Math.abs(dy) < 6) return;
    if (!moved.current) (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    moved.current = true;
    pos.set(clampPos(g.p0 - dy / stops.current.pitch));
  };
  const onPointerUp = (e: PointerEvent) => {
    const g = drag.current;
    drag.current = null;
    if (!g || g.id !== e.pointerId || !moved.current) return;
    const dy = e.clientY - g.y0;
    const fast = Math.abs(dy) / Math.max(1, performance.now() - g.t0) > 0.4;
    settleTo(pos.get() + (fast ? (dy < 0 ? 0.5 : -0.5) : 0));
  };

  // the tag's width (it follows its text), in design units: the current card clears it
  const shrink = u(l.currentIndent);
  const bleed = v.Card.paddingLeft; // how far the list reaches out to the left, past its box

  // the rail line stops short of the tag: a gap (Rail → halo above and below) that moves with it
  const g = u(r.labelGap);
  const at = "calc(50% + var(--tag-y, 0px))";
  const lineGap = `linear-gradient(to bottom, #000 calc(${at} - ${g}), transparent calc(${at} - ${g}), transparent calc(${at} + ${g}), #000 calc(${at} + ${g}))`;
  // the rail is a line from each card's marker to the next one's, stopping short of both
  // (Rail → halo), so the markers sit in gaps in the line rather than on top of it
  const [mids, setMids] = useState<number[]>([]);
  useLayoutEffect(() => {
    const el = content.current;
    if (!el) return;
    const m = () => {
      const rows = el.querySelectorAll<HTMLElement>("[data-task]");
      if (!rows.length) return;
      const mid = (row: HTMLElement) => row.offsetTop + row.offsetHeight / 2;
      setMids(Array.from(rows, mid));
    };
    m();
    const ro = new ResizeObserver(m);
    ro.observe(el);
    return () => ro.disconnect();
  }, [count]);

  const fade = u(l.fade);
  const top = `min(${fade}, var(--fade-top, 0px))`;
  const bottom = `min(${fade}, var(--fade-bottom, 0px))`;
  const mask = `linear-gradient(to bottom, transparent, #000 ${top}, #000 calc(100% - ${bottom}), transparent)`;
  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div
        ref={viewport}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: "relative",
          height: u(l.height),
          // the list clips at the top and bottom only: it reaches out to the card's left edge
          // (margin out, padding back in), so the rail's markers aren't cut off on the left
          marginLeft: u(-bleed),
          paddingLeft: u(bleed),
          overflow: "hidden",
          touchAction: "pan-x",
          maskImage: mask,
          WebkitMaskImage: mask,
        }}
      >
        <div
          ref={lineLayer}
          aria-hidden
          style={{ position: "absolute", top: 0, bottom: 0, left: u(bleed), right: 0, pointerEvents: "none", maskImage: lineGap, WebkitMaskImage: lineGap }}
        >
          <motion.div style={{ y, position: "absolute", inset: 0 }}>
            {mids.slice(1).map((next, i) => {
              const gap = r.markerSize / 2 + r.halo; // from a marker's middle to where the line starts
              // on load each piece draws down once the card below it has come in
              const order = Math.max(0, i + 1 - Math.max(0, start - 1));
              return (
                <motion.span
                  key={i}
                  initial={v.Motion.intro ? { scaleY: 0 } : false}
                  animate={{ scaleY: 1 }}
                  transition={{ ...(v.Motion.progress as Transition), delay: v.Motion.intro ? 0.25 + order * v.Motion.stagger : 0 }}
                  style={{
                    position: "absolute",
                    left: `calc(${u(railLeft)} - ${u(r.lineWidth / 2)})`,
                    top: `calc(${mids[i]}px + ${u(gap)})`,
                    height: `max(0px, calc(${next - mids[i]}px - ${u(gap * 2)}))`,
                    width: u(r.lineWidth),
                    background: r.lineColor,
                    borderRadius: u(r.lineWidth / 2),
                    originY: 0,
                  }}
                />
              );
            })}
          </motion.div>
        </div>
        {/* padded by the fade, so the first and last cards rest just clear of it */}
        <motion.div
          ref={content}
          style={{ y, position: "relative", display: "flex", flexDirection: "column", gap: u(l.gap), paddingTop: fade, paddingBottom: fade, paddingLeft: u(l.indent) }}
        >
          {items.map((item, i) => (
            <TaskRow
              key={`${item.title}-${i}`}
              v={v}
              item={item}
              index={i - Math.max(0, start - 1)} // the order it comes in: the top row in view first
              railLeft={railLeft}
              current={i === index}
              shrink={shrink}
              onPick={() => !moved.current && settleTo(i)}
            />
          ))}
        </motion.div>
      </div>
      <Label v={v} state={items[index]?.state ?? "now"} y={tagY} left={railLeft} />
    </div>
  );
}

function TaskRow({
  v,
  item,
  index,
  railLeft,
  current,
  shrink,
  onPick,
}: {
  v: Values;
  item: Item;
  index: number;
  railLeft: number;
  current: boolean;
  shrink: string;
  onPick: () => void;
}) {
  const t = v.Task;
  const m = v.Motion;
  const state = item.state;
  const s = state === "done" ? v.Done : state === "now" ? v.Now : v.Upcoming;
  const delay = 0.1 + Math.max(0, index) * m.stagger;
  const [entered, setEntered] = useState(false);
  // the current task's bar fills once the tasks are in (the others are simply full or empty)
  const barDelay = 0.1 + 2 * m.stagger + m.barDelay;
  const markerOffset = railLeft - v.List.indent; // relative to the row box

  const right: ReactNode =
    state === "now" ? (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: u(v.Now.chipGap) }}>
        <Pill v={v} hue={v.Now.badgeHue} icon="clock">
          {`${v.Now.minutesLeft} min`}
        </Pill>
        <Pill v={v} hue={hueOf(v, item)} lightness={item.tag === "Work" ? v.Pill.workLightness : undefined} icon={iconOf(item.tag)}>
          {item.tag}
        </Pill>
      </div>
    ) : (
      <div style={{ opacity: state === "done" ? v.Done.pillOpacity : 1 }}>
        <Pill v={v} hue={hueOf(v, item)} lightness={item.tag === "Work" ? v.Pill.workLightness : undefined} icon={iconOf(item.tag)}>
          {item.tag}
        </Pill>
      </div>
    );

  return (
    <div data-task={state} onClick={onPick} style={{ position: "relative", width: "100%", cursor: current ? "default" : "pointer" }}>
      {/* the label stands in for the marker beside it: TaskList fades this as the list moves */}
      <div data-marker>
        <Marker v={v} state={state} left={markerOffset} delay={delay} barDelay={barDelay} />
      </div>
      <motion.div
        initial={m.intro ? { opacity: 0, y: `${m.enterY}%` } : false}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: `${-(m.hoverLift / t.height) * 100}%` }}
        // the coming-in waits its turn; once in, the hover lift doesn't wait
        onAnimationComplete={() => setEntered(true)}
        transition={{ ...(m.enter as Transition), delay: m.intro && !entered ? delay : 0 }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: u(t.gap),
          boxSizing: "border-box",
          height: u(t.height),
          padding: `${u(t.paddingY)} ${u(t.paddingX)}`,
          // the card beside the tag shrinks from the left to clear it
          marginLeft: current ? shrink : "0px",
          transition: `margin-left ${v.List.shrinkMs}ms cubic-bezier(0.32, 0.72, 0, 1)`,
          background: s.background,
          borderRadius: u(t.radius),
        }}
      >
        <Progress v={v} state={state} delay={barDelay} />
        <div style={{ flex: "1 0 0", minWidth: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: u(t.gap) }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: u(t.rowGap), minWidth: 0 }}>
            <p
              style={{
                fontSize: u(t.titleSize),
                fontWeight: s.titleWeight,
                lineHeight: t.titleLineHeight,
                letterSpacing: u(t.titleTracking),
                color: s.titleColor,
                whiteSpace: "nowrap",
              }}
            >
              {item.title}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: u(t.timeGap) }}>
              <Time v={v} color={s.timeColor}>
                {item.start}
              </Time>
              <Time v={v} color={s.timeColor}>
                -
              </Time>
              <Time v={v} color={s.timeColor}>
                {item.end}
              </Time>
            </div>
          </div>
          {right}
        </div>
      </motion.div>
    </div>
  );
}

/** The word on the rail, halfway down the list, centred on the line: Done / Now / Soon. */
function Label({ v, state, y, left }: { v: Values; state: State; y: MotionValue<number>; left: number }) {
  const r = v.Rail;
  const text = state === "done" ? r.doneTagText : state === "now" ? r.tagText : r.upcomingTagText;
  const color = state === "done" ? r.doneTagTextColor : state === "now" ? r.tagTextColor : r.upcomingTagTextColor;
  return (
    <motion.div
      aria-hidden
      style={{
        y, // beside its card: halfway down, or up / down at the list's first and last cards
        position: "absolute",
        left: u(left),
        top: "50%",
        width: 0,
        height: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2,
      }}
    >
      {/* trimmed to its capitals, so the word's middle is the line's middle */}
      <span
        style={{
          ...textBoxTrim,
          fontSize: u(r.tagTextSize),
          fontWeight: r.tagTextWeight,
          lineHeight: 1,
          letterSpacing: u(-0.15),
          color,
          whiteSpace: "nowrap",
          transition: `color ${r.tagColorMs}ms ease`,
        }}
      >
        {text}
      </span>
    </motion.div>
  );
}

function Time({ v, color, children }: { v: Values; color: string; children: ReactNode }) {
  const t = v.Task;
  return (
    <span
      style={{
        ...textBoxTrim,
        fontSize: u(t.timeSize),
        fontWeight: t.timeWeight,
        lineHeight: 1,
        letterSpacing: u(t.timeTracking),
        color,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

/** A tag's hue (the chips' colours, set in the panel under Pill). */
function hueOf(v: Values, item: Item) {
  if (item.hue !== undefined) return item.hue; // one of the three tasks: its own setting
  return item.tag === "Health" ? v.Pill.healthHue : v.Pill.workHue;
}

/** The chips' symbols, drawn in the chip's colour: the clock from Figma (node 101:349), the
 * tags' from work.svg, friend.svg and health.svg. w / h: each file's own box. */
const ICONS = {
  clock: { w: 5.96582, h: 5.96582, d: "M2.9834 0C4.6308 0.000153967 5.96582 1.33597 5.96582 2.9834C5.96564 4.63068 4.63068 5.96567 2.9834 5.96582C1.33603 5.96577 0.000180132 4.63074 0 2.9834C0 1.3359 1.33591 5.24535e-05 2.9834 0ZM2.9834 0.5C1.61206 0.500052 0.5 1.61204 0.5 2.9834C0.50018 4.3546 1.61217 5.46577 2.9834 5.46582C4.35454 5.46567 5.46564 4.35454 5.46582 2.9834C5.46582 1.61211 4.35465 0.500154 2.9834 0.5ZM2.9834 1.63965C3.12139 1.63965 3.23328 1.75168 3.2334 1.88965V2.87891L3.70703 3.35254C3.80453 3.45006 3.80431 3.6084 3.70703 3.70605C3.60941 3.80368 3.45115 3.80367 3.35352 3.70605L2.80664 3.16016C2.75983 3.11328 2.7334 3.04867 2.7334 2.98242V1.88965C2.73352 1.75168 2.8454 1.63965 2.9834 1.63965Z", stroke: false },
  work: { w: 8, h: 7, d: "M3.75 0C4.07243 -4.61936e-07 4.33982 1.98483e-05 4.55078 0.0283203C4.76895 0.0576532 4.96445 0.121875 5.12109 0.27832C5.27775 0.434972 5.3427 0.630379 5.37207 0.848633C5.39285 1.00329 5.39627 1.18849 5.39746 1.40332C5.61647 1.40684 5.80784 1.41458 5.97559 1.43164C6.28511 1.46316 6.54221 1.52878 6.7666 1.67871C6.94664 1.79907 7.10133 1.95372 7.22168 2.13379C7.37155 2.35819 7.43725 2.61527 7.46875 2.9248C7.4998 3.23026 7.5 3.6144 7.5 4.10059C7.5 4.58648 7.49978 4.97006 7.46875 5.27539C7.43724 5.58492 7.37161 5.84299 7.22168 6.06738C7.10134 6.24725 6.94652 6.4022 6.7666 6.52246C6.54227 6.67225 6.28499 6.73803 5.97559 6.76953C5.67011 6.80059 5.28605 6.7998 4.7998 6.7998H2.7002C2.21392 6.7998 1.82988 6.8006 1.52441 6.76953C1.21494 6.73803 0.957767 6.6723 0.733398 6.52246C0.55344 6.40219 0.398645 6.24728 0.27832 6.06738C0.128379 5.84298 0.0627644 5.58494 0.03125 5.27539C0.000214815 4.97006 -1.49012e-08 4.58649 0 4.10059C0 3.61442 0.000205517 3.23025 0.03125 2.9248C0.0627449 2.61532 0.128489 2.35816 0.27832 2.13379C0.398632 1.95375 0.553378 1.79905 0.733398 1.67871C0.957797 1.52877 1.21488 1.46316 1.52441 1.43164C1.69187 1.41461 1.88303 1.40685 2.10156 1.40332C2.10303 1.18848 2.10713 1.0033 2.12793 0.848633C2.15728 0.630405 2.22136 0.434973 2.37793 0.27832C2.53453 0.12172 2.73008 0.057701 2.94824 0.0283203C3.15929 -5.43147e-05 3.4273 -5.96046e-08 3.75 0ZM2.7002 1.90039C2.20357 1.90039 1.84948 1.90082 1.5752 1.92871C1.30516 1.9562 1.13934 2.00782 1.01074 2.09375C0.885304 2.17762 0.777197 2.28567 0.693359 2.41113C0.607529 2.53972 0.555781 2.70564 0.52832 2.97559C0.500454 3.24985 0.5 3.60408 0.5 4.10059C0.5 4.59702 0.500425 4.95137 0.52832 5.22559C0.555802 5.49509 0.607606 5.6606 0.693359 5.78906C0.777193 5.91447 0.885318 6.02257 1.01074 6.10645L1.11523 6.16504C1.22863 6.21727 1.3726 6.25184 1.5752 6.27246C1.84947 6.30035 2.2036 6.2998 2.7002 6.2998H4.7998C5.29644 6.2998 5.6505 6.30035 5.9248 6.27246C6.19452 6.24502 6.35975 6.19216 6.48828 6.10645L6.5791 6.03906C6.66628 5.96751 6.74272 5.88314 6.80566 5.78906C6.89153 5.66056 6.94418 5.49528 6.97168 5.22559C6.99957 4.95137 7 4.59702 7 4.10059C7 3.60408 6.99955 3.24986 6.97168 2.97559C6.94421 2.70554 6.89155 2.53974 6.80566 2.41113C6.72178 2.28574 6.61368 2.17756 6.48828 2.09375C6.35975 2.00802 6.19452 1.95616 5.9248 1.92871C5.6505 1.90082 5.29648 1.90039 4.7998 1.90039H2.7002ZM1.72461 2.81055L1.95215 2.88184C2.5279 3.06025 3.13883 3.14938 3.75 3.14941C4.36117 3.14939 4.97212 3.06025 5.54785 2.88184L5.77637 2.81055C5.90796 2.77009 6.0479 2.84413 6.08887 2.97559C6.12969 3.10737 6.05552 3.24807 5.92383 3.28906L5.69629 3.35938C5.14971 3.52878 4.57597 3.6232 4 3.64453V4.09961C4 4.23759 3.88795 4.34946 3.75 4.34961C3.61208 4.34943 3.5 4.23757 3.5 4.09961V3.64453C2.92426 3.62317 2.35108 3.52868 1.80469 3.35938L1.57617 3.28906C1.44434 3.24817 1.37028 3.10744 1.41113 2.97559C1.45215 2.84394 1.59285 2.76972 1.72461 2.81055ZM3.75 0.5C3.41321 0.500001 3.18466 0.50058 3.01465 0.523438C2.85217 0.545351 2.7797 0.583578 2.73145 0.631836C2.68322 0.680126 2.64493 0.752493 2.62305 0.915039C2.60635 1.03921 2.60294 1.19453 2.60156 1.40039H4.89746C4.89608 1.19453 4.89267 1.03921 4.87598 0.915039C4.85407 0.752421 4.81586 0.680114 4.76758 0.631836C4.71927 0.58369 4.64682 0.545286 4.48438 0.523438C4.31441 0.500641 4.0865 0.5 3.75 0.5Z", stroke: false },
  friends: { w: 7, h: 7, d: "M3.37402 0C5.23724 0.000197853 6.74863 1.51086 6.74902 3.37402C6.74902 5.23753 5.23748 6.74883 3.37402 6.74902C1.51057 6.74882 0 5.23753 0 3.37402C0.000398103 1.51086 1.51081 0.000200192 3.37402 0ZM3.37402 0.5C1.78696 0.5002 0.500398 1.787 0.5 3.37402C0.5 4.96138 1.78671 6.24882 3.37402 6.24902C4.96134 6.24883 6.24902 4.96139 6.24902 3.37402C6.24863 1.787 4.96109 0.500198 3.37402 0.5ZM4.42383 4.16211C4.50672 4.05203 4.66314 4.02971 4.77344 4.1123C4.88382 4.19523 4.90616 4.3525 4.82324 4.46289C4.4931 4.90203 3.96665 5.18742 3.37402 5.1875C2.78119 5.18741 2.25394 4.90231 1.92383 4.46289C1.84101 4.35263 1.86359 4.19531 1.97363 4.1123C2.08403 4.02939 2.2413 4.05172 2.32422 4.16211C2.56397 4.48124 2.94511 4.68741 3.37402 4.6875C3.80283 4.68742 4.18406 4.48108 4.42383 4.16211ZM2.30371 1.88086C2.4416 1.90804 2.51761 2.02159 2.54785 2.08203C2.58973 2.16591 2.6084 2.26436 2.6084 2.35938C2.60839 2.4544 2.58975 2.55284 2.54785 2.63672C2.51331 2.70574 2.41915 2.84374 2.24121 2.84375C2.06334 2.8436 1.96904 2.70566 1.93457 2.63672C1.8927 2.55286 1.87403 2.45436 1.87402 2.35938C1.87402 2.2644 1.89272 2.16589 1.93457 2.08203C1.96904 2.01309 2.06334 1.87515 2.24121 1.875L2.30371 1.88086ZM4.56934 1.88086C4.70695 1.90819 4.78229 2.02165 4.8125 2.08203C4.85446 2.16596 4.87402 2.26428 4.87402 2.35938C4.87402 2.45446 4.85446 2.5528 4.8125 2.63672C4.77797 2.70569 4.68446 2.84351 4.50684 2.84375C4.32898 2.8436 4.23467 2.70567 4.2002 2.63672C4.15828 2.55282 4.13966 2.45442 4.13965 2.35938C4.13965 2.26433 4.15829 2.16593 4.2002 2.08203C4.23467 2.01309 4.32896 1.87515 4.50684 1.875L4.56934 1.88086Z", stroke: false },
  // an outline: drawn with a 0.5 stroke, as in the file
  health: { w: 8, h: 7, d: "M6.31212 0.595247C5.38115 0.024204 4.56863 0.254327 4.08053 0.620888C3.88036 0.771189 3.78031 0.846338 3.72144 0.846338C3.66256 0.846338 3.56251 0.771189 3.36234 0.620888C2.87424 0.254327 2.06171 0.024204 1.13076 0.595247C-0.0910049 1.34468 -0.367463 3.81709 2.45068 5.90297C2.98745 6.30029 3.25583 6.49894 3.72144 6.49894C4.18704 6.49894 4.45543 6.30029 4.9922 5.90297C7.81034 3.81709 7.53386 1.34468 6.31212 0.595247Z", stroke: true },
};
type IconName = keyof typeof ICONS;

function iconOf(tag: string): IconName | undefined {
  return tag === "Work" ? "work" : tag === "Friends" ? "friends" : tag === "Health" ? "health" : undefined;
}

function Pill({ v, children, hue, lightness, icon }: { v: Values; children: ReactNode; hue: number; lightness?: number; icon?: IconName }) {
  const p = v.Pill;
  const L = lightness ?? p.lightness;
  const color = `oklch(${L} ${p.chroma} ${hue})`;
  const sym = p.icons && icon ? ICONS[icon] : undefined;
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: u(p.iconGap),
        padding: `${u(sym ? p.iconPaddingY : p.padding)} ${u(p.paddingRight)} ${u(sym ? p.iconPaddingY : p.padding)} ${u(p.paddingLeft)}`,
        background: `oklch(${L} ${p.chroma} ${hue} / ${p.fillAlpha})`,
        borderRadius: u(p.radius),
        overflow: "clip",
      }}
    >
      {sym && (
        <svg
          viewBox={`0 0 ${sym.w} ${sym.h}`}
          style={{ height: u(p.iconSize), width: u((p.iconSize * sym.w) / sym.h), display: "block", flex: "none", overflow: "visible" }}
          aria-hidden
        >
          {sym.stroke ? (
            <path d={sym.d} fill="none" stroke={color} strokeWidth={0.5} strokeLinecap="round" />
          ) : (
            <path d={sym.d} fill={color} />
          )}
        </svg>
      )}
      <span
        style={{
          ...textBoxTrim,
          fontSize: u(p.size),
          fontWeight: p.weight,
          lineHeight: 1,
          letterSpacing: u(p.tracking),
          color,
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
    </span>
  );
}

/** How far through the current task is (0–1): its length from start / end, less the minutes left. */
function nowProgress(v: Values) {
  const mins = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const length = mins(v.Now.end) - mins(v.Now.start);
  if (!(length > 0)) return 0;
  return Math.max(0, Math.min(1, 1 - v.Now.minutesLeft / length));
}

/** The bar down the left of a card: full for a finished task, part-filled from the top for the current one. */
function Progress({ v, state, delay }: { v: Values; state: State; delay: number }) {
  const t = v.Task;
  const fill = state === "done" ? 1 : state === "now" ? nowProgress(v) : 0;
  return (
    <div
      aria-hidden
      style={{
        flex: "none",
        alignSelf: "stretch",
        width: u(t.barWidth),
        background: t.trackColor,
        borderRadius: u(t.barRadius),
        overflow: "clip",
      }}
    >
      <motion.div
        initial={v.Motion.intro && state === "now" ? { height: "0%" } : false}
        animate={{ height: `${fill * 100}%` }}
        transition={{ ...(v.Motion.progress as Transition), delay: v.Motion.intro ? delay : 0 }}
        style={{ width: "100%", background: t.barColor, borderRadius: u(t.barRadius) }}
      />
    </div>
  );
}

function Marker({ v, state, left, delay, barDelay }: { v: Values; state: State; left: number; delay: number; barDelay: number }) {
  const r = v.Rail;
  const pop: Transition = { type: "spring", visualDuration: 0.4, bounce: 0.45, delay: delay + 0.1 };
  const size = r.markerSize;
  const box = size + r.halo * 2;
  return (
    <motion.div
      aria-hidden
      initial={v.Motion.intro ? { scale: 0, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={pop}
      style={{
        position: "absolute",
        left: u(left - box / 2),
        top: "50%",
        marginTop: u(-box / 2),
        width: u(box),
        height: u(box),
        zIndex: 1,
      }}
    >
      <svg viewBox={`0 0 ${box} ${box}`} style={{ width: "100%", height: "100%", display: "block" }}>
        <g transform={`translate(${r.halo} ${r.halo}) scale(${size / 10})`}>
          {state === "done" ? (
            <>
              <circle cx={5} cy={5} r={5} fill={r.doneColor} />
              {/* Figma's check (Group 20) */}
              <path
                d="M6.9414 3.11022C7.04819 2.98361 7.23759 2.96733 7.36425 3.07409C7.49069 3.18086 7.50695 3.37033 7.40038 3.49694L4.66113 6.74597L4.45117 6.99597L2.61718 5.16198C2.50002 5.04482 2.50002 4.85433 2.61718 4.73718C2.73427 4.62045 2.92394 4.62041 3.04101 4.73718L4.41308 6.10925L6.9414 3.11022Z"
                fill={r.checkColor}
              />
            </>
          ) : state === "now" ? (
            <>
              {/* the faint track, then the green part: by default the time gone, from 12 o'clock */}
              <circle cx={5} cy={5} r={5 - r.nowStroke / 2} fill="none" stroke={r.doneColor} strokeOpacity={r.nowTrackOpacity} strokeWidth={r.nowStroke} />
              <motion.circle
                cx={5}
                cy={5}
                r={5 - r.nowStroke / 2}
                fill="none"
                stroke={r.doneColor}
                strokeWidth={r.nowStroke}
                strokeLinecap={r.nowRoundCaps ? "round" : "butt"}
                transform={`rotate(${-90 + (r.nowRingShows === "time gone" ? 0 : nowProgress(v) * 360)} 5 5)`}
                initial={v.Motion.intro ? { pathLength: 0 } : false}
                animate={{ pathLength: r.nowRingShows === "time gone" ? nowProgress(v) : 1 - nowProgress(v) }}
                transition={{ ...(v.Motion.progress as Transition), delay: v.Motion.intro ? barDelay : 0 }}
              />
            </>
          ) : (
            // the pending circle from Figma (pending.svg)
            <path
              d="M4.12105 9.41378C4.17446 9.14322 4.43737 8.97042 4.71246 8.98987C4.80735 8.99658 4.90324 9 5 9L5 10C4.8373 10 4.67648 9.99187 4.51783 9.97632C4.24353 9.94942 4.06767 9.68418 4.12105 9.41378ZM5.8789 9.41406C5.93179 9.68443 5.75582 9.94934 5.48165 9.97628C5.32317 9.99185 5.16253 10 5 10L5 9C5.09666 9 5.19247 8.99659 5.28727 8.98989C5.5625 8.97045 5.82552 9.14336 5.8789 9.41406ZM1.25754 7.49937C1.48695 7.34598 1.7951 7.40997 1.97587 7.6185C2.10115 7.76302 2.23664 7.89852 2.38114 8.02382C2.58976 8.20472 2.65359 8.51315 2.4998 8.74248C2.34617 8.97158 2.03407 9.03469 1.82123 8.85923C1.57302 8.65462 1.34488 8.42656 1.14023 8.1784C0.964521 7.96533 1.02796 7.65287 1.25754 7.49937ZM8.74218 7.49951C8.9714 7.65295 9.03466 7.96505 8.8592 8.17789C8.65447 8.42625 8.42625 8.65447 8.17789 8.8592C7.96504 9.03466 7.65295 8.9714 7.4995 8.74218C7.34606 8.51296 7.40994 8.20491 7.61837 8.02424C7.7631 7.89878 7.89878 7.7631 8.02424 7.61837C8.20491 7.40995 8.51296 7.34607 8.74218 7.49951ZM-8.74228e-07 5C-8.4583e-07 4.83759 0.00787443 4.67701 0.023148 4.51858C0.0496356 4.24385 0.315142 4.06769 0.585937 4.12109C0.856639 4.17448 1.02955 4.4375 1.01011 4.71273C1.00341 4.80753 0.999999 4.90333 0.999999 5C0.999999 5.0964 1.00339 5.19195 1.01005 5.2865C1.02946 5.56197 0.856019 5.82512 0.58496 5.87793C0.31475 5.93132 0.0497482 5.75555 0.023237 5.48139C0.00791845 5.32298 -9.02625e-07 5.16241 -8.74228e-07 5ZM10 5C10 5.16253 9.99185 5.32317 9.97628 5.48165C9.94934 5.75582 9.68443 5.93179 9.41406 5.87891C9.14336 5.82552 8.97045 5.5625 8.98989 5.28727C8.99659 5.19247 9 5.09667 9 5C9 4.90324 8.99658 4.80735 8.98987 4.71246C8.97042 4.43737 9.14322 4.17447 9.41378 4.12106C9.68418 4.06768 9.94942 4.24353 9.97632 4.51783C9.99187 4.67648 10 4.8373 10 5ZM2.49994 1.25723C2.65364 1.4867 2.58978 1.79526 2.38112 1.9762C2.23675 2.10139 2.10139 2.23675 1.9762 2.38112C1.79526 2.58978 1.4867 2.65364 1.25723 2.49994C1.02784 2.34629 0.964467 2.03384 1.14012 1.82082C1.3447 1.57274 1.57274 1.3447 1.82082 1.14012C2.03384 0.964468 2.34629 1.02784 2.49994 1.25723ZM7.49937 1.25754C7.65287 1.02796 7.96533 0.964524 8.1784 1.14023C8.42656 1.34488 8.65462 1.57302 8.85923 1.82123C9.03469 2.03408 8.97158 2.34617 8.74248 2.4998C8.51315 2.65359 8.20472 2.58976 8.02382 2.38115C7.89852 2.23664 7.76302 2.10116 7.61849 1.97587C7.40997 1.7951 7.34598 1.48695 7.49937 1.25754ZM5 8.74228e-07C5.16319 9.02761e-07 5.32452 0.00799652 5.48367 0.02346C5.7568 0.0499981 5.93225 0.313634 5.87988 0.583009C5.82625 0.853856 5.56246 1.02953 5.28704 1.01009C5.19231 1.00341 5.09659 1 5 1C4.90341 1 4.80769 1.00341 4.71296 1.01009C4.43754 1.02953 4.17375 0.853856 4.12012 0.583009C4.06724 0.31377 4.24244 0.0499424 4.51554 0.0234445C4.67495 0.00797743 4.83654 8.45648e-07 5 8.74228e-07Z"
              fill={r.pendingColor}
            />
          )}
        </g>
      </svg>
    </motion.div>
  );
}

export default TasksToday;

/* ---------- "Copy values" helpers ---------- */

/**
 * Turns a DialKit config + live values back into a config snippet with the same shape,
 * so tuned numbers can be pasted straight over the defaults.
 */
type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

function isTuple(v: unknown): v is number[] {
  return Array.isArray(v) && v.length >= 3 && v.every((n) => typeof n === "number");
}

function merge(config: unknown, value: unknown): Json {
  if (isTuple(config)) {
    const [, ...rest] = config;
    return [typeof value === "number" ? round(value) : config[0], ...rest];
  }
  if (config && typeof config === "object" && !Array.isArray(config)) {
    const c = config as Record<string, unknown>;
    if (c.type === "action") return c as Json;
    if (c.type === "spring" || c.type === "easing") {
      const v = (value ?? {}) as Record<string, unknown>;
      const out: Record<string, Json> = {};
      for (const k of Object.keys(c)) out[k] = (k in v ? v[k] : c[k]) as Json;
      return out;
    }
    if (c.type === "select") return { ...(c as Record<string, Json>), default: (value ?? c.default) as Json };
    const out: Record<string, Json> = {};
    const v = (value ?? {}) as Record<string, unknown>;
    for (const k of Object.keys(c)) {
      if (k.startsWith("_")) {
        out[k] = c[k] as Json;
        continue;
      }
      out[k] = merge(c[k], v[k]);
    }
    return out;
  }
  return (value ?? config) as Json;
}

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}

function buildDefaultsSnippet(name: string, config: unknown, values: unknown) {
  const body = JSON.stringify(merge(config, values), null, 2).replace(/"([A-Za-z_$][\w$]*)":/g, "$1:");
  return `// ${name} — tuned values\nexport const ${name}Config = ${body};\n`;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}
