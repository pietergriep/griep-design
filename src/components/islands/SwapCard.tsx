import {
    useEffect,
    useId,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react"
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

/**
 * SwapCard — the ETH/USDC swap card.
 *
 * Framer build of the component: one file, no imports beyond React and Framer.
 * The stylesheet ships as a string and is rendered as a <style> tag inside the
 * component, so it is present in the server-rendered HTML — no flash, and no
 * .css import, which Framer code components cannot do.
 *
 * Three things drive the card:
 *   - a phase machine (static → staggering → rolled → spinning → settling →
 *     success → done) that owns the dot animation and the button label,
 *   - rolling digits on every number, with a vertical-only motion blur,
 *   - a live ETH/USDC quote, with the set price as a fallback.
 *
 * Note: Framer's canvas does not run CSS animations, and the live price is
 * skipped there so the design stays stable while you work. Both run in Preview
 * and on the published site.
 *
 * @framerSupportedLayoutWidth auto
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 362
 * @framerIntrinsicHeight 282
 */

/* Layout effects warn during Framer's server render; fall back there. */
const useIsoLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect

/* ==========================================================================
   Stylesheet
   ========================================================================== */
const CSS = `
.swap-card {
  --sc-font: "SF Pro Display", "SF Pro Text", -apple-system, BlinkMacSystemFont,
    "Segoe UI", Roboto, sans-serif;

  /* Rolling digits */
  --rn-duration: 500ms;
  --rn-ease: cubic-bezier(0.32, 0.72, 0, 1);
  --rn-blur: 1;              /* motion blur scale; 0 turns it off */
  /* Tightens the digit columns only. Tabular figures pad every digit out to
     the width of a 0, which in SF Pro costs nothing for most of them but a lot
     for the 1 — so a number like 0,125 renders ~10px wider than it would as
     ordinary text, and reads as loosely spaced. Tabular is what keeps a column
     from jittering mid-roll, so this trims the columns back instead of
     abandoning it. Applies to digits alone; separators and ~$ are untouched.
     It is ADDED to whatever letter-spacing the text already has, via
     --rn-tracking-base, so it tightens rather than replacing the design. */
  --rn-tracking: -0.02em;

  /* Every dimension below is the design value multiplied by --sc-scale, so the
     whole card grows as one piece: type, padding, radii and hairlines keep
     their ratios instead of the text staying put while the box stretches.
     Set it to 1 for the 362 x 282 design size. */
  --sc-scale: 1;

  width: calc(362px * var(--sc-scale));
  max-width: 100%;
  background: #fff;
  /* The frames are inset shadows, not borders: browsers floor a sub-pixel
     border to a whole device pixel, so a scaled 0.5px hairline would stay one
     device pixel instead of thickening with the card. Painted as a shadow it
     scales smoothly, and it adds no size, so the boxes are unchanged. */
  --sc-hairline: calc(0.5px * var(--sc-scale));
  box-shadow: inset 0 0 0 var(--sc-hairline) #f3f3f3;
  border-radius: calc(18px * var(--sc-scale));
  /* 5 + the 0.5 the hairline no longer occupies, so the card stays 362 x 282 */
  padding: calc(5.5px * var(--sc-scale));
  font-family: var(--sc-font);
  -webkit-font-smoothing: antialiased;

  /* The card is a control, not a document: selecting its numbers only ever
     happens by accident, since both panels are tap targets. */
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;   /* no long-press copy menu on iOS */
}

/* Scoped to the component: a page-wide reset would reach the rest of the site. */
.swap-card,
.swap-card *,
.swap-card *::before,
.swap-card *::after {
  box-sizing: border-box;
}

/* Panels ------------------------------------------------------------------- */
.swap-card__panels { display: flex; gap: calc(5px * var(--sc-scale)); }

.swap-card__panel {
  flex: 1;
  position: relative;
  overflow: hidden;
  transform: translateZ(0);
  transition: transform 260ms cubic-bezier(0.34, 1.5, 0.5, 1);
  display: flex;
  flex-direction: column;
  --sc-panel-ring: inset 0 0 0 var(--sc-hairline) #f3f3f3;
  box-shadow: var(--sc-panel-ring);
  border-radius: calc(15px * var(--sc-scale));
  padding: calc(10.5px * var(--sc-scale));   /* 10 + the hairline */
  min-height: calc(116px * var(--sc-scale));
  min-width: 0;
}

.swap-card--static .swap-card__panel { cursor: pointer; }

/* Hovering a panel hints that the two trade places: it slides over its partner
   (on top, with a soft shadow and a little overshoot) while the partner stays put.
   The lifted panel is a class set from script, not :hover, so that moving from one
   panel to the other first lets the lifted one slide home (quick, no bounce) before
   the other rises; its z-index drops only once it is back, so nothing pops over.
   Mouse only (a tap would leave it stuck); suppressed mid-flip, where script owns
   the transform. --sc-hover-* are props. */
@media (hover: hover) and (pointer: fine) {
  .swap-card--static:not(.swap-card--swapping) .swap-card__panel {
    z-index: 0;
    transition: transform var(--sc-return-ms) cubic-bezier(0.3, 0, 0.2, 1), box-shadow var(--sc-return-ms) ease, z-index 0s linear var(--sc-return-ms);
  }
  .swap-card--static:not(.swap-card--swapping) .swap-card__panel--lifted {
    z-index: 2;
    transition: transform var(--sc-hover-ms, 420ms) var(--sc-hover-ease), box-shadow 300ms ease, z-index 0s;
    box-shadow: var(--sc-panel-ring), 0 calc(2px * var(--sc-scale)) calc(8px * var(--sc-scale)) rgba(0, 0, 0, var(--sc-hover-shadow));
  }
  .swap-card--static:not(.swap-card--swapping) .swap-card__panel--sell.swap-card__panel--lifted {
    transform: translateX(calc(var(--sc-hover-shift) * var(--sc-scale))) translateZ(0);
  }
  .swap-card--static:not(.swap-card--swapping) .swap-card__panel--receive.swap-card__panel--lifted {
    transform: translateX(calc(var(--sc-hover-shift) * -1 * var(--sc-scale))) translateZ(0);
  }
}

.swap-card__panel--sell { background: #fff; }
.swap-card__panel--receive { background: #f6f6f6; }

.swap-card__panel-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.swap-card__label { font-size: calc(14px * var(--sc-scale)); color: #b6b6b6; font-weight: 500; }

/* Token pill. The colour is positional — the left pill stays grey whichever
   token it happens to be showing — so only the coin inside swaps on a flip. */
.swap-card__pill {
  display: inline-flex;
  align-items: center;
  gap: calc(5px * var(--sc-scale));
  border-radius: calc(9px * var(--sc-scale));
  padding: calc(5px * var(--sc-scale));
  font-size: calc(12px * var(--sc-scale));
  font-weight: 600;
  color: #1a1a1a;
}
.swap-card__pill--filled { background: #f2f2f2; border: calc(0.5px * var(--sc-scale)) solid transparent; }
.swap-card__pill--outlined { background: #fff; border: calc(0.5px * var(--sc-scale)) solid #f3f3f3; }
.swap-card__pill svg { display: block; }
.swap-card__tok { display: inline-flex; align-items: center; }

.swap-card__amount-row {
  margin-top: auto;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: calc(6px * var(--sc-scale));
}

.swap-card__amount {
  font-size: calc(35px * var(--sc-scale));
  font-weight: 500;
  color: #1a1a1a;
  letter-spacing: calc(-1px * var(--sc-scale));
  /* the amount's own tracking, so the digit columns add to it, not replace it */
  --rn-tracking-base: calc(-1px * var(--sc-scale));
  line-height: 1;
  transition: opacity 200ms ease;
}

.swap-card__sub { font-size: calc(13px * var(--sc-scale)); font-weight: 500; color: #c6c6c6; }

/* Rolling digits ----------------------------------------------------------
   One column per digit, holding only the digits between the old value and the
   new one, so it rolls through them in the direction the number moved. Each
   column is absolutely positioned over a hidden "0", which keeps the width and
   the baseline of ordinary text: the line around it never shifts.
   --rn-line is the line-height the column rolls at. It is measured from the
   element itself, so the inline-block is never taller than the line box it sits
   in — "normal" resolves differently per font, and a hardcoded ratio would push
   the card open by a pixel under a fallback. */
.sc-rn { font-variant-numeric: tabular-nums; }

/* The columns are decoration: a screen reader gets this instead — the plain
   formatted number, in one piece. */
.sc-rn__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.sc-rn__digit {
  position: relative;
  display: inline-block;
  line-height: var(--rn-line, 1.2);
  /* Narrows the ghost and every cell by the same amount, so the column stays
     self-consistent and nothing shifts while it rolls. */
  letter-spacing: calc(
    var(--rn-tracking-base, 0px) + var(--rn-tracking, -0.02em)
  );
}

.sc-rn__ghost { visibility: hidden; }
.sc-rn__window { position: absolute; inset: 0; overflow: hidden; }

.sc-rn__strip {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  transform: translateY(calc(var(--rn-o, 0) * var(--rn-line, 1.2) * -1em));
  transition: transform var(--rn-duration, 500ms) var(--rn-ease, ease);
  will-change: transform;
}

.sc-rn__cell {
  display: block;
  height: calc(var(--rn-line, 1.2) * 1em);
  line-height: var(--rn-line, 1.2);
}

/* The motion blur is a vertical-only Gaussian, held in this hidden filter and
   driven from script. Blurring along the axis of travel only is what makes a
   reel read as moving; an isotropic CSS blur() just smudges the glyph. */
.sc-rn__blur { position: absolute; width: 0; height: 0; overflow: hidden; }

/* Picker ------------------------------------------------------------------- */
.swap-card__picker { padding: 0 calc(3px * var(--sc-scale)); }

.swap-card__avail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 calc(1px * var(--sc-scale));
  margin-top: calc(20px * var(--sc-scale));
  margin-bottom: calc(8px * var(--sc-scale));
}

.swap-card__avail-label { font-size: calc(13px * var(--sc-scale)); font-weight: 500; color: rgba(37, 37, 37, 0.25); }
.swap-card__avail-val { font-size: calc(13px * var(--sc-scale)); font-weight: 500; color: #252525; }

.swap-card__chips-wrap {
  overflow: hidden;
  height: calc(44px * var(--sc-scale));
  opacity: 1;
  transition: height 300ms ease, opacity 240ms ease;
}

/* Once the swap starts the chips fold away, masked so they dissolve from the
   bottom rather than being sliced off. */
.swap-card:not(.swap-card--static) .swap-card__chips-wrap {
  -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - calc(18px * var(--sc-scale))), transparent);
  mask-image: linear-gradient(to bottom, #000 calc(100% - calc(18px * var(--sc-scale))), transparent);
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.swap-card__chips { display: flex; gap: calc(5px * var(--sc-scale)); }

.swap-card__chip {
  flex: 1;
  height: calc(44px * var(--sc-scale));
  border-radius: calc(14px * var(--sc-scale));
  border: none;
  box-shadow: inset 0 0 0 var(--sc-hairline) #f3f3f3;
  background: #fff;
  color: #1a1a1a;
  font-size: calc(14px * var(--sc-scale));
  font-weight: 500;
  font-family: var(--sc-font);
  cursor: pointer;
  transition: background 160ms ease;
}

.swap-card__chip--active { background: #f2f2f2; box-shadow: none; font-weight: 600; }

/* Hover states, only for a real mouse (a tap would leave them stuck on). */
@media (hover: hover) and (pointer: fine) {
  .swap-card--static .swap-card__chip:not(.swap-card__chip--active):hover { background: #f8f8f8; }
  .swap-card__btn:hover:not(:disabled):not(.swap-card__btn--success):not(.swap-card__btn--loading):not(.swap-card__btn--needamt) {
    background: #3a3a3a;
  }
  .swap-card__txinfo:hover { background: rgba(223, 223, 223, 0.6); color: #6f6f6f; }
}

/* Progress band ------------------------------------------------------------ */
.swap-card__band {
  position: relative;
  height: calc(56px * var(--sc-scale));
  display: flex;
  align-items: center;
  justify-content: center;
  transition: height 340ms ease;
}

.swap-card--static .swap-card__band { height: calc(20px * var(--sc-scale)); }
.swap-card__band--expanded { height: calc(74px * var(--sc-scale)); }
.swap-card__band--collapsed { height: calc(8px * var(--sc-scale)); }

.swap-card__ring { position: relative; width: 0; height: 0; }
.swap-card__dot {
  position: absolute;
  left: 0;
  top: 0;
  border-radius: 50%;
  pointer-events: none;
}

.swap-card__check {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 3;
  pointer-events: none;
  opacity: 0;
  /* Opacity only. A transform here scales the stroke with it, and by scale(0.2)
     a 4px stroke is sub-pixel, which is where WebKit's stroke rendering starts
     to flicker. The disc shrinking alone reads as the badge leaving. */
  transition: opacity 200ms ease;
}

.swap-card__check--show {
  opacity: 1;
  /* Arriving waits for the disc to grow; leaving starts at once (the base rule
     carries no delay). */
  transition: opacity 200ms ease 180ms;
}

.swap-card__check path {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  /* Never paint a stroke that has no length. A zero-length dash with a round
     cap still renders a dot, and WebKit places it at whichever end of the path
     the dash phase rounds to — so during the delay before the draw begins it
     flickers between the start point and the tip. Blink paints nothing there,
     which is why this only shows on iOS. The keyframes switch the stroke on
     once it has real length. */
  stroke-opacity: 0;
}

/* The tick springs in rather than appearing at size: it starts a little small,
   overgrows, and settles back. Tied to --drawn, which is set once on success
   and survives the fade-out, so the pop plays once and its held end frame is
   the resting scale. Overgrowing is safe where shrinking was not — the stroke
   gets thicker, never sub-pixel. */
.swap-card__check--drawn {
  animation: sc-check-pop 520ms 300ms both;
}

@keyframes sc-check-pop {
  0% {
    transform: scale(0.88);
    animation-timing-function: cubic-bezier(0.22, 0.9, 0.35, 1);
  }
  58% {
    transform: scale(1.07);
    animation-timing-function: cubic-bezier(0.4, 0, 0.3, 1);
  }
  100% {
    transform: scale(1);
  }
}

/* The stroke animation is held by a separate class that stays on through the
   fade-out. Hanging it off --show meant removing that class also removed the
   animation, snapping stroke-dashoffset back to 1 in one frame — the tick
   un-drew itself before it had begun to fade. */
.swap-card__check--drawn path {
  /* Fill mode 'both', not 'forwards': backwards fill holds the 0% frame through the
     300ms delay, keeping stroke-opacity at 0 instead of leaving the base
     rule's hidden-but-painted state on screen. */
  animation: sc-draw 360ms cubic-bezier(0.65, 0, 0.35, 1) 300ms both;
}

/* Once the stroke has finished drawing, throw the dash machinery away and leave
   an ordinary solid stroke. A dash pattern whose value is held by an
   animation's fill state gets recomputed whenever WebKit re-rasterises the SVG
   — which is exactly what an ancestor opacity change triggers — so the tick can
   flash to fully drawn or fully erased partway through the fade. Nothing to
   recompute here. */
.swap-card__check--solid path {
  animation: none;
  stroke-dasharray: none;
  stroke-dashoffset: 0;
  stroke-opacity: 1;
}

/* The badge does not simply inflate. It squashes for a moment first, the way
   something with mass gathers before it moves, then springs out past its size
   and settles. A transition cannot express that reversal, so the growth is a
   keyframe animation rather than a transition on scale. */
@keyframes sc-badge-grow {
  0% {
    transform: translate(0px, 0px) scale(var(--sc-dot-rest, 0.125));
    /* Damped: it leaves quickly and eases into the bottom of the squash
       instead of arriving with speed still on it. */
    animation-timing-function: cubic-bezier(0.16, 0.84, 0.28, 1);
  }
  24% {
    transform: translate(0px, 0px) scale(var(--sc-dot-wind, 0.088));
    animation-timing-function: cubic-bezier(0.34, 1.3, 0.4, 1);
  }
  100% {
    transform: translate(0px, 0px) scale(1);
  }
}

/* The exit is an animation too, not a transition. Clearing the grow animation
   and setting a transform in the same frame drops the held end frame, and the
   transform jumps instead of interpolating — the badge vanished in one frame
   and left the white tick alone on a white card. */
@keyframes sc-badge-leave {
  from { transform: translate(0px, 0px) scale(1); }
  to { transform: translate(0px, 0px) scale(0); }
}

@keyframes sc-draw {
  0% { stroke-dashoffset: 1; stroke-opacity: 0; }
  1% { stroke-opacity: 1; }
  100% { stroke-dashoffset: 0; stroke-opacity: 1; }
}

/* Action button ------------------------------------------------------------ */
.swap-card__btn {
  width: 100%;
  height: calc(48px * var(--sc-scale));
  border: none;
  border-radius: calc(15px * var(--sc-scale));
  background: #252525;
  color: #fff;
  font-size: calc(14px * var(--sc-scale));
  font-weight: 500;
  font-family: var(--sc-font);
  cursor: pointer;
  transition: opacity 200ms ease, background 300ms ease, color 300ms ease;
}

.swap-card__btn:disabled { opacity: 0.9; cursor: default; }
.swap-card__btn--loading { pointer-events: none; cursor: default; }
.swap-card__btn--success { background: rgba(34, 197, 94, 0.25); color: #22c55e; }
.swap-card__btn--needamt {
  background: rgba(37, 37, 37, 0.1);
  color: rgba(37, 37, 37, 0.4);
  opacity: 1;
  cursor: default;
}

/* A highlight travels across the label while the swap is in flight. */
.swap-card__btn-label--shimmer {
  display: inline-block;
  background-image: linear-gradient(
    100deg,
    rgba(255, 255, 255, 0.45) 35%,
    #fff 50%,
    rgba(255, 255, 255, 0.45) 65%
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  animation: sc-btnshimmer 2.4s linear infinite;
}

@keyframes sc-btnshimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

.swap-card__txinfo-wrap {
  overflow: hidden;
  height: 0;
  margin-top: 0;
  opacity: 0;
  transition: height 340ms ease, opacity 340ms ease, margin-top 340ms ease;
}

.swap-card__txinfo-wrap--show { height: calc(44px * var(--sc-scale)); margin-top: calc(5px * var(--sc-scale)); opacity: 1; }

.swap-card__txinfo {
  width: 100%;
  height: calc(44px * var(--sc-scale));
  border: none;
  border-radius: calc(15px * var(--sc-scale));
  background: rgba(223, 223, 223, 0.35);
  color: #9a9a9a;
  font-size: calc(14px * var(--sc-scale));
  font-weight: 500;
  font-family: var(--sc-font);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: calc(6px * var(--sc-scale));
  transition: background 160ms ease, color 160ms ease;
}

.swap-card__txinfo svg { display: block; }

/* A sheen crosses the receive panel the moment the funds land. */
.swap-card__shimmer {
  position: absolute;
  inset: 0;
  border-radius: calc(15px * var(--sc-scale));
  pointer-events: none;
  opacity: 0;
  background: linear-gradient(
    105deg,
    transparent 40%,
    rgba(255, 255, 255, 0.35) 50%,
    transparent 60%
  );
  background-size: 220% 100%;
}

.swap-card__panel--shimmering .swap-card__shimmer {
  opacity: 1;
  animation: sc-shimmer 1.4s ease-in-out 240ms 1 both;
}

@keyframes sc-shimmer {
  0% { background-position: 220% 0; }
  100% { background-position: -220% 0; }
}

/* Follow the OS setting: the numbers still change, they just do not travel. */
@media (prefers-reduced-motion: reduce) {
  .swap-card {
    --rn-duration: 0ms !important;
    --rn-blur: 0 !important;
  }
}
`

/* ==========================================================================
   Formatting
   ========================================================================== */

/* European separators: "." for thousands, "," for the decimal, and no
   trailing zeros — 1246.5 -> "1.246,5". */
function fmtNum(x: number, dec: number): string {
    const s = x.toFixed(dec)
    const parts = s.split(".")
    const whole = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    if (dec > 0 && parts[1]) {
        const frac = parts[1].replace(/0+$/, "")
        return frac ? whole + "," + frac : whole
    }
    return whole
}

/* ==========================================================================
   Motion blur
   A vertical-only Gaussian, as an SVG filter. The peak is a fraction of the
   text size, so a 35px amount and a 13px sub-value smear alike, and it follows
   the easing's own speed, so the digits sharpen as the roll settles.
   ========================================================================== */

const RN_BLUR_EM = 0.044 /* peak blur, as a fraction of the text size */
const RN_EASE: [number, number, number, number] = [
    0.32, 0.72, 0, 1,
] /* matches --rn-ease */

/* Speed profile of the easing curve, sampled once and normalised to 1. The
   derivative is analytic: this curve is front-loaded and its speed peaks at
   p = 0, which is precisely where a finite difference is least accurate. */
const RN_SPEED: number[] = (() => {
    const [x1, y1, x2, y2] = RN_EASE
    const bezX = (u: number) => {
        const v = 1 - u
        return 3 * v * v * u * x1 + 3 * v * u * u * x2 + u * u * u
    }
    const dX = (u: number) => {
        const v = 1 - u
        return 3 * v * v * x1 + 6 * v * u * (x2 - x1) + 3 * u * u * (1 - x2)
    }
    const dY = (u: number) => {
        const v = 1 - u
        return 3 * v * v * y1 + 6 * v * u * (y2 - y1) + 3 * u * u * (1 - y2)
    }
    const n = 64
    const table: number[] = []
    for (let i = 0; i <= n; i++) {
        const p = i / n
        let u = p /* solve x(u) = p */
        for (let k = 0; k < 6; k++) {
            const d = dX(u)
            if (Math.abs(d) < 1e-6) break
            u = Math.max(0, Math.min(1, u - (bezX(u) - p) / d))
        }
        const d = dX(u)
        table.push(d > 1e-6 ? Math.abs(dY(u) / d) : 0)
    }
    const peak = Math.max(...table) || 1
    /* ramp in over the first 12%, so it arrives rather than appearing */
    return table.map((v, i) => (v / peak) * Math.min(1, i / n / 0.12))
})()

interface BlurJob {
    strip: HTMLElement
    node: SVGFEGaussianBlurElement
    peak: number
    dur: number
    t0: number
}

/* One driver for every rolling digit on the page, rather than a loop each. */
let blurJobs: BlurJob[] = []
let blurRaf: number | null = null

function blurTick(now: number) {
    blurJobs = blurJobs.filter((job) => {
        /* rAF hands back the frame's START time, which can predate the job if it
       was queued later in that same frame — without the clamp p goes negative
       and the table lookup falls off the front into NaN. */
        const p = Math.max(0, (now - job.t0) / job.dur)
        if (p >= 1) {
            job.strip.style.filter = ""
            job.node.setAttribute("stdDeviation", "0 0")
            return false
        }
        const i = p * (RN_SPEED.length - 1)
        const lo = Math.max(0, Math.floor(i))
        const hi = Math.min(lo + 1, RN_SPEED.length - 1)
        const speed = RN_SPEED[lo] + (RN_SPEED[hi] - RN_SPEED[lo]) * (i - lo)
        job.node.setAttribute(
            "stdDeviation",
            "0 " + (job.peak * speed).toFixed(3)
        )
        return true
    })
    blurRaf = blurJobs.length ? requestAnimationFrame(blurTick) : null
}

function startBlur(
    strip: HTMLElement,
    node: SVGFEGaussianBlurElement,
    filterId: string
) {
    const styles = getComputedStyle(strip)
    const scale = parseFloat(styles.getPropertyValue("--rn-blur"))
    const size = parseFloat(styles.fontSize) || 0
    const dur = parseFloat(styles.getPropertyValue("--rn-duration")) || 0
    const peak = (isNaN(scale) ? 1 : scale) * RN_BLUR_EM * size
    if (!(peak > 0) || !(dur > 0)) return
    strip.style.filter = `url(#${filterId})`
    blurJobs = blurJobs.filter((job) => job.strip !== strip)
    blurJobs.push({ strip, node, peak, dur, t0: performance.now() })
    if (blurRaf === null) blurRaf = requestAnimationFrame(blurTick)
}

/* ==========================================================================
   Rolling digits
   ========================================================================== */

const mod10 = (n: number) => ((n % 10) + 10) % 10

function RollingDigit({
    digit,
    dir,
    blur,
}: {
    digit: number
    dir: number
    blur: boolean
}) {
    const stripRef = useRef<HTMLSpanElement>(null)
    const blurRef = useRef<SVGFEGaussianBlurElement>(null)
    /* Position on an endless 0-9 strip: position 13 and position 3 are both a
     "3", but one is a full turn further on. Keeping a position rather than a
     digit is what lets 9 -> 0 roll forwards instead of spinning back. */
    const posRef = useRef(digit)
    const [range, setRange] = useState({ from: digit, to: digit })

    const rawId = useId()
    const filterId = useMemo(
        () => "sc-rn-" + rawId.replace(/[^a-zA-Z0-9_-]/g, ""),
        [rawId]
    )

    useEffect(() => {
        const from = posRef.current
        if (mod10(from) === digit) return
        const to =
            dir >= 0
                ? from + mod10(digit - mod10(from)) /* rising: roll up */
                : from - mod10(mod10(from) - digit) /* falling: roll down */
        posRef.current = to
        setRange({ from, to })
    }, [digit, dir])

    const lo = Math.min(range.from, range.to)
    const hi = Math.max(range.from, range.to)
    const cells: number[] = []
    for (let p = lo; p <= hi; p++) cells.push(mod10(p))

    /* Place the strip at the old digit without a transition, then let it move to
     the new one — otherwise the browser has nothing to animate from. */
    useIsoLayoutEffect(() => {
        const strip = stripRef.current
        if (!strip) return
        const { from, to } = range
        const low = Math.min(from, to)
        strip.style.transition = "none"
        strip.style.setProperty("--rn-o", String(from - low))
        strip.style.filter = ""
        void strip.offsetHeight /* flush the lines above */
        if (from === to) return
        strip.style.transition = ""
        strip.style.setProperty("--rn-o", String(to - low))
        if (blur && blurRef.current) startBlur(strip, blurRef.current, filterId)
    }, [range, blur, filterId])

    /* Drop any in-flight job if the column is unmounted mid-roll. */
    useEffect(() => {
        return () => {
            const strip = stripRef.current
            if (strip) blurJobs = blurJobs.filter((job) => job.strip !== strip)
        }
    }, [])

    return (
        <span className="sc-rn__digit">
            <span className="sc-rn__ghost" aria-hidden="true">
                0
            </span>
            <span className="sc-rn__window">
                <span ref={stripRef} className="sc-rn__strip">
                    {cells.map((cell, i) => (
                        <span key={i} className="sc-rn__cell">
                            {cell}
                        </span>
                    ))}
                </span>
            </span>
            {blur && (
                <svg
                    className="sc-rn__blur"
                    aria-hidden="true"
                    width="0"
                    height="0"
                >
                    <defs>
                        {/* room for the smear to spill past the strip before the window clips it */}
                        <filter
                            id={filterId}
                            x="-5%"
                            y="-20%"
                            width="110%"
                            height="140%"
                        >
                            <feGaussianBlur ref={blurRef} stdDeviation="0 0" />
                        </filter>
                    </defs>
                </svg>
            )}
        </span>
    )
}

/**
 * Takes the already-formatted string, not a number and an Intl format, so it
 * works with fmtNum's European separators and with the "~$" / " ETH" bits
 * around the digits, which render as plain characters and stay put while the
 * digits move. `value` only decides which way the columns turn.
 *
 * `jump` is a token folded into the column keys: change it and every column
 * remounts, so the new number is simply there rather than rolled to. That is
 * what the pair flip wants — the value is not drifting, it is being replaced,
 * and a reel spinning under a panel that is already sliding is two motions
 * fighting each other.
 */
function RollingNumber({
    text,
    value,
    blur = true,
    jump = 0,
    className,
    style,
}: {
    text: string
    value: number
    blur?: boolean
    jump?: string | number
    className?: string
    style?: CSSProperties
}) {
    const hostRef = useRef<HTMLSpanElement>(null)
    const [line, setLine] = useState<number | null>(null)

    /* Measure the element's real line box once, while it still holds ordinary
     text. That first render is also what the server sends and what Framer's
     canvas shows: readable text, no roll. */
    useIsoLayoutEffect(() => {
        if (line !== null) return
        const el = hostRef.current
        if (!el) return
        const size = parseFloat(getComputedStyle(el).fontSize) || 0
        const box = el.getBoundingClientRect().height
        setLine(size > 0 && box > 0 ? +(box / size).toFixed(4) : 1.2)
    }, [line])

    /* Which way the number moved, so every column rolls the same way. */
    const previous = useRef(value)
    const dir = value >= previous.current ? 1 : -1
    useEffect(() => {
        previous.current = value
    }, [value])

    const vars =
        line !== null
            ? ({ "--rn-line": line, ...style } as CSSProperties)
            : style

    if (line === null) {
        return (
            <span ref={hostRef} className={className} style={vars}>
                {text}
            </span>
        )
    }

    const chars = [...text]
    return (
        <span
            ref={hostRef}
            className={[className, "sc-rn"].filter(Boolean).join(" ")}
            style={vars}
        >
            <span className="sc-rn__sr">{text}</span>
            <span aria-hidden="true">
                {chars.map((char, i) => {
                    /* Keyed from the right, so gaining a digit does not renumber the
             columns that were already there: "339" -> "1.354" keeps the units
             column rolling instead of restarting it. */
                    const key = `${jump}-${chars.length - 1 - i}`
                    return char >= "0" && char <= "9" ? (
                        <RollingDigit
                            key={key}
                            digit={+char}
                            dir={dir}
                            blur={blur}
                        />
                    ) : (
                        <span key={key}>{char}</span>
                    )
                })}
            </span>
        </span>
    )
}

/* ==========================================================================
   Token marks
   ========================================================================== */

const CHEVRON = (
    <svg width="7" height="6" viewBox="0 0 6 5" fill="none">
        <path d="M0.5 1L3 4L5.5 1" stroke="#252525" strokeLinecap="round" />
    </svg>
)

const ETH_MARK = (
    <svg width="14" height="14" viewBox="0 0 784.37 1277.39" fill="none">
        <g fill="#627EEA">
            <polygon
                fillOpacity="0.6"
                points="392.07,0 383.5,29.11 383.5,873.74 392.07,882.29 784.13,650.54"
            />
            <polygon points="392.07,0 0,650.54 392.07,882.29 392.07,472.33" />
            <polygon
                fillOpacity="0.6"
                points="392.07,956.52 387.24,962.41 387.24,1263.28 392.07,1277.38 784.37,724.89"
            />
            <polygon points="392.07,1277.38 392.07,956.52 0,724.89" />
            <polygon
                fillOpacity="0.2"
                points="392.07,882.29 784.13,650.54 392.07,472.33"
            />
            <polygon
                fillOpacity="0.6"
                points="0,650.54 392.07,882.29 392.07,472.33"
            />
        </g>
    </svg>
)

const USDC_MARK = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path
            fill="#3e73c4"
            d="M8 16c4.4183 0 8 -3.5817 8 -8 0 -4.41828 -3.5817 -8 -8 -8C3.58172 0 0 3.58172 0 8c0 4.4183 3.58172 8 8 8Z"
        />
        <path
            fill="#ffffff"
            d="M10.01105 9.062c0 -1.062 -0.64 -1.426 -1.92 -1.578 -0.914 -0.1215 -1.0965 -0.364 -1.0965 -0.789 0 -0.425 0.305 -0.698 0.914 -0.698 0.5485 0 0.8535 0.182 1.0055 0.6375 0.0158 0.04405 0.04475 0.0822 0.08295 0.10925 0.03815 0.0271 0.0837 0.04185 0.13055 0.04225h0.4875c0.02815 0.00075 0.05615 -0.0042 0.08235 -0.0146 0.02615 -0.0104 0.04995 -0.02605 0.0699 -0.0459 0.01995 -0.01985 0.0357 -0.0436 0.0462 -0.0697 0.01055 -0.02615 0.01565 -0.05415 0.01505 -0.0823v-0.03c-0.0596 -0.32955 -0.22635 -0.6302 -0.47435 -0.85525 -0.248 -0.22505 -0.5634 -0.36185 -0.89715 -0.38925V4.571005c0 -0.1215 -0.0915 -0.2125 -0.2435 -0.243h-0.4575c-0.1215 0 -0.213 0.091 -0.2435 0.243V5.269c-0.9145 0.121 -1.493 0.728 -1.493 1.487 0 1.001 0.609 1.3955 1.889 1.5475 0.8535 0.1515 1.1275 0.334 1.1275 0.8195 0 0.485 -0.4265 0.819 -1.0055 0.819 -0.7925 0 -1.0665 -0.3335 -1.158 -0.789 -0.03 -0.121 -0.122 -0.182 -0.2135 -0.182h-0.518c-0.02815 -0.0007 -0.0561 0.00435 -0.0822 0.0148 -0.02615 0.0104 -0.04985 0.02605 -0.0698 0.0459 -0.0199 0.01985 -0.03555 0.04355 -0.04605 0.06965 -0.0105 0.0261 -0.0156 0.05405 -0.01495 0.08215v0.03c0.1215 0.759 0.6095 1.305 1.615 1.457v0.7285c0 0.121 0.0915 0.2125 0.2435 0.2425h0.4575c0.1215 0 0.213 -0.091 0.2435 -0.2425V10.67c0.9145 -0.1515 1.5235 -0.789 1.5235 -1.6085v0.0005Z"
        />
        <path
            fill="#ffffff"
            d="M6.446 12.2485c-2.37698 -0.85 -3.59598 -3.49 -2.71198 -5.8265 0.457 -1.275 1.46248 -2.2455 2.71198 -2.701 0.122 -0.0605 0.1825 -0.1515 0.1825 -0.3035v-0.425c0 -0.121 -0.0605 -0.212 -0.1825 -0.2425 -0.0305 0 -0.0915 0 -0.122 0.03 -0.68575 0.21416 -1.3224 0.561865 -1.87327 1.023085 -0.550855 0.461225 -1.00503 1.026855 -1.336385 1.664315 -0.331355 0.6375 -0.53334 1.3342 -0.59432 2.05005 -0.06098 0.71585 0.020245 1.4367 0.238995 2.12105 0.548 1.7 1.8585 3.005 3.56498 3.551 0.122 0.0605 0.244 0 0.274 -0.1215 0.0305 -0.03 0.0305 -0.061 0.0305 -0.1215v-0.425c0 -0.091 -0.091 -0.212 -0.1825 -0.273Zm3.23 -9.468c-0.122 -0.061 -0.244 0 -0.274 0.121 -0.0305 0.0305 -0.0305 0.061 -0.0305 0.1215v0.425c0 0.1215 0.091 0.2425 0.1825 0.3035 2.377 0.85 3.596 3.49 2.712 5.8265 -0.457 1.275 -1.4625 2.2455 -2.712 2.701 -0.122 0.0605 -0.1825 0.1515 -0.1825 0.3035v0.425c0 0.121 0.0605 0.212 0.1825 0.2425 0.0305 0 0.0915 0 0.122 -0.03 0.6858 -0.21415 1.32245 -0.56185 1.8733 -1.0231 0.55085 -0.4612 1.00505 -1.02685 1.3364 -1.6643 0.33135 -0.6375 0.53335 -1.3342 0.5943 -2.05005 0.061 -0.71585 -0.02025 -1.4367 -0.239 -2.12105 -0.548 -1.73 -1.889 -3.035 -3.565 -3.581Z"
        />
    </svg>
)

