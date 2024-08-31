import { CATEGORIES } from './consts'

interface IUpgradeSettings {
    name: string
    displayName?: string
    description: string
    baseCost: number
    costMultiplier?: number
    max?: number
    category?: string
    isVisible?: (app: IApp) => boolean
    onBuy?: (app: IApp) => void
    tile?: boolean
    resourceCosts?: Record<string, number>
    initialOwned?: number
    group: string
    speed?: number // Used by automator upgrades
    automator?: boolean
    energyCost?: number
}

export class Upgrade {
    name: string
    displayName?: string
    description: string
    baseCost: number
    costMultiplier: number
    max: number
    category: string
    isVisible: (app: IApp) => boolean
    onBuy: (app: IApp) => void
    tile: boolean
    resourceCosts: Record<string, number>
    initialOwned: number
    group: string
    speed?: number
    automator?: boolean
    energyCost?: number

    constructor(upgrade: IUpgradeSettings) {
        if (!upgrade.name) console.error('Upgrade name is required')
        if (upgrade.initialOwned === 0)
            console.error(upgrade.name, 'initialOwned is 0 - please remove it because it is the default value')
        if ('speed' in upgrade && upgrade.speed === undefined)
            console.error(upgrade.name, 'speed is undefined - please remove it')
        this.name = upgrade.name
        this.displayName = upgrade.displayName ?? upgrade.name
        this.description = upgrade.description
        this.baseCost = upgrade.baseCost
        this.costMultiplier = upgrade.costMultiplier ?? 1.2
        this.max = upgrade.max ?? Infinity
        this.category = upgrade.category ?? ''
        this.isVisible = upgrade.isVisible || (() => true)
        this.onBuy = upgrade.onBuy || (() => {})
        this.tile = upgrade.tile || false
        this.resourceCosts = upgrade.resourceCosts || {}
        this.initialOwned = upgrade.initialOwned ?? 0
        this.group = upgrade.group
        this.speed = upgrade.speed ?? 1
        this.automator = upgrade.automator || false
        this.energyCost = upgrade.energyCost ?? 0.01
    }

    static createAutomator(opts: IUpgradeSettings) {
        if (opts.category) console.error('Automator upgrades should not have a category as it is always overridden')
        return new Upgrade({
            costMultiplier: 1.5,
            speed: 1,
            category: CATEGORIES.automation,
            ...opts,
            isVisible: (app: IApp) =>
                (opts.isVisible ? opts.isVisible(app) : true) && app.boughtUpgrades[opts.name] == 0,
            automator: true
        })
    }
}
