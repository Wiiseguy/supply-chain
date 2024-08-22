import { Automator } from './Automator.js'
import { CATEGORIES, GROUPS, RESOURCE_TYPES, TILE_TYPES } from './consts.js'
import { Resource } from './Resource.js'
import Tile from './Tile.js'
import { isLucky, pick } from './utils.js'

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
const MINE_SUPPORT_BEAM_COST = 200 // wood
const MINE_RESOURCE_ICONS = {
    diamond: '💎',
    metal: '🔧',
    clay: '🏺'
}
const MINE_RESOURCE_OPENING_LEVELS = {
    diamond: 1,
    metal: 1,
    clay: 1
}
const MINE_RESOURCE_TUNNELING_LEVELS = {
    diamond: 3,
    metal: 1,
    clay: 1
}
const MINE_MAX_RESOURCES_PER_LEVEL = {
    diamond: 5,
    metal: 10,
    clay: 25
}
const MINE_RESOURCE_CLICKS = {
    diamond: 200,
    metal: 75,
    clay: 50
}

const DIAMOND_PRICE_BASE = 5_000
const METAL_PRICE_BASE = 500
const CLAY_PRICE_BASE = 200

const DIAMONDS_STORAGE_SIZE = 1
const METAL_STORAGE_SIZE = 10
const CLAY_STORAGE_SIZE = 25

const LUCKY_RESOURCE_MINE_CHANCE = 1 / 10

export class MineTile extends Tile {
    static type = TILE_TYPES.mine

