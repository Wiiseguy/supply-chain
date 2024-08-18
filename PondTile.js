import { GROUP_ICONS, GROUPS, RESOURCE_TYPES, TILE_TYPES } from './consts.js'
import Tile from './Tile.js'
import { isLucky } from './utils.js'

// Pond stuff
// Ponds are a source of fish, or some rarer things like resources
// Ponds work different from forests and mines. The fishing pole is cast and then you wait for a semiramdom amount of time
// After that time the pole will wiggle and you have a certain amount of time to click it to catch the fish.
// If you miss it, the fish will escape and you have to cast the pole with a new bait.
// Lure can be seeds? Or worms? Or bread? Bread may work, but then the pre-requisite for ponds is a farm.
const FISHING_TIME_BASE = 90 // seconds
const FISHING_TIME_VARIANCE = 60 // seconds - bite time is between (BASE - VARIANCE) and BASE + VARIANCE)
const FISHING_WIGGLE_TIME = 10 // seconds
const FISHING_WIGGLE_VARIANCE = 5 // seconds
const FISH = ['🐟', '🐠', '🦐', '🦞', '🦀', '🐡', '🐬', '🦈', '🐳', '🐋']
const FISH_CHANCES = [0.5, 0.25, 0.1, 0.05, 0.05, 0.025, 0.025, 0.01, 0.01, 0.005]
const FISH_GAINS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]
// To make it more interesting, there should be a small chance of catching a wood, seed, metal, diamond, or clay
const RARITY_CHANCE = 1 / 100
const RARITIES = ['🏺', '🔧', '💎']
const RARITY_CHANCES = [0.65, 0.2, 0.15]
const RARITY_GAINS = [RESOURCE_TYPES.clay, RESOURCE_TYPES.metal, RESOURCE_TYPES.diamond]

export const FISH_PRICE_BASE = 50
export const FISH_STORAGE_SIZE = 50

function randomResource(resourceList, resourceChances) {
    const r = Math.random()
    let sum = 0
    for (let i = 0; i < resourceChances.length; i++) {
        sum += resourceChances[i]
        if (r < sum) {
            return resourceList[i]
        }
    }
    return resourceList[resourceList.length - 1]
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
                this.wiggleTime = FISHING_WIGGLE_TIME + (Math.random() - 0.5) * FISHING_WIGGLE_VARIANCE * 2
            }
        }
        if (this.wiggleTime > 0) {
            this.wiggleSaturation += elapsed
            if (this.wiggleSaturation > 1) {
                this.wiggleSaturation = 0
                this.animateWiggle()
            }
            this.wiggleTime -= elapsed
            if (this.wiggleTime <= 0) {
                this.app.showMessage('Fish got away!')
                this.animateFail()
                this.reset()
            }
        }
    }
    reset() {
        this.caughtFish = null
        this.catchTime = FISHING_TIME_BASE + (Math.random() - 0.5) * FISHING_TIME_VARIANCE * 2
        console.log('Catch time:', this.catchTime, this)
        this.wiggleTime = 0
    }

    click() {
        // Punish if player clicks when the pole is not wiggling
        if (this.wiggleTime <= 0 && this.catchTime > 0) {
            this.app.showMessage('You need to wait for the fishing pole to wiggle!')
            this.animateFail()
            this.reset()
            return
        }
        if (this.wiggleTime > 0) {
            if (isLucky(RARITY_CHANCE)) {
                this.caughtFish = randomResource(RARITIES, RARITY_CHANCES)
                this.isRare = true
            } else {
                this.caughtFish = randomResource(FISH, FISH_CHANCES)
                this.isRare = false
            }
            this.app.showMessage('Caught something!')
            this.animateGrow()
            this.wiggleTime = 0
            return
        }
        if (this.caughtFish) {
            if (this.isRare) {
                let idx = RARITIES.indexOf(this.caughtFish)
                let resource = RARITY_GAINS[idx]
                this.app.resources[resource].gain(1)
                this.app.showMessage(`Lucky! Found a ${this.caughtFish}!`)
            } else {
                let idx = FISH.indexOf(this.caughtFish)
                let fishGain = FISH_GAINS[idx]
                this.app.resources.fish.gain(fishGain)
                this.app.showMessage(`Caught a ${this.caughtFish}, worth ${fishGain} fish!`)
            }
            this.reset()
            return
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
    static getAutomators(_app) {
        return []
    }
    static upgrades = [
        {
            name: 'Pond Tile',
            tile: true,
            description: 'Claim a tile of land to fish in',
            initialOwned: 0,
            baseCost: 200,
            costMultiplier: 1.2,
            speed: undefined,
            category: 'tiles',
            group: GROUPS.pond,
            onBuy(app) {
                app.land.push(new PondTile(app))
            }
        },
        {
            name: 'Fish Storage',
            displayName: 'Fish Tank',
            description: 'Increase the amount of fish you can store',
            initialOwned: 1,
            baseCost: 2000,
            costMultiplier: 1.2,
            category: 'storage',
            group: GROUPS.forest,
            onBuy(app) {
                app.resources.fish.storage += 1
            }
        }
    ]
}
