// Fade elements marked .appear in once they are fully in view (Framer's appear
// effect on the footer: threshold 1, plays once).
const items = document.querySelectorAll<HTMLElement>(".appear")
const io = new IntersectionObserver(
    (entries) => {
        for (const e of entries) {
            if (!e.isIntersecting) continue
            e.target.classList.add("in")
            io.unobserve(e.target)
        }
    },
    { threshold: 0.99 }
)
items.forEach((el) => io.observe(el))
