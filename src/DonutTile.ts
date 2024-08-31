import { Automator } from './Automator'
import { CATEGORIES, GROUP_ICONS, GROUPS, RESOURCE_TYPES, TILE_TYPES } from './consts'
import { Resource } from './Resource'
import Tile from './Tile'
import { Upgrade } from './Upgrade'
import { pick } from './utils'

export class DonutTile extends Tile implements ITile {
    static readonly type = TILE_TYPES.donut

    constructor(app: IApp) {
        super(app, DonutTile.type)
    }

    update(elapsed: number) {
        super.update(elapsed)
    }
    sell() {
        this.app.boughtUpgrades['Donut Tile'] -= 1
    }

    click() {
        this.app.resources.donut.gain(1)
        this.animateGrow()
    }

    autoClick(times: number) {
        this.app.resources.donut.gain(times)
    }

    get icon() {
        return GROUP_ICONS.donut
    }

    static readonly resources = [
        new Resource(RESOURCE_TYPES.donut, {
            displayNameSingular: 'Donut',
            displayNamePlural: 'Donuts',
            icon: GROUP_ICONS.donut,
            basePrice: 1,
            storageBaseSize: 200,
            initialOwned: 0
        })
    ]

    static readonly calculators = []

    static readonly automators = [
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

    static readonly hasTile = (app: IApp) => app.land.some(tile => tile instanceof DonutTile)

    static readonly upgrades: Upgrade[] = [
        new Upgrade({
            name: 'Donut Tile',
            tile: true,
            description: 'Claim a tile of land to mess about with cookies... I mean donuts!',
            baseCost: 500,
            costMultiplier: 2,
            category: CATEGORIES.tiles,
            group: GROUPS.donut,
            onBuy(app: IApp) {
                app.addTile(new DonutTile(app))
            }
        }),
        // Automators
        Upgrade.createAutomator({
            name: 'Donut Clicker',
            description: 'Automatically click donuts, just like that other game',
            baseCost: 1000,
            costMultiplier: 2,
            speed: 1,
            group: GROUPS.donut,
            isVisible: DonutTile.hasTile
        }),
        Upgrade.createAutomator({
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
