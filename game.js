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
    diamond: 'diamond'
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

const INITIAL_MONEY = 50

const CHOP_POWER_BASE = 0.025
// Define tree aging - let's say a tree takes a minute to grow fully
const TREE_BASE_MATURE_TIME = 60 // 60 seconds
// While growing there should be a few stages of growth, represented by an emoji
const TREE_GROWTH_STAGES = ['🌱', '🌿', '🌳', '🌲']
const WOOD_ICON = '🪵'
// Define the age per stage
const TREE_GROWTH_STAGES_BASE_INTERVAL = TREE_BASE_MATURE_TIME / TREE_GROWTH_STAGES.length
// Define the gains per stage, if a tree is not fully grown yet, it should give much less wood exponentially
const TREE_WOOD_GAINS = [0.1, 0.25, 0.5, 1]
const TREE_WOOD_GAINS_BASE = 10
const TREE_SELF_SEED_CHANCE = 1 / 100
const EXTRA_SEED_CHANCE_BASE = 1 / 10
const EXTRA_SEED_CHANCE_MULTIPLIER = 2
const LUCKY_DIAMOND_MINE = 1 / 10

// Price base
const TREE_WOOD_PRICE_BASE = 5
const SEED_PRICE_BASE = 50
const DIAMOND_PRICE_BASE = 5_000

// Define the size of the storage
const WOOD_STORAGE_SIZE = 100
const SEEDS_STORAGE_SIZE = 10
const DIAMONDS_STORAGE_SIZE = 1

// Mine stuff
const MINE_STAGES = ['⛰️', '⛏️', '💎']
// Mines work different from forests, each stage has levels. The first stage has one level, the second has 3, the third has Infinite
// The first stage uses dugPower and only has one level but should require like 50 clicks to get to the next stage
// The second stage is when a mine has openened, but to be able to go deeper, wood is required, because you need to build support beams (250 wood per level)
// The third stage is when you can mine for diamonds, but it requires a diamond pickaxe, each level will gain 1 diamond
// Once the third stage is reached it is a fully operational mine.
// Automators for the mine: Auto Excavator, Auto Tunneler, Auto Diamond Miner
const MINE_STAGE_LEVELS = [1, 3, Infinity]
const MINE_EXCAVATOR_POWER = 1 / 50 // 50 clicks to get to the next stage
const MINE_TUNNELER_POWER = 1 / 100
const MINE_DIAMOND_MINER_POWER = 1 / 200
const MINE_SUPPORT_BEAM_COST = 250 // wood

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
        description: 'Mine diamonds faster with a hardened pickaxe',
        initialOwned: 0,
        baseCost: 10000,
        costMultiplier: 2,
        speed: undefined,
        category: 'tools',
        group: GROUPS.mine
    },
    {
        name: 'Forest Tile',
        displayName: 'Forest Tile',
        description: 'Claim a tile of land to grow trees on',
        initialOwned: 1,
        baseCost: 100,
        costMultiplier: 1.1,
        speed: undefined,
        category: 'land',
        group: GROUPS.forest
    },
    {
        name: 'Mine Tile',
        displayName: 'Mine Tile',
        description: 'Claim a tile of land to dig for resources',
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
        speed: 1,
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
    // Reclaimer for seeds
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
        name: 'Diamond Miner',
        description: 'Automatically mine diamonds',
        initialOwned: 0,
        baseCost: 15000,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: 1,
        category: 'automation',
        group: GROUPS.mine
    },
    {
        name: 'Diamond Seller',
        description: 'Automatically sell diamonds',
        initialOwned: 0,
        baseCost: 15000,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: 1 / 120,
        category: 'automation',
        group: GROUPS.mine
    },
    {
        name: 'Diamond Reclaimer',
        displayName: 'Mine Magpie',
        description: 'Send a magpie into your caves to find the diamonds you haphazardly dropped all over the place',
        initialOwned: 0,
        baseCost: 20000,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: 1 / 300,
        category: 'automation',
        group: GROUPS.mine
    },
    // Special one-time upgrades
    {
        name: 'Wood Marketing 1',
        displayName: 'Wood Marketing 1',
        description: 'Increase wood price by 1.5x',
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
        baseCost: 3000,
        category: 'special',
        max: 1,
        group: GROUPS.forest
    },
    {
        name: 'Seed Marketing 2',
        displayName: 'Seed Marketing 1',
        description: 'Increase seed price by 3x',
        initialOwned: 0,
        baseCost: 16_000,
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
        description: 'Give diamonds a shiny polish and increase their price by 2x',
        initialOwned: 0,
        baseCost: 25_000,
        category: 'special',
        max: 1,
        group: GROUPS.mine
    },
    {
        name: 'Diamond Marketing 2',
        displayName: 'Diamond Shine',
        description: 'Give diamonds an even shinier polish and increase their price by 2x',
        initialOwned: 0,
        baseCost: 50_000,
        category: 'special',
        max: 1,
        group: GROUPS.mine
    }
]

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
    if (n < 1000000) {
        return Math.round(n).toLocaleString()
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
    const formatted = n.toLocaleString(undefined, { maximumFractionDigits: 2 })
    return `${formatted} ${suffixes[suffixIndex]}`
}

