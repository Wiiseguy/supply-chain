import { markRaw } from 'vue'
import Windmill from '@/components/Windmill.vue'
import { CATEGORIES, GROUPS, MODALS, RESOURCE_TYPES, TILE_TYPES } from '../consts'
import Tile from './Tile'
import { Upgrade } from '../Upgrade'

const ENERGY_GAIN = 10 // 1 energy per 10 seconds

// Mills can produce energy or grind resources
const PRODUCTS = [
    {
        id: 1,
        name: 'Energy',
        description: 'This windmill will generate energy from the wind.',
        resource: RESOURCE_TYPES.energy,
        gain: ENERGY_GAIN
    }
]

export class WindmillTile extends Tile implements ITile {
    static readonly type = TILE_TYPES.windmill

    working: boolean
    productId: number

    constructor(app: IApp) {
        super(app, WindmillTile.type)
        this.working = true
        this.productId = PRODUCTS[0].id
    }
    update(elapsed: number) {
        super.update(elapsed)

        if (this.working && this.product) {
            this.app.resources[this.product.resource].gain(this.product.gain * elapsed)
        }
    }

    click() {
        this.app.showModal(MODALS.windmill, { tile: this, PRODUCTS })
    }
    sell() {
        this.app.boughtUpgrades['Windmill Tile'] -= 1
    }

    setProduct(productId: number) {
        // Find it first
        const product = PRODUCTS.find(p => p.id === productId)
        if (!product) return

        this.productId = productId
    }

    get product() {
        return PRODUCTS.find(p => p.id === this.productId)
    }

    get component() {
        return markRaw(Windmill)
    }

    get tooltip() {
        return 'Windmill tile - click to change product or start/stop production'
    }

    static readonly resources = []

    static readonly calculators = []

    static readonly automators = []

    static readonly upgrades = [
        new Upgrade({
            name: 'Windmill Tile',
            tile: true,
            description: 'Build a windmill to generate energy or grind resources',
            baseCost: 5500,
            costMultiplier: 2,
            category: CATEGORIES.tiles,
            group: GROUPS.windmill,
            resourceCosts: {
                [RESOURCE_TYPES.wood]: 50
            },
            onBuy(app: IApp) {
                app.addTile(new WindmillTile(app))
            }
        })
    ]
}
