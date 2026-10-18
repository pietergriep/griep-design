// The interactive cards render in the browser once they scroll (or slide) into
// view (client:visible). Left alone, that's also when their code starts to
// download, so a card would sit empty for a moment and then pop in. Once the page
// has settled, this fetches every card's code in the background, so a card can
// draw the moment it shows. It only warms the browser's module cache: each card
// still starts (and plays its intro) when it comes into view.

const warm = () => {
    const urls = new Set<string>()
    document.querySelectorAll("astro-island").forEach((island) => {
        for (const attr of ["component-url", "renderer-url"]) {
            const url = island.getAttribute(attr)
            if (url) urls.add(new URL(url, document.baseURI).href)
        }
    })
    urls.forEach((url) => import(/* @vite-ignore */ url).catch(() => {}))
}

const idle = (fn: () => void) =>
    "requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 300)

if (document.readyState === "complete") idle(warm)
else addEventListener("load", () => idle(warm), { once: true })
