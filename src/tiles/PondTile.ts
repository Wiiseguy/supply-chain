import { Automator } from '../Automator'
import { Calculator } from '../Calculator'
import { CATEGORIES, GROUP_ICONS, GROUPS, RESOURCE_TYPES, TILE_TYPES } from '../consts'
import { Resource } from '../Resource'
import Tile from './Tile'
import { Upgrade } from '../Upgrade'
import { isLucky } from '../utils'

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

interface IPondFind {
    id: number
    name: string
    icon: string
    gain: number
    nonFish: boolean
    resource?: string
}

const SEALIFE = [
    { id: 1, name: 'Common fish', icon: '🐟', gain: 1, nonFish: false },
    { id: 2, name: 'Clownfish', icon: '🐠', gain: 2, nonFish: false },
    { id: 3, name: 'Shrimp', icon: '🦐', gain: 5, nonFish: true },
    { id: 4, name: 'Lobster', icon: '🦞', gain: 10, nonFish: true },
    { id: 5, name: 'Crab', icon: '🦀', gain: 20, nonFish: true },
    { id: 6, name: 'Pufferfish', icon: '🐡', gain: 30, nonFish: false },
    { id: 7, name: 'Frog', icon: '🐸', gain: 40, nonFish: true },
    { id: 8, name: 'Squid', icon: '🦑', gain: 50, nonFish: true },
    { id: 9, name: 'Octopus', icon: '🐙', gain: 75, nonFish: true },
    { id: 10, name: 'Shark', icon: '🦈', gain: 100, nonFish: false },
    { id: 11, name: 'Dolphin', icon: '🐬', gain: 150, nonFish: true },
    { id: 12, name: 'Penguin', icon: '🐧', gain: 200, nonFish: true },
    { id: 13, name: 'Whale', icon: '🐳', gain: 500, nonFish: true },
    { id: 14, name: 'Blue Whale', icon: '🐋', gain: 1000, nonFish: true }
]

// To make it more interesting, there should be a small chance of catching a wood, seed, metal, diamond, or clay
const RARITY_CHANCE = 1 / 100
const RARITIES = [
    { id: 1, name: 'Clay pot', icon: '🏺', resource: RESOURCE_TYPES.clay, gain: 1 },
    { id: 2, name: 'Piece of metal', icon: '🔧', resource: RESOURCE_TYPES.metal, gain: 1 },
    { id: 3, name: 'Diamond', icon: '💎', resource: RESOURCE_TYPES.diamond, gain: 1 }
]

const FISH_PRICE_BASE = 50
const FISH_STORAGE_SIZE = 50

