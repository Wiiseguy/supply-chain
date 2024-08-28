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

const SEALIFE = [
    { name: 'Common fish', icon: '🐟', gain: 1, nonFish: false },
    { name: 'Clownfish', icon: '🐠', gain: 2, nonFish: false },
    { name: 'Shrimp', icon: '🦐', gain: 5, nonFish: true },
    { name: 'Lobster', icon: '🦞', gain: 10, nonFish: true },
    { name: 'Crab', icon: '🦀', gain: 20, nonFish: true },
    { name: 'Pufferfish', icon: '🐡', gain: 30, nonFish: false },
    { name: 'Frog', icon: '🐸', gain: 40, nonFish: true },
    { name: 'Squid', icon: '🦑', gain: 50, nonFish: true },
    { name: 'Octopus', icon: '🐙', gain: 75, nonFish: true },
    { name: 'Shark', icon: '🦈', gain: 100, nonFish: false },
    { name: 'Dolphin', icon: '🐬', gain: 150, nonFish: true },
    { name: 'Penguin', icon: '🐧', gain: 200, nonFish: true },
    { name: 'Whale', icon: '🐳', gain: 500, nonFish: true },
    { name: 'Blue Whale', icon: '🐋', gain: 1000, nonFish: true }
]

// To make it more interesting, there should be a small chance of catching a wood, seed, metal, diamond, or clay
const RARITY_CHANCE = 1 / 100
const RARITIES = [
    { name: 'Clay pot', icon: '🏺', resource: RESOURCE_TYPES.clay, gain: 1 },
    { name: 'Piece of metal', icon: '🔧', resource: RESOURCE_TYPES.metal, gain: 1 },
    { name: 'Diamond', icon: '💎', resource: RESOURCE_TYPES.diamond, gain: 1 }
]

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

function simulate() {
    for (const element of SEALIFE) {
        console.log(element)
    }
    // Simulate many catches
    const fishCounts = {}
    for (let i = 0; i < 100; i++) {
        const fish = randomResource(SEALIFE, 0.5)
        if (!fishCounts[fish.icon]) {
            fishCounts[fish.icon] = 0
        }
        fishCounts[fish.icon] += 1
    }
    console.log(fishCounts)
    // Log what wasn't caught
    for (const fish of SEALIFE) {
        if (!fishCounts[fish.icon]) {
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
            let rareRarityLuck = this.rareFishLuck
            if (this.isSick) {
                // Increase the chance of non-fish and decrease the chance of rare fish
                rarityChance = 0.5
                rareFishLuck = 0.1
            }
            if (isLucky(rarityChance)) {
                this.caughtFish = randomResource(RARITIES, rareRarityLuck)
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
                const resource = this.caughtFish.resource
                this.app.resources[resource].gain(1)
                this.showMessage(`Lucky! Found a... ${this.caughtFish.icon} ${this.caughtFish.name}!`, manual)
            } else {
                this.app.resources.fish.gain(this.caughtFish.gain)
                let message = `Caught a... ${this.caughtFish.icon} ${this.caughtFish.name}`
                if (this.caughtFish.gain > 1) {
                    message += `, worth ${this.caughtFish.gain} fish`
                }
                message += (this.caughtFish.nonFish ? ' (somehow)' : '') + '!'
                this.showMessage(message, manual)

                // Add to fish tank!
                let fishTankRow = this.app.stats.fishTank.find(row => row[0] === this.caughtFish.icon)
                if (!fishTankRow) {
                    fishTankRow = [this.caughtFish.icon, 0]
                    this.app.stats.fishTank.push(fishTankRow)
                }
                fishTankRow[1] += 1
            }
            this.reset()
        }
    }
    get icon() {
        if (this.caughtFish) {
            return this.caughtFish.icon
        }
        return GROUP_ICONS.pond
    }
    get iconStyle() {
        let filter = 'none'
        let rotation = 270 //(this.age * 10) % 360
        if (this.isSick) {
            filter = `brightness(0.9) saturate(0.5) hue-rotate(${rotation}deg)`
        }
        return {
            filter
        }
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
    // get iconBottomRight() {
    //     // If any adjacent tile is a kiln, show skull emoji
    //     if (this.isSick) {
    //         return '💀'
    //     }
    // }

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
                [RESOURCE_TYPES.wood]: 10
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
            baseCost: 4000,
            costMultiplier: 2,
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
