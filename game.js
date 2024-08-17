import { Automator } from './Automator.js'
import { Counter } from './Counter.js'
import { ForestTile } from './ForestTile.js'
import { MineTile } from './MineTile.js'
import { Resource } from './Resource.js'
import {
    CLAY_PRICE_BASE,
    CLAY_STORAGE_SIZE,
    DIAMOND_PRICE_BASE,
    DIAMONDS_STORAGE_SIZE,
    EXTRA_SEED_CHANCE_MULTIPLIER,
    FOREST_TILE_TYPES,
    GROUP_ICONS,
    GROUP_TITLES,
    LUCKY_RESOURCE_MINE_CHANCE,
    METAL_PRICE_BASE,
    METAL_STORAGE_SIZE,
    MINE_RESOURCE_TYPES,
    MINE_TILE_TYPES,
    RESOURCE_TYPES,
    SEED_PRICE_BASE,
    SEEDS_STORAGE_SIZE,
    TILE_TYPES,
    WOOD_PRICE_BASE,
    WOOD_STORAGE_SIZE
} from './consts.js'
import { UPGRADES, UPGRADES_INDEX } from './upgrades.js'
import { bigNum, humanTime, isLucky, pick } from './utils.js'

globalThis.haltAnimation = false

const DEBUG = false
const FPS = 30

const TILE_SIZE = 64

const DEFAULT_UPGRADE_VISIBILITY_THRESHOLD = 0.25
const DEFAULT_UPGRADE_BLUR_THRESHOLD = 0.5

