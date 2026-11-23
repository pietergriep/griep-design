// lets .astro files use client:near (src/lib/near-directive.ts) without a type error
declare module "astro" {
    interface AstroClientDirectives {
        "client:near"?: boolean
    }
}
export {}
