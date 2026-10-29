// The intro has two texts in one spot: the story ("…on the other side of the
// process") and the process (Figma, then Claude). The underlined words swap between
// them: "process" shows how, "where I started" goes back to the story. The texts share one
// grid cell, so the intro keeps the height of the taller one and nothing below moves;
// the swap is a fade with a slight blur, like the footer's email (footer.ts).

const box = document.querySelector<HTMLElement>(".taglines")
box?.querySelectorAll<HTMLButtonElement>("[data-show]").forEach((link) =>
    link.addEventListener("click", () => {
        const next = link.dataset.show
        box.querySelectorAll<HTMLElement>("[data-tagline]").forEach((text) => {
            const shown = text.dataset.tagline === next
            text.classList.toggle("is-shown", shown)
            text.toggleAttribute("inert", !shown)
            text.setAttribute("aria-hidden", String(!shown))
        })
        // keyboard users land on the link that leads back
        box.querySelector<HTMLButtonElement>(`[data-tagline="${next}"] [data-show]`)?.focus({ preventScroll: true })
    }),
)
