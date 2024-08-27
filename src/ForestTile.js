import { Automator } from './Automator.js'
import { Calculator } from './Calculator.js'
import { CATEGORIES, GROUPS, RESOURCE_TYPES, TILE_TYPES } from './consts.js'
import { Resource } from './Resource.js'
import Tile from './Tile.js'
import { createAutomatorUpgrade, isLucky } from './utils.js'

const FOREST_TILE_TYPES = {
    empty: 'empty',
    hole: 'hole',
    tree: 'tree'
}

const WOOD_PRICE_BASE = 5
const SEED_PRICE_BASE = 50
const WOOD_STORAGE_SIZE = 100
const SEEDS_STORAGE_SIZE = 10

export const INITIAL_SEEDS = 4

const TREE_SELF_SEED_CHANCE = 1 / 100
const EXTRA_SEED_CHANCE_BASE = 1 / 10

const CHOP_POWER_BASE = 0.025
// Define tree aging - let's say a tree takes a minute to grow fully
const TREE_BASE_MATURE_TIME = 60 // 60 seconds
const TREE_DEATH_AGE = TREE_BASE_MATURE_TIME * 5
const TREE_GROWTH_STAGES = ['🌱', '🌿', '🌳', '🌲']
const TREE_GROWTH_STAGES_BASE_INTERVAL = TREE_BASE_MATURE_TIME / TREE_GROWTH_STAGES.length
// Define the gains per stage, if a tree is not fully grown yet, it should give much less wood exponentially
const TREE_WOOD_GAINS = [0.1, 0.25, 0.5, 1]
const TREE_WOOD_GAINS_BASE = 10

export class ForestTile extends Tile {
    static type = TILE_TYPES.forest

