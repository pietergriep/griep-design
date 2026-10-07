// Opens / closes the "About this" notes under the carousel cards.
document.querySelectorAll<HTMLButtonElement>("[data-work-note]").forEach((btn) => {
    const note = btn.closest(".work-note")
    const label = btn.querySelector(".work-note-label")
    btn.addEventListener("click", () => {
        const open = !note?.classList.contains("is-open")
        note?.classList.toggle("is-open", open)
        btn.setAttribute("aria-expanded", String(open))
        if (label) label.textContent = open ? "Close" : "About this"
    })
})
