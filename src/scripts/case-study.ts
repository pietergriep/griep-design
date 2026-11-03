// The case study over the page (components/CaseStudy.astro): "Case study" opens it,
// Back, Escape or a click beside the sheet closes it. The page behind blurs and dims
// (the dialog's own background) and stops scrolling while it's open. Inside, the text's
// parts open one at a time.
const OUT_MS = 200 // matches the closing transition in global.css

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
        timer = window.setTimeout(() => {
            dialog.classList.remove("is-closing")
            dialog.close()
        }, OUT_MS)
    }
    dialog.addEventListener("close", () => {
        document.documentElement.classList.remove("case-open")
        btn.focus({ preventScroll: true })
    })

    btn.addEventListener("click", () => {
        clearTimeout(timer)
        dialog.classList.remove("is-closing")
        document.documentElement.classList.add("case-open")
        dialog.showModal()
        dialog.querySelectorAll<HTMLElement>(".case-sheet, .case-media").forEach((el) => (el.scrollTop = 0))
        // fresh every time: the cards start over and the text is back on its first part
        window.dispatchEvent(new CustomEvent("case-study-open"))
        parts.forEach((part, i) => setPart(part, i === 0))
        requestAnimationFrame(() => dialog.classList.add("is-in"))
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

    // The wheel over the text's buttons scrolls the images too (the rest of the text lets
    // the wheel through to them, see .case-text). On phones the whole sheet scrolls instead.
    const media = dialog.querySelector<HTMLElement>(".case-media")
    dialog.querySelector(".case-text")?.addEventListener(
        "wheel",
        (e) => {
            const we = e as WheelEvent
            if (!media || media.scrollHeight <= media.clientHeight || getComputedStyle(media).overflowY === "visible") return
            we.preventDefault()
            media.scrollTop += we.deltaMode === 1 ? we.deltaY * 16 : we.deltaY
        },
        { passive: false },
    )

    parts.forEach((part) => part.addEventListener("click", () => parts.forEach((other) => setPart(other, other === part))))
})
