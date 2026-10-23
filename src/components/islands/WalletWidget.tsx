// Portfolio widget whose background follows the time of day where it's being viewed:
// deep blue at night, warm at dawn and sunset, clear blue at midday, blended smoothly
// between them (in OKLab, so the in-between colours stay clean) and kept up to date
// while the page is open. At night a shooting star crosses it once in a while.
//
// Built from the Figma design (Crypto widget, node 59:46): 365 x 165, laid out in
// container units so it scales to whatever width it's given.

import { useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties } from "react"
import { addPropertyControls, ControlType } from "framer"
import { RollingNumber } from "@kitlangton/rolling-number/react"
import "@kitlangton/rolling-number/styles.css"

const W = 365
const H = 165
// design px -> container units
const u = (px: number) => `${(px / W) * 100}cqw`

// ---------------------------------------------------------------------------------
// The background is a vertical gradient with the design's nine stops (positions in %).
// Each moment of the day gives the nine colours: the morning is the design's own; the
// others are given as top / middle / bottom and spread over the same stops. Between two
// moments every colour is blended by the time in between.
const STOPS = [0.322, 18.585, 33.393, 50.176, 62.022, 73.375, 83.247, 94.599, 101.51]
const MORNING = ["#5eb0f8", "#7ca6d9", "#92a6cf", "#9fa9c4", "#c2afaa", "#dcb393", "#f1a877", "#ff9f4e", "#e67c49"]
const SKY: [number, string[]][] = [
    [0, ["#0b1030", "#161b4a", "#2a2d62"]], // night
    [4.5, ["#0b1030", "#161b4a", "#2a2d62"]],
    [6, ["#2d3a74", "#8070ab", "#f1926e"]], // dawn
    [7.5, MORNING], // morning (the design)
    [10, ["#3d8bf0", "#5fa3f1", "#8bbcf2"]], // midday
    [15, ["#3d8bf0", "#5fa3f1", "#8bbcf2"]],
    [17.5, ["#4a84dc", "#a2a6cc", "#f6b064"]], // golden hour
    [19.3, ["#384596", "#b06f98", "#f47a5c"]], // sunset
    [20.8, ["#1d2360", "#45397c", "#8d5784"]], // dusk
    [22.3, ["#0b1030", "#161b4a", "#2a2d62"]], // night
    [24, ["#0b1030", "#161b4a", "#2a2d62"]],
]

// sRGB hex <-> OKLab
const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toSrgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)
function hexToLab(hex: string): [number, number, number] {
    const n = parseInt(hex.slice(1), 16)
    const r = toLin(((n >> 16) & 255) / 255)
    const g = toLin(((n >> 8) & 255) / 255)
    const b = toLin((n & 255) / 255)
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    return [
        0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ]
}
function labToCss([L, a, b]: [number, number, number]) {
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
    const ch = [
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ].map((c) => Math.round(Math.min(1, Math.max(0, toSrgb(c))) * 255))
    return `rgb(${ch[0]}, ${ch[1]}, ${ch[2]})`
}
type Lab = [number, number, number]
const mix = (p: Lab, q: Lab, t: number): Lab => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t]
// top / middle / bottom -> a colour at each of the nine stops (middle at 52%)
const spread = (cs: Lab[]): Lab[] =>
    cs.length === STOPS.length
        ? cs
        : STOPS.map((pos) => {
              const t = Math.min(1, Math.max(0, pos / 100))
              return t < 0.52 ? mix(cs[0], cs[1], t / 0.52) : mix(cs[1], cs[2], (t - 0.52) / 0.48)
          })
const SKY_LAB = SKY.map(([h, cs]) => [h, spread(cs.map(hexToLab))] as [number, Lab[]])

// smoothstep, so each blend eases in and out of the moments instead of kinking at them
const ease = (t: number) => t * t * (3 - 2 * t)

function skyAt(hour: number): string {
    const h = ((hour % 24) + 24) % 24
    let i = 0
    while (i < SKY_LAB.length - 2 && SKY_LAB[i + 1][0] <= h) i++
    const [h0, a] = SKY_LAB[i]
    const [h1, b] = SKY_LAB[i + 1]
    const t = ease(h1 === h0 ? 0 : (h - h0) / (h1 - h0))
    return `linear-gradient(180deg, ${a.map((c, k) => `${labToCss(mix(c, b[k], t))} ${STOPS[k]}%`).join(", ")})`
}

