import { TILE_TYPES } from './consts'
import Tile from './Tile'

export class EmptyTile extends Tile implements ITile {
    static readonly type = TILE_TYPES.none

    constructor(app: IApp) {
        super(app, EmptyTile.type)
    }
    sell(): void {
        throw new Error('Method not implemented.')
    }
    update(elapsed: number) {
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

    getStyle(obj: ITileStyle) {
        obj.bgOpacity = 0.5
        obj.bgRgb = '0,0,0'
    }

    static readonly resources = []

    static readonly calculators = []

    static readonly automators = []

    static readonly upgrades = []
}
