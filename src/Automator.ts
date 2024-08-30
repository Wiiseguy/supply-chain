export class Automator {
    enabled: boolean
    saturation: number
    upgradeName: string
    logic: (app: IApp) => void
    speed: number
    constructor(upgradeName: string, logic: (app: IApp) => void) {
        this.enabled = true
        this.saturation = 0
        this.upgradeName = upgradeName // To determine the amount via boughtUpgrades
        this.logic = logic
        this.speed = 0 // Calculated
    }
    run(app: IApp, elapsed: number) {
        if (!this.enabled) return
        const upgrade = app.UPGRADES_INDEX[this.upgradeName]
        const num = app.boughtUpgrades[this.upgradeName]
        if (num > 0) {
            const speed = (upgrade?.speed ?? 1) * num
            this.saturation += speed * elapsed
            this.speed = speed
            while (this.saturation >= 1) {
                this.saturation -= 1
                this.logic(app)
            }
        }
    }
}