// 0 outside the afternoon, 1 from 14:30 to 16:30, easing in from 13:30 and out by 17:30:
// when the sunlight shows
function sunAt(hour: number) {
    const h = ((hour % 24) + 24) % 24
    if (h < 13.5 || h > 17.5) return 0
    if (h < 14.5) return ease(h - 13.5)
    if (h > 16.5) return ease(17.5 - h)
    return 1
}

// 0 by day, 1 deep in the night (fades with dusk and dawn): when shooting stars may show
function nightAt(hour: number) {
    const h = ((hour % 24) + 24) % 24
    if (h >= 22 || h < 4.5) return 1
    if (h >= 20.5) return (h - 20.5) / 1.5
    if (h < 6) return 1 - (h - 4.5) / 1.5
    return 0
}

function greetingAt(hour: number) {
    const h = ((hour % 24) + 24) % 24
    if (h >= 5 && h < 12) return "Good morning"
    if (h >= 12 && h < 18) return "Good afternoon"
    if (h >= 18 && h < 22) return "Good evening"
    return "Good night"
}

const nowHour = () => {
    const d = new Date()
    return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600
}

interface Props {
    name: string
    balance: number
    change: number
    low: number
    high: number
    /** -1 = the viewer's own time; 0–24 shows that hour (for trying the gradients). */
    hour: number
    /** Seconds for a whole day to pass, to watch the gradients go round; 0 = real time. */
    dayPreview: number
    /** Little dots of stars at night: how many, how bright (0–1) and whether some twinkle. */
    stars: number
    starBrightness: number
    twinkle: boolean
    shootingStars: boolean
    /** Each time the widget comes into view the slider plays in: the track draws in from the
     *  left while the thumb slides to its place. Duration and delay in ms. */
    sliderIntro: boolean
    /** The price moves live: every `liveEvery` seconds (give or take) it drifts by up to
     *  `liveDrift` percent, pulled gently back towards where it started. Digits roll. */
    live: boolean
    liveEvery: number
    liveDrift: number
    sliderDuration: number
    sliderDelay: number
    /** The balance's dollar sign: size and the space after it, in design px. */
    dollarSize: number
    dollarGap: number
    /** Afternoon sunlight (about 14:00–17:00): a warm glow and soft rays from the top right. */
    sunShades: boolean
    /** 0–1 */
    sunStrength: number
    /** Seconds between shooting stars: a random wait between these two. */
    starEveryMin: number
    starEveryMax: number
    /** How long one takes to cross, in ms. */
    starDuration: number
    /** Length of its tail, in design px (the widget is 405 wide). */
    starLength: number
    fontFamily: string
    style?: CSSProperties
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */
export default function WalletWidget(props: Props) {
    const {
        name = "Pieter",
        balance = 4291.8,
        change = 3.2,
        low = 4096.53,
        high = 4342.72,
        hour = -1,
        dayPreview = 0,
        stars = 22,
        starBrightness = 0.8,
        twinkle = true,
        shootingStars = true,
        sliderIntro = true,
        live = true,
        liveEvery = 2.5,
        liveDrift = 0.12,
        sliderDuration = 1100,
        sliderDelay = 150,
        dollarSize = 25,
        dollarGap = 2,
        sunShades = true,
        sunStrength = 1,
        starEveryMin = 7,
        starEveryMax = 18,
        starDuration = 900,
        starLength = 60,
        fontFamily = "Geist, sans-serif", // the site's own font (the design's Aeonik can't be served without a web licence)
        style,
    } = props

    // the hour being shown, kept current: the real time is checked every 30 s (the colours
    // move so slowly that steps that size can't be seen); the day preview runs per frame
    const [shown, setShown] = useState(() => (hour >= 0 ? hour : nowHour()))
    useEffect(() => {
        if (hour >= 0 && !(dayPreview > 0)) {
            setShown(hour)
            return
        }
        if (dayPreview > 0) {
            let raf = 0
            const start = performance.now()
            const from = hour >= 0 ? hour : nowHour()
            const tick = (t: number) => {
                setShown((from + ((t - start) / 1000 / dayPreview) * 24) % 24)
                raf = requestAnimationFrame(tick)
            }
            raf = requestAnimationFrame(tick)
            return () => cancelAnimationFrame(raf)
        }
        const update = () => setShown(nowHour())
        update()
        const id = window.setInterval(update, 30_000)
        // back from a sleeping laptop or a background tab: catch up straight away
        document.addEventListener("visibilitychange", update)
        return () => {
            clearInterval(id)
            document.removeEventListener("visibilitychange", update)
        }
    }, [hour, dayPreview])

    const sky = skyAt(shown)
    const night = nightAt(shown)
    const sun = sunShades ? sunAt(shown) * sunStrength : 0

    // the night sky: plain dots scattered at random, new each visit; thinner towards the
    // bottom, where the horizon glow is, and kept off the text so none reads as a full stop.
    // Made once, the Stars setting shows the first n.
    const field = useMemo(
        () =>
            Array.from({ length: 60 }, () => {
                let x = 0
                let y = 0
                do {
                    x = 4 + Math.random() * (W - 8)
                    y = 4 + Math.random() ** 1.4 * 108
                } while ((x < 200 && y < 66) || y > 104) // greeting + balance, the low / high row
                return {
                    x,
                    y,
                    size: 0.6 + Math.random() ** 3 * 1.1,
                    alpha: 0.35 + Math.random() * 0.65 * (1 - y / H),
                    twinkles: Math.random() < 0.35,
                    period: 1.6 + Math.random() * 2.4,
                    phase: Math.random(),
                }
            }),
        [],
    )

    // ---- shooting stars ----
    const skyRef = useRef<HTMLDivElement>(null)
    const nightRef = useRef(night)
    nightRef.current = night
    const cfg = useRef({ starEveryMin, starEveryMax, starDuration, starLength })
    cfg.current = { starEveryMin, starEveryMax, starDuration, starLength }
    useEffect(() => {
        if (!shootingStars) return
        if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return
        let timer = 0
        let dead = false
        const schedule = () => {
            const c = cfg.current
            const lo = Math.max(0.5, Math.min(c.starEveryMin, c.starEveryMax))
            const hi = Math.max(lo, c.starEveryMax)
            timer = window.setTimeout(shoot, (lo + Math.random() * (hi - lo)) * 1000)
        }
        const shoot = () => {
            if (dead) return
            const sky = skyRef.current
            // only at night (more likely the darker it is), and not while nobody's looking
            if (sky && document.visibilityState === "visible" && Math.random() < nightRef.current) {
                const c = cfg.current
                const star = document.createElement("span")
                star.className = "wallet-widget__star"
                const len = (c.starLength * W) / 405 // tail length is set for the 405-wide card
                // starts in the empty sky top right and heads down and to the left, staying clear
                // of the greeting and the balance
                const x = 262 + Math.random() * 90
                const y = 5 + Math.random() * 22
                const angle = 152 + Math.random() * 12 // degrees (y points down): left and a little down
                const travel = 63 + Math.random() * 36
                const rad = (angle * Math.PI) / 180
                star.style.left = u(x - len) // its head (right end, which it turns around) at x, y
                star.style.top = u(y)
                star.style.width = u(len)
                star.style.transform = `rotate(${angle}deg)`
                sky.appendChild(star)
                const dx = Math.cos(rad) * travel
                const dy = Math.sin(rad) * travel
                const run = star.animate(
                    [
                        { transform: `translate(0, 0) rotate(${angle}deg) scaleX(0.2)`, opacity: 0 },
                        { opacity: 1, offset: 0.25 },
                        { opacity: 1, offset: 0.7 },
                        { transform: `translate(${u(dx)}, ${u(dy)}) rotate(${angle}deg) scaleX(1)`, opacity: 0 },
                    ],
                    { duration: c.starDuration, easing: "cubic-bezier(0.3, 0, 0.6, 1)" },
                )
                run.onfinish = () => star.remove()
            }
            schedule()
        }
        schedule()
        return () => {
            dead = true
            clearTimeout(timer)
            skyRef.current?.querySelectorAll(".wallet-widget__star").forEach((s) => s.remove())
        }
    }, [shootingStars])

    // ---- live price ----
    // a small random walk around the starting balance; a new low or high moves the 24h range
    const [price, setPrice] = useState({ balance, low, high })
    useEffect(() => setPrice({ balance, low, high }), [balance, low, high])
    const liveCfg = useRef({ liveEvery, liveDrift, balance })
    liveCfg.current = { liveEvery, liveDrift, balance }
    useEffect(() => {
        if (!live) return
        let timer = 0
        const tick = () => {
            const c = liveCfg.current
            if (document.visibilityState === "visible")
                setPrice((p) => {
                    const step = p.balance * (c.liveDrift / 100) * (Math.random() * 2 - 1)
                    const pull = (c.balance - p.balance) * 0.12
                    const b = Math.round((p.balance + step + pull) * 100) / 100
                    return { balance: b, low: Math.min(p.low, b), high: Math.max(p.high, b) }
                })
            timer = window.setTimeout(tick, c.liveEvery * 1000 * (0.6 + Math.random() * 0.8))
        }
        timer = window.setTimeout(tick, liveEvery * 1000)
        return () => clearTimeout(timer)
    }, [live])
    // today's change follows the balance (the opening price is fixed by the starting change)
    const open = balance / (1 + change / 100)
    const changeNow = Math.round((price.balance / open - 1) * 1000) / 10
    // the thumb sits on the track's brightest point; at the starting balance that's where the
    // design has it (70.4%), and it moves with the price from there
    const pos = (b: number, lo: number, hi: number) => (b - lo) / (hi - lo || 1)
    const at = Math.min(0.97, Math.max(0.03, 0.70448 + pos(price.balance, price.low, price.high) - pos(balance, low, high)))
    const atRef = useRef(at)
    atRef.current = at

    // ---- slider intro ----
    const trackRef = useRef<HTMLDivElement>(null)
    const thumbRef = useRef<HTMLImageElement>(null)
    const intro = useRef({ sliderDuration, sliderDelay })
    intro.current = { sliderDuration, sliderDelay }
    useEffect(() => {
        const track = trackRef.current
        const thumb = thumbRef.current
        if (!sliderIntro || !track || !thumb) return
        if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return
        let runs: Animation[] = []
        // the track draws in from the left; the mask reaches well past it above, below and on
        // the left, so the thumb (taller than the 2 px line, and starting half off its left
        // end) isn't cut by it
        const HIDDEN = "inset(-20px 100% -20px -20px)"
        const SHOWN = "inset(-20px 0% -20px -20px)"
        // waits hidden-at-the-start until it's in view (so it isn't played off screen)
        const reset = () => {
            runs.forEach((r) => r.cancel())
            track.style.clipPath = HIDDEN
            thumb.style.transform = `translateX(${-atRef.current * track.offsetWidth}px)`
            thumb.style.opacity = "0"
        }
        const play = () => {
            const { sliderDuration: d, sliderDelay: delay } = intro.current
            const ease = "cubic-bezier(0.22, 1, 0.36, 1)"
            track.style.clipPath = thumb.style.transform = thumb.style.opacity = ""
            runs = [
                track.animate([{ clipPath: HIDDEN }, { clipPath: SHOWN }], { duration: d * 1.15, delay, easing: ease, fill: "backwards" }),
                thumb.animate([{ transform: `translateX(${-atRef.current * track.offsetWidth}px)` }, { transform: "none" }], { duration: d, delay, easing: ease, fill: "backwards" }),
                thumb.animate([{ opacity: 0 }, { opacity: 1 }], { duration: d * 0.3, delay, easing: "ease-out", fill: "backwards" }),
            ]
        }
        reset()
        let shown = false
        const io = new IntersectionObserver(
            ([e]) => {
                // plays once, the first time it's (all but) fully on screen, so not while the
                // carousel is still bringing it in
                if (e.intersectionRatio >= 0.97 && !shown) {
                    shown = true
                    play()
                    io.disconnect()
                }
            },
            { threshold: [0, 0.97] },
        )
        io.observe(track.closest(".wallet-widget__card") ?? track)
        return () => {
            io.disconnect()
            runs.forEach((r) => r.cancel())
            track.style.clipPath = thumb.style.transform = thumb.style.opacity = ""
        }
    }, [sliderIntro])

    return (
        // the outer box is the container its units measure against; the card is inside it
        <div className="wallet-widget" style={{ ...style, width: "100%", containerType: "inline-size", fontFamily }}>
            <style>{CSS}</style>
            <div
                className="wallet-widget__card"
                style={{
                    aspectRatio: `${W} / ${H}`,
                    borderRadius: 25, // a fixed 25 px at every size (everything else scales)
                    // the 0.5 px #fff 50% stroke is drawn on top (::after), not as a border: a
                    // border lets the gradient repeat underneath it, so the top edge showed the
                    // bottom's orange
                    ["--ww-stroke" as any]: u(0.5),
                    padding: `${u(15)} ${u(15)} ${u(20)}`,
                    backgroundImage: sky,
                }}
            >
                {/* afternoon sun: a warm glow in the top right corner with a few soft rays
                    fanning out from it, swaying slowly; fades in and out with the afternoon */}
                {sun > 0 && (
                    <div className="wallet-widget__sun" style={{ opacity: sun }} aria-hidden="true">
                        <div className="wallet-widget__rays" />
                    </div>
                )}
                {/* the stars fade in with the night (their opacity follows how dark it is) */}
                <div className="wallet-widget__sky" style={{ opacity: night * starBrightness }} aria-hidden="true">
                    {field.slice(0, Math.max(0, Math.round(stars))).map((st, i) => (
                        <span
                            key={i}
                            className={"wallet-widget__dot" + (twinkle && st.twinkles ? " wallet-widget__dot--twinkle" : "")}
                            style={{
                                left: u(st.x),
                                top: u(st.y),
                                width: u(st.size),
                                height: u(st.size),
                                opacity: st.alpha,
                                animationDuration: `${st.period}s`,
                                animationDelay: `${-st.period * st.phase}s`,
                            }}
                        />
                    ))}
                </div>
                <div ref={skyRef} className="wallet-widget__sky" />

                <div className="wallet-widget__top" style={{ gap: u(7) }}>
                    <p className="wallet-widget__medium" style={{ fontSize: u(10), letterSpacing: u(-0.2) }}>
                        {greetingAt(shown)}, {name}.
                    </p>
                    <div className="wallet-widget__row" style={{ gap: u(5) }}>
                        <p className="wallet-widget__balance" style={{ letterSpacing: u(-0.72) }}>
                            <span style={{ fontSize: u(dollarSize), marginRight: u(dollarGap) }}>$</span>
                            <Money value={price.balance} style={{ fontSize: u(36) }} />
                        </p>
                        <div className="wallet-widget__change" style={{ gap: u(3) }}>
                            <img src="/media/wallet/change-arrow.svg" alt="" style={{ width: u(6.85355), height: u(6.85355), margin: `${u(-0.5)} ${u(-0.5)} ${u(-0.35)} ${u(-0.35)}` /* the design's 6 x 6 frame, the stroke overhanging it */ }} />
                            <p className="wallet-widget__medium" style={{ fontSize: u(11), letterSpacing: u(-0.22), lineHeight: 1.48, color: "#75f36a" }}>
                                <RollingNumber value={changeNow} locales="de-DE" format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }} motionBlur />%
                            </p>
                        </div>
                    </div>
                </div>

