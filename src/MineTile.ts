import { Automator } from './Automator'
import { CATEGORIES, GROUPS, RESOURCE_TYPES, TILE_TYPES } from './consts'
import { Resource } from './Resource'
import Tile from './Tile'
import { Upgrade } from './Upgrade'
import { isLucky, pick } from './utils'

// Mine stuff
// Mines work different from forests, each stage has levels. The first stage has one level, the second has 3, the third has Infinite
// The first stage uses dugPower and only has one level but should require like 50 clicks to get to the next stage
// The second stage is when a mine has openened, but to be able to go deeper, wood is required, because you need to build support beams (250 wood per level)
// The third stage is when you can mine for resources. Once the third stage is reached it is a fully operational mine.
// Automators for the mine: Auto Excavator, Auto Tunneler, Auto Diamond Miner
const MINE_TILE_TYPES = {
    rock: 'rock',
    tunnel: 'tunnel',
    resource: 'resource'
}
const MINE_EXCAVATOR_POWER = 1 / 50 // 50 clicks to get to the next stage
const MINE_TUNNELER_POWER = 1 / 100
const MINE_SUPPORT_BEAM_COST = 100 // wood
const MINE_RESOURCE_ICONS: Record<string, string> = {
    diamond: '💎',
    metal: '🔧',
    clay: '🏺'
}
const MINE_RESOURCE_OPENING_LEVELS: Record<string, number> = {
    diamond: 1,
    metal: 1,
    clay: 1
}
const MINE_RESOURCE_TUNNELING_LEVELS: Record<string, number> = {
    diamond: 3,
    metal: 1,
    clay: 1
}
const MINE_MAX_RESOURCES_PER_LEVEL: Record<string, number> = {
    diamond: 5,
    metal: 10,
    clay: 25
}
const MINE_RESOURCE_CLICKS: Record<string, number> = {
    diamond: 200,
    metal: 100,
    clay: 50
}

const DIAMOND_PRICE_BASE = 5_000
const METAL_PRICE_BASE = 500
const CLAY_PRICE_BASE = 150

const DIAMONDS_STORAGE_SIZE = 3
const METAL_STORAGE_SIZE = 10
const CLAY_STORAGE_SIZE = 50

const LUCKY_RESOURCE_MINE_CHANCE = 1 / 10

export class MineTile extends Tile implements ITile {
    static readonly type = TILE_TYPES.mine