const UPGRADES_INDEX = makeIndex(UPGRADES, 'name')

class Tile {
    constructor() {
        this.tileType = TILE_TYPES.none
        this.type = FOREST_TILE_TYPES.empty
        this.progress = 0
        this.age = 0
        this.stage = 0
        this.stageP = 0
        this.wiggle = false
    }
    animateWiggle() {
        this.wiggle = true
        setTimeout(() => {
            this.wiggle = false
        }, 1)
        setTimeout(() => {
            this.wiggle = true
        }, 2)
        setTimeout(() => {
            this.wiggle = false
        }, 250)
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
}

class Counter {
    constructor(name, fn) {
        this.name = name
        this.last = Infinity
        this.current = 0
        this.fn = fn
    }
    update() {
        this.last = this.current
        this.current = this.fn()
        this.delta = this.current - this.last
    }
}

/** @ts-ignore */
const app = Vue.createApp({
    data() {
        return {
            UPGRADES,

            now: Date.now(),
            startTime: Date.now(),
            lastUpdate: Date.now(),
            money: INITIAL_MONEY,
            moneyPs: 0,
            land: [],
            wood: 0,
            diamonds: 0,
            seeds: 3,
            woodLost: 0,
            seedsLost: 0,
            diamondsLost: 0,

            treesChopped: 0,

            woodPrice: TREE_WOOD_PRICE_BASE,
            seedPrice: SEED_PRICE_BASE,
            diamondPrice: DIAMOND_PRICE_BASE,
            digPower: 0.2,
            plantPower: 0.5,
            luckySeedChance: EXTRA_SEED_CHANCE_BASE,

            automators: [],
            counters: [],
            boughtUpgrades: {},
            visibleUpgrades: [],
            unblurredUpgrades: [],
            message: '',
            messageFade: 0
        }
    },
    mounted() {
        // Initialize bought upgrades obj
        this.UPGRADES.forEach(upgrade => {
            this.boughtUpgrades[upgrade.name] = upgrade.initialOwned ?? 0
        })

        // Initialize land
        for (let i = 0; i < this.boughtUpgrades['Forest Tile']; i++) {
            this.land.push(this.createForestTile())
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
                this.sellWood(1)
            }),
            new Automator('Wood Reclaimer', () => {
                if (this.wood < this.woodStorage && this.woodLost > 0) {
                    this.gainWood(1)
                    this.woodLost -= 1
                }
            }),
            new Automator('Seed Seller', () => {
                // Determine excess seeds: each tree counts as 1 seed
                // So if forestLand has 4 tiles and 2 have trees and we have 3 seeds, we have 1 excess seed
                const treeTiles = this.forestLand.filter(tile => tile.type === FOREST_TILE_TYPES.tree)
                const excessSeeds = this.seeds + treeTiles.length - this.landLength
                if (excessSeeds > 0) {
                    this.sellSeeds(1)
                }
            }),
            new Automator('Seed Reclaimer', () => {
                if (this.seeds < this.seedsStorage && this.seedsLost > 0) {
                    this.gainSeeds(1)
                    this.seedsLost -= 1
                }
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
            new Automator('Diamond Miner', () => {
                const diamondTiles = this.mineLand.filter(tile => tile.type === MINE_TILE_TYPES.diamond)
                const tile = pick(diamondTiles)
                if (!tile) {
                    return
                }
                this.mineDiamond(tile)

                // The more diamond miners, the higher the chance of mining the same tile again
                diamondTiles.forEach(tile => {
                    if (isLucky(LUCKY_DIAMOND_MINE)) {
                        console.log('Lucky! Mining another diamond tile in one stroke!', tile)
                        this.mineDiamond(tile)
                    }
                })
            }),
            new Automator('Diamond Seller', () => {
                this.sellDiamonds(1)
            }),
            new Automator('Diamond Reclaimer', () => {
                if (this.diamonds < this.diamondsStorage && this.diamondsLost > 0) {
                    this.gainDiamonds(1)
                    this.diamondsLost -= 1
                }
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
            this.messageFade -= elapsed / 10

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
                                tile.animateWiggle()
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
                if (this.seeds > 0) {
                    this.seeds -= 1
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
                this.gainWood(woodGains)
                this.gainSeeds(1)
                this.treesChopped += 1
                let msg = ''
                // If lucky, get an extra seed
                if (isLucky(this.luckySeedChance)) {
                    msg += 'Lucky! Got an extra seed! '
                    this.gainSeeds(1)
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
                if (tile.stage >= MINE_STAGE_LEVELS[0]) {
                    tile.stage = 0
                    tile.type = MINE_TILE_TYPES.tunnel
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
                if (this.wood >= MINE_SUPPORT_BEAM_COST) {
                    this.wood -= MINE_SUPPORT_BEAM_COST
                    tile.stage += 1
                    tile.progress = 0
                    if (tile.stage >= MINE_STAGE_LEVELS[1]) {
                        tile.stage = 0
                        tile.type = MINE_TILE_TYPES.diamond
                    }
                } else {
                    this.showMessage(
                        `Not enough wood to build support beams! You need ${this.num(
                            MINE_SUPPORT_BEAM_COST
                        )} wood to continue tunneling.`
                    )
                }
            }
        },
        mineDiamond(tile) {
            if (tile.type !== MINE_TILE_TYPES.diamond) {
                return
            }
            tile.progress += this.diamondMinerPower
            tile.animateWiggle()
            if (tile.progress >= 1) {
                tile.progress = 0
                tile.stage += 1
                this.gainDiamonds(1)
            }
        },
        gainWood(gains) {
            this.wood += gains
            if (this.wood > this.woodStorage) {
                this.woodLost += this.wood - this.woodStorage
                this.wood = this.woodStorage
            }
        },
        gainSeeds(gains) {
            this.seeds += gains
            if (this.seeds > this.seedsStorage) {
                this.seedsLost += this.seeds - this.seedsStorage
                this.seeds = this.seedsStorage
            }
        },
        gainDiamonds(gains) {
            this.diamonds += gains
            if (this.diamonds > this.diamondsStorage) {
                this.diamondsLost += this.diamonds - this.diamondsStorage
                this.diamonds = this.diamondsStorage
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
        sellWood(amount) {
            if (this.wood < amount) {
                return
            }
            this.wood -= amount
            this.money += amount * this.woodPrice
        },
        sellAllWood() {
            this.sellWood(this.wood)
        },
        sellSeeds(amount) {
            if (this.seeds < amount) {
                return
            }
            this.seeds -= amount
            this.money += amount * this.seedPrice
        },
        sellDiamonds(amount) {
            if (this.diamonds < amount) {
                return
            }
            this.diamonds -= amount
            this.money += amount * this.diamondPrice
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
                case MINE_TILE_TYPES.diamond:
                    this.mineDiamond(tile)
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
        createMineTile() {
            const tile = new Tile()
            tile.tileType = TILE_TYPES.mine
            tile.type = MINE_TILE_TYPES.rock
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
                        case MINE_TILE_TYPES.diamond:
                            return '💎'
                        default:
                            return '❓'
                    }
                default:
                    return ''
            }
        },
        getLandTileClass(tile) {
            let result = tile.wiggle ? 'wiggle' : ''
            return result
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
                            return MINE_STAGE_LEVELS[0] > 1 ? tile.stage : null
                        case MINE_TILE_TYPES.tunnel:
                            return MINE_STAGE_LEVELS[1] > 1 ? tile.stage : null
                        case MINE_TILE_TYPES.diamond:
                            return tile.stage
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
                    }
                case TILE_TYPES.mine:
                    switch (tile.type) {
                        case MINE_TILE_TYPES.rock:
                            return 'Rock - click to dig an entrance for a mine'
                        case MINE_TILE_TYPES.tunnel:
                            return `Mine Tunnel - at level ${tile.stage} of ${MINE_STAGE_LEVELS[1]} - click to dig deeper`
                        case MINE_TILE_TYPES.diamond:
                            return 'Diamond mine - click to mine diamonds - found diamonds: ' + tile.stage
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
            return (
                upgrade.baseCost *
                Math.pow(upgrade.costMultiplier, this.boughtUpgrades[upgrade.name] - upgrade.initialOwned)
            )
        },
        buyUpgrade(upgrade) {
            let cost = this.getUpgradeCost(upgrade)
            if (!this.incur(cost)) {
                return
            }
            this.boughtUpgrades[upgrade.name] += 1

            switch (upgrade.name) {
                case 'Forest Tile':
                    this.land.push(this.createForestTile())
                    break
                case 'Mine Tile':
                    this.land.push(this.createMineTile())
                    break
                // Specials
                case 'Wood Marketing 1':
                    this.woodPrice *= 1.5
                    break
                case 'Seed Luck 1':
                    this.luckySeedChance *= EXTRA_SEED_CHANCE_MULTIPLIER
                    break
                case 'Seed Marketing 1':
                    this.seedPrice *= 2
                    break
                case 'Seed Marketing 2':
                    this.seedPrice *= 3
                    break
                case 'Wood Marketing 2':
                    this.woodPrice *= 2
                    break
                case 'Wood Marketing 3':
                    this.woodPrice *= 2
                    break
                case 'Diamond Marketing 1':
                    this.diamondPrice *= 2
                    break
                case 'Diamond Marketing 2':
                    this.diamondPrice *= 2
                    break
            }
        },
        hasRoomForTile() {
            return this.land.length >= this.boughtUpgrades['Extra Column'] * this.boughtUpgrades['Extra Row']
        },
        canBuyUpgrade(upgrade) {
            switch (upgrade.name) {
                case 'Forest Tile':
                case 'Mine Tile':
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
        diamondMinerPower() {
            return MINE_DIAMOND_MINER_POWER * (this.boughtUpgrades['Pickaxe'] + 1)
        },
        canSellWood() {
            return this.wood > 0
        },
        canSellSeeds() {
            return this.seeds > 1
        },
        canSellDiamonds() {
            return this.diamonds > 0
        },
        sellPriceWood() {
            return this.wood * this.woodPrice
        },
        sellPriceSeeds() {
            return 1 * this.seedPrice
        },
        sellPriceDiamonds() {
            return 1 * this.diamondPrice
        },
        woodStorage() {
            return WOOD_STORAGE_SIZE * this.boughtUpgrades['Wood Storage']
        },
        seedsStorage() {
            return SEEDS_STORAGE_SIZE * this.boughtUpgrades['Seed Storage']
        },
        diamondsStorage() {
            return DIAMONDS_STORAGE_SIZE * this.boughtUpgrades['Diamond Storage']
        },

        perS() {
            // Return obj with name, current, delta
            const result = {}
            this.counters.forEach(counter => {
                result[counter.name] = counter.delta
            })
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