                <div className="wallet-widget__range" style={{ gap: u(5) }}>
                    <div className="wallet-widget__labels" style={{ fontSize: u(10), letterSpacing: u(-0.2) }}>
                        <p>24h low</p>
                        <p>24h high</p>
                    </div>
                    <div className="wallet-widget__row wallet-widget__row--centre" style={{ gap: u(5) }}>
                        <Price value={price.low} />
                        <div ref={trackRef} className="wallet-widget__track" style={{ height: u(2), ["--ww-at" as any]: at }}>
                            <img
                                ref={thumbRef}
                                className="wallet-widget__thumb"
                                src="/media/wallet/slider-thumb.svg"
                                alt=""
                                style={{ left: `calc(var(--ww-at) * 100% - ${u(4.5)})`, top: u(-5), width: u(9), height: u(12.1667) }}
                            />
                        </div>
                        <Price value={price.high} />
                    </div>
                </div>
            </div>
        </div>
    )
}

// "4,291" + dimmed ".80", each rolling to new values (two numbers so the cents can be dimmed)
function Money({ value, style }: { value: number; style?: CSSProperties }) {
    const cents = Math.round(value * 100)
    return (
        <>
            <RollingNumber value={Math.floor(cents / 100)} locales="en-US" format={{ maximumFractionDigits: 0 }} motionBlur style={style} />
            <span className="wallet-widget__dim" style={style}>
                .
                <RollingNumber value={cents % 100} locales="en-US" format={{ minimumIntegerDigits: 2, useGrouping: false }} motionBlur />
            </span>
        </>
    )
}

