import { GROUPS } from './consts.js'

export const UPGRADES = [
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
    // Special upgrades
    {
        name: 'Ledger',
        displayName: 'The Ledger',
        description: 'Keep detailed track of your profits in a ledger!',
        initialOwned: 0,
        baseCost: 5000,
        category: 'special',
        max: 1,
        group: GROUPS.ui
    }
]
