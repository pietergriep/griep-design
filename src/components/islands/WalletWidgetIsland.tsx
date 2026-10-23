import Component from "./WalletWidget"
import { makeIsland } from "../../lib/island"

// The time-of-day portfolio widget, in the card that used to hold its screenshot.
// Settings live in data/instances.json ("WalletWidget"); tune them on the dev server
// with ?tune=wallet. Set in Geist, the site's own font.
export default makeIsland(Component, "WalletWidget")
