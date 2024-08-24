export const TILE_TYPES = {
    none: 'none',
    forest: 'forest',
    mine: 'mine',
    pond: 'pond',
    monster: 'monster',
    donut: 'donut',
    farm: 'farm',
    desert: 'desert',
    kiln: 'kiln'
    // What other types could there be?
    // Oil rig: drill for oil
    // Factory: process raw materials into goods
}

export const GROUPS = {
    land: 'land',
    tiles: 'tiles',
    forest: 'forest',
    mine: 'mine',
    pond: 'pond',
    monster: 'monster',
    donut: 'donut',
    ui: 'ui'
}

export const CATEGORIES = {
    tools: 'tools',
    tiles: 'tiles',
    land: 'land',
    storage: 'storage',
    automation: 'automation',
    special: 'special'
}

export const CATEGORY_TITLES = {
    tools: 'Tools',
    tiles: 'Tiles',
    land: 'Land',
    storage: 'Storage',
    automation: 'Automation',
    special: 'Special'
}

export const RESOURCE_TYPES = {
    wood: 'wood',
    seed: 'seed',
    diamond: 'diamond',
    metal: 'metal',
    clay: 'clay',
    fish: 'fish',
    donut: 'donut',
    wheat: 'wheat',
    bread: 'bread',
    brick: 'brick',
    sand: 'sand',
    glass: 'glass'
}
const RESOURCE_TIERS = {
    // Tier 1: Base resources. Are provided by nature or can be grown
    tier1: [
        RESOURCE_TYPES.wood,
        RESOURCE_TYPES.seed,
        RESOURCE_TYPES.diamond,
        RESOURCE_TYPES.metal,
        RESOURCE_TYPES.clay,
        RESOURCE_TYPES.wheat,
        RESOURCE_TYPES.sand,
        RESOURCE_TYPES.fish
    ],
    // Tier 2: Processed resources. Are refined from tier 1 resources
    tier2: [RESOURCE_TYPES.bread, RESOURCE_TYPES.brick, RESOURCE_TYPES.glass]
}

const FARM_TILE_TYPES = {
    empty: 'empty',
    crop: 'crop'
}

export const GROUP_ICONS = {
    land: '🔲',
    forest: '🌲',
    mine: '⛏️',
    pond: '🎣',
    donut: '🍩',
    monster: '👾',
    farm: '🌾',
    desert: '🏜️',
    kiln: '🏭',
    ui: '🖥️'
}
