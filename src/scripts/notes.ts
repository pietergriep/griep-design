// Opens / closes the "Learn more" notes under the carousel cards, and tells the card
// (some cards also come apart into their layers then, see xray.ts). Only one note is
// open at a time: opening one closes whichever was open.
const notes = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-work-note]"))

const setOpen = (btn: HTMLButtonElement, open: boolean) => {
    const note = btn.closest(".work-note")
    if (!note || note.classList.contains("is-open") === open) return
    note.classList.toggle("is-open", open)
    btn.setAttribute("aria-expanded", String(open))
    const label = btn.querySelector(".work-note-label")
    if (label) label.textContent = open ? "Close" : "Learn more"
    btn.closest(".work-item")?.querySelector(".card")?.dispatchEvent(new CustomEvent("xray", { detail: { open } }))
}

notes.forEach((btn) => {
    btn.addEventListener("click", () => {
        const open = !btn.closest(".work-note")?.classList.contains("is-open")
        if (open) notes.forEach((other) => other !== btn && setOpen(other, false))
        setOpen(btn, open)
    })
})
