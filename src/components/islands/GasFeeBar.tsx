import {
    useEffect,
    useId,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react"
import type { CSSProperties } from "react"
import { addPropertyControls, ControlType } from "framer"
import { useLatest, useOnScreen } from "../../lib/on-screen"

/**
 * GasFeeBar — the "Gas" tier picker (Standard / Fast / Rapid).
 *
 * Framer build of the component: one file, no imports beyond React and Framer.
 * The stylesheet ships as a string and is rendered as a <style> tag inside the
 * component, so it is present in the server-rendered HTML — no flash, and no
 * .css import, which Framer code components cannot do.
 *
 * Every animation setting lands on a CSS custom property, so the motion itself
 * lives in the stylesheet below and React only supplies the numbers.
 *
 * Note: Framer's canvas does not run CSS animations. The flame looks still
 * while you design; it runs in Preview and on the published site.
 *
 * @framerSupportedLayoutWidth auto
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 568
 * @framerIntrinsicHeight 74
 */

/* Layout effects warn during Framer's server render; fall back there. */
const useIsoLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect

/* ==========================================================================
   Stylesheet
   All dimensions are the Figma px values multiplied by --gf-scale.
   Set --gf-scale to 1 for the 355 x 46 design size.
   ========================================================================== */
const CSS = `
.gas-fee-bar {
  --gf-scale: 1.6;

  /* Surface + text (dark theme) */
  --gf-surface: #1f1f1f;
  --gf-border: #363636;
  --gf-pill-active: #222222;
  --gf-text: #ffffff;
  --gf-text-muted: rgba(255, 255, 255, 0.6);   /* price line "~15s · $0.64" */
  --gf-badge-border: #484848;
  --gf-badge-text: rgba(255, 255, 255, 0.75);
  --gf-active-weight: 500;             /* active tier label; 500 = SF Pro Medium */

  /* Sliding highlight — one pill behind the tiers that moves to the active one */
  --gf-slide-duration: 250ms;
  --gf-slide-ease: cubic-bezier(0.23, 1, 0.32, 1);

  /* Price flash on tier switch: up to full white, hold while the number
     rolls, then back to muted. */
  --gf-price-flash-duration: 750ms;

  /* Rolling digits */
  --gf-roll-duration: 500ms;
  --gf-roll-ease: cubic-bezier(0.32, 0.72, 0, 1);

  /* SF Pro everywhere. Installed SF Pro is used by name first (as in Figma);
     otherwise the macOS/iOS system font IS SF Pro, reached via -apple-system
     in Safari and BlinkMacSystemFont / system-ui in Chrome. */
  --gf-font: "SF Pro", "SF Pro Text", -apple-system, BlinkMacSystemFont,
    system-ui, sans-serif;

  /* Dot animation */
  --gf-dot-anim: dot-breathe;          /* dot-breathe | dot-trail | dot-blink */
  --gf-dot-duration: 1550ms;           /* one full cycle; each tier sets its own */
  --gf-dot-stagger-ratio: 0.125;       /* step offset, as a fraction of the cycle */
  --gf-dot-ease: cubic-bezier(0.65, 0, 0.35, 1); /* cubic in-out */
  --gf-dot-opacity-min: 0.2;
  --gf-dot-opacity-max: 1;
  --gf-dot-play: running;              /* running | paused */

  /* Intro — dots fade in one by one along the path whenever the icon appears */
  --gf-intro-anim: dot-intro;          /* dot-intro | none */
  --gf-intro-duration: 180ms;          /* fade-in time for one dot */
  --gf-intro-stagger: 35ms;            /* delay between consecutive dots */
  --gf-order-max: 7;                   /* highest --i; set from the pattern in JS */

  /* Press feedback: the pill dips while it is held */
  --gf-press-scale: 0.97;              /* 1 = no dip */
  --gf-press-in: 60ms;                 /* down: near-instant, it answers the finger */
  --gf-press-duration: 160ms;          /* release: eases back */

  /* Flicker — an irregular layer on top of the wave (off by default) */
  --gf-flicker-anim: none;             /* none | dot-flicker */
  --gf-flicker-strength: 0.7;          /* 0 = still, 1 = the tip can go dark */
  --gf-flicker-pace: 1;                /* multiplies the flicker period */
}

/* Scoped to the component: a page-wide reset would reach the rest of the site. */
.gas-fee-bar,
.gas-fee-bar *,
.gas-fee-bar *::before,
.gas-fee-bar *::after {
  box-sizing: border-box;
}

/* Frame 111 ---------------------------------------------------------------- */
.gas-fee-bar {
  width: calc(355px * var(--gf-scale));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(24px * var(--gf-scale));
  /* 6 / 6 / 6 / 11 padding plus the 0.5px inside stroke. The stroke is an inset
     shadow, not a border: browsers snap sub-pixel borders to whole device
     pixels, which would shave the frame below its 46px height.
     The right padding matches top and bottom, so the pills are inset 6.5 on
     every side they face; the left stays 11 because it faces text, not a pill. */
  padding: calc(6.5px * var(--gf-scale)) calc(6.5px * var(--gf-scale))
    calc(6.5px * var(--gf-scale)) calc(11.5px * var(--gf-scale));
  background: var(--gf-surface);
  box-shadow: inset 0 0 0 calc(0.5px * var(--gf-scale)) var(--gf-border);
  /* Concentric with the pills: pill radius 10 + 6.5 inset. */
  border-radius: calc(16.5px * var(--gf-scale));
  overflow: clip;
}

/* Frame 118 */
.gas-fee-bar__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
  flex-shrink: 0;
}

/* Frame 153 */
.gas-fee-bar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1 0 0;
  min-width: 0;
}

/* Label stack (7:42) — "Gas" + badge over the live price ------------------- */
.gas-fee-bar__label-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: calc(8px * var(--gf-scale));
  width: calc(126px * var(--gf-scale));
  flex-shrink: 0;
}

.gas-fee-bar__label {
  margin: 0;
  font-family: var(--gf-font);
  font-weight: 500; /* SF Pro Medium */
  font-size: calc(14px * var(--gf-scale));
  line-height: 1.3;
  letter-spacing: calc(-0.28px * var(--gf-scale));
  color: var(--gf-text);
  white-space: nowrap;
  font-variation-settings: "wdth" 100;
  text-box: trim-both cap alphabetic;
}

/* 7:105 — "Gas" with the network status badge beside it. */
.gas-fee-bar__title {
  display: flex;
  align-items: center;
  gap: calc(5px * var(--gf-scale));
}

/* 7:106 — status badge, 53 x 12 in Figma. Figma stroke is 0.5px inside, so it
   is drawn as an inset shadow (sub-pixel borders get snapped) and the padding
   carries the extra 0.5px: 3 + 0.5 vertical, 4 + 0.5 horizontal. */
.gas-fee-bar__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: calc(12px * var(--gf-scale));
  padding: calc(3.5px * var(--gf-scale)) calc(4.5px * var(--gf-scale));
  border-radius: calc(40px * var(--gf-scale));
  box-shadow: inset 0 0 0 calc(0.5px * var(--gf-scale)) var(--gf-badge-border);
  flex-shrink: 0;
}

/* The text sits in its own block so the cap-height trim applies to it. */
.gas-fee-bar__badge-text {
  display: block;
  font-family: var(--gf-font);
  font-weight: 400;
  font-size: calc(7px * var(--gf-scale));
  line-height: 1.3;
  letter-spacing: calc(-0.14px * var(--gf-scale));
  color: var(--gf-badge-text);
  white-space: nowrap;
  font-variation-settings: "wdth" 100;
  text-box: trim-both cap alphabetic;
}

/* 7:7 — "~15s · $0.64 · 12 gwei". Decision info first, the exact gwei last.
   The numbers roll; units and "·" stay put. */
.gas-fee-bar__price {
  margin: 0;
  font-family: var(--gf-font);
  font-weight: 500; /* SF Pro Medium */
  font-size: calc(10px * var(--gf-scale));
  line-height: 1.3;
  letter-spacing: calc(-0.2px * var(--gf-scale));
  color: var(--gf-text-muted);
  white-space: nowrap;
  font-variation-settings: "wdth" 100;
  text-box: trim-both cap alphabetic;
}

/* Each visible part after the first gets a " · " in front, so hiding gwei or
   the time never leaves a stray separator. */
.gas-fee-bar__part ~ .gas-fee-bar__part::before {
  content: " · ";
}

/* Tier switched: the price line brightens to full white and fades back. */
.gas-fee-bar__price.is-flashing {
  animation: price-flash var(--gf-price-flash-duration) ease-in-out;
}

@keyframes price-flash {
  0% {
    color: var(--gf-text-muted);
  }
  15%,
  55% {
    color: var(--gf-text);
  }
  100% {
    color: var(--gf-text-muted);
  }
}

/* Rolling digits ----------------------------------------------------------
   One column per digit. The column holds only the digits between the old and
   the new value, so it rolls through them in the direction the number moved:
   up when the price rises, down when it falls. Tabular figures keep every
   column the same width, so nothing shifts while a digit is mid-roll. */
.gas-rn {
  font-variant-numeric: tabular-nums;
}

/* The columns are decoration: a screen reader, and anyone copying the line,
   gets this instead — the plain formatted number. */
.gas-rn__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* Selecting the line copies the number above, not the digits parked off-screen
   in the columns. */
.gas-rn__cols {
  user-select: none;
}

/* The hidden "0" gives the column its width and its baseline; the moving part
   is positioned on top of it, so the text around it never moves. */
.gas-rn__digit {
  position: relative;
  display: inline-block;
}

.gas-rn__ghost {
  visibility: hidden;
}

.gas-rn__window {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.gas-rn__strip {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  transform: translateY(calc(var(--rn-o, 0) * -1.3em));
  transition: transform var(--gf-roll-duration) var(--gf-roll-ease);
  will-change: transform;
}

.gas-rn__cell {
  display: block;
  height: 1.3em;
  line-height: 1.3;
}

/* A touch of blur at the fastest part of the roll, so the digits read as
   moving rather than snapping. */
.gas-rn__strip.is-rolling {
  animation: rn-blur var(--gf-roll-duration) linear;
}

@keyframes rn-blur {
  0%,
  100% {
    filter: blur(0);
  }
  50% {
    filter: blur(calc(0.4px * var(--gf-scale)));
  }
}

/* Frame 156 — segment group ---------------------------------------------- */
.gas-fee-segments {
  position: relative;
  display: flex;
  align-items: center;
  gap: calc(4px * var(--gf-scale));
  flex-shrink: 0;
}

/* Sliding highlight. Off by default; the group opts in with data-slide="on",
   and script sets the position and width from the active pill. It sits under
   the labels, so text and dots paint on top of it. */
.gas-fee-segments__indicator {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 0;
  display: none;
  height: calc(33px * var(--gf-scale));
  border-radius: calc(10px * var(--gf-scale));
  background: var(--gf-pill-active);
  box-shadow: inset 0 0 0 calc(0.5px * var(--gf-scale)) var(--gf-badge-border);
  pointer-events: none;
  transition:
    transform var(--gf-slide-duration) var(--gf-slide-ease),
    width var(--gf-slide-duration) var(--gf-slide-ease);
}

.gas-fee-segments[data-slide="on"] .gas-fee-segments__indicator {
  display: block;
}

/* With the slider on, the active pill hands its fill and hairline to it. */
.gas-fee-segments[data-slide="on"] .gas-fee-segment:has(.gas-fee-segment__input:checked) {
  background: transparent;
  box-shadow: none;
}

/* A single segment (Standard / Fast / Rapid). Every pill has the same shape,
   33 tall with radius 10, so hover and selection change colour only: the
   corner and height never jump on click. */
.gas-fee-segment {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(4px * var(--gf-scale));
  height: calc(33px * var(--gf-scale));
  padding: calc(12px * var(--gf-scale));
  border-radius: calc(10px * var(--gf-scale));
  flex-shrink: 0;
  cursor: pointer;
  background: transparent;
  transition:
    background-color 0.15s ease,
    transform var(--gf-press-duration) ease-out;
}

/* Held down: a small dip, like a native control. The whole pill scales, so the
   label and dots go with it. Asymmetric on purpose: it dips almost at once and
   eases back, so a quick tap still registers. */
.gas-fee-segment:active {
  transform: scale(var(--gf-press-scale));
  transition:
    background-color 0.15s ease,
    transform var(--gf-press-in) ease-out;
}

.gas-fee-segment__input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.gas-fee-segment__text {
  font-family: var(--gf-font);
  font-weight: 400;
  font-size: calc(11px * var(--gf-scale));
  line-height: 1.3;
  letter-spacing: calc(-0.22px * var(--gf-scale));
  color: var(--gf-text);
  white-space: nowrap;
  font-variation-settings: "wdth" 100;
  text-box: trim-both cap alphabetic;
}

/* Selected state — 7:9. The 0.5px hairline is an inset shadow rather than a
   border so it adds no size: 7.5px side padding = Figma's 7px + 0.5px stroke,
   which lands the pill on the design's 75.43 x 33. */
.gas-fee-segment:has(.gas-fee-segment__input:checked) {
  padding: calc(12px * var(--gf-scale)) calc(7.5px * var(--gf-scale));
  background: var(--gf-pill-active);
  box-shadow: inset 0 0 0 calc(0.5px * var(--gf-scale)) var(--gf-badge-border);
}

.gas-fee-segment:has(.gas-fee-segment__input:checked) .gas-dots {
  display: block;
}

.gas-fee-segment:has(.gas-fee-segment__input:checked) .gas-fee-segment__text {
  font-weight: var(--gf-active-weight);
}

/* Interaction affordances (not part of the static design) */
.gas-fee-segment:hover:not(:has(.gas-fee-segment__input:checked)) {
  background: rgba(255, 255, 255, 0.06);
}

.gas-fee-segment:has(.gas-fee-segment__input:focus-visible) {
  outline: calc(1.5px * var(--gf-scale)) solid var(--gf-text);
  outline-offset: calc(2px * var(--gf-scale));
}

/* Dot icon — only shown on the selected segment ---------------------------- */
.gas-dots {
  display: none;
  width: calc(9.42871px * var(--gf-scale));
  height: calc(13.25px * var(--gf-scale));
  flex-shrink: 0;
}

/* Each dot carries --i: its step in the wave, assigned by the pattern.
   The delay is negative so every dot is already mid-cycle on the first
   frame — the motion never has to build up from a flat state.
   The step offset scales with the cycle, so a faster tier plays the same
   path, just quicker, instead of wrapping into overlapping sparks. */
.gas-dots__dot {
  opacity: var(--gf-dot-opacity-max);
  animation: var(--gf-dot-anim) var(--gf-dot-duration) var(--gf-dot-ease) infinite both;
  animation-delay: calc(var(--i, 0) * var(--gf-dot-duration) * var(--gf-dot-stagger-ratio) * -1);
  animation-play-state: var(--gf-dot-play);
  will-change: opacity;
}

/* Fade curves ------------------------------------------------------------- */
@keyframes dot-trail {
  0% {
    opacity: var(--gf-dot-opacity-max);
  }
  100% {
    opacity: var(--gf-dot-opacity-min);
  }
}

@keyframes dot-breathe {
  0%,
  100% {
    opacity: var(--gf-dot-opacity-min);
  }
  50% {
    opacity: var(--gf-dot-opacity-max);
  }
}

@keyframes dot-blink {
  0%,
  49.9% {
    opacity: var(--gf-dot-opacity-max);
  }
  50%,
  100% {
    opacity: var(--gf-dot-opacity-min);
  }
}

/* Intro layer ------------------------------------------------------------- */
/* Outermost wrapper per dot. It carries --i, which the path inside inherits
   for the loop, so the intro follows the same path order: the dot that lights
   first in the loop (highest --i) also fades in first.
   It restarts on its own each time the icon goes from display:none to shown,
   i.e. on load and every tier switch. It deliberately ignores the loop's play
   state: a paused intro would hold the dots at 0 and hide the icon.
   Fill "backwards" keeps each dot at 0 while it waits for its turn, then lets
   go at the end so nothing is left pinned to full opacity. */
.gas-dots__intro {
  animation: var(--gf-intro-anim) var(--gf-intro-duration) ease-out backwards;
  animation-delay: calc((var(--gf-order-max) - var(--i, 0)) * var(--gf-intro-stagger));
}

@keyframes dot-intro {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Flicker layer ----------------------------------------------------------- */
/* Each dot sits in a group that runs its own flicker. SVG opacity multiplies
   through nesting, so the steady climbing wave (on the path) and the nervous
   flicker (on the group) combine without fighting over one property.

   Per dot, set in the markup:
     --h  height, 0 at the base row to 1 at the tip
     --f  period factor: irregular per dot, and shorter toward the tip
     --p  phase offset, so no two dots start in step */
.gas-dots__flicker {
  /* Base barely dips, tip swings hard — a flame's core is steady. */
  --gf-flicker-depth: calc(var(--gf-flicker-strength) * (0.15 + 0.85 * var(--h, 0)));
  /* Faster tiers flicker faster, but less than proportionally. */
  --gf-flicker-period: calc((400ms + var(--gf-dot-duration) * 0.3) * var(--gf-flicker-pace));

  animation: var(--gf-flicker-anim) calc(var(--gf-flicker-period) * var(--f, 1)) linear infinite;
  animation-delay: calc(var(--gf-flicker-period) * var(--f, 1) * var(--p, 0) * -1);
  animation-play-state: var(--gf-dot-play);
}

/* Uneven in both timing and depth, so it reads as flicker rather than a pulse. */
@keyframes dot-flicker {
  0%   { opacity: 1; }
  9%   { opacity: calc(1 - var(--gf-flicker-depth) * 0.55); }
  17%  { opacity: calc(1 - var(--gf-flicker-depth) * 0.15); }
  31%  { opacity: calc(1 - var(--gf-flicker-depth) * 0.9); }
  38%  { opacity: calc(1 - var(--gf-flicker-depth) * 0.35); }
  52%  { opacity: 1; }
  61%  { opacity: calc(1 - var(--gf-flicker-depth) * 0.7); }
  73%  { opacity: calc(1 - var(--gf-flicker-depth) * 0.2); }
  84%  { opacity: calc(1 - var(--gf-flicker-depth)); }
  92%  { opacity: calc(1 - var(--gf-flicker-depth) * 0.45); }
  100% { opacity: 1; }
}

/* Follow the OS setting. !important because the component writes these same
   properties inline, and an inline value would otherwise win. */
@media (prefers-reduced-motion: reduce) {
  .gas-fee-bar {
    --gf-dot-play: paused !important;
    --gf-intro-anim: none !important;
    --gf-press-scale: 1 !important;     /* feedback without the movement */
    --gf-roll-duration: 0ms !important; /* the number changes, it just doesn't travel */
  }

  .gas-fee-segments__indicator {
    transition: none;
  }
}
`

/* ==========================================================================
   The flame
   ========================================================================== */

/* The eight dots are the subpaths of the exported Frame 110 icon, unchanged. */
const DOTS = [
    {
        cx: 2.85645,
        cy: 12.25,
        d: "M2.85645 11.25C3.40867 11.25 3.85635 11.6978 3.85645 12.25C3.85645 12.8023 3.40873 13.25 2.85645 13.25C2.30438 13.2497 1.85645 12.8021 1.85645 12.25C1.85654 11.698 2.30443 11.2503 2.85645 11.25Z",
    },
    {
        cx: 6.57129,
        cy: 12.25,
        d: "M6.57129 11.25C7.12344 11.2501 7.5712 11.6978 7.57129 12.25C7.57129 12.8022 7.1235 13.2499 6.57129 13.25C6.019 13.25 5.57129 12.8023 5.57129 12.25C5.57138 11.6978 6.01906 11.25 6.57129 11.25Z",
    },
    {
        cx: 1,
        cy: 8.53613,
        d: "M1 7.53613C1.55221 7.53622 2 7.9839 2 8.53613C1.99991 9.08828 1.55215 9.53604 1 9.53613C0.447771 9.53613 9.0715e-05 9.08834 0 8.53613C0 7.98385 0.447715 7.53613 1 7.53613Z",
    },
    {
        cx: 4.71387,
        cy: 8.53613,
        d: "M4.71387 7.53613C5.26615 7.53613 5.71387 7.98385 5.71387 8.53613C5.71378 9.08834 5.2661 9.53613 4.71387 9.53613C4.16172 9.53604 3.71396 9.08828 3.71387 8.53613C3.71387 7.9839 4.16166 7.53622 4.71387 7.53613Z",
    },
    {
        cx: 8.42871,
        cy: 8.53613,
        d: "M8.42871 7.53613C8.98078 7.53639 9.42871 7.98401 9.42871 8.53613C9.42862 9.08818 8.98072 9.53588 8.42871 9.53613C7.87648 9.53613 7.4288 9.08834 7.42871 8.53613C7.42871 7.98385 7.87643 7.53613 8.42871 7.53613Z",
    },
    {
        cx: 2.71387,
        cy: 4.67871,
        d: "M2.71387 3.67871C3.2661 3.67871 3.71378 4.1265 3.71387 4.67871C3.71387 5.231 3.26615 5.67871 2.71387 5.67871C2.16166 5.67862 1.71387 5.23094 1.71387 4.67871C1.71396 4.12656 2.16172 3.6788 2.71387 3.67871Z",
    },
    {
        cx: 6.42871,
        cy: 4.67871,
        d: "M6.42871 3.67871C6.98072 3.67897 7.42862 4.12666 7.42871 4.67871C7.42871 5.23084 6.98078 5.67846 6.42871 5.67871C5.87643 5.67871 5.42871 5.231 5.42871 4.67871C5.4288 4.1265 5.87648 3.67871 6.42871 3.67871Z",
    },
    {
        cx: 4.57129,
        cy: 1,
        d: "M4.57129 0C5.12339 9.06723e-05 5.57112 0.447918 5.57129 1C5.57129 1.55223 5.1235 1.99991 4.57129 2C4.019 2 3.57129 1.55228 3.57129 1C3.57146 0.447863 4.01911 -4.82729e-08 4.57129 0Z",
    },
]

type Dot = (typeof DOTS)[number]

const xs = DOTS.map((p) => p.cx)
const ys = DOTS.map((p) => p.cy)
const MID = {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
}

/* Flicker, per dot: height (0 base → 1 tip), an irregular period factor that
   shortens toward the tip, and a phase offset. The factors are deliberately
   non-multiples of each other so the pattern never visibly repeats. */
const JITTER = [1.0, 1.27, 0.91, 1.13, 0.84, 1.19, 0.97, 1.07]
const PHASE = [0, 0.37, 0.71, 0.19, 0.53, 0.88, 0.29, 0.62]
const FLICKER = DOTS.map((dot, i) => {
    const h = (Math.max(...ys) - dot.cy) / (Math.max(...ys) - Math.min(...ys))
    return {
        "--h": +h.toFixed(3),
        "--f": +(JITTER[i] * (1 - 0.3 * h)).toFixed(3),
        "--p": PHASE[i],
    } as CSSProperties
})

/* Diagonal sweep directions. The lowest score lights first (see dotOrder),
   so each one scores its starting corner lowest; y grows downwards. */
const DIAGONALS: Record<string, (p: Dot) => number> = {
    "tl-br": (p) => p.cx + p.cy /* top-left → bottom-right */,
    "br-tl": (p) => -(p.cx + p.cy) /* bottom-right → top-left */,
    "tr-bl": (p) => p.cy - p.cx /* top-right → bottom-left */,
    "bl-tr": (p) => p.cx - p.cy /* bottom-left → top-right */,
}

const SCORES: Record<string, (p: Dot) => number> = {
    "wave-up": (p) => -p.cy,
    "wave-down": (p) => p.cy,
    "center-out": (p) => Math.hypot(p.cx - MID.x, p.cy - MID.y),
    "center-in": (p) => -Math.hypot(p.cx - MID.x, p.cy - MID.y),
    shimmer: () => Math.random(),
    pulse: () => 0,
}

/* Patterns score each dot; dots are then ranked and the rank becomes --i.
   --i is inverted on purpose: the delay in the CSS is negative, so a higher
   --i sits further ahead in the cycle and therefore lights EARLIER. */
function dotOrder(
    dots: Dot[],
    {
        pattern = "wave-up",
        step = "dot",
        startSide = "right",
        diagonal = "tl-br",
    }: {
        pattern?: string
        step?: string
        startSide?: string
        diagonal?: string
    } = {}
): number[] {
    if (pattern === "pulse") return dots.map(() => 0)

    const score =
        pattern === "diagonal"
            ? (DIAGONALS[diagonal] ?? DIAGONALS["tl-br"])
            : (SCORES[pattern] ?? SCORES["wave-up"])
    const values = dots.map((p) => score(p))
    const key = (v: number) => +v.toFixed(4)
    const levels = [...new Set(values.map(key))].sort((a, b) => a - b)
    const last = levels.length - 1

    /* Row mode: every dot on a level shares one step, so a whole row lights together. */
    if (step === "row") return values.map((v) => last - levels.indexOf(key(v)))

    /* Dot mode: one dot at a time. Levels are walked in order and each level is
     read in the opposite direction to the one before, so the lit dot traces a
     single continuous path instead of jumping back across the icon. */
    const sequence: number[] = []
    levels.forEach((level, k) => {
        const onLevel = dots
            .map((_, i) => i)
            .filter((i) => key(values[i]) === level)
        const rightFirst = startSide === "right" ? k % 2 === 0 : k % 2 === 1
        onLevel.sort((a, b) =>
            rightFirst ? dots[b].cx - dots[a].cx : dots[a].cx - dots[b].cx
        )
        sequence.push(...onLevel)
    })

    const indices = new Array(dots.length).fill(0)
    const lastPos = sequence.length - 1
    sequence.forEach((dot, position) => {
        indices[dot] = lastPos - position
    })
    return indices
}

function GasDots({ indices }: { indices: number[] }) {
    return (
        <svg
            className="gas-dots"
            viewBox="0 0 9.42871 13.25"
            width="9.42871"
            height="13.25"
            fill="none"
            aria-hidden="true"
        >
            {DOTS.map((dot, i) => (
                <g
                    key={i}
                    className="gas-dots__intro"
                    style={{ "--i": indices[i] } as CSSProperties}
                >
                    <g className="gas-dots__flicker" style={FLICKER[i]}>
                        <path className="gas-dots__dot" fill="#fff" d={dot.d} />
                    </g>
                </g>
            ))}
        </svg>
    )
}

/* ==========================================================================
   Rolling digits
   A column per digit, holding only the digits between the old value and the
   new one, so it rolls through them in the direction the number moved. The
   column is absolutely positioned over a hidden "0", which keeps the width
   and the baseline of ordinary text: the line around it never shifts.
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
    /* Position on an endless 0-9 strip: position 13 and position 3 are both a
     "3", but one is a full turn further on. Keeping a position rather than a
     digit is what lets 9 → 0 roll forwards instead of spinning back. */
    const posRef = useRef(digit)
    const [range, setRange] = useState({ from: digit, to: digit })

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
        strip.classList.remove("is-rolling")
        void strip.offsetHeight /* flush the two lines above */
        if (from === to) return
        strip.style.transition = ""
        strip.style.setProperty("--rn-o", String(to - low))
        if (blur) strip.classList.add("is-rolling")
    }, [range, blur])

    return (
        <span className="gas-rn__digit">
            <span className="gas-rn__ghost" aria-hidden="true">
                0
            </span>
            <span className="gas-rn__window">
                <span
                    ref={stripRef}
                    className="gas-rn__strip"
                    onTransitionEnd={(event) =>
                        event.currentTarget.classList.remove("is-rolling")
                    }
                >
                    {cells.map((cell, i) => (
                        <span key={i} className="gas-rn__cell">
                            {cell}
                        </span>
                    ))}
                </span>
            </span>
        </span>
    )
}

