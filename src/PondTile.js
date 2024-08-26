import { Automator } from './Automator.js'
import { Calculator } from './Calculator.js'
import { CATEGORIES, GROUP_ICONS, GROUPS, RESOURCE_TYPES, TILE_TYPES } from './consts.js'
import { Resource } from './Resource.js'
import Tile from './Tile.js'
import { createAutomatorUpgrade, isLucky } from './utils.js'

// Pond stuff
// Ponds are a source of fish, or some rarer things like resources
// Ponds work different from forests and mines. The fishing pole is cast and then you wait for a semiramdom amount of time
// After that time the pole will wiggle and you have a certain amount of time to click it to catch the fish.
// If you miss it, the fish will escape and you have to cast the pole with a new bait.
// Lure can be seeds? Or worms? Or bread? Bread may work, but then the pre-requisite for ponds is a farm.
const FISHING_TIME_BASE = 90 // seconds
const FISHING_TIME_VARIANCE = 30 // seconds - bite time is between (BASE - VARIANCE) and BASE + VARIANCE)
const FISHING_WIGGLE_TIME = 30 // seconds
const FISHING_WIGGLE_VARIANCE = 5 // seconds
const RARE_FISH_LUCK_BASE = 0.4 // Base chance of catching a rare fish (0.4 means 0.6 chance of catching a normal fish)
const SEALIFE = ['🐟', '🐠', '🦐', '🦞', '🦀', '🐡', '🐸', '🦑', '🐙', '🦈', '🐬', '🐧', '🐳', '🐋']
const SEALIFE_GAINS = [1, 2, 5, 10, 20, 30, 40, 50, 75, 100, 150, 200, 500, 1000]
const SEALIFE_NAMES = [
    'Fish',
    'Clownfish',
    'Shrimp',
    'Lobster',
    'Crab',
    'Pufferfish',
    'Frog',
    'Squid',
    'Octopus',
    'Shark',
    'Dolphin',
    'Penguin',
    'Whale',
    'Blue Whale'
]
const NON_FISH = ['🦐', '🦞', '🦀', '🐸', '🐬', '🐧', '🐳', '🐋']
// To make it more interesting, there should be a small chance of catching a wood, seed, metal, diamond, or clay
const RARITY_CHANCE = 1 / 100
const RARITIES = ['🏺', '🔧', '💎']
const RARITY_GAINS = [RESOURCE_TYPES.clay, RESOURCE_TYPES.metal, RESOURCE_TYPES.diamond]

const FISH_PRICE_BASE = 50
const FISH_STORAGE_SIZE = 50

function randomResource(resourceList, luck = 0.5) {
    luck = 1 - luck // Invert luck - causing the first item to not be the most likely
    // If Luck is not 0.5, we will need to add/subtrack each step until so the luck curve is correct
    const delta = (luck - 0.5) / resourceList.length
    let chance = luck
    for (const element of resourceList) {
        if (isLucky(chance)) {
            return element
        }
        chance -= delta
    }
    return resourceList[0]
}

// Check if list and gains lists are same length
console.assert(SEALIFE.length === SEALIFE_GAINS.length, 'FISH and FISH_GAINS must be the same length')
console.assert(RARITIES.length === RARITY_GAINS.length, 'RARITIES and RARITY_GAINS must be the same length')

function simulate() {
    for (let i = 0; i < SEALIFE.length; i++) {
        console.log(SEALIFE[i], SEALIFE_GAINS[i])
    }
    // Simulate many catches
    const fishCounts = {}
    for (let i = 0; i < 100; i++) {
        const fish = randomResource(SEALIFE, 0.5)
        if (!fishCounts[fish]) {
            fishCounts[fish] = 0
        }
        fishCounts[fish] += 1
    }
    console.log(fishCounts)
    // Log what wasn't caught
    for (const fish of SEALIFE) {
        if (!fishCounts[fish]) {
            console.log(fish, 'was not caught')
        }
    }
}

export class PondTile extends Tile {
    static type = TILE_TYPES.pond

