// Copied from ~/Desktop/Claude/business-card/BusinessCard.tsx (the prototype with the tuning panel).
// Make changes there and copy the file over again, so the two stay identical.

import { useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent } from "react"

// Card is drawn in its original 500×300 SVG units and scaled to `width`.
const W = 500
const H = 300
const COLS = 8
const ROWS = 5
const BLOCK_W = 51.25
const BLOCK_H = 50
const BLOCK_R = 12
const GAP_X = 10
const GAP_Y = 8
const PAD_X = 10
const PAD_Y = 9

// A polygon vertex; `r` is the corner radius it should be rounded with.
type Vtx = { x: number; y: number; r: number }
// One drawable block (or the piece of one left after the road cuts it).
type Piece = { d: string; cx: number; cy: number; px: number; py: number; rand: number }

// Keep the part of a convex polygon where n·p >= k (Sutherland–Hodgman).
// Vertices created by the cut get radius `cutR`.
function clipHalfPlane(poly: Vtx[], nx: number, ny: number, k: number, cutR: number): Vtx[] {
    const out: Vtx[] = []
    for (let i = 0; i < poly.length; i++) {
        const a = poly[i]
        const b = poly[(i + 1) % poly.length]
        const da = a.x * nx + a.y * ny - k
        const db = b.x * nx + b.y * ny - k
        if (da >= 0) out.push(a)
        if (da >= 0 !== db >= 0) {
            const t = da / (da - db)
            out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, r: cutR })
        }
    }
    return out
}

function polygonArea(poly: Vtx[]) {
    let a = 0
    for (let i = 0; i < poly.length; i++) {
        const p = poly[i]
        const q = poly[(i + 1) % poly.length]
        a += p.x * q.y - q.x * p.y
    }
    return a / 2
}

// SVG path for a clockwise convex polygon with each corner rounded by a
// tangent arc. Radii shrink where neighbouring corners would overlap.
function roundedPath(input: Vtx[]): string {
    // Merge (near-)duplicate points first, keeping one of each with the smaller radius: when the road
    // passes through a block corner, the merged point is a sharp road tip, not the old rounded corner.
    // Only then drop points on a straight edge; doing both in one pass could remove both copies of a
    // duplicated corner and cut a chord across the shape.
    const unique: Vtx[] = []
    for (const v of input) {
        const last = unique[unique.length - 1]
        if (last && Math.hypot(v.x - last.x, v.y - last.y) <= 0.05) last.r = Math.min(last.r, v.r)
        else unique.push({ ...v })
    }
    while (unique.length > 1) {
        const first = unique[0]
        const last = unique[unique.length - 1]
        if (Math.hypot(first.x - last.x, first.y - last.y) > 0.05) break
        first.r = Math.min(first.r, last.r)
        unique.pop()
    }
    const poly = unique.filter((v, i, arr) => {
        const p = arr[(i - 1 + arr.length) % arr.length]
        const n = arr[(i + 1) % arr.length]
        return Math.abs((v.x - p.x) * (n.y - v.y) - (v.y - p.y) * (n.x - v.x)) > 0.01
    })
    const n = poly.length
    if (n < 3) return ""
    const corners = poly.map((v, i) => {
        const p = poly[(i - 1 + n) % n]
        const q = poly[(i + 1) % n]
        const lin = Math.hypot(p.x - v.x, p.y - v.y)
        const lout = Math.hypot(q.x - v.x, q.y - v.y)
        const uin = { x: (p.x - v.x) / lin, y: (p.y - v.y) / lin }
        const uout = { x: (q.x - v.x) / lout, y: (q.y - v.y) / lout }
        const theta = Math.acos(clamp(uin.x * uout.x + uin.y * uout.y, -1, 1))
        const tanHalf = Math.tan(theta / 2)
        return { v, uin, uout, lout, tanHalf, t: v.r / tanHalf }
    })
    // Two corners sharing an edge may use at most that edge's length together.
    for (let i = 0; i < n; i++) {
        const a = corners[i]
        const b = corners[(i + 1) % n]
        const sum = a.t + b.t
        if (sum > a.lout) {
            const f = a.lout / sum
            a.t *= f
            b.t *= f
        }
    }
    const f = (x: number) => +x.toFixed(2)
    let d = ""
    corners.forEach((c, i) => {
        const r = c.t * c.tanHalf
        const sx = c.v.x + c.uin.x * c.t
        const sy = c.v.y + c.uin.y * c.t
        const ex = c.v.x + c.uout.x * c.t
        const ey = c.v.y + c.uout.y * c.t
        d += `${i === 0 ? "M" : "L"}${f(sx)} ${f(sy)}A${f(r)} ${f(r)} 0 0 1 ${f(ex)} ${f(ey)}`
    })
    return d + "Z"
}

// Eixample grid: 8 × 5 blocks, with the Diagonal cut through them.
interface PieceOptions {
    blockShape: "rounded" | "chamfered"
    chamferSize: number
    chamferRadius: number
    roadWidth: number
    roadAngle: number
    roadOffset: number
    cutRadius: number
    minPieceArea: number
}

// One block's outline, clockwise: a rounded square, or an Eixample octagon with chamfered corners.
function blockOutline(x: number, y: number, o: PieceOptions): Vtx[] {
    if (o.blockShape === "rounded") {
        return [
            { x, y, r: BLOCK_R },
            { x: x + BLOCK_W, y, r: BLOCK_R },
            { x: x + BLOCK_W, y: y + BLOCK_H, r: BLOCK_R },
            { x, y: y + BLOCK_H, r: BLOCK_R },
        ]
    }
    const c = clamp(o.chamferSize, 0, Math.min(BLOCK_W, BLOCK_H) / 2)
    const r = o.chamferRadius
    return [
        { x: x + c, y, r },
        { x: x + BLOCK_W - c, y, r },
        { x: x + BLOCK_W, y: y + c, r },
        { x: x + BLOCK_W, y: y + BLOCK_H - c, r },
        { x: x + BLOCK_W - c, y: y + BLOCK_H, r },
        { x: x + c, y: y + BLOCK_H, r },
        { x, y: y + BLOCK_H - c, r },
        { x, y: y + c, r },
    ]
}

