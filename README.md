# griep.design

Pieter Griep's portfolio, rebuilt from the Framer project "Portfolio New" as a
static Astro site with React islands, hosted on Cloudflare.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # outputs to dist/
```

## Publish

```bash
npm run deploy     # builds, then uploads dist/ to Cloudflare
```

Hosted on Cloudflare as static files (a Worker with static assets only, no
server code), configured in `wrangler.jsonc`. `public/_headers` sets long
caching for media/fonts/scripts and `public/_redirects` sends the old
`/home-old` page to `/`. Test address:
https://griep-design.griep-design.workers.dev

## Where things live

| What | File |
| --- | --- |
| Page structure and all text | `src/pages/index.astro` |
| All styling (desktop, tablet, phone) | `src/styles/global.css` |
| Work carousel (snap, buttons, trackpad, touch, badges) | `src/scripts/carousel.ts` |
| Email copy + "Visca el Barça" easter egg | `src/scripts/footer.ts` |
| Custom cursor | `src/scripts/cursor.ts` |
| Footer fade-in | `src/scripts/appear.ts` |
| Interactive cards (File Explorer, Gas, Swap, Dust) | `src/components/islands/` |
| Their settings per breakpoint (exported from Framer) | `src/data/instances.json` |
| Images, videos, icons | `public/media/` |

Breakpoints are the Framer ones: desktop ≥ 1200px, tablet 810–1199px,
phone < 810px. The interactive cards load only when they scroll into view.

The card components were written as Framer code components and run unchanged:
`src/lib/framer-shim.ts` stands in for Framer's helpers, and
`src/lib/controls.ts` turns the settings Framer saved into props.
