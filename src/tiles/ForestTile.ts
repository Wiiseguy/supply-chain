import { Automator } from '../Automator'
import { Calculator } from '../Calculator'
import { CATEGORIES, GROUPS, RESOURCE_TYPES, TILE_TYPES } from '../consts'
import { Resource } from '../Resource'
import { Upgrade } from '../Upgrade'
import { aOrAn, isLucky, randomInt } from '../utils'
import Tile from './Tile'

const FOREST_TILE_TYPES = {
    empty: 'empty',
    hole: 'hole',
    tree: 'tree'
}

const TREE_TYPES = {
    normal: 'normal', // Wood-only tree
    apple: 'apple', // Apple tree, gives apples and wood
    lemon: 'lemon', // Lemon tree, gives lemons and wood
    // add the rest of the fruit resources here
    pear: 'pear',
    orange: 'orange',
    cherry: 'cherry',
    strawberry: 'strawberry',
    mango: 'mango',
    banana: 'banana',
    pineapple: 'pineapple'
}

const TREE_TYPE_GAINS: Record<string, [number, number]> = {
    apple: [2, 12],
    lemon: [2, 5],
    pear: [2, 5],
    orange: [2, 5],
    cherry: [7, 14],
    strawberry: [3, 8],
    mango: [2, 7],
    banana: [4, 10],
    pineapple: [2, 6]
}

interface TreeEvolution {
    newType: string
    /**
     * The tiles that need to be surrounded with to trigger the evolution [tileType, amount, optional key?, optional value?]
     */
    surroundedWith: [string, number, string?, string?][]
    chance: number
    currentTypes: string[]
}

const TREE_EVOLUTIONS: TreeEvolution[] = [
    {
        newType: TREE_TYPES.apple,
        surroundedWith: [[TILE_TYPES.forest, 4]],
        chance: 0.1,
        currentTypes: [TREE_TYPES.normal] // Only evolve normal trees
    },
    {
        newType: TREE_TYPES.lemon,
        surroundedWith: [[TILE_TYPES.pond, 4]],
        chance: 0.1,
        currentTypes: [TREE_TYPES.normal]
    },
    {
        newType: TREE_TYPES.pear,
        surroundedWith: [[TILE_TYPES.forest, 4, 'treeType', TREE_TYPES.apple]],
        chance: 0.5,
        currentTypes: [TREE_TYPES.apple, TREE_TYPES.normal]
    },
    {
        newType: TREE_TYPES.orange,
        surroundedWith: [
            [TILE_TYPES.forest, 2, 'treeType', TREE_TYPES.lemon],
            [TILE_TYPES.forest, 2, 'treeType', TREE_TYPES.apple]
        ],
        chance: 0.5,
        currentTypes: [TREE_TYPES.lemon, TREE_TYPES.apple]
    },
    {
        newType: TREE_TYPES.cherry,
        surroundedWith: [[TILE_TYPES.mine, 4]],
        chance: 0.5,
        currentTypes: [TREE_TYPES.normal]
    },
    {
        newType: TREE_TYPES.mango,
        surroundedWith: [[TILE_TYPES.windmill, 4]],
        chance: 0.5,
        currentTypes: [TREE_TYPES.normal]
    },
    {
        newType: TREE_TYPES.pineapple,
        surroundedWith: [
            [TILE_TYPES.forest, 2, 'treeType', TREE_TYPES.mango],
            [TILE_TYPES.forest, 2, 'treeType', TREE_TYPES.lemon]
        ],
        chance: 1,
        currentTypes: [TREE_TYPES.mango]
    },
    {
        newType: TREE_TYPES.banana,
        surroundedWith: [
            [TILE_TYPES.forest, 2, 'treeType', TREE_TYPES.cherry],
            [TILE_TYPES.forest, 2, 'treeType', TREE_TYPES.lemon]
        ],
        chance: 0.5,
        currentTypes: [TREE_TYPES.cherry, TREE_TYPES.apple, TREE_TYPES.lemon, TREE_TYPES.normal]
    },
    {
        newType: TREE_TYPES.strawberry,
        surroundedWith: [
            [TILE_TYPES.forest, 2, 'treeType', TREE_TYPES.cherry],
            [TILE_TYPES.forest, 2, 'treeType', TREE_TYPES.apple]
        ],
        chance: 0.5,
        currentTypes: [TREE_TYPES.cherry, TREE_TYPES.apple, TREE_TYPES.normal]
    }
]

