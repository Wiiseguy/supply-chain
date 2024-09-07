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
import { bigNum, decode, encode, humanTime, makeIndex, setBoolPropTimeout } from './utils'
import { Upgrade } from './Upgrade'
import { Calculator } from './Calculator'
import { Automator } from './Automator'
import { WindmillTile } from './tiles/WindmillTile'
import { markRaw } from 'vue'

/** @ts-ignore */
globalThis.haltAnimation = false

const SAVE_VERSION = 1

const DEBUG = false
const FPS = 30
const FRAME_TIME = 1 / FPS
const MIN_CATCHUP_STEPS = 2
const MAX_CATCHUP_STEPS = (60 * 5) / FRAME_TIME // 5 minutes = 9000 steps
const SAVE_INTERVAL = 60 // seconds
const CHECK_VERSION_UPDATE_INTERVAL = 60 * 5 // seconds

const TILE_SIZE = 64

const DEFAULT_UPGRADE_VISIBILITY_THRESHOLD = 0.25
const DEFAULT_UPGRADE_BLUR_THRESHOLD = 0.5

const INITIAL_MONEY = 0
const AUTOMATOR_STARTER_ENERGY = 5 * 60

interface UpgradeView extends Upgrade {
    cost: number
    blurred: boolean
    canBuy: boolean
    owned: number
    resourcesNeeded: { type: string; amount: number; icon: string }[]
    groupIcon: string
}

interface ILogMessage {
    time: Date
    message: string
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
            gameLoopInterval: 0,
            perSecondInterval: 0,
            saveGameInterval: 0,
            checkVersionUpdateInterval: 0,

            land: [] as Tile[],
            boughtUpgrades: {} as Record<string, number>,

            resources: {} as Record<string, Resource>,
            automators: [] as Automator[],
            calculators: [] as Calculator[],
            calculated: {} as Record<string, any>,
            counters: [] as Counter[],
            perS: {} as Record<string, number>,
            isProducingEnergy: false,
            visibleUpgrades: [] as string[],
            unblurredUpgrades: [] as string[],
            adjacentTileCache: new WeakMap(),
            clickMode: 'click',
            movingTileIdx: -1,
            message: '',
            messages: [] as ILogMessage[],
            messageFade: 0,
            modalObj: null as any,
            modal: null as string | null,

