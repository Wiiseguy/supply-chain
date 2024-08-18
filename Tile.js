import { TILE_TYPES } from './consts.js'
import { setBoolPropTimeout } from './utils.js'

class Tile {
    app = null
    constructor(app) {
        this.app = app
        Object.defineProperty(this, 'app', { enumerable: false })

        this.tileType = TILE_TYPES.none
        this.type = ''
        this.subType = '' // Used e.g. by mines to determine what resource is in the tile
        this.progress = 0
        this.age = 0
        this.stage = 0
        this.stageP = 0
        this.wiggle = false
        this.fail = false
        this.grow = false

        this.wiggleTimeout = -1
        this.failTimeout = -1
        this.growTimeout = -1
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
    update(_elapsed) {}
    get tooltip() {
        return 'Empty tile'
    }
    get level() {
        return null
    }
}

export default Tile
