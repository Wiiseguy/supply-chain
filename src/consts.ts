export const TILE_TYPES: Record<string, string> = {
    none: 'none',
    forest: 'forest',
    mine: 'mine',
    pond: 'pond',
    monster: 'monster',
    donut: 'donut',
    farm: 'farm',
    desert: 'desert',
    kiln: 'kiln',
    windmill: 'windmill'
    // What other types could there be?
    // Oil rig: drill for oil
    // Factory: process raw materials into goods
}

export const GROUPS: Record<string, string> = {
    land: 'land',
    tiles: 'tiles',
    forest: 'forest',
    mine: 'mine',
    pond: 'pond',
    monster: 'monster',
    donut: 'donut',
    kiln: 'kiln',
    windmill: 'windmill',
    ui: 'ui'
}

export const GROUP_ICONS: Record<string, string> = {
    land: '🔲',
    forest: '🌲',
    mine: '⛏️',
    pond: '🎣',
    donut: '🍩',
    monster: '👾',
    farm: '🌾',
    desert: '🏜️',
    kiln: '🏭',
    energy: '⚡',
    windmill: '🌬️',
    ui: '🖥️'
}

export const CATEGORIES: Record<string, string> = {
    tools: 'tools',
    tiles: 'tiles',
    land: 'land',
    storage: 'storage',
    automation: 'automation',
    special: 'special'
}

export const CATEGORIES_ORDER = [
    CATEGORIES.land,
    CATEGORIES.tiles,
    CATEGORIES.tools,
    CATEGORIES.automation,
    CATEGORIES.storage,
    CATEGORIES.special
]

export const CATEGORY_TITLES: Record<string, string> = {
    tools: 'Tools',
    tiles: 'Tiles',
    land: 'Land',
    storage: 'Storage',
    automation: 'Automation',
    special: 'Special'
}

export const RESOURCE_TYPES: Record<string, string> = {
    energy: 'energy',

    wood: 'wood',
    sawdust: 'sawdust',
    seed: 'seed',
    apple: 'apple',
    lemon: 'lemon',
    orange: 'orange',
    pear: 'pear',
    banana: 'banana',
    cherry: 'cherry',
    strawberry: 'strawberry',
    mango: 'mango',
    pineapple: 'pineapple',

    diamond: 'diamond',
    metal: 'metal',
    clay: 'clay',
    donut: 'donut',
    brick: 'brick',

    fish: 'fish',

    wheat: 'wheat',
    bread: 'bread',
    sand: 'sand',
    glass: 'glass'
}

/** @ts-ignore */
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

/** @ts-ignore */
const FARM_TILE_TYPES = {
    empty: 'empty',
    crop: 'crop'
}

export const MODALS: Record<string, string> = {
    kilnBake: 'kilnBake',
    windmill: 'windmill'
}