function randomResource(resourceList: any[], luck = 0.5) {
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

// function simulate() {
//     for (const element of SEALIFE) {
//         console.log(element)
//     }
//     // Simulate many catches
//     const fishCounts = {}
//     for (let i = 0; i < 100; i++) {
//         const fish = randomResource(SEALIFE, 0.5)
//         if (!fishCounts[fish.icon]) {
//             fishCounts[fish.icon] = 0
//         }
//         fishCounts[fish.icon] += 1
//     }
//     console.log(fishCounts)
//     // Log what wasn't caught
//     for (const fish of SEALIFE) {
//         if (!fishCounts[fish.icon]) {
//             console.log(fish, 'was not caught')
//         }
//     }
// }

export class PondTile extends Tile implements ITile {
    static readonly type = TILE_TYPES.pond

    catchTime = 0
    wiggleTime = 0
    wiggleSaturation = 0
    pondFind: IPondFind | null = null
    isRare = false

    constructor(app: IApp) {
        super(app, PondTile.type)
        this.reset()
    }
    update(elapsed: number) {
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
        this.pondFind = null
        this.catchTime = FISHING_TIME_BASE + (Math.random() - 0.5) * FISHING_TIME_VARIANCE * 2
        this.wiggleTime = 0
        this.progress = 0
    }

    showMessage(message: string, manual: boolean) {
        if (!manual) return
        this.app.showMessage(message)
    }

    catch(manual: boolean) {
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
            this.pondFind = randomResource(RARITIES, rareRarityLuck)
            this.isRare = true
            this.app.stats.fishRarities += 1
        } else {
            this.pondFind = randomResource(SEALIFE, rareFishLuck)
            this.isRare = false
            this.app.stats.fishCaught += 1
        }
        this.showMessage('Caught something!', manual)
        this.animateGrow()
        this.wiggleTime = 0
    }
    take(manual: boolean) {
        if (!this.pondFind) return

        if (this.isRare) {
            const rarity = this.pondFind
            const resource = rarity.resource
            if (!resource) {
                console.error('No resource for rarity', rarity)
                return
            }
            this.app.resources[resource].gain(1)
            this.showMessage(`Lucky! Found a ${this.pondFind.icon} ${this.pondFind.name.toLocaleLowerCase()}!`, manual)
        } else {
            this.app.resources.fish.gain(this.pondFind.gain)
            let message = `Caught a ${this.pondFind.icon} ${this.pondFind.name.toLocaleLowerCase()}`
            if (this.pondFind.gain > 1) {
                message += `, worth ${this.pondFind.gain} fish`
            }
            message += (this.pondFind.nonFish ? ' (somehow)' : '') + '!'
            this.showMessage(message, manual)

            // Add to fish tank!
            let fishTankRow = this.app.stats.fishTank.find(row => row[0] === this.pondFind?.icon)
            if (!fishTankRow) {
                fishTankRow = [this.pondFind.icon, 0]
                this.app.stats.fishTank.push(fishTankRow)
            }
            fishTankRow[1] += 1
        }
        this.reset()
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
            this.catch(manual)
            return
        }
        if (this.pondFind) {
            this.take(manual)
        }
    }
    get icon() {
        if (this.pondFind) {
            return this.pondFind.icon
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

    getSaveData(): Record<string, any> {
        return {
            ...super.getSaveData(),
            pondFindId: this.pondFind?.id,
            pondFind: undefined
        }
    }
    loadSaveData(data: Record<string, any>): void {
        super.loadSaveData(data)
        if (data.pondFindId) {
            if (this.isRare) {
                this.pondFind = RARITIES.find(f => f.id === data.pondFindId) as IPondFind
            } else {
                this.pondFind = SEALIFE.find(f => f.id === data.pondFindId) as IPondFind
            }
        }
    }

    static readonly resources = [
        new Resource(RESOURCE_TYPES.fish, {
            displayNameSingular: 'Fish',
            displayNamePlural: 'Fish',
            icon: '🐟',
            basePrice: FISH_PRICE_BASE,
            storageBaseSize: FISH_STORAGE_SIZE
        })
    ]

    static readonly calculators = [
        new Calculator('rareFishLuck', app => RARE_FISH_LUCK_BASE + app.boughtUpgrades['Lucky Bait'] * 0.1)
    ]

    static readonly automators = [
        new Automator('Auto Fisher', app => {
            // Give priority to wiggling tiles
            const wiggling = app.land.find(t => t instanceof PondTile && t.wiggleTime > 0)
            if (wiggling) {
                wiggling.click()
                return
            }
            // Check if there is a fish to catch and click that instead
            const caught = app.land.find(t => t instanceof PondTile && t.pondFind)
            if (caught) {
                caught.click()
            }
        }),
        new Automator('Fish Reclaimer', app => {
            app.resources.fish.reclaim(1)
        }),
        Automator.createSeller('Fish Seller')
    ]

    static hasTile(app: IApp) {
        return app.land.some(t => t instanceof PondTile)
    }

    static readonly upgrades: Upgrade[] = [
        new Upgrade({
            name: 'Pond Tile',
            tile: true,
            description: 'Claim a tile of land to fish in',
            baseCost: 250,
            costMultiplier: 1.5,
            category: CATEGORIES.tiles,
            group: GROUPS.pond,
            resourceCosts: {
                [RESOURCE_TYPES.wood]: 10
            },
            onBuy(app: IApp) {
                app.addTile(new PondTile(app))
            }
        }),
        new Upgrade({
            name: 'Fish Storage',
            displayName: 'Fish Tank',
            description: 'Increase the amount of fish you can store',
            initialOwned: 1,
            baseCost: 1500,
            costMultiplier: 1.4,
            category: CATEGORIES.storage,
            group: GROUPS.pond,
            onBuy(app: IApp) {
                app.resources.fish.storage += 1
            },
            isVisible: PondTile.hasTile
        }),
        Upgrade.createSellerAutomator({
            name: 'Fish Seller',
            description: 'Automatically sell fish. Selfish. Shellfish?',
            baseCost: 4500,
            costMultiplier: 1.5,
            speed: 1 / 4,
            group: GROUPS.pond,
            isVisible: PondTile.hasTile,
            resourcesSold: [RESOURCE_TYPES.fish]
        }),
        Upgrade.createAutomator({
            name: 'Fish Reclaimer',
            displayName: 'Fish Re-fisher',
            description: 'Collect lost fish swimming about thinking they were lucky',
            baseCost: 5500,
            costMultiplier: 1.5,
            speed: 1 / 4,
            group: GROUPS.pond,
            isVisible: PondTile.hasTile
        }),
        Upgrade.createAutomator({
            name: 'Auto Fisher',
            description: 'Automatically fish for you',
            baseCost: 5000,
            costMultiplier: 1.25,
            speed: 1 / FISHING_WIGGLE_TIME,
            group: GROUPS.pond,
            isVisible: PondTile.hasTile
        }),
        // Special
        new Upgrade({
            name: 'Lucky Bait',
            description: 'Increase the chance of catching rare fish',
            baseCost: 4000,
            costMultiplier: 2,
            category: CATEGORIES.special,
            group: GROUPS.pond,
            max: 5,
            isVisible: PondTile.hasTile
        })
    ]
}

// Monster tile

/** @ts-ignore */
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

/** @ts-ignore */
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

export class MonsterTile extends Tile implements ITile {
    static readonly type = TILE_TYPES.monster

    type: string
    monster = null

    constructor(app: IApp) {
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

    static hasTile(app: IApp) {
        return app.land.some(t => t instanceof MonsterTile)
    }

    static readonly upgrades: Upgrade[] = [
        new Upgrade({
            name: 'Monster Tile',
            displayName: 'Castle Tile',
            tile: true,
            description: 'Claim a tile of land to fight monsters on',
            baseCost: 500,
            costMultiplier: 2,
            category: CATEGORIES.tiles,
            group: GROUPS.monster,
            onBuy(app: IApp) {
                app.addTile(new MonsterTile(app))
            }
        })
    ]
}
