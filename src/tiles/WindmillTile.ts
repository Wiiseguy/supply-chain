import Windmill from '@/components/Windmill.vue'
import { markRaw } from 'vue'
import { CATEGORIES, GROUPS, MODALS, RESOURCE_TYPES, TILE_TYPES } from '../consts'
import { Upgrade } from '../Upgrade'
import Tile from './Tile'

const ENERGY_GAIN = 10 // 1 energy per 10 seconds

const NEIGHBOR_BONUS = 0.1 // 10% bonus per neighbor

// Mills can produce energy or grind resources
const PRODUCTS = [
    {
        id: 0,
        name: 'Refuse',
        description: 'Grinding this material will result in refuse.',
        resource: '',
        gain: 0
    },
    {
        id: 1,
        name: 'Energy',
        description: 'This windmill will generate energy from the wind.',
        resource: RESOURCE_TYPES.energy,
        gain: ENERGY_GAIN
    },
    {
        id: 2,
        name: 'Sawdust',
        description: 'This windmill will grind wood into sawdust.',
        resource: RESOURCE_TYPES.sawdust,
        gain: 2,
        input: RESOURCE_TYPES.wood,
        inputPerGain: 1
    }
]

// A windmill has one or more slots that will result in a product ground from the input
// E.g. putting wheat in the slot will result in flour, wood will result in sawdust
interface ISlotResult {
    inputs: string[] // resources
    productId: number
}
const SLOT_RESULTS: ISlotResult[] = [
    {
        inputs: [''], // Empty slot will result in energy
        productId: 1
    },
    {
        inputs: [RESOURCE_TYPES.wood],
        productId: 2
    }
]

// Changing slot is not instant, it takes time to change the slot
const SLOT_CHANGE_TIME = 5 // seconds

export class WindmillTile extends Tile implements ITile {
    static readonly type = TILE_TYPES.windmill

    working: boolean
    productId: number
    neighborBonus: number
    numberOfSlots: number
    slots: string[]
    changingProduct: boolean
    slotChangeSaturation: number
    requestedProductId: number
    productionErrors: number

    constructor(app: IApp) {
        super(app, WindmillTile.type)
        this.working = true
        this.productId = 1
        this.neighborBonus = 0
        this.numberOfSlots = 1
        this.slots = ['']
        this.changingProduct = false
        this.slotChangeSaturation = 0
        this.requestedProductId = 0
        this.productionErrors = 0
    }
    update(elapsed: number) {
        super.update(elapsed)

        if (this.changingProduct) {
            this.slotChangeSaturation += elapsed
            if (this.slotChangeSaturation >= SLOT_CHANGE_TIME) {
                this.changingProduct = false
                this.slotChangeSaturation = 0
                this.setProduct(this.requestedProductId)
            }
        } else if (this.working && this.product?.resource) {
            let canProduce = true
            if (this.product.inputPerGain) {
                // we need to incur input resource per inputPerGain, if false, we can't produce
                const input = this.app.resources[this.product.input]
                canProduce = input.incur(this.product.inputPerGain * elapsed)
            }
            if (canProduce) {
                this.productionErrors = 0
                this.app.resources[this.product.resource].gain(this.product.gain * elapsed * (1 + this.neighborBonus))
            } else {
                this.productionErrors++
            }
        }

        if (this.productionErrors > 0 && this.productionErrors % 100 === 0) {
            this.animateFail()
        }
    }
    onLandChange() {
        this.neighborBonus =
            this.app.getAdjacentTiles(this).filter(t => t instanceof WindmillTile).length * NEIGHBOR_BONUS
    }

    click() {
        let adjacent = this.app.getAdjacentTiles(this).length
        this.app.showModal(MODALS.windmill, {
            tile: this,
            PRODUCTS,
            SLOT_CHANGE_TIME,
            RESOURCES: this.app.resourcesView.filter(r => r.name !== RESOURCE_TYPES.energy),
            MAX_NEIGHBOR_BONUS: NEIGHBOR_BONUS * adjacent
        })
    }
    sell() {
        this.app.boughtUpgrades['Windmill Tile'] -= 1
    }

    changeSlot(slotIndex: number, resource: string) {
        if (this.changingProduct) return
        if (slotIndex >= this.numberOfSlots) return

        this.changingProduct = true
        this.productionErrors = 0
        this.slots[slotIndex] = resource
        // Find a slot result which inputs matches this.slots in any order
        const slotResult = SLOT_RESULTS.find(r => {
            return r.inputs.every(i => this.slots.includes(i))
        })
        if (!slotResult) {
            this.requestedProductId = 0
        } else {
            this.requestedProductId = slotResult.productId
        }
    }

    setProduct(productId: number) {
        // Find it first
        const product = PRODUCTS.find(p => p.id === productId)
        if (!product) return

        this.productId = productId
    }

    // TODO: make property instead of getter, for performance
    get product() {
        return PRODUCTS.find(p => p.id === this.productId)
    }

    get component() {
        return markRaw(Windmill)
    }

    get tooltip() {
        return 'Windmill tile - click to change product or start/stop production'
    }

    get iconTopLeft() {
        return this.productionErrors > 10 ? '⚠️' : ''
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
            costMultiplier: 1.5,
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