    constructor(app) {
        super(app, ForestTile.type)
        this.type = FOREST_TILE_TYPES.empty
        this.seedProblem = false
    }
    update(elapsed) {
        super.update(elapsed)

        let sicknessMultiplier = this.isSick ? 0.1 : 1
        if (this.type === FOREST_TILE_TYPES.tree) {
            let ageGain = elapsed * (this.app.boughtUpgrades['Fertilizer'] + 1) * sicknessMultiplier
            this.age += ageGain
            let healthRegain = elapsed / (TREE_BASE_MATURE_TIME * 2)
            if (this.age > TREE_DEATH_AGE * sicknessMultiplier) {
                healthRegain *= -1 / sicknessMultiplier
            }
            this.progress -= healthRegain
            if (this.progress < 0) {
                this.progress = 0
            }
            let prevStage = this.stage
            this.stage = Math.min(
                TREE_GROWTH_STAGES.length - 1,
                Math.floor(this.age / TREE_GROWTH_STAGES_BASE_INTERVAL)
            )
            // If stage has changed, wiggly wiggle
            if (prevStage !== this.stage) {
                this.animateGrow()
            }
            // stageP is the percentage of the age until it has reached the final stage
            this.stageP = Math.min(1, this.age / (TREE_BASE_MATURE_TIME - TREE_GROWTH_STAGES_BASE_INTERVAL))
            if (this.progress > 1) {
                this.chop()
            }
        }
    }
    sell() {
        this.app.boughtUpgrades['Forest Tile'] -= 1
        // If the tile is a tree, give the player back a seed (prevent soft-lock)
        if (this.type === FOREST_TILE_TYPES.tree) {
            this.app.resources.seed.gain(1)
        }
    }
    dig() {
        this.progress += this.digPower
        if (this.progress >= 1) {
            this.progress = 0
            this.type = FOREST_TILE_TYPES.hole
        }
    }
    plant(manual) {
        this.progress += this.plantPower
        this.seedProblem = false
        if (this.progress >= 1) {
            if (this.app.resources.seed.incur(1)) {
                this.progress = 0
                this.type = FOREST_TILE_TYPES.tree
            } else {
                this.seedProblem = true
                this.animateFail()
                if (manual) {
                    this.app.showMessage('No seeds left!')
                }
            }
        }
    }
    chop(manual) {
        this.progress += this.chopPower
        this.animateWiggle()
        if (this.progress >= 1) {
            this.progress = 0
            let woodGainM = TREE_WOOD_GAINS[this.stage]
            let woodGains = TREE_WOOD_GAINS_BASE * woodGainM
            this.app.resources.wood.gain(woodGains)
            this.app.resources.seed.gain(1)
            this.app.stats.treesChopped += 1
            let msg = ''
            // If lucky, get an extra seed
            if (isLucky(this.luckySeedChance)) {
                msg += 'Lucky! Got an extra seed! '
                this.app.resources.seed.gain(1)
                this.app.stats.luckySeeds += 1
            }
            // If super lucky, automatically plant a seed
            if (isLucky(TREE_SELF_SEED_CHANCE)) {
                msg += 'Super lucky! Another tree is already growing here!'
                this.age = 0
                this.app.stats.luckyTrees += 1
            } else {
                this.reset()
            }
            if (msg && manual) {
                this.app.showMessage(msg)
            }
        }
    }
    get adjacentTiles() {
        return this.app.getAdjacentTiles(this)
    }
    get isSick() {
        return this.adjacentTiles.some(tile => tile.tileType === TILE_TYPES.kiln)
    }
    click(manual = false) {
        switch (this.type) {
            case FOREST_TILE_TYPES.empty:
                this.dig()
                break
            case FOREST_TILE_TYPES.hole:
                this.plant(manual)
                break
            case FOREST_TILE_TYPES.tree:
                this.chop(manual)
                break
            default:
                console.error('Unknown Forest tile type:', this.type)
                break
        }
    }
    reset() {
        this.type = FOREST_TILE_TYPES.empty
        this.progress = 0
        this.age = 0
        this.stage = 0
        this.stageP = 0
    }
    get iconStyle() {
        let scale = 1
        let translateY = 0
        let filter = 'none'
        switch (this.type) {
            case FOREST_TILE_TYPES.hole:
                scale = 0.5
                break
            case FOREST_TILE_TYPES.tree:
                if (!this.isFullyGrownTree) {
                    scale = 0.25 + this.stageP / 2
                }
                break
        }
        if (this.isSick) {
            filter = 'brightness(0.9) saturate(0.25)'
        }
        return {
            transform: `scale(${scale}) translateY(${translateY}em)`,
            filter
        }
    }
    get icon() {
        switch (this.type) {
            case FOREST_TILE_TYPES.empty:
                return ''
            case FOREST_TILE_TYPES.hole:
                return '🕳️'
            case FOREST_TILE_TYPES.tree:
                return TREE_GROWTH_STAGES[this.stage]
            default:
                return '❓'
        }
    }
    get tooltip() {
        switch (this.type) {
            case FOREST_TILE_TYPES.empty:
                return 'Empty land - click to dig a hole'
            case FOREST_TILE_TYPES.hole:
                if (this.seedProblem) {
                    return `You don't have any seeds left to plant!`
                }
                return 'Dug hole - click to plant a seed'
            case FOREST_TILE_TYPES.tree:
                return `Tree - click to chop it down - the older the tree, the more wood you get`
            default:
                return 'Unknown forest tile'
        }
    }
    get health() {
        switch (this.type) {
            case FOREST_TILE_TYPES.tree:
                return 1 - this.progress
            default:
                return null
        }
    }
    get digPower() {
        return 0.2
    }
    get plantPower() {
        return 0.5
    }
    get chopPower() {
        return CHOP_POWER_BASE * (1 + this.app.boughtUpgrades['Axe'])
    }
    get isFullyGrownTree() {
        return this.type === FOREST_TILE_TYPES.tree && this.stage === TREE_GROWTH_STAGES.length - 1
    }
    get luckySeedChance() {
        return this.app.calculated.luckySeedChance
    }
    // get iconBottomRight() {
    //     // If any adjacent tile is a kiln, show skull emoji
    //     if (this.isSick) {
    //         return '💀'
    //     }
    // }

    static resources = [
        new Resource(RESOURCE_TYPES.wood, {
            displayNameSingular: 'Wood',
            displayNamePlural: 'Wood',
            icon: '🪓',
            basePrice: WOOD_PRICE_BASE,
            storageBaseSize: WOOD_STORAGE_SIZE
        }),
        new Resource(RESOURCE_TYPES.seed, {
            displayNameSingular: 'Seed',
            displayNamePlural: 'Seeds',
            icon: '🌱',
            basePrice: SEED_PRICE_BASE,
            storageBaseSize: SEEDS_STORAGE_SIZE,
            initialOwned: INITIAL_SEEDS,
            minimum: 1
        })
    ]