function buildPieces(o: PieceOptions): Piece[] {
    const { roadWidth, roadAngle, roadOffset, cutRadius, minPieceArea } = o
    // Road runs from top-right to bottom-left; (nx, ny) is its normal.
    const a = (roadAngle * Math.PI) / 180
    const nx = Math.sin(a)
    const ny = Math.cos(a)
    const k = (W / 2) * nx + (H / 2) * ny + roadOffset
    const half = roadWidth / 2
    const pieces: Piece[] = []
    for (let i = 0; i < COLS * ROWS; i++) {
        const x = PAD_X + (i % COLS) * (BLOCK_W + GAP_X)
        const y = PAD_Y + Math.floor(i / COLS) * (BLOCK_H + GAP_Y)
        const rect = blockOutline(x, y, o)
        const parts =
            roadWidth > 0
                ? [clipHalfPlane(rect, -nx, -ny, -(k - half), cutRadius), clipHalfPlane(rect, nx, ny, k + half, cutRadius)]
                : [rect]
        parts.forEach((poly, part) => {
            const area = polygonArea(poly)
            if (poly.length < 3 || area < minPieceArea) return
            // Small fragments get proportionally crisper corners, so they read as little cut-off
            // pieces instead of rounding into blobs; full blocks keep their full radius.
            const k = clamp(Math.sqrt(area / (BLOCK_W * BLOCK_H)) * 1.5, 0.15, 1)
            const d = roundedPath(k < 1 ? poly.map((v) => ({ ...v, r: v.r * k })) : poly)
            if (!d) return
            const cx = poly.reduce((s, v) => s + v.x, 0) / poly.length
            const cy = poly.reduce((s, v) => s + v.y, 0) / poly.length
            // Stable 0…1 per piece, for depth variation.
            const seed = i * 2 + part
            const rand = ((Math.sin(seed * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1
            // Position from card centre, -1…1 on both axes.
            pieces.push({ d, cx, cy, px: (cx / W) * 2 - 1, py: (cy / H) * 2 - 1, rand })
        })
    }
    return pieces
}

// Down arrow (from "down arrow.svg", 15 × 19).
const ARROW_DOWN =
    "M6.36403 1C6.36403 0.447715 6.81175 0 7.36403 0C7.91632 0 8.36403 0.447715 8.36403 1V15.5859L13.0213 10.9287C13.4118 10.5385 14.0449 10.5383 14.4353 10.9287C14.8257 11.3191 14.8256 11.9522 14.4353 12.3428L8.07106 18.707C7.68054 19.0976 7.04753 19.0976 6.657 18.707L0.292745 12.3428C-0.0974828 11.9522 -0.0976805 11.3191 0.292745 10.9287C0.68317 10.5383 1.31626 10.5385 1.70681 10.9287L6.36403 15.5859V1Z"

// The signature (Pieter, underlined), one path per pen stroke in the order it's written: the
// word, then the i's dot and the t's bar, then the underline.
const SIGNATURE = {
    w: 106,
    h: 41,
    dot: 8, // the i's dot, drawn as a filled circle (signatureDotSize)
    paths: [
        "M12.8237 6.42584C12.8237 6.49745 12.8237 6.56906 12.7874 9.80324C12.7511 13.0374 12.6784 19.432 12.5005 23.8447C12.3226 28.2575 12.0416 30.4947 11.7521 32.7997",
        "M0.5 5.32849C1.08154 4.53007 4.01975 2.02997 9.4622 0.998407C15.9738 -0.235794 21.143 1.15074 22.7464 1.63936C24.1867 2.07829 25.1174 3.32405 25.7625 4.67722C27.3429 7.992 23.6981 13.4604 19.4437 17.8649C17.052 19.4089 14.7217 20.328 12.6545 20.644C11.6749 20.7204 10.8362 20.6264 9.97209 20.5296",
        "M30.6052 15.4586V27.4724",
        "M40.5144 18.4946C42.1211 18.4946 46.3197 18.2658 48.3822 16.8613C49.4458 16.137 49.5683 14.7191 49.6341 13.576C49.7008 12.4177 49.2503 11.3613 48.3965 10.5662C47.3883 9.62721 45.406 10.0649 43.4457 10.8504C41.227 11.7395 39.6714 14.2174 38.3045 16.6904C36.9648 19.1143 36.8923 21.6807 36.9724 23.6357C37.0104 24.5628 37.4304 25.3217 37.9757 25.9606C39.2782 27.086 40.9783 27.5841 42.7476 27.4126C43.5968 27.2442 44.347 26.9108 45.12 26.5672",
        "M58.2166 1.76035C58.1935 1.768 58.1703 1.77566 57.7969 3.29648C57.4236 4.8173 56.7008 7.85106 56.2295 11.0098C55.7583 14.1685 55.5605 17.3603 55.6048 19.4829C55.6491 21.6055 55.9415 22.5622 56.5403 23.2453C57.7498 24.6251 60.297 24.5649 62.9039 24.0287C65.3316 22.9676 67.2511 21.3305 68.5257 19.4178C69.0749 18.4613 69.426 17.5337 69.7877 16.578L69.7877 16.578",
        "M80.4381 10.0968C81.9839 10.0955 85.5558 9.98785 86.4098 9.6862C87.1817 9.41356 87.4622 8.46362 87.6171 7.53603C87.7786 6.5686 87.5029 5.66699 87.0036 5.00622C86.4263 4.24239 84.8674 4.41768 83.2064 4.78593C81.2713 5.21494 79.583 6.95042 77.9778 8.62016C76.4551 10.2041 75.5804 12.0614 74.9537 13.706C74.3912 15.182 74.632 16.6167 75.1618 17.7853C77.6057 19.5305 80.4619 20.0013 82.6314 19.8047C83.7576 19.618 84.9351 19.2546 86.1482 18.8801",
        "M95.4896 4.2355V16.6817",
        "M96.6171 7.73516C96.6552 7.64979 97.0401 7.12764 98.1984 6.26869C98.9345 5.72284 99.9253 5.53614 100.923 5.37197C102.047 5.29136 102.86 5.28748 103.242 5.34217C103.42 5.38152 103.564 5.44442 103.713 5.50923",
        "M32.3657 6.96719H32.3219",
        "M53.4841 11.4852H63.3585",
        "M5.64307 40.2313C5.75319 40.2313 6.57732 40.2313 9.30669 40.068C11.2719 39.9504 14.4019 39.5781 29.1563 36.6227C43.9108 33.6672 70.1914 28.0927 85.0308 25.0845C99.8703 22.0763 102.472 21.8034 105.153 21.5223",
    ],
}

// Inter's cap height as a fraction of the font size; used to place lines by the top of their capitals.
const CAP_HEIGHT = 0.727

export interface BusinessCardProps {
    /** Rendered width in px; height follows the 5:3 ratio. */
    width?: number
    /** Max rotation in degrees when the cursor is at the card edge. */
    maxTilt?: number
    /** Share of the tilt kept on the back (0 = flat), so its email is easy to click. */
    backTilt?: number
    perspective?: number
    /** Idle loop on the front while not hovered: share of maxTilt (0 = off) and seconds per full loop. */
    idleTilt?: number
    idleSpeed?: number
    /** On phones/tablets, tilt follows how the device is held (blended with the idle loop; see deviceTakeover). */
    deviceTilt?: boolean
    /** Degrees of device tilt for a full card tilt. */
    deviceTiltRange?: number
    /** Seconds over which "level" drifts to how the device is currently held, so any grip works. */
    deviceRecenter?: number
    /** How fast (°/s) the phone has to turn to fully take over from the idle loop. */
    deviceTakeover?: number
    /** Seconds for the idle loop to take back over once the phone is held still. */
    deviceRelease?: number
    /** Spring stiffness / damping for the tilt. */
    stiffness?: number
    damping?: number
    hoverScale?: number
    /** Lift of the drop shadow while hovering, in px. */
    shadowLift?: number
    /** Opacity of the drop shadow, 0–1. */
    shadowOpacity?: number

    /** In-plane rotation (deg, clockwise) of the front; the back sits straight at 0°. */
    startRotation?: number
    /** Spring for the click-to-flip (and the straighten); lower damping overshoots more. */
    /** Take the turned-away face out of rendering (avoids bleed-through in some renderers, but the newly
     *  shown face then rasters mid-flip at a tiny width and sharpens in patches). */
    hideTurnedFace?: boolean
    flipStiffness?: number
    flipDamping?: number

    cardColor?: string
    /** Card outline in px (0 hides it). */
    borderWidth?: number
    borderColor?: string
    blockColor?: string
    inkColor?: string

    /** Shared font stack (empty = inherit the page's font); each line can override weight, size, spacing. */
    fontFamily?: string
    /** Distance of the text from the card edges, in card units (card is 500 × 300). */
    textInsetX?: number
    /** Wordmark caps start this far from the top. */
    textInsetTop?: number
    /** Tagline baseline distance from the bottom edge. */
    textInsetBottom?: number
    /** Space from the wordmark's baseline to the top of the title's capitals. */
    titleGap?: number

    /** Front, top-left. Size in card units, letter spacing in % of size (like Figma). */
    wordmarkText?: string
    wordmarkSize?: number
    wordmarkWeight?: number
    wordmarkTracking?: number

    /** Front, top-right; styled like the wordmark by default. */
    siteText?: string
    siteSize?: number
    siteWeight?: number
    siteTracking?: number
    /** "baseline" sits on the name's baseline; "top" lines up the tops of the capitals. */
    siteAlign?: "baseline" | "top"

    /** Front, below the wordmark. Empty font/colour fall back to fontFamily/inkColor. */
    titleText?: string
    titleFont?: string
    titleSize?: number
    titleWeight?: number
    titleTracking?: number
    titleColor?: string

    /** Front, bottom-left. */
    taglineText?: string
    taglineSize?: number
    taglineWeight?: number
    taglineTracking?: number

    /** Shown at the end of the back's intro; click copies it to the clipboard. */
    email?: string
    /** Shown in place of the email for `copiedDuration` seconds after copying. */
    copiedText?: string
    copiedDuration?: number
    /** Seconds for each blur-fade between the email and the copied message. */
    copyFade?: number
    /** Blur at the faded-out end of the swap, in em of the text. */
    copyBlur?: number
    /** Email opacity on hover (it's always underlined). */
    emailHoverOpacity?: number

    /** Back: plain card with a short intro. Line breaks in the text are kept. */
    bioText?: string
    bioSize?: number
    bioWeight?: number
    bioTracking?: number
    /** Line height as a multiple of the size. */
    bioLineHeight?: number
    /** Text wraps at this width, in card units. */
    bioMaxWidth?: number
    /** Phrase in the intro drawn in its own colour (every occurrence, any capitalisation). */
    bioHighlight?: string
    bioHighlightColor?: string
    /** 0–1 opacity of the highlighted phrase. */
    bioHighlightOpacity?: number
    /** End the intro with the email on its own line, same style as the text; click copies it. */
    bioEmail?: boolean
    /** Down arrow after the intro's last line, pointing at the email. Size is its height in em. */
    bioArrow?: boolean
    bioArrowSize?: number
    /** Space between the last word and the arrow, in em. */
    bioArrowGap?: number
    /** Show the block grid on the back too. */
    backBlocks?: boolean

    /** Signature in the back's bottom-right corner, drawn in each time the card turns to the back. */
    signature?: boolean
    /** Width in card units (the card is 500 wide). */
    signatureWidth?: number
    /** Distance from the right and bottom edges, in card units. */
    signatureRight?: number
    signatureBottom?: number
    /** Empty = the text colour. */
    signatureColor?: string
    /** Pen thickness, in the signature's own units (it's 60 wide). */
    signatureStroke?: number
    /** The name's i dot, as a multiple of the pen thickness. */
    signatureDotSize?: number
    /** Seconds to write the whole signature; each stroke gets its share by length. */
    signatureDuration?: number
    /** Seconds after the flip starts before the pen starts (the back turns into view first). */
    signatureDelay?: number
    /** Seconds the pen is lifted between strokes. */
    signaturePause?: number

    /** The Diagonal: white road cut through the blocks, top-right to bottom-left. Width 0 hides it. */
    /** "chamfered" = Eixample octagon with cut corners; "rounded" = rounded square. */
    blockShape?: "rounded" | "chamfered"
    /** How much of each corner is cut off, in card units (blocks are ~51 × 50). */
    chamferSize?: number
    /** Rounding of the octagon's eight corners. */
    chamferRadius?: number

    roadWidth?: number
    /** Degrees from horizontal. */
    roadAngle?: number
    /** Shift the road perpendicular to itself, in card units (0 = through the centre). */
    roadOffset?: number
    /** Corner radius where the road cuts a block. */
    cutRadius?: number
    /** Cut-off slivers smaller than this area (card units²) are dropped. */
    minPieceArea?: number

    /** How far the blocks sit below the card surface: they shift against the tilt by this many card units. */
    blockDepth?: number
    /** 0–1, per-block variation in depth (0 = one flat layer, 1 = blocks at very different heights). */
    blockDepthVariation?: number

    /** 0–1, how much the colour effects (tilt, trail, ripple) are toned down on blocks near the edges, behind the text. */
    edgeCalm?: number
    /** Where the toning down starts, from the centre (0) to the edge (1). */
    edgeCalmStart?: number

    /** Blocks on the side tilted away get tintA, the side tilted toward you tintB. */
    tintA?: string
    tintB?: string
    /** 0–1, how far the blocks move from blockColor to the tint at full tilt. */
    tintStrength?: number

    /** Ambient waves rolling out from `rippleOrigin`; they fade out while the card is hovered. */
    rippleColor?: string
    /** 0–1, peak mix toward rippleColor at the wavefront (0 turns the waves off). */
    rippleStrength?: number
    /** Wavefront speed in card units (card is 500 wide) per second. */
    rippleSpeed?: number
    /** Thickness of the wavefront in card units. */
    rippleWidth?: number
    /** Seconds each wave lives before it has faded out. */
    rippleDuration?: number
    /** Seconds between waves. */
    rippleInterval?: number
    /** Where the waves start. From a corner they live longer, so they still cross the whole card. */
    rippleOrigin?: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right"

    /** Blocks light up where the cursor moves, then fade. */
    trailColor?: string
    /** 0–1, peak mix toward trailColor. */
    trailStrength?: number
    /** Reach of the cursor's light, in card units. */
    trailRadius?: number
    /** Seconds for a lit block to fade most of the way back. */
    trailFade?: number

    /** Front only, under the text: soft highlight that follows the tilt, plus a faint shade on the far side. */
    glareStrength?: number
    glareShade?: number
    /** Highlight radius as % of the card. */
    glareSize?: number

    className?: string
    style?: CSSProperties
}

type RGB = [number, number, number]

function hexToRgb(hex: string): RGB {
    let h = hex.replace("#", "").trim()
    if (h.length === 3) h = h.split("").map((c) => c + c).join("")
    const n = parseInt(h.slice(0, 6), 16)
    if (Number.isNaN(n)) return [255, 255, 255]
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const mix = (a: RGB, b: RGB, t: number): RGB => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
]

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

// "#RRGGBB" + alpha → rgba() string.
const withAlpha = (hex: string, a: number) => {
    const [r, g, b] = hexToRgb(hex)
    return `rgba(${r},${g},${b},${a})`
}

const FRONT = 0
const BACK = 1

export default function BusinessCard({
    width = 450,
    maxTilt = 12,
    backTilt = 1,
    perspective = 900,
    idleTilt = 0.65,
    idleSpeed = 8,
    deviceTilt = true,
    deviceTiltRange = 20,
    deviceRecenter = 3,
    deviceTakeover = 25,
    deviceRelease = 1.2,
    stiffness = 140,
    damping = 41,
    hoverScale = 1.03,
    shadowLift = 7,
    shadowOpacity = 0.02,
    startRotation = 0,
    hideTurnedFace = true,
    flipStiffness = 90,
    flipDamping = 14,
    cardColor = "#FFFFFF",
    borderWidth = 0.5,
    borderColor = "#F0F0F0",
    blockColor = "#FCFCFC",
    inkColor = "#292929",
    fontFamily = "",
    textInsetX = 21.5,
    textInsetTop = 21,
    textInsetBottom = 23,
    titleGap = 15.5,
    wordmarkText = "pieter griep",
    wordmarkSize = 24,
    wordmarkWeight = 400,
    wordmarkTracking = -2,
    siteText = "griep.design",
    siteSize = 24,
    siteWeight = 400,
    siteTracking = -2,
    siteAlign = "baseline",
    titleText = "product designer",
    titleFont = "",
    titleSize = 12.5,
    titleWeight = 500,
    titleTracking = -2,
    titleColor = "",
    taglineText = "barcelona, spain",
    taglineSize = 13.5,
    taglineWeight = 400,
    taglineTracking = 0,
    email = "hola@griep.design",
    copiedText = "Copied to clipboard!",
    copiedDuration = 1.6,
    copyFade = 0.22,
    copyBlur = 0.25,
    emailHoverOpacity = 0.5,
    bioText = "Hi, I’m Pieter. I am a Dutch Product Designer based in Barcelona.\n\nI design and build interfaces down to the last interaction, from app screens and widgets to the small components that make a product feel right. Got a project in mind? Say hola.\n",
    bioSize = 16,
    bioWeight = 400,
    bioTracking = -2,
    bioLineHeight = 1.35,
    bioMaxWidth = 457,
    bioHighlight = "product designer",
    bioHighlightColor = "#191919",
    bioHighlightOpacity = 0.35,
    bioEmail = true,
    bioArrow = false,
    bioArrowSize = 0.83,
    bioArrowGap = 0.3,
    backBlocks = false,
    signature = true,
    signatureWidth = 92,
    signatureRight = 31,
    signatureBottom = 26.5,
    signatureColor = "#2f6bff",
    signatureStroke = 1.35,
    signatureDotSize = 1.8,
    signatureDuration = 0.75,
    signatureDelay = 0.35,
    signaturePause = 0.08,
    blockShape = "chamfered",
    chamferSize = 8,
    chamferRadius = 4.75,
    roadWidth = 16,
    roadAngle = 41,
    roadOffset = 133,
    cutRadius = 6,
    minPieceArea = 20,
    blockDepth = 0,
    blockDepthVariation = 0,
    edgeCalm = 0.85,
    edgeCalmStart = 0.45,
    tintA = "#FFFFFF",
    tintB = "#E6E6E6",
    tintStrength = 1,
    rippleColor = "#DEDEDE",
    rippleStrength = 0.75,
    rippleSpeed = 90,
    rippleWidth = 45,
    rippleDuration = 5,
    rippleInterval = 2.5,
    rippleOrigin = "bottom-left",
    trailColor = "#E6E6E6",
    trailStrength = 0.8,
    trailRadius = 45,
    trailFade = 0.7,
    glareStrength = 0.6,
    glareShade = 0.04,
    glareSize = 55,
    className,
    style,
}: BusinessCardProps) {
    const cardRef = useRef<HTMLDivElement>(null)
    const flipRef = useRef<HTMLDivElement>(null)
    const faceRefs = useRef<(HTMLDivElement | null)[]>([null, null])
    const glareRefs = useRef<(HTMLDivElement | null)[]>([null, null])
    const blockRefs = useRef<(SVGPathElement | null)[][]>([[], []])
    const pieces = useMemo(
        () => buildPieces({ blockShape, chamferSize, chamferRadius, roadWidth, roadAngle, roadOffset, cutRadius, minPieceArea }),
        [blockShape, chamferSize, chamferRadius, roadWidth, roadAngle, roadOffset, cutRadius, minPieceArea],
    )
    const piecesRef = useRef(pieces)
    piecesRef.current = pieces
    const [flipped, setFlipped] = useState(false)
    // The email swaps to the copied message and back with a blur-fade: hide, swap the text, show.
    const [copied, setCopied] = useState(false)
    // "out"/"in" while swapping between the email and the copied message; "idle" otherwise.
    const [labelPhase, setLabelPhase] = useState<"idle" | "out" | "in">("idle")
    const [bioEmailHover, setBioEmailHover] = useState(false)
    const bioEmailHoverRef = useRef(false)
    const bioEmailRef = useRef<HTMLSpanElement>(null)

    // Latest props, read inside the animation loop without restarting it.
    const cfg = useRef({ deviceTakeover, deviceRelease, hideTurnedFace, maxTilt, backTilt, idleTilt, idleSpeed, stiffness, damping, hoverScale, shadowLift, shadowOpacity, flipStiffness, flipDamping, blockDepth, blockDepthVariation, edgeCalm, edgeCalmStart, tintStrength, rippleStrength, rippleSpeed, rippleWidth, rippleDuration, rippleInterval, rippleOrigin, trailStrength, trailRadius, trailFade, glareStrength, glareShade, glareSize })
    cfg.current = { deviceTakeover, deviceRelease, hideTurnedFace, maxTilt, backTilt, idleTilt, idleSpeed, stiffness, damping, hoverScale, shadowLift, shadowOpacity, flipStiffness, flipDamping, blockDepth, blockDepthVariation, edgeCalm, edgeCalmStart, tintStrength, rippleStrength, rippleSpeed, rippleWidth, rippleDuration, rippleInterval, rippleOrigin, trailStrength, trailRadius, trailFade, glareStrength, glareShade, glareSize }
    const colors = useRef({ block: hexToRgb(blockColor), a: hexToRgb(tintA), b: hexToRgb(tintB), ripple: hexToRgb(rippleColor), trail: hexToRgb(trailColor) })
    colors.current = { block: hexToRgb(blockColor), a: hexToRgb(tintA), b: hexToRgb(tintB), ripple: hexToRgb(rippleColor), trail: hexToRgb(trailColor) }

    // Spring state: tilt direction (x, y in -1…1), hover amount (0…1), flip angle and in-plane rotation (deg).
    const sim = useRef({
        x: 0, y: 0, h: 0, f: 0, r: startRotation,
        vx: 0, vy: 0, vh: 0, vf: 0, vr: 0,
        tx: 0, ty: 0, th: 0, tf: 0, tr: startRotation,
        // Per-face, per-block hover-trail light, 0…1.
        // Sized for the most pieces the road can make (each block split in two).
        trail: [new Float32Array(COLS * ROWS * 2), new Float32Array(COLS * ROWS * 2)],
        // Last pointer position in card units (null when outside), to fill gaps on fast moves.
        lastPt: null as { x: number; y: number } | null,
        hovering: false,
        // Device-orientation tilt (phones): active once readings arrive; dx/dy are its tilt targets.
        device: false,
        dx: 0,
        dy: 0,
        dw: 0,
        motion: 0, // °/s, smoothed
        motionAt: 0,
        // While true (cursor near the back's email), the tilt stays put so the link doesn't move away.
        holdTilt: false,
        onScreen: true,
        raf: 0,
        last: 0,
    })

    const kick = () => {
        const s = sim.current
        if (s.raf) return
        s.last = performance.now()
        s.raf = requestAnimationFrame(tick)
    }

    // Which face is toward the viewer right now.
    const visibleFace = () => (Math.cos((sim.current.f * Math.PI) / 180) >= 0 ? FRONT : BACK)

    const tick = (now: number) => {
        const s = sim.current
        const c = cfg.current
        const col = colors.current
        const elapsed = Math.min(0.1, Math.max(0, (now - s.last) / 1000))
        s.last = now

        // Phones: how much the device drives the tilt (0…1). Turning the phone hands the card to it
        // quickly; holding still (whatever the angle) hands it back to the idle loop over deviceRelease.
        const fresh = s.device && now - s.motionAt < 250
        const moved = fresh ? clamp(s.motion / Math.max(1, c.deviceTakeover), 0, 1) : 0
        const tau = moved > s.dw ? 0.12 : Math.max(0.05, c.deviceRelease)
        s.dw += (moved - s.dw) * (1 - Math.exp(-elapsed / tau))

        // Idle loop (front only): with no cursor on the card, the tilt target circles slowly;
        // on the back it rests flat. The spring smooths every hand-over.
        const idle = !s.hovering && s.tf === 0 && c.idleTilt > 0 && c.idleSpeed > 0
        if (!s.hovering) {
            let ix = 0
            let iy = 0
            if (idle) {
                const a = ((now / 1000) * 2 * Math.PI) / c.idleSpeed
                ix = c.idleTilt * Math.cos(a)
                iy = c.idleTilt * Math.sin(a)
            }
            s.tx = ix * (1 - s.dw) + s.dx * s.dw
            s.ty = iy * (1 - s.dw) + s.dy * s.dw
        }

        // Damped springs toward the targets, in small fixed substeps so
        // stiff/heavily damped settings or slow frames can't blow up.
        const SUB = 1 / 240
        const steps = Math.max(1, Math.ceil(elapsed / SUB))
        const dt = elapsed / steps
        const step = (p: number, v: number, t: number, k: number, d: number) => {
            v += (k * (t - p) - d * v) * dt
            return [p + v * dt, v]
        }
        for (let n = 0; n < steps; n++) {
            ;[s.x, s.vx] = step(s.x, s.vx, s.tx, c.stiffness, c.damping)
            ;[s.y, s.vy] = step(s.y, s.vy, s.ty, c.stiffness, c.damping)
            ;[s.h, s.vh] = step(s.h, s.vh, s.th, c.stiffness, c.damping)
            ;[s.f, s.vf] = step(s.f, s.vf, s.tf, c.flipStiffness, c.flipDamping)
            ;[s.r, s.vr] = step(s.r, s.vr, s.tr, c.flipStiffness, c.flipDamping)
        }
        // Last-resort recovery: snap to target if anything went non-finite.
        if (![s.x, s.y, s.h, s.f, s.r, s.vx, s.vy, s.vh, s.vf, s.vr].every(Number.isFinite)) {
            s.x = s.tx; s.y = s.ty; s.h = s.th; s.f = s.tf; s.r = s.tr
            s.vx = s.vy = s.vh = s.vf = s.vr = 0
        }

        // The whole transform (rotation, tilt, hover zoom, flip) goes straight onto each face, under one
        // perspective. Nesting it in 3D containers instead made Chrome raster the faces at a low resolution
        // while they turn, so text looked blocky for a moment after every flip.
        {
            const scale = 1 + (c.hoverScale - 1) * s.h
            // Tilt eases down to backTilt as the card turns over (0 → 1 across the flip).
            const backness = clamp((1 - Math.cos((s.f * Math.PI) / 180)) / 2, 0, 1)
            const tilt = c.maxTilt * (1 - (1 - c.backTilt) * backness)
            const base = `rotateZ(${s.r}deg) rotateX(${-s.y * tilt}deg) rotateY(${s.x * tilt}deg) scale(${scale}) rotateY(${s.f}deg)`
            const front = faceRefs.current[FRONT]
            const back = faceRefs.current[BACK]
            if (front) front.style.transform = base
            if (back) back.style.transform = `${base} rotateY(180deg)`
        }

        const lift = c.shadowLift * s.h
        const tiltMag = Math.min(1, Math.hypot(s.x, s.y))
        const tintAmt = c.tintStrength * tiltMag
        const gx = 50 + s.x * 50
        const gy = 50 + s.y * 50
        const shadeAngle = (Math.atan2(s.y, s.x) * 180) / Math.PI + 270

        // Ambient waves: one leaves the origin every `rippleInterval` seconds. From a corner the far side is
        // twice as far as from the centre, so lifetime scales with that distance to still cross the card.
        const ox = c.rippleOrigin.endsWith("left") ? 0 : c.rippleOrigin.endsWith("right") ? W : W / 2
        const oy = c.rippleOrigin.startsWith("top") ? 0 : c.rippleOrigin.startsWith("bottom") ? H : H / 2
        const reach = Math.hypot(Math.max(ox, W - ox), Math.max(oy, H - oy)) / Math.hypot(W / 2, H / 2)
        const life = c.rippleDuration * reach
        const t = now / 1000
        const waves: number[] = []
        if (c.rippleStrength > 0 && c.rippleInterval > 0) {
            for (let n = Math.ceil((t - life) / c.rippleInterval); n <= Math.floor(t / c.rippleInterval); n++) {
                waves.push(t - n * c.rippleInterval)
            }
        }

        const trailDecay = Math.exp(-elapsed / Math.max(0.05, c.trailFade / 3))
        let trailLeft = 0

        const shown = visibleFace()
        for (const face of [FRONT, BACK]) {
            // Both faces read the right way round on screen (the back's own 180° turn cancels the flip),
            // so card x and screen x match on either face.
            const el = faceRefs.current[face]
            if (el) {
                // The turned-away face can't be seen; take it out of rendering rather than relying on backface-visibility.
                if (c.hideTurnedFace) el.style.display = face === shown ? "block" : "none"
                el.style.boxShadow =
                    `${-s.x * lift * 0.6}px ${lift * 0.8 - s.y * lift * 0.6}px ${lift * 2 + 4}px rgba(0,0,0,${c.shadowOpacity * s.h}),` +
                    `0 1px 2px rgba(0,0,0,${c.shadowOpacity})`
            }
            const glare = glareRefs.current[face]
            if (glare) {
                // Highlight sits toward the cursor; the shade falls on the opposite side.
                glare.style.opacity = String(Math.max(s.h, s.device ? 1 : 0))
                glare.style.background =
                    `radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,${c.glareStrength}) 0%, rgba(255,255,255,0) ${c.glareSize}%),` +
                    `linear-gradient(${shadeAngle}deg, rgba(0,0,0,0) 35%, rgba(0,0,0,${c.glareShade * tiltMag}) 100%)`
            }

            const trail = s.trail[face]
            const rects = blockRefs.current[face]
            const blocks = piecesRef.current
            for (let i = 0; i < blocks.length; i++) {
                if ((trail[i] *= trailDecay) < 0.002) trail[i] = 0
                trailLeft = Math.max(trailLeft, trail[i])
                const rect = rects[i]
                if (!rect) continue
                const b = blocks[i]
                let rgb = col.block
                // Block colours: gradient from tintA → tintB across the tilt axis, strength grows with tilt.
                if (tintAmt > 0.001) {
                    const d = (b.px * s.x + b.py * s.y) / tiltMag
                    rgb = mix(rgb, mix(col.a, col.b, clamp(0.5 - 0.5 * d, 0, 1)), tintAmt)
                }
                if (trail[i] > 0) rgb = mix(rgb, col.trail, trail[i] * c.trailStrength)
                // Waves fade out as the hover comes in, so they pause while you're interacting.
                const waveAmt = c.rippleStrength * (1 - clamp(s.h, 0, 1))
                if (waves.length && waveAmt > 0.001) {
                    const dist = Math.hypot(b.cx - ox, b.cy - oy)
                    let wave = 0
                    for (const age of waves) {
                        const fadeIn = Math.min(1, age / 0.6)
                        const fadeOut = (1 - age / life) ** 2
                        wave += Math.exp(-(((dist - age * c.rippleSpeed) / c.rippleWidth) ** 2)) * fadeIn * fadeOut
                    }
                    rgb = mix(rgb, col.ripple, clamp(wave, 0, 1) * waveAmt)
                }
                // Keep the edges, where the text sits, close to the plain block colour so the text stays readable.
                if (c.edgeCalm > 0) {
                    const r = Math.max(Math.abs(b.px), Math.abs(b.py))
                    const e = clamp((r - c.edgeCalmStart) / Math.max(0.01, 0.85 - c.edgeCalmStart), 0, 1)
                    rgb = mix(rgb, col.block, c.edgeCalm * e * e * (3 - 2 * e))
                }
                rect.setAttribute("fill", `rgb(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0})`)
                // Parallax: blocks sit below the surface, so they slide against the tilt.
                const depth = c.blockDepth * (1 + c.blockDepthVariation * (b.rand * 2 - 1))
                rect.setAttribute("transform", `translate(${-s.x * depth} ${-s.y * depth})`)
            }
        }

        const settled =
            Math.abs(s.x - s.tx) + Math.abs(s.y - s.ty) + Math.abs(s.h - s.th) + (Math.abs(s.f - s.tf) + Math.abs(s.r - s.tr)) / 180 < 0.0005 &&
            Math.abs(s.vx) + Math.abs(s.vy) + Math.abs(s.vh) + (Math.abs(s.vf) + Math.abs(s.vr)) / 180 < 0.0005
        // The ambient waves and idle tilt keep the loop alive, except while the card is off-screen.
        const ambient = ((c.rippleStrength > 0 && c.rippleInterval > 0) || idle || s.device) && s.onScreen
        if (settled && trailLeft === 0 && !ambient) {
            s.raf = 0
            return
        }
        s.raf = requestAnimationFrame(tick)
    }

    // Repaint when props change. The loop itself survives re-renders.
    useEffect(() => {
        kick()
    })

    // Front rests at startRotation, back sits straight; both turn together on the flip spring.
    useEffect(() => {
        sim.current.tf = flipped ? 180 : 0
        sim.current.tr = flipped ? 0 : startRotation
        kick()
    }, [flipped, startRotation])

    // Each turn to the back writes the signature again: every stroke's dash runs out over its
    // share of signatureDuration (by length, so the pen keeps one speed), one after the other.
    const signatureRefs = useRef<(SVGPathElement | null)[]>([])
    const signatureRuns = useRef<Animation[]>([])
    useEffect(() => {
        const old = signatureRuns.current
        // Turning back to the front: freeze it as it is (written, or part-way if the turn came
        // early), so nothing changes while the back is still in view.
        if (!flipped) {
            old.forEach((r) => r.pause())
            return
        }
        old.forEach((r) => r.cancel())
        if (!signature) return
        const paths = signatureRefs.current.filter((p): p is SVGPathElement => !!p)
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        const lengths = paths.map((p) => p.getTotalLength())
        const total = lengths.reduce((a, b) => a + b, 0) || 1
        let at = signatureDelay * 1000
        signatureRuns.current = paths.map((p, i) => {
            const ms = (signatureDuration * 1000 * lengths[i]) / total
            const run = p.animate(
                p.dataset.dot != null
                    ? // the i's dot isn't drawn along, it's simply set down
                      [{ opacity: 0 }, { opacity: 1 }]
                    : // hidden (not just a zero-length dash: its round cap would leave a dot) until the pen starts
                      [{ strokeDashoffset: 1, opacity: 0 }, { strokeDashoffset: 0.995, opacity: 1, offset: 0.005 }, { strokeDashoffset: 0, opacity: 1 }],
                {
                duration: reduce ? 0 : ms,
                delay: reduce ? 0 : at,
                easing: "cubic-bezier(0.4, 0, 0.6, 1)",
                fill: "both",
                },
            )
            at += ms + signaturePause * 1000
            return run
        })
    }, [flipped, signature, signatureDuration, signatureDelay, signaturePause])
    useEffect(() => () => signatureRuns.current.forEach((r) => r.cancel()), [])

    const flip = () => setFlipped((f) => !f)

    // A click on the back's email copies it; anywhere else flips the card.
    const onCardClick = (e: MouseEvent<HTMLDivElement>) => {
        askMotionPermission()
        const { nx, ny } = local(e)
        if (nearBackEmail(toCard(nx, ny), 3)) copyEmail()
        else flip()
    }

    useEffect(() => {
        const s = sim.current
        // Pause the ambient waves while the card is scrolled out of view.
        const io = new IntersectionObserver(([entry]) => {
            s.onScreen = entry.isIntersecting
            if (s.onScreen) kick()
        })
        if (cardRef.current) io.observe(cardRef.current)
        return () => {
            io.disconnect()
            cancelAnimationFrame(s.raf)
            s.raf = 0
        }
    }, [])

    // Phones/tablets: tilt from device orientation. "Level" is a slowly drifting average of how the
    // device is held, so the card responds to changes in grip rather than to absolute angle.
    useEffect(() => {
        if (!deviceTilt || typeof window === "undefined") return
        if (!window.matchMedia("(hover: none) and (pointer: coarse)").matches) return
        const s = sim.current
        let base: { beta: number; gamma: number } | null = null
        let last = 0
        let prev: { beta: number; gamma: number } | null = null
        const onOrient = (e: DeviceOrientationEvent) => {
            if (e.beta == null || e.gamma == null) return
            const now = performance.now()
            const dt = last ? (now - last) / 1000 : 0
            last = now
            if (!base) base = { beta: e.beta, gamma: e.gamma }
            // How fast the phone is turning (°/s), smoothed: real movement hands the card to the phone.
            if (prev && dt > 0) {
                const speed = Math.hypot(e.beta - prev.beta, e.gamma - prev.gamma) / dt
                s.motion = s.motion * 0.7 + speed * 0.3
                s.motionAt = now
            }
            prev = { beta: e.beta, gamma: e.gamma }
            const f = Math.min(1, dt / Math.max(0.1, deviceRecenter))
            base.beta += (e.beta - base.beta) * f
            base.gamma += (e.gamma - base.gamma) * f
            let x = (e.gamma - base.gamma) / deviceTiltRange
            let y = (e.beta - base.beta) / deviceTiltRange
            // Landscape: the device's axes are rotated relative to the screen.
            const angle = screen.orientation?.angle ?? 0
            if (angle === 90) [x, y] = [y, -x]
            else if (angle === 270 || angle === -90) [x, y] = [-y, x]
            s.dx = clamp(x, -1, 1)
            s.dy = clamp(y, -1, 1)
            s.device = true
            kick()
        }
        window.addEventListener("deviceorientation", onOrient)
        return () => window.removeEventListener("deviceorientation", onOrient)
    }, [deviceTilt, deviceTiltRange, deviceRecenter])

    // iOS only sends orientation after the visitor allows it, and the request must come from a tap.
    const motionAsked = useRef(false)
    const askMotionPermission = () => {
        const DOE = (typeof window !== "undefined" ? window.DeviceOrientationEvent : undefined) as
            | (typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> })
            | undefined
        if (!deviceTilt || motionAsked.current || !DOE?.requestPermission) return
        motionAsked.current = true
        DOE.requestPermission().catch(() => {})
    }

    const copyTimers = useRef<number[]>([])
    const clearCopyTimers = () => {
        copyTimers.current.forEach(clearTimeout)
        copyTimers.current = []
    }
    useEffect(() => clearCopyTimers, [])
    // Email look: underlined like a link, dimmed on hover, blur-fading when swapping to the copied message.
    // The blur-fade is a text shadow that softens while the text colour fades: both are painted with the
    // card itself. A CSS filter or opacity would put the email on its own layer, which on the tilted card
    // Chrome draws at low resolution, so the text looked soft for a moment after each swap.
    const emailStyle = (hover: boolean): CSSProperties => {
        const out = labelPhase === "out"
        const ink = hover && !copied && labelPhase === "idle" ? withAlpha(inkColor, emailHoverOpacity) : inkColor
        return {
            textDecoration: copied ? "none" : "underline",
            color: out ? withAlpha(inkColor, 0) : ink,
            textShadow: out ? `0 0 ${copyBlur}em ${withAlpha(inkColor, 0.3)}` : `0 0 0 ${withAlpha(inkColor, 0)}`,
            transition:
                labelPhase === "idle"
                    ? "color 0.15s ease"
                    : `color ${copyFade}s ease, text-shadow ${copyFade}s ease`,
        }
    }

    const copyEmail = async () => {
        try {
            await navigator.clipboard.writeText(email)
        } catch {
            // Older/insecure contexts: fall back to a hidden textarea.
            const ta = document.createElement("textarea")
            ta.value = email
            ta.style.position = "fixed"
            ta.style.opacity = "0"
            document.body.appendChild(ta)
            ta.select()
            document.execCommand("copy")
            ta.remove()
        }
        clearCopyTimers()
        const fade = copyFade * 1000
        const at = (ms: number, fn: () => void) => copyTimers.current.push(window.setTimeout(fn, ms))
        const hold = copiedDuration * 1000
        setLabelPhase("out")
        at(fade, () => { setCopied(true); setLabelPhase("in") })
        at(fade * 2, () => setLabelPhase("idle"))
        at(fade * 2 + hold, () => setLabelPhase("out"))
        at(fade * 3 + hold, () => { setCopied(false); setLabelPhase("in") })
        at(fade * 4 + hold, () => setLabelPhase("idle"))
    }

    // Pointer position relative to the untransformed hit area, -1…1.
    const local = (e: MouseEvent<HTMLDivElement>) => {
        const r = e.currentTarget.getBoundingClientRect()
        return { nx: ((e.clientX - r.left) / r.width) * 2 - 1, ny: ((e.clientY - r.top) / r.height) * 2 - 1 }
    }

    // Pointer in card units, undoing the hover scale so effects land under the cursor.
    const toCard = (nx: number, ny: number) => {
        const scale = 1 + (cfg.current.hoverScale - 1) * sim.current.h
        return { x: (0.5 + (nx / scale) * 0.5) * W, y: (0.5 + (ny / scale) * 0.5) * H }
    }

    // Is the pointer over (or within `margin` card units of) the back's email? Worked out from the flat
    // layout rather than browser hit-testing, which is unreliable on the turned-around back face and
    // would let clicks fall through and flip the card.
    const nearBackEmail = (pt: { x: number; y: number }, margin: number) => {
        const el = bioEmailRef.current
        const face = faceRefs.current[BACK]
        if (!el || !face || visibleFace() !== BACK) return false
        let x = 0
        let y = 0
        for (let n: HTMLElement | null = el; n && n !== face; n = n.offsetParent as HTMLElement | null) {
            x += n.offsetLeft
            y += n.offsetTop
        }
        const unit = face.offsetWidth / W
        return (
            pt.x >= x / unit - margin && pt.x <= (x + el.offsetWidth) / unit + margin &&
            pt.y >= y / unit - margin && pt.y <= (y + el.offsetHeight) / unit + margin
        )
    }

    const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
        if (e.pointerType === "touch") return // fingers scroll the page; the device tilt drives the card
        const { nx, ny } = local(e)
        const s = sim.current
        const here = toCard(nx, ny)
        // Hold the tilt as the cursor nears the email, so it doesn't slide away; show hover when on it.
        s.holdTilt = nearBackEmail(here, 18)
        const onEmail = nearBackEmail(here, 3)
        if (onEmail !== bioEmailHoverRef.current) {
            bioEmailHoverRef.current = onEmail
            setBioEmailHover(onEmail)
        }
        if (!s.holdTilt) {
            s.tx = clamp(nx, -1, 1)
            s.ty = clamp(ny, -1, 1)
        }
        s.th = 1
        s.hovering = true
        // Light the blocks near the cursor on the face you're looking at; they only fade once it moves on.
        // Sample along the path since the last event so fast moves leave a continuous trail.
        const face = visibleFace()
        const trail = s.trail[face]
        const pt = toCard(nx, ny)
        const from = s.lastPt ?? pt
        const r = cfg.current.trailRadius
        const n = Math.max(1, Math.ceil(Math.hypot(pt.x - from.x, pt.y - from.y) / (r / 3)))
        for (let k = 1; k <= n; k++) {
            const x = from.x + ((pt.x - from.x) * k) / n
            const y = from.y + ((pt.y - from.y) * k) / n
            for (let i = 0; i < piecesRef.current.length; i++) {
                const d = Math.hypot(piecesRef.current[i].cx - x, piecesRef.current[i].cy - y)
                trail[i] = Math.max(trail[i], Math.exp(-((d / r) ** 2)))
            }
        }
        s.lastPt = pt
        kick()
    }

    const onPointerLeave = (e: PointerEvent<HTMLDivElement>) => {
        if (e.pointerType === "touch") return
        const s = sim.current
        s.tx = s.ty = s.th = 0
        s.hovering = false
        s.holdTilt = false
        bioEmailHoverRef.current = false
        setBioEmailHover(false)
        s.lastPt = null
        kick()
    }

    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            flip()
        }
    }

    // The arrow goes after the last word, before any trailing line breaks (which space out the email).
    const bioMain = bioText.replace(/\s+$/, "")
    const bioTrailing = bioText.slice(bioMain.length)

    // Front: wordmark at the top inset with the title below it; website top-right, tagline bottom-left.
    const wordmarkBaseline = textInsetTop + CAP_HEIGHT * wordmarkSize

    const faceStyle = (face: number): CSSProperties => ({
        position: "absolute",
        inset: 0,
        borderRadius: `${(20 / W) * 100}% / ${(20 / H) * 100}%`,
        background: cardColor,
        border: borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : "none",
        boxSizing: "border-box",
        overflow: "hidden",
        // Lets the back's HTML text size itself in card units (cqw) so it scales with the card.
        containerType: "inline-size",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: face === BACK ? "rotateY(180deg)" : undefined,
        // Only the face toward the viewer takes clicks.
        pointerEvents: (face === BACK) === flipped ? "auto" : "none",
        boxShadow: `0 1px 2px rgba(0,0,0,${shadowOpacity})`,
    })

    const blocks = (face: number) =>
        pieces.map((b, i) => (
            <path key={i} ref={(el) => { blockRefs.current[face][i] = el }} d={b.d} fill={blockColor} />
        ))

    const glare = (face: number) => (
        <div ref={(el) => { glareRefs.current[face] = el }} style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0 }} />
    )

    return (
        <div
            className={className}
            role="button"
            tabIndex={0}
            aria-pressed={flipped}
            aria-label={flipped ? "Business card, back. Flip to front" : "Business card. Flip for contact info"}
            onPointerMove={onPointerMove}
            onPointerEnter={onPointerMove}
            onPointerLeave={onPointerLeave}
            onClick={onCardClick}
            onKeyDown={onKeyDown}
            style={{
                width,
                maxWidth: "100%",
                aspectRatio: `${W} / ${H}`,
                cursor: "pointer",
                touchAction: "manipulation",
                outline: "none",
                ...style,
            }}
        >
            <div ref={cardRef} style={{ position: "relative", width: "100%", height: "100%" }}>
                <div ref={flipRef} style={{ position: "absolute", inset: 0, perspective: `${perspective}px` }}>
                    <div ref={(el) => { faceRefs.current[FRONT] = el }} style={faceStyle(FRONT)}>
                        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: "block" }}>
                            {blocks(FRONT)}
                        </svg>
                        {/* Glare lights the card and blocks but sits under the text, so the text never washes out. */}
                        {glare(FRONT)}
                        <svg
                            viewBox={`0 0 ${W} ${H}`}
                            width="100%"
                            height="100%"
                            // geometricPrecision: on the tilted card Chrome otherwise draws some words from stretched
                            // glyph caches, so they look heavier and pixelated next to crisp ones.
                            style={{ display: "block", position: "absolute", inset: 0, pointerEvents: "none", textRendering: "geometricPrecision" }}
                            fontFamily={fontFamily || undefined}
                        >
                            <text
                                x={textInsetX}
                                y={wordmarkBaseline}
                                fontSize={wordmarkSize}
                                fontWeight={wordmarkWeight}
                                letterSpacing={(wordmarkTracking / 100) * wordmarkSize}
                                fill={inkColor}
                            >
                                {wordmarkText}
                            </text>
                            <text
                                x={textInsetX}
                                y={wordmarkBaseline + titleGap + CAP_HEIGHT * titleSize}
                                fontFamily={titleFont || undefined}
                                fontSize={titleSize}
                                fontWeight={titleWeight}
                                letterSpacing={(titleTracking / 100) * titleSize}
                                fill={titleColor || inkColor}
                            >
                                {titleText}
                            </text>
                            <text
                                x={W - textInsetX + (siteTracking / 100) * siteSize}
                                textAnchor="end"
                                y={siteAlign === "top" ? textInsetTop + CAP_HEIGHT * siteSize : wordmarkBaseline}
                                fontSize={siteSize}
                                fontWeight={siteWeight}
                                letterSpacing={(siteTracking / 100) * siteSize}
                                fill={inkColor}
                            >
                                {siteText}
                            </text>
                            <text
                                x={textInsetX}
                                y={H - textInsetBottom}
                                fontSize={taglineSize}
                                fontWeight={taglineWeight}
                                letterSpacing={(taglineTracking / 100) * taglineSize}
                                fill={inkColor}
                            >
                                {taglineText}
                            </text>
                        </svg>
                    </div>

                    <div ref={(el) => { faceRefs.current[BACK] = el }} style={faceStyle(BACK)}>
                        {backBlocks && (
                            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: "block", position: "absolute", inset: 0 }}>
                                {blocks(BACK)}
                            </svg>
                        )}
                        {/* HTML so the intro wraps; sizes are card units converted to cqw (card width = 100cqw = 500 units). */}
                        <p
                            style={{
                                position: "absolute",
                                left: `${(textInsetX / W) * 100}cqw`,
                                top: `${(textInsetTop / W) * 100}cqw`,
                                maxWidth: `${(bioMaxWidth / W) * 100}cqw`,
                                margin: 0,
                                fontFamily: fontFamily || undefined,
                                textRendering: "geometricPrecision", // see the front's text layer
                                fontSize: `${(bioSize / W) * 100}cqw`,
                                fontWeight: bioWeight,
                                letterSpacing: `${bioTracking / 100}em`,
                                lineHeight: bioLineHeight,
                                color: inkColor,
                                whiteSpace: "pre-line",
                                // Trim the line box above the first line's capitals so the top inset matches the front
                                // (Inter: ascent 0.969em, descent 0.242em).
                                marginTop: `${-((bioLineHeight - 1.211) / 2 + (0.969 - CAP_HEIGHT)) * (bioSize / W) * 100}cqw`,
                            }}
                        >
                            {bioHighlight
                                ? // Split on the phrase (any capitalisation); odd parts are the matches, in the text's own case.
                                  bioMain
                                      .split(new RegExp(`(${bioHighlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "i"))
                                      .map((part, i) =>
                                          i % 2 ? <span key={i} style={{ color: bioHighlightColor, opacity: bioHighlightOpacity }}>{part}</span> : part,
                                      )
                                : bioMain}
                            {bioArrow && (
                                // Same shape as the down-arrow SVG; sits on the baseline at cap height, in the text colour.
                                <svg
                                    viewBox="0 0 15 19"
                                    aria-hidden="true"
                                    style={{ display: "inline-block", height: `${bioArrowSize}em`, width: "auto", marginLeft: `${bioArrowGap}em`, verticalAlign: "baseline" }}
                                >
                                    <path d={ARROW_DOWN} fill="currentColor" />
                                </svg>
                            )}
                            {bioTrailing}
                            {bioEmail && (
                                <>
                                    {"\n"}
                                    <span
                                        role="button"
                                        aria-label={`Copy ${email}`}
                                        ref={bioEmailRef}
                                        style={{ display: "inline-block", ...emailStyle(bioEmailHover) }}
                                    >
                                        {copied ? copiedText : email}
                                    </span>
                                </>
                            )}
                        </p>
                        {signature && (() => {
                            const sig = SIGNATURE
                            const unit = signatureWidth / sig.w // card units per signature unit (1 unit of padding each side)
                            return (
                            <svg
                                viewBox={`-1 -1 ${sig.w + 2} ${sig.h + 2}`}
                                aria-hidden="true"
                                style={{
                                    position: "absolute",
                                    right: `${((signatureRight - unit) / W) * 100}cqw`,
                                    bottom: `${((signatureBottom - unit) / W) * 100}cqw`,
                                    width: `${((unit * (sig.w + 2)) / W) * 100}cqw`,
                                    overflow: "visible",
                                    pointerEvents: "none",
                                }}
                            >
                                {sig.paths.map((d, i) => {
                                    const ink = signatureColor || inkColor
                                    if (i === sig.dot) {
                                        // the i's dot as a filled circle where the stroke sits (Chrome skipped the
                                        // near-zero-length stroke on the turned card), sized by signatureDotSize
                                        const [x, y] = d.slice(1).split(/[\sHVLC]+/).map(Number)
                                        const r = (signatureStroke * signatureDotSize) / 2
                                        return (
                                            <path
                                                key={i}
                                                ref={(el) => { signatureRefs.current[i] = el }}
                                                d={`M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`}
                                                fill={ink}
                                                data-dot=""
                                                opacity={0}
                                            />
                                        )
                                    }
                                    return (
                                    <path
                                        key={i}
                                        ref={(el) => { signatureRefs.current[i] = el }}
                                        d={d}
                                        pathLength={1}
                                        fill="none"
                                        stroke={ink}
                                        strokeWidth={signatureStroke}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeDasharray="1 1"
                                        strokeDashoffset={1}
                                        opacity={0}
                                    />
                                    )
                                })}
                            </svg>
                            )
                        })()}
                    </div>
                </div>
            </div>
        </div>
    )
}
