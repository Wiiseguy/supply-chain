const DEBUG = false
const FPS = 30

const TILE_SIZE = 64
const TILE_TYPES = {
    none: 'none',
    forest: 'forest',
    mine: 'mine'
    // What other types could there be?
    // Farm: plant seeds, harvest crops
    // Oil rig: drill for oil
    // Metal mine: mine for metals, use metals to build stuff
    // Factory: process raw materials into goods
}
const FOREST_TILE_TYPES = {
    empty: 'empty',
    hole: 'hole',
    tree: 'tree'
}
const MINE_TILE_TYPES = {
    rock: 'rock',
    tunnel: 'tunnel',
    resource: 'resource'
}
const MILE_RESOURCE_TYPES = {
    diamond: 'diamond',
    metal: 'metal',
    oil: 'oil',
    coal: 'coal',
    gold: 'gold'
}
const GROUPS = {
    land: 'land',
    forest: 'forest',
    mine: 'mine'
}
const GROUP_ICONS = {
    land: '🔲',
    forest: '🌲',
    mine: '⛏️'
}

const INITIAL_MONEY = 0
const INITIAL_SEEDS = 4

const CHOP_POWER_BASE = 0.025
// Define tree aging - let's say a tree takes a minute to grow fully
const TREE_BASE_MATURE_TIME = 60 // 60 seconds
// While growing there should be a few stages of growth, represented by an emoji
const TREE_GROWTH_STAGES = ['🌱', '🌿', '🌳', '🌲']
// Define the age per stage
const TREE_GROWTH_STAGES_BASE_INTERVAL = TREE_BASE_MATURE_TIME / TREE_GROWTH_STAGES.length
// Define the gains per stage, if a tree is not fully grown yet, it should give much less wood exponentially
const TREE_WOOD_GAINS = [0.1, 0.25, 0.5, 1]
const TREE_WOOD_GAINS_BASE = 10
const TREE_SELF_SEED_CHANCE = 1 / 100
const EXTRA_SEED_CHANCE_BASE = 1 / 10
const EXTRA_SEED_CHANCE_MULTIPLIER = 2
const LUCKY_RESOURCE_MINE_CHANCE = 1 / 10

// Price base
const WOOD_PRICE_BASE = 5
const SEED_PRICE_BASE = 50
const DIAMOND_PRICE_BASE = 5_000
const METAL_PRICE_BASE = 500

// Define the size of the storage
const WOOD_STORAGE_SIZE = 100
const SEEDS_STORAGE_SIZE = 10
const DIAMONDS_STORAGE_SIZE = 1
const METAL_STORAGE_SIZE = 10

// Mine stuff
// Mines work different from forests, each stage has levels. The first stage has one level, the second has 3, the third has Infinite
// The first stage uses dugPower and only has one level but should require like 50 clicks to get to the next stage
// The second stage is when a mine has openened, but to be able to go deeper, wood is required, because you need to build support beams (250 wood per level)
// The third stage is when you can mine for resources. Once the third stage is reached it is a fully operational mine.
// Automators for the mine: Auto Excavator, Auto Tunneler, Auto Diamond Miner
const MINE_EXCAVATOR_POWER = 1 / 50 // 50 clicks to get to the next stage
const MINE_TUNNELER_POWER = 1 / 100
const MINE_DIAMOND_MINER_POWER = 1 / 200
const MINE_SUPPORT_BEAM_COST = 250 // wood
const MINE_RESOURCE_ICONS = {
    diamond: '💎',
    metal: '🔧'
}
const MINE_RESOURCE_OPENING_LEVELS = {
    diamond: 1,
    metal: 1
}
const MINE_RESOURCE_TUNNELING_LEVELS = {
    diamond: 3,
    metal: 1
}
const MINE_MAX_RESOURCES_PER_LEVEL = {
    diamond: 5,
    metal: 10
}
const MINE_RESOURCE_CLICKS = {
    diamond: 200,
    metal: 50
}

const DEFAULT_UPGRADE_VISIBILITY_THRESHOLD = 0.25
const DEFAULT_UPGRADE_BLUR_THRESHOLD = 0.5

// Define costs for tiles, columns and rows
const DEFAULT_COST_MULTIPLIER = 1.21

const GROUP_TITLES = {
    tools: 'Tools',
    land: 'Land',
    storage: 'Storage',
    automation: 'Automation',
    special: 'Special'
}

