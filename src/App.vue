<script lang="ts">
import Windmill from './components/Windmill.vue'
import Tile from './tiles/Tile'
import { Counter } from './Counter'
/** @ts-ignore */
import { DonutTile } from './tiles/DonutTile'
import { EmptyTile } from './tiles/EmptyTile'
import { ForestTile, INITIAL_SEEDS } from './tiles/ForestTile'
import { KilnTile } from './tiles/KilnTile'
import { MineTile } from './tiles/MineTile'
import { PondTile } from './tiles/PondTile'
import { Resource } from './Resource'
import { GROUP_ICONS, CATEGORY_TITLES, CATEGORIES, CATEGORIES_ORDER, MODALS, RESOURCE_TYPES } from './consts'
import { UPGRADES } from './upgrades'
import { bigNum, decode, encode, humanTime, makeIndex } from './utils'
import { Upgrade } from './Upgrade'
import { Calculator } from './Calculator'
import { Automator } from './Automator'
import { WindmillTile } from './tiles/WindmillTile'
import { markRaw } from 'vue'

/** @ts-ignore */
globalThis.haltAnimation = false

const DEBUG = false
const FPS = 30
const FRAME_TIME = 1 / FPS
const MIN_CATCHUP_STEPS = 2
const MAX_CATCHUP_STEPS = (60 * 5) / FRAME_TIME // 5 minutes = 9000 steps
const SAVE_INTERVAL = 30 // Save every 60 seconds

const TILE_SIZE = 64

const DEFAULT_UPGRADE_VISIBILITY_THRESHOLD = 0.25
const DEFAULT_UPGRADE_BLUR_THRESHOLD = 0.5

const INITIAL_MONEY = 0

interface UpgradeView extends Upgrade {
    cost: number
    blurred: boolean
    canBuy: boolean
    owned: number
    resourcesNeeded: { type: string; amount: number; icon: string }[]
    groupIcon: string
}

