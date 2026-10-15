import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react"
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { RollingNumber as LibRollingNumber } from "@kitlangton/rolling-number/react"
import "@kitlangton/rolling-number/styles.css"

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
 *   - rolling digits on every number (@kitlangton/rolling-number, with its
 *     motion blur),
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

/* Rolling numbers (@kitlangton/rolling-number): its slots are content-box (the
   padding is room for overhang), so they're left out of the reset above */
.swap-card .rn-slot { box-sizing: content-box; }

/* Picker ------------------------------------------------------------------- */
.swap-card__picker { padding: 0 calc(3px * var(--sc-scale)); }

.swap-card__avail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 calc(1px * var(--sc-scale));
  margin-top: calc(20px * var(--sc-scale));
  margin-bottom: calc(14px * var(--sc-scale));
}

.swap-card__avail-label { font-size: calc(13px * var(--sc-scale)); font-weight: 500; color: rgba(37, 37, 37, 0.75); }
.swap-card__avail-val { font-size: calc(13px * var(--sc-scale)); font-weight: 500; color: #252525; }

.swap-card__chips-wrap {
  overflow: hidden;
  height: calc(44px * var(--sc-scale));
  opacity: 1;
  transition: height 300ms ease, opacity 240ms ease;
}

/* During a swap the chips make way for the steps (same box, which grows to fit them) */
.swap-card__chips-wrap { position: relative; }
/* Coming back (after a swap) the chips wait for their space to open, then fade in
   out of a blur, so the growing edge never cuts through sharp buttons */
.swap-card__chips { transition: opacity 300ms ease 140ms, filter 380ms ease 140ms; }
.swap-card__chips-wrap--steps { height: var(--sc-steps-h); }
.swap-card__chips-wrap--steps .swap-card__chips,
.swap-card__chips-wrap--away .swap-card__chips {
  opacity: 0;
  filter: blur(calc(6px * var(--sc-scale)));
  transition: opacity 180ms ease, filter 180ms ease;
}

.swap-card__steps {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sc-step-gap);
  /* 10 on top + the 14 under "available" = 24; 4 below + the 20 gap above the button = 24 */
  padding: calc(10px * var(--sc-scale)) calc(1px * var(--sc-scale)) calc(4px * var(--sc-scale));
  pointer-events: none;
}
.swap-card__step {
  display: flex;
  align-items: center;
  gap: calc(10px * var(--sc-scale));
  height: var(--sc-step-h);
  font-size: calc(13px * var(--sc-scale));
  font-weight: 400;
  color: #1a1a1a;
  opacity: 0;
  filter: blur(calc(4px * var(--sc-scale)));
  transform: translateY(calc(6px * var(--sc-scale)));
  /* leaving: quick, blurred, no stagger */
  transition: opacity 160ms ease, filter 160ms ease, transform 160ms ease, color 320ms ease;
}
.swap-card__step--in {
  opacity: 1;
  filter: none;
  transform: none;
  transition: opacity 320ms ease, transform 420ms cubic-bezier(.2,.8,.2,1), color 320ms ease, filter 320ms ease;
}
.swap-card__step--done { color: var(--sc-step-done); }

/* The step's icon: one dot while it waits, six in a spinning ring while it runs,
   a circle with a tick once it's done */
.sc-step-icon { position: relative; flex: none; width: var(--sc-step-icon); height: var(--sc-step-icon); }
.sc-step-icon__ring { position: absolute; left: 50%; top: 50%; width: 0; height: 0; }
.sc-step-icon__ring--spin { animation: sc-step-spin var(--sc-step-spin) linear infinite; }
@keyframes sc-step-spin { to { transform: rotate(360deg); } }
.sc-step-icon__dot {
  position: absolute;
  left: 0;
  top: 0;
  border-radius: 50%;
  background: #1a1a1a;
}
.sc-step-icon svg { position: absolute; inset: 0; overflow: visible; }
.sc-step-icon__circle {
  transform-origin: 50% 50%;
  transform: scale(0.4);
  opacity: 0;
  transition: transform 440ms cubic-bezier(.34,1.4,.6,1), opacity 220ms ease;
}
.sc-step-icon__tick { stroke-dasharray: 1; stroke-dashoffset: 1; transition: stroke-dashoffset 420ms cubic-bezier(.65,0,.35,1) 200ms; }
.sc-step-icon--done .sc-step-icon__circle { transform: scale(1); opacity: 1; }
.sc-step-icon--done .sc-step-icon__tick { stroke-dashoffset: 0; }

/* The chips stay put while a swap runs, they just can't be changed until it's done. */
.swap-card:not(.swap-card--static) .swap-card__chips-wrap { pointer-events: none; }
/* ...and fold away as the transaction info comes in, in step with it, so the card
   keeps its height (the -5px matches the tx info's top margin) */
.swap-card__chips-wrap--away {
  height: 0;
  margin-bottom: calc(-5px * var(--sc-scale));
  opacity: 0;
  transition: height var(--sc-tx-ms, 520ms) cubic-bezier(.2,.8,.2,1), margin-bottom var(--sc-tx-ms, 520ms) cubic-bezier(.2,.8,.2,1), opacity 160ms ease;
}