// Let's define the upgrades in a config, so we don't need a computed method for each
const UPGRADES = [
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
        name: 'Shovel',
        displayName: 'Bigger Excavator',
        description: 'Trade your excavator for a bigger one to dig an entrance for a mine',
        initialOwned: 0,
        baseCost: 10000,
        costMultiplier: 1.5,
        speed: undefined,
        category: 'tools',
        group: GROUPS.mine
    },
    {
        name: 'Tunneling',
        displayName: 'Improved Tunneling',
        description: 'Research improved tunneling techniques',
        initialOwned: 0,
        baseCost: 10000,
        costMultiplier: 1.75,
        speed: undefined,
        category: 'tools',
        group: GROUPS.mine
    },
    {
        name: 'Pickaxe',
        displayName: 'Harden Pickaxe',
        description: 'Mine resources faster with a hardened pickaxe',
        initialOwned: 0,
        baseCost: 10000,
        costMultiplier: 2,
        speed: undefined,
        category: 'tools',
        group: GROUPS.mine
    },
    {
        name: 'Forest Tile',
        description: 'Claim a tile of land to grow trees on',
        initialOwned: 1,
        baseCost: 100,
        costMultiplier: 1.2,
        speed: undefined,
        category: 'land',
        group: GROUPS.forest
    },
    {
        name: 'Metal Mine Tile',
        description: 'Claim a tile of land to dig for metal',
        initialOwned: 0,
        baseCost: 2000,
        costMultiplier: 1.25,
        speed: undefined,
        category: 'land',
        group: GROUPS.mine
    },
    {
        name: 'Diamond Mine Tile',
        description: 'Claim a tile of land to dig for diamonds',
        initialOwned: 0,
        baseCost: 5000,
        costMultiplier: 1.25,
        speed: undefined,
        category: 'land',
        group: GROUPS.mine
    },
    {
        name: 'Extra Column',
        description: 'Buy an extra column of land',
        initialOwned: 2,
        baseCost: 100,
        costMultiplier: 5,
        speed: undefined,
        category: 'land',
        group: GROUPS.land
    },
    {
        name: 'Extra Row',
        description: 'Buy an extra row of land',
        initialOwned: 2,
        baseCost: 100,
        costMultiplier: 5,
        speed: undefined,
        category: 'land',
        group: GROUPS.land
    },
    {
        name: 'Wood Storage',
        description: 'Increase the amount of wood you can store',
        initialOwned: 1,
        baseCost: 1000,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: undefined,
        category: 'storage',
        group: GROUPS.forest
    },
    {
        name: 'Seed Storage',
        displayName: 'Seed Bottle',
        description: 'Increase the amount of seeds you can store',
        initialOwned: 1,
        baseCost: 1500,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: undefined,
        category: 'storage',
        group: GROUPS.forest
    },
    {
        name: 'Metal Storage',
        displayName: 'Metal Crate',
        description: 'Increase the amount of metal you can store',
        initialOwned: 1,
        baseCost: 5000,
        costMultiplier: 2,
        speed: undefined,
        category: 'storage',
        group: GROUPS.mine
    },
    {
        name: 'Diamond Storage',
        displayName: 'Diamond Box',
        description: 'Increase the amount of diamonds you can store',
        initialOwned: 1,
        baseCost: 12_500,
        costMultiplier: 2,
        speed: undefined,
        category: 'storage',
        group: GROUPS.mine
    },
    // Automation
    {
        name: 'Auto Digger',
        description: 'Automatically dig holes on empty land',
        initialOwned: 0,
        baseCost: 800,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: 0.75,
        category: 'automation',
        group: GROUPS.forest
    },
    {
        name: 'Auto Seeder',
        description: 'Automatically plant seeds in dug holes',
        initialOwned: 0,
        baseCost: 1000,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
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
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: 1 / 2,
        category: 'automation',
        group: GROUPS.forest
    },
    {
        name: 'Seed Seller',
        description: 'Automatically sell excess seeds',
        initialOwned: 0,
        baseCost: 3000,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: 1 / 8,
        category: 'automation',
        group: GROUPS.forest
    },
    {
        name: 'Wood Reclaimer',
        description: 'Collect lost wood',
        initialOwned: 0,
        baseCost: 2500,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
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
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: 1 / 30,
        category: 'automation'
    },
    {
        name: 'Auto Shoveler',
        displayName: 'Auto Mine Maker',
        description: 'Automatically dig rocks to create a mine',
        initialOwned: 0,
        baseCost: 10000,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: 1,
        category: 'automation',
        group: GROUPS.mine
    },
    {
        name: 'Auto Tunneler',
        description: 'Automatically dig tunnels through rocks while building support beams',
        initialOwned: 0,
        baseCost: 12000,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: 1,
        category: 'automation',
        group: GROUPS.mine
    },
    {
        name: 'Resource Miner',
        description: 'Automatically mine resources',
        initialOwned: 0,
        baseCost: 15_000,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: 1,
        category: 'automation',
        group: GROUPS.mine
    },
    {
        name: 'Metal Seller',
        description: 'Automatically sell metal',
        initialOwned: 0,
        baseCost: 15_000,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: 1 / 60,
        category: 'automation',
        group: GROUPS.mine
    },
    {
        name: 'Metal Reclaimer',
        displayName: 'Metal Detector',
        description: 'Send out a metal detector to find lost metal in your mine',
        initialOwned: 0,
        baseCost: 20_000,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: 1 / 120,
        category: 'automation',
        group: GROUPS.mine
    },
    {
        name: 'Diamond Seller',
        description: 'Automatically sell diamonds',
        initialOwned: 0,
        baseCost: 20_000,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: 1 / 180,
        category: 'automation',
        group: GROUPS.mine
    },
    {
        name: 'Diamond Reclaimer',
        displayName: 'Mine Magpie',
        description: 'Send a magpie into your caves to find the diamonds you haphazardly dropped all over the place',
        initialOwned: 0,
        baseCost: 50_000,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: 1 / 240,
        category: 'automation',
        group: GROUPS.mine
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
        group: GROUPS.forest
    },
    {
        name: 'Wood Marketing 1',
        displayName: 'Wood Marketing 1',
        description: 'Increase wood price by 2x',
        initialOwned: 0,
        baseCost: 1000,
        category: 'special',
        max: 1,
        group: GROUPS.forest
    },
    {
        name: 'Seed Luck 1',
        displayName: 'Clover Seed',
        description: 'Increase chance of getting an extra seed by 2x',
        initialOwned: 0,
        baseCost: 2000,
        category: 'special',
        max: 1,
        group: GROUPS.forest
    },
    {
        name: 'Seed Marketing 1',
        displayName: 'Seed Marketing 1',
        description: 'Increase seed price by 2x',
        initialOwned: 0,
        baseCost: 2000,
        category: 'special',
        max: 1,
        group: GROUPS.forest
    },
    {
        name: 'Seed Marketing 2',
        displayName: 'Seed Marketing 2',
        description: 'Increase seed price by 3x',
        initialOwned: 0,
        baseCost: 10_000,
        category: 'special',
        max: 1,
        group: GROUPS.forest
    },
    {
        name: 'Wood Marketing 2',
        displayName: 'Wood Marketing 2',
        description: 'Increase wood price by 2x',
        initialOwned: 0,
        baseCost: 8000,
        category: 'special',
        max: 1,
        group: GROUPS.forest
    },
    {
        name: 'Wood Marketing 3',
        displayName: 'Wood Marketing 3',
        description: 'Increase wood price by 2x',
        initialOwned: 0,
        baseCost: 20_000,
        category: 'special',
        max: 1,
        group: GROUPS.forest
    },
    {
        name: 'Diamond Marketing 1',
        displayName: 'Diamond Polishing',
        description: 'Give diamonds a shiny polish and increase their price by 1.5x',
        initialOwned: 0,
        baseCost: 50_000,
        category: 'special',
        max: 1,
        group: GROUPS.mine
    },
    {
        name: 'Diamond Marketing 2',
        displayName: 'Diamond Shine',
        description: 'Give diamonds an even shinier polish and increase their price by 2x',
        initialOwned: 0,
        baseCost: 150_000,
        category: 'special',
        max: 1,
        group: GROUPS.mine
    }
]
const UPGRADES_INDEX = makeIndex(UPGRADES, 'name')

