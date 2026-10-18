// The note under each carousel card. Closed, it's a "Learn more" pill: the panel
// sized down to its first tab. Clicking it grows the panel to its full size,
// revealing the Details tab, Close and the text. The dark bar under the tabs is as
// wide as the active tab's label and slides to whichever one is picked. The card
// is told when the note opens or closes (some cards come apart then, see xray.ts).
// Only one note is open at a time: opening one closes whichever was open.
const closers = new Map<HTMLElement, () => void>()

document.querySelectorAll<HTMLElement>(".work-note").forEach((note) => {
    const tabs = Array.from(note.querySelectorAll<HTMLButtonElement>(".wn-tab"))
    const pages = Array.from(note.querySelectorAll<HTMLElement>(".wn-page"))
    const bar = note.querySelector<HTMLElement>(".wn-bar")
    const close = note.querySelector<HTMLButtonElement>(".wn-close")
    const head = note.querySelector<HTMLElement>(".wn-head")
    const panel = note.querySelector<HTMLElement>(".wn-panel")
    let active = 0

    // the closed pill: the first tab plus the head's padding either side of it
    const measure = () => {
        const first = tabs[0]
        if (!first || !head) return
        const left = first.getBoundingClientRect().left - head.getBoundingClientRect().left
        const pillW = left * 2 + first.offsetWidth
        const pillH = head.offsetHeight - (parseFloat(getComputedStyle(head).paddingTop) || 0) // the tab row, without the space above it
        note.style.setProperty("--pill-w", `${pillW}px`)
        note.style.setProperty("--pill-h", `${pillH}px`)
        // the open panel's size: as wide as the note, as tall as the tab being shown;
        // the space below the card is kept for the tallest tab, so the page never moves
        const inner = note.querySelector<HTMLElement>(".wn-inner")
        if (inner) {
            note.style.setProperty("--wn-w", `${note.clientWidth}px`)
            note.style.setProperty("--wn-note-h", `${inner.offsetHeight + 10}px`) // + the gap above (see .wn-panel)
            note.classList.add("wn-ready")
        }
        sizeToTab()
        placeBar()
    }
    const sizeToTab = () => {
        const page = pages[active]
        if (head && page) note.style.setProperty("--wn-h", `${head.offsetHeight + page.offsetHeight}px`)
    }
    const placeBar = () => {
        const tab = tabs[active]
        if (!bar || !tab) return
        bar.style.width = `${tab.offsetWidth}px`
        bar.style.transform = `translateX(${tab.offsetLeft - tabs[0].offsetLeft}px)`
    }
    const select = (i: number) => {
        active = i
        tabs.forEach((t, j) => {
            t.classList.toggle("is-active", j === i)
            t.setAttribute("aria-selected", String(j === i))
        })
        pages.forEach((p, j) => p.classList.toggle("is-active", j === i))
        sizeToTab()
        placeBar()
        announce()
    }
    // the Analyse tab (analyse.ts) runs while it's the tab showing in an open note
    const announce = () =>
        note.dispatchEvent(new CustomEvent("note:tab", { detail: { tab: active, open: note.classList.contains("is-open") } }))
    // while closed, only the pill can be reached (by mouse, keyboard or screen reader)
    const setOpen = (open: boolean) => {
        const changed = note.classList.contains("is-open") !== open
        if (open) closers.forEach((closeOther, other) => other !== note && other.classList.contains("is-open") && closeOther())
        note.classList.toggle("is-open", open)
        tabs[0].setAttribute("aria-expanded", String(open))
        ;[...tabs.slice(1), close].forEach((el) => el && (el.tabIndex = open ? 0 : -1))
        pages.forEach((p) => p.toggleAttribute("inert", !open))
        if (!open) select(0)
        if (changed) note.closest(".work-item")?.querySelector(".card")?.dispatchEvent(new CustomEvent("xray", { detail: { open } }))
        if (changed) announce()
    }

    tabs.forEach((tab, i) =>
        tab.addEventListener("click", () => {
            if (!note.classList.contains("is-open")) setOpen(true)
            else select(i)
        }),
    )
    close?.addEventListener("click", () => setOpen(false))
    // the closed pill presses in while held, like the carousel buttons (carousel.ts)
    tabs[0].addEventListener("pointerdown", () => {
        if (!panel || note.classList.contains("is-open")) return
        panel.classList.add("pressed")
        const release = () => {
            panel.classList.remove("pressed")
            removeEventListener("pointerup", release)
            removeEventListener("pointercancel", release)
        }
        addEventListener("pointerup", release)
        addEventListener("pointercancel", release)
    })
    note.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && note.classList.contains("is-open")) {
            setOpen(false)
            tabs[0].focus()
        }
    })

    closers.set(note, () => setOpen(false))
    setOpen(false)
    measure()
    new ResizeObserver(measure).observe(note)
    document.fonts?.ready.then(measure)
})
