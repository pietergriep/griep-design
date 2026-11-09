// The case study over the page (components/CaseStudy.astro): "Case study" opens it,
// Back, Escape or a click beside the sheet closes it. The page behind blurs and dims
// (the dialog's own background) and stops scrolling while it's open. Inside, the text's
// parts open one at a time.
const OUT_MS = 200 // matches the closing transition in global.css
// the opening transition (on phones the page fades out first, so it starts 120ms later):
// the cards start over only after it, so it runs smoothly
const IN_MS = () => (matchMedia("(max-width: 809.98px)").matches ? 370 : 250)

document.querySelectorAll<HTMLButtonElement>("[data-case-open]").forEach((btn) => {
    const dialog = document.getElementById(btn.dataset.caseOpen!) as HTMLDialogElement | null
    if (!dialog) return
    let timer = 0
    const parts = Array.from(dialog.querySelectorAll<HTMLButtonElement>("[data-case-part]"))
    const setPart = (part: HTMLButtonElement, open: boolean) => {
        part.closest(".case-part")?.classList.toggle("is-open", open)
        part.setAttribute("aria-expanded", String(open))
    }

    const close = () => {
        if (!dialog.open || dialog.classList.contains("is-closing")) return
        dialog.classList.add("is-closing")
        dialog.classList.remove("is-in")
        clearTimeout(timer) // closed before the cards started over: they don't
        timer = window.setTimeout(() => {
            dialog.classList.remove("is-closing")
            dialog.close()
            delete dialog.dataset.ready
            // the cards empty out while it's closed (see WorkloadCase)
            window.dispatchEvent(new CustomEvent("case-study-close"))
        }, OUT_MS)
    }
    // Closed with the keyboard, the focus goes back to "Case study"; closed with a tap or a
    // click it doesn't (a phone would show it selected, with a focus ring)
    let byKeyboard = false
    dialog.addEventListener("keydown", () => (byKeyboard = true))
    dialog.addEventListener("pointerdown", () => (byKeyboard = false))
    dialog.addEventListener("close", () => {
        document.documentElement.classList.remove("case-open")
        if (byKeyboard) btn.focus({ preventScroll: true })
        else btn.blur() // the dialog itself hands the focus back to the button that opened it
    })

    btn.addEventListener("click", () => {
        clearTimeout(timer)
        byKeyboard = false
        dialog.classList.remove("is-closing")
        document.documentElement.classList.add("case-open")
        dialog.showModal()
        // the sheet takes the focus, not the first button (Back would show a focus ring);
        // Tab still goes to Back first
        dialog.querySelector<HTMLElement>(".case-sheet")?.focus({ preventScroll: true })
        dialog.querySelectorAll<HTMLElement>(".case-sheet, .case-media, .case-text").forEach((el) => (el.scrollTop = 0))
        // fresh every time: the text is back on its first part, and the cards start over once
        // the sheet has faded in (building them is heavy; during the fade a phone stutters)
        parts.forEach((part, i) => setPart(part, i === 0))
        timer = window.setTimeout(() => {
            dialog.dataset.ready = "" // for cards that hydrate later (see WorkloadCase)
            window.dispatchEvent(new CustomEvent("case-study-open"))
        }, IN_MS())
        // the closed look is drawn once first, so the fade always plays (from display: none,
        // one frame isn't always enough)
        void dialog.offsetWidth
        requestAnimationFrame(() => requestAnimationFrame(() => dialog.classList.add("is-in")))
    })
    // Escape: the same fade out instead of closing at once
    dialog.addEventListener("cancel", (e) => {
        e.preventDefault()
        close()
    })
    dialog.querySelectorAll("[data-case-close]").forEach((el) => el.addEventListener("click", close))
    // a click on the blurred page around the sheet
    dialog.addEventListener("click", (e) => {
        if (e.target === dialog) close()
    })

    // The wheel over the text scrolls the images, unless the open part is taller than the
    // sheet: then the text scrolls on its own (see .case-text). On phones the whole sheet
    // scrolls instead.
    const media = dialog.querySelector<HTMLElement>(".case-media")
    const text = dialog.querySelector<HTMLElement>(".case-text")
    text?.addEventListener(
        "wheel",
        (e) => {
            const we = e as WheelEvent
            if (text.scrollHeight > text.clientHeight + 1 && getComputedStyle(text).overflowY !== "visible") return
            if (!media || media.scrollHeight <= media.clientHeight || getComputedStyle(media).overflowY === "visible") return
            we.preventDefault()
            media.scrollTop += we.deltaMode === 1 ? we.deltaY * 16 : we.deltaY
        },
        { passive: false },
    )

    // Phones: the height animation (grid rows) redoes the whole sheet's layout every frame,
    // and stutters. There the parts switch at once and everything that moves glides there
    // with a transform instead (FLIP); the closing text fades out where it was, the opening
    // text fades in.
    const FLIP_MS = 300
    const FLIP_EASE = "cubic-bezier(0.23, 1, 0.32, 1)"
    const sections = Array.from(dialog.querySelectorAll<HTMLElement>(".case-part"))
    const flipTo = (part: HTMLButtonElement) => {
        const target = part.closest<HTMLElement>(".case-part")
        if (!target || target.classList.contains("is-open")) return
        const moving = [...sections, media].filter((el): el is HTMLElement => !!el)
        const before = moving.map((el) => el.getBoundingClientRect().top)
        // the text that closes: a copy stays where it was and fades out
        for (const sec of sections) {
            if (!sec.classList.contains("is-open")) continue
            const body = sec.querySelector<HTMLElement>(".case-part-body")
            if (!body) continue
            const r = body.getBoundingClientRect()
            // the whole body, so its paragraphs keep their type (.case-part-body p)
            const ghost = body.cloneNode(true) as HTMLElement
            Object.assign(ghost.style, { position: "fixed", left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, display: "block", opacity: "1", transition: "none", margin: "0", pointerEvents: "none", overflow: "hidden" })
            dialog.append(ghost)
            ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: "ease-out", fill: "forwards" }).finished.then(() => ghost.remove(), () => ghost.remove())
        }
        dialog.classList.add("case-instant")
        parts.forEach((other) => setPart(other, other === part))
        moving.forEach((el, i) => {
            const dy = before[i] - el.getBoundingClientRect().top
            if (Math.abs(dy) > 0.5) el.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: FLIP_MS, easing: FLIP_EASE })
        })
        target.querySelector<HTMLElement>(".case-part-body > div")?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, delay: 80, easing: "ease-out", fill: "backwards" })
        requestAnimationFrame(() => dialog.classList.remove("case-instant"))
    }
    const phone = () => matchMedia("(max-width: 809.98px)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches
    parts.forEach((part) =>
        part.addEventListener("click", () => (phone() ? flipTo(part) : parts.forEach((other) => setPart(other, other === part)))),
    )
})