            currentTab: 'upgrades',
            tabs: [
                {
                    title: 'Upgrades',
                    id: 'upgrades',
                    isVisible: () => true
                },
                {
                    title: 'Statistics',
                    id: 'stats',
                    isVisible: () => true
                },
                {
                    title: 'Ledger',
                    id: 'ledger',
                    isVisible: () => this.hasUpgrade('Ledger')
                },
                {
                    title: 'Settings',
                    id: 'settings',
                    isVisible: () => true
                }
            ],

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
                sellResourcesPerClick: 1,
                tileSizeMultiplier: 1
            },

            doWiggleClass: true,

            buildInfo: {} as Record<string, any>,
            newVersionAvailable: false
        }
    },
    async created() {
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
            //new Counter('money', () => this.money),
            //new Counter('energy', () => this.resources.energy.owned)
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

        // Initialize automators
        this.automators.forEach(automator => {
            automator.initialize(this as any)
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

        // Fetch build info
        this.buildInfo = await (await fetch('build.json', { cache: 'no-cache' })).json()
    },
    mounted() {
        if (!this.stats.started) {
            this.showMessage(
                `Welcome to your land! You start out with one tile of forest land and ${INITIAL_SEEDS} seeds. Good luck!`
            )
            this.stats.started = true
        }
        this.startGameLoop()

        document.addEventListener('keydown', this.onKeyDown)
        window.addEventListener('focus', this.checkVersionUpdate)

        if (!this.settings.dark) {
            document.body.classList.remove('dark')
        }
    },
    unmounted() {
        clearInterval(this.gameLoopInterval)
        clearInterval(this.perSecondInterval)
        clearInterval(this.saveGameInterval)
        clearInterval(this.checkVersionUpdateInterval)
        document.removeEventListener('keydown', this.onKeyDown)
        window.removeEventListener('focus', this.checkVersionUpdate)
        this.saveGame()
    },
    methods: {
        onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                this.setClickMode('click')
            }
            // Bind CTRL+S to saveGame
            else if (e.key === 's' && e.ctrlKey) {
                e.preventDefault()
                this.saveGame()
                this.showMessage('Game saved!')
            }
        },
        num(n: number) {
            if (typeof n !== 'number') return n
            return bigNum(n)
        },
        numf(n: number, numDecimals = 0) {
            if (typeof n !== 'number') return n
            return n.toLocaleString(undefined, {
                minimumFractionDigits: numDecimals,
                maximumFractionDigits: numDecimals
            })
        },
        showMessage(message: string) {
            console.log('Message:', message)
            this.message = message
            this.messageFade = 1
            this.messages.unshift({ time: new Date, message })
        },
        showModal(modal: string, obj: any) {
            this.modal = modal
            this.modalObj = obj
            this.$nextTick(() => {
                (this.$refs[modal] as HTMLDialogElement).showModal()
            })
        },
        closeModal(modal: string) {
            (this.$refs[modal] as HTMLDialogElement).close()
            this.modal = null;
        },
        startGameLoop() {
            this.gameLoopInterval = setInterval(this.gameLoop, 1000 / FPS)
            this.perSecondInterval = setInterval(this.perSecond, 1000)
            this.saveGameInterval = setInterval(this.saveGame, SAVE_INTERVAL * 1000)
            this.checkVersionUpdateInterval = setInterval(this.checkVersionUpdate, CHECK_VERSION_UPDATE_INTERVAL * 1000)
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

            // Get gains from tiles
            const gains = this.land.map(tile => tile.gains).flat()
            const groupedGains = gains.reduce((acc, gain) => {
                if (!acc[gain.resource]) {
                    acc[gain.resource] = 0
                }
                acc[gain.resource] += gain.amount
                return acc
            }, {} as Record<string, number>)

            const enabledAutomators = this.automators.filter(automator => automator.enabled && this.boughtUpgrades[automator.upgradeName] > 0)

            // Calculate automator sellers money per second
            const resourcesSoldPerS = {} as Record<string, number>
            const resourcesSoldPricePerS = {} as Record<string, number>
            let resourcesSoldPriceTotal = 0
            const sellerAutomators = enabledAutomators.filter(automator => automator.upgrade?.sellerAutomator === true)
            sellerAutomators.forEach(automator => {
                const upgrade = automator.upgrade
                if (!upgrade) return;
                upgrade.resourcesSold?.forEach(r => {
                    const resource = this.resources[r]
                    if (!resourcesSoldPerS[r]) {
                        resourcesSoldPerS[r] = 0
                    }
                    if (!resourcesSoldPricePerS[r]) {
                        resourcesSoldPricePerS[r] = 0
                    }
                    resourcesSoldPerS[r] += automator.speed
                    const soldPricePerS = automator.speed * resource.sellPrice(1)
                    resourcesSoldPricePerS[r] += soldPricePerS
                    resourcesSoldPriceTotal += soldPricePerS
                })
            })
            this.perS.money = resourcesSoldPriceTotal

            // Get automator power usage
            const automatorPowerUsage = enabledAutomators
                .reduce((acc, automator) => acc + automator.powerUsage, 0)

            const energyProduced = groupedGains.energy || 0
            this.isProducingEnergy = energyProduced > 0

            this.perS.energy = energyProduced - automatorPowerUsage

            // Run other counters            
            this.counters.forEach(counter => {
                this.perS[counter.name] = counter.delta
            })
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
        setSellResourcesPerClick(num: number) {
            this.settings.sellResourcesPerClick = num
        },
        sellResource(resource: Resource, amount = 0) {
            if (amount === 0) amount = resource.sellNum
            this.money += resource.sell(amount)
        },
        sellAutomator(automator: Automator) {
            // Get the cost of the current automator
            const upgrade = automator.upgrade
            if (!upgrade) {
                console.error('No upgrade associated for automator:', automator)
                return
            }
            let owned = this.boughtUpgrades[automator.upgradeName]
            const price = this.getUpgradeCostNum(upgrade, owned - 1)
            this.money += price
            this.stats.moneySpent -= price // You get back all the money you spent on the automator!
            this.boughtUpgrades[automator.upgradeName] -= 1

            this.showMessage(`Sold ${upgrade.displayName} for $ ${this.num(price)}!`)
        },
        buyAutomator(automator: Automator) {
            // Get the cost of the next automator
            const upgrade = automator.upgrade
            if (!upgrade) {
                console.error('No upgrade associated for automator:', automator)
                return
            }
            let owned = this.boughtUpgrades[automator.upgradeName]
            const price = this.getUpgradeCostNum(upgrade, owned)
            if (!this.incur(price)) return
            this.boughtUpgrades[automator.upgradeName] += 1

            this.showMessage(`Bought ${upgrade.displayName} for $ ${this.num(price)}!`)
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

        getUpgradeCost(upgrade?: Upgrade) {
            if (!upgrade) return 0
            return this.getUpgradeCostNum(upgrade, this.boughtUpgrades[upgrade.name])
        },
        getUpgradeCostNum(upgrade?: Upgrade, num = 1) {
            if (!upgrade) return 0
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

            // If the upgrade is an automator, add a little energy to start out with
            if (upgrade.automator) {
                this.resources.energy.gain(AUTOMATOR_STARTER_ENERGY)
            }

            this.showMessage(`Bought ${upgrade.displayName} for $ ${this.num(cost)}!`)
        },
        hasUpgrade(upgradeName: string) {
            return this.boughtUpgrades[upgradeName] > 0
        },
        hasRoomForTile() {
            return this.land.some(tile => tile instanceof EmptyTile)
        },
        canBuyUpgrade(upgrade?: Upgrade) {
            if (!upgrade) return false
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
                    v: SAVE_VERSION,
                    money: this.money,
                    resources: {} as Record<string, any>,
                    boughtUpgrades: this.boughtUpgrades,
                    land: this.land.map(tile => tile.getSaveData()),
                    startTime: this.startTime,
                    stats: this.stats,
                    settings: this.settings,
                    automators: [] as Record<string, any>[]
                }
                Object.values(this.resources).forEach(resource => {
                    saveData.resources[resource.name] = resource.getSaveData()
                })
                this.automators.forEach(automator => {
                    saveData.automators.push(automator.getSaveData())
                })

                saveData.land.forEach(tile => {
                    // Get all properties, if any is typeof object, console.warning asking if it should be saved
                    for (const key in tile) {
                        if (typeof tile[key] === 'object' && tile[key] != null) {
                            console.warn(`${tile.tileType}: Property ${key} is an object, should it be saved for?`, tile)
                        }
                    }
                })

                localStorage.setItem('saveData', encode(JSON.stringify(saveData)))
                //if (this.DEBUG) {
                console.log('Saving game length:', localStorage['saveData'].length, JSON.parse(JSON.stringify(saveData)))
                //}
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
                const isOld = saveDataStr?.startsWith('{')
                const saveData = JSON.parse(isOld ? saveDataStr : decode(saveDataStr))
                if (!saveData) {
                    return
                }
                if (saveData.v !== SAVE_VERSION) {
                    setTimeout(() => {
                        this.showMessage(`Save data version mismatch. Save data cleared. Sorry! Here's a diamond to lessen the pain.`)
                        this.resources.diamond.gain(1)
                    }, 1)
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
                    tileInstance.loadSaveData(tileData)
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
                        automator.loadSaveData(savedAutomator)
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
                    v: SAVE_VERSION,
                    stats: {
                        restarts: this.stats.restarts + 1
                    },
                    settings: {
                        ...this.settings,
                        automation: true,
                        sellResourcesPerClick: 10
                    }
                }
                localStorage.setItem('saveData', encode(JSON.stringify(saveData)))
                location.reload()
            }
        },

        setDebug(e: MouseEvent) {
            if (!e.ctrlKey) return
            this.DEBUG = !this.DEBUG
            // Give 1 of each resource
            Object.values(this.resources).forEach(resource => {
                resource.gain(1)
            })
        },
        doWiggle() {
            setBoolPropTimeout(this, 'doWiggleClass', 'doWiggleClassTimeout', 1000)
        },
        async checkVersionUpdate() {
            if (!this.buildInfo) return;
            const buildInfo = await (await fetch('build.json', { cache: 'no-cache' })).json()
            if (buildInfo.build !== this.buildInfo.build) {
                this.showMessage(`New version available! Refresh to update.`)
                this.newVersionAvailable = true
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
            return this.resourcesViewSortedByEarnings.reduce((acc, resource) => acc + resource.earnings, 0)
        },
        totalResourcesOwned() {
            return this.resourcesViewSortedByEarnings.reduce((acc, resource) => acc + resource.totalOwned, 0)
        },
        totalResourcesSold() {
            return this.resourcesViewSortedByEarnings.reduce((acc, resource) => acc + resource.sold, 0)
        },
        totalResourcesIncurred() {
            return this.resourcesViewSortedByEarnings.reduce((acc, resource) => acc + resource.incurred, 0)
        },
        totalProfit() {
            return this.totalResourceEarnings - this.stats.moneySpent
        },
        visibleTabs() {
            return this.tabs.filter(tab => tab.isVisible())
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
                .filter(automator => this.boughtUpgrades[automator.upgradeName] > 0 && automator.upgrade)
                .map(automator => {
                    const upgrade = automator.upgrade
                    return {
                        ...automator,
                        automator,
                        upgrade,
                        canBuy: this.canBuyUpgrade(upgrade),
                        buyPrice: Math.ceil(this.getUpgradeCost(upgrade)),
                        sellPrice: Math.ceil(
                            this.getUpgradeCostNum(upgrade, this.boughtUpgrades[automator.upgradeName] - 1)
                        ),
                        displayName: upgrade?.displayName ?? automator.upgradeName,
                        description: upgrade?.description ?? '',
                        icon: upgrade ? GROUP_ICONS[upgrade.group] : '',
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
        },

        buildDate() {
            if (!this.buildInfo?.build) return ''
            return new Date(this.buildInfo.build).toLocaleString()
        }
    }
}
</script>

<template>
    <h5 :class="{ wiggle: doWiggleClass }" @dblclick="setDebug">
        <i class="wiggle-target fa-solid fa-seedling text-success" @click="doWiggle"></i>
        Supply Chain Prototype
        <span class="ml-5 text-warning blink position-fixed" v-if="newVersionAvailable">New version
            available!</span>
    </h5>

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
                <h1>🏆 You Win!</h1>
                <p>Time taken: {{ timeTaken }}</p>
                <p>Total tile clicks: {{ num(stats.winLandClicks) }}</p>
                <p>
                    <button @click="resetGame" class="btn btn-sm btn-danger">Restart</button>
                </p>
            </div>

            <h5 class="pl-1">
                <div @click="DEBUG && (money += 1, money *= 10)"><strong>$</strong>&nbsp;<span class="num">{{ num(money)
                        }}</span></div>
                <div v-if="automatorsView.length > 0" class="small text-muted">
                    Money p/s: $ <span class="num">{{ num(perS.money) }}</span>
                </div>
                <div v-if="resources.energy.totalOwned > 0" class="small" @click="DEBUG && resources.energy.incur(10)"
                    :title="perS.energy < 0.001 ? `You are using more energy than you're producing!` : ''"
                    :class="{ 'text-muted': true }">
                    Energy p/s: <span class="num">{{ perS.energy > 0 ? '+' : '' }}{{ numf(perS.energy, 2) }}</span> J
                    <i v-if="anyAutomatorNoPower" class="fa-solid fa-battery-empty text-danger blink"></i>
                    <i v-else-if="perS.energy < 0 && isProducingEnergy"
                        class="fa-solid fa-warning text-warning small"></i>
                </div>
            </h5>

            <!-- Resource stats -->
            <div class="toolbar mt-3 mb-2" v-if="sellLevel > 1">
                <span class="text-muted ml-3">Sell amount:</span>
                <div class="btn-group">
                    <button @click="setSellResourcesPerClick(10)" v-if="sellLevel > 0"
                        :class="{ 'active': settings.sellResourcesPerClick === 10 }" class="btn btn-xs btn-tool"
                        title="Sell 10 resources per click">10</button>
                    <button @click="setSellResourcesPerClick(100)" v-if="sellLevel > 1"
                        :class="{ 'active': settings.sellResourcesPerClick === 100 }" class="btn btn-xs btn-tool"
                        title="Sell 100 resources per click">100
                    </button>
                    <button @click="setSellResourcesPerClick(1000)" v-if="sellLevel > 2"
                        :class="{ 'active': settings.sellResourcesPerClick === 1000 }" class="btn btn-xs btn-tool"
                        title="Sell all resources per click">1000</button>
                </div>
            </div>
            <table>
                <tr v-for="r in resourcesView">
                    <td class="text-center">{{ r.icon }}</td>
                    <td @click="e => DEBUG && (e.shiftKey ? r.flush() : r.gain(e.ctrlKey ? 1 : r.storageSize))"
                        class="pr-3">
                        <span :class="{ 'text-warning': r.owned == r.storageSize }">
                            <span>{{ r.displayNamePlural }}: </span>

                        </span>
                    </td>
                    <td class="text-right num">
                        {{ num(r.owned) }} / {{ num(r.storageSize) }} {{ r.unit
                        }}
                    </td>
                    <td class="w-10 num">
                        <span v-if="r.canOverflow && r.lost > 0" class="ml-3 text-danger"
                            :title="`Lost ${r.displayNamePlural.toLowerCase()}: caused by not having enough storage. Buy a ${r.displayNameSingular.toLowerCase()} reclaimer to get it back.`">
                            {{ num(-r.lost) }}</span>
                    </td>
                    <td class="w-25">
                        <div v-if="r.canTrade">
                            <button @click="sellResource(r, 1)" :disabled="!r.any"
                                class="btn-xs btn-sell-resource btn-full">
                                Sell 1 <span class="text-success">+ $ {{ num(r.price) }}</span>
                            </button>
                        </div>
                    </td>
                    <td class="w-25">
                        <div v-if="r.canTrade">
                            <button @click="sellResource(r, settings.sellResourcesPerClick)" :disabled="!r.any"
                                v-if="sellLevel > 0" class="btn-xs btn-sell-resource btn-full">
                                Sell {{ num(settings.sellResourcesPerClick) }} <span class="text-success">+ $ {{
                                    num(r.sellPrice(settings.sellResourcesPerClick)) }}</span>
                            </button>
                            <!-- <button @click="sellResource(r, 1)" :disabled="!r.any" class="btn-xs btn-sell-resource">
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
                            </button> -->
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
                        <td class="px-3 text-right font-weight-bold" title="Owned">{{
                            num(boughtUpgrades[a.upgradeName])
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

        </div>

        <!-- Right side of the screen -->
        <div class="col-6">
            <!-- Tab selector -->
            <ul class="nav nav-tabs" id="tab-menu">
                <li class="nav-item" v-for="t in visibleTabs">
                    <a class="nav-link" :class="{ 'active': t.id === currentTab }" @click="currentTab = t.id">{{
                        t.title
                        }}</a>
                </li>
            </ul>
            <!-- Upgrades tab -->
            <div class="tab-container">
                <div v-if="currentTab === 'upgrades'">
                    <transition-group name="fade">
                        <div v-for="category in upgradesByCategoryView" class="mb-4" :key="category.groupTitle">
                            <h5>{{ category.groupTitle }}</h5>
                            <transition-group name="fade">
                                <button v-for="item in category.items" class="btn-upgrade" :key="item.name"
                                    @click="buyUpgrade(item)" :disabled="!item.canBuy"
                                    :title="item.blurred ? '?' : item.description">
                                    <span class="can-blur font-weight-bold" :class="{ blur: item.blurred }">
                                        {{ item.icon || item.groupIcon }}
                                        {{
                                            item.displayName ??
                                            item.name
                                        }}</span>
                                    <sup v-if="item.max !== 1 && item.owned > 0"></sup><br>
                                    <small>
                                        $ {{ num(item.cost) }}
                                        <span v-for="r in item.resourcesNeeded" class="ml-1">{{ r.icon }}{{
                                            num(r.amount)
                                            }}</span>
                                    </small>
                                    <span class="num" v-if="item.owned > 0">{{ num(item.owned) }}</span>
                                    <!-- <span class="group-icon">{{ item.blurred ? '❔' : item.groupIcon }}</span> -->
                                </button>
                            </transition-group>
                        </div>
                    </transition-group>
                </div>
                <!-- Statistics tab -->
                <div v-else-if="currentTab === 'stats'">
                    <div class="selectable">
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
                        <div v-if="stats.luckySeeds > 0"
                            :title="`Lucky seed chance is ${100 * calculated.luckySeedChance}%`">
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
                            <span :title="`Rare fish chance sequence is ${100 * calculated.rareFishLuck}%`">Fish
                                caught:
                                {{
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

                        <h5 class="mt-5">Messages</h5>
                        <small v-if="messages.length === 0">
                            No messages yet.
                        </small>
                        <table>
                            <tr v-for="msg in messages">
                                <td class="num text-muted">{{ msg.time.toLocaleTimeString() }}</td>
                                <td class="pl-2">{{ msg.message }}</td>
                            </tr>
                        </table>
                    </div>
                </div>
                <!-- Ledger tab  -->
                <div v-else-if="currentTab === 'ledger'">
                    <table class="table table-sm table-striped">
                        <tr>
                            <th colspan="2">Resource</th>
                            <th class="text-right">Owned</th>
                            <th class="text-right">Sold</th>
                            <th class="text-right">Used</th>
                            <th class="text-right">Price</th>
                            <th class="text-right">Earnings</th>
                        </tr>
                        <tr v-for="r in resourcesViewSortedByEarnings">
                            <td class="min">{{ r.icon }}</td>
                            <td>{{ r.displayNamePlural }}</td>
                            <td class="text-right num">{{ numf(r.totalOwned) }}</td>
                            <td class="text-right num">{{ numf(r.sold) }}</td>
                            <td class="text-right num">{{ numf(r.incurred) }}</td>
                            <td class="text-right num">{{ numf(r.price) }}</td>
                            <td class="text-right num">{{ numf(r.earnings) }}</td>
                        </tr>
                        <tr>
                            <th colspan="2">Total earnings</th>
                            <td class="text-right num"><strong>{{ numf(totalResourcesOwned) }}</strong></td>
                            <td class="text-right num"><strong>{{ numf(totalResourcesSold) }}</strong></td>
                            <td class="text-right num"><strong>{{ numf(totalResourcesIncurred) }}</strong></td>
                            <td class="text-right num"><strong>-</strong></td>
                            <td class="text-right num"><strong>{{ numf(totalResourceEarnings) }}</strong></td>
                        </tr>
                        <tr>
                            <th colspan="6">Money spent</th>
                            <td class="text-right num"><strong>{{ numf(stats.moneySpent) }}</strong></td>
                        </tr>
                        <tr>
                            <th colspan="6">Total profit</th>
                            <td class="text-right num" :class="{
                                'text-success': totalProfit > 0,
                                'text-danger': totalProfit < 0
                            }"><strong>$ {{ num(totalProfit) }}</strong></td>
                        </tr>
                    </table>
                </div>
                <!-- Settings tab -->
                <div v-else-if="currentTab === 'settings'">
                    <div class="text-right small">v{{ buildInfo.version }} - Built: {{ buildDate }}</div>
                    <div>
                        <a @click="toggleTileSize" class="btn btn-sm btn-secondary">Tile size
                            ({{ settings.tileSizeMultiplier
                                === 1 ? 'Normal' : 'Big' }})</a>
                    </div>
                    <!-- Toggle dark mode button  -->
                    <div class="mt-3">
                        <a @click="toggleDarkMode" class="btn btn-sm btn-secondary">Dark mode ({{ settings.dark
                            ? 'On' : 'Off' }})
                        </a>
                    </div>
                    <div class="hover-opacity" style="margin-top:200px">
                        <button @click="resetGame" class="btn btn-sm btn-danger">Reset game</button>
                    </div>
                </div>
            </div>

        </div>
    </div>

    <!-- Modals -->
    <dialog :ref="MODALS.kilnBake" v-if="modal === MODALS.kilnBake">
        <div>
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
    <dialog :ref="MODALS.windmill" v-if="modal === MODALS.windmill">
        <div>
            <h5>Windmill</h5>
            <p v-if="modalObj.tile.product">This Windmill is set to produce <strong>{{
                modalObj.tile?.product?.name }}</strong>.</p>
            <p>
                <small>Neighbor bonus: {{ num(modalObj.tile.neighborBonus * 100) }}%{{ modalObj.tile.neighborBonus
                    ===
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
                            <option v-for="p in modalObj.RESOURCES" :value="p.name">{{ p.displayNameSingular }}
                            </option>
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
                <div v-if="modalObj.tile.product?.id > 0" class="alert btn-primary text-center">

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
                    This is producing ground {{
                        resources[modalObj.tile.slots[0]].displayNamePlural.toLocaleLowerCase()
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
