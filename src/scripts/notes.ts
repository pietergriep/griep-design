// Opens / closes the "Learn more" notes under the carousel cards, and tells the card
// (some cards also come apart into their layers then, see xray.ts).
document.querySelectorAll<HTMLButtonElement>("[data-work-note]").forEach((btn) => {
    const note = btn.closest(".work-note")
    const label = btn.querySelector(".work-note-label")
    btn.addEventListener("click", () => {
        const open = !note?.classList.contains("is-open")
        note?.classList.toggle("is-open", open)
        btn.setAttribute("aria-expanded", String(open))
        if (label) label.textContent = open ? "Close" : "Learn more"
        btn.closest(".work-item")?.querySelector(".card")?.dispatchEvent(new CustomEvent("xray", { detail: { open } }))
    })
})
