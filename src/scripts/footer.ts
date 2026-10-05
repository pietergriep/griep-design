// Footer label swaps (ported from the Framer override CopyEmail.tsx):
//   the email copies the address and briefly shows "Email copied!"
//   "Barcelona, Spain" briefly shows "Visca el Barça" (an easter egg)
// The label fades (and slightly blurs) out, changes, and fades back in, and the
// element keeps its width the whole time so nothing next to it shifts. While the
// alternate label shows, the hover dim is off (.swapped), so the confirmation
// always reads at full colour.

const FADE_MS = 300 // each fade out / fade in
const HOLD_MS = 1600 // how long the swapped label stays readable
const COPIED_LABEL = "Email copied!"
const EASTER_EGG_LABEL = "Visca el Barça"

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches

function labelSwap(button: HTMLElement, alternate: string) {
    const label = button.querySelector<HTMLElement>(".swap-label")
    if (!label) return () => {}
    const original = label.textContent || ""
    let showing = false
    let timers: number[] = []
    const after = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))
    const clear = () => {
        timers.forEach(clearTimeout)
        timers = []
    }
    label.style.transitionDuration = `${reduced() ? 0 : FADE_MS}ms`

    const fadeBack = () => {
        const fade = reduced() ? 0 : FADE_MS
        label.classList.add("hidden")
        after(fade, () => {
            label.textContent = original
            showing = false
            button.classList.remove("swapped")
            label.classList.remove("hidden")
            after(fade, () => (button.style.width = ""))
        })
    }

    return () => {
        clear()
        const fade = reduced() ? 0 : FADE_MS
        // hold the current width so a shorter label doesn't pull things in
        if (!button.style.width) button.style.width = button.getBoundingClientRect().width + "px"
        if (showing) {
            after(HOLD_MS, fadeBack) // clicked again: keep it up a little longer
            return
        }
        label.classList.add("hidden")
        after(fade, () => {
            label.textContent = alternate
            showing = true
            button.classList.add("swapped")
            label.classList.remove("hidden")
            after(fade + HOLD_MS, fadeBack)
        })
    }
}

async function copyText(value: string) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(value)
            return true
        }
    } catch {}
    const field = document.createElement("textarea")
    field.value = value
    field.setAttribute("readonly", "")
    field.style.position = "fixed"
    field.style.opacity = "0"
    document.body.appendChild(field)
    field.select()
    let ok = false
    try {
        ok = document.execCommand("copy")
    } catch {}
    field.remove()
    return ok
}

document.querySelectorAll<HTMLElement>("[data-copy-email]").forEach((button) => {
    const swap = labelSwap(button, COPIED_LABEL)
    button.addEventListener("click", async () => {
        if (await copyText(button.dataset.copyEmail || "")) swap()
    })
})

document.querySelectorAll<HTMLElement>("[data-visca-barca]").forEach((button) => {
    const swap = labelSwap(button, EASTER_EGG_LABEL)
    button.addEventListener("click", swap)
})