let haltAnimation = false

function makeIndex(arr, key) {
    return arr.reduce((acc, item) => {
        acc[item[key]] = item
        return acc
    }, {})
}

function isLucky(chance) {
    // Returns true or false based on the chance 0 = never, 1 = always
    return Math.random() < chance
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
}

function pluck(arr) {
    return arr.splice(Math.floor(Math.random() * arr.length), 1)[0]
}

function bigNum(n) {
    const sign = Math.sign(n)
    n = Math.abs(n)
    if (n < 1000000) {
        return Math.round(sign * n).toLocaleString()
    }
    const suffixes = [
        '',
        'K',
        'million',
        'billion',
        'trillion',
        'quadrillion',
        'quintillion',
        'sextillion',
        'septillion',
        'octillion',
        'nonillion'
    ]
    let suffixIndex = 0
    while (n >= 1000) {
        n /= 1000
        suffixIndex++
    }
    n *= sign
    const formatted = n.toLocaleString(undefined, { maximumFractionDigits: 2 })
    return `${formatted} ${suffixes[suffixIndex]}`
}

function setBoolPropTimeout(obj, prop, timeOutProp, time) {
    if (haltAnimation) return
    clearTimeout(obj[timeOutProp])
    setTimeout(() => {
        obj[prop] = false
    }, 1)
    setTimeout(() => {
        obj[prop] = true
    }, 2)
    obj[timeOutProp] = setTimeout(() => {
        obj[prop] = false
    }, time)
}

class Tile {
    constructor() {
        this.tileType = TILE_TYPES.none
        this.type = FOREST_TILE_TYPES.empty
        this.subType = '' // Used e.g. by mines to determine what resource is in the tile
        this.progress = 0
        this.age = 0
        this.stage = 0
        this.stageP = 0
        this.wiggle = false
        this.fail = false
        this.grow = false

        this.wiggleTimeout = -1
        this.failTimeout = -1
        this.growTimeout = -1
    }
    animateWiggle() {
        setBoolPropTimeout(this, 'wiggle', 'wiggleTimeout', 250)
    }
    animateFail() {
        setBoolPropTimeout(this, 'fail', 'failTimeout', 1000)
    }
    animateGrow() {
        setBoolPropTimeout(this, 'grow', 'growTimeout', 250)
    }
}

class Automator {
    constructor(upgradeName, logic) {
        this.enabled = true
        this.saturation = 0
        this.upgradeName = upgradeName // To determine the amount via boughtUpgrades
        this.logic = logic
        this.speed = 0 // Calculated
        this.displayName = UPGRADES_INDEX[upgradeName].displayName ?? upgradeName
    }
    get name() {
        return this.displayName
    }
}

const COUNTER_SAMPLE_LENGTH = 3
class Counter {
    constructor(name, fn) {
        this.name = name
        this.fn = fn
        this.delta = 0
        this.prevValues = []
    }
    update() {
        this.prevValues.push(this.fn())
        if (this.prevValues.length > COUNTER_SAMPLE_LENGTH) {
            this.prevValues.shift()

            let deltas = []
            for (let i = 1; i < this.prevValues.length; i++) {
                deltas.push(this.prevValues[i] - this.prevValues[i - 1])
            }
            this.delta = deltas.reduce((acc, val) => acc + val, 0) / deltas.length
        }
    }
}

class Resource {
    constructor(name, displayName, icon, basePrice, storageBaseSize, initialOwned = 0) {
        this.name = name
        this.displayName = displayName
        this.icon = icon
        this.basePrice = basePrice
        this.storageBaseSize = storageBaseSize
        this.price = basePrice
        this.storage = 1 // Number of storage units
        this.lost = 0
        this.sellNum = 1 // How many to sell per click
        this.owned = initialOwned
    }
    get storageSize() {
        return this.storageBaseSize * this.storage
    }
    get any() {
        return this.owned > 0
    }
    get sellNumPrice() {
        return Math.min(this.sellNum, this.owned) * this.price
    }
    sellPriceTheoretical(n) {
        return n * this.price
    }
    sellPrice(n) {
        return Math.min(n, this.owned) * this.price
    }
    gain(n) {
        this.owned += n
        if (this.owned > this.storageSize) {
            this.lost += this.owned - this.storageSize
            this.owned = this.storageSize
        }
    }
    // Subtract n from owned if sufficient, return false if not
    incur(n) {
        if (this.owned < n) {
            return false
        }
        this.owned -= n
        return true
    }
    sell(n) {
        n = Math.min(n, this.owned)
        this.owned -= n
        return n * this.price
    }
    reclaim(n = 1) {
        let toReclaim = Math.min(this.lost, n)
        if (this.owned + toReclaim <= this.storageSize) {
            this.lost -= toReclaim
            this.owned += toReclaim
        }
    }
}