/* The received amount swells for a moment as the funds land */
@keyframes sc-amount-pop {
  0% { transform: scale(1); animation-timing-function: cubic-bezier(.2,.8,.3,1); }
  40% { transform: scale(var(--sc-pop, 1.12)); animation-timing-function: cubic-bezier(.5,0,.3,1); }
  100% { transform: scale(1); }
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

/* The gap between the chips and the button (the progress now plays inside the button) */
.swap-card__band { height: calc(20px * var(--sc-scale)); }

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
  /* see-through to start with, so the success border fades in from it, not from black */
  box-shadow: inset 0 0 0 0.1px rgba(255, 255, 255, 0);
  transition: opacity 200ms ease, background 300ms ease, color 300ms ease, box-shadow 300ms ease;
}

/* Its own compositing layer from the start, so the success bounce (a transform on
   a rounded, clipped box) doesn't flip it onto a new layer mid-way, which WebKit
   can show as a dark flash */
.swap-card__btn { position: relative; overflow: hidden; transform: translateZ(0); }
.swap-card__btn-label { display: inline-block; transition: opacity 200ms ease; }
.swap-card__btn-label--hidden { opacity: 0; }

/* The loader inside the button: dots pop in, roll up into a spinning ring, then
   "Swapping" fades in and pushes the ring to the side; on completion a check. */
.swap-card__load { position: absolute; inset: 0; pointer-events: none; }
.swap-card__load-spin {
  position: absolute; left: 50%; top: 50%; width: 0; height: 0;
  transition: transform 280ms cubic-bezier(.3,.7,.2,1), opacity 240ms ease;
}
.swap-card__load-measure { position: absolute; visibility: hidden; white-space: nowrap; left: 0; top: 0; }
.swap-card__load-ring { position: absolute; left: 0; top: 0; width: 0; height: 0; }
.swap-card__load-dot { position: absolute; left: 0; top: 0; border-radius: 50%; }
.swap-card__load-word {
  position: absolute; left: 50%; top: 50%; white-space: nowrap; color: inherit;
  opacity: 0; transition: opacity 240ms ease, transform 280ms cubic-bezier(.3,.7,.2,1);
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

/* Comes in quickly, in step with the chips folding away so the card keeps its size */
.swap-card__txinfo-wrap--show {
  height: calc(44px * var(--sc-scale)); margin-top: calc(5px * var(--sc-scale)); opacity: 1;
  transition: height var(--sc-tx-ms, 520ms) cubic-bezier(.2,.8,.2,1), margin-top var(--sc-tx-ms, 520ms) cubic-bezier(.2,.8,.2,1), opacity 120ms ease;
}
.swap-card__txinfo-wrap--show .swap-card__txinfo {
  animation: sc-tx-in var(--sc-tx-ms, 520ms) both;
}
@keyframes sc-tx-in {
  0% { transform: translateY(calc(10px * var(--sc-scale))); opacity: 0; animation-timing-function: cubic-bezier(.2,.8,.2,1); }
  100% { transform: none; opacity: 1; }
}

/* The success button gives a short snappy bounce as it turns green */
@keyframes sc-btn-bounce {
  0% { transform: translateZ(0) scale(1); animation-timing-function: cubic-bezier(.2,.9,.3,1); }
  40% { transform: translateZ(0) scale(var(--sc-btn-bounce, 1.04)); animation-timing-function: cubic-bezier(.4,0,.3,1); }
  100% { transform: translateZ(0) scale(1); }
}

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
  /* the same hairline as the success button, in its own text grey (follows it on hover) */
  box-shadow: inset 0 0 0 0.1px currentColor;
  transition: background 160ms ease, color 160ms ease, box-shadow 160ms ease;
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
  /* one band: repeating, the sweep showed a second one following it */
  background-repeat: no-repeat;
}

.swap-card__panel--shimmering .swap-card__shimmer {
  opacity: 1;
  animation: sc-shimmer 1.4s ease-in-out 240ms 1 both;
}

