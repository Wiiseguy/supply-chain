import { UPGRADES_INDEX } from './upgrades.js'

export class Automator {
    constructor(upgradeName, logic) {
        this.enabled = true
        this.saturation = 0
        this.upgradeName = upgradeName // To determine the amount via boughtUpgrades
        this.logic = logic
        this.speed = 0 // Calculated
        this.displayName = UPGRADES_INDEX[upgradeName].displayName ?? upgradeName
    }
    get name() {
        return this.displayName
    }
}
