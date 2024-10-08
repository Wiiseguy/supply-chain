import { Automator } from '../Automator'
import { CATEGORIES, GROUPS, MODALS, RESOURCE_TYPES, TILE_TYPES } from '../consts'
import { Resource } from '../Resource'
import Tile from './Tile'
import { Upgrade } from '../Upgrade'
import { pick } from '../utils'

// Kiln tile
// Kilns are used to bake bricks from clay

const KILN_RECIPES = [
    {
        id: 1,
        resource: RESOURCE_TYPES.brick,
        yield: 5,
        reqs: { [RESOURCE_TYPES.clay]: 10 },
        time: 30
    }
    // Fake recipe for testing
    //{ resource: RESOURCE_TYPES.metal, reqs: { [RESOURCE_TYPES.clay]: 5 }, time: 5 }
]

const KILN_STATES = {
    unset: 'unset', // No resource selected
    open: 'open', // Resource selected, but not baked yet. In this state, the kiln can be clicked to bake the resource and the resource is incurred
    baking: 'baking' // Resource is being baked, can't be clicked. When baking is done, the resource is gained and the state is set back to open
}

export class KilnTile extends Tile implements ITile {
    static readonly type = TILE_TYPES.kiln

    state: string
    recipeId: number
    timer: number
    timerTarget: number

    constructor(app: IApp) {
        super(app, KilnTile.type)
        this.state = KILN_STATES.unset
        this.recipeId = -1
        this.timer = 0
        this.timerTarget = 0
    }
    update(elapsed: number) {
        this.stageP = this.progress
        if (this.recipeId === -1 && this.state !== KILN_STATES.unset) {
            this.state = KILN_STATES.unset
        }
        if (this.state === KILN_STATES.baking) {
            this.progress = this.timer / this.timerTarget
            this.timer += elapsed
            if (this.timer >= this.timerTarget) {
                this.timer = 0
                this.state = KILN_STATES.open
                if (!this.activeRecipe) {
                    console.error('No active recipe found for id:', this.recipeId)
                    return
                }
                const resource = this.app.resources[this.activeRecipe.resource]
                resource.gain(this.activeRecipe.yield)
                this.app.stats.resourcesBaked += this.activeRecipe.yield
                this.app.showMessage(
                    `Baked ${this.activeRecipe.yield} ${resource.icon} ${resource.displayName(
                        this.activeRecipe.yield
                    )}!`
                )
                this.progress = 0
            }
        }
    }
    bake(manual = false) {
        if (this.state !== KILN_STATES.open) {
            console.error('bake: Kiln is not in open state:', this.state)
            return
        }
        const recipe = this.activeRecipe
        if (!recipe) {
            console.error('bake: No active recipe found for id:', this.recipeId)
            return
        }
        const reqEntries = Object.entries(recipe.reqs)
        // Check if the required resources are available
        for (const [resourceName, amount] of reqEntries) {
            const resource = this.app.resources[resourceName]
            if (!resource) {
                console.error('bake: Unknown resource for requirement:', resourceName)
                return
            }
            if (!resource.incur(amount)) {
                if (manual) {
                    this.app.showMessage(`Not enough ${resource.displayNamePlural} to bake! (${amount} required)`)
                }
                this.animateFail()
                return
            }
        }
        this.timerTarget = recipe.time
        this.timer = 0
        this.state = KILN_STATES.baking
    }
    click(manual = false) {
        switch (this.state) {
            case KILN_STATES.unset:
                this.app.showMessage('Select a resource to bake!')
                this.app.showModal(MODALS.kilnBake, {
                    tile: this,
                    recipes: KILN_RECIPES.map(r => ({
                        ...r,
                        icon: this.app.resources[r.resource].icon
                    }))
                })
                break
            case KILN_STATES.open:
                this.bake(manual)
                break
            case KILN_STATES.baking:
                this.app.showMessage('Baking in progress!')
                break
            default:
                console.error('Unknown kiln state:', this.state)
        }
    }
    sell() {
        this.app.boughtUpgrades['Kiln Tile'] -= 1
    }
    onModalSetRecipe(recipeId: number) {
        console.log('onModalClose', recipeId, this)
        this.recipeId = recipeId
        this.state = KILN_STATES.open
        this.app.closeModal(MODALS.kilnBake)
    }

    get activeRecipe() {
        return KILN_RECIPES.find(r => r.id === this.recipeId)
    }
    get canBake() {
        if (!this.activeRecipe) return false
        return (
            this.state === KILN_STATES.open &&
            Object.entries(this.activeRecipe.reqs).every(([resourceName, amount]) => {
                return this.app.resources[resourceName].owned >= amount
            })
        )
    }

    get icon() {
        return '🏭'
    }
    get tooltip() {
        return 'Kiln - click to bake'
    }
    get iconTopLeft() {
        return this.state === KILN_STATES.open ? '🧱' : null
    }
    get iconTopRight() {
        return this.state === KILN_STATES.baking ? '🔥' : null
    }

    get classes() {
        return {
            ...super.classes,
            kiln: true
        }
    }
    get iconStyle() {
        let brightness = 1

        if (this.state === KILN_STATES.open) {
            brightness = 0.2
            if (this.canBake) {
                brightness = 0.5
            }
        }
        return {
            filter: `brightness(${brightness})`
        }
    }

    static readonly resources = [
        new Resource(RESOURCE_TYPES.brick, {
            displayNameSingular: 'Brick',
            displayNamePlural: 'Bricks',
            icon: '🧱',
            basePrice: 1000,
            storageBaseSize: 100,
            initialOwned: 0
        })
    ]

    static readonly automators = [
        new Automator('Kiln Baker', app => {
            const kiln = pick(app.land.filter(t => t instanceof KilnTile && t.state === KILN_STATES.open) as KilnTile[])
            if (kiln) {
                kiln.bake()
            }
        }),
        Automator.createSeller('Brick Seller')
    ]

    static readonly upgrades: Upgrade[] = [
        new Upgrade({
            name: 'Kiln Tile',
            tile: true,
            description: 'Claim a tile of land to bake resources',
            baseCost: 10000,
            resourceCosts: {
                [RESOURCE_TYPES.clay]: 10,
                [RESOURCE_TYPES.metal]: 5
            },
            costMultiplier: 2,
            category: CATEGORIES.tiles,
            group: GROUPS.kiln,
            onBuy(app: IApp) {
                app.addTile(new KilnTile(app))
            }
        }),
        Upgrade.createSellerAutomator({
            name: 'Brick Seller',
            description: 'Automatically sell bricks',
            baseCost: 20_000,
            costMultiplier: 1.2,
            speed: 1 / 10,
            group: GROUPS.kiln,
            isVisible: (app: IApp) => app.resources[RESOURCE_TYPES.brick].totalOwned > 0,
            resourcesSold: [RESOURCE_TYPES.brick]
        }),
        Upgrade.createAutomator({
            name: 'Kiln Baker',
            description: 'Automatically handle the kiln for you',
            baseCost: 22_000,
            costMultiplier: 1.5,
            speed: 1 / 30,
            group: GROUPS.kiln,
            isVisible: (app: IApp) => app.land.some(t => t instanceof KilnTile)
        })
    ]
}
