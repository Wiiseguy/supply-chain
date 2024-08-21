import { setBoolPropTimeout } from './utils.js'

class Tile {
    app = null
    constructor(app, tileType) {
        this.app = app
        Object.defineProperty(this, 'app', { enumerable: false })

        this.tileType = tileType
        this.type = ''
        this.subType = '' // Used e.g. by mines to determine what resource is in the tile
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
    update(_elapsed) {}
    get tooltip() {
        return 'Empty tile'
    }
    get level() {
        return null
    }
    get classes() {
        return {
            wiggle: this.wiggle,
            'grow-bounce': this.grow,
            'bounce-down': this.bounceDown
        }
    }
    getStyle(obj) {
        obj.bgOpacity = this.progress
        return obj
    }
    get health() {
        return null
    }
}

export default Tile
