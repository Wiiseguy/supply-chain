import { FOREST_TILE_TYPES, TILE_TYPES } from './consts.js'
import Tile from './Tile.js'
import { isLucky } from './utils.js'

const TREE_SELF_SEED_CHANCE = 1 / 100
const EXTRA_SEED_CHANCE_BASE = 1 / 10

const CHOP_POWER_BASE = 0.025
// Define tree aging - let's say a tree takes a minute to grow fully
const TREE_BASE_MATURE_TIME = 60 // 60 seconds
const TREE_DEATH_AGE = TREE_BASE_MATURE_TIME * 5
const TREE_GROWTH_STAGES = ['🌱', '🌿', '🌳', '🌲']
const TREE_GROWTH_STAGES_BASE_INTERVAL = TREE_BASE_MATURE_TIME / TREE_GROWTH_STAGES.length
// Define the gains per stage, if a tree is not fully grown yet, it should give much less wood exponentially
const TREE_WOOD_GAINS = [0.1, 0.25, 0.5, 1]
const TREE_WOOD_GAINS_BASE = 10

export class ForestTile extends Tile {
    static luckySeedChance = EXTRA_SEED_CHANCE_BASE
    constructor(app) {
        super(app)
        this.tileType = TILE_TYPES.forest
        this.type = FOREST_TILE_TYPES.empty
    }
    update(elapsed) {
        if (this.type === FOREST_TILE_TYPES.tree) {
            this.age += elapsed * (this.app.boughtUpgrades['Fertilizer'] + 1)
            let healthRegain = elapsed / (TREE_BASE_MATURE_TIME * 2)
            if (this.age > TREE_DEATH_AGE) {
                healthRegain *= -1
            }
            this.progress -= healthRegain
            if (this.progress < 0) {
                this.progress = 0
            }
            let prevStage = this.stage
            this.stage = Math.min(
                TREE_GROWTH_STAGES.length - 1,
                Math.floor(this.age / TREE_GROWTH_STAGES_BASE_INTERVAL)
            )
            // If stage has changed, wiggly wiggle
            if (prevStage !== this.stage) {
                this.animateGrow()
            }
            // stageP is the percentage of the age until it has reached the final stage
            this.stageP = Math.min(1, this.age / (TREE_BASE_MATURE_TIME - TREE_GROWTH_STAGES_BASE_INTERVAL))
            if (this.progress > 1) {
                this.chop()
            }
        }
    }
    dig() {
        this.progress += this.digPower
        if (this.progress >= 1) {
            this.progress = 0
            this.type = FOREST_TILE_TYPES.hole
        }
    }
    plant() {
        this.progress += this.plantPower
        if (this.progress >= 1) {
            if (this.app.resources.seed.incur(1)) {
                this.progress = 0
                this.type = FOREST_TILE_TYPES.tree
            } else {
                this.app.showMessage('No seeds left!')
            }
        }
    }
    chop() {
        this.progress += this.chopPower
        this.animateWiggle()
        if (this.progress >= 1) {
            this.progress = 0
            let woodGainM = TREE_WOOD_GAINS[this.stage]
            let woodGains = TREE_WOOD_GAINS_BASE * woodGainM
            this.app.resources.wood.gain(woodGains)
            this.app.resources.seed.gain(1)
            this.app.treesChopped += 1
            let msg = ''
            // If lucky, get an extra seed
            if (isLucky(ForestTile.luckySeedChance)) {
                msg += 'Lucky! Got an extra seed! '
                this.app.resources.seed.gain(1)
                this.app.luckySeeds += 1
            }
            // If super lucky, automatically plant a seed
            if (isLucky(TREE_SELF_SEED_CHANCE)) {
                msg += 'Super lucky! Another tree is already growing here!'
                this.age = 0
                this.app.luckyTrees += 1
            } else {
                this.reset()
            }
            if (msg) {
                this.app.showMessage(msg)
            }
        }
    }
    click() {
        switch (this.type) {
            case FOREST_TILE_TYPES.empty:
                this.dig()
                break
            case FOREST_TILE_TYPES.hole:
                this.plant()
                break
            case FOREST_TILE_TYPES.tree:
                this.chop()
                break
            default:
                console.error('Unknown Forest tile type:', this.type)
                break
        }
    }
    reset() {
        this.type = FOREST_TILE_TYPES.empty
        this.progress = 0
        this.age = 0
        this.stage = 0
        this.stageP = 0
    }
    get icon() {
        switch (this.type) {
            case FOREST_TILE_TYPES.empty:
                return ''
            case FOREST_TILE_TYPES.hole:
                return '🕳️'
            case FOREST_TILE_TYPES.tree:
                return TREE_GROWTH_STAGES[this.stage]
            default:
                return '❓'
        }
    }
    get tooltip() {
        switch (this.type) {
            case FOREST_TILE_TYPES.empty:
                return 'Empty land - click to dig a hole'
            case FOREST_TILE_TYPES.hole:
                return 'Dug hole - click to plant a seed'
            case FOREST_TILE_TYPES.tree:
                return `Tree - click to chop it down - the older the tree, the more wood you get`
            default:
                return 'Unknown forest tile'
        }
    }
    get digPower() {
        return 0.2
    }
    get plantPower() {
        return 0.5
    }
    get chopPower() {
        return CHOP_POWER_BASE * (1 + this.app.boughtUpgrades['Axe'])
    }
    get isFullyGrownTree() {
        return this.type === FOREST_TILE_TYPES.tree && this.stage === TREE_GROWTH_STAGES.length - 1
    }
}