const INITIAL_MONEY = 0
const INITIAL_SEEDS = 4

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
            showEarnings: false,

            // Vars
            money: INITIAL_MONEY,

            // Stats
            moneySpent: 0,
            treesChopped: 0,
            luckySeeds: 0,
            luckyTrees: 0,
            resourcesMined: 0,
            tunnelsDug: 0,
            minesOwned: 0
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
            //money: new Resource('money', 'Money', 'Money', '💰', 1, Infinity, INITIAL_MONEY),
            wood: new Resource(RESOURCE_TYPES.wood, 'Wood', 'Wood', '🪓', WOOD_PRICE_BASE, WOOD_STORAGE_SIZE),
            seed: new Resource(
                RESOURCE_TYPES.seed,
                'Seed',
                'Seeds',
                '🌱',
                SEED_PRICE_BASE,
                SEEDS_STORAGE_SIZE,
                INITIAL_SEEDS
            ),
            clay: new Resource(RESOURCE_TYPES.clay, 'Clay', 'Clay', '🏺', CLAY_PRICE_BASE, CLAY_STORAGE_SIZE),
            metal: new Resource(RESOURCE_TYPES.metal, 'Metal', 'Metal', '🔧', METAL_PRICE_BASE, METAL_STORAGE_SIZE),
            diamond: new Resource(
                RESOURCE_TYPES.diamond,
                'Diamond',
                'Diamonds',
                '💎',
                DIAMOND_PRICE_BASE,
                DIAMONDS_STORAGE_SIZE
            )
        }

        // Initialize automators
        this.automators = [
            new Automator('Auto Digger', () => {
                const tile = /** @type {ForestTile[]} */ (this.forestLand).find(
                    tile => tile.type === FOREST_TILE_TYPES.empty
                )
                if (tile) {
                    tile.dig()
                }
            }),
            new Automator('Auto Seeder', () => {
                const tile = /** @type {ForestTile[]} */ (this.forestLand).find(
                    tile => tile.type === FOREST_TILE_TYPES.hole
                )
                if (tile) {
                    tile.plant()
                }
            }),
            new Automator('Auto Chopper', () => {
                const fullyGrownTrees = /** @type {ForestTile[]} */ (this.forestLand).filter(
                    tile => tile.isFullyGrownTree
                )
                const maxChopped = Math.max(...fullyGrownTrees.map(tile => tile.progress))
                const tile = fullyGrownTrees.find(tile => tile.progress === maxChopped)
                if (tile) {
                    tile.chop()
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
                const excessSeeds = this.resources.seed.owned + treeTiles.length - this.forestLand.length
                if (excessSeeds > 0) {
                    this.sellResource(this.resources.seed, 1)
                }
            }),
            new Automator('Seed Reclaimer', () => {
                this.resources.seed.reclaim(1)
            }),
            new Automator('Auto Shoveler', () => {
                const tile = pick(this.mineLand.filter(tile => tile.type === MINE_TILE_TYPES.rock))
                if (tile) {
                    tile.dig()
                }
            }),
            new Automator('Tunneler', () => {
                const tile = pick(this.mineLand.filter(tile => tile.type === MINE_TILE_TYPES.tunnel))
                if (tile) {
                    tile.tunnel()
                }
            }),
            new Automator('Resource Miner', () => {
                const resourceTiles = this.mineLand.filter(tile => tile.type === MINE_TILE_TYPES.resource)
                const tile = pick(resourceTiles)
                if (!tile) {
                    return
                }
                tile.mine()

                // The more resource miners, the higher the chance of mining the same tile again
                resourceTiles.forEach(tile => {
                    if (isLucky(LUCKY_RESOURCE_MINE_CHANCE)) {
                        tile.mine()
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
                this.sellResource(this.resources.diamond, 1)
            }),
            new Automator('Diamond Reclaimer', () => {
                this.resources.diamond.reclaim(1)
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
        numf(n) {
            return Math.round(n).toLocaleString()
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
            globalThis.haltAnimation = false

            // If elapsed is massive, the game was paused maybe due to hibernation or tab switch
            // In that case, animations caused by setTimeout should not be triggered this update
            if (elapsed > 10) {
                console.warn('Massive elapsed time detected, halting animations. Elapsed seconds:', elapsed)
                globalThis.haltAnimation = true
            }

            this.messageFade -= elapsed / 10
            if (this.messageFade < 0) {
                this.messageFade = 0
            }

            this.land.forEach(tile => {
                tile.stageP = 0
                tile.update(elapsed)
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
            this.moneySpent -= price
            this.boughtUpgrades[automator.upgradeName] -= 1
            console.log('Sold automator:', automator, 'for', price)
        },
        incur(money) {
            if (this.money < money) {
                return false
            }
            this.money -= money
            this.moneySpent += money
            return true
        },

        clickTile(tileModel) {
            console.log('Clicked tile:', JSON.parse(JSON.stringify(tileModel)))
            const tile = tileModel.tile
            if (!tile) {
                this.showMessage('Buy a tile to claim this land!')
                return
            }
            tile.click()
        },

        createForestTile() {
            return new ForestTile(this)
        },
        createMineTile(subType) {
            return new MineTile(this, subType)
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
                    if (!tile.isFullyGrownTree) {
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
                    this.land.push(this.createMineTile(RESOURCE_TYPES.diamond))
                    break
                case 'Metal Mine Tile':
                    this.land.push(this.createMineTile(RESOURCE_TYPES.metal))
                    break
                case 'Clay Mine Tile':
                    this.land.push(this.createMineTile(RESOURCE_TYPES.clay))
                    break
                // Storage
                case 'Wood Storage':
                    this.resources.wood.storage += 1
                    break
                case 'Seed Storage':
                    this.resources.seed.storage += 1
                    break
                case 'Diamond Storage':
                    this.resources.diamond.storage += 1
                    break
                case 'Metal Storage':
                    this.resources.metal.storage += 1
                    break
                case 'Clay Storage':
                    this.resources.clay.storage += 1
                    break
                // Specials
                case 'Wooden Finger':
                    this.resources.wood.sellNum *= 10
                    break
                case 'Wood Marketing 1':
                    this.resources.wood.price *= 2
                    break
                case 'Seed Luck 1':
                    ForestTile.luckySeedChance *= EXTRA_SEED_CHANCE_MULTIPLIER
                    break
                case 'Seed Marketing 1':
                    this.resources.seed.price *= 2
                    break
                case 'Seed Marketing 2':
                    this.resources.seed.price *= 3
                    break
                case 'Wood Marketing 2':
                    this.resources.wood.price *= 2
                    break
                case 'Wood Marketing 3':
                    this.resources.wood.price *= 2
                    break
                case 'Diamond Marketing 1':
                    this.resources.diamond.price *= 1.5
                    break
                case 'Diamond Marketing 2':
                    this.resources.diamond.price *= 2
                    break
            }
        },
        hasUpgrade(upgradeName) {
            return this.boughtUpgrades[upgradeName] > 0
        },
        hasRoomForTile() {
            return this.land.length >= this.boughtUpgrades['Extra Column'] * this.boughtUpgrades['Extra Row']
        },
        canBuyUpgrade(upgrade) {
            switch (upgrade.name) {
                case 'Forest Tile':
                case 'Diamond Mine Tile':
                case 'Metal Mine Tile':
                case 'Clay Mine Tile':
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
        timeSinceStart() {
            let diff = this.now - this.startTime
            if (diff < 60_000) {
                return '0m'
            }
            return humanTime(diff)
        },
        forestLand() {
            return this.land.filter(tile => tile instanceof ForestTile)
        },
        mineLand() {
            return this.land.filter(tile => tile instanceof MineTile)
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
                    icon: tile.icon,
                    style: this.getTileStyle(tile),
                    progressStyle: {
                        width: `${tile.stageP * 100}%`
                    },
                    progressAltStyle: this.getTileProgressAltStyle(tile),
                    level: tile.level,
                    classes: this.getLandTileClass(tile),
                    tooltip: tile.tooltip
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
        totalResourceEarnings() {
            /** @ts-ignore */
            return this.resourcesView.reduce((acc, resource) => acc + resource.earnings, 0)
        },
        totalResourcesOwned() {
            /** @ts-ignore */
            return this.resourcesView.reduce((acc, resource) => acc + resource.totalOwned, 0)
        },
        totalResourcesSold() {
            /** @ts-ignore */
            return this.resourcesView.reduce((acc, resource) => acc + resource.sold, 0)
        },
        totalResourcesIncurred() {
            /** @ts-ignore */
            return this.resourcesView.reduce((acc, resource) => acc + resource.incurred, 0)
        },
        totalProfit() {
            /** @ts-ignore */
            return this.totalResourceEarnings - this.moneySpent
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
            let result = [this.resources.wood, this.resources.seed]
            MINE_RESOURCE_TYPES.forEach(resourceType => {
                /** @ts-ignore */
                if (this.mineLand.some(tile => tile.subType === resourceType)) {
                    result.push(this.resources[resourceType])
                }
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