    constructor(app, subType) {
        super(app, MineTile.type)
        this.type = MINE_TILE_TYPES.rock
        this.subType = subType
    }
    update(_elapsed) {
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
    dig() {
        this.progress += this.excavatorPower
        if (this.progress >= 1) {
            this.stage += 1
            this.progress = 0
            if (this.stage >= MINE_RESOURCE_OPENING_LEVELS[this.subType]) {
                this.stage = 0
                this.type = MINE_TILE_TYPES.tunnel
                this.app.showMessage('Mine entrance opened!')
                this.app.stats.minesOwned += 1
            }
        }
    }
    tunnel() {
        this.progress += this.tunnelerPower
        this.animateWiggle()
        if (this.progress >= 1) {
            if (this.app.resources.wood.incur(MINE_SUPPORT_BEAM_COST)) {
                this.stage += 1
                this.progress = 0
                this.app.stats.tunnelsDug += 1
                if (this.stage >= MINE_RESOURCE_TUNNELING_LEVELS[this.subType]) {
                    this.stage = 0
                    this.type = MINE_TILE_TYPES.resource
                    this.app.showMessage(`Cave full of ${this.subType} found!`)
                } else {
                    this.app.showMessage(`Support beams built with ${this.app.num(MINE_SUPPORT_BEAM_COST)} wood!`)
                }
            } else {
                this.animateFail()
                this.app.showMessage(
                    `Not enough wood to build support beams! You need ${this.app.num(
                        MINE_SUPPORT_BEAM_COST
                    )} wood to continue tunneling.`
                )
            }
        }
    }
    mine() {
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
                this.app.showMessage('Resource cave depleted! Time to dig deeper.')
            }
        }
    }
    click() {
        switch (this.type) {
            case MINE_TILE_TYPES.rock:
                this.dig()
                break
            case MINE_TILE_TYPES.tunnel:
                this.tunnel()
                break
            case MINE_TILE_TYPES.resource:
                this.mine()
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
        // Show the type of resource in the bottom right corner in the rock and tunnel stages
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

    static hasTile(app) {
        return app.land.some(tile => tile.tileType === MineTile.type)
    }

    static resources = [
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

    static automators = [
        new Automator('Auto Shoveler', app => {
            const tile = pick(app.mineLand.filter(tile => tile.type === MINE_TILE_TYPES.rock))
            if (tile) {
                tile.dig()
            }
        }),
        new Automator('Tunneler', app => {
            const tile = pick(app.mineLand.filter(tile => tile.type === MINE_TILE_TYPES.tunnel))
            if (tile) {
                tile.tunnel()
            }
        }),
        new Automator('Resource Miner', app => {
            const resourceTiles = app.mineLand.filter(tile => tile.type === MINE_TILE_TYPES.resource)
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
        })
    ]

    static upgrades = [
        {
            name: 'Shovel',
            displayName: 'Bigger Excavator',
            description: 'Trade your excavator for a bigger one to dig an entrance for a mine',
            initialOwned: 0,
            baseCost: 10000,
            costMultiplier: 1.5,
            speed: undefined,
            category: CATEGORIES.tools,
            group: GROUPS.mine,
            isVisible: MineTile.hasTile
        },
        {
            name: 'Tunneling',
            displayName: 'Improved Tunneling',
            description: 'Research improved tunneling techniques',
            initialOwned: 0,
            baseCost: 10000,
            costMultiplier: 1.75,
            speed: undefined,
            category: CATEGORIES.tools,
            group: GROUPS.mine,
            isVisible: MineTile.hasTile
        },
        {
            name: 'Pickaxe',
            displayName: 'Harden Pickaxe',
            description: 'Mine resources faster with a hardened pickaxe',
            initialOwned: 0,
            baseCost: 10000,
            costMultiplier: 2,
            speed: undefined,
            category: CATEGORIES.tools,
            group: GROUPS.mine,
            isVisible: MineTile.hasTile
        },
        // Land
        {
            name: 'Clay Mine Tile',
            tile: true,
            description: 'Claim a tile of land to dig for clay',
            initialOwned: 0,
            baseCost: 1500,
            costMultiplier: 1.25,
            speed: undefined,
            category: CATEGORIES.tiles,
            group: GROUPS.mine,
            resourceCosts: {
                [RESOURCE_TYPES.wood]: 25
            },
            onBuy(app) {
                app.addTile(new MineTile(app, RESOURCE_TYPES.clay))
            }
        },
        {
            name: 'Metal Mine Tile',
            tile: true,
            description: 'Claim a tile of land to dig for metal',
            initialOwned: 0,
            baseCost: 2000,
            costMultiplier: 1.25,
            speed: undefined,
            category: CATEGORIES.tiles,
            group: GROUPS.mine,
            resourceCosts: {
                [RESOURCE_TYPES.wood]: 50
            },
            onBuy(app) {
                app.addTile(new MineTile(app, RESOURCE_TYPES.metal))
            }
        },
        {
            name: 'Diamond Mine Tile',
            tile: true,
            description: 'Claim a tile of land to dig for diamonds',
            initialOwned: 0,
            baseCost: 5000,
            costMultiplier: 1.25,
            speed: undefined,
            category: CATEGORIES.tiles,
            group: GROUPS.mine,
            resourceCosts: {
                [RESOURCE_TYPES.wood]: 100,
                [RESOURCE_TYPES.metal]: 10
            },
            onBuy(app) {
                app.addTile(new MineTile(app, RESOURCE_TYPES.diamond))
            }
        },
        // Storage
        {
            name: 'Clay Storage',
            displayName: 'Clay Pot',
            description: 'Increase the amount of clay you can store',
            initialOwned: 1,
            baseCost: 5000,
            costMultiplier: 1.5,
            speed: undefined,
            category: CATEGORIES.storage,
            group: GROUPS.mine,
            onBuy(app) {
                app.resources.clay.storage += 1
            },
            isVisible: MineTile.hasTile
        },
        {
            name: 'Metal Storage',
            displayName: 'Metal Crate',
            description: 'Increase the amount of metal you can store',
            initialOwned: 1,
            baseCost: 5000,
            costMultiplier: 2,
            speed: undefined,
            category: CATEGORIES.storage,
            group: GROUPS.mine,
            onBuy(app) {
                app.resources.metal.storage += 1
            },
            isVisible: MineTile.hasTile
        },
        {
            name: 'Diamond Storage',
            displayName: 'Diamond Box',
            description: 'Increase the amount of diamonds you can store',
            initialOwned: 1,
            baseCost: 12_500,
            costMultiplier: 2,
            speed: undefined,
            category: CATEGORIES.storage,
            group: GROUPS.mine,
            onBuy(app) {
                app.resources.diamond.storage += 1
            },
            isVisible: MineTile.hasTile
        },
        // Automation
        {
            name: 'Resource Miner',
            description: 'Automatically mine resources',
            initialOwned: 0,
            baseCost: 5_000,
            costMultiplier: 1.2,
            speed: 1,
            category: CATEGORIES.automation,
            group: GROUPS.mine,
            isVisible: MineTile.hasTile
        },
        {
            name: 'Tunneler',
            description: 'Automatically dig tunnels through rocks while building support beams',
            initialOwned: 0,
            baseCost: 12000,
            costMultiplier: 1.2,
            speed: 1,
            category: CATEGORIES.automation,
            group: GROUPS.mine,
            isVisible: MineTile.hasTile
        },
        {
            name: 'Auto Shoveler',
            displayName: 'Auto Mine Maker',
            description:
                'Automatically dig rocks to make an opening for a mine shaft. Probably not the wisest investment',
            initialOwned: 0,
            baseCost: 14000,
            costMultiplier: 1.2,
            speed: 1,
            category: CATEGORIES.automation,
            group: GROUPS.mine,
            isVisible: MineTile.hasTile
        },
        {
            name: 'Metal Seller',
            description: 'Automatically sell metal',
            initialOwned: 0,
            baseCost: 15_000,
            costMultiplier: 1.2,
            speed: 1 / 60,
            category: CATEGORIES.automation,
            group: GROUPS.mine,
            isVisible: MineTile.hasTile
        },
        {
            name: 'Metal Reclaimer',
            displayName: 'Metal Detector',
            description: 'Send out a metal detector to find lost metal in your mine',
            initialOwned: 0,
            baseCost: 20_000,
            costMultiplier: 1.2,
            speed: 1 / 120,
            category: CATEGORIES.automation,
            group: GROUPS.mine,
            isVisible: MineTile.hasTile
        },
        {
            name: 'Diamond Seller',
            description: 'Automatically sell diamonds',
            initialOwned: 0,
            baseCost: 20_000,
            costMultiplier: 1.2,
            speed: 1 / 180,
            category: CATEGORIES.automation,
            group: GROUPS.mine,
            isVisible: MineTile.hasTile
        },
        {
            name: 'Diamond Reclaimer',
            displayName: 'Mine Magpie',
            description:
                'Send a magpie into your caves to find the diamonds you haphazardly dropped all over the place',
            initialOwned: 0,
            baseCost: 50_000,
            costMultiplier: 1.2,
            speed: 1 / 240,
            category: CATEGORIES.automation,
            group: GROUPS.mine,
            isVisible: MineTile.hasTile
        },
        // Special upgrades
        {
            name: 'Diamond Marketing 1',
            displayName: 'Diamond Polishing',
            description: 'Give diamonds a shiny polish and increase their price by 1.5x',
            initialOwned: 0,
            baseCost: 50_000,
            category: CATEGORIES.special,
            max: 1,
            group: GROUPS.mine,
            onBuy(app) {
                app.resources.diamond.price *= 1.5
            },
            isVisible: MineTile.hasTile
        },
        {
            name: 'Diamond Marketing 2',
            displayName: 'Diamond Shine',
            description: 'Give diamonds an even shinier polish and increase their price by 2x',
            initialOwned: 0,
            baseCost: 150_000,
            category: CATEGORIES.special,
            max: 1,
            group: GROUPS.mine,
            onBuy(app) {
                app.resources.diamond.price *= 2
            },
            isVisible: MineTile.hasTile
        }
    ]
}