export default {
    components: {
        Windmill
    },
    data() {
        return {
            DEBUG,
            UPGRADES: [] as Upgrade[],
            UPGRADES_INDEX: {} as Record<string, Upgrade>,
            TILE_REVIVERS: {} as Record<string, typeof Tile>,
            MODALS,

            now: Date.now(),
            startTime: Date.now(),
            lastUpdate: Date.now(),

            land: [] as Tile[],
            resources: {} as Record<string, Resource>,
            automators: [] as Automator[],
            calculators: [] as Calculator[],
            calculated: {} as Record<string, any>,
            counters: [] as Counter[],
            boughtUpgrades: {} as Record<string, number>,
            visibleUpgrades: [] as string[],
            unblurredUpgrades: [] as string[],
            adjacentTileCache: new WeakMap(),
            clickMode: 'click',
            movingTileIdx: -1,
            message: '',
            messageFade: 0,
            showEarnings: false,
            modalObj: null as any,

            // Vars
            money: INITIAL_MONEY,

            // Stats
            stats: {
                started: false,
                moneySpent: 0,
                treesChopped: 0,
                saplingsKilled: 0,
                luckySeeds: 0,
                luckyTrees: 0,
                resourcesMined: 0,
                tunnelsDug: 0,
                minesOwned: 0,
                fishCaught: 0,
                fishMissed: 0,
                fishRarities: 0,
                fishTank: [],
                resourcesBaked: 0,
                landClicks: 0,
                won: false,
                winTime: null as number | null,
                winLandClicks: 0,
                restarts: 0
            },

            // Settings
            settings: {
                automation: true,
                dark: true,
                tileSizeMultiplier: 1
            }
        }
    },
    created() {
        this.UPGRADES = markRaw([...UPGRADES])

        // Initialize resources
        this.resources = {
            [RESOURCE_TYPES.energy]: new Resource(RESOURCE_TYPES.energy, {
                displayNameSingular: 'Energy',
                displayNamePlural: 'Energy',
                icon: '⚡',
                basePrice: 0,
                storageBaseSize: 100000,
                initialOwned: 0,
                canOverflow: false,
                canTrade: false,
                unit: 'J'
            })
        }

        // Initialize Tile types
        this.registerTile(EmptyTile)
        this.registerTile(ForestTile)
        this.registerTile(MineTile)
        this.registerTile(PondTile)
        //this.registerTile(DonutTile)
        //this.registerTile(MonsterTile)
        this.registerTile(KilnTile)
        this.registerTile(WindmillTile)

        // Initialize bought upgrades obj
        this.UPGRADES.forEach(upgrade => {
            this.boughtUpgrades[upgrade.name] = upgrade.initialOwned ?? 0
        })
        this.UPGRADES_INDEX = markRaw(makeIndex(this.UPGRADES, 'name'))

        // Initialize land
        for (let i = 0; i < this.boughtUpgrades['Forest Tile']; i++) {
            this.land.push(new ForestTile(this as any))
        }

        this.counters = [
            new Counter('money', () => this.money),
            new Counter('energy', () => this.resources.energy.owned)
        ]

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
            this.land.push(new EmptyTile(this as any))
        }

        this.onLandChange()
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
        num(n: number) {
            if (typeof n !== 'number') return n
            return bigNum(n)
        },
        numf(n: number, numDecimals = 0) {
            return n.toLocaleString(undefined, {
                minimumFractionDigits: numDecimals,
                maximumFractionDigits: numDecimals
            })
        },
        showMessage(message: string) {
            console.log('Message:', message)
            this.message = message
            this.messageFade = 1
        },
        showModal(modal: string, obj: any) {
            //this.$refs[modal].showModal()
            (this.$refs[modal] as HTMLDialogElement).showModal()
            this.modalObj = obj
        },
        closeModal(modal: string) {
            (this.$refs[modal] as HTMLDialogElement).close()
        },
        startGameLoop() {
            setInterval(this.gameLoop, 1000 / FPS)
            setInterval(this.perSecond, 1000)
            setInterval(this.saveGame, SAVE_INTERVAL * 1000)
        },
        megaElapse(mins = 1) {
            // Elapse time by 1 min
            this.updateGame(mins * 60)
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
        updateGame(elapsed: number) {
            /** @ts-ignore */
            globalThis.haltAnimation = false

            // If elapsed is massive, the game was paused maybe due to hibernation or tab switch
            // In that case, animations caused by setTimeout should not be triggered this update
            if (elapsed > 10) {
                console.warn('Massive elapsed time detected, halting animations. Elapsed seconds:', elapsed)
                /** @ts-ignore */
                globalThis.haltAnimation = true
            }

            this.messageFade -= elapsed / 10
            if (this.messageFade < 0) {
                this.messageFade = 0
            }

            // If elapsed is >= FRAME_TIME, we need to update the tile multiple times in chunks of FPS
            // This is to catch up on the time that was lost when the game was "paused"
            // To prevent from CPU hanging too long, we have to Math.min the steps to about 15 minutes

            let steps = elapsed / FRAME_TIME
            if (steps > MAX_CATCHUP_STEPS) {
                console.warn('Massive steps detected. Steps:', steps, 'Reducing to:', MAX_CATCHUP_STEPS)
                steps = MAX_CATCHUP_STEPS
            } else if (steps <= MIN_CATCHUP_STEPS) {
                steps = 1 // Don't bother with small steps as it will only cause jitter
            }
            let land = this.land;
            let automators = this.automators;
            let isAutomation = this.settings.automation;
            let calculators = this.calculators;
            let simulatedElapsed = FRAME_TIME
            for (let i = 0; i < steps; i++) {

                // Update tiles                
                for (const tile of land) {
                    tile.stageP = 0
                    tile.update(simulatedElapsed)
                    tile.stageP = Math.min(1, tile.stageP)
                }

                // Run automators
                if (isAutomation) {
                    for (const a of automators) {
                        a.run(this as any, simulatedElapsed)
                    }
                }

                // Run calculators
                for (const c of calculators) {
                    this.calculated[c.name] = c.calculate(this as any)
                }
            }

            // Determine if upgrade should be made visible. Once visible, it should stay visible.
            // An upgrade should become visible if the player has a certain % of the cost of the upgrade
            this.UPGRADES.forEach(upgrade => {
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


        },
        registerTile(tileClass: typeof Tile) {
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
                    if (!r.name) {
                        console.error('Resource name not defined for', r, 'in', tileClass)
                    }
                    this.resources[r.name] = r
                })
            }
        },
        setClickMode(mode: string) {
            // if click mode already is 'mode', set it to 'click'
            if (this.clickMode === mode) {
                mode = 'click'
            }
            this.clickMode = mode
            this.movingTileIdx = -1
        },
        sellResource(resource: Resource, amount = 0) {
            if (amount === 0) amount = resource.sellNum
            this.money += resource.sell(amount)
        },
        sellAutomator(automator: Automator) {
            // Get the cost of the current automator
            let upgrade = this.UPGRADES_INDEX[automator.upgradeName]
            let owned = this.boughtUpgrades[automator.upgradeName]
            const price = this.getUpgradeCostNum(upgrade, owned - 1)
            this.money += price
            this.stats.moneySpent -= price // You get back all the money you spent on the automator!
            this.boughtUpgrades[automator.upgradeName] -= 1
        },
        buyAutomator(automator: Automator) {
            // Get the cost of the next automator
            let upgrade = this.UPGRADES_INDEX[automator.upgradeName]
            let owned = this.boughtUpgrades[automator.upgradeName]
            const price = this.getUpgradeCostNum(upgrade, owned)
            if (!this.incur(price)) return
            this.boughtUpgrades[automator.upgradeName] += 1
        },
        incur(money: number) {
            if (this.money < money) {
                return false
            }
            this.money -= money
            this.stats.moneySpent += money
            return true
        },

        addTile(tile: Tile) {
            // Find first empty tile and replace it with the new tile
            const emptyTileIndex = this.land.findIndex(tile => tile instanceof EmptyTile)
            if (emptyTileIndex === -1) {
                console.error('No empty tile found to replace with new tile')
                return
            }
            this.land.splice(emptyTileIndex, 1, tile)
            this.onLandChange()
        },

        onLandChange() {
            // Clear the adjacent tile cache
            this.adjacentTileCache = new WeakMap()

            // Call onLandChange for each tile
            this.land.forEach(tile => {
                tile.onLandChange()
            })
        },

        clickTile(tileModel: { tile: Tile }) {
            if (this.DEBUG) {
                console.log('Clicked tile:', tileModel.tile)
            }
            const tile = tileModel.tile

            switch (this.clickMode) {
                case 'click':
                    this.stats.landClicks++
                    tile.click(true)
                    break
                case 'sell': {
                    if (tile instanceof EmptyTile) {
                        this.showMessage('Cannot sell an empty tile!')
                        return
                    }
                    // Replace the tile with an empty tile in this.land
                    const index = this.land.indexOf(tile)
                    this.land.splice(index, 1, new EmptyTile(this as any))

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
                    this.onLandChange()
                    break
                }
                case 'move': {
                    if (this.movingTileIdx === -1) {
                        this.movingTileIdx = this.land.indexOf(tile)
                        this.showMessage('Click another tile to swap with this one or click the same tile to cancel')
                    } else {
                        const movingTileTarget = this.land.indexOf(tile)
                        if (movingTileTarget === this.movingTileIdx) {
                            this.movingTileIdx = -1
                            this.showMessage('Move tile cancelled')
                            this.setClickMode('click')
                            break
                        }
                        // Swap the tiles
                        const temp = this.land[movingTileTarget]
                        this.land[movingTileTarget] = this.land[this.movingTileIdx]
                        this.land[this.movingTileIdx] = temp
                        this.movingTileIdx = -1
                        this.onLandChange()
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

        getTileStyle(tile: Tile) {
            const styleObj = {
                bgOpacity: 0,
                fontSizeM: 1,
                bgRgb: '0, 128, 0'
            }
            tile.getStyle(styleObj)
            return {
                backgroundColor: `rgba(${styleObj.bgRgb}, ${styleObj.bgOpacity})`,
                width: `${this.tileSize}px`,
                height: `${this.tileSize}px`,
                fontSize: `${this.tileSize * 0.75 * styleObj.fontSizeM}px`
            }
        },
        getTileProgressAltStyle(tile: Tile) {
            const health = tile.health
            if (health == null) {
                return {}
            }
            return {
                width: `${health * 100}%`
            }
        },
        getAdjacentTiles(tile: Tile) {
            if (this.adjacentTileCache.has(tile)) {
                return this.adjacentTileCache.get(tile)
            }
            // Gets the 4 adjacent tiles to the given tile
            const idx = this.land.indexOf(tile)
            const width = this.landSize[0]
            const height = this.landSize[1]
            const x = idx % width
            const y = Math.floor(idx / width)
            const result = []
            if (x > 0) {
                result.push(this.land[idx - 1])
            }
            if (x < width - 1) {
                result.push(this.land[idx + 1])
            }
            if (y > 0) {
                result.push(this.land[idx - width])
            }
            if (y < height - 1) {
                result.push(this.land[idx + width])
            }
            this.adjacentTileCache.set(tile, result)
            return result
        },

        getUpgradeCost(upgrade: Upgrade) {
            return this.getUpgradeCostNum(upgrade, this.boughtUpgrades[upgrade.name])
        },
        getUpgradeCostNum(upgrade: Upgrade, num = 1) {
            return upgrade.baseCost * Math.pow(upgrade.costMultiplier, num - upgrade.initialOwned)
        },
        buyUpgrade(upgrade: Upgrade) {
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
                        this.land.splice(width * (i + 1), 0, new EmptyTile(this as any))
                    }
                    this.onLandChange()
                    break
                }
                case 'Extra Row':
                    for (let i = 0; i < this.landSize[0]; i++) {
                        this.land.push(new EmptyTile(this as any))
                    }
                    this.onLandChange()
                    break
                case 'Win Game':
                    window.scrollTo(0, 0)
                    this.showMessage('Congratulations! You have won the prototype of the game!')
                    setTimeout(() => {
                        this.showMessage('You can continue playing if you want to. Check back later for updates!')
                    }, 5000)
                    this.stats.won = true
                    this.stats.winTime = +new Date() - this.startTime
                    this.stats.winLandClicks = this.stats.landClicks
                    break
            }

            this.boughtUpgrades[upgrade.name] += 1

            // If the upgrade has an onBuy function, call it
            if (upgrade.onBuy) {
                upgrade.onBuy(this as any)
            }
        },
        hasUpgrade(upgradeName: string) {
            return this.boughtUpgrades[upgradeName] > 0
        },
        hasRoomForTile() {
            return this.land.some(tile => tile instanceof EmptyTile)
        },
        canBuyUpgrade(upgrade: Upgrade) {
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
        toggleAutomator(automator: Automator) {
            automator.enabled = !automator.enabled
        },

        toggleTileSize() {
            this.settings.tileSizeMultiplier = this.settings.tileSizeMultiplier === 1 ? 2 : 1
        },

        saveGame() {
            try {
                const saveData = {
                    money: this.money,
                    resources: {} as Record<string, any>,
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
                localStorage.setItem('saveData', encode(JSON.stringify(saveData)))
            } catch (e) {
                console.error('Error saving game:', e)
                this.showMessage('Error saving game. Please try again.')
            }
        },
        loadGame() {
            try {
                const saveDataStr = localStorage.getItem('saveData')
                if (!saveDataStr) {
                    return
                }
                console.log('Loading save data')
                const isOld = saveDataStr?.startsWith('{')
                const saveData = JSON.parse(isOld ? saveDataStr : decode(saveDataStr))
                if (!saveData) {
                    return
                }
                this.money = saveData.money ?? this.money
                if (saveData.resources) {
                    Object.values(this.resources).forEach(resource => {
                        resource.loadSaveData(saveData.resources[resource.name])
                    })
                }
                if (saveData.land) {
                    this.land.length = 0
                }
                saveData.land?.forEach((tileData: Tile) => {
                    const tileClass = this.TILE_REVIVERS[tileData.tileType]
                    if (!tileClass) {
                        console.error('No reviver found for tile type:', tileData.tileType)
                        return
                    }
                    const tileInstance = new tileClass(this as any, tileData.tileType) // Note: 2nd param is not actually used for derived classes of Tile, but this keeps TS happy
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
                        (savedAutomator: Automator) => savedAutomator.upgradeName === automator.upgradeName
                    )
                    if (savedAutomator) {
                        Object.assign(automator, savedAutomator)
                    }
                })
                this.startTime = saveData.startTime ? saveData.startTime : this.startTime
            } catch (e) {
                // Clear corrupted save data
                localStorage.removeItem('saveData')
                console.error('Error loading save data:', e)
                this.showMessage('Error loading save data. Save data cleared.')
            }
        },
        resetGame() {
            if (confirm('Are you sure you want to reset the game?')) {
                let saveData = {
                    stats: {
                        restarts: this.stats.restarts + 1
                    }
                }
                localStorage.setItem('saveData', encode(JSON.stringify(saveData)))
                location.reload()
            }
        },

        setDebug() {
            this.DEBUG = !this.DEBUG
            // Give 1 of each resource
            Object.values(this.resources).forEach(resource => {
                resource.gain(1)
            })
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
        timeTaken() {
            if (!this.stats.won || !this.stats.winTime) {
                return 'N/A'
            }
            let winTimeInMinutes = Math.round(this.stats.winTime / 60_000)
            return humanTime(this.stats.winTime) + ` (${winTimeInMinutes} min)`
        },
        sellLevel() {
            return this.boughtUpgrades['Wooden Finger']
        },
        landSize() {
            return [this.boughtUpgrades['Extra Column'], this.boughtUpgrades['Extra Row']]
        },
        landLength() {
            return this.landSize[0] * this.landSize[1]
        },
        landStyle() {
            return {
                width: `${this.landSize[0] * this.tileSize}px`,
                height: `${this.landSize[1] * this.tileSize}px`
            }
        },
        landView() {
            return this.land.map(tile => {
                return {
                    type: tile.type,
                    tile,
                    style: this.getTileStyle(tile),
                    icon: tile.icon,
                    iconStyle: tile.iconStyle,
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
                }
            })
        },
        totalResourceEarnings() {
            return this.resourcesView.reduce((acc, resource) => acc + resource.earnings, 0)
        },
        totalResourcesOwned() {
            return this.resourcesView.reduce((acc, resource) => acc + resource.totalOwned, 0)
        },
        totalResourcesSold() {
            return this.resourcesView.reduce((acc, resource) => acc + resource.sold, 0)
        },
        totalResourcesIncurred() {
            return this.resourcesView.reduce((acc, resource) => acc + resource.incurred, 0)
        },
        totalProfit() {
            return this.totalResourceEarnings - this.stats.moneySpent
        },

        perS() {
            // Return obj with name, current, delta
            const result = {} as Record<string, number>
            this.counters.forEach(counter => {
                result[counter.name] = counter.delta
            })
            return result
        },

        resourcesView() {
            const result = [] as Resource[]

            Object.values(this.resources).forEach(resource => {
                if (!result.includes(resource) && resource.totalOwned > 0) {
                    result.push(resource)
                }
            })
            return result
        },
        resourcesViewSortedByEarnings() {
            return [...this.resourcesView]
                .filter(resource => resource.canTrade)
                .sort((a, b) => b.earnings - a.earnings)
        },
        automatorsView() {
            // Filter out automators that are not yet bought
            return this.automators
                .filter(automator => this.boughtUpgrades[automator.upgradeName] > 0)
                .map(automator => {
                    const upgrade = this.UPGRADES_INDEX[automator.upgradeName]
                    return {
                        ...automator,
                        automator,
                        upgrade,
                        canBuy: this.canBuyUpgrade(upgrade),
                        buyPrice: Math.ceil(this.getUpgradeCost(upgrade)),
                        sellPrice: Math.ceil(
                            this.getUpgradeCostNum(upgrade, this.boughtUpgrades[automator.upgradeName] - 1)
                        ),
                        displayName: upgrade.displayName ?? automator.upgradeName,
                        description: upgrade.description ?? '',
                        icon: GROUP_ICONS[upgrade.group]
                    }
                })
        },
        anyAutomatorNoPower() {
            if (this.automators.length === 0 || !this.settings.automation) return false
            return this.automators.some(automator => automator.enabled && automator.noPower)
        },
        upgradesView(): UpgradeView[] {
            return this.UPGRADES.filter(upgrade => {
                if (upgrade.max && this.boughtUpgrades[upgrade.name] >= upgrade.max) {
                    return false
                }
                const isVisibleByLogic = upgrade.isVisible ? upgrade.isVisible(this as any) : true
                return isVisibleByLogic && this.visibleUpgrades.includes(upgrade.name)
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
            const upgradesByCategory = {} as Record<string, UpgradeView[]>
            this.upgradesView.forEach(upgrade => {
                if (!upgradesByCategory[upgrade.category]) {
                    upgradesByCategory[upgrade.category] = []
                }
                upgradesByCategory[upgrade.category].push(upgrade)
            })

            return Object.entries(upgradesByCategory)
                .map(([category, items]) => {
                    return {
                        groupName: category,
                        groupTitle: CATEGORY_TITLES[category],
                        items
                    }
                })
                .sort((a, b) => CATEGORIES_ORDER.indexOf(a.groupName) - CATEGORIES_ORDER.indexOf(b.groupName))
        },
        messageStyle() {
            return {
                opacity: this.messageFade
            }
        },

        tileSize() {
            return this.settings.tileSizeMultiplier * TILE_SIZE
        }
    }
}
</script>

<template>
    <h5 @dblclick="setDebug"><i class="fa-solid fa-seedling"></i> Supply Chain Prototype</h5>

    <div class="theme-toggle hover-opacity">
        <a @click="toggleDarkMode" class="btn-link" title="Switch between light / dark mode">
            <span v-if="settings.dark">🌙</span>
            <span v-else>☀️</span>
        </a>
    </div>
    <div v-if="DEBUG">
        <button @click="megaElapse(1)" class="btn btn-sm btn-danger">Mega Elapse 1</button>
        <button @click="megaElapse(2)" class="btn btn-sm btn-danger">Mega Elapse 2</button>
        <button @click="megaElapse(5)" class="btn btn-sm btn-danger">Mega Elapse 5</button>
        <button @click="megaElapse(10)" class="btn btn-sm btn-danger">Mega Elapse 10</button>
        <button @click="megaElapse(60)" class="btn btn-sm btn-danger">Mega Elapse 60</button>
    </div>
    <div class="row">
        <div class="message" v-if="message" :style="messageStyle">{{ message }}</div>
        <div class="col-6">
            <div :style="landStyle" class="land" :class="'clickmode-' + clickMode">
                <div v-for="tile in landView" :style="tile.style" class="land-tile" :class="tile.classes"
                    :title="tile.tooltip" @click="clickTile(tile)">
                    <span class="wiggle-target grow-bounce-target bounce-down-target">
                        <component v-if="tile.tile.component" :is="tile.tile.component" :tile="tile.tile"
                            :width="tileSize" :height="tileSize" />
                        <span v-else class="icon" :style="tile.iconStyle">{{ tile.icon }}</span>
                    </span>
                    <span v-if="tile.tile?.fail" class="fail fade-out">❌</span>
                    <div class="progress" :style="tile.progressStyle"></div>
                    <div class="progress progress-alt" :style="tile.progressAltStyle"></div>
                    <div class="level" v-if="tile.level != null">{{ tile.level }}</div>
                    <div class="mini-icon top-left" v-if="tile.tile?.iconTopLeft">{{ tile.tile?.iconTopLeft }}</div>
                    <div class="mini-icon top-right" v-if="tile.tile?.iconTopRight">{{ tile.tile?.iconTopRight }}
                    </div>
                    <div class="mini-icon bottom-left" v-if="tile.tile?.iconBottomLeft">
                        {{ tile.tile?.iconBottomLeft }}</div>
                    <div class="mini-icon bottom-right" v-if="tile.tile?.iconBottomRight">
                        {{ tile.tile?.iconBottomRight }}</div>
                </div>
                <div class="mt-3 text-center toolbar" :class="{ 'hover-opacity': clickMode === 'click' }"
                    v-if="hasUpgrade('Bulldozer')">
                    <div class="btn-group">
                        <button @click="setClickMode('click')" :class="{ 'active': clickMode === 'click' }"
                            title="Click (default)" class="btn btn-sm btn-tool"><i
                                class="fa-solid fa-arrow-pointer"></i></button>
                        <button @click="setClickMode('move')" :class="{ 'active': clickMode === 'move' }"
                            title="Move tile" class="btn btn-sm btn-tool"><i
                                class="fa-solid fa-up-down-left-right"></i></button>
                        <button @click="setClickMode('sell')" :class="{ 'active': clickMode === 'sell' }"
                            title="Make a tile empty" class="btn btn-sm btn-tool"><i
                                class="fa-solid fa-trash-can"></i></button>
                    </div>
                </div>
            </div>

            <div v-if="stats.won" class="text-center mb-5">
                <h1>You Win!</h1>
                <p>Time taken: {{ timeTaken }}</p>
                <p>Total tile clicks: {{ num(stats.winLandClicks) }}</p>
                <p>
                    <button @click="resetGame" class="btn btn-sm btn-danger">Restart</button>
                </p>
            </div>

            <h5 class="pl-1">
                <div @click="DEBUG && (money += 1, money *= 10)"><strong>$</strong>&nbsp; {{ num(money) }}</div>
                <div v-if="automatorsView.length > 0" class="small text-muted">
                    Money p/s: $ {{ num(perS.money) }}
                </div>
                <div v-if="resources.energy.totalOwned > 0" class="small" @click="DEBUG && resources.energy.incur(10)"
                    :title="perS.energy < 0.001 ? `You are using more energy than you're producing!` : ''"
                    :class="{ 'text-muted': true }">
                    Energy p/s: {{ numf(perS.energy, 2) }}
                    <i v-if="anyAutomatorNoPower" class="fa-solid fa-battery-empty text-danger blink"></i>
                </div>
            </h5>

            <!-- Resource stats -->
            <table>
                <tr v-for="r in resourcesView">
                    <td class="text-center">{{ r.icon }}</td>
                    <td @click="e => DEBUG && (e.shiftKey ? r.flush() : r.gain(e.ctrlKey ? 1 : r.storageSize))">
                        <span :class="{ 'text-warning': r.owned == r.storageSize }">
                            <span>{{ r.displayNamePlural }}: {{ num(r.owned) }} / {{ num(r.storageSize) }}</span>
                            <span v-if="r.canOverflow && r.lost > 0" class="ml-3 text-danger"
                                :title="`Lost ${r.displayNamePlural.toLowerCase()}: caused by not having enough storage`">
                                {{ num(-r.lost) }}</span>
                        </span>
                    </td>
                    <td>
                        <div v-if="r.canTrade">
                            <button @click="sellResource(r, 1)" :disabled="!r.any" class="btn-xs btn-sell-resource">
                                Sell 1 <span class="text-success">+ $ {{ num(r.price) }}</span>
                            </button>
                            <button @click="sellResource(r, 10)" :disabled="!r.any" class="btn-xs btn-sell-resource"
                                v-if="sellLevel > 0">
                                Sell 10 <span class="text-success">+ $ {{ num(r.sellPrice(10)) }}</span>
                            </button>
                            <button @click="sellResource(r, 100)" :disabled="!r.any" class="btn-xs btn-sell-resource"
                                v-if="r.storageSize >= 100 && sellLevel > 1">
                                Sell 100 <span class="text-success">+ $ {{ num(r.sellPrice(100)) }}</span>
                            </button>
                            <button @click="sellResource(r, r.owned)" :disabled="!r.any"
                                class="btn-xs btn-sell-resource" v-if="sellLevel > 2">
                                Sell all <span class="text-success">+ $ {{ num(r.sellPrice(r.owned)) }}</span>
                            </button>
                        </div>
                    </td>
                </tr>
            </table>

            <!-- Resource sell buttons -->
            <div class="mt-4" v-if="false">
                <button v-for="r in resourcesView" @click="sellResource(r)" :disabled="!r.any">
                    Sell {{ r.sellNum > 1 ? r.sellNum : '' }} {{ r.sellNumDisplayName }} {{ r.icon }}<br>
                    <small class="text-success">+ {{ num(r.sellNumPrice) }}</small>
                </button>
            </div>

            <!-- Automators -->
            <div class="mt-4">
                <!-- All automation toggle -->
                <div v-if="automatorsView.length > 1" :class="{ 'text-muted': !settings.automation }">
                    <button @click="toggleAutomation" type="button" class="btn-sm btn-toggle-automator"
                        title="Click to toggle Automation">
                        {{ settings.automation ? 'ON' : 'OFF' }}
                    </button>
                    All Automation
                </div>
                <table>
                    <tr v-for="a in automatorsView">
                        <td>
                            <button @click="toggleAutomator(a.automator)" type="button"
                                class="btn-xs btn-toggle-automator" :title="`Every ${(1 / a.speed).toFixed(1)}s`">
                                {{ a.enabled && settings.automation ? 'ON' : 'OFF' }}
                                <span class="progress"
                                    :style="{ width: (a.speed < 5 ? (a.saturation * 100) : 100) + '%' }"></span>
                            </button>
                        </td>
                        <td :class="{ 'text-muted': !a.enabled || !settings.automation }">
                            <i v-if="a.noPower" class="fa-solid fa-battery-empty" :class="{
                                'blink': a.enabled && settings.automation,
                                'text-danger': a.enabled && settings.automation
                            }" title="No power"></i>
                            <span :title="a.description">
                                {{ a.icon }} {{ a.displayName }}
                            </span>
                        </td>
                        <td class="px-3 text-right font-weight-bold" title="Owned">{{ num(boughtUpgrades[a.upgradeName])
                            }}</td>
                        <td class="text-right" title="Energy usage">{{ a.powerUsage }}W</td>
                        <td><button @click="sellAutomator(a)" type="button" :title="`$ ${num(a.sellPrice)}`"
                                class="btn-xs btn-sell-automator">Sell
                                1</button>
                            <button @click="buyAutomator(a)" :disabled="!a.canBuy" :title="`$ ${num(a.buyPrice)}`"
                                type="button" class="btn-xs btn-buy-automator">Buy
                                1 - $ {{ num(a.buyPrice) }}</button>
                        </td>
                    </tr>
                </table>
            </div>

            <div class="mt-5 selectable">
                <h5>Statistics</h5>
                <div class="mb-3">
                    Time played: {{ timeSinceStart }}
                </div>
                <div v-if="stats.restarts > 0">
                    Restarts: {{ num(stats.restarts) }}
                </div>
                <div>
                    Trees chopped: {{ num(stats.treesChopped) }}
                </div>
                <div v-if="stats.saplingsKilled > 0" title="You felt the need to kill saplings.">
                    Saplings killed: {{ num(stats.saplingsKilled) }}
                </div>
                <div v-if="stats.luckySeeds > 0" :title="`Lucky seed chance is ${100 * calculated.luckySeedChance}%`">
                    Lucky seeds: {{ num(stats.luckySeeds) }}
                </div>
                <div v-if="stats.luckyTrees > 0">
                    Lucky trees: {{ num(stats.luckyTrees) }}
                </div>
                <div v-if="stats.minesOwned > 0" class="mt-3">
                    Mines opened: {{ num(stats.minesOwned) }}
                </div>
                <div v-if="stats.resourcesMined > 0">
                    Resources mined: {{ num(stats.resourcesMined) }}
                </div>
                <div v-if="stats.tunnelsDug > 0">
                    Tunnels dug: {{ num(stats.tunnelsDug) }}
                </div>
                <div v-if="stats.fishCaught > 0" class="mt-3">
                    <span :title="`Rare fish chance sequence is ${100 * calculated.rareFishLuck}%`">Fish caught: {{
                        num(stats.fishCaught) }}</span>
                    <div v-if="stats.fishTank.length > 0">
                        <span v-for="i in stats.fishTank" class="mr-3">{{ i[0] }} {{ i[1] }}</span>
                    </div>
                </div>
                <div v-if="stats.fishMissed > 0">
                    Fish missed: {{ num(stats.fishMissed) }}
                </div>
                <div v-if="stats.fishRarities > 0">
                    Rare pond finds: {{ num(stats.fishRarities) }}
                </div>

                <div v-if="stats.resourcesBaked > 0" class="mt-3">
                    Resources baked: {{ num(stats.resourcesBaked) }}
                </div>

            </div>
            <!-- Earnings report -->
            <div class="mt-5">
                <a v-if="hasUpgrade('Ledger')" @click="showEarnings = !showEarnings" class="btn btn-sm btn-secondary">
                    {{ showEarnings ? 'Close' : 'Open' }} ledger</a>
                <table class="table table-sm table-striped" v-if="showEarnings">
                    <tr>
                        <th>Resource</th>
                        <th class="text-right">Owned</th>
                        <th class="text-right">Sold</th>
                        <th class="text-right">Used</th>
                        <th class="text-right">Price</th>
                        <th class="text-right">Earnings</th>
                    </tr>
                    <tr v-for="r in resourcesViewSortedByEarnings">
                        <td>{{ r.displayNamePlural }}</td>
                        <td class="text-right num">{{ numf(r.totalOwned) }}</td>
                        <td class="text-right num">{{ numf(r.sold) }}</td>
                        <td class="text-right num">{{ numf(r.incurred) }}</td>
                        <td class="text-right num">{{ numf(r.price) }}</td>
                        <td class="text-right num">{{ numf(r.earnings) }}</td>
                    </tr>
                    <tr>
                        <td><strong>Total earnings</strong></td>
                        <td class="text-right num"><strong>{{ numf(totalResourcesOwned) }}</strong></td>
                        <td class="text-right num"><strong>{{ numf(totalResourcesSold) }}</strong></td>
                        <td class="text-right num"><strong>{{ numf(totalResourcesIncurred) }}</strong></td>
                        <td class="text-right num"><strong> </strong></td>
                        <td class="text-right num"><strong>{{ numf(totalResourceEarnings) }}</strong></td>
                    </tr>
                    <tr>
                        <td colspan="5"><strong>Money spent</strong></td>
                        <td class="text-right num"><strong>{{ numf(stats.moneySpent) }}</strong></td>
                    </tr>
                    <tr>
                        <td colspan="5"><strong>Total profit</strong></td>
                        <td class="text-right num" :class="{
                            'text-success': totalProfit > 0,
                            'text-danger': totalProfit < 0
                        }"><strong>$ {{ num(totalProfit) }}</strong></td>
                    </tr>
                </table>
            </div>
            <div class="mt-3">
                <a @click="toggleTileSize" class="btn btn-sm btn-secondary">Toggle tile size
                    ({{ settings.tileSizeMultiplier
                        === 1 ? 'Normal' : 'Big' }})</a>
            </div>
            <div class="hover-opacity" style="margin-top:200px">
                <button @click="resetGame" class="btn btn-sm btn-danger">Reset game</button>
            </div>
        </div>
        <div class="col-6">
            <transition-group name="fade">
                <div v-for="category in upgradesByCategoryView" class="mb-4" :key="category.groupTitle">
                    <h5>{{ category.groupTitle }}</h5>
                    <transition-group name="fade">
                        <button v-for="item in category.items" class="btn-upgrade" :key="item.name"
                            @click="buyUpgrade(item)" :disabled="!item.canBuy"
                            :title="item.blurred ? '?' : item.description">
                            <span class="can-blur font-weight-bold" :class="{ blur: item.blurred }">{{
                                item.displayName ??
                                item.name
                                }}</span>
                            <sup v-if="item.max !== 1 && item.owned > 0"></sup><br>
                            <small>
                                $ {{ num(item.cost) }}
                                <span v-for="r in item.resourcesNeeded" class="ml-1">{{ r.icon }}{{ num(r.amount)
                                    }}</span>
                            </small>
                            <span class="num" v-if="item.owned > 0">{{ num(item.owned) }}</span>
                            <span class="group-icon">{{ item.blurred ? '❔' : item.groupIcon }}</span>
                        </button>
                    </transition-group>
                </div>
            </transition-group>
        </div>
    </div>

    <!-- Modals -->
    <dialog :ref="MODALS.kilnBake">
        <div v-if="modalObj">
            <h5>Select a recipe to bake</h5>
            <button class="btn-full btn-sm btn-bake-resource" v-for="recipe in modalObj.recipes"
                @click="modalObj.recipeId = recipe.id" :class="{ 'btn-primary': modalObj.recipeId === recipe.id }">
                {{ recipe.yield }} X {{ recipe.icon }} <strong>{{ recipe.resource }}</strong> from <span
                    v-for="r in Object.keys(recipe.reqs)">{{ recipe.reqs[r] }} {{ r }}
                </span> -
                <small>{{ num(recipe.time) }}s</small>
            </button>
            <div class="text-right mt-4">
                <button class="btn-sm" @click="closeModal(MODALS.kilnBake)">Cancel</button>
                <button class="btn-sm btn-success mr-2" :disabled="!modalObj.recipeId"
                    @click="modalObj.tile.onModalSetRecipe(modalObj.recipeId)">Bake</button>
            </div>
        </div>
    </dialog>
    <dialog :ref="MODALS.windmill">
        <div v-if="modalObj">
            <h5>Windmill</h5>
            <p v-if="modalObj.tile.product">This Windmill is set to produce <strong>{{
                modalObj.tile?.product?.name }}</strong>.</p>
            <p>
                <small>Neighbor bonus: {{ num(modalObj.tile.neighborBonus * 100) }}%{{ modalObj.tile.neighborBonus ===
                    modalObj.MAX_NEIGHBOR_BONUS ? ' (max)' : '' }}.</small>
            </p>
            <div class="mb-3">
                <button class="btn-full btn-sm" @click="modalObj.tile.working = !modalObj.tile.working"
                    :class="{ 'btn-success': !modalObj.tile.working }">{{ modalObj.tile.working ? 'Stop' :
                        'Start' }} production</button>
            </div>
            <table class="table">
                <tr>
                    <td class="align-middle">Slot:</td>
                    <td>
                        <select @change="modalObj.tile.changeSlot(0, ($event.target as HTMLSelectElement).value)"
                            class="w-100" :value="modalObj.tile.slots[0]" :disabled="modalObj.tile.changingProduct">
                            <option :value="''">Empty (produce energy)</option>
                            <option v-for="p in modalObj.RESOURCES" :value="p.name">{{ p.displayNameSingular }}</option>
                        </select>
                    </td>
                </tr>

            </table>
            <!-- <pre>{{ modalObj }}</pre> -->
            <div v-if="modalObj.tile.changingProduct" class="mt-3 position-relative">
                <div class="progress-big">
                    <div class="progress"
                        :style="{ width: Math.round(modalObj.tile.slotChangeSaturation / modalObj.SLOT_CHANGE_TIME * 100) + '%' }">
                    </div>
                </div>
                <div v-if="modalObj.tile.requestedProductId === 1">Clearing out all resources from the grindstone...
                </div>
                <div v-else>Changing resources in the grindstone...</div>
            </div>
            <div v-else>
                <div v-if="modalObj.tile.productId > 0" class="alert btn-primary text-center">

                    <div>{{ modalObj.tile.product.name }}</div>
                    <small>{{ modalObj.tile.product.description }}<br>
                        Yields <strong>{{ resources[modalObj.tile.product.resource].icon }} {{
                            modalObj.tile.product.gain
                            || 0 }} </strong>
                        <span v-if="modalObj.tile.product.inputPerGain > 0"> from <strong>{{
                            resources[modalObj.tile.product.input].icon }} {{
                                    modalObj.tile.product.inputPerGain }}</strong> </span> per second.
                    </small>
                </div>
                <div v-else class="text-center">
                    <h3 class="text-danger">No good!</h3>
                    This is producing ground {{ resources[modalObj.tile.slots[0]].displayNamePlural.toLocaleLowerCase()
                    }} that nobody
                    wants. <br>Plus you're not producing any energy!
                </div>
            </div>
            <div v-if="modalObj.tile.productionErrors > 10" class="text-danger">
                Not enough resources to produce the desired product.
            </div>
            <div class="text-right mt-4">
                <button class="btn-sm" @click="closeModal(MODALS.windmill)">Close</button>
            </div>
        </div>
    </dialog>
</template>

<style scoped>
header {
    line-height: 1.5;
}

.logo {
    display: block;
    margin: 0 auto 2rem;
}

@media (min-width: 1024px) {
    header {
        display: flex;
        place-items: center;
        padding-right: calc(var(--section-gap) / 2);
    }

    .logo {
        margin: 0 2rem 0 0;
    }

    header .wrapper {
        display: flex;
        place-items: flex-start;
        flex-wrap: wrap;
    }
}
</style>