    type: string
    subType: string
    tunnelProblem: boolean
    constructor(app: IApp, subType: string) {
        super(app, MineTile.type)
        this.type = MINE_TILE_TYPES.rock
        this.subType = subType
        this.tunnelProblem = false
    }
    update() {
        this.stageP = this.progress
    }
    sell() {
        let upgrade = ''
        // Determine which upgrade bought this tile
        switch (this.subType) {
            case RESOURCE_TYPES.clay:
                upgrade = 'Clay Mine Tile'
                break
            case RESOURCE_TYPES.metal:
                upgrade = 'Metal Mine Tile'
                break
            case RESOURCE_TYPES.diamond:
                upgrade = 'Diamond Mine Tile'
                break
            default:
                console.error('sell: Unknown resource type:', this.subType)
                return
        }
        this.app.boughtUpgrades[upgrade] -= 1
    }
    dig(manual = false) {
        this.progress += this.excavatorPower
        if (this.progress >= 1) {
            this.stage += 1
            this.progress = 0
            if (this.stage >= MINE_RESOURCE_OPENING_LEVELS[this.subType]) {
                this.stage = 0
                this.type = MINE_TILE_TYPES.tunnel
                if (manual) {
                    this.app.showMessage('Mine entrance opened!')
                }
                this.app.stats.minesOwned += 1
            }
        }
    }
    tunnel(manual = false) {
        this.progress += this.tunnelerPower
        this.animateWiggle()
        this.tunnelProblem = false
        if (this.progress >= 1) {
            if (this.app.resources.wood.incur(MINE_SUPPORT_BEAM_COST)) {
                this.stage += 1
                this.progress = 0
                this.app.stats.tunnelsDug += 1
                if (this.stage >= MINE_RESOURCE_TUNNELING_LEVELS[this.subType]) {
                    this.stage = 0
                    this.type = MINE_TILE_TYPES.resource
                    if (manual) {
                        this.app.showMessage(`Cave full of ${this.subType} found!`)
                    }
                } else if (manual) {
                    this.app.showMessage(`Support beams built with ${this.app.num(MINE_SUPPORT_BEAM_COST)} wood!`)
                }
            } else {
                this.animateFail()
                this.tunnelProblem = true
                if (manual) {
                    this.app.showMessage(
                        `Not enough wood to build support beams! You need ${this.app.num(
                            MINE_SUPPORT_BEAM_COST
                        )} wood to continue tunneling.`
                    )
                }
            }
        }
    }
    mine(manual = false) {
        this.progress += this.resourceMinerPower / MINE_RESOURCE_CLICKS[this.subType]
        this.animateWiggle()
        if (this.progress >= 1) {
            this.progress = 0
            this.stage += 1
            this.app.stats.resourcesMined += 1
            let resource = this.app.resources[this.subType]
            if (!resource) {
                console.error('mine: Unknown resource type:', this.subType)
                return
            }
            resource.gain(1)
            // If max amount of resources per cave is reached, go back to tunneling
            if (this.stage >= MINE_MAX_RESOURCES_PER_LEVEL[this.subType]) {
                this.stage = 0
                this.type = MINE_TILE_TYPES.tunnel
                if (manual) {
                    this.app.showMessage('Resource cave depleted! Time to dig deeper.')
                }
            }
        }
    }
    click(manual = false) {
        switch (this.type) {
            case MINE_TILE_TYPES.rock:
                this.dig(manual)
                break
            case MINE_TILE_TYPES.tunnel:
                this.tunnel(manual)
                break
            case MINE_TILE_TYPES.resource:
                this.mine(manual)
                break
            default:
                console.error('Unknown Mine tile type:', this.type)
                break
        }
    }
    get level() {
        switch (this.type) {
            case MINE_TILE_TYPES.rock:
                return MINE_RESOURCE_OPENING_LEVELS[this.subType] > 1
                    ? MINE_RESOURCE_OPENING_LEVELS[this.subType] - this.stage
                    : null
            case MINE_TILE_TYPES.tunnel:
                return MINE_RESOURCE_TUNNELING_LEVELS[this.subType] > 1
                    ? MINE_RESOURCE_TUNNELING_LEVELS[this.subType] - this.stage
                    : null
            case MINE_TILE_TYPES.resource:
                return MINE_MAX_RESOURCES_PER_LEVEL[this.subType] - this.stage
            default:
                return null
        }
    }
    get icon() {
        switch (this.type) {
            case MINE_TILE_TYPES.rock:
                return '⛰️'
            case MINE_TILE_TYPES.tunnel:
                return '⛏️'
            case MINE_TILE_TYPES.resource:
                return MINE_RESOURCE_ICONS[this.subType]
            default:
                return '❓'
        }
    }
    get tooltip() {
        switch (this.type) {
            case MINE_TILE_TYPES.rock:
                return `Rock - click to dig an entrance for a mine (${this.subType})`
            case MINE_TILE_TYPES.tunnel:
                if (this.tunnelProblem) {
                    return `Not enough wood to build support beams! You need ${this.app.num(
                        MINE_SUPPORT_BEAM_COST
                    )} wood to continue tunneling.`
                }
                return `Mine Tunnel (${this.subType}) - at level ${this.stage} of ${
                    MINE_RESOURCE_TUNNELING_LEVELS[this.subType]
                } - click to dig deeper`
            case MINE_TILE_TYPES.resource:
                return `Mine (${this.subType}) - click to mine resources - found resources: ${this.stage} of ${
                    MINE_MAX_RESOURCES_PER_LEVEL[this.subType]
                }`
            default:
                return 'Unknown mine tile'
        }
    }
    get iconTopLeft() {
        if (this.type === MINE_TILE_TYPES.rock || this.type === MINE_TILE_TYPES.tunnel) {
            return MINE_RESOURCE_ICONS[this.subType]
        }
        return null
    }
    get excavatorPower() {
        return MINE_EXCAVATOR_POWER * (this.app.boughtUpgrades['Shovel'] + 1)
    }
    get tunnelerPower() {
        return MINE_TUNNELER_POWER * (this.app.boughtUpgrades['Tunneling'] + 1)
    }
    get resourceMinerPower() {
        return this.app.boughtUpgrades['Pickaxe'] + 1
    }