function RollingNumber({
    value,
    format,
    blur = true,
}: {
    value: number
    format?: Intl.NumberFormatOptions
    blur?: boolean
}) {
    const formatKey = JSON.stringify(format ?? null)
    const text = useMemo(
        () => new Intl.NumberFormat("en-US", format).format(value),
        [value, formatKey]
    )

    /* Which way the number moved, so every column rolls the same way. */
    const previous = useRef(value)
    const dir = value >= previous.current ? 1 : -1
    useEffect(() => {
        previous.current = value
    }, [value])

    const chars = [...text]
    return (
        <span className="gas-rn">
            <span className="gas-rn__sr">{text}</span>
            <span className="gas-rn__cols" aria-hidden="true">
                {chars.map((char, i) => {
                    /* Keyed from the right, so gaining a digit does not renumber the
             columns that were already there: "$9.99" → "$10.00" keeps the
             cents in the same two columns. */
                    const key = chars.length - 1 - i
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
   The component
   ========================================================================== */

interface Tier {
    label: string
    gwei: number
    cycle: number
    eta: number
}

interface Animation {
    pattern: string
    diagonal: string
    step: string
    startSide: string
    shape: string
    ease: string
    duration: number
    staggerRatio: number
    opacityMin: number
    opacityMax: number
    playing: boolean
    slide: boolean
    slideDuration: number
    press: boolean
    pressScale: number
    pressIn: number
    pressDuration: number
    intro: boolean
    introDuration: number
    introStagger: number
    flicker: boolean
    flickerStrength: number
    flickerPace: number
}

interface Roll {
    duration: number
    motionBlur: boolean
}

interface Live {
    enabled: boolean
    every: number // ms between ticks
    drift: number // gwei, the furthest a tier may wander from its set price
}

const DEFAULT_TIERS: Tier[] = [
    { label: "Standard", gwei: 12, cycle: 1550, eta: 15 },
    { label: "Fast", gwei: 25, cycle: 700, eta: 10 },
    { label: "Rapid", gwei: 43, cycle: 500, eta: 6 },
]

const DEFAULT_ROLL: Roll = {
    duration: 500, // ms for the price to roll between tiers; 0 disables motion
    motionBlur: true,
}

const DEFAULT_LIVE: Live = {
    enabled: true,
    every: 4000,
    drift: 2,
}

const DEFAULT_ANIMATION: Animation = {
    pattern: "diagonal", // wave-up | wave-down | center-out | center-in | diagonal | shimmer | pulse
    diagonal: "br-tl", // tl-br | br-tl | tr-bl | bl-tr
    step: "dot", // dot (one at a time) | row (a row at a time)
    startSide: "left", // which side each level is read from first
    shape: "dot-breathe", // dot-breathe | dot-trail | dot-blink
    ease: "cubic-bezier(0.65, 0, 0.35, 1)",
    duration: 1550, // ms per dot cycle, for any tier without its own
    staggerRatio: 0.125, // step offset as a fraction of the cycle
    opacityMin: 0.2,
    opacityMax: 1,
    playing: true,
    slide: false, // one highlight slides between tiers instead of each pill lighting up
    slideDuration: 250,
    press: true, // the pill dips while it is held
    pressScale: 0.97, // 1 = no dip
    pressIn: 60, // ms to dip down
    pressDuration: 160, // ms back to full size
    intro: true, // dots fade in one by one along the path when the icon appears
    introDuration: 180,
    introStagger: 35,
    flicker: false, // irregular flame flicker on top of the wave
    flickerStrength: 0.7, // 0 = still, 1 = the tip can go fully dark
    flickerPace: 1, // multiplies the flicker period; < 1 is faster
}

interface Props {
    label?: string
    badge?: string
    tiers?: Tier[]
    selected?: number
    unit?: string
    ethPrice?: number
    gasLimit?: number
    showGwei?: boolean
    showEta?: boolean
    scale?: number
    activeWeight?: number | string
    roll?: Partial<Roll>
    live?: Partial<Live>
    animation?: Partial<Animation>
    onChange?: (index: number) => void
    style?: CSSProperties
}

export default function GasFeeBar(props: Props) {
    const {
        label = "Gas",
        badge = "Network busy",
        tiers = DEFAULT_TIERS,
        selected = 0,
        unit = "gwei",
        ethPrice = 2530, // USD; with 21,000 gas, 12 gwei ≈ $0.64
        gasLimit = 21000, // a plain ETH transfer
        showGwei = false, // end with "12 gwei"; off (default) leaves "~15s · $0.64"
        showEta = true, // "~15s", the tier's estimated confirmation time
        scale = 1.6,
        activeWeight = "500",
        roll,
        live,
        animation,
        onChange,
        style,
    } = props

    const name = useId()
    const [index, setIndex] = useState(selected)
    /* Framer sets the selected tier from the properties panel; follow it. */
    useEffect(() => setIndex(selected), [selected])

    const anim = { ...DEFAULT_ANIMATION, ...animation }
    const rollOptions = { ...DEFAULT_ROLL, ...roll }
    const liveOptions = { ...DEFAULT_LIVE, ...live }
    const list = tiers.length ? tiers : DEFAULT_TIERS
    /* Out-of-range indexes fall back to the first tier, so something is always
     selected — on load that is Standard. */
    const active = index >= 0 && index < list.length ? index : 0
    const selectedTier = list[active]

    /* Live prices ------------------------------------------------------------
     Real gas prices wander between blocks. Each tick nudges every tier one
     step, as a random walk kept within ± the drift of the price set in the
     panel, so the numbers move on their own without drifting away from the
     design. The selected tier's price rolls; the others wander quietly and
     are already somewhere new when you switch to them. */
    const base = list.map((t) => t.gwei)
    const baseKey = base.join(",")
    const [prices, setPrices] = useState(base)
    // the prices only wander while the card is on screen (lib/on-screen.ts)
    const barRef = useRef<HTMLDivElement>(null)
    const onScreen = useLatest(useOnScreen(barRef))

    useEffect(() => {
        const set = baseKey.split(",").map(Number)
        /* Editing a price in the panel, or switching the drift off, puts the
       numbers back on the set values. */
        if (!liveOptions.enabled || !liveOptions.every) {
            setPrices((prev) => (prev.join(",") === baseKey ? prev : set))
            return
        }
        setPrices((prev) => (prev.length === set.length ? prev : set))
        const id = setInterval(() => {
            if (!onScreen.current) return
            setPrices((prev) =>
                set.map((price, i) => {
                    const step = Math.random() < 0.5 ? -1 : 1
                    const next = (prev[i] ?? price) + step
                    const low = Math.max(1, price - liveOptions.drift)
                    const high = price + liveOptions.drift
                    return Math.min(high, Math.max(low, next))
                })
            )
        }, liveOptions.every)
        return () => clearInterval(id)
    }, [baseKey, liveOptions.enabled, liveOptions.every, liveOptions.drift])

    const gwei = prices[active] ?? selectedTier?.gwei
    const current = selectedTier ? { ...selectedTier, gwei } : selectedTier

    /* Transaction cost in dollars: gwei × gas limit × ETH price, to the cent. */
    const usd =
        current?.gwei != null
            ? Math.round(current.gwei * gasLimit * 1e-9 * ethPrice * 100) / 100
            : null

    /* Flash the price line to full white on a tier switch. Comparing with the
     previous tier (not "skip first render") keeps StrictMode double-mounts quiet. */
    const priceRef = useRef<HTMLParagraphElement>(null)
    const previousTier = useRef(current?.label)
    useEffect(() => {
        if (previousTier.current === current?.label) return
        previousTier.current = current?.label
        const line = priceRef.current
        if (!line) return
        line.classList.remove("is-flashing")
        void line.offsetWidth
        line.classList.add("is-flashing")
    }, [current?.label])

    /* shimmer re-rolls whenever the pattern is reselected, hence the dependency
     on the whole ordering triple rather than a memo keyed only by pattern. */
    const indices = useMemo(
        () => dotOrder(DOTS, anim),
        [anim.pattern, anim.step, anim.startSide, anim.diagonal]
    )

    /* Sliding highlight: one element behind the tiers, measured onto the active
     pill (the pills differ in width). The first placement and any resize snap;
     only a tier change slides. */
    const groupRef = useRef<HTMLDivElement>(null)
    const indicatorRef = useRef<HTMLSpanElement>(null)
    const placeIndicator = (animate: boolean) => {
        const group = groupRef.current
        const indicator = indicatorRef.current
        const active = group
            ?.querySelector(".gas-fee-segment__input:checked")
            ?.closest(".gas-fee-segment")
        if (!group || !indicator || !active) return
        const g = group.getBoundingClientRect()
        const b = active.getBoundingClientRect()
        if (!animate) indicator.style.transition = "none"
        indicator.style.width = `${b.width}px`
        indicator.style.transform = `translateX(${b.left - g.left}px)`
        if (!animate) {
            void indicator.getBoundingClientRect()
            indicator.style.transition = ""
        }
    }

    const placedOnce = useRef(false)
    useIsoLayoutEffect(() => {
        placeIndicator(placedOnce.current)
        placedOnce.current = true
    }, [index, anim.slide])

    useEffect(() => {
        const group = groupRef.current
        if (!group || typeof ResizeObserver === "undefined") return
        const observer = new ResizeObserver(() =>
            placeIndicator(placedOnce.current)
        )
        observer.observe(group)
        return () => observer.disconnect()
    }, [])

    const select = (next: number) => {
        setIndex(next)
        onChange?.(next)
    }

    const vars = {
        "--gf-scale": scale,
        "--gf-active-weight": activeWeight,
        "--gf-slide-duration": `${anim.slideDuration}ms`,
        "--gf-roll-duration": `${rollOptions.duration}ms`,
        "--gf-dot-anim": anim.shape,
        "--gf-dot-duration": `${anim.duration}ms`,
        "--gf-dot-stagger-ratio": anim.staggerRatio,
        "--gf-dot-ease": anim.ease,
        "--gf-dot-opacity-min": anim.opacityMin,
        "--gf-dot-opacity-max": anim.opacityMax,
        "--gf-dot-play": anim.playing ? "running" : "paused",
        "--gf-press-scale": anim.press ? anim.pressScale : 1,
        "--gf-press-in": `${anim.pressIn}ms`,
        "--gf-press-duration": `${anim.pressDuration}ms`,
        "--gf-intro-anim": anim.intro ? "dot-intro" : "none",
        "--gf-intro-duration": `${anim.introDuration}ms`,
        "--gf-intro-stagger": `${anim.introStagger}ms`,
        "--gf-order-max": Math.max(...indices),
        "--gf-flicker-anim": anim.flicker ? "dot-flicker" : "none",
        "--gf-flicker-strength": anim.flickerStrength,
        "--gf-flicker-pace": anim.flickerPace,
        ...style,
    } as CSSProperties

    return (
        <div ref={barRef} className="gas-fee-bar" style={vars}>
            {/* Rendered here rather than injected, so the styles are in the HTML
          Framer serves and the bar never paints unstyled. */}
            <style>{CSS}</style>

            <div className="gas-fee-bar__row">
                <div className="gas-fee-bar__inner">
                    <div className="gas-fee-bar__label-wrap">
                        <div className="gas-fee-bar__title">
                            <p className="gas-fee-bar__label">{label}</p>
                            {badge && (
                                <span className="gas-fee-bar__badge">
                                    <span className="gas-fee-bar__badge-text">
                                        {badge}
                                    </span>
                                </span>
                            )}
                        </div>
                        {current?.gwei != null && (
                            <p
                                ref={priceRef}
                                className="gas-fee-bar__price"
                                onAnimationEnd={(event) => {
                                    if (event.target === event.currentTarget)
                                        event.currentTarget.classList.remove(
                                            "is-flashing"
                                        )
                                }}
                            >
                                {/* Separators come from CSS (.gas-fee-bar__part ~ .gas-fee-bar__part::before). */}
                                {showEta && current?.eta != null && (
                                    <span className="gas-fee-bar__part gas-fee-bar__eta">
                                        ~
                                        <RollingNumber
                                            value={current.eta}
                                            blur={rollOptions.motionBlur}
                                        />
                                        s
                                    </span>
                                )}
                                {usd != null && (
                                    <span className="gas-fee-bar__part gas-fee-bar__usd">
                                        <RollingNumber
                                            value={usd}
                                            format={{
                                                style: "currency",
                                                currency: "USD",
                                            }}
                                            blur={rollOptions.motionBlur}
                                        />
                                    </span>
                                )}
                                {showGwei && (
                                    <span className="gas-fee-bar__part gas-fee-bar__gwei">
                                        <RollingNumber
                                            value={current.gwei}
                                            blur={rollOptions.motionBlur}
                                        />{" "}
                                        {unit}
                                    </span>
                                )}
                            </p>
                        )}
                    </div>

                    <div
                        ref={groupRef}
                        className="gas-fee-segments"
                        role="radiogroup"
                        aria-label={label}
                        data-slide={anim.slide ? "on" : "off"}
                    >
                        <span
                            ref={indicatorRef}
                            className="gas-fee-segments__indicator"
                            aria-hidden="true"
                        />
                        {list.map((tier, i) => (
                            <label
                                key={i}
                                className="gas-fee-segment"
                                style={
                                    tier.cycle
                                        ? ({
                                              "--gf-dot-duration": `${tier.cycle}ms`,
                                          } as CSSProperties)
                                        : undefined
                                }
                            >
                                <input
                                    className="gas-fee-segment__input"
                                    type="radio"
                                    name={name}
                                    value={i}
                                    checked={active === i}
                                    onChange={() => select(i)}
                                />
                                <GasDots indices={indices} />
                                <span className="gas-fee-segment__text">
                                    {tier.label}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

GasFeeBar.displayName = "Gas fee bar"

addPropertyControls(GasFeeBar, {
    label: { type: ControlType.String, title: "Label", defaultValue: "Gas" },
    badge: {
        type: ControlType.String,
        title: "Badge",
        defaultValue: "Network busy",
        description: "Leave empty to hide the status pill",
    },
    tiers: {
        type: ControlType.Array,
        title: "Tiers",
        maxCount: 5,
        defaultValue: DEFAULT_TIERS,
        control: {
            type: ControlType.Object,
            controls: {
                label: {
                    type: ControlType.String,
                    title: "Label",
                    defaultValue: "Standard",
                },
                gwei: {
                    type: ControlType.Number,
                    title: "Gwei",
                    min: 1,
                    max: 500,
                    step: 1,
                    defaultValue: 12,
                },
                eta: {
                    type: ControlType.Number,
                    title: "Seconds",
                    min: 1,
                    max: 600,
                    step: 1,
                    defaultValue: 15,
                },
                cycle: {
                    type: ControlType.Number,
                    title: "Flame cycle",
                    min: 200,
                    max: 4000,
                    step: 50,
                    unit: "ms",
                    defaultValue: 1550,
                    description:
                        "How fast the flame runs while this tier is selected",
                },
            },
        },
    },
    selected: {
        type: ControlType.Number,
        title: "Selected",
        min: 0,
        max: 4,
        step: 1,
        displayStepper: true,
        defaultValue: 0,
    },
    scale: {
        type: ControlType.Number,
        title: "Scale",
        min: 0.5,
        max: 3,
        step: 0.05,
        defaultValue: 1.6,
        description: "1 = the 355 × 46 design size",
    },
    activeWeight: {
        type: ControlType.Enum,
        title: "Active weight",
        options: ["400", "500", "600"],
        optionTitles: ["Regular", "Medium", "Semibold"],
        defaultValue: "500",
    },
    showEta: {
        type: ControlType.Boolean,
        title: "Show time",
        defaultValue: true,
    },
    showGwei: {
        type: ControlType.Boolean,
        title: "Show gwei",
        defaultValue: false,
    },
    unit: {
        type: ControlType.String,
        title: "Unit",
        defaultValue: "gwei",
        hidden: (p: any) => !p.showGwei,
    },
    ethPrice: {
        type: ControlType.Number,
        title: "ETH price",
        min: 1,
        max: 100000,
        step: 10,
        defaultValue: 2530,
    },
    gasLimit: {
        type: ControlType.Number,
        title: "Gas limit",
        min: 21000,
        max: 500000,
        step: 1000,
        defaultValue: 21000,
    },
    live: {
        type: ControlType.Object,
        title: "Live prices",
        controls: {
            enabled: {
                type: ControlType.Boolean,
                title: "Drift",
                defaultValue: true,
            },
            every: {
                type: ControlType.Number,
                title: "Every",
                min: 500,
                max: 10000,
                step: 250,
                unit: "ms",
                defaultValue: 4000,
                hidden: (p: any) => !p.enabled,
            },
            drift: {
                type: ControlType.Number,
                title: "Range",
                min: 0,
                max: 10,
                step: 1,
                unit: " gwei",
                defaultValue: 2,
                description: "How far a tier may wander from its set price",
                hidden: (p: any) => !p.enabled,
            },
        },
    },
    roll: {
        type: ControlType.Object,
        title: "Rolling price",
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
            motionBlur: {
                type: ControlType.Boolean,
                title: "Motion blur",
                defaultValue: true,
            },
        },
    },
    animation: {
        type: ControlType.Object,
        title: "Flame",
        controls: {
            playing: {
                type: ControlType.Boolean,
                title: "Playing",
                defaultValue: true,
            },
            shape: {
                type: ControlType.Enum,
                title: "Curve",
                options: ["dot-breathe", "dot-trail", "dot-blink"],
                optionTitles: ["Breathe", "Trail", "Blink"],
                defaultValue: "dot-breathe",
            },
            pattern: {
                type: ControlType.Enum,
                title: "Pattern",
                options: [
                    "diagonal",
                    "wave-up",
                    "wave-down",
                    "center-out",
                    "center-in",
                    "shimmer",
                    "pulse",
                ],
                optionTitles: [
                    "Diagonal",
                    "Wave up",
                    "Wave down",
                    "Centre out",
                    "Centre in",
                    "Shimmer",
                    "Pulse",
                ],
                defaultValue: "diagonal",
            },
            diagonal: {
                type: ControlType.Enum,
                title: "Direction",
                options: ["br-tl", "tl-br", "tr-bl", "bl-tr"],
                optionTitles: [
                    "Bottom-right → top-left",
                    "Top-left → bottom-right",
                    "Top-right → bottom-left",
                    "Bottom-left → top-right",
                ],
                defaultValue: "br-tl",
                hidden: (p: any) => p.pattern !== "diagonal",
            },
            step: {
                type: ControlType.Enum,
                title: "Step",
                options: ["dot", "row"],
                optionTitles: ["Dot by dot", "Row by row"],
                defaultValue: "dot",
            },
            startSide: {
                type: ControlType.Enum,
                title: "Start side",
                options: ["left", "right"],
                optionTitles: ["Left", "Right"],
                defaultValue: "left",
            },
            duration: {
                type: ControlType.Number,
                title: "Cycle",
                min: 200,
                max: 4000,
                step: 50,
                unit: "ms",
                defaultValue: 1550,
                description: "Fallback for tiers without their own cycle",
            },
            staggerRatio: {
                type: ControlType.Number,
                title: "Stagger",
                min: 0,
                max: 0.5,
                step: 0.005,
                defaultValue: 0.125,
            },
            ease: {
                type: ControlType.String,
                title: "Easing",
                defaultValue: "cubic-bezier(0.65, 0, 0.35, 1)",
            },
            opacityMin: {
                type: ControlType.Number,
                title: "Opacity min",
                min: 0,
                max: 1,
                step: 0.05,
                defaultValue: 0.2,
            },
            opacityMax: {
                type: ControlType.Number,
                title: "Opacity max",
                min: 0,
                max: 1,
                step: 0.05,
                defaultValue: 1,
            },
            intro: {
                type: ControlType.Boolean,
                title: "Intro",
                defaultValue: true,
            },
            introDuration: {
                type: ControlType.Number,
                title: "Intro fade",
                min: 0,
                max: 1000,
                step: 10,
                unit: "ms",
                defaultValue: 180,
                hidden: (p: any) => !p.intro,
            },
            introStagger: {
                type: ControlType.Number,
                title: "Intro stagger",
                min: 0,
                max: 200,
                step: 5,
                unit: "ms",
                defaultValue: 35,
                hidden: (p: any) => !p.intro,
            },
            press: {
                type: ControlType.Boolean,
                title: "Press dip",
                defaultValue: true,
            },
            pressScale: {
                type: ControlType.Number,
                title: "Dip depth",
                min: 0.9,
                max: 1,
                step: 0.005,
                defaultValue: 0.97,
                hidden: (p: any) => !p.press,
            },
            pressIn: {
                type: ControlType.Number,
                title: "Dip in",
                min: 0,
                max: 300,
                step: 10,
                unit: "ms",
                defaultValue: 60,
                hidden: (p: any) => !p.press,
            },
            pressDuration: {
                type: ControlType.Number,
                title: "Release",
                min: 0,
                max: 500,
                step: 10,
                unit: "ms",
                defaultValue: 160,
                hidden: (p: any) => !p.press,
            },
            slide: {
                type: ControlType.Boolean,
                title: "Sliding pill",
                defaultValue: false,
            },
            slideDuration: {
                type: ControlType.Number,
                title: "Slide",
                min: 0,
                max: 1000,
                step: 10,
                unit: "ms",
                defaultValue: 250,
                hidden: (p: any) => !p.slide,
            },
            flicker: {
                type: ControlType.Boolean,
                title: "Flicker",
                defaultValue: false,
            },
            flickerStrength: {
                type: ControlType.Number,
                title: "Strength",
                min: 0,
                max: 1,
                step: 0.05,
                defaultValue: 0.7,
                hidden: (p: any) => !p.flicker,
            },
            flickerPace: {
                type: ControlType.Number,
                title: "Pace",
                min: 0.2,
                max: 3,
                step: 0.1,
                defaultValue: 1,
                hidden: (p: any) => !p.flicker,
            },
        },
    },
})
