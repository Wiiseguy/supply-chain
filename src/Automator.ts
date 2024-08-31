export class Automator {
    enabled: boolean
    saturation: number
    upgradeName: string
    logic: (app: IApp) => void
    speed: number
    noPower: boolean
    constructor(upgradeName: string, logic: (app: IApp) => void) {
        this.enabled = true
        this.saturation = 0
        this.upgradeName = upgradeName // To determine the amount via boughtUpgrades
        this.logic = logic
        this.speed = 0 // Calculated
        this.noPower = false
    }
    run(app: IApp, elapsed: number): boolean {
        if (!this.enabled) return true
        const upgrade = app.UPGRADES_INDEX[this.upgradeName]
        if (!upgrade) return true
        const num = app.boughtUpgrades[this.upgradeName]
        if (num > 0) {
            const speed = (upgrade.speed ?? 1) * num
            this.saturation += speed * elapsed
            this.speed = speed
            this.noPower = false
            // Use up some energy resource
            if (!app.resources.energy.incur((upgrade.energyCost ?? 0) * elapsed * num)) {
                this.noPower = true
                return false // Not enough energy
            }

            if (this.saturation >= 1) {
                this.saturation -= 1
                this.logic(app)
            }
        }
        return true
    }
}