    static hasTile(app: IApp) {
        return app.land.some(tile => tile.tileType === MineTile.type)
    }
    static hasClayMineTile(app: IApp) {
        return app.land.some(tile => tile instanceof MineTile && tile.subType === RESOURCE_TYPES.clay)
    }
    static hasMetalMineTile(app: IApp) {
        return app.land.some(tile => tile instanceof MineTile && tile.subType === RESOURCE_TYPES.metal)
    }
    static hasDiamondMineTile(app: IApp) {
        return app.land.some(tile => tile instanceof MineTile && tile.subType === RESOURCE_TYPES.diamond)
    }

    static readonly resources = [
        new Resource(RESOURCE_TYPES.clay, {
            displayNameSingular: 'Clay',
            displayNamePlural: 'Clay',
            icon: '🏺',
            basePrice: CLAY_PRICE_BASE,
            storageBaseSize: CLAY_STORAGE_SIZE
        }),
        new Resource(RESOURCE_TYPES.metal, {
            displayNameSingular: 'Metal',
            displayNamePlural: 'Metal',
            icon: '🔧',
            basePrice: METAL_PRICE_BASE,
            storageBaseSize: METAL_STORAGE_SIZE
        }),
        new Resource(RESOURCE_TYPES.diamond, {
            displayNameSingular: 'Diamond',
            displayNamePlural: 'Diamonds',
            icon: '💎',
            basePrice: DIAMOND_PRICE_BASE,
            storageBaseSize: DIAMONDS_STORAGE_SIZE
        })
    ]

    static readonly automators = [
        new Automator('Auto Shoveler', app => {
            const tile = pick(
                app.land.filter(tile => tile instanceof MineTile && tile.type === MINE_TILE_TYPES.rock) as MineTile[]
            )
            if (tile) {
                tile.dig()
            }
        }),
        new Automator('Tunneler', app => {
            const tile = pick(
                app.land.filter(tile => tile instanceof MineTile && tile.type === MINE_TILE_TYPES.tunnel) as MineTile[]
            )
            if (tile) {
                tile.tunnel()
            }
        }),
        new Automator('Resource Miner', app => {
            const resourceTiles = app.land.filter(
                tile => tile instanceof MineTile && tile.type === MINE_TILE_TYPES.resource
            ) as MineTile[]
            const tile = pick(resourceTiles)
            if (!tile) {
                return
            }
            tile.mine()

            // The more resource miners, the higher the chance of mining the same tile again
            resourceTiles.forEach(tile => {
                if (isLucky(LUCKY_RESOURCE_MINE_CHANCE)) {
                    tile.mine()
                }
            })
        }),
        new Automator('Metal Seller', app => {
            app.sellResource(app.resources.metal, 1)
        }),
        new Automator('Metal Reclaimer', app => {
            app.resources.metal.reclaim(1)
        }),
        new Automator('Diamond Seller', app => {
            app.sellResource(app.resources.diamond, 1)
        }),
        new Automator('Diamond Reclaimer', app => {
            app.resources.diamond.reclaim(1)
        }),
        new Automator('Clay Seller', app => {
            app.sellResource(app.resources.clay, 1)
        }),
        new Automator('Clay Reclaimer', app => {
            app.resources.clay.reclaim(1)
        })
    ]

