import { Automator } from './Automator.js'
import { EXTRA_SEED_CHANCE_MULTIPLIER, FOREST_TILE_TYPES, GROUPS, TILE_TYPES } from './consts.js'
import Tile from './Tile.js'
import { isLucky } from './utils.js'

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
    static luckySeedChance = EXTRA_SEED_CHANCE_BASE
    constructor(app) {
        super(app)
        this.tileType = TILE_TYPES.forest
        this.type = FOREST_TILE_TYPES.empty
    }
    update(elapsed) {
        super.update(elapsed)

        if (this.type === FOREST_TILE_TYPES.tree) {
            this.age += elapsed * (this.app.boughtUpgrades['Fertilizer'] + 1)
            let healthRegain = elapsed / (TREE_BASE_MATURE_TIME * 2)
            if (this.age > TREE_DEATH_AGE) {
                healthRegain *= -1
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
    dig() {
        this.progress += this.digPower
        if (this.progress >= 1) {
            this.progress = 0
            this.type = FOREST_TILE_TYPES.hole
        }
    }
    plant() {
        this.progress += this.plantPower
        if (this.progress >= 1) {
            if (this.app.resources.seed.incur(1)) {
                this.progress = 0
                this.type = FOREST_TILE_TYPES.tree
            } else {
                this.app.showMessage('No seeds left!')
            }
        }
    }
    chop() {
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
            if (isLucky(ForestTile.luckySeedChance)) {
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
            if (msg) {
                this.app.showMessage(msg)
            }
        }
    }
    click() {
        switch (this.type) {
            case FOREST_TILE_TYPES.empty:
                this.dig()
                break
            case FOREST_TILE_TYPES.hole:
                this.plant()
                break
            case FOREST_TILE_TYPES.tree:
                this.chop()
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
                return 'Dug hole - click to plant a seed'
            case FOREST_TILE_TYPES.tree:
                return `Tree - click to chop it down - the older the tree, the more wood you get`
            default:
                return 'Unknown forest tile'
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
            category: 'tiles',
            group: GROUPS.forest,
            onBuy(app) {
                app.land.push(new ForestTile(app))
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
            category: 'tools',
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
            category: 'tools',
            group: GROUPS.forest
        },
        {
            name: 'Wood Storage',
            description: 'Increase the amount of wood you can store',
            initialOwned: 1,
            baseCost: 1000,
            costMultiplier: 1.2,
            speed: undefined,
            category: 'storage',
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
            category: 'storage',
            group: GROUPS.forest,
            onBuy(app) {
                app.resources.seed.storage += 1
            }
        },
        // Automation
        {
            name: 'Auto Digger',
            description: 'Automatically dig holes on empty land',
            initialOwned: 0,
            baseCost: 800,
            costMultiplier: 1.2,
            speed: 0.75,
            category: 'automation',
            group: GROUPS.forest
        },
        {
            name: 'Auto Seeder',
            description: 'Automatically plant seeds in dug holes',
            initialOwned: 0,
            baseCost: 1000,
            costMultiplier: 1.2,
            speed: 1 / 3,
            category: 'automation',
            group: GROUPS.forest
        },
        {
            name: 'Auto Chopper',
            description: 'Automatically chop down trees',
            initialOwned: 0,
            baseCost: 1250,
            costMultiplier: 1.5,
            speed: 2 / 3,
            category: 'automation',
            group: GROUPS.forest
        },
        {
            name: 'Wood Seller',
            description: 'Automatically sell wood',
            initialOwned: 0,
            baseCost: 2500,
            costMultiplier: 1.2,
            speed: 1 / 2,
            category: 'automation',
            group: GROUPS.forest
        },
        {
            name: 'Seed Seller',
            description: 'Automatically sell excess seeds',
            initialOwned: 0,
            baseCost: 3000,
            costMultiplier: 1.2,
            speed: 1 / 8,
            category: 'automation',
            group: GROUPS.forest
        },
        {
            name: 'Wood Reclaimer',
            description: 'Collect lost wood',
            initialOwned: 0,
            baseCost: 2500,
            costMultiplier: 1.2,
            speed: 1 / 4,
            category: 'automation',
            group: GROUPS.forest
        },
        {
            name: 'Seed Reclaimer',
            displayName: 'Seed Scouter',
            description: 'Send out a scout to find lost seeds all over your forest land',
            initialOwned: 0,
            baseCost: 3500,
            costMultiplier: 1.2,
            speed: 1 / 30,
            category: 'automation',
            group: GROUPS.forest
        },
        // Special upgrades
        {
            name: 'Wooden Finger',
            displayName: 'Wooden Finger',
            description: 'Sell 10 times the amount of wood with one click',
            initialOwned: 0,
            baseCost: 200,
            costMultiplier: 5,
            category: 'special',
            max: 2,
            group: GROUPS.forest,
            onBuy(app) {
                app.resources.wood.sellNum *= 10
            }
        },
        {
            name: 'Wood Marketing 1',
            displayName: 'Wood Marketing 1',
            description: 'Increase wood price by 2x',
            initialOwned: 0,
            baseCost: 1000,
            category: 'special',
            max: 1,
            group: GROUPS.forest,
            onBuy(app) {
                app.resources.wood.price *= 2
            }
        },
        {
            name: 'Seed Luck 1',
            displayName: 'Clover Seed',
            description: 'Increase chance of getting an extra seed by 2x',
            initialOwned: 0,
            baseCost: 2000,
            category: 'special',
            max: 1,
            group: GROUPS.forest,
            onBuy() {
                ForestTile.luckySeedChance *= EXTRA_SEED_CHANCE_MULTIPLIER
            }
        },
        {
            name: 'Seed Marketing 1',
            displayName: 'Seed Marketing 1',
            description: 'Increase seed price by 2x',
            initialOwned: 0,
            baseCost: 2000,
            category: 'special',
            max: 1,
            group: GROUPS.forest,
            onBuy(app) {
                app.resources.seed.price *= 2
            }
        },
        {
            name: 'Seed Marketing 2',
            displayName: 'Seed Marketing 2',
            description: 'Increase seed price by 3x',
            initialOwned: 0,
            baseCost: 10_000,
            category: 'special',
            max: 1,
            group: GROUPS.forest,
            onBuy(app) {
                app.resources.seed.price *= 3
            }
        },
        {
            name: 'Wood Marketing 2',
            displayName: 'Wood Marketing 2',
            description: 'Increase wood price by 2x',
            initialOwned: 0,
            baseCost: 30_000,
            category: 'special',
            max: 1,
            group: GROUPS.forest,
            onBuy(app) {
                app.resources.wood.price *= 2
            }
        },
        {
            name: 'Wood Marketing 3',
            displayName: 'Wood Marketing 3',
            description: 'Increase wood price by 2x',
            initialOwned: 0,
            baseCost: 100_000,
            category: 'special',
            max: 1,
            group: GROUPS.forest,
            onBuy(app) {
                app.resources.wood.price *= 2
            }
        }
    ]
}
