import { Counter } from './Counter.js'
import { DonutTile } from './DonutTile.js'
import { EmptyTile } from './EmptyTile.js'
import { ForestTile, INITIAL_SEEDS } from './ForestTile.js'
import { MineTile } from './MineTile.js'
import { MonsterTile, PondTile } from './PondTile.js'
import { Resource } from './Resource.js'
import { GROUP_ICONS, CATEGORY_TITLES, CATEGORIES } from './consts.js'
import { UPGRADES } from './upgrades.js'
import { bigNum, humanTime, makeIndex } from './utils.js'

globalThis.haltAnimation = false

const DEBUG = false
const FPS = 30
const SAVE_INTERVAL = 30 // Save every 60 seconds

const TILE_SIZE = 64

const DEFAULT_UPGRADE_VISIBILITY_THRESHOLD = 0.25
const DEFAULT_UPGRADE_BLUR_THRESHOLD = 0.5

const INITIAL_MONEY = 0

/** @ts-ignore */
const app = Vue.createApp({
    data() {
        return {
            DEBUG,
            UPGRADES: null,
            UPGRADES_INDEX: null,
            TILE_REVIVERS: {},

            now: Date.now(),
            startTime: Date.now(),
            lastUpdate: Date.now(),

            land: [],
            resources: {},
            automators: [],
            calculators: [],
            calculated: {},
            counters: [],
            boughtUpgrades: {},
            visibleUpgrades: [],
            unblurredUpgrades: [],
            clickMode: 'click',
            movingTileIdx: -1,
            message: '',
            messageFade: 0,
            showEarnings: false,

            // Vars
            money: INITIAL_MONEY,

            // Stats
            stats: {
                started: false,
                moneySpent: 0,
                treesChopped: 0,
                luckySeeds: 0,
                luckyTrees: 0,
                resourcesMined: 0,
                tunnelsDug: 0,
                minesOwned: 0,
                fishCaught: 0,
                fishMissed: 0,
                fishRarities: 0,
                fishTank: []
            },

            // Settings
            settings: {
                automation: true,
                dark: true
            }
        }
    },
    created() {
        this.UPGRADES = UPGRADES

        // Initialize resources
        this.resources = {}

        // Initialize Tile types
        this.registerTile(EmptyTile)
        this.registerTile(ForestTile)
        this.registerTile(MineTile)
        this.registerTile(PondTile)
        this.registerTile(DonutTile)
        //this.registerTile(MonsterTile)

        // Initialize bought upgrades obj
        this.UPGRADES.forEach(upgrade => {
            this.boughtUpgrades[upgrade.name] = upgrade.initialOwned ?? 0
        })
        this.UPGRADES_INDEX = makeIndex(UPGRADES, 'name')

        // Initialize land
        for (let i = 0; i < this.boughtUpgrades['Forest Tile']; i++) {
            this.land.push(new ForestTile(this))
        }

        this.counters = [new Counter('money', () => this.money)]

        // Check if all UPGRADES of type automation have a corresponding automator programmed in
        this.UPGRADES.forEach(upgrade => {
            if (
                upgrade.category === CATEGORIES.automation &&
                !this.automators.find(automator => automator.upgradeName === upgrade.name)
            ) {
                console.error(`Automator for upgrade ${upgrade.name} is missing!`)
            }
        })

        // Load save data
        this.loadGame()

        // For the rest of the land, add empty tiles
        for (
            let i = this.land.length;
            i < this.boughtUpgrades['Extra Column'] * this.boughtUpgrades['Extra Row'];
            i++
        ) {
            this.land.push(new EmptyTile(this))
        }
    },
    mounted() {
        if (!this.stats.started) {
            this.showMessage(
                `Welcome to your land! You start out with one tile of forest land and ${INITIAL_SEEDS} seeds. Good luck!`
            )
            this.stats.started = true
        }
        this.startGameLoop()

        // Bind CTRL+S to saveGame
        document.addEventListener('keydown', e => {
            if (e.key === 's' && e.ctrlKey) {
                e.preventDefault()
                this.saveGame()
                this.showMessage('Game saved!')
            }
        })

        if (!this.settings.dark) {
            document.body.classList.remove('dark')
        }
    },
    methods: {
        showTest() {
            this.$refs.testModal.showModal()
        },
        closeTest() {
            this.$refs.testModal.close()
        },
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
            setInterval(this.saveGame, SAVE_INTERVAL * 1000)
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
                    this.money >= upgrade.baseCost * DEFAULT_UPGRADE_VISIBILITY_THRESHOLD &&
                    (upgrade.isVisible ? upgrade.isVisible(this) : true)
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
            if (this.settings.automation) {
                this.automators.forEach(automator => {
                    automator.run(this, elapsed)
                })
            }

            // Run calculators
            this.calculators.forEach(calculator => {
                this.calculated[calculator.name] = calculator.calculate(this, elapsed)
            })
        },
        registerTile(tileClass) {
            this.TILE_REVIVERS[tileClass.type] = tileClass
            if (tileClass.automators) {
                this.automators.push(...tileClass.automators)
            }
            if (tileClass.upgrades) {
                this.UPGRADES.push(...tileClass.upgrades)
            }
            if (tileClass.calculators) {
                this.calculators.push(...tileClass.calculators)
            }
            if (tileClass.resources) {
                tileClass.resources.forEach(r => {
                    this.resources[r.name] = r
                })
            }
        },
        setClickMode(mode) {
            this.clickMode = mode
            this.movingTileIdx = -1
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
            let upgrade = this.UPGRADES_INDEX[automator.upgradeName]
            let owned = this.boughtUpgrades[automator.upgradeName]
            const price = this.getUpgradeCostNum(upgrade, owned - 1)
            this.money += price
            this.stats.moneySpent -= price
            this.boughtUpgrades[automator.upgradeName] -= 1
        },
        incur(money) {
            if (this.money < money) {
                return false
            }
            this.money -= money
            this.stats.moneySpent += money
            return true
        },

        addTile(tile) {
            // Find first empty tile and replace it with the new tile
            const emptyTileIndex = this.land.findIndex(tile => tile instanceof EmptyTile)
            if (emptyTileIndex === -1) {
                console.error('No empty tile found to replace with new tile')
                return
            }
            this.land.splice(emptyTileIndex, 1, tile)
        },

        clickTile(tileModel) {
            if (this.DEBUG) {
                console.log('Clicked tile:', tileModel.tile)
            }
            const tile = tileModel.tile

            switch (this.clickMode) {
                case 'click':
                    tile.click(true)
                    break
                case 'sell': {
                    if (tile instanceof EmptyTile) {
                        this.showMessage('Cannot sell an empty tile!')
                        return
                    }
                    // Replace the tile with an empty tile in this.land
                    const index = this.land.indexOf(tile)
                    this.land.splice(index, 1, new EmptyTile(this))

                    // Gain some money as a consolation and to prevent soft-locking or infinite money
                    //  determine the lowest possible sell price of the cheapest tile (probably 'Forest Tile')
                    const tileUpgrades = this.UPGRADES.filter(upgrade => upgrade.tile).sort(
                        (a, b) => a.baseCost - b.baseCost
                    )
                    const cheapestTile = tileUpgrades[0]
                    let minPrice = cheapestTile.baseCost / (cheapestTile.costMultiplier * cheapestTile.initialOwned)
                    this.money += minPrice
                    tile.sell()
                    this.setClickMode('click')
                    break
                }
                case 'move': {
                    if (this.movingTileIdx === -1) {
                        this.movingTileIdx = this.land.indexOf(tile)
                        this.showMessage('Click another tile to swap with this one or click the same tile to cancel')
                    } else {
                        const movingTileTarget = this.land.indexOf(tile)
                        // Swap the tiles
                        const temp = this.land[movingTileTarget]
                        this.land[movingTileTarget] = this.land[this.movingTileIdx]
                        this.land[this.movingTileIdx] = temp
                        this.movingTileIdx = -1
                        this.setClickMode('click')
                    }
                    break
                }
                default:
                    console.error('Invalid click mode:', this.clickMode)
                    break
            }
        },

        toggleAutomation() {
            this.settings.automation = !this.settings.automation
            this.saveGame()
        },
        toggleDarkMode() {
            this.settings.dark = !this.settings.dark
            document.body.classList.toggle('dark', this.settings.dark)
            this.saveGame()
        },

        getTileStyle(tile) {
            const styleObj = {
                bgOpacity: 0,
                lineHeight: null,
                fontSizeM: 1,
                bgRgb: '0, 128, 0'
            }
            tile.getStyle(styleObj)
            return {
                backgroundColor: `rgba(${styleObj.bgRgb}, ${styleObj.bgOpacity})`,
                width: `${TILE_SIZE}px`,
                height: `${TILE_SIZE}px`,
                fontSize: `${TILE_SIZE * 0.75 * styleObj.fontSizeM}px`,
                lineHeight: styleObj.lineHeight ? `${styleObj.lineHeight}em` : null
            }
        },
        getTileProgressAltStyle(tile) {
            const health = tile.health
            if (health == null) {
                return {}
            }
            return {
                width: `${health * 100}%`
            }
        },

        getUpgradeCost(upgrade) {
            return this.getUpgradeCostNum(upgrade, this.boughtUpgrades[upgrade.name])
        },
        getUpgradeCostNum(upgrade, num = 1) {
            return upgrade.baseCost * Math.pow(upgrade.costMultiplier, num - upgrade.initialOwned)
        },
        buyUpgrade(upgrade) {
            if (!this.canBuyUpgrade(upgrade)) {
                return false
            }
            if (upgrade.max && this.boughtUpgrades[upgrade.name] >= upgrade.max) {
                return false
            }
            let cost = this.getUpgradeCost(upgrade)
            this.incur(cost)

            if (upgrade.resourceCosts) {
                // Incur for each resource cost
                for (let [resourceType, amount] of Object.entries(upgrade.resourceCosts)) {
                    this.resources[resourceType].incur(amount)
                }
            }

            // Special case for buying land
            switch (upgrade.name) {
                case 'Extra Column': {
                    const width = this.landSize[0]
                    const height = this.landSize[1]
                    // Add empty at the end of each row
                    // For instance if the land is 2x2, the empty tiles must be added at index 2 and 5
                    // If the land is 3x3, the empty tiles must be added at index 3, 6 and 9
                    for (let i = height - 1; i >= 0; i--) {
                        this.land.splice(width * (i + 1), 0, new EmptyTile(this))
                    }

                    break
                }
                case 'Extra Row':
                    for (let i = 0; i < this.landSize[0]; i++) {
                        this.land.push(new EmptyTile(this))
                    }
                    break
                case 'Win Game':
                    window.scrollTo(0, 0)
                    this.showMessage('Congratulations! You have won the prototype of the game!')
                    setTimeout(() => {
                        this.showMessage('You can continue playing if you want to. Check back later for updates!')
                    }, 5000)
                    break
            }

            this.boughtUpgrades[upgrade.name] += 1

            // If the upgrade has an onBuy function, call it
            if (upgrade.onBuy) {
                upgrade.onBuy(this)
            }
        },
        hasUpgrade(upgradeName) {
            return this.boughtUpgrades[upgradeName] > 0
        },
        hasRoomForTile() {
            return this.land.some(tile => tile instanceof EmptyTile)
        },
        canBuyUpgrade(upgrade) {
            if (upgrade.tile && !this.hasRoomForTile()) {
                return false
            }
            if (upgrade.resourceCosts) {
                for (let [resourceType, amount] of Object.entries(upgrade.resourceCosts)) {
                    if (this.resources[resourceType].owned < amount) {
                        return false
                    }
                }
            }
            return this.money >= this.getUpgradeCost(upgrade)
        },
        toggleAutomator(automator) {
            automator.enabled = !automator.enabled
        },

        saveGame() {
            const saveData = {
                money: this.money,
                resources: {},
                boughtUpgrades: this.boughtUpgrades,
                land: this.land,
                startTime: this.startTime,
                stats: this.stats,
                settings: this.settings,
                automators: this.automators
            }
            Object.values(this.resources).forEach(resource => {
                saveData.resources[resource.name] = resource.getSaveData()
            })
            if (this.DEBUG) {
                console.log('Saving game:', saveData)
            }
            localStorage.setItem('saveData', JSON.stringify(saveData))
        },
        loadGame() {
            try {
                const saveData = JSON.parse(localStorage.getItem('saveData'))
                if (!saveData) {
                    return
                }
                this.money = saveData.money
                Object.values(this.resources).forEach(resource => {
                    resource.loadSaveData(saveData.resources[resource.name])
                })
                this.land.length = 0
                saveData.land.forEach(tileData => {
                    const tileClass = this.TILE_REVIVERS[tileData.tileType]
                    if (!tileClass) {
                        console.error('No reviver found for tile type:', tileData.tileType)
                        return
                    }
                    const tileInstance = new tileClass(this)
                    // Set properties from tileData into tileInstance
                    Object.assign(tileInstance, tileData)
                    this.land.push(tileInstance)
                })
                Object.assign(this.boughtUpgrades, saveData.boughtUpgrades)
                Object.assign(this.stats, saveData.stats)
                Object.assign(this.settings, saveData.settings)
                this.automators.forEach(automator => {
                    // Find automator in saveData.automators and assign its properties to the automator
                    const savedAutomator = saveData.automators?.find(
                        savedAutomator => savedAutomator.upgradeName === automator.upgradeName
                    )
                    if (savedAutomator) {
                        Object.assign(automator, savedAutomator)
                    }
                })
                this.startTime = new Date(saveData.startTime)
            } catch (e) {
                // Clear corrupted save data
                localStorage.removeItem('saveData')
                console.error('Error loading save data:', e)
                this.showMessage('Error loading save data. Save data cleared.')
            }
        },
        resetGame() {
            if (confirm('Are you sure you want to reset the game?')) {
                localStorage.removeItem('saveData')
                location.reload()
            }
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
        sellLevel() {
            return this.boughtUpgrades['Wooden Finger']
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
                    classes: {
                        ...tile.classes,
                        moving: this.movingTileIdx === this.land.indexOf(tile)
                    },
                    tooltip: tile.tooltip
                })
            })
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
            return this.totalResourceEarnings - this.stats.moneySpent
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
            // For anything else, add it if it has more than 0 owned
            Object.values(this.resources).forEach(resource => {
                if (!result.includes(resource) && resource.totalOwned > 0) {
                    result.push(resource)
                }
            })
            return result
        },
        automatorsView() {
            // Filter out automators that are not yet bought
            return this.automators
                .filter(automator => this.boughtUpgrades[automator.upgradeName] > 0)
                .map(automator => ({
                    ...automator,
                    automator,
                    displayName: this.UPGRADES_INDEX[automator.upgradeName].displayName ?? automator.upgradeName,
                    icon: GROUP_ICONS[this.UPGRADES_INDEX[automator.upgradeName].group]
                }))
        },
        upgradesView() {
            return this.UPGRADES.filter(upgrade => {
                if (upgrade.max && this.boughtUpgrades[upgrade.name] >= upgrade.max) {
                    return false
                }
                return this.visibleUpgrades.includes(upgrade.name)
            })
                .map(upgrade => {
                    return {
                        ...upgrade,
                        cost: Math.ceil(this.getUpgradeCost(upgrade)),
                        blurred: !this.unblurredUpgrades.includes(upgrade.name),
                        canBuy: this.canBuyUpgrade(upgrade),
                        owned: this.boughtUpgrades[upgrade.name] || 0,
                        resourcesNeeded: Object.entries(upgrade.resourceCosts || {}).map(([key, amount]) => {
                            return {
                                type: key,
                                amount,
                                icon: this.resources[key].icon
                            }
                        }),
                        groupIcon: GROUP_ICONS[upgrade.group]
                    }
                })
                .sort((a, b) => a.baseCost - b.baseCost)
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
                    groupTitle: CATEGORY_TITLES[category],
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
