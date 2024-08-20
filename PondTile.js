import { Automator } from './Automator.js'
import { CATEGORIES, GROUP_ICONS, GROUPS, RESOURCE_TYPES, TILE_TYPES } from './consts.js'
import Tile from './Tile.js'
import { isLucky } from './utils.js'

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
const RARE_FISH_LUCK_BASE = 0.5
const FISH = ['🐟', '🐠', '🦐', '🦞', '🦀', '🐡', '🐸', '🦑', '🐙', '🦈', '🐬', '🐳', '🐋']
const NON_FISH = ['🦐', '🦞', '🦀', '🐸', '🐬', '🐳', '🐋']
const FISH_GAINS = [1, 2, 5, 10, 20, 30, 40, 50, 75, 100, 200, 500, 1000]
// To make it more interesting, there should be a small chance of catching a wood, seed, metal, diamond, or clay
const RARITY_CHANCE = 1 / 100
const RARITIES = ['🏺', '🔧', '💎']
const RARITY_GAINS = [RESOURCE_TYPES.clay, RESOURCE_TYPES.metal, RESOURCE_TYPES.diamond]

export const FISH_PRICE_BASE = 50
export const FISH_STORAGE_SIZE = 50

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
console.assert(FISH.length === FISH_GAINS.length, 'FISH and FISH_GAINS must be the same length')
console.assert(RARITIES.length === RARITY_GAINS.length, 'RARITIES and RARITY_GAINS must be the same length')

function simulate() {
    for (let i = 0; i < FISH.length; i++) {
        console.log(FISH[i], FISH_GAINS[i])
    }
    // Simulate many catches
    const fishCounts = {}
    for (let i = 0; i < 100; i++) {
        const fish = randomResource(FISH, 0.5)
        if (!fishCounts[fish]) {
            fishCounts[fish] = 0
        }
        fishCounts[fish] += 1
    }
    console.log(fishCounts)
    // Log what wasn't caught
    for (const fish of FISH) {
        if (!fishCounts[fish]) {
            console.log(fish, 'was not caught')
        }
    }
}

export class PondTile extends Tile {
    catchTime = 0
    wiggleTime = 0
    wiggleSaturation = 0
    caughtFish = null
    isRare = false
    constructor(app) {
        super(app)
        this.tileType = TILE_TYPES.pond
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
                this.app.showMessage('Fish got away!')
                this.app.stats.fishMissed += 1
                this.animateFail()
                this.reset()
            }
        }
    }
    reset() {
        this.caughtFish = null
        this.catchTime = FISHING_TIME_BASE + (Math.random() - 0.5) * FISHING_TIME_VARIANCE * 2
        if (this.app.DEBUG) {
            console.log('Catch time:', this.catchTime, this)
        }
        this.wiggleTime = 0
        this.progress = 0
    }

    click() {
        if (this.wiggleTime <= 0 && this.catchTime > 0) {
            // Punish if player clicks when the pole is not wiggling
            this.app.showMessage('You need to wait for the fishing pole to wiggle!')
            this.animateFail()
            this.catchTime += 10
            return
        }
        if (this.wiggleTime > 0) {
            this.stopAnimations()
            if (isLucky(RARITY_CHANCE)) {
                this.caughtFish = randomResource(RARITIES, this.rareFishLuck)
                this.isRare = true
                this.app.stats.fishRarities += 1
            } else {
                this.caughtFish = randomResource(FISH, this.rareFishLuck)
                this.isRare = false
                this.app.stats.fishCaught += 1
            }
            this.app.showMessage('Caught something!')
            this.animateGrow()
            this.wiggleTime = 0
            return
        }
        if (this.caughtFish) {
            if (this.isRare) {
                const idx = RARITIES.indexOf(this.caughtFish)
                const resource = RARITY_GAINS[idx]
                this.app.resources[resource].gain(1)
                this.app.showMessage(`Lucky! Found a ${this.caughtFish}!`)
            } else {
                const idx = FISH.indexOf(this.caughtFish)
                const fishGain = FISH_GAINS[idx]
                this.app.resources.fish.gain(fishGain)
                const isNonFish = NON_FISH.includes(this.caughtFish)
                this.app.showMessage(
                    `Caught a ${this.caughtFish}, worth ${fishGain} fish${isNonFish ? ' (somehow)' : ''}!`
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
        return RARE_FISH_LUCK_BASE + this.app.boughtUpgrades['Lucky Bait'] * 0.1
    }

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
                app.land.push(new PondTile(app))
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
            }
        },
        {
            name: 'Fish Reclaimer',
            displayName: 'Fish Re-fisher',
            description: 'Collect lost fish swimming about thinking they were lucky',
            initialOwned: 0,
            baseCost: 7000,
            costMultiplier: 1.5,
            speed: 1 / 8,
            category: CATEGORIES.automation,
            group: GROUPS.pond
        },
        {
            name: 'Fish Seller',
            description: 'Automatically sell fish. Selfish. Shellfish?',
            initialOwned: 0,
            baseCost: 7500,
            costMultiplier: 1.5,
            speed: 1 / 8,
            category: CATEGORIES.automation,
            group: GROUPS.pond
        },
        {
            name: 'Auto Fisher',
            description: 'Automatically fish for you',
            initialOwned: 0,
            baseCost: 8000,
            costMultiplier: 2,
            speed: 1 / FISHING_WIGGLE_TIME,
            category: CATEGORIES.automation,
            group: GROUPS.pond
        },

        // Luck booster upgrade for finding more rare fish
        {
            name: 'Lucky Bait',
            description: 'Increase the chance of catching rare fish',
            initialOwned: 0,
            baseCost: 9000,
            costMultiplier: 1.5,
            category: CATEGORIES.special,
            group: GROUPS.pond,
            max: 5
        }
    ]
}