function Pill({ token, filled }: { token: "ETH" | "USDC"; filled: boolean }) {
    return (
        <span
            className={
                "swap-card__pill " +
                (filled
                    ? "swap-card__pill--filled"
                    : "swap-card__pill--outlined")
            }
        >
            {token === "ETH" ? ETH_MARK : USDC_MARK}
            <span className="swap-card__tok">{token}</span>
            {CHEVRON}
        </span>
    )
}

/* ==========================================================================
   The component
   ========================================================================== */

/* Dot choreography. SPIN is seconds per revolution; GROW is how far the
   surviving dot has to swell to become the success badge. */
const SPIN = 3
const COUNT = 6
const RADIUS = 22
const GAP = 17
const DOT = 7
const BADGE = 56
/* The dot is laid out at its FINAL (badge) size and scaled down at rest,
   rather than laid out small and scaled up. iOS Safari rasterises an element
   once at its layout size and then transforms that bitmap, so growing a 7px
   circle to 56px enlarges a 7px raster — visibly blocky on the phone, while
   desktop Chrome happens to re-rasterise and looks fine. Scaling down from a
   56px raster is always clean. The rendered size still travels 7 -> 56, so the
   motion is unchanged. */
const SHRINK = DOT / BADGE
/* After the ring settles, the dots run to the middle and stack before the
   badge grows out of them. CONVERGE is the journey, MERGE_HOLD is the beat
   they sit as one dot before it swells — long enough to read as the thing
   gathering itself rather than bouncing straight back out. */
