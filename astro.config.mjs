// @ts-check
import { defineConfig } from "astro/config"
import react from "@astrojs/react"
import { fileURLToPath } from "node:url"
import { readFileSync, writeFileSync } from "node:fs"

// Dev server only: the tuning panel (src/scripts/tune.ts) saves a component's
// settings here, into src/data/instances.json, for every breakpoint.
const tuneSave = {
    name: "tune-save",
    configureServer(server) {
        server.middlewares.use("/__tune/save", (req, res) => {
            if (req.method !== "POST") return (res.statusCode = 405), res.end()
            let body = ""
            req.on("data", (c) => (body += c))
            req.on("end", () => {
                try {
                    // breakpoints: which sizes to write ("all" by default)
                    const { island, values, breakpoints } = JSON.parse(body)
                    // the cursor's colours have their own small file
                    if (island === "Cursor") {
                        const cf = fileURLToPath(new URL("./src/data/cursor.json", import.meta.url))
                        const cur = JSON.parse(readFileSync(cf, "utf8"))
                        writeFileSync(cf, JSON.stringify({ ...cur, ...values }, null, 1) + "\n")
                        return res.end("ok")
                    }
                    const file = fileURLToPath(new URL("./src/data/instances.json", import.meta.url))
                    const data = JSON.parse(readFileSync(file, "utf8"))
                    if (!data[island]) throw new Error("unknown island " + island)
                    for (const [bp, variant] of Object.entries(data[island])) {
                        if (Array.isArray(breakpoints) && !breakpoints.includes(bp)) continue
                        for (const [k, v] of Object.entries(values)) variant.raw[k] = String(v)
                    }
                    writeFileSync(file, JSON.stringify(data, null, 1) + "\n")
                    res.end("ok")
                } catch (e) {
                    res.statusCode = 400
                    res.end(String(e))
                }
            })
        })
    },
}

// Dev server only: tuning pages, left out of builds (localhost:4322/tune/wallet, /tune/tasks, /tune/swap, /tune/grid)
const tunePages = {
    name: "tune-pages",
    hooks: {
        "astro:config:setup": ({ command, injectRoute }) => {
            if (command !== "dev") return
            injectRoute({ pattern: "/tune/wallet", entrypoint: fileURLToPath(new URL("./src/dev/wallet.astro", import.meta.url)) })
            injectRoute({ pattern: "/tune/tasks", entrypoint: fileURLToPath(new URL("./src/dev/tasks.astro", import.meta.url)) })
            injectRoute({ pattern: "/tune/swap", entrypoint: fileURLToPath(new URL("./src/dev/swap.astro", import.meta.url)) })
            injectRoute({ pattern: "/tune/grid", entrypoint: fileURLToPath(new URL("./src/dev/grid.astro", import.meta.url)) })
        },
    },
}

// client:near (src/lib/near-directive.ts): the carousel's cards start just before they
// scroll in, while the row is at rest, instead of mid-swipe
const nearDirective = {
    name: "near-directive",
    hooks: {
        "astro:config:setup": ({ addClientDirective }) => {
            addClientDirective({ name: "near", entrypoint: fileURLToPath(new URL("./src/lib/near-directive.ts", import.meta.url)) })
        },
    },
}

// https://astro.build/config
// A fully static site: `astro build` writes plain files to dist/, which Cloudflare serves as-is.
export default defineConfig({
    site: "https://griep.design",
    integrations: [react(), tunePages, nearDirective],
    // the dev toolbar would cover the preview; the site never shows it
    devToolbar: { enabled: false },
    vite: {
        plugins: [tuneSave],
        optimizeDeps: {
            include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime", "@kitlangton/rolling-number/react"],
        },
        resolve: {
            // the components were written for Framer: "framer" resolves to a small stand-in
            alias: { framer: fileURLToPath(new URL("./src/lib/framer-shim.ts", import.meta.url)) },
        },
    },
})
