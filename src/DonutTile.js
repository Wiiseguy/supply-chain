import { Automator } from './Automator.js'
import { CATEGORIES, GROUP_ICONS, GROUPS, RESOURCE_TYPES, TILE_TYPES } from './consts.js'
import { Resource } from './Resource.js'
import Tile from './Tile.js'
import { createAutomatorUpgrade, pick } from './utils.js'

export class DonutTile extends Tile {
    static type = TILE_TYPES.donut

    constructor(app) {
        super(app, DonutTile.type)
    }
    update(elapsed) {
        super.update(elapsed)
    }
    sell() {
        this.app.boughtUpgrades['Donut Tile'] -= 1
    }

    click() {
        this.app.resources.donut.gain(1)
        this.animateGrow()
    }

    autoClick(times) {
        this.app.resources.donut.gain(times)
    }

    get icon() {
        return GROUP_ICONS.donut
    }

    static resources = [
        new Resource(RESOURCE_TYPES.donut, {
            displayNameSingular: 'Donut',
            displayNamePlural: 'Donuts',
            icon: GROUP_ICONS.donut,
            basePrice: 1,
            storageBaseSize: 200,
            initialOwned: 0
        })
    ]

    static calculators = []

    static automators = [
        new Automator('Donut Clicker', app => {
            const donut = pick(app.land.filter(t => t instanceof DonutTile))
            if (donut) {
                donut.autoClick(1)
            }
        }),
        new Automator('Donut Grandpa', app => {
            const donut = pick(app.land.filter(t => t instanceof DonutTile))
            if (donut) {
                donut.autoClick(5)
            }
        })
    ]

    static hasTile = app => app.land.some(tile => tile instanceof DonutTile)

    static upgrades = [
        {
            name: 'Donut Tile',
            tile: true,
            description: 'Claim a tile of land to mess about with cookies... I mean donuts!',
            initialOwned: 0,
            baseCost: 500,
            costMultiplier: 2,
            speed: undefined,
            category: CATEGORIES.tiles,
            group: GROUPS.donut,
            onBuy(app) {
                app.addTile(new DonutTile(app))
            }
        },
        // Automators
        createAutomatorUpgrade({
            name: 'Donut Clicker',
            description: 'Automatically click donuts, just like that other game',
            baseCost: 1000,
            costMultiplier: 2,
            speed: 1,
            group: GROUPS.donut,
            isVisible: DonutTile.hasTile
        }),
        createAutomatorUpgrade({
            name: 'Donut Grandpa',
            description: 'Donut Grandpa will click 5 donuts for you',
            baseCost: 5000,
            costMultiplier: 2,
            speed: 1,
            group: GROUPS.donut,
            isVisible: DonutTile.hasTile
        })
    ]
}