// "$ 4,096.53" at the ends of the slider, trimmed to its capitals like the design
function Price({ value }: { value: number }) {
    return (
        <p className="wallet-widget__medium wallet-widget__price" style={{ fontSize: u(11), letterSpacing: u(-0.22) }}>
            <span style={{ letterSpacing: u(-1.1) }}>{"$ "}</span>
            <Money value={value} />
        </p>
    )
}

const CSS = `
@property --ww-at { syntax: "<number>"; inherits: true; initial-value: 0.70448; }
.wallet-widget p { margin: 0; white-space: nowrap; }
.wallet-widget__card {
  position: relative; box-sizing: border-box; width: 100%; overflow: clip;
  display: flex; flex-direction: column; justify-content: space-between;
  color: #fff; font-weight: 400; line-height: 1; -webkit-font-smoothing: antialiased;
}
.wallet-widget__card::after {
  content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 2;
  box-shadow: inset 0 0 0 max(0.5px, var(--ww-stroke)) rgba(255, 255, 255, 0.5);
}
.wallet-widget__sky { position: absolute; inset: 0; pointer-events: none; }
.wallet-widget__sun {
  position: absolute; inset: 0; pointer-events: none; overflow: hidden; border-radius: inherit;
  mix-blend-mode: screen; /* light adds to the sky (warm on blue would turn grey) */
  background: radial-gradient(120% 95% at 100% 0%, rgba(255, 232, 170, 0.6) 0%, rgba(255, 220, 160, 0.24) 32%, rgba(255, 215, 150, 0) 64%);
}
.wallet-widget__rays {
  position: absolute; inset: -40%;
  background: conic-gradient(from 180deg at 88% 22%,
    transparent 0deg, rgba(255, 245, 215, 0.34) 7deg, transparent 15deg,
    transparent 24deg, rgba(255, 245, 215, 0.24) 30deg, transparent 37deg,
    transparent 48deg, rgba(255, 245, 215, 0.3) 55deg, transparent 63deg,
    transparent 74deg, rgba(255, 245, 215, 0.18) 79deg, transparent 86deg, transparent 360deg);
  -webkit-mask-image: radial-gradient(70% 70% at 88% 22%, #000 0%, rgba(0,0,0,0.5) 45%, transparent 80%);
  mask-image: radial-gradient(70% 70% at 88% 22%, #000 0%, rgba(0,0,0,0.5) 45%, transparent 80%);
  filter: blur(3px);
  transform-origin: 88% 22%;
  animation: wallet-widget-rays 14s ease-in-out infinite alternate;
}
@keyframes wallet-widget-rays { from { transform: rotate(-4deg); opacity: 0.85; } to { transform: rotate(4deg); opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .wallet-widget__rays { animation: none; } }
.wallet-widget__dot { position: absolute; border-radius: 50%; background: #fff; }
.wallet-widget__dot--twinkle { animation: wallet-widget-twinkle ease-in-out infinite alternate; }
@keyframes wallet-widget-twinkle { from { transform: scale(1); filter: brightness(1); } to { transform: scale(0.55); filter: brightness(0.6); } }
@media (prefers-reduced-motion: reduce) { .wallet-widget__dot--twinkle { animation: none; } }
.wallet-widget__medium { font-weight: 500; }
.wallet-widget__top, .wallet-widget__range { position: relative; display: flex; flex-direction: column; align-items: flex-start; }
.wallet-widget__range { align-items: stretch; }
.wallet-widget__row { display: flex; align-items: flex-end; }
.wallet-widget__row--centre { align-items: center; }
.wallet-widget__balance span { line-height: 1; }
.wallet-widget__dim { color: rgba(255, 255, 255, 0.4); }
.wallet-widget__change { display: flex; align-items: center; }
.wallet-widget__change img { display: block; flex: none; }
.wallet-widget__labels { display: flex; justify-content: space-between; }
.wallet-widget__price { text-box: trim-both cap alphabetic; }
.wallet-widget__track {
  position: relative; flex: 1 0 0; min-width: 1px;
  /* the design's glow, its brightest point following the thumb (--ww-at, 0.70448 in the design) */
  background-image: linear-gradient(90deg, rgba(255,255,255,0) 12.526%, rgba(255,255,255,0.236) calc(var(--ww-at) * 100% - 17.618%), rgba(255,255,255,0.566) calc(var(--ww-at) * 100% - 9.093%), #fff calc(var(--ww-at) * 100%), rgba(255,255,255,0.535) calc(var(--ww-at) * 100% + 6.82%), rgba(255,255,255,0) 100%);
  transition: --ww-at 900ms cubic-bezier(0.32, 0.72, 0, 1);
  box-shadow: 0 4px 50px rgba(144, 140, 144, 0.15);
  backdrop-filter: blur(0.5px);
}
.wallet-widget__thumb { position: absolute; display: block; max-width: none; }
/* a short streak: it's turned to face where it's going, so its right end is the bright
   head and the tail fades out behind it */
.wallet-widget__star {
  position: absolute; height: 1.2px; border-radius: 99px; transform-origin: 100% 50%;
  background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 82%, #fff 100%);
  box-shadow: 0 0 3px rgba(255,255,255,0.5);
  opacity: 0; pointer-events: none;
}
`