    static calculators = [
        new Calculator('luckySeedChance', app => EXTRA_SEED_CHANCE_BASE * (1 + app.boughtUpgrades['Seed Luck 1']))
    ]

    static automators = [
        new Automator('Auto Digger', app => {
            const tile = /** @type {ForestTile[]} */ (app.forestLand).find(
                tile => tile.type === FOREST_TILE_TYPES.empty
            )
            if (tile) {
                tile.dig()
            }
        }),
        new Automator('Auto Seeder', app => {
            const tile = /** @type {ForestTile[]} */ (app.forestLand).find(tile => tile.type === FOREST_TILE_TYPES.hole)
            if (tile) {
                tile.plant()
            }
        }),
        new Automator('Auto Chopper', app => {
            const fullyGrownTrees = /** @type {ForestTile[]} */ (app.forestLand).filter(tile => tile.isFullyGrownTree)
            const maxChopped = Math.max(...fullyGrownTrees.map(tile => tile.progress))
            const tile = fullyGrownTrees.find(tile => tile.progress === maxChopped)
            if (tile) {
                tile.chop()
            }
        }),
        new Automator('Wood Seller', app => {
            app.sellResource(app.resources.wood, 1)
        }),
        new Automator('Wood Reclaimer', app => {
            app.resources.wood.reclaim(1)
        }),
        new Automator('Seed Seller', app => {
            // Determine excess seeds: each tree counts as 1 seed
            // So if forestLand has 4 tiles and 2 have trees and we have 3 seeds, we have 1 excess seed
            const treeTiles = app.forestLand.filter(tile => tile.type === FOREST_TILE_TYPES.tree)
            const excessSeeds = app.resources.seed.owned + treeTiles.length - app.forestLand.length
            if (excessSeeds > 0) {
                app.sellResource(app.resources.seed, 1)
            }
        }),
        new Automator('Seed Reclaimer', app => {
            app.resources.seed.reclaim(1)
        })
    ]

