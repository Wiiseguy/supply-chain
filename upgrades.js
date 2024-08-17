import { GROUPS } from './consts.js'
import { makeIndex } from './utils.js'

const DEFAULT_COST_MULTIPLIER = 1.21

export const UPGRADES = [
    {
        name: 'Axe',
        displayName: 'Sharpen Axe',
        description: 'Sharpen your axe to chop trees faster',
        initialOwned: 0,
        baseCost: 100,
        costMultiplier: 1.5,
        speed: undefined,
        category: 'tools',
        group: GROUPS.forest
    },
    {
        name: 'Fertilizer',
        displayName: 'Fertilizer',
        description: 'Fertilizer to speed up tree growth',
        initialOwned: 0,
        baseCost: 100,
        costMultiplier: 2,
        speed: undefined,
        category: 'tools',
        group: GROUPS.forest
    },
    {
        name: 'Shovel',
        displayName: 'Bigger Excavator',
        description: 'Trade your excavator for a bigger one to dig an entrance for a mine',
        initialOwned: 0,
        baseCost: 10000,
        costMultiplier: 1.5,
        speed: undefined,
        category: 'tools',
        group: GROUPS.mine
    },
    {
        name: 'Tunneling',
        displayName: 'Improved Tunneling',
        description: 'Research improved tunneling techniques',
        initialOwned: 0,
        baseCost: 10000,
        costMultiplier: 1.75,
        speed: undefined,
        category: 'tools',
        group: GROUPS.mine
    },
    {
        name: 'Pickaxe',
        displayName: 'Harden Pickaxe',
        description: 'Mine resources faster with a hardened pickaxe',
        initialOwned: 0,
        baseCost: 10000,
        costMultiplier: 2,
        speed: undefined,
        category: 'tools',
        group: GROUPS.mine
    },
    {
        name: 'Forest Tile',
        description: 'Claim a tile of land to grow trees on',
        initialOwned: 1,
        baseCost: 100,
        costMultiplier: 1.2,
        speed: undefined,
        category: 'land',
        group: GROUPS.forest
    },
    {
        name: 'Clay Mine Tile',
        description: 'Claim a tile of land to dig for clay',
        initialOwned: 0,
        baseCost: 1500,
        costMultiplier: 1.25,
        speed: undefined,
        category: 'land',
        group: GROUPS.mine
    },
    {
        name: 'Metal Mine Tile',
        description: 'Claim a tile of land to dig for metal',
        initialOwned: 0,
        baseCost: 2000,
        costMultiplier: 1.25,
        speed: undefined,
        category: 'land',
        group: GROUPS.mine
    },
    {
        name: 'Diamond Mine Tile',
        description: 'Claim a tile of land to dig for diamonds',
        initialOwned: 0,
        baseCost: 5000,
        costMultiplier: 1.25,
        speed: undefined,
        category: 'land',
        group: GROUPS.mine
    },
    {
        name: 'Extra Column',
        description: 'Buy an extra column of land',
        initialOwned: 2,
        baseCost: 100,
        costMultiplier: 5,
        speed: undefined,
        category: 'land',
        group: GROUPS.land
    },
    {
        name: 'Extra Row',
        description: 'Buy an extra row of land',
        initialOwned: 2,
        baseCost: 100,
        costMultiplier: 5,
        speed: undefined,
        category: 'land',
        group: GROUPS.land
    },
    {
        name: 'Wood Storage',
        description: 'Increase the amount of wood you can store',
        initialOwned: 1,
        baseCost: 1000,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: undefined,
        category: 'storage',
        group: GROUPS.forest
    },
    {
        name: 'Seed Storage',
        displayName: 'Seed Bottle',
        description: 'Increase the amount of seeds you can store',
        initialOwned: 1,
        baseCost: 1500,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: undefined,
        category: 'storage',
        group: GROUPS.forest
    },
    {
        name: 'Clay Storage',
        displayName: 'Clay Pot',
        description: 'Increase the amount of clay you can store',
        initialOwned: 1,
        baseCost: 5000,
        costMultiplier: 1.5,
        speed: undefined,
        category: 'storage',
        group: GROUPS.mine
    },
    {
        name: 'Metal Storage',
        displayName: 'Metal Crate',
        description: 'Increase the amount of metal you can store',
        initialOwned: 1,
        baseCost: 5000,
        costMultiplier: 2,
        speed: undefined,
        category: 'storage',
        group: GROUPS.mine
    },
    {
        name: 'Diamond Storage',
        displayName: 'Diamond Box',
        description: 'Increase the amount of diamonds you can store',
        initialOwned: 1,
        baseCost: 12_500,
        costMultiplier: 2,
        speed: undefined,
        category: 'storage',
        group: GROUPS.mine
    },
    // Automation
    {
        name: 'Auto Digger',
        description: 'Automatically dig holes on empty land',
        initialOwned: 0,
        baseCost: 800,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: 0.75,
        category: 'automation',
        group: GROUPS.forest
    },
    {
        name: 'Auto Seeder',
        description: 'Automatically plant seeds in dug holes',
        initialOwned: 0,
        baseCost: 1000,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: 1 / 3,
        category: 'automation',
        group: GROUPS.forest
    },
    {
        name: 'Auto Chopper',
        description: 'Automatically chop down trees',
        initialOwned: 0,
        baseCost: 1250,
        costMultiplier: 1.5,
        speed: 2 / 3,
        category: 'automation',
        group: GROUPS.forest
    },
    {
        name: 'Wood Seller',
        description: 'Automatically sell wood',
        initialOwned: 0,
        baseCost: 2500,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: 1 / 2,
        category: 'automation',
        group: GROUPS.forest
    },
    {
        name: 'Seed Seller',
        description: 'Automatically sell excess seeds',
        initialOwned: 0,
        baseCost: 3000,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: 1 / 8,
        category: 'automation',
        group: GROUPS.forest
    },
    {
        name: 'Wood Reclaimer',
        description: 'Collect lost wood',
        initialOwned: 0,
        baseCost: 2500,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: 1 / 4,
        category: 'automation',
        group: GROUPS.forest
    },
    {
        name: 'Seed Reclaimer',
        displayName: 'Seed Scouter',
        description: 'Send out a scout to find lost seeds all over your forest land',
        initialOwned: 0,
        baseCost: 3500,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: 1 / 30,
        category: 'automation'
    },
    {
        name: 'Resource Miner',
        description: 'Automatically mine resources',
        initialOwned: 0,
        baseCost: 5_000,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: 1,
        category: 'automation',
        group: GROUPS.mine
    },
    {
        name: 'Tunneler',
        description: 'Automatically dig tunnels through rocks while building support beams',
        initialOwned: 0,
        baseCost: 12000,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: 1,
        category: 'automation',
        group: GROUPS.mine
    },
    {
        name: 'Auto Shoveler',
        displayName: 'Auto Mine Maker',
        description: 'Automatically dig rocks to make an opening for a mine shaft. Probably not the wisest investment',
        initialOwned: 0,
        baseCost: 14000,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: 1,
        category: 'automation',
        group: GROUPS.mine
    },
    {
        name: 'Metal Seller',
        description: 'Automatically sell metal',
        initialOwned: 0,
        baseCost: 15_000,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: 1 / 60,
        category: 'automation',
        group: GROUPS.mine
    },
    {
        name: 'Metal Reclaimer',
        displayName: 'Metal Detector',
        description: 'Send out a metal detector to find lost metal in your mine',
        initialOwned: 0,
        baseCost: 20_000,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: 1 / 120,
        category: 'automation',
        group: GROUPS.mine
    },
    {
        name: 'Diamond Seller',
        description: 'Automatically sell diamonds',
        initialOwned: 0,
        baseCost: 20_000,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: 1 / 180,
        category: 'automation',
        group: GROUPS.mine
    },
    {
        name: 'Diamond Reclaimer',
        displayName: 'Mine Magpie',
        description: 'Send a magpie into your caves to find the diamonds you haphazardly dropped all over the place',
        initialOwned: 0,
        baseCost: 50_000,
        costMultiplier: DEFAULT_COST_MULTIPLIER,
        speed: 1 / 240,
        category: 'automation',
        group: GROUPS.mine
    },
    // Special upgrades
    {
        name: 'Wooden Finger',
        displayName: 'Wooden Finger',
        description: 'Sell 10 times the amount of wood with one click',
        initialOwned: 0,
        baseCost: 200,
        costMultiplier: 5,
        category: 'special',
        max: 2,
        group: GROUPS.forest
    },
    {
        name: 'Wood Marketing 1',
        displayName: 'Wood Marketing 1',
        description: 'Increase wood price by 2x',
        initialOwned: 0,
        baseCost: 1000,
        category: 'special',
        max: 1,
        group: GROUPS.forest
    },
    {
        name: 'Seed Luck 1',
        displayName: 'Clover Seed',
        description: 'Increase chance of getting an extra seed by 2x',
        initialOwned: 0,
        baseCost: 2000,
        category: 'special',
        max: 1,
        group: GROUPS.forest
    },
    {
        name: 'Seed Marketing 1',
        displayName: 'Seed Marketing 1',
        description: 'Increase seed price by 2x',
        initialOwned: 0,
        baseCost: 2000,
        category: 'special',
        max: 1,
        group: GROUPS.forest
    },
    {
        name: 'Ledger',
        displayName: 'The Ledger',
        description: 'Keep detailed track of your profits in a ledger!',
        initialOwned: 0,
        baseCost: 5000,
        category: 'special',
        max: 1,
        group: GROUPS.ui
    },
    {
        name: 'Seed Marketing 2',
        displayName: 'Seed Marketing 2',
        description: 'Increase seed price by 3x',
        initialOwned: 0,
        baseCost: 10_000,
        category: 'special',
        max: 1,
        group: GROUPS.forest
    },
    {
        name: 'Wood Marketing 2',
        displayName: 'Wood Marketing 2',
        description: 'Increase wood price by 2x',
        initialOwned: 0,
        baseCost: 30_000,
        category: 'special',
        max: 1,
        group: GROUPS.forest
    },
    {
        name: 'Wood Marketing 3',
        displayName: 'Wood Marketing 3',
        description: 'Increase wood price by 2x',
        initialOwned: 0,
        baseCost: 100_000,
        category: 'special',
        max: 1,
        group: GROUPS.forest
    },
    {
        name: 'Diamond Marketing 1',
        displayName: 'Diamond Polishing',
        description: 'Give diamonds a shiny polish and increase their price by 1.5x',
        initialOwned: 0,
        baseCost: 50_000,
        category: 'special',
        max: 1,
        group: GROUPS.mine
    },
    {
        name: 'Diamond Marketing 2',
        displayName: 'Diamond Shine',
        description: 'Give diamonds an even shinier polish and increase their price by 2x',
        initialOwned: 0,
        baseCost: 150_000,
        category: 'special',
        max: 1,
        group: GROUPS.mine
    }
]
export const UPGRADES_INDEX = makeIndex(UPGRADES, 'name')
