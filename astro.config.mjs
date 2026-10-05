// @ts-check
import { defineConfig } from "astro/config"
import react from "@astrojs/react"
import { fileURLToPath } from "node:url"

// https://astro.build/config
// A fully static site: `astro build` writes plain files to dist/, which Cloudflare serves as-is.
export default defineConfig({
    site: "https://griep.design",
    integrations: [react()],
    // the dev toolbar would cover the preview; the site never shows it
    devToolbar: { enabled: false },
    vite: {
        optimizeDeps: {
            include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime", "@kitlangton/rolling-number/react"],
        },
        resolve: {
            // the components were written for Framer: "framer" resolves to a small stand-in
            alias: { framer: fileURLToPath(new URL("./src/lib/framer-shim.ts", import.meta.url)) },
        },
    },
})