    catchTime = 0
    wiggleTime = 0
    wiggleSaturation = 0
    caughtFish = null
    isRare = false
    constructor(app) {
        super(app, PondTile.type)
        this.reset()
    }
    update(elapsed) {
        super.update(elapsed)
        if (this.catchTime > 0) {
            this.catchTime -= elapsed
            if (this.catchTime <= 0) {
                this.animateWiggle()
                this.progress = 1
                this.wiggleTime = FISHING_WIGGLE_TIME + (Math.random() - 0.5) * FISHING_WIGGLE_VARIANCE * 2
            }
        }
        if (this.wiggleTime > 0) {
            this.wiggleSaturation += elapsed
            if (this.wiggleSaturation > 2) {
                this.wiggleSaturation = 0
                this.animateBounceDown()
            }
            this.wiggleTime -= elapsed
            if (this.wiggleTime <= 0) {
                if (!this.app.hasUpgrade('Auto Fisher')) {
                    this.app.showMessage('Fish got away!')
                }
                this.app.stats.fishMissed += 1
                this.animateFail()
                this.reset()
            }
        }
    }
    sell() {
        this.app.boughtUpgrades['Pond Tile'] -= 1
    }
    reset() {
        this.caughtFish = null
        this.catchTime = FISHING_TIME_BASE + (Math.random() - 0.5) * FISHING_TIME_VARIANCE * 2
        this.wiggleTime = 0
        this.progress = 0
    }
    showMessage(message, manual) {
        if (!manual) return
        this.app.showMessage(message)
    }

    click(manual = false) {
        if (this.wiggleTime <= 0 && this.catchTime > 0) {
            // Punish if player clicks when the pole is not wiggling
            this.showMessage('You need to wait for the fishing pole to wiggle!', manual)
            this.animateFail()
            this.catchTime += 10
            return
        }
        if (this.wiggleTime > 0) {
            this.stopAnimations()
            let rarityChance = RARITY_CHANCE
            let rareFishLuck = this.rareFishLuck
            if (this.isSick) {
                // Increase the chance of non-fish and decrease the chance of rare fish
                rarityChance = 0.5
                rareFishLuck = 0.1
            }
            if (isLucky(rarityChance)) {
                this.caughtFish = randomResource(RARITIES, rareFishLuck)
                this.isRare = true
                this.app.stats.fishRarities += 1
            } else {
                this.caughtFish = randomResource(SEALIFE, rareFishLuck)
                this.isRare = false
                this.app.stats.fishCaught += 1
            }
            this.showMessage('Caught something!', manual)
            this.animateGrow()
            this.wiggleTime = 0
            return
        }
        if (this.caughtFish) {
            if (this.isRare) {
                const idx = RARITIES.indexOf(this.caughtFish)
                const resource = RARITY_GAINS[idx]
                this.app.resources[resource].gain(1)
                this.showMessage(`Lucky! Found a ${this.caughtFish}!`, manual)
            } else {
                const idx = SEALIFE.indexOf(this.caughtFish)
                const fishGain = SEALIFE_GAINS[idx]
                this.app.resources.fish.gain(fishGain)
                const isNonFish = NON_FISH.includes(this.caughtFish)
                this.showMessage(
                    `Caught a ${this.caughtFish}, worth ${fishGain} fish${isNonFish ? ' (somehow)' : ''}!`,
                    manual
                )

                // Add to fish tank!
                let fishTankRow = this.app.stats.fishTank.find(row => row[0] === this.caughtFish)
                if (!fishTankRow) {
                    fishTankRow = [this.caughtFish, 0]
                    this.app.stats.fishTank.push(fishTankRow)
                }
                fishTankRow[1] += 1
            }
            this.reset()
        }
    }
    get icon() {
        if (this.caughtFish) {
            return this.caughtFish
        }
        return GROUP_ICONS.pond
    }
    get tooltip() {
        return 'Pond tile - click when the fishing pole wiggles to catch a fish!'
    }
    get rareFishLuck() {
        return this.app.calculated.rareFishLuck
    }
    get adjacentTiles() {
        return this.app.getAdjacentTiles(this)
    }
    get isSick() {
        return this.adjacentTiles.some(tile => tile.tileType === TILE_TYPES.kiln)
    }
    get iconBottomRight() {
        // If any adjacent tile is a kiln, show skull emoji
        if (this.isSick) {
            return '💀'
        }
    }

