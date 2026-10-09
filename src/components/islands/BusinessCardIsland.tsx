import BusinessCard from "./BusinessCard"

// Renders in the browser only (client:visible), centred in its card like the other islands.
// The business card shrinks to fit narrower cards on its own (max-width: 100%).
// Islands default to Geist (global.css); the card is set in the site's own Inter Display.
export default function BusinessCardIsland() {
    return (
        <div className="island-root">
            <BusinessCard fontFamily="'Inter Display', sans-serif" />
        </div>
    )
}
