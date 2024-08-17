import { MINE_TILE_TYPES, TILE_TYPES } from './consts.js'
import Tile from './Tile.js'

// Mine stuff
// Mines work different from forests, each stage has levels. The first stage has one level, the second has 3, the third has Infinite
// The first stage uses dugPower and only has one level but should require like 50 clicks to get to the next stage
// The second stage is when a mine has openened, but to be able to go deeper, wood is required, because you need to build support beams (250 wood per level)
// The third stage is when you can mine for resources. Once the third stage is reached it is a fully operational mine.
// Automators for the mine: Auto Excavator, Auto Tunneler, Auto Diamond Miner
const MINE_EXCAVATOR_POWER = 1 / 50 // 50 clicks to get to the next stage
const MINE_TUNNELER_POWER = 1 / 100
const MINE_SUPPORT_BEAM_COST = 200 // wood
const MINE_RESOURCE_ICONS = {
    diamond: '💎',
    metal: '🔧',
    clay: '🏺'
}
const MINE_RESOURCE_OPENING_LEVELS = {
    diamond: 1,
    metal: 1,
    clay: 1
}
const MINE_RESOURCE_TUNNELING_LEVELS = {
    diamond: 3,
    metal: 1,
    clay: 1
}
const MINE_MAX_RESOURCES_PER_LEVEL = {
    diamond: 5,
    metal: 10,
    clay: 25
}
const MINE_RESOURCE_CLICKS = {
    diamond: 200,
    metal: 75,
    clay: 50
}

export class MineTile extends Tile {
    constructor(app, subType) {
        super(app)
        this.tileType = TILE_TYPES.mine
        this.type = MINE_TILE_TYPES.rock
        this.subType = subType
    }
    update(_elapsed) {
        this.stageP = this.progress
    }
    dig() {
        this.progress += this.excavatorPower
        if (this.progress >= 1) {
            this.stage += 1
            this.progress = 0
            if (this.stage >= MINE_RESOURCE_OPENING_LEVELS[this.subType]) {
                this.stage = 0
                this.type = MINE_TILE_TYPES.tunnel
                this.app.showMessage('Mine entrance opened!')
                this.app.minesOwned += 1
            }
        }
    }
    tunnel() {
        this.progress += this.tunnelerPower
        this.animateWiggle()
        if (this.progress >= 1) {
            if (this.app.resources.wood.incur(MINE_SUPPORT_BEAM_COST)) {
                this.stage += 1
                this.progress = 0
                this.app.tunnelsDug += 1
                if (this.stage >= MINE_RESOURCE_TUNNELING_LEVELS[this.subType]) {
                    this.stage = 0
                    this.type = MINE_TILE_TYPES.resource
                    this.app.showMessage(`Cave full of ${this.subType} found!`)
                } else {
                    this.app.showMessage(`Support beams built with ${this.app.num(MINE_SUPPORT_BEAM_COST)} wood!`)
                }
            } else {
                this.animateFail()
                this.app.showMessage(
                    `Not enough wood to build support beams! You need ${this.app.num(
                        MINE_SUPPORT_BEAM_COST
                    )} wood to continue tunneling.`
                )
            }
        }
    }
    mine() {
        this.progress += this.resourceMinerPower / MINE_RESOURCE_CLICKS[this.subType]
        this.animateWiggle()
        if (this.progress >= 1) {
            this.progress = 0
            this.stage += 1
            this.app.resourcesMined += 1
            let resource = this.app.resources[this.subType]
            if (!resource) {
                console.error('mine: Unknown resource type:', this.subType)
                return
            }
            resource.gain(1)
            // If max amount of resources per cave is reached, go back to tunneling
            if (this.stage >= MINE_MAX_RESOURCES_PER_LEVEL[this.subType]) {
                this.stage = 0
                this.type = MINE_TILE_TYPES.tunnel
                this.app.showMessage('Resource cave depleted! Time to dig deeper.')
            }
        }
    }
    click() {
        switch (this.type) {
            case MINE_TILE_TYPES.rock:
                this.dig()
                break
            case MINE_TILE_TYPES.tunnel:
                this.tunnel()
                break
            case MINE_TILE_TYPES.resource:
                this.mine()
                break
            default:
                console.error('Unknown Mine tile type:', this.type)
                break
        }
    }
    get level() {
        switch (this.type) {
            case MINE_TILE_TYPES.rock:
                return MINE_RESOURCE_OPENING_LEVELS[this.subType] > 1
                    ? MINE_RESOURCE_OPENING_LEVELS[this.subType] - this.stage
                    : null
            case MINE_TILE_TYPES.tunnel:
                return MINE_RESOURCE_TUNNELING_LEVELS[this.subType] > 1
                    ? MINE_RESOURCE_TUNNELING_LEVELS[this.subType] - this.stage
                    : null
            case MINE_TILE_TYPES.resource:
                return MINE_MAX_RESOURCES_PER_LEVEL[this.subType] - this.stage
            default:
                return null
        }
    }
    get icon() {
        switch (this.type) {
            case MINE_TILE_TYPES.rock:
                return '⛰️'
            case MINE_TILE_TYPES.tunnel:
                return '⛏️'
            case MINE_TILE_TYPES.resource:
                return MINE_RESOURCE_ICONS[this.subType]
            default:
                return '❓'
        }
    }
    get tooltip() {
        switch (this.type) {
            case MINE_TILE_TYPES.rock:
                return `Rock - click to dig an entrance for a mine (${this.subType})`
            case MINE_TILE_TYPES.tunnel:
                return `Mine Tunnel (${this.subType}) - at level ${this.stage} of ${
                    MINE_RESOURCE_TUNNELING_LEVELS[this.subType]
                } - click to dig deeper`
            case MINE_TILE_TYPES.resource:
                return `Mine (${this.subType}) - click to mine resources - found resources: ${this.stage} of ${
                    MINE_MAX_RESOURCES_PER_LEVEL[this.subType]
                }`
            default:
                return 'Unknown mine tile'
        }
    }
    get excavatorPower() {
        return MINE_EXCAVATOR_POWER * (this.app.boughtUpgrades['Shovel'] + 1)
    }
    get tunnelerPower() {
        return MINE_TUNNELER_POWER * (this.app.boughtUpgrades['Tunneling'] + 1)
    }
    get resourceMinerPower() {
        return this.app.boughtUpgrades['Pickaxe'] + 1
    }
}
