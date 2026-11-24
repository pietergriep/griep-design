## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Pointers
- Live: griep.design (Cloudflare Worker). Deploy only when Pieter says "npm run deploy": `npm run deploy`, then commit + push.
- Dev server: preview "griep-design", port 4322. Tune pages: /tune/tasks (Activities today, panel id tasks-today-62), /tune/wallet, /tune/swap, /tune/grid (Workload 2x2 agents exploration, GridTune.tsx) (dev only, injected in astro.config.mjs).
- Case study: src/components/CaseStudy.astro (Workload, 3 parts), logic in src/scripts/case-study.ts, cards in WeeklyUsageIsland.tsx (WorkloadCase).
- Carousel: src/scripts/carousel.ts. griep.design/?wheellog records wheel events (Copy log button) for debugging scroll on other machines.

## Decisions
- Copy must be honest: Pieter designs, Claude writes the code. Never claim he codes by hand ("build them into working interfaces").
- Carousel: pinned to page scroll again (2026-11-23, SCROLL_DRIVEN true): scrolling anywhere moves the cards, the work sticks until the last card, then the page carries on; arrows scroll the page to a card; phones keep the finger swipe. Pinned, the row is a ScrollTimeline animation (linkToScroll), so Safari moves it in the same frame as the page (from the scroll event it trailed a frame and stuttered). Windows touchpads: all pixel input glides (TOUCHPAD_EASE_MS 140), axis locked per gesture.
- Carousel performance: cards use client:near (src/lib/near-directive.ts): script loads when a card is a window-width away, the component starts when the row is at rest (carousel.ts sets data-carousel-moving / fires carousel:rest). Settles (snap/step/fling) are Web Animations (compositor). .card has content-visibility: auto, so off-screen cards don't render. Loops in React cards pause while their card is off screen (src/lib/on-screen.ts: Workload progress, gas prices; Route finder holds its next step), else they stutter whichever card is in view (e.g. the DCA sheet). Measure with a production build (preview "griep-build", port 4323), not the dev server.
- Activities today (TasksToday.tsx): live countdown that moves on to the next activity; "3 / 6" count chip in desktop px scaled with the card; day-sentence intro tried and switched off (Day.show). Hover: whole card scales (Motion.hoverScale 1.01, hoverMs 120), willChange transform so text doesn't glitch; no lift, and not fill-only.

## Log
- 2026-11-09: Session wrap. Shipped: carousel scroll fixes (Mac + Windows, via ?wheellog logs), case study phone fixes (fade only, FLIP for parts, cards hydrate on idle), wallet sky softer except morning/midday, Activities today rename + countdown + count chip + phone in-view intro. Last commit 8bc4af9.
- Next: long case studies for interviews (Rikin on X asked for longer case studies; possible apprenticeship). Order: expand Workload, then a new Swap card case study (many iterations), File Explorer undecided. Interview Pieter per project and draft from his answers; don't invent the story.
- 2026-11-23: Activities today hover = scale instead of lift, Pieter's tuned defaults; deployed, commit fe18a5b. Uncommitted WIP (neutral on live, deployed anyway): /tune/grid 2x2 Workload exploration (GridTune.tsx, grid.astro, WeeklyUsageCard projectFolder/agentColumns etc., SITE_DESIGN export, AGENTS.md copy of these notes).
- Next: performance pass on the homepage carousel. Pieter: "quite a bit of loading going on in the carrousel which makes it stutter". Measure first (island hydration timing, long tasks, layout/paint while scrolling the carousel), then fix.
- 2026-11-23: Carousel performance pass (uncommitted, not deployed). Swipe-pause test at 4x CPU slowdown: frames over 25 ms 28 -> 4, worst 550 -> 100 ms. Fixes: business card loop stops off-screen, TasksToday drops DialKit on the built site (chunk 320 -> 186 KB), content-visibility on cards, compositor settles, cached row width, client:near.