addPropertyControls(WalletWidget, {
    name: { type: ControlType.String, title: "Name", defaultValue: "Pieter" },
    balance: { type: ControlType.Number, title: "Balance", defaultValue: 4291.8, step: 0.01 },
    change: { type: ControlType.Number, title: "Change (%)", defaultValue: 3.2, step: 0.1 },
    low: { type: ControlType.Number, title: "24h low", defaultValue: 4096.53, step: 0.01 },
    high: { type: ControlType.Number, title: "24h high", defaultValue: 4342.72, step: 0.01 },
    dollarSize: { type: ControlType.Number, title: "Dollar sign size", defaultValue: 25, min: 10, max: 40, step: 0.5 },
    dollarGap: { type: ControlType.Number, title: "Dollar sign gap", defaultValue: 2, min: -2, max: 10, step: 0.25 },
    hour: { type: ControlType.Number, title: "Hour (-1 = live)", defaultValue: -1, min: -1, max: 24, step: 0.05 },
    dayPreview: { type: ControlType.Number, title: "Day preview (s per day, 0 = off)", defaultValue: 0, min: 0, max: 120, step: 1 },
    sunShades: { type: ControlType.Boolean, title: "Afternoon sun", defaultValue: true },
    sunStrength: { type: ControlType.Number, title: "Sun strength", defaultValue: 1, min: 0, max: 1, step: 0.05 },
    stars: { type: ControlType.Number, title: "Stars", defaultValue: 22, min: 0, max: 60, step: 1 },
    starBrightness: { type: ControlType.Number, title: "Star brightness", defaultValue: 0.8, min: 0, max: 1, step: 0.05 },
    twinkle: { type: ControlType.Boolean, title: "Twinkle", defaultValue: true },
    shootingStars: { type: ControlType.Boolean, title: "Shooting stars", defaultValue: true },
    sliderIntro: { type: ControlType.Boolean, title: "Slider plays in", defaultValue: true },
    live: { type: ControlType.Boolean, title: "Live price", defaultValue: true },
    liveEvery: { type: ControlType.Number, title: "Price moves every (s)", defaultValue: 2.5, min: 0.5, max: 15, step: 0.1 },
    liveDrift: { type: ControlType.Number, title: "Price move size (%)", defaultValue: 0.12, min: 0.01, max: 1, step: 0.01 },
    sliderDuration: { type: ControlType.Number, title: "Slider duration (ms)", defaultValue: 1100, min: 200, max: 3000, step: 50 },
    sliderDelay: { type: ControlType.Number, title: "Slider delay (ms)", defaultValue: 150, min: 0, max: 1500, step: 50 },
    starEveryMin: { type: ControlType.Number, title: "Star every (min s)", defaultValue: 7, min: 1, max: 60, step: 0.5 },
    starEveryMax: { type: ControlType.Number, title: "Star every (max s)", defaultValue: 18, min: 1, max: 120, step: 0.5 },
    starDuration: { type: ControlType.Number, title: "Star duration (ms)", defaultValue: 900, min: 200, max: 3000, step: 50 },
    starLength: { type: ControlType.Number, title: "Star tail length", defaultValue: 60, min: 10, max: 160, step: 1 },
})
