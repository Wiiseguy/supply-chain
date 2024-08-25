import { Automator } from './Automator.js'
import { CATEGORIES, GROUPS, MODALS, RESOURCE_TYPES, TILE_TYPES } from './consts.js'
import { Resource } from './Resource.js'
import Tile from './Tile.js'
import { pick } from './utils.js'

// Kiln tile
// Kilns are used to bake bricks from clay

const KILN_RECIPES = [
    { resource: RESOURCE_TYPES.brick, reqs: { [RESOURCE_TYPES.clay]: 10 }, time: 10 }
    // Fake recipe for testing
    //{ resource: RESOURCE_TYPES.metal, reqs: { [RESOURCE_TYPES.clay]: 5 }, time: 5 }
]

const KILN_STATES = {
    unset: 'unset', // No resource selected
    open: 'open', // Resource selected, but not baked yet. In this state, the kiln can be clicked to bake the resource and the resource is incurred
    baking: 'baking' // Resource is being baked, can't be clicked. When baking is done, the resource is gained and the state is set back to open
}

export class KilnTile extends Tile {
    static type = TILE_TYPES.kiln

    constructor(app) {
        super(app, KilnTile.type)
        this.state = KILN_STATES.unset
        this.recipeName = ''
        this.timer = 0
        this.timerTarget = 0
    }
    update(elapsed) {
        this.stageP = this.progress
        if (this.state === KILN_STATES.baking) {
            this.progress = this.timer / this.timerTarget
            this.timer += elapsed
            if (this.timer >= this.timerTarget) {
                this.timer = 0
                this.state = KILN_STATES.open
                const resource = this.app.resources[this.recipeName]
                resource.gain(1)
                this.app.showMessage('Resource baked!')
            }
        }
    }
    bake(manual) {
        if (this.state !== KILN_STATES.open) {
            console.error('bake: Kiln is not in open state:', this.state)
            return
        }
        const recipe = KILN_RECIPES.find(r => r.resource === this.recipeName)
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
                    this.app.showMessage(`Not enough ${resource.displayNamePlural} to bake!`)
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
                    selectedResource: KILN_RECIPES[0].resource,
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
    onModalSetRecipe(recipeName) {
        console.log('onModalClose', recipeName, this)
        this.recipeName = recipeName
        this.state = KILN_STATES.open
        this.app.closeModal(MODALS.kilnBake)
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

    static resources = [
        new Resource(RESOURCE_TYPES.brick, {
            displayNameSingular: 'Brick',
            displayNamePlural: 'Bricks',
            icon: '🧱',
            basePrice: 1000,
            storageBaseSize: 100,
            initialOwned: 0
        })
    ]

    static automators = [
        new Automator('Kiln Baker', app => {
            const kiln = pick(app.land.filter(t => t instanceof KilnTile && t.state === KILN_STATES.open))
            if (kiln) {
                kiln.bake()
            }
        })
    ]

    static upgrades = [
        {
            name: 'Kiln Tile',
            tile: true,
            description: 'Claim a tile of land to bake resources',
            initialOwned: 0,
            baseCost: 10000,
            costMultiplier: 2,
            speed: undefined,
            category: CATEGORIES.tiles,
            group: GROUPS.kiln,
            onBuy(app) {
                app.addTile(new KilnTile(app))
            }
        },
        {
            name: 'Kiln Baker',
            description: 'Automatically handle the kiln for you',
            initialOwned: 0,
            baseCost: 25_000,
            costMultiplier: 2,
            speed: 1 / 30,
            category: CATEGORIES.automation,
            group: GROUPS.kiln,
            isVisible: _ => true
        }
    ]
}