    static resources = [
        new Resource(RESOURCE_TYPES.fish, {
            displayNameSingular: 'Fish',
            displayNamePlural: 'Fish',
            icon: '🐟',
            basePrice: FISH_PRICE_BASE,
            storageBaseSize: FISH_STORAGE_SIZE
        })
    ]

    static calculators = [
        new Calculator('rareFishLuck', app => RARE_FISH_LUCK_BASE + app.boughtUpgrades['Lucky Bait'] * 0.1)
    ]

    static automators = [
        new Automator('Auto Fisher', app => {
            // Give priority to wiggling tiles
            const wiggling = app.land.find(t => t instanceof PondTile && t.wiggleTime > 0)
            if (wiggling) {
                wiggling.click()
                return
            }
            // Check if there is a fish to catch and click that instead
            const caught = app.land.find(t => t instanceof PondTile && t.caughtFish)
            if (caught) {
                caught.click()
            }
        }),
        new Automator('Fish Reclaimer', app => {
            app.resources.fish.reclaim(1)
        }),
        new Automator('Fish Seller', app => {
            app.sellResource(app.resources.fish, 1)
        })
    ]

    static hasTile(app) {
        return app.land.some(t => t instanceof PondTile)
    }

    static upgrades = [
        {
            name: 'Pond Tile',
            tile: true,
            description: 'Claim a tile of land to fish in',
            initialOwned: 0,
            baseCost: 250,
            costMultiplier: 1.5,
            speed: undefined,
            category: CATEGORIES.tiles,
            group: GROUPS.pond,
            resourceCosts: {
                [RESOURCE_TYPES.wood]: 1
            },
            onBuy(app) {
                app.addTile(new PondTile(app))
            }
        },
        {
            name: 'Fish Storage',
            displayName: 'Fish Tank',
            description: 'Increase the amount of fish you can store',
            initialOwned: 1,
            baseCost: 1500,
            costMultiplier: 1.4,
            category: CATEGORIES.storage,
            group: GROUPS.pond,
            onBuy(app) {
                app.resources.fish.storage += 1
            },
            isVisible: PondTile.hasTile
        },
        createAutomatorUpgrade({
            name: 'Fish Seller',
            description: 'Automatically sell fish. Selfish. Shellfish?',
            baseCost: 5000,
            costMultiplier: 1.5,
            speed: 1 / 4,
            group: GROUPS.pond,
            isVisible: PondTile.hasTile
        }),
        createAutomatorUpgrade({
            name: 'Fish Reclaimer',
            displayName: 'Fish Re-fisher',
            description: 'Collect lost fish swimming about thinking they were lucky',
            baseCost: 5500,
            costMultiplier: 1.5,
            speed: 1 / 4,
            group: GROUPS.pond,
            isVisible: PondTile.hasTile
        }),
        createAutomatorUpgrade({
            name: 'Auto Fisher',
            description: 'Automatically fish for you',
            baseCost: 6000,
            costMultiplier: 2,
            speed: 1 / FISHING_WIGGLE_TIME,
            group: GROUPS.pond,
            isVisible: PondTile.hasTile
        }),
        // Special
        {
            name: 'Lucky Bait',
            description: 'Increase the chance of catching rare fish',
            initialOwned: 0,
            baseCost: 9000,
            costMultiplier: 1.5,
            category: CATEGORIES.special,
            group: GROUPS.pond,
            max: 5,
            isVisible: PondTile.hasTile
        }
    ]
}

// Monster tile

