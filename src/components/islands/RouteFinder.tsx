// @ts-nocheck
import { useEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"
import { createRollingNumber } from "@kitlangton/rolling-number"

/**
 * RouteFinder — an AI agent comparing bridges for the best ETH → SOL swap route.
 *
 * Port of the route-finder prototype (Desktop/Claude/route-finder). React renders the
 * static skeleton once; the animation engine below then drives that DOM directly
 * (card carousel, reasoning list, shimmer, rolling quote), the same way the prototype
 * does. Every tunable from the prototype's settings panel is a key in DEFAULTS and
 * can be overridden with the `settings` prop.
 *
 * Styles ship as a string in a <style> tag and are scoped under `.route-finder`.
 */

type Settings = typeof DEFAULTS
type Props = { settings?: Partial<Settings>; scale?: number; style?: CSSProperties; className?: string }

const DEFAULTS = {
    "loop": true,
    "count": 6,
    "hold": 1700,
    "move": 950,
    "chatIntro": false,
    "cmdText": "What's the best route to swap 1 ETH to SOL?",
    "showComposer": false,
    "typeIt": true,
    "typeSpeed": 45,
    "replyDelay": 700,
    "replyStagger": 140,
    "chatCard": false,
    "chatPad": 16,
    "chatH": 0,
    "chatGap": 20,
    "bubbleColor": "#f2f2f2",
    "rBubble": 18,
    "asCard": true,
    "divider": false,
    "okColor": "#22b99b",
    "padX": 12,
    "headGap": 24,
    "subSize": 13.5,
    "subTrack": -2,
    "rollDuration": 600,
    "rollBlur": true,
    "shimmer": 2200,
    "band": 34,
    "shimSoft": 1.5,
    "shimmerBase": 0.2,
    "shimmerPeak": 1,
    "waitSweep": true,
    "showSpinner": false,
    "spin": 2000,
    "introStagger": 110,
    "introOffset": 13,
    "introFromBack": true,
    "below": true,
    "depth": 3,
    "peek": 14,
    "inset": 10,
    "optPad": 10,
    "nameSize": 15,
    "metaSize": 12,
    "nameGap": 4,
    "frontColor": "#f7f7f7",
    "backColor": "#fafafa",
    "shadowA": 0.02,
    "showBack": true,
    "blurStep": 0.1,
    "fadeStep": 0.22,
    "scaleStep": 0.05,
    "exitBlur": 2,
    "bounce": true,
    "bounceH": 7,
    "bounceStagger": 85,
    "bounceMs": 760,
    "restack": 150,
    "restackStagger": 80,
    "white": false,
    "metaShimmer": true,
    "metaLoop": false,
    "metaMs": 1200,
    "metaDelay": 300,
    "metaPeak": 1,
    "ringAnim": false,
    "ringOnce": false,
    "ringSpeed": 1500,
    "ringTail": 120,
    "ringW": 0.5,
    "bestRing": false,
    "bestOwn": true,
    "bestColor": "#fafafa",
    "bestA": 0.02,
    "badgeConnect": true,
    "badgeLabel": "Connect wallet",
    "btnColor": "#262626",
    "btnIcon": false,
    "btnSize": 11,
    "btnTrack": -2,
    "btnPy": 6,
    "btnPl": 4,
    "btnPr": 10,
    "btnGap": 3,
    "badgeSoft": false,
    "newestTop": true,
    "rows": 4,
    "logSize": 13,
    "logGap": 50,
    "fadeStart": 35,
    "fadeEnd": 0.1,
    "dot": 5,
    "check": 12,
    "pop": 1.2,
    "popMs": 520,
    "titleCheck": false,
    "rCard": 8,
    "rOpt": 10,
    "rIcon": 5,
    "rBadge": 12,
    "askOn": false,
    "askText2": "Stargate gets you the most SOL: 14.82 for 1 ETH, in about 45 seconds. Can I connect to Stargate to set up the swap?",
    "askDelay": 900,
    "askBg": "#f7f7f7",
    "cardBorder": "#e6e6e6",
    "cardBorderW": 0.5
}

const RN_CSS = ".rn-root {\n  display: inline-block;\n  position: relative;\n  white-space: pre;\n  unicode-bidi: isolate;\n  vertical-align: baseline;\n}\n.rn-root > .rn-measure,\n.rn-root > .rn-visual { display: none; }\n.rn-root[data-rn-measuring] > .rn-measure {\n  display: inline-flex;\n  position: relative;\n  visibility: hidden;\n  white-space: pre;\n  padding: 0;\n  border: 0;\n}\n.rn-token { display: inline-block; padding: 0; border: 0; }\n.rn-root[data-rn-measuring] > .rn-value,\n.rn-react[data-rn-hydrated] > .rn-semantic,\n.rn-solid[data-rn-hydrated] > .rn-semantic {\n  position: absolute;\n  inset: 0;\n  padding: 0;\n  margin: 0;\n  color: transparent;\n  z-index: 1;\n}\n/* A single native text layer is selectable; decorative reels never enter a copy. */\n.rn-value::selection, .rn-semantic::selection {\n  color: HighlightText;\n  background: Highlight;\n}\n.rn-root[data-rn-ready] > .rn-visual {\n  display: block;\n  position: absolute;\n  inset: 0;\n  pointer-events: none;\n  user-select: none;\n}\n.rn-slot {\n  position: absolute;\n  left: 0;\n  overflow: hidden;\n  /* Space for italic overhang without changing the measured advance width. */\n  box-sizing: content-box;\n  padding-inline: 0.15em;\n  margin-inline-start: -0.15em;\n  -webkit-mask-image: var(--rn-mask, linear-gradient(\n    to bottom,\n    transparent,\n    #000 var(--rn-edge-fade, 0.12em),\n    #000 calc(100% - var(--rn-edge-fade, 0.12em)),\n    transparent\n  ));\n  mask-image: var(--rn-mask, linear-gradient(\n    to bottom,\n    transparent,\n    #000 var(--rn-edge-fade, 0.12em),\n    #000 calc(100% - var(--rn-edge-fade, 0.12em)),\n    transparent\n  ));\n  -webkit-mask-repeat: no-repeat;\n  mask-repeat: no-repeat;\n}\n@supports (overflow: clip) {\n  .rn-slot { overflow-x: visible; overflow-y: clip; }\n}\n.rn-slot:not([data-rn-wheel]) {\n  overflow: visible;\n  -webkit-mask-image: none;\n  mask-image: none;\n}\n.rn-enter, .rn-reel, .rn-face { display: block; }\n.rn-reel { position: relative; }\n.rn-ink { display: block; position: absolute; inset: 0; will-change: transform; }\n/* Safari's SVG filter must rasterize the smear's descendants into its input. */\n.rn-smear .rn-ink { will-change: auto; }\n/* Each turning half carries its own perspective transform, not a shared 3D scene. */\n/* The slot acts as the bezel: the card stays vertically framed while it hinges. */\n.rn-slot[data-rn-flap] { -webkit-mask-image: none; mask-image: none; }\n/* Hinged faces must occlude the cards behind them, including with default CSS. */\n:where(.rn-slot[data-rn-flap]) .rn-face { background: var(--rn-flap-background, Canvas); }\n.rn-flap { position: absolute; inset: 0; transform-origin: 50% 50%; backface-visibility: hidden; }\n/* --rn-crease is the visible hinge gap between the two halves. */\n.rn-flap-top { clip-path: inset(0 0 calc(50% + var(--rn-crease, 1px) / 2) 0); }\n.rn-flap-bottom { clip-path: inset(calc(50% + var(--rn-crease, 1px) / 2) 0 0 0); }\n.rn-sharp, .rn-smear { display: block; }\n.rn-smear { position: absolute; inset: 0; pointer-events: none; }\n.rn-blur-defs { position: absolute; width: 0; height: 0; overflow: hidden; }\n.rn-face { text-align: center; white-space: pre; }\n.rn-react, .rn-solid { display: inline-block; position: relative; white-space: pre; unicode-bidi: isolate; }\n.rn-mount { display: inline-block; user-select: none; }\n.rn-mount .rn-value { pointer-events: none; }\n.rn-react:not([data-rn-hydrated]) > .rn-mount,\n.rn-solid:not([data-rn-hydrated]) > .rn-mount { display: none; }\n"

const CSS = "/* ==========================================================================\n   Route Finder \u2014 AI searching for the best ETH \u2192 SOL bridge route\n   ========================================================================== */\n.route-finder {\n  font-family: var(--font);\n  color: var(--ink);\n  -webkit-font-smoothing: antialiased;\n  --font: \"SF Pro\", \"SF Pro Text\", -apple-system, BlinkMacSystemFont, \"Inter\", system-ui, sans-serif;\n  --ink: #191919;\n  --ink-2: #8b8b8b;\n  --ink-3: #bdbdbd;\n  --page: #e4e4e4;\n  --btn: #191919;                        /* connect button = title ink */\n  --btn-track: -0.02em;\n  --name-size: 15px;                     /* bridge name */\n  --meta-size: 11.5px;                   /* bridge subtitle */\n  --name-gap: 2px;                       /* name \u2192 subtitle */\n  --meta-ms: 1200ms;\n  --meta-delay: 300ms;\n  --meta-iter: 1;\n  --btn-size: 12px;\n  --btn-py: 6px;\n  --btn-pl: 8px;\n  --btn-pr: 10px;\n  --btn-gap: 5px;\n  --pop: 1.2;\n  --pop-ms: 520ms;\n  --ring-w: 1.5px;\n  --ring-speed: 2400ms;\n  --ring-tail: 120deg;\n  --best-a: 0.1;\n  --best-shadow: 0 2px 4px rgba(0, 0, 0, calc(var(--best-a) * 0.6)), 0 8px 24px rgba(0, 0, 0, var(--best-a));\n  --ask-bg: #f7f7f7;\n  --bubble: #f2f2f2;\n  --r-bubble: 18px;\n  --r-composer: 23px;\n  --chat-gap: 20px;\n  --composer-fade: 400ms;\n  --composer-bg: #ffffff;\n  --chat-pad: 16px;\n  --chat-h: 640px;\n  --card: #ffffff;\n  --card-border: #f1f1f1;\n  --card-border-w: 0.5px;\n  --tile: #f2f1f2;\n  --ok: #2563eb;                         /* accent: best-route ring, pill, checks */\n  --divider: rgba(25, 25, 25, 0.07);\n\n  /* Tunables (driven by the panel) */\n  --move: 950ms;                         /* stack / list transition length */\n  --ease: cubic-bezier(0.32, 0.72, 0, 1);\n  --shimmer: 2700ms;                     /* one shimmer sweep */\n  --spin: 2000ms;                        /* one spinner turn */\n  --head-gap: 57px;                      /* divider \u2192 front card */\n  --log-rows: 4;\n  --dot: 7px;                            /* reasoning dot size */\n  --check: 14px;                         /* check on the winning reason */\n  --text-x: calc(6.5px + var(--check) / 2 + 6px);   /* reasoning text indent */\n  --log-gap: 40px;                       /* card stack \u2192 reasoning */\n  --log-size: 13px;\n  --fade-start: 35%;                     /* reasoning fade begins here */\n  --fade-end: 0.1;                       /* opacity at the very bottom */\n  --row-h: calc(var(--log-size) * 2.1);\n  --stack-inset: -10px;\n  --r-card: 0px;                         /* corner radii */\n  --r-opt: 0px;\n  --r-icon: 0px;\n  --r-badge: 0px;\n  --shadow-a: 0.08;\n  --card-shadow: 0 1px 2px rgba(0, 0, 0, var(--shadow-a)), 0 3px 8px rgba(0, 0, 0, calc(var(--shadow-a) * 0.6));\n  --bw: 0.22;                            /* shimmer band half-width, \u00d7 text width */\n  --sub-size: 12px;\n  --sub-track: -0.02em;                  /* subtitle letter spacing (-2%) */                      /* subtitle under the title */\n  --pad-x: 17px;                         /* outer card side padding */\n  --opt-pad: 10px;                       /* bridge card side padding */                    /* card side inset; negative = wider than text column */\n}\n\n\n\n\n/* Card ------------------------------------------------------------------- */\n.route-finder .rf {\n  width: 400px;\n  max-width: 100%;\n  padding: 0 var(--pad-x) 7px;\n  background: transparent;       /* standalone: sits straight on the chat/page background */\n  border-radius: var(--r-card);\n}\n\n/* White card mode: hairline inset border. */\n.route-finder .rf.as-card { box-shadow: inset 0 0 0 var(--card-border-w) var(--card-border); }\n\n/* Header block sits above a full-bleed hairline divider. */\n.route-finder .rf__header {\n  margin: 0 calc(var(--pad-x) * -1);\n  padding: 10px var(--pad-x) 9px;\n  border-bottom: 1px solid var(--divider);\n}\n.route-finder .rf.no-divider .rf__header {\n  border-bottom-color: transparent;\n}\n\n.route-finder .rf__head { display: flex; align-items: center; gap: 9px; }\n\n.route-finder .rf__title {\n  position: relative;\n  margin: 0;\n  font-size: 17px;\n  font-weight: 500;\n  letter-spacing: -0.02em;        /* -2% */\n  line-height: 20px;\n}\n\n.route-finder .rf__title-text {\n  display: inline-block;\n  transition: opacity 220ms ease, filter 220ms ease, transform 220ms ease;\n}\n.route-finder .rf__title-text.is-swapping { opacity: 0; filter: blur(3px); transform: translateY(-3px); }\n\n/* Shimmer: a soft light band sweeps across ink-coloured text. */\n/* Seamless shimmer: the gradient is k\u00d7 the text width with the band in the middle, and k is\n   chosen so the band is fully off the text at both ends of the sweep \u2014 no pop on loop.\n   The band itself is a bell-shaped (Gaussian-like) falloff built in JS (--shimmer-grad),\n   so its edges melt into the text instead of ending in a visible ramp. */\n.route-finder .rf.is-searching .rf__title-text {\n  background: var(--shimmer-grad);\n  background-size: calc(var(--k) * 100%) 100%;\n  background-repeat: no-repeat;\n  -webkit-background-clip: text;\n          background-clip: text;\n  color: transparent;\n  animation: rfx-shimmer var(--shimmer) linear infinite;\n}\n@keyframes rfx-shimmer {\n  from { background-position: 100% 0; }\n  to   { background-position: 0% 0; }\n}\n\n/* Spinner \u2192 check */\n.route-finder .rf.no-spinner .rf__status { display: none; }\n.route-finder .rf__status { position: relative; width: 16px; height: 16px; flex: none; }\n.route-finder .rf__spinner, .route-finder .rf__check { position: absolute; inset: 0; }\n.route-finder .rf__spinner {\n  animation: rfx-spin var(--spin) linear infinite;\n  transition: opacity 250ms ease, transform 350ms var(--ease);\n}\n.route-finder .rf__spinner path { fill: var(--ink); }\n.route-finder .rf__spinner { inset: 0; }\n@keyframes rfx-spin { to { rotate: 360deg; } }\n\n.route-finder .rf__check { opacity: 0; transform: scale(0.6); transition: opacity 250ms ease, transform 450ms var(--ease); }\n.route-finder .rf__check circle { fill: var(--ok); }\n.route-finder .rf__check path {\n  fill: none; stroke: #fff; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;\n  stroke-dasharray: 14; stroke-dashoffset: 14;\n  transition: stroke-dashoffset 400ms 150ms var(--ease);\n}\n.route-finder .rf.is-done .rf__spinner { opacity: 0; transform: scale(0.4); }\n.route-finder .rf.is-done.title-check .rf__check { opacity: 1; transform: scale(1); }\n.route-finder .rf.is-done.title-check .rf__check path { stroke-dashoffset: 0; }\n\n.route-finder .rf__sub {\n  margin: 3px 0 0;\n  font-size: var(--sub-size);\n  line-height: 1.3;\n  color: var(--ink-2);\n  letter-spacing: var(--sub-track);\n}\n.route-finder .rf__amount {\n  display: inline-block;\n  min-width: 1ch;\n  font-variant-numeric: tabular-nums;\n  transition: opacity 250ms ease, filter 250ms ease, color 400ms ease;\n}\n.route-finder .rf__amount.is-swapping { opacity: 0; filter: blur(3px); }\n.route-finder .rf__verb { display: inline-block; transition: opacity 220ms ease, filter 220ms ease; }\n.route-finder .rf__verb.is-swapping { opacity: 0; filter: blur(3px); }\n.route-finder .rf.is-done .rf__amount { color: var(--ink); }\n\n/* Bridge stack ------------------------------------------------------------ */\n.route-finder .rf__stack {\n  position: relative;\n  height: 62px;\n  margin: var(--head-gap) var(--stack-inset) 0;\n}\n\n.route-finder .opt {\n  position: absolute;\n  inset: 0;\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 0 var(--opt-pad);\n  border-radius: var(--r-opt);\n  background: var(--tile);\n  transform-origin: 50% 0;\n  box-shadow: var(--card-shadow);\n  will-change: transform, opacity, filter;\n  transition:\n    transform var(--move) var(--ease),\n    opacity var(--move) var(--ease),\n    filter var(--move) var(--ease),\n    background-color var(--move) var(--ease),\n    box-shadow 500ms ease;\n}\n.route-finder .no-anim, .route-finder .no-anim * { transition: none !important; }\n\n.route-finder .opt__icon svg { display: block; fill: currentColor; overflow: visible; }\n.route-finder .opt__icon {\n  display: grid;\n  place-items: center;\n  width: 42px;\n  height: 42px;\n  flex: none;\n  border-radius: var(--r-icon);\n  font-size: 18px;\n  font-weight: 650;\n  letter-spacing: -0.5px;\n}\n.route-finder .opt__body {\n  flex: 1;\n  min-width: 0;\n  transition: opacity calc(var(--move) * 0.6) ease, transform var(--move) var(--ease);\n}\n.route-finder .opt__icon { transition: opacity calc(var(--move) * 0.6) ease; }\n.route-finder .opt__name { font-size: var(--name-size); line-height: 1.25; font-weight: 500; letter-spacing: -0.2px; }\n.route-finder .opt__meta { margin-top: var(--name-gap); font-size: var(--meta-size); line-height: 1.25; color: var(--ink-2); }\n/* One shimmer pass through the winning card's subtitle when the result lands. */\n.route-finder .rf.is-done .opt.is-front .opt__meta.is-shimmering {\n  background: var(--meta-grad);\n  background-size: calc(var(--meta-k) * 100%) 100%;\n  background-repeat: no-repeat;\n  -webkit-background-clip: text;\n          background-clip: text;\n  color: transparent;\n  animation: rfx-shimmer var(--meta-ms) linear var(--meta-delay) var(--meta-iter) both;\n}\n\n/* Back cards either show their own content (dimmed via the card's opacity/blur) or stay blank. */\n.route-finder .rf.show-back .opt:not(.is-front) .opt__icon, .route-finder .rf.show-back .opt:not(.is-front) .opt__body { opacity: var(--content-o, 1); }\n.route-finder .rf:not(.show-back) .opt:not(.is-front) .opt__icon, .route-finder .rf:not(.show-back) .opt:not(.is-front) .opt__body { opacity: 0; }\n.route-finder .rf:not(.show-back) .opt:not(.is-front) .opt__body { transform: translateY(4px); }\n\n/* Connect-wallet button on the winning card. */\n.route-finder .opt__badge {\n  display: inline-flex;\n  align-items: center;\n  gap: var(--btn-gap);\n  padding: var(--btn-py) var(--btn-pr) var(--btn-py) var(--btn-pl);\n  border: 0;\n  border-radius: var(--r-badge);\n  background: var(--btn);\n  color: #fff;\n  font: inherit;\n  font-size: var(--btn-size);\n  font-weight: 600;\n  letter-spacing: var(--btn-track);\n  white-space: nowrap;\n  cursor: pointer;\n  opacity: 0;\n  transform: scale(0.85);\n  pointer-events: none;\n  transition: opacity 300ms ease, transform 450ms var(--ease), background-color 200ms ease;\n}\n.route-finder .opt__badge svg { width: calc(var(--btn-size) * 1.17); height: calc(var(--btn-size) * 1.17); flex: none; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }\n.route-finder .rf:not(.badge-connect) .opt__badge svg { display: none; }\n/* Icon hidden: drop it and balance the padding so the label stays centred. */\n.route-finder .rf.btn-no-icon .opt__badge svg { display: none; }\n.route-finder .rf.btn-no-icon .opt__badge { padding-left: var(--btn-pr); }\n.route-finder .rf:not(.badge-connect) .opt__badge { background: color-mix(in srgb, var(--ok) 12%, transparent); color: var(--ok); }\n.route-finder .rf.badge-connect.badge-soft .opt__badge { background: color-mix(in srgb, var(--btn) 10%, transparent); color: var(--btn); }\n.route-finder .opt__badge:hover { background: color-mix(in srgb, var(--btn) 85%, #fff); }\n.route-finder .rf.badge-connect.badge-soft .opt__badge:hover { background: color-mix(in srgb, var(--btn) 16%, transparent); }\n.route-finder .rf.is-done .opt.is-front .opt__badge:active { transform: scale(0.96); }\n.route-finder .rf.is-done .opt.is-front .opt__badge { opacity: 1; transform: scale(1); transition-delay: 200ms; }\n.route-finder .rf.badge-connect.is-done .opt.is-front .opt__badge { pointer-events: auto; }\n.route-finder .rf:not(.badge-connect) .opt__badge { padding: 4px 8px; font-size: 11px; cursor: default; }\n/* Winning card: lifted on its own colour; the accent ring is optional. */\n.route-finder .rf.is-done .opt.is-front { box-shadow: var(--best-shadow); }\n.route-finder .rf.is-done.best-ring .opt.is-front { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ok) 35%, transparent), var(--best-shadow); }\n\n/* Animated outline: an SVG stroke around the winning card. The rect's path is normalised\n   to length 100, so the line moves at an even speed along every edge and corner.\n   The tail is a stack of dashes sharing one head, fading toward the end. */\n.route-finder .opt__ring {\n  position: absolute; inset: 0; z-index: 1;\n  width: 100%; height: 100%;\n  overflow: visible; pointer-events: none;\n  opacity: 0; transition: opacity 300ms ease;\n}\n.route-finder .rf.is-done.ring-anim .opt.is-front .opt__ring { opacity: 1; }\n.route-finder .opt__ring rect {\n  x: calc(var(--ring-w) / 2); y: calc(var(--ring-w) / 2);\n  width: calc(100% - var(--ring-w)); height: calc(100% - var(--ring-w));\n  rx: max(0px, calc(var(--r-opt) - var(--ring-w) / 2));\n  fill: none; stroke: var(--ok); stroke-width: var(--ring-w);\n}\n.route-finder .opt__ring .once { display: none; stroke-dasharray: 100 100; stroke-dashoffset: 100; }\n.route-finder .rf.ring-once .opt__ring .seg { display: none; }\n.route-finder .rf.ring-once .opt__ring .once { display: inline; }\n.route-finder .rf.is-done.ring-anim .opt.is-front .opt__ring .seg { animation: rf-ring var(--ring-speed) linear infinite; }\n.route-finder .rf.is-done.ring-anim.ring-once .opt.is-front .opt__ring .once { animation: rf-ring-once var(--ring-speed) var(--ease) forwards; }\n@keyframes rf-ring      { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -100; } }\n@keyframes rf-ring-once { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 0; } }\n\n/* Reasoning log ---------------------------------------------------------- */\n/* Window onto the list; the track inside is bottom-anchored and slides with a transform\n   (sub-pixel smooth \u2014 animating row heights made the text snap pixel to pixel). */\n.route-finder .rf__log {\n  position: relative;\n  /* 10px of bleed each side so the check's bounce isn't cut off by the clip/mask edge. */\n  margin: var(--log-gap) -10px 0;\n  height: calc(var(--log-rows) * var(--row-h));   /* fixed height, no layout jump */\n  overflow: hidden;\n  /* Older points fade out toward the bottom. */\n  -webkit-mask-image: linear-gradient(to bottom, #000 var(--fade-start), rgba(0, 0, 0, var(--fade-end)) 100%);\n          mask-image: linear-gradient(to bottom, #000 var(--fade-start), rgba(0, 0, 0, var(--fade-end)) 100%);\n}\n.route-finder .rf__track {\n  position: absolute;\n  left: 10px;\n  right: 10px;\n  bottom: 0;                     /* oldest-on-top: anchored to the bottom, list slides up */\n  margin: 0;\n  padding: 0;\n  list-style: none;\n  will-change: transform;\n  transition: transform var(--move) var(--ease);\n}\n.route-finder .rf__track.is-reversed { top: 0; bottom: auto; }  /* newest-on-top: anchored to the top, list slides down */\n.route-finder .step {\n  height: var(--row-h);\n  transition:\n    transform var(--move) var(--ease),\n    opacity var(--move) var(--ease),\n    filter var(--move) var(--ease);\n}\n.route-finder .step.is-entering { opacity: 0; filter: blur(4px); }\n.route-finder .step.is-leaving { opacity: 0; filter: blur(4px); }\n\n.route-finder .step__inner {\n  position: relative;\n  flex: none;\n  display: flex;\n  align-items: center;\n  height: var(--row-h);\n  padding-left: var(--text-x);   /* clears the final check, keeps all rows aligned */\n  font-size: var(--log-size);\n  letter-spacing: -0.15px;\n  color: var(--ink-3);\n  transition: color 400ms ease;\n}\n.route-finder .step.is-active .step__inner { color: var(--ink); }\n.route-finder .step.is-best .step__inner { color: var(--ink); }\n\n/* Dot + connector.\n   Each row draws its own half-segments (above and below the dot) so nothing\n   crosses the row edge \u2014 the rows clip their overflow for the collapse animation. */\n/* --d = marker size for this row: a dot normally, a check on the winning row.\n   Markers are centred on the connector line at x = 6.5px. */\n.route-finder .step { --d: var(--dot); }\n.route-finder .step.is-best { --d: var(--check); }\n.route-finder .step__dot {\n  position: absolute;\n  left: calc(6.5px - var(--d) / 2);\n  top: 50%;\n  width: var(--d);\n  height: var(--d);\n  margin-top: calc(var(--d) / -2);\n  border-radius: 50%;\n  background: currentColor;\n  transition: background-color 400ms ease, width 300ms ease, height 300ms ease, left 300ms ease, margin-top 300ms ease;\n}\n.route-finder .step.is-best .step__dot { background: none; }\n.route-finder .step__dot svg { display: block; width: 100%; height: 100%; }\n.route-finder .step__dot svg circle { fill: var(--ok); }\n.route-finder .step__dot svg path {\n  fill: none; stroke: #fff; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;\n  stroke-dasharray: 14; stroke-dashoffset: 14;\n  transition: stroke-dashoffset 400ms 150ms var(--ease);\n}\n.route-finder .step.is-best.is-drawn .step__dot svg path { stroke-dashoffset: 0; }\n/* Small bounce as the check lands. */\n.route-finder .step.is-best .step__dot svg { animation: rf-check-pop var(--pop-ms) cubic-bezier(0.34, 1.2, 0.64, 1) both; }\n@keyframes rf-check-pop {\n  0%   { transform: scale(0.4); opacity: 0; }\n  55%  { transform: scale(var(--pop)); opacity: 1; }\n  78%  { transform: scale(calc(1 - (var(--pop) - 1) * 0.35)); }\n  100% { transform: scale(1); }\n}\n.route-finder .step__inner::before, .route-finder .step__inner::after {\n  content: \"\";\n  position: absolute;\n  left: 6px;\n  width: 1px;\n  height: calc(50% - var(--d) / 2 - var(--line-gap, 4px));\n  background: var(--ink-3);\n  opacity: 0.7;\n  transition: opacity 300ms ease;\n}\n.route-finder .step__inner::before { top: 0; }\n/* Oldest visible row: no segment pointing up at a row that's collapsing away. */\n.route-finder .step.is-leaving + .step:not(.is-leaving) .step__inner::before, .route-finder .step.is-leaving .step__inner::before, .route-finder .step.is-leaving .step__inner::after, .route-finder .step:has(+ .step.is-leaving) .step__inner::after { opacity: 0; transition-duration: 120ms; }\n.route-finder .step__inner::after { bottom: 0; }\n.route-finder .step:first-child .step__inner::before, .route-finder .step:last-child  .step__inner::after { display: none; }\n\n.route-finder .step__text {\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  transition: opacity 200ms ease, filter 200ms ease;\n}\n.route-finder .step__text.is-swapping { opacity: 0; filter: blur(3px); }\n/* Settling a row crossfades old \u2192 new text in place, so the line never blanks out mid-slide. */\n.route-finder .step__text.is-overlay {\n  position: absolute;\n  left: var(--text-x);           /* must match .step__inner padding, or the text jumps on swap */\n  right: 0;\n  top: 50%;\n  translate: 0 -50%;\n}\n.route-finder .step__text.is-out, .route-finder .step__text.is-in { opacity: 0; filter: blur(2px); }\n.route-finder .step__text.is-out, .route-finder .step__text.is-overlay { transition: opacity 320ms ease, filter 320ms ease; }\n\n/* Chat context ------------------------------------------------------------ */\n.route-finder .chat { width: 400px; max-width: 100%; display: flex; flex-direction: column; }\n/* Option: one card around the whole conversation (bubble + reply + input). */\n.route-finder .chat.is-card {\n  box-sizing: content-box;\n  padding: var(--chat-pad);\n  background: var(--card);\n  border-radius: var(--r-card);\n}\n.route-finder .chat.is-card .rf { background: transparent !important; }\n.route-finder .chat__thread { display: flex; flex-direction: column; gap: var(--chat-gap); min-height: var(--chat-h); }\n.route-finder .chat__msg--user {\n  align-self: flex-end;\n  max-width: 80%;\n  padding: 9px 14px;\n  background: var(--bubble);\n  border-radius: var(--r-bubble);\n  font-size: 14px;\n  line-height: 1.35;\n  letter-spacing: -0.15px;\n  color: var(--ink);\n}\n.route-finder .chat__msg--user:empty { display: none; }\n.route-finder .chat .rf { width: 100%; }\n.route-finder .chat-step { transition: opacity 450ms var(--ease), transform 450ms var(--ease), filter 450ms var(--ease); }\n.route-finder .chat-step.is-hidden { opacity: 0; transform: translateY(8px); filter: blur(3px); pointer-events: none; }\n.route-finder .chat__composer {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  min-height: 46px;\n  margin-top: 16px;\n  padding: 8px 8px 8px 16px;\n  border: 1px solid rgba(25, 25, 25, 0.1);\n  border-radius: var(--r-composer);\n  background: var(--composer-bg);\n  font-size: 14px;\n  letter-spacing: -0.15px;\n}\n.route-finder .chat__composer[hidden] { display: none; }\n/* After sending, the input fades away but keeps its space, so nothing else moves. */\n.route-finder .chat__composer { transition: opacity var(--composer-fade) ease, filter var(--composer-fade) ease; }\n.route-finder .chat__composer.is-gone { opacity: 0; filter: blur(2px); pointer-events: none; }\n.route-finder .chat__input { position: relative; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; color: var(--ink); }\n.route-finder .chat__input:empty::before { content: attr(data-placeholder); position: absolute; left: 3px; color: var(--ink-3); }  /* caret sits before it */\n.route-finder .chat__input.is-typing::after { content: \"\"; display: inline-block; width: 1px; height: 1.1em; margin-left: 1px; vertical-align: -0.2em; background: var(--ink); animation: rfx-caret 1s steps(1) infinite; }\n@keyframes rfx-caret { 50% { opacity: 0; } }\n.route-finder .chat__send {\n  display: grid; place-items: center;\n  width: 30px; height: 30px; flex: none;\n  border-radius: 50%;\n  background: rgba(25, 25, 25, 0.12);\n  transition: background-color 200ms ease, transform 150ms ease;\n}\n.route-finder .chat__send svg { width: 14px; height: 14px; fill: none; stroke: #fff; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }\n.route-finder .chat__send.is-ready { background: var(--ink); }\n.route-finder .chat__send.is-pressed { transform: scale(0.9); }\n\n/* Agent asks permission to connect ------------------------------------------ */\n.route-finder .ask { display: flex; flex-direction: column; gap: 10px; padding: 0 var(--pad-x); }\n.route-finder .ask__text { margin: 0; font-size: 14px; line-height: 1.45; letter-spacing: -0.15px; color: var(--ink); }\n.route-finder .ask__card {\n  display: flex; align-items: center; gap: 12px;\n  padding: 10px;\n  border-radius: var(--r-opt);\n  background: var(--ask-bg);\n  box-shadow: var(--card-shadow);\n}\n.route-finder .ask__icon { display: grid; place-items: center; width: 42px; height: 42px; flex: none; border-radius: var(--r-icon); }\n.route-finder .ask__icon svg { display: block; fill: currentColor; overflow: visible; }\n.route-finder .ask__body { flex: 1; min-width: 0; }\n.route-finder .ask__title { font-size: 15px; font-weight: 500; letter-spacing: -0.2px; }\n.route-finder .ask__meta { margin-top: 2px; font-size: 11.5px; line-height: 1.35; color: var(--ink-2); }\n.route-finder .ask__link { flex: none; color: var(--ink-2); }\n.route-finder .ask__link svg { display: block; width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; }\n.route-finder .ask__actions { display: flex; gap: 8px; }\n.route-finder .ask__btn {\n  padding: 8px 14px;\n  border: 0; border-radius: var(--r-badge);\n  background: rgba(25, 25, 25, 0.06); color: var(--ink);\n  font: inherit; font-size: 13px; font-weight: 550; letter-spacing: -0.15px;\n  cursor: pointer;\n  transition: background-color 200ms ease, transform 150ms ease, opacity 250ms ease;\n}\n.route-finder .ask__btn:active { transform: scale(0.97); }\n.route-finder .ask__btn--primary { background: var(--ok); color: #fff; }\n.route-finder .ask__btn--primary:hover { background: color-mix(in srgb, var(--ok) 88%, #000); }\n.route-finder .ask__btn:disabled { cursor: default; }\n.route-finder .ask.is-answered .ask__btn:not(.is-chosen) { opacity: 0; pointer-events: none; }\n.route-finder .ask[hidden] { display: none; }\n\n/* Backdrop for posting (X / Instagram): a framed canvas behind the component, same options\n   as the file explorer's. Prototype-only; the portfolio build leaves it out. */\n.route-finder .backdrop { position: relative; display: flex; align-items: center; justify-content: center; max-width: 100%; }\n.route-finder .backdrop.on { aspect-ratio: var(--bk-ar, 4/3); border-radius: var(--bk-r, 24px); overflow: hidden; isolation: isolate; }\n.route-finder .backdrop:not(.on) > .bk-cam { display: contents; }\n.route-finder .backdrop.on > .bk-cam {\n  position: absolute; inset: 0;\n  display: flex; align-items: center; justify-content: center;\n  box-sizing: border-box;\n  padding: var(--bk-pad, 64px);\n  background-color: var(--bk-c, color-mix(in srgb, var(--page), #000 9%));\n  background-position: center; background-repeat: no-repeat; background-size: var(--bk-fit, cover);\n  transform: scale(var(--bk-z, 1)); transform-origin: var(--bk-ox, 50%) var(--bk-oy, 50%);\n}\n.route-finder .backdrop.on > .bk-cam.glide { transition: transform .5s cubic-bezier(.22,1,.36,1), transform-origin .5s cubic-bezier(.22,1,.36,1); }\n\n@media (prefers-reduced-motion: reduce) {\n  .route-finder .rf.is-searching .rf__title-text { animation: none; color: var(--ink); background: none; }\n  .route-finder .rf__spinner { animation-duration: 3s; }\n}\n"

const MARKUP = "<section class=\"chat\" data-rf=\"chat\">\n<div class=\"chat__thread\">\n<div class=\"chat__msg chat__msg--user\" data-rf=\"cmd\"></div>\n<article class=\"rf is-searching\" data-rf=\"rf\" aria-live=\"polite\">\n  <header class=\"rf__header\">\n  <div class=\"rf__head\">\n    <h2 class=\"rf__title\"><span class=\"rf__title-text\" data-rf=\"title\">Finding best route</span></h2>\n    <div class=\"rf__status\" aria-hidden=\"true\">\n      <!-- Your circles.svg: 6 dots on a hexagon. Square viewBox centred on the ring so it spins in place. -->\n      <svg class=\"rf__spinner\" viewBox=\"-0.226 -0.028 3.6 3.6\">\n        <path d=\"M1.57419 2.9541C1.73716 2.95418 1.869 3.08606 1.86911 3.24902C1.86896 3.41195 1.73713 3.54484 1.57419 3.54492C1.41131 3.54476 1.27844 3.4119 1.27829 3.24902C1.2784 3.08611 1.41129 2.95426 1.57419 2.9541ZM2.59763 2.36328C2.67918 2.22219 2.85976 2.1735 3.00095 2.25488C3.14188 2.33646 3.19062 2.51709 3.10935 2.6582C3.02779 2.79945 2.8463 2.84815 2.70505 2.7666C2.56405 2.68504 2.51632 2.50442 2.59763 2.36328ZM0.147431 2.25488C0.288614 2.1735 0.469198 2.22219 0.550751 2.36328C0.632119 2.50437 0.584211 2.68398 0.443329 2.76562C0.30212 2.84715 0.121595 2.79936 0.0400091 2.6582C-0.0413662 2.51714 0.00660874 2.33656 0.147431 2.25488ZM2.70505 0.77832C2.84622 0.696818 3.02772 0.744686 3.10935 0.885742C3.19086 1.02694 3.14206 1.20844 3.00095 1.29004C2.85979 1.37141 2.6792 1.32267 2.59763 1.18164C2.51624 1.04052 2.5641 0.859941 2.70505 0.77832ZM0.0390325 0.886719C0.120574 0.745484 0.302085 0.696809 0.443329 0.77832C0.584447 0.85992 0.632269 1.04045 0.550751 1.18164C0.469239 1.32255 0.289511 1.37114 0.148408 1.29004C0.0073575 1.2086 -0.0420312 1.02788 0.0390325 0.886719ZM1.57419 0C1.73729 0 1.87009 0.132795 1.87009 0.295898C1.86998 0.458909 1.73723 0.59082 1.57419 0.59082C1.41122 0.590742 1.27938 0.458861 1.27927 0.295898C1.27927 0.132844 1.41115 7.85144e-05 1.57419 0Z\"/>\n      </svg>\n      <svg class=\"rf__check\" viewBox=\"0 0 22 22\">\n        <circle cx=\"11\" cy=\"11\" r=\"10\"/>\n        <path d=\"M6.8 11.3l2.8 2.8 5.6-6\"/>\n      </svg>\n    </div>\n  </div>\n  <p class=\"rf__sub\"><span class=\"rf__verb\" data-rf=\"verb\">Swap</span> 1 ETH for <span class=\"rf__amount\" data-rf=\"amount\">14.71</span> SOL</p>\n  </header>\n\n  <div class=\"rf__stack\" data-rf=\"stack\"></div>\n\n  <div class=\"rf__log\"><ol class=\"rf__track\" data-rf=\"log\"></ol></div>\n</article>\n<div class=\"ask\" data-rf=\"ask\">\n  <p class=\"ask__text chat-step is-hidden\" data-rf=\"askText\"></p>\n  <div class=\"ask__card chat-step is-hidden\">\n    <div class=\"ask__icon\" data-rf=\"askIcon\"></div>\n    <div class=\"ask__body\">\n      <div class=\"ask__title\" data-rf=\"askTitle\">Connect to Stargate</div>\n      <div class=\"ask__meta\" data-rf=\"askMeta\">Stargate will see your wallet address and ask you to sign this swap.</div>\n    </div>\n    <span class=\"ask__link\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M10 13.229C10.1416 13.4609 10.3097 13.6804 10.5042 13.8828C11.7117 15.1395 13.5522 15.336 14.9576 14.4722C15.218 14.3121 15.4634 14.1157 15.6872 13.8828L18.9266 10.5114C20.3578 9.02184 20.3578 6.60676 18.9266 5.11718C17.4953 3.6276 15.1748 3.62761 13.7435 5.11718L13.03 5.85978\"/><path d=\"M10.9703 18.14L10.2565 18.8828C8.82526 20.3724 6.50471 20.3724 5.07345 18.8828C3.64218 17.3932 3.64218 14.9782 5.07345 13.4886L8.31287 10.1172C9.74413 8.62761 12.0647 8.6276 13.4959 10.1172C13.6904 10.3195 13.8584 10.539 14 10.7708\"/></svg></span>\n  </div>\n  <div class=\"ask__actions chat-step is-hidden\" data-rf=\"askActions\">\n    <button class=\"ask__btn ask__btn--primary\" type=\"button\" data-rf=\"askAllow\">Allow</button>\n    <button class=\"ask__btn\" type=\"button\" data-rf=\"askDeny\">Not now</button>\n  </div>\n</div>\n</div>\n<div class=\"chat__composer\" data-rf=\"composer\">\n  <span class=\"chat__input\" data-rf=\"composerText\" data-placeholder=\"Ask anything\"></span>\n  <span class=\"chat__send\" data-rf=\"send\" aria-hidden=\"true\"><svg viewBox=\"0 0 16 16\"><path d=\"M8 13V3M3.5 7.5 8 3l4.5 4.5\"/></svg></span>\n</div>\n</section>"

function initRouteFinder(host: HTMLElement, settings: Settings) {
  // Official marks, cleaned to single-colour paths (files in ./logos). Sources: each bridge's brand kit / site.
  const MARKS = {
    across: { vb: "12 12 40 40", svg: `<path fill-rule="evenodd" clip-rule="evenodd" d="M46.3743 14L50 17.6257L37.8834 29.7423C37.2447 28.079 35.921 26.7553 34.2577 26.1166L46.3743 14ZM29.7423 26.1166L17.6257 14L14 17.6257L26.1166 29.7423C26.7553 28.079 28.079 26.7553 29.7423 26.1166ZM26.1166 34.2577L14 46.3743L17.6257 50L29.7423 37.8834C28.079 37.2447 26.7553 35.921 26.1166 34.2577ZM34.2577 37.8834L46.3743 50L50 46.3743L37.8834 34.2577C37.2447 35.921 35.921 37.2447 34.2577 37.8834Z"/>` },
    debridge: { vb: "0 -35 141 141", svg: `<path fill-rule="evenodd" clip-rule="evenodd" d="M122.2 70.5H141c0-.786-.013-1.57-.038-2.35h-14.667l14.513-2.887a69.95 69.95 0 0 0-.535-4.925l-13.759 2.737 13.302-5.51a70.48 70.48 0 0 0-1.149-5.12l-13.018 5.392 12.223-8.167a69.879 69.879 0 0 0-1.857-5.26l-12.369 8.265 11.146-11.145a70.472 70.472 0 0 0-2.671-5.306l-11.61 11.61 9.802-14.67a70.82 70.82 0 0 0-3.589-5.204l-10.428 15.607 7.811-18.857a70.973 70.973 0 0 0-4.591-4.883l-7.968 19.237A51.476 51.476 0 0 1 122.2 70.5Zm-103.4 0c0-1.424.058-2.835.17-4.23H.126C.042 67.67 0 69.08 0 70.5h18.8Zm1.41-12.043-18.452-3.67a69.962 69.962 0 0 1 2.304-7.928l18.714 3.722a51.297 51.297 0 0 0-2.566 7.876Zm6.153-14.893-17.529-7.26a70.544 70.544 0 0 1 4.341-6.851l18.017 7.463a51.863 51.863 0 0 0-4.83 6.648Zm10.165-12.036L20.488 20.81a70.917 70.917 0 0 1 5.952-5.35l16.704 11.162a51.874 51.874 0 0 0-6.616 4.906Zm12.805-8.21L35.375 9.359A70.23 70.23 0 0 1 42.451 5.8l14.731 14.732a51.314 51.314 0 0 0-7.849 2.786Zm13.912-4.013L51.987 2.455A70.102 70.102 0 0 1 59.66.829l12.017 17.985a52.435 52.435 0 0 0-8.433.492Zm13.514-.13L68.823.02a71.853 71.853 0 0 1 7.729.236L85.1 20.89a51.43 51.43 0 0 0-8.341-1.715Zm11.974 2.932L84.617 1.414a69.986 69.986 0 0 1 7.328 1.907l4.461 22.428a51.464 51.464 0 0 0-7.673-3.642Zm9.81 4.952V5.8a70.154 70.154 0 0 1 6.58 3.274v23.032a51.933 51.933 0 0 0-6.58-5.046Zm7.52 5.915 4.127-20.748a70.861 70.861 0 0 1 5.622 4.262l-4.444 22.342a51.958 51.958 0 0 0-5.305-5.856Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M103.4 70.498h18.8c0-.9-.023-1.794-.068-2.683l-9.352-.163 9.226-1.668a51.852 51.852 0 0 0-1-6.586l-10.593 1.916 10.097-3.978a51.199 51.199 0 0 0-2.021-6.108l-11.555 4.552 10.585-6.808a51.547 51.547 0 0 0-2.923-5.478l-12.021 7.732 10.47-10.11a51.964 51.964 0 0 0-3.685-4.718L97.573 47.78l9.553-13.772a51.985 51.985 0 0 0-4.288-3.851l-10.65 15.353 7.648-17.59a51.723 51.723 0 0 0-4.72-2.898L87.574 42.37c9.489 5.772 15.826 16.21 15.826 28.128Zm-65.8 0H18.8c0-.874.022-1.742.064-2.605l18.814.328a33.398 33.398 0 0 0-.078 2.277Zm53.699-47.346a51.305 51.305 0 0 0-4.962-1.883l-4.02 18.515a32.756 32.756 0 0 1 4.86 2.348l4.121-18.98Zm-9.578-3.133a51.494 51.494 0 0 0-4.999-.85l-.33 18.955c1.713.31 3.38.752 4.99 1.316l.34-19.42ZM70.5 18.798c-1.318 0-2.624.05-3.917.146l3.374 18.658a33.204 33.204 0 0 1 4.907.282l-3.45-19.078a52.39 52.39 0 0 0-.914-.008Zm-9.81 20.288L50.28 22.902a51.478 51.478 0 0 0-3.922 1.867L56.59 40.675a32.679 32.679 0 0 1 4.1-1.59Zm-6.9 3.065L40.5 28.388a51.935 51.935 0 0 0-3.24 2.51l13.11 13.575a32.975 32.975 0 0 1 3.42-2.322ZM31.984 36.01a51.951 51.951 0 0 0-2.463 2.963L45 49.709a33.077 33.077 0 0 1 2.621-2.853L31.985 36.009Zm-6.725 9.447a51.576 51.576 0 0 0-1.64 3.216l17.254 7.503a32.859 32.859 0 0 1 1.756-3.166l-17.37-7.553Zm-4.48 10.823a51.32 51.32 0 0 0-.817 3.269l18.376 3.99c.238-1.107.532-2.194.879-3.256L20.78 56.279Zm47.078-18.576a32.86 32.86 0 0 0-4.609.697L56.304 20.77a51.341 51.341 0 0 1 4.466-1.059l7.086 17.99Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="m100.775 70.498 2.624-.091a32.54 32.54 0 0 0-.041-1.566l-15.948.556-.28-.045 15.908-3.746a32.489 32.489 0 0 0-.315-1.776l-15.106 3.557 14.345-6.538c-.201-.654-.421-1.3-.661-1.937l-13.435 6.123 12.272-8.835c-.333-.69-.69-1.367-1.07-2.029l-11.551 8.316 10.017-10.742a33.01 33.01 0 0 0-1.532-2.033l-9.497 10.184 7.613-12.301a33.091 33.091 0 0 0-2.033-1.926l-7.277 11.76L89.866 43.9a32.952 32.952 0 0 0-2.548-1.684L82.44 55.26l2.346-14.404a32.693 32.693 0 0 0-3.044-1.285l-2.278 13.984-.519-14.861a32.717 32.717 0 0 0-3.474-.721l.506 14.497-3.487-14.811a33.44 33.44 0 0 0-3.785-.011l3.413 14.494-6.466-14.188a32.727 32.727 0 0 0-3.927.828l6.329 13.888-9.297-12.914a32.735 32.735 0 0 0-3.846 1.763l9.07 12.6-11.768-10.974a33.046 33.046 0 0 0-3.519 2.717L60.11 56.504 46.447 48.05a33.051 33.051 0 0 0-2.931 3.62l13.137 8.13-14.782-5.526a32.758 32.758 0 0 0-2.085 4.405l14.038 5.249-14.976-2.44a32.734 32.734 0 0 0-1.006 4.996l13.974 2.275-14.194.496c-.015.413-.023.827-.023 1.243h18.8c0-7.787 6.313-14.1 14.1-14.1s14.1 6.313 14.1 14.1h16.176Z"/>` },
    wormhole: { vb: "0 0 255.4235 255.4555", svg: `<path d="m197.9535,174.6565c-7.318,12.735-20.858,20.566-35.532,20.566h-23.731v-80.03l-34.251,59.483c-7.3188,12.734-20.8583,20.565-35.5323,20.565h-23.5661v-118.1051h47.4067v79.8281l45.9427-79.7915v-.0366h47.389v80.1581l49.785-86.5071c2.013-3.513,1.976-7.8676-.201-11.2891C212.7015,23.2333,171.9905-.6805,125.7365.0148,55.203,1.1126-.3641,57.8872.0018,128.4215c.3659,70.222,57.4151,127.034,127.7107,127.034s127.711-57.178,127.711-127.711c0-11.363-1.5-22.377-4.299-32.8796-.842-3.1836-5.087-3.7691-6.734-.9331l-46.455,80.7067.018.018Z"/>` },
    squid: { vb: "0 0 500 500", svg: `<path d="M497.69,215.99c-0.68,6.48-1.85,12.84-3.56,18.97c-9.18,32.79-30.76,68.12-58.35,81.63 c-85.92,42.06-130.58-48.81-125.18-115.05c3.24-39.78,16.14-71.41,6.2-103.76c-3.17-10.32-9.91-19.87-20.95-25.04 c-30.29-14.19-59.93,5.32-73.71,25.99c-14.87,22.29-21.85,50.18-19.96,75.67c1.81,24.56,10.31,40.66,23.13,62.65 c17.13,29.38,35.37,48.46,42.35,71.02c4.5,14.54,7.06,38.01-13.61,39.98c-21.83,2.09-20.73-26.53-21.04-40.89 c-0.93-43.64-28.65-59.36-49.52-109.63c-12.19-29.36-16.94-60.41-9.81-91.06c10.03-43.13,34.47-77.9,78.53-89.93 c35.23-9.62,76.03-1.73,98.33,29.12c26.51,36.68,21.34,79.95,10.56,118.4c-19.95,71.13-2.13,105.04,14.5,113.91 c31.49,16.79,64.53-2.23,79.19-22.39c15.88-21.84,25.35-61.68,23.85-87.18c-0.57-9.74-1.43-18.12-2.74-25.64 C435.73,58.35,349.68,0,250,0C111.93,0,0,111.93,0,250c0,18.24,1.97,36.02,5.68,53.15c-0.38-12.91,0.89-25.69,4.23-37.61 c9.18-32.79,30.76-68.12,58.35-81.63c85.92-42.06,130.58,48.81,125.18,115.05c-3.24,39.78-16.14,71.41-6.2,103.76 c3.17,10.32,9.91,19.87,20.95,25.04c30.29,14.19,59.93-5.32,73.71-25.99c14.87-22.29,21.85-50.18,19.96-75.67 c-1.81-24.56-10.31-40.66-23.12-62.65c-17.13-29.38-35.37-48.46-42.35-71.02c-4.5-14.54-7.06-38.01,13.61-39.98 c21.83-2.09,20.73,26.53,21.04,40.89c0.93,43.64,28.65,59.36,49.52,109.63c12.19,29.36,16.94,60.41,9.81,91.06 c-10.03,43.13-34.47,77.9-78.53,89.93c-35.23,9.62-76.03,1.73-98.33-29.12c-26.51-36.68-21.34-79.95-10.56-118.4 c19.95-71.13,2.13-105.04-14.5-113.91c-31.49-16.78-64.53,2.23-79.19,22.39c-15.88,21.84-25.35,61.68-23.85,87.18 c0.93,15.82,2.63,28.06,5.77,38.86C73.81,447.91,155.82,500,250,500c138.07,0,250-111.93,250-250 C500,238.46,499.2,227.11,497.69,215.99z"/>` },
    lifi: { vb: "0 0 16 16", svg: `<path d="m8 0 3.293 3.293a1 1 0 0 1 0 1.414l-1.96 1.96L8 5.333A3.77 3.77 0 0 1 8 0"/><path fill-rule="evenodd" clip-rule="evenodd" d="m8 16-5.334-5.333a3.77 3.77 0 0 1 0-5.334L7.293 9.96a1 1 0 0 0 1.414 0l4.626-4.627a3.77 3.77 0 0 1 0 5.334z"/>` },
    stargate: { vb: "0 0 31.01 32", svg: `<path d="M18.58,1.73l.83,1.93c1.62,3.79,4.64,6.81,8.43,8.43l1.93.83c.51.22.92.52,1.23.9-.97-6.91-6.42-12.37-13.32-13.32.37.32.68.73.9,1.23Z"/><path d="M1.24,12.93l1.93-.83c3.79-1.62,6.81-4.64,8.44-8.43l.83-1.93c.22-.51.53-.92.9-1.23C6.42,1.46.97,6.92,0,13.82c.32-.37.73-.68,1.23-.9h0Z"/><path d="M29.77,19.07l-1.93.83c-3.79,1.62-6.81,4.64-8.43,8.44l-.83,1.93c-.22.51-.53.92-.9,1.23,6.9-.96,12.35-6.42,13.32-13.32-.32.37-.73.68-1.23.9h0Z"/><path d="M12.43,30.26l-.83-1.93c-1.62-3.79-4.64-6.81-8.44-8.44l-1.93-.83c-.51-.22-.92-.52-1.23-.9.96,6.9,6.42,12.36,13.32,13.32-.37-.32-.68-.73-.9-1.23h.01Z"/><path d="M8.48,14.48l.95-.41c1.87-.8,3.36-2.28,4.16-4.16l.41-.95c.57-1.33,2.46-1.33,3.03,0l.41.95c.8,1.87,2.28,3.36,4.16,4.16l.95.41c1.33.57,1.33,2.46,0,3.03l-.95.41c-1.87.8-3.36,2.28-4.16,4.16l-.41.95c-.57,1.33-2.46,1.33-3.03,0l-.41-.95c-.8-1.87-2.28-3.36-4.16-4.16l-.95-.41c-1.33-.57-1.33-2.46,0-3.03Z"/>` },
  };

  // bg/fg = official brand pairing; whiteBg = tile used when marks are forced white.
  const BRIDGES = [
    { name: "Across", mark: "across", bg: "#6CF9D8", fg: "#2D2E33", whiteBg: "#2D2E33", scale: 0.62, out: 14.71, meta: "~2 min · $2.80 fee", why: "Across — fee eats into the output" },
    { name: "Wormhole", mark: "wormhole", bg: "#000000", fg: "#FFFFFF", whiteBg: "#000000", scale: 0.6, out: 14.52, meta: "~15 min · $1.10 fee", why: "Wormhole — cheap, but slow finality" },
    { name: "LI.FI", mark: "lifi", bg: "#F7C2FF", fg: "#000000", whiteBg: "#1A1A1A", scale: 0.58, out: 14.74, meta: "~2 min · aggregator fee", why: "LI.FI — extra aggregator fee on top" },
    { name: "deBridge", mark: "debridge", bg: "#03111C", fg: "#FBFF3A", whiteBg: "#03111C", scale: 0.8, out: 14.69, meta: "~1 min · 0.6% slippage", why: "deBridge — slippage above 0.5% limit" },
    { name: "Squid", mark: "squid", bg: "#BC8EE4", fg: "#FFFFFF", whiteBg: "#BC8EE4", scale: 0.6, out: 14.66, meta: "~1 min · $2.20 fee", why: "Squid — route quote expired mid-check" },
  ];
  const BEST = { name: "Stargate", mark: "stargate", bg: "#000000", fg: "#FFFFFF", whiteBg: "#000000", scale: 0.6, out: 14.82, meta: "~45 sec · $1.70 fee", why: "Stargate — best output, 14.82 SOL in ~45s" };

  const $ = (id) => host.querySelector(`[data-rf="${id}"]`);
  const rf = $("rf"), stack = $("stack"), log = $("log"), title = $("title"), amount = $("amount"), verb = $("verb");
  const S = { white: false, count: 6, hold: 1700, loop: false, move: 950, peek: 18, depth: 4, blurStep: 0.6, fadeStep: 0.22, scaleStep: 0.05, exitBlur: 2, rows: 4, chatIntro: true, cmdText: "What's the best route to swap 1 ETH to SOL?", showComposer: true, typeIt: true, typeSpeed: 45, replyDelay: 700, fadeComposer: true, composerFadeDelay: 150, metaShimmer: true, metaLoop: false, metaPeak: 1, band: 22, shimBase: 0.2, shimPeak: 1, soft: 1.5, bounce: true, bounceH: 4, bounceStagger: 60, bounceMs: 520, waitSweep: true, ringTail: 120, bestColor: "#ffffff", bestOwn: false, badgeLabel: "Connect wallet", badgeConnect: true, askOn: false, askDelay: 900, askText: "Stargate gets you the most SOL: 14.82 for 1 ETH, in about 45 seconds. Can I connect to Stargate to set up the swap?", replyStagger: 140, rollDuration: 600, rollBlur: true, newestTop: true, introStagger: 110, introOffset: 14, introFromBack: true, below: true, frontColor: "#f2f1f2", backColor: "#cecece", restack: 150, restackStagger: 80 };

  // Subtitle amount rolls digit-by-digit (@kitlangton/rolling-number).
  const rollOptions = () => ({ duration: S.rollDuration, motionBlur: S.rollBlur });
  const roller = createRollingNumber(amount, {
    value: BRIDGES[0].out,
    locales: "en-US",
    format: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
    duration: 600,
    motionBlur: true,
  });

  let route = [], cards = [], current = 0, timers = [], ranks = null;
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  /* --- Stack ------------------------------------------------------------ */
  function place(card, slot) {
    const s = card.style;
    card.classList.toggle("is-front", slot === 0);
    const dir = S.below ? 1 : -1;                     // which side the back cards peek out
    s.transformOrigin = S.below ? "50% 100%" : "50% 0";
    if (slot < 0) {                                   // dismissed: lift away from the stack, blur out
      s.transform = `translateY(${-dir * 18}px) scale(0.96)`;
      s.opacity = 0; s.filter = S.exitBlur ? `blur(${S.exitBlur}px)` : "none"; s.zIndex = 200;
      return;
    }
    const k = Math.min(slot, S.depth);                // beyond depth: parked, invisible
    s.transform = `translateY(${dir * k * S.peek}px) scale(${1 - k * S.scaleStep})`;
    s.zIndex = 100 - k;
    s.backgroundColor = k === 0 ? (ranks && S.bestOwn ? S.bestColor : S.frontColor) : S.backColor;
    // Each step back: a little smaller and softer. Cards stay solid — only their content
    // fades into the card colour; opacity is used just to hide cards past the visible depth.
    const b = k * S.blurStep;
    s.setProperty("--content-o", Math.max(0, 1 - k * S.fadeStep));
    s.opacity = slot >= S.depth ? 0 : 1;
    s.filter = b ? `blur(${b}px)` : "none";
  }

  // While searching the stack is a carousel: slot = distance from the bridge being tried,
  // wrapping round, so checked bridges rejoin the back and the stack never empties.
  // On finish: slot = rank by output, so the best sits in front and the runners-up stack behind it.
  const searchSlot = (i) => (current < 0 ? i + 1 : (i - current + cards.length) % cards.length);
  function layout() {
    cards.forEach((c, i) => place(c, ranks ? ranks[i] : searchSlot(i)));
    // Reserve room for the peeking cards on whichever side they show.
    const extra = Math.max(0, Math.min(S.depth, cards.length || S.depth) - 1) * S.peek;
    stack.style.marginBottom = S.below ? extra + "px" : "0px";
  }

  // Front card drops away, then silently re-enters at the very back of the deck.
  function recycle(card, i) {
    place(card, -1);
    later(() => {
      card.classList.add("no-anim");
      place(card, S.depth);
      card.style.opacity = 0;
      void card.offsetWidth;
      card.classList.remove("no-anim");
      if (!ranks) place(card, searchSlot(i));
    }, S.move);
  }

  function markSvg(b) {
    const m = MARKS[b.mark];
    return `<svg viewBox="${m.vb}" style="width:${b.scale * 100}%;height:${b.scale * 100}%" aria-hidden="true">${m.svg}</svg>`;
  }

  function paintIcon(card, b) {
    const icon = card.querySelector(".opt__icon");
    icon.style.background = S.white ? b.whiteBg : b.bg;
    icon.style.color = S.white ? "#FFFFFF" : b.fg;
  }

  // Tail = stacked dashes that all end at the same head (pattern: gap, dash, rest), so one
  // shared animation moves them together; overlapping translucent layers fade the tail.
  function ringMarkup() {
    const T = Math.max(1, Math.min(99.5, (S.ringTail / 360) * 100));
    const N = 16;
    const dash = (d, op) => `<rect pathLength="100" class="seg" style="stroke-dasharray:0 ${T - d} ${d} ${100 - T};opacity:${op}"/>`;
    let out = "";
    for (let i = N; i >= 1; i--) out += dash((T * i) / N, 0.12);
    out += dash(Math.min(T, 2.5), 1);
    return out + `<rect pathLength="100" class="once"/>`;
  }

  function makeCard(b) {
    const el = document.createElement("div");
    el.className = "opt";
    el.innerHTML = `
      <div class="opt__icon">${markSvg(b)}</div>
      <div class="opt__body"><div class="opt__name">${b.name}</div><div class="opt__meta">${b.meta}</div></div>
      <svg class="opt__ring" aria-hidden="true">${ringMarkup()}</svg>
      <button class="opt__badge" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13.229C10.1416 13.4609 10.3097 13.6804 10.5042 13.8828C11.7117 15.1395 13.5522 15.336 14.9576 14.4722C15.218 14.3121 15.4634 14.1157 15.6872 13.8828L18.9266 10.5114C20.3578 9.02184 20.3578 6.60676 18.9266 5.11718C17.4953 3.6276 15.1748 3.62761 13.7435 5.11718L13.03 5.85978"/><path d="M10.9703 18.14L10.2565 18.8828C8.82526 20.3724 6.50471 20.3724 5.07345 18.8828C3.64218 17.3932 3.64218 14.9782 5.07345 13.4886L8.31287 10.1172C9.74413 8.62761 12.0647 8.6276 13.4959 10.1172C13.6904 10.3195 13.8584 10.539 14 10.7708"/></svg><span class="opt__badge-label">${S.badgeConnect ? S.badgeLabel : "Best"}</span></button>`;
    paintIcon(el, b);
    return el;
  }

  /* --- Log --------------------------------------------------------------- */
  function swapText(el, text, ms = 200) {
    el.classList.add("is-swapping");
    later(() => { el.textContent = text; el.classList.remove("is-swapping"); }, ms);
  }

  function pushStep(text) {
    const li = document.createElement("li");
    li.className = "step is-active is-entering";
    li.innerHTML = `<div class="step__inner"><span class="step__dot"></span><span class="step__text"></span></div>`;
    li.querySelector(".step__text").textContent = text;
    // FLIP: append at full height, offset the track down by one row (plus whatever offset is
    // still in flight), then let it glide back to 0 so everything moves up as one.
    const rowH = parseFloat(getComputedStyle(log.firstElementChild || log).getPropertyValue("height")) || 0;
    const inFlight = new DOMMatrix(getComputedStyle(log).transform).m42 || 0;
    if (S.newestTop) log.prepend(li); else log.appendChild(li);
    const h = li.offsetHeight || rowH;   // layout px: unaffected by backdrop zoom / scaling
    const shift = S.newestTop ? -h : h;
    log.style.transition = "none";
    log.style.transform = `translateY(${inFlight + shift}px)`;
    // The new row cancels the track's slide, so it fades in where it lands instead of
    // sliding in past the clipped edge of the list.
    li.style.transition = "none";
    li.style.transform = `translateY(${-shift}px)`;
    void log.offsetHeight;
    log.style.transition = "";
    log.style.transform = "translateY(0)";
    li.style.transition = "";
    li.style.transform = "translateY(0)";
    requestAnimationFrame(() => requestAnimationFrame(() => li.classList.remove("is-entering")));

    // Keep S.rows visible rows; older ones collapse upward with a blur.
    const live = [...log.children].filter((n) => !n.classList.contains("is-leaving"));
    const extra = Math.max(0, live.length - S.rows);
    (S.newestTop ? live.slice(live.length - extra) : live.slice(0, extra)).forEach((n) => {
      n.classList.add("is-leaving");
      later(() => n.remove(), S.move + 50);
    });
    return li;
  }

  function settleStep(li, text, best = false) {
    li.classList.remove("is-active");
    if (best) {
      li.querySelector(".step__dot").innerHTML = `<svg viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="11"/><path d="M6.8 11.3l2.8 2.8 5.6-6"/></svg>`;
      li.classList.add("is-best");
      requestAnimationFrame(() => requestAnimationFrame(() => li.classList.add("is-drawn")));
    }
    if (text) crossfadeText(li, text);
  }

  function crossfadeText(li, text) {
    const inner = li.querySelector(".step__inner");
    const old = inner.querySelector(".step__text:not(.is-out)");
    const next = document.createElement("span");
    next.className = "step__text is-overlay is-in";
    next.textContent = text;
    inner.appendChild(next);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      old.classList.add("is-out");
      next.classList.remove("is-in");
    }));
    later(() => {
      old.remove();
      next.classList.remove("is-overlay");    // same spot as a normal flex child
    }, 360);
  }

  /* --- Sequence ---------------------------------------------------------- */
  let activeStep = null;

  function visit(i) {
    current = i;
    cards.forEach((c, j) => (i > 0 && j === i - 1 ? recycle(c, j) : place(c, searchSlot(j))));
    const b = route[i];
    roller.update({ value: b.out, animated: true, ...rollOptions() });   // live quote of the bridge being checked
    if (activeStep) settleStep(activeStep, i === 0 ? null : route[i - 1].why);
    activeStep = pushStep(`Trying ${b.name}…`);
    if (i < route.length - 1) later(() => visit(i + 1), S.hold);
    else scheduleFinish();
  }

  // Land the result exactly at the end of a shimmer sweep (band fully off the text), so the
  // text swap is clean — without speeding the band up. Called when the last bridge starts:
  // picks the sweep end closest to the normal hold time (never sooner than half of it).
  function scheduleFinish() {
    const anim = S.waitSweep && title.getAnimations().find((a) => a.animationName === "rfx-shimmer");
    if (!anim) return later(finish, S.hold);
    const dur = anim.effect.getComputedTiming().duration;
    const t = Number(anim.currentTime) || 0;
    let at = dur - (t % dur);                        // next sweep end
    while (at < S.hold * 0.5) at += dur;
    if (Math.abs(at + dur - S.hold) < Math.abs(at - S.hold)) at += dur;
    later(finish, at);
  }

  // Small staggered hop through the visible stack, winner first. Uses the separate
  // `translate` property so it stacks on top of each card's slot transform.
  function bounceStack() {
    const dir = S.below ? 1 : -1;
    cards
      .map((c, i) => ({ c, k: ranks[i] }))
      .filter(({ k }) => k < S.depth)
      .forEach(({ c, k }) => {
        const h = S.bounceH * (1 - k * 0.15);
        c.animate(
          [
            { translate: "0 0" },
            { translate: `0 ${-dir * h}px`, offset: 0.35 },
            { translate: `0 ${dir * h * 0.3}px`, offset: 0.7 },
            { translate: "0 0" },
          ],
          { duration: S.bounceMs, delay: k * S.bounceStagger, easing: "cubic-bezier(0.33, 1, 0.68, 1)" }
        );
      });
  }

  function finish() {
    settleStep(activeStep, BEST.why, true);
    activeStep = null;
    rf.classList.replace("is-searching", "is-done");
    const order = route.map((_, i) => i).sort((a, b) => route[b].out - route[a].out);
    ranks = [];
    order.forEach((ci, k) => (ranks[ci] = k));
    // Dismissed cards slide back in behind the winner, front-most first.
    cards.forEach((c, i) => (c.style.transitionDelay = ranks[i] ? `${S.restack + (ranks[i] - 1) * S.restackStagger}ms` : "0ms"));
    layout();
    if (S.bounce) bounceStack();
    if (S.metaShimmer) {
      const meta = cards[route.length - 1].querySelector(".opt__meta");
      meta.classList.add("is-shimmering");
      if (!S.metaLoop) meta.addEventListener("animationend", () => meta.classList.remove("is-shimmering"), { once: true });
    }
    swapText(title, "Best route found", 220);
    if (S.askOn) askPermission();
    if (S.loop) later(runChat, 4200 + (S.askOn ? S.askDelay + 4000 : 0));
  }

  /* --- Follow-up: the agent asks permission to connect to the winning bridge --- */
  const ask = $("ask"), askParts = [$("askText"), ask.querySelector(".ask__card"), $("askActions")];
  const askAllow = $("askAllow"), askDeny = $("askDeny");
  function resetAsk() {
    askParts.forEach((el) => el.classList.add("is-hidden"));
    ask.classList.remove("is-answered");
    [askAllow, askDeny].forEach((b) => { b.disabled = false; b.classList.remove("is-chosen"); });
    askAllow.textContent = "Allow"; askDeny.textContent = "Not now";
  }
  function askPermission() {
    $("askText").textContent = S.askText;
    const icon = $("askIcon");
    icon.innerHTML = markSvg(BEST);
    icon.style.background = S.white ? BEST.whiteBg : BEST.bg;
    icon.style.color = S.white ? "#FFFFFF" : BEST.fg;
    askParts.forEach((el, k) => later(() => el.classList.remove("is-hidden"), S.askDelay + k * S.replyStagger));
  }
  const answer = (btn, label) => {
    ask.classList.add("is-answered");
    btn.classList.add("is-chosen"); btn.textContent = label;
    [askAllow, askDeny].forEach((b) => (b.disabled = true));
  };
  askAllow.addEventListener("click", () => answer(askAllow, `Connected to ${BEST.name}`));
  askDeny.addEventListener("click", () => answer(askDeny, "Not connected"));

  /* --- Chat intro: the user's command comes first, then the reply (this component) --- */
  const cmd = $("cmd"), composerText = $("composerText"), send = $("send");
  // Reply reveal order: title → subtitle → everything else together.
  const replyParts = [rf.querySelector(".rf__head"), rf.querySelector(".rf__sub"), [stack, rf.querySelector(".rf__log")]];
  cmd.classList.add("chat-step");
  replyParts.flat().forEach((el) => el.classList.add("chat-step"));
  rf.classList.add("chat-step");
  const hideReply = () => { rf.classList.add("is-hidden"); replyParts.flat().forEach((el) => el.classList.add("is-hidden")); };
  const showPart = (part) => [part].flat().forEach((el) => el.classList.remove("is-hidden"));

  function runChat() {
    clearTimers();
    hideReply();
    resetAsk();
    cmd.classList.add("is-hidden");
    // the bubble keeps its space from the start (just invisible), so posting it moves nothing
    cmd.textContent = S.chatIntro ? (S.cmdText || "") : "";
    // Header must already read as "searching" when it fades in ahead of the rest.
    rf.classList.remove("is-done"); rf.classList.add("is-searching");
    title.textContent = "Finding best route";
    roller.update({ value: BRIDGES[0].out, animated: false });
    composerText.textContent = "";
    composerText.classList.remove("is-typing");
    send.classList.remove("is-ready", "is-pressed");
    $("composer").classList.remove("is-gone");
    if (!S.chatIntro) { rf.classList.remove("is-hidden"); replyParts.forEach(showPart); start(); return; }

    const text = S.cmdText || "What's the best route to swap 1 ETH to SOL?";
    const reply = () => {
      later(() => { rf.classList.remove("is-hidden"); showPart(replyParts[0]); }, S.replyDelay);
      later(() => showPart(replyParts[1]), S.replyDelay + S.replyStagger);
      later(() => { start(); showPart(replyParts[2]); }, S.replyDelay + S.replyStagger * 2);
    };
    const post = () => {
      composerText.textContent = "";
      composerText.classList.remove("is-typing");
      send.classList.remove("is-ready", "is-pressed");
      cmd.textContent = text;
      if (S.fadeComposer) later(() => $("composer").classList.add("is-gone"), S.composerFadeDelay);
      void cmd.offsetWidth;
      cmd.classList.remove("is-hidden");
      reply();
    };
    if (!(S.typeIt && S.showComposer)) { later(post, 250); return; }

    // Type into the input, press send, then the message posts.
    composerText.classList.add("is-typing");
    let t = 400;
    [...text].forEach((ch, i) => {
      t += S.typeSpeed * (ch === " " ? 1.6 : 0.7 + Math.random() * 0.6);
      later(() => {
        composerText.textContent = text.slice(0, i + 1);
        send.classList.add("is-ready");
      }, t);
    });
    later(() => send.classList.add("is-pressed"), t + 350);
    later(post, t + 480);
  }

  function start() {
    clearTimers();
    ranks = null;
    // Check runners-up from best to worst: the carousel then ends with the back cards
    // already in rank order, so nothing has to reshuffle when the result lands.
    route = [...BRIDGES.slice(0, S.count - 1).sort((x, y) => y.out - x.out), BEST];
    stack.textContent = ""; log.textContent = ""; log.style.transition = "none"; log.style.transform = "";
    log.classList.toggle("is-reversed", S.newestTop);
    activeStep = null;
    cards = route.map(makeCard);
    stack.classList.add("no-anim");
    cards.forEach((c) => stack.appendChild(c));
    current = 0;
    // Intro: start empty, then deal the visible cards into their slots one by one.
    const dir = S.below ? 1 : -1;
    cards.forEach((c, i) => {
      place(c, i);
      c.style.transform = `translateY(${-dir * S.introOffset}px) ${c.style.transform}`;
      c.style.opacity = 0;
      c.style.filter = "blur(4px)";
    });
    rf.classList.remove("is-done"); rf.classList.add("is-searching");
    title.textContent = "Finding best route"; verb.textContent = "Swap"; roller.update({ value: route[0].out, animated: false });
    void stack.offsetWidth;
    stack.classList.remove("no-anim");
    const shown = cards.map((c, i) => i).filter((i) => i < S.depth);
    if (S.introFromBack) shown.reverse();          // back card first, front card lands last
    shown.forEach((ci, k) => (cards[ci].style.transitionDelay = `${k * S.introStagger}ms`));
    requestAnimationFrame(() => cards.forEach((c, i) => place(c, i)));
    const dealt = (shown.length - 1) * S.introStagger + S.move * 0.6;
    later(() => cards.forEach((c) => (c.style.transitionDelay = "")), dealt + S.move);
    activeStep = pushStep(`Comparing ${route.length} bridges for the best rate`);
    later(() => { cards.forEach((c) => (c.style.transitionDelay = "")); visit(0); }, Math.max(dealt, 600));
  }

  /* --- Settings: every value comes from the props (see DEFAULTS) ------------ */
  const root = host.style;
  function bind(id, apply) {
    if (id in settings) apply(settings[id]);
  }
  bind("count", (v) => { if (S.count !== v) { S.count = v; start(); } });
  bind("white", (v) => { S.white = v; cards.forEach((c, i) => paintIcon(c, route[i])); });
  bind("chatIntro", (v) => (S.chatIntro = v));
  bind("cmdText", (v) => { S.cmdText = v; if (cmd.textContent) cmd.textContent = v; });
  bind("showComposer", (v) => { S.showComposer = v; $("composer").hidden = !v; });
  bind("composerBg", (v) => root.setProperty("--composer-bg", v));
  bind("fadeComposer", (v) => { S.fadeComposer = v; if (!v) $("composer").classList.remove("is-gone"); });
  bind("composerFadeDelay", (v) => (S.composerFadeDelay = v));
  bind("composerFade", (v) => root.setProperty("--composer-fade", v + "ms"));
  bind("typeIt", (v) => (S.typeIt = v));
  bind("typeSpeed", (v) => (S.typeSpeed = v));
  bind("replyDelay", (v) => (S.replyDelay = v));
  bind("replyStagger", (v) => (S.replyStagger = v));
  bind("chatGap", (v) => root.setProperty("--chat-gap", v + "px"));
  bind("bubbleColor", (v) => root.setProperty("--bubble", v));
  bind("rBubble", (v) => root.setProperty("--r-bubble", v + "px"));
  bind("introStagger", (v) => (S.introStagger = v));
  bind("introOffset", (v) => (S.introOffset = v));
  bind("introFromBack", (v) => (S.introFromBack = v));
  bind("hold", (v) => (S.hold = v));
  bind("loop", (v) => { S.loop = v; if (v && rf.classList.contains("is-done")) later(start, 1500); });
  bind("move", (v) => { S.move = v; root.setProperty("--move", v + "ms"); });
  bind("badgeLabel", (v) => { S.badgeLabel = v; if (S.badgeConnect) host.querySelectorAll(".opt__badge-label").forEach((n) => (n.textContent = v)); });
  bind("badgeConnect", (v) => {
    S.badgeConnect = v; rf.classList.toggle("badge-connect", v);
    host.querySelectorAll(".opt__badge-label").forEach((n) => (n.textContent = v ? S.badgeLabel : "Best"));
  });
  bind("askOn", (v) => { S.askOn = v; ask.hidden = !v; });
  bind("askText2", (v) => { S.askText = v; $("askText").textContent = v; });
  bind("askDelay", (v) => (S.askDelay = v));
  bind("askBg", (v) => root.setProperty("--ask-bg", v));
  bind("btnColor", (v) => root.setProperty("--btn", v));
  bind("btnIcon", (v) => rf.classList.toggle("btn-no-icon", !v));
  bind("btnSize", (v) => root.setProperty("--btn-size", v + "px"));
  bind("btnTrack", (v) => root.setProperty("--btn-track", v / 100 + "em"));
  bind("btnPy", (v) => root.setProperty("--btn-py", v + "px"));
  bind("btnPl", (v) => root.setProperty("--btn-pl", v + "px"));
  bind("btnPr", (v) => root.setProperty("--btn-pr", v + "px"));
  bind("btnGap", (v) => root.setProperty("--btn-gap", v + "px"));
  bind("badgeSoft", (v) => rf.classList.toggle("badge-soft", v));
  bind("ringAnim", (v) => rf.classList.toggle("ring-anim", v));
  bind("ringOnce", (v) => rf.classList.toggle("ring-once", v));
  bind("ringSpeed", (v) => root.setProperty("--ring-speed", v + "ms"));
  bind("ringTail", (v) => { S.ringTail = v; host.querySelectorAll(".opt__ring").forEach((r) => (r.innerHTML = ringMarkup())); });
  bind("ringW", (v) => root.setProperty("--ring-w", v + "px"));
  bind("bestOwn", (v) => { S.bestOwn = v; layout(); });
  bind("bestColor", (v) => { S.bestColor = v; layout(); });
  bind("bestA", (v) => root.setProperty("--best-a", v));
  bind("bestRing", (v) => rf.classList.toggle("best-ring", v));
  bind("okColor", (v) => root.setProperty("--ok", v));
  bind("pageColor", (v) => root.setProperty("--page", v));
  bind("asCard", (v) => { rf.style.background = v ? "var(--card)" : "transparent"; rf.classList.toggle("as-card", v); });


  bind("cardBorder", (v) => root.setProperty("--card-border", v));
  bind("cardBorderW", (v) => root.setProperty("--card-border-w", v + "px"));
  bind("chatCard", (v) => $("chat").classList.toggle("is-card", v));
  bind("chatPad", (v) => root.setProperty("--chat-pad", v + "px"));
  bind("chatH", (v) => root.setProperty("--chat-h", v + "px"));
  bind("divider", (v) => rf.classList.toggle("no-divider", !v));
  bind("below", (v) => { S.below = v; layout(); });
  bind("backColor", (v) => { S.backColor = v; layout(); });
  bind("nameSize", (v) => root.setProperty("--name-size", v + "px"));
  bind("metaSize", (v) => root.setProperty("--meta-size", v + "px"));
  bind("nameGap", (v) => root.setProperty("--name-gap", v + "px"));
  bind("frontColor", (v) => { S.frontColor = v; layout(); });
  bind("shadowA", (v) => root.setProperty("--shadow-a", v));
  bind("padX", (v) => root.setProperty("--pad-x", v + "px"));
  bind("optPad", (v) => root.setProperty("--opt-pad", v + "px"));
  bind("inset", (v) => root.setProperty("--stack-inset", v + "px"));
  bind("peek", (v) => { S.peek = v; layout(); });
  bind("depth", (v) => { S.depth = v; layout(); });
  bind("blurStep", (v) => { S.blurStep = v; layout(); });
  bind("fadeStep", (v) => { S.fadeStep = v; layout(); });
  bind("scaleStep", (v) => { S.scaleStep = v; layout(); });
  bind("showBack", (v) => rf.classList.toggle("show-back", v));
  bind("bounce", (v) => (S.bounce = v));
  bind("bounceH", (v) => (S.bounceH = v));
  bind("bounceStagger", (v) => (S.bounceStagger = v));
  bind("bounceMs", (v) => (S.bounceMs = v));
  bind("restack", (v) => (S.restack = v));
  bind("restackStagger", (v) => (S.restackStagger = v));
  bind("exitBlur", (v) => (S.exitBlur = v));
  bind("headGap", (v) => root.setProperty("--head-gap", v + "px"));
  bind("newestTop", (v) => { if (S.newestTop !== v) { S.newestTop = v; start(); } });
  bind("dot", (v) => root.setProperty("--dot", v + "px"));
  bind("check", (v) => root.setProperty("--check", v + "px"));
  bind("pop", (v) => root.setProperty("--pop", v));
  bind("popMs", (v) => root.setProperty("--pop-ms", v + "ms"));
  bind("titleCheck", (v) => rf.classList.toggle("title-check", v));
  bind("fadeStart", (v) => root.setProperty("--fade-start", v + "%"));
  bind("fadeEnd", (v) => root.setProperty("--fade-end", v));
  bind("rCard", (v) => root.setProperty("--r-card", v + "px"));
  bind("rOpt", (v) => root.setProperty("--r-opt", v + "px"));
  bind("rIcon", (v) => root.setProperty("--r-icon", v + "px"));
  bind("rBadge", (v) => root.setProperty("--r-badge", v + "px"));
  bind("logGap", (v) => root.setProperty("--log-gap", v + "px"));
  bind("rows", (v) => { S.rows = v; root.setProperty("--log-rows", v); });
  bind("logSize", (v) => root.setProperty("--log-size", v + "px"));
  bind("shimmer", (v) => root.setProperty("--shimmer", v + "ms"));
  bind("rollDuration", (v) => (S.rollDuration = v));
  bind("rollBlur", (v) => (S.rollBlur = v));
  bind("subTrack", (v) => root.setProperty("--sub-track", v / 100 + "em"));
  bind("subSize", (v) => root.setProperty("--sub-size", v + "px"));
  // Same bell-shaped band for the winning card's subtitle, from its grey up to full ink.
  function buildMetaShimmer() {
    const bw = 0.3, E = bw * (1 + S.soft), k = 2 * (E + 1) + 0.2;
    const lo = 0.52, hi = S.metaPeak;                       // 0.52 ≈ the subtitle grey on light cards
    const a = (f) => lo + (hi - lo) * Math.exp(-4.6 * f * f);
    const stop = (f, side) => `rgba(25, 25, 25, ${a(f).toFixed(3)}) ${(50 + side * (E * f / k) * 100).toFixed(3)}%`;
    const fs = Array.from({ length: 13 }, (_, i) => i / 12);
    const base = `rgba(25, 25, 25, ${lo})`;
    root.setProperty("--meta-k", k);
    root.setProperty("--meta-grad", `linear-gradient(90deg, ${base} 0%, ${[...fs].reverse().map((f) => stop(f, -1)).join(", ")}, ${fs.slice(1).map((f) => stop(f, 1)).join(", ")}, ${base} 100%)`);
  }

  // Bell-shaped shimmer band: core half-width S.band, plus a soft tail S.soft × that wide.
  function buildShimmer() {
    const bw = S.band / 100, E = bw * (1 + S.soft);           // half-extent in text widths
    const k = 2 * (E + 1) + 0.2;
    const a = (f) => S.shimBase + (S.shimPeak - S.shimBase) * Math.exp(-4.6 * f * f);
    const stop = (f, side) => `rgba(25, 25, 25, ${a(f).toFixed(3)}) ${(50 + side * (E * f / k) * 100).toFixed(3)}%`;
    const fs = Array.from({ length: 13 }, (_, i) => i / 12);
    const left = [...fs].reverse().map((f) => stop(f, -1));
    const right = fs.slice(1).map((f) => stop(f, 1));
    const base = `rgba(25, 25, 25, ${S.shimBase})`;
    root.setProperty("--k", k);
    root.setProperty("--shimmer-grad", `linear-gradient(90deg, ${base} 0%, ${left.join(", ")}, ${right.join(", ")}, ${base} 100%)`);
  }
  bind("band", (v) => { S.band = v; buildShimmer(); });
  bind("shimmerBase", (v) => { S.shimBase = v; buildShimmer(); });
  bind("shimmerPeak", (v) => { S.shimPeak = v; buildShimmer(); });
  bind("shimSoft", (v) => { S.soft = v; buildShimmer(); buildMetaShimmer(); });
  bind("metaShimmer", (v) => (S.metaShimmer = v));
  bind("metaLoop", (v) => { S.metaLoop = v; root.setProperty("--meta-iter", v ? "infinite" : 1); });
  bind("metaMs", (v) => root.setProperty("--meta-ms", v + "ms"));
  bind("metaDelay", (v) => root.setProperty("--meta-delay", v + "ms"));
  bind("metaPeak", (v) => { S.metaPeak = v; buildMetaShimmer(); });
  bind("waitSweep", (v) => (S.waitSweep = v));
  bind("showSpinner", (v) => rf.classList.toggle("no-spinner", !v));
  bind("spin", (v) => root.setProperty("--spin", v + "ms"));

  runChat();
  return () => {
    clearTimers();
    try { roller.destroy(); } catch {}
  };
}

// Natural design width; `scale` enlarges everything proportionally from here.
const BASE_WIDTH = 400

export default function RouteFinder({ settings, scale = 1, style, className }: Props) {
    const ref = useRef<HTMLDivElement>(null)
    const [height, setHeight] = useState<number>()
    useEffect(() => {
        if (!ref.current) return
        return initRouteFinder(ref.current, { ...DEFAULTS, ...settings })
        // settings are read once on mount, like the prototype's initial load
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    // A transform doesn't change layout size, so the outer box takes the scaled size.
    useEffect(() => {
        const el = ref.current
        if (!el) return
        const ro = new ResizeObserver(() => setHeight(el.offsetHeight))
        ro.observe(el)
        return () => ro.disconnect()
    }, [])
    return (
        <div className={className} style={{ width: BASE_WIDTH * scale, height: height && height * scale, ...style }}>
            <style>{RN_CSS + CSS}</style>
            <div
                ref={ref}
                className="route-finder"
                style={{ width: BASE_WIDTH, transform: scale === 1 ? undefined : `scale(${scale})`, transformOrigin: "0 0" }}
                dangerouslySetInnerHTML={{ __html: MARKUP }}
            />
        </div>
    )
}