/** @ts-ignore */
const app = Vue.createApp({
    data() {
        return {
            DEBUG,
            UPGRADES,

            now: Date.now(),
            startTime: Date.now(),
            lastUpdate: Date.now(),

            land: [],
            resources: {},
            automators: [],
            counters: [],
            boughtUpgrades: {},
            visibleUpgrades: [],
            unblurredUpgrades: [],
            message: '',
            messageFade: 0,

            // Vars
            money: INITIAL_MONEY,
            digPower: 0.2,
            plantPower: 0.5,
            luckySeedChance: EXTRA_SEED_CHANCE_BASE,

            // Stats
            treesChopped: 0
        }
    },
    created() {
        // Initialize bought upgrades obj
        this.UPGRADES.forEach(upgrade => {
            this.boughtUpgrades[upgrade.name] = upgrade.initialOwned ?? 0
        })

        // Initialize land
        for (let i = 0; i < this.boughtUpgrades['Forest Tile']; i++) {
            this.land.push(this.createForestTile())
        }

        // Initialize resources
        this.resources = {
            money: new Resource('money', 'Money', '💰', 1, Infinity, INITIAL_MONEY),
            wood: new Resource('wood', 'Wood', '🪓', WOOD_PRICE_BASE, WOOD_STORAGE_SIZE),
            seeds: new Resource('seeds', 'Seeds', '🌱', SEED_PRICE_BASE, SEEDS_STORAGE_SIZE, INITIAL_SEEDS),
            diamonds: new Resource('diamonds', 'Diamonds', '💎', DIAMOND_PRICE_BASE, DIAMONDS_STORAGE_SIZE),
            metal: new Resource('metal', 'Metal', '🔧', METAL_PRICE_BASE, METAL_STORAGE_SIZE)
        }

        // Initialize automators
        this.automators = [
            new Automator('Auto Digger', () => {
                const tile = this.forestLand.find(tile => tile.type === FOREST_TILE_TYPES.empty)
                if (tile) {
                    this.digTile(tile)
                }
            }),
            new Automator('Auto Seeder', () => {
                const tile = this.forestLand.find(tile => tile.type === FOREST_TILE_TYPES.hole)
                if (tile) {
                    this.plantSeed(tile)
                }
            }),
            new Automator('Auto Chopper', () => {
                const fullyGrownTrees = this.forestLand.filter(
                    tile => tile.type === FOREST_TILE_TYPES.tree && tile.stage === TREE_GROWTH_STAGES.length - 1
                )
                const maxChopped = Math.max(...fullyGrownTrees.map(tile => tile.progress))
                const tile = fullyGrownTrees.find(tile => tile.progress === maxChopped)
                if (tile) {
                    this.chopTree(tile)
                }
            }),
            new Automator('Wood Seller', () => {
                this.sellResource(this.resources.wood, 1)
            }),
            new Automator('Wood Reclaimer', () => {
                this.resources.wood.reclaim(1)
            }),
            new Automator('Seed Seller', () => {
                // Determine excess seeds: each tree counts as 1 seed
                // So if forestLand has 4 tiles and 2 have trees and we have 3 seeds, we have 1 excess seed
                const treeTiles = this.forestLand.filter(tile => tile.type === FOREST_TILE_TYPES.tree)
                const excessSeeds = this.resources.seeds.owned + treeTiles.length - this.forestLand.length
                if (excessSeeds > 0) {
                    this.sellResource(this.resources.seeds, 1)
                }
            }),
            new Automator('Seed Reclaimer', () => {
                this.resources.seeds.reclaim(1)
            }),
            new Automator('Auto Shoveler', () => {
                const tile = pick(this.mineLand.filter(tile => tile.type === MINE_TILE_TYPES.rock))
                if (tile) {
                    this.digMineTile(tile)
                }
            }),
            new Automator('Auto Tunneler', () => {
                const tile = pick(this.mineLand.filter(tile => tile.type === MINE_TILE_TYPES.tunnel))
                if (tile) {
                    this.tunnelMineTile(tile)
                }
            }),
            new Automator('Resource Miner', () => {
                const resourceTiles = this.mineLand.filter(tile => tile.type === MINE_TILE_TYPES.resource)
                const tile = pick(resourceTiles)
                if (!tile) {
                    return
                }
                this.mineResource(tile)

                // The more resource miners, the higher the chance of mining the same tile again
                resourceTiles.forEach(tile => {
                    if (isLucky(LUCKY_RESOURCE_MINE_CHANCE)) {
                        this.mineResource(tile)
                    }
                })
            }),
            new Automator('Metal Seller', () => {
                this.sellResource(this.resources.metal, 1)
            }),
            new Automator('Metal Reclaimer', () => {
                this.resources.metal.reclaim(1)
            }),
            new Automator('Diamond Seller', () => {
                this.sellResource(this.resources.diamonds, 1)
            }),
            new Automator('Diamond Reclaimer', () => {
                this.resources.diamonds.reclaim(1)
            })
        ]
        this.counters = [new Counter('money', () => this.money)]

        // Check if all UPGRADES of type automation have a corresponding automator programmed in
        this.UPGRADES.forEach(upgrade => {
            if (
                upgrade.category === 'automation' &&
                !this.automators.find(automator => automator.upgradeName === upgrade.name)
            ) {
                console.error(`Automator for upgrade ${upgrade.name} is missing!`)
            }
        })
    },
    mounted() {
        this.showMessage(
            `Welcome to your land! You start out with one tile of forest land and ${INITIAL_SEEDS} seeds. Good luck!`
        )
        this.startGameLoop()
    },
    methods: {
        num(n) {
            if (typeof n !== 'number') return n
            return bigNum(n)
        },
        showMessage(message) {
            console.log('Message:', message)
            this.message = message
            this.messageFade = 1
        },
        startGameLoop() {
            setInterval(this.gameLoop, 1000 / FPS)
            setInterval(this.perSecond, 1000)
        },
        gameLoop() {
            const now = Date.now()
            this.now = now
            const elapsed = (now - this.lastUpdate) / 1000 // Time in seconds
            this.lastUpdate = now

            // Update game logic based on elapsed time
            this.updateGame(elapsed)
        },
        perSecond() {
            // Calculate money per second, etc.
            this.counters.forEach(counter => counter.update())
        },
        updateGame(elapsed) {
            haltAnimation = false

            // If elapsed is massive, the game was paused maybe due to hibernation or tab switch
            // In that case, animations caused by setTimeout should not be triggered this update
            if (elapsed > 10) {
                console.warn('Massive elapsed time detected, halting animations. Elapsed seconds:', elapsed)
                haltAnimation = true
            }

            this.messageFade -= elapsed / 10
            if (this.messageFade < 0) {
                this.messageFade = 0
            }

            this.land.forEach(tile => {
                tile.stageP = 0
                switch (tile.tileType) {
                    case TILE_TYPES.forest:
                        // Increase age of all trees
                        if (tile.type === FOREST_TILE_TYPES.tree) {
                            tile.age += elapsed * (this.boughtUpgrades['Fertilizer'] + 1)
                            tile.progress -= elapsed / (TREE_BASE_MATURE_TIME * 2)
                            if (tile.progress < 0) {
                                tile.progress = 0
                            }
                            let prevStage = tile.stage
                            tile.stage = Math.min(
                                TREE_GROWTH_STAGES.length - 1,
                                Math.floor(tile.age / TREE_GROWTH_STAGES_BASE_INTERVAL)
                            )
                            // If stage has changed, wiggly wiggle
                            if (prevStage !== tile.stage) {
                                tile.animateGrow()
                            }
                            // stageP is the percentage of the age until it has reached the final stage
                            tile.stageP = Math.min(
                                1,
                                tile.age / (TREE_BASE_MATURE_TIME - TREE_GROWTH_STAGES_BASE_INTERVAL)
                            )
                        }
                        break
                    case TILE_TYPES.mine:
                        tile.stageP = tile.progress
                        break
                }
                tile.stageP = Math.min(1, tile.stageP)
            })

            // Determine if upgrade should be made visible. Once visible, it should stay visible.
            // An upgrade should become visible if the player has a certain % of the cost of the upgrade
            UPGRADES.forEach(upgrade => {
                if (
                    !this.visibleUpgrades.includes(upgrade.name) &&
                    this.money >= upgrade.baseCost * DEFAULT_UPGRADE_VISIBILITY_THRESHOLD
                ) {
                    this.visibleUpgrades.push(upgrade.name)
                }
                if (
                    !this.unblurredUpgrades.includes(upgrade.name) &&
                    this.money >= upgrade.baseCost * DEFAULT_UPGRADE_BLUR_THRESHOLD
                ) {
                    this.unblurredUpgrades.push(upgrade.name)
                }
            })

            // Run automators
            this.automators.forEach(automator => {
                const num = this.boughtUpgrades[automator.upgradeName]
                if (automator.enabled && num > 0) {
                    const speed = UPGRADES_INDEX[automator.upgradeName].speed * num
                    automator.saturation += speed * elapsed
                    automator.speed = speed
                    while (automator.saturation >= 1) {
                        automator.saturation -= 1
                        automator.logic(elapsed)
                    }
                }
            })
        },
        digTile(tile) {
            if (tile.type !== FOREST_TILE_TYPES.empty) {
                return
            }
            tile.progress += this.digPower
            if (tile.progress >= 1) {
                tile.progress = 0
                tile.type = FOREST_TILE_TYPES.hole
            }
        },
        plantSeed(tile) {
            if (tile.type !== FOREST_TILE_TYPES.hole) {
                return
            }
            tile.progress += this.plantPower
            if (tile.progress >= 1) {
                if (this.resources.seeds.incur(1)) {
                    tile.progress = 0
                    tile.type = FOREST_TILE_TYPES.tree
                } else {
                    this.showMessage('No seeds left!')
                }
            }
        },
        chopTree(tile) {
            if (tile.type !== FOREST_TILE_TYPES.tree) {
                return
            }
            tile.progress += this.chopPower
            tile.animateWiggle()
            if (tile.progress >= 1) {
                tile.progress = 0
                let woodGainM = TREE_WOOD_GAINS[tile.stage]
                let woodGains = TREE_WOOD_GAINS_BASE * woodGainM
                this.resources.wood.gain(woodGains)
                this.resources.seeds.gain(1)
                this.treesChopped += 1
                let msg = ''
                // If lucky, get an extra seed
                if (isLucky(this.luckySeedChance)) {
                    msg += 'Lucky! Got an extra seed! '
                    this.resources.seeds.gain(1)
                }
                // If super lucky, automatically plant a seed
                if (isLucky(TREE_SELF_SEED_CHANCE)) {
                    msg += 'Super lucky! Another tree is already growing here!'
                    tile.age = 0
                } else {
                    this.resetTile(tile)
                }
                if (msg) {
                    this.showMessage(msg)
                }
            }
        },
        digMineTile(tile) {
            if (tile.type !== MINE_TILE_TYPES.rock) {
                return
            }
            tile.progress += this.excavatorPower
            if (tile.progress >= 1) {
                tile.stage += 1
                tile.progress = 0
                if (tile.stage >= MINE_RESOURCE_OPENING_LEVELS[tile.subType]) {
                    tile.stage = 0
                    tile.type = MINE_TILE_TYPES.tunnel
                    this.showMessage('Mine entrance opened!')
                }
            }
        },
        tunnelMineTile(tile) {
            if (tile.type !== MINE_TILE_TYPES.tunnel) {
                return
            }
            tile.progress += this.tunnelerPower
            tile.animateWiggle()
            if (tile.progress >= 1) {
                if (this.resources.wood.incur(MINE_SUPPORT_BEAM_COST)) {
                    tile.stage += 1
                    tile.progress = 0
                    if (tile.stage >= MINE_RESOURCE_TUNNELING_LEVELS[tile.subType]) {
                        tile.stage = 0
                        tile.type = MINE_TILE_TYPES.resource
                        this.showMessage(`Cave full of ${tile.subType}s found!`)
                    } else {
                        this.showMessage(`Support beams built with ${this.num(MINE_SUPPORT_BEAM_COST)} wood!`)
                    }
                } else {
                    tile.animateFail()
                    this.showMessage(
                        `Not enough wood to build support beams! You need ${this.num(
                            MINE_SUPPORT_BEAM_COST
                        )} wood to continue tunneling.`
                    )
                }
            }
        },
        mineResource(tile) {
            if (tile.type !== MINE_TILE_TYPES.resource) {
                return
            }
            tile.progress += this.resourceMinerPower / MINE_RESOURCE_CLICKS[tile.subType]
            tile.animateWiggle()
            if (tile.progress >= 1) {
                tile.progress = 0
                tile.stage += 1
                switch (tile.subType) {
                    case MILE_RESOURCE_TYPES.diamond:
                        this.resources.diamonds.gain(1)
                        break
                    case MILE_RESOURCE_TYPES.metal:
                        this.resources.metal.gain(1)
                        break
                    default:
                        console.error('mineResource: Unknown resource type:', tile.subType)
                        break
                }
                // If max amount of resources per cave is reached, go back to tunneling
                if (tile.stage >= MINE_MAX_RESOURCES_PER_LEVEL[tile.subType]) {
                    tile.stage = 0
                    tile.type = MINE_TILE_TYPES.tunnel
                    this.showMessage('Resource cave depleted! Time to dig deeper.')
                }
            }
        },
        /**
         *
         * @param {Tile} tile
         */
        resetTile(tile) {
            tile.type = FOREST_TILE_TYPES.empty
            tile.progress = 0
            tile.age = 0
            tile.stage = 0
            tile.stageP = 0
        },
        /**
         *
         * @param {Resource} resource
         * @param {number} amount
         */
        sellResource(resource, amount = 0) {
            if (amount === 0) amount = resource.sellNum
            this.money += resource.sell(amount)
        },
        sellAutomator(automator) {
            // Get the cost of the current automator
            let upgrade = UPGRADES_INDEX[automator.upgradeName]
            let owned = this.boughtUpgrades[automator.upgradeName]
            const price = this.getUpgradeCostNum(upgrade, owned - 1)
            this.money += price
            this.boughtUpgrades[automator.upgradeName] -= 1
            console.log('Sold automator:', automator, 'for', price)
        },
        incur(money) {
            if (this.money < money) {
                return false
            }
            this.money -= money
            return true
        },

        clickTile(tile) {
            if (!tile) {
                this.showMessage('Buy a tile to claim this land!')
                return
            }
            //console.log('Clicked tile:', JSON.parse(JSON.stringify(tile)))
            switch (tile.tileType) {
                case TILE_TYPES.forest:
                    this.clickForestTile(tile)
                    break
                case TILE_TYPES.mine:
                    this.clickMineTile(tile)
                    break
                default:
                    console.error('Unknown tile type:', tile.tileType)
                    break
            }
        },
        clickForestTile(tile) {
            switch (tile.type) {
                case FOREST_TILE_TYPES.empty:
                    this.digTile(tile)
                    break
                case FOREST_TILE_TYPES.hole:
                    this.plantSeed(tile)
                    break
                case FOREST_TILE_TYPES.tree:
                    this.chopTree(tile)
                    break
                default:
                    console.error('Unknown tile type:', tile.type)
                    break
            }
        },
        clickMineTile(tile) {
            switch (tile.type) {
                case MINE_TILE_TYPES.rock:
                    this.digMineTile(tile)
                    break
                case MINE_TILE_TYPES.tunnel:
                    this.tunnelMineTile(tile)
                    break
                case MINE_TILE_TYPES.resource:
                    this.mineResource(tile)
                    break
                default:
                    console.error('Unknown tile type:', tile.type)
                    break
            }
        },

        createForestTile() {
            const tile = new Tile()
            tile.tileType = TILE_TYPES.forest
            tile.type = FOREST_TILE_TYPES.empty
            return tile
        },
        createMineTile(subType) {
            const tile = new Tile()
            tile.tileType = TILE_TYPES.mine
            tile.type = MINE_TILE_TYPES.rock
            tile.subType = subType
            return tile
        },
        getTileIcon(tile) {
            switch (tile.tileType) {
                case TILE_TYPES.forest:
                    switch (tile.type) {
                        case FOREST_TILE_TYPES.empty:
                            return ''
                        case FOREST_TILE_TYPES.hole:
                            return '🕳️'
                        case FOREST_TILE_TYPES.tree:
                            return TREE_GROWTH_STAGES[tile.stage]
                        default:
                            return '❓'
                    }
                case TILE_TYPES.mine:
                    switch (tile.type) {
                        case MINE_TILE_TYPES.rock:
                            return '⛰️'
                        case MINE_TILE_TYPES.tunnel:
                            return '⛏️'
                        case MINE_TILE_TYPES.resource:
                            return MINE_RESOURCE_ICONS[tile.subType]
                        default:
                            return '❓'
                    }
                default:
                    return ''
            }
        },
        getLandTileClass(tile) {
            return {
                wiggle: tile.wiggle,
                'grow-bounce': tile.grow
            }
        },
        getTileStyle(tile) {
            let opacity = tile.progress
            let lineHeight = null
            let fontSizeM = 1
            switch (tile.type) {
                case FOREST_TILE_TYPES.hole:
                    lineHeight = 1.5
                    break
                case FOREST_TILE_TYPES.tree:
                    // If final stage, make it bigger
                    if (tile.stage != TREE_GROWTH_STAGES.length - 1) {
                        fontSizeM = 0.75
                        lineHeight = 1.8
                    }
                    break
            }
            return {
                backgroundColor: `rgba(0, 128, 0, ${opacity})`,
                width: `${TILE_SIZE}px`,
                height: `${TILE_SIZE}px`,
                fontSize: `${TILE_SIZE * 0.75 * fontSizeM}px`,
                lineHeight: lineHeight ? `${lineHeight}em` : null
            }
        },
        getTileLevel(tile) {
            // Some tiles have levels, like mines
            switch (tile.tileType) {
                case TILE_TYPES.mine:
                    switch (tile.type) {
                        case MINE_TILE_TYPES.rock:
                            return MINE_RESOURCE_OPENING_LEVELS[tile.subType] > 1
                                ? MINE_RESOURCE_OPENING_LEVELS[tile.subType] - tile.stage
                                : null
                        case MINE_TILE_TYPES.tunnel:
                            return MINE_RESOURCE_TUNNELING_LEVELS[tile.subType] > 1
                                ? MINE_RESOURCE_TUNNELING_LEVELS[tile.subType] - tile.stage
                                : null
                        case MINE_TILE_TYPES.resource:
                            return MINE_MAX_RESOURCES_PER_LEVEL[tile.subType] - tile.stage
                        default:
                            return null
                    }
                default:
                    return null
            }
        },
        getTileTooltip(tile) {
            switch (tile.tileType) {
                case TILE_TYPES.forest:
                    switch (tile.type) {
                        case FOREST_TILE_TYPES.empty:
                            return 'Empty land - click to dig a hole'
                        case FOREST_TILE_TYPES.hole:
                            return 'Dug hole - click to plant a seed'
                        case FOREST_TILE_TYPES.tree:
                            return `Tree - click to chop it down - the older the tree, the more wood you get`
                        default:
                            return 'Unknown forest tile'
                    }
                case TILE_TYPES.mine:
                    switch (tile.type) {
                        case MINE_TILE_TYPES.rock:
                            return 'Rock - click to dig an entrance for a mine'
                        case MINE_TILE_TYPES.tunnel:
                            return `Mine Tunnel (${tile.subType}) - at level ${tile.stage} of ${
                                MINE_RESOURCE_TUNNELING_LEVELS[tile.subType]
                            } - click to dig deeper`
                        case MINE_TILE_TYPES.resource:
                            return `Mine (${tile.subType}) - click to mine resources - found resources: ${
                                tile.stage
                            } of ${MINE_MAX_RESOURCES_PER_LEVEL[tile.subType]}`
                        default:
                            return 'Unknown mine tile'
                    }
                default:
                    return 'Unknown tile'
            }
        },
        getTileProgressAltStyle(tile) {
            // Some tiles have a different progress bar style
            switch (tile.tileType) {
                case TILE_TYPES.forest:
                    switch (tile.type) {
                        case FOREST_TILE_TYPES.tree:
                            return {
                                // width based on progress. if progress = 0, width = 100% (health bar)
                                width: `${(1 - tile.progress) * 100}%`
                            }
                    }
            }
            return {}
        },

        getUpgradeCost(upgrade) {
            return this.getUpgradeCostNum(upgrade, this.boughtUpgrades[upgrade.name])
        },
        getUpgradeCostNum(upgrade, num) {
            return upgrade.baseCost * Math.pow(upgrade.costMultiplier, num - upgrade.initialOwned)
        },
        buyUpgrade(upgrade) {
            if (upgrade.max && this.boughtUpgrades[upgrade.name] >= upgrade.max) {
                return false
            }
            let cost = this.getUpgradeCost(upgrade)
            if (!this.incur(cost)) {
                return
            }
            this.boughtUpgrades[upgrade.name] += 1

            switch (upgrade.name) {
                case 'Forest Tile':
                    this.land.push(this.createForestTile())
                    break
                case 'Diamond Mine Tile':
                    this.land.push(this.createMineTile(MILE_RESOURCE_TYPES.diamond))
                    break
                case 'Metal Mine Tile':
                    this.land.push(this.createMineTile(MILE_RESOURCE_TYPES.metal))
                    break
                // Storage
                case 'Wood Storage':
                    this.resources.wood.storage += 1
                    break
                case 'Seed Storage':
                    this.resources.seeds.storage += 1
                    break
                case 'Diamond Storage':
                    this.resources.diamonds.storage += 1
                    break
                case 'Metal Storage':
                    this.resources.metal.storage += 1
                    break
                // Specials
                case 'Wooden Finger':
                    this.resources.wood.sellNum *= 10
                    break
                case 'Wood Marketing 1':
                    this.resources.wood.price *= 2
                    break
                case 'Seed Luck 1':
                    this.luckySeedChance *= EXTRA_SEED_CHANCE_MULTIPLIER
                    break
                case 'Seed Marketing 1':
                    this.resources.seeds.price *= 2
                    break
                case 'Seed Marketing 2':
                    this.resources.seeds.price *= 3
                    break
                case 'Wood Marketing 2':
                    this.resources.wood.price *= 2
                    break
                case 'Wood Marketing 3':
                    this.resources.wood.price *= 2
                    break
                case 'Diamond Marketing 1':
                    this.resources.diamonds.price *= 1.5
                    break
                case 'Diamond Marketing 2':
                    this.resources.diamonds.price *= 2
                    break
            }
        },
        hasRoomForTile() {
            return this.land.length >= this.boughtUpgrades['Extra Column'] * this.boughtUpgrades['Extra Row']
        },
        canBuyUpgrade(upgrade) {
            switch (upgrade.name) {
                case 'Forest Tile':
                case 'Diamond Mine Tile':
                case 'Metal Mine Tile':
                    if (this.hasRoomForTile()) {
                        return false
                    }
                    break
            }
            return this.money >= this.getUpgradeCost(upgrade)
        },
        toggleAutomator(automator) {
            automator.enabled = !automator.enabled
        }
    },
    computed: {
        minutesSinceStart() {
            return (this.now - this.startTime) / 1000 / 60
        },
        forestLand() {
            return this.land.filter(tile => tile.tileType === TILE_TYPES.forest)
        },
        mineLand() {
            return this.land.filter(tile => tile.tileType === TILE_TYPES.mine)
        },
        anyDiamondMines() {
            /** @ts-ignore */
            return this.mineLand.some(tile => tile.subType === MILE_RESOURCE_TYPES.diamond)
        },
        anyMetalMines() {
            /** @ts-ignore */
            return this.mineLand.some(tile => tile.subType === MILE_RESOURCE_TYPES.metal)
        },
        landSize() {
            return [this.boughtUpgrades['Extra Column'], this.boughtUpgrades['Extra Row']]
        },
        landLength() {
            return this.landSize[0] * this.landSize[1]
        },
        landStyle() {
            return {
                width: `${this.landSize[0] * TILE_SIZE}px`,
                height: `${this.landSize[1] * TILE_SIZE}px`
            }
        },
        landView() {
            const view = []
            this.land.forEach(tile => {
                view.push({
                    type: tile.type,
                    tile,
                    icon: this.getTileIcon(tile),
                    style: this.getTileStyle(tile),
                    progressStyle: {
                        width: `${tile.stageP * 100}%`
                    },
                    progressAltStyle: this.getTileProgressAltStyle(tile),
                    level: this.getTileLevel(tile),
                    classes: this.getLandTileClass(tile),
                    tooltip: this.getTileTooltip(tile)
                })
            })
            // Add black squares for empty tiles (type: 'unclaimed')
            /** @ts-ignore */
            for (let i = view.length; i < this.landLength; i++) {
                view.push({
                    type: 'unclaimed',
                    tile: null,
                    icon: '',
                    tooltip: 'Unclaimed land',
                    style: {
                        width: `${TILE_SIZE}px`,
                        height: `${TILE_SIZE}px`
                    },
                    classes: 'unclaimed'
                })
            }
            return view
        },
        chopPower() {
            return CHOP_POWER_BASE * (this.boughtUpgrades['Axe'] + 1)
        },
        excavatorPower() {
            return MINE_EXCAVATOR_POWER * (this.boughtUpgrades['Shovel'] + 1)
        },
        tunnelerPower() {
            return MINE_TUNNELER_POWER * (this.boughtUpgrades['Tunneling'] + 1)
        },
        resourceMinerPower() {
            return this.boughtUpgrades['Pickaxe'] + 1
        },

        perS() {
            // Return obj with name, current, delta
            const result = {}
            this.counters.forEach(counter => {
                result[counter.name] = counter.delta
            })
            return result
        },

        resourcesView() {
            let result = [this.resources.wood, this.resources.seeds]
            if (this.anyMetalMines) {
                result.push(this.resources.metal)
            }
            if (this.anyDiamondMines) {
                result.push(this.resources.diamonds)
            }
            return result
        },
        automatorsView() {
            // Filter out automators that are not yet bought
            return this.automators.filter(automator => this.boughtUpgrades[automator.upgradeName] > 0)
        },
        upgradesView() {
            return this.UPGRADES.filter(upgrade => {
                if (upgrade.max && this.boughtUpgrades[upgrade.name] >= upgrade.max) {
                    return false
                }
                return this.visibleUpgrades.includes(upgrade.name)
            }).map(upgrade => {
                return {
                    ...upgrade,
                    cost: Math.ceil(this.getUpgradeCost(upgrade)),
                    blurred: !this.unblurredUpgrades.includes(upgrade.name),
                    canBuy: this.canBuyUpgrade(upgrade),
                    owned: this.boughtUpgrades[upgrade.name] || 0,
                    groupIcon: GROUP_ICONS[upgrade.group]
                }
            })
        },
        upgradesByCategoryView() {
            const upgradesByCategory = {}
            /** @ts-ignore */
            this.upgradesView.forEach(upgrade => {
                if (!upgradesByCategory[upgrade.category]) {
                    upgradesByCategory[upgrade.category] = []
                }
                upgradesByCategory[upgrade.category].push(upgrade)
            })
            return Object.entries(upgradesByCategory).map(([category, items]) => {
                return {
                    groupName: category,
                    groupTitle: GROUP_TITLES[category],
                    items
                }
            })
        },
        messageStyle() {
            return {
                opacity: this.messageFade
            }
        }
    }
})

app.mount('#app')