    static readonly upgrades: Upgrade[] = [
        new Upgrade({
            name: 'Shovel',
            displayName: 'Bigger Excavator',
            description: 'Trade your excavator for a bigger one to dig an entrance for a mine',
            baseCost: 10000,
            costMultiplier: 1.5,
            category: CATEGORIES.tools,
            group: GROUPS.mine,
            isVisible: () => false
        }),
        new Upgrade({
            name: 'Tunneling',
            displayName: 'Improved Tunneling',
            description: 'Research improved tunneling techniques',
            baseCost: 10000,
            costMultiplier: 1.75,
            category: CATEGORIES.tools,
            group: GROUPS.mine,
            isVisible: MineTile.hasTile
        }),
        new Upgrade({
            name: 'Pickaxe',
            displayName: 'Harden Pickaxe',
            description: 'Mine resources faster with a hardened pickaxe',
            baseCost: 10000,
            costMultiplier: 2,
            category: CATEGORIES.tools,
            group: GROUPS.mine,
            isVisible: MineTile.hasTile
        }),
        // Land
        new Upgrade({
            name: 'Clay Mine Tile',
            tile: true,
            description: 'Claim a tile of land to dig for clay',
            baseCost: 1500,
            costMultiplier: 1.25,
            category: CATEGORIES.tiles,
            group: GROUPS.mine,
            resourceCosts: {
                [RESOURCE_TYPES.wood]: 25
            },
            onBuy(app: IApp) {
                app.addTile(new MineTile(app, RESOURCE_TYPES.clay))
            }
        }),
        new Upgrade({
            name: 'Metal Mine Tile',
            tile: true,
            description: 'Claim a tile of land to dig for metal',
            baseCost: 2000,
            costMultiplier: 1.25,
            category: CATEGORIES.tiles,
            group: GROUPS.mine,
            resourceCosts: {
                [RESOURCE_TYPES.wood]: 50
            },
            onBuy(app: IApp) {
                app.addTile(new MineTile(app, RESOURCE_TYPES.metal))
            }
        }),
        new Upgrade({
            name: 'Diamond Mine Tile',
            tile: true,
            description: 'Claim a tile of land to dig for diamonds',
            baseCost: 5000,
            costMultiplier: 1.25,
            category: CATEGORIES.tiles,
            group: GROUPS.mine,
            resourceCosts: {
                [RESOURCE_TYPES.wood]: 100,
                [RESOURCE_TYPES.metal]: 10
            },
            onBuy(app: IApp) {
                app.addTile(new MineTile(app, RESOURCE_TYPES.diamond))
            }
        }),
        // Storage
        new Upgrade({
            name: 'Clay Storage',
            displayName: 'Clay Pot',
            description: 'Increase the amount of clay you can store',
            initialOwned: 1,
            baseCost: 5000,
            costMultiplier: 1.5,
            category: CATEGORIES.storage,
            group: GROUPS.mine,
            onBuy(app: IApp) {
                app.resources.clay.storage += 1
            },
            isVisible: MineTile.hasClayMineTile
        }),
        new Upgrade({
            name: 'Metal Storage',
            displayName: 'Metal Crate',
            description: 'Increase the amount of metal you can store',
            initialOwned: 1,
            baseCost: 5000,
            costMultiplier: 2,
            category: CATEGORIES.storage,
            group: GROUPS.mine,
            onBuy(app: IApp) {
                app.resources.metal.storage += 1
            },
            isVisible: MineTile.hasMetalMineTile
        }),
        new Upgrade({
            name: 'Diamond Storage',
            displayName: 'Diamond Box',
            description: 'Increase the amount of diamonds you can store',
            initialOwned: 1,
            baseCost: 12_500,
            costMultiplier: 2,
            category: CATEGORIES.storage,
            group: GROUPS.mine,
            onBuy(app: IApp) {
                app.resources.diamond.storage += 1
            },
            isVisible: MineTile.hasDiamondMineTile
        }),
        // Automation
        Upgrade.createAutomator({
            name: 'Resource Miner',
            description: 'Automatically mine resources',
            baseCost: 5000,
            costMultiplier: 1.2,
            speed: 1,
            group: GROUPS.mine,
            isVisible: MineTile.hasTile
        }),
        Upgrade.createAutomator({
            name: 'Tunneler',
            description: 'Automatically dig tunnels through rocks while building support beams',
            baseCost: 7500,
            costMultiplier: 1.2,
            speed: 1,
            group: GROUPS.mine,
            isVisible: MineTile.hasTile
        }),
        Upgrade.createAutomator({
            name: 'Auto Shoveler',
            displayName: 'Auto Mine Maker',
            description:
                'Automatically dig rocks to make an opening for a mine shaft. Probably not the wisest investment',
            baseCost: 14000,
            costMultiplier: 1.2,
            speed: 1,
            group: GROUPS.mine,
            isVisible: MineTile.hasTile
        }),
        Upgrade.createAutomator({
            name: 'Metal Seller',
            description: 'Automatically sell metal',
            baseCost: 15_000,
            costMultiplier: 1.2,
            speed: 1 / 30,
            group: GROUPS.mine,
            isVisible: MineTile.hasMetalMineTile
        }),
        Upgrade.createAutomator({
            name: 'Metal Reclaimer',
            displayName: 'Metal Detector',
            description: 'Send out a metal detector to find lost metal in your mine',
            baseCost: 20_000,
            costMultiplier: 1.2,
            speed: 1 / 60,
            group: GROUPS.mine,
            isVisible: MineTile.hasMetalMineTile
        }),
        Upgrade.createAutomator({
            name: 'Clay Seller',
            description: 'Automatically sell clay',
            baseCost: 12_000,
            costMultiplier: 1.2,
            speed: 1 / 10,
            group: GROUPS.mine,
            isVisible: MineTile.hasClayMineTile
        }),
        Upgrade.createAutomator({
            name: 'Clay Reclaimer',
            displayName: 'Clay Collector',
            description: 'Send out a clay collector to find lost clay in your mine',
            baseCost: 14_000,
            costMultiplier: 1.2,
            speed: 1 / 10,
            group: GROUPS.mine,
            isVisible: MineTile.hasClayMineTile
        }),
        Upgrade.createAutomator({
            name: 'Diamond Seller',
            description: 'Automatically sell diamonds',
            baseCost: 20_000,
            costMultiplier: 1.2,
            speed: 1 / 60,
            group: GROUPS.mine,
            isVisible: MineTile.hasDiamondMineTile
        }),
        Upgrade.createAutomator({
            name: 'Diamond Reclaimer',
            displayName: 'Mine Magpie',
            description:
                'Send a magpie into your caves to find the diamonds you haphazardly dropped all over the place',
            baseCost: 50_000,
            costMultiplier: 1.2,
            speed: 1 / 90,
            group: GROUPS.mine,
            isVisible: MineTile.hasDiamondMineTile
        }),
        // Special upgrades
        new Upgrade({
            name: 'Diamond Marketing 1',
            displayName: 'Diamond Polishing',
            description: 'Give diamonds a shiny polish and increase their price by 1.5x',
            baseCost: 50_000,
            category: CATEGORIES.special,
            max: 1,
            group: GROUPS.mine,
            onBuy(app: IApp) {
                app.resources.diamond.priceMultiplier *= 1.5
            },
            isVisible: MineTile.hasDiamondMineTile
        }),
        new Upgrade({
            name: 'Diamond Marketing 2',
            displayName: 'Diamond Shine',
            description: 'Give diamonds an even shinier polish and increase their price by 2x',
            baseCost: 150_000,
            category: CATEGORIES.special,
            max: 1,
            group: GROUPS.mine,
            onBuy(app: IApp) {
                app.resources.diamond.priceMultiplier *= 2
            },
            isVisible: MineTile.hasDiamondMineTile
        })
    ]
}