const MONSTERS_IDEAS = [
    '🦠',
    '🦗',
    '🐜',
    '🦇',
    '👾',
    '👹',
    '👺',
    '👻',
    '👽',
    '💀',
    '🤖',
    '🧟',
    '🦹',
    '🧛',
    '🧙',
    '🧚',
    '🧜',
    '🧝',
    '🧞',
    '🧟‍♂️',
    '🧟‍♀️'
]

const MONSTERS = [
    {
        name: 'Microbe',
        icon: '🦠',
        health: 10,
        damage: 1,
        reward: 100, // money
        otherRewards: [{ type: RESOURCE_TYPES.seed, amount: 1, chance: 0.5 }]
    },
    {
        name: 'Insect',
        icon: '🦗',
        health: 20,
        damage: 2,
        reward: 200,
        otherRewards: [
            { type: RESOURCE_TYPES.seed, amount: 1, chance: 0.5 },
            { type: RESOURCE_TYPES.wood, amount: 1, chance: 0.5 }
        ]
    },
    {
        name: 'Bat',
        icon: '🦇',
        health: 30,
        damage: 3,
        reward: 300,
        otherRewards: [
            { type: RESOURCE_TYPES.seed, amount: 1, chance: 0.5 },
            { type: RESOURCE_TYPES.wood, amount: 1, chance: 0.5 },
            { type: RESOURCE_TYPES.metal, amount: 1, chance: 0.5 }
        ]
    },
    {
        name: 'Alien',
        icon: '👽',
        health: 40,
        damage: 4,
        reward: 400,
        otherRewards: [
            { type: RESOURCE_TYPES.seed, amount: 3, chance: 0.5 },
            { type: RESOURCE_TYPES.wood, amount: 50, chance: 0.5 },
            { type: RESOURCE_TYPES.metal, amount: 5, chance: 0.1 },
            { type: RESOURCE_TYPES.diamond, amount: 1, chance: 0.01 }
        ]
    },
    {
        name: 'Skeleton',
        icon: '💀',
        health: 50,
        damage: 5,
        reward: 500,
        otherRewards: [
            { type: RESOURCE_TYPES.seed, amount: 10, chance: 0.5 },
            { type: RESOURCE_TYPES.wood, amount: 100, chance: 0.5 },
            { type: RESOURCE_TYPES.metal, amount: 10, chance: 0.2 },
            { type: RESOURCE_TYPES.diamond, amount: 1, chance: 0.02 }
        ]
    }
]

const MONSTER_TILE_STAGES = {
    castle: 'castle',
    battle: 'battle',
    defeat: 'defeat',
    victory: 'victory'
}

export class MonsterTile extends Tile {
    static type = TILE_TYPES.monster

    constructor(app) {
        super(app, MonsterTile.type)
        this.type = MONSTER_TILE_STAGES.castle
        this.monster = null
    }
    get icon() {
        switch (this.type) {
            case MONSTER_TILE_STAGES.castle:
                return '🏰'
            case MONSTER_TILE_STAGES.battle:
                return '⚔️'
            case MONSTER_TILE_STAGES.defeat:
                return '💀'
            case MONSTER_TILE_STAGES.victory:
                return '🏆'
            default:
                return '👾'
        }
    }
    get tooltip() {
        return 'Monster tile - click to fight the monster!'
    }
    click() {
        this.app.showMessage('You fought the monster!')
    }
    sell() {
        this.app.boughtUpgrades['Monster Tile'] -= 1
    }

    static hasTile(app) {
        return app.land.some(t => t instanceof MonsterTile)
    }

    static upgrades = [
        {
            name: 'Monster Tile',
            displayName: 'Castle Tile',
            tile: true,
            description: 'Claim a tile of land to fight monsters on',
            initialOwned: 0,
            baseCost: 500,
            costMultiplier: 2,
            speed: undefined,
            category: CATEGORIES.tiles,
            group: GROUPS.monster,
            onBuy(app) {
                app.addTile(new MonsterTile(app))
            }
        }
    ]
}
