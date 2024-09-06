import type { Upgrade } from './Upgrade'

export class Automator {
    enabled: boolean
    saturation: number
    upgradeName: string
    logic: (app: IApp) => void
    speed: number
    noPower: boolean
    powerUsage: number
    upgrade?: Upgrade
    constructor(upgradeName: string, logic: (app: IApp) => void) {
        this.enabled = true
        this.saturation = 0
        this.upgradeName = upgradeName // To determine the amount via boughtUpgrades
        this.logic = logic
        this.speed = 0 // Calculated
        this.noPower = false // Calculated
        this.powerUsage = 0 // Calculated
    }
    initialize(app: IApp) {
        this.upgrade = app.UPGRADES_INDEX[this.upgradeName] as Upgrade
        if (!this.upgrade) {
            console.error(`Upgrade ${this.upgradeName} not found for automator ${this.constructor.name}`)
        }
    }
    run(app: IApp, elapsed: number): boolean {
        if (!this.enabled) return true
        const upgrade = this.upgrade
        if (!upgrade) return true
        const num = app.boughtUpgrades[this.upgradeName]
        this.noPower = false
        this.powerUsage = 0
        if (num > 0) {
            let energy = (upgrade.energyCost ?? 0) * elapsed * num
            // Use up some energy resource
            if (!app.resources.energy.incur(energy)) {
                this.noPower = true
                return false // Not enough energy
            }

            this.powerUsage = (upgrade.energyCost ?? 0) * num

            const speed = (upgrade.speed ?? 1) * num
            this.saturation += speed * elapsed
            this.speed = speed

            if (this.saturation >= 1) {
                this.saturation -= 1
                this.logic(app)
            }
        }
        return true
    }
    getSaveData(): Record<string, any> {
        return {
            upgradeName: this.upgradeName,
            enabled: this.enabled,
            saturation: this.saturation
        }
    }
    loadSaveData(data: Record<string, any>) {
        // No need for upgradeName
        this.enabled = data.enabled
        this.saturation = data.saturation
    }

    static createSeller(upgradeName: string) {
        const seller = new Automator(upgradeName, app => {
            if (!seller.upgrade?.resourcesSold) return
            for (const resourceName of seller.upgrade?.resourcesSold) {
                const resource = app.resources[resourceName]
                if (!resource) {
                    console.error(`Resource ${resourceName} not found for seller automator ${upgradeName}`)
                }
                app.sellResource(resource, 1)
            }
        })
        return seller
    }
}
