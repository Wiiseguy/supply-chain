import { TILE_TYPES } from './consts.js'
import Tile from './Tile.js'

export class EmptyTile extends Tile {
    static type = TILE_TYPES.none

    constructor(app) {
        super(app, EmptyTile.type)
    }
    update(elapsed) {
        super.update(elapsed)
    }

    click() {
        this.app.showMessage('Buy a tile to claim this land!')
    }

    get classes() {
        return {
            ...super.classes,
            unclaimed: true
        }
    }

    getStyle(obj) {
        obj.bgOpacity = 0.5
        obj.bgRgb = '0,0,0'
    }

    static resources = []

    static calculators = []

    static automators = []

    static upgrades = []
}