/* the band starts just off the left edge and leaves off the right */
@keyframes sc-shimmer {
  0% { background-position: 117% 0; }
  100% { background-position: -17% 0; }
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
   Rolling numbers: @kitlangton/rolling-number, with its motion blur
   ========================================================================== */

/* Formats like fmtNum (dot for thousands, comma for decimals, no trailing zeros)
   and keeps "~$" / " ETH" around the digits as plain text, so they stay put while
   the digits roll. `jump` remounts it: the new number is simply there instead of
   rolled to (the pair flip, where the value is replaced, not drifting). */
function RollingNumber({
    value,
    decimals,
    prefix,
    suffix,
    blur = true,
    duration = 500,
    jump = 0,
    className,
    style,
}: {
    value: number
    decimals: number
    prefix?: string
    suffix?: string
    blur?: boolean
    duration?: number
    jump?: string | number
    className?: string
    style?: CSSProperties
}) {
    const rounded = Number(value.toFixed(decimals))
    return (
        <span className={className} style={style}>
            {prefix}
            <LibRollingNumber
                key={jump}
                value={rounded}
                locales="de-DE"
                format={{ minimumFractionDigits: 0, maximumFractionDigits: decimals }}
                duration={duration}
                motionBlur={blur}
                style={{ fontVariantNumeric: "tabular-nums" }}
            />
            {suffix}
        </span>
    )
}

/* One step's icon (see .sc-step-icon). `k` is --sc-scale. */
function StepIcon({ state, k, L }: { state: "pending" | "active" | "done"; k: number; L: Loader }) {
    const d = L.stepDot * k
    const rad = L.stepRadius * k
    return (
        <span className={"sc-step-icon" + (state === "done" ? " sc-step-icon--done" : "")}>
            <span className={"sc-step-icon__ring" + (state !== "pending" ? " sc-step-icon__ring--spin" : "")}>
                {Array.from({ length: COUNT }, (_, i) => {
                    const a = ((-90 + i * (360 / COUNT)) * Math.PI) / 180
                    const x = state === "active" ? rad * Math.cos(a) : 0
                    const y = state === "active" ? rad * Math.sin(a) : 0
                    /* waiting: just the first dot, bigger; running: all six out on the
                       ring (the big dot shrinking to size as it goes); done: they gather
                       back in and go */
                    const scale = state === "active" ? 1 : state === "pending" && i === 0 ? L.stepWaitDot / L.stepDot : 0
                    return (
                        <span
                            key={i}
                            className="sc-step-icon__dot"
                            style={{
                                width: d,
                                height: d,
                                marginLeft: -d / 2,
                                marginTop: -d / 2,
                                background: state === "done" ? L.stepDoneColour : undefined,
                                transform: `translate(${x}px, ${y}px) scale(${scale})`,
                                transition:
                                    state === "active"
                                        ? `transform ${L.stepExpand}ms cubic-bezier(.34,1.5,.5,1) ${i * 35}ms`
                                        : "transform 320ms cubic-bezier(.55,0,1,.45)",
                            }}
                        />
                    )
                })}
            </span>
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle className="sc-step-icon__circle" cx="8" cy="8" r="7.3" stroke={L.stepDoneColour} strokeWidth="1.1" />
                <path className="sc-step-icon__tick" d="M5.1 8.3 L7.1 10.2 L10.9 6.2" stroke={L.stepDoneColour} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" pathLength={1} />
            </svg>
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

/* Dot choreography. GROW is how far the
   surviving dot has to swell to become the success badge. */
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

/* The button loader: the same animation as the progress band had, at button size.
   Dots pop in one by one, roll up into a ring that spins, gather into one point,
   and that point swells into a green badge with a tick (px before --sc-scale). */
/* Every value here is a setting (see "Swap loader" in the property controls) */
type Loader = {
    dot: number // dot size
    gap: number // gap between dots in the row
    radius: number // ring radius
    colour: string // dot colour
    popIn: number // ms each dot takes to pop in
    popStagger: number // ms between dots popping in
    rise: number // px a dot rises from as it comes in
    rollAt: number // ms after the click the row rolls up into the ring
    roll: number // ms the roll takes
    rollStagger: number // ms between dots rolling
    textAt: number // ms after the roll "Swapping" fades in
    swapTime: number // ms the ring spins before the swap completes
    spin: number // seconds per turn
    side: "left" | "right" // where the ring / badge sits next to the text
    textGap: number // space between the text and the ring / badge
    push: number // how far "Swapping" slides in from
    textFade: number // ms "Swapping" takes to fade in
    shimmer: boolean
    badge: number // size of the success circle
    outline: number // line width of the circle and tick
    tick: number // size of the tick inside the circle (1 = as drawn)
    filled: boolean // filled circle with a white tick instead of an outline
    successColour: string
    successBackground: string
    messageFade: number // ms the success message takes to fade in
    keepCheck: boolean // the circle and tick stay after the swap
    steps: boolean // show the swap's steps in place of the chips (the button then has no spinner)
    step1: string // step labels; {sell} and {receive} become the tokens
    step2: string
    step3: string
    stepTime: number // ms each step runs
    stepGap: number // ms between one step finishing and the next starting
    stepAppear: number // ms between the rows coming in
    stepExpand: number // ms for the dot to open into the spinner
    stepSpin: number // seconds per turn
    stepDot: number // dot size in a step's spinner
    stepWaitDot: number // size of the single dot a step waits on
    stepRadius: number // that spinner's radius
    stepDoneColour: string // finished steps: text, circle and tick
    txDelay: number // ms after success the transaction info comes in
    txDuration: number // ms it takes to come in
    successBounce: number // how far the success button swells (1 = none)
    successBounceDuration: number // ms
    numberPop: number // how much the received amount grows when it lands (1 = none)
    numberPopDuration: number // ms
    numberPopDelay: number // ms after success
}
const DEFAULT_LOADER: Loader = {
    dot: 2.5,
    gap: 7,
    radius: 6,
    colour: "#ffffff",
    popIn: 420,
    popStagger: 80,
    rise: 6,
    rollAt: 920,
    roll: 540,
    rollStagger: 38,
    textAt: 390,
    swapTime: 3600,
    spin: 3,
    side: "left",
    textGap: 6,
    push: 8,
    textFade: 240,
    shimmer: true,
    badge: 18,
    outline: 1.6,
    tick: 0.9,
    filled: false,
    successColour: "#22c55e",
    successBackground: "rgba(34, 197, 94, 0.25)",
    messageFade: 280,
    keepCheck: true,
    steps: true,
    step1: "Approving {sell}",
    step2: "Swapping {sell} for {receive}",
    step3: "Confirming on-chain",
    stepTime: 1800,
    stepGap: 320,
    stepAppear: 140,
    stepExpand: 560,
    stepSpin: 1.4,
    stepDot: 2.6,
    stepWaitDot: 5,
    stepRadius: 5.5,
    stepDoneColour: "rgba(37, 37, 37, 0.35)",
    txDelay: 550,
    txDuration: 520,
    successBounce: 1.04,
    successBounceDuration: 400,
    numberPop: 1.12,
    numberPopDuration: 400,
    numberPopDelay: 0,
}

function loadDotStyle(phase: Phase, i: number, k: number, L: Loader): CSSProperties {
    const LBADGE = L.badge
    const LSHRINK = L.dot / L.badge
    /* The badge's outline grows out of a white, see-through ring rather than out of
       "none": a shadow that starts from nothing is interpolated from transparent
       black, which some browsers paint as a dark flash on the way to green. */
    const base: CSSProperties = { width: LBADGE * k, height: LBADGE * k, marginLeft: (-LBADGE * k) / 2, marginTop: (-LBADGE * k) / 2, boxShadow: `inset 0 0 0 ${L.outline * k}px rgba(255, 255, 255, 0)` }
    const row = { x: (i - (COUNT - 1) / 2) * L.gap * k, y: 0 }
    const a = ((-90 + i * (360 / COUNT)) * Math.PI) / 180
    const ring = { x: L.radius * k * Math.cos(a), y: L.radius * k * Math.sin(a) }
    if (phase === "static" || L.steps)
        return { ...base, background: L.colour, opacity: 0, transform: `translate(${row.x}px, ${L.rise * k}px) scale(0)`, transition: "transform 200ms ease, opacity 200ms ease" }
    if (phase === "staggering")
        /* Each dot rises into its place as it grows (from a little below, just
           past it and back), one after the other, so the line comes in as a wave */
        return {
            ...base,
            background: L.colour,
            opacity: 1,
            transform: `translate(${row.x}px, 0px) scale(${LSHRINK})`,
            transition: `transform ${L.popIn}ms cubic-bezier(.34,1.45,.55,1) ${i * L.popStagger}ms, opacity ${Math.min(200, L.popIn)}ms ease ${i * L.popStagger}ms`,
        }
    if (phase === "converging")
        return { ...base, background: L.colour, zIndex: i === 0 ? 2 : 1, opacity: 1, transform: `translate(0px, 0px) scale(${LSHRINK})`, transition: `transform ${CONVERGE}ms cubic-bezier(.55,0,1,.45)` }
    if (phase === "success" || phase === "done") {
        if (i === 0) {
            if (phase === "done" && !L.keepCheck)
                return { ...base, background: L.filled ? L.successColour : "rgba(255, 255, 255, 0)", boxShadow: `inset 0 0 0 ${L.outline * k}px ${L.filled ? "rgba(255, 255, 255, 0)" : L.successColour}`, zIndex: 2, opacity: 0, animation: "sc-badge-leave 420ms cubic-bezier(.4,0,.2,1) both", transition: "opacity 320ms ease" }
            /* The white dot grows into the badge: an outlined circle (its fill fades
               as the outline comes in), or a filled one */
            return {
                ...base,
                background: L.filled ? L.successColour : "rgba(255, 255, 255, 0)",
                boxShadow: `inset 0 0 0 ${L.outline * k}px ${L.filled ? "rgba(255, 255, 255, 0)" : L.successColour}`,
                zIndex: 2,
                opacity: 1,
                ["--sc-dot-rest" as any]: LSHRINK,
                ["--sc-dot-wind" as any]: LSHRINK * WIND,
                transform: "translate(0px, 0px) scale(1)",
                animation: `sc-badge-grow ${GROW_MS}ms both`,
                transition: "background 360ms ease, box-shadow 360ms ease",
            }
        }
        return { ...base, background: L.colour, opacity: 0, transform: "translate(0px, 0px) scale(0)", transition: "transform 240ms ease, opacity 200ms ease" }
    }
    return { ...base, background: L.colour, opacity: 1, transform: `translate(${ring.x}px, ${ring.y}px) scale(${LSHRINK})`, transition: `transform ${L.roll}ms cubic-bezier(.34,1.42,.5,1) ${i * L.rollStagger}ms, opacity 200ms ease` }
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
    loaderDot?: Loader["dot"]
    loaderGap?: Loader["gap"]
    loaderRadius?: Loader["radius"]
    loaderColour?: Loader["colour"]
    loaderPopIn?: Loader["popIn"]
    loaderRise?: number
    loaderPopStagger?: Loader["popStagger"]
    loaderRollAt?: Loader["rollAt"]
    loaderRoll?: Loader["roll"]
    loaderRollStagger?: Loader["rollStagger"]
    loaderTextAt?: Loader["textAt"]
    loaderSwapTime?: Loader["swapTime"]
    loaderSpin?: Loader["spin"]
    loaderSide?: Loader["side"]
    loaderTextGap?: Loader["textGap"]
    loaderPush?: Loader["push"]
    loaderTextFade?: Loader["textFade"]
    loaderShimmer?: Loader["shimmer"]
    loaderBadge?: Loader["badge"]
    loaderOutline?: Loader["outline"]
    loaderFilled?: Loader["filled"]
    loaderSuccessColour?: Loader["successColour"]
    loaderSuccessBackground?: Loader["successBackground"]
    loaderMessageFade?: Loader["messageFade"]
    loaderTxDelay?: number
    loaderTxDuration?: number
    loaderSuccessBounce?: number
    loaderSuccessBounceDuration?: number
    loaderNumberPop?: number
    loaderNumberPopDuration?: number
    loaderNumberPopDelay?: number
    loaderSteps?: boolean
    loaderStep1?: string
    loaderStep2?: string
    loaderStep3?: string
    loaderStepTime?: number
    loaderStepGap?: number
    loaderStepAppear?: number
    loaderStepExpand?: number
    loaderStepSpin?: number
    loaderStepDot?: number
    loaderStepWaitDot?: number
    loaderStepRadius?: number
    loaderStepDoneColour?: string
    loaderKeepCheck?: Loader["keepCheck"]
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

    const L: Loader = { ...DEFAULT_LOADER }
    for (const k of Object.keys(DEFAULT_LOADER) as (keyof Loader)[]) {
        const v = (props as any)["loader" + k[0].toUpperCase() + k.slice(1)]
        if (v !== undefined && v !== null && v !== "") (L as any)[k] = v
    }
    const LBADGE = L.badge
    const LDOT = L.dot
    const LRADIUS = L.radius
    const LWORD_GAP = L.textGap

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
    /* the transaction info comes in shortly after success (the chips fold away for it) */
    const [txIn, setTxIn] = useState(false)
    /* the steps: how many are done, which one runs (-1: none), and whether the rows are in */
    const [stepsDone, setStepsDone] = useState(0)
    const [stepActive, setStepActive] = useState(-1)
    const [stepsIn, setStepsIn] = useState(false)
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
    const remaining = phase === "success" || phase === "done" ? bal * (1 - share) : bal

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
    const ringRef = useRef<HTMLSpanElement>(null)
    const wordRef = useRef<HTMLSpanElement>(null)
    /* both texts are measured ahead (hidden copies), so the success message lands
       centred at once instead of sliding in from where "Swapping" sat */
    const measureSwap = useRef<HTMLSpanElement>(null)
    const measureDone = useRef<HTMLSpanElement>(null)
    const [swapW, setSwapW] = useState(70)
    const [doneW, setDoneW] = useState(200)
    useIsoLayoutEffect(() => {
        if (measureSwap.current) setSwapW(measureSwap.current.offsetWidth)
        if (measureDone.current) setDoneW(measureDone.current.offsetWidth)
    })

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
            after(CONVERGE + MERGE_HOLD, succeed)
        }
        raf.current = requestAnimationFrame(anim)
    }

    const succeed = () => {
        setPhase("success")
        setChecked(true)
        setDrawn(true)
        setLanded(true)
        after(L.txDelay, () => setTxIn(true))
        after(1600, () => {
            setPhase("done")
            if (!L.keepCheck) setChecked(false) /* fades, but stays drawn */
            onComplete?.()
        })
    }

    /* With steps: the rows come in (each waiting on a dot), then one by one a step
       opens into a spinner, runs, and settles into a tick; after the last, success */
    const runStep = (n: number) => {
        setStepActive(n)
        after(L.stepTime, () => {
            setStepActive(-1)
            setStepsDone(n + 1)
            if (n < 2) after(L.stepGap, () => runStep(n + 1))
            else after(Math.max(L.stepGap, 640), succeed)
        })
    }

    const startSpin = () => {
        let last = performance.now()
        const tick = (now: number) => {
            const dt = now - last
            last = now
            rotation.current =
                (rotation.current + (360 / (L.spin * 1000)) * dt) % 360
            if (ringRef.current)
                ringRef.current.style.transform = `rotate(${rotation.current}deg)`
            raf.current = requestAnimationFrame(tick)
        }
        raf.current = requestAnimationFrame(tick)
    }

    const start = () => {
        if (L.steps) {
            setPhase("spinning")
            setStepsDone(0)
            setStepActive(-1)
            setStepsIn(true)
            after(2 * L.stepAppear + 520, () => runStep(0))
            return
        }
        setPhase("staggering")
        after(L.rollAt, () => {
            setPhase("rolled")
            after(L.textAt, () => {
                setPhase("spinning")
                startSpin()
                after(L.swapTime, complete)
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
        setTxIn(false)
        setStepsIn(false)
        setStepActive(-1)
        setStepsDone(0)
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
                            value={sellRaw}
                            decimals={isEth ? 3 : 0}
                            duration={rollOptions.duration}
                            blur={blurOn}
                            jump={flipGen}
                            style={{ opacity: preset ? 1 : 0.35 }}
                        />
                        <RollingNumber
                            className="swap-card__sub"
                            prefix="~$"
                            value={sellUsd}
                            decimals={0}
                            duration={rollOptions.duration}
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
                            value={recRaw}
                            decimals={isEth ? 0 : 3}
                            duration={rollOptions.duration}
                            blur={blurOn}
                            jump={flipGen}
                            style={{
                                opacity: preset ? 1 : 0.35,
                                ...(landed && L.numberPop !== 1
                                    ? {
                                          display: "inline-block",
                                          transformOrigin: "left 80%",
                                          ["--sc-pop" as any]: L.numberPop,
                                          animation: `sc-amount-pop ${L.numberPopDuration}ms ${L.numberPopDelay}ms both`,
                                      }
                                    : {}),
                            }}
                        />
                        <RollingNumber
                            className="swap-card__sub"
                            prefix="~$"
                            value={recUsd}
                            decimals={0}
                            duration={rollOptions.duration}
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
                        value={remaining}
                        decimals={isEth ? 3 : 0}
                        suffix={" " + unit}
                        duration={rollOptions.duration}
                        blur={blurOn}
                        jump={flipGen}
                    />
                </div>
                <div
                    className={
                        "swap-card__chips-wrap" +
                        (L.steps && stepsIn ? " swap-card__chips-wrap--steps" : "") +
                        (txIn && showTxInfo ? " swap-card__chips-wrap--away" : "")
                    }
                    style={{
                        ["--sc-tx-ms" as any]: `${L.txDuration}ms`,
                        ["--sc-step-h" as any]: `${20 * scale}px`,
                        ["--sc-step-gap" as any]: `${8 * scale}px`,
                        ["--sc-steps-h" as any]: `${(3 * 20 + 2 * 8 + 10 + 4) * scale}px`,
                        ["--sc-step-icon" as any]: `${16 * scale}px`,
                        ["--sc-step-spin" as any]: `${L.stepSpin}s`,
                        ["--sc-step-done" as any]: L.stepDoneColour,
                    }}
                >
                    {L.steps && (
                        <div className="swap-card__steps" aria-live="polite">
                            {[L.step1, L.step2, L.step3].map((label, n) => {
                                const state = n < stepsDone ? "done" : n === stepActive ? "active" : "pending"
                                return (
                                    <div
                                        key={n}
                                        className={
                                            "swap-card__step" +
                                            (stepsIn ? " swap-card__step--in" : "") +
                                            (state === "done" ? " swap-card__step--done" : "")
                                        }
                                        style={{ transitionDelay: stepsIn ? `${n * L.stepAppear}ms, ${n * L.stepAppear}ms, 0ms` : "0ms" }}
                                    >
                                        <StepIcon state={state} k={scale} L={L} />
                                        {label.replace("{sell}", sellToken).replace("{receive}", recToken)}
                                    </div>
                                )
                            })}
                        </div>
                    )}
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
                style={
                    finished
                        ? {
                              background: L.successBackground,
                              color: L.successColour,
                              boxShadow: `inset 0 0 0 0.1px ${L.successColour}`,
                              ...(L.successBounce !== 1
                                  ? { ["--sc-btn-bounce" as any]: L.successBounce, animation: `sc-btn-bounce ${L.successBounceDuration}ms both` }
                                  : {}),
                          }
                        : undefined
                }
                onClick={() => {
                    if (phase === "static") start()
                    else if (finished) reset()
                }}
            >
                <span
                    className={
                        "swap-card__btn-label" +
                        (phase !== "static" ? " swap-card__btn-label--hidden" : "")
                    }
                >
                    {phase === "static" ? buttonLabel : actionLabel}
                </span>
                <span className="swap-card__load" aria-hidden="true">
                    {(() => {
                        /* "Swapping" (with its shimmer) fades in once the ring spins and pushes
                           it to the side; on success the same text becomes the success message,
                           next to the badge; when the badge leaves, the message centres */
                        const shown = phase === "spinning" || phase === "settling" || phase === "converging" || finished
                        const ringD = (LRADIUS * 2 + LDOT) * scale
                        const badgeD = LBADGE * scale
                        const gapD = LWORD_GAP * scale
                        /* with steps the ticks are on the steps, so the message stands alone */
                        const withBadge = !L.steps && !(phase === "done" && !L.keepCheck)
                        const sideD = finished ? (withBadge ? badgeD : 0) : ringD
                        const swapTotal = swapW + gapD + ringD
                        const doneTotal = doneW + (withBadge ? gapD + badgeD : 0)
                        const total = finished ? doneTotal : swapTotal
                        const left = L.side === "left"
                        /* the ring / badge sits at one end of the row, the text at the other */
                        const ringX = shown ? (left ? -total / 2 + sideD / 2 : total / 2 - sideD / 2) : 0
                        const swapX = L.steps ? -swapW / 2 : left ? -swapTotal / 2 + ringD + gapD : -swapTotal / 2
                        const doneX = left ? -doneTotal / 2 + (withBadge ? badgeD + gapD : 0) : -doneTotal / 2
                        const pushD = L.push * scale * (left ? 1 : -1)
                        return (
                            <>
                                <span
                                    ref={wordRef}
                                    className={"swap-card__load-word" + (L.shimmer ? " swap-card__btn-label--shimmer" : "")}
                                    style={{
                                        transform: `translate(${swapX + (shown ? 0 : pushD)}px, -50%)`,
                                        opacity: shown && !finished ? 1 : 0,
                                        transition: finished
                                            ? "opacity 160ms ease, transform 280ms cubic-bezier(.3,.7,.2,1)"
                                            : `opacity ${L.textFade}ms ease ${phase === "spinning" ? 120 : 0}ms, transform 280ms cubic-bezier(.3,.7,.2,1) ${phase === "spinning" ? 120 : 0}ms`,
                                    }}
                                >
                                    Swapping…
                                </span>
                                {/* The success message crossfades in where it ends up, instead of the
                                    "Swapping" text being swapped out and sliding over */}
                                <span
                                    className="swap-card__load-word"
                                    style={{
                                        transform: `translate(${doneX}px, -50%)`,
                                        opacity: finished ? 1 : 0,
                                        transition: finished ? `opacity ${L.messageFade}ms ease 80ms, transform 280ms cubic-bezier(.3,.7,.2,1)` : "none",
                                    }}
                                >
                                    {`${sellText} ${sellToken} swapped for ${recText} ${recToken}`}
                                </span>
                                <span ref={measureSwap} className="swap-card__load-measure">Swapping…</span>
                                <span ref={measureDone} className="swap-card__load-measure">
                                    {`${sellText} ${sellToken} swapped for ${recText} ${recToken}`}
                                </span>
                                <span className="swap-card__load-spin" style={{ transform: `translateX(${ringX}px)` }}>
                                    <span ref={ringRef} className="swap-card__load-ring">
                                        {Array.from({ length: COUNT }, (_, i) => (
                                            <span key={i} className="swap-card__load-dot" style={loadDotStyle(phase, i, scale, L)} />
                                        ))}
                                        <svg
                                            key={runId}
                                            className={
                                                "swap-card__check" +
                                                (drawn ? " swap-card__check--drawn" : "") +
                                                (solid ? " swap-card__check--solid" : "") +
                                                (checked && !L.steps ? " swap-card__check--show" : "")
                                            }
                                            width={LBADGE * L.tick * scale}
                                            height={LBADGE * L.tick * scale}
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            style={{ marginLeft: (-LBADGE * L.tick * scale) / 2, marginTop: (-LBADGE * L.tick * scale) / 2 }}
                                        >
                                            <path
                                                d="M7.1 12.4 L10.5 15.7 L16.9 8.6"
                                                stroke={L.filled ? "#ffffff" : L.successColour}
                                                strokeWidth={L.filled ? 2.2 / L.tick : (L.outline * 24) / (LBADGE * L.tick)}
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                pathLength={1}
                                                onAnimationEnd={() => setSolid(true)}
                                            />
                                        </svg>
                                    </span>
                                </span>
                            </>
                        )
                    })()}
                </span>
            </button>

            {showTxInfo && (
                <div
                    className={
                        "swap-card__txinfo-wrap" +
                        (txIn
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
    loaderDot: { type: ControlType.Number, title: "Dot size", min: 1, max: 6, step: 0.1, defaultValue: 2.5, unit: "px" },
    loaderGap: { type: ControlType.Number, title: "Dot spacing", min: 3, max: 16, step: 0.5, defaultValue: 7, unit: "px", description: "Between the dots as they pop in" },
    loaderRadius: { type: ControlType.Number, title: "Ring radius", min: 3, max: 14, step: 0.5, defaultValue: 6, unit: "px" },
    loaderColour: { type: ControlType.Color, title: "Dot colour", defaultValue: "#ffffff" },
    loaderPopIn: { type: ControlType.Number, title: "Pop-in duration", min: 80, max: 1500, step: 10, defaultValue: 420, unit: "ms" },
    loaderPopStagger: { type: ControlType.Number, title: "Pop-in stagger", min: 0, max: 250, step: 5, defaultValue: 80, unit: "ms" },
    loaderRise: { type: ControlType.Number, title: "Pop-in rise", min: 0, max: 16, step: 0.5, defaultValue: 6, unit: "px", description: "How far below its place each dot comes in from; 0 = just grows" },
    loaderRollAt: { type: ControlType.Number, title: "Roll starts", min: 100, max: 2500, step: 10, defaultValue: 920, unit: "ms", description: "After the click; give the dots time to pop in" },
    loaderRoll: { type: ControlType.Number, title: "Roll duration", min: 100, max: 1500, step: 10, defaultValue: 540, unit: "ms" },
    loaderRollStagger: { type: ControlType.Number, title: "Roll stagger", min: 0, max: 150, step: 2, defaultValue: 38, unit: "ms" },
    loaderTextAt: { type: ControlType.Number, title: "Text after roll", min: 0, max: 1500, step: 10, defaultValue: 390, unit: "ms", description: "How long after the roll \"Swapping\" comes in" },
    loaderSwapTime: { type: ControlType.Number, title: "Swap duration", min: 500, max: 10000, step: 100, defaultValue: 3600, unit: "ms", description: "How long the ring spins" },
    loaderSpin: { type: ControlType.Number, title: "Spin per turn", min: 0.3, max: 6, step: 0.1, defaultValue: 3, unit: "s" },
    loaderSide: { type: ControlType.Enum, title: "Loader side", options: ["left", "right"], optionTitles: ["Left", "Right"], defaultValue: "left" },
    loaderTextGap: { type: ControlType.Number, title: "Text gap", min: 0, max: 30, step: 0.5, defaultValue: 6, unit: "px", description: "Space between the spinner / circle and the text" },
    loaderPush: { type: ControlType.Number, title: "Text slide-in", min: 0, max: 40, step: 1, defaultValue: 8, unit: "px" },
    loaderTextFade: { type: ControlType.Number, title: "Text fade-in", min: 0, max: 1000, step: 10, defaultValue: 240, unit: "ms" },
    loaderShimmer: { type: ControlType.Boolean, title: "Shimmer", defaultValue: true },
    loaderBadge: { type: ControlType.Number, title: "Circle size", min: 10, max: 32, step: 0.5, defaultValue: 18, unit: "px" },
    loaderOutline: { type: ControlType.Number, title: "Circle line", min: 0.5, max: 4, step: 0.1, defaultValue: 1.6, unit: "px", description: "Line width of the circle and the tick" },
    loaderTick: { type: ControlType.Number, title: "Tick size", min: 0.5, max: 1.3, step: 0.05, defaultValue: 0.9, description: "The tick inside the circle; 1 = as drawn" },
    loaderFilled: { type: ControlType.Boolean, title: "Filled circle", defaultValue: false, description: "Filled green circle with a white tick" },
    loaderSuccessColour: { type: ControlType.Color, title: "Success colour", defaultValue: "#22c55e" },
    loaderSuccessBackground: { type: ControlType.Color, title: "Success background", defaultValue: "rgba(34, 197, 94, 0.25)" },
    loaderMessageFade: { type: ControlType.Number, title: "Message fade-in", min: 0, max: 1000, step: 10, defaultValue: 280, unit: "ms" },
    loaderTxDelay: { type: ControlType.Number, title: "Tx info delay", min: 0, max: 2000, step: 10, defaultValue: 550, unit: "ms", description: "After success" },
    loaderTxDuration: { type: ControlType.Number, title: "Tx info duration", min: 120, max: 1200, step: 10, defaultValue: 520, unit: "ms" },
    loaderSuccessBounce: { type: ControlType.Number, title: "Success bounce", min: 1, max: 1.15, step: 0.005, defaultValue: 1.04, description: "How much the button swells as it turns green; 1 = off" },
    loaderSuccessBounceDuration: { type: ControlType.Number, title: "Success bounce duration", min: 120, max: 1200, step: 10, defaultValue: 400, unit: "ms" },
    loaderNumberPop: { type: ControlType.Number, title: "Number pop", min: 1, max: 1.4, step: 0.01, defaultValue: 1.12, description: "How much the received amount grows; 1 = off" },
    loaderNumberPopDuration: { type: ControlType.Number, title: "Number pop duration", min: 120, max: 1200, step: 10, defaultValue: 400, unit: "ms" },
    loaderNumberPopDelay: { type: ControlType.Number, title: "Number pop delay", min: 0, max: 1500, step: 10, defaultValue: 0, unit: "ms", description: "After success" },
    loaderSteps: { type: ControlType.Boolean, title: "Show steps", defaultValue: true, description: "The swap's steps replace the chips while it runs; the button shows no spinner then" },
    loaderStep1: { type: ControlType.String, title: "Step 1", defaultValue: "Approving {sell}", description: "{sell} and {receive} become the tokens" },
    loaderStep2: { type: ControlType.String, title: "Step 2", defaultValue: "Swapping {sell} for {receive}" },
    loaderStep3: { type: ControlType.String, title: "Step 3", defaultValue: "Confirming on-chain" },
    loaderStepTime: { type: ControlType.Number, title: "Step duration", min: 300, max: 5000, step: 50, defaultValue: 1800, unit: "ms", description: "How long each step spins" },
    loaderStepGap: { type: ControlType.Number, title: "Step gap", min: 0, max: 1000, step: 10, defaultValue: 320, unit: "ms", description: "Between a step finishing and the next one starting" },
    loaderStepAppear: { type: ControlType.Number, title: "Steps stagger", min: 0, max: 400, step: 5, defaultValue: 140, unit: "ms", description: "Between the rows coming in" },
    loaderStepExpand: { type: ControlType.Number, title: "Step expand", min: 100, max: 1000, step: 10, defaultValue: 560, unit: "ms", description: "The waiting dot opening into the spinner" },
    loaderStepSpin: { type: ControlType.Number, title: "Step spin per turn", min: 0.3, max: 4, step: 0.1, defaultValue: 1.4, unit: "s" },
    loaderStepDot: { type: ControlType.Number, title: "Step dot size", min: 1, max: 5, step: 0.1, defaultValue: 2.6, unit: "px" },
    loaderStepWaitDot: { type: ControlType.Number, title: "Step waiting dot", min: 1, max: 10, step: 0.1, defaultValue: 5, unit: "px", description: "The single dot a step shows before it starts" },
    loaderStepRadius: { type: ControlType.Number, title: "Step spinner radius", min: 3, max: 9, step: 0.25, defaultValue: 5.5, unit: "px" },
    loaderStepDoneColour: { type: ControlType.Color, title: "Step done colour", defaultValue: "rgba(37, 37, 37, 0.35)" },
    loaderKeepCheck: { type: ControlType.Boolean, title: "Keep tick", defaultValue: true, description: "Off: the circle and tick leave after a moment" },
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