export const INITIAL_SEEDS = 4

const TREE_SELF_SEED_CHANCE = 1 / 100
const EXTRA_SEED_CHANCE_BASE = 1 / 10

const CHOP_POWER_BASE = 0.025
const TREE_BASE_MATURE_TIME = 60 // 60 seconds
const TREE_DEATH_AGE = TREE_BASE_MATURE_TIME * 3
const TREE_GROWTH_STAGES = ['🌱', '🌿', '🌳', '🌲']
const TREE_GROWTH_STAGES_BASE_INTERVAL = TREE_BASE_MATURE_TIME / TREE_GROWTH_STAGES.length
// Define the gains per stage, if a tree is not fully grown yet, it should give much less wood exponentially
const TREE_WOOD_GAINS = [0.1, 0.25, 0.5, 1]
const TREE_WOOD_GAINS_BASE = 10

export class ForestTile extends Tile implements ITile {
    static readonly type = TILE_TYPES.forest

    type: string
    treeType: string
    seedProblem: boolean
    isSick: boolean

    constructor(app: IApp) {
        super(app, ForestTile.type)
        this.type = FOREST_TILE_TYPES.empty
        this.treeType = TREE_TYPES.normal
        this.seedProblem = false
        this.isSick = false
    }
    update(elapsed: number) {
        super.update(elapsed)

        let sicknessMultiplier = this.isSick ? 0.1 : 1
        if (this.type === FOREST_TILE_TYPES.tree) {
            let ageGain = elapsed * (this.app.boughtUpgrades['Fertilizer'] + 1) * sicknessMultiplier
            this.age += ageGain
            let healthRegain = elapsed / (TREE_BASE_MATURE_TIME * 2)
            if (this.isDying) {
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
            // If stage has changed, animate
            if (prevStage !== this.stage) {
                this.animateGrow()
            }
            // stageP is the percentage of the age until it has reached the final stage
            this.stageP = Math.min(1, this.age / (TREE_BASE_MATURE_TIME - TREE_GROWTH_STAGES_BASE_INTERVAL))

            // Give it the last push once it's reached the end
            if (this.progress > 1) {
                this.chop()
            }
        }
    }
    onLandChange() {
        this.isSick = this.adjacentTiles.some(tile => tile.tileType === TILE_TYPES.kiln)
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
    plant(manual = false) {
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
    fellGain() {
        let woodGainM = TREE_WOOD_GAINS[this.stage]
        let woodGains = TREE_WOOD_GAINS_BASE * woodGainM
        this.app.resources.wood.gain(woodGains)
        this.app.resources.seed.gain(1)

        if (this.treeType !== TREE_TYPES.normal && this.isFullyGrownTree) {
            let [min, max] = TREE_TYPE_GAINS[this.treeType]
            this.app.resources[this.treeType].gain(randomInt(min, max))
        }
    }
    tryEvolve() {
        let msg = ''

        const adjacentTiles = this.adjacentTiles
        for (let evolution of TREE_EVOLUTIONS) {
            if (!evolution.currentTypes.includes(this.treeType)) continue
            const valid = evolution.surroundedWith.every(([tileType, amount, key, value]) => {
                let tiles = adjacentTiles.filter(tile => tile.tileType === tileType)
                if (key) {
                    tiles = tiles.filter(tile => tile[key] === value)
                }
                return tiles.length >= amount
            })
            const chance = this.app.DEBUG ? 1 : evolution.chance
            if (valid && isLucky(chance)) {
                this.treeType = evolution.newType
                msg += `Tree has evolved into ${aOrAn(evolution.newType)} ${evolution.newType} tree! `
                if (this.app.DEBUG) {
                    console.log('Evolved tree:', this.treeType, 'via path:', evolution)
                }
                break // Only evolve once
            }
        }

        return msg
    }
    chop(manual = false) {
        this.progress += this.chopPower
        this.animateWiggle()
        if (this.progress >= 1) {
            if (!this.isFullyGrownTree) {
                this.app.stats.saplingsKilled += 1
            }
            this.app.stats.treesChopped += 1
            this.progress = 0
            this.fellGain()
            let msg = ''

            // If lucky, get an extra seed
            if (isLucky(this.luckySeedChance)) {
                msg += 'Lucky! Got an extra seed! '
                this.app.resources.seed.gain(1)
                this.app.stats.luckySeeds += 1
            }

            if (this.isDying) {
                // If the tree is dying, it will self-seed, but it will not count as a lucky seed
                this.age = 0
                msg += `The old tree's offspring is already growing here! `
            } else if (isLucky(TREE_SELF_SEED_CHANCE)) {
                // If super lucky, automatically plant a seed
                msg += 'Super lucky! Another tree is already growing here! '
                this.age = 0
                this.app.stats.luckyTrees += 1
            } else {
                // Otherwise, reset the tile completely
                this.reset()
            }

            msg += this.tryEvolve()

            if (msg && manual) {
                this.app.showMessage(msg)
            }
        }
    }
    get adjacentTiles() {
        return this.app.getAdjacentTiles(this)
    }
    get isDying() {
        return this.age > TREE_DEATH_AGE
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
        } else if (this.isDying) {
            filter = 'saturate(0.5)'
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
    get iconTopLeft() {
        if (this.treeType === TREE_TYPES.normal) return ''
        return this.app.resources[this.treeType].icon
    }

    static readonly resources = [
        new Resource(RESOURCE_TYPES.seed, {
            displayNameSingular: 'Seed',
            displayNamePlural: 'Seeds',
            icon: '🌱',
            basePrice: 50,
            storageBaseSize: 10,
            initialOwned: INITIAL_SEEDS,
            minimum: 1
        }),
        new Resource(RESOURCE_TYPES.wood, {
            displayNameSingular: 'Wood',
            displayNamePlural: 'Wood',
            icon: '🪓',
            basePrice: 5,
            storageBaseSize: 100
        }),
        new Resource(RESOURCE_TYPES.sawdust, {
            displayNameSingular: 'Sawdust',
            displayNamePlural: 'Sawdust',
            icon: '🟫',
            basePrice: 1,
            storageBaseSize: 1000
        }),
        new Resource(RESOURCE_TYPES.apple, {
            displayNameSingular: 'Apple',
            displayNamePlural: 'Apples',
            icon: '🍎',
            basePrice: 1,
            storageBaseSize: 1000
        }),
        new Resource(RESOURCE_TYPES.lemon, {
            displayNameSingular: 'Lemon',
            displayNamePlural: 'Lemons',
            icon: '🍋',
            basePrice: 2,
            storageBaseSize: 500
        }),
        new Resource(RESOURCE_TYPES.pear, {
            displayNameSingular: 'Pear',
            displayNamePlural: 'Pears',
            icon: '🍐',
            basePrice: 2,
            storageBaseSize: 1000
        }),
        new Resource(RESOURCE_TYPES.orange, {
            displayNameSingular: 'Orange',
            displayNamePlural: 'Oranges',
            icon: '🍊',
            basePrice: 3,
            storageBaseSize: 500
        }),
        new Resource(RESOURCE_TYPES.cherry, {
            displayNameSingular: 'Cherry',
            displayNamePlural: 'Cherries',
            icon: '🍒',
            basePrice: 1,
            storageBaseSize: 2500
        }),
        new Resource(RESOURCE_TYPES.strawberry, {
            displayNameSingular: 'Strawberry',
            displayNamePlural: 'Strawberries',
            icon: '🍓',
            basePrice: 5,
            storageBaseSize: 500
        }),
        new Resource(RESOURCE_TYPES.mango, {
            displayNameSingular: 'Mango',
            displayNamePlural: 'Mangos',
            icon: '🥭',
            basePrice: 5,
            storageBaseSize: 500
        }),
        new Resource(RESOURCE_TYPES.banana, {
            displayNameSingular: 'Banana',
            displayNamePlural: 'Bananas',
            icon: '🍌',
            basePrice: 2,
            storageBaseSize: 1000
        }),
        new Resource(RESOURCE_TYPES.pineapple, {
            displayNameSingular: 'Pineapple',
            displayNamePlural: 'Pineapples',
            icon: '🍍',
            basePrice: 10,
            storageBaseSize: 500
        })
    ]

    static readonly calculators = [
        new Calculator('luckySeedChance', app => EXTRA_SEED_CHANCE_BASE * (1 + app.boughtUpgrades['Seed Luck 1']))
    ]

    static readonly automators = [
        new Automator('Auto Digger', app => {
            const tile = app.land.find(
                tile => tile instanceof ForestTile && tile.type === FOREST_TILE_TYPES.empty
            ) as ForestTile
            if (tile) {
                tile.dig()
            }
        }),
        new Automator('Auto Seeder', app => {
            const tile = app.land.find(
                tile => tile instanceof ForestTile && tile.type === FOREST_TILE_TYPES.hole
            ) as ForestTile
            if (tile) {
                tile.plant()
            }
        }),
        new Automator('Auto Chopper', app => {
            const fullyGrownTrees = app.land.filter(
                tile => tile instanceof ForestTile && tile.isFullyGrownTree
            ) as ForestTile[]
            const score = (tile: ForestTile) => tile.age * ((1 + tile.progress) * 100)
            const sorted = fullyGrownTrees.sort((a, b) => score(b) - score(a))
            const tile = sorted[0]
            if (tile) {
                tile.chop()
            }
        }),
        Automator.createSeller('Wood Seller'),
        new Automator('Wood Reclaimer', app => {
            app.resources.wood.reclaim(1)
        }),
        new Automator('Seed Seller', app => {
            // Determine excess seeds: each tree counts as 1 seed
            // So if forestLand has 4 tiles and 2 have trees and we have 3 seeds, we have 1 excess seed
            const forestLand = app.land.filter(tile => tile instanceof ForestTile) as ForestTile[]
            const treeTiles = forestLand.filter(tile => tile.type === FOREST_TILE_TYPES.tree)
            const excessSeeds = app.resources.seed.owned + treeTiles.length - forestLand.length
            if (excessSeeds > 0) {
                app.sellResource(app.resources.seed, 1)
            }
        }),
        new Automator('Seed Reclaimer', app => {
            app.resources.seed.reclaim(1)
        }),
        Automator.createSeller('Fruit Seller'),
        new Automator('Fruit Reclaimer', app => {
            app.resources.apple.reclaim(1)
            app.resources.lemon.reclaim(1)
            app.resources.pear.reclaim(1)
            app.resources.orange.reclaim(1)
            app.resources.cherry.reclaim(1)
            app.resources.strawberry.reclaim(1)
            app.resources.mango.reclaim(1)
            app.resources.banana.reclaim(1)
            app.resources.pineapple.reclaim(1)
        })
    ]

    static readonly upgrades = [
        new Upgrade({
            name: 'Forest Tile',
            tile: true,
            description: 'Claim a tile of land to grow trees on',
            initialOwned: 1,
            baseCost: 100,
            costMultiplier: 1.2,
            category: CATEGORIES.tiles,
            group: GROUPS.forest,
            onBuy(app: IApp) {
                app.addTile(new ForestTile(app))
            }
        }),
        new Upgrade({
            name: 'Axe',
            displayName: 'Sharpen Axe',
            description: 'Sharpen your axe to chop trees faster',
            baseCost: 100,
            costMultiplier: 1.5,
            category: CATEGORIES.tools,
            group: GROUPS.forest,
            icon: '🪓'
        }),
        new Upgrade({
            name: 'Fertilizer',
            displayName: 'Fertilizer',
            description: 'Fertilizer to speed up tree growth',
            baseCost: 100,
            costMultiplier: 2,
            category: CATEGORIES.tools,
            group: GROUPS.forest,
            icon: '🌱'
        }),
        new Upgrade({
            name: 'Wood Storage',
            description: 'Increase the amount of wood you can store',
            initialOwned: 1,
            baseCost: 1000,
            costMultiplier: 1.2,
            category: CATEGORIES.storage,
            group: GROUPS.forest,
            onBuy(app: IApp) {
                app.resources.wood.storage += 1
            }
        }),
        new Upgrade({
            name: 'Seed Storage',
            displayName: 'Seed Bottle',
            description: 'Increase the amount of seeds you can store',
            initialOwned: 1,
            baseCost: 1500,
            costMultiplier: 1.2,
            category: CATEGORIES.storage,
            group: GROUPS.forest,
            onBuy(app: IApp) {
                app.resources.seed.storage += 1
            },
            icon: '🧴'
        }),
        // Automation
        Upgrade.createAutomator({
            name: 'Auto Chopper',
            description: 'Automatically chop down trees',
            baseCost: 800,
            costMultiplier: 1.5,
            speed: 2 / 3,
            group: GROUPS.forest,
            icon: '🪓'
        }),
        Upgrade.createAutomator({
            name: 'Auto Seeder',
            description: 'Automatically plant seeds in dug holes',
            baseCost: 1500,
            costMultiplier: 1.2,
            speed: 1 / 3,
            group: GROUPS.forest,
            icon: '🌱'
        }),
        Upgrade.createAutomator({
            name: 'Auto Digger',
            description: 'Automatically dig holes on empty land',
            baseCost: 1500,
            costMultiplier: 1.2,
            speed: 0.75,
            group: GROUPS.forest,
            icon: '🕳️'
        }),
        Upgrade.createSellerAutomator({
            name: 'Wood Seller',
            description: 'Automatically sell wood',
            baseCost: 1000,
            costMultiplier: 1.2,
            speed: 1 / 2,
            group: GROUPS.forest,
            resourcesSold: [RESOURCE_TYPES.wood]
        }),
        Upgrade.createSellerAutomator({
            name: 'Seed Seller',
            description: 'Automatically sell excess seeds',
            baseCost: 1200,
            costMultiplier: 1.2,
            speed: 1 / 8,
            group: GROUPS.forest,
            resourcesSold: [RESOURCE_TYPES.seed]
        }),
        Upgrade.createAutomator({
            name: 'Wood Reclaimer',
            description: 'Collect lost wood',
            baseCost: 2500,
            costMultiplier: 1.2,
            speed: 1 / 4,
            group: GROUPS.forest
        }),
        Upgrade.createAutomator({
            name: 'Seed Reclaimer',
            displayName: 'Seed Scouter',
            description: 'Send out a scout to find lost seeds all over your forest land',
            baseCost: 2500,
            costMultiplier: 1.2,
            speed: 1 / 30,
            group: GROUPS.forest
        }),
        Upgrade.createSellerAutomator({
            name: 'Fruit Seller',
            description: 'Automatically sell tree fruits',
            baseCost: 9000,
            costMultiplier: 1.3,
            speed: 1,
            group: GROUPS.forest,
            isVisible(app: IApp) {
                return (
                    app.resources.apple.totalOwned > 0 ||
                    app.resources.lemon.totalOwned > 0 ||
                    app.resources.pear.totalOwned > 0 ||
                    app.resources.orange.totalOwned > 0 ||
                    app.resources.cherry.totalOwned > 0 ||
                    app.resources.strawberry.totalOwned > 0 ||
                    app.resources.mango.totalOwned > 0 ||
                    app.resources.banana.totalOwned > 0 ||
                    app.resources.pineapple.totalOwned > 0
                )
            },
            resourcesSold: [
                RESOURCE_TYPES.apple,
                RESOURCE_TYPES.lemon,
                RESOURCE_TYPES.pear,
                RESOURCE_TYPES.orange,
                RESOURCE_TYPES.cherry,
                RESOURCE_TYPES.strawberry,
                RESOURCE_TYPES.mango,
                RESOURCE_TYPES.banana,
                RESOURCE_TYPES.pineapple
            ]
        }),
        // Fruit reclaimer
        Upgrade.createAutomator({
            name: 'Fruit Reclaimer',
            description: 'Collect lost fruits',
            baseCost: 9000,
            costMultiplier: 1.2,
            speed: 1 / 2,
            group: GROUPS.forest,
            isVisible(app: IApp) {
                return (
                    app.resources.apple.totalOwned > 0 ||
                    app.resources.lemon.totalOwned > 0 ||
                    app.resources.pear.totalOwned > 0 ||
                    app.resources.orange.totalOwned > 0 ||
                    app.resources.cherry.totalOwned > 0 ||
                    app.resources.strawberry.totalOwned > 0 ||
                    app.resources.mango.totalOwned > 0 ||
                    app.resources.banana.totalOwned > 0 ||
                    app.resources.pineapple.totalOwned > 0
                )
            }
        }),
        // Special upgrades
        new Upgrade({
            name: 'Wooden Finger',
            displayName: 'Wooden Finger',
            description: 'Sell 10 times the amount of resources with one click',
            baseCost: 200,
            costMultiplier: 5,
            category: CATEGORIES.special,
            max: 3,
            group: GROUPS.forest
        }),
        new Upgrade({
            name: 'Wood Marketing 1',
            displayName: 'Wood Marketing 1',
            description: 'Increase wood price by 1.5x',
            baseCost: 1000,
            category: CATEGORIES.special,
            max: 1,
            group: GROUPS.forest,
            onBuy(app: IApp) {
                app.resources.wood.priceMultiplier *= 1.5
            }
        }),
        new Upgrade({
            name: 'Seed Luck 1',
            displayName: 'Clover Seed',
            description: 'Increase chance of getting an extra seed by 2x',
            baseCost: 2000,
            category: CATEGORIES.special,
            max: 1,
            group: GROUPS.forest,
            icon: '🍀'
        }),
        new Upgrade({
            name: 'Seed Marketing 1',
            displayName: 'Seed Marketing 1',
            description: 'Increase seed price by 2x',
            baseCost: 2000,
            category: CATEGORIES.special,
            max: 1,
            group: GROUPS.forest,
            onBuy(app: IApp) {
                app.resources.seed.priceMultiplier *= 2
            }
        }),
        new Upgrade({
            name: 'Seed Marketing 2',
            displayName: 'Seed Marketing 2',
            description: 'Increase seed price by 3x',
            baseCost: 10_000,
            category: CATEGORIES.special,
            max: 1,
            group: GROUPS.forest,
            onBuy(app: IApp) {
                app.resources.seed.priceMultiplier *= 3
            }
        }),
        new Upgrade({
            name: 'Wood Marketing 2',
            displayName: 'Wood Marketing 2',
            description: 'Increase wood price by 2x',
            baseCost: 40_000,
            category: CATEGORIES.special,
            max: 1,
            group: GROUPS.forest,
            onBuy(app: IApp) {
                app.resources.wood.priceMultiplier *= 2
            }
        }),
        new Upgrade({
            name: 'Wood Marketing 3',
            displayName: 'Wood Marketing 3',
            description: 'Increase wood price by 2x',
            baseCost: 150_000,
            category: CATEGORIES.special,
            max: 1,
            group: GROUPS.forest,
            onBuy(app: IApp) {
                app.resources.wood.priceMultiplier *= 2
            }
        })
    ]
}
