const FPS = 30

const FOREST_TILE_SIZE = 64
const FOREST_TILE_TYPES = {
    empty: 'empty',
    hole: 'hole',
    tree: 'tree'
}

const CHOP_POWER_BASE = 0.05

// Define tree aging - let's say a tree takes a minute to grow fully
const TREE_BASE_MATURE_TIME = 30 // 30 seconds
// While growing there should be a few stages of growth, represented by an emoji
const TREE_GROWTH_STAGES = ['🌱', '🌿', '🌳', '🌲']
// Define the age per stage
const TREE_GROWTH_STAGES_BASE_INTERVAL = TREE_BASE_MATURE_TIME / TREE_GROWTH_STAGES.length
// Define the gains per stage, if a tree is not fully grown yet, it should give much less wood exponentially
const TREE_WOOD_GAINS = [0.1, 0.25, 0.5, 1]
const TREE_WOOD_GAINS_BASE = 10
const TREE_WOOD_PRICE_BASE = 5
const SEED_PRICE_BASE = 50
const WOOD_STORAGE_SIZE = 100
const SEEDS_STORAGE_SIZE = 10
const EXTRA_SEED_CHANCE = 0.1

const DEFAULT_UPGRADE_VISIBILITY_THRESHOLD = 0.25

// Define costs for tiles, columns and rows
const DEFAULT_COST_MULTIPLIER = 1.21

const GROUP_TITLES = {
    tools: 'Tools',
    forest: 'Forest',
    storage: 'Storage',
    automation: 'Automation',
    special: 'Special'
}