    static upgrades = [
        {
            name: 'Forest Tile',
            tile: true,
            description: 'Claim a tile of land to grow trees on',
            initialOwned: 1,
            baseCost: 100,
            costMultiplier: 1.2,
            speed: undefined,
            category: CATEGORIES.tiles,
            group: GROUPS.forest,
            onBuy(app) {
                app.addTile(new ForestTile(app))
            }
        },
        {
            name: 'Axe',
            displayName: 'Sharpen Axe',
            description: 'Sharpen your axe to chop trees faster',
            initialOwned: 0,
            baseCost: 100,
            costMultiplier: 1.5,
            speed: undefined,
            category: CATEGORIES.tools,
            group: GROUPS.forest
        },
        {
            name: 'Fertilizer',
            displayName: 'Fertilizer',
            description: 'Fertilizer to speed up tree growth',
            initialOwned: 0,
            baseCost: 100,
            costMultiplier: 2,
            speed: undefined,
            category: CATEGORIES.tools,
            group: GROUPS.forest
        },
        {
            name: 'Wood Storage',
            description: 'Increase the amount of wood you can store',
            initialOwned: 1,
            baseCost: 1000,
            costMultiplier: 1.2,
            speed: undefined,
            category: CATEGORIES.storage,
            group: GROUPS.forest,
            onBuy(app) {
                app.resources.wood.storage += 1
            }
        },
        {
            name: 'Seed Storage',
            displayName: 'Seed Bottle',
            description: 'Increase the amount of seeds you can store',
            initialOwned: 1,
            baseCost: 1500,
            costMultiplier: 1.2,
            speed: undefined,
            category: CATEGORIES.storage,
            group: GROUPS.forest,
            onBuy(app) {
                app.resources.seed.storage += 1
            }
        },
        // Automation
        createAutomatorUpgrade({
            name: 'Auto Chopper',
            description: 'Automatically chop down trees',
            baseCost: 800,
            costMultiplier: 1.5,
            speed: 2 / 3,
            group: GROUPS.forest
        }),
        createAutomatorUpgrade({
            name: 'Auto Seeder',
            description: 'Automatically plant seeds in dug holes',
            baseCost: 1000,
            costMultiplier: 1.2,
            speed: 1 / 3,
            group: GROUPS.forest
        }),
        createAutomatorUpgrade({
            name: 'Auto Digger',
            description: 'Automatically dig holes on empty land',
            baseCost: 1250,
            costMultiplier: 1.2,
            speed: 0.75,
            group: GROUPS.forest
        }),
        createAutomatorUpgrade({
            name: 'Wood Seller',
            description: 'Automatically sell wood',
            baseCost: 2500,
            costMultiplier: 1.2,
            speed: 1 / 2,
            group: GROUPS.forest
        }),
        createAutomatorUpgrade({
            name: 'Seed Seller',
            description: 'Automatically sell excess seeds',
            baseCost: 3000,
            costMultiplier: 1.2,
            speed: 1 / 8,
            group: GROUPS.forest
        }),
        createAutomatorUpgrade({
            name: 'Wood Reclaimer',
            description: 'Collect lost wood',
            baseCost: 2500,
            costMultiplier: 1.2,
            speed: 1 / 4,
            group: GROUPS.forest
        }),
        createAutomatorUpgrade({
            name: 'Seed Reclaimer',
            displayName: 'Seed Scouter',
            description: 'Send out a scout to find lost seeds all over your forest land',
            baseCost: 3500,
            costMultiplier: 1.2,
            speed: 1 / 30,
            group: GROUPS.forest
        }),
        // Special upgrades
        {
            name: 'Wooden Finger',
            displayName: 'Wooden Finger',
            description: 'Sell 10 times the amount of resources with one click',
            initialOwned: 0,
            baseCost: 200,
            costMultiplier: 5,
            category: CATEGORIES.special,
            max: 3,
            group: GROUPS.forest,
            onBuy(app) {
                // TODO: remove?
                app.resources.wood.sellNum *= 10
            }
        },
        {
            name: 'Wood Marketing 1',
            displayName: 'Wood Marketing 1',
            description: 'Increase wood price by 1.5x',
            initialOwned: 0,
            baseCost: 1000,
            category: CATEGORIES.special,
            max: 1,
            group: GROUPS.forest,
            onBuy(app) {
                app.resources.wood.priceMultiplier *= 1.5
            }
        },
        {
            name: 'Seed Luck 1',
            displayName: 'Clover Seed',
            description: 'Increase chance of getting an extra seed by 2x',
            initialOwned: 0,
            baseCost: 2000,
            category: CATEGORIES.special,
            max: 1,
            group: GROUPS.forest
        },
        {
            name: 'Seed Marketing 1',
            displayName: 'Seed Marketing 1',
            description: 'Increase seed price by 2x',
            initialOwned: 0,
            baseCost: 2000,
            category: CATEGORIES.special,
            max: 1,
            group: GROUPS.forest,
            onBuy(app) {
                app.resources.seed.priceMultiplier *= 2
            }
        },
        {
            name: 'Seed Marketing 2',
            displayName: 'Seed Marketing 2',
            description: 'Increase seed price by 3x',
            initialOwned: 0,
            baseCost: 10_000,
            category: CATEGORIES.special,
            max: 1,
            group: GROUPS.forest,
            onBuy(app) {
                app.resources.seed.priceMultiplier *= 3
            }
        },
        {
            name: 'Wood Marketing 2',
            displayName: 'Wood Marketing 2',
            description: 'Increase wood price by 2x',
            initialOwned: 0,
            baseCost: 40_000,
            category: CATEGORIES.special,
            max: 1,
            group: GROUPS.forest,
            onBuy(app) {
                app.resources.wood.priceMultiplier *= 2
            }
        },
        {
            name: 'Wood Marketing 3',
            displayName: 'Wood Marketing 3',
            description: 'Increase wood price by 2x',
            initialOwned: 0,
            baseCost: 150_000,
            category: CATEGORIES.special,
            max: 1,
            group: GROUPS.forest,
            onBuy(app) {
                app.resources.wood.priceMultiplier *= 2
            }
        }
    ]
}
