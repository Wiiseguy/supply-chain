export class Automator {
    constructor(upgradeName, logic) {
        this.enabled = true
        this.saturation = 0
        this.upgradeName = upgradeName // To determine the amount via boughtUpgrades
        this.logic = logic
        this.speed = 0 // Calculated
    }
    run(app, elapsed) {
        if (!this.enabled) return
        const num = app.boughtUpgrades[this.upgradeName]
        if (num > 0) {
            const speed = app.UPGRADES_INDEX[this.upgradeName].speed * num
            this.saturation += speed * elapsed
            this.speed = speed
            while (this.saturation >= 1) {
                this.saturation -= 1
                this.logic(app)
            }
        }
    }
}
