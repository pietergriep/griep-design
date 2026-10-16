import Component from "./DCAFlow"
import { makeIsland } from "../../lib/island"

// The DCA auto-buy flow (from Downloads/DCAFlow.tsx), in the card that used to hold
// its screen recording. Settings live in data/instances.json ("DCAFlow"); tune them
// on the dev server with ?tune=dca.
export default makeIsland(Component, "DCAFlow")