const CONVERGE = 300
/* Just enough to be sure they have landed — two or three frames, not a pause.
   The weight comes from the wind-up below, not from stillness. */
const MERGE_HOLD = 40
/* The badge compresses to this fraction of the dot before it swells. */
const WIND = 0.6
const GROW_MS = 620

type Phase =
    | "static"
    | "staggering"
    | "rolled"
    | "spinning"
    | "settling"
    | "converging"
    | "success"
    | "done"

const rowPos = (i: number, k: number) => ({
    x: (i - (COUNT - 1) / 2) * GAP * k,
    y: 0,
})
const ringPos = (i: number, k: number) => {
    const a = ((-90 + i * (360 / COUNT)) * Math.PI) / 180
    return { x: RADIUS * k * Math.cos(a), y: RADIUS * k * Math.sin(a) }
}

/* `k` is --sc-scale. The dots are positioned in script rather than CSS, so the
   scale has to reach them here; GROW is a ratio and stays as it is. */
function dotStyle(phase: Phase, i: number, k: number): CSSProperties {
    const base: CSSProperties = {
        width: BADGE * k,
        height: BADGE * k,
        marginLeft: (-BADGE * k) / 2,
        marginTop: (-BADGE * k) / 2,
    }
    if (phase === "static") {
        const p = rowPos(i, k)
        return {
            ...base,
            background: "#252525",
            opacity: 0,
            transform: `translate(${p.x}px, ${p.y}px) scale(0)`,
            transition: "transform 200ms ease, opacity 200ms ease",
        }
    }
    if (phase === "staggering") {
        const p = rowPos(i, k)
        return {
            ...base,
            background: "#252525",
            opacity: 1,
            transform: `translate(${p.x}px, ${p.y}px) scale(${SHRINK})`,
            transition: `transform 380ms cubic-bezier(.34,1.5,.5,1) ${i * 120}ms, opacity 260ms ease ${i * 120}ms`,
        }
    }
    if (phase === "converging") {
        /* Every dot runs to the same point and stacks. Six identical dots on
       one spot read as a single dot, which is what lets the next beat look
       like that dot growing rather than a new shape appearing. Accelerating
       inward reads as being drawn together rather than drifting. */
        return {
            ...base,
            background: "#252525",
            zIndex: i === 0 ? 2 : 1,
            opacity: 1,
            transform: `translate(0px, 0px) scale(${SHRINK})`,
            transition: `transform ${CONVERGE}ms cubic-bezier(.55,0,1,.45)`,
        }
    }
    if (phase === "success" || phase === "done") {
        const gone = phase === "done"
        /* The stack in the middle becomes the badge: the front dot turns green
       and swells, the ones beneath it go out where they stand. */
        if (i === 0) {
            if (gone) {
                return {
                    ...base,
                    background: "#22c55e",
                    zIndex: 2,
                    opacity: 0,
                    animation: "sc-badge-leave 420ms cubic-bezier(.4,0,.2,1) both",
                    transition: "opacity 320ms ease",
                }
            }
            return {
                ...base,
                background: "#22c55e",
                zIndex: 2,
                opacity: 1,
                ["--sc-dot-rest" as any]: SHRINK,
                ["--sc-dot-wind" as any]: SHRINK * WIND,
                transform: "translate(0px, 0px) scale(1)",
                animation: `sc-badge-grow ${GROW_MS}ms both`,
                transition: "background 420ms ease",
            }
        }
        /* Already stacked in the middle, so they go out where they stand,
       underneath the one that grows. Sending them back to their ring
       positions would undo the gather in full view. */
        return {
            ...base,
            background: "#252525",
            opacity: 0,
            transform: "translate(0px, 0px) scale(0)",
            transition: "transform 240ms ease, opacity 200ms ease",
        }
    }
    const p = ringPos(i, k)
    return {
        ...base,
        background: "#252525",
        opacity: 1,
        transform: `translate(${p.x}px, ${p.y}px) scale(${SHRINK})`,
        transition: `transform 620ms cubic-bezier(.34,1.42,.5,1) ${i * 45}ms, opacity 200ms ease`,
    }
}