// Let's define the upgrades in a config, so we don't need a computed method for each
const UPGRADES = [
    {
        name: 'Axe',
        displayName: 'Sharpen Axe',
        initialOwned: 1,
        baseCost: 50,
        costMultiplier: 2,
        speed: undefined,
        category: 'tools'
    },
    {
        name: 'Fertilizer',
        displayName: 'Fertilizer',
        initialOwned: 0,
        baseCost: 100,
        costMultiplier: 2,
        speed: undefined,
        category: 'tools'
    },
    {
        name: 'Extra Tile',
        initialOwned: 1,
        baseCost: 100,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: undefined,
        category: 'forest'
    },
    {
        name: 'Extra Column',
        initialOwned: 1,
        baseCost: 100,
        costMultiplier: 5,
        speed: undefined,
        category: 'forest'
    },
    {
        name: 'Extra Row',
        initialOwned: 1,
        baseCost: 100,
        costMultiplier: 5,
        speed: undefined,
        category: 'forest'
    },
    {
        name: 'Wood Storage',
        initialOwned: 1,
        baseCost: 1000,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: undefined,
        category: 'storage'
    },
    {
        name: 'Seed Storage',
        displayName: 'Seed Bottle',
        initialOwned: 1,
        baseCost: 1500,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: undefined,
        category: 'storage'
    },
    {
        name: 'Auto Digger',
        initialOwned: 0,
        baseCost: 1000,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: 1,
        category: 'automation'
    },
    {
        name: 'Auto Seeder',
        initialOwned: 0,
        baseCost: 1500,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: 1,
        category: 'automation'
    },
    {
        name: 'Auto Chopper',
        initialOwned: 0,
        baseCost: 2000,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: 1,
        category: 'automation'
    },
    {
        name: 'Auto Seller',
        initialOwned: 0,
        baseCost: 3000,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: 1,
        category: 'automation'
    },
    {
        name: 'Wood Reclaimer',
        description: 'Reclaim wood from lost wood',
        initialOwned: 0,
        baseCost: 5000,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: 1,
        category: 'automation'
    },
    // Special one-time upgrades
    {
        name: 'Wood Marketing 1',
        displayName: 'Wood Marketing 1',
        description: 'Increase wood price by 50%',
        initialOwned: 0,
        baseCost: 2000,
        category: 'special',
        max: 1
    },
    {
        name: 'Seed Marketing 1',
        displayName: 'Seed Marketing 1',
        description: 'Increase seed price by 75%',
        initialOwned: 0,
        baseCost: 3000,
        category: 'special',
        max: 1
    },
    {
        name: 'Wood Marketing 2',
        displayName: 'Wood Marketing 2',
        description: 'Increase wood price by 100%',
        initialOwned: 0,
        baseCost: 8000,
        category: 'special',
        max: 1
    },
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

const UPGRADES_INDEX = makeIndex(UPGRADES, 'name')

/** @ts-ignore */
const app = Vue.createApp({
    data() {
        return {
            UPGRADES,

            lastUpdate: Date.now(),
            money: 0,
            forest: [],
            wood: 0,
            seeds: 3,
            woodLost: 0,
            seedsLost: 0,

            treesChopped: 0,

            woodPrice: TREE_WOOD_PRICE_BASE,
            seedPrice: SEED_PRICE_BASE,
            digPower: 0.2,
            plantPower: 0.5,

            autoDiggersEnabled: true,
            autoDiggersSaturation: 0,
            autoSeedersEnabled: true,
            autoSeedersSaturation: 0,
            autoChoppersEnabled: true,
            autoChoppersSaturation: 0,
            autoSellersEnabled: true,
            autoSellersSaturation: 0,
            autoWoodReclaimersEnabled: true,
            autoWoodReclaimersSaturation: 0,

            boughtUpgrades: {},
            visibleUpgrades: [],
        }
    },
    mounted() {
        // Initialize forest
        this.forest.push(this.createForestTile())

        // Initialize bought upgrades obj
        this.UPGRADES.forEach(upgrade => {
            this.boughtUpgrades[upgrade.name] = upgrade.initialOwned ?? 0
        })

        this.startGameLoop()
    },
    methods: {
        num(n) {
            if (typeof n !== 'number') return n;
            return n.toLocaleString()
        },
        startGameLoop() {
            setInterval(this.gameLoop, 1000 / FPS)
        },
        gameLoop() {
            const now = Date.now()
            const elapsed = (now - this.lastUpdate) / 1000 // Time in seconds
            this.lastUpdate = now

            // Update game logic based on elapsed time
            this.updateGame(elapsed)
        },
        updateGame(elapsed) {
            // Increase age of all trees
            this.forest.forEach(tile => {
                tile.stageP = 0
                if (tile.type === FOREST_TILE_TYPES.tree) {
                    tile.age += elapsed * (this.boughtUpgrades['Fertilizer']+1)
                    tile.chopped -= elapsed / (TREE_BASE_MATURE_TIME * 2)
                    if (tile.chopped < 0) {
                        tile.chopped = 0
                    }
                    tile.stage = Math.min(
                        TREE_GROWTH_STAGES.length - 1,
                        Math.floor(tile.age / TREE_GROWTH_STAGES_BASE_INTERVAL)
                    )
                    // stageP is the percentage of the age until it has reached the final stage
                    tile.stageP = Math.min(100, (tile.age / (TREE_BASE_MATURE_TIME-TREE_GROWTH_STAGES_BASE_INTERVAL)) * 100)
                }
            })

            // Determine if upgrade should be made visible. Once visible, it should stay visible.
            // An upgrade should become visible if the player has a certain % of the cost of the upgrade
            UPGRADES.forEach(upgrade => {
                if (this.visibleUpgrades.includes(upgrade.name)) {
                    return
                }
                if (this.money >= upgrade.baseCost * DEFAULT_UPGRADE_VISIBILITY_THRESHOLD) {
                    this.visibleUpgrades.push(upgrade.name)
                }
            })

            // Auto actions
            if (this.boughtUpgrades['Auto Digger'] > 0 && this.autoDiggersEnabled) {
                this.autoDiggersSaturation += UPGRADES_INDEX['Auto Digger'].speed * elapsed * this.boughtUpgrades['Auto Digger']
                while (this.autoDiggersSaturation >= 1) {
                    this.autoDiggersSaturation -= 1
                    // Find a tile to dig (first one that is empty)
                    const tile = this.forest.find(tile => tile.type === FOREST_TILE_TYPES.empty)
                    if (tile) {
                        this.digTile(tile)
                    }
                }
            }
            if (this.boughtUpgrades['Auto Seeder'] > 0 && this.autoSeedersEnabled) {
                this.autoSeedersSaturation += UPGRADES_INDEX['Auto Seeder'].speed * elapsed * this.boughtUpgrades['Auto Seeder']
                while (this.autoSeedersSaturation >= 1) {
                    this.autoSeedersSaturation -= 1
                    // Find a tile to plant (first one that is a hole)
                    const tile = this.forest.find(tile => tile.type === FOREST_TILE_TYPES.hole)
                    if (tile) {
                        this.plantSeed(tile)
                    }
                }
            }
            if (this.boughtUpgrades['Auto Chopper'] > 0 && this.autoChoppersEnabled) {
                this.autoChoppersSaturation += UPGRADES_INDEX['Auto Chopper'].speed * elapsed * this.boughtUpgrades['Auto Chopper']
                while (this.autoChoppersSaturation >= 1) {
                    this.autoChoppersSaturation -= 1
                    // Find a tile to chop (first one that is a tree and has the highest chopped value)
                    const maxChopped = Math.max(...this.forest.map(tile => tile.chopped))
                    const tile = this.forest.find(
                        tile => tile.type === FOREST_TILE_TYPES.tree && tile.stage === TREE_GROWTH_STAGES.length - 1 && tile.chopped === maxChopped
                    )
                    if (tile) {
                        this.chopTree(tile)
                    }
                }
            }
            if (this.boughtUpgrades['Auto Seller'] > 0 && this.autoSellersEnabled) {
                this.autoSellersSaturation += UPGRADES_INDEX['Auto Seller'].speed * elapsed * this.boughtUpgrades['Auto Seller']
                while (this.autoSellersSaturation >= 1) {
                    this.autoSellersSaturation -= 1
                    this.sellWood(1)
                }
            }
            if (this.boughtUpgrades['Wood Reclaimer'] > 0 && this.autoWoodReclaimersEnabled) {
                this.autoWoodReclaimersSaturation += UPGRADES_INDEX['Wood Reclaimer'].speed * elapsed * this.boughtUpgrades['Wood Reclaimer']
                while (this.autoWoodReclaimersSaturation >= 1) {
                    this.autoWoodReclaimersSaturation -= 1
                    if (this.wood < this.woodStorage && this.woodLost > 0) {
                        this.gainWood(1)
                        this.woodLost -= 1
                    }
                }
            }
        },
        digTile(tile) {
            if (tile.type !== FOREST_TILE_TYPES.empty) {
                return
            }
            tile.dug += this.digPower
            if (tile.dug >= 1) {
                tile.dug = 1
                tile.type = FOREST_TILE_TYPES.hole
            }
        },
        plantSeed(tile) {
            if (tile.type !== FOREST_TILE_TYPES.hole) {
                return
            }
            tile.growth += this.plantPower
            if (tile.growth >= 1 && this.seeds > 0) {
                this.seeds -= 1
                tile.growth = 1
                tile.type = FOREST_TILE_TYPES.tree
            }
        },
        chopTree(tile) {
            if (tile.type !== FOREST_TILE_TYPES.tree) {
                return
            }
            tile.chopped += this.chopPower
            setTimeout(() => {
                tile.hasChopped = false
            }, 1)
            setTimeout(() => {
                tile.hasChopped = true
            }, 2)
            setTimeout(() => {
                tile.hasChopped = false
            }, 250)
            if (tile.chopped >= 1) {
                let woodGainM = TREE_WOOD_GAINS[tile.stage]
                let woodGains = TREE_WOOD_GAINS_BASE * woodGainM
                this.gainWood(woodGains)
                this.gainSeeds(1)
                this.treesChopped += 1
                // If lucky, get an extra seed
                if (isLucky(EXTRA_SEED_CHANCE)) {
                    console.log('Lucky! Got an extra seed!')
                    this.gainSeeds(1)
                }
                this.resetTile(tile)
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
        resetTile(tile) {
            tile.type = FOREST_TILE_TYPES.empty
            tile.dug = 0
            tile.chopped = 0
            tile.age = 0
            tile.growth = 0
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
        incur(money) {
            if (this.money < money) {
                return false
            }
            this.money -= money
            return true
        },

        clickTile(tile) {
            if (!tile) {
                return
            }
            //console.log('Clicked tile:', JSON.parse(JSON.stringify(tile)))
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
        toggleAutoDiggers() {
            this.autoDiggersEnabled = !this.autoDiggersEnabled
        },
        toggleAutoSeeders() {
            this.autoSeedersEnabled = !this.autoSeedersEnabled
        },
        toggleAutoChoppers() {
            this.autoChoppersEnabled = !this.autoChoppersEnabled
        },
        toggleAutoSellers() {
            this.autoSellersEnabled = !this.autoSellersEnabled
        },

        createForestTile() {
            return {
                type: FOREST_TILE_TYPES.empty,
                dug: 0,
                chopped: 0,
                age: 0,
                growth: 0,
                stage: 0,
                stageP: 0,
            }
        },
        getForestTileIcon(tile) {
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
        },
        getForestTileClass(tile) {
            // if just chopped, add 'wiggle' class
            let result = tile.hasChopped ? 'wiggle' : ''
            return result
        },
        getForestTileStyle(tile) {
            let opacity = 0
            let lineHeight = null
            let fontSizeM = 1
            switch (tile.type) {
                case FOREST_TILE_TYPES.empty:
                    opacity = tile.dug
                    break
                case FOREST_TILE_TYPES.hole:
                    opacity = tile.growth
                    lineHeight = 1.5
                    break
                case FOREST_TILE_TYPES.tree:
                    opacity = tile.chopped
                    // If final stage, make it bigger
                    if (tile.stage != TREE_GROWTH_STAGES.length - 1) {
                        fontSizeM = 0.75
                        lineHeight = 1.80
                    }
                    break
                default:
                    opacity = 1
                    break
            }
            return {
                backgroundColor: `rgba(0, 255, 0, ${opacity})`,
                width: `${FOREST_TILE_SIZE}px`,
                height: `${FOREST_TILE_SIZE}px`,
                fontSize: `${FOREST_TILE_SIZE * 0.75 * fontSizeM}px`,
                lineHeight: lineHeight ? `${lineHeight}em` : null
            }
        },
        buyUpgrade(upgrade) {
            let cost = this.getUpgradeCost(upgrade)
            if (!this.incur(cost)) {
                return
            }
            this.boughtUpgrades[upgrade.name] += 1

            switch (upgrade.name) {
                case 'Extra Tile':
                    this.forest.push(this.createForestTile())
                    break
                // Specials
                case 'Wood Marketing 1':
                    this.woodPrice *= 1.5
                    break
                case 'Seed Marketing 1':
                    this.seedPrice *= 1.75
                    break
                case 'Wood Marketing 2':
                    this.woodPrice *= 2
                    break
            }
        },
        getUpgradeCost(upgrade) {
            return (
                upgrade.baseCost *
                Math.pow(upgrade.costMultiplier, this.boughtUpgrades[upgrade.name] - upgrade.initialOwned)
            )
        },
        canBuyUpgrade(upgrade) {
            switch (upgrade.name) {
                case 'Extra Tile':
                    if (this.forest.length >= this.boughtUpgrades['Extra Column'] * this.boughtUpgrades['Extra Row']) {
                        return false
                    }
                    break
            }
            return this.money >= this.getUpgradeCost(upgrade)
        }
    },
    computed: {
        forestSize() {
            return [this.boughtUpgrades['Extra Column'], this.boughtUpgrades['Extra Row']]
        },
        forestStyle() {
            return {
                width: `${this.forestSize[0] * FOREST_TILE_SIZE}px`,
                height: `${this.forestSize[1] * FOREST_TILE_SIZE}px`
            }
        },
        forestView() {
            const view = []
            this.forest.forEach(tile => {
                view.push({
                    type: tile.type,
                    tile,
                    icon: this.getForestTileIcon(tile),
                    style: this.getForestTileStyle(tile),
                    progressStyle: {
                        width: `${tile.stageP}%`
                    },
                    classes: this.getForestTileClass(tile)
                })
            })
            // Add black squares for empty tiles (type: 'unclaimed')
            for (let i = view.length; i < this.forestSize[0] * this.forestSize[1]; i++) {
                view.push({
                    type: 'unclaimed',
                    tile: null,
                    icon: '',
                    style: {
                        width: `${FOREST_TILE_SIZE}px`,
                        height: `${FOREST_TILE_SIZE}px`
                    },
                    classes: 'unclaimed'
                })
            }
            return view
        },
        chopPower() {
            return CHOP_POWER_BASE * this.boughtUpgrades['Axe']
        },
        canSellWood() {
            return this.wood > 0
        },
        canSellSeeds() {
            return this.seeds > 1
        },
        sellPriceWood() {
            return this.wood * this.woodPrice
        },
        sellPriceSeeds() {
            return 1 * this.seedPrice
        },
        woodStorage() {
            return WOOD_STORAGE_SIZE * this.boughtUpgrades['Wood Storage']
        },
        seedsStorage() {
            return SEEDS_STORAGE_SIZE * this.boughtUpgrades['Seed Storage']
        },

        upgradesView() {
            return this.UPGRADES.filter(
                upgrade => {
                    if (upgrade.max && this.boughtUpgrades[upgrade.name] >= upgrade.max) {
                        return false
                    }
                    return this.visibleUpgrades.includes(upgrade.name)
                }
            ).map(upgrade => {
                return {
                    ...upgrade,
                    cost: Math.ceil(this.getUpgradeCost(upgrade)),
                    canBuy: this.canBuyUpgrade(upgrade),
                    owned: this.boughtUpgrades[upgrade.name] || 0
                }
            })
        },
        upgradesByCategoryView() {
            // Group upgrades by category like [ { groupName: 'tools', items: [] } ]
            const upgradesByCategory = {}
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
        }
    }
})

app.mount('#app')
