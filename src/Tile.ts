import { Automator } from './Automator'
import { Calculator } from './Calculator'
import { Resource } from './Resource'
import { Upgrade } from './Upgrade'
import { setBoolPropTimeout } from './utils'

class Tile {
    static readonly type: string = 'none'
    app: IApp
    tileType: string
    type: string
    progress: number
    age: number
    stage: number
    stageP: number
    wiggle: boolean
    fail: boolean
    grow: boolean
    bounceDown: boolean
    wiggleTimeout: number
    failTimeout: number
    growTimeout: number
    bounceDownTimeout: number
    constructor(app: IApp, tileType: string) {
        this.app = app
        Object.defineProperty(this, 'app', { enumerable: false })

        this.tileType = tileType
        this.type = ''
        this.progress = 0
        this.age = 0
        this.stage = 0
        this.stageP = 0
        this.wiggle = false
        this.fail = false
        this.grow = false
        this.bounceDown = false

        this.wiggleTimeout = -1
        this.failTimeout = -1
        this.growTimeout = -1
        this.bounceDownTimeout = -1
    }
    animateWiggle() {
        setBoolPropTimeout(this, 'wiggle', 'wiggleTimeout', 250)
    }
    animateFail() {
        setBoolPropTimeout(this, 'fail', 'failTimeout', 1000)
    }
    animateGrow() {
        setBoolPropTimeout(this, 'grow', 'growTimeout', 250)
    }
    animateBounceDown() {
        setBoolPropTimeout(this, 'bounceDown', 'bounceDownTimeout', 400)
    }
    stopAnimations() {
        clearTimeout(this.wiggleTimeout)
        clearTimeout(this.failTimeout)
        clearTimeout(this.growTimeout)
        clearTimeout(this.bounceDownTimeout)
        this.wiggle = false
        this.fail = false
        this.grow = false
        this.bounceDown = false
    }
    update(_elapsed: number) {
        // Empty
    }
    sell() {
        console.error('Sell not implemented for', this)
    }
    click(manual = false) {
        console.error('Click not implemented for', this, 'manual:', manual)
    }
    get tooltip() {
        return 'Empty tile'
    }
    get level(): number | null {
        return null
    }
    get classes() {
        return {
            wiggle: this.wiggle,
            'grow-bounce': this.grow,
            'bounce-down': this.bounceDown
        }
    }
    get icon() {
        return ''
    }
    get iconTopLeft(): string | null {
        return null
    }
    get iconTopRight(): string | null {
        return null
    }
    get iconBottomLeft(): string | null {
        return null
    }
    get iconBottomRight(): string | null {
        return null
    }
    get iconStyle() {
        return {}
    }
    get health(): number | null {
        return null
    }
    getStyle(obj: ITileStyle): void {
        obj.bgOpacity = this.progress
    }

    static readonly automators: Automator[] = []
    static readonly resources: Resource[] = []
    static readonly calculators: Calculator[] = []
    static readonly upgrades: Upgrade[] = []
}

export default Tile