interface Balances {
    eth: number
    usdc: number
}

interface Live {
    enabled: boolean
    every: number // ms between quotes
}

interface Roll {
    duration: number // ms for a digit to travel; 0 disables motion
    blur: number // motion blur scale; 0 turns it off
}

const PRICE_URL =
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,usd-coin&vs_currencies=usd"

const DEFAULT_BALANCES: Balances = { eth: 0.5, usdc: 1300 }
const DEFAULT_LIVE: Live = { enabled: true, every: 60000 }
const DEFAULT_ROLL: Roll = { duration: 500, blur: 1 }
const DEFAULT_PRESETS = [25, 50, 75, 100]

interface Props {
    scale?: number
    sellLabel?: string
    receiveLabel?: string
    actionLabel?: string
    txLabel?: string
    showTxInfo?: boolean
    balances?: Balances
    fee?: number
    ethPrice?: number
    live?: Partial<Live>
    presets?: number[]
    selected?: number
    roll?: Partial<Roll>
    hoverShift?: number
    hoverBounce?: number
    hoverShadow?: number
    hoverReturn?: number
    onComplete?: () => void
    style?: CSSProperties
}

export default function SwapCard(props: Props) {
    const {
        scale = 1,
        sellLabel = "Sell",
        receiveLabel = "Receive",
        actionLabel = "Begin swap",
        txLabel = "Transaction info",
        showTxInfo = true,
        balances = DEFAULT_BALANCES,
        fee = 0.9967,
        ethPrice = 2718,
        live,
        presets = DEFAULT_PRESETS,
        selected = 0,
        roll,
        hoverShift = 8,
        hoverBounce = 1.25,
        hoverShadow = 0.035,
        hoverReturn = 200,
        onComplete,
        style,
    } = props

    const liveOptions = { ...DEFAULT_LIVE, ...live }
    const rollOptions = { ...DEFAULT_ROLL, ...roll }
    const list = presets.length ? presets : DEFAULT_PRESETS

    const [phase, setPhase] = useState<Phase>("static")
    const [flipped, setFlipped] = useState(false)
    const [swapping, setSwapping] = useState(false)
    const [band, setBand] = useState<"none" | "expanded" | "collapsed">("none")
    const [checked, setChecked] = useState(false)
    /* Separate from `checked`: the tick stays drawn while it fades out. */
    const [drawn, setDrawn] = useState(false)
    /* Set once the stroke has finished drawing, which retires the dash pattern. */
    const [solid, setSolid] = useState(false)
    const [landed, setLanded] = useState(false)
    const [runId, setRunId] = useState(0)
    /* Bumped only by the pair flip, so only the flip lands without rolling. */
    const [flipGen, setFlipGen] = useState(0)

    /* -1 means nothing picked: the button asks for an amount. */
    const [preset, setPreset] = useState<number | null>(
        selected >= 0 && selected < list.length ? list[selected] : null
    )
    /* Keyed on the values, not just the count: editing "25, 50, 75, 100" to
     "10, 25, 50, 75" in the panel keeps the same length, and depending on
     length alone would leave the selection pointing at the old number. */
    const presetKey = list.join(",")
    useEffect(() => {
        const values = presetKey.split(",").map(Number)
        setPreset(
            selected >= 0 && selected < values.length ? values[selected] : null
        )
    }, [selected, presetKey])

    /* Live price ------------------------------------------------------------
     The prop is the fallback: it is what the first paint shows, what the
     canvas shows, and what the card keeps if the API is unreachable. */
    const [price, setPrice] = useState(ethPrice)
    const pendingPrice = useRef<number | null>(null)
    const phaseRef = useRef(phase)
    phaseRef.current = phase

    useEffect(() => setPrice(ethPrice), [ethPrice])

    useEffect(() => {
        if (!liveOptions.enabled) return
        /* Leave the canvas alone: a number that changes while you design is noise,
       and it would poll the API for every open editor. */
        if (RenderTarget.current() === RenderTarget.canvas) return

        let cancelled = false

        const applyPrice = (rate: number) => {
            /* Never move the numbers mid-swap: the success label is built from them. */
            if (phaseRef.current !== "static") {
                pendingPrice.current = rate
                return
            }
            pendingPrice.current = null
            setPrice(rate)
        }

        const fetchPrice = async () => {
            const ctrl = new AbortController()
            const bail = setTimeout(() => ctrl.abort(), 6000)
            try {
                const res = await fetch(PRICE_URL, {
                    signal: ctrl.signal,
                    cache: "no-store",
                })
                if (!res.ok) throw new Error("HTTP " + res.status)
                const data = await res.json()
                const eth = data?.ethereum?.usd
                const usdc = data?.["usd-coin"]?.usd
                if (!Number.isFinite(eth) || eth <= 0)
                    throw new Error("unexpected payload")
                if (cancelled) return
                /* Price of 1 ETH in USDC — USDC sits near $1 but drifts, so divide
           rather than assume. */
                applyPrice(Number.isFinite(usdc) && usdc > 0 ? eth / usdc : eth)
            } catch (err) {
                /* Offline, rate-limited or blocked: keep the last good price and leave
           the card fully usable. */
                if (!cancelled)
                    console.warn("[SwapCard] price fetch failed", err)
            } finally {
                clearTimeout(bail)
            }
        }

        fetchPrice()
        const id = setInterval(() => {
            if (document.visibilityState === "visible") fetchPrice()
        }, liveOptions.every)
        return () => {
            cancelled = true
            clearInterval(id)
        }
    }, [liveOptions.enabled, liveOptions.every])

    /* Amounts ---------------------------------------------------------------- */
    const isEth = !flipped
    const bal = isEth ? balances.eth : balances.usdc
    const share = preset ? preset / 100 : 0
    const sellRaw = bal * share
    const recRaw = isEth ? sellRaw * price * fee : (sellRaw / price) * fee
    const sellUsd = isEth ? sellRaw * price : sellRaw
    const recUsd = isEth ? recRaw : recRaw * price

    const sellText = fmtNum(sellRaw, isEth ? 3 : 0)
    const recText = fmtNum(recRaw, isEth ? 0 : 3)
    const unit = isEth ? "ETH" : "USDC"
    const remaining = phase === "done" ? bal * (1 - share) : bal
    const availText = fmtNum(remaining, isEth ? 3 : 0) + " " + unit

    const finished = phase === "success" || phase === "done"
    const loading = phase !== "static" && !finished
    const needsAmount = phase === "static" && !preset
    const sellToken: "ETH" | "USDC" = isEth ? "ETH" : "USDC"
    const recToken: "ETH" | "USDC" = isEth ? "USDC" : "ETH"

    const buttonLabel = needsAmount
        ? "Enter an amount"
        : loading
          ? "Swapping…"
          : finished
            ? `${sellText} ${sellToken} swapped for ${recText} ${recToken}`
            : actionLabel

    /* Phase machine ---------------------------------------------------------- */
    const timers = useRef<ReturnType<typeof setTimeout>[]>([])
    const raf = useRef<number | null>(null)
    const rotation = useRef(0)
    const ringRef = useRef<HTMLDivElement>(null)

    const after = (ms: number, fn: () => void) => {
        timers.current.push(setTimeout(fn, ms))
    }

    const clearTimers = () => {
        timers.current.forEach(clearTimeout)
        timers.current = []
    }

    useEffect(() => {
        return () => {
            clearTimers()
            if (swapLockTimer.current) clearTimeout(swapLockTimer.current)
            if (raf.current !== null) cancelAnimationFrame(raf.current)
        }
    }, [])

    const complete = () => {
        if (raf.current !== null) cancelAnimationFrame(raf.current)
        setPhase("settling")
        /* Land on a whole turn rather than stopping wherever the frame fell. */
        const startRot = rotation.current
        const target = Math.ceil(startRot / 360) * 360
        const dur = 480
        const t0 = performance.now()
        const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
        const anim = (now: number) => {
            const p = Math.min((now - t0) / dur, 1)
            const val = startRot + (target - startRot) * easeOut(p)
            if (ringRef.current)
                ringRef.current.style.transform = `rotate(${val}deg)`
            if (p < 1) {
                raf.current = requestAnimationFrame(anim)
                return
            }
            rotation.current = 0
            /* No residual transform: it would keep the ring on its own raster layer,
         and the tick is drawn into that layer. */
            if (ringRef.current) ringRef.current.style.transform = ""
            setPhase("converging")
            after(CONVERGE + MERGE_HOLD, () => {
                setPhase("success")
                setChecked(true)
                setDrawn(true)
                setLanded(true)
                after(1600, () => {
                    setPhase("done")
                    setBand("collapsed")
                    setChecked(false) /* fades and shrinks, but stays drawn */
                    onComplete?.()
                })
            })
        }
        raf.current = requestAnimationFrame(anim)
    }

    const startSpin = () => {
        let last = performance.now()
        const tick = (now: number) => {
            const dt = now - last
            last = now
            rotation.current =
                (rotation.current + (360 / (SPIN * 1000)) * dt) % 360
            if (ringRef.current)
                ringRef.current.style.transform = `rotate(${rotation.current}deg)`
            raf.current = requestAnimationFrame(tick)
        }
        raf.current = requestAnimationFrame(tick)
    }

    const start = () => {
        setPhase("staggering")
        after(1000, () => setBand("expanded"))
        after(1160, () => {
            setPhase("rolled")
            after(450, () => {
                setPhase("spinning")
                startSpin()
                after(2200, complete)
            })
        })
    }

    const reset = () => {
        clearTimers()
        if (raf.current !== null) cancelAnimationFrame(raf.current)
        rotation.current = 0
        if (ringRef.current) ringRef.current.style.transform = ""
        setBand("none")
        setChecked(false)
        setDrawn(false)
        setSolid(false)
        setLanded(false)
        setPhase("static")
        /* Remount the tick so its stroke animation plays again next time. */
        setRunId((n) => n + 1)
        if (pendingPrice.current !== null) {
            setPrice(pendingPrice.current)
            pendingPrice.current = null
        }
    }

    /* Panel flip ------------------------------------------------------------- */
    const sellRef = useRef<HTMLDivElement>(null)
    const recRef = useRef<HTMLDivElement>(null)
    const slideTimers = useRef(
        new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>()
    )
    /* A ref, not the state: the guard has to hold within one tick, and a state
     update would not have landed by the next click. */
    const swapLock = useRef(false)
    /* Its own handle rather than the phase machine's list, which reset() clears:
     the lock must always release, whatever else is torn down. */
    const swapLockTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const slide = (
        el: HTMLElement | null,
        fromX: number,
        dur: number,
        shadow: boolean
    ) => {
        if (!el) return
        const pending = slideTimers.current.get(el)
        if (pending)
            clearTimeout(pending) /* drop a cleanup from an earlier slide */
        el.style.transition = "none"
        el.style.transform = `translateX(${fromX}px) translateZ(0)`
        if (shadow)
            el.style.boxShadow = `var(--sc-panel-ring), 0 ${6 * scale}px ${16 * scale}px rgba(0,0,0,0.08)`
        void el.offsetWidth /* commit the start position */
        el.style.transition =
            `transform ${dur}ms cubic-bezier(.65,0,.35,1)` +
            (shadow ? `, box-shadow ${dur}ms ease-out` : "")
        el.style.transform = "" /* settle into rest/hover — no snap */
        if (shadow)
            el.style.boxShadow = `var(--sc-panel-ring), 0 ${6 * scale}px ${16 * scale}px rgba(0,0,0,0)`
        slideTimers.current.set(
            el,
            setTimeout(() => {
                slideTimers.current.delete(el)
                el.style.transition = ""
                el.style.zIndex = ""
                el.style.boxShadow = ""
            }, dur + 40)
        )
    }

    /* Which panel is slid over its partner (see the hover CSS). Moving straight from
     one panel to the other waits for the first to get home before lifting the second. */
    type Side = "sell" | "receive"
    const [lift, setLift] = useState<Side | null>(null)
    const liftRef = useRef<Side | null>(null)
    const dropped = useRef<{ side: Side; at: number } | null>(null)
    const liftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const setLifted = (side: Side | null) => {
        const was = liftRef.current
        if (was && was !== side) dropped.current = { side: was, at: performance.now() }
        liftRef.current = side
        setLift(side)
    }
    /* Which side the cursor is on comes from the row's fixed midpoint, not from
     :hover on the panels: they move under the cursor, so hit-testing them made
     hover flip to the neighbour and back while the mouse stood still. */
    const wantRef = useRef<Side | null>(null)
    const hoverIn = (side: Side) => {
        if (liftTimer.current) clearTimeout(liftTimer.current)
        const other: Side = side === "sell" ? "receive" : "sell"
        if (liftRef.current === other) setLifted(null)
        const d = dropped.current
        const wait = d && d.side === other ? hoverReturn - (performance.now() - d.at) : 0
        if (wait > 0) liftTimer.current = setTimeout(() => setLifted(side), wait)
        else setLifted(side)
    }
    const hoverMove = (e: ReactPointerEvent<HTMLDivElement>) => {
        if (e.pointerType !== "mouse") return
        const r = e.currentTarget.getBoundingClientRect()
        const side: Side = e.clientX < r.left + r.width / 2 ? "sell" : "receive"
        if (side === wantRef.current) return
        wantRef.current = side
        hoverIn(side)
    }
    const hoverOut = (e: ReactPointerEvent) => {
        if (e.pointerType !== "mouse") return
        wantRef.current = null
        if (liftTimer.current) clearTimeout(liftTimer.current)
        setLifted(null)
    }
    useEffect(() => () => { if (liftTimer.current) clearTimeout(liftTimer.current) }, [])

    const doSwap = () => {
        /* Ignore clicks while the panels are still crossing: re-entering mid-flight
       restarts the slide from off-screen and lets a stale cleanup timer strip
       the transition off a panel in mid-travel, which reads as a speed-up. */
        if (phase !== "static" || swapLock.current) return
        const panel = sellRef.current
        /* offsetWidth is already scaled; the gap it has to clear is not. */
        const w = (panel ? panel.offsetWidth : 173 * scale) + 5 * scale
        const dur = 480
        swapLock.current = true
        setSwapping(true)
        setFlipped((f) => !f)
        setFlipGen((g) => g + 1)
        if (sellRef.current) sellRef.current.style.zIndex = "2" /* front card */
        if (recRef.current) recRef.current.style.zIndex = "1"
        slide(sellRef.current, w, dur, true) /* comes from the right */
        slide(recRef.current, -w, dur, false) /* comes from the left */
        if (swapLockTimer.current) clearTimeout(swapLockTimer.current)
        swapLockTimer.current = setTimeout(() => {
            swapLockTimer.current = null
            swapLock.current = false
            setSwapping(false)
        }, dur + 40)
    }

    const cardClass = [
        "swap-card",
        phase === "static" ? "swap-card--static" : "",
        swapping ? "swap-card--swapping" : "",
    ]
        .filter(Boolean)
        .join(" ")

    const vars = {
        "--rn-duration": `${rollOptions.duration}ms`,
        "--rn-blur": rollOptions.blur,
        "--sc-scale": scale,
        "--sc-hover-shift": `${hoverShift}px`,
        "--sc-hover-ease": `cubic-bezier(0.34, ${hoverBounce}, 0.5, 1)`,
        "--sc-hover-shadow": hoverShadow,
        "--sc-return-ms": `${hoverReturn}ms`,
        ...style,
    } as CSSProperties

    const blurOn = rollOptions.blur > 0 && rollOptions.duration > 0

    return (
        <div className={cardClass} style={vars}>
            {/* Rendered here rather than injected, so the styles are in the HTML
          Framer serves and the card never paints unstyled. */}
            <style>{CSS}</style>

            <div
                className="swap-card__panels"
                onPointerMove={hoverMove}
                onPointerLeave={hoverOut}
            >
                <div
                    ref={sellRef}
                    className={
                        "swap-card__panel swap-card__panel--sell" +
                        (lift === "sell" ? " swap-card__panel--lifted" : "")
                    }
                    onClick={doSwap}
                >
                    <div className="swap-card__panel-top">
                        <span className="swap-card__label">{sellLabel}</span>
                        <Pill token={sellToken} filled />
                    </div>
                    <div className="swap-card__amount-row">
                        <RollingNumber
                            className="swap-card__amount"
                            text={sellText}
                            value={sellRaw}
                            blur={blurOn}
                            jump={flipGen}
                            style={{ opacity: preset ? 1 : 0.35 }}
                        />
                        <RollingNumber
                            className="swap-card__sub"
                            text={"~$" + fmtNum(sellUsd, 0)}
                            value={sellUsd}
                            blur={blurOn}
                            jump={flipGen}
                        />
                    </div>
                </div>

                <div
                    ref={recRef}
                    className={
                        "swap-card__panel swap-card__panel--receive" +
                        (landed ? " swap-card__panel--shimmering" : "") +
                        (lift === "receive" ? " swap-card__panel--lifted" : "")
                    }
                    onClick={doSwap}
                >
                    <div className="swap-card__panel-top">
                        <span className="swap-card__label">{receiveLabel}</span>
                        <Pill token={recToken} filled={false} />
                    </div>
                    <div className="swap-card__amount-row">
                        <RollingNumber
                            className="swap-card__amount"
                            text={recText}
                            value={recRaw}
                            blur={blurOn}
                            jump={flipGen}
                            style={{ opacity: preset ? 1 : 0.35 }}
                        />
                        <RollingNumber
                            className="swap-card__sub"
                            text={"~$" + fmtNum(recUsd, 0)}
                            value={recUsd}
                            blur={blurOn}
                            jump={flipGen}
                        />
                    </div>
                    <div className="swap-card__shimmer" />
                </div>
            </div>

            <div className="swap-card__picker">
                <div className="swap-card__avail-row">
                    <span className="swap-card__avail-label">
                        {unit} available
                    </span>
                    <RollingNumber
                        className="swap-card__avail-val"
                        text={availText}
                        value={remaining}
                        blur={blurOn}
                        jump={flipGen}
                    />
                </div>
                <div className="swap-card__chips-wrap">
                    <div className="swap-card__chips">
                        {list.map((value) => (
                            <button
                                key={value}
                                type="button"
                                className={
                                    "swap-card__chip" +
                                    (value === preset
                                        ? " swap-card__chip--active"
                                        : "")
                                }
                                onClick={() => {
                                    if (phase !== "static") return
                                    setPreset(value)
                                }}
                            >
                                {value}%
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div
                className={
                    "swap-card__band" +
                    (band === "none" ? "" : ` swap-card__band--${band}`)
                }
            >
                <div ref={ringRef} className="swap-card__ring">
                    {Array.from({ length: COUNT }, (_, i) => (
                        <div
                            key={i}
                            className="swap-card__dot"
                            style={dotStyle(phase, i, scale)}
                        />
                    ))}
                    <svg
                        key={runId}
                        className={
                            "swap-card__check" +
                            (drawn ? " swap-card__check--drawn" : "") +
                            (solid ? " swap-card__check--solid" : "") +
                            (checked ? " swap-card__check--show" : "")
                        }
                        width={BADGE * scale}
                        height={BADGE * scale}
                        viewBox="0 0 24 24"
                        fill="none"
                        style={{
                            marginLeft: (-BADGE * scale) / 2,
                            marginTop: (-BADGE * scale) / 2,
                        }}
                    >
                        <path
                            d="M7.1 12.4 L10.5 15.7 L16.9 8.6"
                            stroke="#ffffff"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            pathLength={1}
                            onAnimationEnd={() => setSolid(true)}
                        />
                    </svg>
                </div>
            </div>

            <button
                type="button"
                className={[
                    "swap-card__btn",
                    loading ? "swap-card__btn--loading" : "",
                    finished ? "swap-card__btn--success" : "",
                    needsAmount ? "swap-card__btn--needamt" : "",
                ]
                    .filter(Boolean)
                    .join(" ")}
                disabled={needsAmount}
                onClick={() => {
                    if (phase === "static") start()
                    else if (finished) reset()
                }}
            >
                <span
                    className={
                        "swap-card__btn-label" +
                        (loading ? " swap-card__btn-label--shimmer" : "")
                    }
                >
                    {buttonLabel}
                </span>
            </button>

            {showTxInfo && (
                <div
                    className={
                        "swap-card__txinfo-wrap" +
                        (phase === "done"
                            ? " swap-card__txinfo-wrap--show"
                            : "")
                    }
                >
                    <button type="button" className="swap-card__txinfo">
                        {txLabel}
                        <svg width="9" height="9" viewBox="0 0 8 8" fill="none">
                            <path
                                d="M6.42432 5.40001V0.600006H1.62432M6.42432 0.600006L0.424316 6.60001"
                                stroke="currentColor"
                                strokeWidth="1.1"
                            />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    )
}

SwapCard.displayName = "Swap card"

addPropertyControls(SwapCard, {
    hoverShift: {
        type: ControlType.Number,
        title: "Hover overlap",
        min: 0,
        max: 40,
        step: 1,
        defaultValue: 8,
        unit: "px",
        description: "How far a hovered panel slides over its partner, which stays put (the gap is 5px)",
    },
    hoverBounce: {
        type: ControlType.Number,
        title: "Hover bounce",
        min: 1,
        max: 2.6,
        step: 0.05,
        defaultValue: 1.25,
        description: "1 = no overshoot; higher springs past and settles back",
    },
    hoverShadow: {
        type: ControlType.Number,
        title: "Hover shadow",
        min: 0,
        max: 0.2,
        step: 0.005,
        defaultValue: 0.035,
        description: "Opacity of the shadow under the hovered panel (0 = none)",
    },
    hoverReturn: {
        type: ControlType.Number,
        title: "Hover return",
        min: 80,
        max: 600,
        step: 10,
        defaultValue: 200,
        unit: "ms",
        description: "How fast a panel slides home; moving to the other panel waits for this",
    },
    scale: {
        type: ControlType.Number,
        title: "Scale",
        min: 0.4,
        max: 3,
        step: 0.05,
        defaultValue: 1,
        description: "1 = the 362 × 282 design size",
    },
    sellLabel: {
        type: ControlType.String,
        title: "Sell",
        defaultValue: "Sell",
    },
    receiveLabel: {
        type: ControlType.String,
        title: "Receive",
        defaultValue: "Receive",
    },
    actionLabel: {
        type: ControlType.String,
        title: "Button",
        defaultValue: "Begin swap",
    },
    balances: {
        type: ControlType.Object,
        title: "Balance",
        controls: {
            eth: {
                type: ControlType.Number,
                title: "ETH",
                min: 0,
                max: 1000,
                step: 0.1,
                defaultValue: 0.5,
            },
            usdc: {
                type: ControlType.Number,
                title: "USDC",
                min: 0,
                max: 1000000,
                step: 10,
                defaultValue: 1300,
            },
        },
    },
    presets: {
        type: ControlType.Array,
        title: "Chips",
        maxCount: 5,
        defaultValue: DEFAULT_PRESETS,
        control: {
            type: ControlType.Number,
            min: 1,
            max: 100,
            step: 1,
            defaultValue: 25,
        },
    },
    selected: {
        type: ControlType.Number,
        title: "Selected",
        min: -1,
        max: 4,
        step: 1,
        displayStepper: true,
        defaultValue: 0,
        description: "-1 asks for an amount",
    },
    ethPrice: {
        type: ControlType.Number,
        title: "ETH price",
        min: 1,
        max: 100000,
        step: 10,
        defaultValue: 2718,
        description: "Fallback, and what the canvas shows",
    },
    fee: {
        type: ControlType.Number,
        title: "Rate",
        min: 0.9,
        max: 1,
        step: 0.0001,
        defaultValue: 0.9967,
        description: "Kept after fees; 0.9967 is a 0.33% spread",
    },
    live: {
        type: ControlType.Object,
        title: "Live price",
        controls: {
            enabled: {
                type: ControlType.Boolean,
                title: "Fetch",
                defaultValue: true,
            },
            every: {
                type: ControlType.Number,
                title: "Every",
                min: 10000,
                max: 600000,
                step: 5000,
                unit: "ms",
                defaultValue: 60000,
                hidden: (p: any) => !p.enabled,
            },
        },
    },
    roll: {
        type: ControlType.Object,
        title: "Rolling digits",
        controls: {
            duration: {
                type: ControlType.Number,
                title: "Duration",
                min: 0,
                max: 2000,
                step: 50,
                unit: "ms",
                defaultValue: 500,
            },
            blur: {
                type: ControlType.Number,
                title: "Motion blur",
                min: 0,
                max: 3,
                step: 0.1,
                defaultValue: 1,
                description: "0 turns it off",
            },
        },
    },
    showTxInfo: {
        type: ControlType.Boolean,
        title: "Tx info",
        defaultValue: true,
    },
    txLabel: {
        type: ControlType.String,
        title: "Tx label",
        defaultValue: "Transaction info",
        hidden: (p: any) => !p.showTxInfo,
    },
    onComplete: { type: ControlType.EventHandler },
})
